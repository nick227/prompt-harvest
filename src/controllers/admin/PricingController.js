/**
 * Admin Pricing Controller
 * Handles pricing configuration and management
 */

import databaseClient from '../../database/PrismaClient.js';
import fs from 'fs/promises';
import path from 'path';

const _prisma = databaseClient.getClient();

// Default pricing configuration
const DEFAULT_PRICING = {
    openai_cost: 0.02,
    stability_cost: 0.015,
    midjourney_cost: 0.025,
    credit_package_1: 25,
    credit_package_1_price: 5.00,
    credit_package_2: 100,
    credit_package_2_price: 15.00,
    credit_package_3: 500,
    credit_package_3_price: 60.00,
    markup_percentage: 20,
    updated_by: 'system',
    updated_at: new Date().toISOString()
};

class PricingController {
    /**
     * Get current pricing configuration
     * GET /api/admin/pricing
     */
    static async getPricing(req, res) {
        try {
            // Get pricing from config file or return defaults
            const pricing = await PricingController.loadPricingConfig();

            // eslint-disable-next-line no-console

            res.json({
                success: true,
                data: pricing
            });

        } catch (error) {
            console.error('❌ ADMIN-PRICING: Get pricing failed:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get pricing configuration',
                message: error.message
            });
        }
    }

    /**
     * Update pricing configuration
     * PUT /api/admin/pricing
     */
    static async updatePricing(req, res) {
        try {
            const newPricing = req.body;
            const { adminUser } = req;

            // Validate pricing data
            const validation = PricingController.validatePricingData(newPricing);

            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid pricing data',
                    message: validation.errors.join(', ')
                });
            }

            // Load current pricing for comparison
            const currentPricing = await PricingController.loadPricingConfig();

            // Create pricing update object
            const updatedPricing = {
                ...currentPricing,
                ...newPricing,
                updated_by: adminUser.email,
                updated_at: new Date().toISOString(),
                version: (currentPricing.version || 0) + 1
            };

            // Save to pricing history before updating
            await PricingController.savePricingHistory(currentPricing, updatedPricing, adminUser);

            // Save new pricing configuration
            await PricingController.savePricingConfig(updatedPricing);

            // Update credit packages in the system if they changed
            if (PricingController.creditPackagesChanged(currentPricing, updatedPricing)) {
                await PricingController.updateCreditPackages(updatedPricing);
            }

            // eslint-disable-next-line no-console

            return res.json({
                success: true,
                message: 'Pricing configuration updated successfully',
                data: updatedPricing
            });

        } catch (error) {
            console.error('❌ ADMIN-PRICING: Update pricing failed:', error);

            return res.status(500).json({
                success: false,
                error: 'Failed to update pricing configuration',
                message: error.message
            });
        }
    }

    /**
     * Get pricing history
     * GET /api/admin/pricing/history
     */
    static async getPricingHistory(req, res) {
        try {
            const { page = 1, limit = 20 } = req.query;

            // Load pricing history from file or database
            const history = await PricingController.loadPricingHistory();

            // Paginate results
            const offset = (parseInt(page) - 1) * parseInt(limit);
            const paginatedHistory = history.slice(offset, offset + parseInt(limit));

            const totalPages = Math.ceil(history.length / parseInt(limit));

            // eslint-disable-next-line no-console

            res.json({
                success: true,
                data: {
                    items: paginatedHistory,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: history.length,
                        totalPages,
                        offset
                    }
                }
            });

        } catch (error) {
            console.error('❌ ADMIN-PRICING: Get pricing history failed:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get pricing history',
                message: error.message
            });
        }
    }

    /**
     * Rollback to previous pricing version
     * POST /api/admin/pricing/rollback/:versionId
     */
    static async rollbackPricing(req, res) {
        try {
            const { versionId } = req.params;
            const { adminUser } = req;

            // Load pricing history
            const history = await PricingController.loadPricingHistory();

            // Find the version to rollback to
            const targetVersion = history.find(h => h.version === parseInt(versionId));

            if (!targetVersion) {
                return res.status(404).json({
                    success: false,
                    error: 'Version not found',
                    message: `Pricing version ${versionId} not found`
                });
            }

            // Load current pricing for history
            const currentPricing = await PricingController.loadPricingConfig();

            // Create rollback pricing object
            const rollbackPricing = {
                ...targetVersion,
                updated_by: adminUser.email,
                updated_at: new Date().toISOString(),
                version: (currentPricing.version || 0) + 1,
                rollback_from_version: currentPricing.version,
                rollback_to_version: targetVersion.version
            };

            // Save current state to history before rollback
            await PricingController.savePricingHistory(currentPricing, rollbackPricing, adminUser);

            // Save rollback pricing
            await PricingController.savePricingConfig(rollbackPricing);

            // Update credit packages if needed
            if (PricingController.creditPackagesChanged(currentPricing, rollbackPricing)) {
                await PricingController.updateCreditPackages(rollbackPricing);
            }

            // eslint-disable-next-line no-console

            res.json({
                success: true,
                message: `Successfully rolled back to pricing version ${versionId}`,
                data: rollbackPricing
            });

        } catch (error) {
            console.error('❌ ADMIN-PRICING: Rollback failed:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to rollback pricing',
                message: error.message
            });
        }
    }

    // ===========================================
    // UTILITY METHODS
    // ===========================================

    /**
     * Load pricing configuration from file
     */
    static async loadPricingConfig() {
        const configPath = path.join(process.cwd(), 'config', 'pricing.json');

        try {
            const configData = await fs.readFile(configPath, 'utf8');

            return JSON.parse(configData);
        } catch (error) {
            // If file doesn't exist, return defaults
            if (error.code === 'ENOENT') {
                await PricingController.savePricingConfig(DEFAULT_PRICING);

                return DEFAULT_PRICING;
            }
            throw error;
        }
    }

    /**
     * Save pricing configuration to file
     */
    static async savePricingConfig(pricing) {
        const configDir = path.join(process.cwd(), 'config');
        const configPath = path.join(configDir, 'pricing.json');

        // Ensure config directory exists
        try {
            await fs.mkdir(configDir, { recursive: true });
        } catch (error) {
            // Directory might already exist
        }

        await fs.writeFile(configPath, JSON.stringify(pricing, null, 2));
    }

    /**
     * Load pricing history
     */
    static async loadPricingHistory() {
        const historyPath = path.join(process.cwd(), 'config', 'pricing-history.json');

        try {
            const historyData = await fs.readFile(historyPath, 'utf8');

            return JSON.parse(historyData);
        } catch (error) {
            if (error.code === 'ENOENT') {
                return [];
            }
            throw error;
        }
    }

    /**
     * Save pricing change to history
     */
    static async savePricingHistory(oldPricing, newPricing, adminUser) {
        const history = await PricingController.loadPricingHistory();

        // Create history entry
        const historyEntry = {
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            version: newPricing.version,
            updatedBy: adminUser.email,
            updatedAt: new Date().toISOString(),
            changes: PricingController.calculateChanges(oldPricing, newPricing),
            previousVersion: oldPricing,
            newVersion: newPricing
        };

        // Add to beginning of history array
        history.unshift(historyEntry);

        // Keep only last 100 history entries
        if (history.length > 100) {
            history.splice(100);
        }

        // Save history
        const historyPath = path.join(process.cwd(), 'config', 'pricing-history.json');

        await fs.writeFile(historyPath, JSON.stringify(history, null, 2));
    }

    /**
     * Calculate changes between pricing versions
     */
    static calculateChanges(oldPricing, newPricing) {
        const changes = {};

        const keys = [
            'openai_cost', 'stability_cost', 'midjourney_cost',
            'credit_package_1', 'credit_package_1_price',
            'credit_package_2', 'credit_package_2_price',
            'credit_package_3', 'credit_package_3_price',
            'markup_percentage'
        ];

        keys.forEach(key => {
            if (oldPricing[key] !== newPricing[key]) {
                changes[key] = {
                    from: oldPricing[key],
                    to: newPricing[key]
                };
            }
        });

        return changes;
    }

    /**
     * Check if credit packages changed
     */
    static creditPackagesChanged(oldPricing, newPricing) {
        const packageKeys = [
            'credit_package_1', 'credit_package_1_price',
            'credit_package_2', 'credit_package_2_price',
            'credit_package_3', 'credit_package_3_price'
        ];

        return packageKeys.some(key => oldPricing[key] !== newPricing[key]);
    }

    /**
     * Update credit packages in the system
     */
    static async updateCreditPackages(_pricing) {
        // This would update any cached credit package data
        // For now, we'll just log that packages need updating
        // eslint-disable-next-line no-console

        // In a production system, you might:
        // - Update a credit packages cache
        // - Notify other services of pricing changes
        // - Update any pre-calculated package data
    }

    /**
     * Validate pricing data
     */
    static validatePricingData(pricing) {
        const errors = [];

        // Validate cost fields
        const costFields = ['openai_cost', 'stability_cost', 'midjourney_cost'];

        costFields.forEach(field => {
            const value = pricing[field];

            if (value !== undefined) {
                if (typeof value !== 'number' || value < 0.001 || value > 1.0) {
                    errors.push(`${field} must be a number between 0.001 and 1.0`);
                }
            }
        });

        // Validate credit package fields
        const packageFields = [
            { credits: 'credit_package_1', price: 'credit_package_1_price' },
            { credits: 'credit_package_2', price: 'credit_package_2_price' },
            { credits: 'credit_package_3', price: 'credit_package_3_price' }
        ];

        packageFields.forEach(({ credits, price }, _index) => {
            if (pricing[credits] !== undefined) {
                if (!Number.isInteger(pricing[credits]) || pricing[credits] < 1) {
                    errors.push(`${credits} must be a positive integer`);
                }
            }

            if (pricing[price] !== undefined) {
                if (typeof pricing[price] !== 'number' || pricing[price] < 0.99) {
                    errors.push(`${price} must be a number >= 0.99`);
                }
            }
        });

        // Validate markup percentage
        if (pricing.markup_percentage !== undefined) {
            if (!Number.isInteger(pricing.markup_percentage) ||
                pricing.markup_percentage < 0 ||
                pricing.markup_percentage > 500) {
                errors.push('markup_percentage must be an integer between 0 and 500');
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

export default PricingController;
