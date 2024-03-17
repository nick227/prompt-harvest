function setupModal(){
    const modal = document.querySelector(".modal");
    document.addEventListener("click", (e) => {
        if (e.target !== modal) {
            modal.style.display = "none";
        }
    });
}