import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import databaseClient from '../database/PrismaClient.js';
import configManager from './ConfigManager.js';
import { GoogleOAuthService } from '../services/GoogleOAuthService.js';

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

        const oauthService = new GoogleOAuthService();
        const user = await oauthService.processGoogleAuth(profile);

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
