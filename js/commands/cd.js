import { FS } from "../os/fs.js";

export const cd = {
  name: "cd",
  help: "cd [path] change directory (no args -> ~)",
  run: ({ args, term }) => {
    const dest = args[0] || "~";
    const p = FS.resolvePath(dest, term.cwd, term.user);
    const node = FS.getNode(p);
    if (!node || node.type !== "dir") { term.printLine(`cd: no such directory: ${dest}`); return; }
    term._lastCwd = term.cwd || "/";
    term.cwd = p;
  }
};
