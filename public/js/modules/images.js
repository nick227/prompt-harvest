// images Manager - Handles image generation and display
class ImagesManager {
    constructor() {
        this.config = IMAGE_CONFIG;
        this.isInitialized = false;
    }

    init() {
        this.setupEventListeners();
        this.isInitialized = true;
    }

    setupEventListeners() {
        const generateBtn = Utils.dom.get(this.config.selectors.generateBtn);

        if (generateBtn && typeof generateBtn.addEventListener === 'function') {
            generateBtn.addEventListener('click', e => this.handleGenerateClick(e));
        }
    }

    async generateImage(prompt, providers = []) {
        console.log('generateImage called with:', { prompt, providers });

        const promptObj = {
            prompt,
            promptId: Date.now().toString(),
            original: prompt
        };

        this.showLoadingPlaceholder(promptObj);
        this.disableGenerateButton();

        try {
            const resultData = await this.callImageGenerationAPI(prompt, promptObj, providers);
            const img = this.addImageToOutput(resultData, false);

            console.log('✅ Image added to output:', img);

            return img;
        } catch (error) {
            console.error('❌ Error generating image:', error);
            alert(`Error generating image: ${error.message}`);
            this.removeLoadingPlaceholder();
            throw error;
        } finally {
            this.enableGenerateButton();
        }
    }

    async callImageGenerationAPI(prompt, promptObj, providers) {
        const formData = this.createFormData(prompt, promptObj, providers);
        const jsonData = this.convertFormDataToJSON(formData);

        console.log('🌐 Making API request to:', API_ENDPOINTS.IMAGE_GENERATE);

        const results = await fetch(API_ENDPOINTS.IMAGE_GENERATE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(jsonData)
        });

        if (!results.ok) {
            throw new Error(`HTTP error! status: ${results.status}`);
        }

        return await results.json();
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
        const jsonData = {};

        for (const [key, value] of formData.entries()) {
            jsonData[key] = value;
        }
        console.log('Sending JSON data:', jsonData);

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

    // image Creation and Display
    createImageElement(results) {
        console.log('🎨 createImageElement called with results:', results);
        console.log('🎨 results.image:', results.image);
        console.log('🎨 results.prompt:', results.prompt);

        const img = document.createElement('img');

        img.src = results.image;
        img.alt = results.prompt;
        img.title = results.prompt;

        console.log('🎨 Created img element with src:', img.src);

        return img;
    }

    // eslint-disable-next-line no-unused-vars
    downloadImage(img, results) {
        const a = document.createElement('a');
        const fileName = decodeURIComponent(img.src.split('/').pop());

        a.href = img.src;
        a.download = fileName;
        a.click();
    }

    addImageToOutput(results, download = false) {
        console.log('🖼️ addImageToOutput called with results:', results);

        const img = this.createImageElement(results);

        this.handleAutoDownload(img, results, download);
        const wrapper = this.createWrapperWithObserver(img);

        this.insertImageIntoDOM(wrapper);

        return img;
    }

    handleAutoDownload(img, results, download) {
        const autoDownload = document.querySelector('input[name="autoDownload"]:checked');

        console.log('📥 Auto download checked:', !!autoDownload);

        if (download && autoDownload) {
            console.log('📥 Downloading image...');
            this.downloadImage(img, results);
        }
    }

    createWrapperWithObserver(img) {
        const wrapper = this.createWrapperElement();

        console.log('📦 Created wrapper element:', wrapper);

        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    console.log('👁️ Image became visible, adding loaded class');
                    entry.target.classList.add('loaded');
                    observer.unobserve(entry.target);
                }
            });
        });

        wrapper.appendChild(img);
        console.log('📦 Appended image to wrapper');
        observer.observe(img);
        console.log('👁️ Set up intersection observer for image');

        return wrapper;
    }

    insertImageIntoDOM(wrapper) {
        const imagesSection = Utils.dom.get(this.config.selectors.imageContainer);

        console.log('📂 Images section found:', !!imagesSection);

        if (imagesSection) {
            console.log('📂 Inserting wrapper at beginning of images section...');
            this.replaceOrInsertImage(wrapper, imagesSection);
        } else {
            console.error('❌ Images section not found!');
        }
    }

    replaceOrInsertImage(wrapper, imagesSection) {
        const loadingPlaceholder = document.querySelector('.loading-placeholder');

        if (loadingPlaceholder) {
            console.log('🔄 Replacing loading placeholder with image...');
            loadingPlaceholder.innerHTML = '';
            loadingPlaceholder.appendChild(wrapper);
            loadingPlaceholder.classList.remove('loading-placeholder');
            console.log('✅ Successfully replaced loading placeholder with image');
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
        console.log('✅ Successfully added image to DOM at first position');
    }

    createWrapperElement() {
        const wrapper = document.createElement('div');

        wrapper.className = this.config.classes.imageWrapper;

        return wrapper;
    }

    createLoadingPlaceholder(promptObj) {
        const li = Utils.dom.createElement('li', 'image-item loading-placeholder');

        // create loading wrapper
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

        // create loading content
        const loadingContent = Utils.dom.createElement('div', 'loading-content');

        loadingContent.style.textAlign = 'center';
        loadingContent.style.color = '#666';

        // add spinner
        const spinner = Utils.dom.createElement('div', 'spinner');

        spinner.innerHTML = '⏳';
        spinner.style.fontSize = '24px';
        spinner.style.marginBottom = '8px';
        spinner.style.animation = 'spin 1s linear infinite';

        // add text
        const text = Utils.dom.createElement('div', 'loading-text');

        text.textContent = 'Generating...';
        text.style.fontSize = '12px';
        text.style.fontWeight = 'bold';

        // add prompt preview
        const promptPreview = Utils.dom.createElement('div', 'prompt-preview');

        promptPreview.textContent = promptObj.prompt.length > 30 ?
            `${promptObj.prompt.substring(0, 30)}...` :
            promptObj.prompt;
        promptPreview.style.fontSize = '10px';
        promptPreview.style.marginTop = '4px';
        promptPreview.style.color = '#999';

        // assemble
        loadingContent.appendChild(spinner);
        loadingContent.appendChild(text);
        loadingContent.appendChild(promptPreview);
        wrapper.appendChild(loadingContent);
        li.appendChild(wrapper);

        return li;
    }

    showLoadingPlaceholder(promptObj) {
        const container = document.querySelector('.prompt-output');

        if (container) {
            const loadingPlaceholder = this.createLoadingPlaceholder(promptObj);

            container.insertBefore(loadingPlaceholder, container.firstChild);

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

    // event Handlers
    async handleGenerateClick(e) {
        e.preventDefault();

        if (!this.isProviderSelected()) {
            alert('Please select at least one provider');

            return;
        }

        const prompt = this.getCurrentPrompt();

        if (!prompt) {
            alert('Please enter a prompt');

            return;
        }

        // Create prompt object for loading placeholder
        const promptObj = {
            prompt,
            promptId: Date.now().toString(),
            original: prompt
        };

        // Show loading placeholder immediately
        const loadingPlaceholder = this.showLoadingPlaceholder(promptObj);

        // Disable button with motion
        this.disableGenerateButton();

        try {
            const providers = this.getSelectedProviders();

            await this.generateImage(prompt, providers);
        } catch (error) {
            alert('Image generation failed. Please try again.');
            // Remove loading placeholder on error
            this.removeLoadingPlaceholder();
        } finally {
            this.enableGenerateButton();
        }
    }

    isProviderSelected() {
        const checkedProviders = Array.from(
            document.querySelectorAll('input[name="providers"]:checked')
        );

        return checkedProviders.length > 0;
    }

    getCurrentPrompt() {
        const textarea = Utils.dom.get(this.config.selectors.textarea);

        return textarea ? textarea.value.trim() : '';
    }

    getSelectedProviders() {
        const checkedProviders = Array.from(
            document.querySelectorAll('input[name="providers"]:checked')
        );

        return checkedProviders.map(input => input.value);
    }

    // public API methods
    initialize() {
        this.init();
    }

    refresh() {
        this.setupEventListeners();
    }

    // export functions for global access (maintaining backward compatibility)
    generateImageGlobal(prompt, providers) {
        return this.generateImage(prompt, providers);
    }

    addImageToOutputGlobal(results, download) {
        return this.addImageToOutput(results, download);
    }
}

// initialize Images Manager
const imagesManager = new ImagesManager();

imagesManager.init(); // Ensure it's initialized immediately

// export functions for global access (maintaining backward compatibility)
const generateImage = (prompt, providers) => imagesManager.generateImage(prompt, providers);

const addImageToOutput = (results, download) => imagesManager.addImageToOutput(results, download);

// export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImagesManager;
}

// export for global access
if (typeof window !== 'undefined') {
    window.ImagesManager = ImagesManager;
    window.imagesManager = imagesManager;
    window.generateImage = generateImage;
    window.addImageToOutput = addImageToOutput;
}
