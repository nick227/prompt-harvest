/**
 * MVPAuth - Essential auth security for MVP
 *
 * Focuses on core auth security without over-engineering.
 */

import jwt from 'jsonwebtoken';

export const mvpAuthMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Valid authorization token required'
            });
        }

        const token = authHeader.substring(7);

        if (!token) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Token is required'
            });
        }

        // Basic token validation
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded.userId) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid token format'
            });
        }

        // Add user info to request
        req.user = {
            id: decoded.userId,
            email: decoded.email
        };

        next();

    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Token has expired'
            });
        }

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid token'
            });
        }

        console.error('❌ Auth middleware error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Authentication failed'
        });
    }
};

export const mvpOptionalAuth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            req.user = null;

            return next();
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = {
            id: decoded.userId,
            email: decoded.email
        };

        next();

    } catch (error) {
        // For optional auth, just continue without user
        req.user = null;
        next();
    }
};
