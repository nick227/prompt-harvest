/**
 * Model Feature Detection
 *
 * Utilities for detecting model types and computing optimal parameters
 */

/**
 * Model feature detection helpers (null-safe, case-insensitive)
 */
export const isLightningModel = (url, model) => (url && url.toLowerCase().includes('text2image_sdxl_lightning')) || (model && model.toLowerCase().includes('lightning'));

export const isRedshiftModel = model => model && model.toLowerCase().includes('redshift');

export const isSDXLModel = url => url && url.toLowerCase().includes('text2image_sdxl');

export const isFluxModel = url => url && url.toLowerCase().includes('text2image_flux');

/**
 * Compute optimal guidance for Dezgo model
 * @param {string} url - API endpoint URL
 * @param {string} model - Model name
 * @param {number} requestedGuidance - User-requested guidance (optional)
 * @returns {number} Clamped guidance value
 */
export const computeDezgoGuidance = (url, model, requestedGuidance) => {
    if (isLightningModel(url, model)) {
        return 1; // Lightning models need minimal guidance
    }

    if (isRedshiftModel(model)) {
        return Math.min(Math.max(requestedGuidance ?? 5, 1), 15);
    }

    if (isSDXLModel(url)) {
        return Math.min(Math.max(requestedGuidance ?? 7.5, 1), 20);
    }

    return Math.min(Math.max(requestedGuidance ?? 7.5, 1), 20);
};

/**
 * Generate a random 9-digit number for Dezgo seeds
 * @returns {number} Random 9-digit number (100000000 to 999999999)
 */
export const generateRandomNineDigitNumber = () => Math.floor(Math.random() * 900000000) + 100000000;

export default {
    isLightningModel,
    isRedshiftModel,
    isSDXLModel,
    isFluxModel,
    computeDezgoGuidance,
    generateRandomNineDigitNumber
};

