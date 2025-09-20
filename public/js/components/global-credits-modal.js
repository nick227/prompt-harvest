/**
 * Global Credits Modal Component
 * Unified modal system for credit packages and promo code redemption across all pages
 * Uses the same beautiful design as the billing page
 */

class GlobalCreditsModal {
    constructor() {
        this.isOpen = false;
        this.modalId = 'globalCreditsModal';
        this.packages = [];
        this.isLoading = false;
    }

    /**
     * Show the global credits modal
     */
    async show() {
        if (this.isOpen) {
            return;
        }

        this.isOpen = true;
        await this.createModal();
        this.loadPackages();
    }

    /**
     * Hide the global credits modal
     */
    hide() {
        const modal = document.getElementById(this.modalId);
        if (modal) {
            modal.remove();
        }
        this.isOpen = false;
    }

    /**
     * Create the modal HTML structure
     */
    async createModal() {
        // Remove existing modal
        const existing = document.getElementById(this.modalId);
        if (existing) {
            existing.remove();
        }

        // Create modal
        const modal = document.createElement('div');
        modal.id = this.modalId;
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';

        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto mx-2 sm:mx-4">
                <!-- Modal Header -->
                <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
                    <div class="flex justify-between items-center">
                        <div>
                            <h2 class="text-2xl font-bold text-gray-900">
                                <i class="fas fa-coins text-yellow-500 mr-2"></i>Get Credits
                            </h2>
                            <p class="text-sm text-gray-600 mt-1">Choose your credit package or redeem a promo code</p>
                        </div>
                        <button id="closeGlobalCreditsModal" class="text-gray-400 hover:text-gray-600 transition-colors">
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
                    <div class="mb-8">
                        <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                            <h3 class="text-lg font-semibold text-blue-900 mb-4">
                                <i class="fas fa-ticket-alt mr-2"></i>Redeem Promo Code
                            </h3>
                            <div class="flex gap-3">
                                <input
                                    type="text"
                                    id="globalPromoCodeInput"
                                    placeholder="Enter promo code (e.g., WELCOME5)"
                                    class="flex-1 px-4 py-3 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    maxlength="20"
                                >
                                <button
                                    id="globalRedeemPromoBtn"
                                    class="px-6 py-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                                >
                                    <i class="fas fa-ticket-alt"></i>
                                    Redeem
                                </button>
                            </div>
                            <div id="globalPromoMessage" class="mt-3 text-sm"></div>
                        </div>
                    </div>

                    <!-- Divider -->
                    <div class="flex items-center mb-8">
                        <div class="flex-1 border-t border-gray-200"></div>
                        <span class="px-4 text-sm text-gray-500 bg-white font-medium">OR</span>
                        <div class="flex-1 border-t border-gray-200"></div>
                    </div>

                    <!-- Credit Packages Section -->
                    <div>
                        <h3 class="text-lg font-semibold text-gray-900 mb-4">
                            <i class="fas fa-shopping-cart mr-2"></i>Choose Your Credit Package
                        </h3>

                        <!-- Info Box -->
                        <div class="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
                            <h4 class="text-sm font-medium text-gray-900 mb-2">
                                <i class="fas fa-info-circle text-blue-500 mr-1"></i>How Credits Work
                            </h4>
                            <p class="text-sm text-gray-600">Each AI image generation uses credits based on the provider and settings. DALL-E 3 uses more credits than DALL-E 2, and multipliers increase credit usage. Credits never expire!</p>
                        </div>

                        <!-- Package Grid -->
                        <div id="globalPackagesGrid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <!-- Loading state -->
                            <div class="col-span-full text-center py-8">
                                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                <p class="text-sm text-gray-600">Loading packages...</p>
                            </div>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div class="mt-8 pt-6 border-t border-gray-200 text-center">
                        <div class="flex items-center justify-center gap-2 text-sm text-gray-500">
                            <i class="fas fa-shield-alt text-green-500"></i>
                            <span>Secure payment powered by Stripe</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add event listeners
        this.setupEventListeners(modal);
    }

    /**
     * Setup event listeners for the modal
     */
    setupEventListeners(modal) {
        // Close handlers
        modal.addEventListener('click', e => {
            if (e.target === modal) {
                this.hide();
            }
        });

        document.getElementById('closeGlobalCreditsModal').addEventListener('click', () => {
            this.hide();
        });

        // Keyboard close handler (Escape key)
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                this.hide();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);

        // Promo code handlers
        this.setupPromoCodeHandlers(modal);
    }

    /**
     * Setup promo code redemption handlers
     */
    setupPromoCodeHandlers(modal) {
        const promoCodeInput = modal.querySelector('#globalPromoCodeInput');
        const redeemPromoBtn = modal.querySelector('#globalRedeemPromoBtn');
        const promoMessage = modal.querySelector('#globalPromoMessage');

        if (!promoCodeInput || !redeemPromoBtn || !promoMessage) {
            return;
        }

        // Redeem button click handler
        redeemPromoBtn.addEventListener('click', async () => {
            await this.handlePromoRedeem(promoCodeInput, redeemPromoBtn, promoMessage);
        });

        // Enter key handler
        promoCodeInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                await this.handlePromoRedeem(promoCodeInput, redeemPromoBtn, promoMessage);
            }
        });

        // Clear message on input
        promoCodeInput.addEventListener('input', () => {
            this.clearPromoMessage(promoMessage);
        });
    }

    /**
     * Load credit packages
     */
    async loadPackages() {
        try {
            this.isLoading = true;

            // Use UnifiedCreditService if available, otherwise fallback to direct API
            if (window.UnifiedCreditService) {
                const result = await window.UnifiedCreditService.getPackages();
                this.packages = result.packages || result;
            } else {
                const response = await fetch('/api/credits/packages');
                const data = await response.json();

                if (!data.success) {
                    throw new Error('Failed to load packages');
                }

                this.packages = data.packages;
            }

            this.renderPackages();

        } catch (error) {
            console.error('Error loading packages:', error);
            this.showPackageError();
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Render credit packages
     */
    renderPackages() {
        const grid = document.getElementById('globalPackagesGrid');
        if (!grid || !this.packages.length) {
            return;
        }

        grid.innerHTML = this.packages.map(pkg => `
            <div class="package-card bg-white border border-gray-200 rounded-xl p-6 hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer relative ${pkg.popular ? 'ring-2 ring-blue-500 border-blue-500' : ''}"
                 onclick="globalCreditsModal.purchasePackage('${pkg.id}')">
                ${pkg.popular ? '<div class="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white text-xs px-3 py-1 rounded-full">Most Popular</div>' : ''}
                <div class="text-center">
                    <div class="text-3xl font-bold text-gray-900 mb-2">${pkg.credits}</div>
                    <div class="text-sm text-gray-500 mb-1">credits</div>
                    <div class="text-lg font-semibold text-gray-900 mb-2">${pkg.name}</div>
                    <div class="text-2xl font-bold text-blue-600 mb-2">$${(pkg.price / 100).toFixed(2)}</div>
                    <div class="text-xs text-gray-500 mb-4">${(pkg.price / 100 / pkg.credits).toFixed(3)}¢ per credit</div>

                    <ul class="text-xs text-gray-600 space-y-1 mb-4">
                        <li><i class="fas fa-check text-green-500 mr-1"></i>Never expires</li>
                        <li><i class="fas fa-check text-green-500 mr-1"></i>Works with all AI providers</li>
                        <li><i class="fas fa-check text-green-500 mr-1"></i>Instant activation</li>
                        ${pkg.popular ? '<li><i class="fas fa-check text-green-500 mr-1"></i>Most popular choice</li>' : ''}
                    </ul>

                    <button class="w-full py-2 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                        Select Package
                    </button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Show package loading error
     */
    showPackageError() {
        const grid = document.getElementById('globalPackagesGrid');
        if (!grid) {
            return;
        }

        grid.innerHTML = `
            <div class="col-span-full text-center py-8">
                <i class="fas fa-exclamation-triangle text-red-500 text-2xl mb-4"></i>
                <p class="text-sm text-red-600 mb-2">Failed to load packages</p>
                <button onclick="globalCreditsModal.loadPackages()"
                        class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
                    Try Again
                </button>
            </div>
        `;
    }

    /**
     * Handle promo code redemption
     */
    async handlePromoRedeem(input, button, messageEl) {
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
        button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Redeeming...';
        this.clearPromoMessage(messageEl);

        try {
            const result = await window.UnifiedCreditService.redeemPromoCode(promoCode);

            if (result.success) {
                this.showPromoMessage(messageEl,
                    `Success! ${result.credits} credits added to your account.`, 'success');

                // Clear input
                input.value = '';

                // Update balance display if credit widget exists
                if (window.creditWidget) {
                    await window.creditWidget.loadBalance();
                }

                // Close modal after a short delay
                setTimeout(() => {
                    this.hide();
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

    /**
     * Purchase a credit package
     */
    async purchasePackage(packageId) {
        try {
            if (window.UnifiedCreditService) {
                await window.UnifiedCreditService.purchasePackage(packageId);
            } else {
                // Fallback to direct API call
                const response = await fetch('/api/credits/purchase', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.getAuthToken()}`
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

    /**
     * Show promo message
     */
    showPromoMessage(messageEl, message, type = 'info') {
        if (!messageEl) {
            return;
        }

        messageEl.textContent = message;
        messageEl.className = `mt-3 text-sm font-medium ${this.getPromoMessageClass(type)}`;
    }

    /**
     * Clear promo message
     */
    clearPromoMessage(messageEl) {
        if (!messageEl) {
            return;
        }
        messageEl.textContent = '';
        messageEl.className = 'mt-3 text-sm';
    }

    /**
     * Get promo message CSS class
     */
    getPromoMessageClass(type) {
        switch (type) {
            case 'success':
                return 'text-green-600 bg-green-50 px-3 py-2 rounded-lg border border-green-200';
            case 'error':
                return 'text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200';
            case 'info':
            default:
                return 'text-blue-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200';
        }
    }

    /**
     * Show error message
     */
    showError(message) {
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

    /**
     * Get authentication token
     */
    getAuthToken() {
        return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    }
}

// Create global instance
window.globalCreditsModal = new GlobalCreditsModal();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GlobalCreditsModal;
}
