

    const updateModal = (textArea, visible) => {
        const modal = document.querySelector('.modal');
        if (!visible) {
            modal.style.display = 'none';
            return;
        }
        modal.style.display = 'block';
        const textAreaRect = textArea.getBoundingClientRect();


        let lineHeight = parseFloat(getComputedStyle(textArea).lineHeight);
        if (isNaN(lineHeight)) {
            let fontSize = parseFloat(getComputedStyle(textArea).fontSize);
            lineHeight = fontSize * 1.2;
        }

        let lines = textArea.value.substr(0, textArea.selectionEnd).split("\n");
        let currentLine = lines.length;

        let targetTop = (textAreaRect.top + lineHeight * currentLine) + 20;


        const targetLeft = textAreaRect.left + (textArea.selectionEnd + 7);
        modal.style.top = targetTop + 'px';
        modal.style.left = targetLeft + 'px';
    }