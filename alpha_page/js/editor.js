// A tiny dependency-free code editor: a transparent <textarea> stacked over a
// syntax-highlighted <pre>, with a line-number gutter that carries error/warning
// markers. No CDN, no bundler — it just needs the CSS in styles.css. The textarea
// owns the caret/selection/editing; the <pre> mirrors its text with colour.
import { highlightAlpha } from './alpha-lang.js';

export class Editor {
  constructor(root, { onChange, onBreakpointToggle } = {}) {
    this.root = root;
    this.onChange = onChange || (() => {});
    this.onBreakpointToggle = onBreakpointToggle || (() => {});
    this.markers = new Map();      // line -> 'error' | 'warning'
    this.breakpoints = new Set();  // line numbers with breakpoints
    this.currentLine = null;       // currently executing line (while paused)

    root.classList.add('editor');
    root.innerHTML = `
      <div class="gutter" aria-hidden="true"></div>
      <div class="code-wrap">
        <pre class="highlight"><code></code></pre>
        <textarea class="code-input" spellcheck="false" autocapitalize="off"
                  autocomplete="off" autocorrect="off" wrap="off"></textarea>
      </div>`;

    this.gutter = root.querySelector('.gutter');
    this.pre = root.querySelector('.highlight');
    this.code = root.querySelector('.highlight code');
    this.textarea = root.querySelector('.code-input');

    this.textarea.addEventListener('input', () => {
      this.render();
      this.onChange();
    });
    // Tab inserts a real tab instead of moving focus.
    this.textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        this.insertAtCursor('\t');
      }
    });
    this.textarea.addEventListener('scroll', () => this.syncScroll());

    // Breakpoint toggle: click gutter line number.
    this.gutter.addEventListener('click', (e) => {
      const lineEl = e.target.closest('.gutter-line');
      if (!lineEl) return;
      const ln = parseInt(lineEl.dataset.line, 10);
      if (!ln) return;
      if (this.breakpoints.has(ln)) {
        this.breakpoints.delete(ln);
      } else {
        this.breakpoints.add(ln);
      }
      this.renderGutter();
      this.onBreakpointToggle(ln, this.breakpoints.has(ln));
    });

    this.render();
  }

  insertAtCursor(text) {
    const ta = this.textarea;
    const { selectionStart: s, selectionEnd: e, value } = ta;
    ta.value = value.slice(0, s) + text + value.slice(e);
    ta.selectionStart = ta.selectionEnd = s + text.length;
    this.render();
    this.onChange();
  }

  getValue() {
    return this.textarea.value;
  }

  setValue(text) {
    this.textarea.value = text;
    this.textarea.scrollTop = 0;
    this.textarea.scrollLeft = 0;
    this.clearMarkers();
    this.render();
  }

  render() {
    // Trailing newline needs a placeholder so the highlight layer keeps the same
    // height as the textarea (which renders an empty final line).
    const text = this.textarea.value;
    this.code.innerHTML = highlightAlpha(text) + (text.endsWith('\n') ? '\n' : '');
    this.renderGutter();
    this.syncScroll();
  }

  renderGutter() {
    const lines = this.textarea.value.split('\n').length;
    let html = '';
    for (let ln = 1; ln <= lines; ln++) {
      const mark = this.markers.get(ln);
      const isBp = this.breakpoints.has(ln);
      const isCur = ln === this.currentLine;
      let cls = '';
      if (isCur) cls += ' gutter-current';
      if (isBp)  cls += ' gutter-bp';
      if (mark)  cls += ` gutter-${mark}`;
      html += `<div class="gutter-line${cls}" data-line="${ln}">${ln}</div>`;
    }
    this.gutter.innerHTML = html;
  }

  syncScroll() {
    this.pre.scrollTop = this.textarea.scrollTop;
    this.pre.scrollLeft = this.textarea.scrollLeft;
    this.gutter.scrollTop = this.textarea.scrollTop;
  }

  setMarkers(markers) {
    this.markers = new Map();
    for (const { line, kind } of markers) {
      // error wins over warning on the same line
      if (!this.markers.has(line) || kind === 'error') this.markers.set(line, kind);
    }
    this.renderGutter();
  }

  clearMarkers() {
    this.markers = new Map();
    this.renderGutter();
  }

  // Set the currently-executing line (shown as arrow/highlight while paused).
  setCurrentLine(line) {
    this.currentLine = line;
    this.renderGutter();
    this._highlightCurrentLine(line);
  }

  clearCurrentLine() {
    this.currentLine = null;
    this.renderGutter();
    this._removeCurrentLineHighlight();
  }

  getBreakpoints() {
    return [...this.breakpoints];
  }

  clearBreakpoints() {
    this.breakpoints.clear();
    this.renderGutter();
  }

  // Scroll a line into view, select it, and flash it.
  focusLine(line) {
    const value = this.textarea.value;
    const allLines = value.split('\n');
    if (line < 1 || line > allLines.length) return;
    let start = 0;
    for (let i = 0; i < line - 1; i++) start += allLines[i].length + 1;
    const end = start + allLines[line - 1].length;

    this.textarea.focus();
    this.textarea.setSelectionRange(start, end);

    // Approximate line height from computed style to scroll the caret to center.
    const cs = getComputedStyle(this.textarea);
    const lh = parseFloat(cs.lineHeight) || 18;
    const target = (line - 1) * lh - this.textarea.clientHeight / 2 + lh;
    this.textarea.scrollTop = Math.max(0, target);
    this.syncScroll();

    const g = this.gutter.querySelector(`.gutter-line[data-line="${line}"]`);
    if (g) {
      g.classList.add('gutter-flash');
      setTimeout(() => g.classList.remove('gutter-flash'), 1200);
    }
  }

  // ---- private ----

  _highlightCurrentLine(line) {
    this._removeCurrentLineHighlight();
    const value = this.textarea.value;
    const allLines = value.split('\n');
    if (line < 1 || line > allLines.length) return;

    const cs = getComputedStyle(this.textarea);
    const lh = parseFloat(cs.lineHeight) || 18;
    const pad = parseFloat(cs.paddingTop) || 12;

    // Overlay a highlight strip on the <pre> layer.
    const strip = document.createElement('div');
    strip.className = 'current-line-highlight';
    strip.style.top  = (pad + (line - 1) * lh) + 'px';
    strip.style.height = lh + 'px';
    this.pre.appendChild(strip);

    // Scroll the line into view (gentle: only if off-screen).
    const target = (line - 1) * lh - this.textarea.clientHeight / 2 + lh;
    if (target > 0) {
      const cur = this.textarea.scrollTop;
      const bot = cur + this.textarea.clientHeight;
      const lineTop = (line - 1) * lh + pad;
      const lineBot = lineTop + lh;
      if (lineTop < cur || lineBot > bot) {
        this.textarea.scrollTop = Math.max(0, target);
        this.syncScroll();
      }
    }
  }

  _removeCurrentLineHighlight() {
    this.pre.querySelectorAll('.current-line-highlight').forEach((el) => el.remove());
  }
}
