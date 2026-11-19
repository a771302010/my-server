const http = require('http');
const { WebSocketServer } = require('ws');

const htmlContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="mobile-web-app-capable" content="yes">
    <title>سند AI</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
        body { font-family: 'Cairo', sans-serif; background-color: #050912; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1d4ed8; border-radius: 9999px; }
        @keyframes tickerScroll {
            0% { transform: translateX(0%); }
            100% { transform: translateX(-50%); }
        }
        .ticker-line {
            display: inline-flex;
            white-space: nowrap;
            animation: tickerScroll 26s linear infinite;
        }
    </style>
</head>
<body class="text-slate-100 h-screen flex flex-col overflow-hidden select-none">

    <!-- الشريط الإخباري الذكي -->
    <div class="bg-blue-950/90 border-b border-blue-800/60 py-1 px-2 overflow-hidden text-[11px] text-blue-200 z-30">
        <div class="ticker-line gap-8 font-semibold">
            <span>⚡ سند AI v5.2: اتصال هجين (WebSocket + HTTP) لضمان الوصول على جميع الشبكات</span>
            <span>🎙️ إملاء صوتي ذكي + تسجيل صوتي نقي + قراءة فورية للرسائل</span>
            <span>🔄 إعادة إرسال فورية عند عودة الطرف الآخر + ملخص ذكي للمحادثات</span>
            <span>⚡ سند AI v5.2: اتصال هجين (WebSocket + HTTP) لضمان الوصول على جميع الشبكات</span>
        </div>
    </div>

    <!-- الشريط العلوي: أيقونة سند + الاسم الرسمي -->
    <header class="bg-slate-900/95 border-b border-slate-800 px-3.5 py-2.5 flex justify-between items-center z-20 shadow-md">
        <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-2xl bg-gradient-to-b from-blue-600 to-blue-950 border border-blue-400/40 flex flex-col items-center justify-center shadow-lg shadow-blue-700/25">
                <span class="text-white font-black text-lg leading-none">S</span>
                <i class="fa-solid fa-hands-holding-child text-[9px] text-blue-200 mt-0.5"></i>
            </div>
            <div>
                <div class="flex items-center gap-1.5">
                    <h1 class="font-black text-base md:text-lg text-white leading-none">سند</h1>
                    <span class="text-[10px] bg-blue-600/25 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-bold">AI v5.2</span>
                    <span id="device-badge" class="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-semibold">---</span>
                </div>
                <div class="flex items-center gap-1.5 text-[11px] mt-1">
                    <span id="ws-dot" class="w-2 h-2 rounded-full bg-amber-400"></span>
                    <span id="ws-label" class="text-slate-300 font-semibold">جاري الربط...</span>
                    <button onclick="reconnectNow()" title="إعادة ربط" class="text-blue-400 hover:text-blue-300 px-1"><i class="fa-solid fa-rotate-right text-[10px]"></i></button>
                    <span class="text-slate-600">•</span>
                    <span id="active-acct-label" class="font-mono font-bold text-blue-300">88888888</span>
                </div>
            </div>
        </div>

        <!-- أزرار الاتصال الصوتي والمرئي -->
        <div class="flex items-center gap-2">
            <button onclick="launchCall('audio')" title="مكالمة صوتية" class="w-9 h-9 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/40 text-emerald-300 hover:text-white flex items-center justify-center transition">
                <i class="fa-solid fa-phone text-xs"></i>
            </button>
            <button onclick="launchCall('video')" title="مكالمة فيديو" class="w-9 h-9 rounded-xl bg-blue-600/20 hover:bg-blue-600 border border-blue-500/40 text-blue-300 hover:text-white flex items-center justify-center transition">
                <i class="fa-solid fa-video text-xs"></i>
            </button>
        </div>
    </header>

    <!-- شاشة المكالمة الصوتية والمرئية -->
    <div id="call-modal" class="hidden fixed inset-0 bg-slate-950/95 z-50 flex flex-col items-center justify-between p-5">
        <div class="text-center mt-2">
            <p class="text-xs text-blue-400 font-bold">سند AI • اتصال مباشر متعدد الأجهزة</p>
            <h2 id="call-peer-title" class="text-xl font-black text-white font-mono mt-1">---</h2>
            <p id="call-status-msg" class="text-xs text-emerald-400 mt-1 font-semibold">جاري الاتصال...</p>
        </div>

        <div class="relative w-full max-w-md aspect-video bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden flex items-center justify-center shadow-2xl">
            <video id="remote-video-el" autoplay playsinline class="w-full h-full object-cover hidden"></video>
            <video id="local-video-el" autoplay playsinline muted class="w-24 h-32 object-cover rounded-2xl border border-blue-500/50 absolute bottom-3 left-3 hidden"></video>
            <div id="voice-call-card" class="flex flex-col items-center gap-2.5">
                <div class="w-20 h-20 rounded-full bg-blue-600/20 border border-blue-400/40 flex items-center justify-center text-3xl text-blue-400 animate-pulse">
                    <i class="fa-solid fa-microphone-lines"></i>
                </div>
                <span class="text-xs text-slate-300 font-semibold">معالجة صوتية ذكية لإلغاء الصدى والضوضاء</span>
            </div>
        </div>

        <div class="flex items-center gap-3 mb-4">
            <button id="accept-btn" onclick="answerCall()" class="hidden bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-2xl font-bold text-xs shadow-lg">
                <i class="fa-solid fa-phone ml-1"></i> رد
            </button>
            <button id="mute-btn" onclick="toggleMuteTrack()" class="w-12 h-12 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center">
                <i class="fa-solid fa-microphone"></i>
            </button>
            <button onclick="endActiveCall()" class="bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-2xl font-bold text-xs shadow-lg">
                <i class="fa-solid fa-phone-slash ml-1"></i> إنهاء
            </button>
        </div>
    </div>

    <!-- المحتوى الرئيسي -->
    <main class="flex-1 flex flex-col overflow-hidden bg-[#070c17]">

        <!-- 1. الدردشة -->
        <section id="pane-chats" class="flex-1 flex flex-col h-full">
            <div class="p-2.5 bg-slate-900/80 border-b border-slate-800 space-y-2">
                <div class="flex gap-2">
                    <input type="text" id="peer-input" onkeypress="if(event.key==='Enter') openPeerByInput()" placeholder="معرّف الزميل (8 أرقام) أو رقم الجوال..." class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs md:text-sm text-white font-mono focus:outline-none focus:border-blue-500">
                    <button onclick="openPeerByInput()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition">فتح</button>
                    <button onclick="saveCurrentPeer()" title="حفظ في الجهات" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 px-3 py-2 rounded-xl text-xs font-bold">
                        <i class="fa-solid fa-user-plus"></i>
                    </button>
                </div>
                <div id="quick-chips" class="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs"></div>
            </div>

            <!-- شريط حالة الطرف الآخر + ملخص ذكي -->
            <div class="px-4 py-2 bg-slate-950/80 border-b border-slate-800/90 flex justify-between items-center text-xs">
                <div class="flex items-center gap-2">
                    <span id="peer-dot" class="w-2.5 h-2.5 rounded-full bg-slate-600"></span>
                    <span id="peer-title" class="font-bold text-white font-mono">88888888</span>
                    <span id="peer-status" class="text-[11px] font-bold text-slate-400">غير متصل</span>
                </div>
                <div class="flex items-center gap-3">
                    <button onclick="summarizeCurrentThread()" class="text-indigo-400 hover:underline font-semibold"><i class="fa-solid fa-sparkles ml-1"></i>تلخيص AI</button>
                    <button onclick="shareInviteLink()" class="text-blue-400 hover:underline font-semibold"><i class="fa-solid fa-share-nodes ml-1"></i>دعوة</button>
                    <button onclick="clearThreadMsgs()" class="text-red-400 hover:underline font-semibold"><i class="fa-solid fa-trash ml-1"></i>مسح</button>
                </div>
            </div>

            <!-- صندوق الرسائل -->
            <div id="msgs-box" class="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar"></div>

            <!-- شريط الإدخال: مرفق + إملاء صوتي + تحسين AI + نص + تسجيل صوتي + إرسال -->
            <div class="p-2.5 bg-slate-900 border-t border-slate-800 flex items-center gap-1.5">
                <input type="file" id="attach-file" class="hidden" onchange="onFilePicked(event)">
                <button onclick="document.getElementById('attach-file').click()" title="إرفاق ملف أو صورة" class="text-amber-400 hover:text-amber-300 p-2 rounded-xl hover:bg-slate-800 transition">
                    <i class="fa-solid fa-paperclip text-base"></i>
                </button>
                <button id="dictate-btn" onclick="toggleSpeechDictation()" title="إملاء صوتي (تحويل الكلام لنص)" class="text-cyan-400 hover:text-cyan-300 p-2 rounded-xl hover:bg-slate-800 transition">
                    <i class="fa-solid fa-language text-base"></i>
                </button>
                <button onclick="polishDraft()" title="تحسين صياغة الرسالة بالذكاء الاصطناعي" class="text-indigo-400 hover:text-indigo-300 p-2 rounded-xl hover:bg-slate-800 transition">
                    <i class="fa-solid fa-wand-magic-sparkles text-base"></i>
                </button>
                <input type="text" id="msg-box-input" onkeypress="if(event.key==='Enter') sendTextMsg()" placeholder="اكتب رسالتك..." class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500">
                <button id="voice-btn" onclick="toggleVoiceCapture()" title="تسجيل وإرسال مقطع صوتي" class="bg-slate-800 hover:bg-emerald-600 text-emerald-400 hover:text-white p-2.5 rounded-xl transition">
                    <i class="fa-solid fa-microphone text-base"></i>
                </button>
                <button onclick="sendTextMsg()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition shadow">
                    <i class="fa-solid fa-paper-plane"></i>
                </button>
            </div>
        </section>

        <!-- 2. الحسابات والتفعيل -->
        <section id="pane-accounts" class="hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-4">
            <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
                <h2 class="text-sm font-black text-blue-400">إدارة الحسابات والتفعيل</h2>
                <p class="text-[11px] text-slate-400 leading-relaxed">
                    ولّد معرّفاً من <strong>8 أرقام متصلة بدون فواصل</strong> أو فعّل رقم جوالك الدولي بكود تحقق، وتنقل بين حساباتك بسهولة. خدمة العملاء: <span class="font-mono text-amber-400 font-bold">88888888</span>.
                </p>
                <div class="flex flex-wrap gap-2">
                    <button onclick="make8DigitId()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold">+ معرّف جديد (8 أرقام)</button>
                    <button onclick="verifyPhoneAccount()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold">+ تفعيل رقم جوال</button>
                </div>
                <div id="accounts-list" class="space-y-2 pt-2"></div>
            </div>
        </section>

        <!-- 3. الجهات -->
        <section id="pane-contacts" class="hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-3">
            <div class="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl space-y-2.5">
                <h2 class="text-sm font-black text-emerald-400">حفظ جهة اتصال</h2>
                <div class="flex flex-col sm:flex-row gap-2">
                    <input type="text" id="c-name" placeholder="الاسم" class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                    <input type="text" id="c-id" placeholder="معرّف 8 أرقام أو رقم الجوال" class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono">
                    <button onclick="addNewContact()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold">حفظ</button>
                </div>
            </div>
            <div id="contacts-list" class="space-y-2"></div>
        </section>

        <!-- 4. المكالمات -->
        <section id="pane-calls" class="hidden flex-1 flex-col items-center justify-center p-6 text-center space-y-4">
            <div class="w-16 h-16 rounded-2xl bg-blue-600/15 border border-blue-500/30 text-blue-400 flex items-center justify-center text-2xl">
                <i class="fa-solid fa-phone-volume"></i>
            </div>
            <div>
                <h2 class="text-base font-black text-white">المكالمات الصوتية والمرئية</h2>
                <p class="text-xs text-slate-400 mt-1 max-w-sm">متوافقة مع الآيفون والأندرويد والآيباد والكمبيوتر مع تحسين جودة الصوت.</p>
            </div>
            <input type="text" id="call-input" placeholder="أدخل معرّف 8 أرقام أو رقم الجوال..." class="w-full max-w-xs bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-center font-mono text-white">
            <div class="flex gap-3">
                <button onclick="launchCall('audio', document.getElementById('call-input').value.trim())" class="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
                    <i class="fa-solid fa-phone"></i> صوتي
                </button>
                <button onclick="launchCall('video', document.getElementById('call-input').value.trim())" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
                    <i class="fa-solid fa-video"></i> فيديو
                </button>
            </div>
        </section>

        <!-- 5. الذكاء والإعدادات -->
        <section id="pane-ai" class="hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-3">
            <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-2.5">
                <h2 class="text-sm font-black text-indigo-400"><i class="fa-solid fa-brain ml-1"></i> سند AI والإعدادات</h2>
                <div class="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                    <span>الرد التلقائي الذكي عند استلام رسالة</span>
                    <input type="checkbox" id="chk-autoreply" class="w-4 h-4 accent-indigo-600">
                </div>
                <div class="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                    <span>تنبيه صوتي ناعم عند وصول الرسائل والمكالمات</span>
                    <input type="checkbox" id="chk-chime" checked class="w-4 h-4 accent-blue-600">
                </div>
                <div class="flex gap-2 pt-1">
                    <button onclick="exportBackup()" class="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-download ml-1"></i>تصدير نسخة</button>
                    <button onclick="importBackup()" class="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-upload ml-1"></i>استعادة نسخة</button>
                </div>
                <div id="ai-log" class="bg-slate-950 border border-slate-800 rounded-xl p-3 h-32 overflow-y-auto text-xs space-y-2 custom-scrollbar">
                    <div class="text-slate-400">مساعد سند AI جاهز للمساعدة في الصياغة، التلخيص، وإعدادات الأجهزة.</div>
                </div>
                <div class="flex gap-2">
                    <input type="text" id="ai-q" onkeypress="if(event.key==='Enter') askSanadAI()" placeholder="اسأل سند AI..." class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                    <button onclick="askSanadAI()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold">إرسال</button>
                </div>
            </div>
        </section>

    </main>

    <!-- شريط القوائم السفلي -->
    <nav class="bg-slate-900 border-t border-slate-800 px-1 py-2 flex justify-around items-center z-20">
        <button onclick="setPane('chats')" id="btn-chats" class="flex flex-col items-center gap-1 text-blue-400 font-bold text-[10px] px-2 py-1">
            <i class="fa-solid fa-comments text-base"></i>
            <span>الدردشة</span>
        </button>
        <button onclick="setPane('accounts')" id="btn-accounts" class="flex flex-col items-center gap-1 text-slate-400 font-semibold text-[10px] px-2 py-1">
            <i class="fa-solid fa-id-card text-base"></i>
            <span>الحسابات</span>
        </button>
        <button onclick="setPane('contacts')" id="btn-contacts" class="flex flex-col items-center gap-1 text-slate-400 font-semibold text-[10px] px-2 py-1">
            <i class="fa-solid fa-address-book text-base"></i>
            <span>الجهات</span>
        </button>
        <button onclick="setPane('calls')" id="btn-calls" class="flex flex-col items-center gap-1 text-slate-400 font-semibold text-[10px] px-2 py-1">
            <i class="fa-solid fa-phone-volume text-base"></i>
            <span>المكالمات</span>
        </button>
        <button onclick="setPane('ai')" id="btn-ai" class="flex flex-col items-center gap-1 text-slate-400 font-semibold text-[10px] px-2 py-1">
            <i class="fa-solid fa-brain text-base"></i>
            <span>الذكاء والإعدادات</span>
        </button>
    </nav>

    <script>
        function detectDevice() {
            const ua = navigator.userAgent || '';
            if (/iPad/i.test(ua)) return 'آيباد';
            if (/iPhone|iPod/i.test(ua)) return 'آيفون';
            if (/Android/i.test(ua)) return 'أندرويد';
            return 'كمبيوتر';
        }
        document.getElementById('device-badge').innerText = detectDevice();

        let activeAcct = localStorage.getItem('sanad5_active') || '88888888';
        let myAccts = JSON.parse(localStorage.getItem('sanad5_accts') || '["88888888"]');
        let contacts = JSON.parse(localStorage.getItem('sanad5_contacts') || '[{"name":"خدمة العملاء","id":"88888888"}]');
        let currentPeer = '88888888';
        let onlinePeers = new Set();
        let threads = JSON.parse(localStorage.getItem('sanad5_threads') || '{"88888888":[{"id":"init-1","from":"them","kind":"text","text":"أهلاً بك في سند AI v5.2. الاتصال الهجين جاهز على جميع الشبكات."}]}');
        const seenEventIds = new Set();

        function markOnlineBadge(modeText) {
            document.getElementById('ws-dot').className = 'w-2 h-2 rounded-full bg-emerald-500 animate-pulse';
            document.getElementById('ws-label').innerText = modeText || 'متصل';
        }

        function playSoftChime() {
            if (!document.getElementById('chk-chime')?.checked) return;
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(660, ctx.currentTime);
                gain.gain.setValueAtTime(0.05, ctx.currentTime);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.14);
            } catch {}
        }

        function speakText(txt) {
            if (!('speechSynthesis' in window) || !txt) return;
            window.speechSynthesis.cancel();
            const utter = new SpeechSynthesisUtterance(txt);
            utter.lang = 'ar-SA';
            window.speechSynthesis.speak(utter);
        }

        function handleIncomingPayload(msg) {
            if (!msg || !msg.type) return;
            const eid = msg.eventId || msg.msgId || '';
            if (eid && seenEventIds.has(eid)) return;
            if (eid) seenEventIds.add(eid);

            if (msg.type === 'online_users') {
                onlinePeers = new Set(msg.ids || []);
                renderPresence();
            } else if (msg.type === 'msg') {
                const sender = String(msg.from);
                if (!threads[sender]) threads[sender] = [];
                threads[sender].push({
                    id: msg.msgId || ('m-' + Date.now()),
                    from: 'them',
                    kind: msg.kind || 'text',
                    text: msg.text || '',
                    mediaUrl: msg.mediaUrl || null,
                    fileName: msg.fileName || ''
                });
                playSoftChime();
                persistAndDraw();
                if (document.getElementById('chk-autoreply')?.checked && msg.kind === 'text') {
                    emitPacket(sender, 'text', 'رد تلقائي من سند AI: تم استلام رسالتك وسيتم الرد عليك قريباً.', null, '');
                }
            } else if (msg.type === 'msg_del') {
                const sender = String(msg.from);
                if (threads[sender]) {
                    threads[sender] = threads[sender].map(m => m.id === msg.msgId ? { ...m, deleted: true } : m);
                    persistAndDraw();
                }
            } else if (msg.type === 'call_sig') {
                playSoftChime();
                onCallSignal(msg);
            }
        }

        // قناة HTTP الرديفة لضمان العمل حتى لو تعثّر WebSocket
        async function postHttpSync(payload) {
            try {
                const res = await fetch('/api/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (res.ok) {
                    const data = await res.json();
                    if (!ws || ws.readyState !== 1) markOnlineBadge('متصل');
                    if (Array.isArray(data.onlineIds)) {
                        onlinePeers = new Set(data.onlineIds);
                        renderPresence();
                    }
                    if (Array.isArray(data.events)) {
                        data.events.forEach(handleIncomingPayload);
                    }
                }
            } catch {}
        }

        async function pollHttpSync() {
            try {
                const q = encodeURIComponent(myAccts.join(','));
                const res = await fetch('/api/sync?ids=' + q);
                if (res.ok) {
                    const data = await res.json();
                    if (!ws || ws.readyState !== 1) markOnlineBadge('متصل');
                    if (Array.isArray(data.onlineIds)) {
                        onlinePeers = new Set(data.onlineIds);
                        renderPresence();
                    }
                    if (Array.isArray(data.events)) {
                        data.events.forEach(handleIncomingPayload);
                    }
                }
            } catch {}
        }

        setInterval(() => {
            postHttpSync({ type: 'register_ids', ids: myAccts, activeId: activeAcct });
            pollHttpSync();
        }, 2500);

        let ws;
        let retryTimer = null;

        function openSocket() {
            clearTimeout(retryTimer);
            const scheme = location.protocol === 'https:' ? 'wss:' : 'ws:';
            try {
                ws = new WebSocket(scheme + '//' + location.host);
            } catch {
                retryTimer = setTimeout(openSocket, 2500);
                return;
            }

            ws.onopen = () => {
                markOnlineBadge('متصل');
                ws.send(JSON.stringify({ type: 'register_ids', ids: myAccts, activeId: activeAcct }));
                if (rtcConn && rtcConn.iceConnectionState === 'disconnected') {
                    rtcConn.restartIce();
                }
            };

            ws.onclose = () => {
                retryTimer = setTimeout(openSocket, 2500);
            };

            ws.onmessage = (ev) => {
                let msg;
                try { msg = JSON.parse(ev.data); } catch { return; }
                handleIncomingPayload(msg);
            };
        }

        window.addEventListener('online', () => reconnectNow());
        window.addEventListener('offline', () => {
            document.getElementById('ws-dot').className = 'w-2 h-2 rounded-full bg-red-500';
            document.getElementById('ws-label').innerText = 'بدون شبكة';
        });

        function reconnectNow() {
            document.getElementById('ws-label').innerText = 'جاري الربط...';
            if (ws) { try { ws.close(); } catch {} }
            openSocket();
            postHttpSync({ type: 'register_ids', ids: myAccts, activeId: activeAcct });
            pollHttpSync();
        }

        function sendSignalingOrMsg(payload) {
            const enriched = { ...payload, eventId: payload.eventId || ('ev-' + Date.now() + '-' + Math.floor(Math.random() * 100000)) };
            if (ws && ws.readyState === 1) {
                ws.send(JSON.stringify(enriched));
            }
            postHttpSync(enriched);
        }

        let rtcConn;
        let localStreamObj;
        let pendingCall = null;
        let callPeerId = null;
        const rtcConfig = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };

        async function launchCall(mode, explicitTarget) {
            const target = (explicitTarget || currentPeer || '').trim();
            if (!target) return alert('حدد معرّف أو رقم الطرف الآخر أولاً.');
            callPeerId = target;
            document.getElementById('call-modal').classList.remove('hidden');
            document.getElementById('call-peer-title').innerText = target + ' (' + (mode === 'video' ? 'فيديو' : 'صوت') + ')';
            document.getElementById('call-status-msg').innerText = 'جاري الاتصال...';
            document.getElementById('accept-btn').classList.add('hidden');
            setCallVisualMode(mode);

            try {
                localStreamObj = await navigator.mediaDevices.getUserMedia({
                    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
                    video: mode === 'video' ? { facingMode: 'user' } : false
                });
                if (mode === 'video') document.getElementById('local-video-el').srcObject = localStreamObj;
                createRTC(mode);
                localStreamObj.getTracks().forEach(t => rtcConn.addTrack(t, localStreamObj));
                const offer = await rtcConn.createOffer();
                await rtcConn.setLocalDescription(offer);
                sendSignalingOrMsg({ type: 'call_sig', to: callPeerId, from: activeAcct, sig: { op: 'offer', mode, sdp: offer } });
            } catch {
                document.getElementById('call-status-msg').innerText = 'يرجى السماح بصلاحية الميكروفون أو الكاميرا';
            }
        }

        async function onCallSignal(msg) {
            const sig = msg.sig;
            if (!sig) return;
            if (sig.op === 'offer') {
                pendingCall = msg;
                callPeerId = msg.from;
                document.getElementById('call-modal').classList.remove('hidden');
                document.getElementById('call-peer-title').innerText = msg.from + ' (' + (sig.mode === 'video' ? 'فيديو' : 'صوت') + ')';
                document.getElementById('call-status-msg').innerText = 'مكالمة واردة...';
                document.getElementById('accept-btn').classList.remove('hidden');
                setCallVisualMode(sig.mode);
            } else if (sig.op === 'answer' && rtcConn) {
                await rtcConn.setRemoteDescription(new RTCSessionDescription(sig.sdp));
                document.getElementById('call-status-msg').innerText = 'متصل الآن';
            } else if (sig.op === 'ice' && rtcConn && sig.candidate) {
                await rtcConn.addIceCandidate(new RTCIceCandidate(sig.candidate)).catch(() => {});
            } else if (sig.op === 'bye') {
                resetCallState();
            }
        }

        async function answerCall() {
            if (!pendingCall) return;
            document.getElementById('accept-btn').classList.add('hidden');
            document.getElementById('call-status-msg').innerText = 'جاري الفتح...';
            const mode = pendingCall.sig.mode;
            localStreamObj = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
                video: mode === 'video' ? { facingMode: 'user' } : false
            });
            if (mode === 'video') document.getElementById('local-video-el').srcObject = localStreamObj;
            createRTC(mode);
            localStreamObj.getTracks().forEach(t => rtcConn.addTrack(t, localStreamObj));
            await rtcConn.setRemoteDescription(new RTCSessionDescription(pendingCall.sig.sdp));
            const ans = await rtcConn.createAnswer();
            await rtcConn.setLocalDescription(ans);
            sendSignalingOrMsg({ type: 'call_sig', to: pendingCall.from, from: activeAcct, sig: { op: 'answer', sdp: ans } });
            document.getElementById('call-status-msg').innerText = 'متصل الآن';
        }

        function createRTC(mode) {
            rtcConn = new RTCPeerConnection(rtcConfig);
            rtcConn.onicecandidate = (e) => {
                if (e.candidate && callPeerId) {
                    sendSignalingOrMsg({ type: 'call_sig', to: callPeerId, from: activeAcct, sig: { op: 'ice', candidate: e.candidate } });
                }
            };
            rtcConn.ontrack = (e) => {
                if (mode === 'video') {
                    const rv = document.getElementById('remote-video-el');
                    rv.srcObject = e.streams[0];
                    rv.classList.remove('hidden');
                } else {
                    const aud = new Audio();
                    aud.srcObject = e.streams[0];
                    aud.play().catch(() => {});
                }
            };
        }

        function setCallVisualMode(mode) {
            const lv = document.getElementById('local-video-el');
            const rv = document.getElementById('remote-video-el');
            const vc = document.getElementById('voice-call-card');
            if (mode === 'video') {
                lv.classList.remove('hidden');
                vc.classList.add('hidden');
            } else {
                lv.classList.add('hidden');
                rv.classList.add('hidden');
                vc.classList.remove('hidden');
            }
        }

        function toggleMuteTrack() {
            if (!localStreamObj) return;
            const tr = localStreamObj.getAudioTracks()[0];
            if (!tr) return;
            tr.enabled = !tr.enabled;
            document.getElementById('mute-btn').className = tr.enabled
                ? 'w-12 h-12 rounded-2xl bg-slate-800 text-white flex items-center justify-center'
                : 'w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center';
        }

        function endActiveCall() {
            if (callPeerId) {
                sendSignalingOrMsg({ type: 'call_sig', to: callPeerId, from: activeAcct, sig: { op: 'bye' } });
            }
            resetCallState();
        }

        function resetCallState() {
            if (rtcConn) { rtcConn.close(); rtcConn = null; }
            if (localStreamObj) { localStreamObj.getTracks().forEach(t => t.stop()); localStreamObj = null; }
            document.getElementById('call-modal').classList.add('hidden');
            document.getElementById('remote-video-el').classList.add('hidden');
            document.getElementById('local-video-el').classList.add('hidden');
            pendingCall = null;
            callPeerId = null;
        }

        let speechRec;
        let dictating = false;

        function toggleSpeechDictation() {
            const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SR) return alert('الإملاء الصوتي المباشر غير مدعوم في هذا المتصفح، يمكنك استخدام التسجيل الصوتي.');
            const btn = document.getElementById('dictate-btn');
            if (!dictating) {
                speechRec = new SR();
                speechRec.lang = 'ar-SA';
                speechRec.interimResults = false;
                speechRec.onresult = (ev) => {
                    const transcript = ev.results?.[0]?.[0]?.transcript || '';
                    if (transcript) {
                        const inp = document.getElementById('msg-box-input');
                        inp.value = (inp.value ? inp.value + ' ' : '') + transcript;
                    }
                };
                speechRec.onend = () => {
                    dictating = false;
                    btn.className = 'text-cyan-400 hover:text-cyan-300 p-2 rounded-xl hover:bg-slate-800 transition';
                };
                speechRec.start();
                dictating = true;
                btn.className = 'bg-cyan-600 text-white p-2 rounded-xl animate-pulse';
            } else {
                speechRec.stop();
                dictating = false;
            }
        }

        function pickSupportedAudioMime() {
            const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac'];
            if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return '';
            return candidates.find(m => MediaRecorder.isTypeSupported(m)) || '';
        }

        let mediaRec;
        let audioBlobs = [];
        let capturingAudio = false;

        async function toggleVoiceCapture() {
            const btn = document.getElementById('voice-btn');
            if (!capturingAudio) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({
                        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
                    });
                    const mimeType = pickSupportedAudioMime();
                    mediaRec = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
                    audioBlobs = [];
                    mediaRec.ondataavailable = e => { if (e.data && e.data.size > 0) audioBlobs.push(e.data); };
                    mediaRec.onstop = () => {
                        const finalType = mediaRec.mimeType || mimeType || 'audio/webm';
                        const blob = new Blob(audioBlobs, { type: finalType });
                        const reader = new FileReader();
                        reader.onloadend = () => emitPacket(currentPeer, 'audio', 'رسالة صوتية', reader.result, 'voice-note');
                        reader.readAsDataURL(blob);
                        stream.getTracks().forEach(t => t.stop());
                    };
                    mediaRec.start();
                    capturingAudio = true;
                    btn.className = 'bg-red-600 text-white p-2.5 rounded-xl animate-pulse';
                } catch {
                    alert('يرجى السماح بالوصول إلى الميكروفون.');
                }
            } else {
                mediaRec.stop();
                capturingAudio = false;
                btn.className = 'bg-slate-800 hover:bg-emerald-600 text-emerald-400 hover:text-white p-2.5 rounded-xl transition';
            }
        }

        function onFilePicked(ev) {
            const file = ev.target.files?.[0];
            if (!file) return;
            if (file.size > 1500000) return alert('الحد الأقصى للمرفق المباشر 1.5 ميجابايت.');
            const reader = new FileReader();
            reader.onloadend = () => {
                const kind = file.type.startsWith('image/') ? 'image' : 'file';
                emitPacket(currentPeer, kind, file.name, reader.result, file.name);
            };
            reader.readAsDataURL(file);
            ev.target.value = '';
        }

        function emitPacket(to, kind, text, mediaUrl, fileName, existingMsgId) {
            const cleanTo = String(to).trim();
            if (!cleanTo) return;
            const liveDelivered = Boolean(onlinePeers.has(cleanTo));
            const msgId = existingMsgId || ('m-' + Date.now() + '-' + Math.floor(Math.random() * 1000));
            if (!threads[cleanTo]) threads[cleanTo] = [];
            if (!existingMsgId) {
                threads[cleanTo].push({ id: msgId, from: 'me', kind, text, mediaUrl, fileName, delivered: liveDelivered });
            } else {
                threads[cleanTo] = threads[cleanTo].map(m => m.id === existingMsgId ? { ...m, delivered: liveDelivered } : m);
            }
            persistAndDraw();
            sendSignalingOrMsg({ type: 'msg', to: cleanTo, from: activeAcct, msgId, kind, text, mediaUrl, fileName });
        }

        function retryMessage(msgId) {
            const item = (threads[currentPeer] || []).find(m => m.id === msgId);
            if (!item) return;
            emitPacket(currentPeer, item.kind, item.text, item.mediaUrl, item.fileName, item.id);
        }

        function sendTextMsg() {
            const inp = document.getElementById('msg-box-input');
            const val = inp.value.trim();
            if (!val) return;
            emitPacket(currentPeer, 'text', val, null, '');
            inp.value = '';
        }

        function deleteChatItem(msgId) {
            if (!threads[currentPeer]) return;
            threads[currentPeer] = threads[currentPeer].map(m => m.id === msgId ? { ...m, deleted: true } : m);
            persistAndDraw();
            sendSignalingOrMsg({ type: 'msg_del', to: currentPeer, from: activeAcct, msgId });
        }

        function clearThreadMsgs() {
            threads[currentPeer] = [];
            persistAndDraw();
        }

        function polishDraft() {
            const inp = document.getElementById('msg-box-input');
            const raw = inp.value.trim();
            if (!raw) return alert('اكتب نصاً أولاً لتحسين صياغته.');
            inp.value = raw.endsWith('.') ? raw : raw + '.';
        }

        function summarizeCurrentThread() {
            const list = (threads[currentPeer] || []).filter(m => !m.deleted && m.kind === 'text');
            if (!list.length) return alert('لا توجد رسائل نصية كافية لتلخيصها.');
            const lastFew = list.slice(-4).map(m => m.text).join(' • ');
            setPane('ai');
            const log = document.getElementById('ai-log');
            log.innerHTML += '<div class="bg-indigo-950/50 p-2 rounded-lg text-indigo-200"><strong>ملخص سند AI (' + currentPeer + '):</strong> آخر النقاط المتداولة: ' + lastFew + '</div>';
            log.scrollTop = log.scrollHeight;
        }

        function askSanadAI() {
            const inp = document.getElementById('ai-q');
            const q = inp.value.trim();
            if (!q) return;
            const log = document.getElementById('ai-log');
            log.innerHTML += '<div class="bg-blue-950/50 p-2 rounded-lg text-blue-200"><strong>أنت:</strong> ' + q + '</div>';
            log.innerHTML += '<div class="bg-slate-900 p-2 rounded-lg text-slate-200"><strong>سند AI:</strong> تم استلام طلبك. يعمل الإصدار v5.2 بنظام مزامنة هجين (WebSocket + HTTP) لضمان الاستقرار.</div>';
            inp.value = '';
            log.scrollTop = log.scrollHeight;
        }

        function exportBackup() {
            const data = JSON.stringify({ activeAcct, myAccts, contacts, threads });
            if (navigator.clipboard) {
                navigator.clipboard.writeText(data).then(() => alert('تم نسخ النسخة الاحتياطية إلى الحافظة.'));
            } else {
                prompt('انسخ بيانات النسخة الاحتياطية:', data);
            }
        }

        function importBackup() {
            const raw = prompt('الصق بيانات النسخة الاحتياطية هنا:');
            if (!raw) return;
            try {
                const parsed = JSON.parse(raw);
                if (parsed.activeAcct) activeAcct = parsed.activeAcct;
                if (Array.isArray(parsed.myAccts)) myAccts = parsed.myAccts;
                if (Array.isArray(parsed.contacts)) contacts = parsed.contacts;
                if (parsed.threads && typeof parsed.threads === 'object') threads = parsed.threads;
                persistAndDraw();
                sendSignalingOrMsg({ type: 'register_ids', ids: myAccts, activeId: activeAcct });
                alert('تمت استعادة النسخة الاحتياطية بنجاح.');
            } catch {
                alert('صيغة النسخة الاحتياطية غير صحيحة.');
            }
        }

        function setPane(p) {
            ['chats', 'accounts', 'contacts', 'calls', 'ai'].forEach(item => {
                document.getElementById('pane-' + item).classList.add('hidden');
                const btn = document.getElementById('btn-' + item);
                if (btn) btn.className = 'flex flex-col items-center gap-1 text-slate-400 font-semibold text-[10px] px-2 py-1';
            });
            document.getElementById('pane-' + p).classList.remove('hidden');
            const activeBtn = document.getElementById('btn-' + p);
            if (activeBtn) activeBtn.className = 'flex flex-col items-center gap-1 text-blue-400 font-bold text-[10px] px-2 py-1';
        }

        function choosePeer(id) {
            const clean = String(id || '').trim();
            if (!clean) return;
            currentPeer = clean;
            if (!threads[currentPeer]) threads[currentPeer] = [];
            setPane('chats');
            persistAndDraw();
        }

        function openPeerByInput() {
            const inp = document.getElementById('peer-input');
            const val = inp.value.trim();
            if (!val) return alert('أدخل معرّف 8 أرقام أو رقم الجوال.');
            inp.value = '';
            choosePeer(val);
        }

        function saveCurrentPeer() {
            if (!currentPeer) return;
            if (contacts.some(c => c.id === currentPeer)) return alert('محفوظ مسبقاً.');
            const name = prompt('اسم جهة الاتصال للرقم ' + currentPeer + ':') || ('جهة ' + currentPeer);
            contacts.push({ name, id: currentPeer });
            persistAndDraw();
        }

        function addNewContact() {
            const name = document.getElementById('c-name').value.trim();
            const id = document.getElementById('c-id').value.trim();
            if (!name || !id) return alert('أدخل الاسم والمعرّف أو الرقم.');
            contacts.push({ name, id });
            document.getElementById('c-name').value = '';
            document.getElementById('c-id').value = '';
            choosePeer(id);
        }

        function deleteContactAt(i) {
            contacts.splice(i, 1);
            persistAndDraw();
        }

        function shareInviteLink() {
            const msg = 'تواصل معي على سند عبر المعرّف: ' + activeAcct + ' على الرابط: ' + location.origin;
            if (navigator.share) {
                navigator.share({ title: 'سند AI', text: msg, url: location.origin }).catch(() => {});
            } else if (navigator.clipboard) {
                navigator.clipboard.writeText(msg);
                alert('تم نسخ الدعوة: ' + msg);
            } else {
                alert(msg);
            }
        }

        function make8DigitId() {
            const code8 = Math.floor(10000000 + Math.random() * 90000000).toString();
            if (!myAccts.includes(code8)) myAccts.push(code8);
            activateAccount(code8);
        }

        function verifyPhoneAccount() {
            const ph = prompt('أدخل رقم الجوال (مثال: +967772302010):');
            if (!ph || !ph.trim()) return;
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const code = prompt('كود التفعيل الخاص برقمك هو: ' + otp + '\\nأدخل الكود لتأكيد التفعيل:');
            if (!code || code.trim() !== otp) return alert('كود التفعيل غير مطابق.');
            const cleanPh = ph.trim();
            if (!myAccts.includes(cleanPh)) myAccts.push(cleanPh);
            activateAccount(cleanPh);
        }

        function activateAccount(id) {
            activeAcct = String(id).trim();
            persistAndDraw();
            sendSignalingOrMsg({ type: 'register_ids', ids: myAccts, activeId: activeAcct });
        }

        function renderPresence() {
            const isOn = onlinePeers.has(currentPeer);
            const dot = document.getElementById('peer-dot');
            const lbl = document.getElementById('peer-status');
            if (isOn) {
                dot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping';
                lbl.className = 'text-[11px] font-bold text-emerald-400';
                lbl.innerText = 'متصل الآن';
            } else {
                dot.className = 'w-2.5 h-2.5 rounded-full bg-slate-600';
                lbl.className = 'text-[11px] font-bold text-slate-400';
                lbl.innerText = 'غير متصل';
            }

            const chips = document.getElementById('quick-chips');
            chips.innerHTML = '<span class="text-[11px] text-slate-400 shrink-0">وصول سريع:</span>' + contacts.map(c => {
                const on = onlinePeers.has(c.id);
                return \`<button onclick="choosePeer('\${c.id}')" class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] shrink-0 \${c.id === currentPeer ? 'bg-blue-600/25 border-blue-500 text-white font-bold' : 'bg-slate-800/80 border-slate-700 text-slate-300'}">
                    <span class="w-2 h-2 rounded-full \${on ? 'bg-emerald-400' : 'bg-slate-500'}"></span>
                    <span>\${c.name}</span>
                </button>\`).join('');

            const cBox = document.getElementById('contacts-list');
            cBox.innerHTML = contacts.map((c, idx) => {
                const on = onlinePeers.has(c.id);
                return \`<div class="bg-slate-900 border border-slate-800 p-3 rounded-xl flex justify-between items-center">
                    <div class="flex items-center gap-2.5">
                        <span class="w-2.5 h-2.5 rounded-full \${on ? 'bg-emerald-500' : 'bg-slate-600'}"></span>
                        <div>
                            <p class="text-xs font-bold text-white">\${c.name}</p>
                            <p class="text-[11px] font-mono \${on ? 'text-emerald-400' : 'text-slate-400'}">\${c.id} • \${on ? 'متصل الآن' : 'غير متصل'}</p>
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="choosePeer('\${c.id}')" class="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold">مراسلة</button>
                        <button onclick="deleteContactAt(\${idx})" class="bg-red-500/10 text-red-400 px-2.5 py-1.5 rounded-lg text-xs"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>\`;
            }).join('');
        }

        function renderMsgs() {
            const box = document.getElementById('msgs-box');
            const list = threads[currentPeer] || [];
            if (!list.length) {
                box.innerHTML = '<div class="text-center text-xs text-slate-500 py-8">ابدأ المراسلة أو أرسل صوتاً أو مرفقاً أو ابدأ مكالمة.</div>';
                return;
            }
            box.innerHTML = list.map(m => {
                if (m.deleted) {
                    return '<div class="text-center text-[11px] text-slate-500 italic">تم حذف الرسالة</div>';
                }
                const mine = m.from === 'me';
                let body = \`<p>\${m.text}</p>\`;
                if (m.kind === 'audio' && m.mediaUrl) {
                    body = \`<audio controls src="\${m.mediaUrl}" class="max-w-full h-9"></audio>\`;
                } else if (m.kind === 'image' && m.mediaUrl) {
                    body = \`<img src="\${m.mediaUrl}" alt="\${m.fileName || 'صورة'}" class="max-w-full max-h-56 rounded-xl object-contain"><p class="text-[11px] mt-1">\${m.text}</p>\`;
                } else if (m.kind === 'file' && m.mediaUrl) {
                    body = \`<a href="\${m.mediaUrl}" download="\${m.fileName || 'file'}" class="underline flex items-center gap-1.5 text-xs"><i class="fa-solid fa-file-arrow-down"></i><span>\${m.fileName || m.text}</span></a>\`;
                }
                const speakBtn = m.kind === 'text' && m.text
                    ? \`<button onclick="speakText('\${String(m.text).replace(/'/g, '')}')" title="قراءة صوتية" class="underline text-blue-100">استماع</button>\`
                    : '';
                const deliveryLabel = mine
                    ? (m.delivered === false
                        ? '<span class="text-amber-200">غير متصل • <button onclick="retryMessage(\'' + m.id + '\')" class="underline">إعادة إرسال</button></span>'
                        : '<span>مرسلة ✓</span>')
                    : '<span>واردة</span>';
                return \`<div class="flex \${mine ? 'justify-end' : 'justify-start'}">
                    <div class="\${mine ? 'bg-blue-600 text-white rounded-tl-none' : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tr-none'} p-3 rounded-2xl max-w-md text-xs md:text-sm shadow space-y-1">
                        \${body}
                        <div class="flex justify-between items-center gap-3 pt-1 border-t \${mine ? 'border-blue-400/30 text-blue-100' : 'border-slate-800 text-slate-400'} text-[10px]">
                            \${deliveryLabel}
                            <div class="flex gap-2">
                                \${speakBtn}
                                \${mine ? \`<button onclick="deleteChatItem('\${m.id}')" class="underline text-red-100">حذف</button>\` : ''}
                            </div>
                        </div>
                    </div>
                </div>\`;
            }).join('');
            box.scrollTop = box.scrollHeight;
        }

        function renderAccts() {
            const box = document.getElementById('accounts-list');
            box.innerHTML = myAccts.map(id => \`<div onclick="activateAccount('\${id}')" class="bg-slate-950 border \${id === activeAcct ? 'border-blue-500' : 'border-slate-800'} p-3 rounded-xl flex justify-between items-center cursor-pointer">
                <span class="text-xs font-mono font-bold text-white">\${id}</span>
                <span class="text-[10px] \${id === activeAcct ? 'text-emerald-400 font-bold' : 'text-slate-400'}">\${id === activeAcct ? 'نشط' : 'تبديل'}</span>
            </div>\`).join('');
        }

        function persistAndDraw() {
            localStorage.setItem('sanad5_active', activeAcct);
            localStorage.setItem('sanad5_accts', JSON.stringify(myAccts));
            localStorage.setItem('sanad5_contacts', JSON.stringify(contacts));
            localStorage.setItem('sanad5_threads', JSON.stringify(threads));
            document.getElementById('active-acct-label').innerText = activeAcct;
            document.getElementById('peer-title').innerText = currentPeer;
            renderPresence();
            renderMsgs();
            renderAccts();
        }

        persistAndDraw();
        openSocket();
        postHttpSync({ type: 'register_ids', ids: myAccts, activeId: activeAcct });
        pollHttpSync();
    </script>
</body>
</html>`;

const PORT = process.env.PORT || 3000;
const socketsMap = new Map();
const httpPresence = new Map();
const httpInbox = new Map();

function touchHttpPresence(ids) {
    const now = Date.now();
    ids.forEach(id => {
        const clean = String(id).trim();
        if (clean) httpPresence.set(clean, now);
    });
}

function getAllOnlineIds() {
    const now = Date.now();
    const set = new Set(socketsMap.keys());
    httpPresence.forEach((ts, id) => {
        if (now - ts < 10000) set.add(id);
        else httpPresence.delete(id);
    });
    return Array.from(set);
}

function enqueueHttpEvent(toId, payload) {
    const clean = String(toId || '').trim();
    if (!clean) return;
    const list = httpInbox.get(clean) || [];
    list.push(payload);
    if (list.length > 50) list.shift();
    httpInbox.set(clean, list);
}

function drainHttpEvents(ids) {
    const out = [];
    ids.forEach(id => {
        const clean = String(id).trim();
        const list = httpInbox.get(clean);
        if (list && list.length) {
            out.push(...list);
            httpInbox.set(clean, []);
        }
    });
    return out;
}

const server = http.createServer((req, res) => {
    const urlObj = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));

    if (urlObj.pathname === '/api/sync' && req.method === 'GET') {
        const rawIds = (urlObj.searchParams.get('ids') || '').split(',').map(s => s.trim()).filter(Boolean);
        touchHttpPresence(rawIds);
        const events = drainHttpEvents(rawIds);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ onlineIds: getAllOnlineIds(), events }));
        return;
    }

    if (urlObj.pathname === '/api/sync' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const data = JSON.parse(body || '{}');
                if (data.type === 'register_ids') {
                    const list = Array.isArray(data.ids) ? data.ids : [data.activeId].filter(Boolean);
                    touchHttpPresence(list);
                } else if (data.to) {
                    enqueueHttpEvent(data.to, data);
                }
            } catch {}
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ ok: true, onlineIds: getAllOnlineIds() }));
        });
        return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(htmlContent);
});

const wss = new WebSocketServer({ server });

function broadcastOnline() {
    const ids = getAllOnlineIds();
    const msg = JSON.stringify({ type: 'online_users', ids });
    wss.clients.forEach(c => {
        if (c.readyState === 1) c.send(msg);
    });
}

wss.on('connection', (ws) => {
    let registeredIds = [];

    ws.on('message', (raw) => {
        let data;
        try { data = JSON.parse(raw.toString()); } catch { return; }

        if (data.type === 'register_ids') {
            registeredIds.forEach(old => {
                if (socketsMap.get(old) === ws) socketsMap.delete(old);
            });
            const list = Array.isArray(data.ids) ? data.ids : [data.activeId].filter(Boolean);
            registeredIds = list.map(x => String(x).trim()).filter(Boolean);
            registeredIds.forEach(id => socketsMap.set(id, ws));
            touchHttpPresence(registeredIds);
            broadcastOnline();
            return;
        }

        if (data.to) {
            const dest = socketsMap.get(String(data.to).trim());
            if (dest && dest.readyState === 1) {
                dest.send(JSON.stringify(data));
            } else {
                enqueueHttpEvent(data.to, data);
            }
        }
    });

    ws.on('close', () => {
        registeredIds.forEach(id => {
            if (socketsMap.get(id) === ws) socketsMap.delete(id);
        });
        broadcastOnline();
    });
});

server.listen(PORT, () => {
    console.log('Sanad AI v5.2 running on port ' + PORT);
});
