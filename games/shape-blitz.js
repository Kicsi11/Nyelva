// games/shape-blitz.js - Completely Isolated Game Module

let currentCountry = null;
let worldCountriesData = [];
let streak = 0;
let isProcessingTransition = false;
let topSuggestedMatch = null;
let registryData = [];

export function initShapeBlitz() {
    streak = 0;
    isProcessingTransition = false;
    topSuggestedMatch = null;
    
    const container = document.getElementById('outline-canvas-container');
    if(container) container.innerHTML = "<h3>Syncing UN Outlines...</h3>";

    // 1. Fetch our separate clean registry data file first
    fetch('./data/countries.json')
        .then(res => res.json())
        .then(countriesList => {
            registryData = countriesList;
            
            // 2. Fetch the topological coordinates map lines from the public CDN
            return d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json");
        })
        .then(topoData => {
            const features = topojson.feature(topoData, topoData.objects.countries).features;
            
            // Map coordinate shapes to our custom clean JSON list
            worldCountriesData = features
                .map(f => {
                    // Force both IDs to be matching 3-digit strings (e.g. "4" becomes "004")
                    const cleanMapId = String(f.id).padStart(3, '0');
                    const match = registryData.find(item => String(item.id).padStart(3, '0') === cleanMapId);
                    
                    return { name: match ? match.name : "Unknown", geometry: f.geometry, isCustom: !!match };
                })
                .filter(c => c.name !== "Unknown" && c.isCustom);

            // Double check if any matches succeeded
            if (worldCountriesData.length === 0) {
                console.error("Data tracking warning: Zero country outlines matched your countries.json IDs.");
                if(container) container.innerHTML = "<h3>Data ID Mismatch Error</h3>";
                return;
            }

            if(container) container.innerHTML = '<svg id="outline-svg" width="320" height="240"></svg>';
            cycleNextPuzzle();
            setupInputEngine();
        })
        .catch(err => {
            console.error(err);
            if(container) container.innerHTML = "<h3>Error loading map assets.</h3>";
        });
}

function cycleNextPuzzle() {
    isProcessingTransition = false;
    topSuggestedMatch = null;
    currentCountry = worldCountriesData[Math.floor(Math.random() * worldCountriesData.length)];
    
    const container = document.getElementById('outline-canvas-container');
    if (container) container.className = "";

    const input = document.getElementById('guess-input');
    if (input) { input.value = ""; input.disabled = false; input.focus(); }

    drawOutline();
}

function drawOutline() {
    if (!currentCountry) return;
    const svg = d3.select("#outline-svg");
    svg.selectAll("*").remove();

    // Use geoMercator and dynamically fit the specific geometry to our exact bounding box dimensions
    const projection = d3.geoMercator().fitSize([320, 240], currentCountry.geometry);
    const pathGenerator = d3.geoPath().projection(projection);

    svg.append("path")
        .datum(currentCountry.geometry)
        .attr("d", pathGenerator)
        .attr("class", "country-path");
}

function setupInputEngine() {
    const input = document.getElementById('guess-input');
    const dropdown = document.getElementById('search-suggestions');
    if(!input || !dropdown) return;

    // Clear old event listeners to prevent memory leaks if pages switch
    const newInput = input.cloneNode(true);
    input.parentNode.replaceChild(newInput, input);
    
    newInput.addEventListener('input', () => {
        if (isProcessingTransition) return;
        const val = newInput.value.trim().toLowerCase();
        dropdown.innerHTML = "";
        topSuggestedMatch = null;
        if (!val) { dropdown.style.display = "none"; return; }

        // Filter countries that START WITH the string so "United st" perfectly hits "United States"
        const matches = worldCountriesData.filter(c => c.name.toLowerCase().startsWith(val)).slice(0, 4);

        if(matches.length > 0) {
            dropdown.style.display = "block";
            topSuggestedMatch = matches[0]; // Set the auto-prediction target
            
            matches.forEach((match, idx) => {
                const item = document.createElement('div');
                item.className = idx === 0 ? "autocomplete-item selected-top" : "autocomplete-item";
                item.innerText = match.name;
                item.addEventListener('click', () => {
                    newInput.value = match.name;
                    dropdown.style.display = "none";
                    processSubmission(match.name);
                });
                dropdown.appendChild(item);
            });
        } else { dropdown.style.display = "none"; }
    });

    newInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            dropdown.style.display = "none";
            let finalString = newInput.value.trim();
            
            // Auto-prediction checker: If entry isn't complete but matches an available country prediction, auto-complete it!
            const directMatch = worldCountriesData.find(c => c.name.toLowerCase() === finalString.toLowerCase());
            if (!directMatch && topSuggestedMatch) {
                finalString = topSuggestedMatch.name;
                newInput.value = finalString;
            }
            processSubmission(finalString);
        }
    });
}

function processSubmission(guessString) {
    if (isProcessingTransition || !currentCountry) return;
    
    const input = document.getElementById('guess-input');
    const feedback = document.getElementById('feedback-message');
    const container = document.getElementById('outline-canvas-container');

    isProcessingTransition = true;
    if (input) input.disabled = true;

    // Direct Evaluation
    if (guessString.toLowerCase() === currentCountry.name.toLowerCase()) {
        streak += 1;
        if(container) container.className = "flash-correct";
        if(feedback) feedback.innerHTML = `<span style="color:#10b981; font-weight:bold;">CORRECT! 🎉</span>`;
    } else {
        streak = 0; // Break Streak instantly
        if(container) container.className = "flash-wrong";
        if(feedback) feedback.innerHTML = `<span style="color:#ef4444; font-weight:bold;">WRONG! It was ${currentCountry.name}</span>`;
    }

    const streakEl = document.getElementById('hud-streak');
    if (streakEl) streakEl.innerText = streak;

    // 1.2 Second pacing loop transition duration
    setTimeout(() => {
        if(feedback) feedback.innerHTML = "";
        cycleNextPuzzle();
    }, 1200);
}
