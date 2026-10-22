// Postgres JSONB can reorder object keys. Compare content rather than insertion order.
export function stableJSON(value: unknown): string {
  return JSON.stringify(value, (_key, v) => {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const sorted = Object.create(null) as Record<string, unknown>;
      for (const key of Object.keys(v).sort()) sorted[key] = v[key];
      return sorted;
    }
    return v;
  });
}
export type SaveState = "pending" | "saving" | "saved" | "error" | "conflict";
export type Checkpoint<T> = {
  userId: string;
  revision: number;
  baseline: string;
  data: T;
};
export class Autosaver<T> {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private closed = false;
  private running: Promise<void> | null = null;
  private blocked = false;
  private baseline: string;
  private revision: number;
  private current: T;
  constructor(
    private options: {
      userId: string;
      data: T;
      baseline: string;
      revision: number;
      delay?: number;
      write: (data: T, revision: number) => Promise<number>;
      checkpoint: (v: Checkpoint<T>) => void;
      status: (state: SaveState, message?: string) => void;
    },
  ) {
    this.current = options.data;
    this.baseline = options.baseline
      ? stableJSON(JSON.parse(options.baseline))
      : "";
    this.revision = options.revision;
    this.persist();
    this.schedule();
  }
  get saving() {
    return this.running !== null;
  }
  get dirty() {
    return stableJSON(this.current) !== this.baseline;
  }
  private persist() {
    if (!this.closed)
      this.options.checkpoint({
        userId: this.options.userId,
        revision: this.revision,
        baseline: this.baseline,
        data: this.current,
      });
  }
  update(data: T) {
    this.current = data;
    if (this.closed) return;
    this.persist();
    if (!this.blocked) this.schedule();
  }
  private schedule() {
    clearTimeout(this.timer);
    if (this.closed || this.blocked) return;
    if (this.running) return;
    if (!this.dirty) {
      this.options.status("saved");
      return;
    }
    this.options.status("pending");
    this.timer = setTimeout(() => void this.save(), this.options.delay ?? 1200);
  }
  async save() {
    clearTimeout(this.timer);
    if (this.closed || this.blocked) return;
    if (this.running) {
      await this.running;
      return;
    }
    if (!this.dirty) {
      this.options.status("saved");
      return;
    }
    const data = this.current,
      sent = stableJSON(data),
      revision = this.revision;
    this.options.status("saving");
    let failed = false;
    this.running = (async () => {
      try {
        const next = await this.options.write(data, revision);
        if (this.closed) return;
        if (!Number.isInteger(next) || next <= revision)
          throw Error("The server did not confirm the save.");
        this.revision = next;
        this.baseline = sent;
        this.persist();
      } catch (e) {
        if (this.closed) return;
        failed = true;
        const message =
          e instanceof Error ? e.message : "Could not save to cloud.";
        this.blocked = true;
        this.options.status(
          /newer cloud version/i.test(message) ? "conflict" : "error",
          message,
        );
      }
    })();
    await this.running;
    this.running = null;
    if (!this.closed && !failed) this.schedule();
  }
  retry() {
    if (this.closed) return;
    this.blocked = false;
    void this.save();
  }
  close() {
    this.closed = true;
    clearTimeout(this.timer);
  }
}
export type RemoteWorkspace<T> = { data: T; revision: number };
// Select a safe resume path without discarding browser edits or overwriting another device.
export function resumeDecision<T>(
  userId: string,
  checkpoint: Checkpoint<T> | null,
  remote: RemoteWorkspace<T> | null,
  current: T,
): "bind" | "load" | "choose" | "conflict" {
  const json = stableJSON(current),
    remoteJSON = remote ? stableJSON(remote.data) : "";
  if (checkpoint && checkpoint.userId !== userId) return "choose";
  if (remote && remoteJSON === json) return "bind";
  if (!checkpoint) return remote ? "choose" : "bind";
  if (!remote) return checkpoint.revision === 0 ? "bind" : "conflict";
  if (
    (checkpoint.baseline ? stableJSON(JSON.parse(checkpoint.baseline)) : "") ===
    remoteJSON
  )
    return "bind";
  if (
    json ===
    (checkpoint.baseline ? stableJSON(JSON.parse(checkpoint.baseline)) : "")
  )
    return "load";
  return "conflict";
}
