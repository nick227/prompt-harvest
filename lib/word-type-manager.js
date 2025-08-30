// WordTypeManager - Optimized variable replacement with caching
import DB from '../db/DB.js';
import configManager from '../src/config/ConfigManager.js';

class WordTypeManager {
    constructor() {
        // Single DB instance for all operations
        this.db = new DB('word-types.db');

        // Conservative cache with size limits
        this.cache = new Map();
        this.cacheSize = configManager.cache.wordTypeCacheSize || 100;
        this.cacheHits = new Map(); // Track usage for LRU eviction

        // Track cache performance
        this.stats = {
            cacheHits: 0,
            cacheMisses: 0,
            dbQueries: 0,
            totalRequests: 0
        };
    }

    // Get word replacement with caching
    async getWordReplacement(element, customDict = {}) {
        if (!element.startsWith('$')) {
            return element;
        }

        this.stats.totalRequests++;

        const isDoubleDollar = element.startsWith('$$');
        const word = this.getWordFromElement(element);
        let replacement;

        // Check custom dictionary first
        if (customDict[word]) {
            if (isDoubleDollar) {
                if (this.replacementDict && this.replacementDict[word]) {
                    return this.replacementDict[word];
                } else {
                    replacement = customDict[word][Math.floor(Math.random() * customDict[word].length)];
                    if (!this.replacementDict) { this.replacementDict = {}; }
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
        if (this.cache.has(word)) {
            this.stats.cacheHits++;
            this.cacheHits.set(word, (this.cacheHits.get(word) || 0) + 1);

            return this.getRandomFromCache(word);
        }

        // Cache miss - query database
        this.stats.cacheMisses++;
        this.stats.dbQueries++;

        try {
            const results = await this.db.find({ word });
            const types = results.length > 0 ? results[0].types : [];

            // Cache the result (with size management)
            this.addToCache(word, types);

            if (types.length === 0) {
                return word; // Return original if no types found
            }

            return types[Math.floor(Math.random() * types.length)];
        } catch (error) {
            console.error(`Error fetching word types for "${word}":`, error);

            return word; // Return original on error
        }
    }

    // Add to cache with size management
    addToCache(word, types) {
        // If cache is full, evict least recently used
        if (this.cache.size >= this.cacheSize) {
            this.evictLRU();
        }

        this.cache.set(word, types);
        this.cacheHits.set(word, 1);
    }

    // Evict least recently used cache entry
    evictLRU() {
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
        const types = this.cache.get(word);

        if (!types || types.length === 0) {
            return word;
        }

        return types[Math.floor(Math.random() * types.length)];
    }

    // Extract word from variable element
    getWordFromElement(element) {
        return element.slice(element.startsWith('$$') ? 3 : 2, -1);
    }

    // Check if word is a custom array
    isCustomArray(word) {
        return word.startsWith('[') && word.endsWith(']');
    }

    // Get random element from custom array
    getRandomElementFromCustomArray(word) {
        try {
            const words = JSON.parse(word.replace(/'/g, '"'));

            if (!Array.isArray(words)) {
                return word;
            }

            return words[Math.floor(Math.random() * words.length)];
        } catch (error) {
            return word;
        }
    }

    // Process prompt text with optimized variable replacement
    async processPromptText(prompt, customDict = {}) {
        const regex = /(\$\$\{[^}]+\})|(\$\{[^}]+\})|\b(\w+)\b|[^\s]+|\s/g;
        const textArray = prompt.match(regex);

        // Process all variables in parallel
        const processedArray = await Promise.all(
            textArray.map(word => this.getWordReplacement(word, customDict))
        );

        return processedArray.join('');
    }

    // Get cache statistics
    getCacheStats() {
        const hitRate = this.stats.totalRequests > 0 ?
            (this.stats.cacheHits / this.stats.totalRequests * 100).toFixed(2) :
            0;

        return {
            cacheSize: this.cache.size,
            maxCacheSize: this.cacheSize,
            cacheHits: this.stats.cacheHits,
            cacheMisses: this.stats.cacheMisses,
            dbQueries: this.stats.dbQueries,
            totalRequests: this.stats.totalRequests,
            hitRate: `${hitRate}%`
        };
    }

    // Clear cache (useful for testing or memory management)
    clearCache() {
        this.cache.clear();
        this.cacheHits.clear();
        this.stats = {
            cacheHits: 0,
            cacheMisses: 0,
            dbQueries: 0,
            totalRequests: 0
        };
    }

    // Warm up cache with common variables
    async warmupCache(commonWords = []) {
        if (commonWords.length === 0) {
            // Default common words based on typical usage
            commonWords = ['cat', 'dog', 'color', 'style', 'art', 'lighting', 'background'];
        }

        console.log(`🔥 Warming up cache with ${commonWords.length} common words...`);

        for (const word of commonWords) {
            try {
                const results = await this.db.find({ word });

                if (results.length > 0) {
                    this.addToCache(word, results[0].types);
                }
            } catch (error) {
                console.warn(`Failed to warm up cache for "${word}":`, error);
            }
        }

        console.log(`✅ Cache warmup complete. Cache size: ${this.cache.size}`);
    }
}

// Create singleton instance
const wordTypeManager = new WordTypeManager();

// Export for use in feed.js
export default wordTypeManager;
