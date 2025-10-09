// Tailwind CSS Configuration - Enhanced for Theme System
tailwind.config = {
    theme: {
        extend: {
            colors: {
                // Theme-aware color system
                'theme-bg-primary': 'var(--color-background-primary)',
                'theme-bg-secondary': 'var(--color-background-secondary)',
                'theme-bg-tertiary': 'var(--color-background-tertiary)',
                'theme-surface-primary': 'var(--color-surface-primary)',
                'theme-surface-secondary': 'var(--color-surface-secondary)',
                'theme-surface-elevated': 'var(--color-surface-elevated)',
                'theme-text-primary': 'var(--color-text-primary)',
                'theme-text-secondary': 'var(--color-text-secondary)',
                'theme-text-tertiary': 'var(--color-text-tertiary)',
                'theme-border-primary': 'var(--color-border-primary)',
                'theme-border-secondary': 'var(--color-border-secondary)',
                'theme-accent-primary': 'var(--color-accent-primary)',
                'theme-accent-secondary': 'var(--color-accent-secondary)',
                'theme-status-success': 'var(--color-status-success)',
                'theme-status-warning': 'var(--color-status-warning)',
                'theme-status-error': 'var(--color-status-error)',
                'theme-status-info': 'var(--color-status-info)',
                'theme-rating': 'var(--color-rating)',
                // Legacy compatibility
                custom: '#123456'
            },
            backgroundColor: {
                'theme-primary': 'var(--color-background-primary)',
                'theme-secondary': 'var(--color-background-secondary)',
                'theme-surface': 'var(--color-surface-primary)'
            },
            textColor: {
                'theme-primary': 'var(--color-text-primary)',
                'theme-secondary': 'var(--color-text-secondary)'
            },
            borderColor: {
                'theme-primary': 'var(--color-border-primary)',
                'theme-secondary': 'var(--color-border-secondary)'
            }
        }
    }
};
