import { test } from "node:test";
import assert from "node:assert/strict";
import {
  newCompany,
  template,
  cloneCompany,
  parseWorkspace,
} from "./workspace";
import { newLeadershipPlan } from "./leadership";
import { bulkTemplate } from "./composite";
import { newDriverRecord } from "./driver-pay";
import { executiveTotal } from "./executive";
import { makeComparison } from "./comparison";
test("company total combines regular, exact multi-part annual, leadership and driver incentives once", () => {
  const c = newCompany();
  c.plans = [template("Dispatcher", "Fleet operations"), bulkTemplate("Bulk")];
  c.leadershipPlans = [newLeadershipPlan(2026, "Leadership")];
  const d = newDriverRecord("canadian-deck", 2026, "Deck");
  d.reviewed = true;
  d.included = true;
  d.legs[0].miles = 1000;
  d.safetyEligible = true;
  d.safetyLevel = 4;
  c.driverPay = [d];
  const r = executiveTotal(c, 2026);
  assert.equal(r.incentive, 60000 + 7700 + 45000 + 40);
  assert.equal(r.regularDriverPay, 480);
  assert.equal(r.leadershipSalary, 150000);
  assert.equal(r.loaded, 124014);
  assert.equal(r.modeledCash, r.incentive + 480 + 150000);
  assert.equal(r.incomplete, false);
});
test("excluded drafts and other years do not inflate the total", () => {
  const c = newCompany();
  c.plans = [bulkTemplate("Bulk")];
  c.plans[0].enabled = false;
  c.leadershipPlans = [
    newLeadershipPlan(2025, "Leadership"),
    { ...newLeadershipPlan(2026, "Leadership"), includeInCompanyTotal: false },
  ];
  assert.equal(executiveTotal(c, 2026).incentive, 0);
});
test("included invalid plans mark report incomplete instead of claiming a full total", () => {
  const c = newCompany();
  c.plans = [template("Dispatcher", "Fleet operations")];
  c.plans[0].metrics[0].weight = 0;
  assert.equal(executiveTotal(c, 2026).incomplete, true);
});
test("no stated commission cap remains visibly unbounded while projected payout is finite", () => {
  const c = newCompany();
  const p = makeComparison("deck-kar", c).plan;
  p.enabled = true;
  c.plans = [p];
  const r = executiveTotal(c, 2026);
  assert.equal(r.incentive, 6000);
  assert.equal(r.maximum, Infinity);
});
test("shared pool is not double-counted and oversubscription is flagged", () => {
  const c = newCompany();
  const a = makeComparison("logistics-coordinator", c);
  c.incentivePools = [a.pool!];
  a.pool!.confirmed = true;
  a.plan.enabled = true;
  const policy = a.plan.composite!.parts[0].policy!;
  if (policy.kind !== "pool") throw Error();
  policy.confirmed = true;
  a.plan.participants = 8;
  c.plans = [a.plan];
  const r = executiveTotal(c, 2026);
  assert.ok(r.allocations[0].over);
  assert.ok(r.incomplete);
  assert.equal(r.incentive, 5880 * 8);
});
test("driver data and pool references survive backups and company copies independently", () => {
  const c = newCompany();
  const a = makeComparison("logistics-tracker", c);
  c.incentivePools = [a.pool!];
  c.plans = [a.plan];
  c.driverPay = [newDriverRecord("canadian-deck", 2026, "Deck")];
  const w = parseWorkspace(
    JSON.stringify({ version: 2, activeId: c.id, companies: [c] }),
  );
  const copy = cloneCompany(w.companies[0]);
  copy.driverPay![0].legs[0].miles = 100;
  assert.equal(c.driverPay[0].legs[0].miles, 0);
  assert.equal(copy.plans[0].composite!.parts[0].policy!.kind, "pool");
});
test("employer-cost estimates round per plan so exported rows reconcile to the total", () => {
  const c = newCompany();
  c.period = "Annual";
  c.plans = [bulkTemplate("A"), bulkTemplate("B")];
  for (const p of c.plans) {
    p.composite!.parts = p.composite!.parts.slice(1);
    const part = p.composite!.parts[0];
    part.tiers = [{ id: "x", at: 100, payout: 0.05 }];
    part.cap = 0.05;
  }
  const r = executiveTotal(c, 2026);
  assert.equal(r.incentive, 0.1);
  assert.equal(r.loaded, 0.12);
  assert.equal(
    r.divisions.reduce((s, d) => s + d.loaded, 0),
    0.12,
  );
});
