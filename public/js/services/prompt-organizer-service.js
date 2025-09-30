/**
 * Prompt Organizer Service
 *
 * Handles the magic button functionality to organize user prompts
 * by subject, style, details, and keywords with proper formatting
 */

class PromptOrganizerService {
    constructor() {
        this.isProcessing = false;
        this.init();
    }

    init() {
        this.attachMagicButtonHandler();
    }

    attachMagicButtonHandler() {
        const magicButton = document.querySelector('.btn-magic');

        if (magicButton) {
            magicButton.addEventListener('click', () => {
                this.organizePrompt();
            });
        }
    }

    async organizePrompt() {
        if (this.isProcessing) {
            return;
        }

        // Check if AI chat is processing
        if (window.aiChatWidget && window.aiChatWidget.isLoading) {
            this.showNotification('AI chat is currently processing. Please wait.', 'warning');
            return;
        }

        const textarea = document.getElementById('prompt-textarea');
        const startButton = document.querySelector('.btn-generate');

        if (!textarea || !startButton) {
            console.error('Required elements not found');
            return;
        }

        const currentPrompt = textarea.value.trim();

        if (!currentPrompt) {
            this.showNotification('Please enter a prompt to organize', 'warning');
            return;
        }

        try {
            this.setProcessingState(true);
            this.showNotification('Organizing your prompt...', 'info');

            const organizedPrompt = await this.sendToOrganizer(currentPrompt);

            if (organizedPrompt) {
                textarea.value = organizedPrompt;
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
                this.showNotification('Prompt organized successfully!', 'success');
            } else {
                this.showNotification('Failed to organize prompt', 'error');
            }

        } catch (error) {
            console.error('Prompt organization error:', error);

            // Provide specific error messages based on error type
            let errorMessage = 'Error organizing prompt. Please try again.';

            if (error.message.includes('AI service temporarily unavailable')) {
                errorMessage = 'AI service is temporarily unavailable. Please try again in a few minutes.';
            } else if (error.message.includes('Authentication required')) {
                errorMessage = 'Please log in to use the prompt organizer.';
            } else if (error.message.includes('API error: 401')) {
                errorMessage = 'Authentication required. Please log in and try again.';
            } else if (error.message.includes('API error: 500')) {
                errorMessage = 'Server error. Please try again later.';
            } else if (error.message.includes('Failed to fetch')) {
                errorMessage = 'Network error. Please check your connection.';
            } else if (error.message.includes('No organized prompt')) {
                errorMessage = 'Failed to organize prompt. Please try again.';
            }

            this.showNotification(errorMessage, 'error');
        } finally {
            this.setProcessingState(false);
        }
    }

    async sendToOrganizer(prompt) {
        try {
            const response = await fetch('/api/organize-prompt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                },
                body: JSON.stringify({
                    prompt,
                    context: {
                        timestamp: new Date().toISOString(),
                        userAgent: navigator.userAgent
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `API error: ${response.status}`);
            }

            const result = await response.json();

            if (!result.organizedPrompt) {
                throw new Error('No organized prompt received from server');
            }

            return result.organizedPrompt;
        } catch (error) {
            console.error('Send to organizer error:', error);

            // Provide more specific error messages based on error type
            if (error.message.includes('503') || error.message.includes('AI service temporarily unavailable')) {
                throw new Error('AI service temporarily unavailable. Please try again later.');
            } else if (error.message.includes('401')) {
                throw new Error('Authentication required. Please log in and try again.');
            } else if (error.message.includes('500')) {
                throw new Error('Server error. Please try again later.');
            } else if (error.message.includes('Failed to fetch')) {
                throw new Error('Network error. Please check your connection.');
            }

            throw error;
        }
    }

    setProcessingState(processing) {
        this.isProcessing = processing;

        const textarea = document.getElementById('prompt-textarea');
        const startButton = document.querySelector('.btn-generate');
        const magicButton = document.querySelector('.btn-magic');

        if (textarea) {
            textarea.disabled = processing;
        }

        if (startButton) {
            startButton.disabled = processing;
            if (processing) {
                startButton.textContent = 'ORGANIZING...';
                startButton.classList.add('opacity-50', 'cursor-not-allowed');
            } else {
                startButton.textContent = 'START';
                startButton.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        }

        if (magicButton) {
            magicButton.disabled = processing;
            if (processing) {
                magicButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                magicButton.classList.add('opacity-50', 'cursor-not-allowed');
            } else {
                magicButton.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i>';
                magicButton.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        }
    }

    /**
     * Check if the service is available (not processing)
     */
    isAvailable() {
        return !this.isProcessing;
    }

    getAuthToken() {
        return window.AdminAuthUtils?.getAuthToken() ||
               localStorage.getItem('authToken') ||
               sessionStorage.getItem('authToken') ||
               document.querySelector('meta[name="auth-token"]')?.content || '';
    }

    showNotification(message, type = 'info') {
        // Use the main notification service if available, otherwise fallback to custom
        if (window.notificationService) {
            window.notificationService.show(message, type, 4000, true);
        } else {
            // Fallback to custom notification
            const existingNotifications = document.querySelectorAll('.prompt-organizer-notification');
            existingNotifications.forEach(notification => notification.remove());

            const notification = document.createElement('div');
            notification.className = `prompt-organizer-notification fixed top-4 right-4 p-3 rounded-lg shadow-lg z-50 ${
                type === 'success' ? 'bg-green-500 text-white' :
                type === 'error' ? 'bg-red-500 text-white' :
                type === 'warning' ? 'bg-yellow-500 text-white' :
                'bg-blue-500 text-white'
            }`;

            notification.textContent = message;
            document.body.appendChild(notification);

            // Auto-remove after 4 seconds
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 4000);
        }
    }
}

// Initialize the service when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.promptOrganizerService = new PromptOrganizerService();
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PromptOrganizerService;
}
