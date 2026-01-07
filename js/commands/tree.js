import { FS } from "../os/fs.js";

export const tree = {
  name: "tree",
  help: "tree [path]  - recursively print children (default: current dir)",
  run: ({ args, term }) => {
    const target = args[0] ? FS.resolvePath(args[0], term.cwd, term.user) : term.cwd;
    const list = FS.treeList(target);
    if (!list) { term.printLine(`tree: no such path: ${target}`); return; }
    for (const l of list) term.printLine(l);
  }
};
