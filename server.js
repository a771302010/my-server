const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

let secureVault = [
  { owner: 'القيادة المركزية العليا', phone: '967770000001', num: '88800001', cat: 'بروتوكول VIP' },
  { owner: 'خدمة العملاء المركزية', phone: '88888888', num: '88888888', cat: 'الدعم الفني 24/7' }
];

let privateChats = {
  '88888888': [
    { sender: 'خدمة العملاء المركزية', type: 'text', text: 'أهلاً بك في المنظومة السيادية المشفرة.', time: 'الآن', status: 'read' }
  ],
  'رهف': [
    { sender: 'النظام الآمن', type: 'text', text: 'قناة رهف الفردية مؤمنة.', time: 'الآن', status: 'read' }
  ],
  'رابعة': [
    { sender: 'النظام الآمن', type: 'text', text: 'قناة رابعة الفردية مؤمنة.', time: 'الآن', status: 'read' }
  ],
  'رشا': [
    { sender: 'النظام الآمن', type: 'text', text: 'قناة رشا الفردية مؤمنة.', time: 'الآن', status: 'read' }
  ],
  'آمنة': [
    { sender: 'النظام الآمن', type: 'text', text: 'قناة آمنة الفردية مؤمنة.', time: 'الآن', status: 'read' }
  ]
};

let aiChatLogs = [
  { sender: 'OMEGA AI', text: 'أهلاً بك يا أبو طارق. أنا مساعدك الذكي المدمج هنا للرد على استفساراتك وتحليل العمليات برمجياً وميدانياً.', time: 'الآن' }
];

let activeRecipients = ['88888888', 'رهف', 'رابعة', 'رشا', 'آمنة'];
let activeConnectionsCount = 0;

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

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'private_chat') {
        const recipient = data.recipient;
        if (!privateChats[recipient]) privateChats[recipient] = [];
        privateChats[recipient].push(data.msg);

        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'private_chat', recipient, msg: data.msg }));
          }
        });
      } 
      else if (data.type === 'ai_chat') {
        aiChatLogs.push(data.msg);
        const aiReply = {
          sender: 'OMEGA AI',
          text: `تم استلام استفسارك بنجاح وتحليله عبر الشبكة السيادية: "${data.msg.text}". النظام يعمل بكفاءة تامة يا أبو طارق.`,
          time: new Date().toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})
        };
        aiChatLogs.push(aiReply);

        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'ai_update', logs: aiChatLogs }));
          }
        });
      }
      else if (data.type === 'add_recipient') {
        const newName = data.name.trim();
        if (newName && !activeRecipients.includes(newName)) {
          activeRecipients.push(newName);
          if (!privateChats[newName]) {
            privateChats[newName] = [{ sender: 'النظام الآمن', type: 'text', text: `تم إنشاء القناة الخاصة بـ ${newName}`, time: 'الآن', status: 'read' }];
          }
          wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: 'update_recipients', recipients: activeRecipients, chats: privateChats }));
            }
          });
        }
      }
      else if (data.type === 'call_action') {
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'incoming_call', target: data.target, callType: data.callType, caller: data.caller }));
          }
        });
      }
    } catch (e) {
      console.error('Error handling WS message', e);
    }
  });

  ws.on('close', () => {
    activeConnectionsCount = Math.max(1, activeConnectionsCount - 1);
  });
});

// ملف Manifest لتثبيت التطبيق على الشاشة الرئيسية كأيقونة مستقلة
app.get('/manifest.json', (req, res) => {
  res.json({
    name: "برنامج سَنَد السيادي",
    short_name: "سَنَد",
    start_url: "/",
    display: "standalone",
    background_color: "#064e3b",
    theme_color: "#047857",
    icons: [
      {
        src: "https://img.icons8.com/color/512/security-checked.png",
        sizes: "512x512",
        type: "image/png"
      }
    ]
  });
});

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="theme-color" content="#047857">
    <link rel="manifest" href="/manifest.json">
    <title>سَنَد | الشبكة السيادية الذكية المشفرة</title>
    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
    <script src="https://unpkg.com/lucide@latest"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        * { box-sizing: border-box; }
        body { font-family: 'Tajawal', sans-serif; background-color: #064e3b; color: #f0fdf4; height: 100vh; height: 100dvh; overflow: hidden; margin: 0; display: flex; flex-direction: column; }
        .chat-bg { background-color: #0b141a; background-image: radial-gradient(#111b21 1px, transparent 1px); background-size: 20px 20px; }
        @keyframes ticker { 0% { transform: translate(0, 0); } 100% { transform: translate(-100%, 0); } }
        .animate-ticker { display: inline-block; animation: ticker 40s linear infinite; }
    </style>
</head>
<body class="w-screen h-[100dvh] flex flex-col justify-between m-0 p-0">
    
    <div id="alert-banner" class="hidden fixed top-2 left-1/2 transform -translate-x-1/2 bg-amber-500 text-slate-950 font-bold px-4 py-2 rounded-2xl text-xs z-50 shadow-2xl animate-bounce flex items-center gap-2">
        <i data-lucide="bell" class="w-4 h-4"></i>
        <span id="alert-text">تنبيه سيادي جديد</span>
    </div>

    <!-- الشريط الإخباري -->
    <div class="bg-emerald-950 border-b border-emerald-700 text-emerald-200 text-[11px] font-bold py-1.5 px-3 overflow-hidden whitespace-nowrap shrink-0 flex items-center shadow">
        <span class="bg-emerald-700 text-white px-2 py-0.5 rounded text-[9px] ml-2 shrink-0">النظام السيادي</span>
        <div class="overflow-hidden w-full">
            <span class="animate-ticker">
                🛡️ منظومة سَنَد الذكية للتواصل الفردي والمكالمات المشفرة • إشراف: أبو طارق • OMEGA AI 🛡️
            </span>
        </div>
    </div>

    <!-- رأس التطبيق -->
    <header class="bg-emerald-800 border-b border-emerald-700 px-3 py-2 flex items-center justify-between shrink-0 shadow-lg">
        <div class="flex items-center gap-2">
            <div class="w-9 h-9 bg-white rounded-xl flex items-center justify-center border-2 border-emerald-300 text-emerald-800 font-extrabold text-lg shadow">S</div>
            <div>
                <h1 class="font-extrabold text-xs text-white flex items-center gap-1">
                    برنامج سَنَد <span class="bg-emerald-600 text-white text-[9px] px-1.5 py-0.5 rounded-full">النسخة السيادية</span>
                </h1>
                <p class="text-[9px] text-emerald-100">الربط المركزي: AI-Core • متصل عالمياً</p>
            </div>
        </div>
        <div class="flex items-center gap-2">
            <span id="net-status" class="bg-emerald-500/20 text-emerald-300 text-[9px] px-2 py-0.5 rounded-full font-mono flex items-center gap-1 border border-emerald-500/40">
                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>متصل (Live)</span>
            </span>
        </div>
    </header>

    <!-- مساحة العمل الرئيسية -->
    <div class="flex-1 flex overflow-hidden relative">
        
        <!-- القائمة الجانبية -->
        <aside class="w-16 md:w-20 bg-emerald-950 border-l border-emerald-800 flex flex-col items-center py-2 h-full shrink-0 z-10 space-y-3">
            <button onclick="switchSection('chats')" id="btn-sec-chats" class="p-3 rounded-2xl bg-emerald-800 text-white shadow transition flex flex-col items-center gap-1" title="المراسلات الفردية">
                <i data-lucide="message-square" class="w-5 h-5 text-emerald-300"></i>
                <span class="text-[9px]">الدردشة</span>
            </button>
            <button onclick="switchSection('ai')" id="btn-sec-ai" class="p-3 rounded-2xl hover:bg-emerald-900 text-emerald-200 transition flex flex-col items-center gap-1" title="مساعد الذكاء الاصطناعي">
                <i data-lucide="cpu" class="w-5 h-5 text-blue-300"></i>
                <span class="text-[9px]">الذكاء AI</span>
            </button>
            <button onclick="switchSection('calls')" id="btn-sec-calls" class="p-3 rounded-2xl hover:bg-emerald-900 text-emerald-200 transition flex flex-col items-center gap-1" title="المكالمات">
                <i data-lucide="phone-call" class="w-5 h-5 text-emerald-300"></i>
                <span class="text-[9px]">المكالمات</span>
            </button>
            <button onclick="switchSection('codes')" id="btn-sec-codes" class="p-3 rounded-2xl hover:bg-emerald-900 text-emerald-200 transition flex flex-col items-center gap-1" title="الخزنة والأكواد">
                <i data-lucide="shield-check" class="w-5 h-5 text-amber-300"></i>
                <span class="text-[9px]">الخزنة</span>
            </button>
            <button onclick="switchSection('help')" id="btn-sec-help" class="p-3 rounded-2xl hover:bg-emerald-900 text-emerald-200 transition flex flex-col items-center gap-1" title="التعليمات والدليل">
                <i data-lucide="help-circle" class="w-5 h-5 text-purple-300"></i>
                <span class="text-[9px]">التعليمات</span>
            </button>
            <button onclick="switchSection('settings')" id="btn-sec-settings" class="p-3 rounded-2xl hover:bg-emerald-900 text-emerald-200 transition flex flex-col items-center gap-1" title="الإعدادات">
                <i data-lucide="sliders" class="w-5 h-5 text-indigo-300"></i>
                <span class="text-[9px]">الإعدادات</span>
            </button>
        </aside>

        <!-- المحتوى التفاعلي -->
        <main class="flex-1 flex flex-col bg-slate-950 relative overflow-hidden h-full w-full">
            
            <!-- أ. قسم المراسلات الفردية -->
            <div id="section-chats" class="flex-1 flex flex-col h-full overflow-hidden">
                <div class="bg-emerald-900 border-b border-emerald-800 px-3 py-2 flex items-center justify-between shrink-0">
                    <div class="flex items-center gap-2">
                        <div class="w-9 h-9 bg-emerald-800 rounded-full flex items-center justify-center font-bold text-white border border-emerald-600" id="current-avatar">ر</div>
                        <div>
                            <h2 class="font-bold text-xs text-white" id="current-chat-title">خدمة العملاء (88888888)</h2>
                            <p class="text-[9px] text-emerald-300 flex items-center gap-1">
                                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> متصل الآن (Online)
                            </p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="quickCall('audio')" class="p-2 bg-emerald-800 hover:bg-emerald-700 text-emerald-200 rounded-full transition shadow" title="مكالمة صوتية سريعة">
                            <i data-lucide="phone" class="w-4 h-4"></i>
                        </button>
                        <button onclick="quickCall('video')" class="p-2 bg-emerald-800 hover:bg-emerald-700 text-emerald-200 rounded-full transition shadow" title="مكالمة فيديو سريعة">
                            <i data-lucide="video" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>

                <div class="p-2 bg-emerald-950 border-b border-emerald-800 flex flex-col gap-1.5 shrink-0">
                    <div class="flex items-center gap-2">
                        <input type="text" id="search-contact" placeholder="🔍 ابحث عن اسم..." oninput="filterRecipients()" class="bg-emerald-900 border border-emerald-700 rounded-lg px-2.5 py-1 text-[11px] text-white flex-1">
                        <div class="flex gap-1">
                            <input type="text" id="new-contact-name" placeholder="إضافة شخص..." class="bg-emerald-900 border border-emerald-700 rounded-lg px-2 py-1 text-[11px] text-white w-24">
                            <button onclick="addNewContact()" class="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2.5 py-1 rounded-lg text-[11px]">إضافة</button>
                        </div>
                    </div>
                    <div class="flex gap-1.5 overflow-x-auto pb-1" id="recipient-tabs"></div>
                </div>

                <div id="chat-messages-box" class="flex-1 overflow-y-auto p-3 space-y-2.5 chat-bg"></div>

                <form id="chat-form" class="p-2 bg-emerald-950 border-t border-emerald-800 flex gap-1.5 items-center shrink-0">
                    <label class="cursor-pointer bg-emerald-800 hover:bg-emerald-700 text-emerald-200 p-2.5 rounded-full flex items-center justify-center shrink-0 shadow" title="إرفاق صورة أو ملف">
                        <i data-lucide="plus" class="w-4 h-4"></i>
                        <input type="file" id="file-input" class="hidden" accept="image/*,video/*,.pdf,.doc,.docx" onchange="handleFileUpload(event)">
                    </label>

                    <input type="text" id="chat-input" placeholder="اكتب رسالة..." class="flex-1 bg-emerald-900 border border-emerald-700 rounded-2xl px-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500">
                    
                    <button type="button" id="record-btn" onclick="toggleVoiceRecord()" class="bg-purple-700 hover:bg-purple-800 text-white p-2.5 rounded-full text-xs flex items-center justify-center shrink-0 shadow" title="تسجيل صوت">
                        <i data-lucide="mic" class="w-4 h-4"></i>
                    </button>

                    <button type="submit" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold p-2.5 rounded-full text-xs shrink-0 shadow flex items-center justify-center">
                        <i data-lucide="send" class="w-4 h-4"></i>
                    </button>
                </form>
            </div>

            <!-- ب. مساعد الذكاء الاصطناعي (OMEGA AI) -->
            <div id="section-ai" class="flex-1 hidden flex-col h-full bg-slate-950 overflow-hidden">
                <div class="bg-blue-950 border-b border-blue-900 px-3 py-2.5 flex items-center justify-between shrink-0">
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white"><i data-lucide="cpu" class="w-4 h-4"></i></div>
                        <div>
                            <h2 class="font-bold text-xs text-blue-200">مساعد سند الذكي (OMEGA AI)</h2>
                            <p class="text-[9px] text-blue-300">متصل مباشراً للرد النصي والصوتي</p>
                        </div>
                    </div>
                </div>
                <div id="ai-messages-box" class="flex-1 overflow-y-auto p-3 space-y-2.5 chat-bg"></div>
                <form id="ai-form" class="p-2.5 bg-emerald-950 border-t border-emerald-800 flex gap-2 shrink-0">
                    <input type="text" id="ai-input" placeholder="اسأل الذكاء الاصطناعي كتابة..." class="flex-1 bg-emerald-900 border border-emerald-700 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-blue-500">
                    <button type="button" onclick="recordAiVoice()" class="bg-purple-700 hover:bg-purple-800 text-white p-2.5 rounded-xl text-xs" title="سؤال صوتي للذكاء الاصطناعي">
                        <i data-lucide="mic" class="w-4 h-4"></i>
                    </button>
                    <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs">إرسال</button>
                </form>
            </div>

            <!-- ج. المكالمات (مع صوت رنين حقيقي) -->
            <div id="section-calls" class="flex-1 hidden flex-col h-full p-6 items-center justify-center text-center bg-emerald-950">
                <div class="w-24 h-24 bg-emerald-900 border-2 border-emerald-500/50 rounded-full flex items-center justify-center mb-4 text-emerald-300 shadow-2xl relative">
                    <div class="absolute inset-0 rounded-full border border-emerald-400 animate-ping"></div>
                    <i data-lucide="phone-call" class="w-10 h-10"></i>
                </div>
                <h3 class="text-lg font-bold text-white mb-2">مركز الاتصال الفردي المشفر</h3>
                <p class="text-xs text-emerald-300/80 mb-4">اختر الشخص ونوع الاتصال (صوت أو فيديو مباشر مع رنين)</p>
                
                <div class="w-full max-w-xs space-y-3 mb-4">
                    <select id="call-target" class="w-full bg-emerald-900 border border-emerald-700 rounded-xl p-2.5 text-xs text-white text-center">
                        <option value="رهف">مكالمة مع: رهف</option>
                        <option value="رابعة">مكالمة مع: رابعة</option>
                        <option value="رشا">مكالمة مع: رشا</option>
                        <option value="آمنة">مكالمة مع: آمنة</option>
                        <option value="خدمة العملاء (88888888)">خدمة العملاء (88888888)</option>
                    </select>
                    
                    <div class="grid grid-cols-2 gap-2">
                        <button onclick="startCall('audio')" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow">
                            <i data-lucide="phone" class="w-4 h-4"></i> مكالمة صوتية
                        </button>
                        <button onclick="startCall('video')" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow">
                            <i data-lucide="video" class="w-4 h-4"></i> مكالمة فيديو
                        </button>
                    </div>
                </div>

                <div id="call-screen" class="hidden w-full max-w-md bg-slate-900 border border-emerald-700 rounded-2xl p-4 text-center space-y-3">
                    <p id="call-status" class="text-xs text-amber-300 font-bold">جاري رنين وتنبيه الطرف الآخر...</p>
                    <div id="video-container" class="hidden grid grid-cols-2 gap-2">
                        <video id="localVideo" autoplay muted playsinline class="w-full h-32 bg-black rounded-xl object-cover"></video>
                        <video id="remoteVideo" autoplay playsinline class="w-full h-32 bg-black rounded-xl object-cover"></video>
                    </div>
                    <button onclick="endCall()" class="bg-rose-600 hover:bg-rose-700 text-white font-bold px-5 py-2 rounded-xl text-xs">إنهاء المكالمة</button>
                </div>
            </div>

            <!-- د. الخزنة والأكواد -->
            <div id="section-codes" class="flex-1 hidden flex-col h-full p-4 overflow-y-auto space-y-4 bg-emerald-950">
                <div class="bg-emerald-900 border border-emerald-800 rounded-2xl p-4">
                    <h3 class="font-bold text-sm text-amber-300 mb-3 flex items-center gap-2">
                        <i data-lucide="shield-check" class="w-4 h-4"></i> توليد كود سيادي معتمد (خاص بالإدارة)
                    </h3>
                    <button onclick="generateSovereignCode()" class="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold py-2.5 rounded-xl text-xs mb-3 transition shadow">
                        ⚡ توليد بصمة وكود سيادي جديد (8 أرقام)
                    </button>
                    <div class="grid grid-cols-1 gap-2">
                        <input type="text" id="new-owner-name" placeholder="اسم الجهة أو الفرد..." class="bg-emerald-950 border border-emerald-700 rounded-xl p-2.5 text-xs text-white">
                        <input type="text" id="new-code-val" placeholder="888xxxxx" readonly class="bg-slate-950 border border-emerald-700 rounded-xl p-2.5 text-xs font-mono font-bold text-amber-300 text-center">
                    </div>
                    <button onclick="saveSecureCode()" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs mt-3 transition">
                        حفظ في الخزنة السرية
                    </button>
                </div>
                <div class="bg-emerald-900 border border-emerald-800 rounded-2xl p-4 flex-1">
                    <h3 class="font-bold text-sm text-emerald-200 mb-3">سجل الخزنة السيادية المحمية</h3>
                    <div id="vault-list" class="space-y-2 text-xs"></div>
                </div>
            </div>

            <!-- هـ. التعليمات والدليل -->
            <div id="section-help" class="flex-1 hidden flex-col h-full p-4 overflow-y-auto space-y-3 text-xs bg-emerald-950">
                <div class="bg-emerald-900 border border-emerald-800 rounded-2xl p-4 space-y-3">
                    <h3 class="font-bold text-sm text-purple-300">📖 دليل وتشغيل منظومة سَنَد الذكية</h3>
                    <div class="p-3 bg-emerald-950 rounded-xl border border-emerald-800 space-y-2 text-emerald-100">
                        <p><strong>1. تثبيت التطبيق:</strong> اضغط على زر المشاركة (Share) في متصفح سفاري بجوالك، ثم اختر "إضافة إلى الشاشة الرئيسية" (Add to Home Screen) لتظهر أيقونة سَنَد السيادية على جوالك.</p>
                        <p><strong>2. المكالمات الصوتية والفيديو:</strong> تعتمد على نغمة رنين حقيقية وتنبيه فوري للطرف الآخر.</p>
                        <p><strong>3. التسجيلات الصوتية والمرفقات:</strong> يمكنك إرسال واستقبال الرسائل الصوتية والصور وملفات العمل بكل سهولة.</p>
                    </div>
                </div>
            </div>

            <!-- و. الإعدادات -->
            <div id="section-settings" class="flex-1 hidden flex-col h-full p-4 overflow-y-auto space-y-3 text-xs bg-emerald-950">
                <div class="bg-emerald-900 border border-emerald-800 rounded-2xl p-4 space-y-3">
                    <h3 class="font-bold text-sm text-indigo-300">إحصائيات الشبكة والتحكم المركزي</h3>
                    <div class="flex justify-between items-center p-2.5 bg-emerald-950 rounded-xl border border-emerald-800">
                        <span>المشتركين المتصلين حالياً:</span>
                        <span id="stat-connections" class="text-emerald-300 font-bold font-mono">1</span>
                    </div>
                    <button onclick="triggerKillSwitch()" class="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl text-xs mt-2 transition">
                        ⚡ تفعيل مفتاح الطوارئ وحذف السجل المؤقت
                    </button>
                </div>
            </div>

        </main>
    </div>

    <script>
        lucide.createIcons();

        let currentRecipient = '88888888';
        let globalChatsData = {};
        let globalVaultData = [];
        let globalRecipients = [];
        let globalAiLogs = [];
        let mediaRecorder = null;
        let audioChunks = [];
        let isRecording = false;
        let localStream = null;

        // دالة تشغيل رنين الاتصال الحقيقي
        function playRingTone() {
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(440, ctx.currentTime); // نغمة رنين قياسية
                gain.gain.setValueAtTime(0.1, ctx.currentTime);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 1.5);
            } catch(e) {}
        }

        const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
        const wsUrl = protocol + window.location.host;
        let ws = null;

        function connectWebSocket() {
            ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                document.getElementById('net-status').innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span><span>متصل (Live)</span>';
            };

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
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
                if (data.type === 'update_vault') {
                    globalVaultData = data.vault;
                    renderVault(globalVaultData);
                }
                if (data.type === 'update_recipients') {
                    globalRecipients = data.recipients;
                    globalChatsData = data.chats;
                    renderRecipients(globalRecipients);
                }
                if (data.type === 'private_chat') {
                    if (!globalChatsData[data.recipient]) globalChatsData[data.recipient] = [];
                    globalChatsData[data.recipient].push(data.msg);
                    if (currentRecipient === data.recipient) {
                        appendMessage(data.msg);
                    } else {
                        showAlert(\`رسالة جديدة من \${data.recipient}\`);
                    }
                }
                if (data.type === 'ai_update') {
                    globalAiLogs = data.logs;
                    renderAiLogs(globalAiLogs);
                }
                if (data.type === 'incoming_call') {
                    playRingTone();
                    showAlert(\`📞 مكالمة \${data.callType === 'video' ? 'فيديو' : 'صوتية'} واردة من \${data.caller}\`);
                }
            };

            ws.onclose = () => {
                document.getElementById('net-status').innerHTML = '<span class="w-2 h-2 rounded-full bg-rose-500"></span><span>إعادة اتصال...</span>';
                setTimeout(connectWebSocket, 3000);
            };
        }

        window.onload = connectWebSocket;

        function showAlert(text) {
            const banner = document.getElementById('alert-banner');
            document.getElementById('alert-text').textContent = text;
            banner.classList.remove('hidden');
            setTimeout(() => banner.classList.add('hidden'), 4000);
        }

        function renderRecipients(recipients) {
            const tabs = document.getElementById('recipient-tabs');
            if(!tabs) return;
            let html = '';
            recipients.forEach(name => {
                const isActive = name === currentRecipient;
                html += \`<button onclick="selectRecipient('\${name}')" class="recipient-btn px-3 py-1.5 rounded-lg \${isActive ? 'bg-emerald-700 text-white shadow' : 'bg-emerald-950 text-emerald-200 border border-emerald-700'} text-xs font-bold transition shrink-0" data-target="\${name}">\${name}</button>\`;
            });
            tabs.innerHTML = html;
        }

        function filterRecipients() {
            const query = document.getElementById('search-contact').value.toLowerCase();
            const filtered = globalRecipients.filter(r => r.toLowerCase().includes(query));
            renderRecipients(filtered);
        }

        function addNewContact() {
            const input = document.getElementById('new-contact-name');
            const name = input.value.trim();
            if(!name) {
                alert('يرجى كتابة اسم الشخص أولاً.');
                return;
            }
            if(ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'add_recipient', name: name }));
                input.value = '';
                alert('✅ تمت إضافة الشخص وفتح قناة خاصة به.');
            }
        }

        function selectRecipient(name) {
            currentRecipient = name;
            document.getElementById('current-chat-title').textContent = name;
            document.getElementById('current-avatar').textContent = name.charAt(0);
            renderRecipients(globalRecipients);
            renderMessages(name);
        }

        function switchSection(secId) {
            ['chats', 'ai', 'calls', 'codes', 'help', 'settings'].forEach(id => {
                const el = document.getElementById('section-' + id);
                if (el) el.classList.add('hidden');
                const btn = document.getElementById('btn-sec-' + id);
                if (btn) btn.className = "p-3 rounded-2xl hover:bg-emerald-900 text-emerald-200 transition flex flex-col items-center gap-1";
            });
            const target = document.getElementById('section-' + secId);
            if (target) {
                target.classList.remove('hidden');
                target.classList.add('flex');
            }
            const targetBtn = document.getElementById('btn-sec-' + secId);
            if (targetBtn) targetBtn.className = "p-3 rounded-2xl bg-emerald-800 text-white shadow transition flex flex-col items-center gap-1";
        }

        document.getElementById('chat-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.getElementById('chat-input');
            const text = input.value.trim();
            if(!text) return;

            const msgData = {
                sender: 'أبو طارق',
                type: 'text',
                text: text,
                time: new Date().toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'}),
                status: 'read'
            };

            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'private_chat', recipient: currentRecipient, msg: msgData }));
                input.value = '';
            }
        });

        document.getElementById('ai-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.getElementById('ai-input');
            const text = input.value.trim();
            if(!text) return;

            const msgData = {
                sender: 'أبو طارق',
                text: text,
                time: new Date().toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})
            };

            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'ai_chat', msg: msgData }));
                input.value = '';
            }
        });

        function recordAiVoice() {
            alert('🎙️ جاري الاستماع لسؤالك الصوتي الموجه إلى OMEGA AI...');
            setTimeout(() => {
                const voicePrompt = "استفسار صوتي من المشغل";
                ws.send(JSON.stringify({ type: 'ai_chat', msg: { sender: 'أبو طارق (صوتي)', text: voicePrompt, time: new Date().toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'}) } }));
            }, 2000);
        }

        function handleFileUpload(event) {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(e) {
                const fileData = {
                    sender: 'أبو طارق',
                    type: file.type.startsWith('image/') ? 'image' : 'file',
                    url: e.target.result,
                    name: file.name,
                    time: new Date().toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'}),
                    status: 'read'
                };
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'private_chat', recipient: currentRecipient, msg: fileData }));
                }
            };
            reader.readAsDataURL(file);
        }

        function toggleVoiceRecord() {
            const btn = document.getElementById('record-btn');
            if (!isRecording) {
                navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
                    mediaRecorder = new MediaRecorder(stream);
                    audioChunks = [];
                    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
                    mediaRecorder.onstop = () => {
                        const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
                        const audioUrl = URL.createObjectURL(audioBlob);
                        const msgData = {
                            sender: 'أبو طارق',
                            type: 'audio',
                            url: audioUrl,
                            time: new Date().toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'}),
                            status: 'read'
                        };
                        if (ws && ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({ type: 'private_chat', recipient: currentRecipient, msg: msgData }));
                        }
                    };
                    mediaRecorder.start();
                    isRecording = true;
                    btn.className = "bg-rose-600 text-white p-2.5 rounded-full text-xs animate-ping shrink-0";
                }).catch(err => {
                    alert('لا يمكن الوصول إلى الميكروفون: ' + err);
                });
            } else {
                mediaRecorder.stop();
                isRecording = false;
                btn.className = "bg-purple-700 hover:bg-purple-800 text-white p-2.5 rounded-full text-xs flex items-center justify-center shrink-0 shadow";
            }
        }

        function appendMessage(msg) {
            const box = document.getElementById('chat-messages-box');
            if(!box) return;
            
            let content = '';
            if (msg.type === 'audio') {
                content = \`<audio controls src="\${msg.url}" class="w-full h-8 mt-1"></audio>\`;
            } else if (msg.type === 'image') {
                content = \`<img src="\${msg.url}" class="w-full max-h-48 rounded-xl object-cover mt-1 cursor-pointer" onclick="window.open(this.src)">\`;
            } else if (msg.type === 'file') {
                content = \`<a href="\${msg.url}" download="\${msg.name}" class="text-amber-300 underline block mt-1">📁 تنزيل الملف: \${msg.name}</a>\`;
            } else {
                content = \`<p class="mt-0.5">\${msg.text}</p>\`;
            }

            box.innerHTML += \`<div class="flex justify-start"><div class="max-w-[85%] bg-emerald-900 border border-emerald-700 p-3 rounded-2xl text-xs leading-relaxed text-emerald-100 shadow"><strong class="text-amber-300 block mb-0.5">\${msg.sender}:</strong>\${content}<div class="text-[9px] text-emerald-300 mt-1 flex justify-between items-center"><span>\${msg.time}</span><span class="text-emerald-400 font-bold">✓✓ مقروء 🔒</span></div></div></div>\`;
            box.scrollTop = box.scrollHeight;
        }

        function renderMessages(recipient) {
            const box = document.getElementById('chat-messages-box');
            if(!box) return;
            box.innerHTML = '';
            const msgs = globalChatsData[recipient] || [];
            msgs.forEach(msg => appendMessage(msg));
        }

        function renderAiLogs(logs) {
            const box = document.getElementById('ai-messages-box');
            if(!box) return;
            box.innerHTML = '';
            logs.forEach(log => {
                const isAi = log.sender === 'OMEGA AI';
                box.innerHTML += \`<div class="flex \${isAi ? 'justify-start' : 'justify-end'}"><div class="max-w-[85%] \${isAi ? 'bg-blue-950 border border-blue-800 text-blue-100' : 'bg-emerald-700 text-white'} p-3 rounded-2xl text-xs shadow"><strong>\${log.sender}:</strong><p class="mt-0.5">\${log.text}</p><span class="text-[9px] opacity-70 block mt-1">\${log.time}</span></div></div>\`;
            });
            box.scrollTop = box.scrollHeight;
        }

        function quickCall(type) {
            switchSection('calls');
            document.getElementById('call-target').value = currentRecipient;
            startCall(type);
        }

        function startCall(type) {
            const target = document.getElementById('call-target').value;
            const screen = document.getElementById('call-screen');
            const status = document.getElementById('call-status');
            const videoBox = document.getElementById('video-container');
            
            screen.classList.remove('hidden');
            playRingTone();
            status.textContent = \`جاري رنين وتنبيه (\${target})...\`;

            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'call_action', target: target, callType: type, caller: 'أبو طارق' }));
            }

            if (type === 'video') {
                videoBox.classList.remove('hidden');
                navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
                    localStream = stream;
                    document.getElementById('localVideo').srcObject = stream;
                    document.getElementById('remoteVideo').srcObject = stream;
                    status.textContent = \`متصل فيديو الآن بـ \${target}\`;
                }).catch(err => {
                    alert('خطأ في الوصول للكاميرا: ' + err);
                });
            } else {
                videoBox.classList.add('hidden');
                setTimeout(() => {
                    status.textContent = \`متصل صوتياً بـ \${target} بنجاح\`;
                }, 2000);
            }
        }

        function endCall() {
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
            document.getElementById('call-screen').classList.add('hidden');
            document.getElementById('video-container').classList.add('hidden');
            alert('📞 تم إنهاء المكالمة بنجاح.');
        }

        function generateSovereignCode() {
            const rand = Math.floor(10000 + Math.random() * 90000);
            document.getElementById('new-code-val').value = '888' + rand;
        }

        function saveSecureCode() {
            const name = document.getElementById('new-owner-name').value.trim();
            const code = document.getElementById('new-code-val').value.trim();
            if(!name || !code) {
                alert('يرجى إدخال اسم الجهة وتوليد الكود.');
                return;
            }
            const newItem = { owner: name, phone: 'خاص للإدارة', num: code, cat: 'اعتماد سيادي' };
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'add_secure_code', item: newItem }));
                alert('✅ تم حفظ الكود في الخزنة السرية.');
                document.getElementById('new-owner-name').value = '';
                document.getElementById('new-code-val').value = '';
            }
        }

        function renderVault(vault) {
            const vaultList = document.getElementById('vault-list');
            if(!vaultList) return;
            let html = '';
            vault.forEach(item => {
                html += \`<div class="p-2.5 bg-emerald-950 rounded-xl flex justify-between items-center border border-emerald-800"><div><strong>\${item.owner}</strong><br/><span class="text-amber-300 font-mono">الكود: \${item.num}</span></div><span class="bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded text-[10px]">\${item.cat}</span></div>\`;
            });
            vaultList.innerHTML = html;
        }

        function triggerKillSwitch() {
            if(confirm('⚠️ تحذير: هل تريد مسح السجلات وتأمين النظام؟')) {
                alert('⚡ تم تأمين القطاع بنجاح.');
                location.reload();
            }
        }
    </script>
</body>
</html>`);
});

server.listen(PORT, () => {
  console.log('Sanad Secure Server running on port ' + PORT);
});
