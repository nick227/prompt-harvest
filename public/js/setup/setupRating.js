function setupTagging() {
    addNumberTagsKeyBoardListeners();
    setupRatingFilter();
}

function addNumberTagsKeyBoardListeners() {
    document.addEventListener('keydown', async function (e) {
        const isFullScreen = document.querySelector(`.${IMAGE_FULLSCREEN_CLASS}`);
        if (e.keyCode >= 49 && e.keyCode <= 53 && isFullScreen) {
            await tagImage(e.keyCode - 48);
        }
    });
}

async function tagImage(rating) {
    const wrapper = document.querySelector(`.${IMAGE_FULLSCREEN_CLASS}`);
    const img = wrapper.querySelector('img');
    const id = img.dataset.id;

    const res = await fetch(`/api/images/${id}/rating`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rating })
    });

    if (res.ok) {
        img.dataset.rating = rating;
        const ratingElms = document.querySelector('.rating');
        ratingElms.innerHTML = `Rating: ${rating}`;
    } else {
        console.log('Error:', res.status, res.statusText);
        return;
    }
}

async function setupRatingFilter() {
    const filterElm = document.querySelector('.rating-filter');
    if (filterElm) {
        filterElm.addEventListener('click', function (e) {
            filterByRatings(e.target.textContent);
        });
    }
}

function filterByRatings(rating) {
    const liItems = document.querySelectorAll('ul.prompt-output > li');
    liItems.forEach(item => {
        const image = item.querySelector('img');
        if (rating === 'all') {
            item.style.display = 'block';
        } else if (image.dataset.rating !== rating) {
            item.style.display = 'none';
        } else if (image.dataset.rating === rating) {
            item.style.display = 'block';
        }
    });

}