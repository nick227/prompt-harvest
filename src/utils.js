import nlp from 'compromise';
import datamuse from 'datamuse';

// Legacy functions removed - now handled by src/routes/wordRoutes.js
// - getWordExamplesList (use /word/examples/:word endpoint)
// - getWordType (use /word/types/:word endpoint with smart scoring)
// - addAiWordType (use /ai/word/add/:word endpoint)


const getWordRelationships = async words => {
    const maxResults = 100;
    const relationshipTypes = [
        // 'rel_par', // Popular nouns modified by the given adjective
        // 'rel_com', // Comprises. Terms that the original word is a part or substance of
        // 'rel_gen', // General. Terms that are more generic than the original word
        // 'rel_spc', // Specific. Terms that are more specific than the original word
        // 'rel_ant', // Antonyms. Terms that have the opposite meaning of the original word
        // 'rel_trg', // Triggers. Terms that are associated with the original word
        // 'rel_syn', // Synonyms. Terms that have the same meaning as the original word
        // 'rel_jja', // Popular adjectives used to modify the original word (if it's a noun)
        'rel_jjb' // Popular nouns which are often described by the original word (if it's an adjective)
        // 'rel_rhy'  // Rhymes. Terms that rhyme with the original word
    ];
    const promises = words.map(word => relationshipTypes.map(type => {
        const request = `words?${type}=${word}&max=${maxResults}`;

        return datamuse.request(request);
    }));
    const results = await Promise.all(promises.map(Promise.all.bind(Promise)));
    const relationships = results.map((result, i) => {
        const relationship = { originalWord: words[i] };

        relationshipTypes.forEach((type, index) => {
            relationship[type] = result[index];
        });

        return relationship;
    });

    return relationships;
};

const analyzeText = prompt => {
    const doc = nlp(prompt);
    const tags = doc.out('tags');

    return { tags };
};

// Legacy AI options function removed - now handled by AI services

const shuffle = array => array.sort(() => Math.random() - 0.5);

export {
    getWordRelationships,
    analyzeText,
    shuffle
};
