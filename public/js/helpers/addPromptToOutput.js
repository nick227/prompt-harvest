const PROMPT_TEXT_CLASS_NAME = 'prompt-text';

function addPromptToOutput(result, append=false) {
    const target = document.querySelector('.prompt-output');
    if(!target){
        return;
    }
    const value = typeof result.prompt === 'string' ? result.prompt : result;
    const originalVal = typeof result.original === 'string' ? result.original : "";
    const h6 = document.createElement('h6');
    const row = document.createElement('div');
    const li = document.createElement('li');

    row.className = 'row';
    h6.textContent = originalVal;
    h6.setAttribute('title', originalVal);
    h6.addEventListener('click', function(){
        navigator.clipboard.writeText(originalVal);
    });
    
    const button = document.createElement('button');
    button.addEventListener('click', handleMakeNewImageClick);
    button.textContent = 'make';

    const div = document.createElement('div');
    div.classList.add('link');
    div.addEventListener('click', function(){
        navigator.clipboard.writeText(value);
    });
    div.className = PROMPT_TEXT_CLASS_NAME;
    div.textContent = value;

    const divWrapper = document.createElement('div');
    divWrapper.classList.add('prompt-text-wrapper');

    divWrapper.appendChild(div);
    divWrapper.appendChild(h6);
    row.appendChild(divWrapper);
    row.appendChild(button);
    li.appendChild(row);
    li.dataset.originalPrompt = originalVal;
    li.dataset.prompt = value;
    li.dataset.id = result.promptId;

    if(append){
        target.append(li);

    } else {
        target.prepend(li);

    }

    if(setupFeedComplete){
       /// li.scrollIntoView({behavior: "smooth", block: "center", inline: "nearest"});
    }
    
}

async function handleMakeNewImageClick(e) {
    e.preventDefault();
    originalVal = e.target.closest('li').querySelector('h6').textContent;
    const prompt = e.target.closest('li').querySelector('.prompt-text').textContent;
    
    const url = await convertPromptUrl(prompt);
    if(!url){
        alert('Invalid Prompt');
        return;
    }
    const results = await fetchData(url);
    addPromptToOutput(results);
    await generateImage(results);
}
