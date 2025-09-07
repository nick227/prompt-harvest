// Header Component - Reusable header for AutoImage
class HeaderComponent {
    constructor() {
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

        header.className = 'bg-gray-900 border-b border-gray-700 mb-8';
        header.innerHTML = `
            <div class="max-w-[1020px] mx-auto">
                <div class="flex justify-between items-center py-4">
                    <!-- Left Section: Logo and Title -->
                    <div class="flex items-center space-x-3 group">
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
                    <div class="flex items-center space-x-6">
                        <div id="transaction-stats" class="text-sm">
                            <!-- Transaction stats will be loaded here -->
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
                            <span class="text-sm text-gray-300"></span>
                            <button class="logout-btn text-gray-300 hover:text-red-400
                                          transition-colors duration-200">
                                Logout
                            </button>
                        </div>
                        <a href="/terms.html"
                           class="text-gray-300 hover:text-blue-400 transition-colors duration-200 font-medium">
                            <i class="fa-solid fa-book"></i>
                        </a>
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
            }
        } else {
            // User is not logged in
            if (authLinks) {
                authLinks.style.display = 'flex';
            }

            if (userInfo) {
                userInfo.style.display = 'none';
            }
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
        }, 2000); // Check every 2 seconds as fallback
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
