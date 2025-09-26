// Billing Data Manager - Handles state management and caching
/* global BILLING_CONSTANTS */

class BillingDataManager {
    constructor() {
        this.config = BILLING_CONSTANTS;
        this.state = {
            currentUser: null,
            creditPackages: [],
            paymentHistory: [],
            promoRedemptions: [],
            isLoading: false,
            cache: new Map(),
            lastUpdated: new Map()
        };
    }

    /**
     * Set loading state
     * @param {boolean} isLoading - Loading state
     */
    setLoading(isLoading) {
        this.state.isLoading = isLoading;
    }

    /**
     * Get loading state
     * @returns {boolean}
     */
    isLoading() {
        return this.state.isLoading;
    }

    /**
     * Set current user
     * @param {Object} user - User object
     */
    setCurrentUser(user) {
        this.state.currentUser = user;
    }

    /**
     * Get current user
     * @returns {Object|null}
     */
    getCurrentUser() {
        return this.state.currentUser;
    }

    /**
     * Set credit packages
     * @param {Array} packages - Credit packages array
     */
    setCreditPackages(packages) {
        this.state.creditPackages = packages;
        this.setCachedData(this.config.CACHE.KEYS.PACKAGES, packages);
    }

    /**
     * Get credit packages
     * @returns {Array}
     */
    getCreditPackages() {
        return this.state.creditPackages;
    }

    /**
     * Set payment history
     * @param {Array} history - Payment history array
     */
    setPaymentHistory(history) {
        this.state.paymentHistory = history;
    }

    /**
     * Get payment history
     * @returns {Array}
     */
    getPaymentHistory() {
        return this.state.paymentHistory;
    }

    /**
     * Set promo redemptions
     * @param {Array} redemptions - Promo redemptions array
     */
    setPromoRedemptions(redemptions) {
        this.state.promoRedemptions = redemptions;
    }

    /**
     * Get promo redemptions
     * @returns {Array}
     */
    getPromoRedemptions() {
        return this.state.promoRedemptions;
    }

    /**
     * Set image history
     * @param {Array} history - Image history array
     */
    setImageHistory(history) {
        this.state.imageHistory = history;
    }

    /**
     * Get image history
     * @returns {Array}
     */
    getImageHistory() {
        return this.state.imageHistory;
    }

    // Image history pagination state
    setImageHistoryPagination(pagination) {
        this.state.imageHistoryPagination = pagination;
    }
    getImageHistoryPagination() {
        return this.state.imageHistoryPagination || { page: 0, limit: 20, hasMore: false, totalCount: 0 };
    }
    updateImageHistoryPagination(updates) {
        this.state.imageHistoryPagination = { ...this.getImageHistoryPagination(), ...updates };
    }

    /**
     * Get cached data
     * @param {string} key - Cache key
     * @returns {any|null}
     */
    getCachedData(key) {
        const cached = this.state.cache.get(key);

        if (!cached) {
            return null;
        }

        const lastUpdated = this.state.lastUpdated.get(key);

        if (!lastUpdated || Date.now() - lastUpdated > this.config.CACHE.TIMEOUT) {
            this.state.cache.delete(key);
            this.state.lastUpdated.delete(key);

            return null;
        }

        return cached;
    }

    /**
     * Set cached data
     * @param {string} key - Cache key
     * @param {any} data - Data to cache
     */
    setCachedData(key, data) {
        this.state.cache.set(key, data);
        this.state.lastUpdated.set(key, Date.now());
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.state.cache.clear();
        this.state.lastUpdated.clear();
    }

    /**
     * Get cache statistics
     * @returns {Object}
     */
    getCacheStats() {
        const totalCached = this.state.cache.size;
        const staleKeys = [];

        for (const [key, timestamp] of this.state.lastUpdated) {
            if (Date.now() - timestamp > this.config.CACHE.TIMEOUT) {
                staleKeys.push(key);
            }
        }

        return {
            totalCached,
            staleKeys,
            memoryUsage: this.state.cache.size
        };
    }

    /**
     * Refresh stale data
     * @returns {Array} Array of stale keys
     */
    getStaleKeys() {
        const staleKeys = [];

        for (const [key, timestamp] of this.state.lastUpdated) {
            if (Date.now() - timestamp > this.config.CACHE.TIMEOUT) {
                staleKeys.push(key);
            }
        }

        return staleKeys;
    }

    /**
     * Find package by ID
     * @param {string} packageId - Package ID
     * @returns {Object|null}
     */
    findPackageById(packageId) {
        return this.state.creditPackages.find(pkg => pkg.id === packageId) || null;
    }

    /**
     * Get package name by ID
     * @param {string} packageId - Package ID
     * @returns {string}
     */
    getPackageName(packageId) {
        const pkg = this.findPackageById(packageId);

        return pkg ? pkg.name : 'credits';
    }

    /**
     * Validate promo code format
     * @param {string} promoCode - Promo code to validate
     * @returns {boolean}
     */
    validatePromoCode(promoCode) {
        return promoCode && typeof promoCode === 'string' && promoCode.trim().length > 0;
    }


    /**
     * Get state summary
     * @returns {Object}
     */
    getStateSummary() {
        return {
            hasUser: !!this.state.currentUser,
            packagesCount: this.state.creditPackages.length,
            paymentHistoryCount: this.state.paymentHistory.length,
            promoRedemptionsCount: this.state.promoRedemptions.length,
            isLoading: this.state.isLoading,
            cacheSize: this.state.cache.size
        };
    }

    /**
     * Reset state
     */
    reset() {
        this.state = {
            currentUser: null,
            creditPackages: [],
            paymentHistory: [],
            promoRedemptions: [],
            isLoading: false,
            cache: new Map(),
            lastUpdated: new Map()
        };
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.BillingDataManager = BillingDataManager;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BillingDataManager;
}
