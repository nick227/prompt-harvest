// DEPRECATED: This file is kept for backward compatibility
// All cost calculations now use SimplifiedCreditService.getCreditCost()
// This file will be removed in a future version

import SimplifiedCreditService from '../services/credit/SimplifiedCreditService.js';

// Legacy USD-based cost matrix (DEPRECATED)
export const COST_MATRIX = {
    // High-quality providers (more expensive)
    dalle: 0.02,        // $0.02 per generation
    flux: 0.015,        // $0.015 per generation
    juggernaut: 0.012,  // $0.012 per generation
    juggernautReborn: 0.012,

    // Mid-tier providers
    redshift: 0.008,    // $0.008 per generation
    absolute: 0.008,
    realisticvision: 0.008,
    icbinp: 0.008,
    icbinp_seco: 0.008,
    hasdx: 0.008,

    // Standard providers
    dreamshaper: 0.005, // $0.005 per generation
    nightmareshaper: 0.005,
    openjourney: 0.005,
    analogmadness: 0.005,
    portraitplus: 0.005,

    // Budget providers
    tshirt: 0.003,      // $0.003 per generation
    abyssorange: 0.003,
    cyber: 0.003,
    disco: 0.003,
    synthwave: 0.003,
    lowpoly: 0.003,
    bluepencil: 0.003,
    ink: 0.003
};

// Default cost for unknown providers (DEPRECATED)
export const DEFAULT_COST = 0.005;

// DEPRECATED: Use SimplifiedCreditService.getCreditCost() instead
export const calculateCost = provider => {
    console.warn('⚠️ DEPRECATED: calculateCost() is deprecated. Use SimplifiedCreditService.getCreditCost() instead.');
    return SimplifiedCreditService.getCreditCost(provider);
};

// DEPRECATED: Use SimplifiedCreditService.getCreditCost() instead
export const calculateBatchCost = providers => {
    console.warn('⚠️ DEPRECATED: calculateBatchCost() is deprecated. Use SimplifiedCreditService.getCreditCost() instead.');
    if (!Array.isArray(providers) || providers.length === 0) {
        return 0;
    }
    return providers.reduce((total, provider) => total + SimplifiedCreditService.getCreditCost(provider), 0);
};

// User cost calculation for a time period
export const calculateUserCosts = (images, startDate = null, endDate = null) => {
    let filteredImages = images;

    if (startDate) {
        filteredImages = filteredImages.filter(img => img.createdAt >= startDate);
    }

    if (endDate) {
        filteredImages = filteredImages.filter(img => img.createdAt <= endDate);
    }

    const costs = filteredImages.reduce((acc, image) => {
        const cost = SimplifiedCreditService.getCreditCost(image.provider);

        acc.totalCost += cost;
        acc.providerBreakdown[image.provider] = (acc.providerBreakdown[image.provider] || 0) + cost;
        acc.generationCount++;

        return acc;
    }, {
        totalCost: 0,
        providerBreakdown: {},
        generationCount: 0
    });

    return costs;
};

// Format cost for display
export const formatCost = (cost, currency = 'USD') => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
}).format(cost);

// Get cost summary for multiple providers
export const getCostSummary = providers => {
    const totalCost = calculateBatchCost(providers);
    const breakdown = providers.map(provider => ({
        provider,
        cost: SimplifiedCreditService.getCreditCost(provider)
    }));

    return {
        totalCost,
        formattedCost: formatCost(totalCost),
        breakdown,
        providerCount: providers.length
    };
};
