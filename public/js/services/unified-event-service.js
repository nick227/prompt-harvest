/**
 * Unified Event Service
 * Centralized event system for consistent communication across components
 * Standardizes event names and provides event management utilities
 */
class UnifiedEventService {
    constructor() {
        this.eventMap = new Map();
        this.globalListeners = new Set();
        this.init();
    }

    /**
     * Initialize the service
     */
    init() {
        this.setupGlobalEventListeners();
    }

    /**
     * Setup global event listeners
     */
    setupGlobalEventListeners() {
        // Listen for authentication state changes
        if (window.UnifiedAuthUtils) {
            window.UnifiedAuthUtils.addAuthListener((isAuthenticated) => {
                this.emit('user:authenticated', { isAuthenticated });
            });
        }

        // Listen for storage changes (cross-tab communication)
        window.addEventListener('storage', (e) => {
            if (e.key === 'authToken') {
                this.emit('user:auth-changed', { token: e.newValue });
            }
        });
    }

    /**
     * Emit a standardized event
     * @param {string} eventName - Event name
     * @param {Object} detail - Event detail
     */
    emit(eventName, detail = {}) {
        const event = new CustomEvent(eventName, { detail });
        window.dispatchEvent(event);

        // Also trigger legacy events for backward compatibility
        this.triggerLegacyEvents(eventName, detail);
    }

    /**
     * Trigger legacy events for backward compatibility
     * @param {string} eventName - Event name
     * @param {Object} detail - Event detail
     */
    triggerLegacyEvents(eventName, detail) {
        const legacyMap = {
            'user:authenticated': ['authStateChanged'],
            'credits:updated': ['creditsUpdated', 'creditBalanceUpdated'],
            'credits:promo-redeemed': ['promoCodeRedeemed'],
            'credits:payment-completed': ['paymentCompleted'],
            'stats:updated': ['statsUpdated'],
            'image:generated': ['imageGenerated']
        };

        const legacyEvents = legacyMap[eventName] || [];
        legacyEvents.forEach(legacyEvent => {
            window.dispatchEvent(new CustomEvent(legacyEvent, { detail }));
        });
    }

    /**
     * Subscribe to an event
     * @param {string} eventName - Event name
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    subscribe(eventName, callback) {
        const listener = (event) => {
            try {
                callback(event.detail);
            } catch (error) {
                console.error(`❌ Error in event listener for ${eventName}:`, error);
            }
        };

        window.addEventListener(eventName, listener);

        // Store for cleanup
        if (!this.eventMap.has(eventName)) {
            this.eventMap.set(eventName, new Set());
        }
        this.eventMap.get(eventName).add({ callback, listener });

        return () => this.unsubscribe(eventName, callback);
    }

    /**
     * Unsubscribe from an event
     * @param {string} eventName - Event name
     * @param {Function} callback - Callback function
     */
    unsubscribe(eventName, callback) {
        const listeners = this.eventMap.get(eventName);
        if (listeners) {
            for (const listener of listeners) {
                if (listener.callback === callback) {
                    window.removeEventListener(eventName, listener.listener);
                    listeners.delete(listener);
                    break;
                }
            }
        }
    }

    /**
     * Subscribe to multiple events
     * @param {Array} events - Array of event names
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    subscribeMultiple(events, callback) {
        const unsubscribers = events.map(eventName =>
            this.subscribe(eventName, callback)
        );

        return () => unsubscribers.forEach(unsub => unsub());
    }

    /**
     * Add global listener for all events
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    addGlobalListener(callback) {
        this.globalListeners.add(callback);
        return () => this.globalListeners.delete(callback);
    }

    /**
     * Remove all listeners for an event
     * @param {string} eventName - Event name
     */
    removeAllListeners(eventName) {
        const listeners = this.eventMap.get(eventName);
        if (listeners) {
            listeners.forEach(listener => {
                window.removeEventListener(eventName, listener.listener);
            });
            listeners.clear();
        }
    }

    /**
     * Get event statistics
     * @returns {Object} Event statistics
     */
    getStats() {
        const stats = {};
        for (const [eventName, listeners] of this.eventMap) {
            stats[eventName] = listeners.size;
        }
        return stats;
    }

    /**
     * Clear all event listeners
     */
    clear() {
        for (const [eventName, listeners] of this.eventMap) {
            listeners.forEach(listener => {
                window.removeEventListener(eventName, listener.listener);
            });
            listeners.clear();
        }
        this.eventMap.clear();
        this.globalListeners.clear();
    }

    // ============================================================================
    // CONVENIENCE METHODS FOR COMMON EVENTS
    // ============================================================================

    /**
     * Subscribe to authentication events
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    onAuthChange(callback) {
        return this.subscribe('user:authenticated', callback);
    }

    /**
     * Subscribe to credit events
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    onCreditUpdate(callback) {
        return this.subscribe('credits:updated', callback);
    }

    /**
     * Subscribe to stats events
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    onStatsUpdate(callback) {
        return this.subscribe('stats:updated', callback);
    }

    /**
     * Subscribe to image generation events
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    onImageGenerated(callback) {
        return this.subscribe('image:generated', callback);
    }

    /**
     * Subscribe to payment events
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    onPaymentCompleted(callback) {
        return this.subscribe('credits:payment-completed', callback);
    }

    /**
     * Subscribe to promo code events
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    onPromoRedeemed(callback) {
        return this.subscribe('credits:promo-redeemed', callback);
    }
}

// Create and initialize the service
window.UnifiedEventService = new UnifiedEventService();
