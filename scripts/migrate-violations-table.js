import databaseClient from '../src/database/PrismaClient.js';

const prisma = databaseClient.getClient();

/**
 * Migration script to create violations table
 */
const migrateViolationsTable = async () => {
    try {
        console.log('🔄 Starting violations table migration...');
        console.log('📡 Connecting to database...');

        // Check if table already exists
        console.log('🔍 Checking if violations table exists...');
        const tableExists = await prisma.$queryRaw`
            SELECT COUNT(*) as count
            FROM information_schema.tables
            WHERE table_schema = DATABASE()
            AND table_name = 'violations'
        `;

        console.log('📊 Table check result:', tableExists[0].count);

        if (tableExists[0].count > 0) {
            console.log('✅ Violations table already exists, skipping migration');
            return;
        }

        // Create the violations table
        console.log('🔨 Creating violations table...');
        await prisma.$executeRaw`
            CREATE TABLE violations (
                id VARCHAR(25) NOT NULL,
                userId VARCHAR(25) NULL,
                userEmail VARCHAR(255) NULL,
                username VARCHAR(100) NULL,
                violationType ENUM('bad_word', 'inappropriate_content', 'spam', 'other') NOT NULL DEFAULT 'bad_word',
                detectedWords TEXT NOT NULL,
                originalContent TEXT NOT NULL,
                sanitizedContent TEXT NULL,
                severity ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',
                ipAddress VARCHAR(45) NULL,
                userAgent TEXT NULL,
                endpoint VARCHAR(255) NOT NULL,
                requestId VARCHAR(100) NULL,
                isBlocked BOOLEAN NOT NULL DEFAULT true,
                createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

                PRIMARY KEY (id),
                INDEX idx_userId (userId),
                INDEX idx_violationType (violationType),
                INDEX idx_severity (severity),
                INDEX idx_createdAt (createdAt),
                INDEX idx_isBlocked (isBlocked),
                INDEX idx_endpoint (endpoint)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        `;

        console.log('✅ Violations table created successfully');

        // Test the table by inserting a sample record
        const testViolation = await prisma.violations.create({
            data: {
                id: 'test_violation_123',
                userId: null,
                userEmail: null,
                username: null,
                violationType: 'bad_word',
                detectedWords: JSON.stringify(['test', 'word']),
                originalContent: 'This is a test violation',
                severity: 'low',
                endpoint: '/api/test',
                isBlocked: false
            }
        });

        console.log('✅ Test violation record created:', testViolation.id);

        // Clean up test record
        await prisma.violations.delete({
            where: { id: 'test_violation_123' }
        });

        console.log('✅ Test record cleaned up');
        console.log('🎉 Violations table migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
};

// Run migration if this script is executed directly
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1].includes('migrate-violations-table.js')) {
    console.log('🚀 Starting migration script execution...');
    migrateViolationsTable()
        .then(() => {
            console.log('✅ Migration completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Migration failed:', error);
            process.exit(1);
        });
} else {
    console.log('📦 Migration script loaded as module');
}

export default migrateViolationsTable;
