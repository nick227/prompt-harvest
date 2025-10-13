/**
 * SearchResultDisplay - Handles search result display logic
 * @class SearchResultDisplay
 */
class SearchResultDisplay {
    constructor(debugCallback) {
        this.isDebugEnabled = debugCallback;
    }

    async displaySearchResults(
        results,
        query,
        showNoResultsCallback,
        appendImagesCallback,
        applyFilterCallback,
        hideFeedImagesCallback,
        autoLoadCallback,
        startMonitoringCallback
    ) {
        if (results.images.length === 0) {
            showNoResultsCallback(query);
        } else {
            const publicCount = results.images.filter(img => img.isPublic).length;
            const privateCount = results.images.length - publicCount;

            if (this.isDebugEnabled()) {
                console.log(`\n🎨 DISPLAYING SEARCH RESULTS FOR: "${query}"`, {
                    totalImages: results.images.length,
                    publicImages: publicCount,
                    privateImages: privateCount,
                    breakdown: results.images.map(img => ({
                        id: img.id,
                        isPublic: img.isPublic,
                        prompt: img.prompt?.substring(0, 40)
                    }))
                });
            }

            appendImagesCallback(results.images);
            await applyFilterCallback(query);

            // CRITICAL: Hide feed images AFTER search results are displayed
            hideFeedImagesCallback();

            await autoLoadCallback();

            // Final check: hide any feed images that loaded during search
            hideFeedImagesCallback();

            // Start continuous monitoring to hide feed images during search
            startMonitoringCallback();
        }
    }
}

window.SearchResultDisplay = SearchResultDisplay;

