(() => {
  let ws = null;
  let reconnectAttempt = 0;
  let reconnectTimer = null;
  let heartbeatTimer = null;
  let isSyncing = false;

  function getWsUrl() {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}`;
  }

  function registerCurrentPeer() {
    const acc = window.SanadState.getActiveAccount();
    const peerId = window.SanadState.cleanId(acc?.id);
    if (!peerId || !ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({
      type: 'register',
      from: peerId,
      fromName: acc.name || peerId
    }));
  }

  function connectWs() {
    if (!navigator.onLine) {
      window.SanadState.setState({ connectionState: 'offline' }, 'ws-offline');
      return;
    }
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    clearTimeout(reconnectTimer);
    window.SanadState.setState({
      connectionState: reconnectAttempt > 0 ? 'reconnecting' : 'connecting'
    }, 'ws-connecting');

    try {
      ws = new WebSocket(getWsUrl());
    } catch (_) {
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      reconnectAttempt = 0;
      window.SanadState.setState({ connectionState: 'connected' }, 'ws-open');
      registerCurrentPeer();
      flushOutbox();
      requestSync();

      clearInterval(heartbeatTimer);
      heartbeatTimer = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          const acc = window.SanadState.getActiveAccount();
          ws.send(JSON.stringify({
            type: 'heartbeat',
            from: window.SanadState.cleanId(acc?.id),
            fromName: acc?.name || ''
          }));
        }
      }, 25000);
    };

    ws.onmessage = (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch (_) {
        return;
      }
      if (!msg || typeof msg !== 'object') return;

      if (msg.type === 'hello' || msg.type === 'presence' || msg.type === 'pong') {
        if (msg.presence) {
          window.SanadState.setState({ presence: msg.presence }, 'presence');
        }
        return;
      }

      if (msg.type === 'ack') {
        const targetId = msg.clientMsgId || msg.msgId;
        window.SanadState.setState((prev) => ({
          ...prev,
          outbox: prev.outbox.filter((item) => item.id !== targetId && item.clientMsgId !== targetId),
          messages: prev.messages.map((m) =>
            (m.id === targetId || m.clientMsgId === targetId) ? { ...m, status: 'sent' } : m
          )
        }), 'msg-ack');
        return;
      }

      if (msg.type === 'chat') {
        const st = window.SanadState.getState();
        const myId = window.SanadState.cleanId(st.activeAccountId);
        const fromId = window.SanadState.cleanId(msg.from);

        window.SanadState.setState((prev) => {
          const exists = prev.messages.some((m) => m.id === msg.id || (msg.clientMsgId && m.clientMsgId === msg.clientMsgId));
          const nextMsgs = exists
            ? prev.messages.map((m) => (m.id === msg.id ? { ...m, ...msg } : m))
            : [...prev.messages, msg];

          let nextUnread = { ...prev.unreadByPane };
          if (fromId !== myId) {
            if (msg.groupId && prev.activePane !== 'groups') {
              nextUnread.groups = (nextUnread.groups || 0) + 1;
            } else if (!msg.groupId && prev.activePane !== 'chats') {
              nextUnread.chats = (nextUnread.chats || 0) + 1;
            }
          }
          return { ...prev, messages: nextMsgs, unreadByPane: nextUnread };
        }, 'chat-in');

        if (fromId !== myId) {
          sendReceipt(msg.id, fromId, 'delivered');
        }
        return;
      }

      if (msg.type === 'receipt') {
        window.SanadState.setState((prev) => ({
          ...prev,
          messages: prev.messages.map((m) =>
            (m.id === msg.msgId || m.clientMsgId === msg.msgId) ? { ...m, status: msg.status } : m
          )
        }), 'receipt-in');
        return;
      }

      if (msg.type === 'edit_delete' && msg.updated) {
        window.SanadState.setState((prev) => ({
          ...prev,
          messages: prev.messages.map((m) => (m.id === msg.updated.id ? { ...m, ...msg.updated } : m))
        }), 'edit-delete-in');
        return;
      }

      if (msg.type === 'group_sync' && msg.group) {
        window.SanadState.setState((prev) => {
          const exists = prev.groups.some((g) => g.id === msg.group.id);
          return {
            ...prev,
            groups: exists ? prev.groups.map((g) => (g.id === msg.group.id ? msg.group : g)) : [...prev.groups, msg.group]
          };
        }, 'group-sync-in');
        return;
      }

      if (msg.type && (msg.type.startsWith('call_') || msg.type === 'group_call_state')) {
        window.SanadCalls?.handleSignalMessage?.(msg);
      }
    };

    ws.onclose = () => {
      clearInterval(heartbeatTimer);
      scheduleReconnect();
    };

    ws.onerror = () => {
      try { ws.close(); } catch (_) {}
    };
  }

  function scheduleReconnect() {
    if (!navigator.onLine) {
      window.SanadState.setState({ connectionState: 'offline' }, 'reconnect-offline');
      return;
    }
    reconnectAttempt += 1;
    const delay = window.SanadState.computeBackoffMs(reconnectAttempt);
    window.SanadState.setState({ connectionState: 'reconnecting' }, 'reconnect-wait');
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => connectWs(), delay);
  }

  function enqueueAndSendMessage(msgObj) {
    window.SanadState.setState((prev) => {
      const exists = prev.messages.some((m) => m.id === msgObj.id);
      return {
        ...prev,
        messages: exists ? prev.messages : [...prev.messages, msgObj],
        outbox: [...prev.outbox.filter((o) => o.id !== msgObj.id), msgObj]
      };
    }, 'enqueue-msg');

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        ...msgObj,
        type: 'chat'
      }));
    } else {
      requestSync();
    }
  }

  function flushOutbox() {
    const st = window.SanadState.getState();
    if (!st.outbox.length) return;
    if (ws && ws.readyState === WebSocket.OPEN) {
      for (const item of st.outbox) {
        ws.send(JSON.stringify({ ...item, type: 'chat' }));
      }
    }
  }

  function sendReceipt(msgId, to, status = 'delivered') {
    const acc = window.SanadState.getActiveAccount();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'receipt',
        msgId,
        from: window.SanadState.cleanId(acc?.id),
        to: window.SanadState.cleanId(to),
        status
      }));
    }
  }

  function sendEditOrDelete(payload) {
    const acc = window.SanadState.getActiveAccount();
    window.SanadState.setState((prev) => ({
      ...prev,
      messages: prev.messages.map((m) => {
        if (m.id !== payload.msgId) return m;
        if (payload.action === 'delete') return { ...m, deletedForAll: true, text: 'تم حذف هذه الرسالة', mediaUrl: '' };
        if (payload.action === 'edit') return { ...m, text: payload.text, editedAt: Date.now() };
        return m;
      })
    }), 'local-edit-delete');

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'edit_delete',
        from: window.SanadState.cleanId(acc?.id),
        ...payload
      }));
    }
  }

  function sendTyping(to, isTyping = true) {
    const acc = window.SanadState.getActiveAccount();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'typing',
        from: window.SanadState.cleanId(acc?.id),
        fromName: acc?.name || '',
        to: window.SanadState.cleanId(to),
        isTyping
      }));
    }
  }

  function sendGroupSync(groupObj) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'group_sync', group: groupObj }));
    }
  }

  function sendSignal(payload) {
    const acc = window.SanadState.getActiveAccount();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        ...payload,
        from: window.SanadState.cleanId(acc?.id)
      }));
    }
  }

  async function requestSync() {
    if (isSyncing) return;
    isSyncing = true;
    try {
      const st = window.SanadState.getState();
      const acc = window.SanadState.getActiveAccount();
      const peerId = window.SanadState.cleanId(acc?.id);
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          peerId,
          account: acc,
          messages: st.outbox.slice(-50),
          groups: st.groups
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.ok) {
        window.SanadState.setState((prev) => {
          const map = new Map();
          for (const m of prev.messages) map.set(m.id, m);
          for (const m of (data.messages || [])) {
            const existing = map.get(m.id);
            map.set(m.id, existing ? { ...existing, ...m } : m);
          }

          const mergedGroups = [...prev.groups];
          for (const g of (data.groups || [])) {
            const idx = mergedGroups.findIndex((x) => x.id === g.id);
            if (idx >= 0) mergedGroups[idx] = { ...mergedGroups[idx], ...g };
            else mergedGroups.push(g);
          }

          return {
            ...prev,
            connectionState: 'connected',
            lastSyncAt: Date.now(),
            messages: Array.from(map.values()).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0)),
            groups: mergedGroups,
            presence: { ...(prev.presence || {}), ...(data.presence || {}) }
          };
        }, 'sync-ok');
      }
    } catch (_) {
      if (navigator.onLine) {
        window.SanadState.setState({ connectionState: 'reconnecting' }, 'sync-retry');
      }
    } finally {
      isSyncing = false;
    }
  }

  window.SanadRealtime = {
    connectWs,
    registerCurrentPeer,
    enqueueAndSendMessage,
    flushOutbox,
    sendReceipt,
    sendEditOrDelete,
    sendTyping,
    sendGroupSync,
    sendSignal,
    requestSync
  };
})();
