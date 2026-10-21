import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculatePlan,
  cloneCompany,
  companyTotals,
  newCompany,
  parseWorkspace,
  resolvedPlan,
  sampleWorkspace,
  template,
} from "./workspace";
test("driver pool is per-person, with hard zero-incident safety gate", () => {
  const p = template("Company Driver", "Fleet operations");
  assert.equal(calculatePlan(p).pool, 5000);
  assert.equal(calculatePlan(p).payout, 5000);
  p.metrics.find((m) => m.gate)!.actual = 1;
  assert.equal(calculatePlan(p).payout, 0);
  assert.equal(calculatePlan(p).gatesPassed, false);
});
test("lower-is-better actuals and above-target acceleration respect both caps", () => {
  const p = template("Maintenance Manager", "Maintenance");
  p.metrics = [
    {
      ...p.metrics[0],
      direction: "lower",
      weight: 100,
      target: 100,
      actual: 50,
      cap: 200,
      accelerator: 2,
    },
  ];
  p.cap = 120;
  assert.equal(calculatePlan(p).payout, 6000);
  p.metrics[0].actual = 0;
  assert.equal(calculatePlan(p).payout, 6000);
  p.metrics[0].actual = 200;
  assert.equal(calculatePlan(p).payout, 0);
});
test("department shared pool is not multiplied by recipient count", () => {
  const p = template("Fleet Manager", "Fleet operations", "department");
  p.participants = 30;
  assert.equal(calculatePlan(p).pool, 10000);
  assert.equal(calculatePlan(p).payout, 10000);
});
test("invalid weights block payout and are preserved as editable drafts", () => {
  const w = sampleWorkspace();
  const p = w.companies[0].plans[0];
  p.metrics[0].weight = 20;
  assert.ok(calculatePlan(p).errors.length);
  assert.equal(calculatePlan(p).payout, 0);
  assert.equal(
    parseWorkspace(JSON.stringify(w)).companies[0].plans[0].metrics[0].weight,
    20,
  );
});
test("department actual links feed the plan and company burden is added exactly once", () => {
  const c = newCompany();
  c.plans = [template("Fleet Manager", "Fleet operations", "department")];
  c.plans[0].metrics[0].target = c.departments[0].budget;
  c.departments[0].actual = c.departments[0].budget;
  assert.equal(resolvedPlan(c, c.plans[0]).metrics[0].actual, 650000);
  const r = companyTotals(c);
  assert.equal(r.payout, 10000);
  assert.equal(r.loaded, 11000);
  assert.equal(r.afterIncentives, r.budget - r.actual - 11000);
  c.plans[0].enabled = false;
  assert.equal(companyTotals(c).loaded, 0);
});
test("separate company copies have independent identifiers and plans", () => {
  const w = sampleWorkspace();
  const copy = cloneCompany(w.companies[0]);
  assert.notEqual(copy.id, w.companies[0].id);
  assert.notEqual(
    copy.plans[0].metrics[0].id,
    w.companies[0].plans[0].metrics[0].id,
  );
  copy.plans[0].metrics[0].actual = 0;
  assert.notEqual(
    copy.plans[0].metrics[0].actual,
    w.companies[0].plans[0].metrics[0].actual,
  );
});
test("backup parser rejects unsupported versions, nonfinite numbers and unknown directions", () => {
  const w = sampleWorkspace();
  assert.throws(() => parseWorkspace('{"version":1}'));
  w.companies[0].revenue = Infinity;
  assert.throws(() => parseWorkspace(JSON.stringify(w)));
  const next = sampleWorkspace();
  (
    next.companies[0].plans[0].metrics[0] as unknown as { direction: string }
  ).direction = "sideways";
  assert.throws(() => parseWorkspace(JSON.stringify(next)));
});
test("linked metrics cannot silently use stale actuals if department is missing", () => {
  const c = newCompany();
  const p = template("Team", "Unknown department", "department");
  assert.ok(calculatePlan(resolvedPlan(c, p)).errors.length);
  assert.equal(calculatePlan(resolvedPlan(c, p)).payout, 0);
});
