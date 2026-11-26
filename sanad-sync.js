(() => {
  const WS_PROTOCOL = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const WS_URL = `${WS_PROTOCOL}//${location.host}/ws`;

  let socket = null;
  let currentId = null;
  let currentName = null;
  let reconnectTimer = null;

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
      sendRaw({ type: 'presence', online: true });
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
          detail: { peerId: data.userId, online: Boolean(data.online) }
        }));
      } else if (data.type === 'message') {
        window.dispatchEvent(new CustomEvent('sanad:message', {
          detail: { threadId: data.fromId || data.threadId, message: data.message }
        }));
        if (data.message && data.message.id) {
          sendRaw({
            type: 'receipt',
            toId: data.fromId,
            threadId: currentId,
            messageId: data.message.id,
            status: 'delivered'
          });
        }
      } else if (data.type === 'receipt') {
        window.dispatchEvent(new CustomEvent('sanad:receipt', {
          detail: {
            threadId: data.threadId || data.fromId,
            messageId: data.messageId,
            status: data.status
          }
        }));
      } else if (data.type === 'call-signal') {
        window.dispatchEvent(new CustomEvent('sanad:call-signal', { detail: data }));
      }
    });

    socket.addEventListener('close', () => {
      scheduleReconnect();
    });

    socket.addEventListener('error', () => {
      try { socket.close(); } catch {}
    });
  }

  function scheduleReconnect() {
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connect, 3000);
  }

  setInterval(() => {
    if (document.visibilityState === 'visible') {
      sendRaw({ type: 'presence', online: true });
    }
  }, 15000);

  window.sanadSync = {
    bindIdentity(userId, name) {
      currentId = String(userId || '').trim();
      currentName = String(name || '').trim();
      if (socket) {
        try { socket.close(); } catch {}
      }
      connect();
    },
    sendMessage(toId, message) {
      return sendRaw({
        type: 'message',
        fromId: currentId,
        toId,
        message
      });
    },
    markRead(peerId) {
      return sendRaw({
        type: 'read-thread',
        fromId: currentId,
        toId: peerId
      });
    },
    deleteMessageForBoth(peerId, messageId) {
      return sendRaw({
        type: 'delete-message',
        fromId: currentId,
        toId: peerId,
        messageId
      });
    },
    sendCallSignal(toId, signalData) {
      return sendRaw({
        type: 'call-signal',
        fromId: currentId,
        toId,
        signal: signalData
      });
    }
  };
})();
