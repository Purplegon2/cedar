import { FS } from "../os/fs.js";
import { bootSequence } from "../os/boot.js";

export const reset = {
  name: "reset",
  help: "reset  - wipe Cedar state (filesystem, bookmarks) and reboot",
  run: async ({ term }) => {
    term.printLine("reset: wiping Cedar state...");
    FS.reset();
    try { sessionStorage.removeItem('cedar:seeded'); } catch (e) { /* ignore */ }
    try { term.stop(); await bootSequence(term, { isReboot: true }); term.start(); }
    catch (e) { term.printLine(`reset: ${e.message}`); }
  }
};
