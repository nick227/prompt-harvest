/**
 * Dezgo Cost Calculator
 * Calculates actual Dezgo API costs based on pricing.md
 */

class DezgoCostCalculator {
    constructor() {
        // Pricing from pricing.md - Dezgo API costs
        this.pricing = {
            // Flux models (1024x1024, 30 steps)
            flux: {
                megapixels: 1.05, // 1024x1024 = 1,048,576 pixels = 1.05 megapixels
                steps: 30,
                costPerMegapixelPerStep: 0.000725, // >= 4 steps
                baseCost: 0, // No fixed cost for >= 4 steps
                calculatedCost: 0.000725 * 1.05 * 30 // = $0.0228
            },

            // Stable Diffusion XL models (1024x1024, 20 steps)
            sdxl: {
                megapixels: 1.05,
                steps: 20,
                costPerStep: 0.0075 / 20, // From pricing table: $0.0075 for 20 steps
                calculatedCost: 0.0075
            },

            // Stable Diffusion 1/2 models
            sd1024: {
                resolution: '1024x1024',
                costPerImage: 0.0181
            },
            sd512: {
                resolution: '512x512',
                costPerImage: 0.0019
            },

            // DALL-E 3 (OpenAI pricing)
            dalle3: {
                costPerImage: 0.02 // Approximate OpenAI cost
            },

            // Google Imagen 3 (Google Cloud pricing)
            nanoBanana: {
                costPerImage: 0.0171 // Google Imagen 3 cost
            }
        };
    }

    /**
     * Calculate actual Dezgo cost for a specific model and configuration
     */
    calculateDezgoCost(provider, resolution = '1024x1024', steps = null) {
        const providerLower = provider.toLowerCase();

        // Determine model category and calculate cost
        if (providerLower.includes('flux') || providerLower === 'flux') {
            return this.calculateFluxCost(resolution, steps || 30);
        } else if (this.isSDXLModel(providerLower)) {
            return this.calculateSDXLCost(resolution, steps || 20);
        } else if (this.isSDModel(providerLower)) {
            return this.calculateSDCost(resolution);
        } else if (providerLower.includes('dalle')) {
            return this.pricing.dalle3.costPerImage;
        } else {
            // Default to SD cost for unknown models
            return this.calculateSDCost(resolution);
        }
    }

    /**
     * Calculate Flux model cost
     */
    calculateFluxCost(resolution = '1024x1024', steps = 30) {
        const megapixels = this.getMegapixels(resolution);

        if (steps >= 4) {
            return this.pricing.flux.costPerMegapixelPerStep * megapixels * steps;
        } else {
            // < 4 steps: $0.000225 / megapixel / step + fixed $0.002
            return (0.000225 * megapixels * steps) + 0.002;
        }
    }

    /**
     * Calculate SDXL model cost
     */
    calculateSDXLCost(resolution = '1024x1024', steps = 20) {
        // SDXL pricing is based on steps, not resolution (up to 1 megapixel max)
        const megapixels = this.getMegapixels(resolution);

        if (megapixels > 1) {
            throw new Error(`SDXL resolution ${resolution} exceeds 1 megapixel limit`);
        }

        // Pricing table from pricing.md
        const stepPricing = {
            10: 0.0032,
            20: 0.0054,
            30: 0.0075,
            40: 0.0096,
            80: 0.0181,
            150: 0.0330
        };

        return stepPricing[steps] || 0.0075; // Default to 30 steps pricing
    }

    /**
     * Calculate SD 1/2 model cost
     */
    calculateSDCost(resolution = '1024x1024') {
        const resolutionPricing = {
            '320x320': 0.0019,
            '512x512': 0.0019,
            '768x768': 0.0087,
            '1024x1024': 0.0181
        };

        return resolutionPricing[resolution] || 0.0181; // Default to 1024x1024
    }

    /**
     * Get megapixels from resolution string
     */
    getMegapixels(resolution) {
        const [width, height] = resolution.split('x').map(Number);

        return (width * height) / 1000000; // Convert to megapixels
    }

    /**
     * Determine if provider is SDXL model
     */
    isSDXLModel(provider) {
        const sdxlModels = [
            'juggernaut', 'dreamshaper', 'bluepencil', 'tshirt', 'dreamshaperlighting'
        ];

        return sdxlModels.some(model => provider.includes(model));
    }

    /**
     * Determine if provider is SD 1/2 model
     */
    isSDModel(provider) {
        const sdModels = [
            'absolute', 'realisticvision', 'icbinp', 'hasdx', 'redshift',
            'analogmadness', 'portraitplus', 'nightmareshaper', 'openjourney',
            'abyssorange', 'cyber', 'disco', 'synthwave', 'lowpoly', 'ink'
        ];

        return sdModels.some(model => provider.includes(model));
    }

    /**
     * Get all model costs for comparison
     */
    getAllModelCosts(resolution = '1024x1024') {
        const models = [
            'flux', 'juggernaut', 'dreamshaper', 'absolute', 'realisticvision',
            'icbinp', 'hasdx', 'redshift', 'analogmadness', 'portraitplus',
            'nightmareshaper', 'openjourney', 'abyssorange', 'cyber', 'disco',
            'synthwave', 'lowpoly', 'ink', 'tshirt', 'dalle3'
        ];

        return models.map(model => ({
            provider: model,
            cost: this.calculateDezgoCost(model, resolution),
            category: this.getModelCategory(model)
        })).sort((a, b) => a.cost - b.cost);
    }

    /**
     * Get model category
     */
    getModelCategory(provider) {
        if (provider.includes('dalle')) {
            return 'DALL-E';
        }
        if (provider === 'flux') {
            return 'Flux';
        }
        if (this.isSDXLModel(provider)) {
            return 'SDXL';
        }
        if (this.isSDModel(provider)) {
            return 'SD 1/2';
        }

        return 'Unknown';
    }

    /**
     * Calculate credit cost based on baseline (Flux 30 steps = 1 credit)
     */
    calculateCreditCost(provider, resolution = '1024x1024', steps = null) {
        const dezgoCost = this.calculateDezgoCost(provider, resolution, steps);
        const baselineCost = this.calculateFluxCost(resolution, 30); // Flux 30 steps baseline

        // Calculate credit cost as ratio to baseline
        const creditCost = dezgoCost / baselineCost;

        // Round to reasonable credit increments (0.5, 1, 1.5, 2, etc.)
        return this.roundToCreditIncrement(creditCost);
    }

    /**
     * Round credit cost to reasonable increments
     */
    roundToCreditIncrement(creditCost) {
        if (creditCost <= 0.25) {
            return 0.25;
        }
        if (creditCost <= 0.5) {
            return 0.5;
        }
        if (creditCost <= 0.75) {
            return 0.75;
        }
        if (creditCost <= 1) {
            return 1;
        }
        if (creditCost <= 1.5) {
            return 1.5;
        }
        if (creditCost <= 2) {
            return 2;
        }
        if (creditCost <= 2.5) {
            return 2.5;
        }
        if (creditCost <= 3) {
            return 3;
        }
        if (creditCost <= 4) {
            return 4;
        }

        return Math.ceil(creditCost); // Round up for very expensive models
    }
}

export default DezgoCostCalculator;
