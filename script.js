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

// ====== Utility functions ======
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function updateDisplay() {
  timerDisplay.textContent = formatTime(remainingSeconds);
}

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
