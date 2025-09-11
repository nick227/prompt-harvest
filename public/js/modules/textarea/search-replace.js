// ============================================================================
// SEARCH AND REPLACE - Search and Replace Functionality
// ============================================================================

/**
 * Highlight search terms in text
 * @param {string} value - The text value
 * @param {string} searchTerm - Term to highlight
 * @returns {string} HTML with highlighted terms
 */
const highlightSearchTerms = (value, searchTerm) => {
    const regex = new RegExp(`(${window.TextUtils.escapeRegex(searchTerm)})`, 'gi');

    return value.replace(regex, '<mark>$1</mark>');
};

// ============================================================================
// SEARCH AND REPLACE MANAGER CLASS
// ============================================================================

class SearchReplaceManager {
    constructor(textArea) {
        this.textArea = textArea;
        this.originalValue = undefined;
    }

    /**
     * Setup search and replace functionality
     */
    setupSearchReplace() {
        const searchInput = Utils.dom.get(TEXTAREA_CONFIG.selectors.searchTerm);
        const replaceInput = Utils.dom.get(TEXTAREA_CONFIG.selectors.replaceTerm);
        const replaceButton = document.querySelector('.btn-replace');

        this.logSearchReplaceSetup(searchInput, replaceInput, replaceButton);

        if (searchInput && replaceInput) {
            this.bindSearchReplaceEvents(searchInput, replaceInput);
        }

        if (replaceButton) {
            replaceButton.addEventListener('click', this.performReplace.bind(this));
        }
    }

    /**
     * Log search replace setup
     * @param {HTMLElement} searchInput - Search input element
     * @param {HTMLElement} replaceInput - Replace input element
     * @param {HTMLElement} replaceButton - Replace button element
     */
    logSearchReplaceSetup(searchInput, replaceInput, replaceButton) {
        console.log('🔍 SEARCH REPLACE: Setting up search and replace', {
            searchInput: !!searchInput,
            replaceInput: !!replaceInput,
            replaceButton: !!replaceButton,
            searchSelector: TEXTAREA_CONFIG.selectors.searchTerm,
            replaceSelector: TEXTAREA_CONFIG.selectors.replaceTerm
        });
    }

    /**
     * Bind search replace events
     * @param {HTMLElement} searchInput - Search input element
     * @param {HTMLElement} replaceInput - Replace input element
     */
    bindSearchReplaceEvents(searchInput, replaceInput) {
        searchInput.addEventListener('input', this.handleSearchInput.bind(this));
        replaceInput.addEventListener('input', this.handleReplaceInput.bind(this));
        searchInput.addEventListener('keydown', this.handleSearchKeydown.bind(this));
        replaceInput.addEventListener('keydown', this.handleReplaceKeydown.bind(this));

        console.log('✅ SEARCH REPLACE: Event listeners attached successfully');
    }

    /**
     * Handle search input changes
     * @param {Event} e - Input event
     */
    handleSearchInput(e) {
        const searchTerm = e.target.value.trim();

        if (searchTerm) {
            this.highlightSearchTerm(searchTerm);
        } else {
            this.clearSearchHighlights();
        }
    }

    /**
     * Handle replace input changes
     * @param {Event} e - Input event
     */
    handleReplaceInput(e) {
        // Can be used for live preview or other functionality
        const _replaceTerm = e.target.value;
        // Implementation for live preview if needed
    }

    /**
     * Handle search input keydown events
     * @param {Event} e - Keydown event
     */
    handleSearchKeydown(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            this.performReplace();
        } else if (e.key === 'Escape') {
            this.clearSearchHighlights();
            e.target.value = '';
        }
    }

    /**
     * Handle replace input keydown events
     * @param {Event} e - Keydown event
     */
    handleReplaceKeydown(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            this.performReplace();
        }
    }

    /**
     * Highlight search terms in textarea
     * @param {string} searchTerm - Term to highlight
     */
    highlightSearchTerm(searchTerm) {
        if (!this.textArea || !searchTerm) {
            return;
        }

        const highlightedValue = highlightSearchTerms(this.textArea.value, searchTerm);

        this.originalValue = this.textArea.value;
        this.textArea.innerHTML = highlightedValue;
    }

    /**
     * Clear search highlights
     */
    clearSearchHighlights() {
        if (this.originalValue !== undefined && this.textArea) {
            this.textArea.value = this.originalValue;
            this.originalValue = undefined;
        }
    }

    /**
     * Perform search and replace
     */
    performReplace() {
        const searchInput = Utils.dom.get(TEXTAREA_CONFIG.selectors.searchTerm);
        const replaceInput = Utils.dom.get(TEXTAREA_CONFIG.selectors.replaceTerm);

        if (!searchInput || !replaceInput || !this.textArea) {
            return;
        }

        const searchTerm = searchInput.value.trim();
        const replaceTerm = replaceInput.value;

        if (!searchTerm) {
            return;
        }

        this.clearSearchHighlights();

        const { value, hasChanged } = window.TextUtils.replaceText(this.textArea.value, searchTerm, replaceTerm);

        if (hasChanged) {
            this.textArea.value = value;
            this.triggerInputEvent();
        }
    }

    /**
     * Trigger input event on textarea
     */
    triggerInputEvent() {
        if (this.textArea) {
            this.textArea.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }
}

// ============================================================================
// EXPORT TO GLOBAL SCOPE
// ============================================================================

// Make class available globally
window.SearchReplaceManager = SearchReplaceManager;
