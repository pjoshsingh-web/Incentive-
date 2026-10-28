import type { Company, Plan } from "./workspace";
import type { PayoutPart } from "./composite";
import { newPart } from "./composite";
export type ProfitPool = {
  id: string;
  name: string;
  quarterlyProfit: number;
  targetProfit: number;
  bands: { id: string; from: number; rate: number }[];
  confirmed: boolean;
};
export type PoolKPI = {
  id: string;
  name: string;
  target: number;
  actual: number;
  weight: number;
  direction: "higher" | "lower";
};
export type PartPolicy =
  | {
      kind: "kar";
      newBusinessPercent: number;
      existingRate: number;
      newRate: number;
      businessAgeMonths: number;
      newRateMonths: number;
      proration: "attainment" | "threshold";
    }
  | {
      kind: "pool";
      poolId: string;
      role: "coordinator" | "tracker";
      level: 1 | 2 | 3;
      shares: (number | null)[];
      maxShare: number;
      kpis: PoolKPI[];
      confirmed: boolean;
      pool?: ProfitPool;
    }
  | { kind: "quarterly-weekly"; quarterWeeks: number[]; quarterCap: number };
const uid = () => globalThis.crypto.randomUUID();
export const comparisonTemplates = [
  {
    key: "logistics-kar",
    name: "Logistics & Brokerage — KAR",
    division: "Logistics & Brokerage",
    role: "KAR",
    description:
      "Monthly revenue. 1% existing business, 2% personally sourced new business for the first 12 months.",
    example: "$200,000 → $2,000 existing or $4,000 new",
  },
  {
    key: "logistics-coordinator",
    name: "Logistics — Coordinator",
    division: "Logistics",
    role: "Coordinator",
    description:
      "A share of a quarterly gross-profit pool, based on Level 1, 2 or 3. Pool bands and missing shares need your rules.",
    example: "$1M GP × 1.05% × 14% → $1,470 / quarter",
  },
  {
    key: "logistics-tracker",
    name: "Logistics — Tracker",
    division: "Logistics",
    role: "Tracker",
    description:
      "Two call-in KPIs determine a share up to 6% of the same quarterly pool. KPI rules need your confirmation.",
    example: "$10,500 pool × 6% → $630 / quarter",
  },
  {
    key: "deck-kar",
    name: "Deck — KAR",
    division: "Deck",
    role: "KAR",
    description:
      "0.10% commission on monthly revenue, from the first dollar. No stated cap.",
    example: "$500,000 × 0.10% → $500 / month",
  },
  {
    key: "deck-kac",
    name: "Deck — Key Account Coordinator",
    division: "Deck",
    role: "Key Account Coordinator",
    description:
      "0.05% commission on monthly supported-book revenue. No stated cap.",
    example: "$500,000 × 0.05% → $250 / month",
  },
  {
    key: "projects-lead",
    name: "Projects — Project Lead",
    division: "Projects",
    role: "Project Lead",
    description:
      "0.10% of project revenue delivered within the quarter. No stated cap.",
    example: "$1,000,000 × 0.10% → $1,000 / quarter",
  },
  {
    key: "projects-coordinator",
    name: "Projects — Project Coordinator",
    division: "Projects",
    role: "Project Coordinator",
    description: "0.075% of annual divisional project revenue. No stated cap.",
    example: "$25,000,000 × 0.075% → $18,750 / year",
  },
  {
    key: "bulk-sales",
    name: "Bulk — Sales Team",
    division: "Bulk",
    role: "Sales Team",
    description:
      "$100 per truck per week at $5,000 RWT, capped at $1,200 per quarter. Separate from the earlier two-part Bulk plan.",
    example: "$5,000 RWT → $100 / week; $4,800 annual cap",
  },
  {
    key: "operations",
    name: "Operations — RWT",
    division: "Operations",
    role: "Operations / Dispatch",
    description:
      "$50 at $4,700 RWT, $100 at $4,900, then $20 more per additional $200, capped at $200 / week.",
    example: "$5,500 RWT → $160 / truck / week",
  },
] as const;
export type ComparisonKey = (typeof comparisonTemplates)[number]["key"];
export function poolRate(pool: ProfitPool, profit: number) {
  return (
    [...pool.bands]
      .sort((a, b) => a.from - b.from)
      .filter((b) => profit >= b.from)
      .at(-1)?.rate ?? 0
  );
}
export function poolFunding(pool: ProfitPool) {
  return (pool.quarterlyProfit * poolRate(pool, pool.quarterlyProfit)) / 100;
}
export function policyErrors(part: PayoutPart): string[] {
  const policy = part.policy;
  if (!policy) return [];
  const errors: string[] = [];
  if (part.direction !== "higher")
    errors.push(
      "Comparison chart rules use higher revenue / performance. Switch to a custom rule for lower-is-better payouts.",
    );
  const nonnegative = (n: number) => Number.isFinite(n) && n >= 0;
  if (policy.kind === "kar") {
    if (part.frequency !== "Monthly")
      errors.push(
        "The KAR commission rule uses monthly revenue and new-business age in months.",
      );
    if (
      ![
        policy.newBusinessPercent,
        policy.existingRate,
        policy.newRate,
        policy.businessAgeMonths,
        policy.newRateMonths,
      ].every(nonnegative) ||
      policy.newBusinessPercent > 100 ||
      part.target <= 0 ||
      part.threshold > 100
    )
      errors.push(
        part.name +
          ": check the business mix, commission rates and revenue target.",
      );
  }
  if (policy.kind === "quarterly-weekly") {
    if (
      policy.quarterWeeks.length !== 4 ||
      policy.quarterWeeks.some(
        (v) => !Number.isInteger(v) || v < 0 || v > 14,
      ) ||
      policy.quarterWeeks.reduce((s, v) => s + v, 0) !== part.periods ||
      !nonnegative(policy.quarterCap) ||
      part.frequency !== "Weekly"
    )
      errors.push(
        part.name +
          ": weekly counts must match the four quarters (0–14 weeks each).",
      );
  }
  if (policy.kind === "pool") {
    const pool = policy.pool;
    if (part.entries !== null)
      errors.push(
        "Linked Logistics pool plans use the shared quarterly GP. Separate period results are not supported for this linked pool.",
      );
    if (!pool || !pool.confirmed)
      errors.push(
        "Confirm the Logistics gross-profit pool rules before calculating this plan.",
      );
    if (!policy.confirmed)
      errors.push(
        "Confirm this role’s pool share and KPI rules before including it.",
      );
    if (part.frequency !== "Quarterly")
      errors.push("The Logistics pool uses quarterly payments.");
    if (
      !policy.shares.every((v) => v === null || (nonnegative(v) && v <= 100)) ||
      !nonnegative(policy.maxShare) ||
      policy.maxShare > 100
    )
      errors.push("Pool shares must be from 0 to 100%.");
    if (
      policy.role === "coordinator" &&
      policy.shares[policy.level - 1] === null
    )
      errors.push("Enter the share for the selected coordinator level.");
    if (
      policy.role === "tracker" &&
      (!policy.kpis.length ||
        Math.abs(policy.kpis.reduce((s, k) => s + k.weight, 0) - 100) > 0.001 ||
        policy.kpis.some(
          (k) =>
            !k.name.trim() ||
            !nonnegative(k.actual) ||
            !nonnegative(k.weight) ||
            !nonnegative(k.target) ||
            k.target === 0,
        ))
    )
      errors.push(
        "Tracker KPI targets must be positive and shares must total 100%.",
      );
    if (
      pool &&
      (!pool.bands.length ||
        new Set(pool.bands.map((b) => b.from)).size !== pool.bands.length)
    )
      errors.push("Pool bands need unique starting values.");
  }
  return errors;
}
export function policyPayment(part: PayoutPart, actual: number) {
  const p = part.policy!;
  if (p.kind === "kar") {
    const newRate =
      p.businessAgeMonths < p.newRateMonths ? p.newRate : p.existingRate;
    const rate =
      (p.existingRate * (100 - p.newBusinessPercent) +
        newRate * p.newBusinessPercent) /
      100;
    const achievement = actual / part.target;
    const factor =
      achievement * 100 >= part.threshold
        ? 1
        : p.proration === "threshold"
          ? part.threshold === 0
            ? 1
            : achievement / (part.threshold / 100)
          : achievement;
    return ((actual * rate) / 100) * factor;
  }
  if (p.kind === "quarterly-weekly")
    return actual >= part.target ? part.targetPayout : 0;
  const pool = p.pool!;
  const funding = (actual * poolRate(pool, actual)) / 100;
  const score =
    p.role === "tracker"
      ? p.kpis.reduce(
          (sum, k) =>
            sum +
            (k.weight / 100) *
              Math.min(
                1,
                k.direction === "higher"
                  ? k.actual / k.target
                  : k.actual === 0
                    ? 1
                    : k.target / k.actual,
              ),
          0,
        )
      : 1;
  return (
    (funding *
      (p.role === "coordinator"
        ? (p.shares[p.level - 1] ?? 0)
        : p.maxShare * score)) /
    100
  );
}
export function resolvePoolParts(c: Company, p: Plan): Plan {
  return {
    ...p,
    reportingPeriod: c.period,
    composite: p.composite
      ? {
          ...p.composite,
          parts: p.composite.parts.map((part) => {
            if (part.policy?.kind !== "pool") return part;
            const policy = part.policy;
            const pool = c.incentivePools?.find((v) => v.id === policy.poolId);
            return {
              ...part,
              actual: pool?.quarterlyProfit ?? part.actual,
              target: pool?.targetProfit ?? part.target,
              policy: { ...part.policy, pool },
            };
          }),
        }
      : undefined,
  };
}
export function makeComparison(
  key: ComparisonKey,
  company: Company,
): { plan: Plan; pool?: ProfitPool } {
  const item = comparisonTemplates.find((v) => v.key === key)!;
  const division =
    company.departments.find(
      (d) => d.name.toLowerCase() === item.division.toLowerCase(),
    )?.name || item.division;
  const part = newPart();
  Object.assign(part, {
    name: item.name,
    measure: "Revenue",
    unit: "$",
    method: "rate",
    frequency: "Monthly",
    periods: 12,
    target: 500000,
    actual: 500000,
    startAt: 0,
    rate: 0.001,
    cap: null,
    allowUncapped: true,
    displayAsPercent: true,
  });
  let pool: ProfitPool | undefined;
  if (key === "logistics-kar") {
    Object.assign(part, {
      measure: "Monthly revenue",
      target: 200000,
      actual: 200000,
      threshold: 80,
      policy: {
        kind: "kar",
        newBusinessPercent: 0,
        existingRate: 1,
        newRate: 2,
        businessAgeMonths: 0,
        newRateMonths: 12,
        proration: "attainment",
      },
    });
  } else if (key === "logistics-coordinator" || key === "logistics-tracker") {
    pool = company.incentivePools?.find(
      (p) => p.name === "Logistics quarterly pool",
    ) ?? {
      id: uid(),
      name: "Logistics quarterly pool",
      quarterlyProfit: 1000000,
      targetProfit: 1000000,
      bands: [{ id: uid(), from: 0, rate: 1.05 }],
      confirmed: false,
    };
    Object.assign(part, {
      measure: "Quarterly Logistics gross profit",
      frequency: "Quarterly",
      periods: 4,
      target: pool.targetProfit,
      actual: pool.quarterlyProfit,
      policy: {
        kind: "pool",
        poolId: pool.id,
        role: key === "logistics-coordinator" ? "coordinator" : "tracker",
        level: 2,
        shares: [null, 14, null],
        maxShare: 6,
        kpis: [
          {
            id: uid(),
            name: "Call-in completion",
            target: 100,
            actual: 100,
            weight: 50,
            direction: "higher",
          },
          {
            id: uid(),
            name: "Call-ins per order",
            target: 1,
            actual: 1,
            weight: 50,
            direction: "higher",
          },
        ],
        confirmed: false,
      },
    });
  } else if (key === "deck-kac") part.rate = 0.0005;
  else if (key === "projects-lead")
    Object.assign(part, {
      measure: "Project revenue delivered within the quarter",
      frequency: "Quarterly",
      periods: 4,
      target: 1000000,
      actual: 1000000,
    });
  else if (key === "projects-coordinator")
    Object.assign(part, {
      measure: "Annual divisional project revenue",
      frequency: "Annual",
      periods: 1,
      target: 25000000,
      actual: 25000000,
      rate: 0.00075,
    });
  else if (key === "bulk-sales")
    Object.assign(part, {
      measure: "Revenue per week per truck (RWT)",
      frequency: "Weekly",
      periods: 52,
      target: 5000,
      actual: 5000,
      method: "goal",
      targetPayout: 100,
      cap: 100,
      allowUncapped: false,
      policy: {
        kind: "quarterly-weekly",
        quarterWeeks: [13, 13, 13, 13],
        quarterCap: 1200,
      },
    });
  else if (key === "operations")
    Object.assign(part, {
      measure: "Revenue per week per truck (RWT)",
      frequency: "Weekly",
      periods: 52,
      target: 5500,
      actual: 5500,
      method: "tiers",
      tiers: [
        [4700, 50],
        [4900, 100],
        [5100, 120],
        [5300, 140],
        [5500, 160],
        [5700, 180],
        [5900, 200],
      ].map(([at, payout]) => ({ id: uid(), at, payout })),
      cap: 200,
      allowUncapped: false,
    });
  const truck = key === "bulk-sales" || key === "operations";
  return {
    pool,
    plan: {
      id: uid(),
      name: item.name,
      role: item.role,
      department: division,
      scope: "individual",
      participants: 1,
      incentive: 0,
      cap: 100,
      enabled: false,
      metrics: [],
      composite: {
        recipient: truck ? "truck" : "employee",
        purpose:
          item.description +
          " Example: " +
          item.example +
          ". Review inputs and rules before including this plan in the company total.",
        eligibility: [
          { id: uid(), label: "Eligible and in good standing", passed: true },
          {
            id: uid(),
            label: "Safety and compliance requirements met",
            passed: true,
          },
        ],
        annualCap: null,
        parts: [part],
      },
    },
  };
}
export function validPool(value: unknown): value is ProfitPool {
  if (!value || typeof value !== "object") return false;
  const p = value as ProfitPool;
  const num = (n: unknown) =>
    typeof n === "number" && Number.isFinite(n) && n >= 0;
  return (
    typeof p.id === "string" &&
    typeof p.name === "string" &&
    num(p.quarterlyProfit) &&
    num(p.targetProfit) &&
    typeof p.confirmed === "boolean" &&
    Array.isArray(p.bands) &&
    new Set(p.bands.map((b) => b.id)).size === p.bands.length &&
    p.bands.every(
      (b) =>
        typeof b.id === "string" && num(b.from) && num(b.rate) && b.rate <= 100,
    )
  );
}
export function validPolicy(value: unknown): value is PartPolicy {
  if (!value || typeof value !== "object") return false;
  const p = value as PartPolicy;
  const num = (n: unknown) =>
    typeof n === "number" && Number.isFinite(n) && n >= 0;
  if (p.kind === "kar")
    return (
      [
        p.newBusinessPercent,
        p.existingRate,
        p.newRate,
        p.businessAgeMonths,
        p.newRateMonths,
      ].every(num) &&
      p.newBusinessPercent <= 100 &&
      ["attainment", "threshold"].includes(p.proration)
    );
  if (p.kind === "quarterly-weekly")
    return (
      Array.isArray(p.quarterWeeks) &&
      p.quarterWeeks.every(num) &&
      num(p.quarterCap)
    );
  if (p.kind === "pool")
    return (
      (p.pool === undefined || validPool(p.pool)) &&
      typeof p.poolId === "string" &&
      ["coordinator", "tracker"].includes(p.role) &&
      [1, 2, 3].includes(p.level) &&
      typeof p.confirmed === "boolean" &&
      Array.isArray(p.shares) &&
      p.shares.length === 3 &&
      p.shares.every((s) => s === null || (num(s) && s <= 100)) &&
      num(p.maxShare) &&
      p.maxShare <= 100 &&
      Array.isArray(p.kpis) &&
      p.kpis.every(
        (k) =>
          typeof k.id === "string" &&
          typeof k.name === "string" &&
          [k.target, k.actual, k.weight].every(num) &&
          ["higher", "lower"].includes(k.direction),
      )
    );
  return false;
}
