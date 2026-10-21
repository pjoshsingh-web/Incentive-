import { test } from "node:test";
import assert from "node:assert/strict";
import {
  annualResult,
  newAnnualGoal,
  newLeadershipPlan,
  splitAnnualShares,
} from "./leadership";
import {
  cloneCompany,
  companyTotals,
  newCompany,
  parseWorkspace,
  sampleWorkspace,
} from "./workspace";
const fresh = () => newLeadershipPlan(2026, "Long Haul");
test("20, 30 and 40 percent at goals produce salary-linked annual earnings", () => {
  for (const percent of [20, 30, 40]) {
    const p = fresh();
    p.bonusPercent = percent;
    const r = annualResult(p);
    assert.equal(r.bonus, (150000 * percent) / 100);
    assert.equal(r.totalCash, 150000 * (1 + percent / 100));
    assert.equal(r.errors.length, 0);
  }
});
test("exceeding all goals never applies an automatic accelerator", () => {
  const p = fresh();
  p.goals.forEach((g) => {
    g.actual = g.target * 2;
    g.cap = 1000;
    g.accelerator = 10;
  });
  assert.equal(annualResult(p).bonus, 45000);
  assert.equal(annualResult(p).maximum, 45000);
});
test("below-goal payments follow weighted thresholds and handle lower-is-better goals", () => {
  const p = fresh();
  p.goals = [
    {
      ...newAnnualGoal("Cost", "division", 100, "$", 100),
      direction: "lower",
      actual: 125,
    },
  ];
  assert.equal(annualResult(p).bonus, 36000);
  p.goals[0].actual = 126;
  assert.equal(annualResult(p).bonus, 0);
  p.goals[0].actual = 0;
  assert.equal(annualResult(p).bonus, 45000);
});
test("draft CEO/CFO accelerators have no effect; recorded decisions apply and respect policy cap", () => {
  const p = fresh();
  p.adjustment.multiplier = 1.2;
  assert.equal(annualResult(p).bonus, 45000);
  p.adjustment = {
    multiplier: 1.2,
    role: "CFO",
    name: "Pat",
    reason: "Board-approved discretionary award",
    recorded: true,
  };
  assert.equal(annualResult(p).bonus, 54000);
  assert.equal(annualResult(p).performanceBonus, 45000);
  assert.equal(annualResult(p).appliedMultiplier, 1.2);
  p.adjustment.multiplier = 3;
  assert.equal(annualResult(p).bonus, 90000);
  assert.equal(annualResult(p).maximum, 90000);
});
test("a missed required rule blocks the bonus even with recorded CEO accelerator", () => {
  const p = fresh();
  p.adjustment = {
    multiplier: 2,
    role: "CEO",
    name: "Alex",
    reason: "Exceptional contribution",
    recorded: true,
  };
  p.goals.push({
    ...newAnnualGoal("Minimum margin", "company", 20, "%", 0),
    gate: true,
    actual: 19,
  });
  const r = annualResult(p);
  assert.equal(r.gatesPassed, false);
  assert.equal(r.bonus, 0);
  assert.equal(r.totalCash, 150000);
});
test("eligibility prorates bonus only, leaving full-year salary unchanged", () => {
  const p = fresh();
  p.eligiblePercent = 50;
  const r = annualResult(p);
  assert.equal(r.targetBonus, 22500);
  assert.equal(r.bonus, 22500);
  assert.equal(r.totalCash, 172500);
});
test("zero-incident required rules allow zero without division by zero", () => {
  const p = fresh();
  p.goals.push({
    ...newAnnualGoal("Safety", "individual", 0, "incidents", 0),
    gate: true,
    direction: "lower",
  });
  assert.equal(annualResult(p).bonus, 45000);
  p.goals.at(-1)!.actual = 1;
  assert.equal(annualResult(p).bonus, 0);
});
test("invalid shares, percentages and incomplete recorded decisions block projections", () => {
  const p = fresh();
  p.goals[0].weight = 0;
  assert.ok(annualResult(p).errors.length);
  assert.equal(annualResult(p).bonus, 0);
  const next = fresh();
  next.bonusPercent = 50;
  assert.ok(annualResult(next).errors.length);
  next.bonusPercent = 30;
  next.adjustment.recorded = true;
  assert.ok(annualResult(next).errors.length);
});
test("saved estimates use current rules and require results for newly added goals", () => {
  const p = fresh();
  const snapshot = Object.fromEntries(p.goals.map((g) => [g.id, g.target]));
  p.salary = 200000;
  assert.equal(annualResult(p, snapshot).totalCash, 260000);
  p.goals = splitAnnualShares([...p.goals, newAnnualGoal("New project")]);
  assert.ok(
    annualResult(p, snapshot).errors.some((e) => e.includes("New project")),
  );
});
test("annual plan roundtrip preserves decisions and estimates without changing regular-plan totals", () => {
  const w = sampleWorkspace();
  const c = w.companies[0];
  const before = companyTotals(c).payout;
  const p = fresh();
  p.estimates = [
    {
      id: "expected",
      name: "Expected",
      results: Object.fromEntries(p.goals.map((g) => [g.id, g.actual])),
    },
  ];
  c.leadershipPlans = [p];
  const restored = parseWorkspace(JSON.stringify(w));
  assert.equal(
    restored.companies[0].leadershipPlans![0].estimates[0].name,
    "Expected",
  );
  assert.equal(companyTotals(restored.companies[0]).payout, before);
  const copy = cloneCompany(c);
  copy.leadershipPlans![0].goals[0].actual = 0;
  assert.notEqual(copy.leadershipPlans![0].id, p.id);
  assert.equal(c.leadershipPlans[0].goals[0].actual, 12000000);
});
test("old workspaces still load and malformed annual data is rejected", () => {
  const w = sampleWorkspace();
  assert.ok(parseWorkspace(JSON.stringify(w)));
  w.companies[0].leadershipPlans = [fresh()];
  w.companies[0].leadershipPlans[0].adjustment.multiplier = Infinity;
  assert.throws(() => parseWorkspace(JSON.stringify(w)));
});
