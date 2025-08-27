// setup generate button functionality - defined early for script.js compatibility
window.setupGenerate = () => {
    const generateBtn = document.querySelector('.btn-generate');

    if (generateBtn) {
        generateBtn.addEventListener('click', handleGenerateClick);
    }
};

// central Application Loader
class AppLoader {
    constructor() {
        this.modules = new Map();
        this.initialized = false;

        // Auto-generation state
        this.autoGenerationCounter = 0;
        this.autoGenerationMax = 1;
        this.isAutoGenerating = false;
    }

    // register a module with its dependencies
    register(name, module, dependencies = []) {
        this.modules.set(name, {
            module,
            dependencies,
            loaded: false
        });
    }

    // initialize all modules in dependency order
    async init() {
        if (this.initialized) {
            // app already initialized
            return;
        }

        try {
            // load core modules first
            await this.loadCore();

            // load feature modules
            await this.loadModules();

            // initialize the application
            this.initializeApp();

            this.initialized = true;
        } catch (error) {
            // failed to initialize app
        }
    }

    // load core functionality
    async loadCore() {
        // core modules are loaded via script tags in HTML
        // this ensures they're available before we initialize
        await this.waitForDependencies(['Utils', 'StateManager', 'API_ENDPOINTS']);
    }

    // load feature modules
    async loadModules() {
        // register modules in dependency order
        this.register('textArea', () => textAreaManager, ['Utils', 'StateManager']);
        this.register('customVariables', () => customVariablesManager, ['Utils']);
        this.register('feed', () => feedManager, ['Utils']);
        this.register('guidance', () => guidanceManager, ['Utils']);
        this.register('toggleView', () => uiManager, ['Utils']);
        this.register('imageSearch', () => searchManager, ['Utils']);
        this.register('rating', () => ratingManager, ['Utils']);
        this.register('scrollTopBar', () => uiManager, ['Utils']);
        this.register('scrollLoading', () => scrollLoadingManager, ['Utils']);
        this.register('images', () => imageManager, ['Utils']);
        this.register('user', () => userManager, ['Utils']);
        this.register('auth', () => authManager, ['Utils']);
        this.register('tools', () => toolsManager, ['Utils']);

        // initialize modules
        await this.initializeModules();
    }

    // wait for dependencies to be available
    async waitForDependencies(dependencies) {
        const maxWait = 5000; // 5 seconds timeout
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

    // initialize modules in dependency order
    async initializeModules() {
        const modules = Array.from(this.modules.entries());

        for (const [name, moduleInfo] of modules) {
            if (!moduleInfo.loaded) {
                await this.initializeModule(name, moduleInfo);
            }
        }
    }

    // initialize a single module
    async initializeModule(name, moduleInfo) {
        // check if dependencies are loaded
        for (const dep of moduleInfo.dependencies) {
            if (!this.isDependencyAvailable(dep)) {
                // dependency not available for module
                return;
            }
        }

        try {
            // initialize the module
            if (typeof moduleInfo.module === 'function') {
                await moduleInfo.module();
            }

            moduleInfo.loaded = true;
        } catch (error) {
            // failed to initialize module
        }
    }

    // check if a dependency is available
    isDependencyAvailable(dependency) {
        if (typeof dependency === 'string') {
            return window[dependency] !== undefined;
        }

        return dependency !== undefined;
    }

    // initialize the main application
    initializeApp() {
        // initialize all managers
        this.initializeManagers();

        // check user authentication
        setTimeout(async() => {
            try {
                // user authentication will be handled by the auth module
            } catch (error) {
                // failed to check user
            }
        }, 100);
    }

    // initialize all managers
    initializeManagers() {
        console.log('🔧 Initializing managers...');

        try {
            this.initializeCoreManagers();
            console.log('🔧 Setting up auto-generation...');
            this.setupAutoGeneration();
            this.initializeComponents();
            this.setupGridView();
        } catch (error) {
            console.error('❌ Error in initializeManagers:', error);
        }
    }

    // initialize core managers
    initializeCoreManagers() {
        const managers = [
            'textAreaManager', 'feedManager', 'guidanceManager', 'ratingManager',
            'statsManager', 'searchManager', 'uiManager', 'imageManager', 'promptsManager'
        ];

        managers.forEach(managerName => {
            if (window[managerName]) {
                try {
                    console.log(`🔧 Initializing ${managerName}...`);

                    // Check if manager has init method
                    if (typeof window[managerName].init === 'function') {
                        window[managerName].init();
                        console.log(`✅ ${managerName} initialized successfully`);
                    } else {
                        console.log(`⚠️ ${managerName} has no init method, skipping`);
                    }
                } catch (error) {
                    console.error(`❌ Error initializing ${managerName}:`, error);
                }
            } else {
                console.warn(`⚠️ ${managerName} not found`);
            }
        });
    }

    // initialize components
    initializeComponents() {
        if (window.imageComponent) {
            window.imageComponent.init();
            console.log('ImageComponent initialized in app.js');

            // Ensure event delegation is set up
            if (window.imageComponent.reSetupEventDelegation) {
                window.imageComponent.reSetupEventDelegation();
            }
        } else {
            console.error('ImageComponent not found!');
        }

        if (window.providerManager) {
            // providerManager is auto-initialized in its constructor
            console.log('ProviderManager initialized in app.js');
        } else {
            console.error('ProviderManager not found!');
        }
    }

    // setup grid view
    setupGridView() {
        setTimeout(() => this.setupContainerDimensions(), 50);
        setTimeout(() => this.applyGridView(), 100);
    }

    // setup container dimensions
    setupContainerDimensions() {
        const promptOutput = document.querySelector('.prompt-output');

        if (promptOutput) {
            promptOutput.style.width = '100%';
            promptOutput.style.minHeight = '200px';
            promptOutput.style.height = 'auto';
            promptOutput.style.overflow = 'visible';
            promptOutput.style.position = 'relative';

            // force a reflow to ensure dimensions are applied
            // eslint-disable-next-line no-unused-expressions
            promptOutput.offsetHeight;

            const computedStyle = window.getComputedStyle(promptOutput);

            console.log('Container dimensions:', {
                width: computedStyle.width,
                height: computedStyle.height,
                minHeight: computedStyle.minHeight,
                display: computedStyle.display
            });
        }
    }

    // apply grid view
    applyGridView() {
        const promptOutput = document.querySelector('.prompt-output');

        if (promptOutput) {
            this.setupGridClasses(promptOutput);
            this.hideTextElements(promptOutput);
            this.applyGridStyles(promptOutput);
            this.ensureImageItemsVisible(promptOutput);
        }
    }

    // setup grid classes
    setupGridClasses(promptOutput) {
        promptOutput.classList.remove('river-view', 'list-view');
        promptOutput.classList.add('grid-view');

        // force a reflow to ensure CSS is applied
        promptOutput.style.display = 'none';
        // eslint-disable-next-line no-unused-expressions
        promptOutput.offsetHeight; // force reflow
        promptOutput.style.display = '';
    }

    // hide text elements in grid view
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

    // apply grid styles
    applyGridStyles(promptOutput) {
        promptOutput.style.display = 'grid';
        promptOutput.style.gridTemplateColumns = 'repeat(auto-fill, minmax(150px, 1fr))';
        promptOutput.style.gridAutoRows = 'minmax(150px, auto)';
        promptOutput.style.gridGap = '5px';
        promptOutput.style.gridAutoFlow = 'dense';
        promptOutput.style.listStyle = 'none';
        promptOutput.style.width = '100%';
        promptOutput.style.minHeight = '200px';
        promptOutput.style.height = 'auto';
        promptOutput.style.overflow = 'visible';
        promptOutput.style.position = 'relative';
    }

    // ensure image items are visible
    ensureImageItemsVisible(promptOutput) {
        const imageItems = promptOutput.querySelectorAll('li.image-item');

        imageItems.forEach(item => {
            item.style.display = 'flex';
            item.style.minHeight = '150px';
        });
    }

    // setup auto-generation functionality
    setupAutoGeneration() {
        const autoGenerateCheckbox = document.querySelector('input[name="auto-generate"]');

        console.log('🔧 Auto-generation setup complete, checkbox found:', !!autoGenerateCheckbox);
    }

    stopAutoGeneration() {
        if (this.isAutoGenerating) {
            this.isAutoGenerating = false;
            this.autoGenerationCounter = 0;
            console.log('Auto-generation stopped');
        }
    }

    checkAutoGenerationContinue() {
        const autoGenerateCheckbox = document.querySelector('input[name="auto-generate"]');
        const maxNumInput = document.querySelector('input[name="maxNum"]');

        if (!autoGenerateCheckbox || !autoGenerateCheckbox.checked) {
            return; // Auto-generation not enabled
        }

        // Get current maxNum value (user might have changed it)
        const maxValue = maxNumInput ? parseInt(maxNumInput.value) : 1;
        const maxNum = Math.max(1, Math.min(10, maxValue || 1));

        if (!this.isAutoGenerating) {
            // Start auto-generation
            this.autoGenerationCounter = 0;
            this.autoGenerationMax = maxNum;
            this.isAutoGenerating = true;
            console.log(`🚀 Auto-generation started: ${this.autoGenerationMax} images`);
        }

        this.autoGenerationCounter++;
        console.log(`Generated ${this.autoGenerationCounter} of ${this.autoGenerationMax} images`);

        if (this.autoGenerationCounter < this.autoGenerationMax) {
            // Continue with next generation
            setTimeout(() => {
                this.generateNextImage();
            }, 1000);
        } else {
            // Reached max, stop auto-generation
            console.log('Auto-generation completed: reached maximum count');
            this.stopAutoGeneration();
        }
    }

    generateNextImage() {
        // Use the same validation as manual generation
        const validation = validateImageGeneration();

        if (!validation.valid) {
            console.log('Validation failed, stopping auto-generation');
            this.stopAutoGeneration();

            return;
        }

        console.log(`Auto-generating image ${this.autoGenerationCounter + 1} of ${this.autoGenerationMax}...`);

        const promptObj = {
            prompt: validation.prompt,
            promptId: Date.now().toString(),
            original: validation.prompt
        };

        if (typeof window.generateImage === 'function') {
            window.generateImage(promptObj.prompt, validation.providers).then(result => {
                console.log('Auto-generation image result:', result);

                // Check if we should continue
                this.checkAutoGenerationContinue();
            }).catch(error => {
                console.error('Auto-generation error:', error);
                this.stopAutoGeneration();
            });
        } else {
            console.error('generateImage function not available');
            this.stopAutoGeneration();
        }
    }

    // get module status
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

// missing legacy functions for backward compatibility
window.setupCustomVariables = function() {
    // this function was removed during refactoring but is still called
    // implementation can be added later if needed
    console.log('setupCustomVariables called - legacy function');
};

window.setupScrollLoading = function() {
    // this function was removed during refactoring but is still called
    // implementation can be added later if needed
    console.log('setupScrollLoading called - legacy function');
};

window.setupTextArea = function() {
    console.log('setupTextArea called - legacy function');
};

window.setupFeed = function() {
    console.log('setupFeed called - legacy function');
};

window.setupGuidanceDropDowns = function() {
    console.log('setupGuidanceDropDowns called - legacy function');
};

window.setupImageSearch = function() {
    console.log('setupImageSearch called - legacy function');
};

window.setupRating = function() {
    console.log('setupRating called - legacy function');
};

window.setupScrollTopBar = function() {
    console.log('setupScrollTopBar called - legacy function');
};

// Shared validation function for image generation
const validateImageGeneration = () => {
    const textArea = document.querySelector('#prompt-textarea');
    const selectedProviders = window.providerManager ? window.providerManager.getSelectedProviders() : [];

    // Check prompt
    if (!textArea || !textArea.value.trim()) {
        alert('Please enter a prompt');

        return { valid: false };
    }

    // Check providers - REQUIRED, no defaults
    if (selectedProviders.length === 0) {
        alert('Please select at least one provider');

        return { valid: false };
    }

    return {
        valid: true,
        prompt: textArea.value.trim(),
        providers: selectedProviders
    };
};

const handleGenerateClick = e => {
    e.preventDefault();

    console.log('Generate button clicked');

    // Validate inputs
    const validation = validateImageGeneration();

    if (!validation.valid) {
        return;
    }

    // create prompt object
    const promptObj = {
        prompt: validation.prompt,
        promptId: Date.now().toString(),
        original: validation.prompt
    };

    // call the generateImage function
    if (typeof window.generateImage === 'function') {
        console.log('Calling generateImage function');
        console.log('Selected providers:', validation.providers);

        // call generateImage with correct parameters
        window.generateImage(promptObj.prompt, validation.providers).then(result => {
            console.log('GenerateImage result:', result);

            // Check if auto-generation should continue
            if (window.app) {
                window.app.checkAutoGenerationContinue();
            }
        }).catch(error => {
            console.error('GenerateImage error:', error);
        });
    } else {
        console.error('generateImage function not found');
        alert('Image generation not available');
    }
};

// legacy variables for backward compatibility
window.setupFeedComplete = true;

// missing legacy functions for backward compatibility
window.convertPromptToUrl = function(prompt) {
    // simple implementation - can be enhanced later
    if (!prompt || prompt.trim() === '') {
        return null;
    }

    return `/prompt/build?prompt=${encodeURIComponent(prompt.trim())}`;
};

// initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', async() => {
    const app = new AppLoader();

    await app.init();

    // Debug: Check if generateImage function is available
    console.log('🔍 Checking generateImage availability:', {
        generateImage: typeof window.generateImage,
        imagesManager: typeof window.imagesManager,
        ImagesManager: typeof window.ImagesManager
    });

    // setup generate button after all modules are loaded
    if (typeof window.setupGenerate === 'function') {
        window.setupGenerate();
    }

    // make app available globally for debugging
    window.app = app;

    // Debug function for testing auto-generation
    window.testAutoGeneration = () => {
        console.log('🧪 Testing auto-generation...');
        console.log('App available:', !!window.app);
        console.log('Auto-generating state:', window.app && window.app.isAutoGenerating);
        console.log('Checkbox found:', !!document.querySelector('input[name="auto-generate"]'));
        console.log('Checkbox checked:', document.querySelector('input[name="auto-generate"]') && document.querySelector('input[name="auto-generate"]').checked);
        console.log('MaxNum value:', document.querySelector('input[name="maxNum"]') && document.querySelector('input[name="maxNum"]').value);

        if (window.app) {
            window.app.checkAutoGenerationContinue();
        }
    };
});
