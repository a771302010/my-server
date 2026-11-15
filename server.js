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
    body { margin: 0; padding: 12px; background: var(--bg); color: var(--text); font-family: sans-serif; }
    .container { max-width: 720px; margin: 0 auto; background: var(--card); border-radius: 16px; padding: 20px; border: 1px solid var(--border); box-shadow: 0 25px 50px rgba(0,0,0,0.8); }
    
    .telemetry-bar { background: #020617; border: 1px solid var(--border); border-radius: 8px; padding: 8px 12px; margin-bottom: 14px; font-family: monospace; font-size: 11px; display: flex; justify-content: space-between; align-items: center; color: var(--accent); }
    .telemetry-dot { width: 8px; height: 8px; background: var(--accent); border-radius: 50%; box-shadow: 0 0 10px var(--accent); animation: pulse 1.5s infinite; }
    @keyframes pulse { 0% { opacity: 0.3; } 50% { opacity: 1; } 100% { opacity: 0.3; } }

    header { text-align: center; border-bottom: 1px solid var(--border); padding-bottom: 14px; margin-bottom: 16px; }
    .official-logo { width: 64px; height: 64px; background: linear-gradient(135deg, var(--primary), var(--accent)); border-radius: 16px; margin: 0 auto 10px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 20px rgba(56, 189, 248, 0.4); border: 2px solid var(--gold); }
    .official-logo svg { width: 34px; height: 34px; fill: #ffffff; }
    h1 { margin: 0 0 4px; font-size: 22px; }
    .subtitle { color: var(--accent); font-size: 12px; font-weight: 600; }
    
    .top-controls { display: flex; justify-content: center; gap: 8px; margin-top: 10px; }
    .btn-ctrl { background: #1e293b; border: 1px solid var(--border); color: #fff; padding: 6px 12px; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: bold; }
    .btn-ctrl.active-lang { border-color: var(--gold); color: var(--gold); }

    .nav-tabs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 16px; }
    .tab-btn { background: #1e293b; border: 1px solid var(--border); padding: 10px 6px; border-radius: 10px; color: var(--muted); cursor: pointer; font-weight: bold; text-align: center; font-size: 12px; }
    .tab-btn.active { background: var(--primary); color: #fff; border-color: var(--accent); box-shadow: 0 4px 15px rgba(30,58,138,0.6); }

    .section { display: none; }
    .section.active { display: block; animation: fadeIn 0.2s ease; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .card-box { background: #1e293b; border: 1px solid var(--border); border-radius: 12px; padding: 16px; margin-bottom: 12px; }
    .card-box h3 { margin: 0 0 12px; font-size: 14px; color: var(--text); border-right: 4px solid var(--gold); padding-right: 8px; }
    [dir="ltr"] .card-box h3 { border-right: none; border-left: 4px solid var(--gold); padding-right: 0; padding-left: 8px; }

    label { display: block; margin-bottom: 6px; font-weight: bold; font-size: 12px; color: var(--muted); }
    input, select { width: 100%; padding: 11px; border-radius: 8px; border: 1px solid var(--border); margin-bottom: 10px; background: #030712; color: var(--text); font-size: 13px; box-sizing: border-box; }
    input:focus, select:focus { border-color: var(--accent); outline: none; }

    .otp-container { display: flex; justify-content: space-between; gap: 4px; direction: ltr; margin-bottom: 12px; }
    .otp-input { width: 100% !important; max-width: 44px; height: 46px; text-align: center; font-size: 18px; font-weight: bold; border: 2px solid var(--border); border-radius: 8px; background: #030712; color: var(--accent); font-family: monospace; padding: 0 !important; margin: 0 !important; }
    .otp-input:focus { border-color: var(--gold); box-shadow: 0 0 10px rgba(245,158,11,0.4); }

    .btn-submit { width: 100%; padding: 12px; background: var(--primary); color: #fff; border: 1px solid var(--accent); border-radius: 8px; font-size: 14px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.4); }
    .btn-submit:hover { background: var(--primary-hover); }
    .btn-call { background: #312e81; border-color: var(--quantum); margin-top: 8px; }

    .list-item { background: #030712; border: 1px solid var(--border); border-radius: 8px; padding: 10px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; }
    .badge-gold { background: rgba(245, 158, 11, 0.15); color: var(--gold); border: 1px solid var(--gold); padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: bold; }
    .footer-note { text-align: center; font-size: 10px; color: var(--muted); margin-top: 14px; font-family: monospace; }
  </style>
</head>
<body>
  <div class="container">
    <div class="telemetry-bar">
      <span id="telemetryStatus">AI-SAT LINK: <strong>SECURED // QUANTUM v6.0</strong></span>
      <div style="display:flex; align-items:center; gap:6px;">
        <span id="txtOnline">ONLINE (1X OPTIMIZED)</span>
        <div class="telemetry-dot"></div>
      </div>
    </div>

    <header>
      <div class="official-logo">
        <svg viewBox="0 0 24 24">
          <path d="M12 2C9.5 2 7.5 4 7.5 6.5C7.5 7.8 8.1 9 9 9.8C7.2 10.5 5.5 12 4.5 14C3.5 16 3.5 18 4.5 20C5.5 22 7.5 22 9.5 22C11.5 22 13 21 14 19.5C15 21 16.5 22 18.5 22C20.5 22 22.5 20 23.5 18C24.5 16 24.5 14 23.5 12C22.5 10 20.8 8.5 19 7.8C19.9 9 20.5 10.2 20.5 11.5C20.5 14 18.5 16 16 16C15.2 16 14.5 15.8 13.9 15.4C14.3 14.4 14.5 13.3 14.5 12.2C14.5 9 12.5 6.5 12 6.5Z"/>
        </svg>
      </div>
      <h1 id="txtTitle">برنامج سند</h1>
      <p class="subtitle" id="txtSub">المنصة السيادية الدولية عابرة الحدود</p>
      <div class="top-controls">
        <button class="btn-ctrl active-lang" type="button" id="langArBtn">العربية 🇸🇦</button>
        <button class="btn-ctrl" type="button" id="langEnBtn">English 🇬🇧</button>
      </div>
    </header>

    <div class="nav-tabs">
      <button class="tab-btn active" type="button" id="tabGenBtn">الأكواد</button>
      <button class="tab-btn" type="button" id="tabVaultBtn">الخزنة</button>
      <button class="tab-btn" type="button" id="tabGatewayBtn">التوجيه والاتصال</button>
    </div>

    <!-- 1. قسم توليد الأكواد -->
    <div id="sectionGenerator" class="section active">
      <div class="card-box">
        <h3 id="genHead">توليد وتأمين كود سيادي (8 خانات)</h3>
        <form id="codeForm">
          <label id="lblOwner">اسم الجهة أو المعرف:</label>
          <input type="text" id="ownerName" placeholder="مثال: غرفة العمليات المركزية" required />
          
          <label id="lblOtp">أدخل الكود (8 خانات دقيقة - انتقال تلقائي):</label>
          <div class="otp-container" id="otpGroup">
            <input type="text" class="otp-input" maxlength="1" inputmode="numeric" />
            <input type="text" class="otp-input" maxlength="1" inputmode="numeric" />
            <input type="text" class="otp-input" maxlength="1" inputmode="numeric" />
            <input type="text" class="otp-input" maxlength="1" inputmode="numeric" />
            <input type="text" class="otp-input" maxlength="1" inputmode="numeric" />
            <input type="text" class="otp-input" maxlength="1" inputmode="numeric" />
            <input type="text" class="otp-input" maxlength="1" inputmode="numeric" />
            <input type="text" class="otp-input" maxlength="1" inputmode="numeric" />
          </div>

          <label id="lblCat">التصنيف السيادي:</label>
          <select id="numCategory">
            <option value="بروتوكول VIP السيادي (888)">بروتوكول VIP السيادي (888xxxxx)</option>
            <option value="محطة التشغيل المركزية (800)">محطة التشغيل المركزية (800xxxxx)</option>
          </select>

          <button type="submit" class="btn-submit" id="btnSave">اعتماد الكود في النظام</button>
        </form>
      </div>
    </div>

    <!-- 2. قسم الخزنة -->
    <div id="sectionVault" class="section">
      <div class="card-box">
        <h3 id="vaultHead">خزنة الأكواد السيادية</h3>
        <div id="vaultList">
          <p style="color:var(--muted); text-align:center; font-size:12px;" id="vaultEmpty">الخزنة فارغة ونظيفة.</p>
        </div>
      </div>
    </div>

    <!-- 3. قسم التوجيه والاتصال المباشر -->
    <div id="sectionGateway" class="section">
      <div class="card-box">
        <h3 id="gatewayHead">بوابة التوجيه والاتصال الفضائي المشفر</h3>
        
        <label id="lblPhone">رقم المستلم (مع مفتاح الدولة، مثل: 96777xxxxxxx):</label>
        <input type="tel" id="targetPhone" placeholder="96777xxxxxxx" style="direction:ltr; text-align:right;" />
        
        <label id="lblMsg">نص التوجيه / الأمر المشفر:</label>
        <input type="text" id="targetMsg" placeholder="اكتب نص الأمر التشغيلي..." />
        
        <button type="button" class="btn-submit" id="btnSendMsg">إرسال رسالة عبر القناة الآمنة</button>
        <button type="button" class="btn-submit btn-call" id="btnCallUser">إطلاق اتصال صوتي فضائي مشفر</button>
      </div>
    </div>

    <div class="footer-note" id="footerText">SANAD GLOBAL QUANTUM PROTOCOL v6.0 - 1X RESILIENT</div>
  </div>

  <script>
    let vault = [];
    let currentLang = 'ar';

    const dict = {
      ar: {
        title: "برنامج سند",
        sub: "المنصة السيادية الدولية عابرة الحدود",
        online: "متصل (محسن لشبكات 1X)",
        tabGen: "الأكواد",
        tabVault: "الخزنة",
        tabGateway: "التوجيه والاتصال",
        genHead: "توليد وتأمين كود سيادي (8 خانات)",
        lblOwner: "اسم الجهة أو المعرف:",
        ownerPlaceholder: "مثال: غرفة العمليات المركزية",
        lblOtp: "أدخل الكود (8 خانات دقيقة - انتقال تلقائي):",
        lblCat: "التصنيف السيادي:",
        opt1: "بروتوكول VIP السيادي (888xxxxx)",
        opt2: "محطة التشغيل المركزية (800xxxxx)",
        btnSave: "اعتماد الكود في النظام",
        vaultHead: "خزنة الأكواد السيادية",
        vaultEmpty: "الخزنة فارغة ونظيفة.",
        gatewayHead: "بوابة التوجيه والاتصال الفضائي المشفر",
        lblPhone: "رقم المستلم (مع مفتاح الدولة، مثل: 96777xxxxxxx):",
        lblMsg: "نص التوجيه / الأمر المشفر:",
        msgPlaceholder: "اكتب نص الأمر التشغيلي...",
        btnSendMsg: "إرسال رسالة عبر القناة الآمنة",
        btnCallUser: "إطلاق اتصال صوتي فضائي مشفر",
        savedAlert: "تم الحفظ بنجاح في الخزنة السيادية!",
        completeOtpAlert: "الرجاء إكمال إدخال الـ 8 خانات كاملة.",
        fillFieldsAlert: "الرجاء إدخال رقم المستلم ونصح التوجيه.",
        fillPhoneAlert: "الرجاء إدخال رقم المستلم أولاً.",
        msgPrefix: "[بروتوكول سند الفضائي الذكي - أمر مشفر]: ",
        callPrefix: "[طلب اتصال صوتي عالي التأمين عبر بروتوكول سند]"
      },
      en: {
        title: "Sanad Platform",
        sub: "International Sovereign Cross-Border Platform",
        online: "ONLINE (1X OPTIMIZED)",
        tabGen: "Codes",
        tabVault: "Vault",
        tabGateway: "Gateway & Call",
        genHead: "Generate & Secure Sovereign Code (8 Digits)",
        lblOwner: "Entity Name / ID:",
        ownerPlaceholder: "e.g. Central Operations Room",
        lblOtp: "Enter Code (8 Exact Digits - Auto Advance):",
        lblCat: "Sovereign Category:",
        opt1: "VIP Sovereign Protocol (888xxxxx)",
        opt2: "Central Operation Station (800xxxxx)",
        btnSave: "Authorize Code in System",
        vaultHead: "Sovereign Code Vault",
        vaultEmpty: "Vault is empty and clean.",
        gatewayHead: "Encrypted Satellite Gateway & Call",
        lblPhone: "Recipient Number (with country code, e.g. 96777xxxxxxx):",
        lblMsg: "Encrypted Directive / Message:",
        msgPlaceholder: "Type operational directive...",
        btnSendMsg: "Send Message via Secure Channel",
        btnCallUser: "Launch Encrypted Space Audio Call",
        savedAlert: "Successfully saved in sovereign vault!",
        completeOtpAlert: "Please complete all 8 digits.",
        fillFieldsAlert: "Please enter recipient phone and message.",
        fillPhoneAlert: "Please enter recipient phone first.",
        msgPrefix: "[Sanad Quantum Protocol - Encrypted Directive]: ",
        callPrefix: "[High-Security Voice Call Request via Sanad]"
      }
    };

    function switchTab(target) {
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      
      if (target === 'generator') {
        document.getElementById('sectionGenerator').classList.add('active');
        document.getElementById('tabGenBtn').classList.add('active');
      } else if (target === 'vault') {
        document.getElementById('sectionVault').classList.add('active');
        document.getElementById('tabVaultBtn').classList.add('active');
      } else if (target === 'gateway') {
        document.getElementById('sectionGateway').classList.add('active');
        document.getElementById('tabGatewayBtn').classList.add('active');
      }
    }

    document.getElementById('tabGenBtn').addEventListener('click', () => switchTab('generator'));
    document.getElementById('tabVaultBtn').addEventListener('click', () => switchTab('vault'));
    document.getElementById('tabGatewayBtn').addEventListener('click', () => switchTab('gateway'));

    function setLang(l) {
      currentLang = l;
      const t = dict[l];
      const isAr = (l === 'ar');
      
      document.getElementById('htmlRoot').setAttribute('dir', isAr ? 'rtl' : 'ltr');
      document.getElementById('langArBtn').classList.toggle('active-lang', isAr);
      document.getElementById('langEnBtn').classList.toggle('active-lang', !isAr);

      document.getElementById('txtTitle').innerText = t.title;
      document.getElementById('txtSub').innerText = t.sub;
      document.getElementById('txtOnline').innerText = t.online;
      
      document.getElementById('tabGenBtn').innerText = t.tabGen;
      document.getElementById('tabVaultBtn').innerText = t.tabVault;
      document.getElementById('tabGatewayBtn').innerText = t.tabGateway;
      
      document.getElementById('genHead').innerText = t.genHead;
      document.getElementById('lblOwner').innerText = t.lblOwner;
      document.getElementById('ownerName').placeholder = t.ownerPlaceholder;
      document.getElementById('lblOtp').innerText = t.lblOtp;
      document.getElementById('lblCat').innerText = t.lblCat;
      
      const select = document.getElementById('numCategory');
      select.options[0].text = t.opt1;
      select.options[1].text = t.opt2;
      
      document.getElementById('btnSave').innerText = t.btnSave;
      document.getElementById('vaultHead').innerText = t.vaultHead;
      
      if(vault.length === 0) {
        document.getElementById('vaultEmpty').innerText = t.vaultEmpty;
      }
      
      document.getElementById('gatewayHead').innerText = t.gatewayHead;
      document.getElementById('lblPhone').innerText = t.lblPhone;
      document.getElementById('lblMsg').innerText = t.lblMsg;
      document.getElementById('targetMsg').placeholder = t.msgPlaceholder;
      document.getElementById('btnSendMsg').innerText = t.btnSendMsg;
      document.getElementById('btnCallUser').innerText = t.btnCallUser;
    }

    document.getElementById('langArBtn').addEventListener('click', () => setLang('ar'));
    document.getElementById('langEnBtn').addEventListener('click', () => setLang('en'));

    // --- هندسة الانتقال التلقائي والدعم الكامل لل لصق (OTP Auto-Advance & Paste) ---
    const otpInputs = document.querySelectorAll('.otp-input');
    
    otpInputs.forEach((input, idx) => {
      input.addEventListener('input', (e) => {
        const val = e.target.value;
        // إذا قام المستخدم لصق نص طويل (8 أرقام دفعة واحدة)
        if (val.length > 1) {
          const chars = val.replace(/\\D/g, '').split('');
          let curIdx = idx;
          chars.forEach(char => {
            if (curIdx < otpInputs.length) {
              otpInputs[curIdx].value = char;
              curIdx++;
            }
          });
          if (curIdx < otpInputs.length) {
            otpInputs[curIdx].focus();
          } else {
            otpInputs[otpInputs.length - 1].focus();
          }
          return;
        }

        // الانتقال التلقائي للخانة التالية عند الكتابة العادية
        if (val.length === 1 && idx < otpInputs.length - 1) {
          otpInputs[idx + 1].focus();
        }
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace') {
          if (input.value === '' && idx > 0) {
            otpInputs[idx - 1].focus();
          } else {
            input.value = '';
          }
        }
      });
    });

    document.getElementById('codeForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const t = dict[currentLang];
      const owner = document.getElementById('ownerName').value;
      const cat = document.getElementById('numCategory').value;
      let num = '';
      otpInputs.forEach(i => num += i.value);

      if (num.length < 8) {
        alert(t.completeOtpAlert);
        return;
      }

      vault.unshift({ owner, num, cat });
      renderVault();
      otpInputs.forEach(i => i.value = '');
      document.getElementById('ownerName').value = '';
      otpInputs[0].focus();
      alert(t.savedAlert);
      switchTab('vault');
    });

    function renderVault() {
      const t = dict[currentLang];
      const list = document.getElementById('vaultList');
      if (vault.length === 0) {
        list.innerHTML = '<p style="color:var(--muted); text-align:center; font-size:12px;" id="vaultEmpty">' + t.vaultEmpty + '</p>';
        return;
      }
      list.innerHTML = vault.map(i => '<div class="list-item"><div><strong>' + i.owner + '</strong><br/><span style="font-family:monospace; color:var(--accent);">' + i.num + '</span></div><span class="badge-gold">' + i.cat + '</span></div>').join('');
    }

    // بوابة التوجيه والإرسال الفضائي (متوافقة 100% مع أجهزة الجوال والشبكات الضعيفة)
    document.getElementById('btnSendMsg').addEventListener('click', () => {
      const t = dict[currentLang];
      let phone = document.getElementById('targetPhone').value.trim();
      const msg = document.getElementById('targetMsg').value.trim();
      if (!phone || !msg) {
        alert(t.fillFieldsAlert);
        return;
      }
      phone = phone.replace(/^0+/, '').replace(/^\+/, '');
      window.location.href = 'https://wa.me/' + phone + '?text=' + encodeURIComponent(t.msgPrefix + msg);
    });

    document.getElementById('btnCallUser').addEventListener('click', () => {
      const t = dict[currentLang];
      let phone = document.getElementById('targetPhone').value.trim();
      if (!phone) {
        alert(t.fillPhoneAlert);
        return;
      }
      phone = phone.replace(/^0+/, '').replace(/^\+/, '');
      window.location.href = 'https://wa.me/' + phone + '?text=' + encodeURIComponent(t.callPrefix);
    });
  </script>
</body>
</html>`);
});

app.listen(PORT, () => { console.log('Server running on port ' + PORT); });
