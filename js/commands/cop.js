import { FS } from "../os/fs.js";

export const cop = {
  name: "cop",
  help: "cop [src] [dst]  - copy file/dir (recursive if dir)",
  run: ({ args, term }) => {
    if (args.length < 2) { term.printLine("cop: missing args"); return; }
    const src = FS.resolvePath(args[0], term.cwd, term.user);
    const dst = FS.resolvePath(args[1], term.cwd, term.user);
    try { FS.copy(src, dst); term.printLine(`copied ${src} -> ${dst}`); } catch (e) { term.printLine(`cp: ${e.message}`); }
  }
};
