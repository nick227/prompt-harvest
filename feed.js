import DB from './DB.js';
import OpenAI from 'openai';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import url from 'url';
import axios from 'axios';
import sharp from 'sharp';
import wordTypeManager from './lib/word-type-manager.js';

const DEFAULT_GUIDANCE_VALUE = 10;

dotenv.config();

const __filename = url.fileURLToPath(
    import.meta.url);
const __dirname = path.dirname(__filename);
const baseDir = path.join(__dirname, '/public/uploads/');
const queue = [];
let isProcessing = false;

Array.prototype.shuffle = function() {
    return this.sort(() => Math.random() - 0.5);
};

let replacementDict = {};

const processCustomVariables = (customVariables, customDict) => {
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
};

const buildPrompt = async(prompt, multiplier, mixup, mashup, customVariables, req) => {
    try {
        if (typeof prompt !== 'string' || !prompt) {
            return { error: 'Error generating image' };
        }
        // savePromptComponents(prompt, multiplier, req);
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
};

const shufflePrompt = prompt => prompt.split(', ').shuffle().join(', ');

const mashupPrompt = prompt => prompt.replace(/,/g, '').split(' ').shuffle().join(' ');

const processPromptText = async(prompt, customDict) => await wordTypeManager.processPromptText(prompt, customDict);

const multiplyPrompt = async(prompt, multiplier, customDict) => {
    if (!multiplier) {
        return prompt;
    }

    const promptParts = prompt.split(', ');
    const processedPromptParts = [];

    for (const part of promptParts) {
        const multiplierElements = multiplier.match(/(\$\$\{[^}]+\})|(\$\{[^}]+\})|(\$\[\{[^}]+\}\])|(\$\$\[\{[^}]+\}\])/g);

        if (!multiplierElements) {
            processedPromptParts.push(`${part}, ${multiplier}`);
            continue;
        }

        const processedMultiplierElements = await Promise.all(multiplierElements.map(element => wordTypeManager.getWordReplacement(element, customDict)));

        let processedMultiplier = multiplier;

        for (let i = 0; i < multiplierElements.length; i++) {
            const regex = new RegExp(multiplierElements[i].replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');

            processedMultiplier = processedMultiplier.replace(regex, processedMultiplierElements[i]);
        }

        processedPromptParts.push(`${part}, ${processedMultiplier}`);
    }

    return processedPromptParts.join(' ');
};

// Legacy function replaced by wordTypeManager.getWordReplacement()
const getWordReplacement = async(element, customDict) => await wordTypeManager.getWordReplacement(element, customDict);

const getWordFromElement = element => element.slice(element.startsWith('$$') ? 3 : 2, -1);

const isCustomArray = word => word.startsWith('[') && word.endsWith(']');


const getRandomElementFromCustomArray = word => {
    try {
        const words = JSON.parse(word.replace(/'/g, '"'));

        if (!Array.isArray(words)) {
            return word;
        }

        return words[Math.floor(Math.random() * words.length)];
    } catch (error) {
        return word;
    }
};

const getReplacementWord = (element, results) => {
    const word = getWordFromElement(element);

    if (element.startsWith('$$')) {
        return getReplacementWordForDoubleDollar(element, results, word);
    } else {
        return getRandomType(results, word);
    }
};

const getReplacementWordForDoubleDollar = (element, results, originalWord) => {
    const word = getWordFromElement(element);

    if (replacementDict[word]) {
        return replacementDict[word];
    } else {
        const replacement = getRandomType(results, originalWord);

        replacementDict[word] = replacement;

        return replacement;
    }
};

const getRandomType = (results, originalWord) => {
    if (!results.length || !results[0].types) {
        return originalWord;
    }

    return results[0].types[Math.floor(Math.random() * results[0].types.length)];
};

/** *********
 * START GENERATE
 *
 */

const modelConfig = {
    dalle: { type: 'openai', model: 'dall-e-3' },
    dreamshaperLighting: { type: 'dezgo', url: 'https://api.dezgo.com/text2image_sdxl_lightning', model: 'dreamshaperxl_lightning_1024px' },
    juggernaut: { type: 'dezgo', url: 'https://api.dezgo.com/text2image_sdxl', model: 'juggernautxl_1024px' },
    flux: { type: 'dezgo', url: 'https://api.dezgo.com/text2image_flux', model: 'flux_1_schnell' },
    absolute: { type: 'dezgo', url: 'https://api.dezgo.com/text2image', model: 'absolute_reality_1_8_1' },
    tshirt: { type: 'dezgo', url: 'https://api.dezgo.com/text2image_sdxl', model: 'tshirtdesignredmond_1024px' },
    lowpoly: { type: 'dezgo', url: 'https://api.dezgo.com/text2image', model: 'lowpoly_world' },
    cyber: { type: 'dezgo', url: 'https://api.dezgo.com/text2image', model: 'cyberrealistic_3_1' },
    disco: { type: 'dezgo', url: 'https://api.dezgo.com/text2image', model: 'disco_diffusion_style' },
    synthwave: { type: 'dezgo', url: 'https://api.dezgo.com/text2image', model: 'synthwavepunk_v2' },
    ink: { type: 'dezgo', url: 'https://api.dezgo.com/text2image', model: 'inkpunk_diffusion' },
    dreamshaper: { type: 'dezgo', url: 'https://api.dezgo.com/text2image_sdxl', model: 'dreamshaperxl_1024px' },
    bluepencil: { type: 'dezgo', url: 'https://api.dezgo.com/text2image_sdxl', model: 'bluepencilxl_1024px' },
    abyssorange: { type: 'dezgo', url: 'https://api.dezgo.com/text2image', model: 'abyss_orange_mix_2' },
    icbinp: { type: 'dezgo', url: 'https://api.dezgo.com/text2image', model: 'icbinp' },
    icbinp_seco: { type: 'dezgo', url: 'https://api.dezgo.com/text2image', model: 'icbinp_seco' },
    analogmadness: { type: 'dezgo', url: 'https://api.dezgo.com/text2image', model: 'analogmadness_7' },
    portraitplus: { type: 'dezgo', url: 'https://api.dezgo.com/text2image', model: 'portrait_plus' },
    realisticvision: { type: 'dezgo', url: 'https://api.dezgo.com/text2image', model: 'realistic_vision_5_1' },
    nightmareshaper: { type: 'dezgo', url: 'https://api.dezgo.com/text2image', model: 'nightmareshaper' },
    openjourney: { type: 'dezgo', url: 'https://api.dezgo.com/text2image', model: 'openjourney_2' },
    juggernautReborn: { type: 'dezgo', url: 'https://api.dezgo.com/text2image', model: 'juggernaut_reborn' },
    redshift: { type: 'dezgo', url: 'https://api.dezgo.com/text2image', model: 'redshift_diffusion_768px' },
    hasdx: { type: 'dezgo', url: 'https://api.dezgo.com/text2image', model: 'hasdx' }
};

const generateProviderImage = async(providerName, prompt, guidance, userId = null) => {
    const config = modelConfig[providerName];

    if (!config) {
        return { error: `Provider not available: ${providerName}` };
    }

    if (config.type === 'openai') {
        return generateDalleImage(prompt, guidance, userId);
    } else if (config.type === 'dezgo') {
        return generateDezgoImage(prompt, guidance, config.url, config.model);
    }

    return { error: `Unknown provider type: ${config.type}` };
};

const generateImage = async(prompt, original, promptId, providers, guidance, req) => new Promise((resolve, reject) => {
    const wasEmpty = queue.length === 0;

    queue.push({ prompt, original, promptId, providers, guidance, resolve, reject });
    if (wasEmpty) {
        processQueue(req);
    }
});

const processQueue = async req => {
    if (isProcessing) {
        return;
    }
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
};

const generate = async(prompt, original, promptId, providers, guidance, req) => {

    if (!providers || providers.length === 0) {
        console.error('❌ No providers provided, using default: flux');
        providers = ['flux'];
    }

    const providerName = providers[Math.floor(Math.random() * providers.length)];
    const b64Json = await generateProviderImage(providerName, prompt, guidance, req.user ? req.user._id : 'undefined');

    if (b64Json.error) {

        return b64Json;
    }

    const imageName = await saveB64Image(b64Json, providerName, prompt, req);

    const data = {
        prompt,
        providerName,
        imageName,
        guidance,
        promptId,
        original
    };

    const results = await saveFeedEvent('image', data, req);

    results.data.imageId = results._id;
    results.data.image = `uploads/${imageName}`;

    return results.data;
};

const saveB64Image = async(b64Json, providerName, prompt, req) => {
    const buffer = Buffer.from(b64Json, 'base64');
    const safePrompt = makeFileNameSafeForWindows(prompt).substring(0, 50); // Truncate to avoid overly long filenames
    const imageName = `${providerName}-${safePrompt}-${Date.now()}.jpg`;
    const imagePath = path.join(baseDir, imageName);

    if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
    }

    // Save the initial image buffer to a temporary path
    const tempImagePath = path.join(baseDir, `temp-${imageName}`);

    fs.writeFileSync(tempImagePath, buffer);

    // Verify the file was written
    if (!fs.existsSync(tempImagePath)) {
        throw new Error(`Temporary image file was not created: ${tempImagePath}`);
    }

    // Add a delay to ensure the file system has time to write the file
    await new Promise(resolve => setTimeout(resolve, 100));

    // Use sharp to re-save the image
    await sharp(tempImagePath)
        .toFormat('jpg')
        .toFile(imagePath);

    // Clean up the temporary image
    fs.unlinkSync(tempImagePath);

    return imageName;
};

const saveFeedEvent = async(type, data, req) => {
    const db = type === 'image' ? new DB('images.db') : new DB('prompts.db');
    const payload = { data, userId: req.user ? req.user._id : 'undefined' };

    return await db.insert(payload);
};

const generateDalleImage = async(prompt, guidance, userId = null) => {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    try {
        const response = await openai.images.generate({
            prompt,
            n: 1,
            size: '1024x1024',
            response_format: 'b64_json',
            model: 'dall-e-3',
            user: userId
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
};

const generateDezgoImage = async(prompt, guidance, url, model = 'flux_1_schnell') => {
    const params = { prompt, /* negative_prompt: "", guidance: guidance || DEFAULT_GUIDANCE_VALUE,*/ seed: generateRandomNineCharNumber(), model };

    if (model !== 'flux_1_schnell') {
        params.guidance = guidance || DEFAULT_GUIDANCE_VALUE;
    }
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
};

const generateRandomNineCharNumber = () => Math.floor(Math.random() * 1e9).toString().padStart(9, '0');

const makeFileNameSafeForWindows = name => {
    // eslint-disable-next-line no-control-regex
    const illegalChars = /[\u0000-\u001F<>:"\\|?*.,;(){}[\]!@#$%^&+=`~]/g;
    const maxLength = 200;
    let safeName = name.replace(illegalChars, '').replace(/\.{2,}/g, '.').trim().replace(/(^[. ]+|[. ]+$)/g, '');
    const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];

    if (reservedNames.includes(safeName.toUpperCase())) {
        safeName = 'file';
    }

    return safeName.slice(0, maxLength);
};

const feed = {
    prompt: {
        build: buildPrompt
    },
    image: {
        generate: generateImage
    }
};

export default feed;
