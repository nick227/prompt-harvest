// Hybrid Tab Service - Essential features with zero redundancy
class HybridTabService {
    constructor() {
        this.currentUserId = null;
        this.currentFilter = 'site';
        this.isInitialized = false;
    }

    // Initialize - minimal setup
    async init() {
        this.currentUserId = this.getCurrentUserId();
        this.isInitialized = true;
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

        // Single DOM query, single loop - no data structures needed
        const images = document.querySelectorAll('.image-wrapper');

        images.forEach(wrapper => {
            const { userId } = wrapper.dataset;
            const isPublic = wrapper.dataset.isPublic === 'true';

            // Pure logic - no pre-computed lists needed
            // For 'site' filter: show all public images
            // For 'user'/'mine' filter: show only user's own images
            const shouldShow = filter === 'site' ? isPublic : (String(userId) === String(this.currentUserId));

            // Debug logging for troubleshooting
            if (filter === 'user' || filter === 'mine') {
                console.log('🔍 MINE FILTER DEBUG:', {
                    imageId: wrapper.dataset.imageId,
                    userId,
                    currentUserId: this.currentUserId,
                    userIdMatch: String(userId) === String(this.currentUserId),
                    isPublic,
                    shouldShow,
                    filter
                });
            }

            // Use CSS class for consistency with existing system
            if (shouldShow) {
                wrapper.classList.remove('hidden');
            } else {
                wrapper.classList.add('hidden');
            }
        });

        const endTime = performance.now();


        return { filter, operationTime: endTime - startTime };
    }

    // Add new image - minimal overhead, no redundant data structures
    addImage(imageData) {
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
        const images = document.querySelectorAll('.image-wrapper');
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


        images.forEach((wrapper, index) => {
            const { userId } = wrapper.dataset;
            const isPublic = wrapper.dataset.isPublic === 'true';
            const { imageId } = wrapper.dataset;
            const isVisible = !wrapper.classList.contains('hidden');

            console.log(`Image ${index + 1}:`, {
                imageId,
                userId,
                isPublic,
                isVisible,
                shouldBeVisible: this.currentFilter === 'site' ? isPublic : (String(userId) === String(this.currentUserId))
            });
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
