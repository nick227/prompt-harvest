/**
 * Image View Data Utilities
 * Handles data extraction, parsing, and normalization
 */

(function() {
    'use strict';

    /**
     * Extract image data from various sources (img element, wrapper, etc.)
     * @param {HTMLElement} img - Image element
     * @param {HTMLElement} wrapper - Wrapper element (optional)
     * @returns {Object} Normalized image data
     */
    const extractImageData = (img, wrapper = null) => {
    // Generate title from first 60 characters of prompt
    const generateTitle = prompt => {
        if (!prompt) {
            return 'Generated Image';
        }

        return prompt.substring(0, 60);
    };

    const prompt = img.dataset.prompt || img.dataset.final || '';

    return {
        id: img.dataset.id || wrapper?.dataset.imageId || img.id?.replace('image-', '') || 'unknown',
        url: img.src,
        title: generateTitle(prompt),
        prompt,
        original: img.dataset.original || '',
        final: img.dataset.final || img.dataset.prompt || '',
        provider: img.dataset.provider || '',
        model: img.dataset.model || img.dataset.provider || 'unknown',
        guidance: img.dataset.guidance || '',
        rating: parseInt(img.dataset.rating) || 0,
        isPublic: img.dataset.isPublic === 'true' || wrapper?.dataset.isPublic === 'true' || false,
        userId: img.dataset.userId || wrapper?.dataset.userId || null,
        username: img.dataset.username || null,
        createdAt: img.dataset.createdAt || null,
        filter: wrapper?.dataset.filter || 'site',
        tags: parseTagsFromDataset(img.dataset.tags || wrapper?.dataset.tags),
        taggedAt: img.dataset.taggedAt || wrapper?.dataset.taggedAt || null
    };
};

/**
 * Parse tags from dataset string
 * @param {string|Array} tagsString - Tags as string or array
 * @returns {Array} Parsed tags array
 */
const parseTagsFromDataset = tagsString => {
    if (window.TagUtils) {
        return window.TagUtils.parseTags(tagsString);
    }

    // Fallback to original implementation
    if (!tagsString) {
        return [];
    }

    try {
        // Try to parse as JSON first
        if (tagsString.startsWith('[') || tagsString.startsWith('{')) {
            return JSON.parse(tagsString);
        }

        // If it's a comma-separated string, split it
        if (typeof tagsString === 'string') {
            return tagsString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
        }

        return [];
    } catch (error) {
        console.warn('Failed to parse tags from dataset:', tagsString, error);

        return [];
    }
};

/**
 * Format username with proper fallback logic and profile link
 * @param {Object} imageData - Image data object
 * @returns {string} Formatted username with hyperlink
 */
const formatUsername = imageData => {
    let { username } = imageData;

    if (!username && imageData.userId) {
        username = 'User';
    } else if (!username) {
        username = 'Anonymous';
    }

    // Create hyperlink for username
    if (username === 'Anonymous' || username === 'User') {
        return username;
    }

    return `<a href="/u/${encodeURIComponent(username)}" class="text-blue-400 hover:text-blue-300 underline transition-colors">${username}</a>`;
};

/**
 * Check if user should be able to see the public toggle
 * @param {Object} imageData - Image data
 * @returns {boolean} Whether to show the toggle
 */
const shouldShowPublicToggle = imageData => {
    // Use centralized auth utils for consistency
    if (window.UnifiedAuthUtils) {
        return window.UnifiedAuthUtils.shouldShowPublicToggle(imageData);
    }

    // Fallback to local implementation if centralized utils not available
    if (!imageData || !imageData.id) {
        return false;
    }

    // Check if user is authenticated
    const isAuthenticated = window.userApi && window.userApi.isAuthenticated();

    if (!isAuthenticated) {
        return false;
    }

    const currentUserId = window.ImageViewAuth?.getCurrentUserId();

    if (!currentUserId) {
        return false;
    }

    // SECURITY: Only show toggle if current user owns the image
    // Never assume ownership if userId is missing - this prevents unauthorized access
    if (!imageData.userId) {
        console.warn('🔒 SECURITY: Image missing userId, denying ownership access for security');

        return false;
    }

    return imageData.userId === currentUserId;
};

// Export to window
if (typeof window !== 'undefined') {
    window.ImageViewData = {
        extractImageData,
        parseTagsFromDataset,
        formatUsername,
        shouldShowPublicToggle
    };
}
})();

