/**
 * Message Component - Reusable chat message component
 * Handles rendering of individual messages in chat interface
 */
class MessageComponent {
    constructor() {
        this.messageCache = new Map();
    }

    /**
     * Render a single message
     * @param {Object} message - Message data
     * @param {boolean} isAdmin - Whether current user is admin
     * @returns {HTMLElement} - Rendered message element
     */
    renderMessage(message, isAdmin = false) {
        const messageEl = document.createElement('div');
        messageEl.className = `message ${message.isFromUser ? 'user-message' : 'admin-message'} ${!message.isRead && !message.isFromUser ? 'unread' : ''}`;
        messageEl.dataset.messageId = message.id;

        const timestamp = new Date(message.createdAt).toLocaleString();
        const senderName = message.isFromUser
            ? message.user?.username || 'You'
            : message.admin?.username || 'Admin';

        messageEl.innerHTML = `
            <div class="message-header">
                <span class="sender-name">${senderName}</span>
                <span class="message-time">${timestamp}</span>
                ${!message.isRead && !message.isFromUser ? '<span class="unread-indicator">●</span>' : ''}
            </div>
            <div class="message-content">${this.escapeHtml(message.message)}</div>
            <div class="message-actions">
                ${isAdmin && message.isFromUser ? `
                    <button class="btn-reply" data-message-id="${message.id}" title="Reply">
                        <i class="fas fa-reply"></i>
                    </button>
                ` : ''}
                ${(isAdmin || message.isFromUser) ? `
                    <button class="btn-edit" data-message-id="${message.id}" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-delete" data-message-id="${message.id}" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : ''}
            </div>
        `;

        // Cache the message for quick access
        this.messageCache.set(message.id, message);

        return messageEl;
    }

    /**
     * Render a conversation thread
     * @param {Array} messages - Array of messages
     * @param {boolean} isAdmin - Whether current user is admin
     * @returns {HTMLElement} - Rendered conversation element
     */
    renderConversation(messages, isAdmin = false) {
        const conversationEl = document.createElement('div');
        conversationEl.className = 'conversation-thread';

        // Sort messages by creation time (oldest first for conversation flow)
        const sortedMessages = [...messages].sort((a, b) =>
            new Date(a.createdAt) - new Date(b.createdAt)
        );

        sortedMessages.forEach(message => {
            const messageEl = this.renderMessage(message, isAdmin);
            conversationEl.appendChild(messageEl);
        });

        return conversationEl;
    }

    /**
     * Render admin conversation list item
     * @param {Object} conversation - Conversation data with user and messages
     * @returns {HTMLElement} - Rendered conversation list item
     */
    renderAdminConversationItem(conversation) {
        const itemEl = document.createElement('div');
        itemEl.className = `conversation-item ${conversation.unreadCount > 0 ? 'has-unread' : ''}`;
        itemEl.dataset.userId = conversation.user.id;

        const lastMessage = conversation.messages[0]; // Messages are sorted desc
        const lastMessageTime = new Date(lastMessage.createdAt).toLocaleString();
        const preview = lastMessage.message.length > 100
            ? lastMessage.message.substring(0, 100) + '...'
            : lastMessage.message;

        itemEl.innerHTML = `
            <div class="conversation-header">
                <div class="user-info">
                    <span class="user-name">${conversation.user.username}</span>
                    <span class="user-email">${conversation.user.email}</span>
                </div>
                <div class="conversation-meta">
                    <span class="message-count">${conversation.messages.length} messages</span>
                    ${conversation.unreadCount > 0 ? `<span class="unread-badge">${conversation.unreadCount}</span>` : ''}
                </div>
            </div>
            <div class="conversation-preview">
                <span class="last-message">${this.escapeHtml(preview)}</span>
                <span class="last-time">${lastMessageTime}</span>
            </div>
        `;

        return itemEl;
    }

    /**
     * Update message read status
     * @param {string} messageId - Message ID
     * @param {boolean} isRead - Read status
     */
    updateReadStatus(messageId, isRead) {
        const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageEl) {
            if (isRead) {
                messageEl.classList.remove('unread');
                const unreadIndicator = messageEl.querySelector('.unread-indicator');
                if (unreadIndicator) {
                    unreadIndicator.remove();
                }
            } else {
                messageEl.classList.add('unread');
                const header = messageEl.querySelector('.message-header');
                if (header && !header.querySelector('.unread-indicator')) {
                    header.insertAdjacentHTML('beforeend', '<span class="unread-indicator">●</span>');
                }
            }
        }

        // Update cache
        const message = this.messageCache.get(messageId);
        if (message) {
            message.isRead = isRead;
        }
    }

    /**
     * Add new message to conversation
     * @param {Object} message - New message data
     * @param {boolean} isAdmin - Whether current user is admin
     * @param {HTMLElement} container - Container to add message to
     */
    addMessage(message, isAdmin, container) {
        const messageEl = this.renderMessage(message, isAdmin);
        container.appendChild(messageEl);

        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    }

    /**
     * Update existing message
     * @param {string} messageId - Message ID
     * @param {string} newContent - New message content
     */
    updateMessage(messageId, newContent) {
        const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageEl) {
            const contentEl = messageEl.querySelector('.message-content');
            if (contentEl) {
                contentEl.textContent = newContent;
            }
        }

        // Update cache
        const message = this.messageCache.get(messageId);
        if (message) {
            message.message = newContent;
            message.updatedAt = new Date();
        }
    }

    /**
     * Remove message from DOM
     * @param {string} messageId - Message ID
     */
    removeMessage(messageId) {
        const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageEl) {
            messageEl.remove();
        }

        // Remove from cache
        this.messageCache.delete(messageId);
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} - Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Format message timestamp
     * @param {string|Date} timestamp - Timestamp to format
     * @returns {string} - Formatted timestamp
     */
    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return date.toLocaleTimeString();
        } else if (diffDays === 1) {
            return 'Yesterday ' + date.toLocaleTimeString();
        } else if (diffDays < 7) {
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        } else {
            return date.toLocaleString();
        }
    }

    /**
     * Clear message cache
     */
    clearCache() {
        this.messageCache.clear();
    }
}

// Export for use in other modules
window.MessageComponent = MessageComponent;
