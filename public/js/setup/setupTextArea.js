
const isMobile = window.innerWidth < 1200;

const WORD_TYPE_LIMIT = isMobile ? 8 : 33;

const MAX_AUTO_NUM = 3;
const MAX_SAMPLES_NUM = 14;
let requestCount = 0;

async function setupTextArea() {
    const textArea = document.getElementById('prompt-textarea');
    const insertComma = document.querySelector('.insert-comma');
    let dropdownIsOpen = false;
    let lastMatchedWord = '';
    const matchesEl = document.getElementById('matches');
    const updateMatchesDisplay = async matches => {
        matchesEl.innerHTML = matches.map(word => `<li title="${word}">${word}</li>`).join('');
        dropdownIsOpen = matches.length > 0;
        if (dropdownIsOpen) {
            //matchesEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    };

    async function getSampleMatches() {
        const results = await fetch(`/prompt/clauses?limit=${MAX_SAMPLES_NUM}`).then(res => res.json());
        return results.map(word => `<li class="sample" title="${word}">${word}</li>`).join('');
    }

    async function getMatches(word) {
        const encodedWord = encodeURIComponent(word);
        return await fetch(`/word/type/${encodedWord}?limit=${WORD_TYPE_LIMIT}`).then(res => res.json());
    }

    const getReplacement = (innerText) => innerText === ',' ? ', ' : `\${${innerText}} `;

    const getNumWordsToReplace = (dropdownIsOpen, replacement, lastMatchedWord) =>
        dropdownIsOpen && replacement !== ', ' ? (lastMatchedWord.match(/\s/g) || []).length + 1 : 0;

    const getWords = (textBeforeCursor) => textBeforeCursor.split(/\s+/);

    const replaceWords = (words, numWordsToReplace, replacement) => {
        if (replacement.trim() !== ',') {
            words.splice(-numWordsToReplace, numWordsToReplace, replacement.trim());
        }
        return words;
    };

    const appendReplacement = (replacement, newTextBeforeCursor) => {
        if (newTextBeforeCursor !== '' || replacement.trim() !== ',') {
            return replacement === ', ' ? newTextBeforeCursor.trim() + replacement : newTextBeforeCursor + ' ';
        }
        return newTextBeforeCursor;
    };

    const getNewTextBeforeCursor = (replacement, newTextBeforeCursor) => {
        return appendReplacement(replacement, newTextBeforeCursor);
    };

    const updateTextArea = (textArea, newTextBeforeCursor, textAfterCursor) => {
        textArea.value = newTextBeforeCursor + textAfterCursor;
        textArea.selectionStart = newTextBeforeCursor.length;
        textArea.selectionEnd = newTextBeforeCursor.length;
        if (window.innerWidth > 1200) {
            textArea.focus();
        }
    };

    const handleMatchListItemClick = e => {
        if (e.target.tagName === 'LI') {
            const replacement = e.target.classList.contains('sample') ? e.target.innerText : getReplacement(e.target.innerText);
            let numWordsToReplace = getNumWordsToReplace(dropdownIsOpen, replacement, lastMatchedWord);

            if (replacement === ', ') {
                numWordsToReplace = 0;
            }

            const cursorPosition = textArea.selectionStart;
            const textBeforeCursor = textArea.value.slice(0, cursorPosition);
            const textAfterCursor = textArea.value.slice(cursorPosition);

            let words = getWords(textBeforeCursor);
            words = replaceWords(words, numWordsToReplace, replacement);
            let newTextBeforeCursor = words.join(' ');

            newTextBeforeCursor = getNewTextBeforeCursor(replacement, newTextBeforeCursor);
            updateTextArea(textArea, newTextBeforeCursor, textAfterCursor);
        }
    };

    function updateTextAreaHeight(e) {
        const charsPerLine = 44;
        const minHeight = 100; // Set your minimum height here
        const text = e.target.value;
        const words = text.split(/\s+/); // Split into words
        let numberOfLines = 1; // Start with 1 line
        let charsOnCurrentLine = 0;
        words.forEach(word => {
            if (word.length + charsOnCurrentLine > charsPerLine) {
                numberOfLines++; // Add a new line if the word doesn't fit on the current line
                charsOnCurrentLine = word.length; // Start a new line with the length of the current word
            } else {
                charsOnCurrentLine += word.length; // Add the length of the word to the current line
            }
        });
        const numberOfLineBreaks = (text.match(/\n|\r/g) || []).length; // Count line breaks and carriage returns
        const estimatedNumberOfLines = numberOfLines + numberOfLineBreaks;
        const lineHeight = parseInt(window.getComputedStyle(e.target).getPropertyValue('line-height'), 10);
        const newHeight = Math.max(estimatedNumberOfLines * lineHeight, minHeight);
        e.target.style.height = `${newHeight}px`;
        // Check for Enter key and add a new line
        if (e.key === 'Enter') {
            e.target.style.height = `${newHeight + lineHeight}px`;
        }
        console.log('... ', e.target.style.height);
    }

    const handleInput = async (e) => {

        if (e.target.value.length) {
            e.target.classList.add('active');
        } else {
            e.target.classList.remove('active');
        }

        const textBeforeCursor = e.target.value.slice(0, e.target.selectionStart).trim();
        if (!textBeforeCursor || textBeforeCursor.split(/\s+/).pop().length < 2) {
            //matchesEl.innerHTML = '';
            matchesEl.innerHTML = matchesEl.innerHTML + await getSampleMatches();
            return;
        }

        let matches = [];
        const wordsBeforeCursor = textBeforeCursor.split(/\s+/);
        for (let i = 1; i <= 3; i++) {
            if (wordsBeforeCursor.length >= i) {
                lastMatchedWord = wordsBeforeCursor.slice(-i).join(' ');
                try {
                    matches = await getMatches(lastMatchedWord);
                    if (matches.length > 0) break;
                } catch (error) {
                    alert(`Error ${error}`);
                    console.error('An error occurred while getting matches:', error);
                    return;
                }
            }
        }

        if (matches.length) {
            matches.push(', ');
        }

        updateMatchesDisplay(matches);
    };

    setupResizeEventHandler(textArea);
    setupAutoDownload();
    setupMaxNumInput();
    setupProviderClicks();
    setupActiveClass();
    //textArea.addEventListener('input', updateTextAreaHeight);
    textArea.addEventListener('input', debounce(handleInput, 200));
    matchesEl.addEventListener('click', handleMatchListItemClick);
    //document.querySelector('.prompt-convert').addEventListener('click', handleConvertClick);
    document.querySelector('.btn-generate').addEventListener('click', debounce(function(){
        const scrollIntoView = true;
        handleGenerateClick(scrollIntoView);
    }, 200));
    document.querySelector('.btn-queue').addEventListener('click', handleAddToQueueClick);
    document.querySelector('.all-providers').addEventListener('click', toggleAllProviders);
    //document.querySelector('.help').addEventListener('click', handleHelpLinkClick);

    const replaceBtn = document.querySelector('.btn-replace');
    replaceBtn.addEventListener('click', handleReplaceClick);
    const searchReplaceInput = document.querySelector('#search_term');

}

function handleAddToQueueClick(){
    const textArea = document.querySelector("textarea#prompt-textarea");
    const prompt = textArea.value;
    addQueItem(prompt);
}

function addQueItem(prompt){

    const item = document.createElement("li");
    const list = document.querySelector(".queue");
    const removeItemBtn = document.createElement("button");
    const promptEl = document.createElement("p");
    promptEl.textContent = prompt;
    promptEl.title = prompt;
    removeItemBtn.textContent = "Remove";
    promptEl.addEventListener("click", function(){
        const textArea = document.querySelector("textarea#prompt-textarea");
        textArea.value = prompt;
    });
    removeItemBtn.addEventListener("click", function(){
        item.remove();
    });
    item.appendChild(promptEl);
    item.appendChild(removeItemBtn);
    list.appendChild(item);
}

function handleReplaceClick(e){
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

    multiplier.addEventListener('input', function (e) {
        if (e.target.value.length) {
            e.target.classList.add('active');
        } else {
            e.target.classList.remove('active');
        }
    });
}

function setupResizeEventHandler(textArea) {
    textArea.addEventListener('mouseup', function (e) {
        localStorage.setItem('textAreaHeight', e.target.style.height);
    });
    const height = localStorage.getItem('textAreaHeight');
    if (height) {
        textArea.style.height = height;
    }
}

function handleWordLiClick() {

    const wordTypesEl = document.querySelector('ul.word-types');
    wordTypesEl.addEventListener('click', function (e) {
        if (e.target.tagName === 'LI') {
            const replacement = getReplacement(e.target.innerText);
            textArea.value = textArea.value + ' ' + replacement;

        }
    });
}

function setupAutoDownload() {
    let autoDownload = localStorage.getItem('autoDownload');
    autoDownload = autoDownload ? JSON.parse(autoDownload) : false;
    document.querySelector('input[name="autoDownload"]').checked = autoDownload;
    document.querySelector('input[name="autoDownload"]').addEventListener('change', function (e) {
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
    prompt = prompt ? prompt : encodeURIComponent(removeExtraWhiteSpace(textArea.value.trim()));
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

function removeExtraWhiteSpace(str) {
    return str.replace(/\s+/g, ' ').trim();
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
        //if (scrollToElm) {
          //  img.scrollIntoView({ behavior: "smooth", block: "start" });
        //}
        const isAuto = document.querySelector('input[name="auto-generate"]:checked');
        const maxNum = document.querySelector('input[name="maxNum"]');

        if (isAuto && (requestCount < (maxNum.value || MAX_AUTO_NUM) - 1)) {
            requestCount++;
            setTimeout(function(){
                handleGenerateClick(scrollToElm);
            }, 100);
        } else {
            requestCount = 0;
        }

    } catch (error) {
        alert(`Error ${error}`);
        location.reload();

    } finally {
        enableGenerateButton();
    }
}

function setupMaxNumInput() {
    const localStorageMaxNum = localStorage.getItem('maxNum');
    const maxNum = document.querySelector("input[name='maxNum']");
    maxNum.setAttribute('min', 1);
    maxNum.setAttribute('max', MAX_AUTO_NUM);
    maxNum.value = localStorageMaxNum || MAX_AUTO_NUM;
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