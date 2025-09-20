import DB from '../db/DB.js';
import dotenv from 'dotenv';

dotenv.config();

async function getDocsFromDB(db, query, limit) {
    return await db.find({
        ...query,
        projection: JSON.stringify({ word: 1 }),
        limit: limit / 2
    });
}

function sortDocsByLength(docs) {
    docs.sort((a, b) => a.word.length - b.word.length);

    return docs;
}

function combineAndLimitDocs(wordDocs, typeDocs, limit) {
    return [...wordDocs, ...typeDocs].slice(0, limit);
}

function extractUniqueWords(docs) {
    return [...new Set(docs.map(doc => doc.word))];
}

function removeEmptyStrings(words) {
    return words.filter(word => word.trim() !== '');
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sortWords(words, word) {
    words.sort((a, b) => {
        if (typeof a !== 'string' || typeof b !== 'string') {
            return 0;
        }
        const aIsExactMatch = a.toLowerCase() === word.toLowerCase();
        const bIsExactMatch = b.toLowerCase() === word.toLowerCase();
        const aStartsWith = a.toLowerCase().startsWith(word.toLowerCase());
        const bStartsWith = b.toLowerCase().startsWith(word.toLowerCase());
        const aContains = a.toLowerCase().includes(word.toLowerCase());
        const bContains = b.toLowerCase().includes(word.toLowerCase());

        if ((aIsExactMatch || aStartsWith) && !(bIsExactMatch || bStartsWith)) {
            return -1; // a comes first
        } else if (!(aIsExactMatch || aStartsWith) && (bIsExactMatch || bStartsWith)) {
            return 1; // b comes first
        } else if (aContains && !bContains) {
            return -1; // a comes first
        } else if (!aContains && bContains) {
            return 1; // b comes first
        } else {
            return 0; // no change
        }
    });

    return words;
}

async function getWordType(word, limit) {
    const db = new DB('word-types.db');
    const escapedWord = escapeRegExp(word);

    const wordDocs = await getDocsFromDB(db, { word: { $regex: new RegExp(escapedWord, 'i') } }, limit);
    const typeDocs = await getDocsFromDB(db, { types: { $regex: new RegExp(escapedWord, 'i') } }, limit);

    const sortedWordDocs = sortDocsByLength(wordDocs);
    const docs = combineAndLimitDocs(sortedWordDocs, typeDocs, limit);

    let results = extractUniqueWords(docs);

    // results = removeEmptyStrings(results);
    results = sortWords(results, word);

    return results;
}

export default getWordType;
