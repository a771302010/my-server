'use strict';

(function (global) {
  const STORAGE_KEY = 'sanad_sync_state_v1';
  const QUEUE_KEY = 'sanad_sync_queue_v1';
  const MAX_VIDEO_DURATION_SECONDS = 300;
  const MAX_VIDEO_BYTES = 120 * 1024 * 1024;

  function createDefaultState() {
    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      profile: {
        name: 'مستخدم سند',
        selfCode: '',
        autoCode8: '',
        phoneNumber: '',
        online: true,
        lastSeen: new Date().toISOString(),
      },
      contacts: [],
      chats: [],
      calls: [],
      settings: {
        soundEnabled: true,
        ringtoneEnabled: true,
        videoMaxSeconds: MAX_VIDEO_DURATION_SECONDS,
        theme: 'blue',
      },
    };
  }

  function safeParse(raw, fallback) {
    if (!raw || typeof raw !== 'string') return fallback;
    try {
      return JSON.parse(raw);
    } catch (_) {
      return fallback;
    }
  }

  function readStorage(key, fallback) {
    try {
      if (typeof global.localStorage !== 'undefined' && global.localStorage) {
        return safeParse(global.localStorage.getItem(key), fallback);
      }
    } catch (_) {}
    return fallback;
  }

  function writeStorage(key, value) {
    try {
      if (typeof global.localStorage !== 'undefined' && global.localStorage) {
        global.localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (_) {}
  }

  function generateCode8() {
    let code = '';
    for (let i = 0; i < 8; i += 1) {
      code += String(Math.floor(Math.random() * 10));
    }
    return code;
  }

  function loadState() {
    const def = createDefaultState();
    const saved = readStorage(STORAGE_KEY, {});
    return {
      ...def,
      ...saved,
      profile: { ...def.profile, ...(saved.profile || {}) },
      settings: { ...def.settings, ...(saved.settings || {}) },
      contacts: Array.isArray(saved.contacts) ? saved.contacts : [],
      chats: Array.isArray(saved.chats) ? saved.chats : [],
      calls: Array.isArray(saved.calls) ? saved.calls : [],
    };
  }

  function saveState(nextState) {
    const normalized = {
      ...nextState,
      updatedAt: new Date().toISOString(),
    };
    writeStorage(STORAGE_KEY, normalized);
    return normalized;
  }

  function enqueueAction(actionType, payload) {
    const queue = readStorage(QUEUE_KEY, []);
    const item = {
      id: 'act_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      type: String(actionType || 'sync'),
      payload: payload || {},
      createdAt: new Date().toISOString(),
      retries: 0,
    };
    queue.push(item);
    writeStorage(QUEUE_KEY, queue);
    return item;
  }

  function getPendingQueue() {
    return readStorage(QUEUE_KEY, []);
  }

  async function flushQueue(endpoint = '/api/sync') {
    const queue = getPendingQueue();
    if (!queue.length || typeof fetch !== 'function') {
      return { ok: true, flushed: 0, pending: queue.length };
    }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actions: queue, state: loadState() }),
      });

      if (!res.ok) {
        return { ok: false, flushed: 0, pending: queue.length, status: res.status };
      }

      const data = await res.json().catch(() => ({}));
      if (data && data.state && typeof data.state === 'object') {
        const merged = { ...loadState(), ...data.state, updatedAt: new Date().toISOString() };
        writeStorage(STORAGE_KEY, merged);
      }

      writeStorage(QUEUE_KEY, []);
      return { ok: true, flushed: queue.length, pending: 0, serverResponse: data };
    } catch (err) {
      return { ok: false, flushed: 0, pending: queue.length, error: err.message };
    }
  }

  function setSelfCode(code) {
    const state = loadState();
    state.profile.selfCode = String(code || '').trim();
    const saved = saveState(state);
    enqueueAction('setSelfCode', { selfCode: saved.profile.selfCode });
    flushQueue().catch(() => {});
    return saved;
  }

  function generateAndAdoptCode8() {
    const state = loadState();
    const code8 = generateCode8();
    state.profile.autoCode8 = code8;
    const saved = saveState(state);
    enqueueAction('adoptCode8', { autoCode8: code8 });
    flushQueue().catch(() => {});
    return { code8, state: saved };
  }

  function setPhoneNumber(phoneNumber) {
    const state = loadState();
    state.profile.phoneNumber = String(phoneNumber || '').trim();
    const saved = saveState(state);
    enqueueAction('setPhoneNumber', { phoneNumber: saved.profile.phoneNumber });
    flushQueue().catch(() => {});
    return saved;
  }

  function upsertContact(contact) {
    const state = loadState();
    const name = String((contact && contact.name) || '').trim();
    const identifier = String(
      (contact && (contact.identifier || contact.code || contact.phone || contact.number)) || ''
    ).trim();

    if (!identifier && !name) {
      return { ok: false, error: 'بيانات جهة الاتصال غير مكتملة', state };
    }

    const record = {
      id: (contact && contact.id) || 'cnt_' + Date.now(),
      name: name || identifier,
      identifier,
      updatedAt: new Date().toISOString(),
    };

    const idx = state.contacts.findIndex(
      (c) => (c.identifier && c.identifier === record.identifier) || c.id === record.id
    );
    if (idx >= 0) {
      state.contacts[idx] = { ...state.contacts[idx], ...record };
    } else {
      state.contacts.unshift(record);
    }

    const saved = saveState(state);
    enqueueAction('upsertContact', record);
    flushQueue().catch(() => {});
    return { ok: true, contact: record, state: saved };
  }

  function validateVideoAttachment(meta = {}) {
    const durationSec = Number(meta.durationSeconds || meta.duration || 0);
    const sizeBytes = Number(meta.sizeBytes || meta.size || 0);

    if (durationSec > MAX_VIDEO_DURATION_SECONDS) {
      return {
        ok: false,
        maxDurationSeconds: MAX_VIDEO_DURATION_SECONDS,
        error: 'الحد الأقصى للفيديو هو 5 دقائق (300 ثانية)',
      };
    }

    if (sizeBytes > MAX_VIDEO_BYTES) {
      return {
        ok: false,
        maxBytes: MAX_VIDEO_BYTES,
        error: 'حجم ملف الفيديو يتجاوز الحد المسموح',
      };
    }

    return { ok: true, maxDurationSeconds: MAX_VIDEO_DURATION_SECONDS };
  }

  const SanadSync = {
    MAX_VIDEO_DURATION_SECONDS,
    MAX_VIDEO_BYTES,
    loadState,
    saveState,
    generateCode8,
    setSelfCode,
    generateAndAdoptCode8,
    setPhoneNumber,
    upsertContact,
    enqueueAction,
    getPendingQueue,
    flushQueue,
    validateVideoAttachment,
  };

  global.SanadSync = SanadSync;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SanadSync;
  }
})(typeof window !== 'undefined' ? window : globalThis);
