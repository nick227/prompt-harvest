// Hybrid Tab Service - Essential features with zero redundancy
class HybridTabService {
    constructor() {
        this.currentUserId = null;
        // Don't hardcode filter - let FeedFilterManager set it (P0 fix)
        this.currentFilter = null;
        this.isInitialized = false;
    }

    // Initialize - minimal setup
    async init() {
        this.currentUserId = this.getCurrentUserId();

        // If filter not set yet, try to get from FeedFilterManager (P0 fix)
        if (!this.currentFilter && window.feedManager?.filterManager) {
            this.currentFilter = window.feedManager.filterManager.currentFilter || 'public';
        }

        // Final fallback
        if (!this.currentFilter) {
            this.currentFilter = 'public';
        }

        this.isInitialized = true;

        return this;
    }

    // Set filter from external source (P0 fix)
    setFilter(filter) {
        if (filter && (filter === 'public' || filter === 'private')) {
            this.currentFilter = filter;
        }
    }

    // Get current user ID - single source of truth
    getCurrentUserId() {
        try {
            const token = localStorage.getItem('authToken');

            if (token) {
                const payload = JSON.parse(atob(token.split('.')[1]));

                return payload.userId || payload.id;
            }
        } catch (error) {
            // Silent fail - user not logged in
        }

        return null;
    }

    // Switch filter - pure CSS, zero overhead
    switchToFilter(filter) {
        const startTime = performance.now();

        this.currentFilter = filter;

        // Check if search is active - if so, filter only search results
        const isSearchActive = window.searchManager?.state?.isSearchActive;
        const selector = isSearchActive
            ? '.image-wrapper[data-source="search"]'  // Filter search results only
            : '.image-wrapper';                       // Filter all images (normal feed)

        const images = document.querySelectorAll(selector);

        // Track statistics for logging
        const stats = {
            total: images.length,
            public: 0,
            private: 0,
            willShowPublic: 0,
            willShowPrivate: 0,
            currentUserImages: 0,
            otherUserImages: 0
        };

        // P3: Conditional debug logging
        const debugEnabled = window.isDebugEnabled ? window.isDebugEnabled('SEARCH_FILTERING') : false;

        if (debugEnabled) {
            console.log(`\n🔄 OWNER FILTER SWITCH: "${filter}" (Search Active: ${isSearchActive})`);
            console.log(`Current User ID: "${this.currentUserId}"`);
            console.log(`Total Images to Filter: ${images.length}`);
        }

        images.forEach(wrapper => {
            const { userId, isPublic: isPublicStr } = wrapper.dataset;
            const isPublic = isPublicStr === 'true';
            const isCurrentUser = String(userId) === String(this.currentUserId);

            // Update stats
            if (isPublic) { stats.public++; } else { stats.private++; }

            if (isCurrentUser) { stats.currentUserImages++; } else { stats.otherUserImages++; }

            // Pure logic - no pre-computed lists needed
            // For 'public' filter: show all public images
            // For 'private' filter: show only user's own images
            const shouldShow = filter === 'public' ? isPublic : isCurrentUser;

            // Update stats for what will be shown
            if (shouldShow) {
                if (isPublic) { stats.willShowPublic++; } else { stats.willShowPrivate++; }
            }

            // Use CSS class for consistency with existing system
            if (shouldShow) {
                wrapper.classList.remove('hidden');
            } else {
                wrapper.classList.add('hidden');
            }
        });

        // P3: Conditional debug logging
        if (debugEnabled) {
            console.log('\n📊 IMAGE BREAKDOWN:');
            console.log(`  Total: ${stats.total}`);
            console.log(`  Public: ${stats.public} | Private: ${stats.private}`);
            console.log(`  Current User: ${stats.currentUserImages} | Other Users: ${stats.otherUserImages}`);
            console.log(`\n✅ FILTER RESULT (${filter}):`);

            const totalShow = stats.willShowPublic + stats.willShowPrivate;
            const totalHide = stats.total - totalShow;

            if (filter === 'public') {
                console.log(`  Will Show: ${totalShow} images (${stats.willShowPublic} public)`);
                console.log(`  Will Hide: ${totalHide} images (${stats.private - stats.willShowPrivate} private)`);
            } else {
                const showText = `${stats.willShowPrivate} your private, ${stats.willShowPublic} your public`;

                console.log(`  Will Show: ${totalShow} images (${showText})`);
                console.log(`  Will Hide: ${totalHide} images (other users)`);
            }
        }

        const endTime = performance.now();

        // Notify search manager to update counts if search is active
        if (isSearchActive && window.searchManager?.updateSearchCounts) {
            window.searchManager.updateSearchCounts();
        }

        return { filter, operationTime: endTime - startTime };
    }

    // Add new image - minimal overhead, no redundant data structures
    addImage(_imageData) {
        // No need to maintain separate lists - DOM is the source of truth
        // Just ensure the image has proper dataset attributes
    }

    // Update image - direct DOM update, no redundant tracking
    updateImage(imageId, updates) {
        const wrapper = document.querySelector(`[data-image-id="${imageId}"]`);

        if (!wrapper) { return; }

        // Update dataset directly - this is our single source of truth
        if (updates.isPublic !== undefined) {
            wrapper.dataset.isPublic = updates.isPublic.toString();
        }
        if (updates.userId !== undefined) {
            wrapper.dataset.userId = updates.userId;
        }

        // Re-evaluate visibility for current filter - no redundant data structures
        const { userId } = wrapper.dataset;
        const isPublic = wrapper.dataset.isPublic === 'true';
        const shouldShow = this.currentFilter === 'site' ? isPublic : (String(userId) === String(this.currentUserId));

        if (shouldShow) {
            wrapper.classList.remove('hidden');
        } else {
            wrapper.classList.add('hidden');
        }

    }

    // Get current filter
    getCurrentFilter() {
        return this.currentFilter;
    }

    // Check if user can access user filter
    canAccessUserFilter() {
        return this.currentUserId !== null;
    }

    // Get visible images for current filter - computed on demand
    getVisibleImages() {
        // Check if search is active - if so, count only search results
        const isSearchActive = window.searchManager?.state?.isSearchActive;
        const selector = isSearchActive
            ? '.image-wrapper[data-source="search"]'
            : '.image-wrapper';

        const images = document.querySelectorAll(selector);
        const visibleImages = [];

        images.forEach(wrapper => {
            if (wrapper.style.display !== 'none') {
                const { userId } = wrapper.dataset;
                const isPublic = wrapper.dataset.isPublic === 'true';

                // Check if this image should be visible with current filter
                const shouldShow = this.currentFilter === 'site' ? isPublic : (String(userId) === String(this.currentUserId));

                if (shouldShow) {
                    visibleImages.push({
                        id: wrapper.dataset.imageId,
                        userId: wrapper.dataset.userId,
                        isPublic: wrapper.dataset.isPublic === 'true'
                    });
                }
            }
        });

        return visibleImages;
    }

    // Get count of visible images - computed on demand
    getVisibleCount() {
        return this.getVisibleImages().length;
    }

    // Refresh - rebuild from DOM (for search filtering compatibility)
    refresh() {
        // No data structures to rebuild - DOM is always the source of truth
    }

    // Clear - no redundant data to clear
    clear() {
        // No redundant data structures to clear
    }

    // Get stats - computed on demand, no redundant storage
    getStats() {
        const images = document.querySelectorAll('.image-wrapper');
        let totalImages = 0;
        let userImages = 0;
        let publicImages = 0;

        images.forEach(wrapper => {
            totalImages++;
            const { userId } = wrapper.dataset;
            const isPublic = wrapper.dataset.isPublic === 'true';

            if (String(userId) === String(this.currentUserId)) {
                userImages++;
            }
            if (isPublic) {
                publicImages++;
            }
        });

        return {
            totalImages,
            userImages,
            publicImages,
            currentFilter: this.currentFilter,
            currentUserId: this.currentUserId,
            isInitialized: this.isInitialized
        };
    }

    // Debug method to manually test filtering
    debugFiltering() {

        const images = document.querySelectorAll('.image-wrapper');

        // Debug logging (variables for future debugging)
        images.forEach((wrapper, _index) => {
            const _userId = wrapper.dataset.userId;
            const _isPublic = wrapper.dataset.isPublic === 'true';
            const _imageId = wrapper.dataset.imageId;
            const _isVisible = !wrapper.classList.contains('hidden');
            // Debug variables available for console inspection if needed
        });
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.HybridTabService = HybridTabService;

    // Expose debug methods globally for testing
    window.debugTabFiltering = () => {
        if (window.feedManager && window.feedManager.tabService) {
            window.feedManager.tabService.debugFiltering();
        } else {
            console.warn('Feed manager or tab service not available');
        }
    };

    window.testMineFilter = () => {
        if (window.feedManager && window.feedManager.tabService) {
            window.feedManager.tabService.switchToFilter('user');
        } else {
            console.warn('Feed manager or tab service not available');
        }
    };
}
