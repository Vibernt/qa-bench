// noop adapter: read the brief, fetch the first target once, write valid empty findings.
// It proves the runner wiring (brief mounted, app reachable on the episode network, out/ writable) and is the
// zero-finding floor of every report. It never prints account passwords.
/* global AbortSignal, setTimeout */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const VERSION = '0.1.0';
const briefPath = process.env.QA_BENCH_BRIEF ?? '/bench/brief/brief.json';
const started = new Date();
const brief = JSON.parse(readFileSync(briefPath, 'utf8'));
const out = brief.out?.findings ?? '/bench/out/findings.json';
const rules = brief.rules ?? {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const notes = [];

async function get(url) {
  const res = await fetch(url, { method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(15000) });
  await res.arrayBuffer();
  return res.status;
}

/** Minimal robots.txt check for User-agent: * (Disallow prefixes). */
async function robotsAllows(target) {
  const u = new URL(target);
  try {
    const res = await fetch(new URL('/robots.txt', u), { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return true;
    let applies = false;
    const disallow = [];
    for (const raw of (await res.text()).split('\n')) {
      const line = raw.replace(/#.*/, '').trim();
      const m = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line);
      if (!m) continue;
      const key = m[1].toLowerCase();
      if (key === 'user-agent') applies = m[2].trim() === '*';
      else if (key === 'disallow' && applies && m[2].trim()) disallow.push(m[2].trim());
    }
    return !disallow.some((p) => u.pathname.startsWith(p));
  } catch {
    return true;
  }
}

const target = brief.targets?.[0]?.url;
if (target) {
  try {
    if (rules.methods && !rules.methods.includes('GET')) {
      notes.push('GET not allowed by the brief rules; nothing fetched');
    } else {
      let allowed = true;
      if (rules.robots_txt === 'honour') {
        allowed = await robotsAllows(target);
        await sleep(rules.min_interval_ms ?? 0);
      }
      if (!allowed) notes.push(`robots.txt disallows ${target}; nothing fetched`);
      else {
        const status = await get(target);
        notes.push(`GET ${target} -> ${status}`);
      }
    }
  } catch (e) {
    notes.push(`GET ${target} failed: ${e.message}`);
  }
}
console.log(`noop ${brief.episode_id}: ${notes.join('; ') || 'no target'}`);

const finished = new Date();
const findings = {
  episode_id: brief.episode_id,
  system: { name: 'noop', version: VERSION },
  findings: [],
  cost: { model_usd: 0, compute_usd: 0 },
  wall_time_s: Math.round((finished - started) / 10) / 100,
  started_at: started.toISOString(),
  finished_at: finished.toISOString(),
  notes: notes.join('; '),
};
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(findings, null, 2) + '\n');
