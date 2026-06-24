// VM runner, in a Web Worker so a runaway program (infinite loop) can be killed
// with worker.terminate() without freezing the page. Classic worker so we can
// importScripts the MODULARIZE'd vm.js (factory: createVM).
//
// The VM is driven from JS one "slice" at a time (avm_run_slice) rather than
// suspended mid-execution. This needs NO JSPI/Asyncify, so the debugger works in
// every browser (Firefox included). Each slice runs a budget of cycles in C and
// returns FINISHED / PAUSED (breakpoint or step boundary) / YIELDED. On PAUSED we
// read the snapshot (stack is clean between slices) and wait for the user.
//
// Protocol (unchanged — app.js is agnostic to how we drive the VM):
//   main → worker : { type:'run',      bin, stdin, breakpoints:[line,...] }
//                   { type:'continue' }          (resume from breakpoint)
//                   { type:'step'     }          (resume one source line)
//                   { type:'add-bp',  line }     (set breakpoint mid-run)
//                   { type:'remove-bp', line }   (clear breakpoint mid-run)
//   worker → main : { type:'chunk',   text }                    (stdout, streamed)
//                   { type:'paused',  line, snap }              (hit breakpoint/step)
//                   { type:'done',    exitCode, stderr, truncated, ranMs }
//                   { type:'error',   message }

importScripts('../wasm/vm.js');

const OUTPUT_CAP   = 2 * 1024 * 1024; // 2 MB cap on captured stdout
const CHUNK_FLUSH  = 8 * 1024;        // flush stdout to the page every ~8 KB
const SLICE_CYCLES = 250000;          // cycles per slice between event-loop yields

// avm_run_slice() return codes — must match avm_dispatcher.c.
const AVM_YIELDED = 0;
const AVM_FINISHED = 1;
const AVM_PAUSED = 2;

let Module = null;
let resumePump = null;  // set while paused at a breakpoint; called to resume
let execMs = 0;         // wall-clock time actually executing (excludes pause waits)

// stdout buffering / streaming
let pending = '';
let totalOut = 0;
let truncated = false;
let stderr = [];

function flush() {
  if (pending) { self.postMessage({ type: 'chunk', text: pending }); pending = ''; }
}
function emitOut(s) {
  if (truncated) return;
  if (totalOut + s.length > OUTPUT_CAP) {
    s = s.slice(0, Math.max(0, OUTPUT_CAP - totalOut));
    truncated = true;
  }
  totalOut += s.length;
  pending += s;
  if (pending.length >= CHUNK_FLUSH) flush();
}

self.addEventListener('message', (e) => {
  const m = e.data;

  // Debugger controls (valid while the VM is paused between slices).
  if (m.type === 'continue') { if (Module) Module._avm_set_stepping(0); resume(); return; }
  if (m.type === 'step')     { if (Module) Module._avm_set_stepping(1); resume(); return; }
  if (m.type === 'add-bp')   { if (Module) Module._avm_set_breakpoint(m.line, 1); return; }
  if (m.type === 'remove-bp'){ if (Module) Module._avm_set_breakpoint(m.line, 0); return; }
  if (m.type !== 'run') return;

  startRun(m);
});

function resume() {
  const f = resumePump;
  resumePump = null;
  if (f) f();
}

async function startRun(m) {
  const { bin, stdin, breakpoints = [] } = m;

  const stdinBytes = new TextEncoder().encode(stdin || '');
  let stdinPos = 0;

  pending = ''; totalOut = 0; truncated = false; stderr = []; execMs = 0; resumePump = null;

  try {
    Module = await createVM({
      noInitialRun: true,
      print:    (line) => emitOut(line + '\n'),
      printErr: (line) => stderr.push(line),
      stdin:    () => (stdinPos < stdinBytes.length ? stdinBytes[stdinPos++] : null),
      locateFile: (path) => '../wasm/' + path, // vm.wasm sits next to vm.js
    });
  } catch (err) {
    self.postMessage({ type: 'error', message: 'Failed to start VM: ' + err });
    Module = null;
    return;
  }

  Module.FS.writeFile('/prog.bin', bin);

  // Load + initialise. A bad binary returns nonzero (and printed to stderr).
  let loadRc;
  try {
    loadRc = Module.ccall('avm_load', 'number', ['string'], ['/prog.bin']);
  } catch (ex) {
    finish(ex);
    return;
  }
  if (loadRc !== 0) {
    flush();
    self.postMessage({ type: 'done', exitCode: 1, stderr: stderr.join('\n'), truncated, ranMs: 0 });
    Module = null;
    return;
  }

  // Apply initial breakpoints before execution starts.
  for (const line of breakpoints) Module._avm_set_breakpoint(line, 1);

  pump();
}

function pump() {
  if (!Module) return;

  let status;
  const t0 = (self.performance || Date).now();
  try {
    status = Module._avm_run_slice(SLICE_CYCLES);
  } catch (ex) {
    execMs += (self.performance || Date).now() - t0;
    finish(ex);
    return;
  }
  execMs += (self.performance || Date).now() - t0;

  flush();

  if (status === AVM_FINISHED) { finish(null); return; }

  if (status === AVM_PAUSED) {
    const line = Module._avm_get_current_line();
    let snap = '{}';
    try { snap = Module.UTF8ToString(Module._avm_get_snapshot()); } catch { /* ignore */ }
    self.postMessage({ type: 'paused', line, snap });
    resumePump = pump; // wait for a 'continue'/'step' message
    return;
  }

  // YIELDED: let the event loop breathe (stream output, accept messages) then continue.
  setTimeout(pump, 0);
}

function finish(ex) {
  let exitCode = 0;
  if (ex) {
    if (ex && (ex.name === 'ExitStatus' || typeof ex.status === 'number')) {
      exitCode = ex.status ?? 1;
    } else {
      stderr.push(String(ex && ex.message ? ex.message : ex));
      exitCode = 1;
    }
  }
  // Only tidy up on a clean finish; after a runtime error exit() the state may be
  // inconsistent, and the instance is discarded anyway.
  if (Module && exitCode === 0) { try { Module._avm_cleanup(); } catch { /* ignore */ } }

  flush();
  self.postMessage({
    type: 'done',
    exitCode,
    stderr: stderr.join('\n'),
    truncated,
    ranMs: Math.round(execMs),
  });
  Module = null;
}
