import { FS } from "../os/fs.js";

export const rmdir = {
  name: "rmdir",
  help: "rmdir [dir]  - remove empty directory",
  run: ({ args, term }) => {
    const path = args[0] ? FS.resolvePath(args[0], term.cwd, term.user) : null;
    if (!path) { term.printLine("rmdir: missing directory"); return; }
    try { FS.rmdir(path); term.printLine(`removed ${path}`); } catch (e) { term.printLine(`rmdir: ${e.message}`); }
  }
};
