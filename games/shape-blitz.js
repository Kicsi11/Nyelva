// games/shape-blitz.js - Completely Isolated Game Module

let currentCountry = null;
let worldCountriesData = [];
let streak = 0;
let isProcessingTransition = false;
let topSuggestedMatch = null;
let registryData = [];
let activeCloseDropdownHandler = null;
let currentFocusIndex = -1; // Tracks keyboard navigation inside autocomplete lists
let activeSessionId = 0;   // Circuit breaker token for async operations

export function initShapeBlitz() {
    // Increment active session token to instantly drop dangling promises from past views
    activeSessionId++;
    const localSessionId = activeSessionId;

    streak = 0;
    isProcessingTransition = false;
    topSuggestedMatch = null;
    currentCountry = null;
    currentFocusIndex = -1;
    
    const container = document.getElementById('outline-canvas-container');
    if (!container) return;
    
    container.innerHTML = `
        <div class="game-container">
            <div class="hud-score-board">Streak: <span id="hud-streak">0</span></div>
            <div id="canvas-viewframe" style="width:320px; height:240px; background:#0f172a; position:relative; display:flex; align-items:center; justify-content:center;">
                <h3>Syncing UN Outlines...</h3>
            </div>
            <div id="feedback-message"></div>
            <div class="controls-wrapper" style="position: relative;">
                <input type="text" id="guess-input" placeholder="Type country name..." autocomplete="off" disabled />
                <div id="search-suggestions" class="autocomplete-dropdown" style="display: none; position: absolute; left: 0; right: 0; z-index: 10;"></div>
            </div>
        </div>
    `;

    fetch('./data/countries.json')
        .then(res => res.json())
        .then(countriesList => {
            if (localSessionId !== activeSessionId) return; // Halt stale execution paths
            registryData = countriesList;
            return d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json");
        })
        .then(topoData => {
            if (!topoData || localSessionId !== activeSessionId) return;

            const features = topojson.feature(topoData, topoData.objects.countries).features;
            
            worldCountriesData = features
                .map(f => {
                    const cleanMapId = String(f.id).padStart(3, '0');
                    const match = registryData.find(item => String(item.id).padStart(3, '0') === cleanMapId);
                    return { name: match ? match.name : "Unknown", geometry: f.geometry, isCustom: !!match };
                })
                .filter(c => c.name !== "Unknown" && c.isCustom);

            const viewframe = document.getElementById('canvas-viewframe');
            if (worldCountriesData.length === 0) {
                console.error("Data tracking error: Zero country outlines successfully parsed matching registry IDs.");
                if (viewframe) viewframe.innerHTML = "<h3>Data ID Mismatch Error</h3>";
                return;
            }

            if (viewframe) viewframe.innerHTML = '<svg id="outline-svg" width="320" height="240"></svg>';
            
            const inputElement = setupInputEngine();
            cycleNextPuzzle(inputElement);
        })
        .catch(err => {
            if (localSessionId !== activeSessionId) return;
            console.error(err);
            const viewframe = document.getElementById('canvas-viewframe');
            if (viewframe) viewframe.innerHTML = "<h3>Error loading map assets.</h3>";
        });
}

function cycleNextPuzzle(activeInput) {
    isProcessingTransition = false;
    topSuggestedMatch = null;
    currentFocusIndex = -1;
    
    if (worldCountriesData.length === 0) return;
    currentCountry = worldCountriesData[Math.floor(Math.random() * worldCountriesData.length)];
    
    const viewframe = document.getElementById('canvas-viewframe');
    if (viewframe) viewframe.className = "";

    if (activeInput) { 
        activeInput.value = ""; 
        activeInput.disabled = false; 
        activeInput.focus(); 
    }

    const dropdown = document.getElementById('search-suggestions');
    if (dropdown) {
        dropdown.innerHTML = "";
        dropdown.style.display = "none";
    }

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
    if(!input || !dropdown) return null;
    
    input.addEventListener('input', () => {
        if (isProcessingTransition) return;
        const val = input.value.trim().toLowerCase();
        dropdown.innerHTML = "";
        topSuggestedMatch = null;
        currentFocusIndex = -1;
        
        if (!val) { dropdown.style.display = "none"; return; }

        const matches = worldCountriesData.filter(c => c.name.toLowerCase().startsWith(val)).slice(0, 4);

        if(matches.length > 0) {
            dropdown.style.display = "block";
            topSuggestedMatch = matches[0];
            
            matches.forEach((match, idx) => {
                const item = document.createElement('div');
                item.className = idx === 0 ? "autocomplete-item selected-top" : "autocomplete-item";
                item.innerText = match.name;
                
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    input.value = match.name;
                    dropdown.style.display = "none";
                    processSubmission(match.name, input);
                });
                dropdown.appendChild(item);
            });
        } else { dropdown.style.display = "none"; }
    });

    input.addEventListener('keydown', (e) => {
        if (isProcessingTransition) return;
        const items = dropdown.getElementsByTagName('div');

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (items.length === 0) return;
            currentFocusIndex++;
            if (currentFocusIndex >= items.length) currentFocusIndex = 0;
            setActiveItem(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (items.length === 0) return;
            currentFocusIndex--;
            if (currentFocusIndex < 0) currentFocusIndex = items.length - 1;
            setActiveItem(items);
        } else if (e.key === 'Escape') {
            dropdown.style.display = "none";
            currentFocusIndex = -1;
        } else if (e.key === 'Enter') {
            e.preventDefault();
            dropdown.style.display = "none";
            
            let finalString = input.value.trim();

            // If navigating elements via arrows, select the highlighted item
            if (currentFocusIndex > -1 && items[currentFocusIndex]) {
                finalString = items[currentFocusIndex].innerText;
                input.value = finalString;
            } else {
                const directMatch = worldCountriesData.find(c => c.name.toLowerCase() === finalString.toLowerCase());
                if (!directMatch && topSuggestedMatch) {
                    finalString = topSuggestedMatch.name;
                    input.value = finalString;
                }
            }
            processSubmission(finalString, input);
        }
    });

    if (activeCloseDropdownHandler) {
        document.removeEventListener('click', activeCloseDropdownHandler);
    }

    activeCloseDropdownHandler = (e) => {
        if (e.target !== input && e.target !== dropdown) {
            dropdown.style.display = "none";
            currentFocusIndex = -1;
        }
    };
    document.addEventListener('click', activeCloseDropdownHandler);

    return input;
}

function setActiveItem(items) {
    if (!items) return;
    // Strip manual and structural focus pseudo-classes
    for (let i = 0; i < items.length; i++) {
        items[i].classList.remove("selected-top");
        items[i].classList.remove("autocomplete-active");
    }
    if (currentFocusIndex > -1 && items[currentFocusIndex]) {
        items[currentFocusIndex].classList.add("autocomplete-active");
    }
}

function processSubmission(guessString, activeInput) {
    if (isProcessingTransition || !currentCountry) return;
    
    const feedback = document.getElementById('feedback-message');
    const viewframe = document.getElementById('canvas-viewframe');

    isProcessingTransition = true;
    if (activeInput) activeInput.disabled = true;

    if (guessString.toLowerCase() === currentCountry.name.toLowerCase()) {
        streak += 1;
        if(viewframe) viewframe.className = "flash-correct";
        if(feedback) feedback.innerHTML = `<span style="color:#10b981; font-weight:bold;">CORRECT! 🎉</span>`;
    } else {
        streak = 0; 
        if(viewframe) viewframe.className = "flash-wrong";
        if(feedback) feedback.innerHTML = `<span style="color:#ef4444; font-weight:bold;">WRONG! It was ${currentCountry.name}</span>`;
    }

    const streakEl = document.getElementById('hud-streak');
    if (streakEl) streakEl.innerText = streak;

    setTimeout(() => {
        if(feedback) feedback.innerHTML = "";
        cycleNextPuzzle(activeInput);
    }, 1200);
}
