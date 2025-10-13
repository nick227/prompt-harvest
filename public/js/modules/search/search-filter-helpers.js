/**
 * SearchFilterHelpers
 * Helper methods for filtering search results
 * Extracted from SearchManager for better code organization
 */

class SearchFilterHelpers {
    // Check if image passes owner filter
    static shouldShowForOwnerFilter(wrapper, filter, currentUserId) {
        const { userId } = wrapper.dataset;
        const isPublic = wrapper.dataset.isPublic === 'true';

        return filter === 'public'
            ? isPublic
            : (String(userId) === String(currentUserId));
    }

    // Get tags from image wrapper
    static getImageTags(wrapper) {
        try {
            const tagsData = wrapper.dataset.tags;

            if (!tagsData) {
                return [];
            }

            // Try to parse as JSON first
            if (tagsData.startsWith('[')) {
                return JSON.parse(tagsData).map(tag => tag.toLowerCase());
            }

            // Otherwise, split by comma
            return tagsData.split(',').map(tag => tag.trim().toLowerCase());
        } catch (error) {
            console.warn('Failed to parse tags:', error);

            return [];
        }
    }

    // Update search counts from DOM
    static updateSearchCountsFromDOM() {
        const searchImages = document.querySelectorAll('.image-wrapper[data-source="search"]');

        const counts = {
            total: searchImages.length,
            public: 0,
            private: 0,
            visible: 0,
            visiblePublic: 0,
            visiblePrivate: 0,
            hiddenPublic: 0,
            hiddenPrivate: 0
        };

        // Track each image's state for debugging
        const imageStates = [];

        searchImages.forEach(wrapper => {
            const isPublic = wrapper.dataset.isPublic === 'true';
            const isVisible = !wrapper.classList.contains('hidden');
            const imageId = wrapper.dataset.imageId;

            imageStates.push({
                id: imageId,
                isPublic,
                isVisible,
                classes: Array.from(wrapper.classList)
            });

            if (isPublic) {
                counts.public++;
                if (isVisible) {
                    counts.visiblePublic++;
                } else {
                    counts.hiddenPublic++;
                }
            } else {
                counts.private++;
                if (isVisible) {
                    counts.visiblePrivate++;
                } else {
                    counts.hiddenPrivate++;
                }
            }

            if (isVisible) {
                counts.visible++;
            }
        });

        // Debug logging for search image states
        console.log('🔎 DOM SEARCH IMAGE STATES:', imageStates);
        console.log('\n📈 SEARCH COUNTS UPDATED:');
        console.log(`  Total: ${counts.total} (${counts.public} public, ${counts.private} private)`);
        console.log(`  Visible: ${counts.visible} (${counts.visiblePublic} public, ${counts.visiblePrivate} private)`);
        const hiddenCount = counts.total - counts.visible;

        console.log(`  Hidden: ${hiddenCount} (${counts.hiddenPublic} public, ${counts.hiddenPrivate} private)`);

        return counts;
    }
}

// Export
if (typeof window !== 'undefined') {
    window.SearchFilterHelpers = SearchFilterHelpers;
}

