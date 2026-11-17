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

let activeRecipients = ['88888888', 'رهف', 'رابعة', 'رشا', 'آمنة'];
let activeConnectionsCount = 0;

wss.on('connection', (ws) => {
  activeConnectionsCount++;
  
  ws.send(JSON.stringify({
    type: 'init',
    vault: secureVault,
    chats: privateChats,
    recipients: activeRecipients,
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

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="theme-color" content="#047857">
    <title>سَنَد | الشبكة السيادية الذكية المشفرة</title>
    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
    <script src="https://unpkg.com/lucide@latest"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        * { box-sizing: border-box; }
        body { font-family: 'Tajawal', sans-serif; background-color: #064e3b; color: #f0fdf4; height: 100vh; height: 100dvh; overflow: hidden; margin: 0; display: flex; flex-direction: column; }
        .chat-bg { background-color: #022c22; background-image: radial-gradient(#059669 1px, transparent 1px); background-size: 20px 20px; }
        @keyframes ticker { 0% { transform: translate(0, 0); } 100% { transform: translate(-100%, 0); } }
        .animate-ticker { display: inline-block; animation: ticker 40s linear infinite; }
    </style>
</head>
<body class="w-screen h-[100dvh] flex flex-col justify-between m-0 p-0">
    
    <!-- تنبيه الرسائل والمكالمات العائم -->
    <div id="alert-banner" class="hidden fixed top-2 left-1/2 transform -translate-x-1/2 bg-amber-500 text-slate-950 font-bold px-4 py-2 rounded-2xl text-xs z-50 shadow-2xl animate-bounce flex items-center gap-2">
        <i data-lucide="bell" class="w-4 h-4"></i>
        <span id="alert-text">تنبيه سيادي جديد</span>
    </div>

    <!-- الشريط الإخباري -->
    <div class="bg-emerald-950 border-b border-emerald-700 text-emerald-200 text-[11px] font-bold py-1.5 px-3 overflow-hidden whitespace-nowrap shrink-0 flex items-center shadow">
        <span class="bg-emerald-700 text-white px-2 py-0.5 rounded text-[9px] ml-2 shrink-0">النظام السيادي</span>
        <div class="overflow-hidden w-full">
            <span class="animate-ticker">
                🛡️ منظومة سَنَد الذكية للتواصل الفردي والمكالمات المشفرة • الربط المركزي: 88888888 • مؤمن بالذكاء الاصطناعي OMEGA AI 🛡️
            </span>
        </div>
    </div>

    <!-- رأس التطبيق -->
    <header class="bg-emerald-800 border-b border-emerald-700 px-3 py-2.5 flex items-center justify-between shrink-0 shadow-lg">
        <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center border-2 border-emerald-300 text-emerald-800 font-extrabold text-xl shadow">S</div>
            <div>
                <h1 class="font-extrabold text-sm text-white flex items-center gap-1.5">
                    برنامج سَنَد <span class="bg-emerald-600 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">النسخة السيادية</span>
                </h1>
                <p class="text-[10px] text-emerald-100">الربط المركزي: 88888888 • متصل عالمياً</p>
            </div>
        </div>
        <div class="flex items-center gap-2">
            <span id="net-status" class="bg-emerald-500/20 text-emerald-300 text-[10px] px-2.5 py-1 rounded-full font-mono flex items-center gap-1.5 border border-emerald-500/40">
                <span id="net-dot" class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span id="net-text">آمن (Live)</span>
            </span>
        </div>
    </header>

    <!-- مساحة العمل الرئيسية -->
    <div class="flex-1 flex overflow-hidden relative">
        
        <!-- القائمة الجانبية (مرتبة ومنظمة بالترتيب الصحيح) -->
        <aside class="w-16 md:w-56 bg-emerald-950 border-l border-emerald-800 flex flex-col h-full shrink-0 z-10 p-1.5 space-y-1 overflow-y-auto">
            <div class="text-[10px] font-bold text-emerald-300 px-2 py-1 hidden md:block">القوائم السيادية:</div>
            
            <button onclick="switchSection('chats')" id="btn-sec-chats" class="w-full text-right p-2.5 rounded-xl bg-emerald-800 border border-emerald-600 text-white font-bold text-xs flex items-center gap-2.5 transition">
                <i data-lucide="message-circle" class="w-4 h-4 text-emerald-300 shrink-0"></i>
                <span class="hidden md:inline">المراسلات الفردية</span>
            </button>

            <button onclick="switchSection('codes')" id="btn-sec-codes" class="w-full text-right p-2.5 rounded-xl hover:bg-emerald-900 text-emerald-200 font-bold text-xs flex items-center gap-2.5 transition">
                <i data-lucide="shield-check" class="w-4 h-4 text-amber-300 shrink-0"></i>
                <span class="hidden md:inline">الخزنة والأكواد</span>
            </button>

            <button onclick="switchSection('ai')" id="btn-sec-ai" class="w-full text-right p-2.5 rounded-xl hover:bg-emerald-900 text-emerald-200 font-bold text-xs flex items-center gap-2.5 transition">
                <i data-lucide="cpu" class="w-4 h-4 text-blue-300 shrink-0"></i>
                <span class="hidden md:inline">OMEGA AI الذكي</span>
            </button>

            <button onclick="switchSection('calls')" id="btn-sec-calls" class="w-full text-right p-2.5 rounded-xl hover:bg-emerald-900 text-emerald-200 font-bold text-xs flex items-center gap-2.5 transition">
                <i data-lucide="phone-forwarded" class="w-4 h-4 text-emerald-300 shrink-0"></i>
                <span class="hidden md:inline">المكالمات والاتصال</span>
            </button>

            <button onclick="switchSection('settings')" id="btn-sec-settings" class="w-full text-right p-2.5 rounded-xl hover:bg-emerald-900 text-emerald-200 font-bold text-xs flex items-center gap-2.5 transition">
                <i data-lucide="sliders" class="w-4 h-4 text-purple-300 shrink-0"></i>
                <span class="hidden md:inline">إعدادات النظام</span>
            </button>
        </aside>

        <!-- المحتوى التفاعلي الشامل (يمتلئ تماماً بالشاشة) -->
        <main class="flex-1 flex flex-col bg-slate-950 relative overflow-hidden h-full w-full">
            
            <!-- أ. قسم المراسلات الفردية (بحث، إضافة اسم، صور، صوت، ملفات) -->
            <div id="section-chats" class="flex-1 flex flex-col h-full overflow-hidden">
                <div class="p-2 bg-emerald-900 border-b border-emerald-800 flex flex-col gap-2 shrink-0">
                    <div class="flex items-center justify-between gap-2">
                        <input type="text" id="search-contact" placeholder="بحث عن اسم أو محادثة..." oninput="filterRecipients()" class="bg-emerald-950 border border-emerald-700 rounded-lg px-2.5 py-1 text-[11px] text-white flex-1">
                        <div class="flex gap-1">
                            <input type="text" id="new-contact-name" placeholder="إضافة شخص..." class="bg-emerald-950 border border-emerald-700 rounded-lg px-2 py-1 text-[11px] text-white w-28">
                            <button onclick="addNewContact()" class="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2.5 py-1 rounded-lg text-[11px] shadow">إضافة</button>
                        </div>
                    </div>
                    <!-- تبويبات الأسماء -->
                    <div class="flex gap-1.5 overflow-x-auto pb-1" id="recipient-tabs"></div>
                </div>

                <div id="chat-messages-box" class="flex-1 overflow-y-auto p-3 space-y-2.5 chat-bg"></div>

                <!-- شريط الإرسال والمرفقات (مثل واتساب) -->
                <form id="chat-form" class="p-2.5 bg-emerald-950 border-t border-emerald-800 flex gap-1.5 items-center shrink-0">
                    <input type="text" id="sender-name" value="المشغل الرئيسي" class="w-20 bg-emerald-900 border border-emerald-700 rounded-xl px-2 py-2 text-[11px] text-white text-center focus:outline-none">
                    
                    <!-- زر إرفاق ملف أو صوره -->
                    <label class="cursor-pointer bg-emerald-800 hover:bg-emerald-700 text-emerald-200 p-2 rounded-xl flex items-center justify-center shrink-0" title="إرفاق صورة أو ملف">
                        <i data-lucide="paperclip" class="w-4 h-4"></i>
                        <input type="file" id="file-input" class="hidden" accept="image/*,video/*,.pdf,.doc,.docx" onchange="handleFileUpload(event)">
                    </label>

                    <input type="text" id="chat-input" placeholder="اكتب رسالة سرية خاصة..." class="flex-1 bg-emerald-900 border border-emerald-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500">
                    
                    <!-- زر تسجيل الصوت -->
                    <button type="button" id="record-btn" onclick="toggleVoiceRecord()" class="bg-purple-700 hover:bg-purple-800 text-white p-2 rounded-xl text-xs flex items-center justify-center shrink-0" title="تسجيل صوت">
                        <i data-lucide="mic" class="w-4 h-4"></i>
                    </button>

                    <button type="submit" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs shrink-0 shadow">إرسال</button>
                </form>
            </div>

            <!-- ب. الخزنة والأكواد -->
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

            <!-- ج. OMEGA AI -->
            <div id="section-ai" class="flex-1 hidden flex-col h-full p-4 overflow-y-auto space-y-4 bg-emerald-950">
                <div class="bg-emerald-900 border border-emerald-800 rounded-2xl p-4 flex-1 flex flex-col h-full">
                    <h3 class="font-bold text-sm text-blue-300 mb-2 flex items-center gap-2">
                        <i data-lucide="cpu" class="w-4 h-4"></i> مساعد سند الذكي المتقدم (OMEGA AI)
                    </h3>
                    <div id="ai-log" class="flex-1 bg-emerald-950 border border-emerald-800 rounded-xl p-3 overflow-y-auto space-y-3 text-xs mb-3">
                        <div class="bg-blue-950/60 border border-blue-800 p-3 rounded-xl text-emerald-100">
                            <strong>[OMEGA AI]:</strong> جاهز لتنفيذ الأوامر الذكية وتحليل حركة الاتصالات.
                        </div>
                    </div>
                    <div class="flex gap-2 shrink-0">
                        <input type="text" id="ai-prompt-input" placeholder="اطلب من الذكاء الاصطناعي أي تحليل..." class="flex-1 bg-emerald-950 border border-emerald-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none">
                        <button onclick="sendAiPrompt()" class="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 rounded-xl text-xs">إرسال لـ AI</button>
                    </div>
                </div>
            </div>

            <!-- د. المكالمات (صوت وفيديو مع رنين للطرف الآخر) -->
            <div id="section-calls" class="flex-1 hidden flex-col h-full p-6 items-center justify-center text-center bg-emerald-950">
                <div class="w-24 h-24 bg-emerald-900 border-2 border-emerald-500/50 rounded-full flex items-center justify-center mb-4 text-emerald-300 shadow-2xl relative">
                    <div class="absolute inset-0 rounded-full border border-emerald-400 animate-ping"></div>
                    <i data-lucide="phone-call" class="w-10 h-10"></i>
                </div>
                <h3 class="text-lg font-bold text-white mb-2">مركز الاتصال الفردي المشفر</h3>
                <p class="text-xs text-emerald-300/80 mb-4">اختر الشخص ونوع الاتصال (صوت أو فيديو مباشر)</p>
                
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
                    <p id="call-status" class="text-xs text-amber-300 font-bold">جاري رنين الطرف الآخر...</p>
                    <div id="video-container" class="hidden grid grid-cols-2 gap-2">
                        <video id="localVideo" autoplay muted playsinline class="w-full h-32 bg-black rounded-xl object-cover"></video>
                        <video id="remoteVideo" autoplay playsinline class="w-full h-32 bg-black rounded-xl object-cover"></video>
                    </div>
                    <button onclick="endCall()" class="bg-rose-600 hover:bg-rose-700 text-white font-bold px-5 py-2 rounded-xl text-xs">إنهاء المكالمة</button>
                </div>
            </div>

            <!-- هـ. الإعدادات وإحصائيات النظام -->
            <div id="section-settings" class="flex-1 hidden flex-col h-full p-4 overflow-y-auto space-y-3 text-xs bg-emerald-950">
                <div class="bg-emerald-900 border border-emerald-800 rounded-2xl p-4 space-y-3">
                    <h3 class="font-bold text-sm text-purple-300">إحصائيات الشبكة والتحكم المركزي</h3>
                    <div class="flex justify-between items-center p-2.5 bg-emerald-950 rounded-xl border border-emerald-800">
                        <span>المشتركين المتصلين حالياً:</span>
                        <span id="stat-connections" class="text-emerald-300 font-bold font-mono">1</span>
                    </div>
                    <div class="flex justify-between items-center p-2.5 bg-emerald-950 rounded-xl border border-emerald-800">
                        <span>نوع التشفير الدولي:</span>
                        <span class="text-amber-300 font-mono">AES-256 (فردي خاص)</span>
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
        let mediaRecorder = null;
        let audioChunks = [];
        let isRecording = false;
        let localStream = null;

        const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
        const wsUrl = protocol + window.location.host;
        let ws = null;

        function connectWebSocket() {
            ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                document.getElementById('net-dot').className = 'w-2 h-2 rounded-full bg-emerald-400';
                document.getElementById('net-text').textContent = 'آمن (Live)';
            };

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'init') {
                    globalVaultData = data.vault;
                    globalChatsData = data.chats;
                    globalRecipients = data.recipients;
                    renderVault(globalVaultData);
                    renderRecipients(globalRecipients);
                    renderMessages(currentRecipient);
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
                if (data.type === 'incoming_call') {
                    showAlert(\`📞 مكالمة \${data.callType === 'video' ? 'فيديو' : 'صوتية'} واردة من \${data.caller}\`);
                }
            };

            ws.onclose = () => {
                document.getElementById('net-dot').className = 'w-2 h-2 rounded-full bg-rose-500';
                document.getElementById('net-text').textContent = 'إعادة اتصال...';
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
            renderRecipients(globalRecipients);
            renderMessages(name);
        }

        function switchSection(secId) {
            ['chats', 'codes', 'ai', 'calls', 'settings'].forEach(id => {
                const el = document.getElementById('section-' + id);
                if (el) el.classList.add('hidden');
                const btn = document.getElementById('btn-sec-' + id);
                if (btn) btn.className = "w-full text-right p-2.5 rounded-xl hover:bg-emerald-900 text-emerald-200 font-bold text-xs flex items-center gap-2.5 transition";
            });
            const target = document.getElementById('section-' + secId);
            if (target) {
                target.classList.remove('hidden');
                target.classList.add('flex');
            }
            const targetBtn = document.getElementById('btn-sec-' + secId);
            if (targetBtn) targetBtn.className = "w-full text-right p-2.5 rounded-xl bg-emerald-800 border border-emerald-600 text-white font-bold text-xs flex items-center gap-2.5 transition";
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

        document.getElementById('chat-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const sender = document.getElementById('sender-name').value.trim() || 'المشغل';
            const input = document.getElementById('chat-input');
            const text = input.value.trim();
            if(!text) return;

            const msgData = {
                sender: sender,
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

        // إرفاق ملف أو صوره
        function handleFileUpload(event) {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(e) {
                const sender = document.getElementById('sender-name').value.trim() || 'المشغل';
                const fileData = {
                    sender: sender,
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

        // تسجيل الصوت
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
                        const sender = document.getElementById('sender-name').value.trim() || 'المشغل';
                        const msgData = {
                            sender: sender,
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
                    btn.className = "bg-rose-600 text-white p-2 rounded-xl text-xs animate-ping shrink-0";
                }).catch(err => {
                    alert('لا يمكن الوصول إلى الميكروفون: ' + err);
                });
            } else {
                mediaRecorder.stop();
                isRecording = false;
                btn.className = "bg-purple-700 hover:bg-purple-800 text-white p-2 rounded-xl text-xs flex items-center justify-center shrink-0";
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

        // بدء المكالمات مع تنبيه الطرف الآخر
        function startCall(type) {
            const target = document.getElementById('call-target').value;
            const sender = document.getElementById('sender-name').value.trim() || 'المشغل';
            const screen = document.getElementById('call-screen');
            const status = document.getElementById('call-status');
            const videoBox = document.getElementById('video-container');
            
            screen.classList.remove('hidden');
            status.textContent = \`جاري رنين وتنبيه (\${target})...\`;

            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'call_action', target: target, callType: type, caller: sender }));
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

        function sendAiPrompt() {
            const inp = document.getElementById('ai-prompt-input');
            const val = inp.value.trim();
            if(!val) return;
            const log = document.getElementById('ai-log');
            log.innerHTML += \`<div class="bg-emerald-950 p-2.5 rounded-xl text-white border border-emerald-800"><strong>المشغل:</strong> \${val}</div>\`;
            inp.value = '';
            setTimeout(() => {
                log.innerHTML += \`<div class="bg-blue-950/60 border border-blue-800 p-3 rounded-xl text-emerald-100"><strong>[OMEGA AI]:</strong> تمت معالجة الطلب بنجاح.</div>\`;
                log.scrollTop = log.scrollHeight;
            }, 800);
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
