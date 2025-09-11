class PromptHistoryService {
    constructor() {
        this.promptHistory = [];
        this.currentPage = 0;
        this.pageSize = 10;
        this.hasMore = true;
        this.isLoading = false;
        this.container = null;
        this.loadMoreButton = null;
    }

    /**
     * Initialize the prompt history service
     * @param {string} containerId - ID of the container element
     */
    init(containerId = 'prompt-history') {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.warn('⚠️ PROMPT HISTORY: Container not found:', containerId);

            return;
        }

        console.log('🔍 PROMPT HISTORY: Initializing service');
        this.setupLoadMoreButton();
        this.setupEventListeners();
        this.loadInitialPrompts();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for image generation events to add prompts to history
        window.addEventListener('imageGenerated', event => {
            this.handleImageGenerated(event);
        });

        console.log('🔍 PROMPT HISTORY: Event listeners setup');
    }

    /**
     * Handle image generated event
     * @param {CustomEvent} event - Image generated event
     */
    handleImageGenerated(event) {
        const { imageData } = event.detail;

        if (!imageData || !this.isUserLoggedIn()) {
            return;
        }

        console.log('🔍 PROMPT HISTORY: Image generated, adding prompt to history');

        // Create prompt object from image data
        const promptData = {
            id: `temp_${Date.now()}`, // Temporary ID until we get the real one
            prompt: imageData.prompt || imageData.original,
            original: imageData.original || imageData.prompt,
            provider: imageData.provider || 'unknown',
            guidance: imageData.guidance || 10,
            createdAt: new Date().toISOString()
        };

        // Add to history immediately for better UX
        this.addPrompt(promptData);
    }

    /**
     * Setup the load more button
     */
    setupLoadMoreButton() {
        // Create load more button
        this.loadMoreButton = document.createElement('button');
        this.loadMoreButton.textContent = 'Load More Prompts';
        this.loadMoreButton.className = 'load-more-prompts-btn bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors mt-3 w-full';
        this.loadMoreButton.style.display = 'none';

        // Add click event listener
        this.loadMoreButton.addEventListener('click', () => {
            this.loadMorePrompts();
        });

        // Append to container
        this.container.appendChild(this.loadMoreButton);
    }

    /**
     * Load initial prompts (first page)
     */
    async loadInitialPrompts() {
        if (!this.isUserLoggedIn()) {
            console.log('🔍 PROMPT HISTORY: User not logged in, skipping prompt history');

            return;
        }

        console.log('🔍 PROMPT HISTORY: Loading initial prompts');
        this.currentPage = 0;
        this.promptHistory = [];
        await this.loadMorePrompts();
    }

    /**
     * Load more prompts (next page)
     */
    async loadMorePrompts() {
        if (this.isLoading || !this.hasMore) {
            return;
        }

        this.isLoading = true;
        this.updateLoadMoreButton('Loading...', true);

        try {
            console.log('🔍 PROMPT HISTORY: Loading page', this.currentPage);

            const response = await fetch(`/api/prompts?limit=${this.pageSize}&page=${this.currentPage}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.getAuthToken()}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            if (result.success && result.data) {
                const { prompts, pagination } = result.data;

                console.log('🔍 PROMPT HISTORY: Loaded prompts:', {
                    count: prompts.length,
                    total: pagination.total,
                    hasMore: pagination.hasMore,
                    page: pagination.page
                });

                // Add new prompts to history
                this.promptHistory.push(...prompts);
                this.hasMore = pagination.hasMore;
                this.currentPage++;

                // Render prompts
                this.renderPrompts(prompts);

                // Update load more button
                this.updateLoadMoreButton();
            } else {
                throw new Error(result.error?.message || 'Failed to load prompts');
            }

        } catch (error) {
            console.error('❌ PROMPT HISTORY: Failed to load prompts:', error);
            this.updateLoadMoreButton('Error loading prompts', false);
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Render prompts to the DOM
     * @param {Array} prompts - Array of prompt objects
     */
    renderPrompts(prompts) {
        if (!this.container) {
            return;
        }

        prompts.forEach(prompt => {
            const promptElement = this.createPromptElement(prompt);

            this.container.insertBefore(promptElement, this.loadMoreButton);
        });
    }

    /**
     * Create a prompt element
     * @param {Object} prompt - Prompt object
     * @returns {HTMLElement} Prompt element
     */
    createPromptElement(prompt) {
        const promptDiv = document.createElement('div');

        promptDiv.className = 'prompt-item bg-gray-800 p-3 rounded border border-gray-700 hover:border-gray-600 transition-colors cursor-pointer';
        promptDiv.dataset.promptId = prompt.id;

        // Format date
        const date = new Date(prompt.createdAt);
        const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

        // Truncate prompt text
        const truncatedPrompt = prompt.prompt.length > 100 ?
            `${prompt.prompt.substring(0, 100)}...` :
            prompt.prompt;

        promptDiv.innerHTML = `
            <div class="prompt-text text-white text-sm mb-2" title="${prompt.prompt.replace(/"/g, '&quot;')}">
                ${truncatedPrompt}
            </div>
            <div class="prompt-meta text-gray-400 text-xs flex justify-between items-center">
                <span class="provider">${prompt.provider}</span>
                <span class="date">${formattedDate}</span>
            </div>
        `;

        // Add click event to fill prompt
        promptDiv.addEventListener('click', () => {
            this.selectPrompt(prompt);
        });

        return promptDiv;
    }

    /**
     * Select a prompt and fill it in the textarea
     * @param {Object} prompt - Prompt object
     */
    selectPrompt(prompt) {
        const textarea = document.getElementById('prompt-textarea');

        if (textarea) {
            textarea.value = prompt.prompt;
            textarea.dispatchEvent(new Event('input', { bubbles: true }));

            // Scroll to top of page
            window.scrollTo({ top: 0, behavior: 'smooth' });

            console.log('🔍 PROMPT HISTORY: Selected prompt:', prompt.id);
        }
    }

    /**
     * Update the load more button state
     * @param {string} text - Button text
     * @param {boolean} disabled - Whether button is disabled
     */
    updateLoadMoreButton(text = null, disabled = false) {
        if (!this.loadMoreButton) {
            return;
        }

        if (text) {
            this.loadMoreButton.textContent = text;
        } else if (!this.hasMore) {
            this.loadMoreButton.textContent = 'No more prompts';
            this.loadMoreButton.disabled = true;
            this.loadMoreButton.style.display = 'none';
        } else {
            this.loadMoreButton.textContent = 'Load More Prompts';
            this.loadMoreButton.disabled = false;
            this.loadMoreButton.style.display = 'block';
        }

        this.loadMoreButton.disabled = disabled || this.isLoading;
    }

    /**
     * Add a new prompt to the history (for real-time updates)
     * @param {Object} prompt - Prompt object
     */
    addPrompt(prompt) {
        this.promptHistory.unshift(prompt);

        // If we have a container, add the prompt to the top
        if (this.container) {
            const promptElement = this.createPromptElement(prompt);

            this.container.insertBefore(promptElement, this.container.firstChild);
        }
    }

    /**
     * Get the current prompt history
     * @returns {Array} Array of prompts
     */
    getPromptHistory() {
        return this.promptHistory;
    }

    /**
     * Check if user is logged in
     * @returns {boolean} True if user is logged in
     */
    isUserLoggedIn() {
        try {
            return !!(window.userApi && window.userApi.isAuthenticated && window.userApi.isAuthenticated());
        } catch (error) {
            console.warn('⚠️ PROMPT HISTORY: Error checking authentication:', error);

            return false;
        }
    }

    /**
     * Get authentication token
     * @returns {string|null} Auth token or null
     */
    getAuthToken() {
        try {
            return window.userApi?.getAuthToken?.() || null;
        } catch (error) {
            console.warn('⚠️ PROMPT HISTORY: Error getting auth token:', error);

            return null;
        }
    }

    /**
     * Clear the prompt history
     */
    clearHistory() {
        this.promptHistory = [];
        this.currentPage = 0;
        this.hasMore = true;

        if (this.container) {
            // Remove all prompt elements but keep the load more button
            const promptElements = this.container.querySelectorAll('.prompt-item');

            promptElements.forEach(element => element.remove());
        }
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.PromptHistoryService = PromptHistoryService;
}
