/**
 * AI Word Type Service
 *
 * Handles word type management and operations.
 * Separates data operations from business logic.
 */

import wordTypeManager from '../../../../lib/word-type-manager.js';
import { AIService } from '../AIService.js';

export class AIWordTypeService {
    constructor() {
        this.aiService = new AIService();
        console.log('🔧 AIWordTypeService constructor initialized');
    }

    /**
     * Get word type replacement
     */
    async getWordType(word, limit = 8) {
        const decodedWord = decodeURIComponent(word).toLowerCase();

        try {
            const replacement = await wordTypeManager.getWordReplacement(`$${decodedWord}`);

            return [replacement]; // Return as array for compatibility
        } catch (error) {
            console.error('❌ Error getting word type:', error);

            return [decodedWord]; // Return original word on error
        }
    }

    /**
     * Get word examples
     */
    async getWordExamples(word, limit = 8) {
        const decodedWord = decodeURIComponent(word).toLowerCase();

        // Use wordTypeManager for examples - return empty array for now
        // This functionality can be enhanced later if needed
        console.log(`📝 getWordExamples called for: ${decodedWord} (limit: ${limit})`);

        return [];
    }

    /**
     * Get word types
     */
    async getWordTypes(word, limit = 8) {
        const decodedWord = decodeURIComponent(word).toLowerCase();

        try {
            const replacement = await wordTypeManager.getWordReplacement(`$${decodedWord}`);

            return [replacement];
        } catch (error) {
            console.error('❌ Error getting word types:', error);

            return [decodedWord];
        }
    }

    /**
     * Add word type using AI service
     */
    async addWordType(word) {
        const decodedWord = decodeURIComponent(word).toLowerCase();

        try {
            // First, check if word already exists in database
            const existingWord = await wordTypeManager.getWordTypes(decodedWord);

            if (existingWord && existingWord.length > 0) {
                console.log('ℹ️ Word already exists in database:', {
                    word: decodedWord,
                    existingTypes: existingWord
                });

                return {
                    success: false,
                    error: 'Word already exists',
                    message: `The word "${decodedWord}" already exists in the database with ${existingWord.length} types.`,
                    existingTypes: existingWord
                };
            }

            // Use AI service to generate word types
            console.log('🤖 Generating AI word types for:', decodedWord);
            const aiResult = await this.aiService._addAiWordType(decodedWord);

            if (aiResult.error) {
                console.error('❌ AI service error:', aiResult.error);
                throw new Error(`AI service failed: ${aiResult.error}`);
            }

            if (!aiResult.success) {
                throw new Error('AI service did not return success');
            }

            console.log('✅ Word type added with AI-generated types:', {
                word: decodedWord,
                types: aiResult.term.types,
                result: aiResult.term
            });

            return {
                success: true,
                message: `Successfully generated ${aiResult.term.types.length} word types for "${decodedWord}"`,
                term: aiResult.term
            };

        } catch (error) {
            console.error('❌ Error adding word type:', error);
            throw error;
        }
    }

    /**
     * Delete word type
     */
    async deleteWordType(word) {
        const decodedWord = decodeURIComponent(word).toLowerCase();

        try {
            // Use wordTypeManager for deleting word types
            const result = await wordTypeManager.deleteWordType(decodedWord);

            if (result.deleted) {
                console.log('✅ Word type deleted:', {
                    word: decodedWord,
                    result
                });
            } else {
                console.log('ℹ️ Word type not found (already deleted or never existed):', {
                    word: decodedWord,
                    result
                });
            }

            return result;
        } catch (error) {
            console.error('❌ Error deleting word type:', error);
            throw error;
        }
    }

    /**
     * Get word type statistics
     */
    async getWordTypeStats() {
        try {
            // This could be enhanced to get actual statistics from wordTypeManager
            return {
                totalWords: 0, // Placeholder - could be implemented
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ Error getting word type stats:', error);

            return null;
        }
    }
}
