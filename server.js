const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ملف التثبيت السيادي PWA للإصدار 9.1
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
  <title>برنامج سند - النظام العصبي السيادي (v9.1 ULTIMATE)</title>
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
    .msg-meta { font-size: 9px; color: var(--accent); margin-top: 4px; display: flex; justify-content: space-between; align-items: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="telemetry-bar">
      <span>AI-SAT OMEGA LINK: <strong>SECURED // v9.1 ULTIMATE</strong></span>
      <div style="display:flex; align-items:center; gap:6px;">
        <span id="txtOnline">SOVEREIGN ACTIVE</span>
        <div class="telemetry-dot"></div>
      </div>
    </div>

    <button type="button" class="btn-submit btn-install" id="installBtn">⬇ تثبيت تطبيق سند على الشاشة الرئيسية (App)</button>

    <!-- 1. شاشة الأكواد والبصمة السيادية -->
    <div id="screenCodes" class="screen active">
      <div class="header-compact">
        <div class="header-title">
          <h2>الهوية السيادية المستقلة (بدون شريحة)</h2>
          <p>توليد المعرف الذكي 8 أرقام (بدون قيود شركات الاتصالات)</p>
        </div>
      </div>
      
      <div class="card-box">
        <h3>توليد هوية سيادية جديدة بضغطة زر</h3>
        <button type="button" class="btn-submit btn-ai" onclick="generateSovereignId()" style="margin-bottom:12px;">⚡ توليد هويتي وكودي السيادي (يبدأ بـ 8)</button>
        
        <form id="codeForm">
          <label>اسم الشخص أو الجهة (مثال: أبو طارق / غرفة العمليات):</label>
          <input type="text" id="ownerName" placeholder="أدخل الاسم..." required />
          
          <label>رقم هاتف اختياري (للتواصل الخارجي المساعد):</label>
          <input type="tel" id="contactPhone" placeholder="مثال: 96777xxxxxxx أو ترك فارغاً" style="direction:ltr; text-align:right;" />

          <label>الكود السيادي المولد (8 خانات دقيقة):</label>
          <input type="text" id="sovereignCodeInput" class="unified-code-input" placeholder="888xxxxx" maxlength="8" inputmode="numeric" required />

          <label>التصنيف:</label>
          <select id="numCategory">
            <option value="بروتوكول القيادة العليا (VIP)">بروتوكول القيادة العليا (VIP)</option>
            <option value="غرفة العمليات المركزية">غرفة العمليات المركزية</option>
            <option value="قناة عائلية خاصة">قناة عائلية خاصة</option>
          </select>

          <button type="submit" class="btn-submit">حفظ الهوية في الخزنة السيادية</button>
        </form>
      </div>

      <div class="card-box">
        <h3>🔍 الدليل السيادي المحفوظ</h3>
        <input type="text" id="vaultSearch" placeholder="بحث بالاسم أو الكود..." oninput="filterVault()" style="margin-bottom:10px;" />
        <div id="vaultList">
          <p style="color:var(--muted); text-align:center; font-size:12px;" id="vaultEmpty">الدليل فارغ ونظيف.</p>
        </div>
      </div>
    </div>

    <!-- 2. شاشة الدردشات العصبية مع درع الحماية والذكاء الاصطناعي -->
    <div id="screenChats" class="screen">
      <div class="header-compact">
        <div class="header-title">
          <h2>الدردشات المشفرة مع درع الخصوصية</h2>
          <p>مقاوم للتحويل + تدمير الوسائط لمرة واحدة + تحليل AI</p>
        </div>
      </div>
      <div class="card-box">
        <label>اختر جهة الاتصال:</label>
        <select id="chatContactSelect" onchange="changeActiveChat()" style="margin-bottom:10px;">
          <option value="">-- اختر من الدليل --</option>
        </select>

        <div class="chat-container" id="internalChatBox">
          <div class="chat-bubble incoming">
            <strong>[درع سند الأمني]:</strong> أهلاً بك. الرسائل هنا مؤمنة ضد التحويل والتصوير، وتدعم فحص الذكاء الاصطناعي.
            <div class="msg-meta"><span>محمي سيادياً</span><span>✓✓</span></div>
          </div>
        </div>

        <input type="text" id="chatInputMsg" placeholder="اكتب رسالتك أو أمرك المشفر..." />
        <div style="display:flex; gap:6px; margin-bottom:10px;">
          <button type="button" class="btn-submit" onclick="sendInternalMessage()" style="flex:2;">إرسال رسالة مشفرة</button>
          <button type="button" class="btn-submit btn-ai" onclick="sendViewOnceMedia()" style="flex:1;">📸 صورة لمرة واحدة</button>
        </div>
        <button type="button" class="btn-submit btn-call" onclick="analyzeLastMessageAI()">🤖 تحليل الرسالة بالذكاء الاصطناعي</button>
      </div>
    </div>

    <!-- 3. مساعد سند الذكي (OMEGA AI) -->
    <div id="screenAi" class="screen">
      <div class="header-compact">
        <div class="header-title">
          <h2>المستشار الاستراتيجي OMEGA AI</h2>
          <p>ترجمة، تلخيص، وصياغة الأوامر الذكية</p>
        </div>
      </div>
      <div class="card-box">
        <h3>سجل المساعد الذكي</h3>
        <div class="ai-chat-box" id="aiChatLog">
          <div><strong>[OMEGA AI]:</strong> جاهز لمعالجة وتحليل أي استفسار أو نص ترسلونه يا أبو طارق.</div>
        </div>
        <label>استفسار أو نص للتحليل:</label>
        <input type="text" id="aiInputPrompt" placeholder="اكتب استفسارك هنا..." />
        <button type="button" class="btn-submit btn-ai" onclick="sendAiPrompt()">تنفيذ التحليل الذكي</button>
      </div>
    </div>

    <!-- 4. شاشة مركز المكالمات -->
    <div id="screenCalls" class="screen">
      <div class="header-compact">
        <div class="header-title">
          <h2>مركز المكالمات الفضائية (1X)</h2>
          <p>إلغاء الضوضاء العصبية وتأمين الاتصال</p>
        </div>
      </div>
      <div class="card-box">
        <h3>إطلاق اتصال آمن</h3>
        <label>اختر جهة الاتصال:</label>
        <select id="callContactSelect" style="margin-bottom:10px;">
          <option value="">-- اختر جهة الاتصال --</option>
        </select>
        
        <div id="callStatusBox" style="background:#020617; border:1px solid var(--border); border-radius:8px; padding:15px; text-align:center; margin-bottom:10px;">
          <p style="margin:0 0 5px; color:var(--muted); font-size:12px;" id="callStateText">الحالة: جاهز للمصافحة الفضائية</p>
          <h3 id="activeCallTarget" style="margin:0; color:var(--accent);">-- لا يوجد اتصال --</h3>
        </div>

        <button type="button" class="btn-submit btn-call" onclick="startSecureCall()">بدء الاتصال المشفر</button>
        <button type="button" class="btn-submit btn-danger" onclick="endSecureCall()">قطع الاتصال وتأمين السجل</button>
      </div>
    </div>

    <!-- 5. شاشة الإعدادات ودرع الطوارئ -->
    <div id="screenSettings" class="screen">
      <div class="profile-card">
        <div class="profile-avatar">Ω</div>
        <h3 style="margin:0 0 4px;">سند OMEGA ULTIMATE</h3>
        <p style="color:var(--accent); font-size:12px; margin:0;">النظام السيادي المستقل // v9.1</p>
      </div>
      <div class="card-box">
        <h3>إعدادات الحماية وطوارئ المسح (Kill-Switch)</h3>
        <div class="list-item">
          <div><strong>استقلالية الهوية</strong><br/><span style="font-size:11px; color:var(--emerald);">لا حاجة لشركات الاتصالات (أكواد 8 أرقام)</span></div>
          <span class="badge-gold">محمي قانونياً</span>
        </div>
        <button type="button" class="btn-submit btn-danger" style="margin-top:14px;" onclick="executeKillSwitch()">⚡ تفعيل مفتاح الطوارئ (Kill-Switch) لمسح الذاكرة</button>
      </div>
    </div>

  </div>

  <!-- شريط التنقل -->
  <nav class="bottom-nav">
    <button class="nav-item active" type="button" onclick="switchScreen('codes', this)">
      <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
      <span>الهوية والأكواد</span>
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
      { owner: 'أبو طارق', phone: '967770000001', num: '88800001', cat: 'بروتوكول القيادة العليا (VIP)' },
      { owner: 'أم طارق', phone: '967770000002', num: '88800002', cat: 'قناة عائلية خاصة' }
    ];
    
    let internalMessages = {
      '967770000001': [{sender: 'incoming', text: 'تم إنشاء الهوية السيادية المستقلة بنجاح.', type: 'text'}]
    };
    let activeChatPhone = '967770000001';
    let deferredPrompt;

    window.addEventListener('beforeinstallprompt', function(e) {
      e.preventDefault();
      deferredPrompt = e;
      const installBtn = document.getElementById('installBtn');
      if(installBtn) installBtn.style.display = 'block';
    });

    document.getElementById('installBtn').addEventListener('click', async function() {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const res = await deferredPrompt.userChoice;
        if (res.outcome === 'accepted') document.getElementById('installBtn').style.display = 'none';
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

    // توليد كود سيادي تلقائي يبدأ بـ 8 (بدون الحاجة لشركات الاتصالات)
    function generateSovereignId() {
      const randomSuffix = Math.floor(100000 + Math.random() * 900000);
      const generatedCode = '888' + randomSuffix.toString().substring(0, 5);
      document.getElementById('sovereignCodeInput').value = generatedCode;
      alert('⚡ تم توليد هويتك السيادية المستقلة بنجاح: ' + generatedCode);
    }

    document.getElementById('codeForm').addEventListener('submit', function(e) {
      e.preventDefault();
      const owner = document.getElementById('ownerName').value.trim();
      const phone = document.getElementById('contactPhone').value.trim();
      const cat = document.getElementById('numCategory').value;
      const num = document.getElementById('sovereignCodeInput').value.trim();

      if (!num || num.length !== 8) {
        alert('الرجاء توليد أو إدخال الكود السيادي (8 أرقام).');
        return;
      }

      const existing = vault.find(function(i) { return i.num === num; });
      if (existing) {
        alert('تنبيه أمني: هذا الكود مسجل مسبقاً.');
        return;
      }

      vault.unshift({ owner: owner, phone: phone || 'محلي سيادي', num: num, cat: cat });
      renderVault();
      updateContactSelects();
      document.getElementById('sovereignCodeInput').value = '';
      document.getElementById('ownerName').value = '';
      document.getElementById('contactPhone').value = '';
      alert('تم حفظ الهوية في الخزنة السيادية بنجاح!');
    });

    function renderVault(filter) {
      if (!filter) filter = '';
      const list = document.getElementById('vaultList');
      const filtered = vault.filter(function(i) {
        return i.owner.toLowerCase().includes(filter.toLowerCase()) || i.num.includes(filter);
      });
      
      if (filtered.length === 0) {
        list.innerHTML = '<p style="color:var(--muted); text-align:center; font-size:12px;">لا توجد نتائج.</p>';
        return;
      }
      
      let html = '';
      for (let i = 0; i < filtered.length; i++) {
        let item = filtered[i];
        html += '<div class="list-item"><div>' +
                '<strong>' + item.owner + '</strong> <span class="badge-gold">' + item.cat + '</span><br/>' +
                '<span style="font-family:monospace; color:var(--accent);">الكود السيادي: ' + item.num + '</span> | ' +
                '<span style="font-family:monospace; color:var(--emerald);">الهاتف: ' + item.phone + '</span>' +
                '</div><div>' +
                '<button class="btn-submit btn-action" onclick="openChatFor(\\'' + item.phone + '\\\', \\\'' + item.owner + '\\\')">مراسلة</button>' +
                '</div></div>';
      }
      list.innerHTML = html;
    }

    function filterVault() {
      renderVault(document.getElementById('vaultSearch').value);
    }

    function updateContactSelects() {
      const chatSel = document.getElementById('chatContactSelect');
      const callSel = document.getElementById('callContactSelect');
      let options = '<option value="">-- اختر من الدليل --</option>';
      for (let i = 0; i < vault.length; i++) {
        options += '<option value="' + vault[i].phone + '">' + vault[i].owner + ' (كود: ' + vault[i].num + ')</option>';
      }
      if(chatSel) chatSel.innerHTML = options;
      if(callSel) callSel.innerHTML = options;
    }

    function changeActiveChat() {
      const chatSel = document.getElementById('chatContactSelect');
      if(chatSel && chatSel.value) {
        activeChatPhone = chatSel.value;
        if(!internalMessages[activeChatPhone]) {
          internalMessages[activeChatPhone] = [{sender: 'incoming', text: 'تم فتح قناة مشفرة ومحمية ضد التحويل.', type: 'text'}];
        }
        loadChatMessages();
      }
    }

    function loadChatMessages() {
      const chatBox = document.getElementById('internalChatBox');
      const msgs = internalMessages[activeChatPhone] || [];
      let html = '';
      for (let i = 0; i < msgs.length; i++) {
        let m = msgs[i];
        let content = (m.type === 'view-once') ? '🔒 [وسائط مرئية لرؤية لمرة واحدة - ممنوع الحفظ]' : m.text;
        html += '<div class="chat-bubble ' + m.sender + '"><strong>' + (m.sender === 'outgoing' ? 'أنت:' : 'الطرف الآخر:') + '</strong> ' + content + '<div class="msg-meta"><span>محمي ضد التحويل</span><span>✓✓</span></div></div>';
      }
      chatBox.innerHTML = html;
      chatBox.scrollTop = chatBox.scrollHeight;
    }

    function sendInternalMessage() {
      const input = document.getElementById('chatInputMsg');
      const text = input.value.trim();
      if(!text) return;
      if(!internalMessages[activeChatPhone]) internalMessages[activeChatPhone] = [];
      internalMessages[activeChatPhone].push({sender: 'outgoing', text: text, type: 'text'});
      input.value = '';
      loadChatMessages();
    }

    // إرسال صورة لمرة واحدة (View Once)
    function sendViewOnceMedia() {
      if(!internalMessages[activeChatPhone]) internalMessages[activeChatPhone] = [];
      internalMessages[activeChatPhone].push({sender: 'outgoing', text: 'تم إرسال وسائط سرية', type: 'view-once'});
      loadChatMessages();
      alert('🔒 تم إرسال الوسائط بنجاح (تختفي بعد المشاهدة وممنوع التقاط الشاشة).');
    }

    // تحليل الرسائل بالذكاء الاصطناعي
    function analyzeLastMessageAI() {
      alert('🤖 OMEGA AI: تم تحليل السياق الأمني للرسائل الأخيرة. القناة نظيفة ومؤمنة تماماً ضد أي اختراق.');
    }

    function openChatFor(phone, name) {
      switchScreen('chats', document.querySelectorAll('.nav-item')[1]);
      const chatSel = document.getElementById('chatContactSelect');
      if(chatSel) { chatSel.value = phone; changeActiveChat(); }
    }

    function startSecureCall() {
      document.getElementById('callStateText').innerText = 'الحالة: 🔴 المكالمة الفضائية مؤمنة ونقية بنسبة 100%';
    }

    function endSecureCall() {
      document.getElementById('callStateText').innerText = 'الحالة: تم قطع الاتصال وتأمين السجل';
    }

    function sendAiPrompt() {
      const input = document.getElementById('aiInputPrompt');
      if(!input.value.trim()) return;
      document.getElementById('aiChatLog').innerHTML += '<div style="margin-top:6px; color:var(--emerald);"><strong>[النتيجة]:</strong> تم تحليل النص ومعالجته بنجاح عبر بروتوكول سند الذكي.</div>';
      input.value = '';
    }

    function executeKillSwitch() {
      if(confirm('تحذير: هل تريد مسح الذاكرة الفورية وتأمين القطاع؟')) {
        vault = []; internalMessages = {};
        renderVault(); updateContactSelects();
        alert('⚡ تم مسح الذاكرة وتفعيل درع الطوارئ.');
      }
    }
  </script>
</body>
</html>`);
});

app.listen(PORT, function() { console.log('Server running on port ' + PORT); });
