import { FS } from "../os/fs.js";

export const rm = {
  name: "rm",
  help: "rm [file]  - remove file",
  run: ({ args, term }) => {
    const path = args[0] ? FS.resolvePath(args[0], term.cwd, term.user) : null;
    if (!path) { term.printLine("rm: missing file"); return; }
    try { FS.rm(path); term.printLine(`removed ${path}`); } catch (e) { term.printLine(`rm: ${e.message}`); }
  }
};
