// WordTypeManager - Updated to use MySQL database directly through Prisma
import configManager from '../src/config/ConfigManager.js';
import databaseClient from '../src/database/PrismaClient.js';

class WordTypeManager {
    constructor() {
        try {
            // Use Prisma client for direct database access
            this.prisma = databaseClient.getClient();
            console.log('✅ WordTypeManager: Using MySQL database directly through Prisma');

            // Conservative cache with size limits
            this.cache = new Map();
            this.cacheSize = (configManager?.cache?.wordTypeCacheSize) || 100;
            this.cacheHits = new Map(); // Track usage for LRU eviction

            // Track cache performance
            this.stats = {
                cacheHits: 0,
                cacheMisses: 0,
                dbQueries: 0,
                totalRequests: 0
            };

            // Pre-load common words for better performance
            this.warmupCache();
        } catch (error) {
            console.error('❌ WordTypeManager: Failed to initialize:', error);
            this.prisma = null;
        }
    }

    // Get word replacement with caching
    async getWordReplacement(element, customDict = {}) {
        if (!element || typeof element !== 'string') {
            console.warn('getWordReplacement: Invalid element parameter:', element);

            return element || '';
        }

        if (!element.startsWith('$')) {
            return element;
        }

        // Check if it's a valid variable pattern - updated to allow spaces in multi-word variables
        if (!element.match(/^\$\{?[a-zA-Z0-9_\s]+\}?$/)) {
            console.warn('getWordReplacement: Invalid variable pattern, returning as-is:', element);
            return element;
        }

        if (this.stats) {
            this.stats.totalRequests++;
        }

        const isDoubleDollar = element.startsWith('$$');
        const word = this.getWordFromElement(element);
        let replacement;

        // Check custom dictionary first
        if (customDict && customDict[word] && Array.isArray(customDict[word]) && customDict[word].length > 0) {
            if (isDoubleDollar) {
                if (this.replacementDict && this.replacementDict[word]) {
                    return this.replacementDict[word];
                } else {
                    replacement = customDict[word][Math.floor(Math.random() * customDict[word].length)];
                    if (!this.replacementDict) {
                        this.replacementDict = {};
                    }
                    this.replacementDict[word] = replacement;
                }
            } else {
                replacement = customDict[word][Math.floor(Math.random() * customDict[word].length)];
            }

            return replacement;
        }

        // Check if it's a custom array
        if (this.isCustomArray(word)) {
            return this.getRandomElementFromCustomArray(word);
        }

        // Check cache first
        if (this.cache && this.cache.has(word)) {
            if (this.stats) {
                this.stats.cacheHits++;
            }
            if (this.cacheHits) {
                this.cacheHits.set(word, (this.cacheHits.get(word) || 0) + 1);
            }

            return this.getRandomFromCache(word);
        }

        // Cache miss - query MySQL database directly
        if (this.stats) {
            this.stats.cacheMisses++;
            this.stats.dbQueries++;
        }

        try {
            if (!this.prisma) {
                console.warn('Prisma client not available for word types');

                return word;
            }

            const wordRecord = await this.prisma.word_types.findUnique({
                where: { word }
            });

            const types = wordRecord ? wordRecord.types : [];

            // Cache the result (with size management)
            this.addToCache(word, types);

            if (types && types.length > 0) {
                return this.getRandomFromCache(word);
            } else {
                console.warn(`No types found for word: ${word}`);

                return word; // Return original if no types found
            }
        } catch (error) {
            console.error(`Error fetching word types for "${word}":`, error);

            return word; // Return original on error
        }
    }

    // Add to cache with size management
    addToCache(word, types) {
        if (!word || typeof word !== 'string') {
            console.warn('addToCache: Invalid word parameter:', word);

            return;
        }

        if (!Array.isArray(types)) {
            console.warn('addToCache: Invalid types parameter:', types);

            return;
        }

        // If cache is full, evict least recently used
        if (this.cache.size >= this.cacheSize) {
            this.evictLRU();
        }

        this.cache.set(word, types);
        this.cacheHits.set(word, 1);
    }

    // Evict least recently used cache entry
    evictLRU() {
        if (!this.cache || !this.cacheHits) {
            return;
        }

        let lruWord = null;
        let lruCount = Infinity;

        for (const [word, count] of this.cacheHits) {
            if (count < lruCount) {
                lruCount = count;
                lruWord = word;
            }
        }

        if (lruWord) {
            this.cache.delete(lruWord);
            this.cacheHits.delete(lruWord);
        }
    }

    // Get random word from cache
    getRandomFromCache(word) {
        if (!word || typeof word !== 'string') {
            return word || '';
        }

        const types = this.cache.get(word);

        if (!types || types.length === 0) {
            return word;
        }

        return types[Math.floor(Math.random() * types.length)];
    }

    // Extract word from variable element
    getWordFromElement(element) {
        if (!element || typeof element !== 'string') {
            return element || '';
        }

        // Only process valid variable patterns - updated to allow spaces in multi-word variables
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

    // Process prompt text with optimized variable replacement
    async processPromptText(prompt, customDict = {}) {
        // Handle undefined or null prompts gracefully
        if (!prompt || typeof prompt !== 'string') {
            console.warn('processPromptText: Invalid prompt received:', prompt);

            return prompt || '';
        }

        console.log('🔍 processPromptText processing:', {
            prompt: `${typeof prompt} (${prompt.length} chars)`,
            preview: `${prompt.substring(0, 50)}...`,
            customDictKeys: Object.keys(customDict)
        });

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

    // Get cache statistics
    getCacheStats() {
        if (!this.stats) {
            return {
                cacheSize: 0,
                maxCacheSize: this.cacheSize || 0,
                cacheHits: 0,
                cacheMisses: 0,
                apiQueries: 0,
                totalRequests: 0,
                hitRate: '0%'
            };
        }

        const hitRate = this.stats.totalRequests > 0 ?
            (this.stats.cacheHits / this.stats.totalRequests * 100).toFixed(2) :
            0;

        return {
            cacheSize: this.cache ? this.cache.size : 0,
            maxCacheSize: this.cacheSize || 0,
            cacheHits: this.stats.cacheHits || 0,
            cacheMisses: this.stats.cacheMisses || 0,
            dbQueries: this.stats.dbQueries || 0,
            totalRequests: this.stats.totalRequests || 0,
            hitRate: `${hitRate}%`
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
            // Check if word already exists
            const existingWord = await this.prisma.word_types.findUnique({
                where: { word: word.toLowerCase() }
            });

            if (existingWord) {
                // Update existing word with new types
                const updatedWord = await this.prisma.word_types.update({
                    where: { word: word.toLowerCase() },
                    data: { types: types }
                });

                // Update cache
                this.addToCache(word.toLowerCase(), types);

                return updatedWord;
            } else {
                // Create new word
                const newWord = await this.prisma.word_types.create({
                    data: {
                        word: word.toLowerCase(),
                        types: types
                    }
                });

                // Add to cache
                this.addToCache(word.toLowerCase(), types);

                return newWord;
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
            const deletedWord = await this.prisma.word_types.delete({
                where: { word: word.toLowerCase() }
            });

            // Remove from cache
            if (this.cache) {
                this.cache.delete(word.toLowerCase());
            }
            if (this.cacheHits) {
                this.cacheHits.delete(word.toLowerCase());
            }

            return deletedWord;
        } catch (error) {
            console.error(`Error deleting word type for "${word}":`, error);
            throw error;
        }
    }

    // Clear cache (useful for testing or memory management)
    clearCache() {
        if (this.cache) {
            this.cache.clear();
        }
        if (this.cacheHits) {
            this.cacheHits.clear();
        }
        this.stats = {
            cacheHits: 0,
            cacheMisses: 0,
            dbQueries: 0,
            totalRequests: 0
        };
    }

    // Warm up cache with common variables
    async warmupCache(commonWords = []) {
        if (!commonWords || commonWords.length === 0) {
            // Default common words based on typical usage
            commonWords = ['cat', 'dog', 'color', 'style', 'art', 'lighting', 'background'];
        }

        if (!Array.isArray(commonWords)) {
            console.warn('warmupCache: Invalid commonWords parameter:', commonWords);

            return;
        }

        console.log(`🔥 Warming up cache with ${commonWords.length} common words...`);

        for (const word of commonWords) {
            try {
                if (!word || typeof word !== 'string') {
                    console.warn('warmupCache: Invalid word in array:', word);
                    continue;
                }

                if (!this.prisma) {
                    console.warn('Prisma client not available for cache warmup');
                    continue;
                }

                const wordRecord = await this.prisma.word_types.findUnique({
                    where: { word }
                });

                if (wordRecord && wordRecord.types) {
                    this.addToCache(word, wordRecord.types);
                } else {
                    console.warn(`No types found for warmup word: ${word}`);
                }
            } catch (error) {
                console.warn(`Failed to warm up cache for "${word}":`, error);
            }
        }

        console.log(`✅ Cache warmup complete. Cache size: ${this.cache ? this.cache.size : 0}`);
    }
}

// Create singleton instance
const wordTypeManager = new WordTypeManager();

// Export for use in feed.js
export default wordTypeManager;
