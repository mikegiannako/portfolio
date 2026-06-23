// Alpha Online — front-end orchestration. Wires the editor, the compiler WASM
// host, and the VM worker into the compile / compile-&-run lifecycle, and renders
// the four result tabs.
import { Editor } from './editor.js';
import { compile } from './compiler-host.js';
import { ansiToHtml, stripAnsi, escapeHtml } from './ansi.js';

const RUN_TIMEOUT_MS = 8000; // kill a runaway VM after this long

const $ = (sel) => document.querySelector(sel);
const show = (el, on) => el && el.classList.toggle('hidden', !on);

// ---- DOM ----
const els = {
  editor: $('#editor'),
  example: $('#example-select'),
  fontSizeEl: $('#font-size-select'),
  flagsBtn: $('#flags-btn'),
  flagsPopover: $('#flags-popover'),
  flagFuncstart: $('#flag-funcstart'),
  flagReturn: $('#flag-return'),
  flagShort: $('#flag-shortcircuit'),
  modeRadios: () => [...document.querySelectorAll('input[name="mode"]')],
  stdinRow: $('#stdin-row'),
  stdinSplitter: $('#stdin-splitter'),
  stdin: $('#stdin-area'),
  runBtn: $('#run-btn'),
  cancelBtn: $('#cancel-btn'),
  continueBtn: $('#continue-btn'),
  stepBtn: $('#step-btn'),
  spinner: $('#spinner'),
  status: $('#status'),
  dlBtn: $('#dl-btn'),
  tabs: [...document.querySelectorAll('.tab')],
  panelSym: $('#panel-symtable'),
  panelQuads: $('#panel-quads'),
  panelInstr: $('#panel-instructions'),
  diagChips: $('#diag-chips'),
  secCompiler: $('#sec-compiler'),
  outCompiler: $('#out-compiler'),
  secProgram: $('#sec-program'),
  outProgram: $('#out-program'),
  secRuntime: $('#sec-runtime'),
  outRuntime: $('#out-runtime'),
  secStack: $('#sec-stack'),
  siSplitter: $('#si-splitter'),
  stackToggleBtn: $('#stack-toggle-btn'),
  panels: $('.panels'),
};

let editor;
let manifest = { groupOrder: [], examples: [] };
let lastResult = null;     // last successful compile result (for downloads)
let worker = null;
let runTimer = null;
let compilerDiags = [];
let runtimeDiag = null;
let isPaused = false;      // true while VM is suspended at a breakpoint/step
let lastStack = null;      // JSON string of last stack snapshot (for change highlighting)
let stackUserHidden = false; // true when user has manually collapsed the stack inspector

// ---------------------------------------------------------------------------
// Flags / mode
// ---------------------------------------------------------------------------
function currentFlags() {
  return [
    els.flagFuncstart.checked ? '--funcstart-jump' : '--no-funcstart-jump',
    els.flagReturn.checked ? '--return-jump' : '--no-return-jump',
    els.flagShort.checked ? '--short-circuit-backpatch' : '--no-short-circuit-backpatch',
  ];
}
function currentMode() {
  return els.modeRadios().find((r) => r.checked)?.value || 'run';
}
function setMode(mode) {
  els.modeRadios().forEach((r) => { r.checked = r.value === mode; });
  const runMode = mode === 'run';
  show(els.stdinRow, runMode);
  show(els.stdinSplitter, runMode);
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------
function switchTab(name) {
  els.tabs.forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.panel').forEach((p) => {
    p.classList.toggle('active', p.id === `panel-${name}`);
  });
  els.dlBtn.title = name === 'output' ? 'Download output.bin' : `Download ${name}.txt`;
}
els.tabs.forEach((t) => t.addEventListener('click', () => switchTab(t.dataset.tab)));

// ---------------------------------------------------------------------------
// Status / busy
// ---------------------------------------------------------------------------
function setStatus(kind, text) {
  els.status.textContent = text;
  els.status.className = `status-text status-${kind}`;
}
function setBusy(on) {
  show(els.spinner, on);
  els.runBtn.disabled = on;
}
function markStale() {
  if (!lastResult) return;
  els.panels.classList.add('stale');
  setStatus('stale', 'Results are stale — press Run.');
}

// ---------------------------------------------------------------------------
// Debugger UI helpers
// ---------------------------------------------------------------------------
function setDebuggerPaused(on) {
  isPaused = on;
  show(els.continueBtn, on);
  show(els.stepBtn, on);
  if (!on) {
    editor.clearCurrentLine();
    show(els.secStack, false);
    show(els.siSplitter, false);
    show(els.stackToggleBtn, false);
    els.secStack?.classList.remove('si-collapsed');
    lastStack = null;
    stackUserHidden = false;
  }
}

function updateStackToggle() {
  const hasData = !!lastStack;
  const sidebarOpen = hasData && !stackUserHidden;
  show(els.stackToggleBtn, hasData);
  show(els.siSplitter, sidebarOpen);
  if (els.stackToggleBtn) {
    // ◀ Stack = inspector is closed, click opens it (arrow points ← toward the panel)
    // Stack ▶ = inspector is open,  click closes it (arrow points → to dismiss)
    els.stackToggleBtn.textContent = stackUserHidden ? '◀ Stack' : 'Stack ▶';
    els.stackToggleBtn.title = stackUserHidden ? 'Show stack inspector' : 'Hide stack inspector';
  }
}

function toggleStackInspector() {
  stackUserHidden = !stackUserHidden;
  if (stackUserHidden) {
    // Collapse: let !important rule in .si-collapsed drive width to 0
    els.secStack?.classList.add('si-collapsed');
  } else {
    // Expand: restore user's last width (inline style) then remove collapsed class
    const saved = localStorage.getItem('alpha-stack-w');
    if (saved && els.secStack) els.secStack.style.width = parseFloat(saved) + 'px';
    els.secStack?.classList.remove('si-collapsed');
  }
  updateStackToggle();
}

// ---------------------------------------------------------------------------
// Diagnostics parsing (compiler stderr + VM runtime error)
// ---------------------------------------------------------------------------
function parseDiagnostics(stderr) {
  const diags = [];
  if (!stderr) return diags;
  for (const raw of stripAnsi(stderr).split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    let kind = null;
    if (/\bERROR\]/.test(line)) kind = 'error';
    else if (/\bWARNING\]/.test(line)) kind = 'warning';
    if (!kind) continue;
    let ln = null;
    let col = null;
    const userLoc = line.match(/\|\s*[^|]*?:(\d+):(\d+)\s*$/); // [.. ERROR] .. | file:line:col
    if (userLoc) { ln = +userLoc[1]; col = +userLoc[2]; }
    else {
      const vmLoc = line.match(/at line (\d+)/);              // VM: ".. at line N"
      if (vmLoc) ln = +vmLoc[1];
    }
    diags.push({ kind, message: line, line: ln, col });
  }
  return diags;
}

function renderChips() {
  const all = [...compilerDiags, ...(runtimeDiag ? [runtimeDiag] : [])];
  if (all.length === 0) { els.diagChips.innerHTML = ''; return; }
  els.diagChips.innerHTML = '';
  for (const d of all) {
    const chip = document.createElement('button');
    chip.className = `chip chip-${d.kind}`;
    const where = d.line ? `L${d.line}${d.col ? ':' + d.col : ''} · ` : '';
    chip.innerHTML = `<span class="chip-kind">${d.kind}</span> ${where}${escapeHtml(shorten(d.message))}`;
    if (d.line) {
      chip.addEventListener('click', () => editor.focusLine(d.line));
      chip.classList.add('clickable');
    }
    els.diagChips.appendChild(chip);
  }
}
function shorten(msg) {
  return msg.replace(/\s*\|.*$/, '').replace(/\s*-\s*\([^)]*\)\s*$/, '');
}

function applyMarkers() {
  const diags = [...compilerDiags, ...(runtimeDiag ? [runtimeDiag] : [])].filter((d) => d.line);
  editor.setMarkers(diags.map((d) => ({ line: d.line, kind: d.kind })));
}

// ---------------------------------------------------------------------------
// Result rendering
// ---------------------------------------------------------------------------
function clearResults() {
  els.panels.classList.remove('stale');
  els.panelSym.innerHTML = '';
  els.panelQuads.innerHTML = '';
  els.panelInstr.innerHTML = '';
  els.diagChips.innerHTML = '';
  els.outCompiler.innerHTML = '';
  els.outProgram.innerHTML = '';
  els.outRuntime.innerHTML = '';
  show(els.secCompiler, false);
  show(els.secProgram, false);
  show(els.secRuntime, false);
  runtimeDiag = null;
  compilerDiags = [];
}

function countDiags() {
  const errors = compilerDiags.filter((d) => d.kind === 'error').length + (runtimeDiag ? 1 : 0);
  const warnings = compilerDiags.filter((d) => d.kind === 'warning').length;
  return { errors, warnings };
}

// ---------------------------------------------------------------------------
// Run pipeline
// ---------------------------------------------------------------------------
async function run() {
  cleanupWorker();
  setBusy(true);
  clearResults();
  setStatus('busy', 'Compiling…');
  editor.clearCurrentLine();

  const source = editor.getValue();
  const flags = currentFlags();
  const mode = currentMode();

  let result;
  try {
    result = await compile({ source, flags });
  } catch (e) {
    setBusy(false);
    show(els.secCompiler, true);
    els.outCompiler.innerHTML = `<span class="ansi-red">${escapeHtml(String(e.message || e))}</span>`;
    switchTab('output');
    setStatus('error', 'Compiler module error.');
    return;
  }

  lastResult = result;

  // Dumps
  els.panelSym.innerHTML = ansiToHtml(result.symtable);
  els.panelQuads.innerHTML = ansiToHtml(result.quads);
  els.panelInstr.innerHTML = ansiToHtml(result.instructions);

  // Compiler diagnostics — show raw stderr only when no chips were parsed from it.
  compilerDiags = parseDiagnostics(result.stderr);
  if (result.stderr.trim() && compilerDiags.length === 0) {
    show(els.secCompiler, true);
    els.outCompiler.innerHTML = ansiToHtml(result.stderr);
  }
  renderChips();
  applyMarkers();

  const { errors, warnings } = countDiags();

  // This toolchain doesn't always exit() on a compile error (syntax errors are
  // printed but parsing continues), so treat ANY error diagnostic — or a missing
  // binary, or a wasm trap — as a failed compile and never run the VM.
  const compileFailed =
    errors > 0 || !result.binary || result.crashed;

  if (compileFailed) {
    switchTab('output');
    setBusy(false);
    const n = Math.max(errors, 1);
    setStatus('error', `Compile failed — ${n} error${n === 1 ? '' : 's'}.`);
    const first = compilerDiags.find((d) => d.line);
    if (first) editor.focusLine(first.line);
    return;
  }

  if (mode === 'compile') {
    setBusy(false);
    switchTab('symtable');
    setStatus('ok', `Compiled OK${warnings ? ` · ${warnings} warning${warnings === 1 ? '' : 's'}` : ''}.`);
    return;
  }

  // Compile & Run
  switchTab('output');
  runInWorker(result.binary, els.stdin.value, warnings);
}

function runInWorker(binary, stdin, warnings) {
  show(els.secProgram, true);
  els.outProgram.innerHTML = '';
  setStatus('busy', 'Running…');
  show(els.cancelBtn, true);

  let outRaw = '';
  let rafPending = false;
  const renderProgram = () => {
    rafPending = false;
    els.outProgram.innerHTML = ansiToHtml(outRaw);
  };

  worker = new Worker('js/vm.worker.js');
  worker.onmessage = (e) => {
    const m = e.data;
    if (m.type === 'chunk') {
      outRaw += m.text;
      if (!rafPending) { rafPending = true; requestAnimationFrame(renderProgram); }
    } else if (m.type === 'paused') {
      renderProgram();
      onVmPaused(m.line, m.snap, warnings);
    } else if (m.type === 'done') {
      setDebuggerPaused(false);
      renderProgram();
      finishRun(m, warnings);
    } else if (m.type === 'error') {
      setDebuggerPaused(false);
      show(els.secRuntime, true);
      els.outRuntime.innerHTML = `<span class="ansi-red">${escapeHtml(m.message)}</span>`;
      setStatus('error', 'VM failed to start.');
      cleanupWorker();
    }
  };
  worker.onerror = (e) => {
    setDebuggerPaused(false);
    show(els.secRuntime, true);
    els.outRuntime.innerHTML = `<span class="ansi-red">${escapeHtml(e.message || 'worker error')}</span>`;
    setStatus('error', 'VM worker error.');
    cleanupWorker();
  };

  runTimer = setTimeout(() => terminateWorker('timed out'), RUN_TIMEOUT_MS);

  const breakpoints = editor.getBreakpoints();
  worker.postMessage({ type: 'run', bin: binary, stdin, breakpoints });
}

// ---------------------------------------------------------------------------
// Stack inspector
// ---------------------------------------------------------------------------
function renderCellVal(c) {
  if (!c || c.t === 'undef') return '<span class="si-nil">undefined</span>';
  if (c.t === 'nil') return '<span class="si-nil">nil</span>';
  if (c.t === 'table') {
    const count = c.v ?? 0;
    if (c.e && c.e.length > 0) {
      const rows = c.e.map(([k, v]) =>
        `<tr><td>${renderCellVal(k)}</td><td>${renderCellVal(v)}</td></tr>`
      ).join('');
      const more = count > c.e.length ? `<tr><td colspan="2" class="si-nil">… ${count - c.e.length} more</td></tr>` : '';
      return `<details><summary class="si-nil">table [${count}]</summary><table class="si-entries"><thead><tr><th>key</th><th>value</th></tr></thead><tbody>${rows}${more}</tbody></table></details>`;
    }
    return `<span class="si-nil">table [${count}]</span>`;
  }
  return `<span class="si-val">${escapeHtml(String(c.v))}</span>`;
}

function renderStack(snapStr, prevSnapStr) {
  let snap, prev;
  try { snap = JSON.parse(snapStr); } catch { return; }
  try { prev = prevSnapStr ? JSON.parse(prevSnapStr) : null; } catch { prev = null; }

  const cellChanged = (cur, old) => old != null && JSON.stringify(cur) !== JSON.stringify(old);

  const renderSection = (cells, prevCells, label) => {
    if (!cells || cells.length === 0) return '';
    let h = `<div class="si-sec">${label}</div><table class="si-table">`;
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      const changed = cellChanged(c, prevCells ? prevCells[i] : undefined);
      const rowCls = changed ? ' class="si-changed"' : '';
      const typeStr = escapeHtml(c?.t || '?');
      h += `<tr${rowCls}><td class="si-idx">${i}</td><td class="si-type">${typeStr}</td><td>${renderCellVal(c)}</td></tr>`;
    }
    return h + '</table>';
  };

  let html = '<div class="si-title">Stack Inspector</div>';
  html += `<div class="si-fn">${snap.fn ? escapeHtml(snap.fn) + '()' : '<em style="color:var(--muted)">global</em>'}</div>`;
  html += `<div class="si-loc">pc=${snap.pc} · line=${snap.line}</div>`;
  html += renderSection(snap.formals, prev?.formals, 'Formals');
  html += renderSection(snap.locals,  prev?.locals,  'Locals');
  html += renderSection(snap.globals, prev?.globals,  'Globals');

  els.secStack.innerHTML = html;
  if (!stackUserHidden) {
    show(els.secStack, true);
    show(els.siSplitter, true);
  }
}

function onVmPaused(line, snap, warnings) {
  clearTimeout(runTimer);
  runTimer = null;
  setBusy(false);
  setDebuggerPaused(true);
  if (line) editor.setCurrentLine(line);
  setStatus('warn', `Paused at line ${line ?? '?'}${warnings ? ` · ${warnings} warning${warnings === 1 ? '' : 's'}` : ''}.`);
  if (snap) {
    renderStack(snap, lastStack);
    lastStack = snap;
    updateStackToggle();
  }
}

function vmContinue() {
  if (!worker || !isPaused) return;
  setDebuggerPaused(false);
  setBusy(true);
  setStatus('busy', 'Running…');
  runTimer = setTimeout(() => terminateWorker('timed out'), RUN_TIMEOUT_MS);
  worker.postMessage({ type: 'continue' });
}

function vmStep() {
  if (!worker || !isPaused) return;
  setDebuggerPaused(false);
  setBusy(true);
  setStatus('busy', 'Stepping…');
  // No long timeout for stepping — user is in control.
  worker.postMessage({ type: 'step' });
}

function finishRun(m, warnings) {
  clearTimeout(runTimer);
  runTimer = null;
  show(els.cancelBtn, false);
  setBusy(false);

  if (m.truncated) {
    els.outProgram.innerHTML += '\n<span class="muted">… output truncated (2 MB cap).</span>';
  }

  // Runtime error (stderr emitted right before the VM exits).
  if (m.exitCode !== 0 || (m.stderr && m.stderr.trim())) {
    const parsed = parseDiagnostics(m.stderr);
    runtimeDiag = parsed.find((d) => d.kind === 'error') || { kind: 'error', message: m.stderr.trim(), line: null };
    if (parsed.length === 0) {
      show(els.secRuntime, true);
      els.outRuntime.innerHTML = ansiToHtml(m.stderr || `VM exited with code ${m.exitCode}.`);
    }
    renderChips();
    applyMarkers();
    if (runtimeDiag.line) editor.focusLine(runtimeDiag.line);
    setStatus('error', `Runtime error · ran in ${m.ranMs} ms.`);
  } else {
    setStatus('ok', `Ran OK${warnings ? ` · ${warnings} warning${warnings === 1 ? '' : 's'}` : ''} · ${m.ranMs} ms.`);
  }
  worker = null;
}

function terminateWorker(reason) {
  if (worker) { worker.terminate(); worker = null; }
  clearTimeout(runTimer);
  runTimer = null;
  show(els.cancelBtn, false);
  setDebuggerPaused(false);
  setBusy(false);
  show(els.secRuntime, true);
  const detail = reason === 'timed out' ? ` (${RUN_TIMEOUT_MS} ms limit reached)` : '';
  els.outRuntime.innerHTML = `<span class="ansi-amber">Execution ${reason}${detail} — the VM worker was terminated.</span>`;
  setStatus('warn', `Execution ${reason}.`);
}

function cleanupWorker() {
  if (worker) { worker.terminate(); worker = null; }
  if (runTimer) { clearTimeout(runTimer); runTimer = null; }
  show(els.cancelBtn, false);
  setDebuggerPaused(false);
}

// ---------------------------------------------------------------------------
// Examples
// ---------------------------------------------------------------------------
async function loadManifest() {
  try {
    const res = await fetch('examples.json');
    manifest = await res.json();
  } catch {
    manifest = { groupOrder: [], examples: [] };
  }
  const byGroup = new Map();
  for (const ex of manifest.examples) {
    if (!byGroup.has(ex.group)) byGroup.set(ex.group, []);
    byGroup.get(ex.group).push(ex);
  }
  els.example.innerHTML = '<option value="">— Load an example —</option>';
  const order = manifest.groupOrder.length ? manifest.groupOrder : [...byGroup.keys()];
  for (const group of order) {
    const items = byGroup.get(group);
    if (!items) continue;
    const og = document.createElement('optgroup');
    og.label = group;
    for (const ex of items) {
      const opt = document.createElement('option');
      opt.value = ex.id;
      opt.textContent = ex.title;
      og.appendChild(opt);
    }
    els.example.appendChild(og);
  }
}

function loadExample(id) {
  const ex = manifest.examples.find((e) => e.id === id);
  if (!ex) return;
  editor.setValue(ex.source);
  els.stdin.value = ex.stdin || '';
  clearResults();
  lastResult = null;
  setStatus('info', ex.note ? ex.note : `Loaded "${ex.title}".`);
  saveState();
}

// ---------------------------------------------------------------------------
// Downloads / share / persistence
// ---------------------------------------------------------------------------
function download(filename, data, mime) {
  const blob = new Blob([data], { type: mime || 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function downloadCurrent() {
  if (!lastResult) { setStatus('info', 'Nothing to download yet — press Run.'); return; }
  const active = els.tabs.find((t) => t.classList.contains('active'))?.dataset.tab;
  if (active === 'output') {
    if (lastResult.binary) download('output.bin', lastResult.binary, 'application/octet-stream');
  } else {
    const map = { symtable: lastResult.symtable, quads: lastResult.quads, instructions: lastResult.instructions };
    download(`${active}.txt`, stripAnsi(map[active] || ''), 'text/plain');
  }
}

function stateSnapshot() {
  return {
    s: editor.getValue(),
    f: [els.flagFuncstart.checked, els.flagReturn.checked, els.flagShort.checked],
    m: currentMode(),
    i: els.stdin.value,
  };
}
function applyState(st) {
  if (!st) return false;
  editor.setValue(st.s ?? '');
  if (Array.isArray(st.f)) {
    els.flagFuncstart.checked = !!st.f[0];
    els.flagReturn.checked = !!st.f[1];
    els.flagShort.checked = !!st.f[2];
  }
  setMode(st.m === 'compile' ? 'compile' : 'run');
  els.stdin.value = st.i ?? '';
  return true;
}
function saveState() {
  try { localStorage.setItem('alpha-online', JSON.stringify(stateSnapshot())); } catch {}
}

// ---------------------------------------------------------------------------
// Splitter
// ---------------------------------------------------------------------------
const SPLIT_KEY = 'alpha-split';
function initSplitter() {
  const splitter = $('#splitter');
  const left     = $('#left-pane');
  const layout   = $('.layout');
  if (!splitter || !left || !layout) return;

  const saved = parseFloat(localStorage.getItem(SPLIT_KEY));
  if (saved) left.style.width = saved + '%';

  splitter.addEventListener('mousedown', (e) => {
    e.preventDefault();
    splitter.classList.add('dragging');
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    const onMove = (ev) => {
      const rect = layout.getBoundingClientRect();
      let pct = (ev.clientX - rect.left) / rect.width * 100;
      pct = Math.max(20, Math.min(80, pct));
      left.style.width = pct + '%';
    };

    const onUp = () => {
      splitter.classList.remove('dragging');
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      localStorage.setItem(SPLIT_KEY, parseFloat(left.style.width) || 50);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

// ---------------------------------------------------------------------------
// Stdin splitter
// ---------------------------------------------------------------------------
const STDIN_SPLIT_KEY = 'alpha-stdin-h';
const STDIN_DEFAULT_H = 90; // px
function initStdinSplitter() {
  const splitter = $('#stdin-splitter');
  const stdinRow = $('#stdin-row');
  const leftPane = $('#left-pane');
  if (!splitter || !stdinRow || !leftPane) return;

  const saved = parseFloat(localStorage.getItem(STDIN_SPLIT_KEY)) || STDIN_DEFAULT_H;
  stdinRow.style.height = saved + 'px';

  splitter.addEventListener('mousedown', (e) => {
    e.preventDefault();
    splitter.classList.add('dragging');
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'row-resize';

    const onMove = (ev) => {
      const rect = leftPane.getBoundingClientRect();
      const newH = rect.bottom - ev.clientY;
      const clamped = Math.max(44, Math.min(rect.height * 0.6, newH));
      stdinRow.style.height = clamped + 'px';
    };

    const onUp = () => {
      splitter.classList.remove('dragging');
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      localStorage.setItem(STDIN_SPLIT_KEY, parseFloat(stdinRow.style.height) || STDIN_DEFAULT_H);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

// ---------------------------------------------------------------------------
// Font size
// ---------------------------------------------------------------------------
const FONT_SIZE_KEY = 'alpha-font-size';
function applyFontSize(px) {
  document.documentElement.style.setProperty('--code-size', px + 'px');
}

// ---------------------------------------------------------------------------
// Stack inspector drag-resize
// ---------------------------------------------------------------------------
const STACK_W_KEY = 'alpha-stack-w';
const STACK_DEFAULT_W = 270;
function initStackSplitter() {
  const splitter = els.siSplitter;
  const inspector = els.secStack;
  const rightBody = $('.right-body');
  if (!splitter || !inspector || !rightBody) return;

  const saved = parseFloat(localStorage.getItem(STACK_W_KEY));
  if (saved >= 180) inspector.style.width = saved + 'px';

  splitter.addEventListener('mousedown', (e) => {
    if (stackUserHidden) return;
    e.preventDefault();
    splitter.classList.add('dragging');
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    const onMove = (ev) => {
      const rect = rightBody.getBoundingClientRect();
      const newW = Math.max(180, Math.min(rect.width * 0.6, rect.right - ev.clientX));
      inspector.style.width = newW + 'px';
    };

    const onUp = () => {
      splitter.classList.remove('dragging');
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      localStorage.setItem(STACK_W_KEY, parseFloat(inspector.style.width) || STACK_DEFAULT_W);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------
function wire() {
  initSplitter();
  initStdinSplitter();
  initStackSplitter();

  // Restore font size preference before editor is created.
  const savedFont = localStorage.getItem(FONT_SIZE_KEY);
  if (savedFont && els.fontSizeEl) {
    els.fontSizeEl.value = savedFont;
    applyFontSize(savedFont);
  }
  els.fontSizeEl?.addEventListener('change', () => {
    applyFontSize(els.fontSizeEl.value);
    localStorage.setItem(FONT_SIZE_KEY, els.fontSizeEl.value);
  });

  editor = new Editor(els.editor, {
    onChange: () => { markStale(); saveState(); },
    // Live breakpoint changes while paused are forwarded to the worker.
    onBreakpointToggle: (line, active) => {
      if (worker) {
        worker.postMessage({ type: active ? 'add-bp' : 'remove-bp', line });
      }
    },
  });

  els.runBtn.addEventListener('click', run);
  els.cancelBtn.addEventListener('click', () => terminateWorker('cancelled'));
  els.continueBtn.addEventListener('click', vmContinue);
  els.stepBtn.addEventListener('click', vmStep);
  els.stackToggleBtn?.addEventListener('click', toggleStackInspector);
  els.example.addEventListener('change', () => { if (els.example.value) loadExample(els.example.value); });
  els.dlBtn.addEventListener('click', downloadCurrent);

  // Flags popover
  els.flagsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    els.flagsPopover.classList.toggle('hidden');
  });
  document.addEventListener('click', (e) => {
    if (!els.flagsPopover.contains(e.target) && e.target !== els.flagsBtn) {
      els.flagsPopover.classList.add('hidden');
    }
  });
  [els.flagFuncstart, els.flagReturn, els.flagShort].forEach((cb) =>
    cb.addEventListener('change', () => { markStale(); saveState(); }));
  els.modeRadios().forEach((r) =>
    r.addEventListener('change', () => { setMode(r.value); markStale(); saveState(); }));
  els.stdin.addEventListener('input', saveState);

  // Ctrl/Cmd+Enter runs; Escape dismisses disclaimer; F10 steps; F8 continues.
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(); }
    if (e.key === 'F10' && isPaused) { e.preventDefault(); vmStep(); }
    if (e.key === 'F8'  && isPaused) { e.preventDefault(); vmContinue(); }
    if (e.key === 'Escape') dismissDisclaimer();
  });

  // Disclaimer
  const disclaimerOverlay = $('#disclaimer-overlay');
  function dismissDisclaimer() {
    if (disclaimerOverlay) disclaimerOverlay.classList.add('hidden');
  }
  $('#disclaimer-btn')?.addEventListener('click', dismissDisclaimer);
}

async function main() {
  wire();
  await loadManifest();

  let restored = false;
  try { restored = applyState(JSON.parse(localStorage.getItem('alpha-online'))); } catch { restored = false; }
  if (!restored) {
    // Default to the first runnable example (arithmetic / first Basics entry).
    const first = manifest.examples.find((e) => e.group === 'Basics') || manifest.examples[0];
    if (first) { loadExample(first.id); els.example.value = first.id; }
  }
  setMode(currentMode());
  setStatus('info', 'Ready — press Run (or Ctrl+Enter). Click gutter to set breakpoints.');
}

main();
