(() => {
  const VALID_PANES = ['chats', 'groups', 'accounts', 'contacts', 'calls', 'ai'];

  function normalizePane(raw) {
    const clean = String(raw || '').replace(/^#?tab-/, '').trim().toLowerCase();
    return VALID_PANES.includes(clean) ? clean : 'chats';
  }

  function applyPaneDisplay(paneName) {
    const pane = normalizePane(paneName);
    const panes = document.querySelectorAll('[data-pane]');
    panes.forEach((el) => {
      const isMatch = el.getAttribute('data-pane') === pane;
      el.classList.toggle('is-active', isMatch);
      el.style.display = isMatch ? 'block' : 'none';
    });

    const navBtns = document.querySelectorAll('[data-nav-pane]');
    navBtns.forEach((btn) => {
      const target = normalizePane(btn.getAttribute('data-nav-pane'));
      const active = target === pane;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    const nextHash = `#tab-${pane}`;
    if (window.location.hash !== nextHash) {
      try {
        history.replaceState(null, '', nextHash);
      } catch (_) {
        window.location.hash = nextHash;
      }
    }
  }

  function setPane(paneName, { syncServer = true } = {}) {
    const pane = normalizePane(paneName);
    window.SanadState.setState((prev) => ({
      ...prev,
      activePane: pane,
      unreadByPane: {
        ...prev.unreadByPane,
        [pane]: 0
      }
    }), 'pane-change');

    applyPaneDisplay(pane);

    if (syncServer && window.SanadRealtime && typeof window.SanadRealtime.requestSync === 'function') {
      window.SanadRealtime.requestSync();
    }
  }

  function updateConnectionBadge(stateObj) {
    const badge = document.getElementById('sanad-connection-badge');
    const textEl = document.getElementById('sanad-connection-text');
    if (!badge || !textEl) return;

    const status = !navigator.onLine ? 'offline' : (stateObj.connectionState || 'connecting');
    badge.className = `conn-badge conn-${status}`;

    const labelMap = {
      connected: 'متصل ومزامن',
      connecting: 'جاري الاتصال بالسيرفر...',
      reconnecting: 'إعادة الاتصال تلقائياً...',
      offline: 'غير متصل بالإنترنت'
    };
    textEl.textContent = labelMap[status] || 'متصل';

    const panes = ['chats', 'groups', 'accounts', 'contacts', 'calls', 'ai'];
    for (const p of panes) {
      const count = Number(stateObj.unreadByPane?.[p] || 0);
      document.querySelectorAll(`[data-unread-for="${p}"]`).forEach((el) => {
        el.textContent = count > 0 ? String(count) : '';
        el.style.display = count > 0 ? 'inline-flex' : 'none';
      });
    }
  }

  function bindNavigation() {
    document.querySelectorAll('[data-nav-pane]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const target = btn.getAttribute('data-nav-pane');
        setPane(target);
      });
    });

    window.addEventListener('hashchange', () => {
      const fromHash = normalizePane(window.location.hash);
      setPane(fromHash, { syncServer: false });
    });

    window.addEventListener('online', () => {
      window.SanadState.setState({ connectionState: 'reconnecting' }, 'online');
      window.SanadRealtime?.connectWs?.();
      window.SanadRealtime?.flushOutbox?.();
    });

    window.addEventListener('offline', () => {
      window.SanadState.setState({ connectionState: 'offline' }, 'offline');
    });

    const initialPane = normalizePane(window.location.hash || window.SanadState.getState().activePane);
    window.SanadState.setState({ activePane: initialPane }, 'init-pane');
    applyPaneDisplay(initialPane);
    updateConnectionBadge(window.SanadState.getState());

    window.SanadState.subscribe((st) => {
      applyPaneDisplay(st.activePane);
      updateConnectionBadge(st);
    });
  }

  window.SanadNav = {
    setPane,
    applyPaneDisplay,
    updateConnectionBadge,
    bindNavigation
  };
})();
