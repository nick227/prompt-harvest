/**
 * Shared Credit Purchase Modal Utility
 * Reusable modal for purchasing credit packages
 * Used by both CreditBalanceWidget and TransactionStatsComponent
 */

class CreditPurchaseModal {
    constructor() {
        this.modalId = 'credit-purchase-modal';
    }

    /**
     * Create and show the credit purchase modal
     * @param {Object} options - Configuration options
     * @param {Function} options.onSuccess - Callback when purchase is successful
     * @param {Function} options.onCancel - Callback when modal is cancelled
     * @param {boolean} options.showPromoCode - Whether to show promo code section
     */
    async show(options = {}) {
        const {
            onSuccess = () => {},
            onCancel = () => {},
            showPromoCode = false
        } = options;

        // Remove existing modal if present
        this.removeExistingModal();

        // Create modal with loading state
        const modal = this.createModalElement(showPromoCode);

        document.body.appendChild(modal);

        try {
            // Load packages and setup event listeners
            await this.loadPackagesIntoModal(modal);
            this.setupModalEventListeners(modal, { onSuccess, onCancel });
        } catch (error) {
            console.error('❌ CREDIT-MODAL: Error loading packages:', error);
            this.showPackageLoadError(modal);
        }

        return modal;
    }

    /**
     * Remove existing modal if present
     */
    removeExistingModal() {
        const existingModal = document.getElementById(this.modalId);

        if (existingModal) {
            existingModal.remove();
        }
    }

    /**
     * Create the modal HTML element
     * @param {boolean} showPromoCode - Whether to include promo code section
     * @returns {HTMLElement} The modal element
     */
    createModalElement(showPromoCode = false) {
        const modal = document.createElement('div');

        modal.id = this.modalId;
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';

        const promoCodeSection = showPromoCode ? this.createPromoCodeSection() : '';

        modal.innerHTML = `
            <div class="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold text-white">Add Credits</h3>
                    <button id="closeCreditModal" class="close-modal text-gray-400 hover:text-white">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="space-y-4">
                    <p class="text-gray-300 text-sm">Choose a credit package to purchase:</p>
                    ${promoCodeSection}
                    <div id="packages-container" class="space-y-2">
                        <div class="text-center py-8">
                            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                            <p class="text-gray-400 mt-2">Loading packages...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        return modal;
    }

    /**
     * Create promo code section HTML
     * @returns {string} HTML for promo code section
     */
    createPromoCodeSection() {
        return `
            <!-- Promo Code Section -->
            <div class="bg-gray-700 rounded-lg p-3 border border-gray-600">
                <div class="flex gap-2">
                    <input
                        type="text"
                        id="promoCodeInput"
                        placeholder="Enter promo code"
                        class="flex-1 px-3 py-2 bg-gray-600 border border-gray-500 rounded text-sm text-white
                               placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500
                               focus:border-transparent"
                        maxlength="20"
                    >
                    <button
                        id="redeemPromoBtn"
                        class="px-3 py-2 bg-blue-600 text-white rounded text-sm font-medium
                               hover:bg-blue-700 transition-colors flex items-center gap-1"
                    >
                        <i class="fas fa-ticket-alt"></i>
                        Redeem
                    </button>
                </div>
                <div id="promoMessage" class="mt-2 text-sm"></div>
            </div>
        `;
    }


    /**
     * Load packages from API into modal
     * @param {HTMLElement} modal - The modal element
     */
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
                packagesContainer.innerHTML = '<div class="text-center py-8 text-gray-400 col-span-full">No packages available</div>';

                return;
            }

            // Sort packages by sortOrder
            packages.sort((a, b) => a.sortOrder - b.sortOrder);

            // Generate package buttons (simple style like original)
            const packagesHTML = packages.map(pkg => `
                <div class="package-btn w-full text-left p-3 border border-gray-600 rounded
                               hover:border-blue-500 hover:bg-gray-700"
                        data-package-id="${pkg.id}">
                    <div class="flex justify-between items-center">
                        <div>
                            <div class="text-white font-medium">${pkg.displayName}</div>
                            <div class="text-gray-400 text-sm">${pkg.credits} credits</div>
                            ${pkg.description ? `<div class="text-gray-500 text-xs mt-1">${pkg.description}</div>` : ''}
                        </div>
                        <div class="text-right">
                            <div class="text-white font-semibold">$${(pkg.price / 100).toFixed(2)}</div>
                            ${pkg.isPopular ? '<div class="text-yellow-400 text-xs">Popular</div>' : ''}
                        </div>
                    </div>
                </div>
            `).join('');

            packagesContainer.innerHTML = packagesHTML;

        } catch (error) {
            console.error('❌ CREDIT-MODAL: Error loading packages:', error);
            throw error;
        }
    }

    /**
     * Show error when packages fail to load
     * @param {HTMLElement} modal - The modal element
     */
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

    /**
     * Setup modal event listeners
     * @param {HTMLElement} modal - The modal element
     * @param {Object} callbacks - Callback functions
     */
    setupModalEventListeners(modal, { onSuccess, onCancel }) {
        let selectedPackage = null;

        // Package selection
        modal.addEventListener('click', e => {
            const packageBtn = e.target.closest('.package-btn');

            if (packageBtn) {
                // Remove previous selection
                modal.querySelectorAll('.package-btn').forEach(btn => {
                    btn.classList.remove('border-blue-500', 'bg-gray-700');
                });

                // Add selection to clicked button
                packageBtn.classList.add('border-blue-500', 'bg-gray-700');
                selectedPackage = packageBtn.dataset.packageId;

                // Auto-purchase the selected package
                setTimeout(() => {
                    this.initiatePurchase(selectedPackage, onSuccess);
                    modal.remove();
                }, 300);
            }
        });

        // Close button
        const closeBtn = modal.querySelector('#closeCreditModal');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.remove();
                onCancel();
            });
        }

        // Close on backdrop click
        modal.addEventListener('click', e => {
            if (e.target === modal) {
                modal.remove();
                onCancel();
            }
        });

        // Keyboard close handler (Escape key)
        const handleEscape = e => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', handleEscape);
                onCancel();
            }
        };

        document.addEventListener('keydown', handleEscape);

        // Setup promo code handlers if promo code section exists
        const promoInput = modal.querySelector('#promoCodeInput');

        if (promoInput) {
            this.setupPromoCodeHandlers(modal, onSuccess);
        }
    }

    /**
     * Setup promo code redemption handlers
     * @param {HTMLElement} modal - The modal element
     * @param {Function} onSuccess - Success callback
     */
    setupPromoCodeHandlers(modal, onSuccess) {
        const promoCodeInput = modal.querySelector('#promoCodeInput');
        const redeemPromoBtn = modal.querySelector('#redeemPromoBtn');
        const promoMessage = modal.querySelector('#promoMessage');

        if (!promoCodeInput || !redeemPromoBtn || !promoMessage) {
            return;
        }

        // Redeem button click handler
        redeemPromoBtn.addEventListener('click', async () => {
            await this.handlePromoRedeem(promoCodeInput, redeemPromoBtn, promoMessage, modal, onSuccess);
        });

        // Enter key handler
        promoCodeInput.addEventListener('keypress', async e => {
            if (e.key === 'Enter') {
                await this.handlePromoRedeem(promoCodeInput, redeemPromoBtn, promoMessage, modal, onSuccess);
            }
        });

        // Clear message on input
        promoCodeInput.addEventListener('input', () => {
            this.clearPromoMessage(promoMessage);
        });
    }

    /**
     * Handle promo code redemption
     * @param {HTMLElement} input - Promo code input element
     * @param {HTMLElement} button - Redeem button element
     * @param {HTMLElement} messageEl - Message display element
     * @param {HTMLElement} modal - Modal element
     * @param {Function} onSuccess - Success callback
     */
    // eslint-disable-next-line max-params, max-statements
    async handlePromoRedeem(input, button, messageEl, modal, onSuccess) {
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

                // Close modal after a short delay
                setTimeout(() => {
                    modal.remove();
                    onSuccess();
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
     * Show promo code message
     * @param {HTMLElement} messageEl - Message element
     * @param {string} message - Message text
     * @param {string} type - Message type (success, error, info)
     */
    showPromoMessage(messageEl, message, type = 'info') {
        if (!messageEl) {
            return;
        }

        messageEl.textContent = message;
        messageEl.className = `mt-2 text-sm font-medium ${this.getPromoMessageClass(type)}`;
    }

    /**
     * Clear promo code message
     * @param {HTMLElement} messageEl - Message element
     */
    clearPromoMessage(messageEl) {
        if (!messageEl) {
            return;
        }
        messageEl.textContent = '';
        messageEl.className = 'mt-2 text-sm';
    }

    /**
     * Get CSS class for promo message type
     * @param {string} type - Message type
     * @returns {string} CSS class
     */
    getPromoMessageClass(type) {
        switch (type) {
            case 'success':
                return 'text-green-400 bg-green-900 px-2 py-1 rounded border border-green-600';
            case 'error':
                return 'text-red-400 bg-red-900 px-2 py-1 rounded border border-red-600';
            case 'info':
            default:
                return 'text-blue-400 bg-blue-900 px-2 py-1 rounded border border-blue-600';
        }
    }

    /**
     * Initiate purchase process
     * @param {string} packageId - Package ID to purchase
     * @param {Function} onSuccess - Success callback
     */
    async initiatePurchase(packageId, onSuccess) {
        try {
            // Check if user is authenticated
            if (!window.UnifiedAuthUtils || !window.UnifiedAuthUtils.isAuthenticated()) {
                window.location.href = '/login.html';

                return;
            }

            // Use UnifiedCreditService if available
            if (window.UnifiedCreditService) {
                const result = await window.UnifiedCreditService.purchasePackage(packageId);

                if (result.url) {
                    window.location.href = result.url;
                    onSuccess();
                }
            } else {
                // Fallback to direct API call
                const response = await fetch('/api/credits/purchase', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...window.UnifiedAuthUtils?.getAuthHeaders()
                    },
                    body: JSON.stringify({
                        packageId,
                        successUrl: `${window.location.origin}/purchase-success.html`,
                        cancelUrl: window.location.href
                    })
                });

                const data = await response.json();

                if (data.success && data.url) {
                    window.location.href = data.url;
                    onSuccess();
                } else {
                    throw new Error(data.error || 'Purchase failed');
                }
            }
        } catch (error) {
            console.error('❌ CREDIT-MODAL: Error initiating purchase:', error);
            // eslint-disable-next-line no-alert
            alert(`Error initiating purchase: ${error.message}`);
        }
    }
}

// Export the class for use by other components
window.CreditPurchaseModal = CreditPurchaseModal;
