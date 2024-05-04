import DB from './DB.js';
import nlp from 'compromise';
import datamuse from 'datamuse';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import feed from './feed.js';
import getWordType from './lib/getWordType.js';

const maxTokens = 15555;
const openAiModel = 'gpt-3.5-turbo-16k';
const maxTokens4 = 3600;
const openAiModel4 = 'gpt-4';

dotenv.config();

OpenAI.apiKey = process.env.OPENAI_API_KEY;

const routes = {
    init: setup
};

export default routes;

function setup(app) {

    app.put('/api/images/:id/rating', async (req, res) => {
        const id = req.params.id;
        const rating = req.body.rating;
        
        if (!id || !rating) {
            res.status(400).send({ message: 'id or rating missing' });
            return;
        }

        try {
            const db = new DB('images.db');
            const result = await db.update({ _id: id }, { $set: { 'data.rating': rating } });
            if (result === 0) {
                res.status(404).send({ message: 'No image found to update' });
            } else {
                res.json({ result, id, rating });
            }
        } catch (err) {
            res.status(500).send(err);
        }
    });

    app.delete('/like/image/:id', async (req, res) => {
        const db = new DB('likes.db');
        const imageId = req.params.id;
        const params = {
            userId: req.user?._id || 'undefined',
            imageId
        };
        await db.remove(params);
        res.send({ status: 'ok' });
    });

    app.post('/like/image/:id', async (req, res) => {
        const db = new DB('likes.db');
        const imageId = req.params.id;
        const params = {
            userId: req.user?._id || 'undefined',
            imageId
        };
        await db.insert(params);
        res.send({ status: 'ok' });
    });

    app.get('/prompt/clauses', async (req, res) => {
        const db = new DB('prompt-clauses.db');
        const limit = req.query.limit || 5;
        const params = {
            userId: req.user?._id || 'undefined',
            limit
        };
        const results = await db.find(params);
        const uniqueResults = [...new Set(results.map(row => row.value))];
        res.send(uniqueResults);
    });

    app.get('/image/:id/liked', async (req, res) => {
        const db = new DB('likes.db');
        const imageId = req.params.id;
        const params = {
            userId: req.user?._id || 'undefined',
            imageId
        };
        const results = await db.findOne(params);
        res.send(String(!!results));
    });

    app.get('/feed', async (req, res) => {
        const images_db = new DB('images.db');
        const limit = req.query.limit || 8;
        let page = req.query.page;
        if (isNaN(page)) {
            page = 0;
        } else {
            page = Number(page);
        }
        const params = {
            userId: req.user?._id || 'undefined',
            limit,
            page
        };

        const images = await images_db.find(params);
        const data = images.map((image) => {
            const results = image.data;
            results.id = image._id;
            return results;
        });

        res.send(data);

    });

    app.get('/images', async (req, res) => {
        const userId = req.user?._id;
        const db = new DB('images.db');
        const likesDb = new DB('likes.db');
        const limit = req.query.limit || 8;
        let page = req.query.page;
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
        res.send(response.map((doc) => {
            const results = doc.data;
            results.id = doc._id;
            return results;
        }));
    });

    app.get('/prompts', async (req, res) => {
        const userId = req.user?._id;
        const limit = req.query.limit || 8;
        let page = req.query.page;
        if (isNaN(page)) {
            page = 0;
        } else {
            page = Number(page);
        }
        const db = new DB('prompts.db');
        const params = {
            userId: userId || 'undefined',
            limit,
            page
        };
        const response = await db.find(params);
        res.send(response.map(doc => doc.data));
    });

    app.get('/images/count', async (req, res) => {
        const userId = req.user?._id;
        const db = new DB('images.db');
        const params = {
            userId: userId || 'undefined'
        };
        const response = await db.count(params);
        res.send({ count: response });
    });

    app.get('/prompt/build', async (req, res) => {
        const prompt = decodeURIComponent(req.query.prompt);
        const multiplier = req.query.multiplier ? decodeURIComponent(req.query.multiplier) : false;
        const mixup = req.query.mixup ? decodeURIComponent(req.query.mixup) : false;
        const mashup = req.query.mashup ? decodeURIComponent(req.query.mashup) : false;
        const customVariables = decodeURIComponent(req.query.customVariables);
        const response = await feed.prompt.build(prompt, multiplier, mixup, mashup, customVariables, req);
        res.send(response);
    });

    app.delete('/images/tags', async (req, res) => {
        const db = new DB('tags.db');
        const imageId = req.body.imageId;
        const tag = req.body.tag;
        const userId = req.user?._id || 'undefined';
        const params = {
            imageId,
            tag,
            userId
        };
        await db.remove(params);
        res.send({ status: 'ok' });
    });

    app.post('/images/tags', async (req, res) => {
        const db = new DB('tags.db');
        const imageId = req.body.imageId;
        const tag = req.body.tag;
        const userId = req.user?._id || 'undefined';
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

    app.get('/images/:imageId/tags', async (req, res) => {
        const db = new DB('tags.db');
        const imageId = req.params.imageId;
        const params = {
            userId: req.user?._id || 'undefined',
            imageId
        };
        const results = await db.find(params);
        res.send(results.map(obj => obj.tag));
    });

    app.post('/image/generate', async (req, res) => {
        const prompt = decodeURIComponent(req.body.prompt);
        const providers = decodeURIComponent(req.body.providers).split(',');
        const guidance = isNaN(req.body.guidance) ? false : parseInt(req.body.guidance);
        const promptId = req.body.promptId;
        const original = req.body.original;
        const response = await feed.image.generate(prompt, original, promptId, providers, guidance, req);
        res.send(response);
    });

    app.get('/word/type/:word', async (req, res) => {
        const word = decodeURIComponent(req.params.word).toLowerCase();
        const limit = req.query.limit || 8;
        const response = await getWordType(word, parseInt(limit));
        res.send(response);
    });

    app.get('/word/examples/:word', async (req, res) => {
        const limit = req.query.limit || 8;
        const word = decodeURIComponent(req.params.word).toLowerCase();
        const response = await getWordExamplesList(word, parseInt(limit));
        res.send(response);
    });

    app.get('/word/types/:word', async (req, res) => {
        const limit = req.query.limit || 8;
        const word = decodeURIComponent(req.params.word).toLowerCase();
        const response = await getWordTypesList(word, parseInt(limit));
        res.send(response);
    });

    app.get('/words', async (req, res) => {
        const db = new DB('word-types.db');
        let response = await db.find({ projection: JSON.stringify({ word: 1 }) });
        response = response.map(doc => doc.word);
        response.sort();
        res.send(response);
    });

    app.get('/ai/word/add/:word', async (req, res) => {
        const word = decodeURIComponent(req.params.word).toLowerCase();
        const response = await addAiWordType(word);
        res.send(response);
    });
}

async function getWordExamplesList(word, limit = 8) {
    const db = new DB('word-examples.db');
    const docs = await db.find({
        limit: limit,
        $or: [
            { word: word }
        ]
    });
    let examples = docs[0]?.examples || [];
    examples.sort();
    return examples;
}

async function getWordTypesList(word, limit = 8) {
    const db = new DB('word-types.db');
    const docs = await db.find({
        limit: limit,
        $or: [
            { word: word }
        ]
    });
    let types = docs[0]?.types || [];
    types.sort();
    return types;
}

async function addAiWordType(word) {
    try {
        const db = new DB('word-types.db');
        const options = createAddWordAIOptions(word);
        const openai = new OpenAI();
        const res = await openai.chat.completions.create(options);
        const resObj = extractOpenAiResponse(res);

        if (resObj && typeof resObj.types === 'object') {
            const types = resObj.types;
            db.insert({ word, types }, (err, newDoc) => {
                if (err) {
                    console.error(`Failed to insert record: ${err}`);
                }
            });
        }
        return res;
    } catch (error) {
        console.error(error);
        return { error: error.message };
    }
}

function extractOpenAiResponse(response) {
    if (!response || !response.choices || response.choices.length === 0) {
        return null;
    }
    const firstChoice = response.choices[0];
    if (!firstChoice.message || !firstChoice.message.tool_calls || firstChoice.message.tool_calls.length === 0) {
        return null;
    }
    const firstToolCall = firstChoice.message.tool_calls[0];
    if (firstToolCall.function && firstToolCall.function.arguments) {
        return typeof firstToolCall.function.arguments === 'object'
            ? firstToolCall.function.arguments
            : safeJsonParse(firstToolCall.function.arguments);
    }
    return null;
}

function safeJsonParse(str) {
    try {
        return JSON.parse(str);
    } catch (error) {
        return str;
    }
}

function createAddWordAIOptions(word) {
    return {
        model: openAiModel4,
        messages: [
            { "role": "user", "content": `Attempt to generate at least 75 unique examples of "${word}".` },
        ],
        max_tokens: maxTokens4,
        tool_choice: { "type": "function", "function": { "name": "get_word_types" } },
        tools: [{
            "type": "function",
            "function": {
                "name": "get_word_types",
                "description": `Gets types of "${word}"`,
                "parameters": {
                    "type": "object",
                    "properties": {
                        "types": {
                            "type": "array",
                            "description": "Examples or types of the user prompt, attempt 75 unique examples.",
                            "items": {
                                "type": "string",
                                "description": "A type of ${word}."
                            }
                        }
                    },
                    "required": ["types"]
                }
            }
        }]
    };
}


async function saveTransaction(prompt, transaction) {
    const db = new DB('transaction.db');
    await db.insert({ prompt, transaction });
}