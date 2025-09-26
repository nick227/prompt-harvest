/**
 * Consolidated Admin Components
 * Handles all admin UI components and widgets
 * Consolidates: admin-component-system.js + admin-shared-table.js + admin-modal-manager.js + admin-utils.js
 */

export class AdminComponents {
    constructor() {
        this.isInitialized = false;
        this.components = new Map();
        this.modals = new Map();
        this.tables = new Map();
    }

    /**
     * Initialize admin components
     */
    async init() {
        if (this.isInitialized) {
            return;
        }

        try {
            console.log('🧩 ADMIN-COMPONENTS: Initializing admin components...');
            
            // Initialize shared components
            this.initializeSharedComponents();
            
            // Initialize table components
            this.initializeTableComponents();
            
            // Initialize modal components
            this.initializeModalComponents();
            
            // Initialize utility components
            this.initializeUtilityComponents();
            
            this.isInitialized = true;
            console.log('✅ ADMIN-COMPONENTS: Admin components initialized');
        } catch (error) {
            console.error('❌ ADMIN-COMPONENTS: Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Initialize shared components
     */
    initializeSharedComponents() {
        // Initialize shared table component
        this.components.set('sharedTable', new AdminSharedTable());
        
        // Initialize notification component
        this.components.set('notification', new AdminNotification());
        
        // Initialize loading component
        this.components.set('loading', new AdminLoading());
        
        // Initialize error component
        this.components.set('error', new AdminError());
    }

    /**
     * Initialize table components
     */
    initializeTableComponents() {
        // Initialize data table component
        this.components.set('dataTable', new AdminDataTable());
        
        // Initialize pagination component
        this.components.set('pagination', new AdminPagination());
        
        // Initialize filter component
        this.components.set('filter', new AdminFilter());
        
        // Initialize sort component
        this.components.set('sort', new AdminSort());
    }

    /**
     * Initialize modal components
     */
    initializeModalComponents() {
        // Initialize modal manager
        this.components.set('modalManager', new AdminModalManager());
        
        // Initialize form modal
        this.components.set('formModal', new AdminFormModal());
        
        // Initialize confirmation modal
        this.components.set('confirmModal', new AdminConfirmModal());
        
        // Initialize info modal
        this.components.set('infoModal', new AdminInfoModal());
    }

    /**
     * Initialize utility components
     */
    initializeUtilityComponents() {
        // Initialize date picker
        this.components.set('datePicker', new AdminDatePicker());
        
        // Initialize search component
        this.components.set('search', new AdminSearch());
        
        // Initialize export component
        this.components.set('export', new AdminExport());
        
        // Initialize import component
        this.components.set('import', new AdminImport());
    }

    /**
     * Get a component by name
     * @param {string} name - Component name
     * @returns {Object|null} Component instance
     */
    getComponent(name) {
        return this.components.get(name) || null;
    }

    /**
     * Create a new table
     * @param {string} id - Table ID
     * @param {Object} config - Table configuration
     * @returns {AdminDataTable} Table instance
     */
    createTable(id, config) {
        const table = new AdminDataTable(id, config);
        this.tables.set(id, table);
        return table;
    }

    /**
     * Get a table by ID
     * @param {string} id - Table ID
     * @returns {AdminDataTable|null} Table instance
     */
    getTable(id) {
        return this.tables.get(id) || null;
    }

    /**
     * Show a modal
     * @param {string} type - Modal type
     * @param {Object} options - Modal options
     * @returns {Promise<Object>} Modal result
     */
    async showModal(type, options = {}) {
        const modalManager = this.getComponent('modalManager');
        if (!modalManager) {
            throw new Error('Modal manager not available');
        }

        return await modalManager.show(type, options);
    }

    /**
     * Hide a modal
     * @param {string} id - Modal ID
     */
    hideModal(id) {
        const modalManager = this.getComponent('modalManager');
        if (modalManager) {
            modalManager.hide(id);
        }
    }

    /**
     * Show notification
     * @param {string} message - Notification message
     * @param {string} type - Notification type
     */
    showNotification(message, type = 'info') {
        const notification = this.getComponent('notification');
        if (notification) {
            notification.show(message, type);
        }
    }

    /**
     * Show loading state
     * @param {string} message - Loading message
     */
    showLoading(message = 'Loading...') {
        const loading = this.getComponent('loading');
        if (loading) {
            loading.show(message);
        }
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        const loading = this.getComponent('loading');
        if (loading) {
            loading.hide();
        }
    }

    /**
     * Show error
     * @param {string} message - Error message
     */
    showError(message) {
        const error = this.getComponent('error');
        if (error) {
            error.show(message);
        }
    }
}

/**
 * Admin Shared Table Component
 */
class AdminSharedTable {
    constructor() {
        this.tables = new Map();
    }

    /**
     * Initialize shared table
     */
    init() {
        console.log('📊 ADMIN-SHARED-TABLE: Initializing shared table...');
    }

    /**
     * Create a new table
     * @param {string} id - Table ID
     * @param {Object} config - Table configuration
     * @returns {Object} Table instance
     */
    create(id, config) {
        const table = {
            id,
            config,
            data: [],
            columns: config.columns || [],
            rows: config.rows || [],
            pagination: config.pagination || { page: 1, limit: 10 },
            sorting: config.sorting || { column: null, direction: 'asc' },
            filtering: config.filtering || { column: null, value: '' }
        };

        this.tables.set(id, table);
        return table;
    }

    /**
     * Render table
     * @param {string} id - Table ID
     * @param {HTMLElement} container - Container element
     */
    render(id, container) {
        const table = this.tables.get(id);
        if (!table) {
            console.error(`❌ ADMIN-SHARED-TABLE: Table ${id} not found`);
            return;
        }

        container.innerHTML = this.generateTableHTML(table);
        this.attachEventListeners(id, container);
    }

    /**
     * Generate table HTML
     * @param {Object} table - Table configuration
     * @returns {string} HTML string
     */
    generateTableHTML(table) {
        return `
            <div class="admin-table-container">
                <div class="admin-table-header">
                    <div class="table-actions">
                        <button class="btn-refresh" data-table-action="refresh">Refresh</button>
                        <button class="btn-export" data-table-action="export">Export</button>
                    </div>
                    <div class="table-filters">
                        <input type="text" placeholder="Search..." data-table-filter="search">
                        <select data-table-filter="column">
                            <option value="">All Columns</option>
                            ${table.columns.map(col => `<option value="${col.key}">${col.title}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="admin-table-content">
                    <table class="admin-table" data-table-id="${table.id}">
                        <thead>
                            <tr>
                                ${table.columns.map(col => `
                                    <th data-sort="${col.key}">
                                        ${col.title}
                                        <span class="sort-indicator"></span>
                                    </th>
                                `).join('')}
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.generateTableRows(table)}
                        </tbody>
                    </table>
                </div>
                <div class="admin-table-footer">
                    ${this.generatePagination(table)}
                </div>
            </div>
        `;
    }

    /**
     * Generate table rows
     * @param {Object} table - Table configuration
     * @returns {string} HTML string
     */
    generateTableRows(table) {
        const startIndex = (table.pagination.page - 1) * table.pagination.limit;
        const endIndex = startIndex + table.pagination.limit;
        const rows = table.rows.slice(startIndex, endIndex);

        return rows.map(row => `
            <tr data-row-id="${row.id}">
                ${table.columns.map(col => `
                    <td>${row[col.key] || ''}</td>
                `).join('')}
                <td>
                    <button class="btn-edit" data-action="edit" data-id="${row.id}">Edit</button>
                    <button class="btn-delete" data-action="delete" data-id="${row.id}">Delete</button>
                </td>
            </tr>
        `).join('');
    }

    /**
     * Generate pagination
     * @param {Object} table - Table configuration
     * @returns {string} HTML string
     */
    generatePagination(table) {
        const totalPages = Math.ceil(table.rows.length / table.pagination.limit);
        const currentPage = table.pagination.page;

        return `
            <div class="pagination">
                <button class="btn-prev" data-pagination="prev" ${currentPage <= 1 ? 'disabled' : ''}>Previous</button>
                <span class="page-info">Page ${currentPage} of ${totalPages}</span>
                <button class="btn-next" data-pagination="next" ${currentPage >= totalPages ? 'disabled' : ''}>Next</button>
            </div>
        `;
    }

    /**
     * Attach event listeners
     * @param {string} id - Table ID
     * @param {HTMLElement} container - Container element
     */
    attachEventListeners(id, container) {
        // Sort functionality
        container.querySelectorAll('[data-sort]').forEach(th => {
            th.addEventListener('click', () => {
                const column = th.dataset.sort;
                this.sortTable(id, column);
            });
        });

        // Pagination functionality
        container.querySelectorAll('[data-pagination]').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.pagination;
                this.handlePagination(id, action);
            });
        });

        // Filter functionality
        container.querySelectorAll('[data-table-filter]').forEach(input => {
            input.addEventListener('input', () => {
                this.filterTable(id, input.dataset.tableFilter, input.value);
            });
        });

        // Action buttons
        container.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                const rowId = btn.dataset.id;
                this.handleTableAction(id, action, rowId);
            });
        });
    }

    /**
     * Sort table
     * @param {string} id - Table ID
     * @param {string} column - Column to sort by
     */
    sortTable(id, column) {
        const table = this.tables.get(id);
        if (!table) return;

        const direction = table.sorting.column === column && table.sorting.direction === 'asc' ? 'desc' : 'asc';
        table.sorting = { column, direction };

        table.rows.sort((a, b) => {
            const aVal = a[column];
            const bVal = b[column];
            const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            return direction === 'asc' ? comparison : -comparison;
        });

        this.rerenderTable(id);
    }

    /**
     * Handle pagination
     * @param {string} id - Table ID
     * @param {string} action - Pagination action
     */
    handlePagination(id, action) {
        const table = this.tables.get(id);
        if (!table) return;

        switch (action) {
            case 'prev':
                if (table.pagination.page > 1) {
                    table.pagination.page--;
                }
                break;
            case 'next':
                const totalPages = Math.ceil(table.rows.length / table.pagination.limit);
                if (table.pagination.page < totalPages) {
                    table.pagination.page++;
                }
                break;
        }

        this.rerenderTable(id);
    }

    /**
     * Filter table
     * @param {string} id - Table ID
     * @param {string} filterType - Type of filter
     * @param {string} value - Filter value
     */
    filterTable(id, filterType, value) {
        const table = this.tables.get(id);
        if (!table) return;

        if (filterType === 'search') {
            table.filtering.value = value;
        } else if (filterType === 'column') {
            table.filtering.column = value;
        }

        this.rerenderTable(id);
    }

    /**
     * Handle table action
     * @param {string} id - Table ID
     * @param {string} action - Action to perform
     * @param {string} rowId - Row ID
     */
    handleTableAction(id, action, rowId) {
        console.log(`📊 ADMIN-SHARED-TABLE: Table ${id} action ${action} on row ${rowId}`);
        
        // Dispatch custom event
        const event = new CustomEvent('adminTableAction', {
            detail: { tableId: id, action, rowId }
        });
        document.dispatchEvent(event);
    }

    /**
     * Rerender table
     * @param {string} id - Table ID
     */
    rerenderTable(id) {
        const table = this.tables.get(id);
        if (!table) return;

        const container = document.querySelector(`[data-table-id="${id}"]`);
        if (container) {
            this.render(id, container.parentElement);
        }
    }
}

/**
 * Admin Data Table Component
 */
class AdminDataTable {
    constructor(id, config) {
        this.id = id;
        this.config = config;
        this.data = [];
        this.filteredData = [];
        this.sortedData = [];
        this.currentPage = 1;
        this.pageSize = config.pageSize || 10;
    }

    /**
     * Set table data
     * @param {Array} data - Table data
     */
    setData(data) {
        this.data = data;
        this.filteredData = [...data];
        this.sortedData = [...data];
        this.currentPage = 1;
    }

    /**
     * Filter table data
     * @param {string} column - Column to filter
     * @param {string} value - Filter value
     */
    filter(column, value) {
        if (!column || !value) {
            this.filteredData = [...this.data];
        } else {
            this.filteredData = this.data.filter(row => 
                row[column] && row[column].toString().toLowerCase().includes(value.toLowerCase())
            );
        }
        this.sortedData = [...this.filteredData];
        this.currentPage = 1;
    }

    /**
     * Sort table data
     * @param {string} column - Column to sort
     * @param {string} direction - Sort direction
     */
    sort(column, direction) {
        this.sortedData.sort((a, b) => {
            const aVal = a[column];
            const bVal = b[column];
            const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            return direction === 'asc' ? comparison : -comparison;
        });
    }

    /**
     * Get current page data
     * @returns {Array} Current page data
     */
    getCurrentPageData() {
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        return this.sortedData.slice(startIndex, endIndex);
    }

    /**
     * Get total pages
     * @returns {number} Total pages
     */
    getTotalPages() {
        return Math.ceil(this.sortedData.length / this.pageSize);
    }
}

/**
 * Admin Modal Manager
 */
class AdminModalManager {
    constructor() {
        this.modals = new Map();
        this.activeModal = null;
    }

    /**
     * Show modal
     * @param {string} type - Modal type
     * @param {Object} options - Modal options
     * @returns {Promise<Object>} Modal result
     */
    async show(type, options = {}) {
        const modal = this.createModal(type, options);
        this.modals.set(modal.id, modal);
        this.activeModal = modal;

        document.body.appendChild(modal.element);
        this.showModal(modal);

        return new Promise((resolve) => {
            modal.resolve = resolve;
        });
    }

    /**
     * Hide modal
     * @param {string} id - Modal ID
     */
    hide(id) {
        const modal = this.modals.get(id);
        if (modal) {
            this.hideModal(modal);
            modal.element.remove();
            this.modals.delete(id);
            
            if (this.activeModal === modal) {
                this.activeModal = null;
            }
        }
    }

    /**
     * Create modal
     * @param {string} type - Modal type
     * @param {Object} options - Modal options
     * @returns {Object} Modal object
     */
    createModal(type, options) {
        const id = `modal-${Date.now()}`;
        const element = document.createElement('div');
        element.className = 'admin-modal';
        element.innerHTML = this.generateModalHTML(type, options);

        return {
            id,
            type,
            options,
            element,
            resolve: null
        };
    }

    /**
     * Generate modal HTML
     * @param {string} type - Modal type
     * @param {Object} options - Modal options
     * @returns {string} HTML string
     */
    generateModalHTML(type, options) {
        switch (type) {
            case 'form':
                return this.generateFormModalHTML(options);
            case 'confirm':
                return this.generateConfirmModalHTML(options);
            case 'info':
                return this.generateInfoModalHTML(options);
            default:
                return this.generateDefaultModalHTML(options);
        }
    }

    /**
     * Generate form modal HTML
     * @param {Object} options - Modal options
     * @returns {string} HTML string
     */
    generateFormModalHTML(options) {
        return `
            <div class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${options.title || 'Form'}</h3>
                        <button class="modal-close" data-modal-close>&times;</button>
                    </div>
                    <div class="modal-body">
                        <form data-admin-form="${options.formType || 'default'}">
                            ${options.fields ? this.generateFormFields(options.fields) : ''}
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-cancel" data-modal-cancel>Cancel</button>
                        <button class="btn-submit" data-modal-submit>Submit</button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Generate confirm modal HTML
     * @param {Object} options - Modal options
     * @returns {string} HTML string
     */
    generateConfirmModalHTML(options) {
        return `
            <div class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${options.title || 'Confirm'}</h3>
                        <button class="modal-close" data-modal-close>&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>${options.message || 'Are you sure?'}</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-cancel" data-modal-cancel>Cancel</button>
                        <button class="btn-confirm" data-modal-confirm>Confirm</button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Generate info modal HTML
     * @param {Object} options - Modal options
     * @returns {string} HTML string
     */
    generateInfoModalHTML(options) {
        return `
            <div class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${options.title || 'Information'}</h3>
                        <button class="modal-close" data-modal-close>&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>${options.message || 'No information available'}</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-ok" data-modal-ok>OK</button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Generate default modal HTML
     * @param {Object} options - Modal options
     * @returns {string} HTML string
     */
    generateDefaultModalHTML(options) {
        return `
            <div class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${options.title || 'Modal'}</h3>
                        <button class="modal-close" data-modal-close>&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>${options.content || 'No content available'}</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-close" data-modal-close>Close</button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Generate form fields
     * @param {Array} fields - Form fields
     * @returns {string} HTML string
     */
    generateFormFields(fields) {
        return fields.map(field => `
            <div class="form-field">
                <label for="${field.name}">${field.label}</label>
                <input type="${field.type || 'text'}" name="${field.name}" id="${field.name}" 
                       value="${field.value || ''}" ${field.required ? 'required' : ''}>
            </div>
        `).join('');
    }

    /**
     * Show modal
     * @param {Object} modal - Modal object
     */
    showModal(modal) {
        modal.element.style.display = 'block';
        modal.element.classList.add('show');
    }

    /**
     * Hide modal
     * @param {Object} modal - Modal object
     */
    hideModal(modal) {
        modal.element.classList.remove('show');
        setTimeout(() => {
            modal.element.style.display = 'none';
        }, 300);
    }
}

/**
 * Admin Notification Component
 */
class AdminNotification {
    constructor() {
        this.notifications = new Map();
    }

    /**
     * Show notification
     * @param {string} message - Notification message
     * @param {string} type - Notification type
     */
    show(message, type = 'info') {
        const id = `notification-${Date.now()}`;
        const element = document.createElement('div');
        element.className = `admin-notification admin-notification-${type}`;
        element.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close" data-notification-close>&times;</button>
            </div>
        `;

        document.body.appendChild(element);
        this.notifications.set(id, element);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            this.hide(id);
        }, 5000);

        return id;
    }

    /**
     * Hide notification
     * @param {string} id - Notification ID
     */
    hide(id) {
        const element = this.notifications.get(id);
        if (element) {
            element.remove();
            this.notifications.delete(id);
        }
    }
}

/**
 * Admin Loading Component
 */
class AdminLoading {
    constructor() {
        this.loadingElement = null;
    }

    /**
     * Show loading
     * @param {string} message - Loading message
     */
    show(message = 'Loading...') {
        if (this.loadingElement) {
            this.hide();
        }

        this.loadingElement = document.createElement('div');
        this.loadingElement.className = 'admin-loading';
        this.loadingElement.innerHTML = `
            <div class="loading-overlay">
                <div class="loading-spinner"></div>
                <div class="loading-message">${message}</div>
            </div>
        `;

        document.body.appendChild(this.loadingElement);
    }

    /**
     * Hide loading
     */
    hide() {
        if (this.loadingElement) {
            this.loadingElement.remove();
            this.loadingElement = null;
        }
    }
}

/**
 * Admin Error Component
 */
class AdminError {
    constructor() {
        this.errorElement = null;
    }

    /**
     * Show error
     * @param {string} message - Error message
     */
    show(message) {
        if (this.errorElement) {
            this.hide();
        }

        this.errorElement = document.createElement('div');
        this.errorElement.className = 'admin-error';
        this.errorElement.innerHTML = `
            <div class="error-overlay">
                <div class="error-content">
                    <h3>Error</h3>
                    <p>${message}</p>
                    <button class="error-close" data-error-close>Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.errorElement);
    }

    /**
     * Hide error
     */
    hide() {
        if (this.errorElement) {
            this.errorElement.remove();
            this.errorElement = null;
        }
    }
}

// Additional component classes would be implemented here...
class AdminPagination {}
class AdminFilter {}
class AdminSort {}
class AdminFormModal {}
class AdminConfirmModal {}
class AdminInfoModal {}
class AdminDatePicker {}
class AdminSearch {}
class AdminExport {}
class AdminImport {}

// Export for ES6 modules
export { AdminComponents };

// Global access for backward compatibility
if (typeof window !== 'undefined') {
    window.AdminComponents = AdminComponents;
}
