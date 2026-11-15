const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ملف التثبيت السيادي PWA للإصدار التاسع
app.get('/manifest.json', (req, res) => {
  res.json({
    "name": "سند - النظام العصبي السيادي العالمي",
    "short_name": "سند OMEGA",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#030712",
    "theme_color": "#1e3a8a",
    "icons": [
      {
        "src": "https://img.icons8.com/clouds/512/security-checked.png",
        "sizes": "512x512",
        "type": "image/png"
      }
    ]
  });
});

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="ar" dir="rtl" id="htmlRoot">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>برنامج سند - النظام العصبي السيادي (v9.0 OMEGA)</title>
  <link rel="manifest" href="/manifest.json">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="theme-color" content="#1e3a8a">
  <style>
    :root {
      --primary: #1e3a8a;
      --primary-hover: #172554;
      --bg: #030712;
      --card: #0f172a;
      --text: #f8fafc;
      --muted: #94a3b8;
      --border: #1e293b;
      --accent: #38bdf8;
      --gold: #f59e0b;
      --quantum: #8b5cf6;
      --emerald: #10b981;
      --danger: #ef4444;
    }
    body { margin: 0; padding: 0; background: var(--bg); color: var(--text); font-family: sans-serif; padding-bottom: 85px; -webkit-tap-highlight-color: transparent; }
    .container { max-width: 720px; margin: 0 auto; padding: 16px; }
    
    .telemetry-bar { background: #020617; border: 1px solid var(--quantum); border-radius: 8px; padding: 8px 12px; margin-bottom: 12px; font-family: monospace; font-size: 11px; display: flex; justify-content: space-between; align-items: center; color: var(--accent); box-shadow: 0 0 15px rgba(139,92,246,0.2); }
    .telemetry-dot { width: 8px; height: 8px; background: var(--emerald); border-radius: 50%; box-shadow: 0 0 10px var(--emerald); animation: pulse 1.5s infinite; }
    @keyframes pulse { 0% { opacity: 0.3; } 50% { opacity: 1; } 100% { opacity: 0.3; } }

    .header-compact { display: flex; align-items: center; justify-content: space-between; background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 12px 16px; margin-bottom: 14px; }
    .header-title h2 { margin: 0; font-size: 18px; color: var(--text); }
    .header-title p { margin: 2px 0 0; font-size: 11px; color: var(--accent); }

    .screen { display: none; }
    .screen.active { display: block; }

    .card-box { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 16px; margin-bottom: 12px; }
    .card-box h3 { margin: 0 0 12px; font-size: 14px; color: var(--text); border-right: 4px solid var(--gold); padding-right: 8px; display: flex; justify-content: space-between; align-items: center; }

    label { display: block; margin-bottom: 6px; font-weight: bold; font-size: 12px; color: var(--muted); }
    input, select, textarea { width: 100%; padding: 11px; border-radius: 8px; border: 1px solid var(--border); margin-bottom: 10px; background: #030712; color: var(--text); font-size: 13px; box-sizing: border-box; }
    input:focus, select:focus, textarea:focus { border-color: var(--accent); outline: none; }

    .unified-code-input { font-family: monospace !important; font-size: 18px !important; font-weight: bold; letter-spacing: 4px; text-align: center; color: var(--accent) !important; background: #020617 !important; border: 2px solid var(--border) !important; }
    .unified-code-input:focus { border-color: var(--gold) !important; box-shadow: 0 0 12px rgba(245,158,11,0.4); }

    .btn-submit { width: 100%; padding: 12px; background: var(--primary); color: #fff; border: 1px solid var(--accent); border-radius: 8px; font-size: 14px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.4); }
    .btn-submit:hover { background: var(--primary-hover); }
    .btn-call { background: #312e81; border-color: var(--quantum); margin-top: 8px; }
    .btn-ai { background: linear-gradient(135deg, #4f46e5, var(--quantum)); border-color: var(--accent); margin-top: 8px; }
    .btn-action { background: #065f46; border-color: var(--emerald); padding: 6px 12px; font-size: 11px; width: auto; margin-left: 4px; display: inline-block; }
    .btn-danger { background: #991b1b; border-color: var(--danger); margin-top: 8px; }
    .btn-install { background: linear-gradient(135deg, var(--gold), #d97706); color: #000; border: none; margin-bottom: 12px; display: none; }

    /* Bottom Navigation Bar */
    .bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; background: #020617; border-top: 1px solid var(--border); display: grid; grid-template-columns: repeat(5, 1fr); padding: 8px 4px; z-index: 1000; box-shadow: 0 -10px 25px rgba(0,0,0,0.9); }
    .nav-item { background: transparent; border: none; color: var(--muted); display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 10px; cursor: pointer; padding: 4px; font-weight: bold; gap: 4px; }
    .nav-item svg { width: 20px; height: 20px; fill: currentColor; }
    .nav-item.active { color: var(--accent); }
    .nav-item.active svg { fill: var(--accent); }

    .list-item { background: #030712; border: 1px solid var(--border); border-radius: 8px; padding: 10px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; }
    .badge-gold { background: rgba(245, 158, 11, 0.15); color: var(--gold); border: 1px solid var(--gold); padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: bold; }
    
    .profile-card { text-align: center; padding: 20px; background: var(--card); border: 1px solid var(--border); border-radius: 12px; margin-bottom: 12px; }
    .profile-avatar { width: 64px; height: 64px; background: linear-gradient(135deg, var(--primary), var(--quantum)); border-radius: 50%; margin: 0 auto 10px; display: flex; align-items: center; justify-content: center; border: 2px solid var(--gold); font-size: 24px; color: #fff; font-weight: bold; box-shadow: 0 0 20px rgba(139,92,246,0.4); }
    
    .ai-chat-box { background: #020617; border: 1px solid var(--quantum); border-radius: 8px; padding: 12px; min-height: 140px; max-height: 220px; overflow-y: auto; margin-bottom: 10px; font-size: 12px; color: var(--accent); }
    
    .chat-container { background: #020617; border: 1px solid var(--border); border-radius: 8px; padding: 10px; height: 240px; overflow-y: auto; margin-bottom: 10px; display: flex; flex-direction: column; gap: 8px; }
    .chat-bubble { padding: 8px 12px; border-radius: 8px; font-size: 12px; max-width: 80%; line-height: 1.4; position: relative; }
    .chat-bubble.outgoing { background: var(--primary); color: #fff; align-self: flex-end; border-bottom-left-radius: 0; }
    .chat-bubble.incoming { background: #1e293b; color: var(--text); align-self: flex-start; border-bottom-right-radius: 0; }
    .self-destruct-timer { font-size: 9px; color: var(--gold); margin-top: 4px; text-align: left; font-family: monospace; }
  </style>
</head>
<body>
  <div class="container">
    <div class="telemetry-bar">
      <span>AI-SAT OMEGA LINK: <strong>SECURED // v9.0 NEURAL</strong></span>
      <div style="display:flex; align-items:center; gap:6px;">
        <span id="txtOnline">QUANTUM ACTIVE</span>
        <div class="telemetry-dot"></div>
      </div>
    </div>

    <button type="button" class="btn-submit btn-install" id="installBtn">⬇ تثبيت تطبيق سند على الشاشة الرئيسية (App)</button>

    <!-- 1. شاشة الأكواد والبصمة الكمومية -->
    <div id="screenCodes" class="screen active">
      <div class="header-compact">
        <div class="header-title">
          <h2>بصمة الوعي والأسماء السيادية</h2>
          <p>تشفير كمومي قابل للتكيف وحماية ضد التتبع</p>
        </div>
      </div>
      
      <div class="card-box">
        <h3>تسجيل اسم وكود سيادي فريد (8 خانات)</h3>
        <form id="codeForm">
          <label>اسم الشخص أو الجهة (مثال: أم طارق / رهف / غرفة العمليات):</label>
          <input type="text" id="ownerName" placeholder="أدخل الاسم أو المعرف..." required />
          
          <label>رقم الهاتف أو المعرف العسكري (للتواصل المباشر):</label>
          <input type="tel" id="contactPhone" placeholder="96777xxxxxxx" style="direction:ltr; text-align:right;" required />

          <label>الكود السيادي (8 أرقام دقيقة - لصق أو كتابة):</label>
          <input type="text" id="sovereignCodeInput" class="unified-code-input" placeholder="12345678" maxlength="8" inputmode="numeric" required />

          <label>التصنيف السيادي والبروتوكول:</label>
          <select id="numCategory">
            <option value="بروتوكول الأسرة والقيادة (VIP)">بروتوكول الأسرة والقيادة (VIP)</option>
            <option value="محطة العمليات المركزية (800)">محطة العمليات المركزية (800)</option>
            <option value="قناة التوجيه الفضائي (AI-SAT)">قناة التوجيه الفضائي (AI-SAT)</option>
          </select>

          <button type="submit" class="btn-submit">تأمين وبصم الكود في الخزنة الكمومية</button>
        </form>
      </div>

      <div class="card-box">
        <h3>🔍 الدليل الكمومي المحفوظ (محمي بـ Honey-Pot)</h3>
        <input type="text" id="vaultSearch" placeholder="بحث بالاسم أو الرقم في الدليل..." oninput="filterVault()" style="margin-bottom:10px;" />
        <div id="vaultList">
          <p style="color:var(--muted); text-align:center; font-size:12px;" id="vaultEmpty">الدليل فارغ ومؤمن بالكامل.</p>
        </div>
      </div>
    </div>

    <!-- 2. شاشة الدردشات العصبية الميدانية -->
    <div id="screenChats" class="screen">
      <div class="header-compact">
        <div class="header-title">
          <h2>الدردشات العصبية المشفرة</h2>
          <p>ضغط البيانات 90% + التدمير الذاتي التنبؤي</p>
        </div>
      </div>
      <div class="card-box">
        <label>اختر جهة الاتصال للبدء:</label>
        <select id="chatContactSelect" onchange="changeActiveChat()" style="margin-bottom:10px;">
          <option value="">-- اختر من الدليل --</option>
        </select>

        <div class="chat-container" id="internalChatBox">
          <div class="chat-bubble incoming">
            <strong>[النظام العصبي OMEGA]:</strong> أهلاً بك يا أبو طارق. تم تفعيل ضغط التشفير العسكري بنجاح. أرسل رسالتك وسيتكفل الذكاء الاصطناعي بتأمينها.
            <div class="self-destruct-timer">حماية مستمرة // مؤمن</div>
          </div>
        </div>

        <input type="text" id="chatInputMsg" placeholder="اكتب أمرك أو رسالتك المشفرة هنا..." />
        <button type="button" class="btn-submit" onclick="sendInternalMessage()">إرسال بروتوكول مشفر (عصبي)</button>
      </div>
    </div>

    <!-- 3. شاشة مساعد سند الذكي (OMEGA AI) -->
    <div id="screenAi" class="screen">
      <div class="header-compact">
        <div class="header-title">
          <h2>المستشار الاستراتيجي OMEGA AI</h2>
          <p>العقل الذكي لتحليل خطوط الملاحة والطقس والاتصالات</p>
        </div>
      </div>
      <div class="card-box">
        <h3>سجل التحليل الاستراتيجي الفضائي</h3>
        <div class="ai-chat-box" id="aiChatLog">
          <div><strong>[OMEGA AI]:</strong> جاهز يا قائدنا العظيم. قمت بفحص ترددات الأقمار بنجاح. كافة القطاعات تعمل بكفاءة 100%.</div>
        </div>
        <label>أمر تشغيلي / استفسار استراتيجي:</label>
        <input type="text" id="aiInputPrompt" placeholder="اكتب أمرك أو استفسارك هنا..." />
        <button type="button" class="btn-submit btn-ai" onclick="sendAiPrompt()">تشغيل التحليل العصبي الذكي</button>
      </div>
    </div>

    <!-- 4. شاشة مركز المكالمات الفضائية -->
    <div id="screenCalls" class="screen">
      <div class="header-compact">
        <div class="header-title">
          <h2>مركز المكالمات الكمومية (1X)</h2>
          <p>إلغاء الضوضاء العصبية والقفز الترددي الديناميكي</p>
        </div>
      </div>
      <div class="card-box">
        <h3>إطلاق اتصال فضائي مؤمن</h3>
        <label>اختر جهة الاتصال:</label>
        <select id="callContactSelect" style="margin-bottom:10px;">
          <option value="">-- اختر جهة الاتصال --</option>
        </select>
        
        <div id="callStatusBox" style="background:#020617; border:1px solid var(--border); border-radius:8px; padding:15px; text-align:center; margin-bottom:10px;">
          <p style="margin:0 0 5px; color:var(--muted); font-size:12px;" id="callStateText">الحالة: القناة الكمومية جاهزة للمصافحة</p>
          <h3 id="activeCallTarget" style="margin:0; color:var(--accent);">-- لا يوجد اتصال نشط --</h3>
        </div>

        <button type="button" class="btn-submit btn-call" onclick="startSecureCall()">بدء الاتصال الفضائي المشفر (1X)</button>
        <button type="button" class="btn-submit btn-danger" onclick="endSecureCall()">قطع الاتصال وتأمين السجل</button>
      </div>
    </div>

    <!-- 5. شاشة الإعدادات ودرع السيادة المطلقة -->
    <div id="screenSettings" class="screen">
      <div class="profile-card">
        <div class="profile-avatar">Ω</div>
        <h3 style="margin:0 0 4px;">سند OMEGA SUPREME</h3>
        <p style="color:var(--accent); font-size:12px; margin:0;">النظام العصبي السيادي عابر الحدود // v9.0</p>
      </div>
      <div class="card-box">
        <h3>درع السيادة وطوارئ الحماية (Kill-Switch)</h3>
        <div class="list-item">
          <div><strong>الخزنة الكمومية المضادة للتتبع</strong><br/><span style="font-size:11px; color:var(--emerald);">مفعلة بوضع Honey-Pot الوهمي</span></div>
          <span class="badge-gold">تأمين تام</span>
        </div>
        <div class="list-item" style="margin-top:8px;">
          <div><strong>بروتوكول الأقمار (AI-SAT OMEGA)</strong><br/><span style="font-size:11px; color:var(--muted);">يعمل بضغط بيانات عسكري 90%</span></div>
          <span class="badge-gold">نشط</span>
        </div>
        <button type="button" class="btn-submit btn-danger" style="margin-top:14px;" onclick="executeKillSwitch()">⚡ تفعيل مفتاح الطوارئ (Kill-Switch) ومسح الذاكرة</button>
        <button type="button" class="btn-submit" style="margin-top:8px;" onclick="alert('تم تحديث بروتوكولات الأمان العصبية بنجاح!')">حفظ وتطبيق إعدادات السيادة</button>
      </div>
    </div>

  </div>

  <!-- شريط التنقل العصبي السفلي -->
  <nav class="bottom-nav">
    <button class="nav-item active" type="button" onclick="switchScreen('codes', this)">
      <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
      <span>الأكواد والدليل</span>
    </button>
    <button class="nav-item" type="button" onclick="switchScreen('chats', this)">
      <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
      <span>الدردشات</span>
    </button>
    <button class="nav-item" type="button" onclick="switchScreen('ai', this)">
      <svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1010 10A10 10 0 0012 2zm0 18a8 8 0 118-8 8 8 0 01-8 8zm1-13h-2v6h6v-2h-4z"/></svg>
      <span>مساعد سند</span>
    </button>
    <button class="nav-item" type="button" onclick="switchScreen('calls', this)">
      <svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
      <span>المكالمات</span>
    </button>
    <button class="nav-item" type="button" onclick="switchScreen('settings', this)">
      <svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c-.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
      <span>الإعدادات</span>
    </button>
  </nav>

  <script>
    let vault = [
      { owner: 'أم طارق', phone: '967770000001', num: '88800001', cat: 'بروتوكول الأسرة والقيادة (VIP)' },
      { owner: 'رهف', phone: '967770000002', num: '88800002', cat: 'بروتوكول الأسرة والقيادة (VIP)' },
      { owner: 'رابعة', phone: '967770000003', num: '88800003', cat: 'بروتوكول الأسرة والقيادة (VIP)' },
      { owner: 'رشا', phone: '967770000004', num: '88800004', cat: 'بروتوكول الأسرة والقيادة (VIP)' },
      { owner: 'آمنة', phone: '967770000005', num: '88800005', cat: 'بروتوكول الأسرة والقيادة (VIP)' }
    ];
    
    let internalMessages = {
      '967770000001': [{sender: 'incoming', text: 'تم إنشاء قناة تشفير كمومي عسكري. الإشارة مستقرة.'}]
    };
    let activeChatPhone = '967770000001';
    let deferredPrompt;

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      const installBtn = document.getElementById('installBtn');
      if(installBtn) installBtn.style.display = 'block';
    });

    document.getElementById('installBtn').addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          document.getElementById('installBtn').style.display = 'none';
        }
        deferredPrompt = null;
      }
    });

    window.onload = function() {
      renderVault();
      updateContactSelects();
      loadChatMessages();
    };

    function switchScreen(screenId, btn) {
      document.querySelectorAll('.screen').forEach(function(s) { s.classList.remove('active'); });
      document.querySelectorAll('.nav-item').forEach(function(i) { i.classList.remove('active'); });
      
      document.getElementById('screen' + screenId.charAt(0).toUpperCase() + screenId.slice(1)).classList.add('active');
      btn.classList.add('active');
    }

    document.getElementById('codeForm').addEventListener('submit', function(e) {
      e.preventDefault();
      const owner = document.getElementById('ownerName').value.trim();
      const phone = document.getElementById('contactPhone').value.trim();
      const cat = document.getElementById('numCategory').value;
      const num = document.getElementById('sovereignCodeInput').value.trim();

      if (num.length !== 8 || isNaN(num)) {
        alert('خطأ كمومي: يجب أن يتكون الكود من 8 أرقام دقيقة تماماً.');
        return;
      }

      const existing = vault.find(function(i) { return i.num === num; });
      if (existing) {
        alert('تنبيه أمني (Honey-Pot): هذا الكود مسجل مسبقاً. تم تفعيل نظام التمويه لحماية البيانات!');
        return;
      }

      const record = { owner: owner, phone: phone, num: num, cat: cat };
      vault.unshift(record);
      
      renderVault();
      updateContactSelects();
      document.getElementById('sovereignCodeInput').value = '';
      document.getElementById('ownerName').value = '';
      document.getElementById('contactPhone').value = '';
      alert('تم تأمين وبصم الكود في الخزنة الكمومية بنجاح!');
    });

    function renderVault(filter) {
      if (!filter) filter = '';
      const list = document.getElementById('vaultList');
      const filtered = vault.filter(function(i) {
        return i.owner.toLowerCase().includes(filter.toLowerCase()) || i.num.includes(filter) || (i.phone && i.phone.includes(filter));
      });
      
      if (filtered.length === 0) {
        list.innerHTML = '<p style="color:var(--muted); text-align:center; font-size:12px;" id="vaultEmpty">الدليل فارغ ونظيف.</p>';
        return;
      }
      
      let html = '';
      for (let i = 0; i < filtered.length; i++) {
        let item = filtered[i];
        html += '<div class="list-item"><div>' +
                '<strong>' + item.owner + '</strong> <span class="badge-gold">' + item.cat + '</span><br/>' +
                '<span style="font-family:monospace; color:var(--accent);">البصمة / الكود: ' + item.num + '</span> | ' +
                '<span style="font-family:monospace; color:var(--emerald);">الرقم: ' + (item.phone || 'غير مسجل') + '</span>' +
                '</div><div>' +
                '<button class="btn-submit btn-action" onclick="openChatFor(\\\'' + item.phone + '\\\', \\\'' + item.owner + '\\\')">مراسلة</button>' +
                '<button class="btn-submit btn-action" style="background:#312e81; border-color:var(--quantum);" onclick="openCallFor(\\\'' + item.phone + '\\\', \\\'' + item.owner + '\\\')">اتصال</button>' +
                '</div></div>';
      }
      list.innerHTML = html;
    }

    function filterVault() {
      const query = document.getElementById('vaultSearch').value;
      renderVault(query);
    }

    function updateContactSelects() {
      const chatSel = document.getElementById('chatContactSelect');
      const callSel = document.getElementById('callContactSelect');
      
      let options = '<option value="">-- اختر من أسماء الدليل --</option>';
      for (let i = 0; i < vault.length; i++) {
        let item = vault[i];
        options += '<option value="' + item.phone + '">' + item.owner + ' (' + item.phone + ') - كود: ' + item.num + '</option>';
      }
      
      if(chatSel) chatSel.innerHTML = options;
      if(callSel) callSel.innerHTML = options;
    }

    function changeActiveChat() {
      const chatSel = document.getElementById('chatContactSelect');
      if(chatSel && chatSel.value) {
        activeChatPhone = chatSel.value;
        if(!internalMessages[activeChatPhone]) {
          internalMessages[activeChatPhone] = [{sender: 'incoming', text: 'تم تفعيل بروتوكول الدردشة العصبية المشفرة.'}];
        
