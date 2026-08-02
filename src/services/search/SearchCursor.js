import crypto from 'node:crypto';

class SearchCursor {
    constructor(secret) {
        this.secret = secret || process.env.SEARCH_CURSOR_SECRET || process.env.JWT_SECRET;

        if (!this.secret) {
            throw new Error('SEARCH_CURSOR_SECRET or JWT_SECRET is required for cursor search');
        }
    }

    fingerprint(query, filters = {}) {
        const normalized = JSON.stringify({
            query: query.trim().toLowerCase(),
            scope: filters.scope || 'all',
            tags: [...(filters.specificTags || [])].map(tag => tag.toLowerCase()).sort()
        });

        return crypto.createHash('sha256').update(normalized).digest('base64url');
    }

    encode(values, query, filters = {}) {
        const payload = Buffer.from(JSON.stringify({
            ...values,
            fingerprint: this.fingerprint(query, filters)
        })).toString('base64url');
        const signature = crypto.createHmac('sha256', this.secret).update(payload).digest('base64url');

        return `${payload}.${signature}`;
    }

    decode(cursor, query, filters = {}) {
        if (!cursor) {
            return null;
        }

        const [payload, signature] = cursor.split('.');

        if (!payload || !signature) {
            throw new Error('Invalid search cursor');
        }

        const expected = crypto.createHmac('sha256', this.secret).update(payload).digest();
        const supplied = Buffer.from(signature, 'base64url');

        if (expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied)) {
            throw new Error('Invalid search cursor');
        }

        let decoded;

        try {
            decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        } catch {
            throw new Error('Invalid search cursor');
        }

        if (decoded.fingerprint !== this.fingerprint(query, filters)) {
            throw new Error('Search cursor does not match the query and filters');
        }

        return decoded;
    }
}

export default SearchCursor;
