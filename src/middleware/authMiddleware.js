import jwt from 'jsonwebtoken';
import { AuthenticationError } from '../errors/CustomErrors.js';
import databaseClient from '../database/PrismaClient.js';

const prisma = databaseClient.getClient();

// JWT authentication middleware - for optional authentication
export const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        console.log('🔐 AUTH MIDDLEWARE: Request details:', {
            path: req.path,
            hasAuthHeader: !!authHeader,
            authHeader: authHeader ? `${authHeader.substring(0, 20)}...` : 'none',
            hasToken: !!token,
            tokenLength: token?.length
        });

        if (!token) {
            // No token provided - allow anonymous access
            req.user = null;

            return next();
        }

        // Require JWT_SECRET for security
        if (!process.env.JWT_SECRET) {
            console.error('🔐 AUTH MIDDLEWARE: JWT_SECRET not configured - rejecting token');

            return res.status(401).json({ error: 'Authentication not configured' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get user from database
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                username: true,
                createdAt: true,
                isAdmin: true
            }
        });

        if (!user) {
            // Invalid user ID in token - user may have been deleted
            req.user = null;

            return next();
        }

        console.log('🔐 AUTH MIDDLEWARE: User authenticated successfully:', {
            userId: user.id,
            email: user.email,
            isAdmin: user.isAdmin
        });
        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            // JWT verification failed - allow anonymous access
            req.user = null;

            return next();
        }
        // Other errors should be passed to error handler
        next(error);
    }
};

// JWT authentication middleware - for required authentication (stricter)
// eslint-disable-next-line max-statements
export const authenticateTokenRequired = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN


        if (!token) {
            const error = new AuthenticationError('Authentication token required');

            return next(error);
        }


        // Require JWT_SECRET for security
        if (!process.env.JWT_SECRET) {
            console.error('🔐 BACKEND: JWT_SECRET not configured - rejecting token');

            return res.status(401).json({ error: 'Authentication not configured' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);


        // Get user from database
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                username: true,
                isAdmin: true,
                isSuspended: true,
                createdAt: true
            }
        });

        if (!user) {

            return next(new AuthenticationError('Invalid token - user not found'));
        }

        if (user.isSuspended) {

            return next(new AuthenticationError('Account suspended'));
        }

        req.user = user;
        next();
    } catch (error) {

        if (error.name === 'JsonWebTokenError') {
            return next(new AuthenticationError('Invalid authentication token'));
        }
        if (error.name === 'TokenExpiredError') {
            return next(new AuthenticationError('Authentication token expired'));
        }
        // Re-throw authentication errors
        if (error instanceof AuthenticationError) {
            return next(error);
        }
        // Other errors should be passed to error handler
        next(error);
    }
};

// Require authentication middleware
export const requireAuth = (req, res, next) => {
    console.log('🔐 REQUIRE-AUTH: Checking authentication for:', req.path);
    console.log('🔐 REQUIRE-AUTH: User data:', {
        hasUser: !!req.user,
        userId: req.user?.id,
        isAdmin: req.user?.isAdmin
    });

    if (!req.user) {
        console.log('🔐 REQUIRE-AUTH: No user found, throwing AuthenticationError');
        return next(new AuthenticationError('Authentication required'));
    }

    console.log('🔐 REQUIRE-AUTH: User authenticated, proceeding');
    next();
};

// Optional authentication middleware (already handled by authenticateToken)
export const optionalAuth = (req, res, next) => {
    // authenticateToken already sets req.user to null if no token
    next();
};
