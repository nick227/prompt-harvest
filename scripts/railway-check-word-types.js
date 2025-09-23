#!/usr/bin/env node

/**
 * Railway Word Types Check
 * 
 * This script runs on Railway to check word_types data in production.
 * It uses Railway's internal DATABASE_URL environment variable.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRailwayWordTypes() {
    console.log('🔍 CHECKING RAILWAY PRODUCTION WORD TYPES');
    console.log('='.repeat(60));
    
    try {
        await prisma.$connect();
        console.log('✅ Connected to Railway production database');
        console.log(`📊 Database URL: ${process.env.DATABASE_URL ? 'SET' : 'NOT SET'}`);
        
        // Check word_types count
        const count = await prisma.word_types.count();
        console.log(`📊 Word types in production database: ${count}`);
        
        if (count === 0) {
            console.log('❌ PRODUCTION WORD TYPES TABLE IS EMPTY!');
            console.log('   Restoration is needed');
            
            console.log('\n🔧 TO RESTORE WORD TYPES:');
            console.log('   Run: node scripts/restore-word-types.js');
            
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
        
        console.log('\n📊 RAILWAY PRODUCTION WORD TYPES STATUS:');
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
        console.error('❌ Error checking Railway word types:', error.message);
        
        if (error.code === 'P1001') {
            console.log('💡 Database connection issue. Check:');
            console.log('   - Railway service is running');
            console.log('   - DATABASE_URL is set correctly');
            console.log('   - MySQL service is accessible');
        }
        
        return { needsRestoration: true, count: 0, error: error.message };
    } finally {
        await prisma.$disconnect();
    }
}

// Run the check
checkRailwayWordTypes()
    .then(result => {
        console.log('\n🎯 FINAL RESULT:');
        if (result.needsRestoration) {
            console.log('  ❌ Railway production word types needs restoration');
            console.log(`  📊 Current count: ${result.count}`);
            console.log('  🔧 Run: node scripts/restore-word-types.js');
        } else {
            console.log('  ✅ Railway production word types is properly populated');
            console.log(`  📊 Current count: ${result.count}`);
        }
        
        console.log('\n✅ Railway word types check completed');
    })
    .catch(error => {
        console.error('💥 Railway check failed:', error);
        process.exit(1);
    });
