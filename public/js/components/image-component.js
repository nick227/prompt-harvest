// image Component - Handles image rendering, fullscreen viewing, and image management
class ImageComponent {
    constructor() {
        this.config = null;
        this.isInitialized = false;
        this.imageCache = new Map();
        this.fullscreenContainer = null;
        this.currentFullscreenImage = null;
        this.cachedImageOrder = null;
        this.currentKeyHandler = null;
        this.currentClickHandler = null;
    }

    getConfig() {
        if (!this.config) {
            this.config = window.IMAGE_CONFIG || {
                classes: {
                    image: 'generated-image',
                    imageWrapper: 'image-wrapper',
                    rating: 'image-rating',
                    fullscreenContainer: 'fullscreen-container'
                },
                selectors: {
                    fullscreenContainer: '.fullscreen-container'
                }
            };
        }

        return this.config;
    }

    init() {
        console.log('🔧 ImageComponent initializing...');

        this.setupFullscreenContainer();
        this.setupEventDelegation();
        this.isInitialized = true;
        console.log('✅ ImageComponent initialized successfully');
    }

    // Public method to re-setup event delegation (useful for debugging)
    reSetupEventDelegation() {
        console.log('🔄 Re-setting up event delegation...');
        this.setupEventDelegation();
    }

    setupFullscreenContainer() {
        // create fullscreen container if it doesn't exist
        const config = this.getConfig();

        this.fullscreenContainer = Utils.dom.get(config.selectors.fullscreenContainer);
        if (!this.fullscreenContainer) {
            this.fullscreenContainer = Utils.dom.createElement('div', config.classes.fullscreenContainer);
            this.fullscreenContainer.style.display = 'none';
            this.fullscreenContainer.style.position = 'fixed';
            this.fullscreenContainer.style.top = '0';
            this.fullscreenContainer.style.left = '0';
            this.fullscreenContainer.style.width = '100%';
            this.fullscreenContainer.style.height = '100%';
            this.fullscreenContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
            this.fullscreenContainer.style.zIndex = '9999';
            this.fullscreenContainer.style.justifyContent = 'center';
            this.fullscreenContainer.style.alignItems = 'center';
            document.body.appendChild(this.fullscreenContainer);
        }
    }

    setupEventDelegation() {
        // Use event delegation on the parent container for all image clicks
        const imageContainer = document.querySelector('.prompt-output') || document.querySelector('.images-section');

        if (imageContainer) {
            imageContainer.addEventListener('click', e => {
                // Check if clicked element is an image or inside an image wrapper
                const img = e.target.closest('img');

                if (img) {
                    // Check if it's a generated image (multiple conditions for compatibility)
                    const isGeneratedImage = img.classList.contains('generated-image')
                        || img.style.cursor === 'pointer'
                        || img.dataset.id
                        || img.src.includes('uploads/')
                        || img.alt.includes('Generated')
                        || img.title.includes('Generated');

                    if (isGeneratedImage) {
                        e.preventDefault();
                        e.stopPropagation();

                        console.log('🖼️ Image clicked via delegation:', img.dataset.id || img.src);
                        console.log('Image classes:', img.className);
                        console.log('Image dataset:', img.dataset);

                        // Create image data from the clicked image
                        const imageData = this.createImageDataFromElement(img);

                        this.openFullscreen(imageData);
                    }
                }
            });

            console.log('✅ Event delegation setup on:', imageContainer);
        } else {
            console.warn('⚠️ No image container found for event delegation');
        }
    }

    createImageDataFromElement(img) {
        // Extract image data from the DOM element
        const imageData = {
            id: img.dataset.id || img.dataset.imageId || 'unknown',
            url: img.src,
            title: img.alt || img.title || 'Generated Image',
            prompt: img.dataset.prompt || img.alt || '',
            original: img.dataset.original || '',
            provider: img.dataset.provider || '',
            guidance: img.dataset.guidance || '',
            rating: img.dataset.rating || '0'
        };

        console.log('📋 Extracted image data from DOM:', imageData);
        console.log('📋 Dataset attributes:', {
            id: img.dataset.id,
            provider: img.dataset.provider,
            prompt: img.dataset.prompt,
            original: img.dataset.original,
            guidance: img.dataset.guidance,
            rating: img.dataset.rating
        });

        return imageData;
    }

    // image Creation Methods
    createImageElement(imageData) {
        const config = this.getConfig();
        const img = Utils.dom.createElement('img', config.classes.image);

        img.src = imageData.url;
        img.alt = imageData.title || 'Generated Image';
        img.dataset.id = imageData.id;
        img.dataset.rating = imageData.rating || '0';
        img.dataset.provider = imageData.provider || 'unknown';
        img.dataset.prompt = imageData.prompt || '';
        img.dataset.original = imageData.original || '';
        img.dataset.guidance = imageData.guidance || '';

        // add debugging for image loading
        img.onerror = () => console.error('Image failed to load:', imageData.url);

        // add inline styles to ensure visibility
        img.style.width = '100%';
        img.style.height = '150px';
        img.style.objectFit = 'cover';
        img.style.display = 'block';
        img.style.borderRadius = '3px';

        // Click events now handled by event delegation on parent container
        img.style.cursor = 'pointer';

        return img;
    }

    createImageWrapper(imageData) {
        const config = this.getConfig();
        const wrapper = Utils.dom.createElement('div', config.classes.imageWrapper);

        const img = this.createImageElement(imageData);

        wrapper.appendChild(img);

        // add rating display
        if (imageData.rating && imageData.rating > 0) {
            const ratingElement = Utils.dom.createElement('div', config.classes.rating);

            ratingElement.textContent = `★ ${imageData.rating}`;
            wrapper.appendChild(ratingElement);
        }

        return wrapper;
    }

    // image Rendering Methods
    renderImage(imageData, container) {
        if (!this.validateImageData(imageData)) {
            return null;
        }

        const wrapper = this.createImageWrapper(imageData);

        container.appendChild(wrapper);

        // cache the image
        const cachedData = {
            id: imageData.id,
            url: imageData.url,
            title: imageData.title,
            prompt: imageData.prompt,
            original: imageData.original,
            provider: imageData.provider,
            guidance: imageData.guidance,
            rating: imageData.rating,
            element: wrapper
        };

        this.imageCache.set(imageData.id, cachedData);

        return wrapper;
    }

    renderImages(images, container) {
        if (!Array.isArray(images)) {
            return [];
        }

        const renderedImages = [];

        images.forEach(imageData => {
            const rendered = this.renderImage(imageData, container);

            if (rendered) {
                renderedImages.push(rendered);
            }
        });

        return renderedImages;
    }

    // fullscreen Methods
    openFullscreen(imageData) {
        console.log('🔍 openFullscreen called with:', imageData.id);

        if (!this.fullscreenContainer) {
            console.log('🔧 Setting up fullscreen container...');
            this.setupFullscreenContainer();
        }

        this.currentFullscreenImage = imageData;
        this.fullscreenContainer.innerHTML = '';

        const imageContainer = this.createFullscreenImage(imageData);
        const infoBox = this.createInfoBox(imageData);
        const navControls = this.createNavigationControls(imageData);

        // Add navigation controls to the image container
        imageContainer.appendChild(navControls);

        // Add info button and rating to the navigation row
        this.addControlsToNavigation(navControls, infoBox, imageData.rating || '-');

        console.log('🔧 Fullscreen controls added:', {
            infoBox: !!infoBox,
            navControls: !!navControls,
            imageContainer: !!imageContainer
        });

        this.fullscreenContainer.appendChild(imageContainer);
        this.fullscreenContainer.style.display = 'flex';

        console.log('✅ Fullscreen opened for image:', imageData.id);

        // Disable infinite scroll when in fullscreen
        this.disableInfiniteScroll();

        this.setupFullscreenEvents();
    }

    createFullscreenImage(imageData) {
        const imageContainer = Utils.dom.createElement('div');

        this.setupFullscreenImageContainer(imageContainer);
        const fullscreenImg = this.createFullscreenImg(imageData);

        imageContainer.appendChild(fullscreenImg);

        return imageContainer;
    }

    setupFullscreenImageContainer(container) {
        container.style.position = 'relative';
        container.style.display = 'flex';
        container.style.justifyContent = 'center';
        container.style.alignItems = 'center';
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.overflow = 'visible';
        container.style.paddingTop = '80px';
    }

    createFullscreenImg(imageData) {
        const fullscreenImg = Utils.dom.createElement('img');

        fullscreenImg.src = imageData.url;
        fullscreenImg.alt = imageData.title || 'Fullscreen Image';
        fullscreenImg.style.maxWidth = '90%';
        fullscreenImg.style.maxHeight = '90%';
        fullscreenImg.style.objectFit = 'contain';
        fullscreenImg.style.cursor = 'pointer';

        this.addFullscreenDataset(fullscreenImg, imageData);

        return fullscreenImg;
    }

    addFullscreenDataset(img, imageData) {
        img.dataset.id = imageData.id;
        img.dataset.rating = imageData.rating || '0';
        img.dataset.provider = imageData.provider || '';
        img.dataset.prompt = imageData.prompt || '';
        img.dataset.original = imageData.original || '';
    }

    createInfoBox(imageData) {
        const infoContainer = Utils.dom.createElement('div');

        this.setupInfoContainer(infoContainer);

        const infoBox = this.createInfoBoxContent();

        this.setupInfoBoxStyles(infoBox);
        this.addInfoContent(infoBox, imageData);

        infoContainer.appendChild(infoBox);

        return infoContainer;
    }

    setupInfoContainer(container) {
        container.className = 'info-container';
        container.style.position = 'absolute';
        container.style.display = 'none';
        container.style.zIndex = '10001';
    }

    createInfoBoxContent() {
        const infoBox = Utils.dom.createElement('div');

        infoBox.className = 'info-box';

        return infoBox;
    }

    setupInfoBoxStyles(infoBox) {
        infoBox.style.position = 'fixed';
        infoBox.style.bottom = '100px';
        infoBox.style.right = '33%';
        infoBox.style.transform = 'translateX(50%)';
        infoBox.style.width = '350px';
        infoBox.style.color = 'white';
        infoBox.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
        infoBox.style.padding = '25px';
        infoBox.style.borderRadius = '12px';
        infoBox.style.maxHeight = '80vh';
        infoBox.style.overflowY = 'auto';
        infoBox.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3)';
        infoBox.style.border = '1px solid rgba(255, 255, 255, 0.1)';
        infoBox.style.display = 'none';
        infoBox.style.transition = 'all 0.3s ease';
        infoBox.style.opacity = '0';
        infoBox.style.transform = 'translateY(-10px)';
    }

    addInfoContent(infoBox, imageData) {
        console.log('🔍 Adding info content for image:', imageData);
        console.log('🔍 Provider data:', {
            provider: imageData.provider,
            providerName: imageData.providerName,
            dataset: imageData.dataset
        });

        this.addInfoText(infoBox, imageData.original, 'original');
        this.addInfoText(infoBox, imageData.prompt, 'prompt');

        // Try multiple provider field names
        const provider = imageData.provider || imageData.providerName || '';

        if (provider) {
            this.addInfoText(infoBox, `Model: ${provider}`, 'provider');
        }

        this.addRatingText(infoBox, imageData.rating);
    }

    addControlsToNavigation(navControls, infoBox, rating) {
        const spacer = this.createNavigationSpacer();
        const ratingDisplay = this.createRatingDisplay(rating);
        const navToggleBtn = this.createNavigationToggleButton(infoBox);

        this.addControlsToNav(navControls, spacer, ratingDisplay, navToggleBtn);
        this.setupInfoBox(infoBox, navControls);
    }

    createNavigationSpacer() {
        const spacer = Utils.dom.createElement('div');

        spacer.style.width = '40px';
        spacer.style.flexShrink = '0';

        return spacer;
    }

    createRatingDisplay(rating) {
        const ratingDisplay = Utils.dom.createElement('div');

        ratingDisplay.className = 'rating-display-nav';
        ratingDisplay.style.background = 'rgba(0, 0, 0, 0.8)';
        ratingDisplay.style.color = rating === '-' ? '#888' : '#ffd700';
        ratingDisplay.style.padding = '8px 12px';
        ratingDisplay.style.borderRadius = '20px';
        ratingDisplay.style.fontSize = '12px';
        ratingDisplay.style.fontWeight = '600';
        ratingDisplay.style.border = rating === '-' ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(255, 215, 0, 0.3)';
        ratingDisplay.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.3)';
        ratingDisplay.style.backdropFilter = 'blur(10px)';
        ratingDisplay.style.minWidth = '36px';
        ratingDisplay.style.height = '36px';
        ratingDisplay.style.display = 'flex';
        ratingDisplay.style.alignItems = 'center';
        ratingDisplay.style.justifyContent = 'center';
        ratingDisplay.innerHTML = rating === '-' ? '-' : `★ ${rating}`;

        return ratingDisplay;
    }

    createNavigationToggleButton(infoBox) {
        const navToggleBtn = Utils.dom.createElement('button');

        this.setupToggleButtonStyles(navToggleBtn);
        this.addToggleButtonHoverEffects(navToggleBtn);
        this.addToggleButtonFunctionality(navToggleBtn, infoBox);

        return navToggleBtn;
    }

    setupToggleButtonStyles(btn) {
        btn.className = 'info-toggle-btn-nav';
        btn.innerHTML = 'ℹ️';
        btn.style.background = 'rgba(0, 0, 0, 0.9)';
        btn.style.color = 'white';
        btn.style.border = '2px solid rgba(255, 255, 255, 0.3)';
        btn.style.padding = '8px 12px';
        btn.style.borderRadius = '20px';
        btn.style.cursor = 'pointer';
        btn.style.fontSize = '14px';
        btn.style.fontWeight = '600';
        btn.style.transition = 'all 0.3s ease';
        btn.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.5)';
        btn.style.minWidth = '36px';
        btn.style.height = '36px';
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.justifyContent = 'center';
        btn.style.backdropFilter = 'blur(10px)';
    }

    addToggleButtonHoverEffects(btn) {
        btn.onmouseenter = () => {
            btn.style.background = 'rgba(0, 0, 0, 0.9)';
            btn.style.transform = 'translateY(-1px)';
            btn.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.4)';
        };
        btn.onmouseleave = () => {
            btn.style.background = 'rgba(0, 0, 0, 0.8)';
            btn.style.transform = 'translateY(0)';
            btn.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.3)';
        };
    }

    addToggleButtonFunctionality(btn, infoBox) {
        let isInfoVisible = false;
        const infoBoxContent = infoBox.querySelector('.info-box');

        btn.onclick = () => {
            isInfoVisible = !isInfoVisible;
            if (isInfoVisible) {
                infoBoxContent.style.display = 'block';
                setTimeout(() => {
                    infoBoxContent.style.opacity = '1';
                    infoBoxContent.style.transform = 'translateY(0)';
                }, 10);
                btn.innerHTML = '✕';
            } else {
                infoBoxContent.style.opacity = '0';
                infoBoxContent.style.transform = 'translateY(-10px)';
                setTimeout(() => {
                    infoBoxContent.style.display = 'none';
                }, 300);
                btn.innerHTML = 'ℹ️';
            }
        };
    }

    addControlsToNav(navControls, spacer, ratingDisplay, navToggleBtn) {
        navControls.appendChild(spacer);
        navControls.appendChild(ratingDisplay);
        navControls.appendChild(navToggleBtn);
    }

    setupInfoBox(infoBox, navControls) {
        navControls.parentNode.appendChild(infoBox);
        infoBox.style.display = 'block';
    }

    disableInfiniteScroll() {
        // Disable the feed manager's intersection observer when in fullscreen
        if (window.feedManager && window.feedManager.intersectionObserver) {
            console.log('🔒 Disabling infinite scroll for fullscreen mode');
            window.feedManager.intersectionObserver.disconnect();
        }
    }

    enableInfiniteScroll() {
        // Re-enable the feed manager's intersection observer when exiting fullscreen
        if (window.feedManager) {
            console.log('🔓 Re-enabling infinite scroll after fullscreen mode');

            // Force a small delay to ensure DOM is stable
            setTimeout(() => {
                // Re-setup the lazy loading completely
                if (window.feedManager.setupLazyLoading) {
                    window.feedManager.setupLazyLoading();
                }

                // Force update the target
                if (window.feedManager.updateLazyLoadingTarget) {
                    window.feedManager.updateLazyLoadingTarget();
                }

                console.log('✅ Infinite scroll re-enabled');
            }, 100);
        }
    }


    addInfoText(container, text, type) {
        if (!text) {
            return;
        }

        const textElement = Utils.dom.createElement('div');
        const isPrompt = type === 'original' || type === 'prompt';

        if (isPrompt) {
            textElement.innerHTML = `<strong>${type === 'original' ? 'Original:' : 'Prompt:'}</strong><br>${text}`;
        } else {
            textElement.innerHTML = `<strong>${text.split(':')[0]}:</strong> ${text.split(':')[1] || text}`;
        }

        textElement.style.marginBottom = '15px';
        textElement.style.lineHeight = '1.4';
        textElement.style.wordWrap = 'break-word';
        textElement.style.fontSize = '13px';
        textElement.style.color = '#e0e0e0';
        textElement.style.paddingBottom = '15px';
        textElement.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';

        container.appendChild(textElement);
    }

    addRatingText(container, rating) {
        if (!rating || rating === '-') {
            return;
        }

        const ratingText = Utils.dom.createElement('div');

        ratingText.innerHTML = `<strong>Rating:</strong> ★ ${rating}`;
        ratingText.style.marginBottom = '15px';
        ratingText.style.lineHeight = '1.4';
        ratingText.style.color = '#ffd700';
        ratingText.style.fontSize = '13px';
        ratingText.style.fontWeight = '600';
        ratingText.style.paddingBottom = '15px';
        ratingText.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';

        container.appendChild(ratingText);
    }

    createNavigationControls(imageData) {
        const navControls = Utils.dom.createElement('div');

        navControls.style.position = 'absolute';
        navControls.style.bottom = '20px';
        navControls.style.left = '50%';
        navControls.style.transform = 'translateX(-50%)';
        navControls.style.zIndex = '10000';
        navControls.style.display = 'flex';
        navControls.style.gap = '10px';
        navControls.style.alignItems = 'center';

        const prevBtn = this.createButton('← Previous', () => this.navigateImage('prev'));
        const downloadBtn = this.createButton('Download', () => this.downloadImage(imageData));
        const nextBtn = this.createButton('Next →', () => this.navigateImage('next'));
        const closeBtn = this.createButton('× Close', () => this.closeFullscreen());

        navControls.appendChild(prevBtn);
        navControls.appendChild(downloadBtn);
        navControls.appendChild(nextBtn);
        navControls.appendChild(closeBtn);

        return navControls;
    }

    createButton(text, onClick) {
        const button = Utils.dom.createElement('button');

        button.innerHTML = text;
        button.style.background = 'rgba(0, 0, 0, 0.7)';
        button.style.color = 'white';
        button.style.border = 'none';
        button.style.padding = '10px 20px';
        button.style.borderRadius = '5px';
        button.style.cursor = 'pointer';
        button.addEventListener('click', onClick);

        return button;
    }

    closeFullscreen() {
        if (this.fullscreenContainer) {
            this.fullscreenContainer.style.display = 'none';
            this.currentFullscreenImage = null;

            // Re-enable infinite scroll when exiting fullscreen
            this.enableInfiniteScroll();

            // Clean up event listeners
            if (this.currentKeyHandler) {
                document.removeEventListener('keydown', this.currentKeyHandler);
                this.currentKeyHandler = null;
            }

            if (this.currentClickHandler && this.fullscreenContainer) {
                this.fullscreenContainer.removeEventListener('click', this.currentClickHandler);
                this.currentClickHandler = null;
            }
        }
    }

    setupFullscreenEvents() {
        // handle keyboard navigation
        const handleKeyDown = event => {
            switch (event.key) {
                case 'Escape':
                    this.closeFullscreen();
                    document.removeEventListener('keydown', handleKeyDown);
                    break;
                case 'ArrowLeft':
                    this.navigateImage('prev');
                    break;
                case 'ArrowRight':
                    this.navigateImage('next');
                    break;
                case '0':
                case '1':
                case '2':
                case '3':
                case '4':
                case '5':
                {
                    const rating = parseInt(event.key);

                    this.rateImageInFullscreen(rating);
                    break;
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        // close on background click
        const handleBackgroundClick = event => {
            if (event.target === this.fullscreenContainer) {
                this.closeFullscreen();
                this.fullscreenContainer.removeEventListener('click', handleBackgroundClick);
            }
        };

        if (this.fullscreenContainer && typeof this.fullscreenContainer.addEventListener === 'function') {
            this.fullscreenContainer.addEventListener('click', handleBackgroundClick);
        }

        // Store the handlers for cleanup
        this.currentKeyHandler = handleKeyDown;
        this.currentClickHandler = handleBackgroundClick;
    }

    // image Management Methods
    removeImage(imageId) {
        const cached = this.imageCache.get(imageId);

        if (cached && cached.element) {
            cached.element.remove();
            this.imageCache.delete(imageId);

            return true;
        }

        return false;
    }

    updateImageRating(imageId, rating) {
        const cached = this.imageCache.get(imageId);

        if (cached) {
            cached.rating = rating;
            cached.element.dataset.rating = rating.toString();

            // update rating display
            const config = this.getConfig();
            const ratingElement = cached.element.querySelector(`.${config.classes.rating}`);

            if (ratingElement) {
                ratingElement.textContent = `★ ${rating}`;
            }

            return true;
        }

        return false;
    }

    async rateImageInFullscreen(rating) {
        if (!this.currentFullscreenImage || !this.currentFullscreenImage.id) {
            console.error('No image data available for rating');
            return;
        }

        try {
            console.log(`Rating image ${this.currentFullscreenImage.id} with rating ${rating}`);

            // Call the rating API using centralized service
            await imageApi.rateImage(this.currentFullscreenImage.id, rating);

            // Update the image data
            this.currentFullscreenImage.rating = rating;

            // Update the rating display in navigation
            const ratingDisplay = this.fullscreenContainer.querySelector('.rating-display-nav');

            if (ratingDisplay) {
                ratingDisplay.textContent = rating > 0 ? `★ ${rating}` : '—';
            }

            // Update the info panel rating
            const infoBox = this.fullscreenContainer.querySelector('.info-box');

            if (infoBox) {
                const ratingText = infoBox.querySelector('div:first-child');

                if (ratingText && ratingText.innerHTML.includes('Rating:')) {
                    ratingText.innerHTML = `<strong>Rating:</strong> ${rating > 0 ? `★ ${rating}` : '—'}`;
                }
            }

            // Update the grid view
            this.updateImageRating(this.currentFullscreenImage.id, rating);

            // Show feedback
            this.showRatingFeedback(rating);

            console.log('Rating updated successfully');
        } catch (error) {
            console.error('Error updating rating:', error);
            this.showError(`Rating failed: ${error.message}`);
        }
    }

    showRatingFeedback(rating) {
        // Create a temporary feedback element
        const feedback = document.createElement('div');

        feedback.textContent = `Rated: ${'★'.repeat(rating)}`;
        feedback.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            color: #ffd700;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 10002;
            font-size: 16px;
            font-weight: bold;
        `;

        document.body.appendChild(feedback);

        // Remove after 2 seconds
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.parentNode.removeChild(feedback);
            }
        }, 2000);
    }

    getImageById(imageId) {
        return this.imageCache.get(imageId);
    }

    getAllImages() {
        return Array.from(this.imageCache.values());
    }

    clearAllImages() {
        this.imageCache.clear();
        const container = Utils.dom.get(this.config.selectors.imageContainer);

        if (container) {
            container.innerHTML = '';
        }
    }

    // utility Methods
    formatTitle(title, maxLength = 124) {
        if (!title) {
            return '';
        }
        if (title.length <= maxLength) {
            return title;
        }

        return `${title.substring(0, maxLength - 3)}...`;
    }

    generateId() {
        return `
                img_$ { Date.now() }
                _$ { Math.random().toString(36).substr(2, 9) }
                `;
    }

    validateImageData(imageData) {
        return !!(imageData && imageData.url);
    }

    handleImageError(img) {
        img.src = this.config.defaults.errorImage || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIEVycm9yPC90ZXh0Pjwvc3ZnPg==';
    }

    // download Methods
    downloadImage(imageData) {
        const link = Utils.dom.createElement('a');

        link.href = imageData.url;
        link.download = `${this.makeFileNameSafe(imageData.title || 'image')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    makeFileNameSafe(name) {
        return name
            .replace(/[\x00-\x1F<>:"/\\|?*.,;(){}[\]!@#$%^&+=`~]/g, '') // eslint-disable-line no-control-regex
            .substring(0, 100)
            .trim();
    }

    // interaction Methods
    toggleLike(imageId) {
        const cached = this.imageCache.get(imageId);

        if (cached) {
            const isLiked = cached.element.classList.contains(this.config.classes.liked);

            if (isLiked) {
                cached.element.classList.remove(this.config.classes.liked);
            } else {
                cached.element.classList.add(this.config.classes.liked);
            }

            return !isLiked;
        }

        return false;
    }

    navigateImage(direction) {
        console.log(`Navigating ${direction} from current image:`, this.currentFullscreenImage ? this.currentFullscreenImage.id : 'undefined');

        const allImages = this.getAllVisibleImages();

        if (allImages.length === 0) {
            console.log('No images found for navigation');

            return;
        }

        const currentIndex = allImages
            .findIndex(img => img.id === (this.currentFullscreenImage ? this.currentFullscreenImage.id : null));

        console.log(`Current index: ${currentIndex}, Total images: ${allImages.length}`);

        if (currentIndex === -1) {
            console.log('Current image not found in navigation list, using first image');
            if (allImages.length > 0) {
                this.openFullscreen(allImages[0]);
            }

            return;
        }

        let newIndex;

        if (direction === 'next') {
            newIndex = (currentIndex + 1) % allImages.length;
        } else if (direction === 'prev') {
            newIndex = currentIndex === 0 ? allImages.length - 1 : currentIndex - 1;
        }

        console.log(`New index: ${newIndex}, Image ID: ${allImages[newIndex] ? allImages[newIndex].id : 'undefined'}`);

        if (newIndex !== undefined && allImages[newIndex]) {
            this.openFullscreen(allImages[newIndex]);
        } else {
            console.log('Failed to navigate: invalid new index or image');
        }
    }

    getAllVisibleImages() {
        const container = Utils.dom.get(this.config.selectors.imageContainer);

        if (!container) {
            console.log('No image container found');

            return [];
        }

        // Look for images within li elements in the prompt-output
        const imageElements = container.querySelectorAll('li img[data-id]');
        const images = [];

        imageElements.forEach(imgElement => {

            const imageData = {
                id: imgElement.dataset.id,
                url: imgElement.src,
                title: imgElement.alt || '',
                prompt: imgElement.dataset.prompt || '',
                original: imgElement.dataset.original || '',
                provider: imgElement.dataset.provider || '',
                guidance: imgElement.dataset.guidance || '',
                rating: imgElement.dataset.rating || '0'
            };

            // If we have cached data, use it for more complete information
            const cached = this.imageCache.get(imageData.id);

            if (cached) {
                Object.assign(imageData, cached);
            }

            images.push(imageData);
        });

        console.log(`Found ${images.length} visible images for navigation`);

        return images;
    }

    // public API Methods
    initialize() {
        this.init();
    }

    refresh() {
        // re-render all cached images
        const images = this.getAllImages();
        const container = Utils.dom.get(this.config.selectors.imageContainer);

        if (container && images.length > 0) {
            container.innerHTML = '';
            this.renderImages(images, container);
        }
    }

    // export functions for global access (maintaining backward compatibility)
    renderImageGlobal(imageData, container) {
        return this.renderImage(imageData, container);
    }

    openFullscreenGlobal(imageData) {
        return this.openFullscreen(imageData);
    }

    closeFullscreenGlobal() {
        return this.closeFullscreen();
    }

    clearImageOrderCache() {
        this.cachedImageOrder = null;
        console.log('Image order cache cleared');
    }
}

// export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImageComponent;
}

// initialize global instance
if (typeof window !== 'undefined') {
    window.ImageComponent = ImageComponent;
    window.imageComponent = new ImageComponent();
}
