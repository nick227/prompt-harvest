// Billing API Manager - Handles all API communication for billing system
/* global BILLING_CONSTANTS, apiService */

class BillingAPIManager {
    constructor() {
        this.config = BILLING_CONSTANTS;
    }

    /**
     * Get current user balance
     * @returns {Promise<{balance: number}>}
     */
    async getBalance() {
        try {
            const response = await this.retryOperation(() => apiService.get(this.config.ENDPOINTS.BALANCE)
            );

            return { balance: response.balance || 0 };
        } catch (error) {
            console.error('❌ BILLING API: Failed to get balance:', error);
            throw new Error(this.config.ERROR_MESSAGES.BALANCE_LOAD_FAILED);
        }
    }

    /**
     * Get credit packages
     * @returns {Promise<{packages: Array}>}
     */
    async getCreditPackages() {
        try {
            const response = await this.retryOperation(() => apiService.get(this.config.ENDPOINTS.PACKAGES)
            );

            return { packages: response.packages || [] };
        } catch (error) {
            console.error('❌ BILLING API: Failed to get credit packages:', error);
            throw new Error(this.config.ERROR_MESSAGES.PACKAGES_LOAD_FAILED);
        }
    }

    /**
     * Get user usage statistics
     * @returns {Promise<Object>}
     */
    async getUserStats() {
        try {
            const response = await this.retryOperation(() => apiService.get(this.config.ENDPOINTS.USER_STATS)
            );

            return response;
        } catch (error) {
            console.error('❌ BILLING API: Failed to get user stats:', error);
            throw new Error(this.config.ERROR_MESSAGES.USAGE_LOAD_FAILED);
        }
    }

    /**
     * Purchase credits
     * @param {string} packageId - Package ID to purchase
     * @returns {Promise<{success: boolean, checkoutUrl: string}>}
     */
    async purchaseCredits(packageId) {
        try {
            const response = await this.retryOperation(() => apiService.post(this.config.ENDPOINTS.PURCHASE, {
                packageId,
                successUrl: `${window.location.origin}/billing.html?success=true&package=${packageId}`,
                cancelUrl: `${window.location.origin}/billing.html?cancelled=true`
            })
            );

            if (!response.success || !response.checkoutUrl) {
                throw new Error(response.message || 'Failed to create checkout session');
            }

            return response;
        } catch (error) {
            console.error('❌ BILLING API: Failed to purchase credits:', error);
            throw new Error(this.config.ERROR_MESSAGES.PAYMENT_PROCESSING_FAILED);
        }
    }

    /**
     * Redeem promo code
     * @param {string} promoCode - Promo code to redeem
     * @returns {Promise<{success: boolean, credits: number}>}
     */
    async redeemPromoCode(promoCode) {
        try {
            const response = await this.retryOperation(() => apiService.post(this.config.ENDPOINTS.REDEEM, {
                promoCode: promoCode.toUpperCase()
            })
            );

            if (!response.success) {
                throw new Error(response.message || 'Promo code redemption failed');
            }

            return {
                success: true,
                credits: response.credits || 0
            };
        } catch (error) {
            console.error('❌ BILLING API: Failed to redeem promo code:', error);

            // Handle specific error cases
            const errorMessage = this.getPromoErrorMessage(error.message);

            throw new Error(errorMessage);
        }
    }

    /**
     * Retry operation with exponential backoff
     * @param {Function} operation - Operation to retry
     * @param {number} attempts - Number of retry attempts
     * @returns {Promise<any>}
     */
    async retryOperation(operation, attempts = this.config.RETRY.ATTEMPTS) {
        for (let i = 0; i < attempts; i++) {
            try {
                return await operation();
            } catch (error) {
                if (i === attempts - 1) {
                    throw error;
                }

                console.warn(`⚠️ BILLING API: Operation failed, retrying (${i + 1}/${attempts})...`);

                const delay = this.config.RETRY.EXPONENTIAL_BACKOFF
                    ? this.config.RETRY.DELAY * Math.pow(2, i)
                    : this.config.RETRY.DELAY;

                await this.delay(delay);
            }
        }
    }

    /**
     * Delay utility
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise<void>}
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get specific promo code error message
     * @param {string} errorMessage - Error message from API
     * @returns {string} User-friendly error message
     */
    getPromoErrorMessage(errorMessage) {
        const errorLower = errorMessage.toLowerCase();

        if (errorLower.includes('not found')) {
            return this.config.PROMO_ERROR_MESSAGES.NOT_FOUND;
        } else if (errorLower.includes('expired')) {
            return this.config.PROMO_ERROR_MESSAGES.EXPIRED;
        } else if (errorLower.includes('already redeemed')) {
            return this.config.PROMO_ERROR_MESSAGES.ALREADY_REDEEMED;
        } else if (errorLower.includes('max redemptions')) {
            return this.config.PROMO_ERROR_MESSAGES.MAX_REDEMPTIONS;
        } else if (errorLower.includes('not active')) {
            return this.config.PROMO_ERROR_MESSAGES.NOT_ACTIVE;
        } else if (errorLower.includes('authentication')) {
            return this.config.PROMO_ERROR_MESSAGES.AUTHENTICATION_REQUIRED;
        }

        return this.config.ERROR_MESSAGES.PROMO_REDEMPTION_FAILED;
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.BillingAPIManager = BillingAPIManager;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BillingAPIManager;
}
