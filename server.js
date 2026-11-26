'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { URL } = require('url');

// ---------------------------------------------------------------------------
// Module Loaders & Safe Fallbacks
// ---------------------------------------------------------------------------
function loadOptionalModule(modulePath, label) {
  try {
    return require(modulePath);
  } catch (err) {
    console.warn(`[Sanad AI] ${label} fallback active:`, err.message);
    return null;
  }
}

const envModule = loadOptionalModule('./config/env', './config/env');
const config = (envModule && (envModule.config || envModule)) || {};

const wsHubModule = loadOptionalModule('./realtime/wsHub', './realtime/wsHub');

const syncApiModule = loadOptionalModule('./realtime/syncApi', './realtime/syncApi');
let handleApiRequest = async () => false;
if (typeof syncApiModule === 'function') {
  handleApiRequest = syncApiModule;
} else if (syncApiModule && typeof syncApiModule.handleApiRequest === 'function') {
  handleApiRequest = syncApiModule.handleApiRequest;
}

// ---------------------------------------------------------------------------
// Runtime Configuration & Constants
// ---------------------------------------------------------------------------
const PORT = Number(process.env.PORT || config.port || 3000);
const HOST = String(process.env.HOST || config.host || '0.0.0.0');
const APP_VERSION = String(config.version || process.env.APP_VERSION || '9.0.0');
const NODE_ENV = String(process.env.NODE_ENV || config.env || 'production');
const MAX_JSON_BODY_BYTES = Number(config.maxJsonBodyBytes || 1024 * 1024);
const RATE_LIMIT_WINDOW_MS = Number(config.rateLimitWindowMs || 60 * 1000);
const RATE_LIMIT_MAX_REQUESTS = Number(config.rateLimitMaxRequests || 180);
const SHUTDOWN_TIMEOUT_MS = Number(config.shutdownTimeoutMs || 10000);
const REQUEST_TIMEOUT_MS = Number(config.requestTimeoutMs || 30000);
const HEADERS_TIMEOUT_MS = Number(config.headersTimeoutMs || 35000);
const KEEP_ALIVE_TIMEOUT_MS = Number(config.keepAliveTimeoutMs || 65000);

const ALLOWED_ORIGINS = Array.isArray(config.allowedOrigins)
  ? config.allowedOrigins
  : String(process.env.ALLOWED_ORIGINS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

const STATIC_MIME = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
};

const BLOCKED_NAMES = [
  '.env',
  '.git',
  'node_modules',
  'package.json',
  'package-lock.json',
  'yarn.lock',
  'server.js',
];

const NO_CACHE_EXTS = new Set(['.js', '.mjs', '.html', '.webmanifest']);
const LONG_CACHE_EXTS = new Set([
  '.css',
  '.svg',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.ico',
  '.woff',
  '.woff2',
  '.mp3',
  '.wav',
  '.ogg',
]);

const activeSockets = new Set();
const rateLimitBuckets = new Map();
let isShuttingDown = false;
let activeInFlightRequests = 0;

// ---------------------------------------------------------------------------
// Network, Request ID & Rate Limiting Helpers
// ---------------------------------------------------------------------------
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) {
    return realIp.trim();
  }
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

function getRequestId(req) {
  const incoming = req.headers['x-request-id'];
  if (typeof incoming === 'string' && /^[a-zA-Z0-9._-]{6,64}$/.test(incoming.trim())) {
    return incoming.trim();
  }
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return crypto.randomBytes(12).toString('hex');
}

function checkRateLimit(ip) {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(ip);
  if (!bucket || now - bucket.windowStart >= RATE_LIMIT_WINDOW_MS) {
    rateLimitBuckets.set(ip, { windowStart: now, count: 1 });
    return {
      allowed: true,
      remaining: Math.max(0, RATE_LIMIT_MAX_REQUESTS - 1),
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    };
  }
  bucket.count += 1;
  const remaining = Math.max(0, RATE_LIMIT_MAX_REQUESTS - bucket.count);
  return {
    allowed: bucket.count <= RATE_LIMIT_MAX_REQUESTS,
    remaining,
    resetAt: bucket.windowStart + RATE_LIMIT_WINDOW_MS,
  };
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of rateLimitBuckets.entries()) {
    if (now - bucket.windowStart >= RATE_LIMIT_WINDOW_MS * 2) {
      rateLimitBuckets.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW_MS).unref();

// ---------------------------------------------------------------------------
// HTTP Response, Security & Body Parsing Helpers
// ---------------------------------------------------------------------------
function applySecurityHeaders(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(self), geolocation=()');

  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.length > 0 && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-Id');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else if (!origin && ALLOWED_ORIGINS.length === 0 && NODE_ENV !== 'production') {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
}

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  if (res.writableEnded || res.headersSent) return;
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body, 'utf8'),
    'Cache-Control': 'no-store',
    ...extraHeaders,
  });
  res.end(body);
}

function readJsonBody(req, maxBytes = MAX_JSON_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    const contentLength = Number(req.headers['content-length'] || 0);
    if (contentLength > maxBytes) {
      reject(Object.assign(new Error('Payload too large'), { statusCode: 413 }));
      return;
    }

    let totalBytes = 0;
    const chunks = [];
    let aborted = false;

    req.on('data', (chunk) => {
      if (aborted) return;
      totalBytes += chunk.length;
      if (totalBytes > maxBytes) {
        aborted = true;
        reject(Object.assign(new Error('Payload too large'), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (aborted) return;
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (_) {
        reject(Object.assign(new Error('Invalid JSON payload'), { statusCode: 400 }));
      }
    });

    req.on('error', (err) => {
      if (!aborted) reject(err);
    });
  });
}

// ---------------------------------------------------------------------------
// Static Asset Resolution & Safe Serving
// ---------------------------------------------------------------------------
function getStaticRootDir() {
  const candidates = [
    config && config.publicDir ? path.resolve(String(config.publicDir)) : null,
    path.resolve(__dirname, 'public'),
    path.resolve(__dirname),
  ].filter(Boolean);

  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'index.html'))) {
      return dir;
    }
  }
  return path.resolve(__dirname);
}

function isInsideDirectory(parentDir, targetPath) {
  const rel = path.relative(parentDir, targetPath);
  return Boolean(rel) && !rel.startsWith('..') && !path.isAbsolute(rel);
}

function sanitizeRelativeUrlPath(rawPath) {
  const normalized = path.posix.normalize(String(rawPath || '/').replace(/\\/g, '/'));
  const parts = normalized.split('/').filter((part) => part && part !== '.' && part !== '..');
  return parts.join('/');
}

function resolveStaticTarget(rootDir, safeRel) {
  let fullPath = path.resolve(rootDir, safeRel);
  let stat = null;

  if (isInsideDirectory(rootDir, fullPath) && fs.existsSync(fullPath)) {
    const candidateStat = fs.statSync(fullPath);
    if (candidateStat.isFile()) {
      stat = candidateStat;
    } else if (candidateStat.isDirectory()) {
      const dirIndex = path.join(fullPath, 'index.html');
      if (fs.existsSync(dirIndex) && fs.statSync(dirIndex).isFile()) {
        fullPath = dirIndex;
        stat = fs.statSync(fullPath);
      }
    }
  }

  if (!stat && !path.extname(safeRel)) {
    const indexFallback = path.resolve(rootDir, 'index.html');
    if (fs.existsSync(indexFallback) && fs.statSync(indexFallback).isFile()) {
      fullPath = indexFallback;
      stat = fs.statSync(fullPath);
    }
  }

  return { fullPath, stat };
}

function buildStaticHeaders(fullPath, stat) {
  const ext = path.extname(fullPath).toLowerCase();
  const baseName = path.basename(fullPath);
  const etag = 'W/"' + stat.size + '-' + Number(stat.mtimeMs).toString(16) + '"';

  const headers = {
    'Content-Type': STATIC_MIME[ext] || 'application/octet-stream',
    'Content-Length': stat.size,
    'ETag': etag,
  };

  if (NO_CACHE_EXTS.has(ext) || baseName === 'sw.js') {
    headers['Cache-Control'] = 'no-cache, must-revalidate';
  } else if (LONG_CACHE_EXTS.has(ext)) {
    headers['Cache-Control'] = 'public, max-age=86400';
  }

  if (baseName === 'sw.js') {
    headers['Service-Worker-Allowed'] = '/';
  }

  return { ext, etag, headers };
}

function serveStaticFile(req, res, parsedUrl) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Allow': 'GET, HEAD, OPTIONS', 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Method Not Allowed');
    return;
  }

  let decodedPath = '/';
  try {
    decodedPath = decodeURIComponent(parsedUrl.pathname || '/');
  } catch (_) {
    sendJson(res, 400, { ok: false, error: 'مسار غير صالح' });
    return;
  }

  if (decodedPath.includes('\0')) {
    sendJson(res, 400, { ok: false, error: 'مسار غير صالح' });
    return;
  }

  const rootDir = getStaticRootDir();
  const reqPath = decodedPath === '/' ? '/index.html' : decodedPath;
  const safeRel = sanitizeRelativeUrlPath(reqPath) || 'index.html';
  const { fullPath, stat } = resolveStaticTarget(rootDir, safeRel);

  const relParts = path.relative(rootDir, fullPath).split(path.sep);
  if (relParts.some((part) => BLOCKED_NAMES.includes(part) || part.startsWith('.env'))) {
    sendJson(res, 403, { ok: false, error: 'الوصول إلى هذا المسار غير مسموح' });
    return;
  }

  if (!stat || !stat.isFile()) {
    sendJson(res, 404, { ok: false, error: 'الملف غير موجود' });
    return;
  }

  const { etag, headers } = buildStaticHeaders(fullPath, stat);
  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, { 'ETag': etag });
    res.end();
    return;
  }

  res.writeHead(200, headers);
  if (req.method === 'HEAD') {
    res.end();
    return;
  }

  const stream = fs.createReadStream(fullPath);
  stream.on('error', (err) => {
    console.error('[Sanad AI] Static stream error:', err.message);
    if (!res.headersSent) {
      sendJson(res, 500, { ok: false, error: 'تعذر قراءة الملف' });
    } else if (!res.writableEnded) {
      res.end();
    }
  });
  stream.pipe(res);
}

// ---------------------------------------------------------------------------
// Health, Status & WebSocket Hub Attachment
// ---------------------------------------------------------------------------
function handleBuiltInRoutes(req, res, parsedUrl) {
  const pathname = parsedUrl.pathname;

  if (pathname === '/health' || pathname === '/api/health') {
    sendJson(res, 200, {
      ok: true,
      service: 'sanad',
      version: APP_VERSION,
      env: NODE_ENV,
      draining: isShuttingDown,
      inFlightRequests: activeInFlightRequests,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
    return true;
  }

  if (pathname === '/api/status') {
    sendJson(res, 200, {
      ok: true,
      service: 'sanad',
      version: APP_VERSION,
      features: {
        realtime: Boolean(wsHubModule),
        syncApi: typeof handleApiRequest === 'function',
        mediaMaxDurationSeconds: 300,
        customAudioAlerts: true,
        zeroDowntimeDraining: true,
      },
      timestamp: new Date().toISOString(),
    });
    return true;
  }

  return false;
}

function attachWebSocketHub(server) {
  const hub = wsHubModule && wsHubModule.wshHub ? wsHubModule.wshHub : wsHubModule;
  if (!hub) {
    console.warn('[Sanad AI] wsHub not available; HTTP server running without WebSocket hub.');
    return null;
  }

  try {
    if (typeof hub.attach === 'function') {
      hub.attach(server);
      console.log('[Sanad AI] WebSocket hub attached via hub.attach(server).');
      return hub;
    }
    if (typeof hub === 'function') {
      hub(server);
      console.log('[Sanad AI] WebSocket hub attached via hub(server).');
      return hub;
    }
    if (wsHubModule && typeof wsHubModule.attachWsHub === 'function') {
      wsHubModule.attachWsHub(server);
      console.log('[Sanad AI] WebSocket hub attached via attachWsHub(server).');
      return wsHubModule;
    }
  } catch (err) {
    console.error('[Sanad AI] Failed attaching WebSocket hub (continuing HTTP):', err.message);
  }

  console.warn('[Sanad AI] wsHub attach method not found; continuing HTTP server.');
  return null;
}

// ---------------------------------------------------------------------------
// HTTP Server & Graceful Lifecycle
// ---------------------------------------------------------------------------
async function routeIncomingRequest(req, res, parsedUrl, requestId) {
  if (handleBuiltInRoutes(req, res, parsedUrl)) {
    return;
  }

  if (parsedUrl.pathname.startsWith('/api/')) {
    if (
      ['POST', 'PUT', 'PATCH'].includes(req.method) &&
      req.headers['content-type'] &&
      req.headers['content-type'].includes('application/json')
    ) {
      req.body = await readJsonBody(req);
    }

    const handled = await handleApiRequest(req, res, parsedUrl);
    if (handled === false && !res.headersSent && !res.writableEnded) {
      sendJson(res, 404, { ok: false, error: 'المسار غير موجود' });
    }
    return;
  }

  serveStaticFile(req, res, parsedUrl);
}

const server = http.createServer(async (req, res) => {
  const startTime = Date.now();
  const requestId = getRequestId(req);
  const clientIp = getClientIp(req);

  activeInFlightRequests += 1;
  res.setHeader('X-Request-Id', requestId);
  applySecurityHeaders(req, res);

  res.once('finish', () => {
    activeInFlightRequests = Math.max(0, activeInFlightRequests - 1);
    const durationMs = Date.now() - startTime;
    if (res.statusCode >= 500 || durationMs > 2000) {
      console.warn(
        `[Sanad AI] [${requestId}] ${req.method} ${req.url} -> ${res.statusCode} (${durationMs}ms) ip=${clientIp}`
      );
    }
  });

  res.once('close', () => {
    if (!res.writableFinished) {
      activeInFlightRequests = Math.max(0, activeInFlightRequests - 1);
    }
  });

  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Content-Length': '0' });
    res.end();
    return;
  }

  if (isShuttingDown && req.url !== '/health' && req.url !== '/api/health') {
    sendJson(
      res,
      503,
      {
        ok: false,
        error: 'الخادم قيد التحديث وتفريغ الاتصالات الحالية، يرجى المحاولة بعد قليل',
        retryAfterSeconds: 3,
      },
      { 'Retry-After': '3', 'Connection': 'close' }
    );
    return;
  }

  const rate = checkRateLimit(clientIp);
  res.setHeader('X-RateLimit-Remaining', String(rate.remaining));
  if (!rate.allowed) {
    const retryAfterSec = Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000));
    sendJson(
      res,
      429,
      {
        ok: false,
        error: 'تم تجاوز الحد المسموح من الطلبات مؤقتاً',
        retryAfterSeconds: retryAfterSec,
      },
      { 'Retry-After': String(retryAfterSec) }
    );
    return;
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(req.url || '/', 'http://' + (req.headers.host || 'localhost'));
  } catch (_) {
    sendJson(res, 400, { ok: false, error: 'عنوان الطلب غير صالح' });
    return;
  }

  try {
    await routeIncomingRequest(req, res, parsedUrl, requestId);
  } catch (err) {
    const statusCode = Number(err && err.statusCode) || 500;
    console.error(`[Sanad AI] [${requestId}] Unhandled route error:`, err && err.stack ? err.stack : err);
    if (statusCode === 413) {
      sendJson(res, 413, { ok: false, error: 'حجم البيانات المرسلة أكبر من الحد المسموح' });
    } else if (statusCode === 400) {
      sendJson(res, 400, { ok: false, error: 'بيانات الطلب غير صالحة' });
    } else {
      sendJson(res, 500, { ok: false, error: 'حدث خطأ داخلي في الخادم' });
    }
  }
});

server.requestTimeout = REQUEST_TIMEOUT_MS;
server.headersTimeout = HEADERS_TIMEOUT_MS;
server.keepAliveTimeout = KEEP_ALIVE_TIMEOUT_MS;

server.on('connection', (socket) => {
  activeSockets.add(socket);
  socket.setKeepAlive(true, 15000);
  socket.on('close', () => {
    activeSockets.delete(socket);
  });
});

server.on('clientError', (err, socket) => {
  if (err.code === 'ECONNRESET' || !socket.writable) {
    return;
  }
  socket.end('HTTP/1.1 400 Bad Request\r\nContent-Type: text/plain; charset=utf-8\r\n\r\nBad Request');
});

server.on('error', (err) => {
  console.error('[Sanad AI] Server error:', err && err.stack ? err.stack : err);
});

function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(
    `[Sanad AI] Received ${signal}. Draining ${activeInFlightRequests} active requests without dropping live work...`
  );

  const hub = wsHubModule && (wsHubModule.wshHub || wsHubModule);
  if (hub && typeof hub.prepareShutdown === 'function') {
    try {
      hub.prepareShutdown();
    } catch (err) {
      console.warn('[Sanad AI] wsHub prepareShutdown warning:', err.message);
    }
  }

  server.close((err) => {
    if (err) {
      console.error('[Sanad AI] Error closing server:', err.message);
      process.exitCode = 1;
    } else {
      console.log('[Sanad AI] HTTP server closed cleanly.');
    }
    process.exit();
  });

  const forceTimer = setTimeout(() => {
    console.warn(`[Sanad AI] Shutdown timeout (${SHUTDOWN_TIMEOUT_MS}ms) reached; closing idle sockets.`);
    for (const socket of activeSockets) {
      if (!socket.destroyed) {
        socket.destroy();
      }
    }
    setTimeout(() => process.exit(0), 250).unref();
  }, SHUTDOWN_TIMEOUT_MS);
  forceTimer.unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  console.error('[Sanad AI] uncaughtException (kept alive):', err && err.stack ? err.stack : err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Sanad AI] unhandledRejection (kept alive):', reason);
});

attachWebSocketHub(server);

server.listen(PORT, HOST, () => {
  console.log(`[Sanad AI v${APP_VERSION}] (${NODE_ENV}) running on http://${HOST}:${PORT}`);
});

module.exports = { server, appServer: server, getStaticRootDir, serveStaticFile, attachWebSocketHub };
