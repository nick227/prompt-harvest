import DB from './DB.js';
import dotenv from 'dotenv';
import readline from 'readline';
import * as utils from './utils.js';

dotenv.config();

const wordLimit = 4;
const modifiers = [
    'description',
    'photogenic',
    'poetic',
    'detailed description',
    'photogenic description',
    'beautiful description',
    'poetic descriptions',
    'synonyms for',
    'opposite of',
    'famous examples of',
    'the works of',
    'examples of',
    'styles of',
    'variations of',
    'illustration of',
    'types of',
    'artistic',
    'photogenic',
    'intriguing',
    'geometric',
    'dramatic',
    'unique',
    'beautiful'
];

const limit = 6;

async function main() {
    const res = await getWordTypes();

    for (let i = 0; i < limit; i++) {
        await handleTypes(res[i], limit);
        await new Promise(resolve => setTimeout(resolve, 2030));
    }
}

main();

async function getWordTypesFromDB() {
    const wordTypesDb = new DB('word-types.db');
    return await wordTypesDb.find({});
}

function shuffleWordTypes(wordTypes) {
    return utils.shuffle(wordTypes);
}

function filterWordTypes(wordTypes) {
    return wordTypes.filter(row => typeof row.word === 'string' && row.word.split(' ').length < wordLimit);
}

function mapWordTypes(wordTypes) {
    return wordTypes.map(row => utils.shuffle(row.types).slice(0, 1));
}

async function getWordTypes() {
    let wordTypes = await getWordTypesFromDB();
    wordTypes = shuffleWordTypes(wordTypes);
    wordTypes = filterWordTypes(wordTypes);
    wordTypes = mapWordTypes(wordTypes);
    return shuffleWordTypes(wordTypes);
}

async function handleTypes(wordTypes, limit) {
    for (let i = 0; i < limit && i < wordTypes.length; i++) {
        await handleType(wordTypes[i]);
    }
}

async function handleType(term) {
    if (term.split(' ').length >= wordLimit) {
        return;
    }

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false
    });

    console.log("------------------------------------")
    console.log(term);

    const termString = modifiers.map((mod, i) => { return `${i + 1}: ${mod}` }).join(', \n');

    const answer = await askQuestion(rl, getQuestion(termString));


    if (answer === '') {
        skipProcessing(rl);
        return;
    }

    if (answer === 'y') {
        await processOpenAIRequest(term);
        rl.close();
        return;
    }

    if (answer === 'r') {
        term = getRandomTerm(term);
        await processOpenAIRequest(term);
        rl.close();
        return;
    }

    if (answer === 'add' || answer === 'pre') {
        term = await getConcatTerm(answer, term, rl);
        await processOpenAIRequest(term);
        rl.close();
        return;
    }

    if (!isNaN(answer) && answer >= 1 && answer <= modifiers.length) {
        term = `${modifiers[answer - 1].toLowerCase()} ${term.toLowerCase()}`;
        await processOpenAIRequest(term);
        rl.close();
        return;
    }

    skipProcessing(rl);
}

function getTermString(modifiers) {
    return modifiers.map((mod, i) => { return `${i + 1}: ${mod}` }).join(', \n');
}

function getQuestion(termString) {
    return `
y to process,
enter to skip,
add to append,
pre to prepend,
r for random. \n
${termString}\n`;
}

function shuffle(array) {
    let i = array.length;
    while (i) {
        let j = Math.floor(Math.random() * i--);
        let temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
}

function getRandomTerm(term) {
    let mod = modifiers[Math.floor(Math.random() * modifiers.length)];
    let res = `${mod.toLowerCase()} ${term.toLowerCase()}`;
    res = shuffle(res.split(' ')).join(' ');
    return res;
}

async function getConcatTerm(answer, term, rl) {

    if (answer === 'add') {
        term = term + ' ' + await askQuestion(rl, 'Type string to append: ');
    }

    if (answer === 'pre') {
        term = await askQuestion(rl, 'Type string to prepend: ') + ' ' + term;
    }

    return term;
}

function skipProcessing(rl) {
    rl.close();
    console.log('Skipping...');
    console.log("\n");
}

async function processOpenAIRequest(term) {
    console.log('requesting openai...', term);
    const res = await utils.addAiWordType(term);
    console.log('done', res);

    console.log("\n");
    console.log("loading...");
    console.log("\n");

    await new Promise(resolve => setTimeout(resolve, 500));
}

async function askQuestion(rl, question) {
    return new Promise(resolve => {
        rl.question(question, resolve);
    });
}
