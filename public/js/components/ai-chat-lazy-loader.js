/**
 * AI Chat Widget Lazy Loader
 *
 * This component provides lazy loading for the AI chat widget.
 * The widget and its dependencies are only loaded when the user clicks to open it.
 * This improves performance for the 90% of users who never use the chat feature.
 */

class AIChatLazyLoader {
    constructor() {
        this.isLoaded = false;
        this.isLoading = false;
        this.widget = null;
        this.toggleButton = null;
        this.originalWidget = null;

        this.init();
    }

    init() {
        this.createPlaceholderButton();
        this.attachClickHandler();
    }

    /**
     * Create a lightweight placeholder button that looks like the chat widget
     */
    createPlaceholderButton() {
        // Create the main widget container (lightweight placeholder)
        this.widget = document.createElement('div');
        this.widget.id = 'ai-chat-widget-placeholder';
        this.widget.className = 'ai-chat-widget fixed bottom-4 right-4 z-50 transition-all duration-300';

        this.widget.innerHTML = `
            <!-- Chat Toggle Button (Placeholder) -->
            <button id="ai-chat-toggle-placeholder"
                    class="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-colors">
                <i class="fas fa-robot text-xl"></i>
            </button>
        `;

        // Append to body
        document.body.appendChild(this.widget);

        // Get reference to the toggle button
        this.toggleButton = document.getElementById('ai-chat-toggle-placeholder');
    }

    /**
     * Attach click handler to the placeholder button
     */
    attachClickHandler() {
        this.toggleButton.addEventListener('click', () => {
            this.loadChatWidget();
        });
    }

    /**
     * Load the actual chat widget and its dependencies
     */
    async loadChatWidget() {
        if (this.isLoaded || this.isLoading) {
            return;
        }

        this.isLoading = true;
        this.showLoadingState();

        try {
            // Load CSS dynamically
            await this.loadCSS();

            // Load the chat widget script
            await this.loadScript();

            // Initialize the actual widget
            await this.initializeWidget();

            this.isLoaded = true;
            this.hideLoadingState();


        } catch (error) {
            console.error('❌ Failed to load AI Chat Widget:', error);
            this.showErrorState();
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Load the chat widget CSS dynamically
     */
    async loadCSS() {
        return new Promise((resolve, reject) => {
            // Check if CSS is already loaded
            if (document.querySelector('link[href*="ai-chat-widget.css"]')) {
                resolve();

                return;
            }

            const link = document.createElement('link');

            link.rel = 'stylesheet';
            link.href = 'css/ai-chat-widget.css';
            link.onload = resolve;
            link.onerror = reject;

            document.head.appendChild(link);
        });
    }

    /**
     * Load the chat widget script dynamically
     */
    async loadScript() {
        return new Promise((resolve, reject) => {
            // Check if script is already loaded
            if (window.AIChatWidget) {
                resolve();

                return;
            }

            const script = document.createElement('script');

            script.src = 'js/components/ai-chat-widget.js';
            script.onload = () => {
                // Give the script a moment to execute and set up the global
                setTimeout(() => {
                    if (window.AIChatWidget) {
                        resolve();
                    } else {
                        reject(new Error('AIChatWidget class not found after script load'));
                    }
                }, 100);
            };
            script.onerror = reject;

            document.head.appendChild(script);
        });
    }

    /**
     * Initialize the actual chat widget
     */
    async initializeWidget() {
        // The script loading should have already made AIChatWidget available
        if (!window.AIChatWidget) {
            throw new Error('AIChatWidget class not available after loading script');
        }

        // Remove the placeholder
        this.widget.remove();

        // Create the actual widget instance
        this.originalWidget = new window.AIChatWidget();

        // Store reference globally for consistency
        window.aiChatWidget = this.originalWidget;

    }

    /**
     * Show loading state on the button
     */
    showLoadingState() {
        this.toggleButton.innerHTML = '<i class="fas fa-spinner fa-spin text-xl"></i>';
        this.toggleButton.disabled = true;
        this.toggleButton.classList.add('opacity-75');
    }

    /**
     * Hide loading state
     */
    hideLoadingState() {
        // This will be replaced by the actual widget, so no need to restore
    }

    /**
     * Show error state
     */
    showErrorState() {
        this.toggleButton.innerHTML = '<i class="fas fa-exclamation-triangle text-xl"></i>';
        this.toggleButton.title = 'Failed to load chat widget. Click to retry.';

        // Allow retry on click
        this.toggleButton.disabled = false;
        this.toggleButton.classList.remove('opacity-75');
    }
}

// Initialize the lazy loader when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.aiChatLazyLoader = new AIChatLazyLoader();
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIChatLazyLoader;
}
