/**
 * QueueManager Service
 *
 * Handles queue management for image generation requests including:
 * - Request queuing and processing
 * - Queue state management
 * - Request orchestration
 * - Error handling and cleanup
 *
 * This service ensures that image generation requests are processed
 * in order and prevents system overload by managing concurrent requests.
 */

// ============================================================================
// QUEUE STATE MANAGEMENT
// ============================================================================

/**
 * Queue for pending image generation requests
 * @type {Array}
 */
const queue = [];

/**
 * Flag indicating if queue is currently being processed
 * @type {boolean}
 */
let isProcessing = false;

/**
 * Get current queue status
 * @returns {Object} Queue status information
 */
const getQueueStatus = () => ({
    length: queue.length,
    isProcessing,
    pendingRequests: queue.map(req => ({
        id: req.id,
        prompt: `${req.prompt?.substring(0, 50)}...`,
        providers: req.providers,
        timestamp: req.timestamp
    }))
});

/**
 * Clear the queue (for testing/cleanup)
 * @returns {number} Number of cleared requests
 */
const clearQueue = () => {
    const clearedCount = queue.length;

    queue.length = 0;
    isProcessing = false;
    console.log(`🧹 Queue cleared: ${clearedCount} requests removed`);

    return clearedCount;
};

// ============================================================================
// QUEUE OPERATIONS
// ============================================================================

/**
 * Add request to queue
 * @param {Object} requestData - Request data
 * @param {string} requestData.prompt - Image generation prompt
 * @param {string} requestData.original - Original prompt
 * @param {string} requestData.promptId - Prompt ID
 * @param {Array} requestData.providers - Provider names
 * @param {number} requestData.guidance - Guidance value
 * @param {Function} requestData.resolve - Promise resolve function
 * @param {Function} requestData.reject - Promise reject function
 * @returns {Promise} Promise that resolves when request is processed
 */
const addToQueue = requestData => new Promise((resolve, reject) => {
    const wasEmpty = queue.length === 0;
    const requestId = Math.random().toString(36).substr(2, 9);

    const queueItem = {
        id: requestId,
        timestamp: new Date().toISOString(),
        ...requestData,
        resolve,
        reject
    };

    queue.push(queueItem);

    console.log(`📥 Request queued [${requestId}]:`, {
        prompt: `${requestData.prompt?.substring(0, 50)}...`,
        providers: requestData.providers,
        queueLength: queue.length,
        wasEmpty
    });

    // Start processing if queue was empty
    if (wasEmpty) {
        processQueue();
    }
});

/**
 * Remove request from queue
 * @param {string} requestId - Request ID to remove
 * @returns {boolean} True if request was found and removed
 */
const removeFromQueue = requestId => {
    const index = queue.findIndex(item => item.id === requestId);

    if (index !== -1) {
        const [_removed] = queue.splice(index, 1);

        console.log(`🗑️ Request removed from queue [${requestId}]`);

        return true;
    }

    return false;
};

// ============================================================================
// QUEUE PROCESSING
// ============================================================================

/**
 * Process the queue of pending requests
 * @param {Function} processRequest - Function to process individual requests
 * @returns {Promise<void>}
 */
// eslint-disable-next-line max-statements
const processQueue = async processRequest => {
    if (isProcessing) {
        console.log('⏳ Queue already processing, skipping');

        return;
    }

    if (queue.length === 0) {
        console.log('📭 Queue is empty, nothing to process');

        return;
    }

    isProcessing = true;
    console.log(`🚀 Starting queue processing: ${queue.length} requests pending`);

    try {
        while (queue.length > 0) {
            const request = queue.shift();
            const { id, prompt, original, promptId, providers, guidance, resolve, reject } = request;

            console.log(`⚡ Processing request [${id}]:`, {
                prompt: `${prompt?.substring(0, 50)}...`,
                providers,
                queueRemaining: queue.length
            });

            try {
                // Process the request using the provided function
                const response = await processRequest({
                    prompt,
                    original,
                    promptId,
                    providers,
                    guidance,
                    requestId: id
                });

                console.log(`✅ Request completed [${id}]`);
                resolve(response);
            } catch (error) {
                console.error(`❌ Request failed [${id}]:`, error);
                reject(error);
            }
        }
    } catch (error) {
        console.error('❌ Queue processing error:', error);
    } finally {
        isProcessing = false;
        console.log('🏁 Queue processing completed');
    }
};

/**
 * Process queue with automatic retry on failure
 * @param {Function} processRequest - Function to process individual requests
 * @param {number} maxRetries - Maximum number of retries per request
 * @returns {Promise<void>}
 */
// eslint-disable-next-line max-lines-per-function, max-statements
const processQueueWithRetry = async(processRequest, maxRetries = 3) => {
    if (isProcessing) {
        console.log('⏳ Queue already processing, skipping');

        return;
    }

    if (queue.length === 0) {
        console.log('📭 Queue is empty, nothing to process');

        return;
    }

    isProcessing = true;
    console.log(`🚀 Starting queue processing with retry: ${queue.length} requests pending`);

    try {
        while (queue.length > 0) {
            const request = queue.shift();
            const { id, prompt, original, promptId, providers, guidance, resolve, reject } = request;

            console.log(`⚡ Processing request [${id}] (attempt 1/${maxRetries + 1}):`, {
                prompt: `${prompt?.substring(0, 50)}...`,
                providers,
                queueRemaining: queue.length
            });

            let lastError = null;
            let success = false;

            // Try processing with retries
            for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
                try {
                    const response = await processRequest({
                        prompt,
                        original,
                        promptId,
                        providers,
                        guidance,
                        requestId: id,
                        attempt
                    });

                    console.log(`✅ Request completed [${id}] on attempt ${attempt}`);
                    resolve(response);
                    success = true;
                    break;
                } catch (error) {
                    lastError = error;
                    console.warn(`⚠️ Request attempt ${attempt} failed [${id}]:`, error.message);

                    if (attempt <= maxRetries) {
                        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff

                        console.log(`⏳ Retrying in ${delay}ms...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }
            }

            if (!success) {
                console.error(`❌ Request failed after ${maxRetries + 1} attempts [${id}]:`, lastError);
                reject(lastError);
            }
        }
    } catch (error) {
        console.error('❌ Queue processing error:', error);
    } finally {
        isProcessing = false;
        console.log('🏁 Queue processing with retry completed');
    }
};

// ============================================================================
// QUEUE MONITORING
// ============================================================================

/**
 * Get queue statistics
 * @returns {Object} Queue statistics
 */
const getQueueStats = () => {
    const now = new Date();
    const requests = queue.map(req => ({
        id: req.id,
        age: now - new Date(req.timestamp),
        prompt: `${req.prompt?.substring(0, 30)}...`,
        providers: req.providers
    }));

    return {
        totalRequests: queue.length,
        isProcessing,
        oldestRequest: requests.length > 0 ? Math.max(...requests.map(r => r.age)) : 0,
        averageAge: requests.length > 0 ? requests.reduce((sum, r) => sum + r.age, 0) / requests.length : 0,
        requests
    };
};

/**
 * Monitor queue health
 * @returns {Object} Queue health status
 */
const getQueueHealth = () => {
    const stats = getQueueStats();
    const health = {
        status: 'healthy',
        issues: []
    };

    // Check for stuck requests (older than 5 minutes)
    if (stats.oldestRequest > 300000) { // 5 minutes
        health.status = 'warning';
        health.issues.push('Old requests in queue');
    }

    // Check for large queue
    if (stats.totalRequests > 10) {
        health.status = 'warning';
        health.issues.push('Large queue size');
    }

    // Check for processing stuck
    if (isProcessing && stats.totalRequests === 0) {
        health.status = 'error';
        health.issues.push('Processing stuck');
    }

    return {
        ...health,
        stats
    };
};

// ============================================================================
// EXPORTS
// ============================================================================

export {
    // Queue operations
    addToQueue,
    removeFromQueue,
    processQueue,
    processQueueWithRetry,

    // Queue state
    getQueueStatus,
    getQueueStats,
    getQueueHealth,
    clearQueue,

    // State access
    queue,
    isProcessing
};

export default {
    addToQueue,
    removeFromQueue,
    processQueue,
    processQueueWithRetry,
    getQueueStatus,
    getQueueStats,
    getQueueHealth,
    clearQueue,
    queue,
    isProcessing
};
