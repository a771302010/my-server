const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

let getIconAssetForRoute = () => ({
    mimeType: 'image/svg+xml; charset=utf-8',
    buffer: Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="28" fill="#164e63"/><text x="64" y="82" text-anchor="middle" font-size="56" fill="#ffffff" font-family="sans-serif">س</text></svg>'
    )
});

try {
    const iconMod = require('./sanad-icon-assets');
    if (iconMod && typeof iconMod.getIconAssetForRoute === 'function') {
        getIconAssetForRoute = iconMod.getIconAssetForRoute;
    }
} catch (e) {
    console.warn('sanad-icon-assets fallback active:', e && e.message ? e.message : e);
}

const APP_VERSION = '12.6.9';
const PORT = process.env.PORT || 3000;
const ICON_BG_HEX = '#164e63';
const STATE_FILE_PATH = process.env.SANAD_STATE_FILE || path.join(__dirname, 'sanad-state.json');
const LOCAL_RADIO_URL = process.env.SANAD_LOCAL_RADIO_URL || '/sanad-radio-promo.mp3';

// أضف أي مقاطع MP3 أو M4A أو MP4 إضافية هنا بالترتيب في جذر المشروع
const SANAD_EXTRA_TRACKS = [
    { id: 'seg2', title: 'المقطع الثاني -- إذاعة سند', url: '/sanad-seg-2.mp3' },
    { id: 'seg3', title: 'فقرة صوتية M4A -- إذاعة سند AI', url: '/sanad-seg-3.m4a' },
    { id: 'seg4', title: 'حلقة MP4 -- إذاعة سند AI', url: '/sanad-seg-4.mp4' }
];

const MEDIA_MIME_TYPES = {
    '.mp3': 'audio/mpeg',
    '.m4a': 'audio/mp4',
    '.mp4': 'video/mp4'
};

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
const pendingVerifications = new Map();
const reservedCodesSet = new Set();
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
            syncEvents: syncEvents.slice(-1500),
            blocks: blocksObj,
            reservedCodes: Array.from(reservedCodesSet)
        };
        const serialized = JSON.stringify(snapshot);
        fs.writeFile(STATE_FILE_PATH, serialized, 'utf8', () => {});
    } catch (e) {}
}

function scheduleServerStateSave() {
    clearTimeout(saveStateTimer);
    saveStateTimer = setTimeout(persistServerStateToDisk, 400);
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
            parsed.syncEvents.slice(-1500).forEach(ev => {
                if (ev && typeof ev === 'object') syncEvents.push(ev);
            });
        }
        if (Array.isArray(parsed.reservedCodes)) {
            parsed.reservedCodes.forEach(c => {
                const n = normIdServer(c);
                if (n) reservedCodesSet.add(n);
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

function generateUnique88CodeServer() {
    for (let i = 0; i < 200; i++) {
        const suffix = String(Math.floor(100000 + Math.random() * 900000));
        const candidate = '88' + suffix;
        const n = normIdServer(candidate);
        if (!reservedCodesSet.has(n)) {
            reservedCodesSet.add(n);
            scheduleServerStateSave();
            return candidate;
        }
    }
    const fallback = '88' + String(Date.now()).slice(-6);
    reservedCodesSet.add(normIdServer(fallback));
    scheduleServerStateSave();
    return fallback;
}

function recordSyncEvent(payload) {
    eventCursor += 1;
    const item = Object.assign({}, payload, {
        cursor: eventCursor,
        eventId:
            payload.eventId ||
            ('srv-' + eventCursor + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7))
    });
    syncEvents.push(item);
    if (syncEvents.length > 2000) {
        syncEvents.splice(0, syncEvents.length - 2000);
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
        if (now - ts <= 30000) ids.add(id);
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
        cleanSet.forEach(id => {
            if (id.startsWith('88')) reservedCodesSet.add(id);
        });
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

async function callGeminiText(systemPrompt, userPrompt) {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey || typeof fetch !== 'function') return '';
    try {
        const resp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(geminiKey)}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systemInstruction: { parts: [{ text: systemPrompt }] },
                    contents: [{ role: 'user', parts: [{ text: userPrompt }] }]
                })
            }
        );
        if (resp && resp.ok) {
            const data = await resp.json();
            const cand = data && data.candidates && data.candidates[0];
            const parts = cand && cand.content && cand.content.parts;
            return Array.isArray(parts) ? parts.map(p => p.text || '').join('\n').trim() : '';
        }
    } catch (e) {}
    return '';
}

async function generateAiAssistantReply(promptText) {
    const q = String(promptText || '').trim();
    const aiOut = await callGeminiText(
        'أنت مساعد سند الذكي داخل تطبيق سند (منصة اتصال وذكاء اصطناعي وثقافة ومعرفة للجميع). أجب بالعربية بوضوح وحياد وإيجاز عملي.',
        q
    );
    if (aiOut) return aiOut;

    if (!q) return 'أهلاً بك في مساعد سند الذكي. اكتب سؤالك وسأجيبك فوراً.';
    if (/تحديث|اصدار|نسخة/i.test(q)) {
        return `النسخة الحالية هي v${APP_VERSION}. يتم فحص التحديثات تلقائياً مع ظهور شريط تنبيه أعلى الشاشة عند توفر إصدار جديد، ويمكنك التحديث في أي وقت من تبويب الذكاء.`;
    }
    if (/نسخة احتياطية|تصدير|استيراد|تحصيلات/i.test(q)) {
        return 'يمكنك تصدير نسخة احتياطية كاملة واستعراض سجل النسخ مرتباً من الأحدث للأقدم مع أعداد التحصيلات (الجهات، الرسائل، الحسابات، المجموعات، والمحظورين) داخل تبويب الذكاء.';
    }
    if (/راديو|اذاعة|fm|قران|سند|اخبار|mp3|m4a|mp4/i.test(q)) {
        return 'إذاعة سند تشغّل البث بشكل متواصل وتدعم صيغ MP3 وM4A وMP4 مع انتقال ذكي بين المقاطع، إلى جانب قنوات القرآن الكريم والقنوات الإخبارية.';
    }
    if (/باب المندب|المخاء|طقس|رياح|مد|جزر|بحر/i.test(q)) {
        return 'لوحة الطقس والرياح والمد والجزر في سند تشمل مضيق باب المندب والمخاء وعدن والحديدة وسواحل ومدن عربية وعالمية مختارة.';
    }
    return `بخصوص سؤالك («${q.slice(0, 120)}»): مساعد سند الذكي متاح للرد الفوري على أسئلتك ومساعدتك في الترجمة والنسخ الاحتياطية وإذاعة سند.`;
}

async function translateTextSmart(text, targetLang) {
    const src = String(text || '').trim();
    if (!src) return '';
    const target = targetLang === 'en' ? 'الإنجليزية' : 'العربية';
    const aiOut = await callGeminiText(
        `أنت مترجم فوري دقيق داخل تطبيق سند. ترجم النص التالي إلى ${target} فقط دون مقدمات أو شروحات إضافية.`,
        src
    );
    if (aiOut) return aiOut;

    if (typeof fetch === 'function') {
        try {
            const pair = targetLang === 'en' ? 'ar|en' : 'en|ar';
            const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(src.slice(0, 480))}&langpair=${encodeURIComponent(pair)}`;
            const r = await fetch(url);
            if (r && r.ok) {
                const j = await r.json();
                const tr = j && j.responseData && j.responseData.translatedText;
                if (tr && !/MYMEMORY WARNING/i.test(tr)) return String(tr).trim();
            }
        } catch (e) {}
    }

    const dict = {
        'hello': 'مرحباً',
        'hi': 'أهلاً',
        'good morning': 'صباح الخير',
        'good evening': 'مساء الخير',
        'thank you': 'شكراً لك',
        'thanks': 'شكراً',
        'how are you': 'كيف حالك؟',
        'ok': 'حسناً',
        'okay': 'تمام',
        'yes': 'نعم',
        'no': 'لا',
        'welcome': 'أهلاً وسهلاً',
        'call me': 'اتصل بي',
        'see you soon': 'أراك قريباً'
    };
    const lower = src.toLowerCase();
    if (dict[lower]) return dict[lower];
    return `[ترجمة فورية]: ${src}`;
}

const manifestPayload = JSON.stringify({
    name: `Sanad v${APP_VERSION} - منصة سند للاتصال والذكاء والمعرفة`,
    short_name: 'سند',
    description: 'منصة سند للاتصال والذكاء الاصطناعي والثقافة والمعرفة للجميع',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#09111b',
    theme_color: ICON_BG_HEX,
    dir: 'rtl',
    lang: 'ar',
    icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
});

const swContent = `const CACHE_NAME = 'sanad-ai-cache-v${APP_VERSION}';
const APP_SHELL = ['/', '/manifest.json', '/icon.svg', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png', '/sanad-radio-playlist.js', '/sanad-radio.m3u'];

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

self.addEventListener('message', event => {
  if (event && event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.startsWith('/api/') || url.pathname === '/healthz') return;
  if (req.headers.get('range') || /\\.(mp3|m4a|mp4)$/i.test(url.pathname)) return;

  if (
    req.mode === 'navigate' ||
    url.pathname === '/' ||
    url.pathname === '/manifest.json' ||
    url.pathname === '/icon.svg' ||
    url.pathname === '/icon-192.png' ||
    url.pathname === '/icon-512.png' ||
    url.pathname === '/apple-touch-icon.png' ||
    url.pathname === '/sanad-radio-playlist.js' ||
    url.pathname === '/sanad-radio.m3u'
  ) {
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
    <meta name="apple-mobile-web-app-title" content="سند">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="theme-color" content="#164e63">
    <title>سند v${APP_VERSION} -- منصة الاتصال والذكاء والمعرفة</title>
    <link id="sanad-favicon" rel="icon" type="image/png" sizes="192x192" href="/icon-192.png">
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
    <link rel="apple-touch-icon" href="/icon-192.png">
    <link rel="manifest" href="/manifest.json">
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script src="/sanad-radio-playlist.js"></script>
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
        var SANAD_LOCAL_RADIO_URL = '${LOCAL_RADIO_URL.replace(/'/g, '')}';
        var SANAD_SERVER_EXTRA_TRACKS = ${JSON.stringify(SANAD_EXTRA_TRACKS)};

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
            if (target === 'chats' && typeof markCurrentThreadRead === 'function') markCurrentThreadRead();
            if (target === 'accounts' && typeof renderAccts === 'function') renderAccts();
            if (target === 'contacts' && typeof renderPresence === 'function') { renderPresence(); renderBlockedList(); }
            if (target === 'groups' && typeof renderGroupsList === 'function') renderGroupsList();
            if (target === 'calls' && typeof onCallDialInput === 'function') onCallDialInput();
            if (target === 'ai') {
                if (typeof refreshUpdateStatusInAi === 'function') refreshUpdateStatusInAi();
                if (typeof renderBackupHistoryList === 'function') renderBackupHistoryList();
            }
        }
    </script>

    <audio id="remote-audio-el" autoplay playsinline class="hidden"></audio>
    <audio id="radio-audio-el" preload="auto" playsinline class="hidden"></audio>
    <video id="radio-mp4-el" preload="auto" playsinline class="hidden"></video>
    <audio id="devotional-audio-el" preload="none" playsinline class="hidden"></audio>

    <div id="auto-update-banner" class="hidden bg-gradient-to-r from-teal-900 via-[#164e63] to-teal-900 border-b border-teal-400/50 text-white px-3.5 py-2 flex items-center justify-between gap-2 text-xs z-30 shrink-0">
        <span id="auto-update-banner-text" class="font-semibold truncate">يتوفر تحديث جديد للنظام -- اضغط للتحديث الآن.</span>
        <button type="button" onclick="applySystemUpdateNow()" class="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3 py-1 rounded-lg text-[11px] shrink-0">تحديث الآن</button>
    </div>

    <header class="bg-[#0d1926]/95 border-b border-slate-800/80 px-3.5 py-2 flex justify-between items-center z-20 shrink-0">
        <div class="flex items-center gap-2.5 min-w-0">
            <button type="button" onclick="openIdentityQrModal()" title="هوية سند وكود التعريف" class="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-[#155e75] via-[#164e63] to-[#0f3646] border border-cyan-300/35 flex items-center justify-center shrink-0 shadow overflow-hidden">
                <img src="/icon-192.png" alt="سند" class="w-full h-full object-cover">
                <span id="header-unread-dot" class="hidden absolute -top-1.5 -left-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-mono font-bold flex items-center justify-center shadow">0</span>
            </button>
            <div class="min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                    <h1 class="font-bold text-base text-white leading-none">سند</h1>
                    <span class="text-[10px] bg-teal-950/90 text-teal-200 border border-teal-700/60 px-2 py-0.5 rounded-full font-semibold">اتصال • ذكاء • معرفة v${APP_VERSION}</span>
                    <span id="current-tab-badge" class="text-[10px] bg-slate-800/90 text-slate-200 border border-slate-700/80 px-2 py-0.5 rounded-full font-semibold">الدردشة</span>
                </div>
                <div class="flex items-center gap-1.5 text-[11px] mt-0.5 flex-wrap">
                    <span id="ws-dot" class="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]"></span>
                    <span id="ws-label" class="text-emerald-300 font-medium">منصة سند متصلة ونشطة</span>
                    <button type="button" onclick="reconnectNow()" title="تحديث الربط" class="text-slate-300 hover:text-white px-1">
                        <i class="fa-solid fa-rotate-right text-[10px]"></i>
                    </button>
                    <span class="text-slate-600">•</span>
                    <button type="button" onclick="openIdentityQrModal()" class="font-mono font-semibold text-teal-200 hover:underline truncate max-w-[130px]" id="active-acct-label"></button>
                </div>
            </div>
        </div>

        <div class="flex items-center gap-1.5 shrink-0">
            <button type="button" onclick="requestSystemNotifications()" title="تفعيل الإشعارات" class="px-2.5 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-200 flex items-center gap-1 text-[11px] font-semibold transition">
                <i class="fa-solid fa-bell text-xs"></i><span id="notif-status-txt">إشعار</span>
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

    <div id="delete-msg-modal" onclick="if(event.target===this)closeDeleteMsgModal()" class="hidden fixed inset-0 bg-[#070d14]/88 z-50 flex items-center justify-center p-4">
        <div class="bg-[#0d1926] border border-slate-700 rounded-2xl w-full max-w-xs p-4 space-y-3 shadow-2xl text-xs">
            <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 class="font-bold text-rose-300"><i class="fa-solid fa-trash-can ml-1"></i> حذف نهائي للرسالة</h3>
                <button type="button" onclick="closeDeleteMsgModal()" class="text-slate-400 hover:text-white"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <p class="text-slate-300 leading-relaxed">يرجى اختيار نطاق الحذف النهائي المطلوب:</p>
            <div class="space-y-2">
                <button type="button" onclick="confirmDeleteMessage('self')" class="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white py-2.5 px-3 rounded-xl font-semibold text-right">
                    حذف نهائي لي فقط
                </button>
                <button type="button" onclick="confirmDeleteMessage('everyone')" class="w-full bg-rose-900/90 hover:bg-rose-800 border border-rose-700 text-rose-50 py-2.5 px-3 rounded-xl font-semibold text-right">
                    حذف نهائي للجميع
                </button>
                <button type="button" onclick="closeDeleteMsgModal()" class="w-full bg-transparent hover:bg-slate-800/60 text-slate-400 py-1.5 rounded-xl font-medium">
                    إلغاء
                </button>
            </div>
        </div>
    </div>

    <div id="identity-qr-modal" onclick="if(event.target===this)closeIdentityQrModal()" class="hidden fixed inset-0 bg-[#070d14]/88 z-50 flex items-center justify-center p-3.5 overflow-y-auto">
        <div class="bg-[#0d1926] border border-teal-700/60 rounded-3xl w-full max-w-md p-4 space-y-3 shadow-2xl my-auto">
            <div class="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <h3 class="text-sm font-bold text-teal-200"><i class="fa-solid fa-shield-halved ml-1"></i> سند -- منصة الاتصال والذكاء والمعرفة</h3>
                <button type="button" onclick="closeIdentityQrModal()" class="text-slate-400 hover:text-white text-sm"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <img src="/icon-512.png" alt="شعار سند" class="w-24 h-24 rounded-2xl mx-auto border border-cyan-400/30 shadow-lg">
            <p class="text-[11px] text-slate-300 leading-relaxed text-center">تواصل فوري بالرسائل والصوت، وبث إذاعي وثقافي ومعرفي مفتوح للجميع من مكان واحد.</p>
            <div class="bg-[#08101a] border border-slate-800 rounded-2xl p-3 flex flex-col items-center gap-2">
                <div class="text-[11px] text-slate-400">معرّفك النشط الحالي</div>
                <div id="qr-modal-acct-id" class="font-mono text-base font-bold text-teal-200"></div>
                <div class="flex flex-wrap justify-center gap-1.5 text-xs">
                    <button type="button" onclick="copyStringToClipboard(activeAcct, 'تم نسخ كود التعريف')" class="bg-[#164e63] hover:bg-[#1e6078] text-white px-3 py-1.5 rounded-xl font-semibold">نسخ الكود</button>
                    <button type="button" onclick="saveContactToDeviceVcf(activeAcct, resolveContactName(activeAcct))" class="bg-emerald-800 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl font-semibold"><i class="fa-solid fa-address-card ml-1"></i>حفظ في جوالي (.vcf)</button>
                </div>
            </div>
            <div class="flex gap-1.5">
                <input type="text" id="qr-manual-code-input" oninput="normalizeDigitsInInput(this)" placeholder="أدخل كود 88 أو رقم دولي لفتح الدردشة..." class="flex-1 bg-[#08101a] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono">
                <button type="button" onclick="connectFromQrOrCodeInput()" class="bg-[#164e63] hover:bg-[#1e6078] text-white px-3 py-1.5 rounded-xl text-xs font-semibold">فتح</button>
            </div>
        </div>
    </div>

    <div id="call-modal" class="hidden fixed inset-0 bg-[#070d14]/95 z-50 flex flex-col items-center justify-between p-4">
        <div class="text-center mt-1">
            <p class="text-xs text-teal-300 font-semibold">سند • اتصال ذكي ومباشر</p>
            <h2 id="call-peer-title" class="text-lg font-bold text-white mt-0.5">...</h2>
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
                <span id="call-mode-label" class="text-xs text-slate-300 font-medium">اتصال فوري عبر سند</span>
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
                    <span id="peer-dot" class="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.95)] shrink-0"></span>
                    <span id="peer-title" class="font-bold text-slate-100 truncate">خدمة العملاء</span>
                    <span id="peer-status" class="text-[11px] font-semibold text-emerald-300 shrink-0">متصل الآن</span>
                </div>
                <div class="flex items-center gap-2 shrink-0 text-[11px]">
                    <button type="button" onclick="launchCall('audio')" class="text-emerald-300 hover:text-emerald-200"><i class="fa-solid fa-phone"></i></button>
                    <button type="button" onclick="launchCall('video')" class="text-teal-200 hover:text-white"><i class="fa-solid fa-video"></i></button>
                    <button type="button" id="chat-block-btn" onclick="toggleBlockCurrentPeer()" class="text-amber-300 hover:text-amber-200 font-medium">حظر</button>
                    <button type="button" onclick="clearThreadMsgs()" class="text-rose-300 hover:text-rose-200 font-medium">مسح</button>
                </div>
            </div>

            <div id="msgs-box" class="flex-1 overflow-y-auto p-3.5 space-y-3 custom-scrollbar"></div>

            <div id="reply-preview-bar" class="hidden px-3.5 py-2 bg-[#0e2233] border-t border-teal-700/60 flex items-center justify-between gap-2 text-xs shrink-0">
                <div class="min-w-0 border-r-2 border-teal-400 pr-2">
                    <div id="reply-preview-author" class="font-bold text-teal-200 truncate">رد على رسالة</div>
                    <div id="reply-preview-text" class="text-slate-300 truncate">...</div>
                </div>
                <button type="button" onclick="clearReplyTarget()" class="text-slate-400 hover:text-white px-1.5"><i class="fa-solid fa-xmark"></i></button>
            </div>

            <div id="voice-rec-bar" class="hidden px-3.5 py-2 bg-[#102838] border-t border-teal-700/60 flex items-center justify-between gap-2 text-xs shrink-0">
                <div class="flex items-center gap-2 text-teal-200 font-semibold">
                    <span class="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
                    <span>جاري التسجيل الصوتي...</span>
                    <span id="voice-rec-timer" class="font-mono text-white">00:00</span>
                </div>
                <div class="flex items-center gap-1.5">
                    <button type="button" onclick="cancelVoiceRecording()" class="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg font-semibold">إلغاء</button>
                    <button type="button" onclick="finishVoiceRecordingAndSend()" class="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded-lg font-semibold"><i class="fa-solid fa-paper-plane ml-1"></i>إرسال</button>
                </div>
            </div>

            <div class="p-2.5 bg-[#0d1926] border-t border-slate-800 flex items-end gap-1.5 shrink-0">
                <input type="file" id="attach-file" class="hidden" onchange="onFilePicked(event)">
                <button type="button" onclick="document.getElementById('attach-file').click()" title="إرفاق ملف أو صورة" class="text-slate-300 hover:text-white p-2 rounded-xl hover:bg-slate-800 shrink-0"><i class="fa-solid fa-paperclip text-base"></i></button>
                <button type="button" id="mic-rec-btn" onclick="toggleVoiceRecording()" title="تسجيل صوتي" class="text-teal-300 hover:text-white bg-teal-950/70 hover:bg-teal-800 border border-teal-800/60 p-2 rounded-xl shrink-0 transition"><i class="fa-solid fa-microphone text-base"></i></button>
                <textarea id="msg-box-input" rows="1" oninput="autoResizeComposer(this)" onkeydown="if(event.key==='Enter' && !event.shiftKey){event.preventDefault();sendTextMsg();}" placeholder="اكتب رسالتك أو سجّل صوتك..." class="flex-1 bg-[#08101a] border border-slate-800 rounded-xl px-3 py-2 sanad-composer-font text-white placeholder-slate-400 focus:outline-none focus:border-teal-600 resize-none max-h-28 overflow-y-auto custom-scrollbar"></textarea>
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

        <!-- تبويب الحسابات -->
        <section id="pane-accounts" class="sanad-pane hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-4">
            <div class="bg-[#0d1926] border border-slate-800 p-4 rounded-2xl space-y-3">
                <div class="flex items-center justify-between">
                    <h2 class="text-sm font-bold text-teal-200">توليد الأكواد الحصرية (88...) وإدارة الحسابات</h2>
                    <span id="accounts-count-badge" class="text-[11px] font-mono text-slate-200 bg-slate-800 border border-slate-700 px-2.5 py-0.5 rounded-full">1 حساب</span>
                </div>
                <p class="text-[11px] text-slate-400">كل كود يبدأ بـ 88 يتم حجزه باسمك ولا يتكرر لمستخدم آخر.</p>
                <div class="flex flex-wrap gap-2">
                    <button type="button" onclick="generate88DigitCode()" class="bg-[#164e63] hover:bg-[#1e6078] text-white px-4 py-2.5 rounded-xl text-xs font-semibold">+ توليد كود حصري (8 أرقام يبدأ بـ 88)</button>
                    <button type="button" onclick="addCustom88OrId()" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 px-4 py-2.5 rounded-xl text-xs font-semibold">+ حجز/إدخال كود 88</button>
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

            <div class="bg-[#0d1926] border border-slate-800 p-4 rounded-2xl space-y-3 text-xs">
                <div class="flex items-center justify-between">
                    <h3 class="text-sm font-bold text-emerald-300"><i class="fa-solid fa-envelope-circle-check ml-1"></i> تفعيل رقم دولي عبر الإيميل (6 أرقام)</h3>
                    <span class="text-[10px] bg-emerald-950/80 text-emerald-200 border border-emerald-800/60 px-2 py-0.5 rounded-full">عبر الإيميل</span>
                </div>
                <div class="grid grid-cols-3 gap-2">
                    <input type="text" id="intl-cc-input" oninput="normalizeDigitsInInput(this)" value="+967" placeholder="+967" class="bg-[#08101a] border border-slate-800 rounded-xl px-3 py-2 font-mono text-white text-center">
                    <input type="text" id="intl-phone-input" oninput="normalizeDigitsInInput(this)" placeholder="رقم الجوال" class="col-span-2 bg-[#08101a] border border-slate-800 rounded-xl px-3 py-2 font-mono text-white">
                </div>
                <input type="email" id="intl-email-input" placeholder="البريد الإلكتروني لاستلام كود التحقق (6 أرقام)" class="w-full bg-[#08101a] border border-slate-800 rounded-xl px-3 py-2 text-white">
                <button type="button" onclick="requestSanadVerificationCode()" class="w-full bg-emerald-700 hover:bg-emerald-600 text-white py-2 px-3 rounded-xl font-semibold">إرسال رمز التحقق (6 أرقام) إلى الإيميل</button>
                <div id="otp-delivery-box" class="hidden bg-[#08101a] border border-teal-800/60 rounded-xl p-2.5 space-y-2">
                    <div id="otp-delivery-msg" class="text-[11px] text-teal-200 font-mono"></div>
                    <div class="flex gap-2">
                        <input type="text" id="otp-code-input" maxlength="6" oninput="normalizeDigitsInInput(this)" placeholder="أدخل الكود المكون من 6 أرقام" class="flex-1 bg-[#0d1926] border border-slate-700 rounded-xl px-3 py-1.5 font-mono text-white">
                        <button type="button" onclick="verifySanadPhoneCode()" class="bg-[#164e63] hover:bg-[#1e6078] text-white px-4 py-1.5 rounded-xl font-semibold">تأكيد وحفظ</button>
                    </div>
                </div>
            </div>
        </section>

        <!-- تبويب الجهات -->
        <section id="pane-contacts" class="sanad-pane hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-3">
            <div class="bg-[#0d1926] border border-slate-800 p-3.5 rounded-2xl space-y-2.5">
                <div class="flex items-center justify-between gap-2 flex-wrap">
                    <h2 class="text-sm font-bold text-teal-200">الجهات والأسماء المحفوظة</h2>
                    <div class="flex gap-1.5 flex-wrap">
                        <button type="button" onclick="importFromDeviceContactsPicker()" class="bg-teal-800 hover:bg-teal-700 text-white px-2.5 py-1 rounded-lg text-[11px] font-semibold"><i class="fa-solid fa-mobile-screen-button ml-1"></i>جلب من الجوال</button>
                        <button type="button" onclick="exportAllContactsVcf()" class="bg-emerald-800 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg text-[11px] font-semibold"><i class="fa-solid fa-address-book ml-1"></i>حفظ الكل (.vcf)</button>
                    </div>
                </div>
                <p class="text-[11px] text-slate-400">عند حفظ اسم الشخص يظهر باسمه فقط في الدردشة والمكالمات والإشعارات دون ازدحام.</p>
                <div class="flex flex-col sm:flex-row gap-2">
                    <input type="text" id="c-name" placeholder="اسم الشخص" class="bg-[#08101a] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                    <input type="text" id="c-id" oninput="normalizeDigitsInInput(this)" placeholder="كود 88... أو رقم الجوال" class="flex-1 bg-[#08101a] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono">
                    <button type="button" onclick="addContactAndSaveToPhone()" class="bg-[#164e63] hover:bg-[#1e6078] text-white px-4 py-2 rounded-xl text-xs font-semibold">حفظ الاسم والرقم</button>
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
                <p class="text-xs text-teal-200">منصة سند للاتصال والذكاء والمعرفة</p>
                <input type="text" id="call-input" oninput="normalizeDigitsInInput(this); onCallDialInput();" onkeydown="if(event.key==='Enter'){event.preventDefault();startDialedCall('audio');}" placeholder="اكتب الكود أو الرقم أو الاسم..." class="w-full max-w-md mx-auto bg-[#08101a] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-center font-mono text-white">
                <div id="call-resolved-preview" class="text-[11px] text-teal-200 font-semibold min-h-[18px]"></div>
                <div class="flex gap-3 justify-center pt-1 flex-wrap">
                    <button type="button" onclick="startDialedCall('audio')" class="bg-emerald-700 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2"><i class="fa-solid fa-phone"></i> مكالمة صوتية</button>
                    <button type="button" onclick="startDialedCall('video')" class="bg-[#164e63] hover:bg-[#1e6078] text-white px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2"><i class="fa-solid fa-video"></i> مكالمة فيديو</button>
                </div>
            </div>
        </section>

        <!-- تبويب الذكاء -->
        <section id="pane-ai" class="sanad-pane hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-3">
            <div class="bg-gradient-to-br from-[#133144] to-[#0d1926] border border-teal-700/60 p-4 rounded-2xl flex items-center gap-3">
                <img src="/icon-192.png" alt="سند" class="w-14 h-14 rounded-2xl border border-cyan-300/35 shrink-0">
                <div class="space-y-1 min-w-0">
                    <div class="flex items-center justify-between gap-2">
                        <span class="text-sm font-bold text-teal-200 truncate">سند • منصة اتصال ومعرفة للجميع</span>
                        <span class="text-[10px] font-mono bg-teal-950 text-teal-200 border border-teal-800 px-2 py-0.5 rounded-full shrink-0">v${APP_VERSION}</span>
                    </div>
                    <p class="text-xs text-slate-200">تواصل فوري، بث إذاعي ومحتوى قرآني وثقافي للجميع، وقراءة ذكية للأجواء والبحار.</p>
                </div>
            </div>

            <div class="bg-[#0d1926] border border-teal-700/60 p-4 rounded-2xl space-y-2.5 text-xs">
                <div class="flex items-center justify-between">
                    <h2 class="text-sm font-bold text-teal-200"><i class="fa-solid fa-cloud-arrow-down ml-1"></i> تحديثات النظام</h2>
                    <span id="update-ver-badge" class="text-[10px] font-mono bg-teal-950 text-teal-200 border border-teal-800 px-2.5 py-0.5 rounded-full">v${APP_VERSION}</span>
                </div>
                <p id="update-status-text" class="text-[11px] text-slate-300">النسخة المثبتة حالياً: v${APP_VERSION} -- يتم فحص التحديثات تلقائياً مع ظهور تنبيه أعلى الشاشة.</p>
                <div class="flex gap-2 flex-wrap">
                    <button type="button" onclick="checkForSystemUpdate(true)" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-teal-200 px-3 py-2 rounded-xl font-semibold">فحص التحديث</button>
                    <button type="button" onclick="applySystemUpdateNow()" class="bg-[#164e63] hover:bg-[#1e6078] text-white px-4 py-2 rounded-xl font-semibold"><i class="fa-solid fa-rotate ml-1"></i>تحديث النظام الآن</button>
                </div>
            </div>

            <!-- إذاعة سند -->
            <div class="bg-[#0d1926] border border-slate-800 p-4 rounded-2xl space-y-2.5 text-xs">
                <div class="flex items-center justify-between gap-2">
                    <h2 class="text-sm font-bold text-amber-300"><i class="fa-solid fa-radio ml-1"></i> إذاعة سند</h2>
                    <span id="radio-state-badge" class="text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-0.5 rounded-full">متوقف</span>
                </div>
                <p class="text-[11px] text-slate-400">تضم القائمة: إذاعة سند، القرآن الكريم، والقنوات الإخبارية. تدعم MP3 وM4A وMP4 مع انتقال آلي بين المقاطع.</p>
                <div class="flex gap-2 flex-wrap">
                    <select id="radio-station-select" onchange="onRadioStationChanged()" class="flex-1 bg-[#08101a] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                        <optgroup label="إذاعة سند">
                            <option value="sanad_main|إذاعة سند|LOCAL_SANAD|sanad">إذاعة سند</option>
                        </optgroup>
                        <optgroup label="القرآن الكريم">
                            <option value="quran_sa|القرآن الكريم -- السعودية|https://stream.radiojar.com/0tpy1h0kxtzuv|quran">القرآن الكريم -- السعودية</option>
                            <option value="quran_cairo|القرآن الكريم -- القاهرة|https://stream.radiojar.com/8s5u5tpdtwzuv|quran">القرآن الكريم -- القاهرة</option>
                            <option value="quran_tarateel|تلاوات مختارة وهادئة|https://qurango.net/radio/tarateel|quran">تلاوات مختارة وهادئة</option>
                        </optgroup>
                        <optgroup label="القنوات الإخبارية">
                            <option value="news_mcd|مونت كارلو الدولية (أخبار)|https://montecarlodoualiya128k.ice.infomaniak.ch/mc-doualiya.mp3|news">مونت كارلو الدولية (أخبار)</option>
                            <option value="news_bbc|بي بي سي عربي (BBC Arabic)|https://stream.live.vc.bbcmedia.co.uk/bbc_arabic_radio|news">بي بي سي عربي (BBC Arabic)</option>
                            <option value="news_sky_ar|متابعات إخبارية عربية|https://radio.skynewsarabia.com/stream/radio.mp3|news">متابعات إخبارية عربية</option>
                        </optgroup>
                    </select>
                    <button type="button" id="radio-toggle-btn" onclick="toggleSanadRadioFm()" class="bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl font-semibold"><i class="fa-solid fa-play ml-1"></i>تشغيل الراديو</button>
                </div>
                <div id="radio-ai-host-box" class="bg-[#08101a] border border-slate-800/90 rounded-xl p-2.5 text-[11px] text-teal-200">
                    الراديو في وضع الإيقاف ولن يستهلك أي بيانات حتى تضغط «تشغيل الراديو».
                </div>
            </div>

            <!-- نظام المواقيت والقرآن والأذان الحقيقي الآلي -->
            <div id="sanad-real-adhan-box" class="bg-[#0d1926] border border-emerald-800/60 p-4 rounded-2xl space-y-2.5 text-xs">
                <div class="flex items-center justify-between gap-2">
                    <h2 class="text-sm font-bold text-emerald-300"><i class="fa-solid fa-mosque ml-1"></i> القرآن والأذان الحقيقي الآلي</h2>
                    <span id="real-adhan-city-badge" class="text-[10px] font-mono bg-emerald-950 text-emerald-200 border border-emerald-800 px-2.5 py-0.5 rounded-full">عدن • مرتبط بمكة</span>
                </div>
                <p class="text-[11px] text-slate-400">تشغيل حقيقي للقرآن والأذان مع تقليب آلي حسب الوقت والجمعة والتهجد ورمضان.</p>

                <div class="flex gap-2 flex-wrap items-center">
                    <select id="real-adhan-city-select" onchange="loadRealPrayerSchedule()" class="flex-1 bg-[#08101a] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                        <optgroup label="اليمن (مرتبط بتوقيت ومواقيت مكة المكرمة)">
                            <option value="12.7855,45.0187|4|عدن • مرتبط بمكة">عدن • اليمن (مرتبط بمكة)</option>
                            <option value="15.3694,44.1910|4|صنعاء • مرتبط بمكة">صنعاء • اليمن (مرتبط بمكة)</option>
                            <option value="14.5426,49.1242|4|المكلا • مرتبط بمكة">المكلا • اليمن (مرتبط بمكة)</option>
                            <option value="14.7978,42.9545|4|الحديدة • مرتبط بمكة">الحديدة • اليمن (مرتبط بمكة)</option>
                        </optgroup>
                        <optgroup label="الحرمين الشريفين">
                            <option value="21.4225,39.8262|4|مكة المكرمة">مكة المكرمة (أم القرى)</option>
                            <option value="24.4672,39.6111|4|المدينة المنورة">المدينة المنورة</option>
                        </optgroup>
                        <optgroup label="مصر">
                            <option value="30.0444,31.2357|5|القاهرة • مصر">القاهرة • مصر</option>
                        </optgroup>
                    </select>

                    <label class="flex items-center gap-1.5 bg-[#08101a] border border-slate-800 px-3 py-2 rounded-xl text-[11px] text-slate-200 cursor-pointer">
                        <input type="checkbox" id="real-adhan-auto-switch" onchange="syncRealAdhanAutoStatus()">
                        <span>تقليب آلي</span>
                    </label>
                </div>

                <div class="flex gap-2 flex-wrap">
                    <button type="button" onclick="triggerRealQuranNow('تشغيل بث القرآن الكريم الحقيقي')" class="bg-emerald-800 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-[11px] font-semibold">
                        <i class="fa-solid fa-book-open ml-1"></i>قرآن حقيقي الآن
                    </button>
                    <button type="button" onclick="triggerRealAdhanNow('اختبار الأذان الحقيقي')" class="bg-[#164e63] hover:bg-[#1e6078] text-white px-3 py-1.5 rounded-xl text-[11px] font-semibold">
                        <i class="fa-solid fa-volume-high ml-1"></i>أذان حقيقي الآن
                    </button>
                </div>

                <div id="real-prayer-times-box" class="bg-[#08101a] border border-slate-800 rounded-xl p-2.5 text-[11px] text-slate-200 grid grid-cols-2 gap-1.5">
                    <div>جاري جلب مواقيت الصلاة...</div>
                </div>

                <div id="real-adhan-live-status" class="bg-[#08101a] border border-emerald-900/50 rounded-xl p-2.5 text-[11px] text-emerald-300 font-semibold">
                    النظام جاهز للتشغيل اليدوي أو التلقائي عند دخول أوقات الصلاة.
                </div>
            </div>

            <!-- لوحة الطقس والرياح والمد والجزر -->
            <div class="bg-[#0d1926] border border-slate-800 p-4 rounded-2xl space-y-2.5 text-xs">
                <div class="flex items-center justify-between gap-2">
                    <h2 class="text-sm font-bold text-sky-300"><i class="fa-solid fa-wind ml-1"></i> الطقس والرياح والمد والجزر</h2>
                    <span id="marine-city-badge" class="text-[10px] font-mono bg-sky-950 text-sky-200 border border-sky-800 px-2.5 py-0.5 rounded-full">مضيق باب المندب</span>
                </div>
                <div class="flex gap-2">
                    <select id="marine-spot-select" onchange="refreshWeatherAndMarine()" class="flex-1 bg-[#08101a] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                        <optgroup label="باب المندب والمخاء واليمن">
                            <option value="12.5833,43.3333|مضيق باب المندب">مضيق باب المندب</option>
                            <option value="13.3178,43.2431|المخاء • البحر الأحمر">المخاء • البحر الأحمر</option>
                            <option value="12.7855,45.0187|عدن • خليج عدن">عدن • خليج عدن</option>
                            <option value="14.7978,42.9545|الحديدة • البحر الأحمر">الحديدة • البحر الأحمر</option>
                        </optgroup>
                        <optgroup label="سواحل ومدن عربية">
                            <option value="21.4858,39.1925|جدة • البحر الأحمر">جدة • البحر الأحمر</option>
                            <option value="25.2048,55.2708|دبي • الخليج العربي">دبي • الخليج العربي</option>
                            <option value="31.2001,29.9187|الإسكندرية • المتوسط">الإسكندرية • المتوسط</option>
                            <option value="33.8938,35.5018|بيروت • شرق المتوسط">بيروت • شرق المتوسط</option>
                        </optgroup>
                        <optgroup label="مراكز عالمية مختارة">
                            <option value="51.5072,-0.1276|لندن • الأطلسي والتايمز">لندن • الأطلسي والتايمز</option>
                            <option value="40.7128,-74.0060|نيويورك • الساحل الأطلسي">نيويورك • الساحل الأطلسي</option>
                            <option value="35.6762,139.6503|طوكيو • خليج طوكيو">طوكيو • خليج طوكيو</option>
                        </optgroup>
                    </select>
                    <button type="button" onclick="refreshWeatherAndMarine()" class="bg-sky-800 hover:bg-sky-700 text-white px-3.5 py-2 rounded-xl font-semibold">تحديث</button>
                </div>
                <div id="marine-summary-box" class="bg-[#08101a] border border-slate-800 rounded-xl p-3 text-[11px] text-slate-200 space-y-1">
                    <div>جاري قراءة بيانات الطقس والرياح والمد والجزر...</div>
                </div>
            </div>

            <!-- النسخة الاحتياطية وسجل التحصيلات -->
            <div class="bg-[#0d1926] border border-slate-800 p-4 rounded-2xl space-y-3 text-xs">
                <div class="flex items-center justify-between">
                    <h2 class="text-sm font-bold text-emerald-300"><i class="fa-solid fa-database ml-1"></i> النسخة الاحتياطية وسجل التحصيلات</h2>
                    <span id="backup-history-badge" class="text-[10px] font-mono text-slate-300 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-full">0 نسخة</span>
                </div>
                <p class="text-[11px] text-slate-400">احفظ نسخة احتياطية كاملة واستعرض السجل مرتباً من الأحدث للأقدم مع عدد التحصيلات في كل نسخة.</p>
                <div class="flex gap-2 flex-wrap">
                    <button type="button" onclick="exportFullBackupJson()" class="bg-emerald-700 hover:bg-emerald-600 text-white px-3.5 py-2 rounded-xl font-semibold"><i class="fa-solid fa-file-export ml-1"></i>تصدير نسخة احتياطية</button>
                    <input type="file" id="import-backup-file" accept=".json,application/json" class="hidden" onchange="importFullBackupJson(event)">
                    <button type="button" onclick="document.getElementById('import-backup-file').click()" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-teal-200 px-3.5 py-2 rounded-xl font-semibold"><i class="fa-solid fa-file-import ml-1"></i>استيراد نسخة احتياطية</button>
                </div>
                <div id="backup-history-list" class="space-y-2 pt-1"></div>
            </div>

            <div class="bg-[#0d1926] border border-slate-800 p-4 rounded-2xl space-y-2.5 text-xs">
                <h3 class="text-sm font-bold text-teal-200"><i class="fa-solid fa-brain ml-1"></i> مساعد سند AI</h3>
                <div id="ai-log" class="bg-[#08101a] border border-slate-800 rounded-xl p-3 h-40 overflow-y-auto space-y-2 custom-scrollbar">
                    <div class="text-slate-400">مرحباً بك في مساعد سند الذكي (v${APP_VERSION}). اسألني عن أي موضوع وسأرد عليك فوراً.</div>
                </div>
                <div class="flex gap-2">
                    <input type="text" id="ai-q" onkeydown="if(event.key==='Enter')askSanadAI()" placeholder="اسأل مساعد سند AI عن أي شيء..." class="flex-1 bg-[#08101a] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
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
        var verifiedPhonesMap = {};
        var contacts = [{ name: DEFAULT_PEER, id: DEFAULT_PEER }];
        var blockedIdsSet = new Set();
        var sanadGroups = [];
        var unreadByThread = {};
        var backupRecordsHistory = [];
        var translationsByMsgId = {};
        var activeReplyTarget = null;
        var radioPlaying = false;
        var radioSessionSeq = 0;
        var radioStatusTimer = null;

        var REAL_ADHAN_AUDIO_SRC = '/sanad-adhan.mp3';
        var REAL_QURAN_STREAM_SRC = 'https://stream.radiojar.com/0tpy1h0kxtzuv';
        var realPrayerData = null;
        var realLastSlotTriggered = '';

        function getSanadSequenceTracks() {
            if (window.SANAD_RADIO_PLAYLIST && Array.isArray(window.SANAD_RADIO_PLAYLIST.tracks) && window.SANAD_RADIO_PLAYLIST.tracks.length) {
                return window.SANAD_RADIO_PLAYLIST.tracks.slice();
            }
            var list = [{ id: 'promo', title: 'برومو إذاعة سند', url: SANAD_LOCAL_RADIO_URL || '/sanad-radio-promo.mp3' }];
            if (Array.isArray(SANAD_SERVER_EXTRA_TRACKS)) {
                SANAD_SERVER_EXTRA_TRACKS.forEach(function(t) {
                    if (t && t.url) list.push({ id: t.id || ('srv-' + list.length), title: t.title || ('مقطع ' + list.length), url: t.url });
                });
            }
            return list;
        }

        function parseHhMmToMins(hhmm) {
            var p = String(hhmm || '').trim().slice(0, 5).split(':');
            if (p.length < 2) return -1;
            return (Number(p[0]) * 60) + Number(p[1]);
        }

        function setRealAdhanStatus(text) {
            var el = document.getElementById('real-adhan-live-status');
            if (el) el.textContent = text;
        }

        function syncRealAdhanAutoStatus() {
            var chk = document.getElementById('real-adhan-auto-switch');
            if (chk && chk.checked) {
                setRealAdhanStatus('التقليب الآلي مفعّل: يتحول تلقائياً للقرآن قبل الأذان وللأذان عند دخول الوقت.');
                checkRealAutoSchedule();
            } else {
                setRealAdhanStatus('التقليب الآلي متوقف حالياً؛ يمكنك التشغيل اليدوي في أي وقت.');
            }
        }

        function stopDevotionalAudio() {
            var devAud = document.getElementById('devotional-audio-el');
            if (devAud) {
                try {
                    devAud.pause();
                    devAud.loop = false;
                } catch (e) {}
            }
        }

        function triggerRealQuranNow(statusMsg) {
            if (radioPlaying && typeof stopRadioOnly === 'function') {
                radioPlaying = false;
                stopRadioOnly();
                syncRadioUi();
            }
            var devAud = document.getElementById('devotional-audio-el') || document.getElementById('radio-audio-el');
            setRealAdhanStatus(statusMsg || 'بث القرآن الكريم الحقيقي قيد التشغيل...');
            if (devAud && REAL_QURAN_STREAM_SRC) {
                devAud.muted = false;
                devAud.volume = 1.0;
                devAud.src = REAL_QURAN_STREAM_SRC;
                devAud.load();
                devAud.play().then(function() {
                    setRealAdhanStatus((statusMsg || 'بث القرآن الكريم الحقيقي') + ' -- يعمل الآن');
                }).catch(function() {
                    setRealAdhanStatus('اضغط مرة أخرى على زر «قرآن حقيقي الآن» لتأكيد الصوت في المتصفح.');
                });
            }
        }

        function triggerRealAdhanNow(prayerLabel) {
            if (radioPlaying && typeof stopRadioOnly === 'function') {
                radioPlaying = false;
                stopRadioOnly();
                syncRadioUi();
            }
            var devAud = document.getElementById('devotional-audio-el') || document.getElementById('radio-audio-el');
            setRealAdhanStatus('الله أكبر • الأذان الحقيقي: ' + (prayerLabel || 'وقت الصلاة'));
            if (devAud && REAL_ADHAN_AUDIO_SRC) {
                devAud.muted = false;
                devAud.volume = 1.0;
                devAud.src = REAL_ADHAN_AUDIO_SRC;
                devAud.load();
                devAud.play().catch(function() {
                    triggerRealQuranNow('تعذر العثور على ملف الأذان؛ تم تحويل البث إلى القرآن الحقيقي.');
                });
            }
        }

        function loadRealPrayerSchedule() {
            var sel = document.getElementById('real-adhan-city-select');
            var badge = document.getElementById('real-adhan-city-badge');
            var box = document.getElementById('real-prayer-times-box');
            if (!sel) return;

            var parts = sel.value.split('|');
            var coords = (parts[0] || '12.7855,45.0187').split(',');
            var method = parts[1] || '4';
            var cityTitle = parts[2] || 'عدن';
            if (badge) badge.textContent = cityTitle;

            var url = 'https://api.aladhan.com/v1/timings?latitude=' + encodeURIComponent(coords[0]) +
                      '&longitude=' + encodeURIComponent(coords[1]) + '&method=' + encodeURIComponent(method);

            fetch(url)
                .then(function(r) { return r.json(); })
                .then(function(res) {
                    var d = res && res.data ? res.data : null;
                    var t = d && d.timings ? d.timings : null;
                    if (!t) return;

                    var isFriday = (new Date().getDay() === 5);
                    var hijriMonth = (d.date && d.date.hijri && d.date.hijri.month && d.date.hijri.month.number) || 0;

                    realPrayerData = {
                        Fajr: String(t.Fajr || '').slice(0, 5),
                        Dhuhr: String(t.Dhuhr || '').slice(0, 5),
                        Asr: String(t.Asr || '').slice(0, 5),
                        Maghrib: String(t.Maghrib || '').slice(0, 5),
                        Isha: String(t.Isha || '').slice(0, 5),
                        Lastthird: String(t.Lastthird || '').slice(0, 5),
                        isFriday: isFriday,
                        isRamadan: (hijriMonth === 9)
                    };

                    if (box) {
                        var dhuhrName = isFriday ? 'الجمعة' : 'الظهر';
                        box.innerHTML =
                            '<div>الفجر: <b class="text-teal-200">' + toWesternDigits(realPrayerData.Fajr) + '</b></div>' +
                            '<div>' + dhuhrName + ': <b class="text-teal-200">' + toWesternDigits(realPrayerData.Dhuhr) + '</b></div>' +
                            '<div>العصر: <b class="text-teal-200">' + toWesternDigits(realPrayerData.Asr) + '</b></div>' +
                            '<div>المغرب' + (realPrayerData.isRamadan ? ' (إفطار رمضان)' : '') + ': <b class="text-teal-200">' + toWesternDigits(realPrayerData.Maghrib) + '</b></div>' +
                            '<div>العشاء: <b class="text-teal-200">' + toWesternDigits(realPrayerData.Isha) + '</b></div>' +
                            '<div>التهجد: <b class="text-emerald-300">' + toWesternDigits(realPrayerData.Lastthird) + '</b></div>';
                    }
                    checkRealAutoSchedule();
                })
                .catch(function() {
                    if (box) box.innerHTML = '<div class="col-span-2 text-amber-300">تعذر جلب المواقيت الآن؛ سيعاد المحاولة تلقائياً.</div>';
                });
        }

        function checkRealAutoSchedule() {
            var chk = document.getElementById('real-adhan-auto-switch');
            if (!chk || !chk.checked || !realPrayerData) return;

            var now = new Date();
            var nowMins = now.getHours() * 60 + now.getMinutes();
            var dayStamp = now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate();

            var list = [
                { key: 'Fajr', label: 'الفجر', mins: parseHhMmToMins(realPrayerData.Fajr) },
                { key: 'Dhuhr', label: realPrayerData.isFriday ? 'الجمعة' : 'الظهر', mins: parseHhMmToMins(realPrayerData.Dhuhr) },
                { key: 'Asr', label: 'العصر', mins: parseHhMmToMins(realPrayerData.Asr) },
                { key: 'Maghrib', label: realPrayerData.isRamadan ? 'المغرب (إفطار رمضان)' : 'المغرب', mins: parseHhMmToMins(realPrayerData.Maghrib) },
                { key: 'Isha', label: 'العشاء', mins: parseHhMmToMins(realPrayerData.Isha) }
            ];

            for (var i = 0; i < list.length; i++) {
                var item = list[i];
                if (item.mins < 0) continue;

                if (nowMins === item.mins) {
                    var adhanSlot = dayStamp + '-adhan-' + item.key;
                    if (realLastSlotTriggered !== adhanSlot) {
                        realLastSlotTriggered = adhanSlot;
                        triggerRealAdhanNow(item.label);
                    }
                    return;
                }

                if (nowMins === item.mins - 5) {
                    var preSlot = dayStamp + '-pre-' + item.key;
                    if (realLastSlotTriggered !== preSlot) {
                        realLastSlotTriggered = preSlot;
                        triggerRealQuranNow('قبل أذان ' + item.label + ' بـ 5 دقائق • تلاوة قرآنية حقيقية');
                    }
                    return;
                }
            }

            var tahMins = parseHhMmToMins(realPrayerData.Lastthird);
            if (tahMins >= 0 && nowMins === tahMins) {
                var tahSlot = dayStamp + '-tahajjud';
                if (realLastSlotTriggered !== tahSlot) {
                    realLastSlotTriggered = tahSlot;
                    triggerRealQuranNow('وقت التهجد (الثلث الأخير من الليل) • بث قرآن حقيقي');
                }
            }
        }

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
        var pendingDeleteMsgId = null;
        var ws = null;
        var reconnectTimer = null;
        var pollInFlight = false;
        var lastSyncCursor = 0;

        var mediaRecorderInstance = null;
        var audioRecordChunks = [];
        var audioRecordStream = null;
        var voiceRecInterval = null;
        var voiceRecSeconds = 0;
        var voiceRecordCancelled = false;

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
        function digitsOnlyKey(v) { return toWesternDigits(String(v || '')).replace(/[^0-9]/g, ''); }

        function resolveContactName(rawId) {
            var clean = cleanIdValue(rawId);
            if (!clean) return '';
            var exact = contacts.find(function(c) { return normalizeStr(c.id) === normalizeStr(clean); });
            if (exact && exact.name) return exact.name;
            var dKey = digitsOnlyKey(clean);
            if (dKey.length >= 6) {
                var byDigits = contacts.find(function(c) {
                    var cd = digitsOnlyKey(c.id);
                    return cd && (cd === dKey || cd.endsWith(dKey) || dKey.endsWith(cd));
                });
                if (byDigits && byDigits.name) return byDigits.name;
            }
            return clean;
        }

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
                copyToastTimer = setTimeout(function() { t.classList.add('hidden'); }, 2200);
            }
        }

        function refreshWeatherAndMarine() {
            var sel = document.getElementById('marine-spot-select');
            var badge = document.getElementById('marine-city-badge');
            var box = document.getElementById('marine-summary-box');
            if (!sel || !box) return;
            var parts = sel.value.split('|');
            var coords = (parts[0] || '12.5833,43.3333').split(',');
            var lat = coords[0];
            var lon = coords[1];
            var spotLabel = parts[1] || 'مضيق باب المندب';
            if (badge) badge.textContent = spotLabel;
            box.innerHTML = '<div>جاري تحديث قراءة الطقس والرياح وحركة المد والموج...</div>';

            var weatherUrl = 'https://api.open-meteo.com/v1/forecast?latitude=' + encodeURIComponent(lat) + '&longitude=' + encodeURIComponent(lon) + '&current=temperature_2m,wind_speed_10m,wind_direction_10m';
            var marineUrl = 'https://marine-api.open-meteo.com/v1/marine?latitude=' + encodeURIComponent(lat) + '&longitude=' + encodeURIComponent(lon) + '&current=wave_height,swell_wave_height,wind_wave_direction';

            Promise.all([
                fetch(weatherUrl).then(function(r) { return r.ok ? r.json() : null; }).catch(function() { return null; }),
                fetch(marineUrl).then(function(r) { return r.ok ? r.json() : null; }).catch(function() { return null; })
            ]).then(function(resArr) {
                var wData = resArr[0] && resArr[0].current ? resArr[0].current : null;
                var mData = resArr[1] && resArr[1].current ? resArr[1].current : null;
                var tempTxt = wData && typeof wData.temperature_2m === 'number' ? (toWesternDigits(wData.temperature_2m) + '°C') : 'معتدل';
                var windTxt = wData && typeof wData.wind_speed_10m === 'number' ? (toWesternDigits(wData.wind_speed_10m) + ' كم/س') : 'خفيفة إلى معتدلة';
                var waveTxt = mData && typeof mData.wave_height === 'number' ? (toWesternDigits(mData.wave_height) + ' م') : 'هادئ إلى خفيف';
                var tidePhase = (new Date().getHours() % 12 < 6) ? 'اتجاه نحو المد' : 'اتجاه نحو الجزر';

                box.innerHTML =
                    '<div>• <b>الطقس والحرارة:</b> ' + escapeHtml(tempTxt) + '</div>' +
                    '<div>• <b>الرياح:</b> ' + escapeHtml(windTxt) + '</div>' +
                    '<div>• <b>الموج والمد والجزر:</b> ارتفاع الموج ' + escapeHtml(waveTxt) + ' • ' + escapeHtml(tidePhase) + '</div>';
            });
        }

        function setReplyTarget(msgId) {
            var list = getThreadMap()[currentPeer] || [];
            var m = list.find(function(item) { return item && item.id === msgId; });
            if (!m) return;
            var author = m.from === 'me' ? 'أنت' : (resolveContactName(m.senderName || currentPeer) || currentPeer);
            var snippet = m.text ? String(m.text).slice(0, 90) : (m.kind === 'audio' ? 'رسالة صوتية' : (m.fileName || 'مرفق'));
            activeReplyTarget = {
                id: m.id,
                author: author,
                snippet: snippet
            };
            var bar = document.getElementById('reply-preview-bar');
            var aEl = document.getElementById('reply-preview-author');
            var tEl = document.getElementById('reply-preview-text');
            if (aEl) aEl.textContent = 'رد على ' + author;
            if (tEl) tEl.textContent = snippet;
            if (bar) bar.classList.remove('hidden');
            var inp = document.getElementById('msg-box-input');
            if (inp) inp.focus();
        }

        function clearReplyTarget() {
            activeReplyTarget = null;
            var bar = document.getElementById('reply-preview-bar');
            if (bar) bar.classList.add('hidden');
        }

        function translateChatMessage(msgId) {
            var list = getThreadMap()[currentPeer] || [];
            var m = list.find(function(item) { return item && item.id === msgId && item.text; });
            if (!m || !m.text) return;
            var isArabic = /[\u0600-\u06FF]/.test(m.text);
            var targetLang = isArabic ? 'en' : 'ar';
            translationsByMsgId[msgId] = 'جاري الترجمة...';
            renderMsgs();

            fetch('/api/ai/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: m.text, targetLang: targetLang })
            })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                translationsByMsgId[msgId] = (data && data.translated) ? data.translated : m.text;
                renderMsgs();
            })
            .catch(function() {
                translationsByMsgId[msgId] = m.text;
                renderMsgs();
            });
        }

        function getSelectedRadioInfo() {
            var sel = document.getElementById('radio-station-select');
            var raw = sel ? sel.value : 'sanad_main|إذاعة سند|LOCAL_SANAD|sanad';
            var parts = raw.split('|');
            var urlVal = parts[2] || '';
            if ((parts[0] || '') === 'sanad_main' && SANAD_LOCAL_RADIO_URL) {
                urlVal = SANAD_LOCAL_RADIO_URL;
            }
            return {
                id: parts[0] || 'sanad_main',
                name: parts[1] || 'إذاعة سند',
                url: urlVal,
                category: parts[3] || 'sanad'
            };
        }

        function setRadioBoxMessage(msg) {
            var hostBox = document.getElementById('radio-ai-host-box');
            if (hostBox) hostBox.textContent = msg;
        }

        function stopRadioOnly() {
            radioSessionSeq += 1;
            clearTimeout(radioStatusTimer);
            radioStatusTimer = null;

            var aud = document.getElementById('radio-audio-el');
            if (aud) {
                aud.onerror = null;
                aud.onstalled = null;
                aud.onplaying = null;
                aud.onended = null;
                try {
                    aud.pause();
                    aud.loop = false;
                } catch (e) {}
            }
            var vid = document.getElementById('radio-mp4-el');
            if (vid) {
                vid.onerror = null;
                vid.onplaying = null;
                vid.onended = null;
                try {
                    vid.pause();
                    vid.loop = false;
                } catch (e) {}
            }
        }

        function stopAllRadioPlayback() {
            stopRadioOnly();
            stopDevotionalAudio();
        }

        function syncRadioUi() {
            var badge = document.getElementById('radio-state-badge');
            var btn = document.getElementById('radio-toggle-btn');
            if (badge) {
                badge.textContent = radioPlaying ? 'يعمل الآن' : 'متوقف';
                badge.className = radioPlaying
                    ? 'text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-700 px-2.5 py-0.5 rounded-full'
                    : 'text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-0.5 rounded-full';
            }
            if (btn) {
                btn.innerHTML = radioPlaying
                    ? '<i class="fa-solid fa-stop ml-1"></i>إيقاف الراديو'
                    : '<i class="fa-solid fa-play ml-1"></i>تشغيل الراديو';
                btn.className = radioPlaying
                    ? 'bg-rose-700 hover:bg-rose-600 text-white px-4 py-2 rounded-xl font-semibold'
                    : 'bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl font-semibold';
            }
        }

        function playSanadSequenceFromIndex(tracks, idx, sessionId) {
            if (!radioPlaying || sessionId !== radioSessionSeq) return;
            if (!Array.isArray(tracks) || !tracks.length) return;
            var safeIdx = ((idx % tracks.length) + tracks.length) % tracks.length;
            var tr = tracks[safeIdx];
            if (!tr || !tr.url) return;

            var isMp4 = /\.mp4(\?.*)?$/i.test(tr.url);
            var player = isMp4 ? (document.getElementById('radio-mp4-el') || document.getElementById('radio-audio-el')) : document.getElementById('radio-audio-el');
            if (!player) return;

            var labelPrefix = 'إذاعة سند (' + toWesternDigits(safeIdx + 1) + '/' + toWesternDigits(tracks.length) + ') • ' + tr.title;
            setRadioBoxMessage(labelPrefix);

            player.loop = false;
            player.onplaying = function() {
                if (!radioPlaying || sessionId !== radioSessionSeq) return;
                setRadioBoxMessage(labelPrefix + ' -- بث متواصل');
            };
            player.onended = function() {
                if (!radioPlaying || sessionId !== radioSessionSeq) return;
                playSanadSequenceFromIndex(tracks, safeIdx + 1, sessionId);
            };
            player.onerror = function() {
                if (!radioPlaying || sessionId !== radioSessionSeq) return;
                if (tracks.length > 1) {
                    playSanadSequenceFromIndex(tracks, safeIdx + 1, sessionId);
                } else {
                    setRadioBoxMessage('تعذر تحميل مقطع الإذاعة («' + tr.url + '»)؛ تأكد من وجود ملف الصوت في الجذر.');
                }
            };

            try {
                player.pause();
                player.muted = false;
                player.volume = 1.0;
                player.src = tr.url;
                player.load();
                var p = player.play();
                if (p && typeof p.catch === 'function') {
                    p.catch(function() {
                        if (!radioPlaying || sessionId !== radioSessionSeq) return;
                        if (tracks.length > 1) {
                            playSanadSequenceFromIndex(tracks, safeIdx + 1, sessionId);
                        } else {
                            setRadioBoxMessage('تعذر بدء التشغيل التلقائي للمقطع؛ اضغط «تشغيل الراديو» مرة أخرى.');
                        }
                    });
                }
            } catch (e) {}
        }

        function applyRadioAudioSource(info) {
            stopDevotionalAudio();
            stopRadioOnly();
            var sessionId = radioSessionSeq;
            if (!info || !radioPlaying) return;

            if (info.id === 'sanad_main') {
                var tracks = getSanadSequenceTracks();
                playSanadSequenceFromIndex(tracks, 0, sessionId);
                return;
            }

            var aud = document.getElementById('radio-audio-el');
            setRadioBoxMessage('جاري الاتصال بالقناة: «' + info.name + '»...');
            radioStatusTimer = setTimeout(function() {
                if (!radioPlaying || sessionId !== radioSessionSeq) return;
                if (aud && aud.paused) {
                    setRadioBoxMessage('«' + info.name + '» • المصدر الخارجي يستغرق وقتاً أو غير متاح حالياً، جرّب قناة أخرى من القائمة.');
                }
            }, 6500);

            if (aud && info.url) {
                aud.loop = false;
                aud.onplaying = function() {
                    clearTimeout(radioStatusTimer);
                    if (!radioPlaying || sessionId !== radioSessionSeq) return;
                    setRadioBoxMessage('على الهواء الآن: «' + info.name + '»');
                };
                aud.onerror = function() {
                    clearTimeout(radioStatusTimer);
                    if (!radioPlaying || sessionId !== radioSessionSeq) return;
                    setRadioBoxMessage('تعذر تشغيل «' + info.name + '» من المصدر الخارجي؛ يمكنك اختيار قناة أخرى من القائمة.');
                };
                try {
                    aud.pause();
                    aud.muted = false;
                    aud.volume = 1.0;
                    aud.src = info.url;
                    aud.load();
                    var p2 = aud.play();
                    if (p2 && typeof p2.catch === 'function') {
                        p2.catch(function() {
                            clearTimeout(radioStatusTimer);
                            if (!radioPlaying || sessionId !== radioSessionSeq) return;
                            setRadioBoxMessage('تعذر تشغيل «' + info.name + '» من المصدر الخارجي؛ يمكنك اختيار قناة أخرى من القائمة.');
                        });
                    }
                } catch (e) {
                    setRadioBoxMessage('تعذر تشغيل «' + info.name + '»؛ جرّب قناة أخرى من القائمة.');
                }
            }
        }

        function toggleSanadRadioFm() {
            var info = getSelectedRadioInfo();
            if (radioPlaying) {
                radioPlaying = false;
                stopAllRadioPlayback();
                syncRadioUi();
                setRadioBoxMessage('الراديو في وضع الإيقاف ولن يستهلك أي بيانات حتى تضغط «تشغيل الراديو».');
                copyStringToClipboard('', 'تم إيقاف الراديو');
                return;
            }
            radioPlaying = true;
            syncRadioUi();
            applyRadioAudioSource(info);
        }

        function onRadioStationChanged() {
            var info = getSelectedRadioInfo();
            if (!radioPlaying) return;
            applyRadioAudioSource(info);
        }

        function computeBackupCounts(snapshotObj) {
            var snap = snapshotObj || {};
            var cList = Array.isArray(snap.contacts) ? snap.contacts.filter(function(c) { return c && c.id !== DEFAULT_PEER; }) : [];
            var aList = Array.isArray(snap.myAccts) ? snap.myAccts : [];
            var gList = Array.isArray(snap.sanadGroups) ? snap.sanadGroups : [];
            var bList = Array.isArray(snap.blockedIds) ? snap.blockedIds : [];
            var msgTotal = 0;
            var threadsObj = snap.acctThreads || {};
            Object.keys(threadsObj).forEach(function(acctKey) {
                var tMap = threadsObj[acctKey] || {};
                Object.keys(tMap).forEach(function(peerKey) {
                    var arr = Array.isArray(tMap[peerKey]) ? tMap[peerKey] : [];
                    msgTotal += arr.filter(function(m) { return m && !m.deleted && String(m.id || '').indexOf('init-') !== 0; }).length;
                });
            });
            return {
                contacts: cList.length,
                accounts: aList.length,
                messages: msgTotal,
                groups: gList.length,
                blocked: bList.length
            };
        }

        function buildCurrentBackupPayload() {
            persistState();
            var payload = {
                app: 'Sanad AI',
                version: CLIENT_APP_VERSION,
                exportedAt: new Date().toISOString(),
                activeAcct: activeAcct,
                myAccts: myAccts.slice(),
                verifiedPhones: Object.assign({}, verifiedPhonesMap),
                contacts: contacts.slice(),
                blockedIds: Array.from(blockedIdsSet),
                sanadGroups: sanadGroups.slice(),
                acctThreads: JSON.parse(JSON.stringify(acctThreads || {}))
            };
            payload.counts = computeBackupCounts(payload);
            return payload;
        }

        function recordBackupInHistory(sourceLabel, payloadObj) {
            var counts = payloadObj.counts || computeBackupCounts(payloadObj);
            var rec = {
                id: 'bk-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
                createdAt: new Date().toLocaleString('ar'),
                ts: Date.now(),
                source: sourceLabel || 'نسخة يدوية',
                counts: counts,
                snapshot: payloadObj
            };
            backupRecordsHistory.unshift(rec);
            if (backupRecordsHistory.length > 15) backupRecordsHistory = backupRecordsHistory.slice(0, 15);
            persistState();
            renderBackupHistoryList();
        }

        function renderBackupHistoryList() {
            var box = document.getElementById('backup-history-list');
            var badge = document.getElementById('backup-history-badge');
            var sorted = backupRecordsHistory.slice().sort(function(a, b) { return (b.ts || 0) - (a.ts || 0); });
            if (badge) badge.textContent = toWesternDigits(sorted.length) + (sorted.length === 1 ? ' نسخة' : ' نسخ');
            if (!box) return;
            if (!sorted.length) {
                box.innerHTML = '<div class="text-[11px] text-slate-500">لا توجد نسخ مسجلة في السجل بعد. اضغط «تصدير نسخة احتياطية» لتسجيل نسخة وحساب التحصيلات.</div>';
                return;
            }
            box.innerHTML = sorted.map(function(item, idx) {
                var c = item.counts || {};
                var orderNum = toWesternDigits(idx + 1);
                return '<div class="bg-[#08101a] border border-slate-800 rounded-xl p-2.5 space-y-1.5">' +
                    '<div class="flex items-center justify-between gap-2">' +
                    '<span class="font-bold text-teal-200">#' + orderNum + ' • ' + escapeHtml(item.source) + '</span>' +
                    '<span class="text-[10px] font-mono text-slate-400">' + escapeHtml(item.createdAt) + '</span>' +
                    '</div>' +
                    '<div class="text-[11px] text-slate-200 flex flex-wrap gap-2">' +
                    '<span>الجهات: <b class="text-emerald-300">' + toWesternDigits(c.contacts || 0) + '</b></span>' +
                    '<span>• الرسائل: <b class="text-emerald-300">' + toWesternDigits(c.messages || 0) + '</b></span>' +
                    '<span>• الحسابات: <b class="text-emerald-300">' + toWesternDigits(c.accounts || 0) + '</b></span>' +
                    '<span>• المجموعات: <b class="text-emerald-300">' + toWesternDigits(c.groups || 0) + '</b></span>' +
                    '<span>• المحظورون: <b class="text-rose-300">' + toWesternDigits(c.blocked || 0) + '</b></span>' +
                    '</div>' +
                    '<div class="flex justify-end">' +
                    '<button type="button" onclick="restoreBackupByRecordId(\'' + escapeJsSingle(item.id) + '\')" class="bg-[#164e63] hover:bg-[#1e6078] text-white px-2.5 py-1 rounded-lg text-[11px] font-semibold">استعادة هذه النسخة</button>' +
                    '</div></div>';
            }).join('');
        }

        function applyBackupSnapshot(data) {
            if (!data || typeof data !== 'object') return;
            if (Array.isArray(data.myAccts) && data.myAccts.length) {
                myAccts = Array.from(new Set(myAccts.concat(data.myAccts.map(cleanIdValue).filter(Boolean))));
            }
            if (data.activeAcct) activeAcct = cleanIdValue(data.activeAcct) || activeAcct;
            if (data.verifiedPhones && typeof data.verifiedPhones === 'object') {
                verifiedPhonesMap = Object.assign({}, verifiedPhonesMap, data.verifiedPhones);
            }
            if (Array.isArray(data.contacts)) {
                data.contacts.forEach(function(c) {
                    if (!c || !c.id) return;
                    var idx = contacts.findIndex(function(x) { return normalizeStr(x.id) === normalizeStr(c.id); });
                    if (idx !== -1) contacts[idx] = { name: c.name || c.id, id: cleanIdValue(c.id) };
                    else contacts.push({ name: c.name || c.id, id: cleanIdValue(c.id) });
                });
            }
            if (Array.isArray(data.blockedIds)) {
                data.blockedIds.forEach(function(b) { if (normalizeStr(b)) blockedIdsSet.add(normalizeStr(b)); });
            }
            if (Array.isArray(data.sanadGroups)) {
                data.sanadGroups.forEach(function(g) {
                    if (g && g.id && !sanadGroups.some(function(x) { return x.id === g.id; })) sanadGroups.push(g);
                });
            }
            if (data.acctThreads && typeof data.acctThreads === 'object') {
                Object.keys(data.acctThreads).forEach(function(ownerKey) {
                    if (!acctThreads[ownerKey]) acctThreads[ownerKey] = {};
                    Object.keys(data.acctThreads[ownerKey] || {}).forEach(function(peerKey) {
                        var incomingList = data.acctThreads[ownerKey][peerKey] || [];
                        var existingList = acctThreads[ownerKey][peerKey] || [];
                        var existingIds = new Set(existingList.map(function(m) { return m && m.id; }));
                        incomingList.forEach(function(m) {
                            if (m && m.id && !existingIds.has(m.id)) existingList.push(m);
                        });
                        acctThreads[ownerKey][peerKey] = existingList;
                    });
                });
            }
            persistState();
            renderActiveHeaderAcct();
            renderAccts();
            renderPresence();
            renderBlockedList();
            renderGroupsList();
            renderQuickChips();
            renderPeerHeader();
            renderMsgs();
            renderBackupHistoryList();
            syncPresenceNow();
        }

        function restoreBackupByRecordId(recId) {
            var found = backupRecordsHistory.find(function(r) { return r && r.id === recId; });
            if (!found || !found.snapshot) return;
            applyBackupSnapshot(found.snapshot);
            copyStringToClipboard('', 'تمت استعادة النسخة الاحتياطية من السجل');
        }

        function speakMessageText(msgId) {
            var list = getThreadMap()[currentPeer] || [];
            var target = list.find(function(m) { return m && m.id === msgId; });
            var textToSpeak = target && target.text ? String(target.text).trim() : '';
            if (!textToSpeak) return copyStringToClipboard('', 'لا يوجد نص مقروء في هذه الرسالة');
            if (!('speechSynthesis' in window)) {
                return copyStringToClipboard('', 'ميزة القراءة الصوتية غير مدعومة في هذا المتصفح');
            }
            try {
                window.speechSynthesis.cancel();
                var utter = new SpeechSynthesisUtterance(textToSpeak);
                utter.lang = /[\u0600-\u06FF]/.test(textToSpeak) ? 'ar' : 'en-US';
                utter.rate = 1.0;
                window.speechSynthesis.speak(utter);
                copyStringToClipboard('', 'جاري قراءة الرسالة صوتياً...');
            } catch (e) {
                copyStringToClipboard('', 'تعذر تشغيل القراءة الصوتية');
            }
        }

        function openDeleteMsgModal(msgId) {
            pendingDeleteMsgId = msgId;
            var modal = document.getElementById('delete-msg-modal');
            if (modal) modal.classList.remove('hidden');
        }

        function closeDeleteMsgModal() {
            pendingDeleteMsgId = null;
            var modal = document.getElementById('delete-msg-modal');
            if (modal) modal.classList.add('hidden');
        }

        function confirmDeleteMessage(scope) {
            var targetId = pendingDeleteMsgId;
            closeDeleteMsgModal();
            if (!targetId) return;

            var list = ensureThreadEntry(activeAcct, currentPeer);
            var idx = list.findIndex(function(m) { return m && m.id === targetId; });
            if (idx !== -1) {
                list.splice(idx, 1);
                persistState();
                renderMsgs();
            }

            if (scope === 'everyone' && currentPeer && currentPeer !== DEFAULT_PEER) {
                var grp = sanadGroups.find(function(g) { return normalizeStr(g.id) === normalizeStr(currentPeer); });
                var targets = grp ? grp.members.filter(function(x) { return normalizeStr(x) !== normalizeStr(activeAcct); }) : [currentPeer];
                targets.forEach(function(t) {
                    sendPacketWithFallback({
                        type: 'delete_message',
                        eventId: 'del-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
                        from: activeAcct,
                        to: cleanIdValue(t),
                        groupId: grp ? grp.id : null,
                        msgId: targetId
                    });
                });
                copyStringToClipboard('', 'تم الحذف النهائي للجميع');
            } else {
                copyStringToClipboard('', 'تم الحذف النهائي لك');
            }
        }

        function exportFullBackupJson() {
            var payload = buildCurrentBackupPayload();
            recordBackupInHistory('تصدير JSON', payload);
            var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'sanad-backup-' + toWesternDigits(Date.now()) + '.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(function() { URL.revokeObjectURL(url); }, 1200);
            copyStringToClipboard('', 'تم تصدير النسخة الاحتياطية وتسجيلها في السجل');
        }

        function importFullBackupJson(ev) {
            var file = ev && ev.target && ev.target.files && ev.target.files[0];
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function() {
                try {
                    var data = JSON.parse(String(reader.result || '{}'));
                    data.counts = computeBackupCounts(data);
                    recordBackupInHistory('استيراد ملف', data);
                    applyBackupSnapshot(data);
                    copyStringToClipboard('', 'تم استيراد النسخة الاحتياطية بنجاح');
                } catch (err) {
                    copyStringToClipboard('', 'ملف النسخة الاحتياطية غير صالح');
                }
            };
            reader.readAsText(file);
            ev.target.value = '';
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
            playChimeSound();
            if (!('Notification' in window)) {
                syncNotificationBadge();
                return copyStringToClipboard('', 'التنبيهات الداخلية مفعّلة في هذا المتصفح');
            }
            if (Notification.permission === 'granted') {
                syncNotificationBadge();
                try { new Notification('سند', { body: 'الإشعارات مفعّلة وجاهزة.' }); } catch (e) {}
                return copyStringToClipboard('', 'إشعارات النظام مفعّلة');
            }
            if (Notification.permission === 'denied') {
                syncNotificationBadge();
                return copyStringToClipboard('', 'الإشعارات محظورة من إعدادات المتصفح؛ فعّلها من إعدادات الموقع');
            }
            Notification.requestPermission().then(function(perm) {
                syncNotificationBadge();
                if (perm === 'granted') {
                    try { new Notification('سند', { body: 'تم تفعيل إشعارات سند بنجاح.' }); } catch (e) {}
                    copyStringToClipboard('', 'تم تفعيل الإشعارات بنجاح');
                } else {
                    copyStringToClipboard('', 'لم يتم منح إذن الإشعارات');
                }
            }).catch(function() {
                copyStringToClipboard('', 'تعذر طلب صلاحية الإشعارات');
            });
        }

        function triggerSystemNotification(title, body) {
            playChimeSound();
            if ('Notification' in window && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
                try { new Notification(title || 'سند', { body: body || '' }); } catch (e) {}
            }
        }

        function refreshUpdateStatusInAi() {
            var st = document.getElementById('update-status-text');
            if (st) st.textContent = 'النسخة المثبتة حالياً: v' + CLIENT_APP_VERSION + ' -- يتم فحص التحديثات تلقائياً مع ظهور تنبيه أعلى الشاشة.';
        }

        function showAutoUpdateBanner(newVer) {
            var banner = document.getElementById('auto-update-banner');
            var txt = document.getElementById('auto-update-banner-text');
            if (txt) txt.textContent = 'يتوفر إصدار أحدث (v' + newVer + ') -- اضغط للتحديث الآن.';
            if (banner) banner.classList.remove('hidden');
        }

        function checkForSystemUpdate(showNotice) {
            var st = document.getElementById('update-status-text');
            if (st && showNotice) st.textContent = 'جاري فحص التحديث من السيرفر...';
            fetch('/healthz?t=' + Date.now(), { cache: 'no-store' })
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    var srvVer = (data && data.version) ? String(data.version) : CLIENT_APP_VERSION;
                    if (srvVer && srvVer !== CLIENT_APP_VERSION) {
                        showAutoUpdateBanner(srvVer);
                        if (st) st.textContent = 'يتوفر تحديث جديد v' + srvVer + ' -- اضغط «تحديث النظام الآن».';
                    } else if (st && showNotice) {
                        st.textContent = 'النظام على أحدث إصدار (v' + srvVer + ') ويمكنك التحديث في أي وقت.';
                        copyStringToClipboard('', 'النظام محدّث إلى v' + srvVer);
                    }
                })
                .catch(function() {
                    if (st && showNotice) st.textContent = 'تعذر الاتصال بالسيرفر لفحص التحديث حالياً.';
                });
        }

        function applySystemUpdateNow() {
            var st = document.getElementById('update-status-text');
            if (st) st.textContent = 'جاري تطبيق التحديث مع الحفاظ الكامل على أرقامك وأسمائك...';
            persistState();
            var finishReload = function() {
                location.replace(location.pathname + '?updated=' + Date.now() + '#tab-ai');
            };
            if ('serviceWorker' in navigator && navigator.serviceWorker.getRegistrations) {
                navigator.serviceWorker.getRegistrations().then(function(regs) {
                    regs.forEach(function(r) {
                        if (r && r.waiting) {
                            try { r.waiting.postMessage({ type: 'SKIP_WAITING' }); } catch (e) {}
                        }
                    });
                    Promise.all(regs.map(function(r) { return r.unregister(); })).then(finishReload).catch(finishReload);
                }).catch(finishReload);
            } else {
                finishReload();
            }
        }

        function saveContactToDeviceVcf(codeOrPhone, displayName) {
            var cleanVal = cleanIdValue(codeOrPhone);
            if (!cleanVal) return;
            var nameVal = String(displayName || resolveContactName(cleanVal) || cleanVal).trim() || cleanVal;
            var vcard = [
                'BEGIN:VCARD',
                'VERSION:3.0',
                'FN:' + nameVal,
                'N:' + nameVal + ';;;;',
                'TEL;TYPE=CELL:' + cleanVal,
                'NOTE:Sanad Platform',
                'END:VCARD'
            ].join('\r\n');
            var blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'sanad-' + cleanVal.replace(/[^a-zA-Z0-9+_-]/g, '') + '.vcf';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(function() { URL.revokeObjectURL(url); }, 1200);
            copyStringToClipboard('', 'تم تجهيز بطاقة جهة الاتصال (.vcf)');
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
                ].join('\r\n');
            }).join('\r\n');
            var blob = new Blob([cards], { type: 'text/vcard;charset=utf-8' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = 'sanad-contacts.vcf';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(function() { URL.revokeObjectURL(url); }, 1200);
            copyStringToClipboard('', 'تم تصدير جميع الجهات (.vcf)');
        }

        function importFromDeviceContactsPicker() {
            if (!navigator.contacts || typeof navigator.contacts.select !== 'function') {
                return copyStringToClipboard('', 'أدخل الاسم والرقم بالأسفل لحفظه فوراً أو صدّره إلى جهات الجوال (.vcf)');
            }
            navigator.contacts.select(['name', 'tel'], { multiple: true }).then(function(picked) {
                if (!Array.isArray(picked) || !picked.length) return;
                var added = 0;
                picked.forEach(function(item) {
                    var nm = (Array.isArray(item.name) && item.name[0]) ? item.name[0] : '';
                    var tels = Array.isArray(item.tel) ? item.tel : [];
                    tels.forEach(function(t) {
                        var idVal = cleanIdValue(t);
                        if (!idVal) return;
                        var label = nm || idVal;
                        var idx = contacts.findIndex(function(c) { return normalizeStr(c.id) === normalizeStr(idVal); });
                        if (idx !== -1) contacts[idx] = { name: label, id: idVal };
                        else contacts.push({ name: label, id: idVal });
                        added += 1;
                    });
                });
                if (added > 0) {
                    persistState();
                    renderPresence();
                    renderQuickChips();
                    renderPeerHeader();
                    renderMsgs();
                    copyStringToClipboard('', 'تم جلب ' + toWesternDigits(added) + ' جهة اتصال بنجاح');
                }
            }).catch(function() {});
        }

        function saveCurrentPeerToPhoneContacts() {
            if (!currentPeer || currentPeer === DEFAULT_PEER) return;
            saveContactToDeviceVcf(currentPeer, resolveContactName(currentPeer));
        }

        function generate88DigitCode() {
            fetch('/api/codes/generate-88', { method: 'POST' })
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    var code = (data && data.code) ? cleanIdValue(data.code) : ('88' + String(Math.floor(100000 + Math.random() * 900000)));
                    lastGeneratedCode = code;
                    if (myAccts.indexOf(code) === -1) myAccts.unshift(code);
                    activeAcct = code;
                    var banner = document.getElementById('last-generated-banner');
                    var txt = document.getElementById('last-generated-text');
                    if (banner && txt) {
                        txt.textContent = 'الكود الحصري المولّد (88...): ' + code;
                        banner.classList.remove('hidden');
                    }
                    persistState();
                    renderAccts();
                    renderActiveHeaderAcct();
                    syncPresenceNow();
                    copyStringToClipboard(code, 'تم توليد وحجز الكود: ' + code);
                })
                .catch(function() {
                    var code = '88' + String(Math.floor(100000 + Math.random() * 900000));
                    lastGeneratedCode = code;
                    if (myAccts.indexOf(code) === -1) myAccts.unshift(code);
                    activeAcct = code;
                    persistState();
                    renderAccts();
                    renderActiveHeaderAcct();
                    syncPresenceNow();
                    copyStringToClipboard(code, 'تم توليد الكود: ' + code);
                });
        }

        function addCustom88OrId() {
            var raw = prompt('أدخل الكود (يبدأ بـ 88 من 8 أرقام):', '88');
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
                        ? ('تم إرسال رمز التحقق (6 أرقام) إلى الإيميل ' + email + (data.emailSent ? ' بنجاح' : '') + ' • الرمز: ' + (data.code || ''))
                        : ('رمز التحقق عبر الإيميل للرقم ' + fullPhone + ': ' + (data.code || ''));
                }
            }).catch(function() {
                copyStringToClipboard('', 'تعذر طلب رمز التحقق من السيرفر');
            });
        }

        function verifySanadPhoneCode() {
            var ccEl = document.getElementById('intl-cc-input');
            var phEl = document.getElementById('intl-phone-input');
            var emEl = document.getElementById('intl-email-input');
            var codeEl = document.getElementById('otp-code-input');
            var cc = cleanIdValue(ccEl ? ccEl.value : '').replace(/[^0-9+]/g, '');
            if (cc && cc.indexOf('+') !== 0) cc = '+' + cc;
            var ph = cleanIdValue(phEl ? phEl.value : '').replace(/[^0-9]/g, '');
            var fullPhone = (cc || '+967') + ph;
            var code = cleanIdValue(codeEl ? codeEl.value : '');
            var email = emEl ? emEl.value.trim() : '';

            fetch('/api/auth/verify-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: fullPhone, code: code })
            }).then(function(r) { return r.json(); }).then(function(data) {
                if (!data || !data.ok) return copyStringToClipboard('', 'رمز التحقق غير صحيح');
                verifiedPhonesMap[normalizeStr(fullPhone)] = { email: email, verifiedAt: Date.now() };
                if (myAccts.indexOf(fullPhone) === -1) myAccts.unshift(fullPhone);
                activeAcct = fullPhone;
                persistState();
                renderAccts();
                renderActiveHeaderAcct();
                syncPresenceNow();
                copyStringToClipboard(fullPhone, 'تم تفعيل وحفظ الرقم: ' + fullPhone);
            }).catch(function() {});
        }

        function loadSavedState() {
            try {
                var rawVault = localStorage.getItem('sanad_persistent_vault_v1');
                var vault = rawVault ? JSON.parse(rawVault) : null;

                var pickKey = function(suffix) {
                    var prefixes = ['sanad1269_', 'sanad1268_', 'sanad1267_', 'sanad1266_', 'sanad1265_', 'sanad1264_'];
                    for (var i = 0; i < prefixes.length; i++) {
                        var v = localStorage.getItem(prefixes[i] + suffix);
                        if (v !== null && v !== undefined && v !== '') return v;
                    }
                    return null;
                };
                var parseJsonKey = function(suffix) {
                    var raw = pickKey(suffix);
                    if (!raw) return null;
                    try { return JSON.parse(raw); } catch (e) { return null; }
                };
                var sActive = (vault && vault.activeAcct) || pickKey('active');
                var sAccts = (vault && vault.myAccts) || parseJsonKey('accts');
                var sVerified = (vault && vault.verifiedPhones) || parseJsonKey('verified');
                var sContacts = (vault && vault.contacts) || parseJsonKey('contacts');
                var sBlocked = (vault && vault.blocked) || parseJsonKey('blocked');
                var sThreads = (vault && vault.threads) || parseJsonKey('threads');
                var sGroups = (vault && vault.groups) || parseJsonKey('groups');
                var sBackups = (vault && vault.backupHistory) || parseJsonKey('backups');
                var sCursor = Number((vault && vault.cursor) || pickKey('cursor') || '0');

                if (sActive) activeAcct = cleanIdValue(sActive);
                if (Array.isArray(sAccts) && sAccts.length) myAccts = sAccts.map(cleanIdValue).filter(Boolean);
                if (myAccts.indexOf(activeAcct) === -1) myAccts.unshift(activeAcct);
                if (sVerified && typeof sVerified === 'object') verifiedPhonesMap = sVerified;
                if (Array.isArray(sContacts) && sContacts.length) contacts = sContacts;
                if (!contacts.some(function(c) { return c.id === DEFAULT_PEER; })) contacts.unshift({ name: DEFAULT_PEER, id: DEFAULT_PEER });
                if (Array.isArray(sBlocked)) blockedIdsSet = new Set(sBlocked.map(normalizeStr).filter(Boolean));
                if (sThreads && typeof sThreads === 'object') acctThreads = sThreads;
                if (Array.isArray(sGroups)) sanadGroups = sGroups;
                if (Array.isArray(sBackups)) backupRecordsHistory = sBackups;
                if (sCursor > 0) lastSyncCursor = sCursor;
            } catch (e) {}
        }

        function persistState() {
            try {
                var blockedArr = Array.from(blockedIdsSet);
                localStorage.setItem('sanad1269_active', activeAcct);
                localStorage.setItem('sanad1269_accts', JSON.stringify(myAccts));
                localStorage.setItem('sanad1269_verified', JSON.stringify(verifiedPhonesMap));
                localStorage.setItem('sanad1269_contacts', JSON.stringify(contacts));
                localStorage.setItem('sanad1269_blocked', JSON.stringify(blockedArr));
                localStorage.setItem('sanad1269_threads', JSON.stringify(acctThreads));
                localStorage.setItem('sanad1269_groups', JSON.stringify(sanadGroups));
                localStorage.setItem('sanad1269_backups', JSON.stringify(backupRecordsHistory));
                localStorage.setItem('sanad1269_cursor', String(lastSyncCursor));

                localStorage.setItem('sanad_persistent_vault_v1', JSON.stringify({
                    activeAcct: activeAcct,
                    myAccts: myAccts,
                    verifiedPhones: verifiedPhonesMap,
                    contacts: contacts,
                    blocked: blockedArr,
                    threads: acctThreads,
                    groups: sanadGroups,
                    backupHistory: backupRecordsHistory,
                    cursor: lastSyncCursor
                }));
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
            copyStringToClipboard('', shouldBlock ? ('تم حظر ' + resolveContactName(clean)) : ('تم فك الحظر عن ' + resolveContactName(clean)));
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
                    '<span class="font-semibold text-rose-200 truncate">' + escapeHtml(resolveContactName(bId)) + '</span>' +
                    '<button type="button" onclick="setBlockStatusForPeer(\'' + escapeJsSingle(bId) + '\', false)" class="bg-slate-800 text-teal-200 px-2.5 py-1 rounded-lg text-[11px] font-semibold">فك الحظر</button>' +
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
                var isVerified = Boolean(verifiedPhonesMap[normalizeStr(acc)]);
                return '<div class="flex items-center justify-between bg-[#08101a] border ' + (isCur ? 'border-teal-600' : 'border-slate-800') + ' p-2.5 rounded-xl text-xs gap-2">' +
                    '<span class="font-mono font-semibold text-white truncate">' + escapeHtml(acc) +
                    (isVerified ? ' <span class="text-[10px] text-emerald-300">✓ مفعّل</span>' : '') +
                    (isCur ? ' <span class="text-[10px] text-teal-300">(نشط)</span>' : '') + '</span>' +
                    '<div class="flex gap-1.5 shrink-0">' +
                    '<button type="button" onclick="saveContactToDeviceVcf(\'' + escapeJsSingle(acc) + '\', \'سند ' + escapeJsSingle(acc) + '\')" class="bg-emerald-900/80 text-emerald-200 px-2 py-1 rounded-lg text-[11px] font-semibold">لجوالي</button>' +
                    (!isCur ? '<button type="button" onclick="switchActiveAccount(\'' + escapeJsSingle(acc) + '\')" class="bg-[#164e63] text-white px-2.5 py-1 rounded-lg text-[11px] font-semibold">تفعيل</button>' : '') +
                    (myAccts.length > 1 ? '<button type="button" onclick="deleteSavedAccount(\'' + escapeJsSingle(acc) + '\')" class="bg-rose-950/80 text-rose-200 px-2 py-1 rounded-lg text-[11px]">حذف</button>' : '') +
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
            renderPeerHeader();
            renderMsgs();
            copyStringToClipboard('', 'تم حفظ الاسم والرقم: ' + nameVal);
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
                    '<div class="min-w-0 flex items-center gap-2">' +
                    '<span class="w-2.5 h-2.5 rounded-full shrink-0 ' + (blocked ? 'bg-rose-500' : (online ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]' : 'bg-slate-600')) + '"></span>' +
                    '<div class="min-w-0">' +
                    '<p class="font-bold text-white truncate">' + escapeHtml(c.name) + ' <span class="text-[10px] font-normal ' + (blocked ? 'text-rose-400' : (online ? 'text-emerald-300' : 'text-slate-500')) + '">• ' + (blocked ? 'محظور' : (online ? 'متصل الآن' : 'غير متصل')) + '</span></p>' +
                    '<p class="font-mono text-[11px] text-slate-400 truncate">' + escapeHtml(c.id) + '</p>' +
                    '</div></div>' +
                    '<div class="flex gap-1.5 shrink-0">' +
                    '<button type="button" onclick="saveContactToDeviceVcf(\'' + escapeJsSingle(c.id) + '\', \'' + escapeJsSingle(c.name) + '\')" class="bg-emerald-900/80 text-emerald-200 px-2 py-1.5 rounded-lg text-[11px] font-semibold">لجوالي</button>' +
                    '<button type="button" onclick="choosePeer(\'' + escapeJsSingle(c.id) + '\')" class="bg-[#164e63] text-white px-2.5 py-1.5 rounded-lg font-semibold">دردشة</button>' +
                    (!isDef ? '<button type="button" onclick="deleteSavedContact(\'' + escapeJsSingle(c.id) + '\')" class="bg-rose-950/80 text-rose-200 px-2 py-1.5 rounded-lg font-semibold">حذف</button>' : '') +
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
                    '<button type="button" onclick="choosePeer(\'' + escapeJsSingle(g.id) + '\')" class="bg-[#164e63] text-white px-3 py-1.5 rounded-lg font-semibold">فتح</button>' +
                    '</div>';
            }).join('');
        }

        function createSanadGroup() {
            var nEl = document.getElementById('g-name');
            var mEl = document.getElementById('g-members');
            var name = nEl ? nEl.value.trim() : '';
            if (!name) return;
            var extra = mEl ? toWesternDigits(mEl.value).split(/[\s,،]+/).map(cleanIdValue).filter(Boolean) : [];
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
                .concat(contacts.map(function(c) { return { id: c.id, label: c.name }; }));
            if (q) items = items.filter(function(it) { return normalizeStr(it.label).indexOf(q) !== -1 || normalizeStr(it.id).indexOf(q) !== -1; });
            box.innerHTML = items.slice(0, 12).map(function(it) {
                var active = normalizeStr(it.id) === normalizeStr(currentPeer);
                return '<button type="button" onclick="choosePeer(\'' + escapeJsSingle(it.id) + '\')" class="px-2.5 py-1 rounded-full border text-xs font-semibold whitespace-nowrap shrink-0 ' +
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
            clearReplyTarget();
            delete unreadByThread[normalizeStr(clean)];
            updateUnreadBadgesUI();
            var callInp = document.getElementById('call-input');
            if (callInp) { callInp.value = clean; onCallDialInput(); }
            setPane('chats');
            renderPeerHeader();
            renderQuickChips();
            markCurrentThreadRead();
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
            var grp = sanadGroups.find(function(g) { return normalizeStr(g.id) === normalizeStr(currentPeer); });
            var displayName = grp ? ('👥 ' + grp.name) : resolveContactName(currentPeer);
            if (titleEl) titleEl.textContent = displayName;
            if (blockBtn) {
                blockBtn.classList.toggle('hidden', currentPeer === DEFAULT_PEER || Boolean(grp));
                blockBtn.textContent = isPeerBlocked(currentPeer) ? 'فك الحظر' : 'حظر';
            }
            if (isPeerBlocked(currentPeer)) {
                if (statusEl) { statusEl.textContent = 'محظور'; statusEl.className = 'text-[11px] font-semibold text-rose-400 shrink-0'; }
                if (dotEl) dotEl.className = 'w-3 h-3 rounded-full bg-rose-500 shrink-0';
                return;
            }
            var online = isPeerOnline(currentPeer) || currentPeer === DEFAULT_PEER || Boolean(grp);
            if (statusEl) {
                statusEl.textContent = online ? 'متصل الآن' : 'غير متصل';
                statusEl.className = online ? 'text-[11px] font-semibold text-emerald-300 shrink-0' : 'text-[11px] font-semibold text-slate-400 shrink-0';
            }
            if (dotEl) {
                dotEl.className = online
                    ? 'w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.95)] shrink-0'
                    : 'w-3 h-3 rounded-full bg-slate-600 shrink-0';
            }
        }

        function getThreadMap() {
            if (!acctThreads[activeAcct]) acctThreads[activeAcct] = {};
            if (!acctThreads[activeAcct][DEFAULT_PEER]) {
                acctThreads[activeAcct][DEFAULT_PEER] = [
                    { id: 'init-' + activeAcct, from: 'them', senderName: DEFAULT_PEER, kind: 'text', text: 'مرحباً بك في سند -- منصة الاتصال والذكاء والمعرفة.', sentAt: formatTimeShort(), receipt: 'read' }
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

        function markCurrentThreadRead() {
            if (!currentPeer || currentPeer === DEFAULT_PEER) return;
            var list = ensureThreadEntry(activeAcct, currentPeer);
            var changed = false;
            list.forEach(function(m) {
                if (m && m.from === 'them' && m.receipt !== 'read') {
                    m.receipt = 'read';
                    changed = true;
                }
            });
            if (changed) persistState();
            sendPacketWithFallback({
                type: 'msg_receipt',
                eventId: 'rcpt-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
                from: activeAcct,
                to: currentPeer,
                status: 'read'
            });
        }

        function renderReceiptTick(receiptState) {
            if (receiptState === 'read') {
                return '<span class="text-sky-300 font-bold mr-1" title="تمت القراءة">✓✓</span>';
            }
            if (receiptState === 'delivered') {
                return '<span class="text-emerald-200 font-bold mr-1" title="تم التسليم">✓✓</span>';
            }
            return '<span class="text-slate-300/80 font-bold mr-1" title="تم الإرسال">✓</span>';
        }

        function updateUnreadBadgesUI() {
            var total = 0;
            Object.keys(unreadByThread).forEach(function(k) { total += Number(unreadByThread[k] || 0); });
            var dot = document.getElementById('header-unread-dot');
            var navBadge = document.getElementById('nav-chats-badge');
            if (dot) { dot.textContent = toWesternDigits(total); dot.classList.toggle('hidden', total <= 0); }
            if (navBadge) { navBadge.textContent = toWesternDigits(total); navBadge.classList.toggle('hidden', total <= 0); }
        }

        function showLiveToast(senderId, bodyText, peerId) {
            toastPeerId = peerId;
            var displaySender = resolveContactName(senderId) || senderId || 'رسالة جديدة';
            var sEl = document.getElementById('toast-sender');
            var bEl = document.getElementById('toast-body');
            var box = document.getElementById('live-toast');
            if (sEl) sEl.textContent = displaySender;
            if (bEl) bEl.textContent = bodyText || '...';
            if (box) {
                box.classList.remove('hidden');
                clearTimeout(toastTimer);
                toastTimer = setTimeout(function() { box.classList.add('hidden'); }, 4000);
            }
            triggerSystemNotification(displaySender, bodyText);
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
                if (m.kind === 'audio' && m.mediaUrl) {
                    media = '<div class="mt-1"><audio controls preload="metadata" src="' + m.mediaUrl + '" class="w-56 max-w-full h-9"></audio></div>';
                } else if (m.kind === 'image' && m.mediaUrl) {
                    media = '<img src="' + m.mediaUrl + '" class="max-w-[210px] rounded-xl mt-1">';
                } else if (m.kind === 'file' && m.mediaUrl) {
                    media = '<a href="' + m.mediaUrl + '" download="' + escapeHtml(m.fileName || 'file') + '" class="underline text-xs text-teal-200 block mt-1">' + escapeHtml(m.fileName || 'ملف') + '</a>';
                }
                var receiptHtml = isMe ? renderReceiptTick(m.receipt || 'sent') : '';
                var safeId = String(m.id || '').replace(/\\/g, '\\\\').replace(/'/g, '\\\'').replace(/"/g, '&quot;');

                var replyQuoteHtml = '';
                if (m.replyTo && (m.replyTo.snippet || m.replyTo.author)) {
                    replyQuoteHtml = '<div class="bg-black/25 border-r-2 border-teal-300 rounded-lg px-2.5 py-1 mb-1.5 text-[11px] text-slate-200/95">' +
                        '<div class="font-bold text-teal-200 truncate">' + escapeHtml(m.replyTo.author || 'رسالة') + '</div>' +
                        '<div class="truncate text-slate-300">' + escapeHtml(m.replyTo.snippet || '') + '</div>' +
                        '</div>';
                }

                var translatedHtml = '';
                if (translationsByMsgId[m.id]) {
                    translatedHtml = '<div class="mt-1.5 bg-[#07111b]/80 border border-teal-700/40 rounded-lg px-2.5 py-1.5 text-xs text-emerald-200">' +
                        escapeHtml(translationsByMsgId[m.id]) +
                        '</div>';
                }

                var actionsHtml = '<div class="flex items-center gap-2.5 text-[10px] text-slate-300/85 mt-1.5 pt-1 border-t border-white/10 flex-wrap">' +
                    '<button type="button" onclick="setReplyTarget(\'' + safeId + '\')" class="hover:text-teal-200 flex items-center gap-0.5" title="رد على الرسالة"><i class="fa-solid fa-reply"></i><span>رد</span></button>' +
                    (m.text ? '<button type="button" onclick="translateChatMessage(\'' + safeId + '\')" class="hover:text-emerald-200 flex items-center gap-0.5" title="ترجمة داخل المحادثة"><i class="fa-solid fa-language"></i><span>ترجمة</span></button>' : '') +
                    (m.text ? '<button type="button" onclick="speakMessageText(\'' + safeId + '\')" class="hover:text-teal-200 flex items-center gap-0.5" title="قراءة صوتية بالذكاء الاصطناعي"><i class="fa-solid fa-volume-high"></i><span>قراءة</span></button>' : '') +
                    (m.text ? '<button type="button" onclick="copyStringToClipboard(decodeURIComponent(\'' + encodeURIComponent(m.text) + '\'), \'تم نسخ الرسالة\')" class="hover:text-teal-200 flex items-center gap-0.5" title="نسخ"><i class="fa-regular fa-copy"></i><span>نسخ</span></button>' : '') +
                    '<button type="button" onclick="openDeleteMsgModal(\'' + safeId + '\')" class="hover:text-rose-300 flex items-center gap-0.5 mr-auto" title="حذف نهائي"><i class="fa-solid fa-trash-can"></i><span>حذف نهائي</span></button>' +
                    '</div>';

                return '<div class="flex ' + (isMe ? 'justify-start' : 'justify-end') + '">' +
                    '<div class="max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow ' +
                    (isMe ? 'bg-[#164e63] text-white rounded-br-sm' : 'bg-[#0d1926] border border-slate-800 text-slate-100 rounded-bl-sm') + '">' +
                    replyQuoteHtml +
                    (m.text ? '<div class="sanad-msg-text whitespace-pre-wrap break-words">' + escapeHtml(m.text) + '</div>' : '') +
                    media +
                    translatedHtml +
                    actionsHtml +
                    '<div class="text-[10px] text-slate-300/80 mt-1 text-left flex items-center justify-end gap-1">' +
                    '<span>' + escapeHtml(m.sentAt || '') + '</span>' + receiptHtml +
                    '</div></div></div>';
            }).join('');
            box.scrollTop = box.scrollHeight;
        }

        function toggleVoiceRecording() {
            if (mediaRecorderInstance && mediaRecorderInstance.state === 'recording') {
                finishVoiceRecordingAndSend();
            } else {
                startVoiceRecording();
            }
        }

        function startVoiceRecording() {
            if (isPeerBlocked(currentPeer)) return copyStringToClipboard('', 'هذا الطرف محظور');
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') {
                return copyStringToClipboard('', 'المتصفح لا يدعم التسجيل الصوتي المباشر');
            }
            voiceRecordCancelled = false;
            audioRecordChunks = [];
            voiceRecSeconds = 0;

            navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
                .then(function(stream) {
                    audioRecordStream = stream;
                    mediaRecorderInstance = new MediaRecorder(stream);
                    mediaRecorderInstance.ondataavailable = function(ev) {
                        if (ev.data && ev.data.size > 0) audioRecordChunks.push(ev.data);
                    };
                    mediaRecorderInstance.onstop = function() {
                        clearInterval(voiceRecInterval);
                        document.getElementById('voice-rec-bar').classList.add('hidden');
                        if (audioRecordStream) {
                            audioRecordStream.getTracks().forEach(function(t) { try { t.stop(); } catch (e) {} });
                            audioRecordStream = null;
                        }
                        if (voiceRecordCancelled) return;
                        var blob = new Blob(audioRecordChunks, { type: mediaRecorderInstance.mimeType || 'audio/webm' });
                        if (!blob.size) return;
                        var reader = new FileReader();
                        reader.onload = function() {
                            sendAudioMsgData(reader.result);
                        };
                        reader.readAsDataURL(blob);
                    };

                    mediaRecorderInstance.start();
                    document.getElementById('voice-rec-bar').classList.remove('hidden');
                    document.getElementById('voice-rec-timer').textContent = '00:00';
                    voiceRecInterval = setInterval(function() {
                        voiceRecSeconds += 1;
                        var el = document.getElementById('voice-rec-timer');
                        if (el) el.textContent = formatSecondsTimer(voiceRecSeconds);
                    }, 1000);
                })
                .catch(function() {
                    copyStringToClipboard('', 'يرجى السماح بالوصول إلى الميكروفون');
                });
        }

        function cancelVoiceRecording() {
            voiceRecordCancelled = true;
            if (mediaRecorderInstance && mediaRecorderInstance.state !== 'inactive') {
                try { mediaRecorderInstance.stop(); } catch (e) {}
            }
        }

        function finishVoiceRecordingAndSend() {
            voiceRecordCancelled = false;
            if (mediaRecorderInstance && mediaRecorderInstance.state !== 'inactive') {
                try { mediaRecorderInstance.stop(); } catch (e) {}
            }
        }

        function sendAudioMsgData(dataUrl) {
            if (!dataUrl) return;
            var replySnapshot = activeReplyTarget ? Object.assign({}, activeReplyTarget) : null;
            clearReplyTarget();
            var msgObj = {
                id: 'aud-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
                from: 'me',
                senderName: activeAcct,
                kind: 'audio',
                text: '',
                mediaUrl: dataUrl,
                replyTo: replySnapshot,
                sentAt: formatTimeShort(),
                receipt: (currentPeer === DEFAULT_PEER || isPeerOnline(currentPeer)) ? 'delivered' : 'sent'
            };
            ensureThreadEntry(activeAcct, currentPeer).push(msgObj);
            persistState();
            renderMsgs();

            if (currentPeer === DEFAULT_PEER) {
                setTimeout(function() {
                    msgObj.receipt = 'read';
                    persistState();
                    renderMsgs();
                }, 300);
                return;
            }

            var grp = sanadGroups.find(function(g) { return normalizeStr(g.id) === normalizeStr(currentPeer); });
            var targets = grp ? grp.members.filter(function(x) { return normalizeStr(x) !== normalizeStr(activeAcct); }) : [currentPeer];
            targets.forEach(function(t) {
                sendPacketWithFallback({
                    type: 'chat_message',
                    eventId: 'amsg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
                    from: activeAcct,
                    senderName: activeAcct,
                    to: cleanIdValue(t),
                    groupId: grp ? grp.id : null,
                    msg: msgObj
                });
            });
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

            var replySnapshot = activeReplyTarget ? Object.assign({}, activeReplyTarget) : null;
            clearReplyTarget();

            var msgObj = {
                id: 'm-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
                from: 'me',
                senderName: activeAcct,
                kind: 'text',
                text: txt,
                replyTo: replySnapshot,
                sentAt: formatTimeShort(),
                receipt: (currentPeer === DEFAULT_PEER || isPeerOnline(currentPeer)) ? 'delivered' : 'sent'
            };
            ensureThreadEntry(activeAcct, currentPeer).push(msgObj);
            inp.value = '';
            autoResizeComposer(inp);
            persistState();
            renderMsgs();

            if (currentPeer === DEFAULT_PEER) {
                setTimeout(function() {
                    msgObj.receipt = 'read';
                    ensureThreadEntry(activeAcct, DEFAULT_PEER).push({
                        id: 'bot-' + Date.now(),
                        from: 'them',
                        senderName: DEFAULT_PEER,
                        kind: 'text',
                        text: 'تم استلام رسالتك عبر سند (' + txt.slice(0, 60) + ').',
                        sentAt: formatTimeShort(),
                        receipt: 'read'
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
            if (file.size > 2_500_000) {
                ev.target.value = '';
                return copyStringToClipboard('', 'حجم الملف أكبر من 2.5 ميجابايت');
            }
            var reader = new FileReader();
            reader.onload = function() {
                var isImg = /^image\//i.test(file.type);
                var msgObj = {
                    id: 'f-' + Date.now(),
                    from: 'me',
                    senderName: activeAcct,
                    kind: isImg ? 'image' : 'file',
                    fileName: file.name,
                    text: isImg ? '' : file.name,
                    mediaUrl: reader.result,
                    sentAt: formatTimeShort(),
                    receipt: 'sent'
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
            var pendingId = 'ai-wait-' + Date.now();
            log.innerHTML += '<div id="' + pendingId + '" class="bg-[#0d1926] border border-slate-800 text-teal-200 px-2.5 py-1.5 rounded-lg">جاري التفكير والرد...</div>';
            log.scrollTop = log.scrollHeight;

            fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: q })
            })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                var el = document.getElementById(pendingId);
                var ans = (data && data.reply) ? data.reply : 'تم استلام سؤالك.';
                if (el) el.textContent = 'سند AI: ' + ans;
                log.scrollTop = log.scrollHeight;
            })
            .catch(function() {
                var el = document.getElementById(pendingId);
                if (el) el.textContent = 'سند AI: تم استلام سؤالك بخصوص «' + q + '».';
                log.scrollTop = log.scrollHeight;
            });
        }

        function onCallDialInput() {
            var inp = document.getElementById('call-input');
            var prev = document.getElementById('call-resolved-preview');
            var raw = cleanIdValue(inp ? inp.value : '');
            if (prev) prev.textContent = raw ? resolveContactName(raw) : '';
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
                    st.textContent = 'متصل عبر سند';
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

            document.getElementById('call-peer-title').textContent = resolveContactName(peer);
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
                var callerLabel = resolveContactName(fromId);
                document.getElementById('call-peer-title').textContent = callerLabel;
                document.getElementById('call-status-msg').textContent = (pkt.callMode === 'video' ? 'مكالمة فيديو واردة...' : 'مكالمة صوتية واردة...');
                document.getElementById('accept-btn').classList.remove('hidden');
                document.getElementById('call-modal').classList.remove('hidden');
                triggerSystemNotification('مكالمة واردة من ' + callerLabel, 'اضغط للرد');
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
                    renderPresence();
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
                renderPresence();
                return;
            }
            if (ev.eventId && seenEventIds.has(ev.eventId)) return;
            if (ev.eventId) seenEventIds.add(ev.eventId);
            if (ev.from && isPeerBlocked(ev.from)) return;

            if (ev.type === 'delete_message' && ev.msgId) {
                var peerDel = ev.groupId ? cleanIdValue(ev.groupId) : cleanIdValue(ev.from);
                var listD = ensureThreadEntry(activeAcct, peerDel);
                var idxD = listD.findIndex(function(m) { return m && m.id === ev.msgId; });
                if (idxD !== -1) {
                    listD.splice(idxD, 1);
                    persistState();
                    if (window.__sanadCurrentTab === 'chats' && normalizeStr(currentPeer) === normalizeStr(peerDel)) {
                        renderMsgs();
                    }
                }
                return;
            }

            if (ev.type === 'msg_receipt') {
                var peerFrom = cleanIdValue(ev.from);
                var listR = ensureThreadEntry(activeAcct, peerFrom);
                listR.forEach(function(m) {
                    if (m && m.from === 'me') m.receipt = ev.status || 'read';
                });
                persistState();
                if (window.__sanadCurrentTab === 'chats' && normalizeStr(currentPeer) === normalizeStr(peerFrom)) {
                    renderMsgs();
                }
                return;
            }

            if (ev.type === 'chat_message' && ev.msg) {
                var senderId = cleanIdValue(ev.from);
                if (!senderId || normalizeStr(senderId) === normalizeStr(activeAcct)) return;
                var key = ev.groupId ? cleanIdValue(ev.groupId) : senderId;
                var list = ensureThreadEntry(activeAcct, key);
                if (!list.some(function(x) { return x && x.id === ev.msg.id; })) {
                    list.push({
                        id: ev.msg.id,
                        from: 'them',
                        senderName: resolveContactName(senderId) || senderId,
                        kind: ev.msg.kind || 'text',
                        text: ev.msg.text || '',
                        fileName: ev.msg.fileName || '',
                        mediaUrl: ev.msg.mediaUrl || '',
                        replyTo: ev.msg.replyTo || null,
                        sentAt: ev.msg.sentAt || formatTimeShort(),
                        receipt: 'read'
                    });
                }
                sendPacketWithFallback({
                    type: 'msg_receipt',
                    eventId: 'dlv-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
                    from: activeAcct,
                    to: senderId,
                    status: (window.__sanadCurrentTab === 'chats' && normalizeStr(currentPeer) === normalizeStr(key)) ? 'read' : 'delivered'
                });
                persistState();
                if (window.__sanadCurrentTab === 'chats' && normalizeStr(currentPeer) === normalizeStr(key)) {
                    renderMsgs();
                } else {
                    unreadByThread[normalizeStr(key)] = (Number(unreadByThread[normalizeStr(key)]) || 0) + 1;
                    updateUnreadBadgesUI();
                    showLiveToast(senderId, ev.msg.kind === 'audio' ? 'رسالة صوتية' : (ev.msg.text || 'رسالة جديدة'), key);
                }
                return;
            }

            if (ev.type === 'call_signal') handleIncomingCallSignal(ev);
        }

        function openSocket() {
            if (ws) { try { ws.onclose = null; ws.close(); } catch (e) {} ws = null; }
            var proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
            try { ws = new WebSocket(proto + '//' + location.host); } catch (e) { return; }
            var setWsUi = function(connected) {
                var dot = document.getElementById('ws-dot');
                var lbl = document.getElementById('ws-label');
                if (dot) {
                    dot.className = connected
                        ? 'w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]'
                        : 'w-2.5 h-2.5 rounded-full bg-amber-400';
                }
                if (lbl) {
                    lbl.textContent = connected ? 'منصة سند متصلة ونشطة' : 'إعادة مزامنة الاتصال...';
                    lbl.className = connected ? 'text-emerald-300 font-medium' : 'text-amber-300 font-medium';
                }
            };
            ws.onopen = function() { setWsUi(true); syncPresenceNow(); };
            ws.onerror = function() { setWsUi(false); };
            ws.onmessage = function(evt) {
                try { handleIncomingServerEvent(JSON.parse(String(evt.data || '{}'))); } catch (e) {}
            };
            ws.onclose = function() {
                setWsUi(false);
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
                    if (data && data.appVersion && String(data.appVersion) !== CLIENT_APP_VERSION) {
                        showAutoUpdateBanner(String(data.appVersion));
                    }
                    if (data && Array.isArray(data.onlineIds)) {
                        onlinePeers = new Set(data.onlineIds);
                        renderPeerHeader();
                        renderPresence();
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
            ensureThreadEntry(activeAcct, currentPeer).length = 0;
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
            renderBackupHistoryList();
            syncRadioUi();
            refreshWeatherAndMarine();
            loadRealPrayerSchedule();
            onCallDialInput();
            openSocket();
            syncPresenceNow();
            pollHttpSync();
            checkForSystemUpdate(false);
            setInterval(pollHttpSync, 3500);
            setInterval(checkRealAutoSchedule, 15000);
            setInterval(function() { checkForSystemUpdate(false); }, 60000);
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

    if (pathname === '/sanad-radio-playlist.js') {
        const jsPath = path.join(__dirname, 'sanad-radio-playlist.js');
        if (fs.existsSync(jsPath)) {
            res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
            res.end(fs.readFileSync(jsPath, 'utf8'));
            return;
        }
    }

    if (pathname === '/sanad-radio.m3u') {
        const m3uPath = path.join(__dirname, 'sanad-radio.m3u');
        if (fs.existsSync(m3uPath)) {
            res.writeHead(200, { 'Content-Type': 'audio/x-mpegurl; charset=utf-8' });
            res.end(fs.readFileSync(m3uPath, 'utf8'));
            return;
        }
    }

    const mediaExt = path.extname(pathname).toLowerCase();
    if (pathname.startsWith('/') && MEDIA_MIME_TYPES[mediaExt]) {
        const safeName = path.basename(pathname);
        const mediaPath = path.resolve(__dirname, safeName);
        const baseDir = path.resolve(__dirname) + path.sep;
        if (mediaPath.startsWith(baseDir) && fs.existsSync(mediaPath)) {
            const stat = fs.statSync(mediaPath);
            const totalSize = stat.size;
            const mime = MEDIA_MIME_TYPES[mediaExt];
            const rangeHeader = req.headers.range;

            if (rangeHeader) {
                const match = /bytes=(\d*)-(\d*)/.exec(rangeHeader);
                const start = match && match[1] ? parseInt(match[1], 10) : 0;
                const end = match && match[2] ? parseInt(match[2], 10) : totalSize - 1;
                if (start <= end && end < totalSize) {
                    const chunkSize = end - start + 1;
                    res.writeHead(206, {
                        'Content-Range': `bytes ${start}-${end}/${totalSize}`,
                        'Accept-Ranges': 'bytes',
                        'Content-Length': chunkSize,
                        'Content-Type': mime
                    });
                    fs.createReadStream(mediaPath, { start, end }).pipe(res);
                    return;
                }
            }

            res.writeHead(200, {
                'Content-Type': mime,
                'Content-Length': totalSize,
                'Accept-Ranges': 'bytes'
            });
            fs.createReadStream(mediaPath).pipe(res);
            return;
        }
    }

    if (
        pathname === '/icon.svg' ||
        pathname === '/icon-192.png' ||
        pathname === '/icon-512.png' ||
        pathname === '/apple-touch-icon.png'
    ) {
        const asset = getIconAssetForRoute(pathname);
        res.writeHead(200, { 'Content-Type': asset.mimeType });
        res.end(asset.buffer);
        return;
    }

    if (pathname === '/api/codes/generate-88' && req.method === 'POST') {
        const code = generateUnique88CodeServer();
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true, code }));
        return;
    }

    if (pathname === '/api/ai/chat' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString('utf8'); });
        req.on('end', async () => {
            try {
                const parsed = JSON.parse(body || '{}');
                const reply = await generateAiAssistantReply(parsed.prompt || '');
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ ok: true, reply }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ ok: false, reply: 'تعذر معالجة السؤال حالياً.' }));
            }
        });
        return;
    }

    if (pathname === '/api/ai/translate' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString('utf8'); });
        req.on('end', async () => {
            try {
                const parsed = JSON.parse(body || '{}');
                const translated = await translateTextSmart(parsed.text || '', parsed.targetLang || 'ar');
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ ok: true, translated }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ ok: false, translated: '' }));
            }
        });
        return;
    }

    if (pathname === '/api/auth/request-code' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString('utf8'); });
        req.on('end', async () => {
            try {
                const parsed = JSON.parse(body || '{}');
                const normPhone = normIdServer(parsed.phone || '');
                const email = String(parsed.email || '').trim();
                const code = String(Math.floor(100000 + Math.random() * 900000));
                if (normPhone) {
                    pendingVerifications.set(normPhone, { code, email, createdAt: Date.now() });
                }

                let emailSent = false;
                const resendKey = process.env.RESEND_API_KEY;
                const mailFrom = process.env.MAIL_FROM || 'Sanad AI <onboarding@resend.dev>';

                if (email && resendKey && typeof fetch === 'function') {
                    try {
                        const resp = await fetch('https://api.resend.com/emails', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${resendKey}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                from: mailFrom,
                                to: [email],
                                subject: 'رمز التحقق (6 أرقام) -- سند AI',
                                html: `<div dir="rtl" style="font-family:sans-serif"><h3>سند -- منصة الاتصال والذكاء والمعرفة</h3><p>رمز التحقق الخاص بالرقم <b>${parsed.phone || ''}</b> هو: <b>${code}</b></p></div>`
                            })
                        });
                        if (resp && resp.ok) emailSent = true;
                    } catch (e) {}
                }

                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ ok: true, phone: parsed.phone, email, code, emailSent }));
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
                const valid = rec
                    ? Boolean(rec.code === submitted)
                    : Boolean(submitted && /^\d{6}$/.test(submitted));
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
                if (body.length > 8_000_000) req.destroy();
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

process.on('uncaughtException', err => {
    console.error('Sanad uncaughtException:', err && err.message ? err.message : err);
});

process.on('unhandledRejection', reason => {
    console.error('Sanad unhandledRejection:', reason);
});

server.listen(PORT, () => {
    console.log(`Sanad v${APP_VERSION} running on http://localhost:${PORT}`);
});
