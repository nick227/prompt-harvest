async function setupFeed(){
    const target = document.querySelector('.prompt-output');
    target.innerHTML = '';
    setupFeedPrompts();
}

async function setupFeedPrompts(){
    const url = '/feed/prompts';
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const results = await response.json();
    for(let i=results.length-1; i > -1; i--){
        addPromptToOutput(results[i]);
    }
}

async function setupFeedImages(){
    const url = '/feed/images';
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const results = await response.json();
    for(let i=results.length-1; i > -1; i--){
        addImageB64ToOutput(results[i]);
    }
}

function addImageB64ToOutput(results, download=false) {
    if(typeof results.b64_json === 'object' && typeof results.b64_json.error === 'string'){
        alert(`${results.b64_json.details?.error?.message}`);
        return;
    }
    const img = document.createElement('img');
    img.src = `data:image/jpeg;base64,${results.b64_json}`;
    if(download === true){
        const a = document.createElement('a');
        a.href = img.src;
        a.download = `${makeFileNameSafeForWindows(results.providerName +'-'+ results.prompt)}.jpg`;
        a.click();
        setupStatsBar();
    }
}

function displayImage(img){
    
    const wrapper = document.createElement('div');
    wrapper.className = 'image-wrapper';

    const title = document.createElement('h3');
    const note = document.createElement('h6');
    title.textContent = truncatePrompt(results.prompt);
    note.textContent = results.providerName;

    img.addEventListener("click", downloadThisImage);
    img.title = "Click to download: " + results.prompt;

    img.onload = () => {
        wrapper.appendChild(img);
        wrapper.appendChild(title);
        wrapper.appendChild(note);
    }

    const target = document.querySelector('.image-output');
    target.prepend(wrapper);

}

function addImageUrlToOutput(results, download=false) {
    const wrapper = document.createElement('div');
    wrapper.className = 'image-wrapper';

    const title = document.createElement('h3');
    const note = document.createElement('h6');
    title.textContent = truncatePrompt(results.prompt);
    note.textContent = results.providerName;

    const img = document.createElement('img');
    img.src = `/images/${results.imageName}`;
    img.addEventListener("click", downloadThisImage);
    img.title = "Click to download: " + results.prompt;

    img.onload = () => {
        wrapper.appendChild(img);
        wrapper.appendChild(title);
        wrapper.appendChild(note);
    }

    const target = document.querySelector('.image-output');
    target.prepend(wrapper);

    if(download === true){
        const a = document.createElement('a');
        a.href = '/images/'+results.imageName;
        a.download = `${makeFileNameSafeForWindows(results.providerName +'-'+ results.prompt)}.jpg`;
        a.click();
    }
}

function downloadThisImage(e){
    const img = e.target;
    const a = document.createElement('a');
    a.href = img.src;
    a.download = img.src.split('/').pop();
    a.click();
}

function truncatePrompt(prompt){
    const maxChars = 24;
    return prompt.length > maxChars ? prompt.slice(0, maxChars)+'...' : prompt
}