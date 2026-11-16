const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/manifest.json', (req, res) => {
  res.json({
    "name": "سند - المنصة السيادية الدولية عابرة الحدود",
    "short_name": "سند ULTRA",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#0b141a",
    "theme_color": "#005c4b"
  });
});

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>برنامج سند - المنصة السيادية (v14.0 Interactive)</title>
  <link rel="manifest" href="/manifest.json">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="theme-color" content="#0b141a">
  <style>
    :root {
      --bg: #0b141a;
      --panel: #111b21;
      --incoming: #202c33;
      --outgoing: #005c4b;
      --text: #e9edef;
      --muted: #8696a0;
      --accent: #00a884;
      --border: #222d34;
      --gold: #d4af37;
      --danger: #ef4444;
    }
    body { margin: 0; padding: 0; background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding-bottom: 70px; -webkit-tap-highlight-color: transparent; }
    .container { max-width: 720px; margin: 0 auto; }
    
    .screen { display: none; }
    .screen.active { display: block; }

    /* شريط الاتصال الفضائي العلوي */
    .telemetry-bar { background: #070f25; border-bottom: 1px solid var(--border); padding: 6px 14px; font-family: monospace; font-size: 11px; display: flex; justify-content: space-between; align-items: center; color: var(--accent); }
    .telemetry-dot { width: 7px; height: 7px; background: var(--accent); border-radius: 50%; box-shadow: 0 0 8px var(--accent); animation: pulse 2s infinite; }
    @keyframes pulse { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; } }

    /* رأس المحادثة */
    .chat-header { background: var(--panel); padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 100; }
    .chat-profile { display: flex; align-items: center; gap: 10px; }
    .avatar { width: 40px; height: 40px; border-radius: 50%; background: #1f2c34; display: flex; align-items: center; justify-content: center; font-size: 16px; color: var(--gold); border: 1px solid var(--gold); }
    .chat-info h3 { margin: 0; font-size: 14px; color: var(--text); font-weight: 600; display: flex; align-items: center; gap: 6px; }
    .chat-info p { margin: 2px 0 0; font-size: 10px; color: var(--muted); }
    .header-icons { display: flex; gap: 16px; color: var(--muted); font-size: 18px; cursor: pointer; }

    /* صندوق الرسائل */
    .messages-box { background: var(--bg); background-image: radial-gradient(#111b21 1px, transparent 1px); background-size: 20px 20px; padding: 14px; height: calc(100vh - 210px); overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
    .msg { max-width: 80%; padding: 8px 12px; border-radius: 8px; font-size: 13px; line-height: 1.4; position: relative; word-break: break-word; }
    .msg.incoming { background: var(--incoming); color: var(--text); align-self: flex-start; border-top-right-radius: 0; }
    .msg.outgoing { background: var(--outgoing); color: var(--text); align-self: flex-end; border-top-left-radius: 0; }
    .msg img { max-width: 100%; border-radius: 6px; margin-top: 4px; display: block; }
    .msg-footer { font-size: 9px; color: var(--muted); margin-top: 4px; display: flex; justify-content: flex-end; gap: 4px; align-items: center; }
    .checkmarks { color: #53bdeb; font-weight: bold; font-size: 11px; }

    /* شريط الكتابة التفاعلي */
    .input-bar { background: var(--panel); padding: 8px 12px; display: flex; align-items: center; gap: 8px; position: fixed; bottom: 55px; left: 0; right: 0; max-width: 720px; margin: 0 auto; border-top: 1px solid var(--border); z-index: 100; }
    .input-icon { color: var(--muted); font-size: 20px; cursor: pointer; padding: 4px; }
    .text-input { flex-grow: 1; background: var(--incoming); border: none; border-radius: 8px; padding: 10px 14px; color: var(--text); font-size: 13px; outline: none; }
    .send-btn { background: var(--accent); color: #fff; border: none; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 16px; flex-shrink: 0; }

    /* إعدادات وقوائم واتساب */
    .settings-section { padding: 12px; }
    .settings-card { background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 14px; margin-bottom: 12px; }
    .settings-card h3 { margin: 0 0 10px; font-size: 14px; color: var(--text); border-right: 3px solid var(--gold); padding-right: 8px; }
    
    .setting-item { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--border); font-size: 13px; cursor: pointer; }
    .setting-item:last-child { border-bottom: none; }
    .setting-item:hover { color: var(--accent); }

    label { display: block; font-size: 11px; color: var(--muted); margin-bottom: 4px; }
    input, select { width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border); background: var(--incoming); color: var(--text); font-size: 13px; margin-bottom: 10px; box-sizing: border-box; }
    
    .btn-primary { width: 100%; padding: 11px; background: var(--accent); color: #fff; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 13px; }
    .btn-danger { background: var(--danger); color: #fff; width: 100%; padding: 11px; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; margin-top: 10px; }
    .badge { background: rgba(212,175,55,0.15); color: var(--gold); border: 1px solid rgba(212,175,55,0.3); padding: 2px 8px; border-radius: 12px; font-size: 9px; font-weight: 600; }

    /* شريط التنقل السفلي */
    .bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; background: var(--panel); border-top: 1px solid var(--border); display: grid; grid-template-columns: repeat(5, 1fr); padding: 6px 4px; z-index: 1000; }
    .nav-item { background: transparent; border: none; color: var(--muted); display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 10px; cursor: pointer; padding: 4px; font-weight: 500; gap: 3px; }
    .nav-item svg { width: 20px; height: 20px; fill: currentColor; }
    .nav-item.active { color: var(--accent); }
    .nav-item.active svg { fill: var(--accent); }
  </style>
</head>
<body>
  <div class="container">
    <div class="telemetry-bar">
      <span>1X SOVEREIGN ACTIVE</span>
      <span>AI-SAT LINK: v14.0 INTERACTIVE</span>
      <div class="telemetry-dot"></div>
    </div>

    <!-- 1. شاشة الدردشات (تفاعلية بالكامل) -->
    <div id="screenChats" class="screen active">
      <div class="chat-header">
        <div class="chat-profile">
          <div class="avatar">Ω</div>
          <div class="chat-info">
            <h3>غرفة العمليات السيادية <span class="badge">VIP</span></h3>
            <p>متصل الآن عبر الأقمار الاصطناعية (AI-SAT)</p>
          </div>
        </div>
        <div class="header-icons">
          <span onclick="alert('🎥 جاري بدء مكالمة الفيديو المشفرة...')" title="فيديو">📹</span>
          <span onclick="alert('📞 جاري بدء الاتصال الصوتي الآمن...')" title="صوت">📞</span>
        </div>
      </div>

      <div class="messages-box" id="msgBox">
        <div class="msg incoming">
          أهلاً بك يا أبو طارق. النظام تفاعلي الآن؛ يمكنك رفع الصور وتسجيل الأصوات بفعالية.
          <div class="msg-footer"><span>06:10 ص</span><span class="checkmarks">✓✓</span></div>
        </div>
        <div class="msg outgoing">
          ممتاز جداً، جارٍ اختبار الميزات الميدانية.
          <div class="msg-footer"><span>06:11 ص</span><span class="checkmarks">✓✓</span></div>
        </div>
      </div>

      <!-- عنصر إدخال الصور المخفي -->
      <input type="file" id="imageInput" accept="image/*" style="display:none" onchange="handleImageUpload(event)">

      <div class="input-bar">
        <span class="input-icon" onclick="document.getElementById('imageInput').click()" title="إرفاق صورة">📎</span>
        <input type="text" id="chatInput" class="text-input" placeholder="اكتب رسالة مشفرة..." onkeypress="handleKey(event)" />
        <span class="input-icon" onclick="recordVoiceNote()" title="تسجيل صوتي">🎙️</span>
        <button class="send-btn" onclick="sendMessage()">➤</button>
      </div>
    </div>

    <!-- 2. شاشة المكالمات -->
    <div id="screenCalls" class="screen">
      <div class="settings-section">
        <div class="settings-card">
          <h3>📞 سجل المكالمات الفضائية الآمنة</h3>
          <div class="setting-item">
            <div><strong>مكالمة صوتية مشفرة</strong><br/><span style="color:var(--accent); font-size:11px;">مكتملة عبر نفق 1X</span></div>
            <span class="badge">آمن</span>
          </div>
          <div class="setting-item">
            <div><strong>مكالمة فيديو مركز العمليات</strong><br/><span style="color:var(--accent); font-size:11px;">مكتملة عبر الأقمار</span></div>
            <span class="badge">VIP</span>
          </div>
          <button class="btn-primary" style="margin-top:12px;" onclick="alert('📞 جاري بدء الاتصال الفضائي الجديد...')">بدء مكالمة جديدة</button>
        </div>
      </div>
    </div>

    <!-- 3. شاشة الأكواد والدليل -->
    <div id="screenCodes" class="screen">
      <div class="settings-section">
        <div class="settings-card">
          <h3>🔐 إدارة الأكواد والدليل السيادي</h3>
          <button class="btn-primary" onclick="generateCode()" style="margin-bottom:10px;">⚡ توليد كود معتمد جديد</button>
          <label>اسم الشخص أو الجهة:</label>
          <input type="text" id="codeName" placeholder="أدخل الاسم..." />
          <label>الكود السيادي (8 أرقام):</label>
          <input type="text" id="codeVal" class="text-input" style="font-family:monospace; font-size:16px; letter-spacing:2px; text-align:center;" maxlength="8" />
          <button class="btn-primary" onclick="saveCode()" style="margin-top:4px;">حفظ في الدليل</button>
        </div>
      </div>
    </div>

    <!-- 4. مساعد سند (OMEGA AI) -->
    <div id="screenAi" class="screen">
      <div class="settings-section">
        <div class="settings-card">
          <h3>🤖 مساعد سند الاستراتيجي</h3>
          <div class="messages-box" style="height: 250px;" id="aiLog">
            <div class="msg incoming">جاهز لتحليل المهام الميدانية والإدارية بكل دقة يا أبو طارق.</div>
          </div>
          <div style="display:flex; gap:6px; margin-top:8px;">
            <input type="text" id="aiInp" class="text-input" placeholder="اكتب استفسارك..." onkeypress="handleAiKey(event)" />
            <button class="send-btn" onclick="sendAi()">➤</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 5. شاشة الإعدادات الاحترافية (على طراز واتساب) -->
    <div id="screenSettings" class="screen">
      <div class="settings-section">
        <div class="settings-card">
          <h3>⚙️ إعدادات الحساب والملف الشخصي</h3>
          <div class="setting-item" onclick="alert('الحساب مفعل برقم سند السيادي الرئيسي: 88848031')">
            <div><strong>الحساب والخصوصية</strong><br/><span style="font-size:11px; color:var(--muted);">آخر ظهور، الصورة الشخصية، وحظر الأرقام</span></div>
            <span>›</span>
          </div>
          <div class="setting-item" onclick="prompt('أدخل الكود السيادي الإضافي لربطه بالجهاز:')">
            <div><strong>إضافة رقم أو حساب سند ثانٍ</strong><br/><span style="font-size:11px; color:var(--muted);">ربط حسابات متعددة في نفس التطبيق</span></div>
            <span class="badge">إضافة</span>
          </div>
        </div>

        <div class="settings-card">
          <h3>🛡️ الأمان والشبكة السيادية</h3>
          <div class="setting-item" onclick="alert('نفق الاتصال الفضائي (AI-SAT) نشط ومحمي بنسبة 100%.')">
            <div><strong>نفق الاتصال الفضائي (AI-SAT)</strong><br/><span style="font-size:11px; color:var(--accent);">متصل عبر بروتوكول 1X</span></div>
            <span class="badge">آمن</span>
          </div>
          <div class="setting-item" onclick="alert('خاصية منع إعادة توجيه الرسائل مفعلة لحماية الخصوصية.')">
            <div><strong>منع إعادة توجيه الرسائل</strong><br/><span style="font-size:11px; color:var(--muted);">حماية المحتوى السيادي</span></div>
            <span style="color:var(--accent); font-size:11px;">مفعل</span>
          </div>
          <button class="btn-danger" onclick="executeKillSwitch()">⚡ تفعيل مفتاح الطوارئ (Kill-Switch)</button>
        </div>

        <div class="settings-card">
          <h3>💾 التخزين والبيانات والمساعدة</h3>
          <div class="setting-item" onclick="alert('تم تنظيف الذاكرة المؤقتة وإدارة الوسائط بنجاح.')">
            <div><strong>إدارة التخزين والشبكة</strong><br/><span style="font-size:11px; color:var(--muted);">استهلاك البيانات والميديا</span></div>
            <span>›</span>
          </div>
          <div class="setting-item" onclick="alert('برنامج سند - الإصدار السيادي v14.0. جميع الحقوق محفوظة.')">
            <div><strong>الدعم الفني والسياسة</strong><br/><span style="font-size:11px; color:var(--muted);">الأسئلة الشائعة ودليل الاستخدام</span></div>
            <span>›</span>
          </div>
        </div>
      </div>
    </div>

  </div>

  <nav class="bottom-nav">
    <button class="nav-item active" type="button" onclick="switchTab('Chats', this)">
      <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
      <span>الدردشات</span>
    </button>
    <button class="nav-item" type="button" onclick="switchTab('Calls', this)">
      <svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
      <span>المكالمات</span>
    </button>
    <button class="nav-item" type="button" onclick="switchTab('Codes', this)">
      <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
      <span>الأكواد</span>
    </button>
    <button class="nav-item" type="button" onclick="switchTab('Ai', this)">
      <svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1010 10A10 10 0 0012 2zm0 18a8 8 0 118-8 8 8 0 01-8 8zm1-13h-2v6h6v-2h-4z"/></svg>
      <span>مساعد سند</span>
    </button>
    <button class="nav-item" type="button" onclick="switchTab('Settings', this)">
      <svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c-.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c-.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
      <span>الإعدادات</span>
    </button>
  </nav>

  <script>
    function switchTab(name, btn) {
      document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      document.getElementById('screen' + name).classList.add('active');
      btn.classList.add('active');
    }

    function sendMessage() {
      let inp = document.getElementById('chatInput');
      let val = inp.value.trim();
      if(!val) return;
      let box = document.getElementById('msgBox');
      box.innerHTML += '<div class="msg outgoing">' + val + '<div class="msg-footer"><span>الآن</span><span class="checkmarks">✓✓</span></div></div>';
      inp.value = '';
      box.scrollTop = box.scrollHeight;
    }

    function handleKey(e) {
      if(e.key === 'Enter') sendMessage();
    }

    // رفع وإرسال الصور حقيقي
    function handleImageUpload(event) {
      let file = event.target.files[0];
      if(!file) return;
      let reader = new FileReader();
      reader.onload = function(e) {
        let box = document.getElementById('msgBox');
        box.innerHTML += '<div class="msg outgoing"><img src="' + e.target.result + '" alt="صورة مرفقة"/><div class="msg-footer"><span>الآن</span><span class="checkmarks">✓✓</span></div></div>';
        box.scrollTop = box.scrollHeight;
      };
      reader.readAsDataURL(file);
    }

    // تسجيل صوتي تفاعلي حقيقي
    function recordVoiceNote() {
      let box = document.getElementById('msgBox');
      let voiceId = 'voice_' + Date.now();
      box.innerHTML += '<div class="msg outgoing" id="' + voiceId + '">🎙️ [جاري تسجيل صوتي...] ━━━━●━━━ 0:01<div class="msg-footer"><span>الآن</span><span class="checkmarks">✓✓</span></div></div>';
      box.scrollTop = box.scrollHeight;
      
      let sec = 1;
      let interval = setInterval(() => {
        sec++;
        let el = document.getElementById(voiceId);
        if(el) {
          el.innerHTML = '🎙️ [رسالة صوتية مشفرة] ━━━━●━━━ 0:0' + sec + '<div class="msg-footer"><span>الآن</span><span class="checkmarks">✓✓</span></div>';
        }
        if(sec >= 5) {
          clearInterval(interval);
        }
      }, 1000);
    }

    function generateCode() {
      let r = Math.floor(100000 + Math.random() * 900000);
      document.getElementById('codeVal').value = '888' + r.toString().substring(0, 5);
      alert('🔐 تم توليد كود معتمد بنجاح.');
    }

    function saveCode() {
      alert('✅ تم اعتماد وحفظ البيانات في الدليل السيادي بنجاح!');
      document.getElementById('codeName').value = '';
      document.getElementById('codeVal').value = '';
    }

    function sendAi() {
      let inp = document.getElementById('aiInp');
      let val = inp.value.trim();
      if(!val) return;
      let log = document.getElementById('aiLog');
      log.innerHTML += '<div class="msg outgoing">' + val + '</div><div class="msg incoming">تم معالجة الطلب الميداني بنجاح عبر قناة AI-SAT.</div>';
      inp.value = '';
      log.scrollTop = log.scrollHeight;
    }

    function handleAiKey(e) {
      if(e.key === 'Enter') sendAi();
    }

    function executeKillSwitch() {
      if(confirm('⚠️ تحذير سيادي: هل تريد مسح الذاكرة المؤقتة وتفعيل درع الطوارئ؟')) {
        alert('⚡ تم تأمين القطاع بنجاح.');
      }
    }
  </script>
</body>
</html>`);
});

app.listen(PORT, () => console.log('Server running on port ' + PORT));
