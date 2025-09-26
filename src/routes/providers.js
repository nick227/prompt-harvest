import express from 'express';
import databaseClient from '../database/PrismaClient.js';
import { authenticateTokenRequired } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/AdminAuthMiddleware.js';
import { validatePagination } from '../middleware/validation.js';
import {
    basicApiSecurity,
    strictApiSecurity
} from '../middleware/security/SimplifiedSecurityMiddleware.js';

const prisma = databaseClient.getClient();
const router = new express.Router();

// Apply basic security to all routes
basicApiSecurity.forEach(middleware => router.use(middleware));

/**
 * Get all models grouped by provider (public endpoint)
 * GET /api/providers
 */
router.get('/', validatePagination, async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        // Get all active models
        const models = await prisma.model.findMany({
            where: { isActive: true },
            orderBy: [
                { provider: 'asc' },
                { name: 'asc' }
            ]
        });

        // Group models by provider
        const providersMap = models.reduce((acc, model) => {
            if (!acc[model.provider]) {
                acc[model.provider] = {
                    name: model.provider,
                    displayName: model.provider.charAt(0).toUpperCase() + model.provider.slice(1),
                    description: `${model.provider} image generation models`,
                    isActive: true,
                    models: []
                };
            }
            acc[model.provider].models.push({
                id: model.id,
                name: model.name,
                displayName: model.displayName,
                description: model.description,
                costPerImage: model.costPerImage,
                isActive: model.isActive,
                createdAt: model.createdAt,
                updatedAt: model.updatedAt
            });

            return acc;
        }, {});

        // Convert to array and apply pagination
        const providers = Object.values(providersMap);
        const total = providers.length;
        const paginatedProviders = providers.slice(skip, skip + parseInt(limit));

        res.json({
            success: true,
            data: {
                providers: paginatedProviders,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error('❌ PROVIDERS: Error fetching providers:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch providers'
        });
    }
});

/**
 * Get provider by name with models (public endpoint)
 * GET /api/providers/:name
 */
router.get('/:name', async (req, res) => {
    try {
        const { name } = req.params;

        // Get all models for this provider
        const models = await prisma.model.findMany({
            where: {
                provider: name,
                isActive: true
            },
            orderBy: { name: 'asc' }
        });

        if (models.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Provider not found'
            });
        }

        // Create provider object with models
        const provider = {
            name,
            displayName: name.charAt(0).toUpperCase() + name.slice(1),
            description: `${name} image generation models`,
            isActive: true,
            models: models.map(model => ({
                id: model.id,
                name: model.name,
                displayName: model.displayName,
                description: model.description,
                costPerImage: model.costPerImage,
                isActive: model.isActive,
                createdAt: model.createdAt,
                updatedAt: model.updatedAt
            }))
        };

        res.json({
            success: true,
            data: provider
        });

    } catch (error) {
        console.error('❌ PROVIDERS: Error fetching provider:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch provider'
        });
    }
});

/**
 * Get all models for a provider (public endpoint)
 * GET /api/providers/:name/models
 */
router.get('/:name/models', async (req, res) => {
    try {
        const { name } = req.params;

        const models = await prisma.model.findMany({
            where: {
                provider: name,
                isActive: true
            },
            orderBy: { name: 'asc' }
        });

        res.json({
            success: true,
            data: {
                models,
                count: models.length
            }
        });

    } catch (error) {
        console.error('❌ PROVIDERS: Error fetching models:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch models'
        });
    }
});

/**
 * Get all models (public endpoint)
 * GET /api/models
 */
router.get('/models/all', async (req, res) => {
    try {
        const { provider } = req.query;

        const whereClause = { isActive: true };

        if (provider) {
            whereClause.provider = provider;
        }

        const models = await prisma.model.findMany({
            where: whereClause,
            orderBy: [
                { provider: 'asc' },
                { name: 'asc' }
            ]
        });

        res.json({
            success: true,
            data: {
                models,
                count: models.length
            }
        });

    } catch (error) {
        console.error('❌ PROVIDERS: Error fetching all models:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch models'
        });
    }
});

// Apply strict security to admin routes
strictApiSecurity.forEach(middleware => router.use(middleware));

/**
 * Create new model (admin only)
 * POST /api/providers/models
 */
router.post('/models', authenticateTokenRequired, requireAdmin, async (req, res) => {
    try {
        const {
            provider,
            name,
            displayName,
            description,
            costPerImage = 1,
            isActive = true
        } = req.body;

        // Validate required fields
        if (!provider || !name || !displayName) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
                message: 'Provider, name, and displayName are required'
            });
        }

        // Check if model name already exists for this provider
        const existingModel = await prisma.model.findUnique({
            where: {
                provider_name: {
                    provider,
                    name
                }
            }
        });

        if (existingModel) {
            return res.status(400).json({
                success: false,
                error: 'Model with this name already exists for this provider'
            });
        }

        const newModel = await prisma.model.create({
            data: {
                provider,
                name,
                displayName,
                description,
                costPerImage,
                isActive
            }
        });

        res.status(201).json({
            success: true,
            message: 'Model created successfully',
            data: newModel
        });

    } catch (error) {
        console.error('❌ PROVIDERS: Error creating model:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create model'
        });
    }
});

/**
 * Update model (admin only)
 * PUT /api/providers/models/:id
 */
router.put('/models/:id', authenticateTokenRequired, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            provider,
            name,
            displayName,
            description,
            costPerImage,
            isActive
        } = req.body;

        // Check if model exists
        const existingModel = await prisma.model.findUnique({
            where: { id }
        });

        if (!existingModel) {
            return res.status(404).json({
                success: false,
                error: 'Model not found'
            });
        }

        // Check if new name conflicts with existing model (if name is being changed)
        if (name && name !== existingModel.name) {
            const nameConflict = await prisma.model.findUnique({
                where: {
                    provider_name: {
                        provider: provider || existingModel.provider,
                        name
                    }
                }
            });

            if (nameConflict) {
                return res.status(400).json({
                    success: false,
                    error: 'Model with this name already exists for this provider'
                });
            }
        }

        const updatedModel = await prisma.model.update({
            where: { id },
            data: {
                provider,
                name,
                displayName,
                description,
                costPerImage,
                isActive
            }
        });

        res.json({
            success: true,
            message: 'Model updated successfully',
            data: updatedModel
        });

    } catch (error) {
        console.error('❌ PROVIDERS: Error updating model:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update model'
        });
    }
});

/**
 * Delete model (admin only)
 * DELETE /api/providers/models/:id
 */
router.delete('/models/:id', authenticateTokenRequired, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Check if model exists
        const existingModel = await prisma.model.findUnique({
            where: { id }
        });

        if (!existingModel) {
            return res.status(404).json({
                success: false,
                error: 'Model not found'
            });
        }

        await prisma.model.delete({
            where: { id }
        });

        res.json({
            success: true,
            message: 'Model deleted successfully'
        });

    } catch (error) {
        console.error('❌ PROVIDERS: Error deleting model:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete model'
        });
    }
});

export default router;
