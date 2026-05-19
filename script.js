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


// --- LOCALIZED DATA COMPASS ENGINE ---
let currentCountry = null;
let worldCountriesData = [];
const maxAttempts = 6;
let currentAttempts = 0;
let gameOver = false;

function initGame() {
    gameOver = false;
    currentAttempts = 0;
    
    const container = document.getElementById('outline-canvas-container');
    const guessList = document.getElementById('guesses-container');
    if(guessList) guessList.innerHTML = "";
    if(container) container.innerHTML = "<h3>Loading Global Boundary Assets...</h3>";

    // Request singular data stream to completely stop CORS fetch blocks
    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json").then(topoData => {
        
        // Use topojson client to extract features directly
        const features = topojson.feature(topoData, topoData.objects.countries).features;

        worldCountriesData = features
            .map(f => {
                const centroid = d3.geoCentroid(f);
                return {
                    // Pulling directly from feature boundaries structure
                    name: f.properties.name || "Unknown",
                    geometry: f.geometry,
                    center: { lon: centroid[0], lat: centroid[1] }
                };
            })
            .filter(c => c.name !== "Unknown" && c.name !== "Antarctica" && c.name !== "Fr. S. Antarctic Lands");

        // Fallback checks to ensure system array holds names properly
        if (worldCountriesData.length === 0 || worldCountriesData[0].name === "Unknown") {
            // High-compatibility alternative names registry mapping fallback loop
            const fallbackNames = {"242":"Fiji","834":"Tanzania","004":"Afghanistan","024":"Angola","008":"Albania","784":"United Arab Emirates","032":"Argentina","051":"Armenia","010":"Antarctica","260":"Fr. S. Antarctic Lands","036":"Australia","040":"Austria","031":"Azerbaijan","108":"Burundi","056":"Belgium","204":"Benin","854":"Burkina Faso","050":"Bangladesh","100":"Bulgaria","048":"Bahrain","044":"Bahamas","070":"Bosnia and Herz.","112":"Belarus","084":"Belize","060":"Bermuda","068":"Bolivia","076":"Brazil","096":"Brunei","064":"Bhutan","072":"Botswana","140":"Central African Rep.","124":"Canada","250":"France","756":"Switzerland","152":"Chile","156":"China","384":"Côte d'Ivoire","120":"Cameroon","180":"Dem. Rep. Congo","178":"Congo","170":"Colombia","192":"Cuba","531":"Curaçao","196":"Cyprus","203":"Czechia","276":"Germany","262":"Djibouti","208":"Denmark","214":"Dominican Rep.","12 Cyprus":"Cyprus","231":"Ethiopia","246":"Finland","232":"Eritrea","724":"Spain","233":"Estonia","242":"Fiji","2 Falkland Is.":"Falkland Is.","139":"Gabon","826":"United Kingdom","268":"Georgia","288":"Ghana","242":"Guinea","270":"Gambia","306":"Guinea-Bissau","226":"Eq. Guinea","300":"Greece","320":"Guatemala","328":"Guyana","344":"Hong Kong","340":"Honduras","191":"Croatia","332":"Haiti","348":"Hungary","360":"Indonesia","356":"India","372":"Ireland","364":"Iran","368":"Iraq","352":"Iceland","376":"Israel","380":"Italy","388":"Jamaica","400":"Jordan","392":"Japan","398":"Kazakhstan","404":"Kenya","417":"Kyrgyzstan","418":"Cambodia","414":"Kuwait","422":"Lebanon","430":"Liberia","434":"Libya","450":"Madagascar","484":"Mexico","466":"Mali","470":"Malta","496":"Mongolia","508":"Mozambique","478":"Mauritania","498":"Moldova","516":"Namibia","540":"New Caledonia","562":"Niger","566":"Nigeria","558":"Nicaragua","528":"Netherlands","578":"Norway","524":"Nepal","554":"New Zealand","512":"Oman","586":"Pakistan","591":"Panama","604":"Peru","608":"Philippines","616":"Poland","630":"Puerto Rico","408":"North Korea","620":"Portugal","600":"Paraguay","642":"Romania","643":"Russia","646":"Rwanda","682":"Saudi Arabia","706":"Somalia","686":"Senegal","702":"Singapore","688":"Serbia","703":"Slovakia","705":"Slovenia","752":"Sweden","748":"Eswatini","760":"Syria","762":"Tajikistan","764":"Thailand","795":"Turkmenistan","626":"Timor-Leste","780":"Trinidad and Tobago","788":"Tunisia","792":"Turkey","716":"Zimbabwe","728":"South Sudan","729":"Sudan","740":"Suriname","710":"South Africa","800":"Uganda","804":"Ukraine","858":"Uruguay","840":"United States","860":"Uzbekistan","862":"Venezuela","704":"Vietnam","548":"Vanuatu","275":"Palestine","887":"Yemen","262":"Djibouti","144":"Sri Lanka","454":"Malawi","116":"Cambodia","384":"Côte d'Ivoire"};
            
            features.forEach((f, idx) => {
                if(worldCountriesData[idx] && fallbackNames[f.id]) {
                    worldCountriesData[idx].name = fallbackNames[f.id];
                }
            });
        }

        // Target active randomized instance configuration
        currentCountry = worldCountriesData[Math.floor(Math.random() * worldCountriesData.length)];

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
        if(container) container.innerHTML = "<h3>Render Error. Please reload the dashboard.</h3>";
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

    const guessedCountry = worldCountriesData.find(c => c.name.toLowerCase() === guessNormal);

    if (!guessedCountry) {
        feedback.innerHTML = `<span style="color: #e67e22;">Valid country name required!</span>`;
        return;
    }

    currentAttempts++;
    input.value = ""; 
    feedback.innerHTML = "";

    // WIN CONDITION MATCHED
    if (guessNormal === currentCountry.name.toLowerCase()) {
        addClueRow(guessedCountry.name, 0, "🎉", 100, "#2ecc71");
        feedback.innerHTML = `<span style="color: #2ecc71;">Splendid! You guessed ${currentCountry.name}!</span>`;
        endGame();
        return;
    }

    // VECTOR DISTANCE GEODESIC MATH
    const distance = Math.round(getHaversineDistance(guessedCountry.center, currentCountry.center));
    const bearing = getBearing(guessedCountry.center, currentCountry.center);
    const directionArrow = getDirectionArrow(bearing);
    const proximityPct = Math.max(0, Math.round(((20000 - distance) / 20000) * 100));

    let hueColor = "#e74c3c";
    if(proximityPct > 45) hueColor = "#e67e22";
    if(proximityPct > 75) hueColor = "#f1c40f";

    addClueRow(guessedCountry.name, distance, directionArrow, proximityPct, hueColor);

    // LOSS MAX ATTEMPTS REACHED
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

// Spherical vector triangulation helpers
function getHaversineDistance(p1, p2) {
    const R = 6371; 
    const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
    const dLon = ((p2.lon - p1.lon) * Math.PI) / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((p1.lat * Math.PI) / 180) * Math.cos((p2.lat * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
}

function getBearing(p1, p2) {
    const lat1 = (p1.lat * Math.PI) / 180;
    const lat2 = (p2.lat * Math.PI) / 180;
    const dLon = ((p2.lon - p1.lon) * Math.PI) / 180;

    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    let brng = Math.atan2(y, x);
    return (((brng * 180) / Math.PI + 360) % 360);
}

function getDirectionArrow(bearing) {
    const directions = ["⬆️", "↗️", "➡️", "↘️", "⬇️", "↙️", "⬅️", "↖️"];
    const index = Math.round(bearing / 45) % 8;
    return directions[index];
}
