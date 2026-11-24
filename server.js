const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'sanad-data.json');

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const defaultState = {
  secureVault: [
    { owner: 'القيادة المركزية العليا', phone: '+967770000001', num: '88800001', cat: 'بروتوكول VIP المؤسسي' },
    { owner: 'خدمة العملاء المركزية', phone: '88888888', num: '88888888', cat: 'الدعم الفني والتشغيل الدولي 24/7' },
    { owner: 'قطاع التكنولوجيا والاتصالات', phone: '88800099', num: '88800099', cat: 'تشفير بيانات AES-256' }
  ],
  privateChats: {
    'خدمة العملاء المركزية': [
      { id: 'm1', sender: 'خدمة العملاء المركزية', type: 'text', text: 'أهلاً بك في منظومة سَنَد الدولية للاتصالات المشفرة.', time: 'الآن', isMe: false }
    ],
    'غرفة العمليات المركزية': [
      { id: 'm2', sender: 'غرفة العمليات', type: 'text', text: 'قناة التنسيق والعمليات مؤمنة بالكامل.', time: 'الآن', isMe: false }
    ],
    'قطاع الأمن السيبراني': [
      { id: 'm3', sender: 'الأمن السيبراني', type: 'text', text: 'جميع قنوات الاتصال تخضع للتشفير المجرّد.', time: 'الآن', isMe: false }
    ]
  },
  aiChatLogs: [
    { sender: 'SANAD AI', text: 'أهلاً بك. أنا مساعد الذكاء الاصطناعي المدمج في منظومة سَنَد. جاهز لمعالجة الأوامر والتحليل الفوري.', time: 'الآن', isAi: true }
  ],
  activeRecipients: ['خدمة العملاء المركزية', 'غرفة العمليات المركزية', 'قطاع الأمن السيبراني', 'قطاع الخدمات اللوجستية']
};

function loadState() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      return {
        secureVault: parsed.secureVault || defaultState.secureVault,
        privateChats: parsed.privateChats || defaultState.privateChats,
        aiChatLogs: parsed.aiChatLogs || defaultState.aiChatLogs,
        activeRecipients: parsed.activeRecipients || defaultState.activeRecipients
      };
    }
  } catch (e) {}
  return {
    secureVault: [...defaultState.secureVault],
    privateChats: JSON.parse(JSON.stringify(defaultState.privateChats)),
    aiChatLogs: [...defaultState.aiChatLogs],
    activeRecipients: [...defaultState.activeRecipients]
  };
}

let state = loadState();
let secureVault = state.secureVault;
let privateChats = state.privateChats;
let aiChatLogs = state.aiChatLogs;
let activeRecipients = state.activeRecipients;
let activeConnectionsCount = 0;

function saveState() {
  try {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify({
        secureVault,
        privateChats,
        aiChatLogs,
        activeRecipients
      }, null, 2),
      'utf8'
    );
  } catch (e) {}
}

function broadcast(payload) {
  const str = JSON.stringify(payload);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(str);
  });
}

wss.on('connection', (ws) => {
  activeConnectionsCount++;

  ws.send(JSON.stringify({
    type: 'init',
    vault: secureVault,
    chats: privateChats,
    recipients: activeRecipients,
    aiLogs: aiChatLogs,
    connections: activeConnectionsCount
  }));

  broadcast({ type: 'stats', connections: activeConnectionsCount });

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'private_chat') {
        if (!privateChats[data.recipient]) privateChats[data.recipient] = [];
        privateChats[data.recipient].push(data.msg);
        saveState();
        broadcast({ type: 'private_chat', recipient: data.recipient, msg: data.msg });
      }
      else if (data.type === 'delete_msg') {
        if (privateChats[data.recipient]) {
          privateChats[data.recipient] = privateChats[data.recipient].filter(m => m.id !== data.msgId);
          saveState();
          broadcast({ type: 'update_chats', recipient: data.recipient, chats: privateChats[data.recipient] });
        }
      }
      else if (data.type === 'clear_chat') {
        privateChats[data.recipient] = [];
        saveState();
        broadcast({ type: 'update_chats', recipient: data.recipient, chats: [] });
      }
      else if (data.type === 'ai_chat') {
        aiChatLogs.push(data.msg);
        aiChatLogs.push({
          sender: 'SANAD AI',
          text: '⚡ [SANAD AI]: تم استلام طلبك ومعالجته بنجاح: "' + (data.msg && data.msg.text ? data.msg.text : '') + '"',
          time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
          isAi: true
        });
        saveState();
        broadcast({ type: 'ai_update', logs: aiChatLogs });
      }
      else if (data.type === 'add_recipient') {
        const name = (data.name || '').trim();
        if (name && !activeRecipients.includes(name)) {
          activeRecipients.push(name);
          if (!privateChats[name]) {
            privateChats[name] = [{
              id: 'm_' + Date.now(),
              sender: 'النظام الدولي',
              type: 'text',
              text: 'تم فتح القناة الرسمية لـ ' + name,
              time: 'الآن',
              isMe: false
            }];
          }
          saveState();
          broadcast({ type: 'update_recipients', recipients: activeRecipients, chats: privateChats });
        }
      }
      else if (data.type === 'add_secure_code') {
        secureVault.unshift(data.item);
        saveState();
        broadcast({ type: 'update_vault', vault: secureVault });
      }
      else if (data.type === 'call_action') {
        broadcast({ type: 'incoming_call', target: data.target, callType: data.callType, caller: data.caller });
      }
    } catch (e) {}
  });

  ws.on('close', () => {
    activeConnectionsCount = Math.max(1, activeConnectionsCount - 1);
    broadcast({ type: 'stats', connections: activeConnectionsCount });
  });
});

const htmlPage = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>سَنَد | المنصة الدولية للاتصالات والذكاء الاصطناعي</title>
    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { font-family: 'Tajawal', sans-serif; background-color: #021824; color: #f0fdf4; height: 100vh; height: 100dvh; overflow: hidden; margin: 0; display: flex; flex-direction: column; }
        .chat-bg { background-color: #08121a; background-image: radial-gradient(#132736 1px, transparent 1px); background-size: 18px 18px; }
        .nav-btn { width: 100%; padding: 10px 6px; border-radius: 12px; font-size: 11px; font-weight: 700; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; transition: all 0.15s ease; cursor: pointer; }
        .nav-btn-active { background-color: #0369a1; color: #ffffff; box-shadow: 0 4px 12px rgba(3, 105, 161, 0.35); border: 1px solid #38bdf8; }
        .nav-btn-idle { color: #7dd3fc; background-color: transparent; border: 1px solid transparent; }
        .nav-btn-idle:hover { background-color: #0c4a6e; color: #ffffff; }
    </style>
</head>
<body class="w-screen h-[100dvh] flex flex-col justify-between m-0 p-0">

    <header class="bg-sky-900 border-b border-sky-700 px-3 py-2.5 flex items-center justify-between shrink-0 shadow-lg">
        <div class="flex items-center gap-2">
            <h1 class="font-extrabold text-xs sm:text-sm text-white" id="app-title">منظومة سَنَد <span class="bg-sky-600 text-white text-[10px] px-2 py-0.5 rounded-full">النسخة الدولية الرسمية</span></h1>
        </div>
        <div class="flex items-center gap-2">
            <button type="button" onclick="toggleLang()" class="bg-sky-800 hover:bg-sky-700 text-sky-200 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-sky-600" id="lang-btn">EN / AR</button>
            <span id="net-status" class="bg-emerald-500/20 text-emerald-300 text-[11px] px-2.5 py-1 rounded-full font-bold">متصل (Live)</span>
        </div>
    </header>

    <div class="flex-1 flex overflow-hidden relative">
        <aside class="w-24 sm:w-28 bg-slate-950 border-l border-sky-900 flex flex-col items-center justify-between py-2.5 px-1.5 h-full shrink-0 overflow-y-auto gap-1.5">
            <button type="button" onclick="switchSection('chats')" id="btn-chats" class="nav-btn nav-btn-active">
                <span class="text-base">💬</span>
                <span id="lbl-chats">الدردشة</span>
            </button>
            <button type="button" onclick="switchSection('ai')" id="btn-ai" class="nav-btn nav-btn-idle">
                <span class="text-base">🤖</span>
                <span id="lbl-ai">الذكاء AI</span>
            </button>
            <button type="button" onclick="switchSection('calls')" id="btn-calls" class="nav-btn nav-btn-idle">
                <span class="text-base">📞</span>
                <span id="lbl-calls">المكالمات</span>
            </button>
            <button type="button" onclick="switchSection('codes')" id="btn-codes" class="nav-btn nav-btn-idle">
                <span class="text-base">🛡️</span>
                <span id="lbl-codes">الخزنة</span>
            </button>
            <button type="button" onclick="switchSection('help')" id="btn-help" class="nav-btn nav-btn-idle">
                <span class="text-base">📖</span>
                <span id="lbl-help">التعليمات</span>
            </button>
            <button type="button" onclick="switchSection('settings')" id="btn-settings" class="nav-btn nav-btn-idle">
                <span class="text-base">⚙️</span>
                <span id="lbl-settings">الإعدادات</span>
            </button>
        </aside>

        <main class="flex-1 flex flex-col bg-slate-950 relative overflow-hidden h-full">
            <div id="sec-chats" class="flex-1 flex flex-col h-full overflow-hidden">
                <div class="bg-sky-900 border-b border-sky-800 px-3 py-2.5 flex items-center justify-between shrink-0">
                    <span id="chat-title" class="font-bold text-xs sm:text-sm text-white">خدمة العملاء المركزية</span>
                    <div class="flex items-center gap-1.5">
                        <button type="button" onclick="clearChat()" class="bg-rose-900 hover:bg-rose-800 text-white px-2.5 py-1 rounded-lg text-[11px] font-bold">مسح الكل</button>
                        <button type="button" onclick="quickCall('audio')" class="p-1.5 bg-sky-800 hover:bg-sky-700 text-white rounded-full text-xs">📞</button>
                        <button type="button" onclick="quickCall('video')" class="p-1.5 bg-sky-800 hover:bg-sky-700 text-white rounded-full text-xs">📹</button>
                    </div>
                </div>
                <div class="p-2 bg-sky-950 border-b border-sky-800 flex gap-1.5 shrink-0">
                    <input type="text" id="new-contact" placeholder="إضافة جهة اتصال جديدة..." class="bg-sky-900 border border-sky-700 rounded-lg px-2.5 py-2 text-xs text-white flex-1 focus:outline-none">
                    <button type="button" onclick="addContact()" class="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3.5 py-2 rounded-lg text-xs">إضافة</button>
                </div>
                <div id="recipient-tabs" class="flex gap-1.5 p-2 overflow-x-auto bg-sky-950 shrink-0 text-xs"></div>
                <div id="messages-box" class="flex-1 overflow-y-auto p-3 space-y-2.5 chat-bg text-xs"></div>
                <form id="chat-form" class="p-2 bg-sky-950 border-t border-sky-800 flex gap-1.5 items-center shrink-0">
                    <label class="cursor-pointer bg-sky-800 hover:bg-sky-700 text-white p-2.5 rounded-full text-xs" title="إرفاق ملف">
                        📎 <input type="file" id="file-input" class="hidden" accept="image/*,video/*,.pdf" onchange="sendFile(event)">
                    </label>
                    <input type="text" id="chat-input" placeholder="اكتب رسالة مشفرة..." class="flex-1 bg-sky-900 border border-sky-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none">
                    <button type="button" id="rec-btn" onclick="toggleVoice()" class="bg-purple-700 hover:bg-purple-600 text-white p-2.5 rounded-full text-xs" title="تسجيل صوت">🎤</button>
                    <button type="submit" class="bg-sky-600 hover:bg-sky-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs">إرسال</button>
                </form>
            </div>

            <div id="sec-ai" class="hidden flex-1 flex-col h-full bg-slate-950 overflow-hidden">
                <div class="bg-blue-950 px-3 py-2.5 text-xs sm:text-sm font-bold text-blue-200 border-b border-blue-900">مساعد سَنَد الذكي (SANAD AI) • مدعوم بالأقمار الصناعية</div>
                <div id="ai-box" class="flex-1 overflow-y-auto p-3 space-y-2.5 chat-bg text-xs"></div>
                <form id="ai-form" class="p-2.5 bg-sky-950 border-t border-sky-800 flex gap-2 shrink-0">
                    <input type="text" id="ai-input" placeholder="اسأل مساعد سَنَد الذكي..." class="flex-1 bg-sky-900 border border-sky-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none">
                    <button type="submit" class="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs">إرسال</button>
                </form>
            </div>

            <div id="sec-calls" class="hidden flex-1 flex-col h-full p-4 items-center justify-center text-center bg-sky-950 overflow-y-auto text-xs">
                <div class="w-16 h-16 bg-sky-900 border border-emerald-400 rounded-full flex items-center justify-center mb-3 text-emerald-300 text-2xl shadow-xl">📞</div>
                <h3 class="font-bold text-sm sm:text-base text-white mb-1.5">مركز الاتصال الدولي المرئي والصوتي</h3>
                <p class="text-sky-300 text-xs mb-3">اتصال مباشر عالي النقاء عبر الأقمار الصناعية</p>
                <select id="call-target" class="w-full max-w-xs bg-sky-900 border border-sky-600 rounded-xl p-2.5 text-xs text-white font-bold mb-3">
                    <option value="خدمة العملاء المركزية">خدمة العملاء المركزية</option>
                </select>
                <div class="grid grid-cols-2 gap-2 w-full max-w-xs mb-3">
                    <button type="button" onclick="startCall('audio')" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl shadow">📞 صوتي فوري</button>
                    <button type="button" onclick="startCall('video')" class="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow">📹 فيديو مباشر</button>
                </div>
                <div id="call-screen" class="hidden w-full max-w-md bg-slate-900 border border-sky-600 rounded-2xl p-3 space-y-2.5 shadow-2xl">
                    <p id="call-status" class="text-amber-300 font-bold text-xs">جاري الاتصال عبر الأقمار الصناعية...</p>
                    <div id="video-box" class="hidden grid grid-cols-2 gap-2">
                        <div class="relative"><video id="localVideo" autoplay muted playsinline class="w-full h-28 bg-black rounded-lg object-cover border border-sky-700"></video><span class="absolute bottom-1 right-1 bg-black/70 text-[10px] px-1.5 py-0.5 rounded text-white">كاميرتك</span></div>
                        <div class="relative bg-black rounded-lg flex items-center justify-center h-28 border border-sky-700 text-sky-300 text-xs">الطرف الآخر (متصل)</div>
                    </div>
                    <button type="button" onclick="endCall()" class="bg-rose-600 hover:bg-rose-500 text-white font-bold px-5 py-2 rounded-xl text-xs">إنهاء المكالمة</button>
                </div>
            </div>

            <div id="sec-codes" class="hidden flex-1 flex-col h-full p-3 sm:p-4 overflow-y-auto space-y-3 bg-sky-950 text-xs">
                <div class="bg-sky-900 p-4 rounded-xl border border-sky-700 space-y-2.5 shadow-lg">
                    <h3 class="font-bold text-amber-300 text-sm">🛡️ توليد وحفظ كود تشفير سيادي جديد</h3>
                    <input type="text" id="vault-owner" placeholder="اسم الجهة أو القطاع الرسمي..." class="w-full bg-sky-950 border border-sky-700 rounded-lg p-2.5 text-xs text-white focus:outline-none">
                    <input type="text" id="vault-code" placeholder="888xxxxx" readonly class="w-full bg-slate-950 border border-sky-700 rounded-lg p-2.5 font-mono font-bold text-amber-300 text-center text-sm">
                    <button type="button" onclick="genVaultCode()" class="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 rounded-lg shadow text-xs">⚡ توليد رمز معتمد (8 أرقام)</button>
                    <button type="button" onclick="saveVaultCode()" class="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-2.5 rounded-lg shadow text-xs">حفظ في الخزنة وفتح القناة</button>
                </div>
                <div class="bg-sky-900 p-4 rounded-xl border border-sky-700 shadow-lg">
                    <h3 class="font-bold text-white text-sm mb-2">سجل الخزنة والأكواد المعتمدة</h3>
                    <div id="vault-list" class="space-y-2"></div>
                </div>
            </div>

            <div id="sec-help" class="hidden flex-1 flex-col h-full p-3 sm:p-4 overflow-y-auto space-y-3 bg-sky-950 text-xs">
                <div class="bg-sky-900 p-4 rounded-xl border border-sky-700 space-y-2.5 shadow-lg">
                    <h3 class="font-bold text-purple-300 text-sm">📖 الدليل الرسمي لمنظومة سَنَد الدولية</h3>
                    <div class="p-3 bg-sky-950 rounded-lg border border-sky-800 space-y-2 text-sky-100 leading-relaxed text-xs">
                        <p><strong>1. المراسلات الفورية:</strong> تواصل مع أي قطاع أو جهة عبر القنوات الآمنة المشفرة.</p>
                        <p><strong>2. المكالمات المرئية والصوتية:</strong> تظهر صورتك في كاميرا مستقلة بشكل دقيق وفوري.</p>
                        <p><strong>3. الذكاء الاصطناعي:</strong> مساعد ذكي متطور للتحليل وتقديم التقارير على مدار الساعة.</p>
                        <p><strong>4. الخزنة السيادية:</strong> إدارة الأكواد الرسمية وحفظها بأعلى معايير الأمان الدولي.</p>
                    </div>
                </div>
            </div>

            <div id="sec-settings" class="hidden flex-1 flex-col h-full p-3 sm:p-4 overflow-y-auto space-y-3 bg-sky-950 text-xs">
                <div class="bg-sky-900 p-4 rounded-xl border border-sky-700 space-y-3 shadow-lg">
                    <h3 class="font-bold text-indigo-300 text-sm">⚙️ إحصائيات النظام والتحكم الدولي</h3>
                    <div class="flex justify-between items-center p-3 bg-sky-950 rounded-xl border border-sky-800 text-xs">
                        <span>الأجهزة المتصلة بالشبكة حالياً:</span>
                        <span id="stat-connections" class="text-emerald-400 font-extrabold font-mono text-sm">1</span>
                    </div>
                    <button type="button" onclick="triggerReset()" class="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-xl shadow text-xs">⚡ إعادة مزامنة وتنشيط الشبكة بالكامل</button>
                </div>
            </div>
        </main>
    </div>

    <script>
        var currentRecipient = 'خدمة العملاء المركزية';
        var globalChats = {
            'خدمة العملاء المركزية': [{id:'m1', sender:'خدمة العملاء المركزية', type:'text', text:'أهلاً بك في منظومة سَنَد الدولية للاتصالات.', time:'الآن', isMe:false}],
            'غرفة العمليات المركزية': [{id:'m2', sender:'غرفة العمليات', type:'text', text:'قناة التنسيق والعمليات مؤمنة بالكامل.', time:'الآن', isMe:false}],
            'قطاع الأمن السيبراني': [{id:'m3', sender:'الأمن السيبراني', type:'text', text:'جميع قنوات الاتصال تخضع للتشفير المجرّد.', time:'الآن', isMe:false}]
        };
        var globalVault = [
            { owner: 'القيادة المركزية العليا', num: '88800001', cat: 'بروتوكول VIP المؤسسي' },
            { owner: 'خدمة العملاء المركزية', num: '88888888', cat: 'الدعم الفني والتشغيل الدولي 24/7' }
        ];
        var globalRecipients = ['خدمة العملاء المركزية', 'غرفة العمليات المركزية', 'قطاع الأمن السيبراني', 'قطاع الخدمات اللوجستية'];
        var globalAi = [{sender:'SANAD AI', text:'أهلاً بك. أنا مساعد سَنَد الذكي. جاهز للخدمة.', time:'الآن', isAi:true}];

        var ws = null, mediaRec = null, chunks = [], isRec = false, localStream = null, currentLang = 'ar';

        function init() {
            renderRecipients();
            renderMessages(currentRecipient);
            renderVault(globalVault);
            renderAi(globalAi);
            connectWS();
        }

        function connectWS() {
            try {
                var proto = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
                ws = new WebSocket(proto + window.location.host);
                ws.onopen = function() {
                    var st = document.getElementById('net-status');
                    if (st) st.textContent = currentLang === 'en' ? 'Connected (Live)' : 'متصل (Live)';
                };
                ws.onclose = function() {
                    var st = document.getElementById('net-status');
                    if (st) st.textContent = currentLang === 'en' ? 'Reconnecting...' : 'إعادة الاتصال...';
                    setTimeout(connectWS, 2500);
                };
                ws.onmessage = function(e) {
                    var d = JSON.parse(e.data);
                    if (d.type === 'init') {
                        globalChats = d.chats || globalChats;
                        globalVault = d.vault || globalVault;
                        globalRecipients = d.recipients || globalRecipients;
                        globalAi = d.aiLogs || globalAi;
                        if (globalRecipients.length && !globalRecipients.includes(currentRecipient)) {
                            currentRecipient = globalRecipients[0];
                        }
                        var ct = document.getElementById('chat-title');
                        if (ct) ct.textContent = currentRecipient;
                        renderRecipients();
                        renderMessages(currentRecipient);
                        renderVault(globalVault);
                        renderAi(globalAi);
                        var sc = document.getElementById('stat-connections');
                        if (sc) sc.textContent = d.connections;
                    } else if (d.type === 'stats') {
                        var sc2 = document.getElementById('stat-connections');
                        if (sc2) sc2.textContent = d.connections;
                    } else if (d.type === 'private_chat') {
                        if(!globalChats[d.recipient]) globalChats[d.recipient] = [];
                        globalChats[d.recipient].push(d.msg);
                        if(currentRecipient === d.recipient) renderMessages(d.recipient);
                    } else if (d.type === 'update_chats') {
                        globalChats[d.recipient] = d.chats;
                        if(currentRecipient === d.recipient) renderMessages(d.recipient);
                    } else if (d.type === 'ai_update') {
                        globalAi = d.logs;
                        renderAi(globalAi);
                    } else if (d.type === 'update_vault') {
                        globalVault = d.vault;
                        renderVault(globalVault);
                    } else if (d.type === 'update_recipients') {
                        globalRecipients = d.recipients;
                        globalChats = d.chats;
                        renderRecipients();
                    } else if (d.type === 'incoming_call') {
                        playTone();
                        alert('📞 اتصال وارد من ' + d.caller + ' (' + (d.callType === 'video' ? 'فيديو' : 'صوتي') + ')');
                    }
                };
            } catch(err) {}
        }

        function playTone() {
            try {
                var ctx = new (window.AudioContext || window.webkitAudioContext)();
                var osc = ctx.createOscillator();
                var g = ctx.createGain();
                osc.frequency.setValueAtTime(480, ctx.currentTime);
                g.gain.setValueAtTime(0.1, ctx.currentTime);
                osc.connect(g); g.connect(ctx.destination);
                osc.start(); osc.stop(ctx.currentTime + 1.2);
            } catch(e) {}
        }

        function toggleLang() {
            currentLang = currentLang === 'ar' ? 'en' : 'ar';
            if(currentLang === 'en') {
                document.documentElement.lang = 'en';
                document.documentElement.dir = 'ltr';
                document.getElementById('app-title').innerHTML = 'SANAD SYSTEM <span class="bg-sky-600 text-white text-[10px] px-2 py-0.5 rounded-full">Official International</span>';
                document.getElementById('lbl-chats').textContent = 'Chats';
                document.getElementById('lbl-ai').textContent = 'AI';
                document.getElementById('lbl-calls').textContent = 'Calls';
                document.getElementById('lbl-codes').textContent = 'Vault';
                document.getElementById('lbl-help').textContent = 'Help';
                document.getElementById('lbl-settings').textContent = 'Settings';
            } else {
                document.documentElement.lang = 'ar';
                document.documentElement.dir = 'rtl';
                document.getElementById('app-title').innerHTML = 'منظومة سَنَد <span class="bg-sky-600 text-white text-[10px] px-2 py-0.5 rounded-full">النسخة الدولية الرسمية</span>';
                document.getElementById('lbl-chats').textContent = 'الدردشة';
                document.getElementById('lbl-ai').textContent = 'الذكاء AI';
                document.getElementById('lbl-calls').textContent = 'المكالمات';
                document.getElementById('lbl-codes').textContent = 'الخزنة';
                document.getElementById('lbl-help').textContent = 'التعليمات';
                document.getElementById('lbl-settings').textContent = 'الإعدادات';
            }
        }

        function switchSection(id) {
            var sections = ['chats', 'ai', 'calls', 'codes', 'help', 'settings'];
            for (var i = 0; i < sections.length; i++) {
                var s = sections[i];
                var el = document.getElementById('sec-' + s);
                var btn = document.getElementById('btn-' + s);
                if (el) {
                    if (s === id) {
                        el.classList.remove('hidden');
                        el.classList.add('flex');
                    } else {
                        el.classList.add('hidden');
                        el.classList.remove('flex');
                    }
                }
                if (btn) {
                    if (s === id) {
                        btn.className = 'nav-btn nav-btn-active';
                    } else {
                        btn.className = 'nav-btn nav-btn-idle';
                    }
                }
            }
        }

        function renderRecipients() {
            var box = document.getElementById('recipient-tabs');
            var sel = document.getElementById('call-target');
            if(!box) return;
            box.innerHTML = '';
            var htmlCall = '';
            globalRecipients.forEach(function(r) {
                var active = r === currentRecipient ? 'bg-sky-600 text-white shadow' : 'bg-sky-900 text-sky-200 border border-sky-700';
                box.innerHTML += '<button type="button" onclick="selectRecipient(\'' + r.replace(/'/g, "\\'") + '\')" class="px-3 py-1.5 rounded-lg ' + active + ' font-bold shrink-0 text-xs">' + r + '</button>';
                htmlCall += '<option value="' + r + '">اتصال بـ: ' + r + '</option>';
            });
            if(sel) sel.innerHTML = htmlCall;
        }

        function selectRecipient(name) {
            currentRecipient = name;
            document.getElementById('chat-title').textContent = name;
            renderRecipients();
            renderMessages(name);
        }

        function addContact() {
            var name = document.getElementById('new-contact').value.trim();
            if(!name) return;
            if(!globalRecipients.includes(name)) {
                globalRecipients.push(name);
                if(!globalChats[name]) globalChats[name] = [{id:'m_'+Date.now(), sender:'النظام الدولي', type:'text', text:'تم فتح القناة الآمنة لـ ' + name, time:'الآن', isMe:false}];
                renderRecipients();
                selectRecipient(name);
                if(ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({type: 'add_recipient', name: name}));
                }
            }
            document.getElementById('new-contact').value = '';
        }

        document.getElementById('chat-form').addEventListener('submit', function(e) {
            e.preventDefault();
            var input = document.getElementById('chat-input');
            var text = input.value.trim();
            if(!text) return;
            var msg = {id: 'm_' + Date.now(), sender: 'الإدارة المركزية', type: 'text', text: text, time: new Date().toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'}), isMe: true};
            if(!globalChats[currentRecipient]) globalChats[currentRecipient] = [];
            globalChats[currentRecipient].push(msg);
            renderMessages(currentRecipient);
            if(ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({type: 'private_chat', recipient: currentRecipient, msg: msg}));
            }
            input.value = '';
        });

        document.getElementById('ai-form').addEventListener('submit', function(e) {
            e.preventDefault();
            var input = document.getElementById('ai-input');
            var text = input.value.trim();
            if(!text) return;
            var msg = {sender: 'المستخدم', text: text, time: new Date().toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'}), isAi: false};
            globalAi.push(msg);
            globalAi.push({ sender: 'SANAD AI', text: '⚡ [SANAD AI]: تم استلام طلبك ومعالجته بنجاح: "' + text + '"', time: new Date().toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'}), isAi: true });
            renderAi(globalAi);
            if(ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({type: 'ai_chat', msg: msg}));
            }
            input.value = '';
        });

        function sendFile(e) {
            var file = e.target.files[0];
            if(!file) return;
            var reader = new FileReader();
            reader.onload = function(evt) {
                var msg = {id: 'f_'+Date.now(), sender: 'الإدارة المركزية', type: file.type.startsWith('image/') ? 'image' : 'file', url: evt.target.result, name: file.name, time: new Date().toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'}), isMe: true};
                if(!globalChats[currentRecipient]) globalChats[currentRecipient] = [];
                globalChats[currentRecipient].push(msg);
                renderMessages(currentRecipient);
                if(ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({type: 'private_chat', recipient: currentRecipient, msg: msg}));
                }
            };
            reader.readAsDataURL(file);
        }

        function toggleVoice() {
            var btn = document.getElementById('rec-btn');
            if(!isRec) {
                navigator.mediaDevices.getUserMedia({audio: true}).then(function(stream) {
                    mediaRec = new MediaRecorder(stream);
                    chunks = [];
                    mediaRec.ondataavailable = function(evt) { chunks.push(evt.data); };
                    mediaRec.onstop = function() {
                        var blob = new Blob(chunks, {type: 'audio/mp3'});
                        var url = URL.createObjectURL(blob);
                        var msg = {id: 'aud_'+Date.now(), sender: 'الإدارة المركزية', type: 'audio', url: url, time: new Date().toLocaleTimeString('ar-EG', {hour:'2-digit', minute:'2-digit'}), isMe: true};
                        if(!globalChats[currentRecipient]) globalChats[currentRecipient] = [];
                        globalChats[currentRecipient].push(msg);
                        renderMessages(currentRecipient);
                        if(ws && ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({type: 'private_chat', recipient: currentRecipient, msg: msg}));
                        }
                    };
                    mediaRec.start();
                    isRec = true;
                    btn.className = 'bg-rose-600 text-white p-2.5 rounded-full animate-pulse text-xs';
                }).catch(function() { alert('يرجى السماح بالوصول للميكروفون'); });
            } else {
                mediaRec.stop();
                isRec = false;
                btn.className = 'bg-purple-700 hover:bg-purple-600 text-white p-2.5 rounded-full text-xs';
            }
        }

        function renderMessages(rec) {
            var box = document.getElementById('messages-box');
            if(!box) return;
            box.innerHTML = '';
            var list = globalChats[rec] || [];
            list.forEach(function(m) {
                var align = m.isMe ? 'justify-end' : 'justify-start';
                var bg = m.isMe ? 'bg-sky-600 text-white' : 'bg-sky-950 border border-sky-800 text-sky-100';
                var content = m.type === 'audio' ? '<audio controls src="'+m.url+'" class="w-full h-8 mt-1"></audio>' :
                              m.type === 'image' ? '<img src="'+m.url+'" class="w-full max-h-36 rounded-lg object-cover mt-1">' :
                              '<p class="mt-1">' + m.text + '</p>';
                box.innerHTML += '<div class="flex ' + align + '"><div class="max-w-[85%] ' + bg + ' p-3 rounded-xl shadow"><strong>' + m.sender + ':</strong>' + content + '<div class="flex justify-between items-center mt-1 text-[10px] opacity-80"><span>' + m.time + '</span><button type="button" onclick="delMsg(\''+m.id+'\')" class="text-rose-300 font-bold hover:underline">حذف</button></div></div></div>';
            });
            box.scrollTop = box.scrollHeight;
        }

        function delMsg(id) {
            globalChats[currentRecipient] = (globalChats[currentRecipient] || []).filter(function(m) { return m.id !== id; });
            renderMessages(currentRecipient);
            if(ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({type: 'delete_msg', recipient: currentRecipient, msgId: id}));
            }
        }

        function clearChat() {
            if(confirm('هل تريد مسح سجل المحادثة بالكامل؟')) {
                globalChats[currentRecipient] = [];
                renderMessages(currentRecipient);
                if(ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({type: 'clear_chat', recipient: currentRecipient}));
                }
            }
        }

        function renderAi(logs) {
            var box = document.getElementById('ai-box');
            if(!box) return;
            box.innerHTML = '';
            logs.forEach(function(l) {
                var align = l.isAi ? 'justify-start' : 'justify-end';
                var bg = l.isAi ? 'bg-blue-950 border border-blue-800 text-blue-100' : 'bg-sky-600 text-white';
                box.innerHTML += '<div class="flex ' + align + '"><div class="max-w-[85%] ' + bg + ' p-3 rounded-xl shadow"><strong>' + l.sender + ':</strong><p class="mt-1">' + l.text + '</p><span class="text-[10px] opacity-70 block mt-1">' + l.time + '</span></div></div>';
            });
            box.scrollTop = box.scrollHeight;
        }

        function renderVault(vault) {
            var box = document.getElementById('vault-list');
            if(!box) return;
            box.innerHTML = '';
            vault.forEach(function(item) {
                box.innerHTML += '<div class="p-3 bg-sky-950 rounded-xl border border-sky-800 flex justify-between items-center"><div><strong class="text-white">' + item.owner + '</strong><br/><span class="text-amber-300 font-mono font-bold">الرمز: ' + item.num + '</span></div><span class="text-[10px] bg-sky-600/30 text-sky-200 px-2 py-0.5 rounded">' + item.cat + '</span></div>';
            });
        }

        function genVaultCode() {
            var r = Math.floor(10000 + Math.random() * 90000);
            document.getElementById('vault-code').value = '888' + r;
        }

        function saveVaultCode() {
            var owner = document.getElementById('vault-owner').value.trim();
            var code = document.getElementById('vault-code').value.trim();
            if(!owner || !code) { alert('يرجى إدخال اسم الجهة وتوليد الكود.'); return; }
            var item = {owner: owner, num: code, cat: 'اعتماد رسمي دولي'};
            globalVault.unshift(item);
            if(!globalRecipients.includes(owner)) {
                globalRecipients.push(owner);
                globalChats[owner] = [{id:'m_'+Date.now(), sender:'النظام الدولي', type:'text', text:'تم فتح القناة الآمنة للقطاع.', time:'الآن', isMe:false}];
            }
            renderVault(globalVault);
            renderRecipients();
            if(ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({type: 'add_secure_code', item: item}));
                ws.send(JSON.stringify({type: 'add_recipient', name: owner}));
            }
            alert('✅ تم الحفظ في الخزنة وفتح القناة بنجاح.');
            document.getElementById('vault-owner').value = '';
            document.getElementById('vault-code').value = '';
        }

        function quickCall(type) {
            switchSection('calls');
            document.getElementById('call-target').value = currentRecipient;
            startCall(type);
        }

        function startCall(type) {
            var target = document.getElementById('call-target').value;
            var screen = document.getElementById('call-screen');
            var status = document.getElementById('call-status');
            var vBox = document.getElementById('video-box');
            screen.classList.remove('hidden');
            playTone();
            status.textContent = 'جاري الاتصال بـ (' + target + ') عبر الأقمار الصناعية...';

            if(ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({type: 'call_action', target: target, callType: type, caller: 'الإدارة المركزية'}));
            }

            if(type === 'video') {
                vBox.classList.remove('hidden');
                navigator.mediaDevices.getUserMedia({video:true, audio:true}).then(function(s) {
                    localStream = s;
                    document.getElementById('localVideo').srcObject = s;
                    status.textContent = 'متصل مرئياً بـ ' + target + ' (بث مباشر عالي النقاء)';
                }).catch(function() { status.textContent = 'اتصال مرئي نشط'; });
            } else {
                vBox.classList.add('hidden');
                setTimeout(function() { status.textContent = 'متصل صوتياً بـ ' + target + ' بنجاح 🔊'; }, 1200);
            }
        }

        function endCall() {
            if(localStream) localStream.getTracks().forEach(function(t) { t.stop(); });
            document.getElementById('call-screen').classList.add('hidden');
            document.getElementById('video-box').classList.add('hidden');
        }

        function triggerReset() {
            if(confirm('إعادة مزامنة الشبكة الدولية بالكامل؟')) {
                location.reload();
            }
        }

        init();
    </script>
</body>
</html>`;

app.get('/', (req, res) => {
  res.send(htmlPage);
});

server.listen(PORT, () => {
  console.log('Sanad International Enterprise Server running on port ' + PORT);
});
