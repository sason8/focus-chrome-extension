document.addEventListener('DOMContentLoaded', () => {
    const focusInput = document.getElementById('focusDurationInput');
    const breakInput = document.getElementById('breakDurationInput');
    const settingsForm = document.getElementById('settingsForm');
    
    const blockedList = document.getElementById('blockedList');
    const newSiteInput = document.getElementById('newSiteInput');
    const addSiteBtn = document.getElementById('addSiteBtn');
    
    const statsPlaceholder = document.getElementById('statsPlaceholder');
    const statsContainer = document.getElementById('statsContainer');

    // 1. Load configuration and stats
    loadSettings();
    loadBlocklist();
    loadStats();

    // 2. Save settings
    settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const focusMins = parseInt(focusInput.value, 10);
        const breakMins = parseInt(breakInput.value, 10);

        if (isNaN(focusMins) || isNaN(breakMins) || focusMins < 1 || breakMins < 1) {
            alert("Please provide valid duration values.");
            return;
        }

        chrome.storage.local.set({
            focusDuration: focusMins,
            breakDuration: breakMins
        }, () => {
            alert("Configurations saved successfully!");
        });
    });

    // 3. Add Site
    addSiteBtn.addEventListener('click', addNewSite);
    newSiteInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            addNewSite();
        }
    });

    function addNewSite() {
        const site = newSiteInput.value.trim().toLowerCase();
        if (!site) return;

        let cleanSite = site;
        try {
            if (site.startsWith('http://') || site.startsWith('https://')) {
                const url = new URL(site);
                cleanSite = url.hostname;
            }
            cleanSite = cleanSite.replace('www.', '');
        } catch (e) {}

        chrome.storage.local.get(['blockedSites'], (result) => {
            const list = result.blockedSites || [];
            if (list.includes(cleanSite)) {
                alert("Site is already in the blocklist.");
                return;
            }

            list.push(cleanSite);
            chrome.storage.local.set({ blockedSites: list }, () => {
                newSiteInput.value = '';
                loadBlocklist();
            });
        });
    }

    // Load functions
    function loadSettings() {
        chrome.storage.local.get(['focusDuration', 'breakDuration'], (result) => {
            focusInput.value = result.focusDuration || 25;
            breakInput.value = result.breakDuration || 5;
        });
    }

    function loadBlocklist() {
        chrome.storage.local.get(['blockedSites'], (result) => {
            const list = result.blockedSites || [];
            blockedList.innerHTML = '';

            if (list.length === 0) {
                blockedList.innerHTML = '<div style="color: #6b7280; padding: 1.5rem; text-align: center; font-size: 0.9rem;">Your blocklist is empty.</div>';
                return;
            }

            list.forEach(site => {
                const item = document.createElement('div');
                item.className = 'list-item';
                item.innerHTML = `
                    <span>${site}</span>
                    <button class="list-item-btn" data-site="${site}">&times;</button>
                `;
                blockedList.appendChild(item);
            });

            // Bind delete events
            const deleteButtons = blockedList.querySelectorAll('.list-item-btn');
            deleteButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const siteToDelete = e.target.getAttribute('data-site');
                    removeSite(siteToDelete);
                });
            });
        });
    }

    function removeSite(site) {
        chrome.storage.local.get(['blockedSites'], (result) => {
            const list = result.blockedSites || [];
            const updated = list.filter(s => s !== site);
            chrome.storage.local.set({ blockedSites: updated }, () => {
                loadBlocklist();
            });
        });
    }

    function loadStats() {
        chrome.storage.local.get(['blockedStats'], (result) => {
            const stats = result.blockedStats || {};
            const keys = Object.keys(stats);

            // Filter out items with 0 blocks
            const activeStats = keys.filter(k => stats[k] > 0);

            if (activeStats.length === 0) {
                statsPlaceholder.style.display = 'block';
                statsContainer.style.display = 'none';
                return;
            }

            statsPlaceholder.style.display = 'none';
            statsContainer.style.display = 'flex';
            statsContainer.innerHTML = '';

            // Sort by count descending
            const sorted = activeStats.map(key => ({
                site: key,
                count: stats[key]
            })).sort((a, b) => b.count - a.count);

            const maxCount = sorted[0].count;

            sorted.forEach(entry => {
                const percentage = maxCount > 0 ? (entry.count / maxCount) * 100 : 0;
                
                const statRow = document.createElement('div');
                statRow.className = 'stat-row';
                statRow.innerHTML = `
                    <div class="stat-info">
                        <span>${entry.site}</span>
                        <span style="font-weight: bold;">${entry.count} attempts blocked</span>
                    </div>
                    <div class="stat-bar-container">
                        <div class="stat-bar-fill" style="width: ${percentage}%"></div>
                    </div>
                `;
                statsContainer.appendChild(statRow);
            });
        });
    }

    // Refresh blocklist and stats when storage is changed elsewhere (e.g. from popup)
    chrome.storage.onChanged.addListener((changes) => {
        if (changes.blockedSites) {
            loadBlocklist();
        }
        if (changes.blockedStats) {
            loadStats();
        }
    });
});
