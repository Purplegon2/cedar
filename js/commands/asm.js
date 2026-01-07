import { FS } from "../os/fs.js";
import { runAsm } from "../os/asm_cpu.js";

async function decodeBase64ToUint8Array(b64) {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

// Try to run a .wasm file stored in FS as base64 (prefix 'B64:').
async function runWasmFromFS(path, src, term) {
  // src expected to be a string; if it begins with B64: decode and run
  const prefix = "B64:";
  if (!src.startsWith(prefix)) {
    term.printLine(`wasm: file ${path} is not base64-encoded (must start with 'B64:')`);
    return;
  }
  const b64 = src.slice(prefix.length);
  try {
    const bytes = await decodeBase64ToUint8Array(b64);
    const mod = await WebAssembly.instantiate(bytes, {
      env: {
        print_i32: (v) => term.printLine(String(v)),
        print_str: (ptr, len) => term.printLine(`<wasm-string at ${ptr} len ${len}>`)
      }
    });
    // Try to call exported _start or main
    const exp = mod.instance.exports;
    if (typeof exp._start === 'function') exp._start();
    else if (typeof exp.main === 'function') exp.main();
    else term.printLine(`wasm: module has no '_start' or 'main' export`);
  } catch (e) {
    term.printLine(`wasm: error instantiating ${path}: ${e && e.message ? e.message : String(e)}`);
  }
}

export const asm = {
  name: "asm",
  help: "asm [file.asm|file.wasm]  - run an .asm file (interpreted) or a .wasm (base64) binary",
  run: async ({ args, term }) => {
    const pathArg = args[0];
    if (!pathArg) { term.printLine("asm: missing file"); return; }
    const path = FS.resolvePath(pathArg, term.cwd, term.user);
    const lower = path.toLowerCase();
    const src = FS.readFile(path);
    if (src === null) { term.printLine(`asm: no such file: ${path}`); return; }
    term.printLine(`[asm] running ${path}`);
    try {
      if (lower.endsWith('.wasm')) {
        await runWasmFromFS(path, src, term);
      } else if (lower.endsWith('.asm')) {
        // If wabt is present globally, try to assemble to wasm
        if (window.wabt) {
          try {
            const lines = src.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
            // Very small assembler: map registers to locals and translate OUT/reg/imm
            // Generate WAT with simple print_i32 import and a main function.
            const regs = new Set();
            const body = [];
            for (const l of lines) {
              if (l.endsWith(':')) continue;
              const parts = l.split(/\s+/);
              const op = parts[0].toUpperCase();
              if (op === 'MOV') {
                const rest = l.slice(3).trim();
                const [dst, srcTok] = rest.split(',').map(s => s.trim());
                regs.add(dst.toUpperCase());
                if (/^R[0-9]+$/i.test(srcTok)) { regs.add(srcTok.toUpperCase()); body.push(`local.get $${srcTok.toUpperCase()}\nlocal.set $${dst.toUpperCase()}`); }
                else { body.push(`i32.const ${Number(srcTok) || 0}\nlocal.set $${dst.toUpperCase()}`); }
              } else if (op === 'ADD' || op === 'SUB') {
                const rest = l.slice(op.length).trim();
                const [dst, srcTok] = rest.split(',').map(s => s.trim());
                regs.add(dst.toUpperCase());
                if (/^R[0-9]+$/i.test(srcTok)) { regs.add(srcTok.toUpperCase()); body.push(`local.get $${dst.toUpperCase()}\nlocal.get $${srcTok.toUpperCase()}\n${op === 'ADD' ? 'i32.add' : 'i32.sub'}\nlocal.set $${dst.toUpperCase()}`); }
                else { body.push(`local.get $${dst.toUpperCase()}\ni32.const ${Number(srcTok) || 0}\n${op === 'ADD' ? 'i32.add' : 'i32.sub'}\nlocal.set $${dst.toUpperCase()}`); }
              } else if (op === 'INC' || op === 'DEC') {
                const r = parts[1].toUpperCase(); regs.add(r); body.push(`local.get $${r}\ni32.const 1\n${op === 'INC' ? 'i32.add' : 'i32.sub'}\nlocal.set $${r}`);
              } else if (op === 'OUT') {
                const arg = l.slice(3).trim();
                if (/^R[0-9]+$/i.test(arg)) { regs.add(arg.toUpperCase()); body.push(`local.get $${arg.toUpperCase()}\ncall $print_i32`); }
                else if (/^".*"$/.test(arg)) { const s = arg.slice(1, -1); body.push(`i32.const ${Number(s) || 0}\ncall $print_i32`); }
                else { body.push(`i32.const ${Number(arg) || 0}\ncall $print_i32`); }
              } else if (op === 'HALT') { body.push('(nop)'); }
              else { body.push(`;; unsupported: ${l}`); }
            }
            const locals = Array.from(regs).map(r => `(local $${r} i32)`).join(' ');
            const wat = `(module\n  (import "env" "print_i32" (func $print_i32 (param i32)))\n  (func $main ${locals}\n    ${body.join('\n    ')}\n  )\n  (export "main" (func $main))\n)`;

            // Use wabt to convert WAT -> wasm bytes
            const module = window.wabt.parseWat('module.wat', wat);
            const { buffer } = module.toBinary({});
            const wasm = await WebAssembly.instantiate(buffer, { env: { print_i32: (v) => term.printLine(String(v)) } });
            if (wasm.instance.exports.main) wasm.instance.exports.main();
          } catch (e) {
            term.printLine(`[asm] wabt/wasm error: ${e && e.message ? e.message : String(e)}`);
            term.printLine('[asm] falling back to interpreter');
            await runAsm(src, term, { maxSteps: 10000 });
          }
        } else {
          // wabt not available — use the JS interpreter
          await runAsm(src, term, { maxSteps: 10000 });
        }
      } else {
        term.printLine('asm: unsupported file type');
      }
      term.printLine(`[asm] finished ${path}`);
    } catch (e) {
      term.printLine(`[asm] error: ${e && e.message ? e.message : String(e)}`);
    }
  }
};
