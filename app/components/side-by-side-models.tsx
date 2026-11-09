"use client";
import { useState } from "react";
import { Company, Plan, id } from "../../lib/workspace";
import { IncentiveModel, compareModels, modelSnapshot } from "../../lib/models";
import { executiveTotal } from "../../lib/executive";
import {
  ComparisonKey,
  comparisonTemplates,
  makeComparison,
} from "../../lib/comparison";
import { PayoutPart } from "../../lib/composite";
import { formatMoney as money } from "../../lib/currency";
import { AdvancedModelComparison } from "./model-comparison";
function NumberField({
  label,
  value,
  onChange,
  step = 1,
  help,
  disabled = false,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
  help?: string;
  disabled?: boolean;
}) {
  return (
    <label className="compare-field">
      <span>{label}</span>
      <input
        type="number"
        min={0}
        disabled={disabled}
        step={step}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
      />
      {help && <small>{help}</small>}
    </label>
  );
}
function PlanInputs({
  plan: p,
  onChange,
}: {
  plan: Plan;
  onChange: (v: Plan) => void;
}) {
  const patch = (part: PayoutPart, changes: Partial<PayoutPart>) =>
    onChange({
      ...p,
      composite: {
        ...p.composite!,
        parts: p.composite!.parts.map((v) =>
          v.id === part.id ? { ...v, ...changes } : v,
        ),
      },
    });
  return (
    <div className="compare-inputs">
      <label className="compare-check">
        <input
          type="checkbox"
          checked={p.enabled}
          onChange={(e) => onChange({ ...p, enabled: e.target.checked })}
        />{" "}
        Count this plan in company cost
      </label>
      <NumberField
        label={
          p.composite?.recipient === "truck"
            ? "Number of trucks"
            : p.composite?.recipient === "team" || p.scope === "department"
              ? "Number of teams"
              : "Number of people"
        }
        value={p.participants}
        onChange={(participants) => onChange({ ...p, participants })}
        help={
          p.scope === "department"
            ? "This plan is one shared department pool; the count does not multiply it."
            : undefined
        }
      />
      {p.composite ? (
        p.composite.parts.map((part) => (
          <div className="compare-part" key={part.id}>
            <h4>{part.name}</h4>
            <small>
              {part.frequency} payment · {part.periods} payments per year ·{" "}
              {part.basis === "shared"
                ? "one shared payment"
                : "paid to each recipient"}
            </small>
            {part.policy?.kind === "pool" ? (
              <p>
                This uses a shared Logistics pool. Set its profit, bands and
                role shares in advanced settings below.
              </p>
            ) : (
              <>
                <NumberField
                  label={`${part.measure} (${part.unit})`}
                  value={part.actual}
                  disabled={part.entries !== null}
                  onChange={(actual) => patch(part, { actual })}
                  help={
                    part.entries
                      ? "Individual period results are active. Change those in advanced settings; this single estimate is not used."
                      : undefined
                  }
                />
                {(part.method !== "rate" || part.policy?.kind === "kar") && (
                  <NumberField
                    label={`Goal (${part.unit})`}
                    value={part.target}
                    onChange={(target) => patch(part, { target })}
                  />
                )}
                {part.policy?.kind === "kar" ? (
                  <>
                    <NumberField
                      label="Existing business commission (%)"
                      value={part.policy.existingRate}
                      step={0.01}
                      onChange={(existingRate) =>
                        patch(part, {
                          policy: {
                            ...(part.policy as Extract<
                              NonNullable<PayoutPart["policy"]>,
                              { kind: "kar" }
                            >),
                            existingRate,
                          },
                        })
                      }
                    />
                    <NumberField
                      label="New business commission (%)"
                      value={part.policy.newRate}
                      step={0.01}
                      onChange={(newRate) =>
                        patch(part, {
                          policy: {
                            ...(part.policy as Extract<
                              NonNullable<PayoutPart["policy"]>,
                              { kind: "kar" }
                            >),
                            newRate,
                          },
                        })
                      }
                    />
                    <NumberField
                      label="Revenue from eligible new business (%)"
                      value={part.policy.newBusinessPercent}
                      onChange={(newBusinessPercent) =>
                        patch(part, {
                          policy: {
                            ...(part.policy as Extract<
                              NonNullable<PayoutPart["policy"]>,
                              { kind: "kar" }
                            >),
                            newBusinessPercent,
                          },
                        })
                      }
                    />
                  </>
                ) : part.policy?.kind === "quarterly-weekly" ? (
                  <>
                    <NumberField
                      label="Weekly payment per truck (CAD)"
                      value={part.targetPayout}
                      onChange={(targetPayout) =>
                        patch(part, { targetPayout, cap: targetPayout })
                      }
                    />
                    <NumberField
                      label="Quarterly limit per truck (CAD)"
                      value={part.policy.quarterCap}
                      onChange={(quarterCap) =>
                        patch(part, {
                          policy: {
                            ...(part.policy as Extract<
                              NonNullable<PayoutPart["policy"]>,
                              { kind: "quarterly-weekly" }
                            >),
                            quarterCap,
                          },
                        })
                      }
                    />
                  </>
                ) : part.method === "rate" ? (
                  <NumberField
                    label="Commission rate (%)"
                    value={Number((part.rate * 100).toFixed(8))}
                    step={0.01}
                    onChange={(rate) => patch(part, { rate: rate / 100 })}
                  />
                ) : part.method === "goal" ? (
                  <NumberField
                    label="Payment at goal (CAD)"
                    value={part.targetPayout}
                    onChange={(targetPayout) => patch(part, { targetPayout })}
                  />
                ) : (
                  <div className="compare-tiers">
                    <p>Minimum result → payment (CAD)</p>
                    {part.tiers.map((tier, i) => (
                      <div key={tier.id}>
                        <NumberField
                          label={`Level ${i + 1} minimum`}
                          value={tier.at}
                          onChange={(at) =>
                            patch(part, {
                              tiers: part.tiers.map((v) =>
                                v.id === tier.id ? { ...v, at } : v,
                              ),
                            })
                          }
                        />
                        <NumberField
                          label={`Level ${i + 1} payment`}
                          value={tier.payout}
                          onChange={(payout) =>
                            patch(part, {
                              tiers: part.tiers.map((v) =>
                                v.id === tier.id ? { ...v, payout } : v,
                              ),
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}
                {part.cap !== null &&
                  part.policy?.kind !== "quarterly-weekly" && (
                    <NumberField
                      label="Limit per payment (CAD)"
                      value={part.cap}
                      onChange={(cap) => patch(part, { cap })}
                    />
                  )}
              </>
            )}
          </div>
        ))
      ) : (
        <>
          <NumberField
            label="Bonus at goal per period (CAD)"
            value={p.incentive}
            onChange={(incentive) => onChange({ ...p, incentive })}
          />
          <NumberField
            label="Maximum payout (% of bonus)"
            value={p.cap}
            onChange={(cap) => onChange({ ...p, cap })}
          />
          {p.metrics.map((metric) => (
            <div key={metric.id} className="compare-part">
              <h4>{metric.name}</h4>
              {metric.source === "manual" ? (
                <>
                  {(["target", "actual"] as const).map((key) => (
                    <NumberField
                      key={key}
                      label={key === "target" ? "Goal" : "Expected result"}
                      value={metric[key]}
                      onChange={(value) =>
                        onChange({
                          ...p,
                          metrics: p.metrics.map((v) =>
                            v.id === metric.id ? { ...v, [key]: value } : v,
                          ),
                        })
                      }
                    />
                  ))}
                </>
              ) : (
                <p>
                  Uses company or division results. Change those in advanced
                  settings.
                </p>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
export function ModelComparison({
  company: c,
  onChange,
  notify,
}: {
  company: Company;
  onChange: (v: Partial<Company>) => void;
  notify: (s: string) => void;
}) {
  const [leftId, setLeftId] = useState(""),
    [rightId, setRightId] = useState(""),
    [planId, setPlanId] = useState("");
  const models = c.models ?? [],
    left = models.find((m) => m.id === leftId) ?? models[0],
    right =
      models.find((m) => m.id === rightId && m.id !== left?.id) ??
      models.find((m) => m.id !== left?.id),
    year = c.summaryYear ?? new Date().getFullYear();
  const pair = left && right ? compareModels([left, right], year) : [],
    lp =
      left?.company.plans.find((p) => p.id === planId) ??
      left?.company.plans[0],
    rp =
      right?.company.plans.find((p) => p.id === lp?.id) ??
      right?.company.plans.find(
        (p) => p.name === lp?.name && p.role === lp?.role,
      );
  const patch = (m: IncentiveModel, changes: Partial<Company>) =>
    onChange({
      models: models.map((v) =>
        v.id === m.id ? { ...m, company: { ...m.company, ...changes } } : v,
      ),
    });
  const start = () => {
    const a = {
        id: id(),
        name: "Current plan",
        notes: "",
        company: modelSnapshot(c),
      },
      b = { ...a, id: id(), name: "Proposed plan", company: modelSnapshot(c) };
    onChange({ models: [a, b] });
    setLeftId(a.id);
    setRightId(b.id);
  };
  const addTemplate = (key: ComparisonKey) => {
    if (!left || !right) return;
    const { plan, pool } = makeComparison(key, left.company);
    plan.enabled = true;
    onChange({
      models: models.map((m) =>
        m.id === left.id || m.id === right.id
          ? {
              ...m,
              company: {
                ...m.company,
                plans: [...m.company.plans, structuredClone(plan)],
                incentivePools:
                  pool &&
                  !m.company.incentivePools?.some((p) => p.id === pool.id)
                    ? [
                        ...(m.company.incentivePools ?? []),
                        structuredClone(pool),
                      ]
                    : m.company.incentivePools,
              },
            }
          : m,
      ),
    });
    setPlanId(plan.id);
  };
  const cost = (m: IncentiveModel, p: Plan) =>
    executiveTotal(
      {
        ...m.company,
        plans: [{ ...p, enabled: true, year: undefined }],
        leadershipPlans: [],
        driverPay: [],
      },
      year,
    );
  return (
    <div className="model-comparison">
      <section className="panel">
        <div className="eyebrow">TRY A CHANGE. SEE THE COST.</div>
        <h2>Current plan vs. proposed plan</h2>
        <p>
          Choose a plan, then change the numbers on the right. Both costs update
          immediately. All amounts are annual CAD.
        </p>
        <p>These saved models are separate from your live plans.</p>
        {!left ? (
          <button className="primary" onClick={start}>
            Start comparing my plans
          </button>
        ) : !right ? (
          <button
            className="primary"
            onClick={() => {
              const next = {
                ...left,
                id: id(),
                name: "Proposed plan",
                company: modelSnapshot(left.company),
              };
              onChange({ models: [...models, next] });
              setRightId(next.id);
            }}
          >
            Create a proposal beside my current plan
          </button>
        ) : (
          <>
            <div className="compare-toolbar">
              <label>
                Plan to compare
                <select
                  value={lp?.id ?? ""}
                  onChange={(e) => setPlanId(e.target.value)}
                >
                  <option value="" disabled>
                    Choose a plan
                  </option>
                  {left.company.plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Add an example to both sides
                <select
                  value=""
                  onChange={(e) => addTemplate(e.target.value as ComparisonKey)}
                >
                  <option value="">Choose a template…</option>
                  {comparisonTemplates.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Report year
                <input
                  type="number"
                  value={year}
                  min={2000}
                  max={2200}
                  onChange={(e) => {
                    const y = Number(e.target.value);
                    if (y >= 2000 && y <= 2200) onChange({ summaryYear: y });
                  }}
                />
              </label>
            </div>
          </>
        )}
      </section>
      {!!pair.length && (
        <>
          <section
            className="compare-live"
            aria-label="Live company comparison"
            aria-live="polite"
          >
            <div>
              <span>Current company cost / year</span>
              <strong>
                {pair[0].result.incomplete
                  ? "Needs review"
                  : money(pair[0].result.loaded)}
              </strong>
            </div>
            <div>
              <span>Proposed company cost / year</span>
              <strong>
                {pair[1].result.incomplete
                  ? "Needs review"
                  : money(pair[1].result.loaded)}
              </strong>
            </div>
            <div className="compare-difference">
              <span>What changes?</span>
              <strong>
                {pair[1].difference === null
                  ? "Complete missing rules"
                  : pair[1].difference === 0
                    ? "No cost change"
                    : `${money(Math.abs(pair[1].difference))} ${pair[1].difference > 0 ? "more" : "less"}`}
              </strong>
              <small>Per year, including extra employer costs</small>
            </div>
          </section>
          <div className="compare-columns">
            {[left!, right!].map((m, index) => {
              const p = index === 0 ? lp : rp,
                r = p ? cost(m, p) : null;
              return (
                <section
                  className={
                    "panel compare-column " + (index === 1 ? "proposal" : "")
                  }
                  key={m.id}
                  aria-label={
                    index === 0 ? "Current plan inputs" : "Proposed plan inputs"
                  }
                >
                  <div className="eyebrow">
                    {index === 0 ? "CURRENT" : "PROPOSED"}
                  </div>
                  <label className="compare-field">
                    <span>
                      {index === 0 ? "Current model" : "Proposed model"}
                    </span>
                    <select
                      value={m.id}
                      onChange={(e) =>
                        index === 0
                          ? setLeftId(e.target.value)
                          : setRightId(e.target.value)
                      }
                    >
                      {models
                        .filter((v) => index === 0 || v.id !== left!.id)
                        .map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <div className="compare-plan-cost">
                    <span>This plan · annual bonuses</span>
                    <strong>
                      {r
                        ? r.incomplete
                          ? "Needs review"
                          : money(r.incentive)
                        : "No matching plan"}
                    </strong>
                    {r && p && !r.incomplete && (
                      <small>
                        {p.composite?.parts.every(
                          (v) => v.basis === "recipient",
                        ) && p.participants > 0
                          ? `${money(r.incentive / p.participants)} per ${p.composite.recipient} per year`
                          : "Total for this plan"}
                        {!p.enabled ? " · Excluded from company cost" : ""}
                      </small>
                    )}
                  </div>
                  {p ? (
                    <PlanInputs
                      plan={p}
                      onChange={(next) =>
                        patch(m, {
                          plans: m.company.plans.map((v) =>
                            v.id === p.id ? next : v,
                          ),
                        })
                      }
                    />
                  ) : (
                    <>
                      <p>This proposal does not have the selected plan.</p>
                      <button
                        onClick={() =>
                          lp &&
                          patch(m, {
                            plans: [...m.company.plans, structuredClone(lp)],
                            incentivePools: [
                              ...(m.company.incentivePools ?? []),
                              ...structuredClone(
                                left!.company.incentivePools ?? [],
                              ).filter(
                                (pool) =>
                                  !m.company.incentivePools?.some(
                                    (existing) => existing.id === pool.id,
                                  ),
                              ),
                            ],
                          })
                        }
                      >
                        Copy current plan here
                      </button>
                    </>
                  )}
                  <NumberField
                    label="Extra employer costs on bonuses (%)"
                    value={m.company.overhead}
                    step={0.1}
                    onChange={(overhead) => patch(m, { overhead })}
                  />
                  {r?.incomplete && (
                    <div role="status">
                      <strong>Check these rules:</strong>
                      {r.rows
                        .flatMap((row) => row.errors)
                        .map((error, i) => (
                          <p key={i}>{error}</p>
                        ))}
                      {r.errors.map((error, i) => (
                        <p key={"total" + i}>{error}</p>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
          {lp &&
            rp &&
            (() => {
              const a = cost(left!, lp),
                b = cost(right!, rp);
              return (
                <section className="panel compare-takeaway" aria-live="polite">
                  <h3>What this change means</h3>
                  {a.incomplete || b.incomplete ? (
                    <p>
                      Complete the missing plan rules to see a reliable
                      comparison.
                    </p>
                  ) : (
                    <p>
                      For <strong>{lp.name}</strong>, annual bonuses go from{" "}
                      <strong>{money(a.incentive)}</strong> to{" "}
                      <strong>{money(b.incentive)}</strong>. That is{" "}
                      <strong>
                        {money(Math.abs(b.incentive - a.incentive))}{" "}
                        {b.incentive >= a.incentive ? "more" : "less"}
                      </strong>{" "}
                      in bonuses each year, before extra employer costs.
                    </p>
                  )}
                  <p>
                    Keep revenue, results and recipient counts the same on both
                    sides to compare pay rules fairly. Change results to explore
                    a slower or stronger year.
                  </p>
                </section>
              );
            })()}
        </>
      )}
      <details className="panel">
        <summary>
          More options: saved models, complex rules, leadership, driver pay and
          downloads
        </summary>
        <AdvancedModelComparison
          company={c}
          onChange={onChange}
          notify={notify}
        />
      </details>
    </div>
  );
}
