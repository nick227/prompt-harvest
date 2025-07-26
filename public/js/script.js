document.addEventListener('DOMContentLoaded', (event) => {
    //if (isAuth()) {
    setupTextArea();

    setupFeed();

    setupGuidanceDropDowns();

    setupCustomVariables();

    setupToggleView();

    setupImageSearch();

    setupRating();

    setupScrollTopBar();

    setupScrollLoading();

    // Check user authentication after all other setup is complete
    setTimeout(() => {
        checkUser().then(user => {
            console.log(user);
            if (user) {
                renderUserUI(user.email);
            }
        });
    }, 100);

    //}

});