import express from 'express';
import { ProfileController } from '../controllers/ProfileController.js';
import { authenticateTokenRequired } from '../middleware/authMiddleware.js';
import { sanitizeInput } from '../middleware/validation.js';
import { enhancedRateLimit } from '../middleware/enhancedValidation.js';
// import { csrfProtection } from '../middleware/csrfProtection.js'; // For session-based routes

/**
 * Setup profile management routes
 * @param {Object} app - Express app instance
 * @param {Object} profileController - Profile controller instance
 *
 * CSRF PROTECTION PATTERN:
 * These routes use Bearer token authentication (not session cookies),
 * so CSRF protection is NOT needed.
 *
 * For session-cookie routes, apply CSRF protection like this:
 *
 * OPTION 1: Apply to entire router (all routes need CSRF)
 * ```js
 * import { csrfProtection } from '../middleware/csrfProtection.js';
 * app.use('/api/profile', csrfProtection, router);
 * ```
 *
 * OPTION 2: Apply per-route (selective CSRF)
 * ```js
 * router.post('/api/profile/update',
 *     csrfProtection,  // ← Add CSRF protection here
 *     authenticateTokenRequired,
 *     sanitizeInput,
 *     profileController.updateProfile.bind(profileController)
 * );
 * ```
 */
export const setupProfileRoutes = (app, profileController) => {
    const router = express.Router();

    // Check username availability
    router.post('/api/profile/check-username',
        authenticateTokenRequired,
        sanitizeInput,
        enhancedRateLimit({
            windowMs: 5 * 60 * 1000, // 5 minutes
            maxRequests: 20, // 20 username checks per 5 minutes
            message: 'Username check rate limit exceeded'
        }),
        profileController.checkUsernameAvailability.bind(profileController)
    );

    // Update user profile (username and/or avatar)
    router.put('/api/profile/update',
        authenticateTokenRequired,
        sanitizeInput,
        enhancedRateLimit({
            windowMs: 5 * 60 * 1000, // 5 minutes
            maxRequests: 10, // 10 profile updates per 5 minutes
            message: 'Profile update rate limit exceeded'
        }),
        profileController.updateProfile.bind(profileController)
    );

    // Generate avatar using AI
    router.post('/api/profile/generate-avatar',
        authenticateTokenRequired,
        sanitizeInput,
        enhancedRateLimit({
            windowMs: 5 * 60 * 1000, // 5 minutes
            maxRequests: 5, // 5 avatar generations per 5 minutes
            message: 'Avatar generation rate limit exceeded'
        }),
        profileController.generateAvatar.bind(profileController)
    );

    // Get user's existing images for avatar selection
    router.get('/api/profile/user-images',
        authenticateTokenRequired,
        enhancedRateLimit({
            windowMs: 5 * 60 * 1000, // 5 minutes
            maxRequests: 20, // 20 requests per 5 minutes
            message: 'User images request rate limit exceeded'
        }),
        profileController.getUserImages.bind(profileController)
    );

    // Set avatar from existing image
    router.post('/api/profile/set-avatar',
        authenticateTokenRequired,
        sanitizeInput,
        enhancedRateLimit({
            windowMs: 5 * 60 * 1000, // 5 minutes
            maxRequests: 10, // 10 avatar sets per 5 minutes
            message: 'Avatar set rate limit exceeded'
        }),
        profileController.setAvatarFromImage.bind(profileController)
    );

    // Upload profile picture file
    router.post('/api/profile/upload-avatar',
        authenticateTokenRequired,
        sanitizeInput,
        enhancedRateLimit({
            windowMs: 5 * 60 * 1000, // 5 minutes
            maxRequests: 5, // 5 uploads per 5 minutes
            message: 'Avatar upload rate limit exceeded'
        }),
        profileController.uploadAvatar.bind(profileController)
    );

    // Public user profile page - no authentication required
    router.get('/u/:username', profileController.getPublicProfile.bind(profileController));

    // Public user profile API - get user's public images
    router.get('/api/profile/:username', profileController.getPublicProfileData.bind(profileController));

    app.use(router);
};
