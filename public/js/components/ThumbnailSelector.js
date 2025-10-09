/**
 * Unified Thumbnail Selector Component
 * Consolidates Upload, Existing, and AI Generate methods into one streamlined interface
 */
class ThumbnailSelector {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            placeholder: 'Describe the thumbnail image for your blog post...',
            maxLength: 500,
            showCost: true,
            allowRetry: true,
            theme: 'compact',
            onThumbnailSelected: null,
            onError: null,
            ...options
        };

        this.thumbnailUrl = null;
        this.selectedMethod = null;
        this.aiGenerator = null;
        this.isInitialized = false;

        this.init();
    }

    init() {
        this.createInterface();
        this.setupEventListeners();
        this.isInitialized = true;
    }

    createInterface() {
        this.container.innerHTML = `
            <div class="thumbnail-selector">
                <!-- Tab Navigation -->
                <div class="method-tabs mb-4">
                    <div class="flex space-x-2">
                        <button type="button" id="upload-tab" class="tab-btn active px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                            <i class="fas fa-upload mr-2"></i>Upload
                        </button>
                        <button type="button" id="existing-tab" class="tab-btn px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
                            <i class="fas fa-images mr-2"></i>Use Existing
                        </button>
                        <button type="button" id="ai-tab" class="tab-btn px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
                            <i class="fas fa-magic mr-2"></i>AI Generate
                        </button>
                    </div>
                </div>

                <!-- Upload Method -->
                <div id="upload-method" class="method-content">
                    <div class="upload-area border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                        <i class="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-4"></i>
                        <p class="text-gray-300 mb-2">Drag & drop your thumbnail here</p>
                        <p class="text-sm text-gray-500 mb-4">or</p>
                        <button type="button" class="upload-btn px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                            Choose File
                        </button>
                        <input type="file" id="thumbnail-file-input" class="hidden" accept="image/*">
                        <p class="text-xs text-gray-400 mt-2">PNG, JPG, GIF up to 5MB</p>
                    </div>
                </div>

                <!-- Existing Images Method -->
                <div id="existing-method" class="method-content hidden">
                    <div class="existing-images-container">
                        <div class="text-center py-4">
                            <i class="fas fa-spinner fa-spin text-2xl text-gray-400 mb-2"></i>
                            <p class="text-gray-300">Loading your images...</p>
                        </div>
                    </div>
                </div>

                <!-- AI Generate Method -->
                <div id="ai-method" class="method-content hidden">
                    <div class="ai-generator-container">
                        <div class="text-center py-4">
                            <i class="fas fa-spinner fa-spin text-2xl text-gray-400 mb-2"></i>
                            <p class="text-gray-300">Initializing AI generator...</p>
                        </div>
                    </div>
                </div>

                <!-- Selected Thumbnail Preview -->
                <div id="thumbnail-preview" class="hidden mt-4">
                    <div class="preview-container border border-gray-600 rounded-lg p-4">
                        <div class="flex items-center space-x-4">
                            <img id="preview-image" class="w-16 h-16 object-cover rounded-lg" alt="Thumbnail preview">
                            <div class="flex-1">
                                <p class="text-sm text-gray-300">Selected thumbnail</p>
                                <p class="text-xs text-gray-500" id="preview-method"></p>
                            </div>
                            <div class="flex space-x-2">
                                <button type="button" id="change-thumbnail" class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors">
                                    Change
                                </button>
                                <button type="button" id="remove-thumbnail" class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors">
                                    Remove
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Status Messages -->
                <div id="status-message" class="hidden mt-4 p-3 rounded-lg text-sm"></div>
            </div>
        `;
    }

    setupEventListeners() {
        // Tab navigation
        document.getElementById('upload-tab')?.addEventListener('click', () => this.showMethod('upload'));
        document.getElementById('existing-tab')?.addEventListener('click', () => this.showMethod('existing'));
        document.getElementById('ai-tab')?.addEventListener('click', () => this.showMethod('ai'));

        // Upload functionality
        const uploadArea = this.container.querySelector('.upload-area');
        const fileInput = document.getElementById('thumbnail-file-input');
        const uploadBtn = this.container.querySelector('.upload-btn');

        uploadBtn?.addEventListener('click', () => fileInput.click());
        fileInput?.addEventListener('change', e => this.handleFileUpload(e));

        // Drag and drop
        uploadArea?.addEventListener('dragover', e => {
            e.preventDefault();
            uploadArea.classList.add('border-blue-500');
        });

        uploadArea?.addEventListener('dragleave', () => {
            uploadArea.classList.remove('border-blue-500');
        });

        uploadArea?.addEventListener('drop', e => {
            e.preventDefault();
            uploadArea.classList.remove('border-blue-500');
            const { files } = e.dataTransfer;

            if (files.length > 0) {
                this.handleFile(files[0]);
            }
        });

        // Preview actions
        document.getElementById('change-thumbnail')?.addEventListener('click', () => this.showMethodSelector());
        document.getElementById('remove-thumbnail')?.addEventListener('click', () => this.removeThumbnail());

        // Initialize upload method by default
        this.initializeUpload();
    }

    showMethod(method) {
        // Hide all method contents
        this.container.querySelectorAll('.method-content').forEach(content => {
            content.classList.add('hidden');
        });

        // Remove active class from all tabs
        this.container.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Show selected method
        const methodContent = document.getElementById(`${method}-method`);
        const methodTab = document.getElementById(`${method}-tab`);

        if (methodContent) {
            methodContent.classList.remove('hidden');
        }

        if (methodTab) {
            methodTab.classList.add('active');
        }

        this.selectedMethod = method;

        // Initialize method-specific functionality
        switch (method) {
            case 'upload':
                this.initializeUpload();
                break;
            case 'existing':
                this.initializeExisting();
                break;
            case 'ai':
                this.initializeAI();
                break;
        }
    }

    initializeUpload() {
        // Upload method is ready by default
    }

    async initializeExisting() {
        const container = this.container.querySelector('.existing-images-container');

        if (!container) { return; }

        try {
            this.showStatus('Loading your images...', 'info');
            const images = await this.loadExistingImages();

            this.displayExistingImages(images, container);
        } catch (error) {
            console.error('Failed to load existing images:', error);
            this.showStatus('Failed to load existing images', 'error');
            container.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-exclamation-triangle text-4xl text-red-400 mb-4"></i>
                    <p class="text-gray-300">Failed to load images</p>
                    <button type="button" class="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors" onclick="this.closest('.thumbnail-selector').querySelector('#existing-tab').click()">
                        Try Again
                    </button>
                </div>
            `;
        }
    }

    async initializeAI() {
        const container = this.container.querySelector('.ai-generator-container');

        if (!container) { return; }

        try {
            // Wait for AI generator to be available
            while (!window.AIImageGenerator) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            // Create AI generator container
            const aiContainer = document.createElement('div');
            const containerId = `ai-generator-${Date.now()}`;

            aiContainer.id = containerId;
            container.innerHTML = '';
            container.appendChild(aiContainer);

            // Create AI generator
            this.aiGenerator = new AIImageGenerator(containerId, {
                placeholder: this.options.placeholder,
                theme: this.options.theme,
                showCost: this.options.showCost,
                onUseImage: imageData => this.handleThumbnailSelection(imageData, 'AI Generated')
            });

        } catch (error) {
            console.error('Failed to initialize AI generator:', error);
            container.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-exclamation-triangle text-4xl text-red-400 mb-4"></i>
                    <p class="text-gray-300">Failed to initialize AI generator</p>
                    <button type="button" class="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors" onclick="this.closest('.thumbnail-selector').querySelector('#ai-tab').click()">
                        Try Again
                    </button>
                </div>
            `;
        }
    }

    async loadExistingImages() {
        const response = await fetch('/api/profile/user-images?limit=20&page=1', {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        const result = await response.json();

        if (response.ok && result.success) {
            return result.data?.images || result.images || [];
        } else {
            throw new Error(result.message || 'Failed to load images');
        }
    }

    displayExistingImages(images, container) {
        if (images.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-images text-4xl text-gray-400 mb-4"></i>
                    <p class="text-gray-300">No images found</p>
                    <p class="text-sm text-gray-500">Upload some images first to use them as thumbnails</p>
                </div>
            `;

            return;
        }

        const imagesGrid = images.map(image => `
            <div class="existing-image-item cursor-pointer rounded-lg overflow-hidden border-2 border-gray-600 hover:border-blue-500 transition-colors"
                 data-image-url="${image.url}">
                <img src="${image.url}"
                     alt="Generated image"
                     class="w-full h-32 object-cover">
                <div class="p-2 bg-gray-700">
                    <p class="text-xs text-gray-300 truncate">${image.prompt?.substring(0, 30) || 'Generated image'}...</p>
                </div>
            </div>
        `).join('');

        container.innerHTML = `
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                ${imagesGrid}
            </div>
        `;

        // Add click listeners to images
        container.querySelectorAll('.existing-image-item').forEach(item => {
            item.addEventListener('click', () => {
                const { imageUrl } = item.dataset;

                this.handleThumbnailSelection({ url: imageUrl }, 'Existing Image');
            });
        });
    }

    handleFileUpload(event) {
        const file = event.target.files[0];

        if (file) {
            this.handleFile(file);
        }
    }

    async handleFile(file) {
        if (!file.type.startsWith('image/')) {
            this.showStatus('Only image files are allowed.', 'error');

            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            this.showStatus('File size must be less than 5MB.', 'error');

            return;
        }

        this.showStatus('Uploading thumbnail...', 'info');

        try {
            const reader = new FileReader();

            reader.onload = async e => {
                const fileData = e.target.result;
                const thumbnailUrl = await this.uploadThumbnail(fileData, file.name, file.type);

                this.handleThumbnailSelection({ url: thumbnailUrl }, 'Uploaded Image');
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('Error handling file upload:', error);
            this.showStatus('Failed to upload thumbnail.', 'error');
        }
    }

    async uploadThumbnail(fileData, filename, mimeType) {
        const response = await fetch('/api/profile/upload-avatar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({
                fileData,
                filename,
                mimeType
            })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            return result.data.avatarUrl;
        } else {
            throw new Error(result.message || 'Upload failed');
        }
    }

    handleThumbnailSelection(imageData, method) {
        this.thumbnailUrl = imageData.url;
        this.showPreview(imageData.url, method);
        this.updateHiddenInput();
        this.showStatus('Thumbnail selected successfully!', 'success');

        // Call callback if provided
        if (this.options.onThumbnailSelected) {
            this.options.onThumbnailSelected(imageData);
        }
    }

    showPreview(imageUrl, method) {
        const preview = document.getElementById('thumbnail-preview');
        const previewImage = document.getElementById('preview-image');
        const previewMethod = document.getElementById('preview-method');

        if (previewImage) {
            previewImage.src = imageUrl;
        }

        if (previewMethod) {
            previewMethod.textContent = method;
        }

        if (preview) {
            preview.classList.remove('hidden');
        }

        // Hide tabs and method content when thumbnail is selected
        this.container.querySelector('.method-tabs').classList.add('hidden');
        this.container.querySelectorAll('.method-content').forEach(content => {
            content.classList.add('hidden');
        });
    }

    showMethodSelector() {
        // Show tabs and method content again
        this.container.querySelector('.method-tabs').classList.remove('hidden');
        this.showMethod(this.selectedMethod || 'upload');

        // Hide preview
        document.getElementById('thumbnail-preview')?.classList.add('hidden');
    }

    removeThumbnail() {
        this.thumbnailUrl = null;
        this.updateHiddenInput();

        // Hide preview
        document.getElementById('thumbnail-preview')?.classList.add('hidden');

        // Show method selector
        this.showMethodSelector();

        this.showStatus('Thumbnail removed', 'info');
    }

    updateHiddenInput() {
        const hiddenInput = document.getElementById('thumbnail');

        if (hiddenInput) {
            hiddenInput.value = this.thumbnailUrl || '';
        }
    }

    showStatus(message, type) {
        const statusEl = document.getElementById('status-message');

        if (!statusEl) { return; }

        statusEl.textContent = message;
        statusEl.className = `mt-4 p-3 rounded-lg text-sm ${
            type === 'error'
                ? 'bg-red-900 text-red-200' :
                type === 'success'
                    ? 'bg-green-900 text-green-200' :
                    type === 'info'
                        ? 'bg-blue-900 text-blue-200' :
                        'bg-gray-800 text-gray-200'
        }`;
        statusEl.classList.remove('hidden');

        // Auto-hide after 3 seconds for non-error messages
        if (type !== 'error') {
            setTimeout(() => {
                statusEl.classList.add('hidden');
            }, 3000);
        }
    }

    getThumbnailUrl() {
        return this.thumbnailUrl;
    }
}

// Make it globally available
window.ThumbnailSelector = ThumbnailSelector;
