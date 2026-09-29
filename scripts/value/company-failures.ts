/** Collect company failures without aborting workers; enforce the threshold after draining. */
export class CompanyFailures {
  private readonly failures = new Map<string, string[]>();

  record(id: string, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${id}: ${message}`);
    this.failures.set(id, [...(this.failures.get(id) ?? []), message]);
  }

  finish(stage: string, attempted: number): void {
    console.log(`${stage}: ${this.failures.size}/${attempted} companies failed`);
    for (const [id, messages] of this.failures) console.error(`${id}: ${messages.join('; ')}`);
    if (this.failures.size > attempted * 0.2) {
      throw new Error(`${stage}: more than 20% of attempted companies failed (${this.failures.size}/${attempted})`);
    }
  }
}
