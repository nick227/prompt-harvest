// ============================================================================
// AUTO RESIZE MANAGER - Handles textarea auto-resize functionality
// ============================================================================

class AutoResizeManager {
    constructor(textArea, initialHeight = null) {
        this.textArea = textArea;
        this.initialHeight = initialHeight;
        this.lastResizeContent = '';
        this.lastResizeHeight = null;
        this.lastResizeWidth = null;
        this.resizeFrameId = null;
        this.cachedComputedStyle = null;
        this.lineHeightMeasureElement = null;
        this.initialHeightIsEstimate = false;
        this.visibilityObserver = null;
        this.lastAnnouncedHeightLevel = 0;
        this.ariaLiveRegion = null;
        this.metrics = { autoResizes: 0 };
        this.onHeightChangeCallback = null;
    }

    autoResize() {
        if (!this.textArea) {
            return;
        }

        if (this.resizeFrameId) {
            cancelAnimationFrame(this.resizeFrameId);
        }

        this.resizeFrameId = requestAnimationFrame(() => {
            try {
                this.ensureInitialHeight();

                const content = this.textArea.value;
                const currentWidth = this.textArea.clientWidth;

                if (content === this.lastResizeContent &&
                    this.textArea.style.height === this.lastResizeHeight &&
                    currentWidth === this.lastResizeWidth) {
                    return;
                }

                if (!content.trim()) {
                    this.resetToInitialHeight();
                    this.updateResizeCache(content);
                    return;
                }

                this.cachedComputedStyle = window.getComputedStyle(this.textArea);
                const resizeData = this.calculateResizeData(content);
                this.applyResize(resizeData);
                this.metrics.autoResizes++;
                this.updateResizeCache(content);

                // Trigger height change callback
                if (this.onHeightChangeCallback && typeof this.onHeightChangeCallback === 'function') {
                    try {
                        this.onHeightChangeCallback(this.textArea.style.height);
                    } catch (error) {
                        console.error('Error in onHeightChange callback:', error);
                    }
                }
            } catch (error) {
                console.warn('Auto-resize error:', error);
                if (this.initialHeight !== null) {
                    this.textArea.style.height = `${this.initialHeight}px`;
                }
            }
        });
    }

    updateResizeCache(content) {
        this.lastResizeContent = content;
        this.lastResizeHeight = this.textArea.style.height;
        this.lastResizeWidth = this.textArea.clientWidth;
    }

    getComputedLineHeight(computedStyle = null) {
        const style = computedStyle || this.getCachedComputedStyle();
        const { lineHeight, fontSize, fontFamily, fontWeight, fontStyle } = style;

        if (lineHeight && lineHeight !== 'normal') {
            const parsed = parseInt(lineHeight);
            if (!isNaN(parsed) && parsed > 0) {
                return parsed;
            }
        }

        if (!this.lineHeightMeasureElement) {
            this.lineHeightMeasureElement = document.createElement('div');
            this.lineHeightMeasureElement.style.position = 'absolute';
            this.lineHeightMeasureElement.style.visibility = 'hidden';
            this.lineHeightMeasureElement.style.whiteSpace = 'nowrap';
            this.lineHeightMeasureElement.textContent = 'M';
            document.body.appendChild(this.lineHeightMeasureElement);
        }

        this.lineHeightMeasureElement.style.fontSize = fontSize || '16px';
        this.lineHeightMeasureElement.style.fontFamily = fontFamily || 'inherit';
        this.lineHeightMeasureElement.style.fontWeight = fontWeight || 'normal';
        this.lineHeightMeasureElement.style.fontStyle = fontStyle || 'normal';
        this.lineHeightMeasureElement.style.lineHeight = lineHeight;

        const measuredHeight = this.lineHeightMeasureElement.offsetHeight;
        return measuredHeight || 20;
    }

    getCachedComputedStyle() {
        if (this.cachedComputedStyle) {
            return this.cachedComputedStyle;
        }
        this.cachedComputedStyle = window.getComputedStyle(this.textArea);
        return this.cachedComputedStyle;
    }

    clearStyleCache() {
        this.cachedComputedStyle = null;
    }

    ensureInitialHeight() {
        if (this.initialHeight === null || this.initialHeight === 0) {
            const height = this.textArea.offsetHeight;
            if (height > 0) {
                this.initialHeight = height;
                this.initialHeightIsEstimate = false;
            } else {
                const computedStyle = window.getComputedStyle(this.textArea);
                const lineHeight = this.getComputedLineHeight(computedStyle);
                const paddingTop = parseInt(computedStyle.paddingTop) || 8;
                const paddingBottom = parseInt(computedStyle.paddingBottom) || 8;
                const borderTop = parseInt(computedStyle.borderTopWidth) || 0;
                const borderBottom = parseInt(computedStyle.borderBottomWidth) || 0;
                this.initialHeight = (lineHeight * 3) + paddingTop + paddingBottom + borderTop + borderBottom;
                this.initialHeightIsEstimate = true;
                this.scheduleVisibilityCheck();
            }
        } else if (this.initialHeightIsEstimate) {
            const height = this.textArea.offsetHeight;
            if (height > 0) {
                this.initialHeight = height;
                this.initialHeightIsEstimate = false;
            }
        }
    }

    scheduleVisibilityCheck() {
        if (typeof IntersectionObserver !== 'undefined' && !this.visibilityObserver) {
            this.visibilityObserver = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && this.initialHeightIsEstimate) {
                        const height = this.textArea.offsetHeight;
                        if (height > 0) {
                            this.initialHeight = height;
                            this.initialHeightIsEstimate = false;
                            this.clearResizeCache();
                            this.autoResize();
                            this.visibilityObserver.disconnect();
                            this.visibilityObserver = null;
                        }
                    }
                });
            });
            this.visibilityObserver.observe(this.textArea);
        } else {
            this.scheduleVisibilityCheckFallback();
        }
    }

    scheduleVisibilityCheckFallback() {
        const checkVisibility = () => {
            if (!this.initialHeightIsEstimate) {
                return;
            }
            const height = this.textArea.offsetHeight;
            if (height > 0) {
                this.initialHeight = height;
                this.initialHeightIsEstimate = false;
                this.clearResizeCache();
                this.autoResize();
            } else {
                requestAnimationFrame(checkVisibility);
            }
        };
        requestAnimationFrame(checkVisibility);
    }

    resetToInitialHeight() {
        this.textArea.style.height = `${this.initialHeight}px`;
    }

    calculateResizeData(content) {
        try {
            const computedStyle = this.cachedComputedStyle || window.getComputedStyle(this.textArea);
            const lineHeight = this.getComputedLineHeight(computedStyle);
            const paddingTop = parseInt(computedStyle.paddingTop) || 8;
            const paddingBottom = parseInt(computedStyle.paddingBottom) || 8;
            const borderTop = parseInt(computedStyle.borderTopWidth) || 0;
            const borderBottom = parseInt(computedStyle.borderBottomWidth) || 0;

            const contentHeight = Math.max(1,
                this.initialHeight - paddingTop - paddingBottom - borderTop - borderBottom);
            const linesInInitialHeight = Math.max(1, Math.floor(contentHeight / lineHeight));
            const explicitLines = content.split('\n').length;

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

    applyResize(resizeData) {
        const {
            totalLines, linesInInitialHeight, lineHeight,
            paddingTop, paddingBottom, borderTop, borderBottom
        } = resizeData;

        const viewportHeight = window.innerHeight;
        const maxHeightLimit = Math.floor(viewportHeight * 0.9);
        const contentHeight = totalLines * lineHeight;
        const minHeightNeeded = contentHeight + paddingTop + paddingBottom + borderTop + borderBottom;

        this.textArea.style.height = 'auto';
        const naturalHeight = this.textArea.scrollHeight;

        let newHeight;
        if (totalLines <= linesInInitialHeight) {
            newHeight = this.initialHeight;
        } else if (naturalHeight <= maxHeightLimit) {
            newHeight = naturalHeight;
        } else if (minHeightNeeded <= maxHeightLimit) {
            newHeight = minHeightNeeded;
        } else {
            newHeight = maxHeightLimit;
        }

        newHeight = Math.max(newHeight, this.initialHeight);
        this.textArea.style.height = `${newHeight}px`;
    }

    clearResizeCache() {
        this.lastResizeContent = '';
        this.lastResizeHeight = null;
        this.lastResizeWidth = null;
    }

    resetInitialHeight() {
        if (this.textArea) {
            this.initialHeight = this.textArea.offsetHeight;
            this.clearResizeCache();
            this.autoResize();
        }
    }

    getCurrentHeightLevel() {
        if (!this.textArea || this.initialHeight === null) {
            return 0;
        }

        const currentHeight = this.textArea.offsetHeight;
        const viewportHeight = window.innerHeight;
        const maxHeightLimit = Math.floor(viewportHeight * 0.9);
        const computedStyle = this.cachedComputedStyle || window.getComputedStyle(this.textArea);
        const lineHeight = this.getComputedLineHeight(computedStyle);
        const tolerance = Math.max(lineHeight * 0.25, 3);

        if (currentHeight <= this.initialHeight + tolerance) {
            return 1;
        } else if (currentHeight >= maxHeightLimit - tolerance) {
            return 3;
        } else {
            return 2;
        }
    }

    applyViewportClamp() {
        if (!this.textArea) {
            return;
        }

        const viewportHeight = window.innerHeight;
        const maxHeightLimit = Math.floor(viewportHeight * 0.9);
        const currentHeight = parseInt(this.textArea.style.height) || this.textArea.offsetHeight;

        if (currentHeight > maxHeightLimit) {
            this.textArea.style.height = `${maxHeightLimit}px`;
            this.textArea.style.overflowY = 'auto';
        }
    }

    getResizeInfo() {
        if (!this.textArea || this.initialHeight === null) {
            return null;
        }

        const content = this.textArea.value;
        const explicitLines = content.split('\n').length;
        const computedStyle = this.cachedComputedStyle || window.getComputedStyle(this.textArea);
        const lineHeight = this.getComputedLineHeight(computedStyle);

        const viewportHeight = window.innerHeight;
        const maxHeightLimit = Math.floor(viewportHeight * 0.9);

        const contentHeight = explicitLines * lineHeight;
        const paddingTop = parseInt(computedStyle.paddingTop) || 8;
        const paddingBottom = parseInt(computedStyle.paddingBottom) || 8;
        const borderTop = parseInt(computedStyle.borderTopWidth) || 0;
        const borderBottom = parseInt(computedStyle.borderBottomWidth) || 0;
        const minHeightNeeded = contentHeight + paddingTop + paddingBottom + borderTop + borderBottom;

        const tolerance = Math.max(lineHeight * 0.25, 3);

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
            isAtMaxHeight: this.textArea.offsetHeight >= maxHeightLimit - tolerance
        };
    }

    destroy() {
        if (this.resizeFrameId !== null) {
            cancelAnimationFrame(this.resizeFrameId);
            this.resizeFrameId = null;
        }

        if (this.visibilityObserver) {
            this.visibilityObserver.disconnect();
            this.visibilityObserver = null;
        }

        if (this.ariaLiveRegion) {
            this.ariaLiveRegion.remove();
            this.ariaLiveRegion = null;
        }

        if (this.lineHeightMeasureElement) {
            this.lineHeightMeasureElement.remove();
            this.lineHeightMeasureElement = null;
        }
    }
}

// Export to global scope
window.AutoResizeManager = AutoResizeManager;
