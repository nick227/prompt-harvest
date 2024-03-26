const IMAGE_MIME_TYPE = 'image/jpeg';
const IMAGE_OUTPUT_CLASS = '.image-output';
const IMAGE_WRAPPER_CLASS = 'image-wrapper';
const DOWNLOAD_PROMPT = 'Download';
const PREVIOUS_BUTTON_TEXT = 'Previous';
const NEXT_BUTTON_TEXT = 'Next';
const IMAGE_FULLSCREEN_CLASS = 'full-screen';
const IMAGE_CONTROLS_CLASS = 'fullscreen-controls';
const MAX_TITLE_CHARS = 124;

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
    const guidanceElmTop = document.querySelector('select[name="guidance-top"]');
    const guidanceValTop = guidanceElmTop.value;
    const guidanceElmBottom = document.querySelector('select[name="guidance-bottom"]');
    const guidanceValBottom = guidanceElmBottom.value;
    const guidanceVal = Math.floor(Math.random() * (parseInt(guidanceValTop) - parseInt(guidanceValBottom))) + parseInt(guidanceValBottom);
    const url = `/image/generate?prompt=${encodeURIComponent(text)}&providers=${encodeURIComponent(checkedProviders)}&guidance=${parseInt(guidanceVal)}`;
    const results = await fetch(url).then(res => res.json());
    addImageToOutput(results, true);
    toggleProcessingStyle(e);
}

function toggleProcessingStyle(e=null){
    const generateBtn = document.querySelector('.btn-generate');
    generateBtn.classList.toggle('processing');
    generateBtn.innerText = generateBtn.innerText === 'loading...' ? "Let's Go" : 'loading...';
    generateBtn.disabled = !generateBtn.disabled;

    const currentPrompt = e || document.querySelector('.prompt-output li:first-child');
    if(currentPrompt) {
        currentPrompt.classList.toggle('processing');
        currentPrompt.disabled = !currentPrompt.disabled;
    }
}

function createImageElementUrl(results) {
    const img = document.createElement('img');
    img.src = `images/${results.imageName}`;
    return img;
}

function createImageElement(results) {
    const img = document.createElement('img');
    img.src = `data:${IMAGE_MIME_TYPE};base64,${results.b64_json}`;
    return img;
}

function addImageToOutput(results, download=false) {
    const img = createImageElementUrl(results);
    displayImage(img, results);
    if(download === true){
        setupStatsBar();
        downloadImage(img, results);
    }
}

function getErrorMessage(results) {
    return `${results.b64_json.details?.error?.message}`;
}

function downloadImage(img, results) {
    const a = document.createElement('a');
    a.href = img.src;
    a.download = `${makeFileNameSafeForWindows(results.providerName +'-'+ results.prompt)}.jpg`;
    a.click();
}

function createButtonElement(results){
    const btn = document.createElement('button');
    btn.classList.add('btn-make');
    btn.innerText = 'make';
    btn.addEventListener('click', () => {
        generateImage(results.prompt, btn);
    });
    return btn;
}

function displayImage(img, results){
    const wrapper = createWrapperElement();
    const title = createTitleElement(results);
    const note = createNoteElement(results);
    const btn = createButtonElement(results);

    img.addEventListener("click", function(){
        if(isMobile()){
            downloadImage(img, results);
        } else {
            toggleFullScreenThisImage(wrapper);
        }
    });
    img.title = results.prompt;

    img.onload = () => {
        appendElementsToWrapper(wrapper, [img, btn, title, note]);
    }

    prependWrapperToTarget(wrapper);
}

function isMobile(){
    return window.innerWidth < 768;
}

function downloadThisImage(img){
    const a = document.createElement('a');
    a.href = img.src;
    a.download = img.src.split('/').pop();
    a.click();
}

function toggleFullScreenThisImage(wrapper){
    wrapper.classList.toggle(IMAGE_FULLSCREEN_CLASS);
    if(wrapper.classList.contains(IMAGE_FULLSCREEN_CLASS)){
        addKeyBoardListeners();
        addFullScreenControls();
    } else {
        removeKeyBoardListeners();
        removeFullScreenControls();
    }
}

function removeFullScreenControls(){
    const target = document.querySelector(`.${IMAGE_CONTROLS_CLASS}`);
    if(target){
        target.remove();
    }
}

function addFullScreenControls() {
    removeFullScreenControls();
    const controls = document.createElement('div');
    controls.className = IMAGE_CONTROLS_CLASS;

    const downloadBtn = getDownloadButton();
    const navBtns = getNavigateButtons();
    const closeBtn = getCloseButton();
    
    controls.appendChild(downloadBtn);
    controls.appendChild(navBtns);
    controls.appendChild(closeBtn);

    document.body.appendChild(controls);

}

function getCloseButton(){
    const btn = document.createElement('button');
    btn.innerText = 'Close';
    btn.addEventListener('click', function(){
        const wrapper = document.querySelector(`.${IMAGE_WRAPPER_CLASS}.${IMAGE_FULLSCREEN_CLASS}`);
        toggleFullScreenThisImage(wrapper);
    });
    return btn;
}

function getNavigateButtons(){
    const container = document.createElement('div');
    const nextBtn = document.createElement('button');
    nextBtn.className = 'next-btn';
    nextBtn.innerText = NEXT_BUTTON_TEXT;
    nextBtn.addEventListener('click', function(){
        const wrapper = document.querySelector(`.${IMAGE_WRAPPER_CLASS}.${IMAGE_FULLSCREEN_CLASS}`);
        navigateImages('next', wrapper);
    });
    container.appendChild(nextBtn);
    const prevBtn = document.createElement('button');
    prevBtn.innerText = PREVIOUS_BUTTON_TEXT;
    prevBtn.addEventListener('click', function(){
        const wrapper = document.querySelector(`.${IMAGE_WRAPPER_CLASS}.${IMAGE_FULLSCREEN_CLASS}`);
        navigateImages('prev', wrapper);
    });
    container.appendChild(prevBtn);

    return container;

}

function getDownloadButton(){
    const wrapper = document.querySelector(`.${IMAGE_WRAPPER_CLASS}.${IMAGE_FULLSCREEN_CLASS}`);
    const img = wrapper.querySelector('img');
    const downloadBtn = document.createElement('button');
    downloadBtn.innerText = DOWNLOAD_PROMPT;
    downloadBtn.addEventListener('click', function(){
        downloadThisImage(img);
    });
    return downloadBtn;

}

function keyupHandler(e){
    if(e.key === 'ArrowRight'){
        navigateImages('next', document.querySelector(`.${IMAGE_FULLSCREEN_CLASS}`));
    } else if(e.key === 'ArrowLeft'){
        navigateImages('prev', document.querySelector(`.${IMAGE_FULLSCREEN_CLASS}`));
    }
    if(e.key === 'Escape'){
        toggleFullScreenThisImage(document.querySelector(`.${IMAGE_FULLSCREEN_CLASS}`));
    }
}

function removeKeyBoardListeners(){
    window.removeEventListener('keyup', keyupHandler);
}

function addKeyBoardListeners(){
    window.addEventListener('keyup', keyupHandler);
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
    title.setAttribute('title', results.prompt);
    title.addEventListener('click', function(){
        navigator.clipboard.writeText(results.prompt);
    });
    return title;
}

function createNoteElement(results) {
    const note = document.createElement('h6');
    note.textContent = results.providerName + `, ${results.guidance}`;
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
    const maxChars = MAX_TITLE_CHARS;
    return prompt.length > maxChars ? prompt.slice(0, maxChars)+'...' : prompt
}