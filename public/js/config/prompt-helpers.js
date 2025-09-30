/**
 * Frontend Prompt Helpers Configuration
 *
 * This mirrors the backend configuration and provides the same structure
 * for frontend form generation and validation.
 *
 * This file should be kept in sync with src/config/prompt-helpers.js
 */

window.PROMPT_HELPERS = {
    photogenic: {
        key: 'photogenic',
        label: 'Photogenic',
        description: 'Adds professional photography terms for realistic, high-quality images',
        text: '8k high-resolution, photogenic, ultra-realism, distinct details',
        icon: 'fas fa-camera',
        category: 'style'
    },

    artistic: {
        key: 'artistic',
        label: 'Artistic',
        description: 'Adds artistic and creative style terms for expressive images',
        text: 'artistic creative, illustration, ultra-detailed, expressive',
        icon: 'fas fa-palette',
        category: 'style'
    },

    avatar: {
        key: 'avatar',
        label: 'Avatar Mode',
        description: 'Optimizes for profile pictures and headshots',
        text: 'website profile picture, headshot, portrait photography, clean background, avatar, high quality, detailed features',
        icon: 'fas fa-user-circle',
        category: 'style'
    },

    lofi: {
        key: 'lofi',
        label: 'Lofi Mode',
        description: 'Optimizes for lofi art',
        text: 'lofi art, comic style, chill vibe, lofi music, modest lifestyle, creative aesthetic, graphical colors, dark textures',
        icon: 'fas fa-music',
        category: 'style'
    }
};

/**
 * Get all prompt helper keys
 * @returns {string[]} Array of helper keys
 */
window.getPromptHelperKeys = () => Object.keys(window.PROMPT_HELPERS);

/**
 * Get prompt helpers by category
 * @param {string} category - Category to filter by
 * @returns {Object} Filtered prompt helpers
 */
window.getPromptHelpersByCategory = category => Object.fromEntries(
    Object.entries(window.PROMPT_HELPERS).filter(([, helper]) => helper.category === category)
);

/**
 * Get all available categories
 * @returns {string[]} Array of unique categories
 */
window.getPromptHelperCategories = () => [...new Set(Object.values(window.PROMPT_HELPERS).map(helper => helper.category))];

/**
 * Validate if a helper key exists
 * @param {string} key - Helper key to validate
 * @returns {boolean} True if helper exists
 */
window.isValidPromptHelper = key => key in window.PROMPT_HELPERS;
