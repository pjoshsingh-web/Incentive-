"use client";
import { paymentTiming } from "../../lib/payment-timing";
import { useState } from "react";
import { Company, Plan, id } from "../../lib/workspace";
import {
  IncentiveModel,
  livePlanComparison,
  resolveBaselinePlan,
  modelSnapshot,
} from "../../lib/models";
import { executiveTotal } from "../../lib/executive";
import {
  ComparisonKey,
  comparisonTemplates,
  makeComparison,
} from "../../lib/comparison";
import { PayoutPart } from "../../lib/composite";
import { formatMoney as money } from "../../lib/currency";
import { ProposalDesigner } from "./proposal-designer";
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
        aria-label={label}
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
  hideHeadcount = false,
}: {
  plan: Plan;
  onChange: (v: Plan) => void;
  hideHeadcount?: boolean;
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
      <p className="model-note">
        Selected for this comparison. Your live plan stays unchanged.
      </p>
      {!hideHeadcount && (
        <>
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
        </>
      )}
      {p.composite ? (
        p.composite.parts
          .filter((part) => !part.proposalBasis)
          .map((part) => (
            <div className="compare-part" key={part.id}>
              <h4>{part.name}</h4>
              <small>
                {part.frequency} calculation · {part.periods} calculation
                periods per year · {paymentTiming(p).label} ·{" "}
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
                        label="Limit earned per calculation period (CAD)"
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
    [rightId, setRightId] = useState("");
  const models = c.models ?? [],
    left = models.find((m) => m.id === leftId) ?? models[0],
    right =
      models.find((m) => m.id === rightId && m.id !== left?.id) ??
      models.find((m) => m.id !== left?.id),
    year = c.summaryYear ?? new Date().getFullYear();
  const savedCurrent =
    left?.company.plans.find((p) => p.id === left.planId) ??
    left?.company.plans[0];
  const baselineYear =
    c.comparisonBaseYear ?? savedCurrent?.year ?? new Date().getFullYear();
  const baselinePlanId = savedCurrent
    ? left?.baselinePlanIds?.[savedCurrent.id]
    : undefined;
  const sourceCurrent = savedCurrent
    ? (resolveBaselinePlan(c, savedCurrent, baselineYear, baselinePlanId)
        .plan ?? savedCurrent)
    : undefined;
  const lp = sourceCurrent
    ? {
        ...sourceCurrent,
        participants:
          left?.participantCounts?.[savedCurrent!.id] ??
          left?.participantCounts?.[sourceCurrent.id] ??
          sourceCurrent.participants,
      }
    : undefined;
  const setCurrentCount = (participants: number | undefined) => {
    if (!left || !lp || !savedCurrent) return;
    const participantCounts = { ...left.participantCounts };
    delete participantCounts[lp.id];
    if (participants === undefined) delete participantCounts[savedCurrent.id];
    else participantCounts[savedCurrent.id] = participants;
    onChange({
      models: models.map((m) =>
        m.id === left.id ? { ...m, participantCounts } : m,
      ),
    });
  };
  const rp =
    right?.company.plans.find((p) => p.id === right.planId) ??
    right?.company.plans.find((p) => p.id === lp?.id) ??
    right?.company.plans[0];
  const comparison =
    left && right && lp && rp
      ? livePlanComparison(
          c,
          lp,
          rp,
          year,
          right.company.incentivePools,
          baselineYear,
          baselinePlanId,
        )
      : null;
  const choosePlan = (model: IncentiveModel, value: string) => {
    const live = value.startsWith("live:")
      ? c.plans.find((p) => p.id === value.slice(5))
      : undefined;
    const planId = live?.id ?? value;
    onChange({
      models: models.map((m) => {
        if (m.id !== model.id) return m;
        if (!live) return { ...m, planId };
        const poolIds = new Set(
          live.composite?.parts.flatMap((p) =>
            p.policy?.kind === "pool" ? [p.policy.poolId] : [],
          ) ?? [],
        );
        return {
          ...m,
          planId,
          company: {
            ...m.company,
            plans: [
              ...m.company.plans.filter((p) => p.id !== live.id),
              structuredClone(live),
            ],
            departments: [
              ...m.company.departments,
              ...structuredClone(
                c.departments.filter(
                  (d) =>
                    d.name === live.department &&
                    !m.company.departments.some(
                      (existing) => existing.name === d.name,
                    ),
                ),
              ),
            ],
            incentivePools: [...(m.company.incentivePools ?? [])]
              .filter((p) => !poolIds.has(p.id))
              .concat(
                structuredClone(
                  c.incentivePools?.filter((p) => poolIds.has(p.id)) ?? [],
                ),
              ),
          },
        };
      }),
    });
  };
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
      models: models.map((m) => {
        if (m.id !== left.id && m.id !== right.id) return m;
        return {
          ...m,
          planId: plan.id,
          company: {
            ...m.company,
            plans: [...m.company.plans, structuredClone(plan)],
            incentivePools:
              pool && !m.company.incentivePools?.some((p) => p.id === pool.id)
                ? [...(m.company.incentivePools ?? []), structuredClone(pool)]
                : m.company.incentivePools,
          },
        };
      }),
    });
  };
  return (
    <div className="model-comparison">
      <section className="panel">
        <div className="eyebrow">TRY A CHANGE. SEE THE COST.</div>
        <h2>Current plan vs. proposed plan</h2>
        <p>
          Choose a current plan on the left and a proposed plan on the right.
          Both costs update immediately. All amounts are annual CAD.
        </p>
        <p>
          Compare any two plans from Bonus plans—for example, Bulk–Sales Team
          against Bulk RWT. Both employee counts are editable for planning.
          Baseline cost starts from Company total for the baseline year and
          adjusts for your current headcount. The proposal replaces that plan
          using its own headcount. Live plans stay unchanged.
        </p>
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
                Baseline year
                <input
                  aria-label="Baseline year"
                  type="number"
                  min={2000}
                  max={2200}
                  value={baselineYear}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    if (value >= 2000 && value <= 2200)
                      onChange({ comparisonBaseYear: value });
                  }}
                />
              </label>
              <label>
                Proposal year
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
      {left && right && (
        <>
          {comparison && (
            <section
              className="compare-live"
              aria-label="Live company comparison"
              aria-live="polite"
            >
              <div>
                <span>
                  Baseline company cost · {baselineYear} · with employer costs
                </span>
                <strong>
                  {comparison.baseline.incomplete
                    ? "Needs review"
                    : money(comparison.baseline.loaded)}
                </strong>
                <small>
                  Bonuses:{" "}
                  {comparison.baseline.incomplete
                    ? "Incomplete"
                    : money(comparison.baseline.incentive)}
                </small>
              </div>
              <div>
                <span>
                  Proposed company cost · {year} · with employer costs
                </span>
                <strong>
                  {comparison.projected.incomplete
                    ? "Needs review"
                    : money(comparison.projected.loaded)}
                </strong>
                <small>
                  Bonuses:{" "}
                  {comparison.projected.incomplete
                    ? "Incomplete"
                    : money(comparison.projected.incentive)}
                </small>
              </div>
              <div className="compare-difference">
                <span>Added bonuses / savings vs. baseline</span>
                <strong>
                  {comparison.bonusDifference === null
                    ? "Complete missing rules"
                    : comparison.bonusDifference === 0
                      ? "No cost change"
                      : `${money(Math.abs(comparison.bonusDifference))} ${comparison.bonusDifference > 0 ? "more" : "less"}`}
                </strong>
                <small>
                  {comparison.difference === null
                    ? comparison.baselineLinkError
                      ? "Link the baseline plan to calculate a change"
                      : "Complete included plan rules to calculate a change"
                    : comparison.difference === 0
                      ? "No change with employer costs"
                      : `${money(Math.abs(comparison.difference))} ${comparison.difference > 0 ? "more" : "less"} with employer costs (${c.overhead}%)`}
                </small>
              </div>
            </section>
          )}
          {comparison && (
            <section
              className="panel comparison-reconciliation"
              aria-label="Company cost breakdown"
            >
              <h3>Baseline cost plus the proposed change</h3>
              <p>
                Existing incentives are already part of the baseline. Carry them
                into {year}, then add only the increase—or subtract the
                saving—from the selected replacement.
              </p>
              {comparison.headcountAdjusted && (
                <p role="status">
                  Company total for {baselineYear} is{" "}
                  {comparison.liveBaseline.incomplete
                    ? "incomplete"
                    : money(comparison.liveBaseline.loaded)}{" "}
                  with employer costs. This current model uses{" "}
                  {lp?.participants} recipients instead of{" "}
                  {sourceCurrent?.participants}, so its total is a planning
                  scenario. Reset the count to match Company total again.
                </p>
              )}
              {comparison.baseline.incomplete ||
              comparison.projected.incomplete ? (
                <>
                  <p>
                    Complete the included plans before relying on a company
                    total.
                  </p>
                  {[
                    ...new Set([
                      ...comparison.baseline.errors,
                      ...comparison.projected.errors,
                    ]),
                  ].map((error) => (
                    <p key={error}>{error}</p>
                  ))}
                </>
              ) : (
                <dl>
                  <div>
                    <dt>Baseline company cost · {baselineYear}</dt>
                    <dd>{money(comparison.baseline.loaded)}</dd>
                  </div>
                  <div>
                    <dt>Existing cost already in baseline: {lp?.name}</dt>
                    <dd>− {money(comparison.removed)}</dd>
                  </div>
                  {comparison.proposalAlreadyIncluded && (
                    <div>
                      <dt>
                        Remove proposed plan already counted in Company total:{" "}
                        {rp?.name}
                      </dt>
                      <dd>− {money(comparison.removedExistingProposal)}</dd>
                    </div>
                  )}
                  <div>
                    <dt>Replacement plan’s full cost: {rp?.name}</dt>
                    <dd>+ {money(comparison.added)}</dd>
                  </div>
                  <div>
                    <dt>Change in bonuses before employer costs</dt>
                    <dd>
                      {comparison.bonusDifference === null
                        ? "Incomplete"
                        : `${comparison.bonusDifference < 0 ? "−" : "+"} ${money(Math.abs(comparison.bonusDifference))}`}
                    </dd>
                  </div>
                  {c.overhead > 0 &&
                    comparison.difference !== null &&
                    comparison.bonusDifference !== null && (
                      <div>
                        <dt>Change in employer costs ({c.overhead}%)</dt>
                        <dd>
                          {comparison.difference - comparison.bonusDifference <
                          0
                            ? "−"
                            : "+"}{" "}
                          {money(
                            Math.abs(
                              comparison.difference -
                                comparison.bonusDifference,
                            ),
                          )}
                        </dd>
                      </div>
                    )}
                  <div>
                    <dt>Total change with employer costs</dt>
                    <dd>
                      {comparison.difference === null
                        ? "Incomplete"
                        : comparison.difference === 0
                          ? "No change"
                          : `${comparison.difference > 0 ? "+" : "−"} ${money(Math.abs(comparison.difference))}`}
                    </dd>
                  </div>
                  <div>
                    <dt>Proposed company cost · {year}</dt>
                    <dd>{money(comparison.projected.loaded)}</dd>
                  </div>
                </dl>
              )}
              {!comparison.currentIncluded && (
                <p role="status">
                  Link the current plan to the plan already included in Company
                  total for {baselineYear} using the selector below. Until it is
                  linked, the proposed company cost and added cost remain
                  incomplete.
                </p>
              )}
              {comparison.proposalAlreadyIncluded && (
                <p role="status">
                  Both selected plans are already included in Company total. The
                  proposal removes the current plan and replaces the
                  already-counted proposal once. This can show a saving even
                  when the proposed payment rises. Review inclusion in Company
                  total if the proposal is still a draft.
                </p>
              )}
              <p>
                Company totals include {c.overhead}% employer costs; the
                bonus-only change is shown separately. A positive difference
                means more cost; a negative difference means less cost. The
                baseline awards are carried forward without growth assumptions;
                the proposal applies to {year}.
              </p>
            </section>
          )}
          <div className="compare-columns">
            {[left!, right!].map((m, index) => {
              const p = index === 0 ? lp : rp,
                r = comparison
                  ? index === 0
                    ? comparison.currentPreview
                    : comparison.proposedPreview
                  : null;
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
                  <label className="compare-field">
                    <span>
                      {index === 0
                        ? "Current bonus plan"
                        : "Proposed bonus plan"}
                    </span>
                    <select
                      aria-label={
                        index === 0
                          ? "Current bonus plan"
                          : "Proposed bonus plan"
                      }
                      value={(index === 0 ? savedCurrent?.id : p?.id) ?? ""}
                      onChange={(e) => choosePlan(m, e.target.value)}
                    >
                      <option value="" disabled>
                        Choose a bonus plan
                      </option>
                      <optgroup label="Saved in this model">
                        {m.company.plans.map((plan) => (
                          <option key={plan.id} value={plan.id}>
                            {plan.name}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Use latest from Bonus plans">
                        {c.plans.map((plan) => (
                          <option key={plan.id} value={"live:" + plan.id}>
                            {plan.name} (latest)
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </label>
                  {index === 0 && savedCurrent && comparison && (
                    <label className="compare-field">
                      <span>Plan already counted in Company total</span>
                      <select
                        aria-label="Plan already counted in Company total"
                        value={comparison.baselinePlanId ?? ""}
                        onChange={(e) => {
                          const baselinePlanIds = { ...left!.baselinePlanIds };
                          if (e.target.value)
                            baselinePlanIds[savedCurrent.id] = e.target.value;
                          else delete baselinePlanIds[savedCurrent.id];
                          onChange({
                            models: models.map((v) =>
                              v.id === left!.id ? { ...v, baselinePlanIds } : v,
                            ),
                          });
                        }}
                      >
                        <option value="">
                          Choose the existing baseline plan
                        </option>
                        {comparison.baselineCandidates.map((plan) => (
                          <option value={plan.id} key={plan.id}>
                            {plan.name} · {plan.department} ·{" "}
                            {plan.participants} recipients
                          </option>
                        ))}
                      </select>
                      <small>
                        Links this comparison to the existing cost, even when an
                        older saved model has a different ID.
                      </small>
                    </label>
                  )}
                  <p className="model-note">
                    {
                      paymentTiming(
                        p ?? ({ paymentSchedule: undefined } as Plan),
                      ).label
                    }
                    . Calculation results accrue until the payout date; payment
                    timing does not multiply annual cost.
                  </p>
                  {index === 1 && p && (
                    <label className="compare-field">
                      <span>When is this incentive paid?</span>
                      <select
                        aria-label="When is this incentive paid?"
                        value={p.paymentSchedule ?? "Quarterly"}
                        onChange={(e) =>
                          patch(m, {
                            plans: m.company.plans.map((v) =>
                              v.id === p.id
                                ? {
                                    ...v,
                                    paymentSchedule: e.target
                                      .value as Plan["paymentSchedule"],
                                  }
                                : v,
                            ),
                          })
                        }
                      >
                        <option value="Quarterly">
                          Quarterly · 4 payouts per year
                        </option>
                        <option value="Monthly">
                          Monthly · 12 payouts per year
                        </option>
                        <option value="Annual">
                          Annually · 1 payout per year
                        </option>
                      </select>
                    </label>
                  )}
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
                          : p.composite &&
                              p.composite.parts.every(
                                (v) => v.basis === "shared",
                              ) &&
                              p.participants > 0
                            ? `${money(r.incentive / p.participants)} estimated equal share per ${p.composite.recipient} · one shared pool`
                            : "Total for this plan"}
                      </small>
                    )}
                  </div>
                  {r &&
                    p &&
                    !r.incomplete &&
                    paymentTiming(p).schedule === "Quarterly" && (
                      <p className="model-note">
                        Average quarterly payout: {money(r.incentive / 4)} total
                        {p.participants > 0
                          ? ` · ${money(r.incentive / 4 / p.participants)} per recipient`
                          : ""}
                        . Actual quarters depend on the monthly results.
                      </p>
                    )}
                  {p && (
                    <div className="compare-current-count">
                      <NumberField
                        label={
                          p.composite?.recipient === "truck"
                            ? "Number of trucks"
                            : p.composite?.recipient === "team" ||
                                p.scope === "department"
                              ? "Number of teams"
                              : "Number of people"
                        }
                        value={p.participants}
                        onChange={(participants) =>
                          index === 0
                            ? setCurrentCount(participants)
                            : patch(m, {
                                plans: m.company.plans.map((v) =>
                                  v.id === p.id ? { ...v, participants } : v,
                                ),
                              })
                        }
                        help={
                          p.scope === "department"
                            ? "This is one shared department pool; the count does not multiply it."
                            : "Change this count for this model. Your live headcount stays unchanged."
                        }
                      />
                      {index === 0 && comparison?.headcountAdjusted && (
                        <button onClick={() => setCurrentCount(undefined)}>
                          {`Reset to live headcount (${sourceCurrent?.participants})`}
                        </button>
                      )}
                    </div>
                  )}
                  {index === 1 && p && (
                    <ProposalDesigner
                      plan={p}
                      defaultMargin={
                        c.departments.find((d) => d.name === p.department)
                          ?.scorecard?.marginActual ??
                        c.scorecard?.marginActual ??
                        c.margin
                      }
                      onChange={(next) =>
                        patch(m, {
                          plans: m.company.plans.map((v) =>
                            v.id === p.id ? next : v,
                          ),
                        })
                      }
                      restore={() => {
                        if (lp)
                          patch(m, {
                            plans: m.company.plans.map((v) =>
                              v.id === p.id
                                ? {
                                    ...structuredClone(lp),
                                    id: p.id,
                                    name: p.name,
                                    participants: p.participants,
                                  }
                                : v,
                            ),
                          });
                      }}
                    />
                  )}
                  {p ? (
                    <fieldset
                      className="compare-plan-fields"
                      disabled={index === 0}
                    >
                      <PlanInputs
                        plan={p}
                        hideHeadcount
                        onChange={(next) =>
                          patch(m, {
                            plans: m.company.plans.map((v) =>
                              v.id === p.id ? next : v,
                            ),
                          })
                        }
                      />
                    </fieldset>
                  ) : (
                    <>
                      <p>
                        Choose a saved bonus plan above, or add a template to
                        begin.
                      </p>
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
                  <p className="model-note">
                    Employer costs: {c.overhead}% on bonuses, matching Company
                    total. Company revenue, margin, period and shared pool rules
                    also use the live company settings.
                  </p>
                  {index === 0 && (
                    <p className="model-note">
                      Current pay rules come from Bonus plans. Change the
                      headcount above to test the current plan, or edit the
                      proposed plan on the right.
                    </p>
                  )}
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
              const a = comparison!.currentPreview,
                b = comparison!.proposedPreview;
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
                      Comparing <strong>{lp.name}</strong> with{" "}
                      <strong>{rp.name}</strong>, the selected plans calculate
                      annual bonuses of <strong>{money(a.incentive)}</strong>{" "}
                      and <strong>{money(b.incentive)}</strong>. That is{" "}
                      <strong>
                        {money(Math.abs(b.incentive - a.incentive))}{" "}
                        {b.incentive === a.incentive
                          ? "change"
                          : b.incentive > a.incentive
                            ? "more"
                            : "less"}
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
