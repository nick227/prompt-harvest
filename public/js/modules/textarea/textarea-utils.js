// ============================================================================
// TEXTAREA UTILS - Utility methods for textarea functionality
// ============================================================================

class TextAreaUtils {
    constructor() {
        this.debugMode = false;
        this.metrics = {
            autoResizes: 0,
            droppedMatches: 0,
            manualResizes: 0,
            pasteOperations: 0
        };
    }

    // ============================================================================
    // PUBLIC API METHODS
    // ============================================================================

    getValue(textArea) {
        return textArea?.value || '';
    }

    setValue(textArea, value, options = {}) {
        if (!textArea) return;

        const { silent = false, noResize = false, autoResizeManager = null, isMatchClick = false } = options;
        textArea.value = value;

        if (!silent) {
            if (!noResize && autoResizeManager) {
                autoResizeManager.autoResize();
            }
            if (!isMatchClick) {
                this.triggerInputEvent(textArea);
            }
        }
    }

    getCursorPosition(textArea) {
        return textArea?.selectionStart || 0;
    }

    setCursorPosition(textArea, position) {
        if (textArea) {
            textArea.selectionStart = position;
            textArea.selectionEnd = position;
        }
    }

    focus(textArea) {
        textArea?.focus();
    }

    blur(textArea) {
        textArea?.blur();
    }

    select(textArea) {
        textArea?.select();
    }

    clear(textArea) {
        this.setValue(textArea, '');
    }

    getWordAtCursor(textArea) {
        if (!textArea) return '';
        return window.TextUtils.getWordAtCursor(textArea.value, textArea.selectionStart);
    }

    replaceWordAtCursor(textArea, newWord) {
        if (!textArea) return;

        const { value, cursorPosition } = window.TextUtils.replaceWordAtCursor(
            textArea.value,
            textArea.selectionStart,
            newWord
        );

        this.setValue(textArea, value);
        this.setCursorPosition(textArea, cursorPosition);
    }

    getTextBeforeCursor(textArea) {
        if (!textArea) return '';
        return window.TextUtils.getTextBeforeCursor(textArea.value, textArea.selectionStart);
    }

    getTextAfterCursor(textArea) {
        if (!textArea) return '';
        return window.TextUtils.getTextAfterCursor(textArea.value, textArea.selectionStart);
    }

    insertAtCursor(textArea, text, options = {}) {
        if (!textArea) return;

        const { value, cursorPosition } = window.TextUtils.insertTextAtPosition(
            textArea.value,
            textArea.selectionStart,
            textArea.selectionEnd,
            text
        );

        this.setValue(textArea, value, options);
        this.setCursorPosition(textArea, cursorPosition);
    }

    triggerInputEvent(textArea) {
        if (textArea) {
            textArea.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    // ============================================================================
    // TEXT UTILITY METHODS
    // ============================================================================

    getCharacterCount(value) {
        return window.TextUtils.getCharacterCount(value);
    }

    getWordCount(value) {
        return window.TextUtils.getWordCount(value);
    }

    isEmpty(value) {
        return window.TextUtils.isEmpty(value);
    }

    isTooLong(value, maxLength) {
        return window.TextUtils.isTooLong(value, maxLength);
    }

    // ============================================================================
    // HISTORY METHODS
    // ============================================================================

    saveToHistory(value) {
        try {
            const currentHistory = this.getHistory();
            const newHistory = window.TextUtils.addToHistory(currentHistory, value);
            const MAX_HISTORY = 50;
            const cappedHistory = newHistory.slice(-MAX_HISTORY);
            Utils.storage.set('textAreaHistory', cappedHistory);
        } catch (error) {
            console.warn('Could not save to history:', error);
        }
    }

    getHistory() {
        try {
            return Utils.storage.get('textAreaHistory') || [];
        } catch (error) {
            console.warn('Could not load history from localStorage:', error);
            return [];
        }
    }

    loadFromHistory(textArea, index) {
        const historyItem = window.TextUtils.getHistoryItem(this.getHistory(), index);
        if (historyItem) {
            this.setValue(textArea, historyItem);
        }
    }

    clearHistory() {
        try {
            Utils.storage.remove('textAreaHistory');
        } catch (error) {
            console.warn('Could not clear history from localStorage:', error);
        }
    }

    // ============================================================================
    // HEIGHT MANAGEMENT METHODS
    // ============================================================================

    loadSavedHeight(textArea, initialHeight) {
        try {
            if (Utils.storage.get('textAreaHeight')) {
                Utils.storage.remove('textAreaHeight');
            }

            const savedHeight = Utils.storage.get('textAreaHeight:v2');
            if (!savedHeight || !textArea) {
                return;
            }

            const savedHeightValue = parseInt(savedHeight);
            const expectedInitialHeight = initialHeight || textArea.offsetHeight;

            if (isNaN(savedHeightValue) || savedHeightValue <= 0) {
                Utils.storage.remove('textAreaHeight:v2');
                return;
            }

            if (savedHeightValue > expectedInitialHeight * 1.5) {
                Utils.storage.remove('textAreaHeight:v2');
                return;
            }

            if (Math.abs(savedHeightValue - expectedInitialHeight) > 2) {
                textArea.style.height = savedHeight;
            }
        } catch (error) {
            console.warn('Could not load saved height from localStorage:', error);
        }
    }

    // ============================================================================
    // DEBUG AND METRICS METHODS
    // ============================================================================

    setDebug(enabled) {
        this.debugMode = !!enabled;
        if (this.debugMode) {
            console.log('🐛 TextAreaUtils debug mode enabled');
        }
    }

    debug(...args) {
        if (this.debugMode) {
            console.log('[TextAreaUtils]', ...args);
        }
    }

    getMetrics() {
        return { ...this.metrics };
    }

    resetMetrics() {
        this.metrics = {
            autoResizes: 0,
            droppedMatches: 0,
            manualResizes: 0,
            pasteOperations: 0
        };
    }

    // ============================================================================
    // ACCESSIBILITY METHODS
    // ============================================================================

    enableA11yAnnouncements(ariaLiveRegion, enabled = true) {
        if (!enabled) {
            if (ariaLiveRegion) {
                ariaLiveRegion.remove();
            }
            return null;
        }

        if (!ariaLiveRegion) {
            ariaLiveRegion = document.createElement('div');
            ariaLiveRegion.setAttribute('role', 'status');
            ariaLiveRegion.setAttribute('aria-live', 'polite');
            ariaLiveRegion.setAttribute('aria-atomic', 'true');
            ariaLiveRegion.className = 'sr-only';
            ariaLiveRegion.style.cssText = 'position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden;';
            document.body.appendChild(ariaLiveRegion);
        }

        return ariaLiveRegion;
    }

    announceHeightLevel(ariaLiveRegion, heightLevel, lastAnnouncedHeightLevel) {
        if (!ariaLiveRegion || heightLevel === lastAnnouncedHeightLevel) {
            return;
        }

        const messages = {
            3: 'Text area reached maximum height. Content will scroll.',
            2: 'Text area expanded.',
            1: 'Text area at normal size.'
        };

        const message = messages[heightLevel];
        if (message) {
            requestAnimationFrame(() => {
                if (ariaLiveRegion) {
                    ariaLiveRegion.textContent = message;
                    setTimeout(() => {
                        if (ariaLiveRegion) {
                            ariaLiveRegion.textContent = '';
                        }
                    }, 1000);
                }
            });
        }
    }
}

// Export to global scope
window.TextAreaUtils = TextAreaUtils;
