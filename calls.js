(() => {
  const RTC_CONFIG = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  let pc = null;
  let localStream = null;
  let remotePeerId = '';
  let callMode = 'audio'; // audio | video
  let pendingOffer = null;

  function setCallStatus(txt) {
    const el = document.getElementById('call-status-text');
    if (el) el.textContent = txt;
  }

  async function ensureLocalMedia(mode = 'audio') {
    if (localStream) return localStream;
    const constraints = {
      audio: true,
      video: mode === 'video' ? { facingMode: 'user' } : false
    };
    localStream = await navigator.mediaDevices.getUserMedia(constraints);
    const localVideo = document.getElementById('call-local-video');
    if (localVideo && mode === 'video') {
      localVideo.srcObject = localStream;
      localVideo.style.display = 'block';
    }
    return localStream;
  }

  function createPeerConnection(targetId) {
    if (pc) {
      try { pc.close(); } catch (_) {}
      pc = null;
    }
    const conn = new RTCPeerConnection(RTC_CONFIG);
    if (localStream) {
      localStream.getTracks().forEach((track) => conn.addTrack(track, localStream));
    }
    conn.ontrack = (event) => {
      const remoteVideo = document.getElementById('call-remote-video');
      const remoteAudio = document.getElementById('call-remote-audio');
      const stream = event.streams?.[0];
      if (stream) {
        if (remoteVideo && callMode === 'video') {
          remoteVideo.srcObject = stream;
          remoteVideo.style.display = 'block';
        }
        if (remoteAudio) {
          remoteAudio.srcObject = stream;
          remoteAudio.play().catch(() => {});
        }
      }
      setCallStatus(`متصل مع ${targetId}`);
    };
    conn.onicecandidate = (event) => {
      if (event.candidate && targetId) {
        window.SanadRealtime?.sendSignal?.({
          type: 'call_ice',
          to: targetId,
          candidate: event.candidate
        });
      }
    };
    conn.onconnectionstatechange = () => {
      if (conn.connectionState === 'disconnected' || conn.connectionState === 'failed' || conn.connectionState === 'closed') {
        endCall(false);
      }
    };
    pc = conn;
    return conn;
  }

  async function startCall(mode = 'audio') {
    const input = document.getElementById('call-target-input');
    const targetId = window.SanadState.cleanId(input?.value || window.SanadState.getState().selectedPeerId || '');
    if (!targetId) {
      alert('يرجى إدخال رقم أو معرّف الطرف المطلوب للاتصال.');
      return;
    }
    callMode = mode;
    remotePeerId = targetId;
    try {
      setCallStatus(`جاري تجهيز ${mode === 'video' ? 'مكالمة مرئية' : 'مكالمة صوتية'} مع ${targetId}...`);
      await ensureLocalMedia(mode);
      const conn = createPeerConnection(targetId);
      const offer = await conn.createOffer();
      await conn.setLocalDescription(offer);
      window.SanadRealtime?.sendSignal?.({
        type: 'call_invite',
        to: targetId,
        mode,
        sdp: offer
      });
      setCallStatus(`جاري الاتصال بـ ${targetId}...`);
    } catch (err) {
      setCallStatus('تعذر بدء المكالمة');
      alert(`خطأ في تشغيل الكاميرا أو الميكروفون: ${err.message}`);
    }
  }

  async function acceptIncomingCall() {
    if (!pendingOffer || !remotePeerId) return;
    try {
      await ensureLocalMedia(callMode);
      const conn = createPeerConnection(remotePeerId);
      await conn.setRemoteDescription(new RTCSessionDescription(pendingOffer));
      const answer = await conn.createAnswer();
      await conn.setLocalDescription(answer);
      window.SanadRealtime?.sendSignal?.({
        type: 'call_answer',
        to: remotePeerId,
        sdp: answer
      });
      pendingOffer = null;
      document.getElementById('incoming-call-box').style.display = 'none';
      setCallStatus(`جاري الاتصال مع ${remotePeerId}...`);
    } catch (err) {
      alert(`تعذر الرد على المكالمة: ${err.message}`);
    }
  }

  function endCall(notifyPeer = true) {
    if (notifyPeer && remotePeerId) {
      window.SanadRealtime?.sendSignal?.({
        type: 'call_end',
        to: remotePeerId
      });
    }
    if (pc) {
      try { pc.close(); } catch (_) {}
      pc = null;
    }
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
      localStream = null;
    }
    const lv = document.getElementById('call-local-video');
    const rv = document.getElementById('call-remote-video');
    if (lv) { lv.srcObject = null; lv.style.display = 'none'; }
    if (rv) { rv.srcObject = null; rv.style.display = 'none'; }
    document.getElementById('incoming-call-box').style.display = 'none';
    remotePeerId = '';
    pendingOffer = null;
    setCallStatus('جاهز لإجراء مكالمة صوتية أو مرئية');
  }

  async function handleSignalMessage(msg) {
    if (!msg || !msg.type) return;
    const fromId = window.SanadState.cleanId(msg.from);

    if (msg.type === 'call_invite') {
      remotePeerId = fromId;
      callMode = msg.mode === 'video' ? 'video' : 'audio';
      pendingOffer = msg.sdp;
      const box = document.getElementById('incoming-call-box');
      const label = document.getElementById('incoming-call-label');
      if (box && label) {
        label.textContent = `مكالمة ${callMode === 'video' ? 'مرئية' : 'صوتية'} واردة من ${fromId}`;
        box.style.display = 'flex';
      }
      setCallStatus(`مكالمة واردة من ${fromId}`);
      return;
    }

    if (msg.type === 'call_answer' && pc && msg.sdp) {
      await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp)).catch(() => {});
      setCallStatus(`متصل مع ${fromId}`);
      return;
    }

    if (msg.type === 'call_ice' && pc && msg.candidate) {
      await pc.addIceCandidate(new RTCIceCandidate(msg.candidate)).catch(() => {});
      return;
    }

    if (msg.type === 'call_end' || msg.type === 'call_reject') {
      endCall(false);
    }
  }

  function bindCalls() {
    document.getElementById('start-audio-call-btn')?.addEventListener('click', () => startCall('audio'));
    document.getElementById('start-video-call-btn')?.addEventListener('click', () => startCall('video'));
    document.getElementById('accept-call-btn')?.addEventListener('click', acceptIncomingCall);
    document.getElementById('reject-call-btn')?.addEventListener('click', () => endCall(true));
    document.getElementById('hangup-call-btn')?.addEventListener('click', () => endCall(true));
  }

  window.SanadCalls = { bindCalls, handleSignalMessage };
})();
