import DB from './DB.js';
import nlp from 'compromise';
import datamuse from 'datamuse';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import feed from './feed.js';

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
    app.get('/prompt/boost', async (req, res) => {
        const prompt = req.query.prompt;
        const response = await processPrompt(prompt);
        await saveTransaction(prompt, response);
        res.send(response);
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
        const customVariables = decodeURIComponent(req.query.customVariables);
        const response = await feed.prompt.build(prompt, multiplier, mixup, customVariables, req);
        res.send(response);
    });

    app.get('/image/tags', async (req, res) => {
        const db = new DB('tags.db');
        const imageId = req.query.imageId;
        const userId = req.user?._id;
        const params = {
            imageId,
            userId
        };
        const results = await db.find(params);
        res.send(results.map(obj => obj.tag));

    });

        app.post('/image/tag', async (req, res) => {
        const db = new DB('tags.db');
        const imageId = req.body.imageId;
        const tag = req.body.tag;
        const userId = req.user?._id;
        const params = {
            imageId,
            tag,
            userId
        };
        await db.insert(params);
        res.send({ status: 'ok' });
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

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function getWordType(word, limit) {
    const db = new DB('word-types.db');
    const escapedWord = escapeRegExp(word);
    const wordDocs = await db.find({
        word: { $regex: new RegExp('^' + escapedWord, 'i') },
        projection: JSON.stringify({ word: 1 }),
        limit: limit
    });
    const typeDocs = await db.find({
        types: { $regex: new RegExp('^' + escapedWord, 'i') },
        projection: JSON.stringify({ word: 1 }),
        limit: limit
    });
    const docs = [...wordDocs, ...typeDocs].slice(0, limit);
    let results = [...new Set(docs.map(doc => doc.word))];

    // Remove blank or empty strings
    results = results.filter(word => word.trim() !== '');

    // Sort the results to prioritize exact matches and startsWith matches
    results.sort((a, b) => {
        const aIsExactMatch = a.toLowerCase() === word.toLowerCase();
        const bIsExactMatch = b.toLowerCase() === word.toLowerCase();
        const aStartsWith = a.toLowerCase().startsWith(word.toLowerCase());
        const bStartsWith = b.toLowerCase().startsWith(word.toLowerCase());

        if ((aIsExactMatch || aStartsWith) && !(bIsExactMatch || bStartsWith)) {
            return -1; // a comes first
        } else if (!(aIsExactMatch || aStartsWith) && (bIsExactMatch || bStartsWith)) {
            return 1; // b comes first
        } else {
            return 0; // no change
        }
    });

    console.log(results);
    return results;
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

async function processPrompt(prompt) {

    try {
        const words = [...new Set(prompt.split(' '))];
        let phraseCategories, nlpResults, wordRelationships;

        phraseCategories = extractOpenAiResponse(await getPhraseCategories(words));
        wordRelationships = await getWordRelationships(words);
        nlpResults = analyzeText(prompt);

        return {
            categories: phraseCategories,
            relationsships: wordRelationships,
            nlp: nlpResults,
            prompt: prompt
        };
    }
    catch (error) {
        console.log(error);
        return { error: error.message };
    }
}

async function saveTransaction(prompt, transaction) {
    const db = new DB('transaction.db');
    await db.insert({ prompt, transaction });
}

async function saveSynonyms(key, data) {
    const payload = {
        word: data.word,
        synonyms: data.synonyms,
        alternates: data.alternates,
    };

    const db = new DB('synonyms.db');
    await db.insert({ prompt, response });

}

async function getWordRelationships(words) {
    const maxResults = 100;
    const relationshipTypes = [
        //'rel_par', // Popular nouns modified by the given adjective
        //'rel_com', // Comprises. Terms that the original word is a part or substance of
        //'rel_gen', // General. Terms that are more generic than the original word
        //'rel_spc', // Specific. Terms that are more specific than the original word
        //'rel_ant', // Antonyms. Terms that have the opposite meaning of the original word
        //'rel_trg', // Triggers. Terms that are associated with the original word
        'rel_syn', // Synonyms. Terms that have the same meaning as the original word
        //'rel_jja', // Popular adjectives used to modify the original word (if it's a noun)
        //'rel_jjb', // Popular nouns which are often described by the original word (if it's an adjective)
        //'rel_rhy'  // Rhymes. Terms that rhyme with the original word
    ];
    const promises = words.map(word => {
        return relationshipTypes.map(type => {
            const request = `words?${type}=${word}&max=${maxResults}`;
            return datamuse.request(request);
        });
    });
    const results = await Promise.all(promises.map(Promise.all.bind(Promise)));
    const relationships = results.map((result, i) => {
        let relationship = { originalWord: words[i] };
        relationshipTypes.forEach((type, index) => {
            relationship[type] = result[index];
        });
        return relationship;
    });
    return relationships;
}

function analyzeText(prompt) {
    const doc = nlp(prompt);
    const tags = doc.out('tags');
    return { tags };
}

function createOpenAIOptions(phrase) {
    return {
        model: 'gpt-3.5-turbo-16k',
        messages: [
            { "role": "user", "content": `${phrase}` },
            { "role": "system", "content": "Analyze the given phrase and provide two arrays based on the words in the phrase. For the phrase provided, create the first array with the most obvious general 'type' or taxonomy for each word. Then, create a second 2D array containing less common types for each word. For example, for the phrase 'cat big yellow', the first array should be ['animal', 'size', 'color'], and the second array should be [['feline', 'mammal', 'pet'], ['description', 'adjective', 'modifier'], ['hue', 'lighting', 'tint']]." }
        ],
        max_tokens: 8000,
        tool_choice: { "type": "function", "function": { "name": "categorize_words" } },
        tools: [{
            "type": "function",
            "function": {
                "name": "categorize_words",
                "description": "Analyzes the words in user prompt",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "common": {
                            "type": "array",
                            "description": "Word to word map of the most common types for each word in the prompt",
                            "items": {
                                "type": "string",
                                "description": "For example football -> sport"
                            }
                        },
                        "alternate": {
                            "type": "array",
                            "description": "Top level of arrays are the words in the prompt. The second level of arrays are the less common types for each word",
                            "items": {
                                "type": "array",
                                "description": "For example soccer -> sport, ball, game",
                                "items": {
                                    "type": "string"
                                }
                            }
                        }
                    },
                    "required": ["common", "alternate"]
                }
            }
        }]
    };
}

async function getPhraseCategories(phrase) {
    const options = createOpenAIOptions(phrase);
    const openai = new OpenAI();
    const res = await openai.chat.completions.create(options);
    return res;
}
