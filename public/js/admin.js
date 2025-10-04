/**
 * Admin Dashboard Application
 * Main application logic for the admin interface
 */
/* global AdminDashboardManager */

// Global admin application state
window.adminApp = {
    initialized: false,
    user: null,
    dashboardManager: null,
    currentTab: null,
    authCheck: null
};

/**
 * Global notification function that uses AdminUtils
 * @param {string} message - The notification message
 * @param {string} type - The notification type (success, error, warning, info)
 */
const showNotification = (message, type = 'info') => {
    if (window.AdminUtils && window.AdminUtils.showNotification) {
        window.AdminUtils.showNotification(message, type);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
};

/**
 * Global modal show function
 * @param {string} title - The modal title
 * @param {string} content - The modal content
 * @param {object} options - Modal options
 */
const showModal = (title, content, options = {}) => {
    console.log('🎭 ADMIN: showModal called with title:', title);
    console.log('🎭 ADMIN: window.adminModal available:', !!window.adminModal);
    console.log('🎭 ADMIN: window.adminModal.show available:', !!(window.adminModal && window.adminModal.show));

    if (window.adminModal && window.adminModal.show) {
        console.log('🎭 ADMIN: Calling window.adminModal.show');
        try {
            window.adminModal.show(title, content, options);
            console.log('🎭 ADMIN: Modal show called successfully');
        } catch (error) {
            console.error('🎭 ADMIN: Error calling modal show:', error);
        }
    } else {
        console.error(`[MODAL] AdminModal not available. Title: ${title}`);
    }
};

/**
 * Global modal hide function
 */
const hideModal = () => {
    if (window.adminModal && window.adminModal.close) {
        window.adminModal.close();
    } else {
        console.error('[MODAL] AdminModal not available for hiding');
    }
};

// Authentication functions moved to AdminAuthManager module

// getAdminUserInfo moved to AdminAuthManager module

// getFallbackUserInfo moved to AdminAuthManager module

// waitForUserApi moved to AdminAuthManager module

/**
 * Handle authentication and redirect logic
 */
const handleAuthentication = async () => {
    console.log('🔐 ADMIN: handleAuthentication called');
    console.log('🔐 ADMIN: window.AdminAuthManager available:', !!window.AdminAuthManager);

    if (!window.AdminAuthManager) {
        console.error('❌ ADMIN: AdminAuthManager not available');
        return false;
    }

    if (!await window.AdminAuthManager.waitForUserApi()) {
        console.error('❌ ADMIN: userApi not available, redirecting to login...');
        window.location.href = '/login.html';

        return false;
    }

    console.log('🔐 ADMIN: Starting authentication check...');
    const authResult = await window.AdminAuthManager.checkAdminAuthentication();

    if (!authResult) {
        const isDebugMode = window.location.search.includes('debug') || window.location.search.includes('admin-debug');

        if (isDebugMode) {
            showErrorScreen('Authentication failed. Check console for details. Use window.adminDebug.debugAuth() to debug.');

            return false;
        }

        setTimeout(() => {
            window.location.href = '/login.html';
        }, 2000);

        return false;
    }

    return true;
};

/**
 * Initialize dashboard components and UI
 */
const initializeDashboardComponents = async () => {
    window.adminApp.dashboardManager = new AdminDashboardManager();
    await window.adminApp.dashboardManager.init();

    if (window.AdminPackageManager) {
        window.adminApp.packageHandler = new window.AdminPackageManager();
        await window.adminApp.packageHandler.init();
    }

    window.adminApp.user = await window.AdminAuthManager.getAdminUserInfo();
    updateAdminHeader(window.adminApp.user);
    setupGlobalEventListeners();
    setupNotificationSystem();
    assignGlobalFunctions();
};

/**
 * Show dashboard and verify visibility
 */
const showDashboardAndVerify = () => {
    showScreen('dashboard');

    const dashboard = document.getElementById('admin-dashboard');
    const errorScreen = document.getElementById('error-screen');
    const loadingScreen = document.getElementById('loading-screen');

    if (dashboard) {
        dashboard.style.display = 'flex';
        dashboard.style.visibility = 'visible';
        dashboard.style.opacity = '1';
    }
    if (errorScreen) {
        errorScreen.style.display = 'none';
        errorScreen.style.visibility = 'hidden';
        errorScreen.style.opacity = '0';
    }
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
        loadingScreen.style.visibility = 'hidden';
        loadingScreen.style.opacity = '0';
    }

    window.adminApp.initialized = true;
    console.log('✅ ADMIN: Dashboard initialized successfully');
};

/**
 * Initialize the admin dashboard
 */
const initializeAdminDashboard = async () => {
    try {
        console.log('🎛️ ADMIN: Initializing dashboard...');
        showScreen('loading');

        // Initialize modal manager first
        if (window.AdminModalManager) {
            window.adminModal = new window.AdminModalManager();
            window.adminModal.init();
            console.log('🎭 ADMIN: Modal manager initialized');
        } else {
            console.warn('⚠️ ADMIN: AdminModalManager not available');
        }

        // Initialize authentication check first
        if (window.AdminAuthCheck) {
            window.adminApp.authCheck = new window.AdminAuthCheck();
            await window.adminApp.authCheck.init();
            console.log('✅ ADMIN: Authentication check initialized');
        } else {
            console.warn('⚠️ ADMIN: AdminAuthCheck not available');
        }

        // Handle authentication
        const authSuccess = await handleAuthentication();

        if (!authSuccess) {
            return;
        }

        console.log('✅ ADMIN: Authentication successful, proceeding with dashboard initialization...');

        // Initialize dashboard components
        await initializeDashboardComponents();

        // Show dashboard and verify
        showDashboardAndVerify();

    } catch (error) {
        console.error('❌ ADMIN: Dashboard initialization failed:', error);
        showErrorScreen(error.message);
    }
};

/**
 * Show specific screen (loading, dashboard, error)
 */
const showScreen = screenType => {
    console.log(`🖥️ ADMIN: showScreen called with type: ${screenType}`);

    const screens = {
        loading: document.getElementById('loading-screen'),
        dashboard: document.getElementById('admin-dashboard'),
        error: document.getElementById('error-screen')
    };

    console.log('🖥️ ADMIN: Screen elements found:', {
        loading: !!screens.loading,
        dashboard: !!screens.dashboard,
        error: !!screens.error
    });

    // Hide all screens
    Object.values(screens).forEach(screen => {
        if (screen) {
            screen.style.display = 'none';
        }
    });

    // Show target screen
    if (screens[screenType]) {
        screens[screenType].style.display = 'flex';
        console.log(`🖥️ ADMIN: Showing ${screenType} screen`);
    } else {
        console.error(`🖥️ ADMIN: Screen element not found for type: ${screenType}`);
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
    setupBasicEventListeners();
    setupModalEventListeners();
    setupAdminDashboardEvents();
};

/**
 * Setup basic UI event listeners
 */
const setupBasicEventListeners = () => {
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
};

/**
 * Setup modal event listeners
 * Note: Modal event listeners are now handled by AdminModalManager
 */
const setupModalEventListeners = () => {
    console.log('🎭 ADMIN: Modal event listeners are handled by AdminModalManager');
    // Modal event listeners are now handled by AdminModalManager
    // No need to set up duplicate listeners here
};

/**
 * Setup admin dashboard events - unified event handling
 */
const setupAdminDashboardEvents = () => {
    window.addEventListener('admin-tab-switch', e => {
        if (window.adminApp.dashboardManager?.eventBus) {
            window.adminApp.dashboardManager.eventBus.emit('tab-switch', e.detail.tab);
        }
    });

    window.addEventListener('admin-refresh-snapshot', () => {
        if (window.adminApp.dashboardManager?.eventBus) {
            window.adminApp.dashboardManager.eventBus.emit('refresh-snapshot');
        }
    });

    window.addEventListener('admin-table-action', e => {
        if (window.adminApp.dashboardManager?.eventBus) {
            // Convert dataType to historyType for admin dashboard manager
            const actionData = {
                ...e.detail,
                historyType: e.detail.dataType
            };

            // Emit the event with proper parameters: type, action, data
            window.adminApp.dashboardManager.eventBus.emit('table-action', e.detail.action, actionData);
        }
    });

    window.addEventListener('admin-table-sort', e => {
        if (window.adminApp.dashboardManager?.eventBus) {
            window.adminApp.dashboardManager.eventBus.emit('refresh-history', e.detail.historyType);
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

};

// User row update functions moved to AdminUserManager module


// escapeHtml function moved to utility module (not currently used)

// ===========================================
// GLOBAL ADMIN FUNCTIONS
// These functions are called by the admin sections
// ===========================================

// Payment functions moved to AdminUserManager module

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
    if (window.AdminModalFunctions.showConfirmModal('Are you sure you want to reset the pricing form?')) {
        // Implementation would reset form
        showNotification('Pricing form reset', 'info');
    }
};

/**
 * Rollback pricing
 */
window.rollbackPricing = function rollbackPricing(versionId) {
    console.log('⏪ ADMIN: Rolling back pricing to version:', versionId);

    const confirmMessage = `Are you sure you want to rollback to pricing version ${versionId}?`;

    if (window.AdminModalFunctions.showConfirmModal(confirmMessage)) {
        // Implementation would call rollback API
        showNotification(`Pricing rollback to version ${versionId} initiated`, 'info');
    }
};

// User management functions moved to AdminUserManager module

// Global function wrappers will be assigned after modules are loaded

/**
 * Assign global function wrappers after modules are loaded
 */
const assignGlobalFunctions = () => {
    // Modal functions - assign to global scope
    window.showModal = showModal;
    window.hideModal = hideModal;
    window.showNotification = showNotification;

    // User management functions
    if (window.AdminUserManager) {
        window.viewPayment = window.AdminUserManager.viewPayment;
        window.refundPayment = window.AdminUserManager.refundPayment;
        window.exportPayments = window.AdminUserManager.exportPayments;
        window.refreshPayments = window.AdminUserManager.refreshPayments;
        window.viewUser = window.AdminUserManager.viewUser;
        window.sendCredits = window.AdminUserManager.sendCredits;
        window.suspendUser = window.AdminUserManager.suspendUser;
        window.unsuspendUser = window.AdminUserManager.unsuspendUser;
        window.exportUsers = window.AdminUserManager.exportUsers;
        window.refreshUsers = window.AdminUserManager.refreshUsers;
    }

    // Promo code functions
    if (window.AdminPromoManager) {
        window.generatePromoCode = window.AdminPromoManager.generatePromoCode;
        window.viewPromoStats = window.AdminPromoManager.viewPromoStats;
        window.editPromoCode = window.AdminPromoManager.editPromoCode;
        window.deletePromoCode = window.AdminPromoManager.deletePromoCode;
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

// Modal functions moved to AdminModalFunctions module

// ===========================================
// INITIALIZATION
// ===========================================

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎛️ ADMIN: DOM ready, waiting for scripts to load...');

    // Add a small delay to ensure all scripts are loaded
    setTimeout(() => {
        console.log('🎛️ ADMIN: Starting dashboard initialization...');
        initializeAdminDashboard();
    }, 500); // 500ms delay
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
    reinitialize: initializeAdminDashboard,
    checkAuth: window.AdminAuthManager?.checkAdminAuthentication,
    getFallbackUser: window.AdminAuthManager?.getFallbackUserInfo,
    debugAuth: async () => {
        console.log('🔍 ADMIN DEBUG: Starting authentication debug...');
        console.log('🔍 ADMIN DEBUG: userApi available:', !!window.userApi);
        console.log('🔍 ADMIN DEBUG: userApi.isAuthenticated():', window.userApi?.isAuthenticated());
        console.log('🔍 ADMIN DEBUG: Auth token:', window.userApi?.getAuthToken());
        console.log('🔍 ADMIN DEBUG: Fallback user:', window.AdminAuthManager?.getFallbackUserInfo());

        if (window.userApi) {
            try {
                const profile = await window.userApi.getProfile();

                console.log('🔍 ADMIN DEBUG: Profile response:', profile);
                console.log('🔍 ADMIN DEBUG: User isAdmin:', profile?.data?.user?.isAdmin);
            } catch (error) {
                console.log('🔍 ADMIN DEBUG: Profile fetch error:', error);
            }
        }
    }
};

// Promo code functions moved to AdminPromoManager module

// Global function wrappers will be assigned after modules are loaded
