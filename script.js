// ====== State ======
let totalSeconds = 25 * 60;   // default 25 min
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

// ====== Utility functions ======
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function updateDisplay() {
  timerDisplay.textContent = formatTime(remainingSeconds);
}

function setRunningVisuals(active) {
  if (forestFriend) {
    forestFriend.classList.toggle("is-running", active);
  }
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
  }

  isRunning = true;
  statusText.textContent = "Focusing...";
  startBtn.disabled = true;
  pauseBtn.disabled = false;
  resetBtn.disabled = false;
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

    if (remainingSeconds <= 0) {
      clearInterval(timerInterval);
      isRunning = false;
      statusText.textContent = "Session complete! 🎉";
      startBtn.disabled = false;
      pauseBtn.disabled = true;
      // keep reset enabled so they can restart
      setRunningVisuals(false);
    }
  }, 1000);
}

function pauseTimer(message = "Paused.") {
  if (!isRunning) return;
  isRunning = false;
  clearInterval(timerInterval);
  statusText.textContent = message;
  startBtn.disabled = false;
  pauseBtn.disabled = true;
  setRunningVisuals(false);
}

function autoPause(message) {
  pauseTimer(message);
}

function resetTimer() {
  isRunning = false;
  clearInterval(timerInterval);

  const mins = parseInt(sessionLengthInput.value, 10) || 25;
  totalSeconds = mins * 60;
  remainingSeconds = totalSeconds;
  updateDisplay();

  statusText.textContent = "Ready to focus.";
  startBtn.disabled = false;
  pauseBtn.disabled = true;
  resetBtn.disabled = true;
  setRunningVisuals(false);
}

// ====== Event listeners ======

// Update timer when session length changes
sessionLengthInput.addEventListener("change", () => {
  const mins = parseInt(sessionLengthInput.value, 10) || 25;
  totalSeconds = mins * 60;
  remainingSeconds = totalSeconds;
  updateDisplay();
});

// Buttons
startBtn.addEventListener("click", () => {
  startTimer();
});

pauseBtn.addEventListener("click", () => {
  pauseTimer("Paused by you.");
});

resetBtn.addEventListener("click", () => {
  resetTimer();
});
