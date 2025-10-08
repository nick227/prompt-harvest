/* global FeedUIHelpers, FeedUIEventFactory, FeedTransitionManager, FeedTagUI */

/**
 * @typedef {Object} FeedDomManager
 * @property {Function} getLastImageElement - Get the last image in the feed
 * @property {Function} [showLoading] - Show loading indicator
 * @property {Function} [hideLoading] - Hide loading indicator
 * @property {Function} [clearFeedContent] - Clear all feed content
 * @property {Function} [getElement] - Get element by name
 * @property {Function} [isElementInViewport] - Check if element is in viewport
 */

/**
 * Feed UI Manager - Handles UI state and interactions for infinite scroll
 * @class FeedUIManager
 */
class FeedUIManager {
    // Static event name (avoid per-instance copies)
    static LAST_IMAGE_VISIBLE_EVENT = 'lastImageVisible';
    // Static default threshold (single copy, matches static event)
    static DEFAULT_THRESHOLD = 0.1;

    /**
     * Create a new Feed UI Manager instance
     * @param {FeedDomManager} domManager - DOM manager instance for feed operations
     * @param {Element|null} [scrollRoot=null] - Custom scroll container (or null for viewport)
     * @param {Object} [config={}] - Configuration options
     * @param {string} [config.rootMargin='300px 0px'] - Intersection observer root margin
     * @param {number|number[]} [config.threshold=0.1] - Intersection observer threshold
     * @param {number} [config.debounceMs=100] - Debounce delay for pagination triggers
     * @param {number} [config.resizeThrottleMs=200] - Throttle delay for resize events
     * @param {number} [config.transitionDuration=300] - Default transition duration (ms)
     * @param {EventTarget} [config.eventTarget=window] - Target for global event dispatch
     * @param {boolean} [config.debug=false] - Enable debug logging for this instance
     * @param {boolean} [config.disconnectOnPause=false] - Disconnect IO during pause (for bulk DOM virtualization/masonry reflows). Trades tiny re-arm cost for zero observer activity during heavy ops.
     */
    constructor(domManager, scrollRoot = null, config = {}) {
        // Assert helper availability early (developer-friendly error)
        if (typeof FeedUIHelpers === 'undefined') {
            throw new Error('FeedUIHelpers is not loaded. Please load feed-ui-helpers.js before feed-ui-manager.js');
        }
        if (typeof FeedUIEventFactory === 'undefined') {
            throw new Error('FeedUIEventFactory is not loaded. Please load feed-ui-event-factory.js before feed-ui-manager.js');
        }
        if (typeof FeedTransitionManager === 'undefined') {
            throw new Error('FeedTransitionManager is not loaded. Please load feed-transition-manager.js before feed-ui-manager.js');
        }
        if (typeof FeedTagUI === 'undefined') {
            throw new Error('FeedTagUI is not loaded. Please load feed-tag-ui.js before feed-ui-manager.js');
        }

        // Ensure domManager has the critical method we need
        if (!domManager || typeof domManager.getLastImageElement !== 'function') {
            throw new Error('FeedUIManager requires a domManager with getLastImageElement() method');
        }

        this.domManager = domManager;
        this.scrollRoot = scrollRoot; // Custom scroll container support

        this.config = {
            rootMargin: '300px 0px',
            threshold: FeedUIManager.DEFAULT_THRESHOLD,
            debounceMs: 100,
            resizeThrottleMs: 200,
            transitionDuration: 300,
            eventTarget: typeof window !== 'undefined' ? window : null, // Default to window for global listeners
            debug: false, // Per-instance debug flag
            disconnectOnPause: false, // IO-off mode for extreme DOM work
            ...config
        };

        // Coerce config numbers to ensure proper types (allow 0 and arrays)
        this.config.threshold = FeedUIHelpers.coerceThreshold(this.config.threshold, FeedUIManager.DEFAULT_THRESHOLD);
        // Clamp timing values to sane ranges (0-10000ms) to avoid Infinity/NaN bugs
        this.config.debounceMs = Math.max(0, Math.min(10000, FeedUIHelpers.coerceNumber(this.config.debounceMs, 100)));
        this.config.resizeThrottleMs = Math.max(0, Math.min(10000, FeedUIHelpers.coerceNumber(this.config.resizeThrottleMs, 200)));
        this.config.transitionDuration = Math.max(0, Math.min(10000, FeedUIHelpers.coerceNumber(this.config.transitionDuration, 300)));

        // Initialize sub-modules
        this.tagUI = new FeedTagUI();
        this.transitionManager = new FeedTransitionManager(domManager, this.config);
        this.isLoading = false;
        this.isSetupComplete = false;
        this.intersectionObserver = null;
        this.observedTarget = null; // Track what we're actually observing
        this.debounceTimer = null;
        this.abortController = null;
        this.resizeObserver = null; // For container size changes
        this.scrollFallbackController = null; // Initialize fallback controller
        this.scrollFallbackHandlers = null; // Store fallback listeners for cleanup
        this.windowListenerHandlers = null; // Store window listeners for cleanup without signal
        this.resizeThrottleTimer = null; // For resize throttling
        this.resizeTimeoutId = null; // Track resize timeout (50ms in handleWindowResize)
        this.lastEmittedEl = null; // Track last emitted element for de-duplication (or WeakRef)
        this.useWeakRef = typeof WeakRef !== 'undefined'; // Use WeakRef if available for GC-friendly tracking
        this.isPaused = false; // Pause state for heavy DOM operations

        // Instance tracking
        this.instanceId = `FeedUIManager_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        this.isDestroyed = false; // Flag to prevent late timers after cleanup
        FeedUIManager.instances = FeedUIManager.instances || new Set();
        FeedUIManager.instances.add(this);

        // Centralized microtask scheduling with auto-guard
        this.scheduleMicrotask = callback => {
            if (typeof queueMicrotask !== 'undefined') {
                queueMicrotask(() => {
                    // Self-guarding: no-op if destroyed (prevents all late microtasks)
                    if (!this.isDestroyed) {
                        callback();
                    }
                });
            } else {
                // Fallback for older browsers
                Promise.resolve().then(() => {
                    // Self-guarding: no-op if destroyed (prevents all late microtasks)
                    if (!this.isDestroyed) {
                        callback();
                    }
                });
            }
        };

        // Ultra-light debug hook (per-instance, only logs if enabled)
        this.debug = (message, ...args) => {
            if (this.config.debug) {
                console.log(`[FeedUI:${this.instanceId.slice(-8)}] ${message}`, ...args);
            }
        };

        // rAF fallback helper (for odd test environments / very old engines)
        this.raf = callback => {
            if (typeof requestAnimationFrame !== 'undefined') {
                return requestAnimationFrame(callback);
            }

            // Fallback: 16ms timeout (~60fps)
            return setTimeout(callback, 16);
        };
    }

    /**
     * Initialize UI manager (idempotent and chainable)
     * @returns {FeedUIManager} Returns this for chaining
     */
    init() {
        // No-op fast path after destroy (public API safety)
        if (this.isDestroyed) {
            return this;
        }

        // SSR-safe init - only run in browser
        if (typeof window === 'undefined') {
            return this;
        }

        // Idempotent guard - prevent duplicate initialization
        if (this.isSetupComplete) {
            return this;
        }

        // Revive instance after cleanup
        this.isDestroyed = false;

        this.setupIntersectionObserver();
        this.setupResizeObserver();
        this.setupTagOverlays();
        this.setupWindowListeners();
        this.isSetupComplete = true;

        // Observe initial last image if it exists
        this.updateIntersectionObserver();

        // Kick the fallback once on init (IO-less browsers need first check)
        if (!this.intersectionObserver) {
            this.scheduleMicrotask(() => {
                this.checkNow();
            });
        }

        return this; // Chainable for convenience
    }

    // Setup intersection observer for infinite scroll
    setupIntersectionObserver() {
        // Disconnect existing observer to avoid duplicates
        if (this.intersectionObserver) {
            this.disconnectIntersectionObserver();
        }

        if ('IntersectionObserver' in window) {
            // Ensure root is a valid Element or null (viewport)
            const observerRoot = FeedUIHelpers.getValidObserverRoot(this.scrollRoot);

            this.intersectionObserver = new IntersectionObserver(
                entries => {
                    // Simple for...of avoids closure allocation (perf optimization)
                    for (const entry of entries) {
                        // Only react to the observed target to avoid fresh DOM reads and eliminate races
                        if (entry.isIntersecting && entry.target === this.observedTarget) {
                            this.handleLastImageVisible();
                            break; // Only one target ever observed, early exit
                        }
                    }
                },
                {
                    root: observerRoot, // Use custom scroll container (Element or null)
                    rootMargin: this.config.rootMargin,
                    threshold: FeedUIHelpers.normalizeThreshold(this.config.threshold, FeedUIManager.DEFAULT_THRESHOLD)
                }
            );
        } else {
            // Scroll fallback when IntersectionObserver is unavailable
            this.setupScrollFallback();
        }
    }

    // Setup scroll fallback for older browsers
    setupScrollFallback() {
        // Clean up existing fallback listeners first
        if (this.scrollFallbackController) {
            this.scrollFallbackController.abort();
            this.scrollFallbackController = null;
        }

        // Manual cleanup for fallback handlers without signal support
        if (this.scrollFallbackHandlers) {
            const { scrollContainer, handleScroll } = this.scrollFallbackHandlers;

            scrollContainer.removeEventListener('scroll', handleScroll);
            // Note: resize is not attached in fallback (handled by setupWindowListeners)
            this.scrollFallbackHandlers = null;
        }

        // Create AbortController for fallback cleanup
        this.scrollFallbackController = new AbortController();

        // rAF-throttle for scroll fallback to reduce layout thrash
        let rafPending = false;
        const handleScroll = () => {
            if (this.isLoading || this.isPaused) {
                return;
            }

            if (rafPending) {
                return;
            }

            rafPending = true;
            this.raf(() => {
                rafPending = false;

                // Guard against late timers after cleanup
                if (this.isDestroyed) {
                    return;
                }

                const lastImage = this.domManager?.getLastImageElement();

                if (lastImage && this.isElementInViewport(lastImage)) {
                    this.handleLastImageVisible();
                }
            });
        };

        // Prefer element root for reliable scroll events
        // Try: scrollRoot > domManager.getScrollContainer > window
        const scrollContainer = FeedUIHelpers.getValidObserverRoot(this.scrollRoot) ||
                               FeedUIHelpers.getValidObserverRoot(this.domManager?.getScrollContainer?.()) ||
                               window;

        // Try to use signal for cleanup, fall back if not supported
        try {
            scrollContainer.addEventListener('scroll', handleScroll, { passive: true, signal: this.scrollFallbackController.signal });
            // Note: resize handled by setupWindowListeners to avoid double work
        } catch (error) {
            // Fallback for browsers without AbortController support
            // Store listeners for manual cleanup
            this.scrollFallbackHandlers = { scrollContainer, handleScroll };
            scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
            // Note: resize handled by setupWindowListeners to avoid double work
        }
    }

    // Setup ResizeObserver for container size changes
    setupResizeObserver() {
        try {
            // Disconnect existing observer before reusing
            if (this.resizeObserver) {
                this.resizeObserver.disconnect();
                this.resizeObserver = null;
            }

            if ('ResizeObserver' in window) {
                this.resizeObserver = new ResizeObserver(() => {
                    // Throttle resize events for performance
                    if (this.resizeThrottleTimer) {
                        clearTimeout(this.resizeThrottleTimer);
                    }

                    this.resizeThrottleTimer = setTimeout(() => {
                        // Guard against late timers after cleanup
                        if (this.isDestroyed) {
                            return;
                        }

                        // Trigger pagination check on container size changes
                        if (!this.isLoading) {
                            const lastImage = this.domManager?.getLastImageElement();

                            if (lastImage && this.isElementInViewport(lastImage)) {
                                this.handleLastImageVisible();
                            }
                        }
                    }, this.config.resizeThrottleMs);
                });

                // Observe the element that actually resizes (prefer domManager > scrollRoot > fallback)
                let target = this.domManager?.getScrollContainer?.() ||
                          this.scrollRoot ||
                          document.documentElement;

                // Ensure target is a valid DOM element (not window)
                if (target === window || !target || !target.nodeType) {
                    target = document.documentElement;
                }

                // Skip if target is detached from DOM (guard isConnected access)
                const isConnected = typeof target.isConnected === 'undefined' ? true : target.isConnected;

                if (isConnected) {
                    this.resizeObserver.observe(target);
                }
            }
        } catch (error) {
            console.error('❌ FEED UI MANAGER: Failed to setup ResizeObserver:', error);
        }
    }

    // Handle when last image becomes visible
    handleLastImageVisible() {
        this.debug('handleLastImageVisible called', { isLoading: this.isLoading, isPaused: this.isPaused });

        try {
            if (this.isLoading || this.isPaused) {
                return;
            }

            // Clear any existing debounce timer
            if (this.debounceTimer) {
                clearTimeout(this.debounceTimer);
            }

            // Debounce to prevent double-firing during slow loads
            this.debounceTimer = setTimeout(() => {
                // Guard against late timers after cleanup
                if (this.isDestroyed) {
                    return;
                }

                const lastImage = this.domManager?.getLastImageElement();

                // Ensure getLastImageElement() returns an Element
                if (lastImage && lastImage.nodeType === 1) {
                    // Sanitize before comparison (prevents stale dedupe)
                    this.sanitizeLastEmittedElement();

                    // De-dupe: don't emit for the same element twice
                    if (this.getLastEmittedElement() === lastImage) {
                        return;
                    }

                    // Unobserve before dispatch to prevent re-fires while loading flips
                    if (this.intersectionObserver && this.observedTarget) {
                        try {
                            this.intersectionObserver.unobserve(this.observedTarget);
                        } catch (error) {
                            // Silently handle unobserve errors (element may have been removed)
                        }
                    }

                    // Dispatch on element's root node (Shadow DOM aware)
                    const elementRoot = lastImage.getRootNode?.() ||
                                       (typeof document !== 'undefined' ? document : window);

                    const elementEvent = FeedUIEventFactory.createLastImageVisibleEvent(lastImage, this);

                    elementRoot.dispatchEvent(elementEvent);

                    // Also dispatch on configured global target if specified (fresh event)
                    const globalTarget = this.config.eventTarget;

                    if (globalTarget && globalTarget !== elementRoot) {
                        // Guard: ensure target has dispatchEvent (feature-detect, no instanceof)
                        if (typeof globalTarget.dispatchEvent === 'function') {
                            const globalEvent = FeedUIEventFactory.createLastImageVisibleEvent(lastImage, this);

                            globalTarget.dispatchEvent(globalEvent);
                        }
                    }

                    // Track last emitted element and null observedTarget
                    this.setLastEmittedElement(lastImage);
                    this.observedTarget = null;

                    // Re-arm on next frame if loading didn't start (prevents race with slow loads)
                    this.raf(() => {
                        // Guard against late timers after cleanup
                        if (this.isDestroyed) {
                            return;
                        }

                        if (!this.isLoading) {
                            this.updateIntersectionObserver();
                        }
                    });
                }
            }, this.config.debounceMs); // Configurable debounce
        } catch (error) {
            console.error('❌ FEED UI MANAGER: Error in handleLastImageVisible:', error);
        }
    }

    /**
     * Set loading state
     * @param {boolean} loading - True to show loading, false to hide
     */
    setLoading(loading) {
        // No-op fast path after destroy (public API safety)
        if (this.isDestroyed) {
            return;
        }

        this.isLoading = loading;

        if (loading) {
            this.domManager?.showLoading();
            // Reset last emitted element when loading starts
            this.setLastEmittedElement(null);
        } else {
            this.domManager?.hideLoading();
            // Wait a frame after hiding loader (DOM changes may reshuffle last image)
            this.raf(() => {
                if (!this.isDestroyed) {
                    this.updateIntersectionObserver();
                }
            });
        }
    }

    // Get loading state
    getLoading() {
        return this.isLoading;
    }

    /**
     * Get current observer state (for tests/assertions)
     * @returns {Object} Observer state
     */
    getObserverState() {
        return {
            hasObserver: !!this.intersectionObserver,
            observedTarget: this.observedTarget,
            isPaused: this.isPaused,
            isLoading: this.isLoading,
            isDestroyed: this.isDestroyed
        };
    }

    // Show loading spinner
    showLoading() {
        this.setLoading(true);
    }

    // Hide loading spinner
    hideLoading() {
        this.setLoading(false);
    }

    // Show login prompt
    showLoginPrompt() {
        if (!this.domManager?.showLoginPrompt) {
            console.error('❌ FEED UI MANAGER: domManager.showLoginPrompt not available');

            return;
        }

        this.domManager.showLoginPrompt();
    }

    // Show no images message
    showNoImagesMessage() {
        if (!this.domManager?.showNoImagesMessage) {
            console.error('❌ FEED UI MANAGER: domManager.showNoImagesMessage not available');

            return;
        }

        this.domManager.showNoImagesMessage();
    }

    // Start smooth transition (delegates to transition manager)
    async startSmoothTransition() {
        return this.transitionManager.startSmoothTransition();
    }

    // Complete smooth transition (delegates to transition manager)
    async completeSmoothTransition(promptOutput) {
        return this.transitionManager.completeSmoothTransition(promptOutput);
    }

    // Wait for transition duration (delegates to transition manager)
    waitForTransition(element, duration) {
        return this.transitionManager.waitForTransition(element, duration);
    }

    // Show error message
    showErrorMessage(message) {
        if (!this.domManager?.showErrorMessage) {
            console.error('❌ FEED UI MANAGER: domManager.showErrorMessage not available');

            return;
        }
        this.domManager.showErrorMessage(message);
    }

    // Clear feed content
    clearFeedContent() {
        if (!this.domManager?.clearFeedContent) {
            console.error('❌ FEED UI MANAGER: domManager.clearFeedContent not available');

            return;
        }
        this.domManager.clearFeedContent();

        // Reset dedupe state when feed is cleared
        this.setLastEmittedElement(null);

        // Clear IO state when feed is wiped
        if (this.intersectionObserver && this.observedTarget) {
            try {
                this.intersectionObserver.unobserve(this.observedTarget);
            } catch (error) {
                // Silently handle unobserve errors (element may have been removed)
            }
        }
        this.observedTarget = null;

        // Optionally refresh observer to new state
        this.scheduleMicrotask(() => {
            this.updateIntersectionObserver();

            // Manual poke if IO is missing (fallback immediate check)
            if (!this.intersectionObserver) {
                this.checkNow();
            }
        });
    }

    // Remove specific image from feed
    removeImageFromFeed(imageId) {
        if (!this.domManager?.removeImageFromFeed) {
            console.error('❌ FEED UI MANAGER: domManager.removeImageFromFeed not available');

            return false;
        }

        return this.domManager.removeImageFromFeed(imageId);
    }

    // Add image to feed (delegates to image handler)
    addImageToFeed(imageData, filter) {
        // For backward compatibility, try to use the feed manager's image handler
        if (window.feedManager && window.feedManager.imageHandler) {
            const wasAdded = window.feedManager.imageHandler.addImageToFeed(imageData, filter);

            // Only update intersection observer if a new image was actually added
            if (wasAdded) {
                // Microtask fallback in addImageToFeed (DOM flush first)
                this.scheduleMicrotask(() => {
                    this.updateIntersectionObserver();

                    // Manual poke if IO is missing (fallback immediate check)
                    if (!this.intersectionObserver) {
                        this.checkNow();
                    }
                });

                // Add to tab service for intelligent filtering
                if (window.feedManager && window.feedManager.tabService) {
                    window.feedManager.tabService.addImage(imageData);
                }
            }

            return wasAdded;
        }

        return false;
    }

    // Centralize "last element" sanitation (prevents stale dedupe + GC pinning)
    sanitizeLastEmittedElement() {
        // Guard hot path against post-cleanup calls
        if (this.isDestroyed) {
            return;
        }

        // Get actual element from WeakRef if used
        const el = this.useWeakRef && this.lastEmittedEl instanceof WeakRef
            ? this.lastEmittedEl.deref()
            : this.lastEmittedEl;

        // Clear if element is gone or detached
        if (!el || !el.isConnected) {
            this.lastEmittedEl = null;
        }
    }

    // Get last emitted element (handles both WeakRef and direct reference)
    getLastEmittedElement() {
        // Guard hot path against post-cleanup calls
        if (this.isDestroyed) {
            return null;
        }

        if (this.useWeakRef && this.lastEmittedEl instanceof WeakRef) {
            return this.lastEmittedEl.deref() || null;
        }

        return this.lastEmittedEl;
    }

    // Set last emitted element (uses WeakRef if available)
    setLastEmittedElement(element) {
        if (this.useWeakRef && element) {
            this.lastEmittedEl = new WeakRef(element);
        } else {
            this.lastEmittedEl = element;
        }
    }

    // Update intersection observer - fix observer churn
    updateIntersectionObserver() {
        // Auto-clear dedupe ref if the node was removed (prevents GC pinning)
        this.sanitizeLastEmittedElement();

        if (!this.intersectionObserver || this.isPaused) {
            return;
        }

        // Live check: don't keep observing a detached node
        if (this.observedTarget && !this.observedTarget.isConnected) {
            // Current target is detached, unobserve and clear it
            try {
                this.intersectionObserver.unobserve(this.observedTarget);
            } catch (error) {
                // Silently handle unobserve errors
            }
            this.observedTarget = null;
        }

        const lastImage = this.domManager?.getLastImageElement();

        // Ensure getLastImageElement() returns an Element
        if (!lastImage || lastImage.nodeType !== 1) {
            return;
        }

        // Guard: don't observe a node not in DOM
        if (!lastImage.isConnected) {
            return;
        }

        // Only update if we have a new last image
        if (lastImage !== this.observedTarget) {
            // Unobserve previous element instead of disconnecting
            if (this.observedTarget) {
                try {
                    this.intersectionObserver.unobserve(this.observedTarget);
                } catch (error) {
                    // Silently handle unobserve errors (element may have been removed)
                }
            }

            // Observe new last image - wrap to catch DOM churn errors
            try {
                this.intersectionObserver.observe(lastImage);
                this.observedTarget = lastImage;
                this.debug('Observing new last image', { element: lastImage, isConnected: lastImage.isConnected });
            } catch (error) {
                // Element might have been detached between check and observe()
                // Silently handle and clear observedTarget
                this.observedTarget = null;
                this.debug('Failed to observe (element likely detached)', error);
            }
        }
    }


    // Update filter button states
    updateFilterButtonStates(availableFilters) {
        this.domManager?.updateFilterButtonStates?.(availableFilters);
    }

    // Set filter button as active
    setFilterButtonActive(filter) {
        this.domManager?.setFilterButtonActive?.(filter);
    }

    // Get scroll position
    getScrollPosition() {
        return this.domManager?.getScrollPosition?.();
    }

    // Set scroll position
    setScrollPosition(position) {
        this.domManager?.setScrollPosition?.(position);
    }

    // Check if element is in viewport
    isElementInViewport(element) {
        // Guard hot path against post-cleanup calls
        if (this.isDestroyed) {
            return false;
        }

        // Use domManager if available, otherwise fallback
        if (this.domManager?.isElementInViewport) {
            return this.domManager.isElementInViewport(element, this.scrollRoot);
        }

        // Fallback implementation with custom scroll root support
        if (!element) {
            return false;
        }

        const rect = element.getBoundingClientRect();

        // Zero-size element check (display:none or width/height 0)
        if (rect.width === 0 && rect.height === 0) {
            return false; // Invisible element can't trigger
        }

        // Validate scrollRoot is an element before using it
        const validRoot = FeedUIHelpers.getValidObserverRoot(this.scrollRoot);

        if (validRoot) {
            // Use custom scroll container bounds with margin
            const containerRect = validRoot.getBoundingClientRect();
            const containerSize = { width: containerRect.width, height: containerRect.height };
            const margin = FeedUIHelpers.parseRootMargin(this.config.rootMargin, containerSize);

            return (
                rect.top <= containerRect.bottom + margin.bottom &&
                rect.bottom >= containerRect.top - margin.top &&
                rect.right >= containerRect.left - margin.left &&
                rect.left <= containerRect.right + margin.right
            );
        }

        // Use window bounds with margin
        const windowHeight = window.innerHeight || document.documentElement.clientHeight;
        const windowWidth = window.innerWidth || document.documentElement.clientWidth;
        const containerSize = { width: windowWidth, height: windowHeight };
        const margin = FeedUIHelpers.parseRootMargin(this.config.rootMargin, containerSize);

        return (
            rect.top <= windowHeight + margin.bottom &&
            rect.bottom >= -margin.top &&
            rect.right >= -margin.left &&
            rect.left <= windowWidth + margin.right
        );
    }

    // Get last image element (proxy to domManager for convenience)
    getLastImageElement() {
        return this.domManager?.getLastImageElement?.();
    }


    /**
     * Manual check for pagination trigger
     * @param {boolean} [force=false] - Force check even when IO exists (for proactive re-checks)
     */
    checkNow(force = false) {
        // Guard hot path against post-cleanup calls
        if (this.isDestroyed) {
            return;
        }

        // Only use when IO is unavailable (true fallback-only helper), unless forced
        if (this.intersectionObserver && !force) {
            return; // Let IO handle it
        }

        if (!this.isLoading && !this.isPaused) {
            const lastImage = this.domManager?.getLastImageElement();

            if (lastImage && this.isElementInViewport(lastImage)) {
                this.handleLastImageVisible();
            }
        }
    }

    /**
     * Instance hook for external DOM mutations
     * Call this after you mutate the feed outside addImageToFeed/clearFeedContent
     * Updates observer and triggers pagination check if needed
     */
    notifyFeedChanged() {
        // No-op fast path after destroy
        if (this.isDestroyed) {
            return;
        }

        this.debug('notifyFeedChanged called');

        // Update observer to new last image
        this.scheduleMicrotask(() => {
            this.updateIntersectionObserver();

            // Manual poke if IO is missing (fallback immediate check)
            if (!this.intersectionObserver) {
                this.checkNow();
            }
        });
    }

    /**
     * Alias for notifyFeedChanged (common search term: "DOM mutated")
     * @see notifyFeedChanged
     */
    notifyDOMMutated() {
        return this.notifyFeedChanged();
    }

    // Set scroll root at runtime (allows switching containers)
    setScrollRoot(newScrollRoot) {
        // No-op fast path after destroy (public API safety)
        if (this.isDestroyed) {
            return;
        }

        if (this.scrollRoot === newScrollRoot) {
            return; // No change needed
        }

        // Full cleanup before re-setup to avoid double fires and leaks
        this.disconnectIntersectionObserver();
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }

        if (this.scrollFallbackController) {
            this.scrollFallbackController.abort();
            this.scrollFallbackController = null;
        }

        // Manual cleanup for fallback handlers without signal support
        if (this.scrollFallbackHandlers) {
            const { scrollContainer, handleScroll } = this.scrollFallbackHandlers;

            scrollContainer.removeEventListener('scroll', handleScroll);
            // Note: resize is not attached in fallback (handled by setupWindowListeners)
            this.scrollFallbackHandlers = null;
        }

        // Manual cleanup for window listeners without signal support
        if (this.windowListenerHandlers) {
            const { resizeHandler, visibilityHandler } = this.windowListenerHandlers;

            window.removeEventListener('resize', resizeHandler);
            document.removeEventListener('visibilitychange', visibilityHandler);
            this.windowListenerHandlers = null;
        }

        // Update scroll root
        this.scrollRoot = newScrollRoot;

        // Revive instance if it was cleaned up
        this.isDestroyed = false;

        // Recreate observers with new root
        this.setupIntersectionObserver();
        this.setupResizeObserver();
        this.setupWindowListeners(); // Reattach window listeners
        // Note: setupScrollFallback() is only called by setupIntersectionObserver() if IO is unavailable

        // Update intersection observer to new last image
        this.updateIntersectionObserver();

        // Proactive check after switching containers (force-check even with IO for snappier UX)
        this.scheduleMicrotask(() => {
            this.checkNow(true); // Force check regardless of IO
        });
    }

    // Disconnect intersection observer with proper cleanup
    disconnectIntersectionObserver() {
        if (this.intersectionObserver) {
            // Unobserve the observed target if it exists
            if (this.observedTarget) {
                try {
                    this.intersectionObserver.unobserve(this.observedTarget);
                } catch (error) {
                    // Silently handle unobserve errors (element may have been removed)
                }
            }
            this.intersectionObserver.disconnect();
            this.intersectionObserver = null; // Null the IO instance after disconnect
        }

        // Clean up stale observedTarget (prevents holding onto detached nodes)
        this.observedTarget = null;

        // Also sanitize lastEmittedEl to prevent GC pinning
        this.sanitizeLastEmittedElement();
    }

    // Reconnect intersection observer
    reconnectIntersectionObserver() {
        this.disconnectIntersectionObserver();
        this.setupIntersectionObserver();
        this.updateIntersectionObserver();

        // Belt-and-suspenders: clear dedupe state on force-rebuild to avoid stale refs
        this.setLastEmittedElement(null);
    }

    // Force update intersection observer (useful after view changes)
    forceUpdateIntersectionObserver() {
        // Always rebuild, even if IO was null
        this.disconnectIntersectionObserver();
        this.setupIntersectionObserver();
        this.updateIntersectionObserver();

        // Belt-and-suspenders: clear dedupe state on force-rebuild to avoid stale refs
        this.setLastEmittedElement(null);
    }

    // Handle window resize
    handleWindowResize() {
        // Window resize handled by CSS media queries and responsive design

        // Clear any pending resize timeout
        if (this.resizeTimeoutId) {
            clearTimeout(this.resizeTimeoutId);
            this.resizeTimeoutId = null;
        }

        // Check and fill to bottom after window resize using rAF + timeout for layout alignment
        this.raf(() => {
            this.resizeTimeoutId = setTimeout(() => {
                // Guard deferred work after destroy
                if (this.isDestroyed) {
                    return;
                }

                this.resizeTimeoutId = null; // Clear after execution

                if (window.feedManager && window.feedManager.fillToBottomManager) {
                    const currentFilter = window.feedManager.getCurrentFilter();

                    window.feedManager.fillToBottomManager.checkAndFillWithDebounce(
                        currentFilter,
                        this.config.resizeThrottleMs
                    );
                }
            }, 50); // Small timeout to align with final layout
        });
    }

    // Setup window event listeners with proper cleanup
    setupWindowListeners() {
        // Clean up existing listeners
        if (this.abortController) {
            this.abortController.abort();
        }

        // Manual cleanup for window listeners without signal support
        if (this.windowListenerHandlers) {
            const { resizeHandler, visibilityHandler } = this.windowListenerHandlers;

            window.removeEventListener('resize', resizeHandler);
            document.removeEventListener('visibilitychange', visibilityHandler);
            this.windowListenerHandlers = null;
        }

        this.abortController = new AbortController();
        const { signal } = this.abortController;

        const resizeHandler = () => {
            this.handleWindowResize();

            // Re-arm IO before fallback poke (layout shifts may change last element)
            this.raf(() => {
                this.updateIntersectionObserver();

                // Fallback check after re-arm (orientation change / soft keyboard, etc.)
                if (!this.intersectionObserver) {
                    this.checkNow();
                }
            });
        };

        const visibilityHandler = () => {
            if (document.hidden) {
                this.pause();
            } else {
                this.resume();
            }
        };

        // Try to use signal for cleanup, fall back if not supported
        try {
            window.addEventListener('resize', resizeHandler, { passive: true, signal });
            document.addEventListener('visibilitychange', visibilityHandler, { signal });
        } catch (error) {
            // Fallback for browsers without AbortController support
            // Store handlers for manual cleanup
            this.windowListenerHandlers = { resizeHandler, visibilityHandler };
            window.addEventListener('resize', resizeHandler, { passive: true });
            document.addEventListener('visibilitychange', visibilityHandler);
        }

    }

    // Cleanup
    cleanup() {
        // Flip pause state to short-circuit any stray work
        this.isPaused = true;

        // Clear last emitted element so fresh load can re-emit
        this.setLastEmittedElement(null);

        // Clear debounce timer
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }

        // Abort event listeners
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }

        // Cleanup scroll fallback
        if (this.scrollFallbackController) {
            this.scrollFallbackController.abort();
            this.scrollFallbackController = null;
        }

        // Manual cleanup for fallback handlers without signal support
        if (this.scrollFallbackHandlers) {
            const { scrollContainer, handleScroll } = this.scrollFallbackHandlers;

            scrollContainer.removeEventListener('scroll', handleScroll);
            // Note: resize is not attached in fallback (handled by setupWindowListeners)
            this.scrollFallbackHandlers = null;
        }

        // Cleanup ResizeObserver
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }

        // Cleanup resize throttle timer
        if (this.resizeThrottleTimer) {
            clearTimeout(this.resizeThrottleTimer);
            this.resizeThrottleTimer = null;
        }

        // Cleanup resize timeout (50ms in handleWindowResize)
        if (this.resizeTimeoutId) {
            clearTimeout(this.resizeTimeoutId);
            this.resizeTimeoutId = null;
        }

        // Manual cleanup for window listeners without signal support
        if (this.windowListenerHandlers) {
            const { resizeHandler, visibilityHandler } = this.windowListenerHandlers;

            window.removeEventListener('resize', resizeHandler);
            document.removeEventListener('visibilitychange', visibilityHandler);
            this.windowListenerHandlers = null;
        }

        // Remove from instance tracking
        if (FeedUIManager.instances) {
            FeedUIManager.instances.delete(this);
        }

        this.disconnectIntersectionObserver();
        this.isSetupComplete = false;
        this.isDestroyed = true; // Mark as destroyed to prevent late timers
    }

    // Static method to get all instances
    static getAllInstances() {
        return FeedUIManager.instances || new Set();
    }

    // Static method to cleanup all instances
    static cleanupAllInstances() {
        if (FeedUIManager.instances) {
            FeedUIManager.instances.forEach(instance => {
                instance.cleanup();
            });
            FeedUIManager.instances.clear();
        }
    }

    // Global tidy hook for SPAs / BFCache (call on navigation or page hide)
    static installGlobalTidyHook() {
        if (typeof window === 'undefined') {
            return; // SSR safe
        }

        // Prevent double installation
        if (FeedUIManager._tidyHookInstalled) {
            return;
        }
        FeedUIManager._tidyHookInstalled = true;

        // Clean up on page hide (BFCache, navigation)
        window.addEventListener('pagehide', () => {
            FeedUIManager.cleanupAllInstances();
        }, { once: false, passive: true });

        // Also clean up on beforeunload for older browsers
        // Note: beforeunload should NOT be passive (can't cancel if passive)
        window.addEventListener('beforeunload', () => {
            FeedUIManager.cleanupAllInstances();
        }, { once: false });
    }

    /**
     * Static convenience helper: subscribe to lastImageVisible events
     * @param {Function} handler - Event handler function
     * @param {EventTarget|Object} [options={}] - Target or options object
     * @param {EventTarget} [options.target=window] - Target to listen on
     * @param {boolean} [options.once] - Remove listener after first call
     * @param {boolean} [options.passive] - Passive listener flag
     * @param {boolean} [options.capture] - Use capture phase
     * @param {AbortSignal} [options.signal] - AbortSignal for cleanup
     * @returns {Function} Unsubscribe function (mirrors same options for reliable removal)
     */
    static subscribe(handler, options = {}) {
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
            console.warn('FeedUIManager.subscribe: Invalid target provided');

            return () => {}; // No-op unsubscribe
        }

        // Add listener - try with options, fallback to capture boolean for older engines
        try {
            target.addEventListener(FeedUIManager.LAST_IMAGE_VISIBLE_EVENT, handler, listenerOptions);
        } catch (error) {
            // Older engines might not support options object
            // Fallback to capture boolean only
            target.addEventListener(FeedUIManager.LAST_IMAGE_VISIBLE_EVENT, handler, captureFlag);
        }

        // Return unsubscribe function - only capture bit is critical for removal
        return () => {
            // On older Safari, passing full options object can fail
            // Only capture bit must match for reliable removal
            target.removeEventListener(FeedUIManager.LAST_IMAGE_VISIBLE_EVENT, handler, captureFlag);
        };
    }

    /**
     * Static convenience helper: unsubscribe from lastImageVisible events
     * NOTE: Prefer using the unsubscribe function returned by subscribe() for proper option matching.
     * This helper only removes listeners added without special options (no capture, once, etc.)
     * @param {Function} handler - Event handler function to remove
     * @param {EventTarget} [target=window] - Target to remove from (defaults to window)
     */
    static unsubscribe(handler, target = typeof window !== 'undefined' ? window : null) {
        if (!target || typeof target.removeEventListener !== 'function') {
            return;
        }

        target.removeEventListener(FeedUIManager.LAST_IMAGE_VISIBLE_EVENT, handler);
    }

    /**
     * Trigger pagination check after external DOM mutations
     * Updates observers and checks all instances (or specific one)
     * @param {FeedUIManager} [manager] - Specific manager instance, or checks all instances
     */
    static triggerCheck(manager = null) {
        if (manager) {
            // Check specific instance (re-arms observation in all cases)
            manager.notifyFeedChanged();
        } else {
            // Check all instances (useful when you don't have a reference)
            const instances = FeedUIManager.getAllInstances();

            instances.forEach(instance => {
                instance.notifyFeedChanged();
            });
        }
    }

    /**
     * Capability probe - check browser feature support
     * Handy for guards/analytics before instantiation
     * @returns {Object} Feature support flags
     */
    static getCapabilities() {
        const hasWindow = typeof window !== 'undefined';

        return {
            intersectionObserver: hasWindow && 'IntersectionObserver' in window,
            resizeObserver: hasWindow && 'ResizeObserver' in window,
            customEvent: hasWindow && typeof CustomEvent === 'function',
            abortController: hasWindow && typeof AbortController === 'function',
            queueMicrotask: hasWindow && typeof queueMicrotask !== 'undefined',
            eventTarget: hasWindow && typeof EventTarget !== 'undefined',
            prefersReducedMotion: hasWindow && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
            isSSR: !hasWindow
        };
    }

    // Update configuration and rebuild observers
    updateConfig(newConfig) {
        // No-op fast path after destroy (public API safety)
        if (this.isDestroyed) {
            return;
        }

        // Cache previous IO-relevant options
        const prevRootMargin = this.config.rootMargin;
        const prevThreshold = this.config.threshold;

        // Merge new config with existing (including scrollRoot if provided)
        this.config = {
            ...this.config,
            ...newConfig
        };

        // Update scrollRoot if provided
        if ('scrollRoot' in newConfig) {
            this.scrollRoot = newConfig.scrollRoot;
        }

        // Coerce config numbers to ensure proper types (allow 0 and arrays)
        this.config.threshold = FeedUIHelpers.coerceThreshold(this.config.threshold, FeedUIManager.DEFAULT_THRESHOLD);
        // Clamp timing values to sane ranges (0-10000ms) to avoid Infinity/NaN bugs
        this.config.debounceMs = Math.max(0, Math.min(10000, FeedUIHelpers.coerceNumber(this.config.debounceMs, 100)));
        this.config.resizeThrottleMs = Math.max(0, Math.min(10000, FeedUIHelpers.coerceNumber(this.config.resizeThrottleMs, 200)));
        this.config.transitionDuration = Math.max(0, Math.min(10000, FeedUIHelpers.coerceNumber(this.config.transitionDuration, 300)));

        // Skip rebuild if IO-relevant options didn't change
        // Deep compare threshold for array mutations
        const thresholdChanged = Array.isArray(prevThreshold) || Array.isArray(this.config.threshold)
            ? JSON.stringify(prevThreshold) !== JSON.stringify(this.config.threshold)
            : prevThreshold !== this.config.threshold;

        if (prevRootMargin === this.config.rootMargin &&
            !thresholdChanged &&
            !('scrollRoot' in newConfig)) {
            return; // No observer churn needed
        }

        // Clean up existing observers/listeners first to guarantee single set
        this.disconnectIntersectionObserver();

        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }

        if (this.scrollFallbackController) {
            this.scrollFallbackController.abort();
            this.scrollFallbackController = null;
        }

        // Manual cleanup for fallback handlers without signal support
        if (this.scrollFallbackHandlers) {
            const { scrollContainer, handleScroll } = this.scrollFallbackHandlers;

            scrollContainer.removeEventListener('scroll', handleScroll);
            // Note: resize is not attached in fallback (handled by setupWindowListeners)
            this.scrollFallbackHandlers = null;
        }

        // Manual cleanup for window listeners without signal support
        if (this.windowListenerHandlers) {
            const { resizeHandler, visibilityHandler } = this.windowListenerHandlers;

            window.removeEventListener('resize', resizeHandler);
            document.removeEventListener('visibilitychange', visibilityHandler);
            this.windowListenerHandlers = null;
        }

        // Revive instance if it was cleaned up
        this.isDestroyed = false;

        // Rebuild observers with new config
        this.setupIntersectionObserver();
        this.setupResizeObserver();
        this.setupWindowListeners(); // Reattach window listeners
        // Note: setupScrollFallback() is only called by setupIntersectionObserver() if IO is unavailable

        // Update intersection observer to current last image
        this.updateIntersectionObserver();

        // Kick the fallback once after config update (IO-less browsers need immediate check)
        if (!this.intersectionObserver) {
            this.scheduleMicrotask(() => {
                this.checkNow();
            });
        }
    }

    /**
     * Pause triggers during heavy DOM operations
     * Call before bulk DOM mutations, then resume() after
     * @param {boolean} [disconnectIO=false] - Disconnect IO for extreme DOM work (opt-in)
     */
    pause(disconnectIO = false) {
        // No-op fast path after destroy (public API safety)
        if (this.isDestroyed) {
            return;
        }

        this.isPaused = true;

        // Clear in-flight debounce to prevent late fires
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }

        // IO-off mode for extreme DOM work (opt-in via config or param)
        // Note: _pausedObserverState is just a boolean flag (true if IO existed)
        if (disconnectIO || this.config.disconnectOnPause) {
            this._pausedObserverState = !!this.intersectionObserver;
            this.disconnectIntersectionObserver();
            this.debug('IO disconnected during pause (extreme mode)');
        }
    }

    /**
     * Resume triggers after heavy DOM operations
     * Automatically checks if pagination should trigger
     */
    resume() {
        // No-op fast path after destroy (public API safety)
        if (this.isDestroyed) {
            return;
        }

        this.isPaused = false;

        // Reconnect IO if it was disconnected during pause (extreme mode)
        if (this._pausedObserverState) {
            this.setupIntersectionObserver();
            this.updateIntersectionObserver(); // Re-arm immediately
            this.debug('IO reconnected after extreme pause');
            this._pausedObserverState = null;

            // Immediate check if already at bottom (no need to wait for next frame)
            const lastImage = this.domManager?.getLastImageElement();

            if (lastImage && this.isElementInViewport(lastImage)) {
                this.handleLastImageVisible();

                return; // Skip double rAF check below
            }
        }

        this.debug('Resumed after pause');

        // Refresh IO before fallback on resume (double rAF for layout settling)
        this.raf(() => {
            this.raf(() => {
                // Guard against late timers after cleanup
                if (this.isDestroyed) {
                    return;
                }

                // Re-arm observer first so checkNow() sees current IO state
                this.updateIntersectionObserver();

                // Check if we should trigger after resume (force=true for proactive check)
                this.checkNow(true); // Force check even with IO (proactive re-check)
            });
        });
    }

    /**
     * Batch mutation helper - automatically pauses, runs callback, and resumes
     * Guarantees resume() is called even if callback throws
     * @param {Function} callback - Function that performs DOM mutations
     * @returns {Promise<any>} Result of callback
     */
    async batchMutations(callback) {
        // No-op fast path after destroy
        if (this.isDestroyed) {
            return;
        }

        this.pause();

        try {
            return await callback();
        } finally {
            // Always resume, even if callback throws
            this.resume();
        }
    }

    // Destroy alias for library compatibility
    destroy() {
        this.cleanup();
    }

    // Setup tag overlays (delegates to tag UI)
    setupTagOverlays() {
        return this.tagUI.setupTagOverlays();
    }

    // Update tag filter indicator (delegates to tag UI)
    updateTagFilterIndicator(activeTags) {
        return this.tagUI.updateTagFilterIndicator(activeTags);
    }

    // Update tags-in-use container (delegates to tag UI)
    updateTagsInUseContainer(activeTags) {
        return this.tagUI.updateTagsInUseContainer(activeTags);
    }

    // Create removable tag chip (delegates to tag UI)
    createRemovableTagChip(tag) {
        return this.tagUI.createRemovableTagChip(tag);
    }

    // Remove tag (delegates to tag UI)
    removeTag(tagToRemove) {
        return this.tagUI.removeTag(tagToRemove);
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.FeedUIManager = FeedUIManager;

    // Auto-install global tidy hook (runs once automatically)
    FeedUIManager.installGlobalTidyHook();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FeedUIManager;
}

/*
 * Browser Compatibility Notes:
 *
 * 1. Static Class Fields (e.g., static LAST_IMAGE_VISIBLE_EVENT = '...')
 *    - Supported: Modern browsers (Chrome 72+, Firefox 75+, Safari 14.1+, Edge 79+)
 *    - NOT supported: IE11, legacy Safari/iOS, older mobile browsers
 *    - Solution: Use Babel/TypeScript with appropriate presets if targeting older browsers
 *    - Example babel config: @babel/preset-env with appropriate target browsers
 *
 * 2. CustomEvent Constructor
 *    - Fallback included for IE11 using document.createEvent()
 *    - Works in all browsers with the provided polyfill
 *
 * 3. IntersectionObserver
 *    - Scroll fallback provided for browsers without IO support
 *    - Full functionality maintained on older browsers
 *
 * Recommended for maximum compatibility:
 * - Use a build step (Babel/TypeScript) to transpile static class fields
 * - Or manually move static fields to prototype after class definition:
 *   FeedUIManager.LAST_IMAGE_VISIBLE_EVENT = 'lastImageVisible';
 *   FeedUIManager.DEFAULT_THRESHOLD = 0.1;
 */

