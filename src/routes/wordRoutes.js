/**
 * Word Routes - Handle word types and examples
 */

import databaseClient from '../database/PrismaClient.js';

const prisma = databaseClient.getClient();

// Helper function to score word matches
const scoreWordMatch = (record, searchWord) => {
    if (!record?.word || typeof record.word !== 'string' || record.word.trim() === '') {
        return null;
    }

    const mainWord = record.word.toLowerCase();
    const relatedTerms = Array.isArray(record.types) ? record.types : [];
    let bestScore = 0;

    // Priority 1: Main word matches (highest priority)
    if (mainWord === searchWord) {
        bestScore = 100; // Exact match on main word
    } else if (mainWord.startsWith(searchWord)) {
        bestScore = 80; // StartsWith on main word
    }

    // Priority 2: Related terms matches (only if no main word match)
    if (bestScore === 0) {
        for (const relatedTerm of relatedTerms) {
            if (!relatedTerm || typeof relatedTerm !== 'string') {
                continue;
            }

            const relatedTermLower = relatedTerm.toLowerCase();

            if (relatedTermLower === searchWord) {
                bestScore = 90; // Exact match on related term
                break;
            } else if (relatedTermLower.startsWith(searchWord)) {
                bestScore = Math.max(bestScore, 70); // StartsWith on related term
            }
        }
    }

    return bestScore > 0
        ? {
            word: record.word,
            score: bestScore,
            length: record.word.length
        }
        : null;
};

// eslint-disable-next-line max-lines-per-function
export const setupWordRoutes = app => {
    // Get all words (for terms.html)
    app.get('/words', async (req, res) => {
        try {
            const wordRecords = await prisma.word_types.findMany({
                select: { word: true, types: true }
            });

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

    // Get word types for a specific word with intelligent scoring
    app.get('/word/types/:word', async (req, res) => {
        try {
            const searchWord = decodeURIComponent(req.params.word).toLowerCase().trim();
            const limit = parseInt(req.query.limit) || 8;

            if (!searchWord || searchWord.length === 0) {
                return res.json([]);
            }

            // Load all word records (needed to check JSON array types field)
            const allWordRecords = await prisma.word_types.findMany({
                select: { word: true, types: true }
            });

            const seenWords = new Set();
            const scoredResults = [];

            // Score each record using helper function
            for (const record of allWordRecords) {
                if (seenWords.has(record.word)) {
                    continue;
                }

                const result = scoreWordMatch(record, searchWord);

                if (result) {
                    seenWords.add(record.word);
                    scoredResults.push(result);
                }
            }

            // Sort by score DESC, then length ASC
            scoredResults.sort((a, b) => (a.score !== b.score ? b.score - a.score : a.length - b.length));

            const limitedResults = scoredResults.slice(0, limit).map(r => r.word);

            res.json(limitedResults);
        } catch (error) {
            console.error('❌ Error fetching word types:', error);
            res.status(500).json({ error: 'Failed to fetch word types' });
        }
    });

    // Get word examples for a specific word
    app.get('/word/examples/:word', async (req, res) => {
        try {
            const _word = decodeURIComponent(req.params.word).toLowerCase();
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
