chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => null);
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.windowId) return;
  await chrome.sidePanel.open({ windowId: tab.windowId }).catch(() => null);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'ANNOTATED_CAPTURE_SCREENSHOT') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const windowId = sender.tab?.windowId || tabs[0]?.windowId;
      const handleCapture = (dataUrl) => {
        sendResponse({ ok: !chrome.runtime.lastError, dataUrl, error: chrome.runtime.lastError?.message });
      };
      if (windowId) {
        chrome.tabs.captureVisibleTab(windowId, { format: 'jpeg', quality: 55 }, handleCapture);
      } else {
        chrome.tabs.captureVisibleTab({ format: 'jpeg', quality: 55 }, handleCapture);
      }
    });
    return true;
  }
  return false;
});
