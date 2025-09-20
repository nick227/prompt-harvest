// Billing System Entry Point - Replaces monolithic billing.js
/* global BillingManager */

// Initialize billing manager
let billingManager;

/**
 * Initialize billing system when DOM is ready
 */
const initializeBillingSystem = () => {
    if (billingManager) {
        console.warn('Billing system already initialized');

        return;
    }

    billingManager = new BillingManager();
    window.billingManager = billingManager; // Make available globally for UI
    billingManager.init().catch(error => {
        console.error('Failed to initialize billing system:', error);
    });
};

/**
 * Initialize when DOM is ready and dependencies are loaded
 */
const initializeWhenReady = () => {
    // Wait for dependencies to be available
    if (window.userSystem && window.apiService && window.BILLING_CONSTANTS) {
        initializeBillingSystem();
    } else {
        // Check again in 100ms
        setTimeout(initializeWhenReady, 100);
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeWhenReady);
} else {
    initializeWhenReady();
}

/**
 * Public API for external access
 */
window.billingSystem = {
    /**
     * Get billing manager instance
     */
    getManager() {
        return billingManager;
    },

    /**
     * Refresh all data
     */
    async refresh() {
        if (billingManager) {
            await billingManager.refresh();
        }
    },

    /**
     * Get system status
     */
    getStatus() {
        return billingManager ? billingManager.getStatus() : { isInitialized: false };
    },

    /**
     * Show error message
     */
    showError(message) {
        if (billingManager && billingManager.domManager) {
            billingManager.domManager.showError(message);
        }
    },

    /**
     * Show success message
     */
    showSuccess(message) {
        if (billingManager && billingManager.domManager) {
            billingManager.domManager.showSuccess(message);
        }
    },

    /**
     * Cleanup and destroy
     */
    destroy() {
        if (billingManager) {
            billingManager.destroy();
            billingManager = null;
            window.billingManager = null; // Clear global reference
        }
    }
};

// Make manager available globally for debugging
window.billingManager = billingManager;

console.log('🏦 BILLING: Modular billing system loaded');
