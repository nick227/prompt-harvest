/**
 * Admin Dashboard Application
 * Main application logic for the admin interface
 */
/* global AdminSectionManagerRefactored */

// Global admin application state
window.adminApp = {
    initialized: false,
    user: null,
    sectionManager: null,
    currentSection: null
};

/**
 * Initialize the admin dashboard
 */
const initializeAdminDashboard = async () => {
    try {
        console.log('🎛️ ADMIN: Initializing dashboard...');

        // Show loading screen
        showScreen('loading');

        // Initialize the new modular admin system
        window.adminApp.sectionManager = new AdminSectionManagerRefactored();

        // Initialize the section manager
        await window.adminApp.sectionManager.init();

        // Get admin user info from the API manager
        const userInfo = await window.adminApp.sectionManager.apiManager.verifyAdminAccess();

        window.adminApp.user = userInfo.user;

        // Update header with user info
        updateAdminHeader(userInfo.user);

        // Setup global reference for backward compatibility
        window.adminSectionManager = window.adminApp.sectionManager;

        // Setup global event listeners
        setupGlobalEventListeners();

        // Setup notification system
        setupNotificationSystem();

        // Show dashboard
        showScreen('dashboard');

        window.adminApp.initialized = true;
        console.log('✅ ADMIN: Dashboard initialized successfully');

    } catch (error) {
        console.error('❌ ADMIN: Dashboard initialization failed:', error);
        showErrorScreen(error.message);
    }
};

/**
 * Show specific screen (loading, dashboard, error)
 */
const showScreen = screenType => {
    const screens = {
        loading: document.getElementById('loading-screen'),
        dashboard: document.getElementById('admin-dashboard'),
        error: document.getElementById('error-screen')
    };

    // Hide all screens
    Object.values(screens).forEach(screen => {
        if (screen) {
            screen.style.display = 'none';
        }
    });

    // Show target screen
    if (screens[screenType]) {
        screens[screenType].style.display = screenType === 'dashboard' ? 'flex' : 'flex';
    }
};

/**
 * Show error screen with message
 */
const showErrorScreen = message => {
    const errorMessage = document.getElementById('error-message');

    if (errorMessage) {
        errorMessage.textContent = message;
    }
    showScreen('error');
};

/**
 * Update admin header with user information
 */
const updateAdminHeader = user => {
    const emailElement = document.getElementById('admin-user-email');

    if (emailElement && user) {
        emailElement.textContent = user.email;
    }
};

/**
 * Setup global event listeners
 */
const setupGlobalEventListeners = () => {
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');

    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Retry button on error screen
    const retryBtn = document.getElementById('retry-btn');

    if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            location.reload();
        });
    }

    // Sidebar toggle for mobile
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.querySelector('.admin-sidebar');

    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });

        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', e => {
            if (window.innerWidth <= 1024 &&
                !sidebar.contains(e.target) &&
                !sidebarToggle.contains(e.target) &&
                sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
            }
        });
    }

    // Handle window resize
    window.addEventListener('resize', () => {
        if (window.innerWidth > 1024 && sidebar) {
            sidebar.classList.remove('open');
        }
    });

    // Modal close handlers
    const modalContainer = document.getElementById('modal-container');
    const modalClose = document.getElementById('modal-close');
    const modalBackdrop = document.querySelector('.modal-backdrop');

    if (modalClose) {
        modalClose.addEventListener('click', hideModal);
    }

    if (modalBackdrop) {
        modalBackdrop.addEventListener('click', hideModal);
    }

    // Escape key to close modal
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && modalContainer && modalContainer.style.display !== 'none') {
            hideModal();
        }
    });
};

/**
 * Handle user logout
 */
const handleLogout = async () => {
    try {
        // Call logout endpoint
        await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });

        // Redirect to login page
        window.location.href = '/';

    } catch (error) {
        console.error('❌ ADMIN: Logout failed:', error);
        showNotification('Logout failed. Please try again.', 'error');
    }
};

/**
 * Setup notification system
 */
const setupNotificationSystem = () => {
    // Create notification container if it doesn't exist
    let container = document.getElementById('notification-container');

    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'notification-container';
        document.body.appendChild(container);
    }

    // Make showNotification globally available
    window.showNotification = showNotification;
};

/**
 * Show notification message
 */
const showNotification = (message, type = 'info', title = '', duration = 5000) => {
    const container = document.getElementById('notification-container');

    if (!container) {
        return;
    }

    const notification = document.createElement('div');

    notification.className = `notification ${type}`;

    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };

    notification.innerHTML = `
        <div class="notification-icon">
            <i class="${icons[type] || icons.info}"></i>
        </div>
        <div class="notification-content">
            ${title ? `<div class="notification-title">${escapeHtml(title)}</div>` : ''}
            <div class="notification-message">${escapeHtml(message)}</div>
        </div>
    `;

    container.appendChild(notification);

    // Auto-remove notification
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOut 0.3s ease-in forwards';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }, duration);

    // Allow manual dismissal
    notification.addEventListener('click', () => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    });
};

/**
 * Show modal dialog
 */
const showModal = (title, content) => {
    const modalContainer = document.getElementById('modal-container');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');

    if (modalContainer && modalTitle && modalBody) {
        modalTitle.textContent = title;
        modalBody.innerHTML = content;
        modalContainer.style.display = 'flex';
    }
};

/**
 * Hide modal dialog
 */
const hideModal = () => {
    const modalContainer = document.getElementById('modal-container');

    if (modalContainer) {
        modalContainer.style.display = 'none';
    }
};

/**
 * Escape HTML to prevent XSS
 */
const escapeHtml = text => {
    const div = document.createElement('div');

    div.textContent = text;

    return div.innerHTML;
};

// ===========================================
// GLOBAL ADMIN FUNCTIONS
// These functions are called by the admin sections
// ===========================================

/**
 * View payment details
 */
window.viewPayment = function viewPayment(paymentId) {
    console.log('👁️ ADMIN: Viewing payment:', paymentId);
    // Implementation would load payment details in modal
    showNotification(`Payment details for ${paymentId}`, 'info');
};

/**
 * Refund payment
 */
window.refundPayment = function refundPayment(paymentId) {
    console.log('💸 ADMIN: Refunding payment:', paymentId);

    // Create a modal for refund reason input
    const reason = showRefundReasonModal();

    if (!reason) {
        return;
    }

    // Implementation would call refund API
    showNotification(`Refund initiated for payment ${paymentId}`, 'success');
};

/**
 * Export payments
 */
window.exportPayments = function exportPayments() {
    console.log('📊 ADMIN: Exporting payments...');
    showNotification('Payment export started. Download will begin shortly.', 'info');
};

/**
 * Refresh payments
 */
window.refreshPayments = function refreshPayments() {
    console.log('🔄 ADMIN: Refreshing payments...');
    if (window.adminApp.sectionManager) {
        window.adminApp.sectionManager.showSection('payments');
    }
};

/**
 * Preview pricing changes
 */
window.previewPricingChanges = function previewPricingChanges() {
    console.log('👁️ ADMIN: Previewing pricing changes...');
    showNotification('Pricing preview functionality coming soon', 'info');
};

/**
 * Reset pricing form
 */
window.resetPricingForm = function resetPricingForm() {
    console.log('🔄 ADMIN: Resetting pricing form...');
    if (showConfirmModal('Are you sure you want to reset the pricing form?')) {
        // Implementation would reset form
        showNotification('Pricing form reset', 'info');
    }
};

/**
 * Rollback pricing
 */
window.rollbackPricing = function rollbackPricing(versionId) {
    console.log('⏪ ADMIN: Rolling back pricing to version:', versionId);

    if (showConfirmModal(`Are you sure you want to rollback to pricing version ${versionId}?`)) {
        // Implementation would call rollback API
        showNotification(`Pricing rollback to version ${versionId} initiated`, 'info');
    }
};

/**
 * View user details
 */
window.viewUser = function viewUser(userId) {
    console.log('👁️ ADMIN: Viewing user:', userId);
    // Implementation would load user details in modal
    showNotification(`User details for ${userId}`, 'info');
};

/**
 * Add credits to user
 */
window.addCredits = function addCredits(userId) {
    console.log('💰 ADMIN: Adding credits to user:', userId);

    const input = showAddCreditsModal();

    if (input && input.amount && input.reason) {
        // Implementation would call add credits API
        showNotification(`Added ${input.amount} credits to user ${userId}`, 'success');
    }
};

/**
 * Suspend user
 */
window.suspendUser = function suspendUser(userId) {
    console.log('🚫 ADMIN: Suspending user:', userId);

    const reason = showSuspensionReasonModal();

    if (!reason) {
        return;
    }

    if (showConfirmModal('Are you sure you want to suspend this user?')) {
        // Implementation would call suspend API
        showNotification(`User ${userId} suspended`, 'warning');
    }
};

/**
 * Unsuspend user
 */
window.unsuspendUser = function unsuspendUser(userId) {
    console.log('✅ ADMIN: Unsuspending user:', userId);

    const reason = showUnsuspensionReasonModal();

    if (!reason) {
        return;
    }

    // Implementation would call unsuspend API
    showNotification(`User ${userId} unsuspended`, 'success');
};

/**
 * Export users
 */
window.exportUsers = function exportUsers() {
    console.log('📊 ADMIN: Exporting users...');
    showNotification('User export started. Download will begin shortly.', 'info');
};

/**
 * Refresh users
 */
window.refreshUsers = function refreshUsers() {
    console.log('🔄 ADMIN: Refreshing users...');
    if (window.adminApp.sectionManager) {
        window.adminApp.sectionManager.showSection('users');
    }
};

/**
 * Apply filters
 */
window.applyFilters = function applyFilters() {
    console.log('🔍 ADMIN: Applying filters...');
    showNotification('Filters applied', 'info');
};

/**
 * Clear filters
 */
window.clearFilters = function clearFilters() {
    console.log('🗑️ ADMIN: Clearing filters...');
    showNotification('Filters cleared', 'info');
};

/**
 * Go to page
 */
window.goToPage = function goToPage(page) {
    console.log('📄 ADMIN: Going to page:', page);
    showNotification(`Loading page ${page}...`, 'info');
};

// ===========================================
// MODAL FUNCTIONS
// ===========================================

/**
 * Show refund reason modal
 */
const showRefundReasonModal = function showRefundReasonModal() {
    // Create a simple modal for refund reason input
    return createInputModal('Enter refund reason:', 'text');
};

/**
 * Show confirm modal
 */
const showConfirmModal = function showConfirmModal(message) {
    // Create a simple confirm modal
    return createConfirmModal(message);
};

/**
 * Show add credits modal
 */
const showAddCreditsModal = function showAddCreditsModal() {
    // Create a simple modal for credits input
    const amount = createInputModal('Enter credits amount:', 'number');

    if (!amount) {
        return null;
    }

    const reason = createInputModal('Enter reason:', 'text');

    if (!reason) {
        return null;
    }

    return { amount, reason };
};

/**
 * Show suspension reason modal
 */
const showSuspensionReasonModal = function showSuspensionReasonModal() {
    // Create a simple modal for suspension reason input
    return createInputModal('Enter suspension reason:', 'text');
};

/**
 * Show unsuspension reason modal
 */
const showUnsuspensionReasonModal = function showUnsuspensionReasonModal() {
    // Create a simple modal for unsuspension reason input
    return createInputModal('Enter unsuspension reason:', 'text');
};

/**
 * Create a simple input modal
 */
const createInputModal = function createInputModal(message, type = 'text') {
    // For now, return a default value to avoid breaking functionality
    // In a real implementation, this would create a proper modal
    showNotification(`${message} (Modal not implemented - using default)`, 'info');

    return type === 'number' ? '100' : 'Default reason';
};

/**
 * Create a simple confirm modal
 */
const createConfirmModal = function createConfirmModal(message) {
    // For now, return true to avoid breaking functionality
    // In a real implementation, this would create a proper modal
    showNotification(`${message} (Modal not implemented - assuming yes)`, 'info');

    return true;
};

// ===========================================
// INITIALIZATION
// ===========================================

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎛️ ADMIN: DOM ready, initializing dashboard...');
    initializeAdminDashboard();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window.adminApp.initialized) {
        // Refresh data when page becomes visible again
        console.log('👁️ ADMIN: Page visible, refreshing critical data...');
        // Could refresh current section or update real-time data
    }
});

// Handle network status changes
window.addEventListener('online', () => {
    if (window.adminApp.initialized) {
        showNotification('Connection restored', 'success');
    }
});

window.addEventListener('offline', () => {
    if (window.adminApp.initialized) {
        showNotification('Connection lost. Some features may not work.', 'warning');
    }
});

// Export for debugging in console
window.adminDebug = {
    app: window.adminApp,
    showNotification,
    showModal,
    hideModal,
    reinitialize: initializeAdminDashboard
};
