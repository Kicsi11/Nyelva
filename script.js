// --- PAGE ROUTING SYSTEM & VIEW TEMPLATES ---
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
                <li><a href="#map">Guess the Country Outline</a></li>
                <li>Language Vocabulary Matcher (Coming Soon)</li>
            </ul>
        </section>
    `,
    map: `
        <section class="page-content">
            <h1>Shape Guessing Quest</h1>
            <p>Guess the hidden nation. Each wrong attempt reveals distance and direction indicators!</p>
            
            <div class="game-container">
                <div id="outline-canvas-container">
                    <svg id="outline-svg" width="300" height="240"></svg>
                </div>

                <div class="controls" id="game-controls-ui">
                    <input type="text" id="guess-input" placeholder="Enter country name..." autocomplete="off">
                    <button id="submit-guess-btn" onclick="checkGuess()">Guess</button>
                    <button id="skip-btn" onclick="revealAnswer()">Reveal</button>
                </div>

                <div id="feedback-message"></div>

                <div class="guesses-list" id="guesses-container"></div>
            </div>
        </section>
    `
};

function handleRouting() {
    let pageKey = window.location.hash.substring(1);
    if (!pageKey) pageKey = 'home';
    
    const contentArea = document.getElementById('content-area');
    if (pages[pageKey]) {
        contentArea.innerHTML = pages[pageKey];
    } else {
        contentArea.innerHTML = `<section class="page-content"><h1>404</h1><p>Page not found.</p></section>`;
    }

    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.getAttribute('data-page') === pageKey) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    if (pageKey === 'map') {
        initGame();
    }
}

document.addEventListener('DOMContentLoaded', handleRouting);
window.addEventListener('hashchange', handleRouting);


// --- WORLDLE-STYLE GAME ENGINE ---
let currentCountry = null;
let worldCountriesData = [];
let maxAttempts = 6;
let currentAttempts = 0;
let gameOver = false;

function initGame() {
    gameOver = false;
    currentAttempts = 0;
    
    const container = document.getElementById('outline-canvas-container');
    const guessList = document.getElementById('guesses-container');
    if(guessList) guessList.innerHTML = "";

    // Pull directly from World Atlas mirror with fallbacks setup
    Promise.all([
        d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"),
        d3.tsv("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.tsv")
    ]).then(([topoData, tsvData]) => {
        const namesMap = {};
        tsvData.forEach(d => { namesMap[d.id] = d.name; });

        const features = topojson.feature(topoData, topoData.objects.countries).features;

        worldCountriesData = features
            .map(f => {
                // Generate a center point (centroid) for distance math calculations
                const centroid = d3.geoCentroid(f);
                return {
                    name: namesMap[f.id] || "Unknown",
                    geometry: f.geometry,
                    center: { lon: centroid[0], lat: centroid[1] }
                };
            })
            .filter(c => c.name !== "Unknown" && c.name !== "Antarctica");

        // Pick a completely random mystery country target
        currentCountry = worldCountriesData[Math.floor(Math.random() * worldCountriesData.length)];

        // Clean Canvas viewport wrapper
        if(container) container.innerHTML = '<svg id="outline-svg" width="300" height="240"></svg>';
        
        drawOutline();

        const input = document.getElementById('guess-input');
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') checkGuess();
            });
            input.focus();
        }
    }).catch(err => {
        console.error(err);
        if(container) container.innerHTML = "<h3>Data load error. Try checking your internet connection.</h3>";
    });
}

function drawOutline() {
    if (!currentCountry) return;
    const svg = d3.select("#outline-svg");
    svg.selectAll("*").remove();

    const projection = d3.geoMercator().fitSize([300, 240], currentCountry.geometry);
    const pathGenerator = d3.geoPath().projection(projection);

    svg.append("path")
        .datum(currentCountry.geometry)
        .attr("d", pathGenerator)
        .attr("fill", "#2c3e50")
        .attr("stroke", "#34495e")
        .attr("stroke-width", 1.5);
}

function checkGuess() {
    if (gameOver) return;

    const input = document.getElementById('guess-input');
    const feedback = document.getElementById('feedback-message');
    const rawGuess = input.value.trim();
    const guessNormal = rawGuess.toLowerCase();

    // Match input string up against our valid list of global country models
    const guessedCountry = worldCountriesData.find(c => c.name.toLowerCase() === guessNormal);

    if (!guessedCountry) {
        feedback.innerHTML = `<span style="color: #e67e22;">Valid country name required!</span>`;
        return;
    }

    currentAttempts++;
    input.value = ""; // clear input
    feedback.innerHTML = "";

    // WIN STATE REACHED
    if (guessNormal === currentCountry.name.toLowerCase()) {
        addClueRow(guessedCountry.name, 0, "🎉", 100, "#2ecc71");
        feedback.innerHTML = `<span style="color: #2ecc71;">Splendid! You guessed ${currentCountry.name}!</span>`;
        endGame();
        return;
    }

    // CALCULATE DISTANCE & DIRECTION CLUES
    const distance = Math.round(getHaversineDistance(guessedCountry.center, currentCountry.center));
    const bearing = getBearing(guessedCountry.center, currentCountry.center);
    const directionArrow = getDirectionArrow(bearing);
    
    // Max width of earth perimeter scale is roughly 20,000 km
    const proximityPct = Math.max(0, Math.round(((20000 - distance) / 20000) * 100));

    // Interpolate proximity background alert tint (Red shifts cleanly into Orange/Yellow)
    let hueColor = "#e74c3c";
    if(proximityPct > 45) hueColor = "#e67e22";
    if(proximityPct > 75) hueColor = "#f1c40f";

    addClueRow(guessedCountry.name, distance, directionArrow, proximityPct, hueColor);

    // LOSS STATE REACHED
    if (currentAttempts >= maxAttempts) {
        feedback.innerHTML = `<span style="color: #e74c3c;">Game Over! It was ${currentCountry.name}.</span>`;
        endGame();
    }
}

function addClueRow(name, distance, arrow, pct, color) {
    const list = document.getElementById('guesses-container');
    if (!list) return;

    const row = document.createElement('div');
    row.className = "guess-row";
    row.innerHTML = `
        <span class="guess-name">${name}</span>
        <span class="guess-dist">${distance === 0 ? "Correct" : distance + " km"}</span>
        <span class="guess-dir">${arrow}</span>
        <span class="guess-pct" style="color: ${color}">${pct}%</span>
    `;
    list.appendChild(row);
}

function revealAnswer() {
    if(gameOver) return;
    document.getElementById('feedback-message').innerHTML = `<span style="color: #e74c3c;">Answer: ${currentCountry.name}</span>`;
    endGame();
}

function endGame() {
    gameOver = true;
    const controls = document.getElementById('game-controls-ui');
    if(controls) {
        controls.innerHTML = `<button onclick="initGame()" style="width: 100%; margin: 0; background: #3498db;">Play Again</button>`;
    }
}

// --- MATHEMATICAL GEOGRAPHY LOGIC HELPER FUNCTIONS ---

// Haversine formula determines shortest distance track values over sphere structures
function getHaversineDistance(p1, p2) {
    const R = 6371; // Earth radius in kilometers
    const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
    const dLon = ((p2.lon - p1.lon) * Math.PI) / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((p1.lat * Math.PI) / 180) * Math.cos((p2.lat * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
}

// Determines angular orientation vectors between coordinate points
function getBearing(p1, p2) {
    const lat1 = (p1.lat * Math.PI) / 180;
    const lat2 = (p2.lat * Math.PI) / 180;
    const dLon = ((p2.lon - p1.lon) * Math.PI) / 180;

    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    let brng = Math.atan2(y, x);
    return (((brng * 180) / Math.PI + 360) % 360);
}

// Maps degrees to directional compass emojis
function getDirectionArrow(bearing) {
    const directions = ["⬆️", "↗️", "➡️", "↘️", "⬇️", "↙️", "⬅️", "↖️"];
    const index = Math.round(bearing / 45) % 8;
    return directions[index];
}
