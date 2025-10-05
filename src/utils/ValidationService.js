/**
 * ValidationService Utility
 *
 * Provides centralized validation logic for controllers.
 * Handles common validation patterns and error formatting.
 *
 * Features:
 * - Parameter validation
 * - Data type validation
 * - Range validation
 * - Required field validation
 * - Custom validation rules
 */

import { ValidationError } from '../errors/CustomErrors.js';

// ============================================================================
// COMMON VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate that a value is not null or undefined
 * @param {*} value - Value to validate
 * @param {string} fieldName - Name of the field for error messages
 * @throws {ValidationError} If value is null or undefined
 */
export const validateRequired = (value, fieldName) => {
    if (value === null || value === undefined) {
        throw new ValidationError(`${fieldName} is required`);
    }
};

/**
 * Validate that a value is a string
 * @param {*} value - Value to validate
 * @param {string} fieldName - Name of the field for error messages
 * @throws {ValidationError} If value is not a string
 */
export const validateString = (value, fieldName) => {
    if (typeof value !== 'string') {
        throw new ValidationError(`${fieldName} must be a string`);
    }
};

/**
 * Validate that a value is a number
 * @param {*} value - Value to validate
 * @param {string} fieldName - Name of the field for error messages
 * @throws {ValidationError} If value is not a number
 */
export const validateNumber = (value, fieldName) => {
    if (typeof value !== 'number' || isNaN(value)) {
        throw new ValidationError(`${fieldName} must be a number`);
    }
};

/**
 * Validate that a value is an array
 * @param {*} value - Value to validate
 * @param {string} fieldName - Name of the field for error messages
 * @throws {ValidationError} If value is not an array
 */
export const validateArray = (value, fieldName) => {
    if (!Array.isArray(value)) {
        throw new ValidationError(`${fieldName} must be an array`);
    }
};

/**
 * Validate that a number is within a range
 * @param {number} value - Value to validate
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @param {string} fieldName - Name of the field for error messages
 * @throws {ValidationError} If value is outside range
 */
export const validateRange = (value, min, max, fieldName) => {
    validateNumber(value, fieldName);

    if (value < min || value > max) {
        throw new ValidationError(`${fieldName} must be between ${min} and ${max}`);
    }
};

/**
 * Validate that a string is not empty
 * @param {string} value - Value to validate
 * @param {string} fieldName - Name of the field for error messages
 * @throws {ValidationError} If string is empty
 */
export const validateNonEmptyString = (value, fieldName) => {
    validateString(value, fieldName);

    if (value.trim().length === 0) {
        throw new ValidationError(`${fieldName} cannot be empty`);
    }
};

/**
 * Validate that an array is not empty
 * @param {Array} value - Value to validate
 * @param {string} fieldName - Name of the field for error messages
 * @throws {ValidationError} If array is empty
 */
export const validateNonEmptyArray = (value, fieldName) => {
    validateArray(value, fieldName);

    if (value.length === 0) {
        throw new ValidationError(`${fieldName} cannot be empty`);
    }
};

// ============================================================================
// IMAGE-SPECIFIC VALIDATION
// ============================================================================

/**
 * Validate image generation parameters
 * @param {Object} params - Parameters to validate
 * @param {string} params.prompt - Image generation prompt
 * @param {Array} params.providers - Provider names
 * @param {number} params.guidance - Guidance value
 * @throws {ValidationError} If validation fails
 */
export const validateImageGenerationParams = params => {
    const { prompt, providers, guidance } = params;

    // Validate prompt
    validateNonEmptyString(prompt, 'Prompt');

    // Validate providers
    validateNonEmptyArray(providers, 'Providers');

    // Validate guidance
    if (guidance !== undefined && guidance !== null) {
        validateRange(guidance, 0, 20, 'Guidance');
    }
};

/**
 * Validate image ID parameter
 * @param {string} id - Image ID to validate
 * @throws {ValidationError} If ID is invalid
 */
export const validateImageId = id => {
    validateRequired(id, 'Image ID');
    validateNonEmptyString(id, 'Image ID');

    return id; // Return the validated ID
};

/**
 * Validate rating value
 * @param {*} rating - Rating value to validate
 * @throws {ValidationError} If rating is invalid
 */
export const validateRating = rating => {
    validateRequired(rating, 'Rating');

    const ratingNum = parseInt(rating);

    if (isNaN(ratingNum)) {
        throw new ValidationError('Rating must be a number');
    }

    validateRange(ratingNum, 1, 5, 'Rating');
};

// ============================================================================
// PAGINATION VALIDATION
// ============================================================================

/**
 * Validate pagination parameters
 * @param {Object} params - Pagination parameters
 * @param {number} params.limit - Items per page
 * @param {number} params.page - Page number
 * @param {number} maxLimit - Maximum allowed limit
 * @returns {Object} Validated pagination parameters
 */
export const validatePaginationParams = (params, maxLimit = 100) => {
    const { limit, page } = params;

    const validatedLimit = limit ? Math.min(parseInt(limit) || 10, maxLimit) : 10;
    const validatedPage = page ? Math.max(parseInt(page) || 0, 0) : 0;

    return {
        limit: validatedLimit,
        page: validatedPage
    };
};

// ============================================================================
// REQUEST VALIDATION
// ============================================================================

/**
 * Validate request body has required fields
 * @param {Object} body - Request body
 * @param {Array} requiredFields - Array of required field names
 * @throws {ValidationError} If required fields are missing
 */
export const validateRequiredFields = (body, requiredFields) => {
    const missingFields = requiredFields.filter(field => body[field] === undefined || body[field] === null
    );

    if (missingFields.length > 0) {
        throw new ValidationError(`Missing required fields: ${missingFields.join(', ')}`);
    }
};

/**
 * Validate request parameters
 * @param {Object} params - Request parameters
 * @param {Array} requiredParams - Array of required parameter names
 * @throws {ValidationError} If required parameters are missing
 */
export const validateRequiredParams = (params, requiredParams) => {
    const missingParams = requiredParams.filter(param => params[param] === undefined || params[param] === null
    );

    if (missingParams.length > 0) {
        throw new ValidationError(`Missing required parameters: ${missingParams.join(', ')}`);
    }
};

// ============================================================================
// CUSTOM VALIDATION RULES
// ============================================================================

/**
 * Validate that a value matches a regex pattern
 * @param {string} value - Value to validate
 * @param {RegExp} pattern - Regex pattern to match
 * @param {string} fieldName - Name of the field for error messages
 * @param {string} errorMessage - Custom error message
 * @throws {ValidationError} If value doesn't match pattern
 */
export const validatePattern = (value, pattern, fieldName, errorMessage) => {
    validateString(value, fieldName);

    if (!pattern.test(value)) {
        throw new ValidationError(errorMessage || `${fieldName} format is invalid`);
    }
};

/**
 * Validate that a value is one of the allowed values
 * @param {*} value - Value to validate
 * @param {Array} allowedValues - Array of allowed values
 * @param {string} fieldName - Name of the field for error messages
 * @throws {ValidationError} If value is not in allowed values
 */
export const validateEnum = (value, allowedValues, fieldName) => {
    if (!allowedValues.includes(value)) {
        throw new ValidationError(`${fieldName} must be one of: ${allowedValues.join(', ')}`);
    }
};

// ============================================================================
// BATCH VALIDATION
// ============================================================================

/**
 * Validate multiple fields at once
 * @param {Object} data - Data object to validate
 * @param {Object} rules - Validation rules object
 * @throws {ValidationError} If any validation fails
 */
// eslint-disable-next-line max-statements
export const validateBatch = (data, rules) => {
    const errors = [];

    for (const [field, rule] of Object.entries(rules)) {
        try {
            const value = data[field];

            if (rule.required) {
                validateRequired(value, field);
            }

            if (value !== undefined && value !== null) {
                if (rule.type === 'string') {
                    validateString(value, field);
                    if (rule.minLength && value.length < rule.minLength) {
                        throw new ValidationError(`${field} must be at least ${rule.minLength} characters`);
                    }
                    if (rule.maxLength && value.length > rule.maxLength) {
                        throw new ValidationError(`${field} must be no more than ${rule.maxLength} characters`);
                    }
                } else if (rule.type === 'number') {
                    validateNumber(value, field);
                    if (rule.min !== undefined && value < rule.min) {
                        throw new ValidationError(`${field} must be at least ${rule.min}`);
                    }
                    if (rule.max !== undefined && value > rule.max) {
                        throw new ValidationError(`${field} must be no more than ${rule.max}`);
                    }
                } else if (rule.type === 'array') {
                    validateArray(value, field);
                    if (rule.minLength && value.length < rule.minLength) {
                        throw new ValidationError(`${field} must have at least ${rule.minLength} items`);
                    }
                }

                if (rule.pattern) {
                    validatePattern(value, rule.pattern, field, rule.patternMessage);
                }

                if (rule.enum) {
                    validateEnum(value, rule.enum, field);
                }
            }
        } catch (error) {
            errors.push(error.message);
        }
    }

    if (errors.length > 0) {
        throw new ValidationError(`Validation failed: ${errors.join('; ')}`);
    }
};

// ============================================================================
// BLOG VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate blog post data
 * @param {Object} data - Blog post data to validate
 * @throws {ValidationError} If validation fails
 */
export const validateBlogPostData = (data) => {
    const errors = [];

    // Title validation
    if (!data.title || typeof data.title !== 'string') {
        errors.push('Title is required and must be a string');
    } else if (data.title.length > 255) {
        errors.push('Title must be 255 characters or less');
    }

    // Content validation
    if (!data.content || typeof data.content !== 'string') {
        errors.push('Content is required and must be a string');
    }

    // Excerpt validation (optional)
    if (data.excerpt && typeof data.excerpt === 'string' && data.excerpt.length > 500) {
        errors.push('Excerpt must be 500 characters or less');
    }

    // Thumbnail validation (optional)
    if (data.thumbnail && typeof data.thumbnail === 'string' && data.thumbnail.length > 500) {
        errors.push('Thumbnail URL must be 500 characters or less');
    }

    // Tags validation (optional)
    if (data.tags && !Array.isArray(data.tags)) {
        errors.push('Tags must be an array');
    }

    // Boolean validations
    if (data.isPublished !== undefined && typeof data.isPublished !== 'boolean') {
        errors.push('isPublished must be a boolean');
    }

    if (data.isFeatured !== undefined && typeof data.isFeatured !== 'boolean') {
        errors.push('isFeatured must be a boolean');
    }

    if (errors.length > 0) {
        throw new ValidationError(`Blog validation failed: ${errors.join('; ')}`);
    }
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
    // Common validation
    validateRequired,
    validateString,
    validateNumber,
    validateArray,
    validateRange,
    validateNonEmptyString,
    validateNonEmptyArray,

    // Image-specific validation
    validateImageGenerationParams,
    validateImageId,
    validateRating,

    // Blog-specific validation
    validateBlogPostData,

    // Pagination validation
    validatePaginationParams,

    // Request validation
    validateRequiredFields,
    validateRequiredParams,

    // Custom validation
    validatePattern,
    validateEnum,

    // Batch validation
    validateBatch
};
