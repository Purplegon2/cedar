export class Screen {
  constructor(preEl, frameEl) {
    this.preEl = preEl;
    this.frameEl = frameEl;

    this.rows = 25;
    this.cols = 80;
    this.buffer = [];
    this._initMetrics();

    window.addEventListener("resize", () => {
      this._initMetrics();
      this.render();
    });
  }

  _measureChar() {
    // Create an offscreen span for measurement.
    const span = document.createElement("span");
    span.textContent = "M";
    span.style.visibility = "hidden";
    span.style.position = "absolute";
    span.style.fontFamily = getComputedStyle(this.preEl).fontFamily;
    span.style.fontSize = getComputedStyle(this.preEl).fontSize;
    span.style.lineHeight = getComputedStyle(this.preEl).lineHeight;
    document.body.appendChild(span);
    const rect = span.getBoundingClientRect();
    span.remove();
    return { w: rect.width || 10, h: rect.height || 19 };
  }

  _initMetrics() {
    const padX = 24; // roughly matches #screen padding
    const padY = 24;

    const { w, h } = this._measureChar();
    const width = Math.max(1, this.frameEl.clientWidth - padX);
    const height = Math.max(1, this.frameEl.clientHeight - padY);

    const cols = Math.max(40, Math.floor(width / w));
    const rows = Math.max(12, Math.floor(height / h));

    // If resizing, preserve as much content as possible.
    const old = this.buffer;
    const oldRows = this.rows;
    const oldCols = this.cols;

    this.cols = cols;
    this.rows = rows;

    const newBuf = [];
    for (let r = 0; r < rows; r++) {
      newBuf.push(" ".repeat(cols));
    }

    const copyRows = Math.min(oldRows, rows);
    for (let r = 0; r < copyRows; r++) {
      const src = old[r] || " ".repeat(oldCols);
      newBuf[r] = (src + " ".repeat(cols)).slice(0, cols);
    }

    this.buffer = newBuf;
  }

  clear() {
    this.buffer = Array.from({ length: this.rows }, () => " ".repeat(this.cols));
  }

  setLine(row, text) {
    if (row < 0 || row >= this.rows) return;
    const t = (text ?? "").toString();
    this.buffer[row] = (t + " ".repeat(this.cols)).slice(0, this.cols);
  }

  getLine(row) {
    if (row < 0 || row >= this.rows) return " ".repeat(this.cols);
    return this.buffer[row];
  }

  scrollUp(lines = 1) {
    for (let i = 0; i < lines; i++) {
      this.buffer.shift();
      this.buffer.push(" ".repeat(this.cols));
    }
  }

  render() {
    // Avoid trimming; preserve spaces for terminal look.
    this.preEl.textContent = this.buffer.join("\n");
  }
}
