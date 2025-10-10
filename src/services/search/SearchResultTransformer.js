/**
 * SearchResultTransformer
 * Responsibility: Transform search results for API response
 * Follows: Single Responsibility Principle
 */

class SearchResultTransformer {
    /**
     * Transform images for frontend consumption
     * DRY: Single place for image transformation logic
     */
    transformImages(images) {
        return images.map(this.transformImage);
    }

    /**
     * Transform single image
     * Maps imageUrl to url for frontend compatibility
     * @private
     */
    transformImage({ searchScore: _score, imageUrl, ...image }) {
        return {
            ...image,
            url: imageUrl,      // Frontend expects 'url'
            imageUrl            // Keep for backward compatibility
        };
    }

    /**
     * Build complete API response
     */
    buildResponse({
        images,
        total,
        pagination,
        searchMeta,
        requestMeta
    }) {
        const transformedImages = this.transformImages(images);
        const hasMore = pagination.skip + images.length < total;

        return {
            success: true,
            data: {
                items: transformedImages,
                pagination: {
                    page: pagination.page,
                    limit: pagination.limit,
                    total
                },
                hasMore,
                meta: {
                    query: searchMeta.query,
                    filter: searchMeta.filter,
                    resultCount: images.length
                }
            },
            requestId: requestMeta.requestId,
            duration: `${requestMeta.duration}ms`
        };
    }
}

export default SearchResultTransformer;

