const DEFAULT_PROMPT = '';
const DEFAULT_REQUEST_LIMIT = 100000;
const IMAGES_ELM_SELECTOR = 'section.images';
let currentPageCount = 0;

async function setupFeed() {
    await setupFeedPrompts();
    setTimeout(async function(){
        await setupFeedImages();
    }, 200);
}

async function setupFeedPrompts() {
    const url = `/prompts?limit=${DEFAULT_REQUEST_LIMIT}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const results = await response.json();
    for(let i=results.length-1; i > -1; i--){
        addPromptToOutput(results[i]);
    }
}

async function setupFeedImages() {
    const url = `/images?limit=${DEFAULT_REQUEST_LIMIT}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const results = await response.json();
    for(let i=results.length-1; i > -1; i--){
        addImageToOutput(results[i]);
    }
}

function setupPaging() {
    const elm = document.querySelector(IMAGES_ELM_SELECTOR);
    elm.addEventListener("scroll", handleImageScrollEvent);
}

function handleImageScrollEvent(e) {
    const elm = document.querySelector(IMAGES_ELM_SELECTOR);
    if(elm.scrollHeight - elm.scrollTop - elm.clientHeight < 200){
        const url = `/images?limit=${DEFAULT_IMAGE_LIMIT}&page=${currentPageCount}`;
        fetch(url).then(response => response.json()).then(results => {
            currentPageCount++;
            for(let i=results.length-1; i > -1; i--){
                addImageToOutput(results[i]);
            }
        });
    }
}