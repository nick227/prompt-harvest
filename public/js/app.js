// Debug mode configuration - set to true for verbose logging
window.DEBUG_MODE = false; // Set to true to enable debug logging

// Central Application Loader
class AppLoader {
    constructor() {
        this.modules = new Map();
        this.initialized = false;
        this.autoGenerationCounter = 0;
        this.autoGenerationMax = 1;
        this.isAutoGenerating = false;
    }

    async init() {
        if (this.initialized) {
            return;
        }

        try {
            await this.loadCore();
            await this.loadModules();
            await this.initializeApp();
            this.initialized = true;
        } catch (error) {
            console.error('❌ App initialization failed:', error);
        }
    }

    async loadCore() {
        await this.waitForDependencies(['Utils', 'StateManager', 'API_ENDPOINTS', 'apiService', 'userApi', 'imageApi']);

        // Initialize auth state manager early to prevent multiple auth queries
        if (window.authStateManager) {
            console.log('🔐 APP: Auth state manager available');
        } else {
            console.warn('⚠️ APP: Auth state manager not available');
        }
    }

    async loadModules() {
        const moduleConfigs = [
            ['textArea', () => window.textAreaManager, ['Utils', 'StateManager']],
            ['feed', () => window.feedManager, ['Utils']],
            ['guidance', () => window.guidanceManager, ['Utils']],
            ['search', () => window.searchManager, ['Utils']],
            ['rating', () => window.ratingManager, ['Utils']],
            ['stats', () => window.statsManager, ['Utils']],
            ['images', () => window.imagesManager, ['Utils']],
            ['controlsDrawer', () => new window.ControlsDrawer(), []]
        ];

        moduleConfigs.forEach(([name, module, dependencies]) => {
            this.register(name, module, dependencies);
        });
        await this.initializeModules();
    }

    register(name, module, dependencies = []) {
        this.modules.set(name, { module, dependencies, loaded: false });
    }

    async waitForDependencies(dependencies) {
        const maxWait = 5000;
        const startTime = Date.now();

        while (Date.now() - startTime < maxWait) {
            const allAvailable = dependencies.every(dep => {
                if (typeof dep === 'string') {
                    return window[dep] !== undefined;
                }

                return dep !== undefined;
            });

            if (allAvailable) {
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        throw new Error(`Dependencies not available after ${maxWait}ms: ${dependencies.join(', ')}`);
    }

    async initializeModules() {
        for (const [name, moduleInfo] of this.modules) {
            if (!moduleInfo.loaded && this.areDependenciesAvailable(moduleInfo.dependencies)) {
                await this.initializeModule(name, moduleInfo);
            }
        }
    }

    areDependenciesAvailable(dependencies) {
        return dependencies.every(dep => (typeof dep === 'string' ? window[dep] !== undefined : dep !== undefined)
        );
    }

    async initializeModule(name, moduleInfo) {
        try {
            if (typeof moduleInfo.module === 'function') {
                await moduleInfo.module();
            }
            moduleInfo.loaded = true;
        } catch (error) {
            console.error(`❌ Failed to initialize module ${name}:`, error);
        }
    }

    async initializeApp() {
        await this.initializeManagers();
        this.setupAutoGeneration();
        this.initializeComponents();
        this.setupFeed();
        this.initializePromptHistory();
    }

    initializePromptHistory() {
        try {
            // Check if PromptHistoryService is available, if not wait a bit and try again
            if (typeof window.PromptHistoryService === 'undefined') {
                // Only log warning on first few attempts to avoid spam
                if (!this.promptHistoryRetryCount) {
                    this.promptHistoryRetryCount = 0;
                }

                this.promptHistoryRetryCount++;

                // Only show warning for first 3 attempts
                if (this.promptHistoryRetryCount <= 3) {
                    console.warn('⚠️ APP: PromptHistoryService not available, retrying in 100ms...');
                }

                // Stop retrying after 50 attempts (5 seconds)
                if (this.promptHistoryRetryCount > 50) {
                    console.error('❌ APP: PromptHistoryService failed to load after 50 attempts');

                    return;
                }

                setTimeout(() => this.initializePromptHistory(), 100);

                return;
            }

            // Create and initialize the prompt history service
            window.promptHistoryService = new window.PromptHistoryService();
            window.promptHistoryService.init('prompt-history');
            window.promptHistoryService.initMobile();

            console.log('✅ APP: Prompt history service initialized');
        } catch (error) {
            console.error('❌ APP: Failed to initialize prompt history service:', error);
        }
    }

    async initializeManagers() {
        const managers = [
            'textAreaManager', 'feedManager', 'guidanceManager', 'ratingManager',
            'statsManager', 'searchManager', 'imagesManager'
        ];

        for (const managerName of managers) {
            if (managerName === 'feedManager') {
                // Special handling for feedManager - wait for it to be ready
                await this.waitForFeedManager();
            } else if (window[managerName]?.init) {
                try {
                    window[managerName].init();
                } catch (error) {
                    console.error(`❌ Error initializing ${managerName}:`, error);
                }
            } else {
                console.warn(`⚠️ APP: Manager ${managerName} not available or has no init method`);
            }
        }
    }

    async waitForFeedManager(maxRetries = 10, retryDelay = 100) {
        let retries = 0;

        while (retries < maxRetries) {
            if (window.feedManager?.init) {
                try {
                    await window.feedManager.init();
                    console.log('✅ APP: FeedManager initialized successfully');

                    return;
                } catch (error) {
                    console.error('❌ APP: Error initializing FeedManager:', error);

                    return;
                }
            }

            retries++;
            if (retries < maxRetries) {
                // Waiting for FeedManager to be ready
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }

        console.warn('⚠️ APP: FeedManager not available after waiting, skipping initialization');
    }

    initializeComponents() {
        // Initialize new modular images system
        if (window.imagesManager && window.imagesManager.init) {
            window.imagesManager.init();
        } else if (window.ImagesManager) {
            window.imagesManager = new window.ImagesManager();
            window.imagesManager.init();
        }


        this.initializeProviderManager();
    }

    initializeProviderManager() {
        if (!window.providerManager && window.ProviderManager) {
            const initProviderManager = () => {
                window.providerManager = new window.ProviderManager();
            };

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', initProviderManager);
            } else {
                initProviderManager();
            }
        }
    }


    async setupFeed() {
        // Setup feed to load initial images with retry logic
        const maxRetries = 3;
        let retries = 0;

        const trySetupFeed = async () => {
            if (window.feedManager) {
                try {
                    // Check if feed is already loaded by looking at the cache
                    if (window.feedManager.cacheManager && window.feedManager.cacheManager.getCache) {
                        const siteCache = window.feedManager.cacheManager.getCache('site');

                        if (siteCache && siteCache.isLoaded) {
                            // console.log('✅ APP: Feed already loaded, skipping setup');

                            return true;
                        }
                    }

                    // Check if setupFeed method exists
                    if (window.feedManager.setupFeed) {
                        await window.feedManager.setupFeed();
                        // console.log('✅ APP: Feed setup completed successfully');

                        return true;
                    } else {
                        // console.log('✅ APP: Feed manager available but no setupFeed method needed');

                        return true;
                    }
                } catch (error) {
                    console.error('❌ APP: Failed to setup feed:', error);

                    return false;
                }
            } else {
                console.warn('⚠️ APP: Feed manager not available for setup (attempt', retries + 1, ')');
                console.warn('⚠️ APP: window.feedManager exists:', !!window.feedManager);
                console.warn('⚠️ APP: window.FeedManager exists:', !!window.FeedManager);

                return false;
            }
        };

        while (retries < maxRetries) {
            const success = await trySetupFeed();

            if (success) {
                return;
            }

            retries++;
            if (retries < maxRetries) {
                // console.log('🔄 APP: Retrying feed setup in 500ms...');
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        console.error('❌ APP: Failed to setup feed after', maxRetries, 'attempts');
    }

    // Manual feed loading for testing
    async manualLoadFeed() {

        if (window.feedManager && window.feedManager.forceFreshFeedLoad) {
            try {
                console.log('🔍 APP: Calling feedManager.forceFreshFeedLoad()...');
                await window.feedManager.forceFreshFeedLoad();
                console.log('✅ APP: Manual feed load completed');
            } catch (error) {
                console.error('❌ APP: Manual feed load failed:', error);
            }
        } else {
            console.error('❌ APP: Feed manager not available for manual load');
        }
    }


    setupAutoGeneration() {
        const autoGenerateCheckbox = document.querySelector('input[name="auto-generate"]');
        const maxNumInput = document.querySelector('input[name="maxNum"]');

        if (!autoGenerateCheckbox || !maxNumInput) {
            console.warn('⚠️ AUTO-GENERATE: Required elements not found');

            return;
        }

        // Function to update maxNum input state
        const updateMaxNumState = () => {
            maxNumInput.disabled = !autoGenerateCheckbox.checked;

            // Add visual styling for disabled state
            if (maxNumInput.disabled) {
                maxNumInput.style.opacity = '0.5';
                maxNumInput.style.cursor = 'not-allowed';
            } else {
                maxNumInput.style.opacity = '1';
                maxNumInput.style.cursor = 'default';
            }
        };

        // Set initial state
        updateMaxNumState();

        // Add event listener for checkbox changes
        autoGenerateCheckbox.addEventListener('change', updateMaxNumState);

        // console.log('✅ AUTO-GENERATE: Setup completed - maxNum input disabled by default');
    }

    stopAutoGeneration() {
        if (this.isAutoGenerating) {
            this.isAutoGenerating = false;
            this.autoGenerationCounter = 0;

        }
    }

    checkAutoGenerationContinue() {
        const _autoGenerateCheckbox = document.querySelector('input[name="auto-generate"]');
        const maxNumInput = document.querySelector('input[name="maxNum"]');

        if (!_autoGenerateCheckbox || !_autoGenerateCheckbox.checked) {
            return;
        }

        const maxValue = maxNumInput ? parseInt(maxNumInput.value) : 1;
        const maxNum = Math.max(1, Math.min(10, maxValue || 1));

        if (!this.isAutoGenerating) {
            this.autoGenerationCounter = 0;
            this.autoGenerationMax = maxNum;
            this.isAutoGenerating = true;

        }

        this.autoGenerationCounter++;
        if (this.autoGenerationCounter < this.autoGenerationMax) {
            setTimeout(() => this.generateNextImage(), 1000);
        } else {

            this.stopAutoGeneration();
        }
    }

    generateNextImage() {
        const validation = validateImageGeneration();

        if (!validation.valid) {

            this.stopAutoGeneration();

            return;
        }

        const promptObj = {
            prompt: validation.prompt,
            promptId: Date.now().toString(),
            original: validation.prompt
        };

        if (typeof window.generateImage === 'function') {
            window.generateImage(promptObj.prompt, validation.providers)
                .then(_result => {

                    this.checkAutoGenerationContinue();
                })
                .catch(error => {
                    console.error('Auto-generation error:', error);
                    this.stopAutoGeneration();
                });
        } else {
            console.error('generateImage function not available');
            this.stopAutoGeneration();
        }
    }

    getStatus() {
        const status = {};

        for (const [name, moduleInfo] of this.modules) {
            status[name] = {
                loaded: moduleInfo.loaded,
                dependencies: moduleInfo.dependencies
            };
        }

        return status;
    }
}

// Shared validation function for image generation
const validateImageGeneration = () => {
    const textArea = document.querySelector('#prompt-textarea');
    const selectedProviders = (window.providerManager && window.providerManager.getSelectedProviders)
        ? window.providerManager.getSelectedProviders()
        : [];

    if (!textArea?.value.trim()) {
        console.warn('Please enter a prompt');

        return { valid: false };
    }

    if (selectedProviders.length === 0) {
        console.warn('Please select at least one provider');

        return { valid: false };
    }

    return {
        valid: true,
        prompt: textArea.value.trim(),
        providers: selectedProviders
    };
};

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', async() => {

    // Initialize global tag router FIRST, before app initialization
    if (window.TagRouter) {
        window.tagRouter = new window.TagRouter();
        console.log('✅ TAG ROUTER: Global tag router initialized');
    } else {
        console.warn('⚠️ TAG ROUTER: TagRouter not available');
    }

    const app = new AppLoader();

    await app.init();

    // Make app available globally
    window.app = app;

    // Connect feed manager to tag router after app initialization
    if (window.tagRouter && window.feedManager && window.feedManager.connectTagRouter) {
        window.feedManager.connectTagRouter();
        console.log('✅ TAG ROUTER: Connected to feed manager');

        // Notify listeners after connection to ensure initial tag state is processed
        setTimeout(() => {
            if (window.tagRouter.getActiveTags().length > 0) {
                console.log('🏷️ TAG ROUTER: Notifying listeners of initial tag state');
                window.tagRouter.notifyListeners();
            }
        }, 100);
    }

    // Verify generation component is available
    if (!window.generationComponent) {
        console.warn('⚠️ Generation component not found, button may not work');
    }

    // Debug functions for testing
    window.testAutoGeneration = () => {

        if (window.app) {
            window.app.checkAutoGenerationContinue();
        }
    };

    // Manual feed loading for testing
    /*
    window.manualLoadFeed = async () => {
        if (window.app) {
            await window.app.manualLoadFeed();
        }
    };
    */
});

