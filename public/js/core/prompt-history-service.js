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
        console.log('🔍 PROMPT HISTORY: Initializing service with containerId:', containerId);

        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.warn('⚠️ PROMPT HISTORY: Container not found:', containerId);

            return;
        }

        console.log('🔍 PROMPT HISTORY: Container found:', {
            id: this.container.id,
            className: this.container.className,
            exists: !!this.container
        });

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
        const mobileContainer = document.getElementById(mobileContainerId);

        if (!mobileContainer) {
            console.warn('⚠️ PROMPT HISTORY: Mobile container not found:', mobileContainerId);
            return;
        }

        // Create a separate instance for mobile or sync with desktop
        this.mobileContainer = mobileContainer;
        this.setupMobileLoadMoreButton();

        console.log('🔍 PROMPT HISTORY: Mobile service initialized');
    }

    /**
     * Wait for user authentication before loading prompts
     */
    async waitForAuthentication() {
        console.log('🔍 PROMPT HISTORY: Loading prompts (authentication optional)...');

        // Wait a bit for userApi to be available
        await this.waitForUserApi();

        // Load prompts immediately - no need to wait for authentication
        await this.loadInitialPrompts();
    }

    /**
     * Wait for userApi to be available
     */
    async waitForUserApi() {
        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts && !window.userApi) {
            console.log(`🔍 PROMPT HISTORY: Waiting for userApi (attempt ${attempts + 1}/${maxAttempts})`);
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (window.userApi) {
            console.log('🔍 PROMPT HISTORY: userApi is now available');
        } else {
            console.log('🔍 PROMPT HISTORY: userApi not available after waiting, will use fallback');
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for image generation events to add prompts to history
        window.addEventListener('imageGenerated', event => {
            this.handleImageGenerated(event);
        });

        // Listen for authentication state changes
        window.addEventListener('authStateChanged', event => {
            this.handleAuthStateChange(event);
        });

        if (window.DEBUG_MODE) {
            console.log('🔍 PROMPT HISTORY: Event listeners setup');
        }
    }

    /**
     * Handle authentication state changes
     * @param {CustomEvent} event - Auth state change event
     */
    handleAuthStateChange(event) {
        const { isAuthenticated, user } = event.detail;

        // Only log auth state changes in debug mode
        if (window.DEBUG_MODE) {
            console.log('🔍 PROMPT HISTORY: Auth state changed:', { isAuthenticated, userId: user?.id });
        }

        // Add a small delay to handle rapid auth state changes
        clearTimeout(this.authTimeout);
        this.authTimeout = setTimeout(() => {
            if (isAuthenticated && user) {
                // User logged in, load prompt history
                console.log('🔍 PROMPT HISTORY: User logged in, loading prompt history...');
                this.loadInitialPrompts();
            } else {
                // User logged out, clear prompt history
                console.log('🔍 PROMPT HISTORY: User logged out, clearing prompt history...');
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
        this.loadMoreButton.textContent = 'Load More Prompts';
        this.loadMoreButton.className = 'load-more-prompts-btn bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors mt-3 w-full';
        this.loadMoreButton.style.display = 'none';
        this.loadMoreButton.disabled = false;

        // Add click event listener
        this.loadMoreButton.addEventListener('click', () => {
            this.loadMorePrompts();
        });

        // Append to container
        this.container.appendChild(this.loadMoreButton);

        if (window.DEBUG_MODE) {
            console.log('🔍 PROMPT HISTORY: Load more button created and added to container');
        }
    }

    /**
     * Setup the mobile load more button
     */
    setupMobileLoadMoreButton() {
        if (!this.mobileContainer) {
            return;
        }

        // Create mobile load more button
        this.mobileLoadMoreButton = document.createElement('button');
        this.mobileLoadMoreButton.textContent = 'Load More Prompts';
        this.mobileLoadMoreButton.className = 'load-more-prompts-btn bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors mt-3 w-full';
        this.mobileLoadMoreButton.style.display = 'none';
        this.mobileLoadMoreButton.disabled = false;

        // Add click event listener
        this.mobileLoadMoreButton.addEventListener('click', () => {
            this.loadMorePrompts();
        });

        // Append to mobile container
        this.mobileContainer.appendChild(this.mobileLoadMoreButton);

        console.log('🔍 PROMPT HISTORY: Mobile load more button created and added to container');
    }

    /**
     * Load initial prompts (first page)
     */
    async loadInitialPrompts() {
        console.log('🔍 PROMPT HISTORY: Loading initial prompts');
        this.currentPage = 0;
        this.promptHistory = [];
        await this.loadMorePrompts();
    }

    /**
     * Load more prompts (next page)
     */
    async loadMorePrompts() {
        console.log('🔍 PROMPT HISTORY: loadMorePrompts called:', {
            isLoading: this.isLoading,
            hasMore: this.hasMore,
            currentPage: this.currentPage
        });

        if (this.isLoading || !this.hasMore) {
            console.log('🔍 PROMPT HISTORY: Skipping load - isLoading:', this.isLoading, 'hasMore:', this.hasMore);

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
        console.log('🔍 PROMPT HISTORY: Loading page', this.currentPage);

        const authToken = this.getAuthToken();
        const headers = {
            'Content-Type': 'application/json'
        };

        // Only add auth header if user is authenticated
        if (authToken) {
            headers.Authorization = `Bearer ${authToken}`;
        }

        console.log('🔍 PROMPT HISTORY: Auth token available:', !!authToken);
        console.log('🔍 PROMPT HISTORY: Request headers:', headers);

        const response = await fetch(`/api/prompts?limit=${this.pageSize}&page=${this.currentPage}`, {
            method: 'GET',
            headers
        });

        console.log('🔍 PROMPT HISTORY: API response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();

            console.error('❌ PROMPT HISTORY: API error response:', {
                status: response.status,
                statusText: response.statusText,
                errorText: errorText
            });

            if (response.status === 401) {
                console.log('🔍 PROMPT HISTORY: User not authenticated, skipping prompt history');
                return { success: false, error: { message: 'Not authenticated' } };
            }

            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        console.log('🔍 PROMPT HISTORY: API response data:', result);
        console.log('🔍 PROMPT HISTORY: API response structure:', {
            success: result.success,
            hasData: !!result.data,
            dataType: typeof result.data,
            dataKeys: result.data ? Object.keys(result.data) : 'no data',
            promptsCount: result.data?.prompts?.length || 0
        });

        return result;
    }

    /**
     * Process prompt response from API
     * @param {Object} data - API response data
     */
    processPromptResponse(data) {
        console.log('🔍 PROMPT HISTORY: Processing prompt response:', {
            dataType: typeof data,
            isArray: Array.isArray(data),
            hasPrompts: !!data.prompts,
            hasPagination: !!data.pagination,
            dataKeys: data ? Object.keys(data) : 'no data'
        });

        // Handle both old and new API response formats
        let prompts, pagination;

        if (data.prompts && data.pagination) {
            // New format: { prompts: [...], pagination: {...} }
            prompts = data.prompts;
            pagination = data.pagination;
            console.log('🔍 PROMPT HISTORY: Using new format - prompts:', prompts.length, 'pagination:', pagination);
        } else if (Array.isArray(data)) {
            // Old format: direct array of prompts
            prompts = data;
            pagination = {
                total: data.length,
                hasMore: false,
                page: this.currentPage
            };
            console.log('🔍 PROMPT HISTORY: Using old format - prompts:', prompts.length);
        } else {
            console.error('❌ PROMPT HISTORY: Unexpected API response format:', data);
            return;
        }

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
    }

    /**
     * Render prompts to the DOM
     * @param {Array} prompts - Array of prompt objects
     */
    renderPrompts(prompts) {
        if (!this.container) {
            console.warn('⚠️ PROMPT HISTORY: Container not found for rendering');

            return;
        }

        console.log('🔍 PROMPT HISTORY: Rendering prompts:', {
            count: prompts.length,
            containerExists: !!this.container,
            loadMoreButtonExists: !!this.loadMoreButton,
            containerId: this.container.id,
            containerHTML: this.container.innerHTML.substring(0, 100) + '...'
        });

        prompts.forEach((prompt, index) => {
            const promptElement = this.createPromptElement(prompt);

            // Render to desktop container
            this.container.insertBefore(promptElement, this.loadMoreButton);

            // Also render to mobile container if it exists
            if (this.mobileContainer && this.mobileLoadMoreButton) {
                const mobilePromptElement = this.createPromptElement(prompt);
                this.mobileContainer.insertBefore(mobilePromptElement, this.mobileLoadMoreButton);
            }

            console.log(`🔍 PROMPT HISTORY: Rendered prompt ${index + 1}:`, prompt.id);
        });

        console.log('🔍 PROMPT HISTORY: Finished rendering prompts');
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
            console.log('🔍 PROMPT HISTORY: Load more button updated:', {
                text: this.loadMoreButton.textContent,
                display: this.loadMoreButton.style.display,
                disabled: this.loadMoreButton.disabled
            });
        }
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

        // Also add to mobile container if it exists
        if (this.mobileContainer) {
            const mobilePromptElement = this.createPromptElement(prompt);
            this.mobileContainer.insertBefore(mobilePromptElement, this.mobileContainer.firstChild);
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
            console.log('🔍 PROMPT HISTORY: getAuthToken called:', {
                hasUserApi: !!window.userApi,
                hasGetAuthToken: !!window.userApi?.getAuthToken,
                userApiKeys: window.userApi ? Object.keys(window.userApi) : 'no userApi'
            });

            // Try userApi first
            let token = window.userApi?.getAuthToken?.() || null;

            // Fallback to localStorage/sessionStorage if userApi doesn't work
            if (!token) {
                token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || null;
                console.log('🔍 PROMPT HISTORY: Using fallback token from storage:', !!token);
            }

            console.log('🔍 PROMPT HISTORY: getAuthToken result:', {
                hasToken: !!token,
                tokenLength: token?.length,
                tokenPreview: token ? `${token.substring(0, 20)}...` : 'no token'
            });

            return token;
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

