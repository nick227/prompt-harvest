/**
 * Centralized Prompt Helpers Configuration
 *
 * This is the single source of truth for all prompt helper flags.
 * Adding new helpers here automatically enables them across the entire application.
 *
 * Structure:
 * - key: Unique identifier used in forms and processing
 * - label: Display name for UI
 * - description: Help text shown to users
 * - text: The actual text appended to prompts
 * - icon: FontAwesome icon class
 * - category: Grouping for organization
 */

export const PROMPT_HELPERS = {
    photogenic: {
        key: 'photogenic',
        label: 'Photogenic Enhancement',
        description: 'Adds professional photography terms for realistic, high-quality images',
        text: '8k high-resolution, photogenic, ultra-realism, distinct details',
        icon: 'fas fa-camera',
        category: 'quality'
    },

    artistic: {
        key: 'artistic',
        label: 'Artistic Enhancement',
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
        category: 'portrait'
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
export const getPromptHelperKeys = () => Object.keys(PROMPT_HELPERS);

/**
 * Get prompt helpers by category
 * @param {string} category - Category to filter by
 * @returns {Object} Filtered prompt helpers
 */
export const getPromptHelpersByCategory = category => Object.fromEntries(
    Object.entries(PROMPT_HELPERS).filter(([, helper]) => helper.category === category)
);

/**
 * Get all available categories
 * @returns {string[]} Array of unique categories
 */
export const getPromptHelperCategories = () => [...new Set(Object.values(PROMPT_HELPERS).map(helper => helper.category))];

/**
 * Validate if a helper key exists
 * @param {string} key - Helper key to validate
 * @returns {boolean} True if helper exists
 */
export const isValidPromptHelper = key => key in PROMPT_HELPERS;
