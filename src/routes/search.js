import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';

/**
 * Setup search routes
 * Follows project pattern: Controller passed as dependency
 *
 * @param {SearchController} searchController - Injected search controller
 * @returns {express.Router} Configured router
 */
export const setupSearchRoutes = searchController => {
    // eslint-disable-next-line new-cap
    const router = express.Router();

    // Search images endpoint
    // GET /api/search/images?q=sunset&page=1&limit=50
    router.get(
        '/images',
        authenticateToken,
        (req, res) => searchController.searchImages(req, res)
    );

    return router;
};

// Legacy default export for backward compatibility
// Will be removed once routes/index.js is updated
import { searchController } from '../controllers/SearchController.js';

// eslint-disable-next-line new-cap
const legacyRouter = express.Router();

legacyRouter.get(
    '/images',
    authenticateToken,
    (req, res) => searchController.searchImages(req, res)
);

export default legacyRouter;

