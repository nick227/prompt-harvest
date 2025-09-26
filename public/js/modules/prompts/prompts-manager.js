// prompts Manager - Consolidated from setupWordTypeSection.js and setupSearchTerm.js
class PromptsManager {
    constructor() {
        this.config = PROMPTS_CONFIG;
        this.isInitialized = false;
        this.isProcessingAddRequest = false;
    }

    init() {
        this.setupEventListeners();
        this.setupWordTypeSection();
        this.isInitialized = true;
    }

    setupEventListeners() {
        const termElement = Utils.dom.get(this.config.selectors.term);
        const findButton = Utils.dom.get(this.config.selectors.findButton);
        const clearButton = Utils.dom.get(this.config.selectors.clearButton);

        if (termElement && typeof termElement.addEventListener === 'function') {
            termElement.addEventListener('keyup', e => this.handleSearchTermKeyUp(e));
            termElement.addEventListener('focusout', () => this.handleSearchTermFocusOut());
        }

        if (findButton && typeof findButton.addEventListener === 'function') {
            findButton.addEventListener('click', () => this.handleFindClick());
        }

        if (clearButton && typeof clearButton.addEventListener === 'function') {
            clearButton.addEventListener('click', () => this.handleClearBtnClick());
        }
    }

    async setupWordTypeSection() {
        try {
            const response = await fetch(this.config.api.words);
            const words = await response.json();

            if (words && words.length > 0) {
                this.renderWordTypes(words);
            }
            this.setupTermCount();
        } catch (error) {
            // error fetching words
        }
    }

    setupTermCount() {
        const termCountElement = Utils.dom.get(this.config.selectors.termCount);

        if (termCountElement) {
            termCountElement.innerHTML = this.getTermCount();
        }
    }

    getTermCount() {
        const wordTypes = Utils.dom.getAll('.word-types li');

        return wordTypes.length.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    renderWordTypes(words) {
        const wordTypesElement = Utils.dom.get(this.config.selectors.wordTypes);

        if (wordTypesElement) {
            wordTypesElement.innerHTML = words.map(word => `<li title="${word}">${word}</li>`).join('');
            wordTypesElement.addEventListener('click', e => this.handleWordTypeClick(e));
        }
    }

    handleWordTypeClick(e) {
        const termElement = Utils.dom.get(this.config.selectors.term);

        if (termElement) {
            termElement.value = e.target.innerHTML;
            termElement.scrollIntoView({ behavior: 'smooth' });
        }
    }

    handleSearchTermKeyUp(e) {
        if (e.key === 'Enter') {
            this.handleFindClick();
        } else {
            this.addAutoDropDown();
        }
    }

    handleSearchTermFocusOut() {
        setTimeout(() => {
            this.clearTermDropDown();
        }, 200);
    }

    clearTermDropDown() {
        const dropdown = Utils.dom.get(this.config.selectors.dropdown);

        if (dropdown && typeof dropdown.remove === 'function') {
            dropdown.remove();
        } else if (dropdown && dropdown.parentNode) {
            dropdown.parentNode.removeChild(dropdown);
        }
    }

    addAutoDropDown() {
        const term = this.getCurrentSearchTerm();

        if (!this.isValidSearchTerm(term)) {
            this.clearTermDropDown();

            return;
        }

        const matches = this.getSearchMatches(term);

        if (matches.length === 0) {
            this.clearTermDropDown();

            return;
        }

        this.renderDropDown(matches);
    }

    renderDropDown(matches) {
        this.clearTermDropDown();
        const dropdown = Utils.dom.createElement('div', this.config.selectors.dropdown.substring(1));

        dropdown.innerHTML = matches.map(match => `<div class="dropdown-item">${match}</div>`).join('');
        const termElement = Utils.dom.get(this.config.selectors.term);

        if (termElement && termElement.parentNode) {
            termElement.parentNode.appendChild(dropdown);
        }

        this.setupDropDownEvents(dropdown);
    }

    setupDropDownEvents(dropdown) {
        const items = dropdown.querySelectorAll('.dropdown-item');

        items.forEach(item => {
            item.addEventListener('click', () => {
                const termElement = Utils.dom.get(this.config.selectors.term);

                if (termElement) {
                    termElement.value = item.textContent;
                    this.clearTermDropDown();
                }
            });
        });
    }

    getSearchMatches(term) {
        const wordTypes = Utils.dom.getAll('.word-types li');
        const matches = [];

        wordTypes.forEach(element => {
            const text = element.textContent.toLowerCase();

            if (text.includes(term.toLowerCase())) {
                matches.push(element.textContent);
            }
        });

        return matches.slice(0, this.config.limits.maxMatches);
    }

    getCurrentSearchTerm() {
        const termElement = Utils.dom.get(this.config.selectors.term);

        return termElement ? termElement.value.trim() : '';
    }

    isValidSearchTerm(term) {
        return typeof term === 'string' && term.trim() !== '';
    }

    setProcessingState(isProcessing) {
        this.isProcessingAddRequest = isProcessing;
        const loadingElement = Utils.dom.get(this.config.selectors.loading);

        if (loadingElement) {
            loadingElement.style.display = isProcessing ? 'block' : 'none';
        }
    }

    getProcessingState() {
        return this.isProcessingAddRequest;
    }

    clearTypeSearchInput() {
        const termElement = Utils.dom.get(this.config.selectors.term);

        if (termElement) {
            termElement.value = '';
        }
        this.clearTermDropDown();
    }

    resetTextArea() {
        const textArea = Utils.dom.get('#prompt-textarea');

        if (textArea) {
            textArea.value = '';
        }
    }

    async handleFindClick() {
        const term = this.getCurrentSearchTerm();

        if (!this.isValidSearchTerm(term)) {
            return;
        }

        this.setProcessingState(true);
        try {
            const response = await fetch(`${this.config.api.termTypes}/${encodeURIComponent(term)}`);
            const data = await response.json();

            if (data && Array.isArray(data)) {
                this.checkTermTypes(data);
            } else { /* Empty block */ }
        } catch (error) {
            console.error('Error finding term types:', error);
        } finally {
            this.setProcessingState(false);
        }
    }

    handleClearBtnClick() {
        this.clearTypeSearchInput();
        this.resetTextArea();
        this.clearTermResults();
    }

    clearTermResults() {
        const termResultsElement = Utils.dom.get('.term-results');

        if (termResultsElement) {
            termResultsElement.innerHTML = '';
        }
    }

    checkTermTypes(types) {
        const termResultsElement = Utils.dom.get('.term-results');
        const currentTerm = this.getCurrentSearchTerm();

        if (termResultsElement && Array.isArray(types) && types.length > 0) {
            const resultsHtml = `
                <div class="term-types-found">
                    <h4>Term Types Found:</h4>
                    <ul>
                        ${types.map(type => `<li>${type}</li>`).join('')}
                    </ul>
                </div>
            `;

            termResultsElement.innerHTML = resultsHtml;
        } else {
            const termResultsElement = Utils.dom.get('.term-results');

            if (termResultsElement) {
                const addNewTermHtml = `
                    <div class="no-results">
                        <p>No term types found for "${currentTerm}".</p>
                        <button class="add-new-term-btn" data-term="${currentTerm}">
                            <span class="add-icon">+</span>
                            Add "${currentTerm}" as new term
                        </button>
                        <div class="add-term-status hidden"></div>
                    </div>
                `;

                termResultsElement.innerHTML = addNewTermHtml;

                // Add event listener for the add new term button
                this.setupAddNewTermEvents();
            }
        }
    }

    setupAddNewTermEvents () {
        const addButton = Utils.dom.get('.add-new-term-btn');

        if (addButton) {
            addButton.addEventListener('click', e => {
                const term = e.target.dataset.term || e.target.closest('.add-new-term-btn').dataset.term;

                this.handleAddNewTerm(term);
            });
        }
    }

    async handleAddNewTerm (term) {
        if (!term || !this.isValidSearchTerm(term)) {
            return;
        }

        const addButton = Utils.dom.get('.add-new-term-btn');
        const statusDiv = Utils.dom.get('.add-term-status');

        if (addButton) {
            addButton.disabled = true;
            addButton.innerHTML = '<span class="loading-spinner">⏳</span> Generating term types...';
        }

        if (statusDiv) {
            statusDiv.classList.remove('hidden');
            statusDiv.innerHTML = '<p class="status-message">Generating AI term types...</p>';
        }

        try {
            // Call the AI generation endpoint
            const response = await fetch(`/ai/word/add/${encodeURIComponent(term)}`);

            if (response.ok) {
                const _data = await response.json();

                if (statusDiv) {
                    statusDiv.innerHTML = '<p class="status-success">✅ Term types generated successfully!</p>';
                }

                // Wait a moment for the database to update, then refresh the search
                setTimeout(() => {
                    this.handleFindClick();
                }, 2000);
            } else {
                throw new Error('Failed to generate term types');
            }
        } catch (error) {
            console.error('Error adding new term:', error);
            if (statusDiv) {
                statusDiv.innerHTML = '<p class="status-error">❌ Failed to generate term types. Please try again.</p>';
            }

            if (addButton) {
                addButton.disabled = false;
                addButton.innerHTML = `
                    <span class="add-icon">+</span>
                    Add "${term}" as new term
                `;
            }
        }
    }

}

// export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PromptsManager;
}

// initialize global instance
if (typeof window !== 'undefined') {
    window.PromptsManager = PromptsManager;
    window.promptsManager = new PromptsManager();
}
