import { requireAdmin, apiRateLimit, enhancedRateLimit, authenticateToken, authenticateTokenRequired } from '../middleware/index.js';

export const setupTransactionRoutes = (app, transactionController) => {
    // User statistics endpoints (authenticated users)
    app.get('/api/transactions/user/stats',
        authenticateTokenRequired,
        apiRateLimit,
        transactionController.getUserStats.bind(transactionController)
    );

    app.get('/api/transactions/user/provider-usage',
        authenticateTokenRequired,
        apiRateLimit,
        transactionController.getProviderUsage.bind(transactionController)
    );

    app.get('/api/transactions/user/daily-usage',
        authenticateTokenRequired,
        apiRateLimit,
        transactionController.getDailyUsage.bind(transactionController)
    );

    // Cost estimation endpoint (authenticated users) - more restrictive rate limit
    app.post('/api/transactions/estimate-cost',
        authenticateToken,
        enhancedRateLimit({ windowMs: 60000, maxRequests: 10 }), // 10 requests per minute
        transactionController.estimateCost.bind(transactionController)
    );

    // Public cost matrix endpoint
    app.get('/api/transactions/cost-matrix',
        apiRateLimit,
        transactionController.getCostMatrix.bind(transactionController)
    );

    // System statistics endpoints (admin only)
    app.get('/api/transactions/system/stats',
        requireAdmin,
        apiRateLimit,
        transactionController.getSystemStats.bind(transactionController)
    );
};
