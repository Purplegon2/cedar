import { FS } from "../os/fs.js";

export const find = {
  name: "find",
  help: "find [name] [path]  - search by name",
  run: ({ args, term }) => {
    const name = args[0];
    const path = args[1] ? FS.resolvePath(args[1], term.cwd, term.user) : term.cwd;
    if (!name) { term.printLine("find: missing name"); return; }
    const out = FS.find(name, path);
    for (const p of out) term.printLine(p);
  }
};
