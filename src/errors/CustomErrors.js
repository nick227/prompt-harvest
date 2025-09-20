export class ValidationError extends Error {
    constructor(message, field = null) {
        super(message);
        this.name = 'ValidationError';
        this.statusCode = 400;
        this.field = field;
    }
}

export class AuthenticationError extends Error {
    constructor(message = 'Authentication required') {
        super(message);
        this.name = 'AuthenticationError';
        this.statusCode = 401;
    }
}

export class AuthorizationError extends Error {
    constructor(message = 'Access denied') {
        super(message);
        this.name = 'AuthorizationError';
        this.statusCode = 403;
    }
}

export class NotFoundError extends Error {
    constructor(resource = 'Resource') {
        super(`${resource} not found`);
        this.name = 'NotFoundError';
        this.statusCode = 404;
        this.resource = resource;
    }
}

export class ConflictError extends Error {
    constructor(message = 'Resource conflict') {
        super(message);
        this.name = 'ConflictError';
        this.statusCode = 409;
    }
}

export class RateLimitError extends Error {
    constructor(message = 'Rate limit exceeded', retryAfter = null) {
        super(message);
        this.name = 'RateLimitError';
        this.statusCode = 429;
        this.retryAfter = retryAfter;
    }
}

export class DatabaseError extends Error {
    constructor(message = 'Database operation failed', operation = null) {
        super(message);
        this.name = 'DatabaseError';
        this.statusCode = 500;
        this.operation = operation;
    }
}

export class ExternalServiceError extends Error {
    constructor(service, message = 'External service error') {
        super(`${service}: ${message}`);
        this.name = 'ExternalServiceError';
        this.statusCode = 502;
        this.service = service;
    }
}

export class ImageGenerationError extends Error {
    constructor(provider, message = 'Image generation failed') {
        super(`${provider}: ${message}`);
        this.name = 'ImageGenerationError';
        this.statusCode = 500;
        this.provider = provider;
    }
}
