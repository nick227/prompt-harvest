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
        this.listeners = new Set();
        this.balance = 0;
        this.packages = null;
        this.isLoading = false;
        this.init();
    }

    /**
     * Initialize the service
     */
    init() {
        this.setupEventListeners();
        // Removed periodic refresh - components will request balance when needed
    }

    /**
     * Setup event listeners for credit updates
     */
    setupEventListeners() {
        // Listen for authentication state changes
        if (window.UnifiedAuthUtils) {
            window.UnifiedAuthUtils.addAuthListener(isAuthenticated => {
                if (isAuthenticated) {
                    this.getBalance();
                } else {
                    this.clearCache(); // Clear all cache when not authenticated
                }
            });
        }

        // Listen for promo code redemption
        window.addEventListener('credits:promo-redeemed', _event => {
            this.getBalance();
        });

        // Listen for payment completion
        window.addEventListener('credits:payment-completed', _event => {
            this.getBalance();
        });
    }

    // Removed periodic refresh method - components will request balance when needed

    /**
     * Subscribe to credit updates
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    subscribe(callback) {
        this.listeners.add(callback);

        return () => this.listeners.delete(callback);
    }

    /**
     * Notify all listeners of credit updates
     * @param {Object} data - Credit data
     */
    notify(data) {
        this.listeners.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error('❌ Error in credit listener:', error);
            }
        });
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
     * Get authentication token from centralized system
     */
    getAuthToken() {
        return window.AdminAuthUtils?.getAuthToken() ||
               window.UnifiedAuthUtils?.getAuthToken() ||
               localStorage.getItem('authToken') ||
               sessionStorage.getItem('authToken');
    }

    /**
     * Make authenticated API request
     */
    async makeRequest(endpoint, options = {}) {
        // Check authentication before making request
        if (!this.isAuthenticated()) {
            console.warn('🔐 UNIFIED-CREDIT: No valid token for request to', endpoint, ', skipping');
            throw new Error('Authentication required');
        }

        const url = `${this.baseUrl}${endpoint}`;
        const headers = this.getAuthHeaders();

        // Debug authentication for balance requests
        if (endpoint === '/balance') {
            const token = this.getAuthToken();

        }

        const config = {
            headers,
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
    async getBalance(forceRefresh = false) {
        if (this.isLoading) {
            return this.balance;
        }

        const cacheKey = 'balance';
        const cached = this.getCached(cacheKey);

        if (!forceRefresh && cached) {
            return cached;
        }

        try {
            this.isLoading = true;
            const data = await this.makeRequest('/balance');

            this.balance = data.balance;
            this.setCache(cacheKey, data.balance);
            this.notify({ balance: this.balance, type: 'balance' });

            return data.balance;
        } catch (error) {
            this.handleError(error, 'Failed to get balance', false);

            return this.balance;
        } finally {
            this.isLoading = false;
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
            this.handleError(error, 'Promo code redemption failed', false);

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
            this.handleError(error, 'Failed to get packages', true);
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
            this.handleError(error, 'Package purchase failed', true);
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
            this.handleError(error, 'Failed to get credit history', true);
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
            this.handleError(error, 'Failed to get user stats', true);
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
     * Clear cache - specific key or all cache
     * @param {string} key - Optional specific cache key to clear
     */
    clearCache(key = null) {
        if (key) {
            this.cache.delete(key);
        } else {
            this.cache.clear();
            this.balance = 0;
            this.packages = null;
            this.notify({ balance: 0, type: 'clear' });
        }
    }


    // ===== UTILITY METHODS =====

    /**
     * Handle service errors consistently
     * @param {Error} error - The error object
     * @param {string} operation - The operation that failed
     * @param {boolean} shouldThrow - Whether to re-throw the error
     * @returns {any} Fallback value or throws error
     */
    handleError(error, operation, shouldThrow = true) {
        console.error(`❌ UnifiedCreditService: ${operation} failed:`, error);

        if (shouldThrow) {
            throw error;
        }

        return null;
    }

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
        const token = this.getAuthToken();

        if (!token) {
            return false;
        }

        // Check if token is expired
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const now = Math.floor(Date.now() / 1000);

            if (payload.exp && payload.exp < now) {

                return false;
            }
        } catch (error) {

            return false;
        }

        return true;
    }

    /**
     * Validate promo code format
     */
    validatePromoCodeFormat(promoCode) {
        if (!promoCode || typeof promoCode !== 'string') {
            return false;
        }

        const trimmed = promoCode.trim();

        return trimmed.length >= 3 && trimmed.length <= 50 && (/^[A-Z0-9]+$/).test(trimmed);
    }

}

// Create singleton instance
const unifiedCreditService = new UnifiedCreditService();

// Export for use
window.UnifiedCreditService = unifiedCreditService;

// Export for global access
if (typeof window !== 'undefined') {
    window.unifiedCreditService = unifiedCreditService;
}
