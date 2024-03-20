import DB from './DB.js';
import OpenAI from 'openai';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import url from 'url';
import axios from 'axios';

dotenv.config();

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseDir = path.join(__dirname, '/public/images/');
let queue = [];
let isProcessing = false;

const providerList = {
    dalle: generateDalleImage,
    juggernaut: generateJuggernautImage,
    absolute: generateAbsoluteImage
}

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

async function buildPrompt(prompt, multiplier, mixup, req) {
    if(mixup){
        prompt = prompt.split(', ').shuffle().join(`, `);
        console.log('mixup...', prompt)
    }
    if(multiplier){
        prompt = prompt.split(', ').join(`, ${multiplier}, `);
    }
    const regex = /(\$\{[^}]+\})|\b(\w+)\b|[^\s]+|\s/g;
    const textArray = prompt.match(regex);
    const processedArray = await Promise.all(textArray.map(getWordReplacement));
    const processedString = processedArray.join('');
    saveFeedEvent('prompt', { original: prompt, processed: processedString }, req);
    return processedString;
}

async function generateImage(prompt, providers, req) {
    return new Promise((resolve, reject) => {
        const wasEmpty = queue.length === 0;
        queue.push({ prompt, providers, resolve, reject });
        if (wasEmpty) processQueue(req);
    });
}

async function processQueue(req) {
    if (isProcessing) return;
    isProcessing = true;
    while (queue.length > 0) {
        const { prompt, providers, resolve, reject } = queue.shift();
        try {
            const response = await generateImageInternal(prompt, providers, req);
            resolve(response);
        } catch (error) {
            reject(error);
        }
    }
    isProcessing = false;
}

async function generateImageInternal(prompt, providers, req) {
    const providerName = providers[Math.floor(Math.random() * providers.length)];
    const dynamicFunction = providerList[providerName];
    const b64_json = await dynamicFunction(prompt);
    const imageName = await saveB64Image(b64_json, providerName, prompt, req); 
    saveFeedEvent('image', {
        prompt,
        imageName,
        providerName
    }, req);
    return { imageName, prompt, providerName: providerName };
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
    const db = new DB('feeds.db');
    const payload = { type, data, userId: req.user?._id || 'undefined' };
    await db.insert(payload);
}

async function getWordReplacement(element) {
    if (!element.startsWith('${') || !element.endsWith('}')) return element;
    const word = element.slice(2, -1);
    if (word.startsWith('[') && word.endsWith(']')) {
        try {
            const words = JSON.parse(word.replace(/'/g, '"'));
            return words[Math.floor(Math.random() * words.length)];
        } catch (error) {
            return word;
        }
    }
    const db = new DB('word-types.db');
    const results = await db.find({ word });
    if (results.length === 0) return word;
    return results[0].types[Math.floor(Math.random() * results[0].types.length)];
}

async function generateDalleImage(prompt){
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.images.generate({
        prompt, n: 1, size: "1024x1024", response_format: "b64_json", model: "dall-e-3", style: 'vivid', user: 'user-1234'
    });
    if (!response.data || !response.data[0] || !response.data[0].b64_json) {
        console.error('Invalid response', response);
        return;
    }
    return response.data[0].b64_json;
}

async function generateAbsoluteImage(prompt){
    return generateDezgoImage(prompt, 'https://api.dezgo.com/text2image', 'absolute_reality_1_8_1');
}

async function generateJuggernautImage(prompt) {
    return generateDezgoImage(prompt, 'https://api.dezgo.com/text2image_sdxl', 'juggernautxl_1024px');
}

async function generateDezgoImage(prompt, url, model){
    const params = { prompt, negative_prompt: "", guidance: 8, seed: generateRandomNineCharNumber(), model };
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