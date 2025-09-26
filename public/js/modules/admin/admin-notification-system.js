/**
 * Admin Notification System - Safe, isolated notification handling
 * Provides user feedback through toast notifications
 */
class AdminNotificationSystem {
    constructor() {
        this.isInitialized = false;
        this.notifications = [];
        this.defaultDuration = 5000;
    }

    /**
     * Initialize notification system
     */
    init() {
        if (this.isInitialized) {
            console.warn('AdminNotificationSystem already initialized');

            return;
        }

        console.log('🔔 ADMIN-NOTIFICATION: Initializing notification system...');

        // Make showNotification globally available
        window.showNotification = this.showNotification.bind(this);

        this.isInitialized = true;
        console.log('✅ ADMIN-NOTIFICATION: Notification system initialized');
    }

    /**
     * Show notification to user
     * @param {string} message - Notification message
     * @param {string} type - Notification type (success, error, warning, info)
     * @param {string} title - Optional notification title
     * @param {number} duration - Display duration in milliseconds
     */
    showNotification(message, type = 'info', title = '', duration = this.defaultDuration) {
        const container = document.getElementById('notification-container');

        if (!container) {
            console.warn('❌ ADMIN-NOTIFICATION: Notification container not found');

            return;
        }

        const notification = document.createElement('div');

        notification.className = `notification ${type}`;

        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        notification.innerHTML = `
            <div class="notification-icon">
                <i class="${icons[type] || icons.info}"></i>
            </div>
            <div class="notification-content">
                ${title ? `<div class="notification-title">${this.escapeHtml(title)}</div>` : ''}
                <div class="notification-message">${this.escapeHtml(message)}</div>
            </div>
        `;

        container.appendChild(notification);

        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                this.removeNotification(notification);
            }, duration);
        }

        // Store reference for manual removal
        this.notifications.push(notification);

        console.log(`🔔 ADMIN-NOTIFICATION: ${type.toUpperCase()} - ${message}`);
    }

    /**
     * Remove notification from DOM
     * @param {HTMLElement} notification - Notification element to remove
     */
    removeNotification(notification) {
        if (notification && notification.parentNode) {
            notification.parentNode.removeChild(notification);

            // Remove from tracking array
            const index = this.notifications.indexOf(notification);

            if (index > -1) {
                this.notifications.splice(index, 1);
            }
        }
    }

    /**
     * Clear all notifications
     */
    clearAllNotifications() {
        this.notifications.forEach(notification => {
            this.removeNotification(notification);
        });
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');

        div.textContent = text;

        return div.innerHTML;
    }

    /**
     * Cleanup notification system
     */
    cleanup() {
        this.clearAllNotifications();
        delete window.showNotification;
        this.isInitialized = false;
        console.log('🧹 ADMIN-NOTIFICATION: Notification system cleaned up');
    }
}

// Export for global access and module systems
if (typeof window !== 'undefined') {
    window.AdminNotificationSystem = AdminNotificationSystem;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminNotificationSystem;
}
