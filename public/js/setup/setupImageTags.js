TAG_BOX_SELECTOR = 'tags';

function getTagList(img){
    const imageId = img.dataset.id;
    const ul = document.createElement('ul');
    ul.className = TAG_BOX_SELECTOR;
    ul.classList.add('hidden');
    ul.dataset.imageId = imageId;
    return ul;
}

function getTagButton(img) {
    const tagBtn = document.createElement('button');
    tagBtn.innerHTML = '<i class="fas fa-hashtag"></i>';
    tagBtn.setAttribute('title', 'Tag');
    tagBtn.addEventListener('click', function(){
        handeAddTagButtonClick(img);
    });
    return tagBtn;
}

async function handeAddTagButtonClick(img) {
    let tagName = prompt('Enter a category name');
    if (tagName) {
        tagName = tagName.toLowerCase();
        await saveTagToDb(tagName, img);
        updateTagList(img);
    }

}

async function updateTagList(img){
    const imageId = img.dataset.id;
    const url = `${API_IMAGES}/${imageId}/tags`;
    const tags = await fetch(url).then(res => res.json());
    const ul = document.querySelector(`ul[data-image-id="${imageId}"]`);
    ul.innerHTML = '';
    ul.title = 'remove';
    if(tags.length){
        ul.classList.remove('hidden');
    } else {
        ul.classList.add('hidden');
    }
    tags.forEach(tag => {
        const li = document.createElement('li');
        li.textContent = tag;
        li.addEventListener('click', function(){
            handleTagRemove(tag, img);
        });
        ul.appendChild(li);
    });
}

async function handleTagRemove(tag, img){
    const imageId = img.dataset.id;
    await removeTagFromDb(tag, imageId);
    updateTagList(img);
}

async function removeTagFromDb(tagName, imageId){
    await fetch(
        API_IMAGE_TAGS,
        {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tag: tagName,
                imageId: imageId
            })
        }
    );
}

async function saveTagToDb(tagName, img) {
    const results = await fetch(
        API_IMAGE_TAGS,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tag: tagName,
                imageId: img.dataset.id
            })
        }
    );
}
