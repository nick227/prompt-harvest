function setupTagging(){
    addNumberTagsKeyBoardListeners();
}

function addNumberTagsKeyBoardListeners(){
    document.addEventListener('keydown', async function(e){
        const isFullScreen = document.querySelector(`.${IMAGE_FULLSCREEN_CLASS}`);
        if(e.keyCode >= 49 && e.keyCode <= 53 && isFullScreen){
            await tagImage(e.keyCode - 48);
        }
    });
}

async function tagImage(tag){
    const wrapper = document.querySelector(`.${IMAGE_FULLSCREEN_CLASS}`);
    const img = wrapper.querySelector('img');
    const id = img.dataset.id;

    console.log('get', tag)
    console.log('id', id)
    
    const res = await fetch(`/api/images/${id}/tag`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({tag})
    });
    console.log('res', res)

    if (res.ok) {
        img.dataset.tag = tag;
    } else {
        console.log('Error:', res.status, res.statusText);
        return;
    }
}