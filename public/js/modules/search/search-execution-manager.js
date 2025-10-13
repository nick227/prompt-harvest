/* global SearchAPIUtils */

/**
 * SearchExecutionManager
 * Handles the core search execution flow (API calls, retry, timeout)
 *
 * @class SearchExecutionManager
 */
class SearchExecutionManager {
    /**
     * @param {Object} config - Configuration
     * @param {Object} idGenerator - SearchIDGenerator instance
     * @param {Object} cacheManager - SearchCacheManager instance
     * @param {Object} retryStrategy - SearchRetryStrategy instance
     * @param {Function} debugFn - Debug logging function
     */
    constructor(config, idGenerator, cacheManager, retryStrategy, debugFn = null) {
        this.config = config;
        this.idGenerator = idGenerator;
        this.cacheManager = cacheManager;
        this.retryStrategy = retryStrategy;
        this.isDebugEnabled = debugFn;

        // Active request tracking
        this.activeControllers = new Set();
    }

    /**
     * Search images via API with caching, cancellation, and retry logic
     * @param {Object} feedManager - Feed manager instance
     * @param {string} query - Search query
     * @param {number} page - Page number
     * @returns {Promise<{images: Array, hasMore: boolean, total: number, meta: object}>}
     */
    async searchImages(feedManager, query, page = 1) {
        if (!feedManager?.apiManager) {
            throw new Error('API manager not available');
        }

        const cacheKey = this.cacheManager.getCacheKey(query, page);

        // Check cache first (with TTL)
        const cachedResult = this.cacheManager.getFromCache(cacheKey);

        if (cachedResult) {
            return cachedResult;
        }

        // Create new AbortController for this specific request
        const abortController = new AbortController();

        this.activeControllers.add(abortController);

        try {
            const result = await this.searchImagesWithRetry(feedManager, query, page, abortController.signal);

            // Validate schema with page number for stable synthetic IDs
            this.idGenerator.validateImageSchema(result.images, page);

            // Cache with timestamp
            this.cacheManager.addToCache(cacheKey, result);

            return result;
        } finally {
            // Remove controller from active set
            this.activeControllers.delete(abortController);
        }
    }

    /**
     * Search images with exponential backoff retry for 5xx and network errors
     * @param {Object} feedManager - Feed manager instance
     * @param {string} query - Search query
     * @param {number} page - Page number
     * @param {AbortSignal} signal - Abort signal
     * @returns {Promise<object>}
     */
    async searchImagesWithRetry(feedManager, query, page, signal) {
        let lastError;

        for (let attempt = 0; attempt < this.config.apiRetryMaxAttempts; attempt++) {
            try {
                return await this.executeSearchRequest(feedManager, query, page, signal);
            } catch (error) {
                lastError = error;

                if (this.retryStrategy.shouldNotRetry(error, attempt)) {
                    throw error;
                }

                // Parse Retry-After if it's a 429
                if (error.status === 429 && error.retryAfter) {
                    error.retryAfterMs = this.retryStrategy.parseRetryAfter(error.retryAfter);
                }

                await this.retryStrategy.delayRetry(attempt, error);
            }
        }

        throw lastError;
    }

    /**
     * Execute single search request with timeout and abort
     * @param {Object} feedManager - Feed manager instance
     * @param {string} query - Search query
     * @param {number} page - Page number
     * @param {AbortSignal} signal - Abort signal from caller
     * @returns {Promise<object>}
     */
    async executeSearchRequest(feedManager, query, page, signal) {
        const url = SearchAPIUtils.buildSearchURL(query, page);
        const token = feedManager.apiManager.getAuthToken();

        if (this.isDebugEnabled?.()) {
            console.log('🔍 SEARCH API REQUEST:', {
                query,
                page,
                url
            });
        }

        // Create combined abort signal (caller abort OR timeout)
        const timeoutController = new AbortController();
        let timeoutId;
        let onCallerAbort;

        // If caller signal aborts, also abort timeout controller
        if (signal) {
            onCallerAbort = () => timeoutController.abort();
            signal.addEventListener('abort', onCallerAbort, { once: true });
        }

        try {
            // Race between fetch and timeout
            const response = await Promise.race([
                fetch(url, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    signal: timeoutController.signal
                }),
                new Promise((_, reject) => {
                    timeoutId = setTimeout(() => {
                        timeoutController.abort();
                        reject(new Error('Request timeout'));
                    }, this.config.fetchTimeoutMs);
                })
            ]);

            await SearchAPIUtils.validateResponseStatus(response);

            const data = await response.json();
            const parsed = SearchAPIUtils.parseSearchResponse(data);

            // Count public vs private images in response
            const publicCount = parsed.images.filter(img => img.isPublic).length;
            const privateCount = parsed.images.length - publicCount;

            if (this.isDebugEnabled?.()) {
                console.log('✅ SEARCH API RESPONSE:', {
                    query,
                    page,
                    totalImages: parsed.images.length,
                    publicImages: publicCount,
                    privateImages: privateCount,
                    hasMore: parsed.hasMore,
                    total: parsed.total,
                    sampleImages: parsed.images.slice(0, 3).map(img => ({
                        id: img.id,
                        isPublic: img.isPublic,
                        prompt: img.prompt?.substring(0, 50)
                    }))
                });
            }

            return parsed;
        } finally {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            // Clean up abort listener if using fallback approach
            if (signal && onCallerAbort && !('once' in EventTarget.prototype)) {
                try {
                    signal.removeEventListener('abort', onCallerAbort);
                } catch {
                    // Ignore cleanup errors
                }
            }
        }
    }

    /**
     * Cancel all active search requests
     */
    cancelAllSearches() {
        this.activeControllers.forEach(controller => {
            try {
                controller.abort();
            } catch (error) {
                // Ignore errors during abort
            }
        });
        this.activeControllers.clear();
    }

    /**
     * Cleanup
     */
    cleanup() {
        this.cancelAllSearches();
    }
}

// Export for use in SearchManager
window.SearchExecutionManager = SearchExecutionManager;

