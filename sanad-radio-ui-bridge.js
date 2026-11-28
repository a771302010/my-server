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

function createSanadRadioController(elements = {}) {
    const audioEl = elements.audioEl || document.getElementById('sanad-audio-player') || null;

    const service = new SanadRadioService({
        apiBase: elements.apiBase || '/api/radio',
        audioEl,
        onStateChange: (state) => {
            if (elements.locationBadgeEl) {
                elements.locationBadgeEl.textContent = `${state.cityLabel} (${state.timezone})`;
            }
            if (elements.modeBadgeEl) {
                elements.modeBadgeEl.textContent = state.playing ? state.mode : 'idle';
            }
            if (typeof elements.onStateChange === 'function') {
                elements.onStateChange(state);
            }
        },
        onScheduleUpdate: (schedule) => {
            if (elements.timingsBoxEl && schedule && schedule.timings) {
                const t = schedule.timings;
                elements.timingsBoxEl.innerHTML =
                    `الفجر: ${t.Fajr} | الظهر: ${t.Dhuhr} | العصر: ${t.Asr} | المغرب: ${t.Maghrib} | العشاء: ${t.Isha}`;
            }
            if (typeof elements.onScheduleUpdate === 'function') {
                elements.onScheduleUpdate(schedule);
            }
        },
        onStatusMessage: (msg) => {
            if (elements.statusEl) {
                elements.statusEl.textContent = msg;
            }
            if (typeof elements.onStatusMessage === 'function') {
                elements.onStatusMessage(msg);
            }
        }
    });

    return {
        service,
        cities: SANAD_PRESET_CITIES,
        start: () => service.init(),
        refreshGps: () => service.detectUserLocationAndSchedule(),
        selectCityById: (cityId) => {
            const found = SANAD_PRESET_CITIES.find(c => c.id === cityId);
            if (!found) return Promise.resolve();
            return service.setManualCity(found.lat, found.lon, found.label, found.method);
        },
        playRadio: (stationId, stationName, streamUrl) =>
            service.playRadioStation(stationId, stationName, streamUrl),
        playAdhanNow: (label) => service.playRealAdhan(label),
        playQuranNow: (msg) => service.playRealQuran(msg),
        stop: () => service.stopAll()
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SANAD_PRESET_CITIES, createSanadRadioController };
}
if (typeof window !== 'undefined') {
    window.SANAD_PRESET_CITIES = SANAD_PRESET_CITIES;
    window.createSanadRadioController = createSanadRadioController;
}
