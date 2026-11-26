(() => {
  const WS_PROTOCOL = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const WS_URL = `${WS_PROTOCOL}//${location.host}/ws`;

  let socket = null;
  let currentId = null;
  let currentName = null;
  let reconnectTimer = null;

  function normalizeId(raw) {
    return String(raw || '').replace(/[^\d+]/g, '').trim();
  }

  function sendRaw(payload) {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
      return true;
    }
    return false;
  }

  function connect() {
    if (!currentId) return;
    try {
      socket = new WebSocket(WS_URL);
    } catch {
      scheduleReconnect();
      return;
    }

    socket.addEventListener('open', () => {
      sendRaw({ type: 'auth', userId: currentId, name: currentName || currentId });
      sendRaw({ type: 'presence', fromId: currentId, online: true });
    });

    socket.addEventListener('message', (event) => {
      let data = null;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }
      if (!data || !data.type) return;

      if (data.type === 'presence') {
        window.dispatchEvent(new CustomEvent('sanad:presence', {
          detail: { peerId: normalizeId(data.userId), online: Boolean(data.online) }
        }));
      } else if (data.type === 'message') {
        const senderId = normalizeId(data.fromId || data.threadId);
        window.dispatchEvent(new CustomEvent('sanad:message', {
          detail: { threadId: senderId, message: data.message }
        }));
        if (data.message && data.message.id) {
          sendRaw({
            type: 'receipt',
            fromId: currentId,
            toId: senderId,
            messageId: data.message.id,
            status: 'delivered'
          });
        }
      } else if (data.type === 'receipt') {
        window.dispatchEvent(new CustomEvent('sanad:receipt', {
          detail: {
            threadId: normalizeId(data.threadId || data.fromId),
            messageId: data.messageId,
            status: data.status
          }
        }));
      } else if (data.type === 'call-signal') {
        window.dispatchEvent(new CustomEvent('sanad:call-signal', {
          detail: Object.assign({}, data, { fromId: normalizeId(data.fromId) })
        }));
      }
    });

    socket.addEventListener('close', () => scheduleReconnect());
    socket.addEventListener('error', () => {
      try { socket.close(); } catch {}
    });
  }

  function scheduleReconnect() {
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connect, 2500);
  }

  setInterval(() => {
    if (currentId && document.visibilityState === 'visible') {
      sendRaw({ type: 'presence', fromId: currentId, online: true });
    }
  }, 12000);

  window.sanadSync = {
    bindIdentity(userId, name) {
      const clean = normalizeId(userId);
      if (!clean) return;
      currentId = clean;
      currentName = String(name || clean).trim();
      if (socket) {
        try { socket.close(); } catch {}
      }
      connect();
    },
    sendMessage(toId, message) {
      const target = normalizeId(toId);
      if (!currentId || !target) return false;
      return sendRaw({
        type: 'message',
        fromId: currentId,
        toId: target,
        message
      });
    },
    markRead(peerId) {
      const target = normalizeId(peerId);
      if (!currentId || !target) return false;
      return sendRaw({
        type: 'read-thread',
        fromId: currentId,
        toId: target
      });
    },
    sendCallSignal(toId, signalData) {
      const target = normalizeId(toId);
      if (!currentId || !target) return false;
      return sendRaw({
        type: 'call-signal',
        fromId: currentId,
        toId: target,
        signal: signalData
      });
    }
  };
})();
