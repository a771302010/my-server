/**
 * sanad-radio-ui-bridge.js
 * ربط خدمة راديو سند والأذان الآلي (SanadRadioService) بالواجهة والمدن والأزرار
 * يعتمد على تحديد الموقع الفعلي (GPS / المدينة / المنطقة الزمنية) والمواقيت الحقيقية دون ذكاء اصطناعي
 */

const SANAD_PRESET_CITIES = [
    { id: 'mukalla', label: 'المكلا • اليمن', lat: 14.5425, lon: 49.1242, method: 4 },
    { id: 'sanaa', label: 'صنعاء • اليمن', lat: 15.3694, lon: 44.1910, method: 4 },
    { id: 'aden', label: 'عدن • اليمن', lat: 12.7855, lon: 45.0187, method: 4 },
    { id: 'hodeidah', label: 'الحديدة • اليمن', lat: 14.7978, lon: 42.9545, method: 4 },
    { id: 'mokha', label: 'المخا • اليمن', lat: 13.3167, lon: 43.2500, method: 4 },
    { id: 'makkah', label: 'مكة المكرمة • السعودية', lat: 21.3891, lon: 39.8579, method: 4 },
    { id: 'madinah', label: 'المدينة المنورة • السعودية', lat: 24.5247, lon: 39.5692, method: 4 },
    { id: 'riyadh', label: 'الرياض • السعودية', lat: 24.7136, lon: 46.6753, method: 4 },
    { id: 'cairo', label: 'القاهرة • مصر', lat: 30.0444, lon: 31.2357, method: 5 },
    { id: 'dubai', label: 'دبي • الإمارات', lat: 25.2048, lon: 55.2708, method: 4 },
    { id: 'istanbul', label: 'إسطنبول • تركيا', lat: 41.0082, lon: 28.9784, method: 13 },
    { id: 'new_york', label: 'نيويورك • أمريكا', lat: 40.7128, lon: -74.0060, method: 2 }
];

function resolveAudioElement(customAudioEl) {
    if (customAudioEl) return customAudioEl;
    if (typeof document === 'undefined') return null;
    return (
        document.getElementById('sanad-radio-player') ||
        document.getElementById('sanad-audio-player') ||
        document.getElementById('radio-audio-el') ||
        null
    );
}

function createSanadRadioController(elements = {}) {
    const ServiceClass =
        elements.ServiceClass ||
        (typeof SanadRadioService !== 'undefined'
            ? SanadRadioService
            : (typeof window !== 'undefined' ? window.SanadRadioService : null));

    if (typeof ServiceClass !== 'function') {
        throw new Error('SanadRadioService غير متوفر؛ تأكد من تحميل sanad-radio-service.js قبل sanad-radio-ui-bridge.js');
    }

    const audioEl = resolveAudioElement(elements.audioEl);
    let busyPromise = null;

    const runGuarded = async (fn) => {
        if (busyPromise) {
            try { await busyPromise; } catch {}
        }
        busyPromise = (async () => fn())();
        try {
            return await busyPromise;
        } finally {
            busyPromise = null;
        }
    };

    const service = new ServiceClass({
        apiBase: elements.apiBase || '/api/radio',
        audioEl,
        onStateChange: (state = {}) => {
            if (elements.locationBadgeEl) {
                const cityText = state.cityLabel || 'موقع غير محدد';
                const tzText = state.timezone ? ` (${state.timezone})` : '';
                elements.locationBadgeEl.textContent = `${cityText}${tzText}`;
            }
            if (elements.modeBadgeEl) {
                elements.modeBadgeEl.textContent = state.playing ? (state.mode || 'playing') : 'idle';
            }
            if (typeof elements.onStateChange === 'function') {
                elements.onStateChange(state);
            }
        },
        onScheduleUpdate: (schedule) => {
            if (elements.timingsBoxEl && schedule && schedule.timings) {
                const t = schedule.timings;
                elements.timingsBoxEl.textContent =
                    `الفجر: ${t.Fajr || '--:--'} | الظهر: ${t.Dhuhr || '--:--'} | العصر: ${t.Asr || '--:--'} | المغرب: ${t.Maghrib || '--:--'} | العشاء: ${t.Isha || '--:--'}`;
            }
            if (typeof elements.onScheduleUpdate === 'function') {
                elements.onScheduleUpdate(schedule);
            }
        },
        onStatusMessage: (msg) => {
            const text = String(msg || '');
            if (elements.statusEl) {
                elements.statusEl.textContent = text;
            }
            if (typeof elements.onStatusMessage === 'function') {
                elements.onStatusMessage(text);
            }
        }
    });

    return {
        service,
        cities: SANAD_PRESET_CITIES,
        start: () => runGuarded(() => (typeof service.init === 'function' ? service.init() : undefined)),
        refreshGps: () =>
            runGuarded(() =>
                typeof service.detectUserLocationAndSchedule === 'function'
                    ? service.detectUserLocationAndSchedule()
                    : undefined
            ),
        selectCityById: (cityId) => {
            const found = SANAD_PRESET_CITIES.find((c) => c.id === cityId);
            if (!found || typeof service.setManualCity !== 'function') {
                return Promise.resolve();
            }
            return runGuarded(() => service.setManualCity(found.lat, found.lon, found.label, found.method));
        },
        playRadio: (stationId, stationName, streamUrl) => {
            if (typeof service.playRadioStation !== 'function') return Promise.resolve();
            return runGuarded(() => service.playRadioStation(stationId, stationName, streamUrl));
        },
        playAdhanNow: (label) => {
            if (typeof service.playRealAdhan !== 'function') return Promise.resolve();
            return runGuarded(() => service.playRealAdhan(label));
        },
        playQuranNow: (msg) => {
            if (typeof service.playRealQuran !== 'function') return Promise.resolve();
            return runGuarded(() => service.playRealQuran(msg));
        },
        stop: () => {
            busyPromise = null;
            if (typeof service.stopAll === 'function') {
                return service.stopAll();
            }
        }
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SANAD_PRESET_CITIES, createSanadRadioController };
}
if (typeof window !== 'undefined') {
    window.SANAD_PRESET_CITIES = SANAD_PRESET_CITIES;
    window.createSanadRadioController = createSanadRadioController;
}
