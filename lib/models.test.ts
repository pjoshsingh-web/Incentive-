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

test("Bulk proposal compares quarterly caps and truck count using annual policy math", () => {
  const c = newCompany();
  c.overhead = 0;
  const { plan } = makeComparison("bulk-sales", c);
  plan.enabled = true;
  plan.participants = 10;
  c.plans = [plan];
  const current: IncentiveModel = {
    id: "current",
    name: "Current",
    notes: "",
    company: modelSnapshot(c),
  };
  const next: IncentiveModel = {
    id: "next",
    name: "New limit",
    notes: "",
    company: modelSnapshot(c),
  };
  const part = next.company.plans[0].composite!.parts[0];
  if (part.policy?.kind === "quarterly-weekly") part.policy.quarterCap = 1500;
  const r = compareModels([current, next], 2026);
  assert.equal(r[0].result.incentive, 48000);
  assert.equal(r[1].result.incentive, 52000);
  assert.equal(r[1].difference, 4000);
});

test("different existing plans compare as replacements without counting both alternatives", async () => {
  const { replacementModels } = await import("./models");
  const { bulkTemplate } = await import("./composite");
  const c = newCompany();
  c.overhead = 10;
  const current = makeComparison("bulk-sales", c).plan;
  current.enabled = true;
  const proposal = bulkTemplate("Bulk");
  proposal.enabled = false;
  const unrelated = makeComparison("deck-kar", c).plan;
  unrelated.enabled = true;
  c.plans = [current, proposal, unrelated];
  const left: IncentiveModel = {
    id: "l",
    name: "Current",
    notes: "",
    planId: current.id,
    company: modelSnapshot(c),
  };
  const right: IncentiveModel = {
    id: "r",
    name: "Proposed",
    notes: "",
    planId: proposal.id,
    company: modelSnapshot(c),
  };
  const scenarios = replacementModels(left, right, current, proposal);
  const result = compareModels(scenarios, 2026);
  assert.equal(result[0].result.incentive, 4800 + 6000);
  assert.equal(result[1].result.incentive, 7700 + 6000);
  assert.equal(result[1].difference, 3190);
  assert.equal(c.plans.length, 3);
  assert.equal(proposal.enabled, false);
  c.models = [left, right];
  const restored = parseWorkspace(
    JSON.stringify({ version: 2, activeId: c.id, companies: [c] }),
  );
  assert.equal(restored.companies[0].models?.[1].planId, proposal.id);
});

test("selecting the same plan on both sides includes it only once", async () => {
  const { replacementModels } = await import("./models");
  const c = newCompany();
  const plan = makeComparison("deck-kar", c).plan;
  c.plans = [plan];
  const a: IncentiveModel = {
    id: "a",
    name: "A",
    notes: "",
    company: modelSnapshot(c),
  };
  const b: IncentiveModel = {
    id: "b",
    name: "B",
    notes: "",
    company: modelSnapshot(c),
  };
  const result = compareModels(replacementModels(a, b, plan, plan), 2026);
  assert.equal(result[0].result.incentive, 6000);
  assert.equal(result[1].difference, 0);
});

test("live comparison baseline equals Company total and higher/lower proposals change the correct direction", async () => {
  const { livePlanComparison } = await import("./models");
  const { executiveTotal } = await import("./executive");
  const c = newCompany();
  c.overhead = 10;
  const current = makeComparison("deck-kar", c).plan;
  current.enabled = true;
  const unrelated = makeComparison("projects-coordinator", c).plan;
  unrelated.enabled = true;
  const proposed = structuredClone(current);
  proposed.id = "proposal";
  proposed.enabled = false;
  c.plans = [current, unrelated, proposed];
  proposed.composite!.parts[0].rate = 0.0015;
  const higher = livePlanComparison(c, current, proposed, 2026);
  assert.equal(higher.baseline.loaded, executiveTotal(c, 2026).loaded);
  assert.equal(higher.difference, 3300);
  assert.equal(
    higher.projected.loaded,
    higher.baseline.loaded - higher.removed + higher.added,
  );
  proposed.composite!.parts[0].rate = 0.0005;
  const lower = livePlanComparison(c, current, proposed, 2026);
  assert.equal(lower.difference, -3300);
  assert.equal(lower.baseline.loaded, higher.baseline.loaded);
  assert.equal(current.composite!.parts[0].rate, 0.001);
  assert.equal(proposed.enabled, false);
});

test("already-included proposal is removed once and explicitly reconciled rather than double counted", async () => {
  const { livePlanComparison } = await import("./models");
  const c = newCompany();
  c.overhead = 10;
  const current = makeComparison("deck-kar", c).plan;
  current.enabled = true;
  const proposal = makeComparison("deck-kac", c).plan;
  proposal.enabled = true;
  c.plans = [current, proposal];
  const draft = structuredClone(proposal);
  draft.composite!.parts[0].rate = 0.0015;
  const r = livePlanComparison(c, current, draft, 2026);
  assert.equal(r.baseline.loaded, 9900);
  assert.equal(r.projected.loaded, 9900);
  assert.equal(r.difference, 0);
  assert.equal(r.proposalAlreadyIncluded, true);
  assert.equal(r.removedExistingProposal, 3300);
  assert.equal(
    r.projected.loaded,
    r.baseline.loaded - r.removed - r.removedExistingProposal + r.added,
  );
});

test("year and inclusion are preserved in baseline; excluded current plans are not subtracted", async () => {
  const { livePlanComparison } = await import("./models");
  const c = newCompany();
  c.overhead = 2;
  const current = makeComparison("deck-kar", c).plan;
  current.enabled = true;
  current.year = 2025;
  const proposal = makeComparison("deck-kac", c).plan;
  c.plans = [current, proposal];
  const r = livePlanComparison(c, current, proposal, 2026);
  assert.equal(r.baseline.loaded, 0);
  assert.equal(r.removed, 0);
  assert.equal(r.currentIncluded, false);
  assert.equal(r.projected.loaded, 3060);
  assert.equal(r.difference, null);
  assert.equal(r.projected.incomplete, true);
  assert.ok(r.baselineLinkError);
});

test("same-plan comparison respects per-plan cent rounding and does not double count", async () => {
  const { livePlanComparison } = await import("./models");
  const c = newCompany();
  c.overhead = 2;
  const current = makeComparison("deck-kar", c).plan;
  current.enabled = true;
  current.composite!.parts[0].actual = 123456.78;
  c.plans = [current];
  const r = livePlanComparison(c, current, structuredClone(current), 2026);
  assert.equal(r.difference, 0);
  assert.equal(r.proposalAlreadyIncluded, false);
  assert.equal(r.baseline.loaded, r.projected.loaded);
});

test("invalid included live rules block a misleading increase or savings", async () => {
  const { livePlanComparison } = await import("./models");
  const c = newCompany();
  const { plan, pool } = makeComparison("logistics-coordinator", c);
  plan.enabled = true;
  c.plans = [plan];
  c.incentivePools = [pool!];
  const r = livePlanComparison(c, plan, plan, 2026);
  assert.equal(r.baseline.incomplete, true);
  assert.equal(r.difference, null);
});

test("current and proposed headcounts independently change scenario costs without editing live plans", async () => {
  const { livePlanComparison } = await import("./models");
  const { executiveTotal } = await import("./executive");
  const c = newCompany();
  c.overhead = 10;
  const live = makeComparison("deck-kar", c).plan;
  live.enabled = true;
  c.plans = [live];
  const current = { ...live, participants: 3 };
  const proposed = structuredClone(live);
  proposed.id = "proposal";
  proposed.participants = 2;
  const r = livePlanComparison(c, current, proposed, 2026);
  assert.equal(r.liveBaseline.loaded, 6600);
  assert.equal(r.baseline.loaded, 19800);
  assert.equal(r.projected.loaded, 13200);
  assert.equal(r.difference, -6600);
  assert.equal(r.removed, 19800);
  assert.equal(r.currentPreview.incentive, 18000);
  assert.equal(r.headcountAdjusted, true);
  assert.equal(r.headcountAdjustment, 13200);
  proposed.participants = 4;
  assert.equal(livePlanComparison(c, current, proposed, 2026).difference, 6600);
  assert.equal(live.participants, 1);
  assert.equal(executiveTotal(c, 2026).loaded, 6600);
  assert.equal(
    livePlanComparison(c, live, proposed, 2026).headcountAdjusted,
    false,
  );
});

test("comparison headcount overrides survive saved workspace validation", () => {
  const c = newCompany();
  const plan = makeComparison("deck-kar", c).plan;
  c.plans = [plan];
  c.models = [
    {
      id: "m",
      name: "Model",
      notes: "",
      company: modelSnapshot(c),
      participantCounts: { [plan.id]: 5 },
    },
  ];
  const raw = () =>
    JSON.stringify({ version: 2, activeId: c.id, companies: [c] });
  assert.equal(
    parseWorkspace(raw()).companies[0].models?.[0].participantCounts?.[plan.id],
    5,
  );
  c.models[0].participantCounts = { [plan.id]: -1 };
  assert.throws(() => parseWorkspace(raw()));
});

test("2027 proposal carries the existing 2026 Deck KAR 60k baseline and adds only the 15k improvement", async () => {
  const { livePlanComparison } = await import("./models");
  const c = newCompany();
  c.overhead = 0;
  const current = makeComparison("deck-kar", c).plan;
  current.enabled = true;
  current.year = 2026;
  current.participants = 10;
  const proposed = structuredClone(current);
  proposed.id = "proposal";
  proposed.enabled = false;
  proposed.year = 2027;
  proposed.composite!.parts[0].rate = 0.00125;
  c.plans = [current, proposed];
  const r = livePlanComparison(c, current, proposed, 2027, [], 2026);
  assert.equal(r.baseline.incentive, 60000);
  assert.equal(r.projected.incentive, 75000);
  assert.equal(r.difference, 15000);
  assert.equal(r.removed, 60000);
  assert.equal(r.added, 75000);
  assert.equal(r.projected.loaded, r.baseline.loaded + r.difference!);
  proposed.composite!.parts[0].rate = 0.001;
  assert.equal(
    livePlanComparison(c, current, proposed, 2027, [], 2026).difference,
    0,
  );
  assert.equal(current.year, 2026);
  assert.equal(proposed.enabled, false);
});

test("rolling the baseline forward retains unrelated annual leadership and driver incentives", async () => {
  const { livePlanComparison } = await import("./models");
  const { newLeadershipPlan } = await import("./leadership");
  const { newDriverRecord } = await import("./driver-pay");
  const c = newCompany();
  c.overhead = 10;
  const current = makeComparison("deck-kar", c).plan;
  current.enabled = true;
  current.year = 2026;
  current.participants = 10;
  c.plans = [current];
  c.leadershipPlans = [newLeadershipPlan(2026, "Leadership")];
  const driver = newDriverRecord("canadian-deck", 2026, "Deck");
  driver.reviewed = true;
  driver.included = true;
  driver.legs[0].miles = 1000;
  driver.safetyEligible = true;
  driver.safetyLevel = 4;
  c.driverPay = [driver];
  const proposed = structuredClone(current);
  proposed.composite!.parts[0].rate = 0.00125;
  const r = livePlanComparison(c, current, proposed, 2027, [], 2026);
  assert.equal(r.difference, 16500);
  assert.equal(r.projected.incentive - r.baseline.incentive, 15000);
  assert.equal(
    r.projected.rows.find((row) => row.category === "Leadership incentive")
      ?.annual,
    r.baseline.rows.find((row) => row.category === "Leadership incentive")
      ?.annual,
  );
  assert.equal(
    r.projected.rows.find((row) => row.category === "Driver incentive")?.annual,
    40,
  );
  assert.equal(
    r.projected.rows.find((row) => row.category === "Driver incentive")
      ?.included,
    true,
  );
  assert.equal(c.leadershipPlans[0].year, 2026);
  assert.equal(driver.year, 2026);
});

test("screenshot regression: stale Deck snapshot subtracts the existing 60k before adding proposed 90k", async () => {
  const { livePlanComparison } = await import("./models");
  const c = newCompany();
  c.overhead = 2;
  const current = makeComparison("deck-kar", c).plan;
  current.enabled = true;
  current.year = 2027;
  current.participants = 10;
  const other = makeComparison("projects-coordinator", c).plan;
  other.enabled = true;
  other.composite!.parts[0].rate = 1;
  other.composite!.parts[0].actual = 1172789.22;
  c.plans = [current, other];
  const stale = structuredClone(current);
  stale.id = "old-snapshot-id";
  stale.name = "Deck - KAR";
  const proposal = structuredClone(stale);
  proposal.composite!.parts[0].rate = 0.0015;
  const r = livePlanComparison(c, stale, proposal, 2027);
  assert.equal(r.baseline.loaded, 1257445);
  assert.equal(r.currentPreview.incentive, 60000);
  assert.equal(r.proposedPreview.incentive, 90000);
  assert.equal(r.removed, 61200);
  assert.equal(r.added, 91800);
  assert.equal(r.bonusDifference, 30000);
  assert.equal(r.difference, 30600);
  assert.equal(r.projected.loaded, 1288045);
  assert.equal(r.baselinePlanId, current.id);
  assert.equal(r.baselineLinkError, undefined);
});

test("missing or ambiguous baseline links block totals until an included ledger plan is chosen", async () => {
  const { livePlanComparison } = await import("./models");
  const c = newCompany();
  c.overhead = 0;
  const current = makeComparison("deck-kar", c).plan;
  current.enabled = true;
  current.participants = 10;
  const second = structuredClone(current);
  second.id = "second-live-plan";
  c.plans = [current, second];
  const stale = structuredClone(current);
  stale.id = "stale";
  const proposed = structuredClone(stale);
  proposed.composite!.parts[0].rate = 0.0015;
  const ambiguous = livePlanComparison(c, stale, proposed, 2027);
  assert.equal(ambiguous.difference, null);
  assert.equal(ambiguous.bonusDifference, null);
  assert.equal(ambiguous.projected.incomplete, true);
  const mapped = livePlanComparison(
    c,
    stale,
    proposed,
    2027,
    [],
    2027,
    current.id,
  );
  assert.equal(mapped.removed, 60000);
  assert.equal(mapped.difference, 30000);
  assert.equal(mapped.projected.incentive, 150000);
  const missing = livePlanComparison(
    c,
    { ...stale, name: "Unrelated role" },
    proposed,
    2027,
  );
  assert.equal(missing.difference, null);
});

test("baseline identity repair applies to Bulk and weighted job plans, not only Deck", async () => {
  const { livePlanComparison } = await import("./models");
  const { bulkTemplate } = await import("./composite");
  const { template } = await import("./workspace");
  for (const current of [
    bulkTemplate("Bulk"),
    template("Dispatcher", "Operations"),
  ]) {
    const c = newCompany();
    c.overhead = 0;
    current.enabled = true;
    c.plans = [current];
    const stale = structuredClone(current);
    stale.id = "stale-" + current.id;
    const proposed = structuredClone(stale);
    proposed.participants = current.participants * 2;
    const r = livePlanComparison(c, stale, proposed, 2027);
    assert.equal(r.baselineLinkError, undefined);
    assert.equal(r.bonusDifference, r.currentPreview.incentive);
    assert.equal(r.projected.incentive, r.baseline.incentive * 2);
  }
});

test("baseline link choices persist and reject non-string references", () => {
  const c = newCompany();
  const p = makeComparison("deck-kar", c).plan;
  c.plans = [p];
  c.models = [
    {
      id: "m",
      name: "Model",
      notes: "",
      baselinePlanIds: { stale: p.id },
      company: modelSnapshot(c),
    },
  ];
  const json = () =>
    JSON.stringify({ version: 2, activeId: c.id, companies: [c] });
  assert.equal(
    parseWorkspace(json()).companies[0].models?.[0].baselinePlanIds?.stale,
    p.id,
  );
  (c.models[0].baselinePlanIds as any).stale = 42;
  assert.throws(() => parseWorkspace(json()));
});
