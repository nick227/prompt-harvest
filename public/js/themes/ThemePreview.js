/**
 * Theme Preview - Visual preview utility for themes
 * Shows color swatches and descriptions for each theme
 */
class ThemePreview {
    constructor() {
        this.previewContainer = null;
        this.isVisible = false;
    }

    /**
     * Show theme preview modal
     */
    showPreview() {
        if (this.isVisible) {
            return;
        }

        this.createPreviewModal();
        this.isVisible = true;
    }

    /**
     * Hide theme preview modal
     */
    hidePreview() {
        if (this.previewContainer) {
            this.previewContainer.remove();
            this.previewContainer = null;
        }
        this.isVisible = false;
    }

    /**
     * Create the preview modal
     */
    createPreviewModal() {
        this.previewContainer = document.createElement('div');
        this.previewContainer.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
        this.previewContainer.innerHTML = this.getPreviewHTML();

        document.body.appendChild(this.previewContainer);

        // Add event listeners
        this.setupEventListeners();
    }

    /**
     * Get preview HTML content
     */
    getPreviewHTML() {
        const themes = [
            {
                id: 'default',
                name: 'Default Dark',
                emoji: '🌙',
                description: 'Deep midnight blue with electric cyan accents',
                colors: ['#0a0e27', '#1a1f3a', '#2a2f4f', '#00d4ff']
            },
            {
                id: 'apple',
                name: 'Apple Light',
                emoji: '🍎',
                description: 'Clean Apple design with signature blue accents',
                colors: ['#ffffff', '#f8fafc', '#f1f5f9', '#007aff']
            },
            {
                id: 'monokai',
                name: 'Monokai',
                emoji: '🎨',
                description: 'Vibrant Monokai with pink, cyan, and orange accents',
                colors: ['#2d2a2e', '#221f22', '#2d2a2e', '#ff6188']
            },
            {
                id: 'highcontrast',
                name: 'High Contrast',
                emoji: '⚫',
                description: 'Maximum accessibility with pure black and white',
                colors: ['#000000', '#000000', '#000000', '#00ffff']
            },
            {
                id: 'discord',
                name: 'Discord',
                emoji: '💜',
                description: 'Authentic Discord colors with vibrant purple accents',
                colors: ['#1e1f22', '#2b2d31', '#313338', '#5865f2']
            }
        ];

        const themeGrid = themes.map(theme => `
            <div class="theme-preview-item bg-white rounded-lg p-4 shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
                 data-theme="${theme.id}">
                <div class="flex items-center gap-3 mb-3">
                    <span class="text-2xl">${theme.emoji}</span>
                    <div>
                        <h3 class="font-semibold text-gray-800">${theme.name}</h3>
                        <p class="text-sm text-gray-600">${theme.description}</p>
                    </div>
                </div>
                <div class="flex gap-2">
                    ${theme.colors.map(color => `
                        <div class="w-8 h-8 rounded border border-gray-300"
                             style="background-color: ${color}"
                             title="${color}"></div>
                    `).join('')}
                </div>
            </div>
        `).join('');

        return `
            <div class="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
                    <div class="flex items-center justify-between">
                        <h2 class="text-xl font-bold text-gray-800">🎨 Theme Preview</h2>
                        <button id="close-preview" class="text-gray-500 hover:text-gray-700">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                </div>

                <div class="p-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        ${themeGrid}
                    </div>

                    <div class="mt-6 p-4 bg-gray-50 rounded-lg">
                        <h3 class="font-semibold text-gray-800 mb-2">💡 Tips</h3>
                        <ul class="text-sm text-gray-600 space-y-1">
                            <li>• Click any theme to apply it instantly</li>
                            <li>• Themes are saved automatically</li>
                            <li>• All themes include smooth transitions</li>
                            <li>• Use High Contrast for maximum accessibility</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Setup event listeners for the preview modal
     */
    setupEventListeners() {
        // Close button
        const closeBtn = this.previewContainer.querySelector('#close-preview');
        closeBtn.addEventListener('click', () => this.hidePreview());

        // Click outside to close
        this.previewContainer.addEventListener('click', (e) => {
            if (e.target === this.previewContainer) {
                this.hidePreview();
            }
        });

        // Theme selection
        const themeItems = this.previewContainer.querySelectorAll('.theme-preview-item');
        themeItems.forEach(item => {
            item.addEventListener('click', () => {
                const themeId = item.dataset.theme;
                if (window.themeService) {
                    window.themeService.applyTheme(themeId);
                }
                this.hidePreview();
            });
        });

        // ESC key to close
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                this.hidePreview();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
    }

    /**
     * Create a preview button
     */
    createPreviewButton() {
        const button = document.createElement('button');
        button.innerHTML = '👁️ Preview Themes';
        button.className = 'text-xs text-gray-400 hover:text-purple-400 transition-colors cursor-pointer';
        button.addEventListener('click', () => this.showPreview());
        return button;
    }

    /**
     * Add preview button to theme sections
     */
    addPreviewButtons() {
        // Add to desktop theme section
        const desktopThemeSection = document.querySelector('#theme-select')?.parentElement?.parentElement;
        if (desktopThemeSection) {
            const existingButton = desktopThemeSection.querySelector('.theme-preview-btn');
            if (!existingButton) {
                const previewBtn = this.createPreviewButton();
                previewBtn.className += ' theme-preview-btn';
                desktopThemeSection.appendChild(previewBtn);
            }
        }

        // Add to mobile theme section
        const mobileThemeSection = document.querySelector('#mobile-theme-select')?.parentElement?.parentElement;
        if (mobileThemeSection) {
            const existingButton = mobileThemeSection.querySelector('.theme-preview-btn');
            if (!existingButton) {
                const previewBtn = this.createPreviewButton();
                previewBtn.className += ' theme-preview-btn';
                mobileThemeSection.appendChild(previewBtn);
            }
        }
    }
}

// Export for use in other modules
window.ThemePreview = ThemePreview;

// Auto-initialize if theme preview is requested
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.location.search.includes('preview=true') || window.location.hash.includes('preview')) {
            window.themePreview = new ThemePreview();
            window.themePreview.addPreviewButtons();
            console.log('🎨 Theme preview available - click "Preview Themes" to see all themes');
        }
    }, 1000);
});
