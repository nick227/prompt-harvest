export class ApiHelper {
    constructor(baseURL = 'http://localhost:3200') {
        this.baseURL = baseURL;
    }

    async makeRequest(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const response = await fetch(url, { ...defaultOptions, ...options });
        
        return {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            data: await response.json().catch(() => null),
            text: await response.text().catch(() => null),
        };
    }

    async get(endpoint, headers = {}) {
        return await this.makeRequest(endpoint, {
            method: 'GET',
            headers,
        });
    }

    async post(endpoint, data = {}, headers = {}) {
        return await this.makeRequest(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            },
            body: JSON.stringify(data),
        });
    }

    async put(endpoint, data = {}, headers = {}) {
        return await this.makeRequest(endpoint, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            },
            body: JSON.stringify(data),
        });
    }

    async delete(endpoint, headers = {}) {
        return await this.makeRequest(endpoint, {
            method: 'DELETE',
            headers,
        });
    }

    // Specific API methods for testing
    async getImages(userId = null) {
        const endpoint = userId ? `/images?userId=${userId}` : '/images';
        return await this.get(endpoint);
    }

    async getFeed(userId = null) {
        const endpoint = userId ? `/feed?userId=${userId}` : '/feed';
        return await this.get(endpoint);
    }

    async generateImage(prompt, providers = ['test-provider'], guidance = 10) {
        return await this.post('/image/generate', {
            prompt,
            providers: providers.join(','),
            guidance,
        });
    }

    async updateImageRating(imageId, rating) {
        return await this.put(`/api/images/${imageId}/rating`, { rating });
    }

    async deleteImage(imageId) {
        return await this.delete(`/api/images/${imageId}`);
    }

    async likeImage(imageId) {
        return await this.post(`/like/image/${imageId}`);
    }

    async unlikeImage(imageId) {
        return await this.delete(`/like/image/${imageId}`);
    }

    async checkIfLiked(imageId) {
        return await this.get(`/image/${imageId}/liked`);
    }

    async addTag(imageId, tag) {
        return await this.post('/tags/add', { imageId, tag });
    }

    async removeTag(imageId, tag) {
        return await this.delete('/tags/remove', { imageId, tag });
    }

    async getImageTags(imageId) {
        return await this.get(`/api/images/${imageId}/tags`);
    }

    async getConfig() {
        return await this.get('/api/config');
    }

    async getCacheStats() {
        return await this.get('/api/cache/stats');
    }

    async clearCache() {
        return await this.post('/api/cache/clear');
    }
}
