/**
 * Admin Routes
 * All admin-only functionality with proper access controls
 */

import express from 'express';
import { requireAdmin, verifyAdmin, logAdminActionMiddleware } from '../middleware/AdminAuthMiddleware.js';
import { AdminDashboardService } from '../services/AdminDashboardService.js';

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

// ===========================================
// QUEUE MANAGEMENT ADMIN ROUTES
// ===========================================

/**
 * Get queue status and statistics
 * GET /api/admin/queue/status
 */
router.get('/queue/status', requireAdmin, async (req, res) => {
    try {
        // Import QueueManager dynamically
        const QueueManager = await import('../services/generate/QueueManager.js');

        // Get all queue data in one optimized call
        const queueData = QueueManager.default().getOverview();

        res.json({
            success: true,
            data: {
                ...queueData,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('❌ ADMIN: Queue status error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get queue status',
            message: error.message
        });
    }
});


/**
 * Clear the queue (admin only)
 * POST /api/admin/queue/clear
 */
router.post('/queue/clear', requireAdmin, async (req, res) => {
    try {
        // Import QueueManager dynamically
        const QueueManager = await import('../services/generate/QueueManager.js');

        const clearedCount = QueueManager.default().clearQueue();

        res.json({
            success: true,
            data: {
                clearedCount,
                message: `Cleared ${clearedCount} requests from queue`
            }
        });
    } catch (error) {
        console.error('❌ ADMIN: Queue clear error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to clear queue',
            message: error.message
        });
    }
});

/**
 * Manually process queue
 * POST /api/admin/queue/process
 */
router.post('/queue/process', requireAdmin, logAdminActionMiddleware('manual_queue_process'), async (req, res) => {
    try {
        // Import generate module dynamically
        const generateModule = await import('../generate.js');

        console.log('🔄 ADMIN: Manual queue processing triggered');

        // Import QueueManager for processing
        const QueueManager = await import('../services/generate/QueueManager.js');

        // Process the queue manually
        await QueueManager.default().processQueue(async requestData => await generateModule.default._executeGeneration({
            prompt: requestData.prompt,
            original: requestData.original,
            promptId: requestData.promptId,
            providers: requestData.providers,
            guidance: requestData.guidance,
            req: requestData.req || {}
        }));

        res.json({
            success: true,
            data: {
                message: 'Queue processing completed',
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('❌ ADMIN: Manual queue processing error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process queue',
            message: error.message
        });
    }
});

/**
 * Get enhanced queue metrics
 * GET /api/admin/queue/metrics
 */
router.get('/queue/metrics', requireAdmin, async (req, res) => {
    try {
        const QueueManager = await import('../services/generate/QueueManager.js');
        const queueManager = QueueManager.default();

        // Get comprehensive metrics
        const baseMetrics = queueManager.getOverview();
        const enhancedMetrics = queueManager.getEnhancedMetrics();
        const detailedHealth = queueManager.getDetailedHealthStatus();
        const backpressureConfig = queueManager._backpressure?.getBackpressureConfig();
        const capObservability = queueManager._backpressure?.getCapObservability();

        // Calculate performance metrics
        const performance = {
            avgProcessingTime: enhancedMetrics.performance?.avgProcessingTime || 0,
            successRate: enhancedMetrics.performance?.successRate || 0,
            errorRate: enhancedMetrics.performance?.errorRate || 0,
            retryRate: enhancedMetrics.performance?.retryRate || 0,
            tasksPerMinute: enhancedMetrics.performance?.tasksPerMinute || 0,
            throughput: enhancedMetrics.performance?.throughput || 0
        };

        // Calculate backpressure metrics
        const backpressure = {
            maxQueueSize: enhancedMetrics.capacity?.maxQueueSize || 0,
            waitingRoomCap: enhancedMetrics.capacity?.waitingRoomCap || 0,
            utilization: enhancedMetrics.capacity?.currentUtilization || 0,
            isNearCapacity: enhancedMetrics.capacity?.isNearCapacity || false,
            queueMultiplier: backpressureConfig?.queueMultiplier || 20,
            nearCapacityThreshold: backpressureConfig?.nearCapacityThreshold || 0.8
        };

        // Get recent metrics history
        const metricsHistory = queueManager._metrics?.getMetricsHistory?.() || [];

        res.json({
            success: true,
            data: {
                current: baseMetrics.current,
                health: baseMetrics.health,
                config: baseMetrics.config,
                initialization: baseMetrics.initialization,
                performance,
                backpressure,
                trends: enhancedMetrics.trends,
                recommendations: detailedHealth.recommendations,
                metricsHistory: metricsHistory.slice(-20), // Last 20 data points
                capObservability,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('❌ ADMIN: Queue metrics error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get queue metrics',
            message: error.message
        });
    }
});

// Update queue concurrency dynamically
// PUT /api/admin/queue/concurrency
router.put('/queue/concurrency', requireAdmin, logAdminActionMiddleware('update_queue_concurrency'), async (req, res) => {
    try {
        const { concurrency } = req.body;

        if (!concurrency || typeof concurrency !== 'number' || concurrency < 1 || concurrency > 10) {
            return res.status(400).json({
                success: false,
                error: 'Concurrency must be a number between 1 and 10'
            });
        }

        // Import QueueManager dynamically
        const QueueManager = await import('../services/generate/QueueManager.js');

        // Update concurrency
        const result = await QueueManager.default().updateConcurrency(concurrency);

        res.json({
            success: true,
            data: result,
            message: `Queue concurrency updated to ${concurrency}`
        });
    } catch (error) {
        console.error('❌ ADMIN: Queue concurrency update error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update queue concurrency'
        });
    }
});

// Simple queue monitoring - no complex configuration endpoints needed

/**
 * Get queue monitoring dashboard data
 * GET /api/admin/queue/dashboard
 */
router.get('/queue/dashboard', requireAdmin, async (req, res) => {
    try {
        const QueueManager = await import('../services/generate/QueueManager.js');
        const queueManager = QueueManager.default();

        // Get all queue monitoring data
        const queueData = queueManager.getOverview();
        const enhancedMetrics = queueManager.getEnhancedMetrics();
        const detailedHealth = queueManager.getDetailedHealthStatus();

        res.json({
            success: true,
            data: {
                overview: queueData,
                metrics: enhancedMetrics,
                health: detailedHealth,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('❌ ADMIN: Queue dashboard error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get queue dashboard data',
            message: error.message
        });
    }
});

/**
 * Get queue logs for monitoring
 * GET /api/admin/queue/logs
 */
router.get('/queue/logs', requireAdmin, async (req, res) => {
    try {
        const { databaseQueueLogger } = await import('../services/queue/logging/DatabaseQueueLogger.js');
        const { limit = 50, level } = req.query;
        const logs = await databaseQueueLogger.getRecentLogs(parseInt(limit), level);

        res.json({
            success: true,
            data: {
                logs,
                count: logs.length,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('❌ ADMIN: Queue logs error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get queue logs',
            details: error.message
        });
    }
});

/**
 * Get queue log statistics
 * GET /api/admin/queue/logs/stats
 */
router.get('/queue/logs/stats', requireAdmin, async (req, res) => {
    try {
        const { databaseQueueLogger } = await import('../services/queue/logging/DatabaseQueueLogger.js');
        const stats = await databaseQueueLogger.getLogStats();

        res.json({
            success: true,
            data: {
                stats,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('❌ ADMIN: Queue log stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get queue log stats',
            details: error.message
        });
    }
});

/**
 * Search queue logs with advanced filtering
 * GET /api/admin/queue/logs/search
 */
router.get('/queue/logs/search', requireAdmin, async (req, res) => {
    try {
        const { databaseQueueLogger } = await import('../services/queue/logging/DatabaseQueueLogger.js');
        const {
            level,
            requestId,
            userId,
            message,
            startDate,
            endDate,
            limit = 100,
            offset = 0
        } = req.query;

        const filters = {
            level,
            requestId,
            userId,
            message,
            startDate,
            endDate,
            limit: parseInt(limit),
            offset: parseInt(offset)
        };

        const logs = await databaseQueueLogger.searchLogs(filters);

        res.json({
            success: true,
            data: {
                logs,
                count: logs.length,
                filters,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('❌ ADMIN: Queue log search error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to search queue logs',
            details: error.message
        });
    }
});

/**
 * Get queue log trends for analytics
 * GET /api/admin/queue/logs/trends
 */
router.get('/queue/logs/trends', requireAdmin, async (req, res) => {
    try {
        const { databaseQueueLogger } = await import('../services/queue/logging/DatabaseQueueLogger.js');
        const { days = 7 } = req.query;

        const trends = await databaseQueueLogger.getLogTrends(parseInt(days));

        res.json({
            success: true,
            data: {
                trends,
                days: parseInt(days),
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('❌ ADMIN: Queue log trends error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get queue log trends',
            details: error.message
        });
    }
});

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
        const dashboardService = new AdminDashboardService();
        const dashboardData = await dashboardService.getDashboardData(req.adminUser);

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
