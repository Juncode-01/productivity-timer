// ====== State ======
const DEFAULT_MINUTES = 25;   // default 25 min
let totalSeconds = DEFAULT_MINUTES * 60;
let remainingSeconds = totalSeconds;
let timerInterval = null;
let isRunning = false;

// idle detection
let lastActivityTime = Date.now();
const IDLE_LIMIT_MS = 60 * 1000; // 60 seconds of no input = idle

const timerDisplay = document.getElementById("timerDisplay");
const sessionLengthInput = document.getElementById("sessionLength");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");
const statusText = document.getElementById("statusText");
const forestFriend = document.getElementById("forestFriend");
const themeToggle = document.getElementById("themeToggle");
const GROWTH_CLASSES = ["growth-1", "growth-2", "growth-3"];

// ====== Utility functions ======
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function updateDisplay() {
  if (timerDisplay) {
    timerDisplay.textContent = formatTime(remainingSeconds);
  }
}

function setRunningVisuals(active) {
  if (forestFriend) {
    forestFriend.classList.toggle("is-running", active);
  }
}

function setStatus(message) {
  if (statusText) {
    statusText.textContent = message;
  }
}

function setDisabled(target, value) {
  if (target) {
    target.disabled = value;
  }
}

function applyGrowthStage(index = 0) {
  if (!forestFriend) return;

  GROWTH_CLASSES.forEach((cls) => forestFriend.classList.remove(cls));
  const stage = GROWTH_CLASSES[Math.min(Math.max(index, 0), GROWTH_CLASSES.length - 1)];
  if (stage) {
    forestFriend.classList.add(stage);
  }
}

function resetGrowth() {
  applyGrowthStage(0);
}

function updateGrowth() {
  if (!forestFriend) return;
  const total = totalSeconds;
  if (!total || total <= 0) {
    resetGrowth();
    return;
  }

  const progress = 1 - remainingSeconds / total;
  let stageIndex = 0;

  if (progress >= 2 / 3) {
    stageIndex = 2;
  } else if (progress >= 1 / 3) {
    stageIndex = 1;
  }

  applyGrowthStage(stageIndex);
}

function readSessionMinutes() {
  if (!sessionLengthInput) return DEFAULT_MINUTES;

  const parsed = parseInt(sessionLengthInput.value, 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    const clamped = Math.min(180, Math.max(1, parsed));
    if (clamped !== parsed) {
      sessionLengthInput.value = clamped;
    }
    return clamped;
  }
  sessionLengthInput.value = DEFAULT_MINUTES;
  return DEFAULT_MINUTES;
}

// ====== Theme handling ======
const THEME_KEY = "forest-theme";

function applyTheme(theme) {
  if (theme === "light") {
    document.body.classList.add("light-theme");
  } else {
    document.body.classList.remove("light-theme");
  }
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (err) {
    // ignore storage issues
  }
}

function initTheme() {
  let stored = null;
  try {
    stored = localStorage.getItem(THEME_KEY);
  } catch (err) {
    stored = null;
  }

  if (stored === "light" || stored === "dark") {
    applyTheme(stored);
    return stored;
  }

  const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
  const theme = prefersLight ? "light" : "dark";
  applyTheme(theme);
  return theme;
}

function toggleTheme() {
  const isLight = document.body.classList.contains("light-theme");
  applyTheme(isLight ? "dark" : "light");
}

if (themeToggle) {
  themeToggle.addEventListener("click", toggleTheme);
}

initTheme();

// ====== Timer control ======
function startTimer() {
  if (isRunning) return;
  if (remainingSeconds <= 0) {
    remainingSeconds = totalSeconds;
    resetGrowth();
    updateDisplay();
  }

  isRunning = true;
  setStatus("Focusing...");
  setDisabled(startBtn, true);
  setDisabled(pauseBtn, false);
  setDisabled(resetBtn, false);
  setRunningVisuals(true);

  timerInterval = setInterval(() => {
    const now = Date.now();
    const idleFor = now - lastActivityTime;

    // If tab hidden or user idle too long, pause automatically
    if (document.hidden || idleFor > IDLE_LIMIT_MS) {
      autoPause("Paused (tab not active or idle).");
      return;
    }

    remainingSeconds--;
    updateDisplay();
    updateGrowth();

    if (remainingSeconds <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      isRunning = false;
      setStatus("Session complete! 🎉");
      setDisabled(startBtn, false);
      setDisabled(pauseBtn, true);
      // keep reset enabled so they can restart
      setRunningVisuals(false);
    }
  }, 1000);
}

function pauseTimer(message = "Paused.") {
  if (!isRunning) return;
  isRunning = false;
  clearInterval(timerInterval);
  timerInterval = null;
  setStatus(message);
  setDisabled(startBtn, false);
  setDisabled(pauseBtn, true);
  setRunningVisuals(false);
}

function autoPause(message) {
  pauseTimer(message);
}

function resetTimer() {
  isRunning = false;
  clearInterval(timerInterval);
  timerInterval = null;

  const mins = readSessionMinutes();
  totalSeconds = mins * 60;
  remainingSeconds = totalSeconds;
  updateDisplay();
  resetGrowth();

  setStatus("Ready to focus.");
  setDisabled(startBtn, false);
  setDisabled(pauseBtn, true);
  setDisabled(resetBtn, true);
  setRunningVisuals(false);
}

// ====== Event listeners ======

// Update timer when session length changes
if (sessionLengthInput) {
  sessionLengthInput.addEventListener("change", () => {
    const mins = readSessionMinutes();
    totalSeconds = mins * 60;
    remainingSeconds = totalSeconds;
    updateDisplay();
    resetGrowth();
  });
}

// Buttons
if (startBtn) {
  startBtn.addEventListener("click", () => {
    startTimer();
  });
}

if (pauseBtn) {
  pauseBtn.addEventListener("click", () => {
    pauseTimer("Paused by you.");
  });
}

if (resetBtn) {
  resetBtn.addEventListener("click", () => {
    resetTimer();
  });
}

// Track activity for idle detection
function recordActivity() {
  lastActivityTime = Date.now();
}

window.addEventListener("mousemove", recordActivity);
window.addEventListener("keydown", recordActivity);
window.addEventListener("click", recordActivity);

// Tab visibility change
document.addEventListener("visibilitychange", () => {
  if (document.hidden && isRunning) {
    autoPause("Paused (tab not active).");
  }
});

// Initial display
resetTimer();
