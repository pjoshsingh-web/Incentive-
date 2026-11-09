import type { Company } from "./workspace";
import { executiveTotal } from "./executive";
export type IncentiveModel = {
  id: string;
  name: string;
  notes: string;
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
