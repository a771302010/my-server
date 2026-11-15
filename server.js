const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="ar" dir="rtl" id="htmlRoot">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>برنامج سند - المنصة السيادية الدولية</title>
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
    }
    body { margin: 0; padding: 0; background: var(--bg); color: var(--text); font-family: sans-serif; padding-bottom: 75px; }
    .container { max-width: 720px; margin: 0 auto; padding: 16px; }
    
    .telemetry-bar { background: #020617; border: 1px solid var(--border); border-radius: 8px; padding: 8px 12px; margin-bottom: 12px; font-family: monospace; font-size: 11px; display: flex; justify-content: space-between; align-items: center; color: var(--accent); }
    .telemetry-dot { width: 8px; height: 8px; background: var(--accent); border-radius: 50%; box-shadow: 0 0 10px var(--accent); }

    .header-compact { display: flex; align-items: center; justify-content: space-between; background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 12px 16px; margin-bottom: 14px; }
    .header-title h2 { margin: 0; font-size: 18px; color: var(--text); }
    .header-title p { margin: 2px 0 0; font-size: 11px; color: var(--accent); }

    .screen { display: none; }
    .screen.active { display: block; }

    .card-box { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 16px; margin-bottom: 12px; }
    .card-box h3 { margin: 0 0 12px; font-size: 14px; color: var(--text); border-right: 4px solid var(--gold); padding-right: 8px; }
    [dir="ltr"] .card-box h3 { border-right: none; border-left: 4px solid var(--gold); padding-right: 0; padding-left: 8px; }

    label { display: block; margin-bottom: 6px; font-weight: bold; font-size: 12px; color: var(--muted); }
    input, select { width: 100%; padding: 11px; border-radius: 8px; border: 1px solid var(--border); margin-bottom: 10px; background: #030712; color: var(--text); font-size: 13px; box-sizing: border-box; }
    input:focus, select:focus { border-color: var(--accent); outline: none; }

    .otp-container { display: flex; justify-content: space-between; gap: 4px; direction: ltr; margin-bottom: 12px; }
    .otp-input { width: 100% !important; max-width: 42px; height: 44px; text-align: center; font-size: 16px; font-weight: bold; border: 2px solid var(--border); border-radius: 8px; background: #030712; color: var(--accent); font-family: monospace; padding: 0 !important; margin: 0 !important; }
    .otp-input:focus { border-color: var(--gold); box-shadow: 0 0 10px rgba(245,158,11,0.4); }

    .btn-submit { width: 100%; padding: 12px; background: var(--primary); color: #fff; border: 1px solid var(--accent); border-radius: 8px; font-size: 14px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.4); }
    .btn-submit:hover { background: var(--primary-hover); }
    .btn-call { background: #312e81; border-color: var(--quantum); margin-top: 8px; }

    /* Bottom Navigation Bar (App Style) */
    .bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; background: #020617; border-top: 1px solid var(--border); display: grid; grid-template-columns: repeat(5, 1fr); padding: 8px 4px; z-index: 1000; box-shadow: 0 -10px 25px rgba(0,0,0,0.9); }
    .nav-item { background: transparent; border: none; color: var(--muted); display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 10px; cursor: pointer; padding: 4px; font-weight: bold; gap: 4px; }
    .nav-item svg { width: 20px; height: 20px; fill: currentColor; }
    .nav-item.active { color: var(--accent); }
    .nav-item.active svg { fill: var(--accent); }

    .list-item { background: #030712; border: 1px solid var(--border); border-radius: 8px; padding: 10px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; }
    .badge-gold { background: rgba(245, 158, 11, 0.15); color: var(--gold); border: 1px solid var(--gold); padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: bold; }
    
    .profile-card { text-align: center; padding: 20px; background: var(--card); border: 1px solid var(--border); border-radius: 12px; margin-bottom: 12px; }
    .profile-avatar { width: 64px; height: 64px; background: linear-gradient(135deg, var(--primary), var(--accent)); border-radius: 50%; margin: 0 auto 10px; display: flex; align-items: center; justify-content: center; border: 2px solid var(--gold); font-size: 24px; color: #fff; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="telemetry-bar">
      <span>AI-SAT LINK: <strong>SECURED // v7.0</strong></span>
      <div style="display:flex; align-items:center; gap:6px;">
        <span id="txtOnline">ONLINE (1X)</span>
        <div class="telemetry-dot"></div>
      </div>
    </div>

    <!-- 1. شاشة الدردشات / التوجيه -->
    <div id="screenChats" class="screen active">
      <div class="header-compact">
        <div class="header-title">
          <h2 id="chatsTitle">الدردشات السيادية</h2>
          <p>قنوات الاتصال المباشر والآمن</p>
        </div>
      </div>
      <div class="card-box">
        <h3 id="gatewayHead">بوابة التوجيه والاتصال الفضائي</h3>
        <label id="lblPhone">رقم المستلم (مثال: 96777xxxxxxx):</label>
        <input type="tel" id="targetPhone" placeholder="96777xxxxxxx" style="direction:ltr; text-align:right;" />
        
        <label id="lblMsg">نص التوجيه / الأمر المشفر:</label>
        <input type="text" id="targetMsg" placeholder="اكتب نص الأمر التشغيلي..." />
        
        <button type="button" class="btn-submit" id="btnSendMsg">إرسال عبر القناة الآمنة</button>
        <button type="button" class="btn-submit btn-call" id="btnCallUser">إطلاق اتصال صوتي مشفر</button>
      </div>
    </div>

    <!-- 2. شاشة المكالمات -->
    <div id="screenCalls" class="screen">
      <div class="header-compact">
        <div class="header-title">
          <h2>سجل المكالمات</h2>
          <p>المكالمات الفضائية والتشفرة الأخيرة</p>
        </div>
      </div>
      <div class="card-box">
        <div class="list-item">
          <div><strong>غرفة العمليات المركزية</strong><br/><span style="font-size:11px; color:var(--muted);">اتصال مشفر صوتي (صادر)</span></div>
          <span class="badge-gold">مؤمن</span>
        </div>
        <div class="list-item">
          <div><strong>القيادة العليا - الساحل الغربي</strong><br/><span style="font-size:11px; color:var(--muted);">توجيه استراتيجي (وارد)</span></div>
          <span class="badge-gold">نشط</span>
        </div>
      </div>
    </div>

    <!-- 3. شاشة الأكواد والخزنة -->
    <div id="screenCodes" class="screen">
      <div class="header-compact">
        <div class="header-title">
          <h2 id="codesTitle">الأكواد والخزنة</h2>
          <p>إدارة وتأمين الأكواد السيادية</p>
        </div>
      </div>
      
      <div class="card-box">
        <h3 id="genHead">توليد وتأمين كود سيادي (8 خانات)</h3>
        <form id="codeForm">
          <label id="lblOwner">اسم الجهة أو المعرف:</label>
          <input type="text" id="ownerName" placeholder="مثال: غرفة العمليات المركزية" required />
          
          <label id="lblOtp">أدخل الكود (8 خانات دقيقة):</label>
          <div class="otp-container">
            <input type="text" class="otp-input" maxlength="1" inputmode="numeric" />
            <input type="text" class="otp-input" maxlength="1" inputmode="numeric" />
            <input type="text" class="otp-input" maxlength="1" inputmode="numeric" />
            <input type="text" class="otp-input" maxlength="1" inputmode="numeric" />
            <input type="text" class="otp-input" maxlength="1" inputmode="numeric" />
            <input type="text" class="otp-input" maxlength="1" inputmode="numeric" />
            <input type="text" class="otp-input" maxlength="1" inputmode="numeric" />
            <input type="text" class="otp-input" maxlength="1" inputmode="numeric" />
          </div>

          <label id="lblCat">التصنيف:</label>
          <select id="numCategory">
            <option value="بروتوكول VIP السيادي (888)">بروتوكول VIP السيادي (888xxxxx)</option>
            <option value="محطة التشغيل المركزية (800)">محطة التشغيل المركزية (800xxxxx)</option>
          </select>

          <button type="submit" class="btn-submit" id="btnSave">اعتماد الكود في النظام</button>
        </form>
      </div>

      <div class="card-box">
        <h3 id="vaultHead">خزنة الأكواد السيادية</h3>
        <div id="vaultList">
          <p style="color:var(--muted); text-align:center; font-size:12px;" id="vaultEmpty">الخزنة فارغة ونظيفة.</p>
        </div>
      </div>
    </div>

    <!-- 4. شاشة جهات الاتصال -->
    <div id="screenContacts" class="screen">
      <div class="header-compact">
        <div class="header-title">
          <h2>جهات الاتصال السيادية</h2>
          <p>الدليل المشفر للجهات والقيادات</p>
        </div>
      </div>
      <div class="card-box">
        <div class="list-item">
          <div><strong>غرفة العمليات المركزية</strong><br/><span style="font-family:monospace; color:var(--accent);">88800001</span></div>
          <span class="badge-gold">VIP</span>
        </div>
        <div class="list-item">
          <div><strong>محطة التشغيل اللوجستي</strong><br/><span style="font-family:monospace; color:var(--accent);">80011022</span></div>
          <span class="badge-gold">نشط</span>
        </div>
        <div class="list-item">
          <div><strong>محطة الأقمار الاصطناعية</strong><br/><span style="font-family:monospace; color:var(--accent);">88899988</span></div>
          <span class="badge-gold">VIP</span>
        </div>
      </div>
    </div>

    <!-- 5. شاشة الإعدادات -->
    <div id="screenSettings" class="screen">
      <div class="profile-card">
        <div class="profile-avatar">سند</div>
        <h3 style="margin:0 0 4px;">برنامج سند السيادي</h3>
        <p style="color:var(--accent); font-size:12px; margin:0;">المنصة العابرة للحدود // v7.0</p>
      </div>
      <div class="card-box">
        <h3>لغة النظام / Language</h3>
        <div style="display:flex; gap:8px;">
          <button class="btn-submit" type="button" onclick="setLang('ar')">العربية 🇸🇦</button>
          <button class="btn-submit" type="button" onclick="setLang('en')" style="background:#1e293b; border-color:var(--border);">English 🇬🇧</button>
        </div>
      </div>
    </div>

  </div>

  <!-- شريط التنقل السفلي الاحترافي (Bottom Navigation Bar) -->
  <nav class="bottom-nav">
    <button class="nav-item active" type="button" onclick="switchScreen('chats', this)">
      <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
      <span id="navChats">الدردشات</span>
    </button>
    <button class="nav-item" type="button" onclick="switchScreen('calls', this)">
      <svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
      <span id="navCalls">المكالمات</span>
    </button>
    <button class="nav-item" type="button" onclick="switchScreen('codes', this)">
      <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
      <span id="navCodes">الأكواد</span>
    </button>
    <button class="nav-item" type="button" onclick="switchScreen('contacts', this)">
      <svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
      <span id="navContacts">جهات الاتصال</span>
    </button>
    <button class="nav-item" type="button" onclick="switchScreen('settings', this)">
      <svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
      <span id="navSettings">الإعدادات</span>
    </button>
  </nav>

  <script>
    let vault = [];
    let currentLang = 'ar';

    function switchScreen(screenId, btn) {
      document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      
      document.getElementById('screen' + screenId.charAt(0).toUpperCase() + screenId.slice(1)).classList.add('active');
      btn.classList.add('active');
    }

    function setLang(l) {
      currentLang = l;
      const isAr = (l === 'ar');
      document.getElementById('htmlRoot').setAttribute('dir', isAr ? 'rtl' : 'ltr');
      
      document.getElementById('navChats').innerText = isAr ? 'الدردشات' : 'Chats';
      document.getElementById('navCalls').innerText = isAr ? 'المكالمات' : 'Calls';
      document.getElementById('navCodes').innerText = isAr ? 'الأكواد' : 'Codes';
      document.getElementById('navContacts').innerText = isAr ? 'جهات الاتصال' : 'Contacts';
      document.getElementById('navSettings').innerText = isAr ? 'الإعدادات' : 'Settings';
      
      document.getElementById('gatewayHead').innerText = isAr ? 'بوابة التوجيه والاتصال الفضائي' : 'Satellite Gateway & Call';
      document.getElementById('lblPhone').innerText = isAr ? 'رقم المستلم (مثال: 96777xxxxxxx):' : 'Recipient Phone:';
      document.getElementById('lblMsg').innerText = isAr ? 'نص التوجيه / الأمر المشفر:' : 'Encrypted Directive:';
      document.getElementById('btnSendMsg').innerText = isAr ? 'إرسال عبر القناة الآمنة' : 'Send via Secure Channel';
      document.getElementById('btnCallUser').innerText = isAr ? 'إطلاق اتصال صوتي مشفر' : 'Launch Encrypted Call
