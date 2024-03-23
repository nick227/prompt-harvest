const IMAGE_MIME_TYPE = 'image/jpeg';
const IMAGE_OUTPUT_CLASS = '.image-output';
const IMAGE_WRAPPER_CLASS = 'image-wrapper';
const DOWNLOAD_PROMPT = 'Click to download: ';
const IMAGE_FULLSCREEN_CLASS = 'full-screen';

async function generateImage(text, e=null){
    const checkedProviders = Array.from(document.querySelectorAll('input[name="providers"]:checked')).map(input => input.value);
    if(!checkedProviders.length){
        alert("Please select at least one provider");
        return;
    }
    if(!text.length){
        alert("Invalid Prompt");
        return;
    }
    toggleProcessingStyle(e);
    const guidanceElm = document.querySelector('select[name="guidance"]');
    const guidanceVal = guidanceElm.value;
    const url = `/image/generate?prompt=${encodeURIComponent(text)}&providers=${encodeURIComponent(checkedProviders)}&guidance=${parseInt(guidanceVal)}`;
    const results = await fetch(url).then(res => res.json());
    addImageB64ToOutput(results, true);
    toggleProcessingStyle(e);
}

function toggleProcessingStyle(e=null){
    const generateBtn = document.querySelector('.btn-generate');
    const currentPrompt = e || document.querySelector('.prompt-output li:first-child');
    generateBtn.classList.toggle('processing');
    currentPrompt.classList.toggle('processing');
    generateBtn.innerText = generateBtn.innerText === 'loading...' ? "Let's Go" : 'loading...';
    generateBtn.disabled = !generateBtn.disabled;
    currentPrompt.disabled = !currentPrompt.disabled;
}

function addImageB64ToOutput(results, download=false) {
    if(isErrorInResults(results)){
        alert(getErrorMessage(results));
        return;
    }
    const img = createImageElement(results);
    displayImage(img, results);
    if(download === true){
        setupStatsBar();
        downloadImage(img, results);
    }
}

function isErrorInResults(results) {
    return typeof results.b64_json === 'object' || typeof results.b64_json.error === 'string';
}

function getErrorMessage(results) {
    return `${results.b64_json.details?.error?.message}`;
}

function createImageElement(results) {
    const img = document.createElement('img');
    img.src = `data:${IMAGE_MIME_TYPE};base64,${results.b64_json}`;
    return img;
}

function downloadImage(img, results) {
    const a = document.createElement('a');
    a.href = img.src;
    a.download = `${makeFileNameSafeForWindows(results.providerName +'-'+ results.prompt)}.jpg`;
    a.click();
}

function displayImage(img, results){
    const wrapper = createWrapperElement();
    const title = createTitleElement(results);
    const note = createNoteElement(results);

    wrapper.addEventListener("click", function(){
        toggleFullScreenThisImage(wrapper);
    });
    img.title = results.prompt;

    img.onload = () => {
        appendElementsToWrapper(wrapper, [img, title, note]);
    }

    prependWrapperToTarget(wrapper);
}

function downloadThisImage(e){
    const img = e.target;
    const a = document.createElement('a');
    a.href = img.src;
    a.download = img.src.split('/').pop();
    a.click();
}

function toggleFullScreenThisImage(wrapper){
    wrapper.classList.toggle(IMAGE_FULLSCREEN_CLASS);
    if(wrapper.classList.contains(IMAGE_FULLSCREEN_CLASS)){
        addKeyBoardListeners();
    } else {
        removeKeyBoardListeners();
    }
}

function removeKeyBoardListeners(){
    window.removeEventListener('keyup', (e) => {
        if(e.key === 'ArrowRight'){
            navigateImages('next', document.querySelector(`.${IMAGE_FULLSCREEN_CLASS}`));
        } else if(e.key === 'ArrowLeft'){
            navigateImages('prev', document.querySelector(`.${IMAGE_FULLSCREEN_CLASS}`));
        }
        if(e.key === 'Escape'){
            toggleFullScreenThisImage(document.querySelector(`.${IMAGE_FULLSCREEN_CLASS}`));
        }
    });
}

function addKeyBoardListeners(){
    window.addEventListener('keyup', (e) => {
        if(e.key === 'ArrowRight'){
            navigateImages('next', document.querySelector(`.${IMAGE_FULLSCREEN_CLASS}`));
        } else if(e.key === 'ArrowLeft'){
            navigateImages('prev', document.querySelector(`.${IMAGE_FULLSCREEN_CLASS}`));
        }
        if(e.key === 'Escape'){
            toggleFullScreenThisImage(document.querySelector(`.${IMAGE_FULLSCREEN_CLASS}`));
        }
    });
}

function navigateImages(direction, currentImageWrapper) {
    // Get all image wrappers
    const imageWrappers = Array.from(document.getElementsByClassName(IMAGE_WRAPPER_CLASS));

    // Find the index of the current image wrapper
    const currentIndex = imageWrappers.indexOf(currentImageWrapper);

    // Determine the index of the next or previous image wrapper
    let newIndex;
    if (direction === 'next') {
        newIndex = (currentIndex + 1) % imageWrappers.length;
    } else if (direction === 'prev') {
        newIndex = (currentIndex - 1 + imageWrappers.length) % imageWrappers.length;
    }

    // Remove fullscreen class from current image wrapper and add it to the new one
    currentImageWrapper.classList.remove(IMAGE_FULLSCREEN_CLASS);
    imageWrappers[newIndex].classList.add(IMAGE_FULLSCREEN_CLASS);

}

function createWrapperElement() {
    const wrapper = document.createElement('div');
    wrapper.className = IMAGE_WRAPPER_CLASS;
    return wrapper;
}

function createTitleElement(results) {
    const title = document.createElement('h3');
    title.textContent = truncatePrompt(results.prompt);
    title.addEventListener('click', function(){
        navigator.clipboard.writeText(results.prompt);
    });
    return title;
}

function createNoteElement(results) {
    const note = document.createElement('h6');
    note.textContent = results.providerName;
    return note;
}

function appendElementsToWrapper(wrapper, elements) {
    elements.forEach(element => wrapper.appendChild(element));
}

function prependWrapperToTarget(wrapper) {
    const target = document.querySelector(IMAGE_OUTPUT_CLASS);
    target.prepend(wrapper);
}

function truncatePrompt(prompt){
    const maxChars = 24;
    return prompt.length > maxChars ? prompt.slice(0, maxChars)+'...' : prompt
}