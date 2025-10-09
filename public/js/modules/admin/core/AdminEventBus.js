/**
 * Admin Event Bus - Centralized event system for admin dashboard
 * Single Responsibility: Handle all admin events in one place
 *
 * This replaces the chaotic mix of:
 * - DOM events (admin-table-action)
 * - Event bus events (table-action)
 * - Global listeners in admin.js
 * - Manager-specific listeners
 */

class AdminEventBus {
    constructor() {
        this.listeners = new Map();
        this.debugMode = true;

    }

    /**
     * Emit an event to all registered listeners
     * @param {string} type - Event type (e.g., 'table-action', 'modal-action')
     * @param {string} action - Specific action (e.g., 'create', 'edit', 'delete')
     * @param {Object} data - Event data
     */
    emit(type, action, data = {}) {
        if (this.debugMode) {
            console.log(`[AdminEventBus] Emitting: ${type}.${action}`, data);
        }

        const eventKey = `${type}.${action}`;
        const listeners = this.listeners.get(eventKey) || [];

        listeners.forEach(listener => {
            try {
                listener(data);
            } catch (error) {
                console.error(`🎭 ADMIN-EVENT-BUS: Error in listener for ${eventKey}:`, error);
            }
        });

        // Also emit to wildcard listeners
        const wildcardListeners = this.listeners.get(`${type}.*`) || [];

        wildcardListeners.forEach(listener => {
            try {
                listener(action, data);
            } catch (error) {
                console.error(`🎭 ADMIN-EVENT-BUS: Error in wildcard listener for ${type}:`, error);
            }
        });
    }

    /**
     * Register a listener for a specific event
     * @param {string} type - Event type
     * @param {string} action - Specific action (use '*' for all actions of this type)
     * @param {Function} listener - Event handler function
     */
    on(type, action, listener) {
        const eventKey = `${type}.${action}`;

        if (!this.listeners.has(eventKey)) {
            this.listeners.set(eventKey, []);
        }

        // Check if listener is already registered to prevent duplicates
        const existingListeners = this.listeners.get(eventKey);

        if (existingListeners.includes(listener)) {
            if (this.debugMode) {
                console.warn(`[AdminEventBus] Listener already registered for: ${eventKey}`);
            }

            return;
        }

        this.listeners.get(eventKey).push(listener);

        if (this.debugMode) {
            console.log(`[AdminEventBus] Registered listener for: ${eventKey}`);
        }
    }

    /**
     * Remove a specific listener
     * @param {string} type - Event type
     * @param {string} action - Specific action
     * @param {Function} listener - Listener function to remove
     */
    off(type, action, listener) {
        const eventKey = `${type}.${action}`;
        const listeners = this.listeners.get(eventKey) || [];
        const index = listeners.indexOf(listener);

        if (index > -1) {
            listeners.splice(index, 1);
            if (this.debugMode) {
                console.log(`[AdminEventBus] Removed listener from: ${eventKey}`);
            }
        }
    }

    /**
     * Remove all listeners for a specific event
     * @param {string} type - Event type
     * @param {string} action - Specific action
     */
    removeAll(type, action) {
        const eventKey = `${type}.${action}`;

        this.listeners.delete(eventKey);

        if (this.debugMode) {
            console.log(`[AdminEventBus] Removed all listeners from: ${eventKey}`);
        }
    }

    /**
     * Get all registered listeners (for debugging)
     */
    getListeners() {
        const result = {};

        for (const [key, listeners] of this.listeners.entries()) {
            result[key] = listeners.length;
        }

        return result;
    }

    /**
     * Enable/disable debug mode
     * @param {boolean} enabled - Debug mode state
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
    }
}

// Create global instance
window.AdminEventBus = new AdminEventBus();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminEventBus;
}
