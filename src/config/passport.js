import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import databaseClient from '../database/PrismaClient.js';
import configManager from './ConfigManager.js';
import { GoogleOAuthService } from '../services/GoogleOAuthService.js';

const prisma = databaseClient.getClient();
const config = configManager.export();

// Configure Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: config.auth.google.clientId,
    clientSecret: config.auth.google.clientSecret,
    callbackURL: config.auth.google.callbackURL
}, async (accessToken, refreshToken, profile, done) => {
    try {

        const oauthService = new GoogleOAuthService();
        const user = await oauthService.processGoogleAuth(profile);

        return done(null, user);
    } catch (error) {
        console.error('❌ GOOGLE OAUTH: Error in strategy:', error);

        return done(error, null);
    }
}));

// SECURITY: Serialize user for session (pure and cheap)
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// SECURITY: Deserialize user from session
// NOTE: This performs a DB query on each request with a session
// OPTIMIZATION: Consider caching with TTL (e.g., Redis, in-memory LRU cache)
// Trade-off: Cache improves performance but delays propagation of user changes
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
