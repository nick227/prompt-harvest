/**
 * Image Generation API Handler
 * Extracted from images.js - handles API communication for image generation
 */

class ImageGenerationAPI {
    constructor() {
        this.isGenerating = false;
    }

    async generateImage(prompt, providers = []) {
        console.log('🚀 API CALL: generateImage started', { prompt, providers });

        if (this.isGenerating) {
            console.warn('⚠️ Generation already in progress');

            return;
        }

        const promptObj = {
            prompt,
            promptId: Date.now().toString(),
            original: prompt
        };

        console.log('🔧 API CALL: promptObj created', promptObj);

        try {
            this.isGenerating = true;
            console.log('🌐 API CALL: Calling backend API...');
            const resultData = await this.callImageGenerationAPI(prompt, promptObj, providers);

            console.log('✅ API RESPONSE: Received data', resultData);

            // Extract the actual image data from the response
            const imageData = resultData.data || resultData;

            console.log('✅ API RESPONSE: Extracted image data', imageData);

            return imageData;
        } catch (error) {
            console.error('❌ API ERROR: Generation failed', error);
            throw error;
        } finally {
            this.isGenerating = false;
        }
    }

    async callImageGenerationAPI(prompt, promptObj, providers) {
        const formData = this.createFormData(prompt, promptObj, providers);
        const jsonData = this.convertFormDataToJSON(formData);

        console.log('📤 HTTP REQUEST: Sending to', API_ENDPOINTS.IMAGE_GENERATE);
        console.log('📤 HTTP PAYLOAD:', jsonData);

        // Get auth headers for authenticated request
        const authHeaders = this.getAuthHeaders();

        console.log('🔑 AUTH: Request headers', authHeaders);

        const response = await fetch(API_ENDPOINTS.IMAGE_GENERATE, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify(jsonData)
        });

        console.log('📥 HTTP RESPONSE: Status', response.status, response.statusText);

        if (!response.ok) {
            console.error('❌ HTTP ERROR: Bad response', response.status, response.statusText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseData = await response.json();

        console.log('📥 HTTP RESPONSE: Data', responseData);
        console.log('📥 HTTP RESPONSE: Data.data structure', responseData.data);

        return responseData;
    }

    createFormData(prompt, promptObj, providers) {
        console.log('📋 FORM DATA: Creating form data for API call');
        const formData = new FormData();

        formData.append('prompt', prompt);
        formData.append('providers', providers.join(','));
        formData.append('promptId', promptObj.promptId);
        formData.append('original', prompt);

        this.addGuidanceValues(formData);
        this.addEnhancementParameters(formData);

        return formData;
    }

    addEnhancementParameters(formData) {
        // Get multiplier value
        const multiplierInput = document.querySelector('#multiplier');

        if (multiplierInput && multiplierInput.value.trim()) {
            console.log('📋 ENHANCEMENT: Adding multiplier:', multiplierInput.value);
            formData.append('multiplier', multiplierInput.value.trim());
        }

        // Get mixup checkbox
        const mixupCheckbox = document.querySelector('input[name="mixup"]');

        if (mixupCheckbox && mixupCheckbox.checked) {
            console.log('📋 ENHANCEMENT: Adding mixup: true');
            formData.append('mixup', 'true');
        }

        // Get mashup checkbox
        const mashupCheckbox = document.querySelector('input[name="mashup"]');

        if (mashupCheckbox && mashupCheckbox.checked) {
            console.log('📋 ENHANCEMENT: Adding mashup: true');
            formData.append('mashup', 'true');
        }

        // Get auto-enhance checkbox
        const autoEnhanceCheckbox = document.querySelector('input[name="auto-enhance"]');

        if (autoEnhanceCheckbox && autoEnhanceCheckbox.checked) {
            console.log('📋 ENHANCEMENT: Adding auto-enhance: true');
            formData.append('auto-enhance', 'true');
        }

        console.log('📋 ENHANCEMENT: Enhancement parameters processed');
    }

    addGuidanceValues(formData) {
        const guidanceTop = document.querySelector('select[name="guidance-top"]');
        const guidanceBottom = document.querySelector('select[name="guidance-bottom"]');

        if (guidanceTop && guidanceTop.value) {
            formData.append('guidance', guidanceTop.value);
        }
        if (guidanceBottom && guidanceBottom.value) {
            formData.append('guidance', guidanceBottom.value);
        }
    }

    convertFormDataToJSON(formData) {
        const jsonData = {};

        for (const [key, value] of formData.entries()) {
            // Convert data types to match backend expectations
            switch (key) {
                case 'guidance':
                    jsonData[key] = parseInt(value) || 10;
                    break;
                case 'multiplier':
                    jsonData[key] = value || '';
                    break;
                case 'mixup':
                case 'mashup':
                    jsonData[key] = value === 'true' || value === true;
                    break;
                case 'providers':
                    // Ensure providers is always an array
                    jsonData[key] = Array.isArray(value) ? value : value.split(',').map(p => p.trim());
                    break;
                default:
                    jsonData[key] = value;
            }
        }

        console.log('🔧 CONVERSION: FormData converted to JSON:', jsonData);

        return jsonData;
    }

    getCustomVariables() {
        const variablesString = localStorage.getItem('variables');

        if (!variablesString) {
            return [];
        }

        const variablesArr = JSON.parse(variablesString);
        const variables = variablesArr.map(variable => {
            const values = variable.values.split(',').map(v => v.trim());
            const randomValue = values[Math.floor(Math.random() * values.length)];

            return { name: variable.name, value: randomValue };
        });

        return variables;
    }

    getAuthHeaders() {
        const headers = { 'Content-Type': 'application/json' };

        // Use existing userApi for authentication if available
        if (window.userApi && window.userApi.isAuthenticated()) {
            const token = window.userApi.getAuthToken();

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
                console.log('🔑 AUTH: Using userApi token');
            } else {
                console.log('⚠️ AUTH: userApi authenticated but no token found');
            }
        } else {
            console.log('⚠️ AUTH: userApi not available or not authenticated');
            console.log('🔍 AUTH DEBUG: userApi exists:', !!window.userApi);
            if (window.userApi) {
                console.log('🔍 AUTH DEBUG: userApi.isAuthenticated():', window.userApi.isAuthenticated());
            }
        }

        return headers;
    }

    getAuthToken() {
        const localToken = localStorage.getItem('authToken');
        const sessionToken = sessionStorage.getItem('authToken');

        console.log('🔍 AUTH DEBUG: localStorage authToken:', localToken ? 'EXISTS' : 'NOT FOUND');
        console.log('🔍 AUTH DEBUG: sessionStorage authToken:', sessionToken ? 'EXISTS' : 'NOT FOUND');

        // Check all possible token storage keys
        const allKeys = Object.keys(localStorage);

        console.log('🔍 AUTH DEBUG: All localStorage keys:', allKeys);

        return localToken || sessionToken;
    }
}

// Export for global access
window.ImageGenerationAPI = ImageGenerationAPI;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImageGenerationAPI;
}
