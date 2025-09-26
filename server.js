import express from 'express';
import { setupRoutes } from './src/routes/index.js';
import dotenv from 'dotenv';
import cors from 'cors';
import session from 'express-session';
import passport from './src/config/passport.js';
import { moderateBadWordFilter } from './src/middleware/badWordFilter.js';
import { authenticateToken } from './src/middleware/authMiddleware.js';
import databaseClient from './src/database/PrismaClient.js';
import PrismaSessionStore from './src/config/PrismaSessionStore.js';

dotenv.config(); // Nodemon restart trigger

const app = express();

// Enable CORS for all routes
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? [process.env.FRONTEND_URL || 'https://autoimage.up.railway.app'] : ['http://localhost:3000', 'http://localhost:3200', 'http://127.0.0.1:3000', 'http://127.0.0.1:3200'],
    credentials: true
}));

// Session configuration for OAuth with Prisma store
let sessionStore;

// Initialize database connection first
const initializeDatabase = async () => {
    try {
        await databaseClient.connect();
        console.log('✅ Database connected successfully');

        // Get the connected Prisma client
        const prismaClient = databaseClient.getClient();

        // Test the connection before creating session store
        await prismaClient.$connect();
        console.log('✅ Prisma client connected and ready');

        sessionStore = new PrismaSessionStore({
            prisma: prismaClient,
            ttl: 86400 // 24 hours
        });

        // Configure session middleware
        app.use(session({
            store: sessionStore,
            secret: process.env.SESSION_SECRET || 'your-secret-key',
            resave: false,
            saveUninitialized: false,
            rolling: true, // Reset expiration on activity
            cookie: {
                secure: process.env.NODE_ENV === 'production',
                maxAge: 24 * 60 * 60 * 1000, // 24 hours
                httpOnly: true,
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
            }
        }));

        return true;
    } catch (error) {
        console.error('❌ Database initialization failed:', error);

        return false;
    }
};

// Session cleanup with best practices
const scheduleSessionCleanup = () => {
    if (!sessionStore) {
        return;
    }

    console.log('🕐 Scheduling session cleanup with best practices');

    // Clean up after a short delay to ensure everything is initialized
    setTimeout(performSessionCleanup, 2000);

    // Schedule regular cleanup every 30 minutes (more frequent for better performance)
    setInterval(performSessionCleanup, 30 * 60 * 1000); // 30 minutes

    // Log session stats every hour
    setInterval(logSessionStats, 60 * 60 * 1000); // 1 hour
};

const performSessionCleanup = async () => {
    try {
        const result = await sessionStore.cleanup();

        if (result.success && result.deletedCount > 0) {
            console.log(`🧹 Session cleanup: removed ${result.deletedCount} expired sessions`);
        }
    } catch (error) {
        console.error('Session cleanup failed:', error);
    }
};

const logSessionStats = async () => {
    try {
        const stats = await sessionStore.getStats();

        if (stats) {
            console.log(`📊 Session stats: ${stats.active} active, ${stats.expired} expired, ${stats.total} total`);
        }
    } catch (error) {
        console.error('Session stats logging failed:', error);
    }
};

// CRITICAL: Mount webhook routes BEFORE express.json() middleware
// Webhooks need raw body for signature verification
import webhooksRouter from './src/routes/webhooks.js';
app.use('/webhooks', webhooksRouter);

// Body parsing middleware (after webhooks)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Bad word filter - apply early to catch violations before processing
app.use('/api', moderateBadWordFilter);

// Serve static files BEFORE setting up routes (excluding uploads for security)
app.use(express.static('public'));

// Protected image serving route - must be after static files but before API routes
app.get('/uploads/:filename', authenticateToken, async (req, res) => {
    try {
        const { filename } = req.params;

        // Check if image exists in database and user has permission to view it
        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();

        // Find image by filename
        const image = await prisma.image.findFirst({
            where: {
                imageUrl: {
                    contains: filename
                }
            }
        });

        if (!image) {
            return res.status(404).json({ error: 'Image not found' });
        }

        // Check permissions: user can view if:
        // 1. Image is public, OR
        // 2. User owns the image
        const userId = req.user?.id;
        const canView = image.isPublic || (userId && image.userId === userId);

        if (!canView) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Serve the image file
        const path = require('path');
        const fs = require('fs');
        const imagePath = path.join('public', 'uploads', filename);

        if (!fs.existsSync(imagePath)) {
            return res.status(404).json({ error: 'Image file not found' });
        }

        res.sendFile(path.resolve(imagePath));

    } catch (error) {
        console.error('Error serving image:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

const port = process.env.PORT || 3200;

// Simplified server startup - no migration needed since Railway DB is ready

// Initialize database and start server
const startServer = async () => {
    try {
        // Step 1: Initialize database connection (non-blocking)
        console.log('🔗 Initializing database connection...');
        const dbConnected = await initializeDatabase();

        if (!dbConnected) {
            console.error('⚠️ Database connection failed, but continuing...');
        }

        // Step 2: Initialize Passport after database is ready
        console.log('🔐 Initializing Passport...');
        app.use(passport.initialize());
        app.use(passport.session());

        // Step 3: Initialize WordTypeManager cache (non-blocking)
        console.log('📚 Initializing WordTypeManager...');
        try {
            const { default: wordTypeManager } = await import('./lib/word-type-manager.js');
            await wordTypeManager.initializeDatabase();
            console.log('✅ WordTypeManager initialized');
        } catch (error) {
            console.error('⚠️ WordTypeManager initialization failed:', error.message);
        }

        // Step 4: Schedule session cleanup
        scheduleSessionCleanup();

        // Step 5: Setup routes and start server
        console.log('🛣️ Setting up routes...');
        await setupRoutes(app);

        app.listen(port, '0.0.0.0', () => {
            console.log(`✅ Prompt app listening on port ${port}!`);
            console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`📊 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
        });

    } catch (error) {
        console.error('❌ Server startup failed:', error);

        // Try to start server anyway with minimal setup
        console.log('🔄 Attempting minimal server startup...');
        try {
            await setupRoutes(app);
            app.listen(port, '0.0.0.0', () => {
                console.log(`⚠️ Server started with minimal setup on port ${port}!`);
            });
        } catch (fallbackError) {
            console.error('❌ Fallback server startup failed:', fallbackError);
            process.exit(1);
        }
    }
};

// Start the server
startServer();

export default app;
