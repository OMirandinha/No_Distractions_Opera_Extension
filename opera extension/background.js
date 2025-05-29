// Master switch for all functionality
chrome.storage.sync.get({ isEnabled: true }, async (data) => {
  if (!data.isEnabled) return;

  // URL Blocking
  chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
    try {
      const { blockedSites = [] } = await chrome.storage.sync.get('blockedSites');
      const url = new URL(details.url);
      
      if (blockedSites.some(site => 
        url.hostname === site || 
        url.hostname.endsWith(`.${site}`)
      )) {
        await chrome.tabs.update(details.tabId, {
          url: chrome.runtime.getURL("blocked.html")
        });
      }
    } catch (error) {
      console.error('Blocking error:', error);
    }
  }, { 
    url: [{ schemes: ['http', 'https'] }] 
  });

  // Tab Limits
  chrome.tabs.onCreated.addListener(async (newTab) => {
    try {
      const { tabLimit } = await chrome.storage.sync.get('tabLimit');
      if (!tabLimit) return;

      const allTabs = await chrome.tabs.query({});
      if (allTabs.length > tabLimit) {
        // Close oldest tabs first (better for workflow)
        const tabsToClose = allTabs
          .sort((a, b) => a.id - b.id)
          .slice(0, allTabs.length - tabLimit);

        await Promise.all(tabsToClose.map(t => chrome.tabs.remove(t.id)));

        // Rate-limited notification
        const { lastNotify } = await chrome.storage.local.get('lastNotify');
        if (!lastNotify || Date.now() - lastNotify > 10000) {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'Tab Limit Enforced',
            message: `Kept ${tabLimit} most recent tabs`
          });
          await chrome.storage.local.set({ lastNotify: Date.now() });
        }
      }
    } catch (error) {
      console.error('Tab limit error:', error);
    }
  });
});