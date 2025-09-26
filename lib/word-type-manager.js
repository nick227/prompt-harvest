// WordTypeManager - Simplified direct database access without broken cache
import databaseClient from '../src/database/PrismaClient.js';

class WordTypeManager {
    constructor() {
        try {
            this.prisma = databaseClient.getClient();
            console.log('✅ WordTypeManager: Using MySQL database directly through Prisma');

            // Simple request tracking for monitoring
            this.stats = {
                totalRequests: 0,
                dbQueries: 0
            };

            this.isDatabaseReady = false;
        } catch (error) {
            console.error('❌ WordTypeManager: Failed to initialize:', error);
            this.prisma = null;
            this.isDatabaseReady = false;
        }
    }

    // Initialize database connection check
    async initializeDatabase() {
        if (this.isDatabaseReady) {
            return;
        }

        try {
            await this.prisma.$queryRaw`SELECT 1`;

            try {
                await this.prisma.$queryRaw`SELECT 1 FROM word_types LIMIT 1`;
                console.log('✅ word_types table exists in database');
                this.isDatabaseReady = true;
            } catch (tableError) {
                console.warn('⚠️ word_types table does not exist yet');
                this.isDatabaseReady = false;
            }
        } catch (error) {
            console.warn('WordTypeManager: Database not ready yet, will retry later:', error.message);
            setTimeout(() => this.initializeDatabase(), 2000);
        }
    }

    // Get word replacement - simplified without cache
    async getWordReplacement(element, customDict = {}) {
        if (!element || typeof element !== 'string') {
            return element || '';
        }

        if (!element.startsWith('$')) {
            return element;
        }

        // Check if it's a valid variable pattern
        if (!element.match(/^\$\{?[a-zA-Z0-9_\s]+\}?$/)) {
            console.warn('getWordReplacement: Invalid variable pattern, returning as-is:', element);
            return element;
        }

        this.stats.totalRequests++;

        const isDoubleDollar = element.startsWith('$$');
        const word = this.getWordFromElement(element);

        // Check custom dictionary first
        if (customDict && customDict[word] && Array.isArray(customDict[word]) && customDict[word].length > 0) {
            return customDict[word][Math.floor(Math.random() * customDict[word].length)];
        }

        // Check if it's a custom array
        if (this.isCustomArray(word)) {
            return this.getRandomElementFromCustomArray(word);
        }

        // Query database directly
        this.stats.dbQueries++;

        try {
            if (!this.prisma) {
                console.warn('Prisma client not available for word types');
                return word;
            }

            const wordRecord = await this.prisma.word_types.findUnique({
                where: { word }
            });

            const types = wordRecord ? wordRecord.types : [];

            if (Array.isArray(types) && types.length > 0) {
                return types[Math.floor(Math.random() * types.length)];
            } else {
                console.warn(`No types found for word: ${word}`);
                return word;
            }
        } catch (error) {
            console.error(`Error fetching word types for "${word}":`, error);
            return word;
        }
    }

    // Extract word from variable element
    getWordFromElement(element) {
        if (!element || typeof element !== 'string') {
            return element || '';
        }

        if (!element.match(/^\$\{?[a-zA-Z0-9_\s]+\}?$/)) {
            return element;
        }

        return element.slice(element.startsWith('$$') ? 3 : 2, -1);
    }

    // Check if word is a custom array
    isCustomArray(word) {
        if (!word || typeof word !== 'string') {
            return false;
        }
        return word.startsWith('[') && word.endsWith(']');
    }

    // Get random element from custom array
    getRandomElementFromCustomArray(word) {
        try {
            if (!word || typeof word !== 'string') {
                return word || '';
            }

            const words = JSON.parse(word.replace(/'/g, '"'));

            if (!Array.isArray(words)) {
                return word;
            }

            return words[Math.floor(Math.random() * words.length)];
        } catch (error) {
            console.warn('getRandomElementFromCustomArray error:', error);
            return word || '';
        }
    }

    // Process prompt text with variable replacement
    async processPromptText(prompt, customDict = {}) {
        if (!prompt || typeof prompt !== 'string') {
            console.warn('processPromptText: Invalid prompt received:', prompt);
            return prompt || '';
        }

        const regex = /(\$\$\{[a-zA-Z0-9_\s]+\})|(\$\{[a-zA-Z0-9_\s]+\})|\b(\w+)\b|[^\s]+|\s/g;
        const textArray = prompt.match(regex);

        if (!textArray) {
            return prompt;
        }

        // Process all variables in parallel
        const processedArray = await Promise.all(
            textArray.map(word => this.getWordReplacement(word, customDict))
        );

        return processedArray.join('');
    }

    // Get simple statistics
    getStats() {
        return {
            totalRequests: this.stats.totalRequests || 0,
            dbQueries: this.stats.dbQueries || 0,
            isDatabaseReady: this.isDatabaseReady
        };
    }

    // Add word type to database
    async addWordType(word, types) {
        if (!word || typeof word !== 'string') {
            throw new Error('Invalid word parameter');
        }

        if (!Array.isArray(types) || types.length === 0) {
            throw new Error('Invalid types parameter - must be non-empty array');
        }

        if (!this.prisma) {
            throw new Error('Database client not available');
        }

        try {
            const existingWord = await this.prisma.word_types.findUnique({
                where: { word: word.toLowerCase() }
            });

            if (existingWord) {
                return await this.prisma.word_types.update({
                    where: { word: word.toLowerCase() },
                    data: { types: types }
                });
            } else {
                return await this.prisma.word_types.create({
                    data: {
                        word: word.toLowerCase(),
                        types: types
                    }
                });
            }
        } catch (error) {
            console.error(`Error adding word type for "${word}":`, error);
            throw error;
        }
    }

    // Delete word type from database
    async deleteWordType(word) {
        if (!word || typeof word !== 'string') {
            throw new Error('Invalid word parameter');
        }

        if (!this.prisma) {
            throw new Error('Database client not available');
        }

        try {
            return await this.prisma.word_types.delete({
                where: { word: word.toLowerCase() }
            });
        } catch (error) {
            console.error(`Error deleting word type for "${word}":`, error);
            throw error;
        }
    }

    // Get word types for a specific word
    async getWordTypes(word) {
        if (!word || typeof word !== 'string') {
            return [];
        }

        if (!this.prisma) {
            return [];
        }

        try {
            const wordRecord = await this.prisma.word_types.findUnique({
                where: { word: word.toLowerCase() }
            });

            return wordRecord ? wordRecord.types : [];
        } catch (error) {
            console.error(`Error fetching word types for "${word}":`, error);
            return [];
        }
    }
}

// Create singleton instance
const wordTypeManager = new WordTypeManager();

// Initialize database connection
wordTypeManager.initializeDatabase();

// Export for use in feed.js
export default wordTypeManager;
