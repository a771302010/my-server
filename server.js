const http = require('http');
const { WebSocketServer } = require('ws');

const APP_VERSION = '8.8.0';
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
      <stop offset="100%" stop-color="#164e63" stop-opacity="0"/>
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
  <text x="256" y="218" text-anchor="middle" fill="${ICON_ACCENT_HEX}" font-family="'Cairo', 'Tahoma', 'Arial', sans-serif" font-size="168" font-weight="900">س</text>
  <circle cx="182" cy="196" r="24" fill="url(#aiSparkGrad)"/>
  <path d="M126 246c22 52 78 78 134 78 58 0 112-26 136-78-30 16-66 34-106 34-26 0-48-8-64-16 26 2 52-4 72-14-36 4-76-2-104-20-26 12-48 14-68 14z" fill="none" stroke="${ICON_ACCENT_HEX}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="256" y="424" text-anchor="middle" fill="${ICON_ACCENT_HEX}" font-family="'Cairo', 'Tahoma', 'Arial', sans-serif" font-size="88" font-weight="900">سند</text>
</svg>`;

const manifestPayload = JSON.stringify({
  name: 'Sanad AI v8.8 - سند',
  short_name: 'سند AI',
  description: 'تطبيق سند AI للتواصل الذكي والمحادثات والمكالمات والعمل بدون إنترنت وتطوير المحتوى',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  orientation: 'portrait',
  background_color: '#0b131e',
  theme_color: ICON_BG_HEX,
  dir: 'rtl',
  lang: 'ar',
  icons: [
    { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png', purpose: 'any' },
    { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }
  ]
});

const swContent = `const CACHE_NAME = 'sanad-ai-cache-v${APP_VERSION}';
const APP_SHELL = ['/', '/manifest.json', '/icon.svg', '/apple-touch-icon.png'];

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

  if (req.mode === 'navigate' || url.pathname === '/' || url.pathname === '/manifest.json' || url.pathname === '/icon.svg' || url.pathname === '/apple-touch-icon.png') {
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
    <title>سند AI v8.8</title>
    <link id="sanad-favicon" rel="icon" type="image/svg+xml" href="/icon.svg">
    <link id="sanad-apple-icon" rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
    <link rel="manifest" href="/manifest.json">
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
        body { font-family: 'Cairo', sans-serif; background-color: #0b131e; color: #e6eef5; -webkit-user-select: text; user-select: text; }
        button, a { touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e6078; border-radius: 9999px; }
        .sanad-pane { display: none; height: 100%; width: 100%; overflow-y: auto; }
        .sanad-pane.sanad-pane-active { display: flex; flex-direction: column; }
    </style>
</head>
<body class="text-slate-100 h-screen flex flex-col overflow-hidden">

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

        (function generateSanadPngIcons() {
            try {
                var c = document.createElement('canvas');
                c.width = 512;
                c.height = 512;
                var ctx = c.getContext('2d');
                if (!ctx) return;

                var bgGrad = ctx.createLinearGradient(0, 0, 512, 512);
                bgGrad.addColorStop(0, '#1e6078');
                bgGrad.addColorStop(0.55, '#164e63');
                bgGrad.addColorStop(1, '#0f3646');
                ctx.fillStyle = bgGrad;
                ctx.fillRect(0, 0, 512, 512);

                ctx.font = '900 168px Cairo, Tahoma, Arial, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#f0fdfa';
                ctx.fillText('س', 256, 185);

                ctx.font = '900 88px Cairo, Tahoma, Arial, sans-serif';
                ctx.fillText('سند', 256, 412);

                var dataUrl = c.toDataURL('image/png');
                var appleEl = document.getElementById('sanad-apple-icon');
                var favEl = document.getElementById('sanad-favicon');
                if (appleEl) appleEl.setAttribute('href', dataUrl);
                if (favEl) {
                    favEl.setAttribute('type', 'image/png');
                    favEl.setAttribute('href', dataUrl);
                }
            } catch (e) {}
        })();

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
                        ? 'relative flex flex-col items-center gap-0.5 text-teal-300 font-extrabold text-[9px] px-0.5 py-1 whitespace-nowrap shrink-0 cursor-pointer'
                        : 'relative flex flex-col items-center gap-0.5 text-slate-400 font-semibold text-[9px] px-0.5 py-1 whitespace-nowrap shrink-0 cursor-pointer';
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

    <header class="bg-[#0f1b29]/95 border-b border-slate-800/90 px-3.5 py-2.5 flex justify-between items-center z-20 shrink-0">
        <div class="flex items-center gap-2.5 min-w-0">
            <div class="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-[#1e6078] via-[#164e63] to-[#0f3646] border border-teal-300/30 flex flex-col items-center justify-center shrink-0 shadow">
                <span class="text-teal-50 font-black text-base leading-none">س</span>
                <span class="text-[8px] font-bold text-teal-200 leading-tight mt-0.5">سند</span>
                <span id="header-unread-dot" class="hidden absolute -top-1.5 -left-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-mono font-black flex items-center justify-center shadow">0</span>
            </div>
            <div class="min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                    <h1 class="font-black text-base text-white leading-none">سند</h1>
                    <span class="text-[10px] bg-teal-950/80 text-teal-200 border border-teal-800/60 px-2 py-0.5 rounded-full font-bold">AI v8.8</span>
                    <span id="current-tab-badge" class="text-[10px] bg-slate-800/90 text-slate-200 border border-slate-700/80 px-2 py-0.5 rounded-full font-bold">الدردشة</span>
                    <span id="device-badge" class="text-[10px] bg-slate-800/90 text-slate-300 border border-slate-700/60 px-2 py-0.5 rounded-full font-semibold">جهاز</span>
                    <span id="net-badge" class="text-[10px] bg-slate-800/90 text-sky-200 border border-sky-800/50 px-2 py-0.5 rounded-full font-bold">وضع مرن</span>
                </div>
                <div class="flex items-center gap-1.5 text-[11px] mt-1 flex-wrap">
                    <span id="ws-dot" class="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span id="ws-label" class="text-emerald-300 font-semibold">متصل</span>
                    <button type="button" onclick="reconnectNow()" title="تحديث الربط" class="text-slate-300 hover:text-white px-1">
                        <i class="fa-solid fa-rotate-right text-[10px]"></i>
                    </button>
                    <span id="queue-badge" class="hidden text-[10px] bg-amber-950/80 text-amber-200 border border-amber-800/50 px-1.5 rounded font-mono">0 معلّق</span>
                    <span class="text-slate-600">•</span>
                    <span id="active-acct-label" class="font-mono font-bold text-slate-200"></span>
                </div>
            </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
            <button type="button" onclick="launchCall('audio')" title="مكالمة صوتية" class="w-9 h-9 rounded-xl bg-teal-950/70 hover:bg-teal-800 border border-teal-800/60 text-teal-200 hover:text-white flex items-center justify-center transition">
                <i class="fa-solid fa-phone text-xs"></i>
            </button>
            <button type="button" onclick="launchCall('video')" title="مكالمة فيديو" class="w-9 h-9 rounded-xl bg-sky-950/70 hover:bg-sky-800 border border-sky-800/60 text-sky-200 hover:text-white flex items-center justify-center transition">
                <i class="fa-solid fa-video text-xs"></i>
            </button>
        </div>
    </header>

    <div id="offline-banner" class="hidden bg-amber-950/90 border-b border-amber-800/70 px-3.5 py-1.5 text-[11px] text-amber-100 flex items-center justify-between gap-2 shrink-0">
        <span><i class="fa-solid fa-plane-slash ml-1"></i> وضع بدون إنترنت — يمكنك تصفح رسائلك وجهاتك وتجهيز رسائلك للإرسال فور عودة الشبكة.</span>
        <button type="button" onclick="reconnectNow()" class="bg-amber-800/80 px-2 py-0.5 rounded text-[10px] font-bold shrink-0">فحص الشبكة</button>
    </div>

    <div id="live-toast" onclick="jumpToToastChat()" class="hidden fixed top-16 left-3 right-3 max-w-md mx-auto bg-[#0f1b29]/95 border border-teal-800/70 text-slate-100 px-3.5 py-2.5 rounded-2xl shadow-2xl z-40 flex items-center justify-between gap-2 cursor-pointer text-xs">
        <div class="min-w-0">
            <p id="toast-sender" class="font-black text-teal-200 truncate">رسالة جديدة</p>
            <p id="toast-body" class="text-slate-200 truncate">...</p>
        </div>
        <span class="bg-teal-950 text-teal-200 border border-teal-800/60 px-2 py-1 rounded-lg text-[10px] font-bold shrink-0">فتح</span>
    </div>

    <div id="call-modal" class="hidden fixed inset-0 bg-[#080f18]/95 z-50 flex flex-col items-center justify-between p-4">
        <div class="text-center mt-1">
            <p class="text-xs text-teal-300 font-bold">سند AI v8.8 • رنين واتصال واضح ومستقر</p>
            <h2 id="call-peer-title" class="text-lg font-black text-white font-mono mt-0.5">...</h2>
            <p id="call-timer-el" class="text-xs font-mono font-bold text-slate-300 mt-0.5">00:00</p>
            <p id="call-status-msg" class="text-xs text-emerald-300 mt-0.5 font-semibold">جاري الاتصال...</p>
            <p id="call-output-hint" class="text-[10px] text-slate-400 mt-0.5">مخرج الصوت: مكبر الصوت</p>
        </div>

        <div class="relative w-full max-w-sm flex-1 my-2.5 max-h-[64vh] aspect-[9/16] bg-[#0f1b29] rounded-3xl border border-slate-800 overflow-hidden flex items-center justify-center shadow-2xl">
            <video id="remote-video-el" autoplay playsinline class="w-full h-full object-cover hidden"></video>
            <video id="local-video-el" autoplay playsinline muted class="w-24 h-36 object-cover rounded-2xl border-2 border-teal-400/70 shadow-lg absolute bottom-3 left-3 hidden"></video>
            <div id="voice-call-card" class="flex flex-col items-center gap-2.5 px-4 text-center">
                <div class="w-20 h-20 rounded-full bg-teal-950/80 border border-teal-800/60 flex items-center justify-center text-3xl text-teal-200 animate-ping">
                    <i class="fa-solid fa-phone-volume"></i>
                </div>
                <span class="text-xs text-slate-300 font-semibold">مكالمة صوتية مباشرة • أولوية جودة الصوت</span>
                <button type="button" onclick="forceUnmuteAudio()" class="bg-slate-800 border border-slate-700 text-emerald-300 px-3 py-1 rounded-xl text-[11px] font-bold">
                    <i class="fa-solid fa-volume-high ml-1"></i> تنشيط الصوت والرنين
                </button>
            </div>
        </div>

        <div class="flex items-center gap-2 mb-2 flex-wrap justify-center">
            <button type="button" id="accept-btn" onclick="answerCall()" class="hidden bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-2xl font-bold text-xs shadow-lg animate-bounce">
                <i class="fa-solid fa-phone ml-1"></i> رد الآن
            </button>
            <button type="button" id="speaker-toggle-btn" onclick="toggleSpeakerOrEarpiece()" title="تبديل مكبر الصوت / سماعة الجهاز" class="px-3 h-11 rounded-2xl bg-slate-800 border border-slate-700 text-slate-200 flex items-center gap-1.5 text-[11px] font-bold">
                <i id="speaker-toggle-icon" class="fa-solid fa-volume-high"></i>
                <span id="speaker-btn-label">مكبر</span>
            </button>
            <button type="button" id="switch-cam-btn" onclick="switchCameraFacing()" title="تبديل الكاميرا" class="w-11 h-11 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 flex items-center justify-center">
                <i class="fa-solid fa-camera-rotate"></i>
            </button>
            <button type="button" id="mute-btn" onclick="toggleMuteTrack()" title="كتم الميكروفون" class="w-11 h-11 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white flex items-center justify-center">
                <i id="mute-icon" class="fa-solid fa-microphone"></i>
            </button>
            <button type="button" onclick="endActiveCall()" class="bg-rose-800 hover:bg-rose-700 text-white px-4 py-3 rounded-2xl font-bold text-xs shadow-lg">
                <i class="fa-solid fa-phone-slash ml-1"></i> إنهاء
            </button>
        </div>
    </div>

    <div id="delete-modal" class="hidden fixed inset-0 bg-[#080f18]/80 z-50 flex items-center justify-center p-4">
        <div class="bg-[#0f1b29] border border-slate-800 rounded-2xl w-full max-w-xs p-4 space-y-3 shadow-2xl">
            <h3 class="text-sm font-black text-white">خيارات حذف الرسالة</h3>
            <p class="text-[11px] text-slate-400">اختر ما إذا كنت تريد حذف الرسالة من جهازك فقط أو من عند الجميع.</p>
            <button type="button" onclick="confirmDeleteChoice('me')" class="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 py-2.5 rounded-xl text-xs font-bold">حذف من عندي فقط</button>
            <button type="button" id="del-everyone-btn" onclick="confirmDeleteChoice('all')" class="w-full bg-rose-800 hover:bg-rose-700 text-white py-2.5 rounded-xl text-xs font-bold">حذف عند الجميع</button>
            <button type="button" onclick="closeDeleteModal()" class="w-full text-slate-400 hover:text-white py-1.5 text-xs">إلغاء</button>
        </div>
    </div>

    <main class="flex-1 flex flex-col overflow-hidden bg-[#0b131e]">
        <section id="pane-chats" class="sanad-pane sanad-pane-active flex-1 flex-col h-full overflow-hidden">
            <div class="p-2.5 bg-[#0f1b29]/90 border-b border-slate-800/90 space-y-2 shrink-0">
                <div class="flex gap-2">
                    <input type="text" id="peer-input" oninput="normalizeDigitsInInput(this); onTopPeerSearchInput();" onkeydown="if(event.key==='Enter'){event.preventDefault();openPeerByInput();}" placeholder="اكتب الاسم أو الكود أو الرقم ليظهر تلقائياً..." class="flex-1 bg-[#080f18] border border-slate-800 rounded-xl px-3 py-2 text-xs md:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-teal-600">
                    <button type="button" onclick="openPeerByInput()" class="bg-[#164e63] hover:bg-[#1e6078] text-white px-4 py-2 rounded-xl text-xs font-bold transition">فتح</button>
                    <button type="button" onclick="saveCurrentPeer()" title="حفظ في الجهات" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-3 py-2 rounded-xl text-xs font-bold">
                        <i class="fa-solid fa-user-plus"></i>
                    </button>
                </div>
                <div id="quick-chips" class="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs"></div>
            </div>

            <div class="px-3.5 py-2 bg-[#0c1622] border-b border-slate-800/90 flex justify-between items-center gap-2 text-xs shrink-0">
                <div class="flex items-center gap-2 min-w-0">
                    <span id="peer-dot" class="w-2.5 h-2.5 rounded-full bg-slate-600 shrink-0"></span>
                    <span id="peer-title" class="font-bold text-slate-100 font-mono truncate">خدمة العملاء</span>
                    <span id="peer-status" class="text-[11px] font-bold text-slate-400 shrink-0 whitespace-nowrap">غير متصل</span>
                </div>
                <div class="flex items-center gap-2 shrink-0 text-[11px]">
                    <button type="button" onclick="toggleThreadSearchBar()" title="بحث داخل رسائل المحادثة" class="text-slate-300 hover:text-white px-1"><i class="fa-solid fa-magnifying-glass"></i></button>
                    <button type="button" onclick="launchCall('audio')" title="اتصال صوتي سريع" class="text-emerald-300 hover:text-emerald-200 px-1"><i class="fa-solid fa-phone"></i></button>
                    <button type="button" onclick="launchCall('video')" title="مكالمة فيديو سريعة" class="text-teal-200 hover:text-white px-1"><i class="fa-solid fa-video"></i></button>
                    <button type="button" onclick="summarizeCurrentThread()" class="text-slate-200 hover:text-white font-semibold whitespace-nowrap">تلخيص</button>
                    <button type="button" onclick="shareInviteLink()" class="text-slate-200 hover:text-white font-semibold whitespace-nowrap">دعوة</button>
                    <button type="button" onclick="clearThreadMsgs()" class="text-rose-300 hover:text-rose-200 font-semibold whitespace-nowrap">مسح</button>
                </div>
            </div>

            <div id="pinned-msg-banner" class="hidden px-3.5 py-1.5 bg-[#0f1b29] border-b border-teal-800/50 flex items-center justify-between gap-2 text-[11px] shrink-0">
                <div class="flex items-center gap-1.5 min-w-0">
                    <i class="fa-solid fa-thumbtack text-teal-300 shrink-0"></i>
                    <span id="pinned-msg-text" class="text-slate-200 truncate"></span>
                </div>
                <button type="button" onclick="unpinCurrentThreadMsg()" class="text-teal-300 hover:text-white text-[10px] shrink-0">إلغاء التثبيت</button>
            </div>

            <div id="thread-search-bar" class="hidden px-3 py-2 bg-[#0f1b29] border-b border-slate-800 flex items-center gap-2 text-xs shrink-0">
                <i class="fa-solid fa-magnifying-glass text-teal-300"></i>
                <input type="text" id="thread-search-input" oninput="normalizeDigitsInInput(this); renderMsgs();" placeholder="ابحث داخل رسائل هذه المحادثة..." class="flex-1 bg-[#080f18] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-teal-600">
                <span id="thread-search-count" class="text-[10px] font-mono text-slate-300 shrink-0">0 نتيجة</span>
                <button type="button" onclick="closeThreadSearchBar()" class="text-slate-400 hover:text-white px-1.5"><i class="fa-solid fa-xmark"></i></button>
            </div>

            <div id="msgs-box" class="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar"></div>

            <div id="smart-replies-bar" class="hidden px-3 py-1.5 bg-[#0c1622] border-t border-slate-800/70 flex items-center gap-1.5 overflow-x-auto text-[11px] shrink-0"></div>

            <div class="px-3 py-1 bg-[#0c1622]/80 border-t border-slate-800/70 flex items-center gap-1.5 text-[10px] shrink-0 overflow-x-auto">
                <span class="text-slate-300 font-bold shrink-0">نبرات الصياغة:</span>
                <button type="button" onclick="polishDraft('friendly')" class="bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-slate-200 px-2 py-0.5 rounded shrink-0">ودي</button>
                <button type="button" onclick="polishDraft('formal')" class="bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-slate-200 px-2 py-0.5 rounded shrink-0">رسمي</button>
                <button type="button" onclick="polishDraft('short')" class="bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-slate-200 px-2 py-0.5 rounded shrink-0">مختصر</button>
                <button type="button" onclick="polishDraft('client')" class="bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-teal-200 px-2 py-0.5 rounded shrink-0 font-bold">رد عميل</button>
                <button type="button" onclick="insertSanadMention()" class="bg-teal-950/80 hover:bg-teal-900 border border-teal-800/60 text-teal-200 px-2 py-0.5 rounded font-bold shrink-0">@سند</button>
            </div>

            <div class="p-2.5 bg-[#0f1b29] border-t border-slate-800 flex items-center gap-1.5 shrink-0">
                <input type="file" id="attach-file" class="hidden" onchange="onFilePicked(event)">
                <button type="button" onclick="document.getElementById('attach-file').click()" title="إرفاق ملف أو صورة" class="text-slate-300 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition">
                    <i class="fa-solid fa-paperclip text-base"></i>
                </button>
                <button type="button" id="dictate-btn" onclick="toggleSpeechDictation()" title="إملاء صوتي" class="text-slate-300 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition">
                    <i class="fa-solid fa-language text-base"></i>
                </button>
                <button type="button" onclick="polishDraft('friendly')" title="تحسين الصياغة" class="text-slate-300 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition">
                    <i class="fa-solid fa-wand-magic-sparkles text-base"></i>
                </button>
                <input type="text" id="msg-box-input" onkeydown="if(event.key==='Enter'){event.preventDefault();sendTextMsg();}" placeholder="اكتب رسالتك أو استخدم @سند..." class="flex-1 bg-[#080f18] border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-teal-600">
                <span id="rec-timer" class="hidden text-[11px] font-mono font-bold text-teal-300 px-1">00:00</span>
                <button type="button" id="voice-btn" onclick="toggleVoiceCapture()" title="تسجيل رسالة صوتية" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white p-2.5 rounded-xl transition">
                    <i class="fa-solid fa-microphone text-base"></i>
                </button>
                <button type="button" onclick="sendTextMsg()" class="bg-[#164e63] hover:bg-[#1e6078] text-white px-4 py-2.5 rounded-xl text-sm font-bold transition shadow">
                    <i class="fa-solid fa-paper-plane"></i>
                </button>
            </div>
        </section>

        <section id="pane-groups" class="sanad-pane hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-3">
            <div class="bg-[#0f1b29] border border-slate-800 p-4 rounded-2xl space-y-3">
                <div class="flex items-center justify-between">
                    <h2 class="text-sm font-black text-teal-200"><i class="fa-solid fa-users ml-1"></i> مجموعات التواصل</h2>
                    <span id="groups-count-badge" class="text-[11px] font-mono text-slate-200 bg-slate-800 border border-slate-700 px-2.5 py-0.5 rounded-full">0 مجموعة</span>
                </div>
                <div class="space-y-2">
                    <input type="text" id="g-name" placeholder="اسم المجموعة (مثال: فريق العمل أو العائلة)" class="w-full bg-[#080f18] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                    <input type="text" id="g-members" oninput="normalizeDigitsInInput(this)" placeholder="أعضاء إضافيون (أرقام أو معرّفات مفصولة بفاصلة)" class="w-full bg-[#080f18] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono">
                    <div id="g-contact-picker" class="flex flex-wrap gap-1.5"></div>
                    <button type="button" onclick="createSanadGroup()" class="bg-[#164e63] hover:bg-[#1e6078] text-white px-4 py-2 rounded-xl text-xs font-bold">+ إنشاء مجموعة</button>
                </div>
            </div>
            <div id="groups-list" class="space-y-2"></div>
        </section>

        <section id="pane-accounts" class="sanad-pane hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-4">
            <div class="bg-[#0f1b29] border border-slate-800 p-4 rounded-2xl space-y-3">
                <div class="flex items-center justify-between">
                    <h2 class="text-sm font-black text-teal-200">إدارة الحسابات والمعرّفات</h2>
                    <span id="accounts-count-badge" class="text-[11px] font-mono text-slate-200 bg-slate-800 border border-slate-700 px-2.5 py-0.5 rounded-full">1 حساب</span>
                </div>
                <div class="flex flex-wrap gap-2">
                    <button type="button" onclick="make8DigitId()" class="bg-[#164e63] hover:bg-[#1e6078] text-white px-4 py-2 rounded-xl text-xs font-bold">+ توليد معرّف (8 أرقام)</button>
                    <button type="button" onclick="addCustomNumberAccount()" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 px-4 py-2 rounded-xl text-xs font-bold">+ إضافة رقم/معرّف</button>
                    <button type="button" onclick="verifyPhoneAccount()" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 px-4 py-2 rounded-xl text-xs font-bold">+ تفعيل رقم جوال</button>
                </div>
                <div id="last-generated-banner" class="hidden bg-[#080f18] border border-teal-800/60 rounded-xl p-2.5 flex items-center justify-between text-xs">
                    <span id="last-generated-text" class="font-mono font-bold text-teal-200"></span>
                    <button type="button" onclick="copyStringToClipboard(lastGeneratedCode)" class="bg-[#164e63] text-white px-3 py-1 rounded-lg text-[11px] font-bold">نسخ</button>
                </div>
                <div id="accounts-list" class="space-y-2 pt-2"></div>
            </div>
        </section>

        <section id="pane-contacts" class="sanad-pane hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-3">
            <div class="bg-[#0f1b29] border border-slate-800 p-3.5 rounded-2xl space-y-2.5">
                <div class="flex items-center justify-between">
                    <h2 class="text-sm font-black text-teal-200">جهات الاتصال</h2>
                    <button type="button" onclick="scanNumbersForSanad()" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-3 py-1 rounded-lg text-[11px] font-bold transition">
                        <i class="fa-solid fa-user-check ml-1"></i>فحص أرقام
                    </button>
                </div>
                <div class="flex flex-col sm:flex-row gap-2">
                    <input type="text" id="c-name" onkeydown="if(event.key==='Enter')addNewContact()" placeholder="الاسم" class="bg-[#080f18] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                    <input type="text" id="c-id" oninput="normalizeDigitsInInput(this)" onkeydown="if(event.key==='Enter')addNewContact()" placeholder="معرّف 8 أرقام أو رقم الجوال" class="flex-1 bg-[#080f18] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono">
                    <button type="button" onclick="addNewContact()" class="bg-[#164e63] hover:bg-[#1e6078] text-white px-4 py-2 rounded-xl text-xs font-bold">حفظ</button>
                </div>
            </div>
            <div class="bg-[#0f1b29]/90 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 flex-1 min-w-0">
                    <i class="fa-solid fa-magnifying-glass text-slate-400 text-xs pr-1"></i>
                    <input type="text" id="contact-search-input" oninput="normalizeDigitsInInput(this); renderPresence();" onkeydown="if(event.key==='Enter')openFirstMatchedContact()" placeholder="بحث بالاسم أو الكود أو الرقم..." class="flex-1 bg-transparent text-xs text-white focus:outline-none">
                </div>
                <span id="contacts-summary-badge" class="text-[10px] font-mono text-slate-400 shrink-0">0 جهة</span>
            </div>
            <div id="contacts-list" class="space-y-2"></div>
        </section>

        <section id="pane-calls" class="sanad-pane hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-4">
            <div class="bg-[#0f1b29] border border-slate-800 p-4 rounded-2xl space-y-3 text-center">
                <div class="w-14 h-14 mx-auto rounded-2xl bg-teal-950/70 border border-teal-800/50 text-teal-200 flex items-center justify-center text-2xl">
                    <i class="fa-solid fa-phone-volume"></i>
                </div>
                <div>
                    <h2 class="text-base font-black text-white">المكالمات الصوتية والمرئية</h2>
                    <p class="text-xs text-slate-400 mt-1">اكتب الاسم أو الرقم أو المعرّف وسيظهر فوراً من الجهات المخزّنة تلقائياً.</p>
                </div>
                <input type="text" id="call-input" oninput="normalizeDigitsInInput(this); onCallDialInput();" onkeydown="if(event.key==='Enter'){event.preventDefault();startDialedCall('audio');}" placeholder="اكتب الاسم أو الرقم أو المعرّف..." class="w-full max-w-md mx-auto bg-[#080f18] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-center font-mono text-white">
                <div id="call-resolved-preview" class="text-[11px] text-teal-200 font-semibold min-h-[18px]"></div>
                <div id="call-contact-suggestions" class="flex flex-wrap justify-center gap-1.5 max-w-md mx-auto"></div>
                <div class="flex gap-3 justify-center pt-1">
                    <button type="button" onclick="startDialedCall('audio')" class="bg-emerald-700 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
                        <i class="fa-solid fa-phone"></i> مكالمة صوتية
                    </button>
                    <button type="button" onclick="startDialedCall('video')" class="bg-[#164e63] hover:bg-[#1e6078] text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
                        <i class="fa-solid fa-video"></i> مكالمة فيديو
                    </button>
                </div>
            </div>
        </section>

        <section id="pane-ai" class="sanad-pane hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-3">
            <div class="bg-[#0f1b29] border border-slate-800 p-4 rounded-2xl space-y-2.5">
                <div class="flex items-center justify-between">
                    <h2 class="text-sm font-black text-teal-200"><i class="fa-solid fa-brain ml-1"></i> مساعد سند AI وتطوير المحتوى</h2>
                    <span class="text-[10px] bg-teal-950/80 text-teal-200 border border-teal-800/50 px-2 py-0.5 rounded-full font-bold">v8.8</span>
                </div>
                <div class="flex items-center justify-between bg-[#080f18] p-3 rounded-xl border border-slate-800 text-xs">
                    <span>وضع توفير البيانات للشبكات الضعيفة جداً</span>
                    <input type="checkbox" id="chk-weaknet" checked onchange="updateNetBadge()" class="w-4 h-4 accent-teal-600">
                </div>
                <div class="flex items-center justify-between bg-[#080f18] p-3 rounded-xl border border-slate-800 text-xs">
                    <span>الرد التلقائي الذكي للعملاء عند استلام رسالة</span>
                    <input type="checkbox" id="chk-autoreply" class="w-4 h-4 accent-teal-600">
                </div>
                <div class="flex items-center justify-between bg-[#080f18] p-3 rounded-xl border border-slate-800 text-xs">
                    <span>نغمة التنبيه والرنين الفوري</span>
                    <input type="checkbox" id="chk-chime" checked class="w-4 h-4 accent-teal-600">
                </div>
                <div id="ai-log" class="bg-[#080f18] border border-slate-800 rounded-xl p-3 h-36 overflow-y-auto text-xs space-y-2 custom-scrollbar">
                    <div class="text-slate-400">مرحباً بك في سند AI v8.8 — تعديل الرسائل + نسخ وتحويل سريع + تحسين الشبكات الضعيفة والرنين.</div>
                </div>
                <div class="flex gap-2">
                    <input type="text" id="ai-q" onkeydown="if(event.key==='Enter')askSanadAI()" placeholder="اسأل سند AI أو اطلب صياغة محتوى للعملاء..." class="flex-1 bg-[#080f18] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                    <button type="button" onclick="askSanadAI()" class="bg-[#164e63] hover:bg-[#1e6078] text-white px-4 py-2 rounded-xl text-xs font-bold">إرسال</button>
                </div>
            </div>
        </section>
    </main>

    <nav class="bg-[#0f1b29]/95 border-t border-slate-800 px-0.5 py-2 flex justify-around items-center z-20 shrink-0">
        <a href="#tab-chats" onclick="setPane('chats'); return false;" id="btn-chats" class="relative flex flex-col items-center gap-0.5 text-teal-300 font-extrabold text-[9px] px-0.5 py-1 whitespace-nowrap shrink-0 cursor-pointer">
            <span id="nav-chats-badge" class="hidden absolute -top-0.5 -left-1.5 min-w-[16px] h-[16px] px-1 rounded-full bg-rose-600 text-white text-[9px] font-mono font-black flex items-center justify-center">0</span>
            <i class="fa-solid fa-comments text-sm"></i>
            <span>الدردشة</span>
        </a>
        <a href="#tab-groups" onclick="setPane('groups'); return false;" id="btn-groups" class="relative flex flex-col items-center gap-0.5 text-slate-400 font-semibold text-[9px] px-0.5 py-1 whitespace-nowrap shrink-0 cursor-pointer">
            <span id="nav-groups-badge" class="hidden absolute -top-0.5 -left-1.5 min-w-[16px] h-[16px] px-1 rounded-full bg-rose-600 text-white text-[9px] font-mono font-black flex items-center justify-center">0</span>
            <i class="fa-solid fa-users text-sm"></i>
            <span>المجموعات</span>
        </a>
        <a href="#tab-accounts" onclick="setPane('accounts'); return false;" id="btn-accounts" class="relative flex flex-col items-center gap-0.5 text-slate-400 font-semibold text-[9px] px-0.5 py-1 whitespace-nowrap shrink-0 cursor-pointer">
            <i class="fa-solid fa-id-card text-sm"></i>
            <span>الحسابات</span>
        </a>
        <a href="#tab-contacts" onclick="setPane('contacts'); return false;" id="btn-contacts" class="relative flex flex-col items-center gap-0.5 text-slate-400 font-semibold text-[9px] px-0.5 py-1 whitespace-nowrap shrink-0 cursor-pointer">
            <i class="fa-solid fa-address-book text-sm"></i>
            <span>الجهات</span>
        </a>
        <a href="#tab-calls" onclick="setPane('calls'); return false;" id="btn-calls" class="relative flex flex-col items-center gap-0.5 text-slate-400 font-semibold text-[9px] px-0.5 py-1 whitespace-nowrap shrink-0 cursor-pointer">
            <i class="fa-solid fa-phone-volume text-sm"></i>
            <span>المكالمات</span>
        </a>
        <a href="#tab-ai" onclick="setPane('ai'); return false;" id="btn-ai" class="relative flex flex-col items-center gap-0.5 text-slate-400 font-semibold text-[9px] px-0.5 py-1 whitespace-nowrap shrink-0 cursor-pointer">
            <i class="fa-solid fa-brain text-sm"></i>
            <span>الذكاء</span>
        </a>
    </nav>

    <script>
        var DEFAULT_PEER = 'خدمة العملاء';
        var activeAcct = 'مستخدم-سند';
        var myAccts = ['مستخدم-سند'];
        var contacts = [{ name: DEFAULT_PEER, id: DEFAULT_PEER }];
        var sanadGroups = [];
        var selectedGroupMembers = new Set();
        var pinnedByThread = {};
        var unreadByThread = {};
        var currentPeer = DEFAULT_PEER;
        var activePane = 'chats';
        var onlinePeers = new Set();
        var acctThreads = {};
        var seenEventIds = new Set();
        var outboxQueue = [];
        var lastGeneratedCode = '';
        var pendingDeleteMsgId = null;
        var toastPeerId = null;
        var toastTimer = null;
        var ringtoneTimer = null;
        var callDurationTimer = null;
        var callSeconds = 0;
        var speakerModeActive = true;
        var ws = null;
        var wsConnected = false;
        var serverReachable = true;
        var lastSyncCursor = 0;
        var autoReloadingForUpdate = false;

        function cleanIdValue(val) {
            return toWesternDigits(String(val === undefined || val === null ? '' : val)).trim();
        }

        function normalizeStr(v) { return toWesternDigits(v).trim().toLowerCase(); }

        function isPeerOnline(id) {
            var target = normalizeStr(id);
            if (!target) return false;
            var found = false;
            onlinePeers.forEach(function(item) {
                if (normalizeStr(item) === target) found = true;
            });
            return found;
        }

        function getUnreadMapForActive() {
            if (!unreadByThread[activeAcct]) unreadByThread[activeAcct] = {};
            return unreadByThread[activeAcct];
        }

        function getUnreadCountForPeer(peerId) {
            var clean = cleanIdValue(peerId);
            if (!clean) return 0;
            var map = getUnreadMapForActive();
            var total = 0;
            Object.keys(map).forEach(function(k) {
                if (normalizeStr(k) === normalizeStr(clean)) total += (Number(map[k]) || 0);
            });
            return total;
        }

        function incrementUnreadForPeer(acctId, peerId) {
            var cleanAcct = cleanIdValue(acctId || activeAcct) || activeAcct;
            var cleanPeer = cleanIdValue(peerId);
            if (!cleanPeer) return;
            if (!unreadByThread[cleanAcct]) unreadByThread[cleanAcct] = {};
            var matchedKey = Object.keys(unreadByThread[cleanAcct]).find(function(k) { return normalizeStr(k) === normalizeStr(cleanPeer); }) || cleanPeer;
            unreadByThread[cleanAcct][matchedKey] = (Number(unreadByThread[cleanAcct][matchedKey]) || 0) + 1;
            updateUnreadBadgesUI();
        }

        function clearUnreadForPeer(peerId) {
            var clean = cleanIdValue(peerId);
            if (!clean) return;
            var map = getUnreadMapForActive();
            Object.keys(map).forEach(function(k) {
                if (normalizeStr(k) === normalizeStr(clean)) delete map[k];
            });
            updateUnreadBadgesUI();
        }

        function updateUnreadBadgesUI() {
            var map = getUnreadMapForActive();
            var totalAll = 0;
            var totalGroups = 0;
            Object.keys(map).forEach(function(k) {
                var cnt = Number(map[k]) || 0;
                if (cnt > 0) {
                    totalAll += cnt;
                    if (findGroupById(k)) totalGroups += cnt;
                }
            });
            var headerBadge = document.getElementById('header-unread-dot');
            var chatsBadge = document.getElementById('nav-chats-badge');
            var groupsBadge = document.getElementById('nav-groups-badge');
            if (headerBadge) {
                headerBadge.textContent = toWesternDigits(totalAll);
                headerBadge.classList.toggle('hidden', totalAll <= 0);
            }
            if (chatsBadge) {
                chatsBadge.textContent = toWesternDigits(totalAll);
                chatsBadge.classList.toggle('hidden', totalAll <= 0);
            }
            if (groupsBadge) {
                groupsBadge.textContent = toWesternDigits(totalGroups);
                groupsBadge.classList.toggle('hidden', totalGroups <= 0);
            }
        }

        function updateOfflineNetworkUI(isOfflineNow) {
            var banner = document.getElementById('offline-banner');
            if (banner) banner.classList.toggle('hidden', !isOfflineNow);
            if (isOfflineNow) setHeaderStatus('بدون نت (محلي)', false);
        }

        function triggerSilentAppUpdateIfNeeded(serverVer) {
            if (!serverVer || serverVer === CLIENT_APP_VERSION || autoReloadingForUpdate) return;
            if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
            autoReloadingForUpdate = true;
            try { persistState(); } catch (e) {}
            var baseUrl = location.origin + location.pathname;
            location.replace(baseUrl + '?v=' + encodeURIComponent(serverVer) + (location.hash || ''));
        }

        function onSanadTabActivated(p) {
            activePane = p;
            if (p === 'groups') renderGroupsList();
            else if (p === 'accounts') renderAccts();
            else if (p === 'contacts') renderPresence();
            else if (p === 'calls') {
                onCallDialInput();
            } else if (p === 'chats') {
                clearUnreadForPeer(currentPeer);
                renderMsgs();
                markCurrentThreadAsRead();
            }
        }

        function setHeaderStatus(text, isOnline) {
            var dot = document.getElementById('ws-dot');
            var lbl = document.getElementById('ws-label');
            if (dot) dot.className = isOnline ? 'w-2 h-2 rounded-full bg-emerald-400' : 'w-2 h-2 rounded-full bg-amber-300';
            if (lbl) {
                lbl.className = isOnline ? 'text-emerald-300 font-semibold' : 'text-amber-200 font-semibold';
                lbl.textContent = text;
            }
            updateQueueBadge();
        }

        function updateNetBadge() {
            var badge = document.getElementById('net-badge');
            if (!badge) return;
            if (typeof navigator !== 'undefined' && navigator.onLine === false) {
                badge.textContent = 'بدون نت';
                badge.className = 'text-[10px] bg-amber-950/90 text-amber-200 border border-amber-800/70 px-2 py-0.5 rounded-full font-bold';
                return;
            }
            var chk = document.getElementById('chk-weaknet');
            if (chk && chk.checked) {
                badge.textContent = 'توفير • نت ضعيف';
                badge.className = 'text-[10px] bg-slate-800 text-slate-200 border border-slate-700/80 px-2 py-0.5 rounded-full font-bold';
            } else {
                badge.textContent = 'أداء سريع';
                badge.className = 'text-[10px] bg-teal-950/70 text-teal-200 border border-teal-800/50 px-2 py-0.5 rounded-full font-bold';
            }
        }

        function loadSavedState() {
            try {
                var savedActive = localStorage.getItem('sanad88_active') || localStorage.getItem('sanad87_active');
                var savedAccts = JSON.parse(localStorage.getItem('sanad88_accts') || localStorage.getItem('sanad87_accts') || 'null');
                var savedContacts = JSON.parse(localStorage.getItem('sanad88_contacts') || localStorage.getItem('sanad87_contacts') || 'null');
                var savedThreads = JSON.parse(localStorage.getItem('sanad88_threads') || localStorage.getItem('sanad87_threads') || 'null');
                var savedGroups = JSON.parse(localStorage.getItem('sanad88_groups') || localStorage.getItem('sanad87_groups') || 'null');
                var savedPins = JSON.parse(localStorage.getItem('sanad88_pins') || localStorage.getItem('sanad87_pins') || 'null');
                var savedUnread = JSON.parse(localStorage.getItem('sanad88_unread') || localStorage.getItem('sanad87_unread') || 'null');
                var savedOutbox = JSON.parse(localStorage.getItem('sanad88_outbox') || localStorage.getItem('sanad87_outbox') || 'null');

                if (savedActive) activeAcct = cleanIdValue(savedActive);
                if (Array.isArray(savedAccts) && savedAccts.length) {
                    myAccts = savedAccts.map(cleanIdValue).filter(Boolean);
                    if (!myAccts.length) myAccts = [activeAcct];
                }
                if (myAccts.indexOf(activeAcct) === -1) myAccts.unshift(activeAcct);

                if (Array.isArray(savedContacts) && savedContacts.length) {
                    contacts = savedContacts.map(function(c) {
                        if (!c || typeof c !== 'object') return null;
                        var cid = cleanIdValue(c.id);
                        return cid ? { name: String(c.name || cid), id: cid } : null;
                    }).filter(Boolean);
                }
                if (!contacts.some(function(c) { return c.id === DEFAULT_PEER; })) {
                    contacts.unshift({ name: DEFAULT_PEER, id: DEFAULT_PEER });
                }

                if (savedThreads && typeof savedThreads === 'object') acctThreads = savedThreads;
                if (Array.isArray(savedGroups)) sanadGroups = savedGroups;
                if (savedPins && typeof savedPins === 'object') pinnedByThread = savedPins;
                if (savedUnread && typeof savedUnread === 'object') unreadByThread = savedUnread;
                if (Array.isArray(savedOutbox)) outboxQueue = savedOutbox;
            } catch (e) {}
        }

        function persistState() {
            try {
                localStorage.setItem('sanad88_active', activeAcct);
                localStorage.setItem('sanad88_accts', JSON.stringify(myAccts));
                localStorage.setItem('sanad88_contacts', JSON.stringify(contacts));
                localStorage.setItem('sanad88_threads', JSON.stringify(acctThreads));
                localStorage.setItem('sanad88_groups', JSON.stringify(sanadGroups));
                localStorage.setItem('sanad88_pins', JSON.stringify(pinnedByThread));
                localStorage.setItem('sanad88_unread', JSON.stringify(unreadByThread));
                localStorage.setItem('sanad88_outbox', JSON.stringify(outboxQueue));
            } catch (e) {}
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

        function findGroupById(id) {
            return sanadGroups.find(function(g) { return normalizeStr(g.id) === normalizeStr(id); }) || null;
        }

        function resolveContactByQuery(rawQuery) {
            var q = normalizeStr(rawQuery);
            if (!q) return null;
            var grp = findGroupById(rawQuery);
            if (grp) return { id: grp.id, name: grp.name, isGroup: true };
            var exact = contacts.find(function(c) { return normalizeStr(c.id) === q || normalizeStr(c.name) === q; });
            if (exact) return exact;
            return contacts.find(function(c) { return normalizeStr(c.name).indexOf(q) !== -1 || normalizeStr(c.id).indexOf(q) !== -1; }) || null;
        }

        function getSortedContacts() {
            return contacts.slice().sort(function(a, b) {
                var aUn = getUnreadCountForPeer(a.id) > 0 ? 1 : 0;
                var bUn = getUnreadCountForPeer(b.id) > 0 ? 1 : 0;
                if (aUn !== bUn) return bUn - aUn;
                var aOn = isPeerOnline(a.id) ? 1 : 0;
                var bOn = isPeerOnline(b.id) ? 1 : 0;
                if (aOn !== bOn) return bOn - aOn;
                return String(a.name || '').localeCompare(String(b.name || ''), 'ar');
            });
        }

        function findContactMatches(queryStr) {
            var q = normalizeStr(queryStr);
            if (!q) return getSortedContacts();
            return getSortedContacts().filter(function(c) {
                return normalizeStr(c.name).indexOf(q) !== -1 || normalizeStr(c.id).indexOf(q) !== -1;
            });
        }

        function upsertContact(name, id) {
            var cleanId = cleanIdValue(id);
            if (!cleanId) return null;
            var cleanName = String(name || '').trim() || ('جهة ' + cleanId);
            var existingIdx = contacts.findIndex(function(c) { return normalizeStr(c.id) === normalizeStr(cleanId); });
            if (existingIdx !== -1) contacts[existingIdx] = { name: cleanName, id: cleanId };
            else contacts.push({ name: cleanName, id: cleanId });
            persistAndDraw();
            return contacts.find(function(c) { return normalizeStr(c.id) === normalizeStr(cleanId); });
        }

        function copyMessageText(msgId) {
            var list = getThreadMap()[currentPeer] || [];
            var item = list.find(function(m) { return m.id === msgId && !m.deleted; });
            if (!item) return;
            var txt = item.text || item.fileName || '';
            if (!txt) return;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(txt).catch(function() {});
            }
            alert('تم نسخ الرسالة.');
        }

        function editOwnMessage(msgId) {
            var map = getThreadMap();
            var list = map[currentPeer] || [];
            var item = list.find(function(m) { return m.id === msgId && !m.deleted && m.from === 'me' && m.kind === 'text'; });
            if (!item) return alert('يمكن تعديل رسائلك النصية فقط.');
            var updated = prompt('تعديل نص الرسالة:', item.text || '');
            if (updated === null) return;
            var cleanTxt = updated.trim();
            if (!cleanTxt) return alert('لا يمكن أن تكون الرسالة فارغة.');
            map[currentPeer] = list.map(function(m) {
                return m.id === msgId ? Object.assign({}, m, { text: cleanTxt, edited: true }) : m;
            });
            persistAndDraw();
            var grp = findGroupById(currentPeer);
            if (grp && Array.isArray(grp.members)) {
                grp.members.forEach(function(memId) {
                    var cleanMem = cleanIdValue(memId);
                    if (cleanMem && normalizeStr(cleanMem) !== normalizeStr(activeAcct)) {
                        sendSignalingOrMsg({ type: 'msg_edit', to: cleanMem, from: currentPeer, msgId: msgId, text: cleanTxt });
                    }
                });
            } else {
                sendSignalingOrMsg({ type: 'msg_edit', to: currentPeer, from: activeAcct, msgId: msgId, text: cleanTxt });
            }
        }

        function forwardMessageToTarget(msgId) {
            var list = getThreadMap()[currentPeer] || [];
            var item = list.find(function(m) { return m.id === msgId && !m.deleted; });
            if (!item) return;
            var targetInput = prompt('أدخل اسم أو رقم أو معرّف الشخص أو المجموعة لإرسال الرسالة له:');
            if (!targetInput || !targetInput.trim()) return;
            var resolved = resolveContactByQuery(targetInput.trim());
            var destId = cleanIdValue(resolved ? resolved.id : targetInput.trim());
            if (!destId) return;
            emitPacket(destId, item.kind || 'text', item.text || '', item.mediaUrl || null, item.fileName || '');
            choosePeer(destId);
        }

        function getThreadMap() {
            if (!acctThreads[activeAcct]) acctThreads[activeAcct] = {};
            if (!acctThreads[activeAcct][DEFAULT_PEER]) {
                acctThreads[activeAcct][DEFAULT_PEER] = [
                    { id: 'init-' + activeAcct, from: 'them', kind: 'text', text: 'مرحباً بك في سند AI v8.8، كيف نقدر نخدمك اليوم؟' }
                ];
            }
            return acctThreads[activeAcct];
        }

        function renderGroupMemberPicker() {
            var box = document.getElementById('g-contact-picker');
            if (!box) return;
            var list = contacts.filter(function(c) { return c.id !== DEFAULT_PEER; });
            if (!list.length) {
                box.innerHTML = '<span class="text-[11px] text-slate-500">أضف جهات أولاً أو اكتب أرقاماً/معرّفات في الحقل أعلاه.</span>';
                return;
            }
            box.innerHTML = list.map(function(c) {
                var picked = selectedGroupMembers.has(c.id);
                return '<button type="button" onclick="toggleGroupMemberPick(\\'' + escapeJsSingle(c.id) + '\\')" class="px-2.5 py-1 rounded-lg border text-[11px] font-bold ' +
                    (picked ? 'bg-teal-950/80 border-teal-700/70 text-teal-100' : 'bg-[#080f18] border-slate-800 text-slate-300') + '">' +
                    (picked ? '✓ ' : '') + escapeHtml(c.name) + '</button>';
            }).join('');
        }

        function toggleGroupMemberPick(id) {
            var clean = cleanIdValue(id);
            if (selectedGroupMembers.has(clean)) selectedGroupMembers.delete(clean);
            else selectedGroupMembers.add(clean);
            renderGroupMemberPicker();
        }

        function createSanadGroup() {
            var nameInp = document.getElementById('g-name');
            var extraInp = document.getElementById('g-members');
            var gName = nameInp ? nameInp.value.trim() : '';
            if (!gName) return alert('أدخل اسم المجموعة أولاً.');
            var extraTokens = toWesternDigits(extraInp ? extraInp.value : '').split(/[\\s,،\\n]+/).map(cleanIdValue).filter(Boolean);
            var membersSet = new Set([activeAcct]);
            selectedGroupMembers.forEach(function(m) { membersSet.add(cleanIdValue(m)); });
            extraTokens.forEach(function(m) { membersSet.add(cleanIdValue(m)); });
            var grpId = 'grp-' + Math.floor(100000 + Math.random() * 900000);
            sanadGroups.unshift({ id: grpId, name: gName, members: Array.from(membersSet), createdBy: activeAcct });
            if (nameInp) nameInp.value = '';
            if (extraInp) extraInp.value = '';
            selectedGroupMembers.clear();
            var map = getThreadMap();
            map[grpId] = [{ id: 'g-init-' + grpId, from: 'them', senderName: '@سند', kind: 'text', text: 'تم إنشاء مجموعة «' + gName + '».' }];
            persistAndDraw();
            choosePeer(grpId);
        }

        function renderGroupsList() {
            var badge = document.getElementById('groups-count-badge');
            if (badge) badge.textContent = toWesternDigits(sanadGroups.length) + (sanadGroups.length === 1 ? ' مجموعة' : ' مجموعات');
            renderGroupMemberPicker();
            var box = document.getElementById('groups-list');
            if (!box) return;
            if (!sanadGroups.length) {
                box.innerHTML = '<div class="text-center text-xs text-slate-500 py-6">لا توجد مجموعات بعد.</div>';
                return;
            }
            box.innerHTML = sanadGroups.map(function(g) {
                var mCount = Array.isArray(g.members) ? g.members.length : 1;
                return '<div class="bg-[#0f1b29] border border-slate-800 p-3.5 rounded-xl flex justify-between items-center gap-2">' +
                    '<div class="min-w-0"><p class="text-xs font-black text-white truncate">' + escapeHtml(g.name) + '</p>' +
                    '<p class="text-[11px] font-mono text-slate-400">' + toWesternDigits(mCount) + ' أعضاء</p></div>' +
                    '<button type="button" onclick="choosePeer(\\'' + escapeJsSingle(g.id) + '\\')" class="bg-[#164e63] text-white px-3 py-1.5 rounded-lg text-xs font-bold">دخول</button></div>';
            }).join('');
        }

        function playTonePattern(freqs, durationSec) {
            var chk = document.getElementById('chk-chime');
            if (chk && !chk.checked) return;
            try {
                if (navigator.vibrate) navigator.vibrate([220, 120, 220]);
            } catch (e) {}
            try {
                var Ctx = window.AudioContext || window.webkitAudioContext;
                var ctx = new Ctx();
                freqs.forEach(function(f, idx) {
                    var osc = ctx.createOscillator();
                    var gain = ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(f, ctx.currentTime + idx * durationSec);
                    gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * durationSec);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(ctx.currentTime + idx * durationSec);
                    osc.stop(ctx.currentTime + idx * durationSec + durationSec * 0.9);
                });
            } catch (e) {}
        }

        function playSoftChime() { playTonePattern([660, 880], 0.12); }

        function startRingtoneLoop() {
            stopRingtoneLoop();
            playTonePattern([659, 880, 659, 988], 0.14);
            ringtoneTimer = setInterval(function() { playTonePattern([659, 880, 659, 988], 0.14); }, 1500);
        }

        function stopRingtoneLoop() {
            if (ringtoneTimer) { clearInterval(ringtoneTimer); ringtoneTimer = null; }
        }

        function formatCallDuration(sec) {
            var m = Math.floor(sec / 60);
            var s = sec % 60;
            return toWesternDigits(String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0'));
        }

        function startCallTimer() {
            stopCallTimer();
            callSeconds = 0;
            callDurationTimer = setInterval(function() {
                callSeconds += 1;
                var el = document.getElementById('call-timer-el');
                if (el) el.textContent = formatCallDuration(callSeconds);
            }, 1000);
        }

        function stopCallTimer() {
            if (callDurationTimer) { clearInterval(callDurationTimer); callDurationTimer = null; }
            var el = document.getElementById('call-timer-el');
            if (el) el.textContent = '00:00';
        }

        function showLiveToast(senderId, previewText) {
            var cleanSender = cleanIdValue(senderId);
            toastPeerId = cleanSender;
            document.getElementById('toast-sender').textContent = 'رسالة من: ' + cleanSender;
            document.getElementById('toast-body').textContent = previewText || 'مرفق جديد';
            var el = document.getElementById('live-toast');
            el.classList.remove('hidden');
            if (toastTimer) clearTimeout(toastTimer);
            toastTimer = setTimeout(function() { el.classList.add('hidden'); }, 4500);
        }

        function jumpToToastChat() {
            if (!toastPeerId) return;
            document.getElementById('live-toast').classList.add('hidden');
            choosePeer(toastPeerId);
        }

        function speakText(txt) {
            if (!('speechSynthesis' in window) || !txt) return;
            try {
                window.speechSynthesis.cancel();
                var utter = new SpeechSynthesisUtterance(txt);
                utter.lang = 'ar-SA';
                window.speechSynthesis.speak(utter);
            } catch (e) {}
        }

        function sendReadReceiptIfViewing(peerId, msgId) {
            if (activePane === 'chats' && normalizeStr(currentPeer) === normalizeStr(peerId) && !document.hidden) {
                sendSignalingOrMsg({ type: 'msg_read', to: cleanIdValue(peerId), from: activeAcct, msgId: msgId });
            }
        }

        function handleIncomingPayload(msg) {
            if (!msg || !msg.type) return;
            var eid = msg.eventId || '';
            if (eid && seenEventIds.has(eid)) return;
            if (eid) seenEventIds.add(eid);

            if (msg.type === 'online_users' && Array.isArray(msg.ids)) {
                onlinePeers = new Set(msg.ids.map(cleanIdValue).filter(Boolean));
                renderPresence();
            } else if (msg.type === 'msg') {
                var recipient = cleanIdValue(msg.to || activeAcct) || activeAcct;
                var sender = cleanIdValue(msg.from || '');
                if (!sender) return;
                if (!acctThreads[recipient]) acctThreads[recipient] = {};
                if (!acctThreads[recipient][sender]) acctThreads[recipient][sender] = [];
                if (!acctThreads[recipient][sender].some(function(m) { return m.id === msg.msgId; })) {
                    acctThreads[recipient][sender].push({
                        id: msg.msgId || ('m-' + Date.now()),
                        from: 'them',
                        kind: msg.kind || 'text',
                        text: msg.text || '',
                        mediaUrl: msg.mediaUrl || null,
                        fileName: msg.fileName || ''
                    });
                }
                sendSignalingOrMsg({ type: 'msg_delivered', to: sender, from: recipient, msgId: msg.msgId });
                var isActivelyViewing = (activePane === 'chats' && normalizeStr(currentPeer) === normalizeStr(sender) && !document.hidden);
                if (isActivelyViewing) sendReadReceiptIfViewing(sender, msg.msgId);
                else {
                    incrementUnreadForPeer(recipient, sender);
                    showLiveToast(sender, msg.text || 'مرفق');
                }
                playSoftChime();
                persistAndDraw();
            } else if (msg.type === 'msg_edit') {
                var ownerEd = cleanIdValue(msg.to || activeAcct) || activeAcct;
                var fromPeerEd = cleanIdValue(msg.from || '');
                if (acctThreads[ownerEd] && acctThreads[ownerEd][fromPeerEd]) {
                    acctThreads[ownerEd][fromPeerEd] = acctThreads[ownerEd][fromPeerEd].map(function(m) {
                        return m.id === msg.msgId ? Object.assign({}, m, { text: msg.text || m.text, edited: true }) : m;
                    });
                    persistAndDraw();
                }
            } else if (msg.type === 'msg_delivered') {
                var ownerDel = cleanIdValue(msg.to || activeAcct) || activeAcct;
                var fromPeerDel = cleanIdValue(msg.from || '');
                if (acctThreads[ownerDel] && acctThreads[ownerDel][fromPeerDel]) {
                    acctThreads[ownerDel][fromPeerDel] = acctThreads[ownerDel][fromPeerDel].map(function(m) {
                        return m.id === msg.msgId ? Object.assign({}, m, { delivered: true, status: m.status === 'read' ? 'read' : 'delivered' }) : m;
                    });
                    persistAndDraw();
                }
            } else if (msg.type === 'msg_read') {
                var ownerRead = cleanIdValue(msg.to || activeAcct) || activeAcct;
                var fromPeerRead = cleanIdValue(msg.from || '');
                if (acctThreads[ownerRead] && acctThreads[ownerRead][fromPeerRead]) {
                    acctThreads[ownerRead][fromPeerRead] = acctThreads[ownerRead][fromPeerRead].map(function(m) {
                        return m.id === msg.msgId ? Object.assign({}, m, { delivered: true, read: true, status: 'read' }) : m;
                    });
                    persistAndDraw();
                }
            } else if (msg.type === 'msg_del_all' || msg.type === 'msg_del') {
                var recipientDel = cleanIdValue(msg.to || activeAcct) || activeAcct;
                var delSender = cleanIdValue(msg.from || '');
                if (acctThreads[recipientDel] && acctThreads[recipientDel][delSender]) {
                    acctThreads[recipientDel][delSender] = acctThreads[recipientDel][delSender].map(function(m) {
                        return m.id === msg.msgId ? Object.assign({}, m, { deleted: true, deletedBy: 'all' }) : m;
                    });
                    persistAndDraw();
                }
            } else if (msg.type === 'call_sig') {
                onCallSignal(msg);
            }
        }

        function postHttpSync(payload) {
            if (typeof navigator !== 'undefined' && navigator.onLine === false) {
                updateOfflineNetworkUI(true);
                if (payload && payload.to && payload.type === 'msg') {
                    if (!outboxQueue.some(function(x) { return x && x.msgId === payload.msgId; })) {
                        outboxQueue.push(payload);
                        persistState();
                        updateQueueBadge();
                    }
                }
                return Promise.resolve(null);
            }
            return fetch('/api/sync?t=' + Date.now(), {
                method: 'POST',
                cache: 'no-store',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).then(function(res) {
                if (!res || !res.ok) return null;
                serverReachable = true;
                updateOfflineNetworkUI(false);
                setHeaderStatus('متصل', true);
                return res.json();
            }).then(function(data) {
                if (!data) return null;
                if (data.appVersion) triggerSilentAppUpdateIfNeeded(data.appVersion);
                if (typeof data.cursor === 'number' && data.cursor > lastSyncCursor) lastSyncCursor = data.cursor;
                if (Array.isArray(data.onlineIds)) {
                    onlinePeers = new Set(data.onlineIds.map(cleanIdValue).filter(Boolean));
                    renderPresence();
                }
                if (Array.isArray(data.events)) data.events.forEach(handleIncomingPayload);
                return data;
            }).catch(function() {
                if (payload && payload.to && payload.type === 'msg') {
                    if (!outboxQueue.some(function(x) { return x && x.msgId === payload.msgId; })) {
                        outboxQueue.push(payload);
                        persistState();
                        updateQueueBadge();
                    }
                }
                return null;
            });
        }

        function flushOutboxQueue() {
            if (!outboxQueue.length) return;
            if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
            var batch = outboxQueue.slice();
            outboxQueue = [];
            persistState();
            updateQueueBadge();
            batch.forEach(function(item) { postHttpSync(item); });
        }

        function pollHttpSync() {
            if (typeof navigator !== 'undefined' && navigator.onLine === false) {
                updateOfflineNetworkUI(true);
                return Promise.resolve(null);
            }
            var normIds = myAccts.map(cleanIdValue).filter(Boolean);
            if (activeAcct && normIds.indexOf(cleanIdValue(activeAcct)) === -1) normIds.unshift(cleanIdValue(activeAcct));
            return fetch('/api/sync?ids=' + encodeURIComponent(normIds.join(',')) + '&since=' + lastSyncCursor + '&t=' + Date.now(), { cache: 'no-store' }).then(function(res) {
                if (!res || !res.ok) return null;
                serverReachable = true;
                updateOfflineNetworkUI(false);
                setHeaderStatus('متصل', true);
                return res.json();
            }).then(function(data) {
                if (!data) return null;
                if (data.appVersion) triggerSilentAppUpdateIfNeeded(data.appVersion);
                if (typeof data.cursor === 'number' && data.cursor > lastSyncCursor) lastSyncCursor = data.cursor;
                flushOutboxQueue();
                if (Array.isArray(data.onlineIds)) {
                    onlinePeers = new Set(data.onlineIds.map(cleanIdValue).filter(Boolean));
                    renderPresence();
                }
                if (Array.isArray(data.events)) data.events.forEach(handleIncomingPayload);
                return data;
            }).catch(function() { return null; });
        }

        function syncPresenceNow() {
            if (typeof navigator !== 'undefined' && navigator.onLine === false) return updateOfflineNetworkUI(true);
            var idsList = myAccts.map(cleanIdValue).filter(Boolean);
            var cur = cleanIdValue(activeAcct);
            if (cur && idsList.indexOf(cur) === -1) idsList.unshift(cur);
            if (ws && ws.readyState === 1) {
                try { ws.send(JSON.stringify({ type: 'register_ids', ids: idsList, activeId: cur })); } catch (e) {}
            }
            postHttpSync({ type: 'register_ids', ids: idsList, activeId: cur });
            pollHttpSync();
        }

        function openSocket() {
            try {
                if (typeof WebSocket === 'undefined') return;
                if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
                var scheme = location.protocol === 'https:' ? 'wss:' : 'ws:';
                ws = new WebSocket(scheme + '//' + location.host);
                ws.onopen = function() {
                    wsConnected = true;
                    serverReachable = true;
                    updateOfflineNetworkUI(false);
                    setHeaderStatus('متصل', true);
                    syncPresenceNow();
                    flushOutboxQueue();
                };
                ws.onclose = function() { wsConnected = false; };
                ws.onerror = function() { wsConnected = false; };
                ws.onmessage = function(ev) {
                    try { handleIncomingPayload(JSON.parse(ev.data)); } catch (e) {}
                };
            } catch (e) { wsConnected = false; }
        }

        function reconnectNow() {
            if (typeof navigator !== 'undefined' && navigator.onLine === false) return updateOfflineNetworkUI(true);
            updateOfflineNetworkUI(false);
            setHeaderStatus('متصل', true);
            if (ws) { try { ws.close(); } catch (e) {} }
            openSocket();
            syncPresenceNow();
        }

        function sendSignalingOrMsg(payload) {
            var enriched = Object.assign({}, payload, {
                to: payload.to ? cleanIdValue(payload.to) : payload.to,
                from: payload.from ? cleanIdValue(payload.from) : payload.from,
                eventId: payload.eventId || ('ev-' + Date.now() + '-' + Math.floor(Math.random() * 100000))
            });
            if (ws && ws.readyState === 1) {
                try { ws.send(JSON.stringify(enriched)); } catch (e) {}
            }
            postHttpSync(enriched);
        }

        var rtcConn = null;
        var localStreamObj = null;
        var remoteStreamObj = null;
        var pendingCall = null;
        var callPeerId = null;
        var activeCallMode = 'audio';
        var facingModeCurrent = 'user';
        var offerRetryTimer = null;
        var rtcConfig = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] };

        function stopOfferRetryLoop() {
            if (offerRetryTimer) { clearInterval(offerRetryTimer); offerRetryTimer = null; }
        }

        function applyAudioOutputPreference() {
            var targetVol = speakerModeActive ? 1.0 : 0.35;
            var audEl = document.getElementById('remote-audio-el');
            if (audEl) { audEl.muted = false; audEl.volume = targetVol; audEl.play().catch(function() {}); }
            var rv = document.getElementById('remote-video-el');
            if (rv && !rv.classList.contains('hidden')) { rv.muted = false; rv.volume = targetVol; rv.play().catch(function() {}); }
        }

        function toggleSpeakerOrEarpiece() { speakerModeActive = !speakerModeActive; applyAudioOutputPreference(); }
        function forceUnmuteAudio() { applyAudioOutputPreference(); startRingtoneLoop(); }

        function tuneAudioSenderForWeakNet(pc) {
            if (!pc || !pc.getSenders) return;
            var maxAudioBps = isWeakNetworkMode() ? 16000 : 36000;
            pc.getSenders().forEach(function(sender) {
                if (sender.track && sender.track.kind === 'audio' && sender.getParameters && sender.setParameters) {
                    var params = sender.getParameters();
                    if (!params.encodings || !params.encodings.length) params.encodings = [{}];
                    params.encodings[0].maxBitrate = maxAudioBps;
                    sender.setParameters(params).catch(function() {});
                }
            });
        }

        function attachRemoteMediaStream(stream, mode) {
            remoteStreamObj = stream;
            var audEl = document.getElementById('remote-audio-el');
            if (audEl) audEl.srcObject = stream;
            if ((mode || activeCallMode) === 'video') {
                var rv = document.getElementById('remote-video-el');
                rv.srcObject = stream;
                rv.classList.remove('hidden');
            }
            applyAudioOutputPreference();
        }

        function onCallDialInput() {
            var inp = document.getElementById('call-input');
            var preview = document.getElementById('call-resolved-preview');
            var sugBox = document.getElementById('call-contact-suggestions');
            if (!inp) return;
            var q = cleanIdValue(inp.value);
            var matches = findContactMatches(q).filter(function(c) { return c.id !== DEFAULT_PEER; }).slice(0, 5);
            var exactOrFirst = resolveContactByQuery(q);
            if (preview) {
                preview.textContent = exactOrFirst ? ('متطابق تلقائياً: ' + exactOrFirst.name + ' (' + exactOrFirst.id + ')') : (q ? ('سيتم الاتصال بـ: ' + q) : '');
            }
            if (sugBox) {
                sugBox.innerHTML = matches.map(function(c) {
                    return '<button type="button" onclick="selectCallSuggestion(\\'' + escapeJsSingle(c.id) + '\\', \\'' + escapeJsSingle(c.name) + '\\')" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-2.5 py-1 rounded-lg text-[11px] font-bold">' +
                        escapeHtml(c.name) + ' • <span class="font-mono text-teal-200">' + escapeHtml(c.id) + '</span></button>';
                }).join('');
            }
        }

        function selectCallSuggestion(id, name) {
            var cleanId = cleanIdValue(id);
            var inp = document.getElementById('call-input');
            if (inp) inp.value = name ? (name + ' • ' + cleanId) : cleanId;
            currentPeer = cleanId;
            onCallDialInput();
        }

        function startDialedCall(mode) {
            var inp = document.getElementById('call-input');
            var raw = inp ? cleanIdValue(inp.value) : '';
            var cleanedPart = raw.indexOf('•') !== -1 ? cleanIdValue(raw.split('•').pop()) : raw;
            var resolved = resolveContactByQuery(cleanedPart || raw);
            launchCall(mode, resolved ? resolved.id : (cleanedPart || raw || currentPeer));
        }

        function formatPeerDisplay(peerId) {
            var cleanId = cleanIdValue(peerId);
            var grp = findGroupById(cleanId);
            if (grp) return grp.name + ' • مجموعة';
            var found = contacts.find(function(c) { return normalizeStr(c.id) === normalizeStr(cleanId); });
            return found ? (found.name + ' • ' + found.id) : cleanId;
        }

        function launchCall(mode, explicitTarget) {
            var rawTarget = cleanIdValue(explicitTarget || currentPeer || '');
            var matched = resolveContactByQuery(rawTarget);
            var target = matched ? matched.id : rawTarget;
            if (!target) return alert('اكتب الاسم أو الرقم أو المعرّف لبدء الاتصال.');
            currentPeer = target;
            callPeerId = target;
            activeCallMode = mode || 'audio';
            stopOfferRetryLoop();
            startCallTimer();
            syncPresenceNow();
            document.getElementById('call-modal').classList.remove('hidden');
            document.getElementById('call-peer-title').textContent = formatPeerDisplay(target);
            document.getElementById('call-status-msg').textContent = 'يرن الآن...';
            document.getElementById('accept-btn').classList.add('hidden');
            setCallVisualMode(activeCallMode);
            startRingtoneLoop();

            navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
                video: activeCallMode === 'video' ? { facingMode: facingModeCurrent, width: { ideal: 360 }, height: { ideal: 640 } } : false
            }).then(function(stream) {
                localStreamObj = stream;
                if (activeCallMode === 'video') {
                    var lv = document.getElementById('local-video-el');
                    lv.srcObject = localStreamObj;
                    lv.play().catch(function() {});
                }
                createRTC(activeCallMode);
                localStreamObj.getTracks().forEach(function(t) { rtcConn.addTrack(t, localStreamObj); });
                tuneAudioSenderForWeakNet(rtcConn);
                return rtcConn.createOffer();
            }).then(function(offer) {
                return rtcConn.setLocalDescription(offer).then(function() { return offer; });
            }).then(function(offer) {
                var callSessionId = 'call-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
                var sendOfferNow = function() {
                    if (!rtcConn || !callPeerId) return stopOfferRetryLoop();
                    sendSignalingOrMsg({ type: 'call_sig', to: callPeerId, from: activeAcct, sig: { op: 'offer', callSessionId: callSessionId, mode: activeCallMode, sdp: offer } });
                };
                sendOfferNow();
                var retries = 0;
                offerRetryTimer = setInterval(function() {
                    retries += 1;
                    if (retries > 8 || !rtcConn || (rtcConn.remoteDescription && rtcConn.remoteDescription.type)) return stopOfferRetryLoop();
                    sendOfferNow();
                }, 1800);
            }).catch(function() {
                document.getElementById('call-status-msg').textContent = 'يرجى السماح بصلاحية الميكروفون أو الكاميرا';
            });
        }

        function switchCameraFacing() {
            if (activeCallMode !== 'video' || !rtcConn) return;
            facingModeCurrent = facingModeCurrent === 'user' ? 'environment' : 'user';
            navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: facingModeCurrent } }).then(function(newStream) {
                var newVideoTrack = newStream.getVideoTracks()[0];
                if (!newVideoTrack) return;
                var sender = rtcConn.getSenders().find(function(s) { return s.track && s.track.kind === 'video'; });
                if (sender) sender.replaceTrack(newVideoTrack);
            }).catch(function() {});
        }

        function onCallSignal(msg) {
            var sig = msg.sig;
            if (!sig) return;
            if (sig.op === 'offer') {
                if (pendingCall && pendingCall.sig && pendingCall.sig.callSessionId && sig.callSessionId === pendingCall.sig.callSessionId) return;
                pendingCall = msg;
                callPeerId = cleanIdValue(msg.from);
                activeCallMode = sig.mode || 'audio';
                document.getElementById('call-modal').classList.remove('hidden');
                document.getElementById('call-peer-title').textContent = formatPeerDisplay(callPeerId);
                document.getElementById('call-status-msg').textContent = 'اتصال وارد — يرن الآن...';
                document.getElementById('accept-btn').classList.remove('hidden');
                setCallVisualMode(activeCallMode);
                startRingtoneLoop();
            } else if (sig.op === 'answer' && rtcConn) {
                stopOfferRetryLoop();
                stopRingtoneLoop();
                startCallTimer();
                rtcConn.setRemoteDescription(new RTCSessionDescription(sig.sdp)).then(function() {
                    document.getElementById('call-status-msg').textContent = 'متصل الآن';
                    tuneAudioSenderForWeakNet(rtcConn);
                    applyAudioOutputPreference();
                }).catch(function() {});
            } else if (sig.op === 'ice' && rtcConn && sig.candidate) {
                rtcConn.addIceCandidate(new RTCIceCandidate(sig.candidate)).catch(function() {});
            } else if (sig.op === 'bye') {
                resetCallState();
            }
        }

        function answerCall() {
            if (!pendingCall) return;
            stopRingtoneLoop();
            startCallTimer();
            document.getElementById('accept-btn').classList.add('hidden');
            document.getElementById('call-status-msg').textContent = 'جاري فتح الاتصال...';
            var mode = pendingCall.sig.mode || 'audio';
            activeCallMode = mode;

            navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
                video: mode === 'video' ? { facingMode: facingModeCurrent } : false
            }).then(function(stream) {
                localStreamObj = stream;
                createRTC(mode);
                localStreamObj.getTracks().forEach(function(t) { rtcConn.addTrack(t, localStreamObj); });
                tuneAudioSenderForWeakNet(rtcConn);
                return rtcConn.setRemoteDescription(new RTCSessionDescription(pendingCall.sig.sdp));
            }).then(function() {
                return rtcConn.createAnswer();
            }).then(function(ans) {
                return rtcConn.setLocalDescription(ans).then(function() { return ans; });
            }).then(function(ans) {
                sendSignalingOrMsg({ type: 'call_sig', to: cleanIdValue(pendingCall.from), from: activeAcct, sig: { op: 'answer', sdp: ans } });
                document.getElementById('call-status-msg').textContent = 'متصل الآن';
                applyAudioOutputPreference();
            }).catch(function() {});
        }

        function createRTC(mode) {
            if (rtcConn) { try { rtcConn.close(); } catch (e) {} }
            rtcConn = new RTCPeerConnection(rtcConfig);
            rtcConn.onicecandidate = function(e) {
                if (e.candidate && callPeerId) {
                    sendSignalingOrMsg({ type: 'call_sig', to: callPeerId, from: activeAcct, sig: { op: 'ice', candidate: e.candidate } });
                }
            };
            rtcConn.ontrack = function(e) {
                var incomingStream = (e.streams && e.streams[0]) ? e.streams[0] : new MediaStream([e.track]);
                attachRemoteMediaStream(incomingStream, mode);
            };
        }

        function setCallVisualMode(mode) {
            var lv = document.getElementById('local-video-el');
            var rv = document.getElementById('remote-video-el');
            var vc = document.getElementById('voice-call-card');
            if (mode === 'video') { lv.classList.remove('hidden'); vc.classList.add('hidden'); }
            else { lv.classList.add('hidden'); rv.classList.add('hidden'); vc.classList.remove('hidden'); }
        }

        function toggleMuteTrack() {
            if (!localStreamObj) return;
            var tr = localStreamObj.getAudioTracks()[0];
            if (!tr) return;
            tr.enabled = !tr.enabled;
        }

        function endActiveCall() {
            if (callPeerId) sendSignalingOrMsg({ type: 'call_sig', to: callPeerId, from: activeAcct, sig: { op: 'bye' } });
            resetCallState();
        }

        function resetCallState() {
            stopOfferRetryLoop();
            stopRingtoneLoop();
            stopCallTimer();
            if (rtcConn) { try { rtcConn.close(); } catch (e) {} rtcConn = null; }
            if (localStreamObj) { localStreamObj.getTracks().forEach(function(t) { t.stop(); }); localStreamObj = null; }
            document.getElementById('call-modal').classList.add('hidden');
            pendingCall = null;
            callPeerId = null;
        }

        function emitPacket(to, kind, text, mediaUrl, fileName, existingMsgId, forcedSender) {
            var cleanTo = cleanIdValue(to);
            if (!cleanTo) return;
            var senderId = cleanIdValue(forcedSender || activeAcct) || activeAcct;
            var grp = findGroupById(cleanTo);
            var msgId = existingMsgId || ('m-' + Date.now() + '-' + Math.floor(Math.random() * 10000));
            if (!acctThreads[senderId]) acctThreads[senderId] = {};
            if (!acctThreads[senderId][cleanTo]) acctThreads[senderId][cleanTo] = [];
            var entry = {
                id: msgId, from: 'me', kind: kind, text: text, mediaUrl: mediaUrl, fileName: fileName,
                delivered: Boolean(grp), read: false, status: grp ? 'delivered' : 'sent'
            };
            if (!existingMsgId) acctThreads[senderId][cleanTo].push(entry);
            persistAndDraw();
            if (grp && Array.isArray(grp.members)) {
                grp.members.forEach(function(memId) {
                    var cleanMem = cleanIdValue(memId);
                    if (cleanMem && normalizeStr(cleanMem) !== normalizeStr(senderId)) {
                        sendSignalingOrMsg({ type: 'msg', to: cleanMem, from: cleanTo, msgId: msgId, kind: kind, text: text, mediaUrl: mediaUrl, fileName: fileName });
                    }
                });
            } else {
                sendSignalingOrMsg({ type: 'msg', to: cleanTo, from: senderId, msgId: msgId, kind: kind, text: text, mediaUrl: mediaUrl, fileName: fileName });
            }
        }

        function sendTextMsg() {
            var inp = document.getElementById('msg-box-input');
            if (!inp) return;
            var val = inp.value.trim();
            if (!val) return;
            inp.value = '';
            emitPacket(currentPeer, 'text', val, null, '');
        }

        function renderMsgs() {
            var box = document.getElementById('msgs-box');
            if (!box) return;
            var list = getThreadMap()[currentPeer] || [];
            if (!list.length) {
                box.innerHTML = '<div class="text-center text-xs text-slate-500 py-8">ابدأ المراسلة الآن.</div>';
                return;
            }
            box.innerHTML = list.map(function(m) {
                if (m.deleted) {
                    return '<div class="text-center text-[11px] text-slate-500 italic">تم حذف الرسالة</div>';
                }
                var mine = m.from === 'me';
                var editedTag = m.edited ? ' <span class="text-[9px] opacity-80">(معدّلة)</span>' : '';
                var body = '<p class="whitespace-pre-wrap break-words">' + escapeHtml(m.text) + editedTag + '</p>';
                var editBtn = (mine && m.kind === 'text') ? '<button type="button" onclick="editOwnMessage(\\'' + escapeJsSingle(m.id) + '\\')" class="underline text-amber-200 hover:text-white">تعديل</button>' : '';
                var copyBtn = '<button type="button" onclick="copyMessageText(\\'' + escapeJsSingle(m.id) + '\\')" class="underline text-teal-100 hover:text-white">نسخ</button>';
                var fwdBtn = '<button type="button" onclick="forwardMessageToTarget(\\'' + escapeJsSingle(m.id) + '\\')" class="underline text-emerald-200 hover:text-white">تحويل</button>';
                var delBtn = '<button type="button" onclick="openDeleteModal(\\'' + escapeJsSingle(m.id) + '\\', ' + (mine ? 'true' : 'false') + ')" class="underline text-rose-300 hover:text-rose-200">حذف</button>';
                return '<div class="flex ' + (mine ? 'justify-end' : 'justify-start') + '">' +
                    '<div class="' + (mine ? 'bg-[#164e63] text-white rounded-tl-none' : 'bg-[#0f1b29] border border-slate-800 text-slate-100 rounded-tr-none') + ' p-3 rounded-2xl max-w-md text-xs md:text-sm shadow space-y-1">' +
                    body +
                    '<div class="flex justify-between items-center gap-2 pt-1.5 border-t border-white/10 text-[10px] flex-wrap">' +
                    '<span>' + (mine ? (m.read ? 'تمت القراءة' : (m.delivered ? 'مستلمة' : 'مرسلة')) : 'مستلمة') + '</span>' +
                    '<div class="flex items-center gap-2">' + editBtn + copyBtn + fwdBtn + delBtn + '</div></div></div></div>';
            }).join('');
            box.scrollTop = box.scrollHeight;
        }

        function openDeleteModal(msgId, isMine) {
            pendingDeleteMsgId = msgId;
            var delAllBtn = document.getElementById('del-everyone-btn');
            if (delAllBtn) delAllBtn.classList.toggle('hidden', !isMine);
            document.getElementById('delete-modal').classList.remove('hidden');
        }

        function closeDeleteModal() {
            pendingDeleteMsgId = null;
            document.getElementById('delete-modal').classList.add('hidden');
        }

        function confirmDeleteChoice(mode) {
            var msgId = pendingDeleteMsgId;
            closeDeleteModal();
            if (!msgId) return;
            var map = getThreadMap();
            if (!map[currentPeer]) return;
            map[currentPeer] = map[currentPeer].map(function(m) {
                return m.id === msgId ? Object.assign({}, m, { deleted: true, deletedBy: mode === 'all' ? 'all' : 'me' }) : m;
            });
            persistAndDraw();
            if (mode === 'all') sendSignalingOrMsg({ type: 'msg_del_all', to: currentPeer, from: activeAcct, msgId: msgId });
        }

        function choosePeer(id) {
            var clean = cleanIdValue(id);
            if (!clean) return;
            currentPeer = clean;
            clearUnreadForPeer(clean);
            setPane('chats');
            persistAndDraw();
        }

        function persistAndDraw() {
            persistState();
            updateUnreadBadgesUI();
            var acctLbl = document.getElementById('active-acct-label');
            if (acctLbl) acctLbl.textContent = activeAcct;
            renderMsgs();
        }

        var devBadge = document.getElementById('device-badge');
        if (devBadge) devBadge.textContent = detectDevice();
        loadSavedState();
        persistAndDraw();
        openSocket();
        syncPresenceNow();
        setInterval(function() {
            pollHttpSync();
            if (!ws || ws.readyState > 1) openSocket();
        }, 1200);
    </script>
</body>
</html>`;

const PORT = process.env.PORT || 3000;
const socketsMap = new Map();
const httpPresence = new Map();
const httpInbox = new Map();
const recentEventLog = [];
let globalEventSeq = 1;

function touchHttpPresence(ids) {
    if (!Array.isArray(ids)) return;
    const now = Date.now();
    ids.forEach(id => {
        const clean = normIdServer(id);
        if (clean) httpPresence.set(clean, now);
    });
}

function getAllOnlineIds() {
    const now = Date.now();
    const set = new Set();
    socketsMap.forEach((sockSet, id) => {
        if (sockSet && sockSet.size > 0) set.add(normIdServer(id));
    });
    httpPresence.forEach((ts, id) => {
        const norm = normIdServer(id);
        if (now - ts < 25000) set.add(norm);
        else httpPresence.delete(id);
    });
    return Array.from(set).filter(Boolean);
}

function registerSocketForId(id, clientWs) {
    const clean = normIdServer(id);
    if (!clean) return;
    let set = socketsMap.get(clean);
    if (!set) { set = new Set(); socketsMap.set(clean, set); }
    set.add(clientWs);
}

function unregisterSocketForId(id, clientWs) {
    const clean = normIdServer(id);
    const set = socketsMap.get(clean);
    if (!set) return;
    set.delete(clientWs);
    if (set.size === 0) socketsMap.delete(clean);
}

function sendToIdSockets(toId, payloadStr) {
    const clean = normIdServer(toId);
    const set = socketsMap.get(clean);
    let sent = false;
    if (set && set.size > 0) {
        set.forEach(client => {
            if (client && client.readyState === 1) {
                try { client.send(payloadStr); sent = true; } catch (e) {}
            }
        });
    }
    return sent;
}

function recordRecentEvent(toId, payload) {
    const clean = normIdServer(toId);
    if (!clean) return;
    const seq = globalEventSeq++;
    recentEventLog.push({ seq, to: clean, ts: Date.now(), payload });
    if (recentEventLog.length > 500) recentEventLog.shift();
}

function enqueueHttpEvent(toId, payload) {
    const clean = normIdServer(toId);
    if (!clean) return;
    const list = httpInbox.get(clean) || [];
    list.push(payload);
    if (list.length > 150) list.shift();
    httpInbox.set(clean, list);
}

function routeEventToRecipient(destId, normalizedData) {
    const clean = normIdServer(destId);
    if (!clean) return;
    recordRecentEvent(clean, normalizedData);
    const payloadStr = JSON.stringify(normalizedData);
    sendToIdSockets(clean, payloadStr);
    enqueueHttpEvent(clean, normalizedData);
}

function drainHttpEvents(ids, sinceCursor) {
    const out = [];
    const seen = new Set();
    if (!Array.isArray(ids)) return out;
    const normSet = new Set(ids.map(normIdServer).filter(Boolean));
    normSet.forEach(clean => {
        const list = httpInbox.get(clean);
        if (list && list.length) {
            list.forEach(ev => {
                const key = ev && ev.eventId ? ev.eventId : JSON.stringify(ev);
                if (!seen.has(key)) { seen.add(key); out.push(ev); }
            });
            httpInbox.set(clean, []);
        }
    });
    const minSeq = Number(sinceCursor) || 0;
    const cutoff = Date.now() - 60000;
    recentEventLog.forEach(item => {
        if (item.seq > minSeq && item.ts >= cutoff && normSet.has(item.to)) {
            const ev = item.payload;
            const key = ev && ev.eventId ? ev.eventId : JSON.stringify(ev);
            if (!seen.has(key)) { seen.add(key); out.push(ev); }
        }
    });
    return out;
}

const noCacheHeaders = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
};

const server = http.createServer((req, res) => {
    try {
        const urlObj = new URL(req.url || '/', 'http://' + (req.headers.host || 'localhost'));

        if (urlObj.pathname === '/sw.js') {
            res.writeHead(200, Object.assign({ 'Content-Type': 'application/javascript; charset=utf-8' }, noCacheHeaders));
            res.end(swContent);
            return;
        }

        if (urlObj.pathname === '/manifest.json') {
            res.writeHead(200, Object.assign({ 'Content-Type': 'application/manifest+json; charset=utf-8' }, noCacheHeaders));
            res.end(manifestPayload);
            return;
        }

        if (urlObj.pathname === '/icon.svg' || urlObj.pathname === '/apple-touch-icon.png' || urlObj.pathname === '/apple-touch-icon-precomposed.png') {
            res.writeHead(200, { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' });
            res.end(sanadIconSvg);
            return;
        }

        if (urlObj.pathname === '/healthz' || urlObj.pathname === '/api/version') {
            res.writeHead(200, Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, noCacheHeaders));
            res.end(JSON.stringify({ ok: true, appVersion: APP_VERSION, cursor: globalEventSeq - 1, onlineIds: getAllOnlineIds() }));
            return;
        }

        if (urlObj.pathname === '/api/sync' && req.method === 'GET') {
            const rawIds = (urlObj.searchParams.get('ids') || '').split(',').map(normIdServer).filter(Boolean);
            const sinceCursor = urlObj.searchParams.get('since') || '0';
            touchHttpPresence(rawIds);
            const events = drainHttpEvents(rawIds, sinceCursor);
            res.writeHead(200, Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, noCacheHeaders));
            res.end(JSON.stringify({ appVersion: APP_VERSION, cursor: globalEventSeq - 1, onlineIds: getAllOnlineIds(), events }));
            return;
        }

        if (urlObj.pathname === '/api/sync' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
                if (body.length > 5 * 1024 * 1024) { try { req.destroy(); } catch (e) {} }
            });
            req.on('end', () => {
                try {
                    const data = JSON.parse(body || '{}');
                    if (data && data.type === 'register_ids') {
                        const list = Array.isArray(data.ids) ? data.ids : [data.activeId].filter(Boolean);
                        touchHttpPresence(list);
                        broadcastOnline();
                    } else if (data && data.to) {
                        if (data.from) touchHttpPresence([data.from]);
                        const normalizedData = Object.assign({}, data, {
                            to: normIdServer(data.to),
                            from: data.from ? normIdServer(data.from) : data.from
                        });
                        routeEventToRecipient(normalizedData.to, normalizedData);
                    }
                } catch (e) {}
                if (!res.writableEnded) {
                    res.writeHead(200, Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, noCacheHeaders));
                    res.end(JSON.stringify({ ok: true, appVersion: APP_VERSION, cursor: globalEventSeq - 1, onlineIds: getAllOnlineIds() }));
                }
            });
            return;
        }

        res.writeHead(200, Object.assign({ 'Content-Type': 'text/html; charset=utf-8' }, noCacheHeaders));
        res.end(htmlContent);
    } catch (e) {
        if (!res.writableEnded) {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ ok: false }));
        }
    }
});

const wss = new WebSocketServer({ server });

function broadcastOnline() {
    const msg = JSON.stringify({ type: 'online_users', ids: getAllOnlineIds() });
    wss.clients.forEach(c => {
        if (c && c.readyState === 1) {
            try { c.send(msg); } catch (e) {}
        }
    });
}

wss.on('connection', (clientWs) => {
    let registeredIds = [];

    clientWs.on('message', (raw) => {
        let data;
        try { data = JSON.parse(raw.toString()); } catch (e) { return; }
        if (!data || typeof data !== 'object') return;

        if (data.type === 'register_ids') {
            registeredIds.forEach(old => unregisterSocketForId(old, clientWs));
            const list = Array.isArray(data.ids) ? data.ids : [data.activeId].filter(Boolean);
            registeredIds = list.map(normIdServer).filter(Boolean);
            registeredIds.forEach(id => registerSocketForId(id, clientWs));
            touchHttpPresence(registeredIds);
            broadcastOnline();
            return;
        }

        if (data.to) {
            if (data.from) touchHttpPresence([data.from]);
            const normalizedData = Object.assign({}, data, {
                to: normIdServer(data.to),
                from: data.from ? normIdServer(data.from) : data.from
            });
            routeEventToRecipient(normalizedData.to, normalizedData);
        }
    });

    clientWs.on('close', () => {
        registeredIds.forEach(id => unregisterSocketForId(id, clientWs));
        broadcastOnline();
    });

    clientWs.on('error', () => {});
});

server.listen(PORT, () => {
    console.log('Sanad AI v8.8 running on port ' + PORT);
});
