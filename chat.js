import DB from './DB.js';
import OpenAI from 'openai';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import url from 'url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseDir = __dirname + '/images';

dotenv.config();

async function buildPrompt(prompt) {
    const textArray = prompt.trim().split(/\s+/);
    const processedArray = await Promise.all(textArray.map(async word => {
        if (word.startsWith('$')) {
            word = word.slice(2, -1);
            return await getWordReplacement(word);
        } else {
            return word;
        }
    }));
    return processedArray;
}

async function getWordReplacement(wordType) {
    if (wordType.startsWith('[') && wordType.endsWith(']')) {
        try {
            const words = JSON.parse(wordType.replace(/'/g, '"'));
            const randomIndex = Math.floor(Math.random() * words.length);
            return words[randomIndex];
        } catch (error) {
            return wordType;
        }
    }

    const db = new DB('word-types.db');
    const results = await db.find({ word: wordType });
    if (results.length === 0) {
        return wordType;
    }

    const types = results[0].types;
    const randomIndex = Math.floor(Math.random() * types.length);

    return types[randomIndex];
}

let queue = [];
let isProcessing = false;

async function processQueue() {
    if (isProcessing) return;
    isProcessing = true;
    while (queue.length > 0) {
        const { prompt, resolve, reject } = queue.shift();
        try {
            const b64_json = await generateImageInternal(prompt);
            resolve(b64_json);
        } catch (error) {
            reject(error);
        }
    }
    isProcessing = false;
}

async function generateImageInternal(prompt) {
    console.log('Generating image for prompt:', prompt);
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
    });
    const response = await openai.images.generate({
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        response_format: "b64_json",
        model: "dall-e-3",
        style: 'vivid',
        user: 'user-1234'
    });
    if (!response.data || !response.data[0] || !response.data[0].b64_json) {
        console.error('Invalid response', response);
        return;
    }
    const b64_json = response.data[0].b64_json;
    saveB64Image(b64_json, prompt); 
    return b64_json;
}

function generateImage(prompt) {
    return new Promise((resolve, reject) => {
        const wasEmpty = queue.length === 0;
        queue.push({ prompt, resolve, reject });
        if (wasEmpty) {
            processQueue();
        }
    });
}

async function saveB64Image(b64_json, prompt) {
    const buffer = Buffer.from(b64_json, 'base64');
    const imageName = baseDir + '/image-' + makeFileNameSafeForWindows(prompt) + '-' + Date.now() + '.jpg';
    console.log('Saving image: ' + imageName);
    if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
    }

    fs.writeFileSync(imageName, buffer);
}

function makeFileNameSafeForWindows(name) {
    const illegalChars = /[\u0000-\u001F<>:"\/\\|?*.,;(){}[\]!@#$%^&+=`~]/g;
    const maxLength = 100;
    let safeName = name.replace(illegalChars, '')
        .replace(/\.{2,}/g, '.')
        .replace(/ /g, '-')  // Replace spaces with dashes
        .trim()
        .replace(/(^[. ]+|[. ]+$)/g, '');

    const reservedNames = ["CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9"];

    if (reservedNames.includes(safeName.toUpperCase())) {
        safeName = 'file';
    }
    return safeName.slice(0, maxLength);
}

export { buildPrompt, generateImage };