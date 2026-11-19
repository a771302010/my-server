const http = require('http');
const { WebSocketServer } = require('ws');

const htmlContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="mobile-web-app-capable" content="yes">
    <title>سند AI v6.5</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
        body { font-family: 'Cairo', sans-serif; background-color: #050912; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1d4ed8; border-radius: 9999px; }
    </style>
</head>
<body class="text-slate-100 h-screen flex flex-col overflow-hidden select-none">

    <!-- الشريط العلوي -->
    <header class="bg-slate-900/95 border-b border-slate-800 px-3.5 py-2.5 flex justify-between items-center z-20 shadow-md shrink-0">
        <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-2xl bg-gradient-to-b from-blue-600 to-blue-950 border border-blue-400/40 flex flex-col items-center justify-center shadow-lg shadow-blue-700/25">
                <span class="text-white font-black text-lg leading-none">S</span>
                <i class="fa-solid fa-hands-holding-child text-[9px] text-blue-200 mt-0.5"></i>
            </div>
            <div>
                <div class="flex items-center gap-1.5">
                    <h1 class="font-black text-base md:text-lg text-white leading-none">سند</h1>
                    <span class="text-[10px] bg-emerald-600/25 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">AI v6.5</span>
                    <span id="device-badge" class="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-semibold">---</span>
                </div>
                <div class="flex items-center gap-1.5 text-[11px] mt-1">
                    <span id="ws-dot" class="w-2 h-2 rounded-full bg-amber-400"></span>
                    <span id="ws-label" class="text-slate-300 font-semibold">جاري الربط...</span>
                    <button onclick="reconnectNow()" title="تحديث الربط" class="text-blue-400 hover:text-blue-300 px-1"><i class="fa-solid fa-rotate-right text-[10px]"></i></button>
                    <span class="text-slate-600">•</span>
                    <span id="active-acct-label" class="font-mono font-bold text-blue-300">88888888</span>
                </div>
            </div>
        </div>

        <div class="flex items-center gap-2">
            <button onclick="launchCall('audio')" title="مكالمة صوتية" class="w-9 h-9 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/40 text-emerald-300 hover:text-white flex items-center justify-center transition">
                <i class="fa-solid fa-phone text-xs"></i>
            </button>
            <button onclick="launchCall('video')" title="مكالمة فيديو" class="w-9 h-9 rounded-xl bg-blue-600/20 hover:bg-blue-600 border border-blue-500/40 text-blue-300 hover:text-white flex items-center justify-center transition">
                <i class="fa-solid fa-video text-xs"></i>
            </button>
        </div>
    </header>

    <!-- نافذة المكالمات الصوتية والمرئية -->
    <div id="call-modal" class="hidden fixed inset-0 bg-slate-950/95 z-50 flex flex-col items-center justify-between p-4">
        <div class="text-center mt-1">
            <p class="text-xs text-blue-400 font-bold">سند AI v6.5 • اتصال مباشر</p>
            <h2 id="call-peer-title" class="text-lg font-black text-white font-mono mt-0.5">---</h2>
            <p id="call-status-msg" class="text-xs text-emerald-400 mt-0.5 font-semibold">جاري الاتصال...</p>
        </div>

        <div class="relative w-full max-w-md aspect-video bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden flex items-center justify-center shadow-2xl">
            <video id="remote-video-el" autoplay playsinline class="w-full h-full object-cover"></video>
            <video id="local-video-el" autoplay playsinline muted class="w-24 h-32 object-cover rounded-2xl border border-blue-500/50 absolute bottom-3 left-3 hidden"></video>
            <div id="voice-call-card" class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900/80">
                <div class="w-16 h-16 rounded-full bg-blue-600/20 border border-blue-400/40 flex items-center justify-center text-2xl text-blue-400 animate-pulse">
                    <i class="fa-solid fa-microphone-lines"></i>
                </div>
                <span class="text-xs text-slate-300 font-semibold">عزل ضوضاء ذكي وصوت مباشر</span>
            </div>
        </div>

        <div class="flex items-center gap-2.5 mb-2 flex-wrap justify-center">
            <button id="accept-btn" onclick="answerCall()" class="hidden bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-2xl font-bold text-xs shadow-lg">
                <i class="fa-solid fa-phone ml-1"></i> رد
            </button>
            <button id="mute-btn" onclick="toggleMuteTrack()" title="كتم الصوت" class="w-11 h-11 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center">
                <i class="fa-solid fa-microphone"></i>
            </button>
            <button id="cam-btn" onclick="toggleVideoTrack()" title="الكاميرا" class="hidden w-11 h-11 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center">
                <i class="fa-solid fa-video"></i>
            </button>
            <button onclick="endActiveCall()" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-2xl font-bold text-xs shadow-lg">
                <i class="fa-solid fa-phone-slash ml-1"></i> إنهاء
            </button>
        </div>
    </div>

    <!-- المحتوى الرئيسي -->
    <main class="flex-1 flex flex-col overflow-hidden bg-[#070c17]">

        <!-- 1. الدردشة -->
        <section id="pane-chats" class="flex-1 flex flex-col h-full overflow-hidden">
            <div class="p-2.5 bg-slate-900/80 border-b border-slate-800 space-y-2 shrink-0">
                <div class="flex gap-2">
                    <input type="text" id="peer-input" onkeydown="if(event.key==='Enter') openPeerByInput()" placeholder="معرّف الزميل (8 أرقام) أو رقم الجوال..." class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs md:text-sm text-white font-mono focus:outline-none focus:border-blue-500">
                    <button onclick="openPeerByInput()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition">فتح</button>
                    <button onclick="saveCurrentPeer()" title="حفظ في الجهات" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 px-3 py-2 rounded-xl text-xs font-bold">
                        <i class="fa-solid fa-user-plus"></i>
                    </button>
                </div>
                <div id="quick-chips" class="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs"></div>
            </div>

            <div class="px-4 py-2 bg-slate-950/80 border-b border-slate-800/90 flex justify-between items-center text-xs shrink-0">
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

            <div id="msgs-box" class="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar"></div>

            <div class="p-2.5 bg-slate-900 border-t border-slate-800 flex items-center gap-1.5 shrink-0">
                <input type="file" id="attach-file" class="hidden" onchange="onFilePicked(event)">
                <button onclick="document.getElementById('attach-file').click()" title="إرفاق ملف أو صورة" class="text-amber-400 hover:text-amber-300 p-2 rounded-xl hover:bg-slate-800 transition">
                    <i class="fa-solid fa-paperclip text-base"></i>
                </button>
                <button id="dictate-btn" onclick="toggleSpeechDictation()" title="إملاء صوتي" class="text-cyan-400 hover:text-cyan-300 p-2 rounded-xl hover:bg-slate-800 transition">
                    <i class="fa-solid fa-language text-base"></i>
                </button>
                <button onclick="polishDraft()" title="تحسين الصياغة بالذكاء الاصطناعي" class="text-indigo-400 hover:text-indigo-300 p-2 rounded-xl hover:bg-slate-800 transition">
                    <i class="fa-solid fa-wand-magic-sparkles text-base"></i>
                </button>
                <input type="text" id="msg-box-input" onkeydown="if(event.key==='Enter') sendTextMsg()" placeholder="اكتب رسالتك..." class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500">
                <button id="voice-btn" onclick="toggleVoiceCapture()" title="تسجيل رسالة صوتية" class="bg-slate-800 hover:bg-emerald-600 text-emerald-400 hover:text-white p-2.5 rounded-xl transition">
                    <i class="fa-solid fa-microphone text-base"></i>
                </button>
                <button onclick="sendTextMsg()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition shadow">
                    <i class="fa-solid fa-paper-plane"></i>
                </button>
            </div>
        </section>

        <!-- 2. الحسابات -->
        <section id="pane-accounts" class="hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-4">
            <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
                <h2 class="text-sm font-black text-blue-400">إدارة الحسابات والمعرّفات المتعددة</h2>
                <p class="text-[11px] text-slate-400 leading-relaxed">
                    أنشئ عدة معرّفات من <strong>8 أرقام متصلة</strong> أو فعّل أرقام جوال متعددة، ولكل حساب محادثاته الخاصة وحضوره الفوري.
                </p>
                <div class="flex flex-wrap gap-2">
                    <button onclick="make8DigitId()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold">+ توليد معرّف (8 أرقام)</button>
                    <button onclick="verifyPhoneAccount()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold">+ تفعيل رقم جوال</button>
                </div>
                <div id="accounts-list" class="space-y-2 pt-2"></div>
            </div>
        </section>

        <!-- 3. الجهات -->
        <section id="pane-contacts" class="hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-3">
            <div class="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl space-y-2.5">
                <h2 class="text-sm font-black text-emerald-400">إضافة جهة اتصال</h2>
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
                <h2 class="text-base font-black text-white">مركز المكالمات الصوتية والمرئية</h2>
                <p class="text-xs text-slate-400 mt-1 max-w-sm">اتصال مباشر بين الأجهزة مع إمكانية كتم الصوت أو التحكم بالكاميرا.</p>
            </div>
            <input type="text" id="call-input" placeholder="أدخل معرّف 8 أرقام أو رقم الجوال..." class="w-full max-w-xs bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-center font-mono text-white">
            <div class="flex gap-3">
                <button onclick="launchCall('audio', document.getElementById('call-input').value.trim())" class="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
                    <i class="fa-solid fa-phone"></i> مكالمة صوتية
                </button>
                <button onclick="launchCall('video', document.getElementById('call-input').value.trim())" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
                    <i class="fa-solid fa-video"></i> مكالمة فيديو
                </button>
            </div>
        </section>

        <!-- 5. الذكاء والإعدادات + السيرفرات البديلة -->
        <section id="pane-ai" class="hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-3">
            <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-2.5">
                <h2 class="text-sm font-black text-indigo-400"><i class="fa-solid fa-brain ml-1"></i> مساعد سند AI والسيرفرات البديلة</h2>

                <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 text-xs">
                    <div class="flex justify-between items-center">
                        <span class="font-bold text-slate-200">السيرفر النشط / الربط البديل</span>
                        <button onclick="cycleServerEndpoint()" class="text-blue-400 underline font-semibold">تبديل للسيرفر التالي</button>
                    </div>
                    <select id="server-select" onchange="onServerSelectChange()" class="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-emerald-300"></select>
                    <div class="flex gap-1.5">
                        <input type="text" id="custom-srv-input" placeholder="إضافة رابط سيرفر بديل (https://...)" class="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white">
                        <button onclick="addCustomServer()" class="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold">إضافة</button>
                    </div>
                </div>

                <div class="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                    <span>الرد التلقائي الذكي عند استلام رسالة</span>
                    <input type="checkbox" id="chk-autoreply" class="w-4 h-4 accent-indigo-600">
                </div>
                <div class="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                    <span>نغمة تنبيه ناعمة عند وصول الرسائل والمكالمات</span>
                    <input type="checkbox" id="chk-chime" checked class="w-4 h-4 accent-blue-600">
                </div>
                <div id="ai-log" class="bg-slate-950 border border-slate-800 rounded-xl p-3 h-32 overflow-y-auto text-xs space-y-2 custom-scrollbar">
                    <div class="text-slate-400">مرحباً بك في سند AI v6.5. يدعم تعدد الحسابات والسيرفرات البديلة والمكالمات والرسائل.</div>
                </div>
                <div class="flex gap-2">
                    <input type="text" id="ai-q" onkeydown="if(event.key==='Enter') askSanadAI()" placeholder="اطلب من سند AI..." class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                    <button onclick="askSanadAI()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold">إرسال</button>
                </div>
            </div>
        </section>

    </main>

    <!-- شريط التنقل السفلي -->
    <nav class="bg-slate-900 border-t border-slate-800 px-1 py-2 flex justify-around items-center z-20 shrink-0">
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
            var ua = navigator.userAgent || '';
            if (/iPad/i.test(ua)) return 'آيباد';
            if (/iPhone|iPod/i.test(ua)) return 'آيفون';
            if (/Android/i.test(ua)) return 'أندرويد';
            return 'كمبيوتر';
        }
        document.getElementById('device-badge').textContent = detectDevice();

        var defaultServers = [location.origin, 'https://my-server-t0s5.onrender.com'].filter(function(v, i, a) { return v && a.indexOf(v) === i; });
        var serverList = JSON.parse(localStorage.getItem('sanad65_servers') || 'null') || defaultServers;
        var activeServerUrl = localStorage.getItem('sanad65_active_srv') || location.origin;

        function renderServerSelect() {
            var sel = document.getElementById('server-select');
            if (!sel) return;
            sel.innerHTML = serverList.map(function(u) {
                return '<option value="' + u + '"' + (u === activeServerUrl ? ' selected' : '') + '>' + u + '</option>';
            }).join('');
        }

        function addCustomServer() {
            var inp = document.getElementById('custom-srv-input');
            var u = (inp.value || '').trim().replace(/\/+$/, '');
            if (!u || u.indexOf('http') !== 0) return alert('أدخل رابطاً يبدأ بـ https:// أو http://');
            if (serverList.indexOf(u) === -1) serverList.push(u);
            activeServerUrl = u;
            localStorage.setItem('sanad65_servers', JSON.stringify(serverList));
            localStorage.setItem('sanad65_active_srv', activeServerUrl);
            inp.value = '';
            renderServerSelect();
            reconnectNow();
        }

        function onServerSelectChange() {
            activeServerUrl = document.getElementById('server-select').value;
            localStorage.setItem('sanad65_active_srv', activeServerUrl);
            reconnectNow();
        }

        function cycleServerEndpoint() {
            if (serverList.length < 2) return alert('أضف سيرفراً بديلاً أولاً لتبديل الربط.');
            var idx = serverList.indexOf(activeServerUrl);
            activeServerUrl = serverList[(idx + 1) % serverList.length];
            localStorage.setItem('sanad65_active_srv', activeServerUrl);
            renderServerSelect();
            reconnectNow();
        }

        function getBaseUrl() {
            return (activeServerUrl || location.origin).replace(/\/+$/, '');
        }

        var activeAcct = localStorage.getItem('sanad65_active') || '88888888';
        var myAccts = JSON.parse(localStorage.getItem('sanad65_accts') || '["88888888"]');
        var contacts = JSON.parse(localStorage.getItem('sanad65_contacts') || '[{"name":"خدمة العملاء","id":"88888888"}]');
        var currentPeer = '88888888';
        var onlinePeers = new Set();
        var acctThreads = JSON.parse(localStorage.getItem('sanad65_acct_threads') || '{}');
        var seenEventIds = new Set();
        var ws;
        var wsConnected = false;
        var httpConnected = false;

        function getCurrentThreadMap() {
            if (!acctThreads[activeAcct]) {
                acctThreads[activeAcct] = {
                    '88888888': [{ id: 'init-1', from: 'them', kind: 'text', text: 'أهلاً بك في سند AI v6.5. النظام جاهز للمراسلة، الصوت، الفيديو، وتعدد الحسابات.' }]
                };
            }
            return acctThreads[activeAcct];
        }

        function refreshConnectionHeader() {
            var isLive = wsConnected || httpConnected;
            document.getElementById('ws-dot').className = isLive ? 'w-2 h-2 rounded-full bg-emerald-500 animate-pulse' : 'w-2 h-2 rounded-full bg-amber-400';
            document.getElementById('ws-label').textContent = isLive ? 'متصل' : 'جاري الربط...';
        }

        function playSoftChime() {
            var chk = document.getElementById('chk-chime');
            if (chk && !chk.checked) return;
            try {
                var Ctx = window.AudioContext || window.webkitAudioContext;
                var ctx = new Ctx();
                var osc = ctx.createOscillator();
                var gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(660, ctx.currentTime);
                gain.gain.setValueAtTime(0.05, ctx.currentTime);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.14);
            } catch (e) {}
        }

        function speakText(txt) {
            if (!('speechSynthesis' in window) || !txt) return;
            window.speechSynthesis.cancel();
            var utter = new SpeechSynthesisUtterance(txt);
            utter.lang = 'ar-SA';
            window.speechSynthesis.speak(utter);
        }

        function handleIncomingPayload(msg) {
            if (!msg || !msg.type) return;
            var eid = msg.eventId || msg.msgId || '';
            if (eid && seenEventIds.has(eid)) return;
            if (eid) seenEventIds.add(eid);

            if (msg.type === 'online_users' && Array.isArray(msg.ids)) {
                onlinePeers = new Set(msg.ids);
                renderPresence();
            } else if (msg.type === 'msg') {
                var recipient = String(msg.to || activeAcct);
                var sender = String(msg.from || '');
                if (!sender) return;
                if (!acctThreads[recipient]) acctThreads[recipient] = {};
                if (!acctThreads[recipient][sender]) acctThreads[recipient][sender] = [];
                acctThreads[recipient][sender].push({
                    id: msg.msgId || ('m-' + Date.now()),
                    from: 'them',
                    kind: msg.kind || 'text',
                    text: msg.text || '',
                    mediaUrl: msg.mediaUrl || null,
                    fileName: msg.fileName || ''
                });
                playSoftChime();
                persistAndDraw();
                var autoChk = document.getElementById('chk-autoreply');
                if (autoChk && autoChk.checked && msg.kind === 'text' && sender !== recipient) {
                    emitPacket(sender, 'text', 'رد تلقائي من سند AI: تم استلام رسالتك بنجاح.', null, '', null, recipient);
                }
            } else if (msg.type === 'msg_del') {
                var recipientDel = String(msg.to || activeAcct);
                var delSender = String(msg.from || '');
                if (acctThreads[recipientDel] && acctThreads[recipientDel][delSender]) {
                    acctThreads[recipientDel][delSender] = acctThreads[recipientDel][delSender].map(function(m) {
                        return m.id === msg.msgId ? Object.assign({}, m, { deleted: true }) : m;
                    });
                    persistAndDraw();
                }
            } else if (msg.type === 'call_sig') {
                playSoftChime();
                onCallSignal(msg);
            }
        }

        function postHttpSync(payload) {
            fetch(getBaseUrl() + '/api/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).then(function(res) {
                if (!res.ok) return null;
                httpConnected = true;
                refreshConnectionHeader();
                return res.json();
            }).then(function(data) {
                if (!data) return;
                if (Array.isArray(data.onlineIds)) {
                    onlinePeers = new Set(data.onlineIds);
                    renderPresence();
                }
                if (Array.isArray(data.events)) {
                    data.events.forEach(handleIncomingPayload);
                }
            }).catch(function() {
                httpConnected = false;
                refreshConnectionHeader();
            });
        }

        function pollHttpSync() {
            var q = encodeURIComponent(myAccts.join(','));
            fetch(getBaseUrl() + '/api/sync?ids=' + q).then(function(res) {
                if (!res.ok) return null;
                httpConnected = true;
                refreshConnectionHeader();
                return res.json();
            }).then(function(data) {
                if (!data) return;
                if (Array.isArray(data.onlineIds)) {
                    onlinePeers = new Set(data.onlineIds);
                    renderPresence();
                }
                if (Array.isArray(data.events)) {
                    data.events.forEach(handleIncomingPayload);
                }
            }).catch(function() {
                httpConnected = false;
                refreshConnectionHeader();
            });
        }

        setInterval(function() {
            postHttpSync({ type: 'register_ids', ids: myAccts, activeId: activeAcct });
            pollHttpSync();
        }, 1500);

        function openSocket() {
            try {
                var wsBase = getBaseUrl().replace(/^https:/, 'wss:').replace(/^http:/, 'ws:');
                ws = new WebSocket(wsBase);
                ws.onopen = function() {
                    wsConnected = true;
                    refreshConnectionHeader();
                    ws.send(JSON.stringify({ type: 'register_ids', ids: myAccts, activeId: activeAcct }));
                };
                ws.onclose = function() {
                    wsConnected = false;
                    refreshConnectionHeader();
                };
                ws.onerror = function() {
                    wsConnected = false;
                    refreshConnectionHeader();
                };
                ws.onmessage = function(ev) {
                    try {
                        handleIncomingPayload(JSON.parse(ev.data));
                    } catch (e) {}
                };
            } catch (e) {
                wsConnected = false;
                refreshConnectionHeader();
            }
        }

        function reconnectNow() {
            wsConnected = false;
            httpConnected = false;
            refreshConnectionHeader();
            if (ws) { try { ws.close(); } catch (e) {} }
            openSocket();
            postHttpSync({ type: 'register_ids', ids: myAccts, activeId: activeAcct });
            pollHttpSync();
        }

        function sendSignalingOrMsg(payload) {
            var enriched = Object.assign({}, payload, {
                eventId: payload.eventId || ('ev-' + Date.now() + '-' + Math.floor(Math.random() * 100000))
            });
            if (ws && ws.readyState === 1) {
                try { ws.send(JSON.stringify(enriched)); } catch (e) {}
            }
            postHttpSync(enriched);
        }

        // المكالمات الصوتية والمرئية
        var rtcConn = null;
        var localStreamObj = null;
        var pendingCall = null;
        var callPeerId = null;
        var pendingIce = [];
        var rtcConfig = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' }
            ]
        };

        function launchCall(mode, explicitTarget) {
            var target = String(explicitTarget || currentPeer || '').trim();
            if (!target) return alert('حدد معرّف أو رقم الطرف الآخر أولاً.');
            callPeerId = target;
            pendingIce = [];
            document.getElementById('call-modal').classList.remove('hidden');
            document.getElementById('call-peer-title').textContent = target + ' (' + (mode === 'video' ? 'فيديو' : 'صوت') + ')';
            document.getElementById('call-status-msg').textContent = 'جاري الاتصال...';
            document.getElementById('accept-btn').classList.add('hidden');
            setCallVisualMode(mode);

            navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
                video: mode === 'video' ? { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } : false
            }).then(function(stream) {
                localStreamObj = stream;
                if (mode === 'video') {
                    var lv = document.getElementById('local-video-el');
                    lv.srcObject = localStreamObj;
                    lv.play().catch(function() {});
                }
                createRTC(mode);
                localStreamObj.getTracks().forEach(function(t) { rtcConn.addTrack(t, localStreamObj); });
                return rtcConn.createOffer();
            }).then(function(offer) {
                return rtcConn.setLocalDescription(offer).then(function() { return offer; });
            }).then(function(offer) {
                sendSignalingOrMsg({ type: 'call_sig', to: callPeerId, from: activeAcct, sig: { op: 'offer', mode: mode, sdp: offer } });
            }).catch(function() {
                document.getElementById('call-status-msg').textContent = 'يرجى السماح بصلاحية الميكروفون أو الكاميرا';
            });
        }

        function onCallSignal(msg) {
            var sig = msg.sig;
            if (!sig) return;
            if (sig.op === 'offer') {
                pendingCall = msg;
                callPeerId = msg.from;
                pendingIce = [];
                document.getElementById('call-modal').classList.remove('hidden');
                document.getElementById('call-peer-title').textContent = msg.from + ' (' + (sig.mode === 'video' ? 'فيديو' : 'صوت') + ')';
                document.getElementById('call-status-msg').textContent = 'مكالمة واردة...';
                document.getElementById('accept-btn').classList.remove('hidden');
                setCallVisualMode(sig.mode);
            } else if (sig.op === 'answer' && rtcConn) {
                rtcConn.setRemoteDescription(new RTCSessionDescription(sig.sdp)).then(function() {
                    document.getElementById('call-status-msg').textContent = 'متصل الآن';
                    flushPendingIce();
                }).catch(function() {});
            } else if (sig.op === 'ice' && sig.candidate) {
                if (rtcConn && rtcConn.remoteDescription) {
                    rtcConn.addIceCandidate(new RTCIceCandidate(sig.candidate)).catch(function() {});
                } else {
                    pendingIce.push(sig.candidate);
                }
            } else if (sig.op === 'bye') {
                resetCallState();
            }
        }

        function flushPendingIce() {
            if (!rtcConn || !pendingIce.length) return;
            pendingIce.forEach(function(cand) {
                rtcConn.addIceCandidate(new RTCIceCandidate(cand)).catch(function() {});
            });
            pendingIce = [];
        }

        function answerCall() {
            if (!pendingCall) return;
            document.getElementById('accept-btn').classList.add('hidden');
            document.getElementById('call-status-msg').textContent = 'جاري الفتح...';
            var mode = pendingCall.sig.mode;
            setCallVisualMode(mode);
            navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
                video: mode === 'video' ? { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } : false
            }).then(function(stream) {
                localStreamObj = stream;
                if (mode === 'video') {
                    var lv = document.getElementById('local-video-el');
                    lv.srcObject = localStreamObj;
                    lv.play().catch(function() {});
                }
                createRTC(mode);
                localStreamObj.getTracks().forEach(function(t) { rtcConn.addTrack(t, localStreamObj); });
                return rtcConn.setRemoteDescription(new RTCSessionDescription(pendingCall.sig.sdp));
            }).then(function() {
                flushPendingIce();
                return rtcConn.createAnswer();
            }).then(function(ans) {
                return rtcConn.setLocalDescription(ans).then(function() { return ans; });
            }).then(function(ans) {
                sendSignalingOrMsg({ type: 'call_sig', to: pendingCall.from, from: activeAcct, sig: { op: 'answer', sdp: ans } });
                document.getElementById('call-status-msg').textContent = 'متصل الآن';
            }).catch(function() {});
        }

        function createRTC(mode) {
            if (rtcConn) { try { rtcConn.close(); } catch (e) {} }
            rtcConn = new RTCPeerConnection(rtcConfig);
            rtcConn.onicecandidate = function(e) {
                if (e.candidate && callPeerId) {
                    sendSignalingOrMsg({ type: 'call_sig', to: callPeerId, from: activeAcct, sig: { op: 'ice', candidate: e.candidate } });
                }
            };
            rtcConn.onconnectionstatechange = function() {
                if (!rtcConn) return;
                if (rtcConn.connectionState === 'connected') {
                    document.getElementById('call-status-msg').textContent = 'متصل الآن';
                } else if (rtcConn.connectionState === 'failed' || rtcConn.connectionState === 'disconnected') {
                    document.getElementById('call-status-msg').textContent = 'الشبكة غير مستقرة — جاري المحاولة...';
                }
            };
            rtcConn.ontrack = function(e) {
                var stream = (e.streams && e.streams[0]) || new MediaStream([e.track]);
                if (e.track.kind === 'video' || mode === 'video') {
                    var rv = document.getElementById('remote-video-el');
                    rv.srcObject = stream;
                    rv.muted = false;
                    rv.play().catch(function() {});
                    document.getElementById('voice-call-card').classList.add('hidden');
                }
                if (e.track.kind === 'audio') {
                    var aud = new Audio();
                    aud.srcObject = stream;
                    aud.autoplay = true;
                    aud.play().catch(function() {});
                }
            };
        }

        function setCallVisualMode(mode) {
            var lv = document.getElementById('local-video-el');
            var rv = document.getElementById('remote-video-el');
            var vc = document.getElementById('voice-call-card');
            var camBtn = document.getElementById('cam-btn');
            if (mode === 'video') {
                lv.classList.remove('hidden');
                rv.classList.remove('hidden');
                vc.classList.add('hidden');
                camBtn.classList.remove('hidden');
            } else {
                lv.classList.add('hidden');
                rv.classList.add('hidden');
                vc.classList.remove('hidden');
                camBtn.classList.add('hidden');
            }
        }

        function toggleMuteTrack() {
            if (!localStreamObj) return;
            var tr = localStreamObj.getAudioTracks()[0];
            if (!tr) return;
            tr.enabled = !tr.enabled;
            document.getElementById('mute-btn').className = tr.enabled
                ? 'w-11 h-11 rounded-2xl bg-slate-800 text-white flex items-center justify-center'
                : 'w-11 h-11 rounded-2xl bg-amber-600 text-white flex items-center justify-center';
        }

        function toggleVideoTrack() {
            if (!localStreamObj) return;
            var vtr = localStreamObj.getVideoTracks()[0];
            if (!vtr) return;
            vtr.enabled = !vtr.enabled;
            document.getElementById('cam-btn').className = vtr.enabled
                ? 'w-11 h-11 rounded-2xl bg-slate-800 text-white flex items-center justify-center'
                : 'w-11 h-11 rounded-2xl bg-amber-600 text-white flex items-center justify-center';
        }

        function endActiveCall() {
            if (callPeerId) {
                sendSignalingOrMsg({ type: 'call_sig', to: callPeerId, from: activeAcct, sig: { op: 'bye' } });
            }
            resetCallState();
        }

        function resetCallState() {
            if (rtcConn) { rtcConn.close(); rtcConn = null; }
            if (localStreamObj) { localStreamObj.getTracks().forEach(function(t) { t.stop(); }); localStreamObj = null; }
            pendingIce = [];
            document.getElementById('call-modal').classList.add('hidden');
            document.getElementById('remote-video-el').srcObject = null;
            document.getElementById('local-video-el').srcObject = null;
            pendingCall = null;
            callPeerId = null;
        }

        // الإملاء الصوتي والتسجيل الصوتي والمرفقات
        var speechRec = null;
        var dictating = false;

        function toggleSpeechDictation() {
            var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SR) return alert('الإملاء الصوتي المباشر غير مدعوم في هذا المتصفح، يمكنك استخدام زر التسجيل الصوتي.');
            var btn = document.getElementById('dictate-btn');
            if (!dictating) {
                speechRec = new SR();
                speechRec.lang = 'ar-SA';
                speechRec.interimResults = false;
                speechRec.onresult = function(ev) {
                    var transcript = (ev.results && ev.results[0] && ev.results[0][0]) ? ev.results[0][0].transcript : '';
                    if (transcript) {
                        var inp = document.getElementById('msg-box-input');
                        inp.value = (inp.value ? inp.value + ' ' : '') + transcript;
                    }
                };
                speechRec.onend = function() {
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
            var candidates = ['audio/mp4', 'audio/aac', 'audio/webm;codecs=opus', 'audio/webm'];
            if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return '';
            for (var i = 0; i < candidates.length; i++) {
                if (MediaRecorder.isTypeSupported(candidates[i])) return candidates[i];
            }
            return '';
        }

        var mediaRec = null;
        var audioBlobs = [];
        var capturingAudio = false;

        function toggleVoiceCapture() {
            var btn = document.getElementById('voice-btn');
            if (!capturingAudio) {
                navigator.mediaDevices.getUserMedia({
                    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
                }).then(function(stream) {
                    var mimeType = pickSupportedAudioMime();
                    mediaRec = mimeType ? new MediaRecorder(stream, { mimeType: mimeType }) : new MediaRecorder(stream);
                    audioBlobs = [];
                    mediaRec.ondataavailable = function(e) { if (e.data && e.data.size > 0) audioBlobs.push(e.data); };
                    mediaRec.onstop = function() {
                        var finalType = mediaRec.mimeType || mimeType || 'audio/mp4';
                        var blob = new Blob(audioBlobs, { type: finalType });
                        var reader = new FileReader();
                        reader.onloadend = function() { emitPacket(currentPeer, 'audio', 'رسالة صوتية', reader.result, 'voice-note'); };
                        reader.readAsDataURL(blob);
                        stream.getTracks().forEach(function(t) { t.stop(); });
                    };
                    mediaRec.start();
                    capturingAudio = true;
                    btn.className = 'bg-red-600 text-white p-2.5 rounded-xl animate-pulse';
                }).catch(function() {
                    alert('يرجى السماح بالوصول إلى الميكروفون.');
                });
            } else {
                mediaRec.stop();
                capturingAudio = false;
                btn.className = 'bg-slate-800 hover:bg-emerald-600 text-emerald-400 hover:text-white p-2.5 rounded-xl transition';
            }
        }

        function onFilePicked(ev) {
            var file = ev.target.files && ev.target.files[0];
            if (!file) return;
            if (file.size > 1500000) return alert('الحد الأقصى للمرفق المباشر 1.5 ميجابايت.');
            var reader = new FileReader();
            reader.onloadend = function() {
                var kind = file.type.indexOf('image/') === 0 ? 'image' : 'file';
                emitPacket(currentPeer, kind, file.name, reader.result, file.name);
            };
            reader.readAsDataURL(file);
            ev.target.value = '';
        }

        // إرسال وإدارة الرسائل
        function emitPacket(to, kind, text, mediaUrl, fileName, existingMsgId, forcedSender) {
            var cleanTo = String(to || '').trim();
            if (!cleanTo) return;
            var senderId = forcedSender || activeAcct;
            var liveDelivered = onlinePeers.has(cleanTo);
            var msgId = existingMsgId || ('m-' + Date.now() + '-' + Math.floor(Math.random() * 1000));
            if (!acctThreads[senderId]) acctThreads[senderId] = {};
            if (!acctThreads[senderId][cleanTo]) acctThreads[senderId][cleanTo] = [];
            if (!existingMsgId) {
                acctThreads[senderId][cleanTo].push({ id: msgId, from: 'me', kind: kind, text: text, mediaUrl: mediaUrl, fileName: fileName, delivered: liveDelivered });
            } else {
                acctThreads[senderId][cleanTo] = acctThreads[senderId][cleanTo].map(function(m) {
                    return m.id === existingMsgId ? Object.assign({}, m, { delivered: liveDelivered }) : m;
                });
            }
            persistAndDraw();
            sendSignalingOrMsg({ type: 'msg', to: cleanTo, from: senderId, msgId: msgId, kind: kind, text: text, mediaUrl: mediaUrl, fileName: fileName });
        }

        function retryMessage(msgId) {
            var list = getCurrentThreadMap()[currentPeer] || [];
            var item = list.find(function(m) { return m.id === msgId; });
            if (!item) return;
            emitPacket(currentPeer, item.kind, item.text, item.mediaUrl, item.fileName, item.id);
        }

        function sendTextMsg() {
            var inp = document.getElementById('msg-box-input');
            var val = inp.value.trim();
            if (!val) return;
            emitPacket(currentPeer, 'text', val, null, '');
            inp.value = '';
        }

        function deleteChatItem(msgId) {
            var map = getCurrentThreadMap();
            if (!map[currentPeer]) return;
            map[currentPeer] = map[currentPeer].map(function(m) {
                return m.id === msgId ? Object.assign({}, m, { deleted: true }) : m;
            });
            persistAndDraw();
            sendSignalingOrMsg({ type: 'msg_del', to: currentPeer, from: activeAcct, msgId: msgId });
        }

        function clearThreadMsgs() {
            getCurrentThreadMap()[currentPeer] = [];
            persistAndDraw();
        }

        function polishDraft() {
            var inp = document.getElementById('msg-box-input');
            var raw = inp.value.trim();
            if (!raw) return alert('اكتب نصاً أولاً لتحسين صياغته.');
            var cleaned = raw.replace(/\s+/g, ' ');
            if (cleaned.indexOf('السلام') !== 0 && cleaned.length < 35) {
                cleaned = 'تحية طيبة، ' + cleaned;
            }
            inp.value = /[.!؟]$/.test(cleaned) ? cleaned : cleaned + '.';
        }

        function summarizeCurrentThread() {
            var list = (getCurrentThreadMap()[currentPeer] || []).filter(function(m) { return !m.deleted && m.kind === 'text'; });
            if (!list.length) return alert('لا توجد رسائل نصية كافية لتلخيصها.');
            var lastFew = list.slice(-5).map(function(m) { return m.text; }).join(' • ');
            setPane('ai');
            var log = document.getElementById('ai-log');
            log.innerHTML += '<div class="bg-indigo-950/50 p-2 rounded-lg text-indigo-200"><strong>ملخص سند AI (' + currentPeer + '):</strong> ' + lastFew + '</div>';
            log.scrollTop = log.scrollHeight;
        }

        function askSanadAI() {
            var inp = document.getElementById('ai-q');
            var q = inp.value.trim();
            if (!q) return;
            var log = document.getElementById('ai-log');
            log.innerHTML += '<div class="bg-blue-950/50 p-2 rounded-lg text-blue-200"><strong>أنت:</strong> ' + q + '</div>';
            var reply = 'يعمل سند AI v6.5 بنظام تعدد الحسابات والسيرفرات البديلة والمزامنة السريعة والمكالمات.';
            if (q.indexOf('سيرفر') !== -1 || q.indexOf('ربط') !== -1) {
                reply = 'يمكنك إضافة سيرفر بديل من قسم الذكاء والإعدادات أو التبديل بين السيرفرات فوراً عند الحاجة.';
            }
            log.innerHTML += '<div class="bg-slate-900 p-2 rounded-lg text-slate-200"><strong>سند AI:</strong> ' + reply + '</div>';
            inp.value = '';
            log.scrollTop = log.scrollHeight;
        }

        function setPane(p) {
            ['chats', 'accounts', 'contacts', 'calls', 'ai'].forEach(function(item) {
                document.getElementById('pane-' + item).classList.add('hidden');
                var btn = document.getElementById('btn-' + item);
                if (btn) btn.className = 'flex flex-col items-center gap-1 text-slate-400 font-semibold text-[10px] px-2 py-1';
            });
            document.getElementById('pane-' + p).classList.remove('hidden');
            var activeBtn = document.getElementById('btn-' + p);
            if (activeBtn) activeBtn.className = 'flex flex-col items-center gap-1 text-blue-400 font-bold text-[10px] px-2 py-1';
        }

        function choosePeer(id) {
            var clean = String(id || '').trim();
            if (!clean) return;
            currentPeer = clean;
            var map = getCurrentThreadMap();
            if (!map[currentPeer]) map[currentPeer] = [];
            setPane('chats');
            persistAndDraw();
        }

        function openPeerByInput() {
            var inp = document.getElementById('peer-input');
            var val = inp.value.trim();
            if (!val) return alert('أدخل معرّف 8 أرقام أو رقم الجوال.');
            inp.value = '';
            choosePeer(val);
        }

        function saveCurrentPeer() {
            if (!currentPeer) return;
            if (contacts.some(function(c) { return c.id === currentPeer; })) return alert('محفوظ مسبقاً.');
            var name = prompt('اسم جهة الاتصال للرقم ' + currentPeer + ':') || ('جهة ' + currentPeer);
            contacts.push({ name: name, id: currentPeer });
            persistAndDraw();
        }

        function addNewContact() {
            var name = document.getElementById('c-name').value.trim();
            var id = document.getElementById('c-id').value.trim();
            if (!name || !id) return alert('أدخل الاسم والمعرّف أو الرقم.');
            contacts.push({ name: name, id: id });
            document.getElementById('c-name').value = '';
            document.getElementById('c-id').value = '';
            choosePeer(id);
        }

        function deleteContactAt(i) {
            contacts.splice(i, 1);
            persistAndDraw();
        }

        function shareInviteLink() {
            var msg = 'تواصل معي على سند AI عبر المعرّف: ' + activeAcct + ' على الرابط: ' + getBaseUrl();
            if (navigator.share) {
                navigator.share({ title: 'سند AI', text: msg, url: getBaseUrl() }).catch(function() {});
            } else if (navigator.clipboard) {
                navigator.clipboard.writeText(msg);
                alert('تم نسخ الدعوة: ' + msg);
            } else {
                alert(msg);
            }
        }

        function make8DigitId() {
            var code8 = Math.floor(10000000 + Math.random() * 90000000).toString();
            if (myAccts.indexOf(code8) === -1) myAccts.push(code8);
            activateAccount(code8);
        }

        function verifyPhoneAccount() {
            var ph = prompt('أدخل رقم الجوال الدولي (مثال: +967772302010):');
            if (!ph || !ph.trim()) return;
            var otp = Math.floor(100000 + Math.random() * 900000).toString();
            var code = prompt('كود التفعيل الخاص برقمك هو: ' + otp + '\\nأدخل الكود لتأكيد التفعيل:');
            if (!code || code.trim() !== otp) return alert('كود التفعيل غير مطابق.');
            var cleanPh = ph.trim();
            if (myAccts.indexOf(cleanPh) === -1) myAccts.push(cleanPh);
            activateAccount(cleanPh);
        }

        function activateAccount(id) {
            activeAcct = String(id).trim();
            getCurrentThreadMap();
            setPane('chats');
            persistAndDraw();
            sendSignalingOrMsg({ type: 'register_ids', ids: myAccts, activeId: activeAcct });
        }

        function renderPresence() {
            var isOn = onlinePeers.has(currentPeer);
            var dot = document.getElementById('peer-dot');
            var lbl = document.getElementById('peer-status');
            if (isOn) {
                dot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping';
                lbl.className = 'text-[11px] font-bold text-emerald-400';
                lbl.textContent = 'متصل الآن';
            } else {
                dot.className = 'w-2.5 h-2.5 rounded-full bg-slate-600';
                lbl.className = 'text-[11px] font-bold text-slate-400';
                lbl.textContent = 'غير متصل';
            }

            var chips = document.getElementById('quick-chips');
            chips.innerHTML = '<span class="text-[11px] text-slate-400 shrink-0">وصول سريع:</span>' + contacts.map(function(c) {
                var on = onlinePeers.has(c.id);
                return '<button onclick="choosePeer(\\'' + c.id + '\\')" class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] shrink-0 ' +
                    (c.id === currentPeer ? 'bg-blue-600/25 border-blue-500 text-white font-bold' : 'bg-slate-800/80 border-slate-700 text-slate-300') + '">' +
                    '<span class="w-2 h-2 rounded-full ' + (on ? 'bg-emerald-400' : 'bg-slate-500') + '"></span>' +
                    '<span>' + c.name + '</span></button>';
            }).join('');

            var cBox = document.getElementById('contacts-list');
            cBox.innerHTML = contacts.map(function(c, idx) {
                var on = onlinePeers.has(c.id);
                return '<div class="bg-slate-900 border border-slate-800 p-3 rounded-xl flex justify-between items-center">' +
                    '<div class="flex items-center gap-2.5">' +
                    '<span class="w-2.5 h-2.5 rounded-full ' + (on ? 'bg-emerald-500' : 'bg-slate-600') + '"></span>' +
                    '<div><p class="text-xs font-bold text-white">' + c.name + '</p>' +
                    '<p class="text-[11px] font-mono ' + (on ? 'text-emerald-400' : 'text-slate-400') + '">' + c.id + ' • ' + (on ? 'متصل الآن' : 'غير متصل') + '</p></div></div>' +
                    '<div class="flex gap-2">' +
                    '<button onclick="choosePeer(\\'' + c.id + '\\')" class="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold">مراسلة</button>' +
                    '<button onclick="deleteContactAt(' + idx + ')" class="bg-red-500/10 text-red-400 px-2.5 py-1.5 rounded-lg text-xs"><i class="fa-solid fa-trash"></i></button>' +
                    '</div></div>';
            }).join('');
        }

        function renderMsgs() {
            var box = document.getElementById('msgs-box');
            var list = getCurrentThreadMap()[currentPeer] || [];
            if (!list.length) {
                box.innerHTML = '<div class="text-center text-xs text-slate-500 py-8">ابدأ المراسلة أو أرسل صوتاً أو مرفقاً أو ابدأ مكالمة.</div>';
                return;
            }
            box.innerHTML = list.map(function(m) {
                if (m.deleted) {
                    return '<div class="text-center text-[11px] text-slate-500 italic">تم حذف الرسالة</div>';
                }
                var mine = m.from === 'me';
                var body = '<p>' + m.text + '</p>';
                if (m.kind === 'audio' && m.mediaUrl) {
                    body = '<audio controls src="' + m.mediaUrl + '" class="max-w-full h-9"></audio>';
                } else if (m.kind === 'image' && m.mediaUrl) {
                    body = '<img src="' + m.mediaUrl + '" alt="' + (m.fileName || 'صورة') + '" class="max-w-full max-h-56 rounded-xl object-contain"><p class="text-[11px] mt-1">' + m.text + '</p>';
                } else if (m.kind === 'file' && m.mediaUrl) {
                    body = '<a href="' + m.mediaUrl + '" download="' + (m.fileName || 'file') + '" class="underline flex items-center gap-1.5 text-xs"><i class="fa-solid fa-file-arrow-down"></i><span>' + (m.fileName || m.text) + '</span></a>';
                }
                var speakBtn = (m.kind === 'text' && m.text)
                    ? '<button onclick="speakText(\\'' + String(m.text).replace(/'/g, '') + '\\')" class="underline text-blue-100">استماع</button>'
                    : '';
                var deliveryLabel = mine
                    ? (m.delivered === false
                        ? '<span class="text-amber-200">غير متصل • <button onclick="retryMessage(\\'' + m.id + '\\')" class="underline">إعادة إرسال</button></span>'
                        : '<span>مرسلة ✓</span>')
                    : '<span>واردة</span>';
                return '<div class="flex ' + (mine ? 'justify-end' : 'justify-start') + '">' +
                    '<div class="' + (mine ? 'bg-blue-600 text-white rounded-tl-none' : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tr-none') + ' p-3 rounded-2xl max-w-md text-xs md:text-sm shadow space-y-1">' +
                    body +
                    '<div class="flex justify-between items-center gap-3 pt-1 border-t ' + (mine ? 'border-blue-400/30 text-blue-100' : 'border-slate-800 text-slate-400') + ' text-[10px]">' +
                    deliveryLabel +
                    '<div class="flex gap-2">' + speakBtn +
                    (mine ? '<button onclick="deleteChatItem(\\'' + m.id + '\\')" class="underline text-red-100">حذف</button>' : '') +
                    '</div></div></div></div>';
            }).join('');
            box.scrollTop = box.scrollHeight;
        }

        function renderAccts() {
            var box = document.getElementById('accounts-list');
            box.innerHTML = myAccts.map(function(id) {
                return '<div onclick="activateAccount(\\'' + id + '\\')" class="bg-slate-950 border ' + (id === activeAcct ? 'border-blue-500' : 'border-slate-800') + ' p-3 rounded-xl flex justify-between items-center cursor-pointer">' +
                    '<span class="text-xs font-mono font-bold text-white">' + id + '</span>' +
                    '<span class="text-[10px] ' + (id === activeAcct ? 'text-emerald-400 font-bold' : 'text-slate-400') + '">' + (id === activeAcct ? 'نشط' : 'تبديل') + '</span></div>';
            }).join('');
        }

        function persistAndDraw() {
            localStorage.setItem('sanad65_active', activeAcct);
            localStorage.setItem('sanad65_accts', JSON.stringify(myAccts));
            localStorage.setItem('sanad65_contacts', JSON.stringify(contacts));
            localStorage.setItem('sanad65_acct_threads', JSON.stringify(acctThreads));
            document.getElementById('active-acct-label').textContent = activeAcct;
            document.getElementById('peer-title').textContent = currentPeer;
            renderPresence();
            renderMsgs();
            renderAccts();
        }

        renderServerSelect();
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
        if (now - ts < 15000) set.add(id);
        else httpPresence.delete(id);
    });
    return Array.from(set);
}

function enqueueHttpEvent(toId, payload) {
    const clean = String(toId || '').trim();
    if (!clean) return;
    const list = httpInbox.get(clean) || [];
    list.push(payload);
    if (list.length > 80) list.shift();
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
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

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
                    const dest = socketsMap.get(String(data.to).trim());
                    if (dest && dest.readyState === 1) {
                        dest.send(JSON.stringify(data));
                    } else {
                        enqueueHttpEvent(data.to, data);
                    }
                }
            } catch (e) {}
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
    const msg = JSON.stringify({ type: 'online_users', ids: getAllOnlineIds() });
    wss.clients.forEach(c => {
        if (c.readyState === 1) c.send(msg);
    });
}

wss.on('connection', (ws) => {
    let registeredIds = [];

    ws.on('message', (raw) => {
        let data;
        try { data = JSON.parse(raw.toString()); } catch (e) { return; }

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
    console.log('Sanad AI v6.5 running on port ' + PORT);
});
