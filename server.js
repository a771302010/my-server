require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// صفحة manifest.json لتثبيت التطبيق PWA
app.get('/manifest.json', (req, res) => {
  res.json({
    "name": "برنامج سند - المنصة السيادية عابرة الحدود",
    "short_name": "سند ULTRA",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#0b141a",
    "theme_color": "#005c4b"
  });
});

// تخزين مؤقت للرسائل والنشاط في الذاكرة (أو ربطه بقاعدة بيانات لاحقاً)
let activeUsers = new Map(); // socket.id -> username
let messageHistory = {}; // roomId -> array of messages

// استقبال وتشغيل اتصالات WebSocket الفورية
io.on('connection', (socket) => {
  console.log('🔗 اتصال جديد بالسيرفر الفوري:', socket.id);

  // انضمام المستخدم للشبكة
  socket.on('join', (data) => {
    socket.username = data.user;
    activeUsers.set(socket.id, data.user);
    console.log(`👤 المستخدم انضم: ${data.user}`);
  });

  // استقبال رسالة دردشة وإرسالها فوراً للطرف الآخر
  socket.on('chat', (data) => {
    console.log(`💬 رسالة من ${data.sender} إلى ${data.to}: ${data.text}`);
    
    // حفظ الرسالة في السجل
    let roomId = [data.sender, data.to].sort().join('_');
    if (!messageHistory[roomId]) messageHistory[roomId] = [];
    messageHistory[roomId].push(data);

    // بث الرسالة للمستخدمين المتصلين
    socket.broadcast.emit('chat', data);
  });

  // استقبال إشارات المكالمات الصوتية والمرئية
  socket.on('call_signal', (data) => {
    socket.broadcast.emit('call_signal', data);
  });

  socket.on('disconnect', () => {
    activeUsers.delete(socket.id);
    console.log('❌ انقطع الاتصال:', socket.id);
  });
});

// الواجهة الرئيسية المحدثة بالكامل
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>برنامج سند - المنصة السيادية الشاملة (v18.0 Enterprise Live)</title>
  <link rel="manifest" href="/manifest.json">
  <script src="/socket.io/socket.io.js"></script>
  <style>
    :root {
      --bg: #0b141a; --panel: #111b21; --incoming: #202c33; --outgoing: #005c4b;
      --text: #e9edef; --muted: #8696a0; --accent: #00a884; --border: #222d34; --gold: #d4af37; --danger: #ef4444;
    }
    body { margin: 0; padding: 0; background: var(--bg); color: var(--text); font-family: sans-serif; padding-bottom: 75px; }
    .container { max-width: 720px; margin: 0 auto; }
    .screen { display: none; }
    .screen.active { display: block; }
    .telemetry-bar { background: #070f25; border-bottom: 1px solid var(--border); padding: 6px 14px; font-family: monospace; font-size: 11px; display: flex; justify-content: space-between; align-items: center; color: var(--accent); }
    .telemetry-dot { width: 7px; height: 7px; background: var(--accent); border-radius: 50%; box-shadow: 0 0 8px var(--accent); }
    .news-ticker { background: #111b21; border-bottom: 2px solid var(--gold); color: var(--gold); font-size: 13px; font-weight: bold; padding: 10px 14px; overflow: hidden; white-space: nowrap; }
    .chat-list { padding: 0; margin: 0; list-style: none; }
    .chat-list-item { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-bottom: 1px solid var(--border); cursor: pointer; background: var(--panel); }
    .chat-list-avatar { width: 45px; height: 45px; border-radius: 50%; background: #1f2c34; display: flex; align-items: center; justify-content: center; font-size: 18px; color: var(--gold); border: 1px solid var(--gold); }
    .chat-header { background: var(--panel); padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 100; }
    .messages-box { background: var(--bg); padding: 14px; height: calc(100vh - 275px); overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
    .msg { max-width: 80%; padding: 8px 12px; border-radius: 8px; font-size: 13px; line-height: 1.4; word-break: break-word; }
    .msg.incoming { background: var(--incoming); color: var(--text); align-self: flex-start; }
    .msg.outgoing { background: var(--outgoing); color: var(--text); align-self: flex-end; }
    .input-bar { background: var(--panel); padding: 8px 12px; display: flex; align-items: center; gap: 8px; position: fixed; bottom: 60px; left: 0; right: 0; max-width: 720px; margin: 0 auto; border-top: 1px solid var(--border); }
    .text-input { flex-grow: 1; background: var(--incoming); border: none; border-radius: 8px; padding: 10px 14px; color: var(--text); font-size: 13px; outline: none; }
    .send-btn { background: var(--accent); color: #fff; border: none; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; }
    .bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; background: var(--panel); border-top: 1px solid var(--border); display: grid; grid-template-columns: repeat(5, 1fr); padding: 6px 4px; z-index: 1000; }
    .nav-item { background: transparent; border: none; color: var(--muted); display: flex; flex-direction: column; align-items: center; font-size: 10px; cursor: pointer; gap: 3px; }
    .nav-item.active { color: var(--accent); }
  </style>
</head>
<body>
  <div class="container">
    <div class="telemetry-bar">
      <span>LIVE WEBSOCKET ACTIVE</span>
      <span>برنامج سند // v18.0 ENTERPRISE</span>
      <div class="telemetry-dot"></div>
    </div>

    <div class="news-ticker">
      <span>⚡ تم تفعيل الاتصال الحي الفوري عبر السيرفر السحابي | مرسل ومستقبل فعال 100% ⚡</span>
    </div>

    <!-- شاشة الدردشات -->
    <div id="screenChats" class="screen active">
      <div id="chatListView">
        <div class="chat-header">
          <h3>برنامج سند - الدردشات الحية</h3>
        </div>
        <ul class="chat-list" id="dynamicChatList"></ul>
      </div>

      <div id="chatRoomView" style="display:none;">
        <div class="chat-header">
          <div onclick="backToChatList()" style="cursor:pointer; color:var(--accent);">➔ رجوع</div>
          <h3 id="activeChatName">اسم الشخص</h3>
        </div>
        <div class="messages-box" id="msgBox"></div>
        <div class="input-bar">
          <input type="text" id="chatInput" class="text-input" placeholder="اكتب رسالة فورية..." onkeypress="if(event.key==='Enter') sendMessage()" />
          <button class="send-btn" onclick="sendMessage()">➤</button>
        </div>
      </div>
    </div>
  </div>

  <script>
    const socket = io();
    let currentUser = prompt("أدخل اسمك الكريم للتشغيل الفوري:", "أبو طارق") || "مستخدم سند";
    socket.emit('join', { user: currentUser });

    let contacts = [
      { id: 'omar', name: 'عمر (في الخارج)', code: '88800006' },
      { id: 'rahaf', name: 'رهف', code: '88800002' },
      { id: 'rabia', name: 'رابعة', code: '88800003' }
    ];

    let activeContactId = null;

    function renderChatList() {
      let listEl = document.getElementById('dynamicChatList');
      listEl.innerHTML = '';
      contacts.forEach(c => {
        let li = document.createElement('li');
        li.className = 'chat-list-item';
        li.onclick = () => openChat(c.id, c.name);
        li.innerHTML = '<div class="chat-list-avatar">' + c.name.charAt(0) + '</div>' +
                       '<div><h4>' + c.name + ' <span style="font-size:10px; color:var(--gold);">[' + c.code + ']</span></h4>' +
                       '<p>انقر لبدء المحادثة الحية...</p></div>';
        listEl.appendChild(li);
      });
    }

    function openChat(id, name) {
      activeContactId = id;
      document.getElementById('chatListView').style.display = 'none';
      document.getElementById('chatRoomView').style.display = 'block';
      document.getElementById('activeChatName').innerText = name;
      document.getElementById('msgBox').innerHTML = '<div class="msg incoming">تم فتح القناة الفورية مع ' + name + '<div style="font-size:9px; color:var(--muted)">الآن</div></div>';
    }

    function backToChatList() {
      document.getElementById('chatRoomView').style.display = 'none';
      document.getElementById('chatListView').style.display = 'block';
    }

    function sendMessage() {
      let inp = document.getElementById('chatInput');
      let val = inp.value.trim();
      if(!val || !activeContactId) return;
      
      let box = document.getElementById('msgBox');
      box.innerHTML += '<div class="msg outgoing">' + val + '</div>';
      inp.value = '';
      box.scrollTop = box.scrollHeight;

      // إرسال الرسالة عبر السيرفر الحي للطرف الآخر
      socket.emit('chat', {
        sender: currentUser,
        to: activeContactId,
        text: val
      });
    }

    // استقبال الرسائل الحية من السيرفر
    socket.on('chat', (data) => {
      let box = document.getElementById('msgBox');
      box.innerHTML += '<div class="msg incoming"><strong>' + data.sender + ':</strong> ' + data.text + '</div>';
      box.scrollTop = box.scrollHeight;
    });

    window.onload = renderChatList;
  </script>
</body>
</html>`);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('🚀 خادم سند الحي يعمل على المنفذ ' + PORT));
