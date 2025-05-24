const TEXTAREA_CONFIG = {
    isMobile: window.innerWidth < 1200,
    limits: {
        wordType: window.innerWidth < 1200 ? 8 : 33,
        maxAuto: 6,
        maxSamples: 14
    },
    selectors: {
        textArea: '#prompt-textarea',
        matches: '#matches',
        multiplier: '#multiplier',
        searchTerm: '#search_term',
        replaceTerm: '#replace_term',
        generateBtn: '.btn-generate',
        providers: 'input[name="providers"]',
        allProviders: '.all-providers',
        autoDownload: 'input[name="autoDownload"]',
        queue: '.queue',
        btnQueue: '.btn-queue',
        toggleMenu: '.toggle-menu'
    },
    api: {
        wordType: '/word/type',
        promptBuild: '/prompt/build',
        clauses: '/prompt/clauses'
    },
    timeouts: {
        debounce: 200,
        autoGenerate: 100
    },
    classes: {
        active: 'active',
        sample: 'sample'
    }
};

// Add a state manager
const StateManager = {
    state: {
        requestCount: 0,
        isGenerating: false,
        dropdownIsOpen: false,
        lastMatchedWord: ''
    },

    update(key, value) {
        this.state[key] = value;
        this.notify(key);
    },

    notify(key) {
        // Add observers if needed
    }
};
// DOM Element Cache
const textarea_cache = {
    cache: new Map(),

    get(selector) {
        if (!this.cache.has(selector)) {
            const element = document.querySelector(selector);
            if (element) {
                this.cache.set(selector, element);
            }
        }
        return this.cache.get(selector);
    },

    init() {
        Object.values(TEXTAREA_CONFIG.selectors).forEach(selector => {
            this.get(selector);
        });
        return this;
    }
};

// Utility Functions
const textarea_utils = {
    debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    },

    async fetchJson(url) {
        const response = await fetch(url);
        return await response.json();
    },

    removeExtraWhiteSpace(str) {
        return str.replace(/\s+/g, ' ').trim();
    },

    updateElementClass(element, condition, className = 'active') {
        element.classList[condition ? 'add' : 'remove'](className);
    },

    // Add memoization for expensive operations
    memoize(fn) {
        const cache = new Map();
        return (...args) => {
            const key = JSON.stringify(args);
            if (!cache.has(key)) {
                cache.set(key, fn(...args));
            }
            return cache.get(key);
        };
    },

    // Add throttle function
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
};

// Add a dedicated error handler
const errorHandler = {
    show(message, type = 'error') {
        console.error(message);
        alert(message); // Replace with better UI notification
    },

    handle(error, context) {
        const message = `Error in ${context}: ${error.message}`;
        this.show(message);
        return null;
    }
};