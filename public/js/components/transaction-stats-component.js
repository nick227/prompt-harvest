// Transaction Stats Component - Shows user's generation stats and credits with real-time updates
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


    setupEventListeners() {
        // Subscribe to unified services
        this.subscribeToUnifiedServices();

        // Listen for authentication state changes
        if (window.UnifiedEventService) {
            window.UnifiedEventService.onAuthChange(isAuthenticated => {
                this.handleAuthStateChange(isAuthenticated);
            });

            // Listen for image generation completion to update credits in real-time
            window.UnifiedEventService.onImageGenerated(event => {
                this.handleImageGenerated(event);
            });

            // Listen for credit updates from other components
            window.UnifiedEventService.onCreditUpdate(event => {
                this.updateCredits(event.balance);
            });
        } else {
            // Fallback to legacy event system
            this.setupLegacyEventListeners();
        }
    }

    setupLegacyEventListeners() {
        // Listen for authentication state changes
        window.addEventListener('authStateChanged', event => {
            this.handleAuthStateChange(event.detail);
        });

        // Listen for image generation completion to update credits in real-time
        window.addEventListener('imageGenerated', event => {
            this.handleImageGenerated(event.detail);
        });

        // Listen for credit updates from other components
        window.addEventListener('creditsUpdated', event => {
            this.updateCredits(event.detail.creditBalance);
        });
    }

    subscribeToUnifiedServices() {
        // Subscribe to unified stats service
        if (window.UnifiedStatsService) {
            this.unsubscribeStats = window.UnifiedStatsService.subscribe(stats => {
                this.handleStatsUpdate(stats);
            });
        } else {
            // Fallback to legacy stats service
            this.subscribeToStatsService();
        }

        // Subscribe to unified credit service
        if (window.UnifiedCreditService) {
            this.unsubscribeCredits = window.UnifiedCreditService.subscribe(data => {
                if (data.type === 'balance') {
                    this.updateCredits(data.balance);
                }
            });
        }
    }

    subscribeToStatsService() {
        // Legacy stats service is no longer needed with unified services
        console.warn('⚠️ STATS-COMPONENT: Legacy stats service fallback is deprecated');
    }

    async checkAuthenticationAndLoadStats() {
        try {
            // Use unified stats service if available
            if (window.UnifiedStatsService) {
                const stats = await window.UnifiedStatsService.getStats();

                this.handleStatsUpdate(stats);
            } else {
                // Wait a bit for stats service to be available
                await this.waitForStatsService();
            }
        } catch (error) {
            console.error('❌ Error checking authentication state:', error);
            this.showErrorState();
        }
    }

    async waitForStatsService() {
        // Legacy method - now just fall back to direct API
        console.warn('⚠️ STATS: Legacy stats service not available, using direct API');
        await this.loadStatsDirectly();
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

    async handleAuthStateChange(isAuthenticated) {
        if (isAuthenticated) {
            // User logged in, get stats from service
            if (window.UnifiedStatsService) {
                const stats = await window.UnifiedStatsService.getStats();

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

        this.isLoading = true;
        this.showLoadingState();

        try {
            // Check if user is authenticated before making API call
            if (!window.UnifiedAuthUtils || !window.UnifiedAuthUtils.isAuthenticated()) {
                this.showNotAuthenticatedState();

                return;
            }

            // Fetch user stats
            const response = await fetch('/api/transactions/user/stats', {
                headers: window.UnifiedAuthUtils.getAuthHeaders()
            });

            const data = await response.json();

            if (data.success) {
                this.stats = data.data;
                this.handleStatsUpdate(this.stats);
            } else {
                console.error('❌ Failed to load stats:', data.error);
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
        if (window.UnifiedStatsService) {
            const stats = await window.UnifiedStatsService.getStats(true); // Force refresh

            this.handleStatsUpdate(stats);
        }
    }

    updateDisplay() {
        if (!this.container || !this.stats) {
            return;
        }

        // Ensure the container is visible when showing stats
        this.container.style.display = 'block';

        this.container.innerHTML = `
            <div class="flex items-center space-x-3 text-sm">
                <a
                id="add-credits-btn"
                        class="add-credits-btn link"
                        title="Add Credits">
                    <i class="fas fa-plus"></i>
                </a>
            </div>
        `;

        // Setup payment button event listener
        this.setupPaymentButton();
    }

    showLoadingState() {
        if (!this.container) {
            return;
        }

        // Ensure the container is visible when loading
        this.container.style.display = 'block';

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

        // Hide the stats container completely when not authenticated
        this.container.style.display = 'none';
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


    // Public method to get current stats
    getStats() {
        return this.stats;
    }

    // Public method to manually refresh stats
    refresh() {
        this.refreshStats();
    }

    // Public method to reload stats after image generation
    async reload() {
        try {
            if (window.UnifiedStatsService) {
                const stats = await window.UnifiedStatsService.getStats(true); // Force refresh

                this.handleStatsUpdate(stats);
            } else {
                await this.loadStatsDirectly();
            }
        } catch (error) {
            console.error('❌ Error reloading stats:', error);
        }
    }

    // Handle image generation completion
    async handleImageGenerated(_imageData) {
        // Reload stats to get updated credit balance
        await this.reload();
    }

    // Update only the credit balance in real-time (no longer needed - credit balance handled by CreditBalanceWidget)
    updateCredits(_newCreditBalance) {
        // Credit balance is now handled by the dedicated CreditBalanceWidget
        // This method is kept for backward compatibility but does nothing
    }

    // Setup payment button event listener
    setupPaymentButton() {
        const addCreditsBtn = this.container?.querySelector('.add-credits-btn');

        if (addCreditsBtn) {
            // Remove existing listeners to prevent duplicates
            addCreditsBtn.removeEventListener('click', this.handleAddCreditsClick);
            addCreditsBtn.addEventListener('click', this.handleAddCreditsClick.bind(this));
        }
    }

    // Handle add credits button click
    handleAddCreditsClick(event) {
        event.preventDefault();
        event.stopPropagation();
        this.openCreditPurchaseModal();
    }

    // Open credit purchase modal
    async openCreditPurchaseModal() {
        try {
            // Use the shared credit purchase modal
            if (window.CreditPurchaseModal) {
                const modal = new window.CreditPurchaseModal();

                await modal.show({
                    showPromoCode: true,
                    onSuccess: () => {
                        console.log('Credit purchase/promo redemption completed');
                    },
                    onCancel: () => {
                        console.log('Credit purchase cancelled');
                    }
                });
            } else {
                // Fallback to billing page if modal not available
                window.location.href = '/billing.html';
            }
        } catch (error) {
            console.error('❌ STATS-COMPONENT: Error opening credit purchase:', error);
            // Fallback to billing page
            window.location.href = '/billing.html';
        }
    }

}

// Export the class for use by other components
window.TransactionStatsComponent = TransactionStatsComponent;
