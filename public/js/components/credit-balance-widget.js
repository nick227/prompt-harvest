/**
 * Credit Balance Widget
 * Simple component to display user's credit balance in the header
 */
class CreditBalanceWidget {
    constructor(containerId = 'creditBalance') {
        this.containerId = containerId;
        this.balance = 0;
        this.isLoading = false;
        this.updateInterval = null;
        this.init();
    }

    init() {
        this.createWidget();

        // Only proceed if widget container was created successfully
        if (!document.getElementById(this.containerId)) {
            console.log('🔐 CREDIT-WIDGET: No container found, skipping initialization');
            return;
        }

        // Delay initialization to ensure server is ready
        setTimeout(() => {
            this.waitForAuthentication();
            this.setupAuthListener();
        }, 1000);
        // Refresh balance every 30 seconds (only when authenticated)
        this.updateInterval = setInterval(() => {
            if (window.userSystem && window.userSystem.isInitialized && window.userSystem.isAuthenticated()) {
                this.loadBalance();
            }
        }, 30000);
    }

    waitForAuthentication() {
        // Wait for user system to be available, initialized, and authenticated
        const checkAuth = () => {
            if (window.userSystem && window.userSystem.isInitialized) {
                if (window.userSystem.isAuthenticated()) {
                    console.log('🔐 CREDIT-WIDGET: User authenticated, loading balance');
                    this.loadBalance();
                } else {
                    console.log('🔐 CREDIT-WIDGET: User not authenticated, hiding widget');
                    this.hideWidget();
                }
            } else if (window.userSystem) {
                console.log('🔐 CREDIT-WIDGET: User system not initialized yet, waiting...');
                // Check again in 500ms
                setTimeout(checkAuth, 500);
            } else {
                // User system not available yet, wait
                setTimeout(checkAuth, 100);
            }
        };

        checkAuth();
    }

    setupAuthListener() {
        // Listen for authentication state changes
        if (window.userSystem) {
            window.userSystem.addAuthStateListener((authState) => {
                console.log('🔐 CREDIT-WIDGET: Auth state changed:', authState);
                if (authState && authState.isAuthenticated) {
                    this.loadBalance();
                } else {
                    this.hideWidget();
                }
            });
        }

        // Listen for promo code redemption events
        window.addEventListener('promoCodeRedeemed', (event) => {
            console.log('🎫 CREDIT-WIDGET: Promo code redeemed event received:', event.detail);
            // Small delay to ensure backend has processed the redemption
            setTimeout(() => {
                this.loadBalance();
            }, 500);
        });
    }

    createWidget() {
        const container = document.getElementById(this.containerId);

        if (!container) {
            console.warn(`Credit widget container #${this.containerId} not found`);

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
                        class="hidden px-2 py-1 text-xs bg-yellow-600 hover:bg-yellow-700
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

    async loadBalance(retryCount = 0) {
        if (this.isLoading) {
            return;
        }

        // Check if user system is initialized and user is authenticated before making API call
        if (!window.userSystem || !window.userSystem.isInitialized || !window.userSystem.isAuthenticated()) {
            console.log('🔐 CREDIT-WIDGET: User system not ready or user not authenticated, skipping balance load');
            this.hideWidget();
            return;
        }

        this.isLoading = true;
        const textElement = document.getElementById('creditBalanceText');

        try {
            // Use UnifiedCreditService for consistency
            if (window.UnifiedCreditService) {
                this.balance = await window.UnifiedCreditService.getBalance();
                this.updateDisplay();
                this.showWidget(); // Ensure widget is visible on successful load

                // Trigger custom event for other components
                window.dispatchEvent(new CustomEvent('creditBalanceUpdated', {
                    detail: { balance: this.balance }
                }));
            } else {
                // Fallback to direct API call
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

                // Get authentication headers
                const authHeaders = this.getAuthHeaders();

                const response = await fetch('/api/credits/balance', {
                    headers: authHeaders,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    if (response.status === 401) {
                        // User not authenticated, hide widget
                        this.hideWidget();

                        return;
                    }
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = await response.json();

                if (data.success) {
                    this.balance = data.balance;
                    this.updateDisplay();
                    this.showWidget(); // Ensure widget is visible on successful load

                    // Trigger custom event for other components
                    window.dispatchEvent(new CustomEvent('creditBalanceUpdated', {
                        detail: { balance: this.balance }
                    }));
                }
            }

        } catch (error) {
            console.warn('Credit balance fetch failed:', error);

            // Retry logic for network errors
            if (retryCount < 2 && (error.name === 'AbortError' || error.message.includes('fetch'))) {
                setTimeout(() => this.loadBalance(retryCount + 1), 2000 * (retryCount + 1));

                return;
            }

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
            // Show loading modal first
            this.createLoadingModal();

            // Get available packages using UnifiedCreditService
            const packages = window.UnifiedCreditService
                ? await window.UnifiedCreditService.getPackages()
                : await this.getPackagesFallback();

            // Remove loading modal and create full modal
            const loadingModal = document.getElementById('creditPurchaseModal');
            if (loadingModal) {
                loadingModal.remove();
            }

            // Create modal with both package selection and promo code redemption
            this.createPurchaseModal(packages);

        } catch (error) {
            console.error('Error loading purchase options:', error);

            // Remove loading modal
            const loadingModal = document.getElementById('creditPurchaseModal');
            if (loadingModal) {
                loadingModal.remove();
            }

            this.showError('Unable to load purchase options. Please try again.');
        }
    }

    createLoadingModal() {
        // Remove existing modal
        const existing = document.getElementById('creditPurchaseModal');

        if (existing) {
            existing.remove();
        }

        // Create loading modal
        const modal = document.createElement('div');

        modal.id = 'creditPurchaseModal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';

        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl max-w-md w-full mx-2 sm:mx-4">
                <div class="p-8 text-center">
                    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <h3 class="text-lg font-semibold text-gray-900 mb-2">Loading Packages</h3>
                    <p class="text-sm text-gray-600">Please wait while we load your credit options...</p>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    async getPackagesFallback() {
        const response = await fetch('/api/credits/packages');
        const data = await response.json();

        if (!data.success) {
            throw new Error('Failed to load packages');
        }

        return data.packages;
    }

    createPurchaseModal(packages) {
        // Remove existing modal
        const existing = document.getElementById('creditPurchaseModal');

        if (existing) {
            existing.remove();
        }

        // Create modal with promo code functionality
        const modal = document.createElement('div');

        modal.id = 'creditPurchaseModal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';

        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto mx-2 sm:mx-4">
                <!-- Modal Header -->
                <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
                    <div class="flex justify-between items-center">
                        <div>
                            <h2 class="text-xl font-bold text-gray-900">
                                <i class="fas fa-coins text-yellow-500 mr-2"></i>Get Credits
                            </h2>
                            <p class="text-sm text-gray-600 mt-1">Choose your credit package or redeem a promo code</p>
                        </div>
                        <button id="closePurchaseModal" class="text-gray-400 hover:text-gray-600 transition-colors">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                      d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                </div>

                <!-- Modal Content -->
                <div class="p-6">
                    <!-- Promo Code Section -->
                    <div class="mb-6">
                        <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                            <h3 class="text-sm font-semibold text-blue-900 mb-3">
                                <i class="fas fa-ticket-alt mr-1"></i>Redeem Promo Code
                            </h3>
                            <div class="flex gap-2">
                                <input
                                    type="text"
                                    id="headerPromoCodeInput"
                                    placeholder="Enter promo code (e.g., WELCOME5)"
                                    class="flex-1 px-3 py-2 border border-blue-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    maxlength="20"
                                >
                                <button
                                    id="headerRedeemPromoBtn"
                                    class="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-1"
                                >
                                    <i class="fas fa-ticket-alt"></i>
                                    Redeem
                                </button>
                            </div>
                            <div id="headerPromoMessage" class="mt-2 text-sm"></div>
                        </div>
                    </div>

                    <!-- Divider -->
                    <div class="flex items-center mb-6">
                        <div class="flex-1 border-t border-gray-200"></div>
                        <span class="px-3 text-xs text-gray-500 bg-white font-medium">OR</span>
                        <div class="flex-1 border-t border-gray-200"></div>
                    </div>

                    <!-- Credit Packages Section -->
                    <div>
                        <h3 class="text-sm font-semibold text-gray-900 mb-4">
                            <i class="fas fa-shopping-cart mr-1"></i>Choose Your Credit Package
                        </h3>

                        <!-- Package Grid -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            ${packages.map(pkg => `
                                <div class="package-card bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer ${pkg.popular ? 'ring-2 ring-blue-500 border-blue-500' : ''}"
                                     onclick="creditWidget.purchasePackage('${pkg.id}')">
                                    ${pkg.popular ? '<div class="absolute -top-1 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">Popular</div>' : ''}
                                    <div class="text-center">
                                        <div class="text-2xl font-bold text-gray-900 mb-1">${pkg.credits}</div>
                                        <div class="text-xs text-gray-500 mb-1">credits</div>
                                        <div class="text-sm font-semibold text-gray-900 mb-1">${pkg.name}</div>
                                        <div class="text-lg font-bold text-blue-600 mb-2">$${(pkg.price / 100).toFixed(2)}</div>
                                        <div class="text-xs text-gray-500 mb-3">${(pkg.price / 100 / pkg.credits).toFixed(3)}¢ per credit</div>

                                        <button class="w-full py-2 px-3 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors">
                                            Select Package
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Footer -->
                    <div class="mt-6 pt-4 border-t border-gray-200 text-center">
                        <div class="flex items-center justify-center gap-1 text-xs text-gray-500">
                            <i class="fas fa-shield-alt text-green-500"></i>
                            <span>Secure payment powered by Stripe</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add close handlers
        modal.addEventListener('click', e => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        document.getElementById('closePurchaseModal').addEventListener('click', () => {
            modal.remove();
        });

        // Add keyboard close handler (Escape key)
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);

        // Add promo code redemption handlers
        this.setupPromoCodeHandlers(modal);
    }

    setupPromoCodeHandlers(modal) {
        const promoCodeInput = modal.querySelector('#headerPromoCodeInput');
        const redeemPromoBtn = modal.querySelector('#headerRedeemPromoBtn');
        const promoMessage = modal.querySelector('#headerPromoMessage');

        if (!promoCodeInput || !redeemPromoBtn || !promoMessage) {
            return;
        }

        // Redeem button click handler
        redeemPromoBtn.addEventListener('click', async () => {
            await this.handleHeaderPromoRedeem(promoCodeInput, redeemPromoBtn, promoMessage);
        });

        // Enter key handler
        promoCodeInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                await this.handleHeaderPromoRedeem(promoCodeInput, redeemPromoBtn, promoMessage);
            }
        });

        // Clear message on input
        promoCodeInput.addEventListener('input', () => {
            this.clearPromoMessage(promoMessage);
        });
    }

    async handleHeaderPromoRedeem(input, button, messageEl) {
        const promoCode = input.value.trim();

        if (!promoCode) {
            this.showPromoMessage(messageEl, 'Please enter a promo code', 'error');
            return;
        }

        if (!window.UnifiedCreditService) {
            this.showPromoMessage(messageEl, 'Service unavailable. Please try again later.', 'error');
            return;
        }

        // Set loading state
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>Redeeming...';
        this.clearPromoMessage(messageEl);

        try {
            const result = await window.UnifiedCreditService.redeemPromoCode(promoCode);

            if (result.success) {
                this.showPromoMessage(messageEl,
                    `Success! ${result.credits} credits added to your account.`, 'success');

                // Clear input
                input.value = '';

                // Update balance display
                await this.loadBalance();

                // Dispatch event to notify billing page of promo code redemption
                window.dispatchEvent(new CustomEvent('promoCodeRedeemed', {
                    detail: {
                        timestamp: Date.now(),
                        source: 'header-widget',
                        credits: result.credits
                    }
                }));

                // Close modal after a short delay
                setTimeout(() => {
                    const modal = document.getElementById('creditPurchaseModal');
                    if (modal) {
                        modal.remove();
                    }
                }, 2000);
            } else {
                this.showPromoMessage(messageEl, result.error || 'Failed to redeem promo code', 'error');
            }
        } catch (error) {
            console.error('Promo code redemption error:', error);
            this.showPromoMessage(messageEl, 'Failed to redeem promo code. Please try again.', 'error');
        } finally {
            // Reset button state
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-ticket-alt"></i> Redeem';
        }
    }

    showPromoMessage(messageEl, message, type = 'info') {
        if (!messageEl) {
            return;
        }

        messageEl.textContent = message;
        messageEl.className = `mt-2 text-sm font-medium ${this.getPromoMessageClass(type)}`;
    }

    clearPromoMessage(messageEl) {
        if (!messageEl) {
            return;
        }
        messageEl.textContent = '';
        messageEl.className = 'mt-2 text-sm';
    }

    getPromoMessageClass(type) {
        switch (type) {
            case 'success':
                return 'text-green-600 bg-green-50 px-2 py-1 rounded border border-green-200';
            case 'error':
                return 'text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200';
            case 'info':
            default:
                return 'text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-200';
        }
    }

    async purchasePackage(packageId) {
        try {
            if (window.UnifiedCreditService) {
                await window.UnifiedCreditService.purchasePackage(packageId);
            } else {
                // Fallback to direct API call
                const response = await fetch('/api/credits/purchase', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        packageId,
                        successUrl: `${window.location.origin}/purchase-success.html`,
                        cancelUrl: window.location.href
                    })
                });

                const data = await response.json();

                if (data.success) {
                    // Redirect to Stripe Checkout
                    window.location.href = data.url;
                } else {
                    throw new Error(data.error || 'Purchase failed');
                }
            }
        } catch (error) {
            console.error('Purchase error:', error);
            this.showError('Purchase failed. Please try again.');
        }
    }


    // Refresh balance (call this after successful image generation)
    refresh() {
        this.loadBalance();
    }

    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }

    /**
     * Get authentication headers for API requests
     */
    getAuthHeaders() {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        // Add authentication token if available
        const token = this.getAuthToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return headers;
    }

    /**
     * Get authentication token from storage
     */
    getAuthToken() {
        return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
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

// Initialize widget when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.creditWidget = new CreditBalanceWidget();
    });
} else {
    window.creditWidget = new CreditBalanceWidget();
}
