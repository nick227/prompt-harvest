/**
 * Admin Cost Analysis Controller
 * Provides cost analysis and recommendations for admin pricing decisions
 */

import CostCalculatorService from '../../services/CostCalculatorService.js';
import databaseClient from '../../database/PrismaClient.js';
import fs from 'fs/promises';
import path from 'path';

const _prisma = databaseClient.getClient();

class CostAnalysisController {
    /**
     * Get comprehensive cost analysis
     * GET /api/admin/cost-analysis
     */
    static async getCostAnalysis(req, res) {
        try {
            const { markup_percentage: markupPercentage } = req.query;
            const costCalculator = new CostCalculatorService();

            const analysis = await costCalculator.getCostAnalysis(
                markupPercentage ? parseFloat(markupPercentage) : 20
            );

            console.log('✅ ADMIN-COST-ANALYSIS: Retrieved cost analysis');

            res.json({
                success: true,
                data: analysis
            });

        } catch (error) {
            console.error('❌ ADMIN-COST-ANALYSIS: Get cost analysis failed:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get cost analysis',
                message: error.message
            });
        }
    }

    /**
     * Get cost recommendations based on current pricing
     * GET /api/admin/cost-analysis/recommendations
     */
    static async getCostRecommendations(req, res) {
        try {
            // Load current pricing configuration
            const currentPricing = await CostAnalysisController.loadPricingConfig();
            const costCalculator = new CostCalculatorService();

            const recommendations = costCalculator.getCostRecommendations(currentPricing);

            console.log('✅ ADMIN-COST-ANALYSIS: Retrieved cost recommendations');

            res.json({
                success: true,
                data: recommendations
            });

        } catch (error) {
            console.error('❌ ADMIN-COST-ANALYSIS: Get recommendations failed:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get cost recommendations',
                message: error.message
            });
        }
    }

    /**
     * Get package profitability analysis
     * GET /api/admin/cost-analysis/packages
     */
    static async getPackageProfitability(req, res) {
        try {
            const { markup_percentage: markupPercentage } = req.query;
            const costCalculator = new CostCalculatorService();

            // Load current packages
            const packages = await CostAnalysisController.loadPackagesConfig();

            const analysis = costCalculator.getPackageProfitabilityAnalysis(
                packages,
                markupPercentage ? parseFloat(markupPercentage) : 20
            );

            console.log('✅ ADMIN-COST-ANALYSIS: Retrieved package profitability analysis');

            res.json({
                success: true,
                data: analysis
            });

        } catch (error) {
            console.error('❌ ADMIN-COST-ANALYSIS: Get package profitability failed:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get package profitability analysis',
                message: error.message
            });
        }
    }

    /**
     * Calculate cost for specific generation scenario
     * POST /api/admin/cost-analysis/calculate
     */
    static async calculateGenerationCost(req, res) {
        try {
            const { provider, multiplier = false, mixup = false, mashup = false } = req.body;

            if (!provider) {
                return res.status(400).json({
                    success: false,
                    error: 'Provider is required',
                    message: 'Please specify a provider for cost calculation'
                });
            }

            const costCalculator = new CostCalculatorService();
            const cost = costCalculator.calculateGenerationCost(provider, multiplier, mixup, mashup);

            console.log(`✅ ADMIN-COST-ANALYSIS: Calculated cost for ${provider}`);

            res.json({
                success: true,
                data: cost
            });

        } catch (error) {
            console.error('❌ ADMIN-COST-ANALYSIS: Calculate generation cost failed:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to calculate generation cost',
                message: error.message
            });
        }
    }

    /**
     * Get provider cost breakdown
     * GET /api/admin/cost-analysis/providers
     */
    static async getProviderCostBreakdown(req, res) {
        try {
            const costCalculator = new CostCalculatorService();
            const breakdown = await costCalculator.getProviderCostBreakdown();

            console.log('✅ ADMIN-COST-ANALYSIS: Retrieved provider cost breakdown');

            res.json({
                success: true,
                data: breakdown
            });

        } catch (error) {
            console.error('❌ ADMIN-COST-ANALYSIS: Get provider breakdown failed:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get provider cost breakdown',
                message: error.message
            });
        }
    }

    // ===== UTILITY METHODS =====

    /**
     * Load pricing configuration
     */
    static async loadPricingConfig() {
        try {
            // This should match the PricingController's loadPricingConfig method
            // For now, return default pricing
            return {
                openai_cost: 0.02,
                stability_cost: 0.015,
                midjourney_cost: 0.025,
                markup_percentage: 20
            };
        } catch (error) {
            console.warn('⚠️ ADMIN-COST-ANALYSIS: Could not load pricing config, using defaults');

            return {
                openai_cost: 0.02,
                stability_cost: 0.015,
                midjourney_cost: 0.025,
                markup_percentage: 20
            };
        }
    }

    /**
     * Load packages configuration
     */
    static async loadPackagesConfig() {
        try {
            const packagesPath = path.join(process.cwd(), 'data', 'packages.json');
            const data = await fs.readFile(packagesPath, 'utf8');

            return JSON.parse(data);
        } catch (error) {
            // Return default packages if file doesn't exist
            return [
                {
                    id: 'starter',
                    name: 'Starter Pack',
                    credits: 10,
                    price: 999, // $9.99 in cents
                    description: 'Perfect for trying out AI image generation',
                    popular: false
                },
                {
                    id: 'pro',
                    name: 'Pro Pack',
                    credits: 50,
                    price: 3999, // $39.99 in cents
                    description: 'Great for regular users',
                    popular: true
                },
                {
                    id: 'enterprise',
                    name: 'Enterprise Pack',
                    credits: 200,
                    price: 14999, // $149.99 in cents
                    description: 'For power users and businesses',
                    popular: false
                }
            ];
        }
    }
}

export default CostAnalysisController;
