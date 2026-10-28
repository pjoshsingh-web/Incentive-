import { Company, calculatePlan, resolvedPlan } from "./workspace";
import { annualResult } from "./leadership";
import { driverResult } from "./driver-pay";
import { poolFunding } from "./comparison";
const cents = (n: number) =>
  Number.isFinite(n) ? Math.round((n + Number.EPSILON) * 100) / 100 : n;
export type ExecutiveRow = {
  id: string;
  name: string;
  division: string;
  category: "Regular incentive" | "Leadership incentive" | "Driver incentive";
  included: boolean;
  year: number | undefined;
  annual: number;
  maximum: number;
  errors: string[];
  regularPay: number;
  baseSalary: number;
  poolId?: string;
};
export function executiveTotal(c: Company, year: number) {
  const periods =
    c.period === "Monthly" ? 12 : c.period === "Quarterly" ? 4 : 1;
  const rows: ExecutiveRow[] = [];
  const poolAwards = new Map<string, number>();
  for (const p of c.plans) {
    const r = calculatePlan(resolvedPlan(c, p));
    if (
      p.enabled &&
      (p.year === undefined || p.year === year) &&
      p.composite &&
      "parts" in r
    ) {
      const raw = r.parts.reduce((s, v) => s + v.annual, 0),
        scale = raw > 0 ? r.annualPayout / raw : 0;
      p.composite.parts.forEach((part, i) => {
        if (part.policy?.kind === "pool")
          poolAwards.set(
            part.policy.poolId,
            (poolAwards.get(part.policy.poolId) ?? 0) +
              r.parts[i].annual * scale,
          );
      });
    }
    rows.push({
      id: p.id,
      name: p.name,
      division: p.department,
      category: "Regular incentive",
      included: p.enabled && (p.year === undefined || p.year === year),
      year: p.year,
      annual: p.composite
        ? "annualPayout" in r
          ? r.annualPayout
          : 0
        : r.payout * periods,
      maximum: p.composite
        ? "annualMaximum" in r
          ? r.annualMaximum
          : 0
        : r.maximum * periods,
      errors: r.errors,
      regularPay: 0,
      baseSalary: 0,
      poolId:
        p.composite?.parts.find((part) => part.policy?.kind === "pool")?.policy
          ?.kind === "pool"
          ? (
              p.composite.parts.find((part) => part.policy?.kind === "pool")!
                .policy as { poolId: string }
            ).poolId
          : undefined,
    });
  }
  for (const p of c.leadershipPlans ?? []) {
    const r = annualResult(p);
    rows.push({
      id: p.id,
      name: p.name,
      division: p.division || "Company-wide",
      category: "Leadership incentive",
      included: p.includeInCompanyTotal !== false && p.year === year,
      year: p.year,
      annual: r.bonus,
      maximum: r.maximum,
      errors: r.errors,
      regularPay: 0,
      baseSalary: p.salary,
    });
  }
  for (const p of c.driverPay ?? []) {
    const r = driverResult(p);
    rows.push({
      id: p.id,
      name: p.name,
      division: p.division,
      category: "Driver incentive",
      included: p.included && p.year === year,
      year: p.year,
      annual: r.incentivePay,
      maximum: r.maximumIncentive,
      errors: r.errors,
      regularPay: r.regularPay,
      baseSalary: 0,
    });
  }
  const included = rows.filter((r) => r.included),
    errors = included.flatMap((r) => r.errors.map((e) => r.name + ": " + e));
  const allocations = (c.incentivePools ?? []).map((pool) => {
    const awarded = poolAwards.get(pool.id) ?? 0;
    const available = poolFunding(pool) * 4;
    const over = awarded > available + 0.01;
    if (over)
      errors.push(
        pool.name +
          ": planned awards exceed the shared annual pool. Review participant counts and shares.",
      );
    return { id: pool.id, name: pool.name, available, awarded, over };
  });
  const incentive = cents(included.reduce((s, r) => s + r.annual, 0)),
    maximum = included.reduce((s, r) => s + r.maximum, 0),
    regularDriverPay = included.reduce((s, r) => s + r.regularPay, 0),
    leadershipSalary = included.reduce((s, r) => s + r.baseSalary, 0),
    annualBudget = c.budget * periods;
  const divisions = [...new Set(included.map((r) => r.division))].map(
    (division) => {
      const group = included.filter((r) => r.division === division);
      const payout = group.reduce((s, r) => s + r.annual, 0);
      return {
        name: division,
        incentive: payout,
        loaded: cents(
          group.reduce(
            (sum, row) => sum + cents(row.annual * (1 + c.overhead / 100)),
            0,
          ),
        ),
        regularPay: group.reduce((s, r) => s + r.regularPay, 0),
        leadershipSalary: group.reduce((s, r) => s + r.baseSalary, 0),
        errors: group.some((r) => r.errors.length),
      };
    },
  );
  return {
    year,
    rows,
    includedCount: included.length,
    excludedCount: rows.length - included.length,
    incentive,
    maximum,
    loaded: cents(
      included.reduce(
        (sum, row) => sum + cents(row.annual * (1 + c.overhead / 100)),
        0,
      ),
    ),
    loadedMaximum: cents(
      included.reduce(
        (sum, row) => sum + cents(row.maximum * (1 + c.overhead / 100)),
        0,
      ),
    ),
    regularDriverPay,
    leadershipSalary,
    modeledCash: regularDriverPay + leadershipSalary + incentive,
    annualBudget,
    budgetRemaining: cents(
      annualBudget -
        cents(
          included.reduce(
            (sum, row) => sum + cents(row.annual * (1 + c.overhead / 100)),
            0,
          ),
        ),
    ),
    incomplete: errors.length > 0,
    errors: [...new Set(errors)],
    allocations,
    divisions,
    periods,
  };
}
