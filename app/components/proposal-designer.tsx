"use client";
import { paymentTiming } from "../../lib/payment-timing";
import { Plan } from "../../lib/workspace";
import { newPart, PayoutPart, compositeResult } from "../../lib/composite";
import { resolveProposalPlan, ProposalBasis } from "../../lib/proposal-basis";
import { formatMoney as money } from "../../lib/currency";
type Model = "revenue" | "gross-profit" | "pool" | "goal" | "tiers";
function NumberInput({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <label className="compare-field">
      <span>{label}</span>
      <input
        aria-label={label}
        type="number"
        min={0}
        step={step}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
      />
    </label>
  );
}
const names = {
  revenue: "Revenue commission",
  "gross-profit": "Gross-profit commission",
  pool: "Shared incentive pool",
  goal: "Bonus for reaching a goal",
  tiers: "Payment levels for a custom measure",
};
export function ProposalDesigner({
  plan: p,
  onChange,
  defaultMargin,
  restore,
}: {
  plan: Plan;
  onChange: (p: Plan) => void;
  defaultMargin: number;
  restore: () => void;
}) {
  const apply = (part: PayoutPart) =>
    onChange({
      ...p,
      scope: "individual",
      composite: p.composite
        ? {
            ...p.composite,
            recipient: p.composite.recipient === "truck" ? "truck" : "employee",
            parts: p.composite.parts.map((v) => (v.id === part.id ? part : v)),
          }
        : {
            recipient: "employee",
            purpose: "Editable executive proposal",
            eligibility: [],
            annualCap: null,
            parts: [part],
          },
    });
  const configure = (model: Model, existing?: PayoutPart) => {
    const part = newPart(),
      source = existing ?? p.composite?.parts[0];
    const annualRevenue =
      (source?.proposalBasis
        ? source.proposalBasis.revenue * source.periods
        : undefined) ??
      (source?.unit === "$" && source.measure.toLowerCase().includes("revenue")
        ? source.actual * source.periods
        : source?.policy?.kind === "kar"
          ? source.actual * source.periods
          : 1000000);
    const margin = source?.proposalBasis?.margin ?? defaultMargin;
    const sourceShared = source?.basis === "shared";
    const adjustedRevenue =
      model === "pool" && !sourceShared
        ? annualRevenue * p.participants
        : model !== "pool" && sourceShared
          ? annualRevenue / p.participants
          : annualRevenue;
    Object.assign(part, {
      id: existing?.id ?? part.id,
      name: names[model],
      frequency: "Monthly",
      periods: 12,
      method: model === "goal" ? "goal" : model === "tiers" ? "tiers" : "rate",
      unit: model === "goal" || model === "tiers" ? "%" : "$",
      basis: model === "pool" ? "shared" : "recipient",
      cap: null,
      allowUncapped: true,
      displayAsPercent: true,
      rate:
        model === "pool"
          ? 0.05
          : source?.method === "rate" &&
              !source.policy &&
              source.proposalBasis?.kind !== "fixed"
            ? source.rate
            : 0.01,
      target:
        model === "revenue"
          ? adjustedRevenue / 12
          : model === "gross-profit" || model === "pool"
            ? ((adjustedRevenue / 12) * margin) / 100
            : 100,
      actual: 100,
      targetPayout: 500,
      threshold: 80,
      accelerator: 1,
      entries: null,
      proposalBasis: {
        kind:
          model === "revenue"
            ? "revenue"
            : model === "gross-profit" || model === "pool"
              ? "gross-profit"
              : "custom",
        revenue: adjustedRevenue / 12,
        margin,
        label:
          model === "goal" || model === "tiers"
            ? "On-time delivery"
            : model === "revenue"
              ? "Monthly revenue"
              : "Monthly gross profit",
        minimumMargin: 0,
      },
    });
    if (model === "goal") part.cap = 500;
    if (model === "tiers") part.cap = 1500;
    if (existing) apply(part);
    else
      onChange({
        ...p,
        scope: "individual",
        composite: {
          recipient: p.composite?.recipient === "truck" ? "truck" : "employee",
          purpose:
            "Editable executive proposal. Review assumptions before approval.",
          eligibility: [],
          annualCap: null,
          parts: [part],
        },
      });
  };
  const patch = (part: PayoutPart, changes: Partial<PayoutPart>) =>
    apply({ ...part, ...changes });
  const basis = (part: PayoutPart, changes: Partial<ProposalBasis>) =>
    patch(part, { proposalBasis: { ...part.proposalBasis!, ...changes } });
  const parts = p.composite?.parts ?? [];
  return (
    <div className="proposal-designer">
      <h3>How should this proposal pay?</h3>
      <p>
        Keep the current rules, or try a different formula. Changes apply to
        this saved proposal only. Enter a monthly scenario; the annual forecast
        repeats it for 12 months. Starting values are editable examples, not an
        approved policy.
      </p>
      {!parts.some((part) => part.proposalBasis) && (
        <label className="compare-field">
          <span>Try a different payout model</span>
          <select
            aria-label="Try a different payout model"
            value=""
            onChange={(e) => configure(e.target.value as Model)}
          >
            <option value="">Keep existing rules</option>
            {Object.entries(names).map(([key, name]) => (
              <option key={key} value={key}>
                {name}
              </option>
            ))}
          </select>
          <small>
            Creates a new monthly formula, paid quarterly by default in this
            proposal. It replaces its existing split commissions, tiers and
            conditions; add the conditions you want below.
          </small>
        </label>
      )}
      {parts
        .filter((part) => part.proposalBasis)
        .map((part) => {
          const b = part.proposalBasis!,
            resolved = resolveProposalPlan({
              ...p,
              composite: { ...p.composite!, parts: [part] },
            }).composite!.parts[0];
          const model: Model =
            part.method === "goal"
              ? "goal"
              : part.method === "tiers"
                ? "tiers"
                : part.basis === "shared"
                  ? "pool"
                  : b.kind === "revenue"
                    ? "revenue"
                    : "gross-profit";
          const componentCost = compositeResult({
            ...p,
            enabled: true,
            composite: { ...p.composite!, parts: [part], annualCap: null },
          });
          const shared = part.basis === "shared";
          const period = part.frequency;
          return (
            <section
              className="compare-part"
              key={part.id}
              aria-label={part.name + " settings"}
            >
              <small>
                {part.frequency} calculation · {part.periods} calculation
                periods per year · {paymentTiming(p).label}
              </small>
              <label className="compare-field">
                <span>Payout model</span>
                <select
                  aria-label="Payout model"
                  value={model}
                  onChange={(e) => configure(e.target.value as Model, part)}
                >
                  {Object.entries(names).map(([key, name]) => (
                    <option key={key} value={key}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="compare-field">
                <span>Component name</span>
                <input
                  aria-label="Component name"
                  value={part.name}
                  onChange={(e) => patch(part, { name: e.target.value })}
                />
              </label>
              {part.method === "rate" && shared && (
                <label className="compare-field">
                  <span>What funds this pool?</span>
                  <select
                    aria-label="What funds this pool?"
                    value={b.kind}
                    onChange={(e) => {
                      const kind = e.target.value as ProposalBasis["kind"];
                      patch(part, {
                        rate: kind === "fixed" ? 1 : 0.05,
                        proposalBasis: {
                          ...b,
                          kind,
                          label:
                            kind === "revenue"
                              ? period + " team revenue"
                              : kind === "gross-profit"
                                ? period + " team gross profit"
                                : period + " fixed pool",
                        },
                        actual: kind === "fixed" ? 10000 : part.actual,
                        startAt: 0,
                      });
                    }}
                  >
                    <option value="gross-profit">
                      Percentage of gross profit
                    </option>
                    <option value="revenue">Percentage of revenue</option>
                    <option value="fixed">Fixed monthly budget</option>
                  </select>
                </label>
              )}
              {(b.kind === "revenue" || b.kind === "gross-profit") && (
                <NumberInput
                  label={
                    shared
                      ? period + " revenue for the whole team (CAD)"
                      : period + " revenue per employee or truck (CAD)"
                  }
                  value={b.revenue}
                  onChange={(revenue) => basis(part, { revenue })}
                />
              )}
              {(b.kind === "gross-profit" || b.minimumMargin > 0) && (
                <NumberInput
                  label="Gross margin (%)"
                  value={b.margin}
                  step={0.1}
                  onChange={(margin) => basis(part, { margin })}
                />
              )}
              {b.kind === "gross-profit" && (
                <p className="proposal-formula">
                  {period} revenue {money(b.revenue)} × margin {b.margin}% ={" "}
                  <strong>{money(resolved.actual)} gross profit</strong>
                  {shared ? " for the whole team" : " per recipient"}.
                </p>
              )}
              {b.kind === "fixed" ? (
                <NumberInput
                  label={period + " pool budget (CAD)"}
                  value={part.actual}
                  onChange={(actual) => patch(part, { actual })}
                />
              ) : part.method === "rate" ? (
                <>
                  <NumberInput
                    label={
                      shared
                        ? "Share of the measure paid into the pool (%)"
                        : "Commission on the selected measure (%)"
                    }
                    step={0.01}
                    value={Number((part.rate * 100).toFixed(8))}
                    onChange={(rate) => patch(part, { rate: rate / 100 })}
                  />
                  <NumberInput
                    label={
                      b.kind === "gross-profit"
                        ? "Only pay on gross profit above (CAD)"
                        : "Only pay on revenue above (CAD)"
                    }
                    value={part.startAt}
                    onChange={(startAt) => patch(part, { startAt })}
                  />
                </>
              ) : (
                <>
                  <label className="compare-field">
                    <span>Custom measure name</span>
                    <input
                      aria-label="Custom measure name"
                      value={b.label}
                      onChange={(e) => basis(part, { label: e.target.value })}
                    />
                  </label>
                  <label className="compare-field">
                    <span>Measure unit</span>
                    <select
                      aria-label="Measure unit"
                      value={part.unit}
                      onChange={(e) => patch(part, { unit: e.target.value })}
                    >
                      <option value="%">Percentage</option>
                      <option value="$">CAD</option>
                      <option value="count">Count / other number</option>
                    </select>
                  </label>
                  <label className="compare-field">
                    <span>Better results mean</span>
                    <select
                      aria-label="Better results mean"
                      value={part.direction}
                      onChange={(e) =>
                        patch(part, {
                          direction: e.target.value as "higher" | "lower",
                        })
                      }
                    >
                      <option value="higher">A higher number</option>
                      <option value="lower">A lower number</option>
                    </select>
                  </label>
                  <NumberInput
                    label={`Expected ${b.label} (${part.unit})`}
                    value={part.actual}
                    onChange={(actual) => patch(part, { actual })}
                  />
                  {part.method === "goal" ? (
                    <>
                      <NumberInput
                        label="Goal"
                        value={part.target}
                        onChange={(target) => patch(part, { target })}
                      />
                      <NumberInput
                        label={period + " bonus at goal (CAD)"}
                        value={part.targetPayout}
                        onChange={(targetPayout) =>
                          patch(part, { targetPayout })
                        }
                      />
                      <NumberInput
                        label="Minimum goal achievement before any payment (%)"
                        value={part.threshold}
                        onChange={(threshold) => patch(part, { threshold })}
                      />
                      <NumberInput
                        label="Above-goal accelerator"
                        value={part.accelerator}
                        step={0.1}
                        onChange={(accelerator) => patch(part, { accelerator })}
                      />
                    </>
                  ) : (
                    <>
                      <p>
                        Below the first qualifying level, the payment is zero.
                      </p>
                      {part.tiers.map((tier, i) => (
                        <div className="proposal-tier" key={tier.id}>
                          <NumberInput
                            label={`Level ${i + 1}: result`}
                            value={tier.at}
                            onChange={(at) =>
                              patch(part, {
                                tiers: part.tiers.map((v) =>
                                  v.id === tier.id ? { ...v, at } : v,
                                ),
                              })
                            }
                          />
                          <NumberInput
                            label={`Level ${i + 1}: payment (CAD)`}
                            value={tier.payout}
                            onChange={(payout) =>
                              patch(part, {
                                tiers: part.tiers.map((v) =>
                                  v.id === tier.id ? { ...v, payout } : v,
                                ),
                              })
                            }
                          />
                          <button
                            onClick={() =>
                              patch(part, {
                                tiers: part.tiers.filter(
                                  (v) => v.id !== tier.id,
                                ),
                              })
                            }
                          >
                            Remove level {i + 1}
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() =>
                          patch(part, {
                            tiers: [
                              ...part.tiers,
                              {
                                id: crypto.randomUUID(),
                                at:
                                  Math.max(0, ...part.tiers.map((v) => v.at)) +
                                  10,
                                payout:
                                  Math.max(
                                    0,
                                    ...part.tiers.map((v) => v.payout),
                                  ) + 500,
                              },
                            ],
                          })
                        }
                      >
                        Add a payment level
                      </button>
                    </>
                  )}
                  <label className="compare-field">
                    <span>Who receives this payment?</span>
                    <select
                      aria-label="Who receives this payment?"
                      value={part.basis}
                      onChange={(e) =>
                        patch(part, {
                          basis: e.target.value as "recipient" | "shared",
                        })
                      }
                    >
                      <option value="recipient">Each employee or truck</option>
                      <option value="shared">One shared team pool</option>
                    </select>
                  </label>
                </>
              )}
              {b.kind !== "custom" && (
                <NumberInput
                  label="Minimum gross margin before any bonus (%)"
                  value={b.minimumMargin}
                  step={0.1}
                  onChange={(minimumMargin) => basis(part, { minimumMargin })}
                />
              )}
              <label className="compare-check">
                <input
                  type="checkbox"
                  checked={part.cap !== null}
                  onChange={(e) =>
                    patch(part, { cap: e.target.checked ? 10000 : null })
                  }
                />{" "}
                Set a limit for each calculation period
              </label>
              {part.cap !== null && (
                <NumberInput
                  label={
                    shared
                      ? "Maximum " + period.toLowerCase() + " pool (CAD)"
                      : "Maximum " +
                        period.toLowerCase() +
                        " bonus per recipient (CAD)"
                  }
                  value={part.cap}
                  onChange={(cap) => patch(part, { cap })}
                />
              )}
              {shared && (
                <p className="proposal-formula">
                  One shared pool for <strong>{p.participants}</strong>{" "}
                  recipients. Headcount changes the estimated share, not the
                  pool's total cost. Shares shown assume an equal split;
                  individual awards are not approved by this model.
                </p>
              )}
              <p className="proposal-formula">
                Annual component incentive:{" "}
                <strong>
                  {componentCost.errors.length
                    ? "Review inputs"
                    : money(componentCost.annualPayout)}
                </strong>{" "}
                before the whole-plan limit.
              </p>
              <button
                onClick={() =>
                  onChange({
                    ...p,
                    composite: {
                      ...p.composite!,
                      parts: parts.filter((v) => v.id !== part.id),
                    },
                  })
                }
              >
                Remove this component
              </button>
            </section>
          );
        })}
      {parts.some((part) => part.proposalBasis) && (
        <>
          <button
            onClick={() => {
              const part = newPart();
              part.name = "Additional goal bonus";
              part.method = "goal";
              part.cap = 500;
              part.targetPayout = 500;
              part.frequency = "Monthly";
              part.periods = 12;
              part.proposalBasis = {
                kind: "custom",
                revenue: 0,
                margin: defaultMargin,
                label: "Additional goal",
                minimumMargin: 0,
              };
              onChange({
                ...p,
                composite: { ...p.composite!, parts: [...parts, part] },
              });
            }}
          >
            Add another component
          </button>
          <label className="compare-check">
            <input
              type="checkbox"
              checked={p.composite!.annualCap !== null}
              onChange={(e) =>
                onChange({
                  ...p,
                  composite: {
                    ...p.composite!,
                    annualCap: e.target.checked ? 100000 : null,
                  },
                })
              }
            />{" "}
            Limit the total annual plan cost
          </label>
          {p.composite!.annualCap !== null && (
            <NumberInput
              label="Maximum annual cost for this whole plan (CAD)"
              value={p.composite!.annualCap}
              onChange={(annualCap) =>
                onChange({ ...p, composite: { ...p.composite!, annualCap } })
              }
            />
          )}
        </>
      )}
      <button onClick={restore}>
        Restore this proposal to the current plan's rules
      </button>
      <p className="model-note">
        Gross profit is revenue less direct costs. It is not net profit. The
        existing plan stays the baseline; only the difference changes the
        company forecast.
      </p>
    </div>
  );
}
