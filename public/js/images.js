const IMAGE_MIME_TYPE = 'image/jpeg';
const IMAGE_OUTPUT_CLASS = 'image-output';
const IMAGE_WRAPPER_CLASS = 'image-wrapper';
const IMAGE_CONTROLS_CLASS = 'fullscreen-controls';
const MAX_TITLE_CHARS = 124;
const CLOSE_ICON_HTML = '<i class="fas fa-times"></i>';
const PREV_ICON_HTML = '<i class="fas fa-arrow-left"></i>';
const NEXT_ICON_HTML = '<i class="fas fa-arrow-right"></i>';


async function generateImage(promptObj, e = null) {
    if (!isProviderSelected()) {
        alert("Must select at least one provider");
    } 
    const text = promptObj.prompt;
    if (!text.length) {
        alert("Invalid Prompt");
        return;
    }
    toggleProcessingStyle(e);

    ///await new Promise(resolve => setTimeout(resolve, 2400000));
    const guidanceElmTop = document.querySelector('select[name="guidance-top"]');
    const guidanceValTop = guidanceElmTop.value;
    const guidanceElmBottom = document.querySelector('select[name="guidance-bottom"]');
    const guidanceValBottom = guidanceElmBottom.value;
    const guidanceVal = Math.abs(Math.floor(Math.random() * (parseInt(guidanceValTop) - parseInt(guidanceValBottom))) + parseInt(guidanceValBottom));
    const customVariables = getCustomVariables();
    const promptIdVal = promptObj.promptId;
    const originalVal = promptObj.original;

    const checkedProviders = Array.from(document.querySelectorAll('input[name="providers"]:checked')).map(input => input.value);

    const data = {
        prompt: text,
        providers: checkedProviders,
        guidance: parseInt(guidanceVal),
        ...customVariables,
        promptId: promptIdVal,
        original: originalVal
    };

    const results = await fetch(API_IMAGE_GENERATE, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    }).then(res => res.json());

    setupStatsBar();
    addImageToOutput(results, true);
    toggleProcessingStyle(e);
}

function getCustomVariables() {
    const variablesString = localStorage.getItem('variables');
    if (variablesString) {
        const variablesArr = JSON.parse(variablesString);
        const variables = variablesArr.map((variable) => {
            return `${variable.variableName}=${variable.variableValues}`;
        });
        return `&customVariables=${encodeURIComponent(variables.join(';'))}`;
    }
    return '';
}

function toggleProcessingStyle(e = null) {
    const generateBtn = document.querySelector('.btn-generate');
    generateBtn.classList.toggle('processing');
    generateBtn.innerText = generateBtn.innerText === 'loading...' ? "Let's Go" : 'loading...';
    generateBtn.disabled = !generateBtn.disabled;

    const currentPrompt = e || document.querySelector('.prompt-output li:first-child');
    if (currentPrompt) {
        currentPrompt.classList.toggle('processing');
        currentPrompt.disabled = !currentPrompt.disabled;
    }
}

function createImageElement(results) {
    const img = document.createElement('img');
    img.dataset.src = `uploads/${results.imageName}`;
    img.dataset.id = results.id;
    return img;
}

function downloadImage(img, results) {
    const a = document.createElement('a');
    a.href = img.src;
    const fileName = decodeURIComponent(img.src.split('/').pop());
    a.download = fileName;
    a.click();
}

function addImageToOutput(results, download = false) {
    const img = createImageElement(results);
    const autoDownload = document.querySelector('input[name="autoDownload"]:checked');
    if (download === true && autoDownload) {
        img.onload = function() {
            downloadImage(img, results);
        }
    }
    const wrapper = createWrapperElement();
    const note = createNoteElement(results);
    wrapper.appendChild(note);
    attachImage(results, wrapper);
    img.dataset.rating = results.rating;
    wrapper.appendChild(img);

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                displayImage(img, results, wrapper); 
                observer.unobserve(entry.target);
            }
        });
    }, { rootMargin: '0px 0px 100px 0px' });

    observer.observe(img);
}

function createTagElement(results){
    if(!results.rating){
        return;
    }
    const rating = document.createElement('div');
    rating.className = 'rating';
    rating.textContent = `Rating: ${results.rating}`;
    return rating;
}

function attachImage(results, wrapper) {
    const target = findPromptPreviewElement(results);
    if (!target.querySelector('.' + IMAGE_OUTPUT_CLASS)) {
        const output = document.createElement('div');
        output.className = IMAGE_OUTPUT_CLASS;
        output.prepend(wrapper);
        target.prepend(output);
    } else {
        target.querySelector('.' + IMAGE_OUTPUT_CLASS).prepend(wrapper);
    }
    if (setupFeedComplete) {
        target.scrollIntoView({ behavior: "smooth" });
    }
}

function findPromptPreviewElement(results) {
    return document.querySelector('li[data-id="' + results.promptId + '"]');
}

function displayImage(img, results, wrapper) { // Accept wrapper as a parameter
    img.title = results.prompt;
    img.dataset.id = results.id;
    img.addEventListener("click", function () {
        if (!isDragging) {
            toggleFullScreenThisImage(wrapper);
        }
    });

    img.src = img.dataset.src;
    const downloadBtn = getDownloadButton(img);
    img.parentElement.appendChild(downloadBtn);
    
    //const addTagBtn = getTagButton(img);
    //const addTagList = getTagList(img);
    //img.parentElement.appendChild(addTagBtn);
    //img.parentElement.appendChild(addTagList);
    //updateTagList(img);
}

function getErrorMessage(results) {
    return `${results.b64_json.details?.error?.message}`;
}


function createWrapperElement() {
    const wrapper = document.createElement('div');
    wrapper.className = IMAGE_WRAPPER_CLASS;
    return wrapper;
}

function createNoteElement(results) {
    const note = document.createElement('h5');
    note.textContent = results.providerName + `, ${results.guidance}`;
    return note;
} 
