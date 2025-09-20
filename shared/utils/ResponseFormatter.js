/**
 * Standardized API Response Formatter
 * Ensures consistent response structure across all endpoints
 */

export class ResponseFormatter {
    /**
   * Format successful response
   */
    static success(data, message = 'Operation successful', metadata = {}) {
        return {
            success: true,
            message,
            data,
            metadata: {
                timestamp: new Date().toISOString(),
                ...metadata
            }
        };
    }

    /**
   * Format error response
   */
    static error(message, code = 'GENERAL_ERROR', details = null, statusCode = 400) {
        return {
            success: false,
            error: {
                message,
                code,
                details,
                statusCode
            },
            metadata: {
                timestamp: new Date().toISOString()
            }
        };
    }

    /**
   * Format validation error response
   */
    static validationError(errors, warnings = []) {
        return {
            success: false,
            error: {
                message: 'Validation failed',
                code: 'VALIDATION_ERROR',
                details: {
                    errors,
                    warnings
                },
                statusCode: 400
            },
            metadata: {
                timestamp: new Date().toISOString()
            }
        };
    }

    /**
   * Format paginated response
   */
    static paginated(data, pagination) {
        return {
            success: true,
            message: 'Data retrieved successfully',
            data,
            pagination: {
                page: pagination.page || 1,
                limit: pagination.limit || 10,
                total: pagination.total || 0,
                totalPages: Math.ceil((pagination.total || 0) / (pagination.limit || 10)),
                hasNext: (pagination.page || 1) * (pagination.limit || 10) < (pagination.total || 0),
                hasPrev: (pagination.page || 1) > 1
            },
            metadata: {
                timestamp: new Date().toISOString()
            }
        };
    }

    /**
   * Format partial success response (some operations succeeded, some failed)
   */
    static partial(successes, failures, message = 'Partial success') {
        return {
            success: successes.length > 0,
            message,
            data: {
                successes,
                failures,
                summary: {
                    totalRequested: successes.length + failures.length,
                    successful: successes.length,
                    failed: failures.length
                }
            },
            metadata: {
                timestamp: new Date().toISOString()
            }
        };
    }
}

/**
 * Error code constants for consistent error handling
 */
export const ERROR_CODES = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
    AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
    GENERAL_ERROR: 'GENERAL_ERROR'
};

/**
 * HTTP Status codes for consistent status handling
 */
export const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    RATE_LIMITED: 429,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
};
