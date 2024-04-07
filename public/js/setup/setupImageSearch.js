SEARCH_INPUT_SELECTOR = '.search input';

function setupImageSearch() {
    const input = document.querySelector(SEARCH_INPUT_SELECTOR);
    input.addEventListener('keyup', handleImageSearch);
}

function handleImageSearch(event) {
    const input = event.target;
    const searchValue = input.value.toLowerCase();

    const ulElement = input.closest('.col').querySelector('ul');
    const liItems = Array.from(ulElement.querySelectorAll('li'));

    // If the input is cleared, show all images
    if (searchValue.length === 0) {
        liItems.forEach(li => li.classList.remove('hidden'));
        return;
    }

    liItems.forEach(li => {
        const imgElement = li.querySelector('img');
        if (imgElement) {
            const imgSrc = imgElement.dataset.src.toLowerCase();
            const imgTitle = imgElement.title.toLowerCase();

            if (imgSrc.includes(searchValue) || imgTitle.includes(searchValue)) {
                li.classList.remove('hidden');
            } else {
                li.classList.add('hidden');
            }
        }
    });
}