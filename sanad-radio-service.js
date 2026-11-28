/**
 * sanad-radio-server-patch.js
 * ربط آمن ومعزول لملف السيرفر الأساسي دون التأثير على المسارات والخدمات الأخرى
 */

const { handleSanadRadioApi } = require('./sanad-radio-routes');

async function attachSanadRadioToHttpHandler(req, res, pathname) {
    return await handleSanadRadioApi(req, res, pathname);
}

function attachSanadRadioToExpress(app) {
    if (!app || typeof app.use !== 'function') return;
    app.use(async (req, res, next) => {
        try {
            const pathname = (req.url || '').split('?')[0];
            const handled = await handleSanadRadioApi(req, res, pathname);
            if (handled) return;
            next();
        } catch (err) {
            next(err);
        }
    });
}

module.exports = {
    attachSanadRadioToHttpHandler,
    attachSanadRadioToExpress
};
