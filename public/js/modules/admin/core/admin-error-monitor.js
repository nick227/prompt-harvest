/**
 * Admin Error Monitor - Safe, isolated error handling
 * Handles global errors and unhandled promise rejections
 */
class AdminErrorMonitor {
    constructor() {
        this.isInitialized = false;
    }

    /**
     * Initialize error monitoring
     */
    init() {
        if (this.isInitialized) {
            console.warn('AdminErrorMonitor already initialized');

            return;
        }


        // Global error handling
        window.addEventListener('error', event => {
            console.error('Admin Dashboard Error:', event.error);

            // Show user-friendly error notification
            if (window.showNotification) {
                window.showNotification('An unexpected error occurred. Please refresh the page.', 'error');
            }
        });

        // Unhandled promise rejection monitoring
        window.addEventListener('unhandledrejection', event => {
            console.error('Unhandled Promise Rejection:', event.reason);

            if (window.showNotification) {
                window.showNotification('A network error occurred. Please check your connection.', 'error');
            }
        });

        this.isInitialized = true;
    }

    /**
     * Cleanup error monitoring
     */
    cleanup() {
        // Note: We don't remove event listeners as they're global
        this.isInitialized = false;
    }
}

// Export for global access and module systems
if (typeof window !== 'undefined') {
    window.AdminErrorMonitor = AdminErrorMonitor;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminErrorMonitor;
}
