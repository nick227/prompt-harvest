function setupTagging(){
    addNumberTagsKeyBoardListeners();
}

function addNumberTagsKeyBoardListeners(){
    console.log('Adding keyboard listeners');
    document.addEventListener('keydown', function(e){
        const isFullScreen = document.querySelector(`.${IMAGE_FULLSCREEN_CLASS}`);
        if(e.keyCode >= 49 && e.keyCode <= 53 && isFullScreen){
            tagImage(e.keyCode - 49);
        }
    });
}

function tagImage(tag){
    const wrapper = document.querySelector(`.${IMAGE_WRAPPER_CLASS}.${IMAGE_FULLSCREEN_CLASS}`);
    const img = wrapper.querySelector('img');
    const id = img.dataset.id;
    console.log(tag, id);
}