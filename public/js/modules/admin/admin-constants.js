const ADMIN_CONSTANTS = {
    // DOM Selectors
    SELECTORS: {
        SECTIONS: {
            DASHBOARD: '#dashboard-section',
            USERS: '#users-section',
            IMAGES: '#images-section',
            PROVIDERS: '#providers-section',
            SETTINGS: '#settings-section',
            ANALYTICS: '#analytics-section',
            LOGS: '#logs-section',
            SYSTEM: '#system-section',
            MESSAGES: '#messages-section'
        },
        NAVIGATION: {
            NAV_LINKS: '.admin-nav-link',
            ACTIVE_LINK: '.admin-nav-link.active',
            SECTION_CONTENT: '.admin-section-content'
        },
        TABLES: {
            USERS_TABLE: '#users-table',
            IMAGES_TABLE: '#images-table',
            PROVIDERS_TABLE: '#providers-table',
            LOGS_TABLE: '#logs-table',
            SYSTEM_TABLE: '#system-table'
        },
        FORMS: {
            USER_FORM: '#user-form',
            PROVIDER_FORM: '#provider-form',
            SETTINGS_FORM: '#settings-form'
        },
        UI: {
            LOADING_SPINNER: '.loading-spinner',
            ERROR_MESSAGE: '.error-message',
            SUCCESS_MESSAGE: '.success-message',
            MODAL: '.modal',
            MODAL_CONTENT: '.modal-content',
            CLOSE_BUTTON: '.close-button'
        }
    },

    // API Endpoints
    ENDPOINTS: {
        USERS: '/api/admin/users',
        USER_DETAILS: '/api/admin/users/{id}',
        USER_UPDATE: '/api/admin/users/{id}/update',
        USER_DELETE: '/api/admin/users/{id}/delete',
        USER_BULK_ACTION: '/api/admin/users/bulk-action',
        IMAGES: '/api/admin/images',
        IMAGE_DETAILS: '/api/admin/images/{id}',
        IMAGE_DELETE: '/api/admin/images/{id}/delete',
        IMAGE_BULK_ACTION: '/api/admin/images/bulk-action',
        PROVIDERS: '/api/admin/providers',
        PROVIDER_DETAILS: '/api/admin/providers/{id}',
        PROVIDER_UPDATE: '/api/admin/providers/{id}/update',
        PROVIDER_DELETE: '/api/admin/providers/{id}/delete',
        SETTINGS: '/api/admin/settings',
        SETTINGS_UPDATE: '/api/admin/settings/update',
        ANALYTICS: '/api/admin/analytics',
        LOGS: '/api/admin/logs',
        SYSTEM_STATUS: '/api/admin/system/status',
        SYSTEM_HEALTH: '/api/admin/system/health',
        DASHBOARD_STATS: '/api/admin/dashboard/stats',
        VERIFY_ACCESS: '/api/admin/verify-access'
    },

    // Table Configuration
    TABLE_CONFIG: {
        USERS: {
            columns: [
                { field: 'id', title: 'ID', sortable: true },
                { field: 'username', title: 'Username', sortable: true },
                { field: 'email', title: 'Email', sortable: true },
                { field: 'role', title: 'Role', sortable: true },
                { field: 'status', title: 'Status', sortable: true },
                { field: 'created_at', title: 'Created', sortable: true },
                { field: 'actions', title: 'Actions', sortable: false }
            ],
            pageSize: 20,
            sortBy: 'created_at',
            sortOrder: 'desc'
        },
        IMAGES: {
            columns: [
                { field: 'id', title: 'ID', sortable: true },
                { field: 'user_email', title: 'User', sortable: true },
                { field: 'prompt', title: 'Prompt', sortable: true },
                { field: 'provider', title: 'Provider', sortable: true },
                { field: 'status', title: 'Status', sortable: true },
                { field: 'isDeleted', title: 'Deleted', sortable: true },
                { field: 'created_at', title: 'Created', sortable: true },
                { field: 'actions', title: 'Actions', sortable: false }
            ],
            pageSize: 15,
            sortBy: 'created_at',
            sortOrder: 'desc'
        },
        PROVIDERS: {
            columns: [
                { field: 'id', title: 'ID', sortable: true },
                { field: 'name', title: 'Name', sortable: true },
                { field: 'api_key', title: 'API Key', sortable: false },
                { field: 'status', title: 'Status', sortable: true },
                { field: 'created_at', title: 'Created', sortable: true },
                { field: 'actions', title: 'Actions', sortable: false }
            ],
            pageSize: 10,
            sortBy: 'name',
            sortOrder: 'asc'
        }
    },

    // Status Values
    STATUS: {
        USER: {
            ACTIVE: 'active',
            INACTIVE: 'inactive',
            SUSPENDED: 'suspended',
            PENDING: 'pending'
        },
        IMAGE: {
            PENDING: 'pending',
            PROCESSING: 'processing',
            COMPLETED: 'completed',
            FAILED: 'failed',
            CANCELLED: 'cancelled'
        },
        PROVIDER: {
            ACTIVE: 'active',
            INACTIVE: 'inactive',
            ERROR: 'error',
            MAINTENANCE: 'maintenance'
        }
    },

    // UI States
    UI_STATES: {
        LOADING: 'loading',
        LOADED: 'loaded',
        ERROR: 'error',
        EMPTY: 'empty'
    },

    // Event Types
    EVENTS: {
        SECTION_CHANGE: 'admin-section-change',
        DATA_LOADED: 'admin-data-loaded',
        DATA_UPDATED: 'admin-data-updated',
        ERROR_OCCURRED: 'admin-error-occurred'
    }
};

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ADMIN_CONSTANTS;
}

// Global reference for browser
window.ADMIN_CONSTANTS = ADMIN_CONSTANTS;
