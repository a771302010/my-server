<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="theme-color" content="#047857">
    <title>برنامج سَنَد | المنصة السيادية والخدمية الشاملة</title>
    
    <!-- خط تجوال العصري -->
    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
    <!-- مكتبة الأيقونات -->
    <script src="https://unpkg.com/lucide@latest"></script>
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    
    <style>
        body { font-family: 'Tajawal', sans-serif; background-color: #0f172a; color: #f8fafc; }
        .chat-bg { background-color: #0b132b; background-image: radial-gradient(#1e293b 1px, transparent 1px); background-size: 20px 20px; }
        @keyframes ticker { 0% { transform: translate(0, 0); } 100% { transform: translate(-100%, 0); } }
        .animate-ticker { display: inline-block; animation: ticker 30s linear infinite; }
    </style>
</head>
<body class="h-screen w-screen overflow-hidden flex flex-col justify-between">

    <!-- 1. الشريط الإخباري السيادي العلوي -->
    <div class="bg-emerald-950 border-b border-emerald-800 text-amber-400 text-xs font-bold py-2 px-4 overflow-hidden whitespace-nowrap shrink-0 flex items-center shadow-md">
        <span class="bg-emerald-800 text-white px-2 py-0.5 rounded text-[10px] ml-3 shrink-0">إعلان سيادي</span>
        <div class="overflow-hidden w-full">
            <span class="animate-ticker">
                ⚡ مرحباً بك يا أبو طارق في برنامج سَنَد الرسمي | خدمة العملاء الرسمية: 88888888 | جميع القنوات مشفرة وعابرة للحدود عبر نفق AI-SAT ⚡
            </span>
        </div>
    </div>

    <!-- 2. رأس التطبيق والشعار -->
    <header class="bg-emerald-900 border-b border-emerald-700 px-4 py-3 flex items-center justify-between shrink-0 shadow-lg">
        <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-800 rounded-2xl flex items-center justify-center border border-amber-400/40 text-white font-extrabold text-xl shadow">
                S
            </div>
            <div>
                <h1 class="font-extrabold text-base text-white flex items-center gap-2">
                    برنامج سَنَد <span class="bg-amber-500 text-slate-950 text-[10px] px-2 py-0.5 rounded-full font-bold">ULTRA v10</span>
                </h1>
                <p class="text-[11px] text-emerald-200">المالك: أبو طارق • خدمة العملاء: 88888888</p>
            </div>
        </div>
        <div class="flex items-center gap-2">
            <span id="server-status-badge" class="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] px-2.5 py-1 rounded-full font-mono flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                <span>متصل بالسيرفر الحي</span>
            </span>
        </div>
    </header>

    <!-- 3. مساحة العمل المركزية (التبويبات والشاشات) -->
    <div class="flex-1 flex overflow-hidden relative">
        
        <!-- القائمة الجانبية للتنقل (الإعدادات، الأكواد، الدردشات، المكالمات، مساعد AI) -->
        <aside class="w-full md:w-80 bg-slate-900 border-l border-slate-800 flex flex-col h-full shrink-0 z-10">
            <div class="p-3 border-b border-slate-800">
                <input type="text" id="search-box" placeholder="بحث في الأكواد وجهات الاتصال..." class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500">
            </div>

            <!-- قائمة الخيارات -->
            <div class="flex-1 overflow-y-auto p-2 space-y-1">
                <button onclick="switchSection('chats')" id="btn-sec-chats" class="w-full text-right p-3 rounded-xl bg-emerald-900/40 border border-emerald-500/30 text-emerald-200 font-bold text-xs flex items-center gap-3 transition">
                    <i data-lucide="message-square" class="w-4 h-4 text-emerald-400"></i>
                    <span>الدردشات والمراسلة الفورية</span>
                </button>
                <button onclick="switchSection('codes')" id="btn-sec-codes" class="w-full text-right p-3 rounded-xl hover:bg-slate-800 text-slate-300 font-bold text-xs flex items-center gap-3 transition">
                    <i data-lucide="key" class="w-4 h-4 text-amber-400"></i>
                    <span>الدليل السيادي والأكواد (888...)</span>
                </button>
                <button onclick="switchSection('ai')" id="btn-sec-ai" class="w-full text-right p-3 rounded-xl hover:bg-slate-800 text-slate-300 font-bold text-xs flex items-center gap-3 transition">
                    <i data-lucide="bot" class="w-4 h-4 text-blue-400"></i>
                    <span>مساعد سند الذكي (OMEGA AI)</span>
                </button>
                <button onclick="switchSection('calls')" id="btn-sec-calls" class="w-full text-right p-3 rounded-xl hover:bg-slate-800 text-slate-300 font-bold text-xs flex items-center gap-3 transition">
                    <i data-lucide="phone-call" class="w-4 h-4 text-emerald-400"></i>
                    <span>المكالمات الفضائية الآمنة</span>
                </button>
                <button onclick="switchSection('settings')" id="btn-sec-settings" class="w-full text-right p-3 rounded-xl hover:bg-slate-800 text-slate-300 font-bold text-xs flex items-center gap-3 transition">
                    <i data-lucide="settings" class="w-4 h-4 text-purple-400"></i>
                    <span>مركز التحكم والسيادة المطلق</span>
                </button>
            </div>

            <!-- زر الطوارئ السيادي -->
            <div class="p-3 border-t border-slate-800 bg-slate-950">
                <button onclick="triggerKillSwitch()" class="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow transition">
                    <i data-lucide="shield-alert" class="w-4 h-4"></i>
                    <span>مفتاح الطوارئ الشامل (Kill-Switch)</span>
                </button>
            </div>
        </aside>

        <!-- الشاشات التفاعلية الرئيسية -->
        <main class="flex-1 flex flex-col bg-slate-950 relative overflow-hidden">
            
            <!-- أ. قسم الدردشات -->
            <div id="section-chats" class="flex-1 flex flex-col h-full">
                <div class="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                    <h3 class="font-bold text-xs text-emerald-400 flex items-center gap-2">
                        <i data-lucide="shield-check" class="w-4 h-4"></i>
                        قناة الدردشة النشطة مع خدمة العملاء (88888888)
                    </h3>
                    <span class="text-[10px] font-mono text-slate-400">WebSocket Live</span>
                </div>
                <div id="chat-messages-box" class="flex-1 overflow-y-auto p-4 space-y-3 chat-bg">
                    <!-- رسالة ترحيبية افتتاحية -->
                    <div class="flex justify-start">
                        <div class="max-w-[75%] bg-slate-800 border border-slate-700 p-3 rounded-2xl text-xs leading-relaxed text-slate-200">
                            <strong>[خدمة العملاء 88888888]:</strong> أهلاً بك يا أبو طارق في النظام السيادي لبرنامج سند. السيرفر الحي يعمل بكفاءة تامة على الرابط <code class="text-amber-400">wss://sanad-server-app.onrender.com</code>. كيف يمكننا خدمتك اليوم؟
                            <div class="text-[9px] text-slate-400 mt-1">الآن • ✓✓</div>
                        </div>
                    </div>
                </div>
                <!-- صندوق الإدخال -->
                <form id="chat-form" class="p-3 bg-slate-900 border-t border-slate-800 flex gap-2">
                    <input type="text" id="chat-input" placeholder="اكتب رسالتك المشفرة هنا..." class="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500">
                    <button type="submit" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 rounded-xl text-xs flex items-center gap-1.5 transition">
                        <span>إرسال</span>
                        <i data-lucide="send" class="w-3.5 h-3.5 rotate-180"></i>
                    </button>
                </form>
            </div>

            <!-- ب. قسم الأكواد والدليل السيادي -->
            <div id="section-codes" class="flex-1 hidden flex-col h-full p-4 overflow-y-auto space-y-4">
                <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                    <h3 class="font-bold text-sm text-amber-400 mb-3 flex items-center gap-2">
                        <i data-lucide="key" class="w-4 h-4"></i>
                        توليد وتأمين كود سيادي معتمد (8 أرقام)
                    </h3>
                    <button onclick="generateSovereignCode()" class="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold py-2.5 rounded-xl text-xs mb-3 transition shadow">
                        ⚡ توليد كود سيادي جديد تحت إشراف الإدارة
                    </button>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input type="text" id="new-owner-name" placeholder="اسم الجهة أو الشخص..." class="bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white">
                        <input type="text" id="new-code-val" placeholder="888xxxxx" readonly class="bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs font-mono font-bold text-amber-400 text-center">
                    </div>
                    <button onclick="saveSovereignCode()" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs mt-3 transition">
                        حفظ الكود في الدليل السيادي المحفوظ
                    </button>
                </div>
                <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex-1">
                    <h3 class="font-bold text-sm text-emerald-400 mb-3">الدليل السيادي المعتمد</h3>
                    <div id="vault-list" class="space-y-2 text-xs">
                        <div class="p-2.5 bg-slate-800 rounded-xl flex justify-between items-center border border-slate-700">
                            <div><strong>أبو طارق (القيادة العليا)</strong> - <span class="text-amber-400 font-mono">88800001</span></div>
                            <span class="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded text-[10px]">نشط VIP</span>
                        </div>
                        <div class="p-2.5 bg-slate-800 rounded-xl flex justify-between items-center border border-slate-700">
                            <div><strong>خدمة العملاء المركزية</strong> - <span class="text-amber-400 font-mono">88888888</span></div>
                            <span class="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded text-[10px]">متاح 24/7</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ج. مساعد سند الذكي (AI) -->
            <div id="section-ai" class="flex-1 hidden flex-col h-full p-4 overflow-y-auto space-y-4">
                <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex-1 flex flex-col">
                    <h3 class="font-bold text-sm text-blue-400 mb-3 flex items-center gap-2">
                        <i data-lucide="bot" class="w-4 h-4"></i>
                        مساعد سند الاستراتيجي (OMEGA AI)
                    </h3>
                    <div id="ai-log" class="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 overflow-y-auto space-y-3 text-xs mb-3">
                        <div class="bg-blue-950/40 border border-blue-900/50 p-3 rounded-xl text-slate-200">
                            <strong>[OMEGA AI]:</strong> جاهز لتحليل البيانات وإدارة الأوامر الميدانية والمهام السيادية يا أبو طارق.
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <input type="text" id="ai-prompt-input" placeholder="اكتب استفسارك أو أمرك للذكاء الاصطناعي..." class="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500">
                        <button onclick="sendAiPrompt()" class="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 rounded-xl text-xs transition">تنفيذ</button>
                    </div>
                </div>
            </div>

            <!-- د. المكالمات الفضائية -->
            <div id="section-calls" class="flex-1 hidden flex-col h-full p-6 items-center justify-center text-center">
                <div class="w-24 h-24 bg-emerald-950 border-2 border-emerald-500/50 rounded-full flex items-center justify-center mb-4 text-emerald-400 shadow-2xl relative">
                    <div class="absolute inset-0 rounded-full border border-emerald-400 animate-ping"></div>
                    <i data-lucide="phone-call" class="w-10 h-10"></i>
                </div>
                <h3 class="text-lg font-bold text-white mb-1">مركز المكالمات الفضائية الآمنة</h3>
                <p class="text-xs text-slate-400 mb-6">الاتصال عبر بروتوكول 1X المشفر ومربوط بخدمة العملاء 88888888</p>
                <button onclick="alert('🔴 جاري بدء الاتصال الفضائي المشفر عبر السيرفر الحي...')" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-2xl text-xs shadow-lg transition">
                    بدء الاتصال الفوري المباشر
                </button>
            </div>

            <!-- هـ. مركز التحكم والإعدادات -->
            <div id="section-settings" class="flex-1 hidden flex-col h-full p-4 overflow-y-auto space-y-4 text-xs">
                <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                    <h3 class="font-bold text-sm text-purple-400">إعدادات الخادم والسيادة (Control Center)</h3>
                    <div class="flex justify-between items-center p-2 bg-slate-800 rounded-xl">
                        <span>رابط السيرفر الحي (WebSocket):</span>
                        <code class="text-amber-400 font-mono text-[11px]" dir="ltr">wss://sanad-server-app.onrender.com</code>
                    </div>
                    <div class="flex justify-between items-center p-2 bg-slate-800 rounded-xl">
                        <span>منع إعادة توجيه الرسائل:</span>
                        <span class="text-emerald-400 font-bold">مفعل (حماية تامة)</span>
                    </div>
                    <div class="flex justify-between items-center p-2 bg-slate-800 rounded-xl">
                        <span>مؤقت الرسائل التلقائي:</span>
                        <span class="text-amber-400 font-bold">24 ساعة</span>
                    </div>
                </div>
            </div>

        </main>
    </div>

    <!-- تفعيل البرمجيات والأيقونات والتفاعل الحي -->
    <script>
        lucide.createIcons();

        // التبديل بين الأقسام
        function switchSection(secId) {
            ['chats', 'codes', 'ai', 'calls', 'settings'].forEach(id => {
                const el = document.getElementById('section-' + id);
                if (el) el.classList.add('hidden');
                const btn = document.getElementById('btn-sec-' + id);
                if (btn) btn.className = "w-full text-right p-3 rounded-xl hover:bg-slate-800 text-slate-300 font-bold text-xs flex items-center gap-3 transition";
            });
            const target = document.getElementById('section-' + secId);
            if (target) target.classList.remove('hidden');
            const targetBtn = document.getElementById('btn-sec-' + secId);
            if (targetBtn) targetBtn.className = "w-full text-right p-3 rounded-xl bg-emerald-900/40 border border-emerald-500/30 text-emerald-200 font-bold text-xs flex items-center gap-3 transition";
        }

        // توليد كود سيادي
        function generateSovereignCode() {
            const rand = Math.floor(10000 + Math.random() * 90000);
            document.getElementById('new-code-val').value = '888' + rand;
        }

        function saveSovereignCode() {
            const name = document.getElementById('new-owner-name').value;
            const code = document.getElementById('new-code-val').value;
            if(!name || !code) {
                alert('يرجى إدخال اسم الجهة وتوليد الكود أولاً.');
                return;
            }
            const vaultList = document.getElementById('vault-list');
            vaultList.innerHTML += `
                <div class="p-2.5 bg-slate-800 rounded-xl flex justify-between items-center border border-slate-700">
                    <div><strong>${name}</strong> - <span class="text-amber-400 font-mono">${code}</span></div>
                    <span class="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded text-[10px]">معتمد</span>
                </div>
            `;
            alert('✅ تم حفظ وتأمين الكود في الدليل بنجاح.');
            document.getElementById('new-owner-name').value = '';
            document.getElementById('new-code-val').value = '';
        }

        // إرسال رسالة في الدردشة مع خدمة العملاء
        document.getElementById('chat-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.getElementById('chat-input');
            const text = input.value.trim();
            if(!text) return;

            const box = document.getElementById('chat-messages-box');
            box.innerHTML += `
                <div class="flex justify-end">
                    <div class="max-w-[75%] bg-emerald-700 text-white p-3 rounded-2xl text-xs leading-relaxed">
                        ${text}
                        <div class="text-[9px] text-emerald-200 mt-1 text-left">الآن • ✓✓</div>
                    </div>
                </div>
            `;
            input.value = '';
            box.scrollTop = box.scrollHeight;

            // محاكاة الرد الآلي من خدمة العملاء 88888888 أو السيرفر
            setTimeout(() => {
                box.innerHTML += `
                    <div class="flex justify-start">
                        <div class="max-w-[75%] bg-slate-800 border border-slate-700 p-3 rounded-2xl text-xs leading-relaxed text-slate-200">
                            <strong>[خدمة العملاء 88888888]:</strong> تم استلام رسالتك عبر السيرفر الحي بنجاح يا أبو طارق. جاري تنفيذ الطلب بدقة.
                            <div class="text-[9px] text-slate-400 mt-1">الآن • ✓✓</div>
                        </div>
                    </div>
                `;
                box.scrollTop = box.scrollHeight;
            }, 1000);
        });

        // مساعد AI
        function sendAiPrompt() {
            const inp = document.getElementById('ai-prompt-input');
            const val = inp.value.trim();
            if(!val) return;
            const log = document.getElementById('ai-log');
            log.innerHTML += `<div class="bg-slate-800 p-2.5 rounded-xl text-white"><strong>أبو طارق:</strong> ${val}</div>`;
            inp.value = '';
            setTimeout(() => {
                log.innerHTML += `<div class="bg-blue-950/40 border border-blue-900/50 p-3 rounded-xl text-slate-200"><strong>[OMEGA AI]:</strong> تمت معالجة استفسارك الاستراتيجي عبر قناة AI-SAT بنجاح تام.</div>`;
                log.scrollTop = log.scrollHeight;
            }, 800);
        }

        // مفتاح الطوارئ
        function triggerKillSwitch() {
            if(confirm('⚠️ تحذير سيادي: هل تريد تفعيل مفتاح الطوارئ ومسح الذاكرة المؤقتة؟')) {
                alert('⚡ تم تأمين القطاع ومسح الذاكرة بنجاح.');
                location.reload();
            }
        }
    </script>
</body>
</html>
