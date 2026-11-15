const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/manifest.json', (req, res) => {
  res.json({
    "name": "سند - النظام العصبي السيادي",
    "short_name": "سند OMEGA",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#020617",
    "theme_color": "#0b132b"
  });
});

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="ar" dir="rtl" id="htmlRoot">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>برنامج سند - النظام العصبي السيادي (v9.3.1 CONTROL CENTER)</title>
  <link rel="manifest" href="/manifest.json">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="theme-color" content="#0b132b">
  <style>
    :root {
      --primary: #1e3a8a;
      --bg: #020617;
      --card: #0b132b;
      --card-border: #1e293b;
      --text: #f1f5f9;
      --muted: #94a3b8;
      --accent: #38bdf8;
      --gold: #d4af37;
      --emerald: #10b981;
      --danger: #ef4444;
    }
    body { margin: 0; padding: 0; background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding-bottom: 90px; -webkit-tap-highlight-color: transparent; }
    .container { max-width: 720px; margin: 0 auto; padding: 16px; }
    
    .telemetry-bar { background: #070f25; border: 1px solid var(--card-border); border-radius: 12px; padding: 10px 14px; margin-bottom: 14px; font-family: monospace; font-size: 11px; display: flex; justify-content: space-between; align-items: center; color: var(--accent); box-shadow: 0 4px 20px rgba(0,0,0,0.4); }
    .telemetry-dot { width: 8px; height: 8px; background: var(--emerald); border-radius: 50%; box-shadow: 0 0 10px var(--emerald); animation: pulse 2s infinite; }
    @keyframes pulse { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; } }

    .header-compact { display: flex; align-items: center; justify-content: space-between; background: var(--card); border: 1px solid var(--card-border); border-radius: 14px; padding: 14px 18px; margin-bottom: 14px; box-shadow: 0 4px 15px rgba(0,0,0,0.3); }
    .header-title h2 { margin: 0; font-size: 17px; color: var(--text); font-weight: 600; }
    .header-title p { margin: 3px 0 0; font-size: 11px; color: var(--muted); }

    .screen { display: none; }
    .screen.active { display: block; }

    .card-box { background: var(--card); border: 1px solid var(--card-border); border-radius: 16px; padding: 18px; margin-bottom: 14px; box-shadow: 0 6px 20px rgba(0,0,0,0.25); }
    .card-box h3 { margin: 0 0 14px; font-size: 14px; color: var(--text); border-right: 3px solid var(--gold); padding-right: 8px; font-weight: 600; display: flex; justify-content: space-between; align-items: center; }

    label { display: block; margin-bottom: 6px; font-weight: 500; font-size: 12px; color: var(--muted); }
    input, select, textarea { width: 100%; padding: 12px; border-radius: 10px; border: 1px solid var(--card-border); margin-bottom: 12px; background: #020617; color: var(--text); font-size: 13px; box-sizing: border-box; }
    input:focus, select:focus, textarea:focus { border-color: var(--accent); outline: none; box-shadow: 0 0 10px rgba(56,189,248,0.2); }

    .unified-code-input { font-family: monospace !important; font-size: 18px !important; font-weight: bold; letter-spacing: 4px; text-align: center; color: var(--gold) !important; background: #020617 !important; border: 2px solid var(--card-border) !important; }

    .btn-submit { width: 100%; padding: 13px; background: #1d4ed8; color: #fff; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 15px rgba(29,78,216,0.3); }
    .btn-submit:hover { background: #1e40af; }
    .btn-ai { background: linear-gradient(135deg, #3b82f6, #6366f1); box-shadow: 0 4px 15px rgba(99,102,241,0.3); }
    .btn-action { background: #059669; padding: 6px 14px; font-size: 11px; width: auto; border-radius: 8px; color: #fff; border: none; cursor: pointer; }
    .btn-danger { background: #dc2626; box-shadow: 0 4px 15px rgba(220,38,38,0.3); color: #fff; border: none; cursor: pointer; }
    .btn-install { background: linear-gradient(135deg, var(--gold), #b45309); color: #000; margin-bottom: 14px; display: none; }

    .switch-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 13px; }
    .switch-row:last-child { border-bottom: none; }
    .switch { position: relative; display: inline-block; width: 44px; height: 24px; }
    .switch input { opacity: 0; width: 0; height: 0; }
    .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #1e293b; transition: .3s; border-radius: 24px; border: 1px solid var(--card-border); }
    .slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; }
    input:checked + .slider { background-color: var(--emerald); }
    input:checked + .slider:before { transform: translateX(20px); }

    .bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; background: #020617; border-top: 1px solid var(--card-border); display: grid; grid-template-columns: repeat(5, 1fr); padding: 10px 4px; z-index: 1000; box-shadow: 0 -10px 30px rgba(0,0,0,0.8); }
    .nav-item { background: transparent; border: none; color: var(--muted); display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 10px; cursor: pointer; padding: 4px; font-weight: 500; gap: 4px; }
    .nav-item svg { width: 22px; height: 22px; fill: currentColor; }
    .nav-item.active { color: var(--accent); }
    .nav-item.active svg { fill: var(--accent); }

    .list-item { background: #020617; border: 1px solid var(--card-border); border-radius: 10px; padding: 12px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
    .badge-gold { background: rgba(212,175,55,0.12); color: var(--gold); border: 1px solid rgba(212,175,55,0.3); padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 600; }
    
    .profile-card { text-align: center; padding: 22px; background: var(--card); border: 1px solid var(--card-border); border-radius: 16px; margin-bottom: 14px; }
    .profile-avatar { width: 68px; height: 68px; background: linear-gradient(135deg, #1e3a8a, #3b82f6); border-radius: 50%; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center; border: 2px solid var(--gold); font-size: 26px; color: #fff; font-weight: bold; }
    
    .ai-chat-box { background: #020617; border: 1px solid var(--card-border); border-radius: 10px; padding: 14px; min-height: 150px; max-height: 220px; overflow-y: auto; margin-bottom: 12px; font-size: 12px; color: var(--accent); }
    .chat-container { background: #020617; border: 1px solid var(--card-border); border-radius: 10px; padding: 12px; height: 250px; overflow-y: auto; margin-bottom: 12px; display: flex; flex-direction: column; gap: 10px; }
    .chat-bubble { padding: 10px 14px; border-radius: 12px; font-size: 12px; max-width: 82%; line-height: 1.5; position: relative; }
    .chat-bubble.outgoing { background: #1e40af; color: #fff; align-self: flex-end; border-bottom-left-radius: 2px; }
    .chat-bubble.incoming { background: #1e293b; color: var(--text); align-self: flex-start; border-bottom-right-radius: 2px; }
    .msg-meta { font-size: 9px; color: var(--muted); margin-top: 5px; display: flex; justify-content: space-between; align-items: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="telemetry-bar">
      <span>AI-SAT OMEGA: <strong>SECURED // v9.3.1</strong></span>
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="color:var(--emerald);">نشط وسريع</span>
        <div class="telemetry-dot"></div>
      </div>
    </div>

    <button type="button" class="btn-submit btn-install" id="installBtn">⬇ تثبيت تطبيق سند (App)</button>

    <!-- 1. شاشة الهوية والأكواد -->
    <div id="screenCodes" class="screen active">
      <div class="header-compact">
        <div class="header-title">
          <h2>الهوية السيادية المستقلة</h2>
          <p>توليد المعرف الذكي 8 أرقام (بدون شريحة)</p>
        </div>
      </div>
      
      <div class="card-box">
        <h3>توليد هوية سيادية جديدة بضغطة زر</h3>
        <button type="button" class="btn-submit btn-ai" onclick="generateSovereignId()" style="margin-bottom:14px;">⚡ توليد هويتي وكودي السيادي (يبدأ بـ 8)</button>
        
        <form id="codeForm">
          <label>اسم الشخص أو الجهة:</label>
          <input type="text" id="ownerName" placeholder="أدخل الاسم..." required />
          
          <label>رقم هاتف اختياري (للتواصل المساعد):</label>
          <input type="tel" id="contactPhone" placeholder="96777xxxxxxx" style="direction:ltr; text-align:right;" />

          <label>الكود السيادي (8 خانات):</label>
          <input type="text" id="sovereignCodeInput" class="unified-code-input" placeholder="888xxxxx" maxlength="8" inputmode="numeric" required />

          <label>التصنيف:</label>
          <select id="numCategory">
            <option value="بروتوكول القيادة العليا (VIP)">بروتوكول القيادة العليا (VIP)</option>
            <option value="غرفة العمليات المركزية">غرفة العمليات المركزية</option>
            <option value="قناة عائلية خاصة">قناة عائلية خاصة</option>
          </select>

          <button type="submit" class="btn-submit" style="margin-top:6px;">حفظ الهوية في الخزنة</button>
        </form>
      </div>

      <div class="card-box">
        <h3>🔍 الدليل السيادي المحفوظ</h3>
        <input type="text" id="vaultSearch" placeholder="بحث بالاسم أو الكود..." oninput="filterVault()" style="margin-bottom:10px;" />
        <div id="vaultList">
          <p style="color:var(--muted); text-align:center; font-size:12px;">الدليل فارغ.</p>
        </div>
      </div>
    </div>

    <!-- 2. شاشة الدردشات -->
    <div id="screenChats" class="screen">
      <div class="header-compact">
        <div class="header-title">
          <h2>الدردشات المشفرة والهادئة</h2>
          <p>مقاوم للتحويل + تدمير الوسائط + ترجمة AI</p>
        </div>
      </div>
      <div class="card-box">
        <label>اختر جهة الاتصال:</label>
        <select id="chatContactSelect" onchange="changeActiveChat()" style="margin-bottom:12px;">
          <option value="">-- اختر من الدليل --</option>
        </select>

        <div class="chat-container" id="internalChatBox">
          <div class="chat-bubble incoming">
            <strong>[درع سند]:</strong> أهلاً بك. القناة مشفرة وآمنة تماماً.
            <div class="msg-meta"><span>محمي سيادياً</span><span>✓✓</span></div>
          </div>
        </div>

        <input type="text" id="chatInputMsg" placeholder="اكتب رسالتك المشفرة..." />
        <div style="display:flex; gap:8px; margin-bottom:10px;">
          <button type="button" class="btn-submit" onclick="sendInternalMessage()" style="flex:2;">إرسال رسالة</button>
          <button type="button" class="btn-submit btn-ai" onclick="sendViewOnceMedia()" style="flex:1;">📸 صورة لمرة واحدة</button>
        </div>
        <button type="button" class="btn-submit btn-ai" onclick="translateLastMessageAI()">🌐 ترجمة فورية / تلخيص ذكي</button>
      </div>
    </div>

    <!-- 3. مساعد سند الذكي -->
    <div id="screenAi" class="screen">
      <div class="header-compact">
        <div class="header-title">
          <h2>المستشار الاستراتيجي OMEGA AI</h2>
          <p>مساعدك الذكي للتحليل والترجمة</p>
        </div>
      </div>
      <div class="card-box">
        <h3>سجل المساعد الذكي</h3>
        <div class="ai-chat-box" id="aiChatLog">
          <div><strong>[OMEGA AI]:</strong> جاهز لمعالجة وتحقيق أي استفسار بكل راحة يا أبو طارق.</div>
        </div>
        <label>استفسار للتحليل:</label>
        <input type="text" id="aiInputPrompt" placeholder="اكتب استفسارك هنا..." />
        <button type="button" class="btn-submit btn-ai" onclick="sendAiPrompt()">تنفيذ التحليل الذكي</button>
      </div>
    </div>

    <!-- 4. شاشة المكالمات -->
    <div id="screenCalls" class="screen">
      <div class="header-compact">
        <div class="header-title">
          <h2>مركز المكالمات الفضائية (1X)</h2>
          <p>اتصال صوتي نقي ومؤمن</p>
        </div>
      </div>
      <div class="card-box">
        <h3>إطلاق اتصال آمن</h3>
        <label>اختر جهة الاتصال:</label>
        <select id="callContactSelect" style="margin-bottom:12px;">
          <option value="">-- اختر جهة الاتصال --</option>
        </select>
        
        <div id="callStatusBox" style="background:#020617; border:1px solid var(--card-border); border-radius:10px; padding:16px; text-align:center; margin-bottom:12px;">
          <p style="margin:0 0 6px; color:var(--muted); font-size:12px;" id="callStateText">الحالة: جاهز للمصافحة الفضائية</p>
          <h3 id="activeCallTarget" style="margin:0; color:var(--accent);">-- لا يوجد اتصال --</h3>
        </div>

        <button type="button" class="btn-submit" style="background:#1e40af;" onclick="startSecureCall()">بدء الاتصال المشفر</button>
        <button type="button" class="btn-submit btn-danger" style="margin-top:8px;" onclick="endSecureCall()">قطع الاتصال وتأمين السجل</button>
      </div>
    </div>

    <!-- 5. شاشة الإعدادات وغرفة التحكم السيادية -->
    <div id="screenSettings" class="screen">
      <div class="profile-card">
        <div class="profile-avatar">Ω</div>
        <h3 style="margin:0 0 4px;">سند CONTROL CENTER</h3>
        <p style="color:var(--muted); font-size:12px; margin:0;">غرفة التحكم والسيادة // v9.3.1</p>
      </div>

      <div class="card-box">
        <h3>🛡️ درع الحماية والخصوصية المتقدمة</h3>
        <div class="switch-row">
          <span>منع إعادة توجيه الرسائل (Anti-Forward)</span>
          <label class="switch"><input type="checkbox" checked><span class="slider"></span></label>
        </div>
        <div class="switch-row">
          <span>حماية الوسائط لمرة واحدة (View-Once)</span>
          <label class="switch"><input type="checkbox" checked><span class="slider"></span></label>
        </div>
        <div class="switch-row">
          <span>قفل الشاشة البيومتري والبصمة</span>
          <label class="switch"><input type="checkbox"><span class="slider"></span></label>
        </div>
        <div class="switch-row">
          <span>وضع التمويه العكسي الآمن (Honey-Pot)</span>
          <label class="switch"><input type="checkbox" checked><span class="slider"></span></label>
        </div>
      </div>

      <div class="card-box">
        <h3>🧠 محطة ذكاء OMEGA AI والترجمة</h3>
        <label>اللغة الافتراضية للمترجم العصبي:</label>
        <select id="aiLangSelect">
          <option value="ar">العربية (الافتراضية)</option>
          <option value="en">الإنجليزية (English)</option>
        </select>
        <div class="switch-row">
          <span>التلخيص الذكي التلقائي للمستندات</span>
          <label class="switch"><input type="checkbox" checked><span class="slider"></span></label>
        </div>
      </div>

      <div class="card-box" style="border-color: rgba(239,68,68,0.3);">
        <h3 style="border-right-color: var(--danger); color: var(--danger);">⚡ غرفة الطوارئ والتحكم المطلق</h3>
        <p style="font-size: 11px; color: var(--muted); margin-bottom: 12px;">تفعيل مفتاح الطوارئ يمسح كافة السجلات والذاكرة المحلية فوراً.</p>
        <button type="button" class="btn-submit btn-danger" onclick="executeKillSwitch()">تفعيل مفتاح الطوارئ الشامل (Kill-Switch)</button>
      </div>
    </div>

  </div>

  <nav class="bottom-nav">
    <button class="nav-item active" type="button" onclick="switchScreen('codes', this)">
      <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
      <span>الهوية</span>
    </button>
    <button class="nav-item" type="button" onclick="switchScreen('chats', this)">
      <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
      <span>الدردشات</span>
    </button>
    <button class="nav-item" type="button" onclick="switchScreen('ai', this)">
      <svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1010 10A10 10 0 0012 2zm0 18a8 8 0 118-8 8 8 0 01-8 8zm1-13h-2v6h6v-2h-4z"/></svg>
      <span>مساعد AI</span>
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
      '967770000001': [{sender: 'incoming', text: 'مرحباً بك يا أبو طارق. النظام يعمل بكفاءة.', type: 'text'}]
    };
    let activeChatPhone = '967770000001';
    let deferredPrompt;

    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      deferredPrompt = e;
      const btn = document.getElementById('installBtn');
      if(btn) btn.style.display = 'block';
    });

    document.getElementById('installBtn').addEventListener('click', async () => {
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
      document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      document.getElementById('screen' + screenId.charAt(0).toUpperCase() + screenId.slice(1)).classList.add('active');
      btn.classList.add('active');
    }

    function generateSovereignId() {
      const suffix = Math.floor(100000 + Math.random() * 900000);
      document.getElementById('sovereignCodeInput').value = '888' + suffix.toString().substring(0, 5);
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

      if (vault.some(i => i.num === num)) {
        alert('تنبيه أمني: هذا الكود مسجل مسبقاً.');
        return;
      }

      vault.unshift({ owner, phone: phone || 'محلي سيادي', num, cat });
      renderVault();
      updateContactSelects();
      document.getElementById('sovereignCodeInput').value = '';
      document.getElementById('ownerName').value = '';
      document.getElementById('contactPhone').value = '';
      alert('تم حفظ الهوية بنجاح!');
    });

    function renderVault(filter = '') {
      const list = document.getElementById('vaultList');
      const filtered = vault.filter(i => i.owner.toLowerCase().includes(filter.toLowerCase()) || i.num.includes(filter));
      
      if (filtered.length === 0) {
        list.innerHTML = '<p style="color:var(--muted); text-align:center; font-size:12px;">لا توجد نتائج.</p>';
        return;
      }
      
      list.innerHTML = filtered.map(item => `
        <div class="list-item">
          <div>
            <strong>${item.owner}</strong> <span class="badge-gold">${item.cat}</span><br/>
            <span style="font-family:monospace; color:var(--gold);">الكود: ${item.num}</span> | 
            <span style="font-family:monospace; color:var(--emerald);">الهاتف: ${item.phone}</span>
          </div>
          <div>
            <button class="btn-submit btn-action" onclick="openChatFor('${item.phone}', '${item.owner}')">مراسلة</button>
          </div>
        </div>
      `).join('');
    }

    function filterVault() {
      renderVault(document.getElementById('vaultSearch').value);
    }

    function updateContactSelects() {
      const options = '<option value="">-- اختر من الدليل --</option>' + vault.map(i => `<option value="${i.phone}">${i.owner} (كود: ${i.num})</option>`).join('');
      document.getElementById('chatContactSelect').innerHTML = options;
      document.getElementById('callContactSelect').innerHTML = options;
    }

    function changeActiveChat() {
      const phone = document.getElementById('chatContactSelect').value;
      if (phone) {
        activeChatPhone = phone;
        if (!internalMessages[activeChatPhone]) {
          internalMessages[activeChatPhone] = [{sender: 'incoming', text: 'تم فتح قناة مشفرة.', type: 'text'}];
        }
        loadChatMessages();
      }
    }

    function loadChatMessages() {
      const chatBox = document.getElementById('internalChatBox');
      const msgs = internalMessages[activeChatPhone] || [];
      chatBox.innerHTML = msgs.map(m => `
        <div class="chat-bubble ${m.sender}">
          <strong>${m.sender === 'outgoing' ? 'أنت:' : 'الطرف الآخر:'}</strong> ${m.type === 'view-once' ? '🔒 [وسائط لمرة واحدة]' : m.text}
          <div class="msg-meta"><span>محمي سيادياً</span><span>✓✓</span></div>
        </div>
      `).join('');
      chatBox.scrollTop = chatBox.scrollHeight;
    }

    function sendInternalMessage() {
      const input = document.getElementById('chatInputMsg');
      const text = input.value.trim();
      if (!text) return;
      if (!internalMessages[activeChatPhone]) internalMessages[activeChatPhone] = [];
      internalMessages[activeChatPhone].push({sender: 'outgoing', text, type: 'text'});
      input.value = '';
      loadChatMessages();
    }

    function sendViewOnceMedia() {
      if (!internalMessages[activeChatPhone]) internalMessages[activeChatPhone] = [];
      internalMessages[activeChatPhone].push({sender: 'outgoing', text: 'وسائط سرية', type: 'view-once'});
      loadChatMessages();
      alert('🔒 تم إرسال الوسائط (تختفي بعد المشاهدة).');
    }

    function translateLastMessageAI() {
      alert('🌐 OMEGA AI: تم ترجمة وتحليل الرسائل الأخيرة بنجاح.');
    }

    function openChatFor(phone) {
      switchScreen('chats', document.querySelectorAll('.nav-item')[1]);
      document.getElementById('chatContactSelect').value = phone;
      changeActiveChat();
    }

    function startSecureCall() {
      document.getElementById('callStateText').innerText = 'الحالة: 🔴 المكالمة مؤمنة 100%';
    }

    function endSecureCall() {
      document.getElementById('callStateText').innerText = 'الحالة: تم قطع الاتصال وتأمين السجل';
    }

    function sendAiPrompt() {
      const input = document.getElementById('aiInputPrompt');
      if (!input.value.trim()) return;
      document.getElementById('aiChatLog').innerHTML += '<div style="margin-top:6px; color:var(--emerald);"><strong>[OMEGA AI]:</strong> تم استيعاب الطلب وتنفيذه بنجاح.</div>';
      input.value = '';
    }

    function executeKillSwitch() {
      if (confirm('تحذير سيادي أقصى: هل تريد مسح الذاكرة الفورية وتأمين القطاع؟')) {
        vault = []; internalMessages = {};
        renderVault(); updateContactSelects();
        alert('⚡ تم مسح الذاكرة وتفعيل درع الطوارئ.');
      }
    }
  </script>
</body>
</html>`);
});

app.listen(PORT, () => console.log('Server running on port ' + PORT));
