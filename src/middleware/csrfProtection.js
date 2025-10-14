/**
 * CSRF Protection Middleware
 *
 * Protects session-backed browser routes from Cross-Site Request Forgery attacks.
 *
 * ============================================================================
 * USAGE - SELECTIVE APPLICATION (RECOMMENDED):
 * ============================================================================
 * Apply per-route or per-route-group, NOT globally:
 *
 * ```js
 * import { csrfProtection } from './middleware/csrfProtection.js';
 *
 * // Apply to specific route groups that use session cookies
 * app.use('/profile', csrfProtection, profileRoutes);
 * app.use('/settings', csrfProtection, settingsRoutes);
 *
 * // Or per-route
 * app.post('/api/profile/update', csrfProtection, updateProfile);
 * ```
 *
 * ⚠️ DO NOT mount globally with app.use(csrfProtection) - use selective application
 *
 * ============================================================================
 * PREREQUISITES (REQUIRED):
 * ============================================================================
 * 1. cookie-parser middleware must be mounted BEFORE this
 * 2. session middleware must be mounted BEFORE this
 *
 * ============================================================================
 * SCOPING - WHAT GETS PROTECTED:
 * ============================================================================
 * ✅ Session-cookie browser routes (form submissions, OAuth callbacks)
 * ✅ State-changing methods: POST, PUT, DELETE, PATCH
 * ✅ Routes without Bearer/API-Key authentication
 *
 * ============================================================================
 * SCOPING - WHAT GETS EXCLUDED (SAFETY NET):
 * ============================================================================
 * The middleware includes conditional skips as a safety net:
 * ❌ OPTIONS requests (preflight) - Always excluded
 * ❌ GET/HEAD requests (safe methods) - Always excluded
 * ❌ Webhook routes (/webhooks/*) - Have signature verification
 * ❌ Auth routes (/api/auth/*) - Initial authentication flows
 * ❌ CSRF token endpoint (/api/csrf-token) - Bootstrap endpoint
 * ❌ Bearer token routes (Authorization: Bearer ...) - Token-based auth
 * ❌ API-Key routes (X-API-Key: ...) - Token-based auth
 * ❌ Multipart file uploads - Different CSRF mechanism
 *
 * ============================================================================
 * CLIENT USAGE - IMPORTANT:
 * ============================================================================
 * For session-backed requests, include CSRF token via:
 *
 * 1. RECOMMENDED: Header (works with all content-types)
 *    fetch('/api/profile/update', {
 *        method: 'POST',
 *        headers: {
 *            'Content-Type': 'application/json',
 *            'X-CSRF-Token': csrfToken  // ← Use this exact header
 *        },
 *        credentials: 'include',  // ← Required for cookies
 *        body: JSON.stringify(data)
 *    });
 *
 * 2. Alternative: Body field (forms only)
 *    <input type="hidden" name="_csrf" value="${csrfToken}">
 *
 * 3. Get Token:
 *    GET /api/csrf-token → { "csrfToken": "..." }
 *
 * ============================================================================
 * EXAMPLES:
 * ============================================================================
 *
 * PROTECTED (needs CSRF token when middleware applied):
 * - POST /api/profile/update (session-backed)
 * - POST /auth/google/callback (OAuth session)
 * - PUT /api/settings (session-backed)
 *
 * EXCLUDED (skipped even if middleware applied):
 * - POST /api/images (Bearer token in header)
 * - OPTIONS /api/anything (preflight)
 * - GET /api/images (safe method)
 * - POST /webhooks/stripe (signature verified)
 * - POST /api/auth/login (auth route)
 */

import { doubleCsrf } from 'csrf-csrf';

// CSRF configuration
const {
    invalidCsrfTokenError,
    generateToken,
    doubleCsrfProtection
} = doubleCsrf({
    getSecret: () => process.env.CSRF_SECRET || process.env.SESSION_SECRET,
    cookieName: '__Host-psifi.x-csrf-token',
    cookieOptions: {
        // SECURITY: Use 'strict' in production, 'lax' in dev for ease of testing
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        path: '/',
        // SECURITY: Secure flag required in production (enforced by __Host- prefix)
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true
    },
    size: 64,
    ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
    getTokenFromRequest: req => req.headers['x-csrf-token'] || req.body?._csrf
});

/**
 * Check if route should be protected by CSRF
 *
 * SCOPING STRATEGY:
 * Only protect session-backed browser routes that:
 * 1. Use state-changing methods (POST, PUT, DELETE, PATCH)
 * 2. Rely on session cookies for authentication (not tokens)
 * 3. Are not webhooks or special routes
 *
 * This ensures:
 * - OPTIONS preflight requests work (already excluded by ignoredMethods)
 * - Bearer token API calls work (skip CSRF)
 * - API-Key authenticated routes work (skip CSRF)
 * - Webhook signature verification works (skip CSRF)
 * - Session-based form submissions are protected (apply CSRF)
 */
const shouldProtectRoute = req => {
    const path = req.path;

    // 1. Exclude webhooks (they have signature verification)
    if (path.startsWith('/webhooks')) {
        return false;
    }

    // 2. Exclude CSRF token endpoint itself (cannot require token to get token)
    if (path === '/api/csrf-token') {
        return false;
    }

    // 3. Exclude auth routes (login, register, password reset)
    // These routes typically run before CSRF tokens are acquired
    if (path.startsWith('/api/auth/login') ||
        path.startsWith('/api/auth/register') ||
        path.startsWith('/api/auth/forgot-password') ||
        path.startsWith('/api/auth/reset-password') ||
        path.startsWith('/api/auth/google')) {
        return false;
    }

    // 4. Exclude token-authenticated routes (Bearer, API-Key, etc.)
    const authHeader = req.headers.authorization;
    const apiKeyHeader = req.headers['x-api-key'];

    if (authHeader?.startsWith('Bearer ') || apiKeyHeader) {
        return false;
    }

    // 5. Exclude multipart file uploads (different CSRF mechanism)
    const contentType = req.headers['content-type'];

    if (path.includes('/upload') && contentType?.includes('multipart')) {
        return false;
    }

    // 6. Exclude OPTIONS (preflight) - already handled by ignoredMethods but double-check
    if (req.method === 'OPTIONS') {
        return false;
    }

    // 7. PROTECT: Session-backed browser routes
    // These rely on cookies for auth and need CSRF protection
    return true;
};

/**
 * Conditional CSRF middleware
 */
export const csrfProtection = (req, res, next) => {
    // Skip CSRF for routes that don't need it
    if (!shouldProtectRoute(req)) {
        return next();
    }

    // Apply CSRF protection
    doubleCsrfProtection(req, res, error => {
        if (error) {
            // CSRF validation failed
            console.warn('CSRF validation failed:', {
                path: req.path,
                method: req.method,
                ip: req.ip
            });

            return res.status(403).json({
                error: 'Invalid CSRF token',
                message: 'Your session may have expired. Please refresh the page and try again.'
            });
        }

        next();
    });
};

/**
 * Generate CSRF token for client
 */
export const getCsrfToken = (req, res) => {
    const token = generateToken(req, res);

    res.json({
        csrfToken: token
    });
};

/**
 * Error handler for CSRF errors
 */
export const csrfErrorHandler = (err, req, res, next) => {
    if (err === invalidCsrfTokenError) {
        return res.status(403).json({
            error: 'Invalid CSRF token',
            message: 'Your session may have expired. Please refresh the page and try again.'
        });
    }

    next(err);
};

