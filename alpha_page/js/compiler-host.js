// Drives the compiler WASM module. createCompiler (a MODULARIZE factory) is
// provided by the classic <script src="wasm/compiler.js"> tag in index.html.
//
// Lifecycle: one FRESH instance per compile. Because compile errors call exit(),
// we wrap callMain in try/catch to swallow the ExitStatus, then read the dumps
// (captured C-side just before main frees its structures) and the produced
// binary. On a compile error no binary is written, so `binary` comes back null.

export async function compile({ source, flags }) {
  if (typeof window.createCompiler !== 'function') {
    throw new Error('compiler.wasm not loaded (wasm/compiler.js missing — run the build).');
  }

  const stdout = [];
  const stderr = [];

  const Module = await window.createCompiler({
    noInitialRun: true,
    print: (line) => stdout.push(line),
    printErr: (line) => stderr.push(line),
  });

  Module.FS.writeFile('/in.asc', source);

  let exitCode = 0;
  let crashed = false;
  try {
    Module.callMain(['/in.asc', '/out.bin', ...flags]);
  } catch (e) {
    if (e && (e.name === 'ExitStatus' || typeof e.status === 'number')) {
      // Clean exit() from a fatal USER_ERROR (compile error).
      exitCode = e.status ?? 1;
    } else {
      // A wasm trap ("unreachable"): this toolchain keeps parsing past a syntax
      // error and can then abort in later passes. The real [SYNTAX ERROR] line is
      // already in our captured stderr, so don't rethrow — surface it instead.
      crashed = true;
      exitCode = 1;
    }
  }

  const dump = (fn) => {
    try { return Module.ccall(fn, 'string', [], []) || ''; }
    catch { return ''; }
  };

  let binary = null;
  try { binary = Module.FS.readFile('/out.bin'); } catch { binary = null; }

  return {
    exitCode,
    crashed,
    ok: exitCode === 0 && binary !== null,
    stdout: stdout.join('\n'),
    stderr: stderr.join('\n'),
    symtable: dump('web_dump_symtable'),
    quads: dump('web_dump_quads'),
    instructions: dump('web_dump_instructions'),
    binary,
  };
}
