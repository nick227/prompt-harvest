// Transaction Stats Component - Shows user's generation stats and costs
class TransactionStatsComponent {
    constructor(containerId = 'transaction-stats') {
        this.containerId = containerId;
        this.container = null;
        this.stats = null;
        this.isLoading = false;
        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (!document.body) {
            setTimeout(() => this.init(), 10);

            return;
        }

        try {
            this.container = document.getElementById(this.containerId);
            if (!this.container) {
                console.warn(`⚠️ Transaction stats container #${this.containerId} not found`);

                return;
            }

            this.setupEventListeners();
            this.showLoadingState();

            // Wait for authentication to be ready
            setTimeout(() => {
                this.checkAuthenticationAndLoadStats();
            }, 100);

        } catch (error) {
            console.error('❌ Error initializing transaction stats component:', error);
        }
    }

    // Debug method to manually refresh stats
    manualRefresh() {
        console.log('📊 MANUAL REFRESH: Checking auth state and loading stats');
        this.checkAuthenticationAndLoadStats();
    }

    setupEventListeners() {
        // Subscribe to stats service updates with retry mechanism
        this.subscribeToStatsService();

        // Listen for authentication state changes
        window.addEventListener('authStateChanged', event => {
            this.handleAuthStateChange(event.detail);
        });
    }

    subscribeToStatsService() {
        if (window.statsService) {
            this.unsubscribe = window.statsService.subscribe(stats => {
                this.handleStatsUpdate(stats);
            });
        } else {
            // Retry after a short delay
            setTimeout(() => this.subscribeToStatsService(), 100);
        }
    }

    async checkAuthenticationAndLoadStats() {
        try {
            // Use stats service instead of direct API calls
            if (window.statsService) {
                const stats = await window.statsService.getStats();

                this.handleStatsUpdate(stats);
            } else {
                console.warn('⚠️ Stats service not available, falling back to direct API');
                await this.loadStatsDirectly();
            }
        } catch (error) {
            console.error('❌ Error checking authentication state:', error);
            this.showErrorState();
        }
    }

    // Handle stats updates from the stats service
    handleStatsUpdate(stats) {
        if (stats) {
            this.stats = stats;
            this.updateDisplay();
        } else {
            this.showNotAuthenticatedState();
        }
    }

    async handleAuthStateChange(_user) {
        if (_user) {
            // User logged in, get stats from service
            if (window.statsService) {
                const stats = await window.statsService.getStats();

                this.handleStatsUpdate(stats);
            }
        } else {
            // User logged out, clear stats
            this.showNotAuthenticatedState();
        }
    }

    async loadStatsDirectly() {
        if (this.isLoading) {
            return;
        }

        try {
            this.isLoading = true;
            this.showLoadingState();

            // Check if we have the API service available
            if (!window.apiService) {
                console.warn('⚠️ API service not available');
                this.showErrorState();

                return;
            }

            // Check if user is authenticated before making API call
            if (!window.userApi || !window.userApi.isAuthenticated()) {
                console.log('📊 STATS-COMPONENT: User not authenticated, showing not authenticated state');
                this.showNotAuthenticatedState();

                return;
            }

            // Fetch user stats
            const response = await window.apiService.get('/api/transactions/user/stats');

            if (response.success) {
                this.stats = response.data;
                this.updateDisplay();
            } else {
                console.error('❌ Failed to load stats:', response.error);
                this.showErrorState();
            }
        } catch (error) {
            console.error('❌ Error loading transaction stats:', error);
            this.showErrorState();
        } finally {
            this.isLoading = false;
        }
    }

    async refreshStats() {
        if (window.statsService) {
            const stats = await window.statsService.getStats(true); // Force refresh

            this.handleStatsUpdate(stats);
        }
    }

    updateDisplay() {
        if (!this.container || !this.stats) {
            return;
        }

        const { generationCount, totalCost } = this.stats;

        // Format the cost for display
        const formattedCost = this.formatCost(totalCost);

        this.container.innerHTML = `
            <div class="flex items-center space-x-3 text-sm">
                <div class="flex items-center space-x-1">
                    <i class="fas fa-images text-blue-400"></i>
                    <span class="text-gray-300">${generationCount}</span>
                </div>
                <div class="flex items-center space-x-1">
                    <i class="fas fa-dollar-sign text-green-400"></i>
                    <span class="text-gray-300">${formattedCost}</span>
                </div>
            </div>
        `;
    }

    showLoadingState() {
        if (!this.container) {
            return;
        }

        this.container.innerHTML = `
            <div class="flex items-center space-x-2 text-sm">
                <div class="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-400"></div>
                <span class="text-gray-400">Loading...</span>
            </div>
        `;
    }

    showNotAuthenticatedState() {
        if (!this.container) {
            return;
        }

        this.container.innerHTML = `
            <div class="flex items-center space-x-2 text-sm">
                <i class="fas fa-chart-bar text-gray-500"></i>
                <span class="text-gray-500">Stats</span>
            </div>
        `;
    }

    showErrorState() {
        if (!this.container) {
            return;
        }

        this.container.innerHTML = `
            <div class="flex items-center space-x-2 text-sm">
                <i class="fas fa-exclamation-triangle text-yellow-400"></i>
                <span class="text-gray-400">Error</span>
            </div>
        `;
    }

    formatCost(cost) {
        if (cost === 0) {
            return '$0.000';
        }

        // Format to 3 decimal places (fractions of a penny)
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 3,
            maximumFractionDigits: 3
        }).format(cost);
    }

    // Public method to get current stats
    getStats() {
        return this.stats;
    }

    // Public method to manually refresh stats
    refresh() {
        this.refreshStats();
    }
}

// Initialize transaction stats component

const transactionStatsComponent = new TransactionStatsComponent();

// Make it globally available
window.transactionStatsComponent = transactionStatsComponent;
