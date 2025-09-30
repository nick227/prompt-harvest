/**
 * Admin Authentication Middleware
 * Ensures only admin users can access admin routes
 */

import jwt from 'jsonwebtoken';
import databaseClient from '../database/PrismaClient.js';

const prisma = databaseClient.getClient();

/**
 * Middleware to verify admin access
 * Checks if user is authenticated and has admin privileges
 */
export const requireAdmin = async (req, res, next) => {
    try {
        // Check for JWT token first, then fall back to session
        let userId = null;

        // Try JWT token authentication
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (token) {
            try {
                if (!process.env.JWT_SECRET) {
                    throw new Error('JWT_SECRET not configured');
                }

                const decoded = jwt.verify(token, process.env.JWT_SECRET);

                userId = decoded.userId;
            } catch (jwtError) {
            }
        }

        // Fall back to session authentication if JWT failed
        if (!userId && req.session?.userId) {
            userId = req.session.userId;
        }

        if (!userId) {
            // Only log authentication failures for actual admin requests, not health checks or favicon requests
            if (!req.path.includes('/favicon') && !req.path.includes('/health') && !req.path.includes('/status')) {
            }

            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                message: 'Please log in to access admin features'
            });
        }

        // Get user from database to check admin status
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                username: true,
                isAdmin: true,
                createdAt: true
            }
        });

        if (!user) {

            return res.status(401).json({
                success: false,
                error: 'User not found',
                message: 'Your session is invalid. Please log in again.'
            });
        }

        // Check if user has admin privileges
        if (!user.isAdmin) {
            // eslint-disable-next-line no-console

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
        // Check for JWT token first, then fall back to session
        let userId = null;

        // Try JWT token authentication
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (token) {
            try {
                if (!process.env.JWT_SECRET) {
                    throw new Error('JWT_SECRET not configured');
                }

                const decoded = jwt.verify(token, process.env.JWT_SECRET);

                userId = decoded.userId;
            } catch (jwtError) {
                // JWT token invalid, continue to check session
            }
        }

        // Fall back to session authentication if JWT failed
        if (!userId && req.session?.userId) {
            userId = req.session.userId;
        }

        if (!userId) {
            return res.json({
                isAuthenticated: false,
                isAdmin: false,
                message: 'Not authenticated'
            });
        }

        // Get user from database
        const user = await prisma.user.findUnique({
            where: { id: userId },
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
 * Middleware to log admin actions for audit trail
 * Logs all admin actions with user, action, and timestamp
 */
export const logAdminActionMiddleware = action => (req, res, next) => {
    // Log the admin action
    console.log(`🔍 ADMIN-AUDIT: ${req.adminUser?.email || 'Unknown'} performed action: ${action}`, {
        userId: req.adminUser?.id,
        userEmail: req.adminUser?.email,
        action,
        timestamp: new Date().toISOString(),
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl,
        method: req.method
    });

    // Continue to next middleware
    next();
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
        return await prisma.user.findMany({
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


export default {
    requireAdmin,
    verifyAdmin,
    makeUserAdmin,
    removeUserAdmin,
    getAdminUsers,
    logAdminAction,
    logAdminActionMiddleware
};
