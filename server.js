const http = require('http');
const { WebSocketServer } = require('ws');

const htmlContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>السند</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;900&display=swap');
        body { font-family: 'Cairo', sans-serif; background-color: #070b14; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #2563eb; border-radius: 10px; }
    </style>
</head>
<body class="text-slate-100 h-screen flex flex-col overflow-hidden select-none">

    <!-- الشريط العلوي: السند -->
    <header class="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex justify-between items-center shadow-lg z-20">
        <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-gradient-to-b from-blue-600 to-blue-900 border border-blue-400/40 flex flex-col items-center justify-center shadow-lg shadow-blue-600/20">
                <span class="text-white font-black text-lg leading-none">S</span>
                <i class="fa-solid fa-hands-holding-child text-[9px] text-blue-200 mt-0.5"></i>
            </div>
            <div>
                <h1 class="font-black text-lg text-white leading-tight">السند</h1>
                <div class="flex items-center gap-2 text-[11px]">
                    <span id="ws-status-dot" class="w-2 h-2 rounded-full bg-amber-400"></span>
                    <span id="ws-status-text" class="text-slate-300 font-semibold">جاري الربط...</span>
                    <span class="text-slate-500">|</span>
                    <span class="text-blue-300 font-mono font-bold" id="my-id-label">36246004</span>
                </div>
            </div>
        </div>

        <!-- أزرار اتصال سريع للزميل النشط -->
        <div class="flex items-center gap-2">
            <button onclick="startMediaCall('audio')" title="مكالمة صوتية" class="w-9 h-9 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/40 text-emerald-300 hover:text-white flex items-center justify-center transition">
                <i class="fa-solid fa-phone text-sm"></i>
            </button>
            <button onclick="startMediaCall('video')" title="مكالمة فيديو" class="w-9 h-9 rounded-xl bg-blue-600/20 hover:bg-blue-600 border border-blue-500/40 text-blue-300 hover:text-white flex items-center justify-center transition">
                <i class="fa-solid fa-video text-sm"></i>
            </button>
        </div>
    </header>

    <!-- نافذة المكالمة الصوتية / المرئية المباشرة -->
    <div id="call-modal" class="hidden fixed inset-0 bg-slate-950/95 z-50 flex flex-col items-center justify-between p-6">
        <div class="text-center mt-4">
            <p class="text-xs text-blue-400 font-bold mb-1">اتصال مباشر عبر السند (محسّن بالذكاء الاصطناعي)</p>
            <h2 id="call-peer-title" class="text-xl font-black text-white font-mono">---</h2>
            <p id="call-state-label" class="text-xs text-emerald-400 mt-1">جاري الاتصال...</p>
        </div>

        <div class="relative w-full max-w-md aspect-video bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden flex items-center justify-center shadow-2xl">
            <video id="remote-video" autoplay playsinline class="w-full h-full object-cover hidden"></video>
            <video id="local-video" autoplay playsinline muted class="w-24 h-32 object-cover rounded-2xl border border-blue-500/50 absolute bottom-3 left-3 hidden"></video>
            <div id="audio-call-avatar" class="flex flex-col items-center gap-3">
                <div class="w-24 h-24 rounded-full bg-blue-600/20 border border-blue-400/40 flex items-center justify-center text-4xl text-blue-400 animate-pulse">
                    <i class="fa-solid fa-microphone-lines"></i>
                </div>
                <span class="text-xs text-slate-300 font-semibold">صوت نقي وعالي الوضوح (AI Noise Cancel)</span>
            </div>
        </div>

        <div class="flex items-center gap-4 mb-6">
            <button onclick="acceptIncomingCall()" id="btn-accept-call" class="hidden bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3.5 rounded-2xl font-bold text-sm shadow-lg">
                <i class="fa-solid fa-phone ml-1"></i> رد على المكالمة
            </button>
            <button onclick="toggleMuteMic()" id="btn-mute" class="w-12 h-12 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center">
                <i class="fa-solid fa-microphone"></i>
            </button>
            <button onclick="endCall()" class="bg-red-600 hover:bg-red-700 text-white px-6 py-3.5 rounded-2xl font-bold text-sm shadow-lg">
                <i class="fa-solid fa-phone-slash ml-1"></i> إنهاء
            </button>
        </div>
    </div>

    <!-- المحتوى الرئيسي -->
    <main class="flex-1 flex flex-col overflow-hidden relative bg-[#090e1a]">

        <!-- 1. قسم الدردشة المباشرة والرسائل والصوت -->
        <div id="tab-chats" class="flex-1 flex flex-col h-full">
            <!-- شريط إدخال رقم/معرّف الزميل وحفظه -->
            <div class="p-2.5 bg-slate-900/80 border-b border-slate-800 space-y-2">
                <div class="flex gap-2">
                    <input type="text" id="peer-input" placeholder="معرّف الزميل (8 أرقام) أو رقمه..." class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs md:text-sm focus:outline-none focus:border-blue-500 text-white font-mono">
                    <button onclick="openPeerFromInput()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition">فتح</button>
                    <button onclick="saveActivePeer()" title="حفظ في الجهات" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-user-plus"></i></button>
                </div>

                <!-- شريط الوصول السريع وحالة الاتصال الفورية -->
                <div id="quick-peers-bar" class="flex items-center gap-2 overflow-x-auto pb-0.5 text-xs"></div>
            </div>

            <!-- شريط حالة الزميل الحالي (متصل الآن / غير متصل) -->
            <div class="px-4 py-2 bg-slate-950/75 border-b border-slate-800 flex justify-between items-center text-xs">
                <div class="flex items-center gap-2">
                    <span id="peer-online-dot" class="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
                    <span class="font-bold text-white font-mono" id="active-peer-id">88888888</span>
                    <span id="peer-online-label" class="text-[11px] font-bold text-slate-400">غير متصل</span>
                </div>
                <div class="flex items-center gap-3">
                    <button onclick="shareInvite()" class="text-blue-400 hover:underline font-semibold"><i class="fa-solid fa-share-nodes ml-1"></i>دعوة</button>
                    <button onclick="clearChat()" class="text-red-400 hover:underline font-semibold"><i class="fa-solid fa-trash ml-1"></i>مسح</button>
                </div>
            </div>

            <!-- صندوق الرسائل والملفات الصوتية -->
            <div id="chat-messages" class="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar"></div>

            <!-- شريط إرسال الرسائل والتسجيل الصوتي المباشر -->
            <div class="p-2.5 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
                <button onclick="aiPolishMessage()" title="تحسين صياغة الرسالة بالذكاء الاصطناعي" class="text-indigo-400 hover:text-indigo-300 p-2.5 rounded-xl hover:bg-slate-800 transition">
                    <i class="fa-solid fa-wand-magic-sparkles text-base"></i>
                </button>
                <input type="text" id="msg-text" onkeypress="if(event.key==='Enter') sendTextMessage()" placeholder="اكتب رسالتك..." class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-blue-500 text-white">
                <button onclick="toggleAudioRecording()" id="btn-record" title="تسجيل وإرسال صوت واضح" class="bg-slate-800 hover:bg-emerald-600 text-emerald-400 hover:text-white p-2.5 rounded-xl transition">
                    <i class="fa-solid fa-microphone text-base"></i>
                </button>
                <button onclick="sendTextMessage()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition shadow">
                    <i class="fa-solid fa-paper-plane"></i>
                </button>
            </div>
        </div>

        <!-- 2. قسم جهات الاتصال وحالة المتصلين -->
        <div id="tab-contacts" class="hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-3">
            <div class="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl space-y-2.5">
                <h2 class="text-sm font-black text-emerald-400">إضافة زميل وحفظ رقمه</h2>
                <div class="flex flex-col sm:flex-row gap-2">
                    <input type="text" id="new-c-name" placeholder="اسم الزميل" class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                    <input type="text" id="new-c-id" placeholder="معرّف 8 أرقام أو رقم الجوال" class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono">
                    <button onclick="addContactBtn()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold">حفظ</button>
                </div>
            </div>
            <div id="contacts-list" class="space-y-2"></div>
        </div>

        <!-- 3. قسم الحسابات والأرقام -->
        <div id="tab-accounts" class="hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-3">
            <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
                <h2 class="text-sm font-black text-blue-400">حساباتي وأرقامي في السند</h2>
                <div class="flex flex-wrap gap-2">
                    <button onclick="generateNew8Id()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold">+ معرّف جديد (8 أرقام)</button>
                    <button onclick="addPhoneAcc()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold">+ إضافة رقم جوال</button>
                </div>
                <div id="accounts-list" class="space-y-2 pt-2"></div>
            </div>
        </div>

        <!-- 4. قسم الذكاء الاصطناعي والتحسينات والإعدادات -->
        <div id="tab-ai" class="hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-3">
            <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-2">
                <h2 class="text-sm font-black text-indigo-400"><i class="fa-solid fa-brain ml-1"></i> مساعد السند الذكي</h2>
                <p class="text-[11px] text-slate-400">تحسين وضوح الصوت، صياغة الرسائل، والرد الذكي التلقائي.</p>
                <div class="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                    <span>الرد التلقائي بالذكاء الاصطناعي عند عدم التواجد</span>
                    <input type="checkbox" id="auto-ai-reply" class="w-4 h-4 accent-indigo-600">
                </div>
                <div id="ai-chat-area" class="bg-slate-950 border border-slate-800 rounded-xl p-3 h-40 overflow-y-auto text-xs space-y-2 custom-scrollbar">
                    <div class="text-slate-400">اسأل مساعد السند عن أي شيء...</div>
                </div>
                <div class="flex gap-2">
                    <input type="text" id="ai-prompt" onkeypress="if(event.key==='Enter') askAI()" placeholder="اكتب سؤالك..." class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                    <button onclick="askAI()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold">إرسال</button>
                </div>
            </div>
        </div>

    </main>

    <!-- شريط التنقل السفلي -->
    <nav class="bg-slate-900 border-t border-slate-800 px-2 py-2 flex justify-around items-center z-20">
        <button onclick="switchTab('chats')" id="nav-chats" class="flex flex-col items-center gap-1 text-blue-400 font-bold text-[10px] px-2 py-1">
            <i class="fa-solid fa-comments text-base"></i>
            <span>الدردشة</span>
        </button>
        <button onclick="switchTab('contacts')" id="nav-contacts" class="flex flex-col items-center gap-1 text-slate-400 font-semibold text-[10px] px-2 py-1">
            <i class="fa-solid fa-address-book text-base"></i>
            <span>الجهات</span>
        </button>
        <button onclick="switchTab('accounts')" id="nav-accounts" class="flex flex-col items-center gap-1 text-slate-400 font-semibold text-[10px] px-2 py-1">
            <i class="fa-solid fa-id-card text-base"></i>
            <span>الحسابات</span>
        </button>
        <button onclick="switchTab('ai')" id="nav-ai" class="flex flex-col items-center gap-1 text-slate-400 font-semibold text-[10px] px-2 py-1">
            <i class="fa-solid fa-brain text-base"></i>
            <span>الذكاء والإعدادات</span>
        </button>
    </nav>

    <script>
        let myId = localStorage.getItem('sanad_v2_id') || '36246004';
        let myAccounts = JSON.parse(localStorage.getItem('sanad_v2_accs') || '["36246004"]');
        let contacts = JSON.parse(localStorage.getItem('sanad_v2_contacts') || '[{"name":"خدمة العملاء","id":"88888888"}]');
        let activePeer = '88888888';
        let onlineUsers = new Set();
        let messagesMap = JSON.parse(localStorage.getItem('sanad_v2_msgs') || '{"88888888":[{"from":"them","type":"text","text":"أهلاً بك في السند. ستظهر هنا حالة زميلك (متصل الآن أو غير متصل) فور فتحه للتطبيق."}]}');

        // WebSocket للاتصال اللحظي الحقيقي بين الأجهزة
        let ws;
        function connectWS() {
            const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
            ws = new WebSocket(proto + '//' + location.host);

            ws.onopen = () => {
                document.getElementById('ws-status-dot').className = 'w-2 h-2 rounded-full bg-emerald-500 animate-pulse';
                document.getElementById('ws-status-text').innerText = 'متصل بالخادم';
                ws.send(JSON.stringify({ type: 'register', userId: myId }));
            };

            ws.onclose = () => {
                document.getElementById('ws-status-dot').className = 'w-2 h-2 rounded-full bg-red-500';
                document.getElementById('ws-status-text').innerText = 'إعادة ربط...';
                setTimeout(connectWS, 2500);
            };

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'presence') {
                    onlineUsers = new Set(data.onlineIds || []);
                    renderPresence();
                } else if (data.type === 'chat_message') {
                    const sender = data.from;
                    if (!messagesMap[sender]) messagesMap[sender] = [];
                    messagesMap[sender].push({
                        id: data.msgId || ('m-' + Date.now()),
                        from: 'them',
                        msgType: data.msgType || 'text',
                        text: data.text || '',
                        audioData: data.audioData || null
                    });
                    persist();
                    if (document.getElementById('auto-ai-reply')?.checked && data.msgType === 'text') {
                        const reply = 'رسالة تلقائية ذكية من السند: تم استلام رسالتك وسيتم الرد عليك قريباً.';
                        sendPayloadToPeer(sender, 'text', reply, null);
                    }
                } else if (data.type === 'delete_msg') {
                    const list = messagesMap[data.from] || [];
                    messagesMap[data.from] = list.map(m => m.id === data.msgId ? { ...m, deleted: true } : m);
                    persist();
                } else if (data.type === 'call_signal') {
                    handleCallSignal(data);
                }
            };
        }

        // WebRTC للمكالمات الصوتية والمرئية المباشرة
        let pc;
        let localStream;
        let incomingCallData = null;
        let currentCallPeer = null;
        const rtcConfig = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

        async function startMediaCall(mediaType) {
            currentCallPeer = activePeer;
            document.getElementById('call-modal').classList.remove('hidden');
            document.getElementById('call-peer-title').innerText = currentCallPeer + ' (' + (mediaType === 'video' ? 'فيديو' : 'صوت') + ')';
            document.getElementById('call-state-label').innerText = 'جاري الرنين على الطرف الآخر...';
            document.getElementById('btn-accept-call').classList.add('hidden');
            setupMediaUI(mediaType);

            try {
                localStream = await navigator.mediaDevices.getUserMedia({
                    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
                    video: mediaType === 'video'
                });
                if (mediaType === 'video') document.getElementById('local-video').srcObject = localStream;
                createPeerConnection(mediaType);
                localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                ws.send(JSON.stringify({ type: 'call_signal', to: currentCallPeer, from: myId, signal: { kind: 'offer', mediaType, sdp: offer } }));
            } catch (e) {
                document.getElementById('call-state-label').innerText = 'يرجى السماح بصلاحية الميكروفون/الكاميرا لإتمام الاتصال';
            }
        }

        async function handleCallSignal(data) {
            const sig = data.signal;
            if (sig.kind === 'offer') {
                incomingCallData = data;
                currentCallPeer = data.from;
                document.getElementById('call-modal').classList.remove('hidden');
                document.getElementById('call-peer-title').innerText = data.from + ' (' + (sig.mediaType === 'video' ? 'فيديو' : 'صوت') + ')';
                document.getElementById('call-state-label').innerText = 'مكالمة واردة الآن...';
                document.getElementById('btn-accept-call').classList.remove('hidden');
                setupMediaUI(sig.mediaType);
            } else if (sig.kind === 'answer' && pc) {
                await pc.setRemoteDescription(new RTCSessionDescription(sig.sdp));
                document.getElementById('call-state-label').innerText = 'متصل الآن بصوت واضح';
            } else if (sig.kind === 'candidate' && pc && sig.candidate) {
                await pc.addIceCandidate(new RTCIceCandidate(sig.candidate)).catch(() => {});
            } else if (sig.kind === 'hangup') {
                closeCallUI();
            }
        }

        async function acceptIncomingCall() {
            if (!incomingCallData) return;
            document.getElementById('btn-accept-call').classList.add('hidden');
            document.getElementById('call-state-label').innerText = 'جاري فتح الاتصال...';
            const mediaType = incomingCallData.signal.mediaType;
            localStream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
                video: mediaType === 'video'
            });
            if (mediaType === 'video') document.getElementById('local-video').srcObject = localStream;
            createPeerConnection(mediaType);
            localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
            await pc.setRemoteDescription(new RTCSessionDescription(incomingCallData.signal.sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            ws.send(JSON.stringify({ type: 'call_signal', to: incomingCallData.from, from: myId, signal: { kind: 'answer', sdp: answer } }));
            document.getElementById('call-state-label').innerText = 'متصل الآن';
        }

        function createPeerConnection(mediaType) {
            pc = new RTCPeerConnection(rtcConfig);
            pc.onicecandidate = (e) => {
                if (e.candidate && currentCallPeer) {
                    ws.send(JSON.stringify({ type: 'call_signal', to: currentCallPeer, from: myId, signal: { kind: 'candidate', candidate: e.candidate } }));
                }
            };
            pc.ontrack = (e) => {
                if (mediaType === 'video') {
                    const rv = document.getElementById('remote-video');
                    rv.srcObject = e.streams[0];
                    rv.classList.remove('hidden');
                } else {
                    const aud = new Audio();
                    aud.srcObject = e.streams[0];
                    aud.play().catch(() => {});
                }
            };
        }

        function setupMediaUI(mediaType) {
            const lv = document.getElementById('local-video');
            const rv = document.getElementById('remote-video');
            const av = document.getElementById('audio-call-avatar');
            if (mediaType === 'video') {
                lv.classList.remove('hidden');
                av.classList.add('hidden');
            } else {
                lv.classList.add('hidden');
                rv.classList.add('hidden');
                av.classList.remove('hidden');
            }
        }

        function toggleMuteMic() {
            if (!localStream) return;
            const track = localStream.getAudioTracks()[0];
            if (!track) return;
            track.enabled = !track.enabled;
            document.getElementById('btn-mute').className = track.enabled
                ? 'w-12 h-12 rounded-2xl bg-slate-800 text-white flex items-center justify-center'
                : 'w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center';
        }

        function endCall() {
            if (currentCallPeer && ws && ws.readyState === 1) {
                ws.send(JSON.stringify({ type: 'call_signal', to: currentCallPeer, from: myId, signal: { kind: 'hangup' } }));
            }
            closeCallUI();
        }

        function closeCallUI() {
            if (pc) { pc.close(); pc = null; }
            if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream = null; }
            document.getElementById('call-modal').classList.add('hidden');
            document.getElementById('remote-video').classList.add('hidden');
            document.getElementById('local-video').classList.add('hidden');
            incomingCallData = null;
            currentCallPeer = null;
        }

        // تسجيل وإرسال الأصوات عبر الميكروفون
        let mediaRecorder;
        let audioChunks = [];
        let isRecording = false;

        async function toggleAudioRecording() {
            const btn = document.getElementById('btn-record');
            if (!isRecording) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({
                        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
                    });
                    mediaRecorder = new MediaRecorder(stream);
                    audioChunks = [];
                    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
                    mediaRecorder.onstop = () => {
                        const blob = new Blob(audioChunks, { type: 'audio/webm' });
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            sendPayloadToPeer(activePeer, 'audio', 'رسالة صوتية', reader.result);
                        };
                        reader.readAsDataURL(blob);
                        stream.getTracks().forEach(t => t.stop());
                    };
                    mediaRecorder.start();
                    isRecording = true;
                    btn.className = 'bg-red-600 text-white p-2.5 rounded-xl animate-pulse';
                } catch (e) {
                    alert('يرجى السماح بالوصول إلى الميكروفون لإرسال الصوت.');
                }
            } else {
                mediaRecorder.stop();
                isRecording = false;
                btn.className = 'bg-slate-800 hover:bg-emerald-600 text-emerald-400 hover:text-white p-2.5 rounded-xl transition';
            }
        }

        function sendPayloadToPeer(to, msgType, text, audioData) {
            const msgId = 'm-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
            if (!messagesMap[to]) messagesMap[to] = [];
            messagesMap[to].push({ id: msgId, from: 'me', msgType, text, audioData });
            persist();
            if (ws && ws.readyState === 1) {
                ws.send(JSON.stringify({ type: 'chat_message', to, from: myId, msgId, msgType, text, audioData }));
            }
        }

        function sendTextMessage() {
            const input = document.getElementById('msg-text');
            const text = input.value.trim();
            if (!text) return;
            sendPayloadToPeer(activePeer, 'text', text, null);
            input.value = '';
        }

        function deleteMessageForBoth(msgId) {
            messagesMap[activePeer] = (messagesMap[activePeer] || []).map(m => m.id === msgId ? { ...m, deleted: true } : m);
            persist();
            if (ws && ws.readyState === 1) {
                ws.send(JSON.stringify({ type: 'delete_msg', to: activePeer, from: myId, msgId }));
            }
        }

        function aiPolishMessage() {
            const input = document.getElementById('msg-text');
            const raw = input.value.trim();
            if (!raw) return alert('اكتب نصاً أولاً ليقوم الذكاء الاصطناعي بتحسين صياغته.');
            input.value = 'تحية طيبة، ' + raw + ' (مرسلة عبر السند)';
        }

        function askAI() {
            const inp = document.getElementById('ai-prompt');
            const q = inp.value.trim();
            if (!q) return;
            const area = document.getElementById('ai-chat-area');
            area.innerHTML += '<div class="bg-blue-950/50 p-2 rounded-lg text-blue-200"><strong>أنت:</strong> ' + q + '</div>';
            area.innerHTML += '<div class="bg-slate-900 p-2 rounded-lg text-slate-200"><strong>مساعد السند:</strong> تم تفعيل تحسين وضوح الصوت، الربط اللحظي، وحالة المتصلين. للوصول لأعلى كفاءة، افتح الرابط على جهازك وجهاز زميلك معاً.</div>';
            inp.value = '';
            area.scrollTop = area.scrollHeight;
        }

        function switchTab(tab) {
            ['chats', 'contacts', 'accounts', 'ai'].forEach(t => {
                document.getElementById('tab-' + t).classList.add('hidden');
                const n = document.getElementById('nav-' + t);
                if (n) n.className = "flex flex-col items-center gap-1 text-slate-400 font-semibold text-[10px] px-2 py-1";
            });
            document.getElementById('tab-' + tab).classList.remove('hidden');
            const active = document.getElementById('nav-' + tab);
            if (active) active.className = "flex flex-col items-center gap-1 text-blue-400 font-bold text-[10px] px-2 py-1";
        }

        function setActivePeer(id) {
            if (!id) return;
            activePeer = id.trim();
            if (!messagesMap[activePeer]) messagesMap[activePeer] = [];
            switchTab('chats');
            persist();
        }

        function openPeerFromInput() {
            const val = document.getElementById('peer-input').value.trim();
            if (!val) return alert('أدخل معرّف الزميل أو رقمه.');
            document.getElementById('peer-input').value = '';
            setActivePeer(val);
        }

        function saveActivePeer() {
            if (contacts.some(c => c.id === activePeer)) return alert('محفوظ مسبقاً.');
            const name = prompt('اسم الزميل للمعرّف ' + activePeer + ':') || ('زميل ' + activePeer);
            contacts.push({ name, id: activePeer });
            persist();
        }

        function addContactBtn() {
            const name = document.getElementById('new-c-name').value.trim();
            const id = document.getElementById('new-c-id').value.trim();
            if (!name || !id) return alert('أدخل الاسم والمعرّف أو الرقم.');
            contacts.push({ name, id });
            document.getElementById('new-c-name').value = '';
            document.getElementById('new-c-id').value = '';
            setActivePeer(id);
        }

        function deleteContact(idx) {
            contacts.splice(idx, 1);
            persist();
        }

        function clearChat() {
            messagesMap[activePeer] = [];
            persist();
        }

        function shareInvite() {
            const txt = 'تواصل معي على السند عبر المعرّف: ' + myId + ' على الرابط: ' + location.origin;
            if (navigator.share) {
                navigator.share({ title: 'السند', text: txt, url: location.origin }).catch(() => {});
            } else if (navigator.clipboard) {
                navigator.clipboard.writeText(txt);
                alert('تم نسخ الدعوة: ' + txt);
            } else {
                alert(txt);
            }
        }

        function generateNew8Id() {
            const id8 = Math.floor(10000000 + Math.random() * 90000000).toString();
            myAccounts.push(id8);
            switchAccount(id8);
        }

        function addPhoneAcc() {
            const ph = prompt('أدخل رقم الجوال:');
            if (!ph || !ph.trim()) return;
            myAccounts.push(ph.trim());
            switchAccount(ph.trim());
        }

        function switchAccount(id) {
            myId = id;
            persist();
            if (ws && ws.readyState === 1) {
                ws.send(JSON.stringify({ type: 'register', userId: myId }));
            }
        }

        function renderPresence() {
            const isOnline = onlineUsers.has(activePeer);
            const dot = document.getElementById('peer-online-dot');
            const lbl = document.getElementById('peer-online-label');
            if (isOnline) {
                dot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping';
                lbl.className = 'text-[11px] font-bold text-emerald-400';
                lbl.innerText = 'متصل الآن';
            } else {
                dot.className = 'w-2.5 h-2.5 rounded-full bg-slate-500';
                lbl.className = 'text-[11px] font-bold text-slate-400';
                lbl.innerText = 'غير متصل';
            }
            renderContactsAndQuickBar();
        }

        function renderContactsAndQuickBar() {
            const qBar = document.getElementById('quick-peers-bar');
            qBar.innerHTML = contacts.map(c => {
                const on = onlineUsers.has(c.id);
                return \`<button onclick="setActivePeer('\${c.id}')" class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] shrink-0 \${c.id === activePeer ? 'bg-blue-600/30 border-blue-500 text-white font-bold' : 'bg-slate-800/80 border-slate-700 text-slate-300'}">
                    <span class="w-2 h-2 rounded-full \${on ? 'bg-emerald-400' : 'bg-slate-500'}"></span>
                    <span>\${c.name}</span>
                </button>\`).join('');

            const cList = document.getElementById('contacts-list');
            cList.innerHTML = contacts.map((c, idx) => {
                const on = onlineUsers.has(c.id);
                return \`<div class="bg-slate-900 border border-slate-800 p-3 rounded-xl flex justify-between items-center">
                    <div class="flex items-center gap-2.5">
                        <span class="w-2.5 h-2.5 rounded-full \${on ? 'bg-emerald-500' : 'bg-slate-600'}"></span>
                        <div>
                            <p class="text-xs font-bold text-white">\${c.name}</p>
                            <p class="text-[11px] font-mono \${on ? 'text-emerald-400' : 'text-slate-400'}">\${c.id} • \${on ? 'متصل الآن' : 'غير متصل'}</p>
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="setActivePeer('\${c.id}')" class="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold">مراسلة</button>
                        <button onclick="deleteContact(\${idx})" class="bg-red-500/10 text-red-400 px-2.5 py-1.5 rounded-lg text-xs"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>\`;
            }).join('');
        }

        function renderMessages() {
            const box = document.getElementById('chat-messages');
            const list = messagesMap[activePeer] || [];
            if (!list.length) {
                box.innerHTML = '<div class="text-center text-xs text-slate-500 py-8">لا توجد رسائل بعد. أرسل رسالة أو تسجيلاً صوتياً أو ابدأ مكالمة.</div>';
                return;
            }
            box.innerHTML = list.map(m => {
                if (m.deleted) {
                    return '<div class="text-center text-[11px] text-slate-500 italic">🚫 تم حذف الرسالة</div>';
                }
                const isMe = m.from === 'me';
                const contentHtml = m.msgType === 'audio' && m.audioData
                    ? \`<audio controls src="\${m.audioData}" class="max-w-full h-9"></audio>\`
                    : \`<p>\${m.text}</p>\`;
                return \`<div class="flex \${isMe ? 'justify-end' : 'justify-start'}">
                    <div class="\${isMe ? 'bg-blue-600 text-white rounded-tl-none' : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tr-none'} p-3 rounded-2xl max-w-md text-xs md:text-sm shadow space-y-1">
                        \${contentHtml}
                        \${isMe ? \`<div class="flex justify-between items-center gap-3 pt-1 border-t border-blue-400/30 text-[10px] text-blue-100">
                            <span>تم الإرسال ✓</span>
                            <button onclick="deleteMessageForBoth('\${m.id}')" class="underline text-red-100">حذف</button>
                        </div>\` : ''}
                    </div>
                </div>\`;
            }).join('');
            box.scrollTop = box.scrollHeight;
        }

        function renderAccounts() {
            const accBox = document.getElementById('accounts-list');
            accBox.innerHTML = myAccounts.map(a => \`<div onclick="switchAccount('\${a}')" class="bg-slate-950 border \${a === myId ? 'border-blue-500' : 'border-slate-800'} p-3 rounded-xl flex justify-between items-center cursor-pointer">
                <span class="text-xs font-mono font-bold text-white">\${a}</span>
                <span class="text-[10px] \${a === myId ? 'text-emerald-400 font-bold' : 'text-slate-400'}">\${a === myId ? 'نشط' : 'تبديل'}</span>
            </div>\`).join('');
        }

        function persist() {
            localStorage.setItem('sanad_v2_id', myId);
            localStorage.setItem('sanad_v2_accs', JSON.stringify(myAccounts));
            localStorage.setItem('sanad_v2_contacts', JSON.stringify(contacts));
            localStorage.setItem('sanad_v2_msgs', JSON.stringify(messagesMap));
            document.getElementById('my-id-label').innerText = myId;
            document.getElementById('active-peer-id').innerText = activePeer;
            renderPresence();
            renderMessages();
            renderAccounts();
        }

        persist();
        connectWS();
    </script>
</body>
</html>`;

const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(htmlContent);
});

const wss = new WebSocketServer({ server });
const clientsByUserId = new Map();

function broadcastPresence() {
    const onlineIds = Array.from(clientsByUserId.keys());
    const payload = JSON.stringify({ type: 'presence', onlineIds });
    wss.clients.forEach(client => {
        if (client.readyState === 1) client.send(payload);
    });
}

wss.on('connection', (ws) => {
    let registeredId = null;

    ws.on('message', (raw) => {
        let msg;
        try { msg = JSON.parse(raw.toString()); } catch { return; }

        if (msg.type === 'register' && msg.userId) {
            registeredId = String(msg.userId).trim();
            clientsByUserId.set(registeredId, ws);
            broadcastPresence();
            return;
        }

        if (msg.to) {
            const targetWs = clientsByUserId.get(String(msg.to).trim());
            if (targetWs && targetWs.readyState === 1) {
                targetWs.send(JSON.stringify(msg));
            }
        }
    });

    ws.on('close', () => {
        if (registeredId && clientsByUserId.get(registeredId) === ws) {
            clientsByUserId.delete(registeredId);
            broadcastPresence();
        }
    });
});

server.listen(PORT, () => {
    console.log('Al-Sanad real-time server running on port ' + PORT);
});
