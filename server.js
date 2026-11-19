const http = require('http');
const { WebSocketServer } = require('ws');

const htmlContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>سند AI</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
        body { font-family: 'Cairo', sans-serif; background-color: #050912; }
    </style>
</head>
<body class="text-slate-100 h-screen flex flex-col overflow-hidden">

    <!-- شريط تشخيص مباشر -->
    <div id="diag-bar" class="bg-slate-950 border-b border-slate-800 px-3 py-1 text-[10px] text-amber-300 font-mono flex justify-between items-center">
        <span id="diag-text">JS: OK | HTTP: ... | WS: ...</span>
        <button onclick="runDiagCheck()" class="underline text-blue-400">فحص</button>
    </div>

    <!-- الشريط العلوي -->
    <header class="bg-slate-900 border-b border-slate-800 px-3.5 py-2.5 flex justify-between items-center">
        <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-2xl bg-blue-700 border border-blue-400/40 flex items-center justify-center font-black text-lg">S</div>
            <div>
                <div class="flex items-center gap-1.5">
                    <h1 class="font-black text-base text-white leading-none">سند</h1>
                    <span class="text-[10px] bg-blue-600/25 text-blue-300 px-2 py-0.5 rounded-full font-bold">AI v5.3</span>
                </div>
                <div class="flex items-center gap-1.5 text-[11px] mt-1">
                    <span id="ws-dot" class="w-2 h-2 rounded-full bg-amber-400"></span>
                    <span id="ws-label" class="text-slate-300 font-semibold">جاري الربط...</span>
                    <button onclick="runDiagCheck()" title="إعادة ربط" class="text-blue-400 px-1"><i class="fa-solid fa-rotate-right text-[10px]"></i></button>
                    <span class="text-slate-600">•</span>
                    <span id="active-acct-label" class="font-mono font-bold text-blue-300">88888888</span>
                </div>
            </div>
        </div>
        <div class="flex items-center gap-2">
            <button onclick="alert('المكالمات الصوتية متاحة عند اتصال الطرف الآخر.')" class="w-9 h-9 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center">
                <i class="fa-solid fa-phone text-xs"></i>
            </button>
            <button onclick="alert('مكالمات الفيديو متاحة عند اتصال الطرف الآخر.')" class="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-300 flex items-center justify-center">
                <i class="fa-solid fa-video text-xs"></i>
            </button>
        </div>
    </header>

    <!-- المحتوى الرئيسي -->
    <main class="flex-1 flex flex-col overflow-hidden bg-[#070c17]">
        <div class="p-2.5 bg-slate-900/80 border-b border-slate-800 flex gap-2">
            <input type="text" id="peer-input" placeholder="معرّف الزميل (8 أرقام) أو رقم الجوال..." class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono">
            <button onclick="openPeer()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold">فتح</button>
        </div>

        <div class="px-4 py-2 bg-slate-950/80 border-b border-slate-800 flex justify-between items-center text-xs">
            <div class="flex items-center gap-2">
                <span id="peer-dot" class="w-2.5 h-2.5 rounded-full bg-slate-600"></span>
                <span id="peer-title" class="font-bold text-white font-mono">88888888</span>
                <span id="peer-status" class="text-[11px] font-bold text-slate-400">غير متصل</span>
            </div>
            <button onclick="clearMsgs()" class="text-red-400 hover:underline font-semibold">مسح</button>
        </div>

        <div id="msgs-box" class="flex-1 overflow-y-auto p-4 space-y-2.5"></div>

        <div class="p-2.5 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
            <input type="text" id="msg-box-input" onkeydown="if(event.key==='Enter') sendMsg()" placeholder="اكتب رسالتك..." class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white">
            <button id="send-btn" onclick="sendMsg()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold">
                <i class="fa-solid fa-paper-plane"></i>
            </button>
        </div>
    </main>

    <script>
        var myId = '88888888';
        var peerId = '88888888';
        var msgs = JSON.parse(localStorage.getItem('sanad53_msgs') || '[]');
        var onlineList = [];
        var wsStatus = 'init';
        var httpStatus = 'init';
        var ws;

        function updateDiag() {
            document.getElementById('diag-text').textContent = 'JS: OK | HTTP: ' + httpStatus + ' | WS: ' + wsStatus;
            var isLive = (wsStatus === 'open') || (httpStatus === 'ok');
            document.getElementById('ws-dot').className = isLive ? 'w-2 h-2 rounded-full bg-emerald-500' : 'w-2 h-2 rounded-full bg-amber-400';
            document.getElementById('ws-label').textContent = isLive ? 'متصل' : 'جاري الربط...';
            var peerOn = onlineList.indexOf(peerId) !== -1;
            document.getElementById('peer-dot').className = peerOn ? 'w-2.5 h-2.5 rounded-full bg-emerald-500' : 'w-2.5 h-2.5 rounded-full bg-slate-600';
            document.getElementById('peer-status').textContent = peerOn ? 'متصل الآن' : 'غير متصل';
        }

        function drawMsgs() {
            var box = document.getElementById('msgs-box');
            if (!msgs.length) {
                box.innerHTML = '<div class="text-center text-xs text-slate-500 py-8">اكتب رسالة واضغط إرسال لاختبار النظام.</div>';
                return;
            }
            box.innerHTML = msgs.map(function(m) {
                var mine = m.from === 'me';
                return '<div class="flex ' + (mine ? 'justify-end' : 'justify-start') + '">' +
                    '<div class="' + (mine ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-200 border border-slate-800') + ' px-3.5 py-2 rounded-2xl max-w-xs text-xs md:text-sm">' +
                    '<div>' + m.text + '</div>' +
                    '<div class="text-[10px] opacity-75 mt-1">' + (mine ? 'مرسلة ✓' : ('من ' + m.from)) + '</div>' +
                    '</div></div>';
            }).join('');
            box.scrollTop = box.scrollHeight;
        }

        function saveMsgs() {
            localStorage.setItem('sanad53_msgs', JSON.stringify(msgs));
            drawMsgs();
        }

        function openPeer() {
            var val = document.getElementById('peer-input').value.trim();
            if (!val) return;
            peerId = val;
            document.getElementById('peer-title').textContent = peerId;
            updateDiag();
        }

        function clearMsgs() {
            msgs = [];
            saveMsgs();
        }

        function sendMsg() {
            var inp = document.getElementById('msg-box-input');
            var txt = inp.value.trim();
            if (!txt) return;
            msgs.push({ id: String(Date.now()), from: 'me', to: peerId, text: txt });
            inp.value = '';
            saveMsgs();
            var payload = JSON.stringify({ type: 'msg', from: myId, to: peerId, text: txt });
            if (ws && ws.readyState === 1) {
                try { ws.send(payload); } catch (e) {}
            }
            fetch('/api/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: payload
            }).then(function(r) {
                httpStatus = r.ok ? 'ok' : ('err-' + r.status);
                updateDiag();
            }).catch(function() {
                httpStatus = 'fail';
                updateDiag();
            });
        }

        function pollServer() {
            fetch('/api/sync?ids=' + encodeURIComponent(myId))
                .then(function(r) {
                    httpStatus = r.ok ? 'ok' : ('err-' + r.status);
                    return r.json();
                })
                .then(function(d) {
                    if (d && Array.isArray(d.onlineIds)) onlineList = d.onlineIds;
                    if (d && Array.isArray(d.events)) {
                        d.events.forEach(function(ev) {
                            if (ev && ev.type === 'msg') {
                                msgs.push({ id: String(Date.now() + Math.random()), from: ev.from || 'them', to: myId, text: ev.text || '' });
                                saveMsgs();
                            }
                        });
                    }
                    updateDiag();
                })
                .catch(function() {
                    httpStatus = 'fail';
                    updateDiag();
                });
        }

        function connectWS() {
            try {
                var proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
                ws = new WebSocket(proto + '//' + location.host);
                wsStatus = 'connecting';
                updateDiag();
                ws.onopen = function() {
                    wsStatus = 'open';
                    ws.send(JSON.stringify({ type: 'register_ids', ids: [myId] }));
                    updateDiag();
                };
                ws.onmessage = function(e) {
                    try {
                        var d = JSON.parse(e.data);
                        if (d.type === 'online_users' && Array.isArray(d.ids)) {
                            onlineList = d.ids;
                            updateDiag();
                        } else if (d.type === 'msg') {
                            msgs.push({ id: String(Date.now() + Math.random()), from: d.from || 'them', to: myId, text: d.text || '' });
                            saveMsgs();
                        }
                    } catch (err) {}
                };
                ws.onclose = function() {
                    wsStatus = 'closed';
                    updateDiag();
                };
                ws.onerror = function() {
                    wsStatus = 'error';
                    updateDiag();
                };
            } catch (e) {
                wsStatus = 'blocked';
                updateDiag();
            }
        }

        function runDiagCheck() {
            pollServer();
            if (!ws || ws.readyState !== 1) connectWS();
            updateDiag();
        }

        drawMsgs();
        runDiagCheck();
        setInterval(pollServer, 3000);
    </script>
</body>
</html>`;

const PORT = process.env.PORT || 3000;
const socketsMap = new Map();
const httpPresence = new Map();
const httpInbox = new Map();

function getOnlineIds() {
    const now = Date.now();
    const set = new Set(socketsMap.keys());
    httpPresence.forEach((ts, id) => {
        if (now - ts < 12000) set.add(id);
        else httpPresence.delete(id);
    });
    return Array.from(set);
}

const server = http.createServer((req, res) => {
    const urlObj = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));

    if (urlObj.pathname === '/api/sync' && req.method === 'GET') {
        const ids = (urlObj.searchParams.get('ids') || '').split(',').map(s => s.trim()).filter(Boolean);
        const now = Date.now();
        const events = [];
        ids.forEach(id => {
            httpPresence.set(id, now);
            const q = httpInbox.get(id);
            if (q && q.length) {
                events.push(...q);
                httpInbox.set(id, []);
            }
        });
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ onlineIds: getOnlineIds(), events }));
        return;
    }

    if (urlObj.pathname === '/api/sync' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const data = JSON.parse(body || '{}');
                if (data.type === 'register_ids' && Array.isArray(data.ids)) {
                    data.ids.forEach(id => httpPresence.set(String(id).trim(), Date.now()));
                } else if (data.to) {
                    const destId = String(data.to).trim();
                    const wsDest = socketsMap.get(destId);
                    if (wsDest && wsDest.readyState === 1) {
                        wsDest.send(JSON.stringify(data));
                    } else {
                        const q = httpInbox.get(destId) || [];
                        q.push(data);
                        httpInbox.set(destId, q);
                    }
                }
            } catch (e) {}
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ ok: true, onlineIds: getOnlineIds() }));
        });
        return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(htmlContent);
});

const wss = new WebSocketServer({ server });

function broadcastOnline() {
    const msg = JSON.stringify({ type: 'online_users', ids: getOnlineIds() });
    wss.clients.forEach(c => {
        if (c.readyState === 1) c.send(msg);
    });
}

wss.on('connection', (ws) => {
    let registeredIds = [];
    ws.on('message', (raw) => {
        let data;
        try { data = JSON.parse(raw.toString()); } catch (e) { return; }
        if (data.type === 'register_ids' && Array.isArray(data.ids)) {
            registeredIds = data.ids.map(x => String(x).trim()).filter(Boolean);
            registeredIds.forEach(id => {
                socketsMap.set(id, ws);
                httpPresence.set(id, Date.now());
            });
            broadcastOnline();
        } else if (data.to) {
            const destId = String(data.to).trim();
            const dest = socketsMap.get(destId);
            if (dest && dest.readyState === 1) {
                dest.send(JSON.stringify(data));
            } else {
                const q = httpInbox.get(destId) || [];
                q.push(data);
                httpInbox.set(destId, q);
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
    console.log('Sanad AI v5.3 running on port ' + PORT);
});
