/**
 * Shared Image View Utilities
 * Common functionality for image view management across different managers
 */

class ImageViewUtils {
    /**
     * Get authentication headers for API requests
     * @returns {Object} Headers object with authentication
     */
    static getAuthHeaders() {
        // Use centralized auth utils for consistency
        if (window.UnifiedAuthUtils) {
            return window.UnifiedAuthUtils.getAuthHeaders();
        }

        // Fallback to local implementation if centralized utils not available
        const headers = { 'Content-Type': 'application/json' };

        if (window.userApi && window.userApi.isAuthenticated()) {
            const token = window.userApi.getAuthToken();

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }

        return headers;
    }

    /**
     * Check if currently viewing the site filter
     * @returns {boolean} True if in site view
     */
    static isCurrentlyInSiteView() {
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
    static removeImageFromFeedIfAvailable(imageId) {
        if (window.feedManager && window.feedManager.removeImageFromFeed) {
            const removed = window.feedManager.removeImageFromFeed(imageId);

            if (removed) {
                console.log(`🗑️ Removed image ${imageId} from feed (made private)`);
            }
        }
    }

    /**
     * Extract image data from various sources (img element, wrapper, etc.)
     * @param {HTMLElement} img - Image element
     * @param {HTMLElement} wrapper - Wrapper element (optional)
     * @returns {Object} Normalized image data
     */
    static extractImageData(img, wrapper = null) {
        return {
            id: img.dataset.id || wrapper?.dataset.imageId || img.id?.replace('image-', '') || 'unknown',
            url: img.src,
            title: img.alt || 'Generated Image',
            prompt: img.dataset.prompt || img.dataset.final || '',
            original: img.dataset.original || '',
            final: img.dataset.final || img.dataset.prompt || '',
            provider: img.dataset.provider || '',
            guidance: img.dataset.guidance || '',
            rating: parseInt(img.dataset.rating) || 0,
            isPublic: img.dataset.isPublic === 'true' || wrapper?.dataset.isPublic === 'true' || false,
            userId: img.dataset.userId || wrapper?.dataset.userId || null,
            username: img.dataset.username || null,
            createdAt: img.dataset.createdAt || null,
            filter: wrapper?.dataset.filter || 'site',
            tags: this._parseTagsFromDataset(img.dataset.tags || wrapper?.dataset.tags),
            taggedAt: img.dataset.taggedAt || wrapper?.dataset.taggedAt || null
        };
    }

    /**
     * Update wrapper view visibility (compact vs list)
     * @param {HTMLElement} wrapper - Wrapper element
     * @param {string} viewType - View type ('compact' or 'list')
     */
    static updateWrapperView(wrapper, viewType) {
        const compactView = wrapper.querySelector('.compact-view');
        const listView = wrapper.querySelector('.list-view');

        if (viewType === 'list') {
            if (compactView) {
                compactView.style.display = 'none';
            }
            if (listView) {
                listView.style.display = 'flex';
            }
        } else {
            if (compactView) {
                compactView.style.display = 'block';
            }
            if (listView) {
                listView.style.display = 'none';
            }
        }
    }

    /**
     * Create list view content for an image
     * @param {HTMLElement} listView - List view container
     * @param {Object} imageData - Image data object
     */
    static createListViewContent(listView, imageData) {
        const imageThumb = this.createListViewThumbnail(imageData);
        const content = this.createListViewContentArea(imageData);
        const publicCheckbox = this.createListViewPublicCheckbox(imageData);

        listView.appendChild(imageThumb);
        listView.appendChild(content);
        content.appendChild(publicCheckbox);

        this.addListViewClickHandler(listView, imageData);
    }

    /**
     * Create image thumbnail for list view
     * @param {Object} imageData - Image data object
     * @returns {HTMLElement} Thumbnail element
     */
    static createListViewThumbnail(imageData) {
        const imageThumb = document.createElement('div');

        imageThumb.className = 'list-image-thumb';

        const img = document.createElement('img');

        img.src = imageData.url;
        img.alt = imageData.title;

        imageThumb.appendChild(img);

        return imageThumb;
    }

    /**
     * Create content area for list view
     * @param {Object} imageData - Image data object
     * @returns {HTMLElement} Content element
     */
    static createListViewContentArea(imageData) {
        const content = document.createElement('div');

        content.className = 'list-content';

        const header = this.createListViewHeader(imageData);
        const promptSection = this.createListViewPromptSection(imageData);
        const metadata = this.createListViewMetadata(imageData);

        content.appendChild(header);
        content.appendChild(promptSection);
        content.appendChild(metadata);

        return content;
    }

    /**
     * Create header for list view
     * @param {Object} imageData - Image data object
     * @returns {HTMLElement} Header element
     */
    static createListViewHeader(imageData) {
        const header = document.createElement('div');

        header.className = 'list-header';

        const title = document.createElement('h3');

        title.className = 'list-title';
        title.textContent = imageData.title || 'Generated Image';

        header.appendChild(title);

        return header;
    }

    /**
     * Create or update list view prompt section
     * @param {Object} imageData - Image data object
     * @param {HTMLElement} [existingPromptSection] - Existing prompt section element to update (optional)
     * @returns {HTMLElement} Prompt section element
     */
    static createListViewPromptSection(imageData, existingPromptSection = null) {
        const promptSection = existingPromptSection || document.createElement('div');

        if (!existingPromptSection) {
            promptSection.className = 'list-prompt-section';
        } else {
            // Clear existing content when updating
            promptSection.innerHTML = '';
        }

        // Add original prompt if available
        if (imageData.original && imageData.original.trim()) {
            this.addPromptToSection(promptSection, 'Original Prompt:', imageData.original, '#6b7280');
        }

        // Add final prompt if available
        if (imageData.final && imageData.final.trim()) {
            this.addPromptToSection(promptSection, 'Final Prompt:', imageData.final, '#10b981');
        }

        // Fallback to main prompt if no original/final
        if ((!imageData.original || !imageData.original.trim()) &&
            (!imageData.final || !imageData.final.trim())) {
            this.addPromptToSection(promptSection, 'Prompt:', imageData.prompt || 'No prompt available', '#d1d5db');
        }

        return promptSection;
    }

    /**
     * Add a prompt to the prompt section
     * @param {HTMLElement} section - Prompt section element
     * @param {string} label - Prompt label
     * @param {string} text - Prompt text
     * @param {string} borderColor - Border color for the prompt
     */
    static addPromptToSection(section, label, text, borderColor) {
        const promptLabel = document.createElement('span');

        promptLabel.className = 'list-prompt-label';
        promptLabel.textContent = label;
        promptLabel.style.cssText = `
            color: #9ca3af;
            font-size: 12px;
            font-weight: bold;
            margin-right: 8px;
            display: block;
            margin-bottom: 4px;
        `;

        const promptText = document.createElement('div');

        promptText.className = 'list-prompt-text';
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
     */
    static addFallbackPrompt(section) {
        const fallbackLabel = document.createElement('span');

        fallbackLabel.className = 'list-prompt-label';
        fallbackLabel.textContent = 'Prompt:';
        fallbackLabel.style.cssText = `
            color: #9ca3af;
            font-size: 12px;
            font-weight: bold;
            margin-right: 8px;
        `;

        const fallbackText = document.createElement('div');

        fallbackText.className = 'list-prompt-text';
        fallbackText.textContent = 'No prompt available';
        fallbackText.style.cssText = `
            color: #d1d5db;
            font-size: 14px;
            margin-top: 4px;
        `;

        section.appendChild(fallbackLabel);
        section.appendChild(fallbackText);
    }

    /**
     * Create or update list view metadata
     * @param {Object} imageData - Image data object
     * @param {HTMLElement} [existingMetadata] - Existing metadata element to update (optional)
     * @returns {HTMLElement} Metadata element
     */
    static createListViewMetadata(imageData, existingMetadata = null) {
        const metadata = existingMetadata || document.createElement('div');

        if (!existingMetadata) {
            metadata.className = 'list-metadata';
        } else {
            // Clear existing content when updating
            metadata.innerHTML = '';
        }

        // Create metadata rows for grid layout
        const createMetadataRow = (label, value, className = '') => {
            const row = document.createElement('div');
            row.className = `metadata-row ${className}`.trim();

            const labelElement = document.createElement('span');
            labelElement.className = 'metadata-label';
            labelElement.textContent = label;

            const valueElement = document.createElement('span');
            valueElement.className = 'metadata-value';

            // Check if value contains HTML (like our username links)
            if (value.includes('<a ')) {
                valueElement.innerHTML = value;
            } else {
                valueElement.textContent = value;
            }

            row.appendChild(labelElement);
            row.appendChild(valueElement);

            return row;
        };

        // Add model row (provider)
        const modelRow = createMetadataRow('Model', imageData.provider || 'Unknown');
        metadata.appendChild(modelRow);

        // Add rating row
        const ratingRow = createMetadataRow('Rating', `★ ${imageData.rating || 0}`);
        metadata.appendChild(ratingRow);

        // Add creator row (username)
        const creatorRow = createMetadataRow('Creator', this.formatUsername(imageData));
        metadata.appendChild(creatorRow);

        // Add isPublic row - only for owner
        if (this.shouldShowPublicToggle(imageData)) {
            const publicRow = createMetadataRow('Visibility', imageData.isPublic ? 'Public' : 'Private');
            const publicValue = publicRow.querySelector('.metadata-value');
            publicValue.style.color = imageData.isPublic ? '#10b981' : '#f59e0b';
            metadata.appendChild(publicRow);
        }

        // Add tags if available
        if (imageData.tags && Array.isArray(imageData.tags) && imageData.tags.length > 0) {
            const tagsContainer = ImageViewUtils.createTagsContainer(imageData.tags);
            metadata.appendChild(tagsContainer);
        }

        return metadata;
    }

    /**
     * Format username with proper fallback logic and profile link
     * @param {Object} imageData - Image data object
     * @returns {string} Formatted username with hyperlink
     */
    static formatUsername(imageData) {
        let { username } = imageData;

        if (!username && imageData.userId) {
            username = 'Unknown User';
        } else if (!username) {
            username = 'Anonymous';
        }

        // Create hyperlink for username
        if (username === 'Anonymous' || username === 'Unknown User') {
            return username;
        }

        return `<a href="/u/${encodeURIComponent(username)}" class="text-blue-400 hover:text-blue-300 underline transition-colors">${username}</a>`;
    }

    /**
     * Create public checkbox for list or compact view
     * @param {Object} imageData - Image data object
     * @param {string} viewType - View type ('list' or 'compact')
     * @returns {HTMLElement} Public checkbox element
     */
    static createPublicCheckbox(imageData, viewType = 'list') {
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
        if (!this.shouldShowPublicToggle(imageData)) {
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
        checkbox.addEventListener('change', async () => {
            const imageId = checkbox.getAttribute('data-image-id');
            const newStatus = checkbox.checked;

            // Use unified public status service
            if (window.PublicStatusService) {
                const success = await window.PublicStatusService.updatePublicStatus(imageId, newStatus, {
                    updateDOM: true,
                    showNotifications: true,
                    updateCache: true
                });

                if (success && !newStatus && this.isCurrentlyInSiteView()) {
                    this.removeImageFromFeedIfAvailable(imageId);
                }
            } else {
                console.error('❌ PublicStatusService not available');
                // Show error notification
                if (window.notificationManager) {
                    window.notificationManager.error('Public status service not available');
                }
                // Revert checkbox state
                checkbox.checked = !newStatus;
            }
        });

        return checkboxContainer;
    }

    // REMOVED: _handlePublicStatusChangeFallback() - redundant with PublicStatusService

    /**
     * Create public checkbox for list view (convenience method)
     * @param {Object} imageData - Image data object
     * @returns {HTMLElement} Public checkbox element
     */
    static createListViewPublicCheckbox(imageData) {
        return this.createPublicCheckbox(imageData, 'list');
    }

    /**
     * Create public checkbox for compact view (convenience method)
     * @param {Object} imageData - Image data object
     * @returns {HTMLElement} Public checkbox element
     */
    static createCompactViewPublicCheckbox(imageData) {
        return this.createPublicCheckbox(imageData, 'compact');
    }

    /**
     * @deprecated Use PublicStatusService.updatePublicStatus() instead
     * Update list view checkbox if it exists
     * @param {string} imageId - Image ID
     * @param {boolean} isPublic - New public status
     */
    static updateListViewCheckboxIfExists(imageId, isPublic) {
        console.warn('⚠️ DEPRECATED: updateListViewCheckboxIfExists() is deprecated. Use PublicStatusService instead.');
        const listCheckbox = document.querySelector(`#public-toggle-list-${imageId}`);

        if (listCheckbox) {
            listCheckbox.checked = isPublic;
            console.log(`🔄 Updated list view checkbox for image ${imageId} to ${isPublic}`);
        }
    }

    /**
     * @deprecated Use PublicStatusService.updatePublicStatus() instead
     * Update compact view checkbox if it exists
     * @param {string} imageId - Image ID
     * @param {boolean} isPublic - New public status
     */
    static updateCompactViewCheckboxIfExists(imageId, isPublic) {
        console.warn('⚠️ DEPRECATED: updateCompactViewCheckboxIfExists() is deprecated. Use PublicStatusService instead.');
        const compactCheckbox = document.querySelector(`#public-toggle-compact-${imageId}`);

        if (compactCheckbox) {
            compactCheckbox.checked = isPublic;
            console.log(`🔄 Updated compact view checkbox for image ${imageId} to ${isPublic}`);
        }
    }

    /**
     * @deprecated Use PublicStatusService.updatePublicStatus() instead
     * Update image data in DOM element
     * @param {string} imageId - Image ID
     * @param {Object} updates - Data updates
     */
    static updateImageInDOM(imageId, updates) {
        console.warn('⚠️ DEPRECATED: updateImageInDOM() is deprecated. Use PublicStatusService instead.');
        const imageElement = document.querySelector(`img[data-id="${imageId}"], img[data-image-id="${imageId}"]`);

        if (imageElement) {
            Object.keys(updates).forEach(key => {
                if (updates[key] !== undefined) {
                    imageElement.dataset[key] = updates[key].toString();
                }
            });
        }
    }

    /**
     * Update fullscreen checkbox if it's currently open for this image
     * @param {string} imageId - Image ID
     * @param {boolean} isPublic - New public status
     */
    static updateFullscreenCheckboxIfCurrent(imageId, isPublic) {
        // Note: Fullscreen updates are now handled by the unified navigation system
        // No need for separate fullscreen management
    }

    /**
     * Add click handler for list view
     * @param {HTMLElement} listView - List view element
     * @param {Object} imageData - Image data object
     */
    static addListViewClickHandler(listView, imageData) {
        // Only add click handler to the image thumbnail, not the entire list view
        const imageThumb = listView.querySelector('.list-image-thumb');

        if (imageThumb) {
            imageThumb.addEventListener('click', event => {
                // Don't open fullscreen if clicking on checkbox or its container
                if (event.target.closest('.list-public-checkbox-container') ||
                    event.target.closest('.public-status-checkbox') ||
                    event.target.closest('.public-status-label')) {
                    return;
                }

                // Extract data from the actual image element instead of using passed imageData
                const imgElement = imageThumb.querySelector('img');
                if (imgElement) {
                    // Check all image elements in the document
                    const allImages = document.querySelectorAll('img[data-id]');

                    // Check if clicked image matches any of the images with dataset
                    const clickedSrc = imgElement.src;
                    const matchingImage = Array.from(allImages).find(img => img.src === clickedSrc);

                    // Try to extract data using available methods
                    let extractedData = null;
                    let sourceElement = imgElement;

                    // If the clicked image doesn't have dataset, try to find a matching image that does
                    if (!imgElement.dataset.id && matchingImage) {
                        sourceElement = matchingImage;
                    }

                    if (window.imageManager && window.imageManager.data) {
                        extractedData = window.imageManager.data.extractImageDataFromElement(sourceElement);
                    } else {
                        // Fallback: extract data manually
                        extractedData = {
                            id: sourceElement.dataset.id || 'unknown',
                            url: sourceElement.src,
                            title: sourceElement.alt,
                            prompt: sourceElement.dataset.prompt || sourceElement.dataset.final || '',
                            original: sourceElement.dataset.original || '',
                            final: sourceElement.dataset.final || sourceElement.dataset.prompt || '',
                            provider: sourceElement.dataset.provider || '',
                            guidance: sourceElement.dataset.guidance || '',
                            rating: parseInt(sourceElement.dataset.rating) || 0,
                            isPublic: sourceElement.dataset.isPublic === 'true' || false,
                            userId: sourceElement.dataset.userId || null,
                            username: sourceElement.dataset.username || null,
                            createdAt: sourceElement.dataset.createdAt || null,
                            tags: sourceElement.dataset.tags ? JSON.parse(sourceElement.dataset.tags) : []
                        };
                    }

                    if (extractedData && window.imageComponent && window.imageComponent.openFullscreen) {
                        window.imageComponent.openFullscreen(extractedData);
                    } else if (extractedData && window.imageManager && window.imageManager.openFullscreen) {
                        window.imageManager.openFullscreen(extractedData);
                    } else {
                        console.error('❌ LIST VIEW: Cannot open fullscreen - no fullscreen methods available', {
                            imageComponent: !!window.imageComponent,
                            imageManager: !!window.imageManager,
                            hasExtractedData: !!extractedData
                        });
                    }
                } else {
                    console.error('❌ LIST VIEW: No image element found in imageThumb');
                }
            });
        } else {
            console.warn('⚠️ LIST VIEW: No image thumbnail found for click handler');
        }
    }

    /**
     * Enhance an image wrapper with dual views (compact and list)
     * @param {HTMLElement} wrapper - Wrapper element to enhance
     * @param {Object} imageData - Image data (optional, will be extracted if not provided)
     * @returns {boolean} Success status
     */
    static enhanceImageWrapper(wrapper, imageData = null) {
        try {
            // Check if already enhanced
            if (wrapper.querySelector('.compact-view') && wrapper.querySelector('.list-view')) {
                return true;
            }

            const img = wrapper.querySelector('img');

            if (!img) {
                console.warn('⚠️ VIEW UTILS: No img element found in wrapper:', wrapper);

                return false;
            }

            // Extract image data if not provided
            const extractedImageData = imageData || this.extractImageData(img, wrapper);

            // Create compact view (existing content)
            const compactView = document.createElement('div');

            compactView.className = 'compact-view';
            compactView.style.cssText = `
                width: 100%;
                height: 100%;
                position: relative;
            `;

            // Move existing content to compact view
            while (wrapper.firstChild) {
                compactView.appendChild(wrapper.firstChild);
            }

            // Compact view should NOT have public checkbox - only list view should
            // The public checkbox will be added to list view only

            // Create list view
            const listView = document.createElement('div');

            listView.className = 'list-view';
            listView.style.display = 'none'; // Will be controlled by CSS classes

            // Add subtle hover effect to list view (no transforms)
            listView.addEventListener('mouseenter', () => {
                listView.style.background = 'var(--color-surface-secondary)';
                listView.style.borderColor = 'var(--color-border-secondary)';
            });

            listView.addEventListener('mouseleave', () => {
                listView.style.background = 'var(--color-surface-primary)';
                listView.style.borderColor = 'var(--color-border-primary)';
            });

            // Create list view content
            try {
                this.createListViewContent(listView, extractedImageData);
            } catch (contentError) {
                console.error('❌ VIEW UTILS: Failed to create list view content:', contentError);
                // Create a simple fallback content
                const fallbackStyle = 'display: flex; align-items: flex-start; gap: 16px; padding: 16px; ' +
                    'background: var(--color-surface-primary); border: 1px solid var(--color-border-primary); ' +
                    'border-radius: 8px; transition: all 0.2s ease;';
                const imgStyle = 'width: 100px; height: 100px; object-fit: cover; border-radius: 8px;';
                const titleStyle = 'margin: 0 0 8px 0; color: var(--color-text-primary); font-size: 16px;';
                const textStyle = 'margin: 0; color: var(--color-text-tertiary); font-size: 14px;';
                const ratingStyle = 'margin: 4px 0 0 0; color: var(--color-text-tertiary); font-size: 14px;';

                listView.innerHTML = `
                    <div style="${fallbackStyle}">
                        <img src="${extractedImageData.url}" alt="${extractedImageData.title}" style="${imgStyle}">
                        <div style="flex: 1;">
                            <h3 style="${titleStyle}">${extractedImageData.title || 'Generated Image'}</h3>
                            <p style="${textStyle}">${extractedImageData.provider || 'Unknown'}</p>
                            <p style="${ratingStyle}">Rating: ★ ${extractedImageData.rating || 0}</p>
                        </div>
                    </div>
                `;
            }

            // Add both views to wrapper
            wrapper.appendChild(compactView);
            wrapper.appendChild(listView);

            return true;
        } catch (error) {
            console.error('❌ VIEW UTILS: Failed to enhance image wrapper:', error);

            return false;
        }
    }

    /**
     * Apply current view to all image wrappers in a container
     * @param {HTMLElement} container - Container element
     * @param {string} viewType - View type to apply
     */
    static applyViewToAllWrappers(container, viewType) {
        const imageWrappers = container.querySelectorAll('.image-wrapper');

        imageWrappers.forEach((wrapper, _index) => {
            try {
                this.updateWrapperView(wrapper, viewType);
            } catch (error) {
                console.error('❌ VIEW UTILS: Failed to apply view to wrapper:', error, wrapper);
            }
        });
    }

    /**
     * Update image data in both views of a wrapper
     * @param {HTMLElement} wrapper - Wrapper element
     * @param {Object} updates - Updates to apply
     */
    static updateImageInViews(wrapper, updates) {
        const listView = wrapper.querySelector('.list-view');

        if (listView) {
            // Update list view elements
            if (updates.rating !== undefined) {
                // Update header rating display
                const headerRatingElement = listView.querySelector('.list-rating');
                if (headerRatingElement) {
                    headerRatingElement.innerHTML = updates.rating > 0 ? `★ ${updates.rating}` : '★ 0';
                }

                // Update metadata rating display (the one with rating buttons)
                const metadataRatingElement = listView.querySelector('.metadata-value');
                if (metadataRatingElement && metadataRatingElement.textContent.includes('★')) {
                    metadataRatingElement.textContent = `★ ${updates.rating || 0}`;

                    // Update rating buttons if they exist
                    const ratingButtons = metadataRatingElement.querySelector('.rating-buttons');
                    if (ratingButtons && window.RatingButtons) {
                        const imageId = ratingButtons.getAttribute('data-image-id');
                        if (imageId) {
                            const ratingButtonsInstance = new window.RatingButtons(imageId, updates.rating);
                            ratingButtonsInstance.updateRating(updates.rating);
                        }
                    }
                }
            }

            if (updates.isPublic !== undefined) {
                // Find the status row and update its value
                const statusRow = listView.querySelector('.metadata-row');
                if (statusRow) {
                    const statusLabel = statusRow.querySelector('.metadata-label');
                    const statusValue = statusRow.querySelector('.metadata-value');
                    if (statusLabel && statusLabel.textContent === 'Status' && statusValue) {
                        statusValue.textContent = updates.isPublic ? 'Public' : 'Private';
                        statusValue.style.color = updates.isPublic ? '#10b981' : '#f59e0b';
                    }
                }
            }
        }

        // Update compact view (existing functionality should handle this)
        // The rating display and other elements in compact view should update automatically
    }

    /**
     * Create tags container for list view
     * @param {Array} tags - Array of tag strings
     * @returns {HTMLElement} Tags container element
     */
    static createTagsContainer(tags) {
        const tagsContainer = document.createElement('div');

        tagsContainer.className = 'list-tags-container';

        const tagsLabel = document.createElement('span');

        tagsLabel.style.cssText = `
            color: #9ca3af;
            font-size: 12px;
            margin-right: 4px;
            flex-shrink: 0;
        `;

        tagsContainer.appendChild(tagsLabel);

        tags.forEach(tag => {
            const tagElement = document.createElement('span');

            tagElement.textContent = tag;
            tagElement.style.cssText = `
                display: inline-block;
                background: rgba(59, 130, 246, 0.2);
                color: #60a5fa;
                padding: 2px 6px;
                border-radius: 8px;
                font-size: 11px;
                border: 1px solid rgba(59, 130, 246, 0.3);
                white-space: nowrap;
                flex-shrink: 0;
                cursor: pointer;
                transition: all 0.2s ease;
            `;

            // Add active class if tag is currently active
            if (window.tagRouter && window.tagRouter.isTagActive(tag)) {
                tagElement.classList.add('tag-chip-active');
                tagElement.style.background = 'rgba(34, 197, 94, 0.3)';
                tagElement.style.borderColor = 'rgba(34, 197, 94, 0.5)';
                tagElement.style.color = '#22c55e';
            }

            // Add hover effects
            tagElement.addEventListener('mouseenter', () => {
                if (!tagElement.classList.contains('tag-chip-active')) {
                    tagElement.style.background = 'rgba(59, 130, 246, 0.3)';
                    tagElement.style.transform = 'scale(1.05)';
                }
            });

            tagElement.addEventListener('mouseleave', () => {
                if (!tagElement.classList.contains('tag-chip-active')) {
                    tagElement.style.background = 'rgba(59, 130, 246, 0.2)';
                    tagElement.style.transform = 'scale(1)';
                }
            });

            // Add click handler to filter by tag
            tagElement.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                console.log(`🏷️ TAG CLICK: Filtering by tag: ${tag}`);

                // Use tag router if available
                if (window.TagRouter && window.tagRouter) {
                    window.tagRouter.addTag(tag);
                } else {
                    // Fallback: update URL directly
                    const url = new URL(window.location);
                    url.searchParams.set('tag', tag);
                    window.location.href = url.toString();
                }
            });

            tagsContainer.appendChild(tagElement);
        });

        return tagsContainer;
    }

    /**
     * Parse tags from dataset string
     * @private
     */
    static _parseTagsFromDataset(tagsString) {
        if (!tagsString) {
            return [];
        }

        try {
            // Try to parse as JSON first
            if (tagsString.startsWith('[') || tagsString.startsWith('{')) {
                return JSON.parse(tagsString);
            }

            // If it's a comma-separated string, split it
            if (typeof tagsString === 'string') {
                return tagsString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
            }

            return [];
        } catch (error) {
            console.warn('Failed to parse tags from dataset:', tagsString, error);

            return [];
        }
    }

    /**
     * Check if user should be able to see the public toggle
     * @param {Object} imageData - Image data
     * @returns {boolean} Whether to show the toggle
     */
    static shouldShowPublicToggle(imageData) {
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

        // SECURITY: Only show toggle if current user owns the image
        // Never assume ownership if userId is missing - this prevents unauthorized access
        if (!imageData.userId) {
            console.warn('🔒 SECURITY: Image missing userId, denying ownership access for security');
            return false;
        }

        return imageData.userId === currentUserId;
    }

    /**
     * Get current user ID
     * @returns {string|null} Current user ID
     */
    static getCurrentUserId() {
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

// Export for global access
if (typeof window !== 'undefined') {
    window.ImageViewUtils = ImageViewUtils;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImageViewUtils;
}
