/* global userApi */
// Images Manager - Handles image generation and display
class ImagesManager {
    constructor() {
        this.config = IMAGE_CONFIG;
        this.isInitialized = false;
        this.isGenerating = false; // Guard against duplicate calls
    }

    init() {
        if (this.isInitialized) {
            return;
        }

        this.setupEventListeners();
        this.isInitialized = true;
    }

    setupEventListeners() {
        const generateBtn = document.querySelector('.btn-generate');

        if (generateBtn) {
            // Store bound function for proper event listener management
            if (!this.boundHandleGenerateClick) {
                this.boundHandleGenerateClick = this.handleGenerateClick.bind(this);
            }

            // Remove any existing listeners to avoid duplicates
            generateBtn.removeEventListener('click', this.boundHandleGenerateClick);

            // Add the click listener
            generateBtn.addEventListener('click', this.boundHandleGenerateClick);
        } else {
            console.error('❌ ImagesManager: Generate button not found');

            // Retry after a delay in case DOM is not ready
            setTimeout(() => {

                this.setupEventListeners();
            }, 1000);
        }
    }

    async generateImage(prompt, providers = []) {
        console.log('🚀 API CALL: generateImage started', { prompt, providers });
        const promptObj = {
            prompt,
            promptId: Date.now().toString(),
            original: prompt
        };

        console.log('🔧 API CALL: promptObj created', promptObj);
        try {
            console.log('🌐 API CALL: Calling backend API...');
            const resultData = await this.callImageGenerationAPI(prompt, promptObj, providers);

            console.log('✅ API RESPONSE: Received data', resultData);

            // Extract the actual image data from the response
            const imageData = resultData.data || resultData;

            console.log('✅ API RESPONSE: Extracted image data', imageData);

            const img = this.addImageToOutput(imageData, false);

            console.log('✅ DOM UPDATE: Image added to output', !!img);

            // Dispatch imageGenerated event for stats and other listeners
            window.dispatchEvent(new CustomEvent('imageGenerated', {
                detail: {
                    imageData,
                    timestamp: new Date().toISOString()
                }
            }));
            console.log('📡 EVENT: imageGenerated event dispatched');

            // Check if auto-generation should continue
            this.checkAutoGenerationContinue();

            return img;
        } catch (error) {
            console.error('❌ API ERROR: Generation failed', error);
            throw error;
        }
    }

    async callImageGenerationAPI(prompt, promptObj, providers) {
        const formData = this.createFormData(prompt, promptObj, providers);
        const jsonData = this.convertFormDataToJSON(formData);

        console.log('📤 HTTP REQUEST: Sending to', API_ENDPOINTS.IMAGE_GENERATE);
        console.log('📤 HTTP PAYLOAD:', jsonData);

        // Get auth headers for authenticated request
        const authHeaders = this.getAuthHeaders();

        console.log('🔑 AUTH: Request headers', authHeaders);

        const _results = await fetch(API_ENDPOINTS.IMAGE_GENERATE, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify(jsonData)
        });

        console.log('📥 HTTP RESPONSE: Status', _results.status, _results.statusText);
        if (!_results.ok) {
            console.error('❌ HTTP ERROR: Bad response', _results.status, _results.statusText);
            throw new Error(`HTTP error! status: ${_results.status}`);
        }

        const responseData = await _results.json();

        console.log('📥 HTTP RESPONSE: Data', responseData);
        console.log('📥 HTTP RESPONSE: Data.data structure', responseData.data);

        return responseData;
    }

    createFormData(prompt, promptObj, providers) {
        const formData = new FormData();

        formData.append('prompt', prompt);
        formData.append('providers', providers.join(','));
        formData.append('promptId', promptObj.promptId);
        formData.append('original', prompt);
        this.addGuidanceValues(formData);

        return formData;
    }

    addGuidanceValues(formData) {
        const guidanceTop = document.querySelector('select[name="guidance-top"]');
        const guidanceBottom = document.querySelector('select[name="guidance-bottom"]');

        if (guidanceTop && guidanceTop.value) {
            formData.append('guidance', guidanceTop.value);
        }
        if (guidanceBottom && guidanceBottom.value) {
            formData.append('guidance', guidanceBottom.value);
        }
    }

    convertFormDataToJSON(formData) {
        const jsonData = { /* Empty block */ };

        for (const [key, value] of formData.entries()) {
            jsonData[key] = value;
        }

        return jsonData;
    }

    getCustomVariables() {
        const variablesString = localStorage.getItem('variables');

        if (!variablesString) {
            return [];
        }

        const variablesArr = JSON.parse(variablesString);
        const variables = variablesArr.map(variable => {
            const values = variable.values.split(',').map(v => v.trim());
            const randomValue = values[Math.floor(Math.random() * values.length)];

            return { name: variable.name, value: randomValue };
        });

        return variables;
    }

    toggleProcessingStyle(e = null) {
        const currentPrompt = e || document.querySelector('.prompt-output li:first-child');

        if (currentPrompt) {
            currentPrompt.classList.toggle('processing');
        }
    }

    // Image Creation and Display
    createImageElement(_results) {

        const img = document.createElement('img');

        img.src = _results.image;
        img.alt = _results.prompt;
        img.title = _results.prompt;

        return img;
    }

    downloadImage(img, _results) {
        const a = document.createElement('a');
        const fileName = decodeURIComponent(img.src.split('/').pop());

        a.href = img.src;
        a.download = fileName;
        a.click();
    }

    addImageToOutput(_results, download = false) {
        console.log('🖼️ DOM INSERT: addImageToOutput called', { _results, download });
        const img = this.createImageElement(_results);

        console.log('🖼️ DOM INSERT: Image element created', !!img);
        this.handleAutoDownload(img, _results, download);
        const wrapper = this.createWrapperWithObserver(img);

        console.log('🖼️ DOM INSERT: Wrapper created with observer', !!wrapper);

        this.insertImageIntoDOM(wrapper);
        console.log('🖼️ DOM INSERT: Image inserted into DOM');

        return img;
    }

    handleAutoDownload(img, results, download) {
        const autoDownload = document.querySelector('input[name="autoDownload"]:checked');

        if (download && autoDownload) {

            this.downloadImage(img, results);
        }
    }

    createWrapperWithObserver(img) {
        const wrapper = this.createWrapperElement();
        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {

                    entry.target.classList.add('loaded');
                    observer.unobserve(entry.target);
                }
            });
        });

        wrapper.appendChild(img);
        observer.observe(img);

        return wrapper;
    }

    insertImageIntoDOM(wrapper) {
        const imagesSection = Utils.dom.get(this.config.selectors.imageContainer);

        if (imagesSection) {

            this.replaceOrInsertImage(wrapper, imagesSection);
        } else {
            console.error('❌ Images section not found!');
        }
    }

    replaceOrInsertImage(wrapper, imagesSection) {
        const loadingPlaceholder = document.querySelector('.loading-placeholder');

        if (loadingPlaceholder) {
            loadingPlaceholder.innerHTML = '';
            loadingPlaceholder.appendChild(wrapper);
            loadingPlaceholder.classList.remove('loading-placeholder');
        } else {
            this.insertAtBeginning(wrapper, imagesSection);
        }
    }

    insertAtBeginning(wrapper, imagesSection) {
        if (imagesSection.firstChild) {
            imagesSection.insertBefore(wrapper, imagesSection.firstChild);
        } else {
            imagesSection.appendChild(wrapper);
        }

    }

    createWrapperElement() {
        const wrapper = document.createElement('div');

        wrapper.className = this.config.classes.imageWrapper;

        return wrapper;
    }

    createLoadingPlaceholder(promptObj) {
        const li = Utils.dom.createElement('li', 'image-item loading-placeholder');
        const wrapper = Utils.dom.createElement('div', 'image-wrapper loading');

        wrapper.style.width = '100%';
        wrapper.style.height = '150px';
        wrapper.style.display = 'flex';
        wrapper.style.justifyContent = 'center';
        wrapper.style.alignItems = 'center';
        wrapper.style.backgroundColor = '#f5f5f5';
        wrapper.style.borderRadius = '3px';
        wrapper.style.position = 'relative';
        wrapper.style.border = '2px dashed #ccc';
        const loadingContent = Utils.dom.createElement('div', 'loading-content');

        loadingContent.style.textAlign = 'center';
        loadingContent.style.color = '#666';

        const spinner = Utils.dom.createElement('div', 'spinner');

        spinner.innerHTML = '⏳';
        spinner.style.fontSize = '24px';
        spinner.style.marginBottom = '8px';
        spinner.style.animation = 'spin 1s linear infinite';
        const text = Utils.dom.createElement('div', 'loading-text');

        text.textContent = 'Generating...';
        text.style.fontSize = '12px';
        text.style.fontWeight = 'bold';
        const promptPreview = Utils.dom.createElement('div', 'prompt-preview');

        promptPreview.textContent = promptObj.prompt.length > 30 ?
            `${promptObj.prompt.substring(0, 30)}...` :
            promptObj.prompt;
        promptPreview.style.fontSize = '10px';
        promptPreview.style.marginTop = '4px';
        promptPreview.style.color = '#999';

        loadingContent.appendChild(spinner);
        loadingContent.appendChild(text);
        loadingContent.appendChild(promptPreview);
        wrapper.appendChild(loadingContent);
        li.appendChild(wrapper);

        return li;
    }

    showLoadingPlaceholder(promptObj) {
        const _container = document.querySelector('.prompt-output');

        if (_container) {
            const loadingPlaceholder = this.createLoadingPlaceholder(promptObj);

            _container.insertBefore(loadingPlaceholder, _container.firstChild);

            return loadingPlaceholder;
        }

        return null;
    }

    removeLoadingPlaceholder() {
        const loadingPlaceholder = document.querySelector('.loading-placeholder');

        if (loadingPlaceholder) {
            loadingPlaceholder.remove();
        }
    }

    disableGenerateButton() {
        const generateBtn = document.querySelector('.btn-generate');

        if (generateBtn) {
            generateBtn.classList.add('processing');
            generateBtn.textContent = 'Generating...';
            generateBtn.disabled = true;
            generateBtn.style.cssText = `
                opacity: 0.7;
        cursor: not-allowed;
                animation: processing 1.5s ease-in-out infinite;
            `;
        }
    }

    enableGenerateButton() {
        const generateBtn = document.querySelector('.btn-generate');

        if (generateBtn) {
            generateBtn.classList.remove('processing');
            generateBtn.textContent = 'START';
            generateBtn.disabled = false;
            generateBtn.style.cssText = `
                opacity: 1;
        cursor: pointer;
                animation: none;
            `;
        }
    }

    // Event Handlers
    async handleGenerateClick(e) {
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        console.log(`🎯 GENERATION FLOW [${requestId}]: Button clicked`);
        e.preventDefault();

        // Guard against duplicate calls
        if (this.isGenerating) {
            console.log(`⚠️ DUPLICATE CALL [${requestId}]: Generation already in progress, ignoring`);

            return;
        }

        // Validate providers selection
        if (!this.isProviderSelected()) {
            console.log('❌ VALIDATION: No providers selected');
            console.warn('⚠️ Please select at least one AI provider before generating images.');

            return;
        }

        // Validate prompt input
        const prompt = this.getCurrentPrompt();

        if (!prompt) {
            console.log('❌ VALIDATION: No prompt entered');
            console.warn('⚠️ Please enter a prompt in the text area before generating images.');

            return;
        }

        console.log('✅ VALIDATION: All checks passed', { prompt, providers: this.getSelectedProviders() });
        const promptObj = {
            prompt,
            promptId: Date.now().toString(),
            original: prompt
        };

        console.log('🔧 FLOW: Creating promptObj', promptObj);
        const loadingPlaceholder = this.showLoadingPlaceholder(promptObj);

        console.log('🔧 FLOW: Loading placeholder created', !!loadingPlaceholder);
        this.disableGenerateButton();
        console.log('🔧 FLOW: Button disabled');
        try {
            const _providers = this.getSelectedProviders();

            console.log('🔧 FLOW: Starting generateImage', { prompt, _providers });
            await this.generateImage(prompt, _providers);
            console.log('✅ FLOW: generateImage completed successfully');
        } catch (error) {
            console.error('❌ FLOW: generateImage failed', error);
            console.warn('Image generation failed. Please try again.');
            this.removeLoadingPlaceholder();
        } finally {
            this.enableGenerateButton();
            console.log('🔧 FLOW: Button re-enabled');
        }
    }

    isProviderSelected() {
        const checkedProviders = Array.from(
            document.querySelectorAll('input[name="providers"]:checked')
        );

        return checkedProviders.length > 0;
    }

    getCurrentPrompt() {
        const textarea = document.querySelector('#prompt-textarea');

        return textarea ? textarea.value.trim() : '';
    }

    getSelectedProviders() {
        const checkedProviders = Array.from(
            document.querySelectorAll('input[name="providers"]:checked')
        );

        return checkedProviders.map(input => input.value);
    }

    getAuthHeaders() {
        const headers = { 'Content-Type': 'application/json' };

        // Use existing userApi for authentication if available
        if (window.userApi && window.userApi.isAuthenticated()) {
            const token = window.userApi.getAuthToken();

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
                console.log('🔑 AUTH: Using userApi token');
            } else {
                console.log('⚠️ AUTH: userApi authenticated but no token found');
            }
        } else {
            console.log('⚠️ AUTH: userApi not available or not authenticated');
            console.log('🔍 AUTH DEBUG: userApi exists:', !!window.userApi);
            if (window.userApi) {
                console.log('🔍 AUTH DEBUG: userApi.isAuthenticated():', window.userApi.isAuthenticated());
            }
        }

        return headers;
    }

    getAuthToken() {
        const localToken = localStorage.getItem('authToken');
        const sessionToken = sessionStorage.getItem('authToken');

        console.log('🔍 AUTH DEBUG: localStorage authToken:', localToken ? 'EXISTS' : 'NOT FOUND');
        console.log('🔍 AUTH DEBUG: sessionStorage authToken:', sessionToken ? 'EXISTS' : 'NOT FOUND');

        // Check all possible token storage keys
        const allKeys = Object.keys(localStorage);

        console.log('🔍 AUTH DEBUG: All localStorage keys:', allKeys);

        return localToken || sessionToken;
    }

    // Public API methods
    initialize() {
        this.init();
    }

    refresh() {
        this.setupEventListeners();
    }

    // Export functions for global access (maintaining backward compatibility)
    generateImageGlobal(prompt, _providers) {
        return this.generateImage(prompt, _providers);
    }

    addImageToOutputGlobal(_results, download) {
        return this.addImageToOutput(_results, download);
    }

    // Auto-generation continuation check
    checkAutoGenerationContinue() {
        console.log('🔄 AUTO-GENERATE: Checking if auto-generation should continue');

        // Skip auto-generation check if this was triggered by auto-generation itself
        if (window.generationComponent && window.generationComponent.manager && window.generationComponent.manager.isAutoGeneratedClick) {
            console.log('🔄 AUTO-GENERATE: Skipping check - this was an auto-generated click');

            return;
        }

        // Check if generation component is available
        if (window.generationComponent && window.generationComponent.checkAutoGenerationContinue) {
            console.log('🔄 AUTO-GENERATE: Calling generation component checkAutoGenerationContinue');
            window.generationComponent.checkAutoGenerationContinue();
        } else {
            console.log('⚠️ AUTO-GENERATE: Generation component not available');
        }
    }
}

// Initialize Images Manager
const imagesManager = new ImagesManager();

// Wait for DOM to be ready before initializing
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        imagesManager.init();
    });
} else {
    imagesManager.init();
}

// Export functions for global access (maintaining backward compatibility)
const generateImage = (prompt, _providers) => imagesManager.generateImage(prompt, _providers);
const addImageToOutput = (_results, download) => imagesManager.addImageToOutput(_results, download);

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImagesManager;
}

// Export for global access
if (typeof window !== 'undefined') {
    window.ImagesManager = ImagesManager;
    window.imagesManager = imagesManager;
    window.generateImage = generateImage;
    window.addImageToOutput = addImageToOutput;

    // Add test function for debugging
    window.testImagesManagerButton = () => {

        const _btn = document.querySelector('.btn-generate');

        if (_btn) {

            _btn.click();
        } else {
            console.error('❌ Button not found');
        }
    };
}
