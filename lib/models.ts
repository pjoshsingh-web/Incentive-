import type { Company, Plan } from "./workspace";
import { executiveTotal } from "./executive";
export type IncentiveModel = {
  id: string;
  name: string;
  notes: string;
  planId?: string;
  participantCounts?: Record<string, number>;
  baselinePlanIds?: Record<string, string>;
  company: Omit<Company, "models">;
};
export function modelSnapshot(c: Company): Omit<Company, "models"> {
  const { models: _models, ...snapshot } = c;
  return structuredClone(snapshot);
}
export function compareModels(models: IncentiveModel[], year: number) {
  const results = models.map((model) => ({
    model,
    result: executiveTotal(model.company, year),
  }));
  const baseline = results[0]?.result;
  return results.map(({ model, result }) => ({
    model,
    result,
    difference:
      !baseline || baseline.incomplete || result.incomplete
        ? null
        : Math.round((result.loaded - baseline.loaded) * 100) / 100,
    percent:
      !baseline ||
      baseline.incomplete ||
      result.incomplete ||
      baseline.loaded === 0
        ? null
        : ((result.loaded - baseline.loaded) / baseline.loaded) * 100,
  }));
}

// The two selected plans are alternatives. Keep unrelated incentives in each model.
export function replacementModels(
  left: IncentiveModel,
  right: IncentiveModel,
  current: Plan,
  proposed: Plan,
): IncentiveModel[] {
  const candidates = new Set([current.id, proposed.id]);
  return [left, right].map((model, index) => ({
    ...model,
    company: {
      ...model.company,
      plans: [
        ...model.company.plans.filter((plan) => !candidates.has(plan.id)),
        {
          ...(index === 0 ? current : proposed),
          enabled: true,
          year: undefined,
        },
      ],
    },
  }));
}

/** Match saved comparisons to an included ledger row; never assume an unmatched plan is a new cost. */
export function resolveBaselinePlan(
  company: Company,
  current: Plan,
  year: number,
  explicitId?: string,
) {
  const included = company.plans.filter(
    (plan) => plan.enabled && (plan.year === undefined || plan.year === year),
  );
  const normalize = (value: string) =>
    value
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[-_–—]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const exact = included.find((plan) => plan.id === (explicitId ?? current.id));
  if (exact) return { plan: exact, candidates: included, error: undefined };
  if (!explicitId) {
    const matches = included.filter(
      (plan) =>
        normalize(plan.name) === normalize(current.name) &&
        normalize(plan.department) === normalize(current.department) &&
        normalize(plan.role) === normalize(current.role),
    );
    if (matches.length === 1)
      return { plan: matches[0], candidates: included, error: undefined };
  }
  return {
    plan: undefined,
    candidates: included,
    error:
      "Choose the included Company total plan that this current plan replaces. A missing or ambiguous link cannot be treated as a new bonus cost.",
  };
}

/** Reconcile a single replacement against the same live ledger as Company total. */
export function livePlanComparison(
  company: Company,
  current: Plan,
  proposed: Plan,
  year: number,
  proposalPools: Company["incentivePools"] = [],
  baselineYear: number = year,
  baselinePlanId?: string,
) {
  const liveBaseline = executiveTotal(company, baselineYear);
  const link = resolveBaselinePlan(
    company,
    current,
    baselineYear,
    baselinePlanId,
  );
  const liveCurrent = link.plan;
  const selectedCurrent = liveCurrent
    ? { ...liveCurrent, participants: current.participants }
    : current;
  const baseline = executiveTotal(
    {
      ...company,
      plans: company.plans.map((plan) =>
        plan.id === selectedCurrent.id ? selectedCurrent : plan,
      ),
    },
    baselineYear,
  );
  // Existing shared pools and all business/employer assumptions stay authoritative.
  const context: Company = {
    ...company,
    incentivePools: [
      ...(company.incentivePools ?? []),
      ...(proposalPools?.filter(
        (pool) =>
          !company.incentivePools?.some((existing) => existing.id === pool.id),
      ) ?? []),
    ],
  };
  const candidates = new Set([selectedCurrent.id, proposed.id]);
  const included = (category: string, id: string) =>
    baseline.rows.some(
      (row) => row.category === category && row.id === id && row.included,
    );
  // Hold the baseline business and award costs constant across years. Only the
  // selected replacement changes; do not drop salaries/awards at a year boundary.
  const projected = executiveTotal(
    {
      ...context,
      plans: [
        ...company.plans
          .filter(
            (plan) =>
              !candidates.has(plan.id) &&
              included("Regular incentive", plan.id),
          )
          .map((plan) => ({ ...plan, enabled: true, year })),
        { ...proposed, enabled: true, year },
      ],
      leadershipPlans: company.leadershipPlans
        ?.filter((plan) => included("Leadership incentive", plan.id))
        .map((plan) => ({ ...plan, year, includeInCompanyTotal: true })),
      driverPay: company.driverPay
        ?.filter((plan) => included("Driver incentive", plan.id))
        .map((plan) => ({ ...plan, year, included: true })),
    },
    year,
  );
  if (link.error) {
    projected.incomplete = true;
    projected.errors.push(link.error);
  }
  const loaded = (amount: number) =>
    Math.round((amount * (1 + company.overhead / 100) + Number.EPSILON) * 100) /
    100;
  const currentRow = baseline.rows.find(
    (row) =>
      row.category === "Regular incentive" &&
      row.id === selectedCurrent.id &&
      row.included,
  );
  const alreadyIncluded =
    proposed.id !== selectedCurrent.id
      ? baseline.rows.find(
          (row) =>
            row.category === "Regular incentive" &&
            row.id === proposed.id &&
            row.included,
        )
      : undefined;
  const added = projected.rows.find(
    (row) =>
      row.category === "Regular incentive" &&
      row.id === proposed.id &&
      row.included,
  )!;
  const preview = (plan: Plan) =>
    executiveTotal(
      {
        ...context,
        plans: [{ ...plan, enabled: true, year }],
        leadershipPlans: [],
        driverPay: [],
      },
      year,
    );
  return {
    baselinePlanId: liveCurrent?.id,
    baselineLinkError: link.error,
    baselineCandidates: link.candidates,
    baselineYear,
    proposalYear: year,
    liveBaseline,
    baseline,
    headcountAdjusted:
      !!liveCurrent && current.participants !== liveCurrent.participants,
    headcountAdjustment:
      Math.round(
        (baseline.loaded - liveBaseline.loaded + Number.EPSILON) * 100,
      ) / 100,
    projected,
    currentPreview: preview(selectedCurrent),
    proposedPreview: preview(proposed),
    removed: loaded(currentRow?.annual ?? 0),
    removedExistingProposal: loaded(alreadyIncluded?.annual ?? 0),
    added: loaded(added.annual),
    currentIncluded: !!currentRow,
    proposalAlreadyIncluded: !!alreadyIncluded,
    bonusDifference:
      baseline.incomplete || projected.incomplete
        ? null
        : Math.round(
            (projected.incentive - baseline.incentive + Number.EPSILON) * 100,
          ) / 100,
    difference:
      baseline.incomplete || projected.incomplete
        ? null
        : Math.round(
            (projected.loaded - baseline.loaded + Number.EPSILON) * 100,
          ) / 100,
  };
}
