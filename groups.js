(() => {
  function getActiveGroup() {
    const st = window.SanadState.getState();
    return st.groups.find((g) => g.id === st.selectedGroupId) || st.groups[0] || null;
  }

  function renderGroups() {
    const select = document.getElementById('group-select');
    const membersEl = document.getElementById('group-members-info');
    const msgsEl = document.getElementById('group-messages-list');
    const st = window.SanadState.getState();
    const myId = window.SanadState.cleanId(st.activeAccountId);
    const activeGrp = getActiveGroup();

    if (select) {
      select.innerHTML = st.groups
        .map((g) => `<option value="${g.id}" ${activeGrp && g.id === activeGrp.id ? 'selected' : ''}>${g.name} (${(g.members || []).length} أعضاء)</option>`)
        .join('');
    }

    if (membersEl && activeGrp) {
      membersEl.textContent = `الأعضاء: ${(activeGrp.members || []).join(' ، ') || 'لا يوجد'} — ${activeGrp.description || ''}`;
    }

    if (!msgsEl) return;
    if (!activeGrp) {
      msgsEl.innerHTML = '<div class="empty-hint">لا توجد مجموعة محددة. أنشئ مجموعة جديدة للبدء.</div>';
      return;
    }

    const gMsgs = st.messages.filter((m) => m.groupId === activeGrp.id);
    if (!gMsgs.length) {
      msgsEl.innerHTML = '<div class="empty-hint">لا توجد رسائل في هذه المجموعة بعد.</div>';
      return;
    }

    msgsEl.innerHTML = gMsgs.map((m) => {
      const mine = window.SanadState.cleanId(m.from) === myId;
      const timeStr = new Date(Number(m.timestamp || Date.now())).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
      return `
        <div class="msg-row ${mine ? 'msg-mine' : 'msg-theirs'}">
          <div class="msg-bubble">
            <div class="msg-sender">${m.fromName || m.from}</div>
            <div class="msg-text">${m.deletedForAll ? 'تم حذف هذه الرسالة' : (m.text || '')}</div>
            <div class="msg-footer"><span>${timeStr}</span></div>
          </div>
        </div>`;
    }).join('');
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  function createGroup() {
    const nameInput = document.getElementById('new-group-name');
    const membersInput = document.getElementById('new-group-members');
    const descInput = document.getElementById('new-group-desc');
    const name = nameInput?.value.trim();
    if (!name) {
      alert('يرجى إدخال اسم المجموعة.');
      return;
    }

    const st = window.SanadState.getState();
    const myId = window.SanadState.cleanId(st.activeAccountId);
    const extraMembers = (membersInput?.value || '')
      .split(/[,،\s]+/)
      .map((x) => window.SanadState.cleanId(x))
      .filter(Boolean);

    const groupObj = {
      id: `grp-${Date.now()}`,
      name,
      description: descInput?.value.trim() || 'مجموعة عمل وتواصل في سند AI',
      members: Array.from(new Set([myId, ...extraMembers].filter(Boolean))),
      admins: [myId]
    };

    window.SanadState.setState((prev) => ({
      ...prev,
      groups: [...prev.groups, groupObj],
      selectedGroupId: groupObj.id
    }), 'create-group');

    window.SanadRealtime?.sendGroupSync?.(groupObj);
    if (nameInput) nameInput.value = '';
    if (membersInput) membersInput.value = '';
    if (descInput) descInput.value = '';
    renderGroups();
  }

  function addMemberToCurrentGroup() {
    const input = document.getElementById('group-add-member-input');
    const memberId = window.SanadState.cleanId(input?.value || '');
    const grp = getActiveGroup();
    if (!memberId || !grp) return;

    const updated = {
      ...grp,
      members: Array.from(new Set([...(grp.members || []), memberId]))
    };

    window.SanadState.setState((prev) => ({
      ...prev,
      groups: prev.groups.map((g) => (g.id === updated.id ? updated : g))
    }), 'group-member-add');

    window.SanadRealtime?.sendGroupSync?.(updated);
    if (input) input.value = '';
    renderGroups();
  }

  function sendGroupMessage() {
    const input = document.getElementById('group-message-input');
    const grp = getActiveGroup();
    const text = input?.value.trim();
    if (!grp || !text) return;

    const acc = window.SanadState.getActiveAccount();
    const msgId = `gmsg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    window.SanadRealtime?.enqueueAndSendMessage?.({
      id: msgId,
      clientMsgId: msgId,
      from: window.SanadState.cleanId(acc.id),
      fromName: acc.name || acc.id,
      to: '',
      groupId: grp.id,
      channel: 'group',
      kind: 'text',
      text,
      status: 'pending',
      timestamp: Date.now()
    });
    if (input) input.value = '';
    renderGroups();
  }

  function bindGroups() {
    document.getElementById('group-select')?.addEventListener('change', (e) => {
      window.SanadState.setState({ selectedGroupId: e.target.value }, 'group-select');
      renderGroups();
    });
    document.getElementById('create-group-btn')?.addEventListener('click', createGroup);
    document.getElementById('group-add-member-btn')?.addEventListener('click', addMemberToCurrentGroup);
    document.getElementById('group-send-btn')?.addEventListener('click', sendGroupMessage);
    document.getElementById('group-message-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendGroupMessage();
      }
    });

    renderGroups();
    window.SanadState.subscribe(() => renderGroups());
  }

  window.SanadGroups = { bindGroups, renderGroups };
})();
