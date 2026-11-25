const http = require('http');
const { WebSocketServer } = require('ws');

const APP_VERSION = '8.9.3';
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
  <text x="256" y="218" text-anchor="middle" fill="${ICON_ACCENT_HEX}" font-family="'Cairo', 'Tahoma', 'Arial', sans-serif" font-size="168" font-weight="900">س</text>
  <circle cx="182" cy="196" r="24" fill="url(#aiSparkGrad)"/>
  <path d="M126 246c22 52 78 78 134 78 58 0 112-26 136-78-30 16-66 34-106 34-26 0-48-8-64-16 26 2 52-4 72-14-36 4-76-2-104-20-26 12-48 14-68 14z" fill="none" stroke="${ICON_ACCENT_HEX}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="256" y="424" text-anchor="middle" fill="${ICON_ACCENT_HEX}" font-family="'Cairo', 'Tahoma', 'Arial', sans-serif" font-size="88" font-weight="900">سند</text>
</svg>`;

const manifestPayload = JSON.stringify({
  name: 'Sanad AI v8.9.3 - سند',
  short_name: 'سند AI',
  description: 'تطبيق سند AI للتواصل الذكي والمحادثات والمكالمات الفردية والجماعية والعمل بدون إنترنت والمساعدة الصوتية والذكاء الاصطناعي',
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
    <title>سند AI v8.9.3</title>
    <link id="sanad-favicon" rel="icon" type="image/svg+xml" href="/icon.svg">
    <link id="sanad-apple-icon" rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
    <link rel="manifest" href="/manifest.json">
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
        body { font-family: 'Cairo', sans-serif; background-color: #0b131e; color: #e6eef5; }
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

                ctx.strokeStyle = 'rgba(240,253,250,0.14)';
                ctx.lineWidth = 2;
                var nodes = [[72, 88], [164, 62], [118, 168], [392, 82], [446, 164], [352, 176], [96, 336], [418, 312]];
                for (var i = 0; i < nodes.length; i++) {
                    for (var j = i + 1; j < nodes.length; j++) {
                        if (Math.hypot(nodes[i][0] - nodes[j][0], nodes[i][1] - nodes[j][1]) < 150) {
                            ctx.beginPath();
                            ctx.moveTo(nodes[i][0], nodes[i][1]);
                            ctx.lineTo(nodes[j][0], nodes[j][1]);
                            ctx.stroke();
                        }
                    }
                    ctx.beginPath();
                    ctx.arc(nodes[i][0], nodes[i][1], 4.5, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(240,253,250,0.28)';
                    ctx.fill();
                }

                ctx.font = '900 168px Cairo, Tahoma, Arial, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#f0fdfa';
                ctx.fillText('س', 256, 185);

                var sparkGrad = ctx.createRadialGradient(182, 196, 2, 182, 196, 24);
                sparkGrad.addColorStop(0, '#ffffff');
                sparkGrad.addColorStop(0.55, 'rgba(204,251,241,0.85)');
                sparkGrad.addColorStop(1, 'rgba(22,78,99,0)');
                ctx.fillStyle = sparkGrad;
                ctx.beginPath();
                ctx.arc(182, 196, 24, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = '#f0fdfa';
                ctx.lineWidth = 7;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.beginPath();
                ctx.moveTo(126, 246);
                ctx.bezierCurveTo(148, 298, 200, 324, 260, 324);
                ctx.bezierCurveTo(318, 324, 372, 298, 396, 246);
                ctx.stroke();

                ctx.lineWidth = 5;
                ctx.beginPath();
                ctx.moveTo(164, 256);
                ctx.bezierCurveTo(212, 276, 286, 274, 356, 246);
                ctx.stroke();

                ctx.font = '900 88px Cairo, Tahoma, Arial, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#f0fdfa';
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
                .replace(/\\/g, '\\\\')
                .replace(/'/g, "\\'")
                .replace(/\n/g, ' ')
                .replace(/\r/g, '');
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
                    <span class="text-[10px] bg-teal-950/80 text-teal-200 border border-teal-800/60 px-2 py-0.5 rounded-full font-bold">AI v8.9.3</span>
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

        <div class="flex items-center gap-1.5 shrink-0">
            <button type="button" onclick="openAssistedVoiceHub()" title="مساعدة صوتية لمن لا يجيد القراءة والكتابة" class="px-2.5 h-9 rounded-xl bg-emerald-950/80 hover:bg-emerald-800 border border-emerald-700/60 text-emerald-200 hover:text-white flex items-center gap-1 text-[11px] font-bold transition">
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
        <span><i class="fa-solid fa-plane-slash ml-1"></i> وضع بدون إنترنت — يمكنك تصفح رسائلك وجهاتك وتجهيز رسائلك للإرسال فور عودة الشبكة.</span>
        <button type="button" onclick="reconnectNow()" class="bg-amber-800/80 px-2 py-0.5 rounded text-[10px] font-bold shrink-0">فحص الشبكة</button>
    </div>

    <div id="copy-toast-banner" class="hidden fixed top-14 left-1/2 -translate-x-1/2 bg-teal-900/95 border border-teal-500/50 text-teal-50 px-4 py-1.5 rounded-full shadow-xl z-50 text-[11px] font-bold">
        تم النسخ إلى الحافظة
    </div>

    <div id="live-toast" onclick="jumpToToastChat()" class="hidden fixed top-16 left-3 right-3 max-w-md mx-auto bg-[#0f1b29]/95 border border-teal-800/70 text-slate-100 px-3.5 py-2.5 rounded-2xl shadow-2xl z-40 flex items-center justify-between gap-2 cursor-pointer text-xs">
        <div class="min-w-0">
            <p id="toast-sender" class="font-black text-teal-200 truncate">رسالة جديدة</p>
            <p id="toast-body" class="text-slate-200 truncate">...</p>
        </div>
        <span class="bg-teal-950 text-teal-200 border border-teal-800/60 px-2 py-1 rounded-lg text-[10px] font-bold shrink-0">فتح</span>
    </div>

    <div id="assisted-voice-modal" onclick="if(event.target===this)closeAssistedVoiceHub()" class="hidden fixed inset-0 bg-[#080f18]/85 z-50 flex items-center justify-center p-3.5">
        <div class="bg-[#0f1b29] border border-teal-700/60 rounded-3xl w-full max-w-md p-4 space-y-3 shadow-2xl">
            <div class="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div>
                    <h3 class="text-sm font-black text-teal-200"><i class="fa-solid fa-hands-asl-interpreting ml-1"></i> بروتوكول المساعدة الصوتية والذكية</h3>
                    <p class="text-[11px] text-slate-400">مصمم للقراءة الصوتية المباشرة، التحدث للكتابة، وتبسيط النصوص بضغطة زر.</p>
                </div>
                <button type="button" onclick="closeAssistedVoiceHub()" class="text-slate-400 hover:text-white text-sm"><i class="fa-solid fa-xmark"></i></button>
            </div>

            <div class="grid grid-cols-2 gap-2 text-xs">
                <button type="button" onclick="readLastIncomingMessageAloud()" class="bg-emerald-800 hover:bg-emerald-700 text-white py-3 px-3 rounded-2xl font-bold flex flex-col items-center gap-1">
                    <i class="fa-solid fa-volume-high text-base"></i>
                    <span>اقرأ آخر رسالة واردة</span>
                </button>
                <button type="button" onclick="readWholeThreadAloud()" class="bg-teal-800 hover:bg-teal-700 text-white py-3 px-3 rounded-2xl font-bold flex flex-col items-center gap-1">
                    <i class="fa-solid fa-book-open-reader text-base"></i>
                    <span>اقرأ المحادثة صوتياً</span>
                </button>
                <button type="button" onclick="closeAssistedVoiceHub(); toggleSpeechDictation();" class="bg-[#164e63] hover:bg-[#1e6078] text-white py-3 px-3 rounded-2xl font-bold flex flex-col items-center gap-1">
                    <i class="fa-solid fa-microphone-lines text-base"></i>
                    <span>تحدث لأكتب رسالتك</span>
                </button>
                <button type="button" onclick="stopSpeechReading()" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-200 py-3 px-3 rounded-2xl font-bold flex flex-col items-center gap-1">
                    <i class="fa-solid fa-stop text-base"></i>
                    <span>إيقاف القراءة الصوتية</span>
                </button>
            </div>

            <div class="bg-[#080f18] border border-slate-800 rounded-2xl p-3 space-y-2 text-xs">
                <p class="font-bold text-teal-200">مساعدة الذكاء الاصطناعي للنص الحالي أو الرسالة المحددة:</p>
                <div class="flex flex-wrap gap-1.5">
                    <button type="button" onclick="aiTransformCurrentDraft('simplify')" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-200 px-2.5 py-1.5 rounded-xl font-bold">تبسيط بلغة سهلة</button>
                    <button type="button" onclick="aiTransformCurrentDraft('formal')" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-200 px-2.5 py-1.5 rounded-xl font-bold">صياغة رسمية مرتبة</button>
                    <button type="button" onclick="aiTransformCurrentDraft('summarize')" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-200 px-2.5 py-1.5 rounded-xl font-bold">تلخيص سريع</button>
                    <button type="button" onclick="readCurrentDraftAloud()" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-teal-200 px-2.5 py-1.5 rounded-xl font-bold">اسمع ما كتبته</button>
                </div>
            </div>
        </div>
    </div>

    <div id="long-msg-reader-modal" onclick="if(event.target===this)closeLongMsgReader()" class="hidden fixed inset-0 bg-[#080f18]/85 z-50 flex items-center justify-center p-4">
        <div class="bg-[#0f1b29] border border-slate-700 rounded-3xl w-full max-w-lg max-h-[82vh] flex flex-col shadow-2xl overflow-hidden">
            <div class="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <span id="long-msg-reader-title" class="text-xs font-black text-teal-200">قراءة الرسالة كاملة</span>
                <div class="flex items-center gap-2">
                    <button type="button" id="long-msg-reader-speak-btn" class="bg-teal-900 hover:bg-teal-800 text-teal-100 px-2.5 py-1 rounded-lg text-[11px] font-bold">
                        <i class="fa-solid fa-volume-high ml-1"></i>استماع
                    </button>
                    <button type="button" onclick="closeLongMsgReader()" class="text-slate-400 hover:text-white text-sm"><i class="fa-solid fa-xmark"></i></button>
                </div>
            </div>
            <div id="long-msg-reader-body" class="p-4 overflow-y-auto text-sm leading-relaxed text-slate-100 whitespace-pre-wrap custom-scrollbar"></div>
        </div>
    </div>

    <div id="composer-expand-modal" onclick="if(event.target===this)closeComposerExpand()" class="hidden fixed inset-0 bg-[#080f18]/85 z-50 flex items-center justify-center p-4">
        <div class="bg-[#0f1b29] border border-teal-700/60 rounded-3xl w-full max-w-lg p-4 space-y-3 shadow-2xl">
            <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                <span class="text-xs font-black text-teal-200"><i class="fa-solid fa-expand ml-1"></i> مراجعة وتحرير الرسالة قبل الإرسال</span>
                <button type="button" onclick="closeComposerExpand()" class="text-slate-400 hover:text-white text-sm"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <textarea id="expanded-composer-textarea" rows="7" oninput="syncFromExpandedComposer()" placeholder="اكتب رسالتك وراجعها بوضوح هنا..." class="w-full bg-[#080f18] border border-slate-700 rounded-2xl p-3 text-sm leading-relaxed text-white focus:outline-none focus:border-teal-500 custom-scrollbar"></textarea>
            <div class="flex flex-wrap gap-1.5 text-[11px]">
                <button type="button" onclick="aiTransformExpanded('simplify')" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-200 px-2.5 py-1 rounded-xl font-bold">تبسيط</button>
                <button type="button" onclick="aiTransformExpanded('formal')" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-200 px-2.5 py-1 rounded-xl font-bold">رسمي</button>
                <button type="button" onclick="aiTransformExpanded('summarize')" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-200 px-2.5 py-1 rounded-xl font-bold">تلخيص</button>
                <button type="button" onclick="speakText(document.getElementById('expanded-composer-textarea').value)" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-teal-200 px-2.5 py-1 rounded-xl font-bold"><i class="fa-solid fa-volume-high ml-1"></i>قراءة صوتية</button>
            </div>
            <div class="flex justify-end gap-2 pt-1">
                <button type="button" onclick="closeComposerExpand()" class="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-xs font-bold">تم</button>
                <button type="button" onclick="closeComposerExpand(); sendTextMsg();" class="bg-[#164e63] hover:bg-[#1e6078] text-white px-5 py-2 rounded-xl text-xs font-bold">إرسال الآن</button>
            </div>
        </div>
    </div>

    <div id="msg-context-modal" onclick="if(event.target===this)closeMsgContextMenu()" class="hidden fixed inset-0 bg-[#080f18]/75 z-50 flex items-end sm:items-center justify-center p-3">
        <div class="bg-[#0f1b29] border border-slate-700/80 rounded-2xl w-full max-w-xs p-3 space-y-1.5 shadow-2xl">
            <div class="px-2 py-1 border-b border-slate-800 flex items-center justify-between">
                <span class="text-xs font-black text-teal-200">خيارات الرسالة</span>
                <button type="button" onclick="closeMsgContextMenu()" class="text-slate-400 hover:text-white text-xs"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <button type="button" id="ctx-reply-btn" onclick="ctxReplyAction()" class="w-full text-right px-3 py-2.5 rounded-xl hover:bg-slate-800 text-xs font-bold text-teal-200 flex items-center gap-2.5">
                <i class="fa-solid fa-reply text-teal-300 w-4"></i><span>رد على الرسالة</span>
            </button>
            <button type="button" id="ctx-copy-btn" onclick="ctxCopyAction()" class="w-full text-right px-3 py-2.5 rounded-xl hover:bg-slate-800 text-xs font-bold text-slate-100 flex items-center gap-2.5">
                <i class="fa-solid fa-copy text-teal-300 w-4"></i><span>نسخ النص</span>
            </button>
            <button type="button" id="ctx-paste-btn" onclick="ctxPasteAction()" class="w-full text-right px-3 py-2.5 rounded-xl hover:bg-slate-800 text-xs font-bold text-slate-100 flex items-center gap-2.5">
                <i class="fa-solid fa-paste text-emerald-300 w-4"></i><span>لصق في حقل الإرسال</span>
            </button>
            <button type="button" id="ctx-edit-btn" onclick="ctxEditAction()" class="w-full text-right px-3 py-2.5 rounded-xl hover:bg-slate-800 text-xs font-bold text-sky-200 flex items-center gap-2.5">
                <i class="fa-solid fa-pen text-sky-300 w-4"></i><span>تعديل الرسالة</span>
            </button>
            <button type="button" id="ctx-pin-btn" onclick="ctxPinAction()" class="w-full text-right px-3 py-2.5 rounded-xl hover:bg-slate-800 text-xs font-bold text-amber-200 flex items-center gap-2.5">
                <i class="fa-solid fa-thumbtack text-amber-300 w-4"></i><span>تثبيت الرسالة</span>
            </button>
            <button type="button" id="ctx-speak-btn" onclick="ctxSpeakAction()" class="w-full text-right px-3 py-2.5 rounded-xl hover:bg-slate-800 text-xs font-bold text-slate-100 flex items-center gap-2.5">
                <i class="fa-solid fa-volume-high text-teal-200 w-4"></i><span>استماع صوتي</span>
            </button>
            <button type="button" id="ctx-delete-btn" onclick="ctxDeleteAction()" class="w-full text-right px-3 py-2.5 rounded-xl hover:bg-rose-950/60 text-xs font-bold text-rose-300 flex items-center gap-2.5">
                <i class="fa-solid fa-trash text-rose-400 w-4"></i><span>حذف الرسالة</span>
            </button>
        </div>
    </div>

    <div id="call-modal" class="hidden fixed inset-0 bg-[#080f18]/95 z-50 flex flex-col items-center justify-between p-4">
        <div class="text-center mt-1">
            <p class="text-xs text-teal-300 font-bold">سند AI v8.9.3 • اتصال واضح ومستقر (فردي وجماعي)</p>
            <h2 id="call-peer-title" class="text-lg font-black text-white font-mono mt-0.5">...</h2>
            <p id="call-timer-el" class="text-xs font-mono font-bold text-slate-300 mt-0.5">00:00</p>
            <p id="call-status-msg" class="text-xs text-emerald-300 mt-0.5 font-semibold">جاري الاتصال...</p>
            <p id="call-output-hint" class="text-[10px] text-slate-400 mt-0.5">مخرج الصوت: مكبر الصوت</p>
            <div id="call-participants-bar" class="hidden flex flex-wrap justify-center gap-1.5 mt-1.5 max-w-sm mx-auto"></div>
        </div>

        <div class="relative w-full max-w-sm flex-1 my-2.5 max-h-[64vh] aspect-[9/16] bg-[#0f1b29] rounded-3xl border border-slate-800 overflow-hidden flex items-center justify-center shadow-2xl">
            <video id="remote-video-el" autoplay playsinline class="w-full h-full object-cover hidden"></video>
            <video id="local-video-el" autoplay playsinline muted class="w-24 h-36 object-cover rounded-2xl border-2 border-teal-400/70 shadow-lg absolute bottom-3 left-3 hidden"></video>
            <div id="voice-call-card" class="flex flex-col items-center gap-2.5 px-4 text-center">
                <div class="w-20 h-20 rounded-full bg-teal-950/80 border border-teal-800/60 flex items-center justify-center text-3xl text-teal-200 animate-pulse">
                    <i class="fa-solid fa-microphone-lines"></i>
                </div>
                <span id="call-mode-label" class="text-xs text-slate-300 font-semibold">مكالمة صوتية مباشرة • أولوية جودة الصوت</span>
                <button type="button" onclick="forceUnmuteAudio()" class="bg-slate-800 border border-slate-700 text-emerald-300 px-3 py-1 rounded-xl text-[11px] font-bold">
                    <i class="fa-solid fa-volume-high ml-1"></i> تنشيط الصوت
                </button>
            </div>
        </div>

        <div class="flex items-center gap-2 mb-2 flex-wrap justify-center">
            <button type="button" id="accept-btn" onclick="answerCall()" class="hidden bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-3 rounded-2xl font-bold text-xs shadow-lg animate-bounce">
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
                    <button type="button" onclick="readLastIncomingMessageAloud()" title="اقرأ آخر رسالة واردة صوتياً" class="text-emerald-300 hover:text-emerald-200 font-semibold whitespace-nowrap"><i class="fa-solid fa-volume-high ml-0.5"></i>اسمع</button>
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

            <div id="replying-msg-banner" class="hidden px-3.5 py-2 bg-[#0c1a28] border-t border-teal-700/70 flex items-center justify-between gap-2 text-xs shrink-0">
                <div class="border-r-2 border-teal-400 pr-2.5 min-w-0">
                    <p id="replying-to-label" class="text-[10px] font-extrabold text-teal-300 truncate">رد على رسالة</p>
                    <p id="replying-to-snippet" class="text-[11px] text-slate-200 truncate">...</p>
                </div>
                <button type="button" onclick="cancelReplyMessage()" title="إلغاء الرد" class="text-slate-300 hover:text-white px-1.5 py-1 rounded-lg shrink-0">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>

            <div id="editing-msg-banner" class="hidden px-3.5 py-1.5 bg-sky-950/90 border-t border-sky-700/60 flex items-center justify-between gap-2 text-[11px] shrink-0">
                <span class="text-sky-100 font-bold truncate"><i class="fa-solid fa-pen ml-1"></i> تعديل رسالة...</span>
                <button type="button" onclick="cancelEditMessage()" class="text-sky-200 hover:text-white text-[10px] font-bold shrink-0">إلغاء التعديل</button>
            </div>

            <div id="smart-replies-bar" class="hidden px-3 py-1.5 bg-[#0c1622] border-t border-slate-800/70 flex items-center gap-1.5 overflow-x-auto text-[11px] shrink-0"></div>

            <div class="px-3 py-1 bg-[#0c1622]/80 border-t border-slate-800/70 flex items-center gap-1.5 text-[10px] shrink-0 overflow-x-auto">
                <span class="text-slate-300 font-bold shrink-0">نبرات الصياغة:</span>
                <button type="button" onclick="polishDraft('friendly')" class="bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-slate-200 px-2 py-0.5 rounded shrink-0">ودي</button>
                <button type="button" onclick="polishDraft('formal')" class="bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-slate-200 px-2 py-0.5 rounded shrink-0">رسمي</button>
                <button type="button" onclick="polishDraft('short')" class="bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-slate-200 px-2 py-0.5 rounded shrink-0">مختصر</button>
                <button type="button" onclick="polishDraft('client')" class="bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-teal-200 px-2 py-0.5 rounded shrink-0 font-bold">رد عميل</button>
                <button type="button" onclick="aiTransformCurrentDraft('simplify')" class="bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800/60 text-emerald-200 px-2 py-0.5 rounded font-bold shrink-0">تبسيط</button>
                <button type="button" onclick="openAssistedVoiceHub()" class="bg-sky-950/80 hover:bg-sky-900 border border-sky-800/60 text-sky-200 px-2 py-0.5 rounded font-bold shrink-0"><i class="fa-solid fa-ear-listen ml-0.5"></i>مساعدة صوتية</button>
                <button type="button" onclick="pasteIntoComposer()" class="bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-emerald-200 px-2 py-0.5 rounded font-bold shrink-0"><i class="fa-solid fa-paste ml-1"></i>لصق</button>
                <button type="button" onclick="insertSanadMention()" class="bg-teal-950/80 hover:bg-teal-900 border border-teal-800/60 text-teal-200 px-2 py-0.5 rounded font-bold shrink-0">@سند</button>
            </div>

            <div class="p-2.5 bg-[#0f1b29] border-t border-slate-800 flex items-end gap-1.5 shrink-0">
                <input type="file" id="attach-file" class="hidden" onchange="onFilePicked(event)">
                <button type="button" onclick="document.getElementById('attach-file').click()" title="إرفاق ملف أو صورة" class="text-slate-300 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition shrink-0">
                    <i class="fa-solid fa-paperclip text-base"></i>
                </button>
                <button type="button" id="dictate-btn" onclick="toggleSpeechDictation()" title="تحدث بالصوت لتحويل كلامك إلى كتابة" class="text-emerald-300 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition shrink-0">
                    <i class="fa-solid fa-language text-base"></i>
                </button>
                <button type="button" onclick="openComposerExpand()" title="توسيع ومراجعة النص الطويل" class="text-teal-200 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition shrink-0">
                    <i class="fa-solid fa-expand text-base"></i>
                </button>
                <textarea id="msg-box-input" rows="1" oninput="autoResizeComposer(this)" onkeydown="if(event.key==='Enter' && !event.shiftKey){event.preventDefault();sendTextMsg();}" placeholder="اكتب رسالتك أو راجعها أو استخدم @سند..." class="flex-1 bg-[#080f18] border border-slate-800 rounded-xl px-3 py-2 text-xs md:text-sm leading-relaxed text-white placeholder-slate-400 focus:outline-none focus:border-teal-600 resize-none max-h-32 overflow-y-auto custom-scrollbar"></textarea>
                <span id="rec-timer" class="hidden text-[11px] font-mono font-bold text-teal-300 px-1 py-2 shrink-0">00:00</span>
                <button type="button" id="voice-btn" onclick="toggleVoiceCapture()" title="تسجيل رسالة صوتية" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white p-2.5 rounded-xl transition shrink-0">
                    <i class="fa-solid fa-microphone text-base"></i>
                </button>
                <button type="button" onclick="sendTextMsg()" class="bg-[#164e63] hover:bg-[#1e6078] text-white px-4 py-2.5 rounded-xl text-sm font-bold transition shadow shrink-0">
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
                <p class="text-[11px] text-slate-400 leading-relaxed">
                    أنشئ مجموعة جديدة واختر الأعضاء من الجهات أو أدخل أرقاماً/معرّفات مفصولة بفاصلة، كما يمكنك إضافة أعضاء جدد لأي مجموعة في أي وقت.
                </p>
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
                <p class="text-[11px] text-slate-400 leading-relaxed">
                    ولّد معرّفاً جديداً أو أضف رقمك أو معرّفك الخاص وبدّل بين الحسابات بسهولة.
                </p>
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
                    <h2 class="text-base font-black text-white">المكالمات الفردية والجماعية</h2>
                    <p class="text-xs text-slate-400 mt-1">اتصل بشخص واحد أو ابدأ مكالمة جماعية لمجموعة أو لعدة جهات محددة.</p>
                </div>
                <input type="text" id="call-input" oninput="normalizeDigitsInInput(this); onCallDialInput();" onkeydown="if(event.key==='Enter'){event.preventDefault();startDialedCall('audio');}" placeholder="اكتب الاسم أو الرقم أو المعرّف..." class="w-full max-w-md mx-auto bg-[#080f18] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-center font-mono text-white">
                <div id="call-resolved-preview" class="text-[11px] text-teal-200 font-semibold min-h-[18px]"></div>
                <div id="call-contact-suggestions" class="flex flex-wrap justify-center gap-1.5 max-w-md mx-auto"></div>
                <div class="flex gap-3 justify-center pt-1 flex-wrap">
                    <button type="button" onclick="startDialedCall('audio')" class="bg-emerald-700 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
                        <i class="fa-solid fa-phone"></i> مكالمة صوتية
                    </button>
                    <button type="button" onclick="startDialedCall('video')" class="bg-[#164e63] hover:bg-[#1e6078] text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
                        <i class="fa-solid fa-video"></i> مكالمة فيديو
                    </button>
                </div>
            </div>

            <div class="bg-[#0f1b29] border border-slate-800 p-4 rounded-2xl space-y-3">
                <div class="flex items-center justify-between">
                    <h3 class="text-sm font-black text-teal-200"><i class="fa-solid fa-users-rectangle ml-1"></i> مكالمة جماعية</h3>
                    <span id="group-call-selected-badge" class="text-[11px] font-mono text-slate-300 bg-slate-800 border border-slate-700 px-2.5 py-0.5 rounded-full">0 مشارك</span>
                </div>
                <p class="text-[11px] text-slate-400">اختر مجموعة جاهزة أو حدد عدة جهات اتصال لبدء مكالمة صوتية أو مرئية جماعية.</p>
                <div id="group-call-presets" class="flex flex-wrap gap-1.5"></div>
                <div id="group-call-contact-picker" class="flex flex-wrap gap-1.5"></div>
                <div class="flex gap-2 pt-1 flex-wrap">
                    <button type="button" onclick="launchGroupCall('audio')" class="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
                        <i class="fa-solid fa-phone"></i> مكالمة جماعية صوتية
                    </button>
                    <button type="button" onclick="launchGroupCall('video')" class="flex-1 bg-[#164e63] hover:bg-[#1e6078] text-white py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
                        <i class="fa-solid fa-video"></i> مكالمة جماعية فيديو
                    </button>
                </div>
            </div>
        </section>

        <section id="pane-ai" class="sanad-pane hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-3">
            <div class="bg-[#0f1b29] border border-slate-800 p-4 rounded-2xl space-y-2.5">
                <div class="flex items-center justify-between">
                    <h2 class="text-sm font-black text-teal-200"><i class="fa-solid fa-brain ml-1"></i> مساعد سند AI وتطوير المحتوى</h2>
                    <span class="text-[10px] bg-teal-950/80 text-teal-200 border border-teal-800/50 px-2 py-0.5 rounded-full font-bold">v8.9.3</span>
                </div>
                <div class="flex items-center justify-between bg-[#080f18] p-3 rounded-xl border border-slate-800 text-xs">
                    <span>وضع توفير البيانات للشبكات الضعيفة</span>
                    <input type="checkbox" id="chk-weaknet" checked onchange="updateNetBadge()" class="w-4 h-4 accent-teal-600">
                </div>
                <div class="flex items-center justify-between bg-[#080f18] p-3 rounded-xl border border-slate-800 text-xs">
                    <span>الرد التلقائي الذكي للعملاء عند استلام رسالة</span>
                    <input type="checkbox" id="chk-autoreply" class="w-4 h-4 accent-teal-600">
                </div>
                <div class="flex items-center justify-between bg-[#080f18] p-3 rounded-xl border border-slate-800 text-xs">
                    <span>نغمة التنبيه والرنين</span>
                    <input type="checkbox" id="chk-chime" checked class="w-4 h-4 accent-teal-600">
                </div>
                <div class="bg-[#080f18] p-3 rounded-xl border border-slate-800 space-y-2 text-xs">
                    <div class="flex items-center justify-between">
                        <span class="text-slate-300 font-bold">ربط نموذج ذكاء خارجي (اختياري)</span>
                        <button type="button" onclick="saveExternalAiConfig()" class="text-[11px] bg-slate-800 hover:bg-slate-700 border border-slate-700 text-teal-200 px-2.5 py-1 rounded-lg font-bold">حفظ الإعداد</button>
                    </div>
                    <input type="password" id="ai-api-key" placeholder="مفتاح API اختياري (يُحفظ محلياً فقط)" class="w-full bg-[#0f1b29] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono">
                    <input type="text" id="ai-api-endpoint" placeholder="رابط API اختياري (مثال: .../v1/chat/completions)" class="w-full bg-[#0f1b29] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono">
                </div>
                <div class="grid grid-cols-2 gap-2 pt-1">
                    <button type="button" onclick="readLastIncomingMessageAloud()" class="bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800/60 text-emerald-200 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-volume-high ml-1"></i>قراءة آخر رسالة</button>
                    <button type="button" onclick="aiTransformCurrentDraft('simplify')" class="bg-sky-950/80 hover:bg-sky-900 border border-sky-800/60 text-sky-200 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-wand-magic-sparkles ml-1"></i>تبسيط النص</button>
                    <button type="button" onclick="extractTasksFromThread()" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-list-check ml-1"></i>استخراج مهام</button>
                    <button type="button" onclick="suggestSmartReplies()" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-bolt ml-1"></i>ردود ذكية</button>
                    <button type="button" onclick="craftCustomerContent('promo')" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-teal-200 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-bullhorn ml-1"></i>صياغة رسالة عميل</button>
                    <button type="button" onclick="craftCustomerContent('summary_card')" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-200 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-file-lines ml-1"></i>تقرير متابعة</button>
                </div>
                <div class="flex gap-2">
                    <button type="button" onclick="exportBackup()" class="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-download ml-1"></i>تصدير نسخة</button>
                    <button type="button" onclick="importBackup()" class="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-upload ml-1"></i>استعادة نسخة</button>
                </div>
                <div id="ai-log" class="bg-[#080f18] border border-slate-800 rounded-xl p-3 h-36 overflow-y-auto text-xs space-y-2 custom-scrollbar">
                    <div class="text-slate-400">مرحباً بك في سند AI v8.9.3 — نسخة موحّدة ومطوّرة بالذكاء الاصطناعي مع قراءة صوتية، تلخيص، واستخراج مهام.</div>
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

        function cleanIdValue(val) {
            return toWesternDigits(String(val === undefined || val === null ? '' : val)).trim();
        }

        function formatTimeShort(ts) {
            try {
                var d = ts ? new Date(ts) : new Date();
                var hh = String(d.getHours()).padStart(2, '0');
                var mm = String(d.getMinutes()).padStart(2, '0');
                return toWesternDigits(hh + ':' + mm);
            } catch (e) {
                return '';
            }
        }

        function getExternalAiConfig() {
            var kEl = document.getElementById('ai-api-key');
            var eEl = document.getElementById('ai-api-endpoint');
            var key = kEl ? kEl.value.trim() : '';
            var endpoint = eEl ? eEl.value.trim() : '';
            if (!key || !endpoint) {
                try {
                    var saved = JSON.parse(localStorage.getItem('sanad893_ai_cfg') || localStorage.getItem('sanad891_ai_cfg') || 'null');
                    if (saved && typeof saved === 'object') {
                        if (!key && saved.key) key = String(saved.key).trim();
                        if (!endpoint && saved.endpoint) endpoint = String(saved.endpoint).trim();
                    }
                } catch (e) {}
            }
            return { key: key, endpoint: endpoint };
        }

        function callExternalAi(promptText, systemPrompt) {
            var cfg = getExternalAiConfig();
            if (!cfg.key || !cfg.endpoint || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
                return Promise.resolve(null);
            }
            return fetch(cfg.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + cfg.key
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: systemPrompt || 'أنت مساعد ذكي داخل تطبيق سند AI وتجيب باللغة العربية بوضوح ودقة.' },
                        { role: 'user', content: promptText }
                    ]
                })
            }).then(function(r) {
                if (!r || !r.ok) return null;
                return r.json();
            }).then(function(d) {
                if (d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) {
                    return String(d.choices[0].message.content).trim();
                }
                if (d && typeof d.reply === 'string' && d.reply.trim()) {
                    return d.reply.trim();
                }
                return null;
            }).catch(function() {
                return null;
            });
        }

        function autoResizeComposer(el) {
            if (!el) return;
            el.style.height = 'auto';
            var nextH = Math.min(el.scrollHeight, 128);
            el.style.height = Math.max(nextH, 40) + 'px';
        }

        function openComposerExpand() {
            var inp = document.getElementById('msg-box-input');
            var ta = document.getElementById('expanded-composer-textarea');
            if (!ta) return;
            ta.value = inp ? inp.value : '';
            document.getElementById('composer-expand-modal').classList.remove('hidden');
            ta.focus();
        }

        function closeComposerExpand() {
            syncFromExpandedComposer();
            document.getElementById('composer-expand-modal').classList.add('hidden');
        }

        function syncFromExpandedComposer() {
            var inp = document.getElementById('msg-box-input');
            var ta = document.getElementById('expanded-composer-textarea');
            if (inp && ta) {
                inp.value = ta.value;
                autoResizeComposer(inp);
            }
        }

        function transformTextWithProtocol(rawText, mode) {
            var src = String(rawText || '').replace(/\s+/g, ' ').trim();
            if (!src) return '';
            if (mode === 'simplify') {
                var parts = src.split(/[.!؟،]+/).map(function(s) { return s.trim(); }).filter(Boolean);
                var shortCore = parts.slice(0, 3).join('، ');
                return 'ببساطة: ' + (shortCore.length > 220 ? shortCore.slice(0, 220).trim() + '...' : shortCore);
            }
            if (mode === 'formal') {
                return 'السلام عليكم ورحمة الله وبركاته، نعرض لحضراتكم بكل وضوح وتقدير: ' + src;
            }
            if (mode === 'summarize') {
                var sentences = src.split(/[.!؟]+/).map(function(s) { return s.trim(); }).filter(Boolean);
                return 'ملخص الفكرة: ' + (sentences.slice(0, 2).join(' — ') || src.slice(0, 180));
            }
            return src;
        }

        function applyTransformedTextToUi(transformed) {
            if (!transformed) return;
            var inp = document.getElementById('msg-box-input');
            if (inp) {
                inp.value = transformed;
                autoResizeComposer(inp);
                inp.focus();
            }
            var ta = document.getElementById('expanded-composer-textarea');
            if (ta && !document.getElementById('composer-expand-modal').classList.contains('hidden')) {
                ta.value = transformed;
            }
            speakText(transformed);
        }

        function aiTransformCurrentDraft(mode) {
            var inp = document.getElementById('msg-box-input');
            var sourceText = inp && inp.value.trim() ? inp.value.trim() : '';
            if (!sourceText) {
                var list = (getThreadMap()[currentPeer] || []).filter(function(m) { return !m.deleted && m.kind === 'text' && m.text; });
                var lastMsg = list.length ? list[list.length - 1] : null;
                if (!lastMsg) return alert('اكتب نصاً أو اختر رسالة نصية ليقوم الذكاء الاصطناعي بمعالجتها.');
                sourceText = lastMsg.text;
            }
            var localFallback = transformTextWithProtocol(sourceText, mode);
            callExternalAi(
                'أعد صياغة النص التالي باللغة العربية حسب المطلوب (' + mode + ') بدون مقدمات زائدة:\n' + sourceText,
                'أنت مساعد صياغة عربي دقيق ومختصر.'
            ).then(function(aiRes) {
                applyTransformedTextToUi(aiRes || localFallback);
            });
        }

        function aiTransformExpanded(mode) {
            var ta = document.getElementById('expanded-composer-textarea');
            if (!ta || !ta.value.trim()) return;
            var localFallback = transformTextWithProtocol(ta.value, mode);
            callExternalAi(
                'أعد صياغة النص التالي باللغة العربية حسب النمط (' + mode + ') بوضوح:\n' + ta.value,
                'أنت مساعد صياغة عربي دقيق ومختصر.'
            ).then(function(aiRes) {
                ta.value = aiRes || localFallback;
                syncFromExpandedComposer();
                speakText(ta.value);
            });
        }

        function openAssistedVoiceHub() {
            document.getElementById('assisted-voice-modal').classList.remove('hidden');
        }

        function closeAssistedVoiceHub() {
            document.getElementById('assisted-voice-modal').classList.add('hidden');
        }

        function stopSpeechReading() {
            try {
                if ('speechSynthesis' in window) window.speechSynthesis.cancel();
            } catch (e) {}
        }

        function readLastIncomingMessageAloud() {
            var list = (getThreadMap()[currentPeer] || []).filter(function(m) { return !m.deleted && m.kind === 'text' && m.text; });
            var lastIn = list.slice().reverse().find(function(m) { return m.from === 'them'; }) || list[list.length - 1];
            if (!lastIn || !lastIn.text) return alert('لا توجد رسالة نصية للقراءة الصوتية الآن.');
            closeAssistedVoiceHub();
            speakText(lastIn.text);
        }

        function readWholeThreadAloud() {
            var list = (getThreadMap()[currentPeer] || []).filter(function(m) { return !m.deleted && m.kind === 'text' && m.text; }).slice(-6);
            if (!list.length) return alert('لا توجد رسائل نصية في هذه المحادثة.');
            var fullSpoken = list.map(function(m) {
                return (m.from === 'me' ? 'أنت قلت: ' : ((m.senderName || 'الطرف الآخر') + ' قال: ')) + m.text;
            }).join(' ... ');
            closeAssistedVoiceHub();
            speakText(fullSpoken);
        }

        function readCurrentDraftAloud() {
            var inp = document.getElementById('msg-box-input');
            var txt = inp ? inp.value.trim() : '';
            if (!txt) return alert('لا يوجد نص مكتوب حالياً لقراءته.');
            closeAssistedVoiceHub();
            speakText(txt);
        }

        function toggleLongMsgExpand(msgId) {
            if (!msgId) return;
            if (expandedLongMsgIds.has(msgId)) expandedLongMsgIds.delete(msgId);
            else expandedLongMsgIds.add(msgId);
            renderMsgs();
        }

        function openLongMsgReader(msgId) {
            var item = findMsgByIdInActiveThread(msgId);
            if (!item || item.deleted) return;
            var titleEl = document.getElementById('long-msg-reader-title');
            var bodyEl = document.getElementById('long-msg-reader-body');
            var speakBtn = document.getElementById('long-msg-reader-speak-btn');
            if (titleEl) titleEl.textContent = (item.from === 'me' ? 'رسالتك' : (item.senderName || formatPeerDisplay(currentPeer))) + (item.sentAt ? (' • ' + item.sentAt) : '');
            if (bodyEl) bodyEl.textContent = item.text || '';
            if (speakBtn) {
                speakBtn.onclick = function() { speakText(item.text || ''); };
            }
            document.getElementById('long-msg-reader-modal').classList.remove('hidden');
        }

        function closeLongMsgReader() {
            document.getElementById('long-msg-reader-modal').classList.add('hidden');
        }

        function showCopyToast(labelText) {
            lastCopiedMessageText = labelText || lastCopiedMessageText;
            var el = document.getElementById('copy-toast-banner');
            if (!el) return;
            el.textContent = labelText || 'تم النسخ إلى الحافظة';
            el.classList.remove('hidden');
            if (copyToastTimer) clearTimeout(copyToastTimer);
            copyToastTimer = setTimeout(function() { el.classList.add('hidden'); }, 1800);
        }

        function findMsgByIdInActiveThread(msgId) {
            var list = getThreadMap()[currentPeer] || [];
            return list.find(function(m) { return m.id === msgId; }) || null;
        }

        function getMessageSnippet(item) {
            if (!item) return '';
            if (item.kind === 'audio') return item.text || 'رسالة صوتية';
            if (item.kind === 'image') return item.text || item.fileName || 'صورة';
            if (item.kind === 'file') return item.fileName || item.text || 'ملف مرفق';
            return String(item.text || '').trim();
        }

        function startReplyToMessage(msgId) {
            var item = findMsgByIdInActiveThread(msgId);
            if (!item || item.deleted) return;
            cancelEditMessage();
            var senderLabel = item.from === 'me'
                ? 'أنت'
                : (item.senderName || formatPeerDisplay(currentPeer));
            replyingToMsg = {
                id: item.id,
                senderLabel: senderLabel,
                snippet: getMessageSnippet(item) || 'رسالة'
            };
            renderReplyingBanner();
            var inp = document.getElementById('msg-box-input');
            if (inp) inp.focus();
        }

        function cancelReplyMessage() {
            replyingToMsg = null;
            renderReplyingBanner();
        }

        function renderReplyingBanner() {
            var banner = document.getElementById('replying-msg-banner');
            var lbl = document.getElementById('replying-to-label');
            var snip = document.getElementById('replying-to-snippet');
            if (!banner || !lbl || !snip) return;
            if (replyingToMsg) {
                lbl.textContent = 'رد على ' + replyingToMsg.senderLabel;
                snip.textContent = replyingToMsg.snippet;
                banner.classList.remove('hidden');
            } else {
                banner.classList.add('hidden');
            }
        }

        function scrollToQuotedMessage(msgId) {
            if (!msgId) return;
            var safeId = String(msgId).replace(/[^a-zA-Z0-9_-]/g, '_');
            var el = document.getElementById('msg-item-' + safeId);
            if (!el) return;
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.remove('msg-highlight-pulse');
            void el.offsetWidth;
            el.classList.add('msg-highlight-pulse');
        }

        function openMsgContextMenu(msgId) {
            var item = findMsgByIdInActiveThread(msgId);
            if (!item || item.deleted) return;
            contextMenuMsgId = msgId;
            var editBtn = document.getElementById('ctx-edit-btn');
            var speakBtn = document.getElementById('ctx-speak-btn');
            if (editBtn) editBtn.classList.toggle('hidden', !(item.from === 'me' && item.kind === 'text'));
            if (speakBtn) speakBtn.classList.toggle('hidden', !(item.kind === 'text' && item.text));
            document.getElementById('msg-context-modal').classList.remove('hidden');
        }

        function closeMsgContextMenu() {
            contextMenuMsgId = null;
            document.getElementById('msg-context-modal').classList.add('hidden');
        }

        function ctxReplyAction() {
            var msgId = contextMenuMsgId;
            closeMsgContextMenu();
            if (msgId) startReplyToMessage(msgId);
        }

        function ctxCopyAction() {
            var msgId = contextMenuMsgId;
            closeMsgContextMenu();
            var item = findMsgByIdInActiveThread(msgId);
            if (!item) return;
            var txt = String(item.text || item.fileName || '').trim();
            if (!txt) return;
            lastCopiedMessageText = txt;
            copyStringToClipboard(txt);
            showCopyToast('تم النسخ');
        }

        function ctxPasteAction() {
            var msgId = contextMenuMsgId;
            closeMsgContextMenu();
            var item = findMsgByIdInActiveThread(msgId);
            var txt = item ? String(item.text || item.fileName || '').trim() : lastCopiedMessageText;
            if (!txt) return;
            lastCopiedMessageText = txt;
            var inp = document.getElementById('msg-box-input');
            if (!inp) return;
            inp.value = inp.value ? (inp.value + ' ' + txt) : txt;
            autoResizeComposer(inp);
            inp.focus();
            showCopyToast('تم اللصق في حقل الإرسال');
        }

        function ctxEditAction() {
            var msgId = contextMenuMsgId;
            closeMsgContextMenu();
            var item = findMsgByIdInActiveThread(msgId);
            if (!item || item.from !== 'me' || item.kind !== 'text') return;
            cancelReplyMessage();
            editingMsgId = item.id;
            var banner = document.getElementById('editing-msg-banner');
            if (banner) banner.classList.remove('hidden');
            var inp = document.getElementById('msg-box-input');
            if (inp) {
                inp.value = item.text || '';
                autoResizeComposer(inp);
                inp.focus();
            }
        }

        function cancelEditMessage() {
            editingMsgId = null;
            var banner = document.getElementById('editing-msg-banner');
            if (banner) banner.classList.add('hidden');
            var inp = document.getElementById('msg-box-input');
            if (inp) {
                inp.value = '';
                autoResizeComposer(inp);
            }
        }

        function ctxPinAction() {
            var msgId = contextMenuMsgId;
            closeMsgContextMenu();
            if (msgId) pinThreadMsg(msgId);
        }

        function ctxSpeakAction() {
            var msgId = contextMenuMsgId;
            closeMsgContextMenu();
            var item = findMsgByIdInActiveThread(msgId);
            if (item && item.text) speakText(item.text);
        }

        function ctxDeleteAction() {
            var msgId = contextMenuMsgId;
            closeMsgContextMenu();
            var item = findMsgByIdInActiveThread(msgId);
            if (!item) return;
            openDeleteModal(item.id, item.from === 'me');
        }

        function pasteIntoComposer() {
            var inp = document.getElementById('msg-box-input');
            if (!inp) return;
            if (navigator.clipboard && navigator.clipboard.readText) {
                navigator.clipboard.readText().then(function(clipTxt) {
                    var finalTxt = (clipTxt && clipTxt.trim()) ? clipTxt.trim() : lastCopiedMessageText;
                    if (!finalTxt) return alert('لا يوجد نص منسوخ للصقه.');
                    lastCopiedMessageText = finalTxt;
                    inp.value = inp.value ? (inp.value + ' ' + finalTxt) : finalTxt;
                    autoResizeComposer(inp);
                    inp.focus();
                    showCopyToast('تم اللصق');
                }).catch(function() {
                    if (!lastCopiedMessageText) return alert('الصق النص مباشرة في حقل الكتابة أو اضغط مطولاً على رسالة ثم اختر لصق.');
                    inp.value = inp.value ? (inp.value + ' ' + lastCopiedMessageText) : lastCopiedMessageText;
                    autoResizeComposer(inp);
                    inp.focus();
                    showCopyToast('تم اللصق');
                });
            } else if (lastCopiedMessageText) {
                inp.value = inp.value ? (inp.value + ' ' + lastCopiedMessageText) : lastCopiedMessageText;
                autoResizeComposer(inp);
                inp.focus();
                showCopyToast('تم اللصق');
            }
        }

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
            try {
                if (navigator.setAppBadge) {
                    if (totalAll > 0) navigator.setAppBadge(totalAll).catch(function() {});
                    else if (navigator.clearAppBadge) navigator.clearAppBadge().catch(function() {});
                }
            } catch (e) {}
        }

        function updateOfflineNetworkUI(isOfflineNow) {
            var banner = document.getElementById('offline-banner');
            if (banner) banner.classList.toggle('hidden', !isOfflineNow);
            if (isOfflineNow) {
                setHeaderStatus('بدون نت (محلي)', false);
            }
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
                var callInp = document.getElementById('call-input');
                if (callInp && !callInp.value.trim() && currentPeer && currentPeer !== DEFAULT_PEER && !findGroupById(currentPeer)) {
                    var foundPeer = contacts.find(function(c) { return normalizeStr(c.id) === normalizeStr(currentPeer); });
                    callInp.value = foundPeer ? (foundPeer.name + ' • ' + foundPeer.id) : currentPeer;
                }
                onCallDialInput();
                renderGroupCallSelector();
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
            var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            var eff = (conn && conn.effectiveType) ? toWesternDigits(String(conn.effectiveType)).toUpperCase() : '';
            if (chk && chk.checked) {
                badge.textContent = eff ? ('توفير • ' + eff) : 'توفير ذكي';
                badge.className = 'text-[10px] bg-slate-800 text-slate-200 border border-slate-700/80 px-2 py-0.5 rounded-full font-bold';
            } else {
                badge.textContent = eff ? ('سريع • ' + eff) : 'أداء سريع';
                badge.className = 'text-[10px] bg-teal-950/70 text-teal-200 border border-teal-800/50 px-2 py-0.5 rounded-full font-bold';
            }
        }

        function loadSavedState() {
            try {
                var savedActive = localStorage.getItem('sanad893_active') || localStorage.getItem('sanad891_active') || localStorage.getItem('sanad89_active') || localStorage.getItem('sanad88_active');
                var savedAccts = JSON.parse(localStorage.getItem('sanad893_accts') || localStorage.getItem('sanad891_accts') || localStorage.getItem('sanad89_accts') || 'null');
                var savedContacts = JSON.parse(localStorage.getItem('sanad893_contacts') || localStorage.getItem('sanad891_contacts') || localStorage.getItem('sanad89_contacts') || 'null');
                var savedThreads = JSON.parse(localStorage.getItem('sanad893_threads') || localStorage.getItem('sanad891_threads') || localStorage.getItem('sanad89_threads') || 'null');
                var savedGroups = JSON.parse(localStorage.getItem('sanad893_groups') || localStorage.getItem('sanad891_groups') || localStorage.getItem('sanad89_groups') || 'null');
                var savedPins = JSON.parse(localStorage.getItem('sanad893_pins') || localStorage.getItem('sanad891_pins') || localStorage.getItem('sanad89_pins') || 'null');
                var savedUnread = JSON.parse(localStorage.getItem('sanad893_unread') || localStorage.getItem('sanad891_unread') || localStorage.getItem('sanad89_unread') || 'null');
                var savedOutbox = JSON.parse(localStorage.getItem('sanad893_outbox') || localStorage.getItem('sanad891_outbox') || localStorage.getItem('sanad89_outbox') || 'null');

                if (savedActive && cleanIdValue(savedActive) !== '88888888') {
                    activeAcct = cleanIdValue(savedActive);
                }
                if (Array.isArray(savedAccts) && savedAccts.length) {
                    myAccts = savedAccts.map(cleanIdValue).filter(function(x) { return x && x !== '88888888'; });
                    if (!myAccts.length) myAccts = [activeAcct];
                }
                if (myAccts.indexOf(activeAcct) === -1) myAccts.unshift(activeAcct);

                if (Array.isArray(savedContacts) && savedContacts.length) {
                    contacts = savedContacts.map(function(c) {
                        if (!c || typeof c !== 'object') return null;
                        var cid = cleanIdValue(c.id);
                        if (!cid || cid === '88888888') return { name: DEFAULT_PEER, id: DEFAULT_PEER };
                        return { name: String(c.name || cid || ''), id: cid };
                    }).filter(function(c) { return c && c.id; });
                }
                if (!contacts.some(function(c) { return c.id === DEFAULT_PEER; })) {
                    contacts.unshift({ name: DEFAULT_PEER, id: DEFAULT_PEER });
                }

                if (savedThreads && typeof savedThreads === 'object') {
                    var normalizedThreads = {};
                    Object.keys(savedThreads).forEach(function(acctKey) {
                        var normAcctKey = cleanIdValue(acctKey);
                        if (!normalizedThreads[normAcctKey]) normalizedThreads[normAcctKey] = {};
                        var peerMap = savedThreads[acctKey];
                        if (peerMap && typeof peerMap === 'object') {
                            Object.keys(peerMap).forEach(function(peerKey) {
                                var normPeerKey = peerKey === DEFAULT_PEER ? DEFAULT_PEER : cleanIdValue(peerKey);
                                normalizedThreads[normAcctKey][normPeerKey] = peerMap[peerKey];
                            });
                        }
                    });
                    acctThreads = normalizedThreads;
                }

                if (Array.isArray(savedGroups)) {
                    sanadGroups = savedGroups.map(function(g) {
                        if (!g || typeof g !== 'object') return null;
                        return Object.assign({}, g, {
                            id: cleanIdValue(g.id),
                            members: Array.isArray(g.members) ? g.members.map(cleanIdValue).filter(Boolean) : []
                        });
                    }).filter(Boolean);
                }

                if (savedPins && typeof savedPins === 'object') {
                    var normPins = {};
                    Object.keys(savedPins).forEach(function(k) {
                        var nk = k === DEFAULT_PEER ? DEFAULT_PEER : cleanIdValue(k);
                        normPins[nk] = savedPins[k];
                    });
                    pinnedByThread = normPins;
                }

                if (savedUnread && typeof savedUnread === 'object') unreadByThread = savedUnread;
                if (Array.isArray(savedOutbox)) outboxQueue = savedOutbox;

                var aiCfg = JSON.parse(localStorage.getItem('sanad893_ai_cfg') || localStorage.getItem('sanad891_ai_cfg') || 'null');
                if (aiCfg && typeof aiCfg === 'object') {
                    var kEl = document.getElementById('ai-api-key');
                    var eEl = document.getElementById('ai-api-endpoint');
                    if (kEl && aiCfg.key) kEl.value = aiCfg.key;
                    if (eEl && aiCfg.endpoint) eEl.value = aiCfg.endpoint;
                }
            } catch (e) {}
        }

        function persistState() {
            try {
                localStorage.setItem('sanad893_active', activeAcct);
                localStorage.setItem('sanad893_accts', JSON.stringify(myAccts));
                localStorage.setItem('sanad893_contacts', JSON.stringify(contacts));
                localStorage.setItem('sanad893_threads', JSON.stringify(acctThreads));
                localStorage.setItem('sanad893_groups', JSON.stringify(sanadGroups));
                localStorage.setItem('sanad893_pins', JSON.stringify(pinnedByThread));
                localStorage.setItem('sanad893_unread', JSON.stringify(unreadByThread));
                localStorage.setItem('sanad893_outbox', JSON.stringify(outboxQueue));
            } catch (e) {}
        }

        function saveExternalAiConfig() {
            var kEl = document.getElementById('ai-api-key');
            var eEl = document.getElementById('ai-api-endpoint');
            try {
                localStorage.setItem('sanad893_ai_cfg', JSON.stringify({
                    key: kEl ? kEl.value.trim() : '',
                    endpoint: eEl ? eEl.value.trim() : ''
                }));
                alert('تم حفظ إعدادات الذكاء الاصطناعي محلياً على جهازك.');
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

        function normalizeStr(v) { return toWesternDigits(v).trim().toLowerCase(); }

        function findGroupById(id) {
            return sanadGroups.find(function(g) { return normalizeStr(g.id) === normalizeStr(id); }) || null;
        }

        function resolveContactByQuery(rawQuery) {
            var q = normalizeStr(rawQuery);
            if (!q) return null;
            var grp = findGroupById(rawQuery);
            if (grp) return { id: grp.id, name: grp.name, isGroup: true };
            var exact = contacts.find(function(c) {
                return normalizeStr(c.id) === q || normalizeStr(c.name) === q;
            });
            if (exact) return exact;
            return contacts.find(function(c) {
                return normalizeStr(c.name).indexOf(q) !== -1 || normalizeStr(c.id).indexOf(q) !== -1;
            }) || null;
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

        function scanNumbersForSanad() {
            var sample = contacts.filter(function(c) { return c.id !== DEFAULT_PEER; }).map(function(c) { return c.id; }).join(', ');
            var raw = prompt('ألصق أرقاماً أو معرّفات (مفصولة بفاصلة أو سطر) لفحص المشتركين/المتصلين:', sample);
            if (raw === null) return;
            var tokens = toWesternDigits(raw).split(/[\s,،\n]+/).map(function(x) { return x.trim(); }).filter(Boolean);
            if (!tokens.length) return alert('لم يتم إدخال أي أرقام للفحص.');
            var matchedOnline = [];
            tokens.forEach(function(num) {
                var cleanNum = cleanIdValue(num);
                var found = contacts.find(function(c) { return normalizeStr(c.id) === normalizeStr(cleanNum); });
                if (!found) upsertContact('رقم ' + cleanNum, cleanNum);
                if (isPeerOnline(cleanNum)) matchedOnline.push(cleanNum);
            });
            renderPresence();
            alert('تم فحص ' + tokens.length + ' رقم. المتصلون حالياً: ' + (matchedOnline.length ? matchedOnline.join(', ') : 'لا يوجد متصلون الآن، وتم حفظ الأرقام في الجهات.'));
        }

        function copyStringToClipboard(txt) {
            var western = toWesternDigits(txt);
            if (!western) return;
            lastCopiedMessageText = western;
            if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(western).catch(function() {});
            showCopyToast('تم النسخ إلى الحافظة');
        }

        function getThreadMap() {
            if (!acctThreads[activeAcct]) acctThreads[activeAcct] = {};
            if (!acctThreads[activeAcct][DEFAULT_PEER]) {
                acctThreads[activeAcct][DEFAULT_PEER] = [
                    { id: 'init-' + activeAcct, from: 'them', kind: 'text', text: 'مرحباً بك في سند AI v8.9.3، كيف نقدر نخدمك اليوم؟', sentAt: formatTimeShort() }
                ];
            }
            return acctThreads[activeAcct];
        }

        function findMatchingThreadKey(threadMap, candidateId) {
            if (!threadMap || !candidateId) return null;
            var target = normalizeStr(candidateId);
            return Object.keys(threadMap).find(function(k) { return normalizeStr(k) === target; }) || null;
        }

        function ensureThreadEntry(ownerAcct, peerKey) {
            var cleanOwner = cleanIdValue(ownerAcct || activeAcct) || activeAcct;
            var cleanPeer = cleanIdValue(peerKey) || DEFAULT_PEER;
            if (!acctThreads[cleanOwner]) acctThreads[cleanOwner] = {};
            var existingKey = findMatchingThreadKey(acctThreads[cleanOwner], cleanPeer);
            var finalKey = existingKey || cleanPeer;
            if (!acctThreads[cleanOwner][finalKey]) acctThreads[cleanOwner][finalKey] = [];
            return { owner: cleanOwner, key: finalKey, list: acctThreads[cleanOwner][finalKey] };
        }

        function toggleGroupMemberPick(id) {
            var clean = cleanIdValue(id);
            if (selectedGroupMembers.has(clean)) selectedGroupMembers.delete(clean);
            else selectedGroupMembers.add(clean);
            renderGroupMemberPicker();
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
                return '<button type="button" onclick="toggleGroupMemberPick(\'' + escapeJsSingle(c.id) + '\')" class="px-2.5 py-1 rounded-lg border text-[11px] font-bold ' +
                    (picked ? 'bg-teal-950/80 border-teal-700/70 text-teal-100' : 'bg-[#080f18] border-slate-800 text-slate-300') + '">' +
                    (picked ? '✓ ' : '') + escapeHtml(c.name) + ' <span class="font-mono text-[10px]">(' + escapeHtml(c.id) + ')</span></button>';
            }).join('');
        }

        function createSanadGroup() {
            var nameInp = document.getElementById('g-name');
            var extraInp = document.getElementById('g-members');
            var gName = nameInp ? nameInp.value.trim() : '';
            if (!gName) return alert('أدخل اسم المجموعة أولاً.');
            var extraTokens = toWesternDigits(extraInp ? extraInp.value : '').split(/[\s,،\n]+/).map(cleanIdValue).filter(Boolean);
            var membersSet = new Set([activeAcct]);
            myAccts.forEach(function(a) { if (cleanIdValue(a)) membersSet.add(cleanIdValue(a)); });
            selectedGroupMembers.forEach(function(m) { membersSet.add(cleanIdValue(m)); });
            extraTokens.forEach(function(m) { membersSet.add(cleanIdValue(m)); });
            var grpId = 'grp-' + Math.floor(100000 + Math.random() * 900000);
            var grpObj = { id: grpId, name: gName, members: Array.from(membersSet), createdBy: activeAcct };
            sanadGroups.unshift(grpObj);
            if (nameInp) nameInp.value = '';
            if (extraInp) extraInp.value = '';
            selectedGroupMembers.clear();
            var map = getThreadMap();
            map[grpId] = [{ id: 'g-init-' + grpId, from: 'them', senderName: '@سند', kind: 'text', text: 'تم إنشاء مجموعة «' + gName + '». يمكنك التحدث هنا أو كتابة @سند لأي مساعدة فورية.', sentAt: formatTimeShort() }];
            persistAndDraw();
            choosePeer(grpId);
        }

        function addMemberToGroup(groupId) {
            var grp = findGroupById(groupId);
            if (!grp) return;
            var safeDomId = String(groupId).replace(/[^a-zA-Z0-9_-]/g, '_');
            var inp = document.getElementById('add-member-input-' + safeDomId);
            var rawVal = inp ? inp.value.trim() : '';
            if (!rawVal) return alert('اكتب رقم أو معرّف العضو الجديد أولاً.');
            var resolved = resolveContactByQuery(rawVal);
            var memberId = cleanIdValue(resolved ? resolved.id : rawVal);
            if (!memberId) return;
            if (!Array.isArray(grp.members)) grp.members = [activeAcct];
            var exists = grp.members.some(function(m) { return normalizeStr(m) === normalizeStr(memberId); });
            if (exists) {
                if (inp) inp.value = '';
                return alert('هذا العضو موجود مسبقاً في المجموعة.');
            }
            grp.members.push(memberId);
            if (inp) inp.value = '';
            var map = getThreadMap();
            if (!map[grp.id]) map[grp.id] = [];
            map[grp.id].push({
                id: 'g-add-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
                from: 'them',
                senderName: '@سند',
                kind: 'text',
                text: 'تمت إضافة «' + (resolved && !resolved.isGroup ? resolved.name : memberId) + '» إلى المجموعة.',
                sentAt: formatTimeShort()
            });
            persistAndDraw();
        }

        function renderGroupsList() {
            var badge = document.getElementById('groups-count-badge');
            if (badge) badge.textContent = toWesternDigits(sanadGroups.length) + (sanadGroups.length === 1 ? ' مجموعة' : ' مجموعات');
            renderGroupMemberPicker();
            var box = document.getElementById('groups-list');
            if (!box) return;
            if (!sanadGroups.length) {
                box.innerHTML = '<div class="text-center text-xs text-slate-500 py-6">لا توجد مجموعات بعد. أنشئ أول مجموعة لك بالأعلى.</div>';
                return;
            }
            box.innerHTML = sanadGroups.map(function(g) {
                var membersList = Array.isArray(g.members) ? g.members : [];
                var mCount = membersList.length || 1;
                var unreadCnt = getUnreadCountForPeer(g.id);
                var safeDomId = String(g.id).replace(/[^a-zA-Z0-9_-]/g, '_');
                var membersPreview = membersList.map(function(m) {
                    var found = contacts.find(function(c) { return normalizeStr(c.id) === normalizeStr(m); });
                    return found ? (found.name + ' (' + found.id + ')') : m;
                }).join(' • ');
                return '<div class="bg-[#0f1b29] border border-slate-800 p-3.5 rounded-xl space-y-2.5">' +
                    '<div class="flex justify-between items-center gap-2">' +
                    '<div class="min-w-0 flex items-center gap-2"><p class="text-xs font-black text-white truncate"><i class="fa-solid fa-users text-teal-300 ml-1"></i>' + escapeHtml(g.name) + '</p>' +
                    (unreadCnt > 0 ? '<span class="px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-mono font-bold">' + toWesternDigits(unreadCnt) + '</span>' : '') +
                    '</div>' +
                    '<div class="flex items-center gap-1.5 shrink-0">' +
                    '<button type="button" onclick="launchGroupCall(\'audio\', \'' + escapeJsSingle(g.id) + '\')" title="مكالمة جماعية للمجموعة" class="bg-emerald-800 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold"><i class="fa-solid fa-phone"></i></button>' +
                    '<button type="button" onclick="choosePeer(\'' + escapeJsSingle(g.id) + '\')" class="bg-[#164e63] hover:bg-[#1e6078] text-white px-3 py-1.5 rounded-lg text-xs font-bold">دخول المجموعة</button></div></div>' +
                    '<p class="text-[11px] font-mono text-slate-400 truncate">' + escapeHtml(g.id) + ' • ' + toWesternDigits(mCount) + ' أعضاء</p>' +
                    (membersPreview ? '<p class="text-[10px] text-slate-400 truncate">الأعضاء: ' + escapeHtml(membersPreview) + '</p>' : '') +
                    '<div class="flex gap-2 pt-1">' +
                    '<input type="text" id="add-member-input-' + escapeHtml(safeDomId) + '" oninput="normalizeDigitsInInput(this)" onkeydown="if(event.key===\'Enter\'){event.preventDefault();addMemberToGroup(\'' + escapeJsSingle(g.id) + '\');}" placeholder="رقم أو معرّف عضو جديد..." class="flex-1 bg-[#080f18] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono">' +
                    '<button type="button" onclick="addMemberToGroup(\'' + escapeJsSingle(g.id) + '\')" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-teal-200 px-3 py-1.5 rounded-lg text-xs font-bold shrink-0">+ إضافة عضو</button>' +
                    '</div></div>';
            }).join('');
        }

        function playTonePattern(freqs, durationSec) {
            var chk = document.getElementById('chk-chime');
            if (chk && !chk.checked) return;
            try {
                var Ctx = window.AudioContext || window.webkitAudioContext;
                var ctx = new Ctx();
                freqs.forEach(function(f, idx) {
                    var osc = ctx.createOscillator();
                    var gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(f, ctx.currentTime + idx * durationSec);
                    gain.gain.setValueAtTime(0.06, ctx.currentTime + idx * durationSec);
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
            playTonePattern([587, 784, 587, 784], 0.16);
            ringtoneTimer = setInterval(function() { playTonePattern([587, 784, 587, 784], 0.16); }, 2200);
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
            var el = document.getElementById('call-timer-el');
            if (el) el.textContent = '00:00';
            callDurationTimer = setInterval(function() {
                callSeconds += 1;
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
            var matched = contacts.find(function(c) { return normalizeStr(c.id) === normalizeStr(cleanSender); });
            var label = matched ? (matched.name + ' • ' + cleanSender) : cleanSender;
            toastPeerId = cleanSender;
            document.getElementById('toast-sender').textContent = 'رسالة من: ' + label;
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

        function buildSmartAutoReply(incomingText) {
            var qTxt = String(incomingText || '').trim();
            if (/سعر|اسعار|أسعار|باقة|باقات|عرض|عروض|تكلفة|كم/i.test(qTxt)) {
                return 'أهلاً بك، يسعدنا تزويدك بتفاصيل العروض والباقات؛ اكتب لنا نوع الخدمة أو الباقة المطلوبة وسنرسل لك التفاصيل فوراً.';
            }
            if (/موعد|مواعيد|متى|حجز|وقت/i.test(qTxt)) {
                return 'تم استلام طلب الموعد عبر سند AI، وسنؤكد لك الوقت الأنسب خلال لحظات.';
            }
            if (/شكرا|شكراً|يعطيك|مشكور|تسلم/i.test(qTxt)) {
                return 'العفو، نسعد بخدمتك دائماً على سند AI.';
            }
            if (/مشكلة|عطل|لا يعمل|مساعدة|دعم/i.test(qTxt)) {
                return 'نحن هنا لمساعدتك؛ وضح لنا تفاصيل المشكلة بإيجاز وسنقدم لك الحل أو الخطوة التالية بسرعة.';
            }
            return 'أهلاً بك، تم استلام رسالتك عبر سند AI v8.9.3 وسنوافيك بالرد المناسب بأسرع وقت.';
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
                var sender = cleanIdValue(msg.from || '');
                if (!sender) return;
                var isForMe = !msg.to || myAccts.some(function(a) { return normalizeStr(a) === normalizeStr(msg.to); });
                var recipient = isForMe ? activeAcct : cleanIdValue(msg.to || activeAcct);
                if (!isForMe && normalizeStr(sender) !== normalizeStr(currentPeer)) return;

                var threadObj = ensureThreadEntry(recipient, sender);
                var exists = threadObj.list.some(function(m) { return m.id === msg.msgId; });
                if (!exists) {
                    var senderContact = contacts.find(function(c) { return normalizeStr(c.id) === normalizeStr(sender); });
                    threadObj.list.push({
                        id: msg.msgId || ('m-' + Date.now()),
                        from: 'them',
                        senderName: msg.senderName || (senderContact ? senderContact.name : sender),
                        kind: msg.kind || 'text',
                        text: msg.text || '',
                        mediaUrl: msg.mediaUrl || null,
                        fileName: msg.fileName || '',
                        replyTo: msg.replyTo || null,
                        sentAt: msg.sentAt || formatTimeShort()
                    });
                }
                sendSignalingOrMsg({ type: 'msg_delivered', to: sender, from: recipient, msgId: msg.msgId });
                var isActivelyViewing = (activePane === 'chats' && normalizeStr(currentPeer) === normalizeStr(sender) && !document.hidden);
                if (isActivelyViewing) {
                    sendReadReceiptIfViewing(sender, msg.msgId);
                } else {
                    incrementUnreadForPeer(recipient, sender);
                    showLiveToast(sender, msg.kind === 'audio' ? 'رسالة صوتية' : (msg.text || 'مرفق'));
                }
                playSoftChime();
                persistAndDraw();
                var autoChk = document.getElementById('chk-autoreply');
                if (autoChk && autoChk.checked && msg.kind === 'text' && normalizeStr(sender) !== normalizeStr(recipient)) {
                    var smartAuto = buildSmartAutoReply(msg.text || '');
                    emitPacket(sender, 'text', smartAuto, null, '', null, recipient);
                }
            } else if (msg.type === 'msg_edit') {
                var ownerEd = cleanIdValue(msg.to || activeAcct) || activeAcct;
                var fromPeerEd = cleanIdValue(msg.from || '');
                if (acctThreads[ownerEd] && acctThreads[ownerEd][fromPeerEd]) {
                    acctThreads[ownerEd][fromPeerEd] = acctThreads[ownerEd][fromPeerEd].map(function(m) {
                        if (m.id !== msg.msgId) return m;
                        return Object.assign({}, m, { text: msg.text || m.text, edited: true, editedAt: msg.editedAt || formatTimeShort() });
                    });
                    persistAndDraw();
                }
            } else if (msg.type === 'msg_delivered') {
                var ownerDel = cleanIdValue(msg.to || activeAcct) || activeAcct;
                var fromPeerDel = cleanIdValue(msg.from || '');
                if (acctThreads[ownerDel] && acctThreads[ownerDel][fromPeerDel]) {
                    acctThreads[ownerDel][fromPeerDel] = acctThreads[ownerDel][fromPeerDel].map(function(m) {
                        if (m.id !== msg.msgId) return m;
                        return Object.assign({}, m, { delivered: true, status: m.status === 'read' ? 'read' : 'delivered' });
                    });
                    persistAndDraw();
                }
            } else if (msg.type === 'msg_read') {
                var ownerRead = cleanIdValue(msg.to || activeAcct) || activeAcct;
                var fromPeerRead = cleanIdValue(msg.from || '');
                if (acctThreads[ownerRead] && acctThreads[ownerRead][fromPeerRead]) {
                    acctThreads[ownerRead][fromPeerRead] = acctThreads[ownerRead][fromPeerRead].map(function(m) {
                        if (m.id !== msg.msgId) return m;
                        return Object.assign({}, m, { delivered: true, read: true, status: 'read' });
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
                    var alreadyQueued = outboxQueue.some(function(x) { return x && x.msgId === payload.msgId; });
                    if (!alreadyQueued) {
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
                if (Array.isArray(data.events)) {
                    data.events.forEach(handleIncomingPayload);
                }
                return data;
            }).catch(function() {
                if (payload && payload.to && payload.type === 'msg') {
                    var existsQ = outboxQueue.some(function(x) { return x && x.msgId === payload.msgId; });
                    if (!existsQ) {
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
            if (activeAcct && normIds.indexOf(cleanIdValue(activeAcct)) === -1) {
                normIds.unshift(cleanIdValue(activeAcct));
            }
            var q = encodeURIComponent(normIds.join(','));
            return fetch('/api/sync?ids=' + q + '&since=' + lastSyncCursor + '&t=' + Date.now(), { cache: 'no-store' }).then(function(res) {
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
                if (Array.isArray(data.events)) {
                    data.events.forEach(handleIncomingPayload);
                }
                return data;
            }).catch(function() {
                return null;
            });
        }

        function syncPresenceNow() {
            if (typeof navigator !== 'undefined' && navigator.onLine === false) {
                updateOfflineNetworkUI(true);
                return;
            }
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
            if (typeof navigator !== 'undefined' && navigator.onLine === false) {
                updateOfflineNetworkUI(true);
                return;
            }
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
        var rtcConfig = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };

        function stopOfferRetryLoop() {
            if (offerRetryTimer) { clearInterval(offerRetryTimer); offerRetryTimer = null; }
        }

        function applyAudioOutputPreference() {
            var targetVol = speakerModeActive ? 1.0 : 0.35;
            var audEl = document.getElementById('remote-audio-el');
            if (audEl) {
                audEl.muted = false;
                audEl.volume = targetVol;
                if (audEl.setSinkId) audEl.setSinkId(speakerModeActive ? 'default' : '').catch(function() {});
                audEl.play().catch(function() {});
            }
            var rv = document.getElementById('remote-video-el');
            if (rv && !rv.classList.contains('hidden')) {
                rv.muted = false;
                rv.volume = targetVol;
                rv.play().catch(function() {});
            }
            var iconEl = document.getElementById('speaker-toggle-icon');
            var lblEl = document.getElementById('speaker-btn-label');
            var hintEl = document.getElementById('call-output-hint');
            if (iconEl) iconEl.className = speakerModeActive ? 'fa-solid fa-volume-high' : 'fa-solid fa-ear-listen';
            if (lblEl) lblEl.textContent = speakerModeActive ? 'مكبر' : 'سماعة';
            if (hintEl) hintEl.textContent = speakerModeActive ? 'مخرج الصوت: مكبر الصوت' : 'مخرج الصوت: سماعة الجهاز';
        }

        function toggleSpeakerOrEarpiece() { speakerModeActive = !speakerModeActive; applyAudioOutputPreference(); }

        function forceUnmuteAudio() {
            if (remoteStreamObj) {
                var audEl = document.getElementById('remote-audio-el');
                if (audEl && audEl.srcObject !== remoteStreamObj) audEl.srcObject = remoteStreamObj;
            }
            applyAudioOutputPreference();
        }

        function tuneAudioSenderForWeakNet(pc) {
            if (!pc || !pc.getSenders) return;
            var maxAudioBps = isWeakNetworkMode() ? 20000 : 40000;
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

        function toggleGroupCallContact(id) {
            var clean = cleanIdValue(id);
            if (selectedGroupCallPeers.has(clean)) selectedGroupCallPeers.delete(clean);
            else selectedGroupCallPeers.add(clean);
            renderGroupCallSelector();
        }

        function applyGroupCallPreset(groupId) {
            var grp = findGroupById(groupId);
            if (!grp || !Array.isArray(grp.members)) return;
            selectedGroupCallPeers.clear();
            grp.members.forEach(function(m) {
                var cm = cleanIdValue(m);
                if (cm && normalizeStr(cm) !== normalizeStr(activeAcct)) selectedGroupCallPeers.add(cm);
            });
            renderGroupCallSelector();
        }

        function renderGroupCallSelector() {
            var badge = document.getElementById('group-call-selected-badge');
            if (badge) badge.textContent = toWesternDigits(selectedGroupCallPeers.size) + ' مشارك';
            var presetsEl = document.getElementById('group-call-presets');
            if (presetsEl) {
                presetsEl.innerHTML = sanadGroups.map(function(g) {
                    return '<button type="button" onclick="applyGroupCallPreset(\'' + escapeJsSingle(g.id) + '\')" class="bg-teal-950/70 hover:bg-teal-900 border border-teal-800/60 text-teal-200 px-2.5 py-1 rounded-lg text-[11px] font-bold"><i class="fa-solid fa-users ml-1"></i>' + escapeHtml(g.name) + '</button>';
                }).join('');
            }
            var pickerEl = document.getElementById('group-call-contact-picker');
            if (pickerEl) {
                var list = contacts.filter(function(c) { return c.id !== DEFAULT_PEER; });
                if (!list.length) {
                    pickerEl.innerHTML = '<span class="text-[11px] text-slate-500">أضف جهات اتصال لاختيار مشاركين في المكالمة الجماعية.</span>';
                    return;
                }
                pickerEl.innerHTML = list.map(function(c) {
                    var active = selectedGroupCallPeers.has(c.id);
                    return '<button type="button" onclick="toggleGroupCallContact(\'' + escapeJsSingle(c.id) + '\')" class="px-2.5 py-1 rounded-lg border text-[11px] font-bold ' +
                        (active ? 'bg-[#164e63] border-teal-500 text-white' : 'bg-[#080f18] border-slate-800 text-slate-300') + '">' +
                        (active ? '✓ ' : '') + escapeHtml(c.name) + ' <span class="font-mono text-[10px]">(' + escapeHtml(c.id) + ')</span></button>';
                }).join('');
            }
        }

        function renderGroupCallParticipantsBar(targets, mode) {
            var bar = document.getElementById('call-participants-bar');
            if (!bar) return;
            if (!isGroupCallActive || !Array.isArray(targets) || !targets.length) {
                bar.classList.add('hidden');
                bar.innerHTML = '';
                return;
            }
            bar.classList.remove('hidden');
            bar.innerHTML = targets.map(function(t) {
                var c = contacts.find(function(x) { return normalizeStr(x.id) === normalizeStr(t); });
                var label = c ? c.name : t;
                return '<span class="px-2 py-0.5 rounded-full bg-teal-950/90 border border-teal-700/70 text-teal-100 text-[10px] font-bold">' +
                    (mode === 'video' ? '<i class="fa-solid fa-video ml-1"></i>' : '<i class="fa-solid fa-phone ml-1"></i>') +
                    escapeHtml(label) + '</span>';
            }).join('');
        }

        function buildMediaConstraints(mode, facing) {
            var weak = isWeakNetworkMode();
            var audioConfig = weak
                ? { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 16000, channelCount: 1 }
                : { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 };
            if (mode !== 'video') return { audio: audioConfig, video: false };
            var videoConfig = weak
                ? { facingMode: facing || facingModeCurrent, width: { ideal: 320, max: 480 }, height: { ideal: 240, max: 360 }, frameRate: { ideal: 15, max: 20 } }
                : { facingMode: facing || facingModeCurrent, width: { ideal: 640, max: 1280 }, height: { ideal: 480, max: 720 }, frameRate: { ideal: 24, max: 30 } };
            return { audio: audioConfig, video: videoConfig };
        }

        function createPeerConnection(targetPeer, mode) {
            var pc = new RTCPeerConnection(rtcConfig);
            if (localStreamObj) {
                localStreamObj.getTracks().forEach(function(track) { pc.addTrack(track, localStreamObj); });
            }
            tuneAudioSenderForWeakNet(pc);
            pc.ontrack = function(ev) {
                var stream = (ev.streams && ev.streams[0]) || remoteStreamObj || new MediaStream([ev.track]);
                attachRemoteMediaStream(stream, mode);
                document.getElementById('call-status-msg').textContent = 'متصل ومباشر الآن';
            };
            pc.onicecandidate = function(ev) {
                if (ev.candidate) {
                    sendSignalingOrMsg({ type: 'call_sig', to: targetPeer, from: activeAcct, signal: { candidate: ev.candidate } });
                }
            };
            pc.onconnectionstatechange = function() {
                if (pc.connectionState === 'connected') {
                    document.getElementById('call-status-msg').textContent = 'متصل ومباشر الآن';
                    applyAudioOutputPreference();
                }
            };
            return pc;
        }

        function startSingleCallOffer(targetPeer, mode, isGroupMember) {
            var cleanTarget = cleanIdValue(targetPeer);
            if (!cleanTarget || normalizeStr(cleanTarget) === normalizeStr(activeAcct)) return;
            var peerLabel = formatPeerDisplay(cleanTarget);
            if (!isGroupMember) {
                callPeerId = cleanTarget;
                activeCallMode = mode;
                document.getElementById('call-modal').classList.remove('hidden');
                document.getElementById('call-peer-title').textContent = peerLabel;
                document.getElementById('call-status-msg').textContent = 'جاري الاتصال بـ ' + peerLabel + '...';
                document.getElementById('accept-btn').classList.add('hidden');
                var lv = document.getElementById('local-video-el');
                var rv = document.getElementById('remote-video-el');
                var vc = document.getElementById('voice-call-card');
                var swBtn = document.getElementById('switch-cam-btn');
                if (mode === 'video') {
                    lv.classList.remove('hidden');
                    vc.classList.add('hidden');
                    swBtn.classList.remove('hidden');
                    document.getElementById('call-mode-label').textContent = isWeakNetworkMode() ? 'مكالمة فيديو • وضع توفير الشبكة' : 'مكالمة فيديو عالية الوضوح';
                } else {
                    lv.classList.add('hidden');
                    rv.classList.add('hidden');
                    vc.classList.remove('hidden');
                    swBtn.classList.add('hidden');
                    document.getElementById('call-mode-label').textContent = 'مكالمة صوتية مباشرة • أولوية جودة الصوت';
                }
                applyAudioOutputPreference();
                startCallTimer();
            }

            navigator.mediaDevices.getUserMedia(buildMediaConstraints(mode, facingModeCurrent)).then(function(stream) {
                if (!localStreamObj) localStreamObj = stream;
                if (mode === 'video') {
                    var lvEl = document.getElementById('local-video-el');
                    if (lvEl) lvEl.srcObject = localStreamObj;
                }
                if (!isGroupMember) {
                    rtcConn = createPeerConnection(cleanTarget, mode);
                    rtcConn.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: mode === 'video' }).then(function(offer) {
                        return rtcConn.setLocalDescription(offer).then(function() {
                            var sigPayload = { type: 'call_sig', to: cleanTarget, from: activeAcct, mode: mode, signal: { sdp: rtcConn.localDescription } };
                            sendSignalingOrMsg(sigPayload);
                            stopOfferRetryLoop();
                            var retries = 0;
                            offerRetryTimer = setInterval(function() {
                                retries += 1;
                                if (!rtcConn || rtcConn.remoteDescription || retries > 5) { stopOfferRetryLoop(); return; }
                                sendSignalingOrMsg(sigPayload);
                            }, 2500);
                        });
                    });
                } else {
                    sendSignalingOrMsg({
                        type: 'call_sig',
                        to: cleanTarget,
                        from: activeAcct,
                        mode: mode,
                        groupCall: true,
                        participants: activeGroupCallTargets.slice(),
                        signal: { groupInvite: true, mode: mode }
                    });
                }
            }).catch(function(err) {
                var msg = (err && err.name === 'NotAllowedError')
                    ? 'تم رفض إذن الميكروفون/الكاميرا. فعّل الإذن من إعدادات المتصفح أو الجهاز.'
                    : 'تعذر الوصول إلى الميكروفون أو الكاميرا على هذا الجهاز.';
                if (!isGroupMember) {
                    document.getElementById('call-status-msg').textContent = msg;
                    alert(msg);
                    cleanupCallMedia(false);
                }
            });
        }

        function launchCall(mode) {
            if (!currentPeer || currentPeer === DEFAULT_PEER) {
                setPane('calls');
                return alert('اختر جهة اتصال أو اكتب رقماً/معرّفاً لبدء المكالمة.');
            }
            var grp = findGroupById(currentPeer);
            if (grp) {
                launchGroupCall(mode, grp.id);
                return;
            }
            isGroupCallActive = false;
            activeGroupCallTargets = [];
            renderGroupCallParticipantsBar([], mode);
            startSingleCallOffer(currentPeer, mode, false);
        }

        function launchGroupCall(mode, presetGroupId) {
            var targets = [];
            var titleLabel = 'مكالمة جماعية';
            if (presetGroupId) {
                var grp = findGroupById(presetGroupId);
                if (grp && Array.isArray(grp.members)) {
                    titleLabel = 'مجموعة: ' + grp.name;
                    grp.members.forEach(function(m) {
                        var cm = cleanIdValue(m);
                        if (cm && normalizeStr(cm) !== normalizeStr(activeAcct) && targets.indexOf(cm) === -1) targets.push(cm);
                    });
                }
            } else {
                selectedGroupCallPeers.forEach(function(p) {
                    var cp = cleanIdValue(p);
                    if (cp && normalizeStr(cp) !== normalizeStr(activeAcct) && targets.indexOf(cp) === -1) targets.push(cp);
                });
            }
            if (!targets.length) return alert('اختر مشاركين أو مجموعة أولاً لبدء مكالمة جماعية.');
            isGroupCallActive = true;
            activeGroupCallTargets = targets.slice();
            activeCallMode = mode;
            callPeerId = targets[0];
            document.getElementById('call-modal').classList.remove('hidden');
            document.getElementById('call-peer-title').textContent = titleLabel + ' (' + toWesternDigits(targets.length) + ')';
            document.getElementById('call-status-msg').textContent = 'جاري دعوة ' + toWesternDigits(targets.length) + ' مشاركين...';
            document.getElementById('accept-btn').classList.add('hidden');
            document.getElementById('local-video-el').classList.toggle('hidden', mode !== 'video');
            document.getElementById('remote-video-el').classList.add('hidden');
            document.getElementById('voice-call-card').classList.toggle('hidden', mode === 'video');
            document.getElementById('switch-cam-btn').classList.toggle('hidden', mode !== 'video');
            document.getElementById('call-mode-label').textContent = mode === 'video' ? 'مكالمة فيديو جماعية مباشرة' : 'مكالمة صوتية جماعية مباشرة';
            renderGroupCallParticipantsBar(targets, mode);
            applyAudioOutputPreference();
            startCallTimer();
            targets.forEach(function(t) { startSingleCallOffer(t, mode, true); });
            var threadObj = ensureThreadEntry(activeAcct, presetGroupId || currentPeer || targets[0]);
            threadObj.list.push({
                id: 'gcall-' + Date.now(),
                from: 'me',
                kind: 'text',
                text: (mode === 'video' ? 'بدأ مكالمة فيديو جماعية' : 'بدأ مكالمة صوتية جماعية') + ' مع: ' + targets.join('، '),
                sentAt: formatTimeShort()
            });
            persistAndDraw();
        }

        function startDialedCall(mode) {
            var inp = document.getElementById('call-input');
            var raw = inp ? inp.value.trim() : '';
            if (!raw) return alert('اكتب الاسم أو الرقم أو المعرّف أولاً.');
            var resolved = resolveContactByQuery(raw);
            if (resolved && resolved.isGroup) {
                launchGroupCall(mode, resolved.id);
                return;
            }
            var targetId = cleanIdValue(resolved ? resolved.id : raw);
            if (!targetId) return;
            isGroupCallActive = false;
            activeGroupCallTargets = [];
            renderGroupCallParticipantsBar([], mode);
            startSingleCallOffer(targetId, mode, false);
        }

        function onCallSignal(msg) {
            var fromId = cleanIdValue(msg.from || '');
            var sig = msg.signal || {};
            if (sig.hangup) {
                stopOfferRetryLoop();
                stopRingtoneLoop();
                stopCallTimer();
                document.getElementById('call-status-msg').textContent = 'تم إنهاء المكالمة من الطرف الآخر.';
                setTimeout(function() { cleanupCallMedia(false); }, 900);
                return;
            }
            if (sig.sdp && sig.sdp.type === 'offer') {
                if (rtcConn && (rtcConn.signalingState === 'have-local-offer' || rtcConn.connectionState === 'connected')) return;
                pendingCall = { from: fromId, mode: msg.mode || 'audio', offer: sig.sdp };
                callPeerId = fromId;
                activeCallMode = msg.mode || 'audio';
                var callerLabel = formatPeerDisplay(fromId);
                document.getElementById('call-modal').classList.remove('hidden');
                document.getElementById('call-peer-title').textContent = callerLabel;
                document.getElementById('call-status-msg').textContent = (activeCallMode === 'video' ? 'مكالمة فيديو واردة من ' : 'مكالمة صوتية واردة من ') + callerLabel;
                document.getElementById('accept-btn').classList.remove('hidden');
                document.getElementById('voice-call-card').classList.remove('hidden');
                applyAudioOutputPreference();
                startRingtoneLoop();
            } else if (sig.groupInvite) {
                pendingCall = { from: fromId, mode: sig.mode || msg.mode || 'audio', isGroupInvite: true, participants: msg.participants || [] };
                callPeerId = fromId;
                activeCallMode = sig.mode || msg.mode || 'audio';
                document.getElementById('call-modal').classList.remove('hidden');
                document.getElementById('call-peer-title').textContent = 'مكالمة جماعية من ' + formatPeerDisplay(fromId);
                document.getElementById('call-status-msg').textContent = 'دعوة مكالمة جماعية واردة...';
                document.getElementById('accept-btn').classList.remove('hidden');
                startRingtoneLoop();
            } else if (sig.sdp && sig.sdp.type === 'answer' && rtcConn) {
                stopOfferRetryLoop();
                stopRingtoneLoop();
                rtcConn.setRemoteDescription(new RTCSessionDescription(sig.sdp)).then(function() {
                    document.getElementById('call-status-msg').textContent = 'متصل ومباشر الآن';
                    applyAudioOutputPreference();
                    startCallTimer();
                }).catch(function() {});
            } else if (sig.candidate && rtcConn) {
                rtcConn.addIceCandidate(new RTCIceCandidate(sig.candidate)).catch(function() {});
            }
        }

        function answerCall() {
            if (!pendingCall) return;
            stopRingtoneLoop();
            var info = pendingCall;
            pendingCall = null;
            document.getElementById('accept-btn').classList.add('hidden');
            document.getElementById('call-status-msg').textContent = 'جاري فتح الاتصال المباشر...';
            if (info.isGroupInvite) {
                startSingleCallOffer(info.from, info.mode || 'audio', false);
                return;
            }
            navigator.mediaDevices.getUserMedia(buildMediaConstraints(info.mode, facingModeCurrent)).then(function(stream) {
                localStreamObj = stream;
                if (info.mode === 'video') {
                    var lv = document.getElementById('local-video-el');
                    lv.srcObject = stream;
                    lv.classList.remove('hidden');
                    document.getElementById('voice-call-card').classList.add('hidden');
                    document.getElementById('switch-cam-btn').classList.remove('hidden');
                }
                rtcConn = createPeerConnection(info.from, info.mode);
                return rtcConn.setRemoteDescription(new RTCSessionDescription(info.offer)).then(function() {
                    return rtcConn.createAnswer();
                }).then(function(answer) {
                    return rtcConn.setLocalDescription(answer).then(function() {
                        sendSignalingOrMsg({ type: 'call_sig', to: info.from, from: activeAcct, signal: { sdp: rtcConn.localDescription } });
                        document.getElementById('call-status-msg').textContent = 'متصل ومباشر الآن';
                        applyAudioOutputPreference();
                        startCallTimer();
                    });
                });
            }).catch(function() {
                alert('تعذر تشغيل الميكروفون أو الكاميرا للرد على المكالمة.');
                cleanupCallMedia(false);
            });
        }

        function switchCameraFacing() {
            if (!localStreamObj || activeCallMode !== 'video') return;
            facingModeCurrent = facingModeCurrent === 'user' ? 'environment' : 'user';
            navigator.mediaDevices.getUserMedia(buildMediaConstraints('video', facingModeCurrent)).then(function(newStream) {
                var newVideoTrack = newStream.getVideoTracks()[0];
                if (!newVideoTrack) return;
                localStreamObj.getVideoTracks().forEach(function(t) { t.stop(); localStreamObj.removeTrack(t); });
                localStreamObj.addTrack(newVideoTrack);
                document.getElementById('local-video-el').srcObject = localStreamObj;
                if (rtcConn && rtcConn.getSenders) {
                    var sender = rtcConn.getSenders().find(function(s) { return s.track && s.track.kind === 'video'; });
                    if (sender) sender.replaceTrack(newVideoTrack).catch(function() {});
                }
                newStream.getAudioTracks().forEach(function(t) { t.stop(); });
            }).catch(function() {});
        }

        function toggleMuteTrack() {
            if (!localStreamObj) return;
            var tracks = localStreamObj.getAudioTracks();
            if (!tracks.length) return;
            var nextState = !tracks[0].enabled;
            tracks.forEach(function(t) { t.enabled = nextState; });
            var icon = document.getElementById('mute-icon');
            if (icon) icon.className = nextState ? 'fa-solid fa-microphone' : 'fa-solid fa-microphone-slash text-rose-400';
        }

        function cleanupCallMedia(notifyPeer) {
            stopOfferRetryLoop();
            stopRingtoneLoop();
            stopCallTimer();
            if (notifyPeer) {
                if (isGroupCallActive && activeGroupCallTargets.length) {
                    activeGroupCallTargets.forEach(function(t) {
                        sendSignalingOrMsg({ type: 'call_sig', to: t, from: activeAcct, signal: { hangup: true } });
                    });
                } else if (callPeerId) {
                    sendSignalingOrMsg({ type: 'call_sig', to: callPeerId, from: activeAcct, signal: { hangup: true } });
                }
            }
            if (rtcConn) { try { rtcConn.close(); } catch (e) {} rtcConn = null; }
            if (localStreamObj) { localStreamObj.getTracks().forEach(function(t) { t.stop(); }); localStreamObj = null; }
            remoteStreamObj = null;
            pendingCall = null;
            callPeerId = null;
            isGroupCallActive = false;
            activeGroupCallTargets = [];
            renderGroupCallParticipantsBar([], 'audio');
            var audEl = document.getElementById('remote-audio-el');
            if (audEl) audEl.srcObject = null;
            document.getElementById('remote-video-el').classList.add('hidden');
            document.getElementById('local-video-el').classList.add('hidden');
            document.getElementById('call-modal').classList.add('hidden');
        }

        function endActiveCall() { cleanupCallMedia(true); }

        var mediaRec = null;
        var audioChunks = [];
        var isRecordingVoice = false;
        var recSec = 0;
        var recTimerInt = null;

        function toggleVoiceCapture() {
            if (!isRecordingVoice) {
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return alert('المتصفح لا يدعم التسجيل الصوتي.');
                navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
                    audioChunks = [];
                    mediaRec = new MediaRecorder(stream);
                    mediaRec.ondataavailable = function(e) { if (e.data && e.data.size > 0) audioChunks.push(e.data); };
                    mediaRec.onstop = function() {
                        stream.getTracks().forEach(function(t) { t.stop(); });
                        var blob = new Blob(audioChunks, { type: 'audio/webm' });
                        var reader = new FileReader();
                        reader.onload = function() {
                            var durLabel = 'رسالة صوتية (' + toWesternDigits(recSec) + ' ث)';
                            emitPacket(currentPeer, 'audio', durLabel, reader.result, 'voice.webm');
                        };
                        reader.readAsDataURL(blob);
                    };
                    mediaRec.start();
                    isRecordingVoice = true;
                    recSec = 0;
                    document.getElementById('rec-timer').classList.remove('hidden');
                    document.getElementById('rec-timer').textContent = '00:00';
                    document.getElementById('voice-btn').className = 'bg-rose-700 text-white p-2.5 rounded-xl animate-pulse shrink-0';
                    recTimerInt = setInterval(function() {
                        recSec += 1;
                        var m = String(Math.floor(recSec / 60)).padStart(2, '0');
                        var s = String(recSec % 60).padStart(2, '0');
                        document.getElementById('rec-timer').textContent = toWesternDigits(m + ':' + s);
                    }, 1000);
                }).catch(function() { alert('تعذر الوصول إلى الميكروفون للتسجيل الصوتي.'); });
            } else {
                isRecordingVoice = false;
                clearInterval(recTimerInt);
                document.getElementById('rec-timer').classList.add('hidden');
                document.getElementById('voice-btn').className = 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white p-2.5 rounded-xl transition shrink-0';
                if (mediaRec && mediaRec.state !== 'inactive') mediaRec.stop();
            }
        }

        var speechRecObj = null;
        var isDictatingNow = false;

        function toggleSpeechDictation() {
            var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SR) return alert('ميزة تحويل الصوت إلى نص غير مدعومة في هذا المتصفح.');
            if (!isDictatingNow) {
                speechRecObj = new SR();
                speechRecObj.lang = 'ar-SA';
                speechRecObj.interimResults = false;
                speechRecObj.maxAlternatives = 1;
                isDictatingNow = true;
                document.getElementById('dictate-btn').className = 'text-emerald-300 bg-emerald-950/60 p-2 rounded-xl animate-pulse shrink-0';
                speechRecObj.onresult = function(event) {
                    var transcript = event.results[0][0].transcript;
                    var inp = document.getElementById('msg-box-input');
                    inp.value = inp.value ? (inp.value + ' ' + transcript) : transcript;
                    autoResizeComposer(inp);
                };
                speechRecObj.onerror = function() {};
                speechRecObj.onend = function() {
                    isDictatingNow = false;
                    document.getElementById('dictate-btn').className = 'text-emerald-300 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition shrink-0';
                };
                speechRecObj.start();
            } else {
                isDictatingNow = false;
                if (speechRecObj) { try { speechRecObj.stop(); } catch (e) {} }
                document.getElementById('dictate-btn').className = 'text-emerald-300 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition shrink-0';
            }
        }

        function onFilePicked(ev) {
            var file = ev.target.files && ev.target.files[0];
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function() {
                var isImg = file.type && file.type.indexOf('image/') === 0;
                emitPacket(currentPeer, isImg ? 'image' : 'file', file.name, reader.result, file.name);
            };
            reader.readAsDataURL(file);
            ev.target.value = '';
        }

        function formatPeerDisplay(id) {
            if (!id || id === DEFAULT_PEER) return DEFAULT_PEER;
            var grp = findGroupById(id);
            if (grp) return grp.name;
            var c = contacts.find(function(x) { return normalizeStr(x.id) === normalizeStr(id); });
            return c ? (c.name + ' • ' + c.id) : id;
        }

        function renderAccts() {
            var countBadge = document.getElementById('accounts-count-badge');
            if (countBadge) countBadge.textContent = toWesternDigits(myAccts.length) + (myAccts.length === 1 ? ' حساب' : ' حسابات');
            document.getElementById('active-acct-label').textContent = activeAcct;
            var box = document.getElementById('accounts-list');
            box.innerHTML = myAccts.map(function(id) {
                var isCur = normalizeStr(id) === normalizeStr(activeAcct);
                return '<div class="flex items-center justify-between bg-[#080f18] border ' + (isCur ? 'border-teal-600/70' : 'border-slate-800') + ' p-3 rounded-xl">' +
                    '<div class="min-w-0"><p class="text-xs font-mono font-bold text-white truncate">' + escapeHtml(id) + '</p>' +
                    '<p class="text-[10px] text-slate-400">' + (isCur ? 'الحساب النشط حالياً' : 'حساب محفوظ') + '</p></div>' +
                    '<div class="flex items-center gap-1.5 shrink-0">' +
                    '<button type="button" onclick="copyStringToClipboard(\'' + escapeJsSingle(id) + '\')" class="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded-lg text-[11px] font-bold">نسخ</button>' +
                    (isCur ? '<span class="text-[11px] bg-teal-950 text-teal-200 border border-teal-800/60 px-2.5 py-1 rounded-lg font-bold">نشط</span>'
                          : '<button type="button" onclick="switchAcct(\'' + escapeJsSingle(id) + '\')" class="bg-[#164e63] hover:bg-[#1e6078] text-white px-3 py-1.5 rounded-lg text-[11px] font-bold">تفعيل</button>') +
                    '</div></div>';
            }).join('');
        }

        function showGeneratedCodeBanner(code) {
            lastGeneratedCode = cleanIdValue(code);
            var banner = document.getElementById('last-generated-banner');
            var txt = document.getElementById('last-generated-text');
            if (banner && txt) {
                txt.textContent = 'المعرّف الجديد: ' + lastGeneratedCode;
                banner.classList.remove('hidden');
            }
        }

        function make8DigitId() {
            var code = cleanIdValue(Math.floor(10000000 + Math.random() * 90000000));
            if (myAccts.indexOf(code) === -1) myAccts.unshift(code);
            activeAcct = code;
            showGeneratedCodeBanner(code);
            persistAndDraw();
            syncPresenceNow();
            alert('تم توليد المعرّف وتفعيله: ' + code);
        }

        function addCustomNumberAccount() {
            var raw = prompt('أدخل رقم الجوال أو المعرّف الخاص بك (مثال: 771234567 أو معرّف من 8 أرقام):');
            if (!raw) return;
            var clean = cleanIdValue(raw);
            if (!clean) return;
            if (myAccts.indexOf(clean) === -1) myAccts.unshift(clean);
            activeAcct = clean;
            showGeneratedCodeBanner(clean);
            persistAndDraw();
            syncPresenceNow();
        }

        function verifyPhoneAccount() {
            var phone = prompt('أدخل رقم الجوال لتفعيله كمعرّف على سند AI:');
            if (!phone) return;
            var cleanPhone = cleanIdValue(phone);
            if (!cleanPhone) return;
            var otp = prompt('تم إرسال رمز التحقق التجريبي (1234) إلى ' + cleanPhone + ' — أدخل الرمز:');
            if (toWesternDigits(otp || '').trim() !== '1234') return alert('رمز التحقق غير صحيح. الرمز التجريبي هو 1234.');
            if (myAccts.indexOf(cleanPhone) === -1) myAccts.unshift(cleanPhone);
            activeAcct = cleanPhone;
            showGeneratedCodeBanner(cleanPhone);
            persistAndDraw();
            syncPresenceNow();
            alert('تم تفعيل رقم الجوال بنجاح: ' + cleanPhone);
        }

        function switchAcct(id) {
            activeAcct = cleanIdValue(id);
            cancelReplyMessage();
            cancelEditMessage();
            clearUnreadForPeer(currentPeer);
            persistAndDraw();
            syncPresenceNow();
        }

        function addNewContact() {
            var n = document.getElementById('c-name').value.trim();
            var i = cleanIdValue(document.getElementById('c-id').value);
            if (!i) return alert('أدخل المعرّف أو رقم الجوال أولاً.');
            upsertContact(n || ('جهة ' + i), i);
            document.getElementById('c-name').value = '';
            document.getElementById('c-id').value = '';
        }

        function saveCurrentPeer() {
            var clean = cleanIdValue(currentPeer);
            if (!clean || clean === DEFAULT_PEER || findGroupById(clean)) return;
            var existing = contacts.find(function(c) { return normalizeStr(c.id) === normalizeStr(clean); });
            var suggestedName = existing ? existing.name : ('جهة ' + clean);
            var n = prompt('أدخل اسماً لحفظ هذه الجهة:', suggestedName);
            if (n === null) return;
            upsertContact(n.trim() || suggestedName, clean);
            alert('تم حفظ جهة الاتصال بنجاح.');
        }

        function renderChips() {
            var box = document.getElementById('quick-chips');
            var searchInp = document.getElementById('peer-input');
            var queryVal = searchInp ? searchInp.value.trim() : '';
            var list = queryVal ? findContactMatches(queryVal) : getSortedContacts().slice(0, 8);
            if (!list.length) {
                box.innerHTML = '<span class="text-[11px] text-slate-400">لا توجد نتائج مطابقة — يمكنك الضغط على «فتح» لفتح المعرّف مباشرة.</span>';
                return;
            }
            box.innerHTML = list.map(function(c) {
                var active = normalizeStr(c.id) === normalizeStr(currentPeer);
                var online = isPeerOnline(c.id);
                var unread = getUnreadCountForPeer(c.id);
                return '<button type="button" onclick="choosePeer(\'' + escapeJsSingle(c.id) + '\')" class="px-3 py-1 rounded-full border text-[11px] font-bold whitespace-nowrap flex items-center gap-1.5 ' +
                    (active ? 'bg-[#164e63] border-teal-500/80 text-white' : 'bg-[#080f18] border-slate-800 text-slate-200 hover:border-slate-700') + '">' +
                    '<span class="w-2 h-2 rounded-full ' + (online ? 'bg-emerald-400' : 'bg-slate-600') + '"></span>' +
                    '<span>' + escapeHtml(c.name) + '</span>' +
                    (c.id !== DEFAULT_PEER ? '<span class="font-mono text-[10px] text-slate-300">' + escapeHtml(c.id) + '</span>' : '') +
                    (unread > 0 ? '<span class="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[9px] font-mono font-black">' + toWesternDigits(unread) + '</span>' : '') +
                    '</button>';
            }).join('');
        }

        function onTopPeerSearchInput() {
            renderChips();
            var inp = document.getElementById('peer-input');
            var q = inp ? inp.value.trim() : '';
            if (!q) return;
            var matches = findContactMatches(q);
            if (matches.length === 1 && normalizeStr(matches[0].id) !== normalizeStr(currentPeer)) {
                choosePeer(matches[0].id, { keepSearchInput: true });
            }
        }

        function openFirstMatchedContact() {
            var qInp = document.getElementById('contact-search-input');
            var matches = findContactMatches(qInp ? qInp.value : '');
            if (matches.length) choosePeer(matches[0].id);
        }

        function onCallDialInput() {
            var inp = document.getElementById('call-input');
            var prev = document.getElementById('call-resolved-preview');
            var sugBox = document.getElementById('call-contact-suggestions');
            var raw = inp ? inp.value.trim() : '';
            var matches = findContactMatches(raw).filter(function(c) { return c.id !== DEFAULT_PEER; }).slice(0, 6);
            if (sugBox) {
                sugBox.innerHTML = matches.map(function(c) {
                    return '<button type="button" onclick="selectDialContact(\'' + escapeJsSingle(c.name) + '\', \'' + escapeJsSingle(c.id) + '\')" class="px-2.5 py-1 rounded-lg bg-[#080f18] hover:bg-slate-800 border border-slate-800 text-[11px] font-bold text-slate-200">' +
                        escapeHtml(c.name) + ' <span class="font-mono text-[10px] text-teal-300">' + escapeHtml(c.id) + '</span></button>';
                }).join('');
            }
            if (!prev) return;
            if (!raw) {
                prev.textContent = matches.length ? ('اختر جهة أو اكتب رقماً أو معرّفاً للاتصال') : '';
                return;
            }
            var resolved = resolveContactByQuery(raw);
            if (resolved) {
                var on = !resolved.isGroup && isPeerOnline(resolved.id);
                prev.textContent = (resolved.isGroup ? 'مجموعة: ' : 'جهة: ') + resolved.name + ' (' + resolved.id + ')' + (resolved.isGroup ? '' : (on ? ' • متصل الآن' : ' • جاهز للاتصال'));
            } else {
                prev.textContent = 'سيتم الاتصال بالمعرّف/الرقم: ' + cleanIdValue(raw);
            }
        }

        function selectDialContact(name, id) {
            var inp = document.getElementById('call-input');
            if (inp) inp.value = name + ' • ' + id;
            onCallDialInput();
        }

        function renderPresence() {
            renderChips();
            renderGroupsList();
            renderGroupCallSelector();
            var grp = findGroupById(currentPeer);
            var online = !grp && (currentPeer === DEFAULT_PEER || isPeerOnline(currentPeer));
            document.getElementById('peer-title').textContent = formatPeerDisplay(currentPeer);
            document.getElementById('peer-dot').className = grp ? 'w-2.5 h-2.5 rounded-full bg-teal-400 shrink-0'
                : (online ? 'w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0' : 'w-2.5 h-2.5 rounded-full bg-slate-600 shrink-0');
            var stEl = document.getElementById('peer-status');
            if (grp) {
                stEl.textContent = 'مجموعة (' + toWesternDigits((grp.members || []).length || 1) + ')';
                stEl.className = 'text-[11px] font-bold text-teal-300 shrink-0 whitespace-nowrap';
            } else if (online) {
                stEl.textContent = 'متصل';
                stEl.className = 'text-[11px] font-bold text-emerald-300 shrink-0 whitespace-nowrap';
            } else {
                stEl.textContent = 'غير متصل';
                stEl.className = 'text-[11px] font-bold text-slate-400 shrink-0 whitespace-nowrap';
            }

            var qInp = document.getElementById('contact-search-input');
            var list = findContactMatches(qInp ? qInp.value : '');
            var sumBadge = document.getElementById('contacts-summary-badge');
            if (sumBadge) sumBadge.textContent = toWesternDigits(list.length) + ' جهة';

            var box = document.getElementById('contacts-list');
            if (!box) return;
            box.innerHTML = list.map(function(c) {
                var isOn = c.id === DEFAULT_PEER || isPeerOnline(c.id);
                var unread = getUnreadCountForPeer(c.id);
                return '<div class="flex items-center justify-between bg-[#0f1b29] border border-slate-800 p-3 rounded-xl">' +
                    '<div class="flex items-center gap-2.5 min-w-0">' +
                    '<span class="w-2.5 h-2.5 rounded-full shrink-0 ' + (isOn ? 'bg-emerald-400' : 'bg-slate-600') + '"></span>' +
                    '<div class="min-w-0"><div class="flex items-center gap-1.5"><p class="text-xs font-bold text-white truncate">' + escapeHtml(c.name) + '</p>' +
                    (unread > 0 ? '<span class="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[9px] font-mono font-bold">' + toWesternDigits(unread) + '</span>' : '') +
                    '</div>' +
                    '<p class="text-[11px] font-mono text-slate-400 truncate">' + escapeHtml(c.id) + ' • <span class="' + (isOn ? 'text-emerald-300' : 'text-slate-400') + '">' + (isOn ? 'متصل' : 'غير متصل') + '</span></p></div></div>' +
                    '<div class="flex items-center gap-1.5 shrink-0">' +
                    (c.id !== DEFAULT_PEER ? '<button type="button" onclick="directCallContact(\'' + escapeJsSingle(c.id) + '\', \'audio\')" title="اتصال صوتي" class="bg-emerald-800 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold"><i class="fa-solid fa-phone"></i></button>' : '') +
                    '<button type="button" onclick="choosePeer(\'' + escapeJsSingle(c.id) + '\')" class="bg-[#164e63] hover:bg-[#1e6078] text-white px-3 py-1.5 rounded-lg text-xs font-bold">مراسلة</button></div></div>';
            }).join('');
        }

        function directCallContact(peerId, mode) {
            choosePeer(peerId);
            startSingleCallOffer(peerId, mode || 'audio', false);
        }

        function choosePeer(id, opts) {
            var rawVal = cleanIdValue(id) || DEFAULT_PEER;
            var resolved = resolveContactByQuery(rawVal);
            currentPeer = cleanIdValue(resolved ? resolved.id : rawVal) || DEFAULT_PEER;
            cancelReplyMessage();
            cancelEditMessage();
            clearUnreadForPeer(currentPeer);
            var inp = document.getElementById('peer-input');
            if (inp && !(opts && opts.keepSearchInput)) inp.value = '';
            setPane('chats');
            persistAndDraw();
            markCurrentThreadAsRead();
        }

        function openPeerByInput() {
            var val = document.getElementById('peer-input').value.trim();
            if (!val) return;
            choosePeer(val);
        }

        function markCurrentThreadAsRead() {
            var grp = findGroupById(currentPeer);
            if (grp || currentPeer === DEFAULT_PEER) return;
            var list = getThreadMap()[currentPeer] || [];
            list.forEach(function(m) {
                if (m.from === 'them' && m.id) sendReadReceiptIfViewing(currentPeer, m.id);
            });
        }

        function toggleThreadSearchBar() {
            var bar = document.getElementById('thread-search-bar');
            bar.classList.toggle('hidden');
            if (!bar.classList.contains('hidden')) document.getElementById('thread-search-input').focus();
            else { document.getElementById('thread-search-input').value = ''; renderMsgs(); }
        }

        function closeThreadSearchBar() {
            document.getElementById('thread-search-bar').classList.add('hidden');
            document.getElementById('thread-search-input').value = '';
            renderMsgs();
        }

        function pinThreadMsg(msgId) {
            var list = getThreadMap()[currentPeer] || [];
            var found = list.find(function(m) { return m.id === msgId; });
            if (!found || found.deleted) return;
            pinnedByThread[currentPeer] = { id: found.id, text: found.text || found.fileName || 'مرفق' };
            persistAndDraw();
        }

        function unpinCurrentThreadMsg() {
            delete pinnedByThread[currentPeer];
            persistAndDraw();
        }

        function renderPinnedBanner() {
            var banner = document.getElementById('pinned-msg-banner');
            var pin = pinnedByThread[currentPeer];
            if (pin && pin.text) {
                document.getElementById('pinned-msg-text').textContent = 'مثبّت: ' + pin.text;
                banner.classList.remove('hidden');
            } else {
                banner.classList.add('hidden');
            }
        }

        function renderDeliveryTicks(item) {
            if (item.from !== 'me') return '';
            var isRead = Boolean(item.read || item.status === 'read');
            var isDelivered = Boolean(item.delivered || item.status === 'delivered' || isRead);
            if (isRead) return '<span class="text-sky-300 font-black mr-1" title="مقروءة">✓✓</span>';
            if (isDelivered) return '<span class="text-slate-300 font-bold mr-1" title="تم التسليم">✓✓</span>';
            return '<span class="text-slate-400 mr-1" title="مرسلة">✓</span>';
        }

        function renderQuotedBlock(item) {
            if (!item || !item.replyTo || !item.replyTo.snippet) return '';
            var qId = item.replyTo.id ? escapeJsSingle(item.replyTo.id) : '';
            var clickAttr = qId ? (' onclick="scrollToQuotedMessage(\'' + qId + '\')"') : '';
            return '<div' + clickAttr + ' class="mb-1.5 px-2.5 py-1.5 rounded-xl bg-black/25 border-r-2 border-teal-300 cursor-pointer text-[11px]">' +
                '<p class="font-extrabold text-teal-200 text-[10px] truncate">' + escapeHtml(item.replyTo.senderLabel || 'رسالة مقتبسة') + '</p>' +
                '<p class="text-slate-200/90 truncate">' + escapeHtml(item.replyTo.snippet) + '</p>' +
                '</div>';
        }

        function renderMsgs() {
            renderPinnedBanner();
            renderReplyingBanner();
            var box = document.getElementById('msgs-box');
            var list = getThreadMap()[currentPeer] || [];
            var qInput = document.getElementById('thread-search-input');
            var q = qInput ? normalizeStr(qInput.value) : '';
            var countEl = document.getElementById('thread-search-count');

            var filtered = q ? list.filter(function(m) {
                return !m.deleted && (normalizeStr(m.text || '').indexOf(q) !== -1 || normalizeStr(m.fileName || '').indexOf(q) !== -1);
            }) : list;

            if (q && countEl) countEl.textContent = toWesternDigits(filtered.length) + ' نتيجة';

            if (!filtered.length) {
                box.innerHTML = '<div class="text-center text-xs text-slate-500 py-10">' + (q ? 'لا توجد رسائل مطابقة للبحث.' : 'لا توجد رسائل بعد. ابدأ المحادثة الآن أو اكتب @سند لأي مساعدة.') + '</div>';
                return;
            }

            var LONG_MSG_THRESHOLD = 420;
            box.innerHTML = filtered.map(function(item) {
                var isMe = item.from === 'me';
                var safeDomId = 'msg-item-' + String(item.id || '').replace(/[^a-zA-Z0-9_-]/g, '_');
                if (item.deleted) {
                    return '<div id="' + escapeHtml(safeDomId) + '" class="flex ' + (isMe ? 'justify-start' : 'justify-end') + '">' +
                        '<div class="max-w-[82%] px-3.5 py-2 rounded-2xl text-xs italic text-slate-400 bg-[#0f1b29]/70 border border-slate-800/70">تم حذف هذه الرسالة</div></div>';
                }
                var bubbleClass = isMe
                    ? 'bg-[#164e63] text-white rounded-bl-sm border border-teal-700/50'
                    : 'bg-[#0f1b29] text-slate-100 rounded-br-sm border border-slate-800';
                var bodyHtml = '';
                var rawText = String(item.text || '');
                var isLongText = (item.kind === 'text' || !item.kind) && rawText.length > LONG_MSG_THRESHOLD;
                var isExpanded = expandedLongMsgIds.has(item.id);

                if (item.kind === 'audio' && item.mediaUrl) {
                    bodyHtml = '<div class="space-y-1"><p class="text-[11px] font-bold">' + escapeHtml(item.text || 'رسالة صوتية') + '</p>' +
                        '<audio controls src="' + item.mediaUrl + '" class="max-w-full h-8"></audio></div>';
                } else if (item.kind === 'image' && item.mediaUrl) {
                    bodyHtml = '<div class="space-y-1.5"><img src="' + item.mediaUrl + '" alt="' + escapeHtml(item.fileName || 'صورة') + '" class="max-w-[220px] rounded-xl border border-slate-700">' +
                        '<p class="text-[11px] font-mono truncate">' + escapeHtml(item.fileName || 'صورة') + '</p></div>';
                } else if (item.kind === 'file' && item.mediaUrl) {
                    bodyHtml = '<a href="' + item.mediaUrl + '" download="' + escapeHtml(item.fileName || 'file') + '" class="flex items-center gap-2 text-xs underline font-bold">' +
                        '<i class="fa-solid fa-file-arrow-down"></i><span>' + escapeHtml(item.fileName || item.text || 'ملف مرفق') + '</span></a>';
                } else {
                    var displayedText = (isLongText && !isExpanded) ? (rawText.slice(0, LONG_MSG_THRESHOLD) + '...') : rawText;
                    bodyHtml = '<p class="text-xs md:text-sm leading-relaxed whitespace-pre-wrap break-words">' + escapeHtml(displayedText) + '</p>';
                    if (isLongText) {
                        bodyHtml += '<div class="mt-1.5 flex items-center gap-2 text-[10px] font-bold">' +
                            '<button type="button" onclick="event.stopPropagation(); toggleLongMsgExpand(\'' + escapeJsSingle(item.id) + '\')" class="px-2 py-0.5 rounded bg-black/25 text-teal-200 hover:text-white">' +
                            (isExpanded ? 'إخفاء النص الطويل' : 'قراءة باقي الرسالة') + '</button>' +
                            '<button type="button" onclick="event.stopPropagation(); openLongMsgReader(\'' + escapeJsSingle(item.id) + '\')" class="px-2 py-0.5 rounded bg-black/25 text-emerald-200 hover:text-white">نافذة قراءة كاملة</button>' +
                            '</div>';
                    }
                }

                var senderTag = (!isMe && item.senderName) ? '<p class="text-[10px] font-extrabold text-teal-300 mb-0.5">' + escapeHtml(item.senderName) + '</p>' : '';
                var metaLine = '<div class="flex items-center justify-between gap-2 mt-1 text-[10px] text-slate-300/80">' +
                    '<span>' + escapeHtml(item.sentAt || '') + (item.edited ? ' • معدّلة' : '') + '</span>' +
                    '<span>' + renderDeliveryTicks(item) + '</span></div>';

                return '<div id="' + escapeHtml(safeDomId) + '" class="flex ' + (isMe ? 'justify-start' : 'justify-end') + '">' +
                    '<div ondblclick="startReplyToMessage(\'' + escapeJsSingle(item.id) + '\')" oncontextmenu="event.preventDefault(); openMsgContextMenu(\'' + escapeJsSingle(item.id) + '\');" class="max-w-[84%] px-3.5 py-2.5 rounded-2xl shadow ' + bubbleClass + '">' +
                    senderTag + renderQuotedBlock(item) + bodyHtml + metaLine +
                    '<div class="flex items-center gap-2.5 mt-1.5 pt-1 border-t border-white/10 text-[10px] font-bold">' +
                    '<button type="button" onclick="event.stopPropagation(); startReplyToMessage(\'' + escapeJsSingle(item.id) + '\')" class="text-teal-200 hover:text-white" title="رد"><i class="fa-solid fa-reply ml-0.5"></i>رد</button>' +
                    '<button type="button" onclick="event.stopPropagation(); openMsgContextMenu(\'' + escapeJsSingle(item.id) + '\')" class="text-slate-200 hover:text-white" title="خيارات"><i class="fa-solid fa-ellipsis ml-0.5"></i>خيارات</button>' +
                    (item.kind === 'text' && item.text ? '<button type="button" onclick="event.stopPropagation(); speakText(\'' + escapeJsSingle(item.text) + '\')" class="text-emerald-200 hover:text-white" title="قراءة صوتية"><i class="fa-solid fa-volume-high"></i></button>' : '') +
                    '<button type="button" onclick="event.stopPropagation(); pinThreadMsg(\'' + escapeJsSingle(item.id) + '\')" class="text-amber-200 hover:text-white" title="تثبيت"><i class="fa-solid fa-thumbtack"></i></button>' +
                    (isMe && item.kind === 'text' ? '<button type="button" onclick="event.stopPropagation(); contextMenuMsgId=\'' + escapeJsSingle(item.id) + '\'; ctxEditAction();" class="text-sky-200 hover:text-white" title="تعديل"><i class="fa-solid fa-pen"></i></button>' : '') +
                    '<button type="button" onclick="event.stopPropagation(); openDeleteModal(\'' + escapeJsSingle(item.id) + '\', ' + (isMe ? 'true' : 'false') + ')" class="text-rose-200 hover:text-white" title="حذف"><i class="fa-solid fa-trash"></i></button>' +
                    '</div></div></div>';
            }).join('');
            box.scrollTop = box.scrollHeight;
        }

        function openDeleteModal(msgId, isMine) {
            pendingDeleteMsgId = msgId;
            document.getElementById('del-everyone-btn').classList.toggle('hidden', !isMine);
            document.getElementById('delete-modal').classList.remove('hidden');
        }

        function closeDeleteModal() {
            pendingDeleteMsgId = null;
            document.getElementById('delete-modal').classList.add('hidden');
        }

        function confirmDeleteChoice(scope) {
            var msgId = pendingDeleteMsgId;
            closeDeleteModal();
            if (!msgId) return;
            var map = getThreadMap();
            if (map[currentPeer]) {
                if (scope === 'all') {
                    map[currentPeer] = map[currentPeer].map(function(m) { return m.id === msgId ? Object.assign({}, m, { deleted: true, deletedBy: 'all' }) : m; });
                    var grp = findGroupById(currentPeer);
                    if (grp && Array.isArray(grp.members)) {
                        grp.members.forEach(function(m) {
                            if (normalizeStr(m) !== normalizeStr(activeAcct)) sendSignalingOrMsg({ type: 'msg_del_all', to: m, from: activeAcct, msgId: msgId });
                        });
                    } else if (currentPeer !== DEFAULT_PEER) {
                        sendSignalingOrMsg({ type: 'msg_del_all', to: currentPeer, from: activeAcct, msgId: msgId });
                    }
                } else {
                    map[currentPeer] = map[currentPeer].filter(function(m) { return m.id !== msgId; });
                }
            }
            persistAndDraw();
        }

        function buildSanadAiReply(userPrompt, threadMessages) {
            var q = String(userPrompt || '').trim();
            var recentContext = (threadMessages || [])
                .filter(function(m) { return !m.deleted && m.kind === 'text' && m.text; })
                .slice(-6)
                .map(function(m) { return (m.from === 'me' ? 'المرسل' : (m.senderName || 'الطرف الآخر')) + ': ' + m.text; })
                .join(' | ');
            var cleanQ = q.replace(/@سند/g, '').trim();
            if (!cleanQ) {
                return recentContext
                    ? ('أهلاً بك، اطّلعت على آخر رسائل المحادثة (' + recentContext.slice(0, 140) + ') — كيف أساعدك الآن؟')
                    : 'أهلاً بك، أنا @سند في سند AI v8.9.3. اكتب سؤالك أو اطلب تلخيصاً أو صياغة أو خطة عمل وسأجيبك فوراً.';
            }
            if (/تلخيص|لخص/i.test(cleanQ)) {
                return recentContext ? ('ملخص سريع بناءً على سياق المحادثة: ' + recentContext.slice(0, 220)) : 'أرسل أو افتح المحادثة المراد تلخيصها وسأستخرج أبرز نقاطها فوراً.';
            }
            if (/مهام|خطة|خطوات/i.test(cleanQ)) {
                return 'خطوات عملية مقترحة لـ «' + cleanQ + '»:
1. تحديد الهدف والنتيجة المطلوبة بوضوح.
2. تقسيم التنفيذ إلى خطوة فورية ومتابعة.
3. مراجعة المخرجات وتأكيد الإنجاز.';
            }
            if (/سعر|عرض|باقة|عميل/i.test(cleanQ)) {
                return 'صياغة مقترحة للعميل حول «' + cleanQ + '»:
أهلاً بك، يسعدنا خدمتكم وتوضيح التفاصيل والباقات المتاحة بكل شفافية وسرعة.';
            }
            return 'بناءً على طلبك «' + cleanQ + '»' + (recentContext ? ' وسياق المحادثة الحالي' : '') + ':
الخطوة الأنسب هي معالجة النقطة بوضوح ومباشرة مع متابعة التنفيذ خطوة بخطوة.';
        }

        function emitPacket(targetPeer, kind, text, mediaUrl, fileName, explicitReplyTo, ownerAcctOverride) {
            var cleanTarget = cleanIdValue(targetPeer) || DEFAULT_PEER;
            var ownerAcct = cleanIdValue(ownerAcctOverride || activeAcct) || activeAcct;
            var msgId = 'm-' + Date.now() + '-' + Math.floor(Math.random() * 100000);
            var sentAt = formatTimeShort();
            var quoteObj = explicitReplyTo || (replyingToMsg ? {
                id: replyingToMsg.id,
                senderLabel: replyingToMsg.senderLabel,
                snippet: replyingToMsg.snippet
            } : null);

            var threadObj = ensureThreadEntry(ownerAcct, cleanTarget);
            threadObj.list.push({
                id: msgId,
                from: 'me',
                kind: kind,
                text: text || '',
                mediaUrl: mediaUrl || null,
                fileName: fileName || '',
                replyTo: quoteObj,
                sentAt: sentAt,
                status: 'sent'
            });
            if (explicitReplyTo) cancelReplyMessage();
            persistAndDraw();

            var grp = findGroupById(cleanTarget);
            if (grp && Array.isArray(grp.members)) {
                grp.members.forEach(function(m) {
                    if (normalizeStr(m) !== normalizeStr(ownerAcct)) {
                        sendSignalingOrMsg({ type: 'msg', to: m, from: ownerAcct, senderName: ownerAcct, msgId: msgId, kind: kind, text: text || '', mediaUrl: mediaUrl || null, fileName: fileName || '', replyTo: quoteObj, sentAt: sentAt });
                    }
                });
            } else if (cleanTarget !== DEFAULT_PEER) {
                sendSignalingOrMsg({ type: 'msg', to: cleanTarget, from: ownerAcct, senderName: ownerAcct, msgId: msgId, kind: kind, text: text || '', mediaUrl: mediaUrl || null, fileName: fileName || '', replyTo: quoteObj, sentAt: sentAt });
            }

            var mentionsSanad = kind === 'text' && (/@سند/i.test(text || '') || cleanTarget === DEFAULT_PEER);
            if (mentionsSanad) {
                var snapshotThread = threadObj.list.slice();
                var localAiText = buildSanadAiReply(text || '', snapshotThread);
                var contextPrompt = 'سياق المحادثة الأخيرة:
' +
                    snapshotThread.filter(function(m) { return !m.deleted && m.kind === 'text' && m.text; }).slice(-6)
                        .map(function(m) { return (m.from === 'me' ? 'أنا' : (m.senderName || 'الطرف الآخر')) + ': ' + m.text; }).join('
') +
                    '
الرسالة الحالية: ' + (text || '');

                callExternalAi(contextPrompt, 'أنت مساعد سند AI داخل محادثة عربية؛ أجب بشكل عملي، دقيق، ومختصر باللغة العربية.').then(function(extReply) {
                    var finalReply = extReply || localAiText;
                    setTimeout(function() {
                        var currentListObj = ensureThreadEntry(ownerAcct, cleanTarget);
                        currentListObj.list.push({
                            id: 'ai-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
                            from: 'them',
                            senderName: '@سند',
                            kind: 'text',
                            text: finalReply,
                            sentAt: formatTimeShort()
                        });
                        playSoftChime();
                        persistAndDraw();
                    }, 350);
                });
            }
        }

        function sendTextMsg() {
            var inp = document.getElementById('msg-box-input');
            var txt = inp.value.trim();
            if (!txt) return;
            if (editingMsgId) {
                var targetId = editingMsgId;
                cancelEditMessage();
                var map = getThreadMap();
                if (map[currentPeer]) {
                    map[currentPeer] = map[currentPeer].map(function(m) {
                        if (m.id !== targetId) return m;
                        return Object.assign({}, m, { text: txt, edited: true, editedAt: formatTimeShort() });
                    });
                }
                if (currentPeer !== DEFAULT_PEER && !findGroupById(currentPeer)) {
                    sendSignalingOrMsg({ type: 'msg_edit', to: currentPeer, from: activeAcct, msgId: targetId, text: txt, editedAt: formatTimeShort() });
                }
                persistAndDraw();
                return;
            }
            var activeQuote = replyingToMsg ? {
                id: replyingToMsg.id,
                senderLabel: replyingToMsg.senderLabel,
                snippet: replyingToMsg.snippet
            } : null;
            inp.value = '';
            autoResizeComposer(inp);
            cancelReplyMessage();
            emitPacket(currentPeer, 'text', txt, null, '', activeQuote);
        }

        function insertSanadMention() {
            var inp = document.getElementById('msg-box-input');
            inp.value = inp.value ? (inp.value + ' @سند ') : '@سند ';
            autoResizeComposer(inp);
            inp.focus();
        }

        function polishDraft(style) {
            var inp = document.getElementById('msg-box-input');
            var raw = inp.value.trim() || 'نشكرك على تواصلك معنا، تم استلام طلبك وسيتم متابعته في أقرب وقت.';
            var map = {
                friendly: 'أهلاً بك 😊 ' + raw + ' يسعدنا دائماً خدمتك!',
                formal: 'السلام عليكم ورحمة الله وبركاته، نفيدكم بأنه: ' + raw + ' مع خالص التقدير.',
                short: raw.length > 90 ? (raw.slice(0, 90).trim() + '...') : raw,
                client: 'حياك الله، بخصوص استفسارك: ' + raw + ' — نحن بالخدمة لأي تفاصيل إضافية.'
            };
            var fallbackTxt = map[style] || raw;
            callExternalAi(
                'أعد صياغة الرسالة التالية باللغة العربية بأسلوب (' + style + ') بشكل طبيعي ومرتب:
' + raw,
                'أنت مساعد صياغة رسائل عربية احترافية.'
            ).then(function(aiTxt) {
                inp.value = aiTxt || fallbackTxt;
                autoResizeComposer(inp);
                inp.focus();
            });
        }

        function summarizeCurrentThread() {
            var list = (getThreadMap()[currentPeer] || []).filter(function(m) { return !m.deleted && m.kind === 'text' && m.text; });
            if (!list.length) return alert('لا توجد رسائل نصية لتلخيصها في هذه المحادثة.');
            var recent = list.slice(-10);
            var keyPoints = recent.map(function(m) {
                return '• ' + (m.from === 'me' ? 'أنت' : (m.senderName || formatPeerDisplay(currentPeer))) + ': ' + m.text.replace(/\s+/g, ' ').trim().slice(0, 95);
            }).join('
');
            var localSummary = 'تلخيص المحادثة (' + formatPeerDisplay(currentPeer) + ' • ' + toWesternDigits(recent.length) + ' رسائل):
' + keyPoints;

            callExternalAi(
                'لخص المحادثة التالية في نقاط عربية واضحة ومختصرة:
' + recent.map(function(m) { return (m.from === 'me' ? 'أنا' : 'الطرف الآخر') + ': ' + m.text; }).join('
'),
                'أنت مساعد تلخيص محادثات عربي دقيق.'
            ).then(function(aiSum) {
                var finalSummary = aiSum || localSummary;
                appendAiLog(finalSummary);
                alert(finalSummary);
            });
        }

        function extractTasksFromThread() {
            var list = (getThreadMap()[currentPeer] || []).filter(function(m) { return !m.deleted && m.kind === 'text' && m.text; });
            if (!list.length) return alert('لا توجد رسائل لاستخراج المهام منها.');
            var candidates = list.filter(function(m) {
                return /مهم|موعد|تسليم|إرسال|ارسال|مراجعة|تأكيد|متابعة|تجهيز|اتصال|حجز|شراء|دفع|يجب|نحتاج/i.test(m.text);
            });
            var sourceItems = (candidates.length ? candidates : list.slice(-5)).slice(-8);
            var tasksText = 'المهام والبنود المستخرجة:
' + sourceItems.map(function(m, idx) {
                return toWesternDigits(idx + 1) + '. ' + m.text.replace(/\s+/g, ' ').trim().slice(0, 110);
            }).join('
');

            callExternalAi(
                'استخرج قائمة مهام عملية مرقمة باللغة العربية من الرسائل التالية:
' + sourceItems.map(function(m) { return m.text; }).join('
'),
                'أنت مساعد استخراج مهام من المحادثات.'
            ).then(function(aiTasks) {
                appendAiLog(aiTasks || tasksText);
                setPane('ai');
            });
        }

        function suggestSmartReplies() {
            var list = (getThreadMap()[currentPeer] || []).filter(function(m) { return !m.deleted && m.kind === 'text' && m.text; });
            var lastIn = list.slice().reverse().find(function(m) { return m.from === 'them'; }) || list[list.length - 1];
            var lastTxt = lastIn ? lastIn.text : '';
            var bar = document.getElementById('smart-replies-bar');
            var suggestions = ['تمام، يعطيك العافية 👍', 'تم الاستلام وجاري المتابعة', 'ممكن توضح لي التفاصيل أكثر؟'];
            if (/سعر|اسعار|أسعار|باقة|عرض|كم/i.test(lastTxt)) {
                suggestions = ['أرسل لنا تفاصيل الباقة المطلوبة وسنزودك بالسعر فوراً', 'الأسعار موضحة حسب الباقة؛ هل تفضل باقة شهرية أم سنوية؟', 'تواصل معنا لتأكيد العرض الأنسب لك'];
            } else if (/موعد|وقت|متى|حجز/i.test(lastTxt)) {
                suggestions = ['مناسب جداً، نؤكد الموعد في نفس الوقت', 'هل يناسبك موعد آخر خلال الفترة المسائية؟', 'تم تسجيل الموعد وسنذكرك قبلها'];
            } else if (/مشكلة|عطل|خطأ|مساعدة/i.test(lastTxt)) {
                suggestions = ['نأسف لذلك، سنفحص المشكلة فوراً', 'أرسل صورة أو تفاصيل إضافية لنساعدك أسرع', 'تمت معالجة المشكلة، يرجى التأكيد'];
            }
            bar.innerHTML = '<span class="text-teal-300 font-bold shrink-0"><i class="fa-solid fa-bolt"></i></span>' +
                suggestions.map(function(s) {
                    return '<button type="button" onclick="applySmartReply(\'' + escapeJsSingle(s) + '\')" class="bg-[#080f18] hover:bg-slate-800 border border-slate-700 text-slate-200 px-2.5 py-1 rounded-full whitespace-nowrap">' + escapeHtml(s) + '</button>';
                }).join('');
            bar.classList.remove('hidden');
        }

        function applySmartReply(txt) {
            var inp = document.getElementById('msg-box-input');
            inp.value = txt;
            autoResizeComposer(inp);
            document.getElementById('smart-replies-bar').classList.add('hidden');
            inp.focus();
        }

        function craftCustomerContent(mode) {
            var qInp = document.getElementById('ai-q');
            var topic = (qInp && qInp.value.trim()) ? qInp.value.trim() : 'خدماتنا وعروضنا الحالية';
            var out = mode === 'promo'
                ? ('رسالة عميل جاهزة:
حياكم الله، يسعدنا مشاركتكم أحدث تفاصيل «' + topic + '» عبر سند AI مع استجابة سريعة ومتابعة مباشرة لطلباتكم.')
                : ('تقرير متابعة عميل:
• المحادثة: ' + formatPeerDisplay(currentPeer) + '
• المحور: ' + topic + '
• الحالة: قيد المتابعة الفورية');
            appendAiLog(out);
            var msgInp = document.getElementById('msg-box-input');
            if (msgInp && !msgInp.value.trim()) {
                msgInp.value = out.split('
').slice(1).join('
').trim();
                autoResizeComposer(msgInp);
            }
        }

        function appendAiLog(text) {
            var log = document.getElementById('ai-log');
            var div = document.createElement('div');
            div.className = 'p-2.5 rounded-xl bg-[#0f1b29] border border-slate-800 text-slate-200 whitespace-pre-wrap leading-relaxed';
            div.textContent = text;
            log.appendChild(div);
            log.scrollTop = log.scrollHeight;
        }

        function askSanadAI() {
            var inp = document.getElementById('ai-q');
            var q = inp.value.trim();
            if (!q) return;
            inp.value = '';
            appendAiLog('أنت: ' + q);
            var threadList = getThreadMap()[currentPeer] || [];
            var localAns = buildSanadAiReply(q, threadList);
            callExternalAi(q, 'أنت مساعد سند AI الذكي؛ أجب باللغة العربية بوضوح ومساعدة عملية.').then(function(extAns) {
                appendAiLog('@سند: ' + (extAns || localAns));
            });
        }

        function shareInviteLink() {
            var link = location.origin + '/?peer=' + encodeURIComponent(activeAcct);
            copyStringToClipboard(link);
            alert('تم نسخ رابط الدعوة الخاص بحسابك: ' + link);
        }

        function clearThreadMsgs() {
            if (!confirm('هل تريد مسح رسائل هذه المحادثة على جهازك؟')) return;
            var map = getThreadMap();
            map[currentPeer] = [];
            persistAndDraw();
        }

        function exportBackup() {
            var payload = {
                version: '8.9.3',
                activeAcct: activeAcct,
                myAccts: myAccts,
                contacts: contacts,
                sanadGroups: sanadGroups,
                acctThreads: acctThreads,
                pinnedByThread: pinnedByThread
            };
            var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'sanad-ai-8.9.3-backup.json';
            a.click();
            URL.revokeObjectURL(url);
        }

        function importBackup() {
            var input = document.createElement('input');
            input.type = 'file';
            input.accept = 'application/json';
            input.onchange = function(ev) {
                var f = ev.target.files && ev.target.files[0];
                if (!f) return;
                var r = new FileReader();
                r.onload = function() {
                    try {
                        var data = JSON.parse(r.result);
                        if (Array.isArray(data.myAccts) && data.myAccts.length) myAccts = data.myAccts.map(cleanIdValue).filter(Boolean);
                        if (data.activeAcct) activeAcct = cleanIdValue(data.activeAcct);
                        if (Array.isArray(data.contacts) && data.contacts.length) contacts = data.contacts;
                        if (Array.isArray(data.sanadGroups)) sanadGroups = data.sanadGroups;
                        if (data.acctThreads && typeof data.acctThreads === 'object') acctThreads = data.acctThreads;
                        if (data.pinnedByThread && typeof data.pinnedByThread === 'object') pinnedByThread = data.pinnedByThread;
                        persistAndDraw();
                        syncPresenceNow();
                        alert('تمت استعادة النسخة الاحتياطية بنجاح.');
                    } catch (e) { alert('تعذر قراءة ملف النسخة الاحتياطية.'); }
                };
                r.readAsText(f);
            };
            input.click();
        }

        function persistAndDraw() {
            persistState();
            renderAccts();
            renderPresence();
            renderMsgs();
            updateUnreadBadgesUI();
            updateQueueBadge();
        }

        window.addEventListener('online', function() {
            updateOfflineNetworkUI(false);
            updateNetBadge();
            setHeaderStatus('متصل', true);
            reconnectNow();
            flushOutboxQueue();
        });

        window.addEventListener('offline', function() {
            updateOfflineNetworkUI(true);
            updateNetBadge();
        });

        document.addEventListener('visibilitychange', function() {
            if (!document.hidden && activePane === 'chats') {
                clearUnreadForPeer(currentPeer);
                markCurrentThreadAsRead();
                pollHttpSync();
            }
        });

        loadSavedState();
        document.getElementById('device-badge').textContent = detectDevice();
        updateNetBadge();
        updateOfflineNetworkUI(typeof navigator !== 'undefined' && navigator.onLine === false);

        var urlParams = new URLSearchParams(location.search);
        var peerParam = cleanIdValue(urlParams.get('peer'));
        if (peerParam && peerParam !== '88888888') {
            currentPeer = peerParam;
            if (!contacts.some(function(c) { return normalizeStr(c.id) === normalizeStr(peerParam); })) {
                contacts.push({ name: 'جهة ' + peerParam, id: peerParam });
            }
        }

        var initialHashTab = String(location.hash || '').replace(/^#tab-/, '');
        setPane(SANAD_TAB_LABELS[initialHashTab] ? initialHashTab : 'chats');
        persistAndDraw();
        openSocket();
        syncPresenceNow();
        setInterval(function() {
            if (typeof navigator !== 'undefined' && navigator.onLine === false) {
                updateOfflineNetworkUI(true);
                return;
            }
            pollHttpSync();
            if (!ws || ws.readyState !== 1) openSocket();
        }, 2500);
    </script>
</body>
</html>`;

const syncEvents = [];
const registeredIds = new Map();

function recordSyncEvent(evt) {
    const entry = Object.assign({}, evt, {
        cursor: syncEvents.length + 1,
        ts: Date.now(),
        eventId: evt.eventId || ('srv-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8))
    });
    syncEvents.push(entry);
    if (syncEvents.length > 2000) {
        syncEvents.splice(0, syncEvents.length - 2000);
    }
    return entry;
}

function getOnlineIdsList() {
    const now = Date.now();
    const list = [];
    for (const [id, lastSeen] of registeredIds.entries()) {
        if (now - lastSeen < 45000) list.push(id);
        else registeredIds.delete(id);
    }
    return list;
}

function broadcastJson(obj, excludeWs = null) {
    const raw = JSON.stringify(obj);
    wss.clients.forEach(client => {
        if (client !== excludeWs && client.readyState === 1) {
            try { client.send(raw); } catch (e) {}
        }
    });
}

function processIncomingSignalOrMsg(payload, sourceWs = null) {
    if (!payload || typeof payload !== 'object') return;
    if (payload.type === 'register_ids') {
        const ids = Array.isArray(payload.ids) ? payload.ids : [];
        if (payload.activeId) ids.push(payload.activeId);
        const now = Date.now();
        ids.forEach(rawId => {
            const clean = normIdServer(rawId);
            if (clean) registeredIds.set(clean, now);
        });
        broadcastJson({ type: 'online_users', ids: getOnlineIdsList() }, sourceWs);
        return;
    }

    const fromClean = normIdServer(payload.from || '');
    const toClean = normIdServer(payload.to || '');
    if (fromClean) registeredIds.set(fromClean, Date.now());

    const enriched = Object.assign({}, payload, {
        from: fromClean || payload.from,
        to: toClean || payload.to
    });
    recordSyncEvent(enriched);
    broadcastJson(enriched, sourceWs);
}

const server = http.createServer((req, res) => {
    const reqUrl = new URL(req.url || '/', 'http://' + (req.headers.host || 'localhost'));
    const pathname = reqUrl.pathname;

    if (pathname === '/healthz') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify({ ok: true, appVersion: APP_VERSION, onlineCount: getOnlineIdsList().length }));
        return;
    }

    if (pathname === '/icon.svg') {
        res.writeHead(200, { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' });
        res.end(sanadIconSvg);
        return;
    }

    if (pathname === '/apple-touch-icon.png') {
        res.writeHead(200, { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' });
        res.end(sanadIconSvg);
        return;
    }

    if (pathname === '/manifest.json') {
        res.writeHead(200, { 'Content-Type': 'application/manifest+json; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(manifestPayload);
        return;
    }

    if (pathname === '/sw.js') {
        res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(swContent);
        return;
    }

    if (pathname === '/api/sync') {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString('utf8');
                if (body.length > 15 * 1024 * 1024) req.destroy();
            });
            req.on('end', () => {
                try {
                    const parsed = JSON.parse(body || '{}');
                    processIncomingSignalOrMsg(parsed, null);
                } catch (e) {}
                const currentCursor = syncEvents.length ? syncEvents[syncEvents.length - 1].cursor : 0;
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
                res.end(JSON.stringify({
                    ok: true,
                    appVersion: APP_VERSION,
                    cursor: currentCursor,
                    onlineIds: getOnlineIdsList(),
                    events: []
                }));
            });
            return;
        }

        const since = Number(toWesternDigitsServer(reqUrl.searchParams.get('since') || '0')) || 0;
        const idsParam = String(reqUrl.searchParams.get('ids') || '');
        const watchIds = new Set(idsParam.split(',').map(normIdServer).filter(Boolean));
        const now = Date.now();
        watchIds.forEach(id => registeredIds.set(id, now));

        const matchingEvents = syncEvents.filter(ev => {
            if (ev.cursor <= since) return false;
            if (!watchIds.size) return true;
            const evTo = normIdServer(ev.to || '');
            const evFrom = normIdServer(ev.from || '');
            return watchIds.has(evTo) || watchIds.has(evFrom) || ev.type === 'online_users';
        });

        const currentCursor = syncEvents.length ? syncEvents[syncEvents.length - 1].cursor : since;
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify({
            ok: true,
            appVersion: APP_VERSION,
            cursor: currentCursor,
            onlineIds: getOnlineIdsList(),
            events: matchingEvents
        }));
        return;
    }

    res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    });
    res.end(htmlContent);
});

const wss = new WebSocketServer({ server });

wss.on('connection', socket => {
    socket.on('message', rawData => {
        try {
            const parsed = JSON.parse(rawData.toString('utf8'));
            processIncomingSignalOrMsg(parsed, socket);
        } catch (e) {}
    });
    socket.on('close', () => {
        broadcastJson({ type: 'online_users', ids: getOnlineIdsList() }, socket);
    });
});

const PORT = Number(toWesternDigitsServer(process.env.PORT || '3000')) || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Sanad AI Server v${APP_VERSION} running on port ${PORT}`);
});
