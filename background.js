const DEFAULT_SITES = ["youtube.com", "facebook.com", "twitter.com", "instagram.com"];

// Initialize settings on installation
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get(['blockedSites', 'blockingActive', 'focusDuration', 'breakDuration', 'blockedStats'], (result) => {
        const updates = {};
        if (!result.blockedSites) updates.blockedSites = DEFAULT_SITES;
        if (result.blockingActive === undefined) updates.blockingActive = false;
        if (!result.focusDuration) updates.focusDuration = 25;
        if (!result.breakDuration) updates.breakDuration = 5;
        if (!result.blockedStats) updates.blockedStats = {};
        
        chrome.storage.local.set(updates, () => {
            updateBlockingRules();
        });
    });
});

// Watch for storage changes to refresh rules or timer
chrome.storage.onChanged.addListener((changes) => {
    if (changes.blockedSites || changes.blockingActive) {
        updateBlockingRules();
    }
});

// Update declarativeNetRequest dynamic rules
async function updateBlockingRules() {
    const result = await chrome.storage.local.get(['blockedSites', 'blockingActive']);
    const sites = result.blockedSites || DEFAULT_SITES;
    const active = result.blockingActive || false;

    // Get current rules to clear them
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existingRules.map(r => r.id);

    const addRules = [];
    if (active) {
        sites.forEach((site, index) => {
            addRules.push({
                id: index + 1,
                priority: 1,
                action: { type: "block" },
                condition: {
                    urlFilter: `*://*.${site}/*`,
                    resourceTypes: ["main_frame"]
                }
            });
        });
    }

    try {
        await chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: removeRuleIds,
            addRules: addRules
        });
    } catch (err) {
        console.error("Error setting rules: ", err);
    }
}

// Alarm listener for Pomodoro timer
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'pomodoroAlarm') {
        const result = await chrome.storage.local.get(['timerEndTime', 'timerMode', 'breakDuration', 'focusDuration']);
        const now = Date.now();
        const endTime = result.timerEndTime || 0;

        if (now >= endTime) {
            // Timer finished!
            chrome.alarms.clear('pomodoroAlarm');
            
            if (result.timerMode === 'focus') {
                // Focus session completed -> start break
                chrome.storage.local.set({
                    blockingActive: false,
                    timerEndTime: now + (result.breakDuration * 60 * 1000),
                    timerMode: 'break'
                }, () => {
                    // Start break alarm
                    chrome.alarms.create('pomodoroAlarm', { delayInMinutes: result.breakDuration });
                    showNotification("Focus Session Finished!", "Great job! Time for a well-deserved break.");
                    updateBadge('break', result.breakDuration);
                });
            } else {
                // Break session completed -> stop or switch back
                chrome.storage.local.set({
                    blockingActive: false,
                    timerEndTime: null,
                    timerMode: null
                }, () => {
                    showNotification("Break Finished!", "Ready to focus again? Start a new session.");
                    clearBadge();
                });
            }
        } else {
            // Alarm tick - update badge minutes
            const minsLeft = Math.ceil((endTime - now) / 60000);
            updateBadge(result.timerMode, minsLeft);
        }
    }
});

function showNotification(title, message) {
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.png',
        title: title,
        message: message,
        priority: 2
    });
}

function updateBadge(mode, mins) {
    chrome.action.setBadgeText({ text: `${mins}m` });
    const color = mode === 'focus' ? '#f38ba8' : '#a6e3a1'; // red for focus, green for break
    chrome.action.setBadgeBackgroundColor({ color: color });
}

function clearBadge() {
    chrome.action.setBadgeText({ text: '' });
}

// Listen for custom block occurrences (simulated via tab load updates for stats)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'loading' && tab.url) {
        const result = await chrome.storage.local.get(['blockedSites', 'blockingActive', 'blockedStats']);
        if (!result.blockingActive) return;

        const sites = result.blockedSites || DEFAULT_SITES;
        const stats = result.blockedStats || {};
        
        try {
            const url = new URL(tab.url);
            const hostname = url.hostname.replace('www.', '');

            // Match domain or subdomain
            const matchedSite = sites.find(site => hostname === site || hostname.endsWith('.' + site));
            if (matchedSite) {
                stats[matchedSite] = (stats[matchedSite] || 0) + 1;
                chrome.storage.local.set({ blockedStats: stats });
            }
        } catch (e) {
            // Ignore invalid URLs (like chrome://)
        }
    }
});
