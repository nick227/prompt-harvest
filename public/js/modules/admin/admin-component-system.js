/**
 * Admin Component System - Modular, Reusable Components
 * Modern, Dark, Studio-Quality Admin Interface Components
 *
 * This system provides a comprehensive set of reusable components
 * for building admin interfaces with consistent design patterns.
 */

class AdminComponentSystem {
    constructor() {
        this.components = new Map();
        this.theme = 'dark';
        this.initializeComponents();
    }

    /**
     * Initialize all component templates and configurations
     */
    initializeComponents() {
        this.components.set('button', this.createButtonComponent());
        this.components.set('card', this.createCardComponent());
        this.components.set('table', this.createTableComponent());
        this.components.set('modal', this.createModalComponent());
        this.components.set('badge', this.createBadgeComponent());
        this.components.set('input', this.createInputComponent());
        this.components.set('tabs', this.createTabsComponent());
        this.components.set('stats', this.createStatsComponent());
        this.components.set('loading', this.createLoadingComponent());
        this.components.set('empty', this.createEmptyComponent());
    }

    /**
     * Create Button Component
     */
    createButtonComponent() {
        return {
            template: (config) => {
                const {
                    text = 'Button',
                    variant = 'primary',
                    size = 'base',
                    icon = null,
                    disabled = false,
                    loading = false,
                    onClick = null,
                    className = '',
                    id = null
                } = config;

                const buttonClasses = [
                    'btn',
                    `btn-${variant}`,
                    `btn-${size}`,
                    className
                ].filter(Boolean).join(' ');

                const iconHtml = icon ? `<i class="${icon}"></i>` : '';
                const loadingHtml = loading ? '<div class="loading-spinner loading-spinner-sm"></div>' : '';
                const content = loading ? loadingHtml : `${iconHtml}${text}`;

                return `
                    <button
                        class="${buttonClasses}"
                        ${disabled ? 'disabled' : ''}
                        ${id ? `id="${id}"` : ''}
                        ${onClick ? `onclick="${onClick}"` : ''}
                    >
                        ${content}
                    </button>
                `;
            },
            render: (container, config) => {
                const html = this.components.get('button').template(config);
                if (typeof container === 'string') {
                    document.getElementById(container).innerHTML = html;
                } else {
                    container.innerHTML = html;
                }
            }
        };
    }

    /**
     * Create Card Component
     */
    createCardComponent() {
        return {
            template: (config) => {
                const {
                    title = '',
                    subtitle = '',
                    content = '',
                    footer = '',
                    size = 'base',
                    className = '',
                    id = null
                } = config;

                const cardClasses = [
                    'card',
                    `card-${size}`,
                    className
                ].filter(Boolean).join(' ');

                const headerHtml = title || subtitle ? `
                    <div class="card-header">
                        ${title ? `<h3 class="card-title">${title}</h3>` : ''}
                        ${subtitle ? `<p class="card-subtitle">${subtitle}</p>` : ''}
                    </div>
                ` : '';

                const bodyHtml = content ? `<div class="card-body">${content}</div>` : '';
                const footerHtml = footer ? `<div class="card-footer">${footer}</div>` : '';

                return `
                    <div class="${cardClasses}" ${id ? `id="${id}"` : ''}>
                        ${headerHtml}
                        ${bodyHtml}
                        ${footerHtml}
                    </div>
                `;
            },
            render: (container, config) => {
                const html = this.components.get('card').template(config);
                if (typeof container === 'string') {
                    document.getElementById(container).innerHTML = html;
                } else {
                    container.innerHTML = html;
                }
            }
        };
    }

    /**
     * Create Table Component
     */
    createTableComponent() {
        return {
            template: (config) => {
                const {
                    headers = [],
                    data = [],
                    sortable = true,
                    className = '',
                    id = null
                } = config;

                const tableClasses = [
                    'admin-table',
                    className
                ].filter(Boolean).join(' ');

                const headerHtml = headers.map(header => {
                    const sortableClass = sortable && header.sortable !== false ? 'sortable' : '';
                    const sortIcon = sortable && header.sortable !== false ? '<i class="fas fa-sort sort-icon"></i>' : '';
                    return `
                        <th class="${sortableClass}" data-sort="${header.key || ''}">
                            ${header.label}
                            ${sortIcon}
                        </th>
                    `;
                }).join('');

                const rowsHtml = data.map(row => {
                    const cellsHtml = headers.map(header => {
                        const value = this.getNestedValue(row, header.key);
                        return `<td class="table-cell">${value}</td>`;
                    }).join('');
                    return `<tr>${cellsHtml}</tr>`;
                }).join('');

                return `
                    <div class="table-wrapper">
                        <table class="${tableClasses}" ${id ? `id="${id}"` : ''}>
                            <thead>
                                <tr>${headerHtml}</tr>
                            </thead>
                            <tbody>
                                ${rowsHtml}
                            </tbody>
                        </table>
                    </div>
                `;
            },
            render: (container, config) => {
                const html = this.components.get('table').template(config);
                if (typeof container === 'string') {
                    document.getElementById(container).innerHTML = html;
                } else {
                    container.innerHTML = html;
                }
                this.attachTableEvents(container, config);
            },
            attachTableEvents: (container, config) => {
                const table = container.querySelector('.admin-table');
                if (!table) return;

                // Sort functionality
                const sortableHeaders = table.querySelectorAll('th.sortable');
                sortableHeaders.forEach(header => {
                    header.addEventListener('click', () => {
                        const sortKey = header.dataset.sort;
                        if (sortKey) {
                            this.sortTable(table, sortKey);
                        }
                    });
                });
            },
            sortTable: (table, key) => {
                const tbody = table.querySelector('tbody');
                const rows = Array.from(tbody.querySelectorAll('tr'));

                rows.sort((a, b) => {
                    const aVal = this.getNestedValue(a, key);
                    const bVal = this.getNestedValue(b, key);
                    return aVal.localeCompare(bVal);
                });

                rows.forEach(row => tbody.appendChild(row));
            }
        };
    }

    /**
     * Create Modal Component
     */
    createModalComponent() {
        return {
            template: (config) => {
                const {
                    title = 'Modal',
                    content = '',
                    footer = '',
                    size = 'base',
                    closable = true,
                    className = '',
                    id = null
                } = config;

                const modalClasses = [
                    'modal',
                    `modal-${size}`,
                    className
                ].filter(Boolean).join(' ');

                const closeButton = closable ? `
                    <button class="modal-close" onclick="this.closest('.modal').classList.remove('show')">
                        <i class="fas fa-times"></i>
                    </button>
                ` : '';

                return `
                    <div class="modal-backdrop" ${id ? `id="${id}-backdrop"` : ''}>
                        <div class="${modalClasses}" ${id ? `id="${id}"` : ''}>
                            <div class="modal-header">
                                <h3 class="modal-title">${title}</h3>
                                ${closeButton}
                            </div>
                            <div class="modal-body">
                                ${content}
                            </div>
                            ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
                        </div>
                    </div>
                `;
            },
            render: (container, config) => {
                const html = this.components.get('modal').template(config);
                if (typeof container === 'string') {
                    document.getElementById(container).innerHTML = html;
                } else {
                    container.innerHTML = html;
                }
                this.attachModalEvents(container, config);
            },
            show: (modalId) => {
                const modal = document.getElementById(modalId);
                if (modal) {
                    modal.classList.add('show');
                }
            },
            hide: (modalId) => {
                const modal = document.getElementById(modalId);
                if (modal) {
                    modal.classList.remove('show');
                }
            },
            attachModalEvents: (container, config) => {
                const backdrop = container.querySelector('.modal-backdrop');
                if (backdrop) {
                    backdrop.addEventListener('click', (e) => {
                        if (e.target === backdrop) {
                            this.hide(config.id);
                        }
                    });
                }
            }
        };
    }

    /**
     * Create Badge Component
     */
    createBadgeComponent() {
        return {
            template: (config) => {
                const {
                    text = 'Badge',
                    variant = 'primary',
                    icon = null,
                    className = ''
                } = config;

                const badgeClasses = [
                    'badge',
                    `badge-${variant}`,
                    className
                ].filter(Boolean).join(' ');

                const iconHtml = icon ? `<i class="${icon}"></i>` : '';

                return `<span class="${badgeClasses}">${iconHtml}${text}</span>`;
            },
            render: (container, config) => {
                const html = this.components.get('badge').template(config);
                if (typeof container === 'string') {
                    document.getElementById(container).innerHTML = html;
                } else {
                    container.innerHTML = html;
                }
            }
        };
    }

    /**
     * Create Input Component
     */
    createInputComponent() {
        return {
            template: (config) => {
                const {
                    type = 'text',
                    label = '',
                    placeholder = '',
                    value = '',
                    required = false,
                    disabled = false,
                    error = '',
                    help = '',
                    size = 'base',
                    className = '',
                    id = null
                } = config;

                const inputClasses = [
                    'input',
                    `input-${size}`,
                    className
                ].filter(Boolean).join(' ');

                const labelHtml = label ? `<label class="input-label">${label}</label>` : '';
                const errorHtml = error ? `<div class="input-error">${error}</div>` : '';
                const helpHtml = help ? `<div class="input-help">${help}</div>` : '';

                return `
                    <div class="input-group">
                        ${labelHtml}
                        <input
                            type="${type}"
                            class="${inputClasses}"
                            placeholder="${placeholder}"
                            value="${value}"
                            ${required ? 'required' : ''}
                            ${disabled ? 'disabled' : ''}
                            ${id ? `id="${id}"` : ''}
                        />
                        ${errorHtml}
                        ${helpHtml}
                    </div>
                `;
            },
            render: (container, config) => {
                const html = this.components.get('input').template(config);
                if (typeof container === 'string') {
                    document.getElementById(container).innerHTML = html;
                } else {
                    container.innerHTML = html;
                }
            }
        };
    }

    /**
     * Create Tabs Component
     */
    createTabsComponent() {
        return {
            template: (config) => {
                const {
                    tabs = [],
                    activeTab = 0,
                    className = '',
                    id = null
                } = config;

                const tabsClasses = [
                    'admin-tabs-container',
                    className
                ].filter(Boolean).join(' ');

                const tabsHtml = tabs.map((tab, index) => `
                    <button
                        class="tab-btn ${index === activeTab ? 'active' : ''}"
                        data-tab="${index}"
                        onclick="AdminComponentSystem.getInstance().switchTab('${id}', ${index})"
                    >
                        ${tab.icon ? `<i class="${tab.icon}"></i>` : ''}
                        <span>${tab.label}</span>
                    </button>
                `).join('');

                const contentHtml = tabs.map((tab, index) => `
                    <div class="tab-panel ${index === activeTab ? 'active' : ''}" data-tab="${index}">
                        ${tab.content}
                    </div>
                `).join('');

                return `
                    <div class="${tabsClasses}" ${id ? `id="${id}"` : ''}>
                        <div class="admin-tabs">
                            ${tabsHtml}
                        </div>
                        <div class="tab-content">
                            ${contentHtml}
                        </div>
                    </div>
                `;
            },
            render: (container, config) => {
                const html = this.components.get('tabs').template(config);
                if (typeof container === 'string') {
                    document.getElementById(container).innerHTML = html;
                } else {
                    container.innerHTML = html;
                }
            },
            switchTab: (tabsId, tabIndex) => {
                const tabsContainer = document.getElementById(tabsId);
                if (!tabsContainer) return;

                // Update tab buttons
                const tabButtons = tabsContainer.querySelectorAll('.tab-btn');
                tabButtons.forEach((btn, index) => {
                    btn.classList.toggle('active', index === tabIndex);
                });

                // Update tab panels
                const tabPanels = tabsContainer.querySelectorAll('.tab-panel');
                tabPanels.forEach((panel, index) => {
                    panel.classList.toggle('active', index === tabIndex);
                });
            }
        };
    }

    /**
     * Create Stats Component
     */
    createStatsComponent() {
        return {
            template: (config) => {
                const {
                    stats = [],
                    className = '',
                    id = null
                } = config;

                const statsClasses = [
                    'stats-grid',
                    className
                ].filter(Boolean).join(' ');

                const statsHtml = stats.map(stat => `
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="${stat.icon}"></i>
                        </div>
                        <div class="stat-content">
                            <div class="stat-value">${stat.value}</div>
                            <div class="stat-label">${stat.label}</div>
                        </div>
                    </div>
                `).join('');

                return `<div class="${statsClasses}" ${id ? `id="${id}"` : ''}>${statsHtml}</div>`;
            },
            render: (container, config) => {
                const html = this.components.get('stats').template(config);
                if (typeof container === 'string') {
                    document.getElementById(container).innerHTML = html;
                } else {
                    container.innerHTML = html;
                }
            }
        };
    }

    /**
     * Create Loading Component
     */
    createLoadingComponent() {
        return {
            template: (config) => {
                const {
                    text = 'Loading...',
                    size = 'base',
                    type = 'spinner',
                    className = ''
                } = config;

                const loadingClasses = [
                    'loading-placeholder',
                    className
                ].filter(Boolean).join(' ');

                const spinnerHtml = type === 'spinner' ?
                    `<div class="loading-spinner loading-spinner-${size}"></div>` :
                    `<div class="loading-dots"></div>`;

                return `
                    <div class="${loadingClasses}">
                        ${spinnerHtml}
                        <span>${text}</span>
                    </div>
                `;
            },
            render: (container, config) => {
                const html = this.components.get('loading').template(config);
                if (typeof container === 'string') {
                    document.getElementById(container).innerHTML = html;
                } else {
                    container.innerHTML = html;
                }
            }
        };
    }

    /**
     * Create Empty State Component
     */
    createEmptyComponent() {
        return {
            template: (config) => {
                const {
                    icon = 'fas fa-inbox',
                    title = 'No Data',
                    message = 'There is no data to display.',
                    action = null,
                    className = ''
                } = config;

                const emptyClasses = [
                    'no-data',
                    className
                ].filter(Boolean).join(' ');

                const actionHtml = action ? `
                    <button class="btn btn-primary" onclick="${action.onClick}">
                        ${action.icon ? `<i class="${action.icon}"></i>` : ''}
                        ${action.text}
                    </button>
                ` : '';

                return `
                    <div class="${emptyClasses}">
                        <div class="no-data-message">
                            <i class="${icon}"></i>
                            <h3>${title}</h3>
                            <p>${message}</p>
                            ${actionHtml}
                        </div>
                    </div>
                `;
            },
            render: (container, config) => {
                const html = this.components.get('empty').template(config);
                if (typeof container === 'string') {
                    document.getElementById(container).innerHTML = html;
                } else {
                    container.innerHTML = html;
                }
            }
        };
    }

    /**
     * Utility method to get nested object values
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj) || '';
    }

    /**
     * Get component by name
     */
    getComponent(name) {
        return this.components.get(name);
    }

    /**
     * Render component
     */
    render(componentName, container, config) {
        const component = this.getComponent(componentName);
        if (component && component.render) {
            component.render(container, config);
        } else {
            console.error(`Component "${componentName}" not found`);
        }
    }

    /**
     * Singleton pattern
     */
    static getInstance() {
        if (!AdminComponentSystem.instance) {
            AdminComponentSystem.instance = new AdminComponentSystem();
        }
        return AdminComponentSystem.instance;
    }
}

// Initialize the component system
window.AdminComponentSystem = AdminComponentSystem;
window.adminComponents = AdminComponentSystem.getInstance();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminComponentSystem;
}
