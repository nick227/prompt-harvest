function setupCustomVariables(){
    const btn = document.querySelector('.insert-variable');
    btn.addEventListener('click', handleInsertVariableClick);
    checkLocalStorage();
}

function clearLocalStorage(){
    localStorage.clear();
}

function handleInsertVariableClick(e){
    const variableName = prompt("Variable Name");
    const variableValues = prompt("Comma Separated List of Values");
    if(!validateVariablePair(variableName, variableValues)){
        alert("Invalid custom variable! Please try again.");
        return;
    }
    saveToLocalStorage(variableName, variableValues);
    const chip = createChip(variableName, variableValues);
    const target = document.querySelector('.chips-variables');
    target.appendChild(chip);
}

function validateVariablePair(variableName, variableValues){
    return variableName.length && variableValues.length;
}

function createChip(variableName, variableValues){
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.setAttribute('data-variable-name', variableName);
    chip.setAttribute('data-variable-values', variableValues);
    chip.setAttribute('title', '[' + variableValues + '] click to add, swipe to delete');
    chip.innerHTML = variableName;
    chip.addEventListener('click', function(e){
        const target = document.querySelector('#prompt-textarea');
        target.value += '${'+chip.innerHTML+'}';
        target.focus();
    });
    chip.addSwipe(function(e) {
        console.log('k')
        e.target.remove();
        removeFromLocalStorage(e.target.getAttribute('data-variable-name'));
    });

    return chip;
}

function removeFromLocalStorage(variableName){
    const currentLocalStorage = localStorage.getItem('variables');
    if(currentLocalStorage){
        const currentVariables = JSON.parse(currentLocalStorage);
        const newVariables = currentVariables.filter(variable => variable.variableName!== variableName);
        localStorage.setItem('variables', JSON.stringify(newVariables));
    }
}

function checkLocalStorage(){
    const currentLocalStorage = localStorage.getItem('variables');
    if(currentLocalStorage){
        const currentVariables = JSON.parse(currentLocalStorage);
        currentVariables.forEach(variable => {
            const chip = createChip(variable.variableName, variable.variableValues);
            const target = document.querySelector('.chips-variables');
            target.appendChild(chip);
        });
    }
}

function saveToLocalStorage(variableName, variableValues) {
    if(!variableName || !variableValues){
        alert("Invalid Variable Name or Value");
        return;
    }
    const currentLocalStorage = localStorage.getItem('variables');
    const payload = {
        variableName: variableName,
        variableValues: variableValues
    };
    if(currentLocalStorage){
        const currentVariables = JSON.parse(currentLocalStorage);
        currentVariables.push(payload);
        localStorage.setItem('variables', JSON.stringify(currentVariables));
    } else {
        localStorage.setItem('variables', JSON.stringify([payload]));
    }

}