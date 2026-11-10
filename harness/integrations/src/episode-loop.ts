import { join } from 'node:path';
import type { Brief, FindingsFile } from '../../../lib/contracts.ts';
import { writeJson } from '../../../lib/io.ts';
import { redact } from '../../adapters/touchstone/src/redact.ts';

interface Session { brief: string; findings: string }
interface Dependencies {
  up: (id: string) => Promise<{ session: Session; brief: Brief }>;
  checks: (session: Session) => Promise<FindingsFile>;
  down: (dir: string) => Promise<void>;
}

/** Each started session is torn down, even when checks fail. No episode can abort its siblings. */
export async function runEpisodes(ids: string[], runDir: string, deps: Dependencies): Promise<number> {
  let completed = 0;
  for (const id of ids) {
    const dir = join(runDir, id);
    let brief: Brief | undefined;
    let findings: FindingsFile | undefined;
    const errors: string[] = [];
    try {
      const started = await deps.up(id);
      brief = started.brief;
      try {
        findings = await deps.checks(started.session);
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      } finally {
        try { await deps.down(dir); }
        catch (error) { errors.push(`Teardown failed: ${error instanceof Error ? error.message : String(error)}`); }
      }
    } catch (error) {
      // upEpisode owns cleanup when startup fails before returning a session.
      errors.push(error instanceof Error ? error.message : String(error));
    }
    if (errors.length) {
      writeJson(join(dir, 'runner.json'), { episode_id: id, status: 'adapter_error',
        status_reason: redact(errors.join('\n'), brief) });
    } else {
      writeJson(join(dir, 'runner.json'), { episode_id: id, status: 'scored', wall_time_s: findings!.wall_time_s });
      completed++;
    }
  }
  return completed;
}
