// Feed UI Helpers - Pure utility functions for feed UI management
// These are stateless helper functions with no dependencies on FeedUIManager instance state

class FeedUIHelpers {
    // Parse rootMargin CSS-like syntax (1/2/3/4 values, negatives, decimals, percentages)
    static parseRootMargin(marginStr, containerSize = null) {
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
    static coerceNumber(value, fallback) {
        const num = Number(value);

        return Number.isFinite(num) ? num : fallback;
    }

    // Coerce threshold (allows 0, arrays, rejects NaN)
    static coerceThreshold(value, fallback) {
        if (Array.isArray(value)) {
            // Clone array to avoid external mutations affecting change detection
            return [...value];
        }
        const num = Number(value);

        return Number.isFinite(num) ? num : fallback;
    }

    // Normalize threshold for IntersectionObserver (clamp, sort, dedupe)
    static normalizeThreshold(threshold, defaultThreshold = 0.1) {
        if (Array.isArray(threshold)) {
            // Filter out invalid values, then clamp to [0, 1], sort, and dedupe
            const valid = threshold
                .map(v => Number(v))
                .filter(v => Number.isFinite(v))
                .map(v => Math.max(0, Math.min(1, v)));
            const sorted = [...new Set(valid)].sort((a, b) => a - b);

            // Return valid array or fallback to sane default
            return sorted.length > 0 ? sorted : [defaultThreshold];
        }

        // Clamp single value to [0, 1], or fallback to sane default
        const num = Number(threshold);

        return Number.isFinite(num) ? Math.max(0, Math.min(1, num)) : defaultThreshold;
    }

    // Ensure valid IO root (Element or null for viewport)
    static getValidObserverRoot(root) {
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
}

// Export for global access
if (typeof window !== 'undefined') {
    window.FeedUIHelpers = FeedUIHelpers;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FeedUIHelpers;
}

