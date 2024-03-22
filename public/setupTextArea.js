async function getMatches(word) {
    return await fetch(`/word/type/${word}`).then(res => res.json());
}

function setupTextArea() {
    const textArea = document.getElementById('prompt-textarea');
    const convertBtn = document.querySelector('.btn-convert');
    const startGeneratingBtn = document.querySelector('.btn-generate');
    const matchesEl = document.getElementById('matches');
    const toggleProviders = document.querySelector('.all-providers');

    const helpLink = document.querySelector('.help');

    const updateMatchesDisplay = matches => {
        matchesEl.innerHTML = matches.map(word => `<li>${word}</li>`).join('');
        updateModal(textArea, matches.length);
    };

    let lastMatchedWord = '';

    const handleInput = async () => {
        const cursorPosition = textArea.selectionStart;
        const textBeforeCursor = textArea.value.slice(0, cursorPosition).trim();

        if (!textBeforeCursor) {
            matchesEl.innerHTML = '';
            return;
        }

        const wordsBeforeCursor = textBeforeCursor.split(/\s+/);
        const currentWord = wordsBeforeCursor[wordsBeforeCursor.length - 1];

        if (currentWord.length < 3) {
            matchesEl.innerHTML = '';
            return;
        }

        let matches = [];
        for (let i = 1; i <= 3; i++) {
            if (wordsBeforeCursor.length >= i) {
                lastMatchedWord = wordsBeforeCursor.slice(-i).join(' ');
                try {
                    matches = await getMatches(lastMatchedWord);
                    if (matches.length > 0) break;
                } catch (error) {
                    console.error('An error occurred while getting matches:', error);
                    return;
                }
            }
        }
        updateMatchesDisplay(matches);
    };

const handleMatchListItemClick = e => {
    if (e.target.tagName === 'LI') {
        const replacement = '${' + e.target.innerText + '}';
        const numWordsToReplace = (lastMatchedWord.match(/\s/g) || []).length + 1;

        const cursorPosition = textArea.selectionStart;
        const textBeforeCursor = textArea.value.slice(0, cursorPosition).trim();
        const textAfterCursor = textArea.value.slice(cursorPosition);

        const textArray = textBeforeCursor.split(/\s+/);
        textArray.splice(-numWordsToReplace, numWordsToReplace, replacement);
        const newTextBeforeCursor = textArray.join(' ');
        textArea.value = newTextBeforeCursor + textAfterCursor;

        textArea.focus();
        textArea.selectionStart = newTextBeforeCursor.length;
        textArea.selectionEnd = newTextBeforeCursor.length;
    }
};

    setupMaxNumInput();
    textArea.addEventListener('input', handleInput);
    matchesEl.addEventListener('click', handleMatchListItemClick);
    convertBtn.addEventListener('click', handleConvertClick);
    startGeneratingBtn.addEventListener('click', handleGenerateClick);
    toggleProviders.addEventListener('click', toggleAllProviders);
    helpLink.addEventListener('click', handleHelpLinkClick);
}

function handleHelpLinkClick(){
    const helpText = `
    <div style=" text-align: left; line-height: 1.6;">
   
1.) Use template literals like \${term} to load in a dynamic value.
<BR>

2.) You can make your own arrays too i.e. \${["one", "two"]}.
<BR>

3.) Use double-dollar signs like $\${term} for the same value every time.
<BR>

4.) Mixup shuffles your prompt's comma-separated clauses. 
<BR>

5.) Multiplier text is inserted between the clauses.

<BR>

6.) Hit convert to build the prompt first.

<BR>

7.) The guidance value sets the amount of AI imagination.

<BR>

8.) Be respectful of the Dalle3 content policies. 
<BR>

</div>`;

    Swal.fire({
        html: helpText,
        confirmButtonText: 'Cool',
        width: '640',
        title: "Power Prompt Tips"
      })
}

function toggleAllProviders(e){
    const checkboxes = Array.from(document.querySelectorAll('input[name="providers"]'));
    checkboxes.forEach(checkbox => checkbox.checked = e.target.checked);
}

let maxRequests = 3;
let requestCount = 0;

async function makeFeedBuildUrl() {
    const textArea = document.getElementById('prompt-textarea');
    const prompt = encodeURIComponent(textArea.value.trim());
    if(!prompt){
        return false;
    }
    const multiplier = document.querySelector("#multiplier");
    const multiplierPair = multiplier.value.length ? `&multiplier=${encodeURIComponent(multiplier.value)}` : '';
    const mixup = document.querySelector('input[name="mixup"]:checked');
    const mixupPair = mixup ? `&mixup=true` : '';

    return `/prompt/build?prompt=${prompt}${multiplierPair}${mixupPair}`;
}

async function fetchData(url) {
    const response = await fetch(url);
    return await response.json();
}

async function handleGenerateClick(e){
    const url = await makeFeedBuildUrl();
    if(!url){
        alert('Invalid Prompt');
        return;
    }
    const checkedProviders = Array.from(document.querySelectorAll('input[name="providers"]:checked')).map(input => input.value);
    if(!checkedProviders.length){
        alert('Please select at least one provider');
        return;
    }
    try {
        const results = await fetchData(url);
        await addPromptToOutput(results); 
        await generateImage(results.processed);
        const isAuto = document.querySelector('input[name="auto-generate"]:checked');
        const maxNum = document.querySelector('input[name="maxNum"]');

        if(isAuto && requestCount < (maxNum.value || maxRequests)) {
            requestCount++;
            handleGenerateClick(e);
        } else {
            requestCount = 0;
        }

    } catch (error) {
        console.error('An error occurred while fetching the data.', error);
    }
}

function setupMaxNumInput(){
    const maxNum = document.querySelector("input[name='maxNum']");
    const isAuto = document.querySelector("input[name='auto-generate']");
    maxNum.disabled = !isAuto.checked;
    isAuto.addEventListener('change', () => {
        maxNum.disabled = !isAuto.checked;
    });
}

async function handleConvertClick() {
    const url = await makeFeedBuildUrl();
    if(!url){
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

function addPromptToOutput(obj) {
    const value = obj.processed;
    const target = document.querySelector('.prompt-output');
    const h6 = document.createElement('h6');
    const row = document.createElement('div');
    const li = document.createElement('li');

    row.className = 'row';
    h6.textContent = 'original';
    h6.setAttribute('title', obj.original);
    h6.addEventListener('click', function(){
        navigator.clipboard.writeText(obj.original);
    });
    h6.style.width = '100%';
    h6.style.cursor = 'pointer';
    
    const button = document.createElement('button');
    button.addEventListener('click', handleNewPromptClick);
    button.textContent = 'make';

    const div = document.createElement('div');
    div.textContent = value;

    row.appendChild(div);
    row.appendChild(button);
    li.appendChild(h6);
    li.appendChild(row);

    target.prepend(li);
}

async function handleNewPromptClick(e) {
    e.preventDefault();
    const text = e.target.previousElementSibling.textContent;
    await generateImage(text, e.target.closest('li'));
}

async function generateImage(text, e=null){
    const checkedProviders = Array.from(document.querySelectorAll('input[name="providers"]:checked')).map(input => input.value);
    if(!checkedProviders.length){
        alert("Please select at least one provider");
        return;
    }
    if(!text.length){
        alert("Invalid Prompt");
        return;
    }
    toggleProcessingStyle(e);
    const guidanceElm = document.querySelector('select[name="guidance"]');
    const guidanceVal = guidanceElm.value;
    console.log(guidanceVal)
    const url = `/image/generate?prompt=${encodeURIComponent(text)}&providers=${encodeURIComponent(checkedProviders)}&guidance=${parseInt(guidanceVal)}`;
    const results = await fetch(url).then(res => res.json());
    addImageB64ToOutput(results, true);
    toggleProcessingStyle(e);
}

function toggleProcessingStyle(e=null){
    const generateBtn = document.querySelector('.btn-generate');
    const currentPrompt = e || document.querySelector('.prompt-output li:first-child');
    generateBtn.classList.toggle('processing');
    currentPrompt.classList.toggle('processing');
    generateBtn.innerText = generateBtn.innerText === 'loading...' ? "Let's Go" : 'loading...';
    generateBtn.disabled = !generateBtn.disabled;
    currentPrompt.disabled = !currentPrompt.disabled;
}

function makeFileNameSafeForWindows(name) {
    const illegalChars = /[\u0000-\u001F<>:"\/\\|?*.,;(){}[\]!@#$%^&+=`~]/g;
    const maxLength = 100;
    let safeName = name.replace(illegalChars, '')
        .replace(/\.{2,}/g, '.')
        .replace(/ /g, '-')  // Replace spaces with dashes
        .trim()
        .replace(/(^[. ]+|[. ]+$)/g, '');

    const reservedNames = ["CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9"];

    if (reservedNames.includes(safeName.toUpperCase())) {
        safeName = 'file';
    }
    return safeName.slice(0, maxLength);
}