// Feed Image Handler - Handles image creation, wrapper management, and placeholder replacement
class FeedImageHandler {
    constructor(domOperations, viewManager, downloadManager = null) {
        this.domOperations = domOperations;
        this.viewManager = viewManager;
        this.downloadManager = downloadManager;
    }

    // Add image to feed
    addImageToFeed(imageData, filter) {
        const promptOutput = this.domOperations.getElement('promptOutput');

        if (!promptOutput) {
            console.error('❌ IMAGE HANDLER: promptOutput element not found');

            return false;
        }

        // Check if image already exists to prevent duplicates
        const existingWrapper = promptOutput.querySelector(`[data-image-id="${imageData.id}"]`);

        if (existingWrapper) {
            return false;
        }

        // Check if there's a loading placeholder to replace
        const loadingPlaceholder = promptOutput.querySelector('.loading-placeholder');

        if (loadingPlaceholder) {
            return this.replaceLoadingPlaceholder(loadingPlaceholder, imageData, filter);
        }

        // No loading placeholder, create new image wrapper and add to DOM
        const wrapper = this.createImageWrapper(imageData, filter);

        if (wrapper) {
            promptOutput.appendChild(wrapper);
        } else {
            console.error('❌ IMAGE HANDLER: createImageWrapper returned null/undefined');
        }

        return true;
    }

    // Create image wrapper
    createImageWrapper(imageData, filter) {
        const wrapper = document.createElement('div');

        wrapper.className = FEED_CONSTANTS.CLASSES.IMAGE_WRAPPER;

        // Mark search results for isolated filtering
        if (filter === 'search') {
            wrapper.dataset.source = 'search';
        }

        // Use standardized utility to set all wrapper dataset attributes
        if (window.WrapperDatasetUtils) {
            window.WrapperDatasetUtils.setWrapperDataset(wrapper, imageData, filter);
        } else {
            // Fallback to manual setting
            wrapper.dataset.filter = filter;
            wrapper.dataset.imageId = imageData.id;
            wrapper.dataset.userId = imageData.userId || '';
            wrapper.dataset.isPublic = (imageData.isPublic || false).toString();

            // Handle tags with utility or fallback
            let tagsString = '';

            if (imageData.tags) {
                tagsString = window.TagUtils
                    ? window.TagUtils.stringifyTags(imageData.tags)
                    : JSON.stringify(imageData.tags);
            }
            wrapper.dataset.tags = tagsString;
            wrapper.dataset.taggedAt = imageData.taggedAt || '';

            if (imageData.username) {
                wrapper.dataset.username = imageData.username;
            }
            if (imageData.provider) {
                wrapper.dataset.provider = imageData.provider;
            }
            if (imageData.model) {
                wrapper.dataset.model = imageData.model;
            }
            if (imageData.rating !== null && imageData.rating !== undefined) {
                wrapper.dataset.rating = imageData.rating.toString();
            }
            if (imageData.createdAt) {
                wrapper.dataset.createdAt = imageData.createdAt;
            }
        }

        if (window.imageComponent) {
            const imageElement = window.imageComponent.createImageElement(imageData);

            if (imageElement) {
                wrapper.appendChild(imageElement);
            } else {
                console.error('❌ IMAGE HANDLER: createImageElement returned null');
            }
        } else {
            console.error('❌ IMAGE HANDLER: window.imageComponent does not exist!');
        }

        // Enhance wrapper with dual views if view manager is available
        if (this.viewManager) {
            this.viewManager.enhanceNewImageWrapper(wrapper);
        } else {
            // Try to enhance later when ViewManager is available
            this.enhanceWrapperWhenReady(wrapper);
        }

        return wrapper;
    }

    // Enhance wrapper when ready
    enhanceWrapperWhenReady(wrapper, maxRetries = 10, retryDelay = 100) {
        let retries = 0;

        const tryEnhance = () => {
            if (this.viewManager) {
                this.viewManager.enhanceNewImageWrapper(wrapper);

                return;
            }

            retries++;
            if (retries < maxRetries) {
                // Waiting for ViewManager
                setTimeout(tryEnhance, retryDelay);
            } else {
                console.warn('⚠️ IMAGE HANDLER: ViewManager not available after waiting, skipping enhancement');
            }
        };

        tryEnhance();
    }

    // Replace loading placeholder
    replaceLoadingPlaceholder(loadingPlaceholder, imageData, filter) {
        try {
            // The loadingPlaceholder itself is the wrapper (created by LoadingPlaceholderFactory)
            const loadingWrapper = loadingPlaceholder.classList.contains('image-wrapper') ?
                loadingPlaceholder :
                loadingPlaceholder.querySelector('.image-wrapper');

            if (!loadingWrapper) {
                console.error('❌ IMAGE HANDLER: No loading wrapper found in placeholder');

                return false;
            }

            // For now, use simple replacement - complex dual view replacement can be added later
            const wrapper = this.createImageWrapper(imageData, filter);

            if (wrapper) {
                const container = loadingPlaceholder.parentElement;

                if (container) {
                    container.replaceChild(wrapper, loadingPlaceholder);
                }
            }

            // Handle auto download for placeholder replacement (this is always a new generation)
            if (this.downloadManager) {
                this.downloadManager.handleAutoDownloadForFeed(imageData, true);
            }

            return true;
        } catch (error) {
            console.error('❌ IMAGE HANDLER: Failed to replace loading placeholder:', error);

            return false;
        }
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.FeedImageHandler = FeedImageHandler;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FeedImageHandler;
}
