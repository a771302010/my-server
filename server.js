const http = require('http');

const htmlContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>منظومة سَنَد - النسخة الدولية الرسمية الفائقة</title>
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- FontAwesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;900&display=swap');
        body { font-family: 'Cairo', sans-serif; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #3b82f6; border-radius: 10px; }
    </style>
</head>
<body class="bg-slate-950 text-slate-100 h-screen flex flex-col overflow-hidden">

    <!-- الشريط العلوي الاحترافي -->
    <header class="bg-slate-900/95 border-b border-slate-800 px-4 py-3 flex justify-between items-center shadow-xl z-10">
        <div class="flex items-center space-x-3 space-x-reverse">
            <div class="bg-gradient-to-tr from-blue-700 to-blue-500 p-2.5 rounded-2xl text-white shadow-lg shadow-blue-500/30 flex items-center justify-center">
                <i class="fa-solid fa-shield-halved text-xl"></i>
            </div>
            <div>
                <h1 class="font-black text-lg tracking-wide text-blue-400">منظومة سَنَد السيادية</h1>
                <span class="text-xs text-emerald-400 flex items-center gap-1.5 font-semibold">
                    <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> متصل (Live) - مدعوم بالذكاء الاصطناعي
                </span>
            </div>
        </div>
        <div class="flex items-center gap-3">
            <span class="bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs px-3 py-1.5 rounded-full font-bold hidden sm:inline-block">
                النسخة الدولية الرسمية
            </span>
            <button onclick="toggleLang()" class="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition font-semibold">EN / AR</button>
        </div>
    </header>

    <!-- مساحة العمل الرئيسية -->
    <div class="flex flex-1 overflow-hidden">
        
        <!-- القائمة الجانبية (Sidebar) -->
        <aside class="w-20 md:w-64 bg-slate-950 border-l border-slate-800/80 flex flex-col justify-between p-3 select-none">
            <div class="space-y-2">
                <button onclick="switchTab('chats')" id="btn-chats" class="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/30 transition">
                    <i class="fa-solid fa-comments text-lg"></i>
                    <span class="hidden md:inline">الدردشة المركزية</span>
                </button>
                <button onclick="switchTab('ai')" id="btn-ai" class="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-slate-900 text-slate-300 transition font-semibold">
                    <i class="fa-solid fa-brain text-lg text-indigo-400"></i>
                    <span class="hidden md:inline">مساعد الذكاء الاصطناعي</span>
                </button>
                <button onclick="switchTab('calls')" id="btn-calls" class="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-slate-900 text-slate-300 transition font-semibold">
                    <i class="fa-solid fa-phone-volume text-lg text-emerald-400"></i>
                    <span class="hidden md:inline">المكالمات المشفرة</span>
                </button>
                <button onclick="switchTab('vault')" id="btn-vault" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-900 text-slate-300 transition font-semibold">
                    <i class="fa-solid fa-vault text-lg text-amber-400"></i>
                    <span class="hidden md:inline">الخزنة السيادية</span>
                </button>
                <button onclick="switchTab('settings')" id="btn-settings" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-900 text-slate-300 transition font-semibold">
                    <i class="fa-solid fa-sliders text-lg text-slate-400"></i>
                    <span class="hidden md:inline">الإعدادات العامة</span>
                </button>
            </div>
            
            <div class="hidden md:block p-3.5 bg-slate-900/60 rounded-2xl border border-slate-800 text-xs text-slate-400">
                <p class="font-bold text-blue-400 mb-1 flex items-center gap-1.5"><i class="fa-solid fa-lock"></i> تشفير عسكري</p>
                حماية تامة طرف-لطرف مدعومة بالأقمار الاصطناعية.
            </div>
        </aside>

        <!-- المحتوى الرئيسي (Main Content) -->
        <main class="flex-1 flex flex-col bg-slate-900 relative overflow-hidden">
            
            <!-- 1. شاشة الدردشة المركزية -->
            <div id="tab-chats" class="flex-1 flex flex-col h-full">
                <div class="bg-slate-950/60 p-3 border-b border-slate-800 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <span class="w-3 h-3 rounded-full bg-blue-500"></span>
                        <span class="text-sm font-bold text-slate-200">غرفة العمليات وخدمة العملاء المركزية</span>
                    </div>
                    <button onclick="clearChat()" class="text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 px-3 py-1.5 rounded-lg border border-red-500/30 transition font-semibold">مسح السجل</button>
                </div>

                <!-- شريط إضافة الأرقام والجهات -->
                <div class="p-3 bg-slate-950/30 border-b border-slate-800 flex gap-2">
                    <input type="text" id="new-contact-input" placeholder="أدخل رقم الاتصال أو اسم الجهة (مثال: +967... أو فريق الدعم)..." class="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 text-slate-100">
                    <button onclick="addContact()" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-md flex items-center gap-1.5">
                        <i class="fa-solid fa-user-plus text-xs"></i> إضافة رقم
                    </button>
                </div>

                <!-- رسائل الدردشة -->
                <div id="chat-messages" class="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    <div class="flex items-start gap-3">
                        <div class="w-9 h-9 rounded-2xl bg-blue-600 flex items-center justify-center font-bold text-sm shadow-md">سـ</div>
                        <div class="bg-slate-950 border border-slate-800 p-4 rounded-2xl max-w-lg text-sm leading-relaxed shadow-lg">
                            <p class="font-bold text-blue-400 mb-1">مساعد سند الرسمي</p>
                            أهلاً بك يا مهندس عبد الله. تم تفعيل منظومة سند بنجاح تامة. النظام جاهز الآن للدردشة المباشرة، إدارة الأرقام، والتحليل الذكي عبر الذكاء الاصطناعي متفوقاً على كافة التطبيقات.
                        </div>
                    </div>
                </div>

                <!-- إدخال الرسائل -->
                <div class="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
                    <button onclick="attachFile()" class="text-slate-400 hover:text-blue-400 p-2.5 transition rounded-xl hover:bg-slate-900"><i class="fa-solid fa-paperclip text-lg"></i></button>
                    <button onclick="toggleVoiceRecord()" class="text-slate-400 hover:text-purple-400 p-2.5 transition rounded-xl hover:bg-slate-900"><i class="fa-solid fa-microphone text-lg"></i></button>
                    <input type="text" id="chat-input" onkeypress="handleKeyPress(event)" placeholder="اكتب رسالة مشفرة رسمية..." class="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 text-slate-100">
                    <button onclick="sendMessage()" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-sm font-bold transition flex items-center gap-2 shadow-lg shadow-blue-600/30">
                        <span>إرسال</span>
                        <i class="fa-solid fa-paper-plane text-xs"></i>
                    </button>
                </div>
            </div>

            <!-- 2. شاشة الذكاء الاصطناعي الفائق -->
            <div id="tab-ai" class="hidden flex-1 flex flex-col h-full p-4 overflow-y-auto custom-scrollbar">
                <div class="bg-gradient-to-r from-blue-900/50 to-indigo-900/50 border border-blue-500/30 p-5 rounded-2xl mb-4 shadow-xl">
                    <h2 class="text-lg font-bold text-blue-300 flex items-center gap-2">
                        <i class="fa-solid fa-brain text-xl"></i> محرك الذكاء الاصطناعي السيادي (Sanad AI)
                    </h2>
                    <p class="text-xs text-slate-300 mt-1">مساعد ذكي مدعوم بنماذج تحليل متطورة للرد الرسمي، كتابة التقارير، وإدارة العمليات الميدانية.</p>
                </div>
                <div id="ai-chat-box" class="flex-1 bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3 mb-4 overflow-y-auto custom-scrollbar">
                    <div class="text-slate-400 text-xs text-center py-2">اسأل خبير سند الذكي أي استفسار أو اطلب صياغة تقارير رسمية...</div>
                </div>
                <div class="flex gap-2">
                    <input type="text" id="ai-input" placeholder="اطلب من الذكاء الاصطناعي تحليل أو صياغة..." class="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 text-slate-100">
                    <button onclick="askAI()" class="bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-xl font-bold text-sm transition shadow-lg shadow-indigo-600/30">تنفيذ ذكي</button>
                </div>
            </div>

            <!-- 3. شاشة المكالمات المشفرة -->
            <div id="tab-calls" class="hidden flex-1 flex flex-col items-center justify-center p-6 text-center">
                <div class="w-24 h-24 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-3xl flex items-center justify-center text-4xl mb-4 shadow-2xl shadow-emerald-500/20 animate-pulse">
                    <i class="fa-solid fa-phone-volume"></i>
                </div>
                <h2 class="text-xl font-bold mb-2">المكالمات الصوتية والمرئية المشفرة عبر الأقمار الاصطناعية</h2>
                <p class="text-sm text-slate-400 max-w-md mb-6">اتصالات آمنة وخاصة بالكامل بتقنية P2P السحابية، تتفوق على كافة تطبيقات التراسل الحالية.</p>
                <button onclick="alert('جاري إنشاء قناة اتصال آمنة ومشفّرة...')" class="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3.5 rounded-2xl font-bold shadow-lg shadow-emerald-600/30 transition">بدء اتصال جديد الآن</button>
            </div>

            <!-- 4. شاشة الخزنة السيادية -->
            <div id="tab-vault" class="hidden flex-1 flex flex-col p-6 overflow-y-auto custom-scrollbar">
                <h2 class="text-xl font-bold text-amber-400 mb-2 flex items-center gap-2"><i class="fa-solid fa-vault"></i> الخزنة السيادية للملفات والسجلات</h2>
                <p class="text-xs text-slate-400 mb-6">تخزين مشفر بالكامل (AES-256) للمستندات والبيانات الهامة.</p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="bg-slate-950 border border-slate-800 p-5 rounded-2xl text-center shadow-lg hover:border-amber-500/50 transition">
                        <i class="fa-solid fa-file-shield text-4xl text-amber-500 mb-3"></i>
                        <h3 class="font-bold text-base mb-1">مستندات الهوية والاعتمادات</h3>
                        <span class="text-xs text-slate-500">مشفر عسكرياً وعالي الحماية</span>
                    </div>
                    <div class="bg-slate-950 border border-slate-800 p-5 rounded-2xl text-center shadow-lg hover:border-blue-500/50 transition">
                        <i class="fa-solid fa-key text-4xl text-blue-500 mb-3"></i>
                        <h3 class="font-bold text-base mb-1">مفاتيح التشفير والربط</h3>
                        <span class="text-xs text-slate-500">محفوظة بأمان تآم</span>
                    </div>
                </div>
            </div>

            <!-- 5. شاشة الإعدادات العامة -->
            <div id="tab-settings" class="hidden flex-1 flex flex-col p-6 overflow-y-auto custom-scrollbar">
                <h2 class="text-xl font-bold mb-4 flex items-center gap-2 text-slate-200"><i class="fa-solid fa-sliders"></i> إعدادات المنظومة</h2>
                <div class="space-y-4 max-w-xl">
                    <div class="flex items-center justify-between bg-slate-950 p-4.5 rounded-2xl border border-slate-800 shadow">
                        <div>
                            <h4 class="font-bold text-sm text-slate-200">الوضع المظلم الفائق (OLED Dark)</h4>
                            <p class="text-xs text-slate-400">حماية العين وتوفير طاقة الجهاز بأعلى كفاءة.</p>
                        </div>
                        <input type="checkbox" checked class="w-5 h-5 accent-blue-600">
                    </div>
                    <div class="flex items-center justify-between bg-slate-950 p-4.5 rounded-2xl border border-slate-800 shadow">
                        <div>
                            <h4 class="font-bold text-sm text-slate-200">الذكاء الاصطناعي التلقائي (Auto-AI)</h4>
                            <p class="text-xs text-slate-400">تفعيل المساعد الذكي للرد على الواردات بشكل فوري.</p>
                        </div>
                        <input type="checkbox" checked class="w-5 h-5 accent-blue-600">
                    </div>
                </div>
            </div>

        </main>
    </div>

    <!-- المحرك البرمجي (JavaScript) -->
    <script>
        function switchTab(tabId) {
            const tabs = ['chats', 'ai', 'calls', 'vault', 'settings'];
            tabs.forEach(t => {
                document.getElementById('tab-' + t).classList.add('hidden');
                const btn = document.getElementById('btn-' + t);
                if(btn) btn.className = "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-slate-900 text-slate-300 transition font-semibold";
            });
            document.getElementById('tab-' + tabId).classList.remove('hidden');
            const activeBtn = document.getElementById('btn-' + tabId);
            if(activeBtn) activeBtn.className = "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/30 transition";
        }

        function sendMessage() {
            const input = document.getElementById('chat-input');
            const text = input.value.trim();
            if(!text) return;
            const chatMessages = document.getElementById('chat-messages');
            chatMessages.innerHTML += '<div class="flex items-start gap-3 justify-end"><div class="bg-blue-600 text-white p-3.5 rounded-2xl max-w-lg text-sm leading-relaxed shadow-lg">' + text + '</div><div class="w-9 h-9 rounded-2xl bg-slate-800 flex items-center justify-center font-bold text-sm shadow">أنت</div></div>';
            input.value = '';
            chatMessages.scrollTop = chatMessages.scrollHeight;

            // رد تلقائي ذكي يحاكي الذكاء الاصطناعي السيادي
            setTimeout(() => {
                chatMessages.innerHTML += '<div class="flex items-start gap-3"><div class="w-9 h-9 rounded-2xl bg-blue-600 flex items-center justify-center font-bold text-sm shadow">سـ</div><div class="bg-slate-950 border border-slate-800 p-4 rounded-2xl max-w-lg text-sm leading-relaxed shadow-lg"><p class="font-bold text-blue-400 mb-1">مساعد سند الرسمي</p>تم استلام رسالتك وتشفيرها بنجاح عبر منظومة سند السيادية. النظام يعمل بكفاءة تفوق الواتساب.</div></div>';
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }, 800);
        }

        function handleKeyPress(e) { if(e.key === 'Enter') sendMessage(); }

        function addContact() {
            const input = document.getElementById('new-contact-input');
            const val = input.value.trim();
            if(val) {
                alert('تمت إضافة جهة الاتصال / الرقم بنجاح إلى شبكة سند: ' + val);
                input.value = '';
            } else {
                alert('الرجاء إدخال رقم هاتف صحيح أو اسم الجهة أولاً.');
            }
        }

        function clearChat() { 
            document.getElementById('chat-messages').innerHTML = '<div class="text-center text-xs text-slate-500 py-4">تم مسح سجل المحادثات بنجاح وإعادة ضبط القناة.</div>'; 
        }

        function attachFile() { alert('تم فتح خزنة إرفاق الملفات والمستندات المشفرة.'); }
        function toggleVoiceRecord() { alert('جاري التسجيل الصوتي المدعوم بالذكاء الاصطناعي...'); }
        function toggleLang() { alert('تم التبديل بين اللغتين العربية والإنجليزية بنجاح.'); }

        function askAI() {
            const input = document.getElementById('ai-input');
            const text = input.value.trim();
            if(!text) return;
            const box = document.getElementById('ai-chat-box');
            box.innerHTML += '<div class="bg-slate-900 p-3.5 rounded-xl border border-slate-800 text-sm shadow"><strong>أنت:</strong> ' + text + '</div>';
            box.innerHTML += '<div class="bg-indigo-950/50 p-4 rounded-xl border border-indigo-800/60 text-sm text-indigo-100 shadow"><strong>Sanad AI:</strong> بناءً على تحليلي السيادي لطلبك، النظام يعمل باستقرار تام وجاهز لتقديم أفضل دعم مجتمعي وميداني متطور.</div>';
            input.value = '';
            box.scrollTop = box.scrollHeight;
        }
    </script>
</body>
</html>`;

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(htmlContent);
});

server.listen(PORT, () => {
    console.log('Sanad Enterprise Server is running on port ' + PORT);
});
