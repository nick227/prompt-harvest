// Stats Service - Centralized service for managing user statistics

class StatsService {
    constructor() {
        this.cache = null;
        this.lastFetch = null;
        this.cacheTimeout = 30000; // 30 seconds cache
        this.listeners = new Set();
        this.isLoading = false;
    }

    // Subscribe to stats updates
    subscribe(callback) {
        this.listeners.add(callback);

        return () => this.listeners.delete(callback);
    }

    // Notify all listeners of stats updates
    notify(stats) {
        this.listeners.forEach(callback => {
            try {
                callback(stats);
            } catch (error) {
                console.error('❌ Error in stats listener:', error);
            }
        });
    }

    // Check if cache is valid
    isCacheValid() {
        if (!this.cache || !this.lastFetch) {
            return false;
        }

        return (Date.now() - this.lastFetch) < this.cacheTimeout;
    }

    // Get cached stats or fetch fresh ones
    async getStats(forceRefresh = false) {
        // Check authentication first
        if (!window.userApi || !window.userApi.isAuthenticated()) {
            this.clearCache();

            return null;
        }

        // Return cached data if valid and not forcing refresh
        if (!forceRefresh && this.isCacheValid()) {
            return this.cache;
        }

        // Prevent multiple simultaneous fetches
        if (this.isLoading) {
            return this.cache;
        }

        return this.fetchStats();
    }

    // Fetch stats from server
    async fetchStats() {
        if (this.isLoading) {
            return this.cache;
        }

        try {
            this.isLoading = true;

            // Check if user is authenticated
            if (!window.userApi || !window.userApi.isAuthenticated()) {
                this.clearCache();

                return null;
            }

            // Check if API service is available
            if (!window.apiService) {
                console.warn('⚠️ STATS-SERVICE: API service not available');

                return this.cache;
            }

            // Fetch from server
            const response = await window.apiService.get('/api/transactions/user/stats');

            if (response.success) {
                this.cache = response.data;
                this.lastFetch = Date.now();

                // Notify all listeners
                this.notify(this.cache);

                return this.cache;
            } else {
                console.error('❌ STATS-SERVICE: Failed to fetch stats:', response.error);

                return this.cache;
            }
        } catch (error) {
            console.error('❌ STATS-SERVICE: Error fetching stats:', error);

            return this.cache;
        } finally {
            this.isLoading = false;
        }
    }

    // Refresh stats after image generation
    async refreshAfterGeneration() {
        // Don't refresh stats if user is not authenticated
        if (!window.userApi || !window.userApi.isAuthenticated()) {

            return null;
        }

        // Small delay to ensure backend transaction is saved
        await new Promise(resolve => setTimeout(resolve, 500));

        try {
            const stats = await this.fetchStats();

            return stats;
        } catch (error) {
            console.error('❌ STATS-SERVICE: Error refreshing stats', error);

            return null;
        }
    }

    // Clear cache (e.g., on logout)
    clearCache() {
        this.cache = null;
        this.lastFetch = null;
        this.notify(null);
    }

    // Get formatted stats for display
    getFormattedStats() {
        if (!this.cache) {
            return null;
        }

        const { generationCount = 0, totalCost = 0, creditBalance = 0, creditValue = 0 } = this.cache;

        return {
            count: generationCount,
            cost: this.formatCost(totalCost),
            credits: creditBalance,
            creditValue: this.formatCost(creditValue),
            raw: this.cache
        };
    }

    // Format cost for display
    formatCost(cost) {
        if (cost === 0) {
            return '$0.000';
        }

        // Format to 3 decimal places (fractions of a penny)
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 3,
            maximumFractionDigits: 3
        }).format(cost);
    }

    // Get current loading state
    getLoadingState() {
        return this.isLoading;
    }

    // Get current credit balance
    getCreditBalance() {
        if (!this.cache) {
            return 0;
        }

        return this.cache.creditBalance || 0;
    }

    // Get credit value in USD
    getCreditValue() {
        if (!this.cache) {
            return 0;
        }

        return this.cache.creditValue || 0;
    }

    // Format credits for display
    formatCredits(credits) {
        if (credits === 0) {
            return '0 credits';
        }

        return `${credits} credits`;
    }

    // Initialize service and set up event listeners
    init() {
        try {
            // Listen for authentication state changes
            const self = this;

            window.addEventListener('authStateChanged', event => {
                if (event.detail) {
                    // User logged in, fetch stats
                    self.fetchStats();
                } else {
                    // User logged out, clear cache
                    self.clearCache();
                }
            });

            // Listen for image generation events
            window.addEventListener('imageGenerated', async _event => {

                try {
                    await self.refreshAfterGeneration();
                } catch (error) {
                    console.error('❌ STATS-SERVICE: Error refreshing stats after generation:', error);
                }
            });

            // Listen for payment completion events
            window.addEventListener('paymentCompleted', async _event => {
                console.log('💳 STATS-SERVICE: Payment completed, refreshing stats');
                try {
                    await self.fetchStats();
                } catch (error) {
                    console.error('❌ STATS-SERVICE: Error refreshing stats after payment:', error);
                }
            });

            // Listen for credit updates
            window.addEventListener('creditsUpdated', async _event => {
                console.log('💎 STATS-SERVICE: Credits updated, refreshing stats');
                try {
                    await self.fetchStats();
                } catch (error) {
                    console.error('❌ STATS-SERVICE: Error refreshing stats after credit update:', error);
                }
            });

        } catch (error) {
            console.error('❌ STATS-SERVICE: Error during initialization:', error);
            throw error;
        }
    }
}

// Create and initialize the service with dependency checking
let statsService = null;

const initializeStatsService = () => {
    try {
        statsService = new StatsService();

        statsService.init();

        // Export for global access
        if (typeof window !== 'undefined') {
            window.statsService = statsService;
        } else {
            console.warn('⚠️ STATS-SERVICE: Window not available, cannot expose globally');
        }

        return true;
    } catch (error) {
        console.error('❌ STATS-SERVICE: Failed to initialize:', error);

        return false;
    }
};

// Wait for dependencies and initialize
const waitForDependenciesAndInit = () => {
    // Check if required dependencies are available
    if (typeof window !== 'undefined' && window.apiService && window.userApi) {

        return initializeStatsService();
    } else {
        // Retry after a short delay
        setTimeout(waitForDependenciesAndInit, 100);
    }
};

// Start the initialization process
if (typeof window !== 'undefined') {
    // If DOM is already loaded, start immediately
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', waitForDependenciesAndInit);
    } else {
        waitForDependenciesAndInit();
    }
} else {
    // Node.js environment - create but don't initialize
    statsService = new StatsService();
}

// Export removed - not needed for browser script tags
