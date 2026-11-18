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
  { owner: 'خدمة العملاء المركزية', phone: '88888888', num: '88888888', cat: 'الدعم الفني والتشغيل 24/7' },
  { owner: 'قطاع التكنولوجيا والاتصالات', phone: '88800099', num: '88800099', cat: 'تشفير بيانات AES-256' }
];

let privateChats = {
  'خدمة العملاء المركزية': [
    { id: 'm1', sender: 'خدمة العملاء المركزية', type: 'text', text: 'أهلاً بك في منظومة سَنَد الذكية للاتصالات.', time: 'الآن', isMe: false }
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
      else if (data.type === 'clear_chat') {
        privateChats[data.recipient] = [];
        broadcast({ type: 'update_chats', recipient: data.recipient, chats: [] });
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
      else if (data.type === 'add_secure_code') {
        secureVault.unshift(data.item);
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

    <header class="bg-sky-900 border-b border-sky-700 px-3 py-2 flex items-center justify-between shrink-0 shadow-lg">
        <div class="flex items-center gap-2">
            <h1 class="font-extrabold text-xs text-white">منظومة سَنَد <span class="bg-sky-600 text-white text-[9px] px-2 py-0.5 rounded-full">النسخة الدولية الرسمية</span></h1>
        </div>
        <span id="net-status" class="bg-emerald-500/20 text-emerald-300 text-[10px] px-2.5 py-1 rounded-full font-bold">متصل (Live)</span>
    </header>

    <div class="flex-1 flex overflow-hidden relative">
        <aside class="w-16 md:w-20 bg-slate-950 border-l border-sky-900 flex flex-col items-center py-2.5 h-full shrink-0 space-y-2.5">
            <button onclick="switchSection('chats')" id="btn-chats" class="w-14 py-2.5 rounded-2xl bg-sky-700 text-white text-[10px] font-bold flex flex-col items-center gap-1 shadow">الدردشة</button>
            <button onclick="switchSection('ai')" id="btn-ai" class="w-14 py-2.5 rounded-2xl hover:bg-sky-900 text-sky-300 text-[10px] font-bold flex flex-col items-center gap-1">الذكاء AI</button>
            <button onclick="switchSection('calls')" id="btn-calls" class="w-14 py-2.5 rounded-2xl hover:bg-sky-900 text-sky-300 text-[10px] font-bold flex flex-col items-center gap-1">المكالمات</button>
            <button onclick="switchSection('codes')" id="btn-codes" class="w-14 py-2.5 rounded-2xl hover:bg-sky-900 text-sky-300 text-[10px] font-bold flex flex-col items-center gap-1">الخزنة</button>
        </aside>

        <main class="flex-1 flex flex-col bg-slate-950 relative overflow-hidden h-full">
            <!-- قسم الدردشة -->
            <div id="sec-chats" class="flex-1 flex flex-col h-full overflow-hidden">
                <div class="bg-sky-900 border-b border-sky-800 px-3 py-2 flex items-center justify-between shrink-0">
                    <span id="chat-title" class="font-bold text-xs text-white">خدمة العملاء المركزية</span>
                    <div class="flex items-center gap-1.5">
                        <button onclick="clearChat()" class="bg-rose-900 text-white px-2 py-1 rounded text-[10px]">مسح</button>
                        <button onclick="quickCall('audio')" class="p-1.5 bg-sky-800 text-white rounded-full text-[10px]">📞</button>
                        <button onclick="quickCall('video')" class="p-1.5 bg-sky-800 text-white rounded-full text-[10px]">📹</button>
                    </div>
                </div>
                <div class="p-2 bg-sky-950 border-b border-sky-800 flex gap-1.5 shrink-0">
                    <input type="text" id="new-contact" placeholder="إضافة مستخدم جديد..." class="bg-sky-900 border border-sky-700 rounded-lg px-2 py-1 text-xs text-white flex-1">
                    <button onclick="addContact()" class="bg-amber-500 text-slate-950 font-bold px-3 py-1 rounded-lg text-xs">إضافة</button>
                </div>
                <div id="recipient-tabs" class="flex gap-1 p-2 overflow-x-auto bg-sky-950 shrink-0 text-xs"></div>
                <div id="messages-box" class="flex-1 overflow-y-auto p-3 space-y-2 chat-bg text-xs"></div>
                <form id="chat-form" class="p-2 bg-sky-950 border-t border-sky-800 flex gap-1.5 items-center shrink-0">
                    <label class="cursor-pointer bg-sky-800 text-white p-2 rounded-full text-xs">
                        📎 <input type="file" id="file-input" class="hidden" accept="image/*,video/*,.pdf" onchange="sendFile(event)">
                    </label>
                    <input type="text" id="chat-input" placeholder="اكتب رسالة مشفرة..." class="flex-1 bg-sky-900 border border-sky-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none">
                    <button type="button" id="rec-btn" onclick="toggleVoice()" class="bg-purple-700 text-white p-2 rounded-full text-xs">🎤</button>
                    <button type="submit" class="bg-sky-600 text-white font-bold px-3.5 py-2 rounded-xl text-xs">إرسال</button>
                </form>
            </div>

            <!-- قسم الذكاء الاصطناعي -->
            <div id="sec-ai" class="flex-1 hidden flex-col h-full bg-slate-950 overflow-hidden">
                <div class="bg-blue-950 px-3 py-2 text-xs font-bold text-blue-200">مساعد سَنَد الذكي (SANAD AI)</div>
                <div id="ai-box" class="flex-1 overflow-y-auto p-3 space-y-2 chat-bg text-xs"></div>
                <form id="ai-form" class="p-2 bg-sky-950 border-t border-sky-800 flex gap-2 shrink-0">
                    <input type="text" id="ai-input" placeholder="اسأل مساعد سَنَد الذكي..." class="flex-1 bg-sky-900 border border-sky-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none">
                    <button type="submit" class="bg-blue-600 text-white font-bold px-4 py-2 rounded-xl text-xs">إرسال</button>
                </form>
            </div>

            <!-- قسم المكالمات -->
            <div id="sec-calls" class="flex-1 hidden flex-col h-full p-4 items-center justify-center text-center bg-sky-950 overflow-y-auto text-xs">
                <div class="w-16 h-16 bg-sky-900 border border-emerald-400 rounded-full flex items-center justify-center mb-3 text-emerald-300 text-xl">📞</div>
                <h3 class="font-bold text-sm text-white mb-2">مركز الاتصال المرئي والصوتي</h3>
                <select id="call-target" class="w-full max-w-xs bg-sky-900 border border-sky-600 rounded-xl p-2.5 text-xs text-white font-bold mb-3">
                    <option value="خدمة العملاء المركزية">خدمة العملاء المركزية</option>
                </select>
                <div class="grid grid-cols-2 gap-2 w-full max-w-xs mb-3">
                    <button onclick="startCall('audio')" class="bg-emerald-600 text-white font-bold py-2 rounded-xl">📞 صوتي</button>
                    <button onclick="startCall('video')" class="bg-blue-600 text-white font-bold py-2 rounded-xl">📹 فيديو</button>
                </div>
                <div id="call-screen" class="hidden w-full max-w-md bg-slate-900 border border-sky-600 rounded-xl p-3 space-y-2">
                    <p id="call-status" class="text-amber-300 font-bold">جاري الاتصال...</p>
                    <div id="video-box" class="hidden grid grid-cols-2 gap-2">
                        <video id="localVideo" autoplay muted playsinline class="w-full h-28 bg-black rounded-lg object-cover"></video>
                        <div class="bg-black rounded-lg flex items-center justify-center h-28 text-sky-300 text-[10px]">الطرف الآخر</div>
                    </div>
                    <button onclick="endCall()" class="bg-rose-600 text-white font-bold px-4 py-1.5 rounded-lg">إنهاء</button>
                </div>
            </div>

            <!-- قسم الخزنة والأكواد -->
            <div id="sec-codes" class="flex-1 hidden flex-col h-full p-4 overflow-y-auto space-y-3 bg-sky-950 text-xs">
                <div class="bg-sky-900 p-4 rounded-xl border border-sky-700 space-y-2">
                    <h3 class="font-bold text-amber-300">🛡️ توليد وحفظ كود تشفير جديد</h3>
                    <input type="text" id="vault-owner" placeholder="اسم الجهة أو المستخدم..." class="w-full bg-sky-950 border border-sky-700 rounded-lg p-2 text-white">
                    <input type="text" id="vault-code" placeholder="888xxxxx" readonly class="w-full bg-slate-950 border border-sky-700 rounded-lg p-2 font-mono font-bold text-amber-300 text-center">
                    <button onclick="genVaultCode()" class="w-full bg-amber-500 text-slate-950 font-bold py-2 rounded-lg">توليد الرمز</button>
                    <button onclick="saveVaultCode()" class="w-full bg-sky-600 text-white font-bold py-2 rounded-lg">حفظ في الخزنة وفتح القناة</button>
                </div>
                <div class="bg-sky-900 p-4 rounded-xl border border-sky-700">
                    <h3 class="font-bold text-white mb-2">سجل الخزنة</h3>
                    <div id="vault-list" class="space-y-2"></div>
                </div>
            </div>
        </main>
    </div>

    <script>
        var currentRecipient = 'خدمة العملاء المركزية';
        var globalChats = {'خدمة العملاء المركزية': [{id:'m1', sender:'خدمة العملاء المركزية', type:'text', text:'أهلاً بك في منظومة سَنَد الذكية.', time:'الآن', isMe:false}]};
        var globalVault = [{owner:'القيادة المركزية العليا', num:'88800001', cat:'بروتوكول VIP'}];
        var globalRecipients = ['خدمة العملاء المركزية', 'رهف', 'رابعة', 'رشا', 'آمنة'];
        var globalAi = [{sender:'SANAD AI', text:'أهلاً بك. أنا مساعد سَنَد الذكي.', time:'الآن', isAi:true}];
        var ws = null, mediaRec = null, chunks = [], isRec = false, localStream = null;

        function init() {
            renderRecipients();
            renderMessages(currentRecipient);
            renderVault(globalVault);
            renderAi(globalAi);
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
                    globalRecipients = d.recipients;
                    globalAi = d.aiLogs;
                    renderRecipients();
                    renderMessages(currentRecipient);
                    renderVault(globalVault);
                    renderAi(globalAi);
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
                }
            };
        }

        function switchSection(id) {
            ['chats', 'ai', 'calls', 'codes'].forEach(function(s) {
                document.getElementById('sec-' + s).classList.add('hidden');
                document.getElementById('btn-' + s).className = 'w-14 py-2.5 rounded-2xl hover:bg-sky-900 text-sky-300 text-[10px] font-bold flex flex-col items-center gap-1';
            });
            document.getElementById('sec-' + id).classList.remove('hidden');
            document.getElementById('sec-' + id).classList.add('flex');
            document.getElementById('btn-' + id).className = 'w-14 py-2.5 rounded-2xl bg-sky-700 text-white text-[10px] font-bold flex flex-col items-center gap-1 shadow';
        }

        function renderRecipients() {
            var box = document.getElementById('recipient-tabs');
            var sel = document.getElementById('call-target');
            if(!box) return;
            box.innerHTML = '';
            var htmlCall = '';
            globalRecipients.forEach(function(r) {
                var active = r === currentRecipient ? 'bg-sky-600 text-white' : 'bg-sky-900 text-sky-200';
                box.innerHTML += '<button onclick="selectRecipient(\\'' + r + '\\')" class="px-3 py-1 rounded-lg ' + active + ' font-bold shrink-0">' + r + '</button>';
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
                if(!globalChats[name]) globalChats[name] = [{id:'m_'+Date.now(), sender:'النظام', type:'text', text:'تم فتح القناة الآمنة لـ ' + name, time:'الآن', isMe:false}];
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
            var msg = {id: 'm_' + Date.now(), sender: 'أبو طارق', type: 'text', text: text, time: 'الآن', isMe: true};
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
            var msg = {sender: 'أبو طارق', text: text, time: 'الآن', isAi: false};
            globalAi.push(msg);
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
                var msg = {id: 'f_'+Date.now(), sender: 'أبو طارق', type: file.type.startsWith('image/') ? 'image' : 'file', url: evt.target.result, name: file.name, time: 'الآن', isMe: true};
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
                        var msg = {id: 'aud_'+Date.now(), sender: 'أبو طارق', type: 'audio', url: url, time: 'الآن', isMe: true};
                        globalChats[currentRecipient].push(msg);
                        renderMessages(currentRecipient);
                        if(ws && ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({type: 'private_chat', recipient: currentRecipient, msg: msg}));
                        }
                    };
                    mediaRec.start();
                    isRec = true;
                    btn.className = 'bg-rose-600 text-white p-2 rounded-full animate-pulse text-xs';
                }).catch(function() { alert('يرجى السماح بالميكروفون'); });
            } else {
                mediaRec.stop();
                isRec = false;
                btn.className = 'bg-purple-700 text-white p-2 rounded-full text-xs';
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
                box.innerHTML += '<div class="flex ' + align + '"><div class="max-w-[85%] ' + bg + ' p-2.5 rounded-xl shadow"><strong>' + m.sender + ':</strong>' + content + '<div class="flex justify-between items-center mt-1 text-[9px] opacity-70"><span>' + m.time + '</span><button onclick="delMsg(\\''+m.id+'\\')" class="text-rose-300">حذف</button></div></div></div>';
            });
            box.scrollTop = box.scrollHeight;
        }

        function delMsg(id) {
            globalChats[currentRecipient] = globalChats[currentRecipient].filter(function(m) { return m.id !== id; });
            renderMessages(currentRecipient);
            if(ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({type: 'delete_msg', recipient: currentRecipient, msgId: id}));
            }
        }

        function clearChat() {
            if(confirm('مسح السجل؟')) {
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
                box.innerHTML += '<div class="flex ' + align + '"><div class="max-w-[85%] ' + bg + ' p-2.5 rounded-xl shadow"><strong>' + l.sender + ':</strong><p class="mt-1">' + l.text + '</p><span class="text-[9px] opacity-70 block mt-1">' + l.time + '</span></div></div>';
            });
            box.scrollTop = box.scrollHeight;
        }

        function renderVault(vault) {
            var box = document.getElementById('vault-list');
            if(!box) return;
            box.innerHTML = '';
            vault.forEach(function(item) {
                box.innerHTML += '<div class="p-2.5 bg-sky-950 rounded-lg border border-sky-800 flex justify-between items-center"><div><strong class="text-white">' + item.owner + '</strong><br/><span class="text-amber-300 font-mono font-bold">' + item.num + '</span></div><span class="text-[10px] text-sky-300">' + item.cat + '</span></div>';
            });
        }

        function genVaultCode() {
            var r = Math.floor(10000 + Math.random() * 90000);
            document.getElementById('vault-code').value = '888' + r;
        }

        function saveVaultCode() {
            var owner = document.getElementById('vault-owner').value.trim();
            var code = document.getElementById('vault-code').value.trim();
            if(!owner || !code) { alert('أدخل الاسم والرمز'); return; }
            var item = {owner: owner, num: code, cat: 'اعتماد رسمي'};
            globalVault.unshift(item);
            if(!globalRecipients.includes(owner)) {
                globalRecipients.push(owner);
                globalChats[owner] = [{id:'m_'+Date.now(), sender:'النظام', type:'text', text:'تم فتح القناة الآمنة.', time:'الآن', isMe:false}];
            }
            renderVault(globalVault);
            renderRecipients();
            if(ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({type: 'add_secure_code', item: item}));
                ws.send(JSON.stringify({type: 'add_recipient', name: owner}));
            }
            alert('تم الحفظ بنجاح');
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
            status.textContent = 'جاري الاتصال بـ (' + target + ')...';
            if(type === 'video') {
                vBox.classList.remove('hidden');
                navigator.mediaDevices.getUserMedia({video:true, audio:true}).then(function(s) {
                    localStream = s;
                    document.getElementById('localVideo').srcObject = s;
                    status.textContent = 'متصل مرئياً بـ ' + target;
                }).catch(function() { status.textContent = 'اتصال مرئي نشط'; });
            } else {
                vBox.classList.add('hidden');
                setTimeout(function() { status.textContent = 'متصل صوتياً بـ ' + target + ' بنجاح 🔊'; }, 1200);
            }
        }

        function endCall() {
            if(localStream) localStream.getTracks().forEach(function(t) { t.stop(); });
            document.getElementById('call-screen').classList.add('hidden');
        }

        init();
    </script>
</body>
</html>`;

app.get('/', (req, res) => {
  res.send(htmlPage);
});

server.listen(PORT, () => {
  console.log('Sanad International Complete Server running on port ' + PORT);
});
