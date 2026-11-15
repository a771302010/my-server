const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ملف التثبيت السيادي لتشغيل التطبيق كـ PWA مع أيقونة مستقلة
app.get('/manifest.json', (req, res) => {
  res.json({
    "name": "برنامج سند السيادي العالمي",
    "short_name": "سند",
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
  <title>برنامج سند - المنصة السيادية العالمية (v8.1 ULTRA)</title>
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
    }
    body { margin: 0; padding: 0; background: var(--bg); color: var(--text); font-family: sans-serif; padding-bottom: 80px; -webkit-tap-highlight-color: transparent; }
    .container { max-width: 720px; margin: 0 auto; padding: 16px; }
    
    .telemetry-bar { background: #020617; border: 1px solid var(--border); border-radius: 8px; padding: 8px 12px; margin-bottom: 12px; font-family: monospace; font-size: 11px; display: flex; justify-content: space-between; align-items: center; color: var(--accent); }
    .telemetry-dot { width: 8px; height: 8px; background: var(--emerald); border-radius: 50%; box-shadow: 0 0 10px var(--emerald); animation: pulse 1.5s infinite; }
    @keyframes pulse { 0% { opacity: 0.3; } 50% { opacity: 1; } 100% { opacity: 0.3; } }

    .header-compact { display: flex; align-items: center; justify-content: space-between; background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 12px 16px; margin-bottom: 14px; }
    .header-title h2 { margin: 0; font-size: 18px; color: var(--text); }
    .header-title p { margin: 2px 0 0; font-size: 11px; color: var(--accent); }

    .screen { display: none; }
    .screen.active { display: block; }

    .card-box { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 16px; margin-bottom: 12px; }
    .card-box h3 { margin: 0 0 12px; font-size: 14px; color: var(--text); border-right: 4px solid var(--gold); padding-right: 8px; }

    label { display: block; margin-bottom: 6px; font-weight: bold; font-size: 12px; color: var(--muted); }
    input, select, textarea { width: 100%; padding: 11px; border-radius: 8px; border: 1px solid var(--border); margin-bottom: 10px; background: #030712; color: var(--text); font-size: 13px; box-sizing: border-box; }
    input:focus, select:focus, textarea:focus { border-color: var(--accent); outline: none; }

    /* حقل الأكواد الموحد الفاخر */
    .unified-code-input { font-family: monospace !important; font-size: 18px !important; font-weight: bold; letter-spacing: 4px; text-align: center; color: var(--accent) !important; background: #020617 !important; border: 2px solid var(--border) !important; }
    .unified-code-input:focus { border-color: var(--gold) !important; box-shadow: 0 0 12px rgba(245,158,11,0.4); }

    .btn-submit { width: 100%; padding: 12px; background: var(--primary); color: #fff; border: 1px solid var(--accent); border-radius: 8px; font-size: 14px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.4); }
    .btn-submit:hover { background: var(--primary-hover); }
    .btn-call { background: #312e81; border-color: var(--quantum); margin-top: 8px; }
    .btn-ai { background: linear-gradient(135deg, #4f46e5, var(--quantum)); border-color: var(--accent); margin-top: 8px; }
    .btn-action { background: #065f46; border-color: var(--emerald); padding: 6px 12px; font-size: 11px; width: auto; margin-left: 4px; display: inline-block; }
    .btn-install { background: linear-gradient(135deg, var(--gold), #d97706); color: #000; border: none; margin-bottom: 12px; display: none; }

    /* Bottom Navigation Bar */
    .bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; background: #020617; border-top: 1px solid var(--border); display: grid; grid-template-columns: repeat(5, 1fr); padding: 8px 4px; z-index: 1000; box-shadow: 0 -10px 25px rgba(0,0,0,0.9); }
    .nav-item { background: transparent; border: none; color: var(--muted); display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 10px; cursor: pointer; padding: 4px; font-weight: bold; gap: 4px; }
    .nav-item svg { width: 20px; height: 20px; fill: currentColor; }
    .nav-item.active { color: var(--accent); }
    .nav-item.active svg { fill: var(--accent); }

    .list-item { background: #030712; border: 1px solid var(--border); border-radius: 8px; padding: 10px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; }
    .badge-gold { background: rgba(245, 158, 11, 0.15); color: var(--gold); border: 1px solid var(--gold); padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: bold; }
    .badge-sync { background: rgba(16, 185, 129, 0.15); color: var(--emerald); border: 1px solid var(--emerald); padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: bold; }
    
    .profile-card { text-align: center; padding: 20px; background: var(--card); border: 1px solid var(--border); border-radius: 12px; margin-bottom: 12px; }
    .profile-avatar { width: 64px; height: 64px; background: linear-gradient(135deg, var(--primary), var(--accent)); border-radius: 50%; margin: 0 auto 10px; display: flex; align-items: center; justify-content: center; border: 2px solid var(--gold); font-size: 24px; color: #fff; font-weight: bold; }
    
    .ai-chat-box { background: #020617; border: 1px solid var(--quantum); border-radius: 8px; padding: 12px; min-height: 140px; max-height: 220px; overflow-y: auto; margin-bottom: 10px; font-size: 12px; color: var(--accent); }
  </style>
</head>
<body>
  <div class="container">
    <div class="telemetry-bar">
      <span>AI-SAT LINK: <strong>SECURED // v8.1 ULTRA</strong></span>
      <div style="display:flex; align-items:center; gap:6px;">
        <span id="txtOnline">1X SOVEREIGN ACTIVE</span>
        <div class="telemetry-dot"></div>
      </div>
    </div>

    <button type="button" class="btn-submit btn-install" id="installBtn">⬇ تثبيت تطبيق سند على الشاشة الرئيسية (App)</button>

    <!-- 1. شاشة الأكواد ودليل الأسماء السيادية -->
    <div id="screenCodes" class="screen active">
      <div class="header-compact">
        <div class="header-title">
          <h2>الأكواد ودليل الأسماء السيادية</h2>
          <p>إدخال البصمات الرقمية الموحدة وحماية ضد التكرار</p>
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

          <label>التصنيف السيادي:</label>
          <select id="numCategory">
            <option value="بروتوكول الأسرة والقيادة (VIP)">بروتوكول الأسرة والقيادة (VIP)</option>
            <option value="محطة العمليات المركزية (800)">محطة العمليات المركزية (800)</option>
            <option value="قناة التوجيه الفضائي (AI)">قناة التوجيه الفضائي (AI-SAT)</option>
          </select>

          <button type="submit" class="btn-submit">حفظ وتأمين البصمة في الدليل السيادي</button>
        </form>
      </div>

      <div class="card-box">
        <h3>🔍 دليل الأكواد والأسماء المحفوظة (محمي من التكرار)</h3>
        <input type="text" id="vaultSearch" placeholder="بحث بالاسم أو الرقم في الدليل..." oninput="filterVault()" style="margin-bottom:10px;" />
        <div id="vaultList">
          <p style="color:var(--muted); text-align:center; font-size:12px;" id="vaultEmpty">الدليل فارغ ونظيف.</p>
        </div>
      </div>
    </div>

    <!-- 2. شاشة مساعد سند الذكي -->
    <div id="screenAi" class="screen">
      <div class="header-compact">
        <div class="header-title">
          <h2>مساعد سند الذكي (ULTRA AI)</h2>
          <p>العقل العصبي لفحص الشبكة والتحقق من أمان العمليات</p>
        </div>
      </div>
      <div class="card-box">
        <h3>سجل الحوار العصبي الفضائي</h3>
        <div class="ai-chat-box" id="aiChatLog">
          <div><strong>[نظام سند AI]:</strong> أهلاً بك يا أبو طارق. تم اعتماد حقل الإدخال الموحد فائق السلاسة لضمان اللصق الفوري ودون أي أخطاء. كيف أخدمك اليوم؟</div>
        </div>
        <label>أمر تشغيلي / سؤال للمساعد الذكي:</label>
        <input type="text" id="aiInputPrompt" placeholder="اكتب أمرك أو استفسارك هنا..." />
        <button type="button" class="btn-submit btn-ai" onclick="sendAiPrompt()">إرسال للمساعد العصبي الذكي</button>
      </div>
    </div>

    <!-- 3. شاشة الدردشات والتوجيه الذكي -->
    <div id="screenChats" class="screen">
      <div class="header-compact">
        <div class="header-title">
          <h2>الدردشات والرسائل السيادية</h2>
          <p>قنوات الاتصال الآمنة المربوطة بأسماء الدليل</p>
        </div>
      </div>
      <div class="card-box">
        <h3>إرسال أمر مشفر أو رسالة لجهة اتصال</h3>
        <label>اختر من الدليل أو أدخل الرقم:</label>
        <select id="chatContactSelect" onchange="selectChatContact()" style="margin-bottom:10px;">
          <option value="">-- اختر من أسماء الدليل المحفوظة --</option>
        </select>

        <label>رقم المستلم:</label>
        <input type="tel" id="targetPhone" placeholder="96777xxxxxxx" style="direction:ltr; text-align:right;" />
        
        <label>نص التوجيه / الرسالة:</label>
        <input type="text" id="targetMsg" placeholder="اكتب رسالتك هنا..." />
        
        <button type="button" class="btn-submit" id="btnSendMsg">إرسال عبر القناة الآمنة</button>
      </div>
    </div>

    <!-- 4. شاشة المكالمات -->
    <div id="screenCalls" class="screen">
      <div class="header-compact">
        <div class="header-title">
          <h2>سجل المكالمات العصبية</h2>
          <p>الاتصالات المشفرة والمباشرة بأفراد الأسرة والقيادة</p>
        </div>
      </div>
      <div class="card-box">
        <label>اختر جهة الاتصال لإطلاق مكالمة عصبية (1X):</label>
        <select id="callContactSelect" style="margin-bottom:10px;">
          <option value="">-- اختر جهة الاتصال --</option>
        </select>
        <button type="button" class="btn-submit btn-call" onclick="makeSecureCall()">إطلاق اتصال صوتي أو مرئي مؤمن</button>
      </div>
    </div>

    <!-- 5. شاشة الإعدادات -->
    <div id="screenSettings" class="screen">
      <div class="profile-card">
        <div class="profile-avatar">سند</div>
        <h3 style="margin:0 0 4px;">برنامج سند السيادي</h3>
        <p style="color:var(--accent); font-size:12px; margin:0;">المنصة الذكية عابرة الحدود // v8.1 ULTRA</p>
      </div>
      <div class="card-box">
        <h3>واجهة الإدخال المحسنة</h3>
        <p style="font-size:12px; color:var(--muted); margin:0 0 10px;">تم دمج حقل الأكواد الموحد لضمان سرعة اللصق والكتابة دون أخطاء.</p>
      </div>
    </div>

  </div>

  <!-- شريط التنقل السفلي الاحترافي -->
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
      <span><span>الإعدادات</span>
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
    };

    function switchScreen(screenId, btn) {
      document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      
      document.getElementById('screen' + screenId.charAt(0).toUpperCase() + screenId.slice(1)).classList.add('active');
      btn.classList.add('active');
    }

    // التحقق من الحقل الموحد ومنع التكرار
    document.getElementById('codeForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const owner = document.getElementById('ownerName').value.trim();
      const phone = document.getElementById('contactPhone').value.trim();
      const cat = document.getElementById('numCategory').value;
      const num = document.getElementById('sovereignCodeInput').value.trim();

      if (num.length !== 8 || isNaN(num)) {
        alert('خطأ سيادي: يجب أن يتكون الكود من 8 أرقام دقيقة تماماً.');
        return;
      }

      // فحص منع تكرار الكود
      const existing = vault.find(i => i.num === num);
      if (existing) {
        alert('خطأ سيادي: هذا الكود (' + num + ') مسجل مسبقاً لـ (' + existing.owner + '). لا يمكن تكرار الأكواد!');
        return;
      }

      const record = { owner, phone, num, cat };
      vault.unshift(record);
      
      renderVault();
      updateContactSelects();
      document.getElementById('sovereignCodeInput').value = '';
      document.getElementById('ownerName').value = '';
      document.getElementById('contactPhone').value = '';
      alert('تم حفظ البصمة السيادية الفريدة بنجاح في الدليل!');
    });

    function renderVault(filter = '') {
      const list = document.getElementById('vaultList');
      const filtered = vault.filter(i => i.owner.toLowerCase().includes(filter.toLowerCase()) || i.num.includes(filter) || (i.phone && i.phone.includes(filter)));
      
      if (filtered.length === 0) {
        list.innerHTML = '<p style="color:var(--muted); text-align:center; font-size:12px;" id="vaultEmpty">لا توجد نتائج مطابقة في الدليل.</p>';
        return;
      }
      
      list.innerHTML = filtered.map(i => \`
        <div class="list-item">
          <div>
            <strong>\${i.owner}</strong> <span class="badge-gold">\${i.cat}</span><br/>
            <span style="font-family:monospace; color:var(--accent);">البصمة / الكود: \${i.num}</span> | 
            <span style="font-family:monospace; color:var(--emerald);">الرقم: \${i.phone || 'غير مسجل'}</span>
          </div>
          <div>
            <button class="btn-submit btn-action" onclick="openChatFor('\${i.phone}', '\${i.owner}')">مراسلة</button>
            <button class="btn-submit btn-action" style="background:#312e81; border-color:var(--quantum);" onclick="openCallFor('\{i.phone}', '\${i.owner}')">اتصال</button>
          </div>
        </div>
      \`).join('');
    }

    function filterVault() {
      const query = document.getElementById('vaultSearch').value;
      renderVault(query);
    }

    function updateContactSelects() {
      const chatSel = document.getElementById('chatContactSelect');
      const callSel = document.getElementById('callContactSelect');
      
      let options = '<option value="">-- اختر من أسماء الدليل المحفوظة --</option>';
      vault.forEach(i => {
        options += \`<option value="\${i.phone}">\${i.owner} (\${i.phone}) - كود: \${i.num}</option>\`;
      });
      
      if(chatSel) chatSel.innerHTML = options;
      if(callSel) callSel.innerHTML = options;
    }

    function selectChatContact() {
      const chatSel = document.getElementById('chatContactSelect');
      const phoneInput = document.getElementById('targetPhone');
      if(chatSel && phoneInput) {
        phoneInput.value = chatSel.value;
      }
    }

    function openChatFor(phone, name) {
      switchScreen('chats', document.querySelectorAll('.nav-item')[1]);
      document.getElementById('targetPhone').value = phone;
      document.getElementById('targetMsg').value = 'توجيه سيادي إلى ' + name + ': حالة العمليات مستقرة ومؤمنة.';
    }

    function openCallFor(phone, name) {
      switchScreen('calls', document.querySelectorAll('.nav-item')[3]);
      const callSel = document.getElementById('callContactSelect');
      if(callSel) callSel.value = phone;
    }

    document.getElementById('btnSendMsg').addEventListener('click', () => {
      let phone = document.getElementById('targetPhone').value.trim();
      const msg = document.getElementById('targetMsg').value.trim();
      if (!phone || !msg) {
        alert('الرجاء إدخال رقم المستلم ونصح التوجيه.');
        return;
      }
      phone = phone.replace(/^0+/, '').replace(/^\+/, '');
      const prefix = '[بروتوكول سند السيادي - أمر مشفر]: ';
      window.location.href = 'https://wa.me/' + phone + '?text=' + encodeURIComponent(prefix + msg);
    });

    function makeSecureCall() {
      const callSel = document.getElementById('callContactSelect');
      let phone = callSel ? callSel.value : '';
      if (!phone) {
        alert('الرجاء اختيار جهة اتصال للمكالمة.');
        return;
      }
      phone = phone.replace(/^0+/, '').replace(/^\+/**', '');
      window.location.href = 'https://wa.me/' + phone + '?text=' + encodeURIComponent('[طلب اتصال عصبي مرئي/صوتي مؤمن عبر سند 1X]');
    }

    function sendAiPrompt() {
      const input = document.getElementById('aiInputPrompt');
      const log = document.getElementById('aiChatLog');
      const val = input.value.trim();
      if(!val) return;

      log.innerHTML += '<div style="margin-top:8px;"><strong>[أبو طارق]:</strong> ' + val + '</div>';
      
      setTimeout(() => {
        let reply = "مساعد سند ULTRA: تم تفعيل حقل الإدخال الموحد بنجاح. السرعة والمرونة في أعلى مستوياتها.";
        log.innerHTML += '<div style="margin-top:8px; color:var(--emerald);"><strong>[مساعد سند AI]:</strong> ' + reply + '</div>';
        log.scrollTop = log.scrollHeight;
      }, 600);

      input.value = '';
      log.scrollTop = log.scrollHeight;
    }
  </script>
</body>
</html>`);
});

app.listen(PORT, () => { console.log('Server running on port ' + PORT); });
