/**
 * SearchUIComponents
 * Handles UI component creation for search (messages, indicators)
 * Extracted from SearchManager for better code organization
 */

class SearchUIComponents {
    constructor(escapeHTMLFn) {
        this.escapeHTML = escapeHTMLFn;
    }

    // Create generic message element
    createMessageElement(config) {
        const message = document.createElement('div');

        message.style.cssText = `
            text-align: center;
            padding: 60px 20px;
            color: var(--text-secondary, #9ca3af);
        `;

        message.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 16px;">${config.icon}</div>
            <h3 style="margin-bottom: 8px; color: var(--text-primary, #e5e7eb);">${config.title}</h3>
            <p>${config.message}</p>
            <button onclick="window.searchManager.clearSearch()" style="
                margin-top: 16px;
                padding: 8px 16px;
                background: ${config.buttonBg};
                border: 1px solid ${config.buttonBorder};
                color: ${config.buttonColor};
                border-radius: 6px;
                cursor: pointer;
                font-weight: 500;
            ">${config.buttonText}</button>
        `;

        return message;
    }

    // Get message config by type
    getMessageConfig(type, query) {
        const configs = {
            noResults: {
                icon: '🔍',
                title: 'No results found',
                message: `No images found for "${this.escapeHTML(query)}"`,
                buttonBg: 'rgba(59, 130, 246, 0.2)',
                buttonBorder: 'rgba(59, 130, 246, 0.3)',
                buttonColor: '#3b82f6',
                buttonText: 'Clear Search'
            },
            error: {
                icon: '⚠️',
                title: 'Search failed',
                message: `Unable to search for "${this.escapeHTML(query)}". Please try again.`,
                buttonBg: 'rgba(239, 68, 68, 0.2)',
                buttonBorder: 'rgba(239, 68, 68, 0.3)',
                buttonColor: '#ef4444',
                buttonText: 'Clear Search'
            }
        };

        return configs[type];
    }

    // Create search indicator element
    createSearchIndicator() {
        const indicator = document.createElement('div');

        indicator.className = 'search-active-indicator';
        indicator.style.cssText = `
            background: rgba(59, 130, 246, 0.1);
            border: 1px solid rgba(59, 130, 246, 0.3);
            border-radius: 8px;
            padding: 12px 16px;
            margin-bottom: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            color: var(--text-primary, #e5e7eb);
            animation: fadeIn 0.3s ease;
        `;

        return indicator;
    }

    // Build indicator HTML
    buildIndicatorHTML(query, countText, totalText = '') {
        return `
            <div>
                <strong>Search:</strong> "${this.escapeHTML(query)}"
                <span style="opacity: 0.7; margin-left: 8px;">${countText}${totalText}</span>
            </div>
            <button onclick="window.searchManager.clearSearch()" style="
                background: rgba(239, 68, 68, 0.2);
                border: 1px solid rgba(239, 68, 68, 0.3);
                color: #ef4444;
                padding: 4px 12px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                font-weight: 500;
                transition: all 0.2s;
            "
                onmouseover="this.style.background='rgba(239, 68, 68, 0.3)'"
                onmouseout="this.style.background='rgba(239, 68, 68, 0.2)'"
            >Clear Search</button>
        `;
    }

    // Get count text based on filter
    getCountText(filter, counts) {
        const { visible = 0, public: publicCount = 0, private: privateCount = 0 } = counts;

        // For public filter (or "site"), show public count
        if (filter === 'public' || filter === 'site') {
            // When 0 results, show generic message
            if (publicCount === 0) {
                return '0 results';
            }

            return publicCount === 1 ? '1 public result' : `${publicCount} public results`;
        }

        // For private filter, show private count
        if (filter === 'private') {
            // When 0 results, show generic message
            if (privateCount === 0) {
                return '0 results';
            }

            return privateCount === 1 ? '1 private result' : `${privateCount} private results`;
        }

        // For "mine" or "user" filter, show visible count with "your" label
        if (filter === 'mine' || filter === 'user') {
            // When 0 results, show generic message
            if (visible === 0) {
                return '0 results';
            }

            return visible === 1 ? '1 your result' : `${visible} your results`;
        }

        // Fallback: use visible count
        if (visible === 0) {
            return '0 results';
        }

        return visible === 1 ? '1 result' : `${visible} results`;
    }
}

// Export
if (typeof window !== 'undefined') {
    window.SearchUIComponents = SearchUIComponents;
}

