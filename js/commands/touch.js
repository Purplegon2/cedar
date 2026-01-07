import { FS } from "../os/fs.js";

export const touch = {
  name: "touch",
  help: "touch [file]  - create if missing or update mtime",
  run: ({ args, term }) => {
    const path = args[0] ? FS.resolvePath(args[0], term.cwd, term.user) : null;
    if (!path) { term.printLine("touch: missing file"); return; }
    try { FS.touch(path); term.printLine(`touched ${path}`); } catch (e) { term.printLine(`touch: ${e.message}`); }
  }
};
