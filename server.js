const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

let privateChats = {
  '88888888': [{ sender: 'خدمة العملاء', type: 'text', text: 'أهلاً بك في منظومة سَنَد السيادية.', time: 'الآن' }],
  'رهف': [{ sender: 'النظام', type: 'text', text: 'قناة رهف مؤمنة.', time: 'الآن' }]
};
let aiLogs = [{ sender: 'OMEGA AI', text: 'مرحباً بك يا أبو طارق، أنا مساعدك الذكي جاهز لأي استفسار.', time: 'الآن' }];
let activeRecipients = ['88888888', 'رهف', 'رابعة', 'رشا', 'آمنة'];

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'init', chats: privateChats, recipients: activeRecipients, aiLogs: aiLogs }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'private_chat') {
        if (!privateChats[data.recipient]) privateChats[data.recipient] = [];
        privateChats[data.recipient].push(data.msg);
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify({ type: 'private_chat', recipient: data.recipient, msg: data.msg }));
        });
      } else if (data.type === 'ai_chat') {
        aiLogs.push(data.msg);
        aiLogs.push({ sender: 'OMEGA AI', text: `تم استلام طلبك: "${data.msg.text}" ومعالجته بنجاح.`, time: 'الآن' });
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify({ type: 'ai_update', logs: aiLogs }));
        });
      }
    } catch(e) {}
  });
});

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>سَنَد | النسخة السيادية</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap" rel="stylesheet">
    <style>body { font-family: 'Tajawal', sans-serif; background: #064e3b; color: #fff; height: 100vh; margin:0; display:flex; flex-direction:column; overflow:hidden; }</style>
</head>
<body class="w-screen h-screen flex flex-col justify-between">
    <header class="bg-emerald-800 p-3 flex justify-between items-center shadow border-b border-emerald-700">
        <h1 class="font-bold text-sm">برنامج سَنَد السيادي</h1>
        <span class="text-[10px] bg-emerald-600 px-2 py-0.5 rounded-full">متصل (Live)</span>
    </header>

    <div class="flex-1 flex overflow-hidden">
        <aside class="w-16 bg-emerald-950 flex flex-col items-center py-3 space-y-4 border-l border-emerald-800">
            <button onclick="switchTab('chats')" class="p-2 bg-emerald-800 rounded-xl"><i data-lucide="message-square" class="w-5 h-5"></i></button>
            <button onclick="switchTab('ai')" class="p-2 hover:bg-emerald-900 rounded-xl"><i data-lucide="cpu" class="w-5 h-5"></i></button>
            <button onclick="switchTab('help')" class="p-2 hover:bg-emerald-900 rounded-xl"><i data-lucide="help-circle" class="w-5 h-5"></i></button>
        </aside>

        <main class="flex-1 flex flex-col bg-slate-950 relative overflow-hidden">
            <!-- قسم الدردشة -->
            <div id="tab-chats" class="flex-1 flex flex-col h-full">
                <div class="bg-emerald-900 p-2 text-xs flex justify-between items-center border-b border-emerald-800">
                    <span id="chat-title" class="font-bold">خدمة العملاء (88888888)</span>
                    <div id="recipient-chips" class="flex gap-1 overflow-x-auto"></div>
                </div>
                <div id="messages-box" class="flex-1 p-3 overflow-y-auto space-y-2 text-xs bg-slate-900"></div>
                <form id="chat-form" class="p-2 bg-emerald-950 flex gap-2 items-center border-t border-emerald-800">
                    <input type="text" id="chat-input" placeholder="اكتب رسالة..." class="flex-1 bg-emerald-900 border border-emerald-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none">
                    <button type="submit" class="bg-emerald-600 px-4 py-2 rounded-xl text-xs font-bold">إرسال</button>
                </form>
            </div>

            <!-- قسم الذكاء الاصطناعي -->
            <div id="tab-ai" class="flex-1 hidden flex-col h-full">
                <div class="bg-blue-900 p-2 text-xs font-bold">مساعد OMEGA AI الذكي</div>
                <div id="ai-box" class="flex-1 p-3 overflow-y-auto space-y-2 text-xs bg-slate-900"></div>
                <form id="ai-form" class="p-2 bg-emerald-950 flex gap-2 items-center border-t border-emerald-800">
                    <input type="text" id="ai-input" placeholder="اسأل الذكاء الاصطناعي..." class="flex-1 bg-emerald-900 border border-emerald-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none">
                    <button type="submit" class="bg-blue-600 px-4 py-2 rounded-xl text-xs font-bold">إرسال</button>
                </form>
            </div>

            <!-- قسم التعليمات -->
            <div id="tab-help" class="flex-1 hidden p-4 overflow-y-auto text-xs space-y-3 bg-emerald-950">
                <h3 class="font-bold text-sm text-amber-300">📖 دليل الاستخدام</h3>
                <p>1. اختر المحادثة من الشريط العلوي.</p>
                <p>2. أرسل الرسائل مباشرة لتصل للطرف الآخر عبر السيرفر.</p>
                <p>3. تفاعل مع مساعد الذكاء الاصطناعي من تبويب AI.</p>
            </div>
        </main>
    </div>

    <script>
        lucide.createIcons();
        let currentRecipient = '88888888';
        let chatsData = {};
        let ws = new WebSocket((window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host);

        ws.onmessage = (e) => {
            const data = JSON.parse(e.data);
            if(data.type === 'init') {
                chatsData = data.chats;
                renderRecipients(data.recipients);
                renderMessages(currentRecipient);
                renderAi(data.aiLogs);
            }
            if(data.type === 'private_chat') {
                if(!chatsData[data.recipient]) chatsData[data.recipient] = [];
                chatsData[data.recipient].push(data.msg);
                if(currentRecipient === data.recipient) renderMessages(currentRecipient);
            }
            if(data.type === 'ai_update') {
                renderAi(data.logs);
            }
        };

        function renderRecipients(recips) {
            const box = document.getElementById('recipient-chips');
            box.innerHTML = recips.map(r => \`<button onclick="selectRecipient('\${r}')" class="px-2 py-1 rounded bg-\${r===currentRecipient?'emerald-700':'emerald-950'} text-[10px]">\${r}</button>\`).join('');
        }

        function selectRecipient(r) {
            currentRecipient = r;
            document.getElementById('chat-title').textContent = r;
            renderMessages(r);
        }

        function renderMessages(r) {
            const box = document.getElementById('messages-box');
            box.innerHTML = (chatsData[r] || []).map(m => \'<div class="bg-emerald-900/50 p-2 rounded-xl"><strong>\${m.sender}:</strong> \${m.text}</div>\').join('');
            box.scrollTop = box.scrollHeight;
        }

        function renderAi(logs) {
            const box = document.getElementById('ai-box');
            box.innerHTML = logs.map(l => \'<div class="bg-blue-950 p-2 rounded-xl"><strong>\${l.sender}:</strong> \${l.text}</div>\').join('');
            box.scrollTop = box.scrollHeight;
        }

        document.getElementById('chat-form').onsubmit = (e) => {
            e.preventDefault();
            const input = document.getElementById('chat-input');
            if(!input.value.trim()) return;
            ws.send(JSON.stringify({ type: 'private_chat', recipient: currentRecipient, msg: { sender: 'أبو طارق', text: input.value, time: 'الآن' }}));
            input.value = '';
        };

        document.getElementById('ai-form').onsubmit = (e) => {
            e.preventDefault();
            const input = document.getElementById('ai-input');
            if(!input.value.trim()) return;
            ws.send(JSON.stringify({ type: 'ai_chat', msg: { sender: 'أبو طارق', text: input.value, time: 'الآن' }}));
            input.value = '';
        };

        function switchTab(tab) {
            ['chats', 'ai', 'help'].forEach(t => document.getElementById('tab-' + t).classList.add('hidden'));
            document.getElementById('tab-' + tab).classList.remove('hidden');
            if(tab !== 'help') document.getElementById('tab-' + tab).classList.add('flex');
        }
    </script>
</body>
</html>`);
});

server.listen(PORT, () => console.log('Server running on port ' + PORT));
