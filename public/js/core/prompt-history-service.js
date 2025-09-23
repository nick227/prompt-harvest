// console.log('🔍 PROMPT HISTORY: Script loading...');

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
        // console.log('🔍 PROMPT HISTORY: Initializing service with containerId:', containerId);

        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.warn('⚠️ PROMPT HISTORY: Container not found:', containerId);

            return;
        }

        // console.log('🔍 PROMPT HISTORY: Container found:', {
        //     id: this.container.id,
        //     className: this.container.className,
        //     exists: !!this.container
        // });

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
        // console.log('🔍 PROMPT HISTORY: Mobile container found:', {
        //     id: this.mobileContainer.id,
        //     className: this.mobileContainer.className,
        //     exists: !!this.mobileContainer
        // });
    }

    /**
     * Wait for authentication before loading prompts
     */
    waitForAuthentication() {
        // Check if user is already authenticated
        if (this.isUserLoggedIn()) {
            // console.log('🔍 PROMPT HISTORY: User already authenticated, loading initial prompts');
            this.loadInitialPrompts();
        } else {
            console.log('🔍 PROMPT HISTORY: User not authenticated, waiting for auth state change');
            // Listen for authentication state changes
            window.addEventListener('authStateChanged', this.handleAuthStateChange.bind(this));
        }
    }

    /**
     * Handle authentication state changes
     * @param {CustomEvent} event - Auth state change event
     */
    handleAuthStateChange(event) {
        console.log('🔍 PROMPT HISTORY: Auth state changed:', event.detail);

        // Debounce auth state changes to avoid rapid calls
        if (this.authTimeout) {
            clearTimeout(this.authTimeout);
        }

        this.authTimeout = setTimeout(() => {
            if (this.isUserLoggedIn()) {
                console.log('🔍 PROMPT HISTORY: User authenticated, loading prompts');
                this.loadInitialPrompts();
            } else {
                console.log('🔍 PROMPT HISTORY: User logged out, clearing history');

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
            return window.userApi.isAuthenticated();
        }

        // Fallback: check for auth token
        const token = this.getAuthToken();

        return !!token;
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

        return localToken || sessionToken;
    }

    /**
     * Load initial prompts
     */
    async loadInitialPrompts() {
        // console.log('🔍 PROMPT HISTORY: Loading initial prompts');

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
        // console.log('🔍 PROMPT HISTORY: loadMorePrompts called:', {
        //     isLoading: this.isLoading,
        //     hasMore: this.hasMore,
        //     currentPage: this.currentPage
        // });

        if (this.isLoading || !this.hasMore) {
            // console.log('🔍 PROMPT HISTORY: Skipping load - isLoading:', this.isLoading, 'hasMore:', this.hasMore);

            return;
        }

        this.isLoading = true;
        this.updateLoadMoreButton('Loading...', true);

        try {
            const result = await this.fetchPromptsFromAPI();

            if (result.success && result.data) {
                this.processPromptResponse(result.data);
            } else if (result.success === false && result.error?.message === 'Not authenticated') {
                console.log('🔍 PROMPT HISTORY: User not authenticated, hiding prompt history');
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
        // console.log('🔍 PROMPT HISTORY: Loading page', this.currentPage);

        const authToken = this.getAuthToken();
        const headers = {
            'Content-Type': 'application/json'
        };

        // Only add auth header if user is authenticated
        if (authToken) {
            headers.Authorization = `Bearer ${authToken}`;
        }

        // console.log('🔍 PROMPT HISTORY: Auth token available:', !!authToken);
        // console.log('🔍 PROMPT HISTORY: Request headers:', headers);

        const response = await fetch(`/api/prompts?limit=${this.pageSize}&page=${this.currentPage}`, {
            method: 'GET',
            headers
        });

        // console.log('🔍 PROMPT HISTORY: API response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();

            console.error('❌ PROMPT HISTORY: API error response:', {
                status: response.status,
                statusText: response.statusText,
                errorText
            });

            if (response.status === 401) {
                console.log('🔍 PROMPT HISTORY: User not authenticated, skipping prompt history');

                return { success: false, error: { message: 'Not authenticated' } };
            }

            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        // console.log('🔍 PROMPT HISTORY: API response data:', result);
        // console.log('🔍 PROMPT HISTORY: API response structure:', {
        //     success: result.success,
        //     hasData: !!result.data,
        //     dataType: typeof result.data,
        //     dataKeys: result.data ? Object.keys(result.data) : 'no data',
        //     promptsCount: result.data?.prompts?.length || 0
        // });

        return result;
    }

    /**
     * Process prompt response from API
     * @param {Object} data - API response data
     */
    processPromptResponse(data) {
        // console.log('🔍 PROMPT HISTORY: Processing prompt response:', data);

        const prompts = data.prompts || [];
        const totalPrompts = data.total || 0;
        const totalPages = Math.ceil(totalPrompts / this.pageSize);

        // console.log('🔍 PROMPT HISTORY: Response details:', {
        //     promptsCount: prompts.length,
        //     totalPrompts,
        //     totalPages,
        //     currentPage: this.currentPage
        // });

        // Add prompts to history
        prompts.forEach(prompt => {
            this.addPrompt(prompt);
        });

        // Update pagination state
        this.currentPage++;
        this.hasMore = this.currentPage < totalPages;

        // console.log('🔍 PROMPT HISTORY: Updated state:', {
        //     currentPage: this.currentPage,
        //     hasMore: this.hasMore
        // });

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
        // console.log('🔍 PROMPT HISTORY: Adding prompt:', prompt);

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
        // console.log('🔍 PROMPT HISTORY: Rendering prompts:', prompts.length);

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

        // console.log('🔍 PROMPT HISTORY: Finished rendering prompts');
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
        // console.log('🔍 PROMPT HISTORY: Selecting prompt:', prompt);

        const textarea = document.querySelector('#prompt-textarea');

        if (textarea) {
            textarea.value = prompt.prompt;
            textarea.dispatchEvent(new Event('input', { bubbles: true }));

            // Scroll to top of page to show the textarea
            window.scrollTo({ top: 0, behavior: 'smooth' });

            // Focus the textarea
            textarea.focus();

            // console.log('✅ PROMPT HISTORY: Prompt filled in textarea');

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

        if (window.DEBUG_MODE) {
            console.log('🔍 PROMPT HISTORY: Updating load more button:', { text, disabled, hasMore: this.hasMore, isLoading: this.isLoading });
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

        if (window.DEBUG_MODE) {
            console.log('🔍 PROMPT HISTORY: Button state updated:', {
                text: this.loadMoreButton.textContent,
                disabled: this.loadMoreButton.disabled,
                display: this.loadMoreButton.style.display
            });
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
    // console.log('✅ PROMPT HISTORY: Script loaded and exported to window.PromptHistoryService');
}
