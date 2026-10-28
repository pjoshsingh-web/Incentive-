import { test } from "node:test";
import assert from "node:assert/strict";
import { makeComparison, poolFunding } from "./comparison";
import {
  Company,
  newCompany,
  calculatePlan,
  resolvedPlan,
  parseWorkspace,
  sampleWorkspace,
} from "./workspace";
function create(key: Parameters<typeof makeComparison>[0]) {
  const c = newCompany();
  const { plan, pool } = makeComparison(key, c);
  if (pool) c.incentivePools = [pool];
  plan.enabled = true;
  return { c, p: plan, part: plan.composite!.parts[0] };
}
test("all nine comparison templates start as excluded drafts", () => {
  for (const key of [
    "logistics-kar",
    "logistics-coordinator",
    "logistics-tracker",
    "deck-kar",
    "deck-kac",
    "projects-lead",
    "projects-coordinator",
    "bulk-sales",
    "operations",
  ] as const) {
    const { plan } = makeComparison(key, newCompany());
    assert.equal(plan.enabled, false);
  }
});
test("KAR existing and new commissions match chart and age out after 12 months", () => {
  const { c, p, part } = create("logistics-kar");
  let r = calculatePlan(resolvedPlan(c, p));
  assert.equal(r.payout, 2000);
  assert.equal("annualPayout" in r && r.annualPayout, 24000);
  if (part.policy!.kind !== "kar") throw Error();
  part.policy!.newBusinessPercent = 100;
  r = calculatePlan(resolvedPlan(c, p));
  assert.equal("annualPayout" in r && r.annualPayout, 48000);
  part.policy!.businessAgeMonths = 6;
  r = calculatePlan(resolvedPlan(c, p));
  assert.equal("annualPayout" in r && r.annualPayout, 36000);
  part.policy!.businessAgeMonths = 12;
  r = calculatePlan(resolvedPlan(c, p));
  assert.equal("annualPayout" in r && r.annualPayout, 24000);
});
test("KAR proration follows stated illustrative curve with a boundary at 80%", () => {
  const { c, p, part } = create("logistics-kar");
  part.actual = 100000;
  assert.equal(calculatePlan(resolvedPlan(c, p)).payout, 500);
  part.actual = 140000;
  assert.equal(calculatePlan(resolvedPlan(c, p)).payout, 980);
  part.actual = 160000;
  assert.equal(calculatePlan(resolvedPlan(c, p)).payout, 1600);
});
test("Deck and Projects commission percentages are exact, with no invented dollar cap", () => {
  for (const [key, annual] of [
    ["deck-kar", 6000],
    ["deck-kac", 3000],
    ["projects-lead", 4000],
    ["projects-coordinator", 18750],
  ] as const) {
    const { c, p } = create(key);
    const r = calculatePlan(resolvedPlan(c, p));
    assert.equal("annualPayout" in r && r.annualPayout, annual);
    assert.equal(r.maximum, Infinity);
  }
});
test("Logistics examples require confirmed rules and share one pool", () => {
  const { c, p, part } = create("logistics-coordinator");
  assert.ok(calculatePlan(resolvedPlan(c, p)).errors.length);
  c.incentivePools![0].confirmed = true;
  if (part.policy!.kind !== "pool") throw Error();
  part.policy!.confirmed = true;
  let r = calculatePlan(resolvedPlan(c, p));
  assert.equal("annualPayout" in r && r.annualPayout, 5880);
  assert.equal(poolFunding(c.incentivePools![0]), 10500);
  part.policy!.level = 1;
  assert.ok(calculatePlan(resolvedPlan(c, p)).errors.length);
  const tracker = makeComparison("logistics-tracker", c);
  assert.equal(tracker.pool!.id, c.incentivePools![0].id);
  tracker.plan.enabled = true;
  const rule = tracker.plan.composite!.parts[0].policy!;
  if (rule.kind !== "pool") throw Error();
  rule.confirmed = true;
  r = calculatePlan(resolvedPlan(c, tracker.plan));
  assert.equal("annualPayout" in r && r.annualPayout, 2520);
  rule.kpis[0].actual = 50;
  r = calculatePlan(resolvedPlan(c, tracker.plan));
  assert.equal("annualPayout" in r && r.annualPayout, 1890);
});
test("Bulk sales quarterly cap is distinct from the original Bulk two-part plan", () => {
  const { c, p, part } = create("bulk-sales");
  const r = calculatePlan(resolvedPlan(c, p));
  assert.equal("annualPayout" in r && r.annualPayout, 4800);
  part.actual = 4999;
  assert.equal(calculatePlan(resolvedPlan(c, p)).payout, 0);
  part.actual = 5000;
  part.entries = Array(52).fill(5000);
  assert.equal(
    "annualPayout" in calculatePlan(resolvedPlan(c, p)) &&
      (calculatePlan(resolvedPlan(c, p)) as { annualPayout: number })
        .annualPayout,
    4800,
  );
});
test("Operations follows the narrative $200 increments and $200 weekly cap", () => {
  const { c, p, part } = create("operations");
  for (const [actual, weekly] of [
    [4699, 0],
    [4700, 50],
    [4899, 50],
    [4900, 100],
    [5100, 120],
    [5300, 140],
    [5500, 160],
    [5700, 180],
    [5900, 200],
    [7000, 200],
  ]) {
    part.actual = actual;
    const r = calculatePlan(resolvedPlan(c, p));
    assert.equal("annualPayout" in r && r.annualPayout, weekly * 52);
  }
});
test("pool policies and uncapped flags survive workspace backup validation", () => {
  const w = sampleWorkspace();
  const { plan, pool } = makeComparison(
    "logistics-coordinator",
    w.companies[0],
  );
  w.companies[0].plans.push(plan);
  w.companies[0].incentivePools = [pool!];
  assert.ok(parseWorkspace(JSON.stringify(w)));
});
test("Tracker targets use full KPI goals, monetary caps remain binding, and shared pool history is guarded", () => {
  const { c, p, part } = create("logistics-tracker");
  c.incentivePools![0].confirmed = true;
  const policy = part.policy!;
  if (policy.kind !== "pool") throw Error();
  policy.confirmed = true;
  policy.kpis[0].actual = 50;
  let r = calculatePlan(resolvedPlan(c, p));
  assert.equal("annualTarget" in r && r.annualTarget, 2520);
  part.cap = 100;
  r = calculatePlan(resolvedPlan(c, p));
  assert.equal("annualMaximum" in r && r.annualMaximum, 400);
  assert.equal("annualPayout" in r && r.annualPayout, 400);
  part.entries = [1e6, 2e6, 1e6, 2e6];
  assert.ok(
    calculatePlan(resolvedPlan(c, p)).errors.some((e) =>
      e.includes("shared quarterly GP"),
    ),
  );
});
