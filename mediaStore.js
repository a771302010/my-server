const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { config } = require('../config/env');

const MIME_EXT = {
  'audio/webm': '.webm',
  'audio/ogg': '.ogg',
  'audio/mpeg': '.mp3',
  'audio/mp4': '.m4a',
  'audio/wav': '.wav',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'application/pdf': '.pdf',
  'text/plain': '.txt'
};

function sanitizeName(name = 'file') {
  return String(name || 'file')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 80) || 'file';
}

function saveBase64Media({ dataUrl, fileName = 'attachment', mimeType = 'application/octet-stream' }) {
  if (!dataUrl || typeof dataUrl !== 'string') {
    throw new Error('بيانات الملف غير صالحة');
  }
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  const resolvedMime = (match && match[1]) || mimeType || 'application/octet-stream';
  const base64Payload = match ? match[2] : dataUrl;
  const buffer = Buffer.from(base64Payload, 'base64');

  if (!buffer.length) {
    throw new Error('الملف فارغ');
  }
  if (buffer.length > config.maxUploadBytes) {
    throw new Error('حجم الملف يتجاوز الحد المسموح');
  }

  fs.mkdirSync(config.mediaDir, { recursive: true });
  const ext = path.extname(fileName) || MIME_EXT[resolvedMime] || '.bin';
  const id = crypto.randomBytes(10).toString('hex');
  const safeBase = sanitizeName(path.basename(fileName, path.extname(fileName)));
  const diskName = `${Date.now()}-${id}-${safeBase}${ext}`;
  const fullPath = path.join(config.mediaDir, diskName);

  fs.writeFileSync(fullPath, buffer);

  return {
    id,
    diskName,
    mediaUrl: `/api/media/${encodeURIComponent(diskName)}`,
    mediaName: sanitizeName(fileName),
    mediaType: resolvedMime,
    mediaSize: buffer.length
  };
}

function resolveMediaPath(diskName) {
  const clean = path.basename(String(diskName || ''));
  if (!clean || clean.includes('..')) return null;
  const full = path.join(config.mediaDir, clean);
  if (!fs.existsSync(full)) return null;
  return full;
}

module.exports = { saveBase64Media, resolveMediaPath };
