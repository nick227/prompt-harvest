const IMAGE_MIME_TYPE = 'image/jpeg';
const IMAGE_OUTPUT_CLASS = '.image-output';
const IMAGE_WRAPPER_CLASS = 'image-wrapper';
const DOWNLOAD_PROMPT = 'Click to download: ';
const IMAGE_FULLSCREEN_CLASS = 'full-screen';

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

    img.addEventListener("click", toggleFullScreenThisImage);
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

function toggleFullScreenThisImage(e){
    const img = e.target;
    const wrapper = img.closest(`.${IMAGE_WRAPPER_CLASS}`);
    wrapper.classList.toggle(IMAGE_FULLSCREEN_CLASS);
    if(wrapper.classList.contains(IMAGE_FULLSCREEN_CLASS)){
        addFullScreenControls(wrapper);
    } else {
        clearFullScreenControls();
    }
}

function clearFullScreenControls(){
    const controls = document.querySelector('.fullscreen-controls');
    if(controls){
        controls.remove();
    }
}

function addFullScreenControls(currentImageWrapper) {
    clearFullScreenControls();
    // Create next and previous buttons
    const wrapper = document.createElement('div');
    wrapper.className = 'fullscreen-controls';
    const nextButton = document.createElement('button');
    const prevButton = document.createElement('button');

    // Add text to buttons
    nextButton.textContent = 'Next';
    prevButton.textContent = 'Previous';

    // Add event listeners to buttons
    nextButton.addEventListener('click', () => navigateImages('next', currentImageWrapper));
    prevButton.addEventListener('click', () => navigateImages('prev', currentImageWrapper));

    // Add buttons to image wrapper
    wrapper.appendChild(prevButton);
    wrapper.appendChild(nextButton);
    currentImageWrapper.appendChild(wrapper);
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

    // Add fullscreen controls to the new image wrapper
    addFullScreenControls(imageWrappers[newIndex]);
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