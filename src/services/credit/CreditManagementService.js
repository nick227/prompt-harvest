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
     * Calculate total cost for multiple providers
     */
    async calculateTotalCost(providers) {
        let totalCost = 0;

        for (const provider of providers) {
            const cost = await this.getModelCost(provider);

            totalCost += cost;
        }

        return totalCost;
    }

    /**
     * Deduct credits for image generation
     */
    async deductCreditsForGeneration(userId, providers, prompt, requestId) {
        const totalCost = await this.calculateTotalCost(providers);

        if (totalCost <= 0) {
            console.log('💰 CREDIT SERVICE: No cost to deduct');

            return { success: true, cost: 0 };
        }

        console.log(`💰 CREDIT SERVICE: Deducting ${totalCost} credits for user ${userId} (request: ${requestId})`);

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
     * Refund credits on generation failure
     */
    async refundCreditsOnFailure(userId, providers, error, requestId) {
        if (!userId) {
            console.log('💰 CREDIT SERVICE: No userId provided for refund');

            return { success: true, refunded: 0 };
        }

        const totalCost = await this.calculateTotalCost(providers);

        if (totalCost <= 0) {
            console.log('💰 CREDIT SERVICE: No cost to refund');

            return { success: true, refunded: 0 };
        }

        console.log(`💰 CREDIT SERVICE: Refunding ${totalCost} credits for failed generation (request: ${requestId})`);

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
