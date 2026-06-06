document.addEventListener('DOMContentLoaded', () => {
    const blockToggle = document.getElementById('blockToggle');
    const siteInput = document.getElementById('siteInput');
    const addSiteBtn = document.getElementById('addSiteBtn');
    const statusMsg = document.getElementById('statusMsg');
    const optionsLink = document.getElementById('optionsLink');
    const manageLink = document.getElementById('manageLink');

    const timerDisplay = document.getElementById('timerDisplay');
    const timerMode = document.getElementById('timerMode');
    const startTimerBtn = document.getElementById('startTimerBtn');
    const resetTimerBtn = document.getElementById('resetTimerBtn');

    let timerInterval = null;

    // Load initial blocker state
    chrome.storage.local.get(['blockingActive', 'focusDuration'], (result) => {
        blockToggle.checked = result.blockingActive || false;
        if (!timerInterval) {
            timerDisplay.textContent = `${String(result.focusDuration || 25).padStart(2, '0')}:00`;
        }
    });

    // Toggle blocking active
    blockToggle.addEventListener('change', () => {
        const isChecked = blockToggle.checked;
        chrome.storage.local.set({ blockingActive: isChecked }, () => {
            showStatus(isChecked ? "Blocker Enabled!" : "Blocker Disabled");
        });
    });

    // Add website quickly
    addSiteBtn.addEventListener('click', addNewSite);
    siteInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            addNewSite();
        }
    });

    function addNewSite() {
        const site = siteInput.value.trim().toLowerCase();
        if (!site) return;

        // Simple validation: remove protocol and www
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
                showStatus("Already in blocklist!", true);
                return;
            }

            list.push(cleanSite);
            chrome.storage.local.set({ blockedSites: list }, () => {
                siteInput.value = '';
                showStatus(`Blocked ${cleanSite}!`);
            });
        });
    }

    function showStatus(msg, isError = false) {
        statusMsg.textContent = msg;
        statusMsg.style.color = isError ? '#f38ba8' : '#a6e3a1';
        setTimeout(() => {
            statusMsg.textContent = '';
        }, 2500);
    }

    // Open options dashboard
    const openOptions = (e) => {
        e.preventDefault();
        chrome.runtime.openOptionsPage();
    };
    optionsLink.addEventListener('click', openOptions);
    manageLink.addEventListener('click', openOptions);

    // Pomodoro Timer logic
    function syncTimer() {
        chrome.storage.local.get(['timerEndTime', 'timerMode', 'focusDuration', 'breakDuration'], (result) => {
            const endTime = result.timerEndTime;
            const mode = result.timerMode;
            const now = Date.now();

            if (endTime && now < endTime) {
                // Timer is running
                timerMode.textContent = mode === 'focus' ? '🎯 FOCUS SESSION' : '☕ BREAK TIME';
                timerMode.style.color = mode === 'focus' ? '#f38ba8' : '#a6e3a1';
                startTimerBtn.textContent = 'Stop Timer';
                startTimerBtn.classList.add('btn-secondary');

                if (timerInterval) clearInterval(timerInterval);
                
                timerInterval = setInterval(() => {
                    const timeLeft = endTime - Date.now();
                    if (timeLeft <= 0) {
                        clearInterval(timerInterval);
                        syncTimer();
                    } else {
                        const totalSecs = Math.floor(timeLeft / 1000);
                        const mins = Math.floor(totalSecs / 60);
                        const secs = totalSecs % 60;
                        timerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                    }
                }, 200);
            } else {
                // Timer is stopped
                if (timerInterval) {
                    clearInterval(timerInterval);
                    timerInterval = null;
                }
                
                timerMode.textContent = 'Focus Session';
                timerMode.style.color = '#a6adc8';
                timerDisplay.textContent = `${String(result.focusDuration || 25).padStart(2, '0')}:00`;
                startTimerBtn.textContent = 'Start Focus';
                startTimerBtn.classList.remove('btn-secondary');
            }
        });
    }

    startTimerBtn.addEventListener('click', () => {
        chrome.storage.local.get(['timerEndTime', 'focusDuration'], (result) => {
            const isRunning = result.timerEndTime && Date.now() < result.timerEndTime;

            if (isRunning) {
                // Stop timer
                chrome.alarms.clear('pomodoroAlarm');
                chrome.storage.local.set({
                    timerEndTime: null,
                    timerMode: null,
                    blockingActive: false
                }, () => {
                    chrome.action.setBadgeText({ text: '' });
                    blockToggle.checked = false;
                    syncTimer();
                });
            } else {
                // Start Focus Timer
                const duration = result.focusDuration || 25;
                const endTime = Date.now() + (duration * 60 * 1000);

                chrome.storage.local.set({
                    timerEndTime: endTime,
                    timerMode: 'focus',
                    blockingActive: true // Auto block websites on focus start!
                }, () => {
                    chrome.alarms.create('pomodoroAlarm', { delayInMinutes: duration });
                    blockToggle.checked = true;
                    // Initial badge update
                    chrome.action.setBadgeText({ text: `${duration}m` });
                    chrome.action.setBadgeBackgroundColor({ color: '#f38ba8' });
                    syncTimer();
                });
            }
        });
    });

    resetTimerBtn.addEventListener('click', () => {
        chrome.alarms.clear('pomodoroAlarm');
        chrome.storage.local.set({
            timerEndTime: null,
            timerMode: null,
            blockingActive: false
        }, () => {
            chrome.action.setBadgeText({ text: '' });
            blockToggle.checked = false;
            syncTimer();
        });
    });

    // Run synchronization initially and whenever storage changes
    syncTimer();
    chrome.storage.onChanged.addListener((changes) => {
        if (changes.timerEndTime || changes.timerMode) {
            syncTimer();
        }
        if (changes.blockingActive) {
            blockToggle.checked = changes.blockingActive.newValue;
        }
    });
});
