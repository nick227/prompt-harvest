// legacy constants removed - now using ImageComponent

// eslint-disable-next-line no-unused-vars
const generateImage = async(promptObj, e = null) => {
    if (!isProviderSelected()) {
        alert('Must select at least one provider');

        return;
    }
    const text = promptObj.prompt;

    if (!text.length) {
        alert('Invalid Prompt');

        return;
    }
    // create immediate loading placeholder in the grid
    const loadingPlaceholder = createLoadingPlaceholder(promptObj);
    const container = document.querySelector('.prompt-output');

    if (container && loadingPlaceholder) {
        container.insertBefore(loadingPlaceholder, container.firstChild);
    }

    // update button state to show processing
    const generateBtn = document.querySelector('.btn-generate');

    if (generateBtn) {
        generateBtn.classList.add('processing');
        generateBtn.textContent = 'Generating...';
        generateBtn.disabled = true;
    }

    // /await new Promise(resolve => setTimeout(resolve, 2400000));
    const guidanceElmTop = document.querySelector('select[name="guidance-top"]');
    const guidanceValTop = guidanceElmTop.value;
    const guidanceElmBottom = document.querySelector('select[name="guidance-bottom"]');
    const guidanceValBottom = guidanceElmBottom.value;
    const guidanceVal = Math.abs(Math.floor(Math.random() * (parseInt(guidanceValTop) - parseInt(guidanceValBottom))) + parseInt(guidanceValBottom));
    const customVariables = getCustomVariables();
    const promptIdVal = promptObj.promptId;
    const originalVal = promptObj.original;

    const checkedProviders = Array.from(document.querySelectorAll('input[name="providers"]:checked')).map(input => input.value);

    // Get prompt enhancement parameters
    const multiplierInput = document.querySelector('#multiplier');
    const mixupCheckbox = document.querySelector('input[name="mixup"]');
    const mashupCheckbox = document.querySelector('input[name="mashup"]');

    const multiplier = multiplierInput ? multiplierInput.value.trim() : '';
    const mixup = mixupCheckbox ? mixupCheckbox.checked : false;
    const mashup = mashupCheckbox ? mashupCheckbox.checked : false;

    // Check if prompt contains variables that need processing
    const hasVariables = (/\$\{[^}]+\}/).test(text);

    console.log('Prompt enhancement parameters:', { multiplier, mixup, mashup, customVariables, hasVariables });

    // Send all parameters to backend for processing
    const data = {
        prompt: text,
        providers: checkedProviders,
        guidance: parseInt(guidanceVal),
        promptId: promptIdVal,
        original: originalVal,
        multiplier,
        mixup,
        mashup,
        customVariables
    };

    console.log('Sending data to server:', data);

    let results;

    try {
        console.log('API endpoint:', API_ENDPOINTS.IMAGE_GENERATE);
        const response = await fetch(API_ENDPOINTS.IMAGE_GENERATE, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        results = await response.json();
        console.log('Server response:', results);
    } catch (error) {
        console.error('Fetch error:', error);
        alert(`Error generating image: ${error.message}`);

        // remove loading placeholder on error
        const loadingPlaceholder = document.querySelector('.loading-placeholder');

        if (loadingPlaceholder) {
            loadingPlaceholder.remove();
        }

        // restore button state on error
        restoreButtonState();

        return null;
    }

    // setupStatsBar();
    // use ImageComponent instead of legacy addImageToOutput
    if (window.imageComponent && typeof window.imageComponent.createImageWrapper === 'function') {
        const imageData = {
            id: results.id || results.imageId || 'unknown',
            url: results.image || results.url || `uploads/${results.imageName}`,
            title: results.prompt || 'Image',
            prompt: results.prompt || '',
            original: results.original || '',
            provider: results.provider || results.providerName || '',
            guidance: results.guidance || '',
            rating: results.rating || ''
        };

        // replace loading placeholder with actual image
        const loadingPlaceholder = document.querySelector('.loading-placeholder');

        if (loadingPlaceholder) {
            const wrapper = window.imageComponent.createImageWrapper(imageData);

            loadingPlaceholder.innerHTML = '';
            loadingPlaceholder.appendChild(wrapper);
            loadingPlaceholder.classList.remove('loading-placeholder');
            restoreButtonState();

            // refresh feed to ensure new image persists
            if (window.feedManager && typeof window.feedManager.refreshFeed === 'function') {
                window.feedManager.refreshFeed();
            }

            return wrapper;
        } else {
            // fallback: create new li if no placeholder found
            const container = document.querySelector('.prompt-output');

            if (container) {
                const li = Utils.dom.createElement('li', 'image-item');
                const wrapper = window.imageComponent.createImageWrapper(imageData);

                li.appendChild(wrapper);
                container.insertBefore(li, container.firstChild);
                restoreButtonState();

                // refresh feed to ensure new image persists
                if (window.feedManager && typeof window.feedManager.refreshFeed === 'function') {
                    window.feedManager.refreshFeed();
                }

                return wrapper;
            }
        }
    }

    // if ImageComponent not ready, initialize it
    if (window.ImageComponent && !window.imageComponent) {
        window.imageComponent = new window.ImageComponent();
        window.imageComponent.init();

        const imageData = {
            id: results.id || results.imageId || 'unknown',
            url: results.image || results.url || `uploads/${results.imageName}`,
            title: results.prompt || 'Image',
            prompt: results.prompt || '',
            original: results.original || '',
            provider: results.provider || results.providerName || '',
            guidance: results.guidance || '',
            rating: results.rating || ''
        };

        // Use feed manager to add newly generated image (will be placed at top)
        if (window.feedManager && typeof window.feedManager.addImageToOutput === 'function') {
            // Create a result object that matches the expected format
            const result = {
                id: results.id || results.imageId || 'unknown',
                image: results.image || results.url || `uploads/${results.imageName}`,
                imageName: results.imageName,
                prompt: results.prompt || '',
                original: results.original || '',
                provider: results.provider || results.providerName || '',
                guidance: results.guidance || '',
                rating: results.rating || ''
            };

            // Remove loading placeholder
            const loadingPlaceholder = document.querySelector('.loading-placeholder');

            if (loadingPlaceholder) {
                loadingPlaceholder.remove();
            }

            // Add image using feed manager (will be placed at top)
            window.feedManager.addImageToOutput(result, true); // true = newly generated

            restoreButtonState();

            return true;
        } else {
            // fallback: use ImageComponent directly
            const loadingPlaceholder = document.querySelector('.loading-placeholder');

            if (loadingPlaceholder) {
                const wrapper = window.imageComponent.createImageWrapper(imageData);

                loadingPlaceholder.innerHTML = '';
                loadingPlaceholder.appendChild(wrapper);
                loadingPlaceholder.classList.remove('loading-placeholder');
                restoreButtonState();

                // refresh feed to ensure new image persists
                if (window.feedManager && typeof window.feedManager.refreshFeed === 'function') {
                    window.feedManager.refreshFeed();
                }

                return wrapper;
            } else {
                // fallback: create new li if no placeholder found
                const container = document.querySelector('.prompt-output');

                if (container) {
                    const li = Utils.dom.createElement('li', 'image-item');
                    const wrapper = window.imageComponent.createImageWrapper(imageData);

                    li.appendChild(wrapper);
                    container.insertBefore(li, container.firstChild);
                    restoreButtonState();

                    // refresh feed to ensure new image persists
                    if (window.feedManager && typeof window.feedManager.refreshFeed === 'function') {
                        window.feedManager.refreshFeed();
                    }

                    return wrapper;
                }
            }
        }
    }

    // fallback if ImageComponent not available
    toggleProcessingStyle(e);

    return null;
};

const createLoadingPlaceholder = promptObj => {
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

    promptPreview.textContent = promptObj.prompt.length > 30
        ? `${promptObj.prompt.substring(0, 30)}...`
        : promptObj.prompt;
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
};

const restoreButtonState = () => {
    const generateBtn = document.querySelector('.btn-generate');

    if (generateBtn) {
        generateBtn.classList.remove('processing');
        generateBtn.textContent = 'START';
        generateBtn.disabled = false;
    }
};

const refreshFeedWithDelay = () => {
    // refresh feed to ensure new image persists (with delay to allow server to save)
    if (window.feedManager && typeof window.feedManager.refreshFeed === 'function') {
        setTimeout(() => {
            window.feedManager.refreshFeed();
        }, 1000); // 1 second delay to ensure server has saved the image
    }
};

const getCustomVariables = () => {
    const variablesString = localStorage.getItem('variables');

    if (variablesString) {
        const variablesArr = JSON.parse(variablesString);
        const variables = variablesArr.map(variable => `${variable.variableName}=${variable.variableValues}`);

        return `&customVariables=${encodeURIComponent(variables.join(';'))}`;
    }

    return '';
};

// eslint-disable-next-line no-unused-vars
const disableGenerateButton = () => {
    const generateBtn = document.querySelector('.btn-generate');

    generateBtn.classList.add('processing');
    generateBtn.innerText = 'loading...';
    generateBtn.disabled = true;
};

// eslint-disable-next-line no-unused-vars
const enableGenerateButton = () => {
    const generateBtn = document.querySelector('.btn-generate');

    generateBtn.classList.remove('processing');
    generateBtn.innerText = 'Let\'s Go';
    generateBtn.disabled = false;
};

const toggleProcessingStyle = (e = null) => {
    // if e is a button or other element, find the first list item instead
    let currentPrompt;

    if (e && e.classList && e.classList.contains('btn-generate')) {
        // if it's the generate button, find the first list item
        currentPrompt = document.querySelector('.prompt-output li:first-child');
    } else if (e && e.classList) {
        // if it's a list item or has classList, use it
        currentPrompt = e;
    } else {
        // fallback to first list item
        currentPrompt = document.querySelector('.prompt-output li:first-child');
    }

    if (currentPrompt && currentPrompt.classList) {
        currentPrompt.classList.toggle('processing');
        currentPrompt.disabled = !currentPrompt.disabled;
    }
};

// legacy createImageElement function removed - now using ImageComponent

// eslint-disable-next-line no-unused-vars
const downloadImage = (img, results) => {
    const a = document.createElement('a');

    a.href = img.src;
    const fileName = decodeURIComponent(img.src.split('/').pop());

    a.download = fileName;
    a.click();
};

// legacy addImageToOutput function removed - now using ImageComponent directly

// eslint-disable-next-line no-unused-vars
const createTagElement = results => {
    if (!results.rating) {
        return;
    }
    const rating = document.createElement('div');

    rating.className = 'rating';
    rating.textContent = `Rating: ${results.rating}`;

    return rating;
};

// legacy attachImage function removed - now using ImageComponent

// legacy findPromptPreviewElement function removed - now using ImageComponent

// legacy displayImage function removed - now using ImageComponent

// legacy createWrapperElement function removed - now using ImageComponent

// export legacy functions to global scope for backward compatibility
// note: Legacy image functions removed - now using ImageComponent directly

// export required functions globally
window.isProviderSelected = isProviderSelected;
window.toggleProcessingStyle = toggleProcessingStyle;

// legacy toggleFullScreenThisImage function removed - now using ImageComponent directly

// eslint-disable-next-line no-unused-vars
const createNoteElement = results => {
    const note = document.createElement('h5');

    note.textContent = `${results.providerName}, ${results.guidance}`;

    return note;
};
