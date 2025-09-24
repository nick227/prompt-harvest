/**
 * Prompt Templating Utilities
 *
 * Handles variable substitution and text normalization
 */

/**
 * Normalize text by removing extra spaces and fixing joins
 */
export function normalizeText(text) {
    if (typeof text !== 'string') {
        return '';
    }

    return text
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/\s*,\s*,/g, ',') // Remove double commas
        .replace(/,\s*,/g, ',') // Remove comma-space-comma
        .replace(/,\s*$/, '') // Remove trailing comma
        .replace(/^\s*,/, '') // Remove leading comma
        .trim();
}

/**
 * Handle variable substitution with proper delimiters
 */
export function substituteVariables(text, variables = {}) {
    if (typeof text !== 'string') {
        return '';
    }

    let result = text;

    // Handle ${variable} syntax
    result = result.replace(/\$\{([^}]+)\}/g, (match, varName) => {
        const value = variables[varName.trim()];
        if (value === undefined || value === null) {
            console.warn(`⚠️ PROMPT TEMPLATING: Variable '${varName}' not found`);
            return ''; // Remove missing variables
        }
        return String(value);
    });

    return normalizeText(result);
}

/**
 * Process prompt with variable substitution and normalization
 */
export function processPromptTemplate(template, variables = {}) {
    if (!template) {
        return '';
    }

    // First, substitute variables
    let processed = substituteVariables(template, variables);

    // Then normalize the text
    processed = normalizeText(processed);

    return processed;
}

/**
 * Validate prompt template
 */
export function validatePromptTemplate(template, requiredVariables = []) {
    const errors = [];

    if (!template || typeof template !== 'string') {
        errors.push('Template must be a non-empty string');
        return { isValid: false, errors };
    }

    // Check for required variables
    for (const varName of requiredVariables) {
        const pattern = new RegExp(`\\$\\{${varName}\\}`);
        if (!pattern.test(template)) {
            errors.push(`Required variable '${varName}' not found in template`);
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}
