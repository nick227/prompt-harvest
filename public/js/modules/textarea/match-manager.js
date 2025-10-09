// ============================================================================
// MATCH MANAGER - Handles textarea match processing functionality
// ============================================================================

class MatchManager {
    constructor(textArea, matchesEl) {
        this.textArea = textArea;
        this.matchesEl = matchesEl;
        this.matchProcessor = new window.MatchProcessor();
        this.currentMatchRequestId = 0;
        this.matchSessionKey = Date.now();
        this.lastTriggeringWord = null;
        this.hasReplacedTrigger = false;
        this.isMatchClick = false;
        this.isComposing = false;
        this.destroyed = false;
        this.metrics = { droppedMatches: 0 };
    }

    async updateMatches(value, cursorPosition) {
        if (this.destroyed) {
            return;
        }

        const requestId = ++this.currentMatchRequestId;
        const textBeforeCursor = window.TextUtils.getTextBeforeCursor(value, cursorPosition);

        if (!this.matchProcessor.isReadyForMatching(textBeforeCursor)) {
            const sampleMatches = await this.matchProcessor.getSampleMatches();

            if (this.destroyed || !this.matchesEl) {
                return;
            }

            this.matchesEl.innerHTML = this.sanitizeMatchesHTML(sampleMatches);
            this.hasReplacedTrigger = false;
            this.matchSessionKey = Date.now();

            return;
        }

        const matches = await this.matchProcessor.findMatches(textBeforeCursor);

        if (requestId !== this.currentMatchRequestId) {
            this.metrics.droppedMatches++;

            return;
        }

        if (this.destroyed || !this.matchesEl) {
            return;
        }

        const currentTriggeringWord = this.matchProcessor.getLastMatchedWord();

        if (currentTriggeringWord && currentTriggeringWord !== this.lastTriggeringWord) {
            this.hasReplacedTrigger = false;
            this.lastTriggeringWord = currentTriggeringWord;
            this.matchSessionKey = Date.now();
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
                return `<li>${this.escapeHTML(textContent)}</li>`;
            }

            return '';
        }

        const sanitized = Array.from(liElements).map(li => {
            const text = li.textContent || '';
            const className = li.className || '';
            const title = li.title || '';

            return `<li class="${this.escapeHTML(className)}" title="${this.escapeHTML(title)}">${this.escapeHTML(text)}</li>`;
        }).join('');

        return sanitized;
    }

    escapeHTML(text) {
        if (typeof text !== 'string') {
            return '';
        }
        const div = document.createElement('div');

        div.textContent = text;

        return div.innerHTML;
    }

    handleMatchListItemClick(e) {
        if (this.destroyed) {
            return;
        }

        const listItem = e.target.closest('li');

        if (!listItem) {
            return;
        }

        const isSample = listItem.classList.contains('sample');
        const replacement = window.MatchProcessorUtils.processMatchSelection(listItem.innerText, isSample);

        this.isMatchClick = true;
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

        this.triggerInputEvent();
    }

    appendToEnd(text) {
        if (!this.textArea) {
            return;
        }

        const endPosition = this.textArea.value.length;

        this.textArea.selectionStart = endPosition;
        this.textArea.selectionEnd = endPosition;
        this.insertText(text);
    }

    replaceTriggeringWord(replacement) {
        if (!this.textArea || !this.matchProcessor.getLastMatchedWord()) {
            this.insertText(replacement);

            return;
        }

        const snapshotCursorPosition = this.textArea.selectionStart;
        const triggeringWord = this.matchProcessor.getLastMatchedWord();

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
        if (!this.textArea) {
            return false;
        }

        const { direction } = window.getComputedStyle(this.textArea);

        if (direction === 'rtl') {
            return true;
        }

        const startPos = Math.max(0, this.textArea.selectionStart - 64);
        const textBeforeCursor = this.textArea.value.slice(startPos, this.textArea.selectionStart);
        const rtlPattern = /[\u0590-\u05FF\u0600-\u06FF\u0700-\u074F\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

        return rtlPattern.test(textBeforeCursor);
    }

    shouldAppendInsteadOfReplace() {
        return this.hasReplacedTrigger;
    }

    attemptTriggeringWordReplacement(triggeringWord, replacement, snapshotCursorPosition) {
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
        if (this.textArea) {
            this.textArea.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    resetMatchClickFlag() {
        setTimeout(() => {
            this.isMatchClick = false;
            this.hasReplacedTrigger = false;
        }, 100);
    }

    resetMatchState() {
        this.hasReplacedTrigger = false;
        this.lastTriggeringWord = null;
        this.matchProcessor.resetMatchState();
    }

    clearMatches() {
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
    }
}

// Export to global scope
window.MatchManager = MatchManager;
