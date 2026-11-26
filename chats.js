(() => {
  let mediaRecorder = null;
  let audioChunks = [];
  let recordStartTs = 0;
  let replyDraft = null;
  let typingTimer = null;

  function formatTime(ts) {
    if (!ts) return '';
    return new Date(Number(ts)).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  }

  function statusMark(status) {
    if (status === 'pending') return '🕒';
    if (status === 'sent') return '✓';
    if (status === 'delivered') return '✓✓';
    if (status === 'read') return '✓✓ مقروء';
    return '✓';
  }

  function getDirectMessages(peerId) {
    const cleanPeer = window.SanadState.cleanId(peerId);
    const st = window.SanadState.getState();
    return st.messages.filter((m) => !m.groupId && (window.SanadState.cleanId(m.from) === cleanPeer || window.SanadState.cleanId(m.to) === cleanPeer));
  }

  function renderPeerSelector() {
    const select = document.getElementById('chat-peer-select');
    const st = window.SanadState.getState();
    const activeId = window.SanadState.cleanId(st.activeAccountId);
    if (!select) return;

    const options = st.contacts
      .filter((c) => !c.blocked && window.SanadState.cleanId(c.id) !== activeId)
      .map((c) => {
        const cid = window.SanadState.cleanId(c.id);
        const pres = window.SanadState.getPresenceStatus(cid);
        const selected = cid === window.SanadState.cleanId(st.selectedPeerId) ? 'selected' : '';
        return `<option value="${cid}" ${selected}>${c.name} (${cid}) — ${pres.label}</option>`;
      });

    select.innerHTML = options.join('') || `<option value="+967770000002">عبدالله عسيلو (+967770000002)</option>`;
  }

  function renderMessages() {
    renderPeerSelector();
    const listEl = document.getElementById('chat-messages-list');
    const headerPeerEl = document.getElementById('chat-active-peer-info');
    if (!listEl) return;

    const st = window.SanadState.getState();
    const myId = window.SanadState.cleanId(st.activeAccountId);
    const peerId = window.SanadState.cleanId(st.selectedPeerId);
    const contact = st.contacts.find((c) => window.SanadState.cleanId(c.id) === peerId);
    const pres = window.SanadState.getPresenceStatus(peerId);

    if (headerPeerEl) {
      headerPeerEl.textContent = `${contact?.name || peerId || 'محادثة'} • ${pres.label}`;
    }

    const msgs = getDirectMessages(peerId);
    if (!msgs.length) {
      listEl.innerHTML = '<div class="empty-hint">لا توجد رسائل بعد في هذه المحادثة. ابدأ بإرسال رسالة نصية أو صوتية أو مرفق.</div>';
      return;
    }

    listEl.innerHTML = msgs.map((m) => {
      const mine = window.SanadState.cleanId(m.from) === myId;
      const bubbleClass = mine ? 'msg-row msg-mine' : 'msg-row msg-theirs';
      const replyHtml = m.replyTo
        ? `<div class="msg-reply-box">رد على: ${escapeHtml(m.replyTo.text || 'رسالة')}</div>`
        : '';

      let bodyHtml = '';
      if (m.deletedForAll) {
        bodyHtml = `<div class="msg-deleted">تم حذف هذه الرسالة</div>`;
      } else if (m.kind === 'audio' && m.mediaUrl) {
        bodyHtml = `
          <div class="msg-audio">
            <audio controls preload="metadata" src="${escapeAttribute(m.mediaUrl)}"></audio>
            <span class="msg-meta-tag">رسالة صوتية ${m.durationSec ? `(${m.durationSec}ث)` : ''}</span>
          </div>`;
      } else if (m.kind === 'image' && m.mediaUrl) {
        bodyHtml = `
          <div class="msg-image">
            <img src="${escapeAttribute(m.mediaUrl)}" alt="${escapeAttribute(m.mediaName || 'صورة')}" loading="lazy" />
            ${m.text ? `<div class="msg-caption">${escapeHtml(m.text)}</div>` : ''}
          </div>`;
      } else if (m.kind === 'file' && m.mediaUrl) {
        bodyHtml = `
          <div class="msg-file">
            <a href="${escapeAttribute(m.mediaUrl)}" target="_blank" rel="noopener">📎 ${escapeHtml(m.mediaName || 'ملف مرفق')}</a>
            ${m.text ? `<div class="msg-caption">${escapeHtml(m.text)}</div>` : ''}
          </div>`;
      } else {
        bodyHtml = `<div class="msg-text">${escapeHtml(m.text || '')}</div>`;
      }

      const editedTag = m.editedAt ? ' <span class="msg-edited">(معدّلة)</span>' : '';
      const actionsHtml = !m.deletedForAll ? `
        <div class="msg-actions">
          <button type="button" class="btn-mini" data-chat-action="reply" data-msg-id="${escapeAttribute(m.id)}">رد</button>
          <button type="button" class="btn-mini" data-chat-action="copy" data-msg-id="${escapeAttribute(m.id)}">نسخ</button>
          ${mine ? `
            <button type="button" class="btn-mini" data-chat-action="edit" data-msg-id="${escapeAttribute(m.id)}">تعديل</button>
            <button type="button" class="btn-mini btn-danger-mini" data-chat-action="delete" data-msg-id="${escapeAttribute(m.id)}">حذف</button>
          ` : ''}
        </div>` : '';

      return `
        <div class="${bubbleClass}" data-id="${escapeAttribute(m.id)}">
          <div class="msg-bubble">
            <div class="msg-sender">${escapeHtml(m.fromName || m.from)}</div>
            ${replyHtml}
            ${bodyHtml}
            <div class="msg-footer">
              <span>${formatTime(m.timestamp)}${editedTag}</span>
              ${mine ? `<span class="msg-status">${statusMark(m.status)}</span>` : ''}
            </div>
            ${actionsHtml}
          </div>
        </div>`;
    }).join('');

    listEl.scrollTop = listEl.scrollHeight;

    // Send read receipts for incoming messages
    msgs.forEach((m) => {
      if (!mine && m.status !== 'read' && window.SanadState.cleanId(m.from) !== myId) {
        window.SanadRealtime?.sendReceipt?.(m.id, window.SanadState.cleanId(m.from), 'read');
      }
    });
  }

  function escapeHtml(str = '') {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeAttribute(str = '') {
    return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function setReplyBanner(msgObj = null) {
    replyDraft = msgObj ? { id: msgObj.id, text: msgObj.text || 'مرفق', fromName: msgObj.fromName || msgObj.from } : null;
    const banner = document.getElementById('chat-reply-banner');
    const textEl = document.getElementById('chat-reply-text');
    if (!banner || !textEl) return;
    if (replyDraft) {
      banner.style.display = 'flex';
      textEl.textContent = `رد على ${replyDraft.fromName}: ${replyDraft.text}`;
    } else {
      banner.style.display = 'none';
      textEl.textContent = '';
    }
  }

  async function sendTextMessage() {
    const input = document.getElementById('chat-message-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    const st = window.SanadState.getState();
    const acc = window.SanadState.getActiveAccount();
    const to = window.SanadState.cleanId(st.selectedPeerId);
    if (!to) return;

    const msgId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const msgObj = {
      id: msgId,
      clientMsgId: msgId,
      from: window.SanadState.cleanId(acc.id),
      fromName: acc.name || acc.id,
      to,
      groupId: '',
      channel: 'direct',
      kind: 'text',
      text,
      replyTo: replyDraft,
      status: 'pending',
      timestamp: Date.now()
    };

    input.value = '';
    setReplyBanner(null);
    window.SanadRealtime?.enqueueAndSendMessage?.(msgObj);
    renderMessages();
  }

  async function toggleVoiceRecording() {
    const btn = document.getElementById('chat-voice-btn');
    if (!mediaRecorder) {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('المتصفح لا يدعم التسجيل الصوتي المباشر.');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunks = [];
        mediaRecorder = new MediaRecorder(stream);
        recordStartTs = Date.now();
        mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) audioChunks.push(e.data);
        };
        mediaRecorder.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          const durationSec = Math.max(1, Math.round((Date.now() - recordStartTs) / 1000));
          const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
          mediaRecorder = null;
          if (btn) btn.textContent = '🎤 تسجيل صوت';

          if (!blob.size) return;
          const reader = new FileReader();
          reader.onload = async () => {
            try {
              const upRes = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  dataUrl: reader.result,
                  fileName: `voice-${Date.now()}.webm`,
                  mimeType: blob.type || 'audio/webm'
                })
              });
              const upJson = await upRes.json();
              if (!upJson.ok) throw new Error(upJson.error || 'فشل رفع الصوت');

              const st = window.SanadState.getState();
              const acc = window.SanadState.getActiveAccount();
              const msgId = `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
              window.SanadRealtime?.enqueueAndSendMessage?.({
                id: msgId,
                clientMsgId: msgId,
                from: window.SanadState.cleanId(acc.id),
                fromName: acc.name || acc.id,
                to: window.SanadState.cleanId(st.selectedPeerId),
                channel: 'direct',
                kind: 'audio',
                mediaUrl: upJson.mediaUrl,
                mediaName: upJson.mediaName,
                mediaType: upJson.mediaType,
                mediaSize: upJson.mediaSize,
                durationSec,
                status: 'pending',
                timestamp: Date.now()
              });
              renderMessages();
            } catch (err) {
              alert(`تعذر إرسال الرسالة الصوتية: ${err.message}`);
            }
          };
          reader.readAsDataURL(blob);
        };
        mediaRecorder.start();
        if (btn) btn.textContent = '⏹ إيقاف وإرسال';
      } catch (err) {
        alert(`تعذر تشغيل الميكروفون: ${err.message}`);
      }
    } else {
      mediaRecorder.stop();
    }
  }

  async function handleFileSelected(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const upRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dataUrl: reader.result,
            fileName: file.name,
            mimeType: file.type || 'application/octet-stream'
          })
        });
        const upJson = await upRes.json();
        if (!upJson.ok) throw new Error(upJson.error || 'فشل رفع الملف');

        const isImg = (file.type || '').startsWith('image/');
        const st = window.SanadState.getState();
        const acc = window.SanadState.getActiveAccount();
        const msgId = `file-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const captionInput = document.getElementById('chat-message-input');
        const caption = captionInput?.value.trim() || '';
        if (captionInput) captionInput.value = '';

        window.SanadRealtime?.enqueueAndSendMessage?.({
          id: msgId,
          clientMsgId: msgId,
          from: window.SanadState.cleanId(acc.id),
          fromName: acc.name || acc.id,
          to: window.SanadState.cleanId(st.selectedPeerId),
          channel: 'direct',
          kind: isImg ? 'image' : 'file',
          text: caption,
          mediaUrl: upJson.mediaUrl,
          mediaName: upJson.mediaName,
          mediaType: upJson.mediaType,
          mediaSize: upJson.mediaSize,
          status: 'pending',
          timestamp: Date.now()
        });
        renderMessages();
      } catch (err) {
        alert(`تعذر إرسال الملف: ${err.message}`);
      }
    };
    reader.readAsDataURL(file);
  }

  function bindChats() {
    document.getElementById('chat-peer-select')?.addEventListener('change', (e) => {
      const peerId = window.SanadState.cleanId(e.target.value);
      window.SanadState.setState({ selectedPeerId: peerId }, 'peer-select');
      window.SanadRealtime?.requestSync?.();
      renderMessages();
    });

    document.getElementById('chat-send-btn')?.addEventListener('click', sendTextMessage);
    document.getElementById('chat-message-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendTextMessage();
      }
      clearTimeout(typingTimer);
      const st = window.SanadState.getState();
      window.SanadRealtime?.sendTyping?.(window.SanadState.cleanId(st.selectedPeerId), true);
      typingTimer = setTimeout(() => {
        window.SanadRealtime?.sendTyping?.(window.SanadState.cleanId(st.selectedPeerId), false);
      }, 1200);
    });

    document.getElementById('chat-cancel-reply-btn')?.addEventListener('click', () => setReplyBanner(null));
    document.getElementById('chat-voice-btn')?.addEventListener('click', toggleVoiceRecording);
    document.getElementById('chat-file-input')?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) handleFileSelected(file);
      e.target.value = '';
    });

    document.getElementById('chat-messages-list')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-chat-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-chat-action');
      const msgId = btn.getAttribute('data-msg-id');
      const st = window.SanadState.getState();
      const target = st.messages.find((m) => m.id === msgId);
      if (!target) return;

      if (action === 'reply') {
        setReplyBanner(target);
        document.getElementById('chat-message-input')?.focus();
      } else if (action === 'copy') {
        navigator.clipboard?.writeText(target.text || target.mediaUrl || '').catch(() => {});
      } else if (action === 'edit') {
        const nextText = prompt('تعديل نص الرسالة:', target.text || '');
        if (nextText !== null && nextText.trim()) {
          window.SanadRealtime?.sendEditOrDelete?.({
            action: 'edit',
            msgId: target.id,
            to: target.to,
            text: nextText.trim()
          });
        }
      } else if (action === 'delete') {
        if (confirm('هل تريد حذف هذه الرسالة؟')) {
          window.SanadRealtime?.sendEditOrDelete?.({
            action: 'delete',
            msgId: target.id,
            to: target.to
          });
        }
      }
    });

    renderMessages();
    window.SanadState.subscribe(() => renderMessages());
  }

  window.SanadChats = { bindChats, renderMessages };
})();
