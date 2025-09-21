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
            console.log('🔍 /words endpoint called - fetching from MySQL');

            const wordRecords = await prisma.word_types.findMany({
                select: { word: true, types: true }
            });

            const response = wordRecords.map(record => ({
                word: record.word,
                types: record.types
            }));

            response.sort((a, b) => a.word.localeCompare(b.word));

            console.log(`✅ Found ${response.length} words in MySQL`);
            res.json(response);
        } catch (error) {
            console.error('❌ Error fetching words:', error);
            res.status(500).json({ error: 'Failed to fetch words' });
        }
    });

    // Get word types for a specific word (with fuzzy matching like original NeDB implementation)
    app.get('/word/types/:word', async (req, res) => {
        try {
            const word = decodeURIComponent(req.params.word).toLowerCase();
            const _limit = parseInt(req.query.limit) || 8;

            console.log(`🔍 Fetching types for word: ${word}`);

            // Get all word records to search through (like original NeDB implementation)
            const allWordRecords = await prisma.word_types.findMany({
                take: 1000 // Get a large number to search through
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

                // Check if word is in the types array
                if (record.types && Array.isArray(record.types)) {
                    const hasMatch = record.types.some(type => type && type.toLowerCase().includes(word.toLowerCase())
                    );

                    if (hasMatch && record.word && !results.includes(record.word)) {
                        results.push(record.word);
                    }
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

                // Then sort by length (shorter first)
                return a.length - b.length;
            });

            // Limit results
            const limitedResults = results.slice(0, _limit);

            console.log(`✅ Found ${limitedResults.length} total matches for word: ${word}`);
            console.log('🔍 Results:', limitedResults);
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

            console.log(`🔍 Fetching examples for word: ${word}`);

            // For now, return empty array since we don't have examples migrated yet
            // TODO: Migrate word-examples.db to MySQL as well
            console.log(`⚠️ Examples not yet migrated for word: ${word}`);
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

            console.log(`🔍 AI word generation requested for: ${word}`);

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
