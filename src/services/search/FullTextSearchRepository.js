class FullTextSearchRepository {
    constructor(prismaClient) {
        this.prisma = prismaClient;
    }

    buildAccessClause(userId, scope, params) {
        if (scope === 'private') {
            if (!userId) {
                return '1 = 0';
            }

            params.push(userId);

            return 'i.userId = ?';
        }

        if (scope === 'public' || !userId) {
            return 'i.isPublic = TRUE';
        }

        params.push(userId);

        return '(i.userId = ? OR i.isPublic = TRUE)';
    }

    buildTagClause(tags, params) {
        if (!tags?.length) {
            return null;
        }

        const conditions = tags.map(tag => {
            params.push(tag.toLowerCase());

            return "JSON_CONTAINS(i.tags, JSON_QUOTE(?), '$')";
        });

        return `(${conditions.join(' OR ')})`;
    }

    buildQuery({ query, userId, scope, tags, limit, cursor }) {
        const whereParams = [];
        const accessClause = this.buildAccessClause(userId, scope, whereParams);
        const tagClause = this.buildTagClause(tags, whereParams);
        const where = [
            'i.isDeleted = FALSE',
            'i.isHidden = FALSE',
            accessClause,
            tagClause
        ].filter(Boolean).join(' AND ');
        const cursorParams = [];
        let cursorClause = '';

        if (cursor) {
            cursorClause = `WHERE (
                searchScore < ? OR
                (searchScore = ? AND createdAt < ?) OR
                (searchScore = ? AND createdAt = ? AND id < ?)
            )`;
            cursorParams.push(
                cursor.score,
                cursor.score,
                new Date(cursor.createdAt),
                cursor.score,
                new Date(cursor.createdAt),
                cursor.id
            );
        }

        const sql = `
            WITH ranked AS (
                SELECT
                    i.id, i.imageUrl, i.prompt, i.original, i.provider, i.model,
                    i.guidance, i.isPublic, i.isHidden, i.rating, i.tags,
                    i.taggedAt, i.createdAt, i.userId,
                    COALESCE(u.username, 'Unknown') AS username,
                    MATCH(sd.prompt, sd.originalPrompt, sd.tagsText, sd.provider, sd.model)
                        AGAINST (? IN NATURAL LANGUAGE MODE) AS searchScore
                FROM image_search_documents sd
                INNER JOIN images i ON i.id = sd.imageId
                LEFT JOIN users u ON u.id = i.userId
                WHERE ${where}
                  AND MATCH(sd.prompt, sd.originalPrompt, sd.tagsText, sd.provider, sd.model)
                      AGAINST (? IN NATURAL LANGUAGE MODE) > 0
            ), counted AS (
                SELECT ranked.*, COUNT(*) OVER() AS totalCount
                FROM ranked
            )
            SELECT * FROM counted
            ${cursorClause}
            ORDER BY searchScore DESC, createdAt DESC, id DESC
            LIMIT ?
        `;

        return {
            sql,
            params: [query, ...whereParams, query, ...cursorParams, limit + 1]
        };
    }

    async search(params) {
        const { sql, params: values } = this.buildQuery(params);

        return this.prisma.$queryRawUnsafe(sql, ...values);
    }
}

export default FullTextSearchRepository;
