// ============================================================================
// TEXTAREA MANAGER - Main Manager Class (Refactored)
// ============================================================================

class TextAreaManager {
    constructor() {
        // SSR/No-DOM safety check
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            console.warn('TextAreaManager requires a browser environment');
            this.destroyed = true;

            return;
        }

        this.isInitialized = false;
        this.initialHeight = null;
        this.destroyed = false;
        this.domReadyHandler = null;
        this.domReadyFired = false;
        this.onHeightChangeCallback = null;
        this.lastScrollTop = 0;
        this.ariaLiveRegion = null;
        this.lastAnnouncedHeightLevel = 0;
        this.isMatchClick = false;

        // Initialize component managers
        this.textArea = null;
        this.matchesEl = null;
        this.autoResizeManager = null;
        this.matchManager = null;
        this.eventManager = null;
        this.textAreaUtils = new window.TextAreaUtils();
        this.searchReplaceManager = null;

        this.init();
        this._ensureEventsOnDOMReady();
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

        if (!this.textArea || !this.matchesEl) {
            return;
        }

        // Initialize component managers
        this.autoResizeManager = new window.AutoResizeManager(this.textArea, this.initialHeight);
        this.matchManager = new window.MatchManager(this.textArea, this.matchesEl);
        this.eventManager = new window.EventManager(
            this.textArea,
            this.matchesEl,
            this.matchManager,
            this.autoResizeManager
        );

        // Set up height change callback
        if (this.autoResizeManager && this.onHeightChangeCallback) {
            this.autoResizeManager.onHeightChangeCallback = this.onHeightChangeCallback;
        }

        this.textAreaUtils.loadSavedHeight(this.textArea, this.initialHeight);
        Utils.dom.init(TEXTAREA_CONFIG.selectors);

        this.autoResizeManager.applyViewportClamp();

        if (this.textArea && this.initialHeight === null) {
            setTimeout(() => {
                if (this.textArea && this.initialHeight === null) {
                    this.initialHeight = this.textArea.offsetHeight;
                    this.autoResizeManager.initialHeight = this.initialHeight;
                }
            }, 0);
        }

        if (this.textArea) {
            this.searchReplaceManager = new window.SearchReplaceManager(this.textArea);
            this.setupSearchReplace();
        }

        this.isInitialized = true;
    }

    // Delegate to textAreaUtils
    loadSavedHeight() {
        this.textAreaUtils.loadSavedHeight(this.textArea, this.initialHeight);
    }


    bindEvents() {
        if (!this.eventManager) {
            return false;
        }

        return this.eventManager.bindEvents();
    }

    unbindEvents() {
        if (this.eventManager) {
            this.eventManager.unbindEvents();
        }
    }

    destroy() {
        this.destroyed = true;

        if (this.eventManager) {
            this.eventManager.destroy();
        }

        if (this.autoResizeManager) {
            this.autoResizeManager.destroy();
        }

        if (this.matchManager) {
            this.matchManager.destroy();
        }

        if (this.domReadyHandler && !this.domReadyFired) {
            document.removeEventListener('DOMContentLoaded', this.domReadyHandler);
            this.domReadyHandler = null;
        }

        if (this.searchReplaceManager?.destroy) {
            this.searchReplaceManager.destroy();
        }

        this.textArea = null;
        this.matchesEl = null;
        this.onHeightChangeCallback = null;

        // Clean up aria-live region
        if (this.ariaLiveRegion) {
            this.ariaLiveRegion.remove();
            this.ariaLiveRegion = null;
        }

        // Clean up textAreaUtils
        this.textAreaUtils = null;
    }

    // Delegate to eventManager
    handlePaste() {
        if (this.eventManager) {
            this.eventManager.handlePaste();
        }
    }

    _ensureEventsOnDOMReady() {
        if (this.domReadyFired) {
            return;
        }

        if (document.readyState === 'loading') {
            this.domReadyHandler = () => {
                this.domReadyFired = true;
                document.removeEventListener('DOMContentLoaded', this.domReadyHandler);
                this._retryInitAndBind();
            };
            document.addEventListener('DOMContentLoaded', this.domReadyHandler);
        } else {
            this.domReadyFired = true;
            setTimeout(() => this._retryInitAndBind(), 0);
        }
    }

    _retryInitAndBind() {
        if (!this.textArea || !this.matchesEl) {
            this.textArea = Utils.dom.get(TEXTAREA_CONFIG.selectors.textArea);
            this.matchesEl = Utils.dom.get(TEXTAREA_CONFIG.selectors.matches);

            if (this.textArea && !this.searchReplaceManager) {
                this.searchReplaceManager = new window.SearchReplaceManager(this.textArea);
            }
        }

        if (!this.isInitialized) {
            this.init();
        }

        const success = this.bindEvents();

        if (success) {
            console.log('✅ Events successfully bound after DOM ready');
            const resizeDelays = [100, 500, 1000, 2000];

            resizeDelays.forEach(delay => {
                setTimeout(() => {
                    if (this.textArea && !this.destroyed && this.autoResizeManager) {
                        this.autoResizeManager.clearResizeCache();
                        this.autoResizeManager.ensureInitialHeight();
                        this.autoResizeManager.autoResize();
                    }
                }, delay);
            });
        }
    }

    // ============================================================================
    // DELEGATED METHODS
    // ============================================================================

    async handleInput(e) {
        if (this.eventManager) {
            await this.eventManager.handleInput(e);
        }
    }

    handleCompositionStart() {
        if (this.eventManager) {
            this.eventManager.handleCompositionStart();
        }
    }

    handleCompositionEnd() {
        if (this.eventManager) {
            this.eventManager.handleCompositionEnd();
        }
    }

    handleMatchListItemClick(e) {
        if (this.eventManager) {
            this.eventManager.handleMatchListItemClick(e);
        }
    }

    handleResize() {
        if (this.eventManager) {
            this.eventManager.handleResize();
        }
    }

    handleWindowResize() {
        if (this.eventManager) {
            this.eventManager.handleWindowResize();
        }
    }

    // ============================================================================
    // DELEGATED MATCH METHODS
    // ============================================================================

    async updateMatches(value, cursorPosition) {
        if (this.matchManager) {
            await this.matchManager.updateMatches(value, cursorPosition);
        }
    }

    clearMatches() {
        if (this.matchManager) {
            this.matchManager.clearMatches();
        }
    }

    resetMatchState() {
        if (this.matchManager) {
            this.matchManager.resetMatchState();
        }
    }

    // ============================================================================
    // DELEGATED TEXT METHODS
    // ============================================================================

    insertText(text) {
        if (this.matchManager) {
            this.matchManager.insertText(text);
        }
    }

    appendToEnd(text) {
        if (this.matchManager) {
            this.matchManager.appendToEnd(text);
        }
    }

    replaceTriggeringWord(replacement) {
        if (this.matchManager) {
            this.matchManager.replaceTriggeringWord(replacement);
        }
    }

    triggerInputEvent() {
        if (this.matchManager) {
            this.matchManager.triggerInputEvent();
        }
    }

    // ============================================================================
    // DELEGATED SEARCH AND REPLACE METHODS
    // ============================================================================

    setupSearchReplace() {
        if (this.searchReplaceManager) {
            this.searchReplaceManager.setupSearchReplace();
        }
    }

    // ============================================================================
    // DELEGATED PUBLIC API METHODS
    // ============================================================================

    getValue() {
        if (this.textAreaUtils) {
            return this.textAreaUtils.getValue(this.textArea);
        }

        return '';
    }

    setValue(value, options = {}) {
        if (this.textAreaUtils) {
            this.textAreaUtils.setValue(this.textArea, value, {
                ...options,
                autoResizeManager: this.autoResizeManager,
                isMatchClick: this.isMatchClick
            });
        }
    }

    getCursorPosition() {
        if (this.textAreaUtils) {
            return this.textAreaUtils.getCursorPosition(this.textArea);
        }

        return 0;
    }

    setCursorPosition(position) {
        if (this.textAreaUtils) {
            this.textAreaUtils.setCursorPosition(this.textArea, position);
        }
    }

    focus() {
        if (this.textAreaUtils) {
            this.textAreaUtils.focus(this.textArea);
        }
    }

    blur() {
        if (this.textAreaUtils) {
            this.textAreaUtils.blur(this.textArea);
        }
    }

    select() {
        if (this.textAreaUtils) {
            this.textAreaUtils.select(this.textArea);
        }
    }

    clear() {
        if (this.textAreaUtils) {
            this.textAreaUtils.clear(this.textArea);
        }
    }

    getWordAtCursor() {
        if (this.textAreaUtils) {
            return this.textAreaUtils.getWordAtCursor(this.textArea);
        }

        return '';
    }

    replaceWordAtCursor(newWord) {
        if (this.textAreaUtils) {
            this.textAreaUtils.replaceWordAtCursor(this.textArea, newWord);
        }
    }

    getTextBeforeCursor() {
        if (this.textAreaUtils) {
            return this.textAreaUtils.getTextBeforeCursor(this.textArea);
        }

        return '';
    }

    getTextAfterCursor() {
        if (this.textAreaUtils) {
            return this.textAreaUtils.getTextAfterCursor(this.textArea);
        }

        return '';
    }

    insertAtCursor(text, options = {}) {
        if (this.textAreaUtils) {
            this.textAreaUtils.insertAtCursor(this.textArea, text, options);
        }
    }

    autoResize() {
        if (this.autoResizeManager) {
            this.autoResizeManager.autoResize();
        }
    }

    // ============================================================================
    // DELEGATED AUTO RESIZE METHODS
    // ============================================================================

    updateResizeCache(content) {
        if (this.autoResizeManager) {
            this.autoResizeManager.updateResizeCache(content);
        }
    }

    clearResizeCache() {
        if (this.autoResizeManager) {
            this.autoResizeManager.clearResizeCache();
        }
    }

    clearStyleCache() {
        if (this.autoResizeManager) {
            this.autoResizeManager.clearStyleCache();
        }
    }

    ensureInitialHeight() {
        if (this.autoResizeManager) {
            this.autoResizeManager.ensureInitialHeight();
        }
    }

    resetToInitialHeight() {
        if (this.autoResizeManager) {
            this.autoResizeManager.resetToInitialHeight();
        }
    }

    resetInitialHeight() {
        if (this.autoResizeManager) {
            this.autoResizeManager.resetInitialHeight();
        }
    }

    getCurrentHeightLevel() {
        if (this.autoResizeManager) {
            return this.autoResizeManager.getCurrentHeightLevel();
        }

        return 0;
    }

    applyViewportClamp() {
        if (this.autoResizeManager) {
            this.autoResizeManager.applyViewportClamp();
        }
    }

    // ============================================================================
    // DELEGATED UTILITY METHODS
    // ============================================================================

    getCharacterCount() {
        if (this.textAreaUtils) {
            return this.textAreaUtils.getCharacterCount(this.getValue());
        }

        return 0;
    }

    getWordCount() {
        if (this.textAreaUtils) {
            return this.textAreaUtils.getWordCount(this.getValue());
        }

        return 0;
    }

    isEmpty() {
        if (this.textAreaUtils) {
            return this.textAreaUtils.isEmpty(this.getValue());
        }

        return true;
    }

    isTooLong(maxLength) {
        if (this.textAreaUtils) {
            return this.textAreaUtils.isTooLong(this.getValue(), maxLength);
        }

        return false;
    }

    // ============================================================================
    // DELEGATED HISTORY METHODS
    // ============================================================================

    saveToHistory() {
        if (this.textAreaUtils) {
            this.textAreaUtils.saveToHistory(this.getValue());
        }
    }

    getHistory() {
        if (this.textAreaUtils) {
            return this.textAreaUtils.getHistory();
        }

        return [];
    }

    loadFromHistory(index) {
        if (this.textAreaUtils) {
            this.textAreaUtils.loadFromHistory(this.textArea, index);
        }
    }

    clearHistory() {
        if (this.textAreaUtils) {
            this.textAreaUtils.clearHistory();
        }
    }

    // ============================================================================
    // DELEGATED UTILITY METHODS
    // ============================================================================

    setDebug(enabled) {
        if (this.textAreaUtils) {
            this.textAreaUtils.setDebug(enabled);
        }
    }

    onHeightChange(callback) {
        if (typeof callback !== 'function') {
            console.warn('onHeightChange: callback must be a function');

            return;
        }

        this.onHeightChangeCallback = callback;

        // Pass callback to auto-resize manager if it exists
        if (this.autoResizeManager) {
            this.autoResizeManager.onHeightChangeCallback = callback;
        }
    }

    offHeightChange() {
        this.onHeightChangeCallback = null;

        // Clear callback from auto-resize manager
        if (this.autoResizeManager) {
            this.autoResizeManager.onHeightChangeCallback = null;
        }
    }

    enableA11yAnnouncements(enabled = true) {
        if (this.textAreaUtils) {
            this.textAreaUtils.enableA11yAnnouncements(this.ariaLiveRegion, enabled);
        }
    }

    announceHeightLevel(heightLevel) {
        if (this.textAreaUtils) {
            this.textAreaUtils.announceHeightLevel(this.ariaLiveRegion, heightLevel, this.lastAnnouncedHeightLevel);
        }
    }

    debug(...args) {
        if (this.textAreaUtils) {
            this.textAreaUtils.debug(...args);
        }
    }

    getMetrics() {
        if (this.textAreaUtils) {
            return this.textAreaUtils.getMetrics();
        }

        return {};
    }

    resetMetrics() {
        if (this.textAreaUtils) {
            this.textAreaUtils.resetMetrics();
        }
    }

    // ============================================================================
    // ADDITIONAL UTILITY METHODS
    // ============================================================================

    getResizeInfo() {
        if (this.autoResizeManager) {
            return this.autoResizeManager.getResizeInfo();
        }

        return null;
    }

    resetMatchClickFlag() {
        if (this.matchManager) {
            this.matchManager.resetMatchClickFlag();
        }
    }
}

// ============================================================================
// EXPORT TO GLOBAL SCOPE
// ============================================================================

// Make class available globally (instantiated by textarea.js)
window.TextAreaManager = TextAreaManager;
