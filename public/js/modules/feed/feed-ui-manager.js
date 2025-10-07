// Feed UI Manager - Handles UI state and interactions
class FeedUIManager {
    constructor(domManager, scrollRoot = null, config = {}) {
        this.domManager = domManager;
        this.scrollRoot = scrollRoot; // Custom scroll container support
        this.config = {
            rootMargin: '300px 0px',
            threshold: 0.1,
            debounceMs: 100,
            resizeThrottleMs: 200,
            transitionDuration: 300,
            eventTarget: null, // Optional global event target (e.g., window)
            ...config
        };

        // Coerce config numbers to ensure proper types (allow 0 and arrays)
        this.config.threshold = this.coerceThreshold(this.config.threshold, 0.1);
        this.config.debounceMs = this.coerceNumber(this.config.debounceMs, 100);
        this.config.resizeThrottleMs = this.coerceNumber(this.config.resizeThrottleMs, 200);
        this.config.transitionDuration = this.coerceNumber(this.config.transitionDuration, 300);
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
        this.lastEmittedEl = null; // Track last emitted element for de-duplication
        this.isPaused = false; // Pause state for heavy DOM operations

        // Instance tracking
        this.instanceId = `FeedUIManager_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        this.isDestroyed = false; // Flag to prevent late timers after cleanup
        FeedUIManager.instances = FeedUIManager.instances || new Set();
        FeedUIManager.instances.add(this);

        // Centralized microtask scheduling
        this.scheduleMicrotask = callback => {
            if (typeof queueMicrotask !== 'undefined') {
                queueMicrotask(callback);
            } else {
                // Fallback for older browsers
                Promise.resolve().then(callback);
            }
        };
    }

    // Initialize UI manager
    init() {
        // SSR-safe init - only run in browser
        if (typeof window === 'undefined') {
            return;
        }

        // Idempotent guard - prevent duplicate initialization
        if (this.isSetupComplete) {
            return;
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
    }

    // Setup intersection observer for infinite scroll
    setupIntersectionObserver() {
        // Disconnect existing observer to avoid duplicates
        if (this.intersectionObserver) {
            this.disconnectIntersectionObserver();
        }

        if ('IntersectionObserver' in window) {
            // Ensure root is a valid Element or null (viewport)
            const observerRoot = this.getValidObserverRoot(this.scrollRoot);

            this.intersectionObserver = new IntersectionObserver(
                entries => {
                    entries.forEach(entry => {
                        // Only react to the observed target to avoid fresh DOM reads and eliminate races
                        if (entry.isIntersecting && entry.target === this.observedTarget) {
                            this.handleLastImageVisible();
                        }
                    });
                },
                {
                    root: observerRoot, // Use custom scroll container (Element or null)
                    rootMargin: this.config.rootMargin,
                    threshold: this.normalizeThreshold(this.config.threshold)
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
            window.removeEventListener('resize', handleScroll);
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
            requestAnimationFrame(() => {
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

        const scrollContainer = this.scrollRoot || window;

        // Try to use signal for cleanup, fall back if not supported
        try {
            scrollContainer.addEventListener('scroll', handleScroll, { passive: true, signal: this.scrollFallbackController.signal });
            window.addEventListener('resize', handleScroll, { passive: true, signal: this.scrollFallbackController.signal });
        } catch (error) {
            // Fallback for browsers without AbortController support
            // Store listeners for manual cleanup
            this.scrollFallbackHandlers = { scrollContainer, handleScroll };
            scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
            window.addEventListener('resize', handleScroll, { passive: true });
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

                if (lastImage) {
                    // De-dupe: don't emit for the same element twice
                    if (this.lastEmittedEl === lastImage) {
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

                    // Dispatch event for infinite scroll (Shadow DOM friendly)
                    const event = new CustomEvent('lastImageVisible', {
                        detail: {
                            element: lastImage,
                            manager: this,
                            timestamp: Date.now()
                        },
                        bubbles: true,
                        composed: true // Crosses Shadow DOM boundaries
                    });

                    // Dispatch on element's root node (Shadow DOM aware)
                    const elementRoot = lastImage.getRootNode?.() || window;

                    elementRoot.dispatchEvent(event);

                    // Also dispatch on configured global target if specified
                    if (this.config.eventTarget && this.config.eventTarget !== elementRoot) {
                        this.config.eventTarget.dispatchEvent(event);
                    }

                    // Track last emitted element and null observedTarget
                    this.lastEmittedEl = lastImage;
                    this.observedTarget = null;

                    // Re-arm on next frame if loading didn't start (prevents race with slow loads)
                    requestAnimationFrame(() => {
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

    // Set loading state
    setLoading(loading) {
        this.isLoading = loading;

        if (loading) {
            this.domManager?.showLoading();
            // Reset last emitted element when loading starts
            this.lastEmittedEl = null;
        } else {
            this.domManager?.hideLoading();
            // Update observer to new last image after loading completes in microtask
            this.scheduleMicrotask(() => {
                this.updateIntersectionObserver();
            });
        }
    }

    // Get loading state
    getLoading() {
        return this.isLoading;
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

    // Start smooth transition
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

    // Complete smooth transition
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
        this.lastEmittedEl = null;

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

    // Update intersection observer - fix observer churn
    updateIntersectionObserver() {
        if (!this.intersectionObserver || this.isPaused) {
            return;
        }

        const lastImage = this.domManager?.getLastImageElement();

        if (!lastImage) {
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

            // Observe new last image
            this.intersectionObserver.observe(lastImage);
            this.observedTarget = lastImage;
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
        // Use domManager if available, otherwise fallback
        if (this.domManager?.isElementInViewport) {
            return this.domManager.isElementInViewport(element, this.scrollRoot);
        }

        // Fallback implementation with custom scroll root support
        if (!element) {
            return false;
        }

        const rect = element.getBoundingClientRect();

        if (this.scrollRoot) {
            // Use custom scroll container bounds with margin
            const containerRect = this.scrollRoot.getBoundingClientRect();
            const containerSize = { width: containerRect.width, height: containerRect.height };
            const margin = this.parseRootMargin(this.config.rootMargin, containerSize);

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
        const margin = this.parseRootMargin(this.config.rootMargin, containerSize);

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

    // Parse rootMargin CSS-like syntax (1/2/3/4 values, negatives, decimals, percentages)
    parseRootMargin(marginStr, containerSize = null) {
        if (!marginStr) {
            return { top: 0, right: 0, bottom: 0, left: 0 };
        }

        // Extract values with units (e.g., '300px', '10%', '-50px')
        const parts = marginStr.match(/-?\d+(\.\d+)?(px|%)?/g);

        if (!parts || parts.length === 0) {
            return { top: 0, right: 0, bottom: 0, left: 0 };
        }

        // Parse each value, handling percentages
        const parseValue = (valueStr, dimension) => {
            const num = parseFloat(valueStr);

            if (valueStr.includes('%') && containerSize) {
                // Convert percentage to pixels based on container dimension
                return (num / 100) * (dimension === 'vertical' ? containerSize.height : containerSize.width);
            }

            return num;
        };

        // CSS margin syntax: 1 value = all, 2 values = v/h, 3 values = t/h/b, 4 values = t/r/b/l
        let top;
        let right;
        let bottom;
        let left;

        if (parts.length === 1) {
            top = parseValue(parts[0], 'vertical');
            right = parseValue(parts[0], 'horizontal');
            bottom = top;
            left = right;
        } else if (parts.length === 2) {
            top = parseValue(parts[0], 'vertical');
            right = parseValue(parts[1], 'horizontal');
            bottom = top;
            left = right;
        } else if (parts.length === 3) {
            top = parseValue(parts[0], 'vertical');
            right = parseValue(parts[1], 'horizontal');
            bottom = parseValue(parts[2], 'vertical');
            left = right;
        } else {
            top = parseValue(parts[0], 'vertical');
            right = parseValue(parts[1], 'horizontal');
            bottom = parseValue(parts[2], 'vertical');
            left = parseValue(parts[3], 'horizontal');
        }

        return { top, right, bottom, left };
    }

    // Coerce number config value (allows 0, rejects NaN)
    coerceNumber(value, fallback) {
        const num = Number(value);

        return Number.isFinite(num) ? num : fallback;
    }

    // Coerce threshold (allows 0, arrays, rejects NaN)
    coerceThreshold(value, fallback) {
        if (Array.isArray(value)) {
            // Clone array to avoid external mutations affecting change detection
            return [...value];
        }
        const num = Number(value);

        return Number.isFinite(num) ? num : fallback;
    }

    // Normalize threshold for IntersectionObserver (clamp, sort, dedupe)
    normalizeThreshold(threshold) {
        if (Array.isArray(threshold)) {
            // Filter out invalid values, then clamp to [0, 1], sort, and dedupe
            const valid = threshold
                .map(v => Number(v))
                .filter(v => Number.isFinite(v))
                .map(v => Math.max(0, Math.min(1, v)));
            const sorted = [...new Set(valid)].sort((a, b) => a - b);

            // Return valid array or fallback to [0]
            return sorted.length > 0 ? sorted : [0];
        }

        // Clamp single value to [0, 1], or fallback to 0
        const num = Number(threshold);

        return Number.isFinite(num) ? Math.max(0, Math.min(1, num)) : 0;
    }

    // Ensure valid IO root (Element or null for viewport)
    getValidObserverRoot(root) {
        if (!root) {
            return null; // Use viewport
        }

        // Reject window, document, and non-Elements
        if (root === window ||
            root === document ||
            !root.nodeType ||
            root.nodeType !== 1) { // 1 = ELEMENT_NODE
            return null; // Use viewport
        }

        return root;
    }

    // Set scroll root at runtime (allows switching containers)
    setScrollRoot(newScrollRoot) {
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
            window.removeEventListener('resize', handleScroll);
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

        // Reset flags and references
        this.observedTarget = null;
    }

    // Reconnect intersection observer
    reconnectIntersectionObserver() {
        this.disconnectIntersectionObserver();
        this.setupIntersectionObserver();
        this.updateIntersectionObserver();
    }

    // Force update intersection observer (useful after view changes)
    forceUpdateIntersectionObserver() {
        // Always rebuild, even if IO was null
        this.disconnectIntersectionObserver();
        this.setupIntersectionObserver();
        this.updateIntersectionObserver();
    }

    // Handle window resize
    handleWindowResize() {
        // Window resize handled by CSS media queries and responsive design

        // Check and fill to bottom after window resize using rAF + timeout for layout alignment
        requestAnimationFrame(() => {
            setTimeout(() => {
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
        this.lastEmittedEl = null;

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
            window.removeEventListener('resize', handleScroll);
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

    // Update configuration and rebuild observers
    updateConfig(newConfig) {
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
        this.config.threshold = this.coerceThreshold(this.config.threshold, 0.1);
        this.config.debounceMs = this.coerceNumber(this.config.debounceMs, 100);
        this.config.resizeThrottleMs = this.coerceNumber(this.config.resizeThrottleMs, 200);
        this.config.transitionDuration = this.coerceNumber(this.config.transitionDuration, 300);

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
            window.removeEventListener('resize', handleScroll);
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
    }

    // Pause triggers during heavy DOM operations
    pause() {
        this.isPaused = true;
    }

    // Resume triggers after heavy DOM operations
    resume() {
        this.isPaused = false;

        // Check if we should trigger after resume (double rAF for layout settling)
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                // Guard against late timers after cleanup
                if (this.isDestroyed) {
                    return;
                }

                if (!this.isLoading) {
                    const lastImage = this.domManager?.getLastImageElement();

                    if (lastImage && this.isElementInViewport(lastImage)) {
                        this.handleLastImageVisible();
                    }

                    // Re-arm observer immediately if observedTarget is null
                    if (!this.observedTarget) {
                        this.updateIntersectionObserver();
                    }
                }
            });
        });
    }

    // Destroy alias for library compatibility
    destroy() {
        this.cleanup();
    }

    // Setup tag overlays for visual feedback
    setupTagOverlays() {
        // No initialization needed - CSS handles the ::after element
        // Tag overlays ready (using existing CSS ::after)
    }

    // Update tag filter indicator
    updateTagFilterIndicator(activeTags) {
        // Update the tags-in-use container
        this.updateTagsInUseContainer(activeTags);
    }

    // Update the tags-in-use container with removable tag chips
    updateTagsInUseContainer(activeTags) {
        const tagsInUseContainer = document.getElementById('tags-in-use');

        if (!tagsInUseContainer) {
            console.warn('⚠️ TAG FILTER: tags-in-use container not found');

            return;
        }

        // Clear existing tags
        tagsInUseContainer.innerHTML = '';

        if (activeTags.length > 0) {
            // Show the container
            tagsInUseContainer.classList.remove('hidden');

            // Add each active tag as a removable chip
            activeTags.forEach(tag => {
                const tagChip = this.createRemovableTagChip(tag);

                tagsInUseContainer.appendChild(tagChip);
            });

            // Updated tags-in-use container
        } else {
            // Hide the container
            tagsInUseContainer.classList.add('hidden');
            // Hidden tags-in-use container (no active tags)
        }
    }

    // Create a removable tag chip with proper accessibility
    createRemovableTagChip(tag) {
        const tagChip = document.createElement('button');

        tagChip.className = 'tag-chip-removable';
        tagChip.type = 'button';
        tagChip.setAttribute('aria-label', `Remove tag: ${tag}`);
        tagChip.setAttribute('title', `Remove tag: ${tag}`);
        tagChip.style.cssText = `
            display: inline-flex;
            align-items: center;
            background: rgba(59, 130, 246, 0.2);
            color: #60a5fa;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            border: 1px solid rgba(59, 130, 246, 0.3);
            white-space: nowrap;
            cursor: pointer;
            transition: all 0.2s ease;
            gap: 4px;
        `;

        // Add tag text
        const tagText = document.createElement('span');

        tagText.textContent = tag;
        tagChip.appendChild(tagText);

        // Add remove button
        const removeButton = document.createElement('span');

        removeButton.innerHTML = '×';
        removeButton.setAttribute('aria-hidden', 'true');
        removeButton.style.cssText = `
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: rgba(239, 68, 68, 0.2);
            color: #f87171;
            font-size: 12px;
            font-weight: bold;
            transition: all 0.2s ease;
            margin-left: 4px;
        `;

        tagChip.appendChild(removeButton);

        // Add hover effects
        tagChip.addEventListener('mouseenter', () => {
            tagChip.style.background = 'rgba(59, 130, 246, 0.3)';
            tagChip.style.transform = 'scale(1.05)';
        });

        tagChip.addEventListener('mouseleave', () => {
            tagChip.style.background = 'rgba(59, 130, 246, 0.2)';
            tagChip.style.transform = 'scale(1)';
        });

        // Add keyboard support
        tagChip.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                this.removeTag(tag);
            }
        });

        // Add click handler to remove the tag
        tagChip.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();
            this.removeTag(tag);
        });

        return tagChip;
    }

    // Remove a specific tag from the active filter
    removeTag(tagToRemove) {
        // Get current active tags from tag router
        if (window.tagRouter) {
            const currentTags = window.tagRouter.getActiveTags();
            const updatedTags = currentTags.filter(tag => tag !== tagToRemove);

            // Update tag router with remaining tags
            window.tagRouter.setActiveTags(updatedTags);
        }
        // Silent no-op if tagRouter not available (production-safe)
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.FeedUIManager = FeedUIManager;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FeedUIManager;
}

