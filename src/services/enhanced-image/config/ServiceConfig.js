/**
 * EnhancedImageService Configuration
 * Centralized configuration constants for the service
 */

/**
 * Circuit Breaker Configuration
 * Defines thresholds and timeouts for various operations
 */
export const CIRCUIT_BREAKERS = {
    AI_SERVICE_THRESHOLD: 2,
    AI_SERVICE_TIMEOUT_MS: 30000, // 30 seconds
    IMAGE_GENERATION_THRESHOLD: 3,
    IMAGE_GENERATION_TIMEOUT_MS: 120000, // 2 minutes
    DATABASE_THRESHOLD: 2,
    DATABASE_TIMEOUT_MS: 10000, // 10 seconds
    FILE_SYSTEM_THRESHOLD: 1,
    FILE_SYSTEM_TIMEOUT_MS: 15000 // 15 seconds
};

/**
 * Rate Limiting Configuration
 * In-memory rate limiting settings
 */
export const RATE_LIMITING = {
    WINDOW_MS: 60000, // 1 minute
    MAX_REQUESTS: 10,
    CLEANUP_THRESHOLD: 100 // Cleanup every N requests
};

/**
 * Pagination Configuration
 * Default page sizes for different contexts
 */
export const PAGINATION = {
    DEFAULT_LIMIT: 8,
    PROFILE_LIMIT: 20,
    USER_IMAGES_LIMIT: 50,
    DEFAULT_PAGE: 1 // 1-based pagination
};

/**
 * Combined configuration object
 */
export const SERVICE_CONFIG = {
    CIRCUIT_BREAKERS,
    RATE_LIMITING,
    PAGINATION
};

