document.addEventListener('DOMContentLoaded', () => {
    setupTextArea();

    setupFeed();

    setupGuidanceDropDowns();

    setupCustomVariables();

    setupImageSearch();

    setupRating();

    setupScrollTopBar();

    setupScrollLoading();

    // check user authentication after all other setup is complete
    setTimeout(() => {
        checkUser().then(user => {
            if (user) {
                renderUserUI(user.email);
            }
        });
    }, 100);
});