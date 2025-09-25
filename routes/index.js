import DB from '../db/DB.js';
import nlp from 'compromise';
import datamuse from 'datamuse';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import feed from '../src/feed.js';
import DatabaseService from '../src/services/feed/DatabaseService.js';
import getWordType from '../lib/getWordType.js';
import wordTypeManager from '../lib/word-type-manager.js';

const maxTokens = 15555;
const openAiModel = 'gpt-3.5-turbo-16k';
const maxTokens4 = 3600;
const openAiModel4 = 'gpt-4';

dotenv.config();

OpenAI.apiKey = process.env.OPENAI_API_KEY;

// Legacy setupImageRoutes removed - now using enhanced routes with proper middleware

const setupLikeRoutes = app => {
    app.delete('/like/image/:id', async(req, res) => {
        const db = new DB('likes.db');
        const { id: imageId } = req.params;
        const params = {
            userId: req.user._id || 'undefined',
            imageId
        };

        await db.remove(params);

        res.send({ status: 'ok' });
    });

    app.post('/like/image/:id', async(req, res) => {
        const db = new DB('likes.db');
        const { id: imageId } = req.params;
        const params = {
            userId: req.user._id || 'undefined',
            imageId
        };

        await db.insert(params);

        res.send({ status: 'ok' });
    });

    app.get('/image/:id/liked', async(req, res) => {
        const db = new DB('likes.db');
        const { id: imageId } = req.params;
        const params = {
            userId: req.user._id || 'undefined',
            imageId
        };
        const results = await db.findOne(params);

        res.send(String(!!results));
    });
};

const setupDownloadRoutes = app => {
    app.get('/api/download/:listName/:subject/:word', async(req, res) => {
        const { listName, subject, word } = req.params;
        const db = new DB('wordmaps.db');
        const params = {
            subject,
            word
        };
        const response = await db.findOne(params);

        console.log('response', response);

        const result = response[listName];

        res.json(result);
    });
};

const setupPromptRoutes = app => {
    app.get('/prompt/clauses', async(req, res) => {
        const db = new DB('prompt-clauses.db');
        const limit = req.query.limit || 5;
        const params = {
            userId: req.user && req.user._id ? req.user._id : 'undefined',
            limit
        };
        const results = await db.find(params);
        const uniqueResults = [...new Set(results.map(row => row.value))];

        res.send(uniqueResults);
    });

    app.get('/prompt/build', async(req, res) => {
        const prompt = decodeURIComponent(req.query.prompt);
        const multiplier = req.query.multiplier ? decodeURIComponent(req.query.multiplier) : false;
        const mixup = req.query.mixup ? decodeURIComponent(req.query.mixup) : false;
        const mashup = req.query.mashup ? decodeURIComponent(req.query.mashup) : false;
        const customVariables = decodeURIComponent(req.query.customVariables);
        const response = await feed.buildPrompt(prompt, multiplier, mixup, mashup, customVariables, req);

        res.send(response);
    });

    // Cache statistics endpoint for monitoring
    app.get('/api/cache/stats', (req, res) => {
        const stats = wordTypeManager.getCacheStats();

        res.json(stats);
    });

    // Clear cache endpoint (for debugging)
    app.post('/api/cache/clear', (req, res) => {
        wordTypeManager.clearCache();
        res.json({ message: 'Cache cleared successfully' });
    });

    // Old prompts route removed - now using /api/prompts with proper authentication
};

const setupFeedRoutes = app => {
    app.get('/feed', handleFeedRequest);
    app.get('/images', handleImagesRequest);
    app.get('/images/count', handleImagesCountRequest);
};

const handleFeedRequest = async(req, res) => {
    const imagesDb = new DB('images.db');
    const limit = req.query.limit || 8;
    let { page } = req.query;

    if (isNaN(page)) {
        page = 0;
    } else {
        page = Number(page);
    }
    const params = {
        userId: req.user && req.user._id ? req.user._id : 'undefined',
        limit,
        page
    };

    const images = await imagesDb.find(params);
    const data = images.map(image => {
        const results = image.data;

        results.id = image._id;

        return results;
    });

    res.send(data);
};

const handleImagesRequest = async(req, res) => {
    const userId = req.user && req.user._id ? req.user._id : 'undefined';
    const db = new DB('images.db');
    const likesDb = new DB('likes.db');
    const limit = req.query.limit || 8;
    let { page } = req.query;

    if (isNaN(page)) {
        page = 0;
    } else {
        page = Number(page);
    }
    const params = {
        userId: userId || 'undefined',
        limit,
        page
    };
    const response = await db.find(params);
    const likesResponse = await likesDb.find(params);

    res.send(response.map(doc => {
        const results = doc.data;

        results.id = doc._id;

        return results;
    }));
};

const handleImagesCountRequest = async(req, res) => {
    if (!req.user) {
        res.send({ count: 0 });
    } else {
        const userId = req.user._id;
        const db = new DB('images.db');
        const params = {
            userId: userId || 'undefined'
        };
        const response = await db.count(params);

        res.send({ count: response });
    }
};

const setupTagRoutes = app => {
    app.delete('/images/tags', async(req, res) => {
        const db = new DB('tags.db');
        const { imageId, tag } = req.body;
        const userId = req.user._id || 'undefined';
        const params = {
            imageId,
            tag,
            userId
        };

        await db.remove(params);

        res.send({ status: 'ok' });
    });

    app.post('/images/tags', async(req, res) => {
        const db = new DB('tags.db');
        const { imageId, tag } = req.body;
        const userId = req.user._id || 'undefined';
        const params = {
            imageId,
            tag,
            userId
        };
        const query = {
            imageId,
            tag,
            userId
        };

        await db.upsert(query, params);

        res.send({ status: 'ok' });
    });

    app.get('/images/:imageId/tags', async(req, res) => {
        const db = new DB('tags.db');
        const { imageId } = req.params;
        const params = {
            userId: req.user._id || 'undefined',
            imageId
        };
        const results = await db.find(params);

        res.send(results.map(obj => obj.tag));
    });
};


const setupWordRoutes = app => {
    app.get('/word/type/:word', async(req, res) => {
        const word = decodeURIComponent(req.params.word).toLowerCase();
        const limit = req.query.limit || 8;
        const response = await getWordType(word, parseInt(limit));

        res.send(response);
    });

    app.get('/word/examples/:word', async(req, res) => {
        const limit = req.query.limit || 8;
        const word = decodeURIComponent(req.params.word).toLowerCase();
        const response = await getWordExamplesList(word, parseInt(limit));

        res.send(response);
    });

    app.get('/word/types/:word', async(req, res) => {
        const limit = req.query.limit || 8;
        const word = decodeURIComponent(req.params.word).toLowerCase();
        const response = await getWordTypesList(word, parseInt(limit));

        res.send(response);
    });

    app.get('/words', async(req, res) => {
        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();

        try {
            const wordRecords = await prisma.word_types.findMany({
                select: { word: true, types: true }
            });

            // Return structured data with both words and types for deeper matching
            const response = wordRecords.map(record => ({
                word: record.word,
                types: Array.isArray(record.types) ? record.types : []
            }));

            res.send(response);
        } catch (error) {
            console.error('Error fetching words:', error);
            res.status(500).send({ error: 'Failed to fetch words' });
        } finally {
            await prisma.$disconnect();
        }
    });

    app.get('/ai/word/add/:word', async(req, res) => {
        const word = decodeURIComponent(req.params.word).toLowerCase();
        const response = await addAiWordType(word);

        res.send(response);
    });
};

const getWordExamplesList = async(word, limit = 8) => {
    const db = new DB('word-examples.db');
    const docs = await db.find({
        limit,
        $or: [
            { word }
        ]
    });

    // Check if docs array exists and has at least one element
    if (!docs || docs.length === 0 || !docs[0]) {
        return [];
    }

    const examples = docs[0].examples || [];

    examples.sort();

    return examples;
};

const getWordTypesList = async(word, limit = 8) => {
    try {
        // Use Prisma to query the new MySQL word_types table
        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();

        const wordRecord = await prisma.word_types.findUnique({
            where: { word: word.toLowerCase() }
        });

        await prisma.$disconnect();

        if (!wordRecord || !wordRecord.types) {
            return [];
        }

        const types = Array.isArray(wordRecord.types) ? wordRecord.types : [];
        return types.slice(0, limit).sort();
    } catch (error) {
        console.error('Error fetching word types:', error);
        return [];
    }
};

const addAiWordType = async word => {
    try {
        const options = createAddWordAIOptions(word);
        const openai = new OpenAI();
        const res = await openai.chat.completions.create(options);
        const resObj = extractOpenAiResponse(res);

        if (resObj && typeof resObj.types === 'object') {
            const { types } = resObj;

            // Use Prisma to insert into the new MySQL word_types table
            const { PrismaClient } = await import('@prisma/client');
            const prisma = new PrismaClient();

            await prisma.word_types.create({
                data: {
                    word: word.toLowerCase(),
                    types: types
                }
            });

            await prisma.$disconnect();
        }

        return res;
    } catch (error) {
        console.error(error);
        return { error: error.message };
    }
};

const extractOpenAiResponse = response => {
    if (!response || !response.choices || response.choices.length === 0) {
        return null;
    }
    const [firstChoice] = response.choices;

    if (!firstChoice.message || !firstChoice.message.tool_calls || firstChoice.message.tool_calls.length === 0) {
        return null;
    }
    const [firstToolCall] = firstChoice.message.tool_calls;

    if (firstToolCall.function && firstToolCall.function.arguments) {
        return typeof firstToolCall.function.arguments === 'object' ?
            firstToolCall.function.arguments :
            safeJsonParse(firstToolCall.function.arguments);
    }

    return null;
};

const safeJsonParse = str => {
    try {
        return JSON.parse(str);
    } catch (error) {
        return str;
    }
};

const createAddWordAIOptions = word => ({
    model: openAiModel4,
    messages: [
        { role: 'user', content: `Attempt to generate at least 75 unique examples of "${word}".` }
    ],
    max_tokens: maxTokens4,
    tool_choice: { type: 'function', function: { name: 'get_word_types' } },
    tools: [{
        type: 'function',
        function: {
            name: 'get_word_types',
            description: `Gets types of "${word}"`,
            parameters: {
                type: 'object',
                properties: {
                    types: {
                        type: 'array',
                        description: 'Examples or types of the user prompt, attempt 75 unique examples.',
                        items: {
                            type: 'string',
                            description: `A type of ${word}.`
                        }
                    }
                },
                required: ['types']
            }
        }
    }]
});

const init = app => {
    // setupImageRoutes(app); // Removed - using enhanced routes instead
    setupLikeRoutes(app);
    setupDownloadRoutes(app);
    setupPromptRoutes(app);
    setupFeedRoutes(app);
    setupTagRoutes(app);
    setupWordRoutes(app);
};

const routes = {
    init
};

export default routes;
