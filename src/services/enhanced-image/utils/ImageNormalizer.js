/**
 * Image Normalization Utilities
 * Pure functions for transforming database image records to frontend format
 */

/**
 * Centralized database-to-frontend field mapping
 * DATABASE SCHEMA:
 * - image.provider: The actual model provider (e.g., 'flux-pro', 'flux-dev')
 * - image.model: Legacy field, contains provider name for backward compatibility
 *
 * FRONTEND EXPECTED FORMAT:
 * - provider: The model provider name
 * - model: The model provider name (duplicate for backward compatibility)
 *
 * @param {Object} dbImage - Raw image object from database
 * @returns {Object} Mapped fields for frontend consumption
 */
export const mapImageFields = dbImage => ({
    provider: dbImage.provider || dbImage.model || 'unknown',
    model: dbImage.provider || dbImage.model || 'unknown'
});

/**
 * Normalize a single image object for frontend consumption
 * @param {Object} image - Raw image from database
 * @param {Map} userMap - Map of userId to username (optional)
 * @returns {Object} Normalized image object
 */
export const normalizeImage = (image, userMap = null) => {
    const mappedFields = mapImageFields(image);
    const username = userMap
        ? userMap.get(image.userId) || (image.userId ? 'User' : 'Anonymous')
        : null;

    const normalized = {
        id: image.id,
        userId: image.userId,
        prompt: image.prompt,
        original: image.original,
        imageUrl: image.imageUrl,
        ...mappedFields,
        guidance: image.guidance,
        rating: image.rating,
        isPublic: image.isPublic,
        createdAt: image.createdAt,
        updatedAt: image.updatedAt
    };

    // Add optional fields if they exist
    if (image.tags) {
        normalized.tags = image.tags;
    }
    if (image.taggedAt) {
        normalized.taggedAt = image.taggedAt;
    }
    if (image.taggingMetadata) {
        normalized.taggingMetadata = image.taggingMetadata;
    }
    if (username !== null) {
        normalized.username = username;
    }

    return normalized;
};

/**
 * Normalize multiple images with cost information for billing pages
 * @param {Array} images - Array of raw images from database
 * @param {Map} modelCostMap - Map of model names to cost info
 * @returns {Array} Normalized images with cost data
 */
export const normalizeImagesWithCosts = (images, modelCostMap) => images.map(image => {
    const normalized = normalizeImage(image);
    // Use provider field as key since it stores the model name (e.g., 'flux-pro')
    const modelKey = normalized.provider;
    const modelInfo = modelCostMap.get(modelKey);

    return {
        ...normalized,
        url: normalized.imageUrl, // Alias for backward compatibility
        modelDisplayName: modelInfo?.displayName || normalized.model,
        costPerImage: modelInfo?.costPerImage || 1.0
    };
});
