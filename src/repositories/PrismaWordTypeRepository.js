import { PrismaBaseRepository } from './PrismaBaseRepository.js';
import { NotFoundError } from '../errors/CustomErrors.js';

export class PrismaWordTypeRepository extends PrismaBaseRepository {
    constructor() {
        super('word_types');
    }

    async createWordType(wordTypeData) {
        return await this.prisma.word_types.create({
            data: wordTypeData
        });
    }

    async findByWord(word) {
        return await this.prisma.word_types.findUnique({
            where: { word }
        });
    }

    async searchWords(query) {
        return await this.prisma.word_types.findMany({
            where: {
                word: {
                    contains: query,
                    mode: 'insensitive'
                }
            },
            take: 10
        });
    }

    async getAllWords() {
        return await this.prisma.word_types.findMany({
            select: { word: true }
        });
    }

    async updateWordType(word, data) {
        return await this.prisma.word_types.update({
            where: { word },
            data
        });
    }

    async deleteWordType(word) {
        return await this.prisma.word_types.delete({
            where: { word }
        });
    }
}
