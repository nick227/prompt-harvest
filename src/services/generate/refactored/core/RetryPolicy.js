/**
 * Retry Policy
 *
 * Centralized retry logic with exponential backoff
 */

/**
 * Check if error is retryable
 * @param {Object} error - Error object
 * @returns {boolean} True if error should be retried
 */
export const isRetryableError = error => {
    // Network errors
    const retryableCodes = ['ECONNABORTED', 'ENOTFOUND', 'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT'];

    if (retryableCodes.includes(error.code)) {
        return true;
    }

    // HTTP errors (including 408 Request Timeout)
    const retryableStatuses = [408, 429, 499, 500, 502, 503, 504];

    if (error.response?.status && retryableStatuses.includes(error.response.status)) {
        return true;
    }

    return false;
};

/**
 * Execute function with retry logic
 * @param {Function} fn - Function to execute (receives attempt number)
 * @param {Object} options - Retry options
 * @param {number} options.maxAttempts - Maximum retry attempts (default: 3)
 * @param {number} options.baseDelay - Base delay in ms (default: 500)
 * @param {number} options.factor - Backoff factor (default: 2)
 * @param {number} options.jitter - Jitter percentage (default: 0.2)
 * @returns {Promise<*>} Function result
 */
export const withRetry = async(fn, options = {}) => {
    const {
        maxAttempts = 3,
        baseDelay = 500,
        factor = 2,
        jitter = 0.2
    } = options;

    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn(attempt);
        } catch (error) {
            lastError = error;

            // Don't retry on non-retryable errors
            if (!isRetryableError(error)) {
                throw error;
            }

            // Don't wait after last attempt
            if (attempt < maxAttempts) {
                const baseWait = baseDelay * Math.pow(factor, attempt - 1);
                const jitterAmount = baseWait * jitter * (Math.random() * 2 - 1);
                const waitTime = Math.max(0, baseWait + jitterAmount);

                console.log(`⏳ Retry attempt ${attempt}/${maxAttempts} after ${Math.round(waitTime)}ms`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }

    throw lastError;
};

export default {
    isRetryableError,
    withRetry
};

