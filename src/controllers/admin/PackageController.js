/**
 * Admin Package Controller
 * Handles CRUD operations for credit packages
 */

import databaseClient from '../../database/PrismaClient.js';

const prisma = databaseClient.getClient();

class PackageController {
    /**
     * Get all credit packages
     * GET /api/admin/packages
     */
    static async getPackages(req, res) {
        try {
            const packages = await prisma.package.findMany({
                orderBy: { sortOrder: 'asc' }
            });


            res.json({
                success: true,
                data: packages
            });

        } catch (error) {
            console.error('❌ ADMIN-PACKAGES: Get packages failed:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get packages',
                message: error.message
            });
        }
    }

    /**
     * Create new credit package
     * POST /api/admin/packages
     */
    static async createPackage(req, res) {
        try {
            const newPackage = req.body;
            const { adminUser } = req;

            PackageController.logPackageCreationRequest(newPackage);

            if (!PackageController.validatePackageCreation(newPackage, res)) {
                return;
            }

            if (!(await PackageController.checkPackageNameExists(newPackage.name, res))) {
                return;
            }

            const createdPackage = await PackageController.createPackageInDatabase(newPackage);

            PackageController.logPackageCreationSuccess(newPackage.name, adminUser.email);

            res.status(201).json({
                success: true,
                message: 'Package created successfully',
                data: createdPackage
            });

        } catch (error) {
            console.error('❌ ADMIN-PACKAGES: Create package failed:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create package',
                message: error.message
            });
        }
    }

    /**
     * Update existing credit package
     * PUT /api/admin/packages/:packageId
     */
    static async updatePackage(req, res) {
        try {
            const { packageId } = req.params;
            const updateData = req.body;
            const { adminUser } = req;

            // Validate package data
            const validation = PackageController.validatePackageData(updateData, true);

            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid package data',
                    message: validation.errors.join(', ')
                });
            }

            // Check if package exists
            const existingPackage = await prisma.package.findUnique({
                where: { id: packageId }
            });

            if (!existingPackage) {
                return res.status(404).json({
                    success: false,
                    error: 'Package not found',
                    message: `Package with ID '${packageId}' not found`
                });
            }

            // Prepare update data
            const updateFields = {};

            if (updateData.name !== undefined) {
                updateFields.name = updateData.name;
            }
            if (updateData.displayName !== undefined) {
                updateFields.displayName = updateData.displayName;
            }
            if (updateData.description !== undefined) {
                updateFields.description = updateData.description;
            }
            if (updateData.credits !== undefined) {
                updateFields.credits = updateData.credits;
            }
            if (updateData.price !== undefined) {
                updateFields.price = Math.round(updateData.price * 100); // Convert to cents
            }
            if (updateData.popular !== undefined) {
                updateFields.isPopular = updateData.popular;
            }

            // Update package in database
            const updatedPackage = await prisma.package.update({
                where: { id: packageId },
                data: updateFields
            });


            res.json({
                success: true,
                message: 'Package updated successfully',
                data: updatedPackage
            });

        } catch (error) {
            console.error('❌ ADMIN-PACKAGES: Update package failed:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update package',
                message: error.message
            });
        }
    }

    /**
     * Delete credit package
     * DELETE /api/admin/packages/:packageId
     */
    static async deletePackage(req, res) {
        try {
            const { packageId } = req.params;
            const { adminUser } = req;

            // Check if package exists
            const existingPackage = await prisma.package.findUnique({
                where: { id: packageId }
            });

            if (!existingPackage) {
                return res.status(404).json({
                    success: false,
                    error: 'Package not found',
                    message: `Package with ID '${packageId}' not found`
                });
            }

            // Delete package from database
            const deletedPackage = await prisma.package.delete({
                where: { id: packageId }
            });


            res.json({
                success: true,
                message: 'Package deleted successfully',
                data: deletedPackage
            });

        } catch (error) {
            console.error('❌ ADMIN-PACKAGES: Delete package failed:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to delete package',
                message: error.message
            });
        }
    }

    /**
     * Get package analytics
     * GET /api/admin/packages/analytics
     */
    static async getPackageAnalytics(req, res) {
        try {
            const packages = await prisma.package.findMany({
                where: { isActive: true }
            });

            if (packages.length === 0) {
                return res.json({
                    success: true,
                    data: {
                        totalPackages: 0,
                        priceRange: { min: 0, max: 0 },
                        creditRange: { min: 0, max: 0 },
                        averagePricePerCredit: 0,
                        popularPackages: 0
                    }
                });
            }

            // Calculate analytics
            const analytics = {
                totalPackages: packages.length,
                priceRange: {
                    min: Math.min(...packages.map(pkg => pkg.price / 100)),
                    max: Math.max(...packages.map(pkg => pkg.price / 100))
                },
                creditRange: {
                    min: Math.min(...packages.map(pkg => pkg.credits)),
                    max: Math.max(...packages.map(pkg => pkg.credits))
                },
                averagePricePerCredit: packages.reduce((sum, pkg) => sum + (pkg.price / 100 / pkg.credits), 0) / packages.length,
                popularPackages: packages.filter(pkg => pkg.isPopular).length
            };

            res.json({
                success: true,
                data: analytics
            });

        } catch (error) {
            console.error('❌ ADMIN-PACKAGES: Get analytics failed:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get package analytics',
                message: error.message
            });
        }
    }

    // ===== UTILITY METHODS =====

    /**
     * Validate package data
     */
    static validatePackageData(packageData, isUpdate = false) {
        const errors = [];

        // Required fields for creation
        if (!isUpdate && (!packageData.name || typeof packageData.name !== 'string')) {
            errors.push('Package name is required and must be a string');
        }

        // Validate credits
        if (packageData.credits !== undefined &&
            (!Number.isInteger(packageData.credits) || packageData.credits < 1)) {
            errors.push('Credits must be a positive integer');
        }

        // Validate price
        if (packageData.price !== undefined &&
            (typeof packageData.price !== 'number' || packageData.price < 0.99)) {
            errors.push('Price must be a number >= 0.99');
        }

        // Validate description
        if (packageData.description !== undefined && typeof packageData.description !== 'string') {
            errors.push('Description must be a string');
        }

        // Validate popular flag
        if (packageData.popular !== undefined && typeof packageData.popular !== 'boolean') {
            errors.push('Popular flag must be a boolean');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Log package creation request details
     */
    static logPackageCreationRequest(newPackage) {
        console.log('📦 ADMIN-PACKAGES-BACKEND: Data types:', {
            name: typeof newPackage.name,
            credits: typeof newPackage.credits,
            price: typeof newPackage.price,
            description: typeof newPackage.description,
            popular: typeof newPackage.popular
        });
    }

    /**
     * Validate package creation data
     */
    static validatePackageCreation(newPackage, res) {
        const validation = PackageController.validatePackageData(newPackage);

        if (!validation.isValid) {

            res.status(400).json({
                success: false,
                error: 'Invalid package data',
                message: validation.errors.join(', ')
            });

            return false;
        }

        return true;
    }

    /**
     * Check if package name already exists
     */
    static async checkPackageNameExists(name, res) {
        const existingPackage = await prisma.package.findUnique({
            where: { name }
        });

        if (existingPackage) {
            res.status(400).json({
                success: false,
                error: 'Package name already exists',
                message: `Package with name '${name}' already exists`
            });

            return false;
        }

        return true;
    }

    /**
     * Create package in database
     */
    static async createPackageInDatabase(newPackage) {
        return await prisma.package.create({
            data: {
                name: newPackage.name,
                displayName: newPackage.name,
                description: newPackage.description,
                credits: newPackage.credits,
                price: Math.round(newPackage.price * 100),
                isActive: true,
                isPopular: newPackage.popular || false,
                sortOrder: 0
            }
        });
    }

    /**
     * Log successful package creation
     */
    static logPackageCreationSuccess(name, adminEmail) {
    }
}

export default PackageController;
