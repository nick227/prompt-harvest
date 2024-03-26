import DB from './DB.js';
import OpenAI from 'openai';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import url from 'url';
import axios from 'axios';
const DEFAULT_GUIDANCE_VALUE = 10;
dotenv.config();

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseDir = path.join(__dirname, '/public/images/');
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

Array.prototype.shuffle = function() {
    return this.sort(() => Math.random() - 0.5);
}

let replacementDict = {};

async function buildPrompt(prompt, multiplier, mixup, req) {
    
    if (typeof prompt !== 'string') {
        throw new Error('Prompt must be a string');
    }
    if (!prompt) {
        return;
    }
    replacementDict = {};
    const regex = /(\$\$\{[^}]+\})|(\$\{[^}]+\})|\b(\w+)\b|[^\s]+|\s/g;
    const textArray = prompt.match(regex);
    const processedArray = await Promise.all(textArray.map(getWordReplacement));
    let processedString = processedArray.join('');
    if(mixup) {
        processedString = shufflePrompt(processedString);
    }
    if(multiplier) {
        processedString = await multiplyPrompt(processedString, multiplier);
    }


    const result = { original: prompt, processed: processedString };

    saveFeedEvent('prompt', result, req);

    return result;
}

function shufflePrompt(prompt) {
    return prompt.split(', ').shuffle().join(', ');
}

async function multiplyPrompt(prompt, multiplier) {
    if (multiplier.startsWith('${') && multiplier.endsWith('}')) {
        multiplier = await getWordReplacement(multiplier);
    }
    return prompt.split(', ').join(`, ${multiplier}, `);
}

async function getWordReplacement(element) {
    if (!element.startsWith('${') && !element.endsWith('}')) return element;
    const word = getWordFromElement(element);
    if (element.startsWith('$$')) {
        if (replacementDict[word]) {
            return replacementDict[word];
        } else {
            let replacement;
            if (isJsonArray(word)) {
                replacement = getRandomElementFromJsonArray(word);
            } else {
                const db = new DB('word-types.db');
                const results = await db.find({ word });
                if (results.length === 0) {
                    replacement = word;
                } else {
                    replacement = getReplacementWord(element, results);
                }
            }
            replacementDict[word] = replacement;
            return replacement;
        }
    }
    if (isJsonArray(word)) {
        return getRandomElementFromJsonArray(word);
    }
    const db = new DB('word-types.db');
    const results = await db.find({ word });
    if (results.length === 0) return word;
    return getReplacementWord(element, results);
}

function getWordFromElement(element) {
    return element.slice(element.startsWith('$$') ? 3 : 2, -1);
}

function isJsonArray(word) {
    return word.startsWith('[') && word.endsWith(']');
}

function getRandomElementFromJsonArray(word) {
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

/***********
 * START GENERATE
 * 
 */

const providerList = {
    dalle: generateDalleImage,
    juggernaut: generateJuggernautImage,
    absolute: generateAbsoluteImage,
    tshirt: generateTshirtImage,
    lowpoly: generateLowPolyImage,
    cyber: generateCyberImage,
    disco: generateDiscoImage,
    synthwave: generateSynthImage,
    ink: generateInkImage
}

async function generateImage(prompt, providers, guidance, req) {
    return new Promise((resolve, reject) => {
        const wasEmpty = queue.length === 0;
        queue.push({ prompt, providers, guidance, resolve, reject });
        if (wasEmpty) processQueue(req);
    });
}

async function processQueue(req) {
    if (isProcessing) return;
    isProcessing = true;
    while (queue.length > 0) {
        const { prompt, providers, guidance, resolve, reject } = queue.shift();
        try {
            const response = await generateImageInternal(prompt, providers, guidance, req);
            resolve(response);
        } catch (error) {
            reject(error);
        }
    }
    isProcessing = false;
}

async function generateImageInternal(prompt, providers, guidance, req) {
    const providerName = providers[Math.floor(Math.random() * providers.length)];
    const dynamicFunction = providerList[providerName];
    const b64_json = await dynamicFunction(prompt, guidance, req.user?._id || 'undefined');
    const imageName = await saveB64Image(b64_json, providerName, prompt, req); 
    const data = {
        prompt,
        providerName,
        imageName,
        guidance
    };
    saveFeedEvent('image', data, req);
    return { b64_json, prompt, providerName, guidance, imageName };
}

async function saveB64Image(b64_json, providerName, prompt, req) {
    const buffer = Buffer.from(b64_json, 'base64');
    const imageName = `${providerName}-${makeFileNameSafeForWindows(prompt)}-${Date.now()}.jpg`;
    const imagePath = path.join(baseDir, imageName);
    if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
    fs.writeFileSync(imagePath, buffer);
    return imageName;
}

async function saveFeedEvent(type, data, req){
    const db = type === 'image' ? new DB('images.db') : new DB('prompts.db');
    const payload = { data, userId: req.user?._id || 'undefined' };
    await db.insert(payload);
}

async function generateDalleImage(prompt, guidance, userId=null){
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

async function generateInkImage(prompt, guidance, userId=null){
    return generateDezgoImage(prompt, guidance, 'https://api.dezgo.com/text2image', 'inkpunk_diffusion');
}

async function generateSynthImage(prompt, guidance, userId=null){
    return generateDezgoImage(prompt, guidance, 'https://api.dezgo.com/text2image', 'synthwavepunk_v2');
}

async function generateDiscoImage(prompt, guidance, userId=null){
    return generateDezgoImage(prompt, guidance, 'https://api.dezgo.com/text2image', 'disco_diffusion_style');
}

async function generateCyberImage(prompt, guidance, userId=null){
    return generateDezgoImage(prompt, guidance, 'https://api.dezgo.com/text2image', 'cyberrealistic_3_1');
}

async function generateLowPolyImage(prompt, guidance, userId=null){
    return generateDezgoImage(prompt, guidance, 'https://api.dezgo.com/text2image', 'lowpoly_world');
}

async function generateAbsoluteImage(prompt, guidance, userId=null){
    return generateDezgoImage(prompt, guidance, 'https://api.dezgo.com/text2image', 'absolute_reality_1_8_1');
}

async function generateJuggernautImage(prompt, guidance, userId=null) {
    return generateDezgoImage(prompt, guidance, 'https://api.dezgo.com/text2image_sdxl', 'juggernautxl_1024px');
}

async function generateTshirtImage(prompt, guidance, userId=null){
    return generateDezgoImage(prompt, guidance, 'https://api.dezgo.com/text2image_sdxl', 'tshirtdesignredmond_1024px');

}

async function generateDezgoImage(prompt, guidance, url, model){
    const params = { prompt, negative_prompt: "", guidance: guidance || DEFAULT_GUIDANCE_VALUE, seed: generateRandomNineCharNumber(), model };
    const options = {
        method: 'POST', url, headers: { 'content-type': 'application/x-www-form-urlencoded', 'X-Dezgo-Key': process.env.DEZGO_API_KEY },
        data: new URLSearchParams(params).toString(), responseType: 'arraybuffer'
    };
    const response = await axios.request(options);
    if (response.status !== 200) throw new Error(`HTTP error! status: ${response.status}`);
    return Buffer.from(response.data, 'binary').toString('base64');
}

function generateRandomNineCharNumber () {
    return Math.floor(Math.random() * 1e9).toString().padStart(9, '0');
}

function makeFileNameSafeForWindows(name) {
    const illegalChars = /[\u0000-\u001F<>:"\/\\|?*.,;(){}[\]!@#$%^&+=`~]/g;
    const maxLength = 100;
    let safeName = name.replace(illegalChars, '').replace(/\.{2,}/g, '.').replace(/ /g, '-').trim().replace(/(^[. ]+|[. ]+$)/g, '');
    const reservedNames = ["CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9"];
    if (reservedNames.includes(safeName.toUpperCase())) safeName = 'file';
    return safeName.slice(0, maxLength);
}