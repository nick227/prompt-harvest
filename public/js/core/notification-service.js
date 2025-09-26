/**
 * Enhanced Notification Service
 * Provides consistent, styled notifications across the application
 */

class NotificationService {
    constructor() {
        this.container = null;
        this.notifications = new Map();
        this.notificationId = 0;
        this.init();
    }

    init() {
        // Find or create notification container
        this.container = document.getElementById('notification-container');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'notification-container';
            this.container.className = 'fixed top-4 right-4 z-50 space-y-2';
            document.body.appendChild(this.container);
        }
    }

    /**
     * Show a notification
     * @param {string} message - The message to display
     * @param {string} type - The type of notification (success, error, warning, info)
     * @param {number} duration - Duration in milliseconds (default: 5000)
     * @param {boolean} dismissible - Whether the notification can be dismissed
     * @returns {string} - The notification ID
     */
    show(message, type = 'info', duration = 5000, dismissible = true) {
        const id = `notification-${++this.notificationId}`;

        const notification = this.createNotification(message, type, dismissible);

        this.container.appendChild(notification);

        // Store reference
        this.notifications.set(id, notification);

        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                this.remove(id);
            }, duration);
        }

        return id;
    }

    /**
     * Create notification element
     */
    createNotification(message, type, dismissible) {
        const notification = document.createElement('div');

        // Base classes
        const baseClasses = 'notification flex items-start gap-3 p-4 rounded-lg shadow-lg max-w-sm transform transition-all duration-300 ease-out';

        // Type-specific classes
        const typeClasses = {
            success: 'bg-green-500 text-white border-l-4 border-green-600',
            error: 'bg-red-500 text-white border-l-4 border-red-600',
            warning: 'bg-yellow-500 text-gray-900 border-l-4 border-yellow-600',
            info: 'bg-blue-500 text-white border-l-4 border-blue-600'
        };

        notification.className = `${baseClasses} ${typeClasses[type] || typeClasses.info}`;

        // Icon based on type
        const iconMap = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        const icon = document.createElement('i');

        icon.className = `${iconMap[type] || iconMap.info} mt-0.5 flex-shrink-0`;
        notification.appendChild(icon);

        // Message
        const messageEl = document.createElement('div');

        messageEl.className = 'flex-1 text-sm leading-relaxed';
        messageEl.textContent = message;
        notification.appendChild(messageEl);

        // Dismiss button
        if (dismissible) {
            const dismissBtn = document.createElement('button');

            dismissBtn.className = 'text-current hover:opacity-75 transition-opacity flex-shrink-0';
            dismissBtn.innerHTML = '<i class="fas fa-times"></i>';
            dismissBtn.addEventListener('click', () => {
                notification.remove();
            });
            notification.appendChild(dismissBtn);
        }

        // Add slide-in animation
        notification.style.transform = 'translateX(100%)';
        notification.style.opacity = '0';

        // Trigger animation
        requestAnimationFrame(() => {
            notification.style.transform = 'translateX(0)';
            notification.style.opacity = '1';
        });

        return notification;
    }

    /**
     * Remove a specific notification
     */
    remove(id) {
        const notification = this.notifications.get(id);

        if (notification) {
            // Slide out animation
            notification.style.transform = 'translateX(100%)';
            notification.style.opacity = '0';

            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
                this.notifications.delete(id);
            }, 300);
        }
    }

    /**
     * Remove all notifications
     */
    clear() {
        this.notifications.forEach((notification, id) => {
            this.remove(id);
        });
    }

    /**
     * Convenience methods
     */
    success(message, duration = 5000) {
        return this.show(message, 'success', duration);
    }

    error(message, duration = 8000) {
        return this.show(message, 'error', duration);
    }

    warning(message, duration = 6000) {
        return this.show(message, 'warning', duration);
    }

    info(message, duration = 5000) {
        return this.show(message, 'info', duration);
    }

    /**
     * Show loading notification
     */
    showLoading(message = 'Processing...') {
        const id = this.show(message, 'info', 0, false);
        const notification = this.notifications.get(id);

        if (notification) {
            const icon = notification.querySelector('i');

            icon.className = 'fas fa-spinner fa-spin mt-0.5 flex-shrink-0';
        }

        return id;
    }

    /**
     * Update loading notification
     */
    updateLoading(id, message, type = 'success') {
        const notification = this.notifications.get(id);

        if (notification) {
            const messageEl = notification.querySelector('.flex-1');

            if (messageEl) {
                messageEl.textContent = message;
            }

            // Update icon and type
            const icon = notification.querySelector('i');

            if (icon) {
                icon.className = `fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'} mt-0.5 flex-shrink-0`;
            }

            // Auto-remove after 3 seconds
            setTimeout(() => {
                this.remove(id);
            }, 3000);
        }
    }
}

// Create global instance
const notificationService = new NotificationService();

// Export for global access
if (typeof window !== 'undefined') {
    window.NotificationService = NotificationService;
    window.notificationService = notificationService;
}
