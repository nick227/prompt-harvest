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
 * @property {typeof SearchReplaceManager} [SearchReplaceManager] - SearchReplaceManager class (optional)
 */

/**
 * @typedef {'idle' | 'init' | 'bound' | 'destroyed'} TextAreaManagerState
 */

/**
 * @typedef {Function} LifecycleCallback
 * @param {TextAreaManagerState} state - The new state
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

        this._initializeProperties();
        this.init();
        this._ensureEventsOnDOMReady();
    }

    // ============================================================================
    // PRIVATE UTILITY METHODS
    // ============================================================================

    _initializeProperties() {
        this.isInitialized = false;
        this.initialHeight = null;
        this.destroyed = false;
        this.state = 'idle';
        this.domReadyHandler = null;
        this.domReadyFired = false;
        this.retryBindScheduled = false;
        this.onHeightChangeCallback = null;
        this.ariaLiveRegion = null;
        this.lastAnnouncedHeightLevel = 0;
        this.isMatchClick = false;
        this.scheduledWork = new Map();
        this.eventsBound = false;
        this.resizeObserver = null;
        this.lifecycleCallbacks = new Set();
        this.textArea = null;
        this.matchesEl = null;
        this.autoResizeManager = null;
        this.matchManager = null;
        this.eventManager = null;
        this.textAreaUtils = new this.TextAreaUtils();
        this.searchReplaceManager = null;
    }

    _requireDependencies() {
        const required = {
            TextAreaUtils: this.TextAreaUtils,
            Utils: this.Utils,
            TEXTAREA_CONFIG: this.TEXTAREA_CONFIG,
            AutoResizeManager: this.AutoResizeManager,
            MatchManager: this.MatchManager,
            EventManager: this.EventManager
        };

        for (const [name, value] of Object.entries(required)) {
            if (!value) {
                console.error(`TextAreaManager: ${name} not found. Ensure required dependencies are loaded first.`);

                return false;
            }
        }

        // SearchReplaceManager is optional
        if (!this.SearchReplaceManager) {
            console.warn('TextAreaManager: SearchReplaceManager not found. Search/replace features will be disabled.');
        }

        return true;
    }

    _cancelScheduledWork(key) {
        if (!this.scheduledWork.has(key)) {
            return;
        }

        const { type, id } = this.scheduledWork.get(key);

        if (type === 'timeout') {
            clearTimeout(id);
        } else if (type === 'raf') {
            cancelAnimationFrame(id);
        }

        this.scheduledWork.delete(key);
    }

    _cancelAllScheduledWork() {
        this.scheduledWork.forEach(({ type, id }) => {
            if (type === 'timeout') {
                clearTimeout(id);
            } else if (type === 'raf') {
                cancelAnimationFrame(id);
            }
        });
        this.scheduledWork.clear();
    }

    _scheduleWork(key, type, callback, delay) {
        // Cancel any existing work with this key
        this._cancelScheduledWork(key);

        let id;

        if (type === 'timeout') {
            id = setTimeout(() => {
                this.scheduledWork.delete(key);
                callback();
            }, delay);
        } else if (type === 'raf') {
            id = requestAnimationFrame(() => {
                this.scheduledWork.delete(key);
                callback();
            });
        }

        this.scheduledWork.set(key, { type, id });

        return id;
    }

    _emitLifecycle(state) {
        this.lifecycleCallbacks.forEach(callback => {
            try {
                callback(state);
            } catch (err) {
                console.error('TextAreaManager lifecycle callback error:', err);
            }
        });
    }

    // ============================================================================
    // INITIALIZATION METHODS
    // ============================================================================

    init() {
        if (this.isInitialized) {
            return;
        }

        this.state = 'init';
        this._emitLifecycle('init');

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

        if (this.textArea) {
            this.textAreaUtils.loadSavedHeight(this.textArea, this.initialHeight);
        }

        this.Utils.dom.init(this.TEXTAREA_CONFIG.selectors);

        if (this.autoResizeManager) {
            this.autoResizeManager.applyViewportClamp();
        }

        // Use rAF for initial height measurement after layout stabilizes
        if (this.textArea && this.initialHeight === null) {
            // Try immediate capture first
            if (this.textArea.offsetHeight > 0) {
                this.initialHeight = this.textArea.offsetHeight;
                if (this.autoResizeManager) {
                    this.autoResizeManager.initialHeight = this.initialHeight;
                }
            } else {
                // Use requestAnimationFrame for stable layout measurement
                this._scheduleWork('init-height', 'raf', () => {
                    if (this.destroyed || !this.textArea || this.initialHeight !== null) {
                        return;
                    }
                    if (this.textArea.offsetHeight > 0) {
                        this.initialHeight = this.textArea.offsetHeight;
                        if (this.autoResizeManager) {
                            this.autoResizeManager.initialHeight = this.initialHeight;
                        }
                    }
                });
            }
        }

        // Initialize SearchReplaceManager if available
        if (this.textArea && this.SearchReplaceManager) {
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
        if (this.destroyed || !this.textArea) {
            return;
        }
        this.textAreaUtils.loadSavedHeight(this.textArea, this.initialHeight);
    }


    /**
     * Bind event listeners to textarea and matches elements
     * @returns {boolean} True if events were bound successfully
     */
    bindEvents() {
        if (this.destroyed || !this.textArea || !this.matchesEl) {
            return false;
        }
        if (!this.eventManager) {
            return false;
        }

        // Idempotent binding - only bind if not already bound
        if (this.eventsBound) {
            return true;
        }

        // Double-check EventManager hasn't already bound
        if (this.eventManager.isBound?.() === true) {
            this.eventsBound = true;

            return true;
        }

        const success = this.eventManager.bindEvents();

        if (success) {
            this.eventsBound = true;
            this.state = 'bound';
            this._emitLifecycle('bound');
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
        this.isInitialized = false;
        this.state = 'destroyed';
        this._emitLifecycle('destroyed');

        // 4. Cancel all scheduled work (timeouts + rAF)
        this._cancelAllScheduledWork();

        // 5. Disconnect ResizeObserver
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }

        // 6. Destroy managers
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

        // 7. Clean up aria-live region
        if (this.ariaLiveRegion) {
            this.ariaLiveRegion.remove();
            this.ariaLiveRegion = null;
        }

        // 8. Clear lifecycle callbacks
        this.lifecycleCallbacks.clear();

        // 9. Null out all references
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
            this._scheduleWork('dom-ready', 'timeout', () => {
                if (!this.destroyed) {
                    this._retryInitAndBind();
                }
            }, 0);
        }
    }

    _retryInitAndBind() {
        // Prevent double-init race
        if (this.destroyed || this.retryBindScheduled) {
            return;
        }

        this.retryBindScheduled = true;

        if (!this.textArea || !this.matchesEl) {
            this.textArea = this.Utils.dom.get(this.TEXTAREA_CONFIG.selectors.textArea);
            this.matchesEl = this.Utils.dom.get(this.TEXTAREA_CONFIG.selectors.matches);
        }

        if (!this.isInitialized && !this.destroyed) {
            this.init();
        }

        if (this.destroyed) {
            this.retryBindScheduled = false;

            return;
        }

        const success = this.bindEvents();

        if (success && !this.destroyed && this.autoResizeManager) {
            // Use ResizeObserver instead of staged timeouts for better responsiveness
            this._setupResizeObserver();

            // Still do one initial stabilization pass
            this._scheduleWork('resize-stabilize', 'timeout', () => {
                if (!this.destroyed && this.autoResizeManager) {
                    this.autoResizeManager.clearResizeCache();
                    this.autoResizeManager.ensureInitialHeight();
                    this.autoResizeManager.autoResize();
                }
            }, 100);
        }

        this.retryBindScheduled = false;
    }

    _setupResizeObserver() {
        if (!window.ResizeObserver || this.resizeObserver || this.destroyed || !this.textArea) {
            return;
        }

        try {
            this.resizeObserver = new ResizeObserver(() => {
                if (this.destroyed || !this.autoResizeManager) {
                    return;
                }
                // Debounce resize with rAF
                this._scheduleWork('resize-observe', 'raf', () => {
                    if (!this.destroyed && this.autoResizeManager) {
                        this.autoResizeManager.applyViewportClamp();
                    }
                });
            });

            this.resizeObserver.observe(this.textArea.parentElement || this.textArea);
        } catch (err) {
            console.warn('TextAreaManager: Failed to setup ResizeObserver:', err);
        }
    }

    // ============================================================================
    // DELEGATED METHODS
    // ============================================================================

    async handleInput(e) {
        if (this.destroyed || !this.textArea) {
            return;
        }
        if (this.eventManager) {
            try {
                await this.eventManager.handleInput(e);
            } catch (err) {
                console.error('TextAreaManager: handleInput error:', err);
            }
        }
    }

    handleCompositionStart() {
        if (this.destroyed || !this.textArea) {
            return;
        }
        if (this.eventManager) {
            this.eventManager.handleCompositionStart();
        }
    }

    handleCompositionEnd() {
        if (this.destroyed || !this.textArea) {
            return;
        }
        if (this.eventManager) {
            this.eventManager.handleCompositionEnd();
        }
    }

    handleMatchListItemClick(e) {
        if (this.destroyed || !this.textArea) {
            return;
        }
        if (this.eventManager) {
            this.eventManager.handleMatchListItemClick(e);
        }
    }

    handleResize() {
        if (this.destroyed || !this.textArea) {
            return;
        }
        if (this.eventManager) {
            this.eventManager.handleResize();
        }
    }

    handleWindowResize() {
        if (this.destroyed || !this.textArea) {
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
        if (this.destroyed || !this.textArea) {
            return;
        }
        if (this.matchManager) {
            try {
                await this.matchManager.updateMatches(value, cursorPosition);
            } catch (err) {
                console.error('TextAreaManager: updateMatches error:', err);
            }
        }
    }

    clearMatches() {
        if (this.destroyed || !this.textArea) {
            return;
        }
        if (this.matchManager) {
            this.matchManager.clearMatches();
        }
    }

    resetMatchState() {
        if (this.destroyed || !this.textArea) {
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
        if (this.destroyed || !this.textArea) {
            return;
        }
        if (this.matchManager) {
            this.matchManager.insertText(text);
        }
    }

    appendToEnd(text) {
        if (this.destroyed || !this.textArea) {
            return;
        }
        if (this.matchManager) {
            this.matchManager.appendToEnd(text);
        }
    }

    replaceTriggeringWord(replacement) {
        if (this.destroyed || !this.textArea) {
            return;
        }
        if (this.matchManager) {
            this.matchManager.replaceTriggeringWord(replacement);
        }
    }

    triggerInputEvent() {
        if (this.destroyed || !this.textArea) {
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
        if (this.destroyed || !this.textArea) {
            return;
        }
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
        if (this.destroyed || !this.textArea) {
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
        if (this.destroyed || !this.textArea) {
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
        if (this.destroyed || !this.textArea) {
            return 0;
        }
        if (this.textAreaUtils) {
            return this.textAreaUtils.getCursorPosition(this.textArea);
        }

        return 0;
    }

    setCursorPosition(position) {
        if (this.destroyed || !this.textArea) {
            return;
        }
        if (this.textAreaUtils) {
            this.textAreaUtils.setCursorPosition(this.textArea, position);
        }
    }

    focus() {
        if (this.destroyed || !this.textArea) {
            return;
        }
        if (this.textAreaUtils) {
            this.textAreaUtils.focus(this.textArea);
        }
    }

    blur() {
        if (this.destroyed || !this.textArea) {
            return;
        }
        if (this.textAreaUtils) {
            this.textAreaUtils.blur(this.textArea);
        }
    }

    select() {
        if (this.destroyed || !this.textArea) {
            return;
        }
        if (this.textAreaUtils) {
            this.textAreaUtils.select(this.textArea);
        }
    }

    clear() {
        if (this.destroyed || !this.textArea) {
            return;
        }
        if (this.textAreaUtils) {
            this.textAreaUtils.clear(this.textArea);
        }
    }

    getWordAtCursor() {
        if (this.destroyed || !this.textArea) {
            return '';
        }
        if (this.textAreaUtils) {
            return this.textAreaUtils.getWordAtCursor(this.textArea);
        }

        return '';
    }

    replaceWordAtCursor(newWord) {
        if (this.destroyed || !this.textArea) {
            return;
        }
        if (this.textAreaUtils) {
            this.textAreaUtils.replaceWordAtCursor(this.textArea, newWord);
        }
    }

    getTextBeforeCursor() {
        if (this.destroyed || !this.textArea) {
            return '';
        }
        if (this.textAreaUtils) {
            return this.textAreaUtils.getTextBeforeCursor(this.textArea);
        }

        return '';
    }

    getTextAfterCursor() {
        if (this.destroyed || !this.textArea) {
            return '';
        }
        if (this.textAreaUtils) {
            return this.textAreaUtils.getTextAfterCursor(this.textArea);
        }

        return '';
    }

    insertAtCursor(text, options = {}) {
        if (this.destroyed || !this.textArea) {
            return;
        }
        if (this.textAreaUtils) {
            this.textAreaUtils.insertAtCursor(this.textArea, text, options);
        }
    }

    autoResize() {
        if (this.destroyed || !this.textArea) {
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
        if (this.destroyed || !this.textArea) {
            return;
        }
        if (this.autoResizeManager) {
            this.autoResizeManager.updateResizeCache(content);
        }
    }

    clearResizeCache() {
        if (this.destroyed || !this.textArea) {
            return;
        }
        if (this.autoResizeManager) {
            this.autoResizeManager.clearResizeCache();
        }
    }

    clearStyleCache() {
        if (this.destroyed || !this.textArea) {
            return;
        }
        if (this.autoResizeManager) {
            this.autoResizeManager.clearStyleCache();
        }
    }

    ensureInitialHeight() {
        if (this.destroyed || !this.textArea) {
            return;
        }
        if (this.autoResizeManager) {
            this.autoResizeManager.ensureInitialHeight();
        }
    }

    resetToInitialHeight() {
        if (this.destroyed || !this.textArea) {
            return;
        }
        if (this.autoResizeManager) {
            this.autoResizeManager.resetToInitialHeight();
        }
    }

    resetInitialHeight() {
        if (this.destroyed || !this.textArea) {
            return;
        }
        if (this.autoResizeManager) {
            this.autoResizeManager.resetInitialHeight();
        }
    }

    getCurrentHeightLevel() {
        if (this.destroyed || !this.textArea) {
            return 0;
        }
        if (this.autoResizeManager) {
            return this.autoResizeManager.getCurrentHeightLevel();
        }

        return 0;
    }

    applyViewportClamp() {
        if (this.destroyed || !this.textArea) {
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
        if (this.destroyed || !this.textArea) {
            return 0;
        }
        if (this.textAreaUtils) {
            return this.textAreaUtils.getCharacterCount(this.getValue());
        }

        return 0;
    }

    getWordCount() {
        if (this.destroyed || !this.textArea) {
            return 0;
        }
        if (this.textAreaUtils) {
            return this.textAreaUtils.getWordCount(this.getValue());
        }

        return 0;
    }

    isEmpty() {
        if (this.destroyed || !this.textArea) {
            return true;
        }
        if (this.textAreaUtils) {
            return this.textAreaUtils.isEmpty(this.getValue());
        }

        return true;
    }

    isTooLong(maxLength) {
        if (this.destroyed || !this.textArea) {
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
        if (this.destroyed || !this.textArea) {
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
        if (this.destroyed || !this.textArea) {
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

        if (!enabled && this.ariaLiveRegion) {
            // Clean up DOM when disabling
            this.ariaLiveRegion.remove();
            this.ariaLiveRegion = null;

            return;
        }

        if (this.textAreaUtils) {
            this.ariaLiveRegion = this.textAreaUtils.enableA11yAnnouncements(this.ariaLiveRegion, enabled);
        }
    }

    announceHeightLevel(heightLevel) {
        if (this.destroyed || !this.ariaLiveRegion) {
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
        // Safe fallback if debug method is missing
        if (this.textAreaUtils?.debug) {
            this.textAreaUtils.debug(...args);
        }
    }

    getMetrics() {
        if (this.destroyed) {
            return Object.freeze({});
        }
        if (this.textAreaUtils) {
            const metrics = this.textAreaUtils.getMetrics();

            // Return frozen copy to prevent external mutation
            return Object.freeze({ ...metrics });
        }

        return Object.freeze({});
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
        if (this.destroyed || !this.textArea) {
            return null;
        }
        if (this.autoResizeManager) {
            return this.autoResizeManager.getResizeInfo();
        }

        return null;
    }

    resetMatchClickFlag() {
        if (this.destroyed || !this.textArea) {
            return;
        }
        if (this.matchManager) {
            this.matchManager.resetMatchClickFlag();
        }
    }

    // ============================================================================
    // LIFECYCLE CALLBACK MANAGEMENT
    // ============================================================================

    /**
     * Register a lifecycle callback
     * @param {LifecycleCallback} callback - Callback function
     * @returns {Function} Unregister function
     */
    onLifecycle(callback) {
        if (typeof callback !== 'function') {
            console.warn('onLifecycle: callback must be a function');

            return () => {};
        }

        this.lifecycleCallbacks.add(callback);

        // Return unregister function
        return () => {
            this.lifecycleCallbacks.delete(callback);
        };
    }

    /**
     * Remove a lifecycle callback
     * @param {LifecycleCallback} callback - Callback to remove
     */
    offLifecycle(callback) {
        this.lifecycleCallbacks.delete(callback);
    }

    /**
     * Clear all lifecycle callbacks
     */
    clearLifecycleCallbacks() {
        this.lifecycleCallbacks.clear();
    }

    // ============================================================================
    // REINITIALIZATION METHODS
    // ============================================================================

    reinitialize() {
        if (this.destroyed) {
            return false;
        }

        // 1. Cancel all scheduled work
        this._cancelAllScheduledWork();

        // 2. Disconnect ResizeObserver
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }

        // 3. Clear manager instances to ensure clean rebuild
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
        if (this.searchReplaceManager?.destroy) {
            this.searchReplaceManager.destroy();
            this.searchReplaceManager = null;
        }

        // 4. Reset state and DOM-ready flags
        this.isInitialized = false;
        this.eventsBound = false;
        this.domReadyFired = false;
        this.retryBindScheduled = false;
        this.textArea = null;
        this.matchesEl = null;

        // 5. Reinitialize
        this.init();

        // 6. Clear any old DOM-ready listener before re-adding
        if (this.domReadyHandler && !this.domReadyFired) {
            document.removeEventListener('DOMContentLoaded', this.domReadyHandler);
            this.domReadyHandler = null;
        }

        // 7. If DOM is already ready, bind immediately
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

        // 2. Disconnect ResizeObserver
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }

        // 3. Destroy old managers to prevent leaks
        if (this.autoResizeManager) {
            this.autoResizeManager.destroy();
        }
        if (this.matchManager) {
            this.matchManager.destroy();
        }
        if (this.eventManager) {
            this.eventManager.destroy();
        }
        if (this.searchReplaceManager?.destroy) {
            this.searchReplaceManager.destroy();
        }

        // 4. Update targets
        this.textArea = newTextArea;
        this.matchesEl = newMatchesEl;

        // 5. Rebuild managers with new targets
        if (this.textArea && this.matchesEl) {
            this.autoResizeManager = new this.AutoResizeManager(this.textArea, this.initialHeight);
            this.matchManager = new this.MatchManager(this.textArea, this.matchesEl);
            this.eventManager = new this.EventManager(
                this.textArea,
                this.matchesEl,
                this.matchManager,
                this.autoResizeManager
            );

            // Initialize SearchReplaceManager if available
            if (this.SearchReplaceManager) {
                this.searchReplaceManager = new this.SearchReplaceManager(this.textArea);
            }

            // 6. Set up height change callback
            if (this.autoResizeManager && this.onHeightChangeCallback) {
                this.autoResizeManager.onHeightChangeCallback = this.onHeightChangeCallback;
            }

            // 7. Reapply sizing and saved height
            if (this.autoResizeManager) {
                this.autoResizeManager.applyViewportClamp();
            }

            if (this.textArea) {
                this.textAreaUtils.loadSavedHeight(this.textArea, this.initialHeight);
            }

            this.setupSearchReplace();

            // 8. Stabilize layout after retarget
            if (this.autoResizeManager) {
                this.autoResizeManager.ensureInitialHeight();
                this.autoResizeManager.autoResize();
            }

            // 9. Bind events and mark as initialized if successful
            const bindSuccess = this.bindEvents();

            if (bindSuccess) {
                this.isInitialized = true;

                // Setup ResizeObserver for new element
                this._setupResizeObserver();
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
        return !this.destroyed && this.isInitialized && this.eventsBound && !!this.textArea;
    }

    /**
     * Update configuration dynamically
     * @param {Object} newConfig - New configuration object
     * @returns {boolean} True if config was updated successfully
     */
    setConfig(newConfig) {
        if (this.destroyed || !newConfig) {
            return false;
        }

        // Update config reference
        this.TEXTAREA_CONFIG = { ...this.TEXTAREA_CONFIG, ...newConfig };

        // If selectors changed, may need to re-query DOM
        if (newConfig.selectors) {
            // Optionally re-initialize DOM if selectors changed
            if (this.isInitialized) {
                const oldTextArea = this.textArea;
                const oldMatchesEl = this.matchesEl;

                this.textArea = this.Utils.dom.get(this.TEXTAREA_CONFIG.selectors.textArea);
                this.matchesEl = this.Utils.dom.get(this.TEXTAREA_CONFIG.selectors.matches);

                // If elements changed, update targets
                if (this.textArea !== oldTextArea || this.matchesEl !== oldMatchesEl) {
                    return this.updateTargets(this.textArea, this.matchesEl);
                }
            }
        }

        return true;
    }

    /**
     * Get current state of the manager
     * @returns {TextAreaManagerState} Current state
     */
    getState() {
        return this.state;
    }
}

// ============================================================================
// EXPORT TO GLOBAL SCOPE
// ============================================================================

// Make class available globally (instantiated by textarea.js)
window.TextAreaManager = TextAreaManager;
