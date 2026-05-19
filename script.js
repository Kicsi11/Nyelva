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
            <ul style="list-style: none; padding: 0; margin-top: 15px;">
                <li><a href="#map" style="display: inline-block; background: #38bdf8; color: #0f172a; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Blitz Shape Quest</a></li>
            </ul>
        </section>
    `,
    map: `
        <section class="page-content">
            <h1>ENDLESS SHAPE BLITZ</h1>
            <p style="color: #94a3b8; font-size: 0.95rem; margin-bottom: 15px;">Type answer, hit Enter. Immediate validation cycling.</p>
            
            <div class="game-container">
                <div id="outline-canvas-container">
                    <svg id="outline-svg" width="300" height="220"></svg>
                </div>

                <div class="controls-wrapper">
                    <input type="text" id="guess-input" placeholder="Type country & press Enter..." autocomplete="off">
                    <div class="autocomplete-dropdown" id="search-suggestions"></div>
                </div>

                <div id="feedback-message"></div>

                <div class="hud-score-board">
                    <div>Score: <span id="hud-score">0</span></div>
                    <div>Streak: <span id="hud-streak">0</span></div>
                </div>
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


// --- STREAMLINED RAPID CYCLE BLITZ ENGINE ---
let currentCountry = null;
let worldCountriesData = [];
let score = 0;
let streak = 0;
let isProcessingTransition = false; // Lock flag to prevent double processing errors

function initGame() {
    score = 0;
    streak = 0;
    isProcessingTransition = false;
    
    const container = document.getElementById('outline-canvas-container');
    if(container) container.innerHTML = "<h3>Syncing Global Outlines...</h3>";

    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json").then(topoData => {
        const features = topojson.feature(topoData, topoData.objects.countries).features;

        const fallbackNames = {"242":"Fiji","834":"Tanzania","004":"Afghanistan","024":"Angola","008":"Albania","784":"UAE","032":"Argentina","051":"Armenia","036":"Australia","040":"Austria","031":"Azerbaijan","108":"Burundi","056":"Belgium","204":"Benin","854":"Burkina Faso","050":"Bangladesh","100":"Bulgaria","044":"Bahamas","070":"Bosnia","112":"Belarus","084":"Belize","068":"Bolivia","076":"Brazil","064":"Bhutan","072":"Botswana","124":"Canada","250":"France","756":"Switzerland","152":"Chile","156":"China","384":"Ivory Coast","120":"Cameroon","180":"DR Congo","178":"Congo","170":"Colombia","192":"Cuba","196":"Cyprus","203":"Czechia","276":"Germany","208":"Denmark","214":"Dominican Rep","231":"Ethiopia","246":"Finland","724":"Spain","233":"Estonia","139":"Gabon","826":"United Kingdom","268":"Georgia","288":"Ghana","300":"Greece","320":"Guatemala","328":"Guyana","340":"Honduras","191":"Croatia","332":"Haiti","348":"Hungary","360":"Indonesia","356":"India","372":"Ireland","364":"Iran","368":"Iraq","352":"Iceland","376":"Israel","380":"Italy","388":"Jamaica","400":"Jordan","392":"Japan","398":"Kazakhstan","404":"Kenya","418":"Cambodia","422":"Lebanon","430":"Liberia","434":"Libya","450":"Madagascar","484":"Mexico","466":"Mali","496":"Mongolia","508":"Mozambique","478":"Mauritania","498":"Moldova","516":"Namibia","562":"Niger","566":"Nigeria","558":"Nicaragua","528":"Netherlands","578":"Norway","524":"Nepal","554":"New Zealand","512":"Oman","586":"Pakistan","591":"Panama","604":"Peru","608":"Philippines","616":"Poland","408":"North Korea","620":"Portugal","600":"Paraguay","642":"Romania","643":"Russia","646":"Rwanda","682":"Saudi Arabia","706":"Somalia","686":"Senegal","688":"Serbia","703":"Slovakia","705":"Slovenia","752":"Sweden","760":"Syria","762":"Tajikistan","764":"Thailand","795":"Turkmenistan","626":"Timor-Leste","788":"Tunisia","792":"Turkey","716":"Zimbabwe","728":"South Sudan","729":"Sudan","710":"South Africa","800":"Uganda","804":"Ukraine","858":"Uruguay","840":"United States","860":"Uzbekistan","862":"Venezuela","704":"Vietnam","887":"Yemen","144":"Sri Lanka","454":"Malawi"};
        
        worldCountriesData = features
            .map(f => {
                return {
                    name: fallbackNames[f.id] || f.properties.name || "Unknown",
                    geometry: f.geometry
                };
            })
            .filter(c => c.name !== "Unknown" && c.name !== "Antarctica" && c.name !== "Fr. S. Antarctic Lands");

        if(container) container.innerHTML = '<svg id="outline-svg" width="300" height="220"></svg>';
        
        cycleNextPuzzle();
        setupAutocompleteInput();
    }).catch(err => {
        console.error(err);
        if(container) container.innerHTML = "<h3>Error loading map assets.</h3>";
    });
}

function cycleNextPuzzle() {
    isProcessingTransition = false;
    
    // Pick next target country
    currentCountry = worldCountriesData[Math.floor(Math.random() * worldCountriesData.length)];
    
    // Wipe borders clean of any color state modifiers
    const container = document.getElementById('outline-canvas-container');
    if (container) {
        container.className = "";
    }

    const input = document.getElementById('guess-input');
    if (input) {
        input.value = "";
        input.disabled = false;
        input.focus();
    }

    drawOutline();
}

function drawOutline() {
    if (!currentCountry) return;
    const svg = d3.select("#outline-svg");
    svg.selectAll("*").remove();

    const projection = d3.geoMercator().fitSize([300, 220], currentCountry.geometry);
    const pathGenerator = d3.geoPath().projection(projection);

    svg.append("path")
        .datum(currentCountry.geometry)
        .attr("d", pathGenerator)
        .attr("fill", "#f8fafc") // High-contrast clean white country shape fill
        .attr("stroke", "#64748b")
        .attr("stroke-width", 1);
}

// --- LIGHTWEIGHT RUNTIME AUTOCOMPLETE ---
function setupAutocompleteInput() {
    const input = document.getElementById('guess-input');
    const dropdown = document.getElementById('search-suggestions');
    
    if(!input || !dropdown) return;

    input.addEventListener('input', () => {
        if (isProcessingTransition) return;
        const val = input.value.trim().toLowerCase();
        dropdown.innerHTML = "";
        
        if (!val) {
            dropdown.style.display = "none";
            return;
        }

        const matches = worldCountriesData.filter(c => c.name.toLowerCase().includes(val)).slice(0, 4);

        if(matches.length > 0) {
            dropdown.style.display = "block";
            matches.forEach(match => {
                const item = document.createElement('div');
                item.className = "autocomplete-item";
                item.innerText = match.name;
                item.addEventListener('click', () => {
                    input.value = match.name;
                    dropdown.style.display = "none";
                    processSubmission(); // Submit instantly on list item click select
                });
                dropdown.appendChild(item);
            });
        } else {
            dropdown.style.display = "none";
        }
    });

    document.addEventListener('click', (e) => {
        if (e.target !== input) dropdown.style.display = "none";
    });

    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            dropdown.style.display = "none";
            processSubmission();
        }
    });
}

// --- FAST SUBMISSION PROCESSING ROUTINE ---
function processSubmission() {
    if (isProcessingTransition || !currentCountry) return;
    
    const input = document.getElementById('guess-input');
    const feedback = document.getElementById('feedback-message');
    const container = document.getElementById('outline-canvas-container');
    const rawGuess = input.value.trim();

    const guessedCountry = worldCountriesData.find(c => c.name.toLowerCase() === rawGuess.toLowerCase());

    if (!guessedCountry) {
        if(feedback) feedback.innerHTML = `<span style="color: #e67e22; font-size: 1rem;">Select from menu lists!</span>`;
        return;
    }

    isProcessingTransition = true; // Lock controls
    input.disabled = true;

    // VALIDATION LOGIC
    if (guessedCountry.name.toLowerCase() === currentCountry.name.toLowerCase()) {
        score += 10;
        streak += 1;
        if(container) container.className = "flash-correct";
        if(feedback) feedback.innerHTML = `<span style="color: #10b981;">CORRECT! 🎉</span>`;
    } else {
        streak = 0;
        if(container) container.className = "flash-wrong";
        if(feedback) feedback.innerHTML = `<span style="color: #ef4444;">WRONG! It was ${currentCountry.name}</span>`;
    }

    // Refresh display values on scoreboard instantly
    updateScores();

    // RAPID CYCLE TIMER TRIGGER (Swaps outlines after exactly 1.2 seconds)
    setTimeout(() => {
        if(feedback) feedback.innerHTML = "";
        cycleNextPuzzle();
    }, 1200);
}

function updateScores() {
    const scoreEl = document.getElementById('hud-score');
    const streakEl = document.getElementById('hud-streak');
    if (scoreEl) scoreEl.innerText = score;
    if (streakEl) streakEl.innerText = streak;
}
