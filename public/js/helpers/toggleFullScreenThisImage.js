function toggleFullScreenThisImage(wrapper) {
    if (wrapper.classList.contains(IMAGE_FULLSCREEN_CLASS)) {
        removeMouseWheelListeners(wrapper);
        removeKeyBoardListeners();
        removeFullScreenControls();
        removeSwipeListeners(wrapper);
        removeDragHandlers(wrapper);
        wrapper.classList.toggle(IMAGE_FULLSCREEN_CLASS);
    } else {
        wrapper.classList.toggle(IMAGE_FULLSCREEN_CLASS);
        addKeyBoardListeners();
        addFullScreenControls();
        addSwipeListeners(wrapper);
        addMouseWheelListeners(wrapper);
        addDragHandlers(wrapper);
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
    } else {
        btn.dataset.like = 'false';
        btn.classList.remove('liked');
        const url = `/like/image/${id}`;
        const results = await fetch(url, {
            method: 'DELETE',
        }).then(res => res.json());
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

function getDownloadButton(img = null) {
    if (!img) {
        const wrapper = document.querySelector(`.${IMAGE_WRAPPER_CLASS}.${IMAGE_FULLSCREEN_CLASS}`);
        img = wrapper.querySelector('img');
    }
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
    if (!img || img === null) {
        console.error('No img element found within wrapper');
        return;
    }
/*
    function handleTap(event) {
        if (!isDragging) {
            toggleFullScreenThisImage(wrapper);
        }
    }
    img.addEventListener('touchend', handleTap);
*/
    interact(img)
    .draggable({
        onstart: function (event) {
            isDragging = false; // Reset the flag at the start of a drag
        },
        onmove: function (event) {
            var target = event.target,
                y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
            updateElementTransformValue(target, 'translateY(' + y + 'px)');

            target.setAttribute('data-y', y);

            isDragging = true; // Set the flag when a drag occurs
        },
        onend: function (event) {
            setTimeout(function () {
                isDragging = false;
            }, 0);
        }
    });

}

function removeDragHandlers(wrapper) {
    const img = wrapper.querySelector('img');

    if (!img || img === null) {
        console.error('No img element found within wrapper');
        return;
    }
    interact(img).unset();
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
    addFullScreenControls();
}