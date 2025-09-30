/**
 * Admin Models Renderer - Handles models tab functionality
 * Single Responsibility: Manage models tab rendering, data loading, and actions
 */

class AdminModelsRenderer {
    constructor(uiRenderer) {
        this.uiRenderer = uiRenderer;
        this.selectors = {
            modelsTableContainer: '#models-table-container',
            addModelBtn: '#add-model-btn'
        };
    }

    /**
     * Render models tab
     */
    async render() {
        const modelsTab = document.getElementById('models-tab');

        if (!modelsTab) {
            console.error('❌ ADMIN-MODELS: Models tab not found');
            return;
        }

        try {
            modelsTab.innerHTML = `
                <div class="admin-section">
                    <div class="admin-section-header">
                        <div class="admin-header-actions">
                            <button id="add-model-btn" class="admin-add-button" title="Add new model">
                                <i class="fas fa-plus"></i>
                                <span>Add Model</span>
                            </button>
                        </div>
                    </div>
                    <div id="models-table-container" class="table-container">
                        <div class="loading">Loading models...</div>
                    </div>
                </div>
            `;

            // Load models data
            await this.loadData();
            this.setupEventListeners();
        } catch (error) {
            console.error('❌ ADMIN-MODELS: Error rendering models tab:', error);
            modelsTab.innerHTML = `
                <div class="error-message">
                    Failed to load models tab: ${error.message}
                </div>
            `;
        }
    }

    /**
     * Load models data from API
     */
    async loadData() {
        try {
            const response = await fetch('/api/providers/models/all', {
                headers: window.AdminAuthUtils.getAuthHeaders()
            });
            const data = await response.json();

            if (data.success) {
                this.renderTable(data.data.models);
            } else {
                throw new Error(data.error || 'Failed to load models');
            }
        } catch (error) {
            console.error('❌ ADMIN-MODELS: Error loading models:', error);
            const container = document.getElementById('models-table-container');
            if (container) {
                container.innerHTML = `<div class="error-message">Failed to load models: ${error.message}</div>`;
            }
        }
    }

    /**
     * Render models table
     * @param {Array} models - Models data
     */
    renderTable(models) {
        const container = document.getElementById('models-table-container');

        if (!models || models.length === 0) {
            container.innerHTML = '<div class="no-data">No models found</div>';
            return;
        }

        // Transform models data to match shared table format
        const transformedModels = models.map(model => ({
            id: model.id,
            provider: model.provider,
            name: model.name,
            displayName: model.displayName,
            costPerImage: model.costPerImage,
            isActive: model.isActive,
            createdAt: model.createdAt,
            updatedAt: model.updatedAt
        }));

        // Use shared table component with models configuration
        if (this.uiRenderer && this.uiRenderer.sharedTable) {
            this.uiRenderer.sharedTable.render('models', transformedModels, container);
        }
    }

    /**
     * Setup event listeners for models tab
     */
    setupEventListeners() {
        // Add model button
        const addModelBtn = document.getElementById('add-model-btn');
        if (addModelBtn) {
            addModelBtn.addEventListener('click', () => {
                this.showModal();
            });
        }

        // Listen for table action events from shared table
        window.addEventListener('admin-table-action', e => {
            const { dataType, action, id } = e.detail;

            if (dataType === 'models') {
                this.handleAction(action, id);
            }
        });
    }

    /**
     * Handle model actions
     * @param {string} action - Action type
     * @param {string} id - Model ID
     */
    handleAction(action, id) {
        switch (action) {
            case 'view':
                this.showModal(id);
                break;
            case 'edit':
                this.showModal(id);
                break;
            case 'delete':
                this.delete(id);
                break;
            default:
                console.warn(`Unknown model action: ${action}`);
        }
    }

    /**
     * Show model modal (alias for showModal for compatibility)
     * @param {string|null} modelId - Model ID for editing
     */
    async showModelModal(modelId = null) {
        return this.showModal(modelId);
    }

    /**
     * Show provider modal (placeholder - providers are managed separately)
     * @param {string|null} providerId - Provider ID for editing
     */
    async showProviderModal(providerId = null) {
        console.warn('⚠️ ADMIN-MODELS: Provider management is not implemented in this renderer');
        AdminUtils.showNotification('Provider management is not available in the models tab', 'warning');
    }

    /**
     * Show model modal
     * @param {string|null} modelId - Model ID for editing
     */
    async showModal(modelId = null) {
        try {
            let modelData = null;
            const isEdit = !!modelId;

            if (isEdit) {
                // Fetch model data for editing
                const response = await fetch(`/api/providers/models/${modelId}`, {
                    headers: window.AdminAuthUtils.getAuthHeaders()
                });
                const result = await response.json();

                if (result.success) {
                    modelData = result.data;
                } else {
                    throw new Error(result.error || 'Failed to fetch model data');
                }
            }

            this.showModelFormModal(modelData, isEdit);
        } catch (error) {
            console.error('❌ ADMIN-MODELS: Error loading model data:', error);
            AdminUtils.showNotification(`Failed to load model: ${error.message}`, 'error');
        }
    }

    showModelFormModal(modelData = null, isEdit = false) {
        const title = isEdit ? 'Edit Model' : 'Add New Model';
        const formData = modelData || {
            id: '',
            provider: '',
            name: '',
            displayName: '',
            costPerImage: 0.01,
            isActive: true
        };

        const modalHtml = `
            <div class="modal fade" id="modelFormModal" tabindex="-1" role="dialog">
                <div class="modal-dialog modal-lg" role="document">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${title}</h5>
                            <button type="button" class="close" data-dismiss="modal">
                                <span>&times;</span>
                            </button>
                        </div>
                        <div class="modal-body">
                            <form id="modelForm">
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="form-group">
                                            <label for="modelProvider">Provider <span class="text-danger">*</span></label>
                                            <select id="modelProvider" class="form-control" required>
                                                <option value="">Select Provider</option>
                                                <option value="dezgo" ${formData.provider === 'dezgo' ? 'selected' : ''}>Dezgo</option>
                                                <option value="replicate" ${formData.provider === 'replicate' ? 'selected' : ''}>Replicate</option>
                                                <option value="openai" ${formData.provider === 'openai' ? 'selected' : ''}>OpenAI</option>
                                                <option value="stability" ${formData.provider === 'stability' ? 'selected' : ''}>Stability AI</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="form-group">
                                            <label for="modelName">Model Name <span class="text-danger">*</span></label>
                                            <input type="text" id="modelName" class="form-control" value="${formData.name}" required>
                                            <small class="form-text text-muted">Internal model identifier</small>
                                        </div>
                                    </div>
                                </div>

                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="form-group">
                                            <label for="modelDisplayName">Display Name <span class="text-danger">*</span></label>
                                            <input type="text" id="modelDisplayName" class="form-control" value="${formData.displayName}" required>
                                            <small class="form-text text-muted">User-friendly display name</small>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="form-group">
                                            <label for="modelCost">Cost per Image (USD) <span class="text-danger">*</span></label>
                                            <input type="number" id="modelCost" class="form-control" value="${formData.costPerImage}" step="0.001" min="0" required>
                                            <small class="form-text text-muted">Cost in USD per image generation</small>
                                        </div>
                                    </div>
                                </div>

                                <div class="form-group">
                                    <div class="form-check">
                                        <input type="checkbox" id="modelActive" class="form-check-input" ${formData.isActive ? 'checked' : ''}>
                                        <label for="modelActive" class="form-check-label">
                                            Active Model
                                        </label>
                                        <small class="form-text text-muted">Only active models are available for image generation</small>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" id="saveModelBtn">
                                ${isEdit ? 'Update Model' : 'Create Model'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('modelFormModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to DOM
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('modelFormModal'));
        modal.show();

        // Setup form submission handler
        this.setupModelFormHandler(isEdit, modal, formData);

        // Clean up modal when hidden
        document.getElementById('modelFormModal').addEventListener('hidden.bs.modal', () => {
            document.getElementById('modelFormModal').remove();
        });
    }

    setupModelFormHandler(isEdit, modal, modelData) {
        const saveBtn = document.getElementById('saveModelBtn');

        saveBtn.addEventListener('click', async () => {
            const formData = {
                provider: document.getElementById('modelProvider').value,
                name: document.getElementById('modelName').value,
                displayName: document.getElementById('modelDisplayName').value,
                costPerImage: parseFloat(document.getElementById('modelCost').value),
                isActive: document.getElementById('modelActive').checked
            };

            // Validate form data
            if (!formData.provider || !formData.name || !formData.displayName || isNaN(formData.costPerImage)) {
                AdminUtils.showNotification('Please fill in all required fields', 'error');
                return;
            }

            try {
                const url = isEdit ? `/api/providers/models/${modelData.id}` : '/api/providers/models';
                const method = isEdit ? 'PUT' : 'POST';

                const response = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (result.success) {
                    AdminUtils.showNotification(
                        isEdit ? 'Model updated successfully' : 'Model created successfully',
                        'success'
                    );
                    modal.hide();
                    await this.loadData(); // Refresh the table
                } else {
                    throw new Error(result.error || 'Failed to save model');
                }
            } catch (error) {
                console.error('❌ ADMIN-MODELS: Error saving model:', error);
                AdminUtils.showNotification(`Failed to save model: ${error.message}`, 'error');
            }
        });
    }

    /**
     * Delete model
     * @param {string} modelId - Model ID
     */
    async delete(modelId) {
        if (!confirm('Are you sure you want to delete this model? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/api/providers/models/${modelId}`, {
                method: 'DELETE',
                headers: window.AdminAuthUtils.getAuthHeaders()
            });

            if (response.ok) {
                await this.loadData();
                AdminUtils.showNotification('Model deleted successfully', 'success');
            } else {
                const error = await response.json();
                AdminUtils.showNotification(
                    `Failed to delete model: ${error.error || 'Unknown error'}`,
                    'error'
                );
            }
        } catch (error) {
            console.error('❌ ADMIN-MODELS: Error deleting model:', error);
            AdminUtils.showNotification(`Failed to delete model: ${error.message}`, 'error');
        }
    }

    /**
     * Refresh models data
     */
    async refresh() {
        await this.loadData();
    }

    /**
     * Destroy renderer and cleanup
     */
    destroy() {
        // Remove event listeners
        window.removeEventListener('admin-table-action', this.handleAction);
        console.log('🗑️ ADMIN-MODELS: Models renderer destroyed');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminModelsRenderer;
} else {
    window.AdminModelsRenderer = AdminModelsRenderer;
}
