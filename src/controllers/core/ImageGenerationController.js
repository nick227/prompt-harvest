/**
 * ImageGenerationController - Handles image generation endpoints
 *
 * Focused controller for image generation functionality.
 * Extracted from EnhancedImageController.
 */

import { generateRequestId, logRequestStart, logRequestSuccess, logRequestError } from '../../utils/RequestLogger.js';
import { validateImageGenerationParams } from '../../utils/ValidationService.js';
import { ValidationError } from '../../errors/CustomErrors.js';
import { formatErrorResponse, formatSuccessResponse } from '../../utils/ResponseFormatter.js';

export class ImageGenerationController {
    constructor(imageService) {
        this.imageService = imageService;
    }

    async generateImage(req, res) {
        const requestId = req.id || generateRequestId();

        logRequestStart(requestId, 'generateImage', req.body);

        try {
            // Validate request parameters
            const validationResult = validateImageGenerationParams(req.body);

            if (!validationResult.isValid) {
                return res.status(400).json(formatErrorResponse(
                    'Validation failed',
                    validationResult.errors,
                    requestId
                ));
            }

            const { prompt, providers, guidance, userId } = req.body;
            const options = req.body.options || {};

            // Generate image using service
            const result = await this.imageService.generateImage(
                prompt, providers, guidance, userId, options
            );

            logRequestSuccess(requestId, 'generateImage', result);
            res.json(formatSuccessResponse(result, requestId));

        } catch (error) {
            logRequestError(requestId, 'generateImage', error);

            if (error instanceof ValidationError) {
                return res.status(400).json(formatErrorResponse(
                    error.message,
                    { validation: error.details },
                    requestId
                ));
            }

            res.status(500).json(formatErrorResponse(
                'Image generation failed',
                { error: error.message },
                requestId
            ));
        }
    }

    async getHealth(req, res) {
        try {
            const health = await this.imageService.getHealth();

            res.json(formatSuccessResponse(health));
        } catch (error) {
            res.status(500).json(formatErrorResponse(
                'Health check failed',
                { error: error.message }
            ));
        }
    }
}
