async function writeClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand("copy"); } finally { document.body.removeChild(ta); }
}

export const clip = {
  name: "clip",
  help: "clip [text...]  - copy text to clipboard (or use stdin)",
  run: async ({ args, term, stdin }) => {
    const text = (args && args.length) ? args.join(" ") : (stdin || "");
    if (!text) { term.printLine("clip: missing text"); return; }
    try {
      await writeClipboard(text);
      term.printLine("copied to clipboard");
    } catch (e) { term.printLine(`clip: ${e && e.message ? e.message : String(e)}`); }
  }
};
