// Circuit Breaker specific error classes
export class CircuitBreakerOpenError extends Error {
    constructor(service, retryAfter = 60) {
        super(`Circuit breaker is open for ${service}. Retry after ${retryAfter} seconds.`);
        this.name = 'CircuitBreakerOpenError';
        this.service = service;
        this.retryAfter = retryAfter;
        this.statusCode = 503;
    }
}

export class ProviderUnavailableError extends Error {
    constructor(provider, reason = 'Unknown') {
        super(`Provider ${provider} is unavailable: ${reason}`);
        this.name = 'ProviderUnavailableError';
        this.provider = provider;
        this.reason = reason;
        this.statusCode = 503;
    }
}

export class ImageGenerationTimeoutError extends Error {
    constructor(provider, timeout) {
        super(`Image generation timed out for ${provider} after ${timeout}ms`);
        this.name = 'ImageGenerationTimeoutError';
        this.provider = provider;
        this.timeout = timeout;
        this.statusCode = 408;
    }
}

export class ContentPolicyViolationError extends Error {
    constructor(provider, prompt) {
        super(`Content policy violation for ${provider}. Prompt may contain inappropriate content.`);
        this.name = 'ContentPolicyViolationError';
        this.provider = provider;
        this.prompt = prompt;
        this.statusCode = 400;
    }
}

export class FileSystemError extends Error {
    constructor(operation, path, reason) {
        super(`File system error during ${operation} at ${path}: ${reason}`);
        this.name = 'FileSystemError';
        this.operation = operation;
        this.path = path;
        this.reason = reason;
        this.statusCode = 500;
    }
}

export class DatabaseTransactionError extends Error {
    constructor(operation, reason) {
        super(`Database transaction failed during ${operation}: ${reason}`);
        this.name = 'DatabaseTransactionError';
        this.operation = operation;
        this.reason = reason;
        this.statusCode = 500;
    }
}
