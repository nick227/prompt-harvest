const IMAGE_WRAPPER_CLASS_NAME = 'image-wrapper';
function setupToggleView() {
    const viewSwitch = document.querySelector('.prompt-view-switch');
    const promptList = document.querySelector('.prompts');
    const isChecked = localStorage.getItem('promptView') === 'true';
    viewSwitch.checked = isChecked;

    if(isChecked){
        promptList.classList.add('hidden');
    }

    viewSwitch.addEventListener('change', (elm) => {
        promptList.classList.toggle('hidden');
        localStorage.setItem('promptView', elm.target.checked);
        if(elm.target.checked){
            moveImagesToImageList();
        } else {
            moveImagesToPromptContainer();
        }
    });

}

function moveImagesToImageList() {
    const imageWrappers = document.querySelectorAll('.image-wrapper');
    const imageList = document.querySelector('.image-list');

    imageWrappers.forEach(wrapper => {
        wrapper.parentNode.removeChild(wrapper);
        imageList.appendChild(wrapper);
    });
}

function moveImagesToPromptContainer() {
    const imageWrappers = document.querySelectorAll('.image-wrapper');

    imageWrappers.forEach(wrapper => {
        const promptText = wrapper.querySelector('img').title;
        const results = { prompt: promptText };
        const promptContainer = findPromptPreviewElement(results);

        if (promptContainer) {
            wrapper.parentNode.removeChild(wrapper);
            promptContainer.prepend(wrapper);
        }
    });
}

function setupToggleImageSize(){
    const imageSizeElm = document.querySelector('.image-size');
    const localStorageVal = localStorage.getItem('imageSize');
    if(localStorageVal){
        imageSizeElm.value = localStorageVal;
        updateImageWidths(localStorageVal);
    }
    imageSizeElm.addEventListener('change', (e) => {
        updateImageWidths(e.target.value);
        localStorage.setItem('imageSize', e.target.value);
    });
}

function updateImageWidths(value){
    const imageWrappers = document.querySelectorAll('.image-wrapper');
    imageWrappers.forEach(wrapper => {
        wrapper.style.width = value + '%';
    });
}