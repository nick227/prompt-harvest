import SimplifiedCreditService from './SimplifiedCreditService.js';
import databaseClient from '../../database/PrismaClient.js';

export class CreditManagementService {
    constructor() {
        this.prisma = databaseClient.getClient();
    }

    /**
     * Get model cost for a provider
     */
    async getModelCost(providerName) {
        const models = await this.prisma.model.findMany({
            where: {
                provider: providerName,
                isActive: true
            },
            select: {
                costPerImage: true,
                name: true
            }
        });

        if (models.length > 0) {
            // Return the minimum cost among active models for this provider
            return Math.min(...models.map(m => m.costPerImage));
        }

        // Fallback to default cost if no models found
        return 1.0;
    }

    /**
     * Calculate total cost for multiple providers (optimized)
     */
    async calculateTotalCost(providers) {
        if (!providers || providers.length === 0) {
            return 0;
        }

        // Get all model costs in a single query
        const models = await this.prisma.model.findMany({
            where: {
                provider: {
                    in: providers
                },
                isActive: true
            },
            select: {
                provider: true,
                costPerImage: true
            }
        });

        // Group by provider and get minimum cost for each
        const providerCosts = {};

        models.forEach(model => {
            if (!providerCosts[model.provider] || model.costPerImage < providerCosts[model.provider]) {
                providerCosts[model.provider] = model.costPerImage;
            }
        });

        // Calculate total cost
        let totalCost = 0;

        for (const provider of providers) {
            const cost = providerCosts[provider] || 1.0; // Default fallback

            totalCost += cost;
        }

        return totalCost;
    }

    /**
     * Validate and deduct credits before generation
     */
    async validateAndDeductCredits(userId, providers, prompt, requestId) {
        const totalCost = await this.calculateTotalCost(providers);

        if (totalCost <= 0) {

            return { success: true, cost: 0 };
        }

        // Check if user has sufficient credits
        const hasCredits = await SimplifiedCreditService.hasCredits(userId, totalCost);

        if (!hasCredits) {
            const currentBalance = await SimplifiedCreditService.getBalance(userId);
            const error = `Insufficient credits. Required: ${totalCost}, Available: ${currentBalance}`;

            console.error(`❌ CREDIT SERVICE: ${error}`);

            return { success: false, error, cost: totalCost };
        }


        const result = await SimplifiedCreditService.debitCredits(
            userId,
            totalCost,
            `Generated image with prompt: "${prompt.substring(0, 50)}..."`,
            {
                requestId,
                providers,
                prompt: prompt.substring(0, 100),
                timestamp: new Date().toISOString()
            }
        );

        return { success: result, cost: totalCost };
    }

    /**
     * Refund credits for failed generation
     */
    async refundCreditsForGeneration(userId, amount, requestId) {
        if (amount <= 0) {

            return { success: true };
        }


        const result = await SimplifiedCreditService.addCredits(
            userId,
            amount,
            'refund',
            `Refund for failed generation (request: ${requestId})`,
            {
                requestId,
                timestamp: new Date().toISOString()
            }
        );

        return { success: result };
    }

    /**
     * Refund credits on generation failure
     */
    async refundCreditsOnFailure(userId, providers, error, requestId) {
        if (!userId) {

            return { success: true, refunded: 0 };
        }

        const totalCost = await this.calculateTotalCost(providers);

        if (totalCost <= 0) {

            return { success: true, refunded: 0 };
        }


        const result = await SimplifiedCreditService.addCredits(
            userId,
            totalCost,
            'generation_refund',
            `Refund for failed generation: ${error.message}`,
            {
                requestId,
                providers,
                error: error.message,
                timestamp: new Date().toISOString(),
                refundType: 'generation_failure'
            }
        );

        return { success: result, refunded: totalCost };
    }
}
