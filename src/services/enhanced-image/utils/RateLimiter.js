/**
 * Rate limiting utilities
 * In-memory rate limiting with automatic cleanup
 */

export class RateLimiter {
    constructor(config = {}) {
        this.windowMs = config.windowMs || 60000; // 1 minute
        this.maxRequests = config.maxRequests || 10;
        this.cleanupThreshold = config.cleanupThreshold || 100;
        this.rateLimitMap = new Map();
        this.cleanupCounter = 0;
    }

    /**
     * Check if a user/key is rate limited
     * @param {string} userId - User ID or identifier (null for anonymous)
     * @returns {boolean} True if rate limited, false otherwise
     */
    isRateLimited(userId) {
        const key = userId || 'anonymous';
        const now = Date.now();

        const userRequests = this.rateLimitMap.get(key) || [];

        // Remove old requests outside the window
        const recentRequests = userRequests.filter(time => now - time < this.windowMs);

        if (recentRequests.length >= this.maxRequests) {
            return true;
        }

        // Add current request
        recentRequests.push(now);

        // Clean up: Remove stale entries to prevent memory leak
        if (recentRequests.length === 0) {
            this.rateLimitMap.delete(key);
        } else {
            this.rateLimitMap.set(key, recentRequests);
        }

        // Periodically clean up the entire map
        this.cleanupCounter++;

        if (this.cleanupCounter >= this.cleanupThreshold) {
            this.cleanup(now);
            this.cleanupCounter = 0;
        }

        return false;
    }

    /**
     * Clean up stale entries from the rate limit map
     * @param {number} now - Current timestamp
     * @private
     */
    cleanup(now) {
        for (const [key, requests] of this.rateLimitMap.entries()) {
            const recentRequests = requests.filter(time => now - time < this.windowMs);

            if (recentRequests.length === 0) {
                this.rateLimitMap.delete(key);
            } else if (recentRequests.length !== requests.length) {
                this.rateLimitMap.set(key, recentRequests);
            }
        }
    }

    /**
     * Reset rate limit for a specific user (useful for testing)
     * @param {string} userId - User ID to reset
     */
    reset(userId) {
        const key = userId || 'anonymous';

        this.rateLimitMap.delete(key);
    }

    /**
     * Clear all rate limit data
     */
    resetAll() {
        this.rateLimitMap.clear();
        this.cleanupCounter = 0;
    }

    /**
     * Get current request count for a user
     * @param {string} userId - User ID
     * @returns {number} Number of recent requests
     */
    getRequestCount(userId) {
        const key = userId || 'anonymous';
        const now = Date.now();
        const userRequests = this.rateLimitMap.get(key) || [];

        return userRequests.filter(time => now - time < this.windowMs).length;
    }
}

