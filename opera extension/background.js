// Master switch for all functionality
chrome.storage.sync.get({ isEnabled: true }, (data) => {
  if (!data.isEnabled) return;

  // Fixed URL Blocking - blocks domain + subdomains but not unrelated, similar named domains
  chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
    try {
      const { blockedSites = [] } = await chrome.storage.sync.get('blockedSites');
      const url = new URL(details.url);
      
      // Check if URL matches any blocked domain 
      const shouldBlock = blockedSites.some(blockedDomain => {
        // Exact match (example.com)
        if (url.hostname === blockedDomain) return true;
        
        // Subdomain check (e.g., sub.example.com)
        // Only matches if the domain ends with ".example.com"
        // Won't match "badexample.com"
        if (url.hostname.endsWith(`.${blockedDomain}`)) {
          // Verify if it's a true subdomain by checking segments
          const hostParts = url.hostname.split('.');
          const domainParts = blockedDomain.split('.');
          return hostParts.slice(-domainParts.length).join('.') === blockedDomain;
        }
        return false;
      });

      if (shouldBlock) {
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

  // Enhanced Tab Limits
  let isEnforcing = false; // Prevents re-entrancy issues

  async function enforceTabLimit(triggeredByNewTab = null) {
    if (isEnforcing) return;
    isEnforcing = true;

    try {
      const { tabLimit } = await chrome.storage.sync.get('tabLimit');
      if (!tabLimit) return;

      const allTabs = await chrome.tabs.query({});
      if (allTabs.length <= tabLimit) return;

      // Sort tabs with special handling for the new tab
      const sortedTabs = allTabs.sort((a, b) => {
        // Keep the newly created tab if possible
        if (triggeredByNewTab && a.id === triggeredByNewTab.id) return 1;
        if (triggeredByNewTab && b.id === triggeredByNewTab.id) return -1;
        return a.id - b.id; // Oldest first
      });

      const tabsToClose = sortedTabs.slice(0, allTabs.length - tabLimit);
      
      // Close tabs in sequence to avoid race conditions
      for (const tab of tabsToClose) {
        try {
          await chrome.tabs.remove(tab.id);
        } catch (error) {
          console.error(`Failed to close tab ${tab.id}:`, error);
        }
      }

      // Verify if we're still over limit (in case some tabs didn't close)
      const remainingTabs = await chrome.tabs.query({});
      if (remainingTabs.length > tabLimit && triggeredByNewTab) {
        // As last resort, close the newest tab
        await chrome.tabs.remove(triggeredByNewTab.id);
      }

      // Rate-limited notification
      const { lastNotify } = await chrome.storage.local.get('lastNotify');
      if (!lastNotify || Date.now() - lastNotify > 10000) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'Tab Limit Enforced',
          message: `Maintained ${tabLimit} tab limit`
        });
        await chrome.storage.local.set({ lastNotify: Date.now() });
      }
    } catch (error) {
      console.error('Tab limit enforcement error:', error);
    } finally {
      isEnforcing = false;
    }
  }

  // Event Listeners
  chrome.tabs.onCreated.addListener((tab) => enforceTabLimit(tab));
  chrome.tabs.onRemoved.addListener(() => enforceTabLimit());
  chrome.tabs.onReplaced.addListener(() => enforceTabLimit());
  chrome.windows.onFocusChanged.addListener(() => enforceTabLimit());

  // Handle updates to the tab limit
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.tabLimit) {
      enforceTabLimit();
    }
  });
});