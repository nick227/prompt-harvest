/**
 * FeedUIManager Lifecycle Manager
 * Handles instance lifecycle, cleanup, pause/resume, and batch mutations
 */

class FeedUILifecycle {
    /**
     * Execute cleanup for a FeedUIManager instance
     * @param {Object} manager - FeedUIManager instance
     */
    static cleanup(manager) {
        // Flip pause state to short-circuit any stray work
        manager.isPaused = true;

        // Clear last emitted element so fresh load can re-emit
        manager.setLastEmittedElement(null);

        // Clear debounce timer
        if (manager.debounceTimer) {
            clearTimeout(manager.debounceTimer);
            manager.debounceTimer = null;
        }

        // Abort event listeners
        if (manager.abortController) {
            manager.abortController.abort();
            manager.abortController = null;
        }

        // Cleanup scroll fallback
        if (manager.scrollFallbackController) {
            manager.scrollFallbackController.abort();
            manager.scrollFallbackController = null;
        }

        // Manual cleanup for fallback handlers without signal support
        if (manager.scrollFallbackHandlers) {
            const { scrollContainer, handleScroll } = manager.scrollFallbackHandlers;

            scrollContainer.removeEventListener('scroll', handleScroll);
            manager.scrollFallbackHandlers = null;
        }

        // Cleanup ResizeObserver
        if (manager.resizeObserver) {
            manager.resizeObserver.disconnect();
            manager.resizeObserver = null;
        }

        // Cleanup unified resize throttle timer
        if (manager.resizeThrottleTimer) {
            clearTimeout(manager.resizeThrottleTimer);
            manager.resizeThrottleTimer = null;
        }

        // Manual cleanup for window listeners without signal support
        if (manager.windowListenerHandlers) {
            const { resizeHandler, visibilityHandler } = manager.windowListenerHandlers;

            window.removeEventListener('resize', resizeHandler);
            if (visibilityHandler) {
                document.removeEventListener('visibilitychange', visibilityHandler);
            }
            manager.windowListenerHandlers = null;
        }

        // Remove from instance tracking
        if (typeof window !== 'undefined' && window.FeedUIManager && window.FeedUIManager.instances) {
            window.FeedUIManager.instances.delete(manager);
        }

        manager.disconnectIntersectionObserver();
        manager.isSetupComplete = false;
        manager.isDestroyed = true; // Mark as destroyed to prevent late timers
    }

    /**
     * Pause triggers during heavy DOM operations
     * @param {Object} manager - FeedUIManager instance
     * @param {boolean} [disconnectIO=false] - Disconnect IO for extreme DOM work
     */
    static pause(manager, disconnectIO = false) {
        // No-op fast path after destroy (public API safety)
        if (manager.isDestroyed) {
            return;
        }

        manager.isPaused = true;

        // Clear in-flight debounce to prevent late fires
        if (manager.debounceTimer) {
            clearTimeout(manager.debounceTimer);
            manager.debounceTimer = null;
        }

        // IO-off mode for extreme DOM work (opt-in via config or param)
        if (disconnectIO || manager.config.disconnectOnPause) {
            manager._pausedObserverState = !!manager.intersectionObserver;
            manager.disconnectIntersectionObserver();
            manager.debug('IO disconnected during pause (extreme mode)');
        }
    }

    /**
     * Resume triggers after heavy DOM operations
     * @param {Object} manager - FeedUIManager instance
     */
    static resume(manager) {
        // No-op fast path after destroy (public API safety)
        if (manager.isDestroyed) {
            return;
        }

        manager.isPaused = false;

        // Reconnect IO if it was disconnected during pause (extreme mode)
        if (manager._pausedObserverState) {
            manager.setupIntersectionObserver();
            manager.updateIntersectionObserver(); // Re-arm immediately
            manager.debug('IO reconnected after extreme pause');
            manager._pausedObserverState = null;

            // Immediate check if already at bottom (no need to wait for next frame)
            const lastImage = manager.domManager?.getLastImageElement();

            if (lastImage && manager.isElementInViewport(lastImage)) {
                manager.handleLastImageVisible();

                return; // Skip double rAF check below
            }
        }

        manager.debug('Resumed after pause');

        // Refresh IO before fallback on resume (double rAF for layout settling)
        manager.raf(() => {
            manager.raf(() => {
                // Guard against late timers after cleanup
                if (manager.isDestroyed) {
                    return;
                }

                // Re-arm observer first so checkNow() sees current IO state
                manager.updateIntersectionObserver();

                // Check if we should trigger after resume (force=true for proactive check)
                manager.checkNow(true); // Force check even with IO (proactive re-check)
            });
        });
    }

    /**
     * Batch mutation helper - automatically pauses, runs callback, and resumes
     * @param {Object} manager - FeedUIManager instance
     * @param {Function} callback - Function that performs DOM mutations
     * @returns {Promise<any>} Result of callback
     */
    static async batchMutations(manager, callback) {
        // No-op fast path after destroy
        if (manager.isDestroyed) {
            return;
        }

        FeedUILifecycle.pause(manager);

        try {
            return await callback();
        } finally {
            // Always resume, even if callback throws
            FeedUILifecycle.resume(manager);
        }
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.FeedUILifecycle = FeedUILifecycle;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FeedUILifecycle;
}

