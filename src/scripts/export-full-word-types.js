#!/usr/bin/env node

/**
 * Export full word_types data from local database
 * This script exports ALL local word_types data to a file that can be used on Railway
 */

import databaseClient from '../database/PrismaClient.js';

async function exportFullWordTypes() {
    console.log('📤 Exporting ALL local word_types data...');

    try {
        const prisma = databaseClient.getClient();

        // Get ALL word_types from local database
        const allWordTypes = await prisma.word_types.findMany({
            orderBy: { word: 'asc' }
        });

        console.log(`📊 Found ${allWordTypes.length} word_types records locally`);

        // Create the export file content
        const exportContent = `// Full word_types data exported from local database
// Generated: ${new Date().toISOString()}
// Total records: ${allWordTypes.length}

export const fullWordTypesData = ${JSON.stringify(allWordTypes, null, 2)};

export default fullWordTypesData;
`;

        // Write to file
        const fs = await import('fs');
        const path = await import('path');
        const { fileURLToPath } = await import('url');

        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);

        const exportFile = path.join(__dirname, '../src/data/full-word-types-data.js');

        // Ensure directory exists
        const dataDir = path.dirname(exportFile);

        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        fs.writeFileSync(exportFile, exportContent);

        console.log(`✅ Exported ${allWordTypes.length} records to: ${exportFile}`);
        console.log(`📁 File size: ${(fs.statSync(exportFile).size / 1024 / 1024).toFixed(2)} MB`);

        // Show sample records
        console.log('\n📋 Sample exported records:');
        allWordTypes.slice(0, 3).forEach((record, index) => {
            const typesCount = Array.isArray(record.types) ? record.types.length : 'unknown';
            const typesPreview = JSON.stringify(record.types).substring(0, 60);

            console.log(`${index + 1}. "${record.word}" (${typesCount} types) -> ${typesPreview}...`);
        });

        console.log('\n🎯 Next steps:');
        console.log('1. This file will be deployed to Railway');
        console.log('2. Railway will import ALL your local word_types data');
        console.log('3. You\'ll have 1000+ records instead of just 15');

    } catch (error) {
        console.error('❌ Export failed:', error);
        throw error;
    } finally {
        await databaseClient.getClient().$disconnect();
    }
}

exportFullWordTypes()
    .then(() => {
        console.log('\n✨ Full word_types export completed!');
        process.exit(0);
    })
    .catch(error => {
        console.error('💥 Export failed:', error);
        process.exit(1);
    });
