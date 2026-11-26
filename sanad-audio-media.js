'use strict';

(function (global) {
  const MAX_VIDEO_SECONDS = 300;
  const SOUND_MAP = {
    message: './sounds/message.mp3',
    call: './sounds/call.mp3',
    alert: './sounds/alert.mp3',
  };

  let lastPlayedMap = new Map();
  let audioCtx = null;

  function getAudioContext() {
    if (typeof global.AudioContext !== 'undefined') {
      if (!audioCtx) audioCtx = new global.AudioContext();
      return audioCtx;
    }
    if (typeof global.webkitAudioContext !== 'undefined') {
      if (!audioCtx) audioCtx = new global.webkitAudioContext();
      return audioCtx;
    }
    return null;
  }

  function playToneFallback(type = 'message') {
    const ctx = getAudioContext();
    if (!ctx) return false;
    try {
      if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
        ctx.resume().catch(() => {});
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const freq = type === 'call' ? 660 : type === 'alert' ? 520 : 880;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.23);
      return true;
    } catch (_) {
      return false;
    }
  }

  function playNotificationSound(type = 'message', options = {}) {
    if (options.muted === true) return false;
    const key = String(type || 'message');
    const now = Date.now();
    const prev = lastPlayedMap.get(key) || 0;
    if (now - prev < 900) {
      return false;
    }
    lastPlayedMap.set(key, now);

    const src = options.src || SOUND_MAP[key] || SOUND_MAP.message;
    if (typeof global.Audio === 'function') {
      try {
        const el = new global.Audio(src);
        el.volume = typeof options.volume === 'number' ? Math.max(0, Math.min(1, options.volume)) : 0.8;
        const p = el.play();
        if (p && typeof p.catch === 'function') {
          p.catch(() => {
            playToneFallback(key);
          });
        }
        return true;
      } catch (_) {
        return playToneFallback(key);
      }
    }
    return playToneFallback(key);
  }

  function checkVideoDurationSeconds(videoElOrSeconds) {
    const seconds =
      typeof videoElOrSeconds === 'number'
        ? videoElOrSeconds
        : Number((videoElOrSeconds && videoElOrSeconds.duration) || 0);

    if (!Number.isFinite(seconds) || seconds <= 0) {
      return { ok: true, durationSeconds: 0, maxSeconds: MAX_VIDEO_SECONDS };
    }
    if (seconds > MAX_VIDEO_SECONDS) {
      return {
        ok: false,
        durationSeconds: seconds,
        maxSeconds: MAX_VIDEO_SECONDS,
        message: 'مدة الفيديو تتجاوز 5 دقائق (300 ثانية)',
      };
    }
    return { ok: true, durationSeconds: seconds, maxSeconds: MAX_VIDEO_SECONDS };
  }

  const SanadAudioMedia = {
    MAX_VIDEO_SECONDS,
    SOUND_MAP,
    playNotificationSound,
    checkVideoDurationSeconds,
  };

  global.SanadAudioMedia = SanadAudioMedia;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SanadAudioMedia;
  }
})(typeof window !== 'undefined' ? window : globalThis);
