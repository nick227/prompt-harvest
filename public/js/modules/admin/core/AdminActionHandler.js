/**
 * Admin Action Handler - Centralized action handling for admin dashboard
 * Single Responsibility: Handle all admin actions in one place
 *
 * This replaces the scattered event handling across:
 * - AdminPackageManager
 * - AdminUserManager
 * - AdminPromoManager
 * - AdminEventHandler
 * - admin-dashboard-manager.js
 */

class AdminActionHandler {
    constructor() {
        this.eventBus = window.AdminEventBus;
        this.modalManager = null;
        this.apiService = null;

        this.setupEventListeners();
    }

    /**
     * Initialize with required dependencies
     * @param {Object} modalManager - Modal manager instance
     * @param {Object} apiService - API service instance
     */
    init(modalManager, apiService) {
        this.modalManager = modalManager;
        this.apiService = apiService;
    }

    /**
     * Setup centralized event listeners
     */
    setupEventListeners() {
        // Table actions (CRUD operations)
        this.eventBus.on('table', 'create', data => this.handleCreate(data));
        this.eventBus.on('table', 'edit', data => this.handleEdit(data));
        this.eventBus.on('table', 'delete', data => this.handleDelete(data));
        this.eventBus.on('table', 'view', data => this.handleView(data));

        // Modal actions
        this.eventBus.on('modal', 'open', data => this.handleModalOpen(data));
        this.eventBus.on('modal', 'close', data => this.handleModalClose(data));

        // API actions
        this.eventBus.on('api', 'success', data => this.handleApiSuccess(data));
        this.eventBus.on('api', 'error', data => this.handleApiError(data));

        // Form actions
        this.eventBus.on('form', 'submit', data => this.handleFormSubmit(data));

    }

    /**
     * Handle create actions
     * @param {Object} data - Action data
     */
    handleCreate(data) {
        const { entity, formData } = data;


        // Show create modal
        this.showCreateModal(entity, formData);
    }

    /**
     * Handle edit actions
     * @param {Object} data - Action data
     */
    handleEdit(data) {
        const { entity, id, itemData } = data;


        // Show edit modal
        this.showEditModal(entity, id, itemData);
    }

    /**
     * Handle delete actions
     * @param {Object} data - Action data
     */
    handleDelete(data) {
        const { entity, id, itemData } = data;


        // Show delete confirmation
        this.showDeleteConfirmation(entity, id, itemData);
    }

    /**
     * Handle view actions
     * @param {Object} data - Action data
     */
    handleView(data) {
        const { entity, id, itemData } = data;


        // Show view modal
        this.showViewModal(entity, id, itemData);
    }

    /**
     * Show create modal for an entity
     * @param {string} entity - Entity type (packages, users, etc.)
     * @param {Object} formData - Initial form data
     */
    showCreateModal(entity, formData = {}) {
        if (!this.modalManager) {
            console.error('🎯 ADMIN-ACTION-HANDLER: Modal manager not initialized');

            return;
        }

        const config = this.getEntityConfig(entity);
        const title = `Create ${config.displayName}`;
        const content = this.generateFormHTML(config, formData, 'create');

        this.modalManager.show(title, content);
    }

    /**
     * Show edit modal for an entity
     * @param {string} entity - Entity type
     * @param {string} id - Entity ID
     * @param {Object} itemData - Entity data
     */
    showEditModal(entity, id, itemData) {
        if (!this.modalManager) {
            console.error('🎯 ADMIN-ACTION-HANDLER: Modal manager not initialized');

            return;
        }

        const config = this.getEntityConfig(entity);
        const title = `Edit ${config.displayName}`;
        const content = this.generateFormHTML(config, itemData, 'edit');

        this.modalManager.show(title, content);
    }

    /**
     * Show delete confirmation
     * @param {string} entity - Entity type
     * @param {string} id - Entity ID
     * @param {Object} itemData - Entity data
     */
    showDeleteConfirmation(entity, id, itemData) {
        if (!this.modalManager) {
            console.error('🎯 ADMIN-ACTION-HANDLER: Modal manager not initialized');

            return;
        }

        const config = this.getEntityConfig(entity);
        const title = `Delete ${config.displayName}`;
        const content = this.generateDeleteConfirmationHTML(config, itemData);

        this.modalManager.show(title, content);
    }

    /**
     * Show view modal for an entity
     * @param {string} entity - Entity type
     * @param {string} id - Entity ID
     * @param {Object} itemData - Entity data
     */
    showViewModal(entity, id, itemData) {
        if (!this.modalManager) {
            console.error('🎯 ADMIN-ACTION-HANDLER: Modal manager not initialized');

            return;
        }

        const config = this.getEntityConfig(entity);
        const title = `View ${config.displayName}`;
        const content = this.generateViewHTML(config, itemData);

        this.modalManager.show(title, content);
    }

    /**
     * Get entity configuration
     * @param {string} entity - Entity type
     * @returns {Object} Entity configuration
     */
    getEntityConfig(entity) {
        const configs = {
            packages: {
                displayName: 'Package',
                fields: [
                    { name: 'name', label: 'Package Name', type: 'text', required: true },
                    { name: 'credits', label: 'Credits', type: 'number', required: true },
                    { name: 'price', label: 'Price ($)', type: 'number', step: '0.01', required: true },
                    { name: 'description', label: 'Description', type: 'textarea', required: true },
                    { name: 'popular', label: 'Popular', type: 'checkbox' }
                ],
                apiEndpoint: '/api/admin/packages'
            },
            users: {
                displayName: 'User',
                fields: [
                    { name: 'email', label: 'Email', type: 'email', required: true },
                    { name: 'credits', label: 'Credits', type: 'number', required: true },
                    { name: 'status', label: 'Status', type: 'select', options: ['active', 'suspended'] }
                ],
                apiEndpoint: '/api/admin/users'
            },
            'promo-codes': {
                displayName: 'Promo Code',
                fields: [
                    { name: 'code', label: 'Promo Code', type: 'text', required: true },
                    { name: 'discount', label: 'Discount (%)', type: 'number', required: true },
                    { name: 'expires', label: 'Expires', type: 'date' }
                ],
                apiEndpoint: '/api/admin/promo-codes'
            }
        };

        return configs[entity] || { displayName: entity, fields: [], apiEndpoint: `/api/admin/${entity}` };
    }

    /**
     * Generate form HTML for an entity
     * @param {Object} config - Entity configuration
     * @param {Object} data - Form data
     * @param {string} mode - Form mode (create/edit)
     * @returns {string} Form HTML
     */
    generateFormHTML(config, data, mode) {
        const fields = config.fields.map(field => {
            const value = data[field.name] || '';
            const required = field.required ? 'required' : '';

            if (field.type === 'textarea') {
                return `
                    <div class="form-group">
                        <label for="${field.name}">${field.label} ${field.required ? '*' : ''}</label>
                        <textarea id="${field.name}" name="${field.name}" ${required}>${value}</textarea>
                    </div>
                `;
            } else if (field.type === 'select') {
                const options = field.options.map(option => `<option value="${option}" ${value === option ? 'selected' : ''}>${option}</option>`
                ).join('');

                return `
                    <div class="form-group">
                        <label for="${field.name}">${field.label} ${field.required ? '*' : ''}</label>
                        <select id="${field.name}" name="${field.name}" ${required}>
                            ${options}
                        </select>
                    </div>
                `;
            } else {
                const step = field.step ? `step="${field.step}"` : '';

                return `
                    <div class="form-group">
                        <label for="${field.name}">${field.label} ${field.required ? '*' : ''}</label>
                        <input type="${field.type}" id="${field.name}" name="${field.name}" value="${value}" ${required} ${step}>
                    </div>
                `;
            }
        }).join('');

        return `
            <form id="admin-form" class="admin-form">
                ${fields}
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="window.AdminEventBus.emit('modal', 'close')">Cancel</button>
                    <button type="submit" class="btn btn-primary">${mode === 'create' ? 'Create' : 'Update'}</button>
                </div>
            </form>
            <script>
                // Handle form submission
                document.getElementById('admin-form').addEventListener('submit', function(e) {
                    e.preventDefault();
                    const formData = new FormData(this);
                    const data = Object.fromEntries(formData.entries());

                    // Emit form submission event
                    window.AdminEventBus.emit('form', 'submit', {
                        entity: '${config.displayName.toLowerCase()}',
                        mode: '${mode}',
                        data: data
                    });
                });
            </script>
        `;
    }

    /**
     * Generate delete confirmation HTML
     * @param {Object} config - Entity configuration
     * @param {Object} data - Entity data
     * @returns {string} Delete confirmation HTML
     */
    generateDeleteConfirmationHTML(config, data) {
        return `
            <div class="delete-confirmation">
                <p>Are you sure you want to delete this ${config.displayName.toLowerCase()}?</p>
                <div class="entity-preview">
                    ${Object.entries(data).map(([key, value]) => `<div><strong>${key}:</strong> ${value}</div>`
    ).join('')}
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="window.AdminEventBus.emit('modal', 'close')">Cancel</button>
                    <button type="button" class="btn btn-danger" onclick="this.confirmDelete()">Delete</button>
                </div>
            </div>
        `;
    }

    /**
     * Generate view HTML for an entity
     * @param {Object} config - Entity configuration
     * @param {Object} data - Entity data
     * @returns {string} View HTML
     */
    generateViewHTML(config, data) {
        const fields = config.fields.map(field => `<div class="view-field">
                <label>${field.label}:</label>
                <span>${data[field.name] || 'N/A'}</span>
            </div>`
        ).join('');

        return `
            <div class="entity-view">
                ${fields}
                <div class="form-actions">
                    <button type="button" class="btn btn-primary" onclick="window.AdminEventBus.emit('modal', 'close')">Close</button>
                </div>
            </div>
        `;
    }

    /**
     * Handle modal open events
     * @param {Object} data - Modal data
     */
    handleModalOpen(data) {
    }

    /**
     * Handle modal close events
     * @param {Object} data - Modal data
     */
    handleModalClose(data) {
        if (this.modalManager) {
            this.modalManager.hide();
        }
    }

    /**
     * Handle API success events
     * @param {Object} data - Success data
     */
    handleApiSuccess(data) {
        // Show success notification
        if (window.showNotification) {
            window.showNotification('Operation completed successfully', 'success');
        }
    }

    /**
     * Handle API error events
     * @param {Object} data - Error data
     */
    handleApiError(data) {
        // Show error notification
        if (window.showNotification) {
            window.showNotification(`Operation failed: ${data.message}`, 'error');
        }
    }

    /**
     * Handle form submission events
     * @param {Object} data - Form submission data
     */
    handleFormSubmit(data) {

        const { entity, mode, data: formData } = data;

        if (!this.apiService) {
            console.error('🎯 ADMIN-ACTION-HANDLER: API service not available');
            this.handleApiError({ message: 'API service not available' });

            return;
        }

        // Make API call based on mode
        if (mode === 'create') {
            this.apiService.create(entity, formData)
                .then(result => {
                    this.handleApiSuccess(result);
                    this.eventBus.emit('modal', 'close');
                })
                .catch(error => {
                    this.handleApiError(error);
                });
        } else if (mode === 'edit') {
            this.apiService.update(entity, formData.id, formData)
                .then(result => {
                    this.handleApiSuccess(result);
                    this.eventBus.emit('modal', 'close');
                })
                .catch(error => {
                    this.handleApiError(error);
                });
        }
    }
}

// Create global instance
window.AdminActionHandler = new AdminActionHandler();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminActionHandler;
}
