/**
 * Messaging Service - Handles all messaging API calls
 * Provides methods for user and admin messaging functionality
 */
class MessagingService {
    constructor() {
        this.baseUrl = '/api/messages';
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Get user's messages
     * @returns {Promise<Array>} - User's messages
     */
    async getUserMessages() {
        try {
            const headers = {
                'Content-Type': 'application/json'
            };

            // Add JWT token if available (same as other API calls)
            const token = this.getAuthToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${this.baseUrl}/user`, {
                method: 'GET',
                credentials: 'include',
                headers
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Authentication required. Please log in to view messages.');
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.messages || [];
        } catch (error) {
            console.error('Error fetching user messages:', error);
            throw error;
        }
    }

    /**
     * Get admin messages (grouped by user)
     * @returns {Promise<Object>} - Admin messages data
     */
    async getAdminMessages() {
        try {
            const headers = {
                'Content-Type': 'application/json'
            };

            // Add JWT token if available
            const token = this.getAuthToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${this.baseUrl}/admin`, {
                method: 'GET',
                credentials: 'include',
                headers
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return {
                conversations: data.messages || [],
                totalUnread: data.totalUnread || 0
            };
        } catch (error) {
            console.error('Error fetching admin messages:', error);
            throw error;
        }
    }

    /**
     * Send an admin reply to a user's conversation
     * @param {string} message - Message content
     * @param {string} userId - User ID to reply to
     * @returns {Promise<Object>} - Created message
     */
    async sendAdminReply(message, userId) {
        try {
            const headers = {
                'Content-Type': 'application/json'
            };

            // Add JWT token if available
            const token = this.getAuthToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${this.baseUrl}/admin-reply`, {
                method: 'POST',
                credentials: 'include',
                headers,
                body: JSON.stringify({
                    message: message.trim(),
                    userId
                })
            });

            if (!response.ok) {
                const errorData = await response.json();

                // Handle specific error cases
                if (response.status === 429) {
                    throw new Error(`Rate limit exceeded. Please wait ${errorData.retryAfter || 60} seconds before sending another message.`);
                } else if (response.status === 401) {
                    throw new Error('Please log in to send messages.');
                } else if (response.status === 403) {
                    throw new Error('Your account has been suspended. Please contact support.');
                }

                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.message;
        } catch (error) {
            console.error('Error sending admin reply:', error);
            throw error;
        }
    }

    /**
     * Send a new message
     * @param {string} message - Message content
     * @param {string} parentId - Parent message ID (for replies)
     * @param {boolean} isFromUser - Whether message is from user
     * @returns {Promise<Object>} - Created message
     */
    async sendMessage(message, parentId = null, isFromUser = true) {
        try {
            const headers = {
                'Content-Type': 'application/json'
            };

            // Add JWT token if available
            const token = this.getAuthToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(this.baseUrl, {
                method: 'POST',
                credentials: 'include',
                headers,
                body: JSON.stringify({
                    message: message.trim(),
                    parentId,
                    isFromUser
                })
            });

            if (!response.ok) {
                const errorData = await response.json();

                // Handle specific error cases
                if (response.status === 429) {
                    throw new Error(`Rate limit exceeded. Please wait ${errorData.retryAfter || 60} seconds before sending another message.`);
                } else if (response.status === 401) {
                    throw new Error('Please log in to send messages.');
                } else if (response.status === 403) {
                    throw new Error('Your account has been suspended. Please contact support.');
                }

                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.message;
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }

    /**
     * Mark message as read
     * @param {string} messageId - Message ID
     * @param {boolean} isRead - Read status
     * @returns {Promise<Object>} - Updated message
     */
    async markAsRead(messageId, isRead = true) {
        try {
            const headers = {
                'Content-Type': 'application/json'
            };

            // Add JWT token if available
            const token = this.getAuthToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${this.baseUrl}/${messageId}/read`, {
                method: 'PUT',
                credentials: 'include',
                headers,
                body: JSON.stringify({ isRead })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.message;
        } catch (error) {
            console.error('Error marking message as read:', error);
            throw error;
        }
    }

    /**
     * Update message content
     * @param {string} messageId - Message ID
     * @param {string} newContent - New message content
     * @returns {Promise<Object>} - Updated message
     */
    async updateMessage(messageId, newContent) {
        try {
            const headers = {
                'Content-Type': 'application/json'
            };

            // Add JWT token if available
            const token = this.getAuthToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${this.baseUrl}/${messageId}`, {
                method: 'PUT',
                credentials: 'include',
                headers,
                body: JSON.stringify({
                    message: newContent.trim()
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.message;
        } catch (error) {
            console.error('Error updating message:', error);
            throw error;
        }
    }

    /**
     * Delete message
     * @param {string} messageId - Message ID
     * @returns {Promise<Object>} - Deletion result
     */
    async deleteMessage(messageId) {
        try {
            const headers = {
                'Content-Type': 'application/json'
            };

            // Add JWT token if available
            const token = this.getAuthToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${this.baseUrl}/${messageId}`, {
                method: 'DELETE',
                credentials: 'include',
                headers
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error deleting message:', error);
            throw error;
        }
    }

    /**
     * Get message statistics (admin only)
     * @returns {Promise<Object>} - Message statistics
     */
    async getMessageStats() {
        try {
            const headers = {
                'Content-Type': 'application/json'
            };

            // Add JWT token if available
            const token = this.getAuthToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${this.baseUrl}/stats`, {
                method: 'GET',
                credentials: 'include',
                headers
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.stats;
        } catch (error) {
            console.error('Error fetching message stats:', error);
            throw error;
        }
    }

    /**
     * Cache data with expiration
     * @param {string} key - Cache key
     * @param {*} data - Data to cache
     */
    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    /**
     * Get cached data if not expired
     * @param {string} key - Cache key
     * @returns {*} - Cached data or null
     */
    getCache(key) {
        const cached = this.cache.get(key);
        if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Get authentication token (same as API service)
     */
    getAuthToken() {
        // Try localStorage first, then sessionStorage
        return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    }

    /**
     * Validate message content
     * @param {string} message - Message to validate
     * @returns {Object} - Validation result
     */
    validateMessage(message) {
        const errors = [];

        if (!message || message.trim().length === 0) {
            errors.push('Message cannot be empty');
        }

        if (message && message.length > 5000) {
            errors.push('Message too long (max 5000 characters)');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Retry failed request with exponential backoff
     * @param {Function} requestFn - Request function to retry
     * @param {number} maxRetries - Maximum number of retries
     * @returns {Promise} - Request result
     */
    async retryRequest(requestFn, maxRetries = 3) {
        let lastError;

        for (let i = 0; i < maxRetries; i++) {
            try {
                return await requestFn();
            } catch (error) {
                lastError = error;
                if (i < maxRetries - 1) {
                    const delay = Math.pow(2, i) * 1000; // Exponential backoff
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        throw lastError;
    }
}

// Export for use in other modules
window.MessagingService = MessagingService;
