const SEARCH_INPUT_SELECTOR = '.search input';

function setupImageSearch() {
    const input = document.querySelector(SEARCH_INPUT_SELECTOR);
    input.addEventListener('keyup', handleImageSearch);
}

function handleImageSearch(event) {
    const searchValue = getSearchValue(event);
    const liItems = getLiItems(event);

    if (searchValue.length === 0) {
        showAllItems(liItems);
        return;
    }

    liItems.forEach(li => {
        let matchFound = false;
        const isTagMatch = checkTagMatch(li, searchValue);
        const imgElement = li.querySelector('img');

        if (isTagMatch) {
            showItem(li);
            matchFound = true;
        }

        if (checkImgMatch(imgElement, searchValue)) {
            showItem(li);
            matchFound = true;
        }

        if (!matchFound) {
            hideItem(li);
        }
    });
}

function getSearchValue(event) {
    const input = event.target;
    return input.value.toLowerCase();
}

function getLiItems(event) {
    const input = event.target;
    const col = input.closest('.col');
    return Array.from(col.querySelectorAll('ul.prompt-output > li'));
}

function showAllItems(liItems) {
    liItems.forEach(li => li.classList.remove('hidden'));
}

function checkTagMatch(li, searchValue) {
    const tags = Array.from(li.querySelectorAll('.tags li'));
    return tags.some(tag => tag.textContent.toLowerCase().includes(searchValue));
}

function checkImgMatch(imgElement, searchValue) {
    if (imgElement) {
        const imgSrc = imgElement.dataset.src.toLowerCase();
        const imgTitle = imgElement.title.toLowerCase();
        return imgSrc.includes(searchValue) || imgTitle.includes(searchValue);
    }
    return false;
}

function showItem(li) {
    li.classList.remove('hidden');
}

function hideItem(li) {
    li.classList.add('hidden');
}
