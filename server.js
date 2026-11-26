const path = require('path');
const http = require('http');
const express = require('express');
const { WebSocketServer } = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, version: '12.0.0', time: new Date().toISOString() });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// خريطة تربط كل معرّف (كود أو رقم هاتف) بمجموعة الاتصالات النشطة له
const clientsById = new Map();
// صندوق رسائل مؤقت لمن يكون غير متصل لحظة الإرسال
const offlineQueue = new Map();

function normalizeId(raw) {
  return String(raw || '').replace(/[^\d+]/g, '').trim();
}

function addClient(userId, ws) {
  if (!userId) return;
  if (!clientsById.has(userId)) clientsById.set(userId, new Set());
  clientsById.get(userId).add(ws);

  const pending = offlineQueue.get(userId) || [];
  if (pending.length) {
    pending.forEach((pkt) => {
      if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(pkt));
    });
    offlineQueue.delete(userId);
  }
}

function removeClient(userId, ws) {
  if (!userId || !clientsById.has(userId)) return;
  const set = clientsById.get(userId);
  set.delete(ws);
  if (set.size === 0) clientsById.delete(userId);
}

function sendToUser(targetId, payload) {
  const cleanTarget = normalizeId(targetId);
  const sockets = clientsById.get(cleanTarget);
  const raw = JSON.stringify(payload);
  let delivered = false;

  if (sockets && sockets.size > 0) {
    sockets.forEach((client) => {
      if (client.readyState === client.OPEN) {
        client.send(raw);
        delivered = true;
      }
    });
  }

  if (!delivered && payload.type === 'message') {
    if (!offlineQueue.has(cleanTarget)) offlineQueue.set(cleanTarget, []);
    offlineQueue.get(cleanTarget).push(payload);
  }
  return delivered;
}

wss.on('connection', (ws) => {
  let boundUserId = null;

  ws.on('message', (chunk) => {
    let data = null;
    try {
      data = JSON.parse(chunk.toString());
    } catch {
      return;
    }
    if (!data || !data.type) return;

    if (data.type === 'auth') {
      const cleanId = normalizeId(data.userId);
      if (!cleanId) return;
      if (boundUserId && boundUserId !== cleanId) {
        removeClient(boundUserId, ws);
      }
      boundUserId = cleanId;
      ws.userId = cleanId;
      addClient(cleanId, ws);
      ws.send(JSON.stringify({ type: 'auth-ok', userId: cleanId }));
      return;
    }

    const fromId = normalizeId(data.fromId || boundUserId);
    const toId = normalizeId(data.toId);

    if (data.type === 'presence') {
      const isOnline = Boolean(data.online);
      wss.clients.forEach((client) => {
        if (client.readyState === client.OPEN && client.userId && client.userId !== fromId) {
          client.send(JSON.stringify({
            type: 'presence',
            userId: fromId,
            online: isOnline
          }));
        }
      });
      return;
    }

    if (data.type === 'message' && toId && data.message) {
      const wasDelivered = sendToUser(toId, {
        type: 'message',
        fromId,
        toId,
        threadId: fromId,
        message: Object.assign({}, data.message, { mine: false })
      });

      if (wasDelivered && fromId && data.message.id) {
        sendToUser(fromId, {
          type: 'receipt',
          threadId: toId,
          messageId: data.message.id,
          status: 'delivered'
        });
      }
      return;
    }

    if (data.type === 'receipt' && toId) {
      sendToUser(toId, {
        type: 'receipt',
        threadId: fromId,
        messageId: data.messageId,
        status: data.status || 'delivered'
      });
      return;
    }

    if (data.type === 'read-thread' && toId) {
      sendToUser(toId, {
        type: 'read-thread',
        fromId,
        toId
      });
      return;
    }

    if (data.type === 'call-signal' && toId) {
      sendToUser(toId, {
        type: 'call-signal',
        fromId,
        toId,
        signal: data.signal
      });
    }
  });

  ws.on('close', () => {
    if (boundUserId) {
      removeClient(boundUserId, ws);
      wss.clients.forEach((client) => {
        if (client.readyState === client.OPEN) {
          client.send(JSON.stringify({
            type: 'presence',
            userId: boundUserId,
            online: false
          }));
        }
      });
    }
  });
});

server.listen(PORT, () => {
  console.log(`Sanad server running on port ${PORT}`);
});
