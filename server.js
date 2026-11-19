const http = require('http');
const { WebSocketServer } = require('ws');

const htmlContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>سند AI</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
        body { font-family: 'Cairo', sans-serif; background-color: #050912; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1d4ed8; border-radius: 9999px; }
        @keyframes tickerMove {
            0% { transform: translateX(0%); }
            100% { transform: translateX(-50%); }
        }
        .ticker-track {
            display: inline-flex;
            white-space: nowrap;
            animation: tickerMove 24s linear infinite;
        }
    </style>
</head>
<body class="text-slate-100 h-screen flex flex-col overflow-hidden select-none">

    <!-- الشريط الإخباري الذكي العابر للحدود -->
    <div class="bg-blue-950/90 border-b border-blue-800/60 py-1 px-2 overflow-hidden text-[11px] text-blue-200 z-30">
        <div class="ticker-track gap-8 font-semibold">
            <span>⚡ سند AI: قناة الاتصال اللحظي العالمية مفعّلة • خدمة العملاء الموحدة: 88888888</span>
            <span>🛰️ مسار التوجيه الذكي منخفض الاستهلاك جاهز لدعم الاتصال في الشبكات المتغيرة</span>
            <span>🎙️ تحسين وضوح الصوت وتنقية الضوضاء بالذكاء الاصطناعي للمكالمات والرسائل الصوتية</span>
            <span>⚡ سند AI: قناة الاتصال اللحظي العالمية مفعّلة • خدمة العملاء الموحدة: 88888888</span>
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
                    <span class="text-[10px] bg-blue-600/25 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-bold">AI v4.0</span>
                </div>
                <div class="flex items-center gap-1.5 text-[11px] mt-1">
                    <span id="link-dot" class="w-2 h-2 rounded-full bg-amber-400"></span>
                    <span id="link-status" class="text-slate-300 font-semibold">جاري الربط...</span>
                    <button onclick="forceReconnect()" title="إعادة ربط فوري" class="text-blue-400 hover:text-blue-300 px-1"><i class="fa-solid fa-rotate-right text-[10px]"></i></button>
                    <span class="text-slate-600">•</span>
                    <span id="current-account-id" class="font-mono font-bold text-blue-300">88888888</span>
                </div>
            </div>
        </div>

        <!-- أزرار المكالمات الفورية (صوتي / فيديو) -->
        <div class="flex items-center gap-2">
            <button onclick="startCall('audio')" title="مكالمة صوتية" class="w-9 h-9 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/40 text-emerald-300 hover:text-white flex items-center justify-center transition">
                <i class="fa-solid fa-phone text-xs"></i>
            </button>
            <button onclick="startCall('video')" title="مكالمة فيديو" class="w-9 h-9 rounded-xl bg-blue-600/20 hover:bg-blue-600 border border-blue-500/40 text-blue-300 hover:text-white flex items-center justify-center transition">
                <i class="fa-solid fa-video text-xs"></i>
            </button>
        </div>
    </header>

    <!-- نافذة المكالمة الصوتية والمرئية -->
    <div id="call-screen" class="hidden fixed inset-0 bg-slate-950/95 z-50 flex flex-col items-center justify-between p-5">
        <div class="text-center mt-2">
            <p class="text-xs text-blue-400 font-bold">سند AI • اتصال مباشر</p>
            <h2 id="call-remote-id" class="text-xl font-black text-white font-mono mt-1">---</h2>
            <p id="call-state-text" class="text-xs text-emerald-400 mt-1 font-semibold">جاري الاتصال...</p>
        </div>

        <div class="relative w-full max-w-md aspect-video bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden flex items-center justify-center shadow-2xl">
            <video id="remote-vid" autoplay playsinline class="w-full h-full object-cover hidden"></video>
            <video id="local-vid" autoplay playsinline muted class="w-24 h-32 object-cover rounded-2xl border border-blue-500/50 absolute bottom-3 left-3 hidden"></video>
            <div id="audio-wave-box" class="flex flex-col items-center gap-2.5">
                <div class="w-20 h-20 rounded-full bg-blue-600/20 border border-blue-400/40 flex items-center justify-center text-3xl text-blue-400 animate-pulse">
                    <i class="fa-solid fa-microphone-lines"></i>
                </div>
                <span class="text-xs text-slate-300 font-semibold">وضوح صوتي عالٍ مدعوم بالذكاء الاصطناعي</span>
            </div>
        </div>

        <div class="flex items-center gap-3 mb-4">
            <button id="btn-accept" onclick="acceptCall()" class="hidden bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-2xl font-bold text-xs shadow-lg">
                <i class="fa-solid fa-phone ml-1"></i> رد
            </button>
            <button id="btn-mute-audio" onclick="toggleMute()" class="w-12 h-12 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center">
                <i class="fa-solid fa-microphone"></i>
            </button>
            <button onclick="hangupCall()" class="bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-2xl font-bold text-xs shadow-lg">
                <i class="fa-solid fa-phone-slash ml-1"></i> إنهاء
            </button>
        </div>
    </div>

    <!-- المحتوى الرئيسي -->
    <main class="flex-1 flex flex-col overflow-hidden bg-[#070c17]">

        <!-- 1. الدردشة -->
        <section id="view-chats" class="flex-1 flex flex-col h-full">
            <div class="p-2.5 bg-slate-900/80 border-b border-slate-800 space-y-2">
                <div class="flex gap-2">
                    <input type="text" id="peer-search-input" onkeypress="if(event.key==='Enter') openPeer()" placeholder="معرّف الزميل (8 أرقام) أو رقم الجوال..." class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs md:text-sm text-white font-mono focus:outline-none focus:border-blue-500">
                    <button onclick="openPeer()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition">فتح</button>
                    <button onclick="savePeerContact()" title="حفظ في الجهات" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 px-3 py-2 rounded-xl text-xs font-bold">
                        <i class="fa-solid fa-user-plus"></i>
                    </button>
                </div>
                <div id="quick-contacts-row" class="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs"></div>
            </div>

            <!-- حالة الزميل: متصل الآن / غير متصل -->
            <div class="px-4 py-2 bg-slate-950/80 border-b border-slate-800/90 flex justify-between items-center text-xs">
                <div class="flex items-center gap-2">
                    <span id="peer-status-dot" class="w-2.5 h-2.5 rounded-full bg-slate-600"></span>
                    <span id="active-peer-name" class="font-bold text-white font-mono">88888888</span>
                    <span id="peer-status-text" class="text-[11px] font-bold text-slate-400">غير متصل</span>
                </div>
                <div class="flex items-center gap-3">
                    <button onclick="shareAppInvite()" class="text-blue-400 hover:underline font-semibold"><i class="fa-solid fa-share-nodes ml-1"></i>دعوة</button>
                    <button onclick="clearThread()" class="text-red-400 hover:underline font-semibold"><i class="fa-solid fa-trash ml-1"></i>مسح</button>
                </div>
            </div>

            <!-- صندوق الرسائل والمرفقات والصوتيات -->
            <div id="chat-feed" class="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar"></div>

            <!-- شريط الإدخال: مرفقات + ذكاء AI + نص + صوت + إرسال -->
            <div class="p-2.5 bg-slate-900 border-t border-slate-800 flex items-center gap-1.5">
                <input type="file" id="file-picker" class="hidden" onchange="handleAttachmentSelected(event)">
                <button onclick="document.getElementById('file-picker').click()" title="إرفاق ملف أو صورة" class="text-amber-400 hover:text-amber-300 p-2 rounded-xl hover:bg-slate-800 transition">
                    <i class="fa-solid fa-paperclip text-base"></i>
                </button>
                <button onclick="enhanceTextAI()" title="تحسين الصياغة بالذكاء الاصطناعي" class="text-indigo-400 hover:text-indigo-300 p-2 rounded-xl hover:bg-slate-800 transition">
                    <i class="fa-solid fa-wand-magic-sparkles text-base"></i>
                </button>
                <input type="text" id="msg-composer" onkeypress="if(event.key==='Enter') sendText()" placeholder="اكتب رسالتك..." class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500">
                <button id="rec-voice-btn" onclick="toggleVoiceRecording()" title="تسجيل وإرسال صوت" class="bg-slate-800 hover:bg-emerald-600 text-emerald-400 hover:text-white p-2.5 rounded-xl transition">
                    <i class="fa-solid fa-microphone text-base"></i>
                </button>
                <button onclick="sendText()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition shadow">
                    <i class="fa-solid fa-paper-plane"></i>
                </button>
            </div>
        </section>

        <!-- 2. الحسابات وتفعيل الأرقام (8 أرقام بدون فواصل أو رقم جوال) -->
        <section id="view-accounts" class="hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-4">
            <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
                <h2 class="text-sm font-black text-blue-400">إدارة الحسابات والتفعيل</h2>
                <p class="text-[11px] text-slate-400 leading-relaxed">
                    ولّد معرّفاً من <strong>8 أرقام متصلة بدون فواصل</strong> أو فعّل رقم جوالك الدولي بكود تحقق، وتنقل بين حساباتك بسهولة. رقم خدمة العملاء: <span class="font-mono text-amber-400 font-bold">88888888</span>.
                </p>
                <div class="flex flex-wrap gap-2">
                    <button onclick="generate8DigitCode()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold">+ معرّف جديد (8 أرقام)</button>
                    <button onclick="activatePhoneNumber()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold">+ تفعيل رقم جوال بكود</button>
                </div>
                <div id="accounts-list-box" class="space-y-2 pt-2"></div>
            </div>
        </section>

        <!-- 3. الجهات -->
        <section id="view-contacts" class="hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-3">
            <div class="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl space-y-2.5">
                <h2 class="text-sm font-black text-emerald-400">إضافة جهة اتصال</h2>
                <div class="flex flex-col sm:flex-row gap-2">
                    <input type="text" id="add-c-name" placeholder="الاسم" class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                    <input type="text" id="add-c-id" placeholder="معرّف 8 أرقام أو رقم الجوال" class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono">
                    <button onclick="addContactEntry()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold">حفظ</button>
                </div>
            </div>
            <div id="contacts-list-box" class="space-y-2"></div>
        </section>

        <!-- 4. المكالمات -->
        <section id="view-calls" class="hidden flex-1 flex-col items-center justify-center p-6 text-center space-y-4">
            <div class="w-16 h-16 rounded-2xl bg-blue-600/15 border border-blue-500/30 text-blue-400 flex items-center justify-center text-2xl">
                <i class="fa-solid fa-phone-volume"></i>
            </div>
            <div>
                <h2 class="text-base font-black text-white">المكالمات الصوتية والمرئية</h2>
                <p class="text-xs text-slate-400 mt-1 max-w-sm">اتصال مباشر عبر المتصفح مع تحسين الصوت وتقليل استهلاك البيانات.</p>
            </div>
            <input type="text" id="dial-target-input" placeholder="أدخل معرّف 8 أرقام أو رقم الجوال..." class="w-full max-w-xs bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-center font-mono text-white">
            <div class="flex gap-3">
                <button onclick="startCall('audio', document.getElementById('dial-target-input').value.trim())" class="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
                    <i class="fa-solid fa-phone"></i> صوتي
                </button>
                <button onclick="startCall('video', document.getElementById('dial-target-input').value.trim())" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
                    <i class="fa-solid fa-video"></i> فيديو
                </button>
            </div>
        </section>

        <!-- 5. الذكاء والإعدادات -->
        <section id="view-ai" class="hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-3">
            <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-2.5">
                <h2 class="text-sm font-black text-indigo-400"><i class="fa-solid fa-brain ml-1"></i> سند AI والإعدادات</h2>
                <div class="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                    <span>الرد التلقائي الذكي عند استلام رسالة</span>
                    <input type="checkbox" id="ai-autoreply-chk" class="w-4 h-4 accent-indigo-600">
                </div>
                <div class="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                    <span>وضع توفير البيانات والتوجيه السريع</span>
                    <input type="checkbox" id="low-data-chk" checked class="w-4 h-4 accent-blue-600">
                </div>
                <div id="ai-log-box" class="bg-slate-950 border border-slate-800 rounded-xl p-3 h-32 overflow-y-auto text-xs space-y-2 custom-scrollbar">
                    <div class="text-slate-400">مساعد سند AI جاهز لمساعدتك في الصياغة، الترتيب، والاتصال.</div>
                </div>
                <div class="flex gap-2">
                    <input type="text" id="ai-input-box" onkeypress="if(event.key==='Enter') sendToAI()" placeholder="اسأل سند AI..." class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                    <button onclick="sendToAI()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold">إرسال</button>
                </div>
            </div>
        </section>

    </main>

    <!-- شريط القوائم السفلي -->
    <nav class="bg-slate-900 border-t border-slate-800 px-1 py-2 flex justify-around items-center z-20">
        <button onclick="switchView('chats')" id="nav-chats" class="flex flex-col items-center gap-1 text-blue-400 font-bold text-[10px] px-2 py-1">
            <i class="fa-solid fa-comments text-base"></i>
            <span>الدردشة</span>
        </button>
        <button onclick="switchView('accounts')" id="nav-accounts" class="flex flex-col items-center gap-1 text-slate-400 font-semibold text-[10px] px-2 py-1">
            <i class="fa-solid fa-id-card text-base"></i>
            <span>الحسابات</span>
        </button>
        <button onclick="switchView('contacts')" id="nav-contacts" class="flex flex-col items-center gap-1 text-slate-400 font-semibold text-[10px] px-2 py-1">
            <i class="fa-solid fa-address-book text-base"></i>
            <span>الجهات</span>
        </button>
        <button onclick="switchView('calls')" id="nav-calls" class="flex flex-col items-center gap-1 text-slate-400 font-semibold text-[10px] px-2 py-1">
            <i class="fa-solid fa-phone-volume text-base"></i>
            <span>المكالمات</span>
        </button>
        <button onclick="switchView('ai')" id="nav-ai" class="flex flex-col items-center gap-1 text-slate-400 font-semibold text-[10px] px-2 py-1">
            <i class="fa-solid fa-brain text-base"></i>
            <span>الذكاء والإعدادات</span>
        </button>
    </nav>

    <script>
        let activeId = localStorage.getItem('sanad4_active_id') || '88888888';
        let myIds = JSON.parse(localStorage.getItem('sanad4_my_ids') || '["88888888"]');
        let myContacts = JSON.parse(localStorage.getItem('sanad4_contacts') || '[{"name":"خدمة العملاء","id":"88888888"}]');
        let currentPeer = '88888888';
        let onlineIdsSet = new Set();
        let msgStore = JSON.parse(localStorage.getItem('sanad4_msgs') || '{"88888888":[{"id":"m-init","from":"them","kind":"text","text":"أهلاً بك في سند AI. النظام مرتب ويعمل بكافة أقسامه."}]}');

        let wsClient;
        let reconnectTimer = null;

        function connectSocket() {
            clearTimeout(reconnectTimer);
            const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
            try {
                wsClient = new WebSocket(proto + '//' + location.host);
            } catch {
                reconnectTimer = setTimeout(connectSocket, 2000);
                return;
            }

            wsClient.onopen = () => {
                document.getElementById('link-dot').className = 'w-2 h-2 rounded-full bg-emerald-500 animate-pulse';
                document.getElementById('link-status').innerText = 'متصل';
                wsClient.send(JSON.stringify({ type: 'register_ids', ids: myIds, activeId }));
            };

            wsClient.onclose = () => {
                document.getElementById('link-dot').className = 'w-2 h-2 rounded-full bg-amber-400';
                document.getElementById('link-status').innerText = 'إعادة ربط...';
                reconnectTimer = setTimeout(connectSocket, 2000);
            };

            wsClient.onmessage = (ev) => {
                let data;
                try { data = JSON.parse(ev.data); } catch { return; }

                if (data.type === 'online_users') {
                    onlineIdsSet = new Set(data.ids || []);
                    renderPresence();
                } else if (data.type === 'msg') {
                    const sender = String(data.from);
                    if (!msgStore[sender]) msgStore[sender] = [];
                    msgStore[sender].push({
                        id: data.msgId || ('m-' + Date.now()),
                        from: 'them',
                        kind: data.kind || 'text',
                        text: data.text || '',
                        mediaUrl: data.mediaUrl || null,
                        fileName: data.fileName || ''
                    });
                    saveAndRender();
                    if (document.getElementById('ai-autoreply-chk')?.checked && data.kind === 'text') {
                        sendPacket(sender, 'text', 'رد تلقائي من سند AI: تم استلام رسالتك وسيتم الرد عليك قريباً.', null, '');
                    }
                } else if (data.type === 'msg_del') {
                    const sender = String(data.from);
                    if (msgStore[sender]) {
                        msgStore[sender] = msgStore[sender].map(m => m.id === data.msgId ? { ...m, deleted: true } : m);
                        saveAndRender();
                    }
                } else if (data.type === 'call_sig') {
                    handleSignal(data);
                }
            };
        }

        function forceReconnect() {
            document.getElementById('link-status').innerText = 'جاري الربط...';
            if (wsClient) { try { wsClient.close(); } catch {} }
            connectSocket();
        }

        // WebRTC مكالمات صوتية وفيديو
        let rtcPeer;
        let localMedia;
        let incomingOffer = null;
        let callTargetId = null;
        const rtcCfg = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

        async function startCall(kind, overrideTarget) {
            const target = (overrideTarget || currentPeer || '').trim();
            if (!target) return alert('حدد معرّف أو رقم الطرف الآخر أولاً.');
            callTargetId = target;
            document.getElementById('call-screen').classList.remove('hidden');
            document.getElementById('call-remote-id').innerText = target + ' (' + (kind === 'video' ? 'فيديو' : 'صوت') + ')';
            document.getElementById('call-state-text').innerText = 'جاري الاتصال...';
            document.getElementById('btn-accept').classList.add('hidden');
            toggleCallMediaView(kind);

            try {
                localMedia = await navigator.mediaDevices.getUserMedia({
                    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
                    video: kind === 'video'
                });
                if (kind === 'video') document.getElementById('local-vid').srcObject = localMedia;
                setupPeer(kind);
                localMedia.getTracks().forEach(t => rtcPeer.addTrack(t, localMedia));
                const offer = await rtcPeer.createOffer();
                await rtcPeer.setLocalDescription(offer);
                if (wsClient && wsClient.readyState === 1) {
                    wsClient.send(JSON.stringify({ type: 'call_sig', to: callTargetId, from: activeId, sig: { op: 'offer', kind, sdp: offer } }));
                }
            } catch {
                document.getElementById('call-state-text').innerText = 'يرجى السماح بصلاحية الميكروفون أو الكاميرا';
            }
        }

        async function handleSignal(data) {
            const sig = data.sig;
            if (!sig) return;
            if (sig.op === 'offer') {
                incomingOffer = data;
                callTargetId = data.from;
                document.getElementById('call-screen').classList.remove('hidden');
                document.getElementById('call-remote-id').innerText = data.from + ' (' + (sig.kind === 'video' ? 'فيديو' : 'صوت') + ')';
                document.getElementById('call-state-text').innerText = 'مكالمة واردة...';
                document.getElementById('btn-accept').classList.remove('hidden');
                toggleCallMediaView(sig.kind);
            } else if (sig.op === 'answer' && rtcPeer) {
                await rtcPeer.setRemoteDescription(new RTCSessionDescription(sig.sdp));
                document.getElementById('call-state-text').innerText = 'متصل الآن';
            } else if (sig.op === 'ice' && rtcPeer && sig.candidate) {
                await rtcPeer.addIceCandidate(new RTCIceCandidate(sig.candidate)).catch(() => {});
            } else if (sig.op === 'bye') {
                resetCallUI();
            }
        }

        async function acceptCall() {
            if (!incomingOffer) return;
            document.getElementById('btn-accept').classList.add('hidden');
            document.getElementById('call-state-text').innerText = 'جاري الفتح...';
            const kind = incomingOffer.sig.kind;
            localMedia = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
                video: kind === 'video'
            });
            if (kind === 'video') document.getElementById('local-vid').srcObject = localMedia;
            setupPeer(kind);
            localMedia.getTracks().forEach(t => rtcPeer.addTrack(t, localMedia));
            await rtcPeer.setRemoteDescription(new RTCSessionDescription(incomingOffer.sig.sdp));
            const ans = await rtcPeer.createAnswer();
            await rtcPeer.setLocalDescription(ans);
            if (wsClient && wsClient.readyState === 1) {
                wsClient.send(JSON.stringify({ type: 'call_sig', to: incomingOffer.from, from: activeId, sig: { op: 'answer', sdp: ans } }));
            }
            document.getElementById('call-state-text').innerText = 'متصل الآن';
        }

        function setupPeer(kind) {
            rtcPeer = new RTCPeerConnection(rtcCfg);
            rtcPeer.onicecandidate = (e) => {
                if (e.candidate && callTargetId && wsClient && wsClient.readyState === 1) {
                    wsClient.send(JSON.stringify({ type: 'call_sig', to: callTargetId, from: activeId, sig: { op: 'ice', candidate: e.candidate } }));
                }
            };
            rtcPeer.ontrack = (e) => {
                if (kind === 'video') {
                    const rv = document.getElementById('remote-vid');
                    rv.srcObject = e.streams[0];
                    rv.classList.remove('hidden');
                } else {
                    const el = new Audio();
                    el.srcObject = e.streams[0];
                    el.play().catch(() => {});
                }
            };
        }

        function toggleCallMediaView(kind) {
            const lv = document.getElementById('local-vid');
            const rv = document.getElementById('remote-vid');
            const ab = document.getElementById('audio-wave-box');
            if (kind === 'video') {
                lv.classList.remove('hidden');
                ab.classList.add('hidden');
            } else {
                lv.classList.add('hidden');
                rv.classList.add('hidden');
                ab.classList.remove('hidden');
            }
        }

        function toggleMute() {
            if (!localMedia) return;
            const tr = localMedia.getAudioTracks()[0];
            if (!tr) return;
            tr.enabled = !tr.enabled;
            document.getElementById('btn-mute-audio').className = tr.enabled
                ? 'w-12 h-12 rounded-2xl bg-slate-800 text-white flex items-center justify-center'
                : 'w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center';
        }

        function hangupCall() {
            if (callTargetId && wsClient && wsClient.readyState === 1) {
                wsClient.send(JSON.stringify({ type: 'call_sig', to: callTargetId, from: activeId, sig: { op: 'bye' } }));
            }
            resetCallUI();
        }

        function resetCallUI() {
            if (rtcPeer) { rtcPeer.close(); rtcPeer = null; }
            if (localMedia) { localMedia.getTracks().forEach(t => t.stop()); localMedia = null; }
            document.getElementById('call-screen').classList.add('hidden');
            document.getElementById('remote-vid').classList.add('hidden');
            document.getElementById('local-vid').classList.add('hidden');
            incomingOffer = null;
            callTargetId = null;
        }

        // تسجيل وإرسال الأصوات والمرفقات
        let recObj;
        let recChunks = [];
        let recordingActive = false;

        async function toggleVoiceRecording() {
            const btn = document.getElementById('rec-voice-btn');
            if (!recordingActive) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({
                        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
                    });
                    recObj = new MediaRecorder(stream);
                    recChunks = [];
                    recObj.ondataavailable = e => { if (e.data.size > 0) recChunks.push(e.data); };
                    recObj.onstop = () => {
                        const blob = new Blob(recChunks, { type: 'audio/webm' });
                        const reader = new FileReader();
                        reader.onloadend = () => sendPacket(currentPeer, 'audio', 'رسالة صوتية', reader.result, 'voice.webm');
                        reader.readAsDataURL(blob);
                        stream.getTracks().forEach(t => t.stop());
                    };
                    recObj.start();
                    recordingActive = true;
                    btn.className = 'bg-red-600 text-white p-2.5 rounded-xl animate-pulse';
                } catch {
                    alert('يرجى السماح بالوصول إلى الميكروفون.');
                }
            } else {
                recObj.stop();
                recordingActive = false;
                btn.className = 'bg-slate-800 hover:bg-emerald-600 text-emerald-400 hover:text-white p-2.5 rounded-xl transition';
            }
        }

        function handleAttachmentSelected(ev) {
            const file = ev.target.files?.[0];
            if (!file) return;
            if (file.size > 1500000) return alert('الحد الأقصى للمرفق المباشر 1.5 ميجابايت.');
            const reader = new FileReader();
            reader.onloadend = () => {
                const kind = file.type.startsWith('image/') ? 'image' : 'file';
                sendPacket(currentPeer, kind, file.name, reader.result, file.name);
            };
            reader.readAsDataURL(file);
            ev.target.value = '';
        }

        function sendPacket(to, kind, text, mediaUrl, fileName) {
            const cleanTo = String(to).trim();
            if (!cleanTo) return;
            const msgId = 'm-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
            if (!msgStore[cleanTo]) msgStore[cleanTo] = [];
            msgStore[cleanTo].push({ id: msgId, from: 'me', kind, text, mediaUrl, fileName });
            saveAndRender();
            if (wsClient && wsClient.readyState === 1) {
                wsClient.send(JSON.stringify({ type: 'msg', to: cleanTo, from: activeId, msgId, kind, text, mediaUrl, fileName }));
            }
        }

        function sendText() {
            const inp = document.getElementById('msg-composer');
            const val = inp.value.trim();
            if (!val) return;
            sendPacket(currentPeer, 'text', val, null, '');
            inp.value = '';
        }

        function deleteItem(msgId) {
            if (!msgStore[currentPeer]) return;
            msgStore[currentPeer] = msgStore[currentPeer].map(m => m.id === msgId ? { ...m, deleted: true } : m);
            saveAndRender();
            if (wsClient && wsClient.readyState === 1) {
                wsClient.send(JSON.stringify({ type: 'msg_del', to: currentPeer, from: activeId, msgId }));
            }
        }

        function clearThread() {
            msgStore[currentPeer] = [];
            saveAndRender();
        }

        function enhanceTextAI() {
            const inp = document.getElementById('msg-composer');
            const txt = inp.value.trim();
            if (!txt) return alert('اكتب نصاً أولاً لتحسينه.');
            inp.value = txt + ' (عبر سند AI)';
        }

        function sendToAI() {
            const inp = document.getElementById('ai-input-box');
            const q = inp.value.trim();
            if (!q) return;
            const box = document.getElementById('ai-log-box');
            box.innerHTML += '<div class="bg-blue-950/50 p-2 rounded-lg text-blue-200"><strong>أنت:</strong> ' + q + '</div>';
            box.innerHTML += '<div class="bg-slate-900 p-2 rounded-lg text-slate-200"><strong>سند AI:</strong> تم استلام طلبك. تأكد من فتح الرابط على كلا الجهازين وإدخال معرّف كل طرف في الآخر لظهور حالة متصل الآن.</div>';
            inp.value = '';
            box.scrollTop = box.scrollHeight;
        }

        function switchView(v) {
            ['chats', 'accounts', 'contacts', 'calls', 'ai'].forEach(item => {
                document.getElementById('view-' + item).classList.add('hidden');
                const btn = document.getElementById('nav-' + item);
                if (btn) btn.className = 'flex flex-col items-center gap-1 text-slate-400 font-semibold text-[10px] px-2 py-1';
            });
            document.getElementById('view-' + v).classList.remove('hidden');
            const activeBtn = document.getElementById('nav-' + v);
            if (activeBtn) activeBtn.className = 'flex flex-col items-center gap-1 text-blue-400 font-bold text-[10px] px-2 py-1';
        }

        function pickPeer(id) {
            const clean = String(id || '').trim();
            if (!clean) return;
            currentPeer = clean;
            if (!msgStore[currentPeer]) msgStore[currentPeer] = [];
            switchView('chats');
            saveAndRender();
        }

        function openPeer() {
            const inp = document.getElementById('peer-search-input');
            const val = inp.value.trim();
            if (!val) return alert('أدخل معرّف 8 أرقام أو رقم الجوال.');
            inp.value = '';
            pickPeer(val);
        }

        function savePeerContact() {
            if (!currentPeer) return;
            if (myContacts.some(c => c.id === currentPeer)) return alert('محفوظ مسبقاً.');
            const name = prompt('اسم جهة الاتصال للرقم ' + currentPeer + ':') || ('جهة ' + currentPeer);
            myContacts.push({ name, id: currentPeer });
            saveAndRender();
        }

        function addContactEntry() {
            const name = document.getElementById('add-c-name').value.trim();
            const id = document.getElementById('add-c-id').value.trim();
            if (!name || !id) return alert('أدخل الاسم والمعرّف أو الرقم.');
            myContacts.push({ name, id });
            document.getElementById('add-c-name').value = '';
            document.getElementById('add-c-id').value = '';
            pickPeer(id);
        }

        function removeContactEntry(i) {
            myContacts.splice(i, 1);
            saveAndRender();
        }

        function shareAppInvite() {
            const msg = 'تواصل معي على سند عبر المعرّف: ' + activeId + ' على الرابط: ' + location.origin;
            if (navigator.share) {
                navigator.share({ title: 'سند', text: msg, url: location.origin }).catch(() => {});
            } else if (navigator.clipboard) {
                navigator.clipboard.writeText(msg);
                alert('تم نسخ الدعوة: ' + msg);
            } else {
                alert(msg);
            }
        }

        // 8 أرقام متصلة بدون فواصل
        function generate8DigitCode() {
            const code8 = Math.floor(10000000 + Math.random() * 90000000).toString();
            if (!myIds.includes(code8)) myIds.push(code8);
            selectAccount(code8);
        }

        function activatePhoneNumber() {
            const ph = prompt('أدخل رقم الجوال (مثال: +967772302010):');
            if (!ph || !ph.trim()) return;
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const entered = prompt('كود التفعيل الخاص برقمك هو: ' + otp + '\\nأدخل الكود لتأكيد التفعيل:');
            if (!entered || entered.trim() !== otp) return alert('كود التفعيل غير مطابق.');
            const cleanPh = ph.trim();
            if (!myIds.includes(cleanPh)) myIds.push(cleanPh);
            selectAccount(cleanPh);
        }

        function selectAccount(id) {
            activeId = String(id).trim();
            saveAndRender();
            if (wsClient && wsClient.readyState === 1) {
                wsClient.send(JSON.stringify({ type: 'register_ids', ids: myIds, activeId }));
            }
        }

        function renderPresence() {
            const isOnline = onlineIdsSet.has(currentPeer);
            const dot = document.getElementById('peer-status-dot');
            const lbl = document.getElementById('peer-status-text');
            if (isOnline) {
                dot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping';
                lbl.className = 'text-[11px] font-bold text-emerald-400';
                lbl.innerText = 'متصل الآن';
            } else {
                dot.className = 'w-2.5 h-2.5 rounded-full bg-slate-600';
                lbl.className = 'text-[11px] font-bold text-slate-400';
                lbl.innerText = 'غير متصل';
            }

            const row = document.getElementById('quick-contacts-row');
            row.innerHTML = myContacts.map(c => {
                const on = onlineIdsSet.has(c.id);
                return \`<button onclick="pickPeer('\${c.id}')" class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] shrink-0 \${c.id === currentPeer ? 'bg-blue-600/25 border-blue-500 text-white font-bold' : 'bg-slate-800/80 border-slate-700 text-slate-300'}">
                    <span class="w-2 h-2 rounded-full \${on ? 'bg-emerald-400' : 'bg-slate-500'}"></span>
                    <span>\${c.name}</span>
                </button>\`).join('');

            const box = document.getElementById('contacts-list-box');
            box.innerHTML = myContacts.map((c, idx) => {
                const on = onlineIdsSet.has(c.id);
                return \`<div class="bg-slate-900 border border-slate-800 p-3 rounded-xl flex justify-between items-center">
                    <div class="flex items-center gap-2.5">
                        <span class="w-2.5 h-2.5 rounded-full \${on ? 'bg-emerald-500' : 'bg-slate-600'}"></span>
                        <div>
                            <p class="text-xs font-bold text-white">\${c.name}</p>
                            <p class="text-[11px] font-mono \${on ? 'text-emerald-400' : 'text-slate-400'}">\${c.id} • \${on ? 'متصل الآن' : 'غير متصل'}</p>
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="pickPeer('\${c.id}')" class="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold">مراسلة</button>
                        <button onclick="removeContactEntry(\${idx})" class="bg-red-500/10 text-red-400 px-2.5 py-1.5 rounded-lg text-xs"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>\`;
            }).join('');
        }

        function renderFeed() {
            const feed = document.getElementById('chat-feed');
            const list = msgStore[currentPeer] || [];
            if (!list.length) {
                feed.innerHTML = '<div class="text-center text-xs text-slate-500 py-8">ابدأ المراسلة أو أرسل صوتاً أو مرفقاً أو ابدأ مكالمة.</div>';
                return;
            }
            feed.innerHTML = list.map(m => {
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
                return \`<div class="flex \${mine ? 'justify-end' : 'justify-start'}">
                    <div class="\${mine ? 'bg-blue-600 text-white rounded-tl-none' : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tr-none'} p-3 rounded-2xl max-w-md text-xs md:text-sm shadow space-y-1">
                        \${body}
                        \${mine ? \`<div class="flex justify-between items-center gap-3 pt-1 border-t border-blue-400/30 text-[10px] text-blue-100">
                            <span>مرسلة ✓</span>
                            <button onclick="deleteItem('\${m.id}')" class="underline text-red-100">حذف</button>
                        </div>\` : ''}
                    </div>
                </div>\`;
            }).join('');
            feed.scrollTop = feed.scrollHeight;
        }

        function renderAccounts() {
            const box = document.getElementById('accounts-list-box');
            box.innerHTML = myIds.map(id => \`<div onclick="selectAccount('\${id}')" class="bg-slate-950 border \${id === activeId ? 'border-blue-500' : 'border-slate-800'} p-3 rounded-xl flex justify-between items-center cursor-pointer">
                <span class="text-xs font-mono font-bold text-white">\${id}</span>
                <span class="text-[10px] \${id === activeId ? 'text-emerald-400 font-bold' : 'text-slate-400'}">\${id === activeId ? 'نشط' : 'تبديل'}</span>
            </div>\`).join('');
        }

        function saveAndRender() {
            localStorage.setItem('sanad4_active_id', activeId);
            localStorage.setItem('sanad4_my_ids', JSON.stringify(myIds));
            localStorage.setItem('sanad4_contacts', JSON.stringify(myContacts));
            localStorage.setItem('sanad4_msgs', JSON.stringify(msgStore));
            document.getElementById('current-account-id').innerText = activeId;
            document.getElementById('active-peer-name').innerText = currentPeer;
            renderPresence();
            renderFeed();
            renderAccounts();
        }

        saveAndRender();
        connectSocket();
    </script>
</body>
</html>`;

const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(htmlContent);
});

const wss = new WebSocketServer({ server });
const socketsMap = new Map();

function broadcastOnline() {
    const ids = Array.from(socketsMap.keys());
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
            broadcastOnline();
            return;
        }

        if (data.to) {
            const dest = socketsMap.get(String(data.to).trim());
            if (dest && dest.readyState === 1) {
                dest.send(JSON.stringify(data));
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
    console.log('Sanad AI v4.0 running on port ' + PORT);
});
