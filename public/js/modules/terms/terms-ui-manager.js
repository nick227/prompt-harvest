// Terms UI Manager - Handles UI interactions and state management

class TermsUIManager {
    constructor(domManager) {
        this.domManager = domManager;
        this.isInitialized = false;
        this.searchTimeout = null;
        this.messageTimeout = null;
        this.progressInterval = null;
        this.duplicateCheckTimeout = null;
        this.isProcessing = false;
    }

    // Initialize UI manager
    init() {
        if (this.isInitialized) {
            return;
        }

        this.domManager.init();
        this.setupEventListeners();
        this.isInitialized = true;
    }

    // Setup event listeners
    setupEventListeners() {
        this.setupFormEventListeners();
        this.setupSearchEventListeners();
        this.setupGlobalEventListeners();
    }

    // Setup form-related event listeners
    setupFormEventListeners() {
        const addButton = this.domManager.getElement('addButton');

        if (addButton) {
            addButton.addEventListener('click', e => {
                e.preventDefault();
                this.handleAddTerm();
            });
        }

        const termInput = this.domManager.getElement('termInput');

        if (termInput) {
            termInput.addEventListener('keypress', e => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleAddTerm();
                }
            });

            termInput.addEventListener('input', e => {
                this.handleTermInputChange(e.target.value);
            });

            termInput.addEventListener('keyup', e => {
                this.handleTermInputKeyup(e.target.value);
            });
        }
    }

    // Setup search-related event listeners
    setupSearchEventListeners() {
        const clearButton = this.domManager.getElement('clearButton');

        if (clearButton) {
            clearButton.addEventListener('click', e => {
                e.preventDefault();
                this.handleClearSearch();
            });
        }

        const searchInput = this.domManager.getElement('searchInput');

        if (searchInput) {
            searchInput.addEventListener('input', e => {
                this.handleSearchInputChange(e.target.value);
            });

            searchInput.addEventListener('focus', () => {
                this.handleSearchFocus();
            });

            searchInput.addEventListener('blur', () => {
                this.handleSearchBlur();
            });
        }

        const searchResults = this.domManager.getElement('searchResults');

        if (searchResults) {
            searchResults.addEventListener('click', e => {
                this.handleSearchResultsClick(e);
            });
        }
    }

    // Setup global event listeners
    setupGlobalEventListeners() {
        window.addEventListener('resize', () => {
            this.handleWindowResize();
        });

        document.addEventListener('keydown', e => {
            this.handleKeyboardShortcuts(e);
        });
    }

    // Handle add term
    handleAddTerm() {

        if (this.isProcessing) {

            return;
        }

        const termInput = this.domManager.getElement('termInput');


        if (!termInput) {
            console.error('❌ UI: Term input element not found');

            return;
        }

        const termWord = termInput.value.trim();


        if (!termWord) {
            this.showMessage(window.TERMS_CONSTANTS.MESSAGE_TYPES.ERROR, 'Please enter a term');

            return;
        }

        // Set processing state immediately
        this.isProcessing = true;
        this.setProcessingState(true);

        // Show immediate feedback
        this.showMessage('info', `Adding "${termWord}"...`, 0); // 0 = no auto-hide

        // Dispatch custom event
        this.dispatchEvent(window.TERMS_CONSTANTS.EVENTS.TERM_ADDED, { term: termWord });
    }

    // Handle term input change
    handleTermInputChange(value) {
        const addButton = this.domManager.getElement('addButton');

        if (!addButton) {
            return;
        }

        const trimmed = value.trim();

        if (trimmed.length > 0) {
            this.domManager.enableElement('addButton');
        } else {
            this.domManager.disableElement('addButton');
            this.clearDuplicateIndicator();
        }
    }

    // Handle term input keyup for duplicate checking
    handleTermInputKeyup(value) {

        const trimmed = value.trim();


        if (trimmed.length === 0) {

            this.clearDuplicateIndicator();

            return;
        }

        // Debounce the duplicate check
        if (this.duplicateCheckTimeout) {

            clearTimeout(this.duplicateCheckTimeout);
        }


        this.duplicateCheckTimeout = setTimeout(() => {

            this.checkForDuplicate(trimmed);
        }, 300); // 300ms delay after user stops typing
    }

    // Check if term already exists
    checkForDuplicate(termWord) {

        const existingTerms = this.getExistingTerms();


        const isDuplicate = existingTerms.some(term => {
            const existingWord = typeof term === 'string' ? term : term.word;

            const comparison = existingWord.toLowerCase() === termWord.toLowerCase();


            return comparison;
        });


        if (isDuplicate) {
            this.showDuplicateIndicator();
            this.domManager.disableElement('addButton');
        } else {
            this.clearDuplicateIndicator();
            this.domManager.enableElement('addButton');
        }
    }

    // Get existing terms from the DOM
    getExistingTerms() {

        const termsList = this.domManager.getElement('termsList');


        if (!termsList) {

            return [];
        }

        const termRows = termsList.querySelectorAll(`.${window.TERMS_CONSTANTS.CLASSES.TERM_ROW}`);


        const terms = Array.from(termRows).map(row => {
            // Get the term word from the .term-word element, not the dataset
            const termWordElement = row.querySelector('.term-word');
            const term = termWordElement ? termWordElement.textContent.trim() : null;


            return term;
        }).filter(term => term !== null); // Filter out any null values


        return terms;
    }

    // Show duplicate indicator
    showDuplicateIndicator() {

        const termInput = this.domManager.getElement('termInput');


        if (!termInput) {

            return;
        }

        // Remove existing indicator
        this.clearDuplicateIndicator();

        // Create and add indicator
        const indicator = document.createElement('div');

        indicator.className = 'duplicate-indicator';
        indicator.innerHTML = '<span class="text-red-500 text-sm">⚠️ Term already exists</span>';


        // Insert after the input
        termInput.parentNode.insertBefore(indicator, termInput.nextSibling);
    }

    // Clear duplicate indicator
    clearDuplicateIndicator() {

        const existingIndicator = document.querySelector('.duplicate-indicator');


        if (existingIndicator) {
            existingIndicator.remove();
        }
        // No indicator to remove
    }

    // Handle search input change
    handleSearchInputChange(value) {
        // Clear previous timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        const trimmed = value.trim();

        if (trimmed.length >= window.TERMS_CONSTANTS.SEARCH.MIN_SEARCH_LENGTH) {
            // Set searching state
            this.domManager.setSearching(true);

            // Debounce search
            this.searchTimeout = setTimeout(() => {
                this.performSearch(trimmed);
            }, window.TERMS_CONSTANTS.DEFAULTS.DEBOUNCE_DELAY);
        } else {
            this.domManager.setSearching(false);
            this.hideSearchResults();
        }
    }

    // Handle search focus
    handleSearchFocus() {
        const searchInput = this.domManager.getElement('searchInput');

        if (!searchInput) {
            return;
        }

        const value = searchInput.value.trim();

        if (value.length >= window.TERMS_CONSTANTS.SEARCH.MIN_SEARCH_LENGTH) {
            this.showSearchResults();
        }
    }

    // Handle search blur
    handleSearchBlur() {
        // Delay hiding to allow for clicks on search results
        setTimeout(() => {
            this.hideSearchResults();
        }, window.TERMS_CONSTANTS.SEARCH.DROPDOWN_DELAY);
    }

    // Handle clear search
    handleClearSearch() {
        const searchInput = this.domManager.getElement('searchInput');

        if (searchInput) {
            searchInput.value = '';
            this.domManager.setSearching(false);
            this.hideSearchResults();
            searchInput.focus();
        }
    }

    // Handle expand all
    handleExpandAll() {
        this.expandAllTerms();
    }

    // Handle collapse all
    handleCollapseAll() {
        this.collapseAllTerms();
    }

    // Handle search results click
    handleSearchResultsClick(e) {
        const target = e.target.closest('.search-result-item');

        if (target) {
            e.preventDefault();
            const termWord = target.dataset.term;

            if (termWord) {
                this.handleSelectSearchResult(termWord);
            }
        }
    }

    // Handle window resize
    handleWindowResize() {
        // Adjust UI elements if needed
        this.adjustUIForScreenSize();
    }

    // Handle keyboard shortcuts
    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + F: Focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            this.domManager.focusElement('searchInput');
        }

        // Ctrl/Cmd + N: Focus new term input
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            this.domManager.focusElement('termInput');
        }

        // Escape: Clear search
        if (e.key === 'Escape') {
            this.handleClearSearch();
        }
    }

    // Handle delete term
    handleDeleteTerm(termWord) {
        if (confirm(`Are you sure you want to delete "${termWord}"?`)) {
            this.dispatchEvent('termDeleted', { term: termWord });
        }
    }

    // Handle toggle term
    handleToggleTerm(button) {
        const row = button.closest(`.${window.TERMS_CONSTANTS.CLASSES.TERM_ROW}`);

        if (!row) {
            return;
        }

        const toggleText = row.querySelector(`.${window.TERMS_CONSTANTS.CLASSES.TOGGLE_TEXT}`);
        const toggleIcon = row.querySelector(`.${window.TERMS_CONSTANTS.CLASSES.TOGGLE_ICON}`);
        const relatedSection = row.querySelector(`.${window.TERMS_CONSTANTS.CLASSES.RELATED_TERMS_SECTION}`);

        if (relatedSection) {
            const isExpanded = !relatedSection.classList.contains(window.TERMS_CONSTANTS.CLASSES.HIDDEN);

            if (isExpanded) {
                this.collapseTerm(row, toggleText, toggleIcon, relatedSection);
            } else {
                this.expandTerm(row, toggleText, toggleIcon, relatedSection);
            }
        }
    }

    // Handle select search result
    handleSelectSearchResult(termWord) {
        const termInput = this.domManager.getElement('termInput');

        if (termInput) {
            termInput.value = termWord;
            this.domManager.focusElement('termInput');
            this.hideSearchResults();
        }
    }

    // Perform search
    performSearch(query) {
        this.dispatchEvent(window.TERMS_CONSTANTS.EVENTS.SEARCH_PERFORMED, { query });
    }

    // Show search results
    showSearchResults() {
        this.domManager.showSearchResults();
    }

    // Hide search results
    hideSearchResults() {
        this.domManager.hideSearchResults();
    }

    // Expand all terms
    expandAllTerms() {
        const rows = this.domManager.getTermRows();

        rows.forEach(row => {
            const toggleText = row.querySelector(`.${window.TERMS_CONSTANTS.CLASSES.TOGGLE_TEXT}`);
            const toggleIcon = row.querySelector(`.${window.TERMS_CONSTANTS.CLASSES.TOGGLE_ICON}`);
            const relatedSection = row.querySelector(`.${window.TERMS_CONSTANTS.CLASSES.RELATED_TERMS_SECTION}`);

            if (relatedSection && relatedSection.classList.contains(window.TERMS_CONSTANTS.CLASSES.HIDDEN)) {
                this.expandTerm(row, toggleText, toggleIcon, relatedSection);
            }
        });
    }

    // Collapse all terms
    collapseAllTerms() {
        const rows = this.domManager.getTermRows();

        rows.forEach(row => {
            const toggleText = row.querySelector(`.${window.TERMS_CONSTANTS.CLASSES.TOGGLE_TEXT}`);
            const toggleIcon = row.querySelector(`.${window.TERMS_CONSTANTS.CLASSES.TOGGLE_ICON}`);
            const relatedSection = row.querySelector(`.${window.TERMS_CONSTANTS.CLASSES.RELATED_TERMS_SECTION}`);

            if (relatedSection && !relatedSection.classList.contains(window.TERMS_CONSTANTS.CLASSES.HIDDEN)) {
                this.collapseTerm(row, toggleText, toggleIcon, relatedSection);
            }
        });
    }

    // Expand term
    expandTerm(row, toggleText, toggleIcon, relatedSection) {
        relatedSection.classList.remove(window.TERMS_CONSTANTS.CLASSES.HIDDEN);
        if (toggleText) {
            toggleText.textContent = 'Hide Related';
        }
        if (toggleIcon) {
            toggleIcon.textContent = '▼';
        }
    }

    // Collapse term
    collapseTerm(row, toggleText, toggleIcon, relatedSection) {
        relatedSection.classList.add(window.TERMS_CONSTANTS.CLASSES.HIDDEN);
        if (toggleText) {
            toggleText.textContent = 'Show Related';
        }
        if (toggleIcon) {
            toggleIcon.textContent = '▶';
        }
    }

    // Show message
    showMessage(type, message, duration = null) {
        // Clear previous message timeout
        if (this.messageTimeout) {
            clearTimeout(this.messageTimeout);
        }

        // Set default duration based on type
        if (!duration) {
            switch (type) {
                case window.TERMS_CONSTANTS.MESSAGE_TYPES.SUCCESS:
                    duration = window.TERMS_CONSTANTS.DEFAULTS.HIDE_DELAY_SUCCESS;
                    break;
                case window.TERMS_CONSTANTS.MESSAGE_TYPES.ERROR:
                    duration = window.TERMS_CONSTANTS.DEFAULTS.HIDE_DELAY_ERROR;
                    break;
                default:
                    duration = window.TERMS_CONSTANTS.DEFAULTS.HIDE_DELAY_SUCCESS;
            }
        }

        this.domManager.showMessage(type, message, duration);
    }

    // Show loading state
    showLoading() {
        this.isProcessing = true;
        this.domManager.setLoading(true);
        this.startProgressAnimation();
    }

    // Hide loading state
    hideLoading() {
        this.isProcessing = false;
        this.domManager.setLoading(false);
        this.stopProgressAnimation();
    }

    // Start progress animation
    startProgressAnimation() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
        }

        const addButton = this.domManager.getElement('addButton');

        if (!addButton) {
            return;
        }

        let dots = 0;
        const originalText = addButton.textContent;

        this.progressInterval = setInterval(() => {
            dots = (dots + 1) % 4;
            const loadingText = originalText + '.'.repeat(dots);

            addButton.textContent = loadingText;
        }, window.TERMS_CONSTANTS.DEFAULTS.PROGRESS_INTERVAL);
    }

    // Stop progress animation
    stopProgressAnimation() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }

        const addButton = this.domManager.getElement('addButton');

        if (addButton) {
            addButton.textContent = 'Add Term';
        }
    }

    // Adjust UI for screen size
    adjustUIForScreenSize() {
        const width = window.innerWidth;

        // Mobile adjustments
        if (width < 768) {
            this.domManager.addClass('termsList', 'mobile-layout');
        } else {
            this.domManager.removeClass('termsList', 'mobile-layout');
        }
    }

    // Set processing state for form elements
    setProcessingState(isProcessing) {
        const addButton = this.domManager.getElement('addButton');
        const termInput = this.domManager.getElement('termInput');

        if (addButton) {
            if (isProcessing) {
                addButton.disabled = true;
                addButton.textContent = 'Adding...';
                addButton.classList.add('opacity-50', 'cursor-not-allowed');
            } else {
                addButton.disabled = false;
                addButton.textContent = 'Add Term';
                addButton.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        }

        if (termInput) {
            termInput.disabled = isProcessing;
        }
    }

    // Update progress message
    updateProgressMessage(message) {
        this.showMessage('info', message, 0); // 0 = no auto-hide
    }

    // Complete processing with success
    completeProcessingSuccess(message) {
        this.isProcessing = false;
        this.setProcessingState(false);
        this.showMessage(window.TERMS_CONSTANTS.MESSAGE_TYPES.SUCCESS, message);
    }

    // Complete processing with error
    completeProcessingError(message) {
        this.isProcessing = false;
        this.setProcessingState(false);
        this.showMessage(window.TERMS_CONSTANTS.MESSAGE_TYPES.ERROR, message);
    }

    // Dispatch custom event
    dispatchEvent(eventName, data = {}) {
        const event = new CustomEvent(eventName, {
            detail: data,
            bubbles: true,
            cancelable: true
        });

        document.dispatchEvent(event);
    }

    // Cleanup
    cleanup() {
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        if (this.messageTimeout) {
            clearTimeout(this.messageTimeout);
        }
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
        }
        if (this.duplicateCheckTimeout) {
            clearTimeout(this.duplicateCheckTimeout);
        }
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.TermsUIManager = TermsUIManager;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TermsUIManager;
}
