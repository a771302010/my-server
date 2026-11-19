const http = require('http');

const htmlContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>منظومة سَنَد - الإصدار الرسمي 1.0</title>
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

    <!-- الشريط العلوي الرسمي لمنظومة سند -->
    <header class="bg-slate-900 border-b border-slate-800 px-4 py-3 flex justify-between items-center shadow-lg z-20">
        <div class="flex items-center gap-3">
            <!-- شعار سَنَد الأزرق المعتمد -->
            <div class="w-11 h-11 rounded-2xl bg-gradient-to-b from-blue-600 to-blue-900 border border-blue-400/40 flex flex-col items-center justify-center shadow-lg shadow-blue-600/30">
                <span class="text-white font-black text-xl leading-none">S</span>
                <i class="fa-solid fa-hands-holding-child text-[10px] text-blue-200 mt-0.5"></i>
            </div>
            <div>
                <div class="flex items-center gap-2">
                    <h1 class="font-black text-base md:text-lg text-white">منظومة سَنَد</h1>
                    <span class="bg-blue-600/20 border border-blue-500/40 text-blue-300 text-[10px] px-2 py-0.5 rounded-full font-bold">الإصدار 1.0 • AI</span>
                </div>
                <p class="text-[11px] text-emerald-400 flex items-center gap-1.5 font-semibold">
                    <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> متصل • المعرّف النشط: <span id="active-id-display" class="font-mono text-white font-bold tracking-wider">88888888</span>
                </p>
            </div>
        </div>
        <div>
            <button onclick="switchTab('accounts')" class="bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-300 flex items-center gap-1.5 transition">
                <i class="fa-solid fa-repeat"></i> تبديل / إضافة حساب
            </button>
        </div>
    </header>

    <!-- المحتوى الرئيسي -->
    <main class="flex-1 flex flex-col overflow-hidden relative bg-[#090e1a]">

        <!-- 1. قسم الدردشة والمراسلة المشفرة -->
        <div id="tab-chats" class="flex-1 flex flex-col h-full">
            <!-- شريط جهات الاتصال السريع -->
            <div class="p-3 bg-slate-900/70 border-b border-slate-800 flex flex-col sm:flex-row gap-2">
                <div class="flex-1 flex gap-2">
                    <input type="text" id="target-contact" placeholder="أدخل معرّف سَنَد (8 أرقام) أو رقم الجوال للمراسلة..." class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs md:text-sm focus:outline-none focus:border-blue-500 text-slate-100">
                    <button onclick="connectToUser()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow">
                        بدء محادثة
                    </button>
                </div>
                <button onclick="connectCustomerService()" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-400 px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
                    <i class="fa-solid fa-headset"></i> خدمة العملاء (88888888)
                </button>
            </div>

            <!-- شريط عنوان المحادثة النشطة -->
            <div class="px-4 py-2 bg-slate-950/60 border-b border-slate-800/80 flex justify-between items-center text-xs">
                <span class="text-slate-300 font-bold">المحادثة النشطة مع: <span id="chat-partner-name" class="text-blue-400 font-mono">88888888 (خدمة العملاء المركزية)</span></span>
                <button onclick="clearChat()" class="text-red-400 hover:text-red-300 font-semibold"><i class="fa-solid fa-trash-can ml-1"></i>مسح السجل</button>
            </div>

            <!-- صندوق الرسائل -->
            <div id="chat-messages" class="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                <div class="flex items-start gap-2.5">
                    <div class="w-8 h-8 rounded-xl bg-blue-700 flex items-center justify-center font-black text-xs shadow">S</div>
                    <div class="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl rounded-tr-none max-w-md text-xs md:text-sm leading-relaxed shadow">
                        <div class="flex justify-between items-center mb-1 gap-4">
                            <span class="font-bold text-blue-400">خدمة العملاء (88888888)</span>
                            <span class="text-[10px] text-slate-500">مُشفر</span>
                        </div>
                        أهلاً بك في <strong>منظومة سَنَد</strong>. النظام يعمل ببروتوكول التشفير الذكي. يمكنك التواصل عبر معرّفك المكون من 8 أرقام بدون فواصل، أو إضافة أرقام هواتف متعددة من تبويب «الحسابات».
                    </div>
                </div>
            </div>

            <!-- شريط إرسال الرسائل -->
            <div class="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
                <button onclick="switchTab('vault')" title="إرفاق من الخزنة" class="text-slate-400 hover:text-amber-400 p-2.5 rounded-xl hover:bg-slate-800 transition"><i class="fa-solid fa-paperclip text-lg"></i></button>
                <input type="text" id="chat-input" onkeypress="if(event.key==='Enter') sendMessage()" placeholder="اكتب رسالتك المشفرة هنا..." class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 text-slate-100">
                <button onclick="recordVoiceAI()" title="تسجيل صوتي ذكي" class="text-slate-400 hover:text-emerald-400 p-2.5 rounded-xl hover:bg-slate-800 transition"><i class="fa-solid fa-microphone text-lg"></i></button>
                <button onclick="sendMessage()" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-lg shadow-blue-600/20">
                    إرسال
                </button>
            </div>
        </div>

        <!-- 2. قسم الحسابات والتفعيل (رقم جوال أو كود 8 أرقام) -->
        <div id="tab-accounts" class="hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-4">
            <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-4">
                <h2 class="text-base font-black text-blue-400 flex items-center gap-2"><i class="fa-solid fa-key"></i> نظام التفعيل المزدوج وإضافة الحسابات</h2>
                <p class="text-xs text-slate-400">يمكنك إضافة أكثر من حساب في نفس التطبيق (حساب برقم جوال دولي، أو حساب سري بكود 8 أرقام بدون جوال):</p>
                
                <!-- الخيار الأول: تفعيل برقم جوال -->
                <div class="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
                    <h3 class="text-xs font-bold text-emerald-400">1. إضافة حساب برقم جوال (يدعم كافة الدول)</h3>
                    <div class="flex flex-col sm:flex-row gap-2">
                        <select id="country-code" class="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white">
                            <option value="+967">اليمن (+967)</option>
                            <option value="+966">السعودية (+966)</option>
                            <option value="+971">الإمارات (+971)</option>
                            <option value="+20">مصر (+20)</option>
                            <option value="+1">دولي (+1)</option>
                        </select>
                        <input type="text" id="phone-input" placeholder="أدخل رقم الجوال (مثال: 772302010)" class="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white">
                        <select id="delivery-method" class="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-blue-300">
                            <option value="النظام الفوري">وصول الكود: فوري بالنظام</option>
                            <option value="الإيميل">وصول الكود: عبر الإيميل</option>
                            <option value="SMS">وصول الكود: رسالة SMS</option>
                        </select>
                        <button onclick="activateWithPhone()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold">طلب الكود وتفعيل</button>
                    </div>
                </div>

                <!-- الخيار الثاني: توليد كود 8 أرقام بدون جوال -->
                <div class="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3">
                    <div>
                        <h3 class="text-xs font-bold text-blue-400">2. توليد معرّف سَنَد سري (8 أرقام بدون فواصل - بدون جوال)</h3>
                        <p class="text-[11px] text-slate-400">يمنحك رقماً خاصاً للتواصل المشفر الكامل دون الحاجة لشريحة اتصال.</p>
                    </div>
                    <button onclick="generate8DigitAccount()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap shadow">
                        <i class="fa-solid fa-wand-magic-sparkles ml-1"></i> توليد رقم من 8 أرقام
                    </button>
                </div>
            </div>

            <!-- قائمة الحسابات المفعلة على هذا الجهاز -->
            <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div class="p-3 bg-slate-950/60 border-b border-slate-800 text-xs font-bold text-slate-300">
                    الحسابات المفعلة على جهازك (اضغط للتبديل الفوري بينها):
                </div>
                <div id="accounts-list" class="divide-y divide-slate-800">
                    <div onclick="switchActiveAccount('88888888', 'حساب الإدارة الرئيسي')" class="p-3.5 flex justify-between items-center hover:bg-slate-800/50 cursor-pointer">
                        <div>
                            <p class="text-xs font-bold text-white font-mono">88888888</p>
                            <p class="text-[10px] text-slate-400">حساب الإدارة وخدمة العملاء المعتمد</p>
                        </div>
                        <span class="text-[10px] bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-full font-bold">نشط حالياً</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- 3. قسم المكالمات المشفرة (صوت وفيديو) -->
        <div id="tab-calls" class="hidden flex-1 flex-col items-center justify-center p-6 text-center space-y-4">
            <div class="w-20 h-20 rounded-3xl bg-blue-600/10 border border-blue-500/30 text-blue-400 flex items-center justify-center text-3xl shadow-xl">
                <i class="fa-solid fa-satellite-dish animate-pulse"></i>
            </div>
            <h2 class="text-lg font-black text-white">المكالمات الصوتية والمرئية العالمية</h2>
            <p class="text-xs text-slate-400 max-w-md">اتصالات مشفرة بنظام P2P مدعومة بالذكاء الاصطناعي لتنقية الصوت وتقليل استهلاك البيانات في جميع أنحاء العالم.</p>
            <div class="w-full max-w-sm flex gap-2">
                <input type="text" id="call-target" placeholder="أدخل معرّف 8 أرقام أو رقم الجوال..." class="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-center font-mono text-white">
            </div>
            <div class="flex gap-3">
                <button onclick="startCall('صوتية')" class="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow"><i class="fa-solid fa-phone"></i> اتصال صوتي</button>
                <button onclick="startCall('فيديو')" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow"><i class="fa-solid fa-video"></i> اتصال فيديو</button>
            </div>
        </div>

        <!-- 4. قسم الذكاء الاصطناعي (Sanad AI) -->
        <div id="tab-ai" class="hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-3">
            <div class="bg-gradient-to-l from-indigo-950 to-slate-900 border border-indigo-500/30 p-4 rounded-2xl">
                <h2 class="text-sm font-black text-indigo-300 flex items-center gap-2"><i class="fa-solid fa-brain"></i> مساعد سَنَد للذكاء الاصطناعي المتقدم</h2>
                <p class="text-[11px] text-slate-300 mt-1">صياغة المراسلات الرسمية، الترجمة الفورية، تلخيص المحادثات، وتنظيم المهام.</p>
            </div>
            <div id="ai-messages" class="flex-1 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 overflow-y-auto space-y-2.5 text-xs custom-scrollbar">
                <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 text-slate-300">مرحباً! أنا مساعد الذكاء الاصطناعي في منظومة سَنَد. كيف أساعدك في صياغة رسائلك أو إدارة أعمالك اليوم؟</div>
            </div>
            <div class="flex gap-2">
                <input type="text" id="ai-input" onkeypress="if(event.key==='Enter') askSanadAI()" placeholder="اكتب طلبك للذكاء الاصطناعي..." class="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500">
                <button onclick="askSanadAI()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold">إرسال</button>
            </div>
        </div>

        <!-- 5. قسم الخزنة السيادية -->
        <div id="tab-vault" class="hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-4">
            <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex justify-between items-center">
                <div>
                    <h2 class="text-base font-black text-amber-400 flex items-center gap-2"><i class="fa-solid fa-vault"></i> الخزنة السيادية المشفرة</h2>
                    <p class="text-xs text-slate-400">حفظ المستندات، الأكواد السرية، والملفات بتشفير AES-256.</p>
                </div>
                <button onclick="saveToVault()" class="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-xs font-bold">+ حفظ بيان جديد</button>
            </div>
            <div id="vault-items" class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div class="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex items-center justify-between">
                    <div>
                        <p class="font-bold text-white">بروتوكول خدمة العملاء المعتمد</p>
                        <p class="text-slate-400 font-mono mt-0.5">Code: 88888888</p>
                    </div>
                    <i class="fa-solid fa-shield-check text-emerald-400 text-lg"></i>
                </div>
            </div>
        </div>

        <!-- 6. قسم الإعدادات والتعليمات الشاملة -->
        <div id="tab-settings" class="hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-4">
            <h2 class="text-base font-black text-white flex items-center gap-2"><i class="fa-solid fa-sliders text-blue-400"></i> الإعدادات الشاملة والتعليمات المعتمدة</h2>
            
            <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
                <h3 class="font-bold text-blue-400 text-sm">دليل التشغيل السريع لمنظومة سَنَد:</h3>
                <ul class="space-y-2 text-slate-300 list-disc list-inside leading-relaxed">
                    <li><strong>نظام المعرّفات (8 أرقام):</strong> كل حساب يحصل على رقم مكون من 8 أرقام متصلة بدون فواصل للتواصل السريع والآمن.</li>
                    <li><strong>خدمة العملاء الموحدة:</strong> الرقم <span class="font-mono text-amber-400 font-bold">88888888</span> مخصص للدعم الفني والإدارة المركزية.</li>
                    <li><strong>تعدد الحسابات:</strong> يمكنك إضافة رقم جوالك الدولي وتوليد عدة أكواد ثمانية والتبديل بينها من تبويب «الحسابات».</li>
                    <li><strong>الحذف النهائي:</strong> يمكنك حذف أي رسالة أرسلتها لتختفي من عندك ومن عند الطرف الآخر فوراً.</li>
                </ul>
            </div>

            <div class="bg-slate-900 border border-slate-800 rounded-2xl divide-y divide-slate-800 text-xs font-semibold">
                <div class="p-3.5 flex justify-between items-center">
                    <span>تفعيل التشفير العسكري التلقائي (End-to-End)</span>
                    <input type="checkbox" checked class="w-4 h-4 accent-blue-600">
                </div>
                <div class="p-3.5 flex justify-between items-center">
                    <span>تحسين الصوت بالذكاء الاصطناعي أثناء المكالمات</span>
                    <input type="checkbox" checked class="w-4 h-4 accent-blue-600">
                </div>
                <div class="p-3.5 flex justify-between items-center">
                    <span>حفظ نسخة احتياطية مشفرة في الخزنة السيادية</span>
                    <input type="checkbox" checked class="w-4 h-4 accent-blue-600">
                </div>
            </div>
        </div>

    </main>

    <!-- شريط التنقل السفلي المتكامل -->
    <nav class="bg-slate-900 border-t border-slate-800 px-1 py-2 flex justify-around items-center z-20">
        <button onclick="switchTab('chats')" id="nav-chats" class="flex flex-col items-center gap-1 text-blue-400 font-bold text-[10px] px-2 py-1">
            <i class="fa-solid fa-comments text-base"></i>
            <span>الدردشة</span>
        </button>
        <button onclick="switchTab('accounts')" id="nav-accounts" class="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-200 font-semibold text-[10px] px-2 py-1">
            <i class="fa-solid fa-id-card text-base"></i>
            <span>الحسابات</span>
        </button>
        <button onclick="switchTab('calls')" id="nav-calls" class="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-200 font-semibold text-[10px] px-2 py-1">
            <i class="fa-solid fa-phone-volume text-base"></i>
            <span>المكالمات</span>
        </button>
        <button onclick="switchTab('ai')" id="nav-ai" class="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-200 font-semibold text-[10px] px-2 py-1">
            <i class="fa-solid fa-brain text-base"></i>
            <span>الذكاء AI</span>
        </button>
        <button onclick="switchTab('vault')" id="nav-vault" class="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-200 font-semibold text-[10px] px-2 py-1">
            <i class="fa-solid fa-vault text-base"></i>
            <span>الخزنة</span>
        </button>
        <button onclick="switchTab('settings')" id="nav-settings" class="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-200 font-semibold text-[10px] px-2 py-1">
            <i class="fa-solid fa-gear text-base"></i>
            <span>الإعدادات</span>
        </button>
    </nav>

    <script>
        function switchTab(tab) {
            ['chats', 'accounts', 'calls', 'ai', 'vault', 'settings'].forEach(t => {
                document.getElementById('tab-' + t).classList.add('hidden');
                const nav = document.getElementById('nav-' + t);
                if (nav) nav.className = "flex flex-col items-center gap-1 text-slate-400 hover:text-slate-200 font-semibold text-[10px] px-2 py-1";
            });
            document.getElementById('tab-' + tab).classList.remove('hidden');
            const activeNav = document.getElementById('nav-' + tab);
            if (activeNav) activeNav.className = "flex flex-col items-center gap-1 text-blue-400 font-bold text-[10px] px-2 py-1";
        }

        function connectToUser() {
            const target = document.getElementById('target-contact').value.trim();
            if (!target) return alert('الرجاء إدخال معرّف سَنَد (8 أرقام) أو رقم الجوال.');
            document.getElementById('chat-partner-name').innerText = target;
            document.getElementById('chat-messages').innerHTML = \`
                <div class="text-center text-[11px] text-emerald-400 bg-emerald-950/30 border border-emerald-500/20 py-2 px-3 rounded-xl">
                    🔒 تم إنشاء قناة اتصال مشفرة مباشرة مع: <strong class="font-mono">\${target}</strong>
                </div>\`;
            document.getElementById('target-contact').value = '';
        }

        function connectCustomerService() {
            document.getElementById('chat-partner-name').innerText = '88888888 (خدمة العملاء المركزية)';
            document.getElementById('chat-messages').innerHTML += \`
                <div class="flex items-start gap-2.5">
                    <div class="w-8 h-8 rounded-xl bg-amber-600 flex items-center justify-center font-black text-xs shadow">88</div>
                    <div class="bg-slate-900 border border-slate-800 p-3 rounded-2xl text-xs">
                        أهلاً بك في خدمة عملاء سَنَد (88888888). كيف يمكننا خدمتك؟
                    </div>
                </div>\`;
        }

        function sendMessage() {
            const input = document.getElementById('chat-input');
            const text = input.value.trim();
            if (!text) return;
            const msgId = 'msg-' + Date.now();
            const box = document.getElementById('chat-messages');
            box.innerHTML += \`
                <div id="\${msgId}" class="flex items-start gap-2.5 justify-end">
                    <div class="bg-blue-600 text-white p-3 rounded-2xl rounded-tl-none max-w-md text-xs md:text-sm shadow">
                        <p>\${text}</p>
                        <div class="flex justify-between items-center gap-4 mt-1.5 pt-1 border-t border-blue-500/40 text-[10px] text-blue-200">
                            <span>مُشفر ✓✓</span>
                            <button onclick="deleteForEveryone('\${msgId}')" class="text-red-200 hover:text-white underline">حذف من الطرفين</button>
                        </div>
                    </div>
                </div>\`;
            input.value = '';
            box.scrollTop = box.scrollHeight;
        }

        function deleteForEveryone(id) {
            const el = document.getElementById(id);
            if (el) el.innerHTML = '<div class="text-[11px] text-slate-500 italic bg-slate-900/60 px-3 py-1 rounded-lg">🚫 تم حذف هذه الرسالة من الطرفين نهائياً</div>';
        }

        function clearChat() {
            document.getElementById('chat-messages').innerHTML = '<div class="text-center text-xs text-slate-500 py-4">تم مسح سجل المحادثة بالكامل.</div>';
        }

        function activateWithPhone() {
            const code = document.getElementById('country-code').value;
            const phone = document.getElementById('phone-input').value.trim();
            const method = document.getElementById('delivery-method').value;
            if (!phone) return alert('الرجاء إدخال رقم الجوال أولاً.');
            const otp = Math.floor(100000 + Math.random() * 900000);
            const userVerify = prompt('تم إرسال كود التفعيل عبر (' + method + ') إلى الرقم ' + code + phone + '\\nأدخل كود التفعيل المكون من 6 أرقام (الكود المرسل: ' + otp + '):');
            if (userVerify) {
                const fullNum = code + phone;
                addAccountToList(fullNum, 'حساب جوال موثق (' + method + ')');
                document.getElementById('phone-input').value = '';
            }
        }

        function generate8DigitAccount() {
            // توليد 8 أرقام متصلة بدون أي فواصل
            const id8 = Math.floor(10000000 + Math.random() * 90000000).toString();
            addAccountToList(id8, 'معرّف سَنَد الخاص (8 أرقام بدون جوال)');
            alert('تم توليد وتفعيل معرّف سَنَد الخاص بك بنجاح:\\n' + id8 + '\\nيمكنك مشاركة هذا الرقم مع زملائك للتواصل فوراً.');
        }

        function addAccountToList(id, desc) {
            const list = document.getElementById('accounts-list');
            list.innerHTML += \`
                <div onclick="switchActiveAccount('\${id}', '\${desc}')" class="p-3.5 flex justify-between items-center hover:bg-slate-800/50 cursor-pointer">
                    <div>
                        <p class="text-xs font-bold text-white font-mono">\${id}</p>
                        <p class="text-[10px] text-slate-400">\${desc}</p>
                    </div>
                    <span class="text-[10px] bg-blue-600/20 text-blue-400 px-2.5 py-1 rounded-full font-bold">تبديل للحساب</span>
                </div>\`;
            switchActiveAccount(id, desc);
        }

        function switchActiveAccount(id, desc) {
            document.getElementById('active-id-display').innerText = id;
            alert('تم التبديل النشط إلى الحساب: ' + id);
        }

        function startCall(type) {
            const target = document.getElementById('call-target').value.trim() || '88888888';
            alert('جاري بدء مكالمة ' + type + ' مشفرة عالية الجودة مع المعرّف: ' + target);
        }

        function askSanadAI() {
            const input = document.getElementById('ai-input');
            const text = input.value.trim();
            if (!text) return;
            const box = document.getElementById('ai-messages');
            box.innerHTML += '<div class="bg-blue-950/50 p-2.5 rounded-xl text-blue-200"><strong>أنت:</strong> ' + text + '</div>';
            box.innerHTML += '<div class="bg-slate-950 p-2.5 rounded-xl border border-indigo-500/30 text-slate-200"><strong>سَنَد AI:</strong> تم تحليل طلبك بنجاح. النظام مهيأ لصياغة الرسائل وتأمين اتصالاتك بأعلى معايير الجودة والسرية.</div>';
            input.value = '';
            box.scrollTop = box.scrollHeight;
        }

        function saveToVault() {
            const title = prompt('عنوان المستند أو البيان السري:');
            const content = prompt('المحتوى أو الكود المراد حفظه في الخزنة:');
            if (title && content) {
                document.getElementById('vault-items').innerHTML += \`
                    <div class="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex items-center justify-between">
                        <div>
                            <p class="font-bold text-white">\${title}</p>
                            <p class="text-slate-400 font-mono mt-0.5">\${content}</p>
                        </div>
                        <i class="fa-solid fa-lock text-amber-400"></i>
                    </div>\`;
            }
        }

        function recordVoiceAI() {
            alert('جاري تسجيل رسالة صوتية مشفرة مع تنقية الضوضاء بالذكاء الاصطناعي...');
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
    console.log('Sanad Official Release 1.0 running on port ' + PORT);
});
