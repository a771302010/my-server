const http = require('http');

const htmlContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>منظومة سَنَد - النظام الهجين الذكي</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;900&display=swap');
        body { font-family: 'Cairo', sans-serif; background-color: #090d16; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #2563eb; border-radius: 10px; }
    </style>
</head>
<body class="text-slate-100 h-screen flex flex-col overflow-hidden select-none">

    <!-- الشريط العلوي (Header) -->
    <header class="bg-slate-900/95 border-b border-slate-800 px-4 py-3 flex justify-between items-center shadow-lg z-20">
        <div class="flex items-center gap-3">
            <!-- أيقونة سند الزرقاء المعتمدة -->
            <div class="w-10 h-10 rounded-xl bg-gradient-to-b from-blue-700 to-blue-900 border border-blue-400/30 flex flex-col items-center justify-center shadow-lg shadow-blue-600/20">
                <span class="text-white font-black text-lg leading-none">S</span>
                <i class="fa-solid fa-hands-holding-child text-[10px] text-blue-200 mt-0.5"></i>
            </div>
            <div>
                <div class="flex items-center gap-2">
                    <h1 class="font-black text-base md:text-lg text-white">منظومة سَنَد</h1>
                    <span class="bg-blue-600/20 border border-blue-500/40 text-blue-300 text-[10px] px-2 py-0.5 rounded-full font-bold">مدعوم بالذكاء الاصطناعي</span>
                </div>
                <p class="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold">
                    <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> متصل • Sanad ID: <span id="header-sanad-id" class="font-mono text-blue-300">83-7723-0201</span>
                </p>
            </div>
        </div>
        <div class="flex items-center gap-2">
            <button onclick="switchTab('settings')" id="header-account-pill" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-full text-xs font-bold text-slate-200 flex items-center gap-1.5 transition">
                <i class="fa-solid fa-circle-user text-blue-400"></i>
                <span id="current-phone-display">+967 772302010</span>
            </button>
        </div>
    </header>

    <!-- منطقة المحتوى الرئيسية -->
    <main class="flex-1 flex flex-col overflow-hidden relative bg-[#0b101b]">

        <!-- 1. تبويب الدردشات (Chats) -->
        <div id="tab-chats" class="flex-1 flex flex-col h-full">
            <!-- شريط البحث والإضافة السريعة -->
            <div class="p-3 bg-slate-900/60 border-b border-slate-800/80 flex gap-2">
                <input type="text" id="quick-contact-input" placeholder="أدخل رقم هاتف (772...) أو كود سند (83-...) للمراسلة أو الدعوة..." class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs md:text-sm focus:outline-none focus:border-blue-500 text-slate-100">
                <button onclick="startChatOrInvite()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow">
                    <i class="fa-solid fa-paper-plane"></i> تواصل / دعوة
                </button>
            </div>

            <!-- قائمة الرسائل -->
            <div id="chat-messages" class="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                <div class="flex items-start gap-2.5">
                    <div class="w-8 h-8 rounded-xl bg-blue-700 flex items-center justify-center font-black text-xs shadow">S</div>
                    <div class="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl rounded-tr-none max-w-md text-xs md:text-sm leading-relaxed shadow">
                        <div class="flex justify-between items-center mb-1">
                            <span class="font-bold text-blue-400">نظام سَنَد الذكي</span>
                            <span class="text-[10px] text-slate-500">الآن</span>
                        </div>
                        مرحباً بك يا مهندس عبد الله. تم دمج تقنيات <strong>واتساب</strong> (تعدد الحسابات والمجتمعات) مع <strong>زينجي</strong> (أكواد الهوية الخاصة والروابط المشفرة). يمكنك حذف أي رسالة للطرفين بالضغط عليها.
                    </div>
                </div>
            </div>

            <!-- شريط كتابة الرسالة -->
            <div class="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
                <button onclick="alert('تم فتح الخزنة لإرسال ملف مشفر')" class="text-slate-400 hover:text-blue-400 p-2 rounded-xl hover:bg-slate-800 transition"><i class="fa-solid fa-plus text-lg"></i></button>
                <input type="text" id="chat-input" onkeypress="if(event.key==='Enter') sendMessage()" placeholder="اكتب رسالة مشفرة..." class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 text-slate-100">
                <button onclick="toggleVoice()" class="text-slate-400 hover:text-emerald-400 p-2.5 rounded-xl hover:bg-slate-800 transition"><i class="fa-solid fa-microphone text-lg"></i></button>
                <button onclick="sendMessage()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition shadow-lg shadow-blue-600/20">
                    <i class="fa-solid fa-paper-plane"></i>
                </button>
            </div>
        </div>

        <!-- 2. تبويب المجتمعات والقنوات (مثل واتساب) -->
        <div id="tab-communities" class="hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-4">
            <div class="flex justify-between items-center">
                <h2 class="text-lg font-black text-white flex items-center gap-2"><i class="fa-solid fa-users-rectangle text-blue-400"></i> المجتمعات والإعلانات</h2>
                <button onclick="createCommunity()" class="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-2 rounded-xl font-bold">+ مجتمع جديد</button>
            </div>
            <div id="communities-list" class="space-y-3">
                <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-2">
                    <div class="flex justify-between items-center">
                        <h3 class="font-bold text-sm text-blue-300">مركز الإنصاف للحقوق والتنمية والدوائر التابعة له</h3>
                        <span class="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full">نشط</span>
                    </div>
                    <p class="text-xs text-slate-400"><i class="fa-solid fa-bullhorn text-amber-400 ml-1"></i> الإعلانات: تم تفعيل بروتوكول التشفير السحابي لكافة الأعضاء.</p>
                </div>
                <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-2">
                    <div class="flex justify-between items-center">
                        <h3 class="font-bold text-sm text-blue-300">الإدارة الميدانية والعمليات الذكية</h3>
                        <span class="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full">مجموعة عمل</span>
                    </div>
                    <p class="text-xs text-slate-400"><i class="fa-solid fa-shield-halved text-blue-400 ml-1"></i> كافة المراسلات مؤمنة بنظام سند السيادي.</p>
                </div>
            </div>
        </div>

        <!-- 3. تبويب جهات الاتصال والدعوة (نظام زينجي + الهاتف) -->
        <div id="tab-contacts" class="hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-4">
            <div class="bg-gradient-to-l from-blue-900/40 to-slate-900 border border-blue-500/30 p-4 rounded-2xl">
                <h3 class="font-bold text-sm text-blue-300 mb-1">بطاقة الهوية الرقمية الخاصة بك (نظام زينجي)</h3>
                <p class="text-xs text-slate-300 mb-3">شارك هذا الكود أو الرابط مع زملائك ليتواصلوا معك فوراً دون الحاجة لرقم هاتف:</p>
                <div class="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span id="my-zangi-code" class="font-mono font-bold text-base text-emerald-400 tracking-wider">83-7723-0201</span>
                    <div class="flex gap-2">
                        <button onclick="copyInviteLink()" class="bg-slate-800 hover:bg-slate-700 text-xs px-3 py-1.5 rounded-lg font-bold text-white"><i class="fa-solid fa-copy"></i> نسخ الرابط</button>
                        <button onclick="shareToWhatsApp()" class="bg-emerald-600 hover:bg-emerald-700 text-xs px-3 py-1.5 rounded-lg font-bold text-white"><i class="fa-brands fa-whatsapp"></i> دعوة عبر واتساب</button>
                    </div>
                </div>
            </div>

            <div class="flex justify-between items-center">
                <h3 class="font-bold text-sm text-slate-300">جهات الاتصال المحفوظة</h3>
                <button onclick="addNewContactModal()" class="text-xs text-blue-400 font-bold">+ إضافة جهة اتصال</button>
            </div>
            <div id="contacts-list" class="space-y-2">
                <div class="bg-slate-900 border border-slate-800 p-3 rounded-xl flex justify-between items-center">
                    <div class="flex items-center gap-3">
                        <div class="w-9 h-9 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-xs">م</div>
                        <div>
                            <h4 class="text-sm font-bold">المهندس عبد الله عسيلو (الإدارة)</h4>
                            <p class="text-[11px] text-slate-400 font-mono">+967 772302010 • ID: 83-7723-0201</p>
                        </div>
                    </div>
                    <button onclick="switchTab('chats')" class="bg-blue-600/20 text-blue-400 px-3 py-1.5 rounded-lg text-xs font-bold">مراسلة</button>
                </div>
            </div>
        </div>

        <!-- 4. تبويب الذكاء الاصطناعي والمكالمات (AI & Calls) -->
        <div id="tab-ai" class="hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-4">
            <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
                <div>
                    <h3 class="font-bold text-sm text-emerald-400">مركز الاتصال العالمي المشفر (صوت وفيديو)</h3>
                    <p class="text-xs text-slate-400">جودة فائقة بتقنية P2P تعمل حتى مع الإنترنت الضعيف.</p>
                </div>
                <div class="flex gap-2">
                    <button onclick="alert('جاري بدء مكالمة صوتية مشفرة...')" class="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow"><i class="fa-solid fa-phone"></i></button>
                    <button onclick="alert('جاري بدء مكالمة فيديو عالية الدقة...')" class="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow"><i class="fa-solid fa-video"></i></button>
                </div>
            </div>

            <div class="flex-1 flex flex-col bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
                <h3 class="font-bold text-sm text-indigo-400 mb-2 flex items-center gap-2"><i class="fa-solid fa-brain"></i> مساعد سَنَد للذكاء الاصطناعي</h3>
                <div id="ai-box" class="flex-1 overflow-y-auto space-y-2 mb-3 text-xs custom-scrollbar">
                    <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 text-slate-300">أهلاً بك! اطلب مني صياغة خطاب رسمي، ترجمة فورية، أو تحليل بيانات المراسلات.</div>
                </div>
                <div class="flex gap-2">
                    <input type="text" id="ai-input" placeholder="اسأل الذكاء الاصطناعي..." class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500">
                    <button onclick="runAI()" class="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl text-xs font-bold">تنفيذ</button>
                </div>
            </div>
        </div>

        <!-- 5. تبويب الإعدادات وتعدد الحسابات (مثل صورة إعدادات واتساب) -->
        <div id="tab-settings" class="hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-4">
            <!-- بطاقة الملف الشخصي -->
            <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-700 to-blue-500 flex items-center justify-center text-white font-black text-2xl shadow-lg">S</div>
                    <div>
                        <h2 id="profile-name" class="font-black text-base text-white">Asylo (المهندس عبد الله)</h2>
                        <p id="profile-phone" class="text-xs text-slate-400 font-mono">+967 772302010</p>
                        <span class="text-[10px] text-emerald-400 font-bold">● متصل وموثق بالسحابة</span>
                    </div>
                </div>
                <button onclick="showQR()" class="bg-slate-800 p-2.5 rounded-xl text-blue-400 border border-slate-700"><i class="fa-solid fa-qrcode text-xl"></i></button>
            </div>

            <!-- قسم إدارة وتعدد الحسابات (إضافة أكثر من رقم) -->
            <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div class="p-3.5 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
                    <span class="text-xs font-bold text-blue-400"><i class="fa-solid fa-users-gear ml-1"></i> الحسابات المتعددة المفعلة (بدّل بين أرقامك)</span>
                    <button onclick="openAddAccount()" class="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] px-3 py-1 rounded-lg font-bold">+ إضافة حساب جديد</button>
                </div>
                <div id="multi-accounts-list" class="divide-y divide-slate-800/80">
                    <div onclick="selectAccount('+967 772302010', '83-7723-0201', 'Asylo')" class="p-3.5 flex justify-between items-center hover:bg-slate-800/50 cursor-pointer">
                        <div>
                            <p class="text-xs font-bold text-white">+967 772302010 (الحساب الرئيسي)</p>
                            <p class="text-[10px] text-slate-400 font-mono">Sanad ID: 83-7723-0201</p>
                        </div>
                        <i class="fa-solid fa-circle-check text-emerald-500"></i>
                    </div>
                </div>
            </div>

            <!-- قائمة الإعدادات القياسية -->
            <div class="bg-slate-900 border border-slate-800 rounded-2xl divide-y divide-slate-800/80 text-xs font-semibold">
                <div onclick="alert('إعدادات الخصوصية: تشفير تام طرف-لطرف، إخفاء آخر ظهور، وحماية برمز PIN.')" class="p-3.5 flex justify-between items-center hover:bg-slate-800/40 cursor-pointer">
                    <span class="flex items-center gap-3"><i class="fa-solid fa-lock text-blue-400 w-4"></i> الخصوصية والأمان والتشفير</span>
                    <i class="fa-solid fa-chevron-left text-slate-600"></i>
                </div>
                <div onclick="alert('الخزنة السيادية: النسخ الاحتياطي السحابي المشفر للمحادثات والملفات مفعل.')" class="p-3.5 flex justify-between items-center hover:bg-slate-800/40 cursor-pointer">
                    <span class="flex items-center gap-3"><i class="fa-solid fa-vault text-amber-400 w-4"></i> الخزنة السيادية والتخزين</span>
                    <i class="fa-solid fa-chevron-left text-slate-600"></i>
                </div>
                <div onclick="alert('التعليمات: يمكنك استخدام رقم هاتفك أو كود سند (10 أرقام) للتواصل مع أي شخص حول العالم.')" class="p-3.5 flex justify-between items-center hover:bg-slate-800/40 cursor-pointer">
                    <span class="flex items-center gap-3"><i class="fa-solid fa-circle-question text-emerald-400 w-4"></i> التعليمات والدعم الذكي</span>
                    <i class="fa-solid fa-chevron-left text-slate-600"></i>
                </div>
            </div>
        </div>

    </main>

    <!-- شريط التنقل السفلي الاحترافي (مثل تطبيقات الجوال الحديثة) -->
    <nav class="bg-slate-900 border-t border-slate-800 px-2 py-2 flex justify-around items-center z-20">
        <button onclick="switchTab('chats')" id="nav-chats" class="flex flex-col items-center gap-1 text-blue-400 font-bold text-[11px] px-3 py-1">
            <i class="fa-solid fa-comments text-lg"></i>
            <span>الدردشات</span>
        </button>
        <button onclick="switchTab('communities')" id="nav-communities" class="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-200 font-semibold text-[11px] px-3 py-1">
            <i class="fa-solid fa-users text-lg"></i>
            <span>المجتمعات</span>
        </button>
        <button onclick="switchTab('contacts')" id="nav-contacts" class="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-200 font-semibold text-[11px] px-3 py-1">
            <i class="fa-solid fa-address-book text-lg"></i>
            <span>جهات الاتصال</span>
        </button>
        <button onclick="switchTab('ai')" id="nav-ai" class="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-200 font-semibold text-[11px] px-3 py-1">
            <i class="fa-solid fa-brain text-lg"></i>
            <span>الذكاء والمكالمات</span>
        </button>
        <button onclick="switchTab('settings')" id="nav-settings" class="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-200 font-semibold text-[11px] px-3 py-1">
            <i class="fa-solid fa-gear text-lg"></i>
            <span>أنت / الإعدادات</span>
        </button>
    </nav>

    <script>
        function switchTab(tab) {
            ['chats', 'communities', 'contacts', 'ai', 'settings'].forEach(t => {
                document.getElementById('tab-' + t).classList.add('hidden');
                const nav = document.getElementById('nav-' + t);
                if (nav) nav.className = "flex flex-col items-center gap-1 text-slate-400 hover:text-slate-200 font-semibold text-[11px] px-3 py-1";
            });
            document.getElementById('tab-' + tab).classList.remove('hidden');
            const activeNav = document.getElementById('nav-' + tab);
            if (activeNav) activeNav.className = "flex flex-col items-center gap-1 text-blue-400 font-bold text-[11px] px-3 py-1";
        }

        function sendMessage() {
            const input = document.getElementById('chat-input');
            const text = input.value.trim();
            if (!text) return;
            const msgId = 'msg-' + Date.now();
            const box = document.getElementById('chat-messages');
            box.innerHTML += \`
                <div id="\${msgId}" class="flex items-start gap-2.5 justify-end group">
                    <div class="bg-blue-600 text-white p-3 rounded-2xl rounded-tl-none max-w-md text-xs md:text-sm shadow">
                        <p>\${text}</p>
                        <div class="flex justify-between items-center gap-4 mt-1.5 pt-1 border-t border-blue-500/40 text-[10px] text-blue-200">
                            <span>مُشفر ✓✓</span>
                            <button onclick="deleteMsg('\${msgId}')" class="text-red-200 hover:text-white underline">حذف للطرفين</button>
                        </div>
                    </div>
                </div>\`;
            input.value = '';
            box.scrollTop = box.scrollHeight;
        }

        function deleteMsg(id) {
            const el = document.getElementById(id);
            if (el) el.innerHTML = '<div class="text-[11px] text-slate-500 italic bg-slate-900/50 px-3 py-1 rounded-lg">🚫 تم حذف هذه الرسالة لدى الطرفين</div>';
        }

        function startChatOrInvite() {
            const val = document.getElementById('quick-contact-input').value.trim();
            if (!val) return alert('أدخل رقم الهاتف أو كود سند أولاً');
            const box = document.getElementById('chat-messages');
            box.innerHTML += \`
                <div class="bg-slate-900 border border-blue-500/30 p-3 rounded-xl text-xs text-center space-y-2">
                    <p class="text-slate-300">تم فتح قناة تواصل مع: <strong class="text-blue-400">\${val}</strong></p>
                    <a href="https://wa.me/\${val.replace(/[^0-9]/g, '')}?text=\${encodeURIComponent('أدعوك للتواصل معي عبر منظومة سَنَد الذكية والمشفرة: https://my-server-t0s5.onrender.com')}" target="_blank" class="inline-block bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-bold">
                        <i class="fa-brands fa-whatsapp"></i> إرسال رابط الانضمام له عبر واتساب
                    </a>
                </div>\`;
            document.getElementById('quick-contact-input').value = '';
            box.scrollTop = box.scrollHeight;
        }

        function openAddAccount() {
            const phone = prompt('أدخل رقم الهاتف الجديد لإضافته (مثال: +967 771234567):');
            if (!phone) return;
            const code = Math.floor(100000000 + Math.random() * 900000000);
            const verify = prompt('تم إرسال كود التفعيل المكون من 9 أرقام إلى ' + phone + '\\nأدخل الكود للتأكيد (الكود التجريبي: ' + code + '):');
            if (verify) {
                const sanadId = '83-' + Math.floor(1000 + Math.random() * 9000) + '-' + Math.floor(1000 + Math.random() * 9000);
                const list = document.getElementById('multi-accounts-list');
                list.innerHTML += \`
                    <div onclick="selectAccount('\${phone}', '\${sanadId}', 'حساب إضافي')" class="p-3.5 flex justify-between items-center hover:bg-slate-800/50 cursor-pointer">
                        <div>
                            <p class="text-xs font-bold text-white">\${phone}</p>
                            <p class="text-[10px] text-slate-400 font-mono">Sanad ID: \${sanadId}</p>
                        </div>
                        <span class="text-[10px] bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded">تبديل</span>
                    </div>\`;
                alert('تم تفعيل وإضافة الحساب بنجاح! يمكنك الآن التبديل بين حساباتك بضغطة زر.');
            }
        }

        function selectAccount(phone, sanadId, name) {
            document.getElementById('current-phone-display').innerText = phone;
            document.getElementById('header-sanad-id').innerText = sanadId;
            document.getElementById('my-zangi-code').innerText = sanadId;
            document.getElementById('profile-phone').innerText = phone;
            document.getElementById('profile-name').innerText = name;
            alert('تم التبديل النشط إلى الحساب: ' + phone);
        }

        function copyInviteLink() {
            const code = document.getElementById('my-zangi-code').innerText;
            const text = 'تواصل معي عبر منظومة سَنَد المشفرة - كود الهوية: ' + code + ' | الرابط: https://my-server-t0s5.onrender.com';
            navigator.clipboard.writeText(text);
            alert('تم نسخ رابط الدعوة وكود الهوية بنجاح! أرسله لأي زميل.');
        }

        function shareToWhatsApp() {
            const code = document.getElementById('my-zangi-code').innerText;
            const text = encodeURIComponent('أدعوك للتواصل معي بأمان عبر منظومة سَنَد الذكية.\\nكود الهوية الخاص بي: ' + code + '\\nرابط الدخول المباشر: https://my-server-t0s5.onrender.com');
            window.open('https://wa.me/?text=' + text, '_blank');
        }

        function createCommunity() {
            const name = prompt('أدخل اسم المجتمع أو المجموعة الجديدة:');
            if (name) {
                document.getElementById('communities-list').innerHTML += \`
                    <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1">
                        <h3 class="font-bold text-sm text-blue-300">\${name}</h3>
                        <p class="text-xs text-slate-400">تم إنشاء المجتمع وتفعيل قناة الإعلانات بنجاح.</p>
                    </div>\`;
            }
        }

        function addNewContactModal() {
            const name = prompt('اسم جهة الاتصال:');
            const info = prompt('رقم الهاتف أو كود سند (83-...):');
            if (name && info) {
                document.getElementById('contacts-list').innerHTML += \`
                    <div class="bg-slate-900 border border-slate-800 p-3 rounded-xl flex justify-between items-center">
                        <div>
                            <h4 class="text-sm font-bold">\${name}</h4>
                            <p class="text-[11px] text-slate-400 font-mono">\${info}</p>
                        </div>
                        <button onclick="switchTab('chats')" class="bg-blue-600/20 text-blue-400 px-3 py-1.5 rounded-lg text-xs font-bold">مراسلة</button>
                    </div>\`;
            }
        }

        function runAI() {
            const input = document.getElementById('ai-input');
            if (!input.value.trim()) return;
            const box = document.getElementById('ai-box');
            box.innerHTML += '<div class="bg-blue-950/50 p-2.5 rounded-xl text-blue-200"><strong>أنت:</strong> ' + input.value + '</div>';
            box.innerHTML += '<div class="bg-slate-950 p-2.5 rounded-xl border border-indigo-500/30 text-slate-200"><strong>مساعد سَنَد AI:</strong> تم استلام طلبك ومعالجته. المنظومة جاهزة لدعم مراسلاتك وتنظيم فرقك الميدانية بأعلى كفاءة.</div>';
            input.value = '';
            box.scrollTop = box.scrollHeight;
        }

        function toggleVoice() { alert('جاري تسجيل رسالة صوتية مشفرة ومحسّنة بالذكاء الاصطناعي...'); }
        function showQR() { alert('رمز QR الخاص بحسابك جاهز للمسح السريع من أي جهاز.'); }
    </script>
</body>
</html>`;

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(htmlContent);
});

server.listen(PORT, () => {
    console.log('Sanad Hybrid Server running on port ' + PORT);
});
