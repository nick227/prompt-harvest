const SEARCH_INPUT_SELECTOR = 'search input';
const HIDDEN_CLASS = 'hidden';
const COL_SELECTOR = '.col';
const SEARCH_ITEMS_SELECTOR = 'ul.prompt-output > li';
const RATING_SELECTOR = '.rating';
const TAGS_SELECTOR = '.tags li';
const IMG_SELECTOR = 'img';

function setupImageSearch() {
    const input = document.querySelector(`.${SEARCH_INPUT_SELECTOR}`);
    input.addEventListener('keyup', handleImageSearch);
}

function handleImageSearch(event) {
    const searchValue = getSearchValue(event);
    const searchItems = getSearchItems(event);

    if (searchValue.length === 0) {
        showAllItems(searchItems);
        return;
    }

    searchItems.forEach(item => {
        const isMatch = isItemMatch(item, searchValue);
        isMatch ? showItem(item) : hideItem(item);
    });
}

function getSearchValue(event) {
    const input = event.target;
    return input.value.toLowerCase();
}

function getSearchItems(event) {
    const input = event.target;
    const col = input.closest(COL_SELECTOR);
    return Array.from(col.querySelectorAll(SEARCH_ITEMS_SELECTOR));
}

function showAllItems(searchItems) {
    searchItems.forEach(item => item.classList.remove(HIDDEN_CLASS));
}

function isItemMatch(item, searchValue) {
    const imgElement = item.querySelector(IMG_SELECTOR);
    const isImgMatch = checkImgMatch(imgElement, searchValue);

    return isImgMatch;
}

function checkRatingMatch(item, searchValue) {
    const ratingElement = item.querySelector(RATING_SELECTOR);
    if (ratingElement) {
        const ratingText = ratingElement.textContent;
        const numericRating = ratingText.replace(/[^0-9.]/g, ''); 
        return numericRating.includes(searchValue);
    }
    return false;
}

function checkTagMatch(item, searchValue) {
    const tags = Array.from(item.querySelectorAll(TAGS_SELECTOR));
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

function showItem(item) {
    item.classList.remove(HIDDEN_CLASS);
}

function hideItem(item) {
    item.classList.add(HIDDEN_CLASS);
}