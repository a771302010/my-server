const fs = require('fs');
const path = require('path');
const http = require('http');
const { URL } = require('url');
const { config } = require('./config/env');
const wsHubModule = require('./realtime/wsHub');
const { handleApiRequest } = require('./realtime/syncApi');

const STATIC_MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
};

function getStaticRootDir() {
  if (config && config.publicDir && fs.existsSync(path.join(config.publicDir, 'index.html'))) {
    return path.resolve(config.publicDir);
  }
  if (fs.existsSync(path.join(__dirname, 'public', 'index.html'))) {
    return path.resolve(__dirname, 'public');
  }
  return path.resolve(__dirname);
}

function serveStaticFile(req, res, parsedUrl) {
  const rootDir = getStaticRootDir();
  let reqPath = decodeURIComponent(parsedUrl.pathname || '/');
  if (reqPath === '/') reqPath = '/index.html';

  const safeRel = path.normalize(reqPath).replace(/^(\.\.[/\\])+/, '').replace(/^[/\\]+/, '');
  let fullPath = path.resolve(rootDir, safeRel);

  if (!fullPath.startsWith(rootDir) || !fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
    const indexFallback = path.resolve(rootDir, 'index.html');
    if (fs.existsSync(indexFallback)) {
      fullPath = indexFallback;
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }
  }

  const ext = path.extname(fullPath).toLowerCase();
  const headers = {
    'Content-Type': STATIC_MIME[ext] || 'application/octet-stream',
  };
  if (ext === '.js' || ext === '.html') {
    headers['Cache-Control'] = 'no-cache';
  }
  res.writeHead(200, headers);
  fs.createReadStream(fullPath).pipe(res);
}

function attachWebSocketHub(server) {
  const hub = wsHubModule && wsHubModule.wshHub ? wsHubModule.wshHub : wsHubModule;
  if (hub && typeof hub.attach === 'function') {
    hub.attach(server);
  } else if (typeof hub === 'function') {
    hub(server);
  } else if (wsHubModule && typeof wsHubModule.attachWsHub === 'function') {
    wsHubModule.attachWsHub(server);
  } else {
    console.warn('[Sanad AI] wsHub attach method not found; continuing HTTP server.');
  }
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (parsedUrl.pathname.startsWith('/api/')) {
    const handled = await handleApiRequest(req, res, parsedUrl);
    if (handled === false) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: 'المسار غير موجود' }));
    }
    return;
  }

  serveStaticFile(req, res, parsedUrl);
});

attachWebSocketHub(server);

server.listen(config.port, '0.0.0.0', () => {
  console.log(`[Sanad AI v${config.version}] running on http://0.0.0.0:${config.port}`);
});
