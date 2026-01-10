// logout.js
// logout.js

function confirmLogout() {
    // Clear session data
    localStorage.removeItem("username");

    // Optional: clear all local storage (only if safe)
    // localStorage.clear();

    // Immediate redirect
    window.location.replace("index.html");
}
