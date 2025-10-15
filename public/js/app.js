// Debug mode configuration - set to true for verbose logging
window.DEBUG_MODE = false; // Set to true to enable debug logging

// PromptHelpersForm is available globally

// Central Application Loader
class AppLoader {
    constructor() {
        this.modules = new Map();
        this.initialized = false;
        this.initLoopRunning = false;
        this.initLoopIterations = 0;
        this.maxInitLoopIterations = 60; // 30 seconds at 500ms intervals
        this.checkPendingTimer = null;
        this.eventListeners = [];
    }

    log(...args) {
        const debugMode = window.DEBUG_MODE || localStorage.getItem('DEBUG_MODE') === 'true';

        if (debugMode) {
            console.log('🔧 APP:', ...args);
        }
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
            this.startContinuousInit();
        } catch (error) {
            console.error('❌ App initialization failed:', error);
        }
    }

    startContinuousInit() {
        if (this.initLoopRunning) {
            return;
        }

        this.initLoopRunning = true;
        this.initLoopIterations = 0;

        const checkPending = async() => {
            this.initLoopIterations++;

            // Hard stop after max iterations
            if (this.initLoopIterations >= this.maxInitLoopIterations) {
                this.logInitSummary('timeout');
                this.initLoopRunning = false;

                return;
            }

            const pending = Array.from(this.modules.entries())
                .filter(([, info]) => !info.loaded && this.areDependenciesAvailable(info.dependencies));

            if (pending.length > 0) {
                this.log(`Initializing ${pending.length} pending modules (iteration ${this.initLoopIterations})`);

                for (const [name, info] of pending) {
                    try {
                        await this.initializeModule(name, info);
                    } catch (error) {
                        console.error(`❌ Module ${name} threw during init:`, error);
                    }
                }

                this.checkPendingTimer = setTimeout(checkPending, 500);
            } else {
                const allLoaded = Array.from(this.modules.values()).every(info => info.loaded);

                if (allLoaded) {
                    this.logInitSummary('complete');
                    this.initLoopRunning = false;
                } else {
                    this.checkPendingTimer = setTimeout(checkPending, 500);
                }
            }
        };

        checkPending();
    }

    logInitSummary(status) {
        const loaded = [];
        const pending = [];

        for (const [name, info] of this.modules) {
            if (info.loaded) {
                loaded.push(name);
            } else {
                pending.push({ name, deps: info.dependencies });
            }
        }

        if (status === 'complete') {
            this.log('✅ All modules loaded successfully:', loaded);
        } else if (status === 'timeout') {
            console.warn('⚠️ APP: Init loop timed out after', this.initLoopIterations, 'iterations');
            console.warn('✅ Loaded modules:', loaded);
            console.warn('⏸️ Pending modules:', pending.map(p => `${p.name} (needs: ${p.deps.join(', ')})`));
        }
    }

    async loadCore() {
        await this.waitForDependencies(['Utils', 'StateManager', 'API_ENDPOINTS', 'apiService', 'userApi', 'imageApi']);

        // Re-run module initialization now that core deps are available
        await this.initializeModules();

        // Initialize auth state manager early to prevent multiple auth queries
        if (!window.authStateManager) {
            console.warn('⚠️ APP: Auth state manager not available');
        }
    }

    async loadModules() {
        const moduleConfigs = [
            ['textAreaManager', () => window.textAreaManager, ['Utils', 'StateManager']],
            ['feedManager', () => window.feedManager, ['Utils']],
            ['guidanceManager', () => window.guidanceManager, ['Utils']],
            ['searchManager', () => window.searchManager, ['Utils']],
            ['ratingManager', () => window.ratingManager, ['Utils']],
            ['statsManager', () => window.statsManager, ['Utils']],
            ['imagesManager', () => window.imagesManager, ['Utils']],
            ['imageComponent', () => (window.ImageComponent ? new window.ImageComponent() : null), ['UnifiedNavigation']],
            ['simpleDrawer', () => (window.SimpleDrawer ? new window.SimpleDrawer() : null), []]
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
                    const value = window[dep];

                    return value !== undefined && value !== null;
                }

                return dep !== undefined && dep !== null;
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
        return dependencies.every(dep => {
            if (typeof dep === 'string') {
                const value = window[dep];

                return value !== undefined && value !== null;
            }

            return dep !== undefined && dep !== null;
        });
    }

    async initializeModule(name, moduleInfo) {
        try {
            if (typeof moduleInfo.module === 'function') {
                const result = await moduleInfo.module();

                if (result !== undefined && result !== null) {
                    if (!window[name]) {
                        window[name] = result;
                        this.log(`Assigned ${name} to window.${name}`);
                    }
                }
            }

            // Only mark loaded if instance exists
            if (window[name]) {
                moduleInfo.loaded = true;
                this.log(`Module ${name} loaded successfully`);
            } else {
                this.log(`Module ${name} factory returned null/undefined, will retry`);
            }
        } catch (error) {
            console.error(`❌ Failed to initialize module ${name}:`, error);
        }
    }

    async initializeApp() {
        this.initializeComponents();
        await this.initializeManagers();
        this.setupAutoGeneration();

        // Setup feed (non-blocking - app continues if this fails)
        this.setupFeed().catch(error => {
            console.error('❌ APP: Feed setup failed, but app will continue:', error);
        });

        this.setupAuthListeners();
    }

    async initializeManagers() {
        const managers = [
            'textAreaManager', 'feedManager', 'guidanceManager', 'ratingManager',
            'statsManager', 'searchManager', 'imagesManager'
        ];

        for (const managerName of managers) {
            if (managerName === 'feedManager') {
                await this.waitForFeedManager();
            } else if (window[managerName]?.init) {
                try {
                    const manager = window[managerName];

                    if (!manager.__inited) {
                        manager.init();
                        manager.__inited = true;
                        this.log(`Initialized ${managerName}`);
                    }
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
        let lastError = null;

        while (retries < maxRetries) {
            if (window.feedManager?.init && !window.feedManager.__inited) {
                try {
                    await window.feedManager.init();
                    window.feedManager.__inited = true;
                    this.log('FeedManager initialized successfully');

                    return true;
                } catch (error) {
                    lastError = error;
                    this.log(`FeedManager init attempt ${retries + 1} failed:`, error.message);
                }
            } else if (window.feedManager?.__inited) {
                return true;
            }

            retries++;

            if (retries < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }

        console.warn('⚠️ APP: FeedManager not available after waiting, skipping initialization');

        if (lastError) {
            console.error('❌ APP: Last FeedManager error:', lastError);
        }

        return false;
    }

    initializeComponents() {
        // Initialize new modular images system
        if (window.imagesManager?.init && !window.imagesManager.__inited) {
            window.imagesManager.init();
            window.imagesManager.__inited = true;
            this.log('Initialized imagesManager component');
        } else if (window.ImagesManager && !window.imagesManager) {
            window.imagesManager = new window.ImagesManager();
            window.imagesManager.init();
            window.imagesManager.__inited = true;
            this.log('Created and initialized imagesManager component');
        }

        // Initialize image component for fullscreen navigation
        if (window.imageComponent?.init && !window.imageComponent.__inited) {
            window.imageComponent.init();
            window.imageComponent.__inited = true;
            this.log('Initialized imageComponent');
        } else if (window.ImageComponent && !window.imageComponent) {
            window.imageComponent = new window.ImageComponent();
            window.imageComponent.init();
            window.imageComponent.__inited = true;
            this.log('Created and initialized imageComponent');
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


    getCurrentFilter() {
        return window.feedManager?.filterManager?.getCurrentFilter?.() || 'site';
    }

    isFeedCacheLoaded(cacheManager) {
        if (!cacheManager?.getCache) {
            return false;
        }

        const currentFilter = this.getCurrentFilter();
        const cache = cacheManager.getCache(currentFilter);

        return cache?.isLoaded || false;
    }

    getFeedCacheStatus(feedManager) {
        const currentFilter = this.getCurrentFilter();
        const cache = feedManager.cacheManager?.getCache(currentFilter);

        return {
            hasCacheManager: !!feedManager.cacheManager,
            hasGetCache: !!feedManager.cacheManager?.getCache,
            currentFilter,
            cache,
            isLoaded: cache?.isLoaded,
            hasImages: Array.isArray(cache?.images) && cache.images.length > 0,
            imagesCount: Array.isArray(cache?.images) ? cache.images.length : 0,
            currentPage: cache?.currentPage,
            hasMore: cache?.hasMore,
            cacheKeys: cache ? Object.keys(cache) : []
        };
    }

    validateFeedManagerForSetup(feedManager) {
        if (!feedManager) {
            this.log('trySetupFeed: feedManager not available');

            return { valid: false, reason: 'feedManager_missing' };
        }

        if (this.isFeedCacheLoaded(feedManager.cacheManager)) {
            this.log('Feed already loaded from cache');

            return { valid: false, reason: 'cache_loaded', alreadyLoaded: true };
        }

        if (!feedManager.setupFeed) {
            console.warn('⚠️ APP: feedManager.setupFeed method not found');

            return { valid: false, reason: 'setupFeed_method_missing' };
        }

        return { valid: true };
    }

    async trySetupFeed() {
        const { feedManager } = window;
        const validation = this.validateFeedManagerForSetup(feedManager);

        if (!validation.valid) {
            return validation.alreadyLoaded
                ? { success: true, reason: validation.reason }
                : { success: false, reason: validation.reason };
        }

        try {
            this.log('Calling feedManager.setupFeed()...');

            const setupResult = await feedManager.setupFeed();

            this.log('setupFeed() returned:', setupResult);

            const cacheStatus = this.getFeedCacheStatus(feedManager);

            this.log('Cache status after setupFeed:', cacheStatus);

            // Check if cache is marked as loaded
            if (this.isFeedCacheLoaded(feedManager.cacheManager)) {
                this.log('Feed setup completed and verified (isLoaded=true)');

                return { success: true, reason: 'setup_completed' };
            }

            // Alternative: Check if cache has images even if not marked loaded
            if (cacheStatus.hasImages && cacheStatus.imagesCount > 0) {
                this.log(`Feed setup completed with ${cacheStatus.imagesCount} images (isLoaded flag not set)`);

                return { success: true, reason: 'has_images_without_flag' };
            }

            // Check if setupFeed returned false/error
            if (setupResult === false || setupResult?.error) {
                console.warn('⚠️ setupFeed() indicated failure:', setupResult);

                return {
                    success: false,
                    reason: 'setupFeed_failed',
                    details: { ...cacheStatus, setupResult }
                };
            }

            this.log('Feed setup called but cache not loaded. Status:', cacheStatus);

            return { success: false, reason: 'cache_not_loaded', details: cacheStatus };
        } catch (error) {
            console.error('❌ APP: Exception during feed setup:', error);
            console.error('Stack trace:', error.stack);

            return { success: false, reason: 'exception', error };
        }
    }

    logFeedSetupDiagnostics(failureReasons) {
        /* eslint-disable no-console */
        console.groupCollapsed('📋 Feed setup diagnostics');
        console.log('window.feedManager exists:', !!window.feedManager);
        console.log('feedManager.setupFeed exists:', !!window.feedManager?.setupFeed);
        console.log('feedManager.cacheManager exists:', !!window.feedManager?.cacheManager);
        console.log('feedManager.__inited:', window.feedManager?.__inited);
        console.log('All failure reasons:', failureReasons);
        console.groupEnd();
        /* eslint-enable no-console */
    }

    async setupFeed() {
        const maxRetries = 3;
        const failureReasons = [];

        for (let retries = 0; retries < maxRetries; retries++) {
            const result = await this.trySetupFeed();

            if (result.success) {
                return true;
            }

            const failureInfo = {
                attempt: retries + 1,
                reason: result.reason,
                details: result.details,
                error: result.error?.message
            };

            failureReasons.push(failureInfo);

            console.warn(`⚠️ Feed setup attempt ${retries + 1}/${maxRetries} failed:`, result.reason);

            if (result.details) {
                console.warn('   Cache status:', result.details);

                if (result.details.imagesCount === 0 && result.details.hasMore) {
                    console.warn('   ⚠️ No images loaded but hasMore=true - API call may be failing silently');
                    console.warn('   💡 Check browser console for API errors or network failures');
                }
            }

            if (result.error) {
                console.warn('   Error:', result.error.message);
            }

            if (retries < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        console.error('❌ APP: Failed to setup feed after', maxRetries, 'attempts');
        console.error('📊 Summary of all attempts:');

        failureReasons.forEach(failure => {
            console.error(`   Attempt ${failure.attempt}: ${failure.reason}`);

            if (failure.details) {
                console.error('     └─ Details:', failure.details);
            }
        });

        this.logFeedSetupDiagnostics(failureReasons);

        return false;
    }

    // Manual feed loading for testing
    async manualLoadFeed() {
        if (window.feedManager && window.feedManager.forceFreshFeedLoad) {
            try {
                await window.feedManager.forceFreshFeedLoad();
            } catch (error) {
                console.error('❌ APP: Manual feed load failed:', error);
            }
        } else {
            console.error('❌ APP: Feed manager not available for manual load');
        }
    }

    // Retry feed setup with diagnostics
    async retryFeedSetup() {
        console.log('🔄 Retrying feed setup...');

        const result = await this.setupFeed();

        if (result) {
            console.log('✅ Feed setup successful!');
        } else {
            console.error('❌ Feed setup failed. Check diagnostics above.');
        }

        return result;
    }


    setupAutoGeneration() {
        const autoGenerateCheckbox = document.querySelector('input[name="auto-generate"]');
        const maxNumInput = document.querySelector('input[name="maxNum"]');

        if (!autoGenerateCheckbox || !maxNumInput) {
            console.warn('⚠️ AUTO-GENERATE: Required elements not found');

            return;
        }

        const updateMaxNumState = () => {
            maxNumInput.disabled = !autoGenerateCheckbox.checked;
            maxNumInput.classList.toggle('disabled', maxNumInput.disabled);
        };

        updateMaxNumState();
        autoGenerateCheckbox.addEventListener('change', updateMaxNumState);
        this.eventListeners.push({ target: autoGenerateCheckbox, event: 'change', handler: updateMaxNumState });
    }

    setupAuthListeners() {
        // Listen for authentication state changes
        const authStateHandler = event => {
            const { isAuthenticated } = event.detail;

            this.log('Auth state changed:', isAuthenticated);

            if (isAuthenticated && window.textAreaManager?.enableTextAreaAfterAuth) {
                window.textAreaManager.enableTextAreaAfterAuth();
                this.log('TextArea enabled after authentication');
            }
        };

        window.addEventListener('authStateChanged', authStateHandler);
        this.eventListeners.push({ target: window, event: 'authStateChanged', handler: authStateHandler });

        // Also listen via userSystem if available
        if (window.userSystem?.addAuthStateListener) {
            const userSystemHandler = authState => {
                if (authState?.isAuthenticated && window.textAreaManager?.enableTextAreaAfterAuth) {
                    window.textAreaManager.enableTextAreaAfterAuth();
                    this.log('TextArea enabled after authentication (via userSystem)');
                }
            };

            window.userSystem.addAuthStateListener(userSystemHandler);
            this.eventListeners.push({ target: window.userSystem, event: 'authState', handler: userSystemHandler });
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

    destroy() {
        this.log('🧹 Destroying AppLoader and cleaning up resources');

        // Stop init loop
        if (this.checkPendingTimer) {
            clearTimeout(this.checkPendingTimer);
            this.checkPendingTimer = null;
        }

        this.initLoopRunning = false;

        // Remove event listeners
        for (const { target, event, handler } of this.eventListeners) {
            if (target?.removeEventListener) {
                target.removeEventListener(event, handler);
            }
        }

        this.eventListeners = [];

        // Clear module state
        this.modules.clear();
        this.initialized = false;

        this.log('✅ AppLoader destroyed successfully');
    }
}

// Quick debug toggle via console
window.toggleDebug = () => {
    const current = localStorage.getItem('DEBUG_MODE') === 'true';
    const newValue = !current;

    localStorage.setItem('DEBUG_MODE', String(newValue));
    console.log(`🔧 Debug mode ${newValue ? 'enabled' : 'disabled'}. Reload to see changes.`);

    return newValue;
};

// Convenience function to retry feed setup from console
window.retryFeedSetup = async() => {
    if (window.app?.retryFeedSetup) {
        return await window.app.retryFeedSetup();
    }

    console.error('❌ App not initialized yet');

    return false;
};

// Quick feed diagnostics from console
window.checkFeedStatus = () => {
    /* eslint-disable no-console */
    console.group('🔍 Feed Manager Status');
    console.log('feedManager exists:', !!window.feedManager);
    console.log('feedManager.__inited:', window.feedManager?.__inited);
    console.log('feedManager.setupFeed exists:', typeof window.feedManager?.setupFeed);
    console.log('feedManager.cacheManager exists:', !!window.feedManager?.cacheManager);
    console.log('feedManager.filterManager exists:', !!window.feedManager?.filterManager);
    console.log('feedManager.initialLoadPromise:', !!window.feedManager?.initialLoadPromise);

    const currentFilter = window.feedManager?.filterManager?.getCurrentFilter?.() || 'unknown';

    console.log('Current filter:', currentFilter);

    if (window.feedManager?.cacheManager?.getCache) {
        const currentCache = window.feedManager.cacheManager.getCache(currentFilter);
        const allCacheKeys = Object.keys(window.feedManager.cacheManager.cache || {});

        console.log('Available cache keys:', allCacheKeys);
        console.log(`Current cache (${currentFilter}):`, currentCache);

        if (currentCache) {
            console.log('  ├─ images.length:', currentCache.images?.length);
            console.log('  ├─ isLoaded:', currentCache.isLoaded);
            console.log('  ├─ hasMore:', currentCache.hasMore);
            console.log('  └─ currentPage:', currentCache.currentPage);
        }
    } else {
        console.warn('⚠️ cacheManager.getCache not available');
    }

    console.groupEnd();
    console.log('💡 Try: await retryFeedSetup() or toggleDebug() then reload');
    /* eslint-enable no-console */
};

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', async() => {

    // Initialize global tag router FIRST, before app initialization
    if (window.TagRouter) {
        window.tagRouter = new window.TagRouter();
        // Global tag router initialized
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
        // Connected to feed manager

        // Notify listeners after connection to ensure initial tag state is processed
        setTimeout(() => {
            if (window.tagRouter.getActiveTags().length > 0) {
                window.tagRouter.notifyListeners();
            }
        }, 100);
    }

    // Verify images manager is available
    if (!window.imagesManager) {
        console.warn('⚠️ Images manager not found, button may not work');
    }

    // Debug functions for testing
    window.testAutoGeneration = () => {
        if (window.imagesManager) {
            window.imagesManager.checkAutoGenerationContinue();
        }
    };
});

