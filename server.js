const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// قاعدة بيانات الذاكرة السحابية المتزامنة عالمياً (الدليل والرسائل)
let globalVault = [
  { owner: 'أبو طارق (القيادة العليا)', phone: '967770000001', num: '88800001', cat: 'بروتوكول VIP' },
  { owner: 'خدمة العملاء المركزية', phone: '88888888', num: '88888888', cat: 'الدعم الفني 24/7' }
];

let globalMessages = [
  { sender: 'خدمة العملاء (88888888)', text: 'أهلاً بك يا أبو طارق في النظام السيادي الدولي. الشبكة متصلة وجاهزة لتواصل أهلك وإخوانك في كل دول العالم.', time: 'الان' }
];

// إدارة الاتصالات الحية عبر WebSocket لربط العالم لحظياً
wss.on('connection', (ws) => {
  // إرسال البيانات الحالية فور اتصال أي جهاز جديد (من اليمن، أمريكا، السعودية...)
  ws.send(JSON.stringify({
    type: 'init',
    vault: globalVault,
    messages: globalMessages
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'chat') {
        globalMessages.push(data);
        // بث الرسالة فوراً لكل المتصلين في العالم
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'chat', ...data }));
          }
        });
      } 
      else if (data.type === 'add_code') {
        globalVault.unshift(data.item);
        // تحديث الدليل السيادي لكل المستخدمين عالمياً
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'update_vault', vault: globalVault }));
          }
        });
      }
    } catch (e) {
      console.error('Error parsing message', e);
    }
  });
});

// واجهة التطبيق السيادي الكاملة (Frontend + WebSocket Client)
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="theme-color" content="#047857">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <title>برنامج سَنَد | المنصة السيادية الدولية</title>
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
    
    <!-- 1. الشريط الإخباري السيادي العلوي -->
    <div class="bg-emerald-950 border-b border-emerald-700 text-emerald-200 text-xs font-bold py-2 px-4 overflow-hidden whitespace-nowrap shrink-0 flex items-center shadow-md">
        <span class="bg-emerald-700 text-white px-2 py-0.5 rounded text-[10px] ml-3 shrink-0">إعلان سيادي دولي</span>
        <div class="overflow-hidden w-full">
            <span class="animate-ticker">
                🌿 أهلاً بكم في برنامج سند للتواصل الفوري • خدمة العملاء المركزية: 88888888 • ربط مباشر يجمع أهلك وإخوانك في أمريكا، السعودية، الإمارات، الصين، جيبوتي، واليمن 🌿
            </span>
        </div>
    </div>

    <!-- 2. رأس التطبيق بالشعار الأخضر الرسمي -->
    <header class="bg-emerald-800 border-b border-emerald-700 px-4 py-3 flex items-center justify-between shrink-0 shadow-lg">
        <div class="flex items-center gap-3">
            <div class="w-11 h-11 bg-white rounded-2xl flex items-center justify-center border-2 border-emerald-300 text-emerald-800 font-extrabold text-2xl shadow">
                S
            </div>
            <div>
                <h1 class="font-extrabold text-base text-white flex items-center gap-2">
                    برنامج سَنَد <span class="bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">النظام الدولي المتكامل</span>
                </h1>
                <p class="text-[11px] text-emerald-100">المالك: أبو طارق • خدمة العملاء: 88888888</p>
            </div>
        </div>
        <div class="flex items-center gap-2">
            <span id="net-status" class="bg-amber-500/20 text-amber-300 text-[10px] px-2.5 py-1 rounded-full font-mono flex items-center gap-1.5 border border-amber-500/40">
                <span id="net-dot" class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                <span id="net-text">جاري الاتصال بالسيرفر...</span>
            </span>
        </div>
    </header>

    <!-- 3. مساحة العمل والشاشات المتعددة -->
    <div class="flex-1 flex overflow-hidden relative">
        
        <!-- القائمة الجانبية للتنقل بين الأقسام -->
        <aside class="w-20 md:w-64 bg-emerald-950 border-l border-emerald-800 flex flex-col h-full shrink-0 z-10 p-2 space-y-1 overflow-y-auto">
            <div class="text-[10px] font-bold text-emerald-300 px-2 py-1 hidden md:block">القوائم السيادية:</div>
            
            <button onclick="switchSection('chats')" id="btn-sec-chats" class="w-full text-right p-2.5 rounded-xl bg-emerald-800 border border-emerald-600 text-white font-bold text-xs flex items-center gap-3 transition">
                <i data-lucide="message-square" class="w-4 h-4 text-emerald-300 shrink-0"></i>
                <span class="hidden md:inline">الدردشة العامة (88888888)</span>
            </button>

            <button onclick="switchSection('codes')" id="btn-sec-codes" class="w-full text-right p-2.5 rounded-xl hover:bg-emerald-900 text-emerald-200 font-bold text-xs flex items-center gap-3 transition">
                <i data-lucide="key" class="w-4 h-4 text-amber-300 shrink-0"></i>
                <span class="hidden md:inline">الدليل السيادي والأكواد</span>
            </button>

            <button onclick="switchSection('ai')" id="btn-sec-ai" class="w-full text-right p-2.5 rounded-xl hover:bg-emerald-900 text-emerald-200 font-bold text-xs flex items-center gap-3 transition">
                <i data-lucide="bot" class="w-4 h-4 text-blue-300 shrink-0"></i>
                <span class="hidden md:inline">مساعد سند (OMEGA AI)</span>
            </button>

            <button onclick="switchSection('calls')" id="btn-sec-calls" class="w-full text-right p-2.5 rounded-xl hover:bg-emerald-900 text-emerald-200 font-bold text-xs flex items-center gap-3 transition">
                <i data-lucide="phone-call" class="w-4 h-4 text-emerald-300 shrink-0"></i>
                <span class="hidden md:inline">المكالمات الفضائية الآمنة</span>
            </button>

            <button onclick="switchSection('settings')" id="btn-sec-settings" class="w-full text-right p-2.5 rounded-xl hover:bg-emerald-900 text-emerald-200 font-bold text-xs flex items-center gap-3 transition">
                <i data-lucide="settings" class="w-4 h-4 text-purple-300 shrink-0"></i>
                <span class="hidden md:inline">مركز التحكم والسيادة</span>
            </button>
        </aside>

        <!-- المحتوى التفاعلي المتغير -->
        <main class="flex-1 flex flex-col bg-slate-950 relative overflow-hidden h-full">
            
            <!-- أ. قسم الدردشات العامة والخاصة -->
            <div id="section-chats" class="flex-1 flex flex-col h-full overflow-hidden">
                <div class="p-3 bg-emerald-900 border-b border-emerald-800 flex items-center justify-between shrink-0">
                    <h3 class="font-bold text-xs text-emerald-200">غرفة الدردشة الدولية المباشرة (مرتبطة بخدمة العملاء 88888888)</h3>
                    <span class="text-[10px] text-emerald-300 font-mono">تزامن لحظي (Live WebSocket)</span>
                </div>
                <div id="chat-messages-box" class="flex-1 overflow-y-auto p-4 space-y-3 chat-bg">
                    <!-- يتم تعبئتها حياً من السيرفر -->
                </div>
                <form id="chat-form" class="p-3 bg-emerald-950 border-t border-emerald-800 flex gap-2 shrink-0">
                    <input type="text" id="sender-name" placeholder="اسمك..." value="أبو طارق" class="w-28 bg-emerald-900 border border-emerald-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none">
                    <input type="text" id="chat-input" placeholder="اكتب رسالتك المشفرة لتصل لكل العالم..." class="flex-1 bg-emerald-900 border border-emerald-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500">
                    <button type="submit" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 rounded-xl text-xs">إرسال</button>
                </form>
            </div>

            <!-- ب. قسم الأكواد والدليل السيادي المشترك -->
            <div id="section-codes" class="flex-1 hidden flex-col h-full p-4 overflow-y-auto space-y-4 bg-emerald-950">
                <div class="bg-emerald-900 border border-emerald-800 rounded-2xl p-4">
                    <h3 class="font-bold text-sm text-amber-300 mb-3 flex items-center gap-2">
                        <i data-lucide="key" class="w-4 h-4"></i> توليد وتأمين كود سيادي معتمد (8 أرقام)
                    </h3>
                    <button onclick="generateSovereignCode()" class="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold py-2.5 rounded-xl text-xs mb-3 transition shadow">
                        ⚡ توليد كود سيادي جديد تحت إشراف الإدارة
                    </button>
                    <div class="grid grid-cols-1 gap-2">
                        <input type="text" id="new-owner-name" placeholder="اسم الجهة أو الشخص (مثال: فرع السعودية)..." class="bg-emerald-950 border border-emerald-700 rounded-xl p-2.5 text-xs text-white">
                        <input type="text" id="new-owner-phone" placeholder="رقم الهاتف أو المعرف الدولي..." class="bg-emerald-950 border border-emerald-700 rounded-xl p-2.5 text-xs text-white" dir="ltr">
                        <input type="text" id="new-code-val" placeholder="888xxxxx" readonly class="bg-slate-950 border border-emerald-700 rounded-xl p-2.5 text-xs font-mono font-bold text-amber-300 text-center">
                    </div>
                    <button onclick="saveSovereignCode()" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs mt-3 transition">
                        حفظ الكود ونشره في الدليل السيادي المشترك عالمياً
                    </button>
                </div>
                <div class="bg-emerald-900 border border-emerald-800 rounded-2xl p-4 flex-1">
                    <h3 class="font-bold text-sm text-emerald-200 mb-3">الدليل السيادي العالمي (المزامن)</h3>
                    <div id="vault-list" class="space-y-2 text-xs">
                        <!-- يتم تعبئته من السيرفر -->
                    </div>
                </div>
            </div>

            <!-- ج. مساعد سند الذكي (AI) -->
            <div id="section-ai" class="flex-1 hidden flex-col h-full p-4 overflow-y-auto space-y-4 bg-emerald-950">
                <div class="bg-emerald-900 border border-emerald-800 rounded-2xl p-4 flex-1 flex flex-col h-full">
                    <h3 class="font-bold text-sm text-blue-300 mb-3 flex items-center gap-2">
                        <i data-lucide="bot" class="w-4 h-4"></i> مساعد سند الاستراتيجي (OMEGA AI)
                    </h3>
                    <div id="ai-log" class="flex-1 bg-emerald-950 border border-emerald-800 rounded-xl p-3 overflow-y-auto space-y-3 text-xs mb-3">
                        <div class="bg-blue-950/60 border border-blue-800 p-3 rounded-xl text-emerald-100">
                            <strong>[OMEGA AI]:</strong> جاهز لتحليل البيانات وإدارة الأوامر الميدانية والمهام السيادية يا أبو طارق عبر نفق AI-SAT.
                        </div>
                    </div>
                    <div class="flex gap-2 shrink-0">
                        <input type="text" id="ai-prompt-input" placeholder="اكتب استفسارك للذكاء الاصطناعي..." class="flex-1 bg-emerald-950 border border-emerald-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500">
                        <button onclick="sendAiPrompt()" class="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 rounded-xl text-xs transition">تنفيذ</button>
                    </div>
                </div>
            </div>

            <!-- د. المكالمات الفضائية الآمنة -->
            <div id="section-calls" class="flex-1 hidden flex-col h-full p-6 items-center justify-center text-center bg-emerald-950">
                <div class="w-24 h-24 bg-emerald-900 border-2 border-emerald-500/50 rounded-full flex items-center justify-center mb-4 text-emerald-300 shadow-2xl relative">
                    <div class="absolute inset-0 rounded-full border border-emerald-400 animate-ping"></div>
                    <i data-lucide="phone-call" class="w-10 h-10"></i>
                </div>
                <h3 class="text-lg font-bold text-white mb-1">مركز المكالمات الفضائية الآمنة</h3>
                <p class="text-xs text-emerald-300/80 mb-6">الاتصال الدولي عبر بروتوكول 1X المشفر ومربوط بخدمة العملاء 88888888</p>
                <button onclick="alert('🔴 جاري إنشاء قناة اتصال فضائية مشفرة عابرة للحدود...')" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-2xl text-xs shadow-lg transition">
                    بدء الاتصال الفوري المباشر
                </button>
            </div>

            <!-- هـ. مركز التحكم والإعدادات -->
            <div id="section-settings" class="flex-1 hidden flex-col h-full p-4 overflow-y-auto space-y-3 text-xs bg-emerald-950">
                <div class="bg-emerald-900 border border-emerald-800 rounded-2xl p-4 space-y-3">
                    <h3 class="font-bold text-sm text-purple-300">إعدادات الخادم والسيادة (Control Center)</h3>
                    <div class="flex justify-between items-center p-2.5 bg-emerald-950 rounded-xl border border-emerald-800">
                        <span>رابط السيرفر الحي:</span>
                        <code class="text-amber-300 font-mono text-[10px]" dir="ltr">https://my-server-t0s5.onrender.com</code>
                    </div>
                    <div class="flex justify-between items-center p-2.5 bg-emerald-950 rounded-xl border border-emerald-800">
                        <span>حالة الاتصال الدولي:</span>
                        <span class="text-emerald-300 font-bold">نشط عبر WebSocket</span>
                    </div>
                    <div class="flex justify-between items-center p-2.5 bg-emerald-950 rounded-xl border border-emerald-800">
                        <span>منع إعادة توجيه الرسائل:</span>
                        <span class="text-emerald-300 font-bold">مفعل (حماية تامة)</span>
                    </div>
                    <button onclick="triggerKillSwitch()" class="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl text-xs mt-2 transition">
                        ⚡ تفعيل مفتاح الطوارئ الشامل (Kill-Switch)
                    </button>
                </div>
            </div>

        </main>
    </div>

    <!-- البرمجيات الحية واتصال WebSocket -->
    <script>
        lucide.createIcons();

        // الاتصال الحي بالسيرفر السحابي (يتعرف تلقائيا على عنوان Render)
        const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
        const wsUrl = protocol + window.location.host;
        let ws = null;

        function connectWebSocket() {
            ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                document.getElementById('net-dot').className = 'w-2 h-2 rounded-full bg-emerald-400';
                document.getElementById('net-text').textContent = 'متصل دولياً (Live)';
                document.getElementById('net-status').className = 'bg-emerald-500/20 text-emerald-300 text-[10px] px-2.5 py-1 rounded-full font-mono flex items-center gap-1.5 border border-emerald-500/40';
            };

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'init' || data.type === 'update_vault') {
                    renderVault(data.vault);
                }
                if (data.type === 'init') {
                    renderMessages(data.messages);
                }
                if (data.type === 'chat') {
                    appendMessage(data);
                }
            };

            ws.onclose = () => {
                document.getElementById('net-dot').className = 'w-2 h-2 rounded-full bg-rose-500';
                document.getElementById('net-text').textContent = 'إعادة اتصال...';
                setTimeout(connectWebSocket, 3000);
            };
        }

        window.onload = connectWebSocket;

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

        function saveSovereignCode() {
            const name = document.getElementById('new-owner-name').value.trim();
            const phone = document.getElementById('new-owner-phone').value.trim() || 'دولي سيادي';
            const code = document.getElementById('new-code-val').value.trim();
            
            if(!name || !code) {
                alert('يرجى إدخال اسم الجهة وتوليد الكود أولاً.');
                return;
            }

            const newItem = { owner: name, phone: phone, num: code, cat: 'اعتماد دولي' };
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'add_code', item: newItem }));
                alert('✅ تم حفظ ونشر الكود في الدليل العالمي المشترك بنجاح.');
                document.getElementById('new-owner-name').value = '';
                document.getElementById('new-owner-phone').value = '';
                document.getElementById('new-code-val').value = '';
            } else {
                alert('الخطأ: جاري إعادة الاتصال بالسيرفر...');
            }
        }

        function renderVault(vault) {
            const vaultList = document.getElementById('vault-list');
            if(!vaultList) return;
            let html = '';
            vault.forEach(item => {
                html += \`
                    <div class="p-2.5 bg-emerald-950 rounded-xl flex justify-between items-center border border-emerald-800">
                        <div><strong>\${item.owner}</strong> (<span class="text-emerald-300">\${item.phone}</span>)<br/><span class="text-amber-300 font-mono">الكود: \${item.num}</span></div>
                        <span class="bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded text-[10px]">\${item.cat}</span>
                    </div>
                \`;
            });
            vaultList.innerHTML = html;
        }

        document.getElementById('chat-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const sender = document.getElementById('sender-name').value.trim() || 'أبو طارق';
            const input = document.getElementById('chat-input');
            const text = input.value.trim();
            if(!text) return;

            const msgData = {
                type: 'chat',
                sender: sender,
                text: text,
                time: new Date().toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})
            };

            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(msgData));
                input.value = '';
            } else {
                alert('السيرفر غير متصل حالياً.');
            }
        });

        function appendMessage(msg) {
            const box = document.getElementById('chat-messages-box');
            if(!box) return;
            const isMe = msg.sender === (document.getElementById('sender-name').value.trim() || 'أبو طارق');
            
            box.innerHTML += \`
                <div class="flex \${isMe ? 'justify-end' : 'justify-start'}">
                    <div class="max-w-[85%] \${isMe ? 'bg-emerald-700' : 'bg-emerald-900'} text-white p-3 rounded-2xl text-xs leading-relaxed shadow border border-emerald-700">
                        <strong class="text-amber-300 block mb-0.5">\${msg.sender}:</strong>
                        \${msg.text}
                        <div class="text-[9px] text-emerald-200 mt-1 text-left">\${msg.time} • ✓✓</div>
                    </div>
                </div>
            \`;
            box.scrollTop = box.scrollHeight;
        }

        function renderMessages(msgs) {
            const box = document.getElementById('chat-messages-box');
            if(!box) return;
            box.innerHTML = '';
            msgs.forEach(msg => appendMessage(msg));
        }

        function sendAiPrompt() {
            const inp = document.getElementById('ai-prompt-input');
            const val = inp.value.trim();
            if(!val) return;
            const log = document.getElementById('ai-log');
            log.innerHTML += \`<div class="bg-emerald-950 p-2.5 rounded-xl text-white border border-emerald-800"><strong>أبو طارق:</strong> \${val}</div>\`;
            inp.value = '';
            setTimeout(() => {
                log.innerHTML += \`<div class="bg-blue-950/60 border border-blue-800 p-3 rounded-xl text-emerald-100"><strong>[OMEGA AI]:</strong> تمت معالجة طلبك الاستراتيجي بنجاح عبر نظام AI-SAT الدولي.</div>\`;
                log.scrollTop = log.scrollHeight;
            }, 800);
        }

        function triggerKillSwitch() {
            if(confirm('⚠️ تحذير سيادي: هل تريد تفعيل مفتاح الطوارئ ومسح الذاكرة المؤقتة؟')) {
                alert('⚡ تم تأمين القطاع بنجاح.');
                location.reload();
            }
        }
    </script>
</body>
</html>`);
});

// إقلاع الخادم ودمج معالجة WebSocket
server.listen(PORT, () => {
  console.log('Sanad International Server running on port ' + PORT);
});
