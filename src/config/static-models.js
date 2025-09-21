/**
 * Static Model Configuration
 *
 * This file serves as:
 * 1. Fallback configuration when database is unavailable
 * 2. Seed data source for initial database population
 * 3. Single source of truth for model definitions
 *
 * When adding new models, update this file first, then the database
 * will be automatically updated through seeding scripts.
 */

export const STATIC_MODELS = {
    // OpenAI Models
    dalle: {
        provider: 'openai',
        name: 'dalle',
        displayName: 'DALL-E 3',
        description: 'OpenAI DALL-E 3 image generation model',
        costPerImage: 1,
        isActive: true,
        apiUrl: 'https://api.openai.com/v1/images/generations',
        apiModel: 'dall-e-3',
        apiSize: '1024x1024'
    },
    dalle3: {
        provider: 'openai',
        name: 'dalle3',
        displayName: 'DALL-E 3',
        description: 'OpenAI DALL-E 3 image generation model',
        costPerImage: 1,
        isActive: true,
        apiUrl: 'https://api.openai.com/v1/images/generations',
        apiModel: 'dall-e-3',
        apiSize: '1024x1024'
    },
    dalle2: {
        provider: 'openai',
        name: 'dalle2',
        displayName: 'DALL-E 2',
        description: 'OpenAI DALL-E 2 image generation model',
        costPerImage: 1,
        isActive: true,
        apiUrl: 'https://api.openai.com/v1/images/generations',
        apiModel: 'dall-e-2',
        apiSize: '1024x1024'
    },

    // Dezgo Models - Flux (baseline = 1 credit)
    flux: {
        provider: 'dezgo',
        name: 'flux',
        displayName: 'Flux',
        description: 'Flux 1.0 Schnell model for fast image generation',
        costPerImage: 1,
        isActive: true,
        apiUrl: 'https://api.dezgo.com/text2image_flux',
        apiModel: 'flux_1_schnell',
        apiSize: '1024x1024'
    },

    // Google Models
    nanoBanana: {
        provider: 'google',
        name: 'nanoBanana',
        displayName: 'Google Imagen 3',
        description: 'Google Imagen 3 high-quality image generation model via Vertex AI',
        costPerImage: 0.75,
        isActive: true,
        apiUrl: 'https://us-central1-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/us-central1/publishers/google/models/imagen-3.0-generate-001:predict',
        apiModel: 'imagen-3.0-generate-001',
        apiSize: '1024x1024'
    },

    // Dezgo Models - SDXL (0.5 credits - cheapest)
    juggernaut: {
        provider: 'dezgo',
        name: 'juggernaut',
        displayName: 'Juggernaut XL',
        description: 'Juggernaut XL SDXL model for high-quality images',
        costPerImage: 0.5,
        isActive: true,
        apiUrl: 'https://api.dezgo.com/text2image_sdxl',
        apiModel: 'juggernautxl_1024px',
        apiSize: '1024x1024'
    },
    dreamshaper: {
        provider: 'dezgo',
        name: 'dreamshaper',
        displayName: 'Dreamshaper XL',
        description: 'Dreamshaper XL SDXL model for creative images',
        costPerImage: 0.5,
        isActive: true,
        apiUrl: 'https://api.dezgo.com/text2image_sdxl',
        apiModel: 'dreamshaperxl_1024px',
        apiSize: '1024x1024'
    },
    dreamshaperLighting: {
        provider: 'dezgo',
        name: 'dreamshaperLighting',
        displayName: 'Dreamshaper Lightning',
        description: 'Dreamshaper XL Lightning model for fast generation',
        costPerImage: 0.5,
        isActive: true,
        apiUrl: 'https://api.dezgo.com/text2image_sdxl_lightning',
        apiModel: 'dreamshaperxl_lightning_1024px',
        apiSize: '1024x1024'
    },
    bluepencil: {
        provider: 'dezgo',
        name: 'bluepencil',
        displayName: 'Blue Pencil XL',
        description: 'Blue Pencil XL SDXL model for artistic images',
        costPerImage: 0.5,
        isActive: true,
        apiUrl: 'https://api.dezgo.com/text2image_sdxl',
        apiModel: 'bluepencilxl_1024px',
        apiSize: '1024x1024'
    },
    tshirt: {
        provider: 'dezgo',
        name: 'tshirt',
        displayName: 'T-Shirt Design',
        description: 'T-Shirt Design SDXL model for clothing designs',
        costPerImage: 0.5,
        isActive: true,
        apiUrl: 'https://api.dezgo.com/text2image_sdxl',
        apiModel: 'tshirtdesignredmond_1024px',
        apiSize: '1024x1024'
    },
    juggernautReborn: {
        provider: 'dezgo',
        name: 'juggernautReborn',
        displayName: 'Juggernaut Reborn',
        description: 'Juggernaut Reborn SDXL model',
        costPerImage: 0.5,
        isActive: true,
        apiUrl: 'https://api.dezgo.com/text2image',
        apiModel: 'juggernaut_reborn',
        apiSize: '1024x1024'
    },

    // Dezgo Models - SD 1/2 (1 credit)
    absolute: {
        provider: 'dezgo',
        name: 'absolute',
        displayName: 'Absolute Reality',
        description: 'Absolute Reality 1.8.1 photorealistic model',
        costPerImage: 1,
        isActive: true,
        apiUrl: 'https://api.dezgo.com/text2image',
        apiModel: 'absolute_reality_1_8_1',
        apiSize: '1024x1024'
    },
    realisticvision: {
        provider: 'dezgo',
        name: 'realisticvision',
        displayName: 'Realistic Vision',
        description: 'Realistic Vision 5.1 photorealistic model',
        costPerImage: 1,
        isActive: true,
        apiUrl: 'https://api.dezgo.com/text2image',
        apiModel: 'realistic_vision_5_1',
        apiSize: '1024x1024'
    },
    icbinp: {
        provider: 'dezgo',
        name: 'icbinp',
        displayName: 'Icbinp',
        description: 'Icbinp photorealistic model',
        costPerImage: 1,
        isActive: true,
        apiUrl: 'https://api.dezgo.com/text2image',
        apiModel: 'icbinp',
        apiSize: '1024x1024'
    },
    icbinp_seco: {
        provider: 'dezgo',
        name: 'icbinp_seco',
        displayName: 'Icbinp Seco',
        description: 'Icbinp Seco photorealistic model',
        costPerImage: 1,
        isActive: true,
        apiUrl: 'https://api.dezgo.com/text2image',
        apiModel: 'icbinp_seco',
        apiSize: '1024x1024'
    },
    hasdx: {
        provider: 'dezgo',
        name: 'hasdx',
        displayName: 'Hasdx',
        description: 'Hasdx photorealistic model',
        costPerImage: 1,
        isActive: true,
        apiUrl: 'https://api.dezgo.com/text2image',
        apiModel: 'hasdx',
        apiSize: '1024x1024'
    },
    redshift: {
        provider: 'dezgo',
        name: 'redshift',
        displayName: 'Red Shift',
        description: 'Red Shift Diffusion 768px model',
        costPerImage: 1,
        isActive: true,
        apiUrl: 'https://api.dezgo.com/text2image',
        apiModel: 'redshift_diffusion_768px',
        apiSize: '768x768'
    },
    analogmadness: {
        provider: 'dezgo',
        name: 'analogmadness',
        displayName: 'Analog Madness',
        description: 'Analog Madness 7 artistic model',
        costPerImage: 1,
        isActive: true,
        apiUrl: 'https://api.dezgo.com/text2image',
        apiModel: 'analogmadness_7',
        apiSize: '1024x1024'
    },
    portraitplus: {
        provider: 'dezgo',
        name: 'portraitplus',
        displayName: 'Portrait Plus',
        description: 'Portrait Plus model for portrait generation',
        costPerImage: 1,
        isActive: true,
        apiUrl: 'https://api.dezgo.com/text2image',
        apiModel: 'portrait_plus',
        apiSize: '1024x1024'
    },
    nightmareshaper: {
        provider: 'dezgo',
        name: 'nightmareshaper',
        displayName: 'Nightmare Shaper',
        description: 'Nightmare Shaper dark artistic model',
        costPerImage: 1,
        isActive: true,
        apiUrl: 'https://api.dezgo.com/text2image',
        apiModel: 'nightmareshaper',
        apiSize: '1024x1024'
    },
    openjourney: {
        provider: 'dezgo',
        name: 'openjourney',
        displayName: 'Open Journey',
        description: 'Open Journey 2 artistic model',
        costPerImage: 1,
        isActive: true,
        apiUrl: 'https://api.dezgo.com/text2image',
        apiModel: 'openjourney_2',
        apiSize: '1024x1024'
    },
    abyssorange: {
        provider: 'dezgo',
        name: 'abyssorange',
        displayName: 'Abyss Orange',
        description: 'Abyss Orange Mix 2 artistic model',
        costPerImage: 1,
        isActive: true,
        apiUrl: 'https://api.dezgo.com/text2image',
        apiModel: 'abyss_orange_mix_2',
        apiSize: '1024x1024'
    },
    cyber: {
        provider: 'dezgo',
        name: 'cyber',
        displayName: 'Cyber Real',
        description: 'Cyber Realistic 3.1 futuristic model',
        costPerImage: 1,
        isActive: true,
        apiUrl: 'https://api.dezgo.com/text2image',
        apiModel: 'cyberrealistic_3_1',
        apiSize: '1024x1024'
    },
    disco: {
        provider: 'dezgo',
        name: 'disco',
        displayName: 'Disco',
        description: 'Disco Diffusion style artistic model',
        costPerImage: 1,
        isActive: true,
        apiUrl: 'https://api.dezgo.com/text2image',
        apiModel: 'disco_diffusion_style',
        apiSize: '1024x1024'
    },
    synthwave: {
        provider: 'dezgo',
        name: 'synthwave',
        displayName: 'Synthwave',
        description: 'Synthwave Punk V2 retro model',
        costPerImage: 1,
        isActive: true,
        apiUrl: 'https://api.dezgo.com/text2image',
        apiModel: 'synthwavepunk_v2',
        apiSize: '1024x1024'
    },
    lowpoly: {
        provider: 'dezgo',
        name: 'lowpoly',
        displayName: 'Low Poly',
        description: 'Low Poly World geometric model',
        costPerImage: 1,
        isActive: true,
        apiUrl: 'https://api.dezgo.com/text2image',
        apiModel: 'lowpoly_world',
        apiSize: '1024x1024'
    },
    ink: {
        provider: 'dezgo',
        name: 'ink',
        displayName: 'Ink Punk',
        description: 'Ink Punk Diffusion artistic model',
        costPerImage: 1,
        isActive: true,
        apiUrl: 'https://api.dezgo.com/text2image',
        apiModel: 'inkpunk_diffusion',
        apiSize: '1024x1024'
    },

    // Google Models - Imagen API
    nanoBanana: {
        provider: 'google',
        name: 'nanoBanana',
        displayName: 'Google Imagen 3',
        description: 'Google Imagen 3 high-quality image generation model via Vertex AI',
        costPerImage: 0.75,
        isActive: true,
        apiUrl: 'https://us-central1-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/us-central1/publishers/google/models/imagen-3.0-generate-001:predict',
        apiModel: 'imagen-3.0-generate-001',
        apiSize: '1024x1024'
    }
};

/**
 * Get all static models as an array
 * @returns {Array} Array of model configurations
 */
export const getAllStaticModels = () => Object.values(STATIC_MODELS);

/**
 * Get static model by name
 * @param {string} modelName - Model name
 * @returns {Object|null} Model configuration or null if not found
 */
export const getStaticModel = modelName => STATIC_MODELS[modelName] || null;

/**
 * Get static models by provider
 * @param {string} provider - Provider name
 * @returns {Array} Array of models for the provider
 */
export const getStaticModelsByProvider = provider => Object.values(STATIC_MODELS).filter(model => model.provider === provider);

/**
 * Get ImageGenerator-compatible config from static model
 * @param {string} modelName - Model name
 * @returns {Object|null} ImageGenerator-compatible config
 */
export const getStaticImageGeneratorConfig = modelName => {
    const model = getStaticModel(modelName);

    if (!model || !model.isActive) {
        return null;
    }

    return {
        type: model.provider,
        url: model.apiUrl,
        model: model.apiModel,
        size: model.apiSize
    };
};

/**
 * Get credit cost from static model
 * @param {string} modelName - Model name
 * @returns {number} Credit cost (default: 1)
 */
export const getStaticCreditCost = modelName => {
    const model = getStaticModel(modelName);

    return model ? model.costPerImage : 1;
};

/**
 * Get all valid model names from static config
 * @returns {Array} Array of valid model names
 */
export const getStaticValidModelNames = () => Object.keys(STATIC_MODELS);

/**
 * Get frontend provider list from static config
 * @returns {Array} Array of {value, label} objects
 */
export const getStaticFrontendProviderList = () => Object.values(STATIC_MODELS).map(model => ({
    value: model.name,
    label: model.displayName
}));

/**
 * Check if static model exists and is active
 * @param {string} modelName - Model name
 * @returns {boolean} True if model exists and is active
 */
export const isStaticModelValid = modelName => {
    const model = getStaticModel(modelName);

    return model && model.isActive;
};

/**
 * Get cost breakdown from static models
 * @returns {Object} Object with model costs
 */
export const getStaticCostBreakdown = () => {
    const breakdown = {};

    Object.values(STATIC_MODELS).forEach(model => {
        // Convert credit cost to USD approximation
        // Flux (1 credit) ≈ $0.0228, so 1 credit = $0.0228
        const usdCost = model.costPerImage * 0.0228;

        breakdown[model.name] = {
            credits: model.costPerImage,
            usd: usdCost,
            provider: model.provider
        };
    });

    return breakdown;
};
