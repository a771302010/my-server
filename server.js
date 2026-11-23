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
    <title>سند AI v8.6</title>
    <link rel="icon" type="image/svg+xml" href="${sanadIconUri}">
    <link rel="apple-touch-icon" sizes="180x180" href="${sanadIconUri}">
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
        body {
            font-family: 'Cairo', sans-serif;
            background: radial-gradient(circle at top, #0d1b36 0%, #050912 58%, #03060c 100%);
        }
        .glass-panel {
            background: rgba(15, 23, 42, 0.78);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
        }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #2563eb; border-radius: 9999px; }
        .privacy-blur { filter: blur(6px); user-select: none; cursor: pointer; transition: filter 0.2s ease; }
        .privacy-blur:hover, .privacy-blur.revealed { filter: none; user-select: auto; }
        .pane-enter { animation: paneFadeIn 0.14s ease-out; }
        @keyframes paneFadeIn {
            from { opacity: 0.45; transform: translateY(3px); }
            to { opacity: 1; transform: translateY(0); }
        }
    </style>
</head>
<body class="text-slate-100 h-[100dvh] flex flex-col overflow-hidden select-none">

    <audio id="remote-audio-el" autoplay playsinline class="hidden"></audio>

    <header class="glass-panel border-b border-slate-800/80 px-3.5 py-2.5 flex justify-between items-center z-20 shrink-0 shadow-lg">
        <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 via-blue-700 to-blue-950 border border-blue-400/40 flex flex-col items-center justify-center shrink-0 shadow-md shadow-blue-950/70">
                <span class="text-white font-black text-lg leading-none">S</span>
                <i class="fa-solid fa-hands-holding-child text-[9px] text-blue-200 mt-0.5"></i>
            </div>
            <div class="min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                    <h1 class="font-black text-base text-white leading-none tracking-tight">سند</h1>
                    <span class="text-[10px] bg-blue-500/20 text-blue-200 border border-blue-400/30 px-2 py-0.5 rounded-full font-bold">AI v8.6</span>
                    <span id="device-badge" class="text-[10px] bg-slate-800/90 text-slate-300 border border-slate-700/70 px-2 py-0.5 rounded-full font-semibold">جهاز</span>
                    <span id="net-badge" class="text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-700/40 px-2 py-0.5 rounded-full font-bold">وضع مرن</span>
                </div>
                <div class="flex items-center gap-1.5 text-[11px] mt-1">
                    <span id="ws-dot" class="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span id="ws-label" class="text-emerald-400 font-semibold">متصل</span>
                    <button type="button" onclick="reconnectNow()" title="تحديث الربط" class="text-blue-400 hover:text-blue-300 px-1 transition">
                        <i class="fa-solid fa-rotate-right text-[10px]"></i>
                    </button>
                    <span id="queue-badge" class="hidden text-[10px] bg-amber-500/20 text-amber-300 px-1.5 rounded font-mono">0 معلّق</span>
                    <span class="text-slate-600">•</span>
                    <span id="active-acct-label" class="font-mono font-bold text-blue-300"></span>
                </div>
            </div>
        </div>

        <div class="flex items-center gap-1.5 shrink-0">
            <button type="button" id="privacy-shield-btn" onclick="togglePrivacyShield()" title="وضع الخصوصية السريعة" class="w-9 h-9 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 text-amber-300 flex items-center justify-center transition">
                <i id="privacy-shield-icon" class="fa-solid fa-eye text-xs"></i>
            </button>
            <button type="button" onclick="launchCall('audio')" title="مكالمة صوتية" class="w-9 h-9 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/40 text-emerald-300 hover:text-white flex items-center justify-center transition">
                <i class="fa-solid fa-phone text-xs"></i>
            </button>
            <button type="button" onclick="launchCall('video')" title="مكالمة فيديو" class="w-9 h-9 rounded-xl bg-blue-600/20 hover:bg-blue-600 border border-blue-500/40 text-blue-300 hover:text-white flex items-center justify-center transition">
                <i class="fa-solid fa-video text-xs"></i>
            </button>
        </div>
    </header>

    <div id="live-toast" onclick="jumpToToastChat()" class="hidden fixed top-16 left-3 right-3 max-w-md mx-auto bg-blue-950/95 border border-blue-400/50 text-white px-3.5 py-2.5 rounded-2xl shadow-2xl z-40 flex items-center justify-between gap-2 cursor-pointer text-xs">
        <div class="min-w-0">
            <p id="toast-sender" class="font-black text-blue-200 truncate">رسالة جديدة</p>
            <p id="toast-body" class="text-slate-100 truncate">...</p>
        </div>
        <span class="bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded-lg text-[10px] font-bold shrink-0">فتح</span>
    </div>

    <div id="memory-vault-modal" class="hidden fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-4 space-y-3 shadow-2xl max-h-[82vh] flex flex-col">
            <div class="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 class="text-sm font-black text-cyan-300"><i class="fa-solid fa-vault ml-1"></i> صندوق الذاكرة الذكية للمحادثة</h3>
                <button type="button" onclick="closeMemoryVault()" class="text-slate-400 hover:text-white"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div id="memory-vault-content" class="flex-1 overflow-y-auto space-y-3 text-xs custom-scrollbar"></div>
        </div>
    </div>

    <div id="call-modal" class="hidden fixed inset-0 bg-slate-950/95 z-50 flex flex-col items-center justify-between p-4">
        <div class="text-center mt-1">
            <p class="text-xs text-blue-400 font-bold">سند AI v8.6 • اتصال مباشر</p>
            <h2 id="call-peer-title" class="text-lg font-black text-white font-mono mt-0.5">...</h2>
            <p id="call-timer-el" class="text-xs font-mono font-bold text-slate-300 mt-0.5">00:00</p>
            <p id="call-status-msg" class="text-xs text-emerald-400 mt-0.5 font-semibold">جاري الاتصال...</p>
            <p id="call-output-hint" class="text-[10px] text-slate-400 mt-0.5">مخرج الصوت: مكبر الصوت</p>
        </div>

        <div class="relative w-full max-w-sm flex-1 my-2.5 max-h-[64vh] aspect-[9/16] bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden flex items-center justify-center shadow-2xl">
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

        <div class="flex items-center gap-2 mb-2 flex-wrap justify-center">
            <button type="button" id="accept-btn" onclick="answerCall()" class="hidden bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-2xl font-bold text-xs shadow-lg animate-bounce">
                <i class="fa-solid fa-phone ml-1"></i> رد الآن
            </button>
            <button type="button" id="speaker-toggle-btn" onclick="toggleSpeakerOrEarpiece()" title="تبديل مكبر الصوت / سماعة الجهاز" class="px-3 h-11 rounded-2xl bg-blue-600/25 border border-blue-400/40 text-blue-200 flex items-center gap-1.5 text-[11px] font-bold">
                <i id="speaker-toggle-icon" class="fa-solid fa-volume-high"></i>
                <span id="speaker-btn-label">مكبر</span>
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

    <div id="delete-modal" class="hidden fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xs p-4 space-y-3 shadow-2xl">
            <h3 class="text-sm font-black text-white">خيارات حذف الرسالة</h3>
            <p class="text-[11px] text-slate-400">اختر ما إذا كنت تريد حذف الرسالة من جهازك فقط أو من عند الجميع.</p>
            <button type="button" onclick="confirmDeleteChoice('me')" class="w-full bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-xl text-xs font-bold">حذف من عندي فقط</button>
            <button type="button" id="del-everyone-btn" onclick="confirmDeleteChoice('all')" class="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-xs font-bold">حذف عند الجميع</button>
            <button type="button" onclick="closeDeleteModal()" class="w-full text-slate-400 hover:text-white py-1.5 text-xs">إلغاء</button>
        </div>
    </div>

    <main class="flex-1 flex flex-col overflow-hidden bg-transparent">
        <section id="pane-chats" class="flex-1 flex flex-col h-full overflow-hidden pane-enter">
            <div class="p-2.5 bg-slate-900/75 border-b border-slate-800/80 space-y-2 shrink-0">
                <div class="flex gap-2">
                    <input type="text" id="peer-input" oninput="onTopPeerSearchInput()" onkeydown="if(event.key==='Enter'){event.preventDefault();openPeerByInput();}" placeholder="اكتب الاسم أو الكود أو الرقم ليظهر تلقائياً..." class="flex-1 bg-slate-950/90 border border-slate-800 rounded-xl px-3 py-2 text-xs md:text-sm text-white focus:outline-none focus:border-blue-500 transition">
                    <button type="button" onclick="openPeerByInput()" class="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm">فتح</button>
                    <button type="button" onclick="saveCurrentPeer()" title="حفظ في الجهات" class="bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 text-emerald-400 px-3 py-2 rounded-xl text-xs font-bold transition">
                        <i class="fa-solid fa-user-plus"></i>
                    </button>
                </div>
                <div id="quick-chips" class="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs"></div>
            </div>

            <div class="px-4 py-2 bg-slate-950/75 border-b border-slate-800/80 flex justify-between items-center text-xs shrink-0">
                <div class="flex items-center gap-2 min-w-0">
                    <span id="peer-dot" class="w-2.5 h-2.5 rounded-full bg-slate-600 shrink-0"></span>
                    <span id="peer-title" class="font-bold text-white font-mono truncate">خدمة العملاء</span>
                    <span id="peer-status" class="text-[11px] font-bold text-slate-400 shrink-0 whitespace-nowrap">غير متصل</span>
                </div>
                <div class="flex items-center gap-2.5 shrink-0">
                    <button type="button" onclick="openMemoryVault()" title="صندوق الذاكرة الذكية" class="text-cyan-400 hover:text-cyan-300 font-bold transition"><i class="fa-solid fa-vault"></i></button>
                    <button type="button" onclick="createQuickDecisionPoll()" title="استفتاء قرار سريع" class="text-emerald-400 hover:text-emerald-300 font-bold transition"><i class="fa-solid fa-square-poll-vertical"></i></button>
                    <button type="button" onclick="toggleThreadSearchBar()" title="بحث داخل رسائل المحادثة" class="text-amber-400 hover:text-amber-300 font-bold transition"><i class="fa-solid fa-magnifying-glass"></i></button>
                    <button type="button" onclick="summarizeCurrentThread()" class="text-indigo-400 hover:text-indigo-300 font-semibold transition"><i class="fa-solid fa-sparkles ml-1"></i>تلخيص</button>
                    <button type="button" onclick="shareInviteLink()" class="text-sky-400 hover:text-sky-300 font-semibold transition"><i class="fa-solid fa-share-nodes ml-1"></i>دعوة</button>
                    <button type="button" onclick="clearThreadMsgs()" class="text-red-400 hover:text-red-300 font-semibold transition"><i class="fa-solid fa-trash ml-1"></i>مسح</button>
                </div>
            </div>

            <div id="pinned-msg-banner" class="hidden px-3.5 py-1.5 bg-amber-950/45 border-b border-amber-700/40 flex items-center justify-between gap-2 text-[11px] shrink-0">
                <div class="flex items-center gap-1.5 min-w-0">
                    <i class="fa-solid fa-thumbtack text-amber-400 shrink-0"></i>
                    <span id="pinned-msg-text" class="text-amber-100 truncate"></span>
                </div>
                <button type="button" onclick="unpinCurrentThreadMsg()" class="text-amber-300 hover:text-white text-[10px] shrink-0">إلغاء التثبيت</button>
            </div>

            <div id="thread-search-bar" class="hidden px-3 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center gap-2 text-xs shrink-0">
                <i class="fa-solid fa-magnifying-glass text-amber-400"></i>
                <input type="text" id="thread-search-input" oninput="renderMsgs()" placeholder="ابحث داخل رسائل هذه المحادثة..." class="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500">
                <span id="thread-search-count" class="text-[10px] font-mono text-amber-300 shrink-0">0 نتيجة</span>
                <button type="button" onclick="closeThreadSearchBar()" class="text-slate-400 hover:text-white px-1.5"><i class="fa-solid fa-xmark"></i></button>
            </div>

            <div id="msgs-box" class="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar"></div>

            <div id="smart-replies-bar" class="hidden px-3 py-1.5 bg-slate-950/90 border-t border-slate-800/70 flex items-center gap-1.5 overflow-x-auto text-[11px] shrink-0"></div>

            <div class="px-3 py-1.5 bg-slate-950/80 border-t border-slate-800/70 flex items-center gap-1.5 text-[10px] shrink-0 overflow-x-auto">
                <span class="text-indigo-300 font-bold shrink-0"><i class="fa-solid fa-wand-magic-sparkles"></i> أدوات ذكية:</span>
                <button type="button" onclick="polishDraft('friendly')" class="bg-slate-800/90 hover:bg-slate-700 text-slate-200 px-2 py-0.5 rounded-md shrink-0 transition">ودي</button>
                <button type="button" onclick="polishDraft('formal')" class="bg-slate-800/90 hover:bg-slate-700 text-slate-200 px-2 py-0.5 rounded-md shrink-0 transition">رسمي</button>
                <button type="button" onclick="polishDraft('short')" class="bg-slate-800/90 hover:bg-slate-700 text-slate-200 px-2 py-0.5 rounded-md shrink-0 transition">مختصر</button>
                <button type="button" onclick="insertSanadMention()" class="bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-400/40 text-indigo-200 px-2 py-0.5 rounded-md font-bold shrink-0 transition">@سند</button>
                <button type="button" onclick="sendSmartFollowUp()" class="bg-amber-600/25 hover:bg-amber-600/40 border border-amber-400/40 text-amber-200 px-2 py-0.5 rounded-md font-bold shrink-0 transition">متابعة</button>
            </div>

            <div class="p-2.5 bg-slate-900/90 border-t border-slate-800/80 flex items-center gap-1.5 shrink-0">
                <input type="file" id="attach-file" class="hidden" onchange="onFilePicked(event)">
                <button type="button" onclick="document.getElementById('attach-file').click()" title="إرفاق ملف أو صورة" class="text-amber-400 hover:text-amber-300 p-2 rounded-xl hover:bg-slate-800 transition">
                    <i class="fa-solid fa-paperclip text-base"></i>
                </button>
                <button type="button" id="dictate-btn" onclick="toggleSpeechDictation()" title="إملاء صوتي" class="text-cyan-400 hover:text-cyan-300 p-2 rounded-xl hover:bg-slate-800 transition">
                    <i class="fa-solid fa-language text-base"></i>
                </button>
                <button type="button" onclick="polishDraft('friendly')" title="تحسين الصياغة" class="text-indigo-400 hover:text-indigo-300 p-2 rounded-xl hover:bg-slate-800 transition">
                    <i class="fa-solid fa-wand-magic-sparkles text-base"></i>
                </button>
                <input type="text" id="msg-box-input" onkeydown="if(event.key==='Enter'){event.preventDefault();sendTextMsg();}" placeholder="اكتب رسالتك أو استخدم @سند..." class="flex-1 bg-slate-950/90 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition">
                <span id="rec-timer" class="hidden text-[11px] font-mono font-bold text-red-400 px-1">00:00</span>
                <button type="button" id="voice-btn" onclick="toggleVoiceCapture()" title="تسجيل رسالة صوتية" class="bg-slate-800 hover:bg-emerald-600 text-emerald-400 hover:text-white p-2.5 rounded-xl transition">
                    <i class="fa-solid fa-microphone text-base"></i>
                </button>
                <button type="button" onclick="sendTextMsg()" class="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition shadow-md shadow-blue-950/60">
                    <i class="fa-solid fa-paper-plane"></i>
                </button>
            </div>
        </section>

        <section id="pane-groups" class="hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-3 pane-enter">
            <div class="bg-slate-900/85 border border-slate-800/80 p-4 rounded-2xl space-y-3 shadow-lg">
                <div class="flex items-center justify-between">
                    <h2 class="text-sm font-black text-cyan-400"><i class="fa-solid fa-users ml-1"></i> مجموعات التواصل</h2>
                    <span id="groups-count-badge" class="text-[11px] font-mono text-cyan-300 bg-cyan-950/60 px-2.5 py-0.5 rounded-full">0 مجموعة</span>
                </div>
                <p class="text-[11px] text-slate-400 leading-relaxed">
                    أنشئ مجموعة جديدة واختر الأعضاء من الجهات أو أدخل أرقاماً/معرّفات مفصولة بفاصلة، وتواصل داخلها بمساعدة <span class="text-indigo-300 font-bold">@سند</span>.
                </p>
                <div class="space-y-2">
                    <input type="text" id="g-name" placeholder="اسم المجموعة (مثال: فريق العمل أو العائلة)" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                    <input type="text" id="g-members" placeholder="أعضاء إضافيون (أرقام أو معرّفات مفصولة بفاصلة)" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono">
                    <div id="g-contact-picker" class="flex flex-wrap gap-1.5"></div>
                    <button type="button" onclick="createSanadGroup()" class="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition">+ إنشاء مجموعة</button>
                </div>
            </div>
            <div id="groups-list" class="space-y-2"></div>
        </section>

        <section id="pane-accounts" class="hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-4 pane-enter">
            <div class="bg-slate-900/85 border border-slate-800/80 p-4 rounded-2xl space-y-3 shadow-lg">
                <div class="flex items-center justify-between">
                    <h2 class="text-sm font-black text-blue-400">إدارة الحسابات والمعرّفات</h2>
                    <span id="accounts-count-badge" class="text-[11px] font-mono text-blue-300 bg-blue-950/60 px-2.5 py-0.5 rounded-full">1 حساب</span>
                </div>
                <p class="text-[11px] text-slate-400 leading-relaxed">
                    ولّد معرّفاً جديداً أو أضف رقمك أو معرّفك الخاص وبدّل بين الحسابات بسهولة.
                </p>
                <div class="flex flex-wrap gap-2">
                    <button type="button" onclick="make8DigitId()" class="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition">+ توليد معرّف (8 أرقام)</button>
                    <button type="button" onclick="addCustomNumberAccount()" class="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition">+ إضافة رقم/معرّف</button>
                    <button type="button" onclick="verifyPhoneAccount()" class="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition">+ تفعيل رقم جوال</button>
                </div>
                <div id="last-generated-banner" class="hidden bg-emerald-950/50 border border-emerald-700/50 rounded-xl p-2.5 flex items-center justify-between text-xs">
                    <span id="last-generated-text" class="font-mono font-bold text-emerald-300"></span>
                    <button type="button" onclick="copyStringToClipboard(lastGeneratedCode)" class="bg-emerald-600 text-white px-3 py-1 rounded-lg text-[11px] font-bold">نسخ</button>
                </div>
                <div id="accounts-list" class="space-y-2 pt-2"></div>
            </div>
        </section>

        <section id="pane-contacts" class="hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-3 pane-enter">
            <div class="bg-slate-900/85 border border-slate-800/80 p-3.5 rounded-2xl space-y-2.5 shadow-lg">
                <div class="flex items-center justify-between">
                    <h2 class="text-sm font-black text-emerald-400">جهات الاتصال</h2>
                    <button type="button" onclick="scanNumbersForSanad()" class="bg-blue-600/20 hover:bg-blue-600 border border-blue-500/40 text-blue-300 hover:text-white px-3 py-1 rounded-lg text-[11px] font-bold transition">
                        <i class="fa-solid fa-user-check ml-1"></i>فحص أرقام
                    </button>
                </div>
                <div class="flex flex-col sm:flex-row gap-2">
                    <input type="text" id="c-name" onkeydown="if(event.key==='Enter')addNewContact()" placeholder="الاسم" class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                    <input type="text" id="c-id" onkeydown="if(event.key==='Enter')addNewContact()" placeholder="معرّف 8 أرقام أو رقم الجوال" class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono">
                    <button type="button" onclick="addNewContact()" class="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition">حفظ</button>
                </div>
            </div>
            <div class="bg-slate-900/85 border border-slate-800/80 p-2.5 rounded-xl flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 flex-1 min-w-0">
                    <i class="fa-solid fa-magnifying-glass text-slate-400 text-xs pr-1"></i>
                    <input type="text" id="contact-search-input" oninput="renderPresence()" onkeydown="if(event.key==='Enter')openFirstMatchedContact()" placeholder="بحث بالاسم أو الكود أو الرقم..." class="flex-1 bg-transparent text-xs text-white focus:outline-none">
                </div>
                <span id="contacts-summary-badge" class="text-[10px] font-mono text-slate-400 shrink-0">0 جهة</span>
            </div>
            <div id="contacts-list" class="space-y-2"></div>
        </section>

        <section id="pane-calls" class="hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-4 pane-enter">
            <div class="bg-slate-900/85 border border-slate-800/80 p-4 rounded-2xl space-y-3 text-center shadow-lg">
                <div class="w-14 h-14 mx-auto rounded-2xl bg-blue-600/15 border border-blue-500/30 text-blue-400 flex items-center justify-center text-2xl">
                    <i class="fa-solid fa-phone-volume"></i>
                </div>
                <div>
                    <h2 class="text-base font-black text-white">المكالمات الصوتية والمرئية</h2>
                    <p class="text-xs text-slate-400 mt-1">اكتب الاسم أو الرقم أو المعرّف وسيظهر فوراً من الجهات المخزّنة تلقائياً.</p>
                </div>
                <input type="text" id="call-input" oninput="onCallDialInput()" onkeydown="if(event.key==='Enter'){event.preventDefault();startDialedCall('audio');}" placeholder="اكتب الاسم أو الرقم أو المعرّف..." class="w-full max-w-md mx-auto bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-center font-mono text-white">
                <div id="call-resolved-preview" class="text-[11px] text-emerald-300 font-semibold min-h-[18px]"></div>
                <div id="call-contact-suggestions" class="flex flex-wrap justify-center gap-1.5 max-w-md mx-auto"></div>
                <div class="flex gap-3 justify-center pt-1">
                    <button type="button" onclick="startDialedCall('audio')" class="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition">
                        <i class="fa-solid fa-phone"></i> مكالمة صوتية
                    </button>
                    <button type="button" onclick="startDialedCall('video')" class="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition">
                        <i class="fa-solid fa-video"></i> مكالمة فيديو
                    </button>
                </div>
            </div>
        </section>

        <section id="pane-ai" class="hidden flex-1 flex-col p-4 overflow-y-auto custom-scrollbar space-y-3 pane-enter">
            <div class="bg-slate-900/85 border border-slate-800/80 p-4 rounded-2xl space-y-2.5 shadow-lg">
                <div class="flex items-center justify-between">
                    <h2 class="text-sm font-black text-indigo-400"><i class="fa-solid fa-brain ml-1"></i> مساعد سند AI ومركز المهام</h2>
                    <span id="smart-tasks-count" class="text-[10px] font-mono bg-emerald-950/70 text-emerald-300 border border-emerald-700/40 px-2 py-0.5 rounded-full">0 مهام</span>
                </div>
                <div class="flex items-center justify-between bg-slate-950/90 p-3 rounded-xl border border-slate-800 text-xs">
                    <span>وضع توفير البيانات للشبكات الضعيفة</span>
                    <input type="checkbox" id="chk-weaknet" checked onchange="updateNetBadge()" class="w-4 h-4 accent-emerald-600">
                </div>
                <div class="flex items-center justify-between bg-slate-950/90 p-3 rounded-xl border border-slate-800 text-xs">
                    <span>الرد التلقائي الذكي عند استلام رسالة</span>
                    <input type="checkbox" id="chk-autoreply" class="w-4 h-4 accent-indigo-600">
                </div>
                <div class="flex items-center justify-between bg-slate-950/90 p-3 rounded-xl border border-slate-800 text-xs">
                    <span>نغمة التنبيه والرنين</span>
                    <input type="checkbox" id="chk-chime" checked class="w-4 h-4 accent-blue-600">
                </div>
                <div id="smart-tasks-panel" class="bg-slate-950/90 border border-slate-800 rounded-xl p-2.5 space-y-1.5 max-h-32 overflow-y-auto text-xs custom-scrollbar"></div>
                <div class="grid grid-cols-2 gap-2 pt-1">
                    <button type="button" onclick="extractTasksFromThread()" class="bg-indigo-600/20 hover:bg-indigo-600/35 border border-indigo-500/30 text-indigo-200 py-2 rounded-xl text-xs font-bold transition"><i class="fa-solid fa-list-check ml-1"></i>استخراج مهام</button>
                    <button type="button" onclick="suggestSmartReplies()" class="bg-blue-600/20 hover:bg-blue-600/35 border border-blue-500/30 text-blue-200 py-2 rounded-xl text-xs font-bold transition"><i class="fa-solid fa-bolt ml-1"></i>ردود ذكية</button>
                </div>
                <div class="flex gap-2">
                    <button type="button" onclick="exportBackup()" class="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 rounded-xl text-xs font-bold transition"><i class="fa-solid fa-download ml-1"></i>تصدير نسخة</button>
                    <button type="button" onclick="importBackup()" class="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 rounded-xl text-xs font-bold transition"><i class="fa-solid fa-upload ml-1"></i>استعادة نسخة</button>
                </div>
                <div id="ai-log" class="bg-slate-950/90 border border-slate-800 rounded-xl p-3 h-32 overflow-y-auto text-xs space-y-2 custom-scrollbar">
                    <div class="text-slate-400">مرحباً بك في سند AI v8.6 — سرعة انتقال فورية وتصميم محسن للعين.</div>
                </div>
                <div class="flex gap-2">
                    <input type="text" id="ai-q" onkeydown="if(event.key==='Enter')askSanadAI()" placeholder="اسأل سند AI..." class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white">
                    <button type="button" onclick="askSanadAI()" class="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition">إرسال</button>
                </div>
            </div>
        </section>
    </main>

    <nav class="glass-panel border-t border-slate-800/80 px-1 py-2 flex justify-around items-center z-20 shrink-0">
        <button type="button" onclick="setPane('chats')" id="btn-chats" class="flex flex-col items-center gap-1 text-blue-400 font-bold text-[10px] px-1.5 py-1 transition">
            <i class="fa-solid fa-comments text-base"></i>
            <span>الدردشة</span>
        </button>
        <button type="button" onclick="setPane('groups')" id="btn-groups" class="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-200 font-semibold text-[10px] px-1.5 py-1 transition">
            <i class="fa-solid fa-users text-base"></i>
            <span>المجموعات</span>
        </button>
        <button type="button" onclick="setPane('accounts')" id="btn-accounts" class="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-200 font-semibold text-[10px] px-1.5 py-1 transition">
            <i class="fa-solid fa-id-card text-base"></i>
            <span>الحسابات</span>
        </button>
        <button type="button" onclick="setPane('contacts')" id="btn-contacts" class="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-200 font-semibold text-[10px] px-1.5 py-1 transition">
            <i class="fa-solid fa-address-book text-base"></i>
            <span>الجهات</span>
        </button>
        <button type="button" onclick="setPane('calls')" id="btn-calls" class="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-200 font-semibold text-[10px] px-1.5 py-1 transition">
            <i class="fa-solid fa-phone-volume text-base"></i>
            <span>المكالمات</span>
        </button>
        <button type="button" onclick="setPane('ai')" id="btn-ai" class="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-200 font-semibold text-[10px] px-1.5 py-1 transition">
            <i class="fa-solid fa-brain text-base"></i>
            <span>الذكاء</span>
        </button>
    </nav>

    <script>
        var DEFAULT_PEER = 'خدمة العملاء';
        var activeAcct = 'مستخدم-سند';
        var myAccts = ['مستخدم-سند'];
        var contacts = [{ name: DEFAULT_PEER, id: DEFAULT_PEER }];
        var sanadGroups = [];
        var selectedGroupMembers = new Set();
        var pinnedByThread = {};
        var smartTasks = [];
        var privacyShieldOn = false;
        var currentPeer = DEFAULT_PEER;
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
        var callDurationTimer = null;
        var callSeconds = 0;
        var speakerModeActive = true;
        var ws = null;
        var wsConnected = false;
        var serverReachable = true;

        function setHeaderStatus(text, isOnline) {
            var dot = document.getElementById('ws-dot');
            var lbl = document.getElementById('ws-label');
            if (dot) dot.className = isOnline ? 'w-2 h-2 rounded-full bg-emerald-500' : 'w-2 h-2 rounded-full bg-amber-400';
            if (lbl) {
                lbl.className = isOnline ? 'text-emerald-400 font-semibold' : 'text-amber-300 font-semibold';
                lbl.textContent = text;
            }
            updateQueueBadge();
        }

        function updateNetBadge() {
            var badge = document.getElementById('net-badge');
            if (!badge) return;
            var chk = document.getElementById('chk-weaknet');
            var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            var eff = (conn && conn.effectiveType) ? String(conn.effectiveType).toUpperCase() : '';
            if (chk && chk.checked) {
                badge.textContent = eff ? ('توفير • ' + eff) : 'توفير ذكي';
                badge.className = 'text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-700/40 px-2 py-0.5 rounded-full font-bold';
            } else {
                badge.textContent = eff ? ('سريع • ' + eff) : 'أداء سريع';
                badge.className = 'text-[10px] bg-blue-950/80 text-blue-300 border border-blue-700/40 px-2 py-0.5 rounded-full font-bold';
            }
        }

        function loadSavedState() {
            try {
                var savedActive = localStorage.getItem('sanad86_active') || localStorage.getItem('sanad85_active') || localStorage.getItem('sanad84_active') || localStorage.getItem('sanad83_active');
                var savedAccts = JSON.parse(localStorage.getItem('sanad86_accts') || localStorage.getItem('sanad85_accts') || localStorage.getItem('sanad84_accts') || localStorage.getItem('sanad83_accts') || 'null');
                var savedContacts = JSON.parse(localStorage.getItem('sanad86_contacts') || localStorage.getItem('sanad85_contacts') || localStorage.getItem('sanad84_contacts') || localStorage.getItem('sanad83_contacts') || 'null');
                var savedThreads = JSON.parse(localStorage.getItem('sanad86_threads') || localStorage.getItem('sanad85_threads') || localStorage.getItem('sanad84_threads') || localStorage.getItem('sanad83_threads') || 'null');
                var savedGroups = JSON.parse(localStorage.getItem('sanad86_groups') || localStorage.getItem('sanad85_groups') || localStorage.getItem('sanad84_groups') || 'null');
                var savedPins = JSON.parse(localStorage.getItem('sanad86_pins') || localStorage.getItem('sanad85_pins') || localStorage.getItem('sanad84_pins') || 'null');
                var savedTasks = JSON.parse(localStorage.getItem('sanad86_tasks') || localStorage.getItem('sanad85_tasks') || 'null');
                if (savedActive && savedActive !== '88888888') activeAcct = String(savedActive);
                if (Array.isArray(savedAccts) && savedAccts.length) {
                    myAccts = savedAccts.filter(function(x) { return String(x).trim() !== '88888888'; });
                    if (!myAccts.length) myAccts = [activeAcct];
                }
                if (myAccts.indexOf(activeAcct) === -1) myAccts.unshift(activeAcct);
                if (Array.isArray(savedContacts) && savedContacts.length) {
                    contacts = savedContacts.map(function(c) {
                        if (String(c.id).trim() === '88888888') return { name: DEFAULT_PEER, id: DEFAULT_PEER };
                        return c;
                    });
                }
                if (!contacts.some(function(c) { return c.id === DEFAULT_PEER; })) {
                    contacts.unshift({ name: DEFAULT_PEER, id: DEFAULT_PEER });
                }
                if (savedThreads && typeof savedThreads === 'object') acctThreads = savedThreads;
                if (Array.isArray(savedGroups)) sanadGroups = savedGroups;
                if (savedPins && typeof savedPins === 'object') pinnedByThread = savedPins;
                if (Array.isArray(savedTasks)) smartTasks = savedTasks;
            } catch (e) {}
        }

        function persistState() {
            try {
                localStorage.setItem('sanad86_active', activeAcct);
                localStorage.setItem('sanad86_accts', JSON.stringify(myAccts));
                localStorage.setItem('sanad86_contacts', JSON.stringify(contacts));
                localStorage.setItem('sanad86_threads', JSON.stringify(acctThreads));
                localStorage.setItem('sanad86_groups', JSON.stringify(sanadGroups));
                localStorage.setItem('sanad86_pins', JSON.stringify(pinnedByThread));
                localStorage.setItem('sanad86_tasks', JSON.stringify(smartTasks));
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
            return Boolean(chk && chk.checked);
        }

        function togglePrivacyShield() {
            privacyShieldOn = !privacyShieldOn;
            var btn = document.getElementById('privacy-shield-btn');
            var icon = document.getElementById('privacy-shield-icon');
            if (btn) {
                btn.className = privacyShieldOn
                    ? 'w-9 h-9 rounded-xl bg-amber-500/25 border border-amber-400 text-amber-200 flex items-center justify-center transition'
                    : 'w-9 h-9 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 text-amber-300 flex items-center justify-center transition';
            }
            if (icon) icon.className = privacyShieldOn ? 'fa-solid fa-eye-slash text-xs' : 'fa-solid fa-eye text-xs';
            renderMsgs();
        }

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

        function normalizeStr(v) { return String(v || '').trim().toLowerCase(); }

        function findGroupById(id) {
            return sanadGroups.find(function(g) { return normalizeStr(g.id) === normalizeStr(id); }) || null;
        }

        function resolveContactByQuery(rawQuery) {
            var q = normalizeStr(rawQuery);
            if (!q) return null;
            var grp = findGroupById(rawQuery);
            if (grp) return { id: grp.id, name: grp.name, isGroup: true };
            var exact = contacts.find(function(c) {
                return normalizeStr(c.id) === q || normalizeStr(c.name) === q;
            });
            if (exact) return exact;
            return contacts.find(function(c) {
                return normalizeStr(c.name).indexOf(q) !== -1 || normalizeStr(c.id).indexOf(q) !== -1;
            }) || null;
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
            var existingIdx = contacts.findIndex(function(c) { return normalizeStr(c.id) === normalizeStr(cleanId); });
            if (existingIdx !== -1) contacts[existingIdx] = { name: cleanName, id: cleanId };
            else contacts.push({ name: cleanName, id: cleanId });
            persistAndDraw();
            return contacts.find(function(c) { return normalizeStr(c.id) === normalizeStr(cleanId); });
        }

        function scanNumbersForSanad() {
            var sample = contacts.filter(function(c) { return c.id !== DEFAULT_PEER; }).map(function(c) { return c.id; }).join(', ');
            var raw = prompt('ألصق أرقاماً أو معرّفات (مفصولة بفاصلة أو سطر) لفحص المشتركين/المتصلين:', sample);
            if (raw === null) return;
            var tokens = raw.split(/[\\s,،\\n]+/).map(function(x) { return x.trim(); }).filter(Boolean);
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
            if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).catch(function() {});
        }

        function getThreadMap() {
            if (!acctThreads[activeAcct]) acctThreads[activeAcct] = {};
            if (!acctThreads[activeAcct][DEFAULT_PEER]) {
                acctThreads[activeAcct][DEFAULT_PEER] = [
                    { id: 'init-' + activeAcct, from: 'them', kind: 'text', text: 'مرحباً بك في سند AI v8.6، كيف نقدر نخدمك اليوم؟' }
                ];
            }
            return acctThreads[activeAcct];
        }

        function addSmartTask(title, peerRef) {
            var cleanTitle = String(title || '').trim();
            if (!cleanTitle) return;
            smartTasks.unshift({
                id: 'tsk-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
                title: cleanTitle,
                peer: peerRef || currentPeer,
                done: false
            });
            persistState();
            if (activePane === 'ai') renderSmartTasks();
        }

        function convertMsgToTask(msgId) {
            var list = getThreadMap()[currentPeer] || [];
            var found = list.find(function(m) { return m.id === msgId && !m.deleted; });
            if (!found) return;
            addSmartTask(found.text || found.fileName || 'مهمة من رسالة', currentPeer);
            alert('تمت إضافة الرسالة إلى مركز المهام الذكي.');
        }

        function toggleSmartTaskDone(taskId) {
            smartTasks = smartTasks.map(function(t) {
                return t.id === taskId ? Object.assign({}, t, { done: !t.done }) : t;
            });
            persistState();
            renderSmartTasks();
        }

        function renderSmartTasks() {
            var panel = document.getElementById('smart-tasks-panel');
            var badge = document.getElementById('smart-tasks-count');
            if (badge) badge.textContent = smartTasks.length + ' مهام';
            if (!panel) return;
            if (!smartTasks.length) {
                panel.innerHTML = '<div class="text-slate-500 text-[11px]">لا توجد مهام محفوظة بعد. اضغط «مهمة» أسفل أي رسالة لإضافتها هنا.</div>';
                return;
            }
            panel.innerHTML = smartTasks.map(function(t) {
                return '<div onclick="toggleSmartTaskDone(\\'' + t.id + '\\')" class="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer">' +
                    '<span class="' + (t.done ? 'line-through text-slate-500' : 'text-slate-200') + ' truncate">' + (t.done ? '✓ ' : '• ') + t.title + '</span>' +
                    '<span class="text-[10px] text-indigo-300 shrink-0">' + (t.peer || '') + '</span></div>';
            }).join('');
        }

        function sendSmartFollowUp() {
            var list = (getThreadMap()[currentPeer] || []).filter(function(m) { return !m.deleted; });
            var lastText = list.length ? (list[list.length - 1].text || '') : '';
            var followMsg = lastText
                ? ('متابعة سريعة بخصوص: «' + lastText.slice(0, 45) + (lastText.length > 45 ? '...' : '') + '» — هل يوجد تحديث؟')
                : 'مرحباً، حبيت أتابع معك بخصوص موضوعنا الأخير.';
            emitPacket(currentPeer, 'text', followMsg, null, '');
        }

        function createQuickDecisionPoll() {
            var q = prompt('ما هو السؤال أو القرار السريع؟');
            if (!q || !q.trim()) return;
            var rawOpts = prompt('أدخل الخيارات مفصولة بفاصلة:', 'الآن، غداً، تأجيل');
            var opts = (rawOpts || 'نعم، لا').split(/[,،]+/).map(function(s) { return s.trim(); }).filter(Boolean);
            if (opts.length < 2) opts = ['نعم', 'لا'];
            var pollObj = {
                question: q.trim(),
                options: opts.map(function(label, idx) { return { idx: idx, label: label, votes: 0 }; })
            };
            var pollId = 'poll-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
            var map = getThreadMap();
            if (!map[currentPeer]) map[currentPeer] = [];
            map[currentPeer].push({
                id: pollId,
                from: 'me',
                kind: 'poll',
                text: 'استفتاء: ' + pollObj.question,
                pollData: pollObj,
                delivered: true,
                read: false,
                status: 'delivered'
            });
            persistState();
            renderMsgs();
            sendSignalingOrMsg({ type: 'msg', to: currentPeer, from: activeAcct, msgId: pollId, kind: 'poll', text: 'استفتاء: ' + pollObj.question, pollData: pollObj });
        }

        function voteOnPoll(msgId, optIdx) {
            var map = getThreadMap();
            var list = map[currentPeer] || [];
            map[currentPeer] = list.map(function(m) {
                if (m.id !== msgId || !m.pollData) return m;
                var nextOpts = m.pollData.options.map(function(o) {
                    return o.idx === optIdx ? Object.assign({}, o, { votes: (o.votes || 0) + 1 }) : o;
                });
                return Object.assign({}, m, { pollData: Object.assign({}, m.pollData, { options: nextOpts }) });
            });
            persistState();
            renderMsgs();
        }

        function openMemoryVault() {
            var modal = document.getElementById('memory-vault-modal');
            var box = document.getElementById('memory-vault-content');
            if (!modal || !box) return;
            var list = (getThreadMap()[currentPeer] || []).filter(function(m) { return !m.deleted; });
            var links = [];
            var files = [];
            list.forEach(function(m) {
                var txt = String(m.text || '');
                var foundUrls = txt.match(/https?:\/\/[^\s]+/gi);
                if (foundUrls) foundUrls.forEach(function(u) { links.push(u); });
                if (m.kind === 'image' || m.kind === 'file' || m.kind === 'audio') {
                    files.push(m.fileName || m.text || 'مرفق');
                }
            });
            var pinText = pinnedByThread[currentPeer] || 'لا توجد رسالة مثبتة حالياً';
            box.innerHTML =
                '<div class="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1">' +
                '<p class="font-bold text-amber-300"><i class="fa-solid fa-thumbtack ml-1"></i> الرسالة المثبتة</p>' +
                '<p class="text-slate-200">' + pinText + '</p></div>' +
                '<div class="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1.5">' +
                '<p class="font-bold text-cyan-300"><i class="fa-solid fa-link ml-1"></i> الروابط (' + links.length + ')</p>' +
                (links.length ? links.map(function(u) { return '<p class="font-mono text-[11px] text-blue-300 break-all">' + u + '</p>'; }).join('') : '<p class="text-slate-500">لا توجد روابط مسجلة.</p>') +
                '</div>' +
                '<div class="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1.5">' +
                '<p class="font-bold text-emerald-300"><i class="fa-solid fa-paperclip ml-1"></i> الوسائط والملفات (' + files.length + ')</p>' +
                (files.length ? files.map(function(f) { return '<p class="text-slate-200">• ' + f + '</p>'; }).join('') : '<p class="text-slate-500">لا توجد ملفات أو مقاطع صوتية.</p>') +
                '</div>';
            modal.classList.remove('hidden');
        }

        function closeMemoryVault() {
            var modal = document.getElementById('memory-vault-modal');
            if (modal) modal.classList.add('hidden');
        }

        function toggleGroupMemberPick(id) {
            if (selectedGroupMembers.has(id)) selectedGroupMembers.delete(id);
            else selectedGroupMembers.add(id);
            renderGroupMemberPicker();
        }

        function renderGroupMemberPicker() {
            var box = document.getElementById('g-contact-picker');
            if (!box) return;
            var list = contacts.filter(function(c) { return c.id !== DEFAULT_PEER; });
            if (!list.length) {
                box.innerHTML = '<span class="text-[11px] text-slate-500">أضف جهات أولاً أو اكتب أرقاماً/معرّفات في الحقل أعلاه.</span>';
                return;
            }
            box.innerHTML = list.map(function(c) {
                var picked = selectedGroupMembers.has(c.id);
                return '<button type="button" onclick="toggleGroupMemberPick(\\'' + c.id + '\\')" class="px-2.5 py-1 rounded-lg border text-[11px] font-bold ' +
                    (picked ? 'bg-cyan-600/30 border-cyan-400 text-cyan-200' : 'bg-slate-950 border-slate-800 text-slate-300') + '">' +
                    (picked ? '✓ ' : '') + c.name + ' <span class="font-mono text-[10px]">(' + c.id + ')</span></button>';
            }).join('');
        }

        function createSanadGroup() {
            var nameInp = document.getElementById('g-name');
            var extraInp = document.getElementById('g-members');
            var gName = nameInp ? nameInp.value.trim() : '';
            if (!gName) return alert('أدخل اسم المجموعة أولاً.');
            var extraTokens = (extraInp ? extraInp.value : '').split(/[\\s,،\\n]+/).map(function(x) { return x.trim(); }).filter(Boolean);
            var membersSet = new Set([activeAcct]);
            selectedGroupMembers.forEach(function(m) { membersSet.add(m); });
            extraTokens.forEach(function(m) { membersSet.add(m); });
            var grpId = 'grp-' + Math.floor(100000 + Math.random() * 900000);
            var grpObj = { id: grpId, name: gName, members: Array.from(membersSet), createdBy: activeAcct };
            sanadGroups.unshift(grpObj);
            if (nameInp) nameInp.value = '';
            if (extraInp) extraInp.value = '';
            selectedGroupMembers.clear();
            var map = getThreadMap();
            map[grpId] = [{ id: 'g-init-' + grpId, from: 'them', senderName: '@سند', kind: 'text', text: 'تم إنشاء مجموعة «' + gName + '». يمكنك التحدث هنا أو كتابة @سند لأي مساعدة فورية.' }];
            persistState();
            renderGroupsList();
            choosePeer(grpId);
        }

        function renderGroupsList() {
            var badge = document.getElementById('groups-count-badge');
            if (badge) badge.textContent = sanadGroups.length + (sanadGroups.length === 1 ? ' مجموعة' : ' مجموعات');
            renderGroupMemberPicker();
            var box = document.getElementById('groups-list');
            if (!box) return;
            if (!sanadGroups.length) {
                box.innerHTML = '<div class="text-center text-xs text-slate-500 py-6">لا توجد مجموعات بعد. أنشئ أول مجموعة لك بالأعلى.</div>';
                return;
            }
            box.innerHTML = sanadGroups.map(function(g) {
                var mCount = Array.isArray(g.members) ? g.members.length : 1;
                return '<div class="bg-slate-900/85 border border-slate-800 p-3 rounded-xl flex justify-between items-center gap-2">' +
                    '<div class="min-w-0"><p class="text-xs font-black text-white truncate"><i class="fa-solid fa-users text-cyan-400 ml-1"></i>' + g.name + '</p>' +
                    '<p class="text-[11px] font-mono text-slate-400 truncate">' + g.id + ' • ' + mCount + ' أعضاء</p></div>' +
                    '<button type="button" onclick="choosePeer(\\'' + g.id + '\\')" class="bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition">دخول المجموعة</button></div>';
            }).join('');
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

        function formatCallDuration(sec) {
            var m = Math.floor(sec / 60);
            var s = sec % 60;
            return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
        }

        function startCallTimer() {
            stopCallTimer();
            callSeconds = 0;
            var el = document.getElementById('call-timer-el');
            if (el) el.textContent = '00:00';
            callDurationTimer = setInterval(function() {
                callSeconds += 1;
                if (el) el.textContent = formatCallDuration(callSeconds);
            }, 1000);
        }

        function stopCallTimer() {
            if (callDurationTimer) { clearInterval(callDurationTimer); callDurationTimer = null; }
            var el = document.getElementById('call-timer-el');
            if (el) el.textContent = '00:00';
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

        function applyOnlineList(ids) {
            var nextArr = Array.isArray(ids) ? ids.slice().sort() : [];
            var prevArr = Array.from(onlinePeers).sort();
            if (JSON.stringify(nextArr) === JSON.stringify(prevArr)) return;
            onlinePeers = new Set(nextArr);
            renderPresence();
        }

        function handleIncomingPayload(msg) {
            if (!msg || !msg.type) return;
            var eid = msg.eventId || '';
            if (eid && seenEventIds.has(eid)) return;
            if (eid) seenEventIds.add(eid);

            if (msg.type === 'online_users' && Array.isArray(msg.ids)) {
                applyOnlineList(msg.ids);
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
                        fileName: msg.fileName || '',
                        pollData: msg.pollData || null
                    });
                }
                sendSignalingOrMsg({ type: 'msg_delivered', to: sender, from: recipient, msgId: msg.msgId });
                sendReadReceiptIfViewing(sender, msg.msgId);
                playSoftChime();
                if (!(activePane === 'chats' && normalizeStr(currentPeer) === normalizeStr(sender))) {
                    showLiveToast(sender, msg.kind === 'audio' ? 'رسالة صوتية' : (msg.text || 'مرفق'));
                }
                persistState();
                if (activePane === 'chats' && normalizeStr(currentPeer) === normalizeStr(sender)) renderMsgs();
                var autoChk = document.getElementById('chk-autoreply');
                if (autoChk && autoChk.checked && msg.kind === 'text' && sender !== recipient) {
                    var qTxt = String(msg.text || '');
                    var smartAuto = 'شكراً لتواصلك عبر سند AI، تم استلام رسالتك وسنوافيك بالرد قريباً.';
                    if (qTxt.indexOf('موعد') !== -1 || qTxt.indexOf('متى') !== -1) smartAuto = 'تم استلام استفسارك بخصوص الموعد، وسنؤكد لك التفاصيل قريباً.';
                    else if (qTxt.indexOf('شكرا') !== -1 || qTxt.indexOf('شكراً') !== -1) smartAuto = 'العفو، يسعدنا دائماً خدمتك على سند AI.';
                    emitPacket(sender, 'text', smartAuto, null, '', null, recipient);
                }
            } else if (msg.type === 'msg_delivered') {
                var ownerDel = String(msg.to || activeAcct);
                var fromPeerDel = String(msg.from || '');
                if (acctThreads[ownerDel] && acctThreads[ownerDel][fromPeerDel]) {
                    acctThreads[ownerDel][fromPeerDel] = acctThreads[ownerDel][fromPeerDel].map(function(m) {
                        if (m.id !== msg.msgId) return m;
                        return Object.assign({}, m, { delivered: true, status: m.status === 'read' ? 'read' : 'delivered' });
                    });
                    persistState();
                    if (activePane === 'chats') renderMsgs();
                }
            } else if (msg.type === 'msg_read') {
                var ownerRead = String(msg.to || activeAcct);
                var fromPeerRead = String(msg.from || '');
                if (acctThreads[ownerRead] && acctThreads[ownerRead][fromPeerRead]) {
                    acctThreads[ownerRead][fromPeerRead] = acctThreads[ownerRead][fromPeerRead].map(function(m) {
                        if (m.id !== msg.msgId) return m;
                        return Object.assign({}, m, { delivered: true, read: true, status: 'read' });
                    });
                    persistState();
                    if (activePane === 'chats') renderMsgs();
                }
            } else if (msg.type === 'msg_del_all' || msg.type === 'msg_del') {
                var recipientDel = String(msg.to || activeAcct);
                var delSender = String(msg.from || '');
                if (acctThreads[recipientDel] && acctThreads[recipientDel][delSender]) {
                    acctThreads[recipientDel][delSender] = acctThreads[recipientDel][delSender].map(function(m) {
                        return m.id === msg.msgId ? Object.assign({}, m, { deleted: true, deletedBy: 'all' }) : m;
                    });
                    persistState();
                    if (activePane === 'chats') renderMsgs();
                }
            } else if (msg.type === 'call_sig') {
                onCallSignal(msg);
            }
        }

        function postHttpSync(payload) {
            return fetch('/api/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).then(function(res) {
                if (!res || !res.ok) return null;
                serverReachable = true;
                setHeaderStatus('متصل', true);
                return res.json();
            }).then(function(data) {
                if (!data) return null;
                if (Array.isArray(data.onlineIds)) applyOnlineList(data.onlineIds);
                if (Array.isArray(data.events)) data.events.forEach(handleIncomingPayload);
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
            return fetch('/api/sync?ids=' + q, { cache: 'no-store' }).then(function(res) {
                if (!res || !res.ok) return null;
                serverReachable = true;
                setHeaderStatus('متصل', true);
                return res.json();
            }).then(function(data) {
                if (!data) return null;
                flushOutboxQueue();
                if (Array.isArray(data.onlineIds)) applyOnlineList(data.onlineIds);
                if (Array.isArray(data.events)) data.events.forEach(handleIncomingPayload);
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
                    setHeaderStatus('متصل', true);
                    try {
                        ws.send(JSON.stringify({ type: 'register_ids', ids: myAccts, activeId: activeAcct }));
                    } catch (e) {}
                    flushOutboxQueue();
                };
                ws.onclose = function() { wsConnected = false; };
                ws.onerror = function() { wsConnected = false; };
                ws.onmessage = function(ev) {
                    try { handleIncomingPayload(JSON.parse(ev.data)); } catch (e) {}
                };
            } catch (e) { wsConnected = false; }
        }

        function reconnectNow() {
            setHeaderStatus('متصل', true);
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
            var targetVol = speakerModeActive ? 1.0 : 0.35;
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
            var lblEl = document.getElementById('speaker-btn-label');
            var hintEl = document.getElementById('call-output-hint');
            if (iconEl) iconEl.className = speakerModeActive ? 'fa-solid fa-volume-high' : 'fa-solid fa-ear-listen';
            if (lblEl) lblEl.textContent = speakerModeActive ? 'مكبر' : 'سماعة';
            if (hintEl) hintEl.textContent = speakerModeActive ? 'مخرج الصوت: مكبر الصوت' : 'مخرج الصوت: سماعة الجهاز';
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

        function onCallDialInput() {
            var inp = document.getElementById('call-input');
            var preview = document.getElementById('call-resolved-preview');
            var sugBox = document.getElementById('call-contact-suggestions');
            if (!inp) return;
            var q = inp.value.trim();
            var matches = findContactMatches(q).filter(function(c) { return c.id !== DEFAULT_PEER; }).slice(0, 5);
            var exactOrFirst = resolveContactByQuery(q);
            if (preview) {
                if (!q) {
                    preview.textContent = currentPeer && currentPeer !== DEFAULT_PEER ? ('الجهة الحالية: ' + formatPeerDisplay(currentPeer)) : '';
                } else if (exactOrFirst) {
                    preview.textContent = 'متطابق تلقائياً: ' + exactOrFirst.name + ' (' + exactOrFirst.id + ')';
                } else {
                    preview.textContent = 'سيتم الاتصال بالمعرّف/الرقم: ' + q;
                }
            }
            if (sugBox) {
                sugBox.innerHTML = matches.map(function(c) {
                    return '<button type="button" onclick="selectCallSuggestion(\\'' + c.id + '\\', \\'' + String(c.name).replace(/'/g, '') + '\\')" class="bg-slate-800 hover:bg-blue-600/30 border border-slate-700 text-slate-200 px-2.5 py-1 rounded-lg text-[11px] font-bold">' +
                        c.name + ' • <span class="font-mono text-blue-300">' + c.id + '</span></button>';
                }).join('');
            }
        }

        function selectCallSuggestion(id, name) {
            var inp = document.getElementById('call-input');
            if (inp) inp.value = name ? (name + ' • ' + id) : id;
            currentPeer = id;
            onCallDialInput();
        }

        function startDialedCall(mode) {
            var inp = document.getElementById('call-input');
            var raw = inp ? inp.value.trim() : '';
            var cleanedPart = raw.indexOf('•') !== -1 ? raw.split('•').pop().trim() : raw;
            var resolved = resolveContactByQuery(cleanedPart || raw);
            var targetId = resolved ? resolved.id : (cleanedPart || raw || currentPeer);
            launchCall(mode, targetId);
        }

        function formatPeerDisplay(peerId) {
            var grp = findGroupById(peerId);
            if (grp) return grp.name + ' • مجموعة';
            var found = contacts.find(function(c) { return normalizeStr(c.id) === normalizeStr(peerId); });
            if (!found) return peerId;
            return found.id === DEFAULT_PEER ? found.name : (found.name + ' • ' + found.id);
        }

        function launchCall(mode, explicitTarget) {
            var rawTarget = String(explicitTarget || currentPeer || '').trim();
            var matched = resolveContactByQuery(rawTarget);
            var target = matched ? matched.id : rawTarget;
            if (!target) return alert('اكتب الاسم أو الرقم أو المعرّف لبدء الاتصال.');
            currentPeer = target;
            callPeerId = target;
            activeCallMode = mode || 'audio';
            stopRingtoneLoop();
            startCallTimer();
            document.getElementById('call-modal').classList.remove('hidden');
            document.getElementById('call-peer-title').textContent = formatPeerDisplay(target);
            document.getElementById('call-status-msg').textContent = (activeCallMode === 'video' ? 'اتصال فيديو — ' : 'اتصال صوتي — ') + 'جاري الاتصال...';
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
                document.getElementById('call-modal').classList.remove('hidden');
                document.getElementById('call-peer-title').textContent = formatPeerDisplay(msg.from);
                document.getElementById('call-status-msg').textContent = (activeCallMode === 'video' ? 'مكالمة فيديو واردة' : 'مكالمة صوتية واردة') + ' — يرن الآن...';
                document.getElementById('accept-btn').classList.remove('hidden');
                setCallVisualMode(activeCallMode);
                startRingtoneLoop();
            } else if (sig.op === 'answer' && rtcConn) {
                stopRingtoneLoop();
                startCallTimer();
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
            startCallTimer();
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
            stopCallTimer();
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

        function buildSanadMentionReply(promptText, targetThreadId) {
            var cleanQ = String(promptText || '').replace(/@سند|@sanad/gi, '').trim();
            var list = (getThreadMap()[targetThreadId] || []).filter(function(m) { return !m.deleted && m.kind === 'text'; });
            if (!cleanQ) {
                return 'أهلاً بك! اكتب بعد @سند: «لخص»، «مهام»، «قرار»، أو أي سؤال وسأساعدك فوراً.';
            }
            if (cleanQ.indexOf('لخص') !== -1 || cleanQ.indexOf('ملخص') !== -1 || cleanQ.indexOf('تلخيص') !== -1) {
                var recent = list.slice(-4).map(function(m) { return m.text; }).join(' • ');
                return 'ملخص آخر الرسائل: ' + (recent || 'لا توجد رسائل كافية للتلخيص بعد.');
            }
            if (cleanQ.indexOf('مهام') !== -1 || cleanQ.indexOf('خطوات') !== -1 || cleanQ.indexOf('خطة') !== -1) {
                addSmartTask(cleanQ, targetThreadId);
                return 'تمت إضافة «' + cleanQ + '» إلى مركز المهام، ونقترح: 1) تحديد المسؤول 2) ضبط الموعد 3) مراجعة الإنجاز.';
            }
            if (cleanQ.indexOf('قرار') !== -1 || cleanQ.indexOf('استفتاء') !== -1) {
                return 'لإطلاق استفتاء قرار سريع في هذه المحادثة، اضغط أيقونة الاستفتاء في الشريط العلوي وحدد الخيارات.';
            }
            return 'مساعد @سند: بخصوص «' + cleanQ + '» — الفكرة واضحة، وننصح بصياغة رسالة مباشرة ومحددة مع توضيح الموعد أو الإجراء المطلوب.';
        }

        function triggerSanadMentionIfPresent(targetThreadId, sentText) {
            if (!sentText || !/@سند|@sanad/i.test(sentText)) return;
            var replyText = buildSanadMentionReply(sentText, targetThreadId);
            var map = getThreadMap();
            if (!map[targetThreadId]) map[targetThreadId] = [];
            map[targetThreadId].push({
                id: 'ai-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
                from: 'them',
                senderName: '@سند AI',
                kind: 'text',
                text: replyText
            });
            persistState();
            renderMsgs();
        }

        function emitPacket(to, kind, text, mediaUrl, fileName, existingMsgId, forcedSender) {
            var cleanTo = String(to || '').trim();
            if (!cleanTo) return;
            var senderId = forcedSender || activeAcct;
            var grp = findGroupById(cleanTo);
            var liveDelivered = grp ? true : onlinePeers.has(cleanTo);
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
            persistState();
            renderMsgs();
            if (kind === 'text') triggerSanadMentionIfPresent(cleanTo, text);
            if (grp && Array.isArray(grp.members)) {
                grp.members.forEach(function(memId) {
                    if (normalizeStr(memId) !== normalizeStr(senderId)) {
                        sendSignalingOrMsg({ type: 'msg', to: memId, from: cleanTo, msgId: msgId, kind: kind, text: text, mediaUrl: mediaUrl, fileName: fileName });
                    }
                });
            } else {
                sendSignalingOrMsg({ type: 'msg', to: cleanTo, from: senderId, msgId: msgId, kind: kind, text: text, mediaUrl: mediaUrl, fileName: fileName });
            }
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

        function insertSanadMention() {
            var inp = document.getElementById('msg-box-input');
            if (!inp) return;
            if (inp.value.indexOf('@سند') === -1) {
                inp.value = '@سند ' + inp.value.trim();
            }
            inp.focus();
        }

        function pinThreadMsg(msgId) {
            var list = getThreadMap()[currentPeer] || [];
            var found = list.find(function(m) { return m.id === msgId && !m.deleted; });
            if (!found) return;
            pinnedByThread[currentPeer] = found.text || found.fileName || 'رسالة مثبتة';
            persistState();
            renderPinnedBanner();
        }

        function unpinCurrentThreadMsg() {
            delete pinnedByThread[currentPeer];
            persistState();
            renderPinnedBanner();
        }

        function renderPinnedBanner() {
            var banner = document.getElementById('pinned-msg-banner');
            var txt = document.getElementById('pinned-msg-text');
            if (!banner || !txt) return;
            var pinVal = pinnedByThread[currentPeer];
            if (pinVal) {
                txt.textContent = pinVal;
                banner.classList.remove('hidden');
            } else {
                banner.classList.add('hidden');
            }
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
            persistState();
            renderMsgs();
            if (mode === 'all') sendSignalingOrMsg({ type: 'msg_del_all', to: currentPeer, from: activeAcct, msgId: msgId });
        }

        function clearThreadMsgs() { getThreadMap()[currentPeer] = []; persistState(); renderMsgs(); }

        function toggleThreadSearchBar() {
            var bar = document.getElementById('thread-search-bar');
            var inp = document.getElementById('thread-search-input');
            if (!bar) return;
            bar.classList.toggle('hidden');
            if (!bar.classList.contains('hidden') && inp) inp.focus();
            renderMsgs();
        }

        function closeThreadSearchBar() {
            var bar = document.getElementById('thread-search-bar');
            var inp = document.getElementById('thread-search-input');
            if (inp) inp.value = '';
            if (bar) bar.classList.add('hidden');
            renderMsgs();
        }

        function polishDraft(tone) {
            var inp = document.getElementById('msg-box-input');
            var raw = inp.value.trim();
            if (!raw) return alert('اكتب نصاً أولاً لتحسين صياغته.');
            var cleaned = raw.replace(/\\s+/g, ' ').trim();
            if (tone === 'formal') {
                cleaned = 'السلام عليكم ورحمة الله وبركاته، نود إفادتكم بأن ' + cleaned;
            } else if (tone === 'short') {
                cleaned = cleaned.length > 80 ? (cleaned.slice(0, 80).trim() + '...') : cleaned;
            } else {
                if (cleaned.indexOf('أهلاً') !== 0 && cleaned.length < 50) cleaned = 'أهلاً بك، ' + cleaned;
            }
            inp.value = /[.!؟…]$/.test(cleaned) ? cleaned : cleaned + '.';
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
            var tasks = list.slice(-5).map(function(m, idx) {
                addSmartTask(m.text, currentPeer);
                return (idx + 1) + '. متابعة: ' + m.text;
            }).join(' | ');
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
                return '<button type="button" onclick="applySmartReply(\\'' + opt.replace(/'/g, '') + '\\')" class="bg-indigo-950/70 hover:bg-indigo-800/70 border border-indigo-500/30 text-indigo-100 px-2.5 py-1 rounded-lg shrink-0">' + opt + '</button>';
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
            var reply = 'مساعد سند AI v8.6 يوفر سرعة انتقال فورية، صندوق الذاكرة الذكية، المهام السريعة، استفتاءات القرار، ووضع الخصوصية.';
            if (q.indexOf('ذاكر') !== -1 || q.indexOf('روابط') !== -1 || q.indexOf('ملف') !== -1) {
                reply = 'اضغط أيقونة الخزنة في شريط المحادثة لفتح صندوق الذاكرة الذكية الذي يجمع الروابط والملفات والرسالة المثبتة.';
            } else if (q.indexOf('خصوص') !== -1 || q.indexOf('إخف') !== -1) {
                reply = 'زر العين في الشريط العلوي يفعّل وضع الخصوصية السريعة لحجب نصوص الرسائل عند وجود أشخاص حولك.';
            }
            log.innerHTML += '<div class="bg-slate-900 p-2 rounded-lg text-slate-200"><strong>سند AI:</strong> ' + reply + '</div>';
            inp.value = '';
            log.scrollTop = log.scrollHeight;
        }

        function exportBackup() {
            var data = JSON.stringify({ activeAcct: activeAcct, myAccts: myAccts, contacts: contacts, sanadGroups: sanadGroups, acctThreads: acctThreads, pinnedByThread: pinnedByThread, smartTasks: smartTasks });
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
                if (Array.isArray(parsed.sanadGroups)) sanadGroups = parsed.sanadGroups;
                if (parsed.acctThreads && typeof parsed.acctThreads === 'object') acctThreads = parsed.acctThreads;
                if (parsed.pinnedByThread && typeof parsed.pinnedByThread === 'object') pinnedByThread = parsed.pinnedByThread;
                if (Array.isArray(parsed.smartTasks)) smartTasks = parsed.smartTasks;
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
            if (activePane === p) return;
            activePane = p;
            ['chats', 'groups', 'accounts', 'contacts', 'calls', 'ai'].forEach(function(item) {
                var sec = document.getElementById('pane-' + item);
                if (sec) sec.classList.add('hidden');
                var btn = document.getElementById('btn-' + item);
                if (btn) btn.className = 'flex flex-col items-center gap-1 text-slate-400 hover:text-slate-200 font-semibold text-[10px] px-1.5 py-1 transition';
            });
            var targetSec = document.getElementById('pane-' + p);
            if (targetSec) targetSec.classList.remove('hidden');
            var activeBtn = document.getElementById('btn-' + p);
            if (activeBtn) activeBtn.className = 'flex flex-col items-center gap-1 text-blue-400 font-bold text-[10px] px-1.5 py-1 transition';
            if (p === 'groups') renderGroupsList();
            else if (p === 'accounts') renderAccts();
            else if (p === 'contacts') renderPresence();
            else if (p === 'ai') renderSmartTasks();
            else if (p === 'calls') {
                var callInp = document.getElementById('call-input');
                if (callInp && !callInp.value.trim() && currentPeer && currentPeer !== DEFAULT_PEER && !findGroupById(currentPeer)) {
                    var foundPeer = contacts.find(function(c) { return normalizeStr(c.id) === normalizeStr(currentPeer); });
                    callInp.value = foundPeer ? (foundPeer.name + ' • ' + foundPeer.id) : currentPeer;
                }
                onCallDialInput();
            } else if (p === 'chats') {
                renderPresence();
                renderMsgs();
                markCurrentThreadAsRead();
            }
        }

        function choosePeer(id) {
            var matched = resolveContactByQuery(id);
            var clean = matched ? matched.id : String(id || '').trim();
            if (!clean) return;
            currentPeer = clean;
            var grp = findGroupById(clean);
            var callInp = document.getElementById('call-input');
            if (callInp) {
                callInp.value = (clean === DEFAULT_PEER || grp) ? '' : (matched ? (matched.name + ' • ' + matched.id) : clean);
            }
            var map = getThreadMap();
            if (!map[currentPeer]) map[currentPeer] = [];
            persistState();
            if (activePane !== 'chats') {
                setPane('chats');
            } else {
                renderPresence();
                renderMsgs();
            }
            markCurrentThreadAsRead();
        }

        function onTopPeerSearchInput() { renderPresence(); }

        function openPeerByInput() {
            var inp = document.getElementById('peer-input');
            var val = inp ? inp.value.trim() : '';
            if (!val) return alert('أدخل اسم جهة اتصال أو مجموعة أو كود أو رقم.');
            var matched = resolveContactByQuery(val);
            if (inp) inp.value = '';
            choosePeer(matched ? matched.id : val);
        }

        function openFirstMatchedContact() {
            var searchInp = document.getElementById('contact-search-input');
            var val = searchInp ? searchInp.value.trim() : '';
            if (!val) return;
            var matches = findContactMatches(val);
            if (matches.length) choosePeer(matches[0].id);
        }

        function saveCurrentPeer() {
            if (!currentPeer || currentPeer === DEFAULT_PEER || findGroupById(currentPeer)) return;
            var existing = contacts.find(function(c) { return normalizeStr(c.id) === normalizeStr(currentPeer); });
            var defaultName = existing ? existing.name : ('جهة ' + currentPeer);
            var name = prompt('اسم جهة الاتصال للرقم/المعرّف ' + currentPeer + ':', defaultName);
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
            if (String(id) === DEFAULT_PEER) return;
            contacts = contacts.filter(function(c) { return normalizeStr(c.id) !== normalizeStr(id); });
            persistState();
            renderPresence();
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
            var code = prompt('كود التفعيل الخاص برقمك هو: ' + otp + '\\nأدخل الكود لتأكيد التفعيل:');
            if (!code || code.trim() !== otp) return alert('كود التفعيل غير مطابق.');
            var cleanPh = ph.trim();
            if (myAccts.indexOf(cleanPh) === -1) myAccts.push(cleanPh);
            activateAccount(cleanPh);
        }

        function activateAccount(id) {
            activeAcct = String(id).trim();
            if (myAccts.indexOf(activeAcct) === -1) myAccts.push(activeAcct);
            var acctLbl = document.getElementById('active-acct-label');
            if (acctLbl) acctLbl.textContent = activeAcct;
            getThreadMap();
            persistState();
            renderAccts();
            setPane('chats');
            sendSignalingOrMsg({ type: 'register_ids', ids: myAccts, activeId: activeAcct });
        }

        function renderPresence() {
            var grp = findGroupById(currentPeer);
            var isOn = grp ? true : onlinePeers.has(currentPeer);
            var matchedPeer = contacts.find(function(c) { return normalizeStr(c.id) === normalizeStr(currentPeer); });
            var dot = document.getElementById('peer-dot');
            var lbl = document.getElementById('peer-status');
            var pTitle = document.getElementById('peer-title');
            if (pTitle) {
                if (grp) pTitle.textContent = grp.name + ' • مجموعة (' + (grp.members ? grp.members.length : 1) + ')';
                else pTitle.textContent = matchedPeer
                    ? (matchedPeer.id === DEFAULT_PEER ? matchedPeer.name : (matchedPeer.name + ' • ' + currentPeer))
                    : currentPeer;
            }
            if (dot && lbl) {
                if (grp) {
                    dot.className = 'w-2.5 h-2.5 rounded-full bg-cyan-400';
                    lbl.className = 'text-[11px] font-bold text-cyan-300 whitespace-nowrap';
                    lbl.textContent = 'مجموعة نشطة';
                } else if (isOn) {
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
                var grpChips = sanadGroups.map(function(g) {
                    return '<button type="button" onclick="choosePeer(\\'' + g.id + '\\')" class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] shrink-0 transition ' +
                        (g.id === currentPeer ? 'bg-cyan-600/25 border-cyan-400 text-white font-bold' : 'bg-slate-800/80 border-slate-700 text-cyan-200') + '">' +
                        '<i class="fa-solid fa-users text-[10px] text-cyan-400"></i><span>' + g.name + '</span></button>';
                }).join('');
                chips.innerHTML = '<span class="text-[11px] text-slate-400 shrink-0">وصول سريع:</span>' + grpChips + chipList.map(function(c) {
                    var on = onlinePeers.has(c.id);
                    return '<button type="button" onclick="choosePeer(\\'' + c.id + '\\')" class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] shrink-0 transition ' +
                        (c.id === currentPeer ? 'bg-blue-600/25 border-blue-500 text-white font-bold' : 'bg-slate-800/80 border-slate-700 text-slate-300') + '">' +
                        '<span class="w-2 h-2 rounded-full ' + (on ? 'bg-emerald-400' : 'bg-slate-500') + '"></span>' +
                        '<span>' + c.name + '</span></button>';
                }).join('');
            }

            if (activePane === 'contacts') {
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
                    var metaText = c.id === DEFAULT_PEER ? subTag : (c.id + ' • ' + subTag);
                    var delBtn = c.id === DEFAULT_PEER ? '' : '<button type="button" onclick="deleteContactById(\\'' + c.id + '\\')" class="bg-red-500/10 text-red-400 px-2.5 py-1.5 rounded-lg text-xs"><i class="fa-solid fa-trash"></i></button>';
                    return '<div class="bg-slate-900/85 border border-slate-800 p-3 rounded-xl flex justify-between items-center gap-2">' +
                        '<div class="flex items-center gap-2.5 min-w-0">' +
                        '<span class="w-2.5 h-2.5 rounded-full shrink-0 ' + (on ? 'bg-emerald-500' : 'bg-slate-600') + '"></span>' +
                        '<div class="truncate"><p class="text-xs font-bold text-white truncate">' + c.name + '</p>' +
                        '<p class="text-[11px] font-mono ' + (on ? 'text-emerald-400' : 'text-slate-400') + '">' + metaText + '</p></div></div>' +
                        '<div class="flex gap-1.5 shrink-0">' +
                        '<button type="button" onclick="launchCall(\\'audio\\', \\'' + c.id + '\\')" title="اتصال صوتي" class="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white px-2.5 py-1.5 rounded-lg text-xs transition"><i class="fa-solid fa-phone"></i></button>' +
                        '<button type="button" onclick="launchCall(\\'video\\', \\'' + c.id + '\\')" title="مكالمة فيديو" class="bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white px-2.5 py-1.5 rounded-lg text-xs transition"><i class="fa-solid fa-video"></i></button>' +
                        '<button type="button" onclick="choosePeer(\\'' + c.id + '\\')" class="bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold transition">مراسلة</button>' +
                        delBtn +
                        '</div></div>';
                }).join('');
            }
            if (activePane === 'calls') onCallDialInput();
        }

        function buildDeliveryBadge(m) {
            if (m.read || m.status === 'read') return '<span class="text-emerald-300 font-bold">مقروءة</span>';
            if (m.delivered || m.status === 'delivered') return '<span class="text-blue-100 font-semibold">مستلمة</span>';
            if (m.delivered === false) return '<span class="text-amber-200">مرسلة • <button type="button" onclick="retryMessage(\\'' + m.id + '\\')" class="underline">إعادة إرسال</button></span>';
            return '<span>مرسلة</span>';
        }

        function renderMsgs() {
            renderPinnedBanner();
            var box = document.getElementById('msgs-box');
            if (!box) return;
            var rawList = getThreadMap()[currentPeer] || [];
            var searchInp = document.getElementById('thread-search-input');
            var q = normalizeStr(searchInp ? searchInp.value : '');
            var countEl = document.getElementById('thread-search-count');
            var list = rawList;
            if (q) {
                list = rawList.filter(function(m) {
                    if (m.deleted) return false;
                    var hay = normalizeStr((m.text || '') + ' ' + (m.fileName || ''));
                    return hay.indexOf(q) !== -1;
                });
            }
            if (countEl) countEl.textContent = list.length + (list.length === 1 ? ' نتيجة' : ' نتائج');
            if (!list.length) {
                box.innerHTML = '<div class="text-center text-xs text-slate-500 py-8">' + (q ? 'لا توجد رسائل مطابقة للبحث في هذه المحادثة.' : 'ابدأ المراسلة أو أرسل صوتاً أو مرفقاً أو ابدأ مكالمة.') + '</div>';
                return;
            }
            var blurClass = privacyShieldOn ? 'privacy-blur' : '';
            box.innerHTML = list.map(function(m) {
                if (m.deleted) {
                    var delLabel = m.deletedBy === 'all' ? 'تم حذف الرسالة لدى الجميع' : 'تم حذف الرسالة من جهازك';
                    return '<div class="text-center text-[11px] text-slate-500 italic">' + delLabel + '</div>';
                }
                var mine = m.from === 'me';
                var senderTag = (!mine && m.senderName) ? '<p class="text-[10px] font-bold text-indigo-300 mb-0.5">' + m.senderName + '</p>' : '';
                var body = '<p class="whitespace-pre-wrap break-words ' + blurClass + '" onclick="this.classList.toggle(\\'revealed\\')">' + m.text + '</p>';
                if (m.kind === 'poll' && m.pollData) {
                    var totalVotes = m.pollData.options.reduce(function(acc, o) { return acc + (o.votes || 0); }, 0);
                    body = '<div class="space-y-1.5 ' + blurClass + '" onclick="this.classList.toggle(\\'revealed\\')">' +
                        '<p class="font-bold text-xs"><i class="fa-solid fa-square-poll-vertical ml-1"></i>' + m.pollData.question + '</p>' +
                        m.pollData.options.map(function(o) {
                            var pct = totalVotes > 0 ? Math.round(((o.votes || 0) / totalVotes) * 100) : 0;
                            return '<button type="button" onclick="event.stopPropagation();voteOnPoll(\\'' + m.id + '\\', ' + o.idx + ')" class="w-full text-right bg-slate-950/70 hover:bg-slate-950 border border-white/15 rounded-lg px-2.5 py-1.5 text-[11px] flex justify-between items-center">' +
                                '<span>' + o.label + '</span><span class="font-mono text-emerald-300">' + (o.votes || 0) + ' (' + pct + '%)</span></button>';
                        }).join('') + '</div>';
                } else if (m.kind === 'audio' && m.mediaUrl) body = '<audio controls preload="metadata" src="' + m.mediaUrl + '" class="max-w-full h-9"></audio>';
                else if (m.kind === 'image' && m.mediaUrl) body = '<img src="' + m.mediaUrl + '" alt="' + (m.fileName || 'صورة') + '" class="max-w-full max-h-56 rounded-xl object-contain ' + blurClass + '" onclick="this.classList.toggle(\\'revealed\\')"><p class="text-[11px] mt-1">' + m.text + '</p>';
                else if (m.kind === 'file' && m.mediaUrl) body = '<a href="' + m.mediaUrl + '" download="' + (m.fileName || 'file') + '" class="underline flex items-center gap-1.5 text-xs"><i class="fa-solid fa-file-arrow-down"></i><span>' + (m.fileName || m.text) + '</span></a>';
                var speakBtn = (m.kind === 'text' && m.text) ? '<button type="button" onclick="speakText(\\'' + String(m.text).replace(/'/g, '') + '\\')" class="underline text-blue-100">استماع</button>' : '';
                var taskBtn = '<button type="button" onclick="convertMsgToTask(\\'' + m.id + '\\')" class="underline text-emerald-200">مهمة</button>';
                var pinBtn = '<button type="button" onclick="pinThreadMsg(\\'' + m.id + '\\')" class="underline text-amber-200">تثبيت</button>';
                var deliveryLabel = mine ? buildDeliveryBadge(m) : '<span class="text-emerald-300 font-semibold">مستلمة</span>';
                return '<div class="flex ' + (mine ? 'justify-end' : 'justify-start') + '">' +
                    '<div class="' + (mine ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-tl-none' : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tr-none') + ' p-3 rounded-2xl max-w-md text-xs md:text-sm shadow-md space-y-1">' +
                    senderTag + body +
                    '<div class="flex justify-between items-center gap-3 pt-1 border-t ' + (mine ? 'border-blue-400/30 text-blue-100' : 'border-slate-800 text-slate-400') + ' text-[10px]">' +
                    deliveryLabel +
                    '<div class="flex gap-2">' + taskBtn + pinBtn + speakBtn +
                    '<button type="button" onclick="openDeleteModal(\\'' + m.id + '\\', ' + (mine ? 'true' : 'false') + ')" class="underline ' + (mine ? 'text-red-100' : 'text-red-400') + '">حذف</button>' +
                    '</div></div></div></div>';
            }).join('');
            if (!q) box.scrollTop = box.scrollHeight;
        }

        function renderAccts() {
            var badge = document.getElementById('accounts-count-badge');
            if (badge) badge.textContent = myAccts.length + (myAccts.length === 1 ? ' حساب' : ' حسابات');
            var box = document.getElementById('accounts-list');
            if (!box) return;
            box.innerHTML = myAccts.map(function(id) {
                return '<div onclick="activateAccount(\\'' + id + '\\')" class="bg-slate-950 border ' + (id === activeAcct ? 'border-blue-500' : 'border-slate-800') + ' p-3 rounded-xl flex justify-between items-center cursor-pointer transition">' +
                    '<span class="text-xs font-mono font-bold text-white">' + id + '</span>' +
                    '<span class="text-[10px] ' + (id === activeAcct ? 'text-emerald-400 font-bold' : 'text-slate-400') + '">' + (id === activeAcct ? 'نشط' : 'تبديل') + '</span></div>';
            }).join('');
        }

        function persistAndDraw() {
            persistState();
            var acctLbl = document.getElementById('active-acct-label');
            if (acctLbl) acctLbl.textContent = activeAcct;
            updateNetBadge();
            updateQueueBadge();
            renderPresence();
            renderMsgs();
        }

        var devBadge = document.getElementById('device-badge');
        if (devBadge) devBadge.textContent = detectDevice();
        loadSavedState();
        persistAndDraw();
        setHeaderStatus('متصل', true);
        postHttpSync({ type: 'register_ids', ids: myAccts, activeId: activeAcct });
        pollHttpSync();
        openSocket();

        setInterval(function() {
            pollHttpSync();
            if (!ws || ws.readyState > 1) openSocket();
        }, 4500);

        document.addEventListener('visibilitychange', function() {
            if (!document.hidden) {
                pollHttpSync();
                if (activePane === 'chats') markCurrentThreadAsRead();
            }
        });
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
    console.log('Sanad AI v8.6 running on port ' + PORT);
});
