/**
 * Image View DOM Updates Utilities
 * Handles DOM manipulation and element updates
 */

(function() {
    'use strict';

    /**
     * Update image data in DOM element
 * @deprecated Use PublicStatusService.updatePublicStatus() instead
 * @param {string} imageId - Image ID
 * @param {Object} updates - Data updates
 */
    const updateImageInDOM = (imageId, updates) => {
        console.warn('⚠️ DEPRECATED: updateImageInDOM() is deprecated. Use PublicStatusService instead.');
        const imageElement = document.querySelector(`img[data-id="${imageId}"], img[data-image-id="${imageId}"]`);

        if (imageElement) {
            Object.keys(updates).forEach(key => {
                if (updates[key] !== undefined) {
                    imageElement.dataset[key] = updates[key].toString();
                }
            });
        }
    };

    /**
     * Apply view type to all image wrappers in a container
     * @param {HTMLElement} container - Container element
     * @param {string} viewType - View type ('compact', 'list', 'full')
     */
    const applyViewToAllWrappers = (container, viewType) => {
        if (!window.ViewRenderer) {
            return applyViewToAllWrappersOld(container, viewType);
        }

        const renderer = new window.ViewRenderer();

        renderer.applyToAllWrappers(container, viewType);
    };

    /**
     * Update wrapper view visibility
     * @param {HTMLElement} wrapper - Wrapper element
     * @param {string} viewType - View type ('compact', 'list', 'full')
     */
    const updateWrapperView = (wrapper, viewType) => {
        if (!window.ViewRenderer) {
            return updateWrapperViewOld(wrapper, viewType);
        }

        const renderer = new window.ViewRenderer();

        renderer.updateWrapper(wrapper, viewType);
    };

    /**
     * @deprecated Legacy view application without ViewRenderer
     */
    const applyViewToAllWrappersOld = (container, viewType) => {
        const wrappers = container.querySelectorAll('.image-wrapper');

        wrappers.forEach(wrapper => {
            updateWrapperViewOld(wrapper, viewType);
        });
    };

    /**
     * @deprecated Legacy wrapper view update without ViewRenderer
     */
    const updateWrapperViewOld = (wrapper, viewType) => {
        const compactView = wrapper.querySelector('.compact-view');
        const listView = wrapper.querySelector('.list-view');

        if (!compactView || !listView) {
            return;
        }

        if (viewType === 'compact') {
            compactView.style.display = 'block';
            listView.style.display = 'none';
        } else {
            compactView.style.display = 'none';
            listView.style.display = 'flex';
        }
    };

    /**
     * Update image in multiple views (wrapper, list, compact, full)
     * @param {HTMLElement} wrapper - Image wrapper element
     * @param {Object} updates - Updates to apply
     */
    const updateImageInViews = (wrapper, updates) => {
        if (!wrapper) {
            return;
        }

        if (!window.ViewRegistry) {
            return updateImageInViewsOld(wrapper, updates);
        }

        // Update all views dynamically
        const viewTypes = window.ViewRegistry.getViewTypes();

        viewTypes.forEach(viewType => {
            const config = window.ViewRegistry.getViewConfig(viewType);
            const viewImg = wrapper.querySelector(`${config.selector} img`);

            if (viewImg) {
                Object.keys(updates).forEach(key => {
                    if (updates[key] !== undefined) {
                        viewImg.dataset[key] = String(updates[key]);
                    }
                });
            }
        });

        // Update specific UI elements based on update type
        if ('isPublic' in updates) {
            updatePublicCheckboxes(wrapper, updates.isPublic);
        }

        if ('username' in updates) {
            updateUsernameDisplay(wrapper, updates);
        }

        if ('tags' in updates) {
            updateTagsDisplay(wrapper, updates.tags);
        }
    };

    /**
     * @deprecated Legacy image update without ViewRegistry
     */
    const updateImageInViewsOld = (wrapper, updates) => {
        // Update compact view if exists
        const compactImg = wrapper.querySelector('.compact-view img');

        if (compactImg) {
            Object.keys(updates).forEach(key => {
                if (updates[key] !== undefined) {
                    compactImg.dataset[key] = String(updates[key]);
                }
            });
        }

        // Update list view if exists
        const listImg = wrapper.querySelector('.list-view img');

        if (listImg) {
            Object.keys(updates).forEach(key => {
                if (updates[key] !== undefined) {
                    listImg.dataset[key] = String(updates[key]);
                }
            });
        }

        // Update specific UI elements based on update type
        if ('isPublic' in updates) {
            updatePublicCheckboxes(wrapper, updates.isPublic);
        }

        if ('username' in updates) {
            updateUsernameDisplay(wrapper, updates);
        }

        if ('tags' in updates) {
            updateTagsDisplay(wrapper, updates.tags);
        }
    };

    /**
 * Update public checkboxes in wrapper
 * @param {HTMLElement} wrapper - Wrapper element
 * @param {boolean} isPublic - New public status
 */
    const updatePublicCheckboxes = (wrapper, isPublic) => {
        const listCheckbox = wrapper.querySelector('.list-public-checkbox-container input');
        const compactCheckbox = wrapper.querySelector('.compact-public-checkbox-container input');

        if (listCheckbox) {
            listCheckbox.checked = isPublic;
        }
        if (compactCheckbox) {
            compactCheckbox.checked = isPublic;
        }
    };

    /**
 * Update username display in wrapper
 * @param {HTMLElement} wrapper - Wrapper element
 * @param {Object} updates - Updates containing username
 */
    const updateUsernameDisplay = (wrapper, updates) => {
        const usernameElement = wrapper.querySelector('.metadata-value');

        if (usernameElement && updates.username) {
            const formattedUsername = window.ImageViewData?.formatUsername(updates) || updates.username;

            if (formattedUsername.includes('<a ')) {
                usernameElement.innerHTML = formattedUsername;
            } else {
                usernameElement.textContent = formattedUsername;
            }
        }
    };

    /**
 * Update tags display in wrapper
 * @param {HTMLElement} wrapper - Wrapper element
 * @param {Array} tags - New tags array
 */
    const updateTagsDisplay = (wrapper, tags) => {
        const tagsContainer = wrapper.querySelector('.list-tags-container');

        if (tagsContainer && tags) {
        // Import and use createTagsContainer if available
            if (window.ImageViewTags && window.ImageViewTags.createTagsContainer) {
                const newTagsContainer = window.ImageViewTags.createTagsContainer(tags);

                tagsContainer.parentNode.replaceChild(newTagsContainer, tagsContainer);
            }
        }
    };

    // Export to window
    if (typeof window !== 'undefined') {
        window.ImageViewDomUpdates = {
            updateImageInDOM,
            applyViewToAllWrappers,
            updateWrapperView,
            updateImageInViews
        };
    }
})();

