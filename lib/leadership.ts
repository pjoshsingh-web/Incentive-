import { calculatePlan, type Metric, type Plan } from "./workspace";
export type AnnualGoal = Omit<Metric, "source" | "sourceId"> & {
  level: "company" | "division" | "individual";
};
export type SavedEstimate = {
  id: string;
  name: string;
  results: Record<string, number>;
};
export type LeadershipPlan = {
  includeInCompanyTotal?: boolean;
  id: string;
  name: string;
  role: string;
  division: string;
  year: number;
  salary: number;
  bonusPercent: number;
  eligiblePercent: number;
  cap: number;
  goals: AnnualGoal[];
  estimates: SavedEstimate[];
  adjustment: {
    multiplier: number;
    role: "" | "CEO" | "CFO";
    name: string;
    reason: string;
    recorded: boolean;
  };
};
const uid = () => globalThis.crypto.randomUUID();
export function newAnnualGoal(
  name = "Personal goal",
  level: AnnualGoal["level"] = "individual",
  target = 100,
  unit = "%",
  weight = 0,
): AnnualGoal {
  return {
    id: uid(),
    name,
    level,
    unit,
    direction: "higher",
    weight,
    target,
    actual: target,
    threshold: 80,
    cap: 100,
    accelerator: 1,
    gate: false,
  };
}
export function newLeadershipPlan(
  year: number,
  division: string,
): LeadershipPlan {
  return {
    id: uid(),
    name: "Director example",
    role: "Director",
    division,
    year,
    salary: 150000,
    bonusPercent: 30,
    eligiblePercent: 100,
    cap: 200,
    goals: [
      newAnnualGoal("Annual company revenue", "company", 12000000, "$", 40),
      newAnnualGoal("Company gross margin", "company", 25, "%", 20),
      newAnnualGoal(
        "Annual division gross profit",
        "division",
        1500000,
        "$",
        25,
      ),
      newAnnualGoal("Personal goals completed", "individual", 100, "%", 15),
    ],
    estimates: [],
    adjustment: {
      multiplier: 1,
      role: "",
      name: "",
      reason: "",
      recorded: false,
    },
  };
}
export function annualErrors(p: LeadershipPlan): string[] {
  const errors: string[] = [];
  if (!p.name.trim() || !p.role.trim())
    errors.push("Enter a person or plan name and a job title.");
  if (!Number.isInteger(p.year) || p.year < 2000 || p.year > 2200)
    errors.push("Choose a year from 2000 to 2200.");
  if (
    ![p.salary, p.bonusPercent, p.eligiblePercent, p.cap].every(
      (v) => Number.isFinite(v) && v >= 0,
    ) ||
    p.eligiblePercent > 100
  )
    errors.push(
      "Use amounts of zero or more and a bonus eligibility from 0 to 100%.",
    );
  if (p.bonusPercent < 20 || p.bonusPercent > 40)
    errors.push("Choose a normal bonus from 20% to 40% of base salary.");
  if (!Number.isFinite(p.adjustment.multiplier) || p.adjustment.multiplier < 1)
    errors.push("The CEO/CFO multiplier must be 1 or more.");
  if (
    p.adjustment.recorded &&
    (!["CEO", "CFO"].includes(p.adjustment.role) ||
      !p.adjustment.name.trim() ||
      !p.adjustment.reason.trim())
  )
    errors.push(
      "Record the CEO/CFO name and reason before applying the accelerator.",
    );
  return errors;
}
export function annualResult(
  p: LeadershipPlan,
  results?: Record<string, number>,
) {
  const errors = annualErrors(p);
  const missing = results
    ? p.goals
        .filter((g) => !Number.isFinite(results[g.id]))
        .map((g) => "Add a saved result for " + g.name + ".")
    : [];
  const targetBonus =
    Math.round(
      ((((p.salary * p.bonusPercent) / 100) * p.eligiblePercent) / 100) * 100,
    ) / 100;
  const plan: Plan = {
    id: p.id,
    name: p.name,
    department: p.division || "Company-wide",
    role: p.role,
    scope: "individual",
    participants: 1,
    incentive: targetBonus,
    cap: 100,
    enabled: true,
    metrics: p.goals.map((g) => ({
      ...g,
      cap: Math.min(g.cap, 100),
      accelerator: 1,
      actual:
        results && Number.isFinite(results[g.id]) ? results[g.id] : g.actual,
      source: "manual",
    })),
  };
  const calculated = calculatePlan(plan);
  const allErrors = [...errors, ...missing, ...calculated.errors];
  const multiplier = p.adjustment.recorded ? p.adjustment.multiplier : 1;
  const limit = (targetBonus * p.cap) / 100;
  const adjust = (amount: number) =>
    Math.round(Math.min(amount * multiplier, limit) * 100) / 100;
  const bonus = allErrors.length ? 0 : adjust(calculated.payout);
  const atGoal = calculatePlan({
    ...plan,
    metrics: plan.metrics.map((m) => ({ ...m, actual: m.target })),
  }).payout;
  return {
    ...calculated,
    errors: allErrors,
    payout: bonus,
    bonus,
    targetBonus,
    totalCash: Math.round((p.salary + bonus) * 100) / 100,
    atGoal: adjust(atGoal),
    performanceBonus: calculated.payout,
    appliedMultiplier: multiplier,
    policyCeiling: Math.round(limit * 100) / 100,
    adjustmentAmount: bonus - calculated.payout,
    maximum: allErrors.length ? 0 : adjust(calculated.maximum),
    maximumCash: allErrors.length
      ? 0
      : Math.round((p.salary + adjust(calculated.maximum)) * 100) / 100,
  };
}
export function splitAnnualShares(goals: AnnualGoal[]): AnnualGoal[] {
  let index = 0;
  const count = goals.filter((g) => !g.gate).length;
  return goals.map((g) =>
    g.gate
      ? { ...g, weight: 0 }
      : {
          ...g,
          weight:
            ++index === count
              ? 100 - Math.floor(100 / count) * (count - 1)
              : Math.floor(100 / count),
        },
  );
}
export function validLeadershipPlan(value: unknown): value is LeadershipPlan {
  if (!value || typeof value !== "object") return false;
  const p = value as LeadershipPlan;
  const num = (v: unknown) =>
    typeof v === "number" && Number.isFinite(v) && v >= 0;
  const text = (v: unknown) => typeof v === "string";
  return (
    (p.includeInCompanyTotal === undefined ||
      typeof p.includeInCompanyTotal === "boolean") &&
    text(p.id) &&
    text(p.name) &&
    text(p.role) &&
    text(p.division) &&
    [p.year, p.salary, p.bonusPercent, p.eligiblePercent, p.cap].every(num) &&
    p.eligiblePercent <= 100 &&
    !!p.adjustment &&
    num(p.adjustment.multiplier) &&
    p.adjustment.multiplier >= 1 &&
    ["", "CEO", "CFO"].includes(p.adjustment.role) &&
    text(p.adjustment.name) &&
    text(p.adjustment.reason) &&
    typeof p.adjustment.recorded === "boolean" &&
    Array.isArray(p.goals) &&
    new Set(p.goals.map((g) => g.id)).size === p.goals.length &&
    p.goals.every(
      (g) =>
        text(g.id) &&
        text(g.name) &&
        text(g.unit) &&
        ["company", "division", "individual"].includes(g.level) &&
        ["higher", "lower"].includes(g.direction) &&
        typeof g.gate === "boolean" &&
        [g.weight, g.target, g.actual, g.threshold, g.cap, g.accelerator].every(
          num,
        ),
    ) &&
    Array.isArray(p.estimates) &&
    new Set(p.estimates.map((e) => e.id)).size === p.estimates.length &&
    p.estimates.every(
      (e) =>
        text(e.id) &&
        text(e.name) &&
        !!e.results &&
        typeof e.results === "object" &&
        !Array.isArray(e.results) &&
        Object.values(e.results).every(num),
    )
  );
}
