/**
 * Theme Service Tester - Debug and testing methods for theme service
 * Extracted from SimpleThemeService to reduce file size
 */
class ThemeServiceTester {
    constructor(themeService) {
        this.themeService = themeService;
    }

    /**
     * Debug method to test Monokai prompt customization
     */
    testMonokaiPromptCustomization() {
        console.log('🔍 Testing Monokai prompt customization...');

        // Check if Monokai theme is loaded
        const monokaiTheme = this.themeService.themes.get('monokai');
        if (!monokaiTheme) {
            console.error('❌ Monokai theme not found!');
            return;
        }

        console.log('✅ Monokai theme found:', monokaiTheme);

        // Check if custom prompt colors exist
        const promptColors = [
            '--color-prompt-background',
            '--color-prompt-text',
            '--color-prompt-border',
            '--color-prompt-focus-border',
            '--color-prompt-placeholder'
        ];

        promptColors.forEach(colorVar => {
            const value = monokaiTheme.colors[colorVar];
            console.log(`${colorVar}: ${value || 'NOT FOUND'}`);
        });

        // Check if prompt textarea exists
        const promptTextarea = document.querySelector('#prompt-textarea');
        if (promptTextarea) {
            console.log('✅ Prompt textarea found:', promptTextarea);

            // Check computed styles
            const computedStyle = window.getComputedStyle(promptTextarea);
            console.log('Current background:', computedStyle.backgroundColor);
            console.log('Current color:', computedStyle.color);
            console.log('Current border:', computedStyle.border);
        } else {
            console.error('❌ Prompt textarea not found!');
        }

        // Switch to Monokai theme to test
        console.log('🎨 Switching to Monokai theme for testing...');
        this.themeService.applyTheme('monokai');
    }

    /**
     * Demonstrate granular color control - Show all available color variables for a theme
     */
    showGranularColorControl(themeName = 'monokai') {
        console.log(`🎨 Granular Color Control for ${themeName} theme:`);

        const theme = this.themeService.themes.get(themeName);
        if (!theme) {
            console.error(`❌ Theme '${themeName}' not found!`);
            return;
        }

        // Group colors by category
        const colorCategories = {
            'Background': [],
            'Surface': [],
            'Border': [],
            'Text': [],
            'Accent': [],
            'Interactive': [],
            'Status': [],
            'Component': [],
            'Form': [],
            'Button': [],
            'Navigation': [],
            'Custom': []
        };

        Object.keys(theme.colors).forEach(colorVar => {
            if (colorVar.includes('background')) {
                colorCategories['Background'].push(colorVar);
            } else if (colorVar.includes('surface')) {
                colorCategories['Surface'].push(colorVar);
            } else if (colorVar.includes('border')) {
                colorCategories['Border'].push(colorVar);
            } else if (colorVar.includes('text')) {
                colorCategories['Text'].push(colorVar);
            } else if (colorVar.includes('accent')) {
                colorCategories['Accent'].push(colorVar);
            } else if (colorVar.includes('interactive')) {
                colorCategories['Interactive'].push(colorVar);
            } else if (colorVar.includes('status') || colorVar.includes('rating')) {
                colorCategories['Status'].push(colorVar);
            } else if (colorVar.includes('header') || colorVar.includes('sidebar') || colorVar.includes('card') || colorVar.includes('modal') || colorVar.includes('tooltip')) {
                colorCategories['Component'].push(colorVar);
            } else if (colorVar.includes('input') || colorVar.includes('select')) {
                colorCategories['Form'].push(colorVar);
            } else if (colorVar.includes('button')) {
                colorCategories['Button'].push(colorVar);
            } else if (colorVar.includes('nav')) {
                colorCategories['Navigation'].push(colorVar);
            } else if (colorVar.includes('prompt')) {
                colorCategories['Custom'].push(colorVar);
            }
        });

        // Display organized color categories
        Object.entries(colorCategories).forEach(([category, colors]) => {
            if (colors.length > 0) {
                console.log(`\n📋 ${category} Colors (${colors.length}):`);
                colors.forEach(colorVar => {
                    const value = theme.colors[colorVar];
                    console.log(`  ${colorVar}: ${value}`);
                });
            }
        });

        console.log(`\n🎯 Total Color Variables: ${Object.keys(theme.colors).length}`);
        console.log(`💡 Use these variables in CSS for granular theme control!`);

        return colorCategories;
    }

    /**
     * Get a specific color value for granular control
     */
    getThemeColor(themeName, colorVariable) {
        const theme = this.themeService.themes.get(themeName);
        if (!theme) {
            console.error(`❌ Theme '${themeName}' not found!`);
            return null;
        }

        const colorValue = theme.colors[colorVariable];
        if (!colorValue) {
            console.error(`❌ Color variable '${colorVariable}' not found in theme '${themeName}'!`);
            return null;
        }

        console.log(`🎨 ${themeName}.${colorVariable}: ${colorValue}`);
        return colorValue;
    }

    /**
     * Test Apple Light theme readability issues
     */
    testAppleLightReadability() {
        console.log('🍎 Testing Apple Light theme readability...');

        // Switch to Apple Light theme
        this.themeService.applyTheme('apple');

        // Check key color variables
        const appleTheme = this.themeService.themes.get('apple');
        if (!appleTheme) {
            console.error('❌ Apple Light theme not found!');
            return;
        }

        console.log('✅ Apple Light theme loaded:', appleTheme);

        // Test key readability combinations
        const readabilityTests = [
            {
                name: 'Full Screen Info Box Background',
                background: appleTheme.colors['--color-surface-overlay'],
                text: appleTheme.colors['--color-text-primary'],
                element: '.fullscreen-info-box'
            },
            {
                name: 'List View Item Background',
                background: appleTheme.colors['--color-surface-primary'],
                text: appleTheme.colors['--color-text-primary'],
                element: '.list-view'
            },
            {
                name: 'Info Box Modal Background',
                background: appleTheme.colors['--color-modal-background'],
                text: appleTheme.colors['--color-text-primary'],
                element: '.info-box'
            },
            {
                name: 'List View Metadata Labels',
                background: appleTheme.colors['--color-surface-primary'],
                text: appleTheme.colors['--color-text-tertiary'],
                element: '.metadata-label'
            },
            {
                name: 'List View Metadata Values',
                background: appleTheme.colors['--color-surface-primary'],
                text: appleTheme.colors['--color-text-secondary'],
                element: '.metadata-value'
            }
        ];

        console.log('\n📋 Apple Light Theme Readability Tests:');
        readabilityTests.forEach(test => {
            console.log(`\n🎯 ${test.name}:`);
            console.log(`   Background: ${test.background}`);
            console.log(`   Text: ${test.text}`);
            console.log(`   Element: ${test.element}`);

            // Check if elements exist
            const elements = document.querySelectorAll(test.element);
            console.log(`   Found ${elements.length} elements`);
        });

        // Test specific elements if they exist
        const fullscreenInfoBox = document.querySelector('.fullscreen-info-box');
        if (fullscreenInfoBox) {
            const computedStyle = window.getComputedStyle(fullscreenInfoBox);
            console.log('\n🔍 Fullscreen Info Box Computed Styles:');
            console.log(`   Background: ${computedStyle.backgroundColor}`);
            console.log(`   Color: ${computedStyle.color}`);
            console.log(`   Border: ${computedStyle.border}`);
        }

        const listViews = document.querySelectorAll('.list-view');
        if (listViews.length > 0) {
            const computedStyle = window.getComputedStyle(listViews[0]);
            console.log('\n🔍 List View Computed Styles:');
            console.log(`   Background: ${computedStyle.backgroundColor}`);
            console.log(`   Color: ${computedStyle.color}`);
            console.log(`   Border: ${computedStyle.border}`);
        }

        console.log('\n✅ Apple Light theme readability test complete!');
        console.log('💡 Check the console output above for any readability issues.');

        return readabilityTests;
    }

    /**
     * Test theme dropdown synchronization
     */
    testThemeDropdownSync() {
        console.log('🔄 Testing theme dropdown synchronization...');

        // Check if dropdowns exist
        const desktopThemeSelect = document.getElementById('theme-select');
        const mobileThemeSelect = document.getElementById('mobile-theme-select');

        console.log('📋 Dropdown Status:');
        console.log(`   Desktop select found: ${!!desktopThemeSelect}`);
        console.log(`   Mobile select found: ${!!mobileThemeSelect}`);

        if (desktopThemeSelect) {
            console.log(`   Desktop current value: ${desktopThemeSelect.value}`);
        }
        if (mobileThemeSelect) {
            console.log(`   Mobile current value: ${mobileThemeSelect.value}`);
        }

        console.log(`   Service current theme: ${this.themeService.currentTheme}`);

        // Test switching themes and checking dropdown sync
        const themes = ['default', 'apple', 'monokai', 'highcontrast', 'discord'];
        console.log('\n🧪 Testing theme switching and dropdown sync:');

        themes.forEach((theme, index) => {
            setTimeout(() => {
                console.log(`\n🎨 Switching to ${theme}...`);
                this.themeService.applyTheme(theme);

                setTimeout(() => {
                    if (desktopThemeSelect) {
                        console.log(`   Desktop dropdown: ${desktopThemeSelect.value} (expected: ${theme})`);
                    }
                    if (mobileThemeSelect) {
                        console.log(`   Mobile dropdown: ${mobileThemeSelect.value} (expected: ${theme})`);
                    }

                    if (index === themes.length - 1) {
                        console.log('\n✅ Theme dropdown sync test complete!');
                    }
                }, 50);
            }, index * 1000);
        });

        return {
            desktopSelect: desktopThemeSelect,
            mobileSelect: mobileThemeSelect,
            currentTheme: this.themeService.currentTheme
        };
    }

    /**
     * Test auto and enhance labels styling
     */
    testAutoEnhanceLabels() {
        console.log('🏷️ Testing Auto and Enhance Labels...');

        const autoLabels = document.querySelectorAll('.auto-label');
        const enhanceLabels = document.querySelectorAll('.enhance-label');

        console.log(`📋 Found ${autoLabels.length} auto labels and ${enhanceLabels.length} enhance labels`);

        autoLabels.forEach((label, index) => {
            const computedStyle = window.getComputedStyle(label);
            console.log(`\n🔍 Auto Label ${index + 1}:`);
            console.log(`   Background: ${computedStyle.backgroundColor}`);
            console.log(`   Color: ${computedStyle.color}`);
            console.log(`   Border: ${computedStyle.border}`);
        });

        enhanceLabels.forEach((label, index) => {
            const computedStyle = window.getComputedStyle(label);
            console.log(`\n🔍 Enhance Label ${index + 1}:`);
            console.log(`   Background: ${computedStyle.backgroundColor}`);
            console.log(`   Color: ${computedStyle.color}`);
            console.log(`   Border: ${computedStyle.border}`);
        });

        console.log('\n✅ Auto and Enhance Labels test complete!');
        return {
            autoLabels: autoLabels.length,
            enhanceLabels: enhanceLabels.length
        };
    }
}

// Export for use in other modules
window.ThemeServiceTester = ThemeServiceTester;
