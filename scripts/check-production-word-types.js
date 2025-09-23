#!/usr/bin/env node

/**
 * Check Production Word Types
 * 
 * This script checks if the production database has word_types data
 * and determines if restoration is needed.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkProductionWordTypes() {
    console.log('🔍 CHECKING PRODUCTION WORD TYPES');
    console.log('='.repeat(50));
    
    try {
        await prisma.$connect();
        console.log('✅ Connected to production database');
        
        // Check word_types count
        const count = await prisma.word_types.count();
        console.log(`📊 Word types in production database: ${count}`);
        
        if (count === 0) {
            console.log('❌ PRODUCTION WORD TYPES TABLE IS EMPTY!');
            console.log('   Restoration is needed');
            return { needsRestoration: true, count: 0 };
        }
        
        // Show sample data
        const sample = await prisma.word_types.findMany({ take: 3 });
        console.log('\n🔍 Sample word types:');
        sample.forEach(wt => {
            const types = JSON.parse(wt.types);
            console.log(`  - "${wt.word}": ${types.length} types`);
        });
        
        // Check for common words
        const commonWords = ['art', 'photography', 'design', 'style', 'color'];
        console.log('\n🔍 Checking for common words:');
        
        for (const word of commonWords) {
            const wordType = await prisma.word_types.findUnique({
                where: { word }
            });
            
            if (wordType) {
                const types = JSON.parse(wordType.types);
                console.log(`  ✅ "${word}": ${types.length} types`);
            } else {
                console.log(`  ❌ "${word}": NOT FOUND`);
            }
        }
        
        console.log('\n📊 PRODUCTION WORD TYPES STATUS:');
        if (count >= 1000) {
            console.log('  ✅ Production word types table is well-populated');
            console.log('  ✅ No restoration needed');
            return { needsRestoration: false, count };
        } else if (count > 0) {
            console.log('  ⚠️  Production word types table has some data but may be incomplete');
            console.log('  ⚠️  Consider restoration for completeness');
            return { needsRestoration: true, count };
        } else {
            console.log('  ❌ Production word types table is empty');
            console.log('  ❌ Restoration is required');
            return { needsRestoration: true, count: 0 };
        }
        
    } catch (error) {
        console.error('❌ Error checking production word types:', error.message);
        return { needsRestoration: true, count: 0, error: error.message };
    } finally {
        await prisma.$disconnect();
    }
}

// Run the check
checkProductionWordTypes()
    .then(result => {
        console.log('\n🎯 FINAL RESULT:');
        if (result.needsRestoration) {
            console.log('  ❌ Production word types needs restoration');
            console.log(`  📊 Current count: ${result.count}`);
            console.log('  🔧 Run: node scripts/restore-word-types.js');
        } else {
            console.log('  ✅ Production word types is properly populated');
            console.log(`  📊 Current count: ${result.count}`);
        }
    })
    .catch(error => {
        console.error('💥 Check failed:', error);
        process.exit(1);
    });
