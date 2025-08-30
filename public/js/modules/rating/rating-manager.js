// rating Manager - Consolidated from setupRatingFilter.js and setupKeyboardListeners.js
class RatingManager {
    constructor() {
        this.config = RATING_CONFIG;
        this.isInitialized = false;
    }

    init() {
        console.log('🔧 RatingManager init() called');

        if (this.isInitialized) {
            console.log('⚠️ RatingManager already initialized, skipping');

            return;
        }

        console.log('🔧 Setting up keyboard listeners...');
        this.setupKeyboardListeners();

        console.log('🔧 Setting up rating filter...');
        this.setupRatingFilter();

        this.isInitialized = true;
        console.log('✅ RatingManager initialization complete');
    }

    setupKeyboardListeners() {
        document.addEventListener('keydown', async e => {
            // Check if we're in fullscreen mode
            const fullscreenContainer = document.querySelector('.full-screen');
            const isFullScreen = fullscreenContainer && fullscreenContainer.style.display === 'flex';

            if (isFullScreen) {
                // Handle number keys 1-5 for rating
                if (e.key >= '1' && e.key <= '5') {
                    const rating = parseInt(e.key);

                    e.preventDefault(); // Prevent default behavior
                    await this.tagImage(rating);
                }
            }
        });
    }

    setupRatingFilter() {
        // Add a small delay to ensure DOM is ready
        setTimeout(() => {
            const dropdownContainer = document.getElementById('rating-dropdown');

            if (!dropdownContainer) {
                console.error('Rating dropdown container not found');

                return;
            }

            this.createRatingDropdown(dropdownContainer);
        }, 100);
    }

    createRatingDropdown(container) {

        // Create rating options for the dropdown
        const ratingOptions = [
            { id: 'all', label: 'All Ratings', rating: null },
            { id: 'unrated', label: 'Unrated', rating: null },
            { id: '1', label: '1 Star', rating: 1 },
            { id: '2', label: '2 Stars', rating: 2 },
            { id: '3', label: '3 Stars', rating: 3 },
            { id: '4', label: '4 Stars', rating: 4 },
            { id: '5', label: '5 Stars', rating: 5 }
        ];

        // Initialize the multiselect dropdown
        this.ratingDropdown = new window.MultiSelectDropdown('rating-dropdown', {
            placeholder: 'Filter by rating...',
            allowMultiple: true, // Multiple selection for rating filter
            showSelectedCount: true,
            onSelectionChange: selectedItems => {
                this.filterByMultipleRatings(selectedItems);
            }
        });

        // Set the items
        this.ratingDropdown.setItems(ratingOptions);

        // Set default selection to "All"
        this.ratingDropdown.setSelectedItems(['all']);

        // Trigger initial filter
        this.filterByMultipleRatings(['all']);
    }

    async tagImage(rating) {
        try {
            const fullscreenContainer = document.querySelector('.full-screen');

            if (!fullscreenContainer || fullscreenContainer.style.display !== 'flex') {
                console.log('Not in fullscreen mode');

                return;
            }

            const img = fullscreenContainer.querySelector('img');

            if (!img) {
                console.log('No image found in fullscreen');

                return;
            }

            // Get image ID from dataset or src
            let { id } = img.dataset;

            // If no dataset id, try to extract from src or use a fallback
            if (!id) {
                // Try to get ID from the image component's current fullscreen image
                if (window.imageComponent && window.imageComponent.currentFullscreenImage) {
                    id = window.imageComponent.currentFullscreenImage.id;
                }

                if (!id) {
                    console.warn('No image ID found for rating');

                    return;
                }
            }

            console.log('Rating image with ID:', id, 'Rating:', rating);

            const response = await fetch(`${this.config.api.rating}/${id}/rating`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ rating })
            });

            if (response.ok) {
                // Update image dataset
                img.dataset.rating = rating.toString();

                // Update rating display in fullscreen info box
                const infoBox = fullscreenContainer.querySelector('.info-box');

                if (infoBox) {
                    // Remove existing rating display
                    const existingRating = infoBox.querySelector('.rating-display');

                    if (existingRating) {
                        existingRating.remove();
                    }

                    // Add new rating display
                    const ratingElement = document.createElement('p');

                    ratingElement.className = 'rating-display';
                    ratingElement.textContent = `★ ${rating}`;
                    ratingElement.style.marginBottom = '15px';
                    ratingElement.style.lineHeight = '1.4';
                    ratingElement.style.color = '#ffd700';
                    ratingElement.style.fontSize = '16px';
                    ratingElement.style.fontWeight = '600';

                    infoBox.appendChild(ratingElement);
                }

                // Update the image component cache
                if (window.imageComponent) {
                    window.imageComponent.updateImageRating(id, rating);
                }

                // Update the grid view rating display
                this.updateGridRatingDisplay(id, rating);

                // Show success feedback
                this.showRatingFeedback(rating);

                console.log('Rating updated successfully');
            } else {
                console.error('Failed to update rating:', response.status, response.statusText);
            }
        } catch (error) {
            console.error('Error updating rating:', error);
        }
    }

    filterByRatings(rating) {
        const items = document.querySelectorAll('ul.prompt-output > li');

        items.forEach(item => {
            const image = item.querySelector('img');

            if (rating === 'all') {
                item.style.display = 'block';
            } else if (image && image.dataset.rating === rating.toString()) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }

    filterByMultipleRatings(selectedRatings) {
        // Try multiple selectors to find the image items
        let items = document.querySelectorAll('ul.prompt-output > li');

        if (items.length === 0) {
            items = document.querySelectorAll('.prompt-output > li');
        }
        if (items.length === 0) {
            items = document.querySelectorAll('.image-wrapper');
        }
        if (items.length === 0) {
            items = document.querySelectorAll('[data-id]');
        }

        items.forEach(item => {
            const image = item.querySelector('img');
            let shouldShow = false;

            // If no ratings selected or "all" is selected, show everything
            if (selectedRatings.length === 0 || selectedRatings.includes('all')) {
                shouldShow = true;
            } else {
                // Get image rating or treat as unrated
                const imageRating = image?.dataset?.rating;
                const isUnrated = !imageRating || imageRating === '0' || imageRating === '';

                if (isUnrated) {
                    shouldShow = selectedRatings.includes('unrated');
                } else {
                    shouldShow = selectedRatings.includes(imageRating);
                }
            }

            if (shouldShow) {
                item.style.display = '';
                item.style.visibility = 'visible';
                item.classList.remove('rating-filtered');
            } else {
                item.style.display = 'none';
                item.style.visibility = 'hidden';
                item.classList.add('rating-filtered');
            }
        });
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

    updateGridRatingDisplay(imageId, rating) {
        // Find the image in the grid and update its rating display
        const gridImages = document.querySelectorAll('ul.prompt-output img[data-id]');

        gridImages.forEach(img => {
            if (img.dataset.id === imageId) {
                // Update the dataset
                img.dataset.rating = rating.toString();

                // Find or create rating display in the wrapper
                const wrapper = img.closest('.image-wrapper');

                if (wrapper) {
                    // Remove existing rating display
                    const existingRating = wrapper.querySelector('.rating');

                    if (existingRating) {
                        existingRating.remove();
                    }

                    // Add new rating display if rating > 0
                    if (rating > 0) {
                        const ratingElement = document.createElement('div');

                        ratingElement.className = 'rating';
                        ratingElement.textContent = `★ ${rating}`;
                        ratingElement.style.position = 'absolute';
                        ratingElement.style.top = '5px';
                        ratingElement.style.right = '5px';
                        ratingElement.style.background = 'rgba(0, 0, 0, 0.7)';
                        ratingElement.style.color = '#ffd700';
                        ratingElement.style.padding = '2px 6px';
                        ratingElement.style.borderRadius = '3px';
                        ratingElement.style.fontSize = '12px';
                        ratingElement.style.fontWeight = 'bold';

                        wrapper.appendChild(ratingElement);
                    }
                }
            }
        });
    }

    // utility methods for external access
    getCurrentFilter() {
        if (this.ratingDropdown) {
            const selectedItems = this.ratingDropdown.getSelectedItems();

            return selectedItems.length > 0 ? selectedItems : ['all'];
        }

        return ['all'];
    }

    setFilter(ratings) {
        if (this.ratingDropdown) {
            const ratingArray = Array.isArray(ratings) ? ratings : [ratings];

            this.ratingDropdown.setSelectedItems(ratingArray);
        }
        this.filterByMultipleRatings(Array.isArray(ratings) ? ratings : [ratings]);
    }

    clearFilter() {
        this.filterByMultipleRatings(['all']);
    }

    validateRating(rating) {
        const numRating = parseInt(rating);

        return !isNaN(numRating) && numRating >= 1 && numRating <= 5;
    }

    getRatingCount(rating) {
        const items = document.querySelectorAll('ul.prompt-output > li');

        return Array.from(items).filter(item => {
            const image = item.querySelector('img');

            return image && image.dataset.rating === rating.toString();
        }).length;
    }

    getAverageRating() {
        const items = document.querySelectorAll('ul.prompt-output > li');
        let totalRating = 0;
        let ratedCount = 0;

        items.forEach(item => {
            const image = item.querySelector('img');

            if (image && image.dataset.rating) {
                totalRating += parseInt(image.dataset.rating);
                ratedCount++;
            }
        });

        return ratedCount > 0 ? (totalRating / ratedCount).toFixed(1) : 0;
    }

    // legacy method names for backward compatibility
    setupRatingFilterLegacy() {
        return this.init();
    }

    setupKeyboardListenersLegacy() {
        return this.init();
    }
}

// global exports for backward compatibility
window.RatingManager = RatingManager;
window.ratingManager = new RatingManager();
window.setupRating = () => ratingManager.init();

