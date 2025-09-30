// Stats Service - Lightweight wrapper for backward compatibility
// This service now delegates to UnifiedStatsService to eliminate redundancy

class StatsService {
    constructor() {
        this.listeners = new Set();
        this.isLoading = false;
        // Initialize asynchronously
        this.init().catch(error => {
            console.error('❌ STATS-SERVICE: Initialization error:', error);
        });
    }

    async waitForUnifiedServices() {
        const maxRetries = 10;
        let retries = 0;

        while (retries < maxRetries) {
            if (window.UnifiedStatsService) {
                this.setupUnifiedService();

                return;
            }
            retries++;
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.warn('⚠️ STATS-SERVICE: UnifiedStatsService not available, using fallback');
    }

    setupUnifiedService() {
        // Subscribe to unified stats service
        this.unsubscribe = window.UnifiedStatsService.subscribe(stats => {
            this.notify(stats);
        });
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

    // Check if cache is valid (delegated to unified service)
    isCacheValid() {
        if (window.UnifiedStatsService) {
            return window.UnifiedStatsService.isCacheValid();
        }

        return false;
    }

    // Get cached stats or fetch fresh ones
    async getStats(forceRefresh = false) {
        // Delegate to unified service if available
        if (window.UnifiedStatsService) {
            return await window.UnifiedStatsService.getStats(forceRefresh);
        }

        // Fallback to direct API call
        return this.fetchStatsFallback();
    }

    // Fallback fetch stats from server
    async fetchStatsFallback() {
        if (this.isLoading) {
            return null;
        }

        try {
            this.isLoading = true;

            // Check if user is authenticated
            if (!window.UnifiedAuthUtils || !window.UnifiedAuthUtils.isAuthenticated()) {
                return null;
            }

            // Fetch from server
            const response = await fetch('/api/transactions/user/stats', {
                headers: window.UnifiedAuthUtils.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                // Notify all listeners
                this.notify(data.data);

                return data.data;
            } else {
                console.error('❌ STATS-SERVICE: Failed to fetch stats:', data.error);

                return null;
            }
        } catch (error) {
            console.error('❌ STATS-SERVICE: Error fetching stats:', error);

            return null;
        } finally {
            this.isLoading = false;
        }
    }

    // Refresh stats after image generation
    async refreshAfterGeneration() {
        // Delegate to unified service if available
        if (window.UnifiedStatsService) {
            return await window.UnifiedStatsService.refreshAfterGeneration();
        }

        // Fallback
        if (!window.UnifiedAuthUtils || !window.UnifiedAuthUtils.isAuthenticated()) {
            return null;
        }

        // Small delay to ensure backend transaction is saved
        await new Promise(resolve => setTimeout(resolve, 500));

        try {
            return await this.fetchStatsFallback();
        } catch (error) {
            console.error('❌ STATS-SERVICE: Error refreshing stats', error);

            return null;
        }
    }

    // Clear cache (e.g., on logout)
    clearCache() {
        // Delegate to unified service if available
        if (window.UnifiedStatsService) {
            window.UnifiedStatsService.clearCache();
        }
        this.notify(null);
    }

    // Get formatted stats for display
    getFormattedStats() {
        // Delegate to unified service if available
        if (window.UnifiedStatsService) {
            return window.UnifiedStatsService.getFormattedStats();
        }

        return null;
    }

    // Format cost for display (delegated to unified service)
    formatCost(cost) {
        if (window.UnifiedStatsService) {
            return window.UnifiedStatsService.formatCost(cost);
        }

        return cost === 0 ? '$0.000' : `$${cost.toFixed(3)}`;
    }

    // Get current loading state
    getLoadingState() {
        // Delegate to unified service if available
        if (window.UnifiedStatsService) {
            return window.UnifiedStatsService.getLoadingState();
        }

        return this.isLoading;
    }

    // Get current credit balance
    getCreditBalance() {
        // Delegate to unified service if available
        if (window.UnifiedStatsService) {
            return window.UnifiedStatsService.getCreditBalance();
        }

        return 0;
    }

    // Get credit value in USD
    getCreditValue() {
        // Delegate to unified service if available
        if (window.UnifiedStatsService) {
            return window.UnifiedStatsService.getCreditValue();
        }

        return 0;
    }

    // Format credits for display (delegated to unified service)
    formatCredits(credits) {
        if (window.UnifiedStatsService) {
            return window.UnifiedStatsService.formatCredits(credits);
        }

        return credits === 0 ? '0 credits' : `${credits} credits`;
    }

    // Initialize service and set up event listeners
    async init() {
        try {
            // Wait for unified services first
            await this.waitForUnifiedServices();

            // Listen for authentication state changes
            const self = this;

            if (window.UnifiedEventService) {
                window.UnifiedEventService.onAuthChange(isAuthenticated => {
                    if (isAuthenticated) {
                        // User logged in, fetch stats
                        self.getStats();
                    } else {
                        // User logged out, clear cache
                        self.clearCache();
                    }
                });

                // Listen for image generation events
                window.UnifiedEventService.onImageGenerated(async () => {
                    try {
                        await self.refreshAfterGeneration();
                    } catch (error) {
                        console.error('❌ STATS-SERVICE: Error refreshing stats after generation:', error);
                    }
                });

                // Listen for payment completion events
                window.UnifiedEventService.onPaymentCompleted(async () => {
                    try {
                        await self.getStats(true);
                    } catch (error) {
                        console.error('❌ STATS-SERVICE: Error refreshing stats after payment:', error);
                    }
                });

                // Listen for credit updates
                window.UnifiedEventService.onCreditUpdate(async () => {
                    try {
                        await self.getStats(true);
                    } catch (error) {
                        console.error('❌ STATS-SERVICE: Error refreshing stats after credit update:', error);
                    }
                });
            } else {
                // Fallback to legacy event system
                this.setupLegacyEventListeners();
            }

        } catch (error) {
            console.error('❌ STATS-SERVICE: Error during initialization:', error);
            throw error;
        }
    }

    setupLegacyEventListeners() {
        // Legacy event listeners are deprecated - unified services handle this
        console.warn('⚠️ STATS-SERVICE: Legacy event listeners are deprecated, using unified services');
    }
}

// Create and initialize the service
let statsService = null;

const initializeStatsService = () => {
    try {
        statsService = new StatsService();
        statsService.init();

        // Export for global access
        if (typeof window !== 'undefined') {
            window.statsService = statsService;
        }

        return true;
    } catch (error) {
        console.error('❌ STATS-SERVICE: Failed to initialize:', error);

        return false;
    }
};

// Initialize immediately
if (typeof window !== 'undefined') {
    initializeStatsService();
} else {
    // Node.js environment - create but don't initialize
    statsService = new StatsService();
}
