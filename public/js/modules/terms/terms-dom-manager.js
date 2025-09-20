// Terms DOM Manager - Handles DOM manipulation for terms UI

class TermsDOMManager {
    constructor() {
        this.elements = {};
        this.isInitialized = false;
    }

    // Initialize DOM manager
    init() {
        if (this.isInitialized) {
            return;
        }

        this.cacheElements();
        this.isInitialized = true;
    }

    // Cache DOM elements
    cacheElements() {
        this.elements = {
            addButton: document.querySelector(window.TERMS_CONSTANTS.SELECTORS.ADD_BUTTON),
            termInput: document.querySelector(window.TERMS_CONSTANTS.SELECTORS.TERM_INPUT),
            clearButton: document.querySelector(window.TERMS_CONSTANTS.SELECTORS.CLEAR_BUTTON),
            searchInput: document.querySelector(window.TERMS_CONSTANTS.SELECTORS.SEARCH_INPUT),
            termsList: document.querySelector(window.TERMS_CONSTANTS.SELECTORS.TERMS_LIST),
            messageContainer: document.querySelector(window.TERMS_CONSTANTS.SELECTORS.MESSAGE_CONTAINER),
            emptyState: document.querySelector(window.TERMS_CONSTANTS.SELECTORS.EMPTY_STATE),
            termCount: document.querySelector(window.TERMS_CONSTANTS.SELECTORS.TERM_COUNT),
            searchResults: document.querySelector(window.TERMS_CONSTANTS.SELECTORS.SEARCH_RESULTS),
            searchResultsContent: document.querySelector(window.TERMS_CONSTANTS.SELECTORS.SEARCH_RESULTS_CONTENT)
        };
    }

    // Get cached element
    getElement(name) {
        return this.elements[name];
    }

    // Get all cached elements
    getElements() {
        return this.elements;
    }

    // Check if element exists
    elementExists(name) {
        return this.elements[name] !== null && this.elements[name] !== undefined;
    }

    // Show element
    showElement(name) {
        const element = this.getElement(name);

        if (element) {
            element.classList.remove(window.TERMS_CONSTANTS.CLASSES.HIDDEN);
        }
    }

    // Hide element
    hideElement(name) {
        const element = this.getElement(name);

        if (element) {
            element.classList.add(window.TERMS_CONSTANTS.CLASSES.HIDDEN);
        }
    }

    // Toggle element visibility
    toggleElement(name) {
        const element = this.getElement(name);

        if (element) {
            element.classList.toggle(window.TERMS_CONSTANTS.CLASSES.HIDDEN);
        }
    }

    // Add class to element
    addClass(name, className) {
        const element = this.getElement(name);

        if (element) {
            element.classList.add(className);
        }
    }

    // Remove class from element
    removeClass(name, className) {
        const element = this.getElement(name);

        if (element) {
            element.classList.remove(className);
        }
    }

    // Set element text content
    setText(name, text) {
        const element = this.getElement(name);

        if (element) {
            element.textContent = text;
        }
    }

    // Set element HTML content
    setHTML(name, html) {
        const element = this.getElement(name);

        if (element) {
            element.innerHTML = html;
        }
    }

    // Get element value
    getValue(name) {
        const element = this.getElement(name);

        return element ? element.value : '';
    }

    // Set element value
    setValue(name, value) {
        const element = this.getElement(name);

        if (element) {
            element.value = value;
        }
    }

    // Clear element value
    clearValue(name) {
        this.setValue(name, '');

        // If clearing term input, also clear duplicate indicator
        if (name === 'termInput') {
            const existingIndicator = document.querySelector('.duplicate-indicator');

            if (existingIndicator) {
                existingIndicator.remove();
            }
        }
    }

    // Focus element
    focusElement(name) {
        const element = this.getElement(name);

        if (element) {
            element.focus();
        }
    }

    // Disable element
    disableElement(name) {
        const element = this.getElement(name);

        if (element) {
            element.disabled = true;
        }
    }

    // Enable element
    enableElement(name) {
        const element = this.getElement(name);

        if (element) {
            element.disabled = false;
        }
    }

    // Create term row element
    createTermRow(term, index) {
        const row = document.createElement('div');

        row.className = window.TERMS_CONSTANTS.CLASSES.TERM_ROW;
        row.dataset.index = index;
        row.dataset.term = typeof term === 'string' ? term : term.word;

        const termWord = typeof term === 'string' ? term : term.word;
        const types = this.getTermTypes(term);

        // Create beautiful type tags
        const typeTags = types.length > 0
            ? types.map(type => `<span class="term-type-tag">${this.escapeHtml(type)}</span>`).join('')
            : '';

        row.innerHTML = `
            <div class="term-row-header">
                <h2 class="term-word">${this.escapeHtml(termWord)}</h2>
                <div class="term-actions">
                    <button class="term-toggle" title="Toggle types"><i class="fas fa-chevron-right"></i></button>
                    <button class="term-delete" title="Delete term"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            ${typeTags ? `<div class="term-types hidden">${typeTags}</div>` : ''}
        `;

        // Wire up the term-toggle button click
        const toggleButton = row.querySelector('.term-toggle');

        if (toggleButton) {
            toggleButton.addEventListener('click', () => {
                const termTypes = row.querySelector('.term-types');
                const termRow = termTypes.closest('.term-row');

                if (termTypes) {
                    const isHidden = termTypes.classList.contains('hidden');

                    if (isHidden) {
                        // Expanding - show types and adjust width
                        termTypes.classList.remove('hidden');
                        termRow.classList.add('w-full', 'col-span-full');
                        termRow.classList.remove('col-span-1');
                    } else {
                        // Collapsing - hide types and restore width
                        termTypes.classList.add('hidden');
                        termRow.classList.remove('w-full', 'col-span-full');
                        termRow.classList.add('col-span-1');
                    }

                    // Update icon based on state
                    const icon = toggleButton.querySelector('i');

                    if (icon) {
                        icon.className = isHidden
                            ? 'fas fa-chevron-down'
                            : 'fas fa-chevron-right';
                    }
                }
            });
        }

        // Wire up the delete button click
        const deleteButton = row.querySelector('.term-delete');

        if (deleteButton) {
            deleteButton.addEventListener('click', e => {
                e.stopPropagation(); // Prevent any parent click handlers

                // Show confirmation dialog
                const confirmed = confirm(`Are you sure you want to delete the term "${termWord}" and all its associated types?`);

                if (confirmed) {
                    // Dispatch custom event for term deletion
                    const deleteEvent = new CustomEvent('termDeleted', {
                        detail: {
                            term,
                            termWord,
                            index,
                            element: row
                        }
                    });

                    document.dispatchEvent(deleteEvent);
                }
            });
        }

        return row;
    }

    // Create skeleton row element
    createSkeletonRow() {
        const row = document.createElement('div');

        row.className = `${window.TERMS_CONSTANTS.CLASSES.TERM_ROW} ${window.TERMS_CONSTANTS.CLASSES.SKELETON_ROW}`;

        row.innerHTML = `
            <div class="term-row-header">
                <div class="skeleton-word"></div>
                <div class="skeleton-button"></div>
            </div>
            <div class="skeleton-types"></div>
        `;

        // Add shimmer effect
        setTimeout(() => {
            row.classList.add('shimmer-active');
        }, Math.random() * 200);

        return row;
    }

    // Create search result item
    createSearchResultItem(term, matchType, matchText) {
        const item = document.createElement('div');

        item.className = 'search-result-item';
        item.dataset.term = typeof term === 'string' ? term : term.word;

        const termWord = typeof term === 'string' ? term : term.word;
        const types = this.getTermTypes(term);
        const accentClasses = this.getAccentClasses(matchType);

        // Create beautiful type tags for search results
        const typeTags = types.length > 0
            ? types.map(type => `<span class="term-type-tag">${this.escapeHtml(type)}</span>`).join('')
            : '';

        item.innerHTML = `
            <div class="result-content">
                <span class="result-word ${accentClasses}">${this.highlightMatch(termWord, matchText)}</span>
                ${typeTags ? `<div class="result-types">${typeTags}</div>` : ''}
                <span class="match-badge">${this.getMatchBadge(matchType)}</span>
            </div>
            <div class="result-actions">
                <button class="result-delete" title="Delete term"><i class="fas fa-trash"></i></button>
            </div>
        `;

        // Wire up the delete button click for search results
        const deleteButton = item.querySelector('.result-delete');

        if (deleteButton) {
            deleteButton.addEventListener('click', e => {
                e.stopPropagation(); // Prevent the search result click handler

                // Show confirmation dialog
                const confirmed = confirm(`Are you sure you want to delete the term "${termWord}" and all its associated types?`);

                if (confirmed) {
                    // Dispatch custom event for term deletion
                    const deleteEvent = new CustomEvent('termDeleted', {
                        detail: {
                            term,
                            termWord,
                            index: -1, // Search results don't have a specific index
                            element: item
                        }
                    });

                    document.dispatchEvent(deleteEvent);
                }
            });
        }

        return item;
    }

    // Create message element
    createMessageElement(type, message) {
        const messageEl = document.createElement('div');

        messageEl.className = `message message-${type}`;
        messageEl.textContent = message;

        return messageEl;
    }

    // Add term to list
    addTermToList(term, index) {
        const termsList = this.getElement('termsList');

        if (!termsList) {
            console.error('❌ DOM: Terms list element not found');

            return;
        }

        const row = this.createTermRow(term, index);

        termsList.appendChild(row);
    }

    // Add skeleton rows
    addSkeletonRows(count = window.TERMS_CONSTANTS.DEFAULTS.SKELETON_COUNT) {
        const termsList = this.getElement('termsList');

        if (!termsList) {
            console.error('❌ DOM: Terms list element not found');

            return;
        }

        for (let i = 0; i < count; i++) {
            const skeletonRow = this.createSkeletonRow();

            termsList.appendChild(skeletonRow);
        }
    }

    // Remove skeleton rows
    removeSkeletonRows() {
        const skeletonRows = document.querySelectorAll(`.${window.TERMS_CONSTANTS.CLASSES.SKELETON_ROW}`);

        skeletonRows.forEach(row => row.remove());
    }

    // Clear terms list
    clearTermsList() {
        const termsList = this.getElement('termsList');

        if (termsList) {
            termsList.innerHTML = '';
        }
    }

    // Update term count
    updateTermCount(count) {
        this.setText('termCount', count.toString());
    }

    // Show empty state
    showEmptyState() {
        this.showElement('emptyState');
        this.hideElement('termsList');
    }

    // Hide empty state
    hideEmptyState() {
        this.hideElement('emptyState');
        this.showElement('termsList');
    }

    // Show search results
    showSearchResults() {
        this.showElement('searchResults');
    }

    // Hide search results
    hideSearchResults() {
        this.hideElement('searchResults');
    }

    // Clear search results
    clearSearchResults() {
        this.setHTML('searchResultsContent', '');
    }

    // Add search result
    addSearchResult(term, matchType, matchText) {
        const searchResultsContent = this.getElement('searchResultsContent');

        if (!searchResultsContent) {
            return;
        }

        const resultItem = this.createSearchResultItem(term, matchType, matchText);

        searchResultsContent.appendChild(resultItem);
    }

    // Show message
    showMessage(type, message, duration = null) {
        const messageContainer = this.getElement('messageContainer');

        if (!messageContainer) {
            return;
        }

        // Clear existing messages
        messageContainer.innerHTML = '';

        const messageEl = this.createMessageElement(type, message);

        messageContainer.appendChild(messageEl);

        // Auto-hide message after duration
        if (duration) {
            setTimeout(() => {
                this.hideMessage();
            }, duration);
        }
    }

    // Hide message
    hideMessage() {
        const messageContainer = this.getElement('messageContainer');

        if (messageContainer) {
            messageContainer.innerHTML = '';
        }
    }

    // Set loading state
    setLoading(loading) {
        if (loading) {
            this.addClass('addButton', window.TERMS_CONSTANTS.CLASSES.LOADING);
            this.disableElement('addButton');
            this.disableElement('termInput');
        } else {
            this.removeClass('addButton', window.TERMS_CONSTANTS.CLASSES.LOADING);
            this.enableElement('addButton');
            this.enableElement('termInput');
        }
    }

    // Set searching state
    setSearching(searching) {
        if (searching) {
            this.addClass('searchInput', window.TERMS_CONSTANTS.CLASSES.LOADING);
        } else {
            this.removeClass('searchInput', window.TERMS_CONSTANTS.CLASSES.LOADING);
        }
    }

    // Helper methods
    getTermTypes(term) {
        if (typeof term === 'object' && term.types) {
            if (Array.isArray(term.types)) {
                return term.types;
            } else if (typeof term.types === 'string') {
                try {
                    return JSON.parse(term.types);
                } catch (e) {
                    return [];
                }
            } else if (typeof term.types === 'object') {
                return term.types;
            }
        }

        return [];
    }

    getAccentClasses(matchType) {
        switch (matchType) {
            case 'term-exact': return 'accent-exact';
            case 'term-starts': return 'accent-starts';
            case 'term-contains': return 'accent-contains';
            case 'term-fuzzy': return 'accent-fuzzy';
            case 'related-exact': return 'accent-related-exact';
            case 'related-starts': return 'accent-related-starts';
            case 'related-contains': return 'accent-related-contains';
            default: return '';
        }
    }

    getMatchBadge(matchType) {
        switch (matchType) {
            case 'term-exact': return 'Exact';
            case 'term-starts': return 'Starts';
            case 'term-contains': return 'Contains';
            case 'term-fuzzy': return 'Fuzzy';
            case 'related-exact': return 'Type Exact';
            case 'related-starts': return 'Type Starts';
            case 'related-contains': return 'Type Contains';
            default: return '';
        }
    }

    highlightMatch(termWord, matchText) {
        if (!matchText) {
            return this.escapeHtml(termWord);

        }

        const regex = new RegExp(`(${this.escapeRegex(matchText)})`, 'gi');

        return this.escapeHtml(termWord).replace(regex, '<mark>$1</mark>');
    }

    escapeHtml(text) {
        const div = document.createElement('div');

        div.textContent = text;

        return div.innerHTML;
    }

    escapeRegex(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Get all term rows
    getTermRows() {
        return document.querySelectorAll(`.${window.TERMS_CONSTANTS.CLASSES.TERM_ROW}:not(.${window.TERMS_CONSTANTS.CLASSES.SKELETON_ROW})`);
    }

    // Get term row by index
    getTermRowByIndex(index) {
        return document.querySelector(`.${window.TERMS_CONSTANTS.CLASSES.TERM_ROW}[data-index="${index}"]`);
    }

    // Remove term row by index
    removeTermRowByIndex(index) {
        const row = this.getTermRowByIndex(index);

        if (row) {
            row.remove();
        }
    }

    // Update term row
    updateTermRow(index, term) {
        const row = this.getTermRowByIndex(index);

        if (row) {
            const newRow = this.createTermRow(term, index);

            row.replaceWith(newRow);
        }
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.TermsDOMManager = TermsDOMManager;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TermsDOMManager;
}
