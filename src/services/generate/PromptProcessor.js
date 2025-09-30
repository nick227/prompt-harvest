/**
 * PromptProcessor Service
 *
 * Handles all prompt manipulation operations including:
 * - Custom variable processing
 * - Multiplier application
 * - Mixup (shuffle parts)
 * - Mashup (shuffle words)
 * - Text processing with word type manager
 *
 * This service follows SRP (Single Responsibility Principle) and
 * provides atomic functions for each prompt operation.
 */

import wordTypeManager from '../../../lib/word-type-manager.js';
import { PROMPT_HELPERS } from '../../config/prompt-helpers.js';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Utility function for shuffling arrays using Fisher-Yates algorithm
 * @param {Array} arr - Array to shuffle
 * @returns {Array} Shuffled array
 */
const shuffleArray = arr => {
    const shuffled = [...arr];

    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));

        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
};

// ============================================================================
// CUSTOM VARIABLES PROCESSING
// ============================================================================

/**
 * Process custom variables from string format into dictionary
 * @param {string} customVariables - String in format "key1=val1,val2;key2=val3,val4"
 * @param {Object} customDict - Existing custom dictionary
 * @returns {Object} Processed custom dictionary
 */
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

// ============================================================================
// PROMPT VALIDATION
// ============================================================================

/**
 * Validate prompt input
 * @param {string} prompt - Prompt to validate
 * @returns {boolean} True if valid, false otherwise
 */
const validatePromptInput = prompt => {
    if (!prompt || typeof prompt !== 'string') {

        return false;
    }

    return true;
};

/**
 * Validate processed string output
 * @param {string} processedString - Processed string to validate
 * @param {string} originalPrompt - Original prompt for fallback
 * @returns {string} Valid processed string
 */
const validateProcessedString = (processedString, originalPrompt) => {
    if (!processedString || typeof processedString !== 'string') {

        return originalPrompt;
    }

    return processedString;
};

// ============================================================================
// MULTIPLIER PROCESSING
// ============================================================================

/**
 * Extract multiplier elements from string using regex patterns
 * @param {string} multiplier - Multiplier string to parse
 * @returns {Array} Array of extracted elements
 */
const extractMultiplierElements = multiplier => {
    // Updated pattern to properly handle multi-word variables with spaces
    // Changed [^}]+ to [^}]+ to allow spaces and other characters except closing brace
    const pattern = /(\$\$\{[^}]+\})|(\$\{[^}]+\})|(\$\[\{[^}]+\}\])|(\$\$\[\{[^}]+\}\])/g;

    return multiplier.match(pattern) || [];
};

/**
 * Process a single multiplier element
 * @param {string} element - Element to process
 * @param {Object} customDict - Custom dictionary for replacements
 * @returns {Promise<string>} Processed element
 */
const processMultiplierElement = async(element, customDict) => {
    try {
        return await wordTypeManager.getWordReplacement(element, customDict);
    } catch (error) {

        return element; // Fallback to original
    }
};

/**
 * Replace elements in multiplier string
 * @param {string} multiplier - Original multiplier string
 * @param {Array} elements - Elements to replace
 * @param {Array} replacements - Replacement values
 * @returns {string} Processed multiplier string
 */
const replaceMultiplierElements = (multiplier, elements, replacements) => {
    let processedMultiplier = multiplier;

    for (let i = 0; i < elements.length; i++) {
        const regex = new RegExp(elements[i].replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
        const replacement = replacements[i] || elements[i];

        processedMultiplier = processedMultiplier.replace(regex, replacement);
    }

    return processedMultiplier;
};

/**
 * Apply multiplier to prompt by appending to the end
 * @param {string} prompt - Original prompt
 * @param {string} processedMultiplier - Processed multiplier
 * @returns {string} Prompt with multiplier appended
 */
const applyMultiplierToPrompt = (prompt, processedMultiplier) => {
    if (!processedMultiplier) {
        return prompt;
    }

    // Append multiplier to the end of the prompt
    return `${prompt}, ${processedMultiplier}`;
};

/**
 * Apply multiplier with error handling
 * @param {string} processedString - Current processed string
 * @param {string} multiplier - Multiplier to apply
 * @param {Object} customDict - Custom dictionary
 * @returns {Promise<string>} String with multiplier applied
 */
const applyMultiplierSafely = async(processedString, multiplier, customDict) => {
    try {
        return await multiplyPrompt(processedString, multiplier, customDict);
    } catch (error) {
        console.error('❌ Error in multiplyPrompt:', error);

        return `${processedString}, ${multiplier}`;
    }
};

/**
 * Main multiplier processing function
 * @param {string} prompt - Original prompt
 * @param {string} multiplier - Multiplier to apply
 * @param {Object} customDict - Custom dictionary
 * @returns {Promise<string>} Prompt with multiplier applied
 */
const multiplyPrompt = async(prompt, multiplier, customDict) => {
    // Early returns for invalid inputs
    if (!multiplier || !prompt) {
        return prompt;
    }
    if (!validatePromptInput(prompt)) {
        return prompt || '';
    }

    // Extract multiplier elements
    const multiplierElements = extractMultiplierElements(multiplier);

    // If no special elements, simple append
    if (multiplierElements.length === 0) {
        return applyMultiplierToPrompt(prompt, multiplier);
    }

    try {
        // Process all elements in parallel
        const processedElements = await Promise.all(
            multiplierElements.map(element => processMultiplierElement(element, customDict))
        );

        // Replace elements in multiplier
        const processedMultiplier = replaceMultiplierElements(multiplier, multiplierElements, processedElements);

        // Apply to prompt
        return applyMultiplierToPrompt(prompt, processedMultiplier);
    } catch (error) {
        console.error('Error processing multiplier:', error);

        return applyMultiplierToPrompt(prompt, multiplier);
    }
};

// ============================================================================
// PROMPT MODIFICATION FUNCTIONS
// ============================================================================

/**
 * Shuffle prompt parts (comma-separated)
 * @param {string} prompt - Prompt to shuffle
 * @returns {string} Shuffled prompt
 */
const shufflePrompt = prompt => {
    if (!prompt || typeof prompt !== 'string') {
        return prompt || '';
    }

    // Try different splitting strategies
    const strategies = [
        { splitter: /, /, joiner: ', ' },
        { splitter: ',', joiner: ', ' },
        { splitter: /\s+(and|or|with|in|on|at|by|for|to|of|the|a|an)\s+/i, joiner: ' ' }
    ];

    for (const strategy of strategies) {
        const parts = prompt.split(strategy.splitter);

        if (parts.length > 1) {
            const shuffled = shuffleArray(parts);
            const result = shuffled.join(strategy.joiner);

            return result;
        }
    }

    // If no logical separation found, just return the original prompt
    return prompt;
};

/**
 * Mashup prompt (shuffle individual words)
 * @param {string} prompt - Prompt to mashup
 * @returns {string} Mashed up prompt
 */
const mashupPrompt = prompt => {
    if (!prompt || typeof prompt !== 'string') {

        return prompt || '';
    }

    // Remove comma-space consistently and shuffle individual words
    return shuffleArray(prompt.replace(/, /g, ' ').split(' ')).join(' ');
};

/**
 * Process prompt text with word type manager
 * @param {string} prompt - Prompt to process
 * @param {Object} customDict - Custom dictionary
 * @returns {Promise<string>} Processed prompt
 */
const processPromptText = async(prompt, customDict) => await wordTypeManager.processPromptText(prompt, customDict);

/**
 * Append stock text based on enabled prompt helpers
 * @param {string} prompt - Original prompt
 * @param {Object} enabledHelpers - Object with helper keys as properties and boolean values
 * @returns {string} Prompt with stock text appended
 */
const appendStockText = (prompt, enabledHelpers = {}) => {
    const randomArtisticTexts = ['beautiful', 'aesthetic', 'stunning', 'gorgeous', 'glamorous', 'fantastic', 'magnificent', 'incredible', 'spectacular', 'marvelous'];
    const randomArtisticText = randomArtisticTexts[Math.floor(Math.random() * randomArtisticTexts.length)];

    let stockText = '';

    // Process all enabled helpers from centralized config
    Object.entries(PROMPT_HELPERS).forEach(([key, helper]) => {
        if (enabledHelpers[key]) {
            stockText += `, ${helper.text}`;
        }
    });

    if (stockText) {
        stockText += `, ${randomArtisticText}`;
        // Remove leading comma and randomize word order
        stockText = stockText.substring(2).split(' ').sort(() => Math.random() - 0.5).join(' ');

        return `${prompt}, ${stockText}`;
    }

    return prompt;
};

// ============================================================================
// MAIN PROMPT PROCESSING ORCHESTRATION
// ============================================================================

/**
 * Apply all prompt modifications in sequence: Multiplier → Mixup → Mashup
 * @param {string} processedString - Current processed string
 * @param {Object} options - Modification options
 * @param {Object} customDict - Custom dictionary
 * @param {string} originalPrompt - Original prompt for fallback
 * @returns {Promise<string>} Fully processed prompt
 */
const applyPromptModifications = async(processedString, options, customDict, originalPrompt) => {
    const { multiplier, mixup, mashup } = options;
    let result = processedString;

    // Apply multiplier first
    if (multiplier) {
        result = await applyMultiplierSafely(result, multiplier, customDict);
    }

    // Apply mixup (shuffle parts)
    if (mixup) {
        result = shufflePrompt(result);
    }

    // Apply mashup (shuffle words)
    if (mashup) {
        result = mashupPrompt(result);
    }

    // Validate final result
    return validateProcessedString(result, originalPrompt);
};

/**
 * Main prompt building function
 * @param {string} prompt - Original prompt
 * @param {Object} options - Processing options
 * @param {string} options.multiplier - Multiplier to apply
 * @param {boolean} options.mixup - Whether to shuffle parts
 * @param {boolean} options.mashup - Whether to shuffle words
 * @param {string} options.customVariables - Custom variables string
 * @param {Object} options.promptHelpers - Object with helper keys as properties and boolean values
 * @returns {Promise<Object>} Processed prompt data
 */
const buildPrompt = async(prompt, options = {}) => {
    const { multiplier, mixup, mashup, customVariables, promptHelpers = {} } = options;

    try {

        if (typeof prompt !== 'string' || !prompt) {
            console.error('❌ buildPrompt: Invalid prompt received:', { prompt, type: typeof prompt });

            return { error: 'Error generating image' };
        }

        // Process custom variables and build base prompt
        const customDict = processCustomVariables(customVariables, {});
        let processedString = await processPromptText(prompt, customDict);

        // Apply stock text based on enabled prompt helpers
        processedString = appendStockText(processedString, promptHelpers);

        // Apply prompt modifications (multiplier, mixup, mashup)
        const options = { multiplier, mixup, mashup };

        processedString = await applyPromptModifications(processedString, options, customDict, prompt);


        return {
            original: prompt,
            prompt: processedString
        };
    } catch (error) {
        const errorMessage = error?.message || 'Unknown error occurred';

        console.error(`❌ Error building prompt: ${errorMessage}`);
        console.error('Error details:', {
            prompt,
            multiplier,
            mixup,
            mashup,
            customVariables: customVariables ? 'present' : 'missing',
            errorType: error?.constructor?.name || 'Unknown',
            stack: error?.stack || 'No stack trace available'
        });

        return { error: 'Error generating image' };
    }
};

// ============================================================================
// EXPORTS
// ============================================================================

export {
    // Main functions
    buildPrompt,
    processCustomVariables,
    processPromptText,
    appendStockText,

    // Modification functions
    multiplyPrompt,
    applyMultiplierSafely,
    shufflePrompt,
    mashupPrompt,
    applyPromptModifications,

    // Utility functions
    shuffleArray,
    validatePromptInput,
    validateProcessedString
};

export default {
    buildPrompt,
    processCustomVariables,
    processPromptText,
    appendStockText,
    multiplyPrompt,
    shufflePrompt,
    mashupPrompt,
    applyPromptModifications,
    shuffleArray,
    validatePromptInput,
    validateProcessedString
};
