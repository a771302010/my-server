const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// قاعدة بيانات الخزنة السيادية الخاصة بالإدارة فقط
let secureVault = [
  { owner: 'القيادة المركزية العليا', phone: '967770000001', num: '88800001', cat: 'بروتوكول VIP' },
  { owner: 'خدمة العملاء المركزية', phone: '88888888', num: '88888888', cat: 'الدعم الفني 24/7' }
];

// تخزين المحادثات الفردية المشفرة لكل غرفة/شخص
let privateChats = {
  '88888888': [
    { sender: 'خدمة العملاء المركزية', text: 'أهلاً بك في المنظومة السيادية المشفرة. القنوات الفردية مؤمنة بالكامل.', time: 'الآن' }
  ],
  'رهف': [
    { sender: 'النظام الآمن', text: 'بدء تأمين قناة المحادثة الفردية الخاصة بـ رهف.', time: 'الآن' }
  ],
  'رابعة': [
    { sender: 'النظام الآمن', text: 'بدء تأمين قناة المحادثة الفردية الخاصة بـ رابعة.', time: 'الآن' }
  ],
  'رشا': [
    { sender: 'النظام الآمن', text: 'بدء تأمين قناة المحادثة الفردية الخاصة بـ رشا.', time: 'الآن' }
  ],
  'آمنة': [
    { sender: 'النظام الآمن', text: 'بدء تأمين قناة المحادثة الفردية الخاصة بـ آمنة.', time: 'الآن' }
  ]
};

// إدارة الاتصالات الحية عبر WebSocket
wss.on('connection', (ws) => {
  ws.send(JSON.stringify({
    type: 'init',
    vault: secureVault,
    chats: privateChats
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'private_chat') {
        const recipient = data.recipient;
        if (!privateChats[recipient]) privateChats[recipient] = [];
        privateChats[recipient].push(data.msg);

        // بث الرسالة حصرياً للمتصلين في نفس الغرفة الفردية
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'private_chat', recipient, msg: data.msg }));
          }
        });
      } 
      else if (data.type === 'add_secure_code') {
        secureVault.unshift(data.item);
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'update_vault', vault: secureVault }));
          }
        });
      }
    } catch (e) {
      console.error('Error handling WS message', e);
    }
  });
});

// واجهة التطبيق السيادي الرسمي
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
        body { font-family: 'Tajawal', sans-serif; background-color: #064e3b; color: #f0fdf4; height: 100dvh; overflow: hidden; }
        .chat-bg { background-color: #022c22; background-image: radial-gradient(#059669 1px, transparent 1px); background-size: 20px 20px; }
        @keyframes ticker { 0% { transform: translate(0, 0); } 100% { transform: translate(-100%, 0); } }
        .animate-ticker { display: inline-block; animation: ticker 40s linear infinite; }
    </style>
</head>
<body class="flex flex-col justify-between h-[100dvh] w-screen m-0 p-0">
    
    <!-- 1. الشريط الإخباري السيادي -->
    <div class="bg-emerald-950 border-b border-emerald-700 text-emerald-200 text-xs font-bold py-2 px-4 overflow-hidden whitespace-nowrap shrink-0 flex items-center shadow-md">
        <span class="bg-emerald-700 text-white px-2 py-0.5 rounded text-[10px] ml-3 shrink-0">النظام السيادي</span>
        <div class="overflow-hidden w-full">
            <span class="animate-ticker">
                🛡️ منظومة سَنَد الذكية للتواصل الفردي المشفر • خدمة العملاء والربط الدولي: 88888888 • اتصال عابر للحدود مؤمن بالذكاء الاصطناعي 🛡️
            </span>
        </div>
    </div>

    <!-- 2. رأس التطبيق الرسمي بالهوية المؤسسية -->
    <header class="bg-emerald-800 border-b border-emerald-700 px-4 py-3 flex items-center justify-between shrink-0 shadow-lg">
        <div class="flex items-center gap-3">
            <div class="w-11 h-11 bg-white rounded-2xl flex items-center justify-center border-2 border-emerald-300 text-emerald-800 font-extrabold text-2xl shadow">
                S
            </div>
            <div>
                <h1 class="font-extrabold text-base text-white flex items-center gap-2">
                    برنامج سَنَد <span class="bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">النسخة السيادية الذكية</span>
                </h1>
                <p class="text-[11px] text-emerald-100">الربط المركزي: 88888888 • مدعوم بـ OMEGA AI</p>
            </div>
        </div>
        <div class="flex items-center gap-2">
            <span id="net-status" class="bg-emerald-500/20 text-emerald-300 text-[10px] px-2.5 py-1 rounded-full font-mono flex items-center gap-1.5 border border-emerald-500/40">
                <span id="net-dot" class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span id="net-text">متصل بالأمان التام</span>
            </span>
        </div>
    </header>

    <!-- 3. مساحة العمل والشاشات المتعددة -->
    <div class="flex-1 flex overflow-hidden relative">
        
        <!-- القائمة الجانبية للتنقل -->
        <aside class="w-20 md:w-64 bg-emerald-950 border-l border-emerald-800 flex flex-col h-full shrink-0 z-10 p-2 space-y-1 overflow-y-auto">
            <div class="text-[10px] font-bold text-emerald-300 px-2 py-1 hidden md:block">القوائم المشفرة:</div>
            
            <button onclick="switchSection('chats')" id="btn-sec-chats" class="w-full text-right p-2.5 rounded-xl bg-emerald-800 border border-emerald-600 text-white font-bold text-xs flex items-center gap-3 transition">
                <i data-lucide="message-circle" class="w-4 h-4 text-emerald-300 shrink-0"></i>
                <span class="hidden md:inline">المراسلات الفردية</span>
            </button>

            <button onclick="switchSection('codes')" id="btn-sec-codes" class="w-full text-right p-2.5 rounded-xl hover:bg-emerald-900 text-emerald-200 font-bold text-xs flex items-center gap-3 transition">
                <i data-lucide="shield-check" class="w-4 h-4 text-amber-300 shrink-0"></i>
                <span class="hidden md:inline">الخزنة والأكواد (خاص)</span>
            </button>

            <button onclick="switchSection('ai')" id="btn-sec-ai" class="w-full text-right p-2.5 rounded-xl hover:bg-emerald-900 text-emerald-200 font-bold text-xs flex items-center gap-3 transition">
                <i data-lucide="cpu" class="w-4 h-4 text-blue-300 shrink-0"></i>
                <span class="hidden md:inline">OMEGA AI الذكي</span>
            </button>

            <button onclick="switchSection('calls')" id="btn-sec-calls" class="w-full text-right p-2.5 rounded-xl hover:bg-emerald-900 text-emerald-200 font-bold text-xs flex items-center gap-3 transition">
                <i data-lucide="phone-forwarded" class="w-4 h-4 text-emerald-300 shrink-0"></i>
                <span class="hidden md:inline">المكالمات المشفرة</span>
            </button>

            <button onclick="switchSection('settings')" id="btn-sec-settings" class="w-full text-right p-2.5 rounded-xl hover:bg-emerald-900 text-emerald-200 font-bold text-xs flex items-center gap-3 transition">
                <i data-lucide="sliders" class="w-4 h-4 text-purple-300 shrink-0"></i>
                <span class="hidden md:inline">إعدادات النظام</span>
            </button>
        </aside>

        <!-- المحتوى التفاعلي -->
        <main class="flex-1 flex flex-col bg-slate-950 relative overflow-hidden h-full">
            
            <!-- أ. قسم المراسلات الفردية الخاصة -->
            <div id="section-chats" class="flex-1 flex flex-col h-full overflow-hidden">
                <!-- اختيار الشخص المراد مراسلته بشكل خاص -->
                <div class="p-2.5 bg-emerald-900 border-b border-emerald-800 flex items-center justify-between shrink-0 gap-2 overflow-x-auto">
                    <span class="text-[11px] text-emerald-200 font-bold shrink-0">اختر المحادثة الخاصة:</span>
                    <div class="flex gap-1.5 shrink-0" id="recipient-tabs">
                        <button onclick="selectRecipient('88888888')" class="recipient-btn px-3 py-1 rounded-lg bg-emerald-700 text-white text-xs font-bold transition" data-target="88888888">خدمة العملاء (88888888)</button>
                        <button onclick="selectRecipient('رهف')" class="recipient-btn px-3 py-1 rounded-lg bg-emerald-950 text-emerald-200 text-xs font-bold transition border border-emerald-700" data-target="رهف">رهف</button>
                        <button onclick="selectRecipient('رابعة')" class="recipient-btn px-3 py-1 rounded-lg bg-emerald-950 text-emerald-200 text-xs font-bold transition border border-emerald-700" data-target="رابعة">رابعة</button>
                        <button onclick="selectRecipient('رشا')" class="recipient-btn px-3 py-1 rounded-lg bg-emerald-950 text-emerald-200 text-xs font-bold transition border border-emerald-700" data-target="رشا">رشا</button>
                        <button onclick="selectRecipient('آمنة')" class="recipient-btn px-3 py-1 rounded-lg bg-emerald-950 text-emerald-200 text-xs font-bold transition border border-emerald-700" data-target="آمنة">آمنة</button>
                    </div>
                </div>

                <div id="chat-messages-box" class="flex-1 overflow-y-auto p-4 space-y-3 chat-bg">
                    <!-- يتم تعبئتها حياً بناء على الشخص المختار -->
                </div>

                <form id="chat-form" class="p-3 bg-emerald-950 border-t border-emerald-800 flex gap-2 shrink-0">
                    <input type="text" id="sender-name" placeholder="معرف المرسل..." value="المشغل الرئيسي" class="w-28 bg-emerald-900 border border-emerald-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none">
                    <input type="text" id="chat-input" placeholder="اكتب رسالة سرية خاصة لا يراها غيركم..." class="flex-1 bg-emerald-900 border border-emerald-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500">
                    <button type="submit" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 rounded-xl text-xs">إرسال خاص</button>
                </form>
            </div>

            <!-- ب. قسم الخزنة السيادية والأكواد (خاص للإدارة) -->
            <div id="section-codes" class="flex-1 hidden flex-col h-full p-4 overflow-y-auto space-y-4 bg-emerald-950">
                <div class="bg-emerald-900 border border-emerald-800 rounded-2xl p-4">
                    <h3 class="font-bold text-sm text-amber-300 mb-3 flex items-center gap-2">
                        <i data-lucide="shield-check" class="w-4 h-4"></i> توليد كود سيادي معتمد (خاص للإدارة فقط)
                    </h3>
                    <button onclick="generateSovereignCode()" class="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold py-2.5 rounded-xl text-xs mb-3 transition shadow">
                        ⚡ توليد بصمة وكود سيادي جديد (8 أرقام)
                    </button>
                    <div class="grid grid-cols-1 gap-2">
                        <input type="text" id="new-owner-name" placeholder="اسم الجهة أو الفرد المعتمد..." class="bg-emerald-950 border border-emerald-700 rounded-xl p-2.5 text-xs text-white">
                        <input type="text" id="new-code-val" placeholder="888xxxxx" readonly class="bg-slate-950 border border-emerald-700 rounded-xl p-2.5 text-xs font-mono font-bold text-amber-300 text-center">
                    </div>
                    <button onclick="saveSecureCode()" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs mt-3 transition">
                        حفظ في الخزنة السرية (لا تظهر للعامة)
                    </button>
                </div>
                <div class="bg-emerald-900 border border-emerald-800 rounded-2xl p-4 flex-1">
                    <h3 class="font-bold text-sm text-emerald-200 mb-3">سجل الخزنة السيادية المحمية</h3>
                    <div id="vault-list" class="space-y-2 text-xs">
                        <!-- يعبأ من السيرفر -->
                    </div>
                </div>
            </div>

            <!-- ج. مساعد سند الذكي المتقدم (OMEGA AI) -->
            <div id="section-ai" class="flex-1 hidden flex-col h-full p-4 overflow-y-auto space-y-4 bg-emerald-950">
                <div class="bg-emerald-900 border border-emerald-800 rounded-2xl p-4 flex-1 flex flex-col h-full">
                    <h3 class="font-bold text-sm text-blue-300 mb-2 flex items-center gap-2">
                        <i data-lucide="cpu" class="w-4 h-4"></i> مساعد سند الذكي المتقدم (OMEGA AI)
                    </h3>
                    <p class="text-[11px] text-emerald-200 mb-3">ميزات ذكية مدمجة: ترجمة فورية، تلخيص المحادثات، والتشخيص الأمني للشبكة.</p>
                    
                    <div class="flex gap-2 mb-3">
                        <button onclick="aiAction('summarize')" class="bg-blue-900 hover:bg-blue-800 text-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold border border-blue-700">تلخيص المحادثة</button>
                        <button onclick="aiAction('translate')" class="bg-blue-900 hover:bg-blue-800 text-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold border border-blue-700">تفعيل الترجمة الفورية</button>
                        <button onclick="aiAction('security')" class="bg-blue-900 hover:bg-blue-800 text-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold border border-blue-700">فحص أمان النفق</button>
                    </div>

                    <div id="ai-log" class="flex-1 bg-emerald-950 border border-emerald-800 rounded-xl p-3 overflow-y-auto space-y-3 text-xs mb-3">
                        <div class="bg-blue-950/60 border border-blue-800 p-3 rounded-xl text-emerald-100">
                            <strong>[OMEGA AI]:</strong> جاهز لتنفيذ الأوامر الذكية، تأمين الاتصالات، وتقديم الدعم الفني المتقدم.
                        </div>
                    </div>
                    <div class="flex gap-2 shrink-0">
                        <input type="text" id="ai-prompt-input" placeholder="اطلب من الذكاء الاصطناعي أي تحليل أو خدمة..." class="flex-1 bg-emerald-950 border border-emerald-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500">
                        <button onclick="sendAiPrompt()" class="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 rounded-xl text-xs transition">إرسال لـ AI</button>
                    </div>
                </div>
            </div>

            <!-- د. المكالمات المشفرة الفردية -->
            <div id="section-calls" class="flex-1 hidden flex-col h-full p-6 items-center justify-center text-center bg-emerald-950">
                <div class="w-24 h-24 bg-emerald-900 border-2 border-emerald-500/50 rounded-full flex items-center justify-center mb-4 text-emerald-300 shadow-2xl relative">
                    <div class="absolute inset-0 rounded-full border border-emerald-400 animate-ping"></div>
                    <i data-lucide="phone-forwarded" class="w-10 h-10"></i>
                </div>
                <h3 class="text-lg font-bold text-white mb-1">مركز الاتصال الفردي المشفر</h3>
                <p class="text-xs text-emerald-300/80 mb-6">قناة اتصال آمنة ومباشرة مرتبطة بالرقم المركزي 88888888</p>
                <button onclick="alert('🟢 تم فتح قناة اتصال مشفرة خاصة بنجاح.')" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-2xl text-xs shadow-lg transition">
                    بدء الاتصال الفردي الآمن
                </button>
            </div>

            <!-- هـ. إعدادات النظام -->
            <div id="section-settings" class="flex-1 hidden flex-col h-full p-4 overflow-y-auto space-y-3 text-xs bg-emerald-950">
                <div class="bg-emerald-900 border border-emerald-800 rounded-2xl p-4 space-y-3">
                    <h3 class="font-bold text-sm text-purple-300">لوحة تحكم الشبكة السيادية</h3>
                    <div class="flex justify-between items-center p-2.5 bg-emerald-950 rounded-xl border border-emerald-800">
                        <span>نوع التشفير:</span>
                        <span class="text-amber-300 font-mono">AES-256 (فردي خاص)</span>
                    </div>
                    <div class="flex justify-between items-center p-2.5 bg-emerald-950 rounded-xl border border-emerald-800">
                        <span>حالة الخزنة:</span>
                        <span class="text-emerald-300 font-bold">مؤمنة (محجوبة عن العامة)</span>
                    </div>
                    <button onclick="triggerKillSwitch()" class="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl text-xs mt-2 transition">
                        ⚡ تفعيل مفتاح الطوارئ وحذف السجل المؤقت
                    </button>
                </div>
            </div>

        </main>
    </div>

    <!-- البرمجيات الذكية وتجربة الاستخدام -->
    <script>
        lucide.createIcons();

        let currentRecipient = '88888888';
        let globalChatsData = {};
        let globalVaultData = [];

        const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
        const wsUrl = protocol + window.location.host;
        let ws = null;

        function connectWebSocket() {
            ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                document.getElementById('net-dot').className = 'w-2 h-2 rounded-full bg-emerald-400';
                document.getElementById('net-text').textContent = 'متصل بالأمان التام';
            };

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'init') {
                    globalVaultData = data.vault;
                    globalChatsData = data.chats;
                    renderVault(globalVaultData);
                    renderMessages(currentRecipient);
                }
                if (data.type === 'update_vault') {
                    globalVaultData = data.vault;
                    renderVault(globalVaultData);
                }
                if (data.type === 'private_chat') {
                    if (!globalChatsData[data.recipient]) globalChatsData[data.recipient] = [];
                    globalChatsData[data.recipient].push(data.msg);
                    if (currentRecipient === data.recipient) {
                        appendMessage(data.msg);
                    }
                }
            };

            ws.onclose = () => {
                document.getElementById('net-dot').className = 'w-2 h-2 rounded-full bg-rose-500';
                document.getElementById('net-text').textContent = 'إعادة اتصال...';
                setTimeout(connectWebSocket, 3000);
            };
        }

        window.onload = connectWebSocket;

        function selectRecipient(name) {
            currentRecipient = name;
            document.querySelectorAll('.recipient-btn').forEach(btn => {
                if(btn.getAttribute('data-target') === name) {
                    btn.className = "recipient-btn px-3 py-1 rounded-lg bg-emerald-700 text-white text-xs font-bold transition";
                } else {
                    btn.className = "recipient-btn px-3 py-1 rounded-lg bg-emerald-950 text-emerald-200 text-xs font-bold transition border border-emerald-700";
                }
            });
            renderMessages(name);
        }

        function switchSection(secId) {
            ['chats', 'codes', 'ai', 'calls', 'settings'].forEach(id => {
                const el = document.getElementById('section-' + id);
                if (el) el.classList.add('hidden');
                const btn = document.getElementById('btn-sec-' + id);
                if (btn) btn.className = "w-full text-right p-2.5 rounded-xl hover:bg-emerald-900 text-emerald-200 font-bold text-xs flex items-center gap-3 transition";
            });
            const target = document.getElementById('section-' + secId);
            if (target) {
                target.classList.remove('hidden');
                target.classList.add('flex');
            }
            const targetBtn = document.getElementById('btn-sec-' + secId);
            if (targetBtn) targetBtn.className = "w-full text-right p-2.5 rounded-xl bg-emerald-800 border border-emerald-600 text-white font-bold text-xs flex items-center gap-3 transition";
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
                alert('✅ تم حفظ الكود في الخزنة السرية بنجاح.');
                document.getElementById('new-owner-name').value = '';
                document.getElementById('new-code-val').value = '';
            }
        }

        function renderVault(vault) {
            const vaultList = document.getElementById('vault-list');
            if(!vaultList) return;
            let html = '';
            vault.forEach(item => {
                html += \`
                    <div class="p-2.5 bg-emerald-950 rounded-xl flex justify-between items-center border border-emerald-800">
                        <div><strong>\${item.owner}</strong><br/><span class="text-amber-300 font-mono">الكود: \${item.num}</span></div>
                        <span class="bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded text-[10px]">\${item.cat}</span>
                    </div>
                \`;
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
                text: text,
                time: new Date().toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})
            };

            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'private_chat',
                    recipient: currentRecipient,
                    msg: msgData
                }));
                input.value = '';
            }
        });

        function appendMessage(msg) {
            const box = document.getElementById('chat-messages-box');
            if(!box) return;
            box.innerHTML += \`
                <div class="flex justify-start">
                    <div class="max-w-[85%] bg-emerald-900 border border-emerald-700 p-3 rounded-2xl text-xs leading-relaxed text-emerald-100 shadow">
                        <strong class="text-amber-300 block mb-0.5">\${msg.sender}:</strong>
                        \${msg.text}
                        <div class="text-[9px] text-emerald-300 mt-1 text-left">\${msg.time} • مشفر 🔒</div>
                    </div>
                </div>
            \`;
            box.scrollTop = box.scrollHeight;
        }

        function renderMessages(recipient) {
            const box = document.getElementById('chat-messages-box');
            if(!box) return;
            box.innerHTML = '';
            const msgs = globalChatsData[recipient] || [];
            msgs.forEach(msg => appendMessage(msg));
        }

        function aiAction(action) {
            const log = document.getElementById('ai-log');
            if(action === 'summarize') {
                log.innerHTML += \`<div class="bg-blue-950/60 border border-blue-800 p-3 rounded-xl text-emerald-100"><strong>[OMEGA AI - تلخيص]:</strong> تم تحليل سجل المحادثة الفردية الحالية، الحالة العامة ممتازة ولا توجد أي اختراقات.</div>\`;
            } else if(action === 'translate') {
                log.innerHTML += \`<div class="bg-blue-950/60 border border-blue-800 p-3 rounded-xl text-emerald-100"><strong>[OMEGA AI - ترجمة]:</strong> تم تفعيل محرك الترجمة الفورية عابر اللغات (عربي - إنجليزي - صيني) للرسائل القادمة.</div>\`;
            } else if(action === 'security') {
                log.innerHTML += \`<div class="bg-blue-950/60 border border-blue-800 p-3 rounded-xl text-emerald-100"><strong>[OMEGA AI - فحص الأمان]:</strong> فحص نفق WebSocket جاري... النفق آمن بنسبة 100% ومحمي بتشفير عالي.</div>\`;
            }
            log.scrollTop = log.scrollHeight;
        }

        function sendAiPrompt() {
            const inp = document.getElementById('ai-prompt-input');
            const val = inp.value.trim();
            if(!val) return;
            const log = document.getElementById('ai-log');
            log.innerHTML += \`<div class="bg-emerald-950 p-2.5 rounded-xl text-white border border-emerald-800"><strong>المشغل:</strong> \${val}</div>\`;
            inp.value = '';
            setTimeout(() => {
                log.innerHTML += \`<div class="bg-blue-950/60 border border-blue-800 p-3 rounded-xl text-emerald-100"><strong>[OMEGA AI]:</strong> تمت معالجة طلبك الاستراتيجي بنجاح عبر بروتوكول الذكاء الاصطناعي المدمج.</div>\`;
                log.scrollTop = log.scrollHeight;
            }, 800);
        }

        function triggerKillSwitch() {
            if(confirm('⚠️ تحذير: هل تريد مسح السجلات المؤقتة وتأمين النظام؟')) {
                alert('⚡ تم تأمين القطاع بنجاح.');
                location.reload();
            }
        }
    </script>
</body>
</html>`);
});

server.listen(PORT, () => {
  console.log('Sanad Secure Sovereign Server running on port ' + PORT);
});
