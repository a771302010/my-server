const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

let getIconAssetForRoute = () => ({
    mimeType: 'image/svg+xml; charset=utf-8',
    buffer: Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="28" fill="#0f4c5c"/><text x="64" y="82" text-anchor="middle" font-size="56" fill="#e6f4f1" font-family="sans-serif">س</text></svg>'
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

const APP_VERSION = '13.3.0';
const PORT = process.env.PORT || 3000;
const ICON_BG_HEX = '#0f4c5c';
const SYSTEM_SCIENTIFIC_NAME = 'منظومة سند الذكية الموزّعة للاتصال الفوري والرصد الرقمي';
const STATE_FILE_PATH = process.env.SANAD_STATE_FILE || path.join(__dirname, 'sanad-state.json');
const EXTERNAL_HTML_PATH = path.join(__dirname, 'index.html');
const LOCAL_RADIO_URL = process.env.SANAD_LOCAL_RADIO_URL || '/sanad-radio-promo.mp3';
const ONLINE_GRACE_MS = 30000;

const MAX_MANUAL_88_PER_SESSION = 2;
const MAX_LINKED_NUMBERS_PER_USER = 10;

const SANAD_EXTRA_TRACKS = [
    { id: 'seg2', title: 'المقطع الثاني -- إذاعة سند', url: '/sanad-seg-2.mp3' },
    { id: 'seg3', title: 'فقرة صوتية M4A -- إذاعة سند AI', url: '/sanad-seg-3.m4a' },
    { id: 'seg4', title: 'حلقة MP4 -- إذاعة سند AI', url: '/sanad-seg-4.mp4' }
];

const MEDIA_MIME_TYPES = {
    '.mp3': 'audio/mpeg',
    '.m4a': 'audio/mp4',
    '.mp4': 'video/mp4',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg'
};

function buildDynamicM3uContent() {
    const lines = [
        '#EXTM3U',
        '#EXTINF:-1,برومو إذاعة سند AI -- البث المباشر',
        LOCAL_RADIO_URL || '/sanad-radio-promo.mp3'
    ];
    SANAD_EXTRA_TRACKS.forEach(tr => {
        if (tr && tr.url) {
            lines.push(`#EXTINF:-1,${tr.title || 'مقطع إذاعة سند'}`);
            lines.push(tr.url);
        }
    });
    return lines.join('\n') + '\n';
}

function toWesternDigitsServer(str) {
    return String(str === undefined || str === null ? '' : str)
        .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 1632))
        .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 1776));
}

function normIdServer(v) {
    return toWesternDigitsServer(v).trim().toLowerCase().slice(0, 120);
}

const presenceMap = new Map();
const lastSeenMap = new Map();
const blockListByUser = new Map();
const pendingVerifications = new Map();
const reservedCodesSet = new Set();
const codeQuotaByActor = new Map();
const rateLimitMap = new Map();
const syncEvents = [];
let eventCursor = 0;
let saveStateTimer = null;

function isRateLimited(ipOrKey, maxHits, windowMs) {
    const now = Date.now();
    const key = String(ipOrKey || 'global');
    const cur = rateLimitMap.get(key) || { count: 0, resetAt: now + windowMs };
    if (now > cur.resetAt) {
        cur.count = 0;
        cur.resetAt = now + windowMs;
    }
    cur.count += 1;
    rateLimitMap.set(key, cur);
    return cur.count > maxHits;
}

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
        fs.writeFile(STATE_FILE_PATH, JSON.stringify(snapshot), 'utf8', err => {
            if (err) console.warn('Sanad state save warning:', err.message);
        });
    } catch (e) {
        console.warn('Sanad state snapshot error:', e && e.message ? e.message : e);
    }
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
    } catch (e) {
        console.warn('Sanad state load warning:', e && e.message ? e.message : e);
    }
}

loadServerStateFromDisk();

function consumeManual88Quota(actorKey) {
    const key = normIdServer(actorKey) || 'default-actor';
    const cur = codeQuotaByActor.get(key) || { count: 0 };
    if (cur.count >= MAX_MANUAL_88_PER_SESSION) {
        return { allowed: false, count: cur.count, remaining: 0 };
    }
    cur.count += 1;
    codeQuotaByActor.set(key, cur);
    return {
        allowed: true,
        count: cur.count,
        remaining: Math.max(0, MAX_MANUAL_88_PER_SESSION - cur.count)
    };
}

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
        createdAtMs: Date.now(),
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
        if (now - ts <= ONLINE_GRACE_MS) ids.add(id);
    });
    return Array.from(ids);
}

function touchPresenceIds(idsList) {
    const now = Date.now();
    (Array.isArray(idsList) ? idsList.slice(0, 100) : []).forEach(rawId => {
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
        (Array.isArray(blockedList) ? blockedList.slice(0, 500) : [])
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
        const ids = Array.isArray(payload.ids) ? payload.ids.slice(0, 100) : [];
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
            ? payload.ownerIds.slice(0, 20)
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
    } else if (payload.broadcast === true && payload.channel === 'system_announcement') {
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
    const q = String(promptText || '').trim().slice(0, 1500);
    const aiOut = await callGeminiText(
        `أنت مساعد ${SYSTEM_SCIENTIFIC_NAME} (سند AI). أجب بالعربية بوضوح ودقة علمية وعملية.`,
        q
    );
    if (aiOut) return aiOut;

    if (!q) return 'أهلاً بك في مساعد سند AI. اكتب سؤالك وسأجيبك فوراً.';
    if (/تحديث|اصدار|نسخة/i.test(q)) {
        return `النسخة الحالية هي v${APP_VERSION}. يتم فحص التحديثات تلقائياً مع ظهور شريط تنبيه أعلى الشاشة عند توفر إصدار جديد.`;
    }
    if (/نسخة احتياطية|تصدير|استيراد|تحصيلات/i.test(q)) {
        return 'يتم تجهيز وحفظ النسخ الاحتياطية وتصدير جهات الاتصال تلقائياً على جهازك مع تسجيل السجل من الأحدث للأقدم.';
    }
    if (/راديو|اذاعة|fm|قران|سند|اخبار|mp3|m4a|mp4/i.test(q)) {
        return 'إذاعة سند AI تعمل ببث مستمر يدعم صيغ MP3 وM4A وMP4 مع انتقال آلي بين المقاطع والقرآن الكريم والقنوات الإخبارية.';
    }
    if (/باب المندب|المخاء|طقس|رياح|مد|جزر|بحر|اقمار/i.test(q)) {
        return 'لوحة الطقس والرياح والمد والجزر في سند AI مدعومة ببيانات الرصد الجوي والبحري والأقمار الصناعية لمضيق باب المندب والمخاء وعدن والحديدة وسواحل العالم.';
    }
    return `بخصوص سؤالك («${q.slice(0, 120)}»): مساعد سند AI متاح للرد الفوري ومساعدتك في الترجمة والنسخ الاحتياطية وإذاعة سند.`;
}

async function translateTextSmart(text, targetLang) {
    const src = String(text || '').trim().slice(0, 1500);
    if (!src) return '';
    const target = targetLang === 'en' ? 'الإنجليزية' : 'العربية';
    const aiOut = await callGeminiText(
        `أنت مترجم فوري دقيق داخل تطبيق سند AI. ترجم النص التالي إلى ${target} فقط دون مقدمات أو شروحات إضافية.`,
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
    return targetLang === 'en'
        ? `Translation unavailable at the moment: ${src}`
        : `تعذرت الترجمة الفورية حالياً: ${src}`;
}

const manifestPayload = JSON.stringify({
    name: `Sanad AI v${APP_VERSION} - ${SYSTEM_SCIENTIFIC_NAME}`,
    short_name: 'سند AI',
    description: `${SYSTEM_SCIENTIFIC_NAME} -- تشغيل متواصل 24/7 عبر الشبكات العالمية`,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#08131d',
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
  if (req.headers.get('range') || /\.(mp3|m4a|mp4|wav|ogg)$/i.test(url.pathname)) return;

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
<html id="sanad-html-root" lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-title" content="سند AI">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="theme-color" content="#0f4c5c">
    <title>سند AI v${APP_VERSION} -- ${SYSTEM_SCIENTIFIC_NAME}</title>
    <link id="sanad-favicon" rel="icon" type="image/png" sizes="192x192" href="/icon-192.png">
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
    <link rel="apple-touch-icon" href="/icon-192.png">
    <link rel="manifest" href="/manifest.json">
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script src="/sanad-radio-playlist.js"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Cairo:wght@600;700;800&display=swap');
        :root { --sanad-chat-font: 14.5px; }
        body {
            font-family: 'IBM Plex Sans Arabic', 'Cairo', sans-serif;
            background: radial-gradient(circle at top, #112d3a 0%, #091720 55%, #061017 100%);
            color: #e8f3f5;
            line-height: 1.65;
        }
        .sanad-msg-text { font-size: var(--sanad-chat-font); line-height: 1.65; }
        .sanad-composer-font { font-size: var(--sanad-chat-font); line-height: 1.6; }
        button, a { touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1c6673; border-radius: 9999px; }
        .sanad-pane { display: none; height: 100%; width: 100%; overflow-y: auto; }
        .sanad-pane.sanad-pane-active { display: flex; flex-direction: column; }
        .sanad-teal-dot {
            background-color: #2dd4bf;
            box-shadow: 0 0 7px rgba(45, 212, 191, 0.35);
        }
        .sanad-teal-text {
            color: #5eead4;
        }
        .sanad-brand-title {
            color: #d8f0ee;
            letter-spacing: 0.2px;
        }
        .sanad-primary-btn {
            background-color: #0f4c5c;
            color: #f0fdfa;
        }
        .sanad-primary-btn:hover {
            background-color: #156275;
        }
    </style>
</head>
<body class="text-slate-100 h-screen flex flex-col overflow-hidden select-none">

    <script>
        var CLIENT_APP_VERSION = '${APP_VERSION}';
        var SYSTEM_SCIENTIFIC_NAME = '${SYSTEM_SCIENTIFIC_NAME}';
        var SANAD_LOCAL_RADIO_URL = '${LOCAL_RADIO_URL.replace(/'/g, '')}';
        var SANAD_SERVER_EXTRA_TRACKS = ${JSON.stringify(SANAD_EXTRA_TRACKS)};
        var MAX_MANUAL_88_LIMIT = ${MAX_MANUAL_88_PER_SESSION};
        var MAX_LINKED_NUMBERS_LIMIT = ${MAX_LINKED_NUMBERS_PER_USER};
        var sanadUiLang = 'ar';
        var sanadAutoSpeakIncoming = false;

        var SANAD_I18N = {
            ar: {
                dir: 'rtl',
                lang: 'ar',
                brandName: 'سند AI',
                scientificName: 'منظومة سند الذكية الموزّعة للاتصال الفوري والرصد الرقمي',
                uptimePill: '24/7 • عالمي • v' + CLIENT_APP_VERSION,
                tabs: {
                    chats: 'الدردشة',
                    groups: 'المجموعات',
                    accounts: 'الحسابات',
                    contacts: 'الجهات',
                    calls: 'المكالمات',
                    ai: 'الذكاء'
                },
                wsOnline: 'منظومة سند نشطة 24/7 • شبكة عالمية',
                wsReconnecting: 'إعادة ربط الجلسة بالخادم...',
                notifBtn: 'إشعار',
                notifActive: 'نشطة',
                langBtnLabel: 'EN',
                peerPlaceholder: 'اكتب الاسم أو الكود أو الرقم...',
                openBtn: 'فتح',
                msgPlaceholder: 'اكتب رسالتك أو سجّل صوتك...',
                autoSpeakOn: 'قراءة تلقائية: مفعّلة',
                autoSpeakOff: 'قراءة تلقائية: إيقاف',
                sessionActive: 'متصل نشط',
                offlineStatus: 'خارج الاتصال',
                blockedStatus: 'محظور',
                blockBtn: 'حظر',
                unblockBtn: 'فك الحظر',
                clearBtn: 'مسح',
                replyBtn: 'رد',
                translateBtn: 'ترجمة',
                speakBtn: 'قراءة',
                copyBtn: 'نسخ',
                deleteFinalBtn: 'حذف نهائي',
                voiceRecLabel: 'جاري التسجيل الصوتي...',
                cancelBtn: 'إلغاء',
                sendBtn: 'إرسال',
                callChannel: 'سند AI • قناة اتصال عالمية مشفّرة',
                connectingLabel: 'جاري الربط...',
                callingLabel: 'جاري طلب الاتصال...',
                connectedLabel: 'متصل عبر منظومة سند',
                incomingAudio: 'مكالمة صوتية واردة...',
                incomingVideo: 'مكالمة فيديو واردة...',
                answerBtn: 'رد الآن',
                hangupBtn: 'إنهاء',
                earpieceMode: 'سماعة الأذن',
                speakerMode: 'مكبر الصوت',
                directCallSub: 'اتصال مباشر عبر منظومة سند',
                callsTitle: 'المكالمات الصوتية والمرئية',
                callsSub: 'منظومة سند الذكية الموزّعة للاتصال الفوري والرصد الرقمي • تشغيل 24/7',
                callInputPlaceholder: 'اكتب الكود أو الرقم أو الاسم...',
                audioCallBtn: 'مكالمة صوتية',
                videoCallBtn: 'مكالمة فيديو',
                groupsTitle: 'مجموعات التواصل',
                groupNamePlaceholder: 'اسم المجموعة',
                groupMembersPlaceholder: 'أعضاء إضافيون (أرقام أو أكواد 88... مفصولة بفاصلة)',
                createGroupBtn: '+ إنشاء مجموعة',
                accountsTitle: 'توليد الأكواد الحصرية (88...) وإدارة الحسابات',
                accountsDesc: 'توليد منضبط (حد 2 كود يدوي في الدورة لمنع العبث) مع إمكانية ربط حتى 10 أرقام/وسائل اتصال والتحقق عبر الإيميل أو SMS أو اختياري.',
                gen88Btn: '+ توليد كود حصري (8 أرقام يبدأ بـ 88)',
                custom88Btn: '+ حجز/إدخال كود 88',
                intlTitle: 'تفعيل رقم دولي واختيار وسيلة التحقق (إيميل / SMS / اختياري)',
                intlPhonePlaceholder: 'رقم الجوال',
                intlEmailPlaceholder: 'البريد الإلكتروني (اختياري أو لرمز التحقق)',
                sendOtpBtn: 'إرسال رمز التحقق (6 أرقام)',
                otpPlaceholder: 'أدخل الكود المكون من 6 أرقام',
                verifyOtpBtn: 'تأكيد وحفظ',
                contactsTitle: 'الجهات والأسماء المحفوظة',
                importContactsBtn: 'جلب من الجوال',
                exportAllVcfBtn: 'حفظ الكل (.vcf)',
                contactsDesc: 'عند حفظ اسم الشخص يتم تجهيز ملف جهة الاتصال (.vcf) للجوال تلقائياً ويظهر بمؤشر أخضر/بترولي هادئ عند نشاط جلسته.',
                contactNamePlaceholder: 'اسم الشخص',
                contactIdPlaceholder: 'كود 88... أو رقم الجوال',
                saveContactPhoneBtn: 'حفظ وتنزيل للجوال',
                blockedTitle: 'قائمة المحظورين',
                aiHeroTitle: 'سند AI • تشغيل 24/7 عالمياً',
                updatesTitle: 'تحديثات النظام',
                checkUpdateBtn: 'فحص التحديث',
                applyUpdateBtn: 'تحديث النظام الآن',
                radioTitle: 'إذاعة سند AI • بث ذكي فوري',
                radioDesc: 'بث مباشر سريع الاستجابة مدعوم بالذكاء الاصطناعي يدعم MP3 وM4A وMP4 والقرآن الكريم والقنوات الإخبارية.',
                radioStopped: 'متوقف',
                radioPlaying: 'يعمل الآن',
                playRadioBtn: 'تشغيل الراديو',
                stopRadioBtn: 'إيقاف الراديو',
                radioStandbyMsg: 'الراديو في وضع الاستعداد الفوري -- اضغط «تشغيل الراديو» لبدء البث الذكي مباشرة.',
                adhanTitle: 'القرآن والأذان الحقيقي الآلي',
                adhanDesc: 'تشغيل حقيقي للقرآن والأذان مع تقليب آلي حسب الوقت والجمعة والتهجد ورمضان.',
                autoSwitchLbl: 'تقليب آلي',
                quranNowBtn: 'قرآن حقيقي الآن',
                adhanNowBtn: 'أذان حقيقي الآن',
                marineTitle: 'الرصد الجوي والبحري والأقمار الصناعية',
                refreshBtn: 'تحديث',
                backupTitle: 'النسخة الاحتياطية وسجل التحصيلات',
                backupDesc: 'يتم تصدير النسخة الاحتياطية تلقائياً إلى جهازك وتسجيلها في السجل مرتبة من الأحدث للأقدم مع أعداد التحصيلات.',
                exportBackupBtn: 'تصدير نسخة احتياطية',
                importBackupBtn: 'استيراد نسخة احتياطية',
                aiAssistantTitle: 'مساعد سند AI',
                aiWelcome: 'مرحباً بك في مساعد سند AI. اسألني وسأرد عليك فوراً.',
                aiPlaceholder: 'اسأل مساعد سند AI عن أي شيء...',
                toastDone: 'تم التنفيذ بنجاح'
            },
            en: {
                dir: 'ltr',
                lang: 'en',
                brandName: 'Sanad AI',
                scientificName: 'Sanad Distributed Smart Instant Communication & Digital Monitoring System',
                uptimePill: '24/7 • Global • v' + CLIENT_APP_VERSION,
                tabs: {
                    chats: 'Chats',
                    groups: 'Groups',
                    accounts: 'Accounts',
                    contacts: 'Contacts',
                    calls: 'Calls',
                    ai: 'AI Hub'
                },
                wsOnline: 'Sanad Active 24/7 • Global Network',
                wsReconnecting: 'Reconnecting session...',
                notifBtn: 'Alert',
                notifActive: 'Active',
                langBtnLabel: 'عربي',
                peerPlaceholder: 'Enter name, 88 code, or phone...',
                openBtn: 'Open',
                msgPlaceholder: 'Write a message or record voice...',
                autoSpeakOn: 'Auto Read: ON',
                autoSpeakOff: 'Auto Read: OFF',
                sessionActive: 'Online',
                offlineStatus: 'Offline',
                blockedStatus: 'Blocked',
                blockBtn: 'Block',
                unblockBtn: 'Unblock',
                clearBtn: 'Clear',
                replyBtn: 'Reply',
                translateBtn: 'Translate',
                speakBtn: 'Read',
                copyBtn: 'Copy',
                deleteFinalBtn: 'Delete Permanently',
                voiceRecLabel: 'Recording voice...',
                cancelBtn: 'Cancel',
                sendBtn: 'Send',
                callChannel: 'Sanad AI • Instant Call Channel',
                connectingLabel: 'Connecting...',
                callingLabel: 'Calling...',
                connectedLabel: 'Connected via Sanad System',
                incomingAudio: 'Incoming audio call...',
                incomingVideo: 'Incoming video call...',
                answerBtn: 'Answer',
                hangupBtn: 'End',
                earpieceMode: 'Earpiece',
                speakerMode: 'Speaker',
                directCallSub: 'Direct call via Sanad System',
                callsTitle: 'Voice & Video Calls',
                callsSub: 'Sanad Distributed Smart Instant Communication & Monitoring System • 24/7',
                callInputPlaceholder: 'Enter 88 code, phone, or name...',
                audioCallBtn: 'Audio Call',
                videoCallBtn: 'Video Call',
                groupsTitle: 'Communication Groups',
                groupNamePlaceholder: 'Group name',
                groupMembersPlaceholder: 'Additional members (phones or 88 codes, comma separated)',
                createGroupBtn: '+ Create Group',
                accountsTitle: 'Exclusive 88 Codes & Account Management',
                accountsDesc: 'Controlled manual generation (up to 2 per cycle to prevent abuse) with support for up to 10 linked numbers/channels and Email/SMS/Optional verification.',
                gen88Btn: '+ Generate Exclusive 88 Code',
                custom88Btn: '+ Reserve / Enter 88 Code',
                intlTitle: 'Verify International Number & Verification Channel (Email / SMS / Optional)',
                intlPhonePlaceholder: 'Phone number',
                intlEmailPlaceholder: 'Email address (optional or for OTP)',
                sendOtpBtn: 'Send 6-Digit Verification Code',
                otpPlaceholder: 'Enter 6-digit verification code',
                verifyOtpBtn: 'Confirm & Save',
                contactsTitle: 'Saved Contacts',
                importContactsBtn: 'Pick from Phone',
                exportAllVcfBtn: 'Save All (.vcf)',
                contactsDesc: 'Saving a contact prepares a .vcf card for your phone and shows a calm teal indicator when active.',
                contactNamePlaceholder: 'Contact name',
                contactIdPlaceholder: '88 code or phone number',
                saveContactPhoneBtn: 'Save & Download to Phone',
                blockedTitle: 'Blocked List',
                aiHeroTitle: 'Sanad AI • 24/7 Global Operation',
                updatesTitle: 'System Updates',
                checkUpdateBtn: 'Check Update',
                applyUpdateBtn: 'Update System Now',
                radioTitle: 'Sanad AI Radio • Smart Live Stream',
                radioDesc: 'Fast AI-powered stream supporting MP3, M4A, MP4, Holy Quran, and news channels.',
                radioStopped: 'Stopped',
                radioPlaying: 'Live',
                playRadioBtn: 'Play Radio',
                stopRadioBtn: 'Stop Radio',
                radioStandbyMsg: 'Radio on standby -- press "Play Radio" to start live streaming.',
                adhanTitle: 'Automated Quran & Real Adhan',
                adhanDesc: 'Automated Quran and Adhan schedule including Friday, Tahajjud, and Ramadan.',
                autoSwitchLbl: 'Auto Switch',
                quranNowBtn: 'Quran Stream Now',
                adhanNowBtn: 'Adhan Now',
                marineTitle: 'Weather, Marine & Satellite Monitor',
                refreshBtn: 'Refresh',
                backupTitle: 'Backup & Collections Log',
                backupDesc: 'Backups are automatically exported to your device and logged from newest to oldest.',
                exportBackupBtn: 'Export Backup',
                importBackupBtn: 'Import Backup',
                aiAssistantTitle: 'Sanad AI Assistant',
                aiWelcome: 'Welcome to Sanad AI Assistant. Ask me anything.',
                aiPlaceholder: 'Ask Sanad AI Assistant...',
                toastDone: 'Done successfully'
            }
        };

        function getDict() {
            return SANAD_I18N[sanadUiLang] || SANAD_I18N.ar;
        }

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
                .split('\\').join('\\\\')
                .split("'").join("\\'")
                .split('\r').join(' ')
                .split('\n').join(' ');
        }

        function getActiveTabLabels() {
            return getDict().tabs;
        }

        function setTextById(id, txt) {
            var el = document.getElementById(id);
            if (el && typeof txt === 'string') el.textContent = txt;
        }

        function setPlaceholderById(id, txt) {
            var el = document.getElementById(id);
            if (el && typeof txt === 'string') el.placeholder = txt;
        }

        function applyUiLanguage(langCode) {
            sanadUiLang = langCode === 'en' ? 'en' : 'ar';
            var dict = getDict();
            var root = document.getElementById('sanad-html-root');
            if (root) {
                root.setAttribute('lang', dict.lang);
                root.setAttribute('dir', dict.dir);
            }

            setTextById('brand-main-title', dict.brandName);
            setTextById('brand-uptime-pill', dict.uptimePill);
            setTextById('lang-toggle-btn', dict.langBtnLabel);
            setPlaceholderById('peer-input', dict.peerPlaceholder);
            setTextById('open-peer-btn', dict.openBtn);
            setPlaceholderById('msg-box-input', dict.msgPlaceholder);
            setTextById('voice-rec-label-txt', dict.voiceRecLabel);
            setTextById('voice-cancel-btn', dict.cancelBtn);
            setTextById('voice-send-btn', dict.sendBtn);
            setTextById('call-channel-sub', dict.callChannel);
            setTextById('direct-call-sub', dict.directCallSub);
            setTextById('accept-btn-label', dict.answerBtn);
            setTextById('hangup-btn-label', dict.hangupBtn);
            setTextById('calls-heading', dict.callsTitle);
            setTextById('calls-sub-heading', dict.callsSub);
            setPlaceholderById('call-input', dict.callInputPlaceholder);
            setTextById('audio-call-btn-txt', dict.audioCallBtn);
            setTextById('video-call-btn-txt', dict.videoCallBtn);
            setTextById('groups-heading', dict.groupsTitle);
            setPlaceholderById('g-name', dict.groupNamePlaceholder);
            setPlaceholderById('g-members', dict.groupMembersPlaceholder);
            setTextById('create-group-btn', dict.createGroupBtn);
            setTextById('accounts-heading', dict.accountsTitle);
            setTextById('accounts-desc-txt', dict.accountsDesc);
            setTextById('gen-88-btn', dict.gen88Btn);
            setTextById('custom-88-btn', dict.custom88Btn);
            setTextById('intl-heading', dict.intlTitle);
            setPlaceholderById('intl-phone-input', dict.intlPhonePlaceholder);
            setPlaceholderById('intl-email-input', dict.intlEmailPlaceholder);
            setTextById('send-otp-btn', dict.sendOtpBtn);
            setPlaceholderById('otp-code-input', dict.otpPlaceholder);
            setTextById('verify-otp-btn', dict.verifyOtpBtn);
            setTextById('contacts-heading', dict.contactsTitle);
            setTextById('import-contacts-btn-txt', dict.importContactsBtn);
            setTextById('export-all-vcf-btn-txt', dict.exportAllVcfBtn);
            setTextById('contacts-desc-txt', dict.contactsDesc);
            setPlaceholderById('c-name', dict.contactNamePlaceholder);
            setPlaceholderById('c-id', dict.contactIdPlaceholder);
            setTextById('save-contact-phone-btn', dict.saveContactPhoneBtn);
            setTextById('blocked-heading', dict.blockedTitle);
            setTextById('ai-hero-heading', dict.aiHeroTitle);
            setTextById('ai-hero-sub', dict.scientificName);
            setTextById('updates-heading', dict.updatesTitle);
            setTextById('check-update-btn', dict.checkUpdateBtn);
            setTextById('apply-update-btn-txt', dict.applyUpdateBtn);
            setTextById('radio-heading', dict.radioTitle);
            setTextById('radio-desc-txt', dict.radioDesc);
            setTextById('adhan-heading', dict.adhanTitle);
            setTextById('adhan-desc-txt', dict.adhanDesc);
            setTextById('auto-switch-lbl', dict.autoSwitchLbl);
            setTextById('quran-now-btn-txt', dict.quranNowBtn);
            setTextById('adhan-now-btn-txt', dict.adhanNowBtn);
            setTextById('marine-heading', dict.marineTitle);
            setTextById('refresh-marine-btn', dict.refreshBtn);
            setTextById('backup-heading', dict.backupTitle);
            setTextById('backup-desc-txt', dict.backupDesc);
            setTextById('export-backup-btn-txt', dict.exportBackupBtn);
            setTextById('import-backup-btn-txt', dict.importBackupBtn);
            setTextById('ai-assistant-heading', dict.aiAssistantTitle);
            setPlaceholderById('ai-q', dict.aiPlaceholder);
            setTextById('ai-send-btn', dict.sendBtn);

            var navMap = {
                chats: 'nav-lbl-chats',
                groups: 'nav-lbl-groups',
                accounts: 'nav-lbl-accounts',
                contacts: 'nav-lbl-contacts',
                calls: 'nav-lbl-calls',
                ai: 'nav-lbl-ai'
            };
            Object.keys(navMap).forEach(function(k) {
                var el = document.getElementById(navMap[k]);
                if (el && dict.tabs[k]) el.textContent = dict.tabs[k];
            });

            var tabBadge = document.getElementById('current-tab-badge');
            var curTab = window.__sanadCurrentTab || 'chats';
            if (tabBadge && dict.tabs[curTab]) tabBadge.textContent = dict.tabs[curTab];

            var wsLbl = document.getElementById('ws-label');
            if (wsLbl && ws && ws.readyState === 1) wsLbl.textContent = dict.wsOnline;

            if (typeof syncSpeakerButtonUi === 'function') syncSpeakerButtonUi();
            if (typeof persistState === 'function') persistState();
            if (typeof syncNotificationBadge === 'function') syncNotificationBadge();
            if (typeof syncAutoSpeakUi === 'function') syncAutoSpeakUi();
            if (typeof renderPeerHeader === 'function') renderPeerHeader();
            if (typeof renderMsgs === 'function') renderMsgs();
            if (typeof renderPresence === 'function') renderPresence();
            if (typeof renderBlockedList === 'function') renderBlockedList();
            if (typeof renderGroupsList === 'function') renderGroupsList();
            if (typeof renderAccts === 'function') renderAccts();
            if (typeof renderBackupHistoryList === 'function') renderBackupHistoryList();
            if (typeof syncRadioUi === 'function') syncRadioUi();
            if (typeof refreshUpdateStatusInAi === 'function') refreshUpdateStatusInAi();
        }

        function toggleUiLanguage() {
            applyUiLanguage(sanadUiLang === 'ar' ? 'en' : 'ar');
        }

        window.__sanadCurrentTab = 'chats';

        function applySanadPaneDisplay(tabName) {
            var labels = getActiveTabLabels();
            var target = labels[tabName] ? tabName : 'chats';
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
            if (tabBadge) tabBadge.textContent = labels[target];
        }

        function setPane(p) {
            var labels = getActiveTabLabels();
            var target = labels[p] ? p : 'chats';
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

    <audio id="remote-audio-el" autoplay playsinline></audio>
    <audio id="radio-audio-el" preload="auto" playsinline class="hidden"></audio>
    <video id="radio-mp4-el" preload="auto" playsinline class="hidden"></video>
    <audio id="devotional-audio-el" preload="none" playsinline class="hidden"></audio>

    <div id="auto-update-banner" class="hidden bg-gradient-to-r from-[#0b3945] via-[#0f4c5c] to-[#0b3945] border-b border-teal-500/40 text-white px-3.5 py-2 flex items-center justify-between gap-2 text-xs z-30 shrink-0">
        <span id="auto-update-banner-text" class="font-semibold truncate">يتوفر تحديث جديد للمنظومة -- اضغط للتحديث الآن.</span>
        <button type="button" onclick="applySystemUpdateNow()" class="bg-teal-700 hover:bg-teal-600 text-white font-bold px-3 py-1 rounded-lg text-[11px] shrink-0">تحديث الآن</button>
    </div>

    <header class="bg-[#0b1b26]/95 border-b border-teal-950/80 px-3.5 py-2 flex justify-between items-center z-20 shrink-0">
        <div class="flex items-center gap-2.5 min-w-0">
            <button type="button" onclick="openIdentityQrModal()" title="هوية منظومة سند وكود التعريف" class="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-[#135c6b] via-[#0f4c5c] to-[#0a313c] border border-teal-400/35 flex items-center justify-center shrink-0 shadow overflow-hidden">
                <img src="/icon-192.png" alt="سند AI" class="w-full h-full object-cover">
                <span id="header-unread-dot" class="hidden absolute -top-1.5 -left-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-mono font-bold flex items-center justify-center shadow">0</span>
            </button>
            <div class="min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                    <h1 id="brand-main-title" class="font-bold text-base sanad-brand-title leading-none">سند AI</h1>
                    <span id="brand-uptime-pill" class="text-[10px] bg-teal-950/85 text-teal-200 border border-teal-800/70 px-2 py-0.5 rounded-full font-semibold">24/7 • عالمي • v${APP_VERSION}</span>
                    <span id="current-tab-badge" class="text-[10px] bg-[#0e2736] text-teal-100 border border-teal-900/80 px-2 py-0.5 rounded-full font-semibold">الدردشة</span>
                </div>
                <div class="flex items-center gap-1.5 text-[11px] mt-0.5 flex-wrap">
                    <span id="ws-dot" class="w-2.5 h-2.5 rounded-full sanad-teal-dot"></span>
                    <span id="ws-label" class="sanad-teal-text font-semibold">منظومة سند نشطة 24/7 • شبكة عالمية</span>
                    <button type="button" onclick="reconnectNow()" title="تحديث الربط" class="text-slate-300 hover:text-white px-1">
                        <i class="fa-solid fa-rotate-right text-[10px]"></i>
                    </button>
                    <span class="text-slate-600">•</span>
                    <button type="button" onclick="openIdentityQrModal()" class="font-mono font-semibold text-teal-200 hover:underline truncate max-w-[130px]" id="active-acct-label"></button>
                </div>
            </div>
        </div>

        <div class="flex items-center gap-1.5 shrink-0">
            <button type="button" id="lang-toggle-btn" onclick="toggleUiLanguage()" title="تبديل اللغة العربية / الإنجليزية" class="px-2 h-9 rounded-xl bg-[#0e2736] hover:bg-[#14374b] border border-teal-900/70 text-teal-200 flex items-center justify-center text-[11px] font-bold transition">
                EN
            </button>
            <button type="button" onclick="requestSystemNotifications()" title="حالة وتفعيل الإشعارات" class="px-2.5 h-9 rounded-xl bg-[#0e2736] hover:bg-[#14374b] border border-teal-900/70 text-amber-200 flex items-center gap-1 text-[11px] font-semibold transition">
                <i class="fa-solid fa-bell text-xs"></i><span id="notif-status-txt">إشعار</span>
            </button>
            <button type="button" onclick="launchCall('audio')" title="مكالمة صوتية" class="w-9 h-9 rounded-xl bg-teal-950/85 hover:bg-teal-900 border border-teal-800/70 text-teal-200 flex items-center justify-center transition">
                <i class="fa-solid fa-phone text-xs"></i>
            </button>
            <button type="button" onclick="launchCall('video')" title="مكالمة فيديو" class="w-9 h-9 rounded-xl bg-[#0e2736] hover:bg-[#14374b] border border-teal-900/70 text-teal-200 flex items-center justify-center transition">
                <i class="fa-solid fa-video text-xs"></i>
            </button>
        </div>
    </header>

    <div id="copy-toast-banner" class="hidden fixed top-14 left-1/2 -translate-x-1/2 bg-teal-950/95 border border-teal-600/60 text-teal-100 px-4 py-1.5 rounded-full shadow-xl z-50 text-xs font-semibold">
        تم التنفيذ بنجاح
    </div>

    <div id="live-toast" onclick="jumpToToastChat()" class="hidden fixed top-16 left-3 right-3 max-w-md mx-auto bg-[#0b1b26]/95 border border-teal-800/80 text-slate-100 px-3.5 py-2.5 rounded-2xl shadow-2xl z-40 flex items-center justify-between gap-2 cursor-pointer text-xs">
        <div class="min-w-0">
            <p id="toast-sender" class="font-bold sanad-teal-text truncate">رسالة جديدة</p>
            <p id="toast-body" class="text-slate-200 truncate">...</p>
        </div>
        <span class="bg-teal-950 text-teal-200 border border-teal-800/70 px-2 py-1 rounded-lg text-[10px] font-semibold shrink-0">فتح</span>
    </div>

    <div id="delete-msg-modal" onclick="if(event.target===this)closeDeleteMsgModal()" class="hidden fixed inset-0 bg-[#061017]/88 z-50 flex items-center justify-center p-4">
        <div class="bg-[#0b1b26] border border-slate-700 rounded-2xl w-full max-w-xs p-4 space-y-3 shadow-2xl text-xs">
            <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 class="font-bold text-rose-300"><i class="fa-solid fa-trash-can ml-1"></i> حذف نهائي للرسالة</h3>
                <button type="button" onclick="closeDeleteMsgModal()" class="text-slate-400 hover:text-white"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <p class="text-slate-300 leading-relaxed">يرجى اختيار نطاق الحذف النهائي المطلوب:</p>
            <div class="space-y-2">
                <button type="button" onclick="confirmDeleteMessage('self')" class="w-full bg-[#0e2736] hover:bg-[#14374b] border border-slate-700 text-white py-2.5 px-3 rounded-xl font-semibold text-right">
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

    <div id="identity-qr-modal" onclick="if(event.target===this)closeIdentityQrModal()" class="hidden fixed inset-0 bg-[#061017]/88 z-50 flex items-center justify-center p-3.5 overflow-y-auto">
        <div class="bg-[#0b1b26] border border-teal-800/70 rounded-3xl w-full max-w-md p-4 space-y-3 shadow-2xl my-auto">
            <div class="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <h3 class="text-sm font-bold sanad-brand-title"><i class="fa-solid fa-satellite-dish ml-1"></i> ${SYSTEM_SCIENTIFIC_NAME}</h3>
                <button type="button" onclick="closeIdentityQrModal()" class="text-slate-400 hover:text-white text-sm"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <img src="/icon-512.png" alt="شعار سند AI" class="w-24 h-24 rounded-2xl mx-auto border border-teal-400/35 shadow-lg">
            <p class="text-[11px] text-slate-300 leading-relaxed text-center">منظومة برمجية موزّعة تعمل على مدار 24 ساعة في مختلف المناطق عبر الشبكات السحابية والذكاء الاصطناعي.</p>
            <div class="bg-[#07131c] border border-slate-800 rounded-2xl p-3 flex flex-col items-center gap-2">
                <div class="text-[11px] text-slate-400">معرّف الجلسة النشط</div>
                <div id="qr-modal-acct-id" class="font-mono text-base font-bold text-teal-200"></div>
                <div class="flex flex-wrap justify-center gap-1.5 text-xs">
                    <button type="button" onclick="copyStringToClipboard(activeAcct, 'تم نسخ كود التعريف')" class="sanad-primary-btn px-3 py-1.5 rounded-xl font-semibold">نسخ الكود</button>
                    <button type="button" onclick="saveContactToDeviceVcf(activeAcct, resolveContactName(activeAcct), true)" class="bg-teal-900 hover:bg-teal-800 text-white px-3 py-1.5 rounded-xl font-semibold"><i class="fa-solid fa-address-card ml-1"></i>حفظ في الجوال (.vcf)</button>
                </div>
            </div>
            <div class="flex gap-1.5">
                <input type="text" id="qr-manual-code-input" oninput="normalizeDigitsInInput(this)" placeholder="أدخل كود 88 أو رقم دولي لفتح الدردشة..." class="flex-1 bg-[#07131c] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono">
                <button type="button" onclick="connectFromQrOrCodeInput()" class="sanad-primary-btn px-3 py-1.5 rounded-xl text-xs font-semibold">فتح</button>
            </div>
        </div>
    </div>

    <div id="call-modal" class="hidden fixed inset-0 bg-[#061017]/95 z-50 flex flex-col items-center justify-between p-4">
        <div class="text-center mt-1">
            <p id="call-channel-sub" class="text-xs text-teal-300 font-semibold">سند AI • قناة اتصال عالمية مشفّرة</p>
            <h2 id="call-peer-title" class="text-lg font-bold text-white mt-0.5">...</h2>
            <p id="call-timer-el" class="text-xs font-mono font-semibold text-slate-300 mt-0.5">00:00</p>
            <p id="call-status-msg" class="text-xs sanad-teal-text mt-0.5 font-medium">جاري الربط...</p>
        </div>
        <div class="relative w-full max-w-sm flex-1 my-2.5 max-h-[58vh] aspect-[9/16] bg-[#0b1b26] rounded-3xl border border-slate-800 overflow-hidden flex items-center justify-center shadow-2xl">
            <video id="remote-video-el" autoplay playsinline class="w-full h-full object-cover hidden"></video>
            <video id="local-video-el" autoplay playsinline muted class="w-24 h-36 object-cover rounded-2xl border-2 border-teal-400/70 shadow-lg absolute bottom-3 left-3 hidden"></video>
            <div id="voice-call-card" class="flex flex-col items-center gap-2.5 px-4 text-center">
                <div class="w-20 h-20 rounded-full bg-teal-950/85 border border-teal-800/70 flex items-center justify-center text-3xl text-teal-200 animate-pulse">
                    <i class="fa-solid fa-microphone-lines"></i>
                </div>
                <span id="direct-call-sub" class="text-xs text-slate-300 font-medium">اتصال مباشر عبر منظومة سند</span>
            </div>
        </div>
        <div class="flex items-center gap-2 mb-2 flex-wrap justify-center">
            <button type="button" id="accept-btn" onclick="answerCall()" class="hidden bg-teal-700 hover:bg-teal-600 border border-teal-400/40 text-white px-4 py-3 rounded-2xl font-semibold text-xs animate-bounce">
                <i class="fa-solid fa-phone ml-1"></i><span id="accept-btn-label">رد الآن</span>
            </button>
            <button type="button" id="speaker-toggle-btn" onclick="toggleCallSpeakerMode()" title="تبديل بين سماعة الأذن ومكبر الصوت" class="px-3 py-3 rounded-2xl bg-[#0e2736] hover:bg-[#14374b] border border-slate-700 text-teal-200 flex items-center gap-1.5 text-xs font-semibold">
                <i id="speaker-icon" class="fa-solid fa-ear-listen"></i><span id="speaker-btn-label">سماعة الأذن</span>
            </button>
            <button type="button" id="mute-btn" onclick="toggleMuteTrack()" title="كتم / تشغيل الميكروفون" class="w-11 h-11 rounded-2xl bg-[#0e2736] hover:bg-[#14374b] border border-slate-700 text-white flex items-center justify-center">
                <i id="mute-icon" class="fa-solid fa-microphone"></i>
            </button>
            <button type="button" onclick="endActiveCall()" class="bg-rose-800 hover:bg-rose-700 text-white px-4 py-3 rounded-2xl font-semibold text-xs">
                <i class="fa-solid fa-phone-slash ml-1"></i><span id="hangup-btn-label">إنهاء</span>
            </button>
        </div>
    </div>

    <main class="flex-1 flex flex-col overflow-hidden">
        <section id="pane-chats" class="sanad-pane sanad-pane-active flex-1 flex-col h-full overflow-hidden">
            <div class="p-2 bg-[#0b1b26]/90 border-b border-slate-800/80 space-y-1.5 shrink-0">
                <div class="flex gap-2">
                    <input type="text" id="peer-input" oninput="normalizeDigitsInInput(this); onTopPeerSearchInput();" onkeydown="if(event.key==='Enter'){event.preventDefault();openPeerByInput();}" placeholder="اكتب الاسم أو الكود أو الرقم..." class="flex-1 bg-[#07131c] border border-slate-800 rounded-xl px-3 py-1.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-teal-700">
                    <button type="button" id="open-peer-btn" onclick="openPeerByInput()" class="sanad-primary-btn px-3.5 py-1.5 rounded-xl text-xs font-semibold">فتح</button>
                    <button type="button" onclick="saveCurrentPeerToPhoneContacts()" title="حفظ في جهات اتصال الجوال" class="bg-[#0e2736] hover:bg-[#14374b] border border-slate-700 text-teal-200 px-2.5 py-1.5 rounded-xl text-xs font-semibold">
                        <i class="fa-solid fa-address-card"></i>
                    </button>
                </div>
                <div id="quick-chips" class="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs"></div>
            </div>

            <div class="px-3.5 py-1.5 bg-[#091620] border-b border-slate-800/80 flex justify-between items-center gap-2 text-xs shrink-0">
                <div class="flex items-center gap-2 min-w-0">
                    <span id="peer-dot" class="w-2.5 h-2.5 rounded-full sanad-teal-dot shrink-0"></span>
                    <span id="peer-title" class="font-bold text-slate-100 truncate"></span>
                    <span id="peer-status" class="text-[11px] font-semibold sanad-teal-text shrink-0">متصل نشط</span>
                </div>
                <div class="flex items-center gap-2 shrink-0 text-[11px]">
                    <button type="button" id="auto-speak-toggle-btn" onclick="toggleAutoSpeakIncoming()" class="text-teal-200 hover:text-white font-medium" title="قراءة الرسائل الواردة صوتياً">قراءة تلقائية: إيقاف</button>
                    <button type="button" onclick="launchCall('audio')" class="text-teal-300 hover:text-white"><i class="fa-solid fa-phone"></i></button>
                    <button type="button" onclick="launchCall('video')" class="text-teal-200 hover:text-white"><i class="fa-solid fa-video"></i></button>
                    <button type="button" id="chat-block-btn" onclick="toggleBlockCurrentPeer()" class="text-amber-300 hover:text-amber-200 font-medium">حظر</button>
                    <button type="button" id="chat-clear-btn" onclick="clearThreadMsgs()" class="text-rose-300 hover:text-rose-200 font-medium">مسح</button>
                </div>
            </div>

            <div id="msgs-box" class="flex-1 overflow-y-auto p-3.5 space-y-2.5 custom-scrollbar"></div>

            <div id="reply-preview-bar" class="hidden px-3.5 py-2 bg-[#0d2432] border-t border-teal-800/60 flex items-center justify-between gap-2 text-xs shrink-0">
                <div class="min-w-0 border-r-2 border-teal-400 pr-2">
                    <div id="reply-preview-author" class="font-bold text-teal-200 truncate">رد على رسالة</div>
                    <div id="reply-preview-text" class="text-slate-300 truncate">...</div>
                </div>
                <button type="button" onclick="clearReplyTarget()" class="text-slate-400 hover:text-white px-1.5"><i class="fa-solid fa-xmark"></i></button>
            </div>

            <div id="voice-rec-bar" class="hidden px-3.5 py-2 bg-[#0e2a38] border-t border-teal-800/60 flex items-center justify-between gap-2 text-xs shrink-0">
                <div class="flex items-center gap-2 text-teal-200 font-semibold">
                    <span class="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
                    <span id="voice-rec-label-txt">جاري التسجيل الصوتي...</span>
                    <span id="voice-rec-timer" class="font-mono text-white">00:00</span>
                </div>
                <div class="flex items-center gap-1.5">
                    <button type="button" id="voice-cancel-btn" onclick="cancelVoiceRecording()" class="bg-[#0e2736] hover:bg-[#14374b] text-slate-200 px-2.5 py-1 rounded-lg font-semibold">إلغاء</button>
                    <button type="button" onclick="finishVoiceRecordingAndSend()" class="bg-teal-700 hover:bg-teal-600 text-white px-3 py-1 rounded-lg font-semibold"><i class="fa-solid fa-paper-plane ml-1"></i><span id="voice-send-btn">إرسال</span></button>
                </div>
            </div>

            <div class="p-2.5 bg-[#0b1b26] border-t border-slate-800 flex items-end gap-1.5 shrink-0">
                <input type="file" id="attach-file" accept="image/*,.pdf,.doc,.docx,.txt,.zip" class="hidden" onchange="onFilePicked(event)">
                <button type="button" onclick="document.getElementById('attach-file').click()" title="إرفاق ملف أو صورة" class="text-slate-300 hover:text-white p-2 rounded-xl hover:bg-[#0e2736] shrink-0"><i class="fa-solid fa-paperclip text-base"></i></button>
                <button type="button" id="mic-rec-btn" onclick="toggleVoiceRecording()" title="تسجيل صوتي" class="text-teal-200 hover:text-white bg-[#0e2736] hover:bg-[#14374b] border border-slate-700 p-2 rounded-xl shrink-0 transition"><i class="fa-solid fa-microphone text-base"></i></button>
                <textarea id="msg-box-input" rows="1" oninput="autoResizeComposer(this)" onkeydown="if(event.key==='Enter' && !event.shiftKey){event.preventDefault();sendTextMsg();}" placeholder="اكتب رسالتك أو سجّل صوتك..." class="flex-1 bg-[#07131c] border border-slate-800 rounded-xl px-3 py-2 sanad-composer-font text-white placeholder-slate-400 focus:outline-none focus:border-teal-700 resize-none max-h-28 overflow-y-auto custom-scrollbar"></textarea>
                <button type="button" onclick="sendTextMsg()" class="sanad-primary-btn px-4 py-2.5 rounded-xl text-sm font-semibold shadow shrink-0"><i class="fa-solid fa-paper-plane"></i></button>
            </div>
        </section>

        <section id="pane-groups" class="sanad-pane hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-3">
            <div class="bg-[#0b1b26] border border-slate-800 p-4 rounded-2xl space-y-3">
                <div class="flex items-center justify-between">
                    <h2 id="groups-heading" class="text-sm font-bold sanad-brand-title"><i class="fa-solid fa-users ml-1"></i> مجموعات التواصل</h2>
                    <span id="groups-count-badge" class="text-[11px] font-mono text-slate-200 bg-[#0e2736] border border-slate-700 px-2.5 py-0.5 rounded-full">0</span>
                </div>
                <input type="text" id="g-name" placeholder="اسم المجموعة" class="w-full bg-[#07131c] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                <input type="text" id="g-members" oninput="normalizeDigitsInInput(this)" placeholder="أعضاء إضافيون (أرقام أو أكواد 88... مفصولة بفاصلة)" class="w-full bg-[#07131c] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono">
                <button type="button" id="create-group-btn" onclick="createSanadGroup()" class="sanad-primary-btn px-4 py-2 rounded-xl text-xs font-semibold">+ إنشاء مجموعة</button>
            </div>
            <div id="groups-list" class="space-y-2"></div>
        </section>

        <section id="pane-accounts" class="sanad-pane hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-4">
            <div class="bg-[#0b1b26] border border-slate-800 p-4 rounded-2xl space-y-3">
                <div class="flex items-center justify-between gap-2 flex-wrap">
                    <h2 id="accounts-heading" class="text-sm font-bold sanad-brand-title">توليد الأكواد الحصرية (88...) وإدارة الحسابات</h2>
                    <span id="accounts-quota-badge" class="text-[11px] font-mono text-teal-200 bg-teal-950/80 border border-teal-800/70 px-2.5 py-0.5 rounded-full">التوليد: 0/2</span>
                    <span id="accounts-count-badge" class="text-[11px] font-mono text-slate-200 bg-[#0e2736] border border-slate-700 px-2.5 py-0.5 rounded-full">1</span>
                </div>
                <p id="accounts-desc-txt" class="text-[11px] text-slate-400">توليد منضبط (حد 2 كود يدوي في الدورة لمنع العبث) مع إمكانية ربط حتى 10 أرقام/وسائل اتصال والتحقق عبر الإيميل أو SMS أو اختياري.</p>
                <div class="flex flex-wrap gap-2">
                    <button type="button" id="gen-88-btn" onclick="generate88DigitCode()" class="sanad-primary-btn px-4 py-2.5 rounded-xl text-xs font-semibold">+ توليد كود حصري (8 أرقام يبدأ بـ 88)</button>
                    <button type="button" id="custom-88-btn" onclick="addCustom88OrId()" class="bg-[#0e2736] hover:bg-[#14374b] border border-slate-700 text-slate-100 px-4 py-2.5 rounded-xl text-xs font-semibold">+ حجز/إدخال كود 88</button>
                </div>
                <div id="last-generated-banner" class="hidden bg-[#07131c] border border-teal-800/60 rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs">
                    <span id="last-generated-text" class="font-mono font-semibold text-teal-200"></span>
                    <div class="flex gap-1.5">
                        <button type="button" onclick="saveContactToDeviceVcf(lastGeneratedCode, 'سند ' + lastGeneratedCode, true)" class="bg-teal-900 text-white px-2.5 py-1 rounded-lg text-[11px] font-semibold">VCF</button>
                        <button type="button" onclick="copyStringToClipboard(lastGeneratedCode)" class="sanad-primary-btn px-2.5 py-1 rounded-lg text-[11px] font-semibold">نسخ</button>
                    </div>
                </div>
                <div id="accounts-list" class="space-y-2 pt-1"></div>
            </div>

            <div class="bg-[#0b1b26] border border-slate-800 p-4 rounded-2xl space-y-3 text-xs">
                <div class="flex items-center justify-between gap-2">
                    <h3 id="intl-heading" class="text-sm font-bold text-teal-200"><i class="fa-solid fa-envelope-circle-check ml-1"></i> تفعيل رقم دولي واختيار وسيلة التحقق (إيميل / SMS / اختياري)</h3>
                    <span class="text-[10px] bg-[#0e2736] text-teal-200 border border-teal-800/70 px-2 py-0.5 rounded-full">OTP</span>
                </div>
                <div class="grid grid-cols-3 gap-2">
                    <input type="text" id="intl-cc-input" oninput="normalizeDigitsInInput(this)" value="+967" placeholder="+967" class="bg-[#07131c] border border-slate-800 rounded-xl px-3 py-2 font-mono text-white text-center">
                    <input type="text" id="intl-phone-input" oninput="normalizeDigitsInInput(this)" placeholder="رقم الجوال" class="col-span-2 bg-[#07131c] border border-slate-800 rounded-xl px-3 py-2 font-mono text-white">
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select id="intl-delivery-channel" class="bg-[#07131c] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                        <option value="optional">اختياري (إيميل أو SMS حسب المتاح)</option>
                        <option value="email">عبر البريد الإلكتروني (Email)</option>
                        <option value="sms">عبر رسالة نصية (SMS على الرقم)</option>
                        <option value="both">إيميل + SMS معاً</option>
                    </select>
                    <input type="email" id="intl-email-input" placeholder="البريد الإلكتروني (اختياري أو لرمز التحقق)" class="bg-[#07131c] border border-slate-800 rounded-xl px-3 py-2 text-white">
                </div>
                <button type="button" id="send-otp-btn" onclick="requestSanadVerificationCode()" class="w-full sanad-primary-btn py-2 px-3 rounded-xl font-semibold">إرسال رمز التحقق (6 أرقام)</button>
                <div id="otp-delivery-box" class="hidden bg-[#07131c] border border-teal-800/60 rounded-xl p-2.5 space-y-2">
                    <div id="otp-delivery-msg" class="text-[11px] text-teal-200 font-mono"></div>
                    <div class="flex gap-2">
                        <input type="text" id="otp-code-input" maxlength="6" oninput="normalizeDigitsInInput(this)" placeholder="أدخل الكود المكون من 6 أرقام" class="flex-1 bg-[#0b1b26] border border-slate-700 rounded-xl px-3 py-1.5 font-mono text-white">
                        <button type="button" id="verify-otp-btn" onclick="verifySanadPhoneCode()" class="sanad-primary-btn px-4 py-1.5 rounded-xl font-semibold">تأكيد وحفظ</button>
                    </div>
                </div>
            </div>
        </section>

        <section id="pane-contacts" class="sanad-pane hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-3">
            <div class="bg-[#0b1b26] border border-slate-800 p-3.5 rounded-2xl space-y-2.5">
                <div class="flex items-center justify-between gap-2 flex-wrap">
                    <h2 id="contacts-heading" class="text-sm font-bold sanad-brand-title">الجهات والأسماء المحفوظة</h2>
                    <div class="flex gap-1.5 flex-wrap">
                        <button type="button" onclick="importFromDeviceContactsPicker()" class="bg-[#0e2736] hover:bg-[#14374b] border border-slate-700 text-teal-200 px-2.5 py-1 rounded-lg text-[11px] font-semibold"><i class="fa-solid fa-mobile-screen-button ml-1"></i><span id="import-contacts-btn-txt">جلب من الجوال</span></button>
                        <button type="button" onclick="exportAllContactsVcf(true)" class="bg-[#0e2736] hover:bg-[#14374b] border border-slate-700 text-teal-200 px-2.5 py-1 rounded-lg text-[11px] font-semibold"><i class="fa-solid fa-address-book ml-1"></i><span id="export-all-vcf-btn-txt">حفظ الكل (.vcf)</span></button>
                    </div>
                </div>
                <p id="contacts-desc-txt" class="text-[11px] text-slate-400">عند حفظ اسم الشخص يتم تجهيز ملف جهة الاتصال (.vcf) للجوال تلقائياً ويظهر بمؤشر أخضر/بترولي هادئ عند نشاط جلسته.</p>
                <div class="flex flex-col sm:flex-row gap-2">
                    <input type="text" id="c-name" placeholder="اسم الشخص" class="bg-[#07131c] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                    <input type="text" id="c-id" oninput="normalizeDigitsInInput(this)" placeholder="كود 88... أو رقم الجوال" class="flex-1 bg-[#07131c] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono">
                    <button type="button" id="save-contact-phone-btn" onclick="addContactAndSaveToPhone()" class="sanad-primary-btn px-4 py-2 rounded-xl text-xs font-semibold">حفظ وتنزيل للجوال</button>
                </div>
            </div>
            <div id="contacts-list" class="space-y-2"></div>

            <div class="bg-[#0b1b26] border border-rose-900/50 p-3.5 rounded-2xl space-y-2">
                <div class="flex items-center justify-between">
                    <h3 id="blocked-heading" class="text-xs font-bold text-rose-300"><i class="fa-solid fa-ban ml-1"></i> قائمة المحظورين</h3>
                    <span id="blocked-count-badge" class="text-[10px] font-mono text-rose-200 bg-rose-950/80 border border-rose-800/60 px-2 py-0.5 rounded-full">0</span>
                </div>
                <div id="blocked-list" class="space-y-1.5"></div>
            </div>
        </section>

        <section id="pane-calls" class="sanad-pane hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-4">
            <div class="bg-[#0b1b26] border border-slate-800 p-4 rounded-2xl space-y-3 text-center">
                <h2 id="calls-heading" class="text-base font-bold sanad-brand-title">المكالمات الصوتية والمرئية</h2>
                <p id="calls-sub-heading" class="text-xs text-slate-300">${SYSTEM_SCIENTIFIC_NAME} • تشغيل 24/7</p>
                <input type="text" id="call-input" oninput="normalizeDigitsInInput(this); onCallDialInput();" onkeydown="if(event.key==='Enter'){event.preventDefault();startDialedCall('audio');}" placeholder="اكتب الكود أو الرقم أو الاسم..." class="w-full max-w-md mx-auto bg-[#07131c] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-center font-mono text-white">
                <div id="call-resolved-preview" class="text-[11px] text-teal-200 font-semibold min-h-[18px]"></div>
                <div class="flex gap-3 justify-center pt-1 flex-wrap">
                    <button type="button" onclick="startDialedCall('audio')" class="sanad-primary-btn px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2"><i class="fa-solid fa-phone"></i><span id="audio-call-btn-txt">مكالمة صوتية</span></button>
                    <button type="button" onclick="startDialedCall('video')" class="bg-[#0e2736] hover:bg-[#14374b] border border-slate-700 text-slate-100 px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2"><i class="fa-solid fa-video"></i><span id="video-call-btn-txt">مكالمة فيديو</span></button>
                </div>
            </div>
        </section>

        <section id="pane-ai" class="sanad-pane hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-3">
            <div class="bg-gradient-to-br from-[#0f3846] to-[#0b1b26] border border-teal-800/60 p-4 rounded-2xl flex items-center gap-3">
                <img src="/icon-192.png" alt="سند AI" class="w-14 h-14 rounded-2xl border border-teal-400/35 shrink-0">
                <div class="space-y-1 min-w-0">
                    <div class="flex items-center justify-between gap-2">
                        <span id="ai-hero-heading" class="text-sm font-bold sanad-brand-title truncate">سند AI • تشغيل 24/7 عالمياً</span>
                        <span class="text-[10px] font-mono bg-teal-950 text-teal-200 border border-teal-800 px-2 py-0.5 rounded-full shrink-0">v${APP_VERSION}</span>
                    </div>
                    <p id="ai-hero-sub" class="text-xs text-slate-300">${SYSTEM_SCIENTIFIC_NAME}.</p>
                </div>
            </div>

            <div class="bg-[#0b1b26] border border-slate-800 p-4 rounded-2xl space-y-2.5 text-xs">
                <div class="flex items-center justify-between">
                    <h2 id="updates-heading" class="text-sm font-bold sanad-brand-title"><i class="fa-solid fa-cloud-arrow-down ml-1"></i> تحديثات النظام</h2>
                    <span id="update-ver-badge" class="text-[10px] font-mono bg-[#0e2736] text-teal-200 border border-slate-700 px-2.5 py-0.5 rounded-full">v${APP_VERSION}</span>
                </div>
                <p id="update-status-text" class="text-[11px] text-slate-300">النسخة المثبتة حالياً: v${APP_VERSION} -- يتم فحص التحديثات تلقائياً مع ظهور تنبيه أعلى الشاشة.</p>
                <div class="flex gap-2 flex-wrap">
                    <button type="button" id="check-update-btn" onclick="checkForSystemUpdate(true)" class="bg-[#0e2736] hover:bg-[#14374b] border border-slate-700 text-slate-200 px-3 py-2 rounded-xl font-semibold">فحص التحديث</button>
                    <button type="button" onclick="applySystemUpdateNow()" class="sanad-primary-btn px-4 py-2 rounded-xl font-semibold"><i class="fa-solid fa-rotate ml-1"></i><span id="apply-update-btn-txt">تحديث النظام الآن</span></button>
                </div>
            </div>

            <div class="bg-[#0b1b26] border border-slate-800 p-4 rounded-2xl space-y-2.5 text-xs">
                <div class="flex items-center justify-between gap-2">
                    <h2 id="radio-heading" class="text-sm font-bold text-teal-200"><i class="fa-solid fa-radio ml-1"></i> إذاعة سند AI • بث ذكي فوري</h2>
                    <span id="radio-state-badge" class="text-[10px] font-mono bg-[#0e2736] text-slate-300 border border-slate-700 px-2.5 py-0.5 rounded-full">متوقف</span>
                </div>
                <p id="radio-desc-txt" class="text-[11px] text-slate-400">بث مباشر سريع الاستجابة مدعوم بالذكاء الاصطناعي يدعم MP3 وM4A وMP4 والقرآن الكريم والقنوات الإخبارية.</p>
                <div class="flex gap-2 flex-wrap">
                    <select id="radio-station-select" onchange="onRadioStationChanged()" class="flex-1 bg-[#07131c] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                        <optgroup label="Sanad AI Radio">
                            <option value="sanad_main|إذاعة سند AI المباشرة|LOCAL_SANAD|sanad">إذاعة سند AI المباشرة</option>
                        </optgroup>
                        <optgroup label="Holy Quran">
                            <option value="quran_sa|القرآن الكريم -- مكة المكرمة|https://stream.radiojar.com/0tpy1h0kxtzuv|quran">القرآن الكريم -- مكة المكرمة</option>
                            <option value="quran_cairo|القرآن الكريم -- القاهرة|https://stream.radiojar.com/8s5u5tpdtwzuv|quran">القرآن الكريم -- القاهرة</option>
                            <option value="quran_tarateel|تلاوات خاشعة متواصلة|https://qurango.net/radio/tarateel|quran">تلاوات خاشعة متواصلة</option>
                        </optgroup>
                        <optgroup label="News">
                            <option value="news_mcd|مونت كارلو الدولية (أخبار)|https://montecarlodoualiya128k.ice.infomaniak.ch/mc-doualiya.mp3|news">مونت كارلو الدولية (أخبار)</option>
                            <option value="news_bbc|بي بي سي عربي (BBC Arabic)|https://stream.live.vc.bbcmedia.co.uk/bbc_arabic_radio|news">بي بي سي عربي (BBC Arabic)</option>
                            <option value="news_sky_ar|سكاي نيوز عربية (مباشر)|https://radio.skynewsarabia.com/stream/radio.mp3|news">سكاي نيوز عربية (مباشر)</option>
                        </optgroup>
                    </select>
                    <button type="button" id="radio-toggle-btn" onclick="toggleSanadRadioFm()" class="sanad-primary-btn px-4 py-2 rounded-xl font-semibold"><i class="fa-solid fa-play ml-1"></i><span>تشغيل الراديو</span></button>
                </div>
                <div id="radio-ai-host-box" class="bg-[#07131c] border border-slate-800/90 rounded-xl p-2.5 text-[11px] text-slate-300">
                    الراديو في وضع الاستعداد الفوري -- اضغط «تشغيل الراديو» لبدء البث الذكي مباشرة.
                </div>
            </div>

            <div id="sanad-real-adhan-box" class="bg-[#0b1b26] border border-slate-800 p-4 rounded-2xl space-y-2.5 text-xs">
                <div class="flex items-center justify-between gap-2">
                    <h2 id="adhan-heading" class="text-sm font-bold text-teal-200"><i class="fa-solid fa-mosque ml-1"></i> القرآن والأذان الحقيقي الآلي</h2>
                    <span id="real-adhan-city-badge" class="text-[10px] font-mono bg-[#0e2736] text-teal-200 border border-slate-700 px-2.5 py-0.5 rounded-full">عدن • مكة</span>
                </div>
                <p id="adhan-desc-txt" class="text-[11px] text-slate-400">تشغيل حقيقي للقرآن والأذان مع تقليب آلي حسب الوقت والجمعة والتهجد ورمضان.</p>

                <div class="flex gap-2 flex-wrap items-center">
                    <select id="real-adhan-city-select" onchange="loadRealPrayerSchedule()" class="flex-1 bg-[#07131c] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                        <optgroup label="Yemen">
                            <option value="12.7855,45.0187|4|عدن • مكة">عدن • اليمن</option>
                            <option value="15.3694,44.1910|4|صنعاء • مكة">صنعاء • اليمن</option>
                            <option value="14.5426,49.1242|4|المكلا • مكة">المكلا • اليمن</option>
                            <option value="14.7978,42.9545|4|الحديدة • مكة">الحديدة • اليمن</option>
                        </optgroup>
                        <optgroup label="Makkah & Madinah">
                            <option value="21.4225,39.8262|4|مكة المكرمة">مكة المكرمة</option>
                            <option value="24.4672,39.6111|4|المدينة المنورة">المدينة المنورة</option>
                        </optgroup>
                        <optgroup label="Egypt">
                            <option value="30.0444,31.2357|5|القاهرة • مصر">القاهرة • مصر</option>
                        </optgroup>
                    </select>

                    <label class="flex items-center gap-1.5 bg-[#07131c] border border-slate-800 px-3 py-2 rounded-xl text-[11px] text-slate-200 cursor-pointer">
                        <input type="checkbox" id="real-adhan-auto-switch" onchange="syncRealAdhanAutoStatus()">
                        <span id="auto-switch-lbl">تقليب آلي</span>
                    </label>
                </div>

                <div class="flex gap-2 flex-wrap">
                    <button type="button" onclick="triggerRealQuranNow('تشغيل بث القرآن الكريم الحقيقي')" class="bg-[#0e2736] hover:bg-[#14374b] border border-slate-700 text-slate-100 px-3 py-1.5 rounded-xl text-[11px] font-semibold">
                        <i class="fa-solid fa-book-open ml-1"></i><span id="quran-now-btn-txt">قرآن حقيقي الآن</span>
                    </button>
                    <button type="button" onclick="triggerRealAdhanNow('اختبار الأذان الحقيقي')" class="sanad-primary-btn px-3 py-1.5 rounded-xl text-[11px] font-semibold">
                        <i class="fa-solid fa-volume-high ml-1"></i><span id="adhan-now-btn-txt">أذان حقيقي الآن</span>
                    </button>
                </div>

                <div id="real-prayer-times-box" class="bg-[#07131c] border border-slate-800 rounded-xl p-2.5 text-[11px] text-slate-200 grid grid-cols-2 gap-1.5">
                    <div>جاري جلب مواقيت الصلاة...</div>
                </div>

                <div id="real-adhan-live-status" class="bg-[#07131c] border border-slate-800 rounded-xl p-2.5 text-[11px] text-teal-200 font-semibold">
                    النظام جاهز للتشغيل اليدوي أو التلقائي عند دخول أوقات الصلاة.
                </div>
            </div>

            <div class="bg-[#0b1b26] border border-slate-800 p-4 rounded-2xl space-y-2.5 text-xs">
                <div class="flex items-center justify-between gap-2">
                    <h2 id="marine-heading" class="text-sm font-bold text-teal-200"><i class="fa-solid fa-satellite ml-1"></i> الرصد الجوي والبحري والأقمار الصناعية</h2>
                    <span id="marine-city-badge" class="text-[10px] font-mono bg-[#0e2736] text-teal-200 border border-slate-700 px-2.5 py-0.5 rounded-full">باب المندب</span>
                </div>
                <div class="flex gap-2">
                    <select id="marine-spot-select" onchange="refreshWeatherAndMarine()" class="flex-1 bg-[#07131c] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                        <optgroup label="Bab al-Mandab & Yemen">
                            <option value="12.5833,43.3333|مضيق باب المندب">مضيق باب المندب</option>
                            <option value="13.3178,43.2431|المخاء • البحر الأحمر">المخاء • البحر الأحمر</option>
                            <option value="12.7855,45.0187|عدن • خليج عدن">عدن • خليج عدن</option>
                            <option value="14.7978,42.9545|الحديدة • البحر الأحمر">الحديدة • البحر الأحمر</option>
                        </optgroup>
                        <optgroup label="Arab Ports">
                            <option value="21.4858,39.1925|جدة • البحر الأحمر">جدة • البحر الأحمر</option>
                            <option value="25.2048,55.2708|دبي • الخليج العربي">دبي • الخليج العربي</option>
                            <option value="31.2001,29.9187|الإسكندرية • المتوسط">الإسكندرية • المتوسط</option>
                            <option value="33.8938,35.5018|بيروت • شرق المتوسط">بيروت • شرق المتوسط</option>
                        </optgroup>
                        <optgroup label="Global Hubs">
                            <option value="51.5072,-0.1276|لندن • الأطلسي والتايمز">لندن • الأطلسي والتايمز</option>
                            <option value="40.7128,-74.0060|نيويورك • الساحل الأطلسي">نيويورك • الساحل الأطلسي</option>
                            <option value="35.6762,139.6503|طوكيو • خليج طوكيو">طوكيو • خليج طوكيو</option>
                        </optgroup>
                    </select>
                    <button type="button" id="refresh-marine-btn" onclick="refreshWeatherAndMarine()" class="sanad-primary-btn px-3.5 py-2 rounded-xl font-semibold">تحديث</button>
                </div>
                <div id="marine-summary-box" class="bg-[#07131c] border border-slate-800 rounded-xl p-3 text-[11px] text-slate-200 space-y-1">
                    <div>جاري قراءة بيانات الأقمار الصناعية والطقس والرياح والمد والجزر...</div>
                </div>
            </div>

            <div class="bg-[#0b1b26] border border-slate-800 p-4 rounded-2xl space-y-3 text-xs">
                <div class="flex items-center justify-between">
                    <h2 id="backup-heading" class="text-sm font-bold text-teal-200"><i class="fa-solid fa-database ml-1"></i> النسخة الاحتياطية وسجل التحصيلات</h2>
                    <span id="backup-history-badge" class="text-[10px] font-mono text-slate-300 bg-[#0e2736] border border-slate-700 px-2 py-0.5 rounded-full">0</span>
                </div>
                <p id="backup-desc-txt" class="text-[11px] text-slate-400">يتم تصدير النسخة الاحتياطية تلقائياً إلى جهازك وتسجيلها في السجل مرتبة من الأحدث للأقدم مع أعداد التحصيلات.</p>
                <div class="flex gap-2 flex-wrap">
                    <button type="button" onclick="exportFullBackupJson(true)" class="sanad-primary-btn px-3.5 py-2 rounded-xl font-semibold"><i class="fa-solid fa-file-export ml-1"></i><span id="export-backup-btn-txt">تصدير نسخة احتياطية</span></button>
                    <input type="file" id="import-backup-file" accept=".json,application/json" class="hidden" onchange="importFullBackupJson(event)">
                    <button type="button" onclick="document.getElementById('import-backup-file').click()" class="bg-[#0e2736] hover:bg-[#14374b] border border-slate-700 text-slate-200 px-3.5 py-2 rounded-xl font-semibold"><i class="fa-solid fa-file-import ml-1"></i><span id="import-backup-btn-txt">استيراد نسخة احتياطية</span></button>
                </div>
                <div id="backup-history-list" class="space-y-2 pt-1"></div>
            </div>

            <div class="bg-[#0b1b26] border border-slate-800 p-4 rounded-2xl space-y-2.5 text-xs">
                <h3 id="ai-assistant-heading" class="text-sm font-bold sanad-brand-title"><i class="fa-solid fa-brain ml-1"></i> مساعد سند AI</h3>
                <div id="ai-log" class="bg-[#07131c] border border-slate-800 rounded-xl p-3 h-40 overflow-y-auto space-y-2 custom-scrollbar">
                    <div class="text-slate-400">مرحباً بك في مساعد سند AI. اسألني وسأرد عليك فوراً.</div>
                </div>
                <div class="flex gap-2">
                    <input type="text" id="ai-q" onkeydown="if(event.key==='Enter')askSanadAI()" placeholder="اسأل مساعد سند AI عن أي شيء..." class="flex-1 bg-[#07131c] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                    <button type="button" id="ai-send-btn" onclick="askSanadAI()" class="sanad-primary-btn px-4 py-2 rounded-xl text-xs font-semibold">إرسال</button>
                </div>
            </div>
        </section>
    </main>

    <nav class="bg-[#0b1b26]/95 border-t border-slate-800 px-0.5 py-2 flex justify-around items-center z-20 shrink-0">
        <a href="#tab-chats" onclick="setPane('chats'); return false;" id="btn-chats" class="relative flex flex-col items-center gap-0.5 text-teal-300 font-bold text-[11px] px-1 py-1 whitespace-nowrap shrink-0 cursor-pointer">
            <span id="nav-chats-badge" class="hidden absolute -top-0.5 -left-1.5 min-w-[16px] h-[16px] px-1 rounded-full bg-rose-600 text-white text-[9px] font-mono font-bold flex items-center justify-center">0</span>
            <i class="fa-solid fa-comments text-sm"></i><span id="nav-lbl-chats">الدردشة</span>
        </a>
        <a href="#tab-groups" onclick="setPane('groups'); return false;" id="btn-groups" class="relative flex flex-col items-center gap-0.5 text-slate-400 font-medium text-[11px] px-1 py-1 whitespace-nowrap shrink-0 cursor-pointer">
            <i class="fa-solid fa-users text-sm"></i><span id="nav-lbl-groups">المجموعات</span>
        </a>
        <a href="#tab-accounts" onclick="setPane('accounts'); return false;" id="btn-accounts" class="relative flex flex-col items-center gap-0.5 text-slate-400 font-medium text-[11px] px-1 py-1 whitespace-nowrap shrink-0 cursor-pointer">
            <i class="fa-solid fa-id-card text-sm"></i><span id="nav-lbl-accounts">الحسابات</span>
        </a>
        <a href="#tab-contacts" onclick="setPane('contacts'); return false;" id="btn-contacts" class="relative flex flex-col items-center gap-0.5 text-slate-400 font-medium text-[11px] px-1 py-1 whitespace-nowrap shrink-0 cursor-pointer">
            <i class="fa-solid fa-address-book text-sm"></i><span id="nav-lbl-contacts">الجهات</span>
        </a>
        <a href="#tab-calls" onclick="setPane('calls'); return false;" id="btn-calls" class="relative flex flex-col items-center gap-0.5 text-slate-400 font-medium text-[11px] px-1 py-1 whitespace-nowrap shrink-0 cursor-pointer">
            <i class="fa-solid fa-phone-volume text-sm"></i><span id="nav-lbl-calls">المكالمات</span>
        </a>
        <a href="#tab-ai" onclick="setPane('ai'); return false;" id="btn-ai" class="relative flex flex-col items-center gap-0.5 text-slate-400 font-medium text-[11px] px-1 py-1 whitespace-nowrap shrink-0 cursor-pointer">
            <i class="fa-solid fa-brain text-sm"></i><span id="nav-lbl-ai">الذكاء</span>
        </a>
    </nav>

    <script>
        var activeAcct = 'مستخدم-سند';
        var myAccts = ['مستخدم-سند'];
        var manual88GeneratedCount = 0;
        var verifiedPhonesMap = {};
        var contacts = [];
        var blockedIdsSet = new Set();
        var sanadGroups = [];
        var unreadByThread = {};
        var backupRecordsHistory = [];
        var translationsByMsgId = {};
        var activeReplyTarget = null;
        var radioPlaying = false;
        var radioWasPlayingBeforeMedia = false;
        var radioSessionSeq = 0;
        var radioStatusTimer = null;
        var ringtoneInterval = null;
        var ringtoneAudioCtx = null;
        var callSpeakerMode = false;

        var REAL_ADHAN_AUDIO_SRC = '/sanad-adhan.mp3';
        var REAL_QURAN_STREAM_SRC = 'https://stream.radiojar.com/0tpy1h0kxtzuv';
        var realPrayerData = null;
        var realLastSlotTriggered = '';

        var SANAD_FAST_FALLBACK_STREAMS = [
            { title: 'القرآن الكريم -- مكة المكرمة (بث مباشر)', url: 'https://stream.radiojar.com/0tpy1h0kxtzuv' },
            { title: 'مونت كارلو الدولية -- الأخبار المباشرة', url: 'https://montecarlodoualiya128k.ice.infomaniak.ch/mc-doualiya.mp3' },
            { title: 'بي بي سي عربي -- البث الإخباري', url: 'https://stream.live.vc.bbcmedia.co.uk/bbc_arabic_radio' }
        ];

        function getSanadSequenceTracks() {
            if (window.SANAD_RADIO_PLAYLIST && Array.isArray(window.SANAD_RADIO_PLAYLIST.tracks) && window.SANAD_RADIO_PLAYLIST.tracks.length) {
                return window.SANAD_RADIO_PLAYLIST.tracks.slice();
            }
            var list = [{ id: 'promo', title: 'برومو إذاعة سند AI -- البث المباشر', url: SANAD_LOCAL_RADIO_URL || '/sanad-radio-promo.mp3' }];
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
                setRealAdhanStatus(sanadUiLang === 'en' ? 'Auto switch enabled.' : 'التقليب الآلي مفعّل حسب المواقيت.');
                checkRealAutoSchedule();
            } else {
                setRealAdhanStatus(sanadUiLang === 'en' ? 'Auto switch off.' : 'التقليب الآلي متوقف حالياً.');
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

        function pauseMediaForCallOrRecording() {
            if (radioPlaying) {
                radioWasPlayingBeforeMedia = true;
                radioPlaying = false;
                stopAllRadioPlayback();
                syncRadioUi();
                setRadioBoxMessage(getDict().radioStandbyMsg);
            } else {
                stopDevotionalAudio();
            }
        }

        function triggerRealQuranNow(statusMsg) {
            if (radioPlaying) {
                radioPlaying = false;
                stopRadioOnly();
                syncRadioUi();
            }
            var devAud = document.getElementById('devotional-audio-el') || document.getElementById('radio-audio-el');
            setRealAdhanStatus(statusMsg || 'Quran stream');
            if (devAud && REAL_QURAN_STREAM_SRC) {
                devAud.muted = false;
                devAud.volume = 1.0;
                devAud.src = REAL_QURAN_STREAM_SRC;
                devAud.load();
                devAud.play().catch(function() {});
            }
        }

        function triggerRealAdhanNow(prayerLabel) {
            if (radioPlaying) {
                radioPlaying = false;
                stopRadioOnly();
                syncRadioUi();
            }
            var devAud = document.getElementById('devotional-audio-el') || document.getElementById('radio-audio-el');
            setRealAdhanStatus('Adhan • ' + (prayerLabel || ''));
            if (devAud && REAL_ADHAN_AUDIO_SRC) {
                devAud.muted = false;
                devAud.volume = 1.0;
                devAud.src = REAL_ADHAN_AUDIO_SRC;
                devAud.load();
                devAud.play().catch(function() {
                    triggerRealQuranNow('Quran stream');
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
                        var isEn = sanadUiLang === 'en';
                        var fLbl = isEn ? 'Fajr' : 'الفجر';
                        var dLbl = isEn ? (isFriday ? 'Jumuah' : 'Dhuhr') : (isFriday ? 'الجمعة' : 'الظهر');
                        var aLbl = isEn ? 'Asr' : 'العصر';
                        var mLbl = isEn ? 'Maghrib' : ('المغرب' + (realPrayerData.isRamadan ? ' (رمضان)' : ''));
                        var iLbl = isEn ? 'Isha' : 'العشاء';
                        var tLbl = isEn ? 'Tahajjud' : 'التهجد';
                        box.innerHTML =
                            '<div>' + fLbl + ': <b class="text-teal-200">' + toWesternDigits(realPrayerData.Fajr) + '</b></div>' +
                            '<div>' + dLbl + ': <b class="text-teal-200">' + toWesternDigits(realPrayerData.Dhuhr) + '</b></div>' +
                            '<div>' + aLbl + ': <b class="text-teal-200">' + toWesternDigits(realPrayerData.Asr) + '</b></div>' +
                            '<div>' + mLbl + ': <b class="text-teal-200">' + toWesternDigits(realPrayerData.Maghrib) + '</b></div>' +
                            '<div>' + iLbl + ': <b class="text-teal-200">' + toWesternDigits(realPrayerData.Isha) + '</b></div>' +
                            '<div>' + tLbl + ': <b class="text-teal-200">' + toWesternDigits(realPrayerData.Lastthird) + '</b></div>';
                    }
                    checkRealAutoSchedule();
                })
                .catch(function() {});
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
                { key: 'Maghrib', label: 'المغرب', mins: parseHhMmToMins(realPrayerData.Maghrib) },
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
                        triggerRealQuranNow(item.label);
                    }
                    return;
                }
            }
        }

        var currentPeer = '';
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

        function saveBackupToIndexedDb(snapshotObj) {
            try {
                if (!('indexedDB' in window)) return;
                var req = indexedDB.open('SanadAiOfflineDb', 1);
                req.onupgradeneeded = function(ev) {
                    var db = ev.target.result;
                    if (!db.objectStoreNames.contains('vault')) {
                        db.createObjectStore('vault');
                    }
                };
                req.onsuccess = function(ev) {
                    var db = ev.target.result;
                    var tx = db.transaction('vault', 'readwrite');
                    tx.objectStore('vault').put(snapshotObj, 'latest_state');
                };
            } catch (e) {}
        }

        function hydrateFromIndexedDbIfEmpty() {
            try {
                if (!('indexedDB' in window)) return;
                var req = indexedDB.open('SanadAiOfflineDb', 1);
                req.onupgradeneeded = function(ev) {
                    var db = ev.target.result;
                    if (!db.objectStoreNames.contains('vault')) {
                        db.createObjectStore('vault');
                    }
                };
                req.onsuccess = function(ev) {
                    var db = ev.target.result;
                    if (!db.objectStoreNames.contains('vault')) return;
                    var tx = db.transaction('vault', 'readonly');
                    var getReq = tx.objectStore('vault').get('latest_state');
                    getReq.onsuccess = function() {
                        var saved = getReq.result;
                        if (saved && typeof saved === 'object' && (!contacts.length || !Object.keys(acctThreads).length)) {
                            applyBackupSnapshot(saved);
                        }
                    };
                };
            } catch (e) {}
        }

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
                t.textContent = customLabel || getDict().toastDone;
                t.classList.remove('hidden');
                clearTimeout(copyToastTimer);
                copyToastTimer = setTimeout(function() { t.classList.add('hidden'); }, 2000);
            }
        }

        function triggerSeamlessFileDelivery(blob, fileName, titleText) {
            try {
                if (navigator.share && typeof File === 'function' && navigator.canShare) {
                    var sharedFile = new File([blob], fileName, { type: blob.type || 'application/octet-stream' });
                    if (navigator.canShare({ files: [sharedFile] })) {
                        navigator.share({ files: [sharedFile], title: titleText || fileName }).catch(function() {});
                        return;
                    }
                }
            } catch (e) {}

            try {
                var url = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(function() { URL.revokeObjectURL(url); }, 1500);
            } catch (e) {}
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
            var spotLabel = parts[1] || 'باب المندب';
            if (badge) badge.textContent = spotLabel;

            var weatherUrl = 'https://api.open-meteo.com/v1/forecast?latitude=' + encodeURIComponent(lat) + '&longitude=' + encodeURIComponent(lon) + '&current=temperature_2m,wind_speed_10m,wind_direction_10m';
            var marineUrl = 'https://marine-api.open-meteo.com/v1/marine?latitude=' + encodeURIComponent(lat) + '&longitude=' + encodeURIComponent(lon) + '&current=wave_height,swell_wave_height,wind_wave_direction';

            Promise.all([
                fetch(weatherUrl).then(function(r) { return r.ok ? r.json() : null; }).catch(function() { return null; }),
                fetch(marineUrl).then(function(r) { return r.ok ? r.json() : null; }).catch(function() { return null; })
            ]).then(function(resArr) {
                var wData = resArr[0] && resArr[0].current ? resArr[0].current : null;
                var mData = resArr[1] && resArr[1].current ? resArr[1].current : null;
                var tempTxt = wData && typeof wData.temperature_2m === 'number' ? (toWesternDigits(wData.temperature_2m) + '°C') : '--';
                var windTxt = wData && typeof wData.wind_speed_10m === 'number' ? (toWesternDigits(wData.wind_speed_10m) + ' km/h') : '--';
                var waveTxt = mData && typeof mData.wave_height === 'number' ? (toWesternDigits(mData.wave_height) + ' m') : '--';
                var tidePhase = (new Date().getHours() % 12 < 6)
                    ? (sanadUiLang === 'en' ? 'High Tide Trend' : 'اتجاه نحو المد')
                    : (sanadUiLang === 'en' ? 'Low Tide Trend' : 'اتجاه نحو الجزر');

                if (sanadUiLang === 'en') {
                    box.innerHTML =
                        '<div>• <b>Temperature (Satellite):</b> ' + escapeHtml(tempTxt) + '</div>' +
                        '<div>• <b>Wind Speed:</b> ' + escapeHtml(windTxt) + '</div>' +
                        '<div>• <b>Waves & Tide:</b> ' + escapeHtml(waveTxt) + ' • ' + escapeHtml(tidePhase) + '</div>';
                } else {
                    box.innerHTML =
                        '<div>• <b>الطقس والحرارة (رصد فضائي):</b> ' + escapeHtml(tempTxt) + '</div>' +
                        '<div>• <b>سرعة الرياح:</b> ' + escapeHtml(windTxt) + '</div>' +
                        '<div>• <b>الموج والمد والجزر:</b> ارتفاع الموج ' + escapeHtml(waveTxt) + ' • ' + escapeHtml(tidePhase) + '</div>';
                }
            });
        }

        function setReplyTarget(msgId) {
            var list = getThreadMap()[currentPeer] || [];
            var m = list.find(function(item) { return item && item.id === msgId; });
            if (!m) return;
            var author = m.from === 'me'
                ? (sanadUiLang === 'en' ? 'You' : 'أنت')
                : (resolveContactName(m.senderName || currentPeer) || currentPeer);
            var snippet = m.text ? String(m.text).slice(0, 90) : (m.kind === 'audio' ? (sanadUiLang === 'en' ? 'Voice message' : 'رسالة صوتية') : (m.kind === 'image' ? (sanadUiLang === 'en' ? 'Image' : 'صورة') : (m.fileName || 'File')));
            activeReplyTarget = { id: m.id, author: author, snippet: snippet };
            var bar = document.getElementById('reply-preview-bar');
            var aEl = document.getElementById('reply-preview-author');
            var tEl = document.getElementById('reply-preview-text');
            if (aEl) aEl.textContent = (sanadUiLang === 'en' ? 'Reply to ' : 'رد على ') + author;
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
            translationsByMsgId[msgId] = '...';
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

        function syncAutoSpeakUi() {
            var btn = document.getElementById('auto-speak-toggle-btn');
            var dict = getDict();
            if (btn) {
                btn.textContent = sanadAutoSpeakIncoming ? dict.autoSpeakOn : dict.autoSpeakOff;
                btn.className = sanadAutoSpeakIncoming
                    ? 'text-teal-200 font-bold hover:text-white'
                    : 'text-slate-300 hover:text-white font-medium';
            }
        }

        function toggleAutoSpeakIncoming() {
            sanadAutoSpeakIncoming = !sanadAutoSpeakIncoming;
            syncAutoSpeakUi();
            persistState();
        }

        function speakRawText(textToSpeak) {
            var cleanTxt = String(textToSpeak || '').trim();
            if (!cleanTxt || !('speechSynthesis' in window)) return;
            try {
                window.speechSynthesis.cancel();
                var utter = new SpeechSynthesisUtterance(cleanTxt);
                utter.lang = /[\u0600-\u06FF]/.test(cleanTxt) ? 'ar' : 'en-US';
                utter.rate = 0.96;
                window.speechSynthesis.speak(utter);
            } catch (e) {}
        }

        function getSelectedRadioInfo() {
            var sel = document.getElementById('radio-station-select');
            var raw = sel ? sel.value : 'sanad_main|إذاعة سند AI المباشرة|LOCAL_SANAD|sanad';
            var parts = raw.split('|');
            var urlVal = parts[2] || '';
            if ((parts[0] || '') === 'sanad_main' && SANAD_LOCAL_RADIO_URL) {
                urlVal = SANAD_LOCAL_RADIO_URL;
            }
            return {
                id: parts[0] || 'sanad_main',
                name: parts[1] || 'إذاعة سند AI المباشرة',
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
            var dict = getDict();
            var badge = document.getElementById('radio-state-badge');
            var btn = document.getElementById('radio-toggle-btn');
            if (badge) {
                badge.textContent = radioPlaying ? dict.radioPlaying : dict.radioStopped;
                badge.className = radioPlaying
                    ? 'text-[10px] font-mono bg-teal-900 text-teal-100 border border-teal-600 px-2.5 py-0.5 rounded-full'
                    : 'text-[10px] font-mono bg-[#0e2736] text-slate-300 border border-slate-700 px-2.5 py-0.5 rounded-full';
            }
            if (btn) {
                btn.innerHTML = radioPlaying
                    ? '<i class="fa-solid fa-stop ml-1"></i><span>' + escapeHtml(dict.stopRadioBtn) + '</span>'
                    : '<i class="fa-solid fa-play ml-1"></i><span>' + escapeHtml(dict.playRadioBtn) + '</span>';
                btn.className = radioPlaying
                    ? 'bg-rose-800 hover:bg-rose-700 text-white px-4 py-2 rounded-xl font-semibold'
                    : 'sanad-primary-btn px-4 py-2 rounded-xl font-semibold';
            }
            if (!radioPlaying) {
                setRadioBoxMessage(dict.radioStandbyMsg);
            }
        }

        function playSmartFallbackLiveStream(sessionId, fallbackIdx) {
            if (!radioPlaying || sessionId !== radioSessionSeq) return;
            var idx = (fallbackIdx || 0) % SANAD_FAST_FALLBACK_STREAMS.length;
            var streamItem = SANAD_FAST_FALLBACK_STREAMS[idx];
            var aud = document.getElementById('radio-audio-el');
            if (!aud || !streamItem) return;

            setRadioBoxMessage(streamItem.title);
            aud.loop = false;
            aud.onplaying = function() {
                clearTimeout(radioStatusTimer);
            };
            aud.onerror = function() {
                if (!radioPlaying || sessionId !== radioSessionSeq) return;
                if (idx + 1 < SANAD_FAST_FALLBACK_STREAMS.length) {
                    playSmartFallbackLiveStream(sessionId, idx + 1);
                }
            };
            try {
                aud.pause();
                aud.muted = false;
                aud.volume = 1.0;
                aud.src = streamItem.url;
                aud.load();
                aud.play().catch(function() {});
            } catch (e) {}
        }

        function playSanadSequenceFromIndex(tracks, idx, sessionId, failedCount) {
            if (!radioPlaying || sessionId !== radioSessionSeq) return;
            if (!Array.isArray(tracks) || !tracks.length || (failedCount || 0) >= tracks.length) {
                playSmartFallbackLiveStream(sessionId, 0);
                return;
            }
            var safeIdx = ((idx % tracks.length) + tracks.length) % tracks.length;
            var tr = tracks[safeIdx];
            if (!tr || !tr.url) {
                playSanadSequenceFromIndex(tracks, safeIdx + 1, sessionId, (failedCount || 0) + 1);
                return;
            }

            var isMp4 = /\.mp4(\?.*)?$/i.test(tr.url);
            var player = isMp4 ? (document.getElementById('radio-mp4-el') || document.getElementById('radio-audio-el')) : document.getElementById('radio-audio-el');
            if (!player) return;

            setRadioBoxMessage('(' + toWesternDigits(safeIdx + 1) + '/' + toWesternDigits(tracks.length) + ') • ' + tr.title);

            clearTimeout(radioStatusTimer);
            radioStatusTimer = setTimeout(function() {
                if (!radioPlaying || sessionId !== radioSessionSeq) return;
                if (player.paused || player.readyState < 2) {
                    playSanadSequenceFromIndex(tracks, safeIdx + 1, sessionId, (failedCount || 0) + 1);
                }
            }, 3000);

            player.loop = false;
            player.onplaying = function() {
                clearTimeout(radioStatusTimer);
            };
            player.onended = function() {
                clearTimeout(radioStatusTimer);
                if (!radioPlaying || sessionId !== radioSessionSeq) return;
                playSanadSequenceFromIndex(tracks, safeIdx + 1, sessionId, 0);
            };
            player.onerror = function() {
                clearTimeout(radioStatusTimer);
                if (!radioPlaying || sessionId !== radioSessionSeq) return;
                playSanadSequenceFromIndex(tracks, safeIdx + 1, sessionId, (failedCount || 0) + 1);
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
                        clearTimeout(radioStatusTimer);
                        if (!radioPlaying || sessionId !== radioSessionSeq) return;
                        playSanadSequenceFromIndex(tracks, safeIdx + 1, sessionId, (failedCount || 0) + 1);
                    });
                }
            } catch (e) {
                playSanadSequenceFromIndex(tracks, safeIdx + 1, sessionId, (failedCount || 0) + 1);
            }
        }

        function applyRadioAudioSource(info) {
            stopDevotionalAudio();
            stopRadioOnly();
            var sessionId = radioSessionSeq;
            if (!info || !radioPlaying) return;

            if (info.id === 'sanad_main') {
                var tracks = getSanadSequenceTracks();
                playSanadSequenceFromIndex(tracks, 0, sessionId, 0);
                return;
            }

            var aud = document.getElementById('radio-audio-el');
            setRadioBoxMessage(info.name);
            radioStatusTimer = setTimeout(function() {
                if (!radioPlaying || sessionId !== radioSessionSeq) return;
                if (aud && aud.paused) {
                    playSmartFallbackLiveStream(sessionId, 0);
                }
            }, 4000);

            if (aud && info.url) {
                aud.loop = false;
                aud.onplaying = function() {
                    clearTimeout(radioStatusTimer);
                };
                aud.onerror = function() {
                    clearTimeout(radioStatusTimer);
                    playSmartFallbackLiveStream(sessionId, 0);
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
                            playSmartFallbackLiveStream(sessionId, 0);
                        });
                    }
                } catch (e) {
                    playSmartFallbackLiveStream(sessionId, 0);
                }
            }
        }

        function toggleSanadRadioFm() {
            var info = getSelectedRadioInfo();
            if (radioPlaying) {
                radioPlaying = false;
                radioWasPlayingBeforeMedia = false;
                stopAllRadioPlayback();
                syncRadioUi();
                setRadioBoxMessage(getDict().radioStandbyMsg);
                return;
            }
            radioPlaying = true;
            radioWasPlayingBeforeMedia = true;
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
            var cList = Array.isArray(snap.contacts) ? snap.contacts : [];
            var aList = Array.isArray(snap.myAccts) ? snap.myAccts : [];
            var gList = Array.isArray(snap.sanadGroups) ? snap.sanadGroups : [];
            var bList = Array.isArray(snap.blockedIds) ? snap.blockedIds : [];
            var msgTotal = 0;
            var threadsObj = snap.acctThreads || {};
            Object.keys(threadsObj).forEach(function(acctKey) {
                var tMap = threadsObj[acctKey] || {};
                Object.keys(tMap).forEach(function(peerKey) {
                    var arr = Array.isArray(tMap[peerKey]) ? tMap[peerKey] : [];
                    msgTotal += arr.filter(function(m) { return m && !m.deleted; }).length;
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
                systemName: SYSTEM_SCIENTIFIC_NAME,
                version: CLIENT_APP_VERSION,
                exportedAt: new Date().toISOString(),
                activeAcct: activeAcct,
                myAccts: myAccts.slice(),
                manual88GeneratedCount: manual88GeneratedCount,
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
                createdAt: new Date().toLocaleString(sanadUiLang === 'en' ? 'en' : 'ar'),
                ts: Date.now(),
                source: sourceLabel || 'Backup',
                counts: counts,
                snapshot: payloadObj
            };
            backupRecordsHistory.unshift(rec);
            if (backupRecordsHistory.length > 12) backupRecordsHistory = backupRecordsHistory.slice(0, 12);
            persistState();
            renderBackupHistoryList();
        }

        function renderBackupHistoryList() {
            var box = document.getElementById('backup-history-list');
            var badge = document.getElementById('backup-history-badge');
            var sorted = backupRecordsHistory.slice().sort(function(a, b) { return (b.ts || 0) - (a.ts || 0); });
            if (badge) badge.textContent = toWesternDigits(sorted.length);
            if (!box) return;
            if (!sorted.length) {
                box.innerHTML = '<div class="text-[11px] text-slate-500">' + (sanadUiLang === 'en' ? 'No backups logged yet.' : 'لا توجد نسخ مسجلة في السجل بعد.') + '</div>';
                return;
            }
            var isEn = sanadUiLang === 'en';
            box.innerHTML = sorted.map(function(item, idx) {
                var c = item.counts || {};
                var orderNum = toWesternDigits(idx + 1);
                return '<div class="bg-[#07131c] border border-slate-800 rounded-xl p-2.5 space-y-1.5">' +
                    '<div class="flex items-center justify-between gap-2">' +
                    '<span class="font-bold text-teal-200">#' + orderNum + ' • ' + escapeHtml(item.source) + '</span>' +
                    '<span class="text-[10px] font-mono text-slate-400">' + escapeHtml(item.createdAt) + '</span>' +
                    '</div>' +
                    '<div class="text-[11px] text-slate-200 flex flex-wrap gap-2">' +
                    '<span>' + (isEn ? 'Contacts' : 'الجهات') + ': <b>' + toWesternDigits(c.contacts || 0) + '</b></span>' +
                    '<span>• ' + (isEn ? 'Messages' : 'الرسائل') + ': <b>' + toWesternDigits(c.messages || 0) + '</b></span>' +
                    '<span>• ' + (isEn ? 'Accounts' : 'الحسابات') + ': <b>' + toWesternDigits(c.accounts || 0) + '</b></span>' +
                    '<span>• ' + (isEn ? 'Groups' : 'المجموعات') + ': <b>' + toWesternDigits(c.groups || 0) + '</b></span>' +
                    '<span>• ' + (isEn ? 'Blocked' : 'المحظورون') + ': <b class="text-rose-300">' + toWesternDigits(c.blocked || 0) + '</b></span>' +
                    '</div>' +
                    '<div class="flex justify-end">' +
                    '<button type="button" onclick="restoreBackupByRecordId('' + escapeJsSingle(item.id) + '')" class="sanad-primary-btn px-2.5 py-1 rounded-lg text-[11px] font-semibold">' + (isEn ? 'Restore' : 'استعادة') + '</button>' +
                    '</div></div>';
            }).join('');
        }

        function applyBackupSnapshot(data) {
            if (!data || typeof data !== 'object') return;
            if (Array.isArray(data.myAccts) && data.myAccts.length) {
                myAccts = Array.from(new Set(myAccts.concat(data.myAccts.map(cleanIdValue).filter(Boolean)))).slice(0, MAX_LINKED_NUMBERS_LIMIT);
            }
            if (typeof data.manual88GeneratedCount === 'number') {
                manual88GeneratedCount = Math.min(MAX_MANUAL_88_LIMIT, Math.max(manual88GeneratedCount, data.manual88GeneratedCount));
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
            if (!currentPeer && contacts.length) currentPeer = contacts[0].id;
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
        }

        function speakMessageText(msgId) {
            var list = getThreadMap()[currentPeer] || [];
            var target = list.find(function(m) { return m && m.id === msgId; });
            var textToSpeak = target && target.text ? String(target.text).trim() : '';
            if (!textToSpeak || !('speechSynthesis' in window)) return;
            speakRawText(textToSpeak);
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

            if (scope === 'everyone' && currentPeer) {
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
            }
        }

        function exportFullBackupJson(autoDeliver) {
            var payload = buildCurrentBackupPayload();
            recordBackupInHistory(sanadUiLang === 'en' ? 'JSON Export' : 'تصدير JSON', payload);
            var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
            var fileName = 'sanad-backup-' + toWesternDigits(Date.now()) + '.json';
            if (autoDeliver !== false) {
                triggerSeamlessFileDelivery(blob, fileName, 'Sanad Backup');
            }
        }

        function importFullBackupJson(ev) {
            var file = ev && ev.target && ev.target.files && ev.target.files[0];
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function() {
                try {
                    var data = JSON.parse(String(reader.result || '{}'));
                    data.counts = computeBackupCounts(data);
                    recordBackupInHistory(sanadUiLang === 'en' ? 'Import' : 'استيراد ملف', data);
                    applyBackupSnapshot(data);
                } catch (err) {}
            };
            reader.readAsText(file);
            ev.target.value = '';
        }

        function playSingleTonePulse(freq, durationSec, volumeVal) {
            try {
                var AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (!AudioCtx) return;
                if (!ringtoneAudioCtx || ringtoneAudioCtx.state === 'closed') {
                    ringtoneAudioCtx = new AudioCtx();
                }
                if (ringtoneAudioCtx.state === 'suspended') {
                    ringtoneAudioCtx.resume().catch(function() {});
                }
                var now = ringtoneAudioCtx.currentTime;
                var osc = ringtoneAudioCtx.createOscillator();
                var gain = ringtoneAudioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq || 660, now);
                gain.gain.setValueAtTime(0.001, now);
                gain.gain.linearRampToValueAtTime(volumeVal || 0.08, now + 0.03);
                gain.gain.exponentialRampToValueAtTime(0.0008, now + (durationSec || 0.35));
                osc.connect(gain);
                gain.connect(ringtoneAudioCtx.destination);
                osc.start(now);
                osc.stop(now + (durationSec || 0.36));
            } catch (e) {}
        }

        function startRingtoneLoop(mode) {
            stopRingtoneLoop();
            var ringAud = document.getElementById('devotional-audio-el');
            var customToneUrl = mode === 'incoming' ? '/sanad-ringtone.mp3' : '/sanad-outgoing-tone.mp3';

            var playToneStep = function() {
                if (mode === 'incoming') {
                    playSingleTonePulse(587.33, 0.22, 0.11);
                    setTimeout(function() { playSingleTonePulse(783.99, 0.28, 0.11); }, 250);
                } else {
                    playSingleTonePulse(440, 0.45, 0.06);
                }
            };

            if (ringAud && customToneUrl) {
                try {
                    ringAud.muted = false;
                    ringAud.volume = mode === 'incoming' ? 0.9 : 0.45;
                    ringAud.src = customToneUrl;
                    ringAud.load();
                    var p = ringAud.play();
                    if (p && typeof p.catch === 'function') {
                        p.catch(function() {
                            playToneStep();
                            ringtoneInterval = setInterval(playToneStep, mode === 'incoming' ? 1600 : 2400);
                        });
                    }
                    return;
                } catch (e) {}
            }

            playToneStep();
            ringtoneInterval = setInterval(playToneStep, mode === 'incoming' ? 1600 : 2400);
        }

        function stopRingtoneLoop() {
            clearInterval(ringtoneInterval);
            ringtoneInterval = null;
            stopDevotionalAudio();
        }

        function playChimeSound() {
            playSingleTonePulse(740, 0.2, 0.06);
        }

        function applyCallAudioRouting() {
            var remAudio = document.getElementById('remote-audio-el');
            if (!remAudio) return;
            try {
                if (typeof remAudio.setSinkId === 'function') {
                    if (!callSpeakerMode && navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
                        navigator.mediaDevices.enumerateDevices().then(function(devs) {
                            var earpiece = devs.find(function(d) {
                                return d.kind === 'audiooutput' && /earpiece|receiver|handset|phone/i.test(d.label || '');
                            });
                            remAudio.setSinkId(earpiece ? earpiece.deviceId : 'default').catch(function() {});
                        }).catch(function() {});
                    } else {
                        remAudio.setSinkId('default').catch(function() {});
                    }
                }
                remAudio.volume = callSpeakerMode ? 1.0 : 0.45;
            } catch (e) {}
        }

        function syncSpeakerButtonUi() {
            var dict = getDict();
            var lbl = document.getElementById('speaker-btn-label');
            var ico = document.getElementById('speaker-icon');
            var btn = document.getElementById('speaker-toggle-btn');
            if (lbl) lbl.textContent = callSpeakerMode ? dict.speakerMode : dict.earpieceMode;
            if (ico) ico.className = callSpeakerMode ? 'fa-solid fa-volume-high text-teal-300' : 'fa-solid fa-ear-listen text-slate-200';
            if (btn) {
                btn.className = callSpeakerMode
                    ? 'px-3 py-3 rounded-2xl bg-teal-950 hover:bg-teal-900 border border-teal-600/60 text-teal-200 flex items-center gap-1.5 text-xs font-semibold'
                    : 'px-3 py-3 rounded-2xl bg-[#0e2736] hover:bg-[#14374b] border border-slate-700 text-slate-200 flex items-center gap-1.5 text-xs font-semibold';
            }
        }

        function toggleCallSpeakerMode() {
            callSpeakerMode = !callSpeakerMode;
            syncSpeakerButtonUi();
            applyCallAudioRouting();
            copyStringToClipboard('', callSpeakerMode ? getDict().speakerMode : getDict().earpieceMode);
        }

        function syncNotificationBadge() {
            var lbl = document.getElementById('notif-status-txt');
            var dict = getDict();
            if (!lbl) return;
            if ('Notification' in window && Notification.permission === 'granted') {
                lbl.textContent = dict.notifActive;
            } else {
                lbl.textContent = dict.notifBtn;
            }
        }

        function requestSystemNotifications() {
            playChimeSound();
            if (!('Notification' in window)) {
                syncNotificationBadge();
                return;
            }
            if (Notification.permission === 'granted') {
                syncNotificationBadge();
                try { new Notification('Sanad AI', { body: '24/7' }); } catch (e) {}
                return;
            }
            if (Notification.permission !== 'denied') {
                Notification.requestPermission().then(function() {
                    syncNotificationBadge();
                }).catch(function() {});
            } else {
                syncNotificationBadge();
            }
        }

        function triggerSystemNotification(title, body) {
            playChimeSound();
            if ('Notification' in window && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
                try { new Notification(title || 'Sanad AI', { body: body || '' }); } catch (e) {}
            }
        }

        function refreshUpdateStatusInAi() {
            var st = document.getElementById('update-status-text');
            if (!st) return;
            st.textContent = sanadUiLang === 'en'
                ? ('Installed version: v' + CLIENT_APP_VERSION)
                : ('النسخة المثبتة حالياً: v' + CLIENT_APP_VERSION);
        }

        function showAutoUpdateBanner(newVer) {
            var banner = document.getElementById('auto-update-banner');
            var txt = document.getElementById('auto-update-banner-text');
            if (txt) {
                txt.textContent = sanadUiLang === 'en'
                    ? ('New update available: v' + newVer)
                    : ('يتوفر إصدار أحدث: v' + newVer);
            }
            if (banner) banner.classList.remove('hidden');
        }

        function checkForSystemUpdate(showNotice) {
            fetch('/healthz?t=' + Date.now(), { cache: 'no-store' })
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    var srvVer = (data && data.version) ? String(data.version) : CLIENT_APP_VERSION;
                    if (srvVer && srvVer !== CLIENT_APP_VERSION) {
                        showAutoUpdateBanner(srvVer);
                    } else if (showNotice) {
                        copyStringToClipboard('', 'v' + srvVer);
                    }
                })
                .catch(function() {});
        }

        function applySystemUpdateNow() {
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

        function saveContactToDeviceVcf(codeOrPhone, displayName, autoDeliver) {
            var cleanVal = cleanIdValue(codeOrPhone);
            if (!cleanVal) return;
            var nameVal = String(displayName || resolveContactName(cleanVal) || cleanVal).trim() || cleanVal;
            var vcard = [
                'BEGIN:VCARD',
                'VERSION:3.0',
                'FN:' + nameVal,
                'N:' + nameVal + ';;;;',
                'TEL;TYPE=CELL:' + cleanVal,
                'NOTE:Sanad AI Platform',
                'END:VCARD'
            ].join('\r\n');
            var blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' });
            var fileName = 'sanad-' + cleanVal.replace(/[^a-zA-Z0-9+_-]/g, '') + '.vcf';
            if (autoDeliver !== false) {
                triggerSeamlessFileDelivery(blob, fileName, nameVal);
            }
        }

        function exportAllContactsVcf(autoDeliver) {
            var list = contacts.filter(function(c) { return c && c.id; });
            if (!list.length) return;
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
            if (autoDeliver !== false) {
                triggerSeamlessFileDelivery(blob, 'sanad-contacts.vcf', 'Sanad Contacts');
            }
        }

        function importFromDeviceContactsPicker() {
            if (!navigator.contacts || typeof navigator.contacts.select !== 'function') return;
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
                    if (!currentPeer) currentPeer = contacts[0].id;
                    persistState();
                    renderPresence();
                    renderQuickChips();
                    renderPeerHeader();
                    renderMsgs();
                }
            }).catch(function() {});
        }

        function saveCurrentPeerToPhoneContacts() {
            if (!currentPeer) return;
            saveContactToDeviceVcf(currentPeer, resolveContactName(currentPeer), true);
        }

        function generate88DigitCode() {
            if (manual88GeneratedCount >= MAX_MANUAL_88_LIMIT) {
                copyStringToClipboard('', sanadUiLang === 'en' ? 'Manual 88 limit reached (2/2)' : 'تم بلوغ الحد المسموح (2/2) لمنع العبث');
                return;
            }
            if (myAccts.length >= MAX_LINKED_NUMBERS_LIMIT) {
                copyStringToClipboard('', sanadUiLang === 'en' ? 'Max 10 linked numbers/accounts reached' : 'الحد الأقصى 10 أرقام/حسابات مرتبطة');
                return;
            }
            fetch('/api/codes/generate-88', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ actorId: activeAcct })
            })
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    if (data && data.ok === false) {
                        copyStringToClipboard('', sanadUiLang === 'en' ? 'Manual 88 limit reached' : 'تم بلوغ حد التوليد المسموح');
                        return;
                    }
                    var code = (data && data.code) ? cleanIdValue(data.code) : ('88' + String(Math.floor(100000 + Math.random() * 900000)));
                    manual88GeneratedCount = (data && typeof data.generatedCount === 'number')
                        ? data.generatedCount
                        : Math.min(MAX_MANUAL_88_LIMIT, manual88GeneratedCount + 1);
                    lastGeneratedCode = code;
                    if (myAccts.indexOf(code) === -1) myAccts.unshift(code);
                    activeAcct = code;
                    var banner = document.getElementById('last-generated-banner');
                    var txt = document.getElementById('last-generated-text');
                    if (banner && txt) {
                        txt.textContent = code;
                        banner.classList.remove('hidden');
                    }
                    persistState();
                    renderAccts();
                    renderActiveHeaderAcct();
                    syncPresenceNow();
                    saveContactToDeviceVcf(code, 'Sanad ' + code, true);
                })
                .catch(function() {});
        }

        function addCustom88OrId() {
            if (myAccts.length >= MAX_LINKED_NUMBERS_LIMIT) {
                copyStringToClipboard('', sanadUiLang === 'en' ? 'Max 10 linked numbers/accounts reached' : 'الحد الأقصى 10 أرقام/حسابات مرتبطة');
                return;
            }
            var raw = prompt('أدخل كود 88 أو رقم مرتبط (حتى 10 أرقام):', '88');
            var clean = cleanIdValue(raw);
            if (!clean) return;
            if (myAccts.indexOf(clean) === -1) myAccts.unshift(clean);
            activeAcct = clean;
            lastGeneratedCode = clean;
            persistState();
            renderAccts();
            renderActiveHeaderAcct();
            syncPresenceNow();
            saveContactToDeviceVcf(clean, 'Sanad ' + clean, true);
        }

        function switchActiveAccount(id) {
            var clean = cleanIdValue(id);
            if (!clean) return;
            activeAcct = clean;
            if (myAccts.indexOf(clean) === -1 && myAccts.length < MAX_LINKED_NUMBERS_LIMIT) myAccts.unshift(clean);
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
            var chEl = document.getElementById('intl-delivery-channel');
            var cc = cleanIdValue(ccEl ? ccEl.value : '').replace(/[^0-9+]/g, '');
            if (cc && cc.indexOf('+') !== 0) cc = '+' + cc;
            var ph = cleanIdValue(phEl ? phEl.value : '').replace(/[^0-9]/g, '');
            var email = emEl ? emEl.value.trim() : '';
            var channel = chEl ? chEl.value : 'optional';
            if (!ph) return;
            var fullPhone = (cc || '+967') + ph;

            fetch('/api/auth/request-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: fullPhone, email: email, channel: channel })
            }).then(function(r) { return r.json(); }).then(function(data) {
                var box = document.getElementById('otp-delivery-box');
                var msg = document.getElementById('otp-delivery-msg');
                var inp = document.getElementById('otp-code-input');
                if (box) box.classList.remove('hidden');
                if (inp && data && data.code) inp.value = data.code;
                if (msg) {
                    var chLabel = channel === 'sms' ? 'SMS' : (channel === 'email' ? 'Email' : (channel === 'both' ? 'Email + SMS' : 'Optional'));
                    msg.textContent = fullPhone + ' • [' + chLabel + ']' + (email ? (' • ' + email) : '') + (data && data.code ? (' • ' + data.code) : '');
                }
            }).catch(function() {});
        }

        function verifySanadPhoneCode() {
            var ccEl = document.getElementById('intl-cc-input');
            var phEl = document.getElementById('intl-phone-input');
            var emEl = document.getElementById('intl-email-input');
            var chEl = document.getElementById('intl-delivery-channel');
            var codeEl = document.getElementById('otp-code-input');
            var cc = cleanIdValue(ccEl ? ccEl.value : '').replace(/[^0-9+]/g, '');
            if (cc && cc.indexOf('+') !== 0) cc = '+' + cc;
            var ph = cleanIdValue(phEl ? phEl.value : '').replace(/[^0-9]/g, '');
            var fullPhone = (cc || '+967') + ph;
            var code = cleanIdValue(codeEl ? codeEl.value : '');
            var email = emEl ? emEl.value.trim() : '';
            var channel = chEl ? chEl.value : 'optional';

            fetch('/api/auth/verify-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: fullPhone, code: code })
            }).then(function(r) { return r.json(); }).then(function(data) {
                if (!data || !data.ok) return;
                verifiedPhonesMap[normalizeStr(fullPhone)] = { email: email, channel: channel, verifiedAt: Date.now() };
                if (myAccts.indexOf(fullPhone) === -1 && myAccts.length < MAX_LINKED_NUMBERS_LIMIT) {
                    myAccts.unshift(fullPhone);
                }
                activeAcct = fullPhone;
                persistState();
                renderAccts();
                renderActiveHeaderAcct();
                syncPresenceNow();
            }).catch(function() {});
        }

        function loadSavedState() {
            try {
                var rawVault = localStorage.getItem('sanad_persistent_vault_v1');
                var vault = rawVault ? JSON.parse(rawVault) : null;

                var pickKey = function(suffix) {
                    var prefixes = ['sanad1330_', 'sanad1320_', 'sanad1310_', 'sanad1300_'];
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
                var sQuota88 = Number((vault && vault.manual88GeneratedCount) || pickKey('quota88') || '0');
                var sVerified = (vault && vault.verifiedPhones) || parseJsonKey('verified');
                var sContacts = (vault && vault.contacts) || parseJsonKey('contacts');
                var sBlocked = (vault && vault.blocked) || parseJsonKey('blocked');
                var sThreads = (vault && vault.threads) || parseJsonKey('threads');
                var sGroups = (vault && vault.groups) || parseJsonKey('groups');
                var sBackups = (vault && vault.backupHistory) || parseJsonKey('backups');
                var sCursor = Number((vault && vault.cursor) || pickKey('cursor') || '0');
                var sLang = (vault && vault.uiLang) || pickKey('lang');
                var sAutoSpeak = (vault && typeof vault.autoSpeakIncoming === 'boolean')
                    ? vault.autoSpeakIncoming
                    : (pickKey('autospeak') === '1');

                if (sLang === 'en' || sLang === 'ar') sanadUiLang = sLang;
                sanadAutoSpeakIncoming = Boolean(sAutoSpeak);
                manual88GeneratedCount = Math.min(MAX_MANUAL_88_LIMIT, Math.max(0, sQuota88 || 0));

                if (sActive) activeAcct = cleanIdValue(sActive);
                if (Array.isArray(sAccts) && sAccts.length) myAccts = sAccts.map(cleanIdValue).filter(Boolean).slice(0, MAX_LINKED_NUMBERS_LIMIT);
                if (myAccts.indexOf(activeAcct) === -1) myAccts.unshift(activeAcct);
                if (sVerified && typeof sVerified === 'object') verifiedPhonesMap = sVerified;
                if (Array.isArray(sContacts)) {
                    contacts = sContacts.filter(function(c) { return c && c.id && c.id !== 'خدمة العملاء'; });
                }
                if (Array.isArray(sBlocked)) blockedIdsSet = new Set(sBlocked.map(normalizeStr).filter(Boolean));
                if (sThreads && typeof sThreads === 'object') acctThreads = sThreads;
                if (Array.isArray(sGroups)) sanadGroups = sGroups;
                if (Array.isArray(sBackups)) backupRecordsHistory = sBackups;
                if (sCursor > 0) lastSyncCursor = sCursor;
                if (contacts.length > 0) currentPeer = contacts[0].id;
                else if (sanadGroups.length > 0) currentPeer = sanadGroups[0].id;
                else currentPeer = '';
            } catch (e) {}
        }

        function persistState() {
            try {
                var blockedArr = Array.from(blockedIdsSet);
                localStorage.setItem('sanad1330_active', activeAcct);
                localStorage.setItem('sanad1330_accts', JSON.stringify(myAccts));
                localStorage.setItem('sanad1330_quota88', String(manual88GeneratedCount));
                localStorage.setItem('sanad1330_verified', JSON.stringify(verifiedPhonesMap));
                localStorage.setItem('sanad1330_contacts', JSON.stringify(contacts));
                localStorage.setItem('sanad1330_blocked', JSON.stringify(blockedArr));
                localStorage.setItem('sanad1330_threads', JSON.stringify(acctThreads));
                localStorage.setItem('sanad1330_groups', JSON.stringify(sanadGroups));
                localStorage.setItem('sanad1330_backups', JSON.stringify(backupRecordsHistory));
                localStorage.setItem('sanad1330_cursor', String(lastSyncCursor));
                localStorage.setItem('sanad1330_lang', sanadUiLang);
                localStorage.setItem('sanad1330_autospeak', sanadAutoSpeakIncoming ? '1' : '0');

                var vaultSnapshot = {
                    activeAcct: activeAcct,
                    myAccts: myAccts,
                    manual88GeneratedCount: manual88GeneratedCount,
                    verifiedPhones: verifiedPhonesMap,
                    contacts: contacts,
                    blocked: blockedArr,
                    threads: acctThreads,
                    groups: sanadGroups,
                    backupHistory: backupRecordsHistory,
                    cursor: lastSyncCursor,
                    uiLang: sanadUiLang,
                    autoSpeakIncoming: sanadAutoSpeakIncoming
                };
                localStorage.setItem('sanad_persistent_vault_v1', JSON.stringify(vaultSnapshot));
                saveBackupToIndexedDb(vaultSnapshot);
            } catch (e) {}
        }

        function renderActiveHeaderAcct() {
            var lbl = document.getElementById('active-acct-label');
            if (lbl) lbl.textContent = activeAcct;
        }

        function isPeerOnline(id) {
            var target = normalizeStr(id);
            if (!target) return false;
            var found = false;
            onlinePeers.forEach(function(item) { if (normalizeStr(item) === target) found = true; });
            return found;
        }

        function isPeerBlocked(peerId) {
            var n = normalizeStr(peerId);
            if (!n) return false;
            return blockedIdsSet.has(n);
        }

        function setBlockStatusForPeer(peerId, shouldBlock) {
            var clean = cleanIdValue(peerId);
            var n = normalizeStr(clean);
            if (!n) return;
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
        }

        function toggleBlockCurrentPeer() {
            if (!currentPeer) return;
            setBlockStatusForPeer(currentPeer, !isPeerBlocked(currentPeer));
        }

        function renderBlockedList() {
            var box = document.getElementById('blocked-list');
            var badge = document.getElementById('blocked-count-badge');
            var arr = Array.from(blockedIdsSet);
            var isEn = sanadUiLang === 'en';
            if (badge) badge.textContent = toWesternDigits(arr.length);
            if (!box) return;
            if (!arr.length) {
                box.innerHTML = '<div class="text-[11px] text-slate-500">' + (isEn ? 'No blocked users.' : 'لا يوجد محظورون.') + '</div>';
                return;
            }
            box.innerHTML = arr.map(function(bId) {
                return '<div class="flex items-center justify-between bg-[#07131c] border border-rose-900/40 px-3 py-2 rounded-xl text-xs gap-2">' +
                    '<span class="font-semibold text-rose-200 truncate">' + escapeHtml(resolveContactName(bId)) + '</span>' +
                    '<button type="button" onclick="setBlockStatusForPeer('' + escapeJsSingle(bId) + '', false)" class="bg-[#0e2736] text-teal-200 px-2.5 py-1 rounded-lg text-[11px] font-semibold">' + (isEn ? 'Unblock' : 'فك الحظر') + '</button>' +
                    '</div>';
            }).join('');
        }

        function renderAccts() {
            var isEn = sanadUiLang === 'en';
            var badge = document.getElementById('accounts-count-badge');
            var quotaBadge = document.getElementById('accounts-quota-badge');
            var genBtn = document.getElementById('gen-88-btn');
            if (badge) badge.textContent = toWesternDigits(myAccts.length) + '/' + toWesternDigits(MAX_LINKED_NUMBERS_LIMIT);
            if (quotaBadge) {
                quotaBadge.textContent = (isEn ? 'Manual 88: ' : 'التوليد: ') +
                    toWesternDigits(manual88GeneratedCount) + '/' + toWesternDigits(MAX_MANUAL_88_LIMIT);
            }
            if (genBtn) {
                genBtn.disabled = manual88GeneratedCount >= MAX_MANUAL_88_LIMIT;
                genBtn.classList.toggle('opacity-50', manual88GeneratedCount >= MAX_MANUAL_88_LIMIT);
            }
            var box = document.getElementById('accounts-list');
            if (!box) return;
            box.innerHTML = myAccts.map(function(acc) {
                var isCur = normalizeStr(acc) === normalizeStr(activeAcct);
                var isVerified = Boolean(verifiedPhonesMap[normalizeStr(acc)]);
                return '<div class="flex items-center justify-between bg-[#07131c] border ' + (isCur ? 'border-teal-700' : 'border-slate-800') + ' p-2.5 rounded-xl text-xs gap-2">' +
                    '<span class="font-mono font-semibold text-white truncate">' + escapeHtml(acc) +
                    (isVerified ? ' <span class="text-[10px] text-teal-300">✓</span>' : '') +
                    (isCur ? ' <span class="text-[10px] text-teal-300">(' + (isEn ? 'Active' : 'نشط') + ')</span>' : '') + '</span>' +
                    '<div class="flex gap-1.5 shrink-0">' +
                    '<button type="button" onclick="saveContactToDeviceVcf('' + escapeJsSingle(acc) + '', 'Sanad ' + escapeJsSingle(acc) + '', true)" class="bg-[#0e2736] text-teal-200 px-2 py-1 rounded-lg text-[11px] font-semibold">VCF</button>' +
                    (!isCur ? '<button type="button" onclick="switchActiveAccount('' + escapeJsSingle(acc) + '')" class="sanad-primary-btn px-2.5 py-1 rounded-lg text-[11px] font-semibold">' + (isEn ? 'Use' : 'تفعيل') + '</button>' : '') +
                    (myAccts.length > 1 ? '<button type="button" onclick="deleteSavedAccount('' + escapeJsSingle(acc) + '')" class="bg-rose-950/80 text-rose-200 px-2 py-1 rounded-lg text-[11px]">' + (isEn ? 'Del' : 'حذف') + '</button>' : '') +
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
            if (!currentPeer) currentPeer = idVal;
            if (nEl) nEl.value = '';
            if (iEl) iEl.value = '';
            persistState();
            renderPresence();
            renderQuickChips();
            renderPeerHeader();
            renderMsgs();
            saveContactToDeviceVcf(idVal, nameVal, true);
        }

        function deleteSavedContact(contactId) {
            var target = cleanIdValue(contactId);
            if (!target) return;
            contacts = contacts.filter(function(c) { return normalizeStr(c.id) !== normalizeStr(target); });
            if (normalizeStr(currentPeer) === normalizeStr(target)) {
                currentPeer = contacts.length ? contacts[0].id : '';
            }
            persistState();
            renderPresence();
            renderQuickChips();
            renderPeerHeader();
            renderMsgs();
        }

        function renderPresence() {
            var box = document.getElementById('contacts-list');
            if (!box) return;
            var isEn = sanadUiLang === 'en';
            if (!contacts.length) {
                box.innerHTML = '<div class="bg-[#0b1b26] border border-slate-800 p-4 rounded-xl text-xs text-slate-400 text-center">' + (isEn ? 'Add a contact name and code/number.' : 'أضف جهة اتصال بالاسم والكود أو الرقم.') + '</div>';
                return;
            }
            box.innerHTML = contacts.map(function(c) {
                var blocked = isPeerBlocked(c.id);
                var online = !blocked && isPeerOnline(c.id);
                var statusWord = blocked
                    ? (isEn ? 'Blocked' : 'محظور')
                    : (online ? (isEn ? 'Online' : 'متصل نشط') : (isEn ? 'Offline' : 'خارج الاتصال'));
                return '<div class="flex items-center justify-between bg-[#0b1b26] border border-slate-800 p-3 rounded-xl text-xs gap-2">' +
                    '<div class="min-w-0 flex items-center gap-2.5">' +
                    '<span class="w-2.5 h-2.5 rounded-full shrink-0 ' + (blocked ? 'bg-rose-500' : (online ? 'sanad-teal-dot' : 'bg-slate-600')) + '"></span>' +
                    '<div class="min-w-0">' +
                    '<p class="font-bold text-white truncate">' + escapeHtml(c.name) + ' <span class="text-[10px] font-normal ' + (blocked ? 'text-rose-400' : (online ? 'sanad-teal-text font-semibold' : 'text-slate-500')) + '">• ' + statusWord + '</span></p>' +
                    '<p class="font-mono text-[11px] text-slate-400 truncate">' + escapeHtml(c.id) + '</p>' +
                    '</div></div>' +
                    '<div class="flex gap-1.5 shrink-0">' +
                    '<button type="button" onclick="saveContactToDeviceVcf('' + escapeJsSingle(c.id) + '', '' + escapeJsSingle(c.name) + '', true)" class="bg-[#0e2736] text-teal-200 px-2 py-1.5 rounded-lg text-[11px] font-semibold">VCF</button>' +
                    '<button type="button" onclick="choosePeer('' + escapeJsSingle(c.id) + '')" class="sanad-primary-btn px-2.5 py-1.5 rounded-lg font-semibold">' + (isEn ? 'Chat' : 'دردشة') + '</button>' +
                    '<button type="button" onclick="deleteSavedContact('' + escapeJsSingle(c.id) + '')" class="bg-rose-950/80 text-rose-200 px-2.5 py-1.5 rounded-lg font-semibold">' + (isEn ? 'Del' : 'حذف') + '</button>' +
                    '</div></div>';
            }).join('');
        }

        function renderGroupsList() {
            var isEn = sanadUiLang === 'en';
            var badge = document.getElementById('groups-count-badge');
            if (badge) badge.textContent = toWesternDigits(sanadGroups.length);
            var box = document.getElementById('groups-list');
            if (!box) return;
            box.innerHTML = sanadGroups.map(function(g) {
                return '<div class="flex items-center justify-between bg-[#0b1b26] border border-slate-800 p-3 rounded-xl text-xs gap-2">' +
                    '<span class="font-bold text-white truncate">👥 ' + escapeHtml(g.name) + '</span>' +
                    '<button type="button" onclick="choosePeer('' + escapeJsSingle(g.id) + '')" class="sanad-primary-btn px-3 py-1.5 rounded-lg font-semibold">' + (isEn ? 'Open' : 'فتح') + '</button>' +
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
                return '<button type="button" onclick="choosePeer('' + escapeJsSingle(it.id) + '')" class="px-2.5 py-1 rounded-full border text-xs font-semibold whitespace-nowrap shrink-0 ' +
                    (active ? 'bg-[#0f4c5c] border-teal-500/60 text-white' : 'bg-[#07131c] border-slate-800 text-slate-300') + '">' + escapeHtml(it.label) + '</button>';
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
            var dict = getDict();
            var titleEl = document.getElementById('peer-title');
            var statusEl = document.getElementById('peer-status');
            var dotEl = document.getElementById('peer-dot');
            var blockBtn = document.getElementById('chat-block-btn');
            var clearBtn = document.getElementById('chat-clear-btn');
            if (clearBtn) clearBtn.textContent = dict.clearBtn;

            if (!currentPeer) {
                if (titleEl) titleEl.textContent = dict.peerPlaceholder;
                if (statusEl) { statusEl.textContent = '24/7'; statusEl.className = 'text-[11px] font-semibold text-teal-300 shrink-0'; }
                if (dotEl) dotEl.className = 'w-2.5 h-2.5 rounded-full sanad-teal-dot shrink-0';
                if (blockBtn) blockBtn.classList.add('hidden');
                return;
            }

            var grp = sanadGroups.find(function(g) { return normalizeStr(g.id) === normalizeStr(currentPeer); });
            var displayName = grp ? ('👥 ' + grp.name) : resolveContactName(currentPeer);
            if (titleEl) titleEl.textContent = displayName;
            if (blockBtn) {
                blockBtn.classList.toggle('hidden', Boolean(grp));
                blockBtn.textContent = isPeerBlocked(currentPeer) ? dict.unblockBtn : dict.blockBtn;
            }
            if (isPeerBlocked(currentPeer)) {
                if (statusEl) { statusEl.textContent = dict.blockedStatus; statusEl.className = 'text-[11px] font-semibold text-rose-400 shrink-0'; }
                if (dotEl) dotEl.className = 'w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0';
                return;
            }
            var online = isPeerOnline(currentPeer) || Boolean(grp);
            if (statusEl) {
                statusEl.textContent = online ? dict.sessionActive : dict.offlineStatus;
                statusEl.className = online ? 'text-[11px] font-semibold sanad-teal-text shrink-0' : 'text-[11px] font-semibold text-slate-400 shrink-0';
            }
            if (dotEl) {
                dotEl.className = online
                    ? 'w-2.5 h-2.5 rounded-full sanad-teal-dot shrink-0'
                    : 'w-2.5 h-2.5 rounded-full bg-slate-600 shrink-0';
            }
        }

        function getThreadMap() {
            if (!acctThreads[activeAcct]) acctThreads[activeAcct] = {};
            return acctThreads[activeAcct];
        }

        function ensureThreadEntry(ownerAcct, peerKey) {
            var o = cleanIdValue(ownerAcct || activeAcct) || activeAcct;
            var k = cleanIdValue(peerKey);
            if (!acctThreads[o]) acctThreads[o] = {};
            if (!k) return [];
            if (!acctThreads[o][k]) acctThreads[o][k] = [];
            return acctThreads[o][k];
        }

        function markCurrentThreadRead() {
            if (!currentPeer) return;
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
            if (receiptState === 'read') return '<span class="text-teal-300 font-bold mr-1">✓✓</span>';
            if (receiptState === 'delivered') return '<span class="sanad-teal-text font-bold mr-1">✓✓</span>';
            return '<span class="text-slate-300/80 font-bold mr-1">✓</span>';
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
            var displaySender = resolveContactName(senderId) || senderId || 'Sanad AI';
            var sEl = document.getElementById('toast-sender');
            var bEl = document.getElementById('toast-body');
            var box = document.getElementById('live-toast');
            if (sEl) sEl.textContent = displaySender;
            if (bEl) bEl.textContent = bodyText || '...';
            if (box) {
                box.classList.remove('hidden');
                clearTimeout(toastTimer);
                toastTimer = setTimeout(function() { box.classList.add('hidden'); }, 4500);
            }
            triggerSystemNotification('Sanad AI • ' + displaySender, bodyText);
        }

        function jumpToToastChat() {
            var box = document.getElementById('live-toast');
            if (box) box.classList.add('hidden');
            if (toastPeerId) choosePeer(toastPeerId);
        }

        function renderMsgs() {
            var dict = getDict();
            var box = document.getElementById('msgs-box');
            if (!box) return;
            if (!currentPeer) {
                box.innerHTML = '<div class="h-full flex items-center justify-center text-xs text-slate-400 text-center px-4">' + escapeHtml(dict.peerPlaceholder) + '</div>';
                return;
            }
            var list = (getThreadMap()[currentPeer] || []).filter(function(m) { return m && !m.deleted; });
            box.innerHTML = list.map(function(m) {
                var isMe = m.from === 'me';
                var media = '';
                if (m.kind === 'audio' && m.mediaUrl) {
                    media = '<div class="mt-1"><audio controls preload="metadata" src="' + escapeHtml(m.mediaUrl) + '" class="w-52 max-w-full h-9"></audio></div>';
                } else if (m.kind === 'image' && m.mediaUrl) {
                    media = '<img src="' + escapeHtml(m.mediaUrl) + '" loading="lazy" decoding="async" class="max-w-[195px] rounded-xl mt-1">';
                } else if (m.kind === 'file' && m.mediaUrl) {
                    media = '<a href="' + escapeHtml(m.mediaUrl) + '" download="' + escapeHtml(m.fileName || 'file') + '" class="underline text-xs text-teal-200 block mt-1">' + escapeHtml(m.fileName || 'file') + '</a>';
                }
                var receiptHtml = isMe ? renderReceiptTick(m.receipt || 'sent') : '';
                var safeId = escapeJsSingle(m.id || '');

                var replyQuoteHtml = '';
                if (m.replyTo && (m.replyTo.snippet || m.replyTo.author)) {
                    replyQuoteHtml = '<div class="bg-black/25 border-r-2 border-teal-300 rounded-lg px-2.5 py-1 mb-1 text-[11px] text-slate-200/95">' +
                        '<div class="font-bold text-teal-200 truncate">' + escapeHtml(m.replyTo.author || '') + '</div>' +
                        '<div class="truncate text-slate-300">' + escapeHtml(m.replyTo.snippet || '') + '</div>' +
                        '</div>';
                }

                var translatedHtml = '';
                if (translationsByMsgId[m.id]) {
                    translatedHtml = '<div class="mt-1.5 bg-[#07131c]/80 border border-teal-800/50 rounded-lg px-2.5 py-1.5 text-xs text-teal-200">' +
                        escapeHtml(translationsByMsgId[m.id]) +
                        '</div>';
                }

                var actionsHtml = '<div class="flex items-center gap-2.5 text-[10px] text-slate-300/85 mt-1.5 pt-1 border-t border-white/10 flex-wrap">' +
                    '<button type="button" onclick="setReplyTarget('' + safeId + '')" class="hover:text-white flex items-center gap-0.5"><i class="fa-solid fa-reply"></i><span>' + escapeHtml(dict.replyBtn) + '</span></button>' +
                    (m.text ? '<button type="button" onclick="translateChatMessage('' + safeId + '')" class="hover:text-white flex items-center gap-0.5"><i class="fa-solid fa-language"></i><span>' + escapeHtml(dict.translateBtn) + '</span></button>' : '') +
                    (m.text ? '<button type="button" onclick="speakMessageText('' + safeId + '')" class="hover:text-white flex items-center gap-0.5"><i class="fa-solid fa-volume-high"></i><span>' + escapeHtml(dict.speakBtn) + '</span></button>' : '') +
                    (m.text ? '<button type="button" onclick="copyStringToClipboard(decodeURIComponent('' + encodeURIComponent(m.text) + ''))" class="hover:text-white flex items-center gap-0.5"><i class="fa-regular fa-copy"></i><span>' + escapeHtml(dict.copyBtn) + '</span></button>' : '') +
                    '<button type="button" onclick="openDeleteMsgModal('' + safeId + '')" class="hover:text-rose-300 flex items-center gap-0.5 mr-auto"><i class="fa-solid fa-trash-can"></i><span>' + escapeHtml(dict.deleteFinalBtn) + '</span></button>' +
                    '</div>';

                return '<div class="flex ' + (isMe ? 'justify-start' : 'justify-end') + '">' +
                    '<div class="max-w-[78%] sm:max-w-[70%] rounded-2xl px-3 py-2 shadow ' +
                    (isMe ? 'bg-[#0f4c5c] text-white rounded-br-sm' : 'bg-[#0b1b26] border border-slate-800 text-slate-100 rounded-bl-sm') + '">' +
                    replyQuoteHtml +
                    (m.text ? '<div class="sanad-msg-text whitespace-pre-wrap break-words">' + escapeHtml(m.text) + '</div>' : '') +
                    media +
                    translatedHtml +
                    actionsHtml +
                    '<div class="text-[10px] text-slate-300/80 mt-1 text-left flex items-center justify-end gap-1">' +
                    '<span>' + escapeHtml(m.sentAt || '') + '</span>' + receiptHtml +
                    '</div></div></div>';
            }).join('');
            requestAnimationFrame(function() {
                box.scrollTop = box.scrollHeight;
            });
        }

        function toggleVoiceRecording() {
            if (mediaRecorderInstance && mediaRecorderInstance.state === 'recording') {
                finishVoiceRecordingAndSend();
            } else {
                startVoiceRecording();
            }
        }

        function startVoiceRecording() {
            if (!currentPeer || isPeerBlocked(currentPeer)) return;
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') return;
            pauseMediaForCallOrRecording();
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
                .catch(function() {});
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
            if (!dataUrl || !currentPeer) return;
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
                receipt: isPeerOnline(currentPeer) ? 'delivered' : 'sent'
            };
            ensureThreadEntry(activeAcct, currentPeer).push(msgObj);
            persistState();
            renderMsgs();

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
            if (!txt || !currentPeer || isPeerBlocked(currentPeer)) return;

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
                receipt: isPeerOnline(currentPeer) ? 'delivered' : 'sent'
            };
            ensureThreadEntry(activeAcct, currentPeer).push(msgObj);
            inp.value = '';
            autoResizeComposer(inp);
            persistState();
            renderMsgs();

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

        function compressImageDataUrl(dataUrl, maxDim, quality, callback) {
            var img = new Image();
            img.onload = function() {
                try {
                    var w = img.width || 1;
                    var h = img.height || 1;
                    var scale = Math.min(1, (maxDim || 900) / Math.max(w, h));
                    var cw = Math.max(1, Math.round(w * scale));
                    var ch = Math.max(1, Math.round(h * scale));
                    var canvas = document.createElement('canvas');
                    canvas.width = cw;
                    canvas.height = ch;
                    var ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, cw, ch);
                    callback(canvas.toDataURL('image/jpeg', quality || 0.78));
                } catch (e) {
                    callback(dataUrl);
                }
            };
            img.onerror = function() {
                callback(dataUrl);
            };
            img.src = dataUrl;
        }

        function dispatchMediaMessage(kind, fileName, dataUrl) {
            if (!dataUrl || !currentPeer) return;
            var replySnapshot = activeReplyTarget ? Object.assign({}, activeReplyTarget) : null;
            clearReplyTarget();
            var msgObj = {
                id: 'f-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5),
                from: 'me',
                senderName: activeAcct,
                kind: kind,
                fileName: fileName || 'file',
                text: kind === 'image' ? '' : (fileName || 'file'),
                mediaUrl: dataUrl,
                replyTo: replySnapshot,
                sentAt: formatTimeShort(),
                receipt: isPeerOnline(currentPeer) ? 'delivered' : 'sent'
            };
            ensureThreadEntry(activeAcct, currentPeer).push(msgObj);
            persistState();
            renderMsgs();

            var grp = sanadGroups.find(function(g) { return normalizeStr(g.id) === normalizeStr(currentPeer); });
            var targets = grp ? grp.members.filter(function(x) { return normalizeStr(x) !== normalizeStr(activeAcct); }) : [currentPeer];
            targets.forEach(function(t) {
                sendPacketWithFallback({
                    type: 'chat_message',
                    eventId: 'fmsg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
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
            if (ev && ev.target) ev.target.value = '';
            if (!file || !currentPeer || isPeerBlocked(currentPeer)) return;
            if (file.size > 4_500_000) {
                copyStringToClipboard('', sanadUiLang === 'en' ? 'File too large (max 4.5MB)' : 'حجم الملف كبير (الحد الأقصى 4.5 ميجابايت)');
                return;
            }
            var reader = new FileReader();
            reader.onload = function() {
                var isImg = /^image\//i.test(file.type);
                if (isImg) {
                    compressImageDataUrl(reader.result, 900, 0.78, function(optUrl) {
                        dispatchMediaMessage('image', file.name, optUrl);
                    });
                } else {
                    dispatchMediaMessage('file', file.name, reader.result);
                }
            };
            reader.readAsDataURL(file);
        }

        function askSanadAI() {
            var inp = document.getElementById('ai-q');
            var log = document.getElementById('ai-log');
            if (!inp || !inp.value.trim() || !log) return;
            var q = inp.value.trim();
            inp.value = '';
            log.innerHTML += '<div class="bg-[#0f4c5c]/60 text-white px-2.5 py-1.5 rounded-lg">' + escapeHtml(q) + '</div>';
            var pendingId = 'ai-wait-' + Date.now();
            log.innerHTML += '<div id="' + pendingId + '" class="bg-[#0b1b26] border border-slate-800 text-slate-300 px-2.5 py-1.5 rounded-lg">...</div>';
            log.scrollTop = log.scrollHeight;

            fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: q })
            })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                var el = document.getElementById(pendingId);
                var ans = (data && data.reply) ? data.reply : '...';
                if (el) el.textContent = 'Sanad AI: ' + ans;
                log.scrollTop = log.scrollHeight;
            })
            .catch(function() {});
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
                if (remAudio) {
                    remAudio.srcObject = stream;
                    applyCallAudioRouting();
                    remAudio.play().catch(function() {});
                }
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
                    stopRingtoneLoop();
                    st.textContent = getDict().connectedLabel;
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
            if (!peer || isPeerBlocked(peer)) return;
            pauseMediaForCallOrRecording();

            activeCallPeerId = peer;
            activeCallMode = mode === 'video' ? 'video' : 'audio';
            micMuted = false;
            callSpeakerMode = (activeCallMode === 'video');
            syncSpeakerButtonUi();

            var dict = getDict();
            document.getElementById('call-peer-title').textContent = resolveContactName(peer);
            document.getElementById('call-status-msg').textContent = dict.callingLabel;
            document.getElementById('accept-btn').classList.add('hidden');
            document.getElementById('call-modal').classList.remove('hidden');
            startRingtoneLoop('outgoing');

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
            stopRingtoneLoop();
            pauseMediaForCallOrRecording();

            var callerId = cleanIdValue(pendingOfferData.from);
            var mode = pendingOfferData.callMode === 'video' ? 'video' : 'audio';
            activeCallPeerId = callerId;
            activeCallMode = mode;
            callSpeakerMode = (mode === 'video');
            syncSpeakerButtonUi();

            document.getElementById('accept-btn').classList.add('hidden');
            document.getElementById('call-status-msg').textContent = getDict().connectingLabel;

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
                    var lv = document.getElementById('local-video-el');
                    if (mode === 'video' && lv) { lv.srcObject = stream; lv.classList.remove('hidden'); }
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
            stopRingtoneLoop();
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
            var dict = getDict();
            if (pkt.signalType === 'offer') {
                pendingOfferData = pkt;
                pendingIceCandidates = [];
                activeCallPeerId = fromId;
                var callerLabel = resolveContactName(fromId);
                document.getElementById('call-peer-title').textContent = callerLabel;
                document.getElementById('call-status-msg').textContent = (pkt.callMode === 'video' ? dict.incomingVideo : dict.incomingAudio);
                document.getElementById('accept-btn').classList.remove('hidden');
                document.getElementById('call-modal').classList.remove('hidden');
                startRingtoneLoop('incoming');
                triggerSystemNotification('Sanad AI • ' + callerLabel, pkt.callMode === 'video' ? dict.incomingVideo : dict.incomingAudio);
            } else if (pkt.signalType === 'answer' && pc) {
                stopRingtoneLoop();
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
                var isViewingNow = (window.__sanadCurrentTab === 'chats' && normalizeStr(currentPeer) === normalizeStr(key));
                sendPacketWithFallback({
                    type: 'msg_receipt',
                    eventId: 'dlv-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
                    from: activeAcct,
                    to: senderId,
                    status: isViewingNow ? 'read' : 'delivered'
                });
                persistState();
                if (isViewingNow) {
                    renderMsgs();
                } else {
                    unreadByThread[normalizeStr(key)] = (Number(unreadByThread[normalizeStr(key)]) || 0) + 1;
                    updateUnreadBadgesUI();
                    showLiveToast(senderId, ev.msg.kind === 'audio' ? (sanadUiLang === 'en' ? 'Voice message' : 'رسالة صوتية') : (ev.msg.kind === 'image' ? (sanadUiLang === 'en' ? 'Image' : 'صورة') : (ev.msg.text || '...')), key);
                }
                if (sanadAutoSpeakIncoming && ev.msg.text) {
                    speakRawText(ev.msg.text);
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
                var dict = getDict();
                var dot = document.getElementById('ws-dot');
                var lbl = document.getElementById('ws-label');
                if (dot) {
                    dot.className = connected
                        ? 'w-2.5 h-2.5 rounded-full sanad-teal-dot'
                        : 'w-2.5 h-2.5 rounded-full bg-amber-400';
                }
                if (lbl) {
                    lbl.textContent = connected ? dict.wsOnline : dict.wsReconnecting;
                    lbl.className = connected ? 'sanad-teal-text font-semibold' : 'text-amber-300 font-medium';
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
                reconnectTimer = setTimeout(openSocket, 3000);
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
            if (!currentPeer) return;
            ensureThreadEntry(activeAcct, currentPeer).length = 0;
            persistState();
            renderMsgs();
        }

        window.addEventListener('DOMContentLoaded', function() {
            loadSavedState();
            hydrateFromIndexedDbIfEmpty();
            applyUiLanguage(sanadUiLang);
            syncSpeakerButtonUi();
            syncNotificationBadge();
            syncAutoSpeakUi();
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
            setInterval(pollHttpSync, 3000);
            setInterval(syncPresenceNow, 15000);
            setInterval(checkRealAutoSchedule, 15000);
            setInterval(function() { checkForSystemUpdate(false); }, 60000);
        });
    </script>
</body>
</html>`;

const server = http.createServer((req, res) => {
    const reqUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = reqUrl.pathname;
    const clientIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').toString().split(',')[0].trim();

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    if (pathname === '/healthz') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
            ok: true,
            version: APP_VERSION,
            systemName: SYSTEM_SCIENTIFIC_NAME,
            uptimeMode: '24/7-global',
            onlineCount: getOnlineIdsList().length
        }));
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
        const m3uBody = fs.existsSync(m3uPath)
            ? fs.readFileSync(m3uPath, 'utf8')
            : buildDynamicM3uContent();
        res.writeHead(200, { 'Content-Type': 'audio/x-mpegurl; charset=utf-8' });
        res.end(m3uBody);
        return;
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
        if (isRateLimited(`gen88:${clientIp}`, 25, 60000)) {
            res.writeHead(429, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ ok: false, error: 'Too many requests' }));
            return;
        }
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString('utf8');
            if (body.length > 32_000) req.destroy();
        });
        req.on('end', () => {
            let actorId = clientIp;
            try {
                const parsed = JSON.parse(body || '{}');
                if (parsed && parsed.actorId) actorId = `${parsed.actorId}:${clientIp}`;
            } catch (e) {}
            const quota = consumeManual88Quota(actorId);
            if (!quota.allowed) {
                res.writeHead(429, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({
                    ok: false,
                    error: 'Manual 88 generation limit reached',
                    generatedCount: quota.count,
                    remaining: 0
                }));
                return;
            }
            const code = generateUnique88CodeServer();
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({
                ok: true,
                code,
                generatedCount: quota.count,
                remaining: quota.remaining
            }));
        });
        return;
    }

    if (pathname === '/api/ai/chat' && req.method === 'POST') {
        if (isRateLimited(`ai:${clientIp}`, 40, 60000)) {
            res.writeHead(429, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ ok: false, reply: 'تم تجاوز حد الطلبات المؤقت.' }));
            return;
        }
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString('utf8');
            if (body.length > 250_000) req.destroy();
        });
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
        if (isRateLimited(`tr:${clientIp}`, 50, 60000)) {
            res.writeHead(429, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ ok: false, translated: '' }));
            return;
        }
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString('utf8');
            if (body.length > 250_000) req.destroy();
        });
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
        if (isRateLimited(`otp:${clientIp}`, 15, 60000)) {
            res.writeHead(429, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ ok: false }));
            return;
        }
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString('utf8');
            if (body.length > 64_000) req.destroy();
        });
        req.on('end', async () => {
            try {
                const parsed = JSON.parse(body || '{}');
                const normPhone = normIdServer(parsed.phone || '');
                const email = String(parsed.email || '').trim().slice(0, 180);
                const channel = String(parsed.channel || 'optional').trim().toLowerCase();
                const code = String(Math.floor(100000 + Math.random() * 900000));
                if (normPhone) {
                    pendingVerifications.set(normPhone, { code, email, channel, createdAt: Date.now() });
                }

                let emailSent = false;
                const resendKey = process.env.RESEND_API_KEY;
                const mailFrom = process.env.MAIL_FROM || 'Sanad AI <onboarding@resend.dev>';

                if (email && channel !== 'sms' && resendKey && typeof fetch === 'function') {
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
                                html: `<div dir="rtl" style="font-family:sans-serif"><h3>${SYSTEM_SCIENTIFIC_NAME}</h3><p>رمز التحقق الخاص بالرقم <b>${String(parsed.phone || '').replace(/[<>&]/g, '')}</b> هو: <b>${code}</b></p></div>`
                            })
                        });
                        if (resp && resp.ok) emailSent = true;
                    } catch (e) {}
                }

                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({
                    ok: true,
                    phone: parsed.phone,
                    email,
                    channel,
                    code: emailSent ? '' : code,
                    emailSent
                }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ ok: false }));
            }
        });
        return;
    }

    if (pathname === '/api/auth/verify-code' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString('utf8');
            if (body.length > 64_000) req.destroy();
        });
        req.on('end', () => {
            try {
                const parsed = JSON.parse(body || '{}');
                const normPhone = normIdServer(parsed.phone || '');
                const submitted = String(parsed.code || '').trim();
                const rec = pendingVerifications.get(normPhone);
                const isFresh = rec && (Date.now() - rec.createdAt <= 15 * 60 * 1000);
                const valid = Boolean(isFresh && rec.code === submitted);
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

        const since = Math.max(0, Number(reqUrl.searchParams.get('since') || 0));
        const idsParam = String(reqUrl.searchParams.get('ids') || '');
        const watchedIds = new Set(idsParam.split(',').slice(0, 100).map(normIdServer).filter(Boolean));
        if (watchedIds.size > 0) touchPresenceIds(Array.from(watchedIds));

        const matchedEvents = watchedIds.size > 0
            ? syncEvents.filter(ev => {
                if (ev.cursor <= since) return false;
                if (ev.to && isBlockedServer(ev.from, ev.to)) return false;
                return watchedIds.has(normIdServer(ev.to)) || watchedIds.has(normIdServer(ev.from));
            })
            : [];

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
    if (fs.existsSync(EXTERNAL_HTML_PATH)) {
        res.end(fs.readFileSync(EXTERNAL_HTML_PATH, 'utf8'));
    } else {
        res.end(htmlContent);
    }
});

const wss = new WebSocketServer({ server });
wss.on('connection', wsClient => {
    wsClient._sanadIds = new Set();
    wsClient.send(JSON.stringify({ type: 'online_users', ids: getOnlineIdsList() }));

    wsClient.on('message', raw => {
        try {
            const rawStr = String(raw || '{}');
            if (rawStr.length > 8_000_000) return;
            const parsed = JSON.parse(rawStr);
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

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Sanad AI v${APP_VERSION} running on http://0.0.0.0:${PORT}`);
});
