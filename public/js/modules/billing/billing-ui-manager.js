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

            if (response.success && response.url) {
                window.location.href = response.url;
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
        // Use the global credits modal
        if (window.globalCreditsModal) {
            window.globalCreditsModal.show();
        } else if (window.creditWidget && window.creditWidget.showPurchaseOptions) {
            // Fallback to credit widget modal
            window.creditWidget.showPurchaseOptions();
        } else {
            // Fallback to billing system's modal if neither is available
            this.domManager.toggleCreditPackages();
        }
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
                const successMessage = this.config.SUCCESS_MESSAGES.PROMO_REDEEMED.replace('{credits}', credits);
                this.domManager.showSuccess(successMessage);

                // Trigger data refresh
                this.triggerDataRefresh();

                // Notify header widget to refresh balance
                this.notifyHeaderWidgetRefresh();

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
     * Notify header widget to refresh balance
     */
    notifyHeaderWidgetRefresh() {
        // Dispatch custom event for header widget to listen to
        window.dispatchEvent(new CustomEvent('promoCodeRedeemed', {
            detail: {
                timestamp: Date.now(),
                source: 'billing-page'
            }
        }));

        // Also directly refresh header widget if available
        if (window.creditWidget && typeof window.creditWidget.loadBalance === 'function') {
            console.log('🔄 BILLING UI: Directly refreshing header widget');
            window.creditWidget.loadBalance();
        }
    }

    /**
     * Refresh all data
     */
    async refreshAllData() {
        console.log('🔄 BILLING UI: Refreshing all data...');
        this.dataManager.clearCache();

        // Refresh balance and usage stats
        await Promise.allSettled([
            this.refreshBalance(),
            this.refreshUsageStats()
        ]);

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
     * Update payment history display (includes Stripe payments and promo code redemptions)
     * @param {Array} payments - Payment history data
     * @param {Array} promoRedemptions - Promo code redemption data
     */
    updatePaymentHistory(payments, promoRedemptions = []) {
        const container = this.domManager.getElement('paymentHistory');

        if (!container) {
            console.warn('⚠️ BILLING UI: Payment history container not found');

            return;
        }

        // Combine payments and promo redemptions
        const allTransactions = [
            ...(payments || []).map(payment => ({
                ...payment,
                type: 'payment',
                displayAmount: `$${(payment.amount / 100).toFixed(2)}`,
                displayCredits: `${payment.credits} credits`,
                status: payment.status,
                icon: 'fas fa-credit-card'
            })),
            ...(promoRedemptions || []).map(promo => ({
                ...promo,
                type: 'promo',
                displayAmount: 'Free',
                displayCredits: `${promo.credits} credits`,
                status: 'redeemed',
                icon: 'fas fa-ticket-alt'
            }))
        ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (allTransactions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-receipt" aria-hidden="true"></i>
                    <h3>No Payment History</h3>
                    <p>You haven't made any purchases or redeemed any promo codes yet.</p>
                </div>
            `;

            return;
        }

        const transactionItems = allTransactions.map(transaction => `
            <div class="payment-item">
                <div class="payment-info">
                    <div class="payment-amount">
                        <i class="${transaction.icon}" aria-hidden="true"></i>
                        ${transaction.displayAmount}
                    </div>
                    <div class="payment-credits">${transaction.displayCredits}</div>
                </div>
                <div class="payment-details">
                    <div class="payment-status status-${transaction.status}">
                        ${transaction.type === 'promo' ? 'Promo Redeemed' : transaction.status}
                    </div>
                    <div class="payment-date">${new Date(transaction.createdAt).toLocaleDateString()}</div>
                </div>
            </div>
        `).join('');

        container.innerHTML = `
            <div class="payment-list">
                ${transactionItems}
            </div>
        `;
    }


    /**
     * Update image history display
     * @param {Array} images - Image history data
     */
    updateImageHistory(images, hasMore = false) {
        console.log('🔄 BILLING UI: updateImageHistory called with:', { imagesCount: images?.length, hasMore });
        const container = this.domManager.getElement('imageHistory');

        if (!container) {
            console.warn('⚠️ BILLING UI: Image history container not found');
            return;
        }

        console.log('✅ BILLING UI: Image history container found:', container);

        if (!images || images.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-images" aria-hidden="true"></i>
                    <h3>No Images Generated</h3>
                    <p>You haven't generated any images yet.</p>
                </div>
            `;
            return;
        }

        console.log('🔄 BILLING UI: Rendering', images.length, 'images');

        const imageItems = images.map(image => {
            // Calculate cost information
            const costPerImage = image.costPerImage || 1.0;
            const creditsUsed = Math.ceil(costPerImage);
            const modelName = image.model || image.provider || 'Unknown';
            const providerName = image.provider || 'Unknown';

            // Format date
            const date = new Date(image.createdAt).toLocaleDateString();
            const time = new Date(image.createdAt).toLocaleTimeString();

            // Determine status color
            const statusClass = image.isPublic ? 'status-public' : 'status-private';
            const statusText = image.isPublic ? 'Public' : 'Private';

            return `
                <div class="image-item">
                    <div class="image-preview">
                        <img src="${image.url}" alt="Generated image" loading="lazy"
                             onerror="this.src='/images/placeholder.png'">
                    </div>
                    <div class="image-info">
                        <div class="image-details">
                            <div class="image-model">
                                <i class="fas fa-robot"></i>
                                <span>${modelName}</span>
                                <span class="provider-badge">${providerName}</span>
                            </div>
                            <div class="image-prompt">
                                <i class="fas fa-quote-left"></i>
                                <span>${this.truncateText(image.prompt || 'No prompt', 60)}</span>
                            </div>
                        </div>
                        <div class="image-meta">
                            <div class="image-cost">
                                <i class="fas fa-coins"></i>
                                <span>${creditsUsed} credit${creditsUsed !== 1 ? 's' : ''}</span>
                                <span class="cost-detail">($${costPerImage.toFixed(3)})</span>
                            </div>
                            <div class="image-status ${statusClass}">
                                <i class="fas fa-${image.isPublic ? 'globe' : 'lock'}"></i>
                                <span>${statusText}</span>
                            </div>
                            <div class="image-date">
                                <i class="fas fa-calendar"></i>
                                <span>${date} ${time}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Create load more button if there are more images
        const loadMoreButton = hasMore ? `
            <div class="load-more-container">
                <button id="load-more-images" class="load-more-btn">
                    <i class="fas fa-plus"></i>
                    Load More Images
                </button>
            </div>
        ` : '';

        container.innerHTML = `
            <div class="image-list">
                ${imageItems}
            </div>
            ${loadMoreButton}
        `;

        // Add event listener for load more button
        if (hasMore) {
            this.setupLoadMoreButton();
        }

        console.log('✅ BILLING UI: Image history rendered successfully');
    }

    /**
     * Setup load more button event listener
     */
    setupLoadMoreButton() {
        const loadMoreBtn = document.getElementById('load-more-images');
        if (loadMoreBtn) {
            // Remove existing listener to prevent duplicates
            if (this.handleLoadMore) {
                loadMoreBtn.removeEventListener('click', this.handleLoadMore);
            }

            // Add new listener
            this.handleLoadMore = () => {
                console.log('🔄 BILLING UI: Load more button clicked');
                loadMoreBtn.disabled = true;
                loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';

                // Call the billing manager's load more method
                if (window.billingManager) {
                    window.billingManager.loadMoreImageHistory()
                        .then(() => {
                            console.log('✅ BILLING UI: Load more completed');
                        })
                        .catch((error) => {
                            console.error('❌ BILLING UI: Load more failed:', error);
                            loadMoreBtn.disabled = false;
                            loadMoreBtn.innerHTML = '<i class="fas fa-plus"></i> Load More Images';
                        });
                }
            };

            // Use the proper event listener management
            this.addEventListener(loadMoreBtn, 'click', this.handleLoadMore);
        }
    }

    /**
     * Show error state for image history
     * @param {string} message - Error message
     */
    showImageHistoryError(message) {
        const container = this.domManager.getElement('imageHistory');
        if (!container) {
            console.warn('⚠️ BILLING UI: Image history container not found for error display');
            return;
        }

        container.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle" aria-hidden="true"></i>
                <h3>Failed to Load Image History</h3>
                <p>${message}</p>
                <button class="retry-btn" onclick="location.reload()">
                    <i class="fas fa-refresh"></i>
                    Retry
                </button>
            </div>
        `;
    }

    /**
     * Truncate text to specified length
     * @param {string} text - Text to truncate
     * @param {number} maxLength - Maximum length
     * @returns {string} Truncated text
     */
    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength) + '...';
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
