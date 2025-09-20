// Utility functions for image handling and UI interactions
// Note: Constants moved to core/constants.js

// Make filename safe for Windows file system
const makeFileNameSafeForWindows = name => {
    let safeName = name.replace(CONFIG.ILLEGAL_CHARS, '')
        .replace(/\.{2,}/g, '.')
        .trim()
        .replace(/(^[. ]+|[. ]+$)/g, '');

    if (CONFIG.RESERVED_NAMES.includes(safeName.toUpperCase())) {
        safeName = 'file';
    }

    return safeName.slice(0, CONFIG.MAX_FILENAME_LENGTH);
};

// Add swipe functionality to HTML elements (utility function)
const addSwipeFunctionality = (element, callback) => {
    if (!element || typeof callback !== 'function') {
        console.warn('addSwipeFunctionality: Invalid element or callback');

        return;
    }

    const hammertime = new Hammer(element);

    hammertime.on('swipe', event => {
        callback(event);
    });

    return hammertime; // Return for cleanup if needed
};

// Check if any providers are selected
const isProviderSelected = () => {
    const checkedProviders = Array.from(document.querySelectorAll('input[name="providers"]:checked')).map(input => input.value);

    return checkedProviders.length > 0;
};

// Create download button for images
const getDownloadButton = (img = null) => {
    if (!img) {
        const wrapper = document.querySelector(`.${CSS_CLASSES.IMAGE_WRAPPER}.${CSS_CLASSES.IMAGE_FULLSCREEN}`);

        img = wrapper?.querySelector('img');
    }

    if (!img) {
        console.warn('getDownloadButton: No image found');

        return null;
    }

    const downloadBtn = document.createElement('button');

    downloadBtn.innerHTML = HTML_ICONS.DOWNLOAD;
    downloadBtn.setAttribute('title', 'Download');
    downloadBtn.addEventListener('click', () => {
        downloadImage(img);
    });

    return downloadBtn;
};

// Debounce function for performance optimization
const debounce = (func, wait) => {
    let timeout;

    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
};

// Export functions globally
window.isProviderSelected = isProviderSelected;
window.makeFileNameSafeForWindows = makeFileNameSafeForWindows;
window.getDownloadButton = getDownloadButton;
window.debounce = debounce;
window.addSwipeFunctionality = addSwipeFunctionality;
