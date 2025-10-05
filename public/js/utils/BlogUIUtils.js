/**
 * Blog UI Utilities
 * Centralized UI functionality for blog pages
 */

class BlogUIUtils {
    constructor() {
        this.debugMode = window.location.search.includes('debug');
    }

    /**
     * Show loading state
     */
    showLoading(loadingId = 'loading', message = 'Loading...') {
        const loading = document.getElementById(loadingId);
        if (loading) {
            loading.classList.remove('hidden');
            const textElement = loading.querySelector('p');
            if (textElement) {
                textElement.textContent = message;
            }
        }
    }

    /**
     * Hide loading state
     */
    hideLoading(loadingId = 'loading') {
        const loading = document.getElementById(loadingId);
        if (loading) {
            loading.classList.add('hidden');
        }
    }

    /**
     * Show success message
     */
    showSuccess(message, duration = 3000) {
        this.showMessage(message, 'success', duration);
    }

    /**
     * Show error message
     */
    showError(message, duration = 5000) {
        this.showMessage(message, 'error', duration);
    }

    /**
     * Show generic message
     */
    showMessage(message, type = 'info', duration = 3000) {
        const messageId = `${type}-message`;
        let messageElement = document.getElementById(messageId);

        if (!messageElement) {
            messageElement = this.createMessageElement(messageId, type);
        }

        messageElement.querySelector('span').textContent = message;
        messageElement.classList.remove('hidden');

        // Auto-hide after duration
        setTimeout(() => {
            messageElement.classList.add('hidden');
        }, duration);
    }

    /**
     * Create message element if it doesn't exist
     */
    createMessageElement(id, type) {
        const colors = {
            success: 'bg-green-600',
            error: 'bg-red-600',
            info: 'bg-blue-600',
            warning: 'bg-yellow-600'
        };

        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            info: 'fas fa-info-circle',
            warning: 'fas fa-exclamation-triangle'
        };

        const messageElement = document.createElement('div');
        messageElement.id = id;
        messageElement.className = `hidden fixed top-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50`;
        messageElement.innerHTML = `
            <div class="flex items-center">
                <i class="${icons[type]} mr-3"></i>
                <span></span>
            </div>
        `;

        document.body.appendChild(messageElement);
        return messageElement;
    }

    /**
     * Clear all messages
     */
    clearMessages() {
        const messageTypes = ['success', 'error', 'info', 'warning'];
        messageTypes.forEach(type => {
            const messageElement = document.getElementById(`${type}-message`);
            if (messageElement) {
                messageElement.classList.add('hidden');
            }
        });
    }

    /**
     * Show/hide form based on admin status
     */
    updateFormVisibility(isAdmin, formId = 'post-form', noticeId = 'admin-only-notice') {
        const form = document.getElementById(formId);
        const notice = document.getElementById(noticeId);

        if (form && notice) {
            if (isAdmin) {
                form.classList.remove('hidden');
                notice.classList.add('hidden');
            } else {
                form.classList.add('hidden');
                notice.classList.remove('hidden');
            }
        }
    }

    /**
     * Show/hide admin actions
     */
    updateAdminActions(isAdmin, actionsId = 'admin-actions') {
        const actions = document.getElementById(actionsId);
        if (actions) {
            if (isAdmin) {
                actions.classList.remove('hidden');
                if (this.debugMode) {
                    console.log('✅ BLOG-UI: Admin actions shown');
                }
            } else {
                actions.classList.add('hidden');
                if (this.debugMode) {
                    console.log('❌ BLOG-UI: Admin actions hidden');
                }
            }
        }
    }

    /**
     * Setup admin monitoring with callback
     */
    setupAdminMonitoring(callback = null) {
        // Listen for auth state changes
        window.addEventListener('authStateChanged', () => {
            setTimeout(() => {
                if (callback) {
                    callback();
                }
            }, 100);
        });

        // Periodic check (fallback)
        setInterval(() => {
            if (callback) {
                callback();
            }
        }, 5000);
    }

    /**
     * Debug logging helper
     */
    debug(message, data = null) {
        if (this.debugMode) {
            console.log(`🔍 BLOG-UI: ${message}`, data || '');
        }
    }
}

// Export for global access
window.BlogUIUtils = BlogUIUtils;
