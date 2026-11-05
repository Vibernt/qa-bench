/** Reviewed in-process harness capability; never exposed as an HTTP admin route. */
export interface IsolationMail { runId: string; title: string }
export class FixtureIsolation {
  readonly mail: IsolationMail[] = [];
  private readonly jobs = new Set<ReturnType<typeof setTimeout>>();
  private generation = 0;
  private clearRuntime: (() => void) | undefined;
  private runtimeState: (() => { sessions: number; cache: number }) | undefined;
  constructor(public runId: string, readonly delayedJobs = false, readonly mailSink = false) {}
  bind(clear: () => void, state: () => { sessions: number; cache: number }): void {
    if (this.clearRuntime) throw new Error('Isolation capability already attached');
    this.clearRuntime = clear; this.runtimeState = state;
  }
  created(title: string, write: (title: string) => void): void {
    const runId = this.runId;
    if (this.mailSink) this.mail.push({ runId, title });
    if (!this.delayedJobs) return;
    const generation = this.generation;
    const timer = setTimeout(() => {
      this.jobs.delete(timer);
      if (this.generation === generation) write(`background:${runId}:${title}`);
    }, 2000);
    this.jobs.add(timer);
  }
  /** Synchronous cancellation plus a generation fence prevents callbacks surviving reset. */
  reset(): void {
    this.generation++;
    for (const timer of this.jobs) clearTimeout(timer);
    this.jobs.clear(); this.mail.length = 0; this.clearRuntime?.();
  }
  inspect(): { sessions: number; cache: number; pendingJobs: number; mail: IsolationMail[] } {
    if (!this.runtimeState) throw new Error('Isolation capability is not attached');
    return { ...this.runtimeState(), pendingJobs: this.jobs.size, mail: structuredClone(this.mail) };
  }
}

/** Compatibility alias for existing S1 callers. */
export { FixtureIsolation as ExperimentalIsolation };
