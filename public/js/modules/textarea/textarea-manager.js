// ============================================================================
// TEXTAREA MANAGER - Main Manager Class (Refactored)
// ============================================================================

// ============================================================================
// TEXTAREA MANAGER CLASS
// ============================================================================

class TextAreaManager {
    constructor() {
        this.isMatchClick = false;
        this.hasReplacedTrigger = false;
        this.lastTriggeringWord = null;
        this.isInitialized = false;
        this.initialHeight = null; // Store the initial height
        this.lastResizeContent = ''; // Cache for performance optimization
        this.lastResizeHeight = null; // Cache for performance optimization

        // Initialize modules
        this.matchProcessor = new window.MatchProcessor();
        this.searchReplaceManager = null; // Will be initialized after textArea is available

        this.init();
        this.bindEvents();
    }

    // ============================================================================
    // INITIALIZATION METHODS
    // ============================================================================

    init() {
        if (this.isInitialized) {
            return;
        }

        this.textArea = Utils.dom.get(TEXTAREA_CONFIG.selectors.textArea);
        this.matchesEl = Utils.dom.get(TEXTAREA_CONFIG.selectors.matches);

        this.loadSavedHeight();
        Utils.dom.init(TEXTAREA_CONFIG.selectors);

        // Store initial height if not already stored
        if (this.textArea && this.initialHeight === null) {
            // Use setTimeout to ensure DOM is fully rendered
            setTimeout(() => {
                if (this.textArea && this.initialHeight === null) {
                    this.initialHeight = this.textArea.offsetHeight;
                }
            }, 0);
        }

        // Initialize search replace manager after textArea is available
        if (this.textArea) {
            this.searchReplaceManager = new window.SearchReplaceManager(this.textArea);
        }

        this.isInitialized = true;
    }

    loadSavedHeight() {
        const savedHeight = Utils.storage.get('textAreaHeight');

        // Store initial height BEFORE loading saved height to preserve baseline
        if (this.textArea && this.initialHeight === null) {
            this.initialHeight = this.textArea.offsetHeight;
        }

        // Only load saved height if it's different from initial height
        if (savedHeight && this.textArea && savedHeight !== `${this.initialHeight}px`) {
            this.textArea.style.height = savedHeight;
        }
    }

    bindEvents() {
        if (!this.textArea || !this.matchesEl) {
            return;
        }

        this.textArea.addEventListener('input',
            Utils.async.debounce(this.handleInput.bind(this), TEXTAREA_CONFIG.timeouts.debounce)
        );

        // Add paste event listener for autoResize
        this.textArea.addEventListener('paste', () => {
            // Use setTimeout to ensure paste content is processed before autoResize
            setTimeout(() => this.autoResize(), 10);
        });

        this.textArea.addEventListener('mouseup', this.handleResize.bind(this));
        this.matchesEl.addEventListener('click', this.handleMatchListItemClick.bind(this));

        this.setupSearchReplace();
    }

    // ============================================================================
    // EVENT HANDLERS
    // ============================================================================

    async handleInput(e) {
        Utils.dom.updateElementClass(e.target, e.target.value.length);

        // Auto resize on content change
        this.autoResize();

        if (!this.isMatchClick) {
            await this.updateMatches(e.target.value, e.target.selectionStart);
        } else {
            this.resetMatchClickFlag();
        }
    }

    resetMatchClickFlag() {
        setTimeout(() => {
            this.isMatchClick = false;
            this.hasReplacedTrigger = false;
        }, 100);
    }

    handleMatchListItemClick(e) {
        if (e.target.tagName !== 'LI') {
            return;
        }

        const isSample = e.target.classList.contains('sample');
        const replacement = window.MatchProcessorUtils.processMatchSelection(e.target.innerText, isSample);

        this.isMatchClick = true;

        if (this.hasReplacedTrigger) {
            // Subsequent clicks: append to end of textarea
            this.appendToEnd(replacement);
        } else {
            // First click: replace the triggering word
            this.replaceTriggeringWord(replacement);
            this.hasReplacedTrigger = true;
        }
    }

    handleResize() {
        if (this.textArea?.style?.height) {
            Utils.storage.set('textAreaHeight', this.textArea.style.height);
        }
    }

    // ============================================================================
    // MATCH PROCESSING METHODS
    // ============================================================================

    async updateMatches(value, cursorPosition) {
        console.log('🔍 TEXTAREA MANAGER: updateMatches called', {
            value: `${value.substring(0, 50)}...`,
            cursorPosition,
            matchesEl: !!this.matchesEl
        });

        const textBeforeCursor = window.TextUtils.getTextBeforeCursor(value, cursorPosition);

        if (!this.matchProcessor.isReadyForMatching(textBeforeCursor)) {
            console.log('🔍 TEXTAREA MANAGER: Not ready for matching, showing samples');
            this.matchesEl.innerHTML = await this.matchProcessor.getSampleMatches();
            this.hasReplacedTrigger = false;

            return;
        }

        console.log('🔍 TEXTAREA MANAGER: Ready for matching, finding matches for:', textBeforeCursor);
        const matches = await this.matchProcessor.findMatches(textBeforeCursor);

        console.log('🔍 TEXTAREA MANAGER: Found matches:', matches);

        // Only reset replacement flag if this is a completely new search (different triggering word)
        const currentTriggeringWord = this.matchProcessor.getLastMatchedWord();

        if (currentTriggeringWord && currentTriggeringWord !== this.lastTriggeringWord) {
            this.hasReplacedTrigger = false;
            this.lastTriggeringWord = currentTriggeringWord;
        }

        this.matchProcessor.updateMatchesDisplay(this.matchesEl, matches);
    }

    // ============================================================================
    // TEXT MANIPULATION METHODS
    // ============================================================================

    insertText(text) {
        if (!this.textArea) {
            return;
        }

        const { value, cursorPosition } = window.TextUtils.insertTextAtPosition(
            this.textArea.value,
            this.textArea.selectionStart,
            this.textArea.selectionEnd,
            text
        );

        this.textArea.value = value;
        this.textArea.selectionStart = cursorPosition;
        this.textArea.selectionEnd = cursorPosition;
        this.textArea.focus();

        // Auto resize after text insertion
        this.autoResize();

        this.triggerInputEvent();
    }

    appendToEnd(text) {
        if (!this.textArea) {
            return;
        }

        // Move cursor to end of textarea
        const endPosition = this.textArea.value.length;

        this.textArea.selectionStart = endPosition;
        this.textArea.selectionEnd = endPosition;

        // Insert text at the end
        this.insertText(text);
    }

    replaceTriggeringWord(replacement) {
        if (!this.textArea || !this.matchProcessor.getLastMatchedWord()) {
            this.insertText(replacement);

            return;
        }

        const triggeringWord = this.matchProcessor.getLastMatchedWord();

        // If we've already replaced this triggering word in this session, always append
        if (this.hasReplacedTrigger) {
            console.log('🔍 TEXTAREA MANAGER: Already replaced trigger in this session, appending instead');
            this.appendToEnd(replacement);

            return;
        }

        // Check if the textarea already contains any ${term} patterns (indicating previous replacements)
        const hasAnyReplacements = this.textArea.value.includes('${') && this.textArea.value.includes('}');

        if (hasAnyReplacements) {
            console.log('🔍 TEXTAREA MANAGER: Textarea already contains replacements, appending instead');
            this.appendToEnd(replacement);

            return;
        }

        const wordPosition = window.MatchProcessorUtils.findTriggeringWordPosition(
            this.textArea.value,
            triggeringWord,
            this.textArea.selectionStart
        );

        console.log('🔍 TEXTAREA MANAGER: Replacement attempt', {
            triggeringWord,
            wordPosition,
            hasReplacedTrigger: this.hasReplacedTrigger,
            hasAnyReplacements
        });

        if (wordPosition !== -1) {
            const { value, cursorPosition } = window.MatchProcessorUtils.replaceTriggeringWord(
                this.textArea.value,
                triggeringWord,
                replacement,
                wordPosition
            );

            this.textArea.value = value;
            this.textArea.selectionStart = cursorPosition;
            this.textArea.selectionEnd = cursorPosition;
            this.textArea.focus();

            // Mark that we've replaced the trigger
            this.hasReplacedTrigger = true;
        } else {
            this.insertText(replacement);
        }

        this.triggerInputEvent();
    }

    triggerInputEvent() {
        if (this.textArea) {
            this.textArea.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    // ============================================================================
    // SEARCH AND REPLACE METHODS
    // ============================================================================

    setupSearchReplace() {
        if (this.searchReplaceManager) {
            this.searchReplaceManager.setupSearchReplace();
        }
    }

    // ============================================================================
    // PUBLIC API METHODS
    // ============================================================================

    getValue() {
        return this.textArea?.value || '';
    }

    setValue(value) {
        if (this.textArea) {
            this.textArea.value = value;

            // Auto resize after programmatic value change
            this.autoResize();

            if (!this.isMatchClick) {
                this.triggerInputEvent();
            }
        }
    }

    getCursorPosition() {
        return this.textArea?.selectionStart || 0;
    }

    setCursorPosition(position) {
        if (this.textArea) {
            this.textArea.selectionStart = position;
            this.textArea.selectionEnd = position;
        }
    }

    focus() {
        this.textArea?.focus();
    }

    blur() {
        this.textArea?.blur();
    }

    select() {
        this.textArea?.select();
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

        return window.TextUtils.getWordAtCursor(this.textArea.value, this.textArea.selectionStart);
    }

    replaceWordAtCursor(newWord) {
        if (!this.textArea) {
            return;
        }

        const { value, cursorPosition } = window.TextUtils.replaceWordAtCursor(
            this.textArea.value,
            this.textArea.selectionStart,
            newWord
        );

        this.setValue(value);
        this.setCursorPosition(cursorPosition);
    }

    getTextBeforeCursor() {
        if (!this.textArea) {
            return '';
        }

        return window.TextUtils.getTextBeforeCursor(this.textArea.value, this.textArea.selectionStart);
    }

    getTextAfterCursor() {
        if (!this.textArea) {
            return '';
        }

        return window.TextUtils.getTextAfterCursor(this.textArea.value, this.textArea.selectionStart);
    }

    insertAtCursor(text) {
        if (!this.textArea) {
            return;
        }

        const { value, cursorPosition } = window.TextUtils.insertTextAtPosition(
            this.textArea.value,
            this.textArea.selectionStart,
            this.textArea.selectionEnd,
            text
        );

        this.setValue(value);
        this.setCursorPosition(cursorPosition);
    }

    autoResize() {
        if (!this.textArea) {
            return;
        }

        // Ensure initial height is captured
        this.ensureInitialHeight();

        const content = this.textArea.value;

        // Performance optimization: skip if content hasn't changed
        if (content === this.lastResizeContent && this.textArea.style.height === this.lastResizeHeight) {
            return;
        }

        // Handle empty content
        if (!content.trim()) {
            this.resetToInitialHeight();
            this.updateResizeCache(content);

            return;
        }

        // Calculate and apply appropriate height
        const resizeData = this.calculateResizeData(content);

        this.applyResize(resizeData);

        // Update cache and save height for persistence
        this.updateResizeCache(content);
        Utils.storage.set('textAreaHeight', this.textArea.style.height);
    }

    /**
     * Update resize cache for performance optimization
     */
    updateResizeCache(content) {
        this.lastResizeContent = content;
        this.lastResizeHeight = this.textArea.style.height;
    }

    /**
     * Ensure initial height is captured
     */
    ensureInitialHeight() {
        if (this.initialHeight === null) {
            this.initialHeight = this.textArea.offsetHeight;
        }
    }

    /**
     * Reset textarea to initial height
     */
    resetToInitialHeight() {
        this.textArea.style.height = `${this.initialHeight}px`;
        Utils.storage.set('textAreaHeight', this.textArea.style.height);
    }

    /**
     * Calculate resize data including line counts and height levels
     */
    calculateResizeData(content) {
        try {
            const computedStyle = window.getComputedStyle(this.textArea);
            const lineHeight = parseInt(computedStyle.lineHeight) || 20;
            const paddingTop = parseInt(computedStyle.paddingTop) || 8;
            const paddingBottom = parseInt(computedStyle.paddingBottom) || 8;
            const borderTop = parseInt(computedStyle.borderTopWidth) || 0;
            const borderBottom = parseInt(computedStyle.borderBottomWidth) || 0;

            // Calculate content area and line counts
            const contentHeight = Math.max(1, this.initialHeight - paddingTop - paddingBottom - borderTop - borderBottom);
            const linesInInitialHeight = Math.max(1, Math.floor(contentHeight / lineHeight));
            const explicitLines = content.split('\n').length;

            // Measure actual content height
            this.textArea.style.height = 'auto';
            const actualContentHeight = Math.max(1, this.textArea.scrollHeight - paddingTop - paddingBottom -
                borderTop - borderBottom);
            const actualLines = Math.ceil(actualContentHeight / lineHeight);

            return {
                totalLines: Math.max(explicitLines, actualLines),
                linesInInitialHeight,
                lineHeight,
                paddingTop,
                paddingBottom,
                borderTop,
                borderBottom
            };
        } catch (error) {
            console.warn('Error calculating resize data:', error);

            // Fallback to basic calculation
            return {
                totalLines: content.split('\n').length,
                linesInInitialHeight: 6,
                lineHeight: 20,
                paddingTop: 8,
                paddingBottom: 8,
                borderTop: 0,
                borderBottom: 0
            };
        }
    }

    /**
     * Apply the calculated resize based on content
     */
    applyResize(resizeData) {
        const { totalLines, linesInInitialHeight } = resizeData;
        const doubleHeight = this.initialHeight * 2;
        const tripleHeight = this.initialHeight * 3;
        const linesInDoubleHeight = linesInInitialHeight * 2;
        const linesInTripleHeight = linesInInitialHeight * 3;

        if (totalLines <= linesInInitialHeight) {
            this.textArea.style.height = `${this.initialHeight}px`;
        } else if (totalLines <= linesInDoubleHeight) {
            const naturalHeight = this.textArea.scrollHeight;
            const newHeight = Math.min(doubleHeight, naturalHeight);

            this.textArea.style.height = `${newHeight}px`;
        } else if (totalLines <= linesInTripleHeight) {
            const naturalHeight = this.textArea.scrollHeight;
            const newHeight = Math.min(tripleHeight, naturalHeight);

            this.textArea.style.height = `${newHeight}px`;
        } else {
            this.textArea.style.height = `${tripleHeight}px`;
        }
    }

    // ============================================================================
    // AUTO RESIZE UTILITY METHODS
    // ============================================================================

    /**
     * Reset the initial height baseline
     * Useful when textarea dimensions change due to CSS changes
     */
    resetInitialHeight() {
        if (this.textArea) {
            this.initialHeight = this.textArea.offsetHeight;
            this.clearResizeCache(); // Clear cache when resetting

            this.autoResize(); // Trigger resize with new baseline
        }
    }

    /**
     * Clear resize cache to force recalculation
     */
    clearResizeCache() {
        this.lastResizeContent = '';
        this.lastResizeHeight = null;
    }

    /**
     * Get current resize information for debugging
     */
    getResizeInfo() {
        if (!this.textArea || this.initialHeight === null) {
            return null;
        }

        const content = this.textArea.value;
        const explicitLines = content.split('\n').length;
        const computedStyle = window.getComputedStyle(this.textArea);
        const lineHeight = parseInt(computedStyle.lineHeight) || 20;

        // Calculate height levels
        const doubleHeight = this.initialHeight * 2;
        const tripleHeight = this.initialHeight * 3;

        return {
            initialHeight: this.initialHeight,
            doubleHeight,
            tripleHeight,
            currentHeight: this.textArea.offsetHeight,
            maxHeight: tripleHeight,
            explicitLines,
            lineHeight,
            content: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
            heightLevel: this.getCurrentHeightLevel()
        };
    }

    /**
     * Get current height level (1=initial, 2=double, 3=triple)
     */
    getCurrentHeightLevel() {
        if (!this.textArea || this.initialHeight === null) {
            return 0;
        }

        const currentHeight = this.textArea.offsetHeight;
        const doubleHeight = this.initialHeight * 2;
        const tripleHeight = this.initialHeight * 3;

        if (currentHeight <= this.initialHeight + 5) { // 5px tolerance
            return 1; // Initial height
        } else if (currentHeight <= doubleHeight + 5) {
            return 2; // Double height
        } else if (currentHeight <= tripleHeight + 5) {
            return 3; // Triple height
        }

        return 3; // Default to triple if beyond
    }

    getCharacterCount() {
        return window.TextUtils.getCharacterCount(this.getValue());
    }

    getWordCount() {
        return window.TextUtils.getWordCount(this.getValue());
    }

    isEmpty() {
        return window.TextUtils.isEmpty(this.getValue());
    }

    isTooLong(maxLength) {
        return window.TextUtils.isTooLong(this.getValue(), maxLength);
    }

    // ============================================================================
    // HISTORY METHODS
    // ============================================================================

    saveToHistory() {
        const value = this.getValue();
        const currentHistory = this.getHistory();
        const newHistory = window.TextUtils.addToHistory(currentHistory, value);

        Utils.storage.set('textAreaHistory', newHistory);
    }

    getHistory() {
        return Utils.storage.get('textAreaHistory') || [];
    }

    loadFromHistory(index) {
        const historyItem = window.TextUtils.getHistoryItem(this.getHistory(), index);

        if (historyItem) {
            this.setValue(historyItem);
        }
    }

    clearHistory() {
        Utils.storage.remove('textAreaHistory');
    }

    // ============================================================================
    // MATCH STATE MANAGEMENT METHODS
    // ============================================================================

    /**
     * Reset the match replacement state
     * Call this when user starts a new search or moves cursor
     */
    resetMatchState() {
        this.hasReplacedTrigger = false;
        this.lastTriggeringWord = null;
        this.matchProcessor.resetMatchState();
    }
}

// ============================================================================
// EXPORT TO GLOBAL SCOPE
// ============================================================================

// Make class available globally
window.TextAreaManager = TextAreaManager;
window.textAreaManager = new TextAreaManager();
