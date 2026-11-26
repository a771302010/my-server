// sanad-server-v8.9.6.js
const express = require('express');
const http = require('http');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;
const APP_VERSION = '8.9.6';

const MAX_EVENT_LOG_DEFAULT = 2500;
const MAX_PAYLOAD_BYTES = 12 * 1024 * 1024;
const MAX_CHAT_TEXT_LEN = 8000;
const MAX_ID_LEN = 64;
const RESERVED_IDS = new Set(['00000000', '11111111', '88888888', '99999999']);

const eventSeqLog = [];
let eventSeqCounter = 0;

function computeBackoffMs(attempt, baseMs = 350, capMs = 15000, jitterRatio = 0.25) {
  const exp = Math.min(capMs, baseMs * Math.pow(2, Math.max(0, attempt)));
  const jitter = exp * jitterRatio * (Math.random() * 2 - 1);
  return Math.max(100, Math.round(exp + jitter));
}

function computeAdaptiveStreamLimit(activeSessionsCount = 0) {
  const sessions = Math.max(0, Number(activeSessionsCount) || 0);
  if (sessions > 200) return 500;
  if (sessions > 50) return 1200;
  return MAX_EVENT_LOG_DEFAULT;
}

function normIdServer(val) {
  const s = String(val ?? '')
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .trim()
    .toLowerCase();
  return s.slice(0, MAX_ID_LEN);
}

function appendEvent(type, payload = {}) {
  const seq = ++eventSeqCounter;
  const entry = {
    seq,
    type,
    ts: Date.now(),
    payload
  };
  eventSeqLog.push(entry);
  const limit = computeAdaptiveStreamLimit(wss.clients ? wss.clients.size : 0);
  while (eventSeqLog.length > limit) {
    eventSeqLog.shift();
  }
  return entry;
}

function broadcastEvent(entry) {
  const raw = JSON.stringify({ kind: 'event', ...entry });
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      try {
        client.send(raw);
      } catch (_) {}
    }
  }
}

app.use(express.json({ limit: MAX_PAYLOAD_BYTES }));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Sanad-Version', APP_VERSION);
  next();
});

app.get('/healthz', (req, res) => {
  res.json({
    ok: true,
    version: APP_VERSION,
    uptimeSec: Math.floor(process.uptime()),
    seq: eventSeqCounter,
    bufferedEvents: eventSeqLog.length
  });
});

app.get('/api/sync', (req, res) => {
  const since = Math.max(0, Number(req.query.since || 0) || 0);
  const events = eventSeqLog.filter((item) => item.seq > since);
  res.json({
    ok: true,
    version: APP_VERSION,
    seq: eventSeqCounter,
    events
  });
});

app.post('/api/events', (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const type = String(body.type || 'message').slice(0, 64);
  const payload = body.payload && typeof body.payload === 'object' ? { ...body.payload } : {};

  if (typeof payload.text === 'string') {
    payload.text = payload.text.slice(0, MAX_CHAT_TEXT_LEN);
  }
  if (payload.from) payload.from = normIdServer(payload.from);
  if (payload.to) payload.to = normIdServer(payload.to);

  const entry = appendEvent(type, payload);
  broadcastEvent(entry);
  res.json({ ok: true, seq: entry.seq, event: entry });
});

app.get('/api/push/config', (req, res) => {
  res.json({
    ok: true,
    enabled: false,
    publicKey: null
  });
});

app.get('/manifest.json', (req, res) => {
  res.type('application/manifest+json').send(
    JSON.stringify({
      name: `سند v${APP_VERSION}`,
      short_name: 'سند',
      start_url: '/',
      display: 'standalone',
      background_color: '#0b141a',
      theme_color: '#075e54',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
      ]
    })
  );
});

function svgIconBuffer(size) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 128 128">
    <rect width="128" height="128" rx="28" fill="#075e54"/>
    <circle cx="64" cy="64" r="38" fill="#128c7e"/>
    <text x="64" y="76" font-size="44" text-anchor="middle" fill="#ffffff" font-family="sans-serif">س</text>
  </svg>`;
  return Buffer.from(svg);
}

app.get('/icon-192.png', (req, res) => {
  res.type('image/svg+xml').send(svgIconBuffer(192));
});

app.get('/icon-512.png', (req, res) => {
  res.type('image/svg+xml').send(svgIconBuffer(512));
});

app.get('/sw.js', (req, res) => {
  res.type('application/javascript').send(`
const CACHE_NAME = 'sanad-shell-v${APP_VERSION}';
const APP_SHELL = ['/', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/') || url.pathname === '/healthz') return;
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

self.addEventListener('push', (event) => {
  let data = { title: 'سند', body: 'رسالة جديدة' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (_) {}
  event.waitUntil(
    self.registration.showNotification(data.title || 'سند', {
      body: data.body || 'رسالة جديدة',
      icon: '/icon-192.png',
      badge: '/icon-192.png'
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      if (list.length > 0) return list[0].focus();
      return self.clients.openWindow('/');
    })
  );
});
`);
});

app.get('/', (req, res) => {
  res.type('html').send(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>سند v${APP_VERSION}</title>
  <link rel="manifest" href="/manifest.json" />
  <meta name="theme-color" content="#075e54" />
  <style>
    :root {
      --bg: #0b141a;
      --panel: #111b21;
      --panel-2: #202c33;
      --accent: #00a884;
      --danger: #ef4444;
      --text: #e9edef;
      --muted: #8696a0;
      --border: #2a3942;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: system-ui, -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
    }
    header {
      background: var(--panel);
      border-bottom: 1px solid var(--border);
      padding: 12px 16px;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
      justify-content: space-between;
    }
    .brand { font-weight: 700; font-size: 16px; }
    .badge {
      font-size: 12px;
      background: var(--panel-2);
      padding: 4px 10px;
      border-radius: 999px;
      color: var(--accent);
    }
    .tabs {
      display: flex;
      gap: 8px;
      padding: 10px 12px 0;
      max-width: 1200px;
      margin: 0 auto;
      flex-wrap: wrap;
    }
    .tab-btn.active {
      background: var(--accent);
      color: #06211a;
      font-weight: 700;
      border-color: transparent;
    }
    .layout {
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 12px;
      padding: 12px;
      max-width: 1200px;
      margin: 0 auto;
    }
    @media (max-width: 820px) {
      .layout { grid-template-columns: 1fr; }
    }
    .card {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 12px;
      margin-bottom: 12px;
    }
    .card h3 {
      margin: 0 0 10px;
      font-size: 14px;
      color: var(--text);
    }
    .row {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
      align-items: center;
    }
    input {
      flex: 1;
      background: var(--panel-2);
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 8px 10px;
      font-size: 13px;
    }
    button {
      background: var(--panel-2);
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 8px 11px;
      font-size: 12px;
      cursor: pointer;
    }
    button.primary {
      background: var(--accent);
      color: #06211a;
      font-weight: 700;
      border-color: transparent;
    }
    button.danger {
      background: rgba(239, 68, 68, 0.14);
      color: #fca5a5;
      border-color: rgba(239, 68, 68, 0.35);
    }
    .list-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 8px;
      border-radius: 8px;
      background: var(--panel-2);
      margin-bottom: 6px;
      font-size: 13px;
    }
    .list-item.active-acct {
      outline: 1px solid var(--accent);
    }
    .meta { color: var(--muted); font-size: 11px; }
    .chat-box {
      height: 340px;
      overflow-y: auto;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 10px;
      margin-bottom: 10px;
    }
    .msg {
      background: var(--panel-2);
      padding: 8px 10px;
      border-radius: 10px;
      margin-bottom: 8px;
      font-size: 13px;
    }
    .msg.mine {
      background: #005c4b;
    }
    .toast {
      font-size: 12px;
      color: #a7f3d0;
      min-height: 18px;
    }
    .hidden { display: none; }
  </style>
</head>
<body>
  <header>
    <div class="brand">تطبيق سند -- v${APP_VERSION}</div>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
      <span class="badge" id="activeAcctBadge">الحساب: ---</span>
      <span class="badge" id="connBadge">جاري الاتصال...</span>
    </div>
  </header>

  <div class="tabs" id="mainTabs">
    <button class="tab-btn active" data-tab="chat">المحادثات</button>
    <button class="tab-btn" data-tab="codes">الأكواد والحسابات</button>
    <button class="tab-btn" data-tab="contacts">جهات الاتصال</button>
  </div>

  <div class="layout" id="mainLayout">
    <div id="sideCol">
      <div class="card" id="codesCard">
        <h3>أكوادك وحساباتك (توليد آلي + مسح)</h3>
        <div class="row">
          <button class="primary" id="btnGenCode" style="width:100%;">توليد كود جديد تلقائياً</button>
        </div>
        <div id="acctsList"></div>
      </div>

      <div class="card" id="contactsCard">
        <h3>جهات الاتصال (إضافة + مسح)</h3>
        <div class="row">
          <input id="contactNameInput" placeholder="الاسم" />
          <input id="contactIdInput" placeholder="الكود / المعرّف" />
        </div>
        <div class="row">
          <button class="primary" id="btnAddContact" style="width:100%;">حفظ الجهة</button>
        </div>
        <div id="contactsList"></div>
      </div>
    </div>

    <div id="chatCol">
      <div class="card" id="chatCard">
        <h3>المحادثة مع: <span id="peerTitle">خدمة العملاء</span></h3>
        <div class="row">
          <input id="peerInput" placeholder="رقم أو كود الطرف الآخر" />
          <button id="btnUsePeer">تحديد</button>
          <button class="danger" id="btnClearThread">مسح المحادثة</button>
        </div>
        <div class="chat-box" id="chatBox"></div>
        <div class="row" style="margin-bottom:0;">
          <input id="msgInput" placeholder="اكتب رسالتك هنا..." />
          <button class="primary" id="btnSendMsg">إرسال</button>
        </div>
        <div class="toast" id="statusToast"></div>
      </div>
    </div>
  </div>

  <script>
    const VERSION_TAG = 'sanad896';
    const DEFAULT_PEER = { id: '10000001', name: 'خدمة العملاء' };
    const RESERVED = new Set(['00000000', '11111111', '88888888', '99999999']);

    const KEYS = {
      myAccts: VERSION_TAG + '_my_accts',
      activeAcct: VERSION_TAG + '_active_acct',
      contacts: VERSION_TAG + '_contacts',
      threads: VERSION_TAG + '_acct_threads',
      lastSeq: VERSION_TAG + '_last_seq'
    };

    function cleanIdValue(val) {
      return String(val ?? '')
        .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
        .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
        .replace(/\s+/g, '')
        .trim()
        .slice(0, 64);
    }

    function normalizeStr(val) {
      return cleanIdValue(val).toLowerCase();
    }

    function calcAdaptiveAudioBitrate(rttMs = 120, packetLoss = 0) {
      const rtt = Math.max(0, Number(rttMs) || 0);
      const loss = Math.min(1, Math.max(0, Number(packetLoss) || 0));
      if (loss > 0.08 || rtt > 500) return 24000;
      if (loss > 0.03 || rtt > 250) return 48000;
      return 96000;
    }

    function computeTargetCompressionLength(textLen = 0) {
      const len = Math.max(0, Number(textLen) || 0);
      if (len < 120) return len;
      return Math.min(len, Math.max(120, Math.round(len * 0.7)));
    }

    function calcAdaptivePollIntervalMs(hasPending = false, rttMs = 120) {
      if (hasPending) return 1200;
      const rtt = Math.max(0, Number(rttMs) || 0);
      if (rtt > 500) return 6000;
      if (rtt > 250) return 4000;
      return 2500;
    }

    function showToast(msg) {
      const el = document.getElementById('statusToast');
      if (!el) return;
      el.textContent = msg;
      clearTimeout(showToast._t);
      showToast._t = setTimeout(() => { el.textContent = ''; }, 3200);
    }

    function loadJson(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (_) {
        return fallback;
      }
    }

    function saveJson(key, val) {
      try {
        localStorage.setItem(key, JSON.stringify(val));
      } catch (_) {}
    }

    let myAccts = loadJson(KEYS.myAccts, []);
    let activeAcct = cleanIdValue(loadJson(KEYS.activeAcct, ''));
    let contacts = loadJson(KEYS.contacts, []);
    let acctThreads = loadJson(KEYS.threads, {});
    let lastSeq = Number(loadJson(KEYS.lastSeq, 0) || 0);
    let currentPeerId = DEFAULT_PEER.id;
    let activeTab = 'chat';

    function make8DigitId(existingSet = new Set()) {
      const used = new Set([...existingSet].map(cleanIdValue));
      for (let i = 0; i < 200; i++) {
        const candidate = String(Math.floor(10000000 + Math.random() * 90000000));
        if (!RESERVED.has(candidate) && !used.has(candidate)) {
          return candidate;
        }
      }
      return String(Date.now()).slice(-8);
    }

    function ensureInitialState() {
      myAccts = Array.from(new Set((myAccts || []).map(cleanIdValue).filter((x) => x && !RESERVED.has(x))));
      if (myAccts.length === 0) {
        myAccts.push(make8DigitId());
      }
      if (!activeAcct || !myAccts.includes(activeAcct)) {
        activeAcct = myAccts[0];
      }

      contacts = (contacts || [])
        .map((c) => ({
          id: cleanIdValue(c && c.id),
          name: String((c && c.name) || '').trim()
        }))
        .filter((c) => c.id && !RESERVED.has(c.id));

      if (!contacts.some((c) => normalizeStr(c.id) === normalizeStr(DEFAULT_PEER.id))) {
        contacts.unshift({ ...DEFAULT_PEER });
      }
    }

    function persistAll() {
      saveJson(KEYS.myAccts, myAccts);
      saveJson(KEYS.activeAcct, activeAcct);
      saveJson(KEYS.contacts, contacts);
      saveJson(KEYS.threads, acctThreads);
      saveJson(KEYS.lastSeq, lastSeq);
    }

    function getCurrentThreadList() {
      const acctKey = normalizeStr(activeAcct) || 'default';
      const peerKey = normalizeStr(currentPeerId) || normalizeStr(DEFAULT_PEER.id);
      if (!acctThreads[acctKey]) acctThreads[acctKey] = {};
      if (!Array.isArray(acctThreads[acctKey][peerKey])) {
        acctThreads[acctKey][peerKey] = [
          {
            id: 'welcome_' + acctKey + '_' + peerKey,
            from: DEFAULT_PEER.id,
            text: 'أهلاً بك في سند -- الحساب النشط: ' + activeAcct,
            ts: Date.now(),
            mine: false
          }
        ];
      }
      return acctThreads[acctKey][peerKey];
    }

    function generateAndActivateCode() {
      const newCode = make8DigitId(myAccts);
      myAccts.push(newCode);
      activeAcct = newCode;
      persistAll();
      renderAll();
      showToast('تم توليد الكود ' + newCode + ' وتفعيله كحساب نشط.');
    }

    function deleteAccountCode(code) {
      const target = cleanIdValue(code);
      if (myAccts.length <= 1) {
        showToast('لا يمكن مسح آخر كود متبقي في التطبيق.');
        return;
      }
      myAccts = myAccts.filter((c) => cleanIdValue(c) !== target);
      delete acctThreads[normalizeStr(target)];
      if (cleanIdValue(activeAcct) === target) {
        activeAcct = myAccts[0];
      }
      persistAll();
      renderAll();
      showToast('تم مسح الكود ' + target + '.');
    }

    function deleteContact(contactId) {
      const target = cleanIdValue(contactId);
      if (normalizeStr(target) === normalizeStr(DEFAULT_PEER.id)) {
        showToast('جهة خدمة العملاء الأساسية محفوظة ولا تُحذف.');
        return;
      }
      contacts = contacts.filter((c) => normalizeStr(c.id) !== normalizeStr(target));
      const acctKey = normalizeStr(activeAcct);
      if (acctThreads[acctKey]) {
        delete acctThreads[acctKey][normalizeStr(target)];
      }
      if (normalizeStr(currentPeerId) === normalizeStr(target)) {
        currentPeerId = DEFAULT_PEER.id;
      }
      persistAll();
      renderAll();
      showToast('تم مسح الجهة ومحادثتها.');
    }

    function addOrUpdateContact() {
      const nameInput = document.getElementById('contactNameInput');
      const idInput = document.getElementById('contactIdInput');
      const id = cleanIdValue(idInput.value);
      const name = String(nameInput.value || '').trim() || id;
      if (!id || RESERVED.has(id)) {
        showToast('أدخل كوداً أو معرّفاً صحيحاً غير محجوز.');
        return;
      }
      const idx = contacts.findIndex((c) => normalizeStr(c.id) === normalizeStr(id));
      if (idx >= 0) {
        contacts[idx].name = name;
      } else {
        contacts.push({ id, name });
      }
      currentPeerId = id;
      nameInput.value = '';
      idInput.value = '';
      persistAll();
      renderAll();
      showToast('تم حفظ الجهة: ' + name);
    }

    function clearCurrentThread() {
      const acctKey = normalizeStr(activeAcct);
      const peerKey = normalizeStr(currentPeerId);
      if (acctThreads[acctKey]) {
        acctThreads[acctKey][peerKey] = [];
      }
      persistAll();
      renderChat();
      showToast('تم مسح المحادثة الحالية.');
    }

    async function sendMessage() {
      const input = document.getElementById('msgInput');
      const text = String(input.value || '').trim();
      if (!text) return;

      const list = getCurrentThreadList();
      const msg = {
        id: 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        from: activeAcct,
        to: currentPeerId,
        text,
        ts: Date.now(),
        mine: true
      };
      list.push(msg);
      input.value = '';
      persistAll();
      renderChat();

      try {
        const res = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'message',
            payload: msg
          })
        });
        const data = await res.json();
        if (data && data.seq) {
          lastSeq = Math.max(lastSeq, Number(data.seq));
          persistAll();
        }
      } catch (_) {
        showToast('تم حفظ الرسالة محلياً وستُزامن عند توفر الاتصال.');
      }
    }

    function applyTabVisibility() {
      document.querySelectorAll('.tab-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.tab === activeTab);
      });
      const codesCard = document.getElementById('codesCard');
      const contactsCard = document.getElementById('contactsCard');
      const chatCard = document.getElementById('chatCard');

      if (window.innerWidth <= 820) {
        codesCard.classList.toggle('hidden', activeTab !== 'codes');
        contactsCard.classList.toggle('hidden', activeTab !== 'contacts');
        chatCard.classList.toggle('hidden', activeTab !== 'chat');
      } else {
        codesCard.classList.remove('hidden');
        contactsCard.classList.remove('hidden');
        chatCard.classList.remove('hidden');
      }
    }

    function renderAccts() {
      const wrap = document.getElementById('acctsList');
      document.getElementById('activeAcctBadge').textContent = 'الحساب: ' + activeAcct;
      wrap.innerHTML = '';
      myAccts.forEach((code) => {
        const isCurrent = cleanIdValue(code) === cleanIdValue(activeAcct);
        const row = document.createElement('div');
        row.className = 'list-item' + (isCurrent ? ' active-acct' : '');

        const left = document.createElement('div');
        left.innerHTML = '<div>' + code + '</div><div class="meta">' + (isCurrent ? 'نشط الآن' : 'محفوظ') + '</div>';

        const actions = document.createElement('div');
        actions.style.display = 'flex';
        actions.style.gap = '6px';

        if (!isCurrent) {
          const btnUse = document.createElement('button');
          btnUse.textContent = 'تفعيل';
          btnUse.onclick = () => {
            activeAcct = code;
            persistAll();
            renderAll();
            showToast('تم التبديل إلى الحساب ' + code);
          };
          actions.appendChild(btnUse);
        }

        const btnDel = document.createElement('button');
        btnDel.className = 'danger';
        btnDel.textContent = 'مسح';
        btnDel.onclick = () => deleteAccountCode(code);
        actions.appendChild(btnDel);

        row.appendChild(left);
        row.appendChild(actions);
        wrap.appendChild(row);
      });
    }

    function renderContacts() {
      const wrap = document.getElementById('contactsList');
      wrap.innerHTML = '';
      contacts.forEach((c) => {
        const row = document.createElement('div');
        row.className = 'list-item';

        const left = document.createElement('div');
        left.style.cursor = 'pointer';
        left.innerHTML = '<div>' + c.name + '</div><div class="meta">' + c.id + '</div>';
        left.onclick = () => {
          currentPeerId = c.id;
          document.getElementById('peerInput').value = c.id;
          activeTab = 'chat';
          renderAll();
        };

        const btnDel = document.createElement('button');
        btnDel.className = 'danger';
        btnDel.textContent = 'مسح';
        btnDel.onclick = (e) => {
          e.stopPropagation();
          deleteContact(c.id);
        };

        row.appendChild(left);
        row.appendChild(btnDel);
        wrap.appendChild(row);
      });
    }

    function renderChat() {
      const found = contacts.find((c) => normalizeStr(c.id) === normalizeStr(currentPeerId));
      document.getElementById('peerTitle').textContent = found ? (found.name + ' (' + currentPeerId + ')') : currentPeerId;
      document.getElementById('peerInput').value = currentPeerId;

      const box = document.getElementById('chatBox');
      const list = getCurrentThreadList();
      box.innerHTML = '';
      if (!list.length) {
        box.innerHTML = '<div class="meta">لا توجد رسائل في هذه المحادثة.</div>';
        return;
      }
      list.forEach((m) => {
        const el = document.createElement('div');
        el.className = 'msg' + (m.mine ? ' mine' : '');
        el.innerHTML = '<div>' + escapeHtml(m.text) + '</div><div class="meta">' + (m.mine ? 'أنت (' + m.from + ')' : m.from) + '</div>';
        box.appendChild(el);
      });
      box.scrollTop = box.scrollHeight;
    }

    function escapeHtml(s) {
      return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }

    function renderAll() {
      renderAccts();
      renderContacts();
      renderChat();
      applyTabVisibility();
    }

    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.onclick = () => {
        activeTab = btn.dataset.tab;
        applyTabVisibility();
      };
    });
    window.addEventListener('resize', applyTabVisibility);

    document.getElementById('btnGenCode').onclick = generateAndActivateCode;
    document.getElementById('btnAddContact').onclick = addOrUpdateContact;
    document.getElementById('btnSendMsg').onclick = sendMessage;
    document.getElementById('btnClearThread').onclick = clearCurrentThread;
    document.getElementById('msgInput').onkeydown = (e) => {
      if (e.key === 'Enter') sendMessage();
    };
    document.getElementById('btnUsePeer').onclick = () => {
      const v = cleanIdValue(document.getElementById('peerInput').value);
      if (!v) return;
      currentPeerId = v;
      renderChat();
    };

    function initRealtime() {
      const badge = document.getElementById('connBadge');
      try {
        const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(proto + '//' + location.host);
        ws.onopen = () => {
          badge.textContent = 'متصل مباشر';
        };
        ws.onclose = () => {
          badge.textContent = 'مزامنة دورية';
          setTimeout(initRealtime, 2500);
        };
        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data);
            if (msg && msg.seq) {
              lastSeq = Math.max(lastSeq, Number(msg.seq));
              saveJson(KEYS.lastSeq, lastSeq);
            }
            if (msg && msg.type === 'message' && msg.payload) {
              const p = msg.payload;
              if (cleanIdValue(p.from) !== cleanIdValue(activeAcct) && cleanIdValue(p.to) === cleanIdValue(activeAcct)) {
                const peerKey = normalizeStr(p.from);
                const acctKey = normalizeStr(activeAcct);
                if (!acctThreads[acctKey]) acctThreads[acctKey] = {};
                if (!Array.isArray(acctThreads[acctKey][peerKey])) acctThreads[acctKey][peerKey] = [];
                if (!acctThreads[acctKey][peerKey].some((x) => x.id === p.id)) {
                  acctThreads[acctKey][peerKey].push({ ...p, mine: false });
                  persistAll();
                  if (normalizeStr(currentPeerId) === peerKey) renderChat();
                }
              }
            }
          } catch (_) {}
        };
      } catch (_) {
        badge.textContent = 'وضع محلي';
      }
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    ensureInitialState();
    persistAll();
    renderAll();
    initRealtime();
  </script>
</body>
</html>`);
});

server.listen(PORT, () => {
  console.log(`Sanad server v${APP_VERSION} running on http://localhost:${PORT}`);
});
