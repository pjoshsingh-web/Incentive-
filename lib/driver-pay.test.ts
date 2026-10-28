import { test } from "node:test";
import assert from "node:assert/strict";
import {
  newDriverRecord,
  driverResult,
  loyaltyRate,
  dimensionChoices,
} from "./driver-pay";
function ready(pkg: Parameters<typeof newDriverRecord>[0] = "canadian-deck") {
  const p = newDriverRecord(pkg, 2026, "Deck");
  p.reviewed = true;
  return p;
}
test("2026 Canadian and International base rates apply to the correct miles", () => {
  for (const [pkg, base] of [
    ["canadian-deck", 960],
    ["international-deck", 1010],
    ["us-heavy-haul", 1010],
  ] as const) {
    const p = ready(pkg);
    p.legs.forEach((l) => (l.miles = 1000));
    const r = driverResult(p);
    assert.deepEqual(r.errors, []);
    assert.equal(r.regularPay, base);
    assert.equal(r.incentivePay, 0);
  }
});
test("safety/skill/loyalty bonuses are separate and apply to loaded and empty miles", () => {
  const p = ready();
  p.legs.forEach((l) => (l.miles = 1000));
  p.safetyEligible = true;
  p.safetyLevel = 4;
  p.skillActive = true;
  p.skillLevel = 5;
  p.serviceMonths = 120;
  p.trailingMiles = 125000;
  const r = driverResult(p);
  assert.equal(r.regularPay, 960);
  assert.equal(r.incentivePay, 240);
  assert.equal(r.totalPay, 1200);
  assert.equal(r.loyaltyRate, 0.04);
});
test("loyalty mileage exception and exact service/mileage boundaries are capped at 4 cents", () => {
  assert.equal(loyaltyRate(5, 150000), 0);
  assert.equal(loyaltyRate(6, 0), 0.01);
  assert.equal(loyaltyRate(23, 0), 0.01);
  assert.equal(loyaltyRate(24, 89999), 0);
  assert.equal(loyaltyRate(24, 90000), 0.01);
  assert.equal(loyaltyRate(24, 105000), 0.02);
  assert.equal(loyaltyRate(60, 125000), 0.033);
  assert.equal(loyaltyRate(120, 125000), 0.04);
});
test("combined dimensions replace separate width+height, and Deck RGN excludes length", () => {
  const p = ready("international-deck");
  const l = p.legs[0];
  l.miles = 1000;
  l.dimension = "c15-2";
  l.length = "l95";
  l.trailer = "rgn7";
  const r = driverResult(p);
  assert.equal(r.regularPay, 530 + 190 + 270);
  assert.equal(r.premiums, 460);
});
test("Heavy Haul uses detailed rates, and requires review of conflicting 13-axle summary", () => {
  const p = ready("us-heavy-haul");
  const l = p.legs[0];
  l.miles = 1000;
  l.trailer = "rgn13";
  l.length = "hh145";
  assert.ok(driverResult(p).errors.length);
  p.detailedTrailerReviewed = true;
  assert.equal(driverResult(p).regularPay, 530 + 1130 + 850);
});
test("loaded-only premiums are rejected on empty miles", () => {
  const p = ready();
  p.legs[1].miles = 100;
  p.legs[1].dimension = "w0";
  assert.ok(driverResult(p).errors.some((e) => e.includes("empty miles")));
});
test("2021 RGN keeps distinct 73-cent loaded rate, safety ranks and older combined bands", () => {
  const p = ready("regional-rgn-2021");
  p.legs[0].miles = 1000;
  p.legs[0].dimension = "c15-2";
  p.safetyEligible = true;
  p.safetyLevel = 3;
  p.skillActive = true;
  p.skillLevel = 5;
  const r = driverResult(p);
  assert.equal(r.regularPay, 890);
  assert.equal(r.incentivePay, 10);
  assert.equal(
    dimensionChoices("canadian-deck").find((v) => v.id === "c15-2")!.rate,
    0.19,
  );
});
test("Bulk removes FSC and keeps quarterly and full-year safety awards separate", () => {
  const p = ready("bulk-2023");
  p.bulkRate = 22;
  p.bulkQuarters.forEach((q) => {
    q.gross = 100000;
    q.fsc = 10000;
    q.safe = true;
  });
  let r = driverResult(p);
  assert.equal(r.regularPay, 79200);
  assert.equal(r.incentivePay, 3600);
  p.fullCalendarYear = true;
  p.annualSafety = true;
  r = driverResult(p);
  assert.equal(r.incentivePay, 7200);
  assert.equal(r.totalPay, 86400);
  p.bulkQuarters[0].safe = false;
  assert.ok(driverResult(p).errors.length);
});
test("Bulk NH3 hourly rates require approved input rather than an invented package rate", () => {
  const p = ready("bulk-2023");
  p.bulkHourly = true;
  p.hourlyHours = 100;
  assert.ok(driverResult(p).errors.length);
  p.hourlyRate = 30;
  p.hourlyApproved = true;
  assert.equal(driverResult(p).regularPay, 3000);
});
test("approved regular extras do not enter incentive totals", () => {
  const p = ready();
  p.extras[0].quantity = 2;
  assert.ok(driverResult(p).errors.length);
  p.extras[0].approved = true;
  assert.equal(driverResult(p).regularPay, 200);
  assert.equal(driverResult(p).incentivePay, 0);
  p.extras[0].kind = "incentive";
  assert.equal(driverResult(p).incentivePay, 200);
});
test("orientation is one-time in 2026 and legacy 31-day eligibility is explicit", () => {
  const p = ready();
  const orientation = p.extras.find((e) => e.name.startsWith("Orientation"))!;
  orientation.quantity = 2;
  orientation.approved = true;
  assert.ok(driverResult(p).errors.length);
  const old = ready("regional-rgn-2021");
  const item = old.extras.find((e) => e.name.startsWith("Orientation"))!;
  item.quantity = 1;
  item.approved = true;
  old.continuousServiceDays = 30;
  assert.ok(driverResult(old).errors.length);
  old.continuousServiceDays = 31;
  assert.equal(driverResult(old).regularPay, 100);
});
test("renaming an orientation item does not remove its one-time source restriction", () => {
  const p = ready();
  const item = p.extras.find((e) => e.name.startsWith("Orientation"))!;
  item.name = "Training completed";
  item.quantity = 2;
  item.approved = true;
  assert.ok(driverResult(p).errors.some((e) => e.includes("one-time")));
});
