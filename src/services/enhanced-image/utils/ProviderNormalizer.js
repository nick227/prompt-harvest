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
/**
 * OPTIMIZED: Single-pass provider normalization
 * Reduces 4 iterations (filter → map → filter → Set) to 1 iteration
 */
export const normalizeProviders = providers => {
    if (!Array.isArray(providers)) {
        return [];
    }

    // Single-pass: validate, normalize, and deduplicate in one iteration
    const seen = new Set();
    const result = [];

    for (const p of providers) {
        if (typeof p !== 'string') { continue; }

        const normalized = p.trim().toLowerCase();

        if (normalized.length === 0 || seen.has(normalized)) { continue; }

        seen.add(normalized);
        result.push(normalized);
    }

    return result;
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

