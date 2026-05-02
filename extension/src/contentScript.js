let lastSelection = '';

function getSelectionText() {
  const selection = window.getSelection?.();
  return selection ? selection.toString().trim() : '';
}

function getMeta(name) {
  return document.querySelector(`meta[name="${name}"]`)?.content || document.querySelector(`meta[property="${name}"]`)?.content || '';
}

function getCanonicalUrl() {
  return document.querySelector('link[rel="canonical"]')?.href || location.href;
}

function getReadableText() {
  const candidates = [...document.querySelectorAll('article, main, [role="main"], body')];
  const target = candidates.find((node) => node.innerText && node.innerText.length > 500) || document.body;
  return (target?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 5000);
}

function getYouTubeInfo() {
  const isYouTube = /youtube\.com|youtu\.be/.test(location.hostname);
  if (!isYouTube) return null;
  const video = document.querySelector('video');
  return {
    isYouTube,
    currentTime: video ? Math.floor(video.currentTime || 0) : null,
    duration: video ? Math.floor(video.duration || 0) : null,
  };
}

function collectContext() {
  const selectedText = getSelectionText() || lastSelection;
  const headings = [...document.querySelectorAll('h1, h2')].slice(0, 8).map((node) => node.innerText.trim()).filter(Boolean);
  const audio = document.querySelector('audio');
  const video = document.querySelector('video');

  return {
    url: location.href,
    canonicalUrl: getCanonicalUrl(),
    title: document.title || getMeta('og:title') || '',
    description: getMeta('description') || getMeta('og:description'),
    author: getMeta('author') || getMeta('article:author'),
    selectedText,
    pageText: getReadableText(),
    headings,
    hasAudio: Boolean(audio),
    hasVideo: Boolean(video),
    audioUrl: audio?.currentSrc || audio?.src || '',
    videoUrl: video?.currentSrc || video?.src || '',
    sourceDuration: Math.floor(video?.duration || audio?.duration || 0) || null,
    youtube: getYouTubeInfo(),
  };
}

document.addEventListener('selectionchange', () => {
  const text = getSelectionText();
  if (text) lastSelection = text;
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'ANNOTATED_COLLECT_CONTEXT') {
    sendResponse({ ok: true, context: collectContext() });
    return true;
  }
  return false;
});
