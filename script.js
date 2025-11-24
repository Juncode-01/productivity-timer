// ====== State ======
const DEFAULT_FOCUS_MINUTES = 25;
const DEFAULT_BREAK_MINUTES = 5;
const DEFAULT_CYCLES = 4;

let focusSecondsTotal = DEFAULT_FOCUS_MINUTES * 60;
let breakSecondsTotal = DEFAULT_BREAK_MINUTES * 60;
let totalCycles = DEFAULT_CYCLES;
let currentCycle = 1;
let isBreak = false;
let remainingSeconds = focusSecondsTotal;
let timerInterval = null;
let isRunning = false;

// rewards
let totalXp = 0;
let totalCoins = 0;

// idle detection
let lastActivityTime = Date.now();
const IDLE_LIMIT_MS = 60 * 1000; // 60 seconds of no input = idle

const timerDisplay = document.getElementById("timerDisplay");
const sessionLengthInput = document.getElementById("sessionLength");
const breakLengthInput = document.getElementById("breakLength");
const cycleCountInput = document.getElementById("cycleCount");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");
const statusText = document.getElementById("statusText");
const cycleStatus = document.getElementById("cycleStatus");
const forestFriend = document.getElementById("forestFriend");
const themeToggle = document.getElementById("themeToggle");
const xpDisplay = document.getElementById("xpDisplay");
const coinDisplay = document.getElementById("coinDisplay");

const MIN_GROWTH = 0.7;
const MAX_GROWTH = 1.3;

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

function setCycleStatus(phaseLabel) {
  if (cycleStatus) {
    const label = phaseLabel || (isBreak ? "Break" : "Focus");
    cycleStatus.textContent = `${label} • Cycle ${currentCycle} of ${totalCycles}`;
  }
}

function setDisabled(target, value) {
  if (target) {
    target.disabled = value;
  }
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smoothStep(value, start, end) {
  if (value <= start) return 0;
  if (value >= end) return 1;
  const t = (value - start) / (end - start);
  return clamp(t, 0, 1);
}

function updateGrowth(progressOverride) {
  if (!forestFriend) return;

  const phaseTotal = isBreak ? breakSecondsTotal : focusSecondsTotal;
  let progress = progressOverride;

  if (progress === undefined) {
    if (isBreak) {
      progress = 1; // stay lush during breaks
    } else if (!phaseTotal || phaseTotal <= 0) {
      progress = 0;
    } else {
      progress = 1 - remainingSeconds / phaseTotal;
    }
  }

  progress = clamp(progress, 0, 1);

  const growthScale = MIN_GROWTH + (MAX_GROWTH - MIN_GROWTH) * progress;
  forestFriend.style.setProperty("--growth-scale", growthScale.toFixed(3));

  const leaf2 = smoothStep(progress, 0.25, 0.7);
  const leaf3 = smoothStep(progress, 0.55, 1);
  const leaf1 = lerp(0.7, 1, progress);

  forestFriend.style.setProperty("--leaf1-opacity", leaf1.toFixed(3));
  forestFriend.style.setProperty("--leaf2-opacity", lerp(0.15, 1, leaf2).toFixed(3));
  forestFriend.style.setProperty("--leaf3-opacity", lerp(0.05, 1, leaf3).toFixed(3));
}

function readSessionMinutes(input, fallback, min, max) {
  if (!input) return fallback;

  const parsed = parseInt(input.value, 10);
  if (Number.isFinite(parsed)) {
    const clamped = clamp(parsed, min, max);
    if (clamped !== parsed) {
      input.value = clamped;
    }
    return clamped;
  }

  input.value = fallback;
  return fallback;
}

function syncConfiguration() {
  const focusMins = readSessionMinutes(sessionLengthInput, DEFAULT_FOCUS_MINUTES, 1, 180);
  const breakMins = readSessionMinutes(breakLengthInput, DEFAULT_BREAK_MINUTES, 0, 60);
  const cycles = readSessionMinutes(cycleCountInput, DEFAULT_CYCLES, 1, 20);

  focusSecondsTotal = focusMins * 60;
  breakSecondsTotal = breakMins * 60;
  totalCycles = cycles;
}

// ====== Rewards ======
const STORAGE_KEYS = {
  xp: "forest-timer-xp",
  coins: "forest-timer-coins",
};

function updateRewardsDisplay() {
  if (xpDisplay) {
    xpDisplay.textContent = `XP: ${totalXp}`;
  }
  if (coinDisplay) {
    coinDisplay.textContent = `Coins: ${totalCoins}`;
  }
}

function loadRewards() {
  try {
    const storedXp = parseInt(localStorage.getItem(STORAGE_KEYS.xp), 10);
    const storedCoins = parseInt(localStorage.getItem(STORAGE_KEYS.coins), 10);
    totalXp = Number.isFinite(storedXp) ? storedXp : 0;
    totalCoins = Number.isFinite(storedCoins) ? storedCoins : 0;
  } catch (err) {
    totalXp = 0;
    totalCoins = 0;
  }
  updateRewardsDisplay();
}

function saveRewards() {
  try {
    localStorage.setItem(STORAGE_KEYS.xp, String(totalXp));
    localStorage.setItem(STORAGE_KEYS.coins, String(totalCoins));
  } catch (err) {
    // ignore storage issues
  }
}

function awardFocusRewards() {
  const focusMinutes = focusSecondsTotal / 60;
  const xpGain = Math.round(focusMinutes * 10);
  const coinGain = Math.max(1, Math.round(focusMinutes / 5));
  totalXp += xpGain;
  totalCoins += coinGain;
  saveRewards();
  updateRewardsDisplay();
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
loadRewards();

// ====== Timer control ======
function handlePhaseComplete() {
  if (isBreak) {
    if (currentCycle < totalCycles) {
      currentCycle += 1;
      isBreak = false;
      remainingSeconds = focusSecondsTotal;
      setStatus(`Focus cycle ${currentCycle} of ${totalCycles}.`);
      setCycleStatus();
      updateDisplay();
      updateGrowth(0);
    } else {
      isRunning = false;
      clearInterval(timerInterval);
      timerInterval = null;
      setStatus("All cycles complete 🎉");
      setCycleStatus("Done");
      setDisabled(startBtn, false);
      setDisabled(pauseBtn, true);
      setRunningVisuals(false);
    }
  } else {
    // focus completed
    awardFocusRewards();

    if (breakSecondsTotal > 0) {
      isBreak = true;
      remainingSeconds = breakSecondsTotal;
      setStatus("Break time 🌿");
      setCycleStatus();
      updateDisplay();
      updateGrowth(1);
    } else if (currentCycle < totalCycles) {
      currentCycle += 1;
      isBreak = false;
      remainingSeconds = focusSecondsTotal;
      setStatus(`Focus cycle ${currentCycle} of ${totalCycles}.`);
      setCycleStatus();
      updateDisplay();
      updateGrowth(0);
    } else {
      isRunning = false;
      clearInterval(timerInterval);
      timerInterval = null;
      setStatus("Session complete! 🎉");
      setCycleStatus("Done");
      setDisabled(startBtn, false);
      setDisabled(pauseBtn, true);
      setRunningVisuals(false);
    }
  }
}

function startTimer() {
  if (isRunning) return;
  if (remainingSeconds <= 0) {
    remainingSeconds = isBreak ? breakSecondsTotal : focusSecondsTotal;
    updateGrowth(isBreak ? 1 : 0);
    updateDisplay();
  }

  isRunning = true;
  lastActivityTime = Date.now();
  setStatus(isBreak ? "Break time 🌿" : `Focus cycle ${currentCycle} of ${totalCycles}.`);
  setCycleStatus();
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
      handlePhaseComplete();
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

  syncConfiguration();
  currentCycle = 1;
  isBreak = false;
  remainingSeconds = focusSecondsTotal;
  updateDisplay();
  updateGrowth(0);

  setStatus("Ready to focus.");
  setCycleStatus();
  setDisabled(startBtn, false);
  setDisabled(pauseBtn, true);
  setDisabled(resetBtn, true);
  setRunningVisuals(false);
}

// ====== Event listeners ======

// Update timer when session lengths or cycles change
function handleConfigChange() {
  const wasRunning = isRunning;
  pauseTimer("Adjusted settings.");
  syncConfiguration();
  currentCycle = 1;
  isBreak = false;
  remainingSeconds = focusSecondsTotal;
  updateDisplay();
  updateGrowth(0);
  setCycleStatus();
  if (wasRunning) {
    startTimer();
  }
}

if (sessionLengthInput) {
  sessionLengthInput.addEventListener("change", handleConfigChange);
}

if (breakLengthInput) {
  breakLengthInput.addEventListener("change", handleConfigChange);
}

if (cycleCountInput) {
  cycleCountInput.addEventListener("change", handleConfigChange);
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
