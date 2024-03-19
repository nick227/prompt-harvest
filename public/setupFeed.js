async function setupFeed(){
    const target = document.querySelector('.prompt-output');
    target.innerHTML = '';
    const target2 = document.querySelector('.image-output');
    target2.innerHTML = '';
    setupFeedPrompts();
    setupFeedImages();
}

async function setupFeedPrompts(){
    const url = '/feed/prompts';
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const results = await response.json();
    //results.forEach(addPromptToOutput);
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
    //results.forEach(addImageUrlToOutput);
    for(let i=results.length-1; i > -1; i--){
        addImageUrlToOutput(results[i]);
    }
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