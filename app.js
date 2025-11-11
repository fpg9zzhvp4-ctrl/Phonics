// === ELEMENTS ===
const levelSelect = document.getElementById("levelSelect");
const weeksContainer = document.getElementById("weeks");
const gameScreen = document.getElementById("game");
const menuScreen = document.getElementById("menu");
const finishScreen = document.getElementById("finish");
const wordDisplay = document.getElementById("word-display");
const alienIconDiv = document.getElementById("alien-icon");
const wordResultsDiv = document.getElementById("word-results");
const summaryDiv = document.getElementById("summary");
const correctBtn = document.getElementById("correct");
const wrongBtn = document.getElementById("wrong");
const startBtn = document.getElementById("start-btn");
const practiceTestBtn = document.getElementById("practiceTestBtn");

// === DATA ===
let wordsData = [];
let currentLevel = null;
let sessionWords = [];
let currentWordIndex = 0;
let currentWord = null;
let practiceTestMode = false;
let attempts = {};

// === HELPERS ===
function asNumber(v) {
	const n = Number(v);
	return Number.isNaN(n) ? null : n;
}

// === PERSISTENCE ===
function saveProgress() {
	try {
		localStorage.setItem("phonicsAttempts", JSON.stringify(attempts));
		console.log("✅ Progress saved");
	} catch (e) {
		console.warn("Save failed:", e);
	}
}

function loadProgress() {
	try {
		const stored = localStorage.getItem("phonicsAttempts");
		if (stored) {
			attempts = JSON.parse(stored);
			console.log("📂 Progress loaded:", attempts);
		} else {
			console.log("ℹ️ No previous progress found");
		}
	} catch (e) {
		console.warn("Load failed:", e);
	}
}

// === LOAD WORDS ===
async function loadWords() {
	try {
		const res = await fetch("words.json");
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		wordsData = await res.json();
		if (!Array.isArray(wordsData)) {
			console.error("Invalid words.json");
			return;
		}
		console.log("📘 Loaded words.json:", wordsData.length);
		populateLevelSelect();
	} catch (e) {
		console.error("Failed to load words.json:", e);
	}
}

// === POPULATE LEVELS ===
function populateLevelSelect() {
	const levelsSet = new Set();
	wordsData.forEach((w) => {
		const lvl = asNumber(w.level);
		if (lvl !== null) levelsSet.add(lvl);
	});
	const levels = [...levelsSet].sort((a, b) => a - b);
	levelSelect.innerHTML = '<option value="">-- Choose a level --</option>';
	levels.forEach((lvl) => {
		const opt = document.createElement("option");
		opt.value = String(lvl);
		opt.textContent = `Level ${lvl}`;
		levelSelect.appendChild(opt);
	});
}

// === RENDER WEEKS ===
levelSelect.addEventListener("change", () => {
	currentLevel = asNumber(levelSelect.value);
	renderWeeks();
});

function renderWeeks() {
	weeksContainer.innerHTML = "";
	if (currentLevel === null) return;

	const weeksSet = new Set();
	wordsData.forEach((w) => {
		const lvl = asNumber(w.level);
		const wk = asNumber(w.week);
		if (lvl === currentLevel && wk !== null) weeksSet.add(wk);
	});
	const weeks = [...weeksSet].sort((a, b) => a - b);

	if (weeks.length === 0) {
		weeksContainer.textContent = "No weeks available for this level.";
		return;
	}

	weeks.forEach((week) => {
		const btn = document.createElement("button");
		btn.className = "week-btn";

		// Week label
		const textSpan = document.createElement("span");
		textSpan.textContent = `Week ${week}`;
		btn.appendChild(textSpan);

		// Stars container
		const starsSpan = document.createElement("span");
		starsSpan.className = "week-stars";
		starsSpan.style.marginLeft = "6px";
		btn.appendChild(starsSpan);

		btn.onclick = () => startWeek(currentLevel, week);
		weeksContainer.appendChild(btn);

		// Update stars for this week
		updateWeekProgressStars(btn, currentLevel, week);
	});
}

// === UPDATE WEEK PROGRESS STARS ===
function updateWeekProgressStars(btn, level, week) {
	const starsSpan = btn.querySelector(".week-stars");
	if (!starsSpan) return;

	let totalStars = 0;
	let maxStars = 0;

	wordsData.forEach((w) => {
		if (asNumber(w.level) === asNumber(level) && asNumber(w.week) === asNumber(week)) {
			const key = `${w.word}-${w.level}-${w.week}`;
			const count = attempts[key] || 0;
			totalStars += count;
			maxStars += 3; // max 3 stars per word
		}
	});

	const percent = maxStars > 0 ? Math.round((totalStars / maxStars) * 100) : 0;
	starsSpan.textContent = "★".repeat(Math.round((totalStars / maxStars) * 3)) + "☆".repeat(3 - Math.round((totalStars / maxStars) * 3));
	starsSpan.title = `Progress: ${percent}%`;
}

// === START WEEK / SESSION ===
function startWeek(level, week = null) {
	showScreen("game")

	practiceTestMode = week === null;
	if (practiceTestMode) {
		sessionWords = [...wordsData];
	} else {
		sessionWords = wordsData.filter(
			(w) =>
			asNumber(w.level) === asNumber(level) &&
			asNumber(w.week) === asNumber(week)
		);
	}

	currentWordIndex = 0;
	if (sessionWords.length === 0) {
		endSession();
	} else {
		showWord();
	}
}

// === SHOW WORD ===
function showWord() {
	if (!Array.isArray(sessionWords)) sessionWords = [];
	if (currentWordIndex >= sessionWords.length) {
		endSession();
		return;
	}

	currentWord = sessionWords[currentWordIndex];
	if (!currentWord || !currentWord.word) {
		endSession();
		return;
	}

	wordDisplay.textContent = currentWord.word;
	alienIconDiv.innerHTML = !practiceTestMode && currentWord.type === "alien" ?
		generateAlienSVG(currentWord.word) :
		"";

	enableAnswerButtons(true);
}

// === ENABLE BUTTONS ===
function enableAnswerButtons(enable) {
	correctBtn.disabled = !enable;
	wrongBtn.disabled = !enable;
}

// === RECORD ANSWER ===
function recordAnswer(correct) {
	if (!currentWord) return;
	enableAnswerButtons(false);

	const key = `${currentWord.word}-${currentWord.level}-${currentWord.week}`;
	if (!attempts[key]) attempts[key] = 0;
	attempts[key] = correct ?
		Math.min(3, attempts[key] + 1) :
		Math.max(0, attempts[key] - 1);

	saveProgress();

	currentWordIndex++;
	if (currentWordIndex >= sessionWords.length) {
		endSession();
		return;
	}

	showWord();
}

correctBtn.addEventListener("click", () => recordAnswer(true));
wrongBtn.addEventListener("click", () => recordAnswer(false));

// === END SESSION ===
function endSession() {
	gameScreen.classList.remove("active");
	finishScreen.classList.add("active");

	wordDisplay.innerHTML = "";
	alienIconDiv.innerHTML = "";

	renderResults();
	enableAnswerButtons(false);
}

// === RENDER RESULTS ===
function renderResults() {
    wordResultsDiv.innerHTML = "";

    if (!Array.isArray(sessionWords) || sessionWords.length === 0) {
        wordResultsDiv.textContent = "No words in this session.";
        return;
    }

    sessionWords.forEach((w) => {
        if (!w || !w.word) return;

        const key = `${w.word}-${w.level}-${w.week}`;
        const count = attempts[key] || 0;

        // Create word-line container
        const div = document.createElement("div");
        div.className = "word-line";

        // Word
        const wordSpan = document.createElement("span");
        wordSpan.className = "word-text";
        wordSpan.textContent = w.word;
        div.appendChild(wordSpan);

        // Stars (before alien)
        const starsSpan = document.createElement("div");
        starsSpan.className = "stars";
        for (let i = 0; i < 3; i++) {
            const star = document.createElement("span");
            star.textContent = i < count ? "★" : "☆";
            star.style.color = i < count ? "#FFD700" : "#999";
            starsSpan.appendChild(star);
        }
        div.appendChild(starsSpan);

        // Alien (if applicable)
        if (w.type === "alien" && !practiceTestMode) {
            const alienDiv = document.createElement("div");
            alienDiv.className = "alien-wrapper";
            alienDiv.innerHTML = generateAlienSVG(w.word, true);
            div.appendChild(alienDiv);
        }

        // Append to results container
        wordResultsDiv.appendChild(div);
    });

    // Summary
    const correctCount = sessionWords.reduce((acc, w) => {
        const key = `${w.word}-${w.level}-${w.week}`;
        return acc + ((attempts[key] || 0) > 0 ? 1 : 0);
    }, 0);

    summaryDiv.textContent = `You got ${correctCount} out of ${sessionWords.length} correct!`;
}

// === ALIEN GENERATOR ===
function generateAlienSVG(word, small = false) {
	function seededRandom(seed, range) {
		let hash = 0;
		for (let i = 0; i < seed.length; i++) {
			hash = seed.charCodeAt(i) + ((hash << 5) - hash);
			hash |= 0;
		}
		const result = Math.abs(Math.sin(hash)) * 10000;
		return Math.floor(result % range);
	}

	const colors = ["#7FFFD4", "#FF69B4", "#8A2BE2", "#00CED1", "#ADFF2F", "#FFA07A", "#90EE90"];
	const eyes = [
		`<circle class="eye" cx="22" cy="28" r="4" fill="#000"/> <circle class="eye" cx="42" cy="28" r="4" fill="#000"/>`,
		`<circle class="eye" cx="32" cy="28" r="6" fill="#000"/>`,
		`<circle class="eye" cx="18" cy="28" r="4" fill="#000"/> <circle class="eye" cx="32" cy="22" r="4" fill="#000"/> <circle class="eye" cx="46" cy="28" r="4" fill="#000"/>`
	];
	const mouths = [
		`<path d="M20 44 Q32 50 44 44" stroke="#000" stroke-width="2" fill="transparent"/>`,
		`<rect x="24" y="42" width="16" height="4" rx="2" fill="#000"/>`,
		`<path d="M22 42 Q32 52 42 42" stroke="#000" stroke-width="3" fill="none" stroke-linecap="round"/>`
	];
	const orbColors = ["#FFD700", "#FF69B4", "#00FF7F", "#00FFFF", "#FF4500"];

	const seed = word.toLowerCase();
	const bodyColor = colors[seededRandom(seed, colors.length)];
	const eyePattern = eyes[seededRandom(seed + "e", eyes.length)];
	const mouthPattern = mouths[seededRandom(seed + "m", mouths.length)];
	const orbColorLeft = orbColors[seededRandom(seed + "l", orbColors.length)];
	const orbColorRight = orbColors[seededRandom(seed + "r", orbColors.length)];
	const antennaOffset = seededRandom(seed + "a", 6) - 3;

	const size = small ? 40 : 70;
	const scale = small ? 0.7 : 1;

	return `
    <svg width="${size}" height="${size}" viewBox="0 0 64 64" style="transform: scale(${scale});">
      <!-- Antennas -->
      <line x1="${24 + antennaOffset}" y1="10" x2="${26 + antennaOffset}" y2="20" stroke="#000" stroke-width="2"/>
      <circle cx="${24 + antennaOffset}" cy="10" r="3" fill="${orbColorLeft}" stroke="#000" stroke-width="1"/>
      <line x1="${40 - antennaOffset}" y1="10" x2="${38 - antennaOffset}" y2="20" stroke="#000" stroke-width="2"/>
      <circle cx="${40 - antennaOffset}" cy="10" r="3" fill="${orbColorRight}" stroke="#000" stroke-width="1"/>

      <!-- Head/body -->
      <ellipse cx="32" cy="36" rx="26" ry="24" fill="${bodyColor}" stroke="#000" stroke-width="2"/>
      ${eyePattern}
      ${mouthPattern}

      <!-- Feet -->
      <circle cx="24" cy="60" r="3" fill="${bodyColor}" stroke="#000" stroke-width="1"/>
      <circle cx="40" cy="60" r="3" fill="${bodyColor}" stroke="#000" stroke-width="1"/>
    </svg>
  `;
}

// === BACK TO MENU ===
startBtn.addEventListener("click", () => {
	finishScreen.classList.remove("active");
	menuScreen.classList.add("active");
});

// === PRACTICE TEST BUTTON ===
practiceTestBtn.addEventListener("click", () => startWeek(null, null));


// === RESET PROGRESS BUTTON ===
const resetWeekBtn = document.getElementById("reset-week-btn");

resetWeekBtn.addEventListener("click", () => {
	if (!confirm("Are you sure you want to reset progress for this week?")) return;

	if (!Array.isArray(sessionWords) || sessionWords.length === 0) {
		alert("No session data available to reset.");
		return;
	}

	// Determine current level/week from the first word in the session
	const { level, week } = sessionWords[0];

	// Remove only attempts matching this level and week
	Object.keys(attempts).forEach((key) => {
		const parts = key.split("-");
		const wLevel = Number(parts[parts.length - 2]);
		const wWeek = Number(parts[parts.length - 1]);
		if (wLevel === Number(level) && wWeek === Number(week)) {
			delete attempts[key];
		}
	});

	saveProgress();
	renderResults();
	alert(`Progress for Level ${level}, Week ${week} has been reset.`);
});

// === PLAY AGAIN BUTTON ===
const playAgainBtn = document.getElementById("play-again-btn");

playAgainBtn.addEventListener("click", () => {
	if (!Array.isArray(sessionWords) || sessionWords.length === 0) {
		alert("No session available to replay.");
		return;
	}

	const { level, week } = sessionWords[0];
	if (level == null || week == null) {
		alert("Cannot restart this session.");
		return;
	}

	// Restart the same level/week
	finishScreen.classList.remove("active");
	startWeek(level, week);
});

const resetAllBtn = document.getElementById("resetAllBtn");

resetAllBtn.addEventListener("click", () => {
	const confirmReset = confirm("Are you sure you want to remove ALL progress? This cannot be undone.");
	if (!confirmReset) return;

	attempts = {}; // Clear all progress
	localStorage.removeItem("phonicsAttempts"); // Clear storage
	console.log("⚠️ All progress has been reset.");

	// Optional: update weeks display to reflect cleared progress
	renderWeeks();
});

// === SCREEN MANAGEMENT HELPER ===
function showScreen(screenId) {
	const screens = [menuScreen, gameScreen, finishScreen];
	screens.forEach(s => s.classList.remove("active"));
	const screen = document.getElementById(screenId);
	if (screen) screen.classList.add("active");
}

// === INIT ===
loadProgress();
loadWords();