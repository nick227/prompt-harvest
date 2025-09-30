// Rating Buttons Component - Plus and minus rating buttons
class RatingButtons {
    constructor(imageId, currentRating = 0) {
        this.imageId = imageId;
        this.currentRating = currentRating;
        this.setupAuthListener();
    }

    /**
     * Setup authentication state listener
     */
    setupAuthListener() {
        // Use centralized auth utils for consistency
        if (window.UnifiedAuthUtils) {
            window.UnifiedAuthUtils.addAuthListener((isAuthenticated) => {
                this.onAuthStateChanged(isAuthenticated);
            });
        } else if (window.AdminAuthUtils) {
            // Use AdminAuthUtils for authentication checks
            // Note: AdminAuthUtils doesn't have addAuthListener, so we'll use polling
            setInterval(() => {
                const isAuthenticated = window.AdminAuthUtils.hasValidToken();
                this.onAuthStateChanged(isAuthenticated);
            }, 30000); // Check every 30 seconds
        }
    }

    /**
     * Handle authentication state changes
     * @param {boolean} isAuthenticated - Whether user is authenticated
     */
    onAuthStateChanged(isAuthenticated) {
        // Find all rating button containers for this image
        const containers = document.querySelectorAll(`.rating-buttons[data-image-id="${this.imageId}"]`);

        containers.forEach(container => {
            if (isAuthenticated) {
                // User logged in - show buttons
                this.showRatingButtons(container);
            } else {
                // User logged out - hide buttons
                this.hideRatingButtons(container);
            }
        });
    }

    /**
     * Show rating buttons in container
     * @param {HTMLElement} container - Rating buttons container
     */
    showRatingButtons(container) {
        // Clear existing content
        container.innerHTML = '';

        // Create and add buttons
        const minusBtn = this.createButton('-', 1, 'minus');
        minusBtn.title = 'Rate as 1 star (poor)';
        minusBtn.setAttribute('aria-label', 'Rate as 1 star');

        const plusBtn = this.createButton('+', 5, 'plus');
        plusBtn.title = 'Rate as 5 stars (excellent)';
        plusBtn.setAttribute('aria-label', 'Rate as 5 stars');

        container.appendChild(minusBtn);
        container.appendChild(plusBtn);
    }

    /**
     * Hide rating buttons in container
     * @param {HTMLElement} container - Rating buttons container
     */
    hideRatingButtons(container) {
        container.innerHTML = '';
    }

    /**
     * Create rating buttons container with plus and minus buttons
     * @returns {HTMLElement} Rating buttons container
     */
    createRatingButtons() {
        const container = document.createElement('div');
        container.className = 'rating-buttons';
        container.setAttribute('data-image-id', this.imageId);

        // Check if user is authenticated before showing buttons
        const isAuthenticated = window.UnifiedAuthUtils
            ? window.UnifiedAuthUtils.isAuthenticated()
            : (window.AdminAuthUtils && window.AdminAuthUtils.hasValidToken());

        if (!isAuthenticated) {
            // Return empty container for non-authenticated users
            return container;
        }

        // Create minus button (rating 1)
        const minusBtn = this.createButton('-', 1, 'minus');
        minusBtn.title = 'Rate as 1 star (poor)';
        minusBtn.setAttribute('aria-label', 'Rate as 1 star');

        // Create plus button (rating 5)
        const plusBtn = this.createButton('+', 5, 'plus');
        plusBtn.title = 'Rate as 5 stars (excellent)';
        plusBtn.setAttribute('aria-label', 'Rate as 5 stars');

        container.appendChild(minusBtn);
        container.appendChild(plusBtn);

        return container;
    }

    /**
     * Create individual rating button
     * @param {string} symbol - Button symbol (+ or -)
     * @param {number} rating - Rating value (1 or 5)
     * @param {string} type - Button type (plus or minus)
     * @returns {HTMLElement} Button element
     */
    createButton(symbol, rating, type) {
        const button = document.createElement('button');
        button.className = `rating-btn rating-btn-${type}`;
        button.textContent = symbol;
        button.setAttribute('data-rating', rating);
        button.setAttribute('data-image-id', this.imageId);

        // Add click event listener
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.handleRatingClick(rating);
        });

        return button;
    }

    /**
     * Handle rating button click
     * @param {number} rating - Rating value to submit
     */
    async handleRatingClick(rating) {
        try {
            console.log(`⭐ RATING-BUTTONS: Submitting rating ${rating} for image ${this.imageId}`);

            // Check if we're in fullscreen mode and can use the existing tagImage method
            const fullscreenContainer = document.querySelector('.full-screen');
            const isFullScreen = fullscreenContainer &&
                               fullscreenContainer.style &&
                               fullscreenContainer.style.display === 'flex';

            if (isFullScreen && window.ratingManager && window.ratingManager.tagImage) {
                // Use existing rating manager for fullscreen mode
                await window.ratingManager.tagImage(rating);
            } else {
                // Use direct API call for list view or when rating manager is not available
                await this.submitRatingDirectly(rating);
            }

            // Update button states
            this.updateButtonStates(rating);

        } catch (error) {
            console.error('Error submitting rating:', error);
        }
    }

    /**
     * Submit rating directly via API (fallback method)
     * @param {number} rating - Rating value
     */
    async submitRatingDirectly(rating) {
        // Use the same API endpoint as the rating manager
        const baseUrl = window.RATING_CONFIG?.api?.rating || '/api/images';

        // Get authentication headers from API service
        let headers = {
            'Content-Type': 'application/json'
        };

        if (window.apiService && window.apiService.getAuthHeaders) {
            headers = window.apiService.getAuthHeaders();
        } else if (window.userApi && window.userApi.getAuthHeaders) {
            headers = window.userApi.getAuthHeaders();
        }

        const response = await fetch(`${baseUrl}/${this.imageId}/rating`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ rating })
        });

        if (!response.ok) {
            throw new Error(`Rating submission failed: ${response.status} ${response.statusText}`);
        }

        // Update the image dataset
        const img = document.querySelector(`img[data-id="${this.imageId}"]`);
        if (img) {
            img.dataset.rating = rating.toString();
        }

        // Update the image manager cache if available
        if (window.imageManager && window.imageManager.updateImageRating) {
            window.imageManager.updateImageRating(this.imageId, rating);
        }

        // Update the rating display in both list view and fullscreen
        this.updateRatingDisplay(rating);

        // Refresh the rating dropdown to include the new rating
        if (window.ratingManager && window.ratingManager.refreshRatingDropdown) {
            window.ratingManager.refreshRatingDropdown();
        }

        // Show success feedback
        this.showRatingFeedback(rating);
    }

    /**
     * Update button states based on current rating
     * @param {number} newRating - New rating value
     */
    updateButtonStates(newRating) {
        const container = document.querySelector(`.rating-buttons[data-image-id="${this.imageId}"]`);
        if (!container) {
            return;
        }

        const minusBtn = container.querySelector('.rating-btn-minus');
        const plusBtn = container.querySelector('.rating-btn-plus');

        // Reset all button states
        minusBtn?.classList.remove('active');
        plusBtn?.classList.remove('active');

        // Set active state based on rating
        if (newRating === 1) {
            minusBtn?.classList.add('active');
        } else if (newRating === 5) {
            plusBtn?.classList.add('active');
        }
    }

    /**
     * Show rating feedback
     * @param {number} rating - Rating value
     */
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
            z-index: 10001;
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

    /**
     * Update rating buttons with new rating value
     * @param {number} rating - New rating value
     */
    updateRating(rating) {
        this.currentRating = rating;
        this.updateButtonStates(rating);
    }

    /**
     * Get current fullscreen image ID from navigation system
     * @returns {string|null} Current fullscreen image ID
     */
    getCurrentFullscreenImageId() {
        if (window.imageNavigation && window.imageNavigation.currentImageElement) {
            return window.imageNavigation.currentImageElement.dataset.id ||
                   window.imageNavigation.currentImageElement.dataset.imageId;
        }
        return null;
    }

    /**
     * Set current fullscreen image ID in navigation system
     * @param {string} imageId - Image ID to set
     */
    setCurrentFullscreenImageId(imageId) {
        if (window.imageNavigation && window.imageNavigation.currentImageElement) {
            window.imageNavigation.currentImageElement.dataset.id = imageId;
        }
    }

    /**
     * Update rating display in both list view and fullscreen
     * @param {number} rating - New rating value
     */
    updateRatingDisplay(rating) {
        // Update list view header rating display
        const listRatingElements = document.querySelectorAll(`.list-rating`);
        listRatingElements.forEach(element => {
            element.innerHTML = rating > 0 ? `★ ${rating}` : '★ 0';
        });

        // Update list view metadata rating display (the one with rating buttons)
        const metadataRatingElements = document.querySelectorAll('.metadata-value');
        metadataRatingElements.forEach(element => {
            if (element.textContent.includes('★')) {
                const ratingButtons = element.querySelector(`.rating-buttons[data-image-id="${this.imageId}"]`);
                if (ratingButtons) {
                    // Update the rating text
                    element.textContent = `★ ${rating || 0}`;
                    // Re-add the rating buttons
                    const buttonsContainer = ratingButtons.cloneNode(true);
                    element.appendChild(buttonsContainer);
                }
            }
        });

        // Update fullscreen info box rating display
        const infoBoxRatingElements = document.querySelectorAll('.rating-item .info-box-meta-value');
        infoBoxRatingElements.forEach(element => {
            const ratingButtons = element.querySelector(`.rating-buttons[data-image-id="${this.imageId}"]`);
            if (ratingButtons) {
                // Update the rating text (format like the unified info box does)
                const stars = '★'.repeat(rating);
                const emptyStars = '☆'.repeat(5 - rating);
                const ratingText = rating > 0 ? `${stars}${emptyStars} (${rating}/5)` : 'Not rated';

                // Clear and rebuild the content
                element.innerHTML = ratingText;
                const buttonsContainer = ratingButtons.cloneNode(true);
                element.appendChild(buttonsContainer);
            }
        });
    }
}

// Export for global access
window.RatingButtons = RatingButtons;
