import DB from './DB.js';
import OpenAI from 'openai';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import url from 'url';
import axios from 'axios';
const DEFAULT_GUIDANCE_VALUE = 10;
//import uploadBase64ImageToCdn from './lib/uploadBase64ImageToCdn.js';
dotenv.config();

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseDir = path.join(__dirname, '/public/uploads/');
let queue = [];
let isProcessing = false;

const feed = {
    prompt: {
        build: buildPrompt
    },
    image: {
        generate: generateImage
    }
};

export default feed;

Array.prototype.shuffle = function () {
    return this.sort(() => Math.random() - 0.5);
}

let replacementDict = {};

function processCustomVariables(customVariables, customDict) {
    if (!customVariables || customVariables === 'undefined') {
        return customDict;
    }

    const customVariablesPairs = customVariables.split(';');
    customVariablesPairs.forEach(pair => {
        const [key, list] = pair.split('=');
        if (!key || !list) {
            console.log(`Invalid pair: ${pair}`);
            return;
        }

        const value = list.split(',');
        customDict[key] = value;
    });

    return customDict;
}

async function batchSaveToNedb(strings, dbName, userId) {
    const db = new DB(dbName);
    const promises = strings.map(str => db.insert({ value: str.trim(), userId }));
    await Promise.all(promises);
}

async function buildPrompt(prompt, multiplier, mixup, mashup, customVariables, req) {
    try {
        if (typeof prompt !== 'string' || !prompt) {
            return { error: 'Error generating image' };
        }
        savePromptComponents(prompt, multiplier, req);
        let customDict = {};
        customDict = processCustomVariables(customVariables, customDict);
        replacementDict = {};
        let processedString = await processPromptText(prompt, customDict);

        if (mixup) {
            processedString = shufflePrompt(processedString);
        }

        if (multiplier) {
            processedString = await multiplyPrompt(processedString, multiplier, customDict);
        }

        if (mashup) {
            processedString = mashupPrompt(processedString);
        }

        const data = { original: prompt, prompt: processedString };

        const promptReponse = await saveFeedEvent('prompt', data, req);


        const result = { original: prompt, prompt: processedString, promptId: promptReponse._id };

        return result;
    } catch (error) {
        console.error(`Error building prompt: ${error.message}`);
    }
}

function shufflePrompt(prompt) {
    return prompt.split(', ').shuffle().join(', ');
}

function mashupPrompt(prompt) {
    return prompt.replace(/,/g, '').split(' ').shuffle().join(' ');

}

async function processPromptText(prompt, customDict) {
    const regex = /(\$\$\{[^}]+\})|(\$\{[^}]+\})|\b(\w+)\b|[^\s]+|\s/g;
    const textArray = prompt.match(regex);
    const processedArray = await Promise.all(textArray.map(word => getWordReplacement(word, customDict)));
    return processedArray.join('');
}

async function multiplyPrompt(prompt, multiplier, customDict) {
    if (!multiplier) {
        return prompt;
    }

    const promptParts = prompt.split(', ');
    const processedPromptParts = [];

    for (let part of promptParts) {
        const multiplierElements = multiplier.match(/(\$\$\{[^}]+\})|(\$\{[^}]+\})|(\$\[\{[^}]+\}\])|(\$\$\[\{[^}]+\}\])/g);

        if (!multiplierElements) {
            processedPromptParts.push(`${part}, ${multiplier}`);
            continue;
        }

        const processedMultiplierElements = await Promise.all(multiplierElements.map(element => getWordReplacement(element, customDict))); // Pass customDict as a second argument

        let processedMultiplier = multiplier;
        for (let i = 0; i < multiplierElements.length; i++) {
            const regex = new RegExp(multiplierElements[i].replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
            processedMultiplier = processedMultiplier.replace(regex, processedMultiplierElements[i]);
        }

        processedPromptParts.push(`${part}, ${processedMultiplier}`);
    }

    return processedPromptParts.join(' ');
}

async function getWordReplacement(element, customDict) {
    if (!element.startsWith('$')) return element;

    const isDoubleDollar = element.startsWith('$$');
    const word = getWordFromElement(element);
    let replacement;

    if (customDict[word]) {
        if (isDoubleDollar) {
            if (replacementDict[word]) {
                return replacementDict[word];
            } else {
                replacement = customDict[word][Math.floor(Math.random() * customDict[word].length)];
                replacementDict[word] = replacement;
            }
        } else {
            replacement = customDict[word][Math.floor(Math.random() * customDict[word].length)];
        }
    } else if (isDoubleDollar && replacementDict[word] && customDict[word]) {
        return replacementDict[word];
    } else if (isCustomArray(word)) {
        replacement = getRandomElementFromCustomArray(word);
    } else {
        const db = new DB('word-types.db');
        const results = await db.find({ word });
        replacement = results.length === 0 ? word : getReplacementWord(element, results);
    }

    if (isDoubleDollar && !replacementDict[word]) {
        replacementDict[word] = replacement;
    }

    return replacement;
}

function getWordFromElement(element) {
    return element.slice(element.startsWith('$$') ? 3 : 2, -1);
}

function isCustomArray(word) {
    return word.startsWith('[') && word.endsWith(']');
}

function getRandomElementFromCustomArray(word) {
    try {
        const words = JSON.parse(word.replace(/'/g, '"'));
        if (!Array.isArray(words)) {
            return word;
        }
        return words[Math.floor(Math.random() * words.length)];
    } catch (error) {
        return word;
    }
}

function getReplacementWord(element, results) {
    const word = getWordFromElement(element);
    if (element.startsWith('$$')) {
        return getReplacementWordForDoubleDollar(element, results, word);
    } else {
        return getRandomType(results, word);
    }
}

function getReplacementWordForDoubleDollar(element, results, originalWord) {
    const word = getWordFromElement(element);
    if (replacementDict[word]) {
        return replacementDict[word];
    } else {
        const replacement = getRandomType(results, originalWord);
        replacementDict[word] = replacement;
        return replacement;
    }
}

function getRandomType(results, originalWord) {
    if (!results.length || !results[0].types) {
        return originalWord;
    }
    return results[0].types[Math.floor(Math.random() * results[0].types.length)];
}

function savePromptComponents(prompt, multiplier, req) {
    saveClauses(prompt, req);
    if (multiplier) {
        saveMultipliers(multiplier, req);
    }
}

function saveMultipliers(multiplier, req) {
    const userId = req.user?._id;
    const multipliers = new DB('multipliers.db');
    return multipliers.insert({
        value: multiplier,
        userId
    });
}

function saveClauses(prompt, req) {
    const userId = req.user?._id;
    const clauses = prompt.split(',').map(str => str.trim());
    const dbName = 'prompt-clauses.db';
    batchSaveToNedb(clauses, dbName, userId);
}

/***********
 * START GENERATE
 * 
 */

const providerList = {
    dalle: generateDalleImage,
    dreamshaperLighting: generateDreamShaperLighting,
    juggernaut: generateJuggernautImage,
    absolute: generateAbsoluteImage,
    tshirt: generateTshirtImage,
    lowpoly: generateLowPolyImage,
    cyber: generateCyberImage,
    disco: generateDiscoImage,
    synthwave: generateSynthImage,
    ink: generateInkImage,
    dreamshaper: generateDreamshaper,
    bluepencil: generateBluePencil,
    abyssorange: generateAbyssOrange,
    icbinp: generateIcbinp,
    icbinp_seco: generateIcbinpSeco,
    analogmadness: generateAnalogMadeness,
    portraitplus: generatePortraitPlus,
    realisticvision: generateRealisticVision,
    nightmareshaper: generateNightmareShaper,
    openjourney: generateOpenjourney,
    hasdx: generateHasdxImage
}

async function generateImage(prompt, original, promptId, providers, guidance, req) {
    return new Promise((resolve, reject) => {
        const wasEmpty = queue.length === 0;
        queue.push({ prompt, original, promptId, providers, guidance, resolve, reject });
        if (wasEmpty) processQueue(req);
    });
}

async function processQueue(req) {
    if (isProcessing) return;
    isProcessing = true;

    while (queue.length > 0) {
        const { prompt, original, promptId, providers, guidance, resolve, reject } = queue.shift();
        try {
            const response = await generate(prompt, original, promptId, providers, guidance, req);
            resolve(response);
        } catch (error) {
            reject(error);
        }
    }
    isProcessing = false;
}

async function generate(prompt, original, promptId, providers, guidance, req) {
    const providerName = providers[Math.floor(Math.random() * providers.length)];
    console.log(providerName)
    const dynamicFunction = providerList[providerName];

    const b64_json = await dynamicFunction(prompt, guidance, req.user?._id || 'undefined');
    if (b64_json.error) {
        console.error(`Error in saveB64Image: ${b64_json.error}`);
        return b64_json;
    }
    const imageName = await saveB64Image(b64_json, providerName, prompt, req);
    const data = {
        prompt,
        providerName,
        imageName,
        guidance,
        promptId,
        original
    };
    const results = await saveFeedEvent('image', data, req);

    return results.data;

    //return { b64_json, prompt, providerName, guidance, imageName };
}

async function saveB64Image(b64_json, providerName, prompt, req) {

    const buffer = Buffer.from(b64_json, 'base64');
    const imageName = `${providerName}-${makeFileNameSafeForWindows(prompt)}-${Date.now()}.jpg`;
    const imagePath = path.join(baseDir, imageName);
    if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
    fs.writeFileSync(imagePath, buffer);
    //const imageUrl = await uploadBase64ImageToCdn(b64_json, imageName);
    //console.log('imageUrl', imageUrl)
    return imageName;
}

async function saveFeedEvent(type, data, req) {
    const db = type === 'image' ? new DB('images.db') : new DB('prompts.db');
    const payload = { data, userId: req.user?._id || 'undefined' };
    return await db.insert(payload);
}

async function generateDalleImage(prompt, guidance, userId = null) {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    try {
        const response = await openai.images.generate({
            prompt, n: 1, size: "1024x1024", response_format: "b64_json", model: "dall-e-3", user: userId
        });
        if (!response.data || !response.data[0] || !response.data[0].b64_json) {
            console.error('Invalid response', response);
            return { error: 'Invalid response', details: response };
        }
        return response.data[0].b64_json;
    } catch (error) {
        console.error('Error generating image:', error);
        if (error.status === 400 && error.code === 'content_policy_violation') {
            console.error('Your request was rejected due to a content policy violation. The prompt may contain text that is not allowed by the safety system.');
        }
        return { error: 'Error generating image', details: error };
    }
}

async function generatePortraitPlus(prompt, guidance, userId = null) {
    return generateDezgoImage(prompt, guidance, 'https://api.dezgo.com/text2image', 'portrait_plus');
}

async function generateAnalogMadeness(prompt, guidance, userId = null) {
    return generateDezgoImage(prompt, guidance, 'https://api.dezgo.com/text2image', 'analogmadness_7');
}

async function generateInkImage(prompt, guidance, userId = null) {
    return generateDezgoImage(prompt, guidance, 'https://api.dezgo.com/text2image', 'inkpunk_diffusion');
}

async function generateHasdxImage(prompt, guidance, userId = null) {
    return generateDezgoImage(prompt, guidance, 'https://api.dezgo.com/text2image', 'hasdx');
}

async function generateSynthImage(prompt, guidance, userId = null) {
    return generateDezgoImage(prompt, guidance, 'https://api.dezgo.com/text2image', 'synthwavepunk_v2');
}

async function generateDiscoImage(prompt, guidance, userId = null) {
    return generateDezgoImage(prompt, guidance, 'https://api.dezgo.com/text2image', 'disco_diffusion_style');
}

async function generateOpenjourney(prompt, guidance, userId = null) {
    return generateDezgoImage(prompt, guidance, 'https://api.dezgo.com/text2image', 'openjourney_2');
}

async function generateNightmareShaper(prompt, guidance, userId = null) {
    return generateDezgoImage(prompt, guidance, 'https://api.dezgo.com/text2image', 'nightmareshaper');
}

async function generateRealisticVision(prompt, guidance, userId = null) {
    const key = ['realistic_vision_5_1', 'realistic_vision_1_3'][Math.floor(Math.random() * 2)];
    return generateDezgoImage(prompt, guidance, 'https://api.dezgo.com/text2image', 'realistic_vision_5_1');
}

async function generateCyberImage(prompt, guidance, userId = null) {
    return generateDezgoImage(prompt, guidance, 'https://api.dezgo.com/text2image', 'cyberrealistic_3_1');
}

async function generateLowPolyImage(prompt, guidance, userId = null) {
    return generateDezgoImage(prompt, guidance, 'https://api.dezgo.com/text2image', 'lowpoly_world');
}

async function generateIcbinpSeco(prompt, guidance, userId = null) {
    return generateDezgoImage(prompt, guidance, 'https://api.dezgo.com/text2image', 'icbinp_seco');
}

async function generateIcbinp(prompt, guidance, userId = null) {
    return generateDezgoImage(prompt, guidance, 'https://api.dezgo.com/text2image', 'icbinp');
}

async function generateAbyssOrange(prompt, guidance, userId = null) {
    return generateDezgoImage(prompt, guidance, 'https://api.dezgo.com/text2image', 'abyss_orange_mix_2');
}

async function generateAbsoluteImage(prompt, guidance, userId = null) {
    return generateDezgoImage(prompt, guidance, 'https://api.dezgo.com/text2image', 'absolute_reality_1_8_1');
}

async function generateDreamShaperLighting(prompt, guidance, userId = null) {
    return generateDezgoImage(prompt, guidance, 'https://api.dezgo.com/text2image_sdxl_lightning', 'dreamshaperxl_lightning_102');
}

async function generateJuggernautImage(prompt, guidance, userId = null) {
    return generateDezgoImage(prompt, guidance, 'https://api.dezgo.com/text2image_sdxl', 'juggernautxl_1024px');
}

async function generateDreamshaper(prompt, guidance, userId = null) {
    return generateDezgoImage(prompt, guidance, 'https://api.dezgo.com/text2image_sdxl', 'dreamshaperxl_1024px');
}

async function generateBluePencil(prompt, guidance, userId = null) {
    return generateDezgoImage(prompt, guidance, 'https://api.dezgo.com/text2image_sdxl', 'bluepencilxl_1024px');
}

async function generateTshirtImage(prompt, guidance, userId = null) {
    return generateDezgoImage(prompt, guidance, 'https://api.dezgo.com/text2image_sdxl', 'tshirtdesignredmond_1024px');
}

async function generateDezgoImage(prompt, guidance, url, model) {
    const params = { prompt, negative_prompt: "", guidance: guidance || DEFAULT_GUIDANCE_VALUE, seed: generateRandomNineCharNumber(), model };
    const options = {
        method: 'POST',
        url,
        timeout: 180000,
        headers: { 'content-type': 'application/x-www-form-urlencoded', 'X-Dezgo-Key': process.env.DEZGO_API_KEY },
        data: new URLSearchParams(params).toString(),
        responseType: 'arraybuffer'
    };

    try {
        const response = await axios.request(options);
        if (response.status !== 200) {
            console.error(`Error !200 in generateDezgoImage: ${response.status}`);
            return { error: 'Error generating image', details: response.status };
        }
        return Buffer.from(response.data, 'binary').toString('base64');
    } catch (error) {
        console.error(`Axios Error in generateDezgoImage: ${error.message}`, url, model);
        return { error: 'Error generating image', details: error.message };
    }
}

function generateRandomNineCharNumber() {
    return Math.floor(Math.random() * 1e9).toString().padStart(9, '0');
}

function makeFileNameSafeForWindows(name) {
    const illegalChars = /[\u0000-\u001F<>:"\/\\|?*.,;(){}[\]!@#$%^&+=`~]/g;
    const maxLength = 200;
    let safeName = name.replace(illegalChars, '').replace(/\.{2,}/g, '.').trim().replace(/(^[. ]+|[. ]+$)/g, '');
    const reservedNames = ["CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9"];
    if (reservedNames.includes(safeName.toUpperCase())) safeName = 'file';
    return safeName.slice(0, maxLength);
}