import {
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ConflictError,
    RateLimitError,
    DatabaseError,
    ExternalServiceError,
    ImageGenerationError
} from '../errors/CustomErrors.js';

// eslint-disable-next-line max-lines-per-function, max-statements
export const errorHandler = (err, req, res, _next) => {
    // eslint-disable-next-line no-console
    console.error('❌ Error:', err);

    // Default error response
    const errorResponse = {
        error: 'Internal Server Error',
        message: 'Something went wrong on the server',
        timestamp: new Date().toISOString()
    };

    // Handle custom error classes
    if (err instanceof ValidationError) {
        errorResponse.error = 'Validation Error';
        errorResponse.message = err.message;
        if (err.field) {
            errorResponse.field = err.field;
        }

        return res.status(err.statusCode).json(errorResponse);
    }

    if (err instanceof AuthenticationError) {
        errorResponse.error = 'Authentication Error';
        errorResponse.message = err.message;

        return res.status(err.statusCode).json(errorResponse);
    }

    if (err instanceof AuthorizationError) {
        errorResponse.error = 'Authorization Error';
        errorResponse.message = err.message;

        return res.status(err.statusCode).json(errorResponse);
    }

    if (err instanceof NotFoundError) {
        errorResponse.error = 'Not Found';
        errorResponse.message = err.message;
        if (err.resource) {
            errorResponse.resource = err.resource;
        }

        return res.status(err.statusCode).json(errorResponse);
    }

    if (err instanceof ConflictError) {
        errorResponse.error = 'Conflict';
        errorResponse.message = err.message;

        return res.status(err.statusCode).json(errorResponse);
    }

    if (err instanceof RateLimitError) {
        errorResponse.error = 'Rate Limit Exceeded';
        errorResponse.message = err.message;
        if (err.retryAfter) {
            errorResponse.retryAfter = err.retryAfter;
        }

        return res.status(err.statusCode).json(errorResponse);
    }

    if (err instanceof DatabaseError) {
        errorResponse.error = 'Database Error';
        errorResponse.message = err.message;
        if (err.operation) {
            errorResponse.operation = err.operation;
        }

        return res.status(err.statusCode).json(errorResponse);
    }

    if (err instanceof ExternalServiceError) {
        errorResponse.error = 'External Service Error';
        errorResponse.message = err.message;
        if (err.service) {
            errorResponse.service = err.service;
        }

        return res.status(err.statusCode).json(errorResponse);
    }

    if (err instanceof ImageGenerationError) {
        errorResponse.error = 'Image Generation Error';
        errorResponse.message = err.message;
        if (err.provider) {
            errorResponse.provider = err.provider;
        }

        return res.status(err.statusCode).json(errorResponse);
    }

    // Handle legacy error names
    if (err.name === 'ValidationError') {
        errorResponse.error = 'Validation Error';
        errorResponse.message = err.message;

        return res.status(400).json(errorResponse);
    }

    if (err.name === 'UnauthorizedError') {
        errorResponse.error = 'Unauthorized';
        errorResponse.message = 'Invalid or missing authentication token';

        return res.status(401).json(errorResponse);
    }

    if (err.name === 'ForbiddenError') {
        errorResponse.error = 'Forbidden';
        errorResponse.message = 'Access denied';

        return res.status(403).json(errorResponse);
    }

    if (err.name === 'NotFoundError') {
        errorResponse.error = 'Not Found';
        errorResponse.message = 'The requested resource was not found';

        return res.status(404).json(errorResponse);
    }

    if (err.name === 'ConflictError') {
        errorResponse.error = 'Conflict';
        errorResponse.message = 'The request conflicts with the current state';

        return res.status(409).json(errorResponse);
    }

    // Handle database errors
    if (err.code === 'ENOENT') {
        errorResponse.error = 'Database Error';
        errorResponse.message = 'Database file not found';

        return res.status(500).json(errorResponse);
    }

    // Handle rate limiting errors
    if (err.status === 429) {
        errorResponse.error = 'Too Many Requests';
        errorResponse.message = 'Rate limit exceeded. Please try again later.';

        return res.status(429).json(errorResponse);
    }

    // In development, include stack trace
    if (process.env.NODE_ENV === 'development') {
        errorResponse.stack = err.stack;
    }

    res.status(500).json(errorResponse);
};

export const notFoundHandler = (req, res, next) => {
    // Ignore static file requests (CSS, JS, images, etc.)
    if (req.originalUrl.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
        return res.status(404).send('File not found');
    }

    const error = new Error(`Route ${req.originalUrl} not found`);

    error.name = 'NotFoundError';
    next(error);
};

export const asyncHandler = fn => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

export const createError = (name, message, statusCode = 500) => {
    const error = new Error(message);

    error.name = name;
    error.statusCode = statusCode;

    return error;
};
