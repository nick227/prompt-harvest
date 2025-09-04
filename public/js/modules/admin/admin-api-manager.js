// Admin API Manager - Handles API communication for admin operations
/* global ADMIN_CONSTANTS */

class AdminAPIManager {
    constructor(dataService) {
        this.dataService = dataService;
        this.baseUrl = '/api/admin';
        this.cache = new Map();
        this.init();
    }

    /**
     * Initialize API manager
     */
    init() {
        console.log('🌐 ADMIN-API: Initializing API manager...');
        this.setupInterceptors();
    }

    /**
     * Setup request/response interceptors
     */
    setupInterceptors() {
        // Could add global error handling, authentication, etc.
        this.requestInterceptors = [];
        this.responseInterceptors = [];
    }

    /**
     * Generic API request method
     */
    async request(method, endpoint, data = null, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            config.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, config);

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`🚨 ADMIN-API: Request failed for ${endpoint}:`, error);
            throw error;
        }
    }

    /**
     * Get request with caching
     */
    async getCached(endpoint, cacheKey = null, ttl = ADMIN_CONSTANTS.DEFAULTS.CACHE_TIMEOUT) {
        const key = cacheKey || endpoint;
        const cached = this.cache.get(key);

        if (cached && (Date.now() - cached.timestamp) < ttl) {
            return cached.data;
        }

        const data = await this.request('GET', endpoint);

        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });

        return data;
    }

    /**
     * Verify admin access
     */
    async verifyAdminAccess() {
        return await this.request('GET', ADMIN_CONSTANTS.ENDPOINTS.VERIFY_ACCESS);
    }

    /**
     * Get payment analytics data
     */
    async getPaymentAnalytics() {
        return await this.getCached(
            ADMIN_CONSTANTS.ENDPOINTS.PAYMENT_ANALYTICS,
            'payment-analytics'
        );
    }

    /**
     * Get payments data with pagination and filters
     */
    async getPayments(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = `${ADMIN_CONSTANTS.ENDPOINTS.PAYMENTS}${queryString ? `?${queryString}` : ''}`;

        return await this.request('GET', endpoint);
    }

    /**
     * Get pricing data
     */
    async getPricing() {
        return await this.getCached(
            ADMIN_CONSTANTS.ENDPOINTS.PRICING,
            'pricing-data'
        );
    }

    /**
     * Update pricing
     */
    async updatePricing(pricingData) {
        const result = await this.request('PUT', ADMIN_CONSTANTS.ENDPOINTS.PRICING, pricingData);

        // Invalidate cache
        this.cache.delete('pricing-data');

        return result;
    }

    /**
     * Get pricing history
     */
    async getPricingHistory(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = `${ADMIN_CONSTANTS.ENDPOINTS.PRICING_HISTORY}${queryString ? `?${queryString}` : ''}`;

        return await this.request('GET', endpoint);
    }

    /**
     * Get activity data
     */
    async getActivity(timeRange = '24h') {
        const endpoint = `${ADMIN_CONSTANTS.ENDPOINTS.ACTIVITY}?range=${timeRange}`;

        return await this.getCached(
            endpoint,
            `activity-${timeRange}`,
            30000 // 30 second cache for activity data
        );
    }

    /**
     * Get system health data
     */
    async getSystemHealth() {
        return await this.getCached(
            ADMIN_CONSTANTS.ENDPOINTS.SYSTEM_HEALTH,
            'system-health',
            10000 // 10 second cache for health data
        );
    }

    /**
     * Get users data with pagination and filters
     */
    async getUsers(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = `${ADMIN_CONSTANTS.ENDPOINTS.USERS}${queryString ? `?${queryString}` : ''}`;

        return await this.request('GET', endpoint);
    }

    /**
     * Update user data
     */
    async updateUser(userId, userData) {
        return await this.request('PUT', `${ADMIN_CONSTANTS.ENDPOINTS.USERS}/${userId}`, userData);
    }

    /**
     * Delete user
     */
    async deleteUser(userId) {
        return await this.request('DELETE', `${ADMIN_CONSTANTS.ENDPOINTS.USERS}/${userId}`);
    }

    /**
     * Bulk update users
     */
    async bulkUpdateUsers(userIds, action, data = {}) {
        return await this.request('POST', `${ADMIN_CONSTANTS.ENDPOINTS.USERS}/bulk`, {
            userIds,
            action,
            data
        });
    }

    /**
     * Export payments data
     */
    async exportPayments(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = `${ADMIN_CONSTANTS.ENDPOINTS.EXPORT_PAYMENTS}${queryString ? `?${queryString}` : ''}`;

        // Return blob for download
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'GET',
            headers: {
                Accept: 'text/csv'
            }
        });

        if (!response.ok) {
            throw new Error(`Export failed: ${response.status} ${response.statusText}`);
        }

        return await response.blob();
    }

    /**
     * Export users data
     */
    async exportUsers(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = `${ADMIN_CONSTANTS.ENDPOINTS.EXPORT_USERS}${queryString ? `?${queryString}` : ''}`;

        // Return blob for download
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'GET',
            headers: {
                Accept: 'text/csv'
            }
        });

        if (!response.ok) {
            throw new Error(`Export failed: ${response.status} ${response.statusText}`);
        }

        return await response.blob();
    }

    /**
     * Get chart data for activity section
     */
    async getChartData(chartId, timeRange = '24h') {
        const endpoint = `/charts/${chartId}?range=${timeRange}`;

        return await this.getCached(
            endpoint,
            `chart-${chartId}-${timeRange}`,
            60000 // 1 minute cache for chart data
        );
    }

    /**
     * Refresh specific cache entry
     */
    refreshCache(key) {
        this.cache.delete(key);
    }

    /**
     * Clear all cached data
     */
    clearCache() {
        this.cache.clear();
        console.log('🧹 ADMIN-API: Cache cleared');
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        const entries = Array.from(this.cache.entries());
        const now = Date.now();

        return {
            totalEntries: entries.length,
            validEntries: entries.filter(([_, data]) => (now - data.timestamp) < ADMIN_CONSTANTS.DEFAULTS.CACHE_TIMEOUT
            ).length,
            cacheHitRatio: this.cacheHits / (this.cacheHits + this.cacheMisses) || 0
        };
    }

    /**
     * Process API response data
     */
    processResponse(data, processor) {
        if (typeof processor === 'function') {
            return processor(data);
        }

        return data;
    }

    /**
     * Handle API errors
     */
    handleError(error, context = '') {
        console.error(`🚨 ADMIN-API: Error in ${context}:`, error);

        // Could dispatch events for global error handling
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(ADMIN_CONSTANTS.EVENTS.SECTION_ERROR, {
                detail: { error, context }
            }));
        }

        throw error;
    }

    /**
     * Retry failed requests
     */
    async retryRequest(requestFn, maxRetries = ADMIN_CONSTANTS.DEFAULTS.MAX_RETRIES) {
        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await requestFn();
            } catch (error) {
                lastError = error;

                if (attempt < maxRetries) {
                    const delay = ADMIN_CONSTANTS.DEFAULTS.RETRY_DELAY * Math.pow(2, attempt - 1);

                    await new Promise(resolve => setTimeout(resolve, delay));
                    console.log(`🔄 ADMIN-API: Retrying request (attempt ${attempt + 1}/${maxRetries})...`);
                }
            }
        }

        throw lastError;
    }

    /**
     * Download file from blob
     */
    downloadBlob(blob, filename) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');

        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    /**
     * Cleanup and destroy
     */
    destroy() {
        this.clearCache();
        console.log('🗑️ ADMIN-API: API manager destroyed');
    }
}

// Export for global access
window.AdminAPIManager = AdminAPIManager;

// Also export as module for ES6 imports (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminAPIManager;
}
