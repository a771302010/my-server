/**
 * sanad-radio-routes.js
 * ريسيفرات (Routes) خاصة براديو سند والأذان والتحكم من السيرفر
 * تُربط بملف السيرفر الأساسي عبر handleSanadRadioApi دون التأثير على بقية المسارات أو الخدمات
 */

const DEFAULT_RADIO_SERVER_CONFIG = {
    adhanAudioUrl: process.env.SANAD_ADHAN_AUDIO_URL || '/sanad-adhan.mp3',
    quranStreamUrl: process.env.SANAD_QURAN_STREAM_URL || 'https://stream.radiojar.com/0tpy1h0kxtzuv',
    tracks: [
        { id: 'promo', title: 'برومو إذاعة سند', url: process.env.SANAD_LOCAL_RADIO_URL || '/sanad-radio-promo.mp3' },
        { id: 'seg2', title: 'المقطع الثاني -- إذاعة سند', url: '/sanad-seg-2.mp3' }
    ]
};

const radioRuntimeStore = {
    config: JSON.parse(JSON.stringify(DEFAULT_RADIO_SERVER_CONFIG)),
    lastClientState: null,
    updatedAt: null
};

function readJsonBody(req) {
    return new Promise((resolve, reject) => {
        let raw = '';
        req.on('data', chunk => {
            raw += chunk.toString('utf8');
            if (raw.length > 1_000_000) {
                reject(new Error('Payload too large'));
                req.destroy();
            }
        });
        req.on('end', () => {
            try {
                resolve(raw ? JSON.parse(raw) : {});
            } catch (err) {
                reject(err);
            }
        });
        req.on('error', reject);
    });
}

function sendJson(res, statusCode, payload) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
    });
    res.end(JSON.stringify(payload));
}

async function handleSanadRadioApi(req, res, pathname) {
    if (!pathname || !pathname.startsWith('/api/radio')) {
        return false;
    }

    if (pathname === '/api/radio/config' && req.method === 'GET') {
        sendJson(res, 200, {
            ok: true,
            config: radioRuntimeStore.config,
            updatedAt: radioRuntimeStore.updatedAt
        });
        return true;
    }

    if (pathname === '/api/radio/config' && req.method === 'POST') {
        try {
            const body = await readJsonBody(req);
            if (typeof body.adhanAudioUrl === 'string' && body.adhanAudioUrl.trim()) {
                radioRuntimeStore.config.adhanAudioUrl = body.adhanAudioUrl.trim();
            }
            if (typeof body.quranStreamUrl === 'string' && body.quranStreamUrl.trim()) {
                radioRuntimeStore.config.quranStreamUrl = body.quranStreamUrl.trim();
            }
            if (Array.isArray(body.tracks) && body.tracks.length) {
                radioRuntimeStore.config.tracks = body.tracks;
            }
            radioRuntimeStore.updatedAt = new Date().toISOString();
            sendJson(res, 200, { ok: true, config: radioRuntimeStore.config });
        } catch (_) {
            sendJson(res, 400, { ok: false, error: 'Invalid JSON body' });
        }
        return true;
    }

    if (pathname === '/api/radio/state' && req.method === 'POST') {
        try {
            const body = await readJsonBody(req);
            radioRuntimeStore.lastClientState = body.state || body;
            radioRuntimeStore.updatedAt = new Date().toISOString();
            sendJson(res, 200, { ok: true, receivedAt: radioRuntimeStore.updatedAt });
        } catch (_) {
            sendJson(res, 400, { ok: false, error: 'Invalid JSON body' });
        }
        return true;
    }

    if (pathname === '/api/radio/state' && req.method === 'GET') {
        sendJson(res, 200, {
            ok: true,
            state: radioRuntimeStore.lastClientState,
            updatedAt: radioRuntimeStore.updatedAt
        });
        return true;
    }

    sendJson(res, 404, { ok: false, error: 'Radio route not found' });
    return true;
}

module.exports = {
    handleSanadRadioApi,
    radioRuntimeStore
};
