function setupScrollLoading() {
    window.addEventListener('scroll', handleWindowScroll);
    loadMoreImagesUntilScrollable();
}

function loadMoreImagesUntilScrollable() {
    if (document.body.scrollHeight <= window.innerHeight) {
        loadMoreImages().then(() => {
            loadMoreImagesUntilScrollable();
        });
    }
}

function loadMoreImages(){
    setupFeedComplete = false;
    currentPage++;
    const url = `/images?limit=${DEFAULT_REQUEST_LIMIT}&page=${currentPage}`;
    return fetch(url).then(response => response.json()).then(results => {
        if (results.length === 0) {
            // No more images to load
            return;
        }
        for(let i=results.length-1; i > -1; i--){
            addPromptToOutput(results[i], true);
            addImageToOutput(results[i]);
        }
        setupFeedComplete = true;
    });
}

let scrollCurrentPosition = 0;
let currentPage = 0;

function handleWindowScroll(e){
    const scrollTop = window.pageYOffset;
    const scrollHeight = document.body.scrollHeight;
    const clientHeight = document.documentElement.clientHeight;
    const scrollPercentage = scrollTop / (scrollHeight - clientHeight);
    const scrollPercentageRounded = Math.round(scrollPercentage * 100);
    if(scrollTop > scrollCurrentPosition && scrollPercentageRounded > 90){
        loadMoreImages();
    }
    scrollCurrentPosition = scrollTop;
}