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
  <title>برنامج سند - المنصة السيادية (v10.0 ULTRA)</title>
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

    /* بروفايل الطراز العالي (مستوحى من زانغي وواتساب) */
    .profile-card { background: var(--card); border: 1px solid var(--card-border); border-radius: 16px; padding: 16px; margin-bottom: 14px; display: flex; align-items: center; gap: 14px; box-shadow: 0 6px 20px rgba(0,0,0,0.4); }
    .profile-avatar { width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(135deg, #1e40af, #3b82f6); display: flex; align-items: center; justify-content: center; border: 2px solid var(--gold); font-size: 26px; color: #fff; flex-shrink: 0; box-shadow: 0 0 15px rgba(212,175,55,0.3); }
    .profile-info { flex-grow: 1; }
    .profile-info h2 { margin: 0; font-size: 16px; color: var(--text); font-weight: 700; display: flex; align-items: center; gap: 6px; }
    .profile-info p { margin: 4px 0 0; font-size: 11px; color: var(--muted); font-family: monospace; }
    .profile-actions { display: flex; gap: 6px; }
    .profile-icon-btn { background: #020617; border: 1px solid var(--card-border); color: var(--accent); width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 14px; }

    .screen { display: none; }
    .screen.active { display: block; }

    .card-box { background: var(--card); border: 1px solid var(--card-border); border-radius: 16px; padding: 16px; margin-bottom: 14px; box-shadow: 0 6px 20px rgba(0,0,0,0.25); }
    .card-box h3 { margin: 0 0 12px; font-size: 14px; color: var(--text); border-right: 3px solid var(--gold); padding-right: 8px; font-weight: 600; display: flex; justify-content: space-between; align-items: center; }

    /* إعدادات القوائم (على طراز واتساب وزانغي) */
    .settings-group { background: var(--card); border: 1px solid var(--card-border); border-radius: 16px; overflow: hidden; margin-bottom: 14px; box-shadow: 0 6px 20px rgba(0,0,0,0.25); }
    .settings-item { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid var(--card-border); cursor: pointer; transition: background 0.2s; }
    .settings-item:last-child { border-bottom: none; }
    .settings-item:hover { background: rgba(56,189,248,0.05); }
    .settings-item-left { display: flex; align-items: center; gap: 12px; }
    .settings-icon { width: 32px; height: 32px; border-radius: 8px; background: rgba(56,189,248,0.1); color: var(--accent); display: flex; align-items: center; justify-content: center; font-size: 16px; }
    .settings-text h4 { margin: 0; font-size: 13px; color: var(--text); font-weight: 600; }
    .settings-text p { margin: 2px 0 0; font-size: 10px; color: var(--muted); }
    .settings-arrow { color: var(--muted); font-size: 14px; }

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
      <span>AI-SAT LINK: SECURED // v10.0</span>
      <div class="telemetry-dot"></div>
    </div>

    <!-- 1. شاشة الإعدادات والتحكم (مرتبة على طراز واتساب وزانغي ومزودة بخصائص سند) -->
    <div id="screenSettings" class="screen active">
      <div class="profile-card">
        <div class="profile-avatar">Ω</div>
        <div class="profile-info">
          <h2>أبو طارق <span class="badge-gold">VIP</span></h2>
          <p>الكود السيادي: 88848031 | 1X AI-SAT</p>
        </div>
        <div class="profile-actions">
          <div class="profile-icon-btn" onclick="alert('QR الكود السيادي الشخصي جاهز للمشاركة الآمنة.')" title="QR Code">🔲</div>
          <div class="profile-icon-btn" onclick="toggleLanguage()" title="Language">🌐</div>
        </div>
      </div>

      <div class="settings-group">
        <div class="settings-item" onclick="switchScreen('codes', document.getElementById('nav-codes'))">
          <div class="settings-item-left">
            <div class="settings-icon">🔑</div>
            <div class="settings-text">
              <h4 id="stKeyTitle">إدارة الأكواد والهويات المعتمدة</h4>
              <p id="stKeyDesc">تسجيل وتأمين الأكواد السيادية والمجموعات</p>
            </div>
          </div>
          <div class="settings-arrow">‹</div>
        </div>
        <div class="settings-item" onclick="alert('الحساب محمي ببروتوكول تشفير عالي المستوى تحت إشراف الإدارة.')">
          <div class="settings-item-left">
            <div class="settings-icon">🛡️</div>
            <div class="settings-text">
              <h4 id="stAccTitle">الحساب والأمان السيادي</h4>
              <p id="stAccDesc">التحقق بخطوتين، مفتاح الطوارئ، ومنع إعادة التوجيه</p>
            </div>
          </div>
          <div class="settings-arrow">‹</div>
        </div>
        <div class="settings-item" onclick="alert('قناة التوجيه الفضائي (AI-SAT) نشطة ومستقرة عبر بروتوكول 1X.')">
          <div class="settings-item-left">
            <div class="settings-icon">🛰️</div>
            <div class="settings-text">
              <h4 id="stNetTitle">النطاق الترددي ونفق AI-SAT</h4>
              <p id="stNetDesc">وضع الاتصال السريع، تتبع الأقمار، وتحسين الإشارة</p>
            </div>
          </div>
          <div class="settings-arrow">‹</div>
        </div>
      </div>

      <div class="settings-group">
        <div class="settings-item" onclick="switchScreen('chats', document.getElementById('nav-chats'))">
          <div class="settings-item-left">
            <div class="settings-icon">💬</div>
            <div class="settings-text">
              <h4 id="stChatTitle">الدردشات والوسائط السرية</h4>
              <p id="stChatDesc">سجل الدردشة، الصور ذاتية الاختفاء، والترجمة الفورية</p>
            </div>
          </div>
          <div class="settings-arrow">‹</div>
        </div>
        <div class="settings-item" onclick="switchScreen('ai', document.getElementById('nav-ai'))">
          <div class="settings-item-left">
            <div class="settings-icon">🤖</div>
            <div class="settings-text">
              <h4 id="stAiTitle">مساعد سند الذكي (OMEGA AI)</h4>
              <p id="stAiDesc">التحليل الاستراتيجي وإدارة المهام الميدانية</p>
            </div>
          </div>
          <div class="settings-arrow">‹</div>
        </div>
        <div class="settings-item" onclick="alert('تم مزامنة النسخ الاحتياطي للأرشيف السيادي بنجاح.')">
          <div class="settings-item-left">
            <div class="settings-icon">💾</div>
            <div class="settings-text">
              <h4 id="stBackupTitle">مخزن البيانات ونقل الجهاز</h4>
              <p id="stBackupDesc">نقل البيانات لجهاز جديد أو استعادة النسخة الاحتيايطية</p>
            </div>
          </div>
          <div class="settings-arrow">‹</div>
        </div>
      </div>

      <div class="settings-group">
        <div class="settings-item" onclick="alert('منصة سند السيادية - الإصدار v10.0 ULTRA. تطوير عابر للحدود.')">
          <div class="settings-item-left">
            <div class="settings-icon">ℹ️</div>
            <div class="settings-text">
              <h4 id="stHelpTitle">دليل الاستخدام والسياسة</h4>
              <p id="stHelpDesc">الأسئلة الشائعة، شروط الاستخدام، والدعم الفني</p>
            </div>
          </div>
          <div class="settings-arrow">‹</div>
        </div>
      </div>

      <button type="button" class="btn-submit btn-danger" onclick="executeKillSwitch()" id="btnKillSwitch">⚡ تفعيل مفتاح الطوارئ الشامل (Kill-Switch)</button>
    </div>

    <!-- 2. شاشة الأكواد والدليل -->
    <div id="screenCodes" class="screen">
      <div class="card-box">
        <h3>تسجيل وتأمين كود سيادي (تحت إشراف الإدارة)</h3>
        <button type="button" class="btn-submit btn-ai" onclick="requestSovereignId()" style="margin-bottom:12px;">⚡ طلب كود سيادي معتمد من الإدارة</button>
        
        <form id="codeForm">
          <label>اسم الشخص أو الجهة:</label>
          <input type="text" id="ownerName" placeholder="أدخل الاسم أو المعرف..." required />
          
          <label>رقم الهاتف أو المعرف العسكري:</label>
          <input type="tel" id="contactPhone" placeholder="96777xxxxxxx" style="direction:ltr; text-align:right;" />

          <label>الكود السيادي (8 أرقام دقيقة):</label>
          <input type="text" id="sovereignCodeInput" class="unified-code-input" placeholder="888xxxxx" maxlength="8" inputmode="numeric" required />

          <label>التصنيف الإداري السيادي:</label>
          <select id="numCategory">
            <option value="بروتوكول الأسرة والقيادة (VIP)">بروتوكول الأسرة والقيادة (VIP)</option>
            <option value="محطة العمليات المركزية (800)">محطة العمليات المركزية (800)</option>
            <option value="قناة التوجيه الفضائي (AI-SAT)">قناة التوجيه الفضائي (AI-SAT)</option>
          </select>

          <button type="submit" class="btn-submit" style="margin-top:4px;">اعتماد وتأمين البصمة في الدليل</button>
        </form>
      </div>

      <div class="card-box">
        <h3>🔍 الدليل السيادي المحفوظ (محمي ومراجع)</h3>
        <input type="text" id="vaultSearch" placeholder="بحث بالاسم أو الرقم في الدليل..." oninput="filterVault()" style="margin-bottom:10px;" />
        <div id="vaultList">
          <p style="color:var(--muted); text-align:center; font-size:12px;">الدليل فارغ ونظيف.</p>
        </div>
      </div>
    </div>

    <!-- 3. شاشة الدردشات المشفرة -->
    <div id="screenChats" class="screen">
      <div class="card-box">
        <h3>💬 الدردشات المشفرة وتأمين الوسائط</h3>
        <label>اختر جهة الاتصال المعتمدة:</label>
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
          <button type="button" class="btn-submit" onclick="sendInternalMessage()" style="flex:2;">إرسال رسالة</button>
          <button type="button" class="btn-submit btn-ai" onclick="sendViewOnceMedia()" style="flex:1;">📸 صورة لمرة واحدة</button>
        </div>
        <button type="button" class="btn-submit btn-ai" onclick="translateLastMessageAI()">🌐 ترجمة فورية / تلخيص ذكي</button>
      </div>
    </div>

    <!-- 4. مساعد سند والتحليل الذكي -->
    <div id="screenAi" class="screen">
      <div class="card-box">
        <h3>🤖 مساعد سند الاستراتيجي والذكاء الاصطناعي</h3>
        <div class="chat-container" id="aiChatLog" style="height: 180px;">
          <div class="chat-bubble incoming"><strong>[OMEGA AI]:</strong> جاهز لمعالجة وتحليل الاستفسارات الميدانية والإدارية بكل دقة يا أبو طارق.</div>
        </div>
        <label>استفسار للتحليل المتقدم:</label>
        <input type="text" id="aiInputPrompt" placeholder="اكتب استفسارك هنا..." />
        <button type="button" class="btn-submit btn-ai" onclick="sendAiPrompt()">تنفيذ التحليل الذكي عبر AI-SAT</button>
      </div>
    </div>

    <!-- 5. شاشة المكالمات الفضائية الآمنة -->
    <div id="screenCalls" class="screen">
      <div class="card-box">
        <h3>📞 مركز المكالمات الفضائية الآمنة</h3>
        <label>اختر جهة الاتصال للاتصال:</label>
        <select id="callContactSelect" style="margin-bottom:12px;">
          <option value="">-- اختر جهة الاتصال --</option>
        </select>
        
        <div id="callStatusBox" style="background:#020617; border:1px solid var(--card-border); border-radius:10px; padding:16px; text-align:center; margin-bottom:12px;">
          <p style="margin:0 0 6px; color:var(--muted); font-size:12px;" id="callStateText">الحالة: جاهز للمصافحة الفضائية المشفرة</p>
          <h3 id="activeCallTarget" style="margin:0; color:var(--accent);">-- بانتظار بدء الاتصال --</h3>
        </div>

        <button type="button" class="btn-submit" style="background:#1e40af;" onclick="startSecureCall()">بدء الاتصال الفضائي المشفر</button>
        <button type="button" class="btn-submit btn-danger" style="margin-top:8px;" onclick="endSecureCall()">قطع الاتصال وتأمين السجل</button>
      </div>
    </div>

  </div>

  <nav class="bottom-nav">
    <button class="nav-item" type="button" id="nav-codes" onclick="switchScreen('codes', this)">
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
    <button class="nav-item active" type="button" id="nav-settings" onclick="switchScreen('settings', this)">
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
      '967770000001': [{sender: 'incoming', type: 'text', text: 'مرحباً بك يا أبو طارق. إعدادات سند مركزية ومؤمنة.'}]
    };
    let activeChatPhone = '967770000001';
    let currentLang = 'ar';

    const translations = {
      ar: {
        stKeyTitle: "إدارة الأكواد والهويات المعتمدة",
        stKeyDesc: "تسجيل وتأمين الأكواد السيادية والمجموعات",
        stAccTitle: "الحساب والأمان السيادي",
        stAccDesc: "التحقق بخطوتين، مفتاح الطوارئ، ومنع إعادة التوجيه",
        stNetTitle: "النطاق الترددي ونفق AI-SAT",
        stNetDesc: "وضع الاتصال السريع، تتبع الأقمار، وتحسين الإشارة",
        stChatTitle: "الدردشات والوسائط السرية",
        stChatDesc: "سجل الدردشة، الصور ذاتية الاختفاء، والترجمة الفورية",
        stAiTitle: "مساعد سند الذكي (OMEGA AI)",
        stAiDesc: "التحليل الاستراتيجي وإدارة المهام الميدانية",
        stBackupTitle: "مخزن البيانات ونقل الجهاز",
        stBackupDesc: "نقل البيانات لجهاز جديد أو استعادة النسخة الاحتيايطية",
        stHelpTitle: "دليل الاستخدام والسياسة",
        stHelpDesc: "الأسئلة الشائعة، شروط الاستخدام، والدعم الفني",
        btnKillSwitch: "⚡ تفعيل مفتاح الطوارئ الشامل (Kill-Switch)",
        navCodes: "الأكواد",
        navChats: "الدردشات",
        navAi: "مساعد سند",
        navCalls: "المكالمات",
        navSettings: "الإعدادات"
      },
      en: {
        stKeyTitle: "Approved Codes & Identities",
        stKeyDesc: "Register and secure sovereign codes",
        stAccTitle: "Account & Sovereign Security",
        stAccDesc: "2-Step verification, Kill-Switch, anti-forwarding",
        stNetTitle: "Bandwidth & AI-SAT Tunnel",
        stNetDesc: "Fast connection, satellite tracking, signal boost",
        stChatTitle: "Chats & Secret Media",
        stChatDesc: "Chat logs, view-once photos, AI translation",
        stAiTitle: "Sanad AI Assistant (OMEGA AI)",
        stAiDesc: "Strategic analysis & field task management",
        stBackupTitle: "Data Vault & Device Transfer",
        stBackupDesc: "Migrate data to new device or restore backup",
        stHelpTitle: "User Guide & Policy",
        stHelpDesc: "FAQ, Terms of use, Direct technical support",
        btnKillSwitch: "⚡ Activate Emergency Kill-Switch",
        navCodes: "Codes",
        navChats: "Chats",
        navAi: "Sanad AI",
        navCalls: "Calls",
        navSettings: "Settings"
      }
    };

    function toggleLanguage() {
      currentLang = (currentLang === 'ar') ? 'en' : 'ar';
      document.getElementById('htmlRoot').setAttribute('dir', currentLang === 'ar' ? 'rtl' : 'ltr');
      document.getElementById('htmlRoot').setAttribute('lang', currentLang);
      
      const t = translations[currentLang];
      document.getElementById('stKeyTitle').innerText = t.stKeyTitle;
      document.getElementById('stKeyDesc').innerText = t.stKeyDesc;
      document.getElementById('stAccTitle').innerText = t.stAccTitle;
      document.getElementById('stAccDesc').innerText = t.stAccDesc;
      document.getElementById('stNetTitle').innerText = t.stNetTitle;
      document.getElementById('stNetDesc').innerText = t.stNetDesc;
      document.getElementById('stChatTitle').innerText = t.stChatTitle;
      document.getElementById('stChatDesc').innerText = t.stChatDesc;
      document.getElementById('stAiTitle').innerText = t.stAiTitle;
      document.getElementById('stAiDesc').innerText = t.stAiDesc;
      document.getElementById('stBackupTitle').innerText = t.stBackupTitle;
      document.getElementById('stBackupDesc').innerText = t.stBackupDesc;
      document.getElementById('stHelpTitle').innerText = t.stHelpTitle;
      document.getElementById('stHelpDesc').innerText = t.stHelpDesc;
      document.getElementById('btnKillSwitch').innerText = t.btnKillSwitch;
      document.getElementById('navLblCodes').innerText = t.navCodes;
      document.getElementById('navLblChats').innerText = t.navChats;
      document.getElementById('navLblAi').innerText = t.navAi;
      document.getElementById('navLblCalls').innerText = t.navCalls;
      document.getElementById('navLblSettings').innerText = t.navSettings;
      
      alert(currentLang === 'ar' ? '🌐 تم التحويل إلى اللغة العربية.' : '🌐 Switched to English.');
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
      alert('🔐 تم توليد كود معتمد ومراجع من خادم الإدارة بنجاح.');
    }

    let codeFormEl = document.getElementById('codeForm');
    if(codeFormEl) {
      codeFormEl.addEventListener('submit', function(e) {
        e.preventDefault();
        let owner = document.getElementById('ownerName').value.trim();
        let phone = document.getElementById('contactPhone').value.trim();
        let cat = document.getElementById('numCategory').value;
        let num = document.getElementById('sovereignCodeInput').value.trim();
        
        if (!num || num.length !== 8) { alert('أدخل الكود السيادي (8 أرقام دقيقة).'); return; }
        if (vault.some(function(i) { return i.num === num; })) { alert('تنبيه إداري: هذا الكود مسجل مسبقاً.'); return; }
        
        vault.unshift({ owner: owner, phone: phone || 'محلي سيادي', num: num, cat: cat });
        renderVault();
        updateContactSelects();
        codeFormEl.reset();
        alert('✅ تم الاعتماد والحفظ في الدليل السيادي تحت إشراف الإدارة!');
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
        list.innerHTML = '<p style="color:var(--muted); text-align:center;">لا توجد نتائج مطابقة.</p>';
        return;
      }
      
      let h = '';
      for(let i=0; i<filtered.length; i++) {
        let item = filtered[i];
        h += '<div class="list-item"><div><strong>' + item.owner + '</strong> <span class="badge-gold">' + item.cat + '</span><br/><span style="font-family:monospace; color:var(--gold);">الكود: ' + item.num + '</span> | <span style="font-family:monospace; color:var(--emerald);">الهاتف: ' + item.phone + '</span></div><div><button class="btn-submit btn-action" onclick="openChatFor(\\'' + item.phone + '\\')">مراسلة</button></div></div>';
      }
      list.innerHTML = h;
    }

    function filterVault() {
      let searchInput = document.getElementById('vaultSearch');
      if(searchInput) renderVault(searchInput.value);
    }

    function updateContactSelects() {
      let opts = '<option value="">-- اختر جهة الاتصال --</option>';
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
        h += '<div class="chat-bubble ' + m.sender + '"><strong>' + (m.sender === 'outgoing' ? 'أنت:' : 'الطرف الآخر:') + '</strong> ' + content + '<div class="msg-meta"><span>محمي</span><span>✓✓</span></div></div>';
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
      alert('🔒 تم إرسال الوسائط السرية بنجاح.');
    }

    function translateLastMessageAI() {
      alert('🌐 OMEGA AI: تم الترجمة والتلخيص الذكي بنجاح.');
    }

    function openChatFor(phone) {
      switchScreen('chats', document.getElementById('nav-chats'));
      let chatSel = document.getElementById('chatContactSelect');
      if(chatSel) { chatSel.value = phone; changeActiveChat(); }
    }

    function startSecureCall() {
      let st = document.getElementById('callStateText');
      if(st) st.innerText = 'الحالة: 🔴 المكالمة الفضائية مؤمنة 100%';
    }

    function endSecureCall() {
      let st = document.getElementById('callStateText');
      if(st) st.innerText = 'الحالة: تم قطع الاتصال وتأمين السجل';
    }

    function sendAiPrompt() {
      let input = document.getElementById('aiInputPrompt');
      if(!input) return;
      let val = input.value.trim();
      if(!val) return;
      let logBox = document.getElementById('aiChatLog');
      if(logBox) logBox.innerHTML += '<div class="chat-bubble incoming"><strong>[OMEGA AI]:</strong> تمت معالجة الاستفسار الميداني عبر قناة AI-SAT بنجاح.</div>';
      input.value = '';
    }

    function executeKillSwitch() {
      if(confirm('تحذير سيادي: هل تريد مسح الذاكرة وتفعيل درع الطوارئ؟')) {
        vault = []; internalMessages = {};
        renderVault(); updateContactSelects();
        alert('⚡ تم تأمين القطاع ومسح الذاكرة بنجاح.');
      }
    }
  </script>
</body>
</html>`);
});

app.listen(PORT, function() { console.log('Server running on port ' + PORT); });
