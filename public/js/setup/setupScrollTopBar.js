let lastScrollTop = 0;
const WIDE_SCREEN_CLASS_NAME = "wide-screen";
const TOP_BTN_SELECTOR = 'btn-scroll-top';
const PROMPT_VIEW_SELECTOR = 'prompt-view-label';


function setupScrollTopBar() {
    
    const topBtn = document.querySelector(`.${TOP_BTN_SELECTOR}`);
    topBtn.addEventListener('click', handleTopBtnClick);

    setupTopBarScrollListeners();

}

function handleTopBtnClick(event) {
    event.preventDefault();
    window.scrollTo(0, 0);
}



function setupTopBarScrollListeners(){
    
    //if is less than 1200 px wide screen return
    if (window.innerWidth < 1200) {
        return;
    }
    const scrollbar = document.querySelector(`.${TOP_BTN_SELECTOR}`);

    window.addEventListener('scroll', () => {
        let st = window.pageYOffset || document.documentElement.scrollTop;
        if (st > lastScrollTop) {
            // downscroll code
            if (window.scrollY > 300) { // Changed from 200 to 300
                scrollbar.classList.add('hidden');
            }
        } else {
            // upscroll code
            scrollbar.classList.remove('hidden');
        }
        lastScrollTop = st <= 0 ? 0 : st; // For Mobile or negative scrolling
    }, false);

    //also if user moves mouse to top of screen show the scroll bar
    window.addEventListener('mouseover', (e) => {
        if (e.clientY < 50 && window.scrollY > 300) {
            scrollbar.classList.remove('hidden');
        }
    });
}

function setupTopBarButtons() {
    //const viewBtn = document.querySelector('.view-btn');
    
    //viewBtn.addEventListener('click', handleViewBtnClick);
    const checkView = getLocalStorageView();
    if (checkView) {
        //handleViewBtnClick();
    }
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