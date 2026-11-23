const http = require('http');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;

const htmlContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>سند للذكاء الاصطناعي • Sanad AI v8.6</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
    body {
      font-family: 'Cairo', sans-serif;
      background: radial-gradient(circle at top, #0f2142 0%, #060b16 60%, #03060c 100%);
      color: #f1f5f9;
      margin: 0;
      height: 100dvh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .tab-pane {
      display: none;
      height: 100%;
      width: 100%;
      overflow-y: auto;
    }
    .tab-pane.active-pane {
      display: flex;
      flex-direction: column;
    }
    .nav-item-btn {
      cursor: pointer;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
    }
  </style>
</head>
<body>

  <!-- الشريط العلوي -->
  <header class="bg-slate-900/95 border-b border-slate-800 px-3.5 py-2.5 flex items-center justify-between shrink-0">
    <div class="flex items-center gap-2.5 min-w-0">
      <div class="w-10 h-10 rounded-2xl bg-blue-700 border border-blue-400/40 flex items-center justify-center font-black text-lg text-white shrink-0">
        S
      </div>
      <div class="min-w-0">
        <div class="flex items-center gap-1.5 flex-wrap">
          <h1 class="font-black text-sm sm:text-base text-white leading-none">سند للذكاء الاصطناعي</h1>
          <span class="text-[10px] bg-blue-500/20 text-blue-200 border border-blue-400/30 px-2 py-0.5 rounded-full font-bold">AI v8.6</span>
        </div>
        <div class="flex items-center gap-1.5 text-[11px] mt-1">
          <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span id="conn-status-text" class="text-emerald-400 font-semibold">متصل</span>
          <span class="text-slate-600">•</span>
          <span id="active-account-badge" class="text-blue-300 font-bold">حساب سند</span>
          <span class="text-slate-600">•</span>
          <span id="active-tab-title" class="text-amber-300 font-bold">الدردشة</span>
        </div>
      </div>
    </div>

    <div class="flex items-center gap-1.5 shrink-0">
      <button type="button" onclick="openTab('calls')" title="مكالمة صوتية" class="w-9 h-9 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center">
        <i class="fa-solid fa-phone text-xs"></i>
      </button>
      <button type="button" onclick="openTab('calls')" title="مكالمة فيديو" class="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-300 flex items-center justify-center">
        <i class="fa-solid fa-video text-xs"></i>
      </button>
    </div>
  </header>

  <!-- شريط الأخبار والتنبيه الذكي -->
  <div class="bg-blue-950/60 border-b border-blue-800/40 px-3 py-1.5 text-[11px] text-blue-100 shrink-0 truncate">
    <i class="fa-solid fa-bolt text-amber-300 ml-1"></i>
    <span>سند AI: منصة متكاملة للمراسلة، المجموعات، الحسابات، الجهات، المكالمات، والذكاء الاصطناعي.</span>
  </div>

  <!-- حاوية الأقسام -->
  <main class="flex-1 min-h-0 relative overflow-hidden">

    <!-- 1. الدردشة -->
    <section id="pane-chats" class="tab-pane active-pane">
      <div class="p-2.5 bg-slate-900/70 border-b border-slate-800 flex gap-2 shrink-0">
        <input id="peer-search-input" type="text" placeholder="ابحث بالاسم أو الكود أو الرقم..." class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500" />
        <button type="button" onclick="selectPeerFromSearch()" class="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold">فتح</button>
      </div>

      <div class="px-4 py-2 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between text-xs shrink-0">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-indigo-400"></span>
          <span id="chat-peer-name" class="font-bold text-white">سند AI</span>
          <span class="text-indigo-300 text-[11px]">مساعد ذكي</span>
        </div>
        <button type="button" onclick="clearChatMessages()" class="text-red-400 hover:text-red-300 text-xs font-semibold">
          <i class="fa-solid fa-trash ml-1"></i>مسح
        </button>
      </div>

      <div id="chat-messages-list" class="flex-1 overflow-y-auto p-4 space-y-3">
        <div class="flex justify-start">
          <div class="bg-slate-900 border border-slate-800 text-slate-200 p-3 rounded-2xl rounded-tr-none max-w-md text-xs sm:text-sm">
            أهلاً بك في سند للذكاء الاصطناعي. اكتب رسالتك أو انتقل إلى أي تبويب بالأسفل للتجربة.
          </div>
        </div>
      </div>

      <div class="p-2.5 bg-slate-900/90 border-t border-slate-800 flex items-center gap-2 shrink-0">
        <input id="chat-message-input" type="text" onkeydown="if(event.key==='Enter'){event.preventDefault();sendChatMessage();}" placeholder="اكتب رسالتك هنا..." class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500" />
        <button type="button" onclick="sendChatMessage()" class="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-bold">
          <i class="fa-solid fa-paper-plane"></i>
        </button>
      </div>
    </section>

    <!-- 2. المجموعات -->
    <section id="pane-groups" class="tab-pane p-4 space-y-3">
      <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-black text-cyan-400"><i class="fa-solid fa-users ml-1"></i> مجموعات التواصل</h2>
          <span id="groups-count" class="text-xs font-mono bg-cyan-950 text-cyan-300 px-2.5 py-0.5 rounded-full">0 مجموعة</span>
        </div>
        <p class="text-xs text-slate-400">أنشئ مجموعة جديدة واختر الأعضاء أو تواصل بمساعدة سند الذكي.</p>
        <input id="new-group-name" type="text" placeholder="اسم المجموعة (مثال: فريق العمل)" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
        <button type="button" onclick="createGroupItem()" class="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-xl text-xs font-bold">+ إنشاء مجموعة</button>
        <div id="groups-items-box" class="space-y-2 pt-2"></div>
      </div>
    </section>

    <!-- 3. الحسابات -->
    <section id="pane-accounts" class="tab-pane p-4 space-y-3">
      <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-black text-blue-400"><i class="fa-solid fa-id-card ml-1"></i> إدارة الحسابات والمعرّفات</h2>
          <span id="accounts-count" class="text-xs font-mono bg-blue-950 text-blue-300 px-2.5 py-0.5 rounded-full">1 حساب</span>
        </div>
        <p class="text-xs text-slate-400">ولّد معرّفاً جديداً من 8 أرقام أو أضف حساباً مخصصاً للتبديل الفوري.</p>
        <div class="flex flex-wrap gap-2">
          <button type="button" onclick="generateNewAccountId()" class="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold">+ توليد معرّف (8 أرقام)</button>
          <button type="button" onclick="addCustomAccountPrompt()" class="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold">+ إضافة حساب</button>
        </div>
        <div id="accounts-items-box" class="space-y-2 pt-2"></div>
      </div>
    </section>

    <!-- 4. الجهات -->
    <section id="pane-contacts" class="tab-pane p-4 space-y-3">
      <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-black text-emerald-400"><i class="fa-solid fa-address-book ml-1"></i> جهات الاتصال</h2>
          <span id="contacts-count" class="text-xs font-mono bg-emerald-950 text-emerald-300 px-2.5 py-0.5 rounded-full">2 جهة</span>
        </div>
        <div class="flex flex-col sm:flex-row gap-2">
          <input id="contact-name-input" type="text" placeholder="الاسم" class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
          <input id="contact-id-input" type="text" placeholder="معرّف أو رقم الجوال" class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono" />
          <button type="button" onclick="addContactItem()" class="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold">حفظ</button>
        </div>
        <div id="contacts-items-box" class="space-y-2 pt-2"></div>
      </div>
    </section>

    <!-- 5. المكالمات -->
    <section id="pane-calls" class="tab-pane p-4 space-y-3">
      <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 text-center">
        <div class="w-14 h-14 mx-auto rounded-2xl bg-blue-600/15 border border-blue-500/30 text-blue-400 flex items-center justify-center text-2xl">
          <i class="fa-solid fa-phone-volume"></i>
        </div>
        <div>
          <h2 class="text-base font-black text-white">المكالمات الصوتية والمرئية</h2>
          <p class="text-xs text-slate-400 mt-1">أدخل الاسم أو الرقم أو المعرّف لبدء الاتصال الصوتي أو المرئي.</p>
        </div>
        <input id="call-target-input" type="text" placeholder="اكتب الاسم أو الرقم أو المعرّف..." class="w-full max-w-md mx-auto bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-center text-white" />
        <div class="flex gap-3 justify-center">
          <button type="button" onclick="triggerCallAction('صوتية')" class="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold">
            <i class="fa-solid fa-phone ml-1"></i> مكالمة صوتية
          </button>
          <button type="button" onclick="triggerCallAction('فيديو')" class="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold">
            <i class="fa-solid fa-video ml-1"></i> مكالمة فيديو
          </button>
        </div>
        <p id="call-feedback-msg" class="text-xs text-emerald-300 font-semibold min-h-[20px]"></p>
      </div>
    </section>

    <!-- 6. الذكاء -->
    <section id="pane-ai" class="tab-pane p-4 space-y-3">
      <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
        <h2 class="text-sm font-black text-indigo-400"><i class="fa-solid fa-brain ml-1"></i> سند للذكاء الاصطناعي (AI)</h2>
        <div id="ai-chat-history" class="bg-slate-950 border border-slate-800 rounded-xl p-3 h-44 overflow-y-auto text-xs space-y-2">
          <div class="text-slate-300">مرحباً بك في مساعد سند الذكي. اسأل عن التلخيص أو تنظيم المهام أو إدارة الحسابات.</div>
        </div>
        <div class="flex gap-2">
          <input id="ai-prompt-input" type="text" onkeydown="if(event.key==='Enter'){event.preventDefault();runAiPrompt();}" placeholder="اسأل سند AI..." class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white" />
          <button type="button" onclick="runAiPrompt()" class="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold">إرسال</button>
        </div>
      </div>
    </section>

  </main>

  <!-- شريط التنقل السفلي -->
  <nav id="bottom-tabs-nav" class="bg-slate-900/95 border-t border-slate-800 px-1 py-2 flex justify-around items-center shrink-0">
    <button type="button" id="tab-btn-chats" onclick="openTab('chats')" class="nav-item-btn flex flex-col items-center gap-1 text-blue-400 font-bold text-[10px] px-2 py-1">
      <i class="fa-solid fa-comments text-base"></i>
      <span>الدردشة</span>
    </button>
    <button type="button" id="tab-btn-groups" onclick="openTab('groups')" class="nav-item-btn flex flex-col items-center gap-1 text-slate-400 font-semibold text-[10px] px-2 py-1">
      <i class="fa-solid fa-users text-base"></i>
      <span>المجموعات</span>
    </button>
    <button type="button" id="tab-btn-accounts" onclick="openTab('accounts')" class="nav-item-btn flex flex-col items-center gap-1 text-slate-400 font-semibold text-[10px] px-2 py-1">
      <i class="fa-solid fa-id-card text-base"></i>
      <span>الحسابات</span>
    </button>
    <button type="button" id="tab-btn-contacts" onclick="openTab('contacts')" class="nav-item-btn flex flex-col items-center gap-1 text-slate-400 font-semibold text-[10px] px-2 py-1">
      <i class="fa-solid fa-address-book text-base"></i>
      <span>الجهات</span>
    </button>
    <button type="button" id="tab-btn-calls" onclick="openTab('calls')" class="nav-item-btn flex flex-col items-center gap-1 text-slate-400 font-semibold text-[10px] px-2 py-1">
      <i class="fa-solid fa-phone-volume text-base"></i>
      <span>المكالمات</span>
    </button>
    <button type="button" id="tab-btn-ai" onclick="openTab('ai')" class="nav-item-btn flex flex-col items-center gap-1 text-slate-400 font-semibold text-[10px] px-2 py-1">
      <i class="fa-solid fa-brain text-base"></i>
      <span>الذكاء</span>
    </button>
  </nav>

  <script>
    const TAB_NAMES = {
      chats: 'الدردشة',
      groups: 'المجموعات',
      accounts: 'الحسابات',
      contacts: 'الجهات',
      calls: 'المكالمات',
      ai: 'الذكاء'
    };

    let currentTab = 'chats';
    let activeAccount = 'حساب سند';
    let accountsList = ['حساب سند'];
    let groupsList = [];
    let contactsList = [
      { name: 'سند AI', id: 'سند AI' },
      { name: 'خدمة العملاء', id: 'خدمة العملاء' }
    ];

    function openTab(tabKey) {
      const target = TAB_NAMES[tabKey] ? tabKey : 'chats';
      currentTab = target;

      const titleEl = document.getElementById('active-tab-title');
      if (titleEl) titleEl.textContent = TAB_NAMES[target];

      const panes = document.querySelectorAll('.tab-pane');
      panes.forEach((pane) => {
        const isMatch = pane.id === 'pane-' + target;
        pane.classList.toggle('active-pane', isMatch);
        pane.style.display = isMatch ? 'flex' : 'none';
      });

      Object.keys(TAB_NAMES).forEach((key) => {
        const btn = document.getElementById('tab-btn-' + key);
        if (!btn) return;
        const selected = key === target;
        btn.classList.toggle('text-blue-400', selected);
        btn.classList.toggle('font-bold', selected);
        btn.classList.toggle('text-slate-400', !selected);
        btn.classList.toggle('font-semibold', !selected);
      });

      if (target === 'groups') renderGroups();
      if (target === 'accounts') renderAccounts();
      if (target === 'contacts') renderContacts();
    }

    function sendChatMessage() {
      const input = document.getElementById('chat-message-input');
      const list = document.getElementById('chat-messages-list');
      if (!input || !list) return;
      const text = input.value.trim();
      if (!text) return;

      list.innerHTML += '<div class="flex justify-end"><div class="bg-blue-600 text-white p-3 rounded-2xl rounded-tl-none max-w-md text-xs sm:text-sm">' + escapeHtml(text) + '</div></div>';
      input.value = '';

      const reply = 'تم استلام رسالتك: «' + text + '». مساعد سند جاهز لأي استفسار أو مهمة.';
      list.innerHTML += '<div class="flex justify-start"><div class="bg-slate-900 border border-slate-800 text-slate-200 p-3 rounded-2xl rounded-tr-none max-w-md text-xs sm:text-sm">' + escapeHtml(reply) + '</div></div>';
      list.scrollTop = list.scrollHeight;
    }

    function clearChatMessages() {
      const list = document.getElementById('chat-messages-list');
      if (list) {
        list.innerHTML = '<div class="text-center text-xs text-slate-500 py-6">تم مسح سجل المحادثة الحالية.</div>';
      }
    }

    function selectPeerFromSearch() {
      const input = document.getElementById('peer-search-input');
      const peerLabel = document.getElementById('chat-peer-name');
      if (!input || !peerLabel) return;
      const val = input.value.trim();
      if (val) {
        peerLabel.textContent = val;
        input.value = '';
      }
      openTab('chats');
    }

    function createGroupItem() {
      const input = document.getElementById('new-group-name');
      if (!input) return;
      const name = input.value.trim();
      if (!name) return;
      groupsList.unshift({ id: 'grp-' + Math.floor(100000 + Math.random() * 900000), name });
      input.value = '';
      renderGroups();
    }

    function renderGroups() {
      const box = document.getElementById('groups-items-box');
      const badge = document.getElementById('groups-count');
      if (badge) badge.textContent = groupsList.length + (groupsList.length === 1 ? ' مجموعة' : ' مجموعات');
      if (!box) return;
      if (!groupsList.length) {
        box.innerHTML = '<div class="text-xs text-slate-500 py-3">لا توجد مجموعات حالياً. اكتب اسماً واضغط «+ إنشاء مجموعة».</div>';
        return;
      }
      box.innerHTML = groupsList.map((g) => (
        '<div class="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs">' +
        '<div><p class="font-bold text-white">' + escapeHtml(g.name) + '</p><p class="font-mono text-[10px] text-slate-400">' + escapeHtml(g.id) + '</p></div>' +
        '<button type="button" onclick="openGroupInChat(\'' + escapeHtml(g.name) + '\')" class="bg-cyan-600 text-white px-3 py-1.5 rounded-lg font-bold">دخول</button>' +
        '</div>'
      )).join('');
    }

    function openGroupInChat(groupName) {
      const peerLabel = document.getElementById('chat-peer-name');
      if (peerLabel) peerLabel.textContent = groupName;
      openTab('chats');
    }

    function generateNewAccountId() {
      const code = String(Math.floor(10000000 + Math.random() * 90000000));
      if (!accountsList.includes(code)) accountsList.push(code);
      activeAccount = code;
      updateAccountBadge();
      renderAccounts();
    }

    function addCustomAccountPrompt() {
      const val = prompt('أدخل اسم أو رقم الحساب الجديد:');
      if (!val || !val.trim()) return;
      const clean = val.trim();
      if (!accountsList.includes(clean)) accountsList.push(clean);
      activeAccount = clean;
      updateAccountBadge();
      renderAccounts();
    }

    function switchActiveAccount(acc) {
      activeAccount = acc;
      updateAccountBadge();
      renderAccounts();
    }

    function updateAccountBadge() {
      const badge = document.getElementById('active-account-badge');
      if (badge) badge.textContent = activeAccount;
    }

    function renderAccounts() {
      const box = document.getElementById('accounts-items-box');
      const countEl = document.getElementById('accounts-count');
      if (countEl) countEl.textContent = accountsList.length + (accountsList.length === 1 ? ' حساب' : ' حسابات');
      if (!box) return;
      box.innerHTML = accountsList.map((acc) => {
        const isAct = acc === activeAccount;
        return '<div onclick="switchActiveAccount(\'' + escapeHtml(acc) + '\')" class="bg-slate-950 border ' + (isAct ? 'border-blue-500' : 'border-slate-800') + ' rounded-xl p-3 flex items-center justify-between cursor-pointer text-xs">' +
          '<span class="font-mono font-bold text-white">' + escapeHtml(acc) + '</span>' +
          '<span class="' + (isAct ? 'text-emerald-400 font-bold' : 'text-slate-400') + '">' + (isAct ? 'نشط' : 'تبديل') + '</span>' +
          '</div>';
      }).join('');
    }

    function addContactItem() {
      const nameInp = document.getElementById('contact-name-input');
      const idInp = document.getElementById('contact-id-input');
      if (!nameInp || !idInp) return;
      const name = nameInp.value.trim();
      const id = idInp.value.trim();
      if (!name || !id) return;
      contactsList.unshift({ name, id });
      nameInp.value = '';
      idInp.value = '';
      renderContacts();
    }

    function renderContacts() {
      const box = document.getElementById('contacts-items-box');
      const countEl = document.getElementById('contacts-count');
      if (countEl) countEl.textContent = contactsList.length + ' جهة';
      if (!box) return;
      box.innerHTML = contactsList.map((c) => (
        '<div class="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs">' +
        '<div><p class="font-bold text-white">' + escapeHtml(c.name) + '</p><p class="font-mono text-[11px] text-slate-400">' + escapeHtml(c.id) + '</p></div>' +
        '<button type="button" onclick="openContactInChat(\'' + escapeHtml(c.name) + '\')" class="bg-blue-600 text-white px-3 py-1.5 rounded-lg font-bold">مراسلة</button>' +
        '</div>'
      )).join('');
    }

    function openContactInChat(name) {
      const peerLabel = document.getElementById('chat-peer-name');
      if (peerLabel) peerLabel.textContent = name;
      openTab('chats');
    }

    function triggerCallAction(kind) {
      const inp = document.getElementById('call-target-input');
      const msg = document.getElementById('call-feedback-msg');
      const target = (inp && inp.value.trim()) ? inp.value.trim() : 'سند AI';
      if (msg) msg.textContent = 'جاري تجهيز مكالمة ' + kind + ' مع: ' + target;
    }

    function runAiPrompt() {
      const inp = document.getElementById('ai-prompt-input');
      const log = document.getElementById('ai-chat-history');
      if (!inp || !log) return;
      const q = inp.value.trim();
      if (!q) return;
      log.innerHTML += '<div class="text-blue-300 font-semibold">أنت: ' + escapeHtml(q) + '</div>';
      log.innerHTML += '<div class="text-slate-200 bg-slate-900 p-2 rounded-lg">سند AI: تم تحليل طلبك «' + escapeHtml(q) + '». جميع تبويبات البرنامج جاهزة وتعمل بشكل فوري.</div>';
      inp.value = '';
      log.scrollTop = log.scrollHeight;
    }

    function escapeHtml(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    openTab('chats');
  </script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  if (req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, version: 'Sanad AI v8.6' }));
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(htmlContent);
});

const wss = new WebSocketServer({ server });
wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'welcome', version: 'Sanad AI v8.6' }));
});

server.listen(PORT, () => {
  console.log('Sanad AI v8.6 server listening on port ' + PORT);
});
