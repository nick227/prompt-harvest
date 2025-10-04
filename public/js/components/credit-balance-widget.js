/**
 * Credit Balance Widget
 * Simple component to display user's credit balance in the header
 * Refactored to use unified services
 */
class CreditBalanceWidget {
    constructor(containerId = 'creditBalance') {
        this.containerId = containerId;
        this.balance = 0;
        this.isLoading = false;
        this.unsubscribe = null;
        this.init();
    }

    init() {
        this.createWidget();

        // Only proceed if widget container was created successfully
        if (!document.getElementById(this.containerId)) {
            return;
        }

        // Wait for unified services to be available
        this.waitForServices();
    }

    async waitForServices() {
        const maxRetries = 20; // Increased from 10 to 20
        let retries = 0;

        while (retries < maxRetries) {
            if (window.UnifiedCreditService && window.UnifiedAuthUtils) {
                this.setupServices();

                return;
            }
            retries++;
            await new Promise(resolve => setTimeout(resolve, 150)); // Increased from 100ms to 150ms
        }

        this.setupFallback();
    }

    setupServices() {
        // Subscribe to credit updates
        this.unsubscribe = window.UnifiedCreditService.subscribe(data => {
            if (data.type === 'balance') {
                this.balance = data.balance;
                this.updateDisplay();
            }
        });

        // Listen for authentication state changes
        window.UnifiedAuthUtils.addAuthListener(isAuthenticated => {
            if (isAuthenticated) {
                this.loadBalance();
            } else {
                this.hideWidget();
            }
        });

        // Listen for promo code redemption events
        if (window.UnifiedEventService) {
            window.UnifiedEventService.onPromoRedeemed(() => {
                this.loadBalance();
            });
        } else {
            // Fallback to legacy event system
            window.addEventListener('promoCodeRedeemed', event => {
                console.log('🎫 CREDIT-WIDGET: Promo code redeemed event received:', event.detail);
                // Small delay to ensure backend has processed the redemption
                setTimeout(() => {
                    this.loadBalance();
                }, 500);
            });
        }

        // Initial load
        this.loadBalance();
    }

    setupFallback() {
        // Simplified fallback - just load balance directly
        this.loadBalance();

        // Listen for promo code redemption events
        window.addEventListener('promoCodeRedeemed', () => {
            // Small delay to ensure backend has processed the redemption
            setTimeout(() => {
                this.loadBalance();
            }, 500);
        });
    }

    createWidget() {
        const container = document.getElementById(this.containerId);

        if (!container) {
            return;
        }

        const coinIconPath1 = 'M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z';

        const coinIconPath2 = 'M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.51-1.31c-.562-.649-1.413-1.076-2.353-1.253V5z';

        container.innerHTML = `
            <div class="credit-balance-widget flex items-center space-x-2 text-sm">
                <svg class="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="${coinIconPath1}"/>
                    <path fill-rule="evenodd" d="${coinIconPath2}" clip-rule="evenodd"/>
                </svg>
                <span id="creditBalanceText" class="font-medium text-white">
                    <span class="animate-pulse">Loading...</span>
                </span>
                <button id="buyCreditsBtn"
                        class="add-credits-btn hidden px-2 py-1 text-xs bg-yellow-600 hover:bg-yellow-700
                               text-white rounded transition-colors">
                    Buy Credits
                </button>
            </div>
        `;

        // Add buy credits click handler
        const buyBtn = document.getElementById('buyCreditsBtn');

        if (buyBtn) {
            buyBtn.addEventListener('click', () => this.showPurchaseOptions());
        }
    }

    async loadBalance(forceRefresh = false) {
        if (this.isLoading) {
            return;
        }

        // Check if user is authenticated
        if (window.UnifiedAuthUtils) {
            if (!window.UnifiedAuthUtils.isAuthenticated()) {
                this.hideWidget();

                return;
            }
        } else {
            // Fallback: check for auth token in localStorage and sessionStorage
            const localToken = localStorage.getItem('authToken');
            const sessionToken = sessionStorage.getItem('authToken');
            const token = localToken || sessionToken;

            if (!token) {
                this.hideWidget();

                return;
            }
        }

        this.isLoading = true;
        const textElement = document.getElementById('creditBalanceText');

        try {
            // Use UnifiedCreditService for consistency
            if (window.UnifiedCreditService) {
                this.balance = await window.UnifiedCreditService.getBalance(forceRefresh);
                this.updateDisplay();
                this.showWidget(); // Ensure widget is visible on successful load
            } else {
                // Fallback to direct API call
                await this.loadBalanceFallback();
            }

        } catch (error) {
            console.error('Credit balance fetch failed:', error);

            if (textElement) {
                const isOffline = !navigator.onLine;

                textElement.innerHTML = isOffline
                    ? '<span class="text-yellow-400">Offline</span>'
                    : '<span class="text-gray-400">Credits unavailable</span>';
            }
        } finally {
            this.isLoading = false;
        }
    }

    async loadBalanceFallback() {
        try {
            // Direct API call to get credit balance
            const headers = this.getAuthHeaders();
            const response = await fetch('/api/credits/balance', {
                method: 'GET',
                headers
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            this.balance = data.balance || 0;
            this.updateDisplay();
            this.showWidget();

        } catch (error) {
            console.error('Credit balance fallback failed:', error);
            this.showErrorState();
        }
    }

    updateDisplay() {
        const textElement = document.getElementById('creditBalanceText');
        const buyBtn = document.getElementById('buyCreditsBtn');

        if (!textElement) {
            return;
        }

        // Update balance text with color coding
        let balanceClass;

        if (this.balance === 0) {
            balanceClass = 'text-red-400';
        } else if (this.balance < 5) {
            balanceClass = 'text-yellow-400';
        } else {
            balanceClass = 'text-green-400';
        }

        textElement.innerHTML = `
            <span class="${balanceClass}">
                ${this.balance} ${this.balance === 1 ? 'credit' : 'credits'}
            </span>
        `;

        // Show buy button if low credits
        if (buyBtn) {
            if (this.balance < 5) {
                buyBtn.classList.remove('hidden');
            } else {
                buyBtn.classList.add('hidden');
            }
        }
    }

    hideWidget() {
        const container = document.getElementById(this.containerId);

        if (container) {
            container.style.display = 'none';
        }

        // Also hide header buy credits button
        const headerContainer = document.getElementById('buy-credits-header');

        if (headerContainer) {
            headerContainer.classList.add('hidden');
        }
    }

    showWidget() {
        const container = document.getElementById(this.containerId);

        if (container) {
            container.style.display = 'block';
        }

        // Also show header buy credits button for authenticated users
        const headerContainer = document.getElementById('buy-credits-header');

        if (headerContainer) {
            headerContainer.classList.remove('hidden');
        }
    }

    async showPurchaseOptions() {
        try {
            // Use the shared credit purchase modal
            if (window.CreditPurchaseModal) {
                const modal = new window.CreditPurchaseModal();

                await modal.show({
                    showPromoCode: true,
                    onSuccess: () => {
                        // Refresh balance after successful purchase/promo redemption
                        this.loadBalance(true);
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
            console.error('Error showing purchase options:', error);
            this.showError('Unable to load purchase options. Please try again.');
        }
    }


    // Refresh balance (call this after successful image generation)
    refresh() {
        this.loadBalance();
    }

    destroy() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }

    /**
     * Get authentication headers for API requests (delegated to UnifiedAuthUtils)
     */
    getAuthHeaders() {
        if (window.UnifiedAuthUtils) {
            return window.UnifiedAuthUtils.getAuthHeaders();
        }

        // Fallback: try to get auth token from localStorage and sessionStorage
        const localToken = localStorage.getItem('authToken');
        const sessionToken = sessionStorage.getItem('authToken');
        const token = localToken || sessionToken;
        const headers = {
            'Content-Type': 'application/json',
            Accept: 'application/json'
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return headers;
    }

    showErrorState() {
        const textElement = document.getElementById('creditBalanceText');

        if (textElement) {
            textElement.innerHTML = '<span class="text-red-400">Error</span>';
        }
    }

    showError(message) {
        // Create a simple error display
        const errorDiv = document.createElement('div');

        errorDiv.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded shadow-lg z-50';
        errorDiv.textContent = message;

        document.body.appendChild(errorDiv);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }
}

// Export the class for use by other components
window.CreditBalanceWidget = CreditBalanceWidget;
