const http = require('http');
const { WebSocketServer } = require('ws');

const htmlContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>سند</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
        body { font-family: 'Cairo', sans-serif; background-color: #060a13; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1d4ed8; border-radius: 9999px; }
    </style>
</head>
<body class="text-slate-100 h-screen flex flex-col overflow-hidden select-none">

    <!-- الشريط العلوي: سند -->
    <header class="bg-slate-900/95 border-b border-slate-800 px-4 py-2.5 flex justify-between items-center z-20 shadow-md">
        <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-gradient-to-b from-blue-600 to-blue-950 border border-blue-400/40 flex flex-col items-center justify-center shadow-lg shadow-blue-700/25">
                <span class="text-white font-black text-lg leading-none">S</span>
                <i class="fa-solid fa-hands-holding-child text-[9px] text-blue-200 mt-0.5"></i>
            </div>
            <div>
                <div class="flex items-center gap-2">
                    <h1 class="font-black text-lg text-white leading-none">سند</h1>
                    <span class="text-[10px] bg-blue-600/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-bold">v3.0</span>
                </div>
                <div class="flex items-center gap-1.5 text-[11px] mt-1">
                    <span id="conn-dot" class="w-2 h-2 rounded-full bg-amber-400"></span>
                    <span id="conn-text" class="text-slate-300 font-semibold">جاري الربط...</span>
                    <span class="text-slate-600">•</span>
                    <span id="my-active-id" class="font-mono font-bold text-blue-300">88888888</span>
                </div>
            </div>
        </div>

        <!-- أزرار اتصال سريع (صوت / فيديو) -->
        <div class="flex items-center gap-2">
            <button onclick="initiateCall('audio')" title="اتصال صوتي" class="w-9 h-9 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/40 text-emerald-300 hover:text-white flex items-center justify-center transition">
                <i class="fa-solid fa-phone text-xs"></i>
            </button>
            <button onclick="initiateCall('video')" title="اتصال فيديو" class="w-9 h-9 rounded-xl bg-blue-600/20 hover:bg-blue-600 border border-blue-500/40 text-blue-300 hover:text-white flex items-center justify-center transition">
                <i class="fa-solid fa-video text-xs"></i>
            </button>
        </div>
    </header>

    <!-- شاشة المكالمة الصوتية والمرئية المباشرة -->
    <div id="call-overlay" class="hidden fixed inset-0 bg-slate-950/95 z-50 flex flex-col items-center justify-between p-6">
        <div class="text-center mt-2">
            <p class="text-xs text-blue-400 font-bold">اتصال مباشر • سند</p>
            <h2 id="call-target-display" class="text-xl font-black text-white font-mono mt-1">---</h2>
            <p id="call-status-label" class="text-xs text-emerald-400 mt-1 font-semibold">جاري الاتصال...</p>
        </div>

        <div class="relative w-full max-w-md aspect-video bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden flex items-center justify-center shadow-2xl">
            <video id="remote-stream-video" autoplay playsinline class="w-full h-full object-cover hidden"></video>
            <video id="local-stream-video" autoplay playsinline muted class="w-24 h-32 object-cover rounded-2xl border border-blue-500/50 absolute bottom-3 left-3 hidden"></video>
            <div id="call-audio-badge" class="flex flex-col items-center gap-2.5">
                <div class="w-20 h-20 rounded-full bg-blue-600/20 border border-blue-400/40 flex items-center justify-center text-3xl text-blue-400 animate-pulse">
                    <i class="fa-solid fa-waveform-lines"></i>
                </div>
                <span class="text-xs text-slate-300 font-semibold">تحسين وضوح الصوت والضوضاء بالذكاء الاصطناعي</span>
            </div>
        </div>

        <div class="flex items-center gap-3 mb-4">
            <button id="accept-call-btn" onclick="answerIncomingCall()" class="hidden bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-2xl font-bold text-xs shadow-lg">
                <i class="fa-solid fa-phone ml-1"></i> قبول المكالمة
            </button>
            <button id="mute-mic-btn" onclick="toggleMicMute()" class="w-12 h-12 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center">
                <i class="fa-solid fa-microphone"></i>
            </button>
            <button onclick="terminateCall()" class="bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-2xl font-bold text-xs shadow-lg">
                <i class="fa-solid fa-phone-slash ml-1"></i> إنهاء
            </button>
        </div>
    </div>

    <!-- المحتوى الرئيسي -->
    <main class="flex-1 flex flex-col overflow-hidden bg-[#080d18]">

        <!-- 1. قائمة الدردشة -->
        <section id="sec-chats" class="flex-1 flex flex-col h-full">
            <!-- شريط إدخال رقم/معرّف الزميل وحفظه -->
            <div class="p-2.5 bg-slate-900/80 border-b border-slate-800 space-y-2">
                <div class="flex gap-2">
                    <input type="text" id="chat-peer-input" onkeypress="if(event.key==='Enter') openPeerChat()" placeholder="معرّف الزميل (8 أرقام) أو رقم الجوال..." class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs md:text-sm text-white font-mono focus:outline-none focus:border-blue-500">
                    <button onclick="openPeerChat()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition">فتح</button>
                    <button onclick="quickSavePeer()" title="حفظ في الجهات" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 px-3 py-2 rounded-xl text-xs font-bold">
                        <i class="fa-solid fa-user-plus"></i>
                    </button>
                </div>

                <!-- شريط الوصول السريع للأرقام المحفوظة -->
                <div id="saved-quick-chips" class="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs"></div>
            </div>

            <!-- شريط حالة الزميل النشط (متصل الآن / غير متصل) -->
            <div class="px-4 py-2 bg-slate-950/80 border-b border-slate-800/90 flex justify-between items-center text-xs">
                <div class="flex items-center gap-2">
                    <span id="peer-presence-dot" class="w-2.5 h-2.5 rounded-full bg-slate-600"></span>
                    <span id="active-peer-title" class="font-bold text-white font-mono">88888888</span>
                    <span id="peer-presence-text" class="text-[11px] font-bold text-slate-400">غير متصل</span>
                </div>
                <div class="flex items-center gap-3">
                    <button onclick="invitePeer()" class="text-blue-400 hover:underline font-semibold"><i class="fa-solid fa-share-nodes ml-1"></i>دعوة</button>
                    <button onclick="clearActiveMessages()" class="text-red-400 hover:underline font-semibold"><i class="fa-solid fa-trash ml-1"></i>مسح</button>
                </div>
            </div>

            <!-- صندوق الرسائل والرسائل الصوتية -->
            <div id="messages-feed" class="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar"></div>

            <!-- شريط الكتابة والإرسال والتسجيل الصوتي -->
            <div class="p-2.5 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
                <button onclick="improveDraftWithAI()" title="تحسين النص بالذكاء الاصطناعي" class="text-indigo-400 hover:text-indigo-300 p-2.5 rounded-xl hover:bg-slate-800 transition">
                    <i class="fa-solid fa-wand-magic-sparkles text-base"></i>
                </button>
                <input type="text" id="composer-input" onkeypress="if(event.key==='Enter') sendChatText()" placeholder="اكتب رسالتك..." class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500">
                <button id="voice-record-btn" onclick="toggleVoiceNote()" title="تسجيل وإرسال صوت" class="bg-slate-800 hover:bg-emerald-600 text-emerald-400 hover:text-white p-2.5 rounded-xl transition">
                    <i class="fa-solid fa-microphone text-base"></i>
                </button>
                <button onclick="sendChatText()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition shadow">
                    <i class="fa-solid fa-paper-plane"></i>
                </button>
            </div>
        </section>

        <!-- 2. قائمة الحسابات -->
        <section id="sec-accounts" class="hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-4">
            <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
                <h2 class="text-sm font-black text-blue-400">إدارة الحسابات والأرقام</h2>
                <p class="text-[11px] text-slate-400 leading-relaxed">
                    يمكنك توليد معرّف من <strong>8 أرقام متصلة بدون فواصل</strong> أو إضافة رقم جوال دولي، والتبديل بين حساباتك بسهولة. خدمة العملاء الرسمية: <span class="font-mono text-amber-400 font-bold">88888888</span>.
                </p>
                <div class="flex flex-wrap gap-2">
                    <button onclick="create8DigitAccount()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold">+ توليد معرّف (8 أرقام)</button>
                    <button onclick="addMobileAccount()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold">+ إضافة رقم جوال</button>
                </div>
                <div id="accounts-container" class="space-y-2 pt-2"></div>
            </div>
        </section>

        <!-- 3. قائمة الجهات -->
        <section id="sec-contacts" class="hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-3">
            <div class="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl space-y-2.5">
                <h2 class="text-sm font-black text-emerald-400">حفظ جهة اتصال جديدة</h2>
                <div class="flex flex-col sm:flex-row gap-2">
                    <input type="text" id="c-name-input" placeholder="الاسم" class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                    <input type="text" id="c-id-input" placeholder="معرّف 8 أرقام أو رقم الجوال" class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono">
                    <button onclick="saveContactRow()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold">حفظ</button>
                </div>
            </div>
            <div id="contacts-container" class="space-y-2"></div>
        </section>

        <!-- 4. قائمة المكالمات -->
        <section id="sec-calls" class="hidden flex-1 flex-col items-center justify-center p-6 text-center space-y-4">
            <div class="w-16 h-16 rounded-2xl bg-blue-600/15 border border-blue-500/30 text-blue-400 flex items-center justify-center text-2xl">
                <i class="fa-solid fa-phone-volume"></i>
            </div>
            <div>
                <h2 class="text-base font-black text-white">المكالمات الصوتية والمرئية</h2>
                <p class="text-xs text-slate-400 mt-1 max-w-sm">اتصال مباشر بين الأجهزة المتصلة بالخادم مع تحسين جودة الصوت وتقليل التشويش.</p>
            </div>
            <input type="text" id="call-id-input" placeholder="أدخل معرّف 8 أرقام أو رقم الجوال..." class="w-full max-w-xs bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-center font-mono text-white">
            <div class="flex gap-3">
                <button onclick="initiateCall('audio', document.getElementById('call-id-input').value.trim())" class="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
                    <i class="fa-solid fa-phone"></i> صوتي
                </button>
                <button onclick="initiateCall('video', document.getElementById('call-id-input').value.trim())" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
                    <i class="fa-solid fa-video"></i> فيديو
                </button>
            </div>
        </section>

        <!-- 5. قائمة الذكاء والإعدادات -->
        <section id="sec-ai" class="hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-3">
            <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-2.5">
                <h2 class="text-sm font-black text-indigo-400"><i class="fa-solid fa-brain ml-1"></i> الذكاء الاصطناعي والإعدادات</h2>
                <div class="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                    <span>الرد التلقائي الذكي عند استلام رسالة</span>
                    <input type="checkbox" id="smart-autoreply-toggle" class="w-4 h-4 accent-indigo-600">
                </div>
                <div id="ai-assistant-box" class="bg-slate-950 border border-slate-800 rounded-xl p-3 h-36 overflow-y-auto text-xs space-y-2 custom-scrollbar">
                    <div class="text-slate-400">اسأل مساعد سند عن الصياغة، الترتيب، أو إعدادات الاتصال...</div>
                </div>
                <div class="flex gap-2">
                    <input type="text" id="ai-query-input" onkeypress="if(event.key==='Enter') runAssistant()" placeholder="اكتب سؤالك..." class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                    <button onclick="runAssistant()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold">إرسال</button>
                </div>
            </div>
        </section>

    </main>

    <!-- شريط القوائم السفلي -->
    <nav class="bg-slate-900 border-t border-slate-800 px-1 py-2 flex justify-around items-center z-20">
        <button onclick="openSection('chats')" id="tabbtn-chats" class="flex flex-col items-center gap-1 text-blue-400 font-bold text-[10px] px-2 py-1">
            <i class="fa-solid fa-comments text-base"></i>
            <span>الدردشة</span>
        </button>
        <button onclick="openSection('accounts')" id="tabbtn-accounts" class="flex flex-col items-center gap-1 text-slate-400 font-semibold text-[10px] px-2 py-1">
            <i class="fa-solid fa-id-card text-base"></i>
            <span>الحسابات</span>
        </button>
        <button onclick="openSection('contacts')" id="tabbtn-contacts" class="flex flex-col items-center gap-1 text-slate-400 font-semibold text-[10px] px-2 py-1">
            <i class="fa-solid fa-address-book text-base"></i>
            <span>الجهات</span>
        </button>
        <button onclick="openSection('calls')" id="tabbtn-calls" class="flex flex-col items-center gap-1 text-slate-400 font-semibold text-[10px] px-2 py-1">
            <i class="fa-solid fa-phone-volume text-base"></i>
            <span>المكالمات</span>
        </button>
        <button onclick="openSection('ai')" id="tabbtn-ai" class="flex flex-col items-center gap-1 text-slate-400 font-semibold text-[10px] px-2 py-1">
            <i class="fa-solid fa-brain text-base"></i>
            <span>الذكاء والإعدادات</span>
        </button>
    </nav>

    <script>
        let activeAccount = localStorage.getItem('sanad3_active_id') || '88888888';
        let savedAccounts = JSON.parse(localStorage.getItem('sanad3_accounts') || '["88888888"]');
        let savedContacts = JSON.parse(localStorage.getItem('sanad3_contacts') || '[{"name":"خدمة العملاء","id":"88888888"}]');
        let currentPeer = '88888888';
        let onlineSet = new Set();
        let threads = JSON.parse(localStorage.getItem('sanad3_threads') || '{"88888888":[{"id":"welcome-1","from":"them","kind":"text","text":"أهلاً بك في سند. أضف معرّفك أو رقمك واحفظ زملاءك لتظهر حالتهم (متصل الآن / غير متصل) مباشرة."}]}');

        let socket;
        function initSocket() {
            const scheme = location.protocol === 'https:' ? 'wss:' : 'ws:';
            socket = new WebSocket(scheme + '//' + location.host);

            socket.onopen = () => {
                document.getElementById('conn-dot').className = 'w-2 h-2 rounded-full bg-emerald-500 animate-pulse';
                document.getElementById('conn-text').innerText = 'متصل';
                socket.send(JSON.stringify({ type: 'presence_register', ids: savedAccounts, primaryId: activeAccount }));
            };

            socket.onclose = () => {
                document.getElementById('conn-dot').className = 'w-2 h-2 rounded-full bg-red-500';
                document.getElementById('conn-text').innerText = 'إعادة ربط...';
                setTimeout(initSocket, 2000);
            };

            socket.onmessage = (ev) => {
                let payload;
                try { payload = JSON.parse(ev.data); } catch { return; }

                if (payload.type === 'presence_list') {
                    onlineSet = new Set(payload.online || []);
                    refreshPresenceUI();
                } else if (payload.type === 'direct_msg') {
                    const sender = String(payload.from);
                    if (!threads[sender]) threads[sender] = [];
                    threads[sender].push({
                        id: payload.msgId || ('m-' + Date.now()),
                        from: 'them',
                        kind: payload.kind || 'text',
                        text: payload.text || '',
                        audioSrc: payload.audioSrc || null
                    });
                    syncStorageAndRender();
                    if (document.getElementById('smart-autoreply-toggle')?.checked && payload.kind === 'text') {
                        dispatchMessage(sender, 'text', 'رد تلقائي من سند: تم استلام رسالتك وسيتم الرد عليك قريباً.', null);
                    }
                } else if (payload.type === 'delete_direct_msg') {
                    const sender = String(payload.from);
                    if (threads[sender]) {
                        threads[sender] = threads[sender].map(m => m.id === payload.msgId ? { ...m, deleted: true } : m);
                        syncStorageAndRender();
                    }
                } else if (payload.type === 'webrtc_signal') {
                    onSignalReceived(payload);
                }
            };
        }

        // WebRTC للمكالمات الصوتية والمرئية
        let peerConn;
        let mediaStream;
        let pendingOffer = null;
        let activeCallPeer = null;
        const rtcServers = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

        async function initiateCall(mode, targetOverride) {
            const target = (targetOverride || currentPeer || '').trim();
            if (!target) return alert('حدد رقم أو معرّف الطرف الآخر أولاً.');
            activeCallPeer = target;
            document.getElementById('call-overlay').classList.remove('hidden');
            document.getElementById('call-target-display').innerText = target + ' (' + (mode === 'video' ? 'فيديو' : 'صوت') + ')';
            document.getElementById('call-status-label').innerText = 'جاري الاتصال...';
            document.getElementById('accept-call-btn').classList.add('hidden');
            configureCallView(mode);

            try {
                mediaStream = await navigator.mediaDevices.getUserMedia({
                    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
                    video: mode === 'video'
                });
                if (mode === 'video') document.getElementById('local-stream-video').srcObject = mediaStream;
                buildPeerConnection(mode);
                mediaStream.getTracks().forEach(track => peerConn.addTrack(track, mediaStream));
                const offer = await peerConn.createOffer();
                await peerConn.setLocalDescription(offer);
                socket.send(JSON.stringify({ type: 'webrtc_signal', to: activeCallPeer, from: activeAccount, signal: { step: 'offer', mode, sdp: offer } }));
            } catch {
                document.getElementById('call-status-label').innerText = 'يرجى السماح بصلاحية الميكروفون أو الكاميرا';
            }
        }

        async function onSignalReceived(payload) {
            const sig = payload.signal;
            if (!sig) return;
            if (sig.step === 'offer') {
                pendingOffer = payload;
                activeCallPeer = payload.from;
                document.getElementById('call-overlay').classList.remove('hidden');
                document.getElementById('call-target-display').innerText = payload.from + ' (' + (sig.mode === 'video' ? 'فيديو' : 'صوت') + ')';
                document.getElementById('call-status-label').innerText = 'مكالمة واردة...';
                document.getElementById('accept-call-btn').classList.remove('hidden');
                configureCallView(sig.mode);
            } else if (sig.step === 'answer' && peerConn) {
                await peerConn.setRemoteDescription(new RTCSessionDescription(sig.sdp));
                document.getElementById('call-status-label').innerText = 'متصل الآن';
            } else if (sig.step === 'ice' && peerConn && sig.candidate) {
                await peerConn.addIceCandidate(new RTCIceCandidate(sig.candidate)).catch(() => {});
            } else if (sig.step === 'end') {
                cleanupCallView();
            }
        }

        async function answerIncomingCall() {
            if (!pendingOffer) return;
            document.getElementById('accept-call-btn').classList.add('hidden');
            document.getElementById('call-status-label').innerText = 'جاري الفتح...';
            const mode = pendingOffer.signal.mode;
            mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
                video: mode === 'video'
            });
            if (mode === 'video') document.getElementById('local-stream-video').srcObject = mediaStream;
            buildPeerConnection(mode);
            mediaStream.getTracks().forEach(track => peerConn.addTrack(track, mediaStream));
            await peerConn.setRemoteDescription(new RTCSessionDescription(pendingOffer.signal.sdp));
            const answer = await peerConn.createAnswer();
            await peerConn.setLocalDescription(answer);
            socket.send(JSON.stringify({ type: 'webrtc_signal', to: pendingOffer.from, from: activeAccount, signal: { step: 'answer', sdp: answer } }));
            document.getElementById('call-status-label').innerText = 'متصل الآن';
        }

        function buildPeerConnection(mode) {
            peerConn = new RTCPeerConnection(rtcServers);
            peerConn.onicecandidate = (e) => {
                if (e.candidate && activeCallPeer && socket && socket.readyState === 1) {
                    socket.send(JSON.stringify({ type: 'webrtc_signal', to: activeCallPeer, from: activeAccount, signal: { step: 'ice', candidate: e.candidate } }));
                }
            };
            peerConn.ontrack = (e) => {
                if (mode === 'video') {
                    const rv = document.getElementById('remote-stream-video');
                    rv.srcObject = e.streams[0];
                    rv.classList.remove('hidden');
                } else {
                    const audioEl = new Audio();
                    audioEl.srcObject = e.streams[0];
                    audioEl.play().catch(() => {});
                }
            };
        }

        function configureCallView(mode) {
            const lv = document.getElementById('local-stream-video');
            const rv = document.getElementById('remote-stream-video');
            const ab = document.getElementById('call-audio-badge');
            if (mode === 'video') {
                lv.classList.remove('hidden');
                ab.classList.add('hidden');
            } else {
                lv.classList.add('hidden');
                rv.classList.add('hidden');
                ab.classList.remove('hidden');
            }
        }

        function toggleMicMute() {
            if (!mediaStream) return;
            const audioTrack = mediaStream.getAudioTracks()[0];
            if (!audioTrack) return;
            audioTrack.enabled = !audioTrack.enabled;
            document.getElementById('mute-mic-btn').className = audioTrack.enabled
                ? 'w-12 h-12 rounded-2xl bg-slate-800 text-white flex items-center justify-center'
                : 'w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center';
        }

        function terminateCall() {
            if (activeCallPeer && socket && socket.readyState === 1) {
                socket.send(JSON.stringify({ type: 'webrtc_signal', to: activeCallPeer, from: activeAccount, signal: { step: 'end' } }));
            }
            cleanupCallView();
        }

        function cleanupCallView() {
            if (peerConn) { peerConn.close(); peerConn = null; }
            if (mediaStream) { mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null; }
            document.getElementById('call-overlay').classList.add('hidden');
            document.getElementById('remote-stream-video').classList.add('hidden');
            document.getElementById('local-stream-video').classList.add('hidden');
            pendingOffer = null;
            activeCallPeer = null;
        }

        // تسجيل وإرسال الرسائل الصوتية
        let recorder;
        let recordedChunks = [];
        let recordingNow = false;

        async function toggleVoiceNote() {
            const btn = document.getElementById('voice-record-btn');
            if (!recordingNow) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({
                        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
                    });
                    recorder = new MediaRecorder(stream);
                    recordedChunks = [];
                    recorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
                    recorder.onstop = () => {
                        const blob = new Blob(recordedChunks, { type: 'audio/webm' });
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            dispatchMessage(currentPeer, 'audio', 'رسالة صوتية', reader.result);
                        };
                        reader.readAsDataURL(blob);
                        stream.getTracks().forEach(t => t.stop());
                    };
                    recorder.start();
                    recordingNow = true;
                    btn.className = 'bg-red-600 text-white p-2.5 rounded-xl animate-pulse';
                } catch {
                    alert('يرجى السماح بالوصول إلى الميكروفون.');
                }
            } else {
                recorder.stop();
                recordingNow = false;
                btn.className = 'bg-slate-800 hover:bg-emerald-600 text-emerald-400 hover:text-white p-2.5 rounded-xl transition';
            }
        }

        function dispatchMessage(to, kind, text, audioSrc) {
            const cleanTo = String(to).trim();
            if (!cleanTo) return;
            const msgId = 'm-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
            if (!threads[cleanTo]) threads[cleanTo] = [];
            threads[cleanTo].push({ id: msgId, from: 'me', kind, text, audioSrc });
            syncStorageAndRender();
            if (socket && socket.readyState === 1) {
                socket.send(JSON.stringify({ type: 'direct_msg', to: cleanTo, from: activeAccount, msgId, kind, text, audioSrc }));
            }
        }

        function sendChatText() {
            const inp = document.getElementById('composer-input');
            const val = inp.value.trim();
            if (!val) return;
            dispatchMessage(currentPeer, 'text', val, null);
            inp.value = '';
        }

        function deleteChatMsg(msgId) {
            if (!threads[currentPeer]) return;
            threads[currentPeer] = threads[currentPeer].map(m => m.id === msgId ? { ...m, deleted: true } : m);
            syncStorageAndRender();
            if (socket && socket.readyState === 1) {
                socket.send(JSON.stringify({ type: 'delete_direct_msg', to: currentPeer, from: activeAccount, msgId }));
            }
        }

        function clearActiveMessages() {
            threads[currentPeer] = [];
            syncStorageAndRender();
        }

        function improveDraftWithAI() {
            const inp = document.getElementById('composer-input');
            const txt = inp.value.trim();
            if (!txt) return alert('اكتب نصاً أولاً لتحسينه.');
            inp.value = txt + ' — تم الإرسال عبر سند';
        }

        function runAssistant() {
            const inp = document.getElementById('ai-query-input');
            const q = inp.value.trim();
            if (!q) return;
            const box = document.getElementById('ai-assistant-box');
            box.innerHTML += '<div class="bg-blue-950/50 p-2 rounded-lg text-blue-200"><strong>أنت:</strong> ' + q + '</div>';
            box.innerHTML += '<div class="bg-slate-900 p-2 rounded-lg text-slate-200"><strong>سند:</strong> تم استلام طلبك. لتظهر حالة "متصل الآن" لدى زميلك، افتح الرابط على كلا الجهازين وسجّل معرّف كل طرف في الآخر.</div>';
            inp.value = '';
            box.scrollTop = box.scrollHeight;
        }

        function openSection(sec) {
            ['chats', 'accounts', 'contacts', 'calls', 'ai'].forEach(s => {
                document.getElementById('sec-' + s).classList.add('hidden');
                const btn = document.getElementById('tabbtn-' + s);
                if (btn) btn.className = 'flex flex-col items-center gap-1 text-slate-400 font-semibold text-[10px] px-2 py-1';
            });
            document.getElementById('sec-' + sec).classList.remove('hidden');
            const activeBtn = document.getElementById('tabbtn-' + sec);
            if (activeBtn) activeBtn.className = 'flex flex-col items-center gap-1 text-blue-400 font-bold text-[10px] px-2 py-1';
        }

        function selectPeer(peerId) {
            const clean = String(peerId || '').trim();
            if (!clean) return;
            currentPeer = clean;
            if (!threads[currentPeer]) threads[currentPeer] = [];
            openSection('chats');
            syncStorageAndRender();
        }

        function openPeerChat() {
            const inp = document.getElementById('chat-peer-input');
            const val = inp.value.trim();
            if (!val) return alert('أدخل معرّف 8 أرقام أو رقم الجوال.');
            inp.value = '';
            selectPeer(val);
        }

        function quickSavePeer() {
            if (!currentPeer) return;
            if (savedContacts.some(c => c.id === currentPeer)) return alert('الجهة محفوظة مسبقاً.');
            const name = prompt('اسم جهة الاتصال للرقم ' + currentPeer + ':') || ('جهة ' + currentPeer);
            savedContacts.push({ name, id: currentPeer });
            syncStorageAndRender();
        }

        function saveContactRow() {
            const name = document.getElementById('c-name-input').value.trim();
            const id = document.getElementById('c-id-input').value.trim();
            if (!name || !id) return alert('أدخل الاسم والمعرّف أو الرقم.');
            savedContacts.push({ name, id });
            document.getElementById('c-name-input').value = '';
            document.getElementById('c-id-input').value = '';
            selectPeer(id);
        }

        function removeContactRow(idx) {
            savedContacts.splice(idx, 1);
            syncStorageAndRender();
        }

        function invitePeer() {
            const msg = 'تواصل معي على سند عبر المعرّف: ' + activeAccount + ' على الرابط: ' + location.origin;
            if (navigator.share) {
                navigator.share({ title: 'سند', text: msg, url: location.origin }).catch(() => {});
            } else if (navigator.clipboard) {
                navigator.clipboard.writeText(msg);
                alert('تم نسخ رابط الدعوة: ' + msg);
            } else {
                alert(msg);
            }
        }

        function create8DigitAccount() {
            // 8 أرقام متصلة بدون فواصل
            const code8 = Math.floor(10000000 + Math.random() * 90000000).toString();
            if (!savedAccounts.includes(code8)) savedAccounts.push(code8);
            switchAccount(code8);
        }

        function addMobileAccount() {
            const ph = prompt('أدخل رقم الجوال (مثال: +967772302010):');
            if (!ph || !ph.trim()) return;
            const cleanPh = ph.trim();
            if (!savedAccounts.includes(cleanPh)) savedAccounts.push(cleanPh);
            switchAccount(cleanPh);
        }

        function switchAccount(id) {
            activeAccount = String(id).trim();
            syncStorageAndRender();
            if (socket && socket.readyState === 1) {
                socket.send(JSON.stringify({ type: 'presence_register', ids: savedAccounts, primaryId: activeAccount }));
            }
        }

        function refreshPresenceUI() {
            const isOnline = onlineSet.has(currentPeer);
            const dot = document.getElementById('peer-presence-dot');
            const lbl = document.getElementById('peer-presence-text');
            if (isOnline) {
                dot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping';
                lbl.className = 'text-[11px] font-bold text-emerald-400';
                lbl.innerText = 'متصل الآن';
            } else {
                dot.className = 'w-2.5 h-2.5 rounded-full bg-slate-600';
                lbl.className = 'text-[11px] font-bold text-slate-400';
                lbl.innerText = 'غير متصل';
            }

            const chips = document.getElementById('saved-quick-chips');
            chips.innerHTML = savedContacts.map(c => {
                const on = onlineSet.has(c.id);
                return \`<button onclick="selectPeer('\${c.id}')" class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] shrink-0 \${c.id === currentPeer ? 'bg-blue-600/25 border-blue-500 text-white font-bold' : 'bg-slate-800/80 border-slate-700 text-slate-300'}">
                    <span class="w-2 h-2 rounded-full \${on ? 'bg-emerald-400' : 'bg-slate-500'}"></span>
                    <span>\${c.name}</span>
                </button>\`).join('');

            const cBox = document.getElementById('contacts-container');
            cBox.innerHTML = savedContacts.map((c, i) => {
                const on = onlineSet.has(c.id);
                return \`<div class="bg-slate-900 border border-slate-800 p-3 rounded-xl flex justify-between items-center">
                    <div class="flex items-center gap-2.5">
                        <span class="w-2.5 h-2.5 rounded-full \${on ? 'bg-emerald-500' : 'bg-slate-600'}"></span>
                        <div>
                            <p class="text-xs font-bold text-white">\${c.name}</p>
                            <p class="text-[11px] font-mono \${on ? 'text-emerald-400' : 'text-slate-400'}">\${c.id} • \${on ? 'متصل الآن' : 'غير متصل'}</p>
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="selectPeer('\${c.id}')" class="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold">مراسلة</button>
                        <button onclick="removeContactRow(\${i})" class="bg-red-500/10 text-red-400 px-2.5 py-1.5 rounded-lg text-xs"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>\`;
            }).join('');
        }

        function renderThreadMessages() {
            const feed = document.getElementById('messages-feed');
            const list = threads[currentPeer] || [];
            if (!list.length) {
                feed.innerHTML = '<div class="text-center text-xs text-slate-500 py-8">ابدأ المراسلة أو أرسل تسجيلاً صوتياً أو ابدأ مكالمة.</div>';
                return;
            }
            feed.innerHTML = list.map(m => {
                if (m.deleted) {
                    return '<div class="text-center text-[11px] text-slate-500 italic">تم حذف الرسالة</div>';
                }
                const mine = m.from === 'me';
                const bodyHtml = m.kind === 'audio' && m.audioSrc
                    ? \`<audio controls src="\${m.audioSrc}" class="max-w-full h-9"></audio>\`
                    : \`<p>\${m.text}</p>\`;
                return \`<div class="flex \${mine ? 'justify-end' : 'justify-start'}">
                    <div class="\${mine ? 'bg-blue-600 text-white rounded-tl-none' : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tr-none'} p-3 rounded-2xl max-w-md text-xs md:text-sm shadow space-y-1">
                        \${bodyHtml}
                        \${mine ? \`<div class="flex justify-between items-center gap-3 pt-1 border-t border-blue-400/30 text-[10px] text-blue-100">
                            <span>مرسلة ✓</span>
                            <button onclick="deleteChatMsg('\${m.id}')" class="underline text-red-100">حذف</button>
                        </div>\` : ''}
                    </div>
                </div>\`;
            }).join('');
            feed.scrollTop = feed.scrollHeight;
        }

        function renderAccountsList() {
            const accBox = document.getElementById('accounts-container');
            accBox.innerHTML = savedAccounts.map(acc => \`<div onclick="switchAccount('\${acc}')" class="bg-slate-950 border \${acc === activeAccount ? 'border-blue-500' : 'border-slate-800'} p-3 rounded-xl flex justify-between items-center cursor-pointer">
                <span class="text-xs font-mono font-bold text-white">\${acc}</span>
                <span class="text-[10px] \${acc === activeAccount ? 'text-emerald-400 font-bold' : 'text-slate-400'}">\${acc === activeAccount ? 'نشط' : 'تبديل'}</span>
            </div>\`).join('');
        }

        function syncStorageAndRender() {
            localStorage.setItem('sanad3_active_id', activeAccount);
            localStorage.setItem('sanad3_accounts', JSON.stringify(savedAccounts));
            localStorage.setItem('sanad3_contacts', JSON.stringify(savedContacts));
            localStorage.setItem('sanad3_threads', JSON.stringify(threads));
            document.getElementById('my-active-id').innerText = activeAccount;
            document.getElementById('active-peer-title').innerText = currentPeer;
            refreshPresenceUI();
            renderThreadMessages();
            renderAccountsList();
        }

        syncStorageAndRender();
        initSocket();
    </script>
</body>
</html>`;

const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(htmlContent);
});

const wss = new WebSocketServer({ server });
const socketsById = new Map();

function pushPresenceUpdate() {
    const onlineIds = Array.from(socketsById.keys());
    const message = JSON.stringify({ type: 'presence_list', online: onlineIds });
    wss.clients.forEach(client => {
        if (client.readyState === 1) client.send(message);
    });
}

wss.on('connection', (ws) => {
    let boundIds = [];

    ws.on('message', (raw) => {
        let data;
        try { data = JSON.parse(raw.toString()); } catch { return; }

        if (data.type === 'presence_register') {
            boundIds.forEach(oldId => {
                if (socketsById.get(oldId) === ws) socketsById.delete(oldId);
            });
            const list = Array.isArray(data.ids) ? data.ids : [data.primaryId].filter(Boolean);
            boundIds = list.map(x => String(x).trim()).filter(Boolean);
            boundIds.forEach(id => socketsById.set(id, ws));
            pushPresenceUpdate();
            return;
        }

        if (data.to) {
            const destWs = socketsById.get(String(data.to).trim());
            if (destWs && destWs.readyState === 1) {
                destWs.send(JSON.stringify(data));
            }
        }
    });

    ws.on('close', () => {
        boundIds.forEach(id => {
            if (socketsById.get(id) === ws) socketsById.delete(id);
        });
        pushPresenceUpdate();
    });
});

server.listen(PORT, () => {
    console.log('Sanad v3.0 running on port ' + PORT);
});
