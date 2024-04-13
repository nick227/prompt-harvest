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

async function getWordType(word, limit) {
    const db = new DB('word-types.db');
    const escapedWord = escapeRegExp(word);
    const wordDocs = await db.find({
        word: { $regex: new RegExp('^' + escapedWord + '$', 'i') },
        projection: JSON.stringify({ word: 1 }),
        limit: limit
    });
    const typeDocs = await db.find({
        types: { $regex: new RegExp(escapedWord, 'i') },
        projection: JSON.stringify({ word: 1 }),
        limit: limit
    });
    const docs = [...wordDocs, ...typeDocs].slice(0, limit);
    let results = [...new Set(docs.map(doc => doc.word))];

    // Remove blank or empty strings
    results = results.filter(word => word.trim() !== '');

    // Sort the results to prioritize exact matches
    results.sort((a, b) => {
        const aIsExactMatch = a.toLowerCase() === word.toLowerCase();
        const bIsExactMatch = b.toLowerCase() === word.toLowerCase();

        if (aIsExactMatch && !bIsExactMatch) {
            return -1; // a comes first
        } else if (!aIsExactMatch && bIsExactMatch) {
            return 1; // b comes first
        } else {
            return 0; // no change
        }
    });

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
            const newTypes = resObj.types;

            // Find the existing document for the word
            const existingDoc = await db.find({ word.word });

            let types;
            if (existingDoc) {
                // If the document exists, merge the new types with the existing ones
                types = [...new Set([...existingDoc.types, ...newTypes])];
            } else {
                // If the document doesn't exist, use the new types
                types = newTypes;
            }

            // Upsert the document
            await db.upsert({ word }, { word, types });
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


async function getWordRelationships(words) {
    const maxResults = 100;
    const relationshipTypes = [
        //'rel_par', // Popular nouns modified by the given adjective
        //'rel_com', // Comprises. Terms that the original word is a part or substance of
        //'rel_gen', // General. Terms that are more generic than the original word
        //'rel_spc', // Specific. Terms that are more specific than the original word
        //'rel_ant', // Antonyms. Terms that have the opposite meaning of the original word
        //'rel_trg', // Triggers. Terms that are associated with the original word
        //'rel_syn', // Synonyms. Terms that have the same meaning as the original word
        //'rel_jja', // Popular adjectives used to modify the original word (if it's a noun)
        'rel_jjb', // Popular nouns which are often described by the original word (if it's an adjective)
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

export {
    getWordExamplesList,
    getWordType,
    addAiWordType,
    getWordRelationships,
    analyzeText
};  