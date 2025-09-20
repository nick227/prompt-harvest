import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import databaseClient from '../database/PrismaClient.js';
import configManager from './ConfigManager.js';

const prisma = databaseClient.getClient();
const config = configManager.export();

// Debug: Log the Google OAuth configuration
console.log('🔐 GOOGLE OAUTH CONFIG:', {
    clientID: config.auth.google.clientId,
    clientSecret: config.auth.google.clientSecret ? 'SET' : 'NOT SET',
    callbackURL: config.auth.google.callbackURL
});

// Configure Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: config.auth.google.clientId,
    clientSecret: config.auth.google.clientSecret,
    callbackURL: config.auth.google.callbackURL
}, async (accessToken, refreshToken, profile, done) => {
    try {
        console.log('🔐 GOOGLE OAUTH: Profile received:', {
            id: profile.id,
            email: profile.emails?.[0]?.value,
            name: profile.displayName,
            emails: profile.emails,
            photos: profile.photos
        });

        const email = profile.emails?.[0]?.value;
        const googleId = profile.id;
        const name = profile.displayName || profile.name?.givenName || 'User';
        const picture = profile.photos?.[0]?.value;

        if (!email) {
            console.error('❌ GOOGLE OAUTH: No email found in profile');
            return done(new Error('No email found in Google profile'), null);
        }

        // Check if user already exists with this email
        let user = await prisma.user.findFirst({
            where: { email: email.toLowerCase() }
        });

        if (user) {
            // User exists, update Google ID if not set
            if (!user.googleId) {
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: { googleId }
                });
            }
            console.log('✅ GOOGLE OAUTH: Existing user logged in:', user.email);
            return done(null, user);
        }

        // Check if user exists with this Google ID
        user = await prisma.user.findFirst({
            where: { googleId }
        });

        if (user) {
            console.log('✅ GOOGLE OAUTH: User found by Google ID:', user.email);
            return done(null, user);
        }

        // Create new user
        const username = email.split('@')[0];
        user = await prisma.user.create({
            data: {
                email: email.toLowerCase(),
                username,
                googleId,
                name,
                picture,
                password: null, // No password for OAuth users
                isEmailVerified: true // Google emails are verified
            },
            select: {
                id: true,
                email: true,
                username: true,
                name: true,
                picture: true,
                googleId: true,
                isEmailVerified: true,
                createdAt: true
            }
        });

        console.log('✅ GOOGLE OAUTH: New user created:', user.email);

        // Add welcome credits for new Google OAuth users
        try {
            const systemSettingsService = await import('../services/SystemSettingsService.js');
            const SimplifiedCreditService = await import('../services/credit/SimplifiedCreditService.js');

            const welcomeCredits = await systemSettingsService.default.get('new_user_welcome_credits', 100);

            await SimplifiedCreditService.default.addCredits(
                user.id,
                welcomeCredits,
                'welcome_bonus',
                `Welcome to Image Harvest! Enjoy ${welcomeCredits} free credits to get started.`,
                {
                    registrationDate: new Date().toISOString(),
                    bonusType: 'new_user_welcome_google',
                    credits: welcomeCredits,
                    authMethod: 'google_oauth'
                }
            );
            console.log(`🎉 GOOGLE OAUTH: Added ${welcomeCredits} free credits to new user ${user.email}`);
        } catch (error) {
            console.error('❌ GOOGLE OAUTH: Failed to add welcome credits:', error);
            // Don't throw - registration should still succeed
        }

        return done(null, user);
    } catch (error) {
        console.error('❌ GOOGLE OAUTH: Error in strategy:', error);
        return done(error, null);
    }
}));

// Serialize user for session
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                username: true,
                name: true,
                picture: true,
                googleId: true,
                isAdmin: true,
                isSuspended: true,
                createdAt: true
            }
        });
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

export default passport;
