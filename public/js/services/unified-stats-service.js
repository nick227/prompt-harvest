/**
 * Unified Stats Service
 * Centralized service for all statistics and transaction data
 * Consolidates stats fetching, caching, and formatting
 */
class UnifiedStatsService {
    constructor() {
        this.stats = null;
        this.cache = new Map();
        this.cacheTimeout = 30000; // 30 seconds
        this.listeners = new Set();
        this.isLoading = false;
        this.init();
    }

    /**
     * Initialize the service
     */
    init() {
        this.setupEventListeners();
    }

    /**
     * Setup event listeners for stats updates
     */
    setupEventListeners() {
        // Listen for authentication state changes
        if (window.UnifiedAuthUtils) {
            window.UnifiedAuthUtils.addAuthListener(isAuthenticated => {
                if (isAuthenticated) {
                    this.loadStats();
                } else {
                    this.clearCache();
                }
            });
        }

        // Listen for image generation
        window.addEventListener('image:generated', () => {
            this.refreshAfterGeneration();
        });

        // Listen for credit updates
        window.addEventListener('credits:updated', () => {
            this.loadStats(true); // Force refresh
        });

        // Listen for payment completion
        window.addEventListener('credits:payment-completed', () => {
            this.loadStats(true); // Force refresh
        });
    }

    /**
     * Subscribe to stats updates
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    subscribe(callback) {
        this.listeners.add(callback);

        return () => this.listeners.delete(callback);
    }

    /**
     * Notify all listeners of stats updates
     * @param {Object} data - Stats data
     */
    notify(data) {
        this.listeners.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error('❌ Error in stats listener:', error);
            }
        });
    }

    /**
     * Get current stats
     * @param {boolean} forceRefresh - Force refresh from server
     * @returns {Promise<Object>} Stats data
     */
    async getStats(forceRefresh = false) {
        if (!window.UnifiedAuthUtils || !window.UnifiedAuthUtils.isAuthenticated()) {
            return null;
        }

        const cacheKey = 'stats';
        const cached = this.getCachedData(cacheKey);

        if (!forceRefresh && cached) {
            return cached;
        }

        return this.fetchStats();
    }

    /**
     * Fetch stats from server
     * @returns {Promise<Object>} Stats data
     */
    async fetchStats() {
        if (this.isLoading) {
            return this.stats;
        }

        try {
            this.isLoading = true;

            const response = await fetch('/api/transactions/user/stats', {
                headers: window.UnifiedAuthUtils.getAuthHeaders()
            });

            if (!response.ok) {
                if (response.status === 401) {
                    this.stats = null;

                    return null;
                }
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                this.stats = data.data;
                this.setCachedData('stats', this.stats);
                this.notify(this.stats);

                return this.stats;
            }

            return this.stats;
        } catch (error) {
            console.error('Stats fetch failed:', error);

            return this.stats;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Refresh stats after image generation
     * @returns {Promise<Object>} Updated stats
     */
    async refreshAfterGeneration() {
        if (!window.UnifiedAuthUtils || !window.UnifiedAuthUtils.isAuthenticated()) {
            return null;
        }

        // Small delay to ensure backend transaction is saved
        await new Promise(resolve => setTimeout(resolve, 500));

        try {
            return await this.fetchStats();
        } catch (error) {
            console.error('Error refreshing stats after generation:', error);

            return null;
        }
    }

    /**
     * Get formatted stats for display
     * @returns {Object} Formatted stats
     */
    getFormattedStats() {
        if (!this.stats) {
            return null;
        }

        const { generationCount = 0, totalCost = 0, creditBalance = 0, creditValue = 0 } = this.stats;

        return {
            count: generationCount,
            cost: this.formatCost(totalCost),
            credits: creditBalance,
            creditValue: this.formatCost(creditValue),
            raw: this.stats
        };
    }

    /**
     * Format cost for display
     * @param {number} cost - Cost amount
     * @returns {string} Formatted cost
     */
    formatCost(cost) {
        if (cost === 0) {
            return '$0.000';
        }

        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 3,
            maximumFractionDigits: 3
        }).format(cost);
    }

    /**
     * Get current credit balance from stats
     * @returns {number} Credit balance
     */
    getCreditBalance() {
        return this.stats?.creditBalance || 0;
    }

    /**
     * Get credit value in USD
     * @returns {number} Credit value
     */
    getCreditValue() {
        return this.stats?.creditValue || 0;
    }

    /**
     * Get generation count
     * @returns {number} Generation count
     */
    getGenerationCount() {
        return this.stats?.generationCount || 0;
    }

    /**
     * Get total cost
     * @returns {number} Total cost
     */
    getTotalCost() {
        return this.stats?.totalCost || 0;
    }

    /**
     * Get cached data
     * @param {string} key - Cache key
     * @returns {*} Cached data or null
     */
    getCachedData(key) {
        const cached = this.cache.get(key);

        if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
            return cached.data;
        }

        return null;
    }

    /**
     * Set cached data
     * @param {string} key - Cache key
     * @param {*} data - Data to cache
     */
    setCachedData(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        this.stats = null;
        this.notify(null);
    }

    /**
     * Get loading state
     * @returns {boolean} Loading state
     */
    getLoadingState() {
        return this.isLoading;
    }
}

// Create and initialize the service
window.UnifiedStatsService = new UnifiedStatsService();
