let isFetching = false;
let scrollCurrentPosition = 0;
let currentPage = 0;

function loadMoreImages(){
    if (isFetching) return Promise.resolve();
    isFetching = true;
    currentPage++;
    const url = `/images?limit=${DEFAULT_REQUEST_LIMIT}&page=${currentPage}`;
    return fetch(url).then(response => response.json()).then(results => {
        if (results.length === 0) {
            isFetching = false;
            return Promise.resolve();
        }
        results.forEach(result => {
            addPromptToOutput(result, true);
            addImageToOutput(result);
        });
        isFetching = false;
    });
}

function setupScrollLoading() {
    window.addEventListener('scroll', debounce(handleWindowScroll, 200));
    loadMoreImagesUntilScrollable();
}

function loadMoreImagesUntilScrollable() {
    if (document.body.scrollHeight <= window.innerHeight) {
        loadMoreImages().then(() => {
            loadMoreImagesUntilScrollable();
        });
    }
}


function handleWindowScroll(e) {
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