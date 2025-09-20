/**
 * Admin Pricing Calculator
 * Intelligent pricing calculator for package management using unified interface
 */

class AdminPricingCalculator {
    constructor() {
        this.modelInterface = null;
        this.costCache = new Map();
        this.lastCacheUpdate = 0;
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        
        // Initialize the unified interface
        this.initModelInterface();
    }

    /**
     * Initialize the unified model interface
     */
    async initModelInterface() {
        try {
            // Import the unified interface
            const { default: modelInterface } = await import('/js/services/ModelInterface.js');
            this.modelInterface = modelInterface;
            console.log('✅ Admin Pricing Calculator: Unified interface initialized');
        } catch (error) {
            console.error('❌ Admin Pricing Calculator: Failed to initialize unified interface:', error);
            // Fallback to static costs if interface fails
            this.loadStaticCosts();
        }
    }

    /**
     * Load static costs as fallback
     */
    loadStaticCosts() {
        this.staticCosts = {
            flux: 0.0228,
            juggernaut: 0.0075,
            dreamshaper: 0.0075,
            absolute: 0.0181,
            realisticvision: 0.0181,
            dalle: 0.0200,
            dalle3: 0.0200,
            nanoBanana: 0.0171 // Estimated Google cost
        };
        console.log('⚠️ Admin Pricing Calculator: Using static cost fallback');
    }

    /**
     * Get model cost from unified interface or fallback
     * @param {string} modelName - Model name
     * @returns {Promise<number>} Cost in USD
     */
    async getModelCost(modelName) {
        // Check cache first
        if (this.costCache.has(modelName) && !this.shouldRefreshCache()) {
            return this.costCache.get(modelName);
        }

        try {
            if (this.modelInterface) {
                // Get cost from unified interface
                const costPerImage = await this.modelInterface.getCreditCost(modelName);
                const usdCost = costPerImage * 0.0228; // Flux baseline conversion
                this.costCache.set(modelName, usdCost);
                return usdCost;
            } else {
                // Use static fallback
                return this.staticCosts[modelName] || 0.0228; // Default to Flux cost
            }
        } catch (error) {
            console.warn(`⚠️ Admin Pricing Calculator: Failed to get cost for ${modelName}, using fallback`);
            return this.staticCosts[modelName] || 0.0228;
        }
    }

    /**
     * Get all model costs
     * @returns {Promise<Object>} Object with model costs
     */
    async getAllModelCosts() {
        const costs = {};
        
        try {
            if (this.modelInterface) {
                const models = await this.modelInterface.getAllModels();
                for (const model of models) {
                    costs[model.name] = await this.getModelCost(model.name);
                }
            } else {
                // Use static costs
                Object.assign(costs, this.staticCosts);
            }
        } catch (error) {
            console.error('❌ Admin Pricing Calculator: Failed to get all model costs:', error);
            Object.assign(costs, this.staticCosts || {});
        }

        return costs;
    }

    /**
     * Calculate package pricing based on profit margin
     * @param {number} profitMargin - Desired profit margin (0.2 = 20%)
     * @returns {Promise<Object>} Package pricing
     */
    async calculatePackagePricing(profitMargin = 0.2) {
        const costs = await this.getAllModelCosts();
        const packages = {};

        // Define package sizes
        const packageSizes = [10, 25, 50, 100, 250, 500, 1000];

        for (const size of packageSizes) {
            const baseCost = costs.flux * size; // Use Flux as baseline
            const totalCost = baseCost * (1 + profitMargin);
            const pricePerCredit = totalCost / size;

            packages[size] = {
                size,
                baseCost: Math.round(baseCost * 100) / 100,
                totalCost: Math.round(totalCost * 100) / 100,
                pricePerCredit: Math.round(pricePerCredit * 10000) / 10000,
                profitMargin: Math.round(profitMargin * 100) / 100
            };
        }

        return packages;
    }

    /**
     * Check if cache should be refreshed
     * @returns {boolean} True if cache should be refreshed
     */
    shouldRefreshCache() {
        return Date.now() - this.lastCacheUpdate > this.cacheTimeout;
    }

    /**
     * Force refresh cache
     */
    async refreshCache() {
        this.costCache.clear();
        this.lastCacheUpdate = Date.now();
        await this.getAllModelCosts(); // Pre-populate cache
    }

    /**
     * Get cost breakdown for admin display
     * @returns {Promise<Object>} Cost breakdown
     */
    async getCostBreakdown() {
        const costs = await this.getAllModelCosts();
        const breakdown = {};

        for (const [modelName, cost] of Object.entries(costs)) {
            breakdown[modelName] = {
                usd: Math.round(cost * 10000) / 10000,
                credits: Math.round((cost / 0.0228) * 100) / 100, // Convert to credits
                category: this.getModelCategory(modelName)
            };
        }

        return breakdown;
    }

    /**
     * Get model category for grouping
     * @param {string} modelName - Model name
     * @returns {string} Category name
     */
    getModelCategory(modelName) {
        if (modelName.includes('dalle')) return 'OpenAI';
        if (modelName.includes('nano')) return 'Google';
        if (['flux'].includes(modelName)) return 'Flux';
        if (['juggernaut', 'dreamshaper', 'bluepencil', 'tshirt'].includes(modelName)) return 'SDXL';
        return 'SD 1/2';
    }
}

// Export for use in admin interface
window.AdminPricingCalculator = AdminPricingCalculator;