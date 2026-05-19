// main.js - The App Controller and Router
import { initShapeBlitz } from "./games/shape-blitz.js";

// --- TEMPLATE REGISTRY ---
// To add a new static page, just add a new key/value row right here!
const pages = {
    home: `
        <section class="page-content">
            <h1>Welcome to Nyelva</h1>
            <p class="subtitle">An educational platform for rapid geography and language games.</p>
            <div style="margin-top: 2rem;">
                <a href="#games" class="btn-play">Enter Arcade Arena</a>
            </div>
        </section>
    `,
    games: `
        <section class="page-content">
            <h1>Arcade Arena</h1>
            <p class="subtitle">Select a module challenge below.</p>
            <div class="games-grid">
                <div class="game-card">
                    <h3>Endless Shape Blitz</h3>
                    <p>Identify country boundaries rapidly back-to-back. Fast inputs, instant correction, and zero delay.</p>
                    <a href="#play-blitz" class="btn-play">Launch Blitz</a>
                </div>
                </div>
        </section>
    `,
    privacy: `
        <section class="page-content text-left">
            <h1>Privacy Policy</h1>
            <p>At Nyelva, we prioritize user transparency. This platform collects local game statistics strictly to enhance user execution mechanics.</p>
            <p>Third-party networks, including Google AdSense, may leverage cookies to optimize relative layout promotions based on standard browsing history profile metrics.</p>
        </section>
    `,
    terms: `
        <section class="page-content text-left">
            <h1>Terms of Service</h1>
            <p>By engaging with Nyelva layout properties, you validate operational compliance user agreements. Spatial geography vectors are driven via open-source telemetry libraries.</p>
        </section>
    `,
    about: `
        <section class="page-content text-left">
            <h1>About & Support</h1>
            <p>Nyelva is an independent educational mini-game matrix designed for rapid processing reinforcement. For code queries or telemetry bug reports, log tracking details directly within our web server file trees.</p>
        </section>
    `,
    // This is the anchor container where the game file will load itself
    "play-blitz": `
        <section class="page-content">
            <h1>ENDLESS SHAPE BLITZ</h1>
            <div class="game-container">
                <div id="outline-canvas-container"><svg id="outline-svg" width="320" height="240"></svg></div>
                <div class="controls-wrapper">
                    <input type="text" id="guess-input" placeholder="Type country..." autocomplete="off">
                    <div class="autocomplete-dropdown" id="search-suggestions"></div>
                </div>
                <div id="feedback-message"></div>
                <div class="hud-score-board">
                    <div>Current Streak: <span id="hud-streak">0</span></div>
                </div>
            </div>
        </section>
    `
};

// --- ROUTING ENGINE ---
function router() {
    let pageKey = window.location.hash.substring(1);
    if (!pageKey) pageKey = 'home'; // Default landing page

    const contentArea = document.getElementById('content-area');
    
    if (pages[pageKey]) {
        contentArea.innerHTML = pages[pageKey];
    } else {
        contentArea.innerHTML = `<section class="page-content"><h1>404</h1><p>Page route missing.</p></section>`;
    }

    // Update navbar active styling
    document.querySelectorAll('.nav-link').forEach(link => {
        const isCurrent = link.getAttribute('data-page') === pageKey || (pageKey === 'play-blitz' && link.getAttribute('data-page') === 'games');
        link.classList.toggle('active', isCurrent);
    });

    // IF the route is our game, call the initialization command exported from our game file!
    if (pageKey === 'play-blitz') {
        initShapeBlitz();
    }
}

window.addEventListener('hashchange', router);
document.addEventListener('DOMContentLoaded', router);
