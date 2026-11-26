(() => {
  const STORAGE_KEY = 'sanad_v9_state';
  const LEGACY_KEYS = ['sanad897_state', 'sanad896_state', 'sanad895_state', 'sanad891_state', 'sanad88_state'];

  function cleanId(raw) {
    if (!raw) return '';
    const s = String(raw).trim();
    if (!s) return '';
    if (s.startsWith('+')) {
      const digits = s.slice(1).replace(/[^0-9]/g, '');
      return digits ? `+${digits}` : '';
    }
    const digits = s.replace(/[^0-9]/g, '');
    if (digits.length >= 6) return `+${digits}`;
    return s.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
  }

  function computeBackoffMs(attempt = 1) {
    const safeAttempt = Math.max(1, Number(attempt) || 1);
    const delay = Math.min(15000, 600 * Math.pow(1.65, safeAttempt - 1));
    return Math.round(delay + Math.floor(Math.random() * 250));
  }

  function defaultState() {
    return {
      version: '9.0.0',
      activePane: 'chats',
      connectionState: 'connecting', // connected | connecting | reconnecting | offline
      lastSyncAt: 0,
      lastServerSyncCursor: 0,
      activeAccountId: '+967770000001',
      accounts: [
        {
          id: '+967770000001',
          name: 'حساب سند الأساسي',
          role: 'مدير النظام والدعم',
          verified: true
        }
      ],
      selectedPeerId: '+967770000002',
      selectedGroupId: 'grp-support-main',
      contacts: [
        { id: '+967770000002', name: 'عبدالله عسيلو', role: 'شريك تقني', blocked: false, favorite: true },
        { id: '+967770000003', name: 'دعم عملاء سند', role: 'خدمة العملاء', blocked: false, favorite: true }
      ],
      groups: [
        {
          id: 'grp-support-main',
          name: 'مجموعة سند وخدمة العملاء',
          description: 'متابعة التحديثات وطلبات العملاء والمكالمات الجماعية',
          members: ['+967770000001', '+967770000002', '+967770000003'],
          admins: ['+967770000001']
        }
      ],
      messages: [
        {
          id: 'welcome-msg-1',
          clientMsgId: 'welcome-msg-1',
          from: '+967770000003',
          fromName: 'دعم عملاء سند',
          to: '+967770000001',
          groupId: '',
          channel: 'direct',
          kind: 'text',
          text: 'مرحباً بك في سند AI الإصدار 9.0.0 — المنظومة الموحدة للدردشة والمجموعات والمكالمات وخدمة العملاء الذكية.',
          status: 'read',
          timestamp: Date.now() - 60000
        }
      ],
      outbox: [],
      presence: {},
      unreadByPane: {
        chats: 0,
        groups: 0,
        accounts: 0,
        contacts: 0,
        calls: 0,
        ai: 0
      },
      aiHistory: [
        {
          role: 'assistant',
          text: 'أهلاً بك في مساعد سند AI لخدمة العملاء. يمكنك طلب تلخيص محادثة، تصنيف شكوى أو طلب، أو صياغة رد احترافي.',
          ts: Date.now()
        }
      ]
    };
  }

  function loadInitialState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return mergeWithDefault(parsed);
      }
      for (const oldKey of LEGACY_KEYS) {
        const oldRaw = localStorage.getItem(oldKey);
        if (oldRaw) {
          const parsed = JSON.parse(oldRaw);
          const migrated = mergeWithDefault(parsed);
          saveState(migrated);
          return migrated;
        }
      }
    } catch (_) {}
    const fresh = defaultState();
    saveState(fresh);
    return fresh;
  }

  function mergeWithDefault(parsed) {
    const def = defaultState();
    const merged = {
      ...def,
      ...(parsed || {}),
      version: '9.0.0',
      accounts: Array.isArray(parsed?.accounts) && parsed.accounts.length ? parsed.accounts : def.accounts,
      contacts: Array.isArray(parsed?.contacts) && parsed.contacts.length ? parsed.contacts : def.contacts,
      groups: Array.isArray(parsed?.groups) && parsed.groups.length ? parsed.groups : def.groups,
      messages: Array.isArray(parsed?.messages) ? parsed.messages : def.messages,
      outbox: Array.isArray(parsed?.outbox) ? parsed.outbox : [],
      presence: parsed?.presence && typeof parsed.presence === 'object' ? parsed.presence : {},
      unreadByPane: { ...def.unreadByPane, ...(parsed?.unreadByPane || {}) },
      aiHistory: Array.isArray(parsed?.aiHistory) && parsed.aiHistory.length ? parsed.aiHistory : def.aiHistory
    };
    merged.activeAccountId = cleanId(merged.activeAccountId) || def.activeAccountId;
    if (!merged.accounts.some((a) => cleanId(a.id) === merged.activeAccountId)) {
      merged.accounts.unshift({
        id: merged.activeAccountId,
        name: `حساب ${merged.activeAccountId}`,
        role: 'مستخدم نشط',
        verified: true
      });
    }
    return merged;
  }

  let state = loadInitialState();
  const listeners = new Set();

  function saveState(next = state) {
    state = next;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {}
  }

  function getState() {
    return state;
  }

  function setState(updater, reason = 'update') {
    const next = typeof updater === 'function' ? updater(state) : { ...state, ...updater };
    saveState(next);
    for (const fn of listeners) {
      try { fn(state, reason); } catch (_) {}
    }
    return state;
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function getActiveAccount() {
    const id = cleanId(state.activeAccountId);
    return state.accounts.find((a) => cleanId(a.id) === id) || state.accounts[0];
  }

  function getPresenceStatus(peerId) {
    const clean = cleanId(peerId);
    const p = state.presence?.[clean];
    if (!p) return { online: false, label: 'غير متصل' };
    if (p.online) return { online: true, label: 'متصل الآن' };
    if (p.lastSeen) {
      const dt = new Date(p.lastSeen);
      return {
        online: false,
        label: `آخر ظهور ${dt.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`
      };
    }
    return { online: false, label: 'غير متصل' };
  }

  window.SanadState = {
    cleanId,
    computeBackoffMs,
    getState,
    setState,
    subscribe,
    getActiveAccount,
    getPresenceStatus
  };
})();
