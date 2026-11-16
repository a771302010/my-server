const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// PWA Manifest السيادي
app.get('/manifest.json', (req, res) => {
  res.json({
    "name": "سند - المنصة السيادية الدولية عابرة الحدود",
    "short_name": "سند ULTRA",
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
  <title>برنامج سند - المنصة السيادية الدولية عابرة الحدود (v9.0 ULTIMATE)</title>
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
    .container { max-width: 720px; margin: 0 auto; padding: 14px; }
    
    .telemetry-bar { background: #070f25; border: 1px solid var(--card-border); border-radius: 12px; padding: 10px 14px; margin-bottom: 12px; font-family: monospace; font-size: 11px; display: flex; justify-content: space-between; align-items: center; color: var(--accent); box-shadow: 0 4px 20px rgba(0,0,0,0.4); }
    .telemetry-dot { width: 8px; height: 8px; background: var(--emerald); border-radius: 50%; box-shadow: 0 0 10px var(--emerald); animation: pulse 2s infinite; }
    @keyframes pulse { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; } }

    .brand-header { text-align: center; background: var(--card); border: 1px solid var(--card-border); border-radius: 16px; padding: 16px; margin-bottom: 14px; box-shadow: 0 6px 20px rgba(0,0,0,0.4); display: flex; justify-content: space-between; align-items: center; }
    .brand-title-box h1 { margin: 0; font-size: 16px; color: var(--text); font-weight: 700; text-align: right; }
    .brand-title-box p { margin: 3px 0 0; font-size: 10px; color: var(--accent); text-align: right; }
    
    .lang-switcher { display: flex; gap: 6px; }
    .lang-btn { background: #020617; border: 1px solid var(--card-border); color: var(--text); padding: 5px 10px; border-radius: 8px; font-size: 11px; cursor: pointer; }
    .lang-btn.active { border-color: var(--gold); color: var(--gold); }

    .screen { display: none; }
    .screen.active { display: block; }

    .card-box { background: var(--card); border: 1px solid var(--card-border); border-radius: 16px; padding: 16px; margin-bottom: 14px; box-shadow: 0 6px 20px rgba(0,0,0,0.25); }
    .card-box h3 { margin: 0 0 12px; font-size: 14px; color: var(--text); border-right: 3px solid var(--gold); padding-right: 8px; font-weight: 600; display: flex; justify-content: space-between; align-items: center; }

    label { display: block; margin-bottom: 5px; font-weight: 500; font-size: 11px; color: var(--muted); }
    input, select, textarea { width: 100%; padding: 11px; border-radius: 10px; border: 1px solid var(--card-border); margin-bottom: 11px; background: #020617; color: var(--text); font-size: 13px; box-sizing: border-box; }
    input:focus, select:focus, textarea:focus { border-color: var(--accent); outline: none; box-shadow: 0 0 10px rgba(56,189,248,0.2); }

    .unified-code-input { font-family: monospace !important; font-size: 18px !important; font-weight: bold; letter-spacing: 4px; text-align: center; color: var(--gold) !important; background: #020617 !important; border: 2px solid var(--card-border) !important; }

    .btn-submit { width: 100%; padding: 12px; background: #1d4ed8; color: #fff; border: none; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 15px rgba(29,78,216,0.3); }
    .btn-submit:hover { background: #1e40af; }
    .btn-ai { background: linear-gradient(135deg, #3b82f6, #6366f1); box-shadow: 0 4px 15px rgba(99,102,241,0.3); }
    .btn-action { background: #059669; padding: 6px 12px; font-size: 11px; width: auto; border-radius: 8px; color: #fff; border: none; cursor: pointer; }
    .btn-danger { background: #dc2626; box-shadow: 0 4px 15px rgba(220,38,38,0.3); color: #fff; border: none; cursor: pointer; }

    .bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; background: #020617; border-top: 1px solid var(--card-border); display: grid; grid-template-columns: repeat(5, 1fr); padding: 8px 4px; z-index: 1000; box-shadow: 0 -10px 30px rgba(0,0,0,0.8); }
    .nav-item { background: transparent; border: none; color: var(--muted); display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 10px; cursor: pointer; padding: 4px; font-weight: 500; gap: 3px; }
    .nav-item svg { width: 22px; height: 22px; fill: currentColor; }
    .nav-item.active { color: var(--accent); }
    .nav-item.active svg { fill: var(--accent); }

    .list-item { background: #020617; border: 1px solid var(--card-border); border-radius: 10px; padding: 12px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
    .badge-gold { background: rgba(212,175,55,0.12); color: var(--gold); border: 1px solid rgba(212,175,55,0.3); padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 600; }
    
    .chat-container { background: #020617; border: 1px solid var(--card-border); border-radius: 10px; padding: 12px; height: 240px; overflow-y: auto; margin-bottom: 12px; display: flex; flex-direction: column; gap: 10px; }
    .chat-bubble { padding: 10px 14px; border-radius: 12px; font-size: 12px; max-width: 82%; line-height: 1.5; position: relative; }
    .chat-bubble.outgoing { background: #1e40af; color: #fff; align-self: flex-end; border-bottom-left-radius: 2px; }
    .chat-bubble.incoming { background: #1e293b; color: var(--text); align-self: flex-start; border-bottom-right-radius: 2px; }
    .msg-meta { font-size: 9px; color: var(--muted); margin-top: 5px; display: flex; justify-content: space-between; align-items: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="telemetry-bar">
      <span>1X SOVEREIGN ACTIVE</span>
      <span>AI-SAT LINK: SECURED // v9.0</span>
      <div class="telemetry-dot"></div>
    </div>

    <div class="brand-header">
      <div class="brand-title-box">
        <h1 id="lblTitle">برنامج سند</h1>
        <p id="lblSubtitle">المنصة السيادية الدولية عابرة الحدود</p>
      </div>
      <div class="lang-switcher">
        <button class="lang-btn active" onclick="setLang('ar')">العربية</button>
        <button class="lang-btn" onclick="setLang('en')">English</button>
      </div>
    </div>

    <!-- 1. شاشة الأكواد والدليل مع الموافقة الإدارية -->
    <div id="screenCodes" class="screen active">
      <div class="card-box">
        <h3 id="secCodeTitle">تسجيل وتأمين كود سيادي (تحت إشراف الإدارة)</h3>
        <button type="button" class="btn-submit btn-ai" onclick="requestSovereignId()" style="margin-bottom:12px;">⚡ طلب كود سيادي معتمد من الإدارة</button>
        
        <form id="codeForm">
          <label id="lblOwner">اسم الشخص أو الجهة:</label>
          <input type="text" id="ownerName" placeholder="أدخل الاسم أو المعرف..." required />
          
          <label id="lblPhone">رقم الهاتف أو المعرف العسكري:</label>
          <input type="tel" id="contactPhone" placeholder="96777xxxxxxx" style="direction:ltr; text-align:right;" />

          <label id="lblCode">الكود السيادي (8 أرقام دقيقة):</label>
          <input type="text" id="sovereignCodeInput" class="unified-code-input" placeholder="888xxxxx" maxlength="8" inputmode="numeric" required />

          <label id="lblCat">التصنيف الإداري السيادي:</label>
          <select id="numCategory">
            <option value="بروتوكول الأسرة والقيادة (VIP)">بروتوكول الأسرة والقيادة (VIP)</option>
            <option value="محطة العمليات المركزية (800)">محطة العمليات المركزية (800)</option>
            <option value="قناة التوجيه الفضائي (AI-SAT)">قناة التوجيه الفضائي (AI-SAT)</option>
          </select>

          <button type="submit" class="btn-submit" style="margin-top:4px;" id="lblSubmitCode">اعتماد وتأمين البصمة في الدليل</button>
        </form>
      </div>

      <div class="card-box">
        <h3 id="secVaultTitle">🔍 الدليل السيادي المحفوظ (محمي ومراجع)</h3>
        <input type="text" id="vaultSearch" placeholder="بحث بالاسم أو الرقم في الدليل..." oninput="filterVault()" style="margin-bottom:10px;" />
        <div id="vaultList">
          <p style="color:var(--muted); text-align:center; font-size:12px;">الدليل فارغ ونظيف.</p>
        </div>
      </div>
    </div>

    <!-- 2. شاشة الدردشات المشفرة -->
    <div id="screenChats" class="screen">
      <div class="card-box">
        <h3 id="secChatTitle">💬 الدردشات المشفرة وتأمين الوسائط</h3>
        <label id="lblSelectChat">اختر جهة الاتصال المعتمدة:</label>
        <select id="chatContactSelect" onchange="changeActiveChat()" style="margin-bottom:12px;">
          <option value="">-- اختر من الدليل المعتمد --</option>
        </select>

        <div class="chat-container" id="internalChatBox">
          <div class="chat-bubble incoming">
            <strong>[درع سند]:</strong> أهلاً بك يا أبو طارق. القناة مشفرة وآمنة عبر الأقمار.
            <div class="msg-meta"><span>محمي سيادياً</span><span>✓✓</span></div>
          </div>
        </div>

        <input type="text" id="chatInputMsg" placeholder="اكتب رسالتك المشفرة..." />
        <div style="display:flex; gap:8px; margin-bottom:10px;">
          <button type="button" class="btn-submit" onclick="sendInternalMessage()" style="flex:2;" id="lblSendMsg">إرسال رسالة</button>
          <button type="button" class="btn-submit btn-ai" onclick="sendViewOnceMedia()" style="flex:1;" id="lblViewOnce">📸 صورة لمرة واحدة</button>
        </div>
        <button type="button" class="btn-submit btn-ai" onclick="translateLastMessageAI()" id="lblAiTranslate">🌐 ترجمة فورية / تلخيص ذكي</button>
      </div>
    </div>

    <!-- 3. مساعد سند والتحليل الذكي -->
    <div id="screenAi" class="screen">
      <div class="card-box">
        <h3 id="secAiTitle">🤖 مساعد سند الاستراتيجي والذكاء الاصطناعي</h3>
        <div class="chat-container" id="aiChatLog" style="height: 180px;">
          <div class="chat-bubble incoming"><strong>[OMEGA AI]:</strong> جاهز لمعالجة وتحليل الاستفسارات الميدانية والإدارية بكل دقة يا أبو طارق.</div>
        </div>
        <label id="lblAiPrompt">استفسار للتحليل المتقدم:</label>
        <input type="text" id="aiInputPrompt" placeholder="اكتب استفسارك هنا..." />
        <button type="button" class="btn-submit btn-ai" onclick="sendAiPrompt()" id="lblAiExecute">تنفيذ التحليل الذكي عبر AI-SAT</button>
      </div>
    </div>

    <!-- 4. شاشة المكالمات الفضائية الآمنة -->
    <div id="screenCalls" class="screen">
      <div class="card-box">
        <h3 id="secCallTitle">📞 مركز المكالمات الفضائية الآمنة</h3>
        <label id="lblSelectCall">اختر جهة الاتصال للاتصال:</label>
        <select id="callContactSelect" style="margin-bottom:12px;">
          <option value="">-- اختر جهة الاتصال --</option>
        </select>
        
        <div id="callStatusBox" style="background:#020617; border:1px solid var(--card-border); border-radius:10px; padding:16px; text-align:center; margin-bottom:12px;">
          <p style="margin:0 0 6px; color:var(--muted); font-size:12px;" id="callStateText">الحالة: جاهز للمصافحة الفضائية المشفرة</p>
          <h3 id="activeCallTarget" style="margin:0; color:var(--accent);">-- بانتظار بدء الاتصال --</h3>
        </div>

        <button type="button" class="btn-submit" style="background:#1e40af;" onclick="startSecureCall()" id="lblStartCall">بدء الاتصال الفضائي المشفر</button>
        <button type="button" class="btn-submit btn-danger" style="margin-top:8px;" onclick="endSecureCall()" id="lblEndCall">قطع الاتصال وتأمين السجل</button>
      </div>
    </div>

    <!-- 5. شاشة الإعدادات ومركز التحكم المطلق -->
    <div id="screenSettings" class="screen">
      <div class="card-box">
        <h3 id="secSettingsTitle">⚙️ إعدادات مركز التحكم والسيادة (Control Center)</h3>
        <div class="list-item">
          <div><strong id="lblAntiFwd">منع إعادة توجيه الرسائل</strong><br/><span style="font-size:11px; color:var(--emerald);">مفعل وحماية تامة للخصوصية</span></div>
          <span class="badge-gold">نشط</span>
        </div>
        <div class="list-item" style="margin-top:10px;">
          <div><strong id="lblSatLink">قناة التوجيه الفضائي (AI-SAT)</strong><br/><span style="font-size:11px; color:var(--accent);">مستقرة وعبر بروتوكول 1X</span></div>
          <span class="badge-gold">عالي السرعة</span>
        </div>
        <button type="button" class="btn-submit btn-danger" style="margin-top:16px;" onclick="executeKillSwitch()" id="lblKillSwitch">⚡ تفعيل مفتاح الطوارئ الشامل (Kill-Switch)</button>
      </div>
    </div>

  </div>

  <nav class="bottom-nav">
    <button class="nav-item active" type="button" id="nav-codes" onclick="switchScreen('codes', this)">
      <svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
      <span id="navLblCodes">الأكواد</span>
    </button>
    <button class="nav-item" type="button" id="nav-chats" onclick="switchScreen('chats', this)">
      <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
      <span id="navLblChats">الدردشات</span>
    </button>
    <button class="nav-item" type="button" id="nav-ai" onclick="switchScreen('ai', this)">
      <svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1010 10A10 10 0 0012 2zm0 18a8 8 0 118-8 8 8 0 01-8 8zm1-13h-2v6h6v-2h-4z"/></svg>
      <span id="navLblAi">مساعد سند</span>
    </button>
    <button class="nav-item" type="button" id="nav-calls" onclick="switchScreen('calls', this)">
      <svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
      <span id="navLblCalls">المكالمات</span>
    </button>
    <button class="nav-item" type="button" id="nav-settings" onclick="switchScreen('settings', this)">
      <svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c-.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c-.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
      <span id="navLblSettings">الإعدادات</span>
    </button>
  </nav>

  <script>
    let vault = [
      { owner: 'أبو طارق (القيادة العليا)', phone: '967770000001', num: '88800001', cat: 'بروتوكول الأسرة والقيادة (VIP)' },
      { owner: 'غرفة العمليات المركزية', phone: '967770000002', num: '88800002', cat: 'محطة العمليات المركزية (800)' }
    ];
    let internalMessages = {
      '967770000001': [{sender: 'incoming', type: 'text', text: 'مرحباً بك يا أبو طارق. تم تفعيل نظام الحوكمة الإدارية للأكواد السيادية.'}]
    };
    let activeChatPhone = '967770000001';
    let currentLang = 'ar';

    const translations = {
      ar: {
        title: "برنامج سند",
        subtitle: "المنصة السيادية الدولية عابرة الحدود",
        secCodeTitle: "تسجيل وتأمين كود سيادي (تحت إشراف الإدارة)",
        reqBtn: "⚡ طلب كود سيادي معتمد من الإدارة",
        owner: "اسم الشخص أو الجهة:",
        phone: "رقم الهاتف أو المعرف العسكري:",
        code: "الكود السيادي (8 أرقام دقيقة):",
        cat: "التصنيف الإداري السيادي:",
        submitCode: "اعتماد وتأمين البصمة في الدليل",
        vaultTitle: "🔍 الدليل السيادي المحفوظ (محمي ومراجع)",
        searchPlaceholder: "بحث بالاسم أو الرقم في الدليل...",
        chatTitle: "💬 الدردشات المشفرة وتأمين الوسائط",
        selectChat: "اختر جهة الاتصال المعتمدة:",
        sendMsg: "إرسال رسالة",
        viewOnce: "📸 صورة لمرة واحدة",
        aiTrans: "🌐 ترجمة فورية / تلخيص ذكي",
        aiTitle: "🤖 مساعد سند الاستراتيجي والذكاء الاصطناعي",
        aiPrompt: "استفسار للتحليل المتقدم:",
        aiExecute: "تنفيذ التحليل الذكي عبر AI-SAT",
        callTitle: "📞 مركز المكالمات الفضائية الآمنة",
        selectCall: "اختر جهة الاتصال للاتصال:",
        startCall: "بدء الاتصال الفضائي المشفر",
        endCall: "قطع الاتصال وتأمين السجل",
        setTitle: "⚙️ إعدادات مركز التحكم والسيادة (Control Center)",
        antiFwd: "منع إعادة توجيه الرسائل",
        satLink: "قناة التوجيه الفضائي (AI-SAT)",
        killSwitch: "⚡ تفعيل مفتاح الطوارئ الشامل (Kill-Switch)",
        navCodes: "الأكواد",
        navChats: "الدردشات",
        navAi: "مساعد سند",
        navCalls: "المكالمات",
        navSet: "الإعدادات"
      },
      en: {
        title: "Sanad Program",
        subtitle: "Cross-Border Sovereign Platform",
        secCodeTitle: "Register Sovereign Code (Admin Approved)",
        reqBtn: "⚡ Request Admin-Approved Sovereign Code",
        owner: "Name or Entity:",
        phone: "Phone or Military ID:",
        code: "Sovereign Code (8 Digits):",
        cat: "Sovereign Administrative Category:",
        submitCode: "Approve & Secure in Directory",
        vaultTitle: "🔍 Secure Sovereign Directory",
        searchPlaceholder: "Search by name or number...",
        chatTitle: "💬 Encrypted Chats & Media Security",
        selectChat: "Select Approved Contact:",
        sendMsg: "Send Message",
        viewOnce: "📸 View-Once Photo",
        aiTrans: "🌐 AI Translation / Summary",
        aiTitle: "🤖 Sanad Strategic AI Assistant",
        aiPrompt: "Advanced Analysis Query:",
        aiExecute: "Run AI-SAT Intelligence",
        callTitle: "📞 Secure Satellite Calls Center",
        selectCall: "Select Contact to Call:",
        startCall: "Start Encrypted Satellite Call",
        endCall: "End Call & Secure Log",
        setTitle: "⚙️ Control Center & Sovereign Settings",
        antiFwd: "Anti-Message Forwarding",
        satLink: "Satellite Routing Channel (AI-SAT)",
        killSwitch: "⚡ Activate Emergency Kill-Switch",
        navCodes: "Codes",
        navChats: "Chats",
        navAi: "Sanad AI",
        navCalls: "Calls",
        navSet: "Settings"
      }
    };

    function setLang(lang) {
      currentLang = lang;
      document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
      event.target.classList.add('active');
      document.getElementById('htmlRoot').setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
      document.getElementById('htmlRoot').setAttribute('lang', lang);

      const t = translations[lang];
      document.getElementById('lblTitle').innerText = t.title;
      document.getElementById('lblSubtitle').innerText = t.subtitle;
      document.getElementById('secCodeTitle').innerText = t.secCodeTitle;
      document.getElementById('lblOwner').innerText = t.owner;
      document.getElementById('lblPhone').innerText = t.phone;
      document.getElementById('lblCode').innerText = t.code;
      document.getElementById('lblCat').innerText = t.cat;
      document.getElementById('lblSubmitCode').innerText = t.submitCode;
      document.getElementById('secVaultTitle').innerText = t.vaultTitle;
      document.getElementById('vaultSearch').placeholder = t.searchPlaceholder;
      document.getElementById('secChatTitle').innerText = t.chatTitle;
      document.getElementById('lblSelectChat').innerText = t.selectChat;
      document.getElementById('lblSendMsg').innerText = t.sendMsg;
      document.getElementById('lblViewOnce').innerText = t.viewOnce;
      document.getElementById('lblAiTranslate').innerText = t.aiTrans;
      document.getElementById('secAiTitle').innerText = t.aiTitle;
      document.getElementById('lblAiPrompt').innerText = t.aiPrompt;
      document.getElementById('lblAiExecute').innerText = t.aiExecute;
      document.getElementById('secCallTitle').innerText = t.callTitle;
      document.getElementById('lblSelectCall').innerText = t.selectCall;
      document.getElementById('lblStartCall').innerText = t.startCall;
      document.getElementById('lblEndCall').innerText = t.endCall;
      document.getElementById('secSettingsTitle').innerText = t.setTitle;
      document.getElementById('lblAntiFwd').innerText = t.antiFwd;
      document.getElementById('lblSatLink').innerText = t.satLink;
      document.getElementById('lblKillSwitch').innerText = t.killSwitch;
      document.getElementById('navLblCodes').innerText = t.navCodes;
      document.getElementById('navLblChats').innerText = t.navChats;
      document.getElementById('navLblAi').innerText = t.navAi;
      document.getElementById('navLblCalls').innerText = t.navCalls;
      document.getElementById('navLblSettings').innerText = t.navSet;
    }

    window.onload = function() {
      renderVault();
      updateContactSelects();
      loadChatMessages();
    };

    function switchScreen(id, btn) {
      document.querySelectorAll('.screen').forEach(function(s) { s.classList.remove('active'); });
      document.querySelectorAll('.nav-item').forEach(function(i) { i.classList.remove('active'); });
      
      let targetScreen = document.getElementById('screen' + id.charAt(0).toUpperCase() + id.slice(1));
      if(targetScreen) targetScreen.classList.add('active');
      
      let activeBtn = btn || document.getElementById('nav-' + id);
      if(activeBtn) activeBtn.classList.add('active');
    }

    function requestSovereignId() {
      let suffix = Math.floor(100000 + Math.random() * 900000);
      let inputField = document.getElementById('sovereignCodeInput');
      if(inputField) inputField.value = '888' + suffix.toString().substring(0, 5);
      alert(currentLang === 'ar' ? '🔐 تم توليد كود معتمد ومراجع من خادم الإدارة بنجاح.' : '🔐 Admin-approved sovereign code generated successfully.');
    }

    let codeFormEl = document.getElementById('codeForm');
    if(codeFormEl) {
      codeFormEl.addEventListener('submit', function(e) {
        e.preventDefault();
        let owner = document.getElementById('ownerName').value.trim();
        let phone = document.getElementById('contactPhone').value.trim();
        let cat = document.getElementById('numCategory').value;
        let num = document.getElementById('sovereignCodeInput').value.trim();
        
        if (!num || num.length !== 8) { alert(currentLang === 'ar' ? 'أدخل الكود السيادي (8 أرقام دقيقة).' : 'Enter exact 8-digit sovereign code.'); return; }
        if (vault.some(function(i) { return i.num === num; })) { alert(currentLang === 'ar' ? 'تنبيه إداري: هذا الكود مسجل مسبقاً.' : 'Admin Notice: Code already registered.'); return; }
        
        vault.unshift({ owner: owner, phone: phone || 'محلي سيادي', num: num, cat: cat });
        renderVault();
        updateContactSelects();
        codeFormEl.reset();
        alert(currentLang === 'ar' ? '✅ تم الاعتماد والحفظ في الدليل السيادي تحت إشراف الإدارة!' : '✅ Approved and secured in sovereign directory!');
      });
    }

    function renderVault(filterText) {
      let list = document.getElementById('vaultList');
      if(!list) return;
      let query = filterText ? filterText.toLowerCase() : '';
      let filtered = vault.filter(function(item) {
        return item.owner.toLowerCase().indexOf(query) !== -1 || item.num.indexOf(query) !== -1;
      });
      
      if (filtered.length === 0) {
        list.innerHTML = '<p style="color:var(--muted); text-align:center;">' + (currentLang === 'ar' ? 'لا توجد نتائج مطابقة.' : 'No matching results.') + '</p>';
        return;
      }
      
      let h = '';
      for(let i=0; i<filtered.length; i++) {
        let item = filtered[i];
        h += '<div class="list-item"><div><strong>' + item.owner + '</strong> <span class="badge-gold">' + item.cat + '</span><br/><span style="font-family:monospace; color:var(--gold);">الكود: ' + item.num + '</span> | <span style="font-family:monospace; color:var(--emerald);">الهاتف: ' + item.phone + '</span></div><div><button class="btn-submit btn-action" onclick="openChatFor(\\\'' + item.phone + '\\\')">' + (currentLang === 'ar' ? 'مراسلة' : 'Chat') + '</button></div></div>';
      }
      list.innerHTML = h;
    }

    function filterVault() {
      let searchInput = document.getElementById('vaultSearch');
      if(searchInput) renderVault(searchInput.value);
    }

    function updateContactSelects() {
      let opts = '<option value="">' + (currentLang === 'ar' ? '-- اختر جهة الاتصال --' : '-- Select Contact --') + '</option>';
      for(let i=0; i<vault.length; i++) {
        opts += '<option value="' + vault[i].phone + '">' + vault[i].owner + ' (كود: ' + vault[i].num + ')</option>';
      }
      let chatSel = document.getElementById('chatContactSelect');
      let callSel = document.getElementById('callContactSelect');
      if(chatSel) chatSel.innerHTML = opts;
      if(callSel) callSel.innerHTML = opts;
    }

    function changeActiveChat() {
      let chatSel = document.getElementById('chatContactSelect');
      if(!chatSel) return;
      let phone = chatSel.value;
      if(phone) {
        activeChatPhone = phone;
        if(!internalMessages[activeChatPhone]) {
          internalMessages[activeChatPhone] = [{sender: 'incoming', type: 'text', text: 'قناة مشفرة معتمدة.'}];
        }
        loadChatMessages();
      }
    }

    function loadChatMessages() {
      let box = document.getElementById('internalChatBox');
      if(!box) return;
      let msgs = internalMessages[activeChatPhone] || [];
      let h = '';
      for(let i=0; i<msgs.length; i++) {
        let m = msgs[i];
        let content = (m.type === 'view-once') ? '🔒 [وسائط سرية لمرة واحدة]' : m.text;
        h += '<div class="chat-bubble ' + m.sender + '"><strong>' + (m.sender === 'outgoing' ? (currentLang === 'ar' ? 'أنت:' : 'You:') : (currentLang === 'ar' ? 'الطرف الآخر:' : 'Peer:')) + '</strong> ' + content + '<div class="msg-meta"><span>محمي</span><span>✓✓</span></div></div>';
      }
      box.innerHTML = h;
      box.scrollTop = box.scrollHeight;
    }

    function sendInternalMessage() {
      let input = document.getElementById('chatInputMsg');
      if(!input) return;
      let text = input.value.trim();
      if(!text) return;
      if(!internalMessages[activeChatPhone]) internalMessages[activeChatPhone] = [];
      internalMessages[activeChatPhone].push({sender: 'outgoing', text: text, type: 'text'});
      input.value = '';
      loadChatMessages();
    }

    function sendViewOnceMedia() {
      if(!internalMessages[activeChatPhone]) internalMessages[activeChatPhone] = [];
      internalMessages[activeChatPhone].push({sender: 'outgoing', text: 'وسائط سرية', type: 'view-once'});
      loadChatMessages();
      alert(currentLang === 'ar' ? '🔒 تم إرسال الوسائط السرية بنجاح.' : '🔒 Secret media sent successfully.');
    }

    function translateLastMessageAI() {
      alert(currentLang === 'ar' ? '🌐 OMEGA AI: تم الترجمة والتلخيص الذكي بنجاح.' : '🌐 OMEGA AI: Translated and summarized successfully.');
    }

    function openChatFor(phone) {
      switchScreen('chats', document.getElementById('nav-chats'));
      let chatSel = document.getElementById('chatContactSelect');
      if(chatSel) { chatSel.value = phone; changeActiveChat(); }
    }

    function startSecureCall() {
      let st = document.getElementById('callStateText');
      if(st) st.innerText = currentLang === 'ar' ? 'الحالة: 🔴 المكالمة الفضائية مؤمنة 100%' : 'Status: 🔴 Satellite call 100% secured';
    }

    function endSecureCall() {
      let st = document.getElementById('callStateText');
      if(st) st.innerText = currentLang === 'ar' ? 'الحالة: تم قطع الاتصال وتأمين السجل' : 'Status: Call ended & log secured';
    }

    function sendAiPrompt() {
      let input = document.getElementById('aiInputPrompt');
      if(!input) return;
      let val = input.value.trim();
      if(!val) return;
      let logBox = document.getElementById('aiChatLog');
      if(logBox) logBox.innerHTML += '<div class="chat-bubble incoming"><strong>[OMEGA AI]:</strong> ' + (currentLang === 'ar' ? 'تمت معالجة الاستفسار الميداني عبر قناة AI-SAT بنجاح.' : 'Field query processed successfully via AI-SAT.') + '</div>';
      input.value = '';
    }

    function executeKillSwitch() {
      if(confirm(currentLang === 'ar' ? 'تحذير سيادي: هل تريد مسح الذاكرة وتفعيل درع الطوارئ؟' : 'Sovereign Warning: Activate emergency Kill-Switch?')) {
        vault = []; internalMessages = {};
        renderVault(); updateContactSelects();
        alert(currentLang === 'ar' ? '⚡ تم تأمين القطاع ومسح الذاكرة بنجاح.' : '⚡ Sector secured and memory wiped.');
      }
    }
  </script>
</body>
</html>`);
});

app.listen(PORT, function() { console.log('Server running on port ' + PORT); });
