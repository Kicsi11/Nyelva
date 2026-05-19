import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// --- YOUR LIVE FIREBASE CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyAy15aCrA51xFfgK5U01xX9Ed79UzdOysA",
    authDomain: "nyelva.firebaseapp.com",
    databaseURL: "https://nyelva-default-rtdb.firebaseio.com",
    projectId: "nyelva",
    storageBucket: "nyelva.firebasestorage.app",
    messagingSenderId: "972474970074",
    appId: "1:972474970074:web:60b86aef05258059a05ae3"
};

// Initialize Firebase Core Instances
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUserProfile = null;

// --- CUSTOM GEOGRAPHY DATA MATRIX ---
// Customize or swap this array completely to use your own shapes and names.
const customBlitzDataRegistry = [
    { name: "United States", id: "840" },
    { name: "Canada", id: "124" },
    { name: "United Kingdom", id: "826" },
    { name: "France", id: "250" },
    { name: "Germany", id: "276" },
    { name: "Japan", id: "392" },
    { name: "Australia", id: "036" },
    { name: "Brazil", id: "076" },
    { name: "India", id: "356" },
    { name: "Italy", id: "380" }
];

// --- APP PAGES & TEMPLATE STRUCTURAL RENDERS ---
const pages = {
    home: `
        <section class="page-content">
            <h1>Welcome to Nyelva</h1>
            <p class="subtitle">Your destination for high-speed language and geography mini-games.</p>
            <div style="margin-top: 20px;">
                <a href="#games" class="btn-play" style="padding: 14px 28px;">Open Games Matrix</a>
            </div>
        </section>
    `,
    games: `
        <section class="page-content">
            <h1>Nyelva Arcade Arena</h1>
            <p class="subtitle">Select an ongoing module challenge below.</p>
            <div class="games-grid">
                <div class="game-card">
                    <h3>Endless Shape Blitz</h3>
                    <p>Identify country boundaries rapidly back-to-back. Fast inputs with zero cool-down mechanics.</p>
                    <a href="#blitz-game" class="btn-play">Launch Blitz</a>
                </div>
                <div class="game-card" style="opacity: 0.6;">
                    <h3>Vocab Matcher</h3>
                    <p>Connect phrases across target global vocab lists under ticking timers.</p>
                    <span style="color: #94a3b8; font-size: 0.8rem; font-weight: bold; text-transform: uppercase;">Coming Soon</span>
                </div>
            </div>
        </section>
    `,
    "blitz-game": `
        <section class="page-content">
            <h1>ENDLESS SHAPE BLITZ</h1>
            <p style="color: #94a3b8; font-size: 0.95rem; margin-bottom: 15px;">Type answer, hit Enter. Top auto-predictions select instantly.</p>
            <div class="game-container">
                <div id="outline-canvas-container"><svg id="outline-svg" width="320" height="240"></svg></div>
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
    `,
    account: `
        <section class="page-content">
            <h1>Nyelva Competitive Hub</h1>
            <p class="subtitle">Sign in to save records and compete on the global tracking board.</p>
            <div class="account-split-layout">
                <div id="auth-panel-view">
                    <h3 style="color:#38bdf8; margin-bottom:15px;">Player Authentication</h3>
                    <div class="auth-form">
                        <input type="text" id="auth-username" placeholder="Gamertag / Username">
                        <input type="email" id="auth-email" placeholder="Email Address">
                        <input type="password" id="auth-password" placeholder="Password Key">
                        <button class="btn-play" id="btn-login">Sign In</button>
                        <button class="btn-play" id="btn-register" style="background:#475569; color:white;">Create Account</button>
                    </div>
                </div>
                <div>
                    <h3 style="color:#38bdf8; margin-bottom:15px;">Global Streak Leaderboard (Top 5)</h3>
                    <table class="leaderboard-table">
                        <thead><tr><th>Rank</th><th>Player</th><th>Max Streak</th></tr></thead>
                        <tbody id="leaderboard-rows"><tr><td colspan="3" style="text-align:center;">Fetching top streaks...</td></tr></tbody>
                    </table>
                </div>
            </div>
        </section>
    `,
    legal: `
        <section class="page-content text-left">
            <h1>Legal Compliance Center</h1>
            <p class="subtitle" style="text-align: center;">Required documentation for AdSense eligibility.</p>
            <hr style="border-color: #334155; margin-bottom: 2rem;">
            <h2>Privacy Policy</h2>
            <p>At Nyelva, safeguarding data properties is critical. This document details collection procedures handled directly on our systems.</p>
            <p><b>Cookies & Tracking:</b> Third-party networks, including Google AdSense, execute DART network diagnostic telemetry cookies to deploy relative promotional graphics based on ongoing ecosystem navigation history profiles.</p>
            <h2>Terms of Service</h2>
            <p>By engaging with interactive layout nodes within Nyelva, you validate operational user agreements. Geometric calculation streams are delivered via open-source spatial maps definitions.</p>
            <h2>About & Support Information</h2>
            <p>Nyelva is an independent educational platform tracking geographic silhouette performance records. To query system webmaster parameters, submit tracking inquiries directly inside our codebase file logs.</p>
        </section>
    `
};

// --- CLIENT SYSTEM ROUTING LOGIC ---
function handleRouting() {
    let pageKey = window.location.hash.substring(1);
    if (!pageKey) pageKey = 'home';
    
    const contentArea = document.getElementById('content-area');
    if (pages[pageKey]) {
        contentArea.innerHTML = pages[pageKey];
    } else {
        contentArea.innerHTML = `<section class="page-content"><h1>404</h1><p>Layer missing.</p></section>`;
    }

    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.getAttribute('data-page') === pageKey || (pageKey === 'blitz-game' && link.getAttribute('data-page') === 'games'));
    });

    if (pageKey === 'blitz-game') initGame();
    if (pageKey === 'account') setupAuthUIListeners();
}

window.addEventListener('hashchange', handleRouting);
document.addEventListener('DOMContentLoaded', () => {
    handleRouting();
    
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const docSnap = await getDoc(doc(db, "users", user.uid));
            if (docSnap.exists()) currentUserProfile = docSnap.data();
        } else {
            currentUserProfile = null;
        }
    });
});


// --- PLAYER AUTHENTICATION & LEADERBOARD CONTROLLERS ---
function setupAuthUIListeners() {
    renderLeaderboard();
    
    const loginBtn = document.getElementById('btn-login');
    const registerBtn = document.getElementById('btn-register');
    const panel = document.getElementById('auth-panel-view');

    if (currentUserProfile && panel) {
        panel.innerHTML = `
            <h3 style="color:#10b981; margin-bottom:10px;">Logged In As: ${currentUserProfile.username}</h3>
            <p style="margin-bottom:15px; color:#94a3b8;">Personal Best Streak: <b>${currentUserProfile.highestStreak || 0}</b></p>
            <button class="btn-play" id="btn-logout" style="background:#ef4444; color:white;">Logout Account</button>
        `;
        document.getElementById('btn-logout').addEventListener('click', () => {
            signOut(auth).then(() => handleRouting());
        });
        return;
    }

    if(registerBtn) {
        registerBtn.addEventListener('click', () => {
            const username = document.getElementById('auth-username').value.trim();
            const email = document.getElementById('auth-email').value.trim();
            const password = document.getElementById('auth-password').value;

            if(!username || !email || !password) return alert("Fill out all forms to proceed.");

            createUserWithEmailAndPassword(auth, email, password)
                .then(async (credential) => {
                    const userData = { uid: credential.user.uid, username: username, highestStreak: 0 };
                    await setDoc(doc(db, "users", credential.user.uid), userData);
                    currentUserProfile = userData;
                    alert("Account setup success!");
                    handleRouting();
                }).catch(err => alert(err.message));
        });
    }

    if(loginBtn) {
        loginBtn.addEventListener('click', () => {
            const email = document.getElementById('auth-email').value.trim();
            const password = document.getElementById('auth-password').value;

            signInWithEmailAndPassword(auth, email, password)
                .then(async (credential) => {
                    const docSnap = await getDoc(doc(db, "users", credential.user.uid));
                    if (docSnap.exists()) currentUserProfile = docSnap.data();
                    alert("Welcome back!");
                    handleRouting();
                }).catch(err => alert(err.message));
        });
    }
}

async function renderLeaderboard() {
    const rowsContainer = document.getElementById('leaderboard-rows');
    if (!rowsContainer) return;

    try {
        const q = query(collection(db, "users"), orderBy("highestStreak", "desc"), limit(5));
        const querySnapshot = await getDocs(q);
        rowsContainer.innerHTML = "";
        
        let rank = 1;
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const row = document.createElement('tr');
            row.innerHTML = `<td>${rank++}</td><td>${data.username}</td><td><b>${data.highestStreak}</b></td>`;
            rowsContainer.appendChild(row);
        });
        
        if(rank === 1) rowsContainer.innerHTML = `<tr><td colspan="3" style="text-align:center;">No players tracked yet.</td></tr>`;
    } catch (e) {
        rowsContainer.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#ef4444;">Error syncing board records.</td></tr>`;
    }
}


// --- RAPID CYCLE BLITZ GAME MODULE ENGINE ---
let currentCountry = null;
let worldCountriesData = [];
let score = 0;
let streak = 0;
let isProcessingTransition = false; 
let topSuggestedMatch = null; 

function initGame() {
    score = 0; streak = 0; isProcessingTransition = false; topSuggestedMatch = null;
    const container = document.getElementById('outline-canvas-container');
    if(container) container.innerHTML = "<h3>Syncing Core Boundaries...</h3>";

    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json").then(topoData => {
        const features = topojson.feature(topoData, topoData.objects.countries).features;
        
        worldCountriesData = features
            .map(f => {
                const userMatch = customBlitzDataRegistry.find(item => item.id === f.id);
                return { name: userMatch ? userMatch.name : f.properties.name || "Unknown", geometry: f.geometry, isCustom: !!userMatch };
            })
            .filter(c => c.name !== "Unknown" && c.isCustom);

        if (worldCountriesData.length === 0) {
            if(container) container.innerHTML = "<h3 style='color:#ef4444;'>Custom Array Mismatched. Check Registry IDs.</h3>";
            return;
        }

        if(container) container.innerHTML = '<svg id="outline-svg" width="320" height="240"></svg>';
        cycleNextPuzzle();
        setupAutocompleteInput();
    }).catch(err => {
        console.error(err);
        if(container) container.innerHTML = "<h3>Error initializing map layer canvas.</h3>";
    });
}

function cycleNextPuzzle() {
    isProcessingTransition = false; topSuggestedMatch = null;
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

    svg.append("path").datum(currentCountry.geometry).attr("d", pathGenerator).attr("class", "country-path");
}

function setupAutocompleteInput() {
    const input = document.getElementById('guess-input');
    const dropdown = document.getElementById('search-suggestions');
    if(!input || !dropdown) return;

    input.addEventListener('input', () => {
        if (isProcessingTransition) return;
        const val = input.value.trim().toLowerCase();
        dropdown.innerHTML = ""; topSuggestedMatch = null;
        if (!val) { dropdown.style.display = "none"; return; }

        const matches = worldCountriesData.filter(c => c.name.toLowerCase().includes(val)).slice(0, 4);

        if(matches.length > 0) {
            dropdown.style.display = "block"; topSuggestedMatch = matches[0];
            matches.forEach((match, idx) => {
                const item = document.createElement('div');
                item.className = idx === 0 ? "autocomplete-item selected-top" : "autocomplete-item";
                item.innerText = match.name;
                item.addEventListener('click', () => {
                    input.value = match.name; dropdown.style.display = "none";
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
            const direct = worldCountriesData.find(c => c.name.toLowerCase() === finalString.toLowerCase());
            if (!direct && topSuggestedMatch) { finalString = topSuggestedMatch.name; input.value = finalString; }
            processSubmission(finalString);
        }
    });
}

async function processSubmission(guessString) {
    if (isProcessingTransition || !currentCountry) return;
    
    const input = document.getElementById('guess-input');
    const feedback = document.getElementById('feedback-message');
    const container = document.getElementById('outline-canvas-container');
    const guessedCountry = worldCountriesData.find(c => c.name.toLowerCase() === guessString.toLowerCase());

    if (!guessedCountry) {
        if(feedback) feedback.innerHTML = `<span style="color:#e67e22; font-size:1rem;">Select valid entries!</span>`;
        return;
    }

    isProcessingTransition = true; input.disabled = true;

    if (guessedCountry.name.toLowerCase() === currentCountry.name.toLowerCase()) {
        score += 10; streak += 1;
        if(container) container.className = "flash-correct";
        if(feedback) feedback.innerHTML = `<span style="color:#10b981;">CORRECT! 🎉</span>`;
        
        if (currentUserProfile && streak > currentUserProfile.highestStreak) {
            currentUserProfile.highestStreak = streak;
            await setDoc(doc(db, "users", currentUserProfile.uid), currentUserProfile, { merge: true });
        }
    } else {
        streak = 0;
        if(container) container.className = "flash-wrong";
        if(feedback) feedback.innerHTML = `<span style="color:#ef4444;">WRONG! It was ${currentCountry.name}</span>`;
    }

    const scoreEl = document.getElementById('hud-score');
    const streakEl = document.getElementById('hud-streak');
    if (scoreEl) scoreEl.innerText = score;
    if (streakEl) streakEl.innerText = streak;

    setTimeout(() => {
        if(feedback) feedback.innerHTML = "";
        cycleNextPuzzle();
    }, 1200);
}
