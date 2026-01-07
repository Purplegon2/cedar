import { FS } from "../os/fs.js";

export const unmark = {
  name: "unmark",
  help: "unmark [name]  - remove bookmark",
  run: ({ args, term }) => {
    const name = args[0];
    if (!name) { term.printLine("unmark: missing name"); return; }
    FS.removeBookmark(name);
    term.printLine(`removed @${name}`);
  }
};
