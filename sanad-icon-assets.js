const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ICON_BG_HEX = '#164e63';
const ICON_ACCENT_HEX = '#f0fdfa';
const ICON_SUB_HEX = '#0f3646';

function resolveOfficialIconSource() {
    const candidates = [
        process.env.SANAD_ICON_FILE,
        path.join(__dirname, 'sanad-icon.png'),
        path.join(__dirname, 'sanad-icon.jpg'),
        path.join(__dirname, 'sanad-icon.jpeg'),
        path.join(__dirname, 'IMG_5961_2.jpeg'),
        path.join(__dirname, 'IMG_5961.jpeg')
    ].filter(Boolean);

    for (const filePath of candidates) {
        try {
            if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                const buf = fs.readFileSync(filePath);
                const ext = path.extname(filePath).toLowerCase();
                const mimeType =
                    ext === '.png' ? 'image/png' :
                    (ext === '.jpg' || ext === '.jpeg') ? 'image/jpeg' :
                    ext === '.webp' ? 'image/webp' :
                    'image/png';
                return { buffer: buf, mimeType, filePath };
            }
        } catch (e) {}
    }
    return null;
}

const crcTable = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
            c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
        }
        t[n] = c >>> 0;
    }
    return t;
})();

function crc32Buf(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
        c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(typeStr, dataBuf) {
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(dataBuf.length, 0);
    const typeBuf = Buffer.from(typeStr, 'ascii');
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32Buf(Buffer.concat([typeBuf, dataBuf])), 0);
    return Buffer.concat([lenBuf, typeBuf, dataBuf, crcBuf]);
}

function buildFallbackShieldPng(size) {
    const w = size;
    const h = size;
    const raw = Buffer.alloc((w * 4 + 1) * h);
    const cx = w * 0.5;
    const cy = h * 0.54;
    const rScale = w / 512;

    for (let y = 0; y < h; y++) {
        const rowStart = y * (w * 4 + 1);
        raw[rowStart] = 0;
        const ny = y / h;

        for (let x = 0; x < w; x++) {
            const nx = x / w;
            const gradT = Math.min(1, Math.max(0, nx * 0.45 + ny * 0.75));
            let r = Math.round(17 + gradT * 7);
            let g = Math.round(78 - gradT * 34);
            let b = Math.round(98 - gradT * 36);

            const dx = (x - cx) / rScale;
            const dy = (y - cy) / rScale;
            const dist = Math.hypot(dx, dy);

            const glow = Math.max(0, 1 - dist / 150);
            if (glow > 0) {
                r = Math.min(255, Math.round(r + glow * 45));
                g = Math.min(255, Math.round(g + glow * 95));
                b = Math.min(255, Math.round(b + glow * 105));
            }

            const shieldW = 136;
            const shieldTop = -84;
            const shieldBottom = 132;
            let maxHalfW = shieldW;
            if (dy > 15) {
                const tBottom = Math.min(1, (dy - 15) / (shieldBottom - 15));
                maxHalfW = shieldW * (1 - Math.pow(tBottom, 1.15));
            }
            if (dy >= shieldTop && dy <= shieldBottom && Math.abs(dx) <= maxHalfW) {
                const edgeDist = Math.min(maxHalfW - Math.abs(dx), dy - shieldTop, shieldBottom - dy);
                if (edgeDist < 10) {
                    r = 224; g = 247; b = 250;
                } else {
                    r = 12; g = 46; b = 64;
                }
            }

            const starVal = Math.pow(Math.max(0, 1 - Math.abs(dx) / 34), 1.6) + Math.pow(Math.max(0, 1 - Math.abs(dy) / 34), 1.6);
            if (starVal > 1.38) {
                r = 250; g = 253; b = 255;
            }

            const idx = rowStart + 1 + x * 4;
            raw[idx] = r;
            raw[idx + 1] = g;
            raw[idx + 2] = b;
            raw[idx + 3] = 255;
        }
    }

    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(w, 0);
    ihdr.writeUInt32BE(h, 4);
    ihdr[8] = 8;
    ihdr[9] = 6;
    const idat = zlib.deflateSync(raw, { level: 6 });
    return Buffer.concat([
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
        pngChunk('IHDR', ihdr),
        pngChunk('IDAT', idat),
        pngChunk('IEND', Buffer.alloc(0))
    ]);
}

const fallback192 = buildFallbackShieldPng(192);
const fallback512 = buildFallbackShieldPng(512);

const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="sanadBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#155e75"/>
      <stop offset="55%" stop-color="${ICON_BG_HEX}"/>
      <stop offset="100%" stop-color="${ICON_SUB_HEX}"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#sanadBgGrad)"/>
  <g transform="translate(256, 266)">
    <path d="M 0 -138 C 16 -152 44 -152 60 -138 M -24 -116 C 0 -142 36 -142 60 -116" stroke="#e0f2fe" stroke-width="8" stroke-linecap="round" fill="none"/>
    <path d="M -126 -76 L 126 -76 L 126 24 C 126 96 68 142 0 166 C -68 142 -126 96 -126 24 Z" fill="#0c2f42" stroke="#bae6fd" stroke-width="10" stroke-linejoin="round"/>
    <circle cx="0" cy="16" r="54" fill="none" stroke="#a5f3fc" stroke-width="2.5" stroke-dasharray="8 6"/>
    <path d="M 0 -22 L 8 -8 L 22 0 L 8 8 L 0 22 L -8 8 L -22 0 L -8 -8 Z" fill="#ffffff"/>
  </g>
  <text x="256" y="476" text-anchor="middle" fill="${ICON_ACCENT_HEX}" font-family="'IBM Plex Sans Arabic', 'Cairo', 'Tahoma', sans-serif" font-size="42" font-weight="700">سند • Sanad</text>
</svg>`;

function getIconAssetForRoute(routePath) {
    const official = resolveOfficialIconSource();
    if (official) {
        return { buffer: official.buffer, mimeType: official.mimeType };
    }
    if (routePath === '/icon.svg') {
        return { buffer: Buffer.from(fallbackSvg, 'utf8'), mimeType: 'image/svg+xml; charset=utf-8' };
    }
    if (routePath === '/icon-512.png') {
        return { buffer: fallback512, mimeType: 'image/png' };
    }
    return { buffer: fallback192, mimeType: 'image/png' };
}

module.exports = {
    getIconAssetForRoute
};
