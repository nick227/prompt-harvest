// core utility functions
const Utils = {
    // dOM utilities
    dom: {
        cache: new Map(),

        get (selector) {
            if (!this.cache.has(selector)) {
                const element = document.querySelector(selector);

                if (element) {
                    this.cache.set(selector, element);
                }
            }

            return this.cache.get(selector);
        },

        init (selectors) {
            Object.values(selectors).forEach((selector) => {
                this.get(selector);
            });

            return this;
        },

        getAll (selector) {
            return document.querySelectorAll(selector);
        },

        createElement (tag, className = '', innerHTML = '') {
            const element = document.createElement(tag);

            if (className) {
                element.className = className;
            }
            if (innerHTML) {
                element.innerHTML = innerHTML;
            }

            return element;
        },

        updateElementClass (element, condition, className = 'active') {
            element.classList[condition ? 'add' : 'remove'](className);
        }
    },

    // async utilities
    async: {
        async fetchJson (url, options = {}) {
            const response = await fetch(url, options);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        },

        async fetchWithCredentials (endpoint) {
            const response = await fetch(endpoint, {
                credentials: 'include'
            });

            return await response.json();
        },

        debounce (func, wait) {
            let timeout;

            return function (...args) {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), wait);
            };
        }
    },

    // string utilities
    string: {
        removeExtraWhiteSpace (str) {
            return str.replace(/\s+/g, ' ').trim();
        },

        makeFileNameSafe (name) {
            return name
                .replace(/[\x00-\x1F<>:"/\\|?*.,;(){}[\]!@#$%^&+=`~]/g, '') // eslint-disable-line no-control-regex
                .substring(0, 100)
                .trim();
        },

        isValidEmail (email) {
            const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

            return re.test(email);
        }
    },

    // storage utilities
    storage: {
        get (key) {
            try {
                const item = localStorage.getItem(key);

                return item ? JSON.parse(item) : null;
            } catch (error) {
                return null;
            }
        },

        set (key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));

                return true;
            } catch (error) {
                return false;
            }
        },

        remove (key) {
            try {
                localStorage.removeItem(key);

                return true;
            } catch (error) {
                return false;
            }
        },

        clear () {
            try {
                localStorage.clear();

                return true;
            } catch (error) {
                return false;
            }
        }
    },

    // validation utilities
    validation: {
        isProviderSelected () {
            const checkedProviders = Array.from(
                document.querySelectorAll('input[name="providers"]:checked')
            ).map((input) => input.value);

            return checkedProviders.length > 0;
        },

        validateVariablePair (variableName, variableValues) {
            return variableName && variableValues
                && variableName.trim() !== ''
                && variableValues.trim() !== '';
        }
    }
};

// state management
const StateManager = {
    state: {
        requestCount: 0,
        isGenerating: false,
        dropdownIsOpen: false,
        lastMatchedWord: '',
        isDragging: false
    },

    update (key, value) {
        this.state[key] = value;
        this.notify(key);
    },

    get (key) {
        return this.state[key];
    },

    notify (key) {
        // observer pattern for state changes
        if (this.observers && this.observers[key]) {
            this.observers[key].forEach((callback) => callback(this.state[key]));
        }
    },

    observe (key, callback) {
        if (!this.observers) {
            this.observers = {};
        }
        if (!this.observers[key]) {
            this.observers[key] = [];
        }
        this.observers[key].push(callback);
    }
};

// initialize global state manager
const globalStateManager = StateManager;

// export Utils and StateManager to global scope for backward compatibility
if (typeof window !== 'undefined') {
    window.Utils = Utils;
    window.StateManager = StateManager;
    window.globalStateManager = globalStateManager;
}
