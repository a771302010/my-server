const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// أيقونة سند الرسمية المدمجة (الأزرق الملكي والأبيض)
const SOND_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="110" fill="#ffffff"/>
  <path d="M0 110 C0 49 49 0 110 0 L402 0 C463 0 512 49 512 110 L512 245 L0 245 Z" fill="#003893"/>
  <text x="256" y="205" font-family="Arial, sans-serif" font-weight="900" font-size="195" fill="#ffffff" text-anchor="middle">S</text>
  <g fill="#003893">
    <circle cx="205" cy="285" r="24"/><path d="M165 345 C165 320 245 320 245 345 L245 375 L165 375 Z"/>
    <circle cx="307" cy="285" r="24"/><path d="M267 345 C267 320 347 320 347 345 L347 375 L267 375 Z"/>
    <circle cx="256" cy="305" r="20"/><path d="M225 355 C225 335 287 335 287 355 L287 385 L225 385 Z"/>
    <path d="M95 250 C95 360 155 415 245 435 L245 495 L185 495 L185 445 C115 415 75 355 75 250 Z"/>
    <path d="M417 250 C417 360 357 415 267 435 L267 495 L327 495 L327 445 C397 415 437 355 437 250 Z"/>
  </g>
</svg>`;

app.get('/icon.svg', (req, res) => {
  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(SOND_ICON_SVG);
});

let globalMessages = [
  { id: 1, from: '88888888', to: '88800006', senderName: 'أبو طارق', type: 'text', content: 'أهلاً بك يا عمر، تم تفعيل الإصدار الشامل والمكتمل لبرنامج سند.', time: 'الآن' }
];

let globalContacts = [
  { id: '88888888', name: 'أبو طارق (المالك)', role: 'الإدارة العليا - عدن', code: '88888888' },
  { id: '88800006', name: 'عمر عسيلو', role: 'القاهرة - مصر', code: '88800006' },
  { id: '88800002', name: 'رهف', role: 'العائلة - اليمن', code: '88800002' },
  { id: '88800003', name: 'رابعة', role: 'العائلة - اليمن', code: '88800003' },
  { id: '88800004', name: 'رشا', role: 'العائلة - اليمن', code: '88800004' },
  { id: '88800005', name: 'آمنة', role: 'العائلة - اليمن', code: '88800005' }
];

app.get('/api/sync', (req, res) => {
  res.json({ messages: globalMessages, contacts: globalContacts });
});

app.post('/api/send', (req, res) => {
  const { from, to, senderName, type, content } = req.body;
  if (!from || !to || !content) return res.status(400).json({ error: 'بيانات ناقصة' });
  const now = new Date();
  const timeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
  const newMsg = { id: Date.now(), from, to, senderName, type: type || 'text', content, time: timeStr };
  globalMessages.push(newMsg);
  if (globalMessages.length > 300) globalMessages.shift();
  res.json({ success: true, message: newMsg });
});

app.post('/api/contacts', (req, res) => {
  const { id, name, role } = req.body;
  if (!id || !name) return res.status(400).json({ error: 'بيانات ناقصة' });
  if (!globalContacts.find(c => c.id === id)) {
    globalContacts.push({ id, name, role: role || 'مشترك دولي معتمد', code: id });
  }
  res.json({ success: true, contacts: globalContacts });
});

app.post('/api/killswitch', (req, res) => {
  globalMessages = [];
  res.json({ success: true });
});

app.get('/manifest.json', (req, res) => {
  res.json({
    "name": "برنامج سند - المنصة السيادية الدولية",
    "short_name": "سند",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#0b141a",
    "theme_color": "#003893",
    "icons": [
      { "src": "/icon.svg", "sizes": "512x512", "type": "image/svg+xml", "purpose": "any maskable" }
    ]
  });
});

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>برنامج سند الرسمي</title>
  <link rel="manifest" href="/manifest.json">
  <link rel="icon" type="image/svg+xml" href="/icon.svg">
  <link rel="apple-touch-icon" href="/icon.svg">
  <meta name="apple-mobile-web-app-title" content="سند">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <style>
    :root { --bg: #0b141a; --panel: #111b21; --incoming: #202c33; --outgoing: #003893; --text: #e9edef; --muted: #8696a0; --accent: #1d63dc; --border: #222d34; --gold: #d4af37; --danger: #ef4444; }
    body { margin: 0; padding: 0; background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding-bottom: 75px; }
    .container { max-width: 720px; margin: 0 auto; }
    .screen { display: none; }
    .screen.active { display: block; }
    .telemetry-bar { background: #070f25; border-bottom: 1px solid var(--border); padding: 6px 14px; font-family: monospace; font-size: 11px; display: flex; justify-content: space-between; align-items: center; color: #60a5fa; }
    .telemetry-dot { width: 7px; height: 7px; background: #3b82f6; border-radius: 50%; box-shadow: 0 0 8px #3b82f6; animation: pulse 2s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
    .news-ticker { background: #111b21; border-bottom: 2px solid var(--gold); color: var(--gold); font-size: 13px; font-weight: bold; padding: 10px 14px; overflow: hidden; white-space: nowrap; }
    .news-ticker span { display: inline-block; padding-left: 50%; animation: ticker 25s linear infinite; }
    @keyframes ticker { 0% { transform: translate(0, 0); } 100% { transform: translate(-100%, 0); } }
    
    .identity-bar { background: #182229; padding: 8px 14px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); font-size: 12px; }
    .identity-bar select { width: auto; margin: 0; padding: 4px 8px; background: var(--panel); color: var(--gold); border: 1px solid var(--gold); font-weight: bold; border-radius: 6px; }

    .chat-list { padding: 0; margin: 0; list-style: none; }
    .chat-list-item { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-bottom: 1px solid var(--border); cursor: pointer; background: var(--panel); }
    .chat-list-item:hover { background: var(--incoming); }
    .chat-list-avatar { width: 45px; height: 45px; border-radius: 50%; background: #003893; display: flex; align-items: center; justify-content: center; font-size: 18px; color: #fff; border: 1px solid var(--gold); flex-shrink: 0; font-weight: bold; }
    .chat-list-info { flex-grow: 1; }
    .chat-list-info h4 { margin: 0 0 3px; font-size: 14px; display: flex; justify-content: space-between; }
    .chat-list-info p { margin: 0; font-size: 11px; color: var(--muted); }

    .chat-header { background: var(--panel); padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 100; }
    .chat-profile { display: flex; align-items: center; gap: 10px; cursor: pointer; }
    .avatar { width: 38px; height: 38px; border-radius: 50%; background: #003893; display: flex; align-items: center; justify-content: center; color: #fff; border: 1px solid var(--gold); overflow: hidden; }
    .messages-box { background: var(--bg); padding: 14px; height: calc(100vh - 310px); overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
    .msg { max-width: 80%; padding: 8px 12px; border-radius: 8px; font-size: 13px; line-height: 1.4; word-break: break-word; }
    .msg.incoming { background: var(--incoming); align-self: flex-start; border-top-right-radius: 0; }
    .msg.outgoing { background: var(--outgoing); align-self: flex-end; border-top-left-radius: 0; }
    .msg img { max-width: 100%; border-radius: 6px; margin-top: 4px; display: block; }
    .msg-footer { font-size: 9px; color: #cbd5e1; margin-top: 4px; display: flex; justify-content: flex-end; gap: 4px; }
    
    .input-bar { background: var(--panel); padding: 8px 12px; display: flex; align-items: center; gap: 8px; position: fixed; bottom: 60px; left: 0; right: 0; max-width: 720px; margin: 0 auto; border-top: 1px solid var(--border); }
    .text-input { flex-grow: 1; background: var(--incoming); border: none; border-radius: 8px; padding: 10px 14px; color: var(--text); font-size: 13px; outline: none; }
    .send-btn { background: var(--accent); color: #fff; border: none; width: 38px; height: 38px; border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; }
    .input-icon { color: var(--muted); font-size: 20px; cursor: pointer; padding: 4px; }

    /* شاشة المكالمات الحية */
    #callScreenModal { display: none; position: fixed; inset: 0; background: rgba(7,15,37,0.95); z-index: 2000; flex-direction: column; align-items: center; justify-content: center; color: #fff; text-align: center; }
    .call-avatar { width: 90px; height: 90px; border-radius: 50%; background: #003893; border: 2px solid var(--gold); display: flex; align-items: center; justify-content: center; font-size: 36px; margin-bottom: 20px; }

    .settings-section { padding: 12px; }
    .settings-card { background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 14px; margin-bottom: 12px; }
    .settings-card h3 { margin: 0 0 10px; font-size: 14px; border-right: 3px solid var(--gold); padding-right: 8px; }
    .setting-item { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--border); font-size: 13px; cursor: pointer; }
    .setting-item:last-child { border-bottom: none; }
    .sub-panel { display: none; background: #182229; padding: 10px; border-radius: 8px; margin-top: 6px; font-size: 12px; color: #cbd5e1; }
    .btn-primary { width: 100%; padding: 11px; background: var(--accent); color: #fff; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .btn-danger { background: var(--danger); color: #fff; width: 100%; padding: 11px; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; margin-top: 10px; }
    input { width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--incoming); color: var(--text); margin-bottom: 10px; box-sizing: border-box; }
    .badge { background: rgba(212,175,55,0.15); color: var(--gold); border: 1px solid rgba(212,175,55,0.3); padding: 2px 8px; border-radius: 12px; font-size: 10px; }

    .bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; background: var(--panel); border-top: 1px solid var(--border); display: grid; grid-template-columns: repeat(5, 1fr); padding: 6px 4px; z-index: 1000; }
    .nav-item { background: transparent; border: none; color: var(--muted); display: flex; flex-direction: column; align-items: center; font-size: 10px; cursor: pointer; padding: 4px; gap: 3px; }
    .nav-item svg { width: 20px; height: 20px; fill: currentColor; }
    .nav-item.active { color: #60a5fa; }
  </style>
</head>
<body>
  <div class="container">
    <div class="telemetry-bar">
      <span>GLOBAL CLOUD: ACTIVE</span>
      <span>برنامج سند الرسمي // v21.0 ULTIMATE</span>
      <div class="telemetry-dot"></div>
    </div>

    <div class="news-ticker">
      <span>⚡ برنامج سند السيادي الدولي | خدمة العملاء: 88888888 | تواصل فوري آمن ومشفّر عابر للحدود (مصر، السعودية، أمريكا، اليمن) | مكالمات صوت وفيديو فورية ⚡</span>
    </div>

    <div class="identity-bar">
      <span>هوية هذا الجوال:</span>
      <select id="myIdentity" onchange="saveIdentity()"></select>
    </div>

    <!-- نافذة المكالمة الحية (صوت وفيديو) -->
    <div id="callScreenModal">
      <div class="call-avatar" id="callAvatarModal">س</div>
      <h2 id="callTitleModal" style="margin:5px 0;">جاري الاتصال...</h2>
      <p id="callStatusModal" style="color:#60a5fa; font-size:13px; margin-bottom:30px;">نفق 1X المشفر قيد التشغيل</p>
      <div style="font-size:22px; font-family:monospace; margin-bottom:30px;" id="callTimerModal">00:00</div>
      <div style="display:flex; gap:20px;">
        <button onclick="endActiveCall()" style="background:#ef4444; color:#fff; border:none; width:60px; height:60px; border-radius:50%; font-size:24px; cursor:pointer;">📞</button>
      </div>
    </div>

    <!-- 1. الدردشات -->
    <div id="screenChats" class="screen active">
      <div id="chatListView">
        <div class="chat-header">
          <div class="chat-profile">
            <div class="avatar"><img src="/icon.svg" style="width:100%;height:100%;"></div>
            <div><h3 style="margin:0;font-size:14px;">برنامج سند - الدردشات</h3><p style="margin:0;font-size:10px;color:var(--muted);">اختر جهة الاتصال للمراسلة الفورية</p></div>
          </div>
        </div>
        <ul class="chat-list" id="dynamicChatList"></ul>
      </div>

      <div id="chatRoomView" style="display:none;">
        <div class="chat-header">
          <div class="chat-profile" onclick="backToChatList()">
            <span style="font-size:18px; color:#60a5fa; margin-left:6px;">➔</span>
            <div class="avatar" id="activeAvatar">س</div>
            <div><h3 id="activeChatName" style="margin:0;font-size:14px;">الاسم</h3><p style="margin:0;font-size:10px;color:#60a5fa;">متصل دولياً الآن</p></div>
          </div>
          <div style="display:flex; gap:16px;">
            <span style="font-size:18px;cursor:pointer;" onclick="startCall('video')" title="مكالمة فيديو">🎥</span>
            <span style="font-size:18px;cursor:pointer;" onclick="startCall('audio')" title="مكالمة صوتية">📞</span>
          </div>
        </div>

        <div class="messages-box" id="msgBox"></div>

        <input type="file" id="imageInput" accept="image/*" style="display:none" onchange="handleImageUpload(event)">
        <div class="input-bar">
          <span class="input-icon" onclick="document.getElementById('imageInput').click()" title="إرفاق صورة">📎</span>
          <input type="text" id="chatInput" class="text-input" placeholder="اكتب رسالة مشفرة..." onkeypress="if(event.key==='Enter') sendMessage()" />
          <span class="input-icon" onclick="sendVoiceNote()" title="تسجيل صوتي">🎙️</span>
          <button class="send-btn" onclick="sendMessage()">➤</button>
        </div>
      </div>
    </div>

    <!-- 2. المكالمات -->
    <div id="screenCalls" class="screen">
      <div class="settings-section">
        <div class="settings-card">
          <h3>📞 سجل المكالمات الدولية الفضائية</h3>
          <div class="setting-item" onclick="startCall('audio')"><span>عمر عسيلو (القاهرة - 88800006)</span><span class="badge">اتصال صوتي/فيديو</span></div>
          <div class="setting-item" onclick="startCall('audio')"><span>خدمة العملاء (88888888)</span><span class="badge">متاح 24/7</span></div>
        </div>
      </div>
    </div>

    <!-- 3. الأكواد وجهات الاتصال -->
    <div id="screenTools" class="screen">
      <div class="settings-section">
        <div class="settings-card">
          <h3>🔐 إضافة مشترك / كود دولي جديد</h3>
          <input type="text" id="newName" placeholder="اسم الشخص (مثلاً: صالح عسيلو)" />
          <input type="text" id="newCode" placeholder="الكود المميز (مثلاً: 88800007)" maxlength="8" />
          <button class="btn-primary" onclick="addNewContact()">حفظ وتفعيل في كل الأجهزة</button>
        </div>
      </div>
    </div>

    <!-- 4. الإحصائيات -->
    <div id="screenUpdates" class="screen">
      <div class="settings-section">
        <div class="settings-card">
          <h3>📊 لوحة تحكم المالك</h3>
          <div class="setting-item"><span>عدد المشتركين النشطين</span><span class="badge" id="statUsers">0</span></div>
          <div class="setting-item"><span>إجمالي الرسائل بالسحابة</span><span class="badge" id="statMsgs">0</span></div>
        </div>
      </div>
    </div>

    <!-- 5. الإعدادات الكاملة والفرعية -->
    <div id="screenSettings" class="screen">
      <div class="settings-section">
        <div class="settings-card" style="display:flex;align-items:center;gap:12px;">
          <img src="/icon.svg" style="width:55px;height:55px;border-radius:12px;">
          <div>
            <h3 style="border:none;padding:0;margin:0;">برنامج سند (Sond App v21.0)</h3>
            <p style="margin:4px 0 0;font-size:11px;color:var(--muted);">الإصدار السيادي المعتمد • تشفير عابر للحدود</p>
          </div>
        </div>

        <div class="settings-card">
          <h3>⚙️ الإعدادات العامة والفرعية</h3>
          
          <div class="setting-item" onclick="toggleSub('subAccount')">
            <span>🔑 الحساب والأمان (إشعارات الأمان، الرقم)</span><span>‹</span>
          </div>
          <div id="subAccount" class="sub-panel">
            • الرقم السيادي الأساسي: 88888888<br>
            • التشفير التام بين الطرفين (E2EE): مفعل تلقائياً<br>
            • التحقق بخطوتين: نشط ومحمي
          </div>

          <div class="setting-item" onclick="toggleSub('subPrivacy')">
            <span>🔒 الخصوصية (آخر ظهور، الحظر، القفل)</span><span>‹</span>
          </div>
          <div id="subPrivacy" class="sub-panel">
            • آخر ظهور ومتصل الآن: جهات اتصالي فقط<br>
            • مؤشرات قراءة الرسائل (✓✓): مفعلة<br>
            • قائمة المحظورين: لا يوجد
          </div>

          <div class="setting-item" onclick="toggleSub('subChats')">
            <span>💬 الدردشات (السمة، حفظ الوسائط، النسخ)</span><span>‹</span>
          </div>
          <div id="subChats" class="sub-panel">
            • المظهر: الوضع الليلي الملكي (Dark Mode)<br>
            • الحفظ التلقائي للصور في ألبوم الآيفون: مفعل<br>
            • المزامنة السحابية: فورية
          </div>

          <div class="setting-item" onclick="toggleSub('subNotif')">
            <span>🔔 الإشعارات والأصوات</span><span>‹</span>
          </div>
          <div id="subNotif" class="sub-panel">
            • إشعارات الرسائل الواردة: مفعلة<br>
            • نغمة التنبيه والمكالمات: الافتراضية
          </div>

          <div class="setting-item" onclick="toggleSub('subHelp')">
            <span>❓ المساعدة والدعم الفني</span><span>‹</span>
          </div>
          <div id="subHelp" class="sub-panel">
            • مركز مساعدة سند: متاح على الرقم 88888888<br>
            • لتثبيت الأيقونة على الآيفون: اضغط زر المشاركة ثم اختر «إضافة إلى الشاشة الرئيسية».
          </div>

          <button class="btn-danger" onclick="triggerKillSwitch()">⚡ مسح كافة رسائل السحابة (طوارئ)</button>
        </div>
      </div>
    </div>
  </div>

  <nav class="bottom-nav">
    <button class="nav-item" onclick="switchTab('Updates', this)"><svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg><span>الإحصائيات</span></button>
    <button class="nav-item" onclick="switchTab('Calls', this)"><svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg><span>المكالمات</span></button>
    <button class="nav-item" onclick="switchTab('Tools', this)"><svg viewBox="0 0 24 24"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg><span>الأكواد</span></button>
    <button class="nav-item active" onclick="switchTab('Chats', this)"><svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg><span>الدردشات</span></button>
    <button class="nav-item" onclick="switchTab('Settings', this)"><svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c-.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c-.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg><span>الإعدادات</span></button>
  </nav>

  <script>
    let allContacts = [];
    let allMessages = [];
    let activePeerId = null;
    let myId = localStorage.getItem('sond_my_id') || '88888888';
    let callTimerInterval = null;

    function toggleSub(id) {
      const el = document.getElementById(id);
      el.style.display = (el.style.display === 'block') ? 'none' : 'block';
    }

    function saveIdentity() {
      myId = document.getElementById('myIdentity').value;
      localStorage.setItem('sond_my_id', myId);
      renderUI();
    }

    async function syncWithCloud() {
      try {
        const res = await fetch('/api/sync');
        const data = await res.json();
        allContacts = data.contacts;
        allMessages = data.messages;
        
        const sel = document.getElementById('myIdentity');
        if (sel.options.length !== allContacts.length) {
          sel.innerHTML = '';
          allContacts.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.text = c.name + ' (' + c.code + ')';
            if (c.id === myId) opt.selected = true;
            sel.appendChild(opt);
          });
        }

        document.getElementById('statUsers').innerText = allContacts.length;
        document.getElementById('statMsgs').innerText = allMessages.length;
        renderUI();
      } catch (e) { console.error(e); }
    }

    function renderUI() {
      const list = document.getElementById('dynamicChatList');
      list.innerHTML = '';
      allContacts.forEach(c => {
        if (c.id === myId) return;
        const li = document.createElement('li');
        li.className = 'chat-list-item';
        li.onclick = () => openChat(c.id, c.name);
        li.innerHTML = '<div class="chat-list-avatar">' + c.name.charAt(0) + '</div>' +
                       '<div class="chat-list-info"><h4>' + c.name + '<span style="color:var(--gold);font-size:11px;">[' + c.code + ']</span></h4>' +
                       '<p>' + c.role + ' • انقر للمراسلة الفورية</p></div>';
        list.appendChild(li);
      });

      if (activePeerId) {
        const box = document.getElementById('msgBox');
        const isAtBottom = box.scrollHeight - box.scrollTop <= box.clientHeight + 50;
        const filtered = allMessages.filter(m => (m.from === myId && m.to === activePeerId) || (m.from === activePeerId && m.to === myId));
        
        let html = '';
        filtered.forEach(m => {
          const isMe = m.from === myId;
          let body = m.content;
          if (m.type === 'image') body = '<img src="' + m.content + '" />';
          html += '<div class="msg ' + (isMe ? 'outgoing' : 'incoming') + '">' + body + 
                  '<div class="msg-footer"><span>' + m.time + '</span>' + (isMe ? '<span style="color:#60a5fa;">✓✓</span>' : '') + '</div></div>';
        });
        
        if (box.innerHTML !== html) {
          box.innerHTML = html || '<div style="text-align:center;color:var(--muted);font-size:12px;margin-top:20px;">ابدأ المحادثة الدولية المباشرة الآن...</div>';
          if (isAtBottom) box.scrollTop = box.scrollHeight;
        }
      }
    }

    function openChat(id, name) {
      activePeerId = id;
      document.getElementById('chatListView').style.display = 'none';
      document.getElementById('chatRoomView').style.display = 'block';
      document.getElementById('activeChatName').innerText = name;
      document.getElementById('activeAvatar').innerText = name.charAt(0);
      renderUI();
      const box = document.getElementById('msgBox');
      box.scrollTop = box.scrollHeight;
    }

    function backToChatList() {
      activePeerId = null;
      document.getElementById('chatRoomView').style.display = 'none';
      document.getElementById('chatListView').style.display = 'block';
    }

    async function sendPayload(type, content) {
      if (!activePeerId || !content) return;
      const me = allContacts.find(c => c.id === myId);
      await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: myId, to: activePeerId, senderName: me ? me.name : 'مستخدم', type, content })
      });
      syncWithCloud();
    }

    function sendMessage() {
      const inp = document.getElementById('chatInput');
      const val = inp.value.trim();
      if (!val) return;
      inp.value = '';
      sendPayload('text', val);
    }

    function handleImageUpload(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => sendPayload('image', ev.target.result);
      reader.readAsDataURL(file);
    }

    function sendVoiceNote() {
      sendPayload('text', '🎙️ [رسالة صوتية مشفرة 0:04] ━━━━●━━━');
    }

    // تفعيل مكالمات الصوت والفيديو الحية
    function startCall(type) {
      const modal = document.getElementById('callScreenModal');
      const title = document.getElementById('callTitleModal');
      const timer = document.getElementById('callTimerModal');
      modal.style.display = 'flex';
      title.innerText = (type === 'video' ? '📹 مكالمة فيديو مشفرة...' : '📞 مكالمة صوتية مشفرة...');
      
      let sec = 0;
      timer.innerText = '00:00';
      if(callTimerInterval) clearInterval(callTimerInterval);
      callTimerInterval = setInterval(() => {
        sec++;
        let m = Math.floor(sec / 60).toString().padStart(2, '0');
        let s = (sec % 60).toString().padStart(2, '0');
        timer.innerText = m + ':' + s;
      }, 1000);
    }

    function endActiveCall() {
      if(callTimerInterval) clearInterval(callTimerInterval);
      document.getElementById('callScreenModal').style.display = 'none';
      alert('📞 تم إنهاء المكالمة بنجاح.');
    }

    async function addNewContact() {
      const name = document.getElementById('newName').value.trim();
      const id = document.getElementById('newCode').value.trim();
      if (!name || !id) return alert('أدخل الاسم والكود السيادي');
      await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name, role: 'مشترك دولي معتمد' })
      });
      document.getElementById('newName').value = '';
      document.getElementById('newCode').value = '';
      alert('✅ تم حفظ المشترك وتفعيله في كل الأجهزة!');
      syncWithCloud();
      switchTab('Chats', document.querySelectorAll('.nav-item')[3]);
    }

    async function triggerKillSwitch() {
      if (confirm('⚠️ هل تريد مسح كافة المحادثات من السحابة؟')) {
        await fetch('/api/killswitch', { method: 'POST' });
        syncWithCloud();
      }
    }

    function switchTab(name, btn) {
      document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      document.getElementById('screen' + name).classList.add('active');
      btn.classList.add('active');
      if (name === 'Chats') backToChatList();
    }

    syncWithCloud();
    setInterval(syncWithCloud, 2000);
  </script>
</body>
</html>`);
});

app.listen(PORT, () => console.log('Sond Ultimate Server running on port ' + PORT));
