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
  await bootSequence(term);
  term.start();
  focusKeyboard();
}

start();

// Simulated reboot shortcut (not a shell command): Ctrl+Alt+R
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
