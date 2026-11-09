import { test } from "node:test";
import assert from "node:assert/strict";
import { newCompany, parseWorkspace } from "./workspace";
import { makeComparison } from "./comparison";
import { newPart, compositeResult } from "./composite";
import { resolveProposalPlan } from "./proposal-basis";
import { livePlanComparison } from "./models";
import { paymentTiming } from "./payment-timing";
function fixture() {
  const c = newCompany();
  c.overhead = 2;
  const plan = makeComparison("logistics-kar", c).plan;
  plan.enabled = true;
  plan.participants = 10;
  c.plans = [plan];
  const part = newPart();
  Object.assign(part, {
    frequency: "Monthly",
    periods: 12,
    basis: "recipient",
    method: "rate",
    unit: "$",
    actual: 999999,
    target: 50000,
    rate: 0.05,
    cap: null,
    allowUncapped: true,
    proposalBasis: {
      kind: "gross-profit",
      revenue: 200000,
      margin: 25,
      label: "Monthly gross profit",
      minimumMargin: 0,
    },
  });
  const proposal = {
    ...structuredClone(plan),
    composite: { ...plan.composite!, parts: [part] },
  };
  return { c, plan, part, proposal };
}
test("gross-profit commission derives revenue times margin on every calculation, not stale actuals", () => {
  const { c, plan, part, proposal } = fixture();
  const r = livePlanComparison(c, plan, proposal, 2027);
  assert.equal(r.currentPreview.incentive, 240000);
  assert.equal(r.proposedPreview.incentive, 300000);
  assert.equal(r.bonusDifference, 60000);
  assert.equal(r.difference, 61200);
  assert.equal(resolveProposalPlan(proposal).composite!.parts[0].actual, 50000);
  part.proposalBasis!.margin = 20;
  assert.equal(compositeResult(proposal).annualPayout, 240000);
  assert.equal(part.actual, 999999);
});
test("a shared GP pool is funded once and headcount only changes equal-share estimates", () => {
  const { proposal, part } = fixture();
  part.basis = "shared";
  part.proposalBasis!.revenue = 2000000;
  assert.equal(compositeResult(proposal).annualPayout, 300000);
  proposal.participants = 20;
  assert.equal(compositeResult(proposal).annualPayout, 300000);
  assert.equal(
    compositeResult(proposal).annualPayout / proposal.participants,
    15000,
  );
});
test("fixed monthly pool has a known budget and is not multiplied by recipients", () => {
  const { proposal, part } = fixture();
  part.basis = "shared";
  part.proposalBasis!.kind = "fixed";
  part.actual = 10000;
  part.rate = 1;
  const r = compositeResult(proposal);
  assert.equal(r.annualPayout, 120000);
  assert.equal(r.annualMaximum, 120000);
  part.cap = 5000;
  assert.equal(compositeResult(proposal).annualPayout, 60000);
});
test("margin gate, per-component limits and overall annual limit constrain the forecast", () => {
  const { proposal, part } = fixture();
  part.proposalBasis!.minimumMargin = 30;
  assert.equal(compositeResult(proposal).annualPayout, 0);
  part.proposalBasis!.margin = 35;
  part.cap = 1000;
  assert.equal(compositeResult(proposal).annualPayout, 120000);
  proposal.composite!.annualCap = 100000;
  assert.equal(compositeResult(proposal).annualPayout, 100000);
  part.proposalBasis!.margin = 101;
  assert.ok(compositeResult(proposal).errors.length);
});
test("custom goals and tiers combine with a pool and obey the whole-plan cap", () => {
  const { proposal, part } = fixture();
  part.basis = "shared";
  part.proposalBasis!.kind = "fixed";
  part.actual = 10000;
  part.rate = 1;
  const goal = newPart();
  Object.assign(goal, {
    frequency: "Monthly",
    periods: 12,
    method: "goal",
    actual: 100,
    target: 100,
    targetPayout: 500,
    cap: 1000,
    proposalBasis: {
      kind: "custom",
      revenue: 0,
      margin: 25,
      label: "On-time delivery",
      minimumMargin: 0,
    },
  });
  proposal.composite!.parts.push(goal);
  assert.equal(compositeResult(proposal).annualPayout, 180000);
  goal.actual = 70;
  assert.equal(compositeResult(proposal).annualPayout, 120000);
  goal.method = "tiers";
  goal.actual = 110;
  goal.cap = 1500;
  assert.equal(compositeResult(proposal).annualPayout, 300000);
  proposal.composite!.annualCap = 200000;
  assert.equal(compositeResult(proposal).annualPayout, 200000);
});
test("saved proposal formulas validate and recalculate from their stored inputs", () => {
  const { c, proposal } = fixture();
  c.plans = [proposal];
  const w = parseWorkspace(
    JSON.stringify({ version: 2, activeId: c.id, companies: [c] }),
  );
  assert.equal(compositeResult(w.companies[0].plans[0]).annualPayout, 300000);
  proposal.composite!.parts[0].proposalBasis!.revenue = -1;
  assert.throws(() =>
    parseWorkspace(
      JSON.stringify({ version: 2, activeId: c.id, companies: [c] }),
    ),
  );
});
test("invalid per-period history and uncapped lower-is-better goals cannot produce misleading forecasts", () => {
  const { proposal, part } = fixture();
  part.entries = [1, 2];
  assert.ok(compositeResult(proposal).errors.length);
  part.entries = null;
  part.method = "goal";
  part.direction = "lower";
  part.actual = 0;
  part.proposalBasis!.kind = "custom";
  assert.ok(compositeResult(proposal).errors.length);
});
test("monthly calculations and quarterly payout dates are independent of the annual amount", () => {
  const { c, plan } = fixture();
  const before = compositeResult(plan).annualPayout;
  assert.equal(paymentTiming(plan).schedule, "Quarterly");
  assert.equal(paymentTiming(plan).count, 4);
  assert.equal(plan.composite!.parts[0].frequency, "Monthly");
  assert.equal(plan.composite!.parts[0].periods, 12);
  plan.paymentSchedule = "Monthly";
  assert.equal(paymentTiming(plan).count, 12);
  assert.equal(compositeResult(plan).annualPayout, before);
  plan.paymentSchedule = "Quarterly";
  const w = parseWorkspace(
    JSON.stringify({ version: 2, activeId: c.id, companies: [c] }),
  );
  assert.equal(w.companies[0].plans[0].paymentSchedule, "Quarterly");
});
