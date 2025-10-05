/**
 * ErrorHandler - Centralized error handling and recovery
 * Single Responsibility: Error handling, logging, and user feedback
 */

class ErrorHandler {
    constructor() {
        this.errorTypes = new Map();
        this.recoveryStrategies = new Map();
        this.setupDefaultErrorTypes();
        this.setupGlobalErrorHandling();
    }

    setupDefaultErrorTypes() {
        this.errorTypes.set('NETWORK_ERROR', {
            message: 'Network connection failed. Please check your internet connection.',
            severity: 'high',
            recoverable: true
        });

        this.errorTypes.set('AUTH_ERROR', {
            message: 'Authentication failed. Please log in again.',
            severity: 'high',
            recoverable: true,
            action: () => window.location.href = '/login'
        });

        this.errorTypes.set('VALIDATION_ERROR', {
            message: 'Please check your input and try again.',
            severity: 'medium',
            recoverable: true
        });

        this.errorTypes.set('SERVER_ERROR', {
            message: 'Server error occurred. Please try again later.',
            severity: 'high',
            recoverable: true
        });

        this.errorTypes.set('UNKNOWN_ERROR', {
            message: 'An unexpected error occurred. Please try again.',
            severity: 'medium',
            recoverable: true
        });
    }

    setupGlobalErrorHandling() {
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.handleError(event.reason, 'UNKNOWN_ERROR');
            event.preventDefault();
        });

        // Handle global JavaScript errors
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            this.handleError(event.error, 'UNKNOWN_ERROR');
        });
    }

    handleError(error, type = 'UNKNOWN_ERROR', context = {}) {
        const errorInfo = this.errorTypes.get(type) || this.errorTypes.get('UNKNOWN_ERROR');

        // Log error details
        this.logError(error, type, context);

        // Determine if error is recoverable
        if (errorInfo.recoverable) {
            this.attemptRecovery(error, type, context);
        } else {
            this.showFatalError(errorInfo.message);
        }

        return {
            type,
            message: errorInfo.message,
            recoverable: errorInfo.recoverable,
            action: errorInfo.action
        };
    }

    logError(error, type, context) {
        const errorLog = {
            timestamp: new Date().toISOString(),
            type,
            message: error.message || error.toString(),
            stack: error.stack,
            context,
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        console.error('ErrorHandler:', errorLog);

        // In production, you might want to send this to a logging service
        // this.sendToLoggingService(errorLog);
    }

    attemptRecovery(error, type, context) {
        const recoveryStrategy = this.recoveryStrategies.get(type);

        if (recoveryStrategy) {
            try {
                recoveryStrategy(error, context);
            } catch (recoveryError) {
                console.error('Recovery failed:', recoveryError);
                this.showFatalError('Recovery failed. Please refresh the page.');
            }
        } else {
            this.showUserFriendlyError(type);
        }
    }

    showUserFriendlyError(type) {
        const errorInfo = this.errorTypes.get(type);
        if (errorInfo && errorInfo.action) {
            errorInfo.action();
        } else {
            this.showNotification(errorInfo.message, 'error');
        }
    }

    showFatalError(message) {
        // Show a modal or redirect to error page
        console.error('Fatal error:', message);
        this.showNotification(message, 'error', 0); // Don't auto-hide
    }

    showNotification(message, type = 'error', duration = 5000) {
        // Dispatch custom event for UI controllers to handle
        window.dispatchEvent(new CustomEvent('errorNotification', {
            detail: { message, type, duration }
        }));
    }

    addErrorType(type, config) {
        this.errorTypes.set(type, config);
    }

    addRecoveryStrategy(type, strategy) {
        this.recoveryStrategies.set(type, strategy);
    }

    // Specific error handlers for common scenarios
    handleNetworkError(error) {
        return this.handleError(error, 'NETWORK_ERROR');
    }

    handleAuthError(error) {
        return this.handleError(error, 'AUTH_ERROR');
    }

    handleValidationError(error) {
        return this.handleError(error, 'VALIDATION_ERROR');
    }

    handleServerError(error) {
        return this.handleError(error, 'SERVER_ERROR');
    }

    // Retry mechanism for recoverable errors
    async retry(operation, maxRetries = 3, delay = 1000) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                console.warn(`Retry attempt ${attempt}/${maxRetries} failed:`, error);

                if (attempt === maxRetries) {
                    throw error;
                }

                await new Promise(resolve => setTimeout(resolve, delay * attempt));
            }
        }
    }
}

// Export for use in other modules
window.ErrorHandler = ErrorHandler;
