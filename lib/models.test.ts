import { test } from "node:test";
import assert from "node:assert/strict";
import { newCompany, parseWorkspace } from "./workspace";
import { makeComparison } from "./comparison";
import { modelSnapshot, compareModels, IncentiveModel } from "./models";
test("Deck proposals show exact annual employer cost change without changing baseline or live plans", () => {
  const c = newCompany();
  c.overhead = 2;
  const p = makeComparison("deck-kar", c).plan;
  p.enabled = true;
  p.participants = 2;
  c.plans = [p];
  const baseline: IncentiveModel = {
    id: "base",
    name: "Current",
    notes: "",
    company: modelSnapshot(c),
  };
  const proposal: IncentiveModel = {
    id: "new",
    name: "Proposal",
    notes: "",
    company: modelSnapshot(c),
  };
  proposal.company.plans[0].composite!.parts[0].rate = 0.0015;
  const r = compareModels([baseline, proposal], 2026);
  assert.equal(r[0].result.incentive, 12000);
  assert.equal(r[1].result.incentive, 18000);
  assert.equal(r[1].difference, 6120);
  assert.equal(r[1].percent, 50);
  assert.equal(c.plans[0].composite!.parts[0].rate, 0.001);
  c.models = [baseline, proposal];
  assert.equal(
    parseWorkspace(
      JSON.stringify({ version: 2, activeId: c.id, companies: [c] }),
    ).companies[0].models?.length,
    2,
  );
  assert.equal("models" in modelSnapshot(c), false);
});
test("unconfirmed Logistics proposal cannot present a cost difference as complete", () => {
  const c = newCompany();
  const { plan, pool } = makeComparison("logistics-coordinator", c);
  plan.enabled = true;
  c.plans = [plan];
  c.incentivePools = [pool!];
  const r = compareModels(
    [{ id: "a", name: "Example", notes: "", company: modelSnapshot(c) }],
    2026,
  );
  assert.equal(r[0].result.incomplete, true);
  assert.equal(r[0].difference, null);
});
test("rejects malformed or nested saved models", () => {
  const c = newCompany();
  c.models = [{ id: "a", name: "A", notes: "", company: modelSnapshot(c) }];
  (c.models[0].company as any).models = [];
  assert.throws(() =>
    parseWorkspace(
      JSON.stringify({ version: 2, activeId: c.id, companies: [c] }),
    ),
  );
});

test('Bulk proposal compares quarterly caps and truck count using annual policy math', () => {
  const c = newCompany(); c.overhead = 0;
  const { plan } = makeComparison('bulk-sales', c);
  plan.enabled = true; plan.participants = 10; c.plans = [plan];
  const current: IncentiveModel = {id:'current', name:'Current', notes:'', company:modelSnapshot(c)};
  const next: IncentiveModel = {id:'next', name:'New limit', notes:'', company:modelSnapshot(c)};
  const part = next.company.plans[0].composite!.parts[0];
  if (part.policy?.kind === 'quarterly-weekly') part.policy.quarterCap = 1500;
  const r = compareModels([current, next], 2026);
  assert.equal(r[0].result.incentive,48000);
  assert.equal(r[1].result.incentive,52000);
  assert.equal(r[1].difference,4000);
});
