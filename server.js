const http = require('http');
const { WebSocketServer } = require('ws');

const APP_VERSION = '12.0.0';
const PORT = process.env.PORT || 3000;
const ICON_BG_HEX = '#164e63';
const ICON_ACCENT_HEX = '#f0fdfa';
const ICON_SUB_HEX = '#0f3646';

function toWesternDigitsServer(str) {
    return String(str === undefined || str === null ? '' : str)
        .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 1632))
        .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 1776));
}

function normIdServer(v) {
    return toWesternDigitsServer(v).trim().toLowerCase();
}

const presenceMap = new Map();
const syncEvents = [];
let eventCursor = 0;

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
    return item;
}

function getOnlineIdsList() {
    const ids = [];
    presenceMap.forEach((sockets, id) => {
        if (sockets && sockets.size > 0) ids.push(id);
    });
    return ids;
}

function broadcastOnlineUsersWs() {
    const packet = JSON.stringify({ type: 'online_users', ids: getOnlineIdsList() });
    wss.clients.forEach(client => {
        if (client.readyState === 1) {
            try { client.send(packet); } catch (e) {}
        }
    });
}

function deliverToPeerWs(targetId, payload) {
    const normTarget = normIdServer(targetId);
    if (!normTarget) return;
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

    if (payload.type === 'register_ids') {
        const ids = Array.isArray(payload.ids) ? payload.ids.slice() : [];
        if (payload.activeId) ids.unshift(payload.activeId);
        const cleanSet = new Set(ids.map(normIdServer).filter(Boolean));
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
        broadcastOnlineUsersWs();
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
    <radialGradient id="aiSparkGrad" cx="45%" cy="45%" r="55%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="55%" stop-color="#ccfbf1"/>
      <stop offset="100%" stop-color="${ICON_BG_HEX}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" fill="url(#sanadBgGrad)"/>
  <g stroke="rgba(240,253,250,0.14)" stroke-width="2" fill="rgba(240,253,250,0.28)">
    <line x1="72" y1="88" x2="164" y2="62"/>
    <line x1="164" y1="62" x2="118" y2="168"/>
    <line x1="72" y1="88" x2="118" y2="168"/>
    <line x1="392" y1="82" x2="446" y2="164"/>
    <line x1="392" y1="82" x2="352" y2="176"/>
    <line x1="96" y1="336" x2="168" y2="288"/>
    <line x1="418" y1="312" x2="348" y2="274"/>
    <circle cx="72" cy="88" r="4.5"/>
    <circle cx="164" cy="62" r="4.5"/>
    <circle cx="118" cy="168" r="4.5"/>
    <circle cx="392" cy="82" r="4.5"/>
    <circle cx="446" cy="164" r="4.5"/>
    <circle cx="352" cy="176" r="4.5"/>
    <circle cx="96" cy="336" r="4.5"/>
    <circle cx="418" cy="312" r="4.5"/>
  </g>
  <text x="256" y="218" text-anchor="middle" fill="${ICON_ACCENT_HEX}" font-family="'IBM Plex Sans Arabic', 'Cairo', 'Tahoma', sans-serif" font-size="168" font-weight="700">س</text>
  <circle cx="182" cy="196" r="24" fill="url(#aiSparkGrad)"/>
  <path d="M126 246c22 52 78 78 134 78 58 0 112-26 136-78-30 16-66 34-106 34-26 0-48-8-64-16 26 2 52-4 72-14-36 4-76-2-104-20-26 12-48 14-68 14z" fill="none" stroke="${ICON_ACCENT_HEX}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="256" y="424" text-anchor="middle" fill="${ICON_ACCENT_HEX}" font-family="'IBM Plex Sans Arabic', 'Cairo', 'Tahoma', sans-serif" font-size="88" font-weight="700">سند</text>
</svg>`;

const manifestPayload = JSON.stringify({
  name: `Sanad AI v${APP_VERSION} - سند`,
  short_name: 'سند AI',
  description: 'تطبيق سند AI للتواصل الذكي والمحادثات والمكالمات الفردية والجماعية والعمل بدون إنترنت والمساعدة الصوتية والذكاء الاصطناعي',
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
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (res && res.ok && url.origin === self.location.origin) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => new Response('', { status: 503 }));
    })
  );
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
    <link rel="manifest" href="/manifest.json">
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Cairo:wght@600;700;800&display=swap');
        body {
            font-family: 'IBM Plex Sans Arabic', 'Cairo', sans-serif;
            background: radial-gradient(circle at top, #102436 0%, #09111b 55%, #070d14 100%);
            color: #eef5fa;
            line-height: 1.55;
        }
        button, a { touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e6078; border-radius: 9999px; }
        .sanad-pane { display: none; height: 100%; width: 100%; overflow-y: auto; }
        .sanad-pane.sanad-pane-active { display: flex; flex-direction: column; }
        .msg-highlight-pulse { animation: sanadPulse 1.4s ease; }
        @keyframes sanadPulse {
            0% { box-shadow: 0 0 0 0 rgba(45, 212, 191, 0.75); }
            100% { box-shadow: 0 0 0 12px rgba(45, 212, 191, 0); }
        }
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
            if (converted !== el.value) {
                var pos = el.selectionStart;
                el.value = converted;
                try {
                    if (typeof pos === 'number') el.setSelectionRange(pos, pos);
                } catch (e) {}
            }
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
                .replace(/\\n/g, ' ')
                .replace(/\\r/g, '');
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
                        ? 'relative flex flex-col items-center gap-0.5 text-teal-300 font-bold text-[10px] px-1 py-1 whitespace-nowrap shrink-0 cursor-pointer'
                        : 'relative flex flex-col items-center gap-0.5 text-slate-400 font-medium text-[10px] px-1 py-1 whitespace-nowrap shrink-0 cursor-pointer';
                }
            }
            var tabBadge = document.getElementById('current-tab-badge');
            if (tabBadge) tabBadge.textContent = SANAD_TAB_LABELS[target];
        }

        function setPane(p) {
            var target = SANAD_TAB_LABELS[p] ? p : 'chats';
            applySanadPaneDisplay(target);
            try {
                if (location.hash !== '#tab-' + target) {
                    history.replaceState(null, '', '#tab-' + target);
                }
            } catch (e) {}
            if (typeof onSanadTabActivated === 'function') {
                setTimeout(function() {
                    try { onSanadTabActivated(target); } catch (e) {}
                }, 0);
            }
        }

        window.addEventListener('hashchange', function() {
            var h = String(location.hash || '').replace(/^#tab-/, '');
            if (SANAD_TAB_LABELS[h]) setPane(h);
        });
    </script>

    <audio id="remote-audio-el" autoplay playsinline class="hidden"></audio>

    <header class="bg-[#0d1926]/95 border-b border-slate-800/80 px-3.5 py-2 flex justify-between items-center z-20 shrink-0">
        <div class="flex items-center gap-2.5 min-w-0">
            <div class="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-[#1e6078] via-[#164e63] to-[#0f3646] border border-teal-300/30 flex flex-col items-center justify-center shrink-0 shadow">
                <span class="text-teal-50 font-bold text-base leading-none">س</span>
                <span class="text-[8px] font-semibold text-teal-200 leading-tight mt-0.5">سند</span>
                <span id="header-unread-dot" class="hidden absolute -top-1.5 -left-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-mono font-bold flex items-center justify-center shadow">0</span>
            </div>
            <div class="min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                    <h1 class="font-bold text-base text-white leading-none">سند</h1>
                    <span class="text-[10px] bg-teal-950/80 text-teal-200 border border-teal-800/60 px-2 py-0.5 rounded-full font-semibold">AI v${APP_VERSION}</span>
                    <span id="current-tab-badge" class="text-[10px] bg-slate-800/90 text-slate-200 border border-slate-700/80 px-2 py-0.5 rounded-full font-semibold">الدردشة</span>
                    <span id="device-badge" class="text-[10px] bg-slate-800/90 text-slate-300 border border-slate-700/60 px-2 py-0.5 rounded-full font-medium">جهاز</span>
                    <span id="net-badge" class="text-[10px] bg-slate-800/90 text-sky-200 border border-sky-800/50 px-2 py-0.5 rounded-full font-semibold">وضع مرن</span>
                </div>
                <div class="flex items-center gap-1.5 text-[11px] mt-0.5 flex-wrap">
                    <span id="ws-dot" class="w-2 h-2 rounded-full bg-amber-300"></span>
                    <span id="ws-label" class="text-amber-200 font-medium">جاري الاتصال...</span>
                    <button type="button" onclick="reconnectNow()" title="تحديث الربط" class="text-slate-300 hover:text-white px-1">
                        <i class="fa-solid fa-rotate-right text-[10px]"></i>
                    </button>
                    <span id="queue-badge" class="hidden text-[10px] bg-amber-950/80 text-amber-200 border border-amber-800/50 px-1.5 rounded font-mono">0 معلّق</span>
                    <span class="text-slate-600">•</span>
                    <span id="active-acct-label" class="font-mono font-semibold text-slate-200"></span>
                </div>
            </div>
        </div>

        <div class="flex items-center gap-1.5 shrink-0">
            <button type="button" onclick="openAssistedVoiceHub()" title="مساعدة صوتية" class="px-2.5 h-9 rounded-xl bg-emerald-950/80 hover:bg-emerald-800 border border-emerald-700/60 text-emerald-200 hover:text-white flex items-center gap-1 text-[11px] font-semibold transition">
                <i class="fa-solid fa-ear-listen text-xs"></i><span>صوتي</span>
            </button>
            <button type="button" onclick="launchCall('audio')" title="مكالمة صوتية" class="w-9 h-9 rounded-xl bg-teal-950/70 hover:bg-teal-800 border border-teal-800/60 text-teal-200 hover:text-white flex items-center justify-center transition">
                <i class="fa-solid fa-phone text-xs"></i>
            </button>
            <button type="button" onclick="launchCall('video')" title="مكالمة فيديو" class="w-9 h-9 rounded-xl bg-sky-950/70 hover:bg-sky-800 border border-sky-800/60 text-sky-200 hover:text-white flex items-center justify-center transition">
                <i class="fa-solid fa-video text-xs"></i>
            </button>
        </div>
    </header>

    <div id="offline-banner" class="hidden bg-amber-950/90 border-b border-amber-800/70 px-3.5 py-1.5 text-[11px] text-amber-100 flex items-center justify-between gap-2 shrink-0">
        <span><i class="fa-solid fa-plane-slash ml-1"></i> وضع بدون إنترنت -- السجل محفوظ محلياً والرسائل تُرسل تلقائياً فور عودة الشبكة.</span>
        <button type="button" onclick="reconnectNow()" class="bg-amber-800/80 px-2 py-0.5 rounded text-[10px] font-semibold shrink-0">فحص الشبكة</button>
    </div>

    <div id="copy-toast-banner" class="hidden fixed top-14 left-1/2 -translate-x-1/2 bg-teal-900/95 border border-teal-500/50 text-teal-50 px-4 py-1.5 rounded-full shadow-xl z-50 text-[11px] font-semibold">
        تم النسخ إلى الحافظة
    </div>

    <div id="live-toast" onclick="jumpToToastChat()" class="hidden fixed top-16 left-3 right-3 max-w-md mx-auto bg-[#0d1926]/95 border border-teal-800/70 text-slate-100 px-3.5 py-2.5 rounded-2xl shadow-2xl z-40 flex items-center justify-between gap-2 cursor-pointer text-xs">
        <div class="min-w-0">
            <p id="toast-sender" class="font-bold text-teal-200 truncate">رسالة جديدة</p>
            <p id="toast-body" class="text-slate-200 truncate">...</p>
        </div>
        <span class="bg-teal-950 text-teal-200 border border-teal-800/60 px-2 py-1 rounded-lg text-[10px] font-semibold shrink-0">فتح</span>
    </div>

    <!-- النوافذ المنبثقة -->
    <div id="assisted-voice-modal" onclick="if(event.target===this)closeAssistedVoiceHub()" class="hidden fixed inset-0 bg-[#070d14]/85 z-50 flex items-center justify-center p-3.5">
        <div class="bg-[#0d1926] border border-teal-700/60 rounded-3xl w-full max-w-md p-4 space-y-3 shadow-2xl">
            <div class="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div>
                    <h3 class="text-sm font-bold text-teal-200"><i class="fa-solid fa-hands-asl-interpreting ml-1"></i> المساعدة الصوتية والذكية</h3>
                    <p class="text-[11px] text-slate-400">قراءة الرسائل بالصوت، الإملاء الصوتي، وتبسيط أو صياغة النصوص.</p>
                </div>
                <button type="button" onclick="closeAssistedVoiceHub()" class="text-slate-400 hover:text-white text-sm"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div class="grid grid-cols-2 gap-2 text-xs">
                <button type="button" onclick="readLastIncomingMessageAloud()" class="bg-emerald-800 hover:bg-emerald-700 text-white py-3 px-3 rounded-2xl font-semibold flex flex-col items-center gap-1">
                    <i class="fa-solid fa-volume-high text-base"></i><span>اقرأ آخر رسالة واردة</span>
                </button>
                <button type="button" onclick="readWholeThreadAloud()" class="bg-teal-800 hover:bg-teal-700 text-white py-3 px-3 rounded-2xl font-semibold flex flex-col items-center gap-1">
                    <i class="fa-solid fa-book-open-reader text-base"></i><span>اقرأ المحادثة صوتياً</span>
                </button>
                <button type="button" onclick="closeAssistedVoiceHub(); toggleSpeechDictation();" class="bg-[#164e63] hover:bg-[#1e6078] text-white py-3 px-3 rounded-2xl font-semibold flex flex-col items-center gap-1">
                    <i class="fa-solid fa-microphone-lines text-base"></i><span>تحدث لأكتب رسالتك</span>
                </button>
                <button type="button" onclick="stopSpeechReading()" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-200 py-3 px-3 rounded-2xl font-semibold flex flex-col items-center gap-1">
                    <i class="fa-solid fa-stop text-base"></i><span>إيقاف القراءة الصوتية</span>
                </button>
            </div>
            <div class="bg-[#08101a] border border-slate-800 rounded-2xl p-3 space-y-2 text-xs">
                <p class="font-semibold text-teal-200">مساعدة الذكاء الاصطناعي للنص الحالي أو الرسالة المحددة:</p>
                <div class="flex flex-wrap gap-1.5">
                    <button type="button" onclick="aiTransformCurrentDraft('simplify')" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-200 px-2.5 py-1.5 rounded-xl font-semibold">تبسيط بلغة سهلة</button>
                    <button type="button" onclick="aiTransformCurrentDraft('formal')" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-200 px-2.5 py-1.5 rounded-xl font-semibold">صياغة رسمية مرتبة</button>
                    <button type="button" onclick="aiTransformCurrentDraft('summarize')" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-200 px-2.5 py-1.5 rounded-xl font-semibold">تلخيص سريع</button>
                    <button type="button" onclick="readCurrentDraftAloud()" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-teal-200 px-2.5 py-1.5 rounded-xl font-semibold">اسمع ما كتبته</button>
                </div>
            </div>
        </div>
    </div>

    <div id="long-msg-reader-modal" onclick="if(event.target===this)closeLongMsgReader()" class="hidden fixed inset-0 bg-[#070d14]/85 z-50 flex items-center justify-center p-4">
        <div class="bg-[#0d1926] border border-slate-700 rounded-3xl w-full max-w-lg max-h-[82vh] flex flex-col shadow-2xl overflow-hidden">
            <div class="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <span id="long-msg-reader-title" class="text-xs font-bold text-teal-200">قراءة الرسالة كاملة</span>
                <div class="flex items-center gap-2">
                    <button type="button" id="long-msg-reader-speak-btn" class="bg-teal-900 hover:bg-teal-800 text-teal-100 px-2.5 py-1 rounded-lg text-[11px] font-semibold">
                        <i class="fa-solid fa-volume-high ml-1"></i>استماع
                    </button>
                    <button type="button" onclick="closeLongMsgReader()" class="text-slate-400 hover:text-white text-sm"><i class="fa-solid fa-xmark"></i></button>
                </div>
            </div>
            <div id="long-msg-reader-body" class="p-4 overflow-y-auto text-sm leading-relaxed text-slate-100 whitespace-pre-wrap custom-scrollbar"></div>
        </div>
    </div>

    <div id="composer-expand-modal" onclick="if(event.target===this)closeComposerExpand()" class="hidden fixed inset-0 bg-[#070d14]/85 z-50 flex items-center justify-center p-4">
        <div class="bg-[#0d1926] border border-teal-700/60 rounded-3xl w-full max-w-lg p-4 space-y-3 shadow-2xl">
            <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                <span class="text-xs font-bold text-teal-200"><i class="fa-solid fa-expand ml-1"></i> مراجعة وتحرير الرسالة قبل الإرسال</span>
                <button type="button" onclick="closeComposerExpand()" class="text-slate-400 hover:text-white text-sm"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <textarea id="expanded-composer-textarea" rows="7" oninput="syncFromExpandedComposer()" placeholder="اكتب رسالتك وراجعها بوضوح هنا..." class="w-full bg-[#08101a] border border-slate-700 rounded-2xl p-3 text-sm leading-relaxed text-white focus:outline-none focus:border-teal-500 custom-scrollbar"></textarea>
            <div class="flex flex-wrap gap-1.5 text-[11px]">
                <button type="button" onclick="aiTransformExpanded('simplify')" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-200 px-2.5 py-1 rounded-xl font-semibold">تبسيط</button>
                <button type="button" onclick="aiTransformExpanded('formal')" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-200 px-2.5 py-1 rounded-xl font-semibold">رسمي</button>
                <button type="button" onclick="aiTransformExpanded('summarize')" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-200 px-2.5 py-1 rounded-xl font-semibold">تلخيص</button>
                <button type="button" onclick="speakText(document.getElementById('expanded-composer-textarea').value)" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-teal-200 px-2.5 py-1 rounded-xl font-semibold"><i class="fa-solid fa-volume-high ml-1"></i>قراءة صوتية</button>
            </div>
            <div class="flex justify-end gap-2 pt-1">
                <button type="button" onclick="closeComposerExpand()" class="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-xs font-semibold">تم</button>
                <button type="button" onclick="closeComposerExpand(); sendTextMsg();" class="bg-[#164e63] hover:bg-[#1e6078] text-white px-5 py-2 rounded-xl text-xs font-semibold">إرسال الآن</button>
            </div>
        </div>
    </div>

    <div id="msg-context-modal" onclick="if(event.target===this)closeMsgContextMenu()" class="hidden fixed inset-0 bg-[#070d14]/75 z-50 flex items-end sm:items-center justify-center p-3">
        <div class="bg-[#0d1926] border border-slate-700/80 rounded-2xl w-full max-w-xs p-3 space-y-1.5 shadow-2xl">
            <div class="px-2 py-1 border-b border-slate-800 flex items-center justify-between">
                <span class="text-xs font-bold text-teal-200">خيارات الرسالة</span>
                <button type="button" onclick="closeMsgContextMenu()" class="text-slate-400 hover:text-white text-xs"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <button type="button" id="ctx-reply-btn" onclick="ctxReplyAction()" class="w-full text-right px-3 py-2.5 rounded-xl hover:bg-slate-800 text-xs font-semibold text-teal-200 flex items-center gap-2.5">
                <i class="fa-solid fa-reply text-teal-300 w-4"></i><span>رد على الرسالة</span>
            </button>
            <button type="button" id="ctx-copy-btn" onclick="ctxCopyAction()" class="w-full text-right px-3 py-2.5 rounded-xl hover:bg-slate-800 text-xs font-semibold text-slate-100 flex items-center gap-2.5">
                <i class="fa-solid fa-copy text-teal-300 w-4"></i><span>نسخ النص</span>
            </button>
            <button type="button" id="ctx-paste-btn" onclick="ctxPasteAction()" class="w-full text-right px-3 py-2.5 rounded-xl hover:bg-slate-800 text-xs font-semibold text-slate-100 flex items-center gap-2.5">
                <i class="fa-solid fa-paste text-emerald-300 w-4"></i><span>لصق في حقل الإرسال</span>
            </button>
            <button type="button" id="ctx-edit-btn" onclick="ctxEditAction()" class="w-full text-right px-3 py-2.5 rounded-xl hover:bg-slate-800 text-xs font-semibold text-sky-200 flex items-center gap-2.5">
                <i class="fa-solid fa-pen text-sky-300 w-4"></i><span>تعديل الرسالة</span>
            </button>
            <button type="button" id="ctx-pin-btn" onclick="ctxPinAction()" class="w-full text-right px-3 py-2.5 rounded-xl hover:bg-slate-800 text-xs font-semibold text-amber-200 flex items-center gap-2.5">
                <i class="fa-solid fa-thumbtack text-amber-300 w-4"></i><span>تثبيت الرسالة</span>
            </button>
            <button type="button" id="ctx-speak-btn" onclick="ctxSpeakAction()" class="w-full text-right px-3 py-2.5 rounded-xl hover:bg-slate-800 text-xs font-semibold text-slate-100 flex items-center gap-2.5">
                <i class="fa-solid fa-volume-high text-teal-200 w-4"></i><span>استماع صوتي</span>
            </button>
            <button type="button" id="ctx-delete-btn" onclick="ctxDeleteAction()" class="w-full text-right px-3 py-2.5 rounded-xl hover:bg-rose-950/60 text-xs font-semibold text-rose-300 flex items-center gap-2.5">
                <i class="fa-solid fa-trash text-rose-400 w-4"></i><span>حذف الرسالة</span>
            </button>
        </div>
    </div>

    <div id="call-modal" class="hidden fixed inset-0 bg-[#070d14]/95 z-50 flex flex-col items-center justify-between p-4">
        <div class="text-center mt-1">
            <p class="text-xs text-teal-300 font-semibold">سند AI v${APP_VERSION} • اتصال واضح ومستقر</p>
            <h2 id="call-peer-title" class="text-lg font-bold text-white font-mono mt-0.5">...</h2>
            <p id="call-timer-el" class="text-xs font-mono font-semibold text-slate-300 mt-0.5">00:00</p>
            <p id="call-status-msg" class="text-xs text-emerald-300 mt-0.5 font-medium">جاري الاتصال...</p>
            <p id="call-output-hint" class="text-[10px] text-slate-400 mt-0.5">مخرج الصوت: مكبر الصوت</p>
            <div id="call-participants-bar" class="hidden flex flex-wrap justify-center gap-1.5 mt-1.5 max-w-sm mx-auto"></div>
        </div>
        <div class="relative w-full max-w-sm flex-1 my-2.5 max-h-[64vh] aspect-[9/16] bg-[#0d1926] rounded-3xl border border-slate-800 overflow-hidden flex items-center justify-center shadow-2xl">
            <video id="remote-video-el" autoplay playsinline class="w-full h-full object-cover hidden"></video>
            <video id="local-video-el" autoplay playsinline muted class="w-24 h-36 object-cover rounded-2xl border-2 border-teal-400/70 shadow-lg absolute bottom-3 left-3 hidden"></video>
            <div id="voice-call-card" class="flex flex-col items-center gap-2.5 px-4 text-center">
                <div class="w-20 h-20 rounded-full bg-teal-950/80 border border-teal-800/60 flex items-center justify-center text-3xl text-teal-200 animate-pulse">
                    <i class="fa-solid fa-microphone-lines"></i>
                </div>
                <span id="call-mode-label" class="text-xs text-slate-300 font-medium">مكالمة صوتية مباشرة • أولوية جودة الصوت</span>
                <button type="button" onclick="forceUnmuteAudio()" class="bg-slate-800 border border-slate-700 text-emerald-300 px-3 py-1 rounded-xl text-[11px] font-semibold">
                    <i class="fa-solid fa-volume-high ml-1"></i> تنشيط الصوت
                </button>
            </div>
        </div>
        <div class="flex items-center gap-2 mb-2 flex-wrap justify-center">
            <button type="button" id="accept-btn" onclick="answerCall()" class="hidden bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-3 rounded-2xl font-semibold text-xs shadow-lg animate-bounce">
                <i class="fa-solid fa-phone ml-1"></i> رد الآن
            </button>
            <button type="button" id="speaker-toggle-btn" onclick="toggleSpeakerOrEarpiece()" class="px-3 h-11 rounded-2xl bg-slate-800 border border-slate-700 text-slate-200 flex items-center gap-1.5 text-[11px] font-semibold">
                <i id="speaker-toggle-icon" class="fa-solid fa-volume-high"></i><span id="speaker-btn-label">مكبر</span>
            </button>
            <button type="button" id="switch-cam-btn" onclick="switchCameraFacing()" class="w-11 h-11 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 flex items-center justify-center">
                <i class="fa-solid fa-camera-rotate"></i>
            </button>
            <button type="button" id="mute-btn" onclick="toggleMuteTrack()" class="w-11 h-11 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white flex items-center justify-center">
                <i id="mute-icon" class="fa-solid fa-microphone"></i>
            </button>
            <button type="button" onclick="endActiveCall()" class="bg-rose-800 hover:bg-rose-700 text-white px-4 py-3 rounded-2xl font-semibold text-xs shadow-lg">
                <i class="fa-solid fa-phone-slash ml-1"></i> إنهاء
            </button>
        </div>
    </div>

    <div id="delete-modal" class="hidden fixed inset-0 bg-[#070d14]/80 z-50 flex items-center justify-center p-4">
        <div class="bg-[#0d1926] border border-slate-800 rounded-2xl w-full max-w-xs p-4 space-y-3 shadow-2xl">
            <h3 class="text-sm font-bold text-white">خيارات حذف الرسالة</h3>
            <button type="button" onclick="confirmDeleteChoice('me')" class="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 py-2.5 rounded-xl text-xs font-semibold">حذف من عندي فقط</button>
            <button type="button" id="del-everyone-btn" onclick="confirmDeleteChoice('all')" class="w-full bg-rose-800 hover:bg-rose-700 text-white py-2.5 rounded-xl text-xs font-semibold">حذف عند الجميع</button>
            <button type="button" onclick="closeDeleteModal()" class="w-full text-slate-400 hover:text-white py-1.5 text-xs">إلغاء</button>
        </div>
    </div>

    <main class="flex-1 flex flex-col overflow-hidden">
        <section id="pane-chats" class="sanad-pane sanad-pane-active flex-1 flex-col h-full overflow-hidden">
            <div id="chat-top-utility" class="p-2 bg-[#0d1926]/90 border-b border-slate-800/80 space-y-1.5 shrink-0 transition-all">
                <div class="flex gap-2">
                    <input type="text" id="peer-input" oninput="normalizeDigitsInInput(this); onTopPeerSearchInput();" onkeydown="if(event.key==='Enter'){event.preventDefault();openPeerByInput();}" placeholder="اكتب الاسم أو الكود أو الرقم ليظهر تلقائياً..." class="flex-1 bg-[#08101a] border border-slate-800 rounded-xl px-3 py-1.5 text-xs md:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-teal-600">
                    <button type="button" onclick="openPeerByInput()" class="bg-[#164e63] hover:bg-[#1e6078] text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold transition">فتح</button>
                    <button type="button" onclick="saveCurrentPeer()" title="حفظ في الجهات" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-2.5 py-1.5 rounded-xl text-xs font-semibold">
                        <i class="fa-solid fa-user-plus"></i>
                    </button>
                </div>
                <div id="quick-chips" class="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs"></div>
            </div>

            <div class="px-3.5 py-1.5 bg-[#0b1521] border-b border-slate-800/80 flex justify-between items-center gap-2 text-xs shrink-0">
                <div class="flex items-center gap-2 min-w-0">
                    <span id="peer-dot" class="w-2.5 h-2.5 rounded-full bg-slate-600 shrink-0"></span>
                    <span id="peer-title" class="font-semibold text-slate-100 font-mono truncate">خدمة العملاء</span>
                    <span id="peer-status" class="text-[11px] font-semibold text-slate-400 shrink-0 whitespace-nowrap">غير متصل</span>
                </div>
                <div class="flex items-center gap-2 shrink-0 text-[11px]">
                    <button type="button" onclick="toggleChatUtilityBar()" class="text-teal-200 hover:text-white px-1"><i class="fa-solid fa-sliders"></i></button>
                    <button type="button" onclick="readLastIncomingMessageAloud()" class="text-emerald-300 hover:text-emerald-200 font-medium whitespace-nowrap"><i class="fa-solid fa-volume-high ml-0.5"></i>اسمع</button>
                    <button type="button" onclick="toggleThreadSearchBar()" class="text-slate-300 hover:text-white px-1"><i class="fa-solid fa-magnifying-glass"></i></button>
                    <button type="button" onclick="launchCall('audio')" class="text-emerald-300 hover:text-emerald-200 px-1"><i class="fa-solid fa-phone"></i></button>
                    <button type="button" onclick="launchCall('video')" class="text-teal-200 hover:text-white px-1"><i class="fa-solid fa-video"></i></button>
                    <button type="button" onclick="summarizeCurrentThread()" class="text-slate-200 hover:text-white font-medium whitespace-nowrap">تلخيص</button>
                    <button type="button" onclick="shareInviteLink()" class="text-slate-200 hover:text-white font-medium whitespace-nowrap">دعوة</button>
                    <button type="button" onclick="clearThreadMsgs()" class="text-rose-300 hover:text-rose-200 font-medium whitespace-nowrap">مسح</button>
                </div>
            </div>

            <div id="pinned-msg-banner" class="hidden px-3.5 py-1.5 bg-[#0d1926] border-b border-teal-800/50 flex items-center justify-between gap-2 text-[11px] shrink-0">
                <div class="flex items-center gap-1.5 min-w-0">
                    <i class="fa-solid fa-thumbtack text-teal-300 shrink-0"></i>
                    <span id="pinned-msg-text" class="text-slate-200 truncate"></span>
                </div>
                <button type="button" onclick="unpinCurrentThreadMsg()" class="text-teal-300 hover:text-white text-[10px] shrink-0">إلغاء التثبيت</button>
            </div>

            <div id="thread-search-bar" class="hidden px-3 py-2 bg-[#0d1926] border-b border-slate-800 flex items-center gap-2 text-xs shrink-0">
                <i class="fa-solid fa-magnifying-glass text-teal-300"></i>
                <input type="text" id="thread-search-input" oninput="normalizeDigitsInInput(this); renderMsgs();" placeholder="ابحث داخل رسائل هذه المحادثة..." class="flex-1 bg-[#08101a] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-teal-600">
                <span id="thread-search-count" class="text-[10px] font-mono text-slate-300 shrink-0">0 نتيجة</span>
                <button type="button" onclick="closeThreadSearchBar()" class="text-slate-400 hover:text-white px-1.5"><i class="fa-solid fa-xmark"></i></button>
            </div>

            <div id="msgs-box" onscroll="handleMsgsScroll(this)" class="flex-1 overflow-y-auto p-3.5 space-y-3 custom-scrollbar"></div>

            <div id="voice-draft-bar" class="hidden px-3.5 py-2 bg-teal-950/90 border-t border-teal-700/70 flex items-center justify-between gap-2 text-xs shrink-0">
                <div class="flex items-center gap-2 min-w-0">
                    <i class="fa-solid fa-microphone-lines text-teal-200 shrink-0"></i>
                    <span id="voice-draft-label" class="font-semibold text-teal-100 truncate">تسجيل صوتي جاهز</span>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                    <button type="button" onclick="previewRecordedVoiceDraft()" class="bg-slate-800 hover:bg-slate-700 text-teal-200 px-2.5 py-1 rounded-lg text-[11px] font-semibold">استماع</button>
                    <button type="button" onclick="discardRecordedVoiceDraft()" class="bg-rose-900/90 hover:bg-rose-800 text-rose-100 px-2.5 py-1 rounded-lg text-[11px] font-semibold">إلغاء</button>
                    <button type="button" onclick="sendRecordedVoiceDraft()" class="bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1 rounded-lg text-[11px] font-semibold">إرسال</button>
                </div>
            </div>

            <div id="replying-msg-banner" class="hidden px-3.5 py-2 bg-[#0c1a28] border-t border-teal-700/70 flex items-center justify-between gap-2 text-xs shrink-0">
                <div class="border-r-2 border-teal-400 pr-2.5 min-w-0">
                    <p id="replying-to-label" class="text-[10px] font-bold text-teal-300 truncate">رد على رسالة</p>
                    <p id="replying-to-snippet" class="text-[11px] text-slate-200 truncate">...</p>
                </div>
                <button type="button" onclick="cancelReplyMessage()" class="text-slate-300 hover:text-white px-1.5 py-1 rounded-lg shrink-0"><i class="fa-solid fa-xmark"></i></button>
            </div>

            <div id="editing-msg-banner" class="hidden px-3.5 py-1.5 bg-sky-950/90 border-t border-sky-700/60 flex items-center justify-between gap-2 text-[11px] shrink-0">
                <span class="text-sky-100 font-semibold truncate"><i class="fa-solid fa-pen ml-1"></i> تعديل رسالة...</span>
                <button type="button" onclick="cancelEditMessage()" class="text-sky-200 hover:text-white text-[10px] font-semibold shrink-0">إلغاء التعديل</button>
            </div>

            <div id="smart-replies-bar" class="hidden px-3 py-1.5 bg-[#0b1521] border-t border-slate-800/70 flex items-center gap-1.5 overflow-x-auto text-[11px] shrink-0"></div>

            <div id="composer-ai-strip" class="px-3 py-1 bg-[#0b1521]/85 border-t border-slate-800/70 flex items-center gap-1.5 text-[10px] shrink-0 overflow-x-auto">
                <span class="text-slate-300 font-semibold shrink-0">الذكاء والصياغة:</span>
                <button type="button" onclick="polishDraft('friendly')" class="bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-slate-200 px-2 py-0.5 rounded shrink-0">ودي</button>
                <button type="button" onclick="polishDraft('formal')" class="bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-slate-200 px-2 py-0.5 rounded shrink-0">رسمي</button>
                <button type="button" onclick="polishDraft('short')" class="bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-slate-200 px-2 py-0.5 rounded shrink-0">مختصر</button>
                <button type="button" onclick="polishDraft('client')" class="bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-teal-200 px-2 py-0.5 rounded shrink-0 font-semibold">رد عميل</button>
                <button type="button" onclick="aiTransformCurrentDraft('simplify')" class="bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800/60 text-emerald-200 px-2 py-0.5 rounded font-semibold shrink-0">تبسيط</button>
                <button type="button" onclick="openAssistedVoiceHub()" class="bg-sky-950/80 hover:bg-sky-900 border border-sky-800/60 text-sky-200 px-2 py-0.5 rounded font-semibold shrink-0"><i class="fa-solid fa-ear-listen ml-0.5"></i>مساعدة صوتية</button>
                <button type="button" onclick="pasteIntoComposer()" class="bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-emerald-200 px-2 py-0.5 rounded font-semibold shrink-0"><i class="fa-solid fa-paste ml-1"></i>لصق</button>
                <button type="button" onclick="insertSanadMention()" class="bg-teal-950/80 hover:bg-teal-900 border border-teal-800/60 text-teal-200 px-2 py-0.5 rounded font-semibold shrink-0">@سند</button>
            </div>

            <div class="p-2.5 bg-[#0d1926] border-t border-slate-800 flex items-end gap-1.5 shrink-0">
                <input type="file" id="attach-file" class="hidden" onchange="onFilePicked(event)">
                <button type="button" onclick="document.getElementById('attach-file').click()" class="text-slate-300 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition shrink-0"><i class="fa-solid fa-paperclip text-base"></i></button>
                <button type="button" id="dictate-btn" onclick="toggleSpeechDictation()" class="text-emerald-300 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition shrink-0"><i class="fa-solid fa-language text-base"></i></button>
                <button type="button" onclick="openComposerExpand()" class="text-teal-200 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition shrink-0"><i class="fa-solid fa-expand text-base"></i></button>
                <textarea id="msg-box-input" rows="1" oninput="autoResizeComposer(this)" onkeydown="if(event.key==='Enter' && !event.shiftKey){event.preventDefault();sendTextMsg();}" placeholder="اكتب رسالتك أو راجعها أو استخدم @سند..." class="flex-1 bg-[#08101a] border border-slate-800 rounded-xl px-3 py-2 text-xs md:text-sm leading-relaxed text-white placeholder-slate-400 focus:outline-none focus:border-teal-600 resize-none max-h-32 overflow-y-auto custom-scrollbar"></textarea>
                <span id="rec-timer" class="hidden text-[11px] font-mono font-semibold text-teal-300 px-1 py-2 shrink-0">00:00</span>
                <button type="button" id="voice-btn" onclick="toggleVoiceCapture()" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white p-2.5 rounded-xl transition shrink-0"><i class="fa-solid fa-microphone text-base"></i></button>
                <button type="button" onclick="sendTextMsg()" class="bg-[#164e63] hover:bg-[#1e6078] text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow shrink-0"><i class="fa-solid fa-paper-plane"></i></button>
            </div>
        </section>

        <section id="pane-groups" class="sanad-pane hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-3">
            <div class="bg-[#0d1926] border border-slate-800 p-4 rounded-2xl space-y-3">
                <div class="flex items-center justify-between">
                    <h2 class="text-sm font-bold text-teal-200"><i class="fa-solid fa-users ml-1"></i> مجموعات التواصل</h2>
                    <span id="groups-count-badge" class="text-[11px] font-mono text-slate-200 bg-slate-800 border border-slate-700 px-2.5 py-0.5 rounded-full">0 مجموعة</span>
                </div>
                <div class="space-y-2">
                    <input type="text" id="g-name" placeholder="اسم المجموعة (مثال: فريق العمل أو العائلة)" class="w-full bg-[#08101a] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                    <input type="text" id="g-members" oninput="normalizeDigitsInInput(this)" placeholder="أعضاء إضافيون (أرقام أو معرّفات مفصولة بفاصلة)" class="w-full bg-[#08101a] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono">
                    <div id="g-contact-picker" class="flex flex-wrap gap-1.5"></div>
                    <button type="button" onclick="createSanadGroup()" class="bg-[#164e63] hover:bg-[#1e6078] text-white px-4 py-2 rounded-xl text-xs font-semibold">+ إنشاء مجموعة</button>
                </div>
            </div>
            <div id="groups-list" class="space-y-2"></div>
        </section>

        <section id="pane-accounts" class="sanad-pane hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-4">
            <div class="bg-[#0d1926] border border-slate-800 p-4 rounded-2xl space-y-3">
                <div class="flex items-center justify-between">
                    <h2 class="text-sm font-bold text-teal-200">إدارة الحسابات والمعرّفات</h2>
                    <span id="accounts-count-badge" class="text-[11px] font-mono text-slate-200 bg-slate-800 border border-slate-700 px-2.5 py-0.5 rounded-full">1 حساب</span>
                </div>
                <div class="flex flex-wrap gap-2">
                    <button type="button" onclick="make8DigitId()" class="bg-[#164e63] hover:bg-[#1e6078] text-white px-4 py-2 rounded-xl text-xs font-semibold">+ توليد معرّف (8 أرقام)</button>
                    <button type="button" onclick="addCustomNumberAccount()" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 px-4 py-2 rounded-xl text-xs font-semibold">+ إضافة رقم/معرّف</button>
                    <button type="button" onclick="verifyPhoneAccount()" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 px-4 py-2 rounded-xl text-xs font-semibold">+ تفعيل رقم جوال</button>
                </div>
                <div id="last-generated-banner" class="hidden bg-[#08101a] border border-teal-800/60 rounded-xl p-2.5 flex items-center justify-between text-xs">
                    <span id="last-generated-text" class="font-mono font-semibold text-teal-200"></span>
                    <button type="button" onclick="copyStringToClipboard(lastGeneratedCode)" class="bg-[#164e63] text-white px-3 py-1 rounded-lg text-[11px] font-semibold">نسخ</button>
                </div>
                <div id="accounts-list" class="space-y-2 pt-2"></div>
            </div>
        </section>

        <section id="pane-contacts" class="sanad-pane hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-3">
            <div class="bg-[#0d1926] border border-slate-800 p-3.5 rounded-2xl space-y-2.5">
                <div class="flex items-center justify-between">
                    <h2 class="text-sm font-bold text-teal-200">جهات الاتصال</h2>
                    <button type="button" onclick="scanNumbersForSanad()" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-3 py-1 rounded-lg text-[11px] font-semibold transition"><i class="fa-solid fa-user-check ml-1"></i>فحص أرقام</button>
                </div>
                <div class="flex flex-col sm:flex-row gap-2">
                    <input type="text" id="c-name" onkeydown="if(event.key==='Enter')addNewContact()" placeholder="الاسم" class="bg-[#08101a] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                    <input type="text" id="c-id" oninput="normalizeDigitsInInput(this)" onkeydown="if(event.key==='Enter')addNewContact()" placeholder="معرّف 8 أرقام أو رقم الجوال" class="flex-1 bg-[#08101a] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono">
                    <button type="button" onclick="addNewContact()" class="bg-[#164e63] hover:bg-[#1e6078] text-white px-4 py-2 rounded-xl text-xs font-semibold">حفظ</button>
                </div>
            </div>
            <div class="bg-[#0d1926]/90 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 flex-1 min-w-0">
                    <i class="fa-solid fa-magnifying-glass text-slate-400 text-xs pr-1"></i>
                    <input type="text" id="contact-search-input" oninput="normalizeDigitsInInput(this); renderPresence();" onkeydown="if(event.key==='Enter')openFirstMatchedContact()" placeholder="بحث بالاسم أو الكود أو الرقم..." class="flex-1 bg-transparent text-xs text-white focus:outline-none">
                </div>
                <span id="contacts-summary-badge" class="text-[10px] font-mono text-slate-400 shrink-0">0 جهة</span>
            </div>
            <div id="contacts-list" class="space-y-2"></div>
        </section>

        <section id="pane-calls" class="sanad-pane hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-4">
            <div class="bg-[#0d1926] border border-slate-800 p-4 rounded-2xl space-y-3 text-center">
                <div class="w-14 h-14 mx-auto rounded-2xl bg-teal-950/70 border border-teal-800/50 text-teal-200 flex items-center justify-center text-2xl"><i class="fa-solid fa-phone-volume"></i></div>
                <h2 class="text-base font-bold text-white">المكالمات الفردية والجماعية</h2>
                <input type="text" id="call-input" oninput="normalizeDigitsInInput(this); onCallDialInput();" onkeydown="if(event.key==='Enter'){event.preventDefault();startDialedCall('audio');}" placeholder="اكتب الاسم أو الرقم أو المعرّف..." class="w-full max-w-md mx-auto bg-[#08101a] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-center font-mono text-white">
                <div id="call-resolved-preview" class="text-[11px] text-teal-200 font-semibold min-h-[18px]"></div>
                <div id="call-contact-suggestions" class="flex flex-wrap justify-center gap-1.5 max-w-md mx-auto"></div>
                <div class="flex gap-3 justify-center pt-1 flex-wrap">
                    <button type="button" onclick="startDialedCall('audio')" class="bg-emerald-700 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2"><i class="fa-solid fa-phone"></i> مكالمة صوتية</button>
                    <button type="button" onclick="startDialedCall('video')" class="bg-[#164e63] hover:bg-[#1e6078] text-white px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2"><i class="fa-solid fa-video"></i> مكالمة فيديو</button>
                </div>
            </div>
            <div class="bg-[#0d1926] border border-slate-800 p-4 rounded-2xl space-y-3">
                <div class="flex items-center justify-between">
                    <h3 class="text-sm font-bold text-teal-200"><i class="fa-solid fa-users-rectangle ml-1"></i> مكالمة جماعية</h3>
                    <span id="group-call-selected-badge" class="text-[11px] font-mono text-slate-300 bg-slate-800 border border-slate-700 px-2.5 py-0.5 rounded-full">0 مشارك</span>
                </div>
                <div id="group-call-presets" class="flex flex-wrap gap-1.5"></div>
                <div id="group-call-contact-picker" class="flex flex-wrap gap-1.5"></div>
                <div class="flex gap-2 pt-1 flex-wrap">
                    <button type="button" onclick="launchGroupCall('audio')" class="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"><i class="fa-solid fa-phone"></i> مكالمة جماعية صوتية</button>
                    <button type="button" onclick="launchGroupCall('video')" class="flex-1 bg-[#164e63] hover:bg-[#1e6078] text-white py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"><i class="fa-solid fa-video"></i> مكالمة جماعية فيديو</button>
                </div>
            </div>
        </section>

        <section id="pane-ai" class="sanad-pane hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-3">
            <div class="bg-[#0d1926] border border-slate-800 p-4 rounded-2xl space-y-2.5">
                <div class="flex items-center justify-between">
                    <h2 class="text-sm font-bold text-teal-200"><i class="fa-solid fa-brain ml-1"></i> مساعد سند AI ومفكرة المسودات</h2>
                    <span class="text-[10px] bg-teal-950/80 text-teal-200 border border-teal-800/50 px-2 py-0.5 rounded-full font-semibold">v${APP_VERSION}</span>
                </div>
                <div class="bg-[#08101a] p-3 rounded-xl border border-teal-800/40 space-y-2 text-xs">
                    <div class="flex items-center justify-between">
                        <span class="text-teal-200 font-semibold"><i class="fa-solid fa-note-sticky ml-1"></i> مفكرة المسودات الذكية</span>
                        <span class="text-[10px] text-slate-400">تُحفظ تلقائياً</span>
                    </div>
                    <textarea id="ai-scratchpad-ta" rows="3" oninput="saveScratchpadDraft()" placeholder="اكتب فكرة أو رسالة طويلة هنا وبسّطها أو أرسلها للمحادثة مباشرة..." class="w-full bg-[#0d1926] border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-teal-600 custom-scrollbar"></textarea>
                    <div class="flex flex-wrap gap-1.5 text-[11px]">
                        <button type="button" onclick="scratchpadTransform('simplify')" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-200 px-2.5 py-1 rounded-lg font-semibold">تبسيط</button>
                        <button type="button" onclick="scratchpadTransform('formal')" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-200 px-2.5 py-1 rounded-lg font-semibold">رسمي</button>
                        <button type="button" onclick="speakText(document.getElementById('ai-scratchpad-ta').value)" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-teal-200 px-2.5 py-1 rounded-lg font-semibold"><i class="fa-solid fa-volume-high ml-1"></i>قراءة</button>
                        <button type="button" onclick="sendScratchpadToChat()" class="bg-[#164e63] hover:bg-[#1e6078] text-white px-3 py-1 rounded-lg font-semibold">نقل إلى الدردشة</button>
                    </div>
                </div>
                <div class="flex items-center justify-between bg-[#08101a] p-3 rounded-xl border border-slate-800 text-xs">
                    <span>وضع توفير البيانات للشبكات الضعيفة</span>
                    <input type="checkbox" id="chk-weaknet" checked onchange="updateNetBadge()" class="w-4 h-4 accent-teal-600">
                </div>
                <div class="flex items-center justify-between bg-[#08101a] p-3 rounded-xl border border-slate-800 text-xs">
                    <span>الرد التلقائي الذكي للعملاء عند استلام رسالة</span>
                    <input type="checkbox" id="chk-autoreply" class="w-4 h-4 accent-teal-600">
                </div>
                <div class="flex items-center justify-between bg-[#08101a] p-3 rounded-xl border border-slate-800 text-xs">
                    <span>نغمة التنبيه والرنين</span>
                    <input type="checkbox" id="chk-chime" checked class="w-4 h-4 accent-teal-600">
                </div>
                <div class="flex gap-2">
                    <button type="button" onclick="exportBackup()" class="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 py-2 rounded-xl text-xs font-semibold"><i class="fa-solid fa-download ml-1"></i>تصدير نسخة</button>
                    <button type="button" onclick="importBackup()" class="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 py-2 rounded-xl text-xs font-semibold"><i class="fa-solid fa-upload ml-1"></i>استعادة نسخة</button>
                </div>
                <div id="ai-log" class="bg-[#08101a] border border-slate-800 rounded-xl p-3 h-36 overflow-y-auto text-xs space-y-2 custom-scrollbar">
                    <div class="text-slate-400">مرحباً بك في سند AI v${APP_VERSION} جاهز للعمل.</div>
                </div>
                <div class="flex gap-2">
                    <input type="text" id="ai-q" onkeydown="if(event.key==='Enter')askSanadAI()" placeholder="اسأل سند AI أو اطلب صياغة محتوى للعملاء..." class="flex-1 bg-[#08101a] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                    <button type="button" onclick="askSanadAI()" class="bg-[#164e63] hover:bg-[#1e6078] text-white px-4 py-2 rounded-xl text-xs font-semibold">إرسال</button>
                </div>
            </div>
        </section>
    </main>

    <nav class="bg-[#0d1926]/95 border-t border-slate-800 px-0.5 py-2 flex justify-around items-center z-20 shrink-0">
        <a href="#tab-chats" onclick="setPane('chats'); return false;" id="btn-chats" class="relative flex flex-col items-center gap-0.5 text-teal-300 font-bold text-[10px] px-1 py-1 whitespace-nowrap shrink-0 cursor-pointer">
            <span id="nav-chats-badge" class="hidden absolute -top-0.5 -left-1.5 min-w-[16px] h-[16px] px-1 rounded-full bg-rose-600 text-white text-[9px] font-mono font-bold flex items-center justify-center">0</span>
            <i class="fa-solid fa-comments text-sm"></i><span>الدردشة</span>
        </a>
        <a href="#tab-groups" onclick="setPane('groups'); return false;" id="btn-groups" class="relative flex flex-col items-center gap-0.5 text-slate-400 font-medium text-[10px] px-1 py-1 whitespace-nowrap shrink-0 cursor-pointer">
            <span id="nav-groups-badge" class="hidden absolute -top-0.5 -left-1.5 min-w-[16px] h-[16px] px-1 rounded-full bg-rose-600 text-white text-[9px] font-mono font-bold flex items-center justify-center">0</span>
            <i class="fa-solid fa-users text-sm"></i><span>المجموعات</span>
        </a>
        <a href="#tab-accounts" onclick="setPane('accounts'); return false;" id="btn-accounts" class="relative flex flex-col items-center gap-0.5 text-slate-400 font-medium text-[10px] px-1 py-1 whitespace-nowrap shrink-0 cursor-pointer">
            <i class="fa-solid fa-id-card text-sm"></i><span>الحسابات</span>
        </a>
        <a href="#tab-contacts" onclick="setPane('contacts'); return false;" id="btn-contacts" class="relative flex flex-col items-center gap-0.5 text-slate-400 font-medium text-[10px] px-1 py-1 whitespace-nowrap shrink-0 cursor-pointer">
            <i class="fa-solid fa-address-book text-sm"></i><span>الجهات</span>
        </a>
        <a href="#tab-calls" onclick="setPane('calls'); return false;" id="btn-calls" class="relative flex flex-col items-center gap-0.5 text-slate-400 font-medium text-[10px] px-1 py-1 whitespace-nowrap shrink-0 cursor-pointer">
            <i class="fa-solid fa-phone-volume text-sm"></i><span>المكالمات</span>
        </a>
        <a href="#tab-ai" onclick="setPane('ai'); return false;" id="btn-ai" class="relative flex flex-col items-center gap-0.5 text-slate-400 font-medium text-[10px] px-1 py-1 whitespace-nowrap shrink-0 cursor-pointer">
            <i class="fa-solid fa-brain text-sm"></i><span>الذكاء</span>
        </a>
    </nav>

    <script>
        var DEFAULT_PEER = 'خدمة العملاء';
        var activeAcct = 'مستخدم-سند';
        var myAccts = ['مستخدم-سند'];
        var contacts = [{ name: DEFAULT_PEER, id: DEFAULT_PEER }];
        var sanadGroups = [];
        var selectedGroupMembers = new Set();
        var selectedGroupCallPeers = new Set();
        var activeGroupCallTargets = [];
        var isGroupCallActive = false;
        var pinnedByThread = {};
        var unreadByThread = {};
        var expandedLongMsgIds = new Set();
        var currentPeer = DEFAULT_PEER;
        var activePane = 'chats';
        var onlinePeers = new Set();
        var acctThreads = {};
        var seenEventIds = new Set();
        var outboxQueue = [];
        var lastGeneratedCode = '';
        var lastCopiedMessageText = '';
        var editingMsgId = null;
        var replyingToMsg = null;
        var contextMenuMsgId = null;
        var pendingDeleteMsgId = null;
        var toastPeerId = null;
        var toastTimer = null;
        var copyToastTimer = null;
        var ringtoneTimer = null;
        var callDurationTimer = null;
        var callSeconds = 0;
        var speakerModeActive = true;
        var ws = null;
        var wsConnected = false;
        var reconnectTimer = null;
        var pollInFlight = false;
        var serverReachable = true;
        var lastSyncCursor = 0;
        var autoReloadingForUpdate = false;
        var mediaRecorderObj = null;
        var recordedChunks = [];
        var recInterval = null;
        var recSeconds = 0;
        var recordedVoiceDraft = null;
        var voicePreviewAudio = null;
        var lastScrollTopMsgs = 0;
        var speechRecognitionObj = null;
        var isDictatingSpeech = false;

        // حالة WebRTC والمكالمات
        var pc = null;
        var localStream = null;
        var pendingOfferData = null;
        var pendingIceCandidates = [];
        var activeCallPeerId = null;
        var activeCallMode = 'audio';
        var currentCameraFacing = 'user';
        var micMuted = false;

        var ICE_SERVERS = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' }
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
            var mm = String(Math.floor(s / 60)).padStart(2, '0');
            var ss = String(s % 60).padStart(2, '0');
            return toWesternDigits(mm + ':' + ss);
        }
        function detectDevice() {
            var ua = navigator.userAgent || '';
            if (/iPad/i.test(ua)) return 'آيباد';
            if (/iPhone|iPod/i.test(ua)) return 'آيفون';
            if (/Android/i.test(ua)) return 'أندرويد';
            return 'كمبيوتر';
        }
        function isWeakNetworkMode() {
            var chk = document.getElementById('chk-weaknet');
            return Boolean(chk && chk.checked);
        }
        function updateNetBadge() {
            var badge = document.getElementById('net-badge');
            if (!badge) return;
            if (typeof navigator !== 'undefined' && navigator.onLine === false) {
                badge.textContent = 'بدون نت';
                badge.className = 'text-[10px] bg-amber-950/90 text-amber-200 border border-amber-800/70 px-2 py-0.5 rounded-full font-semibold';
                return;
            }
            badge.textContent = isWeakNetworkMode() ? 'توفير ذكي' : 'أداء سريع';
            badge.className = 'text-[10px] bg-slate-800/90 text-sky-200 border border-sky-800/50 px-2 py-0.5 rounded-full font-semibold';
        }
        function updateOfflineNetworkUI(isOfflineNow) {
            var banner = document.getElementById('offline-banner');
            if (banner) banner.classList.toggle('hidden', !isOfflineNow);
            updateNetBadge();
            if (isOfflineNow) setHeaderStatus('بدون نت (محلي)', false);
        }
        function setHeaderStatus(text, isOnline) {
            var dot = document.getElementById('ws-dot');
            var lbl = document.getElementById('ws-label');
            if (dot) dot.className = isOnline ? 'w-2 h-2 rounded-full bg-emerald-400' : 'w-2 h-2 rounded-full bg-amber-300';
            if (lbl) {
                lbl.className = isOnline ? 'text-emerald-300 font-medium' : 'text-amber-200 font-medium';
                lbl.textContent = text;
            }
            updateQueueBadge();
        }
        function updateQueueBadge() {
            var qb = document.getElementById('queue-badge');
            if (!qb) return;
            if (outboxQueue.length > 0) {
                qb.textContent = toWesternDigits(outboxQueue.length) + ' معلّق';
                qb.classList.remove('hidden');
            } else {
                qb.classList.add('hidden');
            }
        }
        function triggerSilentAppUpdateIfNeeded(serverVer) {
            if (!serverVer || serverVer === CLIENT_APP_VERSION || autoReloadingForUpdate) return;
            if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
            autoReloadingForUpdate = true;
            try { persistState(); } catch (e) {}
            location.replace(location.origin + location.pathname + '?v=' + encodeURIComponent(serverVer) + (location.hash || ''));
        }
        function copyStringToClipboard(text) {
            var str = String(text || '');
            if (!str) return;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(str).catch(function() {});
            }
            var t = document.getElementById('copy-toast-banner');
            if (t) {
                t.classList.remove('hidden');
                clearTimeout(copyToastTimer);
                copyToastTimer = setTimeout(function() { t.classList.add('hidden'); }, 1800);
            }
        }
        function playChimeSound() {
            var chk = document.getElementById('chk-chime');
            if (chk && !chk.checked) return;
            try {
                var AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (!AudioCtx) return;
                var ctx = new AudioCtx();
                var osc = ctx.createOscillator();
                var gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(740, ctx.currentTime);
                gain.gain.setValueAtTime(0.06, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.26);
            } catch (e) {}
        }

        // القراءة الصوتية والإملاء
        function speakText(text) {
            var clean = String(text || '').trim();
            if (!clean || !('speechSynthesis' in window)) return;
            try {
                window.speechSynthesis.cancel();
                var utter = new SpeechSynthesisUtterance(clean);
                utter.lang = 'ar';
                utter.rate = 0.96;
                window.speechSynthesis.speak(utter);
            } catch (e) {}
        }
        function stopSpeechReading() {
            try { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); } catch (e) {}
        }
        function openAssistedVoiceHub() {
            var m = document.getElementById('assisted-voice-modal');
            if (m) m.classList.remove('hidden');
        }
        function closeAssistedVoiceHub() {
            var m = document.getElementById('assisted-voice-modal');
            if (m) m.classList.add('hidden');
        }
        function readLastIncomingMessageAloud() {
            var list = (getThreadMap()[currentPeer] || []).filter(function(m) { return m && !m.deleted && m.from !== 'me'; });
            if (!list.length) return alert('لا توجد رسالة واردة لقراءتها في هذه المحادثة.');
            var last = list[list.length - 1];
            speakText(last.text || (last.kind === 'audio' ? 'رسالة صوتية واردة' : 'مرفق وارد'));
        }
        function readWholeThreadAloud() {
            var list = (getThreadMap()[currentPeer] || []).filter(function(m) { return m && !m.deleted && m.text; });
            if (!list.length) return alert('لا توجد رسائل نصية لقراءتها.');
            var combined = list.slice(-8).map(function(m) {
                return (m.from === 'me' ? 'أنت: ' : (m.senderName || currentPeer) + ': ') + m.text;
            }).join(' . ');
            speakText(combined);
        }
        function readCurrentDraftAloud() {
            var inp = document.getElementById('msg-box-input');
            if (inp && inp.value.trim()) speakText(inp.value.trim());
        }
        function toggleSpeechDictation() {
            var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SR) return alert('الإملاء الصوتي غير مدعوم في هذا المتصفح.');
            var btn = document.getElementById('dictate-btn');
            if (isDictatingSpeech && speechRecognitionObj) {
                try { speechRecognitionObj.stop(); } catch (e) {}
                isDictatingSpeech = false;
                if (btn) btn.classList.remove('text-rose-400');
                return;
            }
            try {
                speechRecognitionObj = new SR();
                speechRecognitionObj.lang = 'ar';
                speechRecognitionObj.interimResults = false;
                isDictatingSpeech = true;
                if (btn) btn.classList.add('text-rose-400');
                speechRecognitionObj.onresult = function(ev) {
                    var transcript = ev.results && ev.results[0] && ev.results[0][0] ? ev.results[0][0].transcript : '';
                    var inp = document.getElementById('msg-box-input');
                    if (inp && transcript) {
                        inp.value = (inp.value ? inp.value + ' ' : '') + transcript;
                        autoResizeComposer(inp);
                    }
                };
                speechRecognitionObj.onend = function() {
                    isDictatingSpeech = false;
                    if (btn) btn.classList.remove('text-rose-400');
                };
                speechRecognitionObj.start();
            } catch (e) {
                isDictatingSpeech = false;
                if (btn) btn.classList.remove('text-rose-400');
            }
        }

        // التحسين الذكي للنصوص والردود
        function smartTransformText(rawText, mode) {
            var t = String(rawText || '').trim();
            if (!t) return '';
            if (mode === 'formal') {
                return 'السلام عليكم ورحمة الله وبركاته، ' + t.replace(/^(يا\s*اخي|يا\s*أخي|هلا|مرحبا)\s*/i, '') + ' -- مع خالص التقدير.';
            }
            if (mode === 'friendly') {
                return 'أهلاً بك 👋 ' + t + ' 😊';
            }
            if (mode === 'short') {
                var words = t.split(/\\s+/);
                return words.length > 10 ? words.slice(0, 10).join(' ') + '...' : t;
            }
            if (mode === 'client') {
                return 'أهلاً بك، تم استلام رسالتك بنجاح وجاري المتابعة والخدمة بكل سرور. هل هناك أي تفاصيل إضافية تود إضافتها؟';
            }
            if (mode === 'simplify') {
                return t.replace(/[،؛:.!?]+/g, ' -- ').replace(/\\s{2,}/g, ' ').trim();
            }
            if (mode === 'summarize') {
                var sentences = t.split(/[.!؟\\n]+/).map(function(s) { return s.trim(); }).filter(Boolean);
                return 'ملخص: ' + sentences.slice(0, 2).join(' | ');
            }
            return t;
        }

        function polishDraft(mode) {
            var inp = document.getElementById('msg-box-input');
            if (!inp) return;
            var base = inp.value.trim() || (mode === 'client' ? 'مرحباً' : '');
            if (!base) return alert('اكتب نصاً أولاً ليتم تحسينه.');
            inp.value = smartTransformText(base, mode);
            autoResizeComposer(inp);
        }

        function aiTransformCurrentDraft(mode) {
            var inp = document.getElementById('msg-box-input');
            var text = inp ? inp.value.trim() : '';
            if (!text) {
                var list = (getThreadMap()[currentPeer] || []).filter(function(m) { return m && !m.deleted && m.text; });
                text = list.length ? list[list.length - 1].text : '';
            }
            if (!text) return alert('لا يوجد نص متاح للمعالجة.');
            var res = smartTransformText(text, mode);
            if (inp) {
                inp.value = res;
                autoResizeComposer(inp);
            }
            appendAiLog('تحويل (' + mode + '): ' + res, 'ai');
        }

        function aiTransformExpanded(mode) {
            var ta = document.getElementById('expanded-composer-textarea');
            if (!ta || !ta.value.trim()) return;
            ta.value = smartTransformText(ta.value.trim(), mode);
            syncFromExpandedComposer();
        }

        function scratchpadTransform(mode) {
            var ta = document.getElementById('ai-scratchpad-ta');
            if (!ta || !ta.value.trim()) return;
            ta.value = smartTransformText(ta.value.trim(), mode);
            saveScratchpadDraft();
        }

        function saveScratchpadDraft() {
            var ta = document.getElementById('ai-scratchpad-ta');
            try { if (ta) localStorage.setItem('sanad892_scratchpad', ta.value); } catch (e) {}
        }

        function sendScratchpadToChat() {
            var ta = document.getElementById('ai-scratchpad-ta');
            var inp = document.getElementById('msg-box-input');
            if (!ta || !ta.value.trim()) return;
            if (inp) {
                inp.value = ta.value.trim();
                autoResizeComposer(inp);
            }
            setPane('chats');
        }

        function insertSanadMention() {
            var inp = document.getElementById('msg-box-input');
            if (!inp) return;
            inp.value = (inp.value ? inp.value + ' ' : '') + '@سند ';
            autoResizeComposer(inp);
            inp.focus();
        }

        function pasteIntoComposer() {
            var inp = document.getElementById('msg-box-input');
            if (!inp) return;
            if (navigator.clipboard && navigator.clipboard.readText) {
                navigator.clipboard.readText().then(function(txt) {
                    if (txt) {
                        inp.value = (inp.value ? inp.value + ' ' : '') + txt;
                        autoResizeComposer(inp);
                    } else if (lastCopiedMessageText) {
                        inp.value = (inp.value ? inp.value + ' ' : '') + lastCopiedMessageText;
                        autoResizeComposer(inp);
                    }
                }).catch(function() {
                    if (lastCopiedMessageText) {
                        inp.value = (inp.value ? inp.value + ' ' : '') + lastCopiedMessageText;
                        autoResizeComposer(inp);
                    }
                });
            } else if (lastCopiedMessageText) {
                inp.value = (inp.value ? inp.value + ' ' : '') + lastCopiedMessageText;
                autoResizeComposer(inp);
            }
        }

        function autoResizeComposer(el) {
            if (!el) return;
            el.style.height = 'auto';
            el.style.height = Math.min(el.scrollHeight, 128) + 'px';
        }

        function openComposerExpand() {
            var inp = document.getElementById('msg-box-input');
            var ta = document.getElementById('expanded-composer-textarea');
            var m = document.getElementById('composer-expand-modal');
            if (ta && inp) ta.value = inp.value;
            if (m) m.classList.remove('hidden');
        }
        function closeComposerExpand() {
            var m = document.getElementById('composer-expand-modal');
            if (m) m.classList.add('hidden');
        }
        function syncFromExpandedComposer() {
            var inp = document.getElementById('msg-box-input');
            var ta = document.getElementById('expanded-composer-textarea');
            if (inp && ta) {
                inp.value = ta.value;
                autoResizeComposer(inp);
            }
        }

        function appendAiLog(text, sender) {
            var log = document.getElementById('ai-log');
            if (!log) return;
            var div = document.createElement('div');
            div.className = sender === 'me'
                ? 'bg-[#164e63]/60 text-white px-2.5 py-1.5 rounded-lg'
                : 'bg-[#0d1926] border border-slate-800 text-teal-100 px-2.5 py-1.5 rounded-lg';
            div.textContent = (sender === 'me' ? 'أنت: ' : 'سند AI: ') + text;
            log.appendChild(div);
            log.scrollTop = log.scrollHeight;
        }

        function askSanadAI() {
            var inp = document.getElementById('ai-q');
            if (!inp || !inp.value.trim()) return;
            var q = inp.value.trim();
            inp.value = '';
            appendAiLog(q, 'me');
            var reply = '';
            if (/كود|رقم|معرّف|معرف/i.test(q)) {
                reply = 'يمكنك توليد معرّف فوري من تبويب (الحسابات ← + توليد معرّف 8 أرقام) أو إضافة أي رقم دولي ومشاركته مع الطرف الآخر.';
            } else if (/مكالم|فيديو|صوت/i.test(q)) {
                reply = 'لإجراء مكالمة حية بين جهازين، تأكد من السماح للمتصفح بالوصول إلى الميكروفون أو الكاميرا وأن الطرف الآخر متصل بالشبكة.';
            } else if (/لخص|تلخيص/i.test(q)) {
                reply = smartTransformText(q, 'summarize');
            } else {
                reply = 'تم فهم طلبك: ' + q + ' -- يمكنك استخدام أزرار (تبسيط، رسمي، رد عميل) في شريط الصياغة لتجهيز ردك فوراً.';
            }
            appendAiLog(reply, 'ai');
        }

        function summarizeCurrentThread() {
            var list = (getThreadMap()[currentPeer] || []).filter(function(m) { return m && !m.deleted && m.text; });
            if (!list.length) return alert('لا توجد رسائل نصية لتلخيصها.');
            var text = list.slice(-6).map(function(m) { return m.text; }).join(' . ');
            var sum = smartTransformText(text, 'summarize');
            alert(sum);
        }

        // التخزين والحالة
        function loadSavedState() {
            try {
                var savedActive = localStorage.getItem('sanad892_active');
                var savedAccts = JSON.parse(localStorage.getItem('sanad892_accts') || 'null');
                var savedContacts = JSON.parse(localStorage.getItem('sanad892_contacts') || 'null');
                var savedThreads = JSON.parse(localStorage.getItem('sanad892_threads') || 'null');
                var savedGroups = JSON.parse(localStorage.getItem('sanad892_groups') || 'null');
                var savedPins = JSON.parse(localStorage.getItem('sanad892_pins') || 'null');
                var savedUnread = JSON.parse(localStorage.getItem('sanad892_unread') || 'null');
                var savedOutbox = JSON.parse(localStorage.getItem('sanad892_outbox') || 'null');
                var savedCursor = Number(localStorage.getItem('sanad892_cursor') || '0');
                var scratchEl = document.getElementById('ai-scratchpad-ta');
                var savedScratch = localStorage.getItem('sanad892_scratchpad') || '';
                if (scratchEl && savedScratch) scratchEl.value = savedScratch;

                if (savedActive) activeAcct = cleanIdValue(savedActive);
                if (Array.isArray(savedAccts) && savedAccts.length) myAccts = savedAccts.map(cleanIdValue).filter(Boolean);
                if (myAccts.indexOf(activeAcct) === -1) myAccts.unshift(activeAcct);
                if (Array.isArray(savedContacts) && savedContacts.length) contacts = savedContacts;
                if (!contacts.some(function(c) { return c.id === DEFAULT_PEER; })) contacts.unshift({ name: DEFAULT_PEER, id: DEFAULT_PEER });
                if (savedThreads && typeof savedThreads === 'object') acctThreads = savedThreads;
                if (Array.isArray(savedGroups)) sanadGroups = savedGroups;
                if (savedPins && typeof savedPins === 'object') pinnedByThread = savedPins;
                if (savedUnread && typeof savedUnread === 'object') unreadByThread = savedUnread;
                if (Array.isArray(savedOutbox)) outboxQueue = savedOutbox;
                if (savedCursor > 0) lastSyncCursor = savedCursor;
            } catch (e) {}
        }

        function persistState() {
            try {
                localStorage.setItem('sanad892_active', activeAcct);
                localStorage.setItem('sanad892_accts', JSON.stringify(myAccts));
                localStorage.setItem('sanad892_contacts', JSON.stringify(contacts));
                localStorage.setItem('sanad892_threads', JSON.stringify(acctThreads));
                localStorage.setItem('sanad892_groups', JSON.stringify(sanadGroups));
                localStorage.setItem('sanad892_pins', JSON.stringify(pinnedByThread));
                localStorage.setItem('sanad892_unread', JSON.stringify(unreadByThread));
                localStorage.setItem('sanad892_outbox', JSON.stringify(outboxQueue));
                localStorage.setItem('sanad892_cursor', String(lastSyncCursor));
            } catch (e) {}
        }

        function persistAndDraw() {
            persistState();
            var lbl = document.getElementById('active-acct-label');
            if (lbl) lbl.textContent = activeAcct;
            renderQuickChips();
            renderPeerHeader();
            renderPinnedBanner();
            renderMsgs();
            renderPresence();
            renderAccts();
            renderGroupsList();
            renderGroupCallPickers();
            updateUnreadBadgesUI();
        }

        function exportBackup() {
            var data = {
                version: CLIENT_APP_VERSION,
                activeAcct: activeAcct,
                myAccts: myAccts,
                contacts: contacts,
                sanadGroups: sanadGroups,
                acctThreads: acctThreads
            };
            var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'sanad-ai-backup.json';
            a.click();
            setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
        }

        function importBackup() {
            var raw = prompt('الصق محتوى النسخة الاحتياطية JSON هنا:');
            if (!raw) return;
            try {
                var parsed = JSON.parse(raw);
                if (Array.isArray(parsed.myAccts) && parsed.myAccts.length) myAccts = parsed.myAccts.map(cleanIdValue).filter(Boolean);
                if (parsed.activeAcct) activeAcct = cleanIdValue(parsed.activeAcct);
                if (Array.isArray(parsed.contacts) && parsed.contacts.length) contacts = parsed.contacts;
                if (Array.isArray(parsed.sanadGroups)) sanadGroups = parsed.sanadGroups;
                if (parsed.acctThreads && typeof parsed.acctThreads === 'object') acctThreads = parsed.acctThreads;
                persistAndDraw();
                syncPresenceNow();
                alert('تمت استعادة النسخة الاحتياطية بنجاح.');
            } catch (e) {
                alert('صيغة النسخة غير صحيحة.');
            }
        }

        // المجموعات والجهات والحسابات
        function findGroupById(id) {
            return sanadGroups.find(function(g) { return normalizeStr(g.id) === normalizeStr(id); }) || null;
        }
        function resolveContactByQuery(rawQuery) {
            var q = normalizeStr(rawQuery);
            if (!q) return null;
            var grp = findGroupById(rawQuery);
            if (grp) return { id: grp.id, name: grp.name, isGroup: true, members: grp.members || [] };
            return contacts.find(function(c) {
                return normalizeStr(c.id) === q || normalizeStr(c.name) === q ||
                    normalizeStr(c.name).indexOf(q) !== -1 || normalizeStr(c.id).indexOf(q) !== -1;
            }) || null;
        }
        function isPeerOnline(id) {
            var target = normalizeStr(id);
            var found = false;
            onlinePeers.forEach(function(item) { if (normalizeStr(item) === target) found = true; });
            return found;
        }
        function formatPeerDisplay(peerId) {
            var cleanId = cleanIdValue(peerId);
            var grp = findGroupById(cleanId);
            if (grp) return grp.name + ' • مجموعة';
            var found = contacts.find(function(c) { return normalizeStr(c.id) === normalizeStr(cleanId); });
            if (!found) return cleanId;
            return found.id === DEFAULT_PEER ? found.name : (found.name + ' • ' + found.id);
        }

        function choosePeer(id) {
            var cleanRaw = cleanIdValue(id);
            var matched = resolveContactByQuery(cleanRaw);
            var clean = matched ? matched.id : cleanRaw;
            if (!clean) return;
            currentPeer = clean;
            cancelReplyMessage();
            clearUnreadForPeer(clean);
            var callInp = document.getElementById('call-input');
            if (callInp) {
                callInp.value = formatPeerDisplay(clean);
                onCallDialInput();
            }
            setPane('chats');
            persistAndDraw();
            markCurrentThreadAsRead();
        }

        function openPeerByInput() {
            var inp = document.getElementById('peer-input');
            if (!inp || !inp.value.trim()) return;
            choosePeer(inp.value.trim());
            inp.value = '';
        }

        function onTopPeerSearchInput() {
            var inp = document.getElementById('peer-input');
            renderQuickChips(inp ? inp.value.trim() : '');
        }

        function toggleChatUtilityBar() {
            var strip = document.getElementById('composer-ai-strip');
            if (strip) strip.classList.toggle('hidden');
        }

        function saveCurrentPeer() {
            if (!currentPeer || currentPeer === DEFAULT_PEER || findGroupById(currentPeer)) return;
            var name = prompt('اسم جهة الاتصال لحفظها:', currentPeer);
            if (name === null) return;
            upsertContact(name.trim() || currentPeer, currentPeer);
        }

        function upsertContact(name, id) {
            var cleanId = cleanIdValue(id);
            if (!cleanId) return null;
            var cleanName = String(name || '').trim() || ('جهة ' + cleanId);
            var idx = contacts.findIndex(function(c) { return normalizeStr(c.id) === normalizeStr(cleanId); });
            if (idx !== -1) contacts[idx] = { name: cleanName, id: cleanId };
            else contacts.push({ name: cleanName, id: cleanId });
            persistAndDraw();
            return contacts[idx !== -1 ? idx : contacts.length - 1];
        }

        function addNewContact() {
            var nEl = document.getElementById('c-name');
            var iEl = document.getElementById('c-id');
            var idVal = iEl ? cleanIdValue(iEl.value) : '';
            if (!idVal) return alert('أدخل المعرّف أو رقم الجوال.');
            upsertContact(nEl ? nEl.value.trim() : '', idVal);
            if (nEl) nEl.value = '';
            if (iEl) iEl.value = '';
        }

        function openFirstMatchedContact() {
            var qEl = document.getElementById('contact-search-input');
            var m = resolveContactByQuery(qEl ? qEl.value.trim() : '');
            if (m) choosePeer(m.id);
        }

        function scanNumbersForSanad() {
            var raw = prompt('أدخل أرقاماً أو معرّفات مفصولة بفاصلة لفحصها وحفظها:');
            if (!raw) return;
            var tokens = toWesternDigits(raw).split(/[\\s,،\\n]+/).map(cleanIdValue).filter(Boolean);
            tokens.forEach(function(t) {
                if (!contacts.some(function(c) { return normalizeStr(c.id) === normalizeStr(t); })) {
                    contacts.push({ name: 'رقم ' + t, id: t });
                }
            });
            persistAndDraw();
            syncPresenceNow();
        }

        function createSanadGroup() {
            var nameEl = document.getElementById('g-name');
            var memEl = document.getElementById('g-members');
            var gName = nameEl ? nameEl.value.trim() : '';
            if (!gName) return alert('أدخل اسم المجموعة.');
            var extraTokens = memEl ? toWesternDigits(memEl.value).split(/[\\s,،\\n]+/).map(cleanIdValue).filter(Boolean) : [];
            var membersSet = new Set(Array.from(selectedGroupMembers).concat(extraTokens).concat([activeAcct]));
            var grp = {
                id: 'grp-' + String(Math.floor(100000 + Math.random() * 900000)),
                name: gName,
                members: Array.from(membersSet)
            };
            sanadGroups.unshift(grp);
            if (nameEl) nameEl.value = '';
            if (memEl) memEl.value = '';
            selectedGroupMembers.clear();
            persistAndDraw();
            choosePeer(grp.id);
        }

        function toggleGroupMemberPick(id) {
            var clean = cleanIdValue(id);
            if (!clean) return;
            if (selectedGroupMembers.has(clean)) selectedGroupMembers.delete(clean);
            else selectedGroupMembers.add(clean);
            renderGroupsList();
        }

        function renderGroupsList() {
            var badge = document.getElementById('groups-count-badge');
            if (badge) badge.textContent = toWesternDigits(sanadGroups.length) + ' مجموعة';
            var picker = document.getElementById('g-contact-picker');
            if (picker) {
                picker.innerHTML = contacts.filter(function(c) { return c.id !== DEFAULT_PEER; }).map(function(c) {
                    var picked = selectedGroupMembers.has(c.id);
                    return '<button type="button" onclick="toggleGroupMemberPick(\\'' + escapeJsSingle(c.id) + '\\')" class="px-2.5 py-1 rounded-full text-[11px] font-semibold border ' +
                        (picked ? 'bg-[#164e63] border-teal-400 text-white' : 'bg-[#08101a] border-slate-800 text-slate-300') + '">' +
                        escapeHtml(c.name) + '</button>';
                }).join('');
            }
            var listEl = document.getElementById('groups-list');
            if (!listEl) return;
            listEl.innerHTML = sanadGroups.map(function(g) {
                return '<div class="flex items-center justify-between bg-[#0d1926] border border-slate-800 p-3 rounded-xl text-xs gap-2">' +
                    '<div class="min-w-0"><p class="font-bold text-white truncate">👥 ' + escapeHtml(g.name) + '</p>' +
                    '<p class="text-[11px] text-slate-400 font-mono truncate">' + toWesternDigits((g.members || []).length) + ' أعضاء</p></div>' +
                    '<button type="button" onclick="choosePeer(\\'' + escapeJsSingle(g.id) + '\\')" class="bg-[#164e63] hover:bg-[#1e6078] text-white px-3 py-1.5 rounded-lg font-semibold shrink-0">فتح</button></div>';
            }).join('');
        }

        function renderQuickChips(filterQuery) {
            var box = document.getElementById('quick-chips');
            if (!box) return;
            var q = normalizeStr(filterQuery || '');
            var items = [];
            sanadGroups.forEach(function(g) { items.push({ id: g.id, label: '👥 ' + g.name }); });
            contacts.forEach(function(c) { items.push({ id: c.id, label: c.id === DEFAULT_PEER ? c.name : (c.name + ' (' + c.id + ')') }); });
            if (q) {
                items = items.filter(function(it) { return normalizeStr(it.label).indexOf(q) !== -1 || normalizeStr(it.id).indexOf(q) !== -1; });
            }
            box.innerHTML = items.slice(0, 12).map(function(it) {
                var active = normalizeStr(it.id) === normalizeStr(currentPeer);
                var unread = Number(unreadByThread[normalizeStr(it.id)] || 0);
                return '<button type="button" onclick="choosePeer(\\'' + escapeJsSingle(it.id) + '\\')" class="px-2.5 py-1 rounded-full border text-[11px] font-semibold whitespace-nowrap shrink-0 flex items-center gap-1 ' +
                    (active ? 'bg-[#164e63] border-teal-500 text-white' : 'bg-[#08101a] border-slate-800 text-slate-300 hover:border-slate-700') + '">' +
                    escapeHtml(it.label) + (unread > 0 ? '<span class="bg-rose-600 text-white text-[9px] font-mono px-1.5 rounded-full">' + toWesternDigits(unread) + '</span>' : '') + '</button>';
            }).join('');
        }

        function renderPeerHeader() {
            var titleEl = document.getElementById('peer-title');
            var statusEl = document.getElementById('peer-status');
            var dotEl = document.getElementById('peer-dot');
            if (titleEl) titleEl.textContent = formatPeerDisplay(currentPeer);
            var grp = findGroupById(currentPeer);
            if (grp) {
                if (statusEl) statusEl.textContent = toWesternDigits((grp.members || []).length) + ' أعضاء';
                if (dotEl) dotEl.className = 'w-2.5 h-2.5 rounded-full bg-teal-400 shrink-0';
                return;
            }
            var online = isPeerOnline(currentPeer) || currentPeer === DEFAULT_PEER;
            if (statusEl) statusEl.textContent = online ? 'متصل الآن' : 'غير متصل';
            if (dotEl) dotEl.className = online ? 'w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0' : 'w-2.5 h-2.5 rounded-full bg-slate-600 shrink-0';
        }

        // المحادثات والإشعارات والرسائل
        function getThreadMap() {
            if (!acctThreads[activeAcct]) acctThreads[activeAcct] = {};
            if (!acctThreads[activeAcct][DEFAULT_PEER]) {
                acctThreads[activeAcct][DEFAULT_PEER] = [
                    { id: 'init-' + activeAcct, from: 'them', kind: 'text', text: 'مرحباً بك في سند AI v${APP_VERSION}، كيف نقدر نخدمك اليوم؟', sentAt: formatTimeShort() }
                ];
            }
            return acctThreads[activeAcct];
        }

        function ensureThreadEntry(ownerAcct, peerKey) {
            var cleanOwner = cleanIdValue(ownerAcct || activeAcct) || activeAcct;
            var cleanPeer = cleanIdValue(peerKey) || DEFAULT_PEER;
            if (!acctThreads[cleanOwner]) acctThreads[cleanOwner] = {};
            if (!acctThreads[cleanOwner][cleanPeer]) acctThreads[cleanOwner][cleanPeer] = [];
            return { owner: cleanOwner, key: cleanPeer, list: acctThreads[cleanOwner][cleanPeer] };
        }

        function incrementUnreadForPeer(peerId) {
            var key = normalizeStr(peerId);
            if (!key) return;
            unreadByThread[key] = (Number(unreadByThread[key]) || 0) + 1;
            updateUnreadBadgesUI();
        }
        function clearUnreadForPeer(peerId) {
            var key = normalizeStr(peerId);
            if (!key) return;
            delete unreadByThread[key];
            updateUnreadBadgesUI();
        }
        function updateUnreadBadgesUI() {
            var total = 0;
            Object.keys(unreadByThread).forEach(function(k) { total += Number(unreadByThread[k] || 0); });
            var dot = document.getElementById('header-unread-dot');
            var navBadge = document.getElementById('nav-chats-badge');
            if (dot) {
                dot.textContent = toWesternDigits(total);
                dot.classList.toggle('hidden', total <= 0);
            }
            if (navBadge) {
                navBadge.textContent = toWesternDigits(total);
                navBadge.classList.toggle('hidden', total <= 0);
            }
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
                toastTimer = setTimeout(function() { box.classList.add('hidden'); }, 4500);
            }
            playChimeSound();
        }
        function jumpToToastChat() {
            var box = document.getElementById('live-toast');
            if (box) box.classList.add('hidden');
            if (toastPeerId) choosePeer(toastPeerId);
        }

        function handleMsgsScroll(el) {
            if (!el) return;
            lastScrollTopMsgs = el.scrollTop;
        }
        function toggleThreadSearchBar() {
            var bar = document.getElementById('thread-search-bar');
            if (!bar) return;
            bar.classList.toggle('hidden');
            if (!bar.classList.contains('hidden')) {
                var inp = document.getElementById('thread-search-input');
                if (inp) inp.focus();
            } else {
                renderMsgs();
            }
        }
        function closeThreadSearchBar() {
            var bar = document.getElementById('thread-search-bar');
            var inp = document.getElementById('thread-search-input');
            if (inp) inp.value = '';
            if (bar) bar.classList.add('hidden');
            renderMsgs();
        }
        function toggleLongMsgExpand(msgId) {
            if (expandedLongMsgIds.has(msgId)) expandedLongMsgIds.delete(msgId);
            else expandedLongMsgIds.add(msgId);
            renderMsgs();
        }
        function openLongMsgReader(msgId) {
            var list = getThreadMap()[currentPeer] || [];
            var m = list.find(function(x) { return x && x.id === msgId; });
            if (!m) return;
            var modal = document.getElementById('long-msg-reader-modal');
            var title = document.getElementById('long-msg-reader-title');
            var body = document.getElementById('long-msg-reader-body');
            var spk = document.getElementById('long-msg-reader-speak-btn');
            if (title) title.textContent = 'رسالة من ' + (m.from === 'me' ? 'أنت' : (m.senderName || currentPeer));
            if (body) body.textContent = m.text || '';
            if (spk) spk.onclick = function() { speakText(m.text || ''); };
            if (modal) modal.classList.remove('hidden');
        }
        function closeLongMsgReader() {
            var modal = document.getElementById('long-msg-reader-modal');
            if (modal) modal.classList.add('hidden');
        }
        function scrollToQuotedMessage(msgId) {
            var safeDomId = String(msgId || '').replace(/[^a-zA-Z0-9_-]/g, '_');
            var el = document.getElementById('msg-item-' + safeDomId);
            if (!el) return;
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('msg-highlight-pulse');
            setTimeout(function() { el.classList.remove('msg-highlight-pulse'); }, 1500);
        }

        function renderPinnedBanner() {
            var banner = document.getElementById('pinned-msg-banner');
            var txt = document.getElementById('pinned-msg-text');
            if (!banner || !txt) return;
            var pin = pinnedByThread[normalizeStr(currentPeer)];
            if (pin && pin.text) {
                txt.textContent = pin.text;
                banner.classList.remove('hidden');
            } else {
                banner.classList.add('hidden');
            }
        }
        function unpinCurrentThreadMsg() {
            delete pinnedByThread[normalizeStr(currentPeer)];
            persistAndDraw();
        }

        function renderMsgs() {
            var box = document.getElementById('msgs-box');
            if (!box) return;
            var searchInp = document.getElementById('thread-search-input');
            var searchQ = searchInp ? normalizeStr(searchInp.value) : '';
            var list = (getThreadMap()[currentPeer] || []).filter(function(m) {
                if (!m || m.deleted) return false;
                if (!searchQ) return true;
                return normalizeStr(m.text || '').indexOf(searchQ) !== -1 || normalizeStr(m.fileName || '').indexOf(searchQ) !== -1;
            });
            var cntEl = document.getElementById('thread-search-count');
            if (cntEl && searchQ) cntEl.textContent = toWesternDigits(list.length) + ' نتيجة';

            box.innerHTML = list.map(function(m) {
                var isMe = m.from === 'me';
                var safeDomId = String(m.id || '').replace(/[^a-zA-Z0-9_-]/g, '_');
                var rawText = String(m.text || '');
                var isLong = m.kind === 'text' && rawText.length > 260;
                var isExpanded = expandedLongMsgIds.has(m.id);
                var shownText = (isLong && !isExpanded) ? (rawText.slice(0, 260).trim() + '...') : rawText;

                var quoteHtml = '';
                if (m.replyTo && m.replyTo.snippet) {
                    quoteHtml = '<div onclick="scrollToQuotedMessage(\\'' + escapeJsSingle(m.replyTo.id) + '\\')" class="mb-1.5 px-2.5 py-1 rounded-lg bg-black/25 border-r-2 border-teal-300 text-[11px] cursor-pointer">' +
                        '<div class="font-bold text-teal-200">' + escapeHtml(m.replyTo.senderLabel || 'رسالة') + '</div>' +
                        '<div class="text-slate-200 truncate">' + escapeHtml(m.replyTo.snippet) + '</div></div>';
                }

                var mediaHtml = '';
                if (m.kind === 'audio' && m.mediaUrl) {
                    mediaHtml = '<audio controls src="' + m.mediaUrl + '" class="w-full max-w-[240px] h-9 mt-1"></audio>';
                } else if (m.kind === 'image' && m.mediaUrl) {
                    mediaHtml = '<img src="' + m.mediaUrl + '" class="max-w-[220px] rounded-xl mt-1 border border-slate-700/60">';
                } else if (m.kind === 'file' && m.mediaUrl) {
                    mediaHtml = '<a href="' + m.mediaUrl + '" download="' + escapeHtml(m.fileName || 'file') + '" class="inline-flex items-center gap-1.5 mt-1 text-xs underline text-teal-200"><i class="fa-solid fa-file-arrow-down"></i>' + escapeHtml(m.fileName || 'ملف') + '</a>';
                }

                var longBtnsHtml = '';
                if (isLong) {
                    longBtnsHtml = '<div class="flex items-center gap-2 mt-1.5 pt-1 border-t border-white/10 text-[10px]">' +
                        '<button type="button" onclick="toggleLongMsgExpand(\\'' + escapeJsSingle(m.id) + '\\')" class="text-teal-200 font-semibold">' + (isExpanded ? 'إظهار أقل' : 'قراءة المزيد') + '</button>' +
                        '<button type="button" onclick="openLongMsgReader(\\'' + escapeJsSingle(m.id) + '\\')" class="text-emerald-200 font-semibold">نافذة القراءة</button>' +
                        '</div>';
                }

                var tickHtml = '';
                if (isMe) {
                    tickHtml = m.read
                        ? '<span class="text-sky-300 font-mono text-[10px]">✓✓</span>'
                        : '<span class="text-slate-300 font-mono text-[10px]">✓</span>';
                }

                return '<div id="msg-item-' + escapeHtml(safeDomId) + '" oncontextmenu="event.preventDefault(); openMsgContextMenu(\\'' + escapeJsSingle(m.id) + '\\');" class="flex ' + (isMe ? 'justify-start' : 'justify-end') + '">' +
                    '<div class="max-w-[82%] rounded-2xl px-3.5 py-2 text-xs shadow ' +
                    (isMe ? 'bg-[#164e63] text-white rounded-br-sm' : 'bg-[#0d1926] border border-slate-800 text-slate-100 rounded-bl-sm') + '">' +
                    (!isMe && m.senderName ? '<div class="text-[10px] font-bold text-teal-300 mb-0.5">' + escapeHtml(m.senderName) + '</div>' : '') +
                    quoteHtml +
                    (m.kind === 'text' ? '<div class="whitespace-pre-wrap break-words leading-relaxed">' + escapeHtml(shownText) + '</div>' : '') +
                    mediaHtml +
                    longBtnsHtml +
                    '<div class="flex items-center justify-between gap-2 mt-1 text-[10px] text-slate-300/80">' +
                    '<span>' + escapeHtml(m.sentAt || '') + (m.edited ? ' • معدّل' : '') + '</span>' +
                    '<div class="flex items-center gap-1.5">' + tickHtml +
                    '<button type="button" onclick="openMsgContextMenu(\\'' + escapeJsSingle(m.id) + '\\')" class="hover:text-white px-0.5"><i class="fa-solid fa-ellipsis"></i></button>' +
                    '</div></div></div></div>';
            }).join('');
            box.scrollTop = box.scrollHeight;
        }

        function dispatchMessageToRecipients(targetPeerId, msgObj) {
            var grp = findGroupById(targetPeerId);
            var recipients = grp && Array.isArray(grp.members) && grp.members.length
                ? grp.members.filter(function(m) { return normalizeStr(m) !== normalizeStr(activeAcct); })
                : [targetPeerId];

            recipients.forEach(function(recId) {
                var pkt = {
                    type: 'chat_message',
                    eventId: 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
                    from: activeAcct,
                    senderName: activeAcct,
                    to: cleanIdValue(recId),
                    groupId: grp ? grp.id : null,
                    groupName: grp ? grp.name : null,
                    msg: msgObj
                };
                sendPacketWithFallback(pkt);
            });
        }

        function sendTextMsg() {
            var inp = document.getElementById('msg-box-input');
            if (!inp) return;
            var txt = inp.value.trim();
            if (!txt) return;

            if (editingMsgId) {
                var list = getThreadMap()[currentPeer] || [];
                var target = list.find(function(m) { return m && m.id === editingMsgId; });
                if (target) {
                    target.text = txt;
                    target.edited = true;
                    sendPacketWithFallback({
                        type: 'edit_message',
                        eventId: 'edit-' + Date.now(),
                        from: activeAcct,
                        to: currentPeer,
                        msgId: target.id,
                        text: txt
                    });
                }
                cancelEditMessage();
                inp.value = '';
                autoResizeComposer(inp);
                persistAndDraw();
                return;
            }

            var msgObj = {
                id: 'm-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
                from: 'me',
                senderName: activeAcct,
                kind: 'text',
                text: txt,
                sentAt: formatTimeShort(),
                replyTo: replyingToMsg ? Object.assign({}, replyingToMsg) : null
            };

            var entry = ensureThreadEntry(activeAcct, currentPeer);
            entry.list.push(msgObj);
            if (!contacts.some(function(c) { return normalizeStr(c.id) === normalizeStr(currentPeer); }) && !findGroupById(currentPeer)) {
                contacts.push({ name: 'معرّف ' + currentPeer, id: currentPeer });
            }

            inp.value = '';
            autoResizeComposer(inp);
            cancelReplyMessage();
            persistAndDraw();

            if (currentPeer === DEFAULT_PEER) {
                setTimeout(function() {
                    var botMsg = {
                        id: 'bot-' + Date.now(),
                        from: 'them',
                        senderName: DEFAULT_PEER,
                        kind: 'text',
                        text: 'تم استلام رسالتك ("' + txt.slice(0, 60) + '"). يمكنك الآن مراسلة أو الاتصال بأي معرّف أو رقم عبر السيرفر.',
                        sentAt: formatTimeShort()
                    };
                    entry.list.push(botMsg);
                    persistAndDraw();
                }, 400);
                return;
            }

            dispatchMessageToRecipients(currentPeer, msgObj);
        }

        function onFilePicked(ev) {
            var file = ev && ev.target && ev.target.files && ev.target.files[0];
            if (!file) return;
            if (file.size > 1_200_000) {
                alert('حجم الملف كبير للشبكة المباشرة؛ يُفضّل ملفاً أقل من 1.2 ميجابايت.');
                ev.target.value = '';
                return;
            }
            var reader = new FileReader();
            reader.onload = function() {
                var isImg = /^image\\//i.test(file.type);
                var msgObj = {
                    id: 'f-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
                    from: 'me',
                    senderName: activeAcct,
                    kind: isImg ? 'image' : 'file',
                    fileName: file.name,
                    text: isImg ? '' : file.name,
                    mediaUrl: reader.result,
                    sentAt: formatTimeShort()
                };
                var entry = ensureThreadEntry(activeAcct, currentPeer);
                entry.list.push(msgObj);
                persistAndDraw();
                if (currentPeer !== DEFAULT_PEER) dispatchMessageToRecipients(currentPeer, msgObj);
            };
            reader.readAsDataURL(file);
            ev.target.value = '';
        }

        // التسجيل الصوتي
        function toggleVoiceCapture() {
            if (mediaRecorderObj && mediaRecorderObj.state === 'recording') {
                try { mediaRecorderObj.stop(); } catch (e) {}
                return;
            }
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                return alert('التسجيل الصوتي غير مدعوم في هذا المتصفح.');
            }
            navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
                recordedChunks = [];
                recSeconds = 0;
                var timerEl = document.getElementById('rec-timer');
                var btn = document.getElementById('voice-btn');
                if (timerEl) {
                    timerEl.textContent = '00:00';
                    timerEl.classList.remove('hidden');
                }
                if (btn) btn.classList.add('bg-rose-700', 'text-white');

                recInterval = setInterval(function() {
                    recSeconds += 1;
                    if (timerEl) timerEl.textContent = formatSecondsTimer(recSeconds);
                }, 1000);

                mediaRecorderObj = new MediaRecorder(stream);
                mediaRecorderObj.ondataavailable = function(e) {
                    if (e.data && e.data.size > 0) recordedChunks.push(e.data);
                };
                mediaRecorderObj.onstop = function() {
                    clearInterval(recInterval);
                    if (timerEl) timerEl.classList.add('hidden');
                    if (btn) btn.classList.remove('bg-rose-700', 'text-white');
                    stream.getTracks().forEach(function(t) { t.stop(); });

                    var blob = new Blob(recordedChunks, { type: 'audio/webm' });
                    var reader = new FileReader();
                    reader.onload = function() {
                        recordedVoiceDraft = {
                            dataUrl: reader.result,
                            duration: formatSecondsTimer(recSeconds)
                        };
                        var bar = document.getElementById('voice-draft-bar');
                        var lbl = document.getElementById('voice-draft-label');
                        if (lbl) lbl.textContent = 'تسجيل صوتي جاهز (' + recordedVoiceDraft.duration + ')';
                        if (bar) bar.classList.remove('hidden');
                    };
                    reader.readAsDataURL(blob);
                };
                mediaRecorderObj.start();
            }).catch(function() {
                alert('يرجى السماح بالوصول إلى الميكروفون للتسجيل الصوتي.');
            });
        }

        function previewRecordedVoiceDraft() {
            if (!recordedVoiceDraft || !recordedVoiceDraft.dataUrl) return;
            if (voicePreviewAudio) { try { voicePreviewAudio.pause(); } catch (e) {} }
            voicePreviewAudio = new Audio(recordedVoiceDraft.dataUrl);
            voicePreviewAudio.play().catch(function() {});
        }
        function discardRecordedVoiceDraft() {
            recordedVoiceDraft = null;
            var bar = document.getElementById('voice-draft-bar');
            if (bar) bar.classList.add('hidden');
        }
        function sendRecordedVoiceDraft() {
            if (!recordedVoiceDraft || !recordedVoiceDraft.dataUrl) return;
            var msgObj = {
                id: 'aud-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
                from: 'me',
                senderName: activeAcct,
                kind: 'audio',
                text: 'تسجيل صوتي (' + recordedVoiceDraft.duration + ')',
                mediaUrl: recordedVoiceDraft.dataUrl,
                sentAt: formatTimeShort()
            };
            var entry = ensureThreadEntry(activeAcct, currentPeer);
            entry.list.push(msgObj);
            discardRecordedVoiceDraft();
            persistAndDraw();
            if (currentPeer !== DEFAULT_PEER) dispatchMessageToRecipients(currentPeer, msgObj);
        }

        // خيارات الرسائل
        function cancelReplyMessage() {
            replyingToMsg = null;
            var b = document.getElementById('replying-msg-banner');
            if (b) b.classList.add('hidden');
        }
        function cancelEditMessage() {
            editingMsgId = null;
            var b = document.getElementById('editing-msg-banner');
            if (b) b.classList.add('hidden');
        }
        function openMsgContextMenu(msgId) {
            contextMenuMsgId = msgId;
            var m = document.getElementById('msg-context-modal');
            if (m) m.classList.remove('hidden');
        }
        function closeMsgContextMenu() {
            var m = document.getElementById('msg-context-modal');
            if (m) m.classList.add('hidden');
        }
        function getContextMessageObj() {
            var list = getThreadMap()[currentPeer] || [];
            return list.find(function(x) { return x && x.id === contextMenuMsgId; }) || null;
        }
        function ctxReplyAction() {
            var m = getContextMessageObj();
            closeMsgContextMenu();
            if (!m) return;
            replyingToMsg = {
                id: m.id,
                senderLabel: m.from === 'me' ? 'أنت' : (m.senderName || currentPeer),
                snippet: m.text || (m.kind === 'audio' ? 'تسجيل صوتي' : 'مرفق')
            };
            var b = document.getElementById('replying-msg-banner');
            var l = document.getElementById('replying-to-label');
            var s = document.getElementById('replying-to-snippet');
            if (l) l.textContent = 'رد على ' + replyingToMsg.senderLabel;
            if (s) s.textContent = replyingToMsg.snippet;
            if (b) b.classList.remove('hidden');
        }
        function ctxCopyAction() {
            var m = getContextMessageObj();
            closeMsgContextMenu();
            if (!m || !m.text) return;
            lastCopiedMessageText = m.text;
            copyStringToClipboard(m.text);
        }
        function ctxPasteAction() {
            var m = getContextMessageObj();
            closeMsgContextMenu();
            var inp = document.getElementById('msg-box-input');
            if (!inp) return;
            var txt = (m && m.text) ? m.text : lastCopiedMessageText;
            if (!txt) return;
            inp.value = (inp.value ? inp.value + ' ' : '') + txt;
            autoResizeComposer(inp);
        }
        function ctxEditAction() {
            var m = getContextMessageObj();
            closeMsgContextMenu();
            if (!m || m.from !== 'me' || m.kind !== 'text') return;
            editingMsgId = m.id;
            var inp = document.getElementById('msg-box-input');
            var b = document.getElementById('editing-msg-banner');
            if (inp) { inp.value = m.text || ''; autoResizeComposer(inp); inp.focus(); }
            if (b) b.classList.remove('hidden');
        }
        function ctxPinAction() {
            var m = getContextMessageObj();
            closeMsgContextMenu();
            if (!m) return;
            pinnedByThread[normalizeStr(currentPeer)] = {
                id: m.id,
                text: m.text || (m.kind === 'audio' ? 'تسجيل صوتي مثبت' : 'مرفق مثبت')
            };
            persistAndDraw();
        }
        function ctxSpeakAction() {
            var m = getContextMessageObj();
            closeMsgContextMenu();
            if (!m) return;
            speakText(m.text || (m.kind === 'audio' ? 'رسالة صوتية' : 'مرفق'));
        }
        function ctxDeleteAction() {
            var m = getContextMessageObj();
            closeMsgContextMenu();
            if (!m) return;
            pendingDeleteMsgId = m.id;
            var modal = document.getElementById('delete-modal');
            var evBtn = document.getElementById('del-everyone-btn');
            if (evBtn) evBtn.classList.toggle('hidden', m.from !== 'me');
            if (modal) modal.classList.remove('hidden');
        }
        function closeDeleteModal() {
            pendingDeleteMsgId = null;
            var modal = document.getElementById('delete-modal');
            if (modal) modal.classList.add('hidden');
        }
        function confirmDeleteChoice(scope) {
            if (!pendingDeleteMsgId) return;
            var list = getThreadMap()[currentPeer] || [];
            var target = list.find(function(x) { return x && x.id === pendingDeleteMsgId; });
            if (target) {
                target.deleted = true;
                if (scope === 'all' && currentPeer !== DEFAULT_PEER) {
                    sendPacketWithFallback({
                        type: 'delete_message',
                        eventId: 'del-' + Date.now(),
                        from: activeAcct,
                        to: currentPeer,
                        msgId: target.id
                    });
                }
            }
            closeDeleteModal();
            persistAndDraw();
        }
        function clearThreadMsgs() {
            if (!confirm('هل تريد مسح رسائل هذه المحادثة من جهازك؟')) return;
            ensureThreadEntry(activeAcct, currentPeer).list = [];
            persistAndDraw();
        }
        function markCurrentThreadAsRead() {
            var list = getThreadMap()[currentPeer] || [];
            var changed = false;
            list.forEach(function(m) {
                if (m && m.from !== 'me' && !m.read) {
                    m.read = true;
                    changed = true;
                }
            });
            if (changed) persistState();
            if (currentPeer !== DEFAULT_PEER && !findGroupById(currentPeer)) {
                sendPacketWithFallback({
                    type: 'read_receipt',
                    eventId: 'read-' + Date.now(),
                    from: activeAcct,
                    to: currentPeer
                });
            }
        }

        // الحسابات والمكالمات
        function make8DigitId() {
            var code = String(Math.floor(10000000 + Math.random() * 90000000));
            lastGeneratedCode = code;
            if (myAccts.indexOf(code) === -1) myAccts.unshift(code);
            activeAcct = code;
            var banner = document.getElementById('last-generated-banner');
            var txt = document.getElementById('last-generated-text');
            if (banner && txt) {
                txt.textContent = 'المعرّف الجديد: ' + code;
                banner.classList.remove('hidden');
            }
            persistAndDraw();
            syncPresenceNow();
        }
        function addCustomNumberAccount() {
            var val = prompt('أدخل رقم الجوال أو المعرّف الخاص:');
            var clean = cleanIdValue(val);
            if (!clean) return;
            if (myAccts.indexOf(clean) === -1) myAccts.unshift(clean);
            activeAcct = clean;
            persistAndDraw();
            syncPresenceNow();
        }
        function verifyPhoneAccount() { addCustomNumberAccount(); }
        function switchActiveAccount(id) {
            var clean = cleanIdValue(id);
            if (!clean) return;
            activeAcct = clean;
            if (myAccts.indexOf(clean) === -1) myAccts.unshift(clean);
            persistAndDraw();
            syncPresenceNow();
        }
        function renderAccts() {
            var badge = document.getElementById('accounts-count-badge');
            if (badge) badge.textContent = toWesternDigits(myAccts.length) + (myAccts.length === 1 ? ' حساب' : ' حسابات');
            var box = document.getElementById('accounts-list');
            if (!box) return;
            box.innerHTML = myAccts.map(function(acc) {
                var isCur = normalizeStr(acc) === normalizeStr(activeAcct);
                return '<div class="flex items-center justify-between bg-[#08101a] border ' + (isCur ? 'border-teal-600' : 'border-slate-800') + ' p-2.5 rounded-xl text-xs">' +
                    '<span class="font-mono font-semibold text-white">' + escapeHtml(acc) + (isCur ? ' <span class="text-[10px] text-teal-300">(نشط)</span>' : '') + '</span>' +
                    '<div class="flex gap-1.5">' +
                    '<button type="button" onclick="copyStringToClipboard(\\'' + escapeJsSingle(acc) + '\\')" class="bg-slate-800 px-2.5 py-1 rounded-lg text-[11px] text-slate-200">نسخ</button>' +
                    (!isCur ? '<button type="button" onclick="switchActiveAccount(\\'' + escapeJsSingle(acc) + '\\')" class="bg-[#164e63] px-2.5 py-1 rounded-lg text-[11px] text-white font-semibold">تفعيل</button>' : '') +
                    '</div></div>';
            }).join('');
        }

        function renderPresence() {
            var box = document.getElementById('contacts-list');
            var badge = document.getElementById('contacts-summary-badge');
            var qEl = document.getElementById('contact-search-input');
            var q = qEl ? normalizeStr(qEl.value) : '';
            var filtered = contacts.filter(function(c) {
                if (!q) return true;
                return normalizeStr(c.name).indexOf(q) !== -1 || normalizeStr(c.id).indexOf(q) !== -1;
            });
            if (badge) badge.textContent = toWesternDigits(filtered.length) + ' جهة';
            if (!box) return;
            box.innerHTML = filtered.map(function(c) {
                var online = isPeerOnline(c.id) || c.id === DEFAULT_PEER;
                return '<div class="flex items-center justify-between bg-[#0d1926] border border-slate-800 p-3 rounded-xl text-xs gap-2">' +
                    '<div class="min-w-0">' +
                    '<p class="font-bold text-white truncate">' + escapeHtml(c.name) + ' <span class="text-[10px] font-normal ' + (online ? 'text-emerald-400' : 'text-slate-500') + '">• ' + (online ? 'متصل' : 'غير متصل') + '</span></p>' +
                    '<p class="font-mono text-[11px] text-slate-400 truncate">' + escapeHtml(c.id) + '</p>' +
                    '</div>' +
                    '<div class="flex gap-1.5 shrink-0">' +
                    '<button type="button" onclick="launchCall(\\'audio\\', \\'' + escapeJsSingle(c.id) + '\\')" class="bg-emerald-800 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg"><i class="fa-solid fa-phone"></i></button>' +
                    '<button type="button" onclick="choosePeer(\\'' + escapeJsSingle(c.id) + '\\')" class="bg-[#164e63] hover:bg-[#1e6078] text-white px-3 py-1.5 rounded-lg font-semibold">دردشة</button>' +
                    '</div></div>';
            }).join('');
        }

        function onCallDialInput() {
            var inp = document.getElementById('call-input');
            var prev = document.getElementById('call-resolved-preview');
            var sugBox = document.getElementById('call-contact-suggestions');
            var raw = inp ? inp.value.trim() : '';
            var matched = resolveContactByQuery(raw);
            if (prev) {
                if (matched) prev.textContent = 'المستهدف: ' + matched.name + ' (' + matched.id + ')';
                else if (cleanIdValue(raw)) prev.textContent = 'المستهدف: ' + cleanIdValue(raw);
                else prev.textContent = '';
            }
            if (sugBox) {
                var q = normalizeStr(raw);
                var list = contacts.filter(function(c) {
                    if (c.id === DEFAULT_PEER) return false;
                    if (!q) return true;
                    return normalizeStr(c.name).indexOf(q) !== -1 || normalizeStr(c.id).indexOf(q) !== -1;
                }).slice(0, 6);
                sugBox.innerHTML = list.map(function(c) {
                    return '<button type="button" onclick="selectCallSuggestion(\\'' + escapeJsSingle(c.id) + '\\')" class="px-2.5 py-1 rounded-full bg-[#08101a] border border-slate-800 hover:border-teal-600 text-[11px] text-slate-200">' +
                        escapeHtml(c.name) + ' • <span class="font-mono">' + escapeHtml(c.id) + '</span></button>';
                }).join('');
            }
        }
        function selectCallSuggestion(id) {
            var inp = document.getElementById('call-input');
            if (inp) inp.value = cleanIdValue(id);
            onCallDialInput();
        }
        function startDialedCall(mode) {
            var inp = document.getElementById('call-input');
            var raw = inp ? inp.value.trim() : '';
            if (!raw) return launchCall(mode, currentPeer);
            var matched = resolveContactByQuery(raw);
            launchCall(mode, matched ? matched.id : cleanIdValue(raw));
        }

        function toggleGroupCallPeer(id) {
            var clean = cleanIdValue(id);
            if (!clean) return;
            if (selectedGroupCallPeers.has(clean)) selectedGroupCallPeers.delete(clean);
            else selectedGroupCallPeers.add(clean);
            renderGroupCallPickers();
        }
        function selectAllGroupCallPeers() {
            contacts.forEach(function(c) {
                if (c.id && c.id !== DEFAULT_PEER && normalizeStr(c.id) !== normalizeStr(activeAcct)) {
                    selectedGroupCallPeers.add(c.id);
                }
            });
            renderGroupCallPickers();
        }
        function clearGroupCallPeers() {
            selectedGroupCallPeers.clear();
            renderGroupCallPickers();
        }
        function renderGroupCallPickers() {
            var badge = document.getElementById('group-call-selected-badge');
            var presets = document.getElementById('group-call-presets');
            var picker = document.getElementById('group-call-contact-picker');
            if (badge) badge.textContent = toWesternDigits(selectedGroupCallPeers.size) + ' مشارك';
            if (presets) {
                presets.innerHTML =
                    '<button type="button" onclick="selectAllGroupCallPeers()" class="px-2.5 py-1 rounded-lg bg-slate-800 text-[11px] text-teal-200 font-semibold">تحديد الكل</button>' +
                    '<button type="button" onclick="clearGroupCallPeers()" class="px-2.5 py-1 rounded-lg bg-slate-800 text-[11px] text-slate-300 font-semibold">إلغاء التحديد</button>';
            }
            if (picker) {
                picker.innerHTML = contacts.filter(function(c) { return c.id !== DEFAULT_PEER; }).map(function(c) {
                    var picked = selectedGroupCallPeers.has(c.id);
                    return '<button type="button" onclick="toggleGroupCallPeer(\\'' + escapeJsSingle(c.id) + '\\')" class="px-2.5 py-1 rounded-full text-[11px] font-semibold border ' +
                        (picked ? 'bg-emerald-800 border-emerald-400 text-white' : 'bg-[#08101a] border-slate-800 text-slate-300') + '">' +
                        escapeHtml(c.name) + '</button>';
                }).join('');
            }
        }
        function launchGroupCall(mode) {
            var targets = Array.from(selectedGroupCallPeers);
            if (!targets.length) return alert('اختر مشاركاً واحداً على الأقل للمكالمة الجماعية.');
            isGroupCallActive = true;
            activeGroupCallTargets = targets.slice();
            launchCall(mode, targets[0], true);
        }

        function startCallDurationCounter() {
            stopCallDurationCounter();
            callSeconds = 0;
            var el = document.getElementById('call-timer-el');
            if (el) el.textContent = '00:00';
            callDurationTimer = setInterval(function() {
                callSeconds += 1;
                if (el) el.textContent = formatSecondsTimer(callSeconds);
            }, 1000);
        }
        function stopCallDurationCounter() {
            clearInterval(callDurationTimer);
            callDurationTimer = null;
        }
        function forceUnmuteAudio() {
            var remAudio = document.getElementById('remote-audio-el');
            var remVid = document.getElementById('remote-video-el');
            if (remAudio) { remAudio.muted = false; remAudio.play().catch(function() {}); }
            if (remVid) { remVid.muted = false; remVid.play().catch(function() {}); }
        }
        function toggleSpeakerOrEarpiece() {
            speakerModeActive = !speakerModeActive;
            var lbl = document.getElementById('speaker-btn-label');
            var hint = document.getElementById('call-output-hint');
            if (lbl) lbl.textContent = speakerModeActive ? 'مكبر' : 'سماعة';
            if (hint) hint.textContent = 'مخرج الصوت: ' + (speakerModeActive ? 'مكبر الصوت' : 'سماعة الأذن');
            forceUnmuteAudio();
        }
        function toggleMuteTrack() {
            micMuted = !micMuted;
            if (localStream) {
                localStream.getAudioTracks().forEach(function(t) { t.enabled = !micMuted; });
            }
            var ico = document.getElementById('mute-icon');
            if (ico) ico.className = micMuted ? 'fa-solid fa-microphone-slash text-rose-400' : 'fa-solid fa-microphone';
        }
        function switchCameraFacing() {
            if (activeCallMode !== 'video') return;
            currentCameraFacing = (currentCameraFacing === 'user') ? 'environment' : 'user';
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
            navigator.mediaDevices.getUserMedia({
                audio: true,
                video: { facingMode: currentCameraFacing }
            }).then(function(newStream) {
                var newVid = newStream.getVideoTracks()[0];
                if (localStream && newVid) {
                    localStream.getVideoTracks().forEach(function(t) { t.stop(); });
                    var oldVid = localStream.getVideoTracks()[0];
                    if (oldVid) localStream.removeTrack(oldVid);
                    localStream.addTrack(newVid);
                    var lv = document.getElementById('local-video-el');
                    if (lv) lv.srcObject = localStream;
                    if (pc) {
                        var sender = pc.getSenders().find(function(s) { return s.track && s.track.kind === 'video'; });
                        if (sender) sender.replaceTrack(newVid).catch(function() {});
                    }
                }
            }).catch(function() {});
        }

        function ensurePeerConnection(targetPeerId) {
            if (pc) return pc;
            var RTCPeer = window.RTCPeerConnection || window.webkitRTCPeerConnection;
            pc = new RTCPeer(ICE_SERVERS);

            if (localStream) {
                localStream.getTracks().forEach(function(track) {
                    pc.addTrack(track, localStream);
                });
            }

            pc.ontrack = function(ev) {
                var stream = ev.streams && ev.streams[0];
                if (!stream) return;
                var remAudio = document.getElementById('remote-audio-el');
                var remVid = document.getElementById('remote-video-el');
                if (remAudio) { remAudio.srcObject = stream; remAudio.play().catch(function() {}); }
                if (activeCallMode === 'video' && remVid) {
                    remVid.srcObject = stream;
                    remVid.classList.remove('hidden');
                    remVid.play().catch(function() {});
                }
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
                    startCallDurationCounter();
                } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                    st.textContent = 'انقطع الاتصال';
                }
            };
            return pc;
        }

        function prepareLocalMedia(mode) {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                return Promise.resolve(null);
            }
            return navigator.mediaDevices.getUserMedia({
                audio: true,
                video: mode === 'video' ? { facingMode: currentCameraFacing } : false
            }).then(function(stream) {
                localStream = stream;
                var lv = document.getElementById('local-video-el');
                var vc = document.getElementById('voice-call-card');
                if (mode === 'video' && lv) {
                    lv.srcObject = stream;
                    lv.classList.remove('hidden');
                    if (vc) vc.classList.add('hidden');
                } else {
                    if (lv) lv.classList.add('hidden');
                    if (vc) vc.classList.remove('hidden');
                }
                return stream;
            }).catch(function() {
                return null;
            });
        }

        function launchCall(mode, targetId, isGroupFlag) {
            var peer = cleanIdValue(targetId || currentPeer);
            if (!peer || peer === DEFAULT_PEER) {
                return alert('اختر أو اكتب معرّف أو رقم الطرف الآخر أولاً.');
            }
            activeCallPeerId = peer;
            activeCallMode = mode === 'video' ? 'video' : 'audio';
            micMuted = false;

            var modal = document.getElementById('call-modal');
            var title = document.getElementById('call-peer-title');
            var status = document.getElementById('call-status-msg');
            var acceptBtn = document.getElementById('accept-btn');
            var modeLbl = document.getElementById('call-mode-label');
            var pBar = document.getElementById('call-participants-bar');

            if (title) title.textContent = isGroupFlag ? ('مكالمة جماعية (' + toWesternDigits(activeGroupCallTargets.length) + ')') : formatPeerDisplay(peer);
            if (status) status.textContent = 'جاري طلب الاتصال...';
            if (acceptBtn) acceptBtn.classList.add('hidden');
            if (modeLbl) modeLbl.textContent = activeCallMode === 'video' ? 'مكالمة فيديو مباشرة' : 'مكالمة صوتية مباشرة • أولوية جودة الصوت';
            if (pBar) {
                if (isGroupFlag && activeGroupCallTargets.length) {
                    pBar.classList.remove('hidden');
                    pBar.innerHTML = activeGroupCallTargets.map(function(t) {
                        return '<span class="px-2 py-0.5 rounded-full bg-teal-950 border border-teal-800 text-[10px] font-mono text-teal-200">' + escapeHtml(t) + '</span>';
                    }).join('');
                } else {
                    pBar.classList.add('hidden');
                }
            }
            if (modal) modal.classList.remove('hidden');
            playChimeSound();

            var targets = (isGroupFlag && activeGroupCallTargets.length) ? activeGroupCallTargets : [peer];
            prepareLocalMedia(activeCallMode).then(function() {
                var conn = ensurePeerConnection(peer);
                conn.createOffer().then(function(offer) {
                    return conn.setLocalDescription(offer).then(function() {
                        targets.forEach(function(tId) {
                            sendPacketWithFallback({
                                type: 'call_signal',
                                eventId: 'call-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
                                from: activeAcct,
                                to: cleanIdValue(tId),
                                callMode: activeCallMode,
                                signalType: 'offer',
                                sdp: offer
                            });
                        });
                    });
                }).catch(function() {});
            });
        }

        function handleIncomingCallSignal(pkt) {
            var fromId = cleanIdValue(pkt.from);
            if (!fromId || normalizeStr(fromId) === normalizeStr(activeAcct)) return;

            if (pkt.signalType === 'offer') {
                pendingOfferData = pkt;
                pendingIceCandidates = [];
                activeCallPeerId = fromId;
                activeCallMode = pkt.callMode === 'video' ? 'video' : 'audio';

                var modal = document.getElementById('call-modal');
                var title = document.getElementById('call-peer-title');
                var status = document.getElementById('call-status-msg');
                var acceptBtn = document.getElementById('accept-btn');
                if (title) title.textContent = formatPeerDisplay(fromId);
                if (status) status.textContent = (activeCallMode === 'video' ? 'مكالمة فيديو واردة...' : 'مكالمة صوتية واردة...');
                if (acceptBtn) acceptBtn.classList.remove('hidden');
                if (modal) modal.classList.remove('hidden');
                playChimeSound();
                return;
            }

            if (pkt.signalType === 'answer' && pc) {
                var st = document.getElementById('call-status-msg');
                if (st) st.textContent = 'تم الرد • جاري الربط الصوتي/المرئي...';
                pc.setRemoteDescription(new RTCSessionDescription(pkt.sdp)).then(function() {
                    pendingIceCandidates.forEach(function(cand) {
                        pc.addIceCandidate(new RTCIceCandidate(cand)).catch(function() {});
                    });
                    pendingIceCandidates = [];
                }).catch(function() {});
                return;
            }

            if (pkt.signalType === 'ice' && pkt.candidate) {
                if (pc && pc.remoteDescription) {
                    pc.addIceCandidate(new RTCIceCandidate(pkt.candidate)).catch(function() {});
                } else {
                    pendingIceCandidates.push(pkt.candidate);
                }
                return;
            }

            if (pkt.signalType === 'hangup') {
                cleanupCallResources(false);
            }
        }

        function answerCall() {
            if (!pendingOfferData) return;
            var callerId = cleanIdValue(pendingOfferData.from);
            var mode = pendingOfferData.callMode === 'video' ? 'video' : 'audio';
            activeCallPeerId = callerId;
            activeCallMode = mode;

            var acceptBtn = document.getElementById('accept-btn');
            var status = document.getElementById('call-status-msg');
            if (acceptBtn) acceptBtn.classList.add('hidden');
            if (status) status.textContent = 'جاري فتح الاتصال...';

            prepareLocalMedia(mode).then(function() {
                var conn = ensurePeerConnection(callerId);
                conn.setRemoteDescription(new RTCSessionDescription(pendingOfferData.sdp)).then(function() {
                    return conn.createAnswer();
                }).then(function(answer) {
                    return conn.setLocalDescription(answer).then(function() {
                        sendPacketWithFallback({
                            type: 'call_signal',
                            eventId: 'ans-' + Date.now(),
                            from: activeAcct,
                            to: callerId,
                            signalType: 'answer',
                            sdp: answer
                        });
                        pendingIceCandidates.forEach(function(cand) {
                            conn.addIceCandidate(new RTCIceCandidate(cand)).catch(function() {});
                        });
                        pendingIceCandidates = [];
                    });
                }).catch(function() {});
            });
        }

        function endActiveCall() {
            if (activeCallPeerId) {
                sendPacketWithFallback({
                    type: 'call_signal',
                    eventId: 'end-' + Date.now(),
                    from: activeAcct,
                    to: activeCallPeerId,
                    signalType: 'hangup'
                });
            }
            cleanupCallResources(true);
        }

        function cleanupCallResources(notifyPeer) {
            stopCallDurationCounter();
            if (pc) {
                try { pc.close(); } catch (e) {}
                pc = null;
            }
            if (localStream) {
                localStream.getTracks().forEach(function(t) { try { t.stop(); } catch (e) {} });
                localStream = null;
            }
            var lv = document.getElementById('local-video-el');
            var rv = document.getElementById('remote-video-el');
            var modal = document.getElementById('call-modal');
            if (lv) { lv.srcObject = null; lv.classList.add('hidden'); }
            if (rv) { rv.srcObject = null; rv.classList.add('hidden'); }
            if (modal) modal.classList.add('hidden');
            pendingOfferData = null;
            pendingIceCandidates = [];
            activeCallPeerId = null;
            isGroupCallActive = false;
            activeGroupCallTargets = [];
        }

        // المزامنة الحية عبر WebSocket و /api/sync
        function getAllWatchedIds() {
            var set = new Set([activeAcct].concat(myAccts).map(cleanIdValue).filter(Boolean));
            return Array.from(set);
        }

        function syncPresenceNow() {
            var ids = getAllWatchedIds();
            var pkt = { type: 'register_ids', activeId: activeAcct, ids: ids };
            if (ws && ws.readyState === 1) {
                try { ws.send(JSON.stringify(pkt)); } catch (e) {}
            }
            fetch('/api/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pkt)
            }).then(function(r) { return r.json(); }).then(function(data) {
                serverReachable = true;
                if (data && data.appVersion) triggerSilentAppUpdateIfNeeded(data.appVersion);
                if (data && Array.isArray(data.onlineIds)) {
                    onlinePeers = new Set(data.onlineIds);
                    renderPeerHeader();
                    renderPresence();
                }
            }).catch(function() {
                serverReachable = false;
            });
        }

        function sendPacketWithFallback(pkt) {
            if (!pkt) return;
            var sentWs = false;
            if (ws && ws.readyState === 1) {
                try {
                    ws.send(JSON.stringify(pkt));
                    sentWs = true;
                } catch (e) { sentWs = false; }
            }
            fetch('/api/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pkt)
            }).then(function(r) { return r.json(); }).then(function(data) {
                serverReachable = true;
                if (data && data.appVersion) triggerSilentAppUpdateIfNeeded(data.appVersion);
                if (data && typeof data.cursor === 'number' && data.cursor > lastSyncCursor) {
                    lastSyncCursor = data.cursor;
                    persistState();
                }
            }).catch(function() {
                if (!sentWs && pkt.type === 'chat_message') {
                    outboxQueue.push(pkt);
                    updateQueueBadge();
                    persistState();
                }
            });
        }

        function flushOutboxQueue() {
            if (!outboxQueue.length) return;
            var batch = outboxQueue.slice();
            outboxQueue = [];
            updateQueueBadge();
            persistState();
            batch.forEach(function(pkt) { sendPacketWithFallback(pkt); });
        }

        function handleIncomingServerEvent(ev) {
            if (!ev || typeof ev !== 'object') return;
            if (ev.type === 'online_users' && Array.isArray(ev.ids)) {
                onlinePeers = new Set(ev.ids);
                renderPeerHeader();
                renderPresence();
                return;
            }
            if (ev.eventId && seenEventIds.has(ev.eventId)) return;
            if (ev.eventId) {
                seenEventIds.add(ev.eventId);
                if (seenEventIds.size > 2000) {
                    var arr = Array.from(seenEventIds).slice(-1000);
                    seenEventIds = new Set(arr);
                }
            }

            if (ev.type === 'chat_message' && ev.msg) {
                var senderId = cleanIdValue(ev.from);
                if (!senderId || normalizeStr(senderId) === normalizeStr(activeAcct)) return;
                var threadKey = ev.groupId ? cleanIdValue(ev.groupId) : senderId;
                var entry = ensureThreadEntry(activeAcct, threadKey);
                if (!entry.list.some(function(x) { return x && x.id === ev.msg.id; })) {
                    entry.list.push({
                        id: ev.msg.id,
                        from: 'them',
                        senderName: ev.senderName || senderId,
                        kind: ev.msg.kind || 'text',
                        text: ev.msg.text || '',
                        fileName: ev.msg.fileName || '',
                        mediaUrl: ev.msg.mediaUrl || '',
                        sentAt: ev.msg.sentAt || formatTimeShort(),
                        replyTo: ev.msg.replyTo || null
                    });
                }
                if (!contacts.some(function(c) { return normalizeStr(c.id) === normalizeStr(senderId); })) {
                    contacts.push({ name: 'معرّف ' + senderId, id: senderId });
                }

                var isViewingThisThread = (window.__sanadCurrentTab === 'chats' && normalizeStr(currentPeer) === normalizeStr(threadKey) && document.visibilityState === 'visible');
                if (isViewingThisThread) {
                    markCurrentThreadAsRead();
                } else {
                    incrementUnreadForPeer(threadKey);
                    showLiveToast(ev.groupName ? (ev.groupName + ' • ' + senderId) : senderId, ev.msg.text || (ev.msg.kind === 'audio' ? 'تسجيل صوتي' : 'مرفق جديد'), threadKey);
                }

                var autoChk = document.getElementById('chk-autoreply');
                if (autoChk && autoChk.checked && !ev.groupId) {
                    var autoReplyMsg = {
                        id: 'ar-' + Date.now(),
                        from: 'me',
                        senderName: activeAcct,
                        kind: 'text',
                        text: 'شكراً لتواصلك، تم استلام رسالتك وسنرد عليك قريباً.',
                        sentAt: formatTimeShort()
                    };
                    entry.list.push(autoReplyMsg);
                    sendPacketWithFallback({
                        type: 'chat_message',
                        eventId: 'ar-pkt-' + Date.now(),
                        from: activeAcct,
                        senderName: activeAcct,
                        to: senderId,
                        msg: autoReplyMsg
                    });
                }

                persistAndDraw();
                return;
            }

            if (ev.type === 'read_receipt') {
                var readerId = cleanIdValue(ev.from);
                var tMap = getThreadMap();
                var list = tMap[readerId] || [];
                list.forEach(function(m) { if (m && m.from === 'me') m.read = true; });
                persistAndDraw();
                return;
            }

            if (ev.type === 'edit_message' && ev.msgId) {
                var editorId = cleanIdValue(ev.from);
                var eList = ensureThreadEntry(activeAcct, editorId).list;
                var target = eList.find(function(x) { return x && x.id === ev.msgId; });
                if (target) { target.text = ev.text || target.text; target.edited = true; }
                persistAndDraw();
                return;
            }

            if (ev.type === 'delete_message' && ev.msgId) {
                var deleterId = cleanIdValue(ev.from);
                var dList = ensureThreadEntry(activeAcct, deleterId).list;
                var dTarget = dList.find(function(x) { return x && x.id === ev.msgId; });
                if (dTarget) dTarget.deleted = true;
                persistAndDraw();
                return;
            }

            if (ev.type === 'call_signal') {
                handleIncomingCallSignal(ev);
            }
        }

        function openSocket() {
            if (typeof navigator !== 'undefined' && navigator.onLine === false) {
                updateOfflineNetworkUI(true);
                return;
            }
            if (ws) {
                try { ws.onclose = null; ws.close(); } catch (e) {}
                ws = null;
            }
            var proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
            try {
                ws = new WebSocket(proto + '//' + location.host);
            } catch (e) {
                setHeaderStatus('وضع المزامنة السريعة', true);
                scheduleReconnect();
                return;
            }

            ws.onopen = function() {
                wsConnected = true;
                serverReachable = true;
                setHeaderStatus('متصل مباشر', true);
                syncPresenceNow();
                flushOutboxQueue();
            };

            ws.onmessage = function(evt) {
                try {
                    var parsed = JSON.parse(String(evt.data || '{}'));
                    handleIncomingServerEvent(parsed);
                } catch (e) {}
            };

            ws.onclose = function() {
                wsConnected = false;
                if (typeof navigator !== 'undefined' && navigator.onLine === false) {
                    updateOfflineNetworkUI(true);
                } else {
                    setHeaderStatus('وضع المزامنة السريعة', true);
                    scheduleReconnect();
                }
            };

            ws.onerror = function() {
                wsConnected = false;
            };
        }

        function scheduleReconnect() {
            clearTimeout(reconnectTimer);
            var delay = isWeakNetworkMode() ? 5000 : 2500;
            reconnectTimer = setTimeout(function() {
                if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
                openSocket();
            }, delay);
        }

        function reconnectNow() {
            if (typeof navigator !== 'undefined' && navigator.onLine === false) {
                updateOfflineNetworkUI(true);
                return;
            }
            updateOfflineNetworkUI(false);
            setHeaderStatus('جاري التحديث...', false);
            openSocket();
            pollHttpSync();
            flushOutboxQueue();
        }

        function pollHttpSync() {
            if (pollInFlight) return;
            if (typeof navigator !== 'undefined' && navigator.onLine === false) {
                updateOfflineNetworkUI(true);
                return;
            }
            pollInFlight = true;
            var idsQuery = encodeURIComponent(getAllWatchedIds().join(','));
            fetch('/api/sync?since=' + encodeURIComponent(String(lastSyncCursor)) + '&ids=' + idsQuery, {
                cache: 'no-store'
            }).then(function(r) { return r.json(); }).then(function(data) {
                pollInFlight = false;
                serverReachable = true;
                if (data && data.appVersion) triggerSilentAppUpdateIfNeeded(data.appVersion);
                if (data && Array.isArray(data.onlineIds)) {
                    onlinePeers = new Set(data.onlineIds);
                    renderPeerHeader();
                    renderPresence();
                }
                if (data && Array.isArray(data.events) && data.events.length) {
                    data.events.forEach(function(ev) { handleIncomingServerEvent(ev); });
                }
                if (data && typeof data.cursor === 'number' && data.cursor > lastSyncCursor) {
                    lastSyncCursor = data.cursor;
                    persistState();
                }
                if (!wsConnected) setHeaderStatus('متصل', true);
                flushOutboxQueue();
            }).catch(function() {
                pollInFlight = false;
                if (!wsConnected) setHeaderStatus('جاري إعادة الربط...', false);
            });
        }

        function shareInviteLink() {
            var invite = location.origin + '/?peer=' + encodeURIComponent(activeAcct);
            copyStringToClipboard(invite);
            alert('تم نسخ رابط الدعوة الخاص بحسابك: ' + invite);
        }

        function checkUrlPeerInvite() {
            try {
                var u = new URL(location.href);
                var p = cleanIdValue(u.searchParams.get('peer') || '');
                if (p && normalizeStr(p) !== normalizeStr(activeAcct)) {
                    if (!contacts.some(function(c) { return normalizeStr(c.id) === normalizeStr(p); })) {
                        contacts.unshift({ name: 'مدعو ' + p, id: p });
                    }
                    currentPeer = p;
                }
            } catch (e) {}
        }

        window.addEventListener('DOMContentLoaded', function() {
            var devEl = document.getElementById('device-badge');
            if (devEl) devEl.textContent = detectDevice();
            loadSavedState();
            checkUrlPeerInvite();
            updateNetBadge();
            persistAndDraw();
            onCallDialInput();
            openSocket();
            syncPresenceNow();
            pollHttpSync();
            setInterval(pollHttpSync, 2500);
        });
        window.addEventListener('online', function() { updateOfflineNetworkUI(false); reconnectNow(); });
        window.addEventListener('offline', function() { updateOfflineNetworkUI(true); });
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
        const matchedEvents = syncEvents.filter(ev => {
            if (ev.cursor <= since) return false;
            if (!watchedIds.size) return true;
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
