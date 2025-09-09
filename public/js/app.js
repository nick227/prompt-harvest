/* global */
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
            this.initializeApp();
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
            ['ui', () => window.uiManager, ['Utils']],
            ['search', () => window.searchManager, ['Utils']],
            ['rating', () => window.ratingManager, ['Utils']],
            ['stats', () => window.statsManager, ['Utils']],
            ['prompts', () => window.promptsManager, ['Utils']],
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

    initializeApp() {
        this.initializeManagers();
        this.setupAutoGeneration();
        this.initializeComponents();
        this.setupGridView();
    }

    initializeManagers() {
        const managers = [
            'textAreaManager', 'feedManager', 'guidanceManager', 'ratingManager',
            'statsManager', 'searchManager', 'uiManager', 'imagesManager', 'promptsManager'
        ];

        managers.forEach(managerName => {
            if (window[managerName]?.init) {
                try {
                    window[managerName].init();

                } catch (error) {
                    console.error(`❌ Error initializing ${managerName}:`, error);
                }
            }
        });
    }

    initializeComponents() {
        // Initialize new modular images system
        if (window.imagesManager && window.imagesManager.init) {
            console.log('🚀 Initializing ImagesManager...');
            window.imagesManager.init();
        } else if (window.ImagesManager) {
            console.log('🚀 Creating and initializing ImagesManager...');
            window.imagesManager = new window.ImagesManager();
            window.imagesManager.init();
        }

        // Legacy fallback
        if (window.imageComponent && window.imageComponent.init) {
            window.imageComponent.init();
            window.imageComponent.reSetupEventDelegation?.();
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

    setupGridView() {
        setTimeout(() => this.applyGridView(), 100);
    }

    applyGridView() {
        const promptOutput = document.querySelector('.prompt-output');

        if (!promptOutput) {
            return;
        }

        this.setupGridClasses(promptOutput);
        this.hideTextElements(promptOutput);
        this.applyGridStyles(promptOutput);
        this.ensureImageItemsVisible(promptOutput);
    }

    setupGridClasses(promptOutput) {
        promptOutput.classList.remove('river-view', 'list-view');
        promptOutput.classList.add('grid-view');

        // Force reflow
        promptOutput.style.display = 'none';
        const _reflow = promptOutput.offsetHeight;

        promptOutput.style.display = '';
    }

    hideTextElements(promptOutput) {
        const allListItems = promptOutput.querySelectorAll('li');

        allListItems.forEach(li => {
            if (!li.querySelector('.image-wrapper')) {
                li.style.display = 'none';
            } else {
                li.classList.add('image-item');
            }
        });
        const textElements = promptOutput.querySelectorAll('.prompt-text, .tags, h3, h5, h6, p, .row, button, span:not(.image-wrapper span)');

        textElements.forEach(el => {
            if (!el.closest('.image-wrapper')) {
                el.style.display = 'none';
            }
        });
    }

    applyGridStyles(promptOutput) {
        const gridStyles = {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gridAutoRows: 'minmax(150px, auto)',
            gridGap: '5px',
            gridAutoFlow: 'dense',
            listStyle: 'none',
            width: '100%',
            minHeight: '200px',
            height: 'auto',
            overflow: 'visible',
            position: 'relative'
        };

        Object.assign(promptOutput.style, gridStyles);
    }

    ensureImageItemsVisible(promptOutput) {
        const imageItems = promptOutput.querySelectorAll('li.image-item');

        imageItems.forEach(item => {
            item.style.display = 'flex';
            item.style.minHeight = '150px';
        });
    }

    setupAutoGeneration() {
        const _autoGenerateCheckbox = document.querySelector('input[name="auto-generate"]');

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

    const app = new AppLoader();

    await app.init();

    // Make app available globally
    window.app = app;

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
});

