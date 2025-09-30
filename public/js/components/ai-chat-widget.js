/**
 * AI Chat Widget - Multi-featured AI Assistant
 *
 * Features:
 * - Independent and reusable across all pages
 * - Access to textarea and image contents
 * - Display images in chat
 * - Interactive buttons that trigger new messages
 * - Captures all form data dynamically
 * - Real-time user context (username, credits)
 */

class AIChatWidget {
    constructor() {
        this.isOpen = false;
        this.messages = [];
        this.isLoading = false;
        this.widget = null;
        this.messagesContainer = null;
        this.inputField = null;
        this.sendButton = null;
        this.conversationId = null;

        // History management
        this.historyLoaded = false;
        this.hasMoreHistory = true;
        this.isLoadingHistory = false;
        this.historyPage = 0;
        this.historyLimit = 5;

        this.init();
    }

    init() {
        this.createWidget();
        this.attachEventListeners();
        this.loadUserContext();
        this.loadChatHistory();
    }

    /**
     * Clear invalid conversation ID from localStorage
     */
    clearInvalidConversation() {
        console.log('🧹 [CHAT WIDGET] Clearing invalid conversation ID...');
        localStorage.removeItem('ai-chat-conversation-id');
        this.conversationId = null;
        this.historyLoaded = false;
        this.historyPage = 0;
        this.hasMoreHistory = false;

        // Clear any existing history messages from DOM
        const historyMessages = this.messagesContainer.querySelectorAll('.ai-history-messages');

        historyMessages.forEach(msg => msg.remove());

        // Show welcome message
        const welcomeMessage = this.messagesContainer.querySelector('.ai-welcome-message');

        if (welcomeMessage) {
            welcomeMessage.style.display = 'block';
        }

        console.log('✅ [CHAT WIDGET] Invalid conversation ID cleared');
    }

    createWidget() {
        // Create the main widget container
        this.widget = document.createElement('div');
        this.widget.id = 'ai-chat-widget';
        this.widget.className = 'ai-chat-widget fixed bottom-4 right-4 z-50 transition-all duration-300';

        this.widget.innerHTML = `
            <!-- Chat Toggle Button -->
            <button id="ai-chat-toggle"
                    class="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-colors">
                <i class="fas fa-robot text-xl"></i>
            </button>

            <!-- Chat Panel -->
            <div id="ai-chat-panel"
                 class="ai-chat-panel hidden bg-white rounded-lg shadow-xl border border-gray-200 w-96 h-96 flex flex-col">
                <!-- Chat Header -->
                <div class="ai-chat-header bg-gray-800 text-white p-3 rounded-t-lg flex justify-between items-center">
                    <div class="flex items-center gap-2">
                        <i class="fas fa-robot"></i>
                        <span class="font-semibold">AI Assistant</span>
                    </div>
                    <button id="ai-chat-close" class="text-gray-300 hover:text-white">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <!-- Messages Container -->
                <div id="ai-chat-messages" class="ai-chat-messages flex-1 p-3 overflow-y-auto bg-gray-50">
                    <div class="ai-welcome-message text-center text-gray-600 py-4">
                        <i class="fas fa-robot text-2xl mb-2"></i>
                        <p>Hi! I'm your AI assistant. I can help you with image generation, prompts, and more!</p>
                    </div>
                </div>

                <!-- Chat Input -->
                <div class="ai-chat-input p-3 border-t border-gray-200 bg-white rounded-b-lg">
                    <div class="flex gap-2">
                        <input
                            type="text"
                            id="ai-chat-input"
                            placeholder="Ask me anything..."
                            class="flex-1 px-3 py-2 border border-gray-300 rounded-lg
                                   focus:outline-none focus:ring-2 focus:ring-blue-500"
                            maxlength="500"
                        />
                        <button
                            id="ai-chat-send"
                            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg
                                   transition-colors disabled:opacity-50"
                        >
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Append to body
        document.body.appendChild(this.widget);

        // Get references to elements
        this.messagesContainer = document.getElementById('ai-chat-messages');
        this.inputField = document.getElementById('ai-chat-input');
        this.sendButton = document.getElementById('ai-chat-send');
    }

    attachEventListeners() {
        // Toggle chat
        document.getElementById('ai-chat-toggle').addEventListener('click', () => {
            this.toggleChat();
        });

        // Close chat
        document.getElementById('ai-chat-close').addEventListener('click', () => {
            this.closeChat();
        });

        // Send message
        this.sendButton.addEventListener('click', () => {
            this.sendMessage();
        });

        // Enter key to send
        this.inputField.addEventListener('keypress', e => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Auto-resize input
        this.inputField.addEventListener('input', () => {
            this.inputField.style.height = 'auto';
            this.inputField.style.height = `${this.inputField.scrollHeight}px`;
        });

        // Setup infinite scroll for history
        this.setupInfiniteScroll();
    }

    toggleChat() {
        this.isOpen = !this.isOpen;
        const panel = document.getElementById('ai-chat-panel');

        if (this.isOpen) {
            panel.classList.remove('hidden');
            this.inputField.focus();
            this.loadUserContext(); // Refresh user context when opening
        } else {
            panel.classList.add('hidden');
        }
    }

    closeChat() {
        this.isOpen = false;
        document.getElementById('ai-chat-panel').classList.add('hidden');
    }

    async sendMessage() {
        const message = this.inputField.value.trim();

        if (!message || this.isLoading) {
            return;
        }

        // Check if prompt organizer is processing
        if (window.promptOrganizerService && window.promptOrganizerService.isProcessing) {
            this.showNotification(
                'Prompt organizer is currently processing. Please wait.',
                'warning'
            );

            return;
        }

        // Add user message to chat
        this.addMessage('user', message);
        this.inputField.value = '';
        this.setLoading(true);

        try {
            // Gather all form data and context
            const contextData = this.gatherContextData();

            // Send to AI chat API
            const response = await this.sendToAI(message, contextData);

            // Display AI response
            this.displayAIResponse(response);

            // Handle new prompt if provided
            if (response.newPrompt) {
                this.handleNewPrompt(response.newPrompt);
            }

        } catch (error) {
            console.error('AI Chat Error:', error);
            this.addMessage('ai', 'Sorry, I encountered an error. Please try again.');
        } finally {
            this.setLoading(false);
        }
    }

    gatherContextData() {
        const context = {
            // User context
            user: {
                username: this.getUserData('username'),
                creditBalance: this.getUserData('creditBalance')
            },

            // Form data
            formData: {
                prompt: this.getTextareaValue(),
                mashup: this.getCheckboxValue('mashup'),
                mixup: this.getCheckboxValue('mixup'),
                multiplier: this.getCheckboxValue('multiplier'),
                autoEnhance: this.getCheckboxValue('auto-enhance'),
                autoGenerate: this.getCheckboxValue('auto-generate'),
                autoDownload: this.getCheckboxValue('auto-download'),
                autoPublic: this.getSelectValue('owner') === 'site',
                guidance: this.getGuidanceValue(),
                maxNum: this.getInputValue('maxNum')
            },

            // Model selections
            models: this.getSelectedModels(),

            // Current images
            images: this.getCurrentImages(),

            // Additional context
            pageContext: {
                url: window.location.href,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent
            }
        };

        // AI Chat Context Data gathered

        return context;
    }

    getUserData(field) {
        // Try to get from various sources
        const userElement = document.querySelector('[data-username]') ||
                           document.querySelector('.user-info') ||
                           document.querySelector('#user-info');

        if (userElement) {
            return userElement.dataset[field] || userElement.textContent;
        }

        // Fallback to localStorage or sessionStorage
        return localStorage.getItem(field) || sessionStorage.getItem(field) || 'Unknown';
    }

    getTextareaValue() {
        const textarea = document.getElementById('prompt-textarea');

        return textarea ? textarea.value : '';
    }

    getCheckboxValue(name) {
        const checkbox = document.querySelector(`input[name="${name}"]`);

        return checkbox ? checkbox.checked : false;
    }

    getSelectValue(name) {
        const select = document.querySelector(`select[name="${name}"]`);

        return select ? select.value : '';
    }

    getInputValue(name) {
        const input = document.querySelector(`input[name="${name}"], input[id="${name}"]`);

        return input ? input.value : '';
    }

    getGuidanceValue() {
        const guidanceInput = document.querySelector('input[name="guidance"], input[id="guidance"]');

        return guidanceInput ? parseInt(guidanceInput.value) || 7.5 : 7.5;
    }

    getSelectedModels() {
        const modelCheckboxes = document.querySelectorAll('input[name="models"]:checked, input[type="checkbox"][name*="model"]:checked');

        return Array.from(modelCheckboxes).map(cb => ({
            name: cb.value || cb.name,
            checked: cb.checked
        }));
    }

    getCurrentImages() {
        const imageContainer = document.getElementById('image-container-main');

        if (!imageContainer) {
            return [];
        }

        const images = imageContainer.querySelectorAll('img');

        return Array.from(images).map(img => ({
            src: img.src,
            alt: img.alt,
            width: img.width,
            height: img.height
        }));
    }

    async sendToAI(message, contextData) {
        const response = await fetch('/api/ai-chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.getAuthToken()}`
            },
            body: JSON.stringify({
                message,
                context: contextData,
                conversationId: this.conversationId
            })
        });

        if (!response.ok) {
            throw new Error(`AI Chat API error: ${response.status}`);
        }

        const result = await response.json();

        // Store conversation ID for future messages
        if (!this.conversationId && result.conversationId) {
            this.conversationId = result.conversationId;
            // Save to localStorage for persistence
            localStorage.setItem('ai-chat-conversation-id', this.conversationId);
        }

        return result;
    }

    getAuthToken() {
        // Try to get auth token from various sources
        return localStorage.getItem('authToken') ||
               sessionStorage.getItem('authToken') ||
               document.querySelector('meta[name="auth-token"]')?.content || '';
    }

    displayAIResponse(response) {
        // Display response text
        if (response.response) {
            this.addMessage('ai', response.response);
        }

        // Display images if any
        if (response.images && response.images.length > 0) {
            response.images.forEach(image => {
                this.addImageMessage(image);
            });
        }

        // Display buttons if any
        if (response.buttons && response.buttons.length > 0) {
            this.addButtonMessage(response.buttons);
        }
    }

    addMessage(sender, content) {
        const messageDiv = document.createElement('div');

        messageDiv.className = `ai-message mb-3 ${sender === 'user' ? 'text-right' : 'text-left'}`;

        const bubbleClass = sender === 'user'
            ? 'bg-blue-600 text-white inline-block px-4 py-2 rounded-lg max-w-xs'
            : 'bg-white border border-gray-200 inline-block px-4 py-2 rounded-lg max-w-xs shadow-sm';

        messageDiv.innerHTML = `
            <div class="${bubbleClass}">
                <div class="text-sm">${this.escapeHtml(content)}</div>
                <div class="text-xs opacity-70 mt-1">${new Date().toLocaleTimeString()}</div>
            </div>
        `;

        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    addImageMessage(image) {
        const messageDiv = document.createElement('div');

        messageDiv.className = 'ai-message mb-3 text-left';

        messageDiv.innerHTML = `
            <div class="bg-white border border-gray-200 inline-block px-4 py-2 rounded-lg max-w-xs shadow-sm">
                <img src="${image.src || image.url}" alt="${image.alt || 'AI Generated Image'}"
                     class="max-w-full h-auto rounded" style="max-height: 200px;">
                <div class="text-xs text-gray-500 mt-1">${new Date().toLocaleTimeString()}</div>
            </div>
        `;

        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    addButtonMessage(buttons) {
        const messageDiv = document.createElement('div');

        messageDiv.className = 'ai-message mb-3 text-left';

        const buttonHtml = buttons.map(button => `<button class="ai-chat-button bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-1 rounded text-sm mr-2 mb-2 transition-colors"
                     data-action="${button.action}"
                     data-value="${button.value || ''}"
                     data-prompt="${button.prompt || ''}">
                ${button.text}
             </button>`
        ).join('');

        messageDiv.innerHTML = `
            <div class="bg-white border border-gray-200 inline-block px-4 py-2 rounded-lg max-w-xs shadow-sm">
                <div class="text-sm mb-2">Quick actions:</div>
                <div class="button-container">${buttonHtml}</div>
                <div class="text-xs text-gray-500 mt-1">${new Date().toLocaleTimeString()}</div>
            </div>
        `;

        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();

        // Add click handlers for buttons
        messageDiv.querySelectorAll('.ai-chat-button').forEach(button => {
            button.addEventListener('click', () => {
                this.handleButtonClick(button);
            });
        });
    }

    handleButtonClick(button) {
        const { action, value, prompt } = button.dataset;

        console.log('🔘 AI Chat Button Clicked:', { action, value, prompt });

        // Handle different button actions
        switch (action) {
            case 'generate':
                this.triggerImageGeneration(value);
                break;
            case 'enhance':
                this.enhancePrompt(value);
                break;
            case 'suggest':
                this.suggestPrompt(value);
                break;
            case 'clear':
                this.clearForm();
                break;
            case 'use_prompt':
                this.handleNewPrompt(value);
                break;
            case 'select_model':
                this.selectModel(value);
                break;
            case 'toggle_feature':
                this.toggleFeature(value);
                break;
            case 'settings':
                this.showSettings();
                break;
            case 'ai_prompt':
                // Handle AI-generated prompts (one-click prompts back to AI)
                this.sendAIPrompt(prompt);
                break;
            default:
                console.log('Unknown button action:', action);
        }
    }

    triggerImageGeneration(prompt) {
        if (prompt) {
            const textarea = document.getElementById('prompt-textarea');

            if (textarea) {
                textarea.value = prompt;
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }

        // Trigger generation
        const generateButton = document.querySelector('button[type="submit"], .generate-button, #generate-btn');

        if (generateButton) {
            generateButton.click();
        }
    }

    enhancePrompt(enhancement) {
        const textarea = document.getElementById('prompt-textarea');

        if (textarea && enhancement) {
            textarea.value = enhancement;
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    suggestPrompt(suggestion) {
        const textarea = document.getElementById('prompt-textarea');

        if (textarea && suggestion) {
            textarea.value = suggestion;
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    clearForm() {
        const textarea = document.getElementById('prompt-textarea');

        if (textarea) {
            textarea.value = '';
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    selectModel(modelName) {
        // Find and select the model checkbox
        const modelCheckbox = document.querySelector(`input[name="models"][value="${modelName}"]`);

        if (modelCheckbox) {
            modelCheckbox.checked = true;
            modelCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
            this.showNotification(`Switched to ${modelName} model`, 'success');
        }
    }

    toggleFeature(featureName) {
        // Map feature names to form elements
        const featureMap = {
            photogenic: 'auto-enhance',
            mashup: 'mashup',
            mixup: 'mixup',
            'auto-enhance': 'auto-enhance'
        };

        const formName = featureMap[featureName] || featureName;
        const checkbox = document.querySelector(`input[name="${formName}"]`);

        if (checkbox) {
            checkbox.checked = !checkbox.checked;
            checkbox.dispatchEvent(new Event('change', { bubbles: true }));
            this.showNotification(`${featureName} ${checkbox.checked ? 'enabled' : 'disabled'}`, 'success');
        }
    }

    showSettings() {
        // Send a message to the AI asking about current settings
        this.inputField.value = 'show my current settings';
        this.sendMessage();
    }

    sendAIPrompt(prompt) {
        // Send AI-generated prompt back to the AI for further processing
        if (prompt) {
            this.inputField.value = prompt;
            this.sendMessage();
        }
    }

    setLoading(loading) {
        this.isLoading = loading;
        this.sendButton.disabled = loading;
        this.inputField.disabled = loading;

        if (loading) {
            this.sendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        } else {
            this.sendButton.innerHTML = '<i class="fas fa-paper-plane"></i>';
        }
    }

    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    escapeHtml(text) {
        const div = document.createElement('div');

        div.textContent = text;

        return div.innerHTML;
    }

    loadUserContext() {
        // This would be called to refresh user context
        // For now, we'll just log the current context
        const _context = this.gatherContextData();

        // User Context Loaded
    }

    handleNewPrompt(newPrompt) {
        // Update the textarea with the new prompt
        const textarea = document.getElementById('prompt-textarea');

        if (textarea && newPrompt) {
            textarea.value = newPrompt;
            textarea.dispatchEvent(new Event('input', { bubbles: true }));

            // Show a notification
            this.showNotification('New prompt applied!', 'success');
        }
    }

    showNotification(message, type = 'info') {
        // Use the main notification service if available, otherwise fallback to custom
        if (window.notificationService) {
            window.notificationService.show(message, type, 3000, true);
        } else {
            // Fallback to custom notification
            const notification = document.createElement('div');

            let bgColor = 'bg-blue-500 text-white';

            if (type === 'success') {
                bgColor = 'bg-green-500 text-white';
            } else if (type === 'error') {
                bgColor = 'bg-red-500 text-white';
            }

            notification.className = `fixed top-4 right-4 p-3 rounded-lg shadow-lg z-50 ${bgColor}`;
            notification.textContent = message;

            document.body.appendChild(notification);

            // Remove after 3 seconds
            setTimeout(() => {
                notification.remove();
            }, 3000);
        }
    }

    /**
     * Load chat history on widget initialization
     */
    async loadChatHistory() {
        console.log('🔄 [CHAT WIDGET] Loading chat history...', {
            historyLoaded: this.historyLoaded,
            isLoadingHistory: this.isLoadingHistory,
            hasMessagesContainer: !!this.messagesContainer,
            messagesContainerId: this.messagesContainer?.id
        });

        if (this.historyLoaded || this.isLoadingHistory) {
            console.log('⏭️ [CHAT WIDGET] Skipping history load - already loaded or loading');

            return;
        }

        try {
            // Get conversation ID from localStorage or generate new one
            const savedConversationId = localStorage.getItem('ai-chat-conversation-id');

            console.log('💾 [CHAT WIDGET] Saved conversation ID:', savedConversationId);
            console.log('🔍 [CHAT WIDGET] localStorage contents:', {
                conversationId: localStorage.getItem('ai-chat-conversation-id'),
                allKeys: Object.keys(localStorage)
            });

            if (savedConversationId) {
                this.conversationId = savedConversationId;
                console.log('📚 [CHAT WIDGET] Loading history for conversation:', this.conversationId);

                try {
                    await this.loadHistoryPage();
                } catch (error) {
                    console.error('❌ [CHAT WIDGET] Failed to load history for conversation:', this.conversationId);
                    console.error('❌ [CHAT WIDGET] This conversation ID may be invalid or expired');

                    // Clear the invalid conversation ID from localStorage
                    localStorage.removeItem('ai-chat-conversation-id');
                    this.conversationId = null;
                    console.log('🧹 [CHAT WIDGET] Cleared invalid conversation ID from localStorage');
                }
            } else {
                console.log('ℹ️ [CHAT WIDGET] No saved conversation ID found');
            }
        } catch (error) {
            console.error('❌ [CHAT WIDGET] Error loading chat history:', error);
            console.error('❌ [CHAT WIDGET] Error stack:', error.stack);
        } finally {
            this.isLoadingHistory = false;
            this.historyLoaded = true;
            console.log('✅ [CHAT WIDGET] Chat history loading completed');
        }
    }

    /**
     * Load a page of chat history
     */
    async loadHistoryPage() {
        console.log('📄 [CHAT WIDGET] Loading history page:', {
            conversationId: this.conversationId,
            page: this.historyPage,
            limit: this.historyLimit,
            isLoadingHistory: this.isLoadingHistory,
            hasMessagesContainer: !!this.messagesContainer
        });

        if (!this.conversationId || this.isLoadingHistory) {
            console.log('⏭️ [CHAT WIDGET] Skipping history page load - no conversation ID or already loading');

            return;
        }

        this.isLoadingHistory = true;
        this.showHistoryLoadingIndicator();

        try {
            const url = `/api/ai-chat/history/${this.conversationId}?page=${this.historyPage}&limit=${this.historyLimit}`;

            console.log('🌐 [CHAT WIDGET] Fetching history from:', url);
            console.log('🔍 [CHAT WIDGET] Request details:', {
                url,
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            console.log('📡 [CHAT WIDGET] History response status:', response.status);
            console.log('📡 [CHAT WIDGET] Response headers:', Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
                const errorText = await response.text();

                console.error('❌ [CHAT WIDGET] HTTP error response:', errorText);

                // If it's a 404, the conversation doesn't exist
                if (response.status === 404) {
                    console.error('❌ [CHAT WIDGET] Conversation not found (404) - clearing from localStorage');
                    localStorage.removeItem('ai-chat-conversation-id');
                    this.conversationId = null;
                }

                throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
            }

            const data = await response.json();

            console.log('📊 [CHAT WIDGET] History response data:', data);
            console.log('📊 [CHAT WIDGET] Response structure:', {
                hasHistory: !!data.history,
                historyLength: data.history?.length || 0,
                page: data.page,
                limit: data.limit,
                hasMore: data.hasMore
            });

            const history = data.history || [];

            console.log('📚 [CHAT WIDGET] History messages count:', history.length);

            if (history.length === 0) {
                console.log('ℹ️ [CHAT WIDGET] No history messages found');
                this.hasMoreHistory = false;

                // Show welcome message if no history
                const welcomeMessage = this.messagesContainer.querySelector('.ai-welcome-message');

                if (welcomeMessage) {
                    console.log('👋 [CHAT WIDGET] Showing welcome message - no history');
                    welcomeMessage.style.display = 'block';
                }

                return;
            }

            // Add history messages to the beginning of the container
            console.log('➕ [CHAT WIDGET] Adding history messages to chat');
            this.addHistoryMessages(history);

            // Check if we have more history
            this.hasMoreHistory = history.length === this.historyLimit;
            this.historyPage++;
            console.log('📈 [CHAT WIDGET] Updated pagination:', {
                hasMoreHistory: this.hasMoreHistory,
                nextPage: this.historyPage
            });

        } catch (error) {
            console.error('❌ [CHAT WIDGET] Error loading history page:', error);
            console.error('❌ [CHAT WIDGET] Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            this.hasMoreHistory = false;
        } finally {
            this.isLoadingHistory = false;
            this.hideHistoryLoadingIndicator();
            console.log('✅ [CHAT WIDGET] History page loading completed');
        }
    }

    /**
     * Add history messages to the chat
     */
    addHistoryMessages(history) {
        console.log('🎨 [CHAT WIDGET] Adding history messages to DOM:', {
            messageCount: history.length,
            messagesContainer: !!this.messagesContainer,
            messagesContainerId: this.messagesContainer?.id,
            messagesContainerChildren: this.messagesContainer?.children?.length || 0
        });

        if (!this.messagesContainer) {
            console.error('❌ [CHAT WIDGET] Messages container not found!');
            console.error('❌ [CHAT WIDGET] Available elements:', {
                hasWidget: !!document.getElementById('ai-chat-widget'),
                hasPanel: !!document.getElementById('ai-chat-panel'),
                hasMessages: !!document.getElementById('ai-chat-messages')
            });

            return;
        }

        // Hide welcome message when history is loaded
        const welcomeMessage = this.messagesContainer.querySelector('.ai-welcome-message');

        if (welcomeMessage) {
            console.log('🙈 [CHAT WIDGET] Hiding welcome message');
            console.log('🙈 [CHAT WIDGET] Welcome message element:', {
                found: !!welcomeMessage,
                currentDisplay: welcomeMessage.style.display,
                className: welcomeMessage.className
            });
            welcomeMessage.style.display = 'none';
        }

        // Create a temporary container to hold history messages
        const historyContainer = document.createElement('div');

        historyContainer.className = 'ai-history-messages';

        history.forEach((message, index) => {
            console.log(`📝 Processing history message ${index + 1}:`, {
                role: message.role,
                contentLength: message.content?.length || 0,
                createdAt: message.createdAt
            });

            const messageDiv = document.createElement('div');

            messageDiv.className = `ai-message mb-3 ${message.role === 'user' ? 'text-right' : 'text-left'}`;

            const bubbleClass = message.role === 'user'
                ? 'bg-blue-600 text-white inline-block px-4 py-2 rounded-lg max-w-xs'
                : 'bg-white border border-gray-200 inline-block px-4 py-2 rounded-lg max-w-xs shadow-sm';

            const timestamp = new Date(message.createdAt).toLocaleTimeString();

            messageDiv.innerHTML = `
                <div class="${bubbleClass}">
                    <div class="text-sm">${this.escapeHtml(message.content)}</div>
                    <div class="text-xs opacity-70 mt-1">${timestamp}</div>
                </div>
            `;

            historyContainer.appendChild(messageDiv);
        });

        // Insert history messages at the beginning of the messages container
        console.log('📍 Inserting history container into messages container');
        this.messagesContainer.insertBefore(historyContainer, this.messagesContainer.firstChild);

        console.log('✅ History messages added to DOM');
    }

    /**
     * Load more history when scrolling to top
     */
    async loadMoreHistory() {
        if (!this.hasMoreHistory || this.isLoadingHistory) {
            return;
        }

        await this.loadHistoryPage();
    }

    /**
     * Setup infinite scroll for history loading
     */
    setupInfiniteScroll() {
        if (!this.messagesContainer) {
            return;
        }

        this.messagesContainer.addEventListener('scroll', () => {
            // Check if user scrolled to the top
            if (this.messagesContainer.scrollTop === 0 && this.hasMoreHistory && !this.isLoadingHistory) {
                this.loadMoreHistory();
            }
        });
    }

    /**
     * Show history loading indicator
     */
    showHistoryLoadingIndicator() {
        const existingIndicator = document.querySelector('.ai-history-loading');

        if (existingIndicator) {
            return;
        }

        const loadingDiv = document.createElement('div');

        loadingDiv.className = 'ai-history-loading';
        loadingDiv.innerHTML = '<i class="fas fa-spinner"></i> Loading older messages...';

        this.messagesContainer.insertBefore(loadingDiv, this.messagesContainer.firstChild);
    }

    /**
     * Hide history loading indicator
     */
    hideHistoryLoadingIndicator() {
        const indicator = document.querySelector('.ai-history-loading');

        if (indicator) {
            indicator.remove();
        }
    }

}

// Note: Auto-initialization removed for lazy loading
// The widget will be initialized by AIChatLazyLoader when needed
// document.addEventListener('DOMContentLoaded', () => {
//     window.aiChatWidget = new AIChatWidget();
// });

// Export for module systems and global access
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIChatWidget;
}

// Make AIChatWidget available globally for lazy loading
if (typeof window !== 'undefined') {
    window.AIChatWidget = AIChatWidget;
}
