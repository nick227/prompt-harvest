/**
 * AI Word Type Service
 *
 * Handles word type management and operations.
 * Separates data operations from business logic.
 */

import wordTypeManager from '../../../../lib/word-type-manager.js';

export class AIWordTypeService {
    constructor() {
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
     * Add word type
     */
    async addWordType(word) {
        const decodedWord = decodeURIComponent(word).toLowerCase();

        try {
            // Use wordTypeManager for adding word types
            const result = await wordTypeManager.addWordType(decodedWord);

            console.log('✅ Word type added:', {
                word: decodedWord,
                result
            });

            return result;
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

            console.log('✅ Word type deleted:', {
                word: decodedWord,
                result
            });

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
