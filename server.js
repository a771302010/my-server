const http = require('http');
const { WebSocketServer } = require('ws');

const APP_VERSION = '8.9.2';
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

// حالة السيرفر (حضور المستخدمين + سجل أحداث المزامنة)
const presenceMap = new Map(); // normId -> Set(wsClient)
const syncEvents = [];
let eventCursor = 0;

function recordSyncEvent(payload) {
    eventCursor += 1;
    const item = Object.assign({}, payload, {
        cursor: eventCursor,
        eventId: payload.eventId || ('srv-' + eventCursor + '-' + Date.now())
    });
    syncEvents.push(item);
    if (syncEvents.length > 1000) {
        syncEvents.splice(0, syncEvents.length - 1000);
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
        const ids = Array.isArray(payload.ids) ? payload.ids : [];
        if (payload.activeId) ids.unshift(payload.activeId);
        const cleanSet = new Set(ids.map(normIdServer).filter(Boolean));
        if (senderWs) {
            if (!senderWs._sanadIds) senderWs._sanadIds = new Set();
            // إزالة المعرّفات القديمة غير الموجودة في التحديث الجديد
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
                    <span id="ws-dot" class="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span id="ws-label" class="text-emerald-300 font-medium">متصل</span>
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
        <span><i class="fa-solid fa-plane-slash ml-1"></i> وضع بدون إنترنت — السجل محفوظ محلياً والرسائل تُرسل تلقائياً فور عودة الشبكة.</span>
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
        var serverReachable = true;
        var lastSyncCursor = 0;
        var autoReloadingForUpdate = false;
        var recordedVoiceDraft = null;
        var voicePreviewAudio = null;
        var lastScrollTopMsgs = 0;

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
        }
        function updateOfflineNetworkUI(isOfflineNow) {
            var banner = document.getElementById('offline-banner');
            if (banner) banner.classList.toggle('hidden', !isOfflineNow);
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
            updateUnreadBadgesUI();
        }

        function findGroupById(id) {
            return sanadGroups.find(function(g) { return normalizeStr(g.id) === normalizeStr(id); }) || null;
        }
        function resolveContactByQuery(rawQuery) {
            var q = normalizeStr(rawQuery);
            if (!q) return null;
            var grp = findGroupById(rawQuery);
            if (grp) return { id: grp.id, name: grp.name, isGroup: true };
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

        // إكمال الدالة التي انقطعت عندها الرسالة السابقة
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
                if (typeof onCallDialInput === 'function') onCallDialInput();
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
            var q = inp ? inp.value.trim() : '';
            renderQuickChips(q);
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
            var q = document.getElementById('contact-search-input').value.trim();
            var m = resolveContactByQuery(q);
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
            box.innerHTML = items.slice(0, 10).map(function(it) {
                var active = normalizeStr(it.id) === normalizeStr(currentPeer);
                return '<button type="button" onclick="choosePeer(\\'' + escapeJsSingle(it.id) + '\\')" class="px-2.5 py-1 rounded-full border text-[11px] font-semibold whitespace-nowrap shrink-0 ' +
                    (active ? 'bg-[#164e63] border-teal-500 text-white' : 'bg-[#08101a] border-slate-800 text-slate-300 hover:border-slate-700') + '">' +
                    escapeHtml(it.label) + '</button>';
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
            var online = isPeerOnline(currentPeer);
            if (statusEl) statusEl.textContent = online ? 'متصل الآن' : 'غير متصل';
            if (dotEl) dotEl.className = online ? 'w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0' : 'w-2.5 h-2.5 rounded-full bg-slate-600 shrink-0';
        }

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

        function verifyPhoneAccount() {
            addCustomNumberAccount();
        }

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
                var online = isPeerOnline(c.id);
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

        function shareInviteLink() {
            var invite = location.origin + '/?peer=' + encodeURIComponent(activeAcct);
            copyStringToClipboard(invite);
            alert('تم نسخ رابط الدعوة الخاص بحسابك: ' + invite);
        }

        window.addEventListener('DOMContentLoaded', function() {
            var devEl = document.getElementById('device-badge');
            if (devEl) devEl.textContent = detectDevice();
            loadSavedState();
            updateNetBadge();
            persistAndDraw();
            openSocket();
            syncPresenceNow();
            setInterval(pollHttpSync, 3500);
        });
        window.addEventListener('online', function() { updateOfflineNetworkUI(false); reconnectNow(); });
        window.addEventListener('offline', function() { updateOfflineNetworkUI(true); });
    </script>
</body>
</html>`;

const server = http.createServer((req, res) => {
    const reqUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = reqUrl.pathname;

    // رؤوس منع الكاش لضمان سرعة ظهور التحديثات الجديدة
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
                if (body.length > 2_000_000) req.destroy();
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
