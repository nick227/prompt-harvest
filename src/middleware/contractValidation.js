/**
 * Contract-based validation middleware
 * Uses shared contracts to validate API requests consistently
 */

import { ImageGenerationValidator } from '../../shared/contracts/ImageGenerationContract.js';
import { ResponseFormatter, ERROR_CODES, HTTP_STATUS } from '../../shared/utils/ResponseFormatter.js';

/**
 * Image generation validation middleware using contracts
 */
export const validateImageGenerationContract = (req, res, next) => {
    console.log('🔍 CONTRACT VALIDATION: Starting image generation validation');
    console.log('🔍 CONTRACT VALIDATION: Raw request body:', req.body);

    try {
        const validation = ImageGenerationValidator.validate(req.body);

        console.log('🔍 CONTRACT VALIDATION: Validation result:', {
            isValid: validation.isValid,
            errorCount: validation.errors.length,
            warningCount: validation.warnings.length
        });

        if (!validation.isValid) {
            console.log('❌ CONTRACT VALIDATION: Validation failed:', validation.errors);

            return res.status(HTTP_STATUS.BAD_REQUEST).json(
                ResponseFormatter.validationError(validation.errors, validation.warnings)
            );
        }

        // Log warnings but don't block request
        if (validation.warnings.length > 0) {
            console.log('⚠️ CONTRACT VALIDATION: Warnings:', validation.warnings);
        }

        // Attach validated and cleaned data to request
        req.validatedData = validation.data;
        req.validationWarnings = validation.warnings;

        console.log('✅ CONTRACT VALIDATION: Success, cleaned data:', req.validatedData);

        return next();

    } catch (error) {
        console.error('💥 CONTRACT VALIDATION: Validation error:', error);

        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
            ResponseFormatter.error(
                'Validation system error',
                ERROR_CODES.GENERAL_ERROR,
                error.message
            )
        );
    }
};

/**
 * Generic contract validation middleware factory
 * Can be extended for other contracts in the future
 */
export const createContractValidator = (validatorClass, contractName = 'unknown') => (req, res, next) => {
    console.log(`🔍 CONTRACT VALIDATION: Starting ${contractName} validation`);

    try {
        const validation = validatorClass.validate(req.body);

        if (!validation.isValid) {
            console.log(`❌ CONTRACT VALIDATION: ${contractName} validation failed:`, validation.errors);

            return res.status(HTTP_STATUS.BAD_REQUEST).json(
                ResponseFormatter.validationError(validation.errors, validation.warnings)
            );
        }

        req.validatedData = validation.data;
        req.validationWarnings = validation.warnings;

        console.log(`✅ CONTRACT VALIDATION: ${contractName} validation success`);

        return next();

    } catch (error) {
        console.error(`💥 CONTRACT VALIDATION: ${contractName} validation error:`, error);

        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
            ResponseFormatter.error(
                'Validation system error',
                ERROR_CODES.GENERAL_ERROR,
                error.message
            )
        );
    }
};
