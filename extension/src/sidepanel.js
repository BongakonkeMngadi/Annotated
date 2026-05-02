const API_BASE_URL = '__ANNOTATED_API_BASE_URL__';
const WEB_BASE_URL = '__ANNOTATED_WEB_BASE_URL__';

const state = {
  context: null,
  screenshotDataUrl: '',
  type: 'text',
  assist: null,
  sessionToken: '',
  user: null,
  commentaryAudioFile: null,
  voiceRecorder: null,
  voiceChunks: [],
};

const els = {
  sourceTitle: document.getElementById('sourceTitle'),
  sourceUrl: document.getElementById('sourceUrl'),
  collectBtn: document.getElementById('collectBtn'),
  screenshotBtn: document.getElementById('screenshotBtn'),
  extensionLoginBtn: document.getElementById('extensionLoginBtn'),
  accountName: document.getElementById('accountName'),
  assistBtn: document.getElementById('assistBtn'),
  publishBtn: document.getElementById('publishBtn'),
  selectedText: document.getElementById('selectedText'),
  commentaryText: document.getElementById('commentaryText'),
  mediaStart: document.getElementById('mediaStart'),
  mediaEnd: document.getElementById('mediaEnd'),
  recordBtn: document.getElementById('recordBtn'),
  stopRecordBtn: document.getElementById('stopRecordBtn'),
  voiceStatus: document.getElementById('voiceStatus'),
  voicePreview: document.getElementById('voicePreview'),
  timeFields: document.getElementById('timeFields'),
  assistPanel: document.getElementById('assistPanel'),
  aiTitle: document.getElementById('aiTitle'),
  aiSummary: document.getElementById('aiSummary'),
  suggestions: document.getElementById('suggestions'),
  tags: document.getElementById('tags'),
  fairUse: document.getElementById('fairUse'),
  status: document.getElementById('status'),
  feedLink: document.getElementById('feedLink'),
  loginLink: document.getElementById('loginLink'),
};

els.feedLink.href = `${WEB_BASE_URL}/feed`;
els.loginLink.href = `${WEB_BASE_URL}/login`;

function setStatus(message) {
  els.status.textContent = message;
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'source';
  }
}

function isYouTube(url) {
  return /youtube\.com|youtu\.be/.test(url || '');
}

function secondsToStamp(seconds) {
  if (!Number.isFinite(seconds)) return '';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function sendToTab(message) {
  const tab = await activeTab();
  if (!tab?.id) throw new Error('No active tab found.');
  return chrome.tabs.sendMessage(tab.id, message);
}

async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(state.sessionToken ? { Authorization: `Bearer ${state.sessionToken}` } : {
        'x-demo-user-id': 'extension_user',
        'x-demo-user-name': 'Chrome Clipper',
      }),
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) throw new Error(data.error || `Request failed: ${response.status}`);
  return data;
}

async function uploadAsset(file, kind, metadata = {}) {
  if (!file) return null;
  const formData = new FormData();
  formData.append('file', file);
  formData.append('kind', kind);
  if (metadata.type) formData.append('type', metadata.type);
  if (metadata.mediaStart) formData.append('mediaStart', metadata.mediaStart);
  if (metadata.mediaEnd) formData.append('mediaEnd', metadata.mediaEnd);
  const response = await fetch(`${API_BASE_URL}/uploads/asset`, {
    method: 'POST',
    headers: {
      ...(state.sessionToken ? { Authorization: `Bearer ${state.sessionToken}` } : {}),
    },
    body: formData,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) throw new Error(data.error || `Upload failed: ${response.status}`);
  return data.asset;
}

function paintAccount() {
  els.accountName.textContent = state.user?.displayName || state.user?.email || (state.sessionToken ? 'Signed in' : 'Not signed in');
  els.extensionLoginBtn.textContent = state.sessionToken ? 'Signed in' : 'Google';
}

async function loadSession() {
  const stored = await chrome.storage.local.get(['annotatedSessionToken', 'annotatedUser']);
  state.sessionToken = stored.annotatedSessionToken || '';
  state.user = stored.annotatedUser || null;
  paintAccount();
}

async function loginWithGoogle() {
  setStatus('Opening Google sign-in...');
  try {
    const tokenResult = await chrome.identity.getAuthToken({ interactive: true });
    const accessToken = typeof tokenResult === 'string' ? tokenResult : tokenResult?.token;
    if (!accessToken) throw new Error('Google did not return an access token.');
    const session = await apiFetch('/auth/extension-google', {
      method: 'POST',
      body: JSON.stringify({ accessToken }),
    });
    state.sessionToken = session.token;
    state.user = session.user;
    await chrome.storage.local.set({ annotatedSessionToken: session.token, annotatedUser: session.user });
    paintAccount();
    setStatus('Signed in. Publishing will use your Google identity.');
  } catch (error) {
    setStatus(error.message || 'Google sign-in failed. Check extension OAuth client ID.');
  }
}

function setType(type) {
  state.type = type;
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.type === type);
  });
  els.timeFields.classList.toggle('hidden', type === 'text');
}

function paintContext(context) {
  state.context = context;
  els.sourceTitle.textContent = context.title || 'Untitled source';
  els.sourceUrl.textContent = context.url || 'No URL';
  els.sourceUrl.href = context.url || '#';

  if (context.selectedText) els.selectedText.value = context.selectedText;
  if (!els.selectedText.value && context.description) els.selectedText.value = context.description;
  if (context.youtube?.isYouTube) {
    setType('video');
    if (Number.isFinite(context.youtube.currentTime)) {
      els.mediaStart.value = secondsToStamp(context.youtube.currentTime);
      els.mediaEnd.value = secondsToStamp(Math.min(context.youtube.currentTime + 45, context.youtube.duration || context.youtube.currentTime + 45));
    }
  } else if (context.hasAudio) {
    setType('audio');
  } else {
    setType('text');
  }

  setStatus(`Collected ${getDomain(context.url)}. ${context.selectedText ? 'Selected text captured.' : 'No selection yet.'}`);
}

async function collectContext() {
  setStatus('Collecting current page context...');
  try {
    const response = await sendToTab({ type: 'ANNOTATED_COLLECT_CONTEXT' });
    if (!response?.ok) throw new Error('Could not collect context from this page.');
    paintContext(response.context);
  } catch (error) {
    setStatus(error.message || 'Collection failed. Try refreshing the page.');
  }
}

async function captureScreenshot() {
  setStatus('Capturing visible tab for Kimi vision...');
  try {
    const response = await chrome.runtime.sendMessage({ type: 'ANNOTATED_CAPTURE_SCREENSHOT' });
    if (!response?.ok || !response.dataUrl) throw new Error(response?.error || 'Screenshot capture failed.');
    state.screenshotDataUrl = response.dataUrl;
    setStatus('Screenshot attached. Kimi can now use vision context.');
  } catch (error) {
    setStatus(error.message || 'Screenshot failed.');
  }
}

function payload() {
  const context = state.context || {};
  return {
    type: state.type,
    sourceUrl: context.url || '',
    canonicalUrl: context.canonicalUrl || context.url || '',
    sourceTitle: context.title || '',
    sourceAuthor: context.author || '',
    sourceDomain: getDomain(context.url || ''),
    selectedText: els.selectedText.value.trim(),
    commentaryText: els.commentaryText.value.trim(),
    mediaStart: els.mediaStart.value.trim(),
    mediaEnd: els.mediaEnd.value.trim(),
    mediaUrl: state.type === 'audio' ? context.audioUrl : context.videoUrl,
    sourceDuration: context.sourceDuration || context.youtube?.duration || null,
    pageText: context.pageText || '',
    description: context.description || '',
    headings: context.headings || [],
    screenshotDataUrl: state.screenshotDataUrl,
  };
}

function paintAssist(assist) {
  state.assist = assist;
  els.assistPanel.classList.remove('hidden');
  els.aiTitle.textContent = assist.title || 'Untitled annotation';
  els.aiSummary.textContent = assist.summary || '';
  els.suggestions.innerHTML = '';
  (assist.suggestedCommentary || []).forEach((item) => {
    const button = document.createElement('button');
    button.className = 'suggestion';
    button.textContent = item;
    button.addEventListener('click', () => {
      els.commentaryText.value = item;
    });
    els.suggestions.appendChild(button);
  });
  els.tags.innerHTML = '';
  (assist.tags || []).forEach((tag) => {
    const span = document.createElement('span');
    span.className = 'tag';
    span.textContent = `#${tag}`;
    els.tags.appendChild(span);
  });
  els.fairUse.textContent = assist.fairUseNote || 'Original source linked for attribution.';
}

async function askKimi() {
  const body = payload();
  if (!body.sourceUrl) {
    setStatus('Collect the current page first.');
    return;
  }
  setStatus('Asking Kimi K2.6 for title, context, tags, and fair-use note...');
  els.assistBtn.disabled = true;
  try {
    const result = await apiFetch('/ai/assist', { method: 'POST', body: JSON.stringify(body) });
    paintAssist(result.assist);
    setStatus('AI package ready. Choose a suggestion or write your own commentary.');
  } catch (error) {
    setStatus(error.message || 'AI assist failed.');
  } finally {
    els.assistBtn.disabled = false;
  }
}

async function startVoiceRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    state.voiceChunks = [];
    const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : undefined });
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) state.voiceChunks.push(event.data);
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      const blob = new Blob(state.voiceChunks, { type: recorder.mimeType || 'audio/webm' });
      state.commentaryAudioFile = new File([blob], `commentary-${Date.now()}.webm`, { type: blob.type });
      els.voicePreview.src = URL.createObjectURL(blob);
      els.voicePreview.classList.remove('hidden');
      els.voiceStatus.textContent = 'Recorded voice commentary ready';
      els.recordBtn.classList.remove('hidden');
      els.stopRecordBtn.classList.add('hidden');
    };
    state.voiceRecorder = recorder;
    recorder.start();
    els.voiceStatus.textContent = 'Recording...';
    els.recordBtn.classList.add('hidden');
    els.stopRecordBtn.classList.remove('hidden');
  } catch (error) {
    setStatus(error.message || 'Microphone permission failed.');
  }
}

function stopVoiceRecording() {
  state.voiceRecorder?.stop();
}

async function publish() {
  const body = payload();
  if (!body.sourceUrl) {
    setStatus('Collect the current page first.');
    return;
  }
  if (!body.commentaryText) {
    setStatus('Add commentary before publishing.');
    return;
  }

  els.publishBtn.disabled = true;
  setStatus('Publishing source-linked annotation...');
  try {
    const commentaryAudioAsset = state.commentaryAudioFile ? await uploadAsset(state.commentaryAudioFile, 'commentary-audio') : null;
    const result = await apiFetch('/annotations', {
      method: 'POST',
      body: JSON.stringify({
        ...body,
        commentaryAudioUrl: commentaryAudioAsset?.url || '',
        commentaryAudioAsset,
        ai: state.assist,
        aiTitle: state.assist?.title,
        aiSummary: state.assist?.summary,
        fairUseNote: state.assist?.fairUseNote,
        tags: state.assist?.tags || [],
      }),
    });
    const url = `${WEB_BASE_URL}/annotation/${result.annotation.id}`;
    setStatus('Published. Opening annotation page...');
    await chrome.tabs.create({ url });
  } catch (error) {
    setStatus(error.message || 'Publish failed.');
  } finally {
    els.publishBtn.disabled = false;
  }
}

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => setType(tab.dataset.type));
});

els.extensionLoginBtn.addEventListener('click', loginWithGoogle);
els.recordBtn.addEventListener('click', startVoiceRecording);
els.stopRecordBtn.addEventListener('click', stopVoiceRecording);
els.collectBtn.addEventListener('click', collectContext);
els.screenshotBtn.addEventListener('click', captureScreenshot);
els.assistBtn.addEventListener('click', askKimi);
els.publishBtn.addEventListener('click', publish);

loadSession();
collectContext();
