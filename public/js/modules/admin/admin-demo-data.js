/**
 * Admin Demo Data Service - Provides mock data for testing the admin dashboard
 * This is a temporary service for development and testing purposes
 */

class AdminDemoDataService {
    constructor() {
        this.demoData = {
            snapshot: {
                stats: {
                    totalUsers: 1250,
                    totalImages: 15680,
                    totalRevenue: 45230.75,
                    activeSessions: 45
                },
                metrics: {
                    avgResponseTime: 245,
                    successRate: 98.5,
                    recentActivity: [
                        {
                            type: 'user_registration',
                            description: 'New user registered: john.doe@example.com',
                            timestamp: Date.now() - 300000
                        },
                        {
                            type: 'image_generation',
                            description: 'Image generated successfully for user ID 1234',
                            timestamp: Date.now() - 180000
                        },
                        {
                            type: 'payment',
                            description: 'Payment completed: $25.00',
                            timestamp: Date.now() - 120000
                        },
                        {
                            type: 'login',
                            description: 'Admin login detected',
                            timestamp: Date.now() - 60000
                        }
                    ]
                },
                health: {
                    cpuUsage: 35.2,
                    memoryUsage: 67.8
                }
            },
            billing: {
                items: [
                    {
                        id: 'tx_001',
                        user_email: 'user1@example.com',
                        amount: 25.00,
                        status: 'completed',
                        payment_method: 'credit_card',
                        created_at: Date.now() - 86400000
                    },
                    {
                        id: 'tx_002',
                        user_email: 'user2@example.com',
                        amount: 50.00,
                        status: 'pending',
                        payment_method: 'paypal',
                        created_at: Date.now() - 172800000
                    },
                    {
                        id: 'tx_003',
                        user_email: 'user3@example.com',
                        amount: 15.00,
                        status: 'refunded',
                        payment_method: 'credit_card',
                        created_at: Date.now() - 259200000
                    }
                ],
                pagination: {
                    page: 1,
                    limit: 20,
                    total: 3,
                    start: 1,
                    end: 3
                }
            },
            users: {
                items: [
                    {
                        id: 1001,
                        username: 'john_doe',
                        email: 'john.doe@example.com',
                        role: 'user',
                        status: 'active',
                        created_at: Date.now() - 86400000,
                        last_login: Date.now() - 3600000
                    },
                    {
                        id: 1002,
                        username: 'jane_smith',
                        email: 'jane.smith@example.com',
                        role: 'premium',
                        status: 'active',
                        created_at: Date.now() - 172800000,
                        last_login: Date.now() - 7200000
                    },
                    {
                        id: 1003,
                        username: 'bob_wilson',
                        email: 'bob.wilson@example.com',
                        role: 'user',
                        status: 'suspended',
                        created_at: Date.now() - 259200000,
                        last_login: Date.now() - 86400000
                    }
                ],
                pagination: {
                    page: 1,
                    limit: 20,
                    total: 3,
                    start: 1,
                    end: 3
                }
            },
            images: {
                items: [
                    {
                        id: 'img_001',
                        user_email: 'user1@example.com',
                        prompt: 'A beautiful sunset over the ocean with waves crashing on the shore',
                        provider: 'openai',
                        status: 'completed',
                        cost: 0.025,
                        created_at: Date.now() - 86400000,
                        image_url: 'https://via.placeholder.com/150x150/FF6B6B/FFFFFF?text=Sunset',
                        isPublic: true,
                        isHidden: false,
                        tags: ['sunset', 'ocean', 'nature', 'beautiful'],
                        width: 1024,
                        height: 1024,
                        model: 'dall-e-3'
                    },
                    {
                        id: 'img_002',
                        user_email: 'user2@example.com',
                        prompt: 'A futuristic cityscape with flying cars and neon lights',
                        provider: 'stability',
                        status: 'processing',
                        cost: 0.030,
                        created_at: Date.now() - 172800000,
                        image_url: 'https://via.placeholder.com/150x150/4ECDC4/FFFFFF?text=City',
                        isPublic: false,
                        isHidden: false,
                        tags: ['futuristic', 'city', 'neon', 'cars'],
                        width: 1024,
                        height: 1024,
                        model: 'stable-diffusion-xl'
                    },
                    {
                        id: 'img_003',
                        user_email: 'user3@example.com',
                        prompt: 'A cute kitten playing with a ball of yarn',
                        provider: 'openai',
                        status: 'failed',
                        cost: 0.025,
                        created_at: Date.now() - 259200000,
                        image_url: 'https://via.placeholder.com/150x150/45B7D1/FFFFFF?text=Kitten',
                        isPublic: true,
                        isHidden: true,
                        tags: ['kitten', 'cute', 'yarn', 'playful'],
                        width: 1024,
                        height: 1024,
                        model: 'dall-e-3'
                    }
                ],
                pagination: {
                    page: 1,
                    limit: 15,
                    total: 3,
                    start: 1,
                    end: 3
                }
            }
        };
    }

    async getSiteSnapshot() {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));

        return {
            success: true,
            data: this.demoData.snapshot
        };
    }

    async getBillingHistory(params = {}) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 300));

        return {
            success: true,
            data: this.demoData.billing
        };
    }

    async getUsersHistory(params = {}) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 300));

        return {
            success: true,
            data: this.demoData.users
        };
    }

    async getImagesHistory(params = {}) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 300));

        return {
            success: true,
            data: this.demoData.images
        };
    }

    async getAnalytics(params = {}) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 200));

        return {
            success: true,
            data: this.demoData.snapshot.metrics
        };
    }

    async getSystemHealth() {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 100));

        return {
            success: true,
            data: this.demoData.snapshot.health
        };
    }

    // Mock API methods for actions
    async getBillingDetails(id) {
        await new Promise(resolve => setTimeout(resolve, 200));

        return { success: true, data: { id, details: 'Mock billing details' } };
    }

    async refundPayment(id, reason) {
        await new Promise(resolve => setTimeout(resolve, 500));

        return { success: true, data: { id, refunded: true, reason } };
    }

    async getUserDetails(id) {
        await new Promise(resolve => setTimeout(resolve, 200));

        return { success: true, data: { id, details: 'Mock user details' } };
    }

    async updateUser(id, userData) {
        await new Promise(resolve => setTimeout(resolve, 500));

        return { success: true, data: { id, updated: true, ...userData } };
    }

    async suspendUser(id, reason) {
        await new Promise(resolve => setTimeout(resolve, 500));

        return { success: true, data: { id, suspended: true, reason } };
    }

    async activateUser(id) {
        await new Promise(resolve => setTimeout(resolve, 500));

        return { success: true, data: { id, activated: true } };
    }

    async deleteUser(id) {
        await new Promise(resolve => setTimeout(resolve, 500));

        return { success: true, data: { id, deleted: true } };
    }

    async getImageDetails(id) {
        await new Promise(resolve => setTimeout(resolve, 200));

        return { success: true, data: { id, details: 'Mock image details' } };
    }

    async deleteImage(id) {
        await new Promise(resolve => setTimeout(resolve, 500));

        return { success: true, data: { id, deleted: true } };
    }

    async moderateImage(id, action) {
        await new Promise(resolve => setTimeout(resolve, 500));

        return { success: true, data: { id, moderated: true, action } };
    }

    async toggleImageVisibility(id) {
        await new Promise(resolve => setTimeout(resolve, 500));

        return { success: true, data: { id, visibilityToggled: true } };
    }

    async editImageTags(id, tags) {
        await new Promise(resolve => setTimeout(resolve, 500));

        return { success: true, data: { id, tagsUpdated: true, tags } };
    }

    async generateImageTags(id) {
        await new Promise(resolve => setTimeout(resolve, 1000));

        return { success: true, data: { id, tagsGenerated: true } };
    }

    async adminHideImage(id) {
        await new Promise(resolve => setTimeout(resolve, 500));

        return { success: true, data: { id, hiddenByAdmin: true } };
    }

    async adminShowImage(id) {
        await new Promise(resolve => setTimeout(resolve, 500));

        return { success: true, data: { id, shownByAdmin: true } };
    }

    // Export methods (return mock blobs)
    async exportBillingData(filters = {}) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const csvContent = 'Transaction ID,User Email,Amount,Status,Payment Method,Date\n' +
            'tx_001,user1@example.com,25.00,completed,credit_card,2024-01-01\n' +
            'tx_002,user2@example.com,50.00,pending,paypal,2024-01-02\n' +
            'tx_003,user3@example.com,15.00,refunded,credit_card,2024-01-03';

        return new Blob([csvContent], { type: 'text/csv' });
    }

    async exportUsersData(filters = {}) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const csvContent = 'User ID,Username,Email,Role,Status,Created At,Last Login\n' +
            '1001,john_doe,john.doe@example.com,user,active,2024-01-01,2024-01-15\n' +
            '1002,jane_smith,jane.smith@example.com,premium,active,2024-01-02,2024-01-15\n' +
            '1003,bob_wilson,bob.wilson@example.com,user,suspended,2024-01-03,2024-01-14';

        return new Blob([csvContent], { type: 'text/csv' });
    }

    async exportImagesData(filters = {}) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const csvContent = 'Image ID,User Email,Prompt,Provider,Status,Cost,Created At\n' +
            'img_001,user1@example.com,"A beautiful sunset over the ocean",openai,completed,0.025,2024-01-01\n' +
            'img_002,user2@example.com,"A futuristic cityscape",stability,processing,0.030,2024-01-02\n' +
            'img_003,user3@example.com,"A cute kitten playing",openai,failed,0.025,2024-01-03';

        return new Blob([csvContent], { type: 'text/csv' });
    }
}

// Export for global access
window.AdminDemoDataService = AdminDemoDataService;
