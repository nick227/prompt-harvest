class PromptHistoryService {
    constructor() {
        this.promptHistory = [];
        this.currentPage = 0;
        this.pageSize = 10;
        this.hasMore = true;
        this.isLoading = false;
        this.container = null;
        this.loadMoreButton = null;
        this.authTimeout = null; // For debouncing auth state changes
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

        this.setupLoadMoreButton();
        this.setupEventListeners();

        // Wait for authentication before loading prompts
        this.waitForAuthentication();
    }

    /**
     * Initialize mobile prompt history service
     */
    initMobile() {
        const mobileContainerId = 'mobile-prompt-history';

        this.mobileContainer = document.getElementById(mobileContainerId);

        if (!this.mobileContainer) {
            console.warn('⚠️ PROMPT HISTORY: Mobile container not found:', mobileContainerId);

            return;
        }

        this.setupMobileLoadMoreButton();
    }

    /**
     * Wait for authentication before loading prompts
     */
    waitForAuthentication() {
        // Check if user is already authenticated
        if (this.isUserLoggedIn()) {
            this.loadInitialPrompts();
        } else {
            // Listen for authentication state changes
            window.addEventListener('authStateChanged', this.handleAuthStateChange.bind(this));
        }
    }

    /**
     * Handle authentication state changes
     * @param {CustomEvent} event - Auth state change event
     */
    handleAuthStateChange(event) {

        // Debounce auth state changes to avoid rapid calls
        if (this.authTimeout) {
            clearTimeout(this.authTimeout);
        }

        this.authTimeout = setTimeout(() => {
            if (this.isUserLoggedIn()) {
                this.loadInitialPrompts();
            } else {

                this.clearHistory();
            }
        }, 200);
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
        this.loadMoreButton.className = 'load-more-prompts bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded mt-4 w-full transition-colors';
        this.loadMoreButton.textContent = 'Load More Prompts';
        this.loadMoreButton.addEventListener('click', () => this.loadMorePrompts());

        // Add to container
        this.container.appendChild(this.loadMoreButton);
    }

    /**
     * Setup mobile load more button
     */
    setupMobileLoadMoreButton() {
        // Create mobile load more button
        this.mobileLoadMoreButton = document.createElement('button');
        this.mobileLoadMoreButton.className = 'load-more-prompts bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded mt-4 w-full transition-colors';
        this.mobileLoadMoreButton.textContent = 'Load More Prompts';
        this.mobileLoadMoreButton.addEventListener('click', () => this.loadMorePrompts());

        // Add to mobile container
        this.mobileContainer.appendChild(this.mobileLoadMoreButton);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for image generation events to add prompts to history
        window.addEventListener('imageGenerated', this.handleImageGenerated.bind(this));
    }

    /**
     * Check if user is logged in
     * @returns {boolean} True if user is authenticated
     */
    isUserLoggedIn() {
        // Check if userApi is available and authenticated
        if (window.userApi && window.userApi.isAuthenticated) {
            const isAuth = window.userApi.isAuthenticated();

            return isAuth;
        }

        // Fallback: check for auth token
        const token = this.getAuthToken();
        const hasToken = !!token;

        return hasToken;
    }

    /**
     * Get authentication token
     * @returns {string|null} Auth token if available
     */
    getAuthToken() {
        // Try to get token from userApi first
        if (window.userApi && window.userApi.getAuthToken) {
            const token = window.userApi.getAuthToken();

            if (token) {
                return token;
            }
        }

        // Fallback: check localStorage and sessionStorage
        const localToken = localStorage.getItem('authToken');
        const sessionToken = sessionStorage.getItem('authToken');
        const fallbackToken = localToken || sessionToken;

        return fallbackToken;
    }

    /**
     * Load initial prompts
     */
    async loadInitialPrompts() {

        // Reset state
        this.currentPage = 0;
        this.hasMore = true;
        this.promptHistory = [];

        // Clear existing prompts
        if (this.container) {
            const existingPrompts = this.container.querySelectorAll('.prompt-item');

            existingPrompts.forEach(prompt => prompt.remove());
        }

        if (this.mobileContainer) {
            const existingPrompts = this.mobileContainer.querySelectorAll('.prompt-item');

            existingPrompts.forEach(prompt => prompt.remove());
        }

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
            const result = await this.fetchPromptsFromAPI();

            if (result.success && result.data) {
                this.processPromptResponse(result.data);
            } else if (result.success === false && result.error?.message === 'Not authenticated') {
                this.updateLoadMoreButton('', false);
                this.loadMoreButton.style.display = 'none';
            } else {
                console.error('❌ PROMPT HISTORY: API returned error:', result);
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
     * Fetch prompts from API
     * @returns {Promise<Object>} API response
     */
    async fetchPromptsFromAPI() {

        const authToken = this.getAuthToken();
        const headers = {
            'Content-Type': 'application/json'
        };

        // Only add auth header if user is authenticated
        if (authToken) {
            headers.Authorization = `Bearer ${authToken}`;
        }

        const response = await fetch(`/api/prompts?limit=${this.pageSize}&page=${this.currentPage}`, {
            method: 'GET',
            headers
        });

        if (!response.ok) {
            const errorText = await response.text();

            console.error('❌ PROMPT HISTORY: API error response:', {
                status: response.status,
                statusText: response.statusText,
                errorText
            });

            if (response.status === 401) {

                return { success: false, error: { message: 'Not authenticated' } };
            }

            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        return result;
    }

    /**
     * Process prompt response from API
     * @param {Object} data - API response data
     */
    processPromptResponse(data) {

        const prompts = data.prompts || [];
        const totalPrompts = data.total || 0;
        const totalPages = Math.ceil(totalPrompts / this.pageSize);

        // Add prompts to history
        prompts.forEach(prompt => {
            this.addPrompt(prompt);
        });

        // Show message if no prompts found
        if (prompts.length === 0 && this.currentPage === 0) {
            this.showNoPromptsMessage();
        }

        // Update pagination state
        this.currentPage++;
        this.hasMore = this.currentPage < totalPages;

        // Update load more button
        this.updateLoadMoreButton();

        // Hide load more button if no more prompts
        if (!this.hasMore) {
            this.loadMoreButton.style.display = 'none';
            if (this.mobileLoadMoreButton) {
                this.mobileLoadMoreButton.style.display = 'none';
            }
        }
    }

    /**
     * Add a prompt to the history
     * @param {Object} prompt - Prompt object
     */
    addPrompt(prompt) {

        // Add to internal array
        this.promptHistory.push(prompt);

        // Create and add DOM elements
        const promptElement = this.createPromptElement(prompt);

        if (this.container) {
            // Insert before the load more button
            this.container.insertBefore(promptElement, this.loadMoreButton);
        }

        // Also add to mobile container if it exists
        if (this.mobileContainer) {
            const mobilePromptElement = promptElement.cloneNode(true);

            this.mobileContainer.insertBefore(mobilePromptElement, this.mobileLoadMoreButton);
        }
    }

    /**
     * Render prompts in the container
     * @param {Array} prompts - Array of prompt objects
     */
    renderPrompts(prompts) {

        if (this.container) {
            // Clear existing prompts
            const existingPrompts = this.container.querySelectorAll('.prompt-item');

            existingPrompts.forEach(prompt => prompt.remove());

            // Add new prompts
            prompts.forEach((prompt, index) => {
                const promptElement = this.createPromptElement(prompt);

                this.container.insertBefore(promptElement, this.loadMoreButton);

            });
        }
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

        promptDiv.innerHTML = `
            <div class="prompt-text text-white text-sm mb-2" title="${prompt.prompt.replace(/"/g, '&quot;')}">
                ${prompt.prompt}
            </div>
            <div class="prompt-meta text-gray-400 text-xs">
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

        const textarea = document.querySelector('#prompt-textarea');

        if (textarea) {
            textarea.value = prompt.prompt;
            textarea.dispatchEvent(new Event('input', { bubbles: true }));

            // Scroll to top of page to show the textarea
            window.scrollTo({ top: 0, behavior: 'smooth' });

            // Focus the textarea
            textarea.focus();


        } else {
            console.warn('⚠️ PROMPT HISTORY: Textarea not found');

        }
    }

    /**
     * Update the load more button state
     * @param {string} text - Button text
     * @param {boolean} disabled - Whether button is disabled
     */
    updateLoadMoreButton(text = null, disabled = false) {
        if (!this.loadMoreButton) {
            console.warn('⚠️ PROMPT HISTORY: Load more button not found');

            return;
        }

        if (text) {
            this.loadMoreButton.textContent = text;
            this.loadMoreButton.style.display = 'block';
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

        // Also update mobile button if it exists
        if (this.mobileLoadMoreButton) {
            if (text) {
                this.mobileLoadMoreButton.textContent = text;
                this.mobileLoadMoreButton.style.display = 'block';
            } else if (!this.hasMore) {
                this.mobileLoadMoreButton.textContent = 'No more prompts';
                this.mobileLoadMoreButton.disabled = true;
                this.mobileLoadMoreButton.style.display = 'none';
            } else {
                this.mobileLoadMoreButton.textContent = 'Load More Prompts';
                this.mobileLoadMoreButton.disabled = false;
                this.mobileLoadMoreButton.style.display = 'block';
            }

            this.mobileLoadMoreButton.disabled = disabled || this.isLoading;
        }

    }

    /**
     * Show message when no prompts are found
     */
    showNoPromptsMessage() {
        const noPromptsMessage = document.createElement('div');

        noPromptsMessage.className = 'no-prompts-message text-center py-4 text-gray-400 text-sm';
        noPromptsMessage.innerHTML = `
            <div class="mb-2">
                <i class="fas fa-history text-2xl"></i>
            </div>
            <div>No prompts yet</div>
            <div class="text-xs mt-1">Generate some images to see your prompt history here</div>
        `;

        // Add to both containers
        if (this.container) {
            this.container.insertBefore(noPromptsMessage, this.loadMoreButton);
        }

        if (this.mobileContainer) {
            const mobileMessage = noPromptsMessage.cloneNode(true);

            this.mobileContainer.insertBefore(mobileMessage, this.mobileLoadMoreButton);
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

        if (this.mobileContainer) {
            // Remove all prompt elements from mobile container
            const mobilePromptElements = this.mobileContainer.querySelectorAll('.prompt-item');

            mobilePromptElements.forEach(element => element.remove());
        }

        // Hide the load more buttons when clearing history
        if (this.loadMoreButton) {
            this.loadMoreButton.style.display = 'none';
        }

        if (this.mobileLoadMoreButton) {
            this.mobileLoadMoreButton.style.display = 'none';
        }
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.PromptHistoryService = PromptHistoryService;
}
