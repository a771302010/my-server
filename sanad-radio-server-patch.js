/**
 * sanad-radio-service.js
 * وحدة راديو سند والأذان الآلي المستقلة والمرتبطة بالسيرفر
 * تعتمد على GPS / المدينة / المنطقة الزمنية ومواقيت حقيقية وبث صوتي حقيقي دون ذكاء اصطناعي
 */

class SanadRadioService {
    constructor(options = {}) {
        this.apiBase = options.apiBase || '/api/radio';
        this.audioEl = options.audioEl || null;
        this.onStateChange = typeof options.onStateChange === 'function' ? options.onStateChange : null;
        this.onScheduleUpdate = typeof options.onScheduleUpdate === 'function' ? options.onScheduleUpdate : null;
        this.onStatusMessage = typeof options.onStatusMessage === 'function' ? options.onStatusMessage : null;

        this.state = {
            playing: false,
            mode: 'idle', // idle | radio | pre_adhan | adhan | quran
            stationId: 'sanad_main',
            stationName: 'إذاعة سند',
            autoAdhanEnabled: true,
            locationSource: 'auto', // gps | city | timezone
            cityLabel: 'الموقع الحالي',
            latitude: null,
            longitude: null,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
            method: 4,
            timings: null,
            isFriday: false,
            isRamadan: false,
            lastEventKey: '',
            currentTrackIndex: 0
        };

        this.config = {
            adhanAudioUrl: options.adhanAudioUrl || '/sanad-adhan.mp3',
            quranStreamUrl: options.quranStreamUrl || 'https://stream.radiojar.com/0tpy1h0kxtzuv',
            tracks: Array.isArray(options.tracks) && options.tracks.length
                ? options.tracks
                : [{ id: 'promo', title: 'برومو إذاعة سند', url: '/sanad-radio-promo.mp3' }]
        };

        this._watchTimer = null;
        this._syncTimer = null;
    }

    _emitStatus(msg) {
        if (this.onStatusMessage) this.onStatusMessage(msg);
    }

    _emitState() {
        if (this.onStateChange) this.onStateChange(Object.assign({}, this.state));
    }

    _toWesternDigits(str) {
        return String(str === undefined || str === null ? '' : str)
            .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 1632))
            .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 1776));
    }

    _parseHhMmToMinutes(hhmm) {
        const clean = this._toWesternDigits(String(hhmm || '')).trim().slice(0, 5);
        const parts = clean.split(':');
        if (parts.length < 2) return -1;
        const h = Number(parts[0]);
        const m = Number(parts[1]);
        if (Number.isNaN(h) || Number.isNaN(m)) return -1;
        return h * 60 + m;
    }

    async init() {
        await this.syncServerConfig();
        await this.detectUserLocationAndSchedule();
        this.startBackgroundLoops();
    }

    async syncServerConfig() {
        try {
            const res = await fetch(`${this.apiBase}/config`, { cache: 'no-store' });
            if (!res.ok) return;
            const data = await res.json();
            if (data && data.config) {
                if (data.config.adhanAudioUrl) this.config.adhanAudioUrl = data.config.adhanAudioUrl;
                if (data.config.quranStreamUrl) this.config.quranStreamUrl = data.config.quranStreamUrl;
                if (Array.isArray(data.config.tracks) && data.config.tracks.length) {
                    this.config.tracks = data.config.tracks;
                }
            }
        } catch (_) {}
    }

    async reportStateToServer(eventName = 'state_update') {
        try {
            await fetch(`${this.apiBase}/state`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event: eventName,
                    timestamp: Date.now(),
                    state: {
                        playing: this.state.playing,
                        mode: this.state.mode,
                        stationId: this.state.stationId,
                        cityLabel: this.state.cityLabel,
                        latitude: this.state.latitude,
                        longitude: this.state.longitude,
                        timezone: this.state.timezone,
                        autoAdhanEnabled: this.state.autoAdhanEnabled
                    }
                })
            });
        } catch (_) {}
    }

    requestGpsLocation(timeoutMs = 7000) {
        return new Promise((resolve) => {
            if (!navigator.geolocation || typeof navigator.geolocation.getCurrentPosition !== 'function') {
                resolve(null);
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    resolve({
                        lat: pos.coords.latitude,
                        lon: pos.coords.longitude,
                        accuracy: pos.coords.accuracy || null
                    });
                },
                () => resolve(null),
                { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60000 }
            );
        });
    }

    async resolveCityNameFromCoords(lat, lon) {
        try {
            const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&zoom=10&addressdetails=1`;
            const res = await fetch(url, { headers: { 'Accept-Language': 'ar' } });
            if (!res.ok) return null;
            const json = await res.json();
            const addr = json && json.address ? json.address : {};
            const locality = addr.city || addr.town || addr.village || addr.state || addr.county || '';
            const country = addr.country || '';
            if (locality && country) return `${locality} • ${country}`;
            return locality || country || null;
        } catch (_) {
            return null;
        }
    }

    async detectUserLocationAndSchedule(explicitCoords = null, explicitLabel = null, methodOverride = null) {
        this.state.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || this.state.timezone || 'UTC';

        let lat = explicitCoords ? explicitCoords.lat : null;
        let lon = explicitCoords ? explicitCoords.lon : null;
        let label = explicitLabel || '';

        if (lat === null || lon === null) {
            this._emitStatus('جاري تحديد موقعك الجغرافي (GPS) والمنطقة الزمنية...');
            const gps = await this.requestGpsLocation();
            if (gps && typeof gps.lat === 'number' && typeof gps.lon === 'number') {
                lat = gps.lat;
                lon = gps.lon;
                this.state.locationSource = 'gps';
                const geoName = await this.resolveCityNameFromCoords(lat, lon);
                label = geoName || `موقع GPS (${lat.toFixed(2)}, ${lon.toFixed(2)})`;
            } else {
                this.state.locationSource = 'timezone';
                lat = 12.7855;
                lon = 45.0187;
                label = `المنطقة الزمنية: ${this.state.timezone}`;
            }
        } else {
            this.state.locationSource = 'city';
        }

        this.state.latitude = Number(lat);
        this.state.longitude = Number(lon);
        this.state.cityLabel = label;
        if (methodOverride !== null) this.state.method = Number(methodOverride);

        await this.fetchPrayerScheduleForCurrentLocation();
        this._emitState();
        this.reportStateToServer('location_updated');
    }

    async setManualCity(lat, lon, cityLabel, method = 4) {
        await this.detectUserLocationAndSchedule(
            { lat: Number(lat), lon: Number(lon) },
            cityLabel,
            method
        );
    }

    async fetchPrayerScheduleForCurrentLocation() {
        if (this.state.latitude === null || this.state.longitude === null) return;
        const tz = encodeURIComponent(this.state.timezone || 'UTC');
        const url = `https://api.aladhan.com/v1/timings?latitude=${encodeURIComponent(this.state.latitude)}&longitude=${encodeURIComponent(this.state.longitude)}&method=${encodeURIComponent(this.state.method)}&timezonestring=${tz}`;

        try {
            const res = await fetch(url, { cache: 'no-store' });
            if (!res.ok) throw new Error('Prayer API error');
            const json = await res.json();
            const data = json && json.data ? json.data : null;
            const t = data && data.timings ? data.timings : null;
            if (!t) return;

            const now = new Date();
            const isFriday = now.getDay() === 5;
            const hijriMonth = (data.date && data.date.hijri && data.date.hijri.month && data.date.hijri.month.number) || 0;

            this.state.timings = {
                Fajr: String(t.Fajr || '').slice(0, 5),
                Dhuhr: String(t.Dhuhr || '').slice(0, 5),
                Asr: String(t.Asr || '').slice(0, 5),
                Maghrib: String(t.Maghrib || '').slice(0, 5),
                Isha: String(t.Isha || '').slice(0, 5),
                Lastthird: String(t.Lastthird || '').slice(0, 5)
            };
            this.state.isFriday = isFriday;
            this.state.isRamadan = hijriMonth === 9;

            if (this.onScheduleUpdate) {
                this.onScheduleUpdate({
                    cityLabel: this.state.cityLabel,
                    timezone: this.state.timezone,
                    timings: Object.assign({}, this.state.timings),
                    isFriday: this.state.isFriday,
                    isRamadan: this.state.isRamadan
                });
            }

            this.evaluateAutoAdhanTick();
        } catch (_) {
            this._emitStatus('تعذر تحديث مواقيت الصلاة للموقع الحالي؛ سيعاد المحاولة تلقائياً.');
        }
    }

    stopAudio() {
        if (!this.audioEl) return;
        try {
            this.audioEl.pause();
            this.audioEl.loop = false;
            this.audioEl.onended = null;
            this.audioEl.onerror = null;
            this.audioEl.onplaying = null;
        } catch (_) {}
    }

    playRealAdhan(label = 'وقت الصلاة') {
        this.stopAudio();
        this.state.playing = true;
        this.state.mode = 'adhan';
        this._emitState();
        this._emitStatus(`الله أكبر • الأذان الحقيقي حسب موقعك (${this.state.cityLabel}): ${label}`);
        this.reportStateToServer('adhan_triggered');

        if (!this.audioEl || !this.config.adhanAudioUrl) return;
        this.audioEl.muted = false;
        this.audioEl.volume = 1.0;
        this.audioEl.src = this.config.adhanAudioUrl;
        this.audioEl.load();
        this.audioEl.play().catch(() => {
            this.playRealQuran('تعذر تشغيل ملف الأذان؛ تم التحويل إلى بث القرآن الحقيقي.');
        });
    }

    playRealQuran(statusText = 'تلاوة قرآنية حقيقية حسب وقت موقعك') {
        this.stopAudio();
        this.state.playing = true;
        this.state.mode = 'quran';
        this._emitState();
        this._emitStatus(`${statusText} • ${this.state.cityLabel}`);
        this.reportStateToServer('quran_triggered');

        if (!this.audioEl || !this.config.quranStreamUrl) return;
        this.audioEl.muted = false;
        this.audioEl.volume = 1.0;
        this.audioEl.src = this.config.quranStreamUrl;
        this.audioEl.load();
        this.audioEl.play().catch(() => {
            this._emitStatus('اضغط مرة أخرى لتأكيد تشغيل الصوت في المتصفح.');
        });
    }

    playRadioStation(stationId, stationName, streamUrl) {
        this.stopAudio();
        this.state.playing = true;
        this.state.mode = 'radio';
        this.state.stationId = stationId || 'sanad_main';
        this.state.stationName = stationName || 'إذاعة سند';
        this._emitState();
        this.reportStateToServer('radio_started');

        if (this.state.stationId === 'sanad_main') {
            this._playSequence(0);
            return;
        }

        if (!this.audioEl || !streamUrl) return;
        this._emitStatus(`جاري تشغيل «${this.state.stationName}»...`);
        this.audioEl.onplaying = () => {
            this._emitStatus(`على الهواء الآن: «${this.state.stationName}»`);
        };
        this.audioEl.onerror = () => {
            this._emitStatus(`تعذر تشغيل «${this.state.stationName}» من المصدر الخارجي.`);
        };
        this.audioEl.muted = false;
        this.audioEl.volume = 1.0;
        this.audioEl.src = streamUrl;
        this.audioEl.load();
        this.audioEl.play().catch(() => {});
    }

    _playSequence(index) {
        if (!this.state.playing || this.state.mode !== 'radio') return;
        const tracks = this.config.tracks || [];
        if (!tracks.length || !this.audioEl) return;

        const safeIdx = ((index % tracks.length) + tracks.length) % tracks.length;
        this.state.currentTrackIndex = safeIdx;
        const track = tracks[safeIdx];
        this._emitStatus(`إذاعة سند (${safeIdx + 1}/${tracks.length}) • ${track.title}`);

        this.audioEl.loop = false;
        this.audioEl.onended = () => {
            if (this.state.playing && this.state.mode === 'radio') {
                this._playSequence(safeIdx + 1);
            }
        };
        this.audioEl.onerror = () => {
            if (this.state.playing && this.state.mode === 'radio' && tracks.length > 1) {
                this._playSequence(safeIdx + 1);
            }
        };
        this.audioEl.muted = false;
        this.audioEl.volume = 1.0;
        this.audioEl.src = track.url;
        this.audioEl.load();
        this.audioEl.play().catch(() => {});
    }

    stopAll() {
        this.stopAudio();
        this.state.playing = false;
        this.state.mode = 'idle';
        this._emitState();
        this._emitStatus('تم إيقاف البث الصوتي.');
        this.reportStateToServer('stopped');
    }

    evaluateAutoAdhanTick() {
        if (!this.state.autoAdhanEnabled || !this.state.timings) return;

        const now = new Date();
        const nowMins = now.getHours() * 60 + now.getMinutes();
        const dayKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${this.state.cityLabel}`;

        const prayers = [
            { key: 'Fajr', label: 'الفجر', mins: this._parseHhMmToMinutes(this.state.timings.Fajr) },
            { key: 'Dhuhr', label: this.state.isFriday ? 'الجمعة' : 'الظهر', mins: this._parseHhMmToMinutes(this.state.timings.Dhuhr) },
            { key: 'Asr', label: 'العصر', mins: this._parseHhMmToMinutes(this.state.timings.Asr) },
            { key: 'Maghrib', label: this.state.isRamadan ? 'المغرب (إفطار رمضان)' : 'المغرب', mins: this._parseHhMmToMinutes(this.state.timings.Maghrib) },
            { key: 'Isha', label: 'العشاء', mins: this._parseHhMmToMinutes(this.state.timings.Isha) }
        ];

        for (const p of prayers) {
            if (p.mins < 0) continue;

            if (nowMins === p.mins) {
                const slot = `${dayKey}-adhan-${p.key}`;
                if (this.state.lastEventKey !== slot) {
                    this.state.lastEventKey = slot;
                    this.playRealAdhan(p.label);
                }
                return;
            }

            if (nowMins === p.mins - 5) {
                const preSlot = `${dayKey}-pre-${p.key}`;
                if (this.state.lastEventKey !== preSlot) {
                    this.state.lastEventKey = preSlot;
                    this.playRealQuran(`قبل أذان ${p.label} بـ 5 دقائق • تلاوة قرآنية حقيقية`);
                }
                return;
            }
        }

        const tahajjudMins = this._parseHhMmToMinutes(this.state.timings.Lastthird);
        if (tahajjudMins >= 0 && nowMins === tahajjudMins) {
            const tahSlot = `${dayKey}-tahajjud`;
            if (this.state.lastEventKey !== tahSlot) {
                this.state.lastEventKey = tahSlot;
                this.playRealQuran('وقت التهجد (الثلث الأخير من الليل) • بث قرآن حقيقي');
            }
        }
    }

    startBackgroundLoops() {
        clearInterval(this._watchTimer);
        clearInterval(this._syncTimer);
        this._watchTimer = setInterval(() => this.evaluateAutoAdhanTick(), 15000);
        this._syncTimer = setInterval(() => this.reportStateToServer('heartbeat'), 60000);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SanadRadioService };
}
if (typeof window !== 'undefined') {
    window.SanadRadioService = SanadRadioService;
}
