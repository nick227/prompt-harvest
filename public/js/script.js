document.addEventListener('DOMContentLoaded', (event) => {
    setupTextArea();

    setupFeed();

    setupGuidanceDropDowns();

    setupCustomVariables();

    setupToggleView();

    setupImageSearch();

    setupRating();

    setupScrollTopBar();

    setupScrollLoading();

    checkUser().then(user => {
        if (user) {
            renderUserUI(user.email);

        }
    });

});