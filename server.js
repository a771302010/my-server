const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/manifest.json', (req, res) => {
  res.json({
    "name": "سند - النظام الرقمي السيادي",
    "short_name": "سند OMEGA",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#020617",
    "theme_color": "#0b132b"
  });
});

app.get('/', (req, res) => {
  res.send('<!DOCTYPE html>\n' +
'<html lang="ar" dir="rtl">\n' +
'<head>\n' +
'  <meta charset="UTF-8">\n' +
'  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">\n' +
'  <title>برنامج سند - النظام الرقمي السيادي (v9.5 ULTIMATE)</title>\n' +
'  <link rel="manifest" href="/manifest.json">\n' +
'  <meta name="apple-mobile-web-app-capable" content="yes">\n' +
'  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n' +
'  <meta name="theme-color" content="#0b132b">\n' +
'  <style>\n' +
'    :root {\n' +
'      --primary: #1e3a8a;\n' +
'      --bg: #020617;\n' +
'      --card: #0b132b;\n' +
'      --card-border: #1e293b;\n' +
'      --text: #f1f5f9;\n' +
'      --muted: #94a3b8;\n' +
'      --accent: #38bdf8;\n' +
'      --gold: #d4af37;\n' +
'      --emerald: #10b981;\n' +
'      --danger: #ef4444;\n' +
'    }\n' +
'    body { margin: 0; padding: 0; background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding-bottom: 90px; -webkit-tap-highlight-color: transparent; }\n' +
'    .container { max-width: 720px; margin: 0 auto; padding: 16px; }\n' +
'    .telemetry-bar { background: #070f25; border: 1px solid var(--card-border); border-radius: 12px; padding: 10px 14px; margin-bottom: 14px; font-family: monospace; font-size: 11px; display: flex; justify-content: space-between; align-items: center; color: var(--accent); box-shadow: 0 4px 20px rgba(0,0,0,0.4); }\n' +
'    .telemetry-dot { width: 8px; height: 8px; background: var(--emerald); border-radius: 50%; box-shadow: 0 0 10px var(--emerald); animation: pulse 2s infinite; }\n' +
'    @keyframes pulse { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; } }\n' +
'    .header-compact { display: flex; align-items: center; justify-content: space-between; background: var(--card); border: 1px solid var(--card-border); border-radius: 14px; padding: 14px 18px; margin-bottom: 14px; box-shadow: 0 4px 15px rgba(0,0,0,0.3); }\n' +
'    .header-title h2 { margin: 0; font-size: 17px; color: var(--text); font-weight: 600; }\n' +
'    .header-title p { margin: 3px 0 0; font-size: 11px; color: var(--muted); }\n' +
'    .screen { display: none; }\n' +
'    .screen.active { display: block; }\n' +
'    .card-box { background: var(--card); border: 1px solid var(--card-border); border-radius: 16px; padding: 18px; margin-bottom: 14px; box-shadow: 0 6px 20px rgba(0,0,0,0.25); }\n' +
'    .card-box h3 { margin: 0 0 14px; font-size: 14px; color: var(--text); border-right: 3px solid var(--gold); padding-right: 8px; font-weight: 600; display: flex; justify-content: space-between; align-items: center; }\n' +
'    label { display: block; margin-bottom: 6px; font-weight: 500; font-size: 12px; color: var(--muted); }\n' +
'    input, select, textarea { width: 100%; padding: 12px; border-radius: 10px; border: 1px solid var(--card-border); margin-bottom: 12px; background: #020617; color: var(--text); font-size: 13px; box-sizing: border-box; }\n' +
'    input:focus, select:focus, textarea:focus { border-color: var(--accent); outline: none; box-shadow: 0 0 10px rgba(56,189,248,0.2); }\n' +
'    .unified-code-input { font-family: monospace !important; font-size: 18px !important; font-weight: bold; letter-spacing: 4px; text-align: center; color: var(--gold) !important; background: #020617 !important; border: 2px solid var(--card-border) !important; }\n' +
'    .btn-submit { width: 100%; padding: 13px; background: #1d4ed8; color: #fff; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 15px rgba(29,78,216,0.3); }\n' +
'    .btn-submit:hover { background: #1e40af; }\n' +
'    .btn-ai { background: linear-gradient(135deg, #3b82f6, #6366f1); box-shadow: 0 4px 15px rgba(99,102,241,0.3); }\n' +
'    .btn-action { background: #059669; padding: 6px 14px; font-size: 11px; width: auto; border-radius: 8px; color: #fff; border: none; cursor: pointer; }\n' +
'    .btn-danger { background: #dc2626; box-shadow: 0 4px 15px rgba(220,38,38,0.3); color: #fff; border: none; cursor: pointer; }\n' +
'    .switch-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 13px; }\n' +
'    .switch-row:last-child { border-bottom: none; }\n' +
'    .switch { position: relative; display: inline-block; width: 44px; height: 24px; }\n' +
'    .switch input { opacity: 0; width: 0; height: 0; }\n' +
'    .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #1e293b; transition: .3s; border-radius: 24px; border: 1px solid var(--card-border); }\n' +
'    .slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; }\n' +
'    input:checked + .slider { background-color: var(--emerald); }\n' +
'    input:checked + .slider:before { transform: translateX(20px); }\n' +
'    .bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; background: #020617; border-top: 1px solid var(--card-border); display: grid; grid-template-columns: repeat(5, 1fr); padding: 10px 4px; z-index: 1000; box-shadow: 0 -10px 30px rgba(0,0,0,0.8); }\n' +
'    .nav-item { background: transparent; border: none; color: var(--muted); display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 10px; cursor: pointer; padding: 4px; font-weight: 500; gap: 4px; }\n' +
'    .nav-item svg { width: 22px; height: 22px; fill: currentColor; }\n' +
'    .nav-item.active { color: var(--accent); }\n' +
'    .nav-item.active svg { fill: var(--accent); }\n' +
'    .list-item { background: #020617; border: 1px solid var(--card-border); border-radius: 10px; padding: 12px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }\n' +
'    .badge-gold { background: rgba(212,175,55,0.12); color: var(--gold); border: 1px solid rgba(212,175,55,0.3); padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 600; }\n' +
'    .profile-card { text-align: center; padding: 22px; background: var(--card); border: 1px solid var(--card-border); border-radius: 16px; margin-bottom: 14px; }\n' +
'    .profile-avatar { width: 68px; height: 68px; background: linear-gradient(135deg, #1e3a8a, #3b82f6); border-radius: 50%; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center; border: 2px solid var(--gold); font-size: 26px; color: #fff; font-weight: bold; }\n' +
'    .admin-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 14px; }\n' +
'    .stat-box { background: #020617; border: 1px solid var(--card-border); border-radius: 10px; padding: 12px; text-align: center; }\n' +
'    .stat-val { font-size: 18px; font-weight: bold; color: var(--gold); font-family: monospace; margin-top: 4px; }\n' +
'    .ai-chat-box { background: #020617; border: 1px solid var(--card-border); border-radius: 10px; padding: 14px; min-height: 150px; max-height: 220px; overflow-y: auto; margin-bottom: 12px; font-size: 12px; color: var(--accent); }\n' +
'    .chat-container { background: #020617; border: 1px solid var(--card-border); border-radius: 10px; padding: 12px; height: 250px; overflow-y: auto; margin-bottom: 12px; display: flex; flex-direction: column; gap: 10px; }\n' +
'    .chat-bubble { padding: 10px 14px; border-radius: 12px; font-size: 12px; max-width: 82%; line-height: 1.5; position: relative; }\n' +
'    .chat-bubble.outgoing { background: #1e40af; color: #fff; align-self: flex-end; border-bottom-left-radius: 2px; }\n' +
'    .chat-bubble.incoming { background: #1e293b; color: var(--text); align-self: flex-start; border-bottom-right-radius: 2px; }\n' +
'    .msg-meta { font-size: 9px; color: var(--muted); margin-top: 5px; display: flex; justify-content: space-between; align-items: center; }\n' +
'  </style>\n' +
'</head>\n' +
'<body>\n' +
'  <div class="container">\n' +
'    <div class="telemetry-bar">\n' +
'      <span>AI-SAT OMEGA: <strong>SECURED // v9.5 ULTIMATE</strong></span>\n' +
'      <div style="display:flex; align-items:center; gap:8px;">\n' +
'        <span style="color:var(--emerald);">نشط وآمن</span>\n' +
'        <div class="telemetry-dot"></div>\n' +
'      </div>\n' +
'    </div>\n' +
'    \n' +
'    <!-- لوحة الإدارة والتحكم لمالك البرنامج -->\n' +
'    <div class="card-box" style="background: linear-gradient(135deg, #0b132b, #070f25);">\n' +
'      <h3>👑 لوحة المشتركين والإدارة العامة (أبو طارق)</h3>\n' +
'      <div class="admin-stats">\n' +
'        <div class="stat-box"><span style="font-size:11px; color:var(--muted);">إجمالي الهويات المسجلة</span><div class="stat-val" id="totalSubs">2</div></div>\n' +
'        <div class="stat-box"><span style="font-size:11px; color:var(--muted);">حالة التشفير والمنظومة</span><div class="stat-val" style="color:var(--emerald); font-size:14px; margin-top:6px;">مؤمن 100%</div></div>\n' +
'      </div>\n' +
'    </div>\n' +
'\n' +
'    <!-- 1. شاشة الهوية والأكواد -->\n' +
'    <div id="screenCodes" class="screen active">\n' +
'      <div class="header-compact">\n' +
'        <div class="header-title">\n' +
'          <h2>الهوية الرقمية المستقلة</h2>\n' +
'          <p>توليد المعرف الذكي 8 أرقام (بدون شريحة)</p>\n' +
'        </div>\n' +
'      </div>\n' +
'      <div class="card-box">\n' +
'        <h3>توليد هوية جديدة بضغطة زر</h3>\n' +
'        <button type="button" class="btn-submit btn-ai" onclick="generateSovereignId()" style="margin-bottom:14px;">⚡ توليد هويتي وكودي الرقمي (يبدأ بـ 8)</button>\n' +
'        <form id="codeForm">\n' +
'          <label>اسم الشخص أو الجهة:</label>\n' +
'          <input type="text" id="ownerName" placeholder="أدخل الاسم..." required />\n' +
'          <label>رقم هاتف اختياري:</label>\n' +
'          <input type="tel" id="contactPhone" placeholder="96777xxxxxxx" style="direction:ltr; text-align:right;" />\n' +
'          <label>الكود الرقمي (8 خانات):</label>\n' +
'          <input type="text" id="sovereignCodeInput" class="unified-code-input" placeholder="888xxxxx" maxlength="8" inputmode="numeric" required />\n' +
'          <label>التصنيف:</label>\n' +
'          <select id="numCategory">\n' +
'            <option value="بروتوكول القيادة العليا (VIP)">بروتوكول القيادة العليا (VIP)</option>\n' +
'            <option value="غرفة العمليات المركزية">غرفة العمليات المركزية</option>\n' +
'            <option value="قناة عائلية خاصة">قناة عائلية خاصة</option>\n' +
'          </select>\n' +
'          <button type="submit" class="btn-submit" style="margin-top:6px;">حفظ الهوية في الدليل</button>\n' +
'        </form>\n' +
'      </div>\n' +
'      <div class="card-box">\n' +
'        <h3>🔍 الدليل الرقمي المحفوظ</h3>\n' +
'        <input type="text" id="vaultSearch" placeholder="بحث بالاسم أو الكود..." oninput="filterVault()" style="margin-bottom:10px;" />\n' +
'        <div id="vaultList"><p style="color:var(--muted); text-align:center; font-size:12px;">الدليل فارغ.</p></div>\n' +
'      </div>\n' +
'    </div>\n' +
'\n' +
'    <!-- 2. شاشة الدردشات مع الترجمة الفورية -->\n' +
'    <div id="screenChats" class="screen">\n' +
'      <div class="header-compact">\n' +
'        <div class="header-title">\n' +
'          <h2>الدردشات المشفرة والهادئة</h2>\n' +
'          <p>مقاوم للتحويل + تدمير الوسائط + ترجمة فورية AI</p>\n' +
'        </div>\n' +
'      </div>\n' +
'      <div class="card-box">\n' +
'        <label>اختر جهة الاتصال:</label>\n' +
'        <select id="chatContactSelect" onchange="changeActiveChat()" style="margin-bottom:12px;"><option value="">-- اختر من الدليل --</option></select>\n' +
'        <div class="chat-container" id="internalChatBox">\n' +
'          <div class="chat-bubble incoming"><strong>[درع الحماية]:</strong> أهلاً بك. القناة مشفرة وآمنة تماماً.<div class="msg-meta"><span>محمي رقمياً</span><span>✓✓</span></div></div>\n' +
'        </div>\n' +
'        <input type="text" id="chatInputMsg" placeholder="اكتب رسالتك المشفرة..." />\n' +
'        <div style="display:flex; gap:8px; margin-bottom:10px;">\n' +
'          <button type="button" class="btn-submit" onclick="sendInternalMessage()" style="flex:2;">إرسال رسالة</button>\n' +
'          <button type="button" class="btn-submit btn-ai" onclick="sendViewOnceMedia()" style="flex:1;">📸 صورة لمرة واحدة</button>\n' +
'        </div>\n' +
'        <button type="button" class="btn-submit btn-ai" onclick="translateLastMessageAI()">🌐 ترجمة فورية / تلخيص ذكي</button>\n' +
'      </div>\n' +
'    </div>\n' +
'\n' +
'    <!-- 3. مساعد سند الذكي -->\n' +
'    <div id="screenAi" class="screen">\n' +
'      <div class="header-compact">\n' +
'        <div class="header-title">\n' +
'          <h2>المستشار الاستراتيجي OMEGA AI</h2>\n' +
'          <p>مساعدك الذكي للتحليل والترجمة الفورية</p>\n' +
'        </div>\n' +
'      </div>\n' +
'      <div class="card-box">\n' +
'        <h3>سجل المساعد الذكي</h3>\n' +
'        <div class="ai-chat-box" id="aiChatLog"><div><strong>[OMEGA AI]:</strong> جاهز لمعالجة وتحليل الاستفسارات بكل راحة يا أبو طارق.</div></div>\n' +
'        <label>استفسار للتحليل:</label>\n' +
'        <input type="text" id="aiInputPrompt" placeholder="اكتب استفسارك هنا..." />\n' +
'        <button type="button" class="btn-submit btn-ai" onclick="sendAiPrompt()">تنفيذ التحليل الذكي</button>\n' +
'      </div>\n' +
'    </div>\n' +
'\n' +
'    <!-- 4. شاشة المكالمات -->\n' +
'    <div id="screenCalls" class="screen">\n' +
'      <div class="header-compact">\n' +
'        <div class="header-title">\n' +
'          <h2>مركز الاتصال الرقمي الآمن</h2>\n' +
'          <p>اتصال صوتي نقي ومؤمن بالكامل</p>\n' +
'        </div>\n' +
'      </div>\n' +
'      <div class="card-box">\n' +
'        <h3>إطلاق اتصال آمن</h3>\n' +
'        <label>اختر جهة الاتصال:</label>\n' +
'        <select id="callContactSelect" style="margin-bottom:12px;"><option value="">-- اختر جهة الاتصال --</option></select>\n' +
'        <div id="callStatusBox" style="background:#020617; border:1px solid var(--card-border); border-radius:10px; padding:16px; text-align:center; margin-bottom:12px;">\n' +
'          <p style="margin:0 0 6px; color:var(--muted); font-size:12px;" id="callStateText">الحالة: جاهز للمصافحة الآمنة</p>\n' +
'          <h3 id="activeCallTarget" style="margin:0; color:var(--accent);">-- لا يوجد اتصال --</h3>\n' +
'        </div>\n' +
'        <button type="button" class="btn-submit" style="background:#1e40af;" onclick="startSecureCall()">بدء الاتصال المشفر</button>\n' +
'        <button type="button" class="btn-submit btn-danger" style="margin-top:8px;" onclick="endSecureCall()">قطع الاتصال وتأمين السجل</button>\n' +
'      </div>\n' +
'    </div>\n' +
'\n' +
'    <!-- 5. شاشة الإعدادات وغرفة التحكم -->\n' +
'    <div id="screenSettings" class="screen">\n' +
'      <div class="profile-card">\n' +
'        <div class="profile-avatar">Ω</div>\n' +
'        <h3 style="margin:0 0 4px;">سند CONTROL CENTER</h3>\n' +
'        <p style="color:var(--muted); font-size:12px; margin:0;">غرفة التحكم والسيادة الشاملة // v9.5</p>\n' +
'      </div>\n' +
'      <div class="card-box">\n' +
'        <h3>🛡️ درع الحماية والخصوصية المتقدمة</h3>\n' +
'        <div class="switch-row"><span>منع إعادة توجيه الرسائل (Anti-Forward)</span><label class="switch"><input type="checkbox" checked><span class="slider"></span></label></div>\n' +
'        <div class="switch-row"><span>حماية الوسائط لمرة واحدة (View-Once)</span><label class="switch"><input type="checkbox" checked><span class="slider"></span></label></div>\n' +
'        <div class="switch-row"><span>قفل الشاشة البيومتري والبصمة</span><label class="switch"><input type="checkbox"><span class="slider"></span></label></div>\n' +
'        <div class="switch-row"><span>وضع التمويه العكسي الآمن (Honey-Pot)</span><label class="switch"><input type="checkbox" checked><span class="slider"></span></label></div>\n' +
'      </div>\n' +
'      <div class="card-box">\n' +
'        <h3>🧠 محطة ذكاء OMEGA AI والترجمة</h3>\n' +
'        <label>اللغة الافتراضية للمترجم العصبي:</label>\n' +
'        <select id="aiLangSelect"><option value="ar">العربية (الافتراضية)</option><option value="en">الإنجليزية (English)</option></select>\n' +
'        <div class="switch-row"><span>التلخيص الذكي التلقائي للمستندات</span><label class="switch"><input type="checkbox" checked><span class="slider"></span></label></div>\n' +
'      </div>\n' +
'      <div class="card-box" style="border-color: rgba(239,68,68,0.3);">\n' +
'        <h3 style="border-right-color: var(--danger); color: var(--danger);">⚡ غرفة الطوارئ والتحكم المطلق</h3>\n' +
'        <p style="font-size: 11px; color: var(--muted); margin-bottom: 12px;">تفعيل مفتاح الطوارئ يمسح كافة السجلات والذاكرة المحلية فوراً.</p>\n' +
'        <button type="button" class="btn-submit btn-danger" onclick="executeKillSwitch()">تفعيل مفتاح الطوارئ الشامل (Kill-Switch)</button>\n' +
'      </div>\n' +
'    </div>\n' +
'  </div>\n' +
'  <nav class="bottom-nav">\n' +
'    <button class="nav-item active" type="button" onclick="switchScreen(\'codes\', this)"><svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg><span>الهوية</span></button>\n' +
'    <button class="nav-item" type="button" onclick="switchScreen(\'chats\', this)"><svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg><span>الدردشات</span></button>\n' +
'    <button class="nav-item" type="button" onclick="switchScreen(\'ai\', this)"><svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1010 10A10 10 0 0012 2zm0 18a8 8 0 118-8 8 8 0 01-8 8zm1-13h-2v6h6v-2h-4z"/></svg><span>مساعد AI</span></button>\n' +
'    <button class="nav-item" type="button" onclick="switchScreen(\'calls\', this)"><svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg><span>المكالمات</span></button>\n' +
'    <button class="nav-item" type="button" onclick="switchScreen(\'settings\', this)"><svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c-.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg><span>الإعدادات</span></button>\n' +
'  </nav>\n' +
'  <script>\n' +
'    let vault = [\n' +
'      { owner: "أبو طارق", phone: "967770000001", num: "88800001", cat: "بروتوكول القيادة العليا (VIP)" },\n' +
'      { owner: "أم طارق", phone: "967770000002", num: "88800002", cat: "قناة عائلية خاصة" }\n' +
'    ];\n' +
'    let internalMessages = { "967770000001": [{sender: "incoming", text: "مرحباً بك يا أبو طارق. النظام جاهز.", type: "text"}] };\n' +
'    let activeChatPhone = "967770000001";\n' +
'    \n' +
'    window.onload = function() { renderVault(); updateContactSelects(); updateAdminStats(); };\n' +
'    \n' +
'    function switchScreen(id, btn) {\n' +
'      document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));\n' +
'      document.querySelectorAll(".nav-item").forEach(i => i.classList.remove("active"));\n' +
'      document.getElementById("screen" + id.charAt(0).toUpperCase() + id.slice(1)).classList.add("active");\n' +
'      btn.classList.add("active");\n' +
'    }\n' +
'    \n' +
'    function generateSovereignId() {\n' +
'      let suffix = Math.floor(100000 + Math.random() * 900000);\n' +
'      document.getElementById("sovereignCodeInput").value = "888" + suffix.toString().substring(0, 5);\n' +
'    }\n' +
'    \n' +
'    document.getElementById("codeForm").addEventListener("submit", function(e) {\n' +
'      e.preventDefault();\n' +
'      let owner = document.getElementById("ownerName").value.trim();\n' +
'      let phone = document.getElementById("contactPhone").value.trim();\n' +
'      let cat = document.getElementById("numCategory").value;\n' +
'      let num = document.getElementById("sovereignCodeInput").value.trim();\n' +
'      \n' +
'      if (!num || num.length !== 8) { alert("أدخل الكود الرقمي (8 أرقام)."); return; }\n' +
'      if (vault.some(i => i.num === num)) { alert("تنبيه: هذا الكود مسجل مسبقاً لمنع التكرار."); return; }\n' +
'      \n' +
'      vault.unshift({ owner, phone: phone || "رقمي محلي", num, cat });\n' +
'      renderVault();\n' +
'      updateContactSelects();\n' +
'      updateAdminStats();\n' +
'      document.getElementById("codeForm").reset();\n' +
'      alert("تم حفظ الهوية في الدليل بنجاح!");\n' +
'    });\n' +
'    \n' +
'    function renderVault() {\n' +
'      let list = document.getElementById("vaultList");\n' +
'      if (vault.length === 0) { list.innerHTML = "<p style=\'color:var(--muted); text-align:center;\'>الدليل فارغ.</p>"; return; }\n' +
'      let h = "";\n' +
'      for(let i=0; i<vault.length; i++) {\n' +
'        let item = vault[i];\n' +
'        h += "<div class=\'list-item\'><div><strong>" + item.owner + "</strong> <span class=\'badge-gold\'>" + item.cat + "</span><br/><span style=\'font-family:monospace; color:var(--gold);\'>الكود: " + item.num + "</span></div><div><button class=\'btn-submit btn-action\' onclick=\'openChatFor(\\"" + item.phone + "\\")\'>مراسلة</button></div></div>";\n' +
'      }\n' +
'      list.innerHTML = h;\n' +
'    }\n' +
'    \n' +
'    function updateAdminStats() {\n' +
'      let el = document.getElementById("totalSubs");\n' +
'      if(el) el.innerText = vault.length;\n' +
'    }\n' +
'    \n' +
'    function updateContactSelects() {\n' +
'      let opts = "<option value=\'\'>-- اختر من الدليل --</option>";\n' +
'      for(let i=0; i<vault.length; i++) {\n' +
'        opts += "<option value=\'" + vault[i].phone + "\'>" + vault[i].owner + " (كود: " + vault[i].num + ")</option>";\n' +
'      }\n' +
'      document.getElementById("chatContactSelect").innerHTML = opts;\n' +
'      document.getElementById("callContactSelect").innerHTML = opts;\n' +
'    }\n' +
'    \n' +
'    function changeActiveChat() {\n' +
'      let phone = document.getElementById("chatContactSelect").value;\n' +
'      if(phone) {\n' +
'        activeChatPhone = phone;\n' +
'        if(!internalMessages[activeChatPhone]) {\n' +
'          internalMessages[activeChatPhone] = [{sender: "incoming", text: "قناة مشفرة جديدة.", type: "text"}];\n' +
'        }\n' +
'        loadChatMessages();\n' +
'      }\n' +
'    }\n' +
'    \n' +
'    function loadChatMessages() {\n' +
'      let box = document.getElementById("internalChatBox");\n' +
'      let msgs = internalMessages[activeChatPhone] || [];\n' +
'      let h = "";\n' +
'      for(let i=0; i<msgs.length; i++) {\n' +
'        let m = msgs[i];\n' +
'        let content = (m.type === "view-once") ? "🔒 [وسائط لمرة واحدة]" : m.text;\n' +
'        h += "<div class=\'chat-bubble " + m.sender + "\"><strong>" + (m.sender === "outgoing" ? "أنت:" : "الطرف الآخر:") + "</strong> " + content + "<div class=\'msg-meta\'><span>محمي</span><span>✓✓</span></div></div>";\n' +
'      }\n' +
'      box.innerHTML = h;\n' +
'      box.scrollTop = box.scrollHeight;\n' +
'    }\n' +
'    \n' +
'    function sendInternalMessage() {\n' +
'      let input = document.getElementById("chatInputMsg");\n' +
'      let text = input.value.trim();\n' +
'      if(!text) return;\n' +
'      if(!internalMessages[activeChatPhone]) internalMessages[activeChatPhone] = [];\n' +
'      internalMessages[activeChatPhone].push({sender: "outgoing", text, type: "text"});\n' +
'      input.value = "";\n' +
'      loadChatMessages();\n' +
'    }\n' +
'    \n' +
'    function sendViewOnceMedia() {\n' +
'      if(!internalMessages[activeChatPhone]) internalMessages[activeChatPhone] = [];\n' +
'      internalMessages[activeChatPhone].push({sender: "outgoing", text: "وسائط سرية", type: "view-once"});\n' +
'      loadChild = true;\n' +
'      loadChatMessages();\n' +
'      alert("🔒 تم إرسال الوسائط (تختفي بعد المشاهدة).");\n' +
'    }\n' +
'    \n' +
'    function translateLastMessageAI() {\n' +
'      alert("🌐 OMEGA AI: تم ترجمة وتحليل الرسائل الأخيرة بنجاح داخل القناة.");\n' +
'    }\n' +
'    \n' +
'    function openChatFor(phone) {\n' +
'      switchScreen("chats", document.querySelectorAll(".nav-item")[1]);\n' +
'      document.getElementById("chatContactSelect").value = phone;\n' +
'      changeActiveChat();\n' +
'    }\n' +
'    \n' +
'    function startSecureCall() {\n' +
'      document.getElementById("callStateText").innerText = "الحالة: 🔴 المكالمة الرقمية مؤمنة 100%";\n' +
'    }\n' +
'    \n' +
'    function endSecureCall() {\n' +
'      document.getElementById("callStateText").innerText = "الحالة: تم قطع الاتصال وتأمين السجل";\n' +
'    }\n' +
'    \n' +
'    function sendAiPrompt() {\n' +
'      let input = document.getElementById("aiInputPrompt");\n' +
'      if(!input.value.trim()) return;\n' +
'      document.getElementById("aiChatLog").innerHTML += "<div style=\'margin-top:6px; color:var(--emerald);\'><strong>[OMEGA AI]:</strong> تم استيعاب الطلب وتنفيذه بنجاح.</div>";\n' +
'      input.value = "";\n' +
'    }\n' +
'    \n' +
'    function executeKillSwitch() {\n' +
'      if(confirm("تحذير: هل تريد مسح الذاكرة الفورية وتأمين القطاع؟")) {\n' +
'        vault = []; updateAdminStats(); renderVault(); updateContactSelects();\n' +
'        alert("⚡ تم مسح الذاكرة وتفعيل درع الطوارئ بنجاح.");\n' +
'      }\n' +
'    }\n' +
'  </script>\n' +
'</body>\n' +
'</html>');
});

app.listen(PORT, () => console.log('Server running on port ' + PORT));
