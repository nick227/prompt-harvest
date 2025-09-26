/**
 * Public Status Service
 * Centralized service for handling image public status updates
 * Provides consistent API calls, error handling, and cache management
 */
class PublicStatusService {
    constructor() {
        this.updateQueue = new Map(); // Prevent duplicate updates
        this.cache = new Map(); // Local cache for quick lookups
    }

    /**
     * Update image public status
     * @param {string} imageId - Image ID
     * @param {boolean} isPublic - New public status
     * @param {Object} options - Additional options
     * @returns {Promise<boolean>} Success status
     */
    async updatePublicStatus(imageId, isPublic, options = {}) {
        const {
            updateDOM = true,
            showNotifications = true,
            updateCache = true
        } = options;

        // Input validation
        if (!imageId || typeof isPublic !== 'boolean') {
            console.error('❌ PUBLIC-STATUS: Invalid parameters', { imageId, isPublic });
            return false;
        }

        // Prevent duplicate updates
        const updateKey = `${imageId}-${isPublic}`;
        if (this.updateQueue.has(updateKey)) {
            console.log(`🔄 PUBLIC-STATUS: Update already in progress for ${imageId}`);
            return this.updateQueue.get(updateKey);
        }

        // Create update promise
        const updatePromise = this._performUpdate(imageId, isPublic, {
            updateDOM,
            showNotifications,
            updateCache
        });

        // Store in queue
        this.updateQueue.set(updateKey, updatePromise);

        try {
            return await updatePromise;
        } finally {
            // Clean up queue
            this.updateQueue.delete(updateKey);
        }
    }

    /**
     * Perform the actual update
     * @private
     */
    async _performUpdate(imageId, isPublic, options) {
        const { updateDOM, showNotifications, updateCache } = options;

        try {
            // Update DOM immediately for better UX
            if (updateDOM) {
                this._updateDOMCheckboxes(imageId, isPublic);
            }

            // Show loading state
            this._setLoadingState(imageId, true);

            // Make API call
            const response = await fetch(`/api/images/${imageId}/public-status`, {
                method: 'PUT',
                headers: this._getAuthHeaders(),
                body: JSON.stringify({ isPublic })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            // Update cache
            if (updateCache) {
                this._updateCache(imageId, isPublic);
            }

            // Show success notification
            if (showNotifications) {
                this._showSuccessNotification(isPublic);
            }

            console.log(`✅ PUBLIC-STATUS: Successfully updated image ${imageId} to ${isPublic ? 'public' : 'private'}`);
            return true;

        } catch (error) {
            console.error(`❌ PUBLIC-STATUS: Failed to update image ${imageId}:`, error);

            // Revert DOM changes
            if (updateDOM) {
                this._revertDOMCheckboxes(imageId);
            }

            // Show error notification
            if (showNotifications) {
                this._showErrorNotification(error);
            }

            return false;
        } finally {
            // Clear loading state
            this._setLoadingState(imageId, false);
        }
    }

    /**
     * Update all DOM checkboxes for an image
     * @private
     */
    _updateDOMCheckboxes(imageId, isPublic) {
        // CRITICAL: Update the main image wrapper's dataset.isPublic attribute
        // This is what the filtering system relies on for proper visibility
        const imageWrapper = document.querySelector(`[data-image-id="${imageId}"]`);
        if (imageWrapper) {
            imageWrapper.dataset.isPublic = isPublic.toString();
            console.log(`🔄 PUBLIC-STATUS: Updated wrapper dataset.isPublic for ${imageId}: ${isPublic}`);
        } else {
            console.warn(`⚠️ PUBLIC-STATUS: Image wrapper not found for ${imageId}`);
        }

        // Batch DOM updates for better performance
        this._batchUpdateCheckboxes(imageId, isPublic);
        this._batchUpdateDisplays(imageId, isPublic);

        // Legacy individual updates (kept for compatibility)
        this._updateIndividualCheckboxes(imageId, isPublic);
        this._updateIndividualDisplays(imageId, isPublic);

        // Notify the tab service to re-evaluate visibility if available
        if (window.feedManager && window.feedManager.tabService) {
            window.feedManager.tabService.updateImage(imageId, { isPublic });
        }

        // Update fullscreen image if it's currently displayed
        this._updateFullscreenImageIfCurrent(imageId, isPublic);

        // Update view manager if available
        this._updateViewManager(imageId, isPublic);
    }

    /**
     * Revert DOM checkboxes to previous state
     * @private
     */
    _revertDOMCheckboxes(imageId) {
        const cachedState = this.cache.get(imageId);
        if (cachedState !== undefined) {
            this._updateDOMCheckboxes(imageId, cachedState);
        }
    }

    /**
     * Set loading state for checkboxes
     * @private
     */
    _setLoadingState(imageId, isLoading) {
        const selectors = [
            `#public-toggle-${imageId}`,
            `#public-toggle-list-${imageId}`,
            `#public-toggle-compact-${imageId}`
        ];

        selectors.forEach(selector => {
            const checkbox = document.querySelector(selector);
            if (checkbox) {
                checkbox.disabled = isLoading;

                // Update label text
                const label = document.querySelector(`label[for="${checkbox.id}"]`);
                if (label) {
                    label.textContent = isLoading ? 'Updating...' : 'Public';
                }

                // Update container opacity
                const container = checkbox.closest('.public-checkbox-container, .list-public-checkbox-container, .info-box-public-toggle');
                if (container) {
                    container.style.opacity = isLoading ? '0.6' : '1';
                }
            }
        });
    }

    /**
     * Update cache
     * @private
     */
    _updateCache(imageId, isPublic) {
        this.cache.set(imageId, isPublic);

        // Update image manager cache if available
        if (window.imageManager && window.imageManager.data) {
            window.imageManager.data.updateCachedImage(imageId, { isPublic });
        }

        // Update feed cache if available
        if (window.feedManager && window.feedManager.cacheManager) {
            // Trigger cache refresh for affected filters
            window.feedManager.cacheManager.invalidateCache();
        }

        // Update the DOM wrapper's dataset to ensure consistency
        const imageWrapper = document.querySelector(`[data-image-id="${imageId}"]`);
        if (imageWrapper) {
            imageWrapper.dataset.isPublic = isPublic.toString();
        }
    }

    /**
     * Get authentication headers
     * @private
     */
    _getAuthHeaders() {
        if (window.UnifiedAuthUtils) {
            return window.UnifiedAuthUtils.getAuthHeaders();
        }

        const headers = { 'Content-Type': 'application/json' };
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return headers;
    }

    /**
     * Show success notification
     * @private
     */
    _showSuccessNotification(isPublic) {
        if (window.notificationManager) {
            const message = isPublic
                ? 'Image is now public and visible to everyone'
                : 'Image is now private and only visible to you';
            window.notificationManager.success(message);
        }
    }

    /**
     * Show error notification
     * @private
     */
    _showErrorNotification(error) {
        if (window.notificationManager) {
            let message = 'Failed to update image visibility';

            if (error.message) {
                if (error.message.includes('own images')) {
                    message = 'You can only change visibility of your own images';
                } else if (error.message.includes('Authentication')) {
                    message = 'Please log in to update image visibility';
                } else if (error.message.includes('rate limit')) {
                    message = 'Too many requests. Please wait a moment and try again';
                }
            }

            window.notificationManager.error(message);
        }
    }

    /**
     * Initialize cache with current image states
     * @param {Array} images - Array of image objects
     */
    initializeCache(images) {
        images.forEach(image => {
            if (image.id && typeof image.isPublic === 'boolean') {
                this.cache.set(image.id, image.isPublic);

                // Also ensure DOM wrapper has correct dataset attribute
                const imageWrapper = document.querySelector(`[data-image-id="${image.id}"]`);
                if (imageWrapper) {
                    imageWrapper.dataset.isPublic = image.isPublic.toString();
                }
            }
        });
    }

    /**
     * Get cached public status
     * @param {string} imageId - Image ID
     * @returns {boolean|undefined} Cached status or undefined
     */
    getCachedStatus(imageId) {
        return this.cache.get(imageId);
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Update fullscreen image if it's currently displayed
     * @private
     */
    _updateFullscreenImageIfCurrent(imageId, isPublic) {
        if (window.imageManager && window.imageManager.currentFullscreenImage &&
            window.imageManager.currentFullscreenImage.id === imageId) {
            window.imageManager.currentFullscreenImage.isPublic = isPublic;

            // Update the public status checkbox in fullscreen
            const publicToggle = window.imageManager.fullscreenContainer?.querySelector('.info-box-public-toggle');
            if (publicToggle) {
                const checkbox = publicToggle.querySelector('.public-status-checkbox');
                if (checkbox) {
                    checkbox.checked = isPublic;
                }

                // Update label text
                const label = publicToggle.querySelector('.public-status-label');
                if (label) {
                    const currentStatus = isPublic ? 'Public' : 'Private';
                    label.textContent = currentStatus;
                }
            }
        }
    }

    /**
     * Update view manager if available
     * @private
     */
    _updateViewManager(imageId, isPublic) {
        if (window.feedManager && window.feedManager.viewManager) {
            window.feedManager.viewManager.updateImageInView(imageId, { isPublic });
        }
    }

    /**
     * Batch update checkboxes for better performance
     * @private
     */
    _batchUpdateCheckboxes(imageId, isPublic) {
        const selectors = [
            `#public-toggle-${imageId}`,
            `#public-toggle-list-${imageId}`,
            `#public-toggle-compact-${imageId}`
        ];

        // Use document fragment for batch updates
        const fragment = document.createDocumentFragment();
        const elements = selectors.map(selector => document.querySelector(selector)).filter(Boolean);

        elements.forEach(checkbox => {
            checkbox.checked = isPublic;
        });
    }

    /**
     * Batch update displays for better performance
     * @private
     */
    _batchUpdateDisplays(imageId, isPublic) {
        const displaySelectors = [
            `.list-public-display[data-image-id="${imageId}"]`,
            `.compact-public-display[data-image-id="${imageId}"]`,
            `.info-box-public-display[data-image-id="${imageId}"]`
        ];

        const elements = displaySelectors.map(selector => document.querySelector(selector)).filter(Boolean);
        const text = isPublic ? 'Public' : 'Private';

        elements.forEach(display => {
            display.textContent = text;
        });
    }

    /**
     * Individual checkbox updates (legacy method)
     * @private
     */
    _updateIndividualCheckboxes(imageId, isPublic) {
        const selectors = [
            `#public-toggle-${imageId}`,
            `#public-toggle-list-${imageId}`,
            `#public-toggle-compact-${imageId}`
        ];

        selectors.forEach(selector => {
            const checkbox = document.querySelector(selector);
            if (checkbox) {
                checkbox.checked = isPublic;
            }
        });
    }

    /**
     * Individual display updates (legacy method)
     * @private
     */
    _updateIndividualDisplays(imageId, isPublic) {
        const displaySelectors = [
            `.list-public-display[data-image-id="${imageId}"]`,
            `.compact-public-display[data-image-id="${imageId}"]`,
            `.info-box-public-display[data-image-id="${imageId}"]`
        ];

        displaySelectors.forEach(selector => {
            const display = document.querySelector(selector);
            if (display) {
                display.textContent = isPublic ? 'Public' : 'Private';
            }
        });
    }
}

// Create global instance
window.PublicStatusService = new PublicStatusService();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PublicStatusService;
}
