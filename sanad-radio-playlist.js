(function (global) {
    const DEFAULT_TRACKS = [
        {
            id: 'promo-mp3',
            title: 'برومو إذاعة سند AI -- البث المباشر',
            url: '/sanad-radio-promo.mp3',
            type: 'audio/mpeg',
            aiNote: 'افتتاحية البث المباشر لمنصة سند AI بجودة صوتية نقية.'
        },
        {
            id: 'seg-2-mp3',
            title: 'المقطع الثاني -- إذاعة سند',
            url: '/sanad-seg-2.mp3',
            type: 'audio/mpeg',
            aiNote: 'فقرة إذاعية متواصلة ضمن جدول بث سند.'
        },
        {
            id: 'seg-3-m4a',
            title: 'فقرة صوتية M4A -- إذاعة سند AI',
            url: '/sanad-seg-3.m4a',
            type: 'audio/mp4',
            aiNote: 'بث صوتي عالي الكفاءة بصيغة M4A.'
        },
        {
            id: 'seg-4-mp4',
            title: 'حلقة MP4 -- إذاعة سند AI',
            url: '/sanad-seg-4.mp4',
            type: 'video/mp4',
            aiNote: 'محتوى MP4 مدمج يعمل صوتياً ومرئياً بذكاء.'
        }
    ];

    function detectMediaKind(url) {
        const clean = String(url || '').split('?')[0].toLowerCase();
        if (clean.endsWith('.mp4')) return 'mp4';
        if (clean.endsWith('.m4a')) return 'm4a';
        return 'mp3';
    }

    function buildSmartAiCaption(track, index, total) {
        const kind = detectMediaKind(track.url).toUpperCase();
        const base = track.aiNote || 'فقرة مختارة من إذاعة سند AI.';
        return `[سند AI • ${kind} • ${index + 1}/${total}] ${track.title} -- ${base}`;
    }

    class SanadSmartRadioEngine {
        constructor(options = {}) {
            this.tracks = Array.isArray(options.tracks) && options.tracks.length
                ? options.tracks.slice()
                : DEFAULT_TRACKS.slice();
            this.currentIndex = 0;
            this.isPlaying = false;
            this.onStatus = typeof options.onStatus === 'function' ? options.onStatus : () => {};
            this.audioEl = options.audioEl || document.getElementById('radio-audio-el');
            this.videoFallbackEl = null;
        }

        ensureVideoBridge() {
            if (this.videoFallbackEl) return this.videoFallbackEl;
            const v = document.createElement('video');
            v.id = 'sanad-radio-mp4-bridge';
            v.playsInline = true;
            v.preload = 'auto';
            v.style.display = 'none';
            document.body.appendChild(v);
            return (this.videoFallbackEl = v);
        }

        stopAll() {
            this.isPlaying = false;
            if (this.audioEl) {
                try { this.audioEl.pause(); } catch (e) {}
            }
            if (this.videoFallbackEl) {
                try { this.videoFallbackEl.pause(); } catch (e) {}
            }
            this.onStatus('تم إيقاف بث إذاعة سند AI.');
        }

        async playAt(index = 0) {
            if (!this.tracks.length) return;
            this.currentIndex = ((index % this.tracks.length) + this.tracks.length) % this.tracks.length;
            const track = this.tracks[this.currentIndex];
            const kind = detectMediaKind(track.url);
            this.isPlaying = true;

            this.onStatus(buildSmartAiCaption(track, this.currentIndex, this.tracks.length));

            // نحاول أولاً عبر عنصر الصوت الموحد (يدعم MP3 وM4A وغالباً MP4)
            if (this.audioEl && kind !== 'mp4') {
                this.audioEl.src = track.url;
                this.audioEl.onended = () => this.isPlaying && this.playAt(this.currentIndex + 1);
                this.audioEl.onerror = () => this.isPlaying && this.playAt(this.currentIndex + 1);
                try {
                    await this.audioEl.play();
                    return;
                } catch (e) {
                    // انتقال تلقائي للملف التالي إذا تعذر التشغيل
                    return this.playAt(this.currentIndex + 1);
                }
            }

            // لملفات MP4 أو عند الحاجة لتشغيل الفيديو/الصوت المدمج
            const vid = this.ensureVideoBridge();
            vid.src = track.url;
            vid.onended = () => this.isPlaying && this.playAt(this.currentIndex + 1);
            vid.onerror = () => this.isPlaying && this.playAt(this.currentIndex + 1);
            try {
                await vid.play();
            } catch (e) {
                if (this.audioEl) {
                    try {
                        this.audioEl.src = track.url;
                        this.audioEl.onended = () => this.isPlaying && this.playAt(this.currentIndex + 1);
                        await this.audioEl.play();
                        return;
                    } catch (err2) {}
                }
                this.playAt(this.currentIndex + 1);
            }
        }
    }

    global.SANAD_RADIO_PLAYLIST = {
        tracks: DEFAULT_TRACKS,
        detectMediaKind,
        buildSmartAiCaption,
        SanadSmartRadioEngine
    };
})(typeof window !== 'undefined' ? window : globalThis);
