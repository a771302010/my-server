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
  <title>برنامج سند - نظام الأرقام المميزة والإدارة</title>
  <style>
    :root {
      --primary: #0f766e;
      --primary-hover: #115e59;
      --bg: #f8fafc;
      --card: #ffffff;
      --text: #0f172a;
      --muted: #475569;
      --border: #cbd5e1;
      --gold: #d97706;
      --silver: #64748b;
    }
    body.theme-navy {
      --primary: #1e3a8a;
      --primary-hover: #172554;
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
      margin-bottom: 20px;
    }
    .logo-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 50px;
      height: 50px;
      background: var(--primary);
      color: #fff;
      font-size: 24px;
      font-weight: bold;
      border-radius: 12px;
      margin-bottom: 8px;
    }
    h1 { margin: 0 0 4px; color: var(--text); font-size: 24px; }
    .subtitle { margin: 0 0 12px; color: var(--muted); font-size: 13px; }
    
    .theme-switch { display: flex; justify-content: center; gap: 8px; margin-bottom: 10px; }
    .btn-mode {
      border: 1px solid var(--border);
      background: #fff;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: bold;
      cursor: pointer;
    }
    
    .nav-tabs {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-bottom: 20px;
    }
    .tab-btn {
      background: #f1f5f9;
      border: 1px solid var(--border);
      padding: 10px;
      border-radius: 10px;
      font-weight: bold;
      font-size: 13px;
      cursor: pointer;
      color: var(--text);
    }
    .tab-btn.active {
      background: var(--primary);
      color: #fff;
      border-color: var(--primary);
    }
    .section { display: none; }
    .section.active { display: block; }

    .card-box {
      background: #f8fafc;
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 16px;
      margin-bottom: 14px;
    }
    .card-box h3 { margin: 0 0 10px; color: var(--text); font-size: 16px; border-right: 4px solid var(--primary); padding-right: 8px; }
    label { display: block; margin-bottom: 6px; font-weight: bold; font-size: 13px; }
    input {
      width: 100%;
      padding: 12px;
      border-radius: 10px;
      border: 1px solid var(--border);
      margin-bottom: 12px;
      font-size: 15px;
    }

    /* نظام الخانات المنفصلة (زي الكود) */
    .otp-container {
      display: flex;
      justify-content: space-between;
      gap: 6px;
      direction: ltr;
      margin-bottom: 14px;
    }
    .otp-input {
      width: 45px;
      height: 52px;
      text-align: center;
      font-size: 22px;
      font-weight: bold;
      border: 2px solid var(--border);
      border-radius: 10px;
      background: #fff;
      color: var(--text);
    }
    .otp-input:focus {
      border-color: var(--primary);
      outline: none;
      box-shadow: 0 0 5px rgba(15,118,110,0.3);
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
    .badge-silver { background: #f1f5f9; color: #475569; border: 1px solid #94a3b8; padding: 3px 8px; border-radius: 15px; font-size: 11px; font-weight: bold; }
    .badge-support { background: #dcfce7; color: #166534; border: 1px solid #22c55e; padding: 3px 8px; border-radius: 15px; font-size: 11px; font-weight: bold; }
    
    .footer-note { text-align: center; font-size: 12px; color: var(--muted); margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="logo-badge">س</div>
      <h1>برنامج سند</h1>
      <p class="subtitle">نظام إدارة الأرقام المميزة (سلسلة 888) وخدمة العملاء</p>
      <div class="theme-switch">
        <button class="btn-mode" onclick="setTheme('green')">الرسمي الأخضر</button>
        <button class="btn-mode" onclick="setTheme('navy')">الرسمي الكحلي</button>
      </div>
    </header>

    <div class="nav-tabs">
      <button class="tab-btn active" onclick="showTab('generator', this)">توليد الأرقام</button>
      <button class="tab-btn" onclick="showTab('vault', this)">خزنة الأرقام</button>
      <button class="tab-btn" onclick="showTab('support', this)">خدمة العملاء</button>
    </div>

    <!-- 1. توليد الأرقام بنظام الخانات المنفصلة -->
    <div id="generator" class="section active">
      <div class="card-box">
        <h3>إصدار وتخصيص رقم سند (9 خانات متسلسلة)</h3>
        <form onsubmit="saveSanadNumber(event)">
          <label>اسم صاحب الرقم أو الجهة:</label>
          <input type="text" id="ownerName" placeholder="مثال: الإدارة المركزية / أبو طارق" required />
          
          <label>الرقم المكون من 9 خانات (مثل البداية بـ 888 أو 800):</label>
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
          <select id="numCategory" style="width:100%; padding:12px; border-radius:10px; border:1px solid var(--border); margin-bottom:12px; background:#fff;">
            <option value="ذهبي (VIP الإدارة)">رقم ذهبي (VIP الإدارة)</option>
            <option value="فضي (رئيسي مخصص)">رقم فضي (رئيسي مخصص)</option>
            <option value="خدمة العملاء (800)">رقم خدمة العملاء (800)</option>
          </select>

          <button type="submit" class="btn-submit">اعتماد وحفظ الرقم في النظام</button>
        </form>
      </div>
    </div>

    <!-- 2. خزنة الأرقام المعتمدة -->
    <div id="vault" class="section">
      <div class="card-box">
        <h3>الأرقام المميزة المسجلة في النظام</h3>
        <div id="numbersVaultList">
          <div class="list-item">
            <div>
              <strong>الإدارة العامة - أبو طارق</strong><br/>
              <span style="font-family:monospace; font-weight:bold; letter-spacing:1px;">888100100</span>
            </div>
            <span class="badge-gold">ذهبي VIP</span>
          </div>
          <div class="list-item">
            <div>
              <strong>خط خدمة العملاء المركزي</strong><br/>
              <span style="font-family:monospace; font-weight:bold; letter-spacing:1px;">800230210</span>
            </div>
            <span class="badge-support">خدمة العملاء</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 3. خدمة العملاء -->
    <div id="support" class="section">
      <div class="card-box">
        <h3>الدعم الفني وخدمة العملاء المخفية</h3>
        <p style="color:var(--muted); font-size:13px; margin:0 0 10px;">الرقم المعتمد لخدمة العملاء (800230210) يعمل في الخلفية لتلقي الاستفسارات وإدارة البلاغات دون ظهوره في قوائم الأعضاء العادية.</p>
        <button class="btn-submit" onclick="alert('حالة الدعم الفني: نشط وجاهز للربط الفوري!')">اختبار استجابة خدمة العملاء</button>
      </div>
    </div>

    <div class="footer-note">
      منصة سند السحابية الرسمية | نظام الأرقام المؤمنة بدون فواصل
    </div>
  </div>

  <script>
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

      const vaultList = document.getElementById('numbersVaultList');
      const badgeClass = category.includes('ذهبي') ? 'badge-gold' : (category.includes('خدمة') ? 'badge-support' : 'badge-silver');

      const div = document.createElement('div');
      div.className = 'list-item';
      div.innerHTML = \`
        <div>
          <strong>\${owner}</strong><br/>
          <span style="font-family:monospace; font-weight:bold; letter-spacing:1px;">\${fullNumber}</span>
        </div>
        <span class="\${badgeClass}">\${category}</span>
      \`;
      vaultList.prepend(div);

      // تفريغ الحقول
      inputs.forEach(input => input.value = '');
      document.getElementById('ownerName').value = '';
      alert('تم حفظ الرقم المميز بنجاح في خزنة النظام!');
    }
  </script>
</body>
</html>
  `);
});

app.listen(PORT, () => {
  console.log('Sanad Vault Server running on port ' + PORT);
});
