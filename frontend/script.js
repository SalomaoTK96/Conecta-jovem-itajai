const themeButton = document.querySelector(".theme-button");

themeButton.addEventListener("click", () => {
    const isDarkTheme =
        document.documentElement.getAttribute("data-theme") === "dark";

    if (isDarkTheme) {
        document.documentElement.removeAttribute("data-theme");
    } else {
        document.documentElement.setAttribute("data-theme", "dark");
    }
});