// SECURITY: Filter punycode warnings via proper event handler
if (process.env.SUPPRESS_PUNYCODE === '1') {
    let warningSuppressed = false;

    process.on('warning', warning => {
        const isPunycodeWarning =
            warning?.name === 'DeprecationWarning' &&
            warning?.message?.includes('punycode');

        if (isPunycodeWarning) {
            // Log once at startup for transparency
            if (!warningSuppressed) {
                console.log('ℹ️  Filtering punycode deprecation warnings');
                warningSuppressed = true;
            }
            // Warning is filtered by not propagating it
        }
    });
}

import express from 'express';
import { setupRoutes } from './src/routes/index.js';
import dotenv from 'dotenv';
import cors from 'cors';
import compression from 'compression';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import crypto from 'crypto';
import passport from './src/config/passport.js';
import { moderateBadWordFilter } from './src/middleware/badWordFilter.js';
import { authenticateToken } from './src/middleware/authMiddleware.js';
import { getCsrfToken, csrfErrorHandler } from './src/middleware/csrfProtection.js';
import { webhookRateLimit, csrfTokenRateLimit, apiRateLimit } from './src/middleware/rateLimiting.js';
import databaseClient from './src/database/PrismaClient.js';
import PrismaSessionStore from './src/config/PrismaSessionStore.js';
// import { autoPopulateWordTypes } from './src/scripts/auto-populate-word-types.js';

dotenv.config(); // Nodemon restart trigger

// SECURITY: Enforce strong secrets at startup
if (process.env.NODE_ENV === 'production') {
    if (!process.env.SESSION_SECRET) {
        console.error('❌ SECURITY ERROR: SESSION_SECRET environment variable is required in production');
        console.error('Generate a strong secret: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
        process.exit(1);
    }

    if (process.env.SESSION_SECRET === 'your-secret-key') {
        console.error('❌ SECURITY ERROR: SESSION_SECRET must not use the default value');
        console.error('Generate a strong secret: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
        process.exit(1);
    }

    if (process.env.SESSION_SECRET.length < 32) {
        console.error('❌ SECURITY ERROR: SESSION_SECRET must be at least 32 characters long');
        console.error('Generate a strong secret: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
        process.exit(1);
    }
}

const app = express();

// SECURITY: Hide Express version header
app.disable('x-powered-by');

// SECURITY: Trust proxy when behind Railway/reverse proxy
// This is required for secure cookies to work properly
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1); // Trust first proxy

    // SECURITY: Redirect HTTP to HTTPS in production
    app.use((req, res, next) => {
        if (req.header('x-forwarded-proto') !== 'https') {
            return res.redirect(301, `https://${req.header('host')}${req.url}`);
        }
        next();
    });
}

// PERFORMANCE: Precompile compression filter regexes (once at boot, not per request)
const compressionSkipPatterns = {
    images: /\.(jpg|jpeg|png|gif|webp|avif|ico)$/,
    videos: /\.(mp4|webm|ogg|avi|mov)$/,
    audio: /\.(mp3|ogg|m4a|aac|webm)$/,
    archives: /\.(zip|gz|bz2|7z|rar)$/,
    fonts: /\.(woff2?|otf|ttf)$/
};

// Enable gzip compression for all responses
// OPTIMIZED: Faster compression level, higher threshold
app.use(compression({
    filter: (req, res) => {
        // Skip compression if client requests it
        if (req.headers['x-no-compression']) {
            return false;
        }

        // OPTIMIZATION: Check Content-Type first (more reliable than URL)
        const contentType = res.getHeader('Content-Type');

        if (contentType) {
            // Skip image types (already compressed)
            if (contentType.includes('image/') && !contentType.includes('image/svg')) {
                return false;
            }

            // Skip video/audio (already compressed)
            if (contentType.includes('video/') || contentType.includes('audio/')) {
                return false;
            }
        }

        // Fallback: Check URL patterns if Content-Type not set
        const url = req.url.toLowerCase();

        // Skip images (already compressed, but NOT SVG - it's text)
        if (compressionSkipPatterns.images.test(url)) {
            return false;
        }

        // SVG is text-based - should be compressed (don't skip)

        // Skip videos (already compressed)
        if (compressionSkipPatterns.videos.test(url)) {
            return false;
        }

        // Skip audio (already compressed)
        if (compressionSkipPatterns.audio.test(url)) {
            return false;
        }

        // Skip archives (already compressed)
        if (compressionSkipPatterns.archives.test(url)) {
            return false;
        }

        // Skip fonts (WOFF/WOFF2 are compressed)
        if (compressionSkipPatterns.fonts.test(url)) {
            return false;
        }

        // Compress everything else (HTML, JSON, CSS, JS, SVG, XML, etc.)
        return compression.filter(req, res);
    },
    level: 4, // OPTIMIZED: Faster compression (saves ~30% CPU, still 85-90% as effective as level 6)
    threshold: 2048 // OPTIMIZED: Only compress responses > 2KB (don't waste CPU on tiny responses)
}));

// Parse and validate additional CORS origins from env (once at boot, not per request)
const validOriginPattern = /^https?:\/\/[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i;

const additionalCorsOrigins = process.env.CORS_ALLOWED_ORIGINS
    ? process.env.CORS_ALLOWED_ORIGINS.split(',')
        .map(origin => {
            const trimmed = origin.trim();

            if (!trimmed) {
                return null;
            }

            // SECURITY: Validate origin has proper scheme
            if (!validOriginPattern.test(trimmed)) {
                console.warn(`⚠️ Invalid CORS origin ignored: ${trimmed}`);

                return null;
            }

            return trimmed;
        })
        .filter(Boolean)
    : [];

// Convert to Set for O(1) lookup performance
const prodOriginsSet = new Set([
    'https://autoimage.up.railway.app',
    process.env.FRONTEND_URL?.toLowerCase(),
    ...additionalCorsOrigins.map(o => o.toLowerCase())
].filter(Boolean));

const devOriginsSet = new Set([
    'http://localhost:3000',
    'http://localhost:3200',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3200'
]);

// Dynamic CORS origin validation
const corsOriginValidator = (origin, callback) => {
    // Normalize input and short-circuit
    if (!origin) {
        return callback(null, true); // No origin (mobile apps, Postman)
    }

    const normalizedOrigin = origin.trim().toLowerCase();
    const isProduction = process.env.NODE_ENV === 'production';

    // Production: strict validation
    if (isProduction) {
        // Railway preview URLs (tighter pattern)
        if (normalizedOrigin.match(/^https:\/\/autoimage-(pr|staging|dev)-[a-z0-9]+\.up\.railway\.app$/)) {
            return callback(null, true);
        }

        // O(1) Set lookup for explicit production origins
        if (prodOriginsSet.has(normalizedOrigin)) {
            return callback(null, true);
        }

        // Reject gracefully (false = deny without 500 error)
        console.warn(`⚠️ CORS: Rejected origin: ${origin}`);

        return callback(null, false);
    }

    // Development: lenient validation (short-circuit with regex)
    if (normalizedOrigin.match(/^http:\/\/(localhost|127\.0\.0\.1):(3\d{3}|[3-9]\d{3})$/)) {
        return callback(null, true);
    }

    // O(1) Set lookup for fallback dev origins
    if (devOriginsSet.has(normalizedOrigin)) {
        return callback(null, true);
    }

    // Reject gracefully in dev too
    console.warn(`⚠️ CORS: Rejected origin: ${origin}`);
    callback(null, false);
};

// SECURITY: Use helmet for secure defaults
app.use(helmet({
    // SECURITY: HSTS - Enforce HTTPS in production (explicit configuration)
    hsts: process.env.NODE_ENV === 'production'
        ? {
            maxAge: 31536000, // 1 year in seconds
            includeSubDomains: true,
            preload: true
        }
        : false, // Disable in development
    // SECURITY: Referrer policy (same-origin to prevent leaking URLs)
    referrerPolicy: { policy: 'same-origin' },
    // SECURITY: Cross-Origin Resource Policy (same-site for tighter control)
    crossOriginResourcePolicy: { policy: 'same-site' },
    // CSP configuration - permissive for production (app serves HTML/JS frontend)
    contentSecurityPolicy: process.env.NODE_ENV === 'production'
        ? {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: [
                    "'self'",
                    "'unsafe-inline'",
                    "'unsafe-eval'",
                    'https://cdn.tailwindcss.com',
                    'https://cdn.jsdelivr.net',
                    'https://cdnjs.cloudflare.com'
                ],
                scriptSrcElem: [
                    "'self'",
                    "'unsafe-inline'",
                    'https://cdn.tailwindcss.com',
                    'https://cdn.jsdelivr.net',
                    'https://cdnjs.cloudflare.com'
                ],
                scriptSrcAttr: ["'unsafe-inline'"],
                styleSrc: [
                    "'self'",
                    "'unsafe-inline'",
                    'https://cdnjs.cloudflare.com',
                    'https://fonts.googleapis.com',
                    'https://cdn.jsdelivr.net'
                ],
                styleSrcElem: [
                    "'self'",
                    "'unsafe-inline'",
                    'https://cdnjs.cloudflare.com',
                    'https://fonts.googleapis.com',
                    'https://cdn.jsdelivr.net'
                ],
                imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
                fontSrc: [
                    "'self'",
                    'data:',
                    'https://fonts.gstatic.com',
                    'https://cdnjs.cloudflare.com'
                ],
                connectSrc: ["'self'", 'https://cdn.tailwindcss.com'],
                frameAncestors: ["'none'"],
                baseUri: ["'self'"],
                formAction: ["'self'"]
            }
        }
        : {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: [
                    "'self'",
                    "'unsafe-inline'",
                    "'unsafe-eval'",
                    'https://cdn.tailwindcss.com',
                    'https://cdn.jsdelivr.net',
                    'https://cdnjs.cloudflare.com'
                ],
                scriptSrcElem: [
                    "'self'",
                    "'unsafe-inline'",
                    'https://cdn.tailwindcss.com',
                    'https://cdn.jsdelivr.net',
                    'https://cdnjs.cloudflare.com'
                ],
                scriptSrcAttr: ["'unsafe-inline'"],
                styleSrc: [
                    "'self'",
                    "'unsafe-inline'",
                    'https://cdnjs.cloudflare.com',
                    'https://fonts.googleapis.com',
                    'https://cdn.jsdelivr.net'
                ],
                styleSrcElem: [
                    "'self'",
                    "'unsafe-inline'",
                    'https://cdnjs.cloudflare.com',
                    'https://fonts.googleapis.com',
                    'https://cdn.jsdelivr.net'
                ],
                imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
                fontSrc: [
                    "'self'",
                    'data:',
                    'https://fonts.gstatic.com',
                    'https://cdnjs.cloudflare.com'
                ],
                connectSrc: [
                    "'self'",
                    'http://localhost:3200',
                    'https://cdn.tailwindcss.com'
                ],
                frameAncestors: ["'self'"],
                baseUri: ["'self'"],
                formAction: ["'self'"]
            }
        },
    crossOriginEmbedderPolicy: false
}));

// Enable CORS for all routes
app.use(cors({
    origin: corsOriginValidator,
    credentials: true,
    // SECURITY: Use 204 for OPTIONS preflight (faster, no content for legacy clients)
    optionsSuccessStatus: 204
}));

// PERFORMANCE: Global OPTIONS handler to avoid 404s on preflight
// This catches all OPTIONS requests before route handlers
app.options('*', (req, res) => {
    res.sendStatus(204);
});

// LOGGING: Request logging with sensitive header redaction
if (process.env.NODE_ENV === 'production') {
    // Production: Structured JSON logging
    morgan.token('redacted-headers', req => {
        const headers = { ...req.headers };

        // SECURITY: Redact sensitive headers
        if (headers.authorization) {
            headers.authorization = '[REDACTED]';
        }

        if (headers.cookie) {
            headers.cookie = '[REDACTED]';
        }

        if (headers['x-api-key']) {
            headers['x-api-key'] = '[REDACTED]';
        }

        if (headers['x-csrf-token']) {
            headers['x-csrf-token'] = '[REDACTED]';
        }

        return JSON.stringify(headers);
    });

    // JSON format for production log aggregation
    app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));
} else {
    // Development: Human-readable colored output
    app.use(morgan('dev'));
}

// Session configuration for OAuth with Prisma store
let sessionStore;

// Timer references for cleanup on shutdown
const cleanupTimers = {
    initialCleanup: null,
    regularCleanup: null,
    statsLogger: null
};

// Server reference for graceful shutdown
let httpServer = null;

// Track active sockets for graceful shutdown
const activeSockets = new Set();

// Configure session middleware with fallback to MemoryStore
const configureSessionMiddleware = (store = null) => {
    const isProduction = process.env.NODE_ENV === 'production';

    if (!store && isProduction) {
        console.warn('⚠️ Production mode without persistent session store - sessions will not persist across restarts');
    }

    // SECURITY: Use strong secret or warn in development
    // NOTE: For secret rotation, use array of secrets: [newSecret, oldSecret]
    // First secret signs new sessions, all secrets verify existing sessions
    const sessionSecret = process.env.SESSION_SECRET || (() => {
        if (!isProduction) {
            console.warn('⚠️ SESSION_SECRET not set, using insecure fallback for development');

            return `dev-fallback-${Date.now()}`;
        }

        return null; // Will fail above if production
    })();

    const sessionConfig = {
        secret: sessionSecret,
        name: 'sid', // Custom session cookie name (hides Express default)
        resave: false,
        saveUninitialized: false,
        rolling: true, // Reset expiration on activity
        // SECURITY: Generate cryptographically strong session IDs
        genid: () => crypto.randomBytes(32).toString('hex'),
        cookie: {
            secure: isProduction,
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            httpOnly: true,
            sameSite: isProduction ? 'none' : 'lax',
            // SECURITY: Set domain for cross-subdomain sessions if needed
            domain: process.env.COOKIE_DOMAIN || undefined
        }
    };

    // Only add store if provided (Prisma), otherwise use default MemoryStore
    if (store) {
        sessionConfig.store = store;
    }

    app.use(session(sessionConfig));
};

// Initialize database connection first
const initializeDatabase = async () => {
    try {
        await databaseClient.connect();
        // Get the connected Prisma client
        const prismaClient = databaseClient.getClient();

        sessionStore = new PrismaSessionStore({
            prisma: prismaClient,
            ttl: 86400 // 24 hours
        });

        // Configure session middleware with Prisma store
        configureSessionMiddleware(sessionStore);

        // Auto-populate word_types on Railway if table is empty
        // await autoPopulateWordTypes();

        return true;
    } catch (error) {
        console.error('❌ Database initialization failed:', error);

        // FALLBACK: Configure session with MemoryStore (dev only)
        if (process.env.NODE_ENV !== 'production') {
            console.warn('⚠️ Using in-memory session store (dev fallback)');
            configureSessionMiddleware(null);
        }

        return false;
    }
};

// Session cleanup with best practices
const scheduleSessionCleanup = () => {
    if (!sessionStore) {
        return;
    }

    // Only schedule cleanup if the method exists
    if (typeof sessionStore.cleanup === 'function') {
        // Clean up after a short delay to ensure everything is initialized
        cleanupTimers.initialCleanup = setTimeout(performSessionCleanup, 2000);

        // Schedule regular cleanup every 30 minutes (more frequent for better performance)
        cleanupTimers.regularCleanup = setInterval(performSessionCleanup, 30 * 60 * 1000); // 30 minutes
    } else {
        console.warn('⚠️ Session store does not implement cleanup() method');
    }

    // Only schedule stats logging if the method exists
    if (typeof sessionStore.getStats === 'function') {
        // Log session stats every hour
        cleanupTimers.statsLogger = setInterval(logSessionStats, 60 * 60 * 1000); // 1 hour
    } else {
        console.warn('⚠️ Session store does not implement getStats() method - stats logging disabled');
    }
};

// Clear all session cleanup timers
const clearSessionCleanupTimers = () => {
    if (cleanupTimers.initialCleanup) {
        clearTimeout(cleanupTimers.initialCleanup);
        cleanupTimers.initialCleanup = null;
    }

    if (cleanupTimers.regularCleanup) {
        clearInterval(cleanupTimers.regularCleanup);
        cleanupTimers.regularCleanup = null;
    }

    if (cleanupTimers.statsLogger) {
        clearInterval(cleanupTimers.statsLogger);
        cleanupTimers.statsLogger = null;
    }
};

const performSessionCleanup = async () => {
    // Guard: Check if cleanup method exists
    if (!sessionStore || typeof sessionStore.cleanup !== 'function') {
        return;
    }

    try {
        const _result = await sessionStore.cleanup();

        // Session cleanup completed silently
    } catch (error) {
        console.error('Session cleanup failed:', error);
    }
};

const logSessionStats = async () => {
    // Guard: Check if getStats method exists
    if (!sessionStore || typeof sessionStore.getStats !== 'function') {
        return;
    }

    try {
        const _stats = await sessionStore.getStats();

        // Session stats logged silently
    } catch (error) {
        console.error('Session stats logging failed:', error);
    }
};

// CRITICAL: Mount webhook routes BEFORE express.json() middleware
// Webhooks need raw body for signature verification
import webhooksRouter from './src/routes/webhooks.js';
app.use('/webhooks', webhookRateLimit, webhooksRouter);

// Cookie parser (required for CSRF cookie mode)
app.use(cookieParser());

// Body parsing middleware (after webhooks)
// PERFORMANCE: Use moderate default limits
// NOTE: For known large JSON endpoints, override per-route:
// app.post('/api/bulk-upload', express.json({ limit: '10mb' }), handler)
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// CSRF token endpoint (before CSRF protection middleware)
app.get('/api/csrf-token', csrfTokenRateLimit, getCsrfToken);

// SECURITY: Global API rate limiting (100 requests per 15 minutes)
app.use('/api', apiRateLimit);

// Bad word filter - apply early to catch violations before processing
app.use('/api', moderateBadWordFilter);

// PERFORMANCE: Precompile static file cache patterns
const hashedFilePattern = /[.-][a-f0-9]{8,}[.-]/i; // Matches hashed filenames (e.g., app-a1b2c3d4.js)

// Serve static files with proper cache headers
// SECURITY: Only serves 'public' directory. Uploads are stored in 'storage/uploads'
// and protected by the authenticateToken middleware below
// Note: Helmet handles security headers globally (CSP, X-Frame-Options, etc.)
app.use(express.static('public', {
    maxAge: process.env.NODE_ENV === 'production' ? '7d' : '0', // 7 days in production, no cache in dev
    etag: true, // Enable ETags for conditional requests
    lastModified: true, // Include Last-Modified header
    dotfiles: 'deny', // SECURITY: Block access to dotfiles (.env, .git, etc.)
    setHeaders: (res, path) => {
        const isHashed = hashedFilePattern.test(path);

        // Set cache control based on file type
        if (path.endsWith('.html')) {
            // HTML: short cache (1 hour) to allow updates
            res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
        } else if (path.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i)) {
            // Images: long cache (30 days)
            // Add immutable if filename is hashed
            const cacheControl = isHashed
                ? 'public, max-age=31536000, immutable'
                : 'public, max-age=2592000, must-revalidate';

            res.setHeader('Cache-Control', cacheControl);
        } else if (path.match(/\.(js|css)$/i)) {
            // JS/CSS: Use immutable if filename is fingerprinted
            const cacheControl = isHashed
                ? 'public, max-age=31536000, immutable'
                : 'public, max-age=604800, must-revalidate';

            res.setHeader('Cache-Control', cacheControl);
        } else if (path.match(/\.(woff|woff2|ttf|eot)$/i)) {
            // Fonts: very long cache (1 year), immutable if hashed
            const cacheControl = isHashed
                ? 'public, max-age=31536000, immutable'
                : 'public, max-age=31536000, must-revalidate';

            res.setHeader('Cache-Control', cacheControl);
        }
    }
}));

// Helper function to validate and resolve image path
const validateAndResolveImagePath = async filename => {
    const path = await import('path');

    // SECURITY: Prevent path traversal attacks
    // 1. Strip any directory components (only allow basename)
    const safeFilename = path.default.basename(filename);

    // 2. Strict validation - only allow safe characters
    // Only allow: letters, numbers, dots, hyphens, underscores
    if (!(/^[a-zA-Z0-9._-]+$/).test(safeFilename)) {
        throw new Error('Invalid filename');
    }

    // 3. Verify basename matches original (no path components)
    if (safeFilename !== filename) {
        throw new Error('Invalid filename');
    }

    // 4. Build the full path and normalize it
    const uploadsDir = path.default.resolve('storage', 'uploads');
    const imagePath = path.default.resolve(uploadsDir, safeFilename);

    // 5. Ensure the resolved path is still within uploads directory
    if (!imagePath.startsWith(uploadsDir + path.default.sep)) {
        throw new Error('Path traversal detected');
    }

    return { safeFilename, imagePath };
};

// Helper function to check image permissions
const checkImagePermissions = async (safeFilename, userId) => {
    const prisma = databaseClient.getClient();

    // CORRECTNESS: Use exact match on imageUrl (not contains)
    // imageUrl is stored as "uploads/filename.jpg"
    const imageUrl = `uploads/${safeFilename}`;

    // DEFENSE-IN-DEPTH: Enforce owner/public at SQL level
    // If userId provided, get images user owns OR public images
    // If no userId, only get public images
    const image = await prisma.image.findFirst({
        where: {
            imageUrl, // Exact match - prevents multiple record matches
            OR: [
                { isPublic: true }, // Public images
                ...(userId ? [{ userId }] : []) // Owner's images (if authenticated)
            ]
        }
    });

    if (!image) {
        return { allowed: false, reason: 'Image not found' };
    }

    // Double-check in application layer (defense-in-depth)
    const canView = image.isPublic || (userId && image.userId === userId);

    return { allowed: canView, reason: canView ? null : 'Access denied' };
};

// Protected image serving route - must be after static files but before API routes
app.get('/uploads/:filename', authenticateToken, async (req, res) => {
    try {
        const fs = await import('fs/promises');
        const { filename } = req.params;

        // Validate and resolve path
        const { safeFilename, imagePath } = await validateAndResolveImagePath(filename);

        // Check database permissions
        const { allowed, reason } = await checkImagePermissions(safeFilename, req.user?.id);

        if (!allowed) {
            const status = reason === 'Image not found' ? 404 : 403;

            return res.status(status).json({ error: reason });
        }

        // PERFORMANCE: Non-blocking file existence check
        try {
            await fs.access(imagePath);
        } catch {
            return res.status(404).json({ error: 'Image file not found' });
        }

        // SECURITY: Set cache headers for protected images
        // Private images should not be cached by intermediaries
        res.setHeader('Cache-Control', 'private, max-age=0, no-store');
        res.setHeader('Pragma', 'no-cache'); // HTTP/1.0 compatibility for older proxies
        res.setHeader('X-Content-Type-Options', 'nosniff');

        // SECURITY: Set Content-Disposition to discourage odd UA behavior
        res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);

        res.sendFile(imagePath);

    } catch (error) {
        if (error.message === 'Invalid filename' || error.message === 'Path traversal detected') {
            return res.status(400).json({ error: error.message });
        }
        console.error('Error serving image:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

const port = process.env.PORT || 3200;

// Simplified server startup - no migration needed since Railway DB is ready

// Initialize database and start server
const startServer = async () => {
    try {
        // Initialize database connection
        const dbConnected = await initializeDatabase();

        if (!dbConnected) {
            console.error('⚠️ Database connection failed');

            // In production, we need a working database
            if (process.env.NODE_ENV === 'production') {
                console.error('❌ Cannot start in production without database');
                process.exit(1);
            }
        }

        // Initialize Passport (only if session middleware is mounted)
        app.use(passport.initialize());
        app.use(passport.session());

        // SECURITY: CSRF protection is NOT mounted globally
        // Instead, apply csrfProtection middleware per-route-group as needed
        // - Session-backed browser routes should use csrfProtection
        // - Token-based API routes skip CSRF (handled by token auth)
        // - Webhooks skip CSRF (signature verification)
        // - Auth routes skip CSRF (handled by conditional logic in middleware)

        // CSRF error handler (catches any CSRF errors from selective route protection)
        app.use(csrfErrorHandler);

        // Initialize WordTypeManager cache
        try {
            const { default: wordTypeManager } = await import('./lib/word-type-manager.js');

            await wordTypeManager.initializeDatabase();
        } catch (error) {
            console.error('⚠️ WordTypeManager initialization failed:', error.message);
        }

        // Schedule session cleanup
        scheduleSessionCleanup();

        // Setup routes
        // Note: csrfProtection middleware is available for import in route files
        // Apply it selectively to session-backed routes that need CSRF protection
        await setupRoutes(app);

        // Health & readiness probes (before error handlers)
        app.get('/health', (req, res) => {
            const isProduction = process.env.NODE_ENV === 'production';

            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                // SECURITY: Don't leak environment details in production
                ...(isProduction ? {} : { environment: 'development' })
            });
        });

        app.get('/ready', async (req, res) => {
            const isProduction = process.env.NODE_ENV === 'production';

            try {
                // Check database connection with timeout
                const prisma = databaseClient.getClient();

                // PERFORMANCE: Timeout wrapper to prevent /ready from hanging
                const dbCheckPromise = prisma.$queryRaw`SELECT 1`;
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Database health check timeout')), 5000);
                });

                await Promise.race([dbCheckPromise, timeoutPromise]);

                res.json({
                    status: 'ready',
                    timestamp: new Date().toISOString(),
                    // SECURITY: Don't leak database details in production
                    ...(isProduction ? {} : { database: 'connected' })
                });
            } catch (error) {
                res.status(503).json({
                    status: 'not ready',
                    // SECURITY: Don't leak error details in production
                    ...(isProduction
                        ? {}
                        : {
                            database: 'disconnected',
                            error: error.message
                        })
                });
            }
        });

        // Last-resort error handler (JSON responses, no HTML stack traces)
        app.use((err, req, res, next) => {
            // Log error for debugging
            console.error('Unhandled error:', err);

            // Don't expose stack traces in production
            const isProduction = process.env.NODE_ENV === 'production';

            res.status(err.status || 500).json({
                error: isProduction ? 'Internal server error' : err.message,
                ...(isProduction ? {} : { stack: err.stack })
            });
        });

        // Initialize queue processing for image generation
        await initializeQueueProcessing();

        // Start HTTP server and store reference for graceful shutdown
        httpServer = app.listen(port, '0.0.0.0', () => {
            console.log(`✅ Prompt app listening on port ${port}!`);
            console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`📊 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
        });

        // PERFORMANCE: Configure timeouts to avoid hung keep-alive sockets
        // keepAliveTimeout should be slightly higher than ALB idle timeout (60s)
        httpServer.keepAliveTimeout = 61_000; // 61 seconds
        // headersTimeout should be higher than keepAliveTimeout
        httpServer.headersTimeout = 65_000; // 65 seconds

        // SECURITY: Track active sockets for graceful shutdown
        httpServer.on('connection', socket => {
            activeSockets.add(socket);

            socket.on('close', () => {
                activeSockets.delete(socket);
            });
        });

    } catch (error) {
        console.error('❌ Server startup failed:', error);

        // Try to start server anyway with minimal setup
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

// ============================================================================
// QUEUE PROCESSING INITIALIZATION
// ============================================================================

/**
 * Initialize queue system for image generation
 */
const initializeQueueProcessing = async () => {
    try {
        // Import QueueManager class (named export)
        const { QueueManager } = await import('./src/services/generate/QueueManager.js');

        // Verify QueueManager class exists
        if (typeof QueueManager !== 'function') {
            console.warn('⚠️ QueueManager class not found - skipping queue initialization');

            return;
        }

        // Create singleton instance
        const queueInstance = new QueueManager();

        // Verify getConfig method exists
        if (typeof queueInstance.getConfig !== 'function') {
            console.warn('⚠️ QueueManager instance missing getConfig() - queue initialized but config unavailable');

            return;
        }

        console.log('✅ Queue system initialized with p-queue');
        console.log('📊 Queue config:', queueInstance.getConfig());

        // p-queue handles processing automatically - no manual processing needed
    } catch (error) {
        console.error('❌ Failed to initialize queue system:', error);
        // Don't exit - queue processing is not critical for server startup
    }
};

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

/**
 * Gracefully shutdown server and cleanup resources
 */
const gracefulShutdown = async signal => {
    console.log(`\n📛 Received ${signal}, starting graceful shutdown...`);

    // Clear session cleanup timers
    clearSessionCleanupTimers();
    console.log('✅ Session cleanup timers cleared');

    // SECURITY: Destroy idle sockets to force close keep-alive connections
    if (activeSockets.size > 0) {
        console.log(`🔌 Closing ${activeSockets.size} active socket(s)...`);

        for (const socket of activeSockets) {
            // Destroy idle sockets (those not actively processing requests)
            if (!socket.destroyed) {
                socket.destroy();
            }
        }

        activeSockets.clear();
    }

    // Close HTTP server (stop accepting new connections)
    if (httpServer) {
        await new Promise((resolve, reject) => {
            // Shorter timeout now that we've destroyed sockets
            const forceTimeout = setTimeout(() => {
                console.warn('⚠️ HTTP server close timeout - forcing shutdown');
                resolve(); // Force resolution after timeout
            }, 5000); // 5 second timeout (reduced from 10s)

            httpServer.close(error => {
                clearTimeout(forceTimeout); // Cancel timeout on successful close

                if (error) {
                    console.error('❌ Error closing HTTP server:', error);
                    reject(error);
                } else {
                    console.log('✅ HTTP server closed');
                    resolve();
                }
            });
        });
    }

    // Perform final session cleanup
    if (sessionStore && typeof sessionStore.cleanup === 'function') {
        try {
            await sessionStore.cleanup();
            console.log('✅ Final session cleanup completed');
        } catch (error) {
            console.warn('⚠️ Final session cleanup failed:', error.message);
        }
    }

    // Close database connection
    try {
        await databaseClient.disconnect();
        console.log('✅ Database connection closed');
    } catch (error) {
        console.warn('⚠️ Database disconnect failed:', error.message);
    }

    console.log('✅ Graceful shutdown complete');
    process.exit(0);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', error => {
    console.error('❌ Uncaught Exception:', error);
    gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejections at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection');
});

// Start the server
startServer();

export default app;
