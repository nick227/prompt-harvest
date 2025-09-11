// Feed View Manager - Handles switching between grid and list views using CSS visibility
class FeedViewManager {
    constructor() {
        this.currentView = this.loadSavedView() || 'compact'; // Load from localStorage or default
        this.isInitialized = false;
        console.log('🔍 VIEW: Constructor - currentView set to:', this.currentView);
    }

    /**
     * Load saved view preference from localStorage
     * @returns {string|null} Saved view preference or null
     */
    loadSavedView() {
        try {
            const savedView = localStorage.getItem('imageViewPreference');
            console.log('🔍 VIEW: Loading saved view preference:', savedView);
            return savedView && ['compact', 'list'].includes(savedView) ? savedView : null;
        } catch (error) {
            console.warn('⚠️ VIEW: Failed to load saved view preference:', error);
            return null;
        }
    }

    /**
     * Save view preference to localStorage
     * @param {string} viewType - View type to save ('compact' or 'list')
     */
    saveViewPreference(viewType) {
        try {
            localStorage.setItem('imageViewPreference', viewType);
            console.log(`💾 VIEW: Saved view preference: ${viewType}`);
            // Verify the save worked
            const saved = localStorage.getItem('imageViewPreference');
            console.log(`🔍 VIEW: Verification - saved value is: ${saved}`);
        } catch (error) {
            console.warn('⚠️ VIEW: Failed to save view preference:', error);
        }
    }

    init() {
        if (this.isInitialized) {
            return;
        }

        this.setupViewSwitchListeners();
        this.enhanceExistingImages();
        this.isInitialized = true;
        console.log('🔄 VIEW MANAGER: Initialized');
    }

    enhanceExistingImages() {
        const promptOutput = document.querySelector('.prompt-output');
        if (!promptOutput) {
            console.warn('⚠️ VIEW: No prompt output container found for enhancement');
            return;
        }

        const imageWrappers = promptOutput.querySelectorAll('.image-wrapper');
        console.log(`🔍 VIEW: Found ${imageWrappers.length} image wrappers to check`);
        let enhancedCount = 0;

        imageWrappers.forEach((wrapper, index) => {
            try {
                const hasCompactView = wrapper.querySelector('.compact-view');
                const hasListView = wrapper.querySelector('.list-view');
                console.log(`🔍 VIEW: Wrapper ${index}: hasCompactView=${!!hasCompactView}, hasListView=${!!hasListView}`);

                if (!hasCompactView && !hasListView) {
                    console.log(`🔍 VIEW: Enhancing wrapper ${index}`);
                    this.enhanceImageWrapper(wrapper);
                    enhancedCount++;
                } else {
                    console.log(`🔍 VIEW: Wrapper ${index} already enhanced, skipping`);
                }
            } catch (error) {
                console.error('❌ VIEW: Failed to enhance wrapper:', error, wrapper);
            }
        });

        console.log(`🔄 VIEW: Enhanced ${enhancedCount} existing image wrappers`);
    }

    /**
     * Re-run enhancement for any new images that might have been added
     * This should be called after images are loaded/added to the DOM
     */
    reEnhanceImages() {
        console.log('🔄 VIEW: Re-running image enhancement...');
        this.enhanceExistingImages();

        // Also ensure the current view is applied to any new images
        if (this.currentView) {
            this.applyCurrentViewToAllImages();
        }
    }

    /**
     * Apply the current view to all existing image wrappers
     */
    applyCurrentViewToAllImages() {
        const promptOutput = document.querySelector('.prompt-output');
        if (!promptOutput) {
            console.warn('⚠️ VIEW: No prompt output container found for applying current view');
            return;
        }

        const imageWrappers = promptOutput.querySelectorAll('.image-wrapper');
        console.log(`🔄 VIEW: Applying ${this.currentView} view to ${imageWrappers.length} image wrappers`);

        imageWrappers.forEach((wrapper, index) => {
            try {
                this.updateWrapperView(wrapper, this.currentView);
            } catch (error) {
                console.error('❌ VIEW: Failed to apply current view to wrapper:', error, wrapper);
            }
        });
    }

    setupViewSwitchListeners() {
        // Listen for view changes
        document.addEventListener('change', e => {
            if (e.target.name === 'view') {
                this.switchView(e.target.value);
            }
        });

        // Set initial view from saved preference
        const savedView = this.currentView; // Already loaded in constructor
        console.log('🔍 VIEW: Setting up initial view - savedView:', savedView);
        const viewRadio = document.querySelector(`input[name="view"][value="${savedView}"]`);
        if (viewRadio) {
            viewRadio.checked = true;
            console.log(`🔄 VIEW: Set radio button to saved preference: ${savedView}`);
        } else {
            // Fallback: default to compact view if saved preference is invalid
            console.log('⚠️ VIEW: Saved view radio button not found, falling back to compact');
            this.currentView = 'compact';
            const compactRadio = document.querySelector('input[name="view"][value="compact"]');
            if (compactRadio) {
                compactRadio.checked = true;
                console.log('🔄 VIEW: Set fallback radio button to compact');
            }
        }

        // Apply the initial view immediately
        this.applyInitialView();
    }

    applyInitialView() {
        const promptOutput = document.querySelector('.prompt-output');
        if (!promptOutput) {
            console.warn('⚠️ VIEW: No prompt output container found for initial view');
            return;
        }

        // Apply the initial view classes
        if (this.currentView === 'list') {
            promptOutput.classList.remove('grid-view');
            promptOutput.classList.add('list-view');
            console.log('🔍 VIEW: Applied list-view class, removed grid-view');
        } else {
            promptOutput.classList.remove('list-view');
            promptOutput.classList.add('grid-view');
            console.log('🔍 VIEW: Applied grid-view class, removed list-view');
        }

        console.log(`🔄 VIEW: Applied initial view: ${this.currentView}`);
        console.log('🔍 VIEW: Current CSS classes:', promptOutput.className);
    }

    switchView(viewType) {
        if (viewType === this.currentView) {
            return;
        }

        console.log(`🔄 VIEW: Switching from ${this.currentView} to ${viewType}`);

        const promptOutput = document.querySelector('.prompt-output');
        if (!promptOutput) {
            console.error('❌ VIEW: Prompt output container not found');
            return;
        }

        // Update container classes for layout
        if (viewType === 'list') {
            promptOutput.classList.remove('grid-view');
            promptOutput.classList.add('list-view');
        } else {
            promptOutput.classList.remove('list-view');
            promptOutput.classList.add('grid-view');
        }

        // Update all image wrappers to show/hide appropriate views
        const imageWrappers = promptOutput.querySelectorAll('.image-wrapper');
        imageWrappers.forEach(wrapper => {
            try {
                this.updateWrapperView(wrapper, viewType);
            } catch (error) {
                console.error('❌ VIEW: Failed to update wrapper view:', error, wrapper);
            }
        });

        this.currentView = viewType;

        // Save the new view preference
        this.saveViewPreference(viewType);

        console.log(`✅ VIEW: Switched to ${viewType} view`);
    }

    updateWrapperView(wrapper, viewType) {
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

    // Method to enhance existing image wrappers with dual views
    enhanceImageWrapper(wrapper) {
        try {
            // Check if already enhanced
            if (wrapper.querySelector('.compact-view') && wrapper.querySelector('.list-view')) {
                return;
            }

            const img = wrapper.querySelector('img');
            if (!img) {
                console.warn('⚠️ VIEW: No img element found in wrapper:', wrapper);
                return;
            }

        // Extract data from existing image - try multiple sources
        const imageData = {
            id: img.dataset.id || wrapper.dataset.imageId || img.id?.replace('image-', '') || 'unknown',
            url: img.src,
            title: img.alt || 'Generated Image',
            prompt: img.dataset.prompt || img.dataset.final || '', // Use final as prompt if available
            original: img.dataset.original || '', // Keep original separate
            final: img.dataset.final || img.dataset.prompt || '', // Include final field
            provider: img.dataset.provider || '',
            guidance: img.dataset.guidance || '',
            rating: parseInt(img.dataset.rating) || 0,
            isPublic: img.dataset.isPublic === 'true' || wrapper.dataset.isPublic === 'true' || false,
            userId: img.dataset.userId || wrapper.dataset.userId || null,
            createdAt: img.dataset.createdAt || null,
            filter: wrapper.dataset.filter || 'site'
        };

        // Debug logging
        console.log('🔍 VIEW: Extracting image data:', {
            imgDatasetId: img.dataset.id,
            wrapperDatasetId: wrapper.dataset.imageId,
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
            allWrapperDataset: Object.keys(wrapper.dataset),
            extractedImageData: imageData
        });

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
            console.error('❌ VIEW: Failed to create list view content:', contentError);
            // Create a simple fallback content
            listView.innerHTML = `
                <div style="display: flex; align-items: center; gap: 16px; padding: 16px; background: rgba(31, 41, 55, 0.8); border: 1px solid rgba(75, 85, 99, 0.3); border-radius: 8px; transition: all 0.2s ease;">
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

        // Set initial visibility based on current view
        this.updateWrapperView(wrapper, this.currentView);
        } catch (error) {
            console.error('❌ VIEW: Failed to enhance image wrapper:', error);
        }
    }

    createListViewContent(listView, imageData) {
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

        // Add click handler for fullscreen (same as compact view)
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

    // Method to enhance new image wrappers as they're added
    enhanceNewImageWrapper(wrapper) {
        console.log('🔍 VIEW: enhanceNewImageWrapper called for wrapper:', wrapper.dataset.imageId);

        // Add a small delay to ensure the image element is fully loaded
        setTimeout(() => {
            this.enhanceImageWrapper(wrapper);
        }, 50);
    }

    /**
     * Force re-application of current view to all images
     * This should be called after images are loaded and enhanced
     */
    forceReapplyView() {
        console.log('🔄 VIEW: Force re-applying current view:', this.currentView);

        // Add a small delay to ensure DOM is ready
        setTimeout(() => {
            // First, ensure all images are enhanced
            this.enhanceExistingImages();

            // Then apply the current view to all images
            this.applyCurrentViewToAllImages();

            // Also ensure the container has the right classes
            this.applyInitialView();

            console.log('✅ VIEW: Force re-application completed');
        }, 100); // Small delay to ensure DOM updates are complete
    }

    // Method to ensure view is applied (useful for when images are added)
    ensureViewApplied() {
        const promptOutput = document.querySelector('.prompt-output');
        if (!promptOutput) {
            return;
        }

        // Check if the correct view class is applied
        const hasCorrectClass = (this.currentView === 'list' && promptOutput.classList.contains('list-view')) ||
                               (this.currentView === 'compact' && promptOutput.classList.contains('grid-view'));

        if (!hasCorrectClass) {
            console.log(`🔄 VIEW: Re-applying view: ${this.currentView}`);
            this.applyInitialView();
        }
    }

    // Method to update an existing image in both views
    updateImageInView(imageId, updates) {
        const wrapper = document.querySelector(`.image-wrapper[data-image-id="${imageId}"]`);
        if (!wrapper) {
            return;
        }

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

    // Cleanup method
    cleanup() {
        this.isInitialized = false;
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.FeedViewManager = FeedViewManager;

    // Create a global instance for easy access
    window.feedViewManager = new FeedViewManager();
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FeedViewManager;
}
