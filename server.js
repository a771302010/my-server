'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');

const APP_VERSION = '13.2.0';
const PORT = Number(process.env.PORT || 10000);
const HOST = process.env.HOST || '0.0.0.0';
const ROOT_DIR = process.cwd();
const DATA_DIR = process.env.SANAD_DATA_DIR || path.join(ROOT_DIR, 'data');
const STATE_FILE = path.join(DATA_DIR, 'sanad-v1320-state.json');

fs.mkdirSync(DATA_DIR, { recursive: true });

// ===== تحميل وحفظ الحالة المستقرة =====
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      return {
        cursor: Number(parsed.cursor || 0),
        events: Array.isArray(parsed.events) ? parsed.events.slice(-800) : [],
        used88Codes: Array.isArray(parsed.used88Codes) ? parsed.used88Codes : [],
        otpCodes: parsed.otpCodes && typeof parsed.otpCodes === 'object' ? parsed.otpCodes : {}
      };
    }
  } catch (err) {
    console.error('[sanad] failed to load state:', err.message);
  }
  return {
    cursor: 0,
    events: [],
    used88Codes: [],
    otpCodes: {}
  };
}

const state = loadState();
let saveTimer = null;

function persistState() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      fs.writeFileSync(
        STATE_FILE,
        JSON.stringify(
          {
            cursor: state.cursor,
            events: state.events.slice(-800),
            used88Codes: state.used88Codes.slice(-5000),
            otpCodes: state.otpCodes
          },
          null,
          2
        ),
        'utf8'
      );
    } catch (err) {
      console.error('[sanad] failed to save state:', err.message);
    }
  }, 150);
}

// ===== تتبع الاتصالات الحية (HTTP + WebSocket) =====
const onlineIds = new Set(['80000008']);
const wsClients = new Set();

function recordOnlineIds(ids = []) {
  let changed = false;
  for (const raw of ids) {
    const clean = String(raw || '').trim().toLowerCase();
    if (!clean) continue;
    if (!onlineIds.has(clean)) {
      onlineIds.add(clean);
      changed = true;
    }
  }
  if (changed) {
    broadcastWs({ type: 'online_users', ids: Array.from(onlineIds) });
  }
}

function appendSyncEvent(rawEvent) {
  state.cursor += 1;
  const event = Object.assign(
    {
      cursor: state.cursor,
      eventId: 'ev-' + state.cursor + '-' + crypto.randomBytes(3).toString('hex'),
      ts: Date.now()
    },
    rawEvent
  );
  if (event.from) recordOnlineIds([event.from]);
  state.events.push(event);
  if (state.events.length > 800) {
    state.events = state.events.slice(-800);
  }
  persistState();
  broadcastWs(event);
  return event;
}

function broadcastWs(payload) {
  const frame = encodeWsText(JSON.stringify(payload));
  for (const client of wsClients) {
    try {
      if (client.socket && !client.socket.destroyed) {
        client.socket.write(frame);
      }
    } catch {
      wsClients.delete(client);
    }
  }
}

// ===== إطار WebSocket قياسي خفيف بدون تبعيات خارجية =====
function encodeWsText(text) {
  const body = Buffer.from(text, 'utf8');
  const len = body.length;
  if (len < 126) {
    const header = Buffer.alloc(2);
    header[0] = 0x81;
    header[1] = len;
    return Buffer.concat([header, body]);
  }
  if (len < 65536) {
    const header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
    return Buffer.concat([header, body]);
  }
  const header = Buffer.alloc(10);
  header[0] = 0x81;
  header[1] = 127;
  header.writeBigUInt64BE(BigInt(len), 2);
  return Buffer.concat([header, body]);
}

function decodeWsFrames(buffer) {
  const messages = [];
  let offset = 0;
  while (offset + 2 <= buffer.length) {
    const b0 = buffer[offset];
    const b1 = buffer[offset + 1];
    const opcode = b0 & 0x0f;
    const masked = (b1 & 0x80) !== 0;
    let payloadLen = b1 & 0x7f;
    let pos = offset + 2;

    if (payloadLen === 126) {
      if (pos + 2 > buffer.length) break;
      payloadLen = buffer.readUInt16BE(pos);
      pos += 2;
    } else if (payloadLen === 127) {
      if (pos + 8 > buffer.length) break;
      payloadLen = Number(buffer.readBigUInt64BE(pos));
      pos += 8;
    }

    const maskLen = masked ? 4 : 0;
    if (pos + maskLen + payloadLen > buffer.length) break;

    let maskKey = null;
    if (masked) {
      maskKey = buffer.subarray(pos, pos + 4);
      pos += 4;
    }

    const rawPayload = Buffer.from(buffer.subarray(pos, pos + payloadLen));
    if (masked && maskKey) {
      for (let i = 0; i < rawPayload.length; i++) {
        rawPayload[i] ^= maskKey[i % 4];
      }
    }

    offset = pos + payloadLen;

    if (opcode === 0x8) {
      return { messages, remaining: Buffer.alloc(0), closed: true };
    }
    if (opcode === 0x9) {
      const pong = Buffer.alloc(2 + rawPayload.length);
      pong[0] = 0x8a;
      pong[1] = rawPayload.length;
      rawPayload.copy(pong, 2);
      return { messages, remaining: buffer.subarray(offset), pong };
    }
    if (opcode === 0x1) {
      messages.push(rawPayload.toString('utf8'));
    }
  }
  return { messages, remaining: buffer.subarray(offset), closed: false };
}

// ===== توليد أكواد 88 حصرية مكونة من 8 أرقام =====
function generateUnique88Code() {
  const used = new Set(state.used88Codes);
  for (let i = 0; i < 200; i++) {
    const num = crypto.randomInt(100000, 1000000);
    const code = '88' + String(num);
    if (!used.has(code)) {
      state.used88Codes.push(code);
      if (state.used88Codes.length > 5000) {
        state.used88Codes = state.used88Codes.slice(-5000);
      }
      persistState();
      return code;
    }
  }
  return '88' + String(Date.now()).slice(-6);
}

// ===== خدمة الذكاء الاصطناعي والترجمة =====
async function runAiChat(prompt) {
  const cleanPrompt = String(prompt || '').trim();
  const apiKey = process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || '';

  if (process.env.OPENAI_API_KEY) {
    try {
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'أنت مساعد سند AI: متعاون، دقيق، وواضح، وتجيب بالعربية بأسلوب مهذب ومباشر.'
            },
            { role: 'user', content: cleanPrompt }
          ],
          temperature: 0.5
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        const content = data?.choices?.[0]?.message?.content;
        if (content) return String(content).trim();
      }
    } catch {}
  }

  if (process.env.GEMINI_API_KEY) {
    try {
      const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: cleanPrompt }] }]
          })
        }
      );
      if (resp.ok) {
        const data = await resp.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return String(text).trim();
      }
    } catch {}
  }

  return `أهلاً بك في مساعد سند AI (v${APP_VERSION}). تم استلام رسالتك: "${cleanPrompt}" -- كيف يمكنني مساعدتك في تلخيصها أو صياغتها أو ترجمتها؟`;
}

async function runTranslation(text, targetLang) {
  const cleanText = String(text || '').trim();
  const lang = String(targetLang || 'en').trim().toLowerCase();
  const prompt = `Translate the following text accurately to ${lang === 'ar' ? 'Arabic' : lang === 'en' ? 'English' : lang}. Return only the translation without extra commentary:\n\n${cleanText}`;
  const translated = await runAiChat(prompt);
  return translated;
}

// ===== الأصول الافتراضية والـ PWA =====
const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0e5a73"/>
      <stop offset="100%" stop-color="#051c26"/>
    </linearGradient>
  </defs>
  <rect width="256" height="256" rx="56" fill="url(#bg)"/>
  <circle cx="128" cy="128" r="88" fill="none" stroke="#38bdf8" stroke-opacity="0.35" stroke-width="4"/>
  <text x="128" y="156" text-anchor="middle" fill="#e0f2fe" font-family="Tahoma, Arial, sans-serif" font-size="112" font-weight="700">س</text>
</svg>`;

function buildManifest() {
  return {
    name: 'سند AI -- اتصال ذكي وأقمار صناعية',
    short_name: 'سند AI',
    description: 'منظومة سند الذكية الموزّعة للاتصال الفوري والرصد الرقمي',
    lang: 'ar',
    dir: 'rtl',
    start_url: '/?v=' + APP_VERSION,
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#041016',
    theme_color: '#164e63',
    icons: [
      { src: `/icon.svg?v=${APP_VERSION}`, sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: `/icon-192.png?v=${APP_VERSION}`, sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: `/apple-touch-icon.png?v=${APP_VERSION}`, sizes: '180x180', type: 'image/png', purpose: 'any' }
    ]
  };
}

function buildServiceWorker() {
  return `const CACHE_NAME = 'sanad-ai-cache-v${APP_VERSION}';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json?v=${APP_VERSION}',
  '/icon.svg?v=${APP_VERSION}',
  '/icon-192.png?v=${APP_VERSION}',
  '/apple-touch-icon.png?v=${APP_VERSION}'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS).catch(() => {})).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event && event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.startsWith('/api/')) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put('/', copy)).catch(() => {});
        return res;
      }).catch(() => caches.match('/').then((r) => r || caches.match('/index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      if (res && res.ok && url.origin === self.location.origin) {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
      }
      return res;
    }).catch(() => cached))
  );
});
`;
}

// ===== مساعدة قراءة JSON وإرسال الاستجابات =====
function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Sanad-Version': APP_VERSION
  });
  res.end(body);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 2 * 1024 * 1024) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function resolveIndexHtml() {
  const candidates = [
    path.join(ROOT_DIR, 'index.html'),
    path.join(ROOT_DIR, 'public', 'index.html')
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return fs.readFileSync(p, 'utf8');
    }
  }
  return null;
}

function serveStaticFile(req, res, pathname) {
  if (pathname === '/' || pathname === '/index.html') {
    const html = resolveIndexHtml();
    if (html) {
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Sanad-Version': APP_VERSION
      });
      res.end(html);
      return true;
    }
  }

  if (pathname === '/manifest.json') {
    sendJson(res, 200, buildManifest());
    return true;
  }

  if (pathname === '/sw.js') {
    res.writeHead(200, {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Service-Worker-Allowed': '/'
    });
    res.end(buildServiceWorker());
    return true;
  }

  if (pathname === '/icon.svg') {
    const customSvg = path.join(ROOT_DIR, 'icon.svg');
    const content = fs.existsSync(customSvg) ? fs.readFileSync(customSvg) : Buffer.from(ICON_SVG, 'utf8');
    res.writeHead(200, { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'public, max-age=86400' });
    res.end(content);
    return true;
  }

  if (pathname === '/icon-192.png' || pathname === '/apple-touch-icon.png') {
    const fileName = pathname.slice(1);
    const diskPaths = [
      path.join(ROOT_DIR, fileName),
      path.join(ROOT_DIR, 'icons', fileName),
      path.join(ROOT_DIR, 'public', fileName)
    ];
    for (const p of diskPaths) {
      if (fs.existsSync(p)) {
        res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' });
        res.end(fs.readFileSync(p));
        return true;
      }
    }
    res.writeHead(200, { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'public, max-age=86400' });
    res.end(ICON_SVG);
    return true;
  }

  const safeRel = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  const diskCandidates = [
    path.join(ROOT_DIR, safeRel),
    path.join(ROOT_DIR, 'public', safeRel)
  ];
  const mimeMap = {
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.html': 'text/html; charset=utf-8'
  };

  for (const candidate of diskCandidates) {
    if (candidate.startsWith(ROOT_DIR) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      const ext = path.extname(candidate).toLowerCase();
      res.writeHead(200, {
        'Content-Type': mimeMap[ext] || 'application/octet-stream',
        'Cache-Control': 'no-cache'
      });
      res.end(fs.readFileSync(candidate));
      return true;
    }
  }

  return false;
}

// ===== خادم HTTP الرئيسي =====
const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // فحص الجاهزية والصحة
  if (req.method === 'GET' && (pathname === '/healthz' || pathname === '/api/health')) {
    sendJson(res, 200, {
      ok: true,
      service: 'sanad-ai',
      version: APP_VERSION,
      cursor: state.cursor,
      onlineCount: onlineIds.size
    });
    return;
  }

  // توليد كود 88 آلي فريد
  if (req.method === 'POST' && pathname === '/api/codes/generate-88') {
    const code = generateUnique88Code();
    sendJson(res, 200, { ok: true, code, version: APP_VERSION });
    return;
  }

  // طلب رمز تحقق مؤقت
  if (req.method === 'POST' && pathname === '/api/auth/request-code') {
    try {
      const body = await readJsonBody(req);
      const identifier = String(body.identifier || body.code || body.phone || '').trim();
      if (!identifier) {
        sendJson(res, 400, { ok: false, error: 'identifier_required' });
        return;
      }
      const otp = String(crypto.randomInt(100000, 1000000));
      state.otpCodes[identifier] = {
        code: otp,
        expiresAt: Date.now() + 5 * 60 * 1000
      };
      persistState();
      sendJson(res, 200, {
        ok: true,
        identifier,
        expiresInSec: 300,
        debugCode: process.env.NODE_ENV === 'production' ? undefined : otp
      });
    } catch {
      sendJson(res, 400, { ok: false, error: 'invalid_json' });
    }
    return;
  }

  // التحقق من رمز الدخول
  if (req.method === 'POST' && pathname === '/api/auth/verify-code') {
    try {
      const body = await readJsonBody(req);
      const identifier = String(body.identifier || body.code || body.phone || '').trim();
      const otp = String(body.otp || body.token || '').trim();
      const entry = state.otpCodes[identifier];
      if (!entry || Date.now() > entry.expiresAt || entry.code !== otp) {
        sendJson(res, 401, { ok: false, error: 'invalid_or_expired_code' });
        return;
      }
      delete state.otpCodes[identifier];
      persistState();
      recordOnlineIds([identifier]);
      sendJson(res, 200, { ok: true, identifier, version: APP_VERSION });
    } catch {
      sendJson(res, 400, { ok: false, error: 'invalid_json' });
    }
    return;
  }

  // مزامنة الأحداث والحالة (GET)
  if (req.method === 'GET' && pathname === '/api/sync') {
    const since = Number(parsedUrl.searchParams.get('since') || '0');
    const idsParam = String(parsedUrl.searchParams.get('ids') || '');
    const clientIds = idsParam.split(',').map((s) => s.trim()).filter(Boolean);
    if (clientIds.length) {
      recordOnlineIds(clientIds);
    }

    const events = state.events.filter((ev) => Number(ev.cursor || 0) > since);
    sendJson(res, 200, {
      ok: true,
      version: APP_VERSION,
      cursor: state.cursor,
      onlineIds: Array.from(onlineIds),
      events
    });
    return;
  }

  // إرسال أحداث المزامنة والتسجيل (POST)
  if (req.method === 'POST' && pathname === '/api/sync') {
    try {
      const body = await readJsonBody(req);
      if (body.type === 'register_ids') {
        const list = Array.isArray(body.ids) ? body.ids : [];
        if (body.activeId) list.push(body.activeId);
        recordOnlineIds(list);
        sendJson(res, 200, {
          ok: true,
          cursor: state.cursor,
          onlineIds: Array.from(onlineIds)
        });
        return;
      }

      const created = appendSyncEvent(body);
      sendJson(res, 200, {
        ok: true,
        cursor: state.cursor,
        event: created
      });
    } catch {
      sendJson(res, 400, { ok: false, error: 'invalid_json' });
    }
    return;
  }

  // مساعد سند AI: محادثة
  if (req.method === 'POST' && pathname === '/api/ai/chat') {
    try {
      const body = await readJsonBody(req);
      const prompt = String(body.prompt || body.message || body.text || '').trim();
      if (!prompt) {
        sendJson(res, 400, { ok: false, error: 'prompt_required' });
        return;
      }
      const reply = await runAiChat(prompt);
      sendJson(res, 200, { ok: true, reply, version: APP_VERSION });
    } catch {
      sendJson(res, 400, { ok: false, error: 'invalid_json' });
    }
    return;
  }

  // مساعد سند AI: ترجمة
  if (req.method === 'POST' && pathname === '/api/ai/translate') {
    try {
      const body = await readJsonBody(req);
      const text = String(body.text || body.prompt || '').trim();
      const targetLang = String(body.targetLang || body.to || 'en').trim();
      if (!text) {
        sendJson(res, 400, { ok: false, error: 'text_required' });
        return;
      }
      const translated = await runTranslation(text, targetLang);
      sendJson(res, 200, { ok: true, translated, targetLang, version: APP_VERSION });
    } catch {
      sendJson(res, 400, { ok: false, error: 'invalid_json' });
    }
    return;
  }

  // خدمة الملفات الثابتة وواجهة التطبيق
  if (req.method === 'GET' || req.method === 'HEAD') {
    const served = serveStaticFile(req, res, pathname);
    if (served) return;
  }

  sendJson(res, 404, { ok: false, error: 'not_found', path: pathname });
});

// ===== ترقية اتصالات WebSocket =====
server.on('upgrade', (req, socket, head) => {
  const key = req.headers['sec-websocket-key'];
  if (!key) {
    socket.destroy();
    return;
  }

  const acceptKey = crypto
    .createHash('sha1')
    .update(String(key).trim() + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
    .digest('base64');

  socket.write(
    [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${acceptKey}`,
      '\r\n'
    ].join('\r\n')
  );

  const client = {
    socket,
    buffer: head && head.length ? Buffer.from(head) : Buffer.alloc(0),
    registeredIds: []
  };
  wsClients.add(client);

  try {
    socket.write(encodeWsText(JSON.stringify({ type: 'online_users', ids: Array.from(onlineIds) })));
  } catch {}

  socket.on('data', (chunk) => {
    client.buffer = Buffer.concat([client.buffer, chunk]);
    const decoded = decodeWsFrames(client.buffer);
    client.buffer = decoded.remaining;
    if (decoded.pong) {
      try { socket.write(decoded.pong); } catch {}
    }
    for (const rawMsg of decoded.messages) {
      try {
        const packet = JSON.parse(rawMsg);
        if (!packet || typeof packet !== 'object') continue;
        if (packet.type === 'register_ids') {
          const ids = Array.isArray(packet.ids) ? packet.ids : [];
          if (packet.activeId) ids.push(packet.activeId);
          client.registeredIds = ids.map((x) => String(x || '').trim().toLowerCase()).filter(Boolean);
          recordOnlineIds(client.registeredIds);
        } else {
          appendSyncEvent(packet);
        }
      } catch {}
    }
  });

  const cleanup = () => {
    wsClients.delete(client);
    for (const id of client.registeredIds) {
      if (id !== '80000008') {
        const stillConnected = Array.from(wsClients).some((c) => c.registeredIds.includes(id));
        if (!stillConnected) {
          onlineIds.delete(id);
        }
      }
    }
    broadcastWs({ type: 'online_users', ids: Array.from(onlineIds) });
  };

  socket.on('close', cleanup);
  socket.on('error', cleanup);
});

server.listen(PORT, HOST, () => {
  console.log(`[sanad] server v${APP_VERSION} running on http://${HOST}:${PORT}`);
});
