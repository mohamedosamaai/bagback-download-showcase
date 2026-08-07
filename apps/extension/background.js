const APP_URL = "https://download.bagbacktech.com";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "download-with-bagback",
    title: "Download with Bagback",
    contexts: ["link", "page", "video", "audio"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "download-with-bagback") {
    const targetUrl = info.linkUrl || info.srcUrl || info.pageUrl;
    if (targetUrl) {
      chrome.tabs.create({ url: `${APP_URL}/?url=${encodeURIComponent(targetUrl)}` });
    }
  }
});
