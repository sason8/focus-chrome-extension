document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('toggleBtn');

    // Load current state
    chrome.storage.local.get(['focusEnabled'], (result) => {
        const isEnabled = result.focusEnabled || false;
        updateUI(isEnabled);
    });

    toggleBtn.addEventListener('click', () => {
        chrome.storage.local.get(['focusEnabled'], (result) => {
            const newState = !(result.focusEnabled || false);
            chrome.storage.local.set({ focusEnabled: newState }, () => {
                updateUI(newState);
                // Send message to background script to apply rules
                chrome.runtime.sendMessage({ action: "toggleFocus", state: newState });
            });
        });
    });

    function updateUI(isEnabled) {
        if (isEnabled) {
            toggleBtn.textContent = 'Disable Focus';
            toggleBtn.classList.add('active');
        } else {
            toggleBtn.textContent = 'Enable Focus';
            toggleBtn.classList.remove('active');
        }
    }
});
