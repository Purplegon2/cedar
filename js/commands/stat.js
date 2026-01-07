import { FS } from "../os/fs.js";

export const stat = {
  name: "stat",
  help: "stat [path]  - show type, size, timestamps",
  run: ({ args, term }) => {
    const path = args[0] ? FS.resolvePath(args[0], term.cwd, term.user) : term.cwd;
    const s = FS.stat(path);
    if (!s) { term.printLine(`stat: no such path: ${path}`); return; }
    term.printLine(`type: ${s.type}`);
    term.printLine(`size: ${s.size}`);
    term.printLine(`ctime: ${new Date(s.ctime).toLocaleString()}`);
    term.printLine(`mtime: ${new Date(s.mtime).toLocaleString()}`);
  }
};
