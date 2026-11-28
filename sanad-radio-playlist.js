// sanad-radio-playlist.js
// قائمة البث المتواصل لإذاعة سند المحلية (تعمل تلقائياً بالتتابع من البداية)

const SANAD_RADIO_M3U_URL = '/sanad-radio.m3u';
const SANAD_PROMO_AUDIO_URL = 'https://my-server-t0s5.onrender.com/sanad-radio-promo.mp3';
const SANAD_SEG_2_AUDIO_URL = 'https://my-server-t0s5.onrender.com/sanad-seg-2.mp3';

const SANAD_RADIO_PLAYLIST = [
    {
        id: 'promo-main',
        title: 'برومو إذاعة راديو سند AI -- البث المباشر',
        url: SANAD_PROMO_AUDIO_URL,
        durationSec: 63
    },
    {
        id: 'seg-2',
        title: 'المقطع الثاني -- إذاعة سند',
        url: SANAD_SEG_2_AUDIO_URL,
        durationSec: 0
    }
];

function parseM3uPlaylistText(m3uText) {
    if (!m3uText || typeof m3uText !== 'string') return [];
    const lines = m3uText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const tracks = [];
    let pendingTitle = '';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('#EXTINF:')) {
            const commaIdx = line.indexOf(',');
            pendingTitle = commaIdx !== -1 ? line.slice(commaIdx + 1).trim() : 'فقرة راديو سند';
        } else if (!line.startsWith('#')) {
            tracks.push({
                id: 'm3u-' + (tracks.length + 1),
                title: pendingTitle || ('مقطع إذاعي ' + (tracks.length + 1)),
                url: line,
                durationSec: 0
            });
            pendingTitle = '';
        }
    }
    return tracks;
}

class SanadContinuousRadio {
    constructor(audioElementId, titleBadgeId) {
        this.audio = document.getElementById(audioElementId);
        this.badge = document.getElementById(titleBadgeId);
        this.playlist = SANAD_RADIO_PLAYLIST.slice();
        this.currentIndex = 0;
        this.isPlaying = false;

        if (this.audio) {
            this.audio.preload = 'auto';
            this.audio.addEventListener('ended', () => this.playNext());
            this.audio.addEventListener('error', () => {
                if (!this.isPlaying) return;
                if (this.playlist.length > 1) {
                    this.playNext();
                } else {
                    setTimeout(() => this.playNext(), 1500);
                }
            });
        }
    }

    async loadFromM3u(m3uUrl = SANAD_RADIO_M3U_URL) {
        try {
            const res = await fetch(m3uUrl + '?t=' + Date.now(), { cache: 'no-store' });
            if (!res || !res.ok) return false;
            const text = await res.text();
            const parsed = parseM3uPlaylistText(text).filter(
                t => t.url && !t.url.includes('YOUR-CDN-LINK.com')
            );
            if (parsed.length > 0) {
                this.playlist = parsed;
                return true;
            }
        } catch (e) {}
        return false;
    }

    async start() {
        if (!this.audio) return;
        await this.loadFromM3u();
        const activeList = this.playlist.length ? this.playlist : SANAD_RADIO_PLAYLIST;
        if (!activeList.length) return;
        this.playlist = activeList;
        this.currentIndex = 0; // يبدأ دائماً من البداية عند التشغيل
        this.isPlaying = true;
        this.playIndex(0);
    }

    stop() {
        this.isPlaying = false;
        if (this.audio) {
            this.audio.pause();
            this.audio.removeAttribute('src');
            this.audio.load();
        }
    }

    playIndex(index) {
        if (!this.isPlaying || !this.playlist.length) return;
        this.currentIndex = ((index % this.playlist.length) + this.playlist.length) % this.playlist.length;
        const track = this.playlist[this.currentIndex];
        if (this.badge) {
            this.badge.textContent = `على الهواء الآن (${this.currentIndex + 1}/${this.playlist.length}): ${track.title}`;
        }
        this.audio.src = track.url;
        this.audio.play().catch(() => {});
    }

    playNext() {
        if (!this.isPlaying) return;
        this.playIndex(this.currentIndex + 1);
    }
}
