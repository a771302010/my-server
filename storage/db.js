const fs = require('fs');
const path = require('path');
const { config } = require('../config/env');

const DB_FILE = path.join(config.dataDir, 'sanad-store.json');

function ensureDirs() {
  fs.mkdirSync(config.dataDir, { recursive: true });
  fs.mkdirSync(config.mediaDir, { recursive: true });
}

function defaultState() {
  return {
    users: {},
    messages: [],
    groups: {},
    presence: {},
    pushSubscriptions: [],
    updatedAt: Date.now()
  };
}

class SanadStore {
  constructor() {
    ensureDirs();
    this.state = defaultState();
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        this.state = {
          ...defaultState(),
          ...raw,
          users: raw.users || {},
          messages: Array.isArray(raw.messages) ? raw.messages : [],
          groups: raw.groups || {},
          presence: raw.presence || {},
          pushSubscriptions: Array.isArray(raw.pushSubscriptions) ? raw.pushSubscriptions : []
        };
      } else {
        this.persist();
      }
    } catch (err) {
      console.error('[SanadStore] load error:', err.message);
      this.state = defaultState();
      this.persist();
    }
  }

  persist() {
    try {
      ensureDirs();
      this.state.updatedAt = Date.now();
      const tmpFile = `${DB_FILE}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(this.state, null, 2), 'utf8');
      fs.renameSync(tmpFile, DB_FILE);
    } catch (err) {
      console.error('[SanadStore] persist error:', err.message);
    }
  }

  upsertUser(userObj) {
    if (!userObj || !userObj.id) return null;
    const existing = this.state.users[userObj.id] || {};
    const merged = {
      ...existing,
      ...userObj,
      id: userObj.id,
      updatedAt: Date.now()
    };
    this.state.users[userObj.id] = merged;
    this.persist();
    return merged;
  }

  updatePresence(peerId, online = true, name = '') {
    if (!peerId) return null;
    const prev = this.state.presence[peerId] || {};
    const next = {
      peerId,
      name: name || prev.name || this.state.users[peerId]?.name || peerId,
      online: Boolean(online),
      lastSeen: Date.now()
    };
    this.state.presence[peerId] = next;
    this.persist();
    return next;
  }

  getPresenceMap() {
    const now = Date.now();
    const out = {};
    for (const [id, entry] of Object.entries(this.state.presence)) {
      const isFresh = entry.online && (now - (entry.lastSeen || 0) <= config.presenceTtlMs);
      out[id] = {
        ...entry,
        online: isFresh
      };
    }
    return out;
  }

  saveMessage(msg) {
    if (!msg || !msg.id) return null;
    const idx = this.state.messages.findIndex((m) => m.id === msg.id);
    const normalized = {
      id: msg.id,
      clientMsgId: msg.clientMsgId || msg.id,
      from: msg.from || '',
      fromName: msg.fromName || '',
      to: msg.to || '',
      groupId: msg.groupId || '',
      channel: msg.channel || (msg.groupId ? 'group' : 'direct'),
      kind: msg.kind || 'text', // text | audio | image | file | system
      text: msg.text || '',
      mediaUrl: msg.mediaUrl || '',
      mediaName: msg.mediaName || '',
      mediaType: msg.mediaType || '',
      mediaSize: msg.mediaSize || 0,
      durationSec: msg.durationSec || 0,
      replyTo: msg.replyTo || null,
      status: msg.status || 'sent',
      editedAt: msg.editedAt || null,
      deletedForAll: Boolean(msg.deletedForAll),
      timestamp: Number(msg.timestamp || Date.now())
    };

    if (idx >= 0) {
      this.state.messages[idx] = {
        ...this.state.messages[idx],
        ...normalized,
        timestamp: this.state.messages[idx].timestamp
      };
    } else {
      this.state.messages.push(normalized);
      if (this.state.messages.length > 5000) {
        this.state.messages = this.state.messages.slice(-5000);
      }
    }
    this.persist();
    return normalized;
  }

  updateMessageStatus(msgId, status) {
    const idx = this.state.messages.findIndex((m) => m.id === msgId || m.clientMsgId === msgId);
    if (idx < 0) return null;
    const rank = { pending: 0, sent: 1, delivered: 2, read: 3 };
    const current = this.state.messages[idx].status || 'sent';
    if ((rank[status] ?? 0) >= (rank[current] ?? 0) || status === 'edited' || status === 'deleted') {
      this.state.messages[idx].status = status;
      this.persist();
    }
    return this.state.messages[idx];
  }

  editOrDeleteMessage(payload) {
    const targetId = payload.msgId || payload.id;
    const idx = this.state.messages.findIndex((m) => m.id === targetId || m.clientMsgId === targetId);
    if (idx < 0) return null;
    if (payload.action === 'delete') {
      this.state.messages[idx].deletedForAll = true;
      this.state.messages[idx].text = 'تم حذف هذه الرسالة';
      this.state.messages[idx].mediaUrl = '';
    } else if (payload.action === 'edit') {
      this.state.messages[idx].text = payload.text || this.state.messages[idx].text;
      this.state.messages[idx].editedAt = Date.now();
    }
    this.persist();
    return this.state.messages[idx];
  }

  upsertGroup(groupObj) {
    if (!groupObj || !groupObj.id) return null;
    const existing = this.state.groups[groupObj.id] || {};
    const members = Array.isArray(groupObj.members)
      ? Array.from(new Set(groupObj.members.filter(Boolean)))
      : (existing.members || []);
    const merged = {
      ...existing,
      ...groupObj,
      id: groupObj.id,
      name: groupObj.name || existing.name || 'مجموعة سند',
      description: groupObj.description ?? existing.description ?? '',
      members,
      admins: Array.isArray(groupObj.admins) ? groupObj.admins : (existing.admins || members.slice(0, 1)),
      updatedAt: Date.now()
    };
    this.state.groups[groupObj.id] = merged;
    this.persist();
    return merged;
  }

  queryMessages({ peerId = '', groupId = '', since = 0, limit = 200 } = {}) {
    const sinceNum = Number(since) || 0;
    return this.state.messages
      .filter((m) => {
        if (sinceNum && m.timestamp <= sinceNum) return false;
        if (groupId) return m.groupId === groupId;
        if (peerId) {
          return !m.groupId && (m.from === peerId || m.to === peerId);
        }
        return true;
      })
      .slice(-Math.min(Math.max(Number(limit) || 200, 1), 1000));
  }

  addPushSubscription(sub) {
    if (!sub || !sub.endpoint) return;
    const filtered = this.state.pushSubscriptions.filter((item) => item.endpoint !== sub.endpoint);
    filtered.push({ ...sub, updatedAt: Date.now() });
    this.state.pushSubscriptions = filtered.slice(-500);
    this.persist();
  }
}

const db = new SanadStore();
module.exports = { db };
