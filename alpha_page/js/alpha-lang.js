// Alpha syntax tokenizer, grounded in Compiler/src/lex.l. Produces a flat token
// list whose values concatenate back to the exact source (so it can drive an
// overlay highlighter). Longest tokens are matched first, block comments nest,
// and unterminated strings/comments are flagged as 'error'.
import { escapeHtml } from './ansi.js';

const KEYWORDS = new Set([
  'if', 'else', 'while', 'for', 'function', 'return', 'break', 'continue',
  'and', 'not', 'or', 'local', 'true', 'false', 'nil',
]);

const BUILTINS = new Set([
  'print', 'input', 'typeof', 'totalarguments', 'argument', 'objectmemberkeys',
  'objecttotalmembers', 'objectcopy', 'strtonum', 'sqrt', 'cos', 'sin',
]);

const OPS2 = ['::', '..', '==', '!=', '>=', '<=', '++', '--'];
const OPS1 = new Set([
  '=', '+', '-', '*', '/', '%', '>', '<',
  '{', '}', '[', ']', '(', ')', ';', ',', ':', '.',
]);

const RE_REAL = /^[0-9]*\.[0-9]+([eE][-+]?[0-9]+)?/;
const RE_INT = /^[0-9]+/;
const RE_IDENT = /^[a-zA-Z][0-9a-zA-Z_]*/;

// Returns [{ type, value }, ...]. type ∈ keyword|builtin|ident|number|string|
// escape|comment|operator|error|ws.
export function tokenizeAlpha(src) {
  const tokens = [];
  const push = (type, value) => { if (value) tokens.push({ type, value }); };
  let i = 0;
  const n = src.length;

  while (i < n) {
    const c = src[i];

    // whitespace
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
      let j = i + 1;
      while (j < n && /[ \t\r\n]/.test(src[j])) j++;
      push('ws', src.slice(i, j));
      i = j;
      continue;
    }

    // line comment
    if (c === '/' && src[i + 1] === '/') {
      let j = i + 2;
      while (j < n && src[j] !== '\n') j++;
      push('comment', src.slice(i, j));
      i = j;
      continue;
    }

    // nested block comment
    if (c === '/' && src[i + 1] === '*') {
      let j = i + 2;
      let depth = 1;
      while (j < n && depth > 0) {
        if (src[j] === '/' && src[j + 1] === '*') { depth++; j += 2; continue; }
        if (src[j] === '*' && src[j + 1] === '/') { depth--; j += 2; continue; }
        j++;
      }
      push(depth > 0 ? 'error' : 'comment', src.slice(i, j));
      i = j;
      continue;
    }

    // string with escapes
    if (c === '"') {
      let j = i + 1;
      let run = '';
      let terminated = false;
      const parts = [{ type: 'string', value: '"' }];
      while (j < n) {
        const d = src[j];
        if (d === '\\' && j + 1 < n) {
          if (run) { parts.push({ type: 'string', value: run }); run = ''; }
          parts.push({ type: 'escape', value: src.slice(j, j + 2) });
          j += 2;
          continue;
        }
        if (d === '"') {
          if (run) { parts.push({ type: 'string', value: run }); run = ''; }
          parts.push({ type: 'string', value: '"' });
          j++;
          terminated = true;
          break;
        }
        run += d;
        j++;
      }
      if (run) parts.push({ type: 'string', value: run });
      if (!terminated) for (const p of parts) p.type = 'error';
      for (const p of parts) push(p.type, p.value);
      i = j;
      continue;
    }

    // numbers: real before integer
    const rest = src.slice(i);
    let m = RE_REAL.exec(rest);
    if (m && m[0].length > 0) { push('number', m[0]); i += m[0].length; continue; }
    m = RE_INT.exec(rest);
    if (m) { push('number', m[0]); i += m[0].length; continue; }

    // identifiers / keywords / builtins
    m = RE_IDENT.exec(rest);
    if (m) {
      const word = m[0];
      const type = KEYWORDS.has(word) ? 'keyword' : BUILTINS.has(word) ? 'builtin' : 'ident';
      push(type, word);
      i += word.length;
      continue;
    }

    // operators: two-char before one-char
    const two = src.slice(i, i + 2);
    if (OPS2.includes(two)) { push('operator', two); i += 2; continue; }
    if (OPS1.has(c)) { push('operator', c); i += 1; continue; }

    // anything else (unexpected char) — surface as an error token
    push('error', c);
    i += 1;
  }

  return tokens;
}

const CLASS = {
  keyword: 'tok-keyword',
  builtin: 'tok-builtin',
  ident: 'tok-ident',
  number: 'tok-number',
  string: 'tok-string',
  escape: 'tok-escape',
  comment: 'tok-comment',
  operator: 'tok-operator',
  error: 'tok-error',
};

// Source -> highlighted HTML (for an overlay <pre>). Whitespace is preserved as
// plain text so the layer aligns 1:1 with the textarea above it.
export function highlightAlpha(src) {
  let html = '';
  for (const { type, value } of tokenizeAlpha(src)) {
    if (type === 'ws') { html += escapeHtml(value); continue; }
    html += `<span class="${CLASS[type] || ''}">${escapeHtml(value)}</span>`;
  }
  return html;
}
