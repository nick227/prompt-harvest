/**
 * Billing DOM Manager - Handles DOM manipulation and rendering
 */
/* global BILLING_CONSTANTS */

class BillingDOMManager {
    constructor() {
        this.config = BILLING_CONSTANTS;
        this.elements = {};
    }

    /**
     * Initialize and cache DOM elements
     */
    init() {
        this.cacheElements();
        this.validateCriticalElements();
    }

    /**
     * Cache frequently accessed DOM elements
     */
    cacheElements() {
        this.elements = {
            // Balance and usage elements
            currentCredits: document.querySelector(this.config.SELECTORS.CURRENT_CREDITS),
            totalImages: document.querySelector(this.config.SELECTORS.TOTAL_IMAGES),
            monthlyUsage: document.querySelector(this.config.SELECTORS.MONTHLY_USAGE),
            totalPurchased: document.querySelector(this.config.SELECTORS.TOTAL_PURCHASED),
            accountCreated: document.querySelector(this.config.SELECTORS.ACCOUNT_CREATED),

            // Package elements
            packagesGrid: document.querySelector(this.config.SELECTORS.PACKAGES_GRID),
            creditPackages: document.querySelector(this.config.SELECTORS.CREDIT_PACKAGES),

            // History elements
            paymentHistory: document.querySelector(this.config.SELECTORS.PAYMENT_HISTORY),
            imageHistory: document.querySelector(this.config.SELECTORS.IMAGE_HISTORY),

            // Message elements
            errorMessage: document.querySelector(this.config.SELECTORS.ERROR_MESSAGE),
            successMessage: document.querySelector(this.config.SELECTORS.SUCCESS_MESSAGE),
            usageSummary: document.querySelector(this.config.SELECTORS.USAGE_SUMMARY),

            // Promo code elements
            promoCodeInput: document.querySelector(this.config.SELECTORS.PROMO_CODE_INPUT),
            redeemPromoBtn: document.querySelector(this.config.SELECTORS.REDEEM_PROMO_BTN),
            promoMessage: document.querySelector(this.config.SELECTORS.PROMO_MESSAGE),

            // Action buttons
            addCreditsBtn: document.querySelector(this.config.SELECTORS.ADD_CREDITS_BTN)
        };
    }

    /**
     * Validate critical elements exist
     * @throws {Error} If critical elements are missing
     */
    validateCriticalElements() {
        const criticalElements = ['currentCredits', 'paymentHistory'];
        const missing = criticalElements.filter(key => !this.elements[key]);

        if (missing.length > 0) {
            throw new Error(`${this.config.ERROR_MESSAGES.CRITICAL_ELEMENTS_MISSING} ${missing.join(', ')}`);
        }
    }

    /**
     * Update balance display
     * @param {number|string} balance - Balance to display
     */
    updateBalanceDisplay(balance) {
        if (this.elements.currentCredits) {
            if (typeof balance === 'number') {
                this.elements.currentCredits.textContent = balance.toLocaleString();
            } else {
                this.elements.currentCredits.textContent = balance;
            }
        }

        // Also update the header credit balance widget if it exists
        if (window.creditWidget && window.creditWidget.updateDisplay) {
            window.creditWidget.balance = balance;
            window.creditWidget.updateDisplay();
        }
    }

    /**
     * Update usage display
     * @param {Object} stats - Usage statistics
     */
    updateUsageDisplay(stats) {
        const updates = [
            { element: this.elements.totalImages, value: stats.totalImages || 0 },
            { element: this.elements.monthlyUsage, value: stats.monthlyCredits || 0 },
            { element: this.elements.totalPurchased, value: stats.totalCredits || 0 }
        ];

        // Batch DOM updates
        requestAnimationFrame(() => {
            updates.forEach(({ element, value }) => {
                if (element) {
                    element.textContent = value.toLocaleString();
                }
            });

            // Update account creation date
            if (this.elements.accountCreated && stats.user?.createdAt) {
                const date = new Date(stats.user.createdAt);

                this.elements.accountCreated.textContent = date.toLocaleDateString();
            }

            // Show the usage content and hide skeleton
            const usageContent = document.querySelector('#usage-content');
            const usageSummary = document.querySelector('#usage-summary .skeleton-card');

            if (usageContent && usageSummary) {
                usageSummary.style.display = 'none';
                usageContent.classList.remove('hidden');
            }
        });
    }

    /**
     * Show usage error state
     */
    showUsageError() {
        const errorElements = [
            this.elements.totalImages,
            this.elements.monthlyUsage,
            this.elements.totalPurchased,
            this.elements.accountCreated
        ];

        requestAnimationFrame(() => {
            errorElements.forEach(element => {
                if (element) {
                    element.textContent = '-';
                }
            });
        });
    }

    /**
     * Render credit packages
     * @param {Array} packages - Credit packages array
     */
    renderCreditPackages(packages) {
        if (!this.elements.packagesGrid || !packages.length) {
            return;
        }

        // Use document fragment for better performance
        const fragment = document.createDocumentFragment();

        packages.forEach(pkg => {
            const packageElement = this.createPackageElement(pkg);

            fragment.appendChild(packageElement);
        });

        // Single DOM update
        requestAnimationFrame(() => {
            this.elements.packagesGrid.innerHTML = '';
            this.elements.packagesGrid.appendChild(fragment);
        });
    }

    /**
     * Create package element
     * @param {Object} pkg - Package data
     * @returns {HTMLElement}
     */
    createPackageElement(pkg) {
        const div = document.createElement('div');

        div.className = `package-card ${pkg.popular ? 'popular' : ''}`;
        div.dataset.packageId = pkg.id;

        // Escape HTML to prevent XSS
        const escapeHtml = text => {
            const div = document.createElement('div');

            div.textContent = text;

            return div.innerHTML;
        };

        const features = [...this.config.PACKAGE_FEATURES];

        if (pkg.popular) {
            features.push('Most popular choice');
        }

        const featuresHtml = features.map(feature => `<li>${escapeHtml(feature)}</li>`
        ).join('');

        div.innerHTML = `
            <div class="package-credits">${escapeHtml(pkg.credits.toString())}</div>
            <div class="package-name">${escapeHtml(pkg.name)}</div>
            <div class="package-price">$${(pkg.price / 100).toFixed(2)}</div>
            <div class="package-value">${(pkg.price / 100 / pkg.credits).toFixed(3)}¢ per credit</div>
            <ul class="package-features">
                ${featuresHtml}
            </ul>
            <button class="select-package-btn" data-package-id="${escapeHtml(pkg.id)}">
                Select Package
            </button>
        `;

        return div;
    }

    /**
     * Show package loading state
     * @param {string} packageId - Package ID
     */
    showPackageLoading(packageId) {
        const packageElement = document.querySelector(`[data-package-id="${packageId}"]`);

        if (packageElement) {
            const button = packageElement.querySelector('.select-package-btn');

            if (button) {
                button.disabled = true;
                button.innerHTML = '<span class="loading-spinner"></span> Processing...';
            }
        }
    }

    /**
     * Hide package loading state
     * @param {string} packageId - Package ID
     */
    hidePackageLoading(packageId) {
        const packageElement = document.querySelector(`[data-package-id="${packageId}"]`);

        if (packageElement) {
            const button = packageElement.querySelector('.select-package-btn');

            if (button) {
                button.disabled = false;
                button.textContent = 'Select Package';
            }
        }
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        if (this.elements.errorMessage) {
            this.elements.errorMessage.textContent = message;
            this.elements.errorMessage.style.display = 'block';

            // Auto-hide after configured time
            setTimeout(() => {
                this.elements.errorMessage.style.display = 'none';
            }, this.config.ANIMATION.MESSAGE_AUTO_HIDE);
        }
    }

    /**
     * Show success message
     * @param {string} message - Success message
     */
    showSuccess(message) {
        if (this.elements.successMessage) {
            this.elements.successMessage.textContent = message;
            this.elements.successMessage.style.display = 'block';

            // Auto-hide after configured time
            setTimeout(() => {
                this.elements.successMessage.style.display = 'none';
            }, this.config.ANIMATION.MESSAGE_AUTO_HIDE);
        }
    }

    /**
     * Show promo message
     * @param {string} message - Promo message
     * @param {string} type - Message type (error, success, info, warning)
     */
    showPromoMessage(message, type = this.config.MESSAGE_TYPES.INFO) {
        if (this.elements.promoMessage) {
            this.elements.promoMessage.textContent = message;
            this.elements.promoMessage.className = `promo-message ${type}`;

            // Auto-hide after configured time for non-error messages
            if (type === this.config.MESSAGE_TYPES.SUCCESS || type === this.config.MESSAGE_TYPES.INFO) {
                setTimeout(() => {
                    this.clearPromoMessage();
                }, this.config.ANIMATION.MESSAGE_AUTO_HIDE);
            }
        }
    }

    /**
     * Clear promo message
     */
    clearPromoMessage() {
        if (this.elements.promoMessage) {
            this.elements.promoMessage.className = 'promo-message';
        }
    }

    /**
     * Set promo button loading state
     * @param {boolean} isLoading - Loading state
     */
    setPromoButtonLoading(isLoading) {
        if (this.elements.redeemPromoBtn) {
            if (isLoading) {
                this.elements.redeemPromoBtn.disabled = true;
                this.elements.redeemPromoBtn.innerHTML = '<span class="loading-spinner"></span> Redeeming...';
            } else {
                this.elements.redeemPromoBtn.disabled = false;
                this.elements.redeemPromoBtn.innerHTML = '<i class="fas fa-ticket-alt"></i> Redeem';
            }
        }
    }

    /**
     * Toggle credit packages visibility
     */
    toggleCreditPackages() {
        if (this.elements.creditPackages) {
            this.elements.creditPackages.classList.toggle(this.config.UI_STATES.HIDDEN);

            if (!this.elements.creditPackages.classList.contains(this.config.UI_STATES.HIDDEN)) {
                this.elements.creditPackages.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }
    }

    /**
     * Get element by key
     * @param {string} key - Element key
     * @returns {HTMLElement|null}
     */
    getElement(key) {
        return this.elements[key] || null;
    }

    /**
     * Get all cached elements
     * @returns {Object}
     */
    getElements() {
        return { ...this.elements };
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.BillingDOMManager = BillingDOMManager;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BillingDOMManager;
}

