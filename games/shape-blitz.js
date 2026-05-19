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
                    const match = registryData.find(item => item.id === f.id);
                    return { name: match ? match.name : "Unknown", geometry: f.geometry, isCustom: !!match };
                })
                .filter(c => c.name !== "Unknown" && c.isCustom);

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

    input.addEventListener('input', () => {
        if (isProcessingTransition) return;
        const val = input.value.trim().toLowerCase();
        dropdown.innerHTML = "";
        topSuggestedMatch = null;
        if (!val) { dropdown.style.display = "none"; return; }

        // Find matches that contain or begin with input characters
        const matches = worldCountriesData.filter(c => c.name.toLowerCase().includes(val)).slice(0, 4);

        if(matches.length > 0) {
            dropdown.style.display = "block";
            topSuggestedMatch = matches[0]; // Set the auto-prediction target
            
            matches.forEach((match, idx) => {
                const item = document.createElement('div');
                item.className = idx === 0 ? "autocomplete-item selected-top" : "autocomplete-item";
                item.innerText = match.name;
                item.addEventListener('click', () => {
                    input.value = match.name;
                    dropdown.style.display = "none";
                    processSubmission(match.name);
                });
                dropdown.appendChild(item);
            });
        } else { dropdown.style.display = "none"; }
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            dropdown.style.display = "none";
            let finalString = input.value.trim();
            
            // Auto-prediction checker: If entry isn't complete but matches an available country prediction, auto-complete it!
            const directMatch = worldCountriesData.find(c => c.name.toLowerCase() === finalString.toLowerCase());
            if (!directMatch && topSuggestedMatch) {
                finalString = topSuggestedMatch.name;
                input.value = finalString;
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
    input.disabled = true;

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

    // Instant pacing loop transition duration
    setTimeout(() => {
        if(feedback) feedback.innerHTML = "";
        cycleNextPuzzle();
    }, 1200);
}
