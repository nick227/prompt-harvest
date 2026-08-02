/**
 * SearchFeedIntegration - Handles feed integration operations
 * @class SearchFeedIntegration
 */
class SearchFeedIntegration {
    constructor(feedManager, paginationManager, debugCallback) {
        this.feedManager = feedManager;
        this.paginationManager = paginationManager;
        this.isDebugEnabled = debugCallback;
    }

    appendImagesToFeed(images) {
        if (this.isDebugEnabled()) {
            console.log(`📌 APPENDING ${images.length} IMAGES TO FEED:`, {
                publicImages: images.filter(img => img.isPublic).length,
                privateImages: images.filter(img => !img.isPublic).length,
                imageIds: images.map(img => `${img.id}(${img.isPublic ? 'public' : 'private'})`)
            });
        }

        images.forEach(image => {
            const wasAdded = this.feedManager.imageHandler.addImageToFeed(image, 'search');
            const wrapper = this.feedManager.domOperations?.getElement('promptOutput')
                ?.querySelector(`[data-image-id="${image.id}"][data-source="search"]`);

            if (wasAdded || wrapper) {
                this.paginationManager.addSeenImageId(image.id);
            }
        });

        this.reapplyView();
        this.rearmInfiniteScroll();
    }

    reapplyView() {
        if (this.feedManager.viewManager?.forceReapplyView) {
            this.feedManager.viewManager.forceReapplyView();
        }
    }

    rearmInfiniteScroll() {
        this.feedManager.uiManager?.updateIntersectionObserver?.();
    }

    scheduleFillToBottom(loadMoreCallback, aliveFlag) {
        this.paginationManager.scheduleFillToBottom(() => {
            if (!this.feedManager?.fillToBottomManager) {
                return;
            }

            const lastImage = this.feedManager.domOperations?.getLastImageElement();

            if (lastImage && this.feedManager.uiManager?.isElementInViewport(lastImage)) {
                loadMoreCallback();
            }
        }, aliveFlag);
    }

    restoreFeedImages() {
        if (this.feedManager?.domOperations) {
            this.feedManager.domOperations.restoreFeedImages();
        }
    }
}

window.SearchFeedIntegration = SearchFeedIntegration;
