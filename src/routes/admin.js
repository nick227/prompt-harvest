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
import ImagesController from '../controllers/admin/ImagesController.js';
import PackageController from '../controllers/admin/PackageController.js';
import CostAnalysisController from '../controllers/admin/CostAnalysisController.js';
import SystemSettingsController from '../controllers/admin/SystemSettingsController.js';

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
// IMAGES ADMIN ROUTES
// ===========================================

/**
 * Get images with filtering and pagination
 * GET /api/admin/images
 */
router.get('/images',
    requireAdmin,
    logAdminActionMiddleware('view_images'),
    ImagesController.getImages
);

/**
 * Get specific image details
 * GET /api/admin/images/:imageId
 */
router.get('/images/:imageId',
    requireAdmin,
    logAdminActionMiddleware('view_image_details'),
    ImagesController.getImageDetails
);

/**
 * Delete an image
 * DELETE /api/admin/images/:imageId
 */
router.delete('/images/:imageId',
    requireAdmin,
    logAdminActionMiddleware('delete_image'),
    ImagesController.deleteImage
);

/**
 * Moderate an image
 * POST /api/admin/images/:imageId/moderate
 */
router.post('/images/:imageId/moderate',
    requireAdmin,
    logAdminActionMiddleware('moderate_image'),
    ImagesController.moderateImage
);

/**
 * Export images data
 * GET /api/admin/images/export
 */
router.get('/images/export',
    requireAdmin,
    logAdminActionMiddleware('export_images'),
    ImagesController.exportImages
);

/**
 * Toggle image user visibility (isPublic)
 * POST /api/admin/images/:imageId/toggle-visibility
 */
router.post('/images/:imageId/toggle-visibility',
    requireAdmin,
    logAdminActionMiddleware('toggle_image_visibility'),
    ImagesController.toggleVisibility
);

/**
 * Admin hide image from everyone (isHidden = true)
 * POST /api/admin/images/:imageId/admin-hide
 */
router.post('/images/:imageId/admin-hide',
    requireAdmin,
    logAdminActionMiddleware('admin_hide_image'),
    ImagesController.adminHideImage
);

/**
 * Admin show image to everyone (isHidden = false)
 * POST /api/admin/images/:imageId/admin-show
 */
router.post('/images/:imageId/admin-show',
    requireAdmin,
    logAdminActionMiddleware('admin_show_image'),
    ImagesController.adminShowImage
);

/**
 * Generate AI tags for image
 * POST /api/admin/images/:imageId/generate-tags
 */
router.post('/images/:imageId/generate-tags',
    requireAdmin,
    logAdminActionMiddleware('generate_image_tags'),
    ImagesController.generateTags
);

/**
 * Update image tags manually
 * POST /api/admin/images/:imageId/update-tags
 */
router.post('/images/:imageId/update-tags',
    requireAdmin,
    logAdminActionMiddleware('update_image_tags'),
    ImagesController.updateTags
);

// ===========================================
// PACKAGES ADMIN ROUTES
// ===========================================

/**
 * Get all credit packages
 * GET /api/admin/packages
 */
router.get('/packages',
    requireAdmin,
    logAdminActionMiddleware('view_packages'),
    PackageController.getPackages
);

/**
 * Create new credit package
 * POST /api/admin/packages
 */
router.post('/packages',
    requireAdmin,
    logAdminActionMiddleware('create_package'),
    PackageController.createPackage
);

/**
 * Update credit package
 * PUT /api/admin/packages/:packageId
 */
router.put('/packages/:packageId',
    requireAdmin,
    logAdminActionMiddleware('update_package'),
    PackageController.updatePackage
);

/**
 * Delete credit package
 * DELETE /api/admin/packages/:packageId
 */
router.delete('/packages/:packageId',
    requireAdmin,
    logAdminActionMiddleware('delete_package'),
    PackageController.deletePackage
);

/**
 * Get package analytics
 * GET /api/admin/packages/analytics
 */
router.get('/packages/analytics',
    requireAdmin,
    logAdminActionMiddleware('view_package_analytics'),
    PackageController.getPackageAnalytics
);

// ===========================================
// COST ANALYSIS ADMIN ROUTES
// ===========================================

/**
 * Get comprehensive cost analysis
 * GET /api/admin/cost-analysis
 */
router.get('/cost-analysis',
    requireAdmin,
    logAdminActionMiddleware('view_cost_analysis'),
    CostAnalysisController.getCostAnalysis
);

/**
 * Get cost recommendations
 * GET /api/admin/cost-analysis/recommendations
 */
router.get('/cost-analysis/recommendations',
    requireAdmin,
    logAdminActionMiddleware('view_cost_recommendations'),
    CostAnalysisController.getCostRecommendations
);

/**
 * Get package profitability analysis
 * GET /api/admin/cost-analysis/packages
 */
router.get('/cost-analysis/packages',
    requireAdmin,
    logAdminActionMiddleware('view_package_profitability'),
    CostAnalysisController.getPackageProfitability
);

/**
 * Calculate generation cost for specific scenario
 * POST /api/admin/cost-analysis/calculate
 */
router.post('/cost-analysis/calculate',
    requireAdmin,
    logAdminActionMiddleware('calculate_generation_cost'),
    CostAnalysisController.calculateGenerationCost
);

/**
 * Get provider cost breakdown
 * GET /api/admin/cost-analysis/providers
 */
router.get('/cost-analysis/providers',
    requireAdmin,
    logAdminActionMiddleware('view_provider_costs'),
    CostAnalysisController.getProviderCostBreakdown
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

/**
 * Get promo codes overview statistics
 * GET /api/admin/promo-codes/stats
 */
router.get('/promo-codes/stats',
    requireAdmin,
    logAdminActionMiddleware('view_promo_overview'),
    PromoCodesController.getPromoCodesOverview
);

/**
 * Get promo codes usage analytics
 * GET /api/admin/promo-codes/usage
 */
router.get('/promo-codes/usage',
    requireAdmin,
    logAdminActionMiddleware('view_promo_usage'),
    PromoCodesController.getPromoCodesUsage
);

/**
 * Get recent promo code redemptions
 * GET /api/admin/promo-codes/redemptions
 */
router.get('/promo-codes/redemptions',
    requireAdmin,
    logAdminActionMiddleware('view_promo_redemptions'),
    PromoCodesController.getRecentRedemptions
);

// ===========================================
// SYSTEM SETTINGS ADMIN ROUTES
// ===========================================

/**
 * Get all system settings
 * GET /api/admin/system-settings
 */
router.get('/system-settings',
    requireAdmin,
    logAdminActionMiddleware('view_system_settings'),
    SystemSettingsController.getAll
);

/**
 * Get specific system setting by key
 * GET /api/admin/system-settings/:key
 */
router.get('/system-settings/:key',
    requireAdmin,
    logAdminActionMiddleware('view_system_setting'),
    SystemSettingsController.getByKey
);

/**
 * Create or update system setting
 * POST /api/admin/system-settings
 */
router.post('/system-settings',
    requireAdmin,
    logAdminActionMiddleware('update_system_setting'),
    SystemSettingsController.createOrUpdate
);

/**
 * Delete system setting
 * DELETE /api/admin/system-settings/:key
 */
router.delete('/system-settings/:key',
    requireAdmin,
    logAdminActionMiddleware('delete_system_setting'),
    SystemSettingsController.delete
);

/**
 * Initialize default system settings
 * POST /api/admin/system-settings/initialize
 */
router.post('/system-settings/initialize',
    requireAdmin,
    logAdminActionMiddleware('initialize_system_settings'),
    SystemSettingsController.initializeDefaults
);

/**
 * Get system settings cache statistics
 * GET /api/admin/system-settings/cache-stats
 */
router.get('/system-settings/cache-stats',
    requireAdmin,
    logAdminActionMiddleware('view_system_settings_cache'),
    SystemSettingsController.getCacheStats
);

/**
 * Clear system settings cache
 * POST /api/admin/system-settings/clear-cache
 */
router.post('/system-settings/clear-cache',
    requireAdmin,
    logAdminActionMiddleware('clear_system_settings_cache'),
    SystemSettingsController.clearCache
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
        const prisma = req.app.locals.prisma || (await import('../database/PrismaClient.js')).default.getClient();

        // Get dashboard statistics
        const [
            totalUsers,
            totalImages,
            totalTransactions,
            totalStripePayments,
            totalRevenue,
            recentUsers,
            recentImages,
            systemStats
        ] = await Promise.all([
            // Total users count
            prisma.user.count(),

            // Total images count
            prisma.image.count(),

            // Total transactions count (generation transactions)
            prisma.transaction.count(),

            // Total successful Stripe payments
            prisma.stripePayment.count({
                where: { status: 'completed' }
            }),

            // Calculate total revenue from successful payments
            prisma.stripePayment.aggregate({
                where: { status: 'completed' },
                _sum: { amount: true }
            }),

            // Recent users (last 7 days)
            prisma.user.count({
                where: {
                    createdAt: {
                        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                    }
                }
            }),

            // Recent images (last 24 hours)
            prisma.image.count({
                where: {
                    createdAt: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                    }
                }
            }),

            // System stats (mock for now - can be enhanced with real metrics)
            Promise.resolve({
                avgResponseTime: 245,
                successRate: 98.5,
                cpuUsage: 35.2,
                memoryUsage: 67.8
            })
        ]);

        // Get recent activity (without relations for now)
        const recentActivity = await prisma.image.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' }
        });

        // Get user data for recent images manually
        const userIds = [...new Set(recentActivity.map(img => img.userId))];
        const users = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, email: true, username: true }
        });

        // Map users to images
        const userMap = new Map(users.map(user => [user.id, user]));
        const recentActivityWithUsers = recentActivity.map(image => ({
            ...image,
            user: userMap.get(image.userId) || { email: 'Unknown', username: 'Unknown' }
        }));

        const activityList = (recentActivityWithUsers || []).map(image => ({
            type: 'image_generation',
            description: `Image generated by ${image.user.email}`,
            timestamp: image.createdAt
        }));

        // Get the most recent image with full details
        const mostRecentImage = recentActivityWithUsers && recentActivityWithUsers.length > 0 ? recentActivityWithUsers[0] : null;

        const dashboardData = {
            stats: {
                totalUsers,
                totalImages,
                totalTransactions,
                activeSessions: recentUsers, // Recent users as proxy for active sessions
                totalRevenue: totalRevenue._sum.amount || 0, // Real revenue from Stripe payments
                totalPayments: totalStripePayments, // Number of successful payments
                recentImages24h: recentImages // Images generated in last 24 hours
            },
            metrics: {
                avgResponseTime: systemStats.avgResponseTime,
                successRate: systemStats.successRate,
                recentActivity: activityList,
                conversionRate: totalUsers > 0 ? ((totalStripePayments / totalUsers) * 100).toFixed(1) : 0 // Payment conversion rate
            },
            recentImage: mostRecentImage ? {
                id: mostRecentImage.id,
                imageUrl: mostRecentImage.imageUrl,
                prompt: mostRecentImage.prompt,
                provider: mostRecentImage.provider,
                model: mostRecentImage.model,
                createdAt: mostRecentImage.createdAt,
                user: {
                    email: mostRecentImage.user.email,
                    username: mostRecentImage.user.username
                }
            } : null,
            health: {
                cpuUsage: systemStats.cpuUsage,
                memoryUsage: systemStats.memoryUsage,
                uptime: process.uptime(), // Server uptime in seconds
                memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) // Memory usage in MB
            },
            timestamp: new Date().toISOString(),
            adminUser: {
                id: req.adminUser.id,
                email: req.adminUser.email,
                username: req.adminUser.username
            }
        };

        res.json({
            success: true,
            data: dashboardData
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
