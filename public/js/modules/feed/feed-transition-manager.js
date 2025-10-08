// Feed Transition Manager - Handles smooth transitions for feed UI
// Manages fade in/out animations with accessibility support

class FeedTransitionManager {
    constructor(domManager, config = {}) {
        this.domManager = domManager;
        this.config = {
            transitionDuration: 300,
            ...config
        };
    }

    // Start smooth transition (fade out)
    async startSmoothTransition() {
        const promptOutput = this.domManager?.getElement?.('promptOutput');

        if (!promptOutput) {
            return;
        }

        // Guard FEED_CONSTANTS usage (protect against undeclared identifier)
        const classes = (typeof FEED_CONSTANTS !== 'undefined' && FEED_CONSTANTS?.CLASSES) || {};
        const transitions = (typeof FEED_CONSTANTS !== 'undefined' && FEED_CONSTANTS?.TRANSITIONS) || {};

        // Add transitioning class to prevent content flashing
        if (classes.TRANSITIONING) {
            promptOutput.classList.add(classes.TRANSITIONING);
        }

        // Start fade out
        if (classes.FADE_OUT) {
            promptOutput.classList.add(classes.FADE_OUT);
        }

        // Wait for fade out to complete
        await this.waitForTransition(promptOutput, transitions.FADE_OUT_DURATION);

        return promptOutput;
    }

    // Complete smooth transition (fade in)
    async completeSmoothTransition(promptOutput) {
        if (!promptOutput) {
            return;
        }

        // Guard FEED_CONSTANTS usage (protect against undeclared identifier)
        const classes = (typeof FEED_CONSTANTS !== 'undefined' && FEED_CONSTANTS?.CLASSES) || {};
        const transitions = (typeof FEED_CONSTANTS !== 'undefined' && FEED_CONSTANTS?.TRANSITIONS) || {};

        // Remove fade out and add fade in
        if (classes.FADE_OUT) {
            promptOutput.classList.remove(classes.FADE_OUT);
        }
        if (classes.FADE_IN) {
            promptOutput.classList.add(classes.FADE_IN);
        }

        // Wait for fade in to complete
        await this.waitForTransition(promptOutput, transitions.FADE_IN_DURATION);

        // Clean up transition classes
        if (classes.TRANSITIONING) {
            promptOutput.classList.remove(classes.TRANSITIONING);
        }
        if (classes.FADE_IN) {
            promptOutput.classList.remove(classes.FADE_IN);
        }
    }

    // Wait for transition duration using transitionend event with fallback
    waitForTransition(element, duration) {
        return new Promise(resolve => {
            // SSR safety check
            if (typeof window === 'undefined') {
                resolve();

                return;
            }

            // Early resolve if user prefers reduced motion
            if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                resolve();

                return;
            }

            // Use config duration as fallback if FEED_CONSTANTS not available (allow 0)
            const rawDuration = duration ?? this.config.transitionDuration;

            // Coerce to number once (handles strings, NaN, etc.)
            const numericDuration = Number(rawDuration);
            const safeDuration = Number.isFinite(numericDuration) ? numericDuration : this.config.transitionDuration;

            // Early resolve when duration <= 0
            if (safeDuration <= 0) {
                resolve();

                return;
            }

            if (!element) {
                setTimeout(resolve, safeDuration);

                return;
            }

            let resolved = false;
            const timeoutId = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    resolve();
                }
            }, safeDuration);

            const handleTransitionEnd = event => {
                if (event.target === element && !resolved) {
                    resolved = true;
                    clearTimeout(timeoutId);
                    element.removeEventListener('transitionend', handleTransitionEnd);
                    resolve();
                }
            };

            element.addEventListener('transitionend', handleTransitionEnd, { once: true });
        });
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.FeedTransitionManager = FeedTransitionManager;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FeedTransitionManager;
}

