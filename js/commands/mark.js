import { FS } from "../os/fs.js";

export const mark = {
  name: "mark",
  help: "mark [name] [path]  - create bookmark",
  run: ({ args, term }) => {
    const name = args[0];
    const path = args[1] ? FS.resolvePath(args[1], term.cwd, term.user) : term.cwd;
    if (!name) { term.printLine("mark: missing name"); return; }
    FS.addBookmark(name, path);
    term.printLine(`marked @${name} -> ${path}`);
  }
};
