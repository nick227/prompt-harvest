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

async function generateImage(text, e = null) {
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
    const url = `/image/generate?prompt=${encodeURIComponent(text)}&providers=${encodeURIComponent(checkedProviders)}&guidance=${parseInt(guidanceVal)}${customVariables}`;

    const results = await fetch(url).then(res => res.json());
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
    img.dataset.src = `uploads/${results.imageName}`; // Use data-src instead of src
    return img;
}

function addImageToOutput(results, download = false) {
    const img = createImageElement(results);
    const autoDownload = document.querySelector('input[name="autoDownload"]:checked');
    if (download === true && autoDownload) {
        downloadImage(img, results);
    }

    // Attach the image to the DOM before starting the Intersection Observer
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

function displayImage(img, results, wrapper) { // Accept wrapper as a parameter
    img.title = results.prompt;
    img.dataset.id = results.id;
    img.addEventListener("click", function () {
        if (!isDragging) {
            toggleFullScreenThisImage(wrapper);
        }
    });

    img.src = img.dataset.src; // Set the src here to start loading the image
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
    wrapper.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
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

function findPromptPreviewElement(results) {
    ///const viewSwitch = document.querySelector('.prompt-view-switch');
    //if (viewSwitch.checked) {
    //return document.querySelector('.image-list');
    //}
    const elm = Array.from(document.querySelectorAll('.prompt-text')).find((div) => {
        return div.innerText.replace(/  /g, ' ').trim() === results.prompt.replace(/  /g, ' ').trim();
    });
    if (elm) {
        return elm.closest('li');
    } else {

        return document.querySelector('.prompt-text:first-child').closest('li');
    }
}

function toggleFullScreenThisImage(wrapper) {
    wrapper.classList.toggle(IMAGE_FULLSCREEN_CLASS);
    if (wrapper.classList.contains(IMAGE_FULLSCREEN_CLASS)) {
        addKeyBoardListeners();
        addFullScreenControls();
        addSwipeListeners(wrapper);
        addMouseWheelListeners(wrapper);
        addDragHandlers(wrapper);
    } else {
        removeMouseWheelListeners(wrapper);
        removeKeyBoardListeners();
        removeFullScreenControls();
        removeSwipeListeners(wrapper);
        removeDragHandlers(wrapper);
    }
}

function addSwipeListeners(wrapper) {
    if (wrapper.classList.contains(IMAGE_FULLSCREEN_CLASS)) {
        const img = wrapper.querySelector('img');
        var hammerHandler = new Hammer(wrapper);
        hammerHandler.on('swipeleft', function () {
            navigateImages('next', wrapper);
        });

        hammerHandler.on('swiperight', function () {
            navigateImages('prev', wrapper);
        });
        wrapper.hammerHandler = hammerHandler;
    }
}

function removeSwipeListeners(wrapper) {
    if (wrapper.hammerHandler) {
        wrapper.hammerHandler.off('swipeleft');
        wrapper.hammerHandler.off('swiperight');
        delete wrapper.hammerHandler;
    }
}

function removeFullScreenControls() {
    removeInfoBox();
    const target = document.querySelector(`.${IMAGE_CONTROLS_CLASS}`);
    if (target) {
        target.remove();
    }
}

function addFullScreenControls() {
    removeFullScreenControls();
    const controls = document.createElement('div');
    controls.className = IMAGE_CONTROLS_CLASS;

    const infoBox = getInfoBox();
    const downloadBtn = getDownloadButton();
    const navBtns = getNavigateButtons();
    const closeBtn = getCloseButton();
    const likeBtn = getLikeButton();

    controls.appendChild(likeBtn);
    controls.appendChild(closeBtn);
    controls.appendChild(downloadBtn);
    controls.appendChild(navBtns);

    document.body.appendChild(infoBox);
    document.body.appendChild(controls);
}

function getInfoBox() {
    const infoBox = document.createElement('div');
    infoBox.className = 'info-box';
    const wrapper = document.querySelector(`.${IMAGE_WRAPPER_CLASS}.${IMAGE_FULLSCREEN_CLASS}`);
    const img = wrapper.querySelector('img');
    const title = img.title;
    const note = wrapper.querySelector('h5').innerText;
    const h3 = document.createElement('h3');
    const h5 = document.createElement('h5');
    h3.innerText = title;
    h5.innerText = note;
    infoBox.appendChild(h3);
    infoBox.appendChild(h5);
    h3.addEventListener('click', function () {
        navigator.clipboard.writeText(title);
    });
    h5.addEventListener('click', function () {
        navigator.clipboard.writeText(title);
    });
    return infoBox;
}

function updateInfoBox() {
    removeInfoBox();
    const infoBox = getInfoBox();
    document.body.appendChild(infoBox);

}

function removeInfoBox() {
    const infoBox = document.querySelector('.info-box');
    if (infoBox) {
        infoBox.remove();
    }
}

function getLikeButton() {
    const btn = document.createElement('button');
    btn.classList.add('btn-like');
    btn.addEventListener('click', handleLikeClick);
    btn.innerHTML = LIKE_BTN_HTML;
    btn.setAttribute('title', 'L');
    if (checkIsLiked()) {
        btn.classList.add('liked');
        btn.innerText = 'Liked';
    }
    return btn;
}

function checkIsLiked() {
    const wrapper = document.querySelector(`.${IMAGE_WRAPPER_CLASS}.${IMAGE_FULLSCREEN_CLASS}`);
    const img = wrapper.querySelector('img');
    return typeof img.dataset.like !== 'undefined';
}

async function handleLikeClick() {
    const btn = document.querySelector('.btn-like');
    const wrapper = document.querySelector(`.${IMAGE_WRAPPER_CLASS}.${IMAGE_FULLSCREEN_CLASS}`);
    const img = wrapper.querySelector('img');
    const id = img.dataset.id;
    if (!id) {
        return;
    }
    if (!btn.dataset.like) {
        btn.dataset.like = 'true';
        btn.classList.add('liked');
        const url = `/like/image/${id}`;
        const results = await fetch(url).then(res => res.json());
        console.log(results);
    } else {
        btn.dataset.like = 'false';
        btn.classList.remove('liked');
        const url = `/like/image/${id}`;
        const results = await fetch(url, {
            method: 'DELETE',
        }).then(res => res.json());
        console.log(results);
    }
}

function getCloseButton() {
    const btn = document.createElement('button');
    btn.innerHTML = CLOSE_ICON_HTML;
    btn.setAttribute('title', 'Esc');
    btn.addEventListener('click', function () {
        const wrapper = document.querySelector(`.${IMAGE_WRAPPER_CLASS}.${IMAGE_FULLSCREEN_CLASS}`);
        toggleFullScreenThisImage(wrapper);
    });
    return btn;
}

function getNavigateButtons() {
    const container = document.createElement('div');
    const nextBtn = document.createElement('button');
    nextBtn.className = 'next-btn';
    nextBtn.innerHTML = NEXT_ICON_HTML;
    nextBtn.setAttribute('title', 'Right Arrow');
    nextBtn.addEventListener('click', function () {
        const wrapper = document.querySelector(`.${IMAGE_WRAPPER_CLASS}.${IMAGE_FULLSCREEN_CLASS}`);
        navigateImages('next', wrapper);
    });
    const prevBtn = document.createElement('button');
    prevBtn.innerHTML = PREV_ICON_HTML;
    prevBtn.setAttribute('title', 'Left Arrow');
    prevBtn.addEventListener('click', function () {
        const wrapper = document.querySelector(`.${IMAGE_WRAPPER_CLASS}.${IMAGE_FULLSCREEN_CLASS}`);
        navigateImages('prev', wrapper);
    });
    container.appendChild(prevBtn);
    container.appendChild(nextBtn);

    return container;
}

function getDownloadButton() {
    const wrapper = document.querySelector(`.${IMAGE_WRAPPER_CLASS}.${IMAGE_FULLSCREEN_CLASS}`);
    const img = wrapper.querySelector('img');
    const downloadBtn = document.createElement('button');
    downloadBtn.innerHTML = DOWNLOAD_BTN_HTML;
    downloadBtn.setAttribute('title', 'D');
    downloadBtn.addEventListener('click', function () {
        downloadThisImage(img);
    });
    return downloadBtn;
}

function keyupHandler(e) {
    if (e.key === 'ArrowRight') {
        navigateImages('next', document.querySelector(`.${IMAGE_FULLSCREEN_CLASS}`));
    } else if (e.key === 'ArrowLeft') {
        navigateImages('prev', document.querySelector(`.${IMAGE_FULLSCREEN_CLASS}`));
    }
    if (e.key === 'Escape') {
        toggleFullScreenThisImage(document.querySelector(`.${IMAGE_FULLSCREEN_CLASS}`));
    }
    if (e.key === 'l') {
        handleLikeClick();
    }
    if (e.key === '+') {
        zoomImage();
    }
    if (e.key === '-') {
        unZoomImage();
    }
    if (e.key === 'd') {
        const wrapper = document.querySelector(`.${IMAGE_WRAPPER_CLASS}.${IMAGE_FULLSCREEN_CLASS}`);
        const img = wrapper.querySelector('img');
        downloadThisImage(img);
    }
    if (e.key === 'ArrowUp') {
        moveImgUp();
    }
    if (e.key === 'ArrowDown') {
        moveImgDown();
    }
}

let isMouseDown = false;
let lastMouseY;

function mousedownHandler(e) {
    isMouseDown = true;
    lastMouseY = e.clientY;
}

function mousemoveHandler(e) {
    if (isMouseDown) {
        if (e.clientY > lastMouseY) {
            moveImgDown();
        } else if (e.clientY < lastMouseY) {
            moveImgUp();
        }
        lastMouseY = e.clientY;
    };
}
let isDragging = false;

function addDragHandlers(wrapper) {
    const img = wrapper.querySelector('img');

    function handleTap(event) {
        if (!isDragging) {
            toggleFullScreenThisImage(wrapper);
        }
    }
    img.addEventListener('touchend', handleTap);

    interact(img)
        .draggable({
            onstart: function (event) {
                isDragging = false; // Reset the flag at the start of a drag
            },
            onmove: function (event) {
                var target = event.target,
                    y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

                target.style.webkitTransform =
                target.style.transform =
                    'translateY(' + y + 'px)';

                target.setAttribute('data-y', y);

                isDragging = true; // Set the flag when a drag occurs
            },
            onend: function (event) {
                // If needed, you can use a timeout to ensure that the click event is not fired immediately after the drag ends
                setTimeout(function () {
                    isDragging = false;
                }, 0);
            }
        })
        .gesturable({
            onstart: function (event) {
                var rect = interact.getElementRect(event.target);

                // Remember the initial scale at the start of the gesture
                event.target.dataset.scale = event.target.dataset.scale || 1;

                // Center the zoom at the initial touch point, not the center of the element
                event.target.dataset.x = rect.left + rect.width / 2 - event.clientX0;
                event.target.dataset.y = rect.top + rect.height / 2 - event.clientY0;
            },
            onmove: function (event) {
                event.target.style.transform =
                    'scale(' + event.scale * event.target.dataset.scale + ')' +
                    'translate(' + event.target.dataset.x + 'px, ' + event.target.dataset.y + 'px)';
            },
            onend: function (event) {
                // Remember the final scale at the end of the gesture
                event.target.dataset.scale = event.scale * event.target.dataset.scale;
            }
        });;
}

function removeDragHandlers(wrapper) {
    const img = wrapper.querySelector('img');

    // To remove the draggable functionality, you can use the unset method
    interact(img).unset();
}

function mouseupHandler(e) {
    isMouseDown = false;
}

function moveImgUp() {
    const wrapper = document.querySelector(`.${IMAGE_WRAPPER_CLASS}.${IMAGE_FULLSCREEN_CLASS}`);
    const img = wrapper.querySelector('img');
    const currentTransform = img.style.transform;
    const currentY = currentTransform ? parseFloat(currentTransform.split('(')[1]) : 0;
    const newY = currentY - 50;
    img.style.transform = `translateY(${newY}px)`;
}

function moveImgDown() {
    const wrapper = document.querySelector(`.${IMAGE_WRAPPER_CLASS}.${IMAGE_FULLSCREEN_CLASS}`);
    const img = wrapper.querySelector('img');
    const currentTransform = img.style.transform;
    const currentY = currentTransform ? parseFloat(currentTransform.split('(')[1]) : 0;
    const newY = currentY + 50;
    img.style.transform = `translateY(${newY}px)`;
}

function zoomImage() {
    const wrapper = document.querySelector(`.${IMAGE_WRAPPER_CLASS}.${IMAGE_FULLSCREEN_CLASS}`);
    const img = wrapper.querySelector('img');
    const currentScale = img.style.transform ? parseFloat(img.style.transform.split('(')[1]) : 1;
    const newScale = currentScale + 0.1;
    img.style.transform = `scale(${newScale})`;
}

function unZoomImage() {
    const wrapper = document.querySelector(`.${IMAGE_WRAPPER_CLASS}.${IMAGE_FULLSCREEN_CLASS}`);
    const img = wrapper.querySelector('img');
    const currentScale = img.style.transform ? parseFloat(img.style.transform.split('(')[1]) : 1;
    const newScale = currentScale - 0.1;
    img.style.transform = `scale(${newScale})`;
}

function removeKeyBoardListeners() {
    window.removeEventListener('keyup', keyupHandler);
}

function addKeyBoardListeners() {
    window.addEventListener('keyup', keyupHandler);
}

function removeMouseWheelListeners(wrapper) {
    const img = wrapper.querySelector(`img`);
    img.style.transform = '';
    wrapper.removeEventListener('wheel', wheelHandler);
}

function addMouseWheelListeners(wrapper) {
    wrapper.addEventListener('wheel', wheelHandler);
}

function wheelHandler(e) {
    e.preventDefault();
    if (e.deltaY > 0) {
        unZoomImage();
    } else {
        zoomImage();
    }
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
    removeSwipeListeners(currentImageWrapper);
    removeMouseWheelListeners(currentImageWrapper);
    removeDragHandlers(currentImageWrapper);

    addSwipeListeners(imageWrappers[newIndex]);
    addDragHandlers(imageWrappers[newIndex]);
    addMouseWheelListeners(imageWrappers[newIndex]);
    updateInfoBox();
    addFullScreenControls();
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
    title.addEventListener('click', function () {
        navigator.clipboard.writeText(results.prompt);
    });
    return title;
}

function createNoteElement(results) {
    const note = document.createElement('h5');
    note.textContent = results.providerName + `, ${results.guidance}`;
    return note;
}

function appendElementsToWrapper(wrapper, elements) {
    elements.forEach(element => wrapper.appendChild(element));
}

function truncatePrompt(prompt) {
    const maxChars = MAX_TITLE_CHARS;
    return prompt.length > maxChars ? prompt.slice(0, maxChars) + '...' : prompt
}