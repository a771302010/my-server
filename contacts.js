(() => {
  function renderAccountsAndContacts() {
    const st = window.SanadState.getState();
    const activeId = window.SanadState.cleanId(st.activeAccountId);

    const accListEl = document.getElementById('accounts-list');
    if (accListEl) {
      accListEl.innerHTML = st.accounts.map((acc) => {
        const aid = window.SanadState.cleanId(acc.id);
        const isCurrent = aid === activeId;
        return `
          <div class="list-card ${isCurrent ? 'card-active' : ''}">
            <div>
              <strong>${acc.name || aid}</strong>
              <div class="muted">${aid} • ${acc.role || 'مستخدم'} ${acc.verified ? '• مفعّل ✓' : ''}</div>
            </div>
            <div class="card-actions">
              <button type="button" class="btn-secondary" data-switch-account="${aid}">${isCurrent ? 'الحساب النشط' : 'تفعيل الحساب'}</button>
            </div>
          </div>`;
      }).join('');
    }

    const contactsEl = document.getElementById('contacts-list');
    if (contactsEl) {
      contactsEl.innerHTML = st.contacts.map((c) => {
        const cid = window.SanadState.cleanId(c.id);
        const pres = window.SanadState.getPresenceStatus(cid);
        return `
          <div class="list-card">
            <div>
              <strong>${c.name || cid}</strong>
              <div class="muted">${cid} • ${c.role || 'جهة اتصال'} • <span class="${pres.online ? 'online-dot' : 'offline-dot'}">${pres.label}</span></div>
            </div>
            <div class="card-actions">
              <button type="button" class="btn-primary btn-sm" data-chat-contact="${cid}">مراسلة</button>
              <button type="button" class="btn-secondary btn-sm" data-call-contact="${cid}">اتصال</button>
            </div>
          </div>`;
      }).join('');
    }
  }

  function addAccount() {
    const idInput = document.getElementById('new-account-id');
    const nameInput = document.getElementById('new-account-name');
    const roleInput = document.getElementById('new-account-role');

    const cleanId = window.SanadState.cleanId(idInput?.value || '');
    if (!cleanId) {
      alert('يرجى إدخال رقم هاتف أو معرّف صحيح للحساب.');
      return;
    }

    const name = nameInput?.value.trim() || `حساب ${cleanId}`;
    const role = roleInput?.value.trim() || 'مستخدم سند';

    window.SanadState.setState((prev) => {
      const exists = prev.accounts.some((a) => window.SanadState.cleanId(a.id) === cleanId);
      const nextAccounts = exists
        ? prev.accounts.map((a) => (window.SanadState.cleanId(a.id) === cleanId ? { ...a, name, role, verified: true } : a))
        : [...prev.accounts, { id: cleanId, name, role, verified: true }];

      return {
        ...prev,
        accounts: nextAccounts,
        activeAccountId: cleanId
      };
    }, 'add-account');

    window.SanadRealtime?.registerCurrentPeer?.();
    if (idInput) idInput.value = '';
    if (nameInput) nameInput.value = '';
    renderAccountsAndContacts();
  }

  function addContact() {
    const idInput = document.getElementById('new-contact-id');
    const nameInput = document.getElementById('new-contact-name');
    const roleInput = document.getElementById('new-contact-role');

    const cleanId = window.SanadState.cleanId(idInput?.value || '');
    if (!cleanId) {
      alert('يرجى إدخال رقم أو معرّف صحيح لجهة الاتصال.');
      return;
    }

    const name = nameInput?.value.trim() || cleanId;
    const role = roleInput?.value.trim() || 'عميل / زميل';

    window.SanadState.setState((prev) => {
      const filtered = prev.contacts.filter((c) => window.SanadState.cleanId(c.id) !== cleanId);
      return {
        ...prev,
        contacts: [{ id: cleanId, name, role, blocked: false, favorite: false }, ...filtered],
        selectedPeerId: cleanId
      };
    }, 'add-contact');

    if (idInput) idInput.value = '';
    if (nameInput) nameInput.value = '';
    renderAccountsAndContacts();
  }

  function bindContacts() {
    document.getElementById('add-account-btn')?.addEventListener('click', addAccount);
    document.getElementById('add-contact-btn')?.addEventListener('click', addContact);

    document.getElementById('accounts-list')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-switch-account]');
      if (!btn) return;
      const aid = window.SanadState.cleanId(btn.getAttribute('data-switch-account'));
      if (!aid) return;
      window.SanadState.setState({ activeAccountId: aid }, 'switch-account');
      window.SanadRealtime?.registerCurrentPeer?.();
      renderAccountsAndContacts();
    });

    document.getElementById('contacts-list')?.addEventListener('click', (e) => {
      const chatBtn = e.target.closest('[data-chat-contact]');
      if (chatBtn) {
        const cid = window.SanadState.cleanId(chatBtn.getAttribute('data-chat-contact'));
        window.SanadState.setState({ selectedPeerId: cid }, 'chat-contact');
        window.SanadNav?.setPane?.('chats');
        return;
      }
      const callBtn = e.target.closest('[data-call-contact]');
      if (callBtn) {
        const cid = window.SanadState.cleanId(callBtn.getAttribute('data-call-contact'));
        const targetInput = document.getElementById('call-target-input');
        if (targetInput) targetInput.value = cid;
        window.SanadNav?.setPane?.('calls');
      }
    });

    renderAccountsAndContacts();
    window.SanadState.subscribe(() => renderAccountsAndContacts());
  }

  window.SanadContacts = { bindContacts, renderAccountsAndContacts };
})();
