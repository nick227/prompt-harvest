/**
 * User Messaging Component - Handles messaging functionality for users
 * Manages the messaging interface on the billing page
 */
class UserMessaging {
    constructor() {
        this.messagingService = new MessagingService();
        this.messageComponent = new MessageComponent();
        this.messages = [];
        this.isLoading = false;
        this.refreshInterval = null;
        this.init();
    }

    /**
     * Initialize the messaging component
     */
    init() {
        this.setupEventListeners();
        this.waitForBillingSystem();
    }

    /**
     * Wait for billing system to be ready (which handles authentication)
     */
    async waitForBillingSystem() {
        // Wait for billing system to be available
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait

        while (!window.billingManager && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (!window.billingManager) {
            console.warn('UserMessaging: billingManager not available, trying direct approach');
            this.loadMessagesDirectly();

            return;
        }

        // If billing system is available, wait for it to be initialized
        attempts = 0;
        while (!window.billingManager.isInitialized && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        this.loadMessagesDirectly();
        this.startAutoRefresh();
    }

    /**
     * Load messages directly (trusting that billing page handles auth)
     */
    async loadMessagesDirectly() {
        try {
            await this.loadMessages();
        } catch (error) {
            console.error('UserMessaging: Failed to load messages:', error);
            // If we get auth errors, show the auth error
            if (error.message.includes('Authentication required')) {
                this.showAuthenticationError();
            } else {
                this.showError('Failed to load messages. Please refresh the page.');
            }
        }
    }

    /**
     * Show authentication error message
     */
    showAuthenticationError() {
        const messagesDisplay = document.getElementById('messages-display');

        if (messagesDisplay) {
            messagesDisplay.innerHTML = `
                <div class="no-messages text-center py-8">
                    <div class="text-gray-500 mb-4">
                        <i class="fas fa-lock text-4xl mb-2"></i>
                        <p class="text-lg font-medium">Authentication Required</p>
                        <p class="text-sm">Please log in to view and send support messages.</p>
                    </div>
                    <a href="/login" class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        <i class="fas fa-sign-in-alt mr-2"></i>
                        Go to Login
                    </a>
                </div>
            `;
        }

        // Hide the message form
        const form = document.getElementById('new-message-form');

        if (form) {
            form.style.display = 'none';
        }
    }

    /**
     * Setup authentication state listener
     */
    setupAuthListener() {
        // Listen for authentication state changes
        document.addEventListener('authStateChanged', event => {
            if (event.detail.authenticated) {
                this.loadMessages();
                this.startAutoRefresh();
            } else {
                this.showAuthenticationError();
                this.stopAutoRefresh();
            }
        });
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Message form submission
        const form = document.getElementById('new-message-form');

        if (form) {
            form.addEventListener('submit', this.handleFormSubmit.bind(this));
        }

        // Character count for textarea
        const messageInput = document.getElementById('message-input');

        if (messageInput) {
            messageInput.addEventListener('input', this.handleInputChange.bind(this));
        }

        // Message actions (edit, delete)
        document.addEventListener('click', this.handleMessageActions.bind(this));

        // Auto-resize textarea
        if (messageInput) {
            messageInput.addEventListener('input', this.autoResizeTextarea.bind(this));
        }
    }

    /**
     * Load user messages
     */
    async loadMessages() {
        if (this.isLoading) {
            return;
        }

        this.isLoading = true;
        const messagesDisplay = document.getElementById('messages-display');

        try {
            // Show loading state
            messagesDisplay.innerHTML = `
                <div class="loading-placeholder">
                    <div class="loading-spinner"></div>
                    <p>Loading messages...</p>
                </div>
            `;

            const messages = await this.messagingService.getUserMessages();

            this.messages = messages;
            this.renderMessages();

        } catch (error) {
            console.error('Error loading messages:', error);

            // Handle authentication errors specifically
            if (error.message.includes('Authentication required')) {
                this.showAuthenticationError();
            } else {
                this.showError('Failed to load messages. Please try again.');
            }
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Render messages in the display area
     */
    renderMessages() {
        const messagesDisplay = document.getElementById('messages-display');

        if (!this.messages || this.messages.length === 0) {
            messagesDisplay.innerHTML = `
                <div class="no-messages">
                    <i class="fas fa-comments"></i>
                    <h3>No messages yet</h3>
                    <p>Send a message to support and we'll get back to you as soon as possible.</p>
                </div>
            `;

            return;
        }

        // Create conversation container
        const conversationEl = this.messageComponent.renderConversation(this.messages, false);

        messagesDisplay.innerHTML = '';
        messagesDisplay.appendChild(conversationEl);

        // Scroll to bottom
        messagesDisplay.scrollTop = messagesDisplay.scrollHeight;
    }

    /**
     * Handle form submission
     * @param {Event} event - Form submit event
     */
    async handleFormSubmit(event) {
        event.preventDefault();

        const messageInput = document.getElementById('message-input');
        const sendBtn = document.getElementById('send-message-btn');
        const message = messageInput.value.trim();

        if (!message) {
            this.showError('Please enter a message');

            return;
        }

        // Validate message
        const validation = this.messagingService.validateMessage(message);

        if (!validation.isValid) {
            this.showError(validation.errors[0]);

            return;
        }

        // Disable form during submission
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

        try {
            const newMessage = await this.messagingService.sendMessage(message);

            // Add message to local array
            this.messages.unshift(newMessage);

            // Re-render messages
            this.renderMessages();

            // Clear form
            messageInput.value = '';
            this.updateCharacterCount(0);
            this.autoResizeTextarea();

            // Show success message
            this.showSuccess('Message sent successfully!');

        } catch (error) {
            console.error('Error sending message:', error);
            this.showError('Failed to send message. Please try again.');
        } finally {
            // Re-enable form
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Message';
        }
    }

    /**
     * Handle input change for character count
     * @param {Event} event - Input event
     */
    handleInputChange(event) {
        const message = event.target.value;

        this.updateCharacterCount(message.length);
    }

    /**
     * Update character count display
     * @param {number} count - Character count
     */
    updateCharacterCount(count) {
        const charCountEl = document.getElementById('char-count');

        if (charCountEl) {
            charCountEl.textContent = count;

            // Change color based on count
            if (count > 4500) {
                charCountEl.style.color = '#dc3545'; // Red
            } else if (count > 4000) {
                charCountEl.style.color = '#ffc107'; // Yellow
            } else {
                charCountEl.style.color = '#6c757d'; // Gray
            }
        }
    }

    /**
     * Auto-resize textarea based on content
     * @param {Event} event - Input event
     */
    autoResizeTextarea(event) {
        const textarea = event?.target || document.getElementById('message-input');

        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
        }
    }

    /**
     * Handle message actions (edit, delete)
     * @param {Event} event - Click event
     */
    async handleMessageActions(event) {
        const target = event.target.closest('button');

        if (!target) {
            return;
        }

        const { messageId } = target.dataset;

        if (!messageId) {
            return;
        }

        const action = target.classList.contains('btn-edit')
            ? 'edit' :
            target.classList.contains('btn-delete') ? 'delete' : null;

        if (!action) {
            return;
        }

        event.preventDefault();

        switch (action) {
            case 'edit':
                await this.handleEditMessage(messageId);
                break;
            case 'delete':
                await this.handleDeleteMessage(messageId);
                break;
        }
    }

    /**
     * Handle message editing
     * @param {string} messageId - Message ID
     */
    async handleEditMessage(messageId) {
        const message = this.messages.find(m => m.id === messageId);

        if (!message) {
            return;
        }

        const newContent = prompt('Edit your message:', message.message);

        if (newContent === null || newContent.trim() === message.message) {
            return;
        }

        try {
            const updatedMessage = await this.messagingService.updateMessage(messageId, newContent);

            // Update local message
            const index = this.messages.findIndex(m => m.id === messageId);

            if (index !== -1) {
                this.messages[index] = updatedMessage;
                this.renderMessages();
            }

            this.showSuccess('Message updated successfully!');
        } catch (error) {
            console.error('Error updating message:', error);
            this.showError('Failed to update message. Please try again.');
        }
    }

    /**
     * Handle message deletion
     * @param {string} messageId - Message ID
     */
    async handleDeleteMessage(messageId) {
        if (!confirm('Are you sure you want to delete this message?')) {
            return;
        }

        try {
            await this.messagingService.deleteMessage(messageId);

            // Remove from local array
            this.messages = this.messages.filter(m => m.id !== messageId);
            this.renderMessages();

            this.showSuccess('Message deleted successfully!');
        } catch (error) {
            console.error('Error deleting message:', error);
            this.showError('Failed to delete message. Please try again.');
        }
    }

    /**
     * Start auto-refresh for new messages
     */
    startAutoRefresh() {
        // Refresh every 30 seconds
        this.refreshInterval = setInterval(() => {
            this.loadMessages();
        }, 30000);
    }

    /**
     * Stop auto-refresh
     */
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        this.showNotification(message, 'error');
    }

    /**
     * Show success message
     * @param {string} message - Success message
     */
    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    /**
     * Show notification
     * @param {string} message - Notification message
     * @param {string} type - Notification type (success, error, info)
     */
    showNotification(message, type = 'info') {
        // Use existing notification system if available
        const notificationEl = document.getElementById('error-message') ||
                              document.getElementById('success-message');

        if (notificationEl) {
            notificationEl.textContent = message;
            notificationEl.className = `${type}-message`;
            notificationEl.style.display = 'block';

            // Auto-hide after 5 seconds
            setTimeout(() => {
                notificationEl.style.display = 'none';
            }, 5000);
        } else {
            // Fallback to alert
            alert(message);
        }
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.stopAutoRefresh();
        this.messageComponent.clearCache();
        this.messagingService.clearCache();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize on billing page
    if (document.getElementById('messages-display')) {
        window.userMessaging = new UserMessaging();
    }
});

// Export for use in other modules
window.UserMessaging = UserMessaging;
