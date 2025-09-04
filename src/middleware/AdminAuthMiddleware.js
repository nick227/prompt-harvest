/**
 * Admin Authentication Middleware
 * Ensures only admin users can access admin routes
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Middleware to verify admin access
 * Checks if user is authenticated and has admin privileges
 */
export const requireAdmin = async (req, res, next) => {
    try {
        // Check if user is authenticated
        if (!req.session?.userId) {
            // eslint-disable-next-line no-console
            console.log('🔐 ADMIN-AUTH: No user session found');

            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                message: 'Please log in to access admin features'
            });
        }

        // Get user from database to check admin status
        const user = await prisma.user.findUnique({
            where: { id: req.session.userId },
            select: {
                id: true,
                email: true,
                username: true,
                isAdmin: true,
                createdAt: true
            }
        });

        if (!user) {
            // eslint-disable-next-line no-console
            console.log('🔐 ADMIN-AUTH: User not found in database:', req.session.userId);

            return res.status(401).json({
                success: false,
                error: 'User not found',
                message: 'Your session is invalid. Please log in again.'
            });
        }

        // Check if user has admin privileges
        if (!user.isAdmin) {
            // eslint-disable-next-line no-console
            console.log('🔐 ADMIN-AUTH: Non-admin user attempted admin access:', user.email);

            return res.status(403).json({
                success: false,
                error: 'Admin access required',
                message: 'You do not have permission to access admin features'
            });
        }

        // Add user info to request for use in route handlers
        req.user = user;
        req.adminUser = user; // Explicit admin user reference

        // eslint-disable-next-line no-console
        console.log('✅ ADMIN-AUTH: Admin access granted to:', user.email);

        return next();

    } catch (error) {
        console.error('❌ ADMIN-AUTH: Middleware error:', error);

        return res.status(500).json({
            success: false,
            error: 'Authentication error',
            message: 'Failed to verify admin access'
        });
    }
};

/**
 * Middleware to verify admin access and return verification status
 * Used for auth check endpoints
 */
export const verifyAdmin = async (req, res, _next) => {
    try {
        // Check if user is authenticated
        if (!req.session?.userId) {
            return res.json({
                isAuthenticated: false,
                isAdmin: false,
                message: 'Not authenticated'
            });
        }

        // Get user from database
        const user = await prisma.user.findUnique({
            where: { id: req.session.userId },
            select: {
                id: true,
                email: true,
                username: true,
                isAdmin: true,
                createdAt: true
            }
        });

        if (!user) {
            return res.json({
                isAuthenticated: false,
                isAdmin: false,
                message: 'User not found'
            });
        }

        // Add user info to request
        req.user = user;

        // Return verification status
        res.json({
            isAuthenticated: true,
            isAdmin: user.isAdmin,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                isAdmin: user.isAdmin,
                createdAt: user.createdAt
            },
            message: user.isAdmin ? 'Admin access verified' : 'Regular user access'
        });

    } catch (error) {
        console.error('❌ ADMIN-AUTH: Verification error:', error);
        res.status(500).json({
            isAuthenticated: false,
            isAdmin: false,
            error: 'Verification failed',
            message: 'Failed to verify user status'
        });
    }
};

/**
 * Utility function to make a user admin
 * For development/setup purposes
 */
export const makeUserAdmin = async email => {
    try {
        const user = await prisma.user.update({
            where: { email },
            data: { isAdmin: true },
            select: { id: true, email: true, username: true, isAdmin: true }
        });

        // eslint-disable-next-line no-console
        console.log('✅ ADMIN-AUTH: User promoted to admin:', user.email);

        return user;

    } catch (error) {
        console.error('❌ ADMIN-AUTH: Failed to make user admin:', error);
        throw error;
    }
};

/**
 * Utility function to remove admin privileges
 */
export const removeUserAdmin = async email => {
    try {
        const user = await prisma.user.update({
            where: { email },
            data: { isAdmin: false },
            select: { id: true, email: true, username: true, isAdmin: true }
        });

        // eslint-disable-next-line no-console
        console.log('✅ ADMIN-AUTH: Admin privileges removed from user:', user.email);

        return user;

    } catch (error) {
        console.error('❌ ADMIN-AUTH: Failed to remove admin privileges:', error);
        throw error;
    }
};

/**
 * Get all admin users
 */
export const getAdminUsers = async () => {
    try {
        const admins = await prisma.user.findMany({
            where: { isAdmin: true },
            select: {
                id: true,
                email: true,
                username: true,
                createdAt: true,
                updatedAt: true
            },
            orderBy: { createdAt: 'asc' }
        });

        return admins;

    } catch (error) {
        console.error('❌ ADMIN-AUTH: Failed to get admin users:', error);
        throw error;
    }
};

/**
 * Log admin action for audit trail
 */
export const logAdminAction = async (userId, action, details = {}) => {
    try {
        // eslint-disable-next-line no-console
        console.log(`📝 ADMIN-ACTION: ${action} by ${userId}`, details);

        // In a production system, you might want to store this in a dedicated audit log table
        // For now, we'll just log to console and could extend this later

        return {
            timestamp: new Date().toISOString(),
            userId,
            action,
            details
        };

    } catch (error) {
        console.error('❌ ADMIN-AUTH: Failed to log admin action:', error);

        // Don't throw here - logging failures shouldn't break the main operation
        return null;
    }
};

/**
 * Middleware to log admin actions
 */
export const logAdminActionMiddleware = action => (req, res, next) => {
    // Store original res.json to intercept response
    const originalJson = res.json;

    res.json = function(data) {
        // Log the action if response was successful
        if (req.adminUser && (!data.error || data.success !== false)) {
            logAdminAction(req.adminUser.id, action, {
                method: req.method,
                path: req.path,
                query: req.query,
                body: req.body,
                response: data
            });
        }

        // Call original json method
        return originalJson.call(this, data);
    };

    next();
};

export default {
    requireAdmin,
    verifyAdmin,
    makeUserAdmin,
    removeUserAdmin,
    getAdminUsers,
    logAdminAction,
    logAdminActionMiddleware
};
