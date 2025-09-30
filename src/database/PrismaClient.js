import { PrismaClient } from '@prisma/client';

class DatabaseClient {
    constructor() {
        this.prisma = new PrismaClient({
            log: ['error']
        });
    }

    // Get the Prisma client instance
    getClient() {
        return this.prisma;
    }

    // Connect to the database
    async connect() {
        try {
            await this.prisma.$connect();
            // Database connected successfully
        } catch (error) {
            console.error('❌ Database connection failed:', error);
            throw error;
        }
    }

    // Disconnect from the database
    async disconnect() {
        try {
            await this.prisma.$disconnect();
            // Database disconnected successfully
        } catch (error) {
            console.error('❌ Database disconnection failed:', error);
            throw error;
        }
    }

    // Health check
    async healthCheck() {
        try {
            await this.prisma.$queryRaw`SELECT 1`;

            return { status: 'healthy', timestamp: new Date().toISOString() };
        } catch (error) {
            return { status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() };
        }
    }

    // Get database statistics
    async getStats() {
        try {
            const [userCount, imageCount, likeCount, tagCount, promptCount, wordTypeCount] = await Promise.all([
                this.prisma.user.count(),
                this.prisma.image.count(),
                this.prisma.likes.count(),
                this.prisma.tags.count(),
                this.prisma.prompts.count(),
                this.prisma.word_types.count()
            ]);

            return {
                users: userCount,
                images: imageCount,
                likes: likeCount,
                tags: tagCount,
                prompts: promptCount,
                wordTypes: wordTypeCount,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ Failed to get database stats:', error);
            throw error;
        }
    }
}

// Create singleton instance
const databaseClient = new DatabaseClient();

export default databaseClient;
