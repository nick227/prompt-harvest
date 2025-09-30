/**
 * Queue Error Classes and HTTP Mapping
 *
 * Provides typed error classes and HTTP response mapping for consistent API behavior
 */

// Typed operational errors for clean HTTP mapping
export class BackpressureError extends Error {
    constructor(msg) {
        super(msg);
        this.name = 'BackpressureError';
    }
}

export class RateLimitError extends Error {
    constructor(msg) {
        super(msg);
        this.name = 'RateLimitError';
    }
}

export class InitializationError extends Error {
    constructor(msg) {
        super(msg);
        this.name = 'InitializationError';
    }
}

export class ShutdownError extends Error {
    constructor(msg) {
        super(msg);
        this.name = 'ShutdownError';
    }
}

export class ValidationError extends Error {
    constructor(msg) {
        super(msg);
        this.name = 'ValidationError';
    }
}

export class TimeoutError extends Error {
    constructor(msg) {
        super(msg);
        this.name = 'TimeoutError';
    }
}

/**
 * Map QueueManager errors to HTTP responses for consistent API behavior
 * @param {Error} err - Error to map
 * @returns {Object} HTTP response object with code, body, and headers
 */
export const mapQueueErrorToHttp = err => {
    if (err instanceof RateLimitError) {
        return {
            status: 429,
            body: { error: err.name },
            headers: { 'Retry-After': err.retryAfter ?? 60 }
        };
    }

    if (err instanceof BackpressureError) {
        return {
            status: 429,
            body: { error: err.name },
            headers: { 'Retry-After': 60 }
        };
    }

    if (err instanceof TimeoutError) {
        return {
            status: 408,
            body: { error: err.name }
        };
    }

    if (err.name === 'AbortError') {
        return {
            status: 499,
            body: { error: err.name }
        };
    }

    if (err instanceof InitializationError) {
        return {
            status: 503,
            body: { error: err.name }
        };
    }

    if (err instanceof ShutdownError) {
        return {
            status: 503,
            body: { error: err.name },
            headers: { 'Retry-After': 30 }
        };
    }

    if (err instanceof ValidationError) {
        return {
            status: 400,
            body: { error: err.name }
        };
    }

    return {
        status: 500,
        body: { error: err.name || 'Error' }
    };
};
