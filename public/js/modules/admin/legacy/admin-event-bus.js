/**
 * Admin Event Bus - Centralized event management for admin dashboard
 * Single Responsibility: Handle event communication between admin components
 */

class AdminEventBus {
    constructor() {
        this.events = new Map();
    }

    // Subscribe to an event
    on(eventName, callback) {
        if (!this.events.has(eventName)) {
            this.events.set(eventName, []);
        }

        this.events.get(eventName).push(callback);

        return () => this.off(eventName, callback);
    }

    // Unsubscribe from an event
    off(eventName, callback) {
        if (!this.events.has(eventName)) {
            return;
        }

        const callbacks = this.events.get(eventName);
        const index = callbacks.indexOf(callback);

        if (index > -1) {
            callbacks.splice(index, 1);
        }
    }

    // Emit an event
    emit(eventName, data = null) {
        if (!this.events.has(eventName)) {
            return;
        }

        const callbacks = this.events.get(eventName);

        callbacks.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`❌ ADMIN-EVENT: Error in event handler for ${eventName}:`, error);
            }
        });
    }

    // Emit event once (subscribe, emit, then unsubscribe)
    once(eventName, callback) {
        return this.on(eventName, data => {
            callback(data);
            this.off(eventName, callback);
        });
    }

    // Clear all events
    clear() {
        this.events.clear();
        console.log('🧹 ADMIN-EVENT: All events cleared');
    }

    // Get event statistics
    getStats() {
        const stats = {};

        for (const [eventName, callbacks] of this.events) {
            stats[eventName] = callbacks.length;
        }

        return stats;
    }

    // Destroy the event bus
    destroy() {
        this.clear();
        console.log('🗑️ ADMIN-EVENT: Event bus destroyed');
    }
}

// Export for global access
window.AdminEventBus = AdminEventBus;
