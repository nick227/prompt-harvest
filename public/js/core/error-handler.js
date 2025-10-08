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
        } else if (error.status === 402) {
            // Handle insufficient credits with helpful message and purchase option
            const errorData = error.data || {};
            const required = errorData.required || 1;
            const current = errorData.current || 0;
            const shortfall = errorData.shortfall || required;

            userMessage = `You need ${required} credits to generate this image, but you only have ${current} credits. Please purchase more credits to continue.`;

            // Show insufficient credits notification with purchase button
            this.showInsufficientCreditsNotification(userMessage, shortfall);
            return { handled: true, userMessage, showPurchase: true };
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
        // Use notification service if available
        if (window.notificationService) {
            window.notificationService.show(message, 'error');
        } else {
            // Fallback notification
            this.createErrorNotification(message);
        }
    }

    static showInsufficientCreditsNotification(message, shortfall) {
        // Use the new CreditsModalService if available
        if (window.creditsModalService) {
            window.creditsModalService.showCreditsModal({ shortfall });
        } else if (window.notificationService) {
            // Fallback to notification service if available
            const notification = document.createElement('div');
            notification.className = 'fixed top-4 right-4 bg-orange-500 text-white p-4 rounded-lg shadow-lg z-50 max-w-md';

            notification.innerHTML = `
                <div class="flex items-start gap-3">
                    <i class="fas fa-exclamation-triangle mt-1 flex-shrink-0"></i>
                    <div class="flex-1">
                        <div class="font-semibold mb-2">Insufficient Credits</div>
                        <div class="text-sm mb-3">${message}</div>
                        <div class="flex gap-2">
                            <button id="buy-credits-btn" class="bg-white text-orange-500 px-3 py-1 rounded text-sm font-medium hover:bg-orange-50 transition-colors">
                                Buy Credits
                            </button>
                            <button id="dismiss-credits-btn" class="text-orange-200 hover:text-white text-sm">
                                Dismiss
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(notification);

            // Add event listeners
            notification.querySelector('#buy-credits-btn').addEventListener('click', () => {
                this.redirectToBilling();
                notification.remove();
            });

            notification.querySelector('#dismiss-credits-btn').addEventListener('click', () => {
                notification.remove();
            });

            // Auto-remove after 10 seconds
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 10000);

        } else {
            // Fallback to regular error notification
            this.createErrorNotification(message);
        }
    }

    static redirectToBilling() {
        // Redirect to billing page or open billing modal
        if (window.location.pathname.includes('/billing.html')) {
            // Already on billing page, scroll to top
            window.scrollTo(0, 0);
        } else if (window.location.pathname.includes('/admin.html')) {
            // On admin page, redirect to billing
            window.location.href = '/billing.html';
        } else {
            // On main page, try to open billing section if available
            const billingSection = document.querySelector('#billing-section, .billing-section');
            if (billingSection) {
                billingSection.scrollIntoView({ behavior: 'smooth' });
            } else {
                // Fallback to billing page
                window.location.href = '/billing.html';
            }
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

        // Reset generate button processing state but let validation handle disabled state
        const generateBtn = document.querySelector('.btn-generate');

        if (generateBtn) {
            generateBtn.classList.remove('processing');
            generateBtn.textContent = 'START';
            // Don't override disabled state - let validation logic handle it
            // generateBtn.disabled = false;
        }

        // Trigger button state update to apply validation logic
        if (window.imagesManager && window.imagesManager.ui && window.imagesManager.ui.updateButtonState) {
            window.imagesManager.ui.updateButtonState();
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
if (typeof window !== 'undefined') {
    window.ErrorHandler = ErrorHandler;
}
