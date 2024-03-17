import express from 'express';
import DB from './DB.js';
import nlp from 'compromise';
import datamuse from 'datamuse';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import {buildPrompt, generateImage} from './chat.js';

const maxTokens = 15555;
const openAiModel = 'gpt-3.5-turbo-16k';

dotenv.config();

OpenAI.apiKey = process.env.OPENAI_API_KEY;

const app = express();
app.use(express.static('public'));

app.listen(3000, () => console.log('Example app listening on port 3000!'));

app.get('/prompt/boost', async (req, res) => {
    const prompt = req.query.prompt;
    const response = await processPrompt(prompt);
    await saveTransaction(prompt, response);
    res.send(response);
});

app.get('/chat/build', async (req, res) => {
    const prompt = decodeURIComponent(req.query.prompt);
    const response = await buildPrompt(prompt);
    res.send(response);
});

app.get('/chat/generate', async (req, res) => {
    const prompt = decodeURIComponent(req.query.prompt);
    const response = await generateImage(prompt);
    console.log("ok");
    res.send(response);

});

app.get('/word/type/:word', async (req, res) => {
    const word = decodeURIComponent(req.params.word).toLowerCase();
    const response = await getWordType(word);
    res.send(response);
});

async function getWordType(word) {
    const db = new DB('word-types.db');
    const wordDocs = await db.find({
        word: { $regex: new RegExp(word, 'i') },
        projection: JSON.stringify({ word: 1 }),
        sort: JSON.stringify({ word: 1 }) 
    });
    const typeDocs = await db.find({
        types: { $regex: new RegExp(word, 'i') },
        projection: JSON.stringify({ word: 1 }),
        sort: JSON.stringify({ word: 1 }) 
    });
    const docs = [...wordDocs, ...typeDocs];
    const results = [...new Set(docs.map(doc => doc.word))];
    return results;
} 


app.get('/word/types/:word', async (req, res) => {
    const word = decodeURIComponent(req.params.word).toLowerCase();
    const response = await getWordTypesList(word);
    res.send(response);
});

async function getWordTypesList(word) {
    const db = new DB('word-types.db');
    const docs = await db.find({
        $or: [
            { word: word }
        ]
    });
    let types = docs[0]?.types || [];
    types.sort();
    return types;
}

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

async function addAiWordType(word) {
    try {
        const db = new DB('word-types.db');
        const options = createAddWordAIOptions(word);
        const openai = new OpenAI();
        const res = await openai.chat.completions.create(options);
        const resObj = extractOpenAiResponse(res);
        if(resObj && resObj.types){
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
        model: openAiModel,
        messages: [
            { "role": "user", "content": `Attempt to generate at least 90 types of "${word}". Be creative and thorough.` },
        ],
        max_tokens: maxTokens,
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
                            "description": "Example types of the user prompt, attempt 90 examples, use common and creative types.",
                            "items": {
                                "type": "string",
                                "description": "An example of the word type"
                            }
                        }
                    },
                    "required": ["types"]
                }
            }
        }]
    };
}

/*

{ $regex: new RegExp(word, 'i') }

    const docs = await db.find({
        $or: [
            { types: { $in: [word] } },
            { word: word }
        ],
        projection: JSON.stringify({ word: 1 })
    });

*/

/*
async function processWordTypes() {
    const db = new DB('word-types.db');
    for (const key in index) {
        const records = index[key];
        const doc = { word: key, types: records };

        // Check if the type already exists
        const existingDoc = await db.findOne({ word: key });

        if (existingDoc) {
            continue;
        }
        console.log("Inserting key: ", key);

        db.insert(doc, function (err, newDoc) {
            if (err) {
                console.error(`Failed to insert record: ${record}`);
            } else {
                console.log(`Inserted record: ${newDoc}`);
            }
        });
    }
}*/

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