import { PrismaBaseRepository } from './PrismaBaseRepository.js';
import { NotFoundError } from '../errors/CustomErrors.js';

export class PrismaPromptRepository extends PrismaBaseRepository {
    constructor() {
        super('prompts');
    }

    async createPrompt(promptData) {
        return await this.prisma.prompts.create({
            data: promptData
        });
    }

    async getPromptsByUserId(userId, limit = 8, page = 0) {
        const skip = page * limit;

        return await this.prisma.prompts.findMany({
            where: { userId: userId || 'undefined' },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip
        });
    }

    async getPromptById(id) {
        const prompt = await this.prisma.prompts.findUnique({
            where: { id }
        });

        if (!prompt) {
            throw new NotFoundError(`Prompt with id ${id} not found`);
        }

        return prompt;
    }

    async deletePrompt(id) {
        return await this.prisma.prompts.delete({
            where: { id }
        });
    }

    async countByUserId(userId) {
        return await this.prisma.prompts.count({
            where: { userId: userId || 'undefined' }
        });
    }
}
