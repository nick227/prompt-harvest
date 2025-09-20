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
function showNotification(message, type = 'info') {
    if (window.AdminUtils && window.AdminUtils.showNotification) {
        window.AdminUtils.showNotification(message, type);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
}

/**
 * Global modal show function
 * @param {string} modalId - The modal ID to show
 */
function showModal(modalId) {
    if (window.AdminUtils && window.AdminUtils.showModal) {
        window.AdminUtils.showModal(modalId);
    } else {
        console.log(`[MODAL] Show modal: ${modalId}`);
    }
}

/**
 * Global modal hide function
 * @param {string} modalId - The modal ID to hide
 */
function hideModal(modalId) {
    if (window.AdminUtils && window.AdminUtils.hideModal) {
        window.AdminUtils.hideModal(modalId);
    } else {
        console.log(`[MODAL] Hide modal: ${modalId}`);
    }
}

/**
 * Check if user is authenticated and has admin privileges
 * @returns {Promise<boolean>} True if authenticated as admin
 */
const checkAdminAuthentication = async () => {
    try {
        console.log('🔍 ADMIN: Starting authentication check...');

        // Check if userApi is available
        if (!window.userApi) {
            console.error('❌ ADMIN: userApi not available');

            return false;
        }

        console.log('✅ ADMIN: userApi is available');

        // Check if user is authenticated
        const isAuthenticated = window.userApi.isAuthenticated();

        console.log('🔍 ADMIN: isAuthenticated() returned:', isAuthenticated);

        if (!isAuthenticated) {
            console.log('🔐 ADMIN: User not authenticated');

            return false;
        }

        // Get user profile to check admin status
        console.log('🔍 ADMIN: Fetching user profile...');
        let userProfile;

        try {
            userProfile = await window.userApi.getProfile();
            console.log('🔍 ADMIN: Profile response:', userProfile);
        } catch (error) {
            console.error('❌ ADMIN: Profile fetch failed:', error);

            // Fallback: try to get user info from localStorage/sessionStorage
            console.log('🔍 ADMIN: Trying fallback method...');
            const fallbackUser = getFallbackUserInfo();

            if (fallbackUser && fallbackUser.isAdmin) {
                console.log('✅ ADMIN: Fallback user info found:', fallbackUser);

                return true;
            }

            return false;
        }

        if (!userProfile || !userProfile.data) {
            console.log('🔐 ADMIN: No user profile data');

            // Fallback: try to get user info from localStorage/sessionStorage
            console.log('🔍 ADMIN: Trying fallback method...');
            const fallbackUser = getFallbackUserInfo();

            if (fallbackUser && fallbackUser.isAdmin) {
                console.log('✅ ADMIN: Fallback user info found:', fallbackUser);

                return true;
            }

            return false;
        }

        // Check if user has admin privileges
        console.log('🔍 ADMIN: Full user data:', userProfile.data.user);
        console.log('🔍 ADMIN: User data keys:', Object.keys(userProfile.data.user || {}));
        console.log('🔍 ADMIN: Raw isAdmin value:', userProfile.data.user?.isAdmin);
        console.log('🔍 ADMIN: isAdmin type:', typeof userProfile.data.user?.isAdmin);

        const isAdmin = userProfile.data.user?.isAdmin === true;

        console.log('🔍 ADMIN: isAdmin check:', {
            isAdmin: userProfile.data.user?.isAdmin,
            isAdminType: typeof userProfile.data.user?.isAdmin,
            isAdminStrict: isAdmin,
            userData: userProfile.data.user
        });

        if (!isAdmin) {
            console.log('🔐 ADMIN: User is not an admin');

            return false;
        }

        console.log('✅ ADMIN: User authenticated as admin:', userProfile.data.user.email);

        return true;

    } catch (error) {
        console.error('❌ ADMIN: Authentication check failed:', error);

        return false;
    }
};

/**
 * Get admin user information
 * @returns {Promise<Object>} Admin user data
 */
const getAdminUserInfo = async () => {
    try {
        const userProfile = await window.userApi.getProfile();

        return {
            email: userProfile.data.user.email,
            name: userProfile.data.user.name || userProfile.data.user.email,
            isAdmin: userProfile.data.user.isAdmin
        };
    } catch (error) {
        console.error('❌ ADMIN: Failed to get user info:', error);

        return { email: 'Unknown', name: 'Unknown', isAdmin: false };
    }
};

/**
 * Get fallback user info from localStorage/sessionStorage
 */
const getFallbackUserInfo = () => {
    try {
        // Try to get user info from various possible storage locations
        const possibleKeys = [
            'user',
            'userData',
            'currentUser',
            'authUser',
            'userInfo'
        ];

        for (const key of possibleKeys) {
            // Check localStorage
            const localData = localStorage.getItem(key);

            if (localData) {
                try {
                    const userData = JSON.parse(localData);

                    if (userData && userData.isAdmin) {
                        console.log('🔍 ADMIN: Found user in localStorage:', key, userData);

                        return userData;
                    }
                } catch (e) {
                    // Ignore parsing errors
                }
            }

            // Check sessionStorage
            const sessionData = sessionStorage.getItem(key);

            if (sessionData) {
                try {
                    const userData = JSON.parse(sessionData);

                    if (userData && userData.isAdmin) {
                        console.log('🔍 ADMIN: Found user in sessionStorage:', key, userData);

                        return userData;
                    }
                } catch (e) {
                    // Ignore parsing errors
                }
            }
        }

        // Check if there's a user object in window
        if (window.userSystem && window.userSystem.getUser) {
            const user = window.userSystem.getUser();

            if (user && user.isAdmin) {
                console.log('🔍 ADMIN: Found user in window.userSystem:', user);

                return user;
            }
        }

        console.log('🔍 ADMIN: No fallback user info found');

        return null;
    } catch (error) {
        console.error('❌ ADMIN: Error getting fallback user info:', error);

        return null;
    }
};

/**
 * Wait for userApi to be available
 */
const waitForUserApi = async () => {
    let attempts = 0;
    const maxAttempts = 100; // 10 seconds max

    while (!window.userApi && attempts < maxAttempts) {
        console.log(`🔍 ADMIN: Waiting for userApi... (attempt ${attempts + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }

    if (!window.userApi) {
        console.error('❌ ADMIN: userApi not available after waiting');
        console.error('🔍 ADMIN: Available window objects:', Object.keys(window).filter(key => key.includes('user') || key.includes('api') || key.includes('Api')
        ));

        return false;
    }

    console.log('✅ ADMIN: userApi is available');

    // Additional check to ensure userApi methods are available
    if (typeof window.userApi.isAuthenticated !== 'function') {
        console.error('❌ ADMIN: userApi.isAuthenticated is not a function');

        return false;
    }

    if (typeof window.userApi.getProfile !== 'function') {
        console.error('❌ ADMIN: userApi.getProfile is not a function');

        return false;
    }

    console.log('✅ ADMIN: userApi methods are available');

    return true;
};

/**
 * Initialize the admin dashboard
 */
const initializeAdminDashboard = async () => {
    try {
        console.log('🎛️ ADMIN: Initializing dashboard...');

        // Show loading screen
        showScreen('loading');

        // Initialize authentication check first
        if (window.AdminAuthCheck) {
            window.adminApp.authCheck = new AdminAuthCheck();
            await window.adminApp.authCheck.init();
            console.log('✅ ADMIN: Authentication check initialized');
        } else {
            console.warn('⚠️ ADMIN: AdminAuthCheck not available');
        }

        // Wait for userApi to be available
        if (!await waitForUserApi()) {
            console.error('❌ ADMIN: userApi not available, redirecting to login...');
            window.location.href = '/login.html';

            return;
        }

        // Check authentication first
        console.log('🔐 ADMIN: Starting authentication check...');
        console.log('🔐 ADMIN: userApi available:', !!window.userApi);
        console.log('🔐 ADMIN: userApi.isAuthenticated():', window.userApi?.isAuthenticated());
        console.log('🔐 ADMIN: Auth token:', window.userApi?.getAuthToken());

        const authResult = await checkAdminAuthentication();

        console.log('🔐 ADMIN: Authentication result:', authResult);

        if (!authResult) {
            console.log('🔐 ADMIN: Authentication failed');

            // Check if we're in debug mode or if there's a debug parameter
            const isDebugMode = window.location.search.includes('debug') || window.location.search.includes('admin-debug');

            if (isDebugMode) {
                console.log('🔐 ADMIN: Debug mode detected, showing error screen instead of redirecting');
                showErrorScreen('Authentication failed. Check console for details. Use window.adminDebug.debugAuth() to debug.');
                return;
            }

            console.log('🔐 ADMIN: Redirecting to login page in 2 seconds...');

            // Add a delay before redirect to allow console logs to be seen
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 2000);

            return;
        }

        console.log('✅ ADMIN: Authentication successful, proceeding with dashboard initialization...');

        // Initialize the new modular admin system
        window.adminApp.dashboardManager = new AdminDashboardManager();

        // Initialize the dashboard manager
        await window.adminApp.dashboardManager.init();

        // Initialize package handler
        if (window.AdminPackageManager) {
            window.adminApp.packageHandler = new AdminPackageManager();
            await window.adminApp.packageHandler.init();
            console.log('✅ ADMIN: Package handler initialized');
        }

        // Get admin user info from authentication system
        window.adminApp.user = await getAdminUserInfo();

        // Update header with user info
        updateAdminHeader(window.adminApp.user);

        // Setup global event listeners
        setupGlobalEventListeners();

        // Setup notification system
        setupNotificationSystem();

        // Show dashboard
        console.log('🖥️ ADMIN: Showing dashboard screen...');
        showScreen('dashboard');

        // Verify dashboard is visible
        const dashboard = document.getElementById('admin-dashboard');
        const errorScreen = document.getElementById('error-screen');
        console.log('🖥️ ADMIN: Dashboard element:', dashboard);
        console.log('🖥️ ADMIN: Dashboard display style:', dashboard?.style.display);
        console.log('🖥️ ADMIN: Error screen display style:', errorScreen?.style.display);

        // Force dashboard to be visible and error screen to be hidden
        if (dashboard) {
            dashboard.style.display = 'flex';
            dashboard.style.visibility = 'visible';
            dashboard.style.opacity = '1';
            console.log('🖥️ ADMIN: Forced dashboard to be visible');
        }
        if (errorScreen) {
            errorScreen.style.display = 'none';
            errorScreen.style.visibility = 'hidden';
            errorScreen.style.opacity = '0';
            console.log('🖥️ ADMIN: Forced error screen to be hidden');
        }

        // Force loading screen to be hidden
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            console.log('🖥️ ADMIN: Loading screen current display style:', loadingScreen.style.display);
            loadingScreen.style.display = 'none';
            loadingScreen.style.visibility = 'hidden';
            loadingScreen.style.opacity = '0';
            console.log('🖥️ ADMIN: Forced loading screen to be hidden');
        }

        // Check for any other "Access Denied" messages
        const accessDeniedElements = document.querySelectorAll('*');
        let foundAccessDenied = false;
        accessDeniedElements.forEach(el => {
            if (el.textContent && el.textContent.includes('Access Denied')) {
                console.log('🔍 ADMIN: Found "Access Denied" text in element:', el);
                console.log('🔍 ADMIN: Element display style:', el.style.display);
                console.log('🔍 ADMIN: Element visibility:', el.style.visibility);
                foundAccessDenied = true;
            }
        });
        if (!foundAccessDenied) {
            console.log('🔍 ADMIN: No "Access Denied" text found in DOM');
        }

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
 */
const setupModalEventListeners = () => {
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
            window.adminApp.dashboardManager.eventBus.emit('table-action', actionData);
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

/**
 * Update user row status in the table
 */
const updateUserRowStatus = (userId, isSuspended) => {
    try {
        const userRow = document.querySelector(`tr[data-id="${userId}"]`);

        if (userRow) {
            const statusCell = userRow.querySelector('td.isSuspended');

            if (statusCell) {
                // Update the status display
                statusCell.innerHTML = isSuspended
                    ? '<span class="badge badge-warning">Suspended</span>'
                    : '<span class="badge badge-success">Active</span>';

                statusCell.style.backgroundColor = isSuspended ? '#f59e0b' : '#10b981';
                statusCell.style.transition = 'background-color 0.3s ease';

                setTimeout(() => {
                    statusCell.style.backgroundColor = '';
                }, 2000);

                console.log('✅ ADMIN: Updated user row status to:', isSuspended ? 'suspended' : 'active');
            }
        }
    } catch (error) {
        console.error('❌ ADMIN: Error updating user row status:', error);
    }
};

/**
 * Update user row credit balance in the table
 */
const updateUserRowCreditBalance = (userId, newBalance) => {
    try {
        // Find the table row for this user (using data-id attribute)
        const userRow = document.querySelector(`tr[data-id="${userId}"]`);

        if (userRow) {
            // Find the credit balance cell using the field class
            const creditCell = userRow.querySelector('td.creditBalance');

            if (creditCell) {
                // Update the cell content with new balance
                creditCell.textContent = newBalance;
                creditCell.style.backgroundColor = '#10b981'; // Green highlight
                creditCell.style.transition = 'background-color 0.3s ease';

                // Remove highlight after 2 seconds
                setTimeout(() => {
                    creditCell.style.backgroundColor = '';
                }, 2000);

                console.log('✅ ADMIN: Updated user row credit balance to:', newBalance);
            } else {
                console.log('⚠️ ADMIN: Could not find credit balance cell for user:', userId);
                // Fallback: try to find by column position (creditBalance is usually 4th column)
                const fallbackCell = userRow.querySelector('td:nth-child(4)');

                if (fallbackCell) {
                    fallbackCell.textContent = newBalance;
                    fallbackCell.style.backgroundColor = '#10b981';
                    setTimeout(() => { fallbackCell.style.backgroundColor = ''; }, 2000);
                    console.log('✅ ADMIN: Updated user row credit balance (fallback) to:', newBalance);
                }
            }
        } else {
            console.log('⚠️ ADMIN: Could not find user row for:', userId);
        }
    } catch (error) {
        console.error('❌ ADMIN: Error updating user row:', error);
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
 * Make API request to add credits
 */
const addCreditsApiRequest = async (userId, requestData) => {
    const currentToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

    console.log('🔍 ADMIN: Making API request with:', {
        url: `/api/admin/users/${userId}/credits`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${currentToken}`
        },
        body: requestData,
        token: currentToken ? `${currentToken.substring(0, 20)}...` : 'NO TOKEN'
    });

    const response = await fetch(`/api/admin/users/${userId}/credits`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${currentToken}`
        },
        body: JSON.stringify(requestData)
    });

    console.log('🔍 ADMIN: Response status:', response.status);
    console.log('🔍 ADMIN: Response headers:', Object.fromEntries(response.headers.entries()));

    return await response.json();
};

/**
 * Send credits to user
 */
window.sendCredits = async function sendCredits(userId) {
    console.log('💰 ADMIN: Sending credits to user:', userId);

    const input = await showAddCreditsModal();

    console.log('🔍 ADMIN: Modal input result:', input);

    if (!input || !input.amount || !input.reason) {
        return;
    }

    try {
        const requestData = {
            amount: parseInt(input.amount),
            reason: input.reason
        };

        // Check if we have a valid token
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

        if (!token) {
            showNotification('No authentication token found. Please log in again.', 'error');
            setTimeout(() => window.location.reload(), 2000);

            return;
        }

        // Try to refresh the token if possible
        if (window.userApi && window.userApi.refreshToken) {
            try {
                await window.userApi.refreshToken();
                console.log('🔍 ADMIN: Token refreshed successfully');
            } catch (refreshError) {
                console.log('🔍 ADMIN: Token refresh failed:', refreshError);
            }
        }

        const result = await addCreditsApiRequest(userId, requestData);

        console.log('🔍 ADMIN: API response:', result);

        if (result.success) {
            console.log('🔍 ADMIN: Credits added successfully, updating table...');
            showNotification(`Successfully added ${input.amount} credits to user`, 'success');

            const newBalance = result.data?.user?.creditBalance;

            if (newBalance !== undefined) {
                console.log('🔍 ADMIN: Updating user row with new balance:', newBalance);
                updateUserRowCreditBalance(userId, newBalance);
            }

            if (window.adminApp.dashboardManager?.eventBus) {
                console.log('🔍 ADMIN: Emitting refresh-history event');
                window.adminApp.dashboardManager.eventBus.emit('refresh-history', 'users');
            }
        } else {
            console.error('❌ ADMIN: API returned error:', result);

            if (result.error === 'Authentication required' || result.error === 'User not found') {
                showNotification('Your session has expired. Please refresh the page and log in again.', 'error');
                setTimeout(() => window.location.reload(), 3000);
            } else {
                showNotification(`Failed to add credits: ${result.message}`, 'error');
            }
        }
    } catch (error) {
        console.error('❌ ADMIN: Error adding credits:', error);
        showNotification('Failed to add credits. Please try again.', 'error');
    }
};

/**
 * Suspend user
 */
window.suspendUser = async function suspendUser(userId) {
    console.log('🚫 ADMIN: Suspending user:', userId);

    const reason = await showSuspensionReasonModal();

    if (!reason) {
        return;
    }

    if (await showConfirmModal('Are you sure you want to suspend this user?')) {
        try {
            const response = await fetch(`/api/admin/users/${userId}/suspend`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('authToken') || sessionStorage.getItem('authToken')}`
                },
                body: JSON.stringify({
                    reason
                })
            });

            const result = await response.json();

            if (result.success) {
                showNotification('User suspended successfully', 'warning');

                // Update the user row status immediately
                updateUserRowStatus(userId, true);

                // Also refresh the entire table as backup
                if (window.adminApp.dashboardManager?.eventBus) {
                    window.adminApp.dashboardManager.eventBus.emit('refresh-history', 'users');
                }
            } else {
                showNotification(`Failed to suspend user: ${result.message}`, 'error');
            }
        } catch (error) {
            console.error('❌ ADMIN: Error suspending user:', error);
            showNotification('Failed to suspend user. Please try again.', 'error');
        }
    }
};

/**
 * Unsuspend user
 */
window.unsuspendUser = async function unsuspendUser(userId) {
    console.log('✅ ADMIN: Unsuspending user:', userId);

    const reason = await showUnsuspensionReasonModal();

    if (!reason) {
        return;
    }

    if (await showConfirmModal('Are you sure you want to unsuspend this user?')) {
        try {
            const response = await fetch(`/api/admin/users/${userId}/unsuspend`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('authToken') || sessionStorage.getItem('authToken')}`
                },
                body: JSON.stringify({
                    reason
                })
            });

            const result = await response.json();

            if (result.success) {
                showNotification('User unsuspended successfully', 'success');

                // Update the user row status immediately
                updateUserRowStatus(userId, false);

                // Also refresh the entire table as backup
                if (window.adminApp.dashboardManager?.eventBus) {
                    window.adminApp.dashboardManager.eventBus.emit('refresh-history', 'users');
                }
            } else {
                showNotification(`Failed to unsuspend user: ${result.message}`, 'error');
            }
        } catch (error) {
            console.error('❌ ADMIN: Error unsuspending user:', error);
            showNotification('Failed to unsuspend user. Please try again.', 'error');
        }
    }
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
const showAddCreditsModal = async function showAddCreditsModal() {
    console.log('🔍 ADMIN: showAddCreditsModal called');

    return new Promise(resolve => {
        const content = `
            <div class="space-y-4">
                <p class="text-gray-300">Enter credits amount and reason:</p>
                <input type="number" id="modal-amount" class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter amount" required>
                <input type="text" id="modal-reason" class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter reason (optional)" value="Admin credit adjustment">
                <div class="flex justify-end space-x-2">
                    <button id="modal-cancel" class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors">Cancel</button>
                    <button id="modal-confirm" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">Confirm</button>
                </div>
            </div>
        `;

        console.log('🔍 ADMIN: Showing credits modal with content:', content);
        showModal('Add Credits', content);

        // Wait for modal content to be rendered before adding event listeners
        const setupEventListeners = () => {
            const amountInput = document.getElementById('modal-amount');
            const reasonInput = document.getElementById('modal-reason');
            const cancelBtn = document.getElementById('modal-cancel');
            const confirmBtn = document.getElementById('modal-confirm');

            // Check if all elements exist
            if (!amountInput || !reasonInput || !cancelBtn || !confirmBtn) {
                console.log('🔍 ADMIN: Modal elements not ready, retrying...');
                setTimeout(setupEventListeners, 50);
                return;
            }

            console.log('🔍 ADMIN: All modal elements found, setting up event listeners');

            const cleanup = () => {
                hideModal();
                if (cancelBtn) {
                    cancelBtn.removeEventListener('click', handleCancel);
                }
                if (confirmBtn) {
                    confirmBtn.removeEventListener('click', handleConfirm);
                }
                if (amountInput) {
                    amountInput.removeEventListener('keydown', handleKeydown);
                }
                if (reasonInput) {
                    reasonInput.removeEventListener('keydown', handleKeydown);
                }
            };

            const handleCancel = () => {
                console.log('🔍 ADMIN: Credits modal cancelled');
                cleanup();
                resolve(null);
            };

            const handleConfirm = () => {
                const amount = parseInt(amountInput.value.trim());
                const reason = reasonInput.value.trim() || 'Admin credit adjustment';

                console.log('🔍 ADMIN: Credits modal confirmed with:', { amount, reason });

                if (amount && amount > 0) {
                    cleanup();
                    console.log('🔍 ADMIN: Resolving with result:', { amount, reason });
                    resolve({ amount, reason });
                } else {
                    console.log('🔍 ADMIN: Invalid amount, not resolving');
                    alert('Please enter a valid amount greater than 0');
                }
            };

            const handleKeydown = e => {
                if (e.key === 'Enter') {
                    handleConfirm();
                } else if (e.key === 'Escape') {
                    handleCancel();
                }
            };

            // Add event listeners
            cancelBtn.addEventListener('click', handleCancel);
            confirmBtn.addEventListener('click', handleConfirm);
            amountInput.addEventListener('keydown', handleKeydown);
            reasonInput.addEventListener('keydown', handleKeydown);

            // Focus on amount input
            setTimeout(() => amountInput.focus(), 100);
        };

        // Start setting up event listeners
        setupEventListeners();
    });
};

/**
 * Show suspension reason modal
 */
const showSuspensionReasonModal = async function showSuspensionReasonModal() {
    // Create a simple modal for suspension reason input
    return await createInputModal('Enter suspension reason:', 'text');
};

/**
 * Show unsuspension reason modal
 */
const showUnsuspensionReasonModal = async function showUnsuspensionReasonModal() {
    // Create a simple modal for unsuspension reason input
    return await createInputModal('Enter unsuspension reason:', 'text');
};

/**
 * Create a simple input modal
 */
const createInputModal = function createInputModal(message, type = 'text') {
    console.log('🔍 ADMIN: createInputModal called with:', { message, type });

    return new Promise(resolve => {
        const content = `
            <div class="space-y-4">
                <p class="text-gray-300">${message}</p>
                <input type="${type}" id="modal-input" class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter ${type === 'number' ? 'amount' : 'reason'}">
                <div class="flex justify-end space-x-2">
                    <button id="modal-cancel" class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors">Cancel</button>
                    <button id="modal-confirm" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">Confirm</button>
                </div>
            </div>
        `;

        console.log('🔍 ADMIN: Showing modal with content:', content);
        showModal('Input Required', content);

        // Wait for modal content to be rendered before adding event listeners
        const setupEventListeners = () => {
            const input = document.getElementById('modal-input');
            const cancelBtn = document.getElementById('modal-cancel');
            const confirmBtn = document.getElementById('modal-confirm');

            // Check if all elements exist
            if (!input || !cancelBtn || !confirmBtn) {
                console.log('🔍 ADMIN: Modal elements not ready, retrying...');
                setTimeout(setupEventListeners, 50);
                return;
            }

            console.log('🔍 ADMIN: All modal elements found, setting up event listeners');

            const cleanup = () => {
                hideModal();
                if (cancelBtn) {
                    cancelBtn.removeEventListener('click', handleCancel);
                }
                if (confirmBtn) {
                    confirmBtn.removeEventListener('click', handleConfirm);
                }
                if (input) {
                    input.removeEventListener('keydown', handleKeydown);
                }
            };

            const handleCancel = () => {
                console.log('🔍 ADMIN: Modal cancelled');
                cleanup();
                resolve(null);
            };

            const handleConfirm = () => {
                const value = input.value.trim();

                console.log('🔍 ADMIN: Modal confirmed with value:', value);
                if (value) {
                    cleanup();
                    const result = type === 'number' ? parseInt(value) || 0 : value;

                    console.log('🔍 ADMIN: Resolving with result:', result);
                    resolve(result);
                } else {
                    console.log('🔍 ADMIN: No value provided, not resolving');
                }
            };

            const handleKeydown = e => {
                if (e.key === 'Enter') {
                    handleConfirm();
                } else if (e.key === 'Escape') {
                    handleCancel();
                }
            };

            cancelBtn.addEventListener('click', handleCancel);
            confirmBtn.addEventListener('click', handleConfirm);
            input.addEventListener('keydown', handleKeydown);

            // Focus the input
            setTimeout(() => input.focus(), 100);
        };

        // Start setting up event listeners
        setupEventListeners();
    });
};

/**
 * Create a simple confirm modal
 */
const createConfirmModal = function createConfirmModal(message) {
    return new Promise(resolve => {
        const content = `
            <div class="space-y-4">
                <p class="text-gray-300">${message}</p>
                <div class="flex justify-end space-x-2">
                    <button id="modal-cancel" class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors">Cancel</button>
                    <button id="modal-confirm" class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">Confirm</button>
                </div>
            </div>
        `;

        showModal('Confirm Action', content);

        // Wait for modal content to be rendered before adding event listeners
        const setupEventListeners = () => {
            const cancelBtn = document.getElementById('modal-cancel');
            const confirmBtn = document.getElementById('modal-confirm');

            // Check if all elements exist
            if (!cancelBtn || !confirmBtn) {
                console.log('🔍 ADMIN: Modal elements not ready, retrying...');
                setTimeout(setupEventListeners, 50);
                return;
            }

            console.log('🔍 ADMIN: All modal elements found, setting up event listeners');

            const cleanup = () => {
                hideModal();
                if (cancelBtn) {
                    cancelBtn.removeEventListener('click', handleCancel);
                }
                if (confirmBtn) {
                    confirmBtn.removeEventListener('click', handleConfirm);
                }
            };

            const handleCancel = () => {
                cleanup();
                resolve(false);
            };

            const handleConfirm = () => {
                cleanup();
                resolve(true);
            };

            cancelBtn.addEventListener('click', handleCancel);
            confirmBtn.addEventListener('click', handleConfirm);
        };

        // Start setting up event listeners
        setupEventListeners();
    });
};

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
    checkAuth: checkAdminAuthentication,
    getFallbackUser: getFallbackUserInfo,
    debugAuth: async () => {
        console.log('🔍 ADMIN DEBUG: Starting authentication debug...');
        console.log('🔍 ADMIN DEBUG: userApi available:', !!window.userApi);
        console.log('🔍 ADMIN DEBUG: userApi.isAuthenticated():', window.userApi?.isAuthenticated());
        console.log('🔍 ADMIN DEBUG: Auth token:', window.userApi?.getAuthToken());
        console.log('🔍 ADMIN DEBUG: Fallback user:', getFallbackUserInfo());

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

// ===========================================
// PROMO CODES CUSTOM FUNCTIONS
// ===========================================

/**
 * Generate a random promo code
 */
window.generatePromoCode = function() {
    const prefixes = ['WELCOME', 'SAVE', 'BONUS', 'NEW', 'SPECIAL', 'VIP', 'EARLY', 'HOLIDAY'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const year = new Date().getFullYear();
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');

    const generatedCode = `${prefix}${year}${randomNum}`;

    // Find the code input field and set the value
    const codeInput = document.querySelector('input[name="code"]');

    if (codeInput) {
        codeInput.value = generatedCode;
        codeInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    return generatedCode;
};

/**
 * View promo code statistics
 */
window.viewPromoStats = function(promoId) {
    if (!promoId) {
        console.error('Promo ID required for stats view');

        return;
    }

    // Fetch and display promo stats in a modal
    fetch(`/api/admin/promo-codes/${promoId}/stats`, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`
        }
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayPromoStatsModal(data.data);
            } else {
                throw new Error(data.message || 'Failed to fetch stats');
            }
        })
        .catch(error => {
            console.error('Error fetching promo stats:', error);
            window.adminApp.showNotification('Failed to load promo code statistics', 'error');
        });
};

/**
 * Display promo stats in a modal
 */
const displayPromoStatsModal = stats => {
    const modalContent = `
        <div class="promo-stats-modal">
            <div class="stats-header">
                <h3><i class="fas fa-chart-bar"></i> Promo Code Statistics</h3>
                <div class="promo-info">
                    <code class="promo-code-large">${stats.promoCode.code}</code>
                    <span class="promo-status badge badge-${
    stats.promoCode.status === 'active'
        ? 'success'
        : 'warning'
}">
                        ${stats.promoCode.status}
                    </span>
                </div>
            </div>

            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${stats.statistics.totalRedemptions}</div>
                    <div class="stat-label">Total Redemptions</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.statistics.totalCreditsIssued}</div>
                    <div class="stat-label">Credits Issued</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.statistics.uniqueUsers}</div>
                    <div class="stat-label">Unique Users</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.statistics.averageCreditsPerUser}</div>
                    <div class="stat-label">Avg Credits/User</div>
                </div>
            </div>

            ${stats.recentRedemptions.length > 0
        ? `
                <div class="recent-redemptions">
                    <h4>Recent Redemptions</h4>
                    <div class="redemptions-list">
                        ${stats.recentRedemptions.map(redemption => `
                            <div class="redemption-item">
                                <div class="user-info">
                                    <strong>${redemption.user.email}</strong>
                                    <span class="credits">+${redemption.credits} credits</span>
                                </div>
                                <div class="redemption-date">
                                    ${new Date(redemption.createdAt).toLocaleString()}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `
        : ''
}
        </div>
    `;

    window.adminApp.showModal('Promo Code Statistics', modalContent);
};

/**
 * Edit promo code
 */
window.editPromoCode = function(promoId) {
    if (!promoId) {
        console.error('Promo ID required for edit');

        return;
    }

    // Fetch promo code data and open edit modal
    fetch(`/api/admin/promo-codes/${promoId}`, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`
        }
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Open edit form with existing data
                window.adminApp.openEditModal('promoCodes', data.data);
            } else {
                throw new Error(data.message || 'Failed to fetch promo code');
            }
        })
        .catch(error => {
            console.error('Error fetching promo code:', error);
            window.adminApp.showNotification('Failed to load promo code for editing', 'error');
        });
};

/**
 * Delete promo code with confirmation
 */
window.deletePromoCode = function(promoId, promoCode) {
    if (!promoId) {
        console.error('Promo ID required for deletion');

        return;
    }

    const confirmed = confirm(
        `Are you sure you want to delete promo code "${promoCode}"? This action cannot be undone.`
    );

    if (confirmed) {
        fetch(`/api/admin/promo-codes/${promoId}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${localStorage.getItem('authToken')}`,
                'Content-Type': 'application/json'
            }
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    window.adminApp.showNotification(
                        `Promo code "${promoCode}" deleted successfully`,
                        'success'
                    );
                    // Refresh the table
                    window.adminApp.refreshCurrentSection();
                } else {
                    throw new Error(data.message || 'Failed to delete promo code');
                }
            })
            .catch(error => {
                console.error('Error deleting promo code:', error);
                window.adminApp.showNotification('Failed to delete promo code', 'error');
            });
    }
};
