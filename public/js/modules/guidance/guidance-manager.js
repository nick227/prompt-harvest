// guidance Manager - Handles guidance dropdown functionality
class GuidanceManager {
    constructor () {
        this.config = GUIDANCE_CONFIG;
        this.isInitialized = false;
        this.init();
    }

    init () {
        this.loadSavedValues();
        this.setupGuidanceDropDowns();
        this.isInitialized = true;
    }

    loadSavedValues () {
        const topSelect = Utils.dom.get(this.config.selectors.top);
        const bottomSelect = Utils.dom.get(this.config.selectors.bottom);

        if (topSelect) {
            const savedTop = Utils.storage.get(this.config.storage.top);

            topSelect.value = savedTop || this.config.defaultTop.toString();
        }

        if (bottomSelect) {
            const savedBottom = Utils.storage.get(this.config.storage.bottom);

            bottomSelect.value = savedBottom || this.config.defaultBottom.toString();
        }
    }

    setupGuidanceDropDowns () {
        const topSelect = Utils.dom.get(this.config.selectors.top);
        const bottomSelect = Utils.dom.get(this.config.selectors.bottom);

        if (topSelect && typeof topSelect.addEventListener === 'function') {
            topSelect.addEventListener('change', () => {
                Utils.storage.set(this.config.storage.top, topSelect.value);
            });
        }

        if (bottomSelect && typeof bottomSelect.addEventListener === 'function') {
            bottomSelect.addEventListener('change', () => {
                Utils.storage.set(this.config.storage.bottom, bottomSelect.value);
            });
        }
    }

    getGuidanceValues () {
        const topSelect = Utils.dom.get(this.config.selectors.top);
        const bottomSelect = Utils.dom.get(this.config.selectors.bottom);

        return {
            top: topSelect ? topSelect.value : this.config.defaultTop.toString(),
            bottom: bottomSelect ? bottomSelect.value : this.config.defaultBottom.toString()
        };
    }

    setGuidanceValues (topValue, bottomValue) {
        const topSelect = Utils.dom.get(this.config.selectors.top);
        const bottomSelect = Utils.dom.get(this.config.selectors.bottom);

        if (topSelect) {
            topSelect.value = topValue;
            Utils.storage.set(this.config.storage.top, topValue);
        }

        if (bottomSelect) {
            bottomSelect.value = bottomValue;
            Utils.storage.set(this.config.storage.bottom, bottomValue);
        }
    }

    resetToDefaults () {
        this.setGuidanceValues(
            this.config.defaultTop.toString(),
            this.config.defaultBottom.toString()
        );
    }

    validateGuidanceValues (topValue, bottomValue) {
        const top = parseInt(topValue);
        const bottom = parseInt(bottomValue);

        if (isNaN(top) || isNaN(bottom)) {
            return false;
        }

        return top >= bottom;
    }

    getRandomGuidanceValue () {
        const values = this.getGuidanceValues();
        const top = parseInt(values.top);
        const bottom = parseInt(values.bottom);

        if (top === bottom) {
            return top;
        }

        return Math.floor(Math.random() * (top - bottom + 1)) + bottom;
    }

    // public API methods
    initialize () {
        this.init();
    }

    refresh () {
        this.loadSavedValues();
    }

    // export functions for global access (maintaining backward compatibility)
    setupGuidanceDropDownsGlobal () {
        return this.setupGuidanceDropDowns();
    }

    getGuidanceValuesGlobal () {
        return this.getGuidanceValues();
    }
}

// initialize Guidance Manager
const guidanceManager = new GuidanceManager();

// export functions for global access (maintaining backward compatibility)
const setupGuidanceDropDowns = () => guidanceManager.setupGuidanceDropDowns();

// export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GuidanceManager;
}

// export for global access
if (typeof window !== 'undefined') {
    window.GuidanceManager = GuidanceManager;
    window.guidanceManager = guidanceManager;
    window.setupGuidanceDropDowns = setupGuidanceDropDowns;
}
