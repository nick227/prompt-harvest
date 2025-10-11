/**
 * Provider Normalization Utilities
 * Pure functions for normalizing and validating provider names
 */

/**
 * Normalize provider names
 * - Trims whitespace
 * - Converts to lowercase
 * - Removes duplicates
 * - Filters empty strings
 *
 * @param {Array<string>} providers - Array of provider names
 * @returns {Array<string>} Normalized unique provider names
 *
 * @example
 * normalizeProviders([" Flux-Pro ", "flux-pro", "FLUX-DEV"])
 * // Returns: ["flux-pro", "flux-dev"]
 */
export const normalizeProviders = providers => {
    if (!Array.isArray(providers)) {
        return [];
    }

    const normalized = providers
        .filter(p => typeof p === 'string')
        .map(p => p.trim().toLowerCase())
        .filter(p => p.length > 0);

    return [...new Set(normalized)];
};

/**
 * Validate provider array structure
 * @param {*} providers - Value to validate
 * @returns {boolean} True if valid array of non-empty strings
 */
export const isValidProviderArray = providers => {
    if (!Array.isArray(providers) || providers.length === 0) {
        return false;
    }

    return providers.every(p => typeof p === 'string' && p.trim().length > 0);
};

