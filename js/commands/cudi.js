import { FS } from "../os/fs.js";

export const cudi = {
  name: "cudi",
  help: "cudi [path]  - list children of a path (default: current dir)",
  run: ({ args, term }) => {
    const target = args[0] ? FS.resolvePath(args[0], term.cwd, term.user) : term.cwd;
    const list = FS.readdir(target);
    if (!list) { term.printLine(`cudi: not a directory: ${target}`); return; }
    for (const e of list) {
      const mark = e.type === "dir" ? "/" : "";
      term.printLine(`${e.name}${mark}`);
    }
  }
};
