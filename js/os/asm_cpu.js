// Very small 'WASM CPU' that executes a tiny assembly.
// Supported instructions:
//  LABEL:         define a label
//  MOV Rn, val/reg  - move immediate or register
//  ADD Rn, val/reg
//  SUB Rn, val/reg
//  INC Rn
//  DEC Rn
//  JMP label
//  OUT operand      - print register, immediate number, or string "..."
//  HALT
// Lines may have comments after ';' or '//'

function parseLines(src) {
  const lines = src.split(/\r?\n/).map(l => l.trim());
  const cleaned = [];
  for (let i = 0; i < lines.length; i++) {
    let l = lines[i];
    if (!l) { cleaned.push(""); continue; }
    // strip comments
    const cpos = l.indexOf(';');
    const c2 = l.indexOf('//');
    const cut = (c2 >= 0 && (c2 < cpos || cpos < 0)) ? c2 : cpos;
    if (cut >= 0) l = l.slice(0, cut).trim();
    cleaned.push(l);
  }
  return cleaned;
}

function isRegister(tok) { return /^[Rr][0-9]+$/.test(tok); }

function toNumber(tok, regs) {
  if (isRegister(tok)) return regs[tok.toUpperCase()] || 0;
  if (/^".*"$/.test(tok)) return tok.slice(1, -1);
  const n = Number(tok);
  return Number.isFinite(n) ? n : 0;
}

export async function runAsm(src, term, opts = {}) {
  const lines = parseLines(src);
  // build label map
  const labels = {};
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (!l) continue;
    if (l.endsWith(':')) {
      const name = l.slice(0, -1).trim();
      labels[name] = i;
    }
  }

  const regs = {};
  let pc = 0;
  let steps = 0;
  const maxSteps = opts.maxSteps || 10000;

  while (pc < lines.length) {
    if (++steps > maxSteps) { term.printLine('[asm] error: max steps exceeded'); return; }
    const raw = lines[pc++].trim();
    if (!raw) continue;
    if (raw.endsWith(':')) continue;

    const parts = raw.split(/\s+/);
    const op = parts[0].toUpperCase();
    try {
      if (op === 'NOP') continue;
      if (op === 'HALT') break;
      if (op === 'MOV') {
        // MOV Rn, src
        const rest = raw.slice(3).trim();
        const [dst, srcTok] = rest.split(',').map(s => s.trim());
        const val = toNumber(srcTok, regs);
        regs[dst.toUpperCase()] = val;
        continue;
      }
      if (op === 'ADD' || op === 'SUB') {
        const rest = raw.slice(op.length).trim();
        const [dst, srcTok] = rest.split(',').map(s => s.trim());
        const aval = toNumber(srcTok, regs);
        const dname = dst.toUpperCase();
        regs[dname] = (regs[dname] || 0) + (op === 'ADD' ? aval : -aval);
        continue;
      }
      if (op === 'INC' || op === 'DEC') {
        const reg = parts[1].toUpperCase();
        regs[reg] = (regs[reg] || 0) + (op === 'INC' ? 1 : -1);
        continue;
      }
      if (op === 'JMP') {
        const lbl = parts[1];
        if (labels[lbl] === undefined) { term.printLine(`[asm] error: unknown label ${lbl}`); return; }
        pc = labels[lbl] + 1; // jump to the line after label
        continue;
      }
      if (op === 'OUT') {
        const arg = raw.slice(3).trim();
        // string literal
        if (/^".*"$/.test(arg)) term.printLine(arg.slice(1, -1));
        else if (isRegister(arg)) term.printLine(String(regs[arg.toUpperCase()] || 0));
        else term.printLine(String(Number(arg) || 0));
        continue;
      }

      // unknown instruction
      term.printLine(`[asm] unknown instruction: ${op}`);
    } catch (e) {
      term.printLine(`[asm] runtime error at line ${pc}: ${e && e.message ? e.message : String(e)}`);
      return;
    }
  }

  return;
}
