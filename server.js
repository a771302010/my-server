const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// قاعدة بيانات مؤقتة في الذاكرة لتخزين المستخدمين والمجموعات والأرقام
let users = [];
let groups = [
  { id: 1, name: 'مجموعة العائلة الكريمة', membersCount: 3, desc: 'التواصل العائلي والمتابعة الخاصة' },
  { id: 2, name: 'فريق العمل والإدارة', membersCount: 5, desc: 'تنسيق المهام والعمليات الميدانية' }
];
let registeredNumbers = [
  { id: 101, owner: 'أبو طارق', phone: '777000000', network: 'يمن موبايل', group: 'مجموعة العائلة الكريمة', status: 'مفعل' }
];

// الواجهة الرئيسية والتفاعلية الكاملة لتطبيق سند
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>برنامج سند - منصة الإدارة والخدمات المجتمعية</title>
  <style>
    :root {
      --primary: #0f766e;
      --primary-dark: #115e59;
      --bg: #f0fdf4;
      --card: #ffffff;
      --text: #0f172a;
      --muted: #475569;
      --border: #cbd5e1;
      --badge-bg: #dcfce7;
      --badge-text: #166534;
    }
    body.theme-blue {
      --primary: #1d4ed8;
      --primary-dark: #1e40af;
      --bg: #eff6ff;
      --badge-bg: #dbeafe;
      --badge-text: #1e40af;
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
      max-width: 650px;
      margin: 0 auto;
      background: var(--card);
      border-radius: 20px;
      padding: 24px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.06);
      border: 1px solid var(--border);
    }
    header {
      text-align: center;
      border-bottom: 1px solid var(--border);
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    h1 { margin: 0 0 6px; color: var(--primary); font-size: 28px; }
    .subtitle { margin: 0 0 16px; color: var(--muted); font-size: 14px; }
    .theme-buttons { display: flex; justify-content: center; gap: 10px; }
    .btn-theme {
      border: none;
      padding: 10px 18px;
      border-radius: 10px;
      font-weight: bold;
      cursor: pointer;
      color: #fff;
      font-size: 14px;
    }
    .btn-green { background: #0f766e; }
    .btn-blue { background: #1d4ed8; }
    
    .nav-tabs {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 20px;
    }
    .tab-btn {
      background: #f8fafc;
      border: 1px solid var(--border);
      padding: 10px 6px;
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
    .card-box h3 { margin: 0 0 10px; color: var(--primary); font-size: 18px; }
    label { display: block; margin-bottom: 6px; font-weight: bold; font-size: 14px; }
    input, select {
      width: 100%;
      padding: 12px;
      border-radius: 10px;
      border: 1px solid var(--border);
      margin-bottom: 12px;
      font-size: 15px;
    }
    .btn-submit {
      width: 100%;
      padding: 12px;
      background: var(--primary);
      color: #fff;
      border: none;
      border-radius: 10px;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
    }
    .btn-submit:hover { background: var(--primary-dark); }
    
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
    .badge {
      background: var(--badge-bg);
      color: var(--badge-text);
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
    }
    .status-bar {
      background: var(--badge-bg);
      color: var(--badge-text);
      text-align: center;
      padding: 12px;
      border-radius: 12px;
      font-weight: bold;
      margin-top: 16px;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>برنامج سند</h1>
      <p class="subtitle">منصة الإدارة والخدمات المجتمعية وتفعيل الأرقام</p>
      <div class="theme-buttons">
        <button class="btn-theme btn-green" onclick="setTheme('green')">الهوية الخضراء</button>
        <button class="btn-theme btn-blue" onclick="setTheme('blue')">الهوية الزرقاء</button>
      </div>
    </header>

    <div class="nav-tabs">
      <button class="tab-btn active" onclick="showTab('login', this)">الدخول</button>
      <button class="tab-btn" onclick="showTab('numbers', this)">تفعيل الأرقام</button>
      <button class="tab-btn" onclick="showTab('groups', this)">المجموعات</button>
      <button class="tab-btn" onclick="showTab('services', this)">الخدمات</button>
    </div>

    <!-- قسم تسجيل الدخول -->
    <div id="login" class="section active">
      <div class="card-box">
        <h3>تسجيل الدخول الرسمي للمنصة</h3>
        <form onsubmit="handleLogin(event)">
          <label>الاسم الكامل أو اللقب:</label>
          <input type="text" id="userName" placeholder="مثال: أبو طارق" required />
          <label>رقم الهاتف الأساسي:</label>
          <input type="tel" id="userPhone" placeholder="مثال: 777123456" maxlength="9" required />
          <button type="submit" class="btn-submit">دخول وتفعيل الجلسة</button>
        </form>
      </div>
      <div id="welcomeMsg" class="card-box" style="display:none;">
        <h3 id="welcomeTitle"></h3>
        <p id="welcomeDetails" style="margin:0; color:var(--muted);"></p>
      </div>
    </div>

    <!-- قسم تفعيل الأرقام -->
    <div id="numbers" class="section">
      <div class="card-box">
        <h3>إضافة وتفعيل رقم جديد (عائلة / فريق)</h3>
        <form onsubmit="addNumber(event)">
          <label>اسم صاحب الرقم:</label>
          <input type="text" id="numOwner" placeholder="أدخل الاسم" required />
          <label>رقم الهاتف (9 أرقام):</label>
          <input type="tel" id="numPhone" placeholder="77 / 78 / 73 / 71 / 70" maxlength="9" oninput="detectNetwork()" required />
          <label>الشبكة المكتشفة تلقائياً:</label>
          <input type="text" id="numNetwork" value="في انتظار إدخال الرقم..." readonly style="background:#e2e8f0;" />
          <label>إسناد إلى مجموعة:</label>
          <select id="numGroup">
            <option value="مجموعة العائلة الكريمة">مجموعة العائلة الكريمة</option>
            <option value="فريق العمل والإدارة">فريق العمل والإدارة</option>
          </select>
          <button type="submit" class="btn-submit">حفظ وتفعيل الرقم الآن</button>
        </form>
      </div>

      <div class="card-box">
        <h3>الأرقام المفعلة في النظام (<span id="numCount">1</span>)</h3>
        <div id="numbersList"></div>
      </div>
    </div>

    <!-- قسم المجموعات -->
    <div id="groups" class="section">
      <div class="card-box">
        <h3>إنشاء مجموعة جديدة</h3>
        <form onsubmit="addGroup(event)">
          <label>اسم المجموعة:</label>
          <input type="text" id="groupName" placeholder="مثال: مجموعة الأولاد" required />
          <label>وصف المجموعة:</label>
          <input type="text" id="groupDesc" placeholder="وصف مختصر للمجموعة" required />
          <button type="submit" class="btn-submit">إضافة المجموعة</button>
        </form>
      </div>
      <div class="card-box">
        <h3>المجموعات النشطة</h3>
        <div id="groupsList"></div>
      </div>
    </div>

    <!-- قسم الخدمات والميزات -->
    <div id="services" class="section">
      <div class="card-box">
        <h3>حالة السيرفر والاتصال</h3>
        <p style="margin:0; color:var(--muted);">السيرفر متصل بنجاح ومستعد لمعالجة كافة الطلبات والعمليات اللحظية.</p>
      </div>
      <div class="card-box">
        <h3>المهام والخدمات المجتمعية</h3>
        <p style="margin:0 0 10px; color:var(--muted);">إدارة العمليات، تنسيق اللجان، وتوزيع الإشعارات الفورية للأرقام المسجلة.</p>
        <button class="btn-submit" onclick="alert('تم إرسال إشعار تجريبي لكافة الأرقام المفعلة في المجموعات بنجاح!')">إرسال تعميم تجريبي للمجموعات</button>
      </div>
    </div>

    <div class="status-bar">السيرفر يعمل بنجاح تام وصحيح 🚀</div>
  </div>

  <script>
    let numbersData = [
      { owner: 'أبو طارق', phone: '777000000', network: 'يمن موبايل', group: 'مجموعة العائلة الكريمة' }
    ];
    let groupsData = [
      { name: 'مجموعة العائلة الكريمة', desc: 'التواصل العائلي والمتابعة الخاصة' },
      { name: 'فريق العمل والإدارة', desc: 'تنسيق المهام والعمليات الميدانية' }
    ];

    function setTheme(theme) {
      if (theme === 'blue') {
        document.body.classList.add('theme-blue');
      } else {
        document.body.classList.remove('theme-blue');
      }
    }

    function showTab(tabId, btn) {
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.getElementById(tabId).classList.add('active');
      btn.classList.add('active');
    }

    function detectNetwork() {
      const val = document.getElementById('numPhone').value;
      const netField = document.getElementById('numNetwork');
      if (val.startsWith('77') || val.startsWith('78')) netField.value = 'يمن موبايل (Yemen Mobile)';
      else if (val.startsWith('73')) netField.value = 'يو (YOU)';
      else if (val.startsWith('71')) netField.value = 'سبأفون (Sabafon)';
      else if (val.startsWith('70')) netField.value = 'واي (Y)';
      else if (val.length >= 2) netField.value = 'شبكة غير معروفة';
      else netField.value = 'في انتظار إدخال الرقم...';
    }

    function handleLogin(e) {
      e.preventDefault();
      const name = document.getElementById('userName').value;
      const phone = document.getElementById('userPhone').value;
      document.getElementById('welcomeMsg').style.display = 'block';
      document.getElementById('welcomeTitle').innerText = 'مرحباً بك يا ' + name + ' في منصة سند';
      document.getElementById('welcomeDetails').innerText = 'تم تسجيل دخولك بنجاح بالرقم: ' + phone + ' — يمكنك الآن الانتقال لتبويب (تفعيل الأرقام) أو (المجموعات).';
    }

    function addNumber(e) {
      e.preventDefault();
      const owner = document.getElementById('numOwner').value;
      const phone = document.getElementById('numPhone').value;
      const network = document.getElementById('numNetwork').value;
      const group = document.getElementById('numGroup').value;
      
      numbersData.push({ owner, phone, network, group });
      renderNumbers();
      e.target.reset();
      document.getElementById('numNetwork').value = 'في انتظار إدخال الرقم...';
      alert('تم تفعيل الرقم بنجاح وإضافته إلى القائمة!');
    }

    function renderNumbers() {
      const list = document.getElementById('numbersList');
      document.getElementById('numCount').innerText = numbersData.length;
      list.innerHTML = numbersData.map(item => \`
        <div class="list-item">
          <div>
            <strong>\${item.owner}</strong> — <span dir="ltr">\${item.phone}</span><br/>
            <small style="color:var(--muted);">\${item.network} | \${item.group}</small>
          </div>
          <span class="badge">مفعل ✓</span>
        </div>
      \`).join('');
    }

    function addGroup(e) {
      e.preventDefault();
      const name = document.getElementById('groupName').value;
      const desc = document.getElementById('groupDesc').value;
      groupsData.push({ name, desc });
      
      const select = document.getElementById('numGroup');
      const opt = document.createElement('option');
      opt.value = name;
      opt.innerText = name;
      select.appendChild(opt);
      
      renderGroups();
      e.target.reset();
      alert('تم إنشاء المجموعة بنجاح!');
    }

    function renderGroups() {
      const list = document.getElementById('groupsList');
      list.innerHTML = groupsData.map(g => \`
        <div class="list-item">
          <div>
            <strong>\${g.name}</strong><br/>
            <small style="color:var(--muted);">\${g.desc}</small>
          </div>
          <span class="badge">نشطة</span>
        </div>
      \`).join('');
    }

    renderNumbers();
    renderGroups();
  </script>
</body>
</html>
  `);
});

app.listen(PORT, () => {
  console.log(\`Sanad Server running on port \${PORT}\`);
});
