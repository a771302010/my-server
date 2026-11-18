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
  { owner: 'الإدارة العامة العليا', phone: '+967770000001', num: '88800001', cat: 'بروتوكول المؤسسة VIP' },
  { owner: 'خدمة العملاء المركزية', phone: '88888888', num: '88888888', cat: 'الدعم الفني والتشغيل 24/7' }
];

let privateChats = {
  'خدمة العملاء المركزية': [
    { id: 'm1', sender: 'خدمة العملاء المركزية', type: 'text', text: 'أهلاً بك في منظومة سَنَد الرقمية الذكية.', time: 'الآن', isMe: false }
  ],
  'رهف': [
    { id: 'm2', sender: 'رهف', type: 'text', text: 'قناة الاتصال الفردية مؤمنة بنجاح.', time: 'الآن', isMe: false }
  ],
  'رابعة': [
    { id: 'm3', sender: 'رابعة', type: 'text', text: 'الاتصال مستقر عبر الشبكة الآمنة.', time: 'الآن', isMe: false }
  ]
};

let aiChatLogs = [
  { sender: 'SANAD AI', text: 'أهلاً بك. أنا مساعد الذكاء الاصطناعي المدمج في منظومة سَنَد. جاهز لمعالجة الأوامر والتحليل.', time: 'الآن', isAi: true }
];

let activeRecipients = ['خدمة العملاء المركزية', 'رهف', 'رابعة', 'رشا', 'آمنة'];
let activeConnectionsCount = 0;

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
        broadcast({ type: 'private_chat', recipient: data.recipient, msg: data.msg });
      }
      else if (data.type === 'delete_msg') {
        if (privateChats[data.recipient]) {
          privateChats[data.recipient] = privateChats[data.recipient].filter(m => m.id !== data.msgId);
          broadcast({ type: 'update_chats', recipient: data.recipient, chats: privateChats[data.recipient] });
        }
      }
      else if (data.type === 'ai_chat') {
        aiChatLogs.push(data.msg);
        aiChatLogs.push({ sender: 'SANAD AI', text: '⚡ [SANAD AI]: تم تنفيذ المعالجة بنجاح والنظام يعمل بكفاءة.', time: 'الآن', isAi: true });
        broadcast({ type: 'ai_update', logs: aiChatLogs });
      }
      else if (data.type === 'add_recipient') {
        const name = (data.name || '').trim();
        if (name && !activeRecipients.includes(name)) {
          activeRecipients.push(name);
          if (!privateChats[name]) privateChats[name] = [{ id: 'm_' + Date.now(), sender: 'النظام', type: 'text', text: 'تم فتح القناة لـ ' + name, time: 'الآن', isMe: false }];
          broadcast({ type: 'update_recipients', recipients: activeRecipients, chats: privateChats });
        }
      }
    } catch (e) {}
  });

  ws.on('close', () => {
    activeConnectionsCount = Math.max(1, activeConnectionsCount - 1);
    broadcast({ type: 'stats', connections: activeConnectionsCount });
  });
});

app.get('/manifest.json', (req, res) => {
  res.json({
    name: "منظومة سَنَد الذكية للاتصالات",
    short_name: "سَنَد",
    start_url: "/",
    display: "standalone",
    background_color: "#021824",
    theme_color: "#0284c7"
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
    </style>
</head>
<body class="w-screen h-[100dvh] flex flex-col justify-between m-0 p-0">

    <header class="bg-sky-900 border-b border-sky-700 px-4 py-3 flex items-center justify-between shrink-0 shadow-lg">
        <div class="flex items-center gap-2">
            <h1 class="font-extrabold text-sm text-white">منظومة سَنَد <span class="bg-sky-600 text-white text-[10px] px-2.5 py-0.5 rounded-full">النسخة الدولية الرسمية</span></h1>
        </div>
        <span id="net-status" class="bg-emerald-500/20 text-emerald-300 text-xs px-2.5 py-1 rounded-full font-bold">متصل (Live)</span>
    </header>

    <div class="flex-1 flex overflow-hidden relative">
        <aside class="w-16 md:w-20 bg-slate-950 border-l border-sky-900 flex flex-col items-center py-3 h-full shrink-0 space-y-3">
            <button onclick="switchSection('chats')" id="btn-chats" class="w-12 py-2.5 rounded-xl bg-sky-700 text-white text-[10px] font-bold flex flex-col items-center gap-1 shadow">الدردشة</button>
            <button onclick="switchSection('ai')" id="btn-ai" class="w-12 py-2.5 rounded-xl hover:bg-sky-900 text-sky-300 text-[10px] font-bold flex flex-col items-center gap-1">الذكاء AI</button>
            <button onclick="switchSection('codes')" id="btn-codes" class="w-12 py-2.5 rounded-xl hover:bg-sky-900 text-sky-300 text-[10px] font-bold flex flex-col items-center gap-1">الخزنة</button>
        </aside>

        <main class="flex-1 flex flex-col bg-slate-950 relative overflow-hidden h-full">
            <div id="sec-chats" class="flex-1 flex flex-col h-full overflow-hidden">
                <div class="bg-sky-950 border-b border-sky-800 px-3 py-2 flex items-center justify-between">
                    <span id="chat-title" class="font-bold text-xs text-white">خدمة العملاء المركزية</span>
                    <button onclick="clearChat()" class="bg-rose-900 text-white px-2 py-1 rounded text-[10px]">مسح السجل</button>
                </div>
                <div id="messages-box" class="flex-1 overflow-y-auto p-3 space-y-2 chat-bg text-xs"></div>
                <form id="chat-form" class="p-2 bg-sky-950 border-t border-sky-800 flex gap-2">
                    <input type="text" id="chat-input" placeholder="اكتب رسالة مشفرة..." class="flex-1 bg-sky-900 border border-sky-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none">
                    <button type="submit" class="bg-sky-600 text-white font-bold px-4 py-2 rounded-xl text-xs">إرسال</button>
                </form>
            </div>

            <div id="sec-ai" class="flex-1 hidden flex-col h-full bg-slate-950 overflow-hidden">
                <div class="bg-blue-950 px-3 py-2 text-xs font-bold text-blue-200">مساعد سَنَد الذكي (SANAD AI)</div>
                <div id="ai-box" class="flex-1 overflow-y-auto p-3 space-y-2 chat-bg text-xs"></div>
                <form id="ai-form" class="p-2 bg-sky-950 border-t border-sky-800 flex gap-2">
                    <input type="text" id="ai-input" placeholder="اسأل مساعد سَنَد الذكي..." class="flex-1 bg-sky-900 border border-sky-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none">
                    <button type="submit" class="bg-blue-600 text-white font-bold px-4 py-2 rounded-xl text-xs">إرسال</button>
                </form>
            </div>

            <div id="sec-codes" class="flex-1 hidden flex-col h-full p-4 overflow-y-auto space-y-3 bg-sky-950 text-xs">
                <div class="bg-sky-900 p-4 rounded-xl border border-sky-700">
                    <h3 class="font-bold text-amber-300 mb-2">الخزنة والأكواد المعتمدة</h3>
                    <div id="vault-list" class="space-y-2"></div>
                </div>
            </div>
        </main>
    </div>

    <script>
        var currentRecipient = 'خدمة العملاء المركزية';
        var globalChats = {'خدمة العملاء المركزية': [{id:'m1', sender:'خدمة العملاء المركزية', text:'أهلاً بك في منظومة سَنَد الذكية.', time:'الآن', isMe:false}]};
        var globalVault = [{owner:'القيادة المركزية العليا', num:'88800001', cat:'بروتوكول VIP'}];
        var ws = null;

        function init() {
            renderMessages(currentRecipient);
            renderVault(globalVault);
            connectWS();
        }

        function connectWS() {
            var proto = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
            ws = new WebSocket(proto + window.location.host);
            ws.onmessage = function(e) {
                var d = JSON.parse(e.data);
                if (d.type === 'init') {
                    globalChats = d.chats;
                    globalVault = d.vault;
                    renderMessages(currentRecipient);
                    renderVault(globalVault);
                } else if (d.type === 'private_chat') {
                    if(!globalChats[d.recipient]) globalChats[d.recipient] = [];
                    globalChats[d.recipient].push(d.msg);
                    if(currentRecipient === d.recipient) renderMessages(d.recipient);
                } else if (d.type === 'ai_update') {
                    renderAiLogs(d.logs);
                }
            };
        }

        function switchSection(id) {
            ['chats', 'ai', 'codes'].forEach(function(s) {
                document.getElementById('sec-' + s).classList.add('hidden');
                document.getElementById('btn-' + s).className = 'w-12 py-2.5 rounded-xl hover:bg-sky-900 text-sky-300 text-[10px] font-bold flex flex-col items-center gap-1';
            });
            document.getElementById('sec-' + id).classList.remove('hidden');
            document.getElementById('sec-' + id).classList.add('flex');
            document.getElementById('btn-' + id).className = 'w-12 py-2.5 rounded-xl bg-sky-700 text-white text-[10px] font-bold flex flex-col items-center gap-1 shadow';
        }

        document.getElementById('chat-form').addEventListener('submit', function(e) {
            e.preventDefault();
            var input = document.getElementById('chat-input');
            var text = input.value.trim();
            if(!text) return;
            var msg = {id: 'm_' + Date.now(), sender: 'المستخدم', text: text, time: 'الآن', isMe: true};
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
            if(ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({type: 'ai_chat', msg: {sender: 'المستخدم', text: text, time: 'الآن', isAi: false}}));
            }
            input.value = '';
        });

        function renderMessages(rec) {
            var box = document.getElementById('messages-box');
            box.innerHTML = '';
            var list = globalChats[rec] || [];
            list.forEach(function(m) {
                var align = m.isMe ? 'justify-end' : 'justify-start';
                var bg = m.isMe ? 'bg-sky-600 text-white' : 'bg-sky-950 border border-sky-800 text-sky-100';
                box.innerHTML += '<div class="flex ' + align + '"><div class="max-w-[85%] ' + bg + ' p-2.5 rounded-xl shadow"><strong>' + m.sender + ':</strong><p class="mt-1">' + m.text + '</p><span class="text-[9px] opacity-70 block mt-1">' + m.time + '</span></div></div>';
            });
            box.scrollTop = box.scrollHeight;
        }

        function renderAiLogs(logs) {
            var box = document.getElementById('ai-box');
            box.innerHTML = '';
            logs.forEach(function(l) {
                var align = l.isAi ? 'justify-start' : 'justify-end';
                var bg = l.isAi ? 'bg-blue-950 border border-blue-800 text-blue-100' : 'bg-sky-600 text-white';
                box.innerHTML += '<div class="flex ' + align + '"><div class="max-w-[85%] ' + bg + ' p-2.5 rounded-xl shadow"><strong>' + l.sender + ':</strong><p class="mt-1">' + l.text + '</p><span class="text-[9px] opacity-70 block mt-1">' + l.time + '</span></div></div>';
            });
            box.scrollTop = box.scrollHeight;
        }

        function renderVault(vault) {
            var box = document.getElementById('vault-list');
            box.innerHTML = '';
            vault.forEach(function(item) {
                box.innerHTML += '<div class="p-2.5 bg-sky-950 rounded-lg border border-sky-800 flex justify-between"><span>' + item.owner + '</span><span class="text-amber-300 font-mono font-bold">' + item.num + '</span></div>';
            });
        }

        function clearChat() {
            if(confirm('مسح سجل المحادثة؟')) {
                globalChats[currentRecipient] = [];
                renderMessages(currentRecipient);
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
  console.log('Sanad International Server running on port ' + PORT);
});
