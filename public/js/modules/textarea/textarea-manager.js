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

        // Schedule page load resize after DOM and any localhost values are loaded
        this.schedulePageLoadResize();
    }

    loadSavedHeight() {
        const savedHeight = Utils.storage.get('textAreaHeight');

        // Store initial height BEFORE loading saved height to preserve baseline
        if (this.textArea && this.initialHeight === null) {
            this.initialHeight = this.textArea.offsetHeight;
        }

        // Clear saved height if it's too large (indicating old larger initial height)
        // This allows the textarea to start with the new smaller initial height
        if (savedHeight && this.textArea) {
            const savedHeightValue = parseInt(savedHeight);
            const expectedInitialHeight = this.initialHeight || this.textArea.offsetHeight;

            // If saved height is significantly larger than current initial height, clear it
            if (savedHeightValue > expectedInitialHeight * 1.5) {
                Utils.storage.remove('textAreaHeight');

                return;
            }

            // Only load saved height if it's different from initial height and not too large
            if (savedHeight !== `${this.initialHeight}px`) {
                this.textArea.style.height = savedHeight;
            }
        }
    }

    schedulePageLoadResize() {
        if (!this.textArea) {
            return;
        }

        // Multiple resize attempts to handle different loading scenarios
        const resizeDelays = [100, 500, 1000, 2000]; // Progressive delays for localhost loading

        resizeDelays.forEach(delay => {
            setTimeout(() => {
                if (this.textArea && document.readyState === 'complete') {
                    // Clear cache and recalculate with current viewport
                    this.clearResizeCache();
                    this.ensureInitialHeight();
                    this.autoResize();
                }
            }, delay);
        });

        // Also resize when DOM content is fully loaded
        if (document.readyState !== 'complete') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => {
                    if (this.textArea) {
                        this.clearResizeCache();
                        this.ensureInitialHeight();
                        this.autoResize();
                    }
                }, 100);
            });
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

        // Add window resize listener to recalculate viewport limits
        window.addEventListener('resize', Utils.async.debounce(this.handleWindowResize.bind(this), 250));

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

    handleWindowResize() {
        // Clear resize cache to force recalculation with new viewport dimensions
        this.clearResizeCache();

        // Recalculate and apply resize with new viewport limits
        this.autoResize();
    }

    // ============================================================================
    // MATCH PROCESSING METHODS
    // ============================================================================

    async updateMatches(value, cursorPosition) {
        const textBeforeCursor = window.TextUtils.getTextBeforeCursor(value, cursorPosition);

        if (!this.matchProcessor.isReadyForMatching(textBeforeCursor)) {
            this.matchesEl.innerHTML = await this.matchProcessor.getSampleMatches();
            this.hasReplacedTrigger = false;

            return;
        }

        const matches = await this.matchProcessor.findMatches(textBeforeCursor);

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

        // Handle cases where we should append instead of replace
        if (this.shouldAppendInsteadOfReplace()) {
            this.appendToEnd(replacement);

            return;
        }

        // Attempt to replace the triggering word
        if (this.attemptTriggeringWordReplacement(triggeringWord, replacement)) {
            this.hasReplacedTrigger = true;
        } else {
            this.insertText(replacement);
        }

        this.triggerInputEvent();
    }

    shouldAppendInsteadOfReplace() {
        return this.hasReplacedTrigger ||
               (this.textArea.value.includes('${') && this.textArea.value.includes('}'));
    }

    attemptTriggeringWordReplacement(triggeringWord, replacement) {
        const wordPosition = window.MatchProcessorUtils.findTriggeringWordPosition(
            this.textArea.value,
            triggeringWord,
            this.textArea.selectionStart
        );

        if (wordPosition === -1) {
            return false;
        }

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

        return true;
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

        try {
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
        } catch (error) {
            console.warn('Auto-resize error:', error);
            // Fallback: reset to initial height on error
            if (this.initialHeight !== null) {
                this.textArea.style.height = `${this.initialHeight}px`;
            }
        }
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
            const contentHeight = Math.max(1,
                this.initialHeight - paddingTop - paddingBottom - borderTop - borderBottom);
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
                linesInInitialHeight: 3,
                lineHeight: 20,
                paddingTop: 8,
                paddingBottom: 8,
                borderTop: 0,
                borderBottom: 0
            };
        }
    }

    /**
     * Apply the calculated resize based on content with viewport height limits
     */
    applyResize(resizeData) {
        const {
            totalLines, linesInInitialHeight, lineHeight,
            paddingTop, paddingBottom, borderTop, borderBottom
        } = resizeData;

        // Calculate viewport height limit (90vh)
        const viewportHeight = window.innerHeight;
        const maxHeightLimit = Math.floor(viewportHeight * 0.9);

        // Calculate minimum height needed for content
        const contentHeight = totalLines * lineHeight;
        const minHeightNeeded = contentHeight + paddingTop + paddingBottom + borderTop + borderBottom;

        // Calculate natural height (let textarea expand naturally)
        this.textArea.style.height = 'auto';
        const naturalHeight = this.textArea.scrollHeight;

        // Determine the appropriate height
        let newHeight;

        if (totalLines <= linesInInitialHeight) {
            // Content fits in initial height
            newHeight = this.initialHeight;
        } else if (naturalHeight <= maxHeightLimit) {
            // Natural height fits within viewport limit
            newHeight = naturalHeight;
        } else if (minHeightNeeded <= maxHeightLimit) {
            // We can fit the content within viewport limit
            newHeight = minHeightNeeded;
        } else {
            // Content exceeds viewport limit, use max height
            newHeight = maxHeightLimit;
        }

        // Ensure we don't go below initial height
        newHeight = Math.max(newHeight, this.initialHeight);

        this.textArea.style.height = `${newHeight}px`;
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

        // Calculate viewport-based height limits
        const viewportHeight = window.innerHeight;
        const maxHeightLimit = Math.floor(viewportHeight * 0.9);

        // Calculate content requirements
        const contentHeight = explicitLines * lineHeight;
        const paddingTop = parseInt(computedStyle.paddingTop) || 8;
        const paddingBottom = parseInt(computedStyle.paddingBottom) || 8;
        const borderTop = parseInt(computedStyle.borderTopWidth) || 0;
        const borderBottom = parseInt(computedStyle.borderBottomWidth) || 0;
        const minHeightNeeded = contentHeight + paddingTop + paddingBottom + borderTop + borderBottom;

        return {
            initialHeight: this.initialHeight,
            currentHeight: this.textArea.offsetHeight,
            maxHeight: maxHeightLimit,
            viewportHeight,
            explicitLines,
            lineHeight,
            contentHeight,
            minHeightNeeded,
            content: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
            heightLevel: this.getCurrentHeightLevel(),
            isAtMaxHeight: this.textArea.offsetHeight >= maxHeightLimit - 5 // 5px tolerance
        };
    }

    /**
     * Get current height level (1=initial, 2=expanded, 3=viewport limit)
     */
    getCurrentHeightLevel() {
        if (!this.textArea || this.initialHeight === null) {
            return 0;
        }

        const currentHeight = this.textArea.offsetHeight;
        const viewportHeight = window.innerHeight;
        const maxHeightLimit = Math.floor(viewportHeight * 0.9);

        if (currentHeight <= this.initialHeight + 5) { // 5px tolerance
            return 1; // Initial height
        } else if (currentHeight >= maxHeightLimit - 5) {
            return 3; // At viewport limit
        } else {
            return 2; // Expanded but not at limit
        }
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
