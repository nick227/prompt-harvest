// textArea Module - Consolidated from setupTextArea.js and textAreaHelpers.js
class TextAreaManager {
    constructor() {
        this.init();
        this.bindEvents();
        this.isMatchClick = false; // Flag to prevent clearing matches on click
        this.hasReplacedTrigger = false; // Flag to track if we've already replaced the triggering word
    }

    init() {
        this.textArea = Utils.dom.get(TEXTAREA_CONFIG.selectors.textArea);
        this.matchesEl = Utils.dom.get(TEXTAREA_CONFIG.selectors.matches);

        // load saved height on initialization
        const savedHeight = Utils.storage.get('textAreaHeight');

        if (savedHeight) {
            this.textArea.style.height = savedHeight;
        }

        // initialize DOM cache
        Utils.dom.init(TEXTAREA_CONFIG.selectors);
    }

    bindEvents() {
        this.textArea.addEventListener('input',
            Utils.async.debounce(this.handleInput.bind(this), TEXTAREA_CONFIG.timeouts.debounce)
        );

        // single resize handler
        this.textArea.addEventListener('mouseup', this.handleResize.bind(this));
        this.matchesEl.addEventListener('click', this.handleMatchListItemClick.bind(this));

        // search and replace functionality
        this.setupSearchReplace();
    }

    async handleInput(e) {
        Utils.dom.updateElementClass(e.target, e.target.value.length);

        // Don't update matches if this was triggered by a match click
        if (!this.isMatchClick) {
            await this.updateMatches(e.target.value, e.target.selectionStart);
        } else {
            // If it was a match click, we still want to update matches when user types again
            // but we'll delay it slightly to avoid immediate clearing
            setTimeout(() => {
                this.isMatchClick = false;
                // Reset the replacement flag when user starts typing again
                this.hasReplacedTrigger = false;
            }, 100);
        }
    }

    async getSampleMatches() {
        const results = await Utils.async.fetchJson(
            `${TEXTAREA_CONFIG.api.clauses}?limit=${TEXTAREA_CONFIG.limits.maxSamples}`
        );

        return results.map(word => `<li class="sample" title="${word}">${word}</li>`).join('');
    }

    async getMatches(word) {
        const encodedWord = encodeURIComponent(word);

        return await Utils.async.fetchJson(
            `${TEXTAREA_CONFIG.api.wordType}/${encodedWord}?limit=${TEXTAREA_CONFIG.limits.wordType}`
        );
    }

    async updateMatches(value, cursorPosition) {
        const textBeforeCursor = value.slice(0, cursorPosition).trim();

        if (textBeforeCursor.split(/\s+/).pop().length < 2) {
            this.matchesEl.innerHTML = await this.getSampleMatches();
            this.hasReplacedTrigger = false; // Reset flag when starting new search

            return;
        }

        let matches = [];
        const wordsBeforeCursor = textBeforeCursor.split(/\s+/);

        for (let i = 1; i <= 3; i++) {
            if (wordsBeforeCursor.length >= i) {
                this.lastMatchedWord = wordsBeforeCursor.slice(-i).join(' ');
                try {
                    matches = await this.getMatches(this.lastMatchedWord);
                    if (matches.length > 0) {
                        break;
                    }
                } catch (error) {
                    // match error
                }
            }
        }

        if (matches.length === 0) {
            matches.push(', ');
        }

        this.updateMatchesDisplay(matches);
    }

    updateMatchesDisplay(matches) {
        this.matchesEl.innerHTML = matches.map(word => `<li title="${word}">${word}</li>`).join('');
        StateManager.update('dropdownIsOpen', matches.length > 0);
    }

    handleMatchListItemClick(e) {
        if (e.target.tagName === 'LI') {
            let replacement;

            if (e.target.classList.contains('sample')) {
                // sample matches should be inserted as template literals
                replacement = `\${${e.target.innerText}}`;
            } else if (e.target.innerText === ',') {
                replacement = ', ';
            } else {
                // regular matches should be inserted as template literals
                replacement = `\${${e.target.innerText}} `;
            }
            console.log('Replacing with template literal:', replacement);

            // Set flag to prevent matches from being cleared
            this.isMatchClick = true;

            // Check if we've already replaced the triggering word
            if (this.hasReplacedTrigger) {
                // Append at cursor position instead of replacing
                this.insertText(replacement);
            } else {
                // First click - replace the triggering word
                this.replaceTriggeringWord(replacement);
                this.hasReplacedTrigger = true; // Mark that we've done the first replacement
            }
        }
    }

    insertText(text) {
        const start = this.textArea.selectionStart;
        const end = this.textArea.selectionEnd;
        const { value } = this.textArea;

        this.textArea.value = value.substring(0, start) + text + value.substring(end);
        this.textArea.selectionStart = start + text.length;
        this.textArea.selectionEnd = start + text.length;
        this.textArea.focus();

        // trigger input event to update matches
        this.textArea.dispatchEvent(new Event('input', { bubbles: true }));
    }

    replaceTriggeringWord(replacement) {
        if (!this.textArea || !this.lastMatchedWord) {
            return;
        }

        const { value } = this.textArea;
        const cursorPos = this.textArea.selectionStart;

        // find the position of the triggering word by searching backwards from cursor
        const textBeforeCursor = value.slice(0, cursorPos);
        const lastMatchedWordIndex = textBeforeCursor.lastIndexOf(this.lastMatchedWord);

        if (lastMatchedWordIndex !== -1) {
            // found the word, replace it
            const beforeWord = value.substring(0, lastMatchedWordIndex);
            const afterWord = value.substring(lastMatchedWordIndex + this.lastMatchedWord.length);

            console.log('Replacing word:', this.lastMatchedWord, 'at position:', lastMatchedWordIndex, 'with:', replacement);
            this.textArea.value = beforeWord + replacement + afterWord;
            this.textArea.selectionStart = lastMatchedWordIndex + replacement.length;
            this.textArea.selectionEnd = lastMatchedWordIndex + replacement.length;
            this.textArea.focus();

            // trigger input event to update matches (but don't clear matches if it's from a click)
            this.textArea.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
            // fallback to simple insertion if we can't find the word
            console.log('Word not found, falling back to insertion');
            this.insertText(replacement);
        }
    }

    handleResize() {
        const { height } = this.textArea.style;

        Utils.storage.set('textAreaHeight', height);
    }

    setupSearchReplace() {
        const searchInput = Utils.dom.get(TEXTAREA_CONFIG.selectors.searchTerm);
        const replaceInput = Utils.dom.get(TEXTAREA_CONFIG.selectors.replaceTerm);
        const replaceButton = document.querySelector('.btn-replace');

        if (searchInput && replaceInput) {
            // add event listeners for search and replace
            searchInput.addEventListener('input', this.handleSearchInput.bind(this));
            replaceInput.addEventListener('input', this.handleReplaceInput.bind(this));

            // add keyboard shortcuts
            searchInput.addEventListener('keydown', this.handleSearchKeydown.bind(this));
            replaceInput.addEventListener('keydown', this.handleReplaceKeydown.bind(this));
        }

        if (replaceButton) {
            replaceButton.addEventListener('click', this.performReplace.bind(this));
        }
    }

    handleSearchInput(e) {
        const searchTerm = e.target.value.trim();

        if (searchTerm) {
            this.highlightSearchTerm(searchTerm);
        } else {
            this.clearSearchHighlights();
        }
    }

    handleReplaceInput(e) {
        // this can be used for live preview or other functionality
        const replaceTerm = e.target.value;

        console.log('Replace term changed:', replaceTerm);
    }

    handleSearchKeydown(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            this.performReplace();
        } else if (e.key === 'Escape') {
            this.clearSearchHighlights();
            e.target.value = '';
        }
    }

    handleReplaceKeydown(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            this.performReplace();
        }
    }

    highlightSearchTerm(searchTerm) {
        if (!this.textArea || !searchTerm) {
            return;
        }

        const { value } = this.textArea;
        const regex = new RegExp(`(${this.escapeRegex(searchTerm)})`, 'gi');
        const highlightedValue = value.replace(regex, '<mark>$1</mark>');

        // store original value and show highlighted version
        this.originalValue = value;
        this.textArea.innerHTML = highlightedValue;
    }

    clearSearchHighlights() {
        if (this.originalValue !== undefined) {
            this.textArea.value = this.originalValue;
            this.originalValue = undefined;
        }
    }

    performReplace() {
        const searchInput = Utils.dom.get(TEXTAREA_CONFIG.selectors.searchTerm);
        const replaceInput = Utils.dom.get(TEXTAREA_CONFIG.selectors.replaceTerm);

        if (!searchInput || !replaceInput || !this.textArea) {
            return;
        }

        const searchTerm = searchInput.value.trim();
        const replaceTerm = replaceInput.value;

        if (!searchTerm) {
            console.log('No search term provided');

            return;
        }

        // clear any highlights first
        this.clearSearchHighlights();

        // perform the replacement
        const { value } = this.textArea;
        const regex = new RegExp(this.escapeRegex(searchTerm), 'g');
        const matches = value.match(regex);
        const newValue = value.replace(regex, replaceTerm);

        if (newValue !== value) {
            this.textArea.value = newValue;
            const matchCount = matches ? matches.length : 0;

            console.log(`Replaced ${matchCount} instance(s) of "${searchTerm}" with "${replaceTerm}"`);

            // trigger input event to update matches
            this.textArea.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
            console.log(`No instances of "${searchTerm}" found to replace`);
        }
    }

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // utility methods for external access
    getValue() {
        return this.textArea ? this.textArea.value : '';
    }

    setValue(value) {
        if (this.textArea) {
            this.textArea.value = value;
            // Only trigger input event if not from a match click
            if (!this.isMatchClick) {
                this.textArea.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
    }

    getCursorPosition() {
        return this.textArea ? this.textArea.selectionStart : 0;
    }

    setCursorPosition(position) {
        if (this.textArea) {
            this.textArea.selectionStart = position;
            this.textArea.selectionEnd = position;
        }
    }

    focus() {
        if (this.textArea) {
            this.textArea.focus();
        }
    }

    blur() {
        if (this.textArea) {
            this.textArea.blur();
        }
    }

    select() {
        if (this.textArea) {
            this.textArea.select();
        }
    }

    clear() {
        this.setValue('');
    }

    clearMatches() {
        if (this.matchesEl) {
            this.matchesEl.innerHTML = '';
        }
    }

    getWordAtCursor() {
        if (!this.textArea) {
            return '';
        }

        const { value } = this.textArea;
        const cursorPos = this.textArea.selectionStart;
        const words = value.split(/\s+/);
        let currentPos = 0;

        for (const word of words) {
            const wordStart = currentPos;
            const wordEnd = currentPos + word.length;

            if (cursorPos >= wordStart && cursorPos <= wordEnd) {
                return word;
            }

            currentPos = wordEnd + 1; // +1 for the space
        }

        return '';
    }

    replaceWordAtCursor(newWord) {
        if (!this.textArea) {
            return;
        }

        const { value } = this.textArea;
        const cursorPos = this.textArea.selectionStart;
        const words = value.split(/\s+/);
        let currentPos = 0;

        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const wordStart = currentPos;
            const wordEnd = currentPos + word.length;

            if (cursorPos >= wordStart && cursorPos <= wordEnd) {
                words[i] = newWord;
                const newValue = words.join(' ');

                this.setValue(newValue);
                this.setCursorPosition(wordStart + newWord.length);

                return;
            }

            currentPos = wordEnd + 1; // +1 for the space
        }
    }

    getTextBeforeCursor() {
        if (!this.textArea) {
            return '';
        }

        const { value } = this.textArea;
        const cursorPos = this.textArea.selectionStart;

        return value.substring(0, cursorPos);
    }

    getTextAfterCursor() {
        if (!this.textArea) {
            return '';
        }

        const { value } = this.textArea;
        const cursorPos = this.textArea.selectionStart;

        return value.substring(cursorPos);
    }

    insertAtCursor(text) {
        if (!this.textArea) {
            return;
        }

        const start = this.textArea.selectionStart;
        const end = this.textArea.selectionEnd;
        const { value } = this.textArea;

        const newValue = value.substring(0, start) + text + value.substring(end);

        this.setValue(newValue);
        this.setCursorPosition(start + text.length);
    }

    // auto-resize functionality
    autoResize() {
        if (!this.textArea) {
            return;
        }

        this.textArea.style.height = 'auto';
        this.textArea.style.height = `${this.textArea.scrollHeight}px`;
    }

    // character count functionality
    getCharacterCount() {
        return this.textArea ? this.textArea.value.length : 0;
    }

    getWordCount() {
        if (!this.textArea) {
            return 0;
        }

        const words = this.textArea.value.trim().split(/\s+/);

        return this.textArea.value.trim() === '' ? 0 : words.length;
    }

    // validation methods
    isEmpty() {
        return this.getValue().trim() === '';
    }

    isTooLong(maxLength) {
        return this.getCharacterCount() > maxLength;
    }

    // history functionality
    saveToHistory() {
        const value = this.getValue();

        if (value.trim() === '') {
            return;
        }

        let history = Utils.storage.get('textAreaHistory') || [];

        history = history.filter((item) => item !== value);
        history.unshift(value);
        history = history.slice(0, 10); // keep only last 10 entries

        Utils.storage.set('textAreaHistory', history);
    }

    getHistory() {
        return Utils.storage.get('textAreaHistory') || [];
    }

    loadFromHistory(index) {
        const history = this.getHistory();

        if (history[index]) {
            this.setValue(history[index]);
        }
    }

    clearHistory() {
        Utils.storage.remove('textAreaHistory');
    }

    // legacy method names for backward compatibility
    setupTextArea() {
        return this.init();
    }
}

// global exports for backward compatibility
window.TextAreaManager = TextAreaManager;
window.textAreaManager = new TextAreaManager();
window.setupTextArea = () => textAreaManager.setupTextArea();
