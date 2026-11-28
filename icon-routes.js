const fs = require('fs');
const path = require('path');
const { getIconAssetForRoute } = require('./icon-asset'); // عدّل المسار حسب اسم ملفك الأصلي

function registerIconRoutes(app, options = {}) {
    const manifestPath = options.manifestPath || path.join(__dirname, 'manifest.webmanifest');
    const iconRoutes = ['/icon.svg', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png', '/favicon.ico'];

    app.get(iconRoutes, (req, res) => {
        try {
            const routeKey = req.path === '/apple-touch-icon.png' || req.path === '/favicon.ico'
                ? '/icon-192.png'
                : req.path;

            const asset = getIconAssetForRoute(routeKey);
            res.setHeader('Content-Type', asset.mimeType);
            res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
            return res.status(200).send(asset.buffer);
        } catch (err) {
            return res.status(500).json({ error: 'Failed to load icon asset' });
        }
    });

    app.get(['/manifest.webmanifest', '/manifest.json'], (req, res) => {
        try {
            if (fs.existsSync(manifestPath) && fs.statSync(manifestPath).isFile()) {
                const content = fs.readFileSync(manifestPath, 'utf8');
                res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
                res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
                return res.status(200).send(content);
            }
            return res.status(404).json({ error: 'Manifest not found' });
        } catch (err) {
            return res.status(500).json({ error: 'Failed to load manifest' });
        }
    });
}

module.exports = {
    registerIconRoutes
};
