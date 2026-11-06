// The app's stylesheet, served at /theme.css. The clean design is responsive: below 600 px the expense table turns
// into stacked rows, so every action stays on screen on a phone. Planted visual and accessibility defects
// (server.ts `defects`) and the restyle variant edit its rules in place (defectEdits); the markup never changes.

const base = `:root {
  --bg: #f4f6f8;
  --surface: #ffffff;
  --text: #1d2733;
  --muted: #56606b;
  --accent: #1f5fbf;
  --accent-text: #ffffff;
  --danger: #b3261e;
  --danger-bg: #fdecea;
  --ok: #1e6b3a;
  --ok-bg: #e7f4ec;
  --border: #d5dbe1;
  --focus: #e09400;
  --radius: 8px;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); line-height: 1.5; }
main { max-width: 960px; margin: 0 auto; padding: 24px 16px; }
h1 { font-size: 1.6rem; margin: 0 0 16px; }
p { margin: 8px 0; }
a { color: var(--accent); }
:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }
label { display: block; margin: 0 0 12px; font-weight: 600; }
input, select {
  display: block; width: 100%; max-width: 360px; margin-top: 4px; padding: 8px 10px; font: inherit;
  border: 1px solid var(--border); border-radius: 6px; background: var(--surface); color: var(--text);
}
button {
  font: inherit; padding: 8px 14px; border-radius: 6px; border: 1px solid var(--accent);
  background: var(--accent); color: var(--accent-text); cursor: pointer;
}
main > p:not([role]):not([data-testid]) { color: var(--muted); }
[role="alert"] { color: var(--danger); background: var(--danger-bg); border: 1px solid var(--danger); padding: 8px 12px; border-radius: 6px; }
[role="status"] { color: var(--ok); background: var(--ok-bg); border: 1px solid var(--ok); padding: 8px 12px; border-radius: 6px; }
main > form[method="post"]:not([action="/logout"]) {
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; max-width: 420px;
}
form[action="/logout"] button { background: transparent; color: var(--accent); }
form[method="get"] { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 8px; margin: 16px 0; }
form[method="get"] label { margin: 0; }
table { width: 100%; border-collapse: collapse; background: var(--surface); border: 1px solid var(--border); }
th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid var(--border); vertical-align: middle; }
th { font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); }
td:nth-child(2) { color: var(--muted); }
th:nth-child(3), td:nth-child(3) { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
td:nth-child(4) { white-space: nowrap; }
td:nth-child(4) a { margin-right: 8px; }
td:nth-child(4) form { display: inline; }
td:nth-child(4) button { background: transparent; color: var(--danger); border-color: var(--danger); padding: 4px 10px; }
[data-testid="total"] {
  font-weight: 700; font-size: 1.1rem; text-align: right; background: var(--surface);
  border: 1px solid var(--border); border-radius: var(--radius); padding: 10px 12px; margin-top: 12px;
}
@media (max-width: 600px) {
  main { padding: 16px 12px; }
  thead { display: none; }
  table, tbody, tr, td { display: block; width: 100%; }
  tr { border-bottom: 1px solid var(--border); padding: 8px 0; }
  td { border: none; padding: 2px 12px; }
  td:nth-child(3) { text-align: left; }
  td:nth-child(4) { padding-top: 6px; }
}
`;

/**
 * Each planted visual or accessibility defect (keyed by its DEFECT name) and the restyle variant edit the clean
 * stylesheet in place: [exact text, replacement] pairs, applied in order. A regression in a real stylesheet changes
 * a rule where it stands, so the served file reads as one consistent stylesheet, not a clean one with overrides
 * appended. Every edit must match exactly once (themeCss throws otherwise).
 */
export const defectEdits: Record<string, [string, string][]> = {
  layout_phone_overflow: [[
    `  thead { display: none; }
  table, tbody, tr, td { display: block; width: 100%; }
  tr { border-bottom: 1px solid var(--border); padding: 8px 0; }
  td { border: none; padding: 2px 12px; }
  td:nth-child(3) { text-align: left; }
  td:nth-child(4) { padding-top: 6px; }
`,
    `  main { overflow-x: clip; }
  table { min-width: 760px; }
`,
  ]],
  total_covers_last_row: [['border-radius: var(--radius); padding: 10px 12px; margin-top: 12px;', 'border-radius: var(--radius); padding: 10px 12px; margin-top: -46px; position: relative;']],
  alert_text_invisible: [['[role="alert"] { color: var(--danger);', '[role="alert"] { color: var(--danger-bg);']],
  long_title_overflows: [
    ['table { width: 100%; border-collapse: collapse;', 'table { width: 100%; table-layout: fixed; border-collapse: collapse;'],
    ['td:nth-child(2) { color: var(--muted); }', 'th:first-child { width: 32%; }\ntd:first-child { white-space: nowrap; }\ntd:nth-child(2) { color: var(--muted); }'],
  ],
  muted_text_low_contrast: [['  --muted: #56606b;', '  --muted: #c3c8cd;']],
  focus_ring_removed: [[':focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }', '*:focus, *:focus-visible { outline: none; }']],
  amounts_misaligned: [['th:nth-child(3), td:nth-child(3) { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }',
    'th:nth-child(3) { text-align: right; }\ntd:nth-child(3) { white-space: nowrap; font-variant-numeric: tabular-nums; }']],
};

/** VARIANT=restyle: a deliberate redesign (new palette, compact rows, pill buttons). Behaviour is unchanged. */
const restyleEdits: [string, string][] = [
  ['  --bg: #f4f6f8;', '  --bg: #eef5f3;'],
  ['  --accent: #1f5fbf;', '  --accent: #0b6e5f;'],
  ['  --border: #d5dbe1;', '  --border: #c7dcd6;'],
  ['  --radius: 8px;', '  --radius: 14px;'],
  ['h1 { font-size: 1.6rem; margin: 0 0 16px; }', 'h1 { font-size: 1.4rem; letter-spacing: 0.01em; margin: 0 0 16px; }'],
  ['  font: inherit; padding: 8px 14px; border-radius: 6px;', '  font: inherit; padding: 8px 14px; border-radius: 999px;'],
  ['th, td { padding: 10px 12px;', 'th, td { padding: 6px 10px;'],
  ['th { font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.04em;', 'th { font-size: 0.85rem;'],
];

function apply(css: string, edits: [string, string][], what: string): string {
  for (const [from, to] of edits) {
    const at = css.indexOf(from);
    if (at < 0 || css.indexOf(from, at + 1) >= 0) throw new Error(`theme: ${what} edit does not match exactly once: ${from.slice(0, 60)}`);
    css = css.slice(0, at) + to + css.slice(at + from.length);
  }
  return css;
}

export function themeCss(active: ReadonlySet<string>, variant: string): string {
  let css = base;
  if (variant === 'restyle') css = apply(css, restyleEdits, 'restyle');
  for (const [name, edits] of Object.entries(defectEdits)) if (active.has(name)) css = apply(css, edits, name);
  return css;
}
