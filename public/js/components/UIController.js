/**
 * UIController - Handles UI state management
 * Single Responsibility: UI state, notifications, and user feedback
 */

class UIController {
    constructor() {
        this.elements = this.cacheElements();
        this.notificationTimeouts = new Map();
        this.isLoading = false;
    }

    cacheElements() {
        return {
            form: document.getElementById('post-form'),
            loading: document.getElementById('loading'),
            successMessage: document.getElementById('success-message'),
            errorMessage: document.getElementById('error-message'),
            adminNotice: document.getElementById('admin-only-notice'),
            publishBtn: document.getElementById('publish-btn'),
            saveDraftBtn: document.getElementById('save-draft-btn'),
            titleInput: document.getElementById('title'),
            contentInput: document.getElementById('content')
        };
    }

    showLoading(message = 'Saving Post') {
        if (this.isLoading) return;

        this.isLoading = true;
        this.elements.loading?.classList.remove('hidden');
        this.elements.form?.classList.add('opacity-50', 'pointer-events-none');

        // Update loading message if element exists
        const messageEl = this.elements.loading?.querySelector('h3');
        if (messageEl) {
            messageEl.textContent = message;
        }
    }

    hideLoading() {
        this.isLoading = false;
        this.elements.loading?.classList.add('hidden');
        this.elements.form?.classList.remove('opacity-50', 'pointer-events-none');
    }

    showSuccess(message = 'Post saved successfully!') {
        this.hideError();
        const messageEl = this.elements.successMessage?.querySelector('span');
        if (messageEl) {
            messageEl.textContent = message;
        }
        this.elements.successMessage?.classList.remove('hidden');

        // Auto-hide after 4 seconds
        this.scheduleHide('success', 4000);
    }

    showError(message = 'Failed to save post. Please try again.') {
        this.hideSuccess();
        const messageEl = this.elements.errorMessage?.querySelector('span');
        if (messageEl) {
            messageEl.textContent = message;
        }
        this.elements.errorMessage?.classList.remove('hidden');

        // Auto-hide after 6 seconds
        this.scheduleHide('error', 6000);
    }

    hideSuccess() {
        this.elements.successMessage?.classList.add('hidden');
        this.clearNotificationTimeout('success');
    }

    hideError() {
        this.elements.errorMessage?.classList.add('hidden');
        this.clearNotificationTimeout('error');
    }

    scheduleHide(type, delay) {
        this.clearNotificationTimeout(type);
        const timeout = setTimeout(() => {
            this.hideNotification(type);
        }, delay);
        this.notificationTimeouts.set(type, timeout);
    }

    clearNotificationTimeout(type) {
        const timeout = this.notificationTimeouts.get(type);
        if (timeout) {
            clearTimeout(timeout);
            this.notificationTimeouts.delete(type);
        }
    }

    hideNotification(type) {
        if (type === 'success') {
            this.hideSuccess();
        } else if (type === 'error') {
            this.hideError();
        }
    }

    updateButtonStates(isValid, hasTitle) {
        this.updateButton(this.elements.publishBtn, isValid);
        this.updateButton(this.elements.saveDraftBtn, hasTitle);
    }

    updateButton(button, isEnabled) {
        if (!button) return;

        button.disabled = !isEnabled;
        button.classList.toggle('opacity-50', !isEnabled);
        button.classList.toggle('cursor-not-allowed', !isEnabled);
    }

    showAdminNotice() {
        this.elements.adminNotice?.classList.remove('hidden');
    }

    hideAdminNotice() {
        this.elements.adminNotice?.classList.add('hidden');
    }

    updateAdminStatus(isAdmin) {
        if (isAdmin) {
            this.hideAdminNotice();
        } else {
            this.showAdminNotice();
        }
    }

    getFormData() {
        if (!this.elements.form) return {};

        const formData = new FormData(this.elements.form);
        return {
            title: formData.get('title') || '',
            content: formData.get('content') || '', // This will be the hidden input value
            excerpt: formData.get('excerpt') || '',
            thumbnail: formData.get('thumbnail') || '',
            tags: formData.get('tags') || '',
            isPublished: formData.get('isPublished') === 'on',
            isFeatured: formData.get('isFeatured') === 'on'
        };
    }

    clearForm() {
        if (this.elements.form) {
            this.elements.form.reset();
        }
    }

    destroy() {
        // Clear all timeouts
        this.notificationTimeouts.forEach(timeout => clearTimeout(timeout));
        this.notificationTimeouts.clear();

        // Reset state
        this.isLoading = false;
    }
}

// Export for use in other modules
window.UIController = UIController;
