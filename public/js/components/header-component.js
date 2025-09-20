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

        // Check if this is the billing page and apply fixed positioning
        const isBillingPage = window.location.pathname.includes('billing.html');
        header.className = isBillingPage
            ? 'bg-gray-900 border-b border-gray-700 fixed top-0 left-0 right-0 z-50'
            : 'bg-gray-900 border-b border-gray-700 mb-2';

        if (isBillingPage) {
            header.style.height = 'var(--top-bar-height)';
        }
        header.innerHTML = `
            <div class="max-w-[1020px] mx-auto">
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
                                <h1 class="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400
                                          bg-clip-text text-transparent">
                                    AutoImage
                                </h1>
                                <p class="text-xs text-gray-400 -mt-1">AI Image Generation</p>
                            </div>
                        </a>
                    </div>

                    <!-- Right Section: Auth Links, Stats, and Additional Links -->
                    <div class="flex items-center space-x-6 sub-header-container">
                        <div id="creditBalance" class="text-sm">
                            <!-- Credit balance widget will be loaded here -->
                        </div>
                        <div id="transaction-stats" class="text-sm">
                            <!-- Transaction stats will be loaded here -->
                        </div>
                        <div id="buy-credits-header" class="hidden">
                            <!-- Buy Credits button will be loaded here for authenticated users -->
                        </div>
                        <div id="auth-links" class="flex items-center space-x-4">
                            <a href="/login.html"
                               class="text-gray-300 hover:text-blue-400 transition-colors duration-200">
                                Login
                            </a>
                            <a href="/register.html"
                               class="text-gray-300 hover:text-blue-400 transition-colors duration-200">
                                Register
                            </a>
                        </div>
                        <div id="user-info" class="hidden flex items-center space-x-4">
                            <a href="/billing.html"><span class="text-sm text-gray-300"></span></a>
                            <button class="logout-btn text-gray-300 hover:text-red-400
                                          transition-colors duration-200">
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Insert header at the beginning of the body
        document.body.insertBefore(header, document.body.firstChild);
    }

    setupUserSystemIntegration() {
        // Wait for user system to be available
        const checkUserSystem = () => {
            if (window.userSystem) {
                this.updateHeaderForUser();
                this.setupEventListeners();
                // Prevent user system from creating duplicate auth containers
                this.preventDuplicateAuthContainers();

            } else {
                setTimeout(checkUserSystem, 100);
            }
        };

        checkUserSystem();
    }

    preventDuplicateAuthContainers() {
        // Remove any existing auth containers that the user system might create
        const existingAuthContainers = document.querySelectorAll('.auth-container, .user-display');

        existingAuthContainers.forEach(container => {
            if (container.parentNode) {
                container.parentNode.removeChild(container);
            }
        });

        // Override the user system's UI creation methods to prevent conflicts
        if (window.userSystem && window.userSystem.setupUI) {
            const _originalSetupUI = window.userSystem.setupUI.bind(window.userSystem);

            window.userSystem.setupUI = () => {
                // Don't create new containers - we handle this in the header
                console.log('🔒 Header component: Preventing duplicate auth containers');
            };
        }
    }

    updateHeaderForUser() {
        if (!window.userSystem) {
            console.log('🔒 HEADER: userSystem not available');

            return;
        }

        const isAuthenticated = window.userSystem.isAuthenticated();
        const user = window.userSystem.getUser();

        // Check if state has actually changed to avoid unnecessary updates
        const currentState = { isAuthenticated, userEmail: user?.email };
        if (this.lastAuthState &&
            this.lastAuthState.isAuthenticated === currentState.isAuthenticated &&
            this.lastAuthState.userEmail === currentState.userEmail) {
            return; // No change, skip update
        }

        this.lastAuthState = currentState;

        console.log('🔒 HEADER: Authentication state:', { isAuthenticated, user: user?.email });

        const authLinks = document.getElementById('auth-links');
        const userInfo = document.getElementById('user-info');
        const userEmail = userInfo?.querySelector('span');

        if (isAuthenticated && user) {
            // User is logged in
            if (authLinks) {
                authLinks.style.display = 'none';
            }

            if (userInfo) {
                userInfo.style.display = 'flex';

                if (userEmail) {
                    userEmail.textContent = user.email || 'User';
                }

                // Add admin link if user is admin
                this.addAdminLinkIfNeeded(user);
            }
        } else {
            // User is not logged in
            if (authLinks) {
                authLinks.style.display = 'flex';
            }

            if (userInfo) {
                userInfo.style.display = 'none';
            }

            // Remove admin link when not authenticated
            this.removeAdminLink();
        }
    }

    addAdminLinkIfNeeded(user) {
        // Check if user is admin
        const isAdmin = user?.isAdmin === true;

        console.log('🔒 HEADER: Checking admin status:', {
            email: user?.email,
            isAdmin: isAdmin,
            userObject: user
        });

        // Check if admin link already exists
        const existingAdminLink = document.querySelector('.admin-link');
        const hasAdminLink = existingAdminLink !== null;

        // Only update if there's a change needed
        if (isAdmin && !hasAdminLink) {
            console.log('🔒 HEADER: User is admin - adding admin link');

            // Find the user-info container
            const userInfo = document.getElementById('user-info');
            if (userInfo) {
                // Create admin link
                const adminLink = document.createElement('a');
                adminLink.href = '/admin.html';
                adminLink.className = 'admin-link text-gray-300 hover:text-yellow-400 transition-colors duration-200 flex items-center space-x-1';
                adminLink.innerHTML = `
                    <i class="fas fa-cog"></i>
                    <span class="text-sm">Admin</span>
                `;
                adminLink.title = 'Admin Dashboard';

                // Insert admin link before the logout button
                const logoutBtn = userInfo.querySelector('.logout-btn');
                if (logoutBtn) {
                    userInfo.insertBefore(adminLink, logoutBtn);
                } else {
                    userInfo.appendChild(adminLink);
                }

                console.log('🔒 HEADER: Admin link added successfully');
            }
        } else if (!isAdmin && hasAdminLink) {
            console.log('🔒 HEADER: User is not admin - removing admin link');
            this.removeAdminLink();
        } else if (isAdmin && hasAdminLink) {
            console.log('🔒 HEADER: Admin link already exists - no change needed');
        } else {
            console.log('🔒 HEADER: User is not admin - no admin link needed');
        }
    }

    removeAdminLink() {
        const existingAdminLink = document.querySelector('.admin-link');
        if (existingAdminLink) {
            existingAdminLink.remove();
            console.log('🔒 HEADER: Admin link removed');
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
            console.log('🔒 HEADER: Auth state changed event received');
            this.updateHeaderForUser();
        });

        // Listen for user system updates with proper error handling
        if (window.userSystem) {
            const originalSetUser = window.userSystem.setUser.bind(window.userSystem);

            window.userSystem.setUser = user => {
                console.log('🔒 HEADER: User system setUser called with:', user?.email || 'null');
                originalSetUser(user);
                // Small delay to ensure user system state is fully updated
                setTimeout(() => this.updateHeaderForUser(), 10);
            };
        }

        // Add a fallback check for authentication state changes
        // This ensures the header stays in sync even if events are missed
        setInterval(() => {
            if (window.userSystem && window.userSystem.isInitialized) {
                const currentAuthState = window.userSystem.isAuthenticated();
                const currentUser = window.userSystem.getUser();

                // Only update if there's a meaningful change
                if (this.lastKnownAuthState !== currentAuthState ||
                    this.lastKnownUser !== (currentUser?.email || null)) {

                    console.log('🔒 HEADER: Fallback auth state check - updating header');
                    this.lastKnownAuthState = currentAuthState;
                    this.lastKnownUser = currentUser?.email || null;
                    this.updateHeaderForUser();
                }
            }
        }, 5000); // Check every 5 seconds as fallback
    }

    async handleLogout() {
        try {
            if (window.userSystem) {
                await window.userSystem.logout();
                this.updateHeaderForUser();
            }
        } catch (error) {
            console.error('Error during logout:', error);
        }
    }
}

// Initialize header component

const headerComponent = new HeaderComponent();

window.headerComponent = headerComponent;
