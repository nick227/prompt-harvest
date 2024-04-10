let lastScrollTop = 0;

function setupScrollTopBar() {
    setupTopBarButtons();
    const scrollbar = document.querySelector('.scroll-top-bar');
    window.addEventListener('scroll', () => {
        let st = window.pageYOffset || document.documentElement.scrollTop;
        if (st > lastScrollTop){
            // downscroll code
            if (window.scrollY > 100) {
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

function setupTopBarButtons(){
    const topBtn = document.querySelector('.top-btn');
    const viewBtn = document.querySelector('.view-btn');
    topBtn.addEventListener('click', handleTopBtnClick);
    viewBtn.addEventListener('click', handleViewBtnClick);
}

function handleTopBtnClick(){
    window.scrollTo(0, 0);
}
function handleViewBtnClick(){
    const promptCol = document.querySelector('.prompt .col:nth-child(1)');
    const imgCol = document.querySelector('.prompt .col:nth-child(2)');
    imgCol.style.width = imgCol.style.width === '100%' ? '50%' : '100%';
    imgCol.classList.toggle('wide-screen');
    promptCol.classList.toggle('hidden');
}