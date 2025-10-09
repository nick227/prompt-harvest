/**
 * MediaSelector - Reusable component for selecting media (images/videos)
 * Supports upload, existing images, and AI generation
 * Can be used for thumbnails, content images, or any media selection
 */
class MediaSelector {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);

        // Check if already initialized
        if (this.container && this.container.dataset.mediaSelectorInitialized === 'true') {
            console.warn('🔍 MEDIA-SELECTOR: Already initialized, skipping...');

            return;
        }

        this.options = {
            type: 'image', // 'image' or 'video'
            purpose: 'thumbnail', // 'thumbnail', 'content', 'avatar', etc.
            multiple: false, // Allow multiple selection
            maxSize: 5 * 1024 * 1024, // 5MB default
            acceptedTypes: 'image/*', // MIME types
            apiEndpoint: '/api/profile/user-images', // API endpoint for existing media
            uploadEndpoint: '/api/profile/upload-avatar', // API endpoint for uploads
            onMediaSelected: null, // Callback when media is selected
            onError: null, // Callback for errors
            style: 'default', // 'default', 'compact', 'inline'
            ...options
        };

        this.selectedMedia = null;
        this.isInitialized = false;

        if (!this.container) {
            console.error('MediaSelector: Container not found:', containerId);

            return;
        }

        this.init();
    }

    async init() {
        try {
            this.createInterface();
            this.setupEventListeners();
            this.isInitialized = true;

            // Mark as initialized to prevent duplicates
            this.container.dataset.mediaSelectorInitialized = 'true';


            // Debug CSS and visibility
            setTimeout(() => {
                const tabs = this.container.querySelector('.method-tabs');
                const uploadMethod = this.container.querySelector('#upload-method');
                const existingMethod = this.container.querySelector('#existing-method');
                const aiMethod = this.container.querySelector('#ai-method');

                console.log('🔍 MEDIA-SELECTOR: CSS Debug:', {
                    tabsVisible: tabs ? getComputedStyle(tabs).display !== 'none' : false,
                    uploadVisible: uploadMethod ? getComputedStyle(uploadMethod).display !== 'none' : false,
                    existingVisible: existingMethod ? getComputedStyle(existingMethod).display !== 'none' : false,
                    aiVisible: aiMethod ? getComputedStyle(aiMethod).display !== 'none' : false,
                    tabsClasses: tabs ? tabs.className : 'not found',
                    uploadClasses: uploadMethod ? uploadMethod.className : 'not found'
                });
            }, 100);
        } catch (error) {
            console.error('MediaSelector initialization failed:', error);
        }
    }

    createInterface() {
        const uploadText = this.options.multiple ? 'Drag & drop your files here' : 'Drag & drop your file here';
        const chooseText = this.options.multiple ? 'Choose Files' : 'Choose File';
        const sizeText = `${Math.round(this.options.maxSize / (1024 * 1024))}MB`;


        // Different styles for different purposes
        const isContentStyle = this.options.purpose === 'content';
        const containerClass = isContentStyle ? 'media-selector-compact' : 'media-selector';
        const tabClass = isContentStyle ? 'method-tabs-compact' : 'method-tabs mb-4';
        const buttonClass = isContentStyle ? 'tab-btn-compact' : 'tab-btn';

        this.container.innerHTML = `
            <div class="${containerClass}">
                <!-- Tab Navigation -->
                <div class="${tabClass}" style="display: block !important;">
                    <div class="flex space-x-2">
                        <button type="button" id="upload-tab" class="${buttonClass} active px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                            <i class="fas fa-upload mr-2"></i>Upload
                        </button>
                        <button type="button" id="existing-tab" class="${buttonClass} px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
                            <i class="fas fa-images mr-2"></i>Use Existing
                        </button>
                        <button type="button" id="ai-tab" class="${buttonClass} px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
                            <i class="fas fa-magic mr-2"></i>AI Generate
                        </button>
                    </div>
                </div>

                <!-- Upload Method -->
                <div id="upload-method" class="method-content" style="display: block !important;">
                    <div class="upload-area border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                        <i class="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-4"></i>
                        <p class="text-gray-300 mb-2">${uploadText}</p>
                        <p class="text-sm text-gray-500 mb-4">or</p>
                        <button type="button" class="upload-btn px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                            ${chooseText}
                        </button>
                        <input type="file" id="media-file-input" class="hidden" accept="${this.options.acceptedTypes}" ${this.options.multiple ? 'multiple' : ''}>
                        <p class="text-xs text-gray-400 mt-2">${this.getFileTypeText()} up to ${sizeText}</p>
                    </div>
                </div>

                <!-- Existing Images Method -->
                <div id="existing-method" class="method-content hidden" style="display: none !important;">
                    <div class="existing-media-container">
                        <div class="text-center py-4">
                            <i class="fas fa-spinner fa-spin text-2xl text-gray-400 mb-2"></i>
                            <p class="text-gray-300">Loading your ${this.options.type}s...</p>
                        </div>
                    </div>
                </div>

                <!-- AI Generate Method -->
                <div id="ai-method" class="method-content hidden" style="display: none !important;">
                    <div class="ai-generator-container">
                        <div class="text-center py-4">
                            <i class="fas fa-spinner fa-spin text-2xl text-gray-400 mb-2"></i>
                            <p class="text-gray-300">Initializing AI generator...</p>
                        </div>
                    </div>
                </div>

                <!-- Selected Media Preview -->
                <div id="media-preview" class="hidden mt-4">
                    <div class="preview-container border border-gray-600 rounded-lg p-4">
                        <div class="flex items-center space-x-4">
                            <div class="preview-media">
                                <img id="preview-image" src="" alt="Selected media" class="w-16 h-16 object-cover rounded-lg">
                            </div>
                            <div class="flex-1">
                                <p class="text-white font-medium">Selected: <span id="preview-method"></span></p>
                                <p class="text-gray-400 text-sm" id="preview-url"></p>
                            </div>
                            <div class="flex space-x-2">
                                <button type="button" id="change-media" class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors">
                                    Change
                                </button>
                                <button type="button" id="remove-media" class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors">
                                    Remove
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Status Message -->
                <div id="status-message" class="hidden mt-4 p-3 rounded-lg text-sm"></div>
            </div>
        `;

    }

    getFileTypeText() {
        if (this.options.type === 'video') {
            return 'MP4, MOV, AVI';
        }

        return 'PNG, JPG, GIF';
    }

    setupEventListeners() {
        // Tab navigation
        document.getElementById('upload-tab')?.addEventListener('click', () => this.showMethod('upload'));
        document.getElementById('existing-tab')?.addEventListener('click', () => this.showMethod('existing'));
        document.getElementById('ai-tab')?.addEventListener('click', () => this.showMethod('ai'));

        // Upload functionality
        const uploadArea = this.container.querySelector('.upload-area');
        const fileInput = document.getElementById('media-file-input');
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
                if (this.options.multiple) {
                    this.handleFiles(files);
                } else {
                    this.handleFile(files[0]);
                }
            }
        });

        // Preview actions
        document.getElementById('change-media')?.addEventListener('click', () => this.showMethodSelector());
        document.getElementById('remove-media')?.addEventListener('click', () => this.removeMedia());

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
    }

    async initializeExisting() {
        try {
            const container = this.container.querySelector('.existing-media-container');
            const images = await this.loadExistingMedia();

            this.displayExistingMedia(images, container);
        } catch (error) {
            console.error('Failed to load existing media:', error);
            this.showStatus('Failed to load existing media', 'error');
        }
    }

    async initializeAI() {
        try {
            const container = this.container.querySelector('.ai-generator-container');

            if (this.options.type === 'image' && window.AIImageGenerator) {
                const aiGenerator = new window.AIImageGenerator(container, {
                    onImageGenerated: imageData => {
                        this.handleMediaSelection(imageData, 'AI Generated');
                    }
                });

            } else {
                container.innerHTML = `
                    <div class="text-center py-8">
                        <i class="fas fa-exclamation-triangle text-4xl text-yellow-400 mb-4"></i>
                        <p class="text-gray-300">AI generation not available for ${this.options.type}s</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Failed to initialize AI generator:', error);
            this.showStatus('Failed to initialize AI generator', 'error');
        }
    }

    async loadExistingMedia() {
        const response = await fetch(`${this.options.apiEndpoint}?limit=20&page=1&type=${this.options.type}`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('authToken')}`
            }
        });

        const result = await response.json();

        if (response.ok && result.success) {
            return result.data?.images || result.images || [];
        } else {
            throw new Error(result.message || 'Failed to load media');
        }
    }

    displayExistingMedia(mediaList, container) {
        if (mediaList.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-images text-4xl text-gray-400 mb-4"></i>
                    <p class="text-gray-300">No ${this.options.type}s found</p>
                </div>
            `;

            return;
        }

        const gridClass = this.options.multiple ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4' : 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4';

        container.innerHTML = `
            <div class="${gridClass}">
                ${mediaList.map(media => `
                    <div class="media-item cursor-pointer border border-gray-600 rounded-lg overflow-hidden hover:border-blue-500 transition-colors"
                         data-url="${media.url}" data-id="${media.id}">
                        <img src="${media.url}" alt="${media.filename}" class="w-full h-24 object-cover">
                        <div class="p-2 bg-gray-800">
                            <p class="text-xs text-gray-300 truncate">${media.filename}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        // Add click handlers
        container.querySelectorAll('.media-item').forEach(item => {
            item.addEventListener('click', () => {
                const { url } = item.dataset;
                const { id } = item.dataset;

                this.handleMediaSelection({ url, id }, 'Existing Media');
            });
        });
    }

    handleFileUpload(event) {
        const files = Array.from(event.target.files);

        if (this.options.multiple) {
            this.handleFiles(files);
        } else {
            this.handleFile(files[0]);
        }
    }

    handleFiles(files) {
        // For multiple files, handle each one
        files.forEach(file => this.handleFile(file));
    }

    handleFile(file) {
        if (!this.validateFile(file)) {
            return;
        }

        try {
            const reader = new FileReader();

            reader.onload = async e => {
                const fileData = e.target.result;
                const mediaUrl = await this.uploadMedia(fileData, file.name, file.type);

                this.handleMediaSelection({ url: mediaUrl }, 'Uploaded File');
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('Error handling file upload:', error);
            this.showStatus('Failed to upload file', 'error');
        }
    }

    validateFile(file) {
        if (file.size > this.options.maxSize) {
            this.showStatus(`File too large. Maximum size: ${Math.round(this.options.maxSize / (1024 * 1024))}MB`, 'error');

            return false;
        }

        // Convert MIME type pattern to regex
        const mimePattern = this.options.acceptedTypes.replace(/\*/g, '.*');

        if (!file.type.match(mimePattern)) {
            this.showStatus(`Invalid file type. Accepted: ${this.options.acceptedTypes}`, 'error');

            return false;
        }

        return true;
    }

    async uploadMedia(fileData, filename, mimeType) {
        const response = await fetch(this.options.uploadEndpoint, {
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

    handleMediaSelection(mediaData, method) {
        this.selectedMedia = mediaData;
        this.showPreview(mediaData.url, method);
        this.updateHiddenInput();
        this.showStatus('Media selected successfully!', 'success');

        // Call callback if provided
        if (this.options.onMediaSelected) {
            this.options.onMediaSelected(mediaData);
        }
    }

    showPreview(mediaUrl, method) {
        const preview = document.getElementById('media-preview');
        const previewImage = document.getElementById('preview-image');
        const previewMethod = document.getElementById('preview-method');
        const previewUrl = document.getElementById('preview-url');

        if (previewImage) {
            previewImage.src = mediaUrl;
        }

        if (previewMethod) {
            previewMethod.textContent = method;
        }

        if (previewUrl) {
            previewUrl.textContent = mediaUrl;
        }

        if (preview) {
            preview.classList.remove('hidden');
        }

        // Hide tabs and method content when media is selected
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
        document.getElementById('media-preview')?.classList.add('hidden');
    }

    removeMedia() {
        this.selectedMedia = null;
        this.updateHiddenInput();

        // Hide preview
        document.getElementById('media-preview')?.classList.add('hidden');

        // Show method selector
        this.showMethodSelector();

        this.showStatus('Media removed', 'info');
    }

    updateHiddenInput() {
        const hiddenInput = document.getElementById(this.options.purpose);

        if (hiddenInput) {
            hiddenInput.value = this.selectedMedia?.url || '';
        }
    }

    showStatus(message, type) {
        const statusEl = document.getElementById('status-message');

        if (!statusEl) { return; }

        statusEl.textContent = message;
        statusEl.className = `mt-4 p-3 rounded-lg text-sm ${
            type === 'success'
                ? 'bg-green-600 text-white' :
                type === 'error'
                    ? 'bg-red-600 text-white' :
                    type === 'info'
                        ? 'bg-blue-600 text-white' :
                        'bg-gray-600 text-white'
        }`;
        statusEl.classList.remove('hidden');

        // Auto-hide after 3 seconds
        setTimeout(() => {
            statusEl.classList.add('hidden');
        }, 3000);
    }

    // Public API methods
    getSelectedMedia() {
        return this.selectedMedia;
    }

    setSelectedMedia(mediaData) {
        this.selectedMedia = mediaData;
        if (mediaData) {
            this.showPreview(mediaData.url, 'Pre-selected');
        }
    }

    reset() {
        this.selectedMedia = null;
        this.updateHiddenInput();
        this.showMethodSelector();
    }

    // Cleanup method for memory management
    destroy() {
        // Remove event listeners
        const uploadArea = this.container.querySelector('.upload-area');
        const fileInput = document.getElementById('media-file-input');
        const uploadBtn = this.container.querySelector('.upload-btn');

        if (uploadArea) {
            uploadArea.removeEventListener('dragover', this.handleDragOver);
            uploadArea.removeEventListener('dragleave', this.handleDragLeave);
            uploadArea.removeEventListener('drop', this.handleDrop);
        }

        if (fileInput) {
            fileInput.removeEventListener('change', this.handleFileUpload);
        }

        if (uploadBtn) {
            uploadBtn.removeEventListener('click', this.handleUploadClick);
        }

        // Clear container
        this.container.innerHTML = '';
        this.isInitialized = false;
    }
}

// Make it globally available
window.MediaSelector = MediaSelector;
