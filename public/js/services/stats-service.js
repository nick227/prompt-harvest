// Stats Service - Centralized service for managing user statistics
console.log('📊 STATS-SERVICE: Script loading started...');

class StatsService {
    constructor() {
        console.log('📊 STATS-SERVICE: Constructor called...');
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
            console.log('📊 STATS-SERVICE: getStats called but user not authenticated');
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
            console.log('📊 STATS-SERVICE: Fetching user stats');

            // Check if user is authenticated
            if (!window.userApi || !window.userApi.isAuthenticated()) {
                console.log('📊 STATS-SERVICE: User not authenticated, clearing cache');
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
                console.log('✅ STATS-SERVICE: Stats fetched successfully', this.cache);

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
            console.log('📊 STATS-SERVICE: Skipping stats refresh - user not authenticated');

            return null;
        }

        console.log('🔄 STATS-SERVICE: Refreshing stats after image generation');

        // Small delay to ensure backend transaction is saved
        await new Promise(resolve => setTimeout(resolve, 500));

        try {
            const stats = await this.fetchStats();

            console.log('✅ STATS-SERVICE: Stats refreshed successfully', stats);

            return stats;
        } catch (error) {
            console.error('❌ STATS-SERVICE: Error refreshing stats', error);

            return null;
        }
    }

    // Clear cache (e.g., on logout)
    clearCache() {
        console.log('🗑️ STATS-SERVICE: Clearing stats cache');
        this.cache = null;
        this.lastFetch = null;
        this.notify(null);
    }

    // Get formatted stats for display
    getFormattedStats() {
        if (!this.cache) {
            return null;
        }

        const { generationCount = 0, totalCost = 0 } = this.cache;

        return {
            count: generationCount,
            cost: this.formatCost(totalCost),
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

    // Initialize service and set up event listeners
    init() {
        console.log('📊 STATS-SERVICE: Starting initialization...');

        try {
            // Listen for authentication state changes
            console.log('📊 STATS-SERVICE: Setting up authStateChanged listener...');
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
            console.log('📊 STATS-SERVICE: Setting up imageGenerated listener...');
            window.addEventListener('imageGenerated', async event => {
                console.log('📊 STATS-SERVICE: Received imageGenerated event', event.detail);
                console.log('📊 STATS-SERVICE: Current authentication status:', window.userApi?.isAuthenticated());

                try {
                    await self.refreshAfterGeneration();
                    console.log('📊 STATS-SERVICE: Stats refresh completed after imageGenerated');
                } catch (error) {
                    console.error('❌ STATS-SERVICE: Error refreshing stats after generation:', error);
                }
            });

            console.log('📊 STATS-SERVICE: Event listeners set up successfully');
            console.log('📊 STATS-SERVICE: Service initialized');
        } catch (error) {
            console.error('❌ STATS-SERVICE: Error during initialization:', error);
            throw error;
        }
    }
}

// Create and initialize the service with dependency checking
let statsService = null;

const initializeStatsService = function() {
    try {
        console.log('📊 STATS-SERVICE: Creating service instance...');
        statsService = new StatsService();

        console.log('📊 STATS-SERVICE: Initializing service...');
        statsService.init();

        // Export for global access
        if (typeof window !== 'undefined') {
            window.statsService = statsService;
            console.log('📊 STATS-SERVICE: Service exposed to window.statsService');
        } else {
            console.warn('⚠️ STATS-SERVICE: Window not available, cannot expose globally');
        }

        return true;
    } catch (error) {
        console.error('❌ STATS-SERVICE: Failed to initialize:', error);

        return false;
    }
}

// Wait for dependencies and initialize
const waitForDependenciesAndInit = function() {
    // Check if required dependencies are available
    if (typeof window !== 'undefined' && window.apiService && window.userApi) {
        console.log('📊 STATS-SERVICE: Dependencies available, initializing...');

        return initializeStatsService();
    } else {
        console.log('📊 STATS-SERVICE: Waiting for dependencies...');
        // Retry after a short delay
        setTimeout(waitForDependenciesAndInit, 100);
    }
}

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
    console.log('📊 STATS-SERVICE: Node.js environment detected, skipping browser initialization');
    statsService = new StatsService();
}

// Export removed - not needed for browser script tags
