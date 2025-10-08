/**
 * Mock PrismaClient for Jest tests
 * This mock is automatically used by Jest when PrismaClient.js is imported
 */

// Create mock Prisma models
const createMockModel = () => ({
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
    upsert: jest.fn()
});

// Create mock Prisma client with all models
const mockPrisma = {
    // Blog models
    BlogPost: createMockModel(),

    // User and auth models
    user: createMockModel(),
    session: createMockModel(),

    // Image models
    image: createMockModel(),
    likes: createMockModel(),
    tags: createMockModel(),
    categories: createMockModel(),

    // Prompt models
    prompts: createMockModel(),
    word_types: createMockModel(),

    // AI models
    conversation: createMockModel(),
    chatMessage: createMockModel(),
    aIPrompt: createMockModel(),

    // Credit and payment models
    credit_transaction: createMockModel(),
    credit_balance: createMockModel(),
    promo_code: createMockModel(),
    credit_history: createMockModel(),

    // System models
    models: createMockModel(),
    system_settings: createMockModel(),

    // Prisma client methods
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    $transaction: jest.fn(callback => callback(mockPrisma)),
    $use: jest.fn(),
    $on: jest.fn()
};

// Create mock database client
const mockDatabaseClient = {
    prisma: mockPrisma,
    getClient: jest.fn(() => mockPrisma),
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    healthCheck: jest.fn().mockResolvedValue({
        status: 'healthy',
        timestamp: new Date().toISOString()
    }),
    getStats: jest.fn().mockResolvedValue({
        users: 0,
        images: 0,
        likes: 0,
        tags: 0,
        prompts: 0,
        wordTypes: 0,
        timestamp: new Date().toISOString()
    })
};

// Mock DatabaseClient class
class MockDatabaseClient {
    constructor() {
        this.prisma = mockPrisma;
    }

    getClient() {
        return mockPrisma;
    }

    async connect() {
        return Promise.resolve();
    }

    async disconnect() {
        return Promise.resolve();
    }

    async healthCheck() {
        return { status: 'healthy', timestamp: new Date().toISOString() };
    }

    async getStats() {
        return {
            users: 0,
            images: 0,
            likes: 0,
            tags: 0,
            prompts: 0,
            wordTypes: 0,
            timestamp: new Date().toISOString()
        };
    }
}

// Export in the same format as the real module
export default mockDatabaseClient;
export { mockDatabaseClient as databaseClient, MockDatabaseClient as DatabaseClient };

