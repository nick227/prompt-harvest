/**
 * SearchEventEmitter
 * Handles CustomEvent emission for search lifecycle telemetry
 * Self-contained with state cloning to prevent mutations
 *
 * @class SearchEventEmitter
 */
class SearchEventEmitter {
    /**
     * @param {Function} debugFn - Debug logging function
     */
    constructor(debugFn = null) {
        this.isDebugEnabled = debugFn;
    }

    /**
     * Emit custom search event for telemetry/hooks
     * Clones state to prevent listener mutations
     * @param {string} eventName - Event name (search:start|page|error|complete|end)
     * @param {object} detail - Event detail data
     * @param {object} state - Current search state (will be cloned)
     */
    emitSearchEvent(eventName, detail, state) {
        try {
            const event = new CustomEvent(eventName, {
                detail: {
                    ...detail,
                    timestamp: Date.now(),
                    // Clone state to prevent mutations by listeners
                    state: this.cloneState(state)
                },
                bubbles: true,
                cancelable: false
            });

            window.dispatchEvent(event);

            if (this.isDebugEnabled?.()) {
                console.log(`📡 SEARCH EVENT: ${eventName}`, detail);
            }
        } catch (error) {
            // Don't let telemetry failures break search
            console.warn('⚠️ SEARCH: Failed to emit event', eventName, error);
        }
    }

    /**
     * Clone state object to prevent mutations
     * Creates safe snapshot with only serializable primitives and small objects
     * @param {object} state - State to clone
     * @returns {object} Safe state snapshot for telemetry
     */
    cloneState(state) {
        // Build safe snapshot with only fields needed by listeners
        return {
            currentSearchTerm: String(state.currentSearchTerm ?? ''),
            isSearchActive: !!state.isSearchActive,
            currentPage: Number(state.currentPage) || 1,
            hasMore: !!state.hasMore,
            isLoading: !!state.isLoading,
            autoLoadAttempts: Number(state.autoLoadAttempts) || 0,
            searchCounts: state.searchCounts
                ? {
                    total: Number(state.searchCounts.total) || 0,
                    public: Number(state.searchCounts.public) || 0,
                    private: Number(state.searchCounts.private) || 0,
                    visible: Number(state.searchCounts.visible) || 0
                }
                : {
                    total: 0,
                    public: 0,
                    private: 0,
                    visible: 0
                }
        };
    }
}

// Export for use in SearchManager
window.SearchEventEmitter = SearchEventEmitter;

