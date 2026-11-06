// The app's stylesheet, served at /theme.css. The clean design is responsive: below 600 px the expense table turns
// into stacked rows, so every action stays on screen on a phone. Planted visual and accessibility defects
// (server.ts `defects`) and the restyle variant append rules to it; the markup never changes.

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

/** Rules appended for each planted visual or accessibility defect, keyed by its DEFECT name. */
export const defectCss: Record<string, string> = {
  layout_phone_overflow: `@media (max-width: 600px) {
  main { overflow-x: clip; }
  table { display: table; min-width: 760px; }
  thead { display: table-header-group; }
  tbody { display: table-row-group; }
  tr { display: table-row; }
  td { display: table-cell; }
}
`,
  total_covers_last_row: `[data-testid="total"] { position: relative; z-index: 1; margin-top: -46px; }
`,
  alert_text_invisible: `[role="alert"] { color: var(--danger-bg); }
`,
  long_title_overflows: `table { table-layout: fixed; }
th:first-child { width: 32%; }
td:first-child { white-space: nowrap; }
`,
  muted_text_low_contrast: `:root { --muted: #c3c8cd; }
`,
  focus_ring_removed: `*:focus, *:focus-visible { outline: none; }
`,
  amounts_misaligned: `td:nth-child(3) { text-align: left; }
`,
};

/** VARIANT=restyle: a deliberate redesign (new palette, compact rows, pill buttons). Behaviour is unchanged. */
const restyle = `:root { --bg: #eef5f3; --accent: #0b6e5f; --border: #c7dcd6; --radius: 14px; }
h1 { font-size: 1.4rem; letter-spacing: 0.01em; }
button { border-radius: 999px; }
th, td { padding: 6px 10px; }
th { text-transform: none; letter-spacing: 0; }
`;

export function themeCss(active: ReadonlySet<string>, variant: string): string {
  const parts = [base];
  if (variant === 'restyle') parts.push(restyle);
  for (const [name, css] of Object.entries(defectCss)) if (active.has(name)) parts.push(css);
  return parts.join('');
}
