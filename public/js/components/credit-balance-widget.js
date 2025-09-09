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
        this.loadBalance();
        // Refresh balance every 30 seconds
        this.updateInterval = setInterval(() => this.loadBalance(), 30000);
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

        this.isLoading = true;
        const textElement = document.getElementById('creditBalanceText');

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

            const response = await fetch('/api/credits/balance', {
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
    }

    showWidget() {
        const container = document.getElementById(this.containerId);

        if (container) {
            container.style.display = 'block';
        }
    }

    async showPurchaseOptions() {
        try {
            // Get available packages
            const response = await fetch('/api/credits/packages');
            const data = await response.json();

            if (!data.success) {
                throw new Error('Failed to load packages');
            }

            // Create simple modal for package selection
            this.createPurchaseModal(data.packages);

        } catch (error) {
            console.error('Error loading purchase options:', error);
            this.showError('Unable to load purchase options. Please try again.');
        }
    }

    createPurchaseModal(packages) {
        // Remove existing modal
        const existing = document.getElementById('creditPurchaseModal');

        if (existing) {
            existing.remove();
        }

        // Create modal
        const modal = document.createElement('div');

        modal.id = 'creditPurchaseModal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';

        modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold text-gray-900">Buy Credits</h3>
                    <button id="closePurchaseModal" class="text-gray-400 hover:text-gray-600">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                  d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>

                <div class="space-y-3">
                    ${packages.map(pkg => `
                        <button onclick="creditWidget.purchasePackage('${pkg.id}')"
                                class="w-full p-3 border border-gray-300 rounded-lg hover:border-blue-500
                                       hover:bg-blue-50 text-left transition-colors">
                            <div class="flex justify-between items-center">
                                <div>
                                    <div class="font-medium text-gray-900">${pkg.name}</div>
                                    <div class="text-sm text-gray-500">${pkg.credits} credits</div>
                                </div>
                                <div class="text-lg font-semibold text-gray-900">
                                    $${(pkg.price / 100).toFixed(2)}
                                </div>
                            </div>
                        </button>
                    `).join('')}
                </div>

                <div class="mt-4 text-xs text-gray-500 text-center">
                    Secure payment powered by Stripe
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
    }

    async purchasePackage(packageId) {
        try {
            const response = await fetch('/api/credits/purchase', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    packageId,
                    successUrl: `${window.location.origin}/purchase-success`,
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
