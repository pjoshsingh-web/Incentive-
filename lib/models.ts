import type { Company, Plan } from "./workspace";
import { executiveTotal } from "./executive";
export type IncentiveModel = {
  id: string;
  name: string;
  notes: string;
  planId?: string;
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
