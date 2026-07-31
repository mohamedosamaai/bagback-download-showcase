const APP_URL = "https://download.bagbacktech.com";

document.getElementById('send-btn').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].url) {
      chrome.tabs.create({ url: `${APP_URL}/?url=${encodeURIComponent(tabs[0].url)}` });
      window.close();
    }
  });
});
