/* Dashboard URL is injected at build time (see build.js). */
document.getElementById('backBtn').addEventListener('click', () => {
    window.location.href = '__PRODLYTICS_DASHBOARD_ORIGIN__/';
});
