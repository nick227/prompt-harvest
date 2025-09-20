/**
 * Image Generation API Contract
 * Source of truth for image generation data structure and validation
 */

export const ImageGenerationContract = {
    // Input validation schema
    input: {
        prompt: {
            type: 'string',
            required: true,
            minLength: 1,
            maxLength: 1000,
            transform: value => String(value || '').trim()
        },
        providers: {
            type: 'array',
            required: true,
            minItems: 1,
            // Note: allowedValues will be dynamically validated in middleware
            transform: value => (Array.isArray(value) ? value : (value || '').split(',').map(p => p.trim()).filter(Boolean))
        },
        guidance: {
            type: 'number',
            required: false,
            min: 1,
            max: 20,
            default: 10,
            transform: value => parseInt(value) || 10
        },
        multiplier: {
            type: 'string',
            required: false,
            default: '',
            transform: value => String(value || '').trim()
        },
        mixup: {
            type: 'boolean',
            required: false,
            default: false,
            transform: value => value === 'true' || value === true || value === 1
        },
        mashup: {
            type: 'boolean',
            required: false,
            default: false,
            transform: value => value === 'true' || value === true || value === 1
        },
        customVariables: {
            type: 'string',
            required: false,
            default: '',
            transform: value => String(value || '').trim()
        },
        promptId: {
            type: 'string',
            required: false,
            default: null,
            transform: value => value || null
        },
        original: {
            type: 'string',
            required: false,
            transform: value => String(value || '').trim()
        }
    },

    // Output schema for API responses
    output: {
        success: {
            id: 'string',
            userId: 'string',
            prompt: 'string',
            original: 'string',
            imageUrl: 'string',
            provider: 'string',
            guidance: 'number',
            multiplier: 'boolean',
            mixup: 'boolean',
            mashup: 'boolean',
            model: 'string|null',
            createdAt: 'string'
        },
        error: {
            success: 'boolean',
            error: {
                message: 'string',
                code: 'string',
                details: 'object|null'
            },
            timestamp: 'string'
        }
    }
};

// Validation functions
export class ImageGenerationValidator {
    static validate(data) {
        const errors = [];
        const warnings = [];
        const cleaned = {};

        for (const [field, rules] of Object.entries(ImageGenerationContract.input)) {
            const value = data[field];

            // Apply transformation
            if (rules.transform) {
                cleaned[field] = rules.transform(value);
            } else {
                cleaned[field] = value;
            }

            // Required check
            if (rules.required && (cleaned[field] === undefined || cleaned[field] === null || cleaned[field] === '')) {
                errors.push(`${field} is required`);
                continue;
            }

            // Apply default
            if (cleaned[field] === undefined && rules.default !== undefined) {
                cleaned[field] = rules.default;
            }

            // Type validation
            if (cleaned[field] !== undefined && cleaned[field] !== null) {
                if (rules.type === 'string' && typeof cleaned[field] !== 'string') {
                    errors.push(`${field} must be a string`);
                } else if (rules.type === 'number' && typeof cleaned[field] !== 'number') {
                    errors.push(`${field} must be a number`);
                } else if (rules.type === 'boolean' && typeof cleaned[field] !== 'boolean') {
                    errors.push(`${field} must be a boolean`);
                } else if (rules.type === 'array' && !Array.isArray(cleaned[field])) {
                    errors.push(`${field} must be an array`);
                }

                // Length/range validation
                if (rules.minLength && cleaned[field].length < rules.minLength) {
                    errors.push(`${field} must be at least ${rules.minLength} characters`);
                }
                if (rules.maxLength && cleaned[field].length > rules.maxLength) {
                    errors.push(`${field} exceeds maximum length of ${rules.maxLength} characters`);
                }
                if (rules.min && cleaned[field] < rules.min) {
                    errors.push(`${field} must be at least ${rules.min}`);
                }
                if (rules.max && cleaned[field] > rules.max) {
                    errors.push(`${field} must be at most ${rules.max}`);
                }
                if (rules.minItems && cleaned[field].length < rules.minItems) {
                    errors.push(`${field} must have at least ${rules.minItems} items`);
                }

                // Allowed values check (skip for providers as it's handled dynamically)
                if (rules.allowedValues && Array.isArray(cleaned[field]) && field !== 'providers') {
                    const invalidValues = cleaned[field].filter(item => !rules.allowedValues.includes(item));

                    if (invalidValues.length > 0) {
                        errors.push(`${field} contains invalid values: ${invalidValues.join(', ')}`);
                    }
                }
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            data: cleaned
        };
    }
}
