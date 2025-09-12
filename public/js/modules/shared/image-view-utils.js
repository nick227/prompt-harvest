/**
 * Shared Image View Utilities
 * Common functionality for image view management across different managers
 */

class ImageViewUtils {
    /**
     * Extract image data from various sources (img element, wrapper, etc.)
     * @param {HTMLElement} img - Image element
     * @param {HTMLElement} wrapper - Wrapper element (optional)
     * @returns {Object} Normalized image data
     */
    static extractImageData(img, wrapper = null) {
        const imageData = {
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
            createdAt: img.dataset.createdAt || null,
            filter: wrapper?.dataset.filter || 'site'
        };

        console.log('🔍 VIEW UTILS: Extracted image data:', {
            imgDatasetId: img.dataset.id,
            wrapperDatasetId: wrapper?.dataset.imageId,
            imgId: img.id,
            finalId: imageData.id,
            isPublic: imageData.isPublic,
            userId: imageData.userId,
            prompt: imageData.prompt,
            original: imageData.original,
            final: imageData.final,
            provider: imageData.provider,
            url: imageData.url,
            allImgDataset: Object.keys(img.dataset),
            allWrapperDataset: wrapper ? Object.keys(wrapper.dataset) : [],
            extractedImageData: imageData
        });

        return imageData;
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
        // Create image thumbnail
        const imageThumb = document.createElement('div');
        imageThumb.className = 'list-image-thumb';

        const img = document.createElement('img');
        img.src = imageData.url;
        img.alt = imageData.title;

        imageThumb.appendChild(img);

        // Create content area
        const content = document.createElement('div');
        content.className = 'list-content';

        // Create header with title and rating
        const header = document.createElement('div');
        header.className = 'list-header';

        const title = document.createElement('h3');
        title.className = 'list-title';
        title.textContent = imageData.title || 'Generated Image';

        const rating = document.createElement('div');
        rating.className = 'list-rating';
        rating.innerHTML = imageData.rating > 0 ? `★ ${imageData.rating}` : '★ 0';

        header.appendChild(title);
        header.appendChild(rating);

        // Create prompt section
        const promptSection = document.createElement('div');
        promptSection.className = 'list-prompt-section';

        const promptLabel = document.createElement('span');
        promptLabel.className = 'list-prompt-label';
        promptLabel.textContent = 'Prompt:';

        const promptText = document.createElement('div');
        promptText.className = 'list-prompt-text';
        promptText.textContent = imageData.prompt || 'No prompt available';

        promptSection.appendChild(promptLabel);
        promptSection.appendChild(promptText);

        // Create metadata row
        const metadata = document.createElement('div');
        metadata.className = 'list-metadata';

        const provider = document.createElement('span');
        provider.textContent = `Provider: ${imageData.provider || 'Unknown'}`;

        const guidance = document.createElement('span');
        guidance.textContent = `Guidance: ${imageData.guidance || 'N/A'}`;

        const status = document.createElement('span');
        status.textContent = imageData.isPublic ? 'Public' : 'Private';
        status.style.color = imageData.isPublic ? '#10b981' : '#f59e0b';

        const date = document.createElement('span');
        if (imageData.createdAt) {
            const dateObj = new Date(imageData.createdAt);
            date.textContent = `Created: ${dateObj.toLocaleDateString()}`;
        } else {
            date.textContent = 'Created: Unknown';
        }

        metadata.appendChild(provider);
        metadata.appendChild(guidance);
        metadata.appendChild(status);
        metadata.appendChild(date);

        // Assemble content
        content.appendChild(header);
        content.appendChild(promptSection);
        content.appendChild(metadata);

        // Assemble list view
        listView.appendChild(imageThumb);
        listView.appendChild(content);

        // Add click handler for fullscreen
        listView.addEventListener('click', (event) => {
            console.log('🔍 LIST VIEW: Click detected on list view', {
                hasImageManager: !!window.imageManager,
                hasImageComponent: !!window.imageComponent,
                hasImageComponentOpenFullscreen: !!(window.imageComponent && window.imageComponent.openFullscreen),
                imageData: imageData
            });

            // Try multiple fullscreen methods
            if (window.imageComponent && window.imageComponent.openFullscreen) {
                console.log('🔍 LIST VIEW: Opening fullscreen via imageComponent with image data:', imageData);
                window.imageComponent.openFullscreen(imageData);
            } else if (window.imageManager && window.imageManager.openFullscreen) {
                console.log('🔍 LIST VIEW: Opening fullscreen via imageManager with image data:', imageData);
                window.imageManager.openFullscreen(imageData);
            } else {
                console.error('❌ LIST VIEW: Cannot open fullscreen - no fullscreen methods available', {
                    imageComponent: !!window.imageComponent,
                    imageManager: !!window.imageManager,
                    imageComponentOpenFullscreen: !!(window.imageComponent && window.imageComponent.openFullscreen),
                    imageManagerOpenFullscreen: !!(window.imageManager && window.imageManager.openFullscreen)
                });
            }
        });
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
            if (!imageData) {
                imageData = this.extractImageData(img, wrapper);
            }

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

            // Create list view
            const listView = document.createElement('div');
            listView.className = 'list-view';
            listView.style.display = 'none'; // Will be controlled by CSS classes

            // Add subtle hover effect to list view (no transforms)
            listView.addEventListener('mouseenter', () => {
                listView.style.background = 'rgba(31, 41, 55, 0.9)';
                listView.style.borderColor = 'rgba(75, 85, 99, 0.5)';
            });

            listView.addEventListener('mouseleave', () => {
                listView.style.background = 'rgba(31, 41, 55, 0.8)';
                listView.style.borderColor = 'rgba(75, 85, 99, 0.3)';
            });

            // Create list view content
            try {
                this.createListViewContent(listView, imageData);
            } catch (contentError) {
                console.error('❌ VIEW UTILS: Failed to create list view content:', contentError);
                // Create a simple fallback content
                listView.innerHTML = `
                    <div style="display: flex; align-items: flex-start; gap: 16px; padding: 16px; background: rgba(31, 41, 55, 0.8); border: 1px solid rgba(75, 85, 99, 0.3); border-radius: 8px; transition: all 0.2s ease;">
                        <img src="${imageData.url}" alt="${imageData.title}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px;">
                        <div style="flex: 1;">
                            <h3 style="margin: 0 0 8px 0; color: #f9fafb; font-size: 16px;">${imageData.title || 'Generated Image'}</h3>
                            <p style="margin: 0; color: #9ca3af; font-size: 14px;">Provider: ${imageData.provider || 'Unknown'}</p>
                            <p style="margin: 4px 0 0 0; color: #9ca3af; font-size: 14px;">Rating: ★ ${imageData.rating || 0}</p>
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
        console.log(`🔄 VIEW UTILS: Applying ${viewType} view to ${imageWrappers.length} image wrappers`);

        imageWrappers.forEach((wrapper, index) => {
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
                const ratingElement = listView.querySelector('.list-rating');
                if (ratingElement) {
                    ratingElement.innerHTML = updates.rating > 0 ? `★ ${updates.rating}` : '★ 0';
                }
            }

            if (updates.isPublic !== undefined) {
                const statusElement = listView.querySelector('.list-metadata span[style*="color:"]');
                if (statusElement) {
                    statusElement.textContent = updates.isPublic ? 'Public' : 'Private';
                    statusElement.style.color = updates.isPublic ? '#10b981' : '#f59e0b';
                }
            }
        }

        // Update compact view (existing functionality should handle this)
        // The rating display and other elements in compact view should update automatically
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
