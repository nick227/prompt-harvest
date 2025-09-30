/**
 * RequestLogger Utility
 *
 * Provides standardized request and response logging for controllers.
 * Handles request tracking, timing, and structured logging.
 *
 * Features:
 * - Request ID generation
 * - Request start logging
 * - Response logging (success/error)
 * - Performance timing
 * - Structured log formatting
 */

// ============================================================================
// REQUEST ID GENERATION
// ============================================================================

/**
 * Generate a unique request ID
 * @returns {string} Unique request ID
 */
export const generateRequestId = () => `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// ============================================================================
// REQUEST LOGGING
// ============================================================================

/**
 * Log the start of a request
 * @param {string} requestId - Request ID
 * @param {Object} req - Express request object
 * @param {string} operation - Operation being performed
 * @param {Object} additionalData - Additional data to log
 */
export const logRequestStart = (requestId, req, operation, additionalData = {}) => {
    const logData = {
        requestId,
        operation,
        method: req.method,
        url: req.originalUrl,
        userId: req.user?.id || req.user?._id || 'anonymous',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        ...additionalData
    };

};

/**
 * Log a successful response
 * @param {string} requestId - Request ID
 * @param {string} operation - Operation performed
 * @param {number} duration - Request duration in milliseconds
 * @param {Object} resultData - Result data to log
 */
export const logRequestSuccess = (requestId, operation, duration, resultData = {}) => {
    const logData = {
        requestId,
        operation,
        duration: `${duration}ms`,
        ...resultData
    };

};

/**
 * Log a failed response
 * @param {string} requestId - Request ID
 * @param {string} operation - Operation that failed
 * @param {number} duration - Request duration in milliseconds
 * @param {Error} error - Error that occurred
 * @param {Object} additionalData - Additional data to log
 */
// eslint-disable-next-line max-params
export const logRequestError = (requestId, operation, duration, error, additionalData = {}) => {
    const logData = {
        requestId,
        operation,
        duration: `${duration}ms`,
        error: error.message,
        errorType: error.name || 'Unknown',
        stack: error.stack,
        ...additionalData
    };

    console.error(`❌ ${operation} failed [${requestId}]:`, logData);
};

// ============================================================================
// PERFORMANCE TRACKING
// ============================================================================

/**
 * Create a performance tracker for a request
 * @param {string} requestId - Request ID
 * @param {string} operation - Operation being tracked
 * @returns {Object} Performance tracker object
 */
export const createPerformanceTracker = (requestId, operation) => {
    const startTime = Date.now();

    return {
        requestId,
        operation,
        startTime,

        /**
         * Get elapsed time since start
         * @returns {number} Elapsed time in milliseconds
         */
        getElapsedTime: () => Date.now() - startTime,

        /**
         * Log completion with timing
         * @param {boolean} success - Whether operation was successful
         * @param {Object} data - Additional data to log
         */
        logCompletion: (success, data = {}) => {
            const duration = this.getElapsedTime();

            if (success) {
                logRequestSuccess(requestId, operation, duration, data);
            } else {
                logRequestError(requestId, operation, duration, data.error || new Error('Unknown error'), data);
            }
        }
    };
};

// ============================================================================
// CONTROLLER HELPER METHODS
// ============================================================================

/**
 * Extract request metadata for logging
 * @param {Object} req - Express request object
 * @returns {Object} Request metadata
 */
export const extractRequestMetadata = req => ({
    method: req.method,
    url: req.originalUrl,
    userId: req.user?.id || req.user?._id || 'anonymous',
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length')
});

/**
 * Extract response metadata for logging
 * @param {Object} res - Express response object
 * @param {Object} responseData - Response data
 * @returns {Object} Response metadata
 */
export const extractResponseMetadata = (res, responseData) => ({
    statusCode: res.statusCode,
    contentType: res.get('Content-Type'),
    responseSize: JSON.stringify(responseData).length,
    success: responseData.success || false
});

// ============================================================================
// MIDDLEWARE INTEGRATION
// ============================================================================

/**
 * Middleware to add request ID to request object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export const requestIdMiddleware = (req, res, next) => {
    req.id = req.id || generateRequestId();
    next();
};

/**
 * Middleware to log request start
 * @param {string} operation - Operation name
 * @returns {Function} Express middleware function
 */
export const requestStartLogger = operation => (req, res, next) => {
    logRequestStart(req.id, req, operation);
    next();
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
    generateRequestId,
    logRequestStart,
    logRequestSuccess,
    logRequestError,
    createPerformanceTracker,
    extractRequestMetadata,
    extractResponseMetadata,
    requestIdMiddleware,
    requestStartLogger
};
