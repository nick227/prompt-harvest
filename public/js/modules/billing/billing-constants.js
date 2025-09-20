// Billing Constants - Centralized configuration and DOM selectors
const BILLING_CONSTANTS = {
    // DOM Selectors
    SELECTORS: {
        // Balance and usage elements
        CURRENT_CREDITS: '#current-credits',
        TOTAL_IMAGES: '#total-images',
        MONTHLY_USAGE: '#monthly-usage',
        TOTAL_PURCHASED: '#total-purchased',
        ACCOUNT_CREATED: '#account-created',

        // Package elements
        PACKAGES_GRID: '#packages-grid',
        CREDIT_PACKAGES: '#credit-packages',

        // History elements
        PAYMENT_HISTORY: '#payment-history',
        CREDIT_HISTORY: '#credit-history',
        IMAGE_HISTORY: '#image-history',

        // Message elements
        ERROR_MESSAGE: '#error-message',
        SUCCESS_MESSAGE: '#success-message',
        USAGE_SUMMARY: '#usage-summary',

        // Promo code elements
        PROMO_CODE_INPUT: '#promo-code-input',
        REDEEM_PROMO_BTN: '#redeem-promo-btn',
        PROMO_MESSAGE: '#promo-message',

        // Action buttons
        ADD_CREDITS_BTN: '#add-credits-btn',
        RETRY_BTN: '.retry-btn',
        SELECT_PACKAGE_BTN: '.select-package-btn'
    },

    // API Endpoints
    ENDPOINTS: {
        BALANCE: '/api/credits/balance',
        PACKAGES: '/api/credits/packages',
        PURCHASE: '/api/credits/purchase',
        REDEEM: '/api/credits/redeem',
        USER_STATS: '/api/credits/stats', // User statistics endpoint
        PAYMENT_HISTORY: '/api/credits/payments',
        CREDIT_HISTORY: '/api/credits/history',
        IMAGE_HISTORY: '/api/images/user' // User's image generation history
    },

    // Cache Configuration
    CACHE: {
        TIMEOUT: 5 * 60 * 1000, // 5 minutes
        KEYS: {
            BALANCE: 'balance',
            PACKAGES: 'creditPackages',
            USAGE_STATS: 'usageStats',
            CREDIT_HISTORY: 'creditHistory',
            PAYMENT_HISTORY: 'paymentHistory'
        }
    },

    // Retry Configuration
    RETRY: {
        ATTEMPTS: 3,
        DELAY: 1000,
        EXPONENTIAL_BACKOFF: true
    },

    // UI States
    UI_STATES: {
        LOADING: 'loading',
        ERROR: 'error',
        SUCCESS: 'success',
        HIDDEN: 'hidden'
    },

    // Message Types
    MESSAGE_TYPES: {
        ERROR: 'error',
        SUCCESS: 'success',
        INFO: 'info',
        WARNING: 'warning'
    },

    // Package Configuration
    PACKAGE_FEATURES: [
        'Never expires',
        'Works with all AI providers',
        'Instant activation'
    ],

    // Error Messages
    ERROR_MESSAGES: {
        INITIALIZATION_FAILED: 'Failed to initialize billing page. Please refresh and try again.',
        CRITICAL_ELEMENTS_MISSING: 'Critical elements missing:',
        BALANCE_LOAD_FAILED: 'Failed to load balance',
        PACKAGES_LOAD_FAILED: 'Failed to load credit packages',
        USAGE_LOAD_FAILED: 'Failed to load usage summary',
        PAYMENT_PROCESSING_FAILED: 'Failed to process payment. Please try again.',
        PROMO_REDEMPTION_FAILED: 'Failed to redeem promo code. Please try again.',
        INVALID_PACKAGE: 'Invalid package selected',
        USER_SYSTEM_UNAVAILABLE: 'UserSystem not available after waiting'
    },

    // Success Messages
    SUCCESS_MESSAGES: {
        PAYMENT_SUCCESS: 'Payment successful! Your {packageName} have been added to your account.',
        PROMO_REDEEMED: 'Promo code redeemed! {credits} credits added to your account.',
        PROMO_SUCCESS: 'Success! {credits} credits have been added to your account.'
    },

    // Promo Code Error Messages
    PROMO_ERROR_MESSAGES: {
        NOT_FOUND: 'Promo code not found. Please check the code and try again.',
        EXPIRED: 'This promo code has expired.',
        ALREADY_REDEEMED: 'You have already redeemed this promo code.',
        MAX_REDEMPTIONS: 'This promo code has reached its redemption limit.',
        NOT_ACTIVE: 'This promo code is not currently active.',
        AUTHENTICATION_REQUIRED: 'Please log in to redeem promo codes.',
        EMPTY_CODE: 'Please enter a promo code'
    },

    // URL Parameters
    URL_PARAMS: {
        SUCCESS: 'success',
        CANCELLED: 'cancelled',
        PACKAGE: 'package'
    },

    // Event Names
    EVENTS: {
        PACKAGE_SELECTED: 'packageSelected',
        PROMO_REDEEMED: 'promoRedeemed',
        BALANCE_UPDATED: 'balanceUpdated',
        DATA_REFRESHED: 'dataRefreshed'
    },

    // Animation Delays
    ANIMATION: {
        MESSAGE_AUTO_HIDE: 5000,
        DATA_REFRESH_DELAY: 1000,
        USER_SYSTEM_WAIT_MAX: 50
    }
};

// Export for global access
if (typeof window !== 'undefined') {
    window.BILLING_CONSTANTS = BILLING_CONSTANTS;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BILLING_CONSTANTS;
}
