import { test } from "node:test";
import assert from "node:assert/strict";
import { Autosaver, Checkpoint, resumeDecision } from "./autosave";
const data = (value: number) => ({ value });
const tick = () => new Promise((r) => setTimeout(r, 20));
test("rapid changes are debounced into one latest-snapshot save", async () => {
  const writes: number[] = [],
    states: string[] = [];
  const engine = new Autosaver({
    userId: "a",
    data: data(0),
    baseline: JSON.stringify(data(0)),
    revision: 1,
    delay: 5,
    checkpoint: () => {},
    status: (s) => states.push(s),
    write: async (v, r) => {
      writes.push(v.value);
      assert.equal(r, 1);
      return 2;
    },
  });
  engine.update(data(1));
  engine.update(data(2));
  engine.update(data(3));
  await tick();
  assert.deepEqual(writes, [3]);
  assert.equal(states.at(-1), "saved");
  engine.close();
});
test("edits during an in-flight save queue behind its new revision", async () => {
  let finish!: (v: number) => void;
  const calls: { value: number; revision: number }[] = [];
  const checkpoints: Checkpoint<{ value: number }>[] = [];
  const engine = new Autosaver({
    userId: "a",
    data: data(0),
    baseline: JSON.stringify(data(0)),
    revision: 1,
    delay: 10000,
    checkpoint: (c) => checkpoints.push(c),
    status: () => {},
    write: async (v, r) => {
      calls.push({ value: v.value, revision: r });
      if (calls.length === 1)
        return new Promise<number>((resolve) => {
          finish = resolve;
        });
      return r + 1;
    },
  });
  engine.update(data(1));
  const first = engine.save();
  engine.update(data(2));
  const duplicate = engine.save();
  assert.equal(calls.length, 1);
  finish(2);
  await first;
  await duplicate;
  assert.equal(calls.length, 1);
  await engine.save();
  assert.deepEqual(calls, [
    { value: 1, revision: 1 },
    { value: 2, revision: 2 },
  ]);
  assert.equal(checkpoints.at(-1)!.revision, 3);
  assert.equal(checkpoints.at(-1)!.data.value, 2);
  engine.close();
});
test("network failure pauses without an unchanged retry loop and keeps newest draft", async () => {
  let count = 0;
  let last!: Checkpoint<{ value: number }>;
  let state = "";
  const engine = new Autosaver({
    userId: "a",
    data: data(0),
    baseline: JSON.stringify(data(0)),
    revision: 1,
    delay: 5,
    checkpoint: (c) => (last = c),
    status: (s) => (state = s),
    write: async () => {
      count++;
      throw Error("Network unavailable");
    },
  });
  engine.update(data(1));
  await engine.save();
  assert.equal(state, "error");
  engine.update(data(2));
  await tick();
  assert.equal(count, 1);
  assert.equal(last.data.value, 2);
  assert.equal(last.revision, 1);
  engine.close();
});
test("stale revision produces a persistent conflict instead of overwriting remote", async () => {
  let count = 0,
    state = "";
  const engine = new Autosaver({
    userId: "a",
    data: data(0),
    baseline: JSON.stringify(data(0)),
    revision: 1,
    delay: 5,
    checkpoint: () => {},
    status: (s) => (state = s),
    write: async () => {
      count++;
      throw Error("A newer cloud version exists.");
    },
  });
  engine.update(data(1));
  await engine.save();
  assert.equal(state, "conflict");
  engine.update(data(2));
  await engine.save();
  await tick();
  assert.equal(count, 1);
  engine.close();
});
test("closed/account-switched controllers ignore late responses and callbacks", async () => {
  let finish!: (v: number) => void;
  let count = 0;
  const engine = new Autosaver({
    userId: "a",
    data: data(0),
    baseline: JSON.stringify(data(0)),
    revision: 1,
    delay: 10000,
    checkpoint: () => count++,
    status: () => {},
    write: async () => new Promise<number>((r) => (finish = r)),
  });
  engine.update(data(1));
  const saving = engine.save();
  engine.close();
  const before = count;
  finish(2);
  await saving;
  assert.equal(count, before);
});
test("refresh safely resumes pending browser drafts against an unchanged baseline", () => {
  const cp = {
    userId: "a",
    revision: 1,
    baseline: JSON.stringify(data(1)),
    data: data(2),
  };
  assert.equal(
    resumeDecision("a", cp, { revision: 1, data: data(1) }, data(2)),
    "bind",
  );
  assert.equal(
    resumeDecision("a", cp, { revision: 2, data: data(3) }, data(2)),
    "conflict",
  );
  assert.equal(
    resumeDecision("a", cp, { revision: 2, data: data(3) }, data(1)),
    "load",
  );
  assert.equal(
    resumeDecision("a", cp, { revision: 2, data: data(2) }, data(2)),
    "bind",
  );
});
test("different accounts and unowned local changes require a deliberate choice", () => {
  const cp = {
    userId: "a",
    revision: 1,
    baseline: JSON.stringify(data(1)),
    data: data(2),
  };
  assert.equal(
    resumeDecision("b", cp, { revision: 1, data: data(2) }, data(2)),
    "choose",
  );
  assert.equal(
    resumeDecision("a", null, { revision: 1, data: data(1) }, data(2)),
    "choose",
  );
  assert.equal(resumeDecision("a", null, null, data(2)), "bind");
  assert.equal(resumeDecision("a", cp, null, data(2)), "conflict");
});
test("JSONB key reordering is not mistaken for a local edit or cloud conflict", async () => {
  const original = { a: 1, nested: { x: 2, y: 3 } },
    reordered = { nested: { y: 3, x: 2 }, a: 1 };
  const cp = {
    userId: "a",
    revision: 1,
    baseline: JSON.stringify(original),
    data: original,
  };
  assert.equal(
    resumeDecision("a", cp, { revision: 1, data: reordered }, original),
    "bind",
  );
  let count = 0;
  const engine = new Autosaver({
    userId: "a",
    data: reordered,
    baseline: JSON.stringify(original),
    revision: 1,
    delay: 5,
    checkpoint: () => {},
    status: () => {},
    write: async () => {
      count++;
      return 2;
    },
  });
  await tick();
  assert.equal(count, 0);
  engine.close();
});
