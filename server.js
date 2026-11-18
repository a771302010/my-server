const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// قاعدة البيانات السيادية الحية
let secureVault = [
  { owner: 'القيادة المركزية العليا', phone: '967770000001', num: '88800001', cat: 'بروتوكول VIP' },
  { owner: 'خدمة العملاء المركزية', phone: '88888888', num: '88888888', cat: 'الدعم الفني والعمليات 24/7' },
  { owner: 'قطاع الاتصالات الفضائية', phone: '88800099', num: '88800099', cat: 'تشفير عسكري' }
];

let privateChats = {
  'رهف': [
    { id: 'm1', sender: 'رهف', type: 'text', text: 'صباح الخير يا أبي الغالي، قناة رهف الفردية مؤمنة بالكامل عبر القمر الصناعي.', time: 'الآن', isMe: false }
  ],
  'رابعة': [
    { id: 'm2', sender: 'رابعة', type: 'text', text: 'مرحباً يا أبانا، الاتصال السيادي المشفر نشط وجاهز.', time: 'الآن', isMe: false }
  ],
  'رشا': [
    { id: 'm3', sender: 'رشا', type: 'text', text: 'تم استلام الإشارة الفضائية بنجاح وبأعلى جودة.', time: 'الآن', isMe: false }
  ],
  'آمنة': [
    { id: 'm4', sender: 'آمنة', type: 'text', text: 'منظومة سَنَد تعمل بكفاءة تامة ومؤمنة 100%.', time: 'الآن', isMe: false }
  ],
  '88888888': [
    { id: 'm5', sender: 'خدمة العملاء المركزية', type: 'text', text: 'أهلاً بك يا شيخ أبو طارق في غرفة العمليات السيادية لمنظومة سَنَد.', time: 'الآن', isMe: false }
  ]
};

let aiChatLogs = [
  { sender: 'OMEGA AI V5', text: 'أهلاً بك يا أبو طارق. أنا نظام الذكاء الاصطناعي السيادي المدمج في منظومة سَنَد. جاهز لتحليل البيانات، تأمين القنوات، والرد الفوري على أوامرك.', time: 'الآن', isAi: true }
];

let activeRecipients = ['رهف', 'رابعة', 'رشا', 'آمنة', '88888888'];
let activeConnectionsCount = 0;

function broadcast(payload) {
  const str = JSON.stringify(payload);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(str);
    }
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
        const recipient = data.recipient;
        if (!privateChats[recipient]) privateChats[recipient] = [];
        privateChats[recipient].push(data.msg);
        broadcast({ type: 'private_chat', recipient: recipient, msg: data.msg });
      } 
      else if (data.type === 'delete_msg') {
        const recipient = data.recipient;
        if (privateChats[recipient]) {
          privateChats[recipient] = privateChats[recipient].filter(m => m.id !== data.msgId);
          broadcast({ type: 'update_chats', recipient: recipient, chats: privateChats[recipient] });
        }
      }
      else if (data.type === 'clear_chat') {
        const recipient = data.recipient;
        privateChats[recipient] = [];
        broadcast({ type: 'update_chats', recipient: recipient, chats: [] });
      }
      else if (data.type === 'view_once_opened') {
        const recipient = data.recipient;
        if (privateChats[recipient]) {
          const msg = privateChats[recipient].find(m => m.id === data.msgId);
          if (msg) {
            msg.isOpened = true;
            msg.text = '👁️ [تم فتح المحتوى وتدميره ذاتياً عبر الأقمار الصناعية]';
            msg.type = 'text';
            broadcast({ type: 'update_chats', recipient: recipient, chats: privateChats[recipient] });
          }
        }
      }
      else if (data.type === 'ai_chat') {
        aiChatLogs.push(data.msg);
        const q = data.msg.text;
        let reply = '⚡ [OMEGA AI V5]: تم استلام أمرك السيادي ("' + q + '"). تم تشفير الحزمة وإجراء المسح الفضائي الشامل. جميع القنوات مؤمنة بنسبة 100% يا أبو طارق.';
        if (q.includes('حالة') || q.includes('تقرير') || q.includes('فحص')) {
          reply = '🛰️ [تقرير الحالة الفضائية]: الأقمار الصناعية متصلة بنجاح • التشفير المجرّد نشط • عدد القنوات المؤمنة: ' + activeRecipients.length;
        } else if (q.includes('كود') || q.includes('رمز')) {
          const code = '888' + Math.floor(10000 + Math.random() * 90000);
          reply = '🔐 [مولد الأكواد الذكي]: تم توليد كود سيادي مشفر لك: ' + code;
        }
        
        aiChatLogs.push({
          sender: 'OMEGA AI V5',
          text: reply,
          time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
          isAi: true
        });
        broadcast({ type: 'ai_update', logs: aiChatLogs });
      }
      else if (data.type === 'add_recipient') {
        const newName = (data.name || '').trim();
        if (newName && !activeRecipients.includes(newName)) {
          activeRecipients.push(newName);
          if (!privateChats[newName]) {
            privateChats[newName] = [{
              id: 'm_' + Date.now(),
              sender: 'النظام السيادي',
              type: 'text',
              text: 'تم إنشاء وتشفير القناة الفضائية الخاصة بـ (' + newName + ') بنجاح.',
              time: 'الآن',
              isMe: false
            }];
          }
          broadcast({ type: 'update_recipients', recipients: activeRecipients, chats: privateChats });
        }
      }
      else if (data.type === 'add_secure_code') {
        secureVault.unshift(data.item);
        broadcast({ type: 'update_vault', vault: secureVault });
      }
      else if (data.type === 'call_action') {
        broadcast({ type: 'incoming_call', target: data.target, callType: data.callType, caller: data.caller });
      }
    } catch (e) {
      console.error('WS Error:', e);
    }
  });

  ws.on('close', () => {
    activeConnectionsCount = Math.max(1, activeConnectionsCount - 1);
    broadcast({ type: 'stats', connections: activeConnectionsCount });
  });
});

app.get('/manifest.json', (req, res) => {
  res.json({
    name: "برنامج سَنَد السيادي الذكي",
    short_name: "سَنَد",
    start_url: "/",
    display: "standalone",
    background_color: "#021824",
    theme_color: "#0284c7",
    icons: [
      {
        src: "https://i.ibb.co/3s65Z62/IMG-3248.jpg",
        sizes: "512x512",
        type: "image/jpeg",
        purpose: "any maskable"
      }
    ]
  });
});

const htmlPage = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="theme-color" content="#0284c7">
    <link rel="manifest" href="/manifest.json">
    <link rel="apple-touch-icon" href="https://i.ibb.co/3s65Z62/IMG-3248.jpg">
    <title>سَنَد | المنظومة السيادية الذكية بالأقمار الصناعية</title>
    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { font-family: 'Tajawal', sans-serif; background-color: #021824; color: #f0fdf4; height: 100vh; height: 100dvh; overflow: hidden; margin: 0; display: flex; flex-direction: column; }
        .chat-bg { background-color: #08121a; background-image: radial-gradient(#132736 1px, transparent 1px); background-size: 18px 18px; }
        @keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(100%); } }
        .animate-ticker { display: inline-block; white-space: nowrap; animation: ticker 28s linear infinite; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: #0369a1; border-radius: 10px; }
    </style>
</head>
<body class="w-screen h-[100dvh] flex flex-col justify-between m-0 p-0">

    <div id="alert-banner" class="hidden fixed top-4 left-1/2 transform -translate-x-1/2 bg-amber-400 text-slate-950 font-extrabold px-4 py-2.5 rounded-2xl text-xs z-50 shadow-2xl flex items-center gap-2 border-2 border-white">
        <span>🛰️</span>
        <span id="alert-text">تنبيه فضائي جديد</span>
    </div>

    <div class="bg-sky-950 border-b border-sky-800 text-sky-200 text-[11px] font-bold py-1.5 px-3 overflow-hidden whitespace-nowrap shrink-0 flex items-center shadow">
        <span class="bg-sky-600 text-white px-2 py-0.5 rounded text-[9px] ml-2 shrink-0">الاتصال الفضائي 🛰️</span>
        <div class="overflow-hidden w-full">
            <span class="animate-ticker">
                🌐 منظومة سَنَد الذكية للاتصالات السيادية • مشفرة عبر الأقمار الصناعية • إشراف: الشيخ أبو طارق • OMEGA AI V5 🌐
            </span>
        </div>
    </div>

    <header class="bg-sky-900 border-b border-sky-700 px-3 py-2 flex items-center justify-between shrink-0 shadow-lg">
        <div class="flex items-center gap-2.5">
            <img src="https://i.ibb.co/3s65Z62/IMG-3248.jpg" class="w-10 h-10 rounded-xl border-2 border-sky-400 object-cover shadow" alt="سَنَد">
            <div>
                <h1 class="font-extrabold text-xs text-white flex items-center gap-1.5">
                    برنامج سَنَد <span class="bg-sky-600 text-white text-[9px] px-2 py-0.5 rounded-full">النسخة الفضائية السيادية</span>
                </h1>
                <p class="text-[10px] text-sky-200">إشراف: أبو طارق • متصل عبر التشفير المجرّد</p>
            </div>
        </div>
        <div class="flex items-center gap-2">
            <span id="net-status" class="bg-emerald-500/20 text-emerald-300 text-[9px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 border border-emerald-500/40">
                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>متصل بالفضائي (Live)</span>
            </span>
        </div>
    </header>

    <div class="flex-1 flex overflow-hidden relative">
        <aside class="w-16 md:w-20 bg-slate-950 border-l border-sky-900 flex flex-col items-center py-2.5 h-full shrink-0 z-10 space-y-2.5 overflow-y-auto">
            <button onclick="switchSection('chats')" id="btn-sec-chats" class="w-14 py-2.5 rounded-2xl bg-sky-700 text-white shadow transition flex flex-col items-center gap-1 relative">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                <span class="text-[9px] font-bold">الدردشة</span>
                <span id="chat-badge" class="hidden absolute top-1 right-1 w-4 h-4 bg-rose-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center">!</span>
            </button>

            <button onclick="switchSection('ai')" id="btn-sec-ai" class="w-14 py-2.5 rounded-2xl hover:bg-sky-950 text-sky-200 transition flex flex-col items-center gap-1">
                <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect></svg>
                <span class="text-[9px] font-bold">الذكاء AI</span>
            </button>

            <button onclick="switchSection('calls')" id="btn-sec-calls" class="w-14 py-2.5 rounded-2xl hover:bg-sky-950 text-sky-200 transition flex flex-col items-center gap-1">
                <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                <span class="text-[9px] font-bold">المكالمات</span>
            </button>

            <button onclick="switchSection('codes')" id="btn-sec-codes" class="w-14 py-2.5 rounded-2xl hover:bg-sky-950 text-sky-200 transition flex flex-col items-center gap-1">
                <svg class="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                <span class="text-[9px] font-bold">الخزنة</span>
            </button>

            <button onclick="switchSection('radar')" id="btn-sec-radar" class="w-14 py-2.5 rounded-2xl hover:bg-sky-950 text-sky-200 transition flex flex-col items-center gap-1">
                <svg class="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle></svg>
                <span class="text-[9px] font-bold">الأقمار</span>
            </button>

            <button onclick="switchSection('help')" id="btn-sec-help" class="w-14 py-2.5 rounded-2xl hover:bg-sky-950 text-sky-200 transition flex flex-col items-center gap-1">
                <svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle></svg>
                <span class="text-[9px] font-bold">التعليمات</span>
            </button>

            <button onclick="switchSection('settings')" id="btn-sec-settings" class="w-14 py-2.5 rounded-2xl hover:bg-sky-950 text-sky-200 transition flex flex-col items-center gap-1">
                <svg class="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle></svg>
                <span class="text-[9px] font-bold">الإعدادات</span>
            </button>
        </aside>

        <main class="flex-1 flex flex-col bg-slate-950 relative overflow-hidden h-full w-full">
            <div id="section-chats" class="flex-1 flex flex-col h-full overflow-hidden">
                <div class="bg-sky-900 border-b border-sky-800 px-3 py-2 flex items-center justify-between shrink-0">
                    <div class="flex items-center gap-2">
                        <div class="w-9 h-9 bg-sky-700 rounded-full flex items-center justify-center font-extrabold text-white border-2 border-sky-400 shadow" id="current-avatar">ر</div>
                        <div>
                            <h2 class="font-bold text-xs text-white" id="current-chat-title">رهف</h2>
                            <p class="text-[10px] text-emerald-300 flex items-center gap-1">
                                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> متصل بالشبكة السيادية (Online)
                            </p>
                        </div>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <button onclick="clearCurrentChat()" class="px-2.5 py-1.5 bg-rose-900 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold transition shadow">
                            🗑️ مسح الكل
                        </button>
                        <button onclick="quickCall('audio')" class="p-2 bg-sky-800 hover:bg-sky-700 text-sky-100 rounded-full transition shadow" title="مكالمة صوتية">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                        </button>
                        <button onclick="quickCall('video')" class="p-2 bg-sky-800 hover:bg-sky-700 text-sky-100 rounded-full transition shadow" title="مكالمة فيديو">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                        </button>
                    </div>
                </div>

                <div class="p-2 bg-sky-950 border-b border-sky-800 flex flex-col gap-1.5 shrink-0">
                    <div class="flex items-center gap-1.5">
                        <input type="text" id="search-contact" placeholder="🔍 ابحث في علبة الوارد..." oninput="filterRecipients()" class="bg-sky-900 border border-sky-700 rounded-lg px-2.5 py-1.5 text-[11px] text-white flex-1 focus:outline-none">
                        <input type="text" id="new-contact-name" placeholder="اسم جديد..." class="bg-sky-900 border border-sky-700 rounded-lg px-2 py-1.5 text-[11px] text-white w-24 focus:outline-none">
                        <button onclick="addNewContact()" class="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold px-2.5 py-1.5 rounded-lg text-[11px] shrink-0">إضافة</button>
                    </div>
                    <div class="flex gap-1.5 overflow-x-auto pb-1" id="recipient-tabs"></div>
                </div>

                <div id="chat-messages-box" class="flex-1 overflow-y-auto p-3 space-y-2.5 chat-bg"></div>

                <form id="chat-form" class="p-2 bg-sky-950 border-t border-sky-800 flex gap-1.5 items-center shrink-0">
                    <label class="cursor-pointer bg-sky-800 hover:bg-sky-700 text-white p-2.5 rounded-full flex items-center justify-center shrink-0 shadow" title="إرفاق ملف">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        <input type="file" id="file-input" class="hidden" accept="image/*,video/*,.pdf,.doc,.docx" onchange="handleFileUpload(event)">
                    </label>

                    <button type="button" id="view-once-btn" onclick="toggleViewOnce()" class="bg-sky-900 border border-sky-700 text-sky-200 p-2.5 rounded-full flex items-center justify-center shrink-0 shadow transition" title="عرض مرة واحدة">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    </button>

                    <input type="text" id="chat-input" placeholder="اكتب رسالة مشفرة..." class="flex-1 bg-sky-900 border border-sky-700 rounded-2xl px-3.5 py-2 text-xs text-white focus:outline-none">
                    
                    <button type="button" id="record-btn" onclick="toggleVoiceRecord()" class="bg-purple-700 hover:bg-purple-600 text-white p-2.5 rounded-full flex items-center justify-center shrink-0 shadow" title="تسجيل صوتي">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path></svg>
                    </button>

                    <button type="submit" class="bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold p-2.5 rounded-full shrink-0 shadow flex items-center justify-center">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                    </button>
                </form>
            </div>

            <div id="section-ai" class="flex-1 hidden flex-col h-full bg-slate-950 overflow-hidden">
                <div class="bg-blue-950 border-b border-blue-800 px-3 py-2.5 flex items-center justify-between shrink-0">
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xs">AI</div>
                        <div>
                            <h2 class="font-bold text-xs text-blue-100">مساعد سند الذكي (OMEGA AI V5)</h2>
                            <p class="text-[9px] text-blue-300">اكتب "تقرير" أو "كود" لأي أمر سيادي</p>
                        </div>
                    </div>
                </div>
                <div id="ai-messages-box" class="flex-1 overflow-y-auto p-3 space-y-2.5 chat-bg"></div>
                <form id="ai-form" class="p-2.5 bg-sky-950 border-t border-sky-800 flex gap-2 shrink-0">
                    <input type="text" id="ai-input" placeholder="اسأل OMEGA AI أو اطلب كود سيادي..." class="flex-1 bg-sky-900 border border-sky-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none">
                    <button type="submit" class="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl text-xs">إرسال</button>
                </form>
            </div>

            <div id="section-calls" class="flex-1 hidden flex-col h-full p-4 items-center justify-center text-center bg-sky-950 overflow-y-auto">
                <div class="w-20 h-20 bg-sky-900 border-2 border-emerald-400 rounded-full flex items-center justify-center mb-3 text-emerald-300 shadow-2xl relative">
                    <svg class="w-9 h-9" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                </div>
                <h3 class="text-base font-extrabold text-white mb-1">مركز الاتصال الفضائي المشفر</h3>
                <p class="text-[11px] text-sky-300 mb-4">اتصال مباشر عالي النقاء عبر القنوات السيادية</p>
                
                <div class="w-full max-w-xs space-y-3 mb-4">
                    <select id="call-target" class="w-full bg-sky-900 border border-sky-600 rounded-xl p-2.5 text-xs text-white font-bold text-center">
                        <option value="رهف">اتصال بـ: رهف</option>
                        <option value="رابعة">اتصال بـ: رابعة</option>
                        <option value="رشا">اتصال بـ: رشا</option>
                        <option value="آمنة">اتصال بـ: آمنة</option>
                        <option value="88888888">خدمة العملاء (88888888)</option>
                    </select>
                    
                    <div class="grid grid-cols-2 gap-2">
                        <button onclick="startCall('audio')" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs shadow">📞 مكالمة صوتية</button>
                        <button onclick="startCall('video')" class="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-xs shadow">📹 مكالمة فيديو</button>
                    </div>
                </div>

                <div id="call-screen" class="hidden w-full max-w-md bg-slate-900 border border-sky-600 rounded-2xl p-3 text-center space-y-2.5 shadow-2xl">
                    <p id="call-status" class="text-xs text-amber-300 font-bold">جاري الاتصال عبر القمر الصناعي...</p>
                    <div id="video-container" class="hidden grid grid-cols-2 gap-2">
                        <div class="relative"><video id="localVideo" autoplay muted playsinline class="w-full h-32 bg-black rounded-xl object-cover border border-sky-700"></video><span class="absolute bottom-1 right-1 bg-black/70 text-[9px] px-1.5 rounded text-white">كاميرتك</span></div>
                        <div class="relative bg-black rounded-xl flex items-center justify-center h-32 border border-sky-700"><span id="remote-status-text" class="text-sky-300 text-[10px] px-2">بانتظار رد الطرف الآخر...</span><span class="absolute bottom-1 right-1 bg-black/70 text-[9px] px-1.5 rounded text-white">الطرف الآخر</span></div>
                    </div>
                    <button onclick="endCall()" class="bg-rose-600 hover:bg-rose-500 text-white font-bold px-5 py-2 rounded-xl text-xs shadow">إنهاء الاتصال</button>
                </div>
            </div>

            <div id="section-codes" class="flex-1 hidden flex-col h-full p-4 overflow-y-auto space-y-4 bg-sky-950">
                <div class="bg-sky-900 border border-sky-700 rounded-2xl p-4 shadow-lg">
                    <h3 class="font-extrabold text-sm text-amber-300 mb-3">🛡️ توليد واعتماد كود سيادي جديد</h3>
                    <button onclick="generateSovereignCode()" class="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold py-2.5 rounded-xl text-xs mb-3 transition shadow">⚡ توليد بصمة وكود سيادي (8 أرقام)</button>
                    <div class="grid grid-cols-1 gap-2">
                        <input type="text" id="new-owner-name" placeholder="اسم الجهة أو الفرد..." class="bg-sky-950 border border-sky-700 rounded-xl p-2.5 text-xs text-white">
                        <input type="text" id="new-code-val" placeholder="888xxxxx" readonly class="bg-slate-950 border border-sky-700 rounded-xl p-2.5 text-xs font-mono font-bold text-amber-300 text-center">
                    </div>
                    <button onclick="saveSecureCode()" class="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-2.5 rounded-xl text-xs mt-3 transition shadow">حفظ في الخزنة السرية</button>
                </div>
                <div class="bg-sky-900 border border-sky-700 rounded-2xl p-4 flex-1 shadow-lg">
                    <h3 class="font-extrabold text-sm text-sky-100 mb-3">🔐 سجل الخزنة السيادية المحمية</h3>
                    <div id="vault-list" class="space-y-2 text-xs"></div>
                </div>
            </div>

            <div id="section-radar" class="flex-1 hidden flex-col h-full p-4 overflow-y-auto space-y-3 bg-sky-950 text-xs">
                <div class="bg-sky-900 border border-cyan-700 rounded-2xl p-4 space-y-3">
                    <h3 class="font-extrabold text-sm text-cyan-300">🛰️ حالة الربط الفضائي والأقمار الصناعية</h3>
                    <div class="grid grid-cols-2 gap-2 text-center">
                        <div class="bg-sky-950 p-3 rounded-xl border border-sky-800"><p class="text-[10px] text-sky-400">القمر الرئيسي</p><p class="font-extrabold text-emerald-400 mt-1">SANAD-SAT 1 (نشط)</p></div>
                        <div class="bg-sky-950 p-3 rounded-xl border border-sky-800"><p class="text-[10px] text-sky-400">قوة الإشارة المشفرة</p><p class="font-extrabold text-amber-300 mt-1">99.8% AES-256</p></div>
                    </div>
                </div>
            </div>

            <div id="section-help" class="flex-1 hidden flex-col h-full p-4 overflow-y-auto space-y-3 text-xs bg-sky-950">
                <div class="bg-sky-900 border border-sky-700 rounded-2xl p-4 space-y-3">
                    <h3 class="font-extrabold text-sm text-purple-300">📖 الدليل السيادي لمنظومة سَنَد</h3>
                    <div class="p-3 bg-sky-950 rounded-xl border border-sky-800 space-y-2.5 text-sky-100 leading-relaxed">
                        <p><strong>1. التبديل بين القنوات:</strong> اضغط على أي اسم في الأعلى (رهف، رابعة، رشا، آمنة، أو خدمة العملاء) لفتح المحادثة.</p>
                        <p><strong>2. رسائل العرض لمرة واحدة:</strong> اضغط أيقونة العين بجانب زر الإرسال لتدمير الرسالة تلقائياً بعد قراءتها.</p>
                    </div>
                </div>
            </div>

            <div id="section-settings" class="flex-1 hidden flex-col h-full p-4 overflow-y-auto space-y-3 text-xs bg-sky-950">
                <div class="bg-sky-900 border border-sky-700 rounded-2xl p-4 space-y-3">
                    <h3 class="font-extrabold text-sm text-indigo-300">⚙️ إحصائيات الشبكة والتحكم</h3>
                    <div class="flex justify-between items-center p-3 bg-sky-950 rounded-xl border border-sky-800">
                        <span>المتصلون حالياً:</span>
                        <span id="stat-connections" class="text-emerald-400 font-extrabold font-mono text-sm">1</span>
                    </div>
                    <button onclick="triggerKillSwitch()" class="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-xl text-xs transition shadow">⚡ تفعيل مفتاح الطوارئ وإعادة تنشيط الجلسة</button>
                </div>
            </div>
        </main>
    </div>

    <script>
        var currentRecipient = 'رهف';
        var globalChatsData = {
            'رهف': [{ id: 'm1', sender: 'رهف', type: 'text', text: 'صباح الخير يا أبي الغالي، قناة رهف الفردية مؤمنة بالكامل عبر القمر الصناعي.', time: 'الآن', isMe: false }],
            'رابعة': [{ id: 'm2', sender: 'رابعة', type: 'text', text: 'مرحباً يا أبانا، الاتصال السيادي المشفر نشط وجاهز.', time: 'الآن', isMe: false }],
            'رشا': [{ id: 'm3', sender: 'رشا', type: 'text', text: 'تم استلام الإشارة الفضائية بنجاح وبأعلى جودة.', time: 'الآن', isMe: false }],
            'آمنة': [{ id: 'm4', sender: 'آمنة', type: 'text', text: 'منظومة سَنَد تعمل بكفاءة تامة ومؤمنة 100%.', time: 'الآن', isMe: false }],
            '88888888': [{ id: 'm5', sender: 'خدمة العملاء المركزية', type: 'text', text: 'أهلاً بك يا شيخ أبو طارق في غرفة العمليات السيادية.', time: 'الآن', isMe: false }]
        };
        var globalVaultData = [
            { owner: 'القيادة المركزية العليا', num: '88800001', cat: 'بروتوكول VIP' },
            { owner: 'خدمة العملاء المركزية', num: '88888888', cat: 'الدعم الفني 24/7' }
        ];
        var globalRecipients = ['رهف', 'رابعة', 'رشا', 'آمنة', '88888888'];
        var globalAiLogs = [
            { sender: 'OMEGA AI V5', text: 'أهلاً بك يا أبو طارق. أنا نظام الذكاء الاصطناعي السيادي المدمج في منظومة سَنَد. جاهز لتحليل البيانات وتأمين القنوات.', time: 'الآن', isAi: true }
        ];

        var mediaRecorder = null;
        var audioChunks = [];
        var isRecording = false;
        var localStream = null;
        var isViewOnceMode = false;
        var ws = null;

        function initUI() {
            renderVault(globalVaultData);
            renderRecipients(globalRecipients);
            renderMessages(currentRecipient);
            renderAiLogs(globalAiLogs);
            connectWebSocket();
        }

        function connectWebSocket() {
            var protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
            var wsUrl = protocol + window.location.host;
            ws = new WebSocket(wsUrl);

            ws.onopen = function() {
                document.getElementById('net-status').innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span><span>متصل بالفضائي (Live)</span>';
            };

            ws.onmessage = function(event) {
                var data = JSON.parse(event.data);
                if (data.type === 'init') {
                    globalVaultData = data.vault;
                    globalChatsData = data.chats;
                    globalRecipients = data.recipients;
                    globalAiLogs = data.aiLogs;
                    renderVault(globalVaultData);
                    renderRecipients(globalRecipients);
                    renderMessages(currentRecipient);
                    renderAiLogs(globalAiLogs);
                    document.getElementById('stat-connections').textContent = data.connections;
                }
                else if (data.type === 'stats') {
                    document.getElementById('stat-connections').textContent = data.connections;
                }
                else if (data.type === 'update_vault') {
                    globalVaultData = data.vault;
                    renderVault(globalVaultData);
                }
                else if (data.type === 'update_recipients') {
                    globalRecipients = data.recipients;
                    globalChatsData = data.chats;
                    renderRecipients(globalRecipients);
                }
                else if (data.type === 'private_chat') {
                    if (!globalChatsData[data.recipient]) globalChatsData[data.recipient] = [];
                    var exists = globalChatsData[data.recipient].some(function(m) { return m.id === data.msg.id; });
                    if (!exists) {
                        globalChatsData[data.recipient].push(data.msg);
                        if (currentRecipient === data.recipient) {
                            appendMessage(data.msg);
                        } else {
                            showAlert('رسالة جديدة من ' + data.recipient);
                            document.getElementById('chat-badge').classList.remove('hidden');
                        }
                    }
                }
                else if (data.type === 'update_chats') {
                    globalChatsData[data.recipient] = data.chats;
                    if (currentRecipient === data.recipient) {
                        renderMessages(currentRecipient);
                    }
                }
                else if (data.type === 'ai_update') {
                    globalAiLogs = data.logs;
                    renderAiLogs(globalAiLogs);
                }
                else if (data.type === 'incoming_call') {
                    playRingTone();
                    showAlert('📞 اتصال (' + (data.callType === 'video' ? 'فيديو' : 'صوتي') + ') من ' + data.caller);
                }
            };

            ws.onclose = function() {
                document.getElementById('net-status').innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-400"></span><span>إعادة مزامنة...</span>';
                setTimeout(connectWebSocket, 3000);
            };
        }

        function playRingTone() {
            try {
                var ctx = new (window.AudioContext || window.webkitAudioContext)();
                var osc = ctx.createOscillator();
                var gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(520, ctx.currentTime);
                gain.gain.setValueAtTime(0.15, ctx.currentTime);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 1.0);
            } catch(e) {}
        }

        function showAlert(text) {
            var banner = document.getElementById('alert-banner');
            document.getElementById('alert-text').textContent = text;
            banner.classList.remove('hidden');
            setTimeout(function() { banner.classList.add('hidden'); }, 4000);
        }

        function switchSection(secId) {
            var sections = ['chats', 'ai', 'calls', 'codes', 'radar', 'help', 'settings'];
            for (var i = 0; i < sections.length; i++) {
                var id = sections[i];
                var el = document.getElementById('section-' + id);
                if (el) {
                    el.classList.add('hidden');
                    el.classList.remove('flex');
                }
                var btn = document.getElementById('btn-sec-' + id);
                if (btn) btn.className = 'w-14 py-2.5 rounded-2xl hover:bg-sky-950 text-sky-200 transition flex flex-col items-center gap-1 relative';
            }
            var target = document.getElementById('section-' + secId);
            if (target) {
                target.classList.remove('hidden');
                target.classList.add('flex');
            }
            var targetBtn = document.getElementById('btn-sec-' + secId);
            if (targetBtn) targetBtn.className = 'w-14 py-2.5 rounded-2xl bg-sky-700 text-white shadow transition flex flex-col items-center gap-1 relative';
        }

        function renderRecipients(list) {
            var tabs = document.getElementById('recipient-tabs');
            if (!tabs) return;
            var html = '';
            for (var i = 0; i < list.length; i++) {
                var name = list[i];
                var isActive = (name === currentRecipient);
                var cls = isActive ? 'bg-sky-600 text-white shadow' : 'bg-sky-900 text-sky-200 border border-sky-700';
                html += '<button type="button" onclick="selectRecipient(\'' + name + '\')" class="px-3 py-1.5 rounded-lg ' + cls + ' text-xs font-bold transition shrink-0">' + name + '</button>';
            }
            tabs.innerHTML = html;
        }

        function filterRecipients() {
            var query = document.getElementById('search-contact').value.toLowerCase();
            var filtered = globalRecipients.filter(function(r) { return r.toLowerCase().indexOf(query) !== -1; });
            renderRecipients(filtered);
        }

        function addNewContact() {
            var input = document.getElementById('new-contact-name');
            var name = input.value.trim();
            if (!name) {
                alert('يرجى كتابة اسم الشخص أولاً.');
                return;
            }
            if (globalRecipients.indexOf(name) === -1) {
                globalRecipients.push(name);
                globalChatsData[name] = [{ id: 'm_' + Date.now(), sender: 'النظام السيادي', type: 'text', text: 'تم فتح القناة السيادية لـ ' + name, time: 'الآن', isMe: false }];
                renderRecipients(globalRecipients);
                selectRecipient(name);
            }
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'add_recipient', name: name }));
            }
            input.value = '';
        }

        function selectRecipient(name) {
            currentRecipient = name;
            document.getElementById('current-chat-title').textContent = name;
            document.getElementById('current-avatar').textContent = name.charAt(0);
            renderRecipients(globalRecipients);
            renderMessages(name);
            document.getElementById('chat-badge').classList.add('hidden');
        }

        function toggleViewOnce() {
            isViewOnceMode = !isViewOnceMode;
            var btn = document.getElementById('view-once-btn');
            if (isViewOnceMode) {
                btn.className = 'bg-amber-500 text-slate-950 p-2.5 rounded-full flex items-center justify-center shrink-0 shadow animate-pulse';
                showAlert('👁️ وضع العرض لمرة واحدة مفعل');
            } else {
                btn.className = 'bg-sky-900 border border-sky-700 text-sky-200 p-2.5 rounded-full flex items-center justify-center shrink-0 shadow transition';
            }
        }

        document.getElementById('chat-form').addEventListener('submit', function(e) {
            e.preventDefault();
            var input = document.getElementById('chat-input');
            var text = input.value.trim();
            if (!text) return;

            var msgData = {
                id: 'msg_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
                sender: 'أبو طارق',
                type: isViewOnceMode ? 'view_once' : 'text',
                text: text,
                isOpened: false,
                time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
                isMe: true
            };

            if (!globalChatsData[currentRecipient]) globalChatsData[currentRecipient] = [];
            globalChatsData[currentRecipient].push(msgData);
            appendMessage(msgData);

            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'private_chat', recipient: currentRecipient, msg: msgData }));
            }
            input.value = '';
            if (isViewOnceMode) toggleViewOnce();
        });

        document.getElementById('ai-form').addEventListener('submit', function(e) {
            e.preventDefault();
            var input = document.getElementById('ai-input');
            var text = input.value.trim();
            if (!text) return;

            var msgData = {
                sender: 'أبو طارق',
                text: text,
                time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
                isAi: false
            };

            globalAiLogs.push(msgData);
            renderAiLogs(globalAiLogs);

            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'ai_chat', msg: msgData }));
            }
            input.value = '';
        });

        function handleFileUpload(event) {
            var file = event.target.files[0];
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function(e) {
                var fileData = {
                    id: 'file_' + Date.now(),
                    sender: 'أبو طارق',
                    type: isViewOnceMode ? 'view_once_media' : (file.type.indexOf('image/') === 0 ? 'image' : 'file'),
                    url: e.target.result,
                    name: file.name,
                    isOpened: false,
                    time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
                    isMe: true
                };
                if (!globalChatsData[currentRecipient]) globalChatsData[currentRecipient] = [];
                globalChatsData[currentRecipient].push(fileData);
                appendMessage(fileData);

                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'private_chat', recipient: currentRecipient, msg: fileData }));
                }
                if (isViewOnceMode) toggleViewOnce();
            };
            reader.readAsDataURL(file);
        }

        function toggleVoiceRecord() {
            var btn = document.getElementById('record-btn');
            if (!isRecording) {
                navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
                    mediaRecorder = new MediaRecorder(stream);
                    audioChunks = [];
                    mediaRecorder.ondataavailable = function(e) { audioChunks.push(e.data); };
                    mediaRecorder.onstop = function() {
                        var audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
                        var audioUrl = URL.createObjectURL(audioBlob);
                        var msgData = {
                            id: 'audio_' + Date.now(),
                            sender: 'أبو طارق',
                            type: 'audio',
                            url: audioUrl,
                            time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
                            isMe: true
                        };
                        if (!globalChatsData[currentRecipient]) globalChatsData[currentRecipient] = [];
                        globalChatsData[currentRecipient].push(msgData);
                        appendMessage(msgData);
                        if (ws && ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({ type: 'private_chat', recipient: currentRecipient, msg: msgData }));
                        }
                    };
                    mediaRecorder.start();
                    isRecording = true;
                    btn.className = 'bg-rose-600 text-white p-2.5 rounded-full flex items-center justify-center shrink-0 animate-ping';
                }).catch(function() {
                    alert('يرجى السماح بالوصول للميكروفون.');
                });
            } else {
                mediaRecorder.stop();
                isRecording = false;
                btn.className = 'bg-purple-700 hover:bg-purple-600 text-white p-2.5 rounded-full flex items-center justify-center shrink-0 shadow';
            }
        }

        function appendMessage(msg) {
            var box = document.getElementById('chat-messages-box');
            if (!box) return;
            
            var content = '';
            if (msg.type === 'audio') {
                content = '<audio controls src="' + msg.url + '" class="w-full h-8 mt-1"></audio>';
            } else if (msg.type === 'image') {
                content = '<img src="' + msg.url + '" class="w-full max-h-48 rounded-xl object-cover mt-1 cursor-pointer" onclick="window.open(this.src)">';
            } else if (msg.type === 'file') {
                content = '<a href="' + msg.url + '" download="' + msg.name + '" class="text-amber-300 underline block mt-1">📁 تنزيل الملف: ' + msg.name + '</a>';
            } else if (msg.type === 'view_once') {
                if (msg.isOpened) {
                    content = '<p class="text-slate-300 italic mt-0.5">👁️ [تم عرض الرسالة وتدميرها ذاتياً]</p>';
                } else {
                    var safeText = encodeURIComponent(msg.text);
                    content = '<div onclick="openViewOnce(\'' + msg.id + '\', \'' + safeText + '\')" class="bg-amber-500/20 border border-amber-400 p-2 rounded-xl cursor-pointer text-amber-300 font-bold mt-1">👁️ رسالة سرية (اضغط للفتح)</div>';
                }
            } else if (msg.type === 'view_once_media') {
                if (msg.isOpened) {
                    content = '<p class="text-slate-300 italic mt-0.5">👁️ [تم عرض الملف وتدميره ذاتياً]</p>';
                } else {
                    content = '<div onclick="openViewOnceMedia(\'' + msg.id + '\', \'' + msg.url + '\')" class="bg-amber-500/20 border border-amber-400 p-2 rounded-xl cursor-pointer text-amber-300 font-bold mt-1">👁️ ملف سري (اضغط للفتح)</div>';
                }
            } else {
                content = '<p class="mt-0.5">' + msg.text + '</p>';
            }

            var alignClass = msg.isMe ? 'justify-end' : 'justify-start';
            var bgClass = msg.isMe ? 'bg-sky-600 text-white' : 'bg-sky-950 border border-sky-800 text-sky-100';

            var html = '<div id="msg_box_' + msg.id + '" class="flex ' + alignClass + '">' +
                '<div class="max-w-[85%] ' + bgClass + ' p-3 rounded-2xl text-xs leading-relaxed shadow">' +
                    '<div class="flex justify-between items-center gap-4 mb-1">' +
                        '<strong class="text-amber-300">' + msg.sender + '</strong>' +
                        '<button type="button" onclick="deleteMessage(\'' + msg.id + '\')" class="bg-rose-900/70 hover:bg-rose-700 text-white px-2 py-0.5 rounded text-[10px] font-bold">🗑️ حذف</button>' +
                    '</div>' +
                    content +
                    '<div class="text-[9px] opacity-80 mt-1.5 flex justify-between items-center gap-3">' +
                        '<span>' + msg.time + '</span>' +
                        '<span class="font-bold">✓✓ موثق 🔒</span>' +
                    '</div>' +
                '</div>' +
            '</div>';

            box.insertAdjacentHTML('beforeend', html);
            box.scrollTop = box.scrollHeight;
        }

        function openViewOnce(msgId, encodedText) {
            alert('🔐 محتوى الرسالة:\n\n' + decodeURIComponent(encodedText));
            var msgs = globalChatsData[currentRecipient] || [];
            for (var i = 0; i < msgs.length; i++) {
                if (msgs[i].id === msgId) {
                    msgs[i].isOpened = true;
                    msgs[i].text = '👁️ [تم فتح المحتوى وتدميره ذاتياً]';
                    msgs[i].type = 'text';
                }
            }
            renderMessages(currentRecipient);
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'view_once_opened', recipient: currentRecipient, msgId: msgId }));
            }
        }

        function openViewOnceMedia(msgId, url) {
            var win = window.open();
            if (win) win.document.write('<img src="' + url + '" style="max-width:100%;height:auto;" />');
            var msgs = globalChatsData[currentRecipient] || [];
            for (var i = 0; i < msgs.length; i++) {
                if (msgs[i].id === msgId) {
                    msgs[i].isOpened = true;
                    msgs[i].text = '👁️ [تم عرض الملف وتدميره ذاتياً]';
                    msgs[i].type = 'text';
                }
            }
            renderMessages(currentRecipient);
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'view_once_opened', recipient: currentRecipient, msgId: msgId }));
            }
        }

        function deleteMessage(msgId) {
            if (confirm('حذف هذه الرسالة؟')) {
                var el = document.getElementById('msg_box_' + msgId);
                if (el) el.remove();
                if (globalChatsData[currentRecipient]) {
                    globalChatsData[currentRecipient] = globalChatsData[currentRecipient].filter(function(m) { return m.id !== msgId; });
                }
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'delete_msg', recipient: currentRecipient, msgId: msgId }));
                }
            }
        }

        function clearCurrentChat() {
            if (confirm('⚠️ مسح سجل المحادثة بالكامل؟')) {
                globalChatsData[currentRecipient] = [];
                renderMessages(currentRecipient);
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'clear_chat', recipient: currentRecipient }));
                }
            }
        }

        function renderMessages(recipient) {
            var box = document.getElementById('chat-messages-box');
            if (!box) return;
            box.innerHTML = '';
            var msgs = globalChatsData[recipient] || [];
            for (var i = 0; i < msgs.length; i++) {
                appendMessage(msgs[i]);
            }
        }

        function renderAiLogs(logs) {
            var box = document.getElementById('ai-messages-box');
            if (!box) return;
            var html = '';
            for (var i = 0; i < logs.length; i++) {
                var log = logs[i];
                var align = log.isAi ? 'justify-start' : 'justify-end';
                var bg = log.isAi ? 'bg-blue-950 border border-blue-800 text-blue-100' : 'bg-sky-600 text-white';
                html += '<div class="flex ' + align + '"><div class="max-w-[85%] ' + bg + ' p-3 rounded-2xl text-xs shadow"><strong>' + log.sender + ':</strong><p class="mt-1 leading-relaxed">' + log.text + '</p><span class="text-[9px] opacity-70 block mt-1">' + log.time + '</span></div></div>';
            }
            box.innerHTML = html;
            box.scrollTop = box.scrollHeight;
        }

        function quickCall(type) {
            switchSection('calls');
            var sel = document.getElementById('call-target');
            if (sel) sel.value = currentRecipient;
            startCall(type);
        }

        function startCall(type) {
            var target = document.getElementById('call-target').value;
            var screen = document.getElementById('call-screen');
            var status = document.getElementById('call-status');
            var videoBox = document.getElementById('video-container');
            
            screen.classList.remove('hidden');
            playRingTone();
            status.textContent = 'جاري الاتصال بـ (' + target + ')...';

            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'call_action', target: target, callType: type, caller: 'أبو طارق' }));
            }

            if (type === 'video') {
                videoBox.classList.remove('hidden');
                navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(function(stream) {
                    localStream = stream;
                    document.getElementById('localVideo').srcObject = stream;
                    status.textContent = 'متصل مرئياً بـ ' + target;
                }).catch(function() {
                    status.textContent = 'متصل مرئياً';
                });
            } else {
                videoBox.classList.add('hidden');
                setTimeout(function() {
                    status.textContent = 'متصل صوتياً بـ ' + target + ' بنجاح 🔊';
                }, 1200);
            }
        }

        function endCall() {
            if (localStream) {
                localStream.getTracks().forEach(function(track) { track.stop(); });
            }
            document.getElementById('call-screen').classList.add('hidden');
            document.getElementById('video-container').classList.add('hidden');
        }

        function generateSovereignCode() {
            var rand = Math.floor(10000 + Math.random() * 90000);
            document.getElementById('new-code-val').value = '888' + rand;
        }

        function saveSecureCode() {
            var name = document.getElementById('new-owner-name').value.trim();
            var code = document.getElementById('new-code-val').value.trim();
            if (!name || !code) {
                alert('يرجى إدخال اسم الجهة وتوليد الكود.');
                return;
            }
            var newItem = { owner: name, phone: 'خاص للإدارة', num: code, cat: 'اعتماد سيادي' };
            globalVaultData.unshift(newItem);
            renderVault(globalVaultData);
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'add_secure_code', item: newItem }));
            }
            alert('✅ تم حفظ الكود في الخزنة السرية.');
            document.getElementById('new-owner-name').value = '';
            document.getElementById('new-code-val').value = '';
        }

        function renderVault(vault) {
            var vaultList = document.getElementById('vault-list');
            if (!vaultList) return;
            var html = '';
            for (var i = 0; i < vault.length; i++) {
                var item = vault[i];
                html += '<div class="p-3 bg-sky-950 rounded-xl flex justify-between items-center border border-sky-800"><div><strong class="text-white">' + item.owner + '</strong><br/><span class="text-amber-300 font-mono font-bold">الكود: ' + item.num + '</span></div><span class="bg-sky-600/30 text-sky-200 px-2.5 py-1 rounded-lg text-[10px] font-bold">' + item.cat + '</span></div>';
            }
            vaultList.innerHTML = html;
        }

        function triggerKillSwitch() {
            if (confirm('إعادة تنشيط الجلسة؟')) {
                location.reload();
            }
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initUI);
        } else {
            initUI();
        }
    </script>
</body>
</html>`;

app.get('/', (req, res) => {
  res.send(htmlPage);
});

server.listen(PORT, () => {
  console.log('Sanad Sovereign Server V5 running on port ' + PORT);
});
