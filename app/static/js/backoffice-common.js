/* Helpers JS partages - Back-office First Diaspora Onboarding */

function escapeHtml(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatDate(value) {
    if (!value) {
        return "";
    }

    try {
        const date = new Date(value);
        return date.toLocaleString("fr-FR");
    } catch (e) {
        return value;
    }
}

/* BACKOFFICE_MOBILE_BURGER_V1 : ouverture/fermeture du menu mobile */
(function () {
    var btn = document.getElementById("boNavToggle");
    var nav = document.getElementById("boNav");
    if (!btn || !nav) return;

    function setOpen(open) {
        nav.classList.toggle("open", open);
        btn.setAttribute("aria-expanded", open ? "true" : "false");
        btn.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
    }

    btn.addEventListener("click", function () {
        setOpen(!nav.classList.contains("open"));
    });

    nav.addEventListener("click", function (event) {
        if (event.target.closest("a")) setOpen(false);
    });

    document.addEventListener("click", function (event) {
        if (!nav.classList.contains("open")) return;
        if (event.target.closest(".topbar")) return;
        setOpen(false);
    });
})();
