
// Image Event Layer - Event handling and user interactions
class ImageEvents {
    constructor(imageManager) {
        this.imageManager = imageManager;
        this.currentKeyHandler = null;
        this.currentClickHandler = null;
    }

    setupEventDelegation() {
        const imageContainer = document.querySelector('.prompt-output') || document.querySelector('.images-section');

        if (imageContainer) {
            imageContainer.addEventListener('click', e => {
                this.handleImageClick(e);
            });

        } else {
            console.warn('⚠️ No image container found for event delegation');
        }
    }

    handleImageClick(e) {
        const img = e.target.closest('img');

        if (!img) {
            return;
        }

        const isGeneratedImage = this.isGeneratedImage(img);

        if (!isGeneratedImage) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        const imageData = this.imageManager.data.extractImageDataFromElement(img);

        this.imageManager.openFullscreen(imageData);
    }

    isGeneratedImage(img) {
        return img.classList.contains('generated-image')
            || img.style.cursor === 'pointer'
            || img.dataset.id
            || img.src.includes('uploads/')
            || img.alt.includes('Generated')
            || img.title.includes('Generated');
    }

    // Removed duplicate createImageDataFromElement - now using ImageData.extractImageDataFromElement

    setupFullscreenEvents() {
        this.setupKeyboardEvents();
        this.setupBackgroundClick();
    }

    setupKeyboardEvents() {
        const handleKeyDown = event => {
            switch (event.key) {
                case 'Escape': {
                    this.imageManager.closeFullscreen();
                    document.removeEventListener('keydown', handleKeyDown);
                    break;
                }
                case 'ArrowLeft':
                    this.imageManager.navigateImage('prev');
                    break;
                case 'ArrowRight':
                    this.imageManager.navigateImage('next');
                    break;
                case '0':
                case '1':
                case '2':
                case '3':
                case '4':
                case '5': {
                    const rating = parseInt(event.key);

                    this.imageManager.rateImageInFullscreen(rating);
                    break;
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        this.currentKeyHandler = handleKeyDown;
    }

    setupBackgroundClick() {
        const handleBackgroundClick = event => {
            if (event.target === this.imageManager.fullscreenContainer) {
                this.imageManager.closeFullscreen();
                this.imageManager.fullscreenContainer.removeEventListener('click', handleBackgroundClick);
            }
        };

        if (this.imageManager.fullscreenContainer && typeof this.imageManager.fullscreenContainer.addEventListener === 'function') {
            this.imageManager.fullscreenContainer.addEventListener('click', handleBackgroundClick);
        }

        this.currentClickHandler = handleBackgroundClick;
    }

    setupToggleButtonEvents(_btn, infoBox) {
        let isInfoVisible = false;
        const infoBoxContent = infoBox.querySelector('.info-box');

        _btn.onclick = () => {
            isInfoVisible = !isInfoVisible;
            if (isInfoVisible) {
                infoBoxContent.style.display = 'block';
                setTimeout(() => {
                    infoBoxContent.style.opacity = '1';
                    infoBoxContent.style.transform = 'translateY(0)';
                }, 10);
                _btn.innerHTML = '✕';
            } else {
                infoBoxContent.style.opacity = '0';
                infoBoxContent.style.transform = 'translateY(-10px)';
                setTimeout(() => {
                    infoBoxContent.style.display = 'none';
                }, 300);
                _btn.innerHTML = 'ℹ️';
            }
        };
    }

    setupButtonHoverEffects(_btn) {
        _btn.onmouseenter = () => {
            _btn.style.background = 'rgba(0, 0, 0, 0.9)';
            _btn.style.transform = 'translateY(-1px)';
            _btn.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.4)';
        };
        _btn.onmouseleave = () => {
            _btn.style.background = 'rgba(0, 0, 0, 0.8)';
            _btn.style.transform = 'translateY(0)';
            _btn.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.3)';
        };
    }

    setupNavigationButtonEvents(navControls, imageData) {
        const prevBtn = this.imageManager.ui.createButton('← Previous');
        const downloadBtn = this.imageManager.ui.createButton('Download');
        const nextBtn = this.imageManager.ui.createButton('Next →');
        const closeBtn = this.imageManager.ui.createButton('× Close');

        prevBtn.addEventListener('click', () => this.imageManager.navigateImage('prev'));
        downloadBtn.addEventListener('click', () => this.imageManager.downloadImage(imageData));
        nextBtn.addEventListener('click', () => this.imageManager.navigateImage('next'));
        closeBtn.addEventListener('click', () => this.imageManager.closeFullscreen());

        navControls.appendChild(prevBtn);
        navControls.appendChild(downloadBtn);
        navControls.appendChild(nextBtn);
        navControls.appendChild(closeBtn);
    }

    setupRatingDisplayEvents(ratingDisplay, infoBox) {
        const toggleBtn = this.imageManager.ui.createToggleButton();

        this.setupToggleButtonEvents(toggleBtn, infoBox);
        this.setupButtonHoverEffects(toggleBtn);
        const spacer = this.imageManager.ui.createNavigationSpacer();
        const rating = this.imageManager.currentFullscreenImage?.rating || '-';
        const ratingElement = this.imageManager.ui.createRatingDisplay(rating);

        return { spacer, ratingElement, toggleBtn };
    }

    cleanupEvents() {
        if (this.currentKeyHandler) {
            document.removeEventListener('keydown', this.currentKeyHandler);
            this.currentKeyHandler = null;
        }

        if (this.currentClickHandler && this.imageManager.fullscreenContainer) {
            this.imageManager.fullscreenContainer.removeEventListener('click', this.currentClickHandler);
            this.currentClickHandler = null;
        }
    }

    reSetupEventDelegation() {

        this.setupEventDelegation();
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.ImageEvents = ImageEvents;
}
