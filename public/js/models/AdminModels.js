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
                    validation: { min: 0.99, max: 100 }
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
                    validation: { min: 0.99, max: 500 }
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
                    validation: { min: 0.99, max: 1000 }
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
                    key: 'status',
                    title: 'Status',
                    sortable: true,
                    width: '100px',
                    formatter: value => {
                        const statusMap = {
                            active: '<span class="badge badge-success">Active</span>',
                            suspended: '<span class="badge badge-danger">Suspended</span>',
                            pending: '<span class="badge badge-warning">Pending</span>'
                        };

                        return statusMap[value] || '<span class="badge badge-success">Active</span>';
                    }
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
                        <button class="btn btn-sm btn-outline" onclick = "viewUser('${row.id}')" title = "View Details">
                            <i class="fas fa-eye"></i>
</button >
    <button class="btn btn-sm btn-outline" onclick="addCredits('${row.id}')" title="Add Credits">
        <i class="fas fa-coins"></i>
    </button>
${row.status !== 'suspended'
        ? `<button class="btn btn-sm btn-outline" onclick="suspendUser('${row.id}')" title="Suspend">
        <i class="fas fa-ban"></i>
        </button>`
        : `<button class="btn btn-sm btn-outline" onclick="unsuspendUser('${row.id}')" title="Unsuspend">
        <i class="fas fa-check"></i>
        </button>
`}
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
    }
};
// Export for usewindow.AdminModels = AdminModels;
