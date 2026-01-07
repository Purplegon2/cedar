import { CEDAR_VERSION, CEDAR_BUILD, CEDAR_KERNEL } from "../os/version.js";

export const about = {
  name: "about",
  help: "about  - print version/build/kernel info and environment notes",
  run: ({ term }) => {
    term.printLine(`Cedar ${CEDAR_VERSION} (${CEDAR_BUILD})`);
    term.printLine(`kernel: ${CEDAR_KERNEL}`);
    term.printLine(`user: ${term.user}@${term.host}`);
    term.printLine(`cwd: ${term.cwd}`);
  }
};
