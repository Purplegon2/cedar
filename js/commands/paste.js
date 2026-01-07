async function readClipboard() {
  if (navigator.clipboard && navigator.clipboard.readText) return navigator.clipboard.readText();
  // Fallback: ask user to paste into a prompt
  return new Promise((resolve) => {
    const v = window.prompt("Clipboard API not available. Paste content here:");
    resolve(v ?? "");
  });
}

export const paste = {
  name: "paste",
  help: "paste  - read clipboard and insert into current input buffer",
  run: async ({ term }) => {
    try {
      const txt = await readClipboard();
      if (txt === null || txt === undefined) { term.printLine("paste: no clipboard data"); return; }
      // Insert at current cursor position
      const before = term.input.slice(0, term.cursor);
      const after = term.input.slice(term.cursor);
      term.input = before + txt + after;
      term.cursor = term.cursor + txt.length;
      if (typeof term._renderInputLine === "function") term._renderInputLine();
    } catch (e) {
      term.printLine(`paste: ${e && e.message ? e.message : String(e)}`);
    }
  }
};
