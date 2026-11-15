const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="ar" dir="rtl" id="htmlRoot">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>برنامج سند - المنصة السيادية الدولية</title>
  <style>
    :root {
      --primary: #0f766e;
      --primary-hover: #115e59;
      --bg: #090d16;
      --card: #111827;
      --text: #f3f4f6;
      --muted: #9ca3af;
      --border: #374151;
      --accent: #38bdf8;
      --gold: #f59e0b;
    }
    body.theme-navy {
      --primary: #2563eb;
      --primary-hover: #1d4ed8;
    }
    * { box-sizing: border-box; font-family: system-ui, -apple-system, sans-serif; }
    body {
      margin: 0;
      padding: 16px;
      background: var(--bg);
      color: var(--text);
      transition: all 0.3s ease;
    }
    .container {
      max-width: 720px;
      margin: 0 auto;
      background: var(--card);
      border-radius: 20px;
      padding: 24px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.6);
      border: 1px solid var(--border);
    }
    header {
      text-align: center;
      border-bottom: 1px solid var(--border);
      padding-bottom: 16px;
      margin-bottom: 18px;
    }
    .official-logo {
      width: 74px;
      height: 74px;
      background: linear-gradient(135deg, var(--primary), var(--accent));
      border-radius: 20px;
      margin: 0 auto 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 20px rgba(56, 189, 248, 0.3);
      border: 2px solid #ffffff;
    }
    .official-logo svg {
      width: 42px;
      height: 42px;
      fill: #ffffff;
    }
    h1 { margin: 0 0 4px; color: var(--text); font-size: 24px; font-weight: 800; }
    .subtitle { margin: 0 0 10px; color: var(--accent); font-size: 13px; font-weight: 600; }
    
    .top-controls {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }
    .btn-ctrl {
      border: 1px solid var(--border);
      background: #1f2937;
      padding: 5px 12px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: bold;
      cursor: pointer;
      color: var(--text);
    }

    .satellite-status {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(15, 118, 110, 0.2);
      border: 1px solid var(--primary);
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11px;
      color: var(--accent);
      margin-bottom: 12px;
      font-family: monospace;
    }
    .sat-dot { width: 8px; height: 8px; background: #22c55e; border-radius: 50%; box-shadow: 0 0 8px #22c55e; animation: pulse 2s infinite; }
    @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }

    .nav-tabs {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
      margin-bottom: 18px;
    }
    .tab-btn {
      background: #1f2937;
      border: 1px solid var(--border);
      padding: 10px 4px;
      border-radius: 10px;
      font-weight: bold;
      font-size: 12px;
      cursor: pointer;
      color: var(--muted);
      text-align: center;
      transition: 0.2s;
    }
    .tab-btn.active {
      background: var(--primary);
      color: #fff;
      border-color: var(--primary);
      box-shadow: 0 4px 12px rgba(15, 118, 110, 0.4);
    }
    .section { display: none; }
    .section.active { display: block; }

    .card-box {
      background: #1f2937;
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 16px;
      margin-bottom: 14px;
    }
    .card-box h3 { margin: 0 0 12px; color: var(--text); font-size: 15px; border-right: 4px solid var(--accent); padding-right: 8px; }
    [dir="ltr"] .card-box h3 { border-right: none; border-left: 4px solid var(--accent); padding-right: 0; padding-left: 8px; }

    label { display: block; margin-bottom: 6px; font-weight: bold; font-size: 13px; color: var(--muted); }
    input, select, textarea {
      width: 100%;
      padding: 12px;
      border-radius: 10px;
      border: 1px solid var(--border);
      margin-bottom: 12px;
      font-size: 14px;
      background: #111827;
      color: var(--text);
    }
    input:focus, textarea:focus { border-color: var(--accent); outline: none; }

    /* خانات الأكواد داخل المسطر */
    .otp-container {
      display: flex;
      justify-content: space-between;
      gap: 5px;
      direction: ltr;
      margin-bottom: 14px;
    }
    .otp-input {
      width: 38px;
      height: 50px;
      text-align: center;
      font-size: 20px;
      font-weight: bold;
      border: 2px solid var(--border);
      border-radius: 8px;
      background: #111827;
      color: var(--accent);
      font-family: monospace;
    }
    .otp-input:focus {
      border-color: var(--accent);
      box-shadow: 0 0 8px rgba(56, 189, 248, 0.4);
    }

    .btn-submit {
      width: 100%;
      padding: 13px;
      background: var(--primary);
      color: #fff;
      border: none;
      border-radius: 10px;
      font-size: 15px;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    .btn-submit:hover { background: var(--primary-hover); }

    .list-item {
      background: #111827;
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 12px;
      margin-bottom: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .badge-gold { background: rgba(245, 158, 11, 0.2); color: var(--gold); border: 1px solid var(--gold); padding: 3px 8px; border-radius: 15px; font-size: 11px; font-weight: bold; }
    
    .chat-box {
      background: #111827;
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 12px;
      height: 220px;
      overflow-y: auto;
      margin-bottom: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .chat-msg {
      background: #1f2937;
      padding: 10px 14px;
      border-radius: 10px;
      font-size: 13px;
      border-right: 3px solid var(--accent);
    }
    [dir="ltr"] .chat-msg { border-right: none; border-left: 3px solid var(--accent); }
    .chat-msg small { display: block; color: var(--accent); font-size: 10px; margin-bottom: 3px; font-family: monospace; }
    .footer-note { text-align: center; font-size: 11px; color: var(--muted); margin-top: 16px; font-family: monospace; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="official-logo">
        <svg viewBox="0 0 24 24">
          <path d="M12 2C9.5 2 7.5 4 7.5 6.5C7.5 7.8 8.1 9 9 9.8C7.2 10.5 5.5 12 4.5 14C3.5 16 3.5 18 4.5 20C5.5 22 7.5 22 9.5 22C11.5 22 13 21 14 19.5C15 21 16.5 22 18.5 22C20.5 22 22.5 20 23.5 18C24.5 16 24.5 14 23.5 12C22.5 10 20.8 8.5 19 7.8C19.9 9 20.5 10.2 20.5 11.5C20.5 14 18.5 16 16 16C15.2 16 14.5 15.8 13.9 15.4C14.3 14.4 14.5 13.3 14.5 12.2C14.5 9 12.5 6.5 12 6.5Z"/>
        </svg>
      </div>
      <h1 id="txtTitle">برنامج سند</h1>
      <p class="subtitle" id="txtSub">المنصة السيادية الدولية المجرّدة عابرة الحدود</p>
      
      <div class="satellite-status">
        <span class="sat-dot"></span> <span id="txtSatStatus">متصل بالقمر الصناعي المشفر | بروتوكول AI-Sovereign نشط</span>
      </div>

      <div class="top-controls">
        <button class="btn-ctrl" onclick="setLang('ar')">العربية 🇸🇦</button>
        <button class="btn-ctrl" onclick="setLang('en')">English 🇬🇧</button>
        <button class="btn-ctrl" onclick="setTheme('green')" id="txtThemeGreen">الخضراء</button>
        <button class="btn-ctrl" onclick="setTheme('navy')" id="txtThemeNavy">الأزرق</button>
      </div>
    </header>

    <div class="nav-tabs">
      <button class="tab-btn active" onclick="showTab('generator', this)" id="tab1">الأكواد</button>
      <button class="tab-btn" onclick="showTab('vault', this)" id="tab2">الخزنة</button>
      <button class="tab-btn" onclick="showTab('chat', this)" id="tab3">الدردشة</button>
      <button class="tab-btn" onclick="showTab('gateway', this)" id="tab4">التوجيه</button>
    </div>

    <!-- 1. الأكواد والترقيم السيادي -->
    <div id="generator" class="section active">
      <div class="card-box">
        <h3 id="genHead">توليد وتأمين كود سيادي دولي (9 خانات)</h3>
        <form onsubmit="saveSanadNumber(event)">
          <label id="lblOwner">معرّف الجهة أو العقد الإداري:</label>
          <input type="text" id="ownerName" placeholder="مثال: غرفة العمليات المركزية الدولية" required />
          
          <label id="lblOtp">إدخال الكود المشفر داخل التسطير (9 خانات):</label>
          <div class="otp-container">
            <input type="text" class="otp-input" maxlength="1" oninput="moveNext(this, 1)" />
            <input type="text" class="otp-input" maxlength="1" oninput="moveNext(this, 2)" />
            <input type="text" class="otp-input" maxlength="1" oninput="moveNext(this, 3)" />
            <input type="text" class="otp-input" maxlength="1" oninput="moveNext(this, 4)" />
            <input type="text" class="otp-input" maxlength="1" oninput="moveNext(this, 5)" />
            <input type="text" class="otp-input" maxlength="1" oninput="moveNext(this, 6)" />
            <input type="text" class="otp-input" maxlength="1" oninput="moveNext(this, 7)" />
            <input type="text" class="otp-input" maxlength="1" oninput="moveNext(this, 8)" />
            <input type="text" class="otp-input" maxlength="1" oninput="moveNext(this, 9)" />
          </div>

          <label id="lblCat">مستوى البروتوكول والسيادة:</label>
          <select id="numCategory">
            <option value="بروتوكول VIP السيادي (سلسلة 888)">بروتوكول VIP السيادي (888xxxxxx)</option>
            <option value="محطة التشغيل المركزية (سلسلة 800)">محطة التشغيل المركزية (800xxxxxx)</option>
          </select>

          <button type="submit" class="btn-submit" id="btnSave">تثبيت واعتماد الكود في النظام</button>
        </form>
      </div>
    </div>

    <!-- 2. الخزنة المدارية -->
    <div id="vault" class="section">
      <div class="card-box">
        <h3 id="vaultHead">خزنة الأكواد السيادية المؤمنة</h3>
        <div id="numbersVaultList">
          <p style="color:var(--muted); font-size:13px; text-align:center; margin:15px 0;" id="vaultEmpty">الخزنة فارغة ونظيفة. ابدأ بإصدار الأكواد عبر التبويب الأول.</p>
        </div>
      </div>
    </div>

    <!-- 3. الدردشة الذكية ومشفرة -->
    <div id="chat" class="section">
      <div class="card-box">
        <h3 id="chatHead">الدردشة والاتصال الذكي المشفر (AI Mesh Network)</h3>
        <div class="chat-box" id="chatMessages">
          <div class="chat-msg">
            <small id="chatSys">النظام الذكي - [مرجعية القمر الصناعي]</small>
            <span id="chatWelcome">تم تأمين القناة بنجاح. جميع الرسائل تخضع لبروتوكول التشفير العابر للحدود.</span>
          </div>
        </div>
        <form onsubmit="sendChatMessage(event)">
          <input type="text" id="chatInput" placeholder="اكتب الأمر أو المراسلة المشفرة..." required />
          <button type="submit" class="btn-submit" id="btnChatSend">بث فوري عبر الشبكة الآمنة</button>
        </form>
      </div>
    </div>

    <!-- 4. بوابة التوجيه السيادي الدولي -->
    <div id="gateway" class="section">
      <div class="card-box">
        <h3 id="gatewayHead">بوابة التوجيه الدولي والربط المداري (Sovereign Gateway)</h3>
        <p style="color:var(--muted); font-size:12px; margin:0 0 12px;" id="gatewaySub">توجيه وبث الأوامر المشفرة عبر البروتوكول الدولي المباشر:</p>
        
        <label id="lblTargetPhone">رقم أو كود المستلم الدولي (بدون قيود محلية):</label>
        <input type="tel" id="targetPhone" placeholder="أدخل الرقم أو الكود الدولي" style="direction:ltr; text-align:right;" />
        
        <label id="lblTargetMsg">نص التعميم أو التوجيه السيادي:</label>
        <input type="text" id="targetMsg" placeholder="اكتب نص الأمر التشغيلي..." />
        
        <button class="btn-submit" onclick="sendSecureDirective()" id="btnGatewaySend">إرسال عبر البروتوكول الدولي المشفر</button>
      </div>
    </div>

    <div class="footer-note">
      SANAD SOVEREIGN SATELLITE CORE | SECURE ENCRYPTED PROTOCOL v3.5
    </div>
  </div>

  <script>
    let vaultData = [];
    let currentLang = 'ar';

    const langData = {
      ar: {
        title: "برنامج سند",
        sub: "المنصة السيادية الدولية المجرّدة عابرة الحدود",
        sat: "متصل بالقمر الصناعي المشفر | بروتوكول AI-Sovereign نشط",
        t1: "الأكواد", t2: "الخزنة", t3: "الدردشة", t4: "التوجيه",
        genHead: "توليد وتأمين كود سيادي دولي (9 خانات)",
        lblOwner: "معرّف الجهة أو العقد الإداري:",
        lblOtp: "إدخال الكود المشفر داخل التسطير (9 خانات):",
        lblCat: "مستوى البروتوكول والسيادة:",
        btnSave: "تثبيت واعتماد الكود في النظام",
        vaultHead: "خزنة الأكواد السيادية المؤمنة",
        vaultEmpty: "الخزنة فارغة ونظيفة. ابدأ بإصدار الأكواد عبر التبويب الأول.",
        chatHead: "الدردشة والاتصال الذكي المشفر (AI Mesh Network)",
        chatSys: "النظام الذكي - [مرجعية القمر الصناعي]",
        chatWelcome: "تم تأمين القناة بنجاح. جميع الرسائل تخضع لبروتوكول التشفير العابر للحدود.",
        chatPlaceholder: "اكتب الأمر أو المراسلة المشفرة...",
        btnChatSend: "بث فوري عبر الشبكة الآمنة",
        gatewayHead: "بوابة التوجيه الدولي والربط المداري (Sovereign Gateway)",
        gatewaySub: "توجيه وبث الأوامر المشفرة عبر البروتوكول الدولي المباشر:",
        lblTargetPhone: "رقم أو كود المستلم الدولي (بدون قيود محلية):",
        lblTargetMsg: "نص التعميم أو التوجيه السيادي:",
        btnGatewaySend: "إرسال عبر البروتوكول الدولي المشفر",
        themeGreen: "الخضراء", themeNavy: "الأزرق"
      },
      en: {
        title: "Sanad Platform",
        sub: "International Sovereign Cross-Border Platform",
        sat: "Connected to Encrypted Satellite | AI-Sovereign Active",
        t1: "Codes", t2: "Vault", t3: "Chat", t4: "Gateway",
        genHead: "Generate & Secure Sovereign Code (9 Digits)",
        lblOwner: "Entity ID or Administrative Contract:",
        lblOtp: "Enter Encrypted Code in Grid (9 Digits):",
        lblCat: "Protocol & Sovereignty Level:",
        btnSave: "Install & Authorize Code in System",
        vaultHead: "Secure Sovereign Codes Vault",
        vaultEmpty: "Vault is empty and clean. Start issuing codes from tab 1.",
        chatHead: "Encrypted AI Mesh Network Chat",
        chatSys: "AI System - [Satellite Reference]",
        chatWelcome: "Channel successfully secured. All messages adhere to cross-border encryption protocols.",
        chatPlaceholder: "Type encrypted command or message...",
        btnChatSend: "Broadcast Instantly via Secure Mesh",
        gatewayHead: "International Sovereign Gateway",
        gatewaySub: "Route and broadcast encrypted directives via direct international protocol:",
        lblTargetPhone: "International Recipient Code/Number:",
        lblTargetMsg: "Directive or Sovereign Order Text:",
        btnGatewaySend: "Send via Encrypted International Protocol",
        themeGreen: "Green", themeNavy: "Navy"
      }
    };

    function setLang(lang) {
      currentLang = lang;
      const root = document.getElementById('htmlRoot');
      root.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
      root.setAttribute('lang', lang);

      const d = langData[lang];
      document.getElementById('txtTitle').innerText = d.title;
      document.getElementById('txtSub').innerText = d.sub;
      document.getElementById('txtSatStatus').innerText = d.sat;
      document.getElementById('tab1').innerText = d.t1;
      document.getElementById('tab2').innerText = d.t2;
      document.getElementById('tab3').innerText = d.t3;
      document.getElementById('tab4').innerText = d.t4;
      document.getElementById('genHead').innerText = d.genHead;
      document.getElementById('lblOwner').innerText = d.lblOwner;
      document.getElementById('lblOtp').innerText = d.lblOtp;
      document.getElementById('lblCat').innerText = d.lblCat;
      document.getElementById('btnSave').innerText = d.btnSave;
      document.getElementById('vaultHead').innerText = d.vaultHead;
      document.getElementById('vaultEmpty').innerText = d.vaultEmpty;
      document.getElementById('chatHead').innerText = d.chatHead;
      document.getElementById('chatSys').innerText = d.chatSys;
      document.getElementById('chatWelcome').innerText = d.chatWelcome;
      document.getElementById('chatInput').placeholder = d.chatPlaceholder;
      document.getElementById('btnChatSend').innerText = d.btnChatSend;
      document.getElementById('gatewayHead').innerText = d.gatewayHead;
      document.getElementById('gatewaySub').innerText = d.gatewaySub;
      document.getElementById('lblTargetPhone').innerText = d.lblTargetPhone;
      document.getElementById('lblTargetMsg').innerText = d.lblTargetMsg;
      document.getElementById('btnGatewaySend').innerText = d.btnGatewaySend;
      document.getElementById('txtThemeGreen').innerText = d.themeGreen;
      document.getElementById('txtThemeNavy').innerText = d.themeNavy;
    }

    function setTheme(mode) {
      if (mode === 'navy') document.body.classList.add('theme-navy');
      else document.body.classList.remove('theme-navy');
    }

    function showTab(id, btn) {
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.getElementById(id).classList.add('active');
      btn.classList.add('active');
    }

    function moveNext(el, index) {
      if (el.value.length === 1) {
        const inputs = document.querySelectorAll('.otp-input');
        if (index < inputs.length) {
          inputs[index].focus();
        }
      }
    }

    function saveSanadNumber(e) {
      e.preventDefault();
      const owner = document.getElementById('ownerName').value;
      const category = document.getElementById('numCategory').value;
      
      const inputs = document.querySelectorAll('.otp-input');
      let fullNumber = '';
      inputs.forEach(input => fullNumber += input.value);

      if (fullNumber.length < 9) {
        alert(currentLang === 'ar' ? 'الرجاء إكمال إدخال الـ 9 خانات كاملة داخل التسطير.' : 'Please complete all 9 digits in the grid.');
        return;
      }

      vaultData.unshift({ owner, number: fullNumber, category });
      renderVault();

      inputs.forEach(input => input.value = '');
      document.getElementById('ownerName').value = '';
      alert(currentLang === 'ar' ? 'تم اعتماد الكود وتأمينه بنجاح في السيرفر المداري!' : 'Code successfully secured in orbital server!');
      showTab('vault', document.querySelectorAll('.tab-btn')[1]);
    }

    function renderVault() {
      const list = document.getElementById('numbersVaultList');
      if (vaultData.length === 0) {
        list.innerHTML = \`<p style="color:var(--muted); font-size:13px; text-align:center; margin:15px 0;">\${langData[currentLang].vaultEmpty}</p>\`;
        return;
      }

      list.innerHTML = vaultData.map(item => \`
        <div class="list-item">
          <div>
            <strong style="color:var(--text);">\${item.owner}</strong><br/>
            <span style="font-family:monospace; font-weight:bold; color:var(--accent); letter-spacing:1px; direction:ltr; display:inline-block;">\${item.number}</span>
          </div>
          <span class="badge-gold">\${item.category}</span>
        </div>
      \`).join('');
    }

    function sendChatMessage(e) {
      e.preventDefault();
      const input = document.getElementById('chatInput');
      const box = document.getElementById('chatMessages');
      if(!input.value.trim()) return;

      const div = document.createElement('div');
      div.className = 'chat-msg';
      div.innerHTML = \`<small>\${currentLang === 'ar' ? 'إرسال مؤمن عبر البروتوكول المداري - الآن' : 'Secure Orbital Transmission - Now'}</small>\${input.value}\`;
      box.appendChild(div);
      box.scrollTop = box.scrollHeight;
      input.value = '';
    }

    function sendSecureDirective() {
      const phone = document.getElementById('targetPhone').value.trim();
      const msg = document.getElementById('targetMsg').value.trim();
      if (!phone || !msg) {
        alert(currentLang === 'ar' ? 'الرجاء إدخال رقم المستلم ونص التوجيه بدقة.' : 'Please enter recipient and directive text.');
        return;
      }
      const prefix = currentLang === 'ar' ? '[بروتوكول سند الدولي]: ' : '[Sanad International Protocol]: ';
      const url = \`https://wa.me/\${phone}?text=\${encodeURIComponent(prefix + msg)}\`;
      window.open(url, '_blank');
    }
  </script>
</body>
</html>
  `);
});

app.listen(PORT, () => {
  console.log('Sanad Bilingual Satellite Server running on port ' + PORT);
});
