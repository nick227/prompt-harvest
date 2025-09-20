import express from 'express';
import { setupRoutes } from './src/routes/index.js';
import dotenv from 'dotenv';
import cors from 'cors';
import session from 'express-session';
import passport from './src/config/passport.js';
import { moderateBadWordFilter } from './src/middleware/badWordFilter.js';
import { authenticateToken } from './src/middleware/authMiddleware.js';
import { spawn } from 'child_process';

dotenv.config();

// Debug: Log environment variables
console.log('🔍 SERVER STARTUP: Environment Variables');
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID);
console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET');

const app = express();

// Enable CORS for all routes
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? [process.env.FRONTEND_URL || 'https://dialogica.up.railway.app'] : ['http://localhost:3000', 'http://localhost:3200', 'http://127.0.0.1:3000', 'http://127.0.0.1:3200'],
    credentials: true
}));

// Session configuration for OAuth
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

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

// Railway deployment process
async function runRailwayDeployment() {
    if (process.env.RAILWAY_ENVIRONMENT) {
        console.log('🚀 RAILWAY DEPLOYMENT START');
        console.log('============================');
        console.log(`DATABASE_URL=${process.env.DATABASE_URL ? 'Set' : 'Not set'}`);

        try {
            // Step 1: Push schema
            console.log('📋 Step 1: Pushing schema...');
            await runCommand('npx', ['prisma', 'db', 'push', '--accept-data-loss']);
            console.log('✅ Schema pushed successfully');

            // Step 2: Seed data
            console.log('🌱 Step 2: Seeding data...');
            await runCommand('node', ['railway-deploy-clean.js']);
            console.log('✅ Data seeded successfully');

            // Step 3: Migrate models
            console.log('🔄 Step 3: Migrating models...');
            await runCommand('node', ['scripts/railway-service-migration.js']);
            console.log('✅ Models migrated successfully');

            console.log('============================');
            console.log('🎉 RAILWAY DEPLOYMENT COMPLETE');
            console.log('============================');

        } catch (error) {
            console.error('❌ RAILWAY DEPLOYMENT FAILED:', error.message);
            process.exit(1);
        }
    }
}

function runCommand(command, args) {
    return new Promise((resolve, reject) => {
        const process = spawn(command, args, {
            stdio: 'inherit',
            shell: true
        });

        process.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Command failed with code ${code}`));
            }
        });
    });
}

// Run deployment and start server
runRailwayDeployment().then(() => {
    // Setup routes and start server
    setupRoutes(app).then(() => {
        app.listen(port, () => {
            console.log(`Prompt app listening on port ${port}!`);
        });
    }).catch(error => {
        console.error('Failed to setup routes:', error);
        process.exit(1);
    });
}).catch(error => {
    console.error('Failed to run deployment:', error);
    process.exit(1);
});

export default app;
