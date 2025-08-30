import jwt from 'jsonwebtoken';
import { AuthenticationError } from '../errors/CustomErrors.js';
import databaseClient from '../database/PrismaClient.js';

const prisma = databaseClient.getClient();

// JWT authentication middleware
export const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            // Allow anonymous access for certain endpoints
            req.user = null;
            return next();
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

        // Get user from database
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                username: true,
                createdAt: true
            }
        });

        if (!user) {
            throw new AuthenticationError('Invalid token');
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            // For JWT errors, allow anonymous access
            req.user = null;
            return next();
        }
        next(error);
    }
};

// Require authentication middleware
export const requireAuth = (req, res, next) => {
    if (!req.user) {
        throw new AuthenticationError('Authentication required');
    }
    next();
};

// Optional authentication middleware (already handled by authenticateToken)
export const optionalAuth = (req, res, next) => {
    // authenticateToken already sets req.user to null if no token
    next();
};
