# 🎯 Focus Mode - Chrome Extension

![Chrome Extensions](https://img.shields.io/badge/Chrome_Extension-4285F4?style=for-the-badge&logo=google-chrome&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

A minimalist Chrome extension built with Manifest V3 that helps you stay productive by blocking access to highly distracting websites (YouTube, Facebook, Twitter, Instagram).

## Features
- âšˇ **Manifest V3 Architecture**: Uses modern Chrome Extension APIs
- đź›ˇď¸Ź **Declarative Net Request**: Blazing fast and privacy-friendly network request blocking without reading your browsing data
- đźŚ™ **Modern UI**: Clean popup interface with an intuitive toggle switch and dark mode

## Installation for Development

1. Open Google Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** in the top right corner
3. Click **Load unpacked**
4. Select the folder containing this repository

## Architecture
- `manifest.json`: Configuration and permissions
- `background.js`: Service worker handling the `declarativeNetRequest` rules engine
- `popup.html` & `popup.js`: The user interface and state management via `chrome.storage.local`
