// Block navigation to any site in the blocklist
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  chrome.storage.sync.get({ blockedSites: [] }, (data) => {
    const isBlocked = data.blockedSites.some(site => 
      details.url.includes(site)
    );
    if (isBlocked) {
      chrome.tabs.update(details.tabId, { 
        url: chrome.runtime.getURL("blocked.html") 
      });
    }
  });
});