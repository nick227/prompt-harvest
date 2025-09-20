import express from 'express';
import ViolationService from '../services/ViolationService.js';
import { authenticateTokenRequired } from '../middleware/authMiddleware.js';
import { requireJWTAdmin } from '../middleware/jwtAdminMiddleware.js';

// eslint-disable-next-line new-cap
const router = express.Router();

// Initialize violation service
const violationService = new ViolationService();

// Apply authentication to all routes
router.use(authenticateTokenRequired);

/**
 * Get violation statistics (admin only)
 * GET /api/violations/stats
 */
router.get('/stats', requireJWTAdmin, async (req, res) => {
    try {
        const {
            userId = null,
            severity = null,
            startDate = null,
            endDate = null,
            limit = 100,
            offset = 0
        } = req.query;

        const options = {
            userId,
            severity,
            startDate: startDate ? new Date(startDate) : null,
            endDate: endDate ? new Date(endDate) : null,
            limit: parseInt(limit),
            offset: parseInt(offset)
        };

        const stats = await violationService.getViolationStats(options);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('❌ Error getting violation stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get violation statistics',
            message: error.message
        });
    }
});

/**
 * Get violations for current user
 * GET /api/violations/my-violations
 */
router.get('/my-violations', async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;

        const violations = await violationService.getUserViolations(req.user.id, {
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.json({
            success: true,
            data: violations
        });
    } catch (error) {
        console.error('❌ Error getting user violations:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get user violations',
            message: error.message
        });
    }
});

/**
 * Get violation details by ID (admin only)
 * GET /api/violations/:id
 */
router.get('/:id', requireJWTAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const violation = await violationService.getViolationById(id);

        if (!violation) {
            return res.status(404).json({
                success: false,
                error: 'Violation not found'
            });
        }

        res.json({
            success: true,
            data: violation
        });
    } catch (error) {
        console.error('❌ Error getting violation by ID:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get violation details',
            message: error.message
        });
    }
});

/**
 * Get violation trends (admin only)
 * GET /api/violations/trends
 */
router.get('/trends', requireJWTAdmin, async (req, res) => {
    try {
        const { days = 30, groupBy = 'day' } = req.query;

        const trends = await violationService.getViolationTrends({
            days: parseInt(days),
            groupBy
        });

        res.json({
            success: true,
            data: trends
        });
    } catch (error) {
        console.error('❌ Error getting violation trends:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get violation trends',
            message: error.message
        });
    }
});

/**
 * Check user ban status (admin only)
 * GET /api/violations/ban-status/:userId
 */
router.get('/ban-status/:userId', requireJWTAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const {
            criticalThreshold = 5,
            highThreshold = 10,
            timeWindow = 24 * 60 * 60 * 1000
        } = req.query;

        const banStatus = await violationService.checkUserBanStatus(userId, {
            criticalThreshold: parseInt(criticalThreshold),
            highThreshold: parseInt(highThreshold),
            timeWindow: parseInt(timeWindow)
        });

        res.json({
            success: true,
            data: banStatus
        });
    } catch (error) {
        console.error('❌ Error checking user ban status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check user ban status',
            message: error.message
        });
    }
});

/**
 * Cleanup old violations (admin only)
 * DELETE /api/violations/cleanup
 */
router.delete('/cleanup', requireJWTAdmin, async (req, res) => {
    try {
        const { daysOld = 90 } = req.body;

        const deletedCount = await violationService.cleanupOldViolations(parseInt(daysOld));

        res.json({
            success: true,
            message: `Cleaned up ${deletedCount} old violations`,
            deletedCount
        });
    } catch (error) {
        console.error('❌ Error cleaning up violations:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to cleanup violations',
            message: error.message
        });
    }
});

export default router;
