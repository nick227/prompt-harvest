IMAGE_CATEGORY_SELECTOR = 'categories select';
IMAGE_CATEGORY_ADD = 'categories button';

function setupImageCategories() {
}

async function addCategoriesToSelectBox(){
    const categories = await fetch(API_CATEGORIES).then(res => res.json());
    const selectBox = document.querySelector(`.${IMAGE_CATEGORY_SELECTOR}`);
    if(selectBox){
        selectBox.innerHTML = '<option value="">all</option>' + categories.map(category => `<option value="${category}">${category}</option>`).join('');
    }
}

function handleAddImageCategory(e) {
    let categoryName = prompt('Enter a category name');
    if (categoryName) {
        categoryName = categoryName.toLowerCase();
        saveCategoryToDb(categoryName);
        addToCategorySelectBox(categoryName);
    }
}

async function saveCategoryToDb(categoryName) {
    const results = await fetch(
        API_CATEGORIES,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                categoryName: categoryName
            })
        }
    );
}

function filterImagesByCategory() {
    const selectBox = document.querySelector(`.${IMAGE_CATEGORY_SELECTOR}`);
    console.log(selectBox.value);
}

function addToCategorySelectBox(categoryName) {
    const selectBox = document.querySelector(`.${IMAGE_CATEGORY_SELECTOR}`);
    const option = document.createElement('option');
    option.value = categoryName;
    option.textContent = categoryName;
    selectBox.appendChild(option);
}