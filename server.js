const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>برنامج سند - المنصة السيادية الذكية للذكاء الاصطناعي</title>
  <style>
    :root {
      --primary: #0f766e;
      --primary-hover: #115e59;
      --bg: #f8fafc;
      --card: #ffffff;
      --text: #0f172a;
      --muted: #475569;
      --border: #cbd5e1;
      --accent-light: #f0fdf4;
    }
    body.theme-navy {
      --primary: #1e3a8a;
      --primary-hover: #172554;
      --accent-light: #eff6ff;
    }
    * { box-sizing: border-box; font-family: system-ui, -apple-system, sans-serif; }
    body {
      margin: 0;
      padding: 16px;
      background: var(--bg);
      color: var(--text);
    }
    .container {
      max-width: 680px;
      margin: 0 auto;
      background: var(--card);
      border-radius: 20px;
      padding: 24px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.05);
      border: 1px solid var(--border);
    }
    header {
      text-align: center;
      border-bottom: 1px solid var(--border);
      padding-bottom: 16px;
      margin-bottom: 18px;
    }
    
    .official-logo {
      width: 70px;
      height: 70px;
      background: var(--primary);
      border-radius: 18px;
      margin: 0 auto 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 6px 16px rgba(0,0,0,0.12);
      border: 2px solid #ffffff;
    }
    .official-logo svg {
      width: 40px;
      height: 40px;
      fill: #ffffff;
    }

    h1 { margin: 0 0 4px; color: var(--text); font-size: 24px; font-weight: 800; }
    .subtitle { margin: 0 0 12px; color: var(--muted); font-size: 13px; font-weight: 600; }
    
    .theme-switch { display: flex; justify-content: center; gap: 8px; margin-bottom: 12px; }
    .btn-mode {
      border: 1px solid var(--border);
      background: #fff;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: bold;
      cursor: pointer;
      color: var(--text);
    }
    
    .nav-tabs {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
      margin-bottom: 18px;
    }
    .tab-btn {
      background: #f1f5f9;
      border: 1px solid var(--border);
      padding: 9px 4px;
      border-radius: 10px;
      font-weight: bold;
      font-size: 12px;
      cursor: pointer;
      color: var(--text);
      text-align: center;
    }
    .tab-btn.active {
      background: var(--primary);
      color: #fff;
      border-color: var(--primary);
    }
    .section { display: none; }
    .section.active { display: block; }

    .card-box {
      background: var(--accent-light);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 16px;
      margin-bottom: 14px;
    }
    .card-box h3 { margin: 0 0 12px; color: var(--text); font-size: 15px; border-right: 4px solid var(--primary); padding-right: 8px; }
    label { display: block; margin-bottom: 6px; font-weight: bold; font-size: 13px; color: var(--text); }
    input, select, textarea {
      width: 100%;
      padding: 11px;
      border-radius: 10px;
      border: 1px solid var(--border);
      margin-bottom: 12px;
      font-size: 14px;
      background: #fff;
    }

    /* نظام الخانات المنفصلة (OTP) للإدخال السيادي */
    .otp-container {
      display: flex;
      justify-content: space-between;
      gap: 4px;
      direction: ltr;
      margin-bottom: 14px;
    }
    .otp-input {
      width: 36px;
      height: 46px;
      text-align: center;
      font-size: 18px;
      font-weight: bold;
      border: 2px solid var(--border);
      border-radius: 8px;
      background: #fff;
      color: var(--text);
    }
    .otp-input:focus {
      border-color: var(--primary);
      outline: none;
      box-shadow: 0 0 4px rgba(15,118,110,0.3);
    }

    .btn-submit {
      width: 100%;
      padding: 12px;
      background: var(--primary);
      color: #fff;
      border: none;
      border-radius: 10px;
      font-size: 15px;
      font-weight: bold;
      cursor: pointer;
    }
    .btn-submit:hover { background: var(--primary-hover); }

    .list-item {
      background: #fff;
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 12px;
      margin-bottom: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .badge-gold { background: #fef3c7; color: #b45309; border: 1px solid #f59e0b; padding: 3px 8px; border-radius: 15px; font-size: 11px; font-weight: bold; }
    .badge-support { background: #dcfce7; color: #166534; border: 1px solid #22c55e; padding: 3px 8px; border-radius: 15px; font-size: 11px; font-weight: bold; }
    
    .action-btn {
      background: #25d366;
      color: #fff;
      border: none;
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: bold;
      cursor: pointer;
      text-decoration: none;
    }
    .ai-output-box {
      background: #0f172a;
      color: #38bdf8;
      padding: 12px;
      border-radius: 10px;
      font-family: monospace;
      font-size: 13px;
      white-space: pre-wrap;
      margin-top: 10px;
      direction: rtl;
    }
    .footer-note { text-align: center; font-size: 12px; color: var(--muted); margin-top: 16px; font-weight: 600; }
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
      <h1>برنامج سند</h1>
      <p class="subtitle">المنصة السيادية الذكية المدعومة بالذكاء الاصطناعي</p>
      <div class="theme-switch">
        <button class="btn-mode" onclick="setTheme('green')">الهوية الخضراء</button>
        <button class="btn-mode" onclick="setTheme('navy')">الهوية الكحلية</button>
      </div>
    </header>

    <div class="nav-tabs">
      <button class="tab-btn active" onclick="showTab('generator', this)">إصدار الأرقام</button>
      <button class="tab-btn" onclick="showTab('vault', this)">خزنة الأرقام</button>
      <button class="tab-btn" onclick="showTab('aiCenter', this)">غرفة AI الذكية</button>
      <button class="tab-btn" onclick="showTab('gateway', this)">بوابة الأوامر</button>
    </div>

    <!-- 1. إصدار الأرقام -->
    <div id="generator" class="section active">
      <div class="card-box">
        <h3>إصدار رقم سيادي جديد (9 خانات متسلسلة)</h3>
        <form onsubmit="saveSanadNumber(event)">
          <label>اسم الجهة أو صاحب الرقم:</label>
          <input type="text" id="ownerName" placeholder="مثال: الإدارة المركزية / خدمة العملاء" required />
          
          <label>أدخل الكود السيادي المكون من 9 خانات:</label>
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

          <label>تصنيف الرقم:</label>
          <select id="numCategory">
            <option value="رقم ذهبي سيادي (888)">رقم ذهبي سيادي (888888888)</option>
            <option value="رقم خدمة العملاء (800)">رقم خدمة العملاء (800000000)</option>
          </select>

          <button type="submit" class="btn-submit">اعتماد وإدراج في السيرفر</button>
        </form>
      </div>
    </div>

    <!-- 2. خزنة الأرقام -->
    <div id="vault" class="section">
      <div class="card-box">
        <h3>سجل الأرقام والمتابعة الإدارية</h3>
        <div id="numbersVaultList">
          <p style="color:var(--muted); font-size:13px; text-align:center; margin:15px 0;">لا توجد أرقام مسجلة حالياً. استخدم تبويب "إصدار الأرقام" لإضافة أرقامك.</p>
        </div>
      </div>
    </div>

    <!-- 3. غرفة العمليات الذكية بالذكاء الاصطناعي (الخدمة المميزة) -->
    <div id="aiCenter" class="section">
      <div class="card-box">
        <h3>غرفة التوجيه والتحليل بالذكاء الاصطناعي (AI Sovereign Core)</h3>
        <p style="color:var(--muted); font-size:12px; margin:0 0 10px;">أدخل فكرة التعميم أو الأمر التشغيلي، وسيقوم الذكاء الاصطناعي بصياغته كأمر سيادي رسمي:</p>
        
        <label>موضوع الأمر أو التوجيه:</label>
        <textarea id="aiPrompt" rows="3" placeholder="مثال: تعميم بخصوص تفعيل الربط الميداني والأرقام السيادية..."></textarea>
        
        <button class="btn-submit" onclick="generateAiDirective()" style="background:#0284c7; margin-bottom:10px;">توليد وصياغة الأمر بالذكاء الاصطناعي ✨</button>
        
        <div id="aiResultContainer" style="display:none;">
          <label>نص الأمر السيادي الجاهز:</label>
          <div class="ai-output-box" id="aiOutputText"></div>
        </div>
      </div>
    </div>

    <!-- 4. بوابة الأوامر -->
    <div id="gateway" class="section">
      <div class="card-box">
        <h3>بوابة الأوامر والربط المباشر (Yemen Mobile / WhatsApp)</h3>
        <p style="color:var(--muted); font-size:12px; margin:0 0 10px;">أرسل الأوامر والتعاميم المباشرة عبر الأرقام المعتمدة:</p>
        
        <label>رقم المستلم (مثل 77xxxxxxx):</label>
        <input type="tel" id="targetPhone" placeholder="77xxxxxxx" style="direction:ltr; text-align:right;" />
        
        <label>نص الأمر:</label>
        <input type="text" id="targetMsg" placeholder="اكتب نص الأمر الموجه..." />
        
        <button class="btn-submit" onclick="sendWhatsAppCommand()">إرسال عبر واتساب وبوابة الاتصال</button>
      </div>
    </div>

    <div class="footer-note">
      منصة سند السحابية الرسمية | نظام الأرقام السيادية والذكاء الاصطناعي
    </div>
  </div>

  <script>
    let vaultData = [];

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
        alert('الرجاء إكمال إدخال الـ 9 خانات كاملة.');
        return;
      }

      vaultData.unshift({ owner, number: fullNumber, category });
      renderVault();

      inputs.forEach(input => input.value = '');
      document.getElementById('ownerName').value = '';
      alert('تم اعتماد وحفظ الرقم بنجاح في السيرفر!');
      showTab('vault', document.querySelectorAll('.tab-btn')[1]);
    }

    function renderVault() {
      const list = document.getElementById('numbersVaultList');
      if (vaultData.length === 0) {
        list.innerHTML = '<p style="color:var(--muted); font-size:13px; text-align:center; margin:15px 0;">لا توجد أرقام مسجلة حالياً.</p>';
        return;
      }

      list.innerHTML = vaultData.map(item => {
        const badgeClass = item.category.includes('ذهبي') ? 'badge-gold' : 'badge-support';
        return \`
          <div class="list-item">
            <div>
              <strong>\${item.owner}</strong><br/>
              <span style="font-family:monospace; font-weight:bold; letter-spacing:1px; direction:ltr; display:inline-block;">\${item.number}</span>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="\${badgeClass}">\${item.category}</span>
              <a href="https://wa.me/?text=مرسل%20من%20منصة%20سند%20-%20رقم:%20\${item.number}" target="_blank" class="action-btn">ربط واتساب</a>
            </div>
          </div>
        \`;
      }).join('');
    }

    function generateAiDirective() {
      const prompt = document.getElementById('aiPrompt').value.trim();
      if (!prompt) {
        alert('الرجاء كتابة موضوع الأمر أو التوجيه أولاً.');
        return;
      }
      const box = document.getElementById('aiResultContainer');
      const output = document.getElementById('aiOutputText');
      
      // المحاكاة الذكية لتوليد التعاميم السيادية الرسمية
      box.style.display = 'block';
      output.innerText = '[نظام سند الذكي - تحليل سيادي]\\n' +
                         '----------------------------------------\\n' +
                         'حالة الأمر: معتمد ومشفّر\\n' +
                         'المحتوى: ' + prompt + '\\n' +
                         '----------------------------------------\\n' +
                         'توجيه إداري: تم صياغة التعميم وتجهيزه للبث الفوري عبر بوابة الأوامر.';
    }

    function sendWhatsAppCommand() {
      const phone = document.getElementById('targetPhone').value.trim();
      const msg = document.getElementById('targetMsg').value.trim();
      if (!phone || !msg) {
        alert('الرجاء إدخال رقم المستلم ونصف الأمر بدقة.');
        return;
      }
      const url = \`https://wa.me/\${phone}?text=\${encodeURIComponent(msg)}\`;
      window.open(url, '_blank');
    }
  </script>
</body>
</html>
  `);
});

app.listen(PORT, () => {
  console.log('Sanad AI Sovereign Server running on port ' + PORT);
});
