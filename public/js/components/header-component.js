// Header Component - Reusable header for AutoImage
class HeaderComponent {
    constructor() {
        this.lastAuthState = null;
        this.init();
    }

    init() {
        // Wait for body to be available
        if (!document.body) {
            setTimeout(() => this.init(), 10);

            return;
        }

        try {
            this.createHeader();
            this.setupUserSystemIntegration();
        } catch (error) {
            console.error('Error initializing header component:', error);
        }
    }

    createHeader() {
        // Remove existing header if present
        const existingHeader = document.querySelector('header');

        if (existingHeader) {
            existingHeader.remove();
        }

        // Create new header
        const header = document.createElement('header');
        const headerClass = window.location.pathname.includes('admin.html') ? 'px-12' : 'max-w-[1080px] mx-auto magic-container';


        // Check if this is the billing page and apply fixed positioning
        const isBillingPage = window.location.pathname.includes('billing.html');

        header.className = isBillingPage
            ? 'bg-gray-900 border-b border-gray-700 fixed top-0 left-0 right-0 z-50'
            : 'bg-gray-900 border-b border-gray-700 mb-2';

        if (isBillingPage) {
            header.style.height = 'var(--top-bar-height)';
        }
        header.innerHTML = `
            <div class="${headerClass}">
                ${this.getFontHtml()}
                <div class="flex justify-between items-center py-4 header-container">
                    <!-- Left Section: Logo and Title -->
                    <div class="flex items-center space-x-3 group logo-container">
                        <a href="/" class="flex items-center space-x-3 group">
                            <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg
                                         flex items-center justify-center shadow-lg group-hover:shadow-xl
                                         transition-all duration-300">
                                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor"
                                     viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div>
                                <h1 class="logo-main-text">
                                    AutoImage
                                </h1>
                                <p class="text-xs text-gray-400 -mt-1">AI Image Generation</p>
                            </div>
                        </a>
                    </div>

                    <!-- Auth Links, Stats, and Additional Links -->
                    <div class="flex items-center sub-header-container mt-2">
                    <div class="flex flex-row gap-2">
                        <span id="creditBalance" class="text-sm">
                            <!-- Credit balance widget will be loaded here -->
                        </span>
                        <span id="transaction-stats" class="text-sm">
                            <!-- Transaction stats will be loaded here -->
                        </span>
                    </div>
                        <div id="buy-credits-header" class="hidden">
                            <!-- Buy Credits button will be loaded here for authenticated users -->
                        </div>
                        <div id="auth-links" class="flex items-center gap-4">
                            <a href="/login.html"
                               class="text-gray-300 hover:text-blue-400 transition-colors duration-200 bg-gray-700 px-3 py-1 rounded-lg">
                                Login
                            </a>
                            <a href="/register.html"
                               class="text-gray-300 hover:text-blue-400 transition-colors duration-200 bg-gray-700 px-3 py-1 rounded-lg">
                                Register
                            </a>
                        </div>
                        <div id="user-info" class="hidden flex items-center space-x-4">
                            <a href="/billing.html"><span class="text-sm text-gray-300"></span></a>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Insert header at the beginning of the body
        document.body.insertBefore(header, document.body.firstChild);

        // Initialize components after header is created with a small delay
        // to ensure all component classes are loaded
        setTimeout(() => {
            this.initializeComponents();
        }, 50);
    }

    getFontHtml() {
        return `
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Ubuntu:ital,wght@0,300;0,400;0,500;0,700;1,300;1,400;1,500;1,700&display=swap" rel="stylesheet">
        `;
    }

    initializeComponents() {
        // Initialize credit balance widget (only if available)
        if (window.CreditBalanceWidget) {
            try {
                const creditContainer = document.getElementById('creditBalance');

                if (creditContainer) {
                    window.creditWidget = new window.CreditBalanceWidget('creditBalance');
                }
            } catch (error) {
                console.warn('⚠️ HEADER: Failed to initialize credit balance widget:', error);
            }
        }

        // Initialize transaction stats component (only if available)
        if (window.TransactionStatsComponent) {
            try {
                const statsContainer = document.getElementById('transaction-stats');

                if (statsContainer) {
                    window.transactionStatsComponent = new window.TransactionStatsComponent('transaction-stats');
                }
            } catch (error) {
                console.warn('⚠️ HEADER: Failed to initialize transaction stats component:', error);
            }
        }
    }

    setupUserSystemIntegration() {
        // Wait for user system to be available (check both userSystem and authService)
        const checkUserSystem = () => {

            if (window.userSystem || window.authService) {
                this.updateHeaderForUser();
                this.setupEventListeners();
                // Prevent user system from creating duplicate auth containers
                this.preventDuplicateAuthContainers();

                // Force another update after a short delay to ensure auth state is settled
                setTimeout(() => {
                    this.updateHeaderForUser();
                }, 500);

            } else {
                setTimeout(checkUserSystem, 100);
            }
        };

        checkUserSystem();

        // Also set up a periodic check as a fallback
        setTimeout(() => {
            this.updateHeaderForUser();
        }, 2000);
    }

    preventDuplicateAuthContainers() {
        // Remove any existing auth containers that the user system might create
        const existingAuthContainers = document.querySelectorAll('.auth-container, .user-display');

        existingAuthContainers.forEach(container => {
            if (container.parentNode) {
                container.parentNode.removeChild(container);
            }
        });

        // Legacy user system UI override is no longer needed
    }

    getAuthState() {
        // Check both userSystem and authService
        const authSystem = window.userSystem || window.authService;

        if (!authSystem) {

            return null;
        }

        const isAuthenticated = authSystem.isAuthenticated();
        const user = authSystem.getUser ? authSystem.getUser() : authSystem.currentUser;

        // Additional check: if we have a token but auth system says not authenticated,
        // try to force a re-check
        const hasToken = localStorage.getItem('authToken');

        if (hasToken && !isAuthenticated) {
            // Try to trigger auth state refresh
            if (authSystem.checkAuthState) {
                authSystem.checkAuthState();
            }
            // Wait a bit and try again
            setTimeout(() => this.updateHeaderForUser(), 500);

            return null;
        }

        return { isAuthenticated, user };
    }

    updateHeaderForUser() {

        const authState = this.getAuthState();

        if (!authState) { return; }

        const { isAuthenticated, user } = authState;

        if (!this.shouldUpdateHeader(isAuthenticated, user?.email)) { return; }

        this.lastAuthState = { isAuthenticated, userEmail: user?.email };

        if (isAuthenticated && user) {
            this.showAuthenticatedUser(user);
        } else {
            this.showUnauthenticatedUser();
        }
    }

    shouldUpdateHeader(isAuthenticated, userEmail) {
        const currentState = { isAuthenticated, userEmail };

        if (this.lastAuthState &&
            this.lastAuthState.isAuthenticated === currentState.isAuthenticated &&
            this.lastAuthState.userEmail === currentState.userEmail) {
            return false; // No change, skip update
        }

        return true;
    }

    showAuthenticatedUser(user) {

        this.toggleAuthElements(false);
        this.updateUserInfo(user);
        this.addAdminLinkIfNeeded(user);
    }

    showUnauthenticatedUser() {

        this.toggleAuthElements(true);
        this.removeAdminLink();
    }

    toggleAuthElements(showAuthLinks) {
        const authLinks = document.getElementById('auth-links');
        const userInfo = document.getElementById('user-info');

        if (authLinks) {
            authLinks.style.display = showAuthLinks ? 'flex' : 'none';
            showAuthLinks ? authLinks.classList.remove('hidden') : authLinks.classList.add('hidden');
        }

        if (userInfo) {
            userInfo.style.display = showAuthLinks ? 'none' : 'flex';
            showAuthLinks ? userInfo.classList.add('hidden') : userInfo.classList.remove('hidden');
        }
    }

    updateUserInfo(user) {
        const userInfo = document.getElementById('user-info');
        const userElement = userInfo?.querySelector('span');

        if (userElement) {
            userElement.innerHTML = user.picture
                ? `
                <img src="${user.picture}" alt="User Picture" class="w-8 h-8 rounded-full">
            `
                : `
                <span>${user.username}</span>
            `;
        }
    }

    addAdminLinkIfNeeded(user) {
        // Check if user is admin
        const isAdmin = user?.isAdmin === true;

        // Check if admin link already exists
        const existingAdminLink = document.querySelector('.admin-link');
        const hasAdminLink = existingAdminLink !== null;

        // Only update if there's a change needed
        if (isAdmin && !hasAdminLink) {

            // Find the user-info container
            const userInfo = document.getElementById('user-info');

            if (userInfo) {
                // Create admin link
                const adminLink = document.createElement('a');

                adminLink.href = '/admin.html';
                adminLink.className = 'admin-link text-gray-300 hover:text-yellow-400 transition-colors duration-200 flex items-center space-x-1';
                adminLink.innerHTML = `
                    <i class="fas fa-cog"></i>
                `;
                adminLink.title = 'Admin Dashboard';

                // Insert admin link before the logout button
                const logoutBtn = userInfo.querySelector('.logout-btn');

                if (logoutBtn) {
                    userInfo.insertBefore(adminLink, logoutBtn);
                } else {
                    userInfo.appendChild(adminLink);
                }
            }
        } else if (!isAdmin && hasAdminLink) {
            this.removeAdminLink();
        }
    }

    removeAdminLink() {
        const existingAdminLink = document.querySelector('.admin-link');

        if (existingAdminLink) {
            existingAdminLink.remove();
        }
    }

    setupEventListeners() {
        // Listen for logout clicks
        document.addEventListener('click', e => {
            if (e.target.matches('.logout-btn')) {
                e.preventDefault();
                this.handleLogout();
            }
        });

        // Listen for authentication state changes
        window.addEventListener('authStateChanged', () => {
            this.updateHeaderForUser();
        });

        // Listen for user system updates with proper error handling
        const authSystem = window.userSystem || window.authService;

        if (authSystem) {
            if (authSystem.setUser) {
                const originalSetUser = authSystem.setUser.bind(authSystem);

                authSystem.setUser = user => {
                    originalSetUser(user);
                    // Small delay to ensure user system state is fully updated
                    setTimeout(() => this.updateHeaderForUser(), 10);
                };
            }

            // Also listen for auth state changes from AuthService
            if (authSystem.addEventListener) {
                authSystem.addEventListener('authStateChanged', () => {
                    this.updateHeaderForUser();
                });
            }
        }

        // Add a fallback check for authentication state changes
        // This ensures the header stays in sync even if events are missed
        setInterval(() => {
            const authSystem = window.userSystem || window.authService;

            if (authSystem) {
                const currentAuthState = authSystem.isAuthenticated();
                const currentUser = authSystem.getUser ? authSystem.getUser() : authSystem.currentUser;

                // Only update if there's a meaningful change
                if (this.lastKnownAuthState !== currentAuthState ||
                    this.lastKnownUser !== (currentUser?.email || null)) {
                    this.lastKnownAuthState = currentAuthState;
                    this.lastKnownUser = currentUser?.email || null;
                    this.updateHeaderForUser();
                }
            }
        }, 30000); // Check every 30 seconds as fallback (reduced frequency)
    }

    async handleLogout() {
        try {
            const authSystem = window.userSystem || window.authService;

            if (authSystem) {
                if (authSystem.logout) {
                    await authSystem.logout();
                } else if (authSystem.logoutUser) {
                    await authSystem.logoutUser();
                }
                this.updateHeaderForUser();
            }
        } catch (error) {
            console.error('Error during logout:', error);
        }
    }

    // Public method to force header update (can be called externally)
    forceUpdate() {
        this.updateHeaderForUser();
    }
}

// Initialize header component immediately
const headerComponent = new HeaderComponent();

window.headerComponent = headerComponent;

// Also try to initialize after a delay to catch any timing issues
setTimeout(() => {
    if (!window.headerComponent) {
        window.headerComponent = new HeaderComponent();
    }
}, 1000);
