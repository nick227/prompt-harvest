let isFetching = false;
let hasMoreImages = true;
let currentPage = 0;

let observer;

async function setupIntersectionObserver() {
    const sentinel = document.createElement('div');
    sentinel.style.height = '1px';
    document.body.appendChild(sentinel);

    observer = new IntersectionObserver(async entries => {
        if (entries[0].isIntersecting && hasMoreImages && !isFetching) {
            await loadMoreImages();
        }
    }, {
        root: null,
        rootMargin: '500px 0px',
        threshold: 0.1
    });

    observer.observe(sentinel);
}

function tearDownIntersectionObserver() {
    if (observer) {
        observer.disconnect();
        observer = null;
    }
}

async function loadMoreImages() {
    if (isFetching || !hasMoreImages) return;
    isFetching = true;
    currentPage++;
    const url = `/images?limit=${DEFAULT_IMAGE_LIMIT}&page=${currentPage}`;

    try {
        const response = await fetch(url);
        const results = await response.json();
        if (results.length === 0) {
            hasMoreImages = false;
        } else {
            results.forEach(result => {
                addPromptToOutput(result, true);
                addImageToOutput(result);
            });
        }
    } catch (error) {
        console.error('Failed to fetch images:', error);
    }
    isFetching = false;
}

function setupScrollLoading() {
    const debouncedHandleScroll = debounce(handleWindowScroll, 100);
    window.addEventListener('scroll', debouncedHandleScroll);
    loadMoreImagesUntilScrollable();
}

async function loadMoreImagesUntilScrollable() {
    if (document.body.scrollHeight <= window.innerHeight && hasMoreImages) {
        await loadMoreImages();
        loadMoreImagesUntilScrollable();
    }
}

function handleWindowScroll() {
    const scrollTop = window.pageYOffset;
    const scrollHeight = document.body.scrollHeight;
    const clientHeight = document.documentElement.clientHeight;
    const scrollPercentage = scrollTop / (scrollHeight - clientHeight);
    const scrollPercentageRounded = Math.round(scrollPercentage * 100);

    if (scrollPercentageRounded > 95 && !isFetching) {
        loadMoreImages();
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function initializeImageLoading() {
    setupScrollLoading();
    setupIntersectionObserver();
}
