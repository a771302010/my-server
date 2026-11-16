const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// مسار عرض واجهة تطبيق سند الكاملة والمتوافقة مع الجوال
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>برنامج سَنَد | المنصة السيادية والخدمية الشاملة</title>
    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
    <script src="https://unpkg.com/lucide@latest"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: 'Tajawal', sans-serif; background-color: #0f172a; color: #f8fafc; height: 100dvh; overflow: hidden; }
        .chat-bg { background-color: #0b132b; background-image: radial-gradient(#1e293b 1px, transparent 1px); background-size: 20px 20px; }
        @keyframes ticker { 0% { transform: translate(0, 0); } 100% { transform: translate(-100%, 0); } }
        .animate-ticker { display: inline-block; animation: ticker 30s linear infinite; }
    </style>
</head>
<body class="flex flex-col justify-between h-[100dvh] w-screen m-0 p-0">
    <!-- الشريط الإخباري السيادي العلوي -->
    <div class="bg-emerald-950 border-b border-emerald-800 text-amber-400 text-xs font-bold py-2 px-4 overflow-hidden whitespace-nowrap shrink-0 flex items-center shadow-md">
        <span class="bg-emerald-800 text-white px-2 py-0.5 rounded text-[10px] ml-3 shrink-0">إعلان سيادي</span>
        <div class="overflow-hidden w-full">
            <span class="animate-ticker">
                ⚡ مرحباً بك يا أبو طارق في برنامج سَنَد الرسمي | خدمة العملاء الرسمية: 88888888 | جميع القنوات مشفرة وعابرة للحدود ⚡
            </span>
        </div>
    </div>

    <!-- رأس التطبيق والشعار -->
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
    </header>

    <!-- مساحة العمل المركزية -->
    <div class="flex-1 flex overflow-hidden relative">
        <aside class="hidden md:flex w-80 bg-slate-900 border-l border-slate-800 flex-col h-full shrink-0 z-10 p-3 space-y-2">
            <div class="text-xs font-bold text-emerald-400 mb-2">قوائم النظام السيادي:</div>
            <button class="w-full text-right p-3 rounded-xl bg-emerald-900/40 border border-emerald-500/30 text-emerald-200 font-bold text-xs flex items-center gap-3">
                <i data-lucide="message-square" class="w-4 h-4 text-emerald-400"></i>
                <span>الدردشة المباشرة (88888888)</span>
            </button>
        </aside>

        <main class="flex-1 flex flex-col bg-slate-950 relative overflow-hidden h-full">
            <div class="flex-1 flex flex-col h-full overflow-hidden">
                <div class="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
                    <h3 class="font-bold text-xs text-emerald-400">قناة الدردشة النشطة مع خدمة العملاء (88888888)</h3>
                </div>
                <div id="chat-messages-box" class="flex-1 overflow-y-auto p-4 space-y-3 chat-bg">
                    <div class="flex justify-start">
                        <div class="max-w-[85%] bg-slate-800 border border-slate-700 p-3 rounded-2xl text-xs leading-relaxed text-slate-200 shadow">
                            <strong>[خدمة العملاء 88888888]:</strong> أهلاً بك يا أبو طارق في النظام السيادي لبرنامج سند. الواجهة تعمل الآن بكامل شاشتها على الجوال!
                        </div>
                    </div>
                </div>
                <form id="chat-form" class="p-3 bg-slate-900 border-t border-slate-800 flex gap-2 shrink-0">
                    <input type="text" id="chat-input" placeholder="اكتب رسالتك هنا..." class="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none">
                    <button type="submit" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 rounded-xl text-xs">إرسال</button>
                </form>
            </div>
        </main>
    </div>

    <script>
        lucide.createIcons();
        document.getElementById('chat-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.getElementById('chat-input');
            const text = input.value.trim();
            if(!text) return;
            const box = document.getElementById('chat-messages-box');
            box.innerHTML += \`<div class="flex justify-end"><div class="max-w-[85%] bg-emerald-700 text-white p-3 rounded-2xl text-xs shadow">\${text}</div></div>\`;
            input.value = '';
            box.scrollTop = box.scrollHeight;
        });
    </script>
</body>
</html>`);
});

app.listen(PORT, () => {
  console.log('Sanad Server running on port ' + PORT);
});
