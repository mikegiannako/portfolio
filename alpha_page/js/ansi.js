// Minimal ANSI SGR -> HTML converter for the colours the Alpha toolchain emits:
//   31 red (errors), 32 green (table keys), 33 amber (warnings / table values /
//   scope headers), 34 blue (source location), 35 magenta (lib funcs), 0 reset.
// Everything else is passed through as escaped text. Output is meant to live
// inside a <pre>, so newlines/spacing are preserved verbatim.

const CLASS_FOR_CODE = {
  31: 'ansi-red',
  32: 'ansi-green',
  33: 'ansi-amber',
  34: 'ansi-blue',
  35: 'ansi-magenta',
  90: 'ansi-dim',
};

export function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function ansiToHtml(input) {
  if (!input) return '';
  const ESC = /\x1b\[([0-9;]*)m/g;
  let out = '';
  let last = 0;
  let open = false;
  let m;
  while ((m = ESC.exec(input)) !== null) {
    out += escapeHtml(input.slice(last, m.index));
    last = ESC.lastIndex;
    const codes = m[1].split(';').filter((x) => x !== '').map(Number);
    if (open) {
      out += '</span>';
      open = false;
    }
    // A reset (0 or empty) just closes; otherwise open the first colour we know.
    const color = codes.find((c) => CLASS_FOR_CODE[c]);
    if (color !== undefined && !codes.includes(0)) {
      out += `<span class="${CLASS_FOR_CODE[color]}">`;
      open = true;
    }
  }
  out += escapeHtml(input.slice(last));
  if (open) out += '</span>';
  return out;
}

// Strip ANSI codes (used when parsing diagnostics for file:line:col).
export function stripAnsi(input) {
  return input ? input.replace(/\x1b\[[0-9;]*m/g, '') : '';
}
