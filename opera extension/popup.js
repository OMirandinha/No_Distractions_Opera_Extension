// Load saved sites and display them
function updateBlockList() {
  chrome.storage.sync.get({ blockedSites: [] }, (data) => {
    const list = document.getElementById('blockList');
    list.innerHTML = ''; // Clear previous entries
    data.blockedSites.forEach(site => {
      const li = document.createElement('li');
      li.textContent = site;
      
      // Add delete button for each site
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '❌';
      deleteBtn.addEventListener('click', () => {
        chrome.storage.sync.get({ blockedSites: [] }, (data) => {
          const updated = data.blockedSites.filter(s => s !== site);
          chrome.storage.sync.set({ blockedSites: updated }, updateBlockList);
        });
      });
      
      li.appendChild(deleteBtn);
      list.appendChild(li);
    });
  });
}

// Add new site to blocklist
document.getElementById('blockBtn').addEventListener('click', () => {
  const site = document.getElementById('siteInput').value.trim();
  if (!site) return;
  
  chrome.storage.sync.get({ blockedSites: [] }, (data) => {
    const updated = [...data.blockedSites, site];
    chrome.storage.sync.set({ blockedSites: updated }, () => {
      document.getElementById('siteInput').value = ''; // Clear input
      updateBlockList();
    });
  });
});

// Initialize
updateBlockList();