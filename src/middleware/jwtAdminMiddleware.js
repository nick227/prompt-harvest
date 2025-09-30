/**
 * JWT Admin Authentication Middleware
 * Ensures only admin users can access admin routes
 * Compatible with JWT authentication system
 */

import databaseClient from '../database/PrismaClient.js';

const prisma = databaseClient.getClient();

/**
 * Middleware to verify admin access using JWT authentication
 * Checks if user is authenticated and has admin privileges
 */
export const requireJWTAdmin = async (req, res, next) => {
    try {
        // Check if user is authenticated via JWT
        if (!req.user?.id) {

            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                message: 'Please log in to access admin features'
            });
        }

        // Get user from database to check admin status
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
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
                message: 'User account not found in database'
            });
        }

        if (!user.isAdmin) {

            return res.status(403).json({
                success: false,
                error: 'Admin access required',
                message: 'You must be an administrator to access this resource'
            });
        }

        // Add admin user info to request
        req.adminUser = {
            id: user.id,
            email: user.email,
            username: user.username,
            isAdmin: user.isAdmin
        };

        next();

    } catch (error) {
        console.error('❌ JWT-ADMIN-AUTH: Error in admin authentication:', error);

        return res.status(500).json({
            success: false,
            error: 'Authentication system error',
            message: 'An error occurred while verifying admin access'
        });
    }
};

export default requireJWTAdmin;
