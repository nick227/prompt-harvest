import OpenAI from 'openai';
import dotenv from 'dotenv';
import axios from 'axios';
import wordTypeManager from '../lib/word-type-manager.js';
import databaseClient from './database/PrismaClient.js';
import { fileSystemManager } from './utils/FileSystemManager.js';

const DEFAULT_GUIDANCE_VALUE = 10;

dotenv.config();

const queue = [];
let isProcessing = false;

// Initialize Prisma client
const prisma = databaseClient.getClient();

// Utility function for shuffling arrays (Fisher-Yates algorithm)
const shuffleArray = arr => {
    const shuffled = [...arr];

    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));

        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
};

const processCustomVariables = (customVariables, customDict) => {
    if (!customVariables || customVariables === 'undefined' || typeof customVariables !== 'string') {
        return customDict;
    }

    try {
        const customVariablesPairs = customVariables.split(';');

        customVariablesPairs.forEach(pair => {
            if (!pair || typeof pair !== 'string') {
                return;
            }

            const [key, list] = pair.split('=');

            if (!key || !list) {
                console.log(`Invalid pair: ${pair}`);

                return;
            }

            const value = list.split(',');

            customDict[key] = value;
        });
    } catch (error) {
        console.error('Error processing custom variables:', error);
    }

    return customDict;
};

// eslint-disable-next-line max-params
const buildPrompt = async(prompt, multiplier, mixup, mashup, customVariables, req) => {
    try {
        // Add detailed logging for debugging
        console.log('🔍 buildPrompt called with:', {
            prompt: prompt ? `${typeof prompt} (${prompt.length} chars)` : 'undefined/null',
            promptPreview: prompt ? `${prompt.substring(0, 50)}...` : 'N/A',
            multiplier: multiplier ? 'present' : 'false',
            mixup: mixup ? 'present' : 'false',
            mashup: mashup ? 'present' : 'false',
            customVariables: customVariables ? 'present' : 'false',
            req: req ? 'present' : 'null'
        });

        if (typeof prompt !== 'string' || !prompt) {
            console.error('❌ buildPrompt: Invalid prompt received:', { prompt, type: typeof prompt });

            return { error: 'Error generating image' };
        }

        // Process custom variables and build base prompt
        const customDict = processCustomVariables(customVariables, {});
        let processedString = await processPromptText(prompt, customDict);

        // Apply prompt modifications in sequence
        if (mixup) {
            processedString = shufflePrompt(processedString);
        }
        if (multiplier) {
            processedString = await multiplyPrompt(processedString, multiplier, customDict);
        }
        if (mashup) {
            processedString = mashupPrompt(processedString);
        }

        // Save prompt and return result
        const data = {
            original: prompt,
            prompt: processedString,
            provider: 'prompt-builder' // Add provider field for database
        };
        const promptResponse = await saveFeedEvent('prompt', data, req);

        return {
            original: prompt,
            prompt: processedString,
            promptId: promptResponse._id
        };
    } catch (error) {
        console.error(`❌ Error building prompt: ${error.message}`);
        console.error('Error details:', {
            prompt,
            multiplier,
            mixup,
            mashup,
            customVariables: customVariables ? 'present' : 'missing',
            errorType: error.constructor.name,
            stack: error.stack
        });

        return { error: 'Error generating image' };
    }
};

const shufflePrompt = prompt => {
    if (!prompt || typeof prompt !== 'string') {
        console.warn('shufflePrompt: Invalid prompt type:', typeof prompt, prompt);

        return prompt || '';
    }

    return shuffleArray(prompt.split(', ')).join(', ');
};

const mashupPrompt = prompt => {
    if (!prompt || typeof prompt !== 'string') {
        console.warn('mashupPrompt: Invalid prompt type:', typeof prompt, prompt);

        return prompt || '';
    }

    return shuffleArray(prompt.replace(/,/g, '').split(' ')).join(' ');
};

const processPromptText = async(prompt, customDict) => await wordTypeManager.processPromptText(prompt, customDict);

const multiplyPrompt = async(prompt, multiplier, customDict) => {
    if (!multiplier || !prompt) {
        return prompt;
    }

    // Ensure prompt is a string
    if (typeof prompt !== 'string') {
        console.warn('multiplyPrompt: Invalid prompt type:', typeof prompt, prompt);

        return prompt || '';
    }

    const promptParts = prompt.split(', ');
    const processedPromptParts = [];

    for (const part of promptParts) {
        if (!part) {
            continue; // Skip empty parts
        }

        const multiplierElements = multiplier.match(/(\$\$\{[^}]+\})|(\$\{[^}]+\})|(\$\[\{[^}]+\}\])|(\$\$\[\{[^}]+\}\])/g);

        if (!multiplierElements) {
            processedPromptParts.push(`${part}, ${multiplier}`);
            continue;
        }

        try {
            const processedMultiplierElements = await Promise.all(multiplierElements.map(element => wordTypeManager.getWordReplacement(element, customDict)));

            let processedMultiplier = multiplier;

            for (let i = 0; i < multiplierElements.length; i++) {
                const regex = new RegExp(multiplierElements[i].replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');

                processedMultiplier = processedMultiplier.replace(regex, processedMultiplierElements[i]);
            }

            processedPromptParts.push(`${part}, ${processedMultiplier}`);
        } catch (error) {
            console.error('Error processing multiplier part:', error);
            processedPromptParts.push(`${part}, ${multiplier}`);
        }
    }

    return processedPromptParts.join(' ');
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

// eslint-disable-next-line max-params
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
    try {
        while (queue.length > 0) {
            const { prompt, original, promptId, providers, guidance, resolve, reject } = queue.shift();

            try {
                const response = await generate(prompt, original, promptId, providers, guidance, req);

                resolve(response);
            } catch (error) {
                reject(error);
            }
        }
    } finally {
        isProcessing = false;
    }
};

// eslint-disable-next-line max-params
const generate = async(prompt, original, promptId, providers, guidance, req) => {
    // Validate and set default providers
    if (!providers || providers.length === 0) {
        console.warn('⚠️  No providers provided, using default: flux');
        providers = ['flux'];
    }

    // Select random provider
    const providerName = providers[Math.floor(Math.random() * providers.length)];
    const userId = req.user ? req.user.id : 'undefined';

    // Generate image
    const b64Json = await generateProviderImage(providerName, prompt, guidance, userId);

    if (b64Json.error) {
        console.error('❌ Provider image generation failed:', b64Json.error);

        return b64Json;
    }

    // Save image file
    const imageName = await saveB64Image(b64Json, providerName, prompt);

    // Save to database
    const imageData = {
        prompt,
        providerName,
        imageName,
        guidance,
        promptId,
        original
    };

    const dbResult = await saveFeedEvent('image', imageData, req);

    // Return formatted response
    return {
        ...dbResult.data,
        imageId: dbResult._id,
        image: `uploads/${imageName}`
    };
};

const saveB64Image = async(b64Json, providerName, prompt) => {
    const buffer = Buffer.from(b64Json, 'base64');
    const safePrompt = makeFileNameSafeForWindows(prompt).substring(0, 50);
    const imageName = `${providerName}-${safePrompt}-${Date.now()}.jpg`;

    try {
        await fileSystemManager.saveImageAtomic(buffer, imageName, {
            processWithSharp: true,
            quality: 90
        });

        return imageName;
    } catch (error) {
        console.error('❌ Failed to save image:', error.message);
        throw new Error(`Image save failed: ${error.message}`);
    }
};

const saveFeedEvent = async(type, data, req) => {
    // Extract userId with validation
    const userId = getUserId(req);

    try {
        if (type === 'image') {
            return await saveImageToDatabase(data, userId);
        } else {
            return await savePromptToDatabase(data, userId);
        }
    } catch (error) {
        console.error(`❌ Error saving ${type} to database:`, error);
        throw new Error(`Database save failed: ${error.message}`);
    }
};

const getUserId = req => {
    if (!req?.user?.id) {
        return 'anonymous';
    }

    const { id } = req.user;

    return (id && id !== 'undefined' && id !== 'null' && id !== '') ? id : 'anonymous';
};

const saveImageToDatabase = async(data, userId) => {
    const imageData = {
        id: data.imageId || generateId(),
        userId,
        prompt: data.prompt || '',
        original: data.original || data.prompt || '',
        imageUrl: data.image || `uploads/${data.imageName}`,
        provider: data.providerName || 'unknown',
        guidance: data.guidance || 10,
        model: data.model || null,
        rating: data.rating || null
    };

    console.log('💾 Saving image to database:', {
        id: imageData.id,
        userId,
        prompt: `${imageData.prompt.substring(0, 30)}...`,
        provider: imageData.provider
    });

    const image = await prisma.image.create({ data: imageData });

    console.log('✅ Image saved to database with ID:', image.id);

    return {
        _id: image.id,
        data: {
            ...data,
            imageId: image.id,
            image: image.imageUrl
        }
    };
};

const savePromptToDatabase = async(data, userId) => {
    const promptData = {
        id: generateId(),
        userId,
        prompt: data.prompt || '',
        original: data.original || '',
        provider: data.provider || 'unknown' // Add missing provider field
    };

    const prompt = await prisma.prompts.create({ data: promptData });

    return {
        _id: prompt.id,
        data: {
            ...data,
            promptId: prompt.id
        }
    };
};

const generateId = () => Math.random().toString(36).substr(2, 9);

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
    // Build request parameters
    const params = {
        prompt,
        seed: generateRandomNineCharNumber(),
        model
    };

    // Add guidance for non-flux models
    if (model !== 'flux_1_schnell') {
        params.guidance = guidance || DEFAULT_GUIDANCE_VALUE;
    }

    const options = {
        method: 'POST',
        url,
        timeout: 180000,
        headers: {
            'content-type': 'application/x-www-form-urlencoded',
            'X-Dezgo-Key': process.env.DEZGO_API_KEY
        },
        data: new URLSearchParams(params).toString(),
        responseType: 'arraybuffer'
    };

    try {
        const response = await axios.request(options);

        if (response.status !== 200) {
            console.error(`❌ Dezgo API error: ${response.status} for model: ${model}`);

            return { error: 'Error generating image', details: response.status };
        }

        return Buffer.from(response.data, 'binary').toString('base64');
    } catch (error) {
        console.error(`❌ Dezgo request failed: ${error.message}`, { url, model });

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
