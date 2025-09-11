
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

    setupToggleButtonEvents(toggleBtn, infoBox) {
        // Safety check - ensure toggle button exists
        if (!toggleBtn) {
            console.warn('⚠️ Toggle button not found in info box');
            return;
        }

        const infoBoxContent = infoBox.querySelector('.info-box-content');
        if (!infoBoxContent) {
            console.warn('⚠️ Info box content not found');
            return;
        }

        let isExpanded = infoBoxContent.classList.contains('expanded');

        const toggleInfoBox = () => {
            isExpanded = !isExpanded;

            if (isExpanded) {
                infoBoxContent.classList.remove('collapsed');
                infoBoxContent.classList.add('expanded');
                toggleBtn.textContent = '−';
            } else {
                infoBoxContent.classList.remove('expanded');
                infoBoxContent.classList.add('collapsed');
                toggleBtn.textContent = '+';
            }
        };

        // Toggle on button click
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleInfoBox();
        });

        // Toggle on header click
        const header = infoBox.querySelector('.info-box-header');
        if (header) {
            header.addEventListener('click', (e) => {
                if (e.target !== toggleBtn) {
                    toggleInfoBox();
                }
            });
        }
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
        const spacer = this.imageManager.ui.createNavigationSpacer();

        // Rating is now part of the metadata grid in the info box
        // No need to create separate rating element

        return { spacer };
    }

    shouldShowPublicToggle(imageData) {
        // If we can see the toggle, the user should be able to control it
        // The server will handle authentication and ownership validation
        if (!imageData || !imageData.id) {
            return false;
        }

        // Check if user is authenticated
        const isAuthenticated = window.userApi && window.userApi.isAuthenticated();
        if (!isAuthenticated) {
            return false;
        }

        // If userId is not in the image data, assume it's the user's image
        // (since they can see it in their feed)
        const currentUserId = this.getCurrentUserId();
        if (!imageData.userId) {
            console.log('🔍 Image missing userId, assuming user owns it');
            return true; // Assume user owns it if they can see it
        }

        return currentUserId && imageData.userId === currentUserId;
    }

    getCurrentUserId() {
        // Try to get user ID from various sources
        if (window.userApi && window.userApi.getCurrentUser) {
            const user = window.userApi.getCurrentUser();
            return user?.id || user?._id;
        }

        // Fallback: try to get from localStorage or other sources
        try {
            const token = localStorage.getItem('authToken');
            if (token) {
                // Decode JWT token to get user ID (basic implementation)
                const payload = JSON.parse(atob(token.split('.')[1]));
                return payload.userId || payload.id;
            }
        } catch (error) {
            console.warn('Could not decode auth token:', error);
        }

        return null;
    }

    showNotification(message, type = 'info') {
        // Try to use existing notification system if available
        if (window.showNotification) {
            window.showNotification(message, type);
            return;
        }

        // Fallback: create a simple notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            max-width: 300px;
            word-wrap: break-word;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            transition: all 0.3s ease;
        `;

        // Set background color based on type
        switch (type) {
            case 'success':
                notification.style.backgroundColor = '#10b981';
                break;
            case 'error':
                notification.style.backgroundColor = '#ef4444';
                break;
            case 'warning':
                notification.style.backgroundColor = '#f59e0b';
                break;
            default:
                notification.style.backgroundColor = '#3b82f6';
        }

        notification.textContent = message;
        document.body.appendChild(notification);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, 3000);
    }

    setupPublicStatusToggleEvents(publicStatusToggle) {
        const checkbox = publicStatusToggle.querySelector('.public-status-checkbox');
        const label = publicStatusToggle.querySelector('.public-status-label');

        if (!checkbox) {
            console.error('Checkbox not found in public status toggle');
            return;
        }

        checkbox.addEventListener('change', async () => {
            if (!this.imageManager.currentFullscreenImage) {
                console.error('No current fullscreen image available');
                return;
            }

            const currentImage = this.imageManager.currentFullscreenImage;
            const newPublicStatus = checkbox.checked;

            try {
                // Show loading state
                checkbox.disabled = true;
                label.textContent = 'Updating...';
                publicStatusToggle.style.opacity = '0.6';

                // Update the public status via API
                const success = await this.imageManager.updateImagePublicStatus(currentImage.id, newPublicStatus);

                if (success) {
                    // Show success feedback
                    console.log(`✅ Image ${newPublicStatus ? 'made public' : 'made private'} successfully`);
                    this.showNotification(`Image ${newPublicStatus ? 'made public' : 'made private'} successfully`, 'success');
                } else {
                    // Revert on failure
                    checkbox.checked = !newPublicStatus;
                    console.error('Failed to update public status');
                    this.showNotification('Failed to update public status', 'error');
                }
            } catch (error) {
                console.error('Error updating public status:', error);
                // Revert on error
                checkbox.checked = !newPublicStatus;

                // Show user-friendly error message
                let errorMessage = 'Failed to update public status';
                if (error.message) {
                    if (error.message.includes('own images') || error.message.includes('not authorized')) {
                        errorMessage = 'You can only update your own images';
                    } else if (error.message.includes('Authentication required') || error.message.includes('Unauthorized')) {
                        errorMessage = 'Authentication error - please refresh the page';
                    } else {
                        errorMessage = error.message;
                    }
                }
                this.showNotification(errorMessage, 'error');
            } finally {
                // Re-enable the checkbox and restore label
                checkbox.disabled = false;
                label.textContent = 'Public';
                publicStatusToggle.style.opacity = '1';
            }
        });
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
