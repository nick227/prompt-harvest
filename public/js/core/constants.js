// core application constants
const API_ENDPOINTS = {
    // Image endpoints
    IMAGE_GENERATE: '/api/image/generate',
    IMAGES: '/api/images',
    IMAGE_RATING: '/api/images/:id/rating',
    IMAGE_STATS: '/api/images/stats',

    // Auth endpoints
    AUTH_REGISTER: '/api/auth/register',
    AUTH_LOGIN: '/api/auth/login',
    AUTH_LOGOUT: '/api/auth/logout',
    AUTH_PROFILE: '/api/auth/profile',
    AUTH_CHANGE_PASSWORD: '/api/auth/change-password',
    AUTH_FORGOT_PASSWORD: '/api/auth/forgot-password',
    AUTH_RESET_PASSWORD: '/api/auth/reset-password',

    // Feed endpoint
    FEED: '/api/images'
};
const CSS_CLASSES = {
    IMAGE_WRAPPER: 'image-wrapper',
    IMAGE_FULLSCREEN: 'full-screen',
    IMAGE_CONTROLS: 'fullscreen-controls',
    IMAGE_OUTPUT: 'image-output',
    PROMPT_TEXT: 'prompt-text',
    PROMPT_WRAPPER: 'prompt-text-wrapper',
    INFO_BOX: 'info-box',
    TAGS_BOX: 'tags-box'
};

const HTML_ICONS = {
    CLOSE: '<i class="fas fa-times"></i>',
    PREV: '<i class="fas fa-arrow-left"></i>',
    NEXT: '<i class="fas fa-arrow-right"></i>',
    DOWNLOAD: '<i class="fas fa-download"></i>',
    LIKE: '<i class="fas fa-heart"></i>'
};
const CONFIG = {
    IMAGE_MIME_TYPE: 'image/jpeg',
    MAX_TITLE_CHARS: 124,
    MAX_FILENAME_LENGTH: 100,
    ILLEGAL_CHARS: /[\x00-\x1F<>:"/\\|?*.,;(){ /* Empty block */ }[\]!@#$%^&+=`~]/g, // eslint-disable-line no-control-regex
    RESERVED_NAMES: ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9']
};

// textArea specific configuration
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
        wordType: '/word/types',
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

// feed configuration
const FEED_CONFIG = {
    requestLimit: 20, // balanced batch size for good filtering without overload
    imageLimit: 30,
    defaultPrompt: '',
    imagesSelector: 'section.images',
    promptOutputSelector: '.prompt-output',
    scrollDelay: 2000,
    timeouts: {
        scrollDelay: 2000
    },
    lazyLoading: {
        enabled: true,
        threshold: 0.1, // trigger when 10% of last image is visible
        rootMargin: '100px' // start loading 100px before reaching bottom
    }
};

// guidance configuration
const GUIDANCE_CONFIG = {
    defaultTop: 10,
    defaultBottom: 10,
    selectors: {
        top: 'select[name="guidance-top"]',
        bottom: 'select[name="guidance-bottom"]'
    },
    storage: {
        top: 'guidance-top',
        bottom: 'guidance-bottom'
    }
};

// rating configuration
const RATING_CONFIG = {
    selectors: {
        filter: '.rating-filter',
        promptOutput: 'div.prompt-output > li',
        fullscreen: '.full-screen',
        rating: '.rating'
    },
    keyCodes: {
        one: 49,
        two: 50,
        three: 51,
        four: 52,
        five: 53
    },
    api: {
        rating: '/api/images'
    }
};

// stats configuration
const STATS_CONFIG = {
    multiplier: 50,
    costPerImage: 0.99,
    costDivisor: 100,
    selectors: {
        imageCount: '#image-count',
        imageCost: '#image-cost'
    },
    api: {
        count: '/images/count'
    },
    currency: {
        locale: 'en-US',
        style: 'currency',
        currency: 'USD'
    }
};

// prompts configuration
const PROMPTS_CONFIG = {
    selectors: {
        wordTypes: 'ul.word-types',
        termCount: '#term-count',
        term: '#term',
        findButton: '.find',
        clearButton: '.clear',
        dropdown: '.dropdown',
        termContainer: '.term-container',
        loading: '.loading'
    },
    api: {
        words: '/words',
        termTypes: '/word/types'
    },
    timeouts: {
        dropdownDelay: 200,
        processingDelay: 1000
    },
    limits: {
        maxMatches: 10,
        minSearchLength: 1
    }
};

// image component configuration
const IMAGE_CONFIG = {
    selectors: {
        imageWrapper: '.image-wrapper',
        imageOutput: '.image-output',
        fullscreen: '.full-screen',
        fullscreenContainer: '.full-screen',
        controls: '.fullscreen-controls',
        imageContainer: '.prompt-output'
    },
    classes: {
        imageWrapper: 'image-wrapper',
        imageFullscreen: 'full-screen',
        imageControls: 'fullscreen-controls',
        imageOutput: 'image-output',
        fullscreenContainer: 'full-screen',
        closeButton: 'close-button',
        fullscreenImage: 'fullscreen-image',
        rating: 'rating',
        liked: 'liked'
    },
    icons: {
        close: '<i class="fas fa-times"></i>',
        prev: '<i class="fas fa-arrow-left"></i>',
        next: '<i class="fas fa-arrow-right"></i>',
        download: '<i class="fas fa-download"></i>',
        like: '<i class="fas fa-heart"></i>'
    },
    defaults: {
        errorImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIEVycm9yPC90ZXh0Pjwvc3ZnPg=='
    }
};

// provider component configuration
const PROVIDER_CONFIG = {
    selectors: {
        providerList: '.provider-list',
        providerGrid: '.provider-grid',
        providerCheckbox: '.provider-checkbox',
        selectAll: '.select-all-providers',
        clearAll: '.clear-all-providers'
    },
    classes: {
        provider: 'provider-item',
        checkbox: 'provider-checkbox',
        selected: 'selected',
        disabled: 'disabled'
    },
    api: {
        providers: '/providers',
        models: '/models'
    },
    defaults: {
        selectedProviders: ['flux'],
        maxSelections: 5
    }
};

// search configuration
const SEARCH_CONFIG = {
    selectors: {
        imageSearch: 'input[name="image-search"]',
        searchTerm: 'input[name="search_term"]',
        suggestions: '.search-suggestions'
    },
    timeouts: {
        debounce: 300,
        suggestionDelay: 200
    },
    limits: {
        maxSuggestions: 10,
        maxSearchHistory: 20
    },
    features: {
        autoComplete: true,
        searchHistory: true,
        advancedSearch: true
    }
};

// prompt history configuration
const PROMPT_HISTORY_CONFIG = {
    selectors: {
        promptHistory: '#prompt-history'
    }
};

// ES6 exports removed - loaded as regular script

// Export for global scope for backward compatibility
if (typeof window !== 'undefined') {
    window.API_ENDPOINTS = API_ENDPOINTS;
    window.CSS_CLASSES = CSS_CLASSES;
    window.HTML_ICONS = HTML_ICONS;
    window.CONFIG = CONFIG;
    window.TEXTAREA_CONFIG = TEXTAREA_CONFIG;
    window.FEED_CONFIG = FEED_CONFIG;
    window.GUIDANCE_CONFIG = GUIDANCE_CONFIG;
    window.RATING_CONFIG = RATING_CONFIG;
    window.STATS_CONFIG = STATS_CONFIG;
    window.PROMPTS_CONFIG = PROMPTS_CONFIG;
    window.IMAGE_CONFIG = IMAGE_CONFIG;
    window.PROVIDER_CONFIG = PROVIDER_CONFIG;
    window.SEARCH_CONFIG = SEARCH_CONFIG;
    window.PROMPT_HISTORY_CONFIG = PROMPT_HISTORY_CONFIG;
}
