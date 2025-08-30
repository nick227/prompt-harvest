

app.get('/prompt/boost', async (req, res) => {
    const prompt = req.query.prompt;
    const response = await processPrompt(prompt);
    await saveTransaction(prompt, response);
    res.send(response);
});

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

async function getPhraseCategories(phrase) {
    const options = createOpenAIOptions(phrase);
    const openai = new OpenAI();
    const res = await openai.chat.completions.create(options);
    return res;
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