#!/usr/bin/env node

/**
 * Script to add sample word types for testing the terms management system
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Generate a unique ID for new records
 */
function generateId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Sample word types data for testing
 */
const sampleWords = [
    {
        word: 'color',
        types: [
            'red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'black', 'white', 'gray',
            'crimson', 'azure', 'emerald', 'gold', 'violet', 'amber', 'rose', 'ebony', 'ivory', 'silver',
            'scarlet', 'cobalt', 'jade', 'bronze', 'magenta', 'coral', 'burgundy', 'navy', 'lime', 'maroon'
        ]
    },
    {
        word: 'animal',
        types: [
            'cat', 'dog', 'lion', 'tiger', 'elephant', 'giraffe', 'zebra', 'horse', 'cow', 'pig',
            'rabbit', 'fox', 'wolf', 'bear', 'deer', 'bird', 'eagle', 'owl', 'parrot', 'penguin',
            'dolphin', 'whale', 'shark', 'fish', 'butterfly', 'bee', 'spider', 'snake', 'turtle', 'frog'
        ]
    },
    {
        word: 'style',
        types: [
            'modern', 'vintage', 'minimalist', 'abstract', 'realistic', 'artistic', 'classical', 'contemporary',
            'surreal', 'impressionist', 'cubist', 'gothic', 'baroque', 'renaissance', 'art deco', 'bauhaus',
            'pop art', 'grunge', 'steampunk', 'cyberpunk', 'retro', 'futuristic', 'rustic', 'elegant',
            'dramatic', 'romantic', 'industrial', 'organic', 'geometric', 'fluid'
        ]
    },
    {
        word: 'emotion',
        types: [
            'happy', 'sad', 'angry', 'excited', 'calm', 'peaceful', 'joyful', 'melancholy', 'serene',
            'energetic', 'mysterious', 'dramatic', 'romantic', 'nostalgic', 'hopeful', 'dreamy',
            'intense', 'gentle', 'bold', 'subtle', 'vibrant', 'muted', 'warm', 'cool', 'bright',
            'dark', 'light', 'heavy', 'ethereal', 'grounded'
        ]
    },
    {
        word: 'weather',
        types: [
            'sunny', 'cloudy', 'rainy', 'stormy', 'snowy', 'foggy', 'windy', 'clear', 'overcast',
            'drizzling', 'thunderstorm', 'blizzard', 'misty', 'humid', 'dry', 'hot', 'cold', 'warm',
            'cool', 'freezing', 'scorching', 'mild', 'pleasant', 'harsh', 'gentle', 'severe',
            'tropical', 'arctic', 'temperate', 'seasonal'
        ]
    },
    {
        word: 'texture',
        types: [
            'smooth', 'rough', 'soft', 'hard', 'bumpy', 'silky', 'grainy', 'glossy', 'matte', 'fuzzy',
            'sharp', 'blunt', 'fine', 'coarse', 'delicate', 'sturdy', 'fragile', 'solid', 'liquid',
            'gaseous', 'crystalline', 'metallic', 'wooden', 'fabric', 'leather', 'plastic', 'glass',
            'ceramic', 'stone', 'organic'
        ]
    },
    {
        word: 'lighting',
        types: [
            'bright', 'dim', 'natural', 'artificial', 'warm', 'cool', 'soft', 'harsh', 'dramatic',
            'subtle', 'directional', 'ambient', 'spotlight', 'backlighting', 'side lighting',
            'golden hour', 'blue hour', 'sunset', 'sunrise', 'moonlight', 'candlelight',
            'neon', 'fluorescent', 'LED', 'incandescent', 'studio', 'outdoor', 'indoor',
            'shadow', 'highlight', 'contrast'
        ]
    },
    {
        word: 'landscape',
        types: [
            'mountain', 'valley', 'forest', 'desert', 'ocean', 'lake', 'river', 'beach', 'field',
            'meadow', 'hill', 'canyon', 'plateau', 'island', 'peninsula', 'coastline', 'cliff',
            'waterfall', 'garden', 'park', 'countryside', 'wilderness', 'tundra', 'savanna',
            'jungle', 'prairie', 'marsh', 'swamp', 'glacier', 'volcano'
        ]
    }
];

/**
 * Add sample words to the database
 */
async function addSampleWords() {
    try {
        console.log('🚀 Adding sample word types to database...');

        let addedCount = 0;
        let skippedCount = 0;

        for (const sampleWord of sampleWords) {
            try {
                // Check if word already exists
                const existingWord = await prisma.word_types.findFirst({
                    where: { word: sampleWord.word }
                });

                if (existingWord) {
                    console.log(`⚠️ Word "${sampleWord.word}" already exists, skipping...`);
                    skippedCount++;
                    continue;
                }

                // Add the word
                const wordData = {
                    id: generateId(),
                    word: sampleWord.word,
                    types: sampleWord.types,
                    examples: sampleWord.types, // Use types as examples
                    createdAt: new Date(),
                    updatedAt: new Date()
                };

                await prisma.word_types.create({
                    data: wordData
                });

                console.log(`✅ Added "${sampleWord.word}" with ${sampleWord.types.length} types`);
                addedCount++;

            } catch (error) {
                console.error(`❌ Error adding word "${sampleWord.word}":`, error.message);
            }
        }

        console.log('\n🎉 Sample data creation completed!');
        console.log(`✅ Added: ${addedCount} words`);
        console.log(`⚠️ Skipped: ${skippedCount} words`);

        // Verify the data
        const totalWords = await prisma.word_types.count();
        console.log(`\n🔍 Total words in database: ${totalWords}`);

        // Show a sample
        const sampleData = await prisma.word_types.findMany({
            select: {
                word: true,
                types: true
            },
            take: 3,
            orderBy: { word: 'asc' }
        });

        console.log('\n📋 Sample words added:');
        for (const word of sampleData) {
            const typesCount = Array.isArray(word.types) ? word.types.length : 0;
            console.log(`  - ${word.word}: ${typesCount} types`);
        }

    } catch (error) {
        console.error('❌ Failed to add sample words:', error);
        throw error;
    }
}

/**
 * Main function
 */
async function main() {
    try {
        await addSampleWords();
        console.log('\n✅ Sample data setup completed successfully!');
    } catch (error) {
        console.error('\n❌ Sample data setup failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Run if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { main };
