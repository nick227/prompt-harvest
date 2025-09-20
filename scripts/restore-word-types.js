import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function restoreWordTypes() {
    try {
        console.log('🔄 Starting word_types restoration...');

        // Read the NeDB backup file
        const backupPath = path.join(__dirname, '..', 'data', 'word-types.db');
        const backupContent = fs.readFileSync(backupPath, 'utf8');

        // Split by lines and parse each JSON object
        const lines = backupContent.trim().split('\n');
        console.log(`📊 Found ${lines.length} word entries to restore`);

        let successCount = 0;
        let errorCount = 0;

        // Clear existing word_types data
        console.log('🗑️ Clearing existing word_types data...');
        await prisma.word_types.deleteMany({});

        // Process each line
        for (let i = 0; i < lines.length; i++) {
            try {
                const line = lines[i].trim();
                if (!line) continue;

                const wordData = JSON.parse(line);
                const { word, types } = wordData;

                if (!word || !types || !Array.isArray(types)) {
                    console.warn(`⚠️ Skipping invalid entry at line ${i + 1}:`, wordData);
                    continue;
                }

                // Insert into MySQL database
                await prisma.word_types.create({
                    data: {
                        word: word,
                        types: types,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                });

                successCount++;

                // Progress indicator
                if (successCount % 100 === 0) {
                    console.log(`✅ Processed ${successCount} words...`);
                }

            } catch (parseError) {
                console.error(`❌ Error parsing line ${i + 1}:`, parseError.message);
                errorCount++;
            }
        }

        console.log('\n🎉 Word types restoration completed!');
        console.log(`✅ Successfully restored: ${successCount} words`);
        console.log(`❌ Errors encountered: ${errorCount} words`);

        // Verify the restoration
        const totalCount = await prisma.word_types.count();
        console.log(`📊 Total words in database: ${totalCount}`);

    } catch (error) {
        console.error('💥 Fatal error during restoration:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the restoration
restoreWordTypes()
    .then(() => {
        console.log('✨ Restoration script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Restoration script failed:', error);
        process.exit(1);
    });

export { restoreWordTypes };
