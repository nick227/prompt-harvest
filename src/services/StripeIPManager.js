/**
 * Stripe IP Manager
 * Automatically fetches and manages Stripe IP addresses
 */

import https from 'https';
import fs from 'fs';
import path from 'path';

export class StripeIPManager {
    constructor() {
        this.ipCacheFile = path.join(process.cwd(), 'data', 'stripe-ips.json');
        this.cacheTimeout = 24 * 60 * 60 * 1000; // 24 hours
        this.stripeIPUrls = {
            webhooks: 'https://stripe.com/files/ips/ips_webhooks.json',
            api: 'https://stripe.com/files/ips/ips_api.json'
        };
    }

    /**
     * Fetch latest Stripe IP addresses
     */
    async fetchStripeIPs() {
        try {
            console.log('🔄 STRIPE-IP: Fetching latest Stripe IP addresses...');

            const [webhookIPs, apiIPs] = await Promise.all([
                this.fetchIPList(this.stripeIPUrls.webhooks),
                this.fetchIPList(this.stripeIPUrls.api)
            ]);

            const allIPs = [...webhookIPs, ...apiIPs];
            const uniqueIPs = [...new Set(allIPs)]; // Remove duplicates

            console.log(`✅ STRIPE-IP: Fetched ${uniqueIPs.length} unique IP addresses`);
            console.log(`📊 STRIPE-IP: Webhook IPs: ${webhookIPs.length}, API IPs: ${apiIPs.length}`);

            return {
                webhookIPs,
                apiIPs,
                allIPs: uniqueIPs,
                lastUpdated: new Date().toISOString()
            };

        } catch (error) {
            console.error('❌ STRIPE-IP: Error fetching IP addresses:', error);
            throw error;
        }
    }

    /**
     * Fetch IP list from Stripe URL
     */
    async fetchIPList(url) {
        return new Promise((resolve, reject) => {
            https.get(url, res => {
                let data = '';

                res.on('data', chunk => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        const jsonData = JSON.parse(data);

                        resolve(jsonData.ips || []);
                    } catch (error) {
                        reject(new Error(`Failed to parse IP list from ${url}: ${error.message}`));
                    }
                });
            }).on('error', error => {
                reject(new Error(`Failed to fetch IP list from ${url}: ${error.message}`));
            });
        });
    }

    /**
     * Get cached IP addresses or fetch fresh ones
     */
    async getStripeIPs(forceRefresh = false) {
        try {
            // Check if we have cached data
            if (!forceRefresh && await this.hasValidCache()) {
                const cachedData = await this.loadFromCache();

                console.log('📋 STRIPE-IP: Using cached IP addresses');

                return cachedData;
            }

            // Fetch fresh data
            const freshData = await this.fetchStripeIPs();

            await this.saveToCache(freshData);

            return freshData;

        } catch (error) {
            console.error('❌ STRIPE-IP: Error getting Stripe IPs:', error);

            // Fallback to cached data if available
            if (await this.hasValidCache()) {
                console.log('🔄 STRIPE-IP: Falling back to cached data');

                return await this.loadFromCache();
            }

            // Final fallback to hardcoded IPs
            console.log('🔄 STRIPE-IP: Using hardcoded fallback IPs');

            return this.getHardcodedIPs();
        }
    }

    /**
     * Check if cached data is still valid
     */
    async hasValidCache() {
        try {
            if (!fs.existsSync(this.ipCacheFile)) {
                return false;
            }

            const cachedData = await this.loadFromCache();
            const lastUpdated = new Date(cachedData.lastUpdated);
            const now = new Date();
            const age = now - lastUpdated;

            return age < this.cacheTimeout;
        } catch (error) {
            return false;
        }
    }

    /**
     * Load IP data from cache
     */
    async loadFromCache() {
        const data = fs.readFileSync(this.ipCacheFile, 'utf8');

        return JSON.parse(data);
    }

    /**
     * Save IP data to cache
     */
    async saveToCache(data) {
        // Ensure data directory exists
        const dataDir = path.dirname(this.ipCacheFile);

        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        fs.writeFileSync(this.ipCacheFile, JSON.stringify(data, null, 2));
        console.log('💾 STRIPE-IP: IP addresses cached successfully');
    }

    /**
     * Get hardcoded fallback IPs
     */
    getHardcodedIPs() {
        return {
            webhookIPs: [
                '3.18.12.63', '3.130.192.231', '13.235.14.237', '13.235.122.149',
                '18.211.135.69', '35.154.171.200', '52.15.183.38', '54.88.130.119',
                '54.88.130.237', '54.187.174.169', '54.187.205.235', '54.187.216.72',
                '100.64.0.5'
            ],
            apiIPs: [
                '3.18.12.63', '3.130.192.231', '13.235.14.237', '13.235.122.149',
                '18.211.135.69', '35.154.171.200', '52.15.183.38', '54.88.130.119',
                '54.88.130.237', '54.187.174.169', '54.187.205.235', '54.187.216.72'
            ],
            allIPs: [
                '3.18.12.63', '3.130.192.231', '13.235.14.237', '13.235.122.149',
                '18.211.135.69', '35.154.171.200', '52.15.183.38', '54.88.130.119',
                '54.88.130.237', '54.187.174.169', '54.187.205.235', '54.187.216.72',
                '100.64.0.5'
            ],
            lastUpdated: new Date().toISOString(),
            source: 'hardcoded_fallback'
        };
    }

    /**
     * Check if an IP is from Stripe
     */
    async isStripeIP(ip) {
        try {
            const ipData = await this.getStripeIPs();

            return ipData.allIPs.includes(ip);
        } catch (error) {
            console.error('❌ STRIPE-IP: Error checking IP:', error);

            return false;
        }
    }

    /**
     * Get IP ranges for more flexible matching
     */
    async getStripeIPRanges() {
        try {
            const ipData = await this.getStripeIPs();
            const ranges = new Set();

            ipData.allIPs.forEach(ip => {
                const parts = ip.split('.');

                if (parts.length === 4) {
                    // Add /24 subnet
                    ranges.add(`${parts[0]}.${parts[1]}.${parts[2]}.0/24`);
                    // Add /16 subnet
                    ranges.add(`${parts[0]}.${parts[1]}.0.0/16`);
                }
            });

            return Array.from(ranges);
        } catch (error) {
            console.error('❌ STRIPE-IP: Error getting IP ranges:', error);

            return [];
        }
    }

    /**
     * Health check for IP manager
     */
    async healthCheck() {
        try {
            const ipData = await this.getStripeIPs();
            const isValid = ipData.allIPs && ipData.allIPs.length > 0;

            return {
                healthy: isValid,
                ipCount: ipData.allIPs ? ipData.allIPs.length : 0,
                lastUpdated: ipData.lastUpdated,
                source: ipData.source || 'unknown'
            };
        } catch (error) {
            return {
                healthy: false,
                error: error.message
            };
        }
    }

    /**
     * Force refresh IP addresses
     */
    async refreshIPs() {
        console.log('🔄 STRIPE-IP: Force refreshing IP addresses...');

        return await this.getStripeIPs(true);
    }
}

// Export singleton instance
export const stripeIPManager = new StripeIPManager();
