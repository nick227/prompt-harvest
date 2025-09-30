/**
 * Provider Registry and Utilities
 *
 * Manages provider routing and prevents duplicates
 */

/**
 * Provider type mapping - maps database providers to ImageGenerator types
 */
export const PROVIDER_TYPE_MAP = {
    openai: 'openai',
    dezgo: 'dezgo',
    google: 'google',
    stability: 'dezgo', // Map stability to dezgo since we don't have stability handler
    stabilityAi: 'dezgo' // Alternative stability mapping
};

/**
 * Get the correct provider type for ImageGenerator
 */
export function getProviderType(databaseProvider) {
    return PROVIDER_TYPE_MAP[databaseProvider] || databaseProvider;
}

/**
 * Remove duplicates from provider array
 */
export function deduplicateProviders(providers) {
    if (!Array.isArray(providers)) {
        return [];
    }

    return Array.from(new Set(providers));
}

/**
 * Validate provider list
 */
export function validateProviders(providers) {
    if (!Array.isArray(providers)) {
        throw new Error('Providers must be an array');
    }

    const deduplicated = deduplicateProviders(providers);

    if (deduplicated.length === 0) {
        throw new Error('At least one provider must be specified');
    }

    return deduplicated;
}

/**
 * Create safe copy for logging
 */
export function createProviderLogCopy(providers) {
    const safeCopy = deduplicateProviders(providers);

    return {
        count: safeCopy.length,
        providers: safeCopy,
        hasDuplicates: Array.isArray(providers) && providers.length !== safeCopy.length
    };
}
