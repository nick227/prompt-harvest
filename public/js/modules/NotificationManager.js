/**
 * Notification Manager Module
 * Handles user notifications across the application
 * Provides fallback notification system if none exists
 */
class NotificationManager {
    constructor() {
        this.defaultDuration = 3000;
        this.defaultPosition = { top: '20px', right: '20px' };
    }

    show(message, type = 'info', duration = this.defaultDuration) {
        // Try to use existing notification system if available
        if (window.showNotification) {
            window.showNotification(message, type);
            return;
        }

        // Fallback: create a simple notification
        this.createFallbackNotification(message, type, duration);
    }

    createFallbackNotification(message, type, duration) {
        const notification = document.createElement('div');

        notification.style.cssText = `
            position: fixed;
            top: ${this.defaultPosition.top};
            right: ${this.defaultPosition.right};
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            max-width: 300px;
            word-wrap: break-word;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            transition: all 0.3s ease;
        `;

        // Set background color based on type
        notification.style.backgroundColor = this.getBackgroundColor(type);
        notification.textContent = message;
        document.body.appendChild(notification);

        // Auto-remove after specified duration
        setTimeout(() => {
            this.removeNotification(notification);
        }, duration);
    }

    getBackgroundColor(type) {
        switch (type) {
            case 'success':
                return '#10b981';
            case 'error':
                return '#ef4444';
            case 'warning':
                return '#f59e0b';
            default:
                return '#3b82f6';
        }
    }

    removeNotification(notification) {
        if (notification.parentNode) {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }

    // Convenience methods
    success(message, duration) {
        this.show(message, 'success', duration);
    }

    error(message, duration) {
        this.show(message, 'error', duration);
    }

    warning(message, duration) {
        this.show(message, 'warning', duration);
    }

    info(message, duration) {
        this.show(message, 'info', duration);
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.NotificationManager = NotificationManager;
}
