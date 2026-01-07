import { FS } from "../os/fs.js";

export const marks = {
  name: "marks",
  help: "marks  - list directory bookmarks",
  run: ({ term }) => {
    const b = FS.listBookmarks();
    const keys = Object.keys(b).sort();
    if (keys.length === 0) { term.printLine("(no marks)"); return; }
    for (const k of keys) term.printLine(`@${k} -> ${b[k]}`);
  }
};
