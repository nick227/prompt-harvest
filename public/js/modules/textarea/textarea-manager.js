// ============================================================================
// TEXTAREA MANAGER - Main Manager Class (Refactored)
// ============================================================================

/**
 * @typedef {Object} TextAreaManagerDependencies
 * @property {typeof TextAreaUtils} [TextAreaUtils] - TextAreaUtils class
 * @property {typeof Utils} [Utils] - Utils object
 * @property {Object} [TEXTAREA_CONFIG] - Configuration object
 * @property {typeof AutoResizeManager} [AutoResizeManager] - AutoResizeManager class
 * @property {typeof MatchManager} [MatchManager] - MatchManager class
 * @property {typeof EventManager} [EventManager] - EventManager class
 * @property {typeof SearchReplaceManager} [SearchReplaceManager] - SearchReplaceManager class
 */

/**
 * @typedef {'idle' | 'init' | 'bound' | 'destroyed'} TextAreaManagerState
 */

/**
 * Main TextAreaManager class - Facade for textarea functionality
 *
 * @class TextAreaManager
 * @description Provides a unified interface for textarea auto-resize, match processing,
 * event handling, and utility functions. Acts as a facade that delegates to specialized managers.
 *
 * @example
 * // Basic usage with global dependencies
 * const manager = new TextAreaManager();
 *
 * // Usage with dependency injection
 * const manager = new TextAreaManager({
 *   TextAreaUtils: MyTextAreaUtils,
 *   Utils: MyUtils,
 *   TEXTAREA_CONFIG: MyConfig
 * });
 */
class TextAreaManager {
    constructor(dependencies = {}) {
        // SSR/No-DOM safety check
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            console.warn('TextAreaManager requires a browser environment');
            this.destroyed = true;
            this.state = 'destroyed';

            return;
        }

        // Extract dependencies with fallbacks to globals
        this.TextAreaUtils = dependencies.TextAreaUtils || window.TextAreaUtils;
        this.Utils = dependencies.Utils || (typeof Utils !== 'undefined' ? Utils : null);
        this.TEXTAREA_CONFIG = dependencies.TEXTAREA_CONFIG || (typeof TEXTAREA_CONFIG !== 'undefined' ? TEXTAREA_CONFIG : null);
        this.AutoResizeManager = dependencies.AutoResizeManager || window.AutoResizeManager;
        this.MatchManager = dependencies.MatchManager || window.MatchManager;
        this.EventManager = dependencies.EventManager || window.EventManager;
        this.SearchReplaceManager = dependencies.SearchReplaceManager || window.SearchReplaceManager;

        // Check for required dependencies
        if (!this._requireDependencies()) {
            this.destroyed = true;
            this.state = 'destroyed';

            return;
        }

        this.isInitialized = false;
        this.initialHeight = null;
        this.destroyed = false;
        this.state = 'idle'; // 'idle' | 'init' | 'bound' | 'destroyed'
        this.domReadyHandler = null;
        this.domReadyFired = false;
        this.onHeightChangeCallback = null;
        this.ariaLiveRegion = null;
        this.lastAnnouncedHeightLevel = 0;
        this.isMatchClick = false;
        this.pendingTimeouts = new Set();
        this.eventsBound = false;

        // Initialize component managers
        this.textArea = null;
        this.matchesEl = null;
        this.autoResizeManager = null;
        this.matchManager = null;
        this.eventManager = null;
        this.textAreaUtils = new this.TextAreaUtils();
        this.searchReplaceManager = null;

        this.init();
        this._ensureEventsOnDOMReady();
    }

    // ============================================================================
    // PRIVATE UTILITY METHODS
    // ============================================================================

    _requireDependencies() {
        const required = {
            TextAreaUtils: this.TextAreaUtils,
            Utils: this.Utils,
            TEXTAREA_CONFIG: this.TEXTAREA_CONFIG,
            AutoResizeManager: this.AutoResizeManager,
            MatchManager: this.MatchManager,
            EventManager: this.EventManager,
            SearchReplaceManager: this.SearchReplaceManager
        };

        for (const [name, value] of Object.entries(required)) {
            if (!value) {
                console.error(`TextAreaManager: ${name} not found. Ensure required dependencies are loaded first.`);

                return false;
            }
        }

        return true;
    }

    _clearAllTimers() {
        this.pendingTimeouts.forEach(timeoutId => {
            clearTimeout(timeoutId);
        });
        this.pendingTimeouts.clear();
    }

    // ============================================================================
    // INITIALIZATION METHODS
    // ============================================================================

    init() {
        if (this.isInitialized) {
            return;
        }

        this.state = 'init';

        this.textArea = this.Utils.dom.get(this.TEXTAREA_CONFIG.selectors.textArea);
        this.matchesEl = this.Utils.dom.get(this.TEXTAREA_CONFIG.selectors.matches);

        if (!this.textArea || !this.matchesEl) {
            this.state = 'idle';

            return;
        }

        // Initialize component managers
        this.autoResizeManager = new this.AutoResizeManager(this.textArea, this.initialHeight);
        this.matchManager = new this.MatchManager(this.textArea, this.matchesEl);
        this.eventManager = new this.EventManager(
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
        this.Utils.dom.init(this.TEXTAREA_CONFIG.selectors);

        this.autoResizeManager.applyViewportClamp();

        if (this.textArea && this.initialHeight === null) {
            // Try immediate capture first
            if (this.textArea.offsetHeight > 0) {
                this.initialHeight = this.textArea.offsetHeight;
                if (this.autoResizeManager) {
                    this.autoResizeManager.initialHeight = this.initialHeight;
                }
            } else {
                // Fallback to timeout only if immediate capture failed
                const timeoutId = setTimeout(() => {
                    this.pendingTimeouts.delete(timeoutId);
                    if (this.destroyed || !this.textArea || this.initialHeight !== null) {
                        return;
                    }
                    // Double-check the element is still valid and has dimensions
                    if (this.textArea.offsetHeight > 0) {
                        this.initialHeight = this.textArea.offsetHeight;
                        if (this.autoResizeManager) {
                            this.autoResizeManager.initialHeight = this.initialHeight;
                        }
                    }
                }, 0);

                this.pendingTimeouts.add(timeoutId);
            }
        }

        if (this.textArea) {
            this.searchReplaceManager = new this.SearchReplaceManager(this.textArea);
            this.setupSearchReplace();
        }

        this.isInitialized = true;
        this.state = 'idle';
    }

    /**
     * Load saved height from localStorage
     * @returns {void}
     */
    loadSavedHeight() {
        if (this.destroyed) {
            return;
        }
        this.textAreaUtils.loadSavedHeight(this.textArea, this.initialHeight);
    }


    /**
     * Bind event listeners to textarea and matches elements
     * @returns {boolean} True if events were bound successfully
     */
    bindEvents() {
        if (this.destroyed) {
            return false;
        }
        if (!this.eventManager) {
            return false;
        }

        // Idempotent binding - only bind if not already bound
        if (this.eventsBound) {
            return true;
        }

        const success = this.eventManager.bindEvents();

        if (success) {
            this.eventsBound = true;
            this.state = 'bound';
        }

        return success;
    }

    unbindEvents() {
        if (this.destroyed) {
            return;
        }
        if (this.eventManager) {
            this.eventManager.unbindEvents();
        }
        this.eventsBound = false;
        this.state = 'idle';
    }

    destroy() {
        // 1. Early return if already destroyed (idempotent)
        if (this.destroyed) {
            return;
        }

        // 2. Unbind listeners first
        if (this.eventsBound) {
            this.unbindEvents();
        }

        // 3. Set destroyed state
        this.destroyed = true;
        this.state = 'destroyed';

        // 4. Cancel all pending timeouts
        this._clearAllTimers();

        // 5. Destroy managers
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

        // 6. Clean up aria-live region
        if (this.ariaLiveRegion) {
            this.ariaLiveRegion.remove();
            this.ariaLiveRegion = null;
        }

        // 7. Null out all references
        this.textArea = null;
        this.matchesEl = null;
        this.onHeightChangeCallback = null;
        this.textAreaUtils = null;
        this.eventsBound = false;
        this.eventManager = null;
        this.autoResizeManager = null;
        this.matchManager = null;
        this.searchReplaceManager = null;
    }

    // Delegate to eventManager
    handlePaste() {
        if (this.destroyed) {
            return;
        }
        if (this.eventManager) {
            this.eventManager.handlePaste();
        }
    }

    _ensureEventsOnDOMReady() {
        if (this.domReadyFired || this.destroyed) {
            return;
        }

        if (document.readyState === 'loading') {
            this.domReadyHandler = () => {
                if (this.destroyed) {
                    return;
                }
                this.domReadyFired = true;
                document.removeEventListener('DOMContentLoaded', this.domReadyHandler);
                this.domReadyHandler = null;
                this._retryInitAndBind();
            };
            document.addEventListener('DOMContentLoaded', this.domReadyHandler);
        } else {
            this.domReadyFired = true;
            const timeoutId = setTimeout(() => {
                this.pendingTimeouts.delete(timeoutId);
                if (!this.destroyed) {
                    this._retryInitAndBind();
                }
            }, 0);

            this.pendingTimeouts.add(timeoutId);
        }
    }

    _retryInitAndBind() {
        if (this.destroyed) {
            return;
        }

        if (!this.textArea || !this.matchesEl) {
            this.textArea = this.Utils.dom.get(this.TEXTAREA_CONFIG.selectors.textArea);
            this.matchesEl = this.Utils.dom.get(this.TEXTAREA_CONFIG.selectors.matches);
        }

        if (!this.isInitialized && !this.destroyed) {
            this.init();
        }

        if (this.destroyed) {
            return;
        }

        const success = this.bindEvents();

        if (success && !this.destroyed) {
            const resizeDelays = [100, 500, 1000, 2000];

            resizeDelays.forEach(delay => {
                const timeoutId = setTimeout(() => {
                    this.pendingTimeouts.delete(timeoutId);
                    if (this.destroyed || !this.textArea || !this.autoResizeManager) {
                        return;
                    }
                    this.autoResizeManager.clearResizeCache();
                    this.autoResizeManager.ensureInitialHeight();
                    this.autoResizeManager.autoResize();
                }, delay);

                this.pendingTimeouts.add(timeoutId);
            });
        }
    }

    // ============================================================================
    // DELEGATED METHODS
    // ============================================================================

    async handleInput(e) {
        if (this.destroyed) {
            return;
        }
        if (this.eventManager) {
            await this.eventManager.handleInput(e);
        }
    }

    handleCompositionStart() {
        if (this.destroyed) {
            return;
        }
        if (this.eventManager) {
            this.eventManager.handleCompositionStart();
        }
    }

    handleCompositionEnd() {
        if (this.destroyed) {
            return;
        }
        if (this.eventManager) {
            this.eventManager.handleCompositionEnd();
        }
    }

    handleMatchListItemClick(e) {
        if (this.destroyed) {
            return;
        }
        if (this.eventManager) {
            this.eventManager.handleMatchListItemClick(e);
        }
    }

    handleResize() {
        if (this.destroyed) {
            return;
        }
        if (this.eventManager) {
            this.eventManager.handleResize();
        }
    }

    handleWindowResize() {
        if (this.destroyed) {
            return;
        }
        if (this.eventManager) {
            this.eventManager.handleWindowResize();
        }
    }

    // ============================================================================
    // DELEGATED MATCH METHODS
    // ============================================================================

    async updateMatches(value, cursorPosition) {
        if (this.destroyed) {
            return;
        }
        if (this.matchManager) {
            await this.matchManager.updateMatches(value, cursorPosition);
        }
    }

    clearMatches() {
        if (this.destroyed) {
            return;
        }
        if (this.matchManager) {
            this.matchManager.clearMatches();
        }
    }

    resetMatchState() {
        if (this.destroyed) {
            return;
        }
        if (this.matchManager) {
            this.matchManager.resetMatchState();
        }
    }

    // ============================================================================
    // DELEGATED TEXT METHODS
    // ============================================================================

    insertText(text) {
        if (this.destroyed) {
            return;
        }
        if (this.matchManager) {
            this.matchManager.insertText(text);
        }
    }

    appendToEnd(text) {
        if (this.destroyed) {
            return;
        }
        if (this.matchManager) {
            this.matchManager.appendToEnd(text);
        }
    }

    replaceTriggeringWord(replacement) {
        if (this.destroyed) {
            return;
        }
        if (this.matchManager) {
            this.matchManager.replaceTriggeringWord(replacement);
        }
    }

    triggerInputEvent() {
        if (this.destroyed) {
            return;
        }
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

    /**
     * Get the current value of the textarea
     * @returns {string} The textarea value
     */
    getValue() {
        if (this.destroyed) {
            return '';
        }
        if (this.textAreaUtils) {
            return this.textAreaUtils.getValue(this.textArea);
        }

        return '';
    }

    /**
     * Set the value of the textarea
     * @param {string} value - The new value to set
     * @param {Object} [options={}] - Options for setting the value
     * @returns {void}
     */
    setValue(value, options = {}) {
        if (this.destroyed) {
            return;
        }
        if (this.textAreaUtils) {
            this.textAreaUtils.setValue(this.textArea, value, {
                ...options,
                autoResizeManager: this.autoResizeManager,
                isMatchClick: this.isMatchClick
            });
        }
    }

    getCursorPosition() {
        if (this.destroyed) {
            return 0;
        }
        if (this.textAreaUtils) {
            return this.textAreaUtils.getCursorPosition(this.textArea);
        }

        return 0;
    }

    setCursorPosition(position) {
        if (this.destroyed) {
            return;
        }
        if (this.textAreaUtils) {
            this.textAreaUtils.setCursorPosition(this.textArea, position);
        }
    }

    focus() {
        if (this.destroyed) {
            return;
        }
        if (this.textAreaUtils) {
            this.textAreaUtils.focus(this.textArea);
        }
    }

    blur() {
        if (this.destroyed) {
            return;
        }
        if (this.textAreaUtils) {
            this.textAreaUtils.blur(this.textArea);
        }
    }

    select() {
        if (this.destroyed) {
            return;
        }
        if (this.textAreaUtils) {
            this.textAreaUtils.select(this.textArea);
        }
    }

    clear() {
        if (this.destroyed) {
            return;
        }
        if (this.textAreaUtils) {
            this.textAreaUtils.clear(this.textArea);
        }
    }

    getWordAtCursor() {
        if (this.destroyed) {
            return '';
        }
        if (this.textAreaUtils) {
            return this.textAreaUtils.getWordAtCursor(this.textArea);
        }

        return '';
    }

    replaceWordAtCursor(newWord) {
        if (this.destroyed) {
            return;
        }
        if (this.textAreaUtils) {
            this.textAreaUtils.replaceWordAtCursor(this.textArea, newWord);
        }
    }

    getTextBeforeCursor() {
        if (this.destroyed) {
            return '';
        }
        if (this.textAreaUtils) {
            return this.textAreaUtils.getTextBeforeCursor(this.textArea);
        }

        return '';
    }

    getTextAfterCursor() {
        if (this.destroyed) {
            return '';
        }
        if (this.textAreaUtils) {
            return this.textAreaUtils.getTextAfterCursor(this.textArea);
        }

        return '';
    }

    insertAtCursor(text, options = {}) {
        if (this.destroyed) {
            return;
        }
        if (this.textAreaUtils) {
            this.textAreaUtils.insertAtCursor(this.textArea, text, options);
        }
    }

    autoResize() {
        if (this.destroyed) {
            return;
        }
        if (this.autoResizeManager) {
            this.autoResizeManager.autoResize();
        }
    }

    // ============================================================================
    // DELEGATED AUTO RESIZE METHODS
    // ============================================================================

    updateResizeCache(content) {
        if (this.destroyed) {
            return;
        }
        if (this.autoResizeManager) {
            this.autoResizeManager.updateResizeCache(content);
        }
    }

    clearResizeCache() {
        if (this.destroyed) {
            return;
        }
        if (this.autoResizeManager) {
            this.autoResizeManager.clearResizeCache();
        }
    }

    clearStyleCache() {
        if (this.destroyed) {
            return;
        }
        if (this.autoResizeManager) {
            this.autoResizeManager.clearStyleCache();
        }
    }

    ensureInitialHeight() {
        if (this.destroyed) {
            return;
        }
        if (this.autoResizeManager) {
            this.autoResizeManager.ensureInitialHeight();
        }
    }

    resetToInitialHeight() {
        if (this.destroyed) {
            return;
        }
        if (this.autoResizeManager) {
            this.autoResizeManager.resetToInitialHeight();
        }
    }

    resetInitialHeight() {
        if (this.destroyed) {
            return;
        }
        if (this.autoResizeManager) {
            this.autoResizeManager.resetInitialHeight();
        }
    }

    getCurrentHeightLevel() {
        if (this.destroyed) {
            return 0;
        }
        if (this.autoResizeManager) {
            return this.autoResizeManager.getCurrentHeightLevel();
        }

        return 0;
    }

    applyViewportClamp() {
        if (this.destroyed) {
            return;
        }
        if (this.autoResizeManager) {
            this.autoResizeManager.applyViewportClamp();
        }
    }

    // ============================================================================
    // DELEGATED UTILITY METHODS
    // ============================================================================

    getCharacterCount() {
        if (this.destroyed) {
            return 0;
        }
        if (this.textAreaUtils) {
            return this.textAreaUtils.getCharacterCount(this.getValue());
        }

        return 0;
    }

    getWordCount() {
        if (this.destroyed) {
            return 0;
        }
        if (this.textAreaUtils) {
            return this.textAreaUtils.getWordCount(this.getValue());
        }

        return 0;
    }

    isEmpty() {
        if (this.destroyed) {
            return true;
        }
        if (this.textAreaUtils) {
            return this.textAreaUtils.isEmpty(this.getValue());
        }

        return true;
    }

    isTooLong(maxLength) {
        if (this.destroyed) {
            return false;
        }
        if (this.textAreaUtils) {
            return this.textAreaUtils.isTooLong(this.getValue(), maxLength);
        }

        return false;
    }

    // ============================================================================
    // DELEGATED HISTORY METHODS
    // ============================================================================

    saveToHistory() {
        if (this.destroyed) {
            return;
        }
        if (this.textAreaUtils) {
            this.textAreaUtils.saveToHistory(this.getValue());
        }
    }

    getHistory() {
        if (this.destroyed) {
            return [];
        }
        if (this.textAreaUtils) {
            return this.textAreaUtils.getHistory();
        }

        return [];
    }

    loadFromHistory(index) {
        if (this.destroyed) {
            return;
        }
        if (this.textAreaUtils) {
            this.textAreaUtils.loadFromHistory(this.textArea, index);
        }
    }

    clearHistory() {
        if (this.destroyed) {
            return;
        }
        if (this.textAreaUtils) {
            this.textAreaUtils.clearHistory();
        }
    }

    // ============================================================================
    // DELEGATED UTILITY METHODS
    // ============================================================================

    setDebug(enabled) {
        if (this.destroyed) {
            return;
        }
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
        if (this.destroyed) {
            return;
        }
        if (this.textAreaUtils) {
            this.ariaLiveRegion = this.textAreaUtils.enableA11yAnnouncements(this.ariaLiveRegion, enabled);
        }
    }

    announceHeightLevel(heightLevel) {
        if (this.destroyed) {
            return;
        }
        if (this.textAreaUtils) {
            this.textAreaUtils.announceHeightLevel(this.ariaLiveRegion, heightLevel, this.lastAnnouncedHeightLevel);
            this.lastAnnouncedHeightLevel = heightLevel;
        }
    }

    debug(...args) {
        if (this.destroyed) {
            return;
        }
        if (this.textAreaUtils) {
            this.textAreaUtils.debug(...args);
        }
    }

    getMetrics() {
        if (this.destroyed) {
            return {};
        }
        if (this.textAreaUtils) {
            return this.textAreaUtils.getMetrics();
        }

        return {};
    }

    resetMetrics() {
        if (this.destroyed) {
            return;
        }
        if (this.textAreaUtils) {
            this.textAreaUtils.resetMetrics();
        }
    }

    // ============================================================================
    // ADDITIONAL UTILITY METHODS
    // ============================================================================

    getResizeInfo() {
        if (this.destroyed) {
            return null;
        }
        if (this.autoResizeManager) {
            return this.autoResizeManager.getResizeInfo();
        }

        return null;
    }

    resetMatchClickFlag() {
        if (this.destroyed) {
            return;
        }
        if (this.matchManager) {
            this.matchManager.resetMatchClickFlag();
        }
    }

    // ============================================================================
    // REINITIALIZATION METHODS
    // ============================================================================

    reinitialize() {
        if (this.destroyed) {
            return false;
        }

        // 1. Clear all timers first
        this._clearAllTimers();

        // 2. Clear manager instances to ensure clean rebuild
        if (this.autoResizeManager) {
            this.autoResizeManager.destroy();
            this.autoResizeManager = null;
        }
        if (this.matchManager) {
            this.matchManager.destroy();
            this.matchManager = null;
        }
        if (this.eventManager) {
            this.eventManager.destroy();
            this.eventManager = null;
        }
        if (this.searchReplaceManager) {
            this.searchReplaceManager.destroy();
            this.searchReplaceManager = null;
        }

        // 3. Reset state and DOM-ready flags
        this.isInitialized = false;
        this.eventsBound = false;
        this.domReadyFired = false;
        this.textArea = null;
        this.matchesEl = null;

        // 4. Reinitialize
        this.init();

        // 5. Clear any old DOM-ready listener before re-adding
        if (this.domReadyHandler && !this.domReadyFired) {
            document.removeEventListener('DOMContentLoaded', this.domReadyHandler);
            this.domReadyHandler = null;
        }

        // 6. If DOM is already ready, bind immediately
        if (document.readyState !== 'loading') {
            this._retryInitAndBind();
        } else {
            // Otherwise, wait for DOM ready
            this._ensureEventsOnDOMReady();
        }

        return this.isInitialized;
    }

    /**
     * Update the target DOM elements (for view re-rendering scenarios)
     * @param {HTMLTextAreaElement} newTextArea - New textarea element
     * @param {HTMLElement} newMatchesEl - New matches container element
     * @returns {boolean} True if targets were updated successfully
     */
    updateTargets(newTextArea, newMatchesEl) {
        if (this.destroyed) {
            return false;
        }

        // 1. Unbind from old elements first
        if (this.eventsBound) {
            this.unbindEvents();
        }

        // 2. Destroy old managers to prevent leaks
        if (this.autoResizeManager) {
            this.autoResizeManager.destroy();
        }
        if (this.matchManager) {
            this.matchManager.destroy();
        }
        if (this.eventManager) {
            this.eventManager.destroy();
        }
        if (this.searchReplaceManager) {
            this.searchReplaceManager.destroy();
        }

        // 3. Update targets
        this.textArea = newTextArea;
        this.matchesEl = newMatchesEl;

        // 4. Rebuild managers with new targets
        if (this.textArea && this.matchesEl) {
            this.autoResizeManager = new this.AutoResizeManager(this.textArea, this.initialHeight);
            this.matchManager = new this.MatchManager(this.textArea, this.matchesEl);
            this.eventManager = new this.EventManager(
                this.textArea,
                this.matchesEl,
                this.matchManager,
                this.autoResizeManager
            );
            this.searchReplaceManager = new this.SearchReplaceManager(this.textArea);

            // 5. Set up height change callback
            if (this.autoResizeManager && this.onHeightChangeCallback) {
                this.autoResizeManager.onHeightChangeCallback = this.onHeightChangeCallback;
            }

            // 6. Reapply sizing and saved height
            this.autoResizeManager.applyViewportClamp();
            this.textAreaUtils.loadSavedHeight(this.textArea, this.initialHeight);
            this.setupSearchReplace();

            // 7. Stabilize layout after retarget
            this.autoResizeManager.ensureInitialHeight();
            this.autoResizeManager.autoResize();

            // 8. Bind events and mark as initialized if successful
            const bindSuccess = this.bindEvents();

            if (bindSuccess) {
                this.isInitialized = true;
            }

            return bindSuccess;
        }

        return false;
    }

    // ============================================================================
    // CONVENIENCE METHODS
    // ============================================================================

    /**
     * Check if the manager is ready for operations
     * @returns {boolean} True if manager is initialized and bound
     */
    isReady() {
        return !this.destroyed && this.isInitialized && this.eventsBound;
    }
}

// ============================================================================
// EXPORT TO GLOBAL SCOPE
// ============================================================================

// Make class available globally (instantiated by textarea.js)
window.TextAreaManager = TextAreaManager;
