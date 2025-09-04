/**
 * Admin Routes
 * All admin-only functionality with proper access controls
 */

import express from 'express';
import { requireAdmin, verifyAdmin, logAdminActionMiddleware } from '../middleware/AdminAuthMiddleware.js';

// Import admin controllers (to be created)
import PaymentsController from '../controllers/admin/PaymentsController.js';
import PricingController from '../controllers/admin/PricingController.js';
import ActivityController from '../controllers/admin/ActivityController.js';
import UsersController from '../controllers/admin/UsersController.js';
import PromoCodesController from '../controllers/admin/PromoCodesController.js';

// eslint-disable-next-line new-cap
const router = express.Router();

// ===========================================
// ADMIN AUTHENTICATION ROUTES
// ===========================================

/**
 * Verify admin access
 * GET /api/admin/auth/verify
 */
router.get('/auth/verify', verifyAdmin);

// ===========================================
// PAYMENTS ADMIN ROUTES
// ===========================================

/**
 * Get all payments with filtering and pagination
 * GET /api/admin/payments
 */
router.get('/payments',
    requireAdmin,
    logAdminActionMiddleware('view_payments'),
    // eslint-disable-next-line new-cap
    PaymentsController.getPayments
);

/**
 * Get payment analytics
 * GET /api/admin/payments/analytics
 */
router.get('/payments/analytics',
    requireAdmin,
    logAdminActionMiddleware('view_payment_analytics'),
    PaymentsController.getAnalytics
);

/**
 * Export payments data
 * GET /api/admin/payments/export
 */
router.get('/payments/export',
    requireAdmin,
    logAdminActionMiddleware('export_payments'),
    PaymentsController.exportPayments
);

/**
 * Get specific payment details
 * GET /api/admin/payments/:paymentId
 */
router.get('/payments/:paymentId',
    requireAdmin,
    logAdminActionMiddleware('view_payment_details'),
    PaymentsController.getPaymentDetails
);

/**
 * Refund a payment
 * POST /api/admin/payments/:paymentId/refund
 */
router.post('/payments/:paymentId/refund',
    requireAdmin,
    logAdminActionMiddleware('refund_payment'),
    PaymentsController.refundPayment
);

// ===========================================
// PRICING ADMIN ROUTES
// ===========================================

/**
 * Get current pricing configuration
 * GET /api/admin/pricing
 */
router.get('/pricing',
    requireAdmin,
    logAdminActionMiddleware('view_pricing'),
    PricingController.getPricing
);

/**
 * Update pricing configuration
 * PUT /api/admin/pricing
 */
router.put('/pricing',
    requireAdmin,
    logAdminActionMiddleware('update_pricing'),
    PricingController.updatePricing
);

/**
 * Get pricing history
 * GET /api/admin/pricing/history
 */
router.get('/pricing/history',
    requireAdmin,
    logAdminActionMiddleware('view_pricing_history'),
    PricingController.getPricingHistory
);

/**
 * Rollback to previous pricing version
 * POST /api/admin/pricing/rollback/:versionId
 */
router.post('/pricing/rollback/:versionId',
    requireAdmin,
    logAdminActionMiddleware('rollback_pricing'),
    PricingController.rollbackPricing
);

// ===========================================
// ACTIVITY ADMIN ROUTES
// ===========================================

/**
 * Get site activity overview
 * GET /api/admin/activity
 */
router.get('/activity',
    requireAdmin,
    logAdminActionMiddleware('view_activity'),
    ActivityController.getActivity
);

/**
 * Get activity metrics for charts
 * GET /api/admin/activity/metrics/:metric
 */
router.get('/activity/metrics/:metric',
    requireAdmin,
    logAdminActionMiddleware('view_activity_metrics'),
    ActivityController.getMetrics
);

/**
 * Get system health status
 * GET /api/admin/activity/health
 */
router.get('/activity/health',
    requireAdmin,
    logAdminActionMiddleware('view_system_health'),
    ActivityController.getSystemHealth
);

/**
 * Get error logs
 * GET /api/admin/activity/errors
 */
router.get('/activity/errors',
    requireAdmin,
    logAdminActionMiddleware('view_error_logs'),
    ActivityController.getErrorLogs
);

// ===========================================
// USER MANAGEMENT ADMIN ROUTES
// ===========================================

/**
 * Get users with filtering and pagination
 * GET /api/admin/users
 */
router.get('/users',
    requireAdmin,
    logAdminActionMiddleware('view_users'),
    UsersController.getUsers
);

/**
 * Get specific user details and activity
 * GET /api/admin/users/:userId
 */
router.get('/users/:userId',
    requireAdmin,
    logAdminActionMiddleware('view_user_details'),
    UsersController.getUserDetails
);

/**
 * Add credits to user account
 * POST /api/admin/users/:userId/credits
 */
router.post('/users/:userId/credits',
    requireAdmin,
    logAdminActionMiddleware('add_user_credits'),
    UsersController.addCredits
);

/**
 * Suspend user account
 * POST /api/admin/users/:userId/suspend
 */
router.post('/users/:userId/suspend',
    requireAdmin,
    logAdminActionMiddleware('suspend_user'),
    UsersController.suspendUser
);

/**
 * Unsuspend user account
 * POST /api/admin/users/:userId/unsuspend
 */
router.post('/users/:userId/unsuspend',
    requireAdmin,
    logAdminActionMiddleware('unsuspend_user'),
    UsersController.unsuspendUser
);

/**
 * Get user activity summary
 * GET /api/admin/users/:userId/activity
 */
router.get('/users/:userId/activity',
    requireAdmin,
    logAdminActionMiddleware('view_user_activity'),
    UsersController.getUserActivity
);

/**
 * Bulk update users
 * POST /api/admin/users/bulk
 */
router.post('/users/bulk',
    requireAdmin,
    logAdminActionMiddleware('bulk_update_users'),
    UsersController.bulkUpdate
);

/**
 * Export users data
 * GET /api/admin/users/export
 */
router.get('/users/export',
    requireAdmin,
    logAdminActionMiddleware('export_users'),
    UsersController.exportUsers
);

// ===========================================
// PROMO CODES ADMIN ROUTES
// ===========================================

/**
 * Get all promo codes
 * GET /api/admin/promo-codes
 */
router.get('/promo-codes',
    requireAdmin,
    logAdminActionMiddleware('view_promo_codes'),
    PromoCodesController.getPromoCodes
);

/**
 * Create new promo code
 * POST /api/admin/promo-codes
 */
router.post('/promo-codes',
    requireAdmin,
    logAdminActionMiddleware('create_promo_code'),
    PromoCodesController.createPromoCode
);

/**
 * Update promo code
 * PUT /api/admin/promo-codes/:promoId
 */
router.put('/promo-codes/:promoId',
    requireAdmin,
    logAdminActionMiddleware('update_promo_code'),
    PromoCodesController.updatePromoCode
);

/**
 * Delete promo code
 * DELETE /api/admin/promo-codes/:promoId
 */
router.delete('/promo-codes/:promoId',
    requireAdmin,
    logAdminActionMiddleware('delete_promo_code'),
    PromoCodesController.deletePromoCode
);

/**
 * Get promo code usage statistics
 * GET /api/admin/promo-codes/:promoId/stats
 */
router.get('/promo-codes/:promoId/stats',
    requireAdmin,
    logAdminActionMiddleware('view_promo_stats'),
    PromoCodesController.getPromoStats
);

// ===========================================
// GENERAL ADMIN ROUTES
// ===========================================

/**
 * Get admin dashboard overview
 * GET /api/admin/dashboard
 */
router.get('/dashboard', requireAdmin, async (req, res) => {
    try {
        // This could aggregate data from multiple controllers
        // For now, return a simple overview
        res.json({
            success: true,
            message: 'Admin dashboard data',
            data: {
                timestamp: new Date().toISOString(),
                adminUser: {
                    id: req.adminUser.id,
                    email: req.adminUser.email,
                    username: req.adminUser.username
                }
            }
        });
    } catch (error) {
        console.error('❌ ADMIN: Dashboard error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load dashboard',
            message: error.message
        });
    }
});

/**
 * Test admin access
 * GET /api/admin/test
 */
router.get('/test', requireAdmin, (req, res) => {
    res.json({
        success: true,
        message: 'Admin access test successful',
        user: req.adminUser,
        timestamp: new Date().toISOString()
    });
});

export default router;
