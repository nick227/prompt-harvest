/**
 * SearchRepository
 * Responsibility: Data access for search operations
 * Follows: Single Responsibility Principle, Dependency Inversion
 */

class SearchRepository {
    constructor(prismaClient, config = {}) {
        this.prisma = prismaClient;
        this.overfetchMultiplier = config.overfetchMultiplier || 2;
        this.imageFields = this.defineImageFields();
    }

    /**
     * Define fields to select from images
     * DRY: Single source of truth for image selection
     * @private
     */
    defineImageFields() {
        return {
            id: true,
            imageUrl: true,
            prompt: true,
            provider: true,
            model: true,
            original: true,
            guidance: true,
            isPublic: true,
            isHidden: true,
            rating: true,
            tags: true,
            taggedAt: true,
            createdAt: true,
            userId: true
        };
    }

    /**
     * Execute search query and return images with metadata
     * @param {Object} whereClause - Prisma WHERE clause
     * @param {Object} pagination - { skip, limit }
     * @returns {Promise<{images: Array, total: number}>}
     */
    async findImages(whereClause, { skip, limit }) {
        const [images, total] = await Promise.all([
            this.prisma.image.findMany({
                where: whereClause,
                skip,
                take: limit * this.overfetchMultiplier,
                orderBy: [{ createdAt: 'desc' }],
                select: this.imageFields
            }),
            this.prisma.image.count({ where: whereClause })
        ]);

        return { images, total };
    }

    /**
     * Enrich images with usernames
     * SRP: Separate concern for user data enrichment
     * @param {Array} images - Images to enrich
     * @returns {Promise<Array>} Images with username field
     */
    async enrichWithUsernames(images) {
        if (images.length === 0) {
            return images;
        }

        const userIds = this.extractUniqueUserIds(images);
        const usernameMap = await this.fetchUsernameMap(userIds);

        return images.map(image => ({
            ...image,
            username: usernameMap.get(image.userId) || 'Unknown'
        }));
    }

    /**
     * Extract unique user IDs from images
     * @private
     */
    extractUniqueUserIds(images) {
        return [...new Set(
            images
                .map(img => img.userId)
                .filter(Boolean)
        )];
    }

    /**
     * Fetch usernames and create userId -> username map
     * @private
     */
    async fetchUsernameMap(userIds) {
        if (userIds.length === 0) {
            return new Map();
        }

        const users = await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, username: true }
        });

        return new Map(users.map(u => [u.id, u.username]));
    }

    /**
     * Complete search operation with enrichment
     * @param {Object} whereClause - Prisma WHERE clause
     * @param {Object} pagination - { skip, limit }
     * @returns {Promise<{images: Array, total: number}>}
     */
    async searchImages(whereClause, pagination) {
        const { images, total } = await this.findImages(whereClause, pagination);
        const enrichedImages = await this.enrichWithUsernames(images);

        return { images: enrichedImages, total };
    }
}

export default SearchRepository;

