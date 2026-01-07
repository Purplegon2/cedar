import { FS } from "../os/fs.js";

export const mk = {
  name: "mk",
  help: "mk [name.ext]  - create file (empty by default)",
  run: ({ args, term }) => {
    const path = args[0] ? FS.resolvePath(args[0], term.cwd, term.user) : null;
    if (!path) { term.printLine("mk: missing filename"); return; }
    try { FS.mk(path); term.printLine(`created ${path}`); } catch (e) { term.printLine(`mk: ${e.message}`); }
  }
};
