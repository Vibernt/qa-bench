// Transcript audit for the claude-code-subagent driver: reads one agent's transcript (Claude Code JSONL, one event
// per line) and reports, from the agent's own tool calls only:
// - sealed_path_hits: tool inputs that mention the answer key or the repository (AGENTS.md rule 8), with samples;
// - tool_calls, screenshots_taken (inputs that capture a screenshot) and screenshots_viewed (Read calls on an image:
//   the model looked at it, rather than only saving it);
// - the models that served the agent's turns.
// Other drivers need their own reader for their transcript format; usage.json takes the same fields.
import { readFileSync } from 'node:fs';
import { REPO_ROOT } from '../../../lib/io.ts';

export interface TranscriptAudit {
  tool_calls: number;
  screenshots_taken: number;
  screenshots_viewed: number;
  sealed_path_hits: number;
  samples: string[];
  models: Record<string, number>;
}

const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Paths and names an agent has no business touching: the repository itself and every answer-key artefact. */
export function sealedPattern(repoRoot = REPO_ROOT): RegExp {
  const parts = [escape(repoRoot), String.raw`qa-bench/apps`, String.raw`/mutations/`, String.raw`/changes/`, String.raw`/baseline/`,
    String.raw`answer-key`, String.raw`label\.yaml`, String.raw`verify\.ts`, String.raw`/episodes/`, String.raw`\bepisodes/(regression|exploration|noise|visual)`];
  return new RegExp(parts.join('|'), 'g');
}

const IMAGE = /\.(png|jpe?g|webp|gif)$/i;
const CAPTURE = /\.screenshot\(|--screenshot\b|screencapture|page\.pdf\(/g;

export function auditTranscript(text: string, sealed = sealedPattern()): TranscriptAudit {
  const out: TranscriptAudit = { tool_calls: 0, screenshots_taken: 0, screenshots_viewed: 0, sealed_path_hits: 0, samples: [], models: {} };
  for (const line of text.split('\n')) {
    let ev: unknown;
    try { ev = JSON.parse(line); } catch { continue; }
    const msg = (ev as { message?: { role?: string; model?: string; content?: unknown } } | null)?.message;
    if (!msg || msg.role !== 'assistant') continue;
    if (msg.model) out.models[msg.model] = (out.models[msg.model] ?? 0) + 1;
    if (!Array.isArray(msg.content)) continue;
    for (const block of msg.content as { type?: string; name?: string; input?: Record<string, unknown> }[]) {
      if (block?.type !== 'tool_use') continue;
      out.tool_calls++;
      const input = JSON.stringify(block.input ?? {});
      if (block.name === 'Read' && typeof block.input?.file_path === 'string' && IMAGE.test(block.input.file_path)) out.screenshots_viewed++;
      if (input.match(CAPTURE)) out.screenshots_taken++;
      for (const m of input.matchAll(sealed)) {
        out.sealed_path_hits++;
        if (out.samples.length < 3) out.samples.push(input.slice(Math.max(0, (m.index ?? 0) - 60), (m.index ?? 0) + m[0].length + 40));
      }
    }
  }
  return out;
}

export const auditTranscriptFile = (path: string, sealed?: RegExp): TranscriptAudit => auditTranscript(readFileSync(path, 'utf8'), sealed);
