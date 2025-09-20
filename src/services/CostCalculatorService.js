/**
 * Cost Calculator Service
 * Provides detailed cost analysis for admin pricing decisions
 */

import { SimplifiedCreditService } from './credit/SimplifiedCreditService.js';
import databaseClient from '../database/PrismaClient.js';

class CostCalculatorService {
    constructor() {
        this.creditService = new SimplifiedCreditService();
        this.prisma = databaseClient.getClient();
    }

    /**
     * Calculate cost breakdown for all providers
     * @returns {Object} Cost analysis by provider
     */
    async getProviderCostBreakdown() {
        try {
            // Get all active models from database
            const models = await this.prisma.model.findMany({
                where: { isActive: true },
                orderBy: [
                    { provider: 'asc' },
                    { name: 'asc' }
                ]
            });

            // Group models by provider and calculate costs
            const providersMap = models.reduce((acc, model) => {
                if (!acc[model.provider]) {
                    acc[model.provider] = {
                        id: model.provider,
                        name: model.provider.charAt(0).toUpperCase() + model.provider.slice(1),
                        category: this.getProviderCategory(model.provider),
                        models: []
                    };
                }

                const baseCredits = this.creditService.getCreditCost(model.name);
                const baseUsdCost = this.creditsToUsd(baseCredits);

                acc[model.provider].models.push({
                    id: model.id,
                    name: model.name,
                    displayName: model.displayName,
                    baseCredits,
                    baseUsdCost,
                    withMultiplier: this.creditService.getCreditCost(model.name, true),
                    withMixup: this.creditService.getCreditCost(model.name, false, true),
                    withMashup: this.creditService.getCreditCost(model.name, false, false, true),
                    withAllOptions: this.creditService.getCreditCost(model.name, true, true, true)
                });

                return acc;
            }, {});

            // Convert to array and calculate provider-level costs
            return Object.values(providersMap).map(provider => {
                const totalCredits = provider.models.reduce((sum, model) => sum + model.baseCredits, 0);
                const avgCredits = totalCredits / provider.models.length;
                const avgUsdCost = this.creditsToUsd(avgCredits);

                return {
                    ...provider,
                    baseCredits: avgCredits,
                    baseUsdCost: avgUsdCost,
                    modelCount: provider.models.length,
                    withMultiplier: avgCredits * 1.5, // Approximate multiplier cost
                    withMixup: avgCredits * 1.2, // Approximate mixup cost
                    withMashup: avgCredits * 1.3, // Approximate mashup cost
                    withAllOptions: avgCredits * 2.0 // Approximate all options cost
                };
            });

        } catch (error) {
            console.error('❌ COST-CALCULATOR: Error getting provider breakdown:', error);
            // Fallback to empty array if database fails
            return [];
        }
    }

    /**
     * Get provider category based on provider name
     * @param {string} provider - Provider name
     * @returns {string} Category
     */
    getProviderCategory(provider) {
        const categories = {
            'openai': 'Premium',
            'dezgo': 'Standard'
        };
        return categories[provider] || 'Standard';
    }

    /**
     * Calculate cost analysis for different scenarios
     * @param {number} markupPercentage - Markup percentage to apply
     * @returns {Object} Comprehensive cost analysis
     */
    async getCostAnalysis(markupPercentage = 20) {
        const providerBreakdown = await this.getProviderCostBreakdown();

        // Group by category
        const byCategory = providerBreakdown.reduce((acc, provider) => {
            if (!acc[provider.category]) {
                acc[provider.category] = [];
            }
            acc[provider.category].push(provider);
            return acc;
        }, {});

        // Calculate averages
        const averages = Object.keys(byCategory).map(category => {
            const providers = byCategory[category];
            const avgCredits = providers.reduce((sum, p) => sum + p.baseCredits, 0) / providers.length;
            const avgUsdCost = providers.reduce((sum, p) => sum + p.baseUsdCost, 0) / providers.length;

            return {
                category,
                providerCount: providers.length,
                averageCredits: Math.round(avgCredits * 100) / 100,
                averageUsdCost: Math.round(avgUsdCost * 10000) / 10000,
                averageWithMarkup: Math.round(avgUsdCost * (1 + markupPercentage / 100) * 10000) / 10000
            };
        });

        // Calculate cost per credit ranges
        const allCredits = providerBreakdown.map(p => p.baseCredits);
        const allUsdCosts = providerBreakdown.map(p => p.baseUsdCost);

        return {
            providerBreakdown,
            byCategory,
            averages,
            costPerCreditRange: {
                min: Math.min(...allUsdCosts.map(cost => cost / allCredits[allUsdCosts.indexOf(cost)])),
                max: Math.max(...allUsdCosts.map(cost => cost / allCredits[allUsdCosts.indexOf(cost)]))
            },
            markupPercentage,
            totalProviders: providerBreakdown.length,
            creditRange: {
                min: Math.min(...allCredits),
                max: Math.max(...allCredits)
            },
            usdCostRange: {
                min: Math.min(...allUsdCosts),
                max: Math.max(...allUsdCosts)
            }
        };
    }

    /**
     * Calculate package profitability analysis
     * @param {Array} packages - Array of package objects
     * @param {number} markupPercentage - Markup percentage
     * @returns {Object} Package profitability analysis
     */
    getPackageProfitabilityAnalysis(packages, markupPercentage = 20) {
        const costAnalysis = this.getCostAnalysis(markupPercentage);
        const avgCostPerCredit = costAnalysis.costPerCreditRange.min +
            (costAnalysis.costPerCreditRange.max - costAnalysis.costPerCreditRange.min) / 2;

        return packages.map(pkg => {
            const pricePerCredit = (pkg.price / 100) / pkg.credits; // Convert cents to dollars
            const costPerCredit = avgCostPerCredit;
            const profitPerCredit = pricePerCredit - costPerCredit;
            const profitMargin = (profitPerCredit / pricePerCredit) * 100;
            const totalProfit = profitPerCredit * pkg.credits;

            return {
                ...pkg,
                pricePerCredit: Math.round(pricePerCredit * 10000) / 10000,
                costPerCredit: Math.round(costPerCredit * 10000) / 10000,
                profitPerCredit: Math.round(profitPerCredit * 10000) / 10000,
                profitMargin: Math.round(profitMargin * 100) / 100,
                totalProfit: Math.round(totalProfit * 100) / 100,
                breakEvenGenerations: Math.ceil(pkg.price / 100 / profitPerCredit)
            };
        });
    }

    /**
     * Get cost recommendations based on current pricing
     * @param {Object} currentPricing - Current pricing configuration
     * @returns {Object} Cost recommendations
     */
    getCostRecommendations(currentPricing) {
        const costAnalysis = this.getCostAnalysis(currentPricing.markup_percentage || 20);

        const recommendations = {
            providerCosts: {
                current: {
                    openai: currentPricing.openai_cost || 0.02,
                    stability: currentPricing.stability_cost || 0.015,
                    midjourney: currentPricing.midjourney_cost || 0.025
                },
                suggested: {
                    openai: costAnalysis.averages.find(a => a.category === 'Premium')?.averageUsdCost || 0.02,
                    stability: costAnalysis.averages.find(a => a.category === 'Mid-tier')?.averageUsdCost || 0.015,
                    midjourney: costAnalysis.averages.find(a => a.category === 'Premium')?.averageUsdCost || 0.025
                }
            },
            markupAnalysis: {
                current: currentPricing.markup_percentage || 20,
                suggested: {
                    minimum: 15, // Minimum viable markup
                    recommended: 25, // Recommended markup for sustainability
                    premium: 35 // Premium markup for high-end positioning
                }
            },
            packageRecommendations: {
                costPerCreditTarget: costAnalysis.costPerCreditRange.max * 1.5, // 50% markup on highest cost
                minimumPackageSize: 10,
                optimalPackageSize: 50,
                maximumPackageSize: 500
            }
        };

        return recommendations;
    }

    /**
     * Convert credits to USD cost
     * @param {number} credits - Number of credits
     * @returns {number} USD cost
     */
    creditsToUsd(credits) {
        // Base conversion: 1 credit = $0.005
        // This should match the SimplifiedCreditService cost matrix
        return credits * 0.005;
    }

    /**
     * Convert USD cost to credits
     * @param {number} usdCost - USD cost
     * @returns {number} Number of credits
     */
    usdToCredits(usdCost) {
        return usdCost / 0.005;
    }

    /**
     * Calculate cost for specific generation scenario
     * @param {string} provider - Provider ID
     * @param {boolean} multiplier - Has multiplier
     * @param {boolean} mixup - Has mixup
     * @param {boolean} mashup - Has mashup
     * @returns {Object} Cost breakdown
     */
    calculateGenerationCost(provider, multiplier = false, mixup = false, mashup = false) {
        const credits = this.creditService.getCreditCost(provider, multiplier, mixup, mashup);
        const usdCost = this.creditsToUsd(credits);

        return {
            provider,
            credits,
            usdCost: Math.round(usdCost * 10000) / 10000,
            options: {
                multiplier,
                mixup,
                mashup
            },
            breakdown: {
                baseCredits: this.creditService.getCreditCost(provider),
                multiplierCost: multiplier ? credits - this.creditService.getCreditCost(provider) : 0,
                mixupCost: mixup ? credits - this.creditService.getCreditCost(provider, multiplier) : 0,
                mashupCost: mashup ? credits - this.creditService.getCreditCost(provider, multiplier, mixup) : 0
            }
        };
    }
}

export default CostCalculatorService;
