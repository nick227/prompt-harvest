const IMAGE_WRAPPER_CLASS_NAME = 'image-wrapper';

function setupToggleView() {
    const viewSwitch = document.querySelector('.prompt-view-switch');
    const isChecked = localStorage.getItem('promptView') === 'true';
    const promptOutput = document.querySelector('.prompt-output');
    viewSwitch.checked = isChecked;

    if(isChecked){
        promptOutput.classList.add('list-view');
    } else {
        promptOutput.classList.add('image-view');
    }

    viewSwitch.addEventListener('change', (elm) => {
        promptOutput.classList.toggle('list-view');
        promptOutput.classList.toggle('image-view');
        localStorage.setItem('promptView', elm.target.checked);
    });
}

function setupToggleImageSize(){
    const imageSizeElm = document.querySelector('.image-size');
    const localStorageVal = localStorage.getItem('imageSize');
    if(localStorageVal){
        imageSizeElm.value = localStorageVal;
        document.documentElement.style.setProperty('--image-width', localStorageVal + '%');
    }
    imageSizeElm.addEventListener('change', (e) => {
        document.documentElement.style.setProperty('--image-width', e.target.value + '%');
        localStorage.setItem('imageSize', e.target.value);
    });
}