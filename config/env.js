const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

const config = {
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  version: '9.0.0',
  rootDir: ROOT_DIR,
  publicDir: path.join(ROOT_DIR, 'public'),
  dataDir: path.resolve(ROOT_DIR, process.env.DATA_DIR || 'storage/data'),
  mediaDir: path.resolve(ROOT_DIR, process.env.MEDIA_DIR || 'storage/media'),
  maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES || 15 * 1024 * 1024),
  openaiApiKey: (process.env.OPENAI_API_KEY || '').trim(),
  openaiModel: (process.env.OPENAI_MODEL || 'gpt-4o-mini').trim(),
  vapidPublicKey: (process.env.VAPID_PUBLIC_KEY || '').trim(),
  vapidPrivateKey: (process.env.VAPID_PRIVATE_KEY || '').trim(),
  vapidSubject: (process.env.VAPID_SUBJECT || 'mailto:support@sanad.local').trim(),
  heartbeatIntervalMs: 25000,
  presenceTtlMs: 65000,
  maxBackoffMs: 15000
};

function computeBackoffMs(attempt = 1) {
  const safeAttempt = Math.max(1, Number(attempt) || 1);
  const base = Math.min(config.maxBackoffMs, 600 * Math.pow(1.65, safeAttempt - 1));
  const jitter = Math.floor(Math.random() * 250);
  return Math.round(base + jitter);
}

module.exports = { config, computeBackoffMs };
