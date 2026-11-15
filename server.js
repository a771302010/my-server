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
  <title>برنامج سند - المنصة السيادية العالمية (v8.3 SUPREME)</title>
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

    .unified-code-input { font-family: monospace !important; font-size: 18px !important; font-weight: bold; letter-spacing: 4px; text-align: center; color: var(--accent) !important; background: #020617 !important; border: 2px solid var(--border) !important; }
    .unified-code-input:focus { border-color: var(--gold) !important; box-shadow: 0 0 12px rgba(245,158,11,0.4); }

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
    .profile-avatar { width: 64px; height: 64px; background: linear-gradient(135deg, var(--primary), var(--accent)); border-radius: 50%; margin: 0 auto 10px; display: flex; align-items: center; justify-content: center; border: 2px solid var(--gold); font-size: 24px; color: #fff; font-weight: bold; }
    
    .ai-chat-box { background: #020617; border: 1px solid var(--quantum); border-radius: 8px; padding: 12px; min-height: 140px; max-height: 220px; overflow-y: auto; margin-bottom: 10px; font-size: 12px; color: var(--accent); }
    
    .chat-container { background: #020617; border: 1px solid var(--border); border-radius: 8px; padding: 10px; height: 240px; overflow-y: auto; margin-bottom: 10px; display: flex; flex-direction: column; gap: 8px; }
    .chat-bubble { padding: 8px 12px; border-radius: 8px; font-size: 12px; max-width: 80%; line-height: 1.4; }
    .chat-bubble.outgoing { background: var(--primary); color: #fff; align-self: flex-end; border-bottom-left-radius: 0; }
    .chat-bubble.incoming { background: #1e293b; color: var(--text); align-self: flex-start; border-bottom-right-radius: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="telemetry-bar">
      <span>AI-SAT LINK: <strong>SECURED // v8.3 SUPREME</strong></span>
      <div style="display:flex; align-items:center; gap:6px;">
        <span id="txtOnline">SOVEREIGN ACTIVE</span>
        <div class="telemetry-dot"></div>
      </div>
    </div>

    <button type="button" class="btn-submit btn-install" id="installBtn">⬇ تثبيت تطبيق سند على الشاشة الرئيسية (App)</button>

    <!-- 1. شاشة الأكواد ودليل الأسماء السيادية -->
    <div id="screenCodes" class="screen active">
      <div class="header-compact">
        <div class="header-title">
          <h2>الأكواد ودليل الأسماء السيادية</h2>
          <p>إدارة البصمات الرقمية الموحدة وحماية ضد التكرار</p>
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

    <!-- 2. شاشة الدردشات السيادية الداخلية -->
    <div id="screenChats" class="screen">
      <div class="header-compact">
        <div class="header-title">
          <h2>الدردشات المشفرة الداخلية</h2>
          <p>قنوات الاتصال المباشر الآمنة دون وسائط خارجية</p>
        </div>
      </div>
      <div class="card-box">
        <label>اختر جهة الاتصال للبدء:</label>
        <select id="chatContactSelect" onchange="changeActiveChat()" style="margin-bottom:10px;">
          <option value="">-- اختر من الدليل --</option>
        </select>

        <div class="chat-container" id="internalChatBox">
          <div class="chat-bubble incoming"><strong>[النظام السيادي]:</strong> أهلاً بك يا أبو طارق. هذه غرفة الدردشة الداخلية المشفرة الخاصة بـ "سند". اختر جهة اتصال وابدأ المراسلة الفورية المباشرة.</div>
        </div>

        <input type="text" id="chatInputMsg" placeholder="اكتب أمرك أو رسالتك المشفرة هنا..." />
        <button type="button" class="btn-submit" onclick="sendInternalMessage()">إرسال الرسالة السيادية فوراً</button>
      </div>
    </div>

    <!-- 3. شاشة مساعد سند الذكي -->
    <div id="screenAi" class="screen">
      <div class="header-compact">
        <div class="header-title">
          <h2>مساعد سند الذكي (SUPREME AI)</h2>
          <p>العقل العصبي لفحص الشبكة وإدارة الأوامر التشغيلية</p>
        </div>
      </div>
      <div class="card-box">
        <h3>سجل الحوار العصبي الفضائي</h3>
        <div class="ai-chat-box" id="aiChatLog">
          <div><strong>[مساعد سند AI]:</strong> أهلاً بك يا قائدنا العظيم. أنا جاهز لتلقي توجيهاتك الميدانية، فحص الأكواد، أو إدارة قنوات الاتصال السيادية.</div>
        </div>
        <label>أمر تشغيلي / سؤال للمساعد الذكي:</label>
        <input type="text" id="aiInputPrompt" placeholder="اكتب أمرك أو استفسارك هنا..." />
        <button type="button" class="btn-submit btn-ai" onclick="sendAiPrompt()">إرسال للمساعد العصبي الذكي</button>
      </div>
    </div>

    <!-- 4. شاشة المكالمات العصبية -->
    <div id="screenCalls" class="screen">
      <div class="header-compact">
        <div class="header-title">
          <h2>مركز المكالمات العصبية المشفرة</h2>
          <p>إدارة الاتصالات الصوتية والمرئية المؤمنة عبر بروتوكول 1X</p>
        </div>
      </div>
      <div class="card-box">
        <h3>إطلاق اتصال آمن بجهة اتصال</h3>
        <label>اختر جهة الاتصال:</label>
        <select id="callContactSelect" style="margin-bottom:10px;">
          <option value="">-- اختر جهة الاتصال --</option>
        </select>
        
        <div id="callStatusBox" style="background:#020617; border:1px solid var(--border); border-radius:8px; padding:15px; text-align:center; margin-bottom:10px;">
          <p style="margin:0 0 5px; color:var(--muted); font-size:12px;" id="callStateText">الحالة: الخطة جاهزة للاتصال الآمن</p>
          <h3 id="activeCallTarget" style="margin:0; color:var(--accent);">-- لم يتم اتصال --</h3>
        </div>

        <button type="button" class="btn-submit btn-call" onclick="startSecureCall()">بدء الاتصال العصبي المشفر (1X)</button>
        <button type="button" class="btn-submit btn-danger" onclick="endSecureCall()">إنهاء / قطع الاتصال</button>
      </div>
    </div>

    <!-- 5. شاشة الإعدادات السيادية -->
    <div id="screenSettings" class="screen">
      <div class="profile-card">
        <div class="profile-avatar">سند</div>
        <h3 style="margin:0 0 4px;">برنامج سند السيادي</h3>
        <p style="color:var(--accent); font-size:12px; margin:0;">المنصة السيادية عابرة الحدود // v8.3 SUPREME</p>
      </div>
      <div class="card-box">
        <h3>إعدادات الأمان والنظام السيادي</h3>
        <div class="list-item">
          <div><strong>حالة الخزنة والمزامنة</strong><br/><span style="font-size:11px; color:var(--emerald);">نشطة ومؤمنة ضد التكرار</span></div>
          <span class="badge-gold">تأمين تام</span>
        </div>
        <div class="list-item" style="margin-top:8px;">
          <div><strong>بروتوكول الأقمار (AI-SAT)</strong><br/><span style="font-size:11px; color:var(--muted);">يعمل بوضع كفاءة الإشارة الضعيفة</span></div>
          <span class="badge-gold">فعال</span>
        </div>
        <button type="button" class="btn-submit" style="margin-top:12px;" onclick="alert('تم تحديث وتثبيت إعدادات النظام السيادي بنجاح!')">حفظ وتطبيق إعدادات الأمان</button>
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
      <svg viewBox="0 0 24 24"><path d="M6.62 10.
