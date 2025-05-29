// Blocklist Functions
async function updateBlockList() {
  try {
    const { blockedSites = [] } = await chrome.storage.sync.get('blockedSites');
    const list = document.getElementById('blockList');
    list.innerHTML = '';
    
    blockedSites.forEach(site => {
      const li = document.createElement('li');
      li.innerHTML = `
        ${site}
        <button class="delete-btn" data-site="${site}">❌</button>
      `;
      list.appendChild(li);
    });
  } catch (error) {
    console.error('Blocklist update failed:', error);
  }
}

// Event Delegation for Delete Buttons
document.getElementById('blockList').addEventListener('click', async (e) => {
  if (!e.target.classList.contains('delete-btn')) return;
  
  const site = e.target.dataset.site;
  const { blockedSites = [] } = await chrome.storage.sync.get('blockedSites');
  const updated = blockedSites.filter(s => s !== site);
  await chrome.storage.sync.set({ blockedSites: updated });
  updateBlockList();
});

// Add Site
document.getElementById('blockBtn').addEventListener('click', async () => {
  const input = document.getElementById('siteInput');
  const site = input.value.trim().replace(/[<>]/g, '');
  
  if (!site) return;
  
  try {
    const { blockedSites = [] } = await chrome.storage.sync.get('blockedSites');
    await chrome.storage.sync.set({ 
      blockedSites: [...blockedSites, site] 
    });
    input.value = '';
    updateBlockList();
  } catch (error) {
    console.error('Failed to add site:', error);
  }
});

// Tab Limits
document.getElementById('setTabLimitBtn').addEventListener('click', async () => {
  const limitInput = document.getElementById('tabLimitInput');
  const errorEl = document.getElementById('tabLimitError');
  const statusEl = document.getElementById('tabLimitStatus');
  
  const limit = Math.floor(Number(limitInput.value));
  
  if (!Number.isFinite(limit) || limit <= 0) {
    errorEl.textContent = "Please enter a positive integer";
    errorEl.style.display = "block";
    return;
  }
  
  try {
    await chrome.storage.sync.set({ tabLimit: limit });
    errorEl.style.display = "none";
    statusEl.textContent = `Current limit: ${limit} tabs`;
    limitInput.value = "";
  } catch (error) {
    errorEl.textContent = "Failed to save limit";
    errorEl.style.display = "block";
  }
});

// Initialize
chrome.storage.sync.get(['blockedSites', 'tabLimit'], (data) => {
  updateBlockList();
  if (data.tabLimit) {
    document.getElementById('tabLimitStatus').textContent = 
      `Current limit: ${data.tabLimit} tabs`;
  }
});