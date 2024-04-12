let isFetching = false;
let scrollCurrentPosition = 0;
let currentPage = 0;

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

function loadMoreImages(){
    if (isFetching) return;
    isFetching = true;
    currentPage++;
    const url = `/images?limit=${DEFAULT_REQUEST_LIMIT}&page=${currentPage}`;
    return fetch(url).then(response => response.json()).then(results => {
        if (results.length === 0) {
            return;
        }
        results.forEach(result => {
            addPromptToOutput(result, true);
            addImageToOutput(result);
        });
        isFetching = false;
    });
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

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}