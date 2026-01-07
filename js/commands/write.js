import { FS } from "../os/fs.js";

export const write = {
  name: "write",
  help: "write [file] [line] [text...]  - replace one line (use + to append)",
  run: ({ args, term }) => {
    if (args.length < 2) { term.printLine("write: usage: write file line text"); return; }
    const path = FS.resolvePath(args[0], term.cwd, term.user);
    const lineSpec = args[1];
    const text = args.slice(2).join(" ") || "";
    const cur = FS.readFile(path) ?? "";
    const lines = cur.split("\n");
    if (lineSpec === "+") {
      lines.push(text);
    } else {
      const n = parseInt(lineSpec, 10);
      if (isNaN(n) || n < 1) { term.printLine("write: invalid line"); return; }
      // 1-based
      lines[n-1] = text;
    }
    try { FS.writeFile(path, lines.join("\n")); term.printLine(`wrote ${path}`); } catch (e) { term.printLine(`write: ${e.message}`); }
  }
};
