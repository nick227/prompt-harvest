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
 * Get comprehensive queue data (status, stats, and health) in one call
 * @returns {Object} Complete queue information
 */
const getQueueData = () => {
    const now = new Date();
    const queueLength = queue.length;

    // Process queue once for all data
    const requests = queue.map(req => {
        const age = now - new Date(req.timestamp);

        return {
            id: req.id,
            age,
            prompt: `${req.prompt?.substring(0, 50)}...`,
            providers: req.providers,
            timestamp: req.timestamp
        };
    });

    // Calculate stats
    const oldestRequest = requests.length > 0 ? Math.max(...requests.map(r => r.age)) : 0;
    const averageAge = requests.length > 0 ? requests.reduce((sum, r) => sum + r.age, 0) / requests.length : 0;

    // Calculate health
    const health = { status: 'healthy', issues: [] };

    // Check for very old requests (older than 15 minutes) - critical
    if (oldestRequest > 900000) { // 15 minutes
        health.status = 'error';
        health.issues.push('Very old requests in queue');
    } else if (oldestRequest > 300000) { // 5 minutes
        health.status = 'warning';
        health.issues.push('Old requests in queue');
    }

    // Check for very large queue (more than 50 requests) - critical
    if (queueLength > 50) {
        health.status = 'error';
        health.issues.push('Very large queue size');
    } else if (queueLength > 10) {
        health.status = health.status === 'error' ? 'error' : 'warning';
        health.issues.push('Large queue size');
    }

    // Check for processing stuck (processing but no requests)
    if (isProcessing && queueLength === 0) {
        health.status = 'error';
        health.issues.push('Processing stuck');
    }

    // Check for high average age (more than 2 minutes)
    if (averageAge > 120000) { // 2 minutes
        health.status = health.status === 'error' ? 'error' : 'warning';
        health.issues.push('High average wait time');
    }

    return {
        status: {
            length: queueLength,
            isProcessing,
            pendingRequests: requests.map(req => ({
                id: req.id,
                prompt: req.prompt,
                providers: req.providers,
                timestamp: req.timestamp
            }))
        },
        stats: {
            totalRequests: queueLength,
            isProcessing,
            oldestRequest,
            averageAge,
            requests: requests.map(req => ({
                id: req.id,
                age: req.age,
                prompt: `${req.prompt.substring(0, 30)}...`,
                providers: req.providers
            }))
        },
        health: {
            ...health,
            stats: {
                totalRequests: queueLength,
                isProcessing,
                oldestRequest,
                averageAge
            }
        }
    };
};

/**
 * Get current queue status (legacy compatibility)
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
// QUEUE POSITION TRACKING
// ============================================================================

/**
 * Calculate estimated wait time based on queue position
 * @param {number} position - Position in queue (1-based)
 * @returns {number} Estimated wait time in seconds
 */
const calculateEstimatedWaitTime = position => {
    // Average processing time per request (in seconds)
    const avgProcessingTime = 15; // 15 seconds per image generation

    // If currently processing, subtract 1 from position
    const effectivePosition = isProcessing ? position - 1 : position;

    return Math.max(0, effectivePosition * avgProcessingTime);
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
    const position = queue.length;
    const estimatedWaitTime = calculateEstimatedWaitTime(position);

    console.log(`📥 Request queued [${requestId}]:`, {
        prompt: `${requestData.prompt?.substring(0, 50)}...`,
        providers: requestData.providers,
        queueLength: queue.length,
        position,
        estimatedWaitTime: `${estimatedWaitTime}s`,
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

            await processRequestWithRetry(request, maxRetries, processRequest);
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
 * Get queue statistics (legacy compatibility)
 * @returns {Object} Queue statistics
 */
const getQueueStats = () => {
    const data = getQueueData();

    return data.stats;
};

/**
 * Monitor queue health (legacy compatibility)
 * @returns {Object} Queue health status
 */
const getQueueHealth = () => {
    const data = getQueueData();

    return data.health;
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
    getQueueData,
    getQueueStatus,
    getQueueStats,
    getQueueHealth,
    clearQueue,

    // Queue utilities
    calculateEstimatedWaitTime,

    // State access
    queue,
    isProcessing
};

/**
 * Process a single request with retry logic
 * @param {Object} request - Request object
 * @param {number} maxRetries - Maximum number of retries
 * @param {Function} processRequest - Function to process the request
 */
async function processRequestWithRetry(request, maxRetries, processRequest) {
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
                await waitForRetry(attempt);
            }
        }
    }

    if (!success) {
        console.error(`❌ Request failed after ${maxRetries + 1} attempts [${id}]:`, lastError);
        reject(lastError);
    }
}

/**
 * Wait for retry with exponential backoff
 */
async function waitForRetry(attempt) {
    const delay = Math.pow(2, attempt) * 1000; // Exponential backoff

    console.log(`⏳ Retrying in ${delay}ms...`);
    await new Promise(resolve => setTimeout(resolve, delay));
}

export default {
    addToQueue,
    removeFromQueue,
    processQueue,
    processQueueWithRetry,
    getQueueData,
    getQueueStatus,
    getQueueStats,
    getQueueHealth,
    clearQueue,
    calculateEstimatedWaitTime,
    queue,
    isProcessing
};
