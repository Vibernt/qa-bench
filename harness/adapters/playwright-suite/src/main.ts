// Container entry point: /bench/brief/brief.json in, /bench/out/findings.json out.
// Exit 0 whenever findings.json was written (even with crashed checks); 2 when the brief is unreadable.
import { readBrief, runEpisode } from './run.ts';
import { errorText } from './findings.ts';

const briefPath = process.argv[2] ?? process.env.QA_BENCH_BRIEF ?? '/bench/brief/brief.json';
let brief;
try {
  brief = readBrief(briefPath);
} catch (error) {
  process.stderr.write(`[playwright-suite] cannot read the brief at ${briefPath}: ${errorText(error)}\n`);
  process.exit(2);
}
try {
  await runEpisode(brief, {
    exitOnHardStop: true,
    ...(process.env.QA_BENCH_FINDINGS ? { findingsPath: process.env.QA_BENCH_FINDINGS } : {}),
    ...(process.env.QA_BENCH_EVIDENCE_DIR ? { evidenceDir: process.env.QA_BENCH_EVIDENCE_DIR } : {}),
  });
} catch (error) {
  // runEpisode writes findings itself; reaching here means even that failed.
  process.stderr.write(`[playwright-suite] failed: ${errorText(error)}\n`);
  process.exit(1);
}
process.exit(0);
