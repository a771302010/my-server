const http = require('http');

const htmlContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>منظومة سَنَد - الإصدار 1.1</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;900&display=swap');
        body { font-family: 'Cairo', sans-serif; background-color: #070b14; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1d4ed8; border-radius: 10px; }
    </style>
</head>
<body class="text-slate-100 h-screen flex flex-col overflow-hidden select-none">

    <!-- الشريط العلوي -->
    <header class="bg-slate-900 border-b border-slate-800 px-4 py-3 flex justify-between items-center shadow-lg z-20">
        <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-2xl bg-gradient-to-b from-blue-600 to-blue-900 border border-blue-400/40 flex flex-col items-center justify-center shadow-lg shadow-blue-600/30">
                <span class="text-white font-black text-xl leading-none">S</span>
                <i class="fa-solid fa-hands-holding-child text-[10px] text-blue-200 mt-0.5"></i>
            </div>
            <div>
                <div class="flex items-center gap-2">
                    <h1 class="font-black text-base md:text-lg text-white">منظومة سَنَد</h1>
                    <span class="bg-blue-600/20 border border-blue-500/40 text-blue-300 text-[10px] px-2 py-0.5 rounded-full font-bold">الإصدار 1.1 • AI</span>
                </div>
                <p class="text-[11px] text-emerald-400 flex items-center gap-1.5 font-semibold">
                    <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> معرّفك: <span id="my-id-badge" class="font-mono text-white font-bold">36246004</span>
                </p>
            </div>
        </div>
        <button onclick="switchTab('contacts')" class="bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-300 flex items-center gap-1.5 transition">
            <i class="fa-solid fa-address-book"></i> جهات الاتصال (<span id="contacts-count">0</span>)
        </button>
    </header>

    <!-- المحتوى الرئيسي -->
    <main class="flex-1 flex flex-col overflow-hidden relative bg-[#090e1a]">

        <!-- 1. الدردشة -->
        <div id="tab-chats" class="flex-1 flex flex-col h-full">
            <!-- شريط اختيار أو إدخال رقم الزميل -->
            <div class="p-3 bg-slate-900/80 border-b border-slate-800 space-y-2">
                <div class="flex gap-2">
                    <input type="text" id="partner-input" placeholder="أدخل معرّف الزميل (8 أرقام) أو رقم جواله..." class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs md:text-sm focus:outline-none focus:border-blue-500 text-white font-mono">
                    <button onclick="openPartnerChat()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition">فتح</button>
                    <button onclick="saveCurrentPartnerToContacts()" title="حفظ في جهات الاتصال" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 px-3 py-2 rounded-xl text-xs font-bold transition"><i class="fa-solid fa-user-plus"></i></button>
                </div>

                <!-- قائمة أرقام محفوظة للوصول السريع دون كتابة -->
                <div id="quick-saved-bar" class="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                    <span class="text-[11px] text-slate-400 shrink-0">المحفوظون:</span>
                    <button onclick="selectPartner('88888888', 'خدمة العملاء')" class="bg-amber-500/10 border border-amber-500/30 text-amber-300 px-2.5 py-1 rounded-lg font-mono text-[11px] shrink-0">88888888 (الدعم)</button>
                </div>
            </div>

            <!-- شريط المحادثة الحالية -->
            <div class="px-4 py-2 bg-slate-950/70 border-b border-slate-800 flex justify-between items-center text-xs">
                <div>
                    <span class="text-slate-400">المحادثة مع: </span>
                    <span id="active-partner-label" class="text-blue-400 font-bold font-mono">88888888</span>
                </div>
                <div class="flex items-center gap-3">
                    <button onclick="invitePartnerLink()" class="text-emerald-400 hover:underline font-semibold"><i class="fa-solid fa-share-nodes ml-1"></i>إرسال رابط لزميلي</button>
                    <button onclick="clearCurrentChat()" class="text-red-400 hover:underline font-semibold"><i class="fa-solid fa-trash ml-1"></i>مسح</button>
                </div>
            </div>

            <!-- تنبيه توضيحي مهم للمستخدم -->
            <div class="mx-3 mt-2 bg-blue-950/40 border border-blue-500/25 rounded-xl px-3 py-2 text-[11px] text-blue-200 flex items-center justify-between gap-2">
                <span><i class="fa-solid fa-circle-info text-blue-400 ml-1"></i> لكي يرى زميلك رسالتك واتصالك على جهازه، يجب أن يفتح نفس الرابط على جهازه أو نربط السيرفر بـ WebSocket وقاعدة بيانات.</span>
            </div>

            <!-- صندوق الرسائل -->
            <div id="chat-box" class="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar"></div>

            <!-- شريط الإرسال -->
            <div class="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
                <input type="text" id="msg-input" onkeypress="if(event.key==='Enter') sendChatMsg()" placeholder="اكتب رسالتك هنا..." class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 text-white">
                <button onclick="sendChatMsg()" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition shadow">إرسال</button>
            </div>
        </div>

        <!-- 2. جهات الاتصال المحفوظة -->
        <div id="tab-contacts" class="hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-4">
            <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
                <h2 class="text-sm font-black text-emerald-400"><i class="fa-solid fa-address-book ml-1"></i> حفظ رقم أو معرّف زميل للوصول السريع</h2>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input type="text" id="contact-name" placeholder="اسم الزميل (مثال: أحمد)" class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                    <input type="text" id="contact-num" placeholder="الرقم أو المعرّف (8 أرقام أو جوال)" class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono">
                    <button onclick="addContactItem()" class="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-2 text-xs font-bold">حفظ في القائمة</button>
                </div>
            </div>

            <div id="contacts-list" class="space-y-2"></div>
        </div>

        <!-- 3. الحسابات والأرقام -->
        <div id="tab-accounts" class="hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-4">
            <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
                <h2 class="text-sm font-black text-blue-400">إدارة حساباتك وأرقامك (تعدد الحسابات)</h2>
                <div class="flex flex-wrap gap-2">
                    <button onclick="create8DigitId()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold">+ توليد معرّف جديد (8 أرقام)</button>
                    <button onclick="addPhoneAccount()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold">+ إضافة رقم جوال</button>
                </div>
                <div id="my-accounts-list" class="space-y-2 pt-2"></div>
            </div>
        </div>

        <!-- 4. المكالمات والذكاء AI -->
        <div id="tab-tools" class="hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-4">
            <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
                <h2 class="text-sm font-black text-amber-400">المكالمات (تحتاج ربط WebRTC / WebSocket للرنين الفعلي)</h2>
                <p class="text-xs text-slate-400">لجعل المكالمة الصوتية أو المرئية ترن فعلياً على جهاز الزميل الآخر، نحتاج تفعيل خادم إشارات لحظي (WebSocket Signaling) على السيرفر.</p>
                <div class="flex gap-2">
                    <button onclick="alert('لإطلاق الرنين الفعلي بين جهازين، يلزم تفعيل خادم WebSocket على Render. هل تريد أن أجهز لك ملف package.json وسيرفر WebSocket الحقيقي؟')" class="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-phone ml-1"></i> اتصال صوتي</button>
                    <button onclick="alert('لإطلاق مكالمة فيديو فعلية بين جهازين، يلزم تفعيل خادم WebRTC/WebSocket. أخبرني لتجهيزه لك.')" class="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-video ml-1"></i> اتصال فيديو</button>
                </div>
            </div>

            <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-2">
                <h2 class="text-sm font-black text-indigo-400">مساعد سَنَد للذكاء الاصطناعي</h2>
                <div id="ai-log" class="bg-slate-950 border border-slate-800 rounded-xl p-3 h-36 overflow-y-auto text-xs space-y-2 custom-scrollbar">
                    <div class="text-slate-400">اكتب سؤالك أو اطلب صياغة رسالة لزميلك...</div>
                </div>
                <div class="flex gap-2">
                    <input type="text" id="ai-q" onkeypress="if(event.key==='Enter') sendAI()" placeholder="اسأل الذكاء الاصطناعي..." class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                    <button onclick="sendAI()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold">إرسال</button>
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
        <button onclick="switchTab('tools')" id="nav-tools" class="flex flex-col items-center gap-1 text-slate-400 font-semibold text-[10px] px-2 py-1">
            <i class="fa-solid fa-brain text-base"></i>
            <span>المكالمات والذكاء</span>
        </button>
    </nav>

    <script>
        let myId = localStorage.getItem('sanad_my_id') || '36246004';
        let myAccounts = JSON.parse(localStorage.getItem('sanad_accounts') || '["36246004"]');
        let contacts = JSON.parse(localStorage.getItem('sanad_contacts') || '[{"name":"خدمة العملاء","num":"88888888"}]');
        let activePartner = '88888888';
        let chatsStore = JSON.parse(localStorage.getItem('sanad_chats') || '{"88888888":[{"from":"them","text":"أهلاً بك في منظومة سَنَد. احفظ أرقام زملائك في قائمة الجهات لتصل إليها فوراً دون إعادة كتابتها."}]}');

        function saveAll() {
            localStorage.setItem('sanad_my_id', myId);
            localStorage.setItem('sanad_accounts', JSON.stringify(myAccounts));
            localStorage.setItem('sanad_contacts', JSON.stringify(contacts));
            localStorage.setItem('sanad_chats', JSON.stringify(chatsStore));
            renderAll();
        }

        function switchTab(tab) {
            ['chats', 'contacts', 'accounts', 'tools'].forEach(t => {
                document.getElementById('tab-' + t).classList.add('hidden');
                const n = document.getElementById('nav-' + t);
                if (n) n.className = "flex flex-col items-center gap-1 text-slate-400 font-semibold text-[10px] px-2 py-1";
            });
            document.getElementById('tab-' + tab).classList.remove('hidden');
            const active = document.getElementById('nav-' + tab);
            if (active) active.className = "flex flex-col items-center gap-1 text-blue-400 font-bold text-[10px] px-2 py-1";
        }

        function selectPartner(num, name) {
            activePartner = num;
            document.getElementById('active-partner-label').innerText = name ? name + ' (' + num + ')' : num;
            if (!chatsStore[activePartner]) chatsStore[activePartner] = [];
            switchTab('chats');
            renderMessages();
        }

        function openPartnerChat() {
            const val = document.getElementById('partner-input').value.trim();
            if (!val) return alert('أدخل معرّف الزميل أو رقمه أولاً.');
            document.getElementById('partner-input').value = '';
            selectPartner(val, '');
        }

        function saveCurrentPartnerToContacts() {
            const num = activePartner;
            if (!num) return;
            const exists = contacts.some(c => c.num === num);
            if (exists) return alert('هذا الرقم محفوظ مسبقاً في جهات الاتصال.');
            const name = prompt('أدخل اسم الزميل لحفظ الرقم (' + num + '):') || ('زميل ' + num);
            contacts.push({ name, num });
            saveAll();
            alert('تم حفظ ' + name + ' (' + num + ') بنجاح.');
        }

        function addContactItem() {
            const name = document.getElementById('contact-name').value.trim();
            const num = document.getElementById('contact-num').value.trim();
            if (!name || !num) return alert('أدخل الاسم والرقم معاً.');
            contacts.push({ name, num });
            document.getElementById('contact-name').value = '';
            document.getElementById('contact-num').value = '';
            saveAll();
        }

        function deleteContact(idx) {
            contacts.splice(idx, 1);
            saveAll();
        }

        function sendChatMsg() {
            const input = document.getElementById('msg-input');
            const text = input.value.trim();
            if (!text) return;
            if (!chatsStore[activePartner]) chatsStore[activePartner] = [];
            chatsStore[activePartner].push({ from: 'me', text, id: 'm-' + Date.now() });
            input.value = '';
            saveAll();
        }

        function deleteMsgItem(msgId) {
            if (!chatsStore[activePartner]) return;
            chatsStore[activePartner] = chatsStore[activePartner].map(m => m.id === msgId ? { ...m, deleted: true } : m);
            saveAll();
        }

        function clearCurrentChat() {
            chatsStore[activePartner] = [];
            saveAll();
        }

        function invitePartnerLink() {
            const link = window.location.origin;
            const msg = 'تواصل معي على منظومة سَنَد عبر المعرّف: ' + activePartner + ' على الرابط: ' + link;
            if (navigator.share) {
                navigator.share({ title: 'منظومة سَنَد', text: msg, url: link }).catch(() => {});
            } else if (navigator.clipboard) {
                navigator.clipboard.writeText(msg);
                alert('تم نسخ رسالة الدعوة والرابط: ' + msg);
            } else {
                alert(msg);
            }
        }

        function create8DigitId() {
            const id8 = Math.floor(10000000 + Math.random() * 90000000).toString();
            myAccounts.push(id8);
            myId = id8;
            saveAll();
            alert('تم توليد وتفعيل المعرّف الجديد: ' + id8);
        }

        function addPhoneAccount() {
            const phone = prompt('أدخل رقم الجوال (مثال: +967772302010):');
            if (!phone || !phone.trim()) return;
            myAccounts.push(phone.trim());
            myId = phone.trim();
            saveAll();
        }

        function switchMyId(id) {
            myId = id;
            saveAll();
        }

        function sendAI() {
            const input = document.getElementById('ai-q');
            const q = input.value.trim();
            if (!q) return;
            const log = document.getElementById('ai-log');
            log.innerHTML += '<div class="bg-blue-950/50 p-2 rounded-lg text-blue-200"><strong>أنت:</strong> ' + q + '</div>';
            log.innerHTML += '<div class="bg-slate-900 p-2 rounded-lg text-slate-200"><strong>سَنَد AI:</strong> تم استلام طلبك. إذا أردت أن تصل رسائلك ومكالماتك فوراً إلى جهاز زميلك عبر الإنترنت، أخبرني لأجهز لك نظام الربط اللحظي (WebSocket).</div>';
            input.value = '';
            log.scrollTop = log.scrollHeight;
        }

        function renderMessages() {
            const box = document.getElementById('chat-box');
            const list = chatsStore[activePartner] || [];
            if (!list.length) {
                box.innerHTML = '<div class="text-center text-xs text-slate-500 py-8">لا توجد رسائل بعد مع ' + activePartner + '. ابدأ الكتابة أو أرسل الرابط لزميلك.</div>';
                return;
            }
            box.innerHTML = list.map(m => {
                if (m.deleted) {
                    return '<div class="text-center text-[11px] text-slate-500 italic">🚫 تم حذف الرسالة</div>';
                }
                if (m.from === 'me') {
                    return \`
                        <div class="flex justify-end">
                            <div class="bg-blue-600 text-white p-3 rounded-2xl rounded-tl-none max-w-md text-xs md:text-sm shadow">
                                <p>\${m.text}</p>
                                <div class="flex justify-between items-center gap-3 mt-1 pt-1 border-t border-blue-500/40 text-[10px] text-blue-100">
                                    <span>محفوظ محلياً ✓</span>
                                    <button onclick="deleteMsgItem('\${m.id}')" class="underline text-red-100">حذف</button>
                                </div>
                            </div>
                        </div>\`;
                }
                return \`
                    <div class="flex justify-start">
                        <div class="bg-slate-900 border border-slate-800 text-slate-200 p-3 rounded-2xl rounded-tr-none max-w-md text-xs md:text-sm shadow">
                            <p>\${m.text}</p>
                        </div>
                    </div>\`;
            }).join('');
            box.scrollTop = box.scrollHeight;
        }

        function renderAll() {
            document.getElementById('my-id-badge').innerText = myId;
            document.getElementById('contacts-count').innerText = contacts.length;

            // شريط الوصول السريع
            const bar = document.getElementById('quick-saved-bar');
            bar.innerHTML = '<span class="text-[11px] text-slate-400 shrink-0">المحفوظون:</span>' +
                contacts.map(c => \`<button onclick="selectPartner('\${c.num}', '\${c.name}')" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-blue-300 px-2.5 py-1 rounded-lg text-[11px] shrink-0">\${c.name} (\${c.num})</button>\`).join('');

            // قائمة جهات الاتصال
            const cList = document.getElementById('contacts-list');
            cList.innerHTML = contacts.map((c, i) => \`
                <div class="bg-slate-900 border border-slate-800 p-3 rounded-xl flex justify-between items-center">
                    <div>
                        <p class="text-xs font-bold text-white">\${c.name}</p>
                        <p class="text-[11px] text-slate-400 font-mono">\${c.num}</p>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="selectPartner('\${c.num}', '\${c.name}')" class="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold">مراسلة</button>
                        <button onclick="deleteContact(\${i})" class="bg-red-500/10 text-red-400 px-2.5 py-1.5 rounded-lg text-xs"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>\`).join('');

            // قائمة حساباتي
            const aList = document.getElementById('my-accounts-list');
            aList.innerHTML = myAccounts.map(acc => \`
                <div onclick="switchMyId('\${acc}')" class="bg-slate-950 border \${acc === myId ? 'border-blue-500' : 'border-slate-800'} p-3 rounded-xl flex justify-between items-center cursor-pointer">
                    <span class="text-xs font-mono font-bold text-white">\${acc}</span>
                    <span class="text-[10px] \${acc === myId ? 'text-emerald-400 font-bold' : 'text-slate-400'}">\${acc === myId ? 'نشط' : 'تبديل'}</span>
                </div>\`).join('');

            renderMessages();
        }

        renderAll();
    </script>
</body>
</html>`;

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(htmlContent);
});

server.listen(PORT, () => {
    console.log('Sanad Server v1.1 running on port ' + PORT);
});
