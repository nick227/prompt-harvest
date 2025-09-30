import { asyncHandler } from '../middleware/errorHandler.js';
import { ValidationError, AuthenticationError, NotFoundError } from '../errors/CustomErrors.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import passport from '../config/passport.js';
import databaseClient from '../database/PrismaClient.js';
import emailService from '../services/EmailService.js';
import { rateLimitPasswordReset, rateLimitLogin } from '../middleware/rateLimitMiddleware.js';
import { authenticateTokenRequired } from '../middleware/authMiddleware.js';
import SimplifiedCreditService from '../services/credit/SimplifiedCreditService.js';
import systemSettingsService from '../services/SystemSettingsService.js';

const prisma = databaseClient.getClient();

// Helper function to generate JWT token
const generateToken = userId => jwt.sign({ userId }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '7d'
});

// Helper function to validate email format
const isValidEmail = email => {
    const re = new RegExp(
        '^(([^<>()[\\]\\\\.,;:\\s@"]+(\\.[^<>()[\\]\\\\.,;:\\s@"]+)*)|(".+"))@' +
        '((\\[[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\])|' +
        '(([a-zA-Z\\-0-9]+\\.)+[a-zA-Z]{2,}))$'
    );

    return re.test(String(email).toLowerCase());
};

// Register new user
// eslint-disable-next-line
export const register = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
        throw new ValidationError('Email and password are required');
    }

    if (!isValidEmail(email)) {
        throw new ValidationError('Please enter a valid email address');
    }

    if (password.length < 6) {
        throw new ValidationError('Password must be at least 6 characters long');
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
        where: { email: email.toLowerCase() }
    });

    if (existingUser) {
        throw new ValidationError('User with this email already exists');
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await prisma.user.create({
        data: {
            email: email.toLowerCase(),
            password: hashedPassword,
            username: email.split('@')[0] // Generate username from email
        },
        select: {
            id: true,
            email: true,
            username: true,
            createdAt: true
        }
    });

    // Generate token
    const token = generateToken(user.id);

    // Add welcome bonus credits (don't block registration if this fails)
    try {
        // Get dynamic welcome credits from system settings
        const welcomeCredits = await systemSettingsService.get('new_user_welcome_credits', 100);

        await SimplifiedCreditService.addCredits(
            user.id,
            welcomeCredits, // Dynamic welcome bonus credits
            'welcome_bonus',
            `Welcome to Image Harvest! Enjoy ${welcomeCredits} free credits to get started.`,
            {
                registrationDate: new Date().toISOString(),
                bonusType: 'new_user_welcome',
                credits: welcomeCredits
            }
        );
    } catch (error) {
        console.error('❌ WELCOME: Failed to add welcome credits:', error);
        // Don't throw - registration should still succeed even if credit addition fails
    }

    // Send welcome email (don't block registration if email fails)
    try {
        await emailService.sendWelcomeEmail(user.email, user.username);
    } catch (error) {
        console.warn('Welcome email failed:', error.message);
    }

    res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
            user: {
                id: user.id,
                email: user.email,
                username: user.username
            },
            token
        }
    });
});

// Login user
export const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
        throw new ValidationError('Email and password are required');
    }

    if (!isValidEmail(email)) {
        throw new ValidationError('Please enter a valid email address');
    }

    // Find user
    const user = await prisma.user.findFirst({
        where: { email: email.toLowerCase() }
    });

    if (!user) {
        // Record failed login attempt
        if (req.recordFailedLogin) {
            req.recordFailedLogin();
        }
        throw new AuthenticationError('Invalid email or password');
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
        // Record failed login attempt
        if (req.recordFailedLogin) {
            req.recordFailedLogin();
        }
        throw new AuthenticationError('Invalid email or password');
    }

    // Record successful login
    if (req.recordSuccessfulLogin) {
        req.recordSuccessfulLogin();
    }

    // Generate token
    const token = generateToken(user.id);

    res.json({
        success: true,
        message: 'Login successful',
        data: {
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                isAdmin: user.isAdmin
            },
            token
        }
    });
});

// Get user profile
export const getProfile = asyncHandler(async (req, res) => {
    const userId = req.user?.id;

    if (!userId) {
        throw new AuthenticationError('Authentication required');
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            username: true,
            picture: true,
            isAdmin: true,
            createdAt: true,
            updatedAt: true
        }
    });

    if (!user) {
        throw new NotFoundError('User not found');
    }

    res.json({
        success: true,
        data: {
            user
        }
    });
});

// Update user profile
export const updateProfile = asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    const { username, email } = req.body;

    if (!userId) {
        throw new AuthenticationError('Authentication required');
    }

    const updateData = {};

    if (username) {
        updateData.username = username;
    }

    if (email) {
        if (!isValidEmail(email)) {
            throw new ValidationError('Please enter a valid email address');
        }
        updateData.email = email.toLowerCase();
    }

    const user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
            id: true,
            email: true,
            username: true,
            createdAt: true,
            updatedAt: true
        }
    });

    res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
            user
        }
    });
});

// Change password
export const changePassword = asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    const { currentPassword, newPassword } = req.body;

    if (!userId) {
        throw new AuthenticationError('Authentication required');
    }

    if (!currentPassword || !newPassword) {
        throw new ValidationError('Current and new passwords are required');
    }

    if (newPassword.length < 6) {
        throw new ValidationError('New password must be at least 6 characters long');
    }

    // Get user with password
    const user = await prisma.user.findUnique({
        where: { id: userId }
    });

    if (!user) {
        throw new NotFoundError('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isCurrentPasswordValid) {
        throw new ValidationError('Current password is incorrect');
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await prisma.user.update({
        where: { id: userId },
        data: { password: hashedNewPassword }
    });

    res.json({
        success: true,
        message: 'Password changed successfully'
    });
});

// Request password reset
export const requestPasswordReset = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email || !isValidEmail(email)) {
        throw new ValidationError('Please enter a valid email address');
    }

    const user = await prisma.user.findFirst({
        where: { email: email.toLowerCase() }
    });

    if (user) {
        // Generate reset token
        const resetToken = jwt.sign(
            { userId: user.id, type: 'password-reset' },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '1h' }
        );

        // Store reset token in database
        await prisma.user.update({
            where: { id: user.id },
            data: { resetToken }
        });

        // Send password reset email
        try {
            await emailService.sendPasswordResetEmail(user.email, resetToken, user.username);
            // eslint-disable-next-line no-console
        } catch (error) {
            console.error(`❌ Failed to send password reset email to ${email}:`, error.message);
            // Still continue - user will see success message for security
        }
    }

    // Always return success to prevent email enumeration
    res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent'
    });
});

// Reset password with token
export const resetPassword = asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        throw new ValidationError('Token and new password are required');
    }

    if (newPassword.length < 6) {
        throw new ValidationError('Password must be at least 6 characters long');
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

        if (decoded.type !== 'password-reset') {
            throw new ValidationError('Invalid reset token');
        }

        // Find user with this reset token
        const user = await prisma.user.findFirst({
            where: {
                id: decoded.userId,
                resetToken: token
            }
        });

        if (!user) {
            throw new ValidationError('Invalid or expired reset token');
        }

        // Hash new password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // Update password and clear reset token
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetToken: null
            }
        });

        res.json({
            success: true,
            message: 'Password reset successfully'
        });

    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            throw new ValidationError('Invalid or expired reset token');
        }
        throw error;
    }
});

// Logout user
export const logout = asyncHandler(async (req, res) => {
    // In a real app, you might want to blacklist the token
    // For now, we'll just return success since JWT tokens are stateless

    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

// Google OAuth routes
export const googleAuth = (req, res, next) => {
    passport.authenticate('google', {
        scope: ['profile', 'email']
    })(req, res, next);
};

export const googleCallback = [
    passport.authenticate('google', { failureRedirect: '/login?error=google_auth_failed' }),
    asyncHandler(async (req, res) => {
        try {

            const { user } = req;

            if (!user) {

                return res.redirect('/login?error=google_auth_failed');
            }

            console.log('🔐 GOOGLE OAUTH CALLBACK: User found:', {
                id: user.id,
                email: user.email,
                name: user.name
            });

            // Generate JWT token for the user
            const token = generateToken(user.id);


            // Redirect to frontend with token
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3200';
            const redirectUrl = `${frontendUrl}/login?token=${token}&success=google_login`;

            res.redirect(redirectUrl);
        } catch (error) {
            console.error('❌ GOOGLE OAUTH: Callback error:', error);
            console.error('❌ GOOGLE OAUTH: Error stack:', error.stack);
            res.redirect('/login?error=google_auth_failed');
        }
    })
];

// Setup auth routes
export const setupAuthRoutes = app => {
    try {
        app.post('/api/auth/register', register);
        app.post('/api/auth/login', rateLimitLogin, login);

        app.get('/api/auth/profile', authenticateTokenRequired, getProfile);
        app.put('/api/auth/profile', authenticateTokenRequired, updateProfile);
        app.post('/api/auth/change-password', authenticateTokenRequired, changePassword);
        app.post('/api/auth/forgot-password', rateLimitPasswordReset, requestPasswordReset);
        app.post('/api/auth/reset-password', resetPassword);
        app.post('/api/auth/logout', logout);

        app.get('/api/auth/google', googleAuth);
        app.get('/api/auth/google/callback', googleCallback);
        // Email service diagnostic endpoint
        app.get('/api/auth/email-status', async (req, res) => {
            try {
                const emailService = await import('../services/EmailService.js');
                const status = await emailService.default.testConfiguration();

                res.json(status);
            } catch (error) {
                res.status(500).json({
                    success: false,
                    message: 'Failed to check email service status',
                    error: error.message
                });
            }
        });
        // Auth routes registered

    } catch (error) {
        console.error('❌ AUTH ROUTES: Error during route registration:', error);
        console.error('❌ AUTH ROUTES: Error stack:', error.stack);
        throw error; // Re-throw to prevent silent failures
    }
};
