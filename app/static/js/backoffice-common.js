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
