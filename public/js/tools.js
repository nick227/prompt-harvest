const IMAGE_FULLSCREEN_CLASS = 'full-screen';
const DOWNLOAD_BTN_HTML = '<i class="fas fa-download"></i>';

function makeFileNameSafeForWindows(name) {
    const illegalChars = /[\u0000-\u001F<>:"\/\\|?*.,;(){}[\]!@#$%^&+=`~]/g;
    const maxLength = 100;
    let safeName = name.replace(illegalChars, '')
        .replace(/\.{2,}/g, '.')
        .trim()
        .replace(/(^[. ]+|[. ]+$)/g, '');

    const reservedNames = ["CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9"];

    if (reservedNames.includes(safeName.toUpperCase())) {
        safeName = 'file';
    }
    return safeName.slice(0, maxLength);
}

HTMLElement.prototype.addSwipe = function (callback) {
    let hammertime = new Hammer(this);

    hammertime.on('swipe', function (event) {
        callback(event);
    });
} 


function isProviderSelected() {
    const checkedProviders = Array.from(document.querySelectorAll('input[name="providers"]:checked')).map(input => input.value);
    if (checkedProviders.length) {
        return true;
    }
    return false;
}

async function handleMakeBtnClick(e) {
    e.preventDefault();
    if (!isProviderSelected()) {
        alert('Please select at least one provider');
        return;
    }
    let prompt = null;

    if(e.target.closest('.fullscreen-controls')) {
        prompt = document.querySelector('.full-screen-prompt').textContent;
        //const event = new Event('toggleFullScreenThisImage');
        //document.dispatchEvent(event);
    } else {
        prompt = e.target.closest('li').querySelector('.prompt-text').textContent;
    }
    const url = convertPromptToUrl(prompt);
    
    if (!url) {
        alert('Invalid Prompt');
        return;
    }
    const results = await fetchData(url);
    const promptElm = addPromptToOutput(results);
    promptElm.scrollIntoView({ behavior: "smooth", block: "start" });
    const imgElm = await generateImage(results);
    imgElm.scrollIntoView({ behavior: "smooth", block: "nearest" });
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
        downloadImage(img);
    });
    return downloadBtn;
}


function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}