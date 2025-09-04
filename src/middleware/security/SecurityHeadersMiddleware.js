/**
 * Security Headers Middleware
 * Applies security headers to responses
 */

/**
 * Basic security headers
 */
export const securityHeaders = (req, res, next) => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    next();
};

/**
 * Content Security Policy headers
 */
export const contentSecurityPolicy = (options = {}) => {
    const defaultPolicy = {
        'default-src': "'self'",
        'script-src': "'self' 'unsafe-inline' cdn.tailwindcss.com",
        'style-src': "'self' 'unsafe-inline' cdn.tailwindcss.com",
        'img-src': "'self' data: https:",
        'font-src': "'self'",
        'connect-src': "'self'",
        'frame-ancestors': "'none'"
    };

    const policy = { ...defaultPolicy, ...options };
    const policyString = Object.entries(policy)
        .map(([directive, value]) => `${directive} ${value}`)
        .join('; ');

    return (req, res, next) => {
        res.setHeader('Content-Security-Policy', policyString);
        next();
    };
};

/**
 * HSTS (HTTP Strict Transport Security) headers
 */
export const strictTransportSecurity = (maxAge = 31536000) => (req, res, next) => {
    res.setHeader('Strict-Transport-Security', `max-age=${maxAge}; includeSubDomains`);
    next();
};

/**
 * Permissions Policy headers
 */
export const permissionsPolicy = (policies = {}) => {
    const defaultPolicies = {
        camera: '()',
        microphone: '()',
        geolocation: '()',
        payment: '(self)'
    };

    const allPolicies = { ...defaultPolicies, ...policies };
    const policyString = Object.entries(allPolicies)
        .map(([feature, allowlist]) => `${feature}=${allowlist}`)
        .join(', ');

    return (req, res, next) => {
        res.setHeader('Permissions-Policy', policyString);
        next();
    };
};

/**
 * Comprehensive security headers
 */
export const comprehensiveSecurityHeaders = (options = {}) => {
    const {
        csp = {},
        hstsMaxAge = 31536000,
        permissions = {}
    } = options;

    return (req, res, next) => {
        // Apply all security headers
        securityHeaders(req, res, () => {
            contentSecurityPolicy(csp)(req, res, () => {
                strictTransportSecurity(hstsMaxAge)(req, res, () => {
                    permissionsPolicy(permissions)(req, res, next);
                });
            });
        });
    };
};

/**
 * API-specific security headers
 */
export const apiSecurityHeaders = (req, res, next) => {
    // Basic security headers
    securityHeaders(req, res, () => {
        // API-specific headers
        res.setHeader('X-API-Version', '1.0');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        next();
    });
};
