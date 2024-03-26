document.addEventListener('DOMContentLoaded', (event) => {

    setupModal();

    setupTextArea();
    
    setupSearchTerm();

    setupFeed();

    setupStatsBar();
    
    setupGuidance();

    setupWordTypeSection();


    checkUser().then(user => {
        if (user) {
            renderUserUI(user.username);

        } else {
            renderLoginForm();
        }
    });
});