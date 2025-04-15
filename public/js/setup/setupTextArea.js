// Constants
const CONFIG = {
    isMobile: window.innerWidth < 1200,
    limits: {
        wordType: window.innerWidth < 1200 ? 8 : 33,
        maxAuto: 6,
        maxSamples: 14
    },
    selectors: {
        textArea: '#prompt-textarea',
        matches: '#matches',
        multiplier: '#multiplier',
        searchTerm: '#search_term',
        replaceTerm: '#replace_term',
        generateBtn: '.btn-generate',
        providers: 'input[name="providers"]',
        allProviders: '.all-providers',
        autoDownload: 'input[name="autoDownload"]',
        queue: '.queue',
        btnQueue: '.btn-queue',
        toggleMenu: '.toggle-menu'
    },
    api: {
        wordType: '/word/type',
        promptBuild: '/prompt/build',
        clauses: '/prompt/clauses'
    },
    timeouts: {
        debounce: 200,
        autoGenerate: 100
    },
    classes: {
        active: 'active',
        sample: 'sample'
    }
};

// Add a state manager
const StateManager = {
    state: {
        requestCount: 0,
        isGenerating: false,
        dropdownIsOpen: false,
        lastMatchedWord: ''
    },

    update(key, value) {
        this.state[key] = value;
        this.notify(key);
    },

    notify(key) {
        // Add observers if needed
    }
};

// DOM Element Cache
const elements = {
    cache: new Map(),

    get(selector) {
        if (!this.cache.has(selector)) {
            const element = document.querySelector(selector);
            if (element) {
                this.cache.set(selector, element);
            }
        }
        return this.cache.get(selector);
    },

    init() {
        Object.values(CONFIG.selectors).forEach(selector => {
            this.get(selector);
        });
        return this;
    }
};

// Utility Functions
const utils = {
    debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    },

    async fetchJson(url) {
        const response = await fetch(url);
        return await response.json();
    },

    removeExtraWhiteSpace(str) {
        return str.replace(/\s+/g, ' ').trim();
    },

    updateElementClass(element, condition, className = 'active') {
        element.classList[condition ? 'add' : 'remove'](className);
    },

    // Add memoization for expensive operations
    memoize(fn) {
        const cache = new Map();
        return (...args) => {
            const key = JSON.stringify(args);
            if (!cache.has(key)) {
                cache.set(key, fn(...args));
            }
            return cache.get(key);
        };
    },

    // Add throttle function
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
};

// Add a dedicated error handler
const errorHandler = {
    show(message, type = 'error') {
        console.error(message);
        alert(message); // Replace with better UI notification
    },

    handle(error, context) {
        const message = `Error in ${context}: ${error.message}`;
        this.show(message);
        return null;
    }
};

// Text Area Manager
class TextAreaManager {
    constructor() {
        this.init();
        this.bindEvents();
    }

    init() {
        this.textArea = elements.get(CONFIG.selectors.textArea);
        this.matchesEl = elements.get(CONFIG.selectors.matches);

        // Load saved height on initialization
        const savedHeight = localStorage.getItem('textAreaHeight');
        if (savedHeight) {
            this.textArea.style.height = savedHeight;
        }
    }

    bindEvents() {
        this.textArea.addEventListener('input',
            utils.debounce(this.handleInput.bind(this), CONFIG.timeouts.debounce)
        );

        // Single resize handler
        this.textArea.addEventListener('mouseup', this.handleResize.bind(this));

        this.matchesEl.addEventListener('click', this.handleMatchListItemClick.bind(this));
    }

    async handleInput(e) {
        utils.updateElementClass(e.target, e.target.value.length);
        await this.updateMatches(e.target.value, e.target.selectionStart);
    }

    async getSampleMatches() {
        const results = await utils.fetchJson(`/prompt/clauses?limit=${CONFIG.limits.maxSamples}`);
        return results.map(word => `<li class="sample" title="${word}">${word}</li>`).join('');
    }

    async getMatches(word) {
        const encodedWord = encodeURIComponent(word);
        return await utils.fetchJson(`/word/type/${encodedWord}?limit=${CONFIG.limits.wordType}`);
    }

    async updateMatches(value, cursorPosition) {
        const textBeforeCursor = value.slice(0, cursorPosition).trim();
        if (!textBeforeCursor || textBeforeCursor.split(/\s+/).pop().length < 2) {
            this.matchesEl.innerHTML = await this.getSampleMatches();
            return;
        }

        let matches = [];
        const wordsBeforeCursor = textBeforeCursor.split(/\s+/);
        for (let i = 1; i <= 3; i++) {
            if (wordsBeforeCursor.length >= i) {
                this.lastMatchedWord = wordsBeforeCursor.slice(-i).join(' ');
                try {
                    matches = await this.getMatches(this.lastMatchedWord);
                    if (matches.length > 0) break;
                } catch (error) {
                    console.error('Match error:', error);
                }
            }
        }

        if (matches.length) {
            matches.push(', ');
        }

        this.updateMatchesDisplay(matches);
    }

    updateMatchesDisplay(matches) {
        this.matchesEl.innerHTML = matches.map(word => `<li title="${word}">${word}</li>`).join('');
        this.dropdownIsOpen = matches.length > 0;
    }

    handleMatchListItemClick(e) {
        if (e.target.tagName === 'LI') {
            const replacement = e.target.classList.contains('sample') ?
                e.target.innerText :
                (e.target.innerText === ',' ? ', ' : `\${${e.target.innerText}} `);

            const numWordsToReplace = this.dropdownIsOpen && replacement !== ', ' ?
                (this.lastMatchedWord.match(/\s/g) || []).length + 1 : 0;

            this.updateTextAreaContent(replacement, numWordsToReplace);
        }
    }

    updateTextAreaContent(replacement, numWordsToReplace) {
        const cursorPosition = this.textArea.selectionStart;
        const textBeforeCursor = this.textArea.value.slice(0, cursorPosition);
        const textAfterCursor = this.textArea.value.slice(cursorPosition);

        let words = textBeforeCursor.split(/\s+/);
        if (replacement.trim() !== ',') {
            words.splice(-numWordsToReplace, numWordsToReplace, replacement.trim());
        }

        let newTextBeforeCursor = words.join(' ');
        newTextBeforeCursor = replacement === ', ' ?
            newTextBeforeCursor.trim() + replacement :
            newTextBeforeCursor + ' ';

        this.textArea.value = newTextBeforeCursor + textAfterCursor;
        this.textArea.selectionStart = newTextBeforeCursor.length;
        this.textArea.selectionEnd = newTextBeforeCursor.length;

        if (!CONFIG.isMobile) {
            this.textArea.focus();
        }
    }

    handleResize(e) {
        const newHeight = e.target.style.height;
        if (newHeight) {
            localStorage.setItem('textAreaHeight', newHeight);
        }
    }

    destroy() {
        // Remove event listeners
        this.textArea.removeEventListener('input', this.handleInput);
        this.textArea.removeEventListener('mouseup', this.handleResize);
        this.matchesEl.removeEventListener('click', this.handleMatchListItemClick);
    }
}

// Queue Manager
class QueueManager {
    constructor() {
        this.queueList = document.querySelector(CONFIG.selectors.queue);
        this.setupEventListeners();
    }

    setupEventListeners() {
        const queueBtn = document.querySelector(CONFIG.selectors.btnQueue);
        if (queueBtn) {
            queueBtn.addEventListener('click', this.handleAddToQueue.bind(this));
        }
    }

    handleAddToQueue() {
        const textArea = document.querySelector(CONFIG.selectors.textArea);
        this.addQueueItem(textArea.value);
    }

    addQueueItem(prompt) {
        const item = document.createElement("li");
        const removeItemBtn = document.createElement("button");
        const promptEl = document.createElement("p");

        promptEl.textContent = prompt;
        promptEl.title = prompt;
        removeItemBtn.textContent = "Remove";

        promptEl.addEventListener("click", () => {
            const textArea = document.querySelector(CONFIG.selectors.textArea);
            textArea.value = prompt;
        });

        removeItemBtn.addEventListener("click", () => item.remove());

        item.appendChild(promptEl);
        item.appendChild(removeItemBtn);
        this.queueList.appendChild(item);
    }
}

// Provider Manager
class ProviderManager {
    constructor() {
        this.providers = new Set();
        this.init();
    }

    init() {
        this.loadProviders();
        this.bindEvents();
    }

    loadProviders() {
        const savedProviders = localStorage.getItem('selectedProviders');
        if (savedProviders) {
            this.providers = new Set(JSON.parse(savedProviders));
        }
        this.updateUI();
    }

    updateUI() {
        document.querySelectorAll(CONFIG.selectors.providers).forEach(checkbox => {
            checkbox.checked = this.providers.has(checkbox.value);
        });
        // Update "all" checkbox state
        const providers = document.querySelectorAll(CONFIG.selectors.providers);
        const allChecked = Array.from(providers).every(p => p.checked);
        const allProvidersCheckbox = document.querySelector(CONFIG.selectors.allProviders);
        if (allProvidersCheckbox) {
            allProvidersCheckbox.checked = allChecked;
        }
    }

    bindEvents() {
        const providers = document.querySelectorAll(CONFIG.selectors.providers);
        providers.forEach(provider => {
            provider.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.providers.add(e.target.value);
                } else {
                    this.providers.delete(e.target.value);
                }
                localStorage.setItem('selectedProviders', JSON.stringify(Array.from(this.providers)));
                this.handleProviderChange();
            });
        });

        const allProvidersCheckbox = document.querySelector(CONFIG.selectors.allProviders);
        if (allProvidersCheckbox) {
            allProvidersCheckbox.addEventListener('change', this.handleAllProvidersToggle.bind(this));
        }
    }

    handleProviderChange() {
        const providers = document.querySelectorAll(CONFIG.selectors.providers);
        const checkedCount = Array.from(providers).filter(p => p.checked).length;
        const allProvidersCheckbox = document.querySelector(CONFIG.selectors.allProviders);

        if (allProvidersCheckbox) {
            allProvidersCheckbox.checked = checkedCount === providers.length;
        }
    }

    handleAllProvidersToggle(e) {
        const providers = document.querySelectorAll(CONFIG.selectors.providers);
        providers.forEach(provider => {
            provider.checked = e.target.checked;
            if (e.target.checked) {
                this.providers.add(provider.value);
            } else {
                this.providers.delete(provider.value);
            }
        });
        localStorage.setItem('selectedProviders', JSON.stringify(Array.from(this.providers)));
    }
}

// Storage Manager
class StorageManager {
    static get(key, defaultValue = null) {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : defaultValue;
    }

    static set(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }
}

// First, let's add these constants back at the top
const WORD_TYPE_LIMIT = CONFIG.isMobile ? 8 : 33;
const MAX_AUTO_NUM = window.location.hostname.includes('localhost') ? 60 : 5;
const MAX_SAMPLES_NUM = 14;

let isInitialized = false;

// Add a ToggleMenuManager class
class ToggleMenuManager {
    constructor() {
        this.toggleMenus = document.querySelectorAll('.toggle-menu');
        this.init();
        this.bindEvents();
    }

    init() {
        // Load saved state for each menu
        this.toggleMenus.forEach(menu => {
            const menuId = menu.dataset.menuId || menu.id || 'menu'; // Fallback ID
            const isExpanded = localStorage.getItem(`menu_${menuId}`) === 'true';
            if (isExpanded) {
                menu.classList.add('active');
            }
        });
    }

    bindEvents() {
        this.toggleMenus.forEach(menu => {
            menu.addEventListener('click', (e) => {
                if (e.target === menu) {
                    this.handleToggle(menu);
                }
            });
        });
    }

    handleToggle(menu) {
        menu.classList.toggle('active');
        const isExpanded = menu.classList.contains('active');
        const menuId = menu.dataset.menuId || menu.id || 'menu';
        localStorage.setItem(`menu_${menuId}`, isExpanded);
    }
}

async function setupTextArea() {
    if (isInitialized) {
        return;
    }
    isInitialized = true;

    elements.init();

    const textAreaManager = new TextAreaManager();
    const providerManager = new ProviderManager();
    const queueManager = new QueueManager();
    const toggleMenuManager = new ToggleMenuManager();

    setupAutoDownload();
    setupMaxNumInput();
    setupActiveClass();
    setupProviderClicks();

    // Fix the generate button click handler
    document.querySelector('.btn-generate').addEventListener(
        'click',
        utils.debounce(function() {
            const scrollIntoView = false;
            handleGenerateClick(scrollIntoView);
        }, 200)
    );

    document.querySelector('.all-providers').addEventListener(
        'click',
        toggleAllProviders
    );

    const replaceBtn = document.querySelector('.btn-replace');
    if (replaceBtn) {
        replaceBtn.addEventListener('click', handleReplaceClick);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', setupTextArea);

function handleReplaceClick(e) {
    const needle = document.querySelector("#search_term").value;
    const replacement = document.querySelector("#replace_term").value;
    const textArea = document.querySelector("textarea#prompt-textarea");
    const regex = new RegExp(needle, 'g');
    textArea.value = textArea.value.replace(regex, replacement);
}

function setupActiveClass() {
    const multiplier = document.querySelector("#multiplier");

    if (multiplier.value.length) {
        multiplier.classList.add('active');
    }
    const textarea = document.querySelector("textarea#prompt-textarea");

    if (textarea.value.length) {
        textarea.classList.add('active');
    }

    multiplier.addEventListener('input', function(e) {
        if (e.target.value.length) {
            e.target.classList.add('active');
        } else {
            e.target.classList.remove('active');
        }
    });
}

function setupAutoDownload() {
    let autoDownload = localStorage.getItem('autoDownload');
    autoDownload = autoDownload ? JSON.parse(autoDownload) : false;
    document.querySelector('input[name="autoDownload"]').checked = autoDownload;
    document.querySelector('input[name="autoDownload"]').addEventListener('change', function(e) {
        localStorage.setItem('autoDownload', e.target.checked);
    });
}

function setupProviderClicks() {
    const providerCheckElms = document.querySelectorAll('input[name="providers"]');
    providerCheckElms.forEach(elm => elm.addEventListener('change', handleProviderClick));
}

function handleProviderClick(e) {
    const anyProvidersChecked = document.querySelectorAll('input[name="providers"]:checked').length;
    const allProvidersCount = document.querySelectorAll('input[name="providers"]').length;
    if (anyProvidersChecked !== allProvidersCount) {
        const allProvidersElm = document.querySelector('.all-providers');
        allProvidersElm.checked = false;
    }
}

function toggleAllProviders(e) {
    const checkboxes = Array.from(document.querySelectorAll('input[name="providers"]'));
    checkboxes.forEach(checkbox => checkbox.checked = e.target.checked);
}

function convertPromptToUrl(prompt = null) {
    const textArea = document.getElementById('prompt-textarea');
    prompt = prompt ? prompt : encodeURIComponent(utils.removeExtraWhiteSpace(textArea.value.trim()));
    if (!prompt) {
        return false;
    }
    const multiplier = document.querySelector("#multiplier");
    const multiplierPair = multiplier.value.length ? `&multiplier=${encodeURIComponent(multiplier.value.trim().toLowerCase())}` : '';
    const mixup = document.querySelector('input[name="mixup"]:checked');
    const mixupPair = mixup ? `&mixup=true` : '';
    const mashup = document.querySelector('input[name="mashup"]:checked');
    const mashupPair = mashup ? `&mashup=true` : '';
    const customVariables = getCustomVariables();

    return `${API_PROMPT_BUILD}?prompt=${prompt}${multiplierPair}${mixupPair}${customVariables}${mashupPair}`;
}

async function fetchData(url) {
    const response = await fetch(url);
    return await response.json();
}

async function handleGenerateClick(scrollToElm = null) {
    const url = convertPromptToUrl();
    if (!url) {
        alert('Invalid Prompt');
        return;
    }
    if (!isProviderSelected()) {
        alert('Please select at least one provider');
        return;
    }
    try {
        disableGenerateButton();
        const promptData = await fetchData(url);
        const promptElm = addPromptToOutput(promptData);
        if (scrollToElm) {
            promptElm.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        const img = await generateImage(promptData);

        const isAuto = document.querySelector('input[name="auto-generate"]:checked');
        const maxNum = document.querySelector('input[name="maxNum"]');

        if (isAuto && (StateManager.state.requestCount < (maxNum.value || MAX_AUTO_NUM) - 1)) {
            StateManager.update('requestCount', StateManager.state.requestCount + 1);
            setTimeout(() => handleGenerateClick(scrollToElm), 100);
        } else {
            StateManager.update('requestCount', 0);
        }

    } catch (error) {
        errorHandler.handle(error, 'handleGenerateClick');
    } finally {
        enableGenerateButton();
    }
}

function setupMaxNumInput() {
    const localStorageMaxNum = localStorage.getItem('maxNum');
    const maxNum = document.querySelector("input[name='maxNum']");
    maxNum.setAttribute('min', 1);
    maxNum.setAttribute('max', MAX_AUTO_NUM);
    maxNum.value = localStorageMaxNum ? localStorageMaxNum : 3;
    maxNum.addEventListener('change', () => {
        let value = parseInt(maxNum.value);
        if (value < 1) {
            value = 1;
        } else if (value > MAX_AUTO_NUM) {
            value = MAX_AUTO_NUM;
        }
        maxNum.value = value;
        localStorage.setItem('maxNum', value);
    });

    const isAuto = document.querySelector("input[name='auto-generate']");
    maxNum.disabled = !isAuto.checked;
    isAuto.addEventListener('change', () => {
        maxNum.disabled = !isAuto.checked;
    });
}

async function handleConvertClick() {
    const url = convertPromptToUrl();
    if (!url) {
        alert('Invalid Prompt');
        return;
    }
    try {
        const results = await fetchData(url);
        addPromptToOutput(results);

    } catch (error) {
        console.error('An error occurred while fetching the data.', error);
    }
}

// Make sure these functions are available
function disableGenerateButton() {
    const btn = document.querySelector('.btn-generate');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Generating...';
    }
}

function enableGenerateButton() {
    const btn = document.querySelector('.btn-generate');
    if (btn) {
        btn.disabled = false;
        btn.textContent = 'START';
    }
}

function isProviderSelected() {
    return document.querySelectorAll('input[name="providers"]:checked').length > 0;
}

export { setupTextArea };