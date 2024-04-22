const DEFAULT_PROMPT = '';
const DEFAULT_REQUEST_LIMIT = 3;
const IMAGES_ELM_SELECTOR = 'section.images';
let currentPageCount = 0;
let setupFeedComplete = false;
async function setupFeed() {
    await setupFeedPromptsNew();
    setTimeout(async function(){
        window.scrollTop = 0;
        window.scrollTo(0, 0);
    }, 2000);
}

function setupFeedPromptsNew(){
    const url = `${API_FEED}?limit=${DEFAULT_REQUEST_LIMIT}`;
    fetch(url).then(response => response.json()).then(results => {
        for(let i=results.length-1; i > -1; i--){
            addPromptToOutput(results[i]);
            addImageToOutput(results[i]);
        }
    });
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