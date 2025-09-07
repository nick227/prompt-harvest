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

    // Get word types for a specific word
    app.get('/word/types/:word', async (req, res) => {
        try {
            const word = decodeURIComponent(req.params.word).toLowerCase();
            const _limit = parseInt(req.query.limit) || 8;

            console.log(`🔍 Fetching types for word: ${word}`);

            const wordRecord = await prisma.word_types.findUnique({
                where: { word }
            });

            if (!wordRecord || !wordRecord.types) {
                console.log(`⚠️ No types found for word: ${word}`);

                return res.json([]);
            }

            const types = Array.isArray(wordRecord.types) ? wordRecord.types : [];
            const limitedTypes = types.slice(0, _limit).sort();

            console.log(`✅ Found ${limitedTypes.length} types for word: ${word}`);
            res.json(limitedTypes);
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
