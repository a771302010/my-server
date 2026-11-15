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
    body { margin: 0; padding: 16px; background: var(--bg); color: var(--text); font-family: sans-serif; }
    .container { max-width: 720px; margin: 0 auto; background: var(--card); border-radius: 20px; padding: 24px; border: 1px solid var(--border); box-shadow: 0 25px 50px rgba(0,0,0,0.8); }
    .telemetry-bar { background: #020617; border: 1px solid var(--border); border-radius: 8px; padding: 8px 12px; margin-bottom: 16px; font-family: monospace; font-size: 11px; display: flex; justify-content: space-between; align-items: center; color: var(--accent); }
    .telemetry-dot { width: 8px; height: 8px; background: var(--accent); border-radius: 50%; box-shadow: 0 0 10px var(--accent); }
    header { text-align: center; border-bottom: 1px solid var(--border); padding-bottom: 16px; margin-bottom: 18px; }
    .official-logo { width: 68px; height: 68px; background: linear-gradient(135deg, var(--primary), var(--accent)); border-radius: 18px; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 20px rgba(56, 189, 248, 0.4); border: 2px solid var(--gold); }
    .official-logo svg { width: 38px; height: 38px; fill: #ffffff; }
    h1 { margin: 0 0 4px; font-size: 24px; }
    .subtitle { color: var(--accent); font-size: 13px; font-weight: 600; }
    .top-controls { display: flex; justify-content: center; gap: 8px; margin-top: 12px; }
    .btn-ctrl { background: #1e293b; border: 1px solid var(--border); color: #fff; padding: 6px 14px; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: bold; }
    .nav-tabs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 18px; }
    .tab-btn { background: #1e293b; border: 1px solid var(--border); padding: 12px 8px; border-radius: 10px; color: var(--muted); cursor: pointer; font-weight: bold; text-align: center; font-size: 13px; }
    .tab-btn.active { background: var(--primary); color: #fff; border-color: var(--accent); box-shadow: 0 4px 15px rgba(30,58,138,0.6); }
    .section { display: none; }
    .section.active { display: block; }
    .card-box { background: #1e293b; border: 1px solid var(--border); border-radius: 14px; padding: 18px; margin-bottom: 14px; }
    .card-box h3 { margin: 0 0 14px; font-size: 15px; color: var(--text); border-right: 4px solid var(--gold); padding-right: 8px; }
    [dir="ltr"] .card-box h3 { border-right: none; border-left: 4px solid var(--gold); padding-right: 0; padding-left: 8px; }
    label { display: block; margin-bottom: 6px; font-weight: bold; font-size: 13px; color: var(--muted); }
    input, select { width: 100%; padding: 12px; border-radius: 10px; border: 1px solid var(--border); margin-bottom: 12px; background: #030712; color: var(--text); font-size: 14px; box-sizing: border-box; }
    input:focus, select:focus { border-color: var(--accent); outline: none; }
    .otp-container { display: flex; justify-content: space-between; gap: 4px; direction: ltr; margin-bottom: 14px; width: 100%; }
    .otp-input { flex: 1; max-width: 40px; height: 48px; text-align: center; font-size: 18px; font-weight: bold; border: 2px solid var(--border); border-radius: 8px; background: #030712; color: var(--accent); font-family: monospace; }
    .otp-input:focus { border-color: var(--gold); box-shadow: 0 0 10px rgba(245,158,11,0.4); }
    .btn-submit { width: 100%; padding: 13px; background: var(--primary); color: #fff; border: 1px solid var(--accent); border-radius: 10px; font-size: 15px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 15px rgba(0,0,0,0.4); }
    .btn-submit:hover { background: var(--primary-hover); }
    .btn-call { background: #312e81; border-color: var(--quantum); margin-top: 8px; }
    .list-item { background: #030712; border: 1px solid var(--border); border-radius: 10px; padding: 12px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
    .badge-gold { background: rgba(245, 158, 11, 0.15); color: var(--gold); border: 1px solid var(--gold); padding: 3px 8px; border-radius: 15px; font-size: 11px; font-weight: bold; }
    .footer-note { text-align: center; font-size: 11px; color: var(--muted); margin-top: 16px; font-family: monospace; }
  </style>
</head>
<body>
  <div class="container">
    <div class="telemetry-bar">
      <span>AI-SAT LINK: <strong style="color:var(--gold);">SECURED // ORBITAL v5.6</strong></span>
      <div style="display:flex; align-items:center; gap:6px;">
        <span>ONLINE</span>
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
        <button class="btn-ctrl" type="button" id="langAr">العربية 🇸🇦</button>
        <button class="btn-ctrl" type="button" id="langEn">English 🇬🇧</button>
      </div>
    </header>

    <div class="nav-tabs">
      <button class="tab-btn active" type="button" id="tabGenBtn">الأكواد</button>
      <button class="tab-btn" type="button" id="tabVaultBtn">الخزنة</button>
      <button class="tab-btn" type="button" id="tabGatewayBtn">التوجيه</button>
    </div>

    <!-- 1. قسم توليد الأكواد -->
    <div id="sectionGenerator" class="section active">
      <div class="card-box">
        <h3 id="genHead">توليد وتأمين كود سيادي (8 خانات)</h3>
        <form id="codeForm">
          <label id="lblOwner">اسم الجهة أو المعرف:</label>
          <input type="text" id="ownerName" placeholder="مثال: غرفة العمليات المركزية" required />
          
          <label id="lblOtp">أدخل الكود (8 خانات دقيقة):</label>
          <div class="otp-container">
            <input type="text" class="otp-input" maxlength="1" />
            <input type="text" class="otp-input" maxlength="1" />
            <input type="text" class="otp-input" maxlength="1" />
            <input type="text" class="otp-input" maxlength="1" />
            <input type="text" class="otp-input" maxlength="1" />
            <input type="text" class="otp-input" maxlength="1" />
            <input type="text" class="otp-input" maxlength="1" />
            <input type="text" class="otp-input" maxlength="1" />
          </div>

          <label id="lblCat">التصنيف:</label>
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
          <p style="color:var(--muted); text-align:center; font-size:13px;" id="vaultEmpty">الخزنة فارغة ونظيفة.</p>
        </div>
      </div>
    </div>

    <!-- 3. قسم التوجيه والاتصال -->
    <div id="sectionGateway" class="section">
      <div class="card-box">
        <h3 id="gatewayHead">بوابة التوجيه والاتصال الفضائي</h3>
        
        <label id="lblPhone">رقم المستلم (مثال: 96777xxxxxxx):</label>
        <input type="tel" id="targetPhone" placeholder="96777xxxxxxx" style="direction:ltr; text-align:right;" />
        
        <label id="lblMsg">نص التوجيه / الأمر المشفر:</label>
        <input type="text" id="targetMsg" placeholder="اكتب نص الأمر التشغيلي..." />
        
        <button type="button" class="btn-submit" id="btnSendMsg">إرسال عبر البروتوكول الفضائي</button>
        <button type="button" class="btn-submit btn-call" id="btnCallUser">طلب اتصال صوتي مشفر</button>
      </div>
    </div>

    <div class="footer-note">SANAD GLOBAL QUANTUM PROTOCOL v5.6</div>
  </div>

  <script>
    let vault = [];
    let currentLang = 'ar';

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
      const isAr = (l === 'ar');
      document.getElementById('htmlRoot').setAttribute('dir', isAr ? 'rtl' : 'ltr');
      
      document.getElementById('txtTitle').innerText = isAr ? 'برنامج سند' : 'Sanad Platform';
      document.getElementById('txtSub').innerText = isAr ? 'المنصة السيادية الدولية عابرة الحدود' : 'International Sovereign Platform';
      
      document.getElementById('tabGenBtn').innerText = isAr ? 'الأكواد' : 'Codes';
      document.getElementById('tabVaultBtn').innerText = isAr ? 'الخزنة' : 'Vault';
      document.getElementById('tabGatewayBtn').innerText = isAr ? 'التوجيه' : 'Gateway';
      
      document.getElementById('genHead').innerText = isAr ? 'توليد وتأمين كود سيادي (8 خانات)' : 'Generate Sovereign Code (8 Digits)';
      document.getElementById('lblOwner').innerText = isAr ? 'اسم الجهة أو المعرف:' : 'Entity Name/ID:';
      document.getElementById('lblOtp').innerText = isAr ? 'أدخل الكود (8 خانات دقيقة):' : 'Enter Code (8 Digits):';
      document.getElementById('lblCat').innerText = isAr ? 'التصنيف:' : 'Category:';
      document.getElementById('btnSave').innerText = isAr ? 'اعتماد الكود في النظام' : 'Authorize Code';
      
      document.getElementById('vaultHead').innerText = isAr ? 'خزنة الأكواد السيادية' : 'Sovereign Vault';
      document.getElementById('vaultEmpty').innerText = isAr ? 'الخزنة فارغة ونظيفة.' : 'Vault is empty and clean.';
      
      document.getElementById('gatewayHead').innerText = isAr ? 'بوابة التوجيه والاتصال الفضائي' : 'Satellite Gateway & Call';
      document.getElementById('lblPhone').innerText = isAr ? 'رقم المستلم (مثال: 96777xxxxxxx):' : 'Recipient Phone (e.g. 96777xxxxxxx):';
      document.getElementById('lblMsg').innerText = isAr ? 'نص التوجيه / الأمر المشفر:' : 'Encrypted Directive / Message:';
      document.getElementById('btnSendMsg').innerText = isAr ? 'إرسال عبر البروتوكول الفضائي' : 'Send via Space Protocol';
      document.getElementById('btnCallUser').innerText = isAr ? 'طلب اتصال صوتي مشفر' : 'Request Encrypted Audio Call';
    }

    document.getElementById('langAr').addEventListener('click', () => setLang('ar'));
    document.getElementById('langEn').addEventListener('click', () => setLang('en'));

    // OTP auto-advance & keyboard navigation
    const otpInputs = document.querySelectorAll('.otp-input');
    otpInputs.forEach((input, idx) => {
      input.addEventListener('input', (e) => {
        if (e.target.value.length === 1 && idx < otpInputs.length - 1) {
          otpInputs[idx + 1].focus();
        }
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && input.value === '' && idx > 0) {
          otpInputs[idx - 1].focus();
        }
      });
    });

    document.getElementById('codeForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const owner = document.getElementById('ownerName').value;
      const cat = document.getElementById('numCategory').value;
      let num = '';
      otpInputs.forEach(i => num += i.value);

      if (num.length < 8) {
        alert(currentLang === 'ar' ? 'الرجاء إكمال إدخال الـ 8 خانات كاملة.' : 'Please complete all 8 digits.');
        return;
      }

      vault.unshift({ owner, num, cat });
      renderVault();
      otpInputs.forEach(i => i.value = '');
      document.getElementById('ownerName').value = '';
      alert(currentLang === 'ar' ? 'تم الحفظ بنجاح في الخزنة السيادية!' : 'Successfully saved in sovereign vault!');
      switchTab('vault');
    });

    function renderVault() {
      const list = document.getElementById('vaultList');
      if (vault.length === 0) {
        list.innerHTML = '<p style="color:var(--muted); text-align:center; font-size:13px;">' + (currentLang === 'ar' ? 'الخزنة فارغة ونظيفة.' : 'Vault is empty and clean.') + '</p>';
        return;
      }
      list.innerHTML = vault.map(i => '<div class="list-item"><div><strong>' + i.owner + '</strong><br/><span style="font-family:monospace; color:var(--accent);">' + i.num + '</span></div><span class="badge-gold">' + i.cat + '</span></div>').join('');
    }

    document.getElementById('btnSendMsg').addEventListener('click', () => {
      let phone = document.getElementById('targetPhone').value.trim();
      const msg = document.getElementById('targetMsg').value.trim();
      if (!phone || !msg) {
        alert(currentLang === 'ar' ? 'الرجاء إدخال رقم المستلم ونصح التوجيه المشفر.' : 'Please enter recipient phone and message.');
        return;
      }
      phone = phone.replace(/^0+/, '').replace(/^\+/, '');
      const prefix = currentLang === 'ar' ? '[بروتوكول سند الفضائي الذكي - أمر مشفر]: ' : '[Sanad Quantum Protocol]: ';
      window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(prefix + msg), '_blank');
    });

    document.getElementById('btnCallUser').addEventListener('click', () => {
      let phone = document.getElementById('targetPhone').value.trim();
      if (!phone) {
        alert(currentLang === 'ar' ? 'الرجاء إدخال رقم المستلم أولاً.' : 'Please enter recipient phone first.');
        return;
      }
      phone = phone.replace(/^0+/, '').replace(/^\+/, '');
      window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(currentLang === 'ar' ? '[طلب اتصال صوتي عالي التأمين عبر بروتوكول سند]' : '[High-Security Voice Call Request via Sanad]'), '_blank');
    });
  </script>
</body>
</html>`);
});

app.listen(PORT, () => { console.log('Server running on port ' + PORT); });
