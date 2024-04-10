const IMAGE_MIME_TYPE = 'image/jpeg';
const IMAGE_OUTPUT_CLASS = 'image-output';
const IMAGE_WRAPPER_CLASS = 'image-wrapper';
const IMAGE_FULLSCREEN_CLASS = 'full-screen';
const IMAGE_CONTROLS_CLASS = 'fullscreen-controls';
const MAX_TITLE_CHARS = 124;
const LIKE_BTN_HTML = '<i class="fas fa-heart"></i>';
const DOWNLOAD_BTN_HTML = '<i class="fas fa-download"></i>';
const CLOSE_ICON_HTML = '<i class="fas fa-times"></i>';
const PREV_ICON_HTML = '<i class="fas fa-arrow-left"></i>';
const NEXT_ICON_HTML = '<i class="fas fa-arrow-right"></i>';

async function generateImage(promptObj, e = null) {
    const text = promptObj.prompt;
    const checkedProviders = Array.from(document.querySelectorAll('input[name="providers"]:checked')).map(input => input.value);
    if (!checkedProviders.length) {
        alert("Please select at least one provider");
        return;
    }
    if (!text.length) {
        alert("Invalid Prompt");
        return;
    }
    toggleProcessingStyle(e);
    const guidanceElmTop = document.querySelector('select[name="guidance-top"]');
    const guidanceValTop = guidanceElmTop.value;
    const guidanceElmBottom = document.querySelector('select[name="guidance-bottom"]');
    const guidanceValBottom = guidanceElmBottom.value;
    const guidanceVal = Math.abs(Math.floor(Math.random() * (parseInt(guidanceValTop) - parseInt(guidanceValBottom))) + parseInt(guidanceValBottom));
    const customVariables = getCustomVariables();
    const promptIdVal = promptObj.promptId;
    const originalVal = promptObj.original;

    const url = `/image/generate`;

    const data = {
        prompt: text,
        providers: checkedProviders,
        guidance: parseInt(guidanceVal),
        ...customVariables,
        promptId: promptIdVal,
        original: originalVal
    };

    const results = await fetch(url, {
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

function addImageToOutput(results, download = false) {
    const img = createImageElement(results);
    const autoDownload = document.querySelector('input[name="autoDownload"]:checked');
    if (download === true && autoDownload) {
        downloadImage(img, results);
    }
    const wrapper = createWrapperElement();
    const note = createNoteElement(results);
    wrapper.appendChild(note);
    attachImage(results, wrapper);
    wrapper.appendChild(img);
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                displayImage(img, results, wrapper); // Pass wrapper as a parameter
                observer.unobserve(entry.target);
            }
        });
    }, { rootMargin: '0px 0px 100px 0px' });

    observer.observe(img);
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
        ////wrapper.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
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

}

function downloadImage(img, results) {
    const a = document.createElement('a');
    a.href = img.src;
    a.download = `${makeFileNameSafeForWindows(results.providerName + '-' + results.prompt)}.jpg`;
    a.click();
}

function downloadThisImage(img) {
    const a = document.createElement('a');
    a.href = img.src;
    a.download = img.src.split('/').pop();
    a.click();
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
