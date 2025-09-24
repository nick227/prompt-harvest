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
            console.log('🔐 AUTH MIDDLEWARE: No token provided, allowing anonymous access');
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
                createdAt: true
            }
        });

        if (!user) {
            // Invalid user ID in token - user may have been deleted
            console.log('🔐 BACKEND: User not found for token, treating as anonymous access');
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
            console.log('🔐 BACKEND: JWT verification failed, allowing anonymous access');
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

        console.log('🔐 BACKEND: Auth middleware called for:', req.path);
        console.log('🔐 BACKEND: Auth header:', authHeader ? 'Present' : 'Missing');
        console.log('🔐 BACKEND: JWT_SECRET available:', !!process.env.JWT_SECRET);

        if (!token) {
            console.log('🔐 BACKEND: No token provided');
            const error = new AuthenticationError('Authentication token required');

            return next(error);
        }

        console.log('🔐 BACKEND: Token received, length:', token.length);
        console.log('🔐 BACKEND: Token preview:', `${token.substring(0, 20)}...`);

        // Require JWT_SECRET for security
        if (!process.env.JWT_SECRET) {
            console.error('🔐 BACKEND: JWT_SECRET not configured - rejecting token');
            return res.status(401).json({ error: 'Authentication not configured' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        console.log('🔐 BACKEND: JWT decoded successfully:', { userId: decoded.userId, iat: decoded.iat, exp: decoded.exp });

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
            console.log('🔐 BACKEND: User not found in database for ID:', decoded.userId);

            return next(new AuthenticationError('Invalid token - user not found'));
        }

        if (user.isSuspended) {
            console.log('🔐 BACKEND: User is suspended:', { id: user.id, email: user.email });

            return next(new AuthenticationError('Account suspended'));
        }

        console.log('🔐 BACKEND: User found:', { id: user.id, email: user.email, isAdmin: user.isAdmin });
        req.user = user;
        next();
    } catch (error) {
        console.log('🔐 BACKEND: Authentication error:', error.name, error.message);

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
    if (!req.user) {
        return next(new AuthenticationError('Authentication required'));
    }
    next();
};

// Optional authentication middleware (already handled by authenticateToken)
export const optionalAuth = (req, res, next) => {
    // authenticateToken already sets req.user to null if no token
    next();
};
