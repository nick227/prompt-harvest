const PROMPT_TEXT_CLASS_NAME = 'prompt-text';
const PROMPT_WRAPPER_CLASS_NAME = 'prompt-text-wrapper';

function addPromptToOutput(result, append = false) {
    const target = document.querySelector('.prompt-output');
    if (!target) {
        return;
    }
    const value = typeof result.prompt === 'string' ? result.prompt : result;
    const originalVal = typeof result.original === 'string' ? result.original : "";
    const h6 = document.createElement('h6');
    const li = document.createElement('li');

    h6.textContent = originalVal;
    h6.setAttribute('title', originalVal);
    h6.addEventListener('click', function () {
        navigator.clipboard.writeText(originalVal);
    });

    const button = document.createElement('button');
    button.addEventListener('click', handleMakeBtnClick);
    button.textContent = 'make';

    const div = document.createElement('div');
    div.classList.add('link');
    div.addEventListener('click', function () {
        navigator.clipboard.writeText(value);
    });
    div.className = PROMPT_TEXT_CLASS_NAME;
    div.textContent = value;

    const divWrapper = document.createElement('div');
    divWrapper.classList.add(PROMPT_WRAPPER_CLASS_NAME);

    divWrapper.appendChild(div);
    divWrapper.appendChild(h6);
    li.appendChild(divWrapper);
    li.appendChild(button);
    li.dataset.originalPrompt = originalVal;
    li.dataset.prompt = value;
    li.dataset.id = result.promptId;

    if (append) {
        target.append(li);
    } else {
        target.prepend(li);
    }
    if (setupFeedComplete) {
        li.scrollIntoView({ behavior: "smooth" });
    }
}
