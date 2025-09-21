/**
 * Admin Routes - Modular Architecture
 * All admin-only functionality with proper access controls
 */

import express from 'express';

// Import modular route files
import usersRouter from './admin/users.js';
import imagesRouter from './admin/images.js';
import packagesRouter from './admin/packages.js';
import systemRouter from './admin/system.js';

// Import remaining controllers for routes not yet modularized
import PaymentsController from '../controllers/admin/PaymentsController.js';
import PricingController from '../controllers/admin/PricingController.js';
import ActivityController from '../controllers/admin/ActivityController.js';
import PromoCodesController from '../controllers/admin/PromoCodesController.js';
import CostAnalysisController from '../controllers/admin/CostAnalysisController.js';
import SystemSettingsController from '../controllers/admin/SystemSettingsController.js';

import { requireAdmin, logAdminActionMiddleware } from '../middleware/AdminAuthMiddleware.js';

const router = express.Router();

// Mount modular route files
router.use('/', usersRouter);
router.use('/', imagesRouter);
router.use('/', packagesRouter);
router.use('/', systemRouter);

// Payment routes (to be modularized later)
router.get('/payments',
    requireAdmin,
    PaymentsController.getPayments
);

router.get('/payments/analytics',
    requireAdmin,
    PaymentsController.getPaymentAnalytics
);

router.get('/payments/export',
    requireAdmin,
    PaymentsController.exportPayments
);

router.get('/payments/:paymentId',
    requireAdmin,
    PaymentsController.getPaymentDetails
);

router.post('/payments/:paymentId/refund',
    requireAdmin,
    logAdminActionMiddleware('refund_payment'),
    PaymentsController.processRefund
);

// Pricing routes (to be modularized later)
router.get('/pricing',
    requireAdmin,
    PricingController.getPricing
);

router.put('/pricing',
    requireAdmin,
    logAdminActionMiddleware('update_pricing'),
    PricingController.updatePricing
);

router.get('/pricing/history',
    requireAdmin,
    PricingController.getPricingHistory
);

router.post('/pricing/rollback/:versionId',
    requireAdmin,
    logAdminActionMiddleware('rollback_pricing'),
    PricingController.rollbackPricing
);

// Activity routes (to be modularized later)
router.get('/activity',
    requireAdmin,
    ActivityController.getActivity
);

router.get('/activity/metrics/:metric',
    requireAdmin,
    ActivityController.getMetricData
);

router.get('/activity/health',
    requireAdmin,
    ActivityController.getSystemHealth
);

router.get('/activity/errors',
    requireAdmin,
    ActivityController.getErrorLogs
);

// Promo codes routes (to be modularized later)
router.get('/promo-codes',
    requireAdmin,
    PromoCodesController.getPromoCodes
);

router.post('/promo-codes',
    requireAdmin,
    logAdminActionMiddleware('create_promo_code'),
    PromoCodesController.createPromoCode
);

router.put('/promo-codes/:promoId',
    requireAdmin,
    logAdminActionMiddleware('update_promo_code'),
    PromoCodesController.updatePromoCode
);

router.delete('/promo-codes/:promoId',
    requireAdmin,
    logAdminActionMiddleware('delete_promo_code'),
    PromoCodesController.deletePromoCode
);

router.get('/promo-codes/:promoId/stats',
    requireAdmin,
    PromoCodesController.getPromoStats
);

router.get('/promo-codes/stats',
    requireAdmin,
    PromoCodesController.getAllPromoStats
);

router.get('/promo-codes/usage',
    requireAdmin,
    PromoCodesController.getPromoUsage
);

router.get('/promo-codes/redemptions',
    requireAdmin,
    PromoCodesController.getPromoRedemptions
);

// Cost analysis routes (to be modularized later)
router.get('/cost-analysis',
    requireAdmin,
    CostAnalysisController.getCostAnalysis
);

router.get('/cost-analysis/recommendations',
    requireAdmin,
    CostAnalysisController.getRecommendations
);

router.get('/cost-analysis/packages',
    requireAdmin,
    CostAnalysisController.getPackageAnalysis
);

router.post('/cost-analysis/calculate',
    requireAdmin,
    CostAnalysisController.calculateCosts
);

router.get('/cost-analysis/providers',
    requireAdmin,
    CostAnalysisController.getProviderAnalysis
);

export default router;
