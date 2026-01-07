import { Screen } from "./engine/screen.js";
import { Terminal } from "./engine/terminal.js";
import { bootSequence } from "./os/boot.js";

const screenEl = document.getElementById("screen");
const kbd = document.getElementById("kbd");
const frame = document.getElementById("frame");

const screen = new Screen(screenEl, frame);
const term = new Terminal(screen, kbd);

function focusKeyboard() {
  // iPadOS/Safari often needs a user gesture; click/tap anywhere to focus.
  kbd.focus({ preventScroll: true });
}

frame.addEventListener("pointerdown", focusKeyboard);
window.addEventListener("focus", focusKeyboard);

async function start() {
  try {
    await bootSequence(term);
    term.start();
    focusKeyboard();
  } catch (e) {
    // If boot fails, show error on screen for debugging
    const msg = e && e.message ? e.message : String(e);
    term.screen.clear();
    term.printLine("[boot error]");
    term.printLine(msg);
  }
}

start();

// Global unhandled rejection handler to surface errors to the terminal during development
window.addEventListener('unhandledrejection', (ev) => {
  try {
    const reason = ev.reason && ev.reason.message ? ev.reason.message : String(ev.reason);
    if (term && typeof term.printLine === 'function') term.printLine(`[unhandled rejection] ${reason}`);
    else console.error('[unhandled rejection]', reason);
  } catch (e) { console.error(e); }
});

window.addEventListener('error', (ev) => {
  try {
    const msg = ev && ev.message ? ev.message : String(ev);
    if (term && typeof term.printLine === 'function') term.printLine(`[error] ${msg}`);
    else console.error('[error]', msg);
  } catch (e) { console.error(e); }
});

// Reboot shortcut (not a shell command): Ctrl+Alt+R
window.addEventListener("keydown", async (e) => {
  const key = e.key?.toLowerCase();
  if (e.ctrlKey && e.altKey && key === "r") {
    e.preventDefault();
    term.stop();
    await bootSequence(term, { isReboot: true });
    term.start();
    focusKeyboard();
  }
});
