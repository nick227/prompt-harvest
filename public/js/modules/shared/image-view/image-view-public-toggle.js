/**
 * Image View Public Toggle Utilities
 * Handles public/private checkbox creation and updates
 */

(function() {
    'use strict';

    /**
     * Create public checkbox for list, compact, or full view
 * @param {Object} imageData - Image data object
 * @param {string} viewType - View type ('list', 'compact', or 'full')
 * @param {Function} onStatusChange - Callback when status changes (receives imageId, newStatus)
 * @returns {HTMLElement} Public checkbox element
 */
    const createPublicCheckbox = (imageData, viewType = 'list', onStatusChange = null) => {
        const checkboxContainer = document.createElement('div');

        checkboxContainer.className = `${viewType}-public-checkbox-container`;
        checkboxContainer.style.cssText = `
        background: rgba(0, 0, 0, 0.7);
        padding: 4px 8px;
        border-radius: 12px;
        z-index: 10;
        pointer-events: auto;
    `;

        // Check if user should be able to see this toggle
        if (!window.ImageViewData?.shouldShowPublicToggle(imageData)) {
        // Return a read-only display instead of a toggle
            const display = document.createElement('div');

            display.className = `${viewType}-public-display`;
            display.textContent = imageData.isPublic ? 'Public' : 'Private';
            display.style.cssText = `
            color: white;
            font-size: 11px;
            font-weight: bold;
        `;
            checkboxContainer.appendChild(display);

            return checkboxContainer;
        }

        const checkbox = document.createElement('input');

        checkbox.type = 'checkbox';
        checkbox.className = 'public-status-checkbox';
        checkbox.id = `public-toggle-${viewType}-${imageData.id}`;
        checkbox.checked = imageData.isPublic || false;
        checkbox.setAttribute('data-image-id', imageData.id);
        checkbox.setAttribute('aria-label', 'Toggle public visibility');

        const label = document.createElement('label');

        label.className = 'public-status-label';
        label.htmlFor = `public-toggle-${viewType}-${imageData.id}`;
        label.textContent = 'Public';
        label.style.cssText = `
        color: white;
        font-size: 11px;
        font-weight: bold;
        margin-left: 4px;
        cursor: pointer;
    `;

        checkboxContainer.appendChild(checkbox);
        checkboxContainer.appendChild(label);

        // Add event listener for checkbox changes
        checkbox.addEventListener('change', async() => {
            const imageId = checkbox.getAttribute('data-image-id');
            const newStatus = checkbox.checked;

            // Use callback if provided
            if (onStatusChange) {
                await onStatusChange(imageId, newStatus);

                return;
            }

            // Use unified public status service
            if (window.PublicStatusService) {
                const success = await window.PublicStatusService.updatePublicStatus(imageId, newStatus, {
                    updateDOM: true,
                    showNotifications: true,
                    updateCache: true
                });

                if (success && !newStatus) {
                // Remove from feed if made private in site view
                    removeImageFromFeedIfPrivate(imageId);
                }
            } else {
            // Show error notification
                if (window.notificationManager) {
                    window.notificationManager.error('Public status service not available');
                }
                // Revert checkbox state
                checkbox.checked = !newStatus;
            }
        });

        return checkboxContainer;
    };

    /**
 * Remove image from feed if currently in site view (helper for status change)
 * @param {string} imageId - Image ID
 */
    const removeImageFromFeedIfPrivate = imageId => {
    // Check if in site view
        const siteButton = document.querySelector('input[name="owner"][value="site"]');
        const isInSiteView = siteButton && siteButton.checked;

        if (isInSiteView && window.feedManager && window.feedManager.removeImageFromFeed) {
            window.feedManager.removeImageFromFeed(imageId);
        }
    };

    /**
 * Create public checkbox for list view (convenience method)
 * @param {Object} imageData - Image data object
 * @returns {HTMLElement} Public checkbox element
 */
    const createListViewPublicCheckbox = imageData => createPublicCheckbox(imageData, 'list');

    /**
 * Create public checkbox for compact view (convenience method)
 * @param {Object} imageData - Image data object
 * @returns {HTMLElement} Public checkbox element
 */
    const createCompactViewPublicCheckbox = imageData => createPublicCheckbox(imageData, 'compact');

    /**
 * Update list view checkbox if it exists
 * @deprecated Use PublicStatusService.updatePublicStatus() instead
 * @param {string} imageId - Image ID
 * @param {boolean} isPublic - New public status
 */
    const updateListViewCheckboxIfExists = (imageId, isPublic) => {
        const listCheckbox = document.querySelector(`#public-toggle-list-${imageId}`);

        if (listCheckbox) {
            listCheckbox.checked = isPublic;
        }
    };

    /**
 * Update compact view checkbox if it exists
 * @deprecated Use PublicStatusService.updatePublicStatus() instead
 * @param {string} imageId - Image ID
 * @param {boolean} isPublic - New public status
 */
    const updateCompactViewCheckboxIfExists = (imageId, isPublic) => {
        console.warn('⚠️ DEPRECATED: updateCompactViewCheckboxIfExists() is deprecated. Use PublicStatusService instead.');
        const compactCheckbox = document.querySelector(`#public-toggle-compact-${imageId}`);

        if (compactCheckbox) {
            compactCheckbox.checked = isPublic;
        }
    };

    /**
 * Update fullscreen checkbox if it's currently open for this image
 * @param {string} _imageId - Image ID (unused - handled by unified navigation)
 * @param {boolean} _isPublic - New public status (unused)
 */
    const updateFullscreenCheckboxIfCurrent = (_imageId, _isPublic) => {
    // Note: Fullscreen updates are now handled by the unified navigation system
    // No need for separate fullscreen management
    };

    // Export to window
    if (typeof window !== 'undefined') {
        window.ImageViewPublicToggle = {
            createPublicCheckbox,
            createListViewPublicCheckbox,
            createCompactViewPublicCheckbox,
            updateListViewCheckboxIfExists,
            updateCompactViewCheckboxIfExists,
            updateFullscreenCheckboxIfCurrent
        };
    }
})();

