// ============================================================================
// MATCH MANAGER - Handles textarea match processing functionality
// ============================================================================
//
// USAGE NOTES:
// - Consider debouncing updateMatches() calls at 50-100ms to reduce async churn
// - Host should call handleBlur() on textarea blur events to reset session state
// - For accessibility: match list container should have role="listbox" and items
//   should have role="option" with keyboard navigation (up/down/enter)
// - Use getMetrics() to monitor droppedMatches for observability
//
// ============================================================================

class MatchManager {
    constructor(textArea, matchesEl) {
        this.textArea = textArea;
        this.matchesEl = matchesEl;
        this.matchProcessor = new window.MatchProcessor();
        this.currentMatchRequestId = 0;
        this.matchSessionKey = performance.now();
        this.lastTriggeringWord = null;
        this.hasReplacedTrigger = false;
        this.lastMatchSession = null;
        this.destroyed = false;
        this.droppedMatches = 0;
        this.sampleMatchCache = null;
    }

    getMetrics() {
        return {
            droppedMatches: this.droppedMatches
        };
    }

    async updateMatches(value, cursorPosition) {
        if (this.destroyed) {
            return;
        }

        const requestId = ++this.currentMatchRequestId;
        const textBeforeCursor = window.TextUtils.getTextBeforeCursor(value, cursorPosition);

        if (!this.matchProcessor.isReadyForMatching(textBeforeCursor)) {
            await this.showSampleMatches(requestId);

            return;
        }

        await this.showRealMatches(textBeforeCursor, requestId);
    }

    async showSampleMatches(requestId) {
        if (this.sampleMatchCache) {
            if (this.destroyed || !this.matchesEl || requestId !== this.currentMatchRequestId) {
                return;
            }

            this.matchesEl.innerHTML = this.sampleMatchCache;

            return;
        }

        const sampleMatches = await this.matchProcessor.getSampleMatches();

        if (this.destroyed || !this.matchesEl || requestId !== this.currentMatchRequestId) {
            return;
        }

        const sanitized = this.sanitizeMatchesHTML(sampleMatches);

        this.sampleMatchCache = sanitized;
        this.matchesEl.innerHTML = sanitized;
    }

    async showRealMatches(textBeforeCursor, requestId) {
        const matches = await this.matchProcessor.findMatches(textBeforeCursor);

        if (this.destroyed || !this.matchesEl || requestId !== this.currentMatchRequestId) {
            if (!this.destroyed && requestId !== this.currentMatchRequestId) {
                this.droppedMatches++;
            }

            return;
        }

        const currentTriggeringWord = this.matchProcessor.getLastMatchedWord();

        if (currentTriggeringWord && currentTriggeringWord !== this.lastTriggeringWord) {
            this.hasReplacedTrigger = false;
            this.lastTriggeringWord = currentTriggeringWord;
            this.matchSessionKey = performance.now();
            this.sampleMatchCache = null;
        }

        const sanitizedMatches = this.sanitizeMatchesHTML(
            window.MatchProcessorUtils.createMatchListHTML(matches)
        );

        this.matchesEl.innerHTML = sanitizedMatches;
    }

    sanitizeMatchesHTML(html) {
        if (!html || typeof html !== 'string') {
            return '';
        }

        const temp = document.createElement('div');

        temp.innerHTML = html;
        const liElements = temp.querySelectorAll('li');

        if (liElements.length === 0) {
            const textContent = temp.textContent || '';

            if (textContent.trim()) {
                const li = document.createElement('li');

                li.textContent = textContent;

                return li.outerHTML;
            }

            return '';
        }

        const whitelistedAttrs = ['class', 'title', 'data-value', 'data-id'];
        const sanitized = Array.from(liElements).map(li => {
            const newLi = document.createElement('li');

            whitelistedAttrs.forEach(attr => {
                const value = li.getAttribute(attr);

                if (value !== null) {
                    newLi.setAttribute(attr, value);
                }
            });

            newLi.innerHTML = li.innerHTML;

            return newLi.outerHTML;
        }).join('');

        return sanitized;
    }

    handleMatchListItemClick(e) {
        if (this.destroyed || !this.matchProcessor) {
            return;
        }

        const listItem = e.target.closest('li');

        if (!listItem) {
            return;
        }

        const isSample = listItem.classList.contains('sample');
        const matchText = listItem.dataset.value || listItem.textContent;
        const replacement = window.MatchProcessorUtils.processMatchSelection(matchText, isSample);
        const currentSession = this.matchSessionKey;

        if (this.hasReplacedTrigger && this.lastMatchSession === currentSession) {
            this.appendToEnd(replacement);
        } else {
            this.replaceTriggeringWord(replacement);
            this.hasReplacedTrigger = true;
            this.lastMatchSession = currentSession;
        }
    }

    insertText(text) {
        if (this.destroyed || !this.textArea) {
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

        this.triggerInputEvent();
    }

    appendToEnd(text) {
        if (this.destroyed || !this.textArea) {
            return;
        }

        const endPosition = this.textArea.value.length;

        this.textArea.selectionStart = endPosition;
        this.textArea.selectionEnd = endPosition;
        this.insertText(text);
    }

    replaceTriggeringWord(replacement) {
        if (this.destroyed || !this.textArea || !this.matchProcessor) {
            return;
        }

        const triggeringWord = this.matchProcessor.getLastMatchedWord();

        if (!triggeringWord) {
            this.insertText(replacement);

            return;
        }

        const snapshotCursorPosition = this.textArea.selectionStart;

        if (this.shouldAppendInsteadOfReplace()) {
            this.appendToEnd(replacement);

            return;
        }

        if (this.isRTLContext()) {
            this.appendToEnd(replacement);

            return;
        }

        if (this.attemptTriggeringWordReplacement(triggeringWord, replacement, snapshotCursorPosition)) {
            this.hasReplacedTrigger = true;
            this.triggerInputEvent();
        } else {
            this.insertText(replacement);
        }
    }

    isRTLContext() {
        if (this.destroyed || !this.textArea) {
            return false;
        }

        const { direction } = window.getComputedStyle(this.textArea);

        if (direction === 'rtl') {
            return true;
        }

        const startPos = Math.max(0, this.textArea.selectionStart - 64);
        const textBeforeCursor = this.textArea.value.slice(startPos, this.textArea.selectionStart);
        const rtlChars = '\u0590-\u05FF\u0600-\u06FF\u0700-\u074F\u0750-\u077F\u08A0-\u08FF' +
            '\uFB50-\uFDFF\uFE70-\uFEFF\u200F\u202B\u202E\u061C';
        const rtlPattern = new RegExp(`[${rtlChars}]`);

        return rtlPattern.test(textBeforeCursor);
    }

    shouldAppendInsteadOfReplace() {
        return this.hasReplacedTrigger;
    }

    attemptTriggeringWordReplacement(triggeringWord, replacement, snapshotCursorPosition) {
        if (this.destroyed || !this.textArea) {
            return false;
        }

        const cursorPos = snapshotCursorPosition !== undefined
            ? snapshotCursorPosition
            : this.textArea.selectionStart;

        const wordPosition = window.MatchProcessorUtils.findTriggeringWordPosition(
            this.textArea.value,
            triggeringWord,
            cursorPos
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
        if (this.destroyed || !this.textArea) {
            return;
        }

        this.textArea.dispatchEvent(new Event('input', { bubbles: true }));
    }

    resetMatchState() {
        if (this.destroyed) {
            return;
        }

        this.hasReplacedTrigger = false;
        this.lastTriggeringWord = null;
        this.lastMatchSession = null;
        this.matchSessionKey = performance.now();
        this.sampleMatchCache = null;

        if (this.matchProcessor) {
            this.matchProcessor.resetMatchState();
        }
    }

    handleBlur() {
        this.resetMatchState();
    }

    clearMatches() {
        if (this.destroyed) {
            return;
        }

        if (this.matchesEl) {
            this.matchesEl.innerHTML = '';
        }
    }

    destroy() {
        this.destroyed = true;
        this.currentMatchRequestId = Number.MAX_SAFE_INTEGER;
        this.matchProcessor = null;
        this.textArea = null;
        this.matchesEl = null;
        this.sampleMatchCache = null;
    }
}

// Export to global scope
window.MatchManager = MatchManager;
