<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>منظومة سَنَد - النسخة الدولية الرسمية الذكية</title>
    <!-- Tailwind CSS CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- FontAwesome Icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;900&display=swap');
        body { font-family: 'Cairo', sans-serif; }
        .glass-panel { background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(12px); }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #3b82f6; border-radius: 10px; }
    </style>
</head>
<body class="bg-slate-950 text-slate-100 h-screen flex flex-col overflow-hidden">

    <!-- Header / الشريط العلوي -->
    <header class="bg-slate-900/90 border-b border-slate-800 px-4 py-3 flex justify-between items-center shadow-lg z-10">
        <div class="flex items-center space-x-3 space-x-reverse">
            <div class="bg-blue-600 p-2 rounded-xl text-white font-bold shadow-md shadow-blue-500/20">
                <i class="fa-solid fa-shield-halved text-xl"></i>
            </div>
            <div>
                <h1 class="font-bold text-lg tracking-wide text-blue-400">منظومة سَنَد</h1>
                <span class="text-xs text-emerald-400 flex items-center gap-1">
                    <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> متصل (Live) - الإصدار السيادي
                </span>
            </div>
        </div>
        <div class="flex items-center gap-3">
            <span class="bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs px-3 py-1 rounded-full font-semibold">
                النسخة الدولية الرسمية
            </span>
            <button onclick="toggleLang()" class="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition">EN / AR</button>
        </div>
    </header>

    <!-- Main Workspace / مساحة العمل الرئيسية -->
    <div class="flex flex-1 overflow-hidden">
        
        <!-- Sidebar Navigation / القائمة الجانبية -->
        <aside class="w-20 md:w-64 bg-slate-900/60 border-l border-slate-800 flex flex-col justify-between p-3 select-none">
            <div class="space-y-2">
                <button onclick="switchTab('chats')" id="btn-chats" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-600 text-white font-medium shadow-lg transition">
                    <i class="fa-solid fa-comments text-lg"></i>
                    <span class="hidden md:inline">الدردشة</span>
                </button>
                <button onclick="switchTab('ai')" id="btn-ai" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800/70 text-slate-300 transition">
                    <i class="fa-solid fa-robot text-lg text-indigo-400"></i>
                    <span class="hidden md:inline">الذكاء الاصطناعي AI</span>
                </button>
                <button onclick="switchTab('calls')" id="btn-calls" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800/70 text-slate-300 transition">
                    <i class="fa-solid fa-phone text-lg text-emerald-400"></i>
                    <span class="hidden md:inline">المكالمات المشفرة</span>
                </button>
                <button onclick="switchTab('vault')" id="btn-vault" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800/70 text-slate-300 transition">
                    <i class="fa-solid fa-vault text-lg text-amber-400"></i>
                    <span class="hidden md:inline">الخزنة السيادية</span>
                </button>
                <button onclick="switchTab('settings')" id="btn-settings" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800/70 text-slate-300 transition">
                    <i class="fa-solid fa-gear text-lg text-slate-400"></i>
                    <span class="hidden md:inline">الإعدادات</span>
                </button>
            </div>
            
            <div class="hidden md:block p-3 bg-slate-950/50 rounded-xl border border-slate-800/80 text-xs text-slate-400">
                <p class="font-semibold text-blue-400 mb-1"><i class="fa-solid fa-lock"></i> حماية عسكرية</p>
                تشفير تام طرف-لطرف (End-to-End)
            </div>
        </aside>

        <!-- Content Area / محتوى الشاشات -->
        <main class="flex-1 flex flex-col bg-slate-950 relative overflow-hidden">
            
            <!-- Tab 1: Chats / شاشة المحادثات -->
            <div id="tab-chats" class="flex-1 flex flex-col h-full">
                <!-- Sub-header for chats -->
                <div class="bg-slate-900/40 p-3 border-b border-slate-800 flex items-center justify-between gap-2">
                    <span class="text-sm font-semibold text-slate-300">خدمة العملاء المركزية</span>
                    <div class="flex gap-2">
                        <button onclick="clearChat()" class="text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 px-3 py-1 rounded-lg border border-red-500/30 transition">مسح الكل</button>
                    </div>
                </div>

                <!-- Add Contact Bar -->
                <div class="p-3 bg-slate-900/20 border-b border-slate-800/60 flex gap-2">
                    <input type="text" id="new-contact-input" placeholder="إضافه جهة اتصال جديدة..." class="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500 text-slate-200">
                    <button onclick="addContact()" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-sm font-semibold transition shadow-md">إضافة</button>
                </div>

                <!-- Messages Feed -->
                <div id="chat-messages" class="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    <div class="flex items-start gap-3">
                        <div class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm">سـ</div>
                        <div class="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl max-w-md text-sm leading-relaxed shadow">
                            مرحباً بك في **منظومة سند**. تم تفعيل النظام بنجاح برعاية الذكاء الاصطناعي السيادي. كيف يمكننا مساعدتك اليوم؟
                        </div>
                    </div>
                </div>

                <!-- Chat Input Footer -->
                <div class="p-3 bg-slate-900/80 border-t border-slate-800 flex items-center gap-2">
                    <button onclick="attachFile()" class="text-slate-400 hover:text-blue-400 p-2 transition"><i class="fa-solid fa-paperclip text-lg"></i></button>
                    <button onclick="toggleVoiceRecord()" id="voice-btn" class="text-slate-400 hover:text-purple-400 p-2 transition"><i class="fa-solid fa-microphone text-lg"></i></button>
                    <input type="text" id="chat-input" onkeypress="handleKeyPress(event)" placeholder="اكتب رسالة مشفرة..." class="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 text-slate-100">
                    <button onclick="sendMessage()" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition flex items-center gap-2 shadow-lg shadow-blue-600/20">
                        <span>إرسال</span>
                        <i class="fa-solid fa-paper-plane text-xs"></i>
                    </button>
                </div>
            </div>

            <!-- Tab 2: AI Engine / شاشة الذكاء الاصطناعي الفائق -->
            <div id="tab-ai" class="hidden flex-1 flex flex-col h-full p-4 overflow-y-auto">
                <div class="bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border border-blue-500/30 p-4 rounded-2xl mb-4">
                    <h2 class="text-lg font-bold text-blue-300 flex items-center gap-2">
                        <i class="fa-solid fa-brain"></i> مساعد سند الذكي (Sناد AI)
                    </h2>
                    <p class="text-xs text-slate-300 mt-1">مساعد ذكاء اصطناعي متطور يفوق المعايير التقليدية، مدرب للرد الفوري وتحليل البيانات وتحسين المهام.</p>
                </div>
                <div id="ai-chat-box" class="flex-1 bg-slate-900/50 border border-slate-800 rounded-2xl p-4 space-y-3 mb-4 overflow-y-auto">
                    <div class="text-slate-400 text-xs text-center py-2">ابدأ محادثة ذكية مع نموذج سَنَد الفائق...</div>
                </div>
                <div class="flex gap-2">
                    <input type="text" id="ai-input" placeholder="اسأل الذكاء الاصطناعي أي شيء..." class="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500">
                    <button onclick="askAI()" class="bg-indigo-600 hover:bg-indigo-700 px-6 py-2.5 rounded-xl font-semibold text-sm transition">تنفيذ ذكي</button>
                </div>
            </div>

            <!-- Tab 3: Calls / المكالمات -->
            <div id="tab-calls" class="hidden flex-1 flex flex-col items-center justify-center p-6 text-center">
                <div class="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-3xl flex items-center justify-center text-3xl mb-4 shadow-lg shadow-emerald-500/10">
                    <i class="fa-solid fa-phone-volume animate-bounce"></i>
                </div>
                <h2 class="text-xl font-bold mb-2">المكالمات الصوتية والمرئية المشفرة</h2>
                <p class="text-sm text-slate-400 max-w-md mb-6">اتصالات فائقة الجودة مؤمنة بالكامل بتقنية P2P السحابية المتقدمة، لا يمكن اعتراضها أو تسجيلها.</p>
                <button onclick="alert('جاري بدء اتصال آمن...')" class="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-2xl font-semibold shadow-lg shadow-emerald-600/30 transition">بدء اتصال جديد</button>
            </div>

            <!-- Tab 4: Vault / الخزنة -->
            <div id="tab-vault" class="hidden flex-1 flex flex-col p-6 overflow-y-auto">
                <h2 class="text-xl font-bold text-amber-400 mb-2 flex items-center gap-2"><i class="fa-solid fa-vault"></i> الخزنة السيادية للملفات</h2>
                <p class="text-xs text-slate-400 mb-4">مكان آمن ومحمي لتخزين مستنداتك وسجلاتك بتشفير AES-256.</p>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center">
                        <i class="fa-solid fa-file-shield text-3xl text-amber-500 mb-2"></i>
                        <h3 class="font-bold text-sm">مستندات الهوية</h3>
                        <span class="text-xs text-slate-500">مشفر بالكامل</span>
                    </div>
                    <div class="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center">
                        <i class="fa-solid fa-key text-3xl text-blue-500 mb-2"></i>
                        <h3 class="font-bold text-sm">مفاتيح التشفير</h3>
                        <span class="text-xs text-slate-500">آمن تماماً</span>
                    </div>
                </div>
            </div>

            <!-- Tab 5: Settings / الإعدادات -->
            <div id="tab-settings" class="hidden flex-1 flex flex-col p-6 overflow-y-auto">
                <h2 class="text-xl font-bold mb-4 flex items-center gap-2"><i class="fa-solid fa-sliders"></i> إعدادات النظام</h2>
                <div class="space-y-4 max-w-xl">
                    <div class="flex items-center justify-between bg-slate-900 p-4 rounded-xl border border-slate-800">
                        <div>
                            <h4 class="font-semibold text-sm">الوضع المظلم الفائق</h4>
                            <p class="text-xs text-slate-400">توفير الطاقة وحماية العين بتقنية OLED السوداء.</p>
                        </div>
                        <input type="checkbox" checked class="w-5 h-5 accent-blue-600">
                    </div>
                    <div class="flex items-center justify-between bg-slate-900 p-4 rounded-xl border border-slate-800">
                        <div>
                            <h4 class="font-semibold text-sm">الذكاء الاصطناعي التلقائي</h4>
                            <p class="text-xs text-slate-400">الرد الذكي التلقائي على الرسائل الواردة.</p>
                        </div>
                        <input type="checkbox" checked class="w-5 h-5 accent-blue-600">
                    </div>
                </div>
            </div>

        </main>
    </div>

    <!-- JavaScript Engine -->
    <script>
        function switchTab(tabId) {
            const tabs = ['chats', 'ai', 'calls', 'vault', 'settings'];
            tabs.forEach(t => {
                document.getElementById('tab-' + t).classList.add('hidden');
                const btn = document.getElementById('btn-' + t);
                if(btn) btn.className = "w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800/70 text-slate-300 transition";
            });
            document.getElementById('tab-' + tabId).classList.remove('hidden');
            const activeBtn = document.getElementById('btn-' + tabId);
            if(activeBtn) activeBtn.className = "w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-600 text-white font-medium shadow-lg transition";
        }

        function sendMessage() {
            const input = document.getElementById('chat-input');
            const text = input.value.trim();
            if(!text) return;

            const chatMessages = document.getElementById('chat-messages');
            
            // User Message
            chatMessages.innerHTML += `
                <div class="flex items-start gap-3 justify-end">
                    <div class="bg-blue-600 text-white p-3.5 rounded-2xl max-w-md text-sm leading-relaxed shadow">
                        ${text}
                    </div>
                    <div class="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-sm">أنت</div>
                </div>
            `;
            input.value = '';
            chatMessages.scrollTop = chatMessages.scrollHeight;

            // AI Smart Response Simulation
            setTimeout(() => {
                chatMessages.innerHTML += `
                    <div class="flex items-start gap-3">
                        <div class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm">سـ</div>
                        <div class="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl max-w-md text-sm leading-relaxed shadow">
                            تم استلام رسالتك ومعالجتها بواسطة محرك سند الذكي بنجاح. 🚀
                        </div>
                    </div>
                `;
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }, 1000);
        }

        function handleKeyPress(e) {
            if(e.key === 'Enter') sendMessage();
        }

        function addContact() {
            const input = document.getElementById('new-contact-input');
            if(input.value.trim()) {
                alert('تمت إضافة جهة الاتصال: ' + input.value);
                input.value = '';
            }
        }

        function clearChat() {
            document.getElementById('chat-messages').innerHTML = '<div class="text-center text-xs text-slate-500 py-4">تم مسح المحادثة بنجاح</div>';
        }

        function attachFile() { alert('نافذة رفع الملفات السيادية مشفرة وجاهزة.'); }
        function toggleVoiceRecord() { alert('جاري التسجيل الصوتي الذكي...'); }
        function toggleLang() { alert('تم التبديل بين العربية والإنجليزية.'); }

        function askAI() {
            const input = document.getElementById('ai-input');
            const text = input.value.trim();
            if(!text) return;
            const box = document.getElementById('ai-chat-box');
            box.innerHTML += `<div class="bg-slate-950 p-3 rounded-xl border border-slate-800 text-sm"><strong>أنت:</strong> ${text}</div>`;
            box.innerHTML += `<div class="bg-indigo-950/40 p-3 rounded-xl border border-indigo-800/50 text-sm text-indigo-200"><strong>سند AI:</strong> تحليل فوري لطلبك: النظام يعمل بكفاءة قصوى والقدرات الذكية مفعلة بالكامل لمنافست أقوى المنصات العالمية.</div>`;
            input.value = '';
            box.scrollTop = box.scrollHeight;
        }
    </script>
</body>
</html>
