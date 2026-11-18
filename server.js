const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

let secureVault = [
  { owner: 'الإدارة العامة العليا', phone: '+967770000001', num: '88800001', cat: 'بروتوكول المؤسسة VIP' },
  { owner: 'خدمة العملاء المركزية', phone: '88888888', num: '88888888', cat: 'الدعم الفني والتشغيل 24/7' }
];

let privateChats = {
  'خدمة العملاء المركزية': [
    { id: 'm1', sender: 'خدمة العملاء المركزية', type: 'text', text: 'أهلاً بك في منظومة سَنَد الذكية للاتصالات.', time: 'الآن', isMe: false }
  ]
};

let aiChatLogs = [
  { sender: 'SANAD AI', text: 'أهلاً بك. أنا مساعد الذكاء الاصطناعي المدمج في منظومة سَنَد.', time: 'الآن', isAi: true }
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
      else if (data.type === 'ai_chat') {
        aiChatLogs.push(data.msg);
        aiChatLogs.push({ sender: 'SANAD AI', text: '⚡ تم معالجة طلبك بنجاح في منظومة سَنَد.', time: 'الآن', isAi: true });
        broadcast({ type: 'ai_update', logs: aiChatLogs });
      }
    } catch (e) {}
  });

  ws.on('close', () => {
    activeConnectionsCount = Math.max(1, activeConnectionsCount - 1);
    broadcast({ type: 'stats', connections: activeConnectionsCount });
  });
});

server.listen(PORT, () => {
  console.log('Sanad Server running on port ' + PORT);
});
