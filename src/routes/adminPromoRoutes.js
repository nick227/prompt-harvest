/**
 * Admin Promo Code Routes
 * Provides admin endpoints for managing promo codes
 */

import { asyncHandler } from '../middleware/errorHandler.js';
import { ValidationError } from '../errors/CustomErrors.js';
import AdminPromoService from '../services/AdminPromoService.js';
import { requireJWTAdmin } from '../middleware/jwtAdminMiddleware.js';

export const setupAdminPromoRoutes = app => {
    // All routes require admin authentication
    app.use('/api/admin/promo', requireJWTAdmin);

    /**
     * Create a new promo code
     * POST /api/admin/promo
     */
    app.post('/api/admin/promo', asyncHandler(async (req, res) => {
        const {
            code,
            credits,
            description,
            maxRedemptions,
            expiresAt,
            isActive = true
        } = req.body;

        // Validation
        if (!code || !credits) {
            throw new ValidationError('Code and credits are required');
        }

        if (typeof credits !== 'number' || credits <= 0) {
            throw new ValidationError('Credits must be a positive number');
        }

        if (maxRedemptions && (typeof maxRedemptions !== 'number' || maxRedemptions <= 0)) {
            throw new ValidationError('Max redemptions must be a positive number');
        }

        if (expiresAt && isNaN(new Date(expiresAt).getTime())) {
            throw new ValidationError('Invalid expiration date');
        }

        const promoCode = await AdminPromoService.createPromoCode({
            code,
            credits,
            description,
            maxRedemptions,
            expiresAt,
            isActive
        });

        res.status(201).json({
            success: true,
            message: 'Promo code created successfully',
            data: promoCode
        });
    }));

    /**
     * Get all promo codes
     * GET /api/admin/promo
     */
    app.get('/api/admin/promo', asyncHandler(async (req, res) => {
        const { includeInactive = false } = req.query;

        const promoCodes = await AdminPromoService.getAllPromoCodes(includeInactive === 'true');

        res.json({
            success: true,
            data: promoCodes
        });
    }));

    /**
     * Get promo code by ID
     * GET /api/admin/promo/:id
     */
    app.get('/api/admin/promo/:id', asyncHandler(async (req, res) => {
        const { id } = req.params;

        const promoCode = await AdminPromoService.getPromoCodeById(id);

        res.json({
            success: true,
            data: promoCode
        });
    }));

    /**
     * Update promo code
     * PUT /api/admin/promo/:id
     */
    app.put('/api/admin/promo/:id', asyncHandler(async (req, res) => {
        const { id } = req.params;
        const updates = req.body;

        // Validate updates
        if (updates.credits && (typeof updates.credits !== 'number' || updates.credits <= 0)) {
            throw new ValidationError('Credits must be a positive number');
        }

        if (updates.maxRedemptions && (typeof updates.maxRedemptions !== 'number' || updates.maxRedemptions <= 0)) {
            throw new ValidationError('Max redemptions must be a positive number');
        }

        if (updates.expiresAt && isNaN(new Date(updates.expiresAt).getTime())) {
            throw new ValidationError('Invalid expiration date');
        }

        const promoCode = await AdminPromoService.updatePromoCode(id, updates);

        res.json({
            success: true,
            message: 'Promo code updated successfully',
            data: promoCode
        });
    }));

    /**
     * Delete promo code
     * DELETE /api/admin/promo/:id
     */
    app.delete('/api/admin/promo/:id', asyncHandler(async (req, res) => {
        const { id } = req.params;

        const result = await AdminPromoService.deletePromoCode(id);

        res.json({
            success: true,
            message: 'Promo code deleted successfully',
            data: result
        });
    }));

    /**
     * Get promo code statistics
     * GET /api/admin/promo/:id/stats
     */
    app.get('/api/admin/promo/:id/stats', asyncHandler(async (req, res) => {
        const { id } = req.params;

        const stats = await AdminPromoService.getPromoCodeStats(id);

        res.json({
            success: true,
            data: stats
        });
    }));

    /**
     * Get system-wide promo code statistics
     * GET /api/admin/promo/stats/system
     */
    app.get('/api/admin/promo/stats/system', asyncHandler(async (req, res) => {
        const stats = await AdminPromoService.getSystemPromoStats();

        res.json({
            success: true,
            data: stats
        });
    }));

    /**
     * Validate promo code (without redeeming)
     * POST /api/admin/promo/validate
     */
    app.post('/api/admin/promo/validate', asyncHandler(async (req, res) => {
        const { code, userId } = req.body;

        if (!code) {
            throw new ValidationError('Promo code is required');
        }

        const validation = await AdminPromoService.validatePromoCode(code, userId);

        res.json({
            success: true,
            data: validation
        });
    }));

};
