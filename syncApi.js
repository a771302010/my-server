const { config } = require('../config/env');
const { db } = require('../storage/db');
const { saveBase64Media, resolveMediaPath } = require('../storage/mediaStore');
const { runAssistant } = require('../ai/supportAgent');
const { normPeerId } = require('./wsHub');

function sendJson(res, statusCode, bodyObj) {
  const payload = JSON.stringify(bodyObj);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(payload);
}

function readJsonBody(req, maxBytes = config.maxUploadBytes + 512 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error('حجم الطلب كبير جداً'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(new Error('صيغة JSON غير صالحة'));
      }
    });
    req.on('error', reject);
  });
}

async function handleApiRequest(req, res, parsedUrl) {
  const pathname = parsedUrl.pathname;

  if (pathname === '/healthz' || pathname === '/api/health') {
    return sendJson(res, 200, {
      ok: true,
      service: 'sanad-ai',
      version: config.version,
      uptimeSec: Math.floor(process.uptime()),
      timestamp: Date.now()
    });
  }

  if (pathname === '/api/push/config') {
    return sendJson(res, 200, {
      ok: true,
      enabled: Boolean(config.vapidPublicKey),
      publicKey: config.vapidPublicKey
    });
  }

  if (pathname === '/api/push/subscribe' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      if (body && body.subscription) {
        db.addPushSubscription(body.subscription);
      }
      return sendJson(res, 200, { ok: true });
    } catch (err) {
      return sendJson(res, 400, { ok: false, error: err.message });
    }
  }

  if (pathname === '/api/upload' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const saved = saveBase64Media({
        dataUrl: body.dataUrl,
        fileName: body.fileName,
        mimeType: body.mimeType
      });
      return sendJson(res, 200, { ok: true, ...saved });
    } catch (err) {
      return sendJson(res, 400, { ok: false, error: err.message });
    }
  }

  if (pathname.startsWith('/api/media/') && req.method === 'GET') {
    const fileParam = decodeURIComponent(pathname.replace('/api/media/', ''));
    const fullPath = resolveMediaPath(fileParam);
    if (!fullPath) {
      return sendJson(res, 404, { ok: false, error: 'الملف غير موجود' });
    }
    const ext = fullPath.split('.').pop().toLowerCase();
    const mimeMap = {
      webm: 'audio/webm',
      ogg: 'audio/ogg',
      mp3: 'audio/mpeg',
      m4a: 'audio/mp4',
      wav: 'audio/wav',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      gif: 'image/gif',
      pdf: 'application/pdf',
      txt: 'text/plain; charset=utf-8'
    };
    const fs = require('fs');
    const stat = fs.statSync(fullPath);
    res.writeHead(200, {
      'Content-Type': mimeMap[ext] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': 'public, max-age=86400'
    });
    fs.createReadStream(fullPath).pipe(res);
    return;
  }

  if (pathname === '/api/ai/assistant' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const result = await runAssistant(body || {});
      return sendJson(res, 200, result);
    } catch (err) {
      return sendJson(res, 400, { ok: false, error: err.message });
    }
  }

  if (pathname === '/api/sync' && req.method === 'GET') {
    const peerId = normPeerId(parsedUrl.searchParams.get('peerId') || '');
    const groupId = (parsedUrl.searchParams.get('groupId') || '').trim();
    const since = Number(parsedUrl.searchParams.get('since') || 0);
    if (peerId) {
      db.updatePresence(peerId, true);
    }
    const messages = db.queryMessages({ peerId, groupId, since, limit: 250 });
    return sendJson(res, 200, {
      ok: true,
      serverTime: Date.now(),
      version: config.version,
      messages,
      groups: Object.values(db.state.groups),
      presence: db.getPresenceMap()
    });
  }

  if (pathname === '/api/sync' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const peerId = normPeerId(body.peerId || body.account?.id || '');
      if (peerId) {
        db.upsertUser({
          id: peerId,
          name: body.account?.name || peerId,
          phone: body.account?.phone || peerId,
          role: body.account?.role || 'مستخدم'
        });
        db.updatePresence(peerId, true, body.account?.name || peerId);
      }

      if (Array.isArray(body.messages)) {
        for (const m of body.messages) {
          if (m && m.id) {
            db.saveMessage({
              ...m,
              from: normPeerId(m.from) || peerId,
              to: normPeerId(m.to)
            });
          }
        }
      }

      if (Array.isArray(body.groups)) {
        for (const g of body.groups) {
          if (g && g.id) {
            db.upsertGroup(g);
          }
        }
      }

      const since = Number(body.since || 0);
      const messages = db.queryMessages({
        peerId: (body.filterPeerId ? normPeerId(body.filterPeerId) : '') || '',
        groupId: (body.filterGroupId || '').trim(),
        since,
        limit: 250
      });

      return sendJson(res, 200, {
        ok: true,
        serverTime: Date.now(),
        version: config.version,
        messages,
        groups: Object.values(db.state.groups),
        presence: db.getPresenceMap()
      });
    } catch (err) {
      return sendJson(res, 400, { ok: false, error: err.message });
    }
  }

  return false;
}

module.exports = { handleApiRequest };
