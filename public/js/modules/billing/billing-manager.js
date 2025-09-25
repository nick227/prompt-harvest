// Billing Manager - Main orchestrator for billing system
/* global BILLING_CONSTANTS, BillingAPIManager, BillingDataManager, BillingDOMManager, BillingUIManager */

class BillingManager {
    constructor() {
        this.config = BILLING_CONSTANTS;
        this.isInitialized = false;

        // Initialize sub-managers
        this.apiManager = new BillingAPIManager();
        this.dataManager = new BillingDataManager();
        this.domManager = new BillingDOMManager();
        this.uiManager = new BillingUIManager(this.domManager, this.dataManager, this.apiManager);
    }

    /**
     * Initialize billing system
     */
    async init() {
        if (this.isInitialized) {
            return;
        }

        console.log('🏦 BILLING: Initializing billing system...');

        try {
            // Initialize DOM manager first
            this.domManager.init();

            // Check authentication
            await this.checkAuthentication();

            // Initialize UI manager
            this.uiManager.init();

            // Setup cross-component event listeners
            this.setupCrossComponentListeners();

            // Load data
            await this.loadCriticalData();
            this.loadSecondaryData();

            // Handle URL parameters for package pre-selection
            this.handleURLParameters();

            this.isInitialized = true;
            console.log('✅ BILLING: System initialized successfully');
        } catch (error) {
            console.error('❌ BILLING: Initialization failed:', error);
            this.domManager.showError(this.config.ERROR_MESSAGES.INITIALIZATION_FAILED);
        }
    }

    /**
     * Setup cross-component event listeners
     */
    setupCrossComponentListeners() {
        // Listen for promo code redemption events from header widget
        window.addEventListener('promoCodeRedeemed', (event) => {
            console.log('🎫 BILLING: Promo code redeemed event received:', event.detail);

            // Only refresh if the event came from header widget (not from billing page itself)
            if (event.detail.source === 'header-widget') {
                console.log('🔄 BILLING: Refreshing data due to header widget promo redemption');
                this.refresh();
            }
        });
    }

    /**
     * Check user authentication
     */
    async checkAuthentication() {
        try {
            await this.waitForUserSystem();

            if (!window.userSystem || !window.userSystem.isInitialized || !window.userSystem.isAuthenticated()) {
                console.log('🔐 BILLING: User not authenticated, redirecting to login');
                this.redirectToLogin();

                return;
            }

            const user = window.userSystem.getUser();

            this.dataManager.setCurrentUser(user);
            console.log('👤 BILLING: User authenticated:', user.email);
        } catch (error) {
            console.error('❌ BILLING: Authentication check failed:', error);
            this.redirectToLogin();
        }
    }

    /**
     * Wait for user system to be available
     */
    async waitForUserSystem() {
        let attempts = 0;
        const maxAttempts = this.config.ANIMATION.USER_SYSTEM_WAIT_MAX;

        while (!window.userSystem && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (!window.userSystem) {
            throw new Error(this.config.ERROR_MESSAGES.USER_SYSTEM_UNAVAILABLE);
        }

        // Wait for user system to be initialized
        while (!window.userSystem.isInitialized && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
    }

    /**
     * Redirect to login page
     */
    redirectToLogin() {
        const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);

        window.location.href = `/login.html?redirect=${returnUrl}`;
    }

    /**
     * Load critical data for initial render
     */
    async loadCriticalData() {
        const criticalPromises = [
            this.loadBalance(),
            this.loadCreditPackages()
        ];

        try {
            await Promise.allSettled(criticalPromises);
            console.log('✅ BILLING: Critical data loaded');
        } catch (error) {
            console.error('❌ BILLING: Critical data loading failed:', error);
        }
    }

    /**
     * Load secondary data in background
     */
    async loadSecondaryData() {
        const secondaryPromises = [
            this.loadUsageStats(),
            this.loadPaymentHistory(),
            this.loadImageHistory()
        ];

        try {
            await Promise.allSettled(secondaryPromises);
            console.log('✅ BILLING: Secondary data loaded');
        } catch (error) {
            console.error('❌ BILLING: Secondary data loading failed:', error);
        }
    }

    /**
     * Load current balance
     */
    async loadBalance() {
        try {
            const cachedBalance = this.dataManager.getCachedData(this.config.CACHE.KEYS.BALANCE);

            if (cachedBalance !== null) {
                this.domManager.updateBalanceDisplay(cachedBalance);
                // Still fetch fresh data in background
                this.refreshBalance();

                return;
            }

            const { balance } = await this.apiManager.getBalance();

            this.domManager.updateBalanceDisplay(balance);
            this.dataManager.setCachedData(this.config.CACHE.KEYS.BALANCE, balance);

            console.log('💰 BILLING: Current balance loaded:', balance);
        } catch (error) {
            console.error('❌ BILLING: Failed to load balance:', error);
            this.domManager.updateBalanceDisplay('Error');
        }
    }

    /**
     * Refresh balance in background
     */
    async refreshBalance() {
        try {
            const { balance } = await this.apiManager.getBalance();

            this.domManager.updateBalanceDisplay(balance);
            this.dataManager.setCachedData(this.config.CACHE.KEYS.BALANCE, balance);
        } catch (error) {
            console.warn('⚠️ BILLING: Background balance refresh failed:', error);
        }
    }

    /**
     * Load credit packages
     */
    async loadCreditPackages() {
        try {
            const cachedPackages = this.dataManager.getCachedData(this.config.CACHE.KEYS.PACKAGES);

            if (cachedPackages) {
                this.dataManager.setCreditPackages(cachedPackages);
                this.domManager.renderCreditPackages(cachedPackages);

                return;
            }

            const { packages } = await this.apiManager.getCreditPackages();

            this.dataManager.setCreditPackages(packages);
            this.domManager.renderCreditPackages(packages);

            console.log('📦 BILLING: Credit packages loaded:', packages.length);
        } catch (error) {
            console.error('❌ BILLING: Failed to load credit packages:', error);
            this.domManager.showError(this.config.ERROR_MESSAGES.PACKAGES_LOAD_FAILED);
        }
    }

    /**
     * Load usage statistics
     */
    async loadUsageStats() {
        try {
            const cachedStats = this.dataManager.getCachedData(this.config.CACHE.KEYS.USAGE_STATS);

            if (cachedStats) {
                this.domManager.updateUsageDisplay(cachedStats);
                // Fetch fresh data in background
                this.refreshUsageStats();

                return;
            }

            const stats = await this.apiManager.getUserStats();

            this.domManager.updateUsageDisplay(stats);
            this.dataManager.setCachedData(this.config.CACHE.KEYS.USAGE_STATS, stats);

            console.log('📈 BILLING: Usage summary loaded');
        } catch (error) {
            console.error('❌ BILLING: Failed to load usage summary:', error);
            this.domManager.showUsageError();
        }
    }

    /**
     * Refresh usage stats in background
     */
    async refreshUsageStats() {
        try {
            const stats = await this.apiManager.getUserStats();

            this.domManager.updateUsageDisplay(stats);
            this.dataManager.setCachedData(this.config.CACHE.KEYS.USAGE_STATS, stats);
        } catch (error) {
            console.warn('⚠️ BILLING: Background usage refresh failed:', error);
        }
    }

    /**
     * Refresh all data
     */
    async refresh() {
        console.log('🔄 BILLING: Refreshing all data...');
        this.dataManager.clearCache();
        await this.loadCriticalData();
        this.loadSecondaryData();
    }

    /**
     * Load payment history (includes Stripe payments and promo code redemptions)
     */
    async loadPaymentHistory() {
        try {
            console.log('🔄 BILLING: Loading payment history...');
            const payments = await this.apiManager.getPaymentHistory();
            const promoRedemptions = await this.apiManager.getPromoRedemptions();

            this.dataManager.setPaymentHistory(payments);
            this.dataManager.setPromoRedemptions(promoRedemptions);
            this.uiManager.updatePaymentHistory(payments, promoRedemptions);
            console.log(`✅ BILLING: Loaded ${payments.length} payment records and ${promoRedemptions.length} promo redemptions`);
        } catch (error) {
            console.error('❌ BILLING: Failed to load payment history:', error);
            this.uiManager.showError('Failed to load payment history');
        }
    }

    /**
     * Load image history
     */
    async loadImageHistory(page = 0, append = false) {
        try {
            console.log('🔄 BILLING: Loading image history...', { page, append });

            const { limit } = this.dataManager.getImageHistoryPagination();

            const result = await this.apiManager.getImageHistory(limit, page);

            console.log('🔄 BILLING: Images received:', result);

            // Update pagination state
            this.dataManager.updateImageHistoryPagination({
                page: result.page,
                hasMore: result.hasMore,
                totalCount: result.totalCount
            });

            // Handle appending vs replacing
            let allImages;
            if (append && page > 0) {
                const existingImages = this.dataManager.getImageHistory();
                allImages = [...existingImages, ...result.images];
            } else {
                allImages = result.images;
            }

            this.dataManager.setImageHistory(allImages);
            this.uiManager.updateImageHistory(allImages, result.hasMore);
            console.log(`✅ BILLING: Loaded ${result.images.length} image records (total: ${allImages.length})`);
        } catch (error) {
            console.error('❌ BILLING: Failed to load image history:', error);
            console.error('❌ BILLING: Error stack:', error.stack);
            this.uiManager.showImageHistoryError(error.message || 'Failed to load image history');
        }
    }

    async loadMoreImageHistory() {
        const pagination = this.dataManager.getImageHistoryPagination();
        if (pagination.hasMore) {
            const nextPage = pagination.page + 1;
            console.log('🔄 BILLING: Loading more images, page:', nextPage);
            await this.loadImageHistory(nextPage, true);
        }
    }

    /**
     * Get system status
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            hasUser: !!this.dataManager.getCurrentUser(),
            dataSummary: this.dataManager.getStateSummary(),
            cacheStats: this.dataManager.getCacheStats()
        };
    }

    /**
     * Handle URL parameters for package pre-selection
     */
    handleURLParameters() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const packageParam = urlParams.get('package');

            if (packageParam) {
                console.log(`🏦 BILLING: Package parameter found: ${packageParam}`);

                // Wait a bit for packages to be loaded, then pre-select
                setTimeout(() => {
                    this.preSelectPackage(packageParam);
                }, 1000);
            }
        } catch (error) {
            console.warn('⚠️ BILLING: Error handling URL parameters:', error);
        }
    }

    /**
     * Pre-select a package based on URL parameter
     * @param {string} packageId - Package ID to pre-select
     */
    preSelectPackage(packageId) {
        try {
            const packageElement = document.querySelector(`[data-package-id="${packageId}"]`);

            if (packageElement) {
                console.log(`🏦 BILLING: Pre-selecting package: ${packageId}`);

                // Scroll to packages section
                const packagesSection = document.querySelector('.credit-packages');

                if (packagesSection) {
                    packagesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }

                // Highlight the package
                packageElement.classList.add('selected', 'border-blue-500', 'bg-blue-50');

                // Focus the select button
                const selectButton = packageElement.querySelector('.select-package-btn');

                if (selectButton) {
                    selectButton.focus();
                }

                // Show a brief notification
                this.domManager.showSuccess(`Package "${packageId}" pre-selected from stats bar`);
            } else {
                console.warn(`⚠️ BILLING: Package element not found for ID: ${packageId}`);
            }
        } catch (error) {
            console.error('❌ BILLING: Error pre-selecting package:', error);
        }
    }

    /**
     * Cleanup and destroy
     */
    destroy() {
        this.uiManager.cleanup();
        this.dataManager.clearCache();
        this.isInitialized = false;
        console.log('🧹 BILLING: System destroyed and cleaned up');
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.BillingManager = BillingManager;
    // Also make the instance available
    window.billingManager = null; // Will be set when initialized
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BillingManager;
}
