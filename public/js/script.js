import { setupTextArea } from './setup/setupTextArea.js';

document.addEventListener('DOMContentLoaded', (event) => {
    setupTextArea();

    setupFeed();

    setupStatsBar();

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