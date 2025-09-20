/**
 * Unified Credit Service
 * Frontend service for handling all credit-related operations
 * Used by billing page, header widget, and other components
 */

class UnifiedCreditService {
    constructor() {
        this.baseUrl = '/api/credits';
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Get authentication headers
     */
    getAuthHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };

        const token = this.getAuthToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return headers;
    }

    /**
     * Get authentication token
     */
    getAuthToken() {
        return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    }

    /**
     * Make authenticated API request
     */
    async makeRequest(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            headers: this.getAuthHeaders(),
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || `HTTP ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error(`❌ UnifiedCreditService: Request failed for ${endpoint}:`, error);
            throw error;
        }
    }

    // ===== BALANCE OPERATIONS =====

    /**
     * Get user's current credit balance
     */
    async getBalance() {
        const cacheKey = 'balance';
        const cached = this.getCached(cacheKey);

        if (cached) {
            return cached;
        }

        try {
            const data = await this.makeRequest('/balance');
            this.setCache(cacheKey, data.balance);
            return data.balance;
        } catch (error) {
            console.error('❌ UnifiedCreditService: Failed to get balance:', error);
            throw error;
        }
    }

    /**
     * Check if user has sufficient credits
     */
    async hasCredits(amount = 1) {
        const balance = await this.getBalance();
        return balance >= amount;
    }

    // ===== PROMO CODE OPERATIONS =====

    /**
     * Redeem a promo code
     */
    async redeemPromoCode(promoCode) {
        if (!promoCode || typeof promoCode !== 'string' || !promoCode.trim()) {
            throw new Error('Valid promo code is required');
        }

        try {
            const data = await this.makeRequest('/redeem', {
                method: 'POST',
                body: JSON.stringify({
                    promoCode: promoCode.trim().toUpperCase()
                })
            });

            // Clear balance cache since it changed
            this.clearCache('balance');

            return {
                success: true,
                credits: data.credits,
                newBalance: data.newBalance,
                promoCode: data.promoCode,
                message: data.message
            };
        } catch (error) {
            console.error('❌ UnifiedCreditService: Promo code redemption failed:', error);

            // Return structured error for better handling
            return {
                success: false,
                error: this.getPromoErrorMessage(error.message),
                message: error.message
            };
        }
    }

    /**
     * Get specific promo code error message
     */
    getPromoErrorMessage(errorMessage) {
        if (!errorMessage) {
            return 'Failed to redeem promo code';
        }

        const message = errorMessage.toLowerCase();

        if (message.includes('not found') || message.includes('invalid')) {
            return 'Promo code not found. Please check the code and try again.';
        }
        if (message.includes('expired')) {
            return 'This promo code has expired.';
        }
        if (message.includes('already redeemed')) {
            return 'You have already redeemed this promo code.';
        }
        if (message.includes('maximum redemptions') || message.includes('exhausted')) {
            return 'This promo code has reached its redemption limit.';
        }
        if (message.includes('inactive') || message.includes('not active')) {
            return 'This promo code is not currently active.';
        }
        if (message.includes('authentication') || message.includes('login')) {
            return 'Please log in to redeem promo codes.';
        }

        return errorMessage;
    }

    // ===== PACKAGE OPERATIONS =====

    /**
     * Get available credit packages
     */
    async getPackages() {
        const cacheKey = 'packages';
        const cached = this.getCached(cacheKey);

        if (cached) {
            return cached;
        }

        try {
            const data = await this.makeRequest('/packages');
            this.setCache(cacheKey, data.packages);
            return data.packages;
        } catch (error) {
            console.error('❌ UnifiedCreditService: Failed to get packages:', error);
            throw error;
        }
    }

    /**
     * Purchase a credit package
     */
    async purchasePackage(packageId, successUrl = null, cancelUrl = null) {
        if (!packageId) {
            throw new Error('Package ID is required');
        }

        try {
            const data = await this.makeRequest('/purchase', {
                method: 'POST',
                body: JSON.stringify({
                    packageId,
                    successUrl: successUrl || `${window.location.origin}/purchase-success.html`,
                    cancelUrl: cancelUrl || window.location.href
                })
            });

            // Redirect to Stripe checkout
            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error('No checkout URL received');
            }
        } catch (error) {
            console.error('❌ UnifiedCreditService: Package purchase failed:', error);
            throw error;
        }
    }

    // ===== HISTORY OPERATIONS =====

    /**
     * Get user's credit history
     */
    async getCreditHistory(limit = 50) {
        const cacheKey = `history-${limit}`;
        const cached = this.getCached(cacheKey);

        if (cached) {
            return cached;
        }

        try {
            const data = await this.makeRequest(`/history?limit=${limit}`);
            this.setCache(cacheKey, data.history);
            return data.history;
        } catch (error) {
            console.error('❌ UnifiedCreditService: Failed to get credit history:', error);
            throw error;
        }
    }

    /**
     * Get user statistics
     */
    async getUserStats() {
        const cacheKey = 'userStats';
        const cached = this.getCached(cacheKey);

        if (cached) {
            return cached;
        }

        try {
            const data = await this.makeRequest('/stats');
            this.setCache(cacheKey, data);
            return data;
        } catch (error) {
            console.error('❌ UnifiedCreditService: Failed to get user stats:', error);
            throw error;
        }
    }

    // ===== CACHE OPERATIONS =====

    /**
     * Get cached data
     */
    getCached(key) {
        const cached = this.cache.get(key);

        if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
            return cached.data;
        }

        return null;
    }

    /**
     * Set cached data
     */
    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    /**
     * Clear specific cache entry
     */
    clearCache(key) {
        this.cache.delete(key);
    }

    /**
     * Clear all cache
     */
    clearAllCache() {
        this.cache.clear();
    }

    // ===== UTILITY METHODS =====

    /**
     * Format credits for display
     */
    formatCredits(credits) {
        return credits.toLocaleString();
    }

    /**
     * Format currency for display
     */
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount / 100);
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return !!this.getAuthToken();
    }

    /**
     * Validate promo code format
     */
    validatePromoCodeFormat(promoCode) {
        if (!promoCode || typeof promoCode !== 'string') {
            return false;
        }

        const trimmed = promoCode.trim();
        return trimmed.length >= 3 && trimmed.length <= 50 && /^[A-Z0-9]+$/.test(trimmed);
    }
}

// Create singleton instance
const unifiedCreditService = new UnifiedCreditService();

// Export for use
window.UnifiedCreditService = unifiedCreditService;

export default unifiedCreditService;
