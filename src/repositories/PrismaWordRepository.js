import { PrismaBaseRepository } from './PrismaBaseRepository.js';

export class PrismaWordRepository extends PrismaBaseRepository {
    constructor() {
        super('word_types');
    }

    /**
     * Find word types by word
     * @param {string} word - The word to search for
     * @param {number} limit - Maximum number of results
     * @returns {Array} Array of related types
     */
    async findByWord(word, limit = 8) {
        try {
            // eslint-disable-next-line no-console
            console.log('🔍 PRISMA-WORD-REPO: Finding types for word:', word);

            const wordDoc = await this.prisma.word_types.findFirst({
                where: {
                    word: word.toLowerCase()
                }
            });

            if (!wordDoc || !wordDoc.types) {
                // eslint-disable-next-line no-console
                console.log('🔍 PRISMA-WORD-REPO: No types found for word:', word);

                return [];
            }

            const types = Array.isArray(wordDoc.types) ? wordDoc.types : [];
            const limitedTypes = types.slice(0, limit);

            // eslint-disable-next-line no-console
            console.log('🔍 PRISMA-WORD-REPO: Found', limitedTypes.length, 'types for word:', word);

            return limitedTypes;
        } catch (error) {
            console.error('❌ PRISMA-WORD-REPO: Error finding word types:', error);

            return [];
        }
    }

    /**
     * Find examples by word
     * @param {string} word - The word to search for
     * @param {number} limit - Maximum number of results
     * @returns {Array} Array of examples
     */
    async findExamplesByWord(word, limit = 8) {
        try {
            // eslint-disable-next-line no-console
            console.log('🔍 PRISMA-WORD-REPO: Finding examples for word:', word);

            const wordDoc = await this.prisma.word_types.findFirst({
                where: {
                    word: word.toLowerCase()
                }
            });

            if (!wordDoc || !wordDoc.examples) {
                // eslint-disable-next-line no-console
                console.log('🔍 PRISMA-WORD-REPO: No examples found for word:', word);

                return [];
            }

            const examples = Array.isArray(wordDoc.examples) ? wordDoc.examples : [];
            const sortedExamples = examples.sort();
            const limitedExamples = sortedExamples.slice(0, limit);

            // eslint-disable-next-line no-console
            console.log('🔍 PRISMA-WORD-REPO: Found', limitedExamples.length, 'examples for word:', word);

            return limitedExamples;
        } catch (error) {
            console.error('❌ PRISMA-WORD-REPO: Error finding word examples:', error);

            return [];
        }
    }

    /**
     * Add word with types
     * @param {string} word - The word to add
     * @param {Array} types - Array of related types
     * @returns {Object} Created word document
     */
    async addWordType(word, types) {
        try {
            // eslint-disable-next-line no-console
            console.log('➕ PRISMA-WORD-REPO: Adding word:', word, 'with', types.length, 'types');

            const normalizedWord = word.toLowerCase();
            const wordData = {
                id: this.generateId(),
                word: normalizedWord,
                types,
                examples: types, // Use types as examples initially
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await this.prisma.word_types.create({
                data: wordData
            });

            // eslint-disable-next-line no-console
            console.log('✅ PRISMA-WORD-REPO: Successfully added word:', normalizedWord);

            return result;
        } catch (error) {
            console.error('❌ PRISMA-WORD-REPO: Error adding word type:', error);
            throw error;
        }
    }

    /**
     * Update word types
     * @param {string} word - The word to update
     * @param {Array} types - New array of types
     * @returns {Object} Updated word document
     */
    async updateWordType(word, types) {
        try {
            // eslint-disable-next-line no-console
            console.log('📝 PRISMA-WORD-REPO: Updating word:', word, 'with', types.length, 'types');

            const result = await this.prisma.word_types.updateMany({
                where: {
                    word: word.toLowerCase()
                },
                data: {
                    types,
                    examples: types, // Update examples too
                    updatedAt: new Date()
                }
            });

            // eslint-disable-next-line no-console
            console.log('✅ PRISMA-WORD-REPO: Successfully updated word:', word);

            return result;
        } catch (error) {
            console.error('❌ PRISMA-WORD-REPO: Error updating word type:', error);
            throw error;
        }
    }

    /**
     * Upsert word type (insert or update)
     * @param {string} word - The word to upsert
     * @param {Array} types - Array of types
     * @returns {Object} Result document
     */
    async upsertWordType(word, types) {
        try {
            // eslint-disable-next-line no-console
            console.log('🔄 PRISMA-WORD-REPO: Upserting word:', word, 'with', types.length, 'types');

            const normalizedWord = word.toLowerCase();

            const result = await this.prisma.word_types.upsert({
                where: {
                    word: normalizedWord
                },
                update: {
                    types,
                    examples: types,
                    updatedAt: new Date()
                },
                create: {
                    id: this.generateId(),
                    word: normalizedWord,
                    types,
                    examples: types,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            });

            // eslint-disable-next-line no-console
            console.log('✅ PRISMA-WORD-REPO: Successfully upserted word:', normalizedWord);

            return result;
        } catch (error) {
            console.error('❌ PRISMA-WORD-REPO: Error upserting word type:', error);
            throw error;
        }
    }

    /**
     * Get all words
     * @returns {Array} Array of all words
     */
    async getAllWords() {
        try {
            // eslint-disable-next-line no-console
            console.log('📥 PRISMA-WORD-REPO: Getting all words with types');

            const words = await this.prisma.word_types.findMany({
                select: {
                    word: true,
                    types: true,
                    examples: true,
                    createdAt: true
                },
                orderBy: {
                    word: 'asc'
                }
            });

            // eslint-disable-next-line no-console
            console.log('📥 PRISMA-WORD-REPO: Retrieved', words.length, 'words with types data');

            return words;
        } catch (error) {
            console.error('❌ PRISMA-WORD-REPO: Error getting all words:', error);

            return [];
        }
    }

    /**
     * Search words by term
     * @param {string} searchTerm - Term to search for
     * @param {number} limit - Maximum results
     * @returns {Array} Array of matching words
     */
    async searchWords(searchTerm, limit = 10) {
        try {
            // eslint-disable-next-line no-console
            console.log('🔍 PRISMA-WORD-REPO: Searching words for term:', searchTerm);

            const words = await this.prisma.word_types.findMany({
                where: {
                    word: {
                        contains: searchTerm.toLowerCase()
                    }
                },
                select: {
                    word: true
                },
                orderBy: {
                    word: 'asc'
                },
                take: limit
            });

            const wordList = words.map(doc => doc.word);

            // eslint-disable-next-line no-console
            console.log('🔍 PRISMA-WORD-REPO: Found', wordList.length, 'matching words');

            return wordList;
        } catch (error) {
            console.error('❌ PRISMA-WORD-REPO: Error searching words:', error);

            return [];
        }
    }

    /**
     * Get word statistics
     * @returns {Object} Statistics about words and types
     */
    async getWordStats() {
        try {
            // eslint-disable-next-line no-console
            console.log('📊 PRISMA-WORD-REPO: Getting word statistics');

            const allWords = await this.prisma.word_types.findMany({
                select: {
                    types: true
                }
            });

            const totalWords = allWords.length;
            const totalTypes = allWords.reduce((sum, word) => {
                const types = Array.isArray(word.types) ? word.types : [];

                return sum + types.length;
            }, 0);

            const averageTypesPerWord = totalWords > 0 ? totalTypes / totalWords : 0;

            const stats = {
                totalWords,
                totalTypes,
                averageTypesPerWord: Math.round(averageTypesPerWord * 100) / 100
            };

            // eslint-disable-next-line no-console
            console.log('📊 PRISMA-WORD-REPO: Statistics:', stats);

            return stats;
        } catch (error) {
            console.error('❌ PRISMA-WORD-REPO: Error getting word stats:', error);

            return {
                totalWords: 0,
                totalTypes: 0,
                averageTypesPerWord: 0
            };
        }
    }

    /**
     * Check if word exists
     * @param {string} word - Word to check
     * @returns {boolean} True if word exists
     */
    async wordExists(word) {
        try {
            const wordDoc = await this.prisma.word_types.findFirst({
                where: {
                    word: word.toLowerCase()
                }
            });

            return !!wordDoc;
        } catch (error) {
            console.error('❌ PRISMA-WORD-REPO: Error checking word existence:', error);

            return false;
        }
    }

    /**
     * Generate a unique ID for new records
     * @returns {string} Generated ID
     */
    generateId() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
}
