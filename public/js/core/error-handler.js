/**
 * Centralized Error Handler - Replace scattered error handling
 * Consolidates error handling from all components
 */

class ErrorHandler {
    static logError(error, context = '', additionalData = {}) {
        const errorInfo = {
            message: error.message || error,
            context,
            timestamp: new Date().toISOString(),
            stack: error.stack,
            ...additionalData
        };

        console.error(`❌ [${context}]`, errorInfo);

        // Could add error reporting service here
        // this.reportError(errorInfo);
    }

    static handleApiError(error, context = 'API') {
        let userMessage = 'An error occurred. Please try again.';

        if (error.status === 401) {
            userMessage = 'Authentication required. Please log in.';
            this.redirectToLogin();
        } else if (error.status === 429) {
            userMessage = 'Too many requests. Please wait a moment.';
        } else if (error.status >= 500) {
            userMessage = 'Server error. Please try again later.';
        } else if (error.message) {
            userMessage = error.message;
        }

        this.logError(error, context);
        this.showUserError(userMessage);

        return { handled: true, userMessage };
    }

    static handleGenerationError(error, context = 'Generation') {
        this.logError(error, context);

        // Remove loading states
        this.cleanupGenerationUI();

        // Show user-friendly message
        const message = error.message?.includes('provider')
            ? 'Please select at least one AI provider'
            : 'Image generation failed. Please try again.';

        this.showUserError(message);
    }

    static showUserError(message) {
        // Use existing notification system if available
        if (window.GenerationUI) {
            const ui = new window.GenerationUI();

            ui.showError(message);
        } else {
            // Fallback notification
            this.createErrorNotification(message);
        }
    }

    static createErrorNotification(message) {
        const notification = document.createElement('div');

        notification.className = 'error-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #dc3545;
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            z-index: 10000;
            max-width: 300px;
            animation: slideIn 0.3s ease-out;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    static cleanupGenerationUI() {
        // Remove loading placeholders
        const loadingPlaceholder = document.querySelector('.loading-placeholder');

        if (loadingPlaceholder) {
            loadingPlaceholder.remove();
        }

        // Reset generate button
        const generateBtn = document.querySelector('.btn-generate');

        if (generateBtn) {
            generateBtn.classList.remove('processing');
            generateBtn.textContent = 'START';
            generateBtn.disabled = false;
        }
    }

    static redirectToLogin() {
        if (window.location.pathname !== '/login.html') {
            window.location.href = '/login.html';
        }
    }

    static async withErrorHandling(asyncFn, context = 'Operation') {
        try {
            return await asyncFn();
        } catch (error) {
            this.handleApiError(error, context);
            throw error;
        }
    }
}

// Export for global access
window.ErrorHandler = ErrorHandler;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorHandler;
}
