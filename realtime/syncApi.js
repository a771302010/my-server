const url = require('url');
const { db } = require('../storage/db');

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body, 'utf8'),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk.toString('utf8');
      if (raw.length > 2 * 1024 * 1024) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

async function handleSyncApi(req, res) {
  if (req.method === 'OPTIONS') {
    return sendJson(res, 204, {});
  }

  const parsed = url.parse(req.url, true);
  const pathname = (parsed.pathname || '').replace(/\/+$/, '') || '/';
  const query = parsed.query || {};

  if (!pathname.startsWith('/api/sync')) {
    return false;
  }

  try {
    if (req.method === 'GET' && (pathname === '/api/sync' || pathname === '/api/sync/state')) {
      const peerId = String(query.peerId || query.userId || '').trim();
      const groupId = String(query.groupId || '').trim();
      const since = Number(query.since || 0) || 0;
      const limit = Number(query.limit || 200) || 200;

      const messages = db.queryMessages({ peerId, groupId, since, limit });
      const presence = db.getPresenceMap();
      const groups = Object.values(db.state.groups || {});
      const users = Object.values(db.state.users || {});

      return sendJson(res, 200, {
        ok: true,
        serverTime: Date.now(),
        messages,
        presence,
        groups,
        users
      });
    }

    if (req.method === 'GET' && pathname === '/api/sync/messages') {
      const peerId = String(query.peerId || query.userId || '').trim();
      const groupId = String(query.groupId || '').trim();
      const since = Number(query.since || 0) || 0;
      const limit = Number(query.limit || 200) || 200;

      const messages = db.queryMessages({ peerId, groupId, since, limit });
      return sendJson(res, 200, {
        ok: true,
        serverTime: Date.now(),
        messages
      });
    }

    if (req.method === 'POST' && pathname === '/api/sync/message') {
      const body = await readBody(req);
      const msg = body.message || body;
      if (!msg || (!msg.text && !msg.mediaUrl && !msg.kind)) {
        return sendJson(res, 400, { ok: false, error: 'Message content is required' });
      }
      const saved = db.saveMessage({
        ...msg,
        id: msg.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Number(msg.timestamp || Date.now())
      });
      return sendJson(res, 200, { ok: true, message: saved });
    }

    if (req.method === 'POST' && pathname === '/api/sync/message/status') {
      const body = await readBody(req);
      const msgId = String(body.msgId || body.id || '').trim();
      const status = String(body.status || '').trim();
      if (!msgId || !status) {
        return sendJson(res, 400, { ok: false, error: 'msgId and status are required' });
      }
      const updated = db.updateMessageStatus(msgId, status);
      return sendJson(res, 200, { ok: Boolean(updated), message: updated });
    }

    if (req.method === 'POST' && pathname === '/api/sync/message/action') {
      const body = await readBody(req);
      const updated = db.editOrDeleteMessage(body || {});
      return sendJson(res, 200, { ok: Boolean(updated), message: updated });
    }

    if (req.method === 'POST' && pathname === '/api/sync/presence') {
      const body = await readBody(req);
      const peerId = String(body.peerId || body.userId || '').trim();
      if (!peerId) {
        return sendJson(res, 400, { ok: false, error: 'peerId is required' });
      }
      const online = body.online !== undefined ? Boolean(body.online) : true;
      const name = String(body.name || '').trim();
      const entry = db.updatePresence(peerId, online, name);
      return sendJson(res, 200, { ok: true, presence: entry, allPresence: db.getPresenceMap() });
    }

    if (req.method === 'POST' && pathname === '/api/sync/user') {
      const body = await readBody(req);
      const user = db.upsertUser(body.user || body);
      if (!user) {
        return sendJson(res, 400, { ok: false, error: 'User id is required' });
      }
      return sendJson(res, 200, { ok: true, user });
    }

    if (req.method === 'POST' && pathname === '/api/sync/group') {
      const body = await readBody(req);
      const group = db.upsertGroup(body.group || body);
      if (!group) {
        return sendJson(res, 400, { ok: false, error: 'Group id is required' });
      }
      return sendJson(res, 200, { ok: true, group });
    }

    if (req.method === 'POST' && pathname === '/api/sync/push-subscription') {
      const body = await readBody(req);
      db.addPushSubscription(body.subscription || body);
      return sendJson(res, 200, { ok: true });
    }

    return sendJson(res, 404, { ok: false, error: 'Sync endpoint not found' });
  } catch (err) {
    const code = err.message === 'Invalid JSON' ? 400 : err.message === 'Payload too large' ? 413 : 500;
    return sendJson(res, code, { ok: false, error: err.message || 'Sync error' });
  }
}

module.exports = { handleSyncApi };
