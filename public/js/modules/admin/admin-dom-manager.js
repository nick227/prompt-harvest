// Admin DOM Manager - Handles DOM manipulation and rendering for admin sections
/* global ADMIN_CONSTANTS */

class AdminDOMManager {
    constructor() {
        this.currentSection = null;
        this.sectionElements = new Map();
        this.tableElements = new Map();
    }

    init() {
        this.cacheElements();
        this.setupEventListeners();
    }

    cacheElements() {
        // Cache section elements
        Object.keys(ADMIN_CONSTANTS.SELECTORS.SECTIONS).forEach(sectionKey => {
            const selector = ADMIN_CONSTANTS.SELECTORS.SECTIONS[sectionKey];
            const element = document.querySelector(selector);

            if (element) {
                this.sectionElements.set(sectionKey.toLowerCase(), element);
            }
        });

        // Cache table elements
        Object.keys(ADMIN_CONSTANTS.SELECTORS.TABLES).forEach(tableKey => {
            const selector = ADMIN_CONSTANTS.SELECTORS.TABLES[tableKey];
            const element = document.querySelector(selector);

            if (element) {
                this.tableElements.set(tableKey.toLowerCase(), element);
            }
        });
    }

    setupEventListeners() {
        // Navigation event listeners
        const navLinks = document.querySelectorAll(ADMIN_CONSTANTS.SELECTORS.NAVIGATION.NAV_LINKS);

        navLinks.forEach(link => {
            link.addEventListener('click', e => {
                e.preventDefault();
                const { section } = link.dataset;

                if (section) {
                    this.switchSection(section);
                }
            });
        });

        // Global event listeners
        document.addEventListener(ADMIN_CONSTANTS.EVENTS.SECTION_CHANGE, e => {
            this.handleSectionChange(e.detail);
        });

        document.addEventListener(ADMIN_CONSTANTS.EVENTS.DATA_LOADED, e => {
            this.handleDataLoaded(e.detail);
        });

        document.addEventListener(ADMIN_CONSTANTS.EVENTS.ERROR_OCCURRED, e => {
            this.handleError(e.detail);
        });
    }

    switchSection(sectionName) {
        // Hide all sections
        this.sectionElements.forEach(element => {
            element.style.display = 'none';
        });

        // Show target section
        const targetSection = this.sectionElements.get(sectionName);

        if (targetSection) {
            targetSection.style.display = 'block';
            this.currentSection = sectionName;
            this.updateNavigationState(sectionName);
            this.triggerSectionChange(sectionName);
        }
    }

    updateNavigationState(activeSection) {
        // Remove active class from all nav links
        const navLinks = document.querySelectorAll(ADMIN_CONSTANTS.SELECTORS.NAVIGATION.NAV_LINKS);

        navLinks.forEach(link => {
            link.classList.remove('active');
        });

        // Add active class to current section link
        const activeLink = document.querySelector(`[data-section="${activeSection}"]`);

        if (activeLink) {
            activeLink.classList.add('active');
        }
    }
    // eslint-disable-next-line
    createTable(tableType, data, _options = {}) {
        const tableConfig = ADMIN_CONSTANTS.TABLE_CONFIG[tableType.toUpperCase()];

        if (!tableConfig) {
            console.error(`No table configuration found for type: ${tableType}`);

            return null;
        }

        const tableElement = this.tableElements.get(`${tableType}_table`);

        if (!tableElement) {
            console.error(`Table element not found for type: ${tableType}`);

            return null;
        }

        // Clear existing content
        tableElement.innerHTML = '';

        // Create table structure
        const table = document.createElement('table');

        table.className = 'admin-table';

        // Create header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');

        tableConfig.columns.forEach(column => {
            const th = document.createElement('th');

            th.textContent = column.title;
            if (column.sortable) {
                th.classList.add('sortable');
                th.dataset.field = column.field;
            }
            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Create body
        const tbody = document.createElement('tbody');

        data.forEach(row => {
            const tr = document.createElement('tr');

            tableConfig.columns.forEach(column => {
                const td = document.createElement('td');

                if (column.field === 'actions') {
                    td.innerHTML = this.createActionButtons(row, tableType);
                } else {
                    td.textContent = row[column.field] || '';
                }
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        tableElement.appendChild(table);

        // Setup table event listeners
        this.setupTableEventListeners(table, tableType);

        return table;
    }

    createActionButtons(row, tableType) {
        const buttons = [];

        // Edit button
        buttons.push(`<button class="btn btn-sm btn-primary" data-action="edit" data-id="${row.id}">Edit</button>`);

        // Delete button
        buttons.push(`<button class="btn btn-sm btn-danger" data-action="delete" data-id="${row.id}">Delete</button>`);

        // Additional buttons based on table type
        if (tableType === 'users') {
            if (row.status === 'active') {
                // eslint-disable-next-line
                buttons.push(`<button class="btn btn-sm btn-warning" data-action="suspend" data-id="${row.id}">Suspend</button>`);
            } else {
                // eslint-disable-next-line
                buttons.push(`<button class="btn btn-sm btn-success" data-action="activate" data-id="${row.id}">Activate</button>`);
            }
        }

        return buttons.join(' ');
    }

    setupTableEventListeners(table, tableType) {
        // Sort event listeners
        const sortableHeaders = table.querySelectorAll('th.sortable');

        sortableHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const { field } = header.dataset;

                this.handleTableSort(tableType, field);
            });
        });

        // Action button event listeners
        const actionButtons = table.querySelectorAll('button[data-id]');

        actionButtons.forEach(button => {
            button.addEventListener('click', e => {
                const { action, id } = e.target.dataset;

                this.handleTableAction(action, id, tableType);
            });
        });
    }

    createModal(title, content, options = {}) {
        const modal = document.createElement('div');

        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="close-button">&times;</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                <div class="modal-footer">
                    ${options.buttons || ''}
                </div>
            </div>
        `;

        // Add event listeners
        const closeButton = modal.querySelector('.close-button');

        closeButton.addEventListener('click', () => {
            this.closeModal(modal);
        });

        // Close on backdrop click
        modal.addEventListener('click', e => {
            if (e.target === modal) {
                this.closeModal(modal);
            }
        });

        document.body.appendChild(modal);

        return modal;
    }

    closeModal(modal) {
        if (modal && modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
    }

    showLoading(element) {
        let targetElement = element;

        if (typeof element === 'string') {
            targetElement = document.querySelector(element);
        }

        if (targetElement) {
            targetElement.classList.add(ADMIN_CONSTANTS.UI_STATES.LOADING);
            targetElement.innerHTML = '<div class="loading-spinner">Loading...</div>';
        }
    }

    hideLoading(element) {
        let targetElement = element;

        if (typeof element === 'string') {
            targetElement = document.querySelector(element);
        }

        if (targetElement) {
            targetElement.classList.remove(ADMIN_CONSTANTS.UI_STATES.LOADING);
        }
    }

    showError(message, element) {
        let targetElement = element;

        if (typeof element === 'string') {
            targetElement = document.querySelector(element);
        }

        if (targetElement) {
            targetElement.innerHTML = `<div class="error-message">${message}</div>`;
        }
    }

    showSuccess(message, element) {
        let targetElement = element;

        if (typeof element === 'string') {
            targetElement = document.querySelector(element);
        }

        if (targetElement) {
            targetElement.innerHTML = `<div class="success-message">${message}</div>`;
        }
    }

    updateStats(stats) {
        const statsElements = document.querySelectorAll('.stat-card');

        statsElements.forEach(element => {
            const statType = element.dataset.stat;

            if (stats[statType]) {
                const valueElement = element.querySelector('.stat-value');

                if (valueElement) {
                    valueElement.textContent = stats[statType];
                }
            }
        });
    }

    updateMetrics(metrics) {
        const metricElements = document.querySelectorAll('.metric-card');

        metricElements.forEach(element => {
            const metricType = element.dataset.metric;

            if (metrics[metricType]) {
                const valueElement = element.querySelector('.metric-value');

                if (valueElement) {
                    valueElement.textContent = metrics[metricType];
                }
            }
        });
    }

    // Event handlers
    handleSectionChange(detail) {
        console.log('Section changed:', detail);
    }

    handleDataLoaded(detail) {
        console.log('Data loaded:', detail);
        this.hideLoading(detail.section);
    }

    handleError(detail) {
        console.error('Error occurred:', detail);
        this.showError(detail.message, detail.section);
    }

    handleTableSort(tableType, field) {
        console.log(`Table sort: ${tableType}, field: ${field}`);
        // Trigger custom event for API manager to handle
        document.dispatchEvent(new CustomEvent('admin-table-sort', {
            detail: { tableType, field }
        }));
    }

    handleTableAction(action, id, tableType) {
        console.log(`Table action: ${action}, id: ${id}, type: ${tableType}`);
        // Trigger custom event for API manager to handle
        document.dispatchEvent(new CustomEvent('admin-table-action', {
            detail: { action, id, tableType }
        }));
    }

    triggerSectionChange(sectionName) {
        document.dispatchEvent(new CustomEvent(ADMIN_CONSTANTS.EVENTS.SECTION_CHANGE, {
            detail: { section: sectionName }
        }));
    }
}

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminDOMManager;
}

// Global reference for browser
window.AdminDOMManager = AdminDOMManager;
