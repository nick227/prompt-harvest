#!/usr/bin/env node

/**
 * Verify Data Restoration
 * Run: node scripts/verify-data.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyData() {
    try {
        console.log('🔍 Verifying restored data...\n');

        const modelCount = await prisma.model.count();
        const wordTypeCount = await prisma.word_types.count();
        const systemSettingsCount = await prisma.systemSettings.count();

        console.log('📊 Current Database Status:');
        console.log(`   - Models: ${modelCount}`);
        console.log(`   - Word Types: ${wordTypeCount}`);
        console.log(`   - System Settings: ${systemSettingsCount}`);

        // Show some sample data
        const sampleModels = await prisma.model.findMany({ take: 3 });
        const sampleWordTypes = await prisma.word_types.findMany({ take: 3 });
        const sampleSettings = await prisma.systemSettings.findMany();

        console.log('\n🔍 Sample Models:');
        sampleModels.forEach(m => console.log(`   - ${m.provider}/${m.name}: ${m.displayName}`));

        console.log('\n🔍 Sample Word Types:');
        sampleWordTypes.forEach(w => console.log(`   - ${w.word}: ${Array.isArray(w.types) ? w.types.length : 0} types`));

        console.log('\n🔍 System Settings:');
        sampleSettings.forEach(s => console.log(`   - ${s.key}: ${s.value} (${s.dataType})`));

        // Check if welcome credits setting exists
        const welcomeCredits = await prisma.systemSettings.findUnique({
            where: { key: 'new_user_welcome_credits' }
        });

        if (welcomeCredits) {
            console.log(`\n✅ Welcome Credits Setting: ${welcomeCredits.value} credits`);
        } else {
            console.log('\n❌ Welcome Credits Setting: NOT FOUND');
        }

        console.log('\n🎉 Data verification completed!');

    } catch (error) {
        console.error('❌ Error verifying data:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verifyData();
