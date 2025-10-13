/**
 * SearchRetryStrategy
 * Handles retry logic with exponential backoff, jitter, and Retry-After support
 * Pure logic with no external dependencies
 *
 * @class SearchRetryStrategy
 */
class SearchRetryStrategy {
    /**
     * @param {Object} config - Retry configuration
     * @param {number} config.maxAttempts - Maximum retry attempts
     * @param {number} config.baseDelayMs - Base retry delay in ms
     * @param {number} config.maxBackoffMs - Maximum backoff delay in ms
     * @param {Function} debugFn - Debug logging function
     */
    constructor(config, debugFn = null) {
        this.config = config;
        this.isDebugEnabled = debugFn;
    }

    /**
     * Parse Retry-After header (seconds or HTTP date)
     * @param {string|null} retryAfter - Retry-After header value
     * @returns {number} Delay in milliseconds
     */
    parseRetryAfter(retryAfter) {
        if (!retryAfter) {
            return this.config.baseDelayMs;
        }

        // Try parsing as seconds
        const seconds = parseInt(retryAfter, 10);

        if (!isNaN(seconds)) {
            return seconds * 1000;
        }

        // Try parsing as HTTP date
        const date = new Date(retryAfter);

        if (!isNaN(date.getTime())) {
            return Math.max(0, date.getTime() - Date.now());
        }

        return this.config.baseDelayMs;
    }

    /**
     * Check if error should not be retried
     * @param {Error} error - Error object
     * @param {number} attempt - Current attempt number
     * @returns {boolean}
     */
    shouldNotRetry(error, attempt) {
        if (error.name === 'AbortError') {
            return true;
        }

        // Allow 429 to be retried
        if (error.status === 429) {
            return attempt >= this.config.maxAttempts - 1;
        }

        // Don't retry other 4xx errors
        if (error.message.includes('Search failed: 4')) {
            return true;
        }

        if (attempt >= this.config.maxAttempts - 1) {
            return true;
        }

        return false;
    }

    /**
     * Calculate retry delay with exponential backoff, jitter, and cap
     * @param {number} attempt - Current attempt number (0-indexed)
     * @param {Error|null} error - Error object (may contain retryAfterMs)
     * @returns {number} Delay in milliseconds
     */
    calculateDelay(attempt, error = null) {
        let baseDelay;

        // Use Retry-After if available (429 errors)
        if (error?.retryAfterMs) {
            baseDelay = error.retryAfterMs;
        } else {
            baseDelay = this.config.baseDelayMs * Math.pow(2, attempt);
        }

        // Cap maximum backoff
        baseDelay = Math.min(baseDelay, this.config.maxBackoffMs);

        // Add jitter (±25%)
        const jitter = baseDelay * 0.25 * (Math.random() - 0.5);
        const delay = Math.max(0, baseDelay + jitter);

        return delay;
    }

    /**
     * Delay execution with logging
     * @param {number} attempt - Current attempt number
     * @param {Error|null} error - Error object (may contain retryAfterMs)
     */
    async delayRetry(attempt, error = null) {
        const delay = this.calculateDelay(attempt, error);

        if (this.isDebugEnabled?.()) {
            const source = error?.retryAfterMs ? 'Retry-After' : 'exponential backoff';

            console.log(`⚠️ SEARCH: Retry attempt ${attempt + 1} after ${Math.round(delay)}ms (${source} + jitter)`);
        }

        await new Promise(resolve => setTimeout(resolve, delay));
    }
}

// Export for use in SearchManager
window.SearchRetryStrategy = SearchRetryStrategy;

