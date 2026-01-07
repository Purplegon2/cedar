import { buildRegistry } from "../commands/index.js";

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

export class Terminal {
  constructor(screen, kbdInput) {
    this.screen = screen;
    this.kbd = kbdInput;

    this.registry = buildRegistry();
    this.running = false;
    this.bootMode = false;

    // Terminal state
    this.user = "guest";
    this.host = "cedar";
    this.cwd = "/";
    this.promptTail = "$ ";

    this.history = [];
    this.historyIndex = -1;

    this.input = "";
    this.cursor = 0;

    this.outRow = 0;
    this.blinkOn = true;

    this.execDelay = 25;          // base delay before running a command
    this.execDelayJitter = 25;    // random extra delay
    this.printDelay = 0;         // delay per printed wrapped line (output pacing)


    this._tickHandle = null;
    this._bindEvents();
  }
  

  _bindEvents() {
    window.addEventListener("keydown", (e) => {
      if (!this.running || this.bootMode) return;

      // Clear screen (Ctrl+L)
      if (e.ctrlKey && !e.altKey && !e.metaKey && (e.key === "l" || e.key === "L")) {
        e.preventDefault();
        this.clearScreen();
        this._drawPrompt();
        return;
      }

      // Navigation
      if (e.key === "ArrowUp") { e.preventDefault(); this._historyUp(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); this._historyDown(); return; }
      if (e.key === "ArrowLeft") { e.preventDefault(); this._moveCursor(-1); return; }
      if (e.key === "ArrowRight") { e.preventDefault(); this._moveCursor(1); return; }
      if (e.key === "Home") { e.preventDefault(); this.cursor = 0; this._renderInputLine(); return; }
      if (e.key === "End") { e.preventDefault(); this.cursor = this.input.length; this._renderInputLine(); return; }

      if (e.key === "Backspace") { e.preventDefault(); this._backspace(); return; }
      if (e.key === "Delete") { e.preventDefault(); this._del(); return; }

      if (e.key === "Enter") { e.preventDefault(); this._submit(); return; }

      // Printable characters
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        this._insert(e.key);
        return;
      }
    });

    // iPadOS: keep hidden input in sync (helps on-screen keyboard).
    this.kbd.addEventListener("input", () => {
      if (!this.running || this.bootMode) { this.kbd.value = ""; return; }
      const v = this.kbd.value;
      if (v) {
        // Insert whatever was typed, then clear hidden input.
        for (const ch of v) this._insert(ch);
        this.kbd.value = "";
      }
    });
  }

  setBootMode(v) { this.bootMode = !!v; }

  resetHard() {
    this.running = false;
    this.input = "";
    this.cursor = 0;
    this.historyIndex = -1;
    this.outRow = 0;
    this.screen.clear();
    this.screen.render();
  }

  start() {
    this.running = true;
    this._drawPrompt();
    this._startBlink();
  }

  stop() {
    this.running = false;
    if (this._tickHandle) clearInterval(this._tickHandle);
    this._tickHandle = null;
  }

  _startBlink() {
    if (this._tickHandle) clearInterval(this._tickHandle);
    this._tickHandle = setInterval(() => {
      if (!this.running || this.bootMode) return;
      this.blinkOn = !this.blinkOn;
      this._renderInputLine();
    }, 520);
  }

  clearScreen() {
    this.screen.clear();
    this.outRow = 0;
    this.screen.render();
  }

  printLine(text = "") {
    const t = (text ?? "").toString();

    // Wrap long lines to terminal width.
    const width = this.screen.cols;
    const chunks = [];
    for (let i = 0; i < t.length; i += width) chunks.push(t.slice(i, i + width));
    if (chunks.length === 0) chunks.push("");

    for (const line of chunks) {
      if (this.outRow >= this.screen.rows) {
        this.screen.scrollUp(1);
        this.outRow = this.screen.rows - 1;
      }
      this.screen.setLine(this.outRow, line);
      this.outRow += 1;
    }
    this.screen.render();
  }

  _promptString() {
    const home = "/home/" + this.user;
    const displayCwd = (this.cwd === home) ? "~" : this.cwd;
    return `${this.user}@${this.host}:${displayCwd}${this.promptTail}`;
  }

  _drawPrompt() {
    const p = this._promptString();
    this.input = "";
    this.cursor = 0;

    // Ensure there's space for prompt.
    if (this.outRow >= this.screen.rows) {
      this.screen.scrollUp(1);
      this.outRow = this.screen.rows - 1;
    }

    this.screen.setLine(this.outRow, p);
    this.screen.render();
    this._renderInputLine();
  }

  _renderInputLine() {
    const row = clamp(this.outRow, 0, this.screen.rows - 1);
    const prompt = this._promptString();

    const maxInputLen = Math.max(0, this.screen.cols - prompt.length);
    const shownInput = this.input.slice(0, maxInputLen);

    // Cursor position relative to shownInput (clamp if input longer than fits)
    const cur = clamp(this.cursor, 0, shownInput.length);
    const caret = this.blinkOn ? "|" : " ";

    const line = prompt + shownInput;
    let padded = (line + " ".repeat(this.screen.cols)).slice(0, this.screen.cols);

    // Replace the character under cursor with caret (if it fits).
    const caretPos = clamp(prompt.length + cur, 0, this.screen.cols - 1);
    padded = padded.slice(0, caretPos) + caret + padded.slice(caretPos + 1);

    this.screen.setLine(row, padded);
    this.screen.render();
  }

  _insert(ch) {
    if (ch === "\r" || ch === "\n") return;
    this.input = this.input.slice(0, this.cursor) + ch + this.input.slice(this.cursor);
    this.cursor += 1;
    this._renderInputLine();
  }

  _backspace() {
    if (this.cursor <= 0) return;
    this.input = this.input.slice(0, this.cursor - 1) + this.input.slice(this.cursor);
    this.cursor -= 1;
    this._renderInputLine();
  }

  _del() {
    if (this.cursor >= this.input.length) return;
    this.input = this.input.slice(0, this.cursor) + this.input.slice(this.cursor + 1);
    this._renderInputLine();
  }

  _moveCursor(delta) {
    this.cursor = clamp(this.cursor + delta, 0, this.input.length);
    this._renderInputLine();
  }

  _historyUp() {
    if (this.history.length === 0) return;
    if (this.historyIndex < 0) this.historyIndex = this.history.length - 1;
    else this.historyIndex = Math.max(0, this.historyIndex - 1);
    this.input = this.history[this.historyIndex];
    this.cursor = this.input.length;
    this._renderInputLine();
  }

  _historyDown() {
    if (this.history.length === 0) return;
    if (this.historyIndex < 0) return;
    this.historyIndex = Math.min(this.history.length, this.historyIndex + 1);
    if (this.historyIndex >= this.history.length) {
      this.historyIndex = -1;
      this.input = "";
    } else {
      this.input = this.history[this.historyIndex];
    }
    this.cursor = this.input.length;
    this._renderInputLine();
  }

  _submit() {
    // Freeze caret on submit.
    this.blinkOn = true;

    const cmdline = this.input;
    // Print the final prompt line without caret.
    const row = clamp(this.outRow, 0, this.screen.rows - 1);
    const prompt = this._promptString();
    const line = (prompt + cmdline).slice(0, this.screen.cols);
    this.screen.setLine(row, (line + " ".repeat(this.screen.cols)).slice(0, this.screen.cols));
    this.screen.render();

    // Advance output row.
    this.outRow += 1;
    if (this.outRow >= this.screen.rows) {
      this.screen.scrollUp(1);
      this.outRow = this.screen.rows - 1;
    }

    // Record history
    if (cmdline.trim().length > 0) this.history.push(cmdline);
    this.historyIndex = -1;

    // Run command (supports chaining and async commands)
    Promise.resolve().then(async () => {
      // processing delay
      if (this.execDelay || this.execDelayJitter) {
        const jitter = this.execDelayJitter
          ? Math.floor(Math.random() * (this.execDelayJitter + 1))
          : 0;
        await sleep(this.execDelay + jitter);
      }

      await this._runCommand(cmdline);
    }).then(() => {
      this._drawPrompt();
    }).catch(() => {
      this._drawPrompt();
    });

  }

  _tokenize(s) {
    // Minimal tokenizer: handles quoted strings with double quotes.
    const out = [];
    let cur = "";
    let inQ = false;

    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch === '"' ) {
        inQ = !inQ;
        continue;
      }
      if (!inQ && /\s/.test(ch)) {
        if (cur.length) { out.push(cur); cur = ""; }
        continue;
      }
      cur += ch;
    }
    if (cur.length) out.push(cur);
    return out;
  }
  // Run one command segment (no ';' splitting). Returns a promise resolving
  // to { success: bool, output: string } where output is captured stdout.
  async _runSingleCommandSegment(segment, stdin = "") {
    const raw = (segment ?? "").toString().trim();
    if (!raw) return { success: true, output: "" };

    const toks = this._tokenize(raw);
    const name = toks[0];
    const args = toks.slice(1);

    const cmd = this.registry.get(name);
    if (!cmd) {
      this.printLine(`${name}: command not found`);
      return { success: false, output: "" };
    }

    // Capture output by hijacking printLine temporarily.
    const out = [];
    const origPrint = this.printLine.bind(this);
    this.printLine = (text = "") => { out.push(String(text)); origPrint(text); };

    try {
      // Pass stdin to command; await if it returns a promise.
      const res = cmd.run({ args, term: this, registry: this.registry, stdin });
      if (res && typeof res.then === "function") await res;
      // restore
      this.printLine = origPrint;
      return { success: true, output: out.join("\n") };
    } catch (err) {
      this.printLine = origPrint;
      const msg = (err && err.message) ? err.message : String(err);
      this.printLine(`${name}: error: ${msg}`);
      return { success: false, output: out.join("\n") };
    }
  }

  // Support chaining: top-level split by ';' for sequential commands, and
  // support pipelines '|' within each segment. Pipes pass the previous
  // command's captured stdout as stdin to the next command.
  async _runCommand(cmdline) {
    const raw = (cmdline ?? "").toString();
    if (!raw.trim()) return;

    // Split top-level by semicolon (not supporting quoted semicolons for now)
    const parts = raw.split(";").map(s => s.trim()).filter(Boolean);
    for (const part of parts) {
      // Handle pipeline inside part
      const pipes = part.split("|").map(s => s.trim()).filter(Boolean);
      let stdin = "";
      let ok = true;
      for (const seg of pipes) {
        const result = await this._runSingleCommandSegment(seg, stdin);
        ok = result.success;
        stdin = result.output;
        // If a command failed, stop the pipeline
        if (!ok) break;
      }
      // continue to next semicolon-separated part regardless of success
    }
  }
}
