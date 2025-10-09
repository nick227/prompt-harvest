/**
 * Admin Messaging Component - Handles messaging functionality for admins
 * Manages the admin messaging interface with conversation management
 */
class AdminMessaging {
    constructor() {
        try {
            // Check if dependencies are available
            if (typeof MessagingService === 'undefined') {
                throw new Error('MessagingService is not available');
            }
            if (typeof MessageComponent === 'undefined') {
                throw new Error('MessageComponent is not available');
            }

            this.messagingService = new MessagingService();
            this.messageComponent = new MessageComponent();
            this.conversations = [];
            this.currentConversation = null;
            this.isLoading = false;
            this.refreshInterval = null;
            this.init();
        } catch (error) {
            console.error('❌ ADMIN-MESSAGING: Failed to initialize:', error);
            // Set up error state
            this.conversations = [];
            this.currentConversation = null;
            this.isLoading = false;
            this.refreshInterval = null;
            this.showInitializationError();
        }
    }

    /**
     * Show initialization error message
     */
    showInitializationError() {
        const conversationsList = document.getElementById('conversations-list');
        const conversationDetail = document.querySelector('.conversation-detail');

        if (conversationsList) {
            conversationsList.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Failed to Initialize Messaging</h3>
                    <p>There was an error loading the messaging system. Please refresh the page.</p>
                    <button onclick="window.location.reload()" class="btn btn-primary">
                        <i class="fas fa-refresh"></i> Refresh Page
                    </button>
                </div>
            `;
        }

        if (conversationDetail) {
            conversationDetail.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Messaging System Error</h3>
                    <p>Please refresh the page to reload the messaging system.</p>
                </div>
            `;
        }
    }

    /**
     * Initialize the admin messaging component
     */
    init() {
        this.setupEventListeners();
        this.loadConversations();
        this.startAutoRefresh();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Refresh button
        const refreshBtn = document.getElementById('refresh-messages-btn');

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadConversations());
        }

        // Mark all read button
        const markAllReadBtn = document.getElementById('mark-all-read-btn');

        if (markAllReadBtn) {
            markAllReadBtn.addEventListener('click', () => this.markAllAsRead());
        }

        // Reply form
        const replyForm = document.getElementById('admin-reply-form');

        if (replyForm) {
            replyForm.addEventListener('submit', this.handleReplySubmit.bind(this));
        }

        // Conversation selection
        document.addEventListener('click', this.handleConversationClick.bind(this));

        // Message actions (edit, delete, mark as read)
        document.addEventListener('click', this.handleMessageActions.bind(this));
    }

    /**
     * Load conversations for admin
     */
    async loadConversations() {
        if (this.isLoading) {
            return;
        }

        this.isLoading = true;
        const conversationsContainer = document.getElementById('conversations-container');
        const refreshBtn = document.getElementById('refresh-messages-btn');

        try {
            // Show loading state
            conversationsContainer.innerHTML = `
                <div class="loading-placeholder">
                    <div class="loading-spinner"></div>
                    <p>Loading conversations...</p>
                </div>
            `;

            if (refreshBtn) {
                refreshBtn.disabled = true;
                refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
            }

            const data = await this.messagingService.getAdminMessages();

            this.conversations = data.conversations;
            this.renderConversations();
            this.updateUnreadBadge(data.totalUnread);

        } catch (error) {
            console.error('Error loading conversations:', error);
            this.showError('Failed to load conversations. Please try again.');
        } finally {
            this.isLoading = false;
            if (refreshBtn) {
                refreshBtn.disabled = false;
                refreshBtn.innerHTML = '<i class="fas fa-refresh"></i> Refresh';
            }
        }
    }

    /**
     * Render conversations list
     */
    renderConversations() {
        const conversationsContainer = document.getElementById('conversations-container');

        if (!this.conversations || this.conversations.length === 0) {
            conversationsContainer.innerHTML = `
                <div class="no-conversations">
                    <i class="fas fa-comments"></i>
                    <h3>No conversations yet</h3>
                    <p>User messages will appear here when they contact support.</p>
                </div>
            `;

            return;
        }

        conversationsContainer.innerHTML = '';
        this.conversations.forEach(conversation => {
            const conversationEl = this.messageComponent.renderAdminConversationItem(conversation);

            conversationsContainer.appendChild(conversationEl);
        });
    }

    /**
     * Handle conversation click
     * @param {Event} event - Click event
     */
    async handleConversationClick(event) {
        const conversationItem = event.target.closest('.conversation-item');

        if (!conversationItem) {
            return;
        }

        const { userId } = conversationItem.dataset;
        const conversation = this.conversations.find(c => c.user.id === userId);

        if (!conversation) {
            return;
        }

        // Update active conversation
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.remove('active');
        });
        conversationItem.classList.add('active');

        // Load conversation messages
        await this.loadConversationMessages(conversation);
    }

    /**
     * Load messages for a specific conversation
     * @param {Object} conversation - Conversation data
     */
    async loadConversationMessages(conversation) {
        this.currentConversation = conversation;

        const messagesContainer = document.getElementById('conversation-messages');
        const userInfo = document.getElementById('selected-user-name');
        const userEmail = document.getElementById('selected-user-email');
        const conversationActions = document.getElementById('conversation-actions');
        const markAllReadBtn = document.getElementById('mark-all-read-btn');

        // Update user info
        if (userInfo) {
            userInfo.textContent = conversation.user.username;
        }
        if (userEmail) {
            userEmail.textContent = conversation.user.email;
        }

        // Show conversation actions
        if (conversationActions) {
            conversationActions.style.display = 'block';
        }
        if (markAllReadBtn) {
            markAllReadBtn.style.display = conversation.unreadCount > 0 ? 'block' : 'none';
        }

        // Render messages
        const conversationEl = this.messageComponent.renderConversation(conversation.messages, true);

        messagesContainer.innerHTML = '';
        messagesContainer.appendChild(conversationEl);

        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // Mark user messages as read
        await this.markUserMessagesAsRead(conversation);
    }

    /**
     * Mark user messages as read for current conversation
     * @param {Object} conversation - Conversation data
     */
    async markUserMessagesAsRead(conversation) {
        const unreadUserMessages = conversation.messages.filter(
            message => !message.isRead && message.isFromUser
        );

        for (const message of unreadUserMessages) {
            try {
                await this.messagingService.markAsRead(message.id, true);
                this.messageComponent.updateReadStatus(message.id, true);
            } catch (error) {
                console.error('Error marking message as read:', error);
            }
        }

        // Update conversation unread count
        conversation.unreadCount = 0;
        this.updateConversationUnreadCount(conversation.user.id, 0);
    }

    /**
     * Handle reply form submission
     * @param {Event} event - Form submit event
     */
    async handleReplySubmit(event) {
        event.preventDefault();

        if (!this.currentConversation) {
            this.showError('No conversation selected');

            return;
        }

        const replyInput = document.getElementById('admin-reply-input');
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const message = replyInput.value.trim();

        if (!message) {
            this.showError('Please enter a reply message');

            return;
        }

        // Validate message
        const validation = this.messagingService.validateMessage(message);

        if (!validation.isValid) {
            this.showError(validation.errors[0]);

            return;
        }

        // Disable form during submission
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

        try {
            // Send admin reply with the current user's ID so it appears in their conversation
            const newMessage = await this.messagingService.sendAdminReply(message, this.currentConversation.user.id);

            // Add message to current conversation
            this.currentConversation.messages.unshift(newMessage);

            // Re-render conversation
            await this.loadConversationMessages(this.currentConversation);

            // Clear form
            replyInput.value = '';

            // Show success message
            this.showSuccess('Reply sent successfully!');

        } catch (error) {
            console.error('Error sending reply:', error);
            this.showError('Failed to send reply. Please try again.');
        } finally {
            // Re-enable form
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Reply';
        }
    }

    /**
     * Handle message actions (edit, delete, mark as read)
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
            target.classList.contains('btn-delete')
                ? 'delete' :
                target.classList.contains('btn-mark-read') ? 'mark-read' : null;

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
            case 'mark-read':
                await this.handleMarkAsRead(messageId);
                break;
        }
    }

    /**
     * Handle message editing
     * @param {string} messageId - Message ID
     */
    async handleEditMessage(messageId) {
        const message = this.findMessageById(messageId);

        if (!message) {
            return;
        }

        const newContent = prompt('Edit message:', message.message);

        if (newContent === null || newContent.trim() === message.message) {
            return;
        }

        try {
            const updatedMessage = await this.messagingService.updateMessage(messageId, newContent);

            // Update message in current conversation
            const conversation = this.currentConversation;

            if (conversation) {
                const index = conversation.messages.findIndex(m => m.id === messageId);

                if (index !== -1) {
                    conversation.messages[index] = updatedMessage;
                    await this.loadConversationMessages(conversation);
                }
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

            // Remove message from current conversation
            const conversation = this.currentConversation;

            if (conversation) {
                conversation.messages = conversation.messages.filter(m => m.id !== messageId);
                await this.loadConversationMessages(conversation);
            }

            this.showSuccess('Message deleted successfully!');
        } catch (error) {
            console.error('Error deleting message:', error);
            this.showError('Failed to delete message. Please try again.');
        }
    }

    /**
     * Handle mark as read
     * @param {string} messageId - Message ID
     */
    async handleMarkAsRead(messageId) {
        try {
            await this.messagingService.markAsRead(messageId, true);
            this.messageComponent.updateReadStatus(messageId, true);
            this.showSuccess('Message marked as read');
        } catch (error) {
            console.error('Error marking message as read:', error);
            this.showError('Failed to mark message as read');
        }
    }

    /**
     * Mark all messages as read for current conversation
     */
    async markAllAsRead() {
        if (!this.currentConversation) {
            return;
        }

        const unreadMessages = this.currentConversation.messages.filter(
            message => !message.isRead && message.isFromUser
        );

        for (const message of unreadMessages) {
            try {
                await this.messagingService.markAsRead(message.id, true);
                this.messageComponent.updateReadStatus(message.id, true);
            } catch (error) {
                console.error('Error marking message as read:', error);
            }
        }

        // Update conversation unread count
        this.currentConversation.unreadCount = 0;
        this.updateConversationUnreadCount(this.currentConversation.user.id, 0);

        // Hide mark all read button
        const markAllReadBtn = document.getElementById('mark-all-read-btn');

        if (markAllReadBtn) {
            markAllReadBtn.style.display = 'none';
        }

        this.showSuccess('All messages marked as read');
    }

    /**
     * Find message by ID in current conversation
     * @param {string} messageId - Message ID
     * @returns {Object|null} - Message object or null
     */
    findMessageById(messageId) {
        if (!this.currentConversation) {
            return null;
        }

        return this.currentConversation.messages.find(m => m.id === messageId);
    }

    /**
     * Update conversation unread count in the list
     * @param {string} userId - User ID
     * @param {number} count - Unread count
     */
    updateConversationUnreadCount(userId, count) {
        const conversationItem = document.querySelector(`[data-user-id="${userId}"]`);

        if (!conversationItem) {
            return;
        }

        const unreadBadge = conversationItem.querySelector('.unread-badge');

        if (count > 0) {
            if (unreadBadge) {
                unreadBadge.textContent = count;
            } else {
                const meta = conversationItem.querySelector('.conversation-meta');

                if (meta) {
                    meta.insertAdjacentHTML('beforeend', `<span class="unread-badge">${count}</span>`);
                }
            }
            conversationItem.classList.add('has-unread');
        } else {
            if (unreadBadge) {
                unreadBadge.remove();
            }
            conversationItem.classList.remove('has-unread');
        }
    }

    /**
     * Update unread badge in tab
     * @param {number} totalUnread - Total unread count
     */
    updateUnreadBadge(totalUnread) {
        const badge = document.getElementById('messages-unread-badge');
        const totalBadge = document.getElementById('total-unread-count');

        if (badge) {
            if (totalUnread > 0) {
                badge.textContent = totalUnread;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        }

        if (totalBadge) {
            if (totalUnread > 0) {
                totalBadge.textContent = totalUnread;
                totalBadge.style.display = 'inline-block';
            } else {
                totalBadge.style.display = 'none';
            }
        }
    }

    /**
     * Start auto-refresh for new messages
     */
    startAutoRefresh() {
        // Refresh every 30 seconds
        this.refreshInterval = setInterval(() => {
            this.loadConversations();
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
        // Create notification element
        const notification = document.createElement('div');

        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        // Add to page
        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
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

// Export for use in other modules
window.AdminMessaging = AdminMessaging;
