import { FS } from "../os/fs.js";

export const mkdir = {
  name: "mkdir",
  help: "mkdir [dir]  - create directory",
  run: ({ args, term }) => {
    const path = args[0] ? FS.resolvePath(args[0], term.cwd, term.user) : null;
    if (!path) { term.printLine("mkdir: missing directory"); return; }
    try { FS.mkdir(path); term.printLine(`created ${path}`); } catch (e) { term.printLine(`mkdir: ${e.message}`); }
  }
};
