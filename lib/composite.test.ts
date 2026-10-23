import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bulkTemplate,
  compositeResult,
  newPart,
  partPayment,
} from "./composite";
import {
  calculatePlan,
  cloneCompany,
  companyTotals,
  newCompany,
  parseWorkspace,
  resolvedPlan,
  sampleWorkspace,
} from "./workspace";
test("Bulk example reproduces $5,200 weekly annualized + $2,500 annual = $7,700", () => {
  const p = bulkTemplate("Bulk");
  const r = compositeResult(p);
  assert.equal(r.parts[0].perPeriod, 100);
  assert.equal(r.parts[0].annual, 5200);
  assert.equal(r.parts[1].annual, 2500);
  assert.equal(r.annualPayout, 7700);
  assert.equal(r.annualMaximum, 18400);
  assert.equal(r.annualTarget, 7700);
});
test("weekly table uses exact boundaries, floors between levels, and caps at $200", () => {
  const part = bulkTemplate("Bulk").composite!.parts[0];
  for (const [actual, payout] of [
    [4599.99, 0],
    [4600, 40],
    [4700, 40],
    [4800, 60],
    [4999.99, 60],
    [5000, 100],
    [5200, 120],
    [5400, 140],
    [5600, 160],
    [5800, 180],
    [6000, 200],
    [9000, 200],
  ])
    assert.equal(partPayment(part, actual).amount, payout);
});
test("annual profitability table matches each tier and $8,000 maximum", () => {
  const part = bulkTemplate("Bulk").composite!.parts[1];
  for (const [actual, payout] of [
    [99.99, 0],
    [100, 2500],
    [104.99, 2500],
    [105, 4000],
    [110, 6000],
    [119, 6000],
    [120, 8000],
    [200, 8000],
  ])
    assert.equal(partPayment(part, actual).amount, payout);
});
test("recipient modes and shared parts do not double-count pools", () => {
  const p = bulkTemplate("Bulk");
  p.participants = 3;
  assert.equal(compositeResult(p).annualPayout, 23100);
  p.composite!.recipient = "truck";
  assert.equal(compositeResult(p).annualPayout, 23100);
  p.composite!.parts[1].basis = "shared";
  assert.equal(compositeResult(p).annualPayout, 18100);
  p.composite!.recipient = "team";
  assert.equal(compositeResult(p).annualPayout, 7700);
});
test("company results use explicit period budget equivalents rather than mixing annual with monthly", () => {
  const c = newCompany();
  c.plans = [bulkTemplate("Fleet operations")];
  assert.equal(calculatePlan(resolvedPlan(c, c.plans[0])).payout, 641.67);
  assert.equal(companyTotals(c).payout, 641.67);
  c.period = "Quarterly";
  assert.equal(companyTotals(c).payout, 1925);
  c.period = "Annual";
  assert.equal(companyTotals(c).payout, 7700);
});
test("eligibility stops all payments; plan disable stops payment without losing ceiling", () => {
  const p = bulkTemplate("Bulk");
  p.composite!.eligibility[0].passed = false;
  assert.equal(compositeResult(p).annualPayout, 0);
  assert.equal(compositeResult(p).annualMaximum, 18400);
  p.composite!.eligibility[0].passed = true;
  p.enabled = false;
  assert.equal(compositeResult(p).annualPayout, 0);
});
test("per-part conditions and dependencies block only the affected part", () => {
  const p = bulkTemplate("Bulk");
  const [weekly, annual] = p.composite!.parts;
  annual.gates = [
    {
      id: "gate",
      name: "Margin",
      actual: 19,
      target: 20,
      comparison: "at-least",
    },
  ];
  assert.equal(compositeResult(p).annualPayout, 5200);
  annual.gates = [];
  annual.requires = [weekly.id];
  weekly.actual = 4500;
  assert.equal(compositeResult(p).annualPayout, 0);
});
test("cyclic and missing dependencies block calculation safely", () => {
  const p = bulkTemplate("Bulk");
  const [a, b] = p.composite!.parts;
  a.requires = [b.id];
  b.requires = [a.id];
  assert.ok(compositeResult(p).errors.some((e) => e.includes("loop")));
  assert.equal(compositeResult(p).annualPayout, 0);
  b.requires = [];
  a.requires = ["removed"];
  assert.ok(compositeResult(p).errors.length);
});
test("individual weekly results calculate each tier before summing, not the annual average", () => {
  const p = bulkTemplate("Bulk");
  const [weekly, annual] = p.composite!.parts;
  weekly.periods = 2;
  weekly.entries = [4600, 5000];
  annual.actual = 90;
  assert.equal(compositeResult(p).annualPayout, 140);
  assert.notEqual(
    compositeResult(p).annualPayout,
    partPayment(weekly, 4800).amount * 2,
  );
  weekly.entries = [4600];
  assert.ok(compositeResult(p).errors.some((e) => e.includes("exactly 2")));
});
test("linear interpolation is opt-in and lower-is-better tables select the correct row", () => {
  const part = bulkTemplate("Bulk").composite!.parts[0];
  part.interpolation = "linear";
  assert.equal(partPayment(part, 4700).amount, 50);
  assert.equal(partPayment(part, 4900).amount, 80);
  part.direction = "lower";
  part.interpolation = "step";
  part.tiers = [
    { id: "low", at: 10, payout: 200 },
    { id: "mid", at: 20, payout: 100 },
  ];
  assert.equal(partPayment(part, 9).amount, 200);
  assert.equal(partPayment(part, 15).amount, 100);
  assert.equal(partPayment(part, 21).amount, 0);
});
test("rate and goal parts obey per-payment and whole-plan caps", () => {
  const p = bulkTemplate("Bulk");
  const part = newPart();
  part.method = "rate";
  part.actual = 200;
  part.startAt = 100;
  part.rate = 2;
  part.cap = 150;
  p.composite!.parts = [part];
  assert.equal(compositeResult(p).annualPayout, 150);
  part.direction = "lower";
  part.actual = 80;
  assert.equal(compositeResult(p).annualPayout, 40);
  part.method = "goal";
  part.target = 100;
  part.actual = 0;
  part.accelerator = 0;
  part.targetPayout = 100;
  part.cap = 200;
  assert.equal(compositeResult(p).annualPayout, 100);
  part.targetPayout = 0;
  assert.equal(compositeResult(p).annualPayout, 0);
  p.composite!.parts = bulkTemplate("Bulk").composite!.parts;
  p.composite!.annualCap = 6000;
  assert.equal(compositeResult(p).annualPayout, 6000);
  assert.equal(compositeResult(p).annualMaximum, 6000);
});
test("rounds per-payment cents before annualization; zero payment counts work", () => {
  const p = bulkTemplate("Bulk");
  const a = p.composite!.parts[0];
  p.composite!.parts = [a];
  a.method = "rate";
  a.startAt = 0;
  a.rate = 0.01;
  a.actual = 1.4;
  a.periods = 52;
  a.cap = 200;
  assert.equal(compositeResult(p).annualPayout, 0.52);
  a.periods = 0;
  assert.equal(compositeResult(p).annualPayout, 0);
});
test("backups preserve editable drafts and deep-copy table structures", () => {
  const w = sampleWorkspace();
  const p = bulkTemplate("Fleet operations");
  p.composite!.parts[0].tiers[1].at = 4600;
  w.companies[0].plans.push(p);
  const loaded = parseWorkspace(JSON.stringify(w));
  assert.ok(compositeResult(loaded.companies[0].plans.at(-1)!).errors.length);
  const copy = cloneCompany(loaded.companies[0]);
  copy.plans.at(-1)!.composite!.parts[0].tiers[0].payout = 999;
  assert.equal(
    loaded.companies[0].plans.at(-1)!.composite!.parts[0].tiers[0].payout,
    40,
  );
});
test("malformed multi-part backups and unbounded non-table rules are rejected", () => {
  const w = sampleWorkspace();
  const p = bulkTemplate("Bulk");
  w.companies[0].plans = [p];
  p.composite!.parts[0].method = "rate";
  p.composite!.parts[0].cap = null;
  assert.ok(compositeResult(p).errors.length);
  (p.composite! as unknown as { recipient: string }).recipient = "unknown";
  assert.throws(() => parseWorkspace(JSON.stringify(w)));
});
test("a zero-paying prerequisite cannot create target or ceiling payments downstream", () => {
  const p = bulkTemplate("Bulk");
  const [a, b] = p.composite!.parts;
  a.cap = 0;
  b.requires = [a.id];
  const r = compositeResult(p);
  assert.equal(r.annualMaximum, 0);
  assert.equal(r.annualTarget, 0);
  assert.equal(r.annualPayout, 0);
});
