/**
 * Multi-View Loading Manager (formerly Dual-View)
 * Centralized loading state management for multi-view image system
 * Coordinates loading states across all view types (compact, list, full, etc.)
 *
 * @class DualViewLoadingManager
 * @deprecated Class name kept for backward compatibility. Internally supports multi-view.
 */

class DualViewLoadingManager {
    constructor() {
        this.loadingStates = new Map(); // Track loading states by image ID
        this.eventListeners = new Map(); // Track event listeners for cleanup
    }

    /**
     * Initialize loading state for a new image
     * @param {string} imageId - Unique image identifier
     * @param {HTMLElement} wrapper - Image wrapper element
     * @param {Object} options - Loading options
     */
    initializeLoadingState(imageId, wrapper, options = {}) {
        const loadingState = {
            imageId,
            wrapper,
            views: this.findAllViews(wrapper),
            isImageLoaded: false,
            isPlaceholderReplaced: false,
            isFullyLoaded: false,
            startTime: Date.now(),
            options: {
                showSpinner: true,
                showProgress: false,
                autoHide: true,
                ...options
            }
        };

        this.loadingStates.set(imageId, loadingState);
        this.setupLoadingUI(loadingState);


        return loadingState;
    }

    /**
     * Find all view elements in wrapper dynamically
     * @param {HTMLElement} wrapper - Wrapper element
     * @returns {Object} Map of viewType -> element
     */
    findAllViews(wrapper) {
        if (!window.ViewRegistry) {
            return {
                compact: wrapper.querySelector('.compact-view'),
                list: wrapper.querySelector('.list-view')
            };
        }

        const views = {};

        window.ViewRegistry.getViewTypes().forEach(viewType => {
            const config = window.ViewRegistry.getViewConfig(viewType);

            views[viewType] = wrapper.querySelector(config.selector);
        });

        return views;
    }

    /**
     * Setup loading UI for all views
     * @param {Object} loadingState - Loading state object
     */
    setupLoadingUI(loadingState) {
        const { views, options } = loadingState;

        // Setup loading for each view
        Object.entries(views).forEach(([viewType, viewElement]) => {
            if (viewElement) {
                this.setupViewLoading(viewType, viewElement, options);
            }
        });

        // Add loading class to wrapper
        loadingState.wrapper.classList.add('loading', 'multi-view-loading');
    }

    /**
     * Setup loading for a specific view type
     * @param {string} viewType - View type (compact, list, full)
     * @param {HTMLElement} viewElement - View element
     * @param {Object} options - Loading options
     */
    setupViewLoading(viewType, viewElement, options) {
        // Delegate to view-specific setup method
        const setupMethod = `setup${viewType.charAt(0).toUpperCase() + viewType.slice(1)}ViewLoading`;

        if (this[setupMethod]) {
            this[setupMethod](viewElement, options);
        } else {
            console.warn(`⚠️ No setup method for view type: ${viewType}`);
        }
    }

    /**
     * Setup compact view loading state
     * @param {HTMLElement} compactView - Compact view element
     * @param {Object} options - Loading options
     */
    setupCompactViewLoading(compactView, options) {
        // Clear any existing content
        compactView.innerHTML = '';

        if (options.showSpinner) {
            const loadingContent = this.createLoadingContent('Generating...', 'compact');

            compactView.appendChild(loadingContent);
        }
    }

    /**
     * Setup full view loading state
     * @param {HTMLElement} fullView - Full view element
     * @param {Object} options - Loading options
     */
    setupFullViewLoading(fullView, options) {
        fullView.innerHTML = '';

        if (options.showSpinner) {
            const loadingContent = this.createLoadingContent('Generating full view...', 'full');

            fullView.appendChild(loadingContent);
        }
    }

    /**
     * Setup list view loading state
     * @param {HTMLElement} listView - List view element
     * @param {Object} options - Loading options
     */
    setupListViewLoading(listView, options) {
        // Find or create thumbnail container
        let thumbnailContainer = listView.querySelector('.list-image-thumb');

        if (!thumbnailContainer) {
            thumbnailContainer = document.createElement('div');
            thumbnailContainer.className = 'list-image-thumb';
            listView.insertBefore(thumbnailContainer, listView.firstChild);
        }

        // Clear thumbnail and add loading spinner
        thumbnailContainer.innerHTML = '';
        if (options.showSpinner) {
            const loadingSpinner = this.createLoadingSpinner('list');

            thumbnailContainer.appendChild(loadingSpinner);
        }

        // Update status in metadata if it exists
        const statusRow = listView.querySelector('.metadata-row');

        if (statusRow) {
            const statusLabel = statusRow.querySelector('.metadata-label');
            const statusValue = statusRow.querySelector('.metadata-value');

            if (statusLabel && statusLabel.textContent === 'Status' && statusValue) {
                statusValue.textContent = 'Generating...';
                statusValue.style.color = '#10b981';
            }
        }
    }

    /**
     * Create loading content for compact view
     * @param {string} text - Loading text
     * @param {string} type - Loading type ('compact' or 'list')
     * @returns {HTMLElement} Loading content element
     */
    createLoadingContent(text, type) {
        const container = document.createElement('div');

        container.className = `loading-content loading-${type}`;

        container.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
            background-color: #f5f5f5;
            border-radius: 3px;
            border: 2px dashed #ccc;
            color: #666;
        `;

        const spinner = document.createElement('div');

        spinner.className = 'loading-spinner';
        spinner.innerHTML = '⏳';
        spinner.style.cssText = `
            font-size: 24px;
            margin-bottom: 8px;
            animation: spin 1s linear infinite;
        `;

        const textElement = document.createElement('div');

        textElement.textContent = text;
        textElement.style.cssText = `
            font-size: 12px;
            font-weight: bold;
            text-align: center;
        `;

        container.appendChild(spinner);
        container.appendChild(textElement);

        return container;
    }

    /**
     * Create loading spinner for list view
     * @param {string} type - Loading type
     * @returns {HTMLElement} Loading spinner element
     */
    createLoadingSpinner(type) {
        const spinner = document.createElement('div');

        spinner.className = `loading-spinner loading-${type}`;
        spinner.innerHTML = '⏳';
        spinner.style.cssText = `
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(75, 85, 99, 0.5);
            border-radius: 8px;
            color: #9ca3af;
            font-size: 24px;
            animation: spin 1s linear infinite;
        `;

        return spinner;
    }

    /**
     * Update loading state when image starts loading
     * @param {string} imageId - Image identifier
     * @param {HTMLImageElement} imgElement - Image element
     */
    updateImageLoading(imageId, imgElement) {
        const loadingState = this.loadingStates.get(imageId);

        if (!loadingState) {
            console.warn(`⚠️ LOADING: No loading state found for image ${imageId}`);

            return;
        }

        loadingState.isImageLoaded = false;
        loadingState.imgElement = imgElement;

        // Add image loading event listeners
        this.setupImageEventListeners(loadingState, imgElement);

    }

    /**
     * Setup event listeners for image loading
     * @param {Object} loadingState - Loading state object
     * @param {HTMLImageElement} imgElement - Image element
     */
    setupImageEventListeners(loadingState, imgElement) {
        const { imageId } = loadingState;

        const onLoad = () => {
            this.handleImageLoaded(imageId);
        };

        const onError = () => {
            this.handleImageError(imageId);
        };

        // Store listeners for cleanup
        this.eventListeners.set(imageId, { onLoad, onError });

        imgElement.addEventListener('load', onLoad);
        imgElement.addEventListener('error', onError);
    }

    /**
     * Handle successful image load
     * @param {string} imageId - Image identifier
     */
    handleImageLoaded(imageId) {
        const loadingState = this.loadingStates.get(imageId);

        if (!loadingState) {
            return;
        }

        loadingState.isImageLoaded = true;
        this.updateLoadingUI(loadingState, 'loaded');

    }

    /**
     * Handle image load error
     * @param {string} imageId - Image identifier
     */
    handleImageError(imageId) {
        const loadingState = this.loadingStates.get(imageId);

        if (!loadingState) {
            return;
        }

        this.updateLoadingUI(loadingState, 'error');

    }

    /**
     * Replace loading placeholder with actual image
     * @param {string} imageId - Image identifier
     * @param {Object} imageData - Image data
     */
    replaceLoadingPlaceholder(imageId, imageData) {
        const loadingState = this.loadingStates.get(imageId);

        if (!loadingState) {
            console.warn(`⚠️ LOADING: No loading state found for image ${imageId}`);

            return;
        }

        loadingState.isPlaceholderReplaced = true;
        loadingState.imageData = imageData;

        // Update all views with actual image
        this.updateCompactViewWithImage(loadingState, imageData);
        this.updateListViewWithImage(loadingState, imageData);
        this.updateFullViewWithImage(loadingState, imageData);

        // Check if fully loaded
        this.checkFullyLoaded(loadingState);

    }

    /**
     * Update compact view with actual image
     * @param {Object} loadingState - Loading state object
     * @param {Object} imageData - Image data
     */
    updateCompactViewWithImage(loadingState, imageData) {
        const compactView = loadingState.views?.compact || loadingState.compactView;

        if (!compactView) {
            return;
        }

        // Clear loading content
        compactView.innerHTML = '';

        // Create and add image element
        const img = document.createElement('img');

        img.src = imageData.url;
        img.alt = imageData.title || 'Generated Image';
        img.className = 'generated-image';

        // Set data attributes
        Object.keys(imageData).forEach(key => {
            if (imageData[key] !== null && imageData[key] !== undefined) {
                img.dataset[key] = imageData[key].toString();
            }
        });

        // Apply styles
        img.style.cssText = `
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 3px;
        `;

        compactView.appendChild(img);
    }

    /**
     * Update full view with actual image
     * @param {Object} loadingState - Loading state object
     * @param {Object} imageData - Image data
     */
    updateFullViewWithImage(loadingState, imageData) {
        const fullView = loadingState.views?.full || loadingState.fullView;

        if (!fullView) {
            return;
        }

        // Always update (even if not current view) to avoid inconsistency
        fullView.innerHTML = '';

        // Create full view content using ImageViewUtils
        if (window.ImageViewUtils && window.ImageViewUtils._createFullView) {
            const fullViewContent = window.ImageViewUtils._createFullView(imageData);

            while (fullViewContent.firstChild) {
                fullView.appendChild(fullViewContent.firstChild);
            }
        } else {
            // Fallback to simple image display
            const img = document.createElement('img');

            img.src = imageData.url || imageData.imageUrl;
            img.alt = imageData.title || 'Generated Image';
            img.className = 'generated-image';
            img.style.cssText = `
                width: 100%;
                height: auto;
                object-fit: contain;
            `;

            Object.keys(imageData).forEach(key => {
                if (imageData[key] !== null && imageData[key] !== undefined) {
                    img.dataset[key] = imageData[key].toString();
                }
            });

            fullView.appendChild(img);
        }
    }

    /**
     * Update list view with actual image
     * @param {Object} loadingState - Loading state object
     * @param {Object} imageData - Image data
     */
    updateListViewWithImage(loadingState, imageData) {
        const listView = loadingState.views?.list || loadingState.listView;

        if (!listView) {
            return;
        }

        // ✅ FIX: Always update (even if not current view)
        // Views are just hidden with CSS, updating them is cheap
        // This prevents views from getting out of sync

        // Update thumbnail
        const thumbnailContainer = listView.querySelector('.list-image-thumb');

        if (thumbnailContainer) {
            thumbnailContainer.innerHTML = '';

            const thumbnailImg = document.createElement('img');

            thumbnailImg.src = imageData.url;
            thumbnailImg.alt = imageData.title || 'Generated Image';
            thumbnailImg.style.cssText = `
                width: 100%;
                height: 100%;
                object-fit: cover;
                border-radius: 8px;
            `;

            thumbnailContainer.appendChild(thumbnailImg);
        }

        // Update header title and remove loading indicator
        const titleElement = listView.querySelector('.list-title');

        if (titleElement) {
            titleElement.textContent = imageData.title || 'Generated Image';
        }

        const loadingIndicator = listView.querySelector('.list-loading');

        if (loadingIndicator) {
            loadingIndicator.remove();
        }

        // Update prompt section with actual prompt data
        const promptSection = listView.querySelector('.list-prompt-section');

        if (promptSection) {
            window.ImageViewUtils.createListViewPromptSection(imageData, promptSection);
        }

        // Update metadata with actual data
        const metadata = listView.querySelector('.list-metadata');

        if (metadata) {
            window.ImageViewUtils.createListViewMetadata(imageData, metadata);
        }

        // ✅ OPTIMIZATION: Apply current view using ViewRenderer
        const { wrapper } = loadingState;

        if (wrapper && window.feedManager && window.feedManager.viewManager) {
            const currentView = window.feedManager.viewManager.getCurrentView();

            // Use ViewRenderer if available
            if (window.ViewRenderer) {
                const renderer = new window.ViewRenderer();

                renderer.updateWrapper(wrapper, currentView);
            } else if (currentView === 'list') {
                wrapper.classList.add('list');
                wrapper.classList.remove('compact', 'full');
            } else if (currentView === 'compact') {
                wrapper.classList.add('compact');
                wrapper.classList.remove('list', 'full');
            } else if (currentView === 'full') {
                wrapper.classList.add('full');
                wrapper.classList.remove('list', 'compact');
            }
        }
    }


    /**
     * Update loading UI based on state
     * @param {Object} loadingState - Loading state object
     * @param {string} state - Current state ('loading', 'loaded', 'error')
     */
    updateLoadingUI(loadingState, state) {
        const { wrapper, options } = loadingState;

        // Update wrapper classes
        wrapper.classList.remove('loading', 'dual-view-loading');

        if (state === 'loaded') {
            wrapper.classList.add('loaded');
        } else if (state === 'error') {
            wrapper.classList.add('error');
        }

        // Auto-hide loading indicators if enabled
        if (options.autoHide && state === 'loaded') {
            this.hideLoadingIndicators(loadingState);
        }
    }

    /**
     * Hide loading indicators
     * @param {Object} loadingState - Loading state object
     */
    hideLoadingIndicators(loadingState) {
        const { compactView, listView } = loadingState;

        // Remove loading spinners
        if (compactView) {
            const spinner = compactView.querySelector('.loading-spinner');

            if (spinner) {
                spinner.style.opacity = '0';
                setTimeout(() => spinner.remove(), 300);
            }
        }

        if (listView) {
            const spinner = listView.querySelector('.loading-spinner');

            if (spinner) {
                spinner.style.opacity = '0';
                setTimeout(() => spinner.remove(), 300);
            }
        }
    }

    /**
     * Check if image is fully loaded and complete
     * @param {Object} loadingState - Loading state object
     */
    checkFullyLoaded(loadingState) {
        const { isImageLoaded, isPlaceholderReplaced } = loadingState;

        if (isImageLoaded && isPlaceholderReplaced && !loadingState.isFullyLoaded) {
            loadingState.isFullyLoaded = true;
            this.completeLoading(loadingState);
        }
    }

    /**
     * Complete loading process
     * @param {Object} loadingState - Loading state object
     */
    completeLoading(loadingState) {
        const { imageId, wrapper, startTime } = loadingState;
        const loadTime = Date.now() - startTime;

        // Final UI updates
        this.updateLoadingUI(loadingState, 'loaded');
        this.cleanupEventListeners(imageId);

        // Dispatch completion event
        const event = new CustomEvent('dualViewImageLoaded', {
            detail: {
                imageId,
                wrapper,
                loadTime,
                imageData: loadingState.imageData
            }
        });

        window.dispatchEvent(event);

    }

    /**
     * Cleanup event listeners
     * @param {string} imageId - Image identifier
     */
    cleanupEventListeners(imageId) {
        const listeners = this.eventListeners.get(imageId);

        if (listeners) {
            const { onLoad: _onLoad, onError: _onError } = listeners;

            // Note: In a real implementation, you'd need to store the imgElement reference
            // to properly remove event listeners
            this.eventListeners.delete(imageId);
        }
    }

    /**
     * Get loading state for an image
     * @param {string} imageId - Image identifier
     * @returns {Object|null} Loading state object
     */
    getLoadingState(imageId) {
        return this.loadingStates.get(imageId) || null;
    }

    /**
     * Check if image is currently loading
     * @param {string} imageId - Image identifier
     * @returns {boolean} True if loading
     */
    isLoading(imageId) {
        const state = this.loadingStates.get(imageId);

        return state && !state.isFullyLoaded;
    }

    /**
     * Remove loading state (cleanup)
     * @param {string} imageId - Image identifier
     */
    removeLoadingState(imageId) {
        this.cleanupEventListeners(imageId);
        this.loadingStates.delete(imageId);

    }

    /**
     * Get all active loading states
     * @returns {Array} Array of loading state objects
     */
    getAllLoadingStates() {
        return Array.from(this.loadingStates.values());
    }

    /**
     * Cleanup all loading states
     */
    cleanup() {
        for (const imageId of this.loadingStates.keys()) {
            this.removeLoadingState(imageId);
        }

    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.DualViewLoadingManager = DualViewLoadingManager;

    // Create global instance
    window.dualViewLoadingManager = new DualViewLoadingManager();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DualViewLoadingManager;
}
