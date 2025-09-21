import { BaseRepository } from './BaseRepository.js';

export class WordRepository extends BaseRepository {
    constructor() {
        super('word-types.db');
    }

    async findByWord(word, limit = 8) {
        const docs = await this.find({
            limit,
            $or: [{ word }]
        });

        if (!docs || docs.length === 0 || !docs[0]) {
            return [];
        }

        return docs[0].types || [];
    }

    async findExamplesByWord(word, limit = 8) {
        const { default: DB } = await import('../../db/DB.js');
        const examplesDb = new DB('word-examples.db');

        const docs = await examplesDb.find({
            limit,
            $or: [{ word }]
        });

        if (!docs || docs.length === 0 || !docs[0]) {
            return [];
        }

        const examples = docs[0].examples || [];

        examples.sort();

        return examples;
    }

    async addWordType(word, types) {
        const data = { word, types };

        return await this.insert(data);
    }

    async updateWordType(word, types) {
        const query = { word };
        const update = { $set: { types } };

        return await this.update(query, update);
    }

    async upsertWordType(word, types) {
        const query = { word };
        const data = { word, types };

        return await this.upsert(query, data);
    }

    async getAllWords() {
        const response = await this.find({ projection: JSON.stringify({ word: 1 }) });
        const words = response.map(doc => doc.word);

        words.sort();

        return words;
    }

    async searchWords(searchTerm, limit = 10) {
        const allWords = await this.getAllWords();
        const filteredWords = allWords.filter(word => word.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return filteredWords.slice(0, limit);
    }

    async getWordStats() {
        const allWords = await this.find({});

        return {
            totalWords: allWords.length,
            totalTypes: allWords.reduce((sum, word) => sum + (word.types?.length || 0), 0),
            averageTypesPerWord: allWords.length > 0 ?
                allWords.reduce((sum, word) => sum + (word.types?.length || 0), 0) / allWords.length
                : 0
        };
    }

    async deleteWordType(word) {
        try {
            // Import Prisma client
            const databaseClient = await import('../database/PrismaClient.js');
            const prisma = databaseClient.default.getClient();

            // Delete from MySQL database
            const result = await prisma.word_types.deleteMany({
                where: { word: word.toLowerCase() }
            });

            return {
                deletedCount: result.count || 0,
                word
            };
        } catch (error) {
            console.error('Error deleting word from MySQL:', error);
            throw error;
        }
    }
}
