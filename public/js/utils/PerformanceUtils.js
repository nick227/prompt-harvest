/**
 * PerformanceUtils - Utility functions for performance optimization
 * Single Responsibility: Performance optimization utilities
 */

class PerformanceUtils {
    /**
     * Debounce function calls to prevent excessive execution
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @param {boolean} immediate - Execute immediately on first call
     * @returns {Function} Debounced function
     */
    static debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func.apply(this, args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(this, args);
        };
    }

    /**
     * Throttle function calls to limit execution frequency
     * @param {Function} func - Function to throttle
     * @param {number} limit - Time limit in milliseconds
     * @returns {Function} Throttled function
     */
    static throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Batch DOM updates to prevent layout thrashing
     * @param {Function} callback - Function containing DOM updates
     */
    static batchDOMUpdates(callback) {
        requestAnimationFrame(() => {
            callback();
        });
    }

    /**
     * Lazy load images with intersection observer
     * @param {string} selector - CSS selector for images
     * @param {Object} options - Intersection observer options
     */
    static lazyLoadImages(selector = 'img[data-src]', options = {}) {
        const defaultOptions = {
            root: null,
            rootMargin: '50px',
            threshold: 0.1
        };

        const observerOptions = { ...defaultOptions, ...options };

        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.remove('lazy');
                        observer.unobserve(img);
                    }
                });
            }, observerOptions);

            document.querySelectorAll(selector).forEach(img => {
                imageObserver.observe(img);
            });
        }
    }

    /**
     * Efficient event delegation
     * @param {string} selector - CSS selector for target elements
     * @param {string} event - Event type
     * @param {Function} handler - Event handler function
     * @param {Element} container - Container element (defaults to document)
     */
    static delegate(selector, event, handler, container = document) {
        container.addEventListener(event, (e) => {
            if (e.target.matches(selector)) {
                handler.call(e.target, e);
            }
        });
    }

    /**
     * Memoize function results to cache expensive computations
     * @param {Function} func - Function to memoize
     * @param {Function} keyGenerator - Function to generate cache keys
     * @returns {Function} Memoized function
     */
    static memoize(func, keyGenerator = (...args) => JSON.stringify(args)) {
        const cache = new Map();

        return function memoizedFunction(...args) {
            const key = keyGenerator(...args);

            if (cache.has(key)) {
                return cache.get(key);
            }

            const result = func.apply(this, args);
            cache.set(key, result);
            return result;
        };
    }

    /**
     * Create a performance timer for measuring execution time
     * @param {string} label - Timer label
     * @returns {Function} Function to end the timer
     */
    static startTimer(label) {
        const start = performance.now();
        console.time(label);

        return () => {
            const end = performance.now();
            console.timeEnd(label);
            console.log(`${label}: ${(end - start).toFixed(2)}ms`);
        };
    }
}

// Export for use in other modules
window.PerformanceUtils = PerformanceUtils;
