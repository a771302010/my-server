const http = require('http');
const { WebSocketServer } = require('ws');

const htmlContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>سند AI v6.5</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
        body { font-family: 'Cairo', sans-serif; background-color: #050912; }
    </style>
</head>
<body class="text-slate-100 h-screen flex flex-col overflow-hidden select-none">

    <header class="bg-slate-900 border-b border-slate-800 px-3.5 py-2.5 flex justify-between items-center shrink-0">
        <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-2xl bg-blue-700 border border-blue-400/40 flex items-center justify-center font-black text-lg">S</div>
            <div>
                <div class="flex items-center gap-1.5">
                    <h1 class="font-black text-base text-white leading-none">سند</h1>
                    <span class="text-[10px] bg-emerald-600/25 text-emerald-300 px-2 py-0.5 rounded-full font-bold">AI v6.5</span>
                    <span id="device-badge" class="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-semibold">---</span>
                </div>
                <div class="flex items-center gap-1.5 text-[11px] mt-1">
                    <span id="ws-dot" class="w-2 h-2 rounded-full bg-amber-400"></span>
                    <span id="ws-label" class="text-slate-300 font-semibold">جاري الربط...</span>
                    <button onclick="reconnectNow()" class="text-blue-400 px-1"><i class="fa-solid fa-rotate-right text-[10px]"></i></button>
                    <span class="text-slate-600">•</span>
                    <span id="active-acct-label" class="font-mono font-bold text-blue-300">88888888</span>
                </div>
            </div>
        </div>
        <div class="flex items-center gap-2">
            <button onclick="launchCall('audio')" class="w-9 h-9 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center"><i class="fa-solid fa-phone text-xs"></i></button>
            <button onclick="launchCall('video')" class="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-300 flex items-center justify-center"><i class="fa-solid fa-video text-xs"></i></button>
        </div>
    </header>

    <div id="call-modal" class="hidden fixed inset-0 bg-slate-950/95 z-50 flex flex-col items-center justify-between p-4">
        <div class="text-center">
            <p class="text-xs text-blue-400 font-bold">سند AI v6.5 • اتصال مباشر</p>
            <h2 id="call-peer-title" class="text-lg font-black text-white font-mono mt-1">---</h2>
            <p id="call-status-msg" class="text-xs text-emerald-400 mt-1">جاري الاتصال...</p>
        </div>
        <div class="relative w-full max-w-md aspect-video bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden flex items-center justify-center">
            <video id="remote-video-el" autoplay playsinline class="w-full h-full object-cover"></video>
            <video id="local-video-el" autoplay playsinline muted class="w-24 h-32 object-cover rounded-2xl border border-blue-500/50 absolute bottom-3 left-3 hidden"></video>
            <div id="voice-call-card" class="flex flex-col items-center gap-2">
                <i class="fa-solid fa-microphone-lines text-3xl text-blue-400 animate-pulse"></i>
                <span class="text-xs text-slate-300">مكالمة صوتية مباشرة</span>
            </div>
        </div>
        <div class="flex items-center gap-2.5">
            <button id="accept-btn" onclick="answerCall()" class="hidden bg-emerald-600 text-white px-4 py-2.5 rounded-2xl text-xs font-bold">رد</button>
            <button id="mute-btn" onclick="toggleMuteTrack()" class="w-11 h-11 rounded-2xl bg-slate-800 text-white flex items-center justify-center"><i class="fa-solid fa-microphone"></i></button>
            <button onclick="endActiveCall()" class="bg-red-600 text-white px-4 py-2.5 rounded-2xl text-xs font-bold">إنهاء</button>
        </div>
    </div>

    <main class="flex-1 flex flex-col overflow-hidden bg-[#070c17]">
        <section id="pane-chats" class="flex-1 flex flex-col h-full overflow-hidden">
            <div class="p-2.5 bg-slate-900/80 border-b border-slate-800 space-y-2 shrink-0">
                <div class="flex gap-2">
                    <input type="text" id="peer-input" onkeydown="if(event.key==='Enter') openPeerByInput()" placeholder="معرّف الزميل (8 أرقام) أو رقم الجوال..." class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono">
                    <button onclick="openPeerByInput()" class="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold">فتح</button>
                    <button onclick="saveCurrentPeer()" class="bg-slate-800 text-emerald-400 px-3 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-user-plus"></i></button>
                </div>
                <div id="quick-chips" class="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs"></div>
            </div>

            <div class="px-4 py-2 bg-slate-950/80 border-b border-slate-800 flex justify-between items-center text-xs shrink-0">
                <div class="flex items-center gap-2">
                    <span id="peer-dot" class="w-2.5 h-2.5 rounded-full bg-slate-600"></span>
                    <span id="peer-title" class="font-bold text-white font-mono">88888888</span>
                    <span id="peer-status" class="text-[11px] font-bold text-slate-400">غير متصل</span>
                </div>
                <div class="flex items-center gap-3">
                    <button onclick="shareInviteLink()" class="text-blue-400 font-semibold">دعوة</button>
                    <button onclick="clearThreadMsgs()" class="text-red-400 font-semibold">مسح</button>
                </div>
            </div>

            <div id="msgs-box" class="flex-1 overflow-y-auto p-4 space-y-3"></div>

            <div class="p-2.5 bg-slate-900 border-t border-slate-800 flex items-center gap-1.5 shrink-0">
                <input type="file" id="attach-file" class="hidden" onchange="onFilePicked(event)">
                <button onclick="document.getElementById('attach-file').click()" class="text-amber-400 p-2 rounded-xl"><i class="fa-solid fa-paperclip"></i></button>
                <input type="text" id="msg-box-input" onkeydown="if(event.key==='Enter') sendTextMsg()" placeholder="اكتب رسالتك..." class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white">
                <button id="voice-btn" onclick="toggleVoiceCapture()" class="bg-slate-800 text-emerald-400 p-2.5 rounded-xl"><i class="fa-solid fa-microphone"></i></button>
                <button onclick="sendTextMsg()" class="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold"><i class="fa-solid fa-paper-plane"></i></button>
            </div>
        </section>

        <section id="pane-accounts" class="hidden flex-1 flex-col p-4 overflow-y-auto space-y-3">
            <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
                <h2 class="text-sm font-black text-blue-400">الحسابات والمعرّفات</h2>
                <div class="flex flex-wrap gap-2">
                    <button onclick="make8DigitId()" class="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold">+ توليد معرّف (8 أرقام)</button>
                    <button onclick="verifyPhoneAccount()" class="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold">+ تفعيل رقم جوال</button>
                </div>
                <div id="accounts-list" class="space-y-2"></div>
            </div>
        </section>

        <section id="pane-contacts" class="hidden flex-1 flex-col p-4 overflow-y-auto space-y-3">
            <div class="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex gap-2">
                <input type="text" id="c-name" placeholder="الاسم" class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white w-28">
                <input type="text" id="c-id" placeholder="معرّف 8 أرقام أو جوال" class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono">
                <button onclick="addNewContact()" class="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold">حفظ</button>
            </div>
            <div id="contacts-list" class="space-y-2"></div>
        </section>

        <section id="pane-calls" class="hidden flex-1 flex-col items-center justify-center p-6 text-center space-y-3">
            <h2 class="text-base font-black text-white">المكالمات المباشرة</h2>
            <input type="text" id="call-input" placeholder="معرّف 8 أرقام أو رقم الجوال..." class="w-full max-w-xs bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-center font-mono text-white">
            <div class="flex gap-3">
                <button onclick="launchCall('audio', document.getElementById('call-input').value.trim())" class="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold">مكالمة صوتية</button>
                <button onclick="launchCall('video', document.getElementById('call-input').value.trim())" class="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold">مكالمة فيديو</button>
            </div>
        </section>

        <section id="pane-ai" class="hidden flex-1 flex-col p-4 overflow-y-auto space-y-3">
            <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
                <h2 class="text-sm font-black text-indigo-400">السيرفرات البديلة والذكاء</h2>
                <select id="server-select" onchange="onServerSelectChange()" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-emerald-300"></select>
                <div class="flex gap-2">
                    <input type="text" id="custom-srv-input" placeholder="رابط سيرفر بديل https://..." class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white">
                    <button onclick="addCustomServer()" class="bg-slate-800 text-white px-3 py-2 rounded-xl text-xs font-bold">إضافة</button>
                </div>
            </div>
        </section>
    </main>

    <nav class="bg-slate-900 border-t border-slate-800 px-1 py-2 flex justify-around items-center shrink-0">
        <button onclick="setPane('chats')" id="btn-chats" class="flex flex-col items-center gap-1 text-blue-400 font-bold text-[10px]"><i class="fa-solid fa-comments text-base"></i><span>الدردشة</span></button>
        <button onclick="setPane('accounts')" id="btn-accounts" class="flex flex-col items-center gap-1 text-slate-400 text-[10px]"><i class="fa-solid fa-id-card text-base"></i><span>الحسابات</span></button>
        <button onclick="setPane('contacts')" id="btn-contacts" class="flex flex-col items-center gap-1 text-slate-400 text-[10px]"><i class="fa-solid fa-address-book text-base"></i><span>الجهات</span></button>
        <button onclick="setPane('calls')" id="btn-calls" class="flex flex-col items-center gap-1 text-slate-400 text-[10px]"><i class="fa-solid fa-phone-volume text-base"></i><span>المكالمات</span></button>
        <button onclick="setPane('ai')" id="btn-ai" class="flex flex-col items-center gap-1 text-slate-400 text-[10px]"><i class="fa-solid fa-brain text-base"></i><span>الذكاء والإعدادات</span></button>
    </nav>

    <script>
        var ua = navigator.userAgent || '';
        document.getElementById('device-badge').textContent = /iPhone|iPad/i.test(ua) ? 'آيفون' : (/Android/i.test(ua) ? 'أندرويد' : 'ويب');

        var serverList = JSON.parse(localStorage.getItem('sanad65_srvs') || 'null') || [location.origin];
        if (serverList.indexOf(location.origin) === -1) serverList.unshift(location.origin);
        var activeServerUrl = localStorage.getItem('sanad65_srv') || location.origin;

        function renderServerSelect() {
            var sel = document.getElementById('server-select');
            sel.innerHTML = serverList.map(function(u) {
                return '<option value="' + u + '"' + (u === activeServerUrl ? ' selected' : '') + '>' + u + '</option>';
            }).join('');
        }

        function addCustomServer() {
            var u = document.getElementById('custom-srv-input').value.trim().replace(/\/+$/, '');
            if (!u || u.indexOf('http') !== 0) return;
            if (serverList.indexOf(u) === -1) serverList.push(u);
            activeServerUrl = u;
            localStorage.setItem('sanad65_srvs', JSON.stringify(serverList));
            localStorage.setItem('sanad65_srv', activeServerUrl);
            document.getElementById('custom-srv-input').value = '';
            renderServerSelect();
            reconnectNow();
        }

        function onServerSelectChange() {
            activeServerUrl = document.getElementById('server-select').value;
            localStorage.setItem('sanad65_srv', activeServerUrl);
            reconnectNow();
        }

        function getBaseUrl() {
            return (activeServerUrl || location.origin).replace(/\/+$/, '');
        }

        var activeAcct = localStorage.getItem('sanad65_act') || '88888888';
        var myAccts = JSON.parse(localStorage.getItem('sanad65_accts') || '["88888888"]');
        var contacts = JSON.parse(localStorage.getItem('sanad65_cnts') || '[{"name":"خدمة العملاء","id":"88888888"}]');
        var currentPeer = '88888888';
        var onlinePeers = new Set();
        var acctThreads = JSON.parse(localStorage.getItem('sanad65_thds') || '{}');
        var seenIds = new Set();
        var ws, wsOk = false, httpOk = false;

        function getMap() {
            if (!acctThreads[activeAcct]) {
                acctThreads[activeAcct] = {
                    '88888888': [{ id: 'w1', from: 'them', kind: 'text', text: 'سند AI v6.5 جاهز ويعمل.' }]
                };
            }
            return acctThreads[activeAcct];
        }

        function refreshConn() {
            var live = wsOk || httpOk;
            document.getElementById('ws-dot').className = live ? 'w-2 h-2 rounded-full bg-emerald-500' : 'w-2 h-2 rounded-full bg-amber-400';
            document.getElementById('ws-label').textContent = live ? 'متصل' : 'جاري الربط...';
        }

        function handleIncoming(msg) {
            if (!msg || !msg.type) return;
            var eid = msg.eventId || msg.msgId || '';
            if (eid && seenIds.has(eid)) return;
            if (eid) seenIds.add(eid);

            if (msg.type === 'online_users' && Array.isArray(msg.ids)) {
                onlinePeers = new Set(msg.ids);
                renderPresence();
            } else if (msg.type === 'msg') {
                var toId = String(msg.to || activeAcct);
                var fromId = String(msg.from || '');
                if (!fromId) return;
                if (!acctThreads[toId]) acctThreads[toId] = {};
                if (!acctThreads[toId][fromId]) acctThreads[toId][fromId] = [];
                acctThreads[toId][fromId].push({
                    id: msg.msgId || ('m-' + Date.now()),
                    from: 'them',
                    kind: msg.kind || 'text',
                    text: msg.text || '',
                    mediaUrl: msg.mediaUrl || null,
                    fileName: msg.fileName || ''
                });
                persistAndDraw();
            } else if (msg.type === 'call_sig') {
                onCallSignal(msg);
            }
        }

        function postSync(payload) {
            fetch(getBaseUrl() + '/api/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).then(function(r) {
                if (!r.ok) return null;
                httpOk = true;
                refreshConn();
                return r.json();
            }).then(function(d) {
                if (!d) return;
                if (Array.isArray(d.onlineIds)) { onlinePeers = new Set(d.onlineIds); renderPresence(); }
                if (Array.isArray(d.events)) d.events.forEach(handleIncoming);
            }).catch(function() {});
        }

        function pollSync() {
            fetch(getBaseUrl() + '/api/sync?ids=' + encodeURIComponent(myAccts.join(','))).then(function(r) {
                if (!r.ok) return null;
                httpOk = true;
                refreshConn();
                return r.json();
            }).then(function(d) {
                if (!d) return;
                if (Array.isArray(d.onlineIds)) { onlinePeers = new Set(d.onlineIds); renderPresence(); }
                if (Array.isArray(d.events)) d.events.forEach(handleIncoming);
            }).catch(function() {});
        }

        setInterval(function() {
            postSync({ type: 'register_ids', ids: myAccts, activeId: activeAcct });
            pollSync();
        }, 1500);

        function openSocket() {
            try {
                var wsUrl = getBaseUrl().replace(/^https:/, 'wss:').replace(/^http:/, 'ws:');
                ws = new WebSocket(wsUrl);
                ws.onopen = function() {
                    wsOk = true;
                    refreshConn();
                    ws.send(JSON.stringify({ type: 'register_ids', ids: myAccts, activeId: activeAcct }));
                };
                ws.onclose = function() { wsOk = false; refreshConn(); };
                ws.onerror = function() { wsOk = false; refreshConn(); };
                ws.onmessage = function(e) { try { handleIncoming(JSON.parse(e.data)); } catch (err) {} };
            } catch (e) { wsOk = false; refreshConn(); }
        }

        function reconnectNow() {
            wsOk = false; httpOk = false; refreshConn();
            if (ws) { try { ws.close(); } catch (e) {} }
            openSocket();
            postSync({ type: 'register_ids', ids: myAccts, activeId: activeAcct });
            pollSync();
        }

        function sendPacket(payload) {
            var p = Object.assign({}, payload, { eventId: 'ev-' + Date.now() + '-' + Math.floor(Math.random() * 100000) });
            if (ws && ws.readyState === 1) { try { ws.send(JSON.stringify(p)); } catch (e) {} }
            postSync(p);
        }

        var rtcConn = null, localStreamObj = null, pendingCall = null, callPeerId = null, pendingIce = [];
        var rtcCfg = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] };

        function launchCall(mode, explicitTarget) {
            var target = String(explicitTarget || currentPeer || '').trim();
            if (!target) return;
            callPeerId = target;
            pendingIce = [];
            document.getElementById('call-modal').classList.remove('hidden');
            document.getElementById('call-peer-title').textContent = target;
            document.getElementById('call-status-msg').textContent = 'جاري الاتصال...';
            document.getElementById('accept-btn').classList.add('hidden');
            navigator.mediaDevices.getUserMedia({ audio: true, video: mode === 'video' ? { facingMode: 'user' } : false }).then(function(stream) {
                localStreamObj = stream;
                if (mode === 'video') {
                    var lv = document.getElementById('local-video-el');
                    lv.classList.remove('hidden');
                    lv.srcObject = stream;
                }
                createRTC(mode);
                stream.getTracks().forEach(function(t) { rtcConn.addTrack(t, stream); });
                return rtcConn.createOffer();
            }).then(function(offer) {
                return rtcConn.setLocalDescription(offer).then(function() { return offer; });
            }).then(function(offer) {
                sendPacket({ type: 'call_sig', to: callPeerId, from: activeAcct, sig: { op: 'offer', mode: mode, sdp: offer } });
            }).catch(function() {
                document.getElementById('call-status-msg').textContent = 'يرجى السماح بالمايكروفون/الكاميرا';
            });
        }

        function onCallSignal(msg) {
            var sig = msg.sig;
            if (!sig) return;
            if (sig.op === 'offer') {
                pendingCall = msg; callPeerId = msg.from; pendingIce = [];
                document.getElementById('call-modal').classList.remove('hidden');
                document.getElementById('call-peer-title').textContent = msg.from;
                document.getElementById('call-status-msg').textContent = 'مكالمة واردة...';
                document.getElementById('accept-btn').classList.remove('hidden');
            } else if (sig.op === 'answer' && rtcConn) {
                rtcConn.setRemoteDescription(new RTCSessionDescription(sig.sdp)).then(function() {
                    document.getElementById('call-status-msg').textContent = 'متصل الآن';
                    pendingIce.forEach(function(c) { rtcConn.addIceCandidate(new RTCIceCandidate(c)).catch(function() {}); });
                    pendingIce = [];
                }).catch(function() {});
            } else if (sig.op === 'ice' && sig.candidate) {
                if (rtcConn && rtcConn.remoteDescription) rtcConn.addIceCandidate(new RTCIceCandidate(sig.candidate)).catch(function() {});
                else pendingIce.push(sig.candidate);
            } else if (sig.op === 'bye') {
                resetCall();
            }
        }

        function answerCall() {
            if (!pendingCall) return;
            document.getElementById('accept-btn').classList.add('hidden');
            var mode = pendingCall.sig.mode;
            navigator.mediaDevices.getUserMedia({ audio: true, video: mode === 'video' ? { facingMode: 'user' } : false }).then(function(stream) {
                localStreamObj = stream;
                if (mode === 'video') {
                    var lv = document.getElementById('local-video-el');
                    lv.classList.remove('hidden');
                    lv.srcObject = stream;
                }
                createRTC(mode);
                stream.getTracks().forEach(function(t) { rtcConn.addTrack(t, stream); });
                return rtcConn.setRemoteDescription(new RTCSessionDescription(pendingCall.sig.sdp));
            }).then(function() {
                pendingIce.forEach(function(c) { rtcConn.addIceCandidate(new RTCIceCandidate(c)).catch(function() {}); });
                pendingIce = [];
                return rtcConn.createAnswer();
            }).then(function(ans) {
                return rtcConn.setLocalDescription(ans).then(function() { return ans; });
            }).then(function(ans) {
                sendPacket({ type: 'call_sig', to: pendingCall.from, from: activeAcct, sig: { op: 'answer', sdp: ans } });
                document.getElementById('call-status-msg').textContent = 'متصل الآن';
            }).catch(function() {});
        }

        function createRTC(mode) {
            rtcConn = new RTCPeerConnection(rtcCfg);
            rtcConn.onicecandidate = function(e) {
                if (e.candidate && callPeerId) sendPacket({ type: 'call_sig', to: callPeerId, from: activeAcct, sig: { op: 'ice', candidate: e.candidate } });
            };
            rtcConn.ontrack = function(e) {
                var st = (e.streams && e.streams[0]) || new MediaStream([e.track]);
                if (e.track.kind === 'video' || mode === 'video') {
                    var rv = document.getElementById('remote-video-el');
                    rv.srcObject = st; rv.muted = false; rv.play().catch(function() {});
                }
                if (e.track.kind === 'audio') {
                    var au = new Audio(); au.srcObject = st; au.autoplay = true; au.play().catch(function() {});
                }
            };
        }

        function toggleMuteTrack() {
            if (!localStreamObj) return;
            var t = localStreamObj.getAudioTracks()[0];
            if (t) t.enabled = !t.enabled;
        }

        function endActiveCall() {
            if (callPeerId) sendPacket({ type: 'call_sig', to: callPeerId, from: activeAcct, sig: { op: 'bye' } });
            resetCall();
        }

        function resetCall() {
            if (rtcConn) { rtcConn.close(); rtcConn = null; }
            if (localStreamObj) { localStreamObj.getTracks().forEach(function(t) { t.stop(); }); localStreamObj = null; }
            document.getElementById('call-modal').classList.add('hidden');
            document.getElementById('local-video-el').classList.add('hidden');
            pendingCall = null; callPeerId = null;
        }

        var mediaRec = null, audioChunks = [], recording = false;
        function toggleVoiceCapture() {
            if (!recording) {
                navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
                    mediaRec = new MediaRecorder(stream);
                    audioChunks = [];
                    mediaRec.ondataavailable = function(e) { if (e.data && e.data.size > 0) audioChunks.push(e.data); };
                    mediaRec.onstop = function() {
                        var blob = new Blob(audioChunks, { type: mediaRec.mimeType || 'audio/mp4' });
                        var fr = new FileReader();
                        fr.onloadend = function() { pushMsg(currentPeer, 'audio', 'رسالة صوتية', fr.result, 'voice'); };
                        fr.readAsDataURL(blob);
                        stream.getTracks().forEach(function(t) { t.stop(); });
                    };
                    mediaRec.start(); recording = true;
                    document.getElementById('voice-btn').className = 'bg-red-600 text-white p-2.5 rounded-xl animate-pulse';
                }).catch(function() {});
            } else {
                mediaRec.stop(); recording = false;
                document.getElementById('voice-btn').className = 'bg-slate-800 text-emerald-400 p-2.5 rounded-xl';
            }
        }

        function onFilePicked(ev) {
            var f = ev.target.files && ev.target.files[0];
            if (!f || f.size > 1500000) return;
            var fr = new FileReader();
            fr.onloadend = function() {
                pushMsg(currentPeer, f.type.indexOf('image/') === 0 ? 'image' : 'file', f.name, fr.result, f.name);
            };
            fr.readAsDataURL(f);
            ev.target.value = '';
        }

        function pushMsg(to, kind, text, mediaUrl, fileName) {
            var cleanTo = String(to || '').trim();
            if (!cleanTo) return;
            var msgId = 'm-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
            if (!acctThreads[activeAcct]) acctThreads[activeAcct] = {};
            if (!acctThreads[activeAcct][cleanTo]) acctThreads[activeAcct][cleanTo] = [];
            acctThreads[activeAcct][cleanTo].push({
                id: msgId, from: 'me', kind: kind, text: text, mediaUrl: mediaUrl, fileName: fileName, delivered: onlinePeers.has(cleanTo)
            });
            persistAndDraw();
            sendPacket({ type: 'msg', to: cleanTo, from: activeAcct, msgId: msgId, kind: kind, text: text, mediaUrl: mediaUrl, fileName: fileName });
        }

        function sendTextMsg() {
            var inp = document.getElementById('msg-box-input');
            var v = inp.value.trim();
            if (!v) return;
            pushMsg(currentPeer, 'text', v, null, '');
            inp.value = '';
        }

        function clearThreadMsgs() { getMap()[currentPeer] = []; persistAndDraw(); }

        function setPane(p) {
            ['chats', 'accounts', 'contacts', 'calls', 'ai'].forEach(function(k) {
                document.getElementById('pane-' + k).classList.add('hidden');
                document.getElementById('btn-' + k).className = 'flex flex-col items-center gap-1 text-slate-400 text-[10px]';
            });
            document.getElementById('pane-' + p).classList.remove('hidden');
            document.getElementById('btn-' + p).className = 'flex flex-col items-center gap-1 text-blue-400 font-bold text-[10px]';
        }

        function choosePeer(id) {
            currentPeer = String(id).trim();
            if (!getMap()[currentPeer]) getMap()[currentPeer] = [];
            setPane('chats'); persistAndDraw();
        }

        function openPeerByInput() {
            var inp = document.getElementById('peer-input');
            if (!inp.value.trim()) return;
            choosePeer(inp.value.trim()); inp.value = '';
        }

        function saveCurrentPeer() {
            if (contacts.some(function(c) { return c.id === currentPeer; })) return;
            contacts.push({ name: 'جهة ' + currentPeer, id: currentPeer });
            persistAndDraw();
        }

        function addNewContact() {
            var n = document.getElementById('c-name').value.trim();
            var i = document.getElementById('c-id').value.trim();
            if (!n || !i) return;
            contacts.push({ name: n, id: i });
            document.getElementById('c-name').value = ''; document.getElementById('c-id').value = '';
            choosePeer(i);
        }

        function shareInviteLink() {
            var txt = 'معرّفي في سند AI: ' + activeAcct + ' - ' + getBaseUrl();
            if (navigator.clipboard) navigator.clipboard.writeText(txt);
            alert(txt);
        }

        function make8DigitId() {
            var id8 = String(Math.floor(10000000 + Math.random() * 90000000));
            if (myAccts.indexOf(id8) === -1) myAccts.push(id8);
            activateAccount(id8);
        }

        function verifyPhoneAccount() {
            var ph = prompt('أدخل رقم الجوال:');
            if (!ph || !ph.trim()) return;
            var c = ph.trim();
            if (myAccts.indexOf(c) === -1) myAccts.push(c);
            activateAccount(c);
        }

        function activateAccount(id) {
            activeAcct = String(id).trim();
            getMap(); setPane('chats'); persistAndDraw();
            sendPacket({ type: 'register_ids', ids: myAccts, activeId: activeAcct });
        }

        function renderPresence() {
            var on = onlinePeers.has(currentPeer);
            document.getElementById('peer-dot').className = on ? 'w-2.5 h-2.5 rounded-full bg-emerald-500' : 'w-2.5 h-2.5 rounded-full bg-slate-600';
            document.getElementById('peer-status').className = on ? 'text-[11px] font-bold text-emerald-400' : 'text-[11px] font-bold text-slate-400';
            document.getElementById('peer-status').textContent = on ? 'متصل الآن' : 'غير متصل';

            document.getElementById('quick-chips').innerHTML = contacts.map(function(c) {
                return '<button onclick="choosePeer(\\'' + c.id + '\\')" class="px-2.5 py-1 rounded-lg border text-[11px] shrink-0 ' +
                    (c.id === currentPeer ? 'bg-blue-600/25 border-blue-500 text-white font-bold' : 'bg-slate-800 border-slate-700 text-slate-300') + '">' + c.name + '</button>';
            }).join('');

            document.getElementById('contacts-list').innerHTML = contacts.map(function(c) {
                return '<div class="bg-slate-900 border border-slate-800 p-3 rounded-xl flex justify-between items-center">' +
                    '<div><p class="text-xs font-bold">' + c.name + '</p><p class="text-[11px] font-mono text-slate-400">' + c.id + '</p></div>' +
                    '<button onclick="choosePeer(\\'' + c.id + '\\')" class="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold">مراسلة</button></div>';
            }).join('');
        }

        function renderMsgs() {
            var box = document.getElementById('msgs-box');
            var list = getMap()[currentPeer] || [];
            box.innerHTML = list.map(function(m) {
                var mine = m.from === 'me';
                var content = '<p>' + m.text + '</p>';
                if (m.kind === 'audio' && m.mediaUrl) content = '<audio controls src="' + m.mediaUrl + '" class="max-w-full h-9"></audio>';
                else if (m.kind === 'image' && m.mediaUrl) content = '<img src="' + m.mediaUrl + '" class="max-h-52 rounded-xl">';
                return '<div class="flex ' + (mine ? 'justify-end' : 'justify-start') + '">' +
                    '<div class="' + (mine ? 'bg-blue-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-200') + ' p-3 rounded-2xl max-w-md text-xs md:text-sm">' +
                    content + '<div class="text-[10px] opacity-75 mt-1">' + (mine ? 'مرسلة ✓' : 'واردة') + '</div></div></div>';
            }).join('');
            box.scrollTop = box.scrollHeight;
        }

        function renderAccts() {
            document.getElementById('accounts-list').innerHTML = myAccts.map(function(id) {
                return '<div onclick="activateAccount(\\'' + id + '\\')" class="bg-slate-950 border ' + (id === activeAcct ? 'border-blue-500' : 'border-slate-800') + ' p-3 rounded-xl flex justify-between items-center cursor-pointer">' +
                    '<span class="text-xs font-mono font-bold">' + id + '</span><span class="text-[10px] text-emerald-400">' + (id === activeAcct ? 'نشط' : 'تبديل') + '</span></div>';
            }).join('');
        }

        function persistAndDraw() {
            localStorage.setItem('sanad65_act', activeAcct);
            localStorage.setItem('sanad65_accts', JSON.stringify(myAccts));
            localStorage.setItem('sanad65_cnts', JSON.stringify(contacts));
            localStorage.setItem('sanad65_thds', JSON.stringify(acctThreads));
            document.getElementById('active-acct-label').textContent = activeAcct;
            document.getElementById('peer-title').textContent = currentPeer;
            renderPresence(); renderMsgs(); renderAccts();
        }

        renderServerSelect();
        persistAndDraw();
        openSocket();
        postSync({ type: 'register_ids', ids: myAccts, activeId: activeAcct });
        pollSync();
    </script>
</body>
</html>`;

const PORT = process.env.PORT || 3000;
const socketsMap = new Map();
const httpPresence = new Map();
const httpInbox = new Map();

function touchHttpPresence(ids) {
    const now = Date.now();
    ids.forEach(id => { const c = String(id).trim(); if (c) httpPresence.set(c, now); });
}

function getAllOnlineIds() {
    const now = Date.now();
    const s = new Set(socketsMap.keys());
    httpPresence.forEach((ts, id) => { if (now - ts < 15000) s.add(id); else httpPresence.delete(id); });
    return Array.from(s);
}

function enqueueHttpEvent(toId, payload) {
    const c = String(toId || '').trim();
    if (!c) return;
    const q = httpInbox.get(c) || [];
    q.push(payload);
    if (q.length > 80) q.shift();
    httpInbox.set(c, q);
}

function drainHttpEvents(ids) {
    const out = [];
    ids.forEach(id => {
        const c = String(id).trim();
        const q = httpInbox.get(c);
        if (q && q.length) { out.push(...q); httpInbox.set(c, []); }
    });
    return out;
}

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    const urlObj = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
    if (urlObj.pathname === '/api/sync' && req.method === 'GET') {
        const ids = (urlObj.searchParams.get('ids') || '').split(',').map(s => s.trim()).filter(Boolean);
        touchHttpPresence(ids);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ onlineIds: getAllOnlineIds(), events: drainHttpEvents(ids) }));
        return;
    }
    if (urlObj.pathname === '/api/sync' && req.method === 'POST') {
        let body = '';
        req.on('data', ch => { body += ch.toString(); });
        req.on('end', () => {
            try {
                const data = JSON.parse(body || '{}');
                if (data.type === 'register_ids') {
                    touchHttpPresence(Array.isArray(data.ids) ? data.ids : [data.activeId].filter(Boolean));
                } else if (data.to) {
                    const dest = socketsMap.get(String(data.to).trim());
                    if (dest && dest.readyState === 1) dest.send(JSON.stringify(data));
                    else enqueueHttpEvent(data.to, data);
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
    wss.clients.forEach(c => { if (c.readyState === 1) c.send(msg); });
}

wss.on('connection', (ws) => {
    let registeredIds = [];
    ws.on('message', (raw) => {
        let data;
        try { data = JSON.parse(raw.toString()); } catch (e) { return; }
        if (data.type === 'register_ids') {
            registeredIds.forEach(old => { if (socketsMap.get(old) === ws) socketsMap.delete(old); });
            registeredIds = (Array.isArray(data.ids) ? data.ids : [data.activeId].filter(Boolean)).map(x => String(x).trim()).filter(Boolean);
            registeredIds.forEach(id => socketsMap.set(id, ws));
            touchHttpPresence(registeredIds);
            broadcastOnline();
        } else if (data.to) {
            const dest = socketsMap.get(String(data.to).trim());
            if (dest && dest.readyState === 1) dest.send(JSON.stringify(data));
            else enqueueHttpEvent(data.to, data);
        }
    });
    ws.on('close', () => {
        registeredIds.forEach(id => { if (socketsMap.get(id) === ws) socketsMap.delete(id); });
        broadcastOnline();
    });
});

server.listen(PORT, () => {
    console.log('Sanad AI v6.5 running on port ' + PORT);
});
