import { requireAdmin, apiRateLimit } from '../middleware/index.js';

export const setupConfigRoutes = (app, configController) => {
    // Configuration endpoints (admin only)
    app.get('/api/config',
        requireAdmin,
        apiRateLimit,
        configController.getConfig.bind(configController)
    );

    app.get('/api/config/environment',
        apiRateLimit,
        configController.getEnvironment.bind(configController)
    );

    app.get('/api/config/validate',
        requireAdmin,
        apiRateLimit,
        configController.validateConfig.bind(configController)
    );

    app.get('/api/config/:key',
        requireAdmin,
        apiRateLimit,
        configController.getConfigValue.bind(configController)
    );
};
