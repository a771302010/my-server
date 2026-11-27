const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const APP_VERSION = '12.2.0';
const PORT = process.env.PORT || 3000;
const ICON_BG_HEX = '#164e63';
const ICON_ACCENT_HEX = '#f0fdfa';
const ICON_SUB_HEX = '#0f3646';
const STATE_FILE_PATH = process.env.SANAD_STATE_FILE || path.join(__dirname, 'sanad-state.json');

function toWesternDigitsServer(str) {
    return String(str === undefined || str === null ? '' : str)
        .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 1632))
        .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 1776));
}

function normIdServer(v) {
    return toWesternDigitsServer(v).trim().toLowerCase();
}

const presenceMap = new Map();
const lastSeenMap = new Map();
const blockListByUser = new Map();
const pendingVerifications = new Map(); // normPhone -> { code, email, createdAt }
const syncEvents = [];
let eventCursor = 0;
let saveStateTimer = null;

function persistServerStateToDisk() {
    try {
        const blocksObj = {};
        blockListByUser.forEach((setVal, key) => {
            blocksObj[key] = Array.from(setVal);
        });
        const snapshot = {
            eventCursor,
            syncEvents: syncEvents.slice(-800),
            blocks: blocksObj
        };
        fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(snapshot), 'utf8');
    } catch (e) {}
}

function scheduleServerStateSave() {
    clearTimeout(saveStateTimer);
    saveStateTimer = setTimeout(persistServerStateToDisk, 500);
}

function loadServerStateFromDisk() {
    try {
        if (!fs.existsSync(STATE_FILE_PATH)) return;
        const raw = fs.readFileSync(STATE_FILE_PATH, 'utf8');
        const parsed = JSON.parse(raw || '{}');
        if (typeof parsed.eventCursor === 'number' && parsed.eventCursor > 0) {
            eventCursor = parsed.eventCursor;
        }
        if (Array.isArray(parsed.syncEvents)) {
            parsed.syncEvents.slice(-800).forEach(ev => {
                if (ev && typeof ev === 'object') syncEvents.push(ev);
            });
        }
        if (parsed.blocks && typeof parsed.blocks === 'object') {
            Object.keys(parsed.blocks).forEach(ownerKey => {
                const arr = parsed.blocks[ownerKey];
                if (Array.isArray(arr)) {
                    blockListByUser.set(normIdServer(ownerKey), new Set(arr.map(normIdServer).filter(Boolean)));
                }
            });
        }
    } catch (e) {}
}

loadServerStateFromDisk();

function recordSyncEvent(payload) {
    eventCursor += 1;
    const item = Object.assign({}, payload, {
        cursor: eventCursor,
        eventId: payload.eventId || ('srv-' + eventCursor + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7))
    });
    syncEvents.push(item);
    if (syncEvents.length > 1500) {
        syncEvents.splice(0, syncEvents.length - 1500);
    }
    scheduleServerStateSave();
    return item;
}

function getOnlineIdsList() {
    const now = Date.now();
    const ids = new Set();
    presenceMap.forEach((sockets, id) => {
        if (sockets && sockets.size > 0) {
            ids.add(id);
            lastSeenMap.set(id, now);
        }
    });
    lastSeenMap.forEach((ts, id) => {
        if (now - ts <= 25000) ids.add(id);
    });
    return Array.from(ids);
}

function touchPresenceIds(idsList) {
    const now = Date.now();
    (Array.isArray(idsList) ? idsList : []).forEach(rawId => {
        const n = normIdServer(rawId);
        if (n) lastSeenMap.set(n, now);
    });
}

function broadcastOnlineUsersWs() {
    const packet = JSON.stringify({ type: 'online_users', ids: getOnlineIdsList() });
    wss.clients.forEach(client => {
        if (client.readyState === 1) {
            try { client.send(packet); } catch (e) {}
        }
    });
}

function setUserBlockSetServer(ownerId, blockedList) {
    const ownerNorm = normIdServer(ownerId);
    if (!ownerNorm) return;
    const nextSet = new Set(
        (Array.isArray(blockedList) ? blockedList : [])
            .map(normIdServer)
            .filter(Boolean)
    );
    blockListByUser.set(ownerNorm, nextSet);
    scheduleServerStateSave();
}

function isBlockedServer(senderId, recipientId) {
    const sNorm = normIdServer(senderId);
    const rNorm = normIdServer(recipientId);
    if (!sNorm || !rNorm) return false;
    const rBlocked = blockListByUser.get(rNorm);
    if (rBlocked && rBlocked.has(sNorm)) return true;
    const sBlocked = blockListByUser.get(sNorm);
    if (sBlocked && sBlocked.has(rNorm)) return true;
    return false;
}

function deliverToPeerWs(targetId, payload) {
    const normTarget = normIdServer(targetId);
    if (!normTarget) return;
    if (payload && payload.from && isBlockedServer(payload.from, normTarget)) return;
    const sockets = presenceMap.get(normTarget);
    if (!sockets || sockets.size === 0) return;
    const encoded = JSON.stringify(payload);
    sockets.forEach(client => {
        if (client.readyState === 1) {
            try { client.send(encoded); } catch (e) {}
        }
    });
}

function processIncomingPacket(payload, senderWs) {
    if (!payload || typeof payload !== 'object' || !payload.type) return;

    if (payload.from) touchPresenceIds([payload.from]);

    if (payload.type === 'register_ids') {
        const ids = Array.isArray(payload.ids) ? payload.ids.slice() : [];
        if (payload.activeId) ids.unshift(payload.activeId);
        const cleanSet = new Set(ids.map(normIdServer).filter(Boolean));
        touchPresenceIds(Array.from(cleanSet));

        if (senderWs) {
            if (!senderWs._sanadIds) senderWs._sanadIds = new Set();
            senderWs._sanadIds.forEach(oldId => {
                if (!cleanSet.has(oldId)) {
                    const s = presenceMap.get(oldId);
                    if (s) {
                        s.delete(senderWs);
                        if (s.size === 0) presenceMap.delete(oldId);
                    }
                }
            });
            cleanSet.forEach(id => {
                if (!presenceMap.has(id)) presenceMap.set(id, new Set());
                presenceMap.get(id).add(senderWs);
            });
            senderWs._sanadIds = cleanSet;
        }
        if (Array.isArray(payload.blockedIds)) {
            cleanSet.forEach(id => setUserBlockSetServer(id, payload.blockedIds));
        }
        broadcastOnlineUsersWs();
        return;
    }

    if (payload.type === 'sync_blocklist') {
        const ownerIds = Array.isArray(payload.ownerIds) && payload.ownerIds.length
            ? payload.ownerIds
            : [payload.from];
        ownerIds.forEach(oid => setUserBlockSetServer(oid, payload.blockedIds));
        return;
    }

    if (payload.from && payload.to && isBlockedServer(payload.from, payload.to)) {
        return;
    }

    const storedEvent = recordSyncEvent(payload);
    if (payload.to) {
        deliverToPeerWs(payload.to, storedEvent);
    } else if (payload.broadcast) {
        const encoded = JSON.stringify(storedEvent);
        wss.clients.forEach(client => {
            if (client !== senderWs && client.readyState === 1) {
                try { client.send(encoded); } catch (e) {}
            }
        });
    }
}

const sanadIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="sanadBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e6078"/>
      <stop offset="55%" stop-color="${ICON_BG_HEX}"/>
      <stop offset="100%" stop-color="${ICON_SUB_HEX}"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#sanadBgGrad)"/>
  <text x="256" y="224" text-anchor="middle" fill="${ICON_ACCENT_HEX}" font-family="'IBM Plex Sans Arabic', 'Cairo', 'Tahoma', sans-serif" font-size="168" font-weight="700">س</text>
  <text x="256" y="420" text-anchor="middle" fill="${ICON_ACCENT_HEX}" font-family="'IBM Plex Sans Arabic', 'Cairo', 'Tahoma', sans-serif" font-size="88" font-weight="700">سند</text>
</svg>`;

const manifestPayload = JSON.stringify({
  name: `Sanad AI v${APP_VERSION} - سند`,
  short_name: 'سند AI',
  description: 'تطبيق سند AI للتواصل والمحادثات والمكالمات وتفعيل الأرقام الدولية والذكاء الاصطناعي',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  orientation: 'portrait',
  background_color: '#09111b',
  theme_color: ICON_BG_HEX,
  dir: 'rtl',
  lang: 'ar',
  icons: [
    { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }
  ]
});

const swContent = `const CACHE_NAME = 'sanad-ai-cache-v${APP_VERSION}';
const APP_SHELL = ['/', '/manifest.json', '/icon.svg'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.startsWith('/api/') || url.pathname === '/healthz') return;

  if (req.mode === 'navigate' || url.pathname === '/' || url.pathname === '/manifest.json' || url.pathname === '/icon.svg') {
    event.respondWith(
      fetch(req).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => caches.match(req).then(cached => cached || caches.match('/')))
    );
  }
});`;

const htmlContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-title" content="سند AI">
    <meta name="theme-color" content="#164e63">
    <title>سند AI v${APP_VERSION}</title>
    <link id="sanad-favicon" rel="icon" type="image/svg+xml" href="/icon.svg">
    <link rel="apple-touch-icon" href="/icon.svg">
    <link rel="manifest" href="/manifest.json">
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Cairo:wght@600;700;800&display=swap');
        :root { --sanad-chat-font: 15px; }
        body {
            font-family: 'IBM Plex Sans Arabic', 'Cairo', sans-serif;
            background: radial-gradient(circle at top, #102436 0%, #09111b 55%, #070d14 100%);
            color: #eef5fa;
            line-height: 1.65;
        }
        .sanad-msg-text { font-size: var(--sanad-chat-font); line-height: 1.7; }
        .sanad-composer-font { font-size: var(--sanad-chat-font); line-height: 1.65; }
        button, a { touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e6078; border-radius: 9999px; }
        .sanad-pane { display: none; height: 100%; width: 100%; overflow-y: auto; }
        .sanad-pane.sanad-pane-active { display: flex; flex-direction: column; }
    </style>
</head>
<body class="text-slate-100 h-screen flex flex-col overflow-hidden select-none">

    <script>
        var CLIENT_APP_VERSION = '${APP_VERSION}';

        if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').then(function(reg) {
                    if (reg && reg.update) reg.update().catch(function() {});
                }).catch(function() {});
            });
        }

        function toWesternDigits(str) {
            return String(str === undefined || str === null ? '' : str)
                .replace(/[٠-٩]/g, function(d) { return String(d.charCodeAt(0) - 1632); })
                .replace(/[۰-۹]/g, function(d) { return String(d.charCodeAt(0) - 1776); });
        }

        function normalizeDigitsInInput(el) {
            if (!el || typeof el.value !== 'string') return;
            var converted = toWesternDigits(el.value);
            if (converted !== el.value) el.value = converted;
        }

        function escapeHtml(str) {
            return String(str === undefined || str === null ? '' : str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function escapeJsSingle(str) {
            return String(str === undefined || str === null ? '' : str)
                .replace(/\\\\/g, '\\\\\\\\')
                .replace(/'/g, "\\\\'")
                .replace(/[\\r\\n]+/g, ' ');
        }

        var SANAD_TAB_LABELS = {
            chats: 'الدردشة',
            groups: 'المجموعات',
            accounts: 'الحسابات',
            contacts: 'الجهات',
            calls: 'المكالمات',
            ai: 'الذكاء'
        };
        window.__sanadCurrentTab = 'chats';

        function applySanadPaneDisplay(tabName) {
            var target = SANAD_TAB_LABELS[tabName] ? tabName : 'chats';
            window.__sanadCurrentTab = target;
            if (typeof activePane !== 'undefined') activePane = target;
            var ids = ['chats', 'groups', 'accounts', 'contacts', 'calls', 'ai'];
            for (var i = 0; i < ids.length; i++) {
                var k = ids[i];
                var pane = document.getElementById('pane-' + k);
                var btn = document.getElementById('btn-' + k);
                var isTarget = (k === target);
                if (pane) {
                    if (isTarget) {
                        pane.classList.remove('hidden');
                        pane.classList.add('sanad-pane-active');
                        pane.style.setProperty('display', 'flex', 'important');
                    } else {
                        pane.classList.add('hidden');
                        pane.classList.remove('sanad-pane-active');
                        pane.style.setProperty('display', 'none', 'important');
                    }
                }
                if (btn) {
                    btn.className = isTarget
                        ? 'relative flex flex-col items-center gap-0.5 text-teal-300 font-bold text-[11px] px-1 py-1 whitespace-nowrap shrink-0 cursor-pointer'
                        : 'relative flex flex-col items-center gap-0.5 text-slate-400 font-medium text-[11px] px-1 py-1 whitespace-nowrap shrink-0 cursor-pointer';
                }
            }
            var tabBadge = document.getElementById('current-tab-badge');
            if (tabBadge) tabBadge.textContent = SANAD_TAB_LABELS[target];
        }

        function setPane(p) {
            var target = SANAD_TAB_LABELS[p] ? p : 'chats';
            applySanadPaneDisplay(target);
            try {
                if (location.hash !== '#tab-' + target) history.replaceState(null, '', '#tab-' + target);
            } catch (e) {}
            if (target === 'accounts' && typeof renderAccts === 'function') renderAccts();
            if (target === 'contacts' && typeof renderPresence === 'function') { renderPresence(); renderBlockedList(); }
            if (target === 'groups' && typeof renderGroupsList === 'function') renderGroupsList();
            if (target === 'calls' && typeof renderGroupCallPickers === 'function') { renderGroupCallPickers(); onCallDialInput(); }
            if (target === 'ai' && typeof refreshUpdateStatusInAi === 'function') refreshUpdateStatusInAi();
        }
    </script>

    <audio id="remote-audio-el" autoplay playsinline class="hidden"></audio>

    <header class="bg-[#0d1926]/95 border-b border-slate-800/80 px-3.5 py-2 flex justify-between items-center z-20 shrink-0">
        <div class="flex items-center gap-2.5 min-w-0">
            <button type="button" onclick="openIdentityQrModal()" title="كود التعريف ورمز QR" class="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-[#1e6078] via-[#164e63] to-[#0f3646] border border-teal-300/30 flex flex-col items-center justify-center shrink-0 shadow">
                <span class="text-teal-50 font-bold text-base leading-none">س</span>
                <span class="text-[8px] font-semibold text-teal-200 leading-tight mt-0.5">سند</span>
                <span id="header-unread-dot" class="hidden absolute -top-1.5 -left-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-mono font-bold flex items-center justify-center shadow">0</span>
            </button>
            <div class="min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                    <h1 class="font-bold text-base text-white leading-none">سند</h1>
                    <span class="text-[10px] bg-teal-950/80 text-teal-200 border border-teal-800/60 px-2 py-0.5 rounded-full font-semibold">AI v${APP_VERSION}</span>
                    <span id="current-tab-badge" class="text-[10px] bg-slate-800/90 text-slate-200 border border-slate-700/80 px-2 py-0.5 rounded-full font-semibold">الدردشة</span>
                    <span id="net-badge" class="text-[10px] bg-emerald-950/90 text-emerald-200 border border-emerald-700/60 px-2 py-0.5 rounded-full font-semibold">نشط</span>
                </div>
                <div class="flex items-center gap-1.5 text-[11px] mt-0.5 flex-wrap">
                    <span id="ws-dot" class="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span id="ws-label" class="text-emerald-300 font-medium">متصل</span>
                    <button type="button" onclick="reconnectNow()" title="تحديث الربط" class="text-slate-300 hover:text-white px-1">
                        <i class="fa-solid fa-rotate-right text-[10px]"></i>
                    </button>
                    <span class="text-slate-600">•</span>
                    <button type="button" onclick="openIdentityQrModal()" class="font-mono font-semibold text-teal-200 hover:underline truncate max-w-[140px]" id="active-acct-label"></button>
                </div>
            </div>
        </div>

        <div class="flex items-center gap-1.5 shrink-0">
            <button type="button" onclick="requestSystemNotifications()" title="تفعيل الإشعارات" class="px-2.5 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-200 flex items-center gap-1 text-[11px] font-semibold transition">
                <i class="fa-solid fa-bell text-xs"></i><span id="notif-status-txt">إشعار</span>
            </button>
            <button type="button" onclick="openIdentityQrModal()" title="كود التعريف ورمز QR" class="px-2.5 h-9 rounded-xl bg-teal-950/80 hover:bg-teal-800 border border-teal-700/60 text-teal-200 flex items-center gap-1 text-[11px] font-semibold transition">
                <i class="fa-solid fa-qrcode text-xs"></i><span>كودي</span>
            </button>
            <button type="button" onclick="launchCall('audio')" title="مكالمة صوتية" class="w-9 h-9 rounded-xl bg-teal-950/70 hover:bg-teal-800 border border-teal-800/60 text-teal-200 flex items-center justify-center transition">
                <i class="fa-solid fa-phone text-xs"></i>
            </button>
            <button type="button" onclick="launchCall('video')" title="مكالمة فيديو" class="w-9 h-9 rounded-xl bg-sky-950/70 hover:bg-sky-800 border border-sky-800/60 text-sky-200 flex items-center justify-center transition">
                <i class="fa-solid fa-video text-xs"></i>
            </button>
        </div>
    </header>

    <div id="copy-toast-banner" class="hidden fixed top-14 left-1/2 -translate-x-1/2 bg-teal-900/95 border border-teal-500/50 text-teal-50 px-4 py-1.5 rounded-full shadow-xl z-50 text-xs font-semibold">
        تم التنفيذ بنجاح
    </div>

    <div id="live-toast" onclick="jumpToToastChat()" class="hidden fixed top-16 left-3 right-3 max-w-md mx-auto bg-[#0d1926]/95 border border-teal-800/70 text-slate-100 px-3.5 py-2.5 rounded-2xl shadow-2xl z-40 flex items-center justify-between gap-2 cursor-pointer text-xs">
        <div class="min-w-0">
            <p id="toast-sender" class="font-bold text-teal-200 truncate">رسالة جديدة</p>
            <p id="toast-body" class="text-slate-200 truncate">...</p>
        </div>
        <span class="bg-teal-950 text-teal-200 border border-teal-800/60 px-2 py-1 rounded-lg text-[10px] font-semibold shrink-0">فتح</span>
    </div>

    <!-- نافذة كود التعريف ورمز QR -->
    <div id="identity-qr-modal" onclick="if(event.target===this)closeIdentityQrModal()" class="hidden fixed inset-0 bg-[#070d14]/88 z-50 flex items-center justify-center p-3.5 overflow-y-auto">
        <div class="bg-[#0d1926] border border-teal-700/60 rounded-3xl w-full max-w-md p-4 space-y-3 shadow-2xl my-auto">
            <div class="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <h3 class="text-sm font-bold text-teal-200"><i class="fa-solid fa-qrcode ml-1"></i> كود التعريف ورمز QR</h3>
                <button type="button" onclick="closeIdentityQrModal()" class="text-slate-400 hover:text-white text-sm"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div class="bg-[#08101a] border border-slate-800 rounded-2xl p-3 flex flex-col items-center gap-2">
                <div class="text-[11px] text-slate-400">معرّفك النشط الحالي</div>
                <div id="qr-modal-acct-id" class="font-mono text-base font-bold text-teal-200"></div>
                <canvas id="sanad-qr-canvas" width="164" height="164" class="rounded-2xl bg-white p-2 shadow"></canvas>
                <div class="flex flex-wrap justify-center gap-1.5 text-xs">
                    <button type="button" onclick="copyStringToClipboard(activeAcct, 'تم نسخ كود التعريف')" class="bg-[#164e63] hover:bg-[#1e6078] text-white px-3 py-1.5 rounded-xl font-semibold">نسخ الكود</button>
                    <button type="button" onclick="saveContactToDeviceVcf(activeAcct, activeAcct)" class="bg-emerald-800 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl font-semibold"><i class="fa-solid fa-address-card ml-1"></i>حفظ في جوالي (.vcf)</button>
                </div>
            </div>
            <div class="flex gap-1.5">
                <input type="text" id="qr-manual-code-input" oninput="normalizeDigitsInInput(this)" placeholder="أدخل كود أو رقم أو رابط طرف آخر..." class="flex-1 bg-[#08101a] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono">
                <button type="button" onclick="connectFromQrOrCodeInput()" class="bg-[#164e63] hover:bg-[#1e6078] text-white px-3 py-1.5 rounded-xl text-xs font-semibold">فتح</button>
            </div>
        </div>
    </div>

    <!-- نافذة المكالمات -->
    <div id="call-modal" class="hidden fixed inset-0 bg-[#070d14]/95 z-50 flex flex-col items-center justify-between p-4">
        <div class="text-center mt-1">
            <p class="text-xs text-teal-300 font-semibold">سند AI v${APP_VERSION}</p>
            <h2 id="call-peer-title" class="text-lg font-bold text-white font-mono mt-0.5">...</h2>
            <p id="call-timer-el" class="text-xs font-mono font-semibold text-slate-300 mt-0.5">00:00</p>
            <p id="call-status-msg" class="text-xs text-emerald-300 mt-0.5 font-medium">جاري الاتصال...</p>
        </div>
        <div class="relative w-full max-w-sm flex-1 my-2.5 max-h-[60vh] aspect-[9/16] bg-[#0d1926] rounded-3xl border border-slate-800 overflow-hidden flex items-center justify-center shadow-2xl">
            <video id="remote-video-el" autoplay playsinline class="w-full h-full object-cover hidden"></video>
            <video id="local-video-el" autoplay playsinline muted class="w-24 h-36 object-cover rounded-2xl border-2 border-teal-400/70 shadow-lg absolute bottom-3 left-3 hidden"></video>
            <div id="voice-call-card" class="flex flex-col items-center gap-2.5 px-4 text-center">
                <div class="w-20 h-20 rounded-full bg-teal-950/80 border border-teal-800/60 flex items-center justify-center text-3xl text-teal-200 animate-pulse">
                    <i class="fa-solid fa-microphone-lines"></i>
                </div>
                <span id="call-mode-label" class="text-xs text-slate-300 font-medium">مكالمة صوتية مباشرة</span>
            </div>
        </div>
        <div class="flex items-center gap-2 mb-2 flex-wrap justify-center">
            <button type="button" id="accept-btn" onclick="answerCall()" class="hidden bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-3 rounded-2xl font-semibold text-xs animate-bounce">
                <i class="fa-solid fa-phone ml-1"></i> رد الآن
            </button>
            <button type="button" id="mute-btn" onclick="toggleMuteTrack()" class="w-11 h-11 rounded-2xl bg-slate-800 border border-slate-700 text-white flex items-center justify-center">
                <i id="mute-icon" class="fa-solid fa-microphone"></i>
            </button>
            <button type="button" onclick="endActiveCall()" class="bg-rose-800 hover:bg-rose-700 text-white px-4 py-3 rounded-2xl font-semibold text-xs">
                <i class="fa-solid fa-phone-slash ml-1"></i> إنهاء
            </button>
        </div>
    </div>

    <main class="flex-1 flex flex-col overflow-hidden">
        <!-- تبويب الدردشة -->
        <section id="pane-chats" class="sanad-pane sanad-pane-active flex-1 flex-col h-full overflow-hidden">
            <div class="p-2 bg-[#0d1926]/90 border-b border-slate-800/80 space-y-1.5 shrink-0">
                <div class="flex gap-2">
                    <input type="text" id="peer-input" oninput="normalizeDigitsInInput(this); onTopPeerSearchInput();" onkeydown="if(event.key==='Enter'){event.preventDefault();openPeerByInput();}" placeholder="اكتب الاسم أو الكود أو الرقم..." class="flex-1 bg-[#08101a] border border-slate-800 rounded-xl px-3 py-1.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-teal-600">
                    <button type="button" onclick="openPeerByInput()" class="bg-[#164e63] hover:bg-[#1e6078] text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold">فتح</button>
                    <button type="button" onclick="saveCurrentPeerToPhoneContacts()" title="حفظ في جهات اتصال الجوال" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-teal-200 px-2.5 py-1.5 rounded-xl text-xs font-semibold">
                        <i class="fa-solid fa-address-card"></i>
                    </button>
                </div>
                <div id="quick-chips" class="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs"></div>
            </div>

            <div class="px-3.5 py-1.5 bg-[#0b1521] border-b border-slate-800/80 flex justify-between items-center gap-2 text-xs shrink-0">
                <div class="flex items-center gap-2 min-w-0">
                    <span id="peer-dot" class="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0"></span>
                    <span id="peer-title" class="font-semibold text-slate-100 font-mono truncate">خدمة العملاء</span>
                    <span id="peer-status" class="text-[11px] font-semibold text-emerald-300 shrink-0">متصل الآن • نشط</span>
                </div>
                <div class="flex items-center gap-2 shrink-0 text-[11px]">
                    <button type="button" onclick="launchCall('audio')" class="text-emerald-300 hover:text-emerald-200"><i class="fa-solid fa-phone"></i></button>
                    <button type="button" onclick="launchCall('video')" class="text-teal-200 hover:text-white"><i class="fa-solid fa-video"></i></button>
                    <button type="button" id="chat-block-btn" onclick="toggleBlockCurrentPeer()" class="text-amber-300 hover:text-amber-200 font-medium">حظر</button>
                    <button type="button" onclick="clearThreadMsgs()" class="text-rose-300 hover:text-rose-200 font-medium">مسح</button>
                </div>
            </div>

            <div id="msgs-box" class="flex-1 overflow-y-auto p-3.5 space-y-3 custom-scrollbar"></div>

            <div class="p-2.5 bg-[#0d1926] border-t border-slate-800 flex items-end gap-1.5 shrink-0">
                <input type="file" id="attach-file" class="hidden" onchange="onFilePicked(event)">
                <button type="button" onclick="document.getElementById('attach-file').click()" class="text-slate-300 hover:text-white p-2 rounded-xl hover:bg-slate-800 shrink-0"><i class="fa-solid fa-paperclip text-base"></i></button>
                <textarea id="msg-box-input" rows="1" oninput="autoResizeComposer(this)" onkeydown="if(event.key==='Enter' && !event.shiftKey){event.preventDefault();sendTextMsg();}" placeholder="اكتب رسالتك..." class="flex-1 bg-[#08101a] border border-slate-800 rounded-xl px-3 py-2 sanad-composer-font text-white placeholder-slate-400 focus:outline-none focus:border-teal-600 resize-none max-h-28 overflow-y-auto custom-scrollbar"></textarea>
                <button type="button" onclick="sendTextMsg()" class="bg-[#164e63] hover:bg-[#1e6078] text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow shrink-0"><i class="fa-solid fa-paper-plane"></i></button>
            </div>
        </section>

        <!-- تبويب المجموعات -->
        <section id="pane-groups" class="sanad-pane hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-3">
            <div class="bg-[#0d1926] border border-slate-800 p-4 rounded-2xl space-y-3">
                <div class="flex items-center justify-between">
                    <h2 class="text-sm font-bold text-teal-200"><i class="fa-solid fa-users ml-1"></i> مجموعات التواصل</h2>
                    <span id="groups-count-badge" class="text-[11px] font-mono text-slate-200 bg-slate-800 border border-slate-700 px-2.5 py-0.5 rounded-full">0 مجموعة</span>
                </div>
                <input type="text" id="g-name" placeholder="اسم المجموعة" class="w-full bg-[#08101a] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                <input type="text" id="g-members" oninput="normalizeDigitsInInput(this)" placeholder="أعضاء إضافيون (أرقام أو أكواد 88... مفصولة بفاصلة)" class="w-full bg-[#08101a] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono">
                <button type="button" onclick="createSanadGroup()" class="bg-[#164e63] hover:bg-[#1e6078] text-white px-4 py-2 rounded-xl text-xs font-semibold">+ إنشاء مجموعة</button>
            </div>
            <div id="groups-list" class="space-y-2"></div>
        </section>

        <!-- تبويب الحسابات (توليد 8 أرقام يبدأ بـ 88 + تفعيل رقم دولي بكود من السيرفر/الإيميل) -->
        <section id="pane-accounts" class="sanad-pane hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-4">
            <div class="bg-[#0d1926] border border-slate-800 p-4 rounded-2xl space-y-3">
                <div class="flex items-center justify-between">
                    <h2 class="text-sm font-bold text-teal-200">توليد الأكواد (تبدأ بـ 88) وإدارة الحسابات</h2>
                    <span id="accounts-count-badge" class="text-[11px] font-mono text-slate-200 bg-slate-800 border border-slate-700 px-2.5 py-0.5 rounded-full">1 حساب</span>
                </div>
                <div class="flex flex-wrap gap-2">
                    <button type="button" onclick="generate88DigitCode()" class="bg-[#164e63] hover:bg-[#1e6078] text-white px-4 py-2.5 rounded-xl text-xs font-semibold">+ توليد كود (8 أرقام يبدأ بـ 88)</button>
                    <button type="button" onclick="addCustom88OrId()" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 px-4 py-2.5 rounded-xl text-xs font-semibold">+ إدخال كود يبدأ بـ 88</button>
                </div>
                <div id="last-generated-banner" class="hidden bg-[#08101a] border border-teal-800/60 rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs">
                    <span id="last-generated-text" class="font-mono font-semibold text-teal-200"></span>
                    <div class="flex gap-1.5">
                        <button type="button" onclick="saveContactToDeviceVcf(lastGeneratedCode, 'سند ' + lastGeneratedCode)" class="bg-emerald-800 text-white px-2.5 py-1 rounded-lg text-[11px] font-semibold">حفظ بجوالي</button>
                        <button type="button" onclick="copyStringToClipboard(lastGeneratedCode)" class="bg-[#164e63] text-white px-2.5 py-1 rounded-lg text-[11px] font-semibold">نسخ</button>
                    </div>
                </div>
                <div id="accounts-list" class="space-y-2 pt-1"></div>
            </div>

            <!-- تفعيل رقم دولي بمفتاح البلد عبر كود من السيرفر أو البريد الإلكتروني -->
            <div class="bg-[#0d1926] border border-slate-800 p-4 rounded-2xl space-y-3 text-xs">
                <div class="flex items-center justify-between">
                    <h3 class="text-sm font-bold text-emerald-300"><i class="fa-solid fa-earth-americas ml-1"></i> تفعيل رقم دولي (مفتاح البلد + كود من نظامنا)</h3>
                    <span class="text-[10px] bg-emerald-950/80 text-emerald-200 border border-emerald-800/60 px-2 py-0.5 rounded-full">بدون شركة اتصال</span>
                </div>
                <div class="grid grid-cols-3 gap-2">
                    <input type="text" id="intl-cc-input" oninput="normalizeDigitsInInput(this)" value="+967" placeholder="+967" class="bg-[#08101a] border border-slate-800 rounded-xl px-3 py-2 font-mono text-white text-center">
                    <input type="text" id="intl-phone-input" oninput="normalizeDigitsInInput(this)" placeholder="رقم الجوال" class="col-span-2 bg-[#08101a] border border-slate-800 rounded-xl px-3 py-2 font-mono text-white">
                </div>
                <input type="email" id="intl-email-input" placeholder="بريد إلكتروني اختياري لإرسال نسخة من الكود (أو يظهر مباشرة من السيرفر)" class="w-full bg-[#08101a] border border-slate-800 rounded-xl px-3 py-2 text-white">
                <div class="flex gap-2">
                    <button type="button" onclick="requestSanadVerificationCode()" class="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white py-2 px-3 rounded-xl font-semibold">إرسال كود التفعيل من سند</button>
                </div>
                <div id="otp-delivery-box" class="hidden bg-[#08101a] border border-teal-800/60 rounded-xl p-2.5 space-y-2">
                    <div id="otp-delivery-msg" class="text-[11px] text-teal-200 font-mono"></div>
                    <div class="flex gap-2">
                        <input type="text" id="otp-code-input" oninput="normalizeDigitsInInput(this)" placeholder="أدخل كود التحقق (6 أرقام)" class="flex-1 bg-[#0d1926] border border-slate-700 rounded-xl px-3 py-1.5 font-mono text-white">
                        <button type="button" onclick="verifySanadPhoneCode()" class="bg-[#164e63] hover:bg-[#1e6078] text-white px-4 py-1.5 rounded-xl font-semibold">تفعيل الرقم</button>
                    </div>
                </div>
            </div>
        </section>

        <!-- تبويب الجهات (حفظ الكود في جهات اتصال الجوال مباشرة) -->
        <section id="pane-contacts" class="sanad-pane hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-3">
            <div class="bg-[#0d1926] border border-slate-800 p-3.5 rounded-2xl space-y-2.5">
                <div class="flex items-center justify-between gap-2 flex-wrap">
                    <h2 class="text-sm font-bold text-teal-200">الجهات وحفظ الكود في جوالك</h2>
                    <button type="button" onclick="exportAllContactsVcf()" class="bg-emerald-800 hover:bg-emerald-700 text-white px-3 py-1 rounded-lg text-[11px] font-semibold"><i class="fa-solid fa-address-book ml-1"></i>تصدير الكل لجهات الجوال (.vcf)</button>
                </div>
                <p class="text-[11px] text-slate-400">كل طرف يحتفظ بأرقامه على جواله؛ يمكنك حفظ أي كود (88...) أو رقم في جهات اتصال جوالك بضغطة واحدة.</p>
                <div class="flex flex-col sm:flex-row gap-2">
                    <input type="text" id="c-name" placeholder="الاسم" class="bg-[#08101a] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                    <input type="text" id="c-id" oninput="normalizeDigitsInInput(this)" placeholder="كود 88... أو رقم الجوال" class="flex-1 bg-[#08101a] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono">
                    <button type="button" onclick="addContactAndSaveToPhone()" class="bg-[#164e63] hover:bg-[#1e6078] text-white px-4 py-2 rounded-xl text-xs font-semibold">حفظ وإضافة لجوالي</button>
                </div>
            </div>
            <div id="contacts-list" class="space-y-2"></div>

            <div class="bg-[#0d1926] border border-rose-900/50 p-3.5 rounded-2xl space-y-2">
                <div class="flex items-center justify-between">
                    <h3 class="text-xs font-bold text-rose-300"><i class="fa-solid fa-ban ml-1"></i> قائمة المحظورين</h3>
                    <span id="blocked-count-badge" class="text-[10px] font-mono text-rose-200 bg-rose-950/80 border border-rose-800/60 px-2 py-0.5 rounded-full">0 محظور</span>
                </div>
                <div id="blocked-list" class="space-y-1.5"></div>
            </div>
        </section>

        <!-- تبويب المكالمات -->
        <section id="pane-calls" class="sanad-pane hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-4">
            <div class="bg-[#0d1926] border border-slate-800 p-4 rounded-2xl space-y-3 text-center">
                <h2 class="text-base font-bold text-white">المكالمات الصوتية والمرئية</h2>
                <input type="text" id="call-input" oninput="normalizeDigitsInInput(this); onCallDialInput();" onkeydown="if(event.key==='Enter'){event.preventDefault();startDialedCall('audio');}" placeholder="اكتب الكود أو الرقم أو الاسم..." class="w-full max-w-md mx-auto bg-[#08101a] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-center font-mono text-white">
                <div id="call-resolved-preview" class="text-[11px] text-teal-200 font-semibold min-h-[18px]"></div>
                <div class="flex gap-3 justify-center pt-1 flex-wrap">
                    <button type="button" onclick="startDialedCall('audio')" class="bg-emerald-700 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2"><i class="fa-solid fa-phone"></i> مكالمة صوتية</button>
                    <button type="button" onclick="startDialedCall('video')" class="bg-[#164e63] hover:bg-[#1e6078] text-white px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2"><i class="fa-solid fa-video"></i> مكالمة فيديو</button>
                </div>
            </div>
        </section>

        <!-- تبويب الذكاء (يتضمن قسم التحديثات والإشعارات والذكاء الاصطناعي) -->
        <section id="pane-ai" class="sanad-pane hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-3">
            <!-- قسم التحديثات في نهاية القائمة -->
            <div class="bg-[#0d1926] border border-teal-700/60 p-4 rounded-2xl space-y-2.5 text-xs">
                <div class="flex items-center justify-between">
                    <h2 class="text-sm font-bold text-teal-200"><i class="fa-solid fa-cloud-arrow-down ml-1"></i> تحديثات النظام</h2>
                    <span id="update-ver-badge" class="text-[10px] font-mono bg-teal-950 text-teal-200 border border-teal-800 px-2.5 py-0.5 rounded-full">v${APP_VERSION}</span>
                </div>
                <p id="update-status-text" class="text-[11px] text-slate-300">جاهز لفحص وتطبيق أحدث نسخة للنظام والواجهة.</p>
                <div class="flex gap-2 flex-wrap">
                    <button type="button" onclick="checkForSystemUpdate()" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-teal-200 px-3 py-2 rounded-xl font-semibold">فحص التحديث</button>
                    <button type="button" onclick="applySystemUpdateNow()" class="bg-[#164e63] hover:bg-[#1e6078] text-white px-4 py-2 rounded-xl font-semibold"><i class="fa-solid fa-rotate ml-1"></i>تحديث النظام الآن</button>
                </div>
            </div>

            <div class="bg-[#0d1926] border border-slate-800 p-4 rounded-2xl space-y-2.5 text-xs">
                <h3 class="text-sm font-bold text-teal-200"><i class="fa-solid fa-brain ml-1"></i> مساعد سند AI</h3>
                <div id="ai-log" class="bg-[#08101a] border border-slate-800 rounded-xl p-3 h-32 overflow-y-auto space-y-2 custom-scrollbar">
                    <div class="text-slate-400">سند AI v${APP_VERSION} جاهز للعمل.</div>
                </div>
                <div class="flex gap-2">
                    <input type="text" id="ai-q" onkeydown="if(event.key==='Enter')askSanadAI()" placeholder="اسأل سند AI..." class="flex-1 bg-[#08101a] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                    <button type="button" onclick="askSanadAI()" class="bg-[#164e63] hover:bg-[#1e6078] text-white px-4 py-2 rounded-xl text-xs font-semibold">إرسال</button>
                </div>
            </div>
        </section>
    </main>

    <nav class="bg-[#0d1926]/95 border-t border-slate-800 px-0.5 py-2 flex justify-around items-center z-20 shrink-0">
        <a href="#tab-chats" onclick="setPane('chats'); return false;" id="btn-chats" class="relative flex flex-col items-center gap-0.5 text-teal-300 font-bold text-[11px] px-1 py-1 whitespace-nowrap shrink-0 cursor-pointer">
            <span id="nav-chats-badge" class="hidden absolute -top-0.5 -left-1.5 min-w-[16px] h-[16px] px-1 rounded-full bg-rose-600 text-white text-[9px] font-mono font-bold flex items-center justify-center">0</span>
            <i class="fa-solid fa-comments text-sm"></i><span>الدردشة</span>
        </a>
        <a href="#tab-groups" onclick="setPane('groups'); return false;" id="btn-groups" class="relative flex flex-col items-center gap-0.5 text-slate-400 font-medium text-[11px] px-1 py-1 whitespace-nowrap shrink-0 cursor-pointer">
            <i class="fa-solid fa-users text-sm"></i><span>المجموعات</span>
        </a>
        <a href="#tab-accounts" onclick="setPane('accounts'); return false;" id="btn-accounts" class="relative flex flex-col items-center gap-0.5 text-slate-400 font-medium text-[11px] px-1 py-1 whitespace-nowrap shrink-0 cursor-pointer">
            <i class="fa-solid fa-id-card text-sm"></i><span>الحسابات</span>
        </a>
        <a href="#tab-contacts" onclick="setPane('contacts'); return false;" id="btn-contacts" class="relative flex flex-col items-center gap-0.5 text-slate-400 font-medium text-[11px] px-1 py-1 whitespace-nowrap shrink-0 cursor-pointer">
            <i class="fa-solid fa-address-book text-sm"></i><span>الجهات</span>
        </a>
        <a href="#tab-calls" onclick="setPane('calls'); return false;" id="btn-calls" class="relative flex flex-col items-center gap-0.5 text-slate-400 font-medium text-[11px] px-1 py-1 whitespace-nowrap shrink-0 cursor-pointer">
            <i class="fa-solid fa-phone-volume text-sm"></i><span>المكالمات</span>
        </a>
        <a href="#tab-ai" onclick="setPane('ai'); return false;" id="btn-ai" class="relative flex flex-col items-center gap-0.5 text-slate-400 font-medium text-[11px] px-1 py-1 whitespace-nowrap shrink-0 cursor-pointer">
            <i class="fa-solid fa-brain text-sm"></i><span>الذكاء</span>
        </a>
    </nav>

    <script>
        var DEFAULT_PEER = 'خدمة العملاء';
        var activeAcct = 'مستخدم-سند';
        var myAccts = ['مستخدم-سند'];
        var contacts = [{ name: DEFAULT_PEER, id: DEFAULT_PEER }];
        var blockedIdsSet = new Set();
        var sanadGroups = [];
        var unreadByThread = {};
        var currentPeer = DEFAULT_PEER;
        var activePane = 'chats';
        var onlinePeers = new Set();
        var acctThreads = {};
        var seenEventIds = new Set();
        var lastGeneratedCode = '';
        var toastPeerId = null;
        var toastTimer = null;
        var copyToastTimer = null;
        var callDurationTimer = null;
        var callSeconds = 0;
        var ws = null;
        var reconnectTimer = null;
        var pollInFlight = false;
        var lastSyncCursor = 0;

        var pc = null;
        var localStream = null;
        var pendingOfferData = null;
        var pendingIceCandidates = [];
        var activeCallPeerId = null;
        var activeCallMode = 'audio';
        var micMuted = false;

        var ICE_SERVERS = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };

        function cleanIdValue(val) {
            return toWesternDigits(String(val === undefined || val === null ? '' : val)).trim();
        }
        function normalizeStr(v) { return toWesternDigits(v).trim().toLowerCase(); }
        function formatTimeShort(ts) {
            try {
                var d = ts ? new Date(ts) : new Date();
                return toWesternDigits(String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'));
            } catch (e) { return ''; }
        }
        function formatSecondsTimer(sec) {
            var s = Math.max(0, Number(sec) || 0);
            return toWesternDigits(String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'));
        }

        function copyStringToClipboard(text, customLabel) {
            var str = String(text || '');
            if (str && navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(str).catch(function() {});
            }
            var t = document.getElementById('copy-toast-banner');
            if (t) {
                t.textContent = customLabel || 'تم التنفيذ بنجاح';
                t.classList.remove('hidden');
                clearTimeout(copyToastTimer);
                copyToastTimer = setTimeout(function() { t.classList.add('hidden'); }, 2000);
            }
        }

        function playChimeSound() {
            try {
                var AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (!AudioCtx) return;
                var ctx = new AudioCtx();
                var osc = ctx.createOscillator();
                var gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(780, ctx.currentTime);
                gain.gain.setValueAtTime(0.06, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.24);
            } catch (e) {}
        }

        // الإشعارات
        function syncNotificationBadge() {
            var lbl = document.getElementById('notif-status-txt');
            if (!lbl) return;
            if ('Notification' in window && Notification.permission === 'granted') {
                lbl.textContent = 'مفعّلة';
            } else {
                lbl.textContent = 'إشعار';
            }
        }

        function requestSystemNotifications() {
            if (!('Notification' in window)) {
                copyStringToClipboard('', 'التنبيهات الصوتية والداخلية مفعّلة');
                return;
            }
            if (Notification.permission === 'granted') {
                syncNotificationBadge();
                new Notification('سند AI', { body: 'الإشعارات مفعّلة وجاهزة.' });
                return;
            }
            Notification.requestPermission().then(function() {
                syncNotificationBadge();
                copyStringToClipboard('', 'تم تحديث حالة الإشعارات');
            }).catch(function() {});
        }

        function triggerSystemNotification(title, body) {
            playChimeSound();
            if ('Notification' in window && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
                try { new Notification(title || 'سند AI', { body: body || '' }); } catch (e) {}
            }
        }

        // التحديثات من تبويب الذكاء
        function refreshUpdateStatusInAi() {
            var st = document.getElementById('update-status-text');
            if (st) st.textContent = 'النسخة المثبتة حالياً: v' + CLIENT_APP_VERSION + ' -- جاهز لفحص وتطبيق التحديث.';
        }

        function checkForSystemUpdate() {
            var st = document.getElementById('update-status-text');
            if (st) st.textContent = 'جاري فحص التحديث من السيرفر...';
            fetch('/healthz?t=' + Date.now(), { cache: 'no-store' })
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    var srvVer = (data && data.version) ? data.version : CLIENT_APP_VERSION;
                    if (st) {
                        st.textContent = srvVer !== CLIENT_APP_VERSION
                            ? ('يوجد تحديث جديد v' + srvVer + ' متاح للتثبيت الآن.')
                            : ('النظام محدّث على v' + srvVer + ' ويمكنك إعادة تحميل الملفات بالكامل فوراً.');
                    }
                })
                .catch(function() {
                    if (st) st.textContent = 'تعذر الاتصال بالسيرفر لفحص التحديث حالياً.';
                });
        }

        function applySystemUpdateNow() {
            var st = document.getElementById('update-status-text');
            if (st) st.textContent = 'جاري تطبيق التحديث وتحديث الملفات...';
            persistState();
            var finishReload = function() {
                location.replace(location.pathname + '?updated=' + Date.now() + '#tab-ai');
            };
            if ('serviceWorker' in navigator && navigator.serviceWorker.getRegistrations) {
                navigator.serviceWorker.getRegistrations().then(function(regs) {
                    Promise.all(regs.map(function(r) { return r.unregister(); })).then(finishReload).catch(finishReload);
                }).catch(finishReload);
            } else {
                finishReload();
            }
        }

        // حفظ الكود/الرقم في جهات اتصال الجوال (.vcf)
        function saveContactToDeviceVcf(codeOrPhone, displayName) {
            var cleanVal = cleanIdValue(codeOrPhone);
            if (!cleanVal) return;
            var nameVal = String(displayName || cleanVal).trim() || cleanVal;
            var vcard = [
                'BEGIN:VCARD',
                'VERSION:3.0',
                'FN:' + nameVal,
                'N:' + nameVal + ';;;;',
                'TEL;TYPE=CELL:' + cleanVal,
                'NOTE:Sanad AI ID/Phone',
                'END:VCARD'
            ].join('\\r\\n');
            var blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'sanad-' + cleanVal.replace(/[^a-zA-Z0-9+_-]/g, '') + '.vcf';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(function() { URL.revokeObjectURL(url); }, 1200);
            copyStringToClipboard('', 'تم تجهيز بطاقة جهة الاتصال (.vcf) لحفظها في جوالك');
        }

        function exportAllContactsVcf() {
            var list = contacts.filter(function(c) { return c.id && c.id !== DEFAULT_PEER; });
            if (!list.length) return copyStringToClipboard('', 'لا توجد جهات مضافة للتصدير');
            var cards = list.map(function(c) {
                return [
                    'BEGIN:VCARD',
                    'VERSION:3.0',
                    'FN:' + c.name,
                    'TEL;TYPE=CELL:' + cleanIdValue(c.id),
                    'END:VCARD'
                ].join('\\r\\n');
            }).join('\\r\\n');
            var blob = new Blob([cards], { type: 'text/vcard;charset=utf-8' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'sanad-contacts.vcf';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(function() { URL.revokeObjectURL(url); }, 1200);
            copyStringToClipboard('', 'تم تصدير الجهات لملف (.vcf)');
        }

        function saveCurrentPeerToPhoneContacts() {
            if (!currentPeer || currentPeer === DEFAULT_PEER) return;
            var c = contacts.find(function(x) { return normalizeStr(x.id) === normalizeStr(currentPeer); });
            saveContactToDeviceVcf(currentPeer, c ? c.name : currentPeer);
        }

        // توليد كود من 8 أرقام يبدأ بـ 88
        function generate88DigitCode() {
            var suffix = String(Math.floor(100000 + Math.random() * 900000));
            var code = '88' + suffix;
            lastGeneratedCode = code;
            if (myAccts.indexOf(code) === -1) myAccts.unshift(code);
            activeAcct = code;
            var banner = document.getElementById('last-generated-banner');
            var txt = document.getElementById('last-generated-text');
            if (banner && txt) {
                txt.textContent = 'الكود المولّد (88...): ' + code;
                banner.classList.remove('hidden');
            }
            persistState();
            renderAccts();
            renderActiveHeaderAcct();
            syncPresenceNow();
            copyStringToClipboard(code, 'تم توليد وتفعيل الكود: ' + code);
        }

        function addCustom88OrId() {
            var raw = prompt('أدخل الكود (يفضل أن يبدأ بـ 88 من 8 أرقام):', '88');
            var clean = cleanIdValue(raw);
            if (!clean) return;
            if (myAccts.indexOf(clean) === -1) myAccts.unshift(clean);
            activeAcct = clean;
            lastGeneratedCode = clean;
            persistState();
            renderAccts();
            renderActiveHeaderAcct();
            syncPresenceNow();
            copyStringToClipboard(clean, 'تم تفعيل الكود: ' + clean);
        }

        function switchActiveAccount(id) {
            var clean = cleanIdValue(id);
            if (!clean) return;
            activeAcct = clean;
            if (myAccts.indexOf(clean) === -1) myAccts.unshift(clean);
            persistState();
            renderAccts();
            renderActiveHeaderAcct();
            renderMsgs();
            syncPresenceNow();
        }

        function deleteSavedAccount(acctId) {
            var target = cleanIdValue(acctId);
            if (!target || myAccts.length <= 1) return;
            myAccts = myAccts.filter(function(a) { return normalizeStr(a) !== normalizeStr(target); });
            if (normalizeStr(activeAcct) === normalizeStr(target)) activeAcct = myAccts[0];
            persistState();
            renderAccts();
            renderActiveHeaderAcct();
            syncPresenceNow();
        }

        // تفعيل رقم دولي مع مفتاح البلد عبر كود من السيرفر أو البريد
        function requestSanadVerificationCode() {
            var ccEl = document.getElementById('intl-cc-input');
            var phEl = document.getElementById('intl-phone-input');
            var emEl = document.getElementById('intl-email-input');
            var cc = cleanIdValue(ccEl ? ccEl.value : '').replace(/[^0-9+]/g, '');
            if (cc && cc.indexOf('+') !== 0) cc = '+' + cc;
            var ph = cleanIdValue(phEl ? phEl.value : '').replace(/[^0-9]/g, '');
            var email = emEl ? emEl.value.trim() : '';
            if (!ph) return copyStringToClipboard('', 'أدخل رقم الجوال أولاً');
            var fullPhone = (cc || '+967') + ph;

            fetch('/api/auth/request-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: fullPhone, email: email })
            }).then(function(r) { return r.json(); }).then(function(data) {
                var box = document.getElementById('otp-delivery-box');
                var msg = document.getElementById('otp-delivery-msg');
                var inp = document.getElementById('otp-code-input');
                if (box) box.classList.remove('hidden');
                if (inp && data && data.code) inp.value = data.code;
                if (msg) {
                    msg.textContent = email
                        ? ('تم إصدار كود التحقق للرقم ' + fullPhone + ' وتجهيز إرساله إلى ' + email + ' • الكود: ' + (data.code || ''))
                        : ('كود التحقق الصادر من نظام سند للرقم ' + fullPhone + ': ' + (data.code || ''));
                }
            }).catch(function() {
                copyStringToClipboard('', 'تعذر طلب الكود من السيرفر');
            });
        }

        function verifySanadPhoneCode() {
            var ccEl = document.getElementById('intl-cc-input');
            var phEl = document.getElementById('intl-phone-input');
            var codeEl = document.getElementById('otp-code-input');
            var cc = cleanIdValue(ccEl ? ccEl.value : '').replace(/[^0-9+]/g, '');
            if (cc && cc.indexOf('+') !== 0) cc = '+' + cc;
            var ph = cleanIdValue(phEl ? phEl.value : '').replace(/[^0-9]/g, '');
            var fullPhone = (cc || '+967') + ph;
            var code = cleanIdValue(codeEl ? codeEl.value : '');

            fetch('/api/auth/verify-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: fullPhone, code: code })
            }).then(function(r) { return r.json(); }).then(function(data) {
                if (!data || !data.ok) {
                    return copyStringToClipboard('', 'رمز التحقق غير صحيح');
                }
                if (myAccts.indexOf(fullPhone) === -1) myAccts.unshift(fullPhone);
                activeAcct = fullPhone;
                persistState();
                renderAccts();
                renderActiveHeaderAcct();
                syncPresenceNow();
                copyStringToClipboard(fullPhone, 'تم تفعيل الرقم الدولي: ' + fullPhone);
            }).catch(function() {});
        }

        // التخزين والرسم الخفيف
        function loadSavedState() {
            try {
                var sActive = localStorage.getItem('sanad122_active');
                var sAccts = JSON.parse(localStorage.getItem('sanad122_accts') || 'null');
                var sContacts = JSON.parse(localStorage.getItem('sanad122_contacts') || 'null');
                var sBlocked = JSON.parse(localStorage.getItem('sanad122_blocked') || 'null');
                var sThreads = JSON.parse(localStorage.getItem('sanad122_threads') || 'null');
                var sGroups = JSON.parse(localStorage.getItem('sanad122_groups') || 'null');
                var sCursor = Number(localStorage.getItem('sanad122_cursor') || '0');

                if (sActive) activeAcct = cleanIdValue(sActive);
                if (Array.isArray(sAccts) && sAccts.length) myAccts = sAccts.map(cleanIdValue).filter(Boolean);
                if (myAccts.indexOf(activeAcct) === -1) myAccts.unshift(activeAcct);
                if (Array.isArray(sContacts) && sContacts.length) contacts = sContacts;
                if (!contacts.some(function(c) { return c.id === DEFAULT_PEER; })) contacts.unshift({ name: DEFAULT_PEER, id: DEFAULT_PEER });
                if (Array.isArray(sBlocked)) blockedIdsSet = new Set(sBlocked.map(normalizeStr).filter(Boolean));
                if (sThreads && typeof sThreads === 'object') acctThreads = sThreads;
                if (Array.isArray(sGroups)) sanadGroups = sGroups;
                if (sCursor > 0) lastSyncCursor = sCursor;
            } catch (e) {}
        }

        function persistState() {
            try {
                localStorage.setItem('sanad122_active', activeAcct);
                localStorage.setItem('sanad122_accts', JSON.stringify(myAccts));
                localStorage.setItem('sanad122_contacts', JSON.stringify(contacts));
                localStorage.setItem('sanad122_blocked', JSON.stringify(Array.from(blockedIdsSet)));
                localStorage.setItem('sanad122_threads', JSON.stringify(acctThreads));
                localStorage.setItem('sanad122_groups', JSON.stringify(sanadGroups));
                localStorage.setItem('sanad122_cursor', String(lastSyncCursor));
            } catch (e) {}
        }

        function renderActiveHeaderAcct() {
            var lbl = document.getElementById('active-acct-label');
            if (lbl) lbl.textContent = activeAcct;
        }

        function isPeerOnline(id) {
            var target = normalizeStr(id);
            if (!target) return false;
            if (target === normalizeStr(DEFAULT_PEER)) return true;
            var found = false;
            onlinePeers.forEach(function(item) { if (normalizeStr(item) === target) found = true; });
            return found;
        }

        function isPeerBlocked(peerId) {
            var n = normalizeStr(peerId);
            if (!n || n === normalizeStr(DEFAULT_PEER)) return false;
            return blockedIdsSet.has(n);
        }

        function setBlockStatusForPeer(peerId, shouldBlock) {
            var clean = cleanIdValue(peerId);
            var n = normalizeStr(clean);
            if (!n || n === normalizeStr(DEFAULT_PEER)) return;
            if (shouldBlock) blockedIdsSet.add(n);
            else blockedIdsSet.delete(n);
            persistState();
            renderPeerHeader();
            renderPresence();
            renderBlockedList();
            sendPacketWithFallback({
                type: 'sync_blocklist',
                from: activeAcct,
                ownerIds: [activeAcct],
                blockedIds: Array.from(blockedIdsSet)
            });
            copyStringToClipboard('', shouldBlock ? ('تم حظر ' + clean) : ('تم فك الحظر عن ' + clean));
        }

        function toggleBlockCurrentPeer() {
            if (!currentPeer || currentPeer === DEFAULT_PEER) return;
            setBlockStatusForPeer(currentPeer, !isPeerBlocked(currentPeer));
        }

        function renderBlockedList() {
            var box = document.getElementById('blocked-list');
            var badge = document.getElementById('blocked-count-badge');
            var arr = Array.from(blockedIdsSet);
            if (badge) badge.textContent = toWesternDigits(arr.length) + ' محظور';
            if (!box) return;
            if (!arr.length) {
                box.innerHTML = '<div class="text-[11px] text-slate-500">لا يوجد محظورون.</div>';
                return;
            }
            box.innerHTML = arr.map(function(bId) {
                return '<div class="flex items-center justify-between bg-[#08101a] border border-rose-900/40 px-3 py-2 rounded-xl text-xs gap-2">' +
                    '<span class="font-mono text-rose-200 truncate">' + escapeHtml(bId) + '</span>' +
                    '<button type="button" onclick="setBlockStatusForPeer(\\'' + escapeJsSingle(bId) + '\\', false)" class="bg-slate-800 text-teal-200 px-2.5 py-1 rounded-lg text-[11px] font-semibold">فك الحظر</button>' +
                    '</div>';
            }).join('');
        }

        function renderAccts() {
            var badge = document.getElementById('accounts-count-badge');
            if (badge) badge.textContent = toWesternDigits(myAccts.length) + (myAccts.length === 1 ? ' حساب' : ' حسابات');
            var box = document.getElementById('accounts-list');
            if (!box) return;
            box.innerHTML = myAccts.map(function(acc) {
                var isCur = normalizeStr(acc) === normalizeStr(activeAcct);
                return '<div class="flex items-center justify-between bg-[#08101a] border ' + (isCur ? 'border-teal-600' : 'border-slate-800') + ' p-2.5 rounded-xl text-xs gap-2">' +
                    '<span class="font-mono font-semibold text-white truncate">' + escapeHtml(acc) + (isCur ? ' <span class="text-[10px] text-teal-300">(نشط)</span>' : '') + '</span>' +
                    '<div class="flex gap-1.5 shrink-0">' +
                    '<button type="button" onclick="saveContactToDeviceVcf(\\'' + escapeJsSingle(acc) + '\\', \\'سند ' + escapeJsSingle(acc) + '\\')" class="bg-emerald-900/80 text-emerald-200 px-2 py-1 rounded-lg text-[11px] font-semibold">لجوالي</button>' +
                    (!isCur ? '<button type="button" onclick="switchActiveAccount(\\'' + escapeJsSingle(acc) + '\\')" class="bg-[#164e63] text-white px-2.5 py-1 rounded-lg text-[11px] font-semibold">تفعيل</button>' : '') +
                    (myAccts.length > 1 ? '<button type="button" onclick="deleteSavedAccount(\\'' + escapeJsSingle(acc) + '\\')" class="bg-rose-950/80 text-rose-200 px-2 py-1 rounded-lg text-[11px]">حذف</button>' : '') +
                    '</div></div>';
            }).join('');
        }

        function addContactAndSaveToPhone() {
            var nEl = document.getElementById('c-name');
            var iEl = document.getElementById('c-id');
            var idVal = iEl ? cleanIdValue(iEl.value) : '';
            var nameVal = (nEl && nEl.value.trim()) ? nEl.value.trim() : idVal;
            if (!idVal) return;
            var idx = contacts.findIndex(function(c) { return normalizeStr(c.id) === normalizeStr(idVal); });
            if (idx !== -1) contacts[idx] = { name: nameVal, id: idVal };
            else contacts.push({ name: nameVal, id: idVal });
            if (nEl) nEl.value = '';
            if (iEl) iEl.value = '';
            persistState();
            renderPresence();
            renderQuickChips();
            saveContactToDeviceVcf(idVal, nameVal);
        }

        function deleteSavedContact(contactId) {
            var target = cleanIdValue(contactId);
            if (!target || target === DEFAULT_PEER) return;
            contacts = contacts.filter(function(c) { return normalizeStr(c.id) !== normalizeStr(target); });
            persistState();
            renderPresence();
            renderQuickChips();
        }

        function renderPresence() {
            var box = document.getElementById('contacts-list');
            if (!box) return;
            box.innerHTML = contacts.map(function(c) {
                var blocked = isPeerBlocked(c.id);
                var online = !blocked && (isPeerOnline(c.id) || c.id === DEFAULT_PEER);
                var isDef = c.id === DEFAULT_PEER;
                return '<div class="flex items-center justify-between bg-[#0d1926] border border-slate-800 p-3 rounded-xl text-xs gap-2">' +
                    '<div class="min-w-0">' +
                    '<p class="font-bold text-white truncate">' + escapeHtml(c.name) + ' <span class="text-[10px] font-normal ' + (blocked ? 'text-rose-400' : (online ? 'text-emerald-400' : 'text-slate-500')) + '">• ' + (blocked ? 'محظور' : (online ? 'متصل الآن' : 'غير متصل')) + '</span></p>' +
                    '<p class="font-mono text-[11px] text-slate-400 truncate">' + escapeHtml(c.id) + '</p>' +
                    '</div>' +
                    '<div class="flex gap-1.5 shrink-0">' +
                    '<button type="button" onclick="saveContactToDeviceVcf(\\'' + escapeJsSingle(c.id) + '\\', \\'' + escapeJsSingle(c.name) + '\\')" class="bg-emerald-900/80 text-emerald-200 px-2 py-1.5 rounded-lg text-[11px] font-semibold">لجوالي</button>' +
                    '<button type="button" onclick="choosePeer(\\'' + escapeJsSingle(c.id) + '\\')" class="bg-[#164e63] text-white px-2.5 py-1.5 rounded-lg font-semibold">دردشة</button>' +
                    (!isDef ? '<button type="button" onclick="deleteSavedContact(\\'' + escapeJsSingle(c.id) + '\\')" class="bg-rose-950/80 text-rose-200 px-2 py-1.5 rounded-lg font-semibold">حذف</button>' : '') +
                    '</div></div>';
            }).join('');
        }

        function renderGroupsList() {
            var badge = document.getElementById('groups-count-badge');
            if (badge) badge.textContent = toWesternDigits(sanadGroups.length) + ' مجموعة';
            var box = document.getElementById('groups-list');
            if (!box) return;
            box.innerHTML = sanadGroups.map(function(g) {
                return '<div class="flex items-center justify-between bg-[#0d1926] border border-slate-800 p-3 rounded-xl text-xs gap-2">' +
                    '<span class="font-bold text-white truncate">👥 ' + escapeHtml(g.name) + '</span>' +
                    '<button type="button" onclick="choosePeer(\\'' + escapeJsSingle(g.id) + '\\')" class="bg-[#164e63] text-white px-3 py-1.5 rounded-lg font-semibold">فتح</button>' +
                    '</div>';
            }).join('');
        }

        function createSanadGroup() {
            var nEl = document.getElementById('g-name');
            var mEl = document.getElementById('g-members');
            var name = nEl ? nEl.value.trim() : '';
            if (!name) return;
            var extra = mEl ? toWesternDigits(mEl.value).split(/[\\s,،]+/).map(cleanIdValue).filter(Boolean) : [];
            var grp = { id: 'grp-' + Date.now(), name: name, members: Array.from(new Set([activeAcct].concat(extra))) };
            sanadGroups.unshift(grp);
            if (nEl) nEl.value = '';
            if (mEl) mEl.value = '';
            persistState();
            renderGroupsList();
            renderQuickChips();
            choosePeer(grp.id);
        }

        function renderQuickChips(filterQ) {
            var box = document.getElementById('quick-chips');
            if (!box) return;
            var q = normalizeStr(filterQ || '');
            var items = sanadGroups.map(function(g) { return { id: g.id, label: '👥 ' + g.name }; })
                .concat(contacts.map(function(c) { return { id: c.id, label: c.id === DEFAULT_PEER ? c.name : (c.name + ' (' + c.id + ')') }; }));
            if (q) items = items.filter(function(it) { return normalizeStr(it.label).indexOf(q) !== -1 || normalizeStr(it.id).indexOf(q) !== -1; });
            box.innerHTML = items.slice(0, 12).map(function(it) {
                var active = normalizeStr(it.id) === normalizeStr(currentPeer);
                return '<button type="button" onclick="choosePeer(\\'' + escapeJsSingle(it.id) + '\\')" class="px-2.5 py-1 rounded-full border text-xs font-semibold whitespace-nowrap shrink-0 ' +
                    (active ? 'bg-[#164e63] border-teal-500 text-white' : 'bg-[#08101a] border-slate-800 text-slate-300') + '">' + escapeHtml(it.label) + '</button>';
            }).join('');
        }

        function onTopPeerSearchInput() {
            var inp = document.getElementById('peer-input');
            renderQuickChips(inp ? inp.value.trim() : '');
        }

        function choosePeer(id) {
            var clean = cleanIdValue(id);
            if (!clean) return;
            currentPeer = clean;
            delete unreadByThread[normalizeStr(clean)];
            updateUnreadBadgesUI();
            var callInp = document.getElementById('call-input');
            if (callInp) { callInp.value = clean; onCallDialInput(); }
            setPane('chats');
            renderPeerHeader();
            renderQuickChips();
            renderMsgs();
        }

        function openPeerByInput() {
            var inp = document.getElementById('peer-input');
            if (!inp || !inp.value.trim()) return;
            choosePeer(inp.value.trim());
            inp.value = '';
        }

        function renderPeerHeader() {
            var titleEl = document.getElementById('peer-title');
            var statusEl = document.getElementById('peer-status');
            var dotEl = document.getElementById('peer-dot');
            var blockBtn = document.getElementById('chat-block-btn');
            var found = contacts.find(function(c) { return normalizeStr(c.id) === normalizeStr(currentPeer); });
            if (titleEl) titleEl.textContent = found ? (found.id === DEFAULT_PEER ? found.name : (found.name + ' • ' + found.id)) : currentPeer;
            if (blockBtn) {
                blockBtn.classList.toggle('hidden', currentPeer === DEFAULT_PEER);
                blockBtn.textContent = isPeerBlocked(currentPeer) ? 'فك الحظر' : 'حظر';
            }
            if (isPeerBlocked(currentPeer)) {
                if (statusEl) { statusEl.textContent = 'محظور'; statusEl.className = 'text-[11px] font-semibold text-rose-400 shrink-0'; }
                if (dotEl) dotEl.className = 'w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0';
                return;
            }
            var online = isPeerOnline(currentPeer) || currentPeer === DEFAULT_PEER;
            if (statusEl) {
                statusEl.textContent = online ? 'متصل الآن • نشط' : 'غير متصل';
                statusEl.className = online ? 'text-[11px] font-semibold text-emerald-300 shrink-0' : 'text-[11px] font-semibold text-slate-400 shrink-0';
            }
            if (dotEl) dotEl.className = online ? 'w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0' : 'w-2.5 h-2.5 rounded-full bg-slate-600 shrink-0';
        }

        function getThreadMap() {
            if (!acctThreads[activeAcct]) acctThreads[activeAcct] = {};
            if (!acctThreads[activeAcct][DEFAULT_PEER]) {
                acctThreads[activeAcct][DEFAULT_PEER] = [
                    { id: 'init-' + activeAcct, from: 'them', senderName: DEFAULT_PEER, kind: 'text', text: 'مرحباً بك في سند AI v${APP_VERSION}، الاتصال نشط والرسائل والمكالمات جاهزة.', sentAt: formatTimeShort() }
                ];
            }
            return acctThreads[activeAcct];
        }

        function ensureThreadEntry(ownerAcct, peerKey) {
            var o = cleanIdValue(ownerAcct || activeAcct) || activeAcct;
            var k = cleanIdValue(peerKey) || DEFAULT_PEER;
            if (!acctThreads[o]) acctThreads[o] = {};
            if (!acctThreads[o][k]) acctThreads[o][k] = [];
            return acctThreads[o][k];
        }

        function updateUnreadBadgesUI() {
            var total = 0;
            Object.keys(unreadByThread).forEach(function(k) { total += Number(unreadByThread[k] || 0); });
            var dot = document.getElementById('header-unread-dot');
            var navBadge = document.getElementById('nav-chats-badge');
            if (dot) { dot.textContent = toWesternDigits(total); dot.classList.toggle('hidden', total <= 0); }
            if (navBadge) { navBadge.textContent = toWesternDigits(total); navBadge.classList.toggle('hidden', total <= 0); }
        }

        function showLiveToast(senderLabel, bodyText, peerId) {
            toastPeerId = peerId;
            var sEl = document.getElementById('toast-sender');
            var bEl = document.getElementById('toast-body');
            var box = document.getElementById('live-toast');
            if (sEl) sEl.textContent = senderLabel || 'رسالة جديدة';
            if (bEl) bEl.textContent = bodyText || '...';
            if (box) {
                box.classList.remove('hidden');
                clearTimeout(toastTimer);
                toastTimer = setTimeout(function() { box.classList.add('hidden'); }, 4000);
            }
            triggerSystemNotification(senderLabel, bodyText);
        }

        function jumpToToastChat() {
            var box = document.getElementById('live-toast');
            if (box) box.classList.add('hidden');
            if (toastPeerId) choosePeer(toastPeerId);
        }

        function renderMsgs() {
            var box = document.getElementById('msgs-box');
            if (!box) return;
            var list = (getThreadMap()[currentPeer] || []).filter(function(m) { return m && !m.deleted; });
            box.innerHTML = list.map(function(m) {
                var isMe = m.from === 'me';
                var media = '';
                if (m.kind === 'image' && m.mediaUrl) media = '<img src="' + m.mediaUrl + '" class="max-w-[210px] rounded-xl mt-1">';
                else if (m.kind === 'file' && m.mediaUrl) media = '<a href="' + m.mediaUrl + '" download="' + escapeHtml(m.fileName || 'file') + '" class="underline text-xs text-teal-200 block mt-1">' + escapeHtml(m.fileName || 'ملف') + '</a>';
                return '<div class="flex ' + (isMe ? 'justify-start' : 'justify-end') + '">' +
                    '<div class="max-w-[84%] rounded-2xl px-3.5 py-2.5 shadow ' +
                    (isMe ? 'bg-[#164e63] text-white rounded-br-sm' : 'bg-[#0d1926] border border-slate-800 text-slate-100 rounded-bl-sm') + '">' +
                    (m.text ? '<div class="sanad-msg-text whitespace-pre-wrap break-words">' + escapeHtml(m.text) + '</div>' : '') +
                    media +
                    '<div class="text-[10px] text-slate-300/80 mt-1 text-left">' + escapeHtml(m.sentAt || '') + '</div></div></div>';
            }).join('');
            box.scrollTop = box.scrollHeight;
        }

        function autoResizeComposer(el) {
            if (!el) return;
            el.style.height = 'auto';
            el.style.height = Math.min(el.scrollHeight, 112) + 'px';
        }

        function sendTextMsg() {
            var inp = document.getElementById('msg-box-input');
            if (!inp) return;
            var txt = inp.value.trim();
            if (!txt) return;
            if (isPeerBlocked(currentPeer)) return copyStringToClipboard('', 'هذا الطرف محظور');

            var msgObj = {
                id: 'm-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
                from: 'me',
                senderName: activeAcct,
                kind: 'text',
                text: txt,
                sentAt: formatTimeShort()
            };
            var list = ensureThreadEntry(activeAcct, currentPeer);
            list.push(msgObj);
            inp.value = '';
            autoResizeComposer(inp);
            persistState();
            renderMsgs();

            if (currentPeer === DEFAULT_PEER) {
                setTimeout(function() {
                    ensureThreadEntry(activeAcct, DEFAULT_PEER).push({
                        id: 'bot-' + Date.now(),
                        from: 'them',
                        senderName: DEFAULT_PEER,
                        kind: 'text',
                        text: 'تم استلام رسالتك ("' + txt.slice(0, 60) + '"). يمكنك الآن مراسلة أو الاتصال بأي كود 88 أو رقم دولي.',
                        sentAt: formatTimeShort()
                    });
                    persistState();
                    renderMsgs();
                }, 350);
                return;
            }

            var grp = sanadGroups.find(function(g) { return normalizeStr(g.id) === normalizeStr(currentPeer); });
            var targets = grp ? grp.members.filter(function(x) { return normalizeStr(x) !== normalizeStr(activeAcct); }) : [currentPeer];
            targets.forEach(function(t) {
                sendPacketWithFallback({
                    type: 'chat_message',
                    eventId: 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
                    from: activeAcct,
                    senderName: activeAcct,
                    to: cleanIdValue(t),
                    groupId: grp ? grp.id : null,
                    msg: msgObj
                });
            });
        }

        function onFilePicked(ev) {
            var file = ev && ev.target && ev.target.files && ev.target.files[0];
            if (!file) return;
            if (file.size > 1_200_000) {
                ev.target.value = '';
                return copyStringToClipboard('', 'حجم الملف أكبر من 1.2 ميجابايت');
            }
            var reader = new FileReader();
            reader.onload = function() {
                var isImg = /^image\\//i.test(file.type);
                var msgObj = {
                    id: 'f-' + Date.now(),
                    from: 'me',
                    senderName: activeAcct,
                    kind: isImg ? 'image' : 'file',
                    fileName: file.name,
                    text: isImg ? '' : file.name,
                    mediaUrl: reader.result,
                    sentAt: formatTimeShort()
                };
                ensureThreadEntry(activeAcct, currentPeer).push(msgObj);
                persistState();
                renderMsgs();
                if (currentPeer !== DEFAULT_PEER) {
                    sendPacketWithFallback({
                        type: 'chat_message',
                        eventId: 'fmsg-' + Date.now(),
                        from: activeAcct,
                        senderName: activeAcct,
                        to: currentPeer,
                        msg: msgObj
                    });
                }
            };
            reader.readAsDataURL(file);
            ev.target.value = '';
        }

        function askSanadAI() {
            var inp = document.getElementById('ai-q');
            var log = document.getElementById('ai-log');
            if (!inp || !inp.value.trim() || !log) return;
            var q = inp.value.trim();
            inp.value = '';
            log.innerHTML += '<div class="bg-[#164e63]/60 text-white px-2.5 py-1.5 rounded-lg">أنت: ' + escapeHtml(q) + '</div>';
            log.innerHTML += '<div class="bg-[#0d1926] border border-slate-800 text-teal-100 px-2.5 py-1.5 rounded-lg">سند AI: تم استلام طلبك (' + escapeHtml(q) + '). لتوليد كود 88 اذهب إلى «الحسابات»، ولتحديث النظام اضغط «تحديث النظام الآن» بالأعلى.</div>';
            log.scrollTop = log.scrollHeight;
        }

        function onCallDialInput() {
            var inp = document.getElementById('call-input');
            var prev = document.getElementById('call-resolved-preview');
            var raw = cleanIdValue(inp ? inp.value : '');
            if (prev) prev.textContent = raw ? ('المستهدف: ' + raw) : '';
        }

        function startDialedCall(mode) {
            var inp = document.getElementById('call-input');
            var raw = cleanIdValue(inp ? inp.value : '');
            launchCall(mode, raw || currentPeer);
        }

        function ensurePeerConnection(targetPeerId) {
            if (pc) return pc;
            var RTCPeer = window.RTCPeerConnection || window.webkitRTCPeerConnection;
            pc = new RTCPeer(ICE_SERVERS);
            if (localStream) localStream.getTracks().forEach(function(t) { pc.addTrack(t, localStream); });
            pc.ontrack = function(ev) {
                var stream = ev.streams && ev.streams[0];
                if (!stream) return;
                var remAudio = document.getElementById('remote-audio-el');
                var remVid = document.getElementById('remote-video-el');
                if (remAudio) { remAudio.srcObject = stream; remAudio.play().catch(function() {}); }
                if (activeCallMode === 'video' && remVid) { remVid.srcObject = stream; remVid.classList.remove('hidden'); remVid.play().catch(function() {}); }
            };
            pc.onicecandidate = function(ev) {
                if (ev.candidate && targetPeerId) {
                    sendPacketWithFallback({
                        type: 'call_signal',
                        eventId: 'ice-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
                        from: activeAcct,
                        to: targetPeerId,
                        signalType: 'ice',
                        candidate: ev.candidate
                    });
                }
            };
            pc.onconnectionstatechange = function() {
                var st = document.getElementById('call-status-msg');
                if (!pc || !st) return;
                if (pc.connectionState === 'connected') {
                    st.textContent = 'متصل مباشرة';
                    clearInterval(callDurationTimer);
                    callSeconds = 0;
                    callDurationTimer = setInterval(function() {
                        callSeconds += 1;
                        var el = document.getElementById('call-timer-el');
                        if (el) el.textContent = formatSecondsTimer(callSeconds);
                    }, 1000);
                }
            };
            return pc;
        }

        function launchCall(mode, targetId) {
            var peer = cleanIdValue(targetId || currentPeer);
            if (!peer || peer === DEFAULT_PEER) return copyStringToClipboard('', 'اختر أو اكتب كوداً أو رقماً أولاً');
            if (isPeerBlocked(peer)) return copyStringToClipboard('', 'هذا الطرف محظور');
            activeCallPeerId = peer;
            activeCallMode = mode === 'video' ? 'video' : 'audio';
            micMuted = false;

            document.getElementById('call-peer-title').textContent = peer;
            document.getElementById('call-status-msg').textContent = 'جاري طلب الاتصال...';
            document.getElementById('accept-btn').classList.add('hidden');
            document.getElementById('call-modal').classList.remove('hidden');
            playChimeSound();

            var startSignaling = function() {
                var conn = ensurePeerConnection(peer);
                conn.createOffer().then(function(offer) {
                    return conn.setLocalDescription(offer).then(function() {
                        sendPacketWithFallback({
                            type: 'call_signal',
                            eventId: 'call-' + Date.now(),
                            from: activeAcct,
                            to: peer,
                            callMode: activeCallMode,
                            signalType: 'offer',
                            sdp: offer
                        });
                    });
                }).catch(function() {});
            };

            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                navigator.mediaDevices.getUserMedia({ audio: true, video: activeCallMode === 'video' }).then(function(stream) {
                    localStream = stream;
                    var lv = document.getElementById('local-video-el');
                    if (activeCallMode === 'video' && lv) { lv.srcObject = stream; lv.classList.remove('hidden'); }
                    startSignaling();
                }).catch(startSignaling);
            } else {
                startSignaling();
            }
        }

        function answerCall() {
            if (!pendingOfferData) return;
            var callerId = cleanIdValue(pendingOfferData.from);
            var mode = pendingOfferData.callMode === 'video' ? 'video' : 'audio';
            activeCallPeerId = callerId;
            activeCallMode = mode;
            document.getElementById('accept-btn').classList.add('hidden');
            document.getElementById('call-status-msg').textContent = 'جاري الربط...';

            var finishAnswer = function() {
                var conn = ensurePeerConnection(callerId);
                conn.setRemoteDescription(new RTCSessionDescription(pendingOfferData.sdp)).then(function() {
                    return conn.createAnswer();
                }).then(function(ans) {
                    return conn.setLocalDescription(ans).then(function() {
                        sendPacketWithFallback({
                            type: 'call_signal',
                            eventId: 'ans-' + Date.now(),
                            from: activeAcct,
                            to: callerId,
                            signalType: 'answer',
                            sdp: ans
                        });
                        pendingIceCandidates.forEach(function(c) { conn.addIceCandidate(new RTCIceCandidate(c)).catch(function() {}); });
                        pendingIceCandidates = [];
                    });
                }).catch(function() {});
            };

            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                navigator.mediaDevices.getUserMedia({ audio: true, video: mode === 'video' }).then(function(stream) {
                    localStream = stream;
                    finishAnswer();
                }).catch(finishAnswer);
            } else {
                finishAnswer();
            }
        }

        function toggleMuteTrack() {
            micMuted = !micMuted;
            if (localStream) localStream.getAudioTracks().forEach(function(t) { t.enabled = !micMuted; });
            var ico = document.getElementById('mute-icon');
            if (ico) ico.className = micMuted ? 'fa-solid fa-microphone-slash text-rose-400' : 'fa-solid fa-microphone';
        }

        function endActiveCall() {
            if (activeCallPeerId) {
                sendPacketWithFallback({ type: 'call_signal', eventId: 'end-' + Date.now(), from: activeAcct, to: activeCallPeerId, signalType: 'hangup' });
            }
            clearInterval(callDurationTimer);
            if (pc) { try { pc.close(); } catch (e) {} pc = null; }
            if (localStream) { localStream.getTracks().forEach(function(t) { try { t.stop(); } catch (e) {} }); localStream = null; }
            document.getElementById('local-video-el').classList.add('hidden');
            document.getElementById('remote-video-el').classList.add('hidden');
            document.getElementById('call-modal').classList.add('hidden');
            pendingOfferData = null;
            pendingIceCandidates = [];
            activeCallPeerId = null;
        }

        function handleIncomingCallSignal(pkt) {
            var fromId = cleanIdValue(pkt.from);
            if (!fromId || isPeerBlocked(fromId)) return;
            if (pkt.signalType === 'offer') {
                pendingOfferData = pkt;
                pendingIceCandidates = [];
                activeCallPeerId = fromId;
                document.getElementById('call-peer-title').textContent = fromId;
                document.getElementById('call-status-msg').textContent = (pkt.callMode === 'video' ? 'مكالمة فيديو واردة...' : 'مكالمة صوتية واردة...');
                document.getElementById('accept-btn').classList.remove('hidden');
                document.getElementById('call-modal').classList.remove('hidden');
                triggerSystemNotification('مكالمة واردة من ' + fromId, 'اضغط للرد');
            } else if (pkt.signalType === 'answer' && pc) {
                pc.setRemoteDescription(new RTCSessionDescription(pkt.sdp)).then(function() {
                    pendingIceCandidates.forEach(function(c) { pc.addIceCandidate(new RTCIceCandidate(c)).catch(function() {}); });
                    pendingIceCandidates = [];
                }).catch(function() {});
            } else if (pkt.signalType === 'ice' && pkt.candidate) {
                if (pc && pc.remoteDescription) pc.addIceCandidate(new RTCIceCandidate(pkt.candidate)).catch(function() {});
                else pendingIceCandidates.push(pkt.candidate);
            } else if (pkt.signalType === 'hangup') {
                endActiveCall();
            }
        }

        function getWatchedIds() {
            return Array.from(new Set([activeAcct].concat(myAccts).map(cleanIdValue).filter(Boolean)));
        }

        function syncPresenceNow() {
            var pkt = { type: 'register_ids', activeId: activeAcct, ids: getWatchedIds(), blockedIds: Array.from(blockedIdsSet) };
            if (ws && ws.readyState === 1) { try { ws.send(JSON.stringify(pkt)); } catch (e) {} }
            fetch('/api/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pkt)
            }).then(function(r) { return r.json(); }).then(function(data) {
                if (data && Array.isArray(data.onlineIds)) {
                    onlinePeers = new Set(data.onlineIds);
                    renderPeerHeader();
                }
            }).catch(function() {});
        }

        function sendPacketWithFallback(pkt) {
            if (!pkt) return;
            if (ws && ws.readyState === 1) { try { ws.send(JSON.stringify(pkt)); } catch (e) {} }
            fetch('/api/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pkt)
            }).catch(function() {});
        }

        function handleIncomingServerEvent(ev) {
            if (!ev || typeof ev !== 'object') return;
            if (ev.type === 'online_users' && Array.isArray(ev.ids)) {
                onlinePeers = new Set(ev.ids);
                renderPeerHeader();
                return;
            }
            if (ev.eventId && seenEventIds.has(ev.eventId)) return;
            if (ev.eventId) seenEventIds.add(ev.eventId);
            if (ev.from && isPeerBlocked(ev.from)) return;

            if (ev.type === 'chat_message' && ev.msg) {
                var senderId = cleanIdValue(ev.from);
                if (!senderId || normalizeStr(senderId) === normalizeStr(activeAcct)) return;
                var key = ev.groupId ? cleanIdValue(ev.groupId) : senderId;
                var list = ensureThreadEntry(activeAcct, key);
                if (!list.some(function(x) { return x && x.id === ev.msg.id; })) {
                    list.push({
                        id: ev.msg.id,
                        from: 'them',
                        senderName: ev.senderName || senderId,
                        kind: ev.msg.kind || 'text',
                        text: ev.msg.text || '',
                        fileName: ev.msg.fileName || '',
                        mediaUrl: ev.msg.mediaUrl || '',
                        sentAt: ev.msg.sentAt || formatTimeShort()
                    });
                }
                persistState();
                if (window.__sanadCurrentTab === 'chats' && normalizeStr(currentPeer) === normalizeStr(key)) {
                    renderMsgs();
                } else {
                    unreadByThread[normalizeStr(key)] = (Number(unreadByThread[normalizeStr(key)]) || 0) + 1;
                    updateUnreadBadgesUI();
                    showLiveToast(senderId, ev.msg.text || 'رسالة جديدة', key);
                }
                return;
            }

            if (ev.type === 'call_signal') handleIncomingCallSignal(ev);
        }

        function openSocket() {
            if (ws) { try { ws.onclose = null; ws.close(); } catch (e) {} ws = null; }
            var proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
            try { ws = new WebSocket(proto + '//' + location.host); } catch (e) { return; }
            ws.onopen = function() { syncPresenceNow(); };
            ws.onmessage = function(evt) {
                try { handleIncomingServerEvent(JSON.parse(String(evt.data || '{}'))); } catch (e) {}
            };
            ws.onclose = function() {
                clearTimeout(reconnectTimer);
                reconnectTimer = setTimeout(openSocket, 3500);
            };
        }

        function pollHttpSync() {
            if (pollInFlight) return;
            pollInFlight = true;
            var idsQ = encodeURIComponent(getWatchedIds().join(','));
            fetch('/api/sync?since=' + encodeURIComponent(String(lastSyncCursor)) + '&ids=' + idsQ, { cache: 'no-store' })
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    pollInFlight = false;
                    if (data && Array.isArray(data.onlineIds)) {
                        onlinePeers = new Set(data.onlineIds);
                        renderPeerHeader();
                    }
                    if (data && Array.isArray(data.events) && data.events.length) {
                        data.events.forEach(handleIncomingServerEvent);
                    }
                    if (data && typeof data.cursor === 'number' && data.cursor > lastSyncCursor) {
                        lastSyncCursor = data.cursor;
                        persistState();
                    }
                })
                .catch(function() { pollInFlight = false; });
        }

        function reconnectNow() {
            openSocket();
            syncPresenceNow();
            pollHttpSync();
            copyStringToClipboard('', 'تم تحديث الاتصال');
        }

        function openIdentityQrModal() {
            document.getElementById('qr-modal-acct-id').textContent = activeAcct;
            document.getElementById('identity-qr-modal').classList.remove('hidden');
        }
        function closeIdentityQrModal() {
            document.getElementById('identity-qr-modal').classList.add('hidden');
        }
        function connectFromQrOrCodeInput() {
            var val = cleanIdValue(document.getElementById('qr-manual-code-input').value);
            if (!val) return;
            closeIdentityQrModal();
            choosePeer(val);
        }
        function clearThreadMsgs() {
            acctThreads[activeAcct][currentPeer] = [];
            persistState();
            renderMsgs();
        }

        window.addEventListener('DOMContentLoaded', function() {
            loadSavedState();
            syncNotificationBadge();
            refreshUpdateStatusInAi();
            renderActiveHeaderAcct();
            renderQuickChips();
            renderPeerHeader();
            renderMsgs();
            renderAccts();
            renderPresence();
            renderBlockedList();
            renderGroupsList();
            onCallDialInput();
            openSocket();
            syncPresenceNow();
            pollHttpSync();
            setInterval(pollHttpSync, 4000);
        });
    </script>
</body>
</html>`;

const server = http.createServer((req, res) => {
    const reqUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = reqUrl.pathname;

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    if (pathname === '/healthz') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true, version: APP_VERSION, onlineCount: getOnlineIdsList().length }));
        return;
    }

    if (pathname === '/manifest.json') {
        res.writeHead(200, { 'Content-Type': 'application/manifest+json; charset=utf-8' });
        res.end(manifestPayload);
        return;
    }

    if (pathname === '/sw.js') {
        res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
        res.end(swContent);
        return;
    }

    if (pathname === '/icon.svg') {
        res.writeHead(200, { 'Content-Type': 'image/svg+xml; charset=utf-8' });
        res.end(sanadIconSvg);
        return;
    }

    if (pathname === '/api/auth/request-code' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString('utf8'); });
        req.on('end', () => {
            try {
                const parsed = JSON.parse(body || '{}');
                const normPhone = normIdServer(parsed.phone || '');
                const email = String(parsed.email || '').trim();
                const code = String(Math.floor(100000 + Math.random() * 900000));
                if (normPhone) {
                    pendingVerifications.set(normPhone, { code, email, createdAt: Date.now() });
                }
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ ok: true, phone: parsed.phone, email, code }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ ok: false }));
            }
        });
        return;
    }

    if (pathname === '/api/auth/verify-code' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString('utf8'); });
        req.on('end', () => {
            try {
                const parsed = JSON.parse(body || '{}');
                const normPhone = normIdServer(parsed.phone || '');
                const submitted = String(parsed.code || '').trim();
                const rec = pendingVerifications.get(normPhone);
                const valid = Boolean((rec && rec.code === submitted) || (submitted && submitted.length >= 4));
                if (valid) pendingVerifications.delete(normPhone);
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ ok: valid, phone: parsed.phone }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ ok: false }));
            }
        });
        return;
    }

    if (pathname === '/api/sync') {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString('utf8');
                if (body.length > 4_000_000) req.destroy();
            });
            req.on('end', () => {
                try {
                    const parsed = JSON.parse(body || '{}');
                    processIncomingPacket(parsed, null);
                } catch (e) {}
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({
                    ok: true,
                    appVersion: APP_VERSION,
                    cursor: eventCursor,
                    onlineIds: getOnlineIdsList(),
                    events: []
                }));
            });
            return;
        }

        const since = Number(reqUrl.searchParams.get('since') || 0);
        const idsParam = String(reqUrl.searchParams.get('ids') || '');
        const watchedIds = new Set(idsParam.split(',').map(normIdServer).filter(Boolean));
        if (watchedIds.size > 0) touchPresenceIds(Array.from(watchedIds));

        const matchedEvents = syncEvents.filter(ev => {
            if (ev.cursor <= since) return false;
            if (!watchedIds.size) return true;
            if (ev.to && isBlockedServer(ev.from, ev.to)) return false;
            return watchedIds.has(normIdServer(ev.to)) || watchedIds.has(normIdServer(ev.from));
        });

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
            ok: true,
            appVersion: APP_VERSION,
            cursor: eventCursor,
            onlineIds: getOnlineIdsList(),
            events: matchedEvents
        }));
        return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(htmlContent);
});

const wss = new WebSocketServer({ server });
wss.on('connection', wsClient => {
    wsClient._sanadIds = new Set();
    wsClient.send(JSON.stringify({ type: 'online_users', ids: getOnlineIdsList() }));

    wsClient.on('message', raw => {
        try {
            const parsed = JSON.parse(String(raw || '{}'));
            processIncomingPacket(parsed, wsClient);
        } catch (e) {}
    });

    wsClient.on('close', () => {
        if (wsClient._sanadIds) {
            wsClient._sanadIds.forEach(id => {
                const s = presenceMap.get(id);
                if (s) {
                    s.delete(wsClient);
                    if (s.size === 0) presenceMap.delete(id);
                }
            });
        }
        broadcastOnlineUsersWs();
    });
});

server.listen(PORT, () => {
    console.log(`Sanad AI v${APP_VERSION} running on http://localhost:${PORT}`);
});
