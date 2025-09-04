// Billing UI Manager - Handles user interactions and event management
/* global BILLING_CONSTANTS */

class BillingUIManager {
    constructor(domManager, dataManager, apiManager) {
        this.config = BILLING_CONSTANTS;
        this.domManager = domManager;
        this.dataManager = dataManager;
        this.apiManager = apiManager;
        this.eventListeners = new Map();
    }

    /**
     * Initialize UI manager
     */
    init() {
        this.setupEventListeners();
        this.handleUrlParams();
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Package selection
        this.addEventDelegate('click', this.config.SELECTORS.SELECT_PACKAGE_BTN,
            this.handlePackageSelection.bind(this));

        // Add credits button
        const addCreditsBtn = this.domManager.getElement('addCreditsBtn');

        if (addCreditsBtn) {
            this.addEventListener(addCreditsBtn, 'click', this.handleAddCredits.bind(this));
        }

        // Promo code functionality
        const redeemPromoBtn = this.domManager.getElement('redeemPromoBtn');

        if (redeemPromoBtn) {
            this.addEventListener(redeemPromoBtn, 'click', this.handlePromoRedeem.bind(this));
        }

        const promoCodeInput = this.domManager.getElement('promoCodeInput');

        if (promoCodeInput) {
            this.addEventListener(promoCodeInput, 'keypress', this.handlePromoKeyPress.bind(this));
            this.addEventListener(promoCodeInput, 'input', this.handlePromoInput.bind(this));
        }

        // Retry buttons
        this.addEventDelegate('click', this.config.SELECTORS.RETRY_BTN,
            this.handleRetryAction.bind(this));

        // Browser navigation
        this.addEventListener(window, 'popstate', this.handleUrlParams.bind(this));

        // Visibility changes for cache refresh
        this.addEventListener(document, 'visibilitychange', this.handleVisibilityChange.bind(this));
    }

    /**
     * Handle package selection
     * @param {Event} event - Click event
     */
    // eslint-disable-next-line
    async handlePackageSelection(event) {
        event.preventDefault();

        if (this.dataManager.isLoading()) {
            return;
        }

        const { packageId } = event.target.dataset;

        if (!packageId) {
            return;
        }

        const selectedPackage = this.dataManager.findPackageById(packageId);

        if (!selectedPackage) {
            this.domManager.showError(this.config.ERROR_MESSAGES.INVALID_PACKAGE);

            return;
        }

        this.dataManager.setLoading(true);
        this.domManager.showPackageLoading(packageId);

        try {
            const response = await this.apiManager.purchaseCredits(packageId);

            if (response.success && response.checkoutUrl) {
                window.location.href = response.checkoutUrl;
            } else {
                throw new Error(response.message || 'Failed to create checkout session');
            }
        } catch (error) {
            console.error('❌ BILLING UI: Package selection failed:', error);
            this.domManager.showError(error.message);
            this.domManager.hidePackageLoading(packageId);
        } finally {
            this.dataManager.setLoading(false);
        }
    }

    /**
     * Handle add credits button
     */
    handleAddCredits() {
        this.domManager.toggleCreditPackages();
    }

    /**
     * Handle promo code redemption
     */
    // eslint-disable-next-line
    async handlePromoRedeem() {
        const promoCodeInput = this.domManager.getElement('promoCodeInput');
        const promoCode = promoCodeInput?.value?.trim();

        if (!this.dataManager.validatePromoCode(promoCode)) {
            this.domManager.showPromoMessage(
                this.config.PROMO_ERROR_MESSAGES.EMPTY_CODE,
                this.config.MESSAGE_TYPES.ERROR
            );

            return;
        }

        if (this.dataManager.isLoading()) {
            return;
        }

        console.log('🎫 BILLING UI: Redeeming promo code:', promoCode);

        this.dataManager.setLoading(true);
        this.domManager.setPromoButtonLoading(true);
        this.domManager.showPromoMessage('Redeeming promo code...', this.config.MESSAGE_TYPES.INFO);

        try {
            const response = await this.apiManager.redeemPromoCode(promoCode);

            if (response.success) {
                const credits = response.credits || 0;

                // Show success message
                this.domManager.showPromoMessage(
                    this.config.SUCCESS_MESSAGES.PROMO_SUCCESS.replace('{credits}', credits),
                    this.config.MESSAGE_TYPES.SUCCESS
                );

                // Clear input
                if (promoCodeInput) {
                    promoCodeInput.value = '';
                }

                // Show success in main message area
                this.domManager.showSuccess(
                    this.config.SUCCESS_MESSAGES.PROMO_REDEEMED.replace('{credits}', credits)
                );

                // Trigger data refresh
                this.triggerDataRefresh();

            } else {
                throw new Error(response.message || 'Promo code redemption failed');
            }

        } catch (error) {
            console.error('❌ BILLING UI: Promo redemption failed:', error);
            this.domManager.showPromoMessage(error.message, this.config.MESSAGE_TYPES.ERROR);

        } finally {
            this.dataManager.setLoading(false);
            this.domManager.setPromoButtonLoading(false);
        }
    }

    /**
     * Handle promo code key press
     * @param {Event} event - Key press event
     */
    handlePromoKeyPress(event) {
        if (event.key === 'Enter') {
            this.handlePromoRedeem();
        }
    }

    /**
     * Handle promo code input
     */
    handlePromoInput() {
        this.domManager.clearPromoMessage();
    }

    /**
     * Handle retry action
     * @param {Event} event - Click event
     */
    handleRetryAction(event) {
        event.preventDefault();

        const { action } = event.target.dataset;

        if (action) {
            console.log('🔄 BILLING UI: Retrying action:', action);
            this.triggerDataRefresh();
        }
    }

    /**
     * Handle URL parameters
     */
    handleUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);

        if (urlParams.get(this.config.URL_PARAMS.SUCCESS) === 'true') {
            const packageId = urlParams.get(this.config.URL_PARAMS.PACKAGE);
            const packageName = this.dataManager.getPackageName(packageId);

            this.domManager.showSuccess(
                this.config.SUCCESS_MESSAGES.PAYMENT_SUCCESS.replace('{packageName}', packageName)
            );

            // Clear cache and refresh data
            this.triggerDataRefresh();

            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);

        } else if (urlParams.get(this.config.URL_PARAMS.CANCELLED) === 'true') {
            this.domManager.showError('Payment was cancelled. No charges were made to your account.');
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }

    /**
     * Handle visibility change
     */
    handleVisibilityChange() {
        if (!document.hidden) {
            this.refreshStaleData();
        }
    }

    /**
     * Refresh stale data
     */
    refreshStaleData() {
        const staleKeys = this.dataManager.getStaleKeys();

        if (staleKeys.includes(this.config.CACHE.KEYS.BALANCE)) {
            this.refreshBalance();
        }
        if (staleKeys.includes(this.config.CACHE.KEYS.USAGE_STATS)) {
            this.refreshUsageStats();
        }
    }

    /**
     * Trigger data refresh
     */
    triggerDataRefresh() {
        setTimeout(() => {
            this.refreshAllData();
        }, this.config.ANIMATION.DATA_REFRESH_DELAY);
    }

    /**
     * Refresh all data
     */
    async refreshAllData() {
        console.log('🔄 BILLING UI: Refreshing all data...');
        this.dataManager.clearCache();

        // Trigger custom event for data refresh
        document.dispatchEvent(new CustomEvent(this.config.EVENTS.DATA_REFRESHED));
    }

    /**
     * Refresh balance
     */
    async refreshBalance() {
        try {
            const { balance } = await this.apiManager.getBalance();

            this.domManager.updateBalanceDisplay(balance);
            this.dataManager.setCachedData(this.config.CACHE.KEYS.BALANCE, balance);
        } catch (error) {
            console.warn('⚠️ BILLING UI: Background balance refresh failed:', error);
        }
    }

    /**
     * Refresh usage stats
     */
    async refreshUsageStats() {
        try {
            const stats = await this.apiManager.getUserStats();

            this.domManager.updateUsageDisplay(stats);
            this.dataManager.setCachedData(this.config.CACHE.KEYS.USAGE_STATS, stats);
        } catch (error) {
            console.warn('⚠️ BILLING UI: Background usage refresh failed:', error);
        }
    }

    /**
     * Add event listener with cleanup tracking
     * @param {HTMLElement} element - Element to attach listener to
     * @param {string} event - Event type
     * @param {Function} handler - Event handler
     */
    addEventListener(element, event, handler) {
        element.addEventListener(event, handler);

        const key = `${element.id || 'anonymous'}_${event}`;

        this.eventListeners.set(key, { element, event, handler });
    }

    /**
     * Add event delegation
     * @param {string} event - Event type
     * @param {string} selector - CSS selector
     * @param {Function} handler - Event handler
     */
    addEventDelegate(event, selector, handler) {
        document.addEventListener(event, e => {
            if (e.target.matches(selector)) {
                handler(e);
            }
        });
    }

    /**
     * Cleanup event listeners
     */
    cleanup() {
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.eventListeners.clear();
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.BillingUIManager = BillingUIManager;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BillingUIManager;
}
