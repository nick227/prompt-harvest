/**
 * Admin Shared Table Component - Enhanced table with sorting, filtering, and pagination
 * Single Responsibility: Provide a reusable table component for all admin data types
 */

class AdminSharedTable {
    constructor() {
        this.eventListenersSetup = false; // Prevent duplicate event listeners
        this.tableConfigs = {
            billing: {
                columns: [
                    { field: 'id', title: 'Transaction ID', sortable: true, filterable: true, type: 'text' },
                    { field: 'user_email', title: 'User', sortable: true, filterable: true, type: 'text' },
                    { field: 'amount', title: 'Amount', sortable: true, filterable: false, type: 'currency', formatter: 'currency' },
                    { field: 'status', title: 'Status', sortable: true, filterable: true, type: 'select', options: ['completed', 'pending', 'failed', 'refunded'] },
                    { field: 'payment_method', title: 'Payment Method', sortable: true, filterable: true, type: 'text' },
                    { field: 'created_at', title: 'Date', sortable: true, filterable: false, type: 'datetime', formatter: 'datetime' },
                    { field: 'actions', title: 'Actions', sortable: false, filterable: false, type: 'actions' }
                ],
                actions: ['view', 'refund', 'export']
            },
            users: {
                columns: [
                    { field: 'id', title: 'User ID', sortable: true, filterable: true, type: 'text' },
                    { field: 'username', title: 'Username', sortable: true, filterable: true, type: 'text' },
                    { field: 'email', title: 'Email', sortable: true, filterable: true, type: 'text' },
                    { field: 'creditBalance', title: 'Credits', sortable: true, filterable: false, type: 'number' },
                    { field: 'totalGenerated', title: 'Images', sortable: true, filterable: false, type: 'number' },
                    { field: 'isAdmin', title: 'Admin', sortable: true, filterable: true, type: 'select', options: ['true', 'false'], formatter: 'admin' },
                    { field: 'isSuspended', title: 'Status', sortable: true, filterable: true, type: 'select', options: ['true', 'false'], formatter: 'suspension' },
                    { field: 'created_at', title: 'Registered', sortable: true, filterable: false, type: 'datetime', formatter: 'datetime' },
                    { field: 'actions', title: 'Actions', sortable: false, filterable: false, type: 'actions' }
                ],
                actions: ['sendCredits', 'suspend', 'unsuspend']
            },
            images: {
                columns: [
                    { field: 'image_url', title: 'Thumbnail', sortable: false, filterable: false, type: 'image', formatter: 'thumbnail' },
                    { field: 'id', title: 'ID', sortable: true, filterable: true, type: 'text' },
                    { field: 'user_email', title: 'User', sortable: true, filterable: true, type: 'text' },
                    { field: 'prompt', title: 'Prompt', sortable: true, filterable: true, type: 'text', formatter: 'truncate' },
                    { field: 'tags', title: 'Tags', sortable: false, filterable: false, type: 'tags', formatter: 'tags' },
                    { field: 'provider', title: 'Provider', sortable: true, filterable: true, type: 'select', options: ['openai', 'stability', 'midjourney'] },
                    { field: 'isPublic', title: 'User Visibility', sortable: true, filterable: true, type: 'select', options: ['true', 'false'], formatter: 'visibility' },
                    { field: 'isHidden', title: 'Admin Status', sortable: true, filterable: true, type: 'select', options: ['true', 'false'], formatter: 'adminVisibility' },
                    { field: 'created_at', title: 'Generated', sortable: true, filterable: false, type: 'datetime', formatter: 'datetime' },
                    { field: 'actions', title: 'Actions', sortable: false, filterable: false, type: 'actions' }
                ],
                actions: ['view', 'generate_tags', 'edit_tags', 'toggle_visibility', 'admin_hide', 'admin_show', 'delete', 'moderate']
            },
            packages: {
                columns: [
                    { field: 'id', title: 'Package ID', sortable: true, filterable: true, type: 'text' },
                    { field: 'name', title: 'Package Name', sortable: true, filterable: true, type: 'text' },
                    { field: 'credits', title: 'Credits', sortable: true, filterable: false, type: 'number' },
                    { field: 'price', title: 'Price', sortable: true, filterable: false, type: 'currency', formatter: 'currency' },
                    { field: 'status', title: 'Status', sortable: true, filterable: true, type: 'select', options: ['active', 'inactive', 'archived'], formatter: 'status' },
                    { field: 'created_at', title: 'Created', sortable: true, filterable: false, type: 'datetime', formatter: 'datetime' },
                    { field: 'actions', title: 'Actions', sortable: false, filterable: false, type: 'actions' }
                ],
                actions: ['view', 'edit', 'activate', 'deactivate', 'delete']
            },
            providers: {
                columns: [
                    { field: 'id', title: 'Provider ID', sortable: true, filterable: true, type: 'text' },
                    { field: 'name', title: 'Provider Name', sortable: true, filterable: true, type: 'text' },
                    { field: 'type', title: 'Type', sortable: true, filterable: true, type: 'select', options: ['image', 'text', 'video'] },
                    { field: 'cost_per_request', title: 'Cost/Request', sortable: true, filterable: false, type: 'currency', formatter: 'currency' },
                    { field: 'status', title: 'Status', sortable: true, filterable: true, type: 'select', options: ['active', 'inactive', 'maintenance'], formatter: 'status' },
                    { field: 'last_updated', title: 'Last Updated', sortable: true, filterable: false, type: 'datetime', formatter: 'datetime' },
                    { field: 'actions', title: 'Actions', sortable: false, filterable: false, type: 'actions' }
                ],
                actions: ['view', 'edit', 'configure', 'test', 'disable']
            },
            models: {
                columns: [
                    { field: 'id', title: 'Model ID', sortable: true, filterable: true, type: 'text' },
                    { field: 'provider', title: 'Provider', sortable: true, filterable: true, type: 'text' },
                    { field: 'name', title: 'Model Name', sortable: true, filterable: true, type: 'text' },
                    { field: 'displayName', title: 'Display Name', sortable: true, filterable: true, type: 'text' },
                    { field: 'costPerImage', title: 'Cost/Image', sortable: true, filterable: false, type: 'number' },
                    { field: 'isActive', title: 'Active', sortable: true, filterable: true, type: 'boolean', formatter: 'boolean' },
                    { field: 'actions', title: 'Actions', sortable: false, filterable: false, type: 'actions' }
                ],
                actions: ['view', 'edit', 'delete']
            },
            'promo-cards': {
                columns: [
                    { field: 'id', title: 'Promo ID', sortable: true, filterable: true, type: 'text' },
                    { field: 'code', title: 'Code', sortable: true, filterable: true, type: 'text' },
                    { field: 'credits', title: 'Credits', sortable: true, filterable: false, type: 'number' },
                    { field: 'description', title: 'Description', sortable: true, filterable: true, type: 'text', formatter: 'truncate' },
                    { field: 'isActive', title: 'Active', sortable: true, filterable: true, type: 'boolean', formatter: 'boolean' },
                    { field: 'maxRedemptions', title: 'Max Redemptions', sortable: true, filterable: false, type: 'number' },
                    { field: 'currentRedemptions', title: 'Current Redemptions', sortable: true, filterable: false, type: 'number' },
                    { field: 'actions', title: 'Actions', sortable: false, filterable: false, type: 'actions' }
                ],
                actions: ['view', 'edit', 'activate', 'deactivate', 'delete']
            }
        };

        this.currentSort = {};
        this.currentFilters = {};
        this.currentPage = 1;
        this.pageSize = 25;
        this.filteredData = [];
        this.originalData = [];
    }

    init() {
    }

    /**
     * Render a table for the specified data type
     * @param {string} dataType - Type of data (billing, users, images, packages, providers)
     * @param {Array} data - Array of data items
     * @param {HTMLElement} container - Container element to render table in
     * @param {Object} options - Additional options
     */
    render(dataType, data, container, options = {}) {
        const config = this.tableConfigs[dataType];

        console.log('🔧 ADMIN-SHARED-TABLE: render called', {
            dataType,
            hasConfig: !!config,
            dataLength: Array.isArray(data) ? data.length : (data?.items?.length || 0),
            actions: config?.actions
        });

        if (!config) {
            console.error(`❌ ADMIN-SHARED-TABLE: No configuration found for ${dataType}`);

            return;
        }

        if (!container) {
            console.error(`❌ ADMIN-SHARED-TABLE: Container not provided for ${dataType}`);

            return;
        }

        try {
            this.originalData = Array.isArray(data) ? data : (data.items || []);
            this.currentFilters = {};
            this.currentSort = {};
            this.currentPage = 1;

            // Store reference to container and data type
            this.container = container;
            this.dataType = dataType;

            console.log('🔧 ADMIN-SHARED-TABLE: Set dataType to', this.dataType, 'with', this.originalData.length, 'items');

            // Generate table HTML
            const tableHTML = this.generateTableHTML(dataType, config, options);

            container.innerHTML = tableHTML;

            // Setup event listeners
            this.setupEventListeners();

            // Apply initial data
            this.applyData();


        } catch (error) {
            console.error(`❌ ADMIN-SHARED-TABLE: Failed to render table for ${dataType}:`, error);
            container.innerHTML = '<div class="error-message">Failed to load table data.</div>';
        }
    }

    generateTableHTML(dataType, config, options) {
        const { columns } = config;
        const showFilters = options.showFilters !== false;
        const showPagination = options.showPagination !== false;
        const addButton = options.addButton || null;

        return `
            <div class="admin-table-container" data-type="${dataType}">
                ${this.generateStandardHeader(dataType, addButton)}
                ${showFilters ? this.generateFilterControls(columns) : ''}

                <div class="table-wrapper">
                    <table class="admin-table" id="${dataType}-table">
                        <thead>
                            <tr>
                                ${columns.map(col => `
                                    <th class="${col.sortable ? 'sortable' : ''}" data-field="${col.field}">
                                        ${col.title}
                                        ${col.sortable ? '<i class="fas fa-sort sort-icon"></i>' : ''}
                                    </th>
                                `).join('')}
                            </tr>
                        </thead>
                        <tbody id="${dataType}-table-body">
                            <!-- Table rows will be populated here -->
                        </tbody>
                    </table>
                </div>

                ${showPagination ? this.generatePaginationControls() : ''}

                <div class="table-info">
                    <span id="${dataType}-table-info">Loading...</span>
                </div>
            </div>
        `;
    }

    /**
     * Generate standardized header with optional add button
     */
    generateStandardHeader(dataType, addButton = null) {
        const addButtonHTML = addButton
            ? `
            <div class="admin-header-actions">
                <button type="button" class="admin-add-button" data-action="${addButton.action}" title="${addButton.title}">
                    <i class="fas fa-plus"></i>
                    <span>${addButton.text}</span>
                </button>
            </div>
        `
            : '';

        return `
            <div class="admin-section-header">
                ${addButtonHTML}
            </div>
        `;
    }

    generateFilterControls(columns) {
        const filterableColumns = columns.filter(col => col.filterable && col.type !== 'actions');

        if (filterableColumns.length === 0) {
            return '';
        }

        return `
            <div class="table-filters">
                <div class="filters-header">
                    <h4>Filters</h4>
                    <button class="btn btn-sm btn-outline" id="clear-filters">
                        <i class="fas fa-times"></i> Clear All
                    </button>
                </div>
                <div class="filters-grid">
                    ${filterableColumns.map(col => this.generateFilterControl(col)).join('')}
                </div>
            </div>
        `;
    }

    generateFilterControl(column) {
        const { field, title, type, options } = column;

        switch (type) {
            case 'select':
                return `
                    <div class="filter-group">
                        <label for="filter-${field}">${title}:</label>
                        <select id="filter-${field}" class="filter-select" data-field="${field}">
                            <option value="">All ${title}</option>
                            ${options.map(option => `<option value="${option}">${option}</option>`).join('')}
                        </select>
                    </div>
                `;
            case 'text':
                return `
                    <div class="filter-group">
                        <label for="filter-${field}">${title}:</label>
                        <input type="text" id="filter-${field}" class="filter-input"
                               data-field="${field}" placeholder="Filter by ${title}...">
                    </div>
                `;
            case 'number':
                return `
                    <div class="filter-group">
                        <label for="filter-${field}">${title}:</label>
                        <input type="number" id="filter-${field}" class="filter-input"
                               data-field="${field}" placeholder="Filter by ${title}...">
                    </div>
                `;
            default:
                return `
                    <div class="filter-group">
                        <label for="filter-${field}">${title}:</label>
                        <input type="text" id="filter-${field}" class="filter-input"
                               data-field="${field}" placeholder="Filter by ${title}...">
                    </div>
                `;
        }
    }

    generatePaginationControls() {
        return `
            <div class="table-pagination">
                <div class="pagination-info">
                    <span>Items per page:</span>
                    <select id="page-size-select" class="page-size-select">
                        <option value="10">10</option>
                        <option value="25" selected>25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                    </select>
                </div>
                <div class="pagination-buttons" id="pagination-buttons">
                    <!-- Pagination buttons will be generated here -->
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Prevent duplicate event listeners
        if (this.eventListenersSetup) {

            return;
        }
        this.eventListenersSetup = true;

        // Sort event listeners
        const sortableHeaders = this.container.querySelectorAll('th.sortable');

        sortableHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const { field } = header.dataset;

                this.handleSort(field);
            });
        });

        // Filter event listeners
        const filterInputs = this.container.querySelectorAll('.filter-input, .filter-select');

        filterInputs.forEach(input => {
            input.addEventListener('input', () => {
                this.handleFilter();
            });
        });

        // Clear filters button
        const clearFiltersBtn = this.container.querySelector('#clear-filters');

        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                this.clearFilters();
            });
        }

        // Page size selector
        const pageSizeSelect = this.container.querySelector('#page-size-select');

        if (pageSizeSelect) {
            pageSizeSelect.addEventListener('change', e => {
                this.pageSize = parseInt(e.target.value);
                this.currentPage = 1;
                this.applyData();
            });
        }

        // Add button event listeners
        const addButtons = this.container.querySelectorAll('.admin-add-button');


        addButtons.forEach((button, index) => {
            console.log(`🔧 ADMIN-SHARED-TABLE: Button ${index}:`, {
                text: button.textContent,
                action: button.dataset.action,
                class: button.className
            });

            button.addEventListener('click', e => {
                console.log('🔧 ADMIN-SHARED-TABLE: Add button clicked:', {
                    text: button.textContent,
                    action: button.dataset.action
                });
                e.stopPropagation();
                const { action } = button.dataset;

                this.handleAddButtonClick(action);
            });
        });

        // Pagination buttons (will be set up when pagination is generated)
        this.setupPaginationEventListeners();
    }

    setupPaginationEventListeners() {
        const paginationContainer = this.container.querySelector('#pagination-buttons');

        if (paginationContainer) {
            paginationContainer.addEventListener('click', e => {
                if (e.target.classList.contains('pagination-btn')) {
                    const page = parseInt(e.target.dataset.page);

                    if (page && page !== this.currentPage) {
                        this.currentPage = page;
                        this.applyData();
                    }
                }
            });
        }
    }

    handleSort(field) {
        const currentSortField = this.currentSort.field;
        const currentSortDirection = this.currentSort.direction;

        // Determine new sort direction
        let newDirection = 'asc';

        if (currentSortField === field && currentSortDirection === 'asc') {
            newDirection = 'desc';
        } else if (currentSortField === field && currentSortDirection === 'desc') {
            newDirection = null; // Remove sorting
        }

        // Update sort state
        if (newDirection) {
            this.currentSort = { field, direction: newDirection };
        } else {
            this.currentSort = {};
        }

        // Update UI
        this.updateSortUI();

        // Apply sorting
        this.applyData();

    }

    handleFilter() {
        const filterInputs = this.container.querySelectorAll('.filter-input, .filter-select');

        this.currentFilters = {};

        filterInputs.forEach(input => {
            const { field } = input.dataset;
            const value = input.value.trim();

            if (value) {
                this.currentFilters[field] = value;
            }
        });

        this.currentPage = 1; // Reset to first page when filtering
        this.applyData();

    }

    clearFilters() {
        const filterInputs = this.container.querySelectorAll('.filter-input, .filter-select');

        filterInputs.forEach(input => {
            input.value = '';
        });

        this.currentFilters = {};
        this.currentPage = 1;
        this.applyData();

    }

    updateSortUI() {
        // Remove all sort indicators
        const sortIcons = this.container.querySelectorAll('.sort-icon');

        sortIcons.forEach(icon => {
            icon.className = 'fas fa-sort sort-icon';
        });

        // Update current sort indicator
        if (this.currentSort.field) {
            const header = this.container.querySelector(`th[data-field="${this.currentSort.field}"]`);

            if (header) {
                const icon = header.querySelector('.sort-icon');

                if (icon) {
                    icon.className = `fas fa-sort-${this.currentSort.direction === 'asc' ? 'up' : 'down'} sort-icon`;
                }
            }
        }
    }

    applyData() {
        // Apply filters
        this.filteredData = this.applyFilters(this.originalData);

        // Apply sorting
        if (this.currentSort.field) {
            this.filteredData = this.applySorting(this.filteredData, this.currentSort.field, this.currentSort.direction);
        }

        // Apply pagination
        const paginatedData = this.applyPagination(this.filteredData);

        // Render table body
        this.renderTableBody(paginatedData);

        // Update pagination controls
        this.updatePagination();

        // Update table info
        this.updateTableInfo();
    }

    applyFilters(data) {
        if (Object.keys(this.currentFilters).length === 0) {
            return data;
        }

        return data.filter(item => Object.entries(this.currentFilters).every(([field, filterValue]) => {
            const itemValue = item[field];

            if (itemValue === null || itemValue === undefined) {
                return false;
            }

            const stringValue = String(itemValue).toLowerCase();
            const stringFilter = String(filterValue).toLowerCase();

            return stringValue.includes(stringFilter);
        }));
    }

    applySorting(data, field, direction) {
        return [...data].sort((a, b) => {
            let aValue = a[field];
            let bValue = b[field];

            // Handle null/undefined values
            if (aValue === null || aValue === undefined) {
                aValue = '';
            }
            if (bValue === null || bValue === undefined) {
                bValue = '';
            }

            // Convert to comparable types
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }

            if (aValue < bValue) {
                return direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return direction === 'asc' ? 1 : -1;
            }

            return 0;
        });
    }

    applyPagination(data) {
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;

        return data.slice(startIndex, endIndex);
    }

    renderTableBody(data) {
        const tbody = this.container.querySelector(`#${this.dataType}-table-body`);

        if (!tbody) {
            return;
        }

        const config = this.tableConfigs[this.dataType];

        if (!config) {
            return;
        }

        if (data.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="${config.columns.length}" class="no-data">
                        <div class="no-data-message">
                            <i class="fas fa-inbox"></i>
                            No ${this.dataType} data found
                        </div>
                    </td>
                </tr>
            `;

            return;
        }

        tbody.innerHTML = data.map(item => this.generateTableRow(item, config)).join('');

        // Setup action button event listeners
        this.setupActionButtonListeners();
    }

    generateTableRow(item, config) {
        const { columns, actions } = config;

        return `
            <tr data-id="${item.id}">
                ${columns.map(col => `
                    <td class="table-cell ${col.field}">
                        ${col.field === 'actions'
        ? this.generateActionButtons(item, actions)
        : this.formatCellValue(item[col.field], col.formatter)
}
                    </td>
                `).join('')}
            </tr>
        `;
    }

    generateActionButtons(item, actions) {
        const buttonConfigs = {
            billing: {
                view: { icon: 'fas fa-eye', class: 'btn-sm btn-outline', tooltip: 'View Details' },
                refund: { icon: 'fas fa-undo', class: 'btn-sm btn-warning', tooltip: 'Refund Payment' },
                export: { icon: 'fas fa-download', class: 'btn-sm btn-info', tooltip: 'Export Data' }
            },
            users: {
                sendCredits: { icon: 'fas fa-coins', class: 'btn-sm btn-outline', tooltip: 'Send Credits' },
                suspend: { icon: 'fas fa-ban', class: 'btn-sm btn-outline btn-danger', tooltip: 'Suspend User' },
                unsuspend: { icon: 'fas fa-check', class: 'btn-sm btn-outline btn-success', tooltip: 'Unsuspend User' }
            },
            images: {
                view: { icon: 'fas fa-eye', class: 'btn-sm btn-outline', tooltip: 'View Image' },
                generate_tags: { icon: 'fas fa-robot', class: 'btn-sm btn-primary', tooltip: 'Generate AI Tags' },
                edit_tags: { icon: 'fas fa-tags', class: 'btn-sm btn-secondary', tooltip: 'Edit Tags Manually' },
                toggle_visibility: { icon: 'fas fa-eye-slash', class: 'btn-sm btn-info', tooltip: 'Toggle User Visibility' },
                admin_hide: { icon: 'fas fa-ban', class: 'btn-sm btn-warning', tooltip: 'Hide from Everyone (Admin Override)' },
                admin_show: { icon: 'fas fa-check', class: 'btn-sm btn-success', tooltip: 'Show to Everyone (Admin Override)' },
                delete: { icon: 'fas fa-trash', class: 'btn-sm btn-danger', tooltip: 'Delete Image' },
                moderate: { icon: 'fas fa-shield-alt', class: 'btn-sm btn-warning', tooltip: 'Moderate Content' }
            },
            packages: {
                view: { icon: 'fas fa-eye', class: 'btn-sm btn-outline', tooltip: 'View Package' },
                edit: { icon: 'fas fa-edit', class: 'btn-sm btn-primary', tooltip: 'Edit Package' },
                activate: { icon: 'fas fa-check', class: 'btn-sm btn-success', tooltip: 'Activate Package' },
                deactivate: { icon: 'fas fa-ban', class: 'btn-sm btn-warning', tooltip: 'Deactivate Package' },
                delete: { icon: 'fas fa-trash', class: 'btn-sm btn-danger', tooltip: 'Delete Package' }
            },
            providers: {
                view: { icon: 'fas fa-eye', class: 'btn-sm btn-outline', tooltip: 'View Provider' },
                edit: { icon: 'fas fa-edit', class: 'btn-sm btn-primary', tooltip: 'Edit Provider' },
                configure: { icon: 'fas fa-cog', class: 'btn-sm btn-info', tooltip: 'Configure Provider' },
                test: { icon: 'fas fa-vial', class: 'btn-sm btn-success', tooltip: 'Test Provider' },
                disable: { icon: 'fas fa-ban', class: 'btn-sm btn-warning', tooltip: 'Disable Provider' }
            },
            models: {
                view: { icon: 'fas fa-eye', class: 'btn-sm btn-outline', tooltip: 'View Model' },
                edit: { icon: 'fas fa-edit', class: 'btn-sm btn-primary', tooltip: 'Edit Model' },
                delete: { icon: 'fas fa-trash', class: 'btn-sm btn-danger', tooltip: 'Delete Model' }
            },
            'promo-cards': {
                delete: { icon: 'fas fa-trash', class: 'btn-sm btn-danger', tooltip: 'Delete Promo Card' }
            }
        };

        const config = buttonConfigs[this.dataType] || {};

        console.log('🔧 ADMIN-SHARED-TABLE: generateActionButtons', {
            dataType: this.dataType,
            actions,
            config,
            hasConfig: !!config,
            itemId: item?.id
        });

        return actions.map(action => {
            const buttonConfig = config[action];

            if (!buttonConfig) {
                console.warn(`⚠️ ADMIN-SHARED-TABLE: No button config for action "${action}" in dataType "${this.dataType}"`);

                return '';
            }

            // Hide certain buttons based on item status
            if (this.shouldHideButton(action, item)) {
                return '';
            }

            return `
                <button
                    class="btn ${buttonConfig.class} action-btn"
                    data-action="${action}"
                    data-id="${item.id}"
                    title="${buttonConfig.tooltip}"
                >
                    <i class="${buttonConfig.icon}"></i>
                </button>
            `;
        }).filter(Boolean).join(' ');
    }

    shouldHideButton(action, item) {
        switch (this.dataType) {
            case 'billing':
                if (action === 'refund' && (item.status === 'refunded' || item.status === 'failed')) {
                    return true;
                }
                break;
            case 'users':
                // Hide suspend button if user is already suspended or is admin
                if (action === 'suspend' && (item.isSuspended === true || item.isAdmin === true)) {
                    return true;
                }
                // Hide unsuspend button if user is not suspended
                if (action === 'unsuspend' && item.isSuspended !== true) {
                    return true;
                }
                break;
            case 'images':
                if (action === 'moderate' && item.status === 'moderated') {
                    return true;
                }
                if (action === 'admin_hide' && item.isHidden === true) {
                    return true;
                }
                if (action === 'admin_show' && item.isHidden === false) {
                    return true;
                }
                break;
            case 'packages':
                if (action === 'activate' && item.status === 'active') {
                    return true;
                }
                if (action === 'deactivate' && item.status === 'inactive') {
                    return true;
                }
                break;
            case 'providers':
                if (action === 'disable' && item.status === 'inactive') {
                    return true;
                }
                break;
            case 'promo-cards':
                if (action === 'activate' && item.status === 'active') {
                    return true;
                }
                if (action === 'deactivate' && item.status === 'inactive') {
                    return true;
                }
                break;
        }

        return false;
    }

    setupActionButtonListeners() {
        // Remove existing event listeners to prevent duplicates
        const actionButtons = this.container.querySelectorAll('.action-btn');

        actionButtons.forEach(button => {
            // Clone the button to remove all event listeners
            const newButton = button.cloneNode(true);

            button.parentNode.replaceChild(newButton, button);

            // Add fresh event listener
            newButton.addEventListener('click', e => {
                e.stopPropagation();
                const { action, id } = newButton.dataset;

                this.handleAction(action, id);
            });
        });
    }

    handleAddButtonClick(action) {

        // Use new centralized event system
        if (window.AdminEventBus) {
            window.AdminEventBus.emit('table', action, {
                entity: this.dataType,
                id: null
            });
        } else {
            // Fallback to old system
            const eventDetail = {
                dataType: this.dataType,
                action,
                id: null
            };

            window.dispatchEvent(new CustomEvent('admin-table-action', {
                detail: eventDetail
            }));
        }
    }

    handleAction(action, id) {

        // Handle user-specific actions directly
        if (this.dataType === 'users') {
            switch (action) {
                case 'sendCredits':
                    if (window.sendCredits) {
                        window.sendCredits(id);
                    } else {
                        console.error('sendCredits function not available');
                    }
                    break;
                case 'suspend':
                    if (window.suspendUser) {
                        window.suspendUser(id);
                    } else {
                        console.error('suspendUser function not available');
                    }
                    break;
                case 'unsuspend':
                    if (window.unsuspendUser) {
                        window.unsuspendUser(id);
                    } else {
                        console.error('unsuspendUser function not available');
                    }
                    break;
                default:
                    console.warn(`Unknown user action: ${action}`);
            }

            return;
        }

        // For other data types, dispatch the event as before
        window.dispatchEvent(new CustomEvent('admin-table-action', {
            detail: {
                dataType: this.dataType,
                action,
                id
            }
        }));
    }

    updatePagination() {
        const totalItems = this.filteredData.length;
        const totalPages = Math.ceil(totalItems / this.pageSize);
        const paginationContainer = this.container.querySelector('#pagination-buttons');

        if (!paginationContainer || totalPages <= 1) {
            if (paginationContainer) {
                paginationContainer.innerHTML = '';
            }

            return;
        }

        let paginationHTML = '';

        // Previous button
        if (this.currentPage > 1) {
            paginationHTML += `
                <button class="pagination-btn" data-page="${this.currentPage - 1}">
                    <i class="fas fa-chevron-left"></i>
                </button>
            `;
        }

        // Page numbers
        const maxVisiblePages = 5;
        const startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
        const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        for (let page = startPage; page <= endPage; page++) {
            const isActive = page === this.currentPage ? 'active' : '';

            paginationHTML += `
                <button class="pagination-btn ${isActive}" data-page="${page}">${page}</button>
            `;
        }

        // Next button
        if (this.currentPage < totalPages) {
            paginationHTML += `
                <button class="pagination-btn" data-page="${this.currentPage + 1}">
                    <i class="fas fa-chevron-right"></i>
                </button>
            `;
        }

        paginationContainer.innerHTML = paginationHTML;
    }

    updateTableInfo() {
        const totalItems = this.filteredData.length;
        const startItem = (this.currentPage - 1) * this.pageSize + 1;
        const endItem = Math.min(this.currentPage * this.pageSize, totalItems);
        const infoElement = this.container.querySelector(`#${this.dataType}-table-info`);

        if (infoElement) {
            if (totalItems === 0) {
                infoElement.textContent = 'No items found';
            } else {
                infoElement.textContent = `Showing ${startItem} to ${endItem} of ${totalItems} items`;
            }
        }
    }

    formatCellValue(value, formatter) {
        if (value === null || value === undefined) {
            return '<span class="empty-value">-</span>';
        }

        switch (formatter) {
            case 'currency':
                return this.formatCurrency(value);
            case 'datetime':
                return this.formatDateTime(value);
            case 'status':
                return this.formatStatus(value);
            case 'visibility':
                return this.formatVisibility(value);
            case 'adminVisibility':
                return this.formatAdminVisibility(value);
            case 'thumbnail':
                return this.formatThumbnail(value);
            case 'tags':
                return this.formatTags(value);
            case 'truncate':
                return this.truncateText(value, 50);
            case 'admin':
                return this.formatAdmin(value);
            case 'suspension':
                return this.formatSuspension(value);
            case 'discountType':
                return this.formatDiscountType(value);
            case 'boolean':
                return this.formatBoolean(value);
            default:
                return this.escapeHtml(String(value));
        }
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    formatDateTime(timestamp) {
        return new Date(timestamp).toLocaleString();
    }

    formatStatus(status) {
        const statusClasses = {
            active: 'status-active',
            inactive: 'status-inactive',
            suspended: 'status-suspended',
            completed: 'status-completed',
            pending: 'status-pending',
            failed: 'status-failed',
            refunded: 'status-refunded',
            moderated: 'status-moderated',
            archived: 'status-archived',
            maintenance: 'status-maintenance'
        };

        const className = statusClasses[status] || 'status-default';

        return `<span class="status-badge ${className}">${status}</span>`;
    }

    formatVisibility(isPublic) {
        const isPublicBool = isPublic === true || isPublic === 'true' || isPublic === 1;
        const className = isPublicBool ? 'status-active' : 'status-inactive';
        const text = isPublicBool ? 'Public' : 'Private';

        return `<span class="status-badge ${className}">${text}</span>`;
    }

    formatAdminVisibility(isHidden) {
        const isHiddenBool = isHidden === true || isHidden === 'true' || isHidden === 1;
        const className = isHiddenBool ? 'status-failed' : 'status-active';
        const text = isHiddenBool ? 'Hidden' : 'Visible';

        return `<span class="status-badge ${className}">${text}</span>`;
    }

    formatAdmin(isAdmin) {
        const isAdminBool = isAdmin === true || isAdmin === 'true' || isAdmin === 1;
        const className = isAdminBool ? 'status-active' : 'status-inactive';
        const text = isAdminBool ? 'Admin' : 'User';

        return `<span class="status-badge ${className}">${text}</span>`;
    }

    formatSuspension(isSuspended) {
        const isSuspendedBool = isSuspended === true || isSuspended === 'true' || isSuspended === 1;
        const className = isSuspendedBool ? 'status-failed' : 'status-active';
        const text = isSuspendedBool ? 'Suspended' : 'Active';

        return `<span class="status-badge ${className}">${text}</span>`;
    }

    formatDiscountType(type) {
        const typeClasses = {
            percentage: 'status-active',
            fixed: 'status-completed',
            credits: 'status-pending'
        };
        const className = typeClasses[type] || 'status-default';

        return `<span class="status-badge ${className}">${type}</span>`;
    }

    formatBoolean(value) {
        const isActive = value === true || value === 1 || value === '1' || value === 'true';
        const className = isActive ? 'status-active' : 'status-inactive';
        const text = isActive ? 'Active' : 'Inactive';

        return `<span class="status-badge ${className}">${text}</span>`;
    }

    formatThumbnail(imageUrl) {
        if (!imageUrl) {
            return '<span class="text-muted">No image</span>';
        }

        return `<img src="${this.escapeHtml(imageUrl)}" alt="Thumbnail" class="admin-thumbnail" loading="lazy">`;
    }

    formatTags(tags) {
        if (!tags || !Array.isArray(tags) || tags.length === 0) {
            return '<span class="text-muted">No tags</span>';
        }

        const tagElements = tags.slice(0, 5).map(tag => `<span class="tag-badge">${this.escapeHtml(tag)}</span>`
        ).join('');

        const moreTags = tags.length > 5 ? `<span class="text-muted">+${tags.length - 5} more</span>` : '';

        return `<div class="tags-container">${tagElements}${moreTags}</div>`;
    }

    truncateText(text, maxLength) {
        if (text.length <= maxLength) {
            return this.escapeHtml(text);
        }

        const truncated = `${text.substring(0, maxLength)}...`;

        return `<span title="${this.escapeHtml(text)}">${this.escapeHtml(truncated)}</span>`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');

        div.textContent = text;

        return div.innerHTML;
    }

    // Public API methods
    refreshData(newData) {
        this.originalData = Array.isArray(newData) ? newData : (newData.items || []);
        this.applyData();
    }

    getCurrentFilters() {
        return { ...this.currentFilters };
    }

    getCurrentSort() {
        return { ...this.currentSort };
    }

    getCurrentPage() {
        return this.currentPage;
    }

    destroy() {
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// Export for global access
window.AdminSharedTable = AdminSharedTable;
