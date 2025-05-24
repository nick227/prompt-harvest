document.addEventListener('DOMContentLoaded', (event) => {
    if (isAuth()) {
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
                // renderUserUI(user.email);

            }
        });


    }

});