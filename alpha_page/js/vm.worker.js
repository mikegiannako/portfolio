// VM runner, in a Web Worker so a runaway program (infinite loop) can be killed
// with worker.terminate() without freezing the page. Classic worker so we can
// importScripts the MODULARIZE'd vm.js (factory: createVM).
//
// Protocol:
//   main → worker : { type:'run',      bin, stdin, breakpoints:[line,...] }
//                   { type:'continue' }          (resume from breakpoint)
//                   { type:'step'     }          (resume one source line)
//                   { type:'add-bp',  line }     (set breakpoint mid-run)
//                   { type:'remove-bp', line }   (clear breakpoint mid-run)
//   worker → main : { type:'chunk',   text }                    (stdout, streamed)
//                   { type:'paused',  line, pc }                (hit breakpoint/step)
//                   { type:'done',    exitCode, stderr, truncated, ranMs }
//                   { type:'error',   message }

importScripts('../wasm/vm.js');

const OUTPUT_CAP  = 2 * 1024 * 1024; // 2 MB cap
const CHUNK_FLUSH = 8 * 1024;

let Module = null; // set once the VM is initialised, cleared on done/error

self.addEventListener('message', async (e) => {
  const m = e.data;

  // ── Debugger controls (valid while WASM is suspended at a hook) ───────────
  if (m.type === 'continue' || m.type === 'step') {
    if (self._onDebugResume) self._onDebugResume();   // restart execution timer
    if (self._debugResolve) {
      const resolve = self._debugResolve;
      self._debugResolve = null;
      resolve(m.type); // 'continue' | 'step'  — read inside EM_ASYNC_JS body
    }
    return;
  }
  if (m.type === 'add-bp') {
    if (Module) Module._avm_set_breakpoint(m.line, 1);
    return;
  }
  if (m.type === 'remove-bp') {
    if (Module) Module._avm_set_breakpoint(m.line, 0);
    return;
  }
  if (m.type !== 'run') return;

  // ── Run ───────────────────────────────────────────────────────────────────
  const { bin, stdin, breakpoints = [] } = m;

  const stdinBytes = new TextEncoder().encode(stdin || '');
  let stdinPos = 0;

  let pending   = '';
  let totalOut  = 0;
  let truncated = false;
  const stderr  = [];

  const flush = () => {
    if (pending) { self.postMessage({ type: 'chunk', text: pending }); pending = ''; }
  };
  const emitOut = (s) => {
    if (truncated) return;
    if (totalOut + s.length > OUTPUT_CAP) {
      s = s.slice(0, Math.max(0, OUTPUT_CAP - totalOut));
      truncated = true;
    }
    totalOut += s.length;
    pending  += s;
    if (pending.length >= CHUNK_FLUSH) flush();
  };

  self._debugResolve = null;
  self._vmFlush = flush; // exposed so EM_ASYNC_JS can drain the output buffer before pausing

  try {
    Module = await createVM({
      noInitialRun: true,
      print:    (line) => emitOut(line + '\n'),
      printErr: (line) => stderr.push(line),
      stdin:    () => (stdinPos < stdinBytes.length ? stdinBytes[stdinPos++] : null),
      locateFile: (path) => '../wasm/' + path,
    });
  } catch (err) {
    self.postMessage({ type: 'error', message: 'Failed to start VM: ' + err });
    Module = null;
    return;
  }

  // Apply initial breakpoints before execution starts.
  for (const line of breakpoints) {
    Module._avm_set_breakpoint(line, 1);
  }

  Module.FS.writeFile('/prog.bin', bin);

  // Track only wall-clock time the VM is actually executing, not time spent
  // waiting for the user to press Continue/Step.
  let execMs = 0;
  let execStart = (self.performance || Date).now();

  // Wrap the flush hook to also pause/resume the execution timer.
  const origVmFlush = self._vmFlush;
  self._vmFlush = () => {
    execMs += (self.performance || Date).now() - execStart;
    if (origVmFlush) origVmFlush();
  };

  // Resume timer when user sends continue/step (handled in addEventListener above,
  // but we need to restart execStart after each resume).
  const origDebugResolve = (type) => {
    execStart = (self.performance || Date).now();
  };
  self._onDebugResume = origDebugResolve;

  let exitCode = 0;
  try {
    await Module.callMain(['/prog.bin']);
  } catch (ex) {
    if (ex && (ex.name === 'ExitStatus' || typeof ex.status === 'number')) {
      exitCode = ex.status ?? 1;
    } else {
      stderr.push(String(ex && ex.message ? ex.message : ex));
      exitCode = 1;
    }
  }
  execMs += (self.performance || Date).now() - execStart;
  const ranMs = Math.round(execMs);

  flush();
  self.postMessage({ type: 'done', exitCode, stderr: stderr.join('\n'), truncated, ranMs });
  Module = null;
});
