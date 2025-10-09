/** * Admin Dashboard Models * Declarative configuration for all admin sections */
const _AdminModels = {
    // ===============    // PAYMENTS SECTION MODEL    // =======
    payments: {
        id: 'payments',
        title: 'Site-wide Payments',
        icon: 'fas fa-money-bill-wave',
        description: 'View and manage all payment transactions across the platform',
        // Data table configuration
        table: {
            endpoint: '/admin/payments',
            columns: [
                {
                    key: 'id',
                    title: 'Payment ID',
                    sortable: true,
                    searchable: true,
                    width: '120px',
                    formatter: value => `#${value.slice(0, 8)}...`
                },
                {
                    key: 'userEmail',
                    title: 'User',
                    sortable: true,
                    searchable: true,
                    width: '200px'
                },
                {
                    key: 'amount',
                    title: 'Amount',
                    sortable: true,
                    align: 'right',
                    width: '100px',
                    formatter: value => `$${(value / 100).toFixed(2)}`
                },
                {
                    key: 'credits',
                    title: 'Credits',
                    sortable: true,
                    align: 'right',
                    width: '80px'
                },
                {
                    key: 'status',
                    title: 'Status',
                    sortable: true,
                    width: '100px',
                    formatter: value => {
                        const statusMap = {
                            completed: '<span class="badge badge-success">Completed</span>',
                            pending: '<span class="badge badge-warning">Pending</span>',
                            failed: '<span class="badge badge-danger">Failed</span>',
                            refunded: '<span class="badge badge-info">Refunded</span>'
                        };

                        return statusMap[value] || value;
                    }
                },
                {
                    key: 'createdAt',
                    title: 'Date',
                    sortable: true,
                    width: '150px',
                    formatter: value => new Date(value).toLocaleDateString()
                },
                {
                    key: 'actions',
                    title: 'Actions',
                    width: '120px',
                    formatter: (value, row) => `
<button class="btn btn-sm btn-outline" onclick="viewPayment('${row.id}')">
    <i class="fas fa-eye"></i>
</button>
${row.status === 'completed' ? `<button class="btn btn-sm btn-outline" onclick="refundPayment('${row.id}')"><i class="fas fa-undo"></i></button>` : ''}
    `
                }
            ],
            pagination: {
                pageSize: 50,
                showSizes: [25, 50, 100]
            },
            features: ['search', 'filter', 'export', 'refresh']
        },
        // Filters for the payments table
        filters: [
            {
                name: 'status',
                type: 'select',
                label: 'Status',
                options: [
                    { value: '', label: 'All Statuses' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'failed', label: 'Failed' },
                    { value: 'refunded', label: 'Refunded' }
                ]
            },
            {
                name: 'dateRange',
                type: 'date-range',
                label: 'Date Range',
                default: 'last-30-days'
            },
            {
                name: 'minAmount',
                type: 'currency',
                label: 'Min Amount',
                placeholder: '0.00'
            },
            {
                name: 'maxAmount',
                type: 'currency',
                label: 'Max Amount',
                placeholder: '999.99'
            }
        ],
        // Quick stats cards
        stats: [
            {
                title: 'Total Revenue',
                key: 'totalRevenue',
                icon: 'fas fa-dollar-sign',
                formatter: value => `$${(value / 100).toFixed(2)}`,
                color: 'green'
            },
            {
                title: 'Successful Payments',
                key: 'successfulPayments',
                icon: 'fas fa-check-circle',
                color: 'blue'
            },
            {
                title: 'Failed Payments',
                key: 'failedPayments',
                icon: 'fas fa-times-circle',
                color: 'red'
            },
            {
                title: 'Refunded Amount',
                key: 'refundedAmount',
                icon: 'fas fa-undo',
                formatter: value => `$${(value / 100).toFixed(2)}`,
                color: 'orange'
            }
        ]
    },
    // ========    // PRICING SECTION MODEL    // ========
    pricing: {
        id: 'pricing',
        title: 'Cost Per Cycle Management',
        icon: 'fas fa-calculator',
        description: 'Configure pricing for image generation and credit packages',
        // Form configuration for pricing updates
        form: {
            id: 'pricing-form',
            title: 'Update Pricing Configuration',
            layout: 'grid-2-col',
            fields: [
                {
                    name: 'openai_cost',
                    type: 'currency',
                    label: 'OpenAI Cost per Image',
                    help: 'Cost in USD for each OpenAI image generation',
                    required: true,
                    validation: {
                        min: 0.001,
                        max: 1.0,
                        step: 0.001
                    }
                },
                {
                    name: 'stability_cost',
                    type: 'currency',
                    label: 'Stability AI Cost per Image',
                    help: 'Cost in USD for each Stability AI image generation',
                    required: true,
                    validation: {
                        min: 0.001,
                        max: 1.0,
                        step: 0.001
                    }
                },
                {
                    name: 'midjourney_cost',
                    type: 'currency',
                    label: 'Midjourney Cost per Image',
                    help: 'Cost in USD for each Midjourney image generation',
                    required: true,
                    validation: {
                        min: 0.001,
                        max: 1.0,
                        step: 0.001
                    }
                },
                {
                    name: 'credit_package_1',
                    type: 'number',
                    label: 'Small Package Credits',
                    help: 'Number of credits in small package',
                    required: true,
                    validation: { min: 1, max: 1000 }
                },
                {
                    name: 'credit_package_1_price',
                    type: 'currency',
                    label: 'Small Package Price',
                    help: 'Price in USD for small credit package',
                    required: true,
                    validation: { min: 0.00, max: 100 }
                },
                {
                    name: 'credit_package_2',
                    type: 'number',
                    label: 'Medium Package Credits',
                    help: 'Number of credits in medium package',
                    required: true,
                    validation: { min: 1, max: 5000 }
                },
                {
                    name: 'credit_package_2_price',
                    type: 'currency',
                    label: 'Medium Package Price',
                    help: 'Price in USD for medium credit package',
                    required: true,
                    validation: { min: 0.00, max: 500 }
                },
                {
                    name: 'credit_package_3',
                    type: 'number',
                    label: 'Large Package Credits',
                    help: 'Number of credits in large package',
                    required: true,
                    validation: { min: 1, max: 10000 }
                },
                {
                    name: 'credit_package_3_price',
                    type: 'currency',
                    label: 'Large Package Price',
                    help: 'Price in USD for large credit package',
                    required: true,
                    validation: { min: 0.00, max: 1000 }
                },
                {
                    name: 'markup_percentage',
                    type: 'number',
                    label: 'Markup Percentage',
                    help: 'Percentage markup on base costs (e.g., 20 for 20%)',
                    required: true,
                    validation: { min: 0, max: 500, step: 1 }
                }
            ],
            actions: [
                {
                    type: 'submit',
                    label: 'Update Pricing',
                    variant: 'primary',
                    icon: 'fas fa-save'
                },
                {
                    type: 'button',
                    label: 'Preview Changes',
                    variant: 'outline',
                    icon: 'fas fa-eye',
                    onclick: 'previewPricingChanges'
                },
                {
                    type: 'button',
                    label: 'Reset to Defaults',
                    variant: 'outline',
                    icon: 'fas fa-undo',
                    onclick: 'resetPricingForm'
                },
                {
                    type: 'button',
                    label: 'Cost Calculator',
                    variant: 'outline',
                    icon: 'fas fa-calculator',
                    onclick: 'openCostCalculator'
                },
                {
                    type: 'button',
                    label: 'View Recommendations',
                    variant: 'outline',
                    icon: 'fas fa-lightbulb',
                    onclick: 'viewCostRecommendations'
                }
            ]
        },
        // Pricing history table
        historyTable: {
            endpoint: '/admin/pricing/history',
            columns: [
                {
                    key: 'version',
                    title: 'Version',
                    width: '80px'
                },
                {
                    key: 'updatedBy',
                    title: 'Updated By',
                    width: '150px'
                },
                {
                    key: 'changes',
                    title: 'Changes',
                    formatter: value => {
                        const changes = JSON.parse(value);

                        return Object.keys(changes).join(', ');
                    }
                },
                {
                    key: 'createdAt',
                    title: 'Date',
                    width: '150px',
                    formatter: value => new Date(value).toLocaleString()
                },
                {
                    key: 'actions',
                    title: 'Actions',
                    width: '100px',
                    formatter: (value, row) => `
<button class="btn btn-sm btn-outline" onclick="rollbackPricing('${row.id}')">
    <i class="fas fa-undo"></i> Rollback
</button>
    `
                }
            ]
        }
    },
    // ==============    // ACTIVITY SECTION MODEL    // ================
    activity: {
        id: 'activity',
        title: 'Site Activity',
        icon: 'fas fa-chart-line',
        description: 'Monitor real-time activity and system performance',
        // Activity metrics
        metrics: [
            {
                title: 'Images Generated Today',
                key: 'imagesGeneratedToday',
                icon: 'fas fa-image',
                color: 'blue',
                refreshInterval: 30000 // 30 seconds
            },
            {
                title: 'Active Users',
                key: 'activeUsers',
                icon: 'fas fa-users',
                color: 'green',
                refreshInterval: 60000 // 1 minute
            },
            {
                title: 'Error Rate',
                key: 'errorRate',
                icon: 'fas fa-exclamation-triangle',
                color: 'red',
                formatter: value => `${value.toFixed(2)}%`,
                refreshInterval: 30000
            },
            {
                title: 'Average Response Time',
                key: 'avgResponseTime',
                icon: 'fas fa-clock',
                color: 'orange',
                formatter: value => `${value}ms`,
                refreshInterval: 30000
            }
        ],
        // Charts configuration
        charts: [
            {
                id: 'images-chart',
                title: 'Image Generation Trends',
                type: 'line',
                endpoint: '/admin/activity/metrics/images',
                timeRanges: ['1h', '6h', '24h', '7d'],
                defaultRange: '24h',
                refreshInterval: 60000
            },
            {
                id: 'users-chart',
                title: 'User Activity',
                type: 'area',
                endpoint: '/admin/activity/metrics/users',
                timeRanges: ['1h', '6h', '24h', '7d'],
                defaultRange: '24h',
                refreshInterval: 60000
            },
            {
                id: 'revenue-chart',
                title: 'Revenue Trends',
                type: 'bar',
                endpoint: '/admin/activity/metrics/revenue',
                timeRanges: ['24h', '7d', '30d'],
                defaultRange: '7d',
                refreshInterval: 300000 // 5 minutes
            }
        ],
        // System health indicators
        health: {
            endpoint: '/admin/activity/health',
            refreshInterval: 15000, // 15 seconds
            indicators: [
                {
                    key: 'database',
                    label: 'Database',
                    icon: 'fas fa-database'
                },
                {
                    key: 'redis',
                    label: 'Cache',
                    icon: 'fas fa-memory'
                },
                {
                    key: 'stripe',
                    label: 'Payments',
                    icon: 'fas fa-credit-card'
                },
                {
                    key: 'openai',
                    label: 'OpenAI',
                    icon: 'fas fa-robot'
                },
                {
                    key: 'stability',
                    label: 'Stability AI',
                    icon: 'fas fa-magic'
                }
            ]
        }
    },
    // ================    // USER MANAGEMENT SECTION MODEL    // ================
    users: {
        id: 'users',
        title: 'User Management',
        icon: 'fas fa-users',
        description: 'Manage user accounts, credits, and permissions',
        // Users table configuration
        table: {
            endpoint: '/admin/users',
            columns: [
                {
                    key: 'id',
                    title: 'User ID',
                    width: '100px',
                    formatter: value => `#${value.slice(0, 8)}`
                },
                {
                    key: 'email',
                    title: 'Email',
                    sortable: true,
                    searchable: true,
                    width: '250px'
                },
                {
                    key: 'username',
                    title: 'Username',
                    sortable: true,
                    searchable: true,
                    width: '150px'
                },
                {
                    key: 'creditBalance',
                    title: 'Credits',
                    sortable: true,
                    align: 'right',
                    width: '100px',
                    formatter: value => value || 0
                },
                {
                    key: 'totalGenerated',
                    title: 'Images',
                    sortable: true,
                    align: 'right',
                    width: '80px'
                },
                {
                    key: 'isAdmin',
                    title: 'Admin',
                    width: '80px',
                    formatter: value => (value ? '<span class="badge badge-primary">Admin</span>' : '')
                },
                {
                    key: 'isSuspended',
                    title: 'Status',
                    sortable: true,
                    width: '100px',
                    formatter: value => (value
                        ? '<span class="badge badge-danger">Suspended</span>'
                        : '<span class="badge badge-success">Active</span>')
                },
                {
                    key: 'createdAt',
                    title: 'Joined',
                    sortable: true,
                    width: '120px',
                    formatter: value => new Date(value).toLocaleDateString()
                },
                {
                    key: 'actions',
                    title: 'Actions',
                    width: '200px',
                    formatter: (value, row) => `
                        <button class="btn btn-sm btn-outline" onclick="sendCredits('${row.id}')" title="Send Credits">
                            <i class="fas fa-coins"></i>
                        </button>
                        ${!row.isSuspended && !row.isAdmin
        ? `<button class="btn btn-sm btn-outline btn-danger" onclick="suspendUser('${row.id}')" title="Suspend User">
                                <i class="fas fa-ban"></i>
                            </button>`
        : row.isSuspended
            ? `<button class="btn btn-sm btn-outline btn-success" onclick="unsuspendUser('${row.id}')" title="Unsuspend User">
                                    <i class="fas fa-check"></i>
                                </button>`
            : ''
}
                    `
                }
            ],
            pagination: {
                pageSize: 25,
                showSizes: [25, 50, 100]
            },
            features: ['search', 'filter', 'bulk-actions', 'export']
        },
        // User filters
        filters: [
            {
                name: 'status',
                type: 'select',
                label: 'Status',
                options: [
                    { value: '', label: 'All Users' },
                    { value: 'active', label: 'Active' },
                    { value: 'suspended', label: 'Suspended' },
                    { value: 'pending', label: 'Pending' }
                ]
            },
            {
                name: 'isAdmin',
                type: 'select',
                label: 'User Type',
                options: [
                    { value: '', label: 'All Types' },
                    { value: 'true', label: 'Admins Only' },
                    { value: 'false', label: 'Regular Users' }
                ]
            },
            {
                name: 'minCredits',
                type: 'number',
                label: 'Min Credits',
                placeholder: '0'
            },
            {
                name: 'joinedAfter',
                type: 'date',
                label: 'Joined After'
            }
        ],
        // Quick action forms
        quickActions: {
            addCredits: {
                title: 'Add Credits to User',
                fields: [
                    {
                        name: 'amount',
                        type: 'number',
                        label: 'Credits Amount',
                        required: true,
                        validation: { min: 1, max: 10000 }
                    },
                    {
                        name: 'reason',
                        type: 'textarea',
                        label: 'Reason',
                        required: true,
                        placeholder: 'Reason for adding credits...'
                    }
                ]
            },
            suspendUser: {
                title: 'Suspend User Account',
                fields: [
                    {
                        name: 'reason',
                        type: 'textarea',
                        label: 'Suspension Reason',
                        required: true,
                        placeholder: 'Reason for suspension...'
                    }
                ]
            }
        },
        // Bulk actions
        bulkActions: [
            {
                id: 'suspend',
                label: 'Suspend Selected',
                icon: 'fas fa-ban',
                variant: 'danger'
            },
            {
                id: 'unsuspend',
                label: 'Unsuspend Selected',
                icon: 'fas fa-check',
                variant: 'success'
            },
            {
                id: 'export',
                label: 'Export Selected',
                icon: 'fas fa-download',
                variant: 'outline'
            }
        ]
    },

    // ========    // PACKAGES SECTION MODEL    // ========
    packages: {
        id: 'packages',
        title: 'Credit Package Management',
        icon: 'fas fa-boxes',
        description: 'Manage credit packages and pricing',
        type: 'data-table',
        api: '/api/admin/packages',
        permissions: ['admin'],
        features: ['create', 'edit', 'delete', 'analytics'],

        // Table configuration
        table: {
            columns: [
                {
                    key: 'id',
                    title: 'Package ID',
                    width: '120px',
                    sortable: true
                },
                {
                    key: 'name',
                    title: 'Package Name',
                    width: '200px',
                    sortable: true
                },
                {
                    key: 'credits',
                    title: 'Credits',
                    width: '100px',
                    sortable: true,
                    type: 'number'
                },
                {
                    key: 'price',
                    title: 'Price',
                    width: '120px',
                    sortable: true,
                    type: 'currency',
                    format: 'cents'
                },
                {
                    key: 'pricePerCredit',
                    title: 'Price/Credit',
                    width: '120px',
                    sortable: true,
                    type: 'currency',
                    computed: true
                },
                {
                    key: 'popular',
                    title: 'Popular',
                    width: '100px',
                    type: 'boolean',
                    format: 'badge'
                },
                {
                    key: 'created_at',
                    title: 'Created',
                    width: '150px',
                    sortable: true,
                    type: 'datetime'
                }
            ],
            actions: [
                {
                    type: 'edit',
                    label: 'Edit Package',
                    icon: 'fas fa-edit',
                    variant: 'primary'
                },
                {
                    type: 'delete',
                    label: 'Delete Package',
                    icon: 'fas fa-trash',
                    variant: 'danger'
                }
            ]
        },

        // Create/Edit form configuration
        form: {
            id: 'package-form',
            title: 'Package Configuration',
            layout: 'grid-2-col',
            fields: [
                {
                    name: 'id',
                    type: 'text',
                    label: 'Package ID',
                    help: 'Unique identifier for the package (e.g., starter, pro, enterprise)',
                    required: true,
                    validation: {
                        pattern: '^[a-z0-9_]+$',
                        message: 'Only lowercase letters, numbers, and underscores allowed'
                    }
                },
                {
                    name: 'name',
                    type: 'text',
                    label: 'Package Name',
                    help: 'Display name for the package',
                    required: true,
                    validation: { minLength: 2, maxLength: 50 }
                },
                {
                    name: 'credits',
                    type: 'number',
                    label: 'Number of Credits',
                    help: 'Credits included in this package',
                    required: true,
                    validation: { min: 1, max: 10000, step: 1 }
                },
                {
                    name: 'price',
                    type: 'currency',
                    label: 'Package Price',
                    help: 'Price in USD for this package',
                    required: true,
                    validation: { min: 0.00, max: 1000, step: 0.01 }
                },
                {
                    name: 'description',
                    type: 'textarea',
                    label: 'Description',
                    help: 'Package description shown to users',
                    required: true,
                    validation: { minLength: 10, maxLength: 200 }
                },
                {
                    name: 'popular',
                    type: 'boolean',
                    label: 'Popular Package',
                    help: 'Mark as popular to highlight in UI',
                    required: false
                }
            ],
            actions: [
                {
                    type: 'submit',
                    label: 'Save Package',
                    variant: 'primary',
                    icon: 'fas fa-save'
                },
                {
                    type: 'button',
                    label: 'Preview Package',
                    variant: 'outline',
                    icon: 'fas fa-eye',
                    onclick: 'previewPackage'
                },
                {
                    type: 'button',
                    label: 'Calculate Profitability',
                    variant: 'outline',
                    icon: 'fas fa-calculator',
                    onclick: 'calculatePackageProfitability'
                }
            ]
        },

        // Analytics configuration
        analytics: {
            endpoint: '/api/admin/packages/analytics',
            charts: [
                {
                    type: 'bar',
                    title: 'Package Popularity',
                    dataKey: 'popularPackages'
                },
                {
                    type: 'line',
                    title: 'Price Range Analysis',
                    dataKey: 'priceRange'
                }
            ]
        }
    },

    // ========    // COST ANALYSIS SECTION MODEL    // ========
    costAnalysis: {
        id: 'cost-analysis',
        title: 'Cost Analysis & Calculator',
        icon: 'fas fa-chart-line',
        description: 'Analyze generation costs and pricing strategies',
        type: 'dashboard',
        permissions: ['admin'],
        features: ['analysis', 'calculator', 'recommendations'],

        // Dashboard widgets
        widgets: [
            {
                id: 'provider-breakdown',
                title: 'Provider Cost Breakdown',
                type: 'table',
                api: '/api/admin/cost-analysis/providers',
                refreshInterval: 30000,
                size: 'large'
            },
            {
                id: 'cost-calculator',
                title: 'Generation Cost Calculator',
                type: 'form',
                api: '/api/admin/cost-analysis/calculate',
                size: 'medium'
            },
            {
                id: 'recommendations',
                title: 'Cost Recommendations',
                type: 'data',
                api: '/api/admin/cost-analysis/recommendations',
                size: 'medium'
            },
            {
                id: 'package-profitability',
                title: 'Package Profitability',
                type: 'table',
                api: '/api/admin/cost-analysis/packages',
                size: 'large'
            }
        ],

        // Cost calculator form
        calculator: {
            id: 'cost-calculator-form',
            title: 'Calculate Generation Cost',
            fields: [
                {
                    name: 'provider',
                    type: 'select',
                    label: 'AI Provider',
                    help: 'Select the AI image generation provider',
                    required: true,
                    options: [
                        { value: 'dalle', label: 'DALL-E 3 (Premium)' },
                        { value: 'dalle2', label: 'DALL-E 2 (Premium)' },
                        { value: 'flux', label: 'Flux (Premium)' },
                        { value: 'juggernaut', label: 'Juggernaut XL (Premium)' },
                        { value: 'redshift', label: 'Redshift (Mid-tier)' },
                        { value: 'dreamshaper', label: 'DreamShaper (Standard)' },
                        { value: 'tshirt', label: 'T-Shirt (Budget)' }
                    ]
                },
                {
                    name: 'multiplier',
                    type: 'boolean',
                    label: 'Use Multiplier',
                    help: 'Apply multiplier for enhanced generation',
                    required: false
                },
                {
                    name: 'mixup',
                    type: 'boolean',
                    label: 'Use Mixup',
                    help: 'Apply mixup for creative combinations',
                    required: false
                },
                {
                    name: 'mashup',
                    type: 'boolean',
                    label: 'Use Mashup',
                    help: 'Apply mashup for style blending',
                    required: false
                }
            ],
            actions: [
                {
                    type: 'submit',
                    label: 'Calculate Cost',
                    variant: 'primary',
                    icon: 'fas fa-calculator'
                },
                {
                    type: 'button',
                    label: 'Compare Providers',
                    variant: 'outline',
                    icon: 'fas fa-balance-scale',
                    onclick: 'compareProviders'
                }
            ]
        },

        // Analysis views
        views: [
            {
                id: 'overview',
                title: 'Cost Overview',
                api: '/api/admin/cost-analysis',
                type: 'chart'
            },
            {
                id: 'providers',
                title: 'Provider Costs',
                api: '/api/admin/cost-analysis/providers',
                type: 'table'
            },
            {
                id: 'packages',
                title: 'Package Profitability',
                api: '/api/admin/cost-analysis/packages',
                type: 'table'
            },
            {
                id: 'recommendations',
                title: 'Recommendations',
                api: '/api/admin/cost-analysis/recommendations',
                type: 'data'
            }
        ]
    },

    // ===============
    // PROMO CODES SECTION MODEL
    // ===============
    promoCodes: {
        id: 'promoCodes',
        title: 'Promo Codes',
        icon: 'fas fa-ticket-alt',
        description: 'Manage promotional codes for credit distribution and user acquisition',

        // Data table configuration
        table: {
            endpoint: '/admin/promo-codes',
            columns: [
                {
                    key: 'code',
                    title: 'Promo Code',
                    sortable: true,
                    searchable: true,
                    width: '150px',
                    formatter: value => `<code class="promo-code">${value}</code>`
                },
                {
                    key: 'credits',
                    title: 'Credits',
                    sortable: true,
                    align: 'right',
                    width: '100px',
                    formatter: value => `${value.toLocaleString()}`
                },
                {
                    key: 'redemptionCount',
                    title: 'Used',
                    sortable: true,
                    align: 'right',
                    width: '80px',
                    formatter: (value, row) => {
                        const max = row.maxRedemptions;

                        if (max) {
                            return `${value}/${max}`;
                        }

                        return `${value}∞`;
                    }
                },
                {
                    key: 'status',
                    title: 'Status',
                    sortable: true,
                    width: '120px',
                    formatter: value => {
                        const statusMap = {
                            active: '<span class="badge badge-success">Active</span>',
                            expired: '<span class="badge badge-warning">Expired</span>',
                            exhausted: '<span class="badge badge-info">Exhausted</span>',
                            disabled: '<span class="badge badge-danger">Disabled</span>'
                        };

                        return statusMap[value] || `<span class="badge badge-secondary">${value}</span>`;
                    }
                },
                {
                    key: 'expiresAt',
                    title: 'Expires',
                    sortable: true,
                    width: '120px',
                    formatter: value => {
                        if (!value) {
                            return '<span class="text-gray-400">Never</span>';
                        }
                        const date = new Date(value);
                        const now = new Date();
                        const isExpired = date <= now;

                        return `<span class="${isExpired ? 'text-red-400' : 'text-gray-300'}">
                            ${date.toLocaleDateString()}
                        </span>`;
                    }
                },
                {
                    key: 'createdAt',
                    title: 'Created',
                    sortable: true,
                    width: '120px',
                    formatter: value => new Date(value).toLocaleDateString()
                }
            ],
            actions: [
                {
                    type: 'button',
                    label: 'View Stats',
                    variant: 'outline',
                    icon: 'fas fa-chart-bar',
                    onclick: 'viewPromoStats',
                    size: 'sm'
                },
                {
                    type: 'button',
                    label: 'Edit',
                    variant: 'outline',
                    icon: 'fas fa-edit',
                    onclick: 'editPromoCode',
                    size: 'sm'
                },
                {
                    type: 'button',
                    label: 'Delete',
                    variant: 'danger',
                    icon: 'fas fa-trash',
                    onclick: 'deletePromoCode',
                    size: 'sm',
                    confirm: true
                }
            ]
        },

        // Form configuration for creating/editing promo codes
        form: {
            title: 'Promo Code',
            endpoint: '/admin/promo-codes',
            fields: [
                {
                    name: 'code',
                    type: 'text',
                    label: 'Promo Code',
                    placeholder: 'e.g., WELCOME2024',
                    required: true,
                    help: 'Unique code (3-50 characters, letters and numbers only)',
                    validation: {
                        minLength: 3,
                        maxLength: 50,
                        pattern: '^[A-Z0-9]+$',
                        message: 'Code must be 3-50 characters, letters and numbers only'
                    }
                },
                {
                    name: 'credits',
                    type: 'number',
                    label: 'Credits Amount',
                    placeholder: '10',
                    required: true,
                    min: 1,
                    max: 10000,
                    help: 'Number of credits to award (1-10,000)'
                },
                {
                    name: 'maxRedemptions',
                    type: 'number',
                    label: 'Max Redemptions',
                    placeholder: 'Leave empty for unlimited',
                    required: false,
                    min: 1,
                    help: 'Maximum number of times this code can be used (leave empty for unlimited)'
                },
                {
                    name: 'expiresAt',
                    type: 'datetime-local',
                    label: 'Expiry Date',
                    required: false,
                    help: 'When this promo code expires (leave empty for no expiry)'
                },
                {
                    name: 'description',
                    type: 'textarea',
                    label: 'Description',
                    placeholder: 'Optional description for internal use',
                    required: false,
                    rows: 3,
                    help: 'Internal notes about this promo code'
                },
                {
                    name: 'isActive',
                    type: 'boolean',
                    label: 'Active',
                    help: 'Whether this promo code is currently active',
                    required: false,
                    defaultValue: true
                }
            ],
            actions: [
                {
                    type: 'submit',
                    label: 'Create Promo Code',
                    variant: 'primary',
                    icon: 'fas fa-plus'
                },
                {
                    type: 'button',
                    label: 'Generate Code',
                    variant: 'outline',
                    icon: 'fas fa-random',
                    onclick: 'generatePromoCode'
                }
            ]
        },

        // Stats views
        views: [
            {
                id: 'overview',
                title: 'Promo Code Overview',
                api: '/api/admin/promo-codes/stats',
                type: 'cards'
            },
            {
                id: 'usage',
                title: 'Usage Statistics',
                api: '/api/admin/promo-codes/usage',
                type: 'chart'
            },
            {
                id: 'redemptions',
                title: 'Recent Redemptions',
                api: '/api/admin/promo-codes/redemptions',
                type: 'table'
            }
        ]
    }
};

// Export for use
window.AdminModels = _AdminModels;
