/**
 * SearchUIManager
 * Handles UI display for search (indicators, messages, toasts)
 *
 * @class SearchUIManager
 */
class SearchUIManager {
    /**
     * @param {Object} uiComponents - SearchUIComponents instance
     * @param {Object} domCache - Cached DOM elements
     * @param {Function} escapeHTMLFn - Function to escape HTML
     * @param {Function} debugFn - Debug logging function
     */
    constructor(uiComponents, domCache, escapeHTMLFn, debugFn = null) {
        this.uiComponents = uiComponents;
        this.domCache = domCache;
        this.escapeHTML = escapeHTMLFn;
        this.isDebugEnabled = debugFn;

        // Toast spam prevention
        this._lastErrorToastTime = null;
        this._activeToast = null;
    }

    /**
     * Show search active indicator
     * @param {string} query - Search query
     * @param {Object} counts - Search counts
     * @param {string} currentFilter - Current filter
     */
    showSearchActiveIndicator(query, counts, currentFilter) {
        let indicator = document.querySelector('.search-active-indicator');

        if (!indicator) {
            indicator = this.uiComponents.createSearchIndicator();

            if (this.domCache.promptOutput?.parentElement) {
                this.domCache.promptOutput.parentElement.insertBefore(
                    indicator,
                    this.domCache.promptOutput
                );
            }
        }

        this.updateSearchIndicator(indicator, query, counts, currentFilter);
    }

    /**
     * Update search indicator
     * @param {HTMLElement} indicator - Indicator element
     * @param {string} query - Search query
     * @param {Object} counts - Search counts
     * @param {string} currentFilter - Current filter
     */
    updateSearchIndicator(indicator, query, counts, currentFilter) {
        if (this.isDebugEnabled?.()) {
            console.log('\n🔍 SEARCH INDICATOR UPDATE:');
            console.log('  Counts:', counts);
            console.log('  Filter:', currentFilter);
        }

        const countText = this.uiComponents.getCountText(currentFilter, counts);

        if (this.isDebugEnabled?.()) {
            console.log(`  Display Text: "${countText}"`);
        }

        this.uiComponents.buildIndicatorContent(indicator, query, countText);
    }

    /**
     * Update indicator counts only (called after filtering)
     * @param {string} currentSearchTerm - Current search term
     * @param {Object} counts - Search counts
     * @param {string} currentFilter - Current filter
     */
    updateSearchIndicatorCounts(currentSearchTerm, counts, currentFilter) {
        const indicator = document.querySelector('.search-active-indicator');

        if (indicator && currentSearchTerm) {
            this.updateSearchIndicator(indicator, currentSearchTerm, counts, currentFilter);
        }
    }

    /**
     * Hide search active indicator
     */
    hideSearchActiveIndicator() {
        const indicator = document.querySelector('.search-active-indicator');

        if (indicator) {
            indicator.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => indicator.remove(), 300);
        }
    }

    /**
     * Show search message
     * @param {string} type - Message type
     * @param {string} query - Search query
     * @param {boolean} clearContent - Whether to clear content
     * @param {Function} clearFeedFn - Function to clear feed
     */
    showSearchMessage(type, query, clearContent, clearFeedFn) {
        if (clearContent) {
            clearFeedFn();
        }

        if (!this.domCache.promptOutput) {
            return;
        }

        const config = this.uiComponents.getMessageConfig(type, query);
        const message = this.uiComponents.createMessageElement(config);

        if (clearContent) {
            this.domCache.promptOutput.appendChild(message);
        } else {
            // Non-blocking toast for errors
            this.showErrorToast(query);
        }
    }

    /**
     * Show non-blocking error toast with rate limiting (singleton)
     * @param {string} query - Search query that failed
     */
    showErrorToast(query) {
        const now = Date.now();
        const TOAST_RATE_LIMIT_MS = 5000;

        // Rate limit: prevent toast spam
        if (this._lastErrorToastTime && now - this._lastErrorToastTime < TOAST_RATE_LIMIT_MS) {
            if (this.isDebugEnabled?.()) {
                console.log('🔇 SEARCH: Toast rate-limited, skipping');
            }

            return;
        }

        this._lastErrorToastTime = now;

        // Remove existing toast if present (singleton)
        if (this._activeToast && this._activeToast.parentElement) {
            this._activeToast.remove();
        }

        const toast = document.createElement('div');

        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(239, 68, 68, 0.95);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            animation: fadeIn 0.3s ease;
        `;

        toast.innerHTML = `
            <strong>⚠️ Search Error</strong><br>
            <small>Unable to search for "${this.escapeHTML(query)}"</small>
        `;

        document.body.appendChild(toast);
        this._activeToast = toast;

        // Auto-remove after 3 seconds
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
                toast.remove();

                if (this._activeToast === toast) {
                    this._activeToast = null;
                }
            }, 300);
        }, 3000);
    }

    /**
     * Show no results message
     * @param {string} query - Search query
     * @param {Function} clearFeedFn - Function to clear feed
     */
    showNoResults(query, clearFeedFn) {
        this.showSearchMessage('noResults', query, true, clearFeedFn);
    }

    /**
     * Show search error (non-blocking toast)
     * @param {string} query - Search query
     */
    showSearchError(query) {
        this.showErrorToast(query);
    }

    /**
     * Show warning in indicator
     * @param {string} query - Search query
     */
    showWarningIndicator(query) {
        const indicator = document.querySelector('.search-active-indicator');

        if (indicator) {
            this.uiComponents.buildWarningIndicatorContent(indicator, query);
        }
    }

    /**
     * Cleanup
     */
    cleanup() {
        // Reset toast state
        this._lastErrorToastTime = null;

        if (this._activeToast && this._activeToast.parentElement) {
            this._activeToast.remove();
        }
        this._activeToast = null;
    }
}

// Export for use in SearchManager
window.SearchUIManager = SearchUIManager;

