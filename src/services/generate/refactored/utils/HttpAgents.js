/**
 * HTTP Agents
 *
 * Shared HTTP/HTTPS agents for connection pooling across all providers
 */

import http from 'http';
import https from 'https';
import axios from 'axios';

// Shared agents with keep-alive (50 concurrent connections max)
export const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 50 });
export const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 50 });

/**
 * Create axios instance for Dezgo API
 * @returns {Object} Configured axios instance
 */
export const createDezgoAxios = () => axios.create({
    httpAgent,
    httpsAgent,
    headers: { 'User-Agent': 'Image-Harvest/1.0' }
});

/**
 * Create axios instance for Google API
 * @returns {Object} Configured axios instance
 */
export const createGoogleAxios = () => axios.create({
    httpAgent,
    httpsAgent
});

export default {
    httpAgent,
    httpsAgent,
    createDezgoAxios,
    createGoogleAxios
};

