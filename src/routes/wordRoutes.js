/**
 * Word Routes - Handle word types and examples
 */

import databaseClient from '../database/PrismaClient.js';

const prisma = databaseClient.getClient();

// eslint-disable-next-line max-lines-per-function
export const setupWordRoutes = app => {
    // Get all words (for terms.html)
    app.get('/words', async (req, res) => {
        try {
            // /words endpoint called

            // Test database connection first
            await prisma.$connect();
            // Database connection successful

            const wordRecords = await prisma.word_types.findMany({
                select: { word: true, types: true }
            });

            // Found word records in database

            const response = wordRecords.map(record => {
                try {
                    return {
                        word: record.word,
                        types: Array.isArray(record.types) ? record.types : []
                    };
                } catch (parseError) {
                    console.warn(`⚠️ Failed to process types for word "${record.word}":`, parseError.message);

                    return {
                        word: record.word,
                        types: []
                    };
                }
            });

            response.sort((a, b) => a.word.localeCompare(b.word));

            // Returning words to client
            res.json(response);
        } catch (error) {
            console.error('❌ Error fetching words:', error);
            console.error('❌ Error details:', {
                message: error.message,
                code: error.code,
                stack: error.stack
            });
            res.status(500).json({
                error: 'Failed to fetch words',
                message: error.message
            });
        }
    });

    // Get word types for a specific word (with fuzzy matching like original NeDB implementation)
    app.get('/word/types/:word', async (req, res) => {
        try {
            const word = decodeURIComponent(req.params.word).toLowerCase();
            const _limit = parseInt(req.query.limit) || 8;

            // Get all word records to search through (like original NeDB implementation)
            const allWordRecords = await prisma.word_types.findMany({
                // Remove the take limit to get all records
            });

            const results = [];

            // Search through all records like the original NeDB regex implementation
            allWordRecords.forEach(record => {
                const recordWord = record.word.toLowerCase();

                // Check if word matches the record word (exact or starts with)
                if (recordWord === word || recordWord.startsWith(word)) {
                    if (!results.includes(record.word)) {
                        results.push(record.word);
                    }
                }

                try {
                    const typesArray = Array.isArray(record.types) ? record.types : [];

                    if (typesArray && typesArray.length > 0) {

                        const hasMatch = typesArray.some(type => {

                            if (!type || typeof type !== 'string') {
                                return false;
                            }
                            const typeLower = type.toLowerCase();
                            const wordLower = word.toLowerCase();

                            return typeLower.startsWith(wordLower) || wordLower.startsWith(typeLower);
                        });

                        if (hasMatch && record.word && !results.includes(record.word)) {
                            results.push(record.word);
                        }
                    }
                } catch (parseError) {
                    console.warn(`Failed to process types for word "${record.word}":`, parseError.message);
                }
            });

            // Sort results: exact matches first, then startsWith matches, then by length (shorter first)
            results.sort((a, b) => {
                const aIsExact = a.toLowerCase() === word.toLowerCase();
                const bIsExact = b.toLowerCase() === word.toLowerCase();

                if (aIsExact && !bIsExact) { return -1; }
                if (!aIsExact && bIsExact) { return 1; }

                const aStartsWith = a.toLowerCase().startsWith(word.toLowerCase());
                const bStartsWith = b.toLowerCase().startsWith(word.toLowerCase());

                if (aStartsWith && !bStartsWith) { return -1; }
                if (!aStartsWith && bStartsWith) { return 1; }

                return a.length - b.length;
            });

            // Limit results
            const limitedResults = results.slice(0, _limit);

            res.json(limitedResults);
        } catch (error) {
            console.error('❌ Error fetching word types:', error);
            res.status(500).json({ error: 'Failed to fetch word types' });
        }
    });

    // Get word examples for a specific word
    app.get('/word/examples/:word', async (req, res) => {
        try {
            const word = decodeURIComponent(req.params.word).toLowerCase();
            const _limit = parseInt(req.query.limit) || 8;

            res.json([]);
        } catch (error) {
            console.error('❌ Error fetching word examples:', error);
            res.status(500).json({ error: 'Failed to fetch word examples' });
        }
    });

    // Add new word type via AI
    app.get('/ai/word/add/:word', async (req, res) => {
        try {
            const word = decodeURIComponent(req.params.word).toLowerCase();

            // AI word generation requested

            // TODO: Implement AI word generation
            // For now, return a placeholder response
            res.json({
                message: 'AI word generation not yet implemented',
                word
            });
        } catch (error) {
            console.error('❌ Error in AI word generation:', error);
            res.status(500).json({ error: 'Failed to generate word types' });
        }
    });
};
