import type { Company, Department } from "./workspace";
export type BusinessMeasure = {
  id: string;
  name: string;
  unit: string;
  target: number;
  actual: number;
  direction: "higher" | "lower";
};
export type Scorecard = {
  revenueTarget: number;
  revenueActual: number;
  marginTarget: number;
  marginActual: number;
  other: BusinessMeasure[];
};
export function companyScorecard(c: Company): Scorecard {
  const periods =
    c.period === "Monthly" ? 12 : c.period === "Quarterly" ? 4 : 1;
  return (
    c.scorecard ?? {
      revenueTarget: (c.revenue * (1 + c.growth / 100)) / periods,
      revenueActual: c.revenue / periods,
      marginTarget: c.margin,
      marginActual: c.margin,
      other: [],
    }
  );
}
export function divisionScorecard(d: Department): Scorecard {
  return (
    d.scorecard ?? {
      revenueTarget: 0,
      revenueActual: 0,
      marginTarget: 0,
      marginActual: 0,
      other: [],
    }
  );
}
export function validScorecard(s: unknown): s is Scorecard {
  if (!s || typeof s !== "object") return false;
  const v = s as Scorecard;
  const nonnegative = (n: unknown) =>
    typeof n === "number" && Number.isFinite(n) && n >= 0;
  return (
    [v.revenueTarget, v.revenueActual, v.marginTarget, v.marginActual].every(
      nonnegative,
    ) &&
    v.marginTarget <= 100 &&
    v.marginActual <= 100 &&
    Array.isArray(v.other) &&
    new Set(v.other.map((m) => m.id)).size === v.other.length &&
    v.other.every(
      (m) =>
        typeof m.id === "string" &&
        typeof m.name === "string" &&
        typeof m.unit === "string" &&
        nonnegative(m.target) &&
        nonnegative(m.actual) &&
        ["higher", "lower"].includes(m.direction),
    )
  );
}
export function scorecardSummary(s: Scorecard) {
  return {
    grossProfit: (s.revenueActual * s.marginActual) / 100,
    revenueGap: s.revenueActual - s.revenueTarget,
    marginGap: s.marginActual - s.marginTarget,
  };
}
