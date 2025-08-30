import { asyncHandler } from '../middleware/errorHandler.js';
import { ValidationError, AuthenticationError, NotFoundError } from '../errors/CustomErrors.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import databaseClient from '../database/PrismaClient.js';
import emailService from '../services/EmailService.js';
import { rateLimitPasswordReset, rateLimitLogin } from '../middleware/rateLimitMiddleware.js';

const prisma = databaseClient.getClient();

// Helper function to generate JWT token
const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET || 'your-secret-key', {
        expiresIn: '7d'
    });
};

// Helper function to validate email format
const isValidEmail = (email) => {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
};

// Register new user
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
                username: user.username
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
            console.log(`✅ Password reset email sent to ${email}`);
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

// Setup auth routes
export const setupAuthRoutes = (app) => {
    app.post('/api/auth/register', register);
    app.post('/api/auth/login', rateLimitLogin, login);
    app.get('/api/auth/profile', getProfile);
    app.put('/api/auth/profile', updateProfile);
    app.post('/api/auth/change-password', changePassword);
    app.post('/api/auth/forgot-password', rateLimitPasswordReset, requestPasswordReset);
    app.post('/api/auth/reset-password', resetPassword);
    app.post('/api/auth/logout', logout);
};
