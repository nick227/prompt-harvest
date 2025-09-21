import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateTokenRequired } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/AdminAuthMiddleware.js';
import { validatePagination } from '../middleware/validation.js';
import {
    basicApiSecurity,
    strictApiSecurity
} from '../middleware/security/SimplifiedSecurityMiddleware.js';

const prisma = new PrismaClient();
const router = new express.Router();

// Apply basic security to all routes
basicApiSecurity.forEach(middleware => router.use(middleware));

/**
 * Get all packages (public endpoint)
 * GET /api/packages
 */
router.get('/', validatePagination, async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        const [packages, total] = await Promise.all([
            prisma.package.findMany({
                where: { isActive: true },
                orderBy: { sortOrder: 'asc' },
                skip,
                take: parseInt(limit)
            }),
            prisma.package.count({
                where: { isActive: true }
            })
        ]);

        res.json({
            success: true,
            data: {
                packages,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error('❌ PACKAGES: Error fetching packages:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch packages'
        });
    }
});

/**
 * Get package by ID (public endpoint)
 * GET /api/packages/:id
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const packageData = await prisma.package.findUnique({
            where: { id }
        });

        if (!packageData) {
            return res.status(404).json({
                success: false,
                error: 'Package not found'
            });
        }

        res.json({
            success: true,
            data: packageData
        });
    } catch (error) {
        console.error('❌ PACKAGES: Error fetching package:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch package'
        });
    }
});

// Apply strict security to admin routes
strictApiSecurity.forEach(middleware => router.use(middleware));

/**
 * Create new package (admin only)
 * POST /api/packages
 */
router.post('/', authenticateTokenRequired, requireAdmin, async (req, res) => {
    try {
        const {
            name,
            displayName,
            description,
            credits,
            price,
            isActive = true,
            isPopular = false,
            sortOrder = 0
        } = req.body;

        // Validate required fields
        if (!name || !displayName || !credits || !price) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: name, displayName, credits, price'
            });
        }

        // Check if package name already exists
        const existingPackage = await prisma.package.findUnique({
            where: { name }
        });

        if (existingPackage) {
            return res.status(409).json({
                success: false,
                error: 'Package with this name already exists'
            });
        }

        const newPackage = await prisma.package.create({
            data: {
                name,
                displayName,
                description,
                credits: parseInt(credits),
                price: parseInt(price),
                isActive: Boolean(isActive),
                isPopular: Boolean(isPopular),
                sortOrder: parseInt(sortOrder)
            }
        });

        res.status(201).json({
            success: true,
            data: newPackage
        });
    } catch (error) {
        console.error('❌ PACKAGES: Error creating package:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create package'
        });
    }
});

/**
 * Update package (admin only)
 * PUT /api/packages/:id
 */
router.put('/:id', authenticateTokenRequired, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            displayName,
            description,
            credits,
            price,
            isActive,
            isPopular,
            sortOrder
        } = req.body;

        // Check if package exists
        const existingPackage = await prisma.package.findUnique({
            where: { id }
        });

        if (!existingPackage) {
            return res.status(404).json({
                success: false,
                error: 'Package not found'
            });
        }

        // Check if new name conflicts with existing package
        if (name && name !== existingPackage.name) {
            const nameConflict = await prisma.package.findUnique({
                where: { name }
            });

            if (nameConflict) {
                return res.status(409).json({
                    success: false,
                    error: 'Package with this name already exists'
                });
            }
        }

        const updateData = {};

        if (name !== undefined) { updateData.name = name; }
        if (displayName !== undefined) { updateData.displayName = displayName; }
        if (description !== undefined) { updateData.description = description; }
        if (credits !== undefined) { updateData.credits = parseInt(credits); }
        if (price !== undefined) { updateData.price = parseInt(price); }
        if (isActive !== undefined) { updateData.isActive = Boolean(isActive); }
        if (isPopular !== undefined) { updateData.isPopular = Boolean(isPopular); }
        if (sortOrder !== undefined) { updateData.sortOrder = parseInt(sortOrder); }

        const updatedPackage = await prisma.package.update({
            where: { id },
            data: updateData
        });

        res.json({
            success: true,
            data: updatedPackage
        });
    } catch (error) {
        console.error('❌ PACKAGES: Error updating package:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update package'
        });
    }
});

/**
 * Delete package (admin only)
 * DELETE /api/packages/:id
 */
router.delete('/:id', authenticateTokenRequired, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Check if package exists
        const existingPackage = await prisma.package.findUnique({
            where: { id }
        });

        if (!existingPackage) {
            return res.status(404).json({
                success: false,
                error: 'Package not found'
            });
        }

        await prisma.package.delete({
            where: { id }
        });

        res.json({
            success: true,
            message: 'Package deleted successfully'
        });
    } catch (error) {
        console.error('❌ PACKAGES: Error deleting package:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete package'
        });
    }
});

export default router;
