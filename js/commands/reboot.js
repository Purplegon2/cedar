import { bootSequence } from "../os/boot.js";

export const reboot = {
  name: "reboot",
  help: "reboot  - simulate reboot",
  run: async ({ term }) => {
    try {
      term.stop();
      await bootSequence(term, { isReboot: true });
      term.start();
    } catch (e) {
      term.printLine(`reboot: ${e.message}`);
    }
  }
};
