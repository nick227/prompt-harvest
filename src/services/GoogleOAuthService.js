import databaseClient from '../database/PrismaClient.js';

export class GoogleOAuthService {
    constructor() {
        this.prisma = databaseClient.getClient();
    }

    /**
     * Extract and validate profile data from Google OAuth
     */
    extractProfileData(profile) {
        const email = profile.emails?.[0]?.value;
        const googleId = profile.id;
        const name = profile.displayName || profile.name?.givenName || 'User';
        const picture = profile.photos?.[0]?.value;

        if (!email) {
            throw new Error('No email found in Google profile');
        }

        return { email: email.toLowerCase(), googleId, name, picture };
    }

    /**
     * Find existing user by email
     */
    async findUserByEmail(email) {
        return await this.prisma.user.findFirst({
            where: { email: email.toLowerCase() }
        });
    }

    /**
     * Find existing user by Google ID
     */
    async findUserByGoogleId(googleId) {
        return await this.prisma.user.findFirst({
            where: { googleId }
        });
    }

    /**
     * Update user with Google ID
     */
    async updateUserWithGoogleId(user, googleId) {
        return await this.prisma.user.update({
            where: { id: user.id },
            data: { googleId }
        });
    }

    /**
     * Create new user from Google OAuth profile
     */
    async createUserFromProfile(profileData) {
        const { email, googleId, name, picture } = profileData;
        const username = email.split('@')[0];

        return await this.prisma.user.create({
            data: {
                email,
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
    }

    /**
     * Add welcome credits to new user
     */
    async addWelcomeCredits(user) {
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
    }

    /**
     * Process Google OAuth authentication
     */
    async processGoogleAuth(profile) {
        // Extract and validate profile data
        const profileData = this.extractProfileData(profile);

        // Check if user already exists with this email
        let user = await this.findUserByEmail(profileData.email);

        if (user) {
            // User exists, update Google ID if not set
            if (!user.googleId) {
                user = await this.updateUserWithGoogleId(user, profileData.googleId);
            }
            console.log('✅ GOOGLE OAUTH: Existing user logged in:', user.email);
            return user;
        }

        // Check if user exists with this Google ID
        user = await this.findUserByGoogleId(profileData.googleId);

        if (user) {
            console.log('✅ GOOGLE OAUTH: User found by Google ID:', user.email);
            return user;
        }

        // Create new user
        user = await this.createUserFromProfile(profileData);
        console.log('✅ GOOGLE OAUTH: New user created:', user.email);

        // Add welcome credits for new Google OAuth users
        await this.addWelcomeCredits(user);

        return user;
    }
}
