// Basic Image Elements Creation
import { UIConfig } from './ui-config.js';
import { ImagePlaceholderHandler } from './image-placeholder.js';

export class ImageElements {
    constructor(uiConfig = null) {
        this.uiConfig = uiConfig || new UIConfig();
        this.placeholderHandler = new ImagePlaceholderHandler(this.uiConfig);
    }

    /**
     * Check if currently viewing the site filter
     * @returns {boolean} True if in site view
     */
    isCurrentlyInSiteView() {
        if (window.feedManager && window.feedManager.getCurrentFilter) {
            return window.feedManager.getCurrentFilter() === 'site';
        }

        // Fallback: check DOM for active site button
        const siteButton = document.querySelector('input[name="owner"][value="site"]');
        return siteButton && siteButton.checked;
    }

    /**
     * Remove image from feed if available
     * @param {string} imageId - Image ID to remove
     */
    removeImageFromFeedIfAvailable(imageId) {
        if (window.feedManager && window.feedManager.removeImageFromFeed) {
            const removed = window.feedManager.removeImageFromFeed(imageId);
            if (removed) {
                console.log(`🗑️ Removed image ${imageId} from feed (made private)`);
            }
        }
    }

    createImageElement(imageData) {
        if (!imageData || !imageData.id) {
            throw new Error('ImageData with id is required');
        }

        console.log('🔍 IMAGE-ELEMENTS: Creating image element with data:', {
            id: imageData.id,
            username: imageData.username,
            userId: imageData.userId,
            createdAt: imageData.createdAt,
            tags: imageData.tags
        });

        const img = this.uiConfig.createElement('img', this.uiConfig.getClasses().image);

        // Set src normally - the container will be hidden during loading
        // Handle base64 data URLs properly
        if (imageData.url && (imageData.url.startsWith('iVBORw0KGgo') || imageData.url.startsWith('/9j/'))) {
            // It's base64 image data, format as data URL
            img.src = `data:image/jpeg;base64,${imageData.url}`;
        } else if (imageData.url) {
            img.src = imageData.url;
        } else if (imageData.imageUrl) {
            // Fallback to imageUrl property
            img.src = imageData.imageUrl;
        } else {
            console.warn('No image URL provided for image:', imageData.id);
        }
        img.alt = imageData.title || 'Generated Image';
        img.dataset.id = imageData.id;
        img.dataset.rating = imageData.rating || '0';
        img.dataset.provider = imageData.provider || 'unknown';
        img.dataset.prompt = imageData.prompt || '';
        img.dataset.original = imageData.original || '';
        img.dataset.guidance = imageData.guidance || '';
        img.dataset.isPublic = (imageData.isPublic || false).toString();
        img.dataset.userId = imageData.userId || '';
        img.dataset.username = imageData.username || '';
        img.dataset.createdAt = imageData.createdAt || '';
        img.dataset.tags = imageData.tags ? JSON.stringify(imageData.tags) : '';

        // Setting dataset values on image element

        // UI styling
        img.style.width = '100%';
        img.style.height = '150px';
        img.style.objectFit = 'cover';
        img.style.display = 'block';
        img.style.borderRadius = '3px';
        img.style.cursor = 'pointer';

        // Add placeholder detection pipeline
        this.placeholderHandler.addImageErrorHandling(img, imageData);

        return img;
    }

    createImageWrapper(imageData) {
        if (!imageData || !imageData.id) {
            throw new Error('ImageData with id is required');
        }

        const wrapper = this.uiConfig.createElement('div', this.uiConfig.getClasses().imageWrapper);

        // Create image element
        const img = this.createImageElement(imageData);

        // Create rating display
        const rating = this.createRatingDisplay(imageData.rating || 0);

        // Create public status checkbox
        const publicCheckbox = this.createPublicStatusCheckbox(imageData);

        // Assemble wrapper
        wrapper.appendChild(img);
        wrapper.appendChild(rating);
        wrapper.appendChild(publicCheckbox);

        // Store image data in wrapper for easy access
        wrapper.dataset.imageId = imageData.id;
        wrapper.dataset.imageData = JSON.stringify(imageData);

        return wrapper;
    }

    createRatingDisplay(rating) {
        const ratingDisplay = this.uiConfig.createElement('div', this.uiConfig.getClasses().rating);

        ratingDisplay.innerHTML = rating === 0 ? '★' : `★ ${rating}`;
        ratingDisplay.style.cssText = `
            position: absolute;
            top: 8px;
            right: 8px;
            background: rgba(0, 0, 0, 0.7);
            color: #ffd700;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
            z-index: 10;
            pointer-events: none;
        `;

        return ratingDisplay;
    }

    createPublicStatusCheckbox(imageData) {
        // Creating public status checkbox
        const checkboxContainer = this.uiConfig.createElement('div', 'public-checkbox-container');

        checkboxContainer.style.cssText = `
            position: absolute;
            top: 8px;
            left: 8px;
            background: rgba(0, 0, 0, 0.7);
            padding: 4px 8px;
            border-radius: 12px;
            z-index: 10;
            pointer-events: auto;
        `;

        // Check if user should be able to see this toggle
        const shouldShow = this.shouldShowPublicToggle(imageData);
        // Checking if public toggle should be shown
        if (!shouldShow) {
            // Return a read-only display instead of a toggle
            const display = this.uiConfig.createElement('div', 'public-display');
            display.textContent = imageData.isPublic ? 'Public' : 'Private';
            // Creating read-only display
            display.style.cssText = `
                color: white;
                font-size: 12px;
                font-weight: bold;
            `;
            checkboxContainer.appendChild(display);
            return checkboxContainer;
        }

        const checkbox = this.uiConfig.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'public-status-checkbox';
        checkbox.id = `public-toggle-list-${imageData.id}`;
        checkbox.checked = imageData.isPublic || false;
        // Setting list view checkbox state
        checkbox.setAttribute('data-image-id', imageData.id);
        checkbox.setAttribute('aria-label', 'Toggle public visibility');

        const label = this.uiConfig.createElement('label');
        label.className = 'public-status-label';
        label.htmlFor = `public-toggle-list-${imageData.id}`;
        label.textContent = 'Public';
        label.style.cssText = `
            color: white;
            font-size: 12px;
            font-weight: bold;
            margin-left: 4px;
            cursor: pointer;
        `;

        checkboxContainer.appendChild(checkbox);
        checkboxContainer.appendChild(label);

        // Add event listener for checkbox changes
        checkbox.addEventListener('change', async () => {
            const imageId = checkbox.getAttribute('data-image-id');
            const newStatus = checkbox.checked;

            // Update DOM immediately
            this.updateImageInDOM(imageId, { isPublic: newStatus });

            // Show loading state
            checkbox.disabled = true;
            label.textContent = 'Updating...';
            checkboxContainer.style.opacity = '0.6';

            try {
                // Call API to update server
                // Get authentication headers
                const headers = { 'Content-Type': 'application/json' };
                if (window.userApi && window.userApi.isAuthenticated()) {
                    const token = window.userApi.getAuthToken();
                    if (token) {
                        headers['Authorization'] = `Bearer ${token}`;
                    }
                }

                const response = await fetch(`/api/images/${imageId}/public-status`, {
                    method: 'PUT',
                    headers,
                    body: JSON.stringify({ isPublic: newStatus })
                });

                if (response.ok) {
                    console.log('✅ Public status updated from list view');

                    // Update cache if image manager is available
                    if (window.imageManager && window.imageManager.data) {
                        window.imageManager.data.updateCachedImage(imageId, { isPublic: newStatus });
                    }

                    // Update fullscreen checkbox if it's currently open for this image
                    this.updateFullscreenCheckboxIfCurrent(imageId, newStatus);

                    // Remove image from feed if it became private and we're in site view
                    // In mine view, keep the image visible so user can manage their private images
                    if (!newStatus && this.isCurrentlyInSiteView()) {
                        this.removeImageFromFeedIfAvailable(imageId);
                    }
                } else {
                    console.error('❌ Failed to update public status from list view');
                    // Revert on failure
                    checkbox.checked = !newStatus;
                    this.updateImageInDOM(imageId, { isPublic: !newStatus });
                }
            } catch (error) {
                console.error('❌ Error updating public status from list view:', error);
                // Revert on error
                checkbox.checked = !newStatus;
                this.updateImageInDOM(imageId, { isPublic: !newStatus });
            } finally {
                // Restore UI
                checkbox.disabled = false;
                label.textContent = 'Public';
                checkboxContainer.style.opacity = '1';
            }
        });

        return checkboxContainer;
    }

    updateImageInDOM(imageId, updates) {
        const imageElement = document.querySelector(`img[data-id="${imageId}"], img[data-image-id="${imageId}"]`);
        if (imageElement) {
            Object.keys(updates).forEach(key => {
                if (updates[key] !== undefined) {
                    imageElement.dataset[key] = updates[key].toString();
                }
            });
        }
    }

    updateFullscreenCheckboxIfCurrent(imageId, isPublic) {
        if (window.imageManager && window.imageManager.currentFullscreenImage &&
            window.imageManager.currentFullscreenImage.id === imageId) {
            // Update the current fullscreen image data
            window.imageManager.currentFullscreenImage.isPublic = isPublic;

            // Refresh the fullscreen UI to reflect the change
            window.imageManager.refreshFullscreenUI();
        }
    }

    /**
     * Check if user should be able to see the public toggle
     * @param {Object} imageData - Image data
     * @returns {boolean} Whether to show the toggle
     */
    shouldShowPublicToggle(imageData) {
        // Use centralized auth utils for consistency
        if (window.UnifiedAuthUtils) {
            return window.UnifiedAuthUtils.shouldShowPublicToggle(imageData);
        }

        // Fallback to local implementation if centralized utils not available
        if (!imageData || !imageData.id) {
            return false;
        }

        // Check if user is authenticated
        const isAuthenticated = window.userApi && window.userApi.isAuthenticated();

        if (!isAuthenticated) {
            return false;
        }

        const currentUserId = this.getCurrentUserId();

        if (!currentUserId) {
            return false;
        }

        // Only show toggle if current user owns the image
        // If userId is not in the image data, assume it's the user's image
        // (since they can see it in their feed)
        if (!imageData.userId) {
            console.log('🔍 Image missing userId, assuming user owns it');
            return true; // Assume user owns it if they can see it
        }

        return imageData.userId === currentUserId;
    }

    /**
     * Get current user ID
     * @returns {string|null} Current user ID
     */
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
}
