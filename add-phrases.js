import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const phrases = [
    { 
        word: 'creative artistic description', 
        types: ['portrait', 'landscape', 'still life', 'abstract', 'realistic', 'surreal', 'fantasy', 'sci-fi', 'vintage', 'modern', 'contemporary', 'classical', 'minimalist', 'detailed', 'epic', 'intimate', 'dramatic', 'peaceful', 'energetic', 'mysterious'] 
    },
    { 
        word: 'art inspiration', 
        types: ['nature', 'dreams', 'emotions', 'memories', 'fantasy', 'reality', 'imagination', 'creativity', 'beauty', 'wonder', 'mystery', 'adventure', 'love', 'hope', 'freedom', 'peace', 'harmony', 'chaos', 'order', 'balance'] 
    }
];

async function addPhrases() {
    try {
        for (const phrase of phrases) {
            await prisma.word_types.upsert({
                where: { word: phrase.word },
                update: { types: phrase.types },
                create: phrase
            });
            console.log(`Added phrase: ${phrase.word}`);
        }
        console.log('All phrases added successfully');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

addPhrases();
