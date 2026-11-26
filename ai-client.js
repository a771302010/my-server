(() => {
  function renderAiHistory() {
    const listEl = document.getElementById('ai-messages-list');
    if (!listEl) return;
    const st = window.SanadState.getState();
    const history = st.aiHistory || [];
    listEl.innerHTML = history.map((item) => {
      const isUser = item.role === 'user';
      return `
        <div class="msg-row ${isUser ? 'msg-mine' : 'msg-theirs'}">
          <div class="msg-bubble">
            <div class="msg-sender">${isUser ? 'أنت' : 'مساعد سند AI'}</div>
            <div class="msg-text" style="white-space:pre-line">${escapeHtml(item.text || '')}</div>
          </div>
        </div>`;
    }).join('');
    listEl.scrollTop = listEl.scrollHeight;
  }

  function escapeHtml(str = '') {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  async function runAiAction(mode = 'ask') {
    const input = document.getElementById('ai-prompt-input');
    const toneSelect = document.getElementById('ai-tone-select');
    const promptText = input?.value.trim() || '';
    const tone = toneSelect?.value || 'ودّي';

    if (!promptText && mode !== 'summarize') {
      alert('يرجى كتابة سؤال أو رسالة أو نص للتحليل.');
      return;
    }

    const st = window.SanadState.getState();
    const userLabel = promptText || (mode === 'summarize' ? 'تلخيص المحادثة الحالية واستخراج الإسناد' : 'تحليل الطلب');

    window.SanadState.setState((prev) => ({
      ...prev,
      aiHistory: [...prev.aiHistory, { role: 'user', text: userLabel, ts: Date.now() }]
    }), 'ai-user');
    if (input) input.value = '';
    renderAiHistory();

    try {
      const relevantMsgs = st.messages.filter(
        (m) => !m.groupId && (window.SanadState.cleanId(m.from) === window.SanadState.cleanId(st.selectedPeerId) || window.SanadState.cleanId(m.to) === window.SanadState.cleanId(st.selectedPeerId))
      );
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          text: promptText,
          tone,
          messages: relevantMsgs.slice(-20)
        })
      });
      const data = await res.json();
      let replyText = data.answer || 'تم تنفيذ الطلب.';
      if (Array.isArray(data.actionItems) && data.actionItems.length) {
        replyText += `\n\nخطوات المتابعة والإسناد:\n- ${data.actionItems.join('\n- ')}`;
      }

      window.SanadState.setState((prev) => ({
        ...prev,
        aiHistory: [...prev.aiHistory, { role: 'assistant', text: replyText, ts: Date.now() }]
      }), 'ai-reply');
      renderAiHistory();
    } catch (err) {
      window.SanadState.setState((prev) => ({
        ...prev,
        aiHistory: [...prev.aiHistory, { role: 'assistant', text: `تعذر الاتصال بمساعد الذكاء حالياً: ${err.message}`, ts: Date.now() }]
      }), 'ai-error');
      renderAiHistory();
    }
  }

  function bindAi() {
    document.getElementById('ai-ask-btn')?.addEventListener('click', () => runAiAction('ask'));
    document.getElementById('ai-summarize-btn')?.addEventListener('click', () => runAiAction('summarize'));
    document.getElementById('ai-draft-btn')?.addEventListener('click', () => runAiAction('draft'));
    document.getElementById('ai-classify-btn')?.addEventListener('click', () => runAiAction('classify'));
    renderAiHistory();
  }

  window.SanadAi = { bindAi, renderAiHistory };
})();
