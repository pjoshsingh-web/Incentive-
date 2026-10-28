import {
  poolFunding,
  policyErrors,
  policyPayment,
  validPolicy,
  type PartPolicy,
} from "./comparison";
import type { Plan } from "./workspace";
export type PayoutTier = { id: string; at: number; payout: number };
export type PartGate = {
  id: string;
  name: string;
  actual: number;
  target: number;
  comparison: "at-least" | "at-most";
};
export type PayoutPart = {
  policy?: PartPolicy;
  allowUncapped?: boolean;
  displayAsPercent?: boolean;
  id: string;
  name: string;
  measure: string;
  unit: string;
  target: number;
  actual: number;
  direction: "higher" | "lower";
  frequency: "Weekly" | "Monthly" | "Quarterly" | "Annual";
  periods: number;
  basis: "recipient" | "shared";
  method: "tiers" | "rate" | "goal";
  tiers: PayoutTier[];
  interpolation: "step" | "linear";
  startAt: number;
  rate: number;
  targetPayout: number;
  threshold: number;
  accelerator: number;
  cap: number | null;
  gates: PartGate[];
  requires: string[];
  entries: number[] | null;
};
export type CompositePlan = {
  recipient: "employee" | "truck" | "team";
  purpose: string;
  eligibility: { id: string; label: string; passed: boolean }[];
  annualCap: number | null;
  parts: PayoutPart[];
};
export type PartResult = {
  id: string;
  perPeriod: number;
  annual: number;
  maximum: number;
  target: number;
  conditionsPassed: boolean;
  matchedTier: string | null;
};
const uid = () => globalThis.crypto.randomUUID();
const cents = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export function newPart(): PayoutPart {
  return {
    id: uid(),
    name: "New bonus part",
    measure: "Performance measure",
    unit: "%",
    target: 100,
    actual: 100,
    direction: "higher",
    frequency: "Annual",
    periods: 1,
    basis: "recipient",
    method: "tiers",
    tiers: [
      { id: uid(), at: 100, payout: 1000 },
      { id: uid(), at: 110, payout: 1500 },
    ],
    interpolation: "step",
    startAt: 0,
    rate: 1,
    targetPayout: 1000,
    threshold: 80,
    accelerator: 1,
    cap: 1500,
    gates: [],
    requires: [],
    entries: null,
  };
}
export function bulkTemplate(department: string): Plan {
  const weekly = {
    ...newPart(),
    name: "Weekly RWT incentive",
    measure: "Average weekly revenue per truck (RWT)",
    unit: "$",
    target: 5000,
    actual: 5000,
    frequency: "Weekly" as const,
    periods: 52,
    tiers: [
      [4600, 40],
      [4800, 60],
      [5000, 100],
      [5200, 120],
      [5400, 140],
      [5600, 160],
      [5800, 180],
      [6000, 200],
    ].map(([at, payout]) => ({ id: uid(), at, payout })),
    cap: 200,
  };
  const annual = {
    ...newPart(),
    name: "Annual profitability bonus",
    measure: "Bulk profitability (% of annual target)",
    unit: "% of target",
    target: 100,
    actual: 100,
    tiers: [
      [100, 2500],
      [105, 4000],
      [110, 6000],
      [120, 8000],
    ].map(([at, payout]) => ({ id: uid(), at, payout })),
    cap: 8000,
  };
  return {
    id: uid(),
    name: "Bulk Incentive Plan",
    department,
    role: "Bulk employee",
    scope: "individual",
    participants: 1,
    incentive: 0,
    cap: 100,
    enabled: true,
    metrics: [],
    reportingPeriod: "Annual",
    composite: {
      recipient: "employee",
      purpose:
        "Reward strong truck productivity and share in the profitability of the Bulk division.",
      eligibility: [
        { id: uid(), label: "Active employee in good standing", passed: true },
        {
          id: uid(),
          label: "Safety and compliance requirements met",
          passed: true,
        },
      ],
      annualCap: null,
      parts: [weekly, annual],
    },
  };
}
export function compositeErrors(p: Plan): string[] {
  const c = p.composite;
  const errors: string[] = [];
  if (!c) return ["This plan has no payment parts."];
  if (!p.name.trim() || !p.department.trim() || !p.role.trim())
    errors.push("Add a plan name, job title and division.");
  if (!Number.isInteger(p.participants) || p.participants < 1)
    errors.push("Enter a positive whole number of recipients.");
  if (!c.parts.length) errors.push("Add at least one payment part.");
  if (
    c.annualCap !== null &&
    (!Number.isFinite(c.annualCap) || c.annualCap < 0)
  )
    errors.push("The annual cap must be zero or more.");
  const ids = new Set(c.parts.map((v) => v.id));
  for (const part of c.parts) {
    const label = part.name || "Payment part";
    if (!part.name.trim() || !part.measure.trim())
      errors.push(label + ": add a name and measure.");
    if (
      ![
        part.actual,
        part.target,
        part.periods,
        part.startAt,
        part.rate,
        part.targetPayout,
        part.threshold,
        part.accelerator,
      ].every((v) => Number.isFinite(v) && v >= 0) ||
      !Number.isInteger(part.periods) ||
      part.periods >
        { Weekly: 53, Monthly: 12, Quarterly: 4, Annual: 1 }[part.frequency]
    )
      errors.push(label + ": check the nonnegative numbers and payment count.");
    if (part.cap !== null && (!Number.isFinite(part.cap) || part.cap < 0))
      errors.push(label + ": the payment cap must be zero or more.");
    if (
      part.method === "tiers" &&
      (!part.tiers.length ||
        new Set(part.tiers.map((t) => t.at)).size !== part.tiers.length ||
        part.tiers.some(
          (t) =>
            !Number.isFinite(t.at) ||
            t.at < 0 ||
            !Number.isFinite(t.payout) ||
            t.payout < 0,
        ))
    )
      errors.push(
        label + ": add unique, nonnegative table levels and payments.",
      );
    if (part.method === "goal" && (part.target <= 0 || part.threshold > 100))
      errors.push(
        label + ": use a goal above zero and a starting level from 0 to 100%.",
      );
    if (part.method !== "tiers" && part.cap === null && !part.allowUncapped)
      errors.push(
        label +
          ": set a payment cap for rate or goal rules so maximum exposure is known.",
      );
    errors.push(...policyErrors(part));
    if (
      part.gates.some(
        (g) =>
          !g.name.trim() ||
          ![g.actual, g.target].every((v) => Number.isFinite(v) && v >= 0),
      )
    )
      errors.push(label + ": check the required goal.");
    if (part.requires.some((v) => !ids.has(v) || v === part.id))
      errors.push(label + ": choose valid different required parts.");
    if (
      part.entries !== null &&
      (part.entries.length !== part.periods ||
        part.entries.some((v) => !Number.isFinite(v) || v < 0))
    )
      errors.push(
        label + ": enter exactly " + part.periods + " individual results.",
      );
  }
  const visiting = new Set<string>(),
    visited = new Set<string>();
  const visit = (part: PayoutPart) => {
    if (visiting.has(part.id)) {
      errors.push(
        "Required parts form a loop. Remove the circular requirement.",
      );
      return;
    }
    if (visited.has(part.id)) return;
    visiting.add(part.id);
    for (const ref of part.requires) {
      const other = c.parts.find((v) => v.id === ref);
      if (other) visit(other);
    }
    visiting.delete(part.id);
    visited.add(part.id);
  };
  c.parts.forEach(visit);
  return [...new Set(errors)];
}
export function tablePayout(
  part: PayoutPart,
  actual: number,
): { amount: number; tier: string | null } {
  const rows = [...part.tiers].sort((a, b) => a.at - b.at);
  if (!rows.length) return { amount: 0, tier: null };
  const eligible =
    part.direction === "higher"
      ? rows.filter((t) => actual >= t.at)
      : rows.filter((t) => actual <= t.at);
  const match = part.direction === "higher" ? eligible.at(-1) : eligible[0];
  if (!match) return { amount: 0, tier: null };
  if (part.interpolation === "step")
    return { amount: match.payout, tier: match.id };
  const lower = [...rows].reverse().find((t) => t.at <= actual),
    upper = rows.find((t) => t.at >= actual);
  if (lower && upper && lower.at !== upper.at)
    return {
      amount:
        lower.payout +
        ((actual - lower.at) / (upper.at - lower.at)) *
          (upper.payout - lower.payout),
      tier: match.id,
    };
  return { amount: match.payout, tier: match.id };
}
export function partPayment(part: PayoutPart, actual: number) {
  let amount = 0,
    tier: string | null = null;
  if (part.policy) {
    amount = policyPayment(part, actual);
  } else if (part.method === "tiers") {
    const match = tablePayout(part, actual);
    amount = match.amount;
    tier = match.tier;
  } else if (part.method === "rate")
    amount =
      Math.max(
        0,
        part.direction === "higher"
          ? actual - part.startAt
          : part.startAt - actual,
      ) * part.rate;
  else {
    const ratio =
      part.direction === "higher"
        ? actual / part.target
        : actual === 0
          ? Infinity
          : part.target / actual;
    amount =
      ratio * 100 < part.threshold || part.targetPayout === 0
        ? 0
        : part.targetPayout *
          (ratio <= 1
            ? ratio
            : part.accelerator === 0
              ? 1
              : 1 + (ratio - 1) * part.accelerator);
  }
  return { amount: cents(Math.min(part.cap ?? Infinity, amount)), tier };
}
export function annualPartPayment(part: PayoutPart, values: number[]) {
  const amounts = values.map((v) => partPayment(part, v).amount);
  if (part.policy?.kind === "kar") {
    const policy = part.policy;
    return values.reduce(
      (sum, value, i) =>
        sum +
        partPayment(
          {
            ...part,
            policy: {
              ...policy,
              businessAgeMonths: policy.businessAgeMonths + i,
            },
          },
          value,
        ).amount,
      0,
    );
  }
  if (part.policy?.kind === "quarterly-weekly") {
    let at = 0;
    return part.policy.quarterWeeks.reduce((sum, weeks) => {
      const subtotal = amounts.slice(at, at + weeks).reduce((s, v) => s + v, 0);
      at += weeks;
      return (
        sum +
        Math.min(
          subtotal,
          part.policy!.kind === "quarterly-weekly"
            ? part.policy!.quarterCap
            : 0,
        )
      );
    }, 0);
  }
  return amounts.reduce((s, v) => s + v, 0);
}
export function compositeResult(p: Plan) {
  const config = p.composite!;
  const errors = compositeErrors(p);
  const gatesPassed = config.eligibility.every((c) => c.passed);
  const results = new Map<string, PartResult>();
  const count = config.recipient === "team" ? 1 : p.participants;
  if (!errors.length) {
    const compute = (part: PayoutPart): PartResult => {
      const cached = results.get(part.id);
      if (cached) return cached;
      const conditionsPassed =
        part.gates.every((g) =>
          g.comparison === "at-least"
            ? g.actual >= g.target
            : g.actual <= g.target,
        ) &&
        part.requires.every(
          (ref) => compute(config.parts.find((v) => v.id === ref)!).annual > 0,
        );
      const multiplier = part.basis === "shared" ? 1 : count;
      const preview = partPayment(part, part.actual);
      const annual = annualPartPayment(
        part,
        part.entries ?? Array(part.periods).fill(part.actual),
      );
      const maxPer =
        part.method === "tiers"
          ? Math.min(
              part.cap ?? Infinity,
              Math.max(0, ...part.tiers.map((t) => t.payout)),
            )
          : (part.cap ?? Infinity);
      const trackerMax =
        part.policy?.kind === "pool" && part.policy.role === "tracker"
          ? Math.min(
              part.cap ?? Infinity,
              ((part.policy.pool
                ? poolFunding({
                    ...part.policy.pool,
                    quarterlyProfit: part.actual,
                  })
                : 0) *
                part.policy.maxShare) /
                100,
            )
          : null;
      const targetPart =
        part.policy?.kind === "pool" && part.policy.role === "tracker"
          ? {
              ...part,
              policy: {
                ...part.policy,
                kpis: part.policy.kpis.map((k) => ({ ...k, actual: k.target })),
              },
            }
          : part;
      const result = {
        id: part.id,
        perPeriod: preview.amount,
        annual: cents(
          p.enabled && gatesPassed && conditionsPassed
            ? annual * multiplier
            : 0,
        ),
        maximum: cents(
          part.requires.every(
            (ref) =>
              compute(config.parts.find((v) => v.id === ref)!).maximum > 0,
          )
            ? (part.policy?.kind === "quarterly-weekly"
                ? annualPartPayment(part, Array(part.periods).fill(part.target))
                : (trackerMax ?? maxPer) * part.periods) * multiplier
            : 0,
        ),
        target: cents(
          part.requires.every(
            (ref) =>
              compute(config.parts.find((v) => v.id === ref)!).target > 0,
          )
            ? annualPartPayment(
                targetPart,
                Array(part.periods).fill(part.target),
              ) * multiplier
            : 0,
        ),
        conditionsPassed,
        matchedTier: preview.tier,
      };
      results.set(part.id, result);
      return result;
    };
    config.parts.forEach(compute);
  }
  const parts = config.parts.map(
    (part) =>
      results.get(part.id) ?? {
        id: part.id,
        perPeriod: 0,
        annual: 0,
        maximum: 0,
        target: 0,
        conditionsPassed: false,
        matchedTier: null,
      },
  );
  const applyCap = (v: number) =>
    cents(Math.min(v, config.annualCap ?? Infinity));
  const annualPayout = applyCap(parts.reduce((s, r) => s + r.annual, 0)),
    annualMaximum = applyCap(parts.reduce((s, r) => s + r.maximum, 0)),
    annualTarget = applyCap(parts.reduce((s, r) => s + r.target, 0));
  const divisor =
    p.reportingPeriod === "Monthly"
      ? 12
      : p.reportingPeriod === "Quarterly"
        ? 4
        : 1;
  return {
    errors,
    gatesPassed,
    parts,
    annualPayout,
    annualMaximum,
    annualTarget,
    payout: cents(annualPayout / divisor),
    maximum: cents(annualMaximum / divisor),
    pool: cents(annualTarget / divisor),
    divisor,
  };
}
export function validComposite(value: unknown): value is CompositePlan {
  if (!value || typeof value !== "object") return false;
  const c = value as CompositePlan;
  const num = (v: unknown) =>
    typeof v === "number" && Number.isFinite(v) && v >= 0;
  const text = (v: unknown) => typeof v === "string";
  const unique = (items: { id: string }[]) =>
    items.every((v) => !!v && text(v.id)) &&
    new Set(items.map((v) => v.id)).size === items.length;
  return (
    ["employee", "truck", "team"].includes(c.recipient) &&
    text(c.purpose) &&
    (c.annualCap === null || num(c.annualCap)) &&
    Array.isArray(c.eligibility) &&
    unique(c.eligibility) &&
    c.eligibility.every(
      (g) => text(g.label) && typeof g.passed === "boolean",
    ) &&
    Array.isArray(c.parts) &&
    unique(c.parts) &&
    c.parts.every(
      (p) =>
        (p.policy === undefined || validPolicy(p.policy)) &&
        (p.displayAsPercent === undefined ||
          typeof p.displayAsPercent === "boolean") &&
        (p.allowUncapped === undefined ||
          typeof p.allowUncapped === "boolean") &&
        text(p.name) &&
        text(p.measure) &&
        text(p.unit) &&
        ["higher", "lower"].includes(p.direction) &&
        ["Weekly", "Monthly", "Quarterly", "Annual"].includes(p.frequency) &&
        ["recipient", "shared"].includes(p.basis) &&
        ["tiers", "rate", "goal"].includes(p.method) &&
        ["step", "linear"].includes(p.interpolation) &&
        [
          p.target,
          p.actual,
          p.periods,
          p.startAt,
          p.rate,
          p.targetPayout,
          p.threshold,
          p.accelerator,
        ].every(num) &&
        (p.cap === null || num(p.cap)) &&
        Array.isArray(p.tiers) &&
        unique(p.tiers) &&
        p.tiers.every((t) => num(t.at) && num(t.payout)) &&
        Array.isArray(p.gates) &&
        unique(p.gates) &&
        p.gates.every(
          (g) =>
            text(g.name) &&
            num(g.actual) &&
            num(g.target) &&
            ["at-least", "at-most"].includes(g.comparison),
        ) &&
        Array.isArray(p.requires) &&
        p.requires.every(text) &&
        (p.entries === null ||
          (Array.isArray(p.entries) && p.entries.every(num))),
    )
  );
}
