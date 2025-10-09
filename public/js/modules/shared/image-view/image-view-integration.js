/**
 * Image View Integration Utilities
 * Handles integration with feed manager and wrapper enhancements
 */

(function() {
    'use strict';

    /**
     * Remove image from feed if available
     * @param {string} imageId - Image ID to remove
     */
    const removeImageFromFeedIfAvailable = imageId => {
        if (window.feedManager && window.feedManager.removeImageFromFeed) {
            const removed = window.feedManager.removeImageFromFeed(imageId);

            if (removed) {
                console.log(`Image ${imageId} removed from feed`);
            }
        }
    };

    /**
 * Remove image from feed if made private and in site view
 * @param {string} imageId - Image ID
 */
    const removeImageFromFeedIfPrivate = imageId => {
        if (window.ImageViewAuth?.isCurrentlyInSiteView()) {
            removeImageFromFeedIfAvailable(imageId);
        }
    };

    // Export to window
    if (typeof window !== 'undefined') {
        window.ImageViewIntegration = {
            removeImageFromFeedIfAvailable,
            removeImageFromFeedIfPrivate
        };
    }
})();

