// Define your pages/games here. 
// To make a new page, just add a new key-value pair to this object!
const pages = {
    home: `
        <section class="page-content">
            <h1>Welcome to Nyelva</h1>
            <p>Your ultimate hub for language and geography puzzles. Choose a tab above to get started!</p>
        </section>
    `,
    games: `
        <section class="page-content">
            <h1>Available Games</h1>
            <p>Select a game to play:</p>
            <ul>
                <li><a href="#" onclick="loadPage('map')">Capital City Interactive Map</a></li>
                <li>Language Vocabulary Matcher (Coming Soon)</li>
            </ul>
        </section>
    `,
    map: `
        <section class="page-content">
            <h1>Interactive Map Game</h1>
            <p>Click on the correct country!</p>
            <div style="width: 100%; height: 300px; background: #e0e0e0; display: flex; align-items: center; justify-content: center; border-radius: 4px;">
                [Map Placeholder - Leaflet.js or SVG map will load here]
            </div>
        </section>
    `
};

// Function to switch pages
function loadPage(pageKey) {
    const contentArea = document.getElementById('content-area');
    
    if (pages[pageKey]) {
        contentArea.innerHTML = pages[pageKey];
    } else {
        contentArea.innerHTML = `<section class="page-content"><h1>404</h1><p>Page not found.</p></section>`;
    }

    // Update active class in navbar
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.getAttribute('data-page') === pageKey) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// Event listeners for navbar clicks
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.getAttribute('data-page');
            loadPage(page);
        });
    });
});
