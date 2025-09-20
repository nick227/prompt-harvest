/**
 * Payment Package Service
 * Manages credit packages and pricing from database
 */

import databaseClient from '../database/PrismaClient.js';

const prisma = databaseClient.getClient();

/**
 * Get all available credit packages
 */
const getAllPackages = async () => {
    try {
        const packages = await prisma.package.findMany({
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' }
        });
        
        // Transform to match expected format
        return packages.map(pkg => ({
            id: pkg.id,
            name: pkg.displayName || pkg.name,
            credits: pkg.credits,
            price: pkg.price, // Already in cents
            description: pkg.description,
            popular: pkg.isPopular
        }));
    } catch (error) {
        console.error('❌ PAYMENT-PACKAGES: Error getting packages from database:', error);
        // Return empty array if database fails
        return [];
    }
};

/**
 * Get package by ID
 */
const getPackage = async packageId => {
    try {
        const package_ = await prisma.package.findUnique({
            where: { 
                id: packageId,
                isActive: true 
            }
        });
        
        if (!package_) {
            throw new Error(`Package not found: ${packageId}`);
        }
        
        // Transform to match expected format
        return {
            id: package_.id,
            name: package_.displayName || package_.name,
            credits: package_.credits,
            price: package_.price, // Already in cents
            description: package_.description,
            popular: package_.isPopular
        };
    } catch (error) {
        console.error('❌ PAYMENT-PACKAGES: Error getting package from database:', error);
        throw error;
    }
};

/**
 * Get default package (first popular package, or first package)
 */
const getDefaultPackage = async () => {
    try {
        // Try to get popular package first
        let package_ = await prisma.package.findFirst({
            where: { 
                isActive: true,
                isPopular: true 
            },
            orderBy: { sortOrder: 'asc' }
        });
        
        // If no popular package, get first active package
        if (!package_) {
            package_ = await prisma.package.findFirst({
                where: { isActive: true },
                orderBy: { sortOrder: 'asc' }
            });
        }
        
        if (!package_) {
            throw new Error('No active packages found');
        }
        
        // Transform to match expected format
        return {
            id: package_.id,
            name: package_.displayName || package_.name,
            credits: package_.credits,
            price: package_.price, // Already in cents
            description: package_.description,
            popular: package_.isPopular
        };
    } catch (error) {
        console.error('❌ PAYMENT-PACKAGES: Error getting default package from database:', error);
        throw error;
    }
};

/**
 * Get package pricing information
 */
const getPackagePricing = async () => {
    try {
        const packages = await getAllPackages();
        
        return packages.map(pkg => ({
            id: pkg.id,
            name: pkg.name,
            credits: pkg.credits,
            price: pkg.price,
            pricePerCredit: (pkg.price / pkg.credits / 100).toFixed(4), // Convert to dollars
            description: pkg.description,
            popular: pkg.popular
        }));
    } catch (error) {
        console.error('❌ PAYMENT-PACKAGES: Error getting package pricing:', error);
        return [];
    }
};

export default {
    getAllPackages,
    getPackage,
    getDefaultPackage,
    getPackagePricing
};
