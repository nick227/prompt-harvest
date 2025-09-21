// rating Manager - Consolidated from setupRatingFilter.js and setupKeyboardListeners.js
class RatingManager {
    constructor() {
        this.config = RATING_CONFIG;
        this.isInitialized = false;
        this.init();
    }

    init() {

        if (this.isInitialized) {

            return;
        }

        this.setupKeyboardListeners();
        // this.setupRatingFilter(); TODO DISABLED TEMPORARILY

        this.isInitialized = true;

    }

    setupKeyboardListeners() {
        document.addEventListener('keydown', async e => {
            // Check if we're in fullscreen mode
            const fullscreenContainer = document.querySelector('.full-screen');
            const isFullScreen = fullscreenContainer &&
                               fullscreenContainer.style &&
                               fullscreenContainer.style.display === 'flex';

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
        // Try to find the dropdown container immediately
        const dropdownContainer = document.getElementById('rating-dropdown');

        if (dropdownContainer) {
            this.createRatingDropdown(dropdownContainer);
        } else {
            // If not found immediately, try again after a short delay
            setTimeout(() => {
                const retryContainer = document.getElementById('rating-dropdown');

                if (retryContainer) {
                    this.createRatingDropdown(retryContainer);
                } else {
                    console.warn('Rating dropdown container not found, filter functionality disabled');
                }
            }, 100);
        }
    }

    createRatingDropdown(_container) {
        // Get existing ratings from current images
        const existingRatings = this.getExistingRatings();

        // Create rating options for the dropdown - only show ratings that exist
        const ratingOptions = [
            { id: 'all', label: 'All Ratings', rating: null }
        ];

        // Add unrated option if there are unrated images
        if (existingRatings.has(0) || existingRatings.has(null)) {
            ratingOptions.push({ id: 'unrated', label: 'Unrated', rating: 0 });
        }

        // Add star options only for ratings that exist
        for (let i = 1; i <= 5; i++) {
            if (existingRatings.has(i)) {
                const starLabel = i === 1 ? '1 Star' : `${i} Stars`;

                ratingOptions.push({ id: i.toString(), label: starLabel, rating: i });
            }
        }

        console.log('⭐ RATING DROPDOWN: Created with options:', ratingOptions.map(opt => opt.label));

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

    getExistingRatings() {
        const ratings = new Set();
        const imageWrappers = document.querySelectorAll('.image-wrapper');

        imageWrappers.forEach(wrapper => {
            const ratingElement = wrapper.querySelector('.rating');

            if (ratingElement) {
                const rating = parseInt(ratingElement.dataset.rating || ratingElement.textContent);

                if (!isNaN(rating)) {
                    ratings.add(rating);
                } else {
                    ratings.add(0); // Unrated
                }
            } else {
                ratings.add(0); // Unrated
            }
        });

        console.log('⭐ RATING DROPDOWN: Found existing ratings:', Array.from(ratings));

        return ratings;
    }

    refreshRatingDropdown() {
        if (this.ratingDropdown) {
            console.log('⭐ RATING DROPDOWN: Refreshing dropdown with current ratings');
            const existingRatings = this.getExistingRatings();

            // Create new rating options
            const ratingOptions = [
                { id: 'all', label: 'All Ratings', rating: null }
            ];

            // Add unrated option if there are unrated images
            if (existingRatings.has(0) || existingRatings.has(null)) {
                ratingOptions.push({ id: 'unrated', label: 'Unrated', rating: 0 });
            }

            // Add star options only for ratings that exist
            for (let i = 1; i <= 5; i++) {
                if (existingRatings.has(i)) {
                    const starLabel = i === 1 ? '1 Star' : `${i} Stars`;

                    ratingOptions.push({ id: i.toString(), label: starLabel, rating: i });
                }
            }

            // Update the dropdown with new options
            this.ratingDropdown.setItems(ratingOptions);

            // Keep current selection if it still exists, otherwise default to "All"
            const currentSelection = this.ratingDropdown.getSelectedItems();
            const validSelection = currentSelection.filter(item => ratingOptions.some(opt => opt.id === item));

            if (validSelection.length === 0) {
                this.ratingDropdown.setSelectedItems(['all']);
                this.filterByMultipleRatings(['all']);
            }
        }
    }

    async tagImage(rating) {
        try {
            const fullscreenContainer = document.querySelector('.full-screen');

            if (!fullscreenContainer ||
                !fullscreenContainer.style ||
                fullscreenContainer.style.display !== 'flex') {
                return;
            }

            const img = fullscreenContainer.querySelector('img');

            if (!img) {

                return;
            }

            // Get image ID from dataset or src
            let { id } = img.dataset;

            // If no dataset id, try to extract from src or use a fallback
            if (!id) {
                // Try to get ID from the image component's current fullscreen image
                if (window.imageComponent && window.imageComponent.currentFullscreenImage) {
                    const { id: imageId } = window.imageComponent.currentFullscreenImage;

                    id = imageId;
                }

                if (!id) {
                    console.warn('No image ID found for rating');

                    return;
                }
            }

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

                // Update the image component cache
                if (window.imageComponent) {
                    window.imageComponent.updateImageRating(id, rating);
                }

                // Refresh the rating dropdown to include the new rating
                this.refreshRatingDropdown();

                // Show success feedback
                this.showRatingFeedback(rating);

            } else {
                console.error('Error:', response.status, response.statusText);
            }
        } catch (error) {
            console.error('Rating error:', error);
        }
    }

    filterByRatings(rating) {
        const items = document.querySelectorAll('div.prompt-output > li');

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
        let items = document.querySelectorAll('div.prompt-output > li');

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
            // Ensure item has required properties before manipulation
            if (!item || !item.style || !item.classList) {
                console.warn('Invalid item element found during rating filter');

                return;
            }

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
                if (item.classList && typeof item.classList.remove === 'function') {
                    item.classList.remove('rating-filtered');
                }
            } else {
                item.style.display = 'none';
                item.style.visibility = 'hidden';
                if (item.classList && typeof item.classList.add === 'function') {
                    item.classList.add('rating-filtered');
                }
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


    // utility methods for external access
    getCurrentFilter() {
        if (this.ratingDropdown) {
            const selectedItems = this.ratingDropdown.getSelectedItems();

            return selectedItems.length > 0 ? selectedItems[0] : 'all';
        }

        return 'all';
    }

    setFilter(ratings) {
        if (this.ratingDropdown) {
            const ratingArray = Array.isArray(ratings) ? ratings : [ratings];

            this.ratingDropdown.setSelectedItems(ratingArray);
        }
        // For backward compatibility, also call the single rating filter
        const rating = Array.isArray(ratings) ? ratings[0] : ratings;

        this.filterByRatings(rating);
    }

    clearFilter() {
        this.filterByRatings('all');
    }

    validateRating(rating) {
        const numRating = parseInt(rating);

        return !isNaN(numRating) && numRating >= 1 && numRating <= 5;
    }

    getRatingCount(rating) {
        const items = document.querySelectorAll('div.prompt-output > li');

        return Array.from(items).filter(item => {
            const image = item.querySelector('img');

            return image && image.dataset.rating === rating.toString();
        }).length;
    }

    getAverageRating() {
        const items = document.querySelectorAll('div.prompt-output > li');
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

    getRatingStats() {
        const items = document.querySelectorAll('div.prompt-output > li');
        const stats = {
            total: items.length,
            ratings: {}
        };

        items.forEach(item => {
            const image = item.querySelector('img');

            if (image && image.dataset.rating && image.dataset.rating !== '0') {
                const rating = parseInt(image.dataset.rating);

                if (rating >= 1 && rating <= 5) {
                    stats.ratings[rating] = (stats.ratings[rating] || 0) + 1;
                }
            }
        });

        return stats;
    }

}

// Export for global access
window.RatingManager = RatingManager;
window.ratingManager = new RatingManager();

// Export for module testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RatingManager;
}

