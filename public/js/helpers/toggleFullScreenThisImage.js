const INFO_BOX_CLASS = 'info-box';
const TAGS_BOX_CLASS = 'tags-box';
const LIKE_BTN_HTML = '<i class="fas fa-heart"></i>';

document.addEventListener('toggleFullScreenThisImage', function(e) {
    const wrapper = document.querySelector(`.${IMAGE_WRAPPER_CLASS}.${IMAGE_FULLSCREEN_CLASS}`);
    toggleFullScreenThisImage(wrapper);
});

function toggleFullScreenThisImage(wrapper) {
    if (wrapper.classList.contains(IMAGE_FULLSCREEN_CLASS)) {
        removeFullScreen(wrapper);
    } else {
        addFullScreen(wrapper);
    }
}

function removeFullScreen(wrapper) {
    removeMouseWheelListeners(wrapper);
    removeKeyBoardListeners();
    removeFullScreenControls();
    removeSwipeListeners(wrapper);
    removeDragHandlers(wrapper);
    wrapper.classList.toggle(IMAGE_FULLSCREEN_CLASS);
}

function focusOnWrapper(wrapper) {
    const img = wrapper.querySelector('img');
    img.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
    });
    img.focus();
}

function addFullScreen(wrapper) {
    wrapper.classList.toggle(IMAGE_FULLSCREEN_CLASS);
    addKeyBoardListeners();
    addFullScreenControls();
    addSwipeListeners(wrapper);
    addMouseWheelListeners(wrapper);
    addDragHandlers(wrapper);
}

async function addFullScreenControls() {
    removeFullScreenControls();
    const controls = document.createElement('div');
    controls.className = IMAGE_CONTROLS_CLASS;

    const infoBox = getInfoBox();
    const downloadBtn = getDownloadButton();
    const navBtns = getNavigateButtons();
    const closeBtn = getCloseButton();
    const makeBtn = await getMakeButton();

    controls.appendChild(makeBtn);
    controls.appendChild(closeBtn);
    controls.appendChild(downloadBtn);
    controls.appendChild(navBtns);

    document.body.appendChild(infoBox);
    document.body.appendChild(controls);
}

function getRatingElment() {
    const img = document.querySelector(`.${IMAGE_WRAPPER_CLASS}.${IMAGE_FULLSCREEN_CLASS} img`);
    const ratingValue = img.dataset.rating === 'undefined' ? '' : img.dataset.rating;
    const rating = document.createElement('div');
    rating.className = 'rating';
    rating.textContent = `Rating: ${ratingValue || ''}`;
    return rating;
}

function getMakeButton() {
    const btn = document.createElement('button');
    btn.classList.add('btn-make');
    btn.addEventListener('click', handleMakeBtnClick);
    btn.innerHTML = 'make';
    btn.setAttribute('title', 'm');
    return btn;
}

function removeFullScreenControls() {
    removeInfoBox();
    const target = document.querySelector(`.${IMAGE_CONTROLS_CLASS}`);
    if (target) {
        target.remove();
    }
}

async function reloadFullScreenControls() {
    const controls = document.querySelector(`.${IMAGE_CONTROLS_CLASS}`);
    if (controls) {
        const infoBox = document.querySelector(`.${INFO_BOX_CLASS}`);
        updateInfoBox(infoBox);
    }
}

async function navigateImages(direction, currentImageWrapper) {
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

    // Remove listeners from current image wrapper before removing the class
    removeSwipeListeners(currentImageWrapper);
    removeMouseWheelListeners(currentImageWrapper);
    removeDragHandlers(currentImageWrapper);

    // Remove fullscreen class from current image wrapper and add it to the new one
    currentImageWrapper.classList.remove(IMAGE_FULLSCREEN_CLASS);
    imageWrappers[newIndex].classList.add(IMAGE_FULLSCREEN_CLASS);

    // Add listeners to the new image wrapper
    addSwipeListeners(imageWrappers[newIndex]);
    addDragHandlers(imageWrappers[newIndex]);
    addMouseWheelListeners(imageWrappers[newIndex]);
    updateInfoBox();
    await reloadFullScreenControls();

}

function addSwipeListeners(wrapper) {
    if (wrapper.classList.contains(IMAGE_FULLSCREEN_CLASS)) {
        const img = wrapper.querySelector('img');
        var hammerHandler = new Hammer(wrapper, {
            touchAction: 'none' // Prevents default browser pinch action
        });

        hammerHandler.get('pinch').set({ enable: true }); // Enable pinch event

        hammerHandler.on('swipeleft', function() {
            navigateImages('next', wrapper);
        });

        hammerHandler.on('swiperight', function() {
            navigateImages('prev', wrapper);
        });

        hammerHandler.on('pinch', function(ev) {
            // You can access scale factor through ev.scale
            // Use this to adjust the zoom level of your image
            img.style.transform = `scale(${ev.scale})`;
        });

        wrapper.hammerHandler = hammerHandler;
    }
}

function removeSwipeListeners(wrapper) {
    if (wrapper.hammerHandler) {
        wrapper.hammerHandler.off('swipeleft');
        wrapper.hammerHandler.off('swiperight');
        wrapper.hammerHandler.off('pinch');
        delete wrapper.hammerHandler;
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
    if (!img || img === null) {
        console.error('No img element found within wrapper');
        return;
    }

    var hammerHandler = new Hammer(img);
    hammerHandler.get('pinch').set({ enable: true });
    hammerHandler.get('pan').set({ direction: Hammer.DIRECTION_ALL });

    let lastDeltaY = 0;

    hammerHandler.on('panmove', function(event) {
        var target = event.target,
            y = (parseFloat(target.getAttribute('data-y')) || 0) + event.deltaY - lastDeltaY;
        updateElementTransformValue(target, 'translateY(' + y + 'px)');
        target.setAttribute('data-y', y);
        lastDeltaY = event.deltaY;
    });

    hammerHandler.on('pinch', function(event) {
        updateElementTransformValue(event.target, 'scale(' + event.scale + ')');
    });

    hammerHandler.on('panend', function() {
        lastDeltaY = 0;
    });

    wrapper.hammerHandler = hammerHandler;
}

function removeDragHandlers(wrapper) {
    const img = wrapper.querySelector('img');

    if (!img || img === null) {
        console.error('No img element found within wrapper');
        return;
    }

    if (wrapper.hammerHandler) {
        wrapper.hammerHandler.off('panmove');
        wrapper.hammerHandler.off('pinch');
        wrapper.hammerHandler.off('panend');
        delete wrapper.hammerHandler;
    }
}


function updateElementTransformValue(target, newTransform) {
    let currentTransform = target.style.transform;

    // Extract the transform type (e.g., 'translateY') from the new transform
    let newTransformType = newTransform.split('(')[0];

    // Check if the current transform contains the new transform type
    let updatedTransform;
    if (currentTransform.includes(newTransformType)) {
        // If it does, replace the existing transform of that type with the new one
        const regex = new RegExp(`(${newTransformType}\\([^)]+\\))`, 'g');
        updatedTransform = currentTransform.replace(regex, newTransform);
    } else {
        // If it doesn't, add the new transform to the current transform
        updatedTransform = currentTransform + ' ' + newTransform;
    }

    // Update the transform property of the target element
    target.style.webkitTransform = target.style.transform = updatedTransform;
}

function mouseupHandler(e) {
    isMouseDown = false;
}

function moveImgUp() {
    const wrapper = document.querySelector(`.${IMAGE_WRAPPER_CLASS}.${IMAGE_FULLSCREEN_CLASS}`);
    const img = wrapper.querySelector('img');
    const currentTransform = img.style.transform;
    //const currentY = currentTransform ? parseFloat(currentTransform.split('(')[1]) : 0;
    const currentY = getCurrentTranslateY(currentTransform);
    const newY = currentY - 50;
    //wrapper.style.transform = `translateY(${newY}px)`;
    updateElementTransformValue(img, `translateY(${newY}px)`);
}

function moveImgDown() {
    const wrapper = document.querySelector(`.${IMAGE_WRAPPER_CLASS}.${IMAGE_FULLSCREEN_CLASS}`);
    const img = wrapper.querySelector('img');
    const currentTransform = img.style.transform;
    //const currentY = currentTransform ? parseFloat(currentTransform.split('(')[1]) : 0;
    const currentY = getCurrentTranslateY(currentTransform);
    const newY = currentY + 50;
    //wrapper.style.transform = `translateY(${newY}px)`;
    updateElementTransformValue(img, `translateY(${newY}px)`);
}

function getCurrentTranslateY(transform) {
    const match = /translateY\(([^)]+)px\)/.exec(transform);
    return match ? parseFloat(match[1]) : 0;
}

function zoomImage() {
    const wrapper = document.querySelector(`.${IMAGE_WRAPPER_CLASS}.${IMAGE_FULLSCREEN_CLASS}`);
    const img = wrapper.querySelector('img');
    const currentScale = img.style.transform ? parseFloat(img.style.transform.split('(')[1]) : 1;
    const newScale = currentScale + 0.1;
    //img.style.transform = `scale(${newScale})`;
    updateElementTransformValue(img, `scale(${newScale})`);
}

function unZoomImage() {
    const wrapper = document.querySelector(`.${IMAGE_WRAPPER_CLASS}.${IMAGE_FULLSCREEN_CLASS}`);
    const img = wrapper.querySelector('img');
    const currentScale = img.style.transform ? parseFloat(img.style.transform.split('(')[1]) : 1;
    const newScale = currentScale - 0.1;
    //img.style.transform = `scale(${newScale})`;
    updateElementTransformValue(img, `scale(${newScale})`);
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

function getInfoBox() {

    const infoBox = document.createElement('div');
    infoBox.className = INFO_BOX_CLASS;
    const wrapper = document.querySelector(`.${IMAGE_WRAPPER_CLASS}.${IMAGE_FULLSCREEN_CLASS}`);
    const img = wrapper.querySelector('img');
    const title = img.title;
    const note = wrapper.querySelector('h5').innerText;

    const h3 = document.createElement('h3');
    h3.classList.add('full-screen-prompt', 'link');
    h3.innerText = title;
    infoBox.appendChild(h3);

    const h6 = document.createElement('h6');
    h6.classList = 'link';
    const li = wrapper.closest('li');
    h6.innerText = li.dataset.originalPrompt;
    infoBox.appendChild(h6);

    const h62 = document.createElement('h6');
    h62.innerText = note;
    infoBox.appendChild(h62);

    h3.addEventListener('click', function() {
        navigator.clipboard.writeText(h3.innerText);
    });

    h6.addEventListener('click', function() {
        navigator.clipboard.writeText(h6.innerText);
    });

    const rating = getRatingElment();
    infoBox.appendChild(rating);

    return infoBox;
}


function updateInfoBox() {
    removeInfoBox();
    const infoBox = getInfoBox();
    document.body.appendChild(infoBox);

}

function removeInfoBox() {
    const infoBox = document.querySelector(`.${INFO_BOX_CLASS}`);
    if (infoBox) {
        infoBox.remove();
    }
}

function getCloseButton() {
    const btn = document.createElement('button');
    btn.innerHTML = CLOSE_ICON_HTML;
    btn.setAttribute('title', 'Esc');
    btn.addEventListener('click', function() {
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
    nextBtn.addEventListener('click', function() {
        const wrapper = document.querySelector(`.${IMAGE_WRAPPER_CLASS}.${IMAGE_FULLSCREEN_CLASS}`);
        navigateImages('next', wrapper);
    });
    const prevBtn = document.createElement('button');
    prevBtn.innerHTML = PREV_ICON_HTML;
    prevBtn.setAttribute('title', 'Left Arrow');
    prevBtn.addEventListener('click', function() {
        const wrapper = document.querySelector(`.${IMAGE_WRAPPER_CLASS}.${IMAGE_FULLSCREEN_CLASS}`);
        navigateImages('prev', wrapper);
    });
    container.appendChild(prevBtn);
    container.appendChild(nextBtn);

    return container;
}

async function keyupHandler(e) {
    if (e.key === 'ArrowRight') {
        navigateImages('next', document.querySelector(`.${IMAGE_FULLSCREEN_CLASS}`));
    } else if (e.key === 'ArrowLeft') {
        navigateImages('prev', document.querySelector(`.${IMAGE_FULLSCREEN_CLASS}`));
    }
    if (e.key === 'Escape') {
        toggleFullScreenThisImage(document.querySelector(`.${IMAGE_FULLSCREEN_CLASS}`));
    }
    /*
        if (e.key === 'l') {
            handleLikeClick();
        }*/
    if (e.key === '+') {
        zoomImage();
    }
    if (e.key === '-') {
        unZoomImage();
    }
    if (e.key === 'd') {
        const wrapper = document.querySelector(`.${IMAGE_WRAPPER_CLASS}.${IMAGE_FULLSCREEN_CLASS}`);
        const img = wrapper.querySelector('img');
        downloadImage(img);
    }
    if (e.key === 'm') {
        handleMakeBtnClick();
    }
    if (e.key === 'ArrowUp') {
        moveImgUp();
    }
    if (e.key === 'ArrowDown') {
        moveImgDown();
    }
    if (e.key === 'c') {
        await deleteImage();
    }

    async function deleteImage() {
        const wrapper = document.querySelector(`.${IMAGE_FULLSCREEN_CLASS}`);
        if (!wrapper) return;
        const img = wrapper.querySelector('img');
        const imgId = img.dataset.id;
        const res = await fetch(`/api/images/${imgId}`, {
            method: 'DELETE'
        });
        if (res.ok) {
            navigateImages('next', document.querySelector(`.${IMAGE_FULLSCREEN_CLASS}`));
            // Remove the parent li of this img
            const li = img.closest('li');
            if (li) li.remove();
        } else {
            alert('error deleting image');
        }
    }
}