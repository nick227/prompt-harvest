/**
 * Credential Validator
 *
 * Centralized credential validation for all providers
 */

/**
 * Centralized credential validation
 * @param {string} providerType - Provider type (openai, dezgo, google, grok)
 * @throws {Error} If credentials are missing
 */
export const assertCredentials = providerType => {
    const checks = {
        openai: () => {
            if (!process.env.OPENAI_API_KEY) {
                throw new Error('OpenAI API key not configured');
            }
        },
        dezgo: () => {
            if (!process.env.DEZGO_API_KEY) {
                throw new Error('Dezgo API key not configured');
            }
        },
        google: () => {
            if (!process.env.GOOGLE_CLOUD_PROJECT_ID) {
                throw new Error('GOOGLE_CLOUD_PROJECT_ID not configured');
            }
            if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.GOOGLE_CLOUD_API_KEY) {
                throw new Error('Google Cloud credentials not configured');
            }
        },
        grok: () => {
            if (!process.env.GROK_API_KEY) {
                throw new Error('Grok API key not configured');
            }
        }
    };

    const check = checks[providerType];

    if (!check) {
        throw new Error(`Unknown provider type: ${providerType}`);
    }

    check();
};

export default {
    assertCredentials
};

