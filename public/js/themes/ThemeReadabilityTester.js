/**
 * Theme Readability Tester - Comprehensive testing for text readability
 * Tests all themes to ensure text is readable across all UI elements
 */
class ThemeReadabilityTester {
    constructor() {
        this.testResults = {};
        this.issues = [];
        this.elements = [
            '#theme-select',
            '#mobile-theme-select',
            'input[type="text"]',
            'textarea',
            'select',
            '.text-gray-200',
            '.text-gray-300',
            '.text-gray-400',
            '.text-gray-500',
            '.text-white',
            '.text-black',
            'label',
            'span',
            'p',
            'div',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'button',
            '.btn',
            '#controls-drawer',
            '#mobile-controls-drawer'
        ];
    }

    /**
     * Test readability across all themes
     */
    async testAllThemes() {

        const themes = Array.from(window.themeService?.themes?.keys() || []);

        this.testResults = {};
        this.issues = [];

        for (const themeName of themes) {
            await this.testTheme(themeName);
        }

        this.generateReport();

        return {
            results: this.testResults,
            issues: this.issues,
            summary: this.getSummary()
        };
    }

    /**
     * Test a specific theme
     */
    async testTheme(themeName) {
        // Switch to theme
        window.themeService.applyTheme(themeName);

        // Wait for theme to apply
        await new Promise(resolve => setTimeout(resolve, 500));

        const results = {
            themeName,
            elementTests: {},
            overallScore: 0,
            issues: []
        };

        // Test each element type
        for (const selector of this.elements) {
            const elementResults = this.testElement(selector, themeName);

            results.elementTests[selector] = elementResults;

            if (!elementResults.readable) {
                results.issues.push({
                    selector,
                    reason: elementResults.reason,
                    contrast: elementResults.contrast
                });
                this.issues.push({
                    theme: themeName,
                    selector,
                    reason: elementResults.reason,
                    contrast: elementResults.contrast
                });
            }
        }

        // Calculate overall score
        const totalElements = this.elements.length;
        const readableElements = Object.values(results.elementTests).filter(r => r.readable).length;

        results.overallScore = Math.round((readableElements / totalElements) * 100);

        this.testResults[themeName] = results;
    }

    /**
     * Test readability of a specific element
     */
    testElement(selector, themeName) {
        const elements = document.querySelectorAll(selector);

        if (elements.length === 0) {
            return {
                readable: true,
                reason: 'Element not found',
                contrast: null,
                elements: 0
            };
        }

        let readableCount = 0;
        const totalElements = elements.length;
        let minContrast = Infinity;
        const issues = [];

        elements.forEach((element, index) => {
            const contrast = this.calculateContrast(element);
            const isReadable = contrast >= 4.5; // WCAG AA standard

            if (isReadable) {
                readableCount++;
            } else {
                issues.push({
                    element,
                    contrast,
                    computedStyle: window.getComputedStyle(element)
                });
            }

            if (contrast < minContrast) {
                minContrast = contrast;
            }
        });

        const allReadable = readableCount === totalElements;
        const reason = allReadable ? 'All elements readable' : `${totalElements - readableCount}/${totalElements} elements have poor contrast`;

        return {
            readable: allReadable,
            reason,
            contrast: minContrast,
            elements: totalElements,
            readableElements: readableCount,
            issues
        };
    }

    /**
     * Calculate contrast ratio between text and background
     */
    calculateContrast(element) {
        const style = window.getComputedStyle(element);
        const textColor = this.parseColor(style.color);
        const backgroundColor = this.parseColor(style.backgroundColor);

        // If background is transparent, try to get parent background
        if (backgroundColor.alpha < 1) {
            const parentBg = this.getParentBackground(element);

            if (parentBg) {
                backgroundColor.r = parentBg.r;
                backgroundColor.g = parentBg.g;
                backgroundColor.b = parentBg.b;
                backgroundColor.alpha = 1;
            }
        }

        const textLuminance = this.getLuminance(textColor);
        const backgroundLuminance = this.getLuminance(backgroundColor);

        const lighter = Math.max(textLuminance, backgroundLuminance);
        const darker = Math.min(textLuminance, backgroundLuminance);

        return (lighter + 0.05) / (darker + 0.05);
    }

    /**
     * Parse color string to RGB object
     */
    parseColor(colorString) {
        // Handle different color formats
        if (colorString.startsWith('rgb')) {
            const values = colorString.match(/\d+/g);

            return {
                r: parseInt(values[0]) / 255,
                g: parseInt(values[1]) / 255,
                b: parseInt(values[2]) / 255,
                alpha: values[3] ? parseFloat(values[3]) : 1
            };
        } else if (colorString.startsWith('#')) {
            const hex = colorString.slice(1);

            return {
                r: parseInt(hex.substr(0, 2), 16) / 255,
                g: parseInt(hex.substr(2, 2), 16) / 255,
                b: parseInt(hex.substr(4, 2), 16) / 255,
                alpha: 1
            };
        }

        // Default fallback
        return { r: 0, g: 0, b: 0, alpha: 1 };
    }

    /**
     * Get background color from parent elements
     */
    getParentBackground(element) {
        let parent = element.parentElement;

        while (parent && parent !== document.body) {
            const bgColor = window.getComputedStyle(parent).backgroundColor;
            const parsed = this.parseColor(bgColor);

            if (parsed.alpha > 0) {
                return parsed;
            }
            parent = parent.parentElement;
        }

        return null;
    }

    /**
     * Calculate relative luminance
     */
    getLuminance(color) {
        const { r, g, b } = color;

        const toLinear = c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

        return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    }

    /**
     * Generate comprehensive test report
     */
    generateReport() {

        const themes = Object.keys(this.testResults);
        const avgScore = themes.reduce((sum, theme) => sum + this.testResults[theme].overallScore, 0) / themes.length;


        // Log issues by theme
        themes.forEach(theme => {
            const result = this.testResults[theme];

            if (result.issues.length > 0) {
                console.warn(`⚠️ ${theme} has ${result.issues.length} readability issues:`, result.issues);
            }
            // Theme passed readability test
        });

        // Log critical issues
        const criticalIssues = this.issues.filter(issue => issue.contrast < 3);

        if (criticalIssues.length > 0) {
            console.error(`❌ ${criticalIssues.length} critical readability issues found:`, criticalIssues);
        }
    }

    /**
     * Get summary of test results
     */
    getSummary() {
        const themes = Object.keys(this.testResults);
        const scores = themes.map(theme => this.testResults[theme].overallScore);

        return {
            totalThemes: themes.length,
            averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
            bestTheme: themes.reduce((best, theme) => (this.testResults[theme].overallScore > this.testResults[best].overallScore ? theme : best)
            ),
            worstTheme: themes.reduce((worst, theme) => (this.testResults[theme].overallScore < this.testResults[worst].overallScore ? theme : worst)
            ),
            themesWithIssues: themes.filter(theme => this.testResults[theme].issues.length > 0),
            criticalIssues: this.issues.filter(issue => issue.contrast < 3).length
        };
    }

    /**
     * Quick readability check for current theme
     */
    quickCheck() {
        const currentTheme = window.themeService?.getCurrentTheme();

        if (!currentTheme) {
            return null;
        }

        const criticalElements = ['#theme-select', 'input', 'textarea', 'select', 'button'];
        const issues = [];

        criticalElements.forEach(selector => {
            const elements = document.querySelectorAll(selector);

            elements.forEach(element => {
                const contrast = this.calculateContrast(element);

                if (contrast < 4.5) {
                    issues.push({ selector, contrast, element });
                }
            });
        });

        return {
            theme: currentTheme,
            issues,
            score: issues.length === 0 ? 100 : Math.max(0, 100 - (issues.length * 20))
        };
    }
}

// Export for use in other modules
window.ThemeReadabilityTester = ThemeReadabilityTester;

// Auto-initialize if readability testing is requested
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.location.search.includes('test-readability=true') || window.location.hash.includes('test-readability')) {
            window.themeReadabilityTester = new ThemeReadabilityTester();
            window.testThemeReadability = () => window.themeReadabilityTester.testAllThemes();
            window.quickReadabilityCheck = () => window.themeReadabilityTester.quickCheck();
        }
    }, 1000);
});
