// ============================================================================
// EVENT MANAGER - Handles textarea event processing
// ============================================================================

class EventManager {
    constructor(textArea, matchesEl, matchManager, autoResizeManager) {
        this.textArea = textArea;
        this.matchesEl = matchesEl;
        this.matchManager = matchManager;
        this.autoResizeManager = autoResizeManager;
        this.eventsAreBound = false;
        this.destroyed = false;
        this.isComposing = false;
        this.pasteFrameId = null;
        this.lastPersistedHeight = null;
        this.resizeObserver = null;
        this.metrics = { manualResizes: 0, pasteOperations: 0 };
        this.pendingRAF = new Set();

        // Bind event handlers
        this.boundHandleInput = this.handleInput.bind(this);
        this.boundHandleResize = this.handleResize.bind(this);
        this.boundHandleWindowResize = this.handleWindowResize.bind(this);
        this.boundHandlePaste = this.handlePaste.bind(this);
        this.boundHandleCompositionStart = this.handleCompositionStart.bind(this);
        this.boundHandleCompositionEnd = this.handleCompositionEnd.bind(this);
        this.boundHandleMatchListItemClick = this.handleMatchListItemClick.bind(this);

        // Debounced handlers
        this.debouncedHandleInput = Utils.async.debounce(this.boundHandleInput, TEXTAREA_CONFIG.timeouts.debounce);
        this.debouncedHandleWindowResize = Utils.async.debounce(this.boundHandleWindowResize, 250);
    }

    bindEvents() {
        if (!this.textArea || !this.matchesEl || this.eventsAreBound) {
            return this.eventsAreBound;
        }

        this.unbindEvents();

        this.textArea.addEventListener('input', this.debouncedHandleInput);
        this.textArea.addEventListener('paste', this.boundHandlePaste);
        this.textArea.addEventListener('mouseup', this.boundHandleResize, { passive: true });
        this.textArea.addEventListener('pointerup', this.boundHandleResize, { passive: true });
        this.textArea.addEventListener('compositionstart', this.boundHandleCompositionStart);
        this.textArea.addEventListener('compositionend', this.boundHandleCompositionEnd);
        this.matchesEl.addEventListener('click', this.boundHandleMatchListItemClick);
        window.addEventListener('resize', this.debouncedHandleWindowResize, { passive: true });

        this.setupResizeObserver();
        this.eventsAreBound = true;

        return true;
    }

    unbindEvents() {
        if (!this.textArea || !this.matchesEl) {
            return;
        }

        this.textArea.removeEventListener('input', this.debouncedHandleInput);
        this.textArea.removeEventListener('paste', this.boundHandlePaste);
        this.textArea.removeEventListener('mouseup', this.boundHandleResize);
        this.textArea.removeEventListener('pointerup', this.boundHandleResize);
        this.textArea.removeEventListener('compositionstart', this.boundHandleCompositionStart);
        this.textArea.removeEventListener('compositionend', this.boundHandleCompositionEnd);
        this.matchesEl.removeEventListener('click', this.boundHandleMatchListItemClick);
        window.removeEventListener('resize', this.debouncedHandleWindowResize);

        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
    }

    setupResizeObserver() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }

        if (typeof ResizeObserver === 'undefined') {
            return;
        }

        this.resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                if (entry.target === this.textArea) {
                    const newHeight = this.textArea.style.height;

                    this.persistManualHeight(newHeight);
                }
            }
        });

        this.resizeObserver.observe(this.textArea);
    }

    persistManualHeight(newHeight) {
        if (newHeight && newHeight !== this.lastPersistedHeight) {
            try {
                Utils.storage.set('textAreaHeight:v2', newHeight);
                this.lastPersistedHeight = newHeight;
            } catch (error) {
                console.warn('Could not persist height to localStorage:', error);
            }
        }
    }

    async handleInput(e) {
        if (this.destroyed) {
            return;
        }

        Utils.dom.updateElementClass(e.target, e.target.value.length);

        if (this.autoResizeManager) {
            this.autoResizeManager.autoResize();
        }

        if (this.isComposing) {
            return;
        }

        if (this.matchManager) {
            if (!this.matchManager.isMatchClick) {
                await this.matchManager.updateMatches(e.target.value, e.target.selectionStart);
            } else {
                this.matchManager.resetMatchClickFlag();
            }
        }
    }

    handleCompositionStart() {
        this.isComposing = true;
    }

    handleCompositionEnd() {
        this.isComposing = false;
        if (this.textArea && this.matchManager && !this.matchManager.isMatchClick) {
            this.matchManager.updateMatches(this.textArea.value, this.textArea.selectionStart);
        }
    }

    handleMatchListItemClick(e) {
        if (this.destroyed || !this.matchManager) {
            return;
        }
        this.matchManager.handleMatchListItemClick(e);
    }

    handleResize() {
        if (this.destroyed || !this.textArea?.style?.height) {
            return;
        }

        const currentHeight = this.textArea.style.height;

        if (currentHeight === this.lastPersistedHeight) {
            return;
        }

        this.metrics.manualResizes++;
        this.persistManualHeight(currentHeight);
    }

    handlePaste() {
        this.metrics.pasteOperations++;

        if (this.pasteFrameId !== null) {
            cancelAnimationFrame(this.pasteFrameId);
        }

        this.pasteFrameId = requestAnimationFrame(() => {
            this.pendingRAF.delete(this.pasteFrameId);
            this.pasteFrameId = null;
            if (this.autoResizeManager) {
                this.autoResizeManager.autoResize();
            }
        });
        this.pendingRAF.add(this.pasteFrameId);
    }

    handleWindowResize() {
        if (this.autoResizeManager) {
            this.autoResizeManager.clearResizeCache();
            this.autoResizeManager.clearStyleCache();
            this.autoResizeManager.applyViewportClamp();
            this.autoResizeManager.autoResize();
        }
    }

    destroy() {
        this.destroyed = true;

        if (this.pasteFrameId !== null) {
            cancelAnimationFrame(this.pasteFrameId);
            this.pasteFrameId = null;
        }

        // Cancel all pending RAF
        this.pendingRAF.forEach(rafId => {
            cancelAnimationFrame(rafId);
        });
        this.pendingRAF.clear();

        if (this.debouncedHandleInput?.cancel) {
            this.debouncedHandleInput.cancel();
        }
        if (this.debouncedHandleWindowResize?.cancel) {
            this.debouncedHandleWindowResize.cancel();
        }

        this.unbindEvents();
    }
}

// Export to global scope
window.EventManager = EventManager;
