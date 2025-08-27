// uI Module
class UIManager {
    constructor() {
        this.isScrolled = false;
        this.init();
    }

    init() {
        this.setupScrollTopBar();
    }

    applyViewMode(viewMode) {
        const promptOutput = document.querySelector('.prompt-output');

        if (!promptOutput) {
            return;
        }

        if (viewMode === 'grid') {
            promptOutput.classList.remove('river-view', 'list-view');
            promptOutput.classList.add('grid-view');
            console.log('Applied grid view mode');
        } else {
            promptOutput.classList.remove('grid-view', 'list-view');
            promptOutput.classList.add('river-view');
            console.log('Applied river view mode');
        }

        // force a reflow to ensure CSS is applied
        promptOutput.style.display = 'none';
        // eslint-disable-next-line no-unused-expressions
        promptOutput.offsetHeight; // force reflow
        promptOutput.style.display = '';

        // update image sizes
        this.setupToggleImageSize();
    }

    setupToggleImageSize() {
        const images = document.querySelectorAll('.image-wrapper img');
        const isGrid = document.querySelector('.prompt-output').classList.contains('grid-view');

        images.forEach((img) => {
            if (isGrid) {
                img.style.maxWidth = '300px';
                img.style.maxHeight = '300px';
            } else {
                img.style.maxWidth = '100%';
                img.style.maxHeight = 'none';
            }
        });
    }

    // scroll Top Bar Management
    setupScrollTopBar() {
        this.setupTopBarScrollListeners();
        this.setupTopBarButtons();
    }

    setupTopBarScrollListeners() {
        const scrollTopBtn = document.querySelector('.btn-scroll-top');

        if (!scrollTopBtn) {
            return;
        }

        // show/hide scroll button based on scroll position
        window.addEventListener('scroll', Utils.async.debounce(() => {
            this.isScrolled = window.scrollY > 100;
            Utils.dom.updateElementClass(scrollTopBtn, this.isScrolled, 'visible');
        }, 100));

        // scroll to top functionality
        scrollTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    setupTopBarButtons() {
        // add any additional top bar button functionality here
        const topBar = document.querySelector('.topbar');

        if (!topBar) {
            return;
        }

        // example: Add responsive menu toggle
        const menuToggle = topBar.querySelector('.menu-toggle');

        if (menuToggle) {
            menuToggle.addEventListener('click', () => {
                this.toggleMobileMenu();
            });
        }
    }

    toggleMobileMenu() {
        const sidebar = document.querySelector('.sidebar');

        if (sidebar) {
            sidebar.classList.toggle('mobile-open');
        }
    }

    // utility methods for external access
    getCurrentViewMode() {
        const promptOutput = document.querySelector('.prompt-output');

        if (!promptOutput) {
            return 'grid';
        }

        if (promptOutput.classList.contains('grid-view')) {
            return 'grid';
        } else if (promptOutput.classList.contains('river-view')) {
            return 'river';
        }

        return 'grid';
    }

    setViewMode(viewMode) {
        this.applyViewMode(viewMode);

        // update toggle switch state
        const toggleSwitch = document.querySelector('.prompt-view-switch');

        if (toggleSwitch) {
            toggleSwitch.checked = viewMode === 'grid';
        }

        // save to storage
        Utils.storage.set('viewMode', viewMode);
    }

    toggleViewMode() {
        const currentMode = this.getCurrentViewMode();
        const newMode = currentMode === 'grid' ? 'river' : 'grid';

        this.setViewMode(newMode);
    }

    isScrollButtonVisible() {
        return this.isScrolled;
    }

    scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    // responsive utilities
    isMobile() {
        return window.innerWidth <= 768;
    }

    isTablet() {
        return window.innerWidth > 768 && window.innerWidth <= 1024;
    }

    isDesktop() {
        return window.innerWidth > 1024;
    }

    // theme utilities
    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        Utils.storage.set('theme', theme);
    }

    getTheme() {
        return Utils.storage.get('theme') || 'light';
    }

    toggleTheme() {
        const currentTheme = this.getTheme();
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';

        this.setTheme(newTheme);
    }
}

// global exports for backward compatibility
window.UIManager = UIManager;
window.uiManager = new UIManager();
window.setupScrollTopBar = () => uiManager.setupScrollTopBar();