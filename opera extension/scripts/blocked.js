document.getElementById('backBtn').addEventListener('click', () => {
  // Redirect to Opera's start page
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.update(tabs[0].id, { url: "opera://startpage" });
  });
});