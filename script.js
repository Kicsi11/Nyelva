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
            <h1>Guess the Country Outline</h1>
            <p>Can you identify the UN member state by its shape?</p>
            
            <div class="game-container">
                <div id="outline-canvas-container">
                    <svg id="outline-svg" width="400" height="400"></svg>
                </div>

                <div class="controls">
                    <input type="text" id="guess-input" placeholder="Type country name..." autocomplete="off">
                    <button id="submit-guess-btn" onclick="checkGuess()">Submit</button>
                    <button id="skip-btn" onclick="nextCountry()">Skip</button>
                </div>

                <div id="feedback-message"></div>
                <div class="score-board">
                    Score: <span id="current-score">0</span> | Streak: <span id="current-streak">0</span>
                </div>
            </div>
        </section>
    `
};

// --- JAVASCRIPT HASH ROUTER ENGINE ---
function handleRouting() {
    // Get current hash from URL (e.g., "#map"), strip the "#" symbol
    let pageKey = window.location.hash.substring(1);
    
    // Default fallback to 'home' if landing directly on the root address
    if (!pageKey) {
        pageKey = 'home';
    }
    
    // Render the specified template into the main layout container
    const contentArea = document.getElementById('content-area');
    if (pages[pageKey]) {
        contentArea.innerHTML = pages[pageKey];
    } else {
        contentArea.innerHTML = `<section class="page-content"><h1>404</h1><p>Page not found.</p></section>`;
    }

    // Manage active status tracking visual state across header links
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.getAttribute('data-page') === pageKey) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Special initialization routine triggered specifically for the map page
    if (pageKey === 'map') {
        loadGameLibraries();
    }
}

// Router Event Listeners
document.addEventListener('DOMContentLoaded', handleRouting);
window.addEventListener('hashchange', handleRouting);


// --- MAP SHAPE GAME ENGINE ---
let score = 0;
let streak = 0;
let currentCountryIndex = 0;
let worldCountriesData = [];

// Dynamically load D3.js and TopoJSON map rendering dependencies from public CDNs
function loadGameLibraries() {
    if (window.d3 && window.topojson) {
        initGame();
    } else {
        // Sequentially load D3 library first
        const d3Script = document.createElement('script');
        d3Script.src = 'https://d3js.org/d3.v7.min.js';
        d3Script.onload = () => {
            // Load TopoJSON decoder extension immediately following D3 initialization
            const topoScript = document.createElement('script');
            topoScript.src = 'https://unpkg.com/topojson-client@3';
            topoScript.onload = initGame;
            document.head.appendChild(topoScript);
        };
        document.head.appendChild(d3Script);
    }
}

function initGame() {
    score = 0;
    streak = 0;
    worldCountriesData = [];
    currentCountryIndex = 0;

    const canvasContainer = document.getElementById('outline-canvas-container');
    if (canvasContainer) {
        canvasContainer.innerHTML = "<h3>Loading Global Boundary Assets...</h3>";
    }

    // Parallel download of open-source vector map coordinates and matching text labels
    Promise.all([
        d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"),
        d3.tsv("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.tsv")
    ]).then(([topoData, tsvData]) => {
        
        // Build relational map linking numeric coordinate IDs with actual country names
        const namesMap = {};
        tsvData.forEach(d => {
            namesMap[d.id] = d.name;
        });

        // Unpack raw TopoJSON vectors into workable GeoJSON shape features
        const geojsonFeatures = topojson.feature(topoData, topoData.objects.countries).features;

        // Process datasets, exclude blank regions and uninhabited territories like Antarctica
        worldCountriesData = geojsonFeatures
            .map(feature => {
                return {
                    name: namesMap[feature.id] || "Unknown",
                    geometry: feature.geometry
                };
            })
            .filter(country => country.name !== "Unknown" && country.name !== "Antarctica");

        // Randomize array order to mix up game presentation sequence 
        worldCountriesData.sort(() => Math.random() - 0.5);

        // Restore clean SVG viewport node inside rendering space
        canvasContainer.innerHTML = '<svg id="outline-svg" width="400" height="400"></svg>';

        // Establish keystroke mapping hook to track internal input submission tracking
        const input = document.getElementById('guess-input');
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') checkGuess();
            });
        }

        drawCurrentOutline();
    }).catch(err => {
        console.error("Critical failure during asset acquisition:", err);
        if(canvasContainer) canvasContainer.innerHTML = "<h3>Error fetching geographical indexes. Please reload.</h3>";
    });
}

function drawCurrentOutline() {
    if (currentCountryIndex >= worldCountriesData.length) {
        document.getElementById('outline-canvas-container').innerHTML = "<h2>Session Completed! Brilliant work!</h2>";
        return;
    }

    const country = worldCountriesData[currentCountryIndex];
    const svg = d3.select("#outline-svg");
    svg.selectAll("*").remove(); // Purge old vector drawings from prior turns

    const width = 400;
    const height = 400;

    // Isolate map vectors and center coordinates inside the visual projection box
    const projection = d3.geoMercator().fitSize([width, height], country.geometry);
    const pathGenerator = d3.geoPath().projection(projection);

    svg.append("path")
        .datum(country.geometry)
        .attr("d", pathGenerator)
        .attr("fill", "#2c3e50") 
        .attr("stroke", "#34495e")
        .attr("stroke-width", 1.5);
        
    document.getElementById('feedback-message').innerText = "";
    document.getElementById('guess-input').value = "";
    document.getElementById('guess-input').focus();
}

function checkGuess() {
    const input = document.getElementById('guess-input');
    const feedback = document.getElementById('feedback-message');
    const guess = input.value.trim().toLowerCase();
    const correctName = worldCountriesData[currentCountryIndex].name.toLowerCase();

    if (guess === correctName) {
        feedback.innerHTML = `<span style="color: #27ae60; font-weight: bold;">Correct! It's ${worldCountriesData[currentCountryIndex].name}.</span>`;
        score += 10;
        streak += 1;
        updateScoreboard();
        setTimeout(nextCountry, 1500); 
    } else {
        feedback.innerHTML = `<span style="color: #e74c3c; font-weight: bold;">Not quite! Try again.</span>`;
        streak = 0;
        updateScoreboard();
    }
}

function nextCountry() {
    currentCountryIndex++;
    drawCurrentOutline();
}

function updateScoreboard() {
    const scoreEl = document.getElementById('current-score');
    const streakEl = document.getElementById('current-streak');
    if(scoreEl) scoreEl.innerText = score;
    if(streakEl) streakEl.innerText = streak;
}
