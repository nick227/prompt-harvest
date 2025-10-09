/* global FeedUIHelpers, FeedUIEventFactory, FeedTransitionManager, FeedTagUI, FeedUIStaticHelpers, FeedUILifecycle */

/**
 * @typedef {Object} FeedDomManager
 * @property {Function} getLastImageElement - Get the last image in the feed
 * @property {Function} showLoading - Show loading indicator
 * @property {Function} hideLoading - Hide loading indicator
 * @property {Function} clearFeedContent - Clear all feed content
 * @property {Function} showLoginPrompt - Show login prompt
 * @property {Function} showNoImagesMessage - Show no images message
 * @property {Function} showErrorMessage - Show error message
 * @property {Function} removeImageFromFeed - Remove specific image
 * @property {Function} [addImageToFeed] - Add image to feed (optional, falls back to global)
 * @property {Function} [getElement] - Get element by name
 * @property {Function} [isElementInViewport] - Check if element is in viewport
 * @property {Function} [updateFilterButtonStates] - Update filter button states
 * @property {Function} [setFilterButtonActive] - Set active filter button
 * @property {Function} [getScrollPosition] - Get scroll position
 * @property {Function} [setScrollPosition] - Set scroll position
 */

/**
 * Feed UI Manager - Handles UI state and interactions for infinite scroll
 *
 * BREAKING CHANGES (from previous versions):
 * - Removed wrapper methods: Use domManager directly for showLoginPrompt, showNoImagesMessage,
 *   showErrorMessage, removeImageFromFeed, getLastImageElement, updateFilterButtonStates,
 *   setFilterButtonActive, getScrollPosition, setScrollPosition
 * - showLoading/hideLoading removed: Use setLoading(true/false) instead
 * - Requires FeedUIStaticHelpers and FeedUILifecycle modules (or uses inline fallbacks)
 *
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
     * @param {boolean} [config.disconnectOnPause=false] - Disconnect IO during pause (for bulk DOM virtualization/masonry reflows)
     * @param {boolean} [config.forceCheckOnMutation=false] - Force pagination check after notifyFeedChanged (for masonry/virtualized layouts)
     * @param {boolean} [config.pauseOnHidden=true] - Auto-pause when document.hidden (battery saver, recommended)
     */
    constructor(domManager, scrollRoot = null, config = {}) {

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
            forceCheckOnMutation: false, // Option to force-check after notifyFeedChanged (masonry/virtualized layouts)
            pauseOnHidden: true, // Auto-pause when document.hidden (battery saver, opt-in)
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
        this.resizeThrottleTimer = null; // Unified resize throttle timer
        this.lastEmittedEl = null; // Track last emitted element for de-duplication (or WeakRef)
        this.useWeakRef = typeof WeakRef !== 'undefined'; // Use WeakRef if available for GC-friendly tracking
        this.isPaused = false; // Pause state for heavy DOM operations

        // Instance tracking
        this.instanceId = `FeedUIManager_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        this.isDestroyed = false; // Flag to prevent late timers after cleanup
        FeedUIManager.instances = FeedUIManager.instances || new Set();
        FeedUIManager.instances.add(this);

        // Share instances with static helpers
        if (typeof FeedUIStaticHelpers !== 'undefined') {
            FeedUIStaticHelpers.setInstancesReference(FeedUIManager.instances);
        }

        // Constructor invariants (dev-only, fail-fast if domManager missing critical methods)
        if (this.config.debug || (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production')) {
            const requiredMethods = ['getLastImageElement', 'showLoading', 'hideLoading'];
            const missingMethods = requiredMethods.filter(method => !domManager?.[method]);

            if (missingMethods.length > 0) {
                console.error(`❌ FeedUIManager: domManager missing required methods: ${missingMethods.join(', ')}`);
                console.warn('⚠️ Some features may not work correctly. Provide a complete domManager implementation.');
            }
        }

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
        // Lazy evaluation: pass functions to avoid computing expensive args when debug=false
        this.debug = (message, dataOrFn) => {
            if (this.config.debug) {
                const data = typeof dataOrFn === 'function' ? dataOrFn() : dataOrFn;

                console.log(`[FeedUI:${this.instanceId.slice(-8)}] ${message}`, data);
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

        // Unified throttle helper for resize handling (prevents double-fires)
        this.throttleResize = callback => {
            if (this.resizeThrottleTimer) {
                clearTimeout(this.resizeThrottleTimer);
            }

            this.resizeThrottleTimer = setTimeout(() => {
                // Guard against late timers after cleanup
                if (!this.isDestroyed) {
                    this.raf(() => {
                        if (!this.isDestroyed) {
                            callback();
                        }
                    });
                }
            }, this.config.resizeThrottleMs);
        };

        // Centralized addEventListener with signal fallback (returns cleanup info)
        this.addListener = (target, event, handler, options = {}) => {
            try {
                // Try with full options object first
                target.addEventListener(event, handler, options);

                return { target, event, handler, options, hasSignal: !!options.signal };
            } catch (error) {
                // Fallback 1: Try without signal (old browsers without AbortController)
                try {
                    const fallbackOptions = { ...options };

                    delete fallbackOptions.signal;
                    target.addEventListener(event, handler, fallbackOptions);

                    return { target, event, handler, options: fallbackOptions, hasSignal: false };
                } catch (innerError) {
                    // Fallback 2: Very old Safari/engines - use plain boolean capture only
                    const captureFlag = Boolean(options.capture);

                    target.addEventListener(event, handler, captureFlag);

                    return { target, event, handler, options: { capture: captureFlag }, hasSignal: false };
                }
            }
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

        this.debug('Init complete', () => ({
            hasObserver: !!this.intersectionObserver,
            config: {
                rootMargin: this.config.rootMargin,
                threshold: this.config.threshold,
                debounceMs: this.config.debounceMs
            }
        }));

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

        // Guard AbortController creation (old Safari/Android may not have it)
        try {
            this.scrollFallbackController = new AbortController();
        } catch (error) {
            // Old browser without AbortController - use manual cleanup path
            this.scrollFallbackController = null;
        }

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

        // Use centralized listener helper with signal fallback
        const listenerInfo = this.addListener(scrollContainer, 'scroll', handleScroll, {
            passive: true,
            signal: this.scrollFallbackController?.signal
        });

        // Store for manual cleanup if signal isn't supported
        if (!listenerInfo.hasSignal) {
            this.scrollFallbackHandlers = { scrollContainer, handleScroll };
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
                    // Use unified throttle to prevent double-fires with window resize
                    this.throttleResize(() => {
                        // Trigger pagination check on container size changes
                        if (!this.isLoading) {
                            const lastImage = this.domManager?.getLastImageElement();

                            if (lastImage && this.isElementInViewport(lastImage)) {
                                this.handleLastImageVisible();
                            }
                        }
                    });
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
        this.debug('handleLastImageVisible triggered', () => ({
            isLoading: this.isLoading,
            isPaused: this.isPaused,
            observedTarget: this.observedTarget?.id || 'none'
        }));

        try {
            if (this.isLoading || this.isPaused) {
                this.debug('Blocked: isLoading or isPaused');

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
        this.debug('setLoading', () => loading);

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

                    // Proactive fire if already at bottom (instant pagination)
                    const lastImage = this.domManager?.getLastImageElement();

                    if (lastImage && this.isElementInViewport(lastImage)) {
                        this.handleLastImageVisible();
                    }
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
     * Returns frozen copy to prevent accidental mutation
     * @returns {Object} Observer state (read-only)
     */
    getObserverState() {
        return Object.freeze({
            hasObserver: !!this.intersectionObserver,
            observedTarget: this.observedTarget,
            isPaused: this.isPaused,
            isLoading: this.isLoading,
            isDestroyed: this.isDestroyed
        });
    }

    /**
     * Check if instance is destroyed (for tests/guards)
     * @returns {boolean} True if destroyed
     */
    isInstanceDestroyed() {
        return this.isDestroyed;
    }

    /**
     * Check if manager is fully initialized and ready
     * @returns {boolean} True if ready to handle scroll events
     */
    isReady() {
        return this.isSetupComplete && !this.isDestroyed && !!this.domManager;
    }

    // Note: showLoading/hideLoading removed - use setLoading(true/false) directly
    // Note: showLoginPrompt/showNoImagesMessage removed - use domManager directly

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

    // Note: showErrorMessage removed - use domManager.showErrorMessage() directly

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

    // Note: removeImageFromFeed removed - use domManager.removeImageFromFeed() directly

    // Add image to feed (delegates to image handler)
    addImageToFeed(imageData, filter) {
        let wasAdded = false;

        // Prefer domManager delegation (testable, decoupled)
        if (this.domManager?.addImageToFeed) {
            wasAdded = Boolean(this.domManager.addImageToFeed(imageData, filter));
        } else if (window.feedManager && window.feedManager.imageHandler) {
            // Fallback to global feedManager (backward compatibility)
            wasAdded = Boolean(window.feedManager.imageHandler.addImageToFeed(imageData, filter));
        }

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

            // Always add to tab service for intelligent filtering (regardless of path)
            if (window.feedManager && window.feedManager.tabService) {
                window.feedManager.tabService.addImage(imageData);
            }
        }

        return wasAdded;
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
        this.debug('updateIntersectionObserver called', () => ({
            hasObserver: !!this.intersectionObserver,
            isPaused: this.isPaused,
            currentTarget: this.observedTarget?.id || 'none'
        }));

        // Auto-clear dedupe ref if the node was removed (prevents GC pinning)
        this.sanitizeLastEmittedElement();

        if (!this.intersectionObserver || this.isPaused) {
            this.debug('Early exit: no observer or paused');

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

        this.debug('Last image element', () => ({
            exists: !!lastImage,
            id: lastImage?.id || 'no-id',
            className: lastImage?.className || 'no-class',
            isConnected: lastImage?.isConnected
        }));

        // Ensure getLastImageElement() returns an Element
        if (!lastImage || lastImage.nodeType !== 1) {
            this.debug('No valid last image element');

            return;
        }

        // Guard: don't observe a node not in DOM
        if (!lastImage.isConnected) {
            this.debug('Last image not connected to DOM');

            return;
        }

        // Only update if we have a new last image
        if (lastImage !== this.observedTarget) {
            this.debug('New last image detected, updating observer', () => ({
                oldTarget: this.observedTarget?.id || 'none',
                newTarget: lastImage.id || 'no-id'
            }));
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
                // Final guard: race between isConnected check and observe() call
                if (lastImage.isConnected) {
                    this.intersectionObserver.observe(lastImage);
                    this.observedTarget = lastImage;
                    // Lazy evaluation: only compute rect if debug=true
                    this.debug('Now observing', () => ({
                        id: lastImage.id || 'no-id',
                        rect: lastImage.getBoundingClientRect(),
                        isInViewport: this.isElementInViewport(lastImage)
                    }));
                } else {
                    // Element was detached in the microseconds between checks
                    this.observedTarget = null;
                }
            } catch (error) {
                // Element might have been detached between check and observe()
                // Silently handle and clear observedTarget
                this.observedTarget = null;
                this.debug('Failed to observe (element likely detached)', error);
            }
        } else {
            this.debug('Already observing this element');
        }
    }


    // Note: updateFilterButtonStates, setFilterButtonActive, getScrollPosition, setScrollPosition
    // removed - use domManager methods directly

    /**
     * Check if element is in viewport
     * @param {Element} element - Element to check
     * @param {Object} [options] - Check options
     * @param {boolean} [options.allowZeroSize=false] - Allow zero-size sentinel elements
     * @returns {boolean} True if element is in viewport
     */
    isElementInViewport(element, options = {}) {
        // Guard hot path against post-cleanup calls
        if (this.isDestroyed) {
            return false;
        }

        // Use domManager if available, otherwise fallback
        if (this.domManager?.isElementInViewport) {
            return this.domManager.isElementInViewport(element, this.scrollRoot, options.allowZeroSize);
        }

        // Fallback implementation with custom scroll root support
        if (!element) {
            return false;
        }

        const rect = element.getBoundingClientRect();

        // Zero-size element check (display:none or width/height 0)
        // Skip check if allowZeroSize is true (for zero-height pagination sentinels)
        if (!options.allowZeroSize && rect.width === 0 && rect.height === 0) {
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

    // Note: getLastImageElement removed - use domManager.getLastImageElement() directly


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

            // Option to force-check after mutation (masonry/virtualized layouts that swap nodes)
            if (this.config.forceCheckOnMutation) {
                this.checkNow(true); // Force check even with IO
            } else if (!this.intersectionObserver) {
                // Fallback-only check for IO-less browsers
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
            if (visibilityHandler) {
                document.removeEventListener('visibilitychange', visibilityHandler);
            }
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

    // Handle window resize (uses unified throttle with ResizeObserver)
    handleWindowResize() {
        // Use unified throttle helper to prevent double-fires with ResizeObserver
        this.throttleResize(() => {
            // Trigger fill-to-bottom check after layout settles
            if (window.feedManager && window.feedManager.fillToBottomManager) {
                const currentFilter = window.feedManager.getCurrentFilter();

                window.feedManager.fillToBottomManager.checkAndFillWithDebounce(
                    currentFilter,
                    this.config.resizeThrottleMs
                );
            }
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
            if (visibilityHandler) {
                document.removeEventListener('visibilitychange', visibilityHandler);
            }
            this.windowListenerHandlers = null;
        }

        // Guard AbortController creation (old Safari/Android may not have it)
        let signal;

        try {
            this.abortController = new AbortController();
            signal = this.abortController.signal;
        } catch (error) {
            // Old browser without AbortController - use manual cleanup path
            this.abortController = null;
            signal = undefined;
        }

        const resizeHandler = () => {
            this.handleWindowResize();

            // Re-arm IO before fallback poke (layout shifts may change last element)
            this.raf(() => {
                // Guard for consistency with other rAF blocks
                if (!this.isDestroyed) {
                    this.updateIntersectionObserver();

                    // Fallback check after re-arm (orientation change / soft keyboard, etc.)
                    if (!this.intersectionObserver) {
                        this.checkNow();
                    }
                }
            });
        };

        // Use centralized listener helper for resize
        const resizeInfo = this.addListener(window, 'resize', resizeHandler, { passive: true, signal });

        // Visibility handler: opt-in auto-pause (battery saver)
        let visibilityInfo = null;

        if (this.config.pauseOnHidden) {
            const visibilityHandler = () => {
                if (document.hidden) {
                    this.pause();
                } else {
                    this.resume();
                }
            };

            visibilityInfo = this.addListener(document, 'visibilitychange', visibilityHandler, { signal });
        }

        // Store for manual cleanup if signal isn't supported
        if (!resizeInfo.hasSignal || (visibilityInfo && !visibilityInfo.hasSignal)) {
            this.windowListenerHandlers = {
                resizeHandler,
                visibilityHandler: visibilityInfo?.handler
            };
        }

    }

    // Cleanup (delegates to lifecycle manager with fallback)
    cleanup() {
        if (typeof FeedUILifecycle !== 'undefined') {
            FeedUILifecycle.cleanup(this);
        } else {
            // Fallback: inline cleanup (old browsers without AbortController)
            this.isPaused = true;
            this.setLastEmittedElement(null);
            if (this.debounceTimer) {
                clearTimeout(this.debounceTimer);
                this.debounceTimer = null;
            }

            // Abort controllers if present
            if (this.abortController) {
                this.abortController.abort();
                this.abortController = null;
            }
            if (this.scrollFallbackController) {
                this.scrollFallbackController.abort();
                this.scrollFallbackController = null;
            }

            // Manual cleanup for fallback handlers (critical for old browsers!)
            if (this.scrollFallbackHandlers) {
                const { scrollContainer, handleScroll } = this.scrollFallbackHandlers;

                scrollContainer.removeEventListener('scroll', handleScroll);
                this.scrollFallbackHandlers = null;
            }

            // Manual cleanup for window listeners
            if (this.windowListenerHandlers) {
                const { resizeHandler, visibilityHandler } = this.windowListenerHandlers;

                window.removeEventListener('resize', resizeHandler);
                if (visibilityHandler) {
                    document.removeEventListener('visibilitychange', visibilityHandler);
                }
                this.windowListenerHandlers = null;
            }

            if (this.resizeObserver) {
                this.resizeObserver.disconnect();
                this.resizeObserver = null;
            }
            if (this.resizeThrottleTimer) {
                clearTimeout(this.resizeThrottleTimer);
                this.resizeThrottleTimer = null;
            }
            if (FeedUIManager.instances) {
                FeedUIManager.instances.delete(this);
            }
            this.disconnectIntersectionObserver();
            this.isSetupComplete = false;
            this.isDestroyed = true;
        }
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

            // Keep helpers in sync after clearing (for hot-reload/test environments)
            if (typeof FeedUIStaticHelpers !== 'undefined') {
                FeedUIStaticHelpers.setInstancesReference(FeedUIManager.instances);
            }
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

    // Delegate static methods to FeedUIStaticHelpers (with fallbacks)
    static subscribe(handler, options = {}) {
        if (typeof FeedUIStaticHelpers !== 'undefined') {
            return FeedUIStaticHelpers.subscribe(handler, options, FeedUIManager.LAST_IMAGE_VISIBLE_EVENT);
        }

        // Fallback: minimal inline implementation (old-Safari safe)
        const target = options.target || (typeof window !== 'undefined' ? window : null);
        const captureFlag = Boolean(options.capture); // Extract capture for reliable removal

        if (target) {
            // Try with options, fallback to capture boolean only (old Safari)
            try {
                target.addEventListener(FeedUIManager.LAST_IMAGE_VISIBLE_EVENT, handler, options);
            } catch (error) {
                // Old Safari doesn't support options object
                target.addEventListener(FeedUIManager.LAST_IMAGE_VISIBLE_EVENT, handler, captureFlag);
            }
        }

        return () => {
            // Only capture flag must match for reliable removal
            if (target) {
                target.removeEventListener(FeedUIManager.LAST_IMAGE_VISIBLE_EVENT, handler, captureFlag);
            }
        };
    }

    static unsubscribe(handler, target = typeof window !== 'undefined' ? window : null) {
        if (typeof FeedUIStaticHelpers !== 'undefined') {
            return FeedUIStaticHelpers.unsubscribe(handler, target, FeedUIManager.LAST_IMAGE_VISIBLE_EVENT);
        }

        // Fallback: basic removal
        if (target) {
            target.removeEventListener(FeedUIManager.LAST_IMAGE_VISIBLE_EVENT, handler);
        }
    }

    static triggerCheck(manager = null) {
        if (typeof FeedUIStaticHelpers !== 'undefined') {
            return FeedUIStaticHelpers.triggerCheck(manager);
        }

        // Fallback: inline implementation
        if (manager) {
            manager.notifyFeedChanged();
        } else {
            const instances = FeedUIManager.getAllInstances();

            instances.forEach(instance => instance.notifyFeedChanged());
        }
    }

    static getCapabilities() {
        if (typeof FeedUIStaticHelpers !== 'undefined') {
            return FeedUIStaticHelpers.getCapabilities();
        }

        // Fallback: full capability check (matches FeedUIStaticHelpers parity)
        const hasWindow = typeof window !== 'undefined';

        return {
            intersectionObserver: hasWindow && 'IntersectionObserver' in window,
            resizeObserver: hasWindow && 'ResizeObserver' in window,
            customEvent: hasWindow && typeof CustomEvent === 'function',
            abortController: hasWindow && typeof AbortController === 'function',
            queueMicrotask: hasWindow && typeof queueMicrotask !== 'undefined',
            eventTarget: hasWindow && typeof EventTarget !== 'undefined',
            weakRef: hasWindow && typeof WeakRef !== 'undefined',
            prefersReducedMotion: Boolean(hasWindow && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches),
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
            if (visibilityHandler) {
                document.removeEventListener('visibilitychange', visibilityHandler);
            }
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
     * @param {boolean} [disconnectIO=false] - Disconnect IO for extreme DOM work
     */
    pause(disconnectIO = false) {
        if (typeof FeedUILifecycle !== 'undefined') {
            FeedUILifecycle.pause(this, disconnectIO);
        } else {
            // Fallback: inline pause with IO disconnect support
            this.isPaused = true;

            // Clear in-flight debounce
            if (this.debounceTimer) {
                clearTimeout(this.debounceTimer);
                this.debounceTimer = null;
            }

            // IO-off mode for extreme DOM work (opt-in)
            if (disconnectIO || this.config.disconnectOnPause) {
                this._pausedObserverState = !!this.intersectionObserver;
                this.disconnectIntersectionObserver();
            }
        }
    }

    /**
     * Resume triggers after heavy DOM operations
     */
    resume() {
        if (typeof FeedUILifecycle !== 'undefined') {
            FeedUILifecycle.resume(this);
        } else {
            // Fallback: inline resume with IO reconnection and proactive check
            this.isPaused = false;

            // Reconnect IO if it was disconnected during extreme pause
            if (this._pausedObserverState) {
                this.setupIntersectionObserver();
                this.updateIntersectionObserver();
                this._pausedObserverState = null;

                // Immediate check if already at bottom
                const lastImage = this.domManager?.getLastImageElement();

                if (lastImage && this.isElementInViewport(lastImage)) {
                    this.handleLastImageVisible();

                    return;
                }
            }

            // Refresh IO and check (double rAF for layout settling)
            this.raf(() => {
                this.raf(() => {
                    if (!this.isDestroyed) {
                        this.updateIntersectionObserver();
                        this.checkNow(true); // Force proactive check
                    }
                });
            });
        }
    }

    /**
     * Batch mutation helper - automatically pauses, runs callback, and resumes
     * @param {Function} callback - Function that performs DOM mutations
     * @returns {Promise<any>} Result of callback
     */
    async batchMutations(callback) {
        if (typeof FeedUILifecycle !== 'undefined') {
            return FeedUILifecycle.batchMutations(this, callback);
        }

        // Fallback: inline batch
        this.pause();
        try {
            return await callback();
        } finally {
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

