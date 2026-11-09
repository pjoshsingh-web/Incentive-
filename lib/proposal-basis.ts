import type { Plan } from "./workspace";
import type { PayoutPart } from "./composite";
export type ProposalBasis = {
  kind: "revenue" | "gross-profit" | "custom" | "fixed";
  revenue: number;
  margin: number;
  label: string;
  minimumMargin: number;
};
export function validProposalBasis(value: unknown): value is ProposalBasis {
  if (!value || typeof value !== "object") return false;
  const b = value as ProposalBasis;
  return (
    ["revenue", "gross-profit", "custom", "fixed"].includes(b.kind) &&
    typeof b.label === "string" &&
    [b.revenue, b.margin, b.minimumMargin].every(
      (v) => typeof v === "number" && Number.isFinite(v) && v >= 0,
    )
  );
}
export function proposalBasisErrors(part: PayoutPart): string[] {
  const b = part.proposalBasis;
  if (!b) return [];
  const errors: string[] = [];
  if (!validProposalBasis(b) || b.margin > 100 || b.minimumMargin > 100)
    errors.push("Gross margin and its minimum must be between 0 and 100%.");
  const expected = { Weekly: 52, Monthly: 12, Quarterly: 4, Annual: 1 }[
    part.frequency
  ];
  if (part.periods !== expected || part.entries !== null || part.policy)
    errors.push(
      "Custom proposal components require a full year of calculation periods and their own formula. Remove legacy rules and per-period histories before calculating.",
    );
  if (part.method === "goal" && part.direction === "lower" && part.cap === null)
    errors.push("Set a payout limit for lower-is-better goal rules.");
  if (!b.label.trim()) errors.push("Give this proposal measure a name.");
  return errors;
}
export function resolveProposalPlan(plan: Plan): Plan {
  if (!plan.composite) return plan;
  return {
    ...plan,
    composite: {
      ...plan.composite,
      parts: plan.composite.parts.map((part) => {
        const b = part.proposalBasis;
        if (!b) return part;
        const actual =
          b.kind === "revenue"
            ? b.revenue
            : b.kind === "gross-profit"
              ? (b.revenue * b.margin) / 100
              : part.actual;
        return {
          ...part,
          actual,
          cap:
            b.kind === "fixed"
              ? Math.min(part.cap ?? Infinity, actual)
              : part.cap,
          measure: b.label,
          gates: [
            ...part.gates.filter((g) => g.id !== part.id + "-minimum-margin"),
            ...(b.minimumMargin > 0
              ? [
                  {
                    id: part.id + "-minimum-margin",
                    name: "Minimum gross margin",
                    actual: b.margin,
                    target: b.minimumMargin,
                    comparison: "at-least" as const,
                  },
                ]
              : []),
          ],
        };
      }),
    },
  };
}
