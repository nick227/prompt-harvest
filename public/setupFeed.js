const DEFAULT_PROMPT = '';

async function setupFeed() {
    const target = document.querySelector('.prompt-output');
    target.innerHTML = '';
    setupFeedPrompts();
    setupFeedImages();
}

async function setupFeedPrompts() {
    const url = '/prompts?limit=10';
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const results = await response.json();
    for(let i=results.length-1; i > -1; i--){
        addPromptToOutput(results[i]);
    }
}

async function setupFeedImages() {
    const url = '/images?limit=88';
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const results = await response.json();
    for(let i=results.length-1; i > -1; i--){
        addImageB64ToOutput(results[i]);
    }
}