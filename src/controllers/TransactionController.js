import { TransactionService } from '../services/TransactionService.js';

export class TransactionController {
    constructor() {
        this.transactionService = new TransactionService();
    }

    // Get user's generation statistics
    async getUserStats(req, res) {
        try {
            const userId = req.user.id;
            const { startDate, endDate } = req.query;

            // Parse and validate dates if provided
            let parsedStartDate = null;
            let parsedEndDate = null;

            if (startDate) {
                parsedStartDate = new Date(startDate);
                if (isNaN(parsedStartDate.getTime())) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid startDate format. Use ISO 8601 format (YYYY-MM-DD)'
                    });
                }
            }

            if (endDate) {
                parsedEndDate = new Date(endDate);
                if (isNaN(parsedEndDate.getTime())) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid endDate format. Use ISO 8601 format (YYYY-MM-DD)'
                    });
                }
            }

            const stats = await this.transactionService.getUserStats(
                userId,
                parsedStartDate,
                parsedEndDate
            );

            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            console.error('Error getting user stats:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get user statistics'
            });
        }
    }

    // Get provider usage breakdown
    async getProviderUsage(req, res) {
        try {
            const userId = req.user.id;
            const { startDate, endDate } = req.query;

            // Parse and validate dates if provided
            let parsedStartDate = null;
            let parsedEndDate = null;

            if (startDate) {
                parsedStartDate = new Date(startDate);
                if (isNaN(parsedStartDate.getTime())) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid startDate format. Use ISO 8601 format (YYYY-MM-DD)'
                    });
                }
            }

            if (endDate) {
                parsedEndDate = new Date(endDate);
                if (isNaN(parsedEndDate.getTime())) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid endDate format. Use ISO 8601 format (YYYY-MM-DD)'
                    });
                }
            }

            const usage = await this.transactionService.getProviderUsage(
                userId,
                parsedStartDate,
                parsedEndDate
            );

            res.json({
                success: true,
                data: usage
            });
        } catch (error) {
            console.error('Error getting provider usage:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get provider usage'
            });
        }
    }

    // Get daily usage statistics
    async getDailyUsage(req, res) {
        try {
            const userId = req.user.id;
            const { days = 30 } = req.query;

            // Validate days parameter
            const parsedDays = parseInt(days);

            if (isNaN(parsedDays) || parsedDays < 1 || parsedDays > 365) {
                return res.status(400).json({
                    success: false,
                    error: 'Days must be a number between 1 and 365'
                });
            }

            const usage = await this.transactionService.getDailyUsage(
                userId,
                parsedDays
            );

            res.json({
                success: true,
                data: usage
            });
        } catch (error) {
            console.error('Error getting daily usage:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get daily usage'
            });
        }
    }

    // Get cost estimate for a generation request
    async estimateCost(req, res) {
        try {
            const { providers } = req.body;

            if (!providers || !Array.isArray(providers)) {
                return res.status(400).json({
                    success: false,
                    error: 'Providers array is required'
                });
            }

            // Validate providers array
            if (providers.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'At least one provider must be specified'
                });
            }

            // Validate each provider is a string
            for (const provider of providers) {
                if (typeof provider !== 'string' || provider.trim().length === 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'All providers must be non-empty strings'
                    });
                }
            }

            const estimate = await this.transactionService.estimateGenerationCost(providers);

            res.json({
                success: true,
                data: estimate
            });
        } catch (error) {
            console.error('Error estimating cost:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to estimate cost'
            });
        }
    }

    // Get system-wide statistics (admin only)
    async getSystemStats(req, res) {
        try {
            const { startDate, endDate } = req.query;

            // Parse and validate dates if provided
            let parsedStartDate = null;
            let parsedEndDate = null;

            if (startDate) {
                parsedStartDate = new Date(startDate);
                if (isNaN(parsedStartDate.getTime())) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid startDate format. Use ISO 8601 format (YYYY-MM-DD)'
                    });
                }
            }

            if (endDate) {
                parsedEndDate = new Date(endDate);
                if (isNaN(parsedEndDate.getTime())) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid endDate format. Use ISO 8601 format (YYYY-MM-DD)'
                    });
                }
            }

            const stats = await this.transactionService.getSystemStats(
                parsedStartDate,
                parsedEndDate
            );

            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            console.error('Error getting system stats:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get system statistics'
            });
        }
    }

    // Get cost matrix (public endpoint)
    async getCostMatrix(req, res) {
        try {
            // Use unified credit cost system
            const costMatrix = {};
            const providers = ['dalle', 'dalle3', 'dalle2', 'flux', 'juggernaut', 'juggernautReborn',
                             'redshift', 'absolute', 'realisticvision', 'icbinp', 'icbinp_seco', 'hasdx',
                             'dreamshaper', 'nightmareshaper', 'openjourney', 'analogmadness', 'portraitplus',
                             'tshirt', 'abyssorange', 'cyber', 'disco', 'synthwave', 'lowpoly', 'bluepencil', 'ink',
                             'stability', 'midjourney'];

            // Build cost matrix from SimplifiedCreditService
            const SimplifiedCreditService = (await import('../services/credit/SimplifiedCreditService.js')).default;
            providers.forEach(provider => {
                costMatrix[provider] = SimplifiedCreditService.getCreditCost(provider);
            });

            const DEFAULT_COST = SimplifiedCreditService.getCreditCost('default');

            // Add cache headers for public cost matrix
            res.set({
                'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
                ETag: `"cost-matrix-${Date.now()}"`
            });

            res.json({
                success: true,
                data: {
                    costMatrix,
                    defaultCost: DEFAULT_COST,
                    lastUpdated: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('Error getting cost matrix:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get cost matrix'
            });
        }
    }
}
