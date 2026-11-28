// sanad-radio-playlist.js
// قائمة البث المتواصل لإذاعة سند المحلية (تعمل تلقائياً بالتتابع من المقطع الأول إلى الأخير ثم تعود للبداية)

const SANAD_RADIO_BASE_URL = 'https://my-server-t0s5.onrender.com';

// أضف أو احذف أو غيّر ترتيب أي مقطع هنا فقط (برومو، فقرة، إعلان، خبر عاجل)
const SANAD_RADIO_TRACKS = [
    {
        id: 'seg-1',
        title: 'برومو إذاعة راديو سند AI -- البث المباشر',
        url: `${SANAD_RADIO_BASE_URL}/sanad-radio-promo.mp3`, durationSec: 63 }, { id: 'seg-2', title: 'المقطع الثاني -- إذاعة سند', url: `${SANAD_RADIO_BASE_URL}/sanad-seg-2.mp3`,
        durationSec: 0
    }
    // أضف أي مقطع ثالث أو رابع بنفس الشكل:
    // {
    //     id: 'seg-3',
    //     title: 'فقرة جديدة / إعلان / خبر عاجل',
    //     url: `${SANAD_RADIO_BASE_URL}/sanad-seg-3.mp3`, //     durationSec: 0 // } ];  window.SANAD_RADIO_PLAYLIST = { tracks: SANAD_RADIO_TRACKS, sanadTracks: SANAD_RADIO_TRACKS }; ```  ---  ### 2. ملف `server.js` (مرتب مع `SANAD_EXTRA_TRACKS` وقراءة التتابع بشكل صحيح)  ```javascript const http = require('http'); const fs = require('fs'); const path = require('path'); const { WebSocketServer } = require('ws'); const { getIconAssetForRoute } = require('./sanad-icon-assets');  const APP_VERSION = '12.6.9'; const PORT = process.env.PORT \vert{}\vert{} 3000; const ICON_BG_HEX = '#164e63'; const STATE_FILE_PATH = process.env.SANAD_STATE_FILE \vert{}\vert{} path.join(__dirname, 'sanad-state.json'); const LOCAL_RADIO_URL = process.env.SANAD_LOCAL_RADIO_URL \vert{}\vert{} '/sanad-radio-promo.mp3';  // أضف أي مقاطع MP3 إضافية هنا بالترتيب (أو ضع ملفات مثل sanad-seg-2.mp3 في جذر المشروع) const SANAD_EXTRA_TRACKS = [ { id: 'seg2', title: 'المقطع الثاني -- إذاعة سند', url: '/sanad-seg-2.mp3' } // مثال لإضافة مقطع ثالث أو رابع لاحقاً: // { id: 'seg3', title: 'متابعات وثقافة', url: '/sanad-seg-3.mp3' }, // { id: 'seg4', title: 'إعلان / خبر عاجل', url: '/sanad-seg-4.mp3' }, ];  function toWesternDigitsServer(str) { return String(str === undefined \vert{}\vert{} str === null ? '' : str) .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 1632)) .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 1776)); }  function normIdServer(v) { return toWesternDigitsServer(v).trim().toLowerCase(); }  const presenceMap = new Map(); const lastSeenMap = new Map(); const blockListByUser = new Map(); const pendingVerifications = new Map(); const reservedCodesSet = new Set(); const syncEvents = []; let eventCursor = 0; let saveStateTimer = null;  function persistServerStateToDisk() { try { const blocksObj = {}; blockListByUser.forEach((setVal, key) => { blocksObj[key] = Array.from(setVal); }); const snapshot = { eventCursor, syncEvents: syncEvents.slice(-1500), blocks: blocksObj, reservedCodes: Array.from(reservedCodesSet) }; fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(snapshot), 'utf8'); } catch (e) {} }  function scheduleServerStateSave() { clearTimeout(saveStateTimer); saveStateTimer = setTimeout(persistServerStateToDisk, 400); }  function loadServerStateFromDisk() { try { if (!fs.existsSync(STATE_FILE_PATH)) return; const raw = fs.readFileSync(STATE_FILE_PATH, 'utf8'); const parsed = JSON.parse(raw \vert{}\vert{} '{}'); if (typeof parsed.eventCursor === 'number' && parsed.eventCursor > 0) { eventCursor = parsed.eventCursor; } if (Array.isArray(parsed.syncEvents)) { parsed.syncEvents.slice(-1500).forEach(ev => { if (ev && typeof ev === 'object') syncEvents.push(ev); }); } if (Array.isArray(parsed.reservedCodes)) { parsed.reservedCodes.forEach(c => { const n = normIdServer(c); if (n) reservedCodesSet.add(n); }); } if (parsed.blocks && typeof parsed.blocks === 'object') { Object.keys(parsed.blocks).forEach(ownerKey => { const arr = parsed.blocks[ownerKey]; if (Array.isArray(arr)) { blockListByUser.set(normIdServer(ownerKey), new Set(arr.map(normIdServer).filter(Boolean))); } }); } } catch (e) {} }  loadServerStateFromDisk();  function generateUnique88CodeServer() { for (let i = 0; i < 200; i++) { const suffix = String(Math.floor(100000 + Math.random() * 900000)); const candidate = '88' + suffix; const n = normIdServer(candidate); if (!reservedCodesSet.has(n)) { reservedCodesSet.add(n); scheduleServerStateSave(); return candidate; } } const fallback = '88' + String(Date.now()).slice(-6); reservedCodesSet.add(normIdServer(fallback)); scheduleServerStateSave(); return fallback; }  function recordSyncEvent(payload) { eventCursor += 1; const item = Object.assign({}, payload, { cursor: eventCursor, eventId: payload.eventId \vert{}\vert{} ('srv-' + eventCursor + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7)) }); syncEvents.push(item); if (syncEvents.length > 2000) { syncEvents.splice(0, syncEvents.length - 2000); } scheduleServerStateSave(); return item; }  function getOnlineIdsList() { const now = Date.now(); const ids = new Set(); presenceMap.forEach((sockets, id) => { if (sockets && sockets.size > 0) { ids.add(id); lastSeenMap.set(id, now); } }); lastSeenMap.forEach((ts, id) => { if (now - ts <= 30000) ids.add(id); }); return Array.from(ids); }  function touchPresenceIds(idsList) { const now = Date.now(); (Array.isArray(idsList) ? idsList : []).forEach(rawId => { const n = normIdServer(rawId); if (n) lastSeenMap.set(n, now); }); }  function broadcastOnlineUsersWs() { const packet = JSON.stringify({ type: 'online_users', ids: getOnlineIdsList() }); wss.clients.forEach(client => { if (client.readyState === 1) { try { client.send(packet); } catch (e) {} } }); }  function setUserBlockSetServer(ownerId, blockedList) { const ownerNorm = normIdServer(ownerId); if (!ownerNorm) return; const nextSet = new Set( (Array.isArray(blockedList) ? blockedList : []) .map(normIdServer) .filter(Boolean) ); blockListByUser.set(ownerNorm, nextSet); scheduleServerStateSave(); }  function isBlockedServer(senderId, recipientId) { const sNorm = normIdServer(senderId); const rNorm = normIdServer(recipientId); if (!sNorm \vert{}\vert{} !rNorm) return false; const rBlocked = blockListByUser.get(rNorm); if (rBlocked && rBlocked.has(sNorm)) return true; const sBlocked = blockListByUser.get(sNorm); if (sBlocked && sBlocked.has(rNorm)) return true; return false; }  function deliverToPeerWs(targetId, payload) { const normTarget = normIdServer(targetId); if (!normTarget) return; if (payload && payload.from && isBlockedServer(payload.from, normTarget)) return; const sockets = presenceMap.get(normTarget); if (!sockets \vert{}\vert{} sockets.size === 0) return; const encoded = JSON.stringify(payload); sockets.forEach(client => { if (client.readyState === 1) { try { client.send(encoded); } catch (e) {} } }); }  function processIncomingPacket(payload, senderWs) { if (!payload \vert{}\vert{} typeof payload !== 'object' \vert{}\vert{} !payload.type) return;  if (payload.from) touchPresenceIds([payload.from]);  if (payload.type === 'register_ids') { const ids = Array.isArray(payload.ids) ? payload.ids.slice() : []; if (payload.activeId) ids.unshift(payload.activeId); const cleanSet = new Set(ids.map(normIdServer).filter(Boolean)); cleanSet.forEach(id => { if (id.startsWith('88')) reservedCodesSet.add(id); }); touchPresenceIds(Array.from(cleanSet));  if (senderWs) { if (!senderWs._sanadIds) senderWs._sanadIds = new Set(); senderWs._sanadIds.forEach(oldId => { if (!cleanSet.has(oldId)) { const s = presenceMap.get(oldId); if (s) { s.delete(senderWs); if (s.size === 0) presenceMap.delete(oldId); } } }); cleanSet.forEach(id => { if (!presenceMap.has(id)) presenceMap.set(id, new Set()); presenceMap.get(id).add(senderWs); }); senderWs._sanadIds = cleanSet; } if (Array.isArray(payload.blockedIds)) { cleanSet.forEach(id => setUserBlockSetServer(id, payload.blockedIds)); } broadcastOnlineUsersWs(); return; }  if (payload.type === 'sync_blocklist') { const ownerIds = Array.isArray(payload.ownerIds) && payload.ownerIds.length ? payload.ownerIds : [payload.from]; ownerIds.forEach(oid => setUserBlockSetServer(oid, payload.blockedIds)); return; }  if (payload.from && payload.to && isBlockedServer(payload.from, payload.to)) { return; }  const storedEvent = recordSyncEvent(payload); if (payload.to) { deliverToPeerWs(payload.to, storedEvent); } else if (payload.broadcast) { const encoded = JSON.stringify(storedEvent); wss.clients.forEach(client => { if (client !== senderWs && client.readyState === 1) { try { client.send(encoded); } catch (e) {} } }); } }  async function callGeminiText(systemPrompt, userPrompt) { const geminiKey = process.env.GEMINI_API_KEY; if (!geminiKey \vert{}\vert{} typeof fetch !== 'function') return ''; try { const resp = await fetch( `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(geminiKey)}`,
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
        return `النسخة الحالية هي v${APP_VERSION}. يتم فحص التحديثات تلقائياً مع ظهور شريط تنبيه أعلى الشاشة عند توفر إصدار جديد، ويمكنك التحديث في أي وقت من تبويب الذكاء.`; } if (/نسخة احتياطية\vert{}تصدير\vert{}استيراد\vert{}تحصيلات/i.test(q)) { return 'يمكنك تصدير نسخة احتياطية كاملة واستعراض سجل النسخ مرتباً من الأحدث للأقدم مع أعداد التحصيلات (الجهات، الرسائل، الحسابات، المجموعات، والمحظورين) داخل تبويب الذكاء.'; } if (/راديو\vert{}اذاعة\vert{}fm\vert{}قران\vert{}سند\vert{}اخبار/i.test(q)) { return 'إذاعة سند تشغّل البث بشكل متواصل من البداية عند الضغط على تشغيل وتنتقل تلقائياً بين مقاطعها، إلى جانب قنوات القرآن الكريم والقنوات الإخبارية.'; } if (/باب المندب\vert{}المخاء\vert{}طقس\vert{}رياح\vert{}مد\vert{}جزر\vert{}بحر/i.test(q)) { return 'لوحة الطقس والرياح والمد والجزر في سند تشمل مضيق باب المندب والمخاء وعدن والحديدة وسواحل ومدن عربية وعالمية مختارة.'; } return `بخصوص سؤالك («${q.slice(0, 120)}»): مساعد سند الذكي متاح للرد الفوري على أسئلتك ومساعدتك في الترجمة والنسخ الاحتياطية وإذاعة سند.`;
}

async function translateTextSmart(text, targetLang) {
    const src = String(text || '').trim();
    if (!src) return '';
    const target = targetLang === 'en' ? 'الإنجليزية' : 'العربية';
    const aiOut = await callGeminiText(
        `أنت مترجم فوري دقيق داخل تطبيق سند. ترجم النص التالي إلى ${target} فقط دون مقدمات أو شروحات إضافية.`, src ); if (aiOut) return aiOut;  if (typeof fetch === 'function') { try { const pair = targetLang === 'en' ? 'ar\vert{}en' : 'en\vert{}ar'; const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(src.slice(0, 480))}&langpair=${encodeURIComponent(pair)}`; const r = await fetch(url); if (r && r.ok) { const j = await r.json(); const tr = j && j.responseData && j.responseData.translatedText; if (tr && !/MYMEMORY WARNING/i.test(tr)) return String(tr).trim(); } } catch (e) {} }  const dict = { 'hello': 'مرحباً', 'hi': 'أهلاً', 'good morning': 'صباح الخير', 'good evening': 'مساء الخير', 'thank you': 'شكراً لك', 'thanks': 'شكراً', 'how are you': 'كيف حالك؟', 'ok': 'حسناً', 'okay': 'تمام', 'yes': 'نعم', 'no': 'لا', 'welcome': 'أهلاً وسهلاً', 'call me': 'اتصل بي', 'see you soon': 'أراك قريباً' }; const lower = src.toLowerCase(); if (dict[lower]) return dict[lower]; return `[ترجمة فورية]: ${src}`;
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

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.startsWith('/api/') || url.pathname === '/healthz') return;

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
