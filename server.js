const http = require('http');
const { WebSocketServer } = require('ws');

const sanadIconSvg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 180 180'><rect width='180' height='180' rx='36' fill='%230b4aa2'/><rect y='96' width='180' height='84' rx='24' fill='%23ffffff'/><text x='90' y='72' text-anchor='middle' fill='%23ffffff' font-family='Arial,sans-serif' font-size='64' font-weight='900'>S</text><g fill='%230b4aa2'><circle cx='90' cy='96' r='9'/><path d='M74 122c0-9 7-15 16-15s16 6 16 15v8H74v-8z'/><circle cx='66' cy='101' r='7.5'/><path d='M53 123c0-7 6-12 13-12s13 5 13 12v7H53v-7z'/><circle cx='114' cy='101' r='7.5'/><path d='M101 123c0-7 6-12 13-12s13 5 13 12v7h-26v-7z'/><path d='M26 112c8-2 18 5 28 16 10 11 22 14 36 14s26-3 36-14c10-11 20-18 28-16v28H26v-28z'/></g></svg>`;
const sanadIconUri = `data:image/svg+xml,${encodeURIComponent(sanadIconSvg)}`;

const htmlContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="theme-color" content="#0b4aa2">
    <title>سند AI v8.0</title>
    <link rel="icon" type="image/svg+xml" href="${sanadIconUri}">
    <link rel="apple-touch-icon" sizes="180x180" href="${sanadIconUri}">
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
        body { font-family: 'Cairo', sans-serif; background-color: #050912; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1d4ed8; border-radius: 9999px; }
    </style>
</head>
<body class="text-slate-100 h-screen flex flex-col overflow-hidden select-none">

    <audio id="remote-audio-el" autoplay playsinline class="hidden"></audio>

    <!-- الشريط العلوي -->
    <header class="bg-slate-900 border-b border-slate-800 px-3.5 py-2.5 flex justify-between items-center z-20 shrink-0">
        <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-10 h-10 rounded-2xl bg-gradient-to-b from-blue-600 to-blue-950 border border-blue-400/40 flex flex-col items-center justify-center shrink-0">
                <span class="text-white font-black text-lg leading-none">S</span>
                <i class="fa-solid fa-hands-holding-child text-[9px] text-blue-200 mt-0.5"></i>
            </div>
            <div class="min-w-0">
                <div class="flex items-center gap-1.5">
                    <h1 class="font-black text-base text-white leading-none">سند</h1>
                    <span class="text-[10px] bg-blue-600/25 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-bold">AI v8.0</span>
                    <span id="device-badge" class="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-semibold">جهاز</span>
                </div>
                <div class="flex items-center gap-1.5 text-[11px] mt-1">
                    <span id="ws-dot" class="w-2 h-2 rounded-full bg-amber-400"></span>
                    <span id="ws-label" class="text-slate-300 font-semibold">جاري الربط...</span>
                    <button type="button" onclick="reconnectNow()" title="تحديث الربط" class="text-blue-400 hover:text-blue-300 px-1">
                        <i class="fa-solid fa-rotate-right text-[10px]"></i>
                    </button>
                    <span id="queue-badge" class="hidden text-[10px] bg-amber-500/20 text-amber-300 px-1.5 rounded font-mono">0 معلّق</span>
                    <span class="text-slate-600">•</span>
                    <span id="active-acct-label" class="font-mono font-bold text-blue-300">88888888</span>
                </div>
            </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
            <button type="button" onclick="launchCall('audio')" title="مكالمة صوتية" class="w-9 h-9 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/40 text-emerald-300 hover:text-white flex items-center justify-center transition">
                <i class="fa-solid fa-phone text-xs"></i>
            </button>
            <button type="button" onclick="launchCall('video')" title="مكالمة فيديو" class="w-9 h-9 rounded-xl bg-blue-600/20 hover:bg-blue-600 border border-blue-500/40 text-blue-300 hover:text-white flex items-center justify-center transition">
                <i class="fa-solid fa-video text-xs"></i>
            </button>
        </div>
    </header>

    <!-- بانر تنبيه الرسائل الواردة -->
    <div id="live-toast" onclick="jumpToToastChat()" class="hidden fixed top-16 left-3 right-3 max-w-md mx-auto bg-blue-900/95 border border-blue-400/50 text-white px-3.5 py-2.5 rounded-2xl shadow-2xl z-40 flex items-center justify-between gap-2 cursor-pointer text-xs">
        <div class="min-w-0">
            <p id="toast-sender" class="font-black text-blue-200 truncate">رسالة جديدة</p>
            <p id="toast-body" class="text-slate-100 truncate">---</p>
        </div>
        <span class="bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded-lg text-[10px] font-bold shrink-0">فتح</span>
    </div>

    <!-- نافذة المكالمات 9:16 -->
    <div id="call-modal" class="hidden fixed inset-0 bg-slate-950/95 z-50 flex flex-col items-center justify-between p-4">
        <div class="text-center mt-1">
            <p class="text-xs text-blue-400 font-bold">سند AI v8.0 • اتصال مباشر</p>
            <h2 id="call-peer-title" class="text-lg font-black text-white font-mono mt-0.5">---</h2>
            <p id="call-status-msg" class="text-xs text-emerald-400 mt-0.5 font-semibold">جاري الاتصال...</p>
            <p id="call-output-hint" class="text-[10px] text-slate-400 mt-0.5">وضع الإخراج: مكبر الصوت</p>
        </div>

        <div class="relative w-full max-w-sm flex-1 my-2.5 max-h-[66vh] aspect-[9/16] bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden flex items-center justify-center shadow-2xl">
            <video id="remote-video-el" autoplay playsinline class="w-full h-full object-cover hidden"></video>
            <video id="local-video-el" autoplay playsinline muted class="w-24 h-36 object-cover rounded-2xl border-2 border-blue-400/80 shadow-lg absolute bottom-3 left-3 hidden"></video>
            <div id="voice-call-card" class="flex flex-col items-center gap-2.5 px-4 text-center">
                <div class="w-20 h-20 rounded-full bg-blue-600/20 border border-blue-400/40 flex items-center justify-center text-3xl text-blue-400 animate-pulse">
                    <i class="fa-solid fa-microphone-lines"></i>
                </div>
                <span class="text-xs text-slate-300 font-semibold">مكالمة صوتية مباشرة</span>
                <button type="button" onclick="forceUnmuteAudio()" class="bg-emerald-600/25 border border-emerald-400/40 text-emerald-300 px-3 py-1 rounded-xl text-[11px] font-bold">
                    <i class="fa-solid fa-volume-high ml-1"></i> تنشيط الصوت
                </button>
            </div>
        </div>

        <div class="flex items-center gap-2.5 mb-2">
            <button type="button" id="accept-btn" onclick="answerCall()" class="hidden bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-2xl font-bold text-xs shadow-lg animate-bounce">
                <i class="fa-solid fa-phone ml-1"></i> رد الآن
            </button>
            <button type="button" id="speaker-toggle-btn" onclick="toggleSpeakerOrEarpiece()" title="تبديل السماعة / المكبر" class="w-11 h-11 rounded-2xl bg-blue-600/25 border border-blue-400/40 text-blue-300 flex items-center justify-center">
                <i id="speaker-toggle-icon" class="fa-solid fa-volume-high"></i>
            </button>
            <button type="button" id="switch-cam-btn" onclick="switchCameraFacing()" title="تبديل الكاميرا" class="w-11 h-11 rounded-2xl bg-slate-800 hover:bg-slate-700 text-blue-300 flex items-center justify-center">
                <i class="fa-solid fa-camera-rotate"></i>
            </button>
            <button type="button" id="mute-btn" onclick="toggleMuteTrack()" title="كتم الميكروفون" class="w-11 h-11 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center">
                <i id="mute-icon" class="fa-solid fa-microphone"></i>
            </button>
            <button type="button" onclick="endActiveCall()" class="bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-2xl font-bold text-xs shadow-lg">
                <i class="fa-solid fa-phone-slash ml-1"></i> إنهاء
            </button>
        </div>
    </div>

    <!-- نافذة خيارات الحذف -->
    <div id="delete-modal" class="hidden fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4">
        <div class="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xs p-4 space-y-3 shadow-2xl">
            <h3 class="text-sm font-black text-white">خيارات حذف الرسالة</h3>
            <p class="text-[11px] text-slate-400">اختر ما إذا كنت تريد حذف الرسالة من جهازك فقط أو من عند الجميع.</p>
            <button type="button" onclick="confirmDeleteChoice('me')" class="w-full bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-xl text-xs font-bold">حذف من عندي فقط</button>
            <button type="button" id="del-everyone-btn" onclick="confirmDeleteChoice('all')" class="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-xs font-bold">حذف عند الجميع</button>
            <button type="button" onclick="closeDeleteModal()" class="w-full text-slate-400 hover:text-white py-1.5 text-xs">إلغاء</button>
        </div>
    </div>

    <!-- المحتوى الرئيسي -->
    <main class="flex-1 flex flex-col overflow-hidden bg-[#070c17]">

        <!-- 1. الدردشة -->
        <section id="pane-chats" class="flex-1 flex flex-col h-full overflow-hidden">
            <div class="p-2.5 bg-slate-900/80 border-b border-slate-800 space-y-2 shrink-0">
                <div class="flex gap-2">
                    <input type="text" id="peer-input" oninput="onTopPeerSearchInput()" onkeydown="if(event.key==='Enter'){event.preventDefault();openPeerByInput();}" placeholder="بحث بالاسم أو الكود (8 أرقام) أو جوال..." class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs md:text-sm text-white focus:outline-none focus:border-blue-500">
                    <button type="button" onclick="openPeerByInput()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition">فتح</button>
                    <button type="button" onclick="saveCurrentPeer()" title="حفظ في الجهات" class="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 px-3 py-2 rounded-xl text-xs font-bold">
                        <i class="fa-solid fa-user-plus"></i>
                    </button>
                </div>
                <div id="quick-chips" class="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs"></div>
            </div>

            <div class="px-4 py-2 bg-slate-950/80 border-b border-slate-800/90 flex justify-between items-center text-xs shrink-0">
                <div class="flex items-center gap-2 min-w-0">
                    <span id="peer-dot" class="w-2.5 h-2.5 rounded-full bg-slate-600 shrink-0"></span>
                    <span id="peer-title" class="font-bold text-white font-mono truncate">88888888</span>
                    <span id="peer-status" class="text-[11px] font-bold text-slate-400 shrink-0 whitespace-nowrap">غير متصل</span>
                </div>
                <div class="flex items-center gap-2.5 shrink-0">
                    <button type="button" onclick="launchCall('audio')" title="اتصال صوتي سريع" class="text-emerald-400 hover:text-emerald-300 font-bold"><i class="fa-solid fa-phone"></i></button>
                    <button type="button" onclick="launchCall('video')" title="مكالمة فيديو سريعة" class="text-blue-400 hover:text-blue-300 font-bold"><i class="fa-solid fa-video"></i></button>
                    <button type="button" onclick="summarizeCurrentThread()" class="text-indigo-400 hover:underline font-semibold"><i class="fa-solid fa-sparkles ml-1"></i>تلخيص</button>
                    <button type="button" onclick="shareInviteLink()" class="text-cyan-400 hover:underline font-semibold"><i class="fa-solid fa-share-nodes ml-1"></i>دعوة</button>
                    <button type="button" onclick="clearThreadMsgs()" class="text-red-400 hover:underline font-semibold"><i class="fa-solid fa-trash ml-1"></i>مسح</button>
                </div>
            </div>

            <div id="msgs-box" class="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar"></div>

            <div id="smart-replies-bar" class="hidden px-3 py-1.5 bg-slate-950/90 border-t border-slate-800/70 flex items-center gap-1.5 overflow-x-auto text-[11px] shrink-0"></div>

            <div class="p-2.5 bg-slate-900 border-t border-slate-800 flex items-center gap-1.5 shrink-0">
                <input type="file" id="attach-file" class="hidden" onchange="onFilePicked(event)">
                <button type="button" onclick="document.getElementById('attach-file').click()" title="إرفاق ملف أو صورة" class="text-amber-400 hover:text-amber-300 p-2 rounded-xl hover:bg-slate-800 transition">
                    <i class="fa-solid fa-paperclip text-base"></i>
                </button>
                <button type="button" id="dictate-btn" onclick="toggleSpeechDictation()" title="إملاء صوتي" class="text-cyan-400 hover:text-cyan-300 p-2 rounded-xl hover:bg-slate-800 transition">
                    <i class="fa-solid fa-language text-base"></i>
                </button>
                <button type="button" onclick="polishDraft()" title="تحسين الصياغة" class="text-indigo-400 hover:text-indigo-300 p-2 rounded-xl hover:bg-slate-800 transition">
                    <i class="fa-solid fa-wand-magic-sparkles text-base"></i>
                </button>
                <input type="text" id="msg-box-input" onkeydown="if(event.key==='Enter'){event.preventDefault();sendTextMsg();}" placeholder="اكتب رسالتك..." class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500">
                <span id="rec-timer" class="hidden text-[11px] font-mono font-bold text-red-400 px-1">00:00</span>
                <button type="button" id="voice-btn" onclick="toggleVoiceCapture()" title="تسجيل رسالة صوتية" class="bg-slate-800 hover:bg-emerald-600 text-emerald-400 hover:text-white p-2.5 rounded-xl transition">
                    <i class="fa-solid fa-microphone text-base"></i>
                </button>
                <button type="button" onclick="sendTextMsg()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition shadow">
                    <i class="fa-solid fa-paper-plane"></i>
                </button>
            </div>
        </section>

        <!-- 2. الحسابات -->
        <section id="pane-accounts" class="hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-4">
            <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
                <div class="flex items-center justify-between">
                    <h2 class="text-sm font-black text-blue-400">إدارة الحسابات والأرقام</h2>
                    <span id="accounts-count-badge" class="text-[11px] font-mono text-blue-300 bg-blue-950/60 px-2.5 py-0.5 rounded-full">1 رقم</span>
                </div>
                <p class="text-[11px] text-slate-400 leading-relaxed">
                    يمكنك توليد أو إضافة أكثر من رقم أو معرّف والتبديل بينها بسهولة.
                </p>
                <div class="flex flex-wrap gap-2">
                    <button type="button" onclick="make8DigitId()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold">+ توليد معرّف (8 أرقام)</button>
                    <button type="button" onclick="addCustomNumberAccount()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold">+ إضافة رقم/معرّف</button>
                    <button type="button" onclick="verifyPhoneAccount()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold">+ تفعيل رقم جوال</button>
                </div>
                <div id="last-generated-banner" class="hidden bg-emerald-950/50 border border-emerald-700/50 rounded-xl p-2.5 flex items-center justify-between text-xs">
                    <span id="last-generated-text" class="font-mono font-bold text-emerald-300"></span>
                    <button type="button" onclick="copyStringToClipboard(lastGeneratedCode)" class="bg-emerald-600 text-white px-3 py-1 rounded-lg text-[11px] font-bold">نسخ</button>
                </div>
                <div id="accounts-list" class="space-y-2 pt-2"></div>
            </div>
        </section>

        <!-- 3. الجهات -->
        <section id="pane-contacts" class="hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-3">
            <div class="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl space-y-2.5">
                <div class="flex items-center justify-between">
                    <h2 class="text-sm font-black text-emerald-400">جهات الاتصال</h2>
                    <button type="button" onclick="scanNumbersForSanad()" class="bg-blue-600/20 hover:bg-blue-600 border border-blue-500/40 text-blue-300 hover:text-white px-3 py-1 rounded-lg text-[11px] font-bold transition">
                        <i class="fa-solid fa-user-check ml-1"></i>فحص أرقام
                    </button>
                </div>
                <div class="flex flex-col sm:flex-row gap-2">
                    <input type="text" id="c-name" onkeydown="if(event.key==='Enter')addNewContact()" placeholder="الاسم" class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                    <input type="text" id="c-id" onkeydown="if(event.key==='Enter')addNewContact()" placeholder="معرّف 8 أرقام أو رقم الجوال" class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono">
                    <button type="button" onclick="addNewContact()" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold">حفظ</button>
                </div>
            </div>
            <div class="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 flex-1 min-w-0">
                    <i class="fa-solid fa-magnifying-glass text-slate-400 text-xs pr-1"></i>
                    <input type="text" id="contact-search-input" oninput="renderPresence()" onkeydown="if(event.key==='Enter')openFirstMatchedContact()" placeholder="بحث بالاسم أو الكود أو الرقم..." class="flex-1 bg-transparent text-xs text-white focus:outline-none">
                </div>
                <span id="contacts-summary-badge" class="text-[10px] font-mono text-slate-400 shrink-0">0 جهة</span>
            </div>
            <div id="contacts-list" class="space-y-2"></div>
        </section>

        <!-- 4. المكالمات -->
        <section id="pane-calls" class="hidden flex-1 flex-col items-center justify-center p-6 text-center space-y-4">
            <div class="w-16 h-16 rounded-2xl bg-blue-600/15 border border-blue-500/30 text-blue-400 flex items-center justify-center text-2xl">
                <i class="fa-solid fa-phone-volume"></i>
            </div>
            <div>
                <h2 class="text-base font-black text-white">المكالمات الصوتية والمرئية</h2>
                <p class="text-xs text-slate-400 mt-1 max-w-sm">الرقم النشط في الدردشة جاهز تلقائياً، أو أدخل أي رقم/معرّف لبدء اتصال مباشر.</p>
            </div>
            <input type="text" id="call-input" placeholder="أدخل معرّف 8 أرقام أو رقم الجوال..." class="w-full max-w-xs bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-center font-mono text-white">
            <div class="flex gap-3">
                <button type="button" onclick="launchCall('audio', (document.getElementById('call-input').value.trim() || currentPeer))" class="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
                    <i class="fa-solid fa-phone"></i> مكالمة صوتية
                </button>
                <button type="button" onclick="launchCall('video', (document.getElementById('call-input').value.trim() || currentPeer))" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
                    <i class="fa-solid fa-video"></i> مكالمة فيديو
                </button>
            </div>
        </section>

        <!-- 5. الذكاء والإعدادات -->
        <section id="pane-ai" class="hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-3">
            <div class="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-2.5">
                <h2 class="text-sm font-black text-indigo-400"><i class="fa-solid fa-brain ml-1"></i> مساعد سند AI والإعدادات</h2>
                <div class="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                    <span>وضع الشبكة الضعيفة / 1X</span>
                    <input type="checkbox" id="chk-weaknet" checked onchange="updateNetModeBadge()" class="w-4 h-4 accent-emerald-600">
                </div>
                <div class="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                    <span>الرد التلقائي عند استلام رسالة</span>
                    <input type="checkbox" id="chk-autoreply" class="w-4 h-4 accent-indigo-600">
                </div>
                <div class="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                    <span>نغمة التنبيه والرنين</span>
                    <input type="checkbox" id="chk-chime" checked class="w-4 h-4 accent-blue-600">
                </div>
                <div class="grid grid-cols-2 gap-2 pt-1">
                    <button type="button" onclick="extractTasksFromThread()" class="bg-indigo-600/20 hover:bg-indigo-600/35 border border-indigo-500/30 text-indigo-200 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-list-check ml-1"></i>استخراج مهام</button>
                    <button type="button" onclick="suggestSmartReplies()" class="bg-blue-600/20 hover:bg-blue-600/35 border border-blue-500/30 text-blue-200 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-bolt ml-1"></i>ردود ذكية</button>
                </div>
                <div class="flex gap-2">
                    <button type="button" onclick="exportBackup()" class="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-download ml-1"></i>تصدير نسخة</button>
                    <button type="button" onclick="importBackup()" class="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 rounded-xl text-xs font-bold"><i class="fa-solid fa-upload ml-1"></i>استعادة نسخة</button>
                </div>
                <div id="ai-log" class="bg-slate-950 border border-slate-800 rounded-xl p-3 h-36 overflow-y-auto text-xs space-y-2 custom-scrollbar">
                    <div class="text-slate-400">مرحباً بك في سند AI v8.0.</div>
                </div>
                <div class="flex gap-2">
                    <input type="text" id="ai-q" onkeydown="if(event.key==='Enter')askSanadAI()" placeholder="اسأل سند AI..." class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                    <button type="button" onclick="askSanadAI()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold">إرسال</button>
                </div>
            </div>
        </section>

    </main>

    <!-- شريط التنقل السفلي -->
    <nav class="bg-slate-900 border-t border-slate-800 px-1 py-2 flex justify-around items-center z-20 shrink-0">
        <button type="button" onclick="setPane('chats')" id="btn-chats" class="flex flex-col items-center gap-1 text-blue-400 font-bold text-[10px] px-2 py-1">
            <i class="fa-solid fa-comments text-base"></i>
            <span>الدردشة</span>
        </button>
        <button type="button" onclick="setPane('accounts')" id="btn-accounts" class="flex flex-col items-center gap-1 text-slate-400 font-semibold text-[10px] px-2 py-1">
            <i class="fa-solid fa-id-card text-base"></i>
            <span>الحسابات</span>
        </button>
        <button type="button" onclick="setPane('contacts')" id="btn-contacts" class="flex flex-col items-center gap-1 text-slate-400 font-semibold text-[10px] px-2 py-1">
            <i class="fa-solid fa-address-book text-base"></i>
            <span>الجهات</span>
        </button>
        <button type="button" onclick="setPane('calls')" id="btn-calls" class="flex flex-col items-center gap-1 text-slate-400 font-semibold text-[10px] px-2 py-1">
            <i class="fa-solid fa-phone-volume text-base"></i>
            <span>المكالمات</span>
        </button>
        <button type="button" onclick="setPane('ai')" id="btn-ai" class="flex flex-col items-center gap-1 text-slate-400 font-semibold text-[10px] px-2 py-1">
            <i class="fa-solid fa-brain text-base"></i>
            <span>الذكاء والإعدادات</span>
        </button>
    </nav>

    <script>
        var activeAcct = '88888888';
        var myAccts = ['88888888'];
        var contacts = [{ name: 'خدمة العملاء', id: '88888888' }];
        var currentPeer = '88888888';
        var activePane = 'chats';
        var onlinePeers = new Set();
        var acctThreads = {};
        var seenEventIds = new Set();
        var outboxQueue = [];
        var lastGeneratedCode = '';
        var pendingDeleteMsgId = null;
        var toastPeerId = null;
        var toastTimer = null;
        var ringtoneTimer = null;
        var speakerModeActive = true;
        var ws = null;
        var wsConnected = false;
        var serverReachable = false;
        var pollTimer = null;

        function setConnectionStatus(text, connected) {
            var dot = document.getElementById('ws-dot');
            var lbl = document.getElementById('ws-label');
            if (dot) {
                dot.className = connected
                    ? 'w-2 h-2 rounded-full bg-emerald-500'
                    : 'w-2 h-2 rounded-full bg-amber-400';
            }
            if (lbl) {
                lbl.textContent = text;
            }
        }

        function refreshConnectionHeader() {
            if (wsConnected || serverReachable) {
                setConnectionStatus('متصل', true);
            } else {
                setConnectionStatus('جاري الربط...', false);
            }
            updateQueueBadge();
        }

        function fetchWithTimeout(url, options, timeoutMs) {
            var opts = options || {};
            var limit = timeoutMs || 5000;
            if (typeof AbortController === 'undefined') {
                return fetch(url, opts);
            }
            var controller = new AbortController();
            var timer = setTimeout(function() { controller.abort(); }, limit);
            opts.signal = controller.signal;
            return fetch(url, opts).finally(function() { clearTimeout(timer); });
        }

        function loadSavedState() {
            try {
                var savedActive = localStorage.getItem('sanad8_active');
                var savedAccts = JSON.parse(localStorage.getItem('sanad8_accts') || 'null');
                var savedContacts = JSON.parse(localStorage.getItem('sanad8_contacts') || 'null');
                var savedThreads = JSON.parse(localStorage.getItem('sanad8_threads') || 'null');
                if (savedActive) activeAcct = String(savedActive);
                if (Array.isArray(savedAccts) && savedAccts.length) myAccts = savedAccts;
                if (myAccts.indexOf(activeAcct) === -1) myAccts.unshift(activeAcct);
                if (Array.isArray(savedContacts) && savedContacts.length) contacts = savedContacts;
                if (savedThreads && typeof savedThreads === 'object') acctThreads = savedThreads;
            } catch (e) {}
        }

        function persistState() {
            try {
                localStorage.setItem('sanad8_active', activeAcct);
                localStorage.setItem('sanad8_accts', JSON.stringify(myAccts));
                localStorage.setItem('sanad8_contacts', JSON.stringify(contacts));
                localStorage.setItem('sanad8_threads', JSON.stringify(acctThreads));
            } catch (e) {}
        }

        function detectDevice() {
            var ua = navigator.userAgent || '';
            if (/iPad/i.test(ua)) return 'آيباد';
            if (/iPhone|iPod/i.test(ua)) return 'آيفون';
            if (/Android/i.test(ua)) return 'أندرويد';
            return 'كمبيوتر';
        }

        function isWeakNetworkMode() {
            var chk = document.getElementById('chk-weaknet');
            var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            var slowConn = conn && (conn.saveData || conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g');
            return Boolean((chk && chk.checked) || slowConn);
        }

        function updateNetModeBadge() {}

        function updateQueueBadge() {
            var qb = document.getElementById('queue-badge');
            if (!qb) return;
            if (outboxQueue.length > 0) {
                qb.textContent = outboxQueue.length + ' معلّق';
                qb.classList.remove('hidden');
            } else {
                qb.classList.add('hidden');
            }
        }

        function normalizeStr(v) {
            return String(v || '').trim().toLowerCase();
        }

        function getSortedContacts() {
            return contacts.slice().sort(function(a, b) {
                var aOn = onlinePeers.has(a.id) ? 1 : 0;
                var bOn = onlinePeers.has(b.id) ? 1 : 0;
                if (aOn !== bOn) return bOn - aOn;
                return String(a.name || '').localeCompare(String(b.name || ''), 'ar');
            });
        }

        function findContactMatches(queryStr) {
            var q = normalizeStr(queryStr);
            if (!q) return getSortedContacts();
            return getSortedContacts().filter(function(c) {
                return normalizeStr(c.name).indexOf(q) !== -1 || normalizeStr(c.id).indexOf(q) !== -1;
            });
        }

        function upsertContact(name, id) {
            var cleanId = String(id || '').trim();
            if (!cleanId) return null;
            var cleanName = String(name || '').trim() || ('جهة ' + cleanId);
            var existingIdx = contacts.findIndex(function(c) {
                return normalizeStr(c.id) === normalizeStr(cleanId);
            });
            if (existingIdx !== -1) {
                contacts[existingIdx] = { name: cleanName, id: cleanId };
            } else {
                contacts.push({ name: cleanName, id: cleanId });
            }
            persistAndDraw();
            return contacts.find(function(c) { return normalizeStr(c.id) === normalizeStr(cleanId); });
        }

        function scanNumbersForSanad() {
            var sample = contacts.map(function(c) { return c.id; }).join(', ');
            var raw = prompt('ألصق أرقاماً أو معرّفات (مفصولة بفاصلة أو سطر) لفحص المشتركين/المتصلين:', sample);
            if (raw === null) return;
            var tokens = raw.split(/[\s,،\n]+/).map(function(x) { return x.trim(); }).filter(Boolean);
            if (!tokens.length) return alert('لم يتم إدخال أي أرقام للفحص.');
            var matchedOnline = [];
            tokens.forEach(function(num) {
                var found = contacts.find(function(c) { return normalizeStr(c.id) === normalizeStr(num); });
                if (!found) upsertContact('رقم ' + num, num);
                if (onlinePeers.has(num)) matchedOnline.push(num);
            });
            renderPresence();
            alert('تم فحص ' + tokens.length + ' رقم. المتصلون حالياً: ' + (matchedOnline.length ? matchedOnline.join(', ') : 'لا يوجد متصلون الآن، وتم حفظ الأرقام في الجهات.'));
        }

        function copyStringToClipboard(txt) {
            if (!txt) return;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(txt).catch(function() {});
            }
        }

        function getThreadMap() {
            if (!acctThreads[activeAcct]) {
                acctThreads[activeAcct] = {
                    '88888888': [{ id: 'init-' + activeAcct, from: 'them', kind: 'text', text: 'أهلاً بك في سند AI v8.0. الحساب النشط: ' + activeAcct }]
                };
            }
            return acctThreads[activeAcct];
        }

        function playTonePattern(freqs, durationSec) {
            var chk = document.getElementById('chk-chime');
            if (chk && !chk.checked) return;
            try {
                var Ctx = window.AudioContext || window.webkitAudioContext;
                var ctx = new Ctx();
                freqs.forEach(function(f, idx) {
                    var osc = ctx.createOscillator();
                    var gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(f, ctx.currentTime + idx * durationSec);
                    gain.gain.setValueAtTime(0.06, ctx.currentTime + idx * durationSec);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(ctx.currentTime + idx * durationSec);
                    osc.stop(ctx.currentTime + idx * durationSec + durationSec * 0.9);
                });
            } catch (e) {}
        }

        function playSoftChime() { playTonePattern([660, 880], 0.12); }

        function startRingtoneLoop() {
            stopRingtoneLoop();
            playTonePattern([587, 784, 587, 784], 0.16);
            ringtoneTimer = setInterval(function() { playTonePattern([587, 784, 587, 784], 0.16); }, 2200);
        }

        function stopRingtoneLoop() {
            if (ringtoneTimer) { clearInterval(ringtoneTimer); ringtoneTimer = null; }
        }

        function showLiveToast(senderId, previewText) {
            var matched = contacts.find(function(c) { return normalizeStr(c.id) === normalizeStr(senderId); });
            var label = matched ? (matched.name + ' • ' + senderId) : senderId;
            toastPeerId = senderId;
            document.getElementById('toast-sender').textContent = 'رسالة من: ' + label;
            document.getElementById('toast-body').textContent = previewText || 'مرفق جديد';
            var el = document.getElementById('live-toast');
            el.classList.remove('hidden');
            if (toastTimer) clearTimeout(toastTimer);
            toastTimer = setTimeout(function() { el.classList.add('hidden'); }, 4500);
        }

        function jumpToToastChat() {
            if (!toastPeerId) return;
            document.getElementById('live-toast').classList.add('hidden');
            choosePeer(toastPeerId);
        }

        function speakText(txt) {
            if (!('speechSynthesis' in window) || !txt) return;
            window.speechSynthesis.cancel();
            var utter = new SpeechSynthesisUtterance(txt);
            utter.lang = 'ar-SA';
            window.speechSynthesis.speak(utter);
        }

        function sendReadReceiptIfViewing(peerId, msgId) {
            if (activePane === 'chats' && normalizeStr(currentPeer) === normalizeStr(peerId) && !document.hidden) {
                sendSignalingOrMsg({ type: 'msg_read', to: peerId, from: activeAcct, msgId: msgId });
            }
        }

        function handleIncomingPayload(msg) {
            if (!msg || !msg.type) return;
            var eid = msg.eventId || '';
            if (eid && seenEventIds.has(eid)) return;
            if (eid) seenEventIds.add(eid);

            if (msg.type === 'online_users' && Array.isArray(msg.ids)) {
                onlinePeers = new Set(msg.ids);
                renderPresence();
            } else if (msg.type === 'msg') {
                var recipient = String(msg.to || activeAcct);
                var sender = String(msg.from || '');
                if (!sender) return;
                if (!acctThreads[recipient]) acctThreads[recipient] = {};
                if (!acctThreads[recipient][sender]) acctThreads[recipient][sender] = [];
                var exists = acctThreads[recipient][sender].some(function(m) { return m.id === msg.msgId; });
                if (!exists) {
                    acctThreads[recipient][sender].push({
                        id: msg.msgId || ('m-' + Date.now()),
                        from: 'them',
                        kind: msg.kind || 'text',
                        text: msg.text || '',
                        mediaUrl: msg.mediaUrl || null,
                        fileName: msg.fileName || ''
                    });
                }
                sendSignalingOrMsg({ type: 'msg_delivered', to: sender, from: recipient, msgId: msg.msgId });
                sendReadReceiptIfViewing(sender, msg.msgId);
                playSoftChime();
                if (!(activePane === 'chats' && normalizeStr(currentPeer) === normalizeStr(sender))) {
                    showLiveToast(sender, msg.kind === 'audio' ? 'رسالة صوتية' : (msg.text || 'مرفق'));
                }
                persistAndDraw();
                var autoChk = document.getElementById('chk-autoreply');
                if (autoChk && autoChk.checked && msg.kind === 'text' && sender !== recipient) {
                    emitPacket(sender, 'text', 'رد تلقائي من سند AI: تم استلام رسالتك وسيتم الرد عليك قريباً.', null, '', null, recipient);
                }
            } else if (msg.type === 'msg_delivered') {
                var ownerDel = String(msg.to || activeAcct);
                var fromPeerDel = String(msg.from || '');
                if (acctThreads[ownerDel] && acctThreads[ownerDel][fromPeerDel]) {
                    acctThreads[ownerDel][fromPeerDel] = acctThreads[ownerDel][fromPeerDel].map(function(m) {
                        if (m.id !== msg.msgId) return m;
                        return Object.assign({}, m, { delivered: true, status: m.status === 'read' ? 'read' : 'delivered' });
                    });
                    persistAndDraw();
                }
            } else if (msg.type === 'msg_read') {
                var ownerRead = String(msg.to || activeAcct);
                var fromPeerRead = String(msg.from || '');
                if (acctThreads[ownerRead] && acctThreads[ownerRead][fromPeerRead]) {
                    acctThreads[ownerRead][fromPeerRead] = acctThreads[ownerRead][fromPeerRead].map(function(m) {
                        if (m.id !== msg.msgId) return m;
                        return Object.assign({}, m, { delivered: true, read: true, status: 'read' });
                    });
                    persistAndDraw();
                }
            } else if (msg.type === 'msg_del_all' || msg.type === 'msg_del') {
                var recipientDel = String(msg.to || activeAcct);
                var delSender = String(msg.from || '');
                if (acctThreads[recipientDel] && acctThreads[recipientDel][delSender]) {
                    acctThreads[recipientDel][delSender] = acctThreads[recipientDel][delSender].map(function(m) {
                        return m.id === msg.msgId ? Object.assign({}, m, { deleted: true, deletedBy: 'all' }) : m;
                    });
                    persistAndDraw();
                }
            } else if (msg.type === 'call_sig') {
                onCallSignal(msg);
            }
        }

        function postHttpSync(payload) {
            return fetchWithTimeout('/api/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }, 5000).then(function(res) {
                if (!res || !res.ok) return null;
                serverReachable = true;
                refreshConnectionHeader();
                return res.json();
            }).then(function(data) {
                if (!data) return null;
                serverReachable = true;
                refreshConnectionHeader();
                if (Array.isArray(data.onlineIds)) {
                    onlinePeers = new Set(data.onlineIds);
                    renderPresence();
                }
                if (Array.isArray(data.events)) {
                    data.events.forEach(handleIncomingPayload);
                }
                return data;
            }).catch(function() {
                if (payload && payload.to && payload.type === 'msg') {
                    outboxQueue.push(payload);
                    updateQueueBadge();
                }
                return null;
            });
        }

        function flushOutboxQueue() {
            if (!outboxQueue.length) return;
            var batch = outboxQueue.slice();
            outboxQueue = [];
            updateQueueBadge();
            batch.forEach(function(item) { postHttpSync(item); });
        }

        function pollHttpSync() {
            var q = encodeURIComponent(myAccts.join(','));
            return fetchWithTimeout('/api/sync?ids=' + q, { cache: 'no-store' }, 5000).then(function(res) {
                if (!res || !res.ok) return null;
                serverReachable = true;
                refreshConnectionHeader();
                return res.json();
            }).then(function(data) {
                if (!data) return null;
                serverReachable = true;
                refreshConnectionHeader();
                flushOutboxQueue();
                if (Array.isArray(data.onlineIds)) {
                    onlinePeers = new Set(data.onlineIds);
                    renderPresence();
                }
                if (Array.isArray(data.events)) {
                    data.events.forEach(handleIncomingPayload);
                }
                return data;
            }).catch(function() {
                return checkHealthzFallback();
            });
        }

        function checkHealthzFallback() {
            return fetchWithTimeout('/healthz', { cache: 'no-store' }, 5000).then(function(res) {
                if (!res || !res.ok) return null;
                return res.json();
            }).then(function(data) {
                if (data && data.ok) {
                    serverReachable = true;
                    refreshConnectionHeader();
                    if (Array.isArray(data.onlineIds)) {
                        onlinePeers = new Set(data.onlineIds);
                        renderPresence();
                    }
                }
                return data;
            }).catch(function() {
                return null;
            });
        }

        function openSocket() {
            try {
                if (typeof WebSocket === 'undefined') return;
                var scheme = location.protocol === 'https:' ? 'wss:' : 'ws:';
                ws = new WebSocket(scheme + '//' + location.host);
                ws.onopen = function() {
                    wsConnected = true;
                    serverReachable = true;
                    refreshConnectionHeader();
                    try {
                        ws.send(JSON.stringify({ type: 'register_ids', ids: myAccts, activeId: activeAcct }));
                    } catch (e) {}
                    flushOutboxQueue();
                };
                ws.onclose = function() {
                    wsConnected = false;
                    refreshConnectionHeader();
                };
                ws.onerror = function() {
                    wsConnected = false;
                    refreshConnectionHeader();
                };
                ws.onmessage = function(ev) {
                    try { handleIncomingPayload(JSON.parse(ev.data)); } catch (e) {}
                };
            } catch (e) {
                wsConnected = false;
                refreshConnectionHeader();
            }
        }

        function reconnectNow() {
            setConnectionStatus('جاري الربط...', false);
            if (ws) { try { ws.close(); } catch (e) {} }
            openSocket();
            postHttpSync({ type: 'register_ids', ids: myAccts, activeId: activeAcct });
            pollHttpSync();
        }

        function sendSignalingOrMsg(payload) {
            var enriched = Object.assign({}, payload, {
                eventId: payload.eventId || ('ev-' + Date.now() + '-' + Math.floor(Math.random() * 100000))
            });
            var sentWs = false;
            if (ws && ws.readyState === 1) {
                try { ws.send(JSON.stringify(enriched)); sentWs = true; } catch (e) {}
            }
            if (!sentWs || !isWeakNetworkMode() || !serverReachable) {
                postHttpSync(enriched);
            } else {
                outboxQueue.push(enriched);
                updateQueueBadge();
            }
        }

        var rtcConn = null;
        var localStreamObj = null;
        var remoteStreamObj = null;
        var pendingCall = null;
        var callPeerId = null;
        var activeCallMode = 'audio';
        var facingModeCurrent = 'user';
        var rtcConfig = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };

        function applyAudioOutputPreference() {
            var targetVol = speakerModeActive ? 1.0 : 0.45;
            var audEl = document.getElementById('remote-audio-el');
            if (audEl) {
                audEl.muted = false;
                audEl.volume = targetVol;
                if (audEl.setSinkId) audEl.setSinkId(speakerModeActive ? 'default' : '').catch(function() {});
                audEl.play().catch(function() {});
            }
            var rv = document.getElementById('remote-video-el');
            if (rv && !rv.classList.contains('hidden')) {
                rv.muted = false;
                rv.volume = targetVol;
                rv.play().catch(function() {});
            }
            var iconEl = document.getElementById('speaker-toggle-icon');
            var hintEl = document.getElementById('call-output-hint');
            if (iconEl) iconEl.className = speakerModeActive ? 'fa-solid fa-volume-high' : 'fa-solid fa-ear-listen';
            if (hintEl) {
                hintEl.textContent = speakerModeActive
                    ? 'وضع الإخراج: مكبر الصوت'
                    : 'وضع الإخراج: سماعة/مستوى مخفّض';
            }
        }

        function toggleSpeakerOrEarpiece() { speakerModeActive = !speakerModeActive; applyAudioOutputPreference(); }

        function forceUnmuteAudio() {
            if (remoteStreamObj) {
                var audEl = document.getElementById('remote-audio-el');
                if (audEl && audEl.srcObject !== remoteStreamObj) audEl.srcObject = remoteStreamObj;
            }
            applyAudioOutputPreference();
        }

        function tuneAudioSenderForWeakNet(pc) {
            if (!pc || !pc.getSenders) return;
            var maxAudioBps = isWeakNetworkMode() ? 18000 : 36000;
            pc.getSenders().forEach(function(sender) {
                if (sender.track && sender.track.kind === 'audio' && sender.getParameters && sender.setParameters) {
                    var params = sender.getParameters();
                    if (!params.encodings || !params.encodings.length) params.encodings = [{}];
                    params.encodings[0].maxBitrate = maxAudioBps;
                    sender.setParameters(params).catch(function() {});
                }
            });
        }

        function attachRemoteMediaStream(stream, mode) {
            remoteStreamObj = stream;
            var audEl = document.getElementById('remote-audio-el');
            if (audEl) audEl.srcObject = stream;
            if ((mode || activeCallMode) === 'video') {
                var rv = document.getElementById('remote-video-el');
                rv.srcObject = stream;
                rv.classList.remove('hidden');
            }
            applyAudioOutputPreference();
        }

        function launchCall(mode, explicitTarget) {
            var target = String(explicitTarget || currentPeer || '').trim();
            if (!target) return alert('حدد معرّف أو رقم الطرف الآخر أولاً.');
            currentPeer = target;
            callPeerId = target;
            activeCallMode = mode || 'audio';
            stopRingtoneLoop();
            document.getElementById('call-modal').classList.remove('hidden');
            document.getElementById('call-peer-title').textContent = target + ' • ' + (activeCallMode === 'video' ? 'مكالمة فيديو' : 'مكالمة صوتية');
            document.getElementById('call-status-msg').textContent = 'جاري الاتصال...';
            document.getElementById('accept-btn').classList.add('hidden');
            setCallVisualMode(activeCallMode);
            forceUnmuteAudio();

            var videoConstraints = activeCallMode === 'video'
                ? (isWeakNetworkMode()
                    ? { facingMode: facingModeCurrent, width: { ideal: 360 }, height: { ideal: 640 }, frameRate: { ideal: 15, max: 20 } }
                    : { facingMode: facingModeCurrent, width: { ideal: 720 }, height: { ideal: 1280 } })
                : false;

            navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
                video: videoConstraints
            }).then(function(stream) {
                localStreamObj = stream;
                if (activeCallMode === 'video') {
                    var lv = document.getElementById('local-video-el');
                    lv.srcObject = localStreamObj;
                    lv.play().catch(function() {});
                }
                createRTC(activeCallMode);
                localStreamObj.getTracks().forEach(function(t) { rtcConn.addTrack(t, localStreamObj); });
                tuneAudioSenderForWeakNet(rtcConn);
                return rtcConn.createOffer();
            }).then(function(offer) {
                return rtcConn.setLocalDescription(offer).then(function() { return offer; });
            }).then(function(offer) {
                sendSignalingOrMsg({ type: 'call_sig', to: callPeerId, from: activeAcct, sig: { op: 'offer', mode: activeCallMode, sdp: offer } });
            }).catch(function() {
                document.getElementById('call-status-msg').textContent = 'يرجى السماح بصلاحية الميكروفون أو الكاميرا';
            });
        }

        function switchCameraFacing() {
            if (activeCallMode !== 'video' || !rtcConn) return;
            facingModeCurrent = facingModeCurrent === 'user' ? 'environment' : 'user';
            navigator.mediaDevices.getUserMedia({
                audio: false,
                video: { facingMode: facingModeCurrent, width: { ideal: 720 }, height: { ideal: 1280 } }
            }).then(function(newStream) {
                var newVideoTrack = newStream.getVideoTracks()[0];
                if (!newVideoTrack) return;
                var sender = rtcConn.getSenders().find(function(s) { return s.track && s.track.kind === 'video'; });
                if (sender) sender.replaceTrack(newVideoTrack);
                if (localStreamObj) {
                    localStreamObj.getVideoTracks().forEach(function(t) { t.stop(); localStreamObj.removeTrack(t); });
                    localStreamObj.addTrack(newVideoTrack);
                }
                var lv = document.getElementById('local-video-el');
                if (lv && localStreamObj) { lv.srcObject = localStreamObj; lv.play().catch(function() {}); }
            }).catch(function() {});
        }

        function onCallSignal(msg) {
            var sig = msg.sig;
            if (!sig) return;
            if (sig.op === 'offer') {
                pendingCall = msg;
                callPeerId = msg.from;
                activeCallMode = sig.mode || 'audio';
                var matched = contacts.find(function(c) { return normalizeStr(c.id) === normalizeStr(msg.from); });
                var who = matched ? (matched.name + ' • ' + msg.from) : msg.from;
                document.getElementById('call-modal').classList.remove('hidden');
                document.getElementById('call-peer-title').textContent = who;
                document.getElementById('call-status-msg').textContent = (activeCallMode === 'video' ? 'مكالمة فيديو واردة' : 'مكالمة صوتية واردة') + ' — يرن الآن...';
                document.getElementById('accept-btn').classList.remove('hidden');
                setCallVisualMode(activeCallMode);
                startRingtoneLoop();
            } else if (sig.op === 'answer' && rtcConn) {
                stopRingtoneLoop();
                rtcConn.setRemoteDescription(new RTCSessionDescription(sig.sdp)).then(function() {
                    document.getElementById('call-status-msg').textContent = 'متصل الآن';
                    tuneAudioSenderForWeakNet(rtcConn);
                    forceUnmuteAudio();
                }).catch(function() {});
            } else if (sig.op === 'ice' && rtcConn && sig.candidate) {
                rtcConn.addIceCandidate(new RTCIceCandidate(sig.candidate)).catch(function() {});
            } else if (sig.op === 'bye') {
                resetCallState();
            }
        }

        function answerCall() {
            if (!pendingCall) return;
            stopRingtoneLoop();
            document.getElementById('accept-btn').classList.add('hidden');
            document.getElementById('call-status-msg').textContent = 'جاري فتح الاتصال...';
            var mode = pendingCall.sig.mode || 'audio';
            activeCallMode = mode;
            forceUnmuteAudio();

            navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
                video: mode === 'video' ? { facingMode: facingModeCurrent, width: { ideal: 720 }, height: { ideal: 1280 } } : false
            }).then(function(stream) {
                localStreamObj = stream;
                if (mode === 'video') {
                    var lv = document.getElementById('local-video-el');
                    lv.srcObject = localStreamObj;
                    lv.play().catch(function() {});
                }
                createRTC(mode);
                localStreamObj.getTracks().forEach(function(t) { rtcConn.addTrack(t, localStreamObj); });
                tuneAudioSenderForWeakNet(rtcConn);
                return rtcConn.setRemoteDescription(new RTCSessionDescription(pendingCall.sig.sdp));
            }).then(function() {
                return rtcConn.createAnswer();
            }).then(function(ans) {
                return rtcConn.setLocalDescription(ans).then(function() { return ans; });
            }).then(function(ans) {
                sendSignalingOrMsg({ type: 'call_sig', to: pendingCall.from, from: activeAcct, sig: { op: 'answer', sdp: ans } });
                document.getElementById('call-status-msg').textContent = 'متصل الآن';
                forceUnmuteAudio();
            }).catch(function() {});
        }

        function createRTC(mode) {
            if (rtcConn) { try { rtcConn.close(); } catch (e) {} }
            rtcConn = new RTCPeerConnection(rtcConfig);
            rtcConn.onicecandidate = function(e) {
                if (e.candidate && callPeerId) {
                    sendSignalingOrMsg({ type: 'call_sig', to: callPeerId, from: activeAcct, sig: { op: 'ice', candidate: e.candidate } });
                }
            };
            rtcConn.ontrack = function(e) {
                var incomingStream = (e.streams && e.streams[0]) ? e.streams[0] : new MediaStream([e.track]);
                attachRemoteMediaStream(incomingStream, mode);
            };
        }

        function setCallVisualMode(mode) {
            var lv = document.getElementById('local-video-el');
            var rv = document.getElementById('remote-video-el');
            var vc = document.getElementById('voice-call-card');
            var swBtn = document.getElementById('switch-cam-btn');
            if (mode === 'video') {
                lv.classList.remove('hidden');
                vc.classList.add('hidden');
                if (swBtn) swBtn.classList.remove('hidden');
            } else {
                lv.classList.add('hidden');
                rv.classList.add('hidden');
                vc.classList.remove('hidden');
                if (swBtn) swBtn.classList.add('hidden');
            }
            applyAudioOutputPreference();
        }

        function toggleMuteTrack() {
            if (!localStreamObj) return;
            var tr = localStreamObj.getAudioTracks()[0];
            if (!tr) return;
            tr.enabled = !tr.enabled;
            var btn = document.getElementById('mute-btn');
            var icon = document.getElementById('mute-icon');
            btn.className = tr.enabled
                ? 'w-11 h-11 rounded-2xl bg-slate-800 text-white flex items-center justify-center'
                : 'w-11 h-11 rounded-2xl bg-amber-600 text-white flex items-center justify-center';
            if (icon) icon.className = tr.enabled ? 'fa-solid fa-microphone' : 'fa-solid fa-microphone-slash';
        }

        function endActiveCall() {
            if (callPeerId) sendSignalingOrMsg({ type: 'call_sig', to: callPeerId, from: activeAcct, sig: { op: 'bye' } });
            resetCallState();
        }

        function resetCallState() {
            stopRingtoneLoop();
            if (rtcConn) { try { rtcConn.close(); } catch (e) {} rtcConn = null; }
            if (localStreamObj) { localStreamObj.getTracks().forEach(function(t) { t.stop(); }); localStreamObj = null; }
            remoteStreamObj = null;
            var audEl = document.getElementById('remote-audio-el');
            if (audEl) audEl.srcObject = null;
            document.getElementById('call-modal').classList.add('hidden');
            document.getElementById('remote-video-el').classList.add('hidden');
            document.getElementById('local-video-el').classList.add('hidden');
            pendingCall = null;
            callPeerId = null;
        }

        var speechRec = null;
        var dictating = false;

        function toggleSpeechDictation() {
            var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SR) return alert('الإملاء الصوتي المباشر غير مدعوم في هذا المتصفح.');
            var btn = document.getElementById('dictate-btn');
            if (!dictating) {
                speechRec = new SR();
                speechRec.lang = 'ar-SA';
                speechRec.interimResults = false;
                speechRec.onresult = function(ev) {
                    var transcript = (ev.results && ev.results[0] && ev.results[0][0]) ? ev.results[0][0].transcript : '';
                    if (transcript) {
                        var inp = document.getElementById('msg-box-input');
                        inp.value = (inp.value ? inp.value + ' ' : '') + transcript;
                    }
                };
                speechRec.onend = function() {
                    dictating = false;
                    btn.className = 'text-cyan-400 hover:text-cyan-300 p-2 rounded-xl hover:bg-slate-800 transition';
                };
                speechRec.start();
                dictating = true;
                btn.className = 'bg-cyan-600 text-white p-2 rounded-xl animate-pulse';
            } else {
                speechRec.stop();
                dictating = false;
            }
        }

        function pickSupportedAudioMime() {
            var candidates = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/aac'];
            if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return '';
            for (var i = 0; i < candidates.length; i++) {
                if (MediaRecorder.isTypeSupported(candidates[i])) return candidates[i];
            }
            return '';
        }

        var mediaRec = null;
        var audioBlobs = [];
        var capturingAudio = false;
        var recSeconds = 0;
        var recInterval = null;
        var recTargetPeer = null;

        function resetVoiceUi(stream) {
            if (recInterval) { clearInterval(recInterval); recInterval = null; }
            var timerEl = document.getElementById('rec-timer');
            var btn = document.getElementById('voice-btn');
            if (timerEl) timerEl.classList.add('hidden');
            if (btn) btn.className = 'bg-slate-800 hover:bg-emerald-600 text-emerald-400 hover:text-white p-2.5 rounded-xl transition';
            if (stream) stream.getTracks().forEach(function(t) { t.stop(); });
            capturingAudio = false;
            mediaRec = null;
        }

        function formatTimer(sec) {
            return String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0');
        }

        function toggleVoiceCapture() {
            var btn = document.getElementById('voice-btn');
            var timerEl = document.getElementById('rec-timer');
            if (!capturingAudio) {
                recTargetPeer = currentPeer;
                navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }).then(function(stream) {
                    var mimeType = pickSupportedAudioMime();
                    var recOpts = mimeType ? { mimeType: mimeType } : {};
                    if (isWeakNetworkMode()) recOpts.audioBitsPerSecond = 16000;
                    mediaRec = Object.keys(recOpts).length ? new MediaRecorder(stream, recOpts) : new MediaRecorder(stream);
                    audioBlobs = [];
                    mediaRec.ondataavailable = function(e) { if (e.data && e.data.size > 0) audioBlobs.push(e.data); };
                    mediaRec.onerror = function() { resetVoiceUi(stream); };
                    mediaRec.onstop = function() {
                        var finalType = (mediaRec && mediaRec.mimeType) || mimeType || 'audio/mp4';
                        var blob = new Blob(audioBlobs, { type: finalType });
                        var destPeer = recTargetPeer || currentPeer;
                        resetVoiceUi(stream);
                        if (blob.size > 0) {
                            var reader = new FileReader();
                            reader.onloadend = function() {
                                if (reader.result) emitPacket(destPeer, 'audio', 'رسالة صوتية', reader.result, 'voice-note');
                            };
                            reader.readAsDataURL(blob);
                        }
                    };
                    mediaRec.start(250);
                    capturingAudio = true;
                    recSeconds = 0;
                    timerEl.textContent = '00:00';
                    timerEl.classList.remove('hidden');
                    recInterval = setInterval(function() {
                        recSeconds += 1;
                        timerEl.textContent = formatTimer(recSeconds);
                    }, 1000);
                    btn.className = 'bg-red-600 text-white p-2.5 rounded-xl animate-pulse';
                }).catch(function() { resetVoiceUi(null); alert('يرجى السماح بالوصول إلى الميكروفون.'); });
            } else {
                try {
                    if (mediaRec && mediaRec.state !== 'inactive') {
                        if (mediaRec.requestData) mediaRec.requestData();
                        mediaRec.stop();
                    } else { resetVoiceUi(null); }
                } catch (e) { resetVoiceUi(null); }
            }
        }

        function onFilePicked(ev) {
            var file = ev.target.files && ev.target.files[0];
            if (!file) return;
            if (file.size > 1500000) return alert('الحد الأقصى للمرفق المباشر 1.5 ميجابايت.');
            var reader = new FileReader();
            reader.onloadend = function() {
                var kind = file.type.indexOf('image/') === 0 ? 'image' : 'file';
                emitPacket(currentPeer, kind, file.name, reader.result, file.name);
            };
            reader.readAsDataURL(file);
            ev.target.value = '';
        }

        function emitPacket(to, kind, text, mediaUrl, fileName, existingMsgId, forcedSender) {
            var cleanTo = String(to || '').trim();
            if (!cleanTo) return;
            var senderId = forcedSender || activeAcct;
            var liveDelivered = onlinePeers.has(cleanTo);
            var msgId = existingMsgId || ('m-' + Date.now() + '-' + Math.floor(Math.random() * 10000));
            if (!acctThreads[senderId]) acctThreads[senderId] = {};
            if (!acctThreads[senderId][cleanTo]) acctThreads[senderId][cleanTo] = [];
            var entry = {
                id: msgId, from: 'me', kind: kind, text: text, mediaUrl: mediaUrl, fileName: fileName,
                delivered: liveDelivered, read: false, status: liveDelivered ? 'delivered' : 'sent'
            };
            if (!existingMsgId) {
                acctThreads[senderId][cleanTo].push(entry);
            } else {
                acctThreads[senderId][cleanTo] = acctThreads[senderId][cleanTo].map(function(m) {
                    return m.id === existingMsgId ? Object.assign({}, m, { delivered: liveDelivered, status: liveDelivered ? (m.read ? 'read' : 'delivered') : 'sent' }) : m;
                });
            }
            if (normalizeStr(cleanTo) !== normalizeStr(currentPeer) && !forcedSender) currentPeer = cleanTo;
            persistAndDraw();
            sendSignalingOrMsg({ type: 'msg', to: cleanTo, from: senderId, msgId: msgId, kind: kind, text: text, mediaUrl: mediaUrl, fileName: fileName });
        }

        function retryMessage(msgId) {
            var list = getThreadMap()[currentPeer] || [];
            var item = list.find(function(m) { return m.id === msgId; });
            if (item) emitPacket(currentPeer, item.kind, item.text, item.mediaUrl, item.fileName, item.id);
        }

        function sendTextMsg() {
            var inp = document.getElementById('msg-box-input');
            if (!inp) return;
            var val = inp.value.trim();
            if (!val) return;
            inp.value = '';
            document.getElementById('smart-replies-bar').classList.add('hidden');
            emitPacket(currentPeer, 'text', val, null, '');
        }

        function openDeleteModal(msgId, isMine) {
            pendingDeleteMsgId = msgId;
            var delAllBtn = document.getElementById('del-everyone-btn');
            if (delAllBtn) delAllBtn.classList.toggle('hidden', !isMine);
            document.getElementById('delete-modal').classList.remove('hidden');
        }

        function closeDeleteModal() {
            pendingDeleteMsgId = null;
            document.getElementById('delete-modal').classList.add('hidden');
        }

        function confirmDeleteChoice(mode) {
            var msgId = pendingDeleteMsgId;
            closeDeleteModal();
            if (!msgId) return;
            var map = getThreadMap();
            if (!map[currentPeer]) return;
            map[currentPeer] = map[currentPeer].map(function(m) {
                return m.id === msgId ? Object.assign({}, m, { deleted: true, deletedBy: mode === 'all' ? 'all' : 'me' }) : m;
            });
            persistAndDraw();
            if (mode === 'all') sendSignalingOrMsg({ type: 'msg_del_all', to: currentPeer, from: activeAcct, msgId: msgId });
        }

        function clearThreadMsgs() { getThreadMap()[currentPeer] = []; persistAndDraw(); }

        function polishDraft() {
            var inp = document.getElementById('msg-box-input');
            var raw = inp.value.trim();
            if (!raw) return alert('اكتب نصاً أولاً لتحسين صياغته.');
            var cleaned = raw.replace(/\s+/g, ' ');
            if (cleaned.indexOf('السلام') !== 0 && cleaned.length < 40) cleaned = 'تحية طيبة، ' + cleaned;
            inp.value = /[.!؟]$/.test(cleaned) ? cleaned : cleaned + '.';
        }

        function summarizeCurrentThread() {
            var list = (getThreadMap()[currentPeer] || []).filter(function(m) { return !m.deleted && m.kind === 'text'; });
            if (!list.length) return alert('لا توجد رسائل نصية كافية لتلخيصها.');
            var lastFew = list.slice(-6).map(function(m) { return (m.from === 'me' ? 'أنت: ' : 'الطرف: ') + m.text; }).join(' • ');
            setPane('ai');
            var log = document.getElementById('ai-log');
            log.innerHTML += '<div class="bg-indigo-950/50 p-2 rounded-lg text-indigo-200"><strong>ملخص (' + currentPeer + '):</strong> ' + lastFew + '</div>';
            log.scrollTop = log.scrollHeight;
        }

        function extractTasksFromThread() {
            var list = (getThreadMap()[currentPeer] || []).filter(function(m) { return !m.deleted && m.kind === 'text'; });
            if (!list.length) return alert('لا توجد رسائل نصية لاستخراج المهام منها.');
            var tasks = list.slice(-5).map(function(m, idx) { return (idx + 1) + '. متابعة: ' + m.text; }).join(' | ');
            var log = document.getElementById('ai-log');
            log.innerHTML += '<div class="bg-emerald-950/40 border border-emerald-700/30 p-2 rounded-lg text-emerald-200"><strong>مهام (' + currentPeer + '):</strong> ' + tasks + '</div>';
            log.scrollTop = log.scrollHeight;
        }

        function suggestSmartReplies() {
            var list = (getThreadMap()[currentPeer] || []).filter(function(m) { return !m.deleted && m.kind === 'text'; });
            var lastIncoming = list.slice().reverse().find(function(m) { return m.from === 'them'; });
            var base = lastIncoming ? lastIncoming.text : '';
            var options = ['تمام، وصلت الفكرة', 'سأرد عليك خلال دقائق', 'ممتاز، يعطيك العافية'];
            if (base.indexOf('؟') !== -1 || base.indexOf('كيف') !== -1 || base.indexOf('متى') !== -1) {
                options = ['بالتأكيد، نرتبها الآن', 'نعم، مناسب جداً', 'أعطني لحظة للتأكيد'];
            }
            setPane('chats');
            var bar = document.getElementById('smart-replies-bar');
            bar.innerHTML = '<span class="text-indigo-300 font-bold shrink-0"><i class="fa-solid fa-sparkles"></i> ردود:</span>' + options.map(function(opt) {
                return '<button type="button" onclick="applySmartReply(\'' + opt.replace(/'/g, '') + '\')" class="bg-indigo-950/70 hover:bg-indigo-800/70 border border-indigo-500/30 text-indigo-100 px-2.5 py-1 rounded-lg shrink-0">' + opt + '</button>';
            }).join('');
            bar.classList.remove('hidden');
        }

        function applySmartReply(txt) {
            var inp = document.getElementById('msg-box-input');
            inp.value = txt;
            inp.focus();
        }

        function askSanadAI() {
            var inp = document.getElementById('ai-q');
            var q = inp.value.trim();
            if (!q) return;
            var log = document.getElementById('ai-log');
            log.innerHTML += '<div class="bg-blue-950/50 p-2 rounded-lg text-blue-200"><strong>أنت:</strong> ' + q + '</div>';
            var reply = 'مساعد سند AI v8.0 جاهز للمراسلة والمكالمات وتلخيص المحادثات واستخراج المهام.';
            if (q.indexOf('1x') !== -1 || q.indexOf('شبك') !== -1 || q.indexOf('صوت') !== -1) {
                reply = 'على الشبكات الضعيفة أو 1X يتم تقليل معدل نقل الصوت وإطارات الفيديو مع الاحتفاظ بطابور إعادة الإرسال.';
            } else if (q.indexOf('صياغ') !== -1 || q.indexOf('رسالة') !== -1 || q.indexOf('اكتب') !== -1) {
                reply = 'صياغة مقترحة: «السلام عليكم ورحمة الله وبركاته، يسعدنا تواصلكم ونفيدكم بأن كل شيء جاهز ومحدّث.»';
            }
            log.innerHTML += '<div class="bg-slate-900 p-2 rounded-lg text-slate-200"><strong>سند AI:</strong> ' + reply + '</div>';
            inp.value = '';
            log.scrollTop = log.scrollHeight;
        }

        function exportBackup() {
            var data = JSON.stringify({ activeAcct: activeAcct, myAccts: myAccts, contacts: contacts, acctThreads: acctThreads });
            if (navigator.clipboard) navigator.clipboard.writeText(data).then(function() { alert('تم نسخ النسخة الاحتياطية إلى الحافظة.'); });
            else prompt('انسخ بيانات النسخة الاحتياطية:', data);
        }

        function importBackup() {
            var raw = prompt('الصق بيانات النسخة الاحتياطية هنا:');
            if (!raw) return;
            try {
                var parsed = JSON.parse(raw);
                if (parsed.activeAcct) activeAcct = parsed.activeAcct;
                if (Array.isArray(parsed.myAccts)) myAccts = parsed.myAccts;
                if (Array.isArray(parsed.contacts)) contacts = parsed.contacts;
                if (parsed.acctThreads && typeof parsed.acctThreads === 'object') acctThreads = parsed.acctThreads;
                persistAndDraw();
                sendSignalingOrMsg({ type: 'register_ids', ids: myAccts, activeId: activeAcct });
                alert('تمت استعادة النسخة الاحتياطية بنجاح.');
            } catch (e) { alert('صيغة النسخة الاحتياطية غير صحيحة.'); }
        }

        function markCurrentThreadAsRead() {
            var list = getThreadMap()[currentPeer] || [];
            list.forEach(function(m) {
                if (m.from === 'them' && !m.deleted && m.id) {
                    sendSignalingOrMsg({ type: 'msg_read', to: currentPeer, from: activeAcct, msgId: m.id });
                }
            });
        }

        function setPane(p) {
            activePane = p;
            ['chats', 'accounts', 'contacts', 'calls', 'ai'].forEach(function(item) {
                document.getElementById('pane-' + item).classList.add('hidden');
                var btn = document.getElementById('btn-' + item);
                if (btn) btn.className = 'flex flex-col items-center gap-1 text-slate-400 font-semibold text-[10px] px-2 py-1';
            });
            document.getElementById('pane-' + p).classList.remove('hidden');
            var activeBtn = document.getElementById('btn-' + p);
            if (activeBtn) activeBtn.className = 'flex flex-col items-center gap-1 text-blue-400 font-bold text-[10px] px-2 py-1';
            var callInp = document.getElementById('call-input');
            if (p === 'calls' && callInp && !callInp.value.trim()) callInp.value = currentPeer || '';
            if (p === 'chats') { renderMsgs(); markCurrentThreadAsRead(); }
        }

        function choosePeer(id) {
            var clean = String(id || '').trim();
            if (!clean) return;
            currentPeer = clean;
            var callInp = document.getElementById('call-input');
            if (callInp) callInp.value = clean;
            var map = getThreadMap();
            if (!map[currentPeer]) map[currentPeer] = [];
            setPane('chats');
            persistAndDraw();
            markCurrentThreadAsRead();
        }

        function onTopPeerSearchInput() { renderPresence(); }

        function openPeerByInput() {
            var inp = document.getElementById('peer-input');
            var val = inp ? inp.value.trim() : '';
            if (!val) return alert('أدخل اسم جهة اتصال أو كود 8 أرقام أو رقم الجوال.');
            var matches = findContactMatches(val);
            var exact = contacts.find(function(c) {
                return normalizeStr(c.id) === normalizeStr(val) || normalizeStr(c.name) === normalizeStr(val);
            });
            if (inp) inp.value = '';
            if (exact) choosePeer(exact.id);
            else if (matches.length === 1) choosePeer(matches[0].id);
            else choosePeer(val);
        }

        function openFirstMatchedContact() {
            var searchInp = document.getElementById('contact-search-input');
            var val = searchInp ? searchInp.value.trim() : '';
            if (!val) return;
            var matches = findContactMatches(val);
            if (matches.length) choosePeer(matches[0].id);
        }

        function saveCurrentPeer() {
            if (!currentPeer) return;
            var existing = contacts.find(function(c) { return normalizeStr(c.id) === normalizeStr(currentPeer); });
            var defaultName = existing ? existing.name : ('جهة ' + currentPeer);
            var name = prompt('اسم جهة الاتصال للرقم ' + currentPeer + ':', defaultName);
            if (name === null) return;
            upsertContact(name || defaultName, currentPeer);
        }

        function addNewContact() {
            var name = document.getElementById('c-name').value.trim();
            var id = document.getElementById('c-id').value.trim();
            if (!name || !id) return alert('أدخل الاسم والكود أو الرقم.');
            upsertContact(name, id);
            document.getElementById('c-name').value = '';
            document.getElementById('c-id').value = '';
            choosePeer(id);
        }

        function deleteContactById(id) {
            contacts = contacts.filter(function(c) { return normalizeStr(c.id) !== normalizeStr(id); });
            persistAndDraw();
        }

        function shareInviteLink() {
            var msg = 'تواصل معي على سند AI عبر المعرّف: ' + activeAcct + ' على الرابط: ' + location.origin;
            if (navigator.share) navigator.share({ title: 'سند AI', text: msg, url: location.origin }).catch(function() {});
            else if (navigator.clipboard) { navigator.clipboard.writeText(msg); alert('تم نسخ الدعوة: ' + msg); }
            else alert(msg);
        }

        function showGeneratedCodeBanner(code8) {
            lastGeneratedCode = code8;
            var banner = document.getElementById('last-generated-banner');
            var txt = document.getElementById('last-generated-text');
            if (banner && txt) { txt.textContent = 'المعرّف الجديد: ' + code8; banner.classList.remove('hidden'); }
        }

        function make8DigitId() {
            var code8 = Math.floor(10000000 + Math.random() * 90000000).toString();
            if (myAccts.indexOf(code8) === -1) myAccts.push(code8);
            showGeneratedCodeBanner(code8);
            copyStringToClipboard(code8);
            activateAccount(code8);
            alert('تم توليد المعرّف (8 أرقام): ' + code8 + ' وتم نسخه تلقائياً.');
        }

        function addCustomNumberAccount() {
            var num = prompt('أدخل أي رقم أو معرّف إضافي لتفعيله:');
            if (!num || !num.trim()) return;
            var clean = num.trim();
            if (myAccts.indexOf(clean) === -1) myAccts.push(clean);
            activateAccount(clean);
        }

        function verifyPhoneAccount() {
            var ph = prompt('أدخل رقم الجوال الدولي (مثال: +967772302010):');
            if (!ph || !ph.trim()) return;
            var otp = Math.floor(100000 + Math.random() * 900000).toString();
            var code = prompt('كود التفعيل الخاص برقمك هو: ' + otp + '\nأدخل الكود لتأكيد التفعيل:');
            if (!code || code.trim() !== otp) return alert('كود التفعيل غير مطابق.');
            var cleanPh = ph.trim();
            if (myAccts.indexOf(cleanPh) === -1) myAccts.push(cleanPh);
            activateAccount(cleanPh);
        }

        function activateAccount(id) {
            activeAcct = String(id).trim();
            if (myAccts.indexOf(activeAcct) === -1) myAccts.push(activeAcct);
            getThreadMap();
            setPane('chats');
            persistAndDraw();
            sendSignalingOrMsg({ type: 'register_ids', ids: myAccts, activeId: activeAcct });
        }

        function renderPresence() {
            var isOn = onlinePeers.has(currentPeer);
            var matchedPeer = contacts.find(function(c) { return normalizeStr(c.id) === normalizeStr(currentPeer); });
            var dot = document.getElementById('peer-dot');
            var lbl = document.getElementById('peer-status');
            var pTitle = document.getElementById('peer-title');
            if (pTitle) pTitle.textContent = matchedPeer ? (matchedPeer.name + ' • ' + currentPeer) : currentPeer;
            if (dot && lbl) {
                if (isOn) {
                    dot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500';
                    lbl.className = 'text-[11px] font-bold text-emerald-400 whitespace-nowrap';
                    lbl.textContent = 'متصل الآن';
                } else {
                    dot.className = 'w-2.5 h-2.5 rounded-full bg-slate-600';
                    lbl.className = 'text-[11px] font-bold text-slate-400 whitespace-nowrap';
                    lbl.textContent = 'غير متصل';
                }
            }

            var topInp = document.getElementById('peer-input');
            var topVal = topInp ? topInp.value.trim() : '';
            var chipList = findContactMatches(topVal);
            var chips = document.getElementById('quick-chips');
            if (chips) {
                chips.innerHTML = '<span class="text-[11px] text-slate-400 shrink-0">وصول سريع:</span>' + chipList.map(function(c) {
                    var on = onlinePeers.has(c.id);
                    return '<button type="button" onclick="choosePeer(\'' + c.id + '\')" class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] shrink-0 ' +
                        (c.id === currentPeer ? 'bg-blue-600/25 border-blue-500 text-white font-bold' : 'bg-slate-800/80 border-slate-700 text-slate-300') + '">' +
                        '<span class="w-2 h-2 rounded-full ' + (on ? 'bg-emerald-400' : 'bg-slate-500') + '"></span>' +
                        '<span>' + c.name + '</span></button>';
                }).join('');
            }

            var searchInp = document.getElementById('contact-search-input');
            var q = searchInp ? searchInp.value.trim() : '';
            var filtered = findContactMatches(q);
            var onlineCount = filtered.filter(function(c) { return onlinePeers.has(c.id); }).length;
            var summaryBadge = document.getElementById('contacts-summary-badge');
            if (summaryBadge) summaryBadge.textContent = filtered.length + ' جهة (' + onlineCount + ' متصل)';

            var cBox = document.getElementById('contacts-list');
            if (!cBox) return;
            if (!filtered.length) {
                cBox.innerHTML = '<div class="text-center text-xs text-slate-500 py-6">لا توجد نتائج مطابقة للبحث.</div>';
                return;
            }
            cBox.innerHTML = filtered.map(function(c) {
                var on = onlinePeers.has(c.id);
                var subTag = on ? 'متصل الآن' : 'محفوظ';
                return '<div class="bg-slate-900 border border-slate-800 p-3 rounded-xl flex justify-between items-center gap-2">' +
                    '<div class="flex items-center gap-2.5 min-w-0">' +
                    '<span class="w-2.5 h-2.5 rounded-full shrink-0 ' + (on ? 'bg-emerald-500' : 'bg-slate-600') + '"></span>' +
                    '<div class="truncate"><p class="text-xs font-bold text-white truncate">' + c.name + '</p>' +
                    '<p class="text-[11px] font-mono ' + (on ? 'text-emerald-400' : 'text-slate-400') + '">' + c.id + ' • ' + subTag + '</p></div></div>' +
                    '<div class="flex gap-1.5 shrink-0">' +
                    '<button type="button" onclick="launchCall(\'audio\', \'' + c.id + '\')" title="اتصال صوتي" class="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white px-2.5 py-1.5 rounded-lg text-xs"><i class="fa-solid fa-phone"></i></button>' +
                    '<button type="button" onclick="launchCall(\'video\', \'' + c.id + '\')" title="مكالمة فيديو" class="bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white px-2.5 py-1.5 rounded-lg text-xs"><i class="fa-solid fa-video"></i></button>' +
                    '<button type="button" onclick="choosePeer(\'' + c.id + '\')" class="bg-blue-600 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold">مراسلة</button>' +
                    '<button type="button" onclick="deleteContactById(\'' + c.id + '\')" class="bg-red-500/10 text-red-400 px-2 py-1.5 rounded-lg text-xs"><i class="fa-solid fa-trash"></i></button>' +
                    '</div></div>';
            }).join('');
        }

        function buildDeliveryBadge(m) {
            if (m.read || m.status === 'read') return '<span class="text-emerald-300 font-bold">مقروءة</span>';
            if (m.delivered || m.status === 'delivered') return '<span class="text-blue-100 font-semibold">مستلمة</span>';
            if (m.delivered === false) return '<span class="text-amber-200">مرسلة • <button type="button" onclick="retryMessage(\'' + m.id + '\')" class="underline">إعادة إرسال</button></span>';
            return '<span>مرسلة</span>';
        }

        function renderMsgs() {
            var box = document.getElementById('msgs-box');
            if (!box) return;
            var list = getThreadMap()[currentPeer] || [];
            if (!list.length) {
                box.innerHTML = '<div class="text-center text-xs text-slate-500 py-8">ابدأ المراسلة أو أرسل صوتاً أو مرفقاً أو ابدأ مكالمة.</div>';
                return;
            }
            box.innerHTML = list.map(function(m) {
                if (m.deleted) {
                    var delLabel = m.deletedBy === 'all' ? 'تم حذف الرسالة لدى الجميع' : 'تم حذف الرسالة من جهازك';
                    return '<div class="text-center text-[11px] text-slate-500 italic">' + delLabel + '</div>';
                }
                var mine = m.from === 'me';
                var body = '<p class="whitespace-pre-wrap break-words">' + m.text + '</p>';
                if (m.kind === 'audio' && m.mediaUrl) body = '<audio controls preload="metadata" src="' + m.mediaUrl + '" class="max-w-full h-9"></audio>';
                else if (m.kind === 'image' && m.mediaUrl) body = '<img src="' + m.mediaUrl + '" alt="' + (m.fileName || 'صورة') + '" class="max-w-full max-h-56 rounded-xl object-contain"><p class="text-[11px] mt-1">' + m.text + '</p>';
                else if (m.kind === 'file' && m.mediaUrl) body = '<a href="' + m.mediaUrl + '" download="' + (m.fileName || 'file') + '" class="underline flex items-center gap-1.5 text-xs"><i class="fa-solid fa-file-arrow-down"></i><span>' + (m.fileName || m.text) + '</span></a>';
                var speakBtn = (m.kind === 'text' && m.text) ? '<button type="button" onclick="speakText(\'' + String(m.text).replace(/'/g, '') + '\')" class="underline text-blue-100">استماع</button>' : '';
                var deliveryLabel = mine ? buildDeliveryBadge(m) : '<span class="text-emerald-300 font-semibold">مستلمة</span>';
                return '<div class="flex ' + (mine ? 'justify-end' : 'justify-start') + '">' +
                    '<div class="' + (mine ? 'bg-blue-600 text-white rounded-tl-none' : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tr-none') + ' p-3 rounded-2xl max-w-md text-xs md:text-sm shadow space-y-1">' +
                    body +
                    '<div class="flex justify-between items-center gap-3 pt-1 border-t ' + (mine ? 'border-blue-400/30 text-blue-100' : 'border-slate-800 text-slate-400') + ' text-[10px]">' +
                    deliveryLabel +
                    '<div class="flex gap-2">' + speakBtn +
                    '<button type="button" onclick="openDeleteModal(\'' + m.id + '\', ' + (mine ? 'true' : 'false') + ')" class="underline ' + (mine ? 'text-red-100' : 'text-red-400') + '">حذف</button>' +
                    '</div></div></div></div>';
            }).join('');
            box.scrollTop = box.scrollHeight;
        }

        function renderAccts() {
            var badge = document.getElementById('accounts-count-badge');
            if (badge) badge.textContent = myAccts.length + (myAccts.length === 1 ? ' رقم' : ' أرقام');
            var box = document.getElementById('accounts-list');
            if (!box) return;
            box.innerHTML = myAccts.map(function(id) {
                return '<div onclick="activateAccount(\'' + id + '\')" class="bg-slate-950 border ' + (id === activeAcct ? 'border-blue-500' : 'border-slate-800') + ' p-3 rounded-xl flex justify-between items-center cursor-pointer">' +
                    '<span class="text-xs font-mono font-bold text-white">' + id + '</span>' +
                    '<span class="text-[10px] ' + (id === activeAcct ? 'text-emerald-400 font-bold' : 'text-slate-400') + '">' + (id === activeAcct ? 'نشط' : 'تبديل') + '</span></div>';
            }).join('');
        }

        function persistAndDraw() {
            persistState();
            var acctLbl = document.getElementById('active-acct-label');
            if (acctLbl) acctLbl.textContent = activeAcct;
            updateQueueBadge();
            renderPresence();
            renderMsgs();
            renderAccts();
        }

        function runImmediateHandshake() {
            postHttpSync({ type: 'register_ids', ids: myAccts, activeId: activeAcct });
            pollHttpSync();
            openSocket();
        }

        function bootApp() {
            var devBadge = document.getElementById('device-badge');
            if (devBadge) devBadge.textContent = detectDevice();
            loadSavedState();
            persistAndDraw();
            runImmediateHandshake();
            if (!pollTimer) {
                pollTimer = setInterval(function() {
                    pollHttpSync();
                    if (!ws || ws.readyState > 1) openSocket();
                }, 3000);
            }
        }

        document.addEventListener('DOMContentLoaded', bootApp);
        window.addEventListener('load', function() {
            if (!serverReachable && !wsConnected) runImmediateHandshake();
        });
        document.addEventListener('visibilitychange', function() {
            if (!document.hidden) {
                pollHttpSync();
                if (activePane === 'chats') markCurrentThreadAsRead();
            }
        });
        window.addEventListener('online', function() { reconnectNow(); });
    </script>
</body>
</html>`;

const PORT = process.env.PORT || 3000;
const socketsMap = new Map();
const httpPresence = new Map();
const httpInbox = new Map();

function touchHttpPresence(ids) {
    const now = Date.now();
    ids.forEach(id => {
        const clean = String(id).trim();
        if (clean) httpPresence.set(clean, now);
    });
}

function getAllOnlineIds() {
    const now = Date.now();
    const set = new Set();
    socketsMap.forEach((sockSet, id) => {
        if (sockSet && sockSet.size > 0) set.add(id);
    });
    httpPresence.forEach((ts, id) => {
        if (now - ts < 15000) set.add(id);
        else httpPresence.delete(id);
    });
    return Array.from(set);
}

function registerSocketForId(id, ws) {
    let set = socketsMap.get(id);
    if (!set) {
        set = new Set();
        socketsMap.set(id, set);
    }
    set.add(ws);
}

function unregisterSocketForId(id, ws) {
    const set = socketsMap.get(id);
    if (!set) return;
    set.delete(ws);
    if (set.size === 0) socketsMap.delete(id);
}

function sendToIdSockets(toId, payloadStr) {
    const set = socketsMap.get(toId);
    let sent = false;
    if (set && set.size > 0) {
        set.forEach(client => {
            if (client.readyState === 1) {
                client.send(payloadStr);
                sent = true;
            }
        });
    }
    return sent;
}

function enqueueHttpEvent(toId, payload) {
    const clean = String(toId || '').trim();
    if (!clean) return;
    const list = httpInbox.get(clean) || [];
    list.push(payload);
    if (list.length > 80) list.shift();
    httpInbox.set(clean, list);
}

function drainHttpEvents(ids) {
    const out = [];
    ids.forEach(id => {
        const clean = String(id).trim();
        const list = httpInbox.get(clean);
        if (list && list.length) {
            out.push(...list);
            httpInbox.set(clean, []);
        }
    });
    return out;
}

const server = http.createServer((req, res) => {
    const urlObj = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));

    if (urlObj.pathname === '/healthz') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true, onlineIds: getAllOnlineIds() }));
        return;
    }

    if (urlObj.pathname === '/api/sync' && req.method === 'GET') {
        const rawIds = (urlObj.searchParams.get('ids') || '').split(',').map(s => s.trim()).filter(Boolean);
        touchHttpPresence(rawIds);
        const events = drainHttpEvents(rawIds);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ onlineIds: getAllOnlineIds(), events }));
        return;
    }

    if (urlObj.pathname === '/api/sync' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const data = JSON.parse(body || '{}');
                if (data.type === 'register_ids') {
                    const list = Array.isArray(data.ids) ? data.ids : [data.activeId].filter(Boolean);
                    touchHttpPresence(list);
                    broadcastOnline();
                } else if (data.to) {
                    const destId = String(data.to).trim();
                    const deliveredLive = sendToIdSockets(destId, JSON.stringify(data));
                    if (!deliveredLive) enqueueHttpEvent(destId, data);
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
    wss.clients.forEach(c => {
        if (c.readyState === 1) c.send(msg);
    });
}

wss.on('connection', (ws) => {
    let registeredIds = [];

    ws.on('message', (raw) => {
        let data;
        try { data = JSON.parse(raw.toString()); } catch (e) { return; }

        if (data.type === 'register_ids') {
            registeredIds.forEach(old => unregisterSocketForId(old, ws));
            const list = Array.isArray(data.ids) ? data.ids : [data.activeId].filter(Boolean);
            registeredIds = list.map(x => String(x).trim()).filter(Boolean);
            registeredIds.forEach(id => registerSocketForId(id, ws));
            touchHttpPresence(registeredIds);
            broadcastOnline();
            return;
        }

        if (data.to) {
            const destId = String(data.to).trim();
            const deliveredLive = sendToIdSockets(destId, JSON.stringify(data));
            if (!deliveredLive) enqueueHttpEvent(destId, data);
        }
    });

    ws.on('close', () => {
        registeredIds.forEach(id => unregisterSocketForId(id, ws));
        broadcastOnline();
    });
});

server.listen(PORT, () => {
    console.log('Sanad AI v8.0 running on port ' + PORT);
});
