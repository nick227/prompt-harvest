/**
 * LoadingPlaceholderFactory - Handles creation and management of loading placeholders
 * Follows Single Responsibility Principle for loading placeholder creation
 */
class LoadingPlaceholderFactory {
    constructor() {
        this.styles = this.initializeStyles();
        this.utils = window.ImageDOMUtils;
        this.viewUtils = window.ImageViewUtils;
        this.domUtils = window.Utils?.dom;
    }

    /**
     * Initialize CSS styles for loading placeholders
     * @returns {Object} Style configurations
     */
    initializeStyles() {
        return {
            // No inline styles - let CSS classes handle everything
            compactView: '',
            listView: '',
            loadingContent: '',
            loadingText: '',
            promptPreview: ''
        };
    }

    /**
     * Create loading placeholder with all views (compact, list, full)
     * @param {Object} promptObj - Prompt object
     * @returns {HTMLElement} Created loading placeholder
     */
    createLoadingPlaceholder(promptObj) {
        const wrapper = this.createElement('div', 'image-wrapper loading loading-placeholder');

        // Add a unique ID for easier removal
        const placeholderId = `loading-placeholder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        wrapper.id = placeholderId;

        this.setupWrapperAttributes(wrapper);
        this.createAllViews(wrapper, promptObj);
        this.setInitialView(wrapper);

        return wrapper;
    }

    /**
     * Setup wrapper attributes for filtering and identification
     * @param {HTMLElement} wrapper - Wrapper element
     */
    setupWrapperAttributes(wrapper) {
        const currentUser = this.utils?.getCurrentUser?.() || null;
        const userId = currentUser ? currentUser.id : 'unknown';
        const filterType = currentUser ? 'user' : 'site';

        wrapper.dataset.filter = filterType;
        wrapper.dataset.userId = userId;
        wrapper.dataset.isPublic = 'false';
        wrapper.dataset.imageId = `loading_${Date.now()}`;
    }

    /**
     * Create all views dynamically from ViewRegistry
     * @param {HTMLElement} wrapper - Wrapper element
     * @param {Object} promptObj - Prompt object
     */
    createAllViews(wrapper, promptObj) {
        if (!window.ViewRegistry) {
            return this.createDualViews(wrapper, promptObj);
        }

        const views = window.ViewRegistry.getViewsByPriority();

        views.forEach(([viewType, config]) => {
            const viewElement = this.createElement('div', config.className);

            this.setupView(viewType, viewElement, promptObj);
            wrapper.appendChild(viewElement);
        });
    }

    /**
     * Setup a view based on type
     * @param {string} viewType - View type (compact, list, full)
     * @param {HTMLElement} viewElement - View element
     * @param {Object} promptObj - Prompt object
     */
    setupView(viewType, viewElement, promptObj) {
        const setupMethod = `setup${viewType.charAt(0).toUpperCase() + viewType.slice(1)}View`;

        if (this[setupMethod]) {
            this[setupMethod](viewElement, promptObj);
        } else {
            console.warn(`⚠️ No setup method for view type: ${viewType}`);
        }
    }

    /**
     * @deprecated Use createAllViews() instead
     * Create legacy view structure (compact and list only)
     * @param {HTMLElement} wrapper - Wrapper element
     * @param {Object} promptObj - Prompt object
     */
    createDualViews(wrapper, promptObj) {
        const compactView = this.createElement('div', 'compact-view');
        const listView = this.createElement('div', 'list-view');

        this.setupCompactView(compactView, promptObj);
        this.setupListView(listView, promptObj);

        wrapper.appendChild(compactView);
        wrapper.appendChild(listView);
    }

    /**
     * Setup compact view for loading placeholder
     * @param {HTMLElement} compactView - Compact view element
     * @param {Object} promptObj - Prompt object
     */
    setupCompactView(compactView, promptObj) {
        // Add loading-specific class for styling
        compactView.classList.add('loading-placeholder-content');
        const loadingContent = this.createCompactLoadingContent(promptObj);

        compactView.appendChild(loadingContent);
    }

    /**
     * Create compact loading content
     * @param {Object} promptObj - Prompt object
     * @returns {HTMLElement} Loading content element
     */
    createCompactLoadingContent(_promptObj) {
        const loadingContent = this.createElement('div', 'loading-content');

        // Minimal static skeleton loader for compact view
        const skeletonContainer = this.createElement('div', 'compact-skeleton');

        skeletonContainer.innerHTML = `
            <div class="w-12 h-12 bg-gray-700 rounded mx-auto mb-3"></div>
            <div class="w-16 h-2 bg-gray-700 rounded mx-auto mb-2"></div>
            <div class="w-20 h-1.5 bg-gray-800 rounded mx-auto"></div>
        `;

        loadingContent.appendChild(skeletonContainer);

        return loadingContent;
    }

    /**
     * Add loading elements to container
     * @param {HTMLElement} container - Container element
     * @param {Object} promptObj - Prompt object
     */
    addLoadingElements(container, promptObj) {
        const skeleton = this.createSkeletonLoader();
        const text = this.createLoadingText();
        const promptPreview = this.createPromptPreview(promptObj);

        container.appendChild(skeleton);
        container.appendChild(text);
        container.appendChild(promptPreview);
    }

    /**
     * Create minimal skeleton loader element
     * @returns {HTMLElement} Skeleton loader element
     */
    createSkeletonLoader() {
        const skeleton = this.createElement('div', 'skeleton-loader');

        skeleton.innerHTML = `
            <div class="w-full h-2 bg-gray-700 rounded mb-2"></div>
            <div class="w-3/4 h-2 bg-gray-800 rounded"></div>
        `;

        return skeleton;
    }

    /**
     * Create loading text element
     * @returns {HTMLElement} Loading text element
     */
    createLoadingText() {
        const text = this.createElement('div', 'loading-text');

        text.textContent = 'Generating...';
        text.style.cssText = this.styles.loadingText;

        return text;
    }

    /**
     * Create prompt preview element
     * @param {Object} promptObj - Prompt object
     * @returns {HTMLElement} Prompt preview element
     */
    createPromptPreview(promptObj) {
        const promptPreview = this.createElement('div', 'prompt-preview');

        promptPreview.textContent = promptObj.prompt.length > 30 ?
            `${promptObj.prompt.substring(0, 30)}...` :
            promptObj.prompt;
        promptPreview.style.cssText = this.styles.promptPreview;

        return promptPreview;
    }

    /**
     * Setup full view for loading placeholder
     * @param {HTMLElement} fullView - Full view element
     * @param {Object} promptObj - Prompt object
     */
    setupFullView(fullView, promptObj) {
        fullView.classList.add('loading-placeholder-content');

        const loadingContent = document.createElement('div');

        loadingContent.className = 'full-loading-container';
        loadingContent.style.cssText = `
            width: 100%;
            height: 400px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: var(--color-surface-primary, #1a1a1a);
            border: 1px solid var(--color-border-primary, #333);
            border-radius: 8px;
            padding: 2rem;
            gap: 1rem;
        `;

        const skeletonBox = document.createElement('div');

        skeletonBox.style.cssText = `
            width: 120px;
            height: 120px;
            background: var(--color-surface-secondary, #2a2a2a);
            border: 2px solid var(--color-border-primary, #444);
            border-radius: 4px;
        `;

        const promptText = document.createElement('div');

        promptText.className = 'full-loading-prompt';
        promptText.style.cssText = `
            color: var(--color-text-secondary, #ccc);
            font-size: 16px;
            text-align: center;
            max-width: 600px;
            line-height: 1.6;
        `;
        promptText.textContent = promptObj.prompt || 'Generating...';

        const statusText = document.createElement('div');

        statusText.className = 'full-loading-status';
        statusText.style.cssText = `
            color: var(--color-text-tertiary, #666);
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
        `;
        statusText.textContent = 'PROCESSING';

        loadingContent.appendChild(skeletonBox);
        loadingContent.appendChild(promptText);
        loadingContent.appendChild(statusText);
        fullView.appendChild(loadingContent);
    }

    /**
     * Setup list view for loading placeholder
     * @param {HTMLElement} listView - List view element
     * @param {Object} promptObj - Prompt object
     */
    setupListView(listView, promptObj) {
        // Add loading-specific class for styling
        listView.classList.add('loading-placeholder-content');

        const imageThumb = this.createLoadingThumbnail();
        const content = this.createListViewContent(promptObj);

        listView.appendChild(imageThumb);
        listView.appendChild(content);
    }

    /**
     * Create loading thumbnail placeholder
     * @returns {HTMLElement} Thumbnail element
     */
    createLoadingThumbnail() {
        const imageThumb = this.createElement('div', 'list-image-thumb');

        imageThumb.innerHTML = `
            <div class="w-20 h-20 bg-gray-800 rounded border border-gray-700"></div>
        `;

        return imageThumb;
    }

    /**
     * Create list view content
     * @param {Object} promptObj - Prompt object
     * @returns {HTMLElement} Content element
     */
    createListViewContent(promptObj) {
        const content = this.createElement('div', 'list-content');

        const header = this.createListViewHeader();
        const promptSection = this.createListViewPromptSection(promptObj);
        const metadata = this.createListViewMetadata(promptObj);

        content.appendChild(header);
        content.appendChild(promptSection);
        content.appendChild(metadata);

        return content;
    }

    /**
     * Create list view header
     * @returns {HTMLElement} Header element
     */
    createListViewHeader() {
        const header = this.createElement('div', 'list-header');

        const title = this.createElement('h3', 'list-title');

        title.textContent = 'Generating...';

        const loadingIndicator = this.createElement('div', 'list-loading');

        loadingIndicator.innerHTML = `
            <div class="w-2 h-2 bg-gray-600 rounded-full"></div>
        `;

        header.appendChild(title);
        header.appendChild(loadingIndicator);

        return header;
    }

    /**
     * Create list view prompt section
     * @param {Object} promptObj - Prompt object
     * @returns {HTMLElement} Prompt section element
     */
    createListViewPromptSection(_promptObj) {
        const promptSection = this.createElement('div', 'list-prompt-section');

        // Create static skeleton lines for prompt text
        const skeletonLines = this.createSkeletonLines(3);

        promptSection.appendChild(skeletonLines);

        return promptSection;
    }

    /**
     * Create skeleton lines for loading state
     * @param {number} count - Number of skeleton lines
     * @returns {HTMLElement} Skeleton lines container
     */
    createSkeletonLines(count) {
        const container = this.createElement('div', 'skeleton-lines');

        for (let i = 0; i < count; i++) {
            const line = this.createElement('div', 'skeleton-line');
            const width = i === count - 1 ? '60%' : '100%'; // Last line is shorter

            line.innerHTML = `<div class="h-2 bg-gray-800 rounded" style="width: ${width}; margin-bottom: 6px;"></div>`;
            container.appendChild(line);
        }

        return container;
    }

    /**
     * Add a prompt to the prompt section
     * @param {HTMLElement} section - Prompt section element
     * @param {string} label - Prompt label
     * @param {string} text - Prompt text
     * @param {string} borderColor - Border color for the prompt
     */
    addPromptToSection(section, label, text, borderColor) {
        const promptLabel = this.createElement('span', 'list-prompt-label');

        promptLabel.textContent = label;
        promptLabel.style.cssText = `
            color: #9ca3af;
            font-size: 12px;
            font-weight: bold;
            margin-right: 8px;
            display: block;
            margin-bottom: 4px;
        `;

        const promptText = this.createElement('div', 'list-prompt-text');

        promptText.textContent = text;
        promptText.style.cssText = `
            color: #d1d5db;
            font-size: 14px;
            margin-bottom: 8px;
            padding: 8px;
            background: rgba(55, 65, 81, 0.3);
            border-radius: 4px;
            border-left: 3px solid ${borderColor};
        `;

        section.appendChild(promptLabel);
        section.appendChild(promptText);
    }

    /**
     * Add fallback prompt when no prompts are available
     * @param {HTMLElement} section - Prompt section element
     * @param {string} fallbackText - Fallback prompt text
     */
    addFallbackPrompt(section, fallbackText) {
        const fallbackLabel = this.createElement('span', 'list-prompt-label');

        fallbackLabel.textContent = 'Prompt:';
        fallbackLabel.style.cssText = `
            color: #9ca3af;
            font-size: 12px;
            font-weight: bold;
            margin-right: 8px;
        `;

        const promptText = this.createElement('div', 'list-prompt-text');

        promptText.textContent = fallbackText || 'No prompt available';
        promptText.style.cssText = `
            color: #d1d5db;
            font-size: 14px;
            margin-top: 4px;
        `;

        section.appendChild(fallbackLabel);
        section.appendChild(promptText);
    }

    /**
     * Create list view metadata
     * @param {Object} promptObj - Prompt object
     * @returns {HTMLElement} Metadata element
     */
    createListViewMetadata(_promptObj) {
        const metadata = this.createElement('div', 'list-metadata');

        // Create skeleton rows that match the new grid structure
        const createSkeletonRow = (label, width) => {
            const row = this.createElement('div', 'metadata-row');

            const labelElement = this.createElement('span', 'metadata-label');

            labelElement.textContent = label;

            const valueElement = this.createElement('span', 'metadata-value');

            valueElement.innerHTML = `<div class="w-${width} h-2 bg-gray-800 rounded"></div>`;

            row.appendChild(labelElement);
            row.appendChild(valueElement);

            return row;
        };

        // Add skeleton rows for each metadata field (focused fields only)
        metadata.appendChild(createSkeletonRow('Model', '12'));
        metadata.appendChild(createSkeletonRow('Rating', '10'));
        metadata.appendChild(createSkeletonRow('Creator', '16'));
        metadata.appendChild(createSkeletonRow('Visibility', '12'));

        return metadata;
    }

    /**
     * Set initial view for wrapper
     * @param {HTMLElement} wrapper - Wrapper element
     */
    setInitialView(wrapper) {
        // Try to get current view from feedViewManager first (direct access)
        let currentView = 'compact'; // Default fallback

        if (window.feedViewManager && window.feedViewManager.currentView) {
            ({ currentView } = window.feedViewManager);
        } else if (window.feedManager && window.feedManager.viewManager && window.feedManager.viewManager.currentView) {
            ({ currentView } = window.feedManager.viewManager);
        }

        console.log('🔄 LOADING PLACEHOLDER: Setting initial view to', currentView, {
            feedViewManager: !!window.feedViewManager,
            feedManager: !!window.feedManager,
            viewUtils: !!this.viewUtils
        });

        if (this.viewUtils?.updateWrapperView) {
            this.viewUtils.updateWrapperView(wrapper, currentView);
        } else {
            this.setFallbackView(wrapper, currentView);
        }
    }

    /**
     * Show loading placeholder in container
     * @param {Object} promptObj - Prompt object
     * @returns {HTMLElement|null} Created loading placeholder or null
     */
    showLoadingPlaceholder(promptObj) {
        const container = document.querySelector('.prompt-output');

        if (container) {
            const loadingPlaceholder = this.createLoadingPlaceholder(promptObj);

            container.insertBefore(loadingPlaceholder, container.firstChild);

            return loadingPlaceholder;
        }

        return null;
    }

    /**
     * Remove loading placeholder from DOM
     */
    removeLoadingPlaceholder() {
        // Try to find the most recent loading placeholder
        const loadingPlaceholders = document.querySelectorAll('.loading-placeholder');

        if (loadingPlaceholders.length > 0) {
            // Remove the first one (most recent)
            const [placeholder] = loadingPlaceholders;

            placeholder.remove();
        }
        // No placeholders to remove
    }

    /**
     * Set view using centralized renderer or fallback
     * @param {HTMLElement} wrapper - Wrapper element
     * @param {string} viewType - View type ('compact', 'list', 'full')
     * @private
     */
    setFallbackView(wrapper, viewType) {
        if (!window.ViewRenderer) {
            return this.setFallbackViewOld(wrapper, viewType);
        }

        const renderer = new window.ViewRenderer();

        renderer.updateWrapper(wrapper, viewType);
        renderer.updateContainerClasses(wrapper, viewType);
    }

    /**
     * @deprecated Legacy fallback for when ViewRenderer not available
     * @param {HTMLElement} wrapper - Wrapper element
     * @param {string} viewType - View type ('compact' or 'list')
     * @private
     */
    setFallbackViewOld(wrapper, viewType) {
        const compactView = wrapper.querySelector('.compact-view');
        const listView = wrapper.querySelector('.list-view');

        // Set the wrapper class to control which view is shown
        wrapper.className = wrapper.className.replace(/compact|list/g, '');
        wrapper.classList.add(viewType);

        // Also set display styles as fallback
        if (viewType === 'compact') {
            if (compactView) {
                compactView.style.display = 'block';
            }
            if (listView) {
                listView.style.display = 'none';
            }
        } else {
            if (compactView) {
                compactView.style.display = 'none';
            }
            if (listView) {
                listView.style.display = 'block';
            }
        }
    }

    /**
     * Create DOM element with fallback
     * @param {string} tagName - HTML tag name
     * @param {string} className - CSS class name
     * @returns {HTMLElement} Created element
     * @private
     */
    createElement(tagName, className) {
        if (this.domUtils?.createElement) {
            return this.domUtils.createElement(tagName, className);
        }

        // Fallback to native DOM creation
        const element = document.createElement(tagName);

        if (className) {
            element.className = className;
        }

        return element;
    }
}

// Export for global access
window.LoadingPlaceholderFactory = LoadingPlaceholderFactory;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LoadingPlaceholderFactory;
}
