/**
 * FeedUIManager Static Helpers
 * Static utility methods for event subscription and capability detection
 */

class FeedUIStaticHelpers {
    /**
     * Static convenience helper: subscribe to lastImageVisible events
     * @param {Function} handler - Event handler function
     * @param {EventTarget|Object} [options={}] - Target or options object
     * @param {EventTarget} [options.target=window] - Target to listen on
     * @param {boolean} [options.once] - Remove listener after first call
     * @param {boolean} [options.passive] - Passive listener flag
     * @param {boolean} [options.capture] - Use capture phase
     * @param {AbortSignal} [options.signal] - AbortSignal for cleanup
     * @returns {Function} Unsubscribe function that removes the listener.
     *
     * IMPORTANT NOTES:
     * - The returned unsubscribe function only passes the `capture` flag to removeEventListener
     *   (ignores `once` and `passive` as they don't affect removal). This ensures cross-browser
     *   reliability, especially on older Safari versions.
     * - If using AbortSignal, prefer calling signal.abort() over the unsubscribe function
     *   as it's more reliable and removes all listeners attached with that signal.
     *
     * @example
     * // Recommended: Use AbortSignal for cleanup
     * const controller = new AbortController();
     * FeedUIStaticHelpers.subscribe(handler, { signal: controller.signal });
     * controller.abort(); // Removes listener reliably
     *
     * @example
     * // Alternative: Use returned unsubscribe function
     * const unsubscribe = FeedUIStaticHelpers.subscribe(handler);
     * unsubscribe(); // Removes listener (capture-aware only)
     */
    static subscribe(handler, options = {}, eventName = 'lastImageVisible') {
        // Normalize options - support both EventTarget and options object
        let target;
        let listenerOptions;
        let captureFlag = false; // Capture only the capture bit for reliable removal

        if (options && typeof options.addEventListener === 'function') {
            // Legacy: second param is EventTarget
            target = options;
            listenerOptions = {};
        } else {
            // Modern: second param is options object
            target = options.target || (typeof window !== 'undefined' ? window : null);
            captureFlag = Boolean(options.capture); // Capture as boolean for older Safari
            listenerOptions = {
                once: options.once,
                passive: options.passive,
                capture: captureFlag,
                signal: options.signal
            };
        }

        if (!target || typeof target.addEventListener !== 'function') {
            console.warn('FeedUIStaticHelpers.subscribe: Invalid target provided');

            return () => {}; // No-op unsubscribe
        }

        // Add listener - try with options, fallback to capture boolean for older engines
        try {
            target.addEventListener(eventName, handler, listenerOptions);
        } catch (error) {
            // Older engines might not support options object
            // Fallback to capture boolean only
            target.addEventListener(eventName, handler, captureFlag);
        }

        // Return unsubscribe function - only capture bit is critical for removal
        return () => {
            // On older Safari, passing full options object can fail
            // Only capture bit must match for reliable removal
            target.removeEventListener(eventName, handler, captureFlag);
        };
    }

    /**
     * Static convenience helper: unsubscribe from lastImageVisible events
     * NOTE: Prefer using the unsubscribe function returned by subscribe() for proper option matching.
     * This helper only removes listeners added without special options (no capture, once, etc.)
     * @param {Function} handler - Event handler function to remove
     * @param {EventTarget} [target=window] - Target to remove from (defaults to window)
     * @param {string} [eventName='lastImageVisible'] - Event name to remove
     */
    static unsubscribe(handler, target = typeof window !== 'undefined' ? window : null, eventName = 'lastImageVisible') {
        if (!target || typeof target.removeEventListener !== 'function') {
            return;
        }

        target.removeEventListener(eventName, handler);
    }

    /**
     * Trigger pagination check after external DOM mutations
     * Updates observers and checks all instances (or specific one)
     * @param {Object} [manager] - Specific manager instance, or checks all instances
     */
    static triggerCheck(manager = null) {
        if (manager) {
            // Check specific instance (re-arms observation in all cases)
            manager.notifyFeedChanged();
        } else {
            // Check all instances (useful when you don't have a reference)
            const instances = FeedUIStaticHelpers.getAllInstances();

            instances.forEach(instance => {
                instance.notifyFeedChanged();
            });
        }
    }

    /**
     * Get all FeedUIManager instances
     * Note: This will be populated by FeedUIManager after it loads
     * @returns {Set} Set of all active instances
     */
    static getAllInstances() {
        // Access instances directly (FeedUIManager sets this)
        return FeedUIStaticHelpers._instances || new Set();
    }

    /**
     * Set instances reference (called by FeedUIManager on load)
     * @param {Set} instances - Set of active instances
     */
    static setInstancesReference(instances) {
        FeedUIStaticHelpers._instances = instances;
    }

    /**
     * Capability probe - check browser feature support
     * Handy for guards/analytics before instantiation
     * Memoized for performance (capabilities don't change at runtime)
     * @returns {Object} Feature support flags
     */
    static getCapabilities() {
        // Memoize on first call (capabilities are static)
        if (FeedUIStaticHelpers._capabilities) {
            return FeedUIStaticHelpers._capabilities;
        }

        const hasWindow = typeof window !== 'undefined';

        FeedUIStaticHelpers._capabilities = {
            intersectionObserver: hasWindow && 'IntersectionObserver' in window,
            resizeObserver: hasWindow && 'ResizeObserver' in window,
            customEvent: hasWindow && typeof CustomEvent === 'function',
            abortController: hasWindow && typeof AbortController === 'function',
            queueMicrotask: hasWindow && typeof queueMicrotask !== 'undefined',
            eventTarget: hasWindow && typeof EventTarget !== 'undefined',
            weakRef: hasWindow && typeof WeakRef !== 'undefined',
            prefersReducedMotion: hasWindow && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
            isSSR: !hasWindow
        };

        return FeedUIStaticHelpers._capabilities;
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.FeedUIStaticHelpers = FeedUIStaticHelpers;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FeedUIStaticHelpers;
}

