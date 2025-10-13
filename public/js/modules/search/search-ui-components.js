/**
 * SearchUIComponents
 * Handles UI component creation for search (messages, indicators)
 * Extracted from SearchManager for better code organization
 *
 * CSS Dependencies:
 * - public/css/modules/search-ui.css must be loaded
 * - Required classes: search-message, search-active-indicator, and all variants
 *
 * Count Semantics:
 * - total: Total search results found across all visibility levels
 * - visible: Results visible to current user (private filter)
 * - visiblePublic: Public results visible to all users (public filter)
 * - Invariants: 0 <= visible <= total, 0 <= visiblePublic <= total
 *
 * Localization:
 * - Current implementation uses hardcoded English strings
 * - Number formatting uses native JavaScript (not Intl.NumberFormat)
 * - Future: inject i18n formatter function for multi-language support
 * - Future: use Intl.NumberFormat() for locale-aware number display
 *
 * @class SearchUIComponents
 */

// UMD export pattern (works in browser, CommonJS, and AMD)
// eslint-disable-next-line func-names
(function umdWrapper(root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        // CommonJS
        module.exports = factory();
    } else {
        // Browser globals
        const exports = factory();

        root.SearchUIComponents = exports.SearchUIComponents;
        root.MESSAGE_TYPES = exports.MESSAGE_TYPES;
        root.FILTER_TYPES = exports.FILTER_TYPES;
        root.DEFAULT_MESSAGE_CONFIG = exports.DEFAULT_MESSAGE_CONFIG;
        root.MAX_QUERY_DISPLAY_LENGTH = exports.MAX_QUERY_DISPLAY_LENGTH;
    }
// eslint-disable-next-line func-names, prefer-arrow-callback, max-lines-per-function
}(typeof self !== 'undefined' ? self : this, function exportFactory() {
/* eslint-disable indent */
// Constants scoped inside factory to avoid global collisions

// Message type constants
const MESSAGE_TYPES = {
    NO_RESULTS: 'noResults',
    ERROR: 'error'
};

// Filter type mapping
const FILTER_TYPES = {
    PUBLIC: ['public', 'site'],
    PRIVATE: ['private', 'user']
};

// Default message config for unknown types
const DEFAULT_MESSAGE_CONFIG = {
    icon: '❓',
    title: 'Unknown message',
    message: 'An unexpected message occurred',
    buttonClass: 'primary',
    buttonText: 'Dismiss',
    isError: false
};

// Query display max length
const MAX_QUERY_DISPLAY_LENGTH = 60;

class SearchUIComponents {
    /**
     * Creates a new SearchUIComponents instance
     * @param {Function} escapeHTMLFn - Function to escape HTML
     *        (UNUSED: kept for API compatibility, all content uses textContent)
     * @param {Function} clearSearchCallback - Callback to clear search and restore feed
     */
    constructor(escapeHTMLFn, clearSearchCallback) {
        this.escapeHTML = escapeHTMLFn; // Kept for future innerHTML usage, currently unused
        this.clearSearch = clearSearchCallback;

        // Rate limiting for validation warnings
        this.lastWarningTime = 0;
        this.warningThrottle = 5000; // 5 seconds between warnings
    }

    // Create generic message element
    createMessageElement(config) {
        const validatedConfig = this.validateMessageConfig(config);
        const message = this.createMessageContainer(validatedConfig.isError);
        const icon = this.createMessageIcon(validatedConfig);
        const title = this.createMessageTitle(validatedConfig);
        const text = this.createMessageText(validatedConfig);
        const button = this.createMessageButton(validatedConfig);

        message.appendChild(icon);
        message.appendChild(title);
        message.appendChild(text);
        message.appendChild(button);

        return message;
    }

    // Validate message config with defaults
    validateMessageConfig(config = {}) {
        // Guard onClick to ensure it's a function
        const onClick = typeof config.onClick === 'function'
            ? config.onClick
            : this.clearSearch.bind(this);

        return {
            icon: config.icon || DEFAULT_MESSAGE_CONFIG.icon,
            title: config.title || DEFAULT_MESSAGE_CONFIG.title,
            message: config.message || DEFAULT_MESSAGE_CONFIG.message,
            buttonClass: config.buttonClass || DEFAULT_MESSAGE_CONFIG.buttonClass,
            buttonText: config.buttonText || DEFAULT_MESSAGE_CONFIG.buttonText,
            // Use explicit isError from config, not inferred from styling
            isError: config.isError !== undefined ? config.isError : false,
            // Allow custom onClick callback per message (guarded)
            onClick
        };
    }

    // Create message container
    createMessageContainer(isError) {
        const message = document.createElement('div');

        message.className = 'search-message';
        // Errors should be assertive, status updates polite
        message.setAttribute('role', isError ? 'alert' : 'status');
        message.setAttribute('aria-live', isError ? 'assertive' : 'polite');

        return message;
    }

    // Create message icon
    createMessageIcon(config) {
        const icon = document.createElement('div');

        icon.className = 'search-message__icon';
        icon.textContent = config.icon;
        icon.setAttribute('aria-hidden', 'true');

        return icon;
    }

    // Create message title
    createMessageTitle(config) {
        const title = document.createElement('h3');

        title.className = 'search-message__title';
        title.textContent = config.title;

        return title;
    }

    // Create message text
    createMessageText(config) {
        const text = document.createElement('p');

        text.className = 'search-message__text';
        text.textContent = config.message;

        return text;
    }

    // Create message button
    createMessageButton(config) {
        const button = document.createElement('button');

        button.className = `search-message__button search-message__button--${config.buttonClass}`;
        button.textContent = config.buttonText;
        button.setAttribute('type', 'button');
        button.setAttribute('aria-label', `${config.buttonText} for ${config.title}`);
        button.addEventListener('click', config.onClick);

        return button;
    }

    // Get message config by type
    getMessageConfig(type, query) {
        // Note: query is NOT escaped here - textContent handles safety
        // Truncate query for all message types to prevent UI overflow
        const safeQuery = this.truncateQuery(query);

        const configs = {
            [MESSAGE_TYPES.NO_RESULTS]: {
                icon: '🔍',
                title: 'No results found',
                message: `No images found for "${safeQuery}"`,
                buttonClass: 'primary',
                buttonText: 'Clear Search',
                isError: false
            },
            [MESSAGE_TYPES.ERROR]: {
                icon: '⚠️',
                title: 'Search failed',
                message: `Unable to search for "${safeQuery}". Please try again.`,
                buttonClass: 'danger',
                buttonText: 'Clear Search',
                isError: true
            }
        };

        // Unknown type: use default with truncated query
        return configs[type] || {
            ...DEFAULT_MESSAGE_CONFIG,
            message: `${DEFAULT_MESSAGE_CONFIG.message}: "${safeQuery}"`,
            isError: false
        };
    }

    // Create search indicator element
    createSearchIndicator() {
        const indicator = document.createElement('div');

        indicator.className = 'search-active-indicator';
        indicator.setAttribute('role', 'status');
        indicator.setAttribute('aria-live', 'polite');
        // Announce entire region at once to reduce SR noise during updates
        indicator.setAttribute('aria-atomic', 'true');

        // Note: Caller should throttle updates to this indicator to prevent
        // excessive screen reader announcements during rapid count changes

        return indicator;
    }

    // Build indicator content with proper DOM structure
    buildIndicatorContent(indicator, query, countText) {
        indicator.innerHTML = '';
        // Reset all variant classes to ensure clean state
        this.resetIndicatorClasses(indicator);

        const content = this.createIndicatorContent(query, countText);
        const button = this.createIndicatorButton();

        indicator.appendChild(content);
        indicator.appendChild(button);

        return indicator;
    }

    // Reset indicator variant classes
    resetIndicatorClasses(indicator) {
        // Remove all known variant classes
        indicator.classList.remove('search-active-indicator--warning');
        // Add future variants here as needed
    }

    // Create indicator content
    createIndicatorContent(query, countText) {
        const content = document.createElement('div');

        content.className = 'search-active-indicator__content';

        const searchLabel = document.createElement('strong');

        searchLabel.textContent = 'Search: ';

        const searchQuery = this.createQueryDisplay(query);
        const countLabel = document.createElement('span');

        countLabel.className = 'search-active-indicator__count';
        countLabel.textContent = countText;

        content.appendChild(searchLabel);
        content.appendChild(searchQuery);
        content.appendChild(countLabel);

        return content;
    }

    // Create query display with truncation
    createQueryDisplay(query) {
        const querySpan = document.createElement('span');
        // Ensure query is string for comparison
        const queryStr = String(query ?? '');
        const displayQuery = this.truncateQuery(queryStr);

        querySpan.className = 'search-active-indicator__query';
        querySpan.textContent = `"${displayQuery}"`;

        // Add full query as tooltip and aria-label if truncated (better accessibility)
        if (displayQuery !== queryStr) {
            querySpan.setAttribute('title', queryStr);
            querySpan.setAttribute('aria-label', `Search query: ${queryStr}`);
        } else {
            querySpan.setAttribute('aria-label', `Search query: ${queryStr}`);
        }

        return querySpan;
    }

    // Truncate long queries
    truncateQuery(query) {
        // Coerce to string to handle null, undefined, numbers, etc.
        const q = String(query ?? '');

        if (q.length <= MAX_QUERY_DISPLAY_LENGTH) {
            return q;
        }

        return `${q.substring(0, MAX_QUERY_DISPLAY_LENGTH)}…`;
    }

    // Create indicator button
    createIndicatorButton() {
        const button = document.createElement('button');

        button.className = 'search-active-indicator__button';
        button.textContent = 'Clear Search';
        button.setAttribute('type', 'button');
        button.setAttribute('aria-label', 'Clear search and return to feed');
        button.addEventListener('click', () => this.clearSearch());

        return button;
    }

    /**
     * Get count text based on filter with total context
     * @param {string} filter - Current filter ('public', 'site', 'private', 'user', or other)
     * @param {Object} counts - Count object
     * @param {number} counts.total - Total results across all visibility levels
     * @param {number} counts.visible - Results visible to current user
     * @param {number} counts.public - Total public results
     * @param {number} counts.private - Total private results
     * @returns {string} Formatted count text with context
     */
    getCountText(filter, counts) {
        // Get actual counts from the object
        const publicCount = Math.max(0, Number(counts.public) || 0);
        const privateCount = Math.max(0, Number(counts.private) || 0);
        const total = Math.max(0, Number(counts.total) || 0);

        // Normalize filter to lowercase for case-insensitive comparison
        const normalizedFilter = (filter || '').toLowerCase();

        // Determine filter type
        const isPublicFilter = FILTER_TYPES.PUBLIC.includes(normalizedFilter);
        const isPrivateFilter = FILTER_TYPES.PRIVATE.includes(normalizedFilter);

        // Show both counts in a clear format
        const text = this.buildCombinedCountText(publicCount, privateCount);

        if (window.isDebugEnabled?.('SEARCH_FILTERING')) {
            console.log('📊 BUILDING COUNT TEXT:', {
                filter: normalizedFilter,
                isPublicFilter,
                isPrivateFilter,
                counts: { total, public: publicCount, private: privateCount },
                resultText: text
            });
        }

        return text;
    }

    // Throttled warning (prevents console spam)
    logWarningThrottled(message, data) {
        const now = Date.now();

        if (now - this.lastWarningTime > this.warningThrottle) {
            console.warn(message, data);
            this.lastWarningTime = now;
        }
    }

    // Validate and sanitize counts
    validateCounts(counts = {}) {
        // Explicit Number coercion to handle strings like "5"
        const visible = Math.max(0, Number(counts.visible) || 0);
        const visiblePublic = Math.max(0, Number(counts.visiblePublic) || 0);
        const total = Math.max(0, Number(counts.total) || 0);

        // Log warnings when inputs violate invariants (throttled to prevent spam)
        if (counts.visible < 0 || counts.visiblePublic < 0 || counts.total < 0) {
            this.logWarningThrottled('⚠️ SearchUIComponents: Negative count values detected', counts);
        }

        if (visible > total) {
            this.logWarningThrottled('⚠️ SearchUIComponents: visible > total, clamping', { visible, total });
        }

        if (visiblePublic > total) {
            this.logWarningThrottled('⚠️ SearchUIComponents: visiblePublic > total, clamping', { visiblePublic, total });
        }

        // Ensure invariants
        return {
            visible: Math.min(visible, total),
            visiblePublic: Math.min(visiblePublic, total),
            total
        };
    }

    // Build filter count text with context
    buildFilterText(primaryCount, total, options) {
        const contextCount = Math.max(0, total - primaryCount);

        if (primaryCount === 0) {
            return contextCount > 0
                ? `${options.noResultsPrefix} (${contextCount} ${options.contextLabel})`
                : options.noResultsPrefix;
        }

        const primaryText = this.pluralize(primaryCount, options.primarySingular, options.primaryPlural);

        return contextCount > 0
            ? `${primaryText} (${contextCount} ${options.contextLabel})`
            : primaryText;
    }

    // Build public filter count text with context
    buildPublicFilterText(visiblePublic, total) {
        return this.buildFilterText(visiblePublic, total, {
            primarySingular: 'public result',
            primaryPlural: 'public results',
            contextLabel: 'private',
            noResultsPrefix: 'No public results'
        });
    }

    // Build private filter count text with context
    buildPrivateFilterText(visiblePrivate, total) {
        return this.buildFilterText(visiblePrivate, total, {
            primarySingular: 'your result',
            primaryPlural: 'your results',
            contextLabel: 'public',
            noResultsPrefix: 'No results in your images'
        });
    }

    // Build fallback count text
    buildFallbackText(visible) {
        if (visible === 0) {
            return 'No results';
        }

        return this.pluralize(visible, 'result', 'results');
    }

    // Build combined count text showing both public and private
    buildCombinedCountText(publicCount, privateCount) {
        const total = publicCount + privateCount;

        if (total === 0) {
            return 'No results';
        }

        const parts = [];

        if (publicCount > 0) {
            parts.push(this.pluralize(publicCount, 'public', 'public'));
        }

        if (privateCount > 0) {
            parts.push(this.pluralize(privateCount, 'private', 'private'));
        }

        // Handle edge case: if one is 0, show it explicitly
        if (total > 0 && parts.length === 1) {
            if (publicCount === 0) {
                parts.unshift('0 public');
            } else {
                parts.push('0 private');
            }
        }

        return parts.join(', ');
    }

    // Pluralize text based on count
    // Note: count must be >= 1; zero should be handled with "No results" message
    pluralize(count, singular, plural) {
        // eslint-disable-next-line no-console
        if (count === 0 && typeof console !== 'undefined' && console.assert) {
            // eslint-disable-next-line no-console
            console.assert(false, 'SearchUIComponents.pluralize: count should not be 0');
        }

        return count === 1 ? `1 ${singular}` : `${count} ${plural}`;
    }

    // Build warning indicator for filter errors
    buildWarningIndicatorContent(indicator, query) {
        indicator.innerHTML = '';
        // Reset classes first, then add warning
        this.resetIndicatorClasses(indicator);
        indicator.classList.add('search-active-indicator--warning');

        const content = this.createWarningContent(query);
        const button = this.createIndicatorButton();

        indicator.appendChild(content);
        indicator.appendChild(button);

        return indicator;
    }

    // Create warning content
    createWarningContent(query) {
        const content = document.createElement('div');

        content.className = 'search-active-indicator__content';

        const warningIcon = document.createElement('strong');

        warningIcon.textContent = '⚠️ Search: ';

        const searchQuery = this.createQueryDisplay(query);
        const warningText = document.createElement('span');

        warningText.className = 'search-active-indicator__warning-text';
        warningText.textContent = '(Filter not applied - showing all results)';

        content.appendChild(warningIcon);
        content.appendChild(searchQuery);
        content.appendChild(warningText);

        return content;
    }
}

// Return exports (closing UMD factory)
return {
    SearchUIComponents,
    MESSAGE_TYPES,
    FILTER_TYPES,
    DEFAULT_MESSAGE_CONFIG,
    MAX_QUERY_DISPLAY_LENGTH
};
/* eslint-enable indent */
}));
