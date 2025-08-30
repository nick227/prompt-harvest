// Authentication middleware
export { authenticateToken, requireAuth, optionalAuth } from './authMiddleware.js';
export { requireAdmin, extractUserId } from './auth.js';

// Validation middleware
export {
    validateImageGeneration,
    validateRating,
    validatePagination,
    validateTag,
    validateWord,
    sanitizeInput
} from './validation.js';

// Enhanced validation middleware
export {
    validateImageGenerationEnhanced,
    enhancedRateLimit
} from './enhancedValidation.js';

// Error handling middleware
export { errorHandler, notFoundHandler, asyncHandler, createError } from './errorHandler.js';

// Rate limiting middleware
export {
    rateLimit,
    imageGenerationRateLimit,
    apiRateLimit,
    authRateLimit,
    clearRateLimit
} from './rateLimit.js';

// Logging middleware
export { requestLogger, errorLogger, performanceLogger } from './logging.js';
