export const createErrorResponse = (error, additionalData = {}) => {
    const baseResponse = {
        error: error.name || 'Error',
        message: error.message || 'An error occurred',
        timestamp: new Date().toISOString()
    };

    // Add additional data if provided
    if (error.field) {
        baseResponse.field = error.field;
    }
    if (error.resource) {
        baseResponse.resource = error.resource;
    }
    if (error.operation) {
        baseResponse.operation = error.operation;
    }
    if (error.service) {
        baseResponse.service = error.service;
    }
    if (error.provider) {
        baseResponse.provider = error.provider;
    }
    if (error.retryAfter) {
        baseResponse.retryAfter = error.retryAfter;
    }

    // Add custom additional data
    Object.assign(baseResponse, additionalData);

    return baseResponse;
};

export const createValidationError = (field, message) => ({
    error: 'Validation Error',
    message,
    field,
    timestamp: new Date().toISOString()
});

export const createNotFoundError = resource => ({
    error: 'Not Found',
    message: `${resource} not found`,
    resource,
    timestamp: new Date().toISOString()
});

export const createAuthenticationError = (message = 'Authentication required') => ({
    error: 'Authentication Error',
    message,
    timestamp: new Date().toISOString()
});

export const createAuthorizationError = (message = 'Access denied') => ({
    error: 'Authorization Error',
    message,
    timestamp: new Date().toISOString()
});

export const createRateLimitError = (retryAfter = null) => {
    const response = {
        error: 'Rate Limit Exceeded',
        message: 'Rate limit exceeded. Please try again later.',
        timestamp: new Date().toISOString()
    };

    if (retryAfter) {
        response.retryAfter = retryAfter;
    }

    return response;
};
