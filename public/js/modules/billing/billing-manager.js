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

            // Load data
            await this.loadCriticalData();
            this.loadSecondaryData();

            this.isInitialized = true;
            console.log('✅ BILLING: System initialized successfully');
        } catch (error) {
            console.error('❌ BILLING: Initialization failed:', error);
            this.domManager.showError(this.config.ERROR_MESSAGES.INITIALIZATION_FAILED);
        }
    }

    /**
     * Check user authentication
     */
    async checkAuthentication() {
        try {
            await this.waitForUserSystem();

            if (!window.userSystem.isAuthenticated()) {
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
            this.loadUsageStats()
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
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BillingManager;
}
