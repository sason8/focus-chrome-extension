const BLOCKED_DOMAINS = ["youtube.com", "facebook.com", "twitter.com", "instagram.com"];

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "toggleFocus") {
        if (request.state) {
            enableBlocking();
        } else {
            disableBlocking();
        }
    }
});

function enableBlocking() {
    const rules = BLOCKED_DOMAINS.map((domain, index) => ({
        id: index + 1,
        priority: 1,
        action: { type: "block" },
        condition: { urlFilter: `*://*.${domain}/*`, resourceTypes: ["main_frame"] }
    }));

    chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: rules.map(r => r.id),
        addRules: rules
    });
}

function disableBlocking() {
    const ruleIds = BLOCKED_DOMAINS.map((_, index) => index + 1);
    chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: ruleIds
    });
}
