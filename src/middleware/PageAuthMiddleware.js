/**
 * Page Authentication Middleware
 * Handles authentication for page routes (HTML responses)
 */

import jwt from 'jsonwebtoken';
import databaseClient from '../database/PrismaClient.js';

const prisma = databaseClient.getClient();

/**
 * Middleware to verify admin access for page routes
 * Checks JWT token from localStorage (sent via cookie or header)
 */
export const requireAdminPage = async (req, res, next) => {
    try {
        let userId = null;
        let user = null;

        // Try to get JWT token from Authorization header (if sent by client)
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (token) {
            try {
                if (!process.env.JWT_SECRET) {
                    throw new Error('JWT_SECRET not configured');
                }

                const decoded = jwt.verify(token, process.env.JWT_SECRET);

                userId = decoded.userId;
                console.log('🔐 PAGE-AUTH: Using JWT token, userId:', userId);
            } catch (jwtError) {
                console.log('🔐 PAGE-AUTH: JWT token invalid:', jwtError.message);
            }
        }

        // Fall back to session authentication if JWT failed
        if (!userId && req.session?.userId) {
            userId = req.session.userId;
            console.log('🔐 PAGE-AUTH: Using session authentication, userId:', userId);
        }

        console.log('🔐 PAGE-AUTH: Authentication check:', {
            path: req.path,
            hasJWT: !!token,
            hasSession: !!req.session?.userId,
            userId
        });

        if (!userId) {
            return res.status(401).send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Authentication Required - AutoImage</title>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <link rel="stylesheet" href="https://cdn.tailwindcss.com">
                </head>
                <body class="bg-gray-800 text-gray-200 min-h-screen flex items-center justify-center">
                    <div class="text-center">
                        <h1 class="text-4xl font-bold text-red-500 mb-4">Authentication Required</h1>
                        <p class="text-xl mb-6">Please log in to access this page.</p>
                        <a href="/login" class="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                            Go to Login
                        </a>
                    </div>
                </body>
                </html>
            `);
        }

        // Get user from database to check admin status
        user = await prisma.user.findUnique({
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
            return res.status(401).send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Invalid Session - AutoImage</title>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <link rel="stylesheet" href="https://cdn.tailwindcss.com">
                </head>
                <body class="bg-gray-800 text-gray-200 min-h-screen flex items-center justify-center">
                    <div class="text-center">
                        <h1 class="text-4xl font-bold text-red-500 mb-4">Invalid Session</h1>
                        <p class="text-xl mb-6">Your session is invalid. Please log in again.</p>
                        <a href="/login" class="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                            Go to Login
                        </a>
                    </div>
                </body>
                </html>
            `);
        }

        // Check if user has admin privileges
        if (!user.isAdmin) {
            return res.status(403).send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Access Denied - AutoImage</title>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <link rel="stylesheet" href="https://cdn.tailwindcss.com">
                </head>
                <body class="bg-gray-800 text-gray-200 min-h-screen flex items-center justify-center">
                    <div class="text-center">
                        <h1 class="text-4xl font-bold text-red-500 mb-4">Access Denied</h1>
                        <p class="text-xl mb-6">Only administrators can access this page.</p>
                        <a href="/blog" class="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                            Return to Blog
                        </a>
                    </div>
                </body>
                </html>
            `);
        }

        // Add user info to request for use in route handlers
        req.user = user;
        req.adminUser = user;

        console.log('🔐 PAGE-AUTH: Admin access granted for user:', user.email);

        return next();

    } catch (error) {
        console.error('🔐 PAGE-AUTH: Authentication error:', error);

        return res.status(500).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Authentication Error - AutoImage</title>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link rel="stylesheet" href="https://cdn.tailwindcss.com">
            </head>
            <body class="bg-gray-800 text-gray-200 min-h-screen flex items-center justify-center">
                <div class="text-center">
                    <h1 class="text-4xl font-bold text-red-500 mb-4">Authentication Error</h1>
                    <p class="text-xl mb-6">An error occurred while verifying your authentication.</p>
                    <a href="/login" class="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                        Go to Login
                    </a>
                </div>
            </body>
            </html>
        `);
    }
};
