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

        const { generationCount } = this.stats;

        this.container.innerHTML = `
            <div class="flex items-center space-x-3 text-sm">
                <div class="flex items-center space-x-1">
                    <i class="fas fa-images text-blue-400"></i>
                    <span class="text-gray-300">${generationCount}</span>
                </div>
                <button
                id="add-credits-btn"
                        class="add-credits-btn bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs transition-colors duration-200"
                        title="Add Credits">
                    <i class="fas fa-plus"></i>
                </button>
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
            // Create a simple modal for package selection
            await this.createSimpleCreditModal();
        } catch (error) {
            console.error('❌ STATS-COMPONENT: Error opening credit purchase:', error);
            // Fallback to billing page
            window.location.href = '/billing.html';
        }
    }

    // Create a simple credit purchase modal with dynamic packages
    async createSimpleCreditModal() {
        // Remove existing modal if present
        const existingModal = document.getElementById('credit-purchase-modal');

        if (existingModal) {
            existingModal.remove();
        }

        // Create modal with loading state
        const modal = document.createElement('div');

        modal.id = 'credit-purchase-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold text-white">Add Credits</h3>
                    <button class="close-modal text-gray-400 hover:text-white">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="space-y-4">
                    <p class="text-gray-300 text-sm">Choose a credit package to purchase:</p>
                    <div id="packages-container" class="space-y-2">
                        <div class="text-center py-8">
                            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                            <p class="text-gray-400 mt-2">Loading packages...</p>
                        </div>
                    </div>
                    <div class="flex space-x-3 pt-4">
                        <button class="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors"
                                id="purchase-btn" disabled>
                            Purchase
                        </button>
                        <button class="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded transition-colors"
                                id="cancel-btn">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add modal to page
        document.body.appendChild(modal);

        // Load packages and setup event listeners
        try {
            await this.loadPackagesIntoModal(modal);
            this.setupModalEventListeners(modal);
        } catch (error) {
            console.error('❌ STATS-COMPONENT: Error loading packages:', error);
            this.showPackageLoadError(modal);
        }
    }

    // Load packages from API into modal
    async loadPackagesIntoModal(modal) {
        try {
            const response = await fetch('/api/packages');
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to load packages');
            }

            const { packages } = data.data;
            const packagesContainer = modal.querySelector('#packages-container');

            if (!packages || packages.length === 0) {
                packagesContainer.innerHTML = '<div class="text-center py-8 text-gray-400">No packages available</div>';

                return;
            }

            // Sort packages by sortOrder
            packages.sort((a, b) => a.sortOrder - b.sortOrder);

            // Generate package buttons
            const packagesHTML = packages.map(pkg => `
                <button class="package-btn w-full text-left p-3 border border-gray-600 rounded hover:border-blue-500 hover:bg-gray-700 transition-colors"
                        data-package="${pkg.id}">
                    <div class="flex justify-between items-center">
                        <div>
                            <div class="text-white font-medium">${pkg.name}</div>
                            <div class="text-gray-400 text-sm">${pkg.credits} credits</div>
                            ${pkg.description ? `<div class="text-gray-500 text-xs mt-1">${pkg.description}</div>` : ''}
                        </div>
                        <div class="text-right">
                            <div class="text-green-400 font-semibold">$${(pkg.price / 100).toFixed(2)}</div>
                            ${pkg.popular ? '<div class="text-yellow-400 text-xs">Popular</div>' : ''}
                        </div>
                    </div>
                </button>
            `).join('');

            packagesContainer.innerHTML = packagesHTML;

        } catch (error) {
            console.error('❌ STATS-COMPONENT: Error loading packages:', error);
            throw error;
        }
    }

    // Show error when packages fail to load
    showPackageLoadError(modal) {
        const packagesContainer = modal.querySelector('#packages-container');

        packagesContainer.innerHTML = `
            <div class="text-center py-8">
                <div class="text-red-400 mb-2">
                    <i class="fas fa-exclamation-triangle text-2xl"></i>
                </div>
                <p class="text-gray-400">Failed to load packages</p>
                <button class="mt-3 text-blue-400 hover:text-blue-300" onclick="location.reload()">
                    <i class="fas fa-refresh mr-1"></i>Retry
                </button>
            </div>
        `;
    }

    // Setup modal event listeners
    setupModalEventListeners(modal) {
        let selectedPackage = null;

        // Package selection
        modal.querySelectorAll('.package-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove previous selection
                modal.querySelectorAll('.package-btn').forEach(b => b.classList.remove('border-blue-500', 'bg-gray-700'));

                // Add selection to clicked button
                btn.classList.add('border-blue-500', 'bg-gray-700');
                selectedPackage = btn.dataset.package;

                // Enable purchase button
                const purchaseBtn = modal.querySelector('#purchase-btn');

                purchaseBtn.disabled = false;
            });
        });

        // Purchase button
        modal.querySelector('#purchase-btn').addEventListener('click', () => {
            if (selectedPackage) {
                this.initiatePurchase(selectedPackage);
                modal.remove();
            }
        });

        // Cancel button
        modal.querySelector('#cancel-btn').addEventListener('click', () => {
            modal.remove();
        });

        // Close button
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.remove();
        });

        // Close on backdrop click
        modal.addEventListener('click', e => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    // Initiate purchase process
    async initiatePurchase(packageId) {
        try {

            // Check if user is authenticated
            if (!window.UnifiedAuthUtils || !window.UnifiedAuthUtils.isAuthenticated()) {
                window.location.href = '/login.html';

                return;
            }

            // Show loading state
            this.showPurchaseLoading();

            // Create Stripe checkout session
            const response = await fetch('/api/credits/purchase', {
                method: 'POST',
                headers: window.UnifiedAuthUtils.getAuthHeaders(),
                body: JSON.stringify({
                    packageId,
                    successUrl: `${window.location.origin}/purchase-success.html`,
                    cancelUrl: window.location.href
                })
            });

            const data = await response.json();

            if (data.success && data.url) {
                // Redirect to Stripe checkout
                window.location.href = data.url;
            } else {
                throw new Error(data.error || 'Failed to create checkout session');
            }

        } catch (error) {
            console.error('❌ STATS-COMPONENT: Error initiating purchase:', error);
            this.hidePurchaseLoading();
            // eslint-disable-next-line no-alert
            alert(`Error initiating purchase: ${error.message}`);
        }
    }

    // Show loading state during purchase
    showPurchaseLoading() {
        const modal = document.getElementById('credit-purchase-modal');

        if (modal) {
            const purchaseBtn = modal.querySelector('#purchase-btn');

            if (purchaseBtn) {
                purchaseBtn.disabled = true;
                purchaseBtn.innerHTML = '<span class="loading-spinner"></span> Processing...';
            }
        }
    }

    // Hide loading state
    hidePurchaseLoading() {
        const modal = document.getElementById('credit-purchase-modal');

        if (modal) {
            const purchaseBtn = modal.querySelector('#purchase-btn');

            if (purchaseBtn) {
                purchaseBtn.disabled = false;
                purchaseBtn.textContent = 'Purchase';
            }
        }
    }
}

// Export the class for use by other components
window.TransactionStatsComponent = TransactionStatsComponent;
