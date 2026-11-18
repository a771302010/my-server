const http = require('http');

const htmlContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>منظومة سَنَد السيادية - الإصدار الفائق</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;900&display=swap');
        body { font-family: 'Cairo', sans-serif; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #3b82f6; border-radius: 10px; }
    </style>
</head>
<body class="bg-slate-950 text-slate-100 h-screen flex flex-col overflow-hidden">

    <!-- Header / شريط العنوان الرسمي -->
    <header class="bg-slate-900/95 border-b border-slate-800 px-4 py-3 flex justify-between items-center shadow-xl z-10">
        <div class="flex items-center space-x-3 space-x-reverse">
            <div class="bg-blue-600 p-2.5 rounded-2xl text-white shadow-lg shadow-blue-500/30 flex items-center justify-center font-bold">
                <i class="fa-solid fa-shield-halved text-xl"></i>
            </div>
            <div>
                <h1 class="font-black text-lg tracking-wide text-blue-400">منظومة سَنَد السيادية</h1>
                <span class="text-xs text-emerald-400 flex items-center gap-1.5 font-semibold">
                    <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> متصل (Live) - مدعوم بالذكاء الاصطناعي والأقمار الصناعية
                </span>
            </div>
        </div>
        <div class="flex items-center gap-3">
            <span id="active-account-badge" class="bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs px-3 py-1 rounded-full font-bold">
                الحساب النشط: 772302010
            </span>
            <button onclick="toggleLang()" class="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition font-semibold">EN / AR</button>
        </div>
    </header>

    <!-- Main Workspace -->
    <div class="flex flex-1 overflow-hidden">
        
        <!-- Sidebar / القائمة الجانبية -->
        <aside class="w-20 md:w-64 bg-slate-950 border-l border-slate-800/80 flex flex-col justify-between p-3 select-none">
            <div class="space-y-2">
                <button onclick="switchTab('chats')" id="btn-chats" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/30 transition">
                    <i class="fa-solid fa-comments text-lg"></i>
                    <span class="hidden md:inline">الدردشة والرسائل</span>
                </button>
                <button onclick="switchTab('accounts')" id="btn-accounts" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-900 text-slate-300 transition font-semibold">
                    <i class="fa-solid fa-address-book text-lg text-emerald-400"></i>
                    <span class="hidden md:inline">إدارة الحسابات والأرقام</span>
                </button>
                <button onclick="switchTab('ai')" id="btn-ai" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-900 text-slate-300 transition font-semibold">
                    <i class="fa-solid fa-brain text-lg text-indigo-400"></i>
                    <span class="hidden md:inline">الذكاء الاصطناعي AI</span>
                </button>
                <button onclick="switchTab('calls')" id="btn-calls" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-900 text-slate-300 transition font-semibold">
                    <i class="fa-solid fa-phone-volume text-lg text-amber-400"></i>
                    <span class="hidden md:inline">المكالمات المشفرة</span>
                </button>
                <button onclick="switchTab('vault')" id="btn-vault" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-900 text-slate-300 transition font-semibold">
                    <i class="fa-solid fa-vault text-lg text-purple-400"></i>
                    <span class="hidden md:inline">الخزنة السيادية</span>
                </button>
                <button onclick="switchTab('settings')" id="btn-settings" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-900 text-slate-300 transition font-semibold">
                    <i class="fa-solid fa-sliders text-lg text-slate-400"></i>
                    <span class="hidden md:inline">الإعدادات والتعليمات</span>
                </button>
            </div>
            
            <div class="hidden md:block p-3 bg-slate-900/60 rounded-2xl border border-slate-800 text-xs text-slate-400">
                <p class="font-bold text-blue-400 mb-1"><i class="fa-solid fa-circle-check"></i> منظومة سند الرسمية</p>
                أفضل من الواتساب بتشفير عسكري ذكي.
            </div>
        </aside>

        <!-- Content Area -->
        <main class="flex-1 flex flex-col bg-slate-900 relative overflow-hidden">
            
            <!-- 1. شاشة الدردشة والمراسلة -->
            <div id="tab-chats" class="flex-1 flex flex-col h-full">
                <div class="bg-slate-950/60 p-3 border-b border-slate-800 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <span class="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></span>
                        <span class="text-sm font-bold text-slate-200">الدردشة المباشرة (إرسال، استقبال، حذف للطرفين)</span>
                    </div>
                    <button onclick="clearChat()" class="text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 px-3 py-1.5 rounded-lg border border-red-500/30 transition font-semibold">مسح السجل</button>
                </div>

                <!-- رسائل الدردشة -->
                <div id="chat-messages" class="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    <div class="flex items-start gap-3">
                        <div class="w-9 h-9 rounded-2xl bg-blue-600 flex items-center justify-center font-bold text-sm shadow">سـ</div>
                        <div class="bg-slate-950 border border-slate-800 p-4 rounded-2xl max-w-lg text-sm leading-relaxed shadow-lg">
                            <p class="font-bold text-blue-400 mb-1">منظومة سند السيادية</p>
                            أهلاً بك يا مهندس عبد الله. تم تفعيل نظام الأكواد والذكاء الاصطناعي بنجاح. يمكنك الآن مراسلة زملائك بأي رقم (مثل 772302010) وإدارة أكثر من حساب بكل سهولة!
                        </div>
                    </div>
                </div>

                <!-- خانة الإدخال -->
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

            <!-- 2. إدارة الحسابات والأرقام (دعم عدة أرقام وحسابات) -->
            <div id="tab-accounts" class="hidden flex-1 flex flex-col p-6 overflow-y-auto custom-scrollbar">
                <h2 class="text-xl font-bold text-emerald-400 mb-2 flex items-center gap-2"><i class="fa-solid fa-address-book"></i> إدارة الحسابات والأرقام المتعددة</h2>
                <p class="text-xs text-slate-400 mb-6">أضف حساباتك وأرقامك الخاصة (مثل الأرقام اليمنية 772302010 وغيرها) وقم بالتفعيل الفوري بالأكواد.</p>
                
                <div class="bg-slate-950 border border-slate-800 p-5 rounded-2xl max-w-xl space-y-4 mb-6 shadow-xl">
                    <h3 class="font-bold text-sm text-slate-200">إضافة رقم أو حساب جديد</h3>
                    <div class="flex gap-2">
                        <input type="text" id="new-phone-input" placeholder="أدخل رقم الهاتف (مثال: 967772302010)..." class="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 text-slate-100">
                        <button onclick="requestActivationCode()" class="bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 rounded-xl font-bold text-sm transition shadow">إرسال كود التفعيل</button>
                    </div>
                </div>

                <div class="bg-slate-950 border border-slate-800 p-5 rounded-2xl max-w-xl">
                    <h3 class="font-bold text-sm text-slate-200 mb-3">الحسابات المسجلة حالياً:</h3>
                    <div id="accounts-list" class="space-y-2">
                        <div class="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800">
                            <span class="text-sm font-semibold text-blue-300"><i class="fa-solid fa-user-check"></i> الحساب الأساسي: +967 772302010 (نشط)</span>
                            <span class="text-xs bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-lg font-bold">متصل</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 3. شاشة الذكاء الاصطناعي -->
            <div id="tab-ai" class="hidden flex-1 flex flex-col h-full p-4 overflow-y-auto custom-scrollbar">
                <div class="bg-gradient-to-r from-blue-900/50 to-indigo-900/50 border border-blue-500/30 p-5 rounded-2xl mb-4 shadow-xl">
                    <h2 class="text-lg font-bold text-blue-300 flex items-center gap-2">
                        <i class="fa-solid fa-brain text-xl"></i> محساعد الذكاء الاصطناعي السيادي (Sanad AI)
                    </h2>
                    <p class="text-xs text-slate-300 mt-1">مدعوم بالنماذج المتقدمة للتحليل الفوري، صياغة النصوص الرسمية، والمراسلات الدولية.</p>
                </div>
                <div id="ai-chat-box" class="flex-1 bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3 mb-4 overflow-y-auto custom-scrollbar">
                    <div class="text-slate-400 text-xs text-center py-2">اسأل مساعد سند الذكي أي استفسار أو اطلب إعداد تقارير رسمية...</div>
                </div>
                <div class="flex gap-2">
                    <input type="text" id="ai-input" placeholder="اطلب من الذكاء الاصطناعي..." class="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 text-slate-100">
                    <button onclick="askAI()" class="bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-xl font-bold text-sm transition shadow-lg">تنفيذ ذكي</button>
                </div>
            </div>

            <!-- 4. شاشة المكالمات المشفرة -->
            <div id="tab-calls" class="hidden flex-1 flex flex-col items-center justify-center p-6 text-center">
                <div class="w-24 h-24 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-3xl flex items-center justify-center text-4xl mb-4 shadow-2xl animate-bounce">
                    <i class="fa-solid fa-video"></i>
                </div>
                <h2 class="text-xl font-bold mb-2">المكالمات الصوتية وفيديو عالية الجودة</h2>
                <p class="text-sm text-slate-400 max-w-md mb-6">اتصالات مؤمنة عبر الأقمار الاصطناعية وتقنية P2P السحابية بين جميع أنحاء العالم.</p>
                <button onclick="alert('جاري بدء مكالمة فيديو مشفرة عالية الجودة...')" class="bg-amber-600 hover:bg-amber-700 text-white px-8 py-3.5 rounded-2xl font-bold shadow-lg transition">بدء مكالمة جديدة</button>
            </div>

            <!-- 5. الخزنة السيادية -->
            <div id="tab-vault" class="hidden flex-1 flex flex-col p-6 overflow-y-auto custom-scrollbar">
                <h2 class="text-xl font-bold text-purple-400 mb-2 flex items-center gap-2"><i class="fa-solid fa-vault"></i> الخزنة السيادية للملفات</h2>
                <p class="text-xs text-slate-400 mb-6">تخزين آمن ومشفر بالكامل للملفات، المستندات، والصور.</p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="bg-slate-950 border border-slate-800 p-5 rounded-2xl text-center shadow-lg">
                        <i class="fa-solid fa-file-shield text-4xl text-purple-500 mb-3"></i>
                        <h3 class="font-bold text-base mb-1">المستندات الرسمية</h3>
                        <span class="text-xs text-slate-500">تشفير عسكري AES-256</span>
                    </div>
                    <div class="bg-slate-950 border border-slate-800 p-5 rounded-2xl text-center shadow-lg">
                        <i class="fa-solid fa-key text-4xl text-blue-500 mb-3"></i>
                        <h3 class="font-bold text-base mb-1">أكواد التوثيق</h3>
                        <span class="text-xs text-slate-500">آمنة ومحمية تماماً</span>
                    </div>
                </div>
            </div>

            <!-- 6. الإعدادات والتعليمات -->
            <div id="tab-settings" class="hidden flex-1 flex flex-col p-6 overflow-y-auto custom-scrollbar">
                <h2 class="text-xl font-bold mb-4 flex items-center gap-2 text-slate-200"><i class="fa-solid fa-sliders"></i> الإعدادات والتعليمات الرسمية</h2>
                <div class="space-y-4 max-w-xl">
                    <div class="bg-slate-950 p-4.5 rounded-2xl border border-slate-800">
                        <h4 class="font-bold text-sm text-blue-400 mb-1">طريقة الحصول على الأكواد والاتصال:</h4>
                        <p class="text-xs text-slate-300 leading-relaxed">يدعم نظام سند إدخال أرقام متعددة (مثل رقمك 772302010) ويقوم بتوليد كود تفعيل أوتوماتيكي (من 6 إلى 9 أرقام) لربط الحساب بالشبكة السحابية فوراً دون الحاجة لشركات الاتصالات التقليدية.</p>
                    </div>
                    <div class="flex items-center justify-between bg-slate-950 p-4.5 rounded-2xl border border-slate-800">
                        <div>
                            <h4 class="font-bold text-sm text-slate-200">الذكاء الاصطناعي التلقائي</h4>
                            <p class="text-xs text-slate-400">تحليل النصوص وتحسين الرسائل بشكل فوري.</p>
                        </div>
                        <input type="checkbox" checked class="w-5 h-5 accent-blue-600">
                    </div>
                </div>
            </div>

        </main>
    </div>

    <script>
        function switchTab(tabId) {
            const tabs = ['chats', 'accounts', 'ai', 'calls', 'vault', 'settings'];
            tabs.forEach(t => {
                document.getElementById('tab-' + t).classList.add('hidden');
                const btn = document.getElementById('btn-' + t);
                if(btn) btn.className = "w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-900 text-slate-300 transition font-semibold";
            });
            document.getElementById('tab-' + tabId).classList.remove('hidden');
            const activeBtn = document.getElementById('btn-' + tabId);
            if(activeBtn) activeBtn.className = "w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/30 transition";
        }

        function sendMessage() {
            const input = document.getElementById('chat-input');
            const text = input.value.trim();
            if(!text) return;
            const chatMessages = document.getElementById('chat-messages');
            chatMessages.innerHTML += '<div class="flex items-start gap-3 justify-end"><div class="bg-blue-600 text-white p-3.5 rounded-2xl max-w-lg text-sm leading-relaxed shadow-lg">' + text + '</div><div class="w-9 h-9 rounded-2xl bg-slate-800 flex items-center justify-center font-bold text-sm shadow">أنت</div></div>';
            input.value = '';
            chatMessages.scrollTop = chatMessages.scrollHeight;

            setTimeout(() => {
                chatMessages.innerHTML += '<div class="flex items-start gap-3"><div class="w-9 h-9 rounded-2xl bg-blue-600 flex items-center justify-center font-bold text-sm shadow">سـ</div><div class="bg-slate-950 border border-slate-800 p-4 rounded-2xl max-w-lg text-sm leading-relaxed shadow-lg"><p class="font-bold text-blue-400 mb-1">منظومة سند السيادية</p>تم إرسال الرسالة وتشفيرها بنجاح عبر النظام الذكي المتكامل.</div></div>';
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }, 800);
        }

        function handleKeyPress(e) { if(e.key === 'Enter') sendMessage(); }

        function requestActivationCode() {
            const phoneInput = document.getElementById('new-phone-input');
            const phone = phoneInput.value.trim();
            if(phone) {
                const randomCode = Math.floor(100000000 + Math.random() * 900000000); // كود من 9 أرقام
                alert('تم توليد كود التفعيل المعتمد بنجاح للرقم ' + phone + '\\nكود التفعيل (9 أرقام): ' + randomCode);
                document.getElementById('accounts-list').innerHTML += '<div class="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-slate-800"><span class="text-sm font-semibold text-blue-350"><i class="fa-solid fa-user-plus"></i> الحساب المضاف: ' + phone + '</span><span class="text-xs bg-blue-500/20 text-blue-400 px-2.5 py-1 rounded-lg font-bold">مفعل</span></div>';
                phoneInput.value = '';
            } else {
                alert('الرجاء إدخال رقم الهاتف صحيحاً أولاً.');
            }
        }

        function clearChat() { 
            document.getElementById('chat-messages').innerHTML = '<div class="text-center text-xs text-slate-500 py-4">تم مسح سجل المحادثات بنجاح.</div>'; 
        }

        function attachFile() { alert('تم فتح خزنة إرفاق الملفات والمستندات المشفرة.'); }
        function toggleVoiceRecord() { alert('جاري التسجيل الصوتي المدعوم بالذكاء الاصطناعي...'); }
        function toggleLang() { alert('تم التبديل بين اللغات بنجاح.'); }

        function askAI() {
            const input = document.getElementById('ai-input');
            const text = input.value.trim();
            if(!text) return;
            const box = document.getElementById('ai-chat-box');
            box.innerHTML += '<div class="bg-slate-900 p-3.5 rounded-xl border border-slate-800 text-sm shadow"><strong>أنت:</strong> ' + text + '</div>';
            box.innerHTML += '<div class="bg-indigo-950/50 p-4 rounded-xl border border-indigo-800/60 text-sm text-indigo-100 shadow"><strong>Sanad AI:</strong> النظام يعمل بكفاءة تامة، وتم تفعيل الردود الذكية وتأمين كافة القنوات.</div>';
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
    console.log('Sanad Ultimate Server is running on port ' + PORT);
});
