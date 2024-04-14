let lastScrollTop = 0;
WIDE_SCREEN_CLASS_NAME = "wide-screen";

function setupScrollTopBar() {
    //if is less than 1200 px wide screen return
    if (window.innerWidth < 1200) {
        return;
    }
    setupTopBarButtons();
    const scrollbar = document.querySelector('.scroll-top-bar');
    window.addEventListener('scroll', () => {
        let st = window.pageYOffset || document.documentElement.scrollTop;
        if (st > lastScrollTop) {
            // downscroll code
            if (window.scrollY > 200) {
                scrollbar.classList.add('show');
            }
        } else {
            // upscroll code
            scrollbar.classList.remove('show');
        }
        lastScrollTop = st <= 0 ? 0 : st; // For Mobile or negative scrolling
    }, false);

    //also if user moves mouse to top of screen show the scroll bar
    window.addEventListener('mousemove', (e) => {
        if (e.clientY < 50) {
            scrollbar.classList.add('show');
        }
    });

}

function setupTopBarButtons() {
    const topBtn = document.querySelector('.top-btn');
    const viewBtn = document.querySelector('.view-btn');
    topBtn.addEventListener('click', handleTopBtnClick);
    viewBtn.addEventListener('click', handleViewBtnClick);
    const checkView = getLocalStorageView();
    if (checkView) {
        handleViewBtnClick();
    }
}

function handleTopBtnClick() {
    window.scrollTo(0, 0);
}

function handleViewBtnClick() {
    const promptCol = document.querySelector('.prompt .col:nth-child(1)');
    const imgCol = document.querySelector('.prompt .col:nth-child(2)');
    imgCol.classList.toggle(WIDE_SCREEN_CLASS_NAME);
    promptCol.classList.toggle(WIDE_SCREEN_CLASS_NAME);
    updateLocalStorageView(promptCol.classList.contains(WIDE_SCREEN_CLASS_NAME));
}

function updateLocalStorageView(isWide) {
    localStorage.setItem('view', isWide);
}

function getLocalStorageView() {
    return localStorage.getItem('view') === 'true';
}