// Feed UI Manager - Handles UI state and interactions
class FeedUIManager {
    constructor(domManager) {
        this.domManager = domManager;
        this.isLoading = false;
        this.isSetupComplete = false;
        this.intersectionObserver = null;
        this.lastImageElement = null;
    }

    // Initialize UI manager
    init() {
        this.setupIntersectionObserver();
        this.setupTagOverlays();
        this.isSetupComplete = true;
    }

    // Setup intersection observer for infinite scroll
    setupIntersectionObserver() {
        if ('IntersectionObserver' in window) {
            this.intersectionObserver = new IntersectionObserver(
                entries => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            this.handleLastImageVisible();
                        }
                    });
                },
                {
                    rootMargin: '100px'
                }
            );
        }
    }

    // Handle when last image becomes visible
    handleLastImageVisible() {
        if (this.isLoading) {

            return;
        }

        const lastImage = this.domManager.getLastImageElement();

        if (lastImage) {
            // Check if this is the first time we're seeing this image or if it's different
            const isFirstTime = !this.lastImageElement;
            const isDifferentImage = lastImage !== this.lastImageElement;

            if (isFirstTime || isDifferentImage) {
                this.lastImageElement = lastImage;

                // Dispatch event for infinite scroll
                const event = new CustomEvent('lastImageVisible', {
                    detail: { element: lastImage }
                });

                window.dispatchEvent(event);
            }
        }
    }

    // Set loading state
    setLoading(loading) {
        this.isLoading = loading;

        if (loading) {
            this.domManager.showLoading();
        } else {
            this.domManager.hideLoading();
        }
    }

    // Get loading state
    getLoading() {
        return this.isLoading;
    }

    // Show loading spinner
    showLoading() {
        this.setLoading(true);
    }

    // Hide loading spinner
    hideLoading() {
        this.setLoading(false);
    }

    // Show login prompt
    showLoginPrompt() {
        this.domManager.showLoginPrompt();
    }

    // Show no images message
    showNoImagesMessage() {
        this.domManager.showNoImagesMessage();
    }

    // Start smooth transition
    async startSmoothTransition() {
        const promptOutput = this.domManager.getElement('promptOutput');

        if (!promptOutput) {
            return;
        }

        // Add transitioning class to prevent content flashing
        promptOutput.classList.add(FEED_CONSTANTS.CLASSES.TRANSITIONING);

        // Start fade out
        promptOutput.classList.add(FEED_CONSTANTS.CLASSES.FADE_OUT);

        // Wait for fade out to complete
        await this.waitForTransition(FEED_CONSTANTS.TRANSITIONS.FADE_OUT_DURATION);

        return promptOutput;
    }

    // Complete smooth transition
    async completeSmoothTransition(promptOutput) {
        if (!promptOutput) {
            return;
        }

        // Remove fade out and add fade in
        promptOutput.classList.remove(FEED_CONSTANTS.CLASSES.FADE_OUT);
        promptOutput.classList.add(FEED_CONSTANTS.CLASSES.FADE_IN);

        // Wait for fade in to complete
        await this.waitForTransition(FEED_CONSTANTS.TRANSITIONS.FADE_IN_DURATION);

        // Clean up transition classes
        promptOutput.classList.remove(
            FEED_CONSTANTS.CLASSES.TRANSITIONING,
            FEED_CONSTANTS.CLASSES.FADE_IN
        );
    }

    // Wait for transition duration
    waitForTransition(duration) {
        return new Promise(resolve => setTimeout(resolve, duration));
    }

    // Show error message
    showErrorMessage(message) {
        this.domManager.showErrorMessage(message);
    }

    // Clear feed content
    clearFeedContent() {
        this.domManager.clearFeedContent();
    }

    // Remove specific image from feed
    removeImageFromFeed(imageId) {
        return this.domManager.removeImageFromFeed(imageId);
    }

    // Add image to feed (delegates to image handler)
    addImageToFeed(imageData, filter) {
        // This method should be called through the main feed manager
        // which will use the image handler
        console.warn('⚠️ UI MANAGER: addImageToFeed should be called through FeedManager');

        // For backward compatibility, try to use the feed manager's image handler
        if (window.feedManager && window.feedManager.imageHandler) {
            const wasAdded = window.feedManager.imageHandler.addImageToFeed(imageData, filter);

            // Only update intersection observer if a new image was actually added
            if (wasAdded) {
                this.updateIntersectionObserver();

                // Add to tab service for intelligent filtering
                if (window.feedManager && window.feedManager.tabService) {
                    window.feedManager.tabService.addImage(imageData);
                }
            }
        }
    }

    // Update intersection observer
    updateIntersectionObserver() {

        if (this.intersectionObserver) {
            const lastImage = this.domManager.getLastImageElement();

            // Only update observer if we have a new last image
            if (lastImage && lastImage !== this.lastImageElement) {
                // First, unobserve all current targets to prevent multiple observations
                this.intersectionObserver.disconnect();

                this.intersectionObserver.observe(lastImage);
                // Don't set this.lastImageElement here - let the intersection observer callback handle it
            }
        }
    }


    // Update filter button states
    updateFilterButtonStates(availableFilters) {
        this.domManager.updateFilterButtonStates(availableFilters);
    }

    // Set filter button as active
    setFilterButtonActive(filter) {
        this.domManager.setFilterButtonActive(filter);
    }

    // Get scroll position
    getScrollPosition() {
        return this.domManager.getScrollPosition();
    }

    // Set scroll position
    setScrollPosition(position) {
        this.domManager.setScrollPosition(position);
    }

    // Check if element is in viewport
    isElementInViewport(element) {
        return this.domManager.isElementInViewport(element);
    }

    // Get last image element
    getLastImageElement() {
        return this.domManager.getLastImageElement();
    }

    // Disconnect intersection observer
    disconnectIntersectionObserver() {
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }
    }

    // Reconnect intersection observer
    reconnectIntersectionObserver() {
        this.disconnectIntersectionObserver();
        this.setupIntersectionObserver();
        this.updateIntersectionObserver();
    }

    // Force update intersection observer (useful after view changes)
    forceUpdateIntersectionObserver() {
        if (this.intersectionObserver) {
            // Disconnect and reconnect to ensure we're monitoring the correct last image
            this.disconnectIntersectionObserver();
            this.setupIntersectionObserver();
            this.updateIntersectionObserver();
        }
    }

    // Handle window resize
    handleWindowResize() {
        // Window resize handled by CSS media queries and responsive design

        // Check and fill to bottom after window resize
        setTimeout(() => {
            if (window.feedManager && window.feedManager.fillToBottomManager) {
                const currentFilter = window.feedManager.getCurrentFilter();
                window.feedManager.fillToBottomManager.checkAndFillWithDebounce(currentFilter, 200);
            }
        }, 100);
    }

    // Setup window event listeners
    setupWindowListeners() {
        window.addEventListener('resize', () => {
            this.handleWindowResize();
        });

        window.addEventListener('scroll', () => {
            // Handle scroll events if needed
        });
    }

    // Cleanup
    cleanup() {
        this.disconnectIntersectionObserver();
        this.isSetupComplete = false;
    }

    // Setup tag overlays for visual feedback
    setupTagOverlays() {
        // No initialization needed - CSS handles the ::after element
        // Tag overlays ready (using existing CSS ::after)
    }

    // Update tag filter indicator
    updateTagFilterIndicator(activeTags) {
        // Update the tags-in-use container
        this.updateTagsInUseContainer(activeTags);
    }

    // Update the tags-in-use container with removable tag chips
    updateTagsInUseContainer(activeTags) {
        const tagsInUseContainer = document.getElementById('tags-in-use');

        if (!tagsInUseContainer) {
            console.warn('⚠️ TAG FILTER: tags-in-use container not found');

            return;
        }

        // Clear existing tags
        tagsInUseContainer.innerHTML = '';

        if (activeTags.length > 0) {
            // Show the container
            tagsInUseContainer.classList.remove('hidden');

            // Add each active tag as a removable chip
            activeTags.forEach(tag => {
                const tagChip = this.createRemovableTagChip(tag);
                tagsInUseContainer.appendChild(tagChip);
            });

            // Updated tags-in-use container
        } else {
            // Hide the container
            tagsInUseContainer.classList.add('hidden');
            // Hidden tags-in-use container (no active tags)
        }
    }

    // Create a removable tag chip
    createRemovableTagChip(tag) {
        const tagChip = document.createElement('div');
        tagChip.className = 'tag-chip-removable';
        tagChip.style.cssText = `
            display: inline-flex;
            align-items: center;
            background: rgba(59, 130, 246, 0.2);
            color: #60a5fa;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            border: 1px solid rgba(59, 130, 246, 0.3);
            white-space: nowrap;
            cursor: pointer;
            transition: all 0.2s ease;
            gap: 4px;
        `;

        // Add tag text
        const tagText = document.createElement('span');
        tagText.textContent = tag;
        tagChip.appendChild(tagText);

        // Add remove button
        const removeButton = document.createElement('span');
        removeButton.innerHTML = '×';
        removeButton.style.cssText = `
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: rgba(239, 68, 68, 0.2);
            color: #f87171;
            font-size: 12px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s ease;
            margin-left: 4px;
        `;

        tagChip.appendChild(removeButton);

        // Add hover effects
        tagChip.addEventListener('mouseenter', () => {
            tagChip.style.background = 'rgba(59, 130, 246, 0.3)';
            tagChip.style.transform = 'scale(1.05)';
        });

        tagChip.addEventListener('mouseleave', () => {
            tagChip.style.background = 'rgba(59, 130, 246, 0.2)';
            tagChip.style.transform = 'scale(1)';
        });

        // Add click handler to remove the tag
        tagChip.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.removeTag(tag);
        });

        return tagChip;
    }

    // Remove a specific tag from the active filter
    removeTag(tagToRemove) {
        // Removing tag

        // Get current active tags from tag router
        if (window.tagRouter) {
            const currentTags = window.tagRouter.getActiveTags();
            const updatedTags = currentTags.filter(tag => tag !== tagToRemove);

            // Updated tags

            // Update tag router with remaining tags
            window.tagRouter.setActiveTags(updatedTags);
        } else {
            console.error('❌ TAG FILTER: Tag router not available');
        }
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.FeedUIManager = FeedUIManager;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FeedUIManager;
}
