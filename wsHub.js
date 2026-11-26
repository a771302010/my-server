const WebSocket = require('ws');
const { config } = require('../config/env');
const { db } = require('../storage/db');

function normPeerId(raw) {
  if (!raw) return '';
  let s = String(raw).trim();
  if (!s) return '';
  if (s.startsWith('+')) {
    const digits = s.slice(1).replace(/[^0-9]/g, '');
    return digits ? `+${digits}` : '';
  }
  const digits = s.replace(/[^0-9]/g, '');
  if (digits.length >= 6) return `+${digits}`;
  return s.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
}

class WsHub {
  constructor() {
    this.wss = null;
    this.clients = new Set();
    this.peerSockets = new Map(); // peerId -> Set<WebSocket>
  }

  attach(server) {
    this.wss = new WebSocket.Server({ server });

    this.wss.on('connection', (ws) => {
      const meta = {
        peerId: '',
        name: '',
        isAlive: true,
        connectedAt: Date.now()
      };
      ws._meta = meta;
      this.clients.add(ws);

      ws.on('pong', () => {
        meta.isAlive = true;
        if (meta.peerId) {
          db.updatePresence(meta.peerId, true, meta.name);
        }
      });

      ws.on('message', (raw) => {
        this.handleIncoming(ws, raw);
      });

      ws.on('close', () => {
        this.removeSocket(ws);
      });

      ws.on('error', () => {
        this.removeSocket(ws);
      });

      this.sendJson(ws, {
        type: 'hello',
        serverTime: Date.now(),
        version: config.version,
        presence: db.getPresenceMap()
      });
    });

    this.heartbeatTimer = setInterval(() => {
      for (const ws of this.clients) {
        if (!ws._meta?.isAlive) {
          this.removeSocket(ws);
          try { ws.terminate(); } catch (_) {}
          continue;
        }
        ws._meta.isAlive = false;
        try { ws.ping(); } catch (_) {}
      }
    }, config.heartbeatIntervalMs);
  }

  bindPeer(ws, peerId, name = '') {
    const cleanId = normPeerId(peerId);
    if (!cleanId) return '';
    if (ws._meta.peerId && ws._meta.peerId !== cleanId) {
      const oldSet = this.peerSockets.get(ws._meta.peerId);
      if (oldSet) {
        oldSet.delete(ws);
        if (!oldSet.size) {
          this.peerSockets.delete(ws._meta.peerId);
          db.updatePresence(ws._meta.peerId, false, ws._meta.name);
        }
      }
    }
    ws._meta.peerId = cleanId;
    if (name) ws._meta.name = name;
    if (!this.peerSockets.has(cleanId)) {
      this.peerSockets.set(cleanId, new Set());
    }
    this.peerSockets.get(cleanId).add(ws);
    db.updatePresence(cleanId, true, ws._meta.name);
    this.broadcastPresence();
    return cleanId;
  }

  removeSocket(ws) {
    this.clients.delete(ws);
    const pid = ws._meta?.peerId;
    if (pid && this.peerSockets.has(pid)) {
      const set = this.peerSockets.get(pid);
      set.delete(ws);
      if (!set.size) {
        this.peerSockets.delete(pid);
        db.updatePresence(pid, false, ws._meta.name);
        this.broadcastPresence();
      }
    }
  }

  sendJson(ws, obj) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    try {
      ws.send(JSON.stringify(obj));
    } catch (_) {}
  }

  sendToPeer(peerId, obj, excludeWs = null) {
    const cleanId = normPeerId(peerId);
    if (!cleanId) return;
    const set = this.peerSockets.get(cleanId);
    if (!set) return;
    for (const sock of set) {
      if (sock !== excludeWs) {
        this.sendJson(sock, obj);
      }
    }
  }

  broadcastAll(obj, excludeWs = null) {
    for (const sock of this.clients) {
      if (sock !== excludeWs && sock.readyState === WebSocket.OPEN) {
        this.sendJson(sock, obj);
      }
    }
  }

  broadcastPresence() {
    this.broadcastAll({
      type: 'presence',
      presence: db.getPresenceMap(),
      ts: Date.now()
    });
  }

  handleIncoming(ws, rawBuffer) {
    let msg;
    try {
      msg = JSON.parse(rawBuffer.toString('utf8'));
    } catch (_) {
      return;
    }
    if (!msg || typeof msg !== 'object') return;

    const fromId = normPeerId(msg.from || msg.peerId || ws._meta?.peerId);
    if (fromId) {
      this.bindPeer(ws, fromId, msg.fromName || msg.name || ws._meta?.name || '');
    }

    if (msg.type === 'register' || msg.type === 'heartbeat') {
      if (fromId) {
        db.updatePresence(fromId, true, msg.fromName || msg.name || ws._meta?.name || '');
      }
      this.sendJson(ws, {
        type: 'pong',
        ts: Date.now(),
        presence: db.getPresenceMap()
      });
      return;
    }

    if (msg.type === 'chat' || msg.type === 'message') {
      const toId = normPeerId(msg.to);
      const groupId = String(msg.groupId || '').trim();
      const saved = db.saveMessage({
        ...msg,
        from: fromId,
        to: toId,
        groupId,
        status: 'sent',
        timestamp: msg.timestamp || Date.now()
      });

      const outgoing = {
        ...msg,
        type: 'chat',
        id: saved.id,
        clientMsgId: saved.clientMsgId,
        from: saved.from,
        fromName: saved.fromName,
        to: saved.to,
        groupId: saved.groupId,
        kind: saved.kind,
        text: saved.text,
        mediaUrl: saved.mediaUrl,
        mediaName: saved.mediaName,
        mediaType: saved.mediaType,
        mediaSize: saved.mediaSize,
        durationSec: saved.durationSec,
        replyTo: saved.replyTo,
        status: 'sent',
        timestamp: saved.timestamp
      };

      if (groupId) {
        const grp = db.state.groups[groupId];
        if (grp && Array.isArray(grp.members) && grp.members.length) {
          for (const memberId of grp.members) {
            this.sendToPeer(memberId, outgoing, ws);
          }
        } else {
          this.broadcastAll(outgoing, ws);
        }
      } else if (toId) {
        this.sendToPeer(toId, outgoing, ws);
        // Also mirror to other tabs/devices of sender
        this.sendToPeer(fromId, outgoing, ws);
      } else {
        this.broadcastAll(outgoing, ws);
      }

      this.sendJson(ws, {
        type: 'ack',
        msgId: saved.id,
        clientMsgId: saved.clientMsgId,
        status: 'sent',
        timestamp: saved.timestamp
      });
      return;
    }

    if (msg.type === 'receipt' || msg.type === 'status') {
      const targetMsgId = msg.msgId || msg.id;
      const status = msg.status || 'delivered';
      const updated = db.updateMessageStatus(targetMsgId, status);
      const recipientId = normPeerId(msg.to || updated?.from);
      const payload = {
        type: 'receipt',
        msgId: targetMsgId,
        status,
        by: fromId,
        ts: Date.now()
      };
      if (recipientId) {
        this.sendToPeer(recipientId, payload, ws);
      } else {
        this.broadcastAll(payload, ws);
      }
      return;
    }

    if (msg.type === 'edit_delete') {
      const updated = db.editOrDeleteMessage(msg);
      const payload = {
        ...msg,
        type: 'edit_delete',
        updated,
        ts: Date.now()
      };
      if (msg.groupId) {
        this.broadcastAll(payload, ws);
      } else if (msg.to) {
        this.sendToPeer(normPeerId(msg.to), payload, ws);
        this.sendToPeer(fromId, payload, ws);
      } else {
        this.broadcastAll(payload, ws);
      }
      return;
    }

    if (msg.type === 'typing') {
      const payload = {
        type: 'typing',
        from: fromId,
        fromName: msg.fromName || ws._meta?.name || fromId,
        to: normPeerId(msg.to),
        groupId: String(msg.groupId || ''),
        isTyping: Boolean(msg.isTyping),
        ts: Date.now()
      };
      if (payload.to) {
        this.sendToPeer(payload.to, payload, ws);
      } else {
        this.broadcastAll(payload, ws);
      }
      return;
    }

    if (msg.type === 'group_sync') {
      if (msg.group && msg.group.id) {
        const savedGrp = db.upsertGroup(msg.group);
        const payload = { type: 'group_sync', group: savedGrp, ts: Date.now() };
        for (const memberId of savedGrp.members || []) {
          this.sendToPeer(memberId, payload, ws);
        }
      }
      return;
    }

    // WebRTC signaling (call_invite, call_answer, call_ice, call_end, call_reject, group_call_state)
    if (msg.type && msg.type.startsWith('call_') || msg.type === 'group_call_state') {
      const targetId = normPeerId(msg.to || msg.targetPeerId);
      const payload = {
        ...msg,
        from: fromId,
        to: targetId,
        ts: Date.now()
      };
      if (targetId) {
        this.sendToPeer(targetId, payload, ws);
      } else if (msg.groupId) {
        this.broadcastAll(payload, ws);
      }
    }
  }
}

const wsHub = new WsHub();
module.exports = { wsHub, normPeerId };
