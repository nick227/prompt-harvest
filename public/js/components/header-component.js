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
            this.setupEventListeners();
            console.log('Header component initialized successfully');
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

        header.className = 'bg-gray-900 border-b border-gray-700 shadow-lg mb-12';
        header.innerHTML = `
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center py-4">
                    <div class="flex items-center space-x-4">
                        <a href="/" class="flex items-center space-x-3 group">
                            <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div>
                                <h1 class="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                                    AutoImage
                                </h1>
                                <p class="text-xs text-gray-400 -mt-1">AI Image Generation</p>
                            </div>
                        </a>
                    </div>

                    <nav class="hidden md:flex items-center space-x-8">
                        <a href="/" class="text-gray-300 hover:text-blue-400 transition-colors duration-200 font-medium">
                            Generate
                        </a>
                        <a href="/terms.html" class="text-gray-300 hover:text-blue-400 transition-colors duration-200 font-medium">
                            Terms
                        </a>
                        <a href="/login.html" class="text-gray-300 hover:text-blue-400 transition-colors duration-200 font-medium">
                            Login
                        </a>
                    </nav>

                    <div class="flex items-center space-x-4">
                        <div id="authentication" class="text-sm">
                            <a href="/login.html" class="text-gray-300 hover:text-blue-400 transition-colors duration-200">
                                Login
                            </a>
                            <span class="text-gray-500 mx-2">/</span>
                            <a href="/register.html" class="text-gray-300 hover:text-blue-400 transition-colors duration-200">
                                Register
                            </a>
                        </div>

                        <!-- Mobile menu button -->
                        <button id="mobileMenuBtn" class="md:hidden text-gray-300 hover:text-blue-400 transition-colors duration-200">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                    </div>
                </div>

                <!-- Mobile menu -->
                <div id="mobileMenu" class="md:hidden hidden pb-4">
                    <div class="flex flex-col space-y-4">
                        <a href="/" class="text-gray-300 hover:text-blue-400 transition-colors duration-200 font-medium">
                            Generate
                        </a>
                        <a href="/terms.html" class="text-gray-300 hover:text-blue-400 transition-colors duration-200 font-medium">
                            Terms
                        </a>
                        <a href="/login.html" class="text-gray-300 hover:text-blue-400 transition-colors duration-200 font-medium">
                            Login
                        </a>
                    </div>
                </div>
            </div>
        `;

        // Insert header at the beginning of the body
        document.body.insertBefore(header, document.body.firstChild);
    }

    setupEventListeners() {
        // Mobile menu toggle
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const mobileMenu = document.getElementById('mobileMenu');

        if (mobileMenuBtn && mobileMenu) {
            mobileMenuBtn.addEventListener('click', () => {
                mobileMenu.classList.toggle('hidden');
            });
        }

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (mobileMenu && !mobileMenu.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
                mobileMenu.classList.add('hidden');
            }
        });
    }

    updateAuthentication(user) {
        const authContainer = document.getElementById('authentication');

        if (authContainer && user) {
            authContainer.innerHTML = `
                <span class="text-gray-300">Welcome, ${user.email}</span>
                <button onclick="logout()" class="ml-4 text-gray-300 hover:text-red-400 transition-colors duration-200">
                    Logout
                </button>
            `;
        }
    }
}

// Initialize header component
console.log('Header component script loaded');
const headerComponent = new HeaderComponent();

window.headerComponent = headerComponent;
