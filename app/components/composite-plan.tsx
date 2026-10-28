"use client";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Copy,
  Plus,
  Printer,
  Trash2,
} from "lucide-react";
import { Company, Plan, id, resolvedPlan } from "../../lib/workspace";
import {
  CompositePlan,
  PayoutPart,
  compositeResult,
  newPart,
} from "../../lib/composite";
import { formatMoney as money } from "../../lib/currency";
import { brand } from "../../lib/brand";
import { Field } from "./simple-setup";
import { PolicyPartEditor, PolicyHandout } from "./comparison-templates";
const frequencies: PayoutPart["frequency"][] = [
  "Weekly",
  "Monthly",
  "Quarterly",
  "Annual",
];
const defaultCounts = { Weekly: 52, Monthly: 12, Quarterly: 4, Annual: 1 };
export function CompositePlanEditor({
  company: c,
  plan: p,
  onChange,
  onCompanyChange,
  onDelete,
  onNext,
  onCopy,
  notify,
}: {
  company: Company;
  plan: Plan;
  onChange: (p: Plan) => void;
  onCompanyChange: (v: Partial<Company>) => void;
  onDelete: () => void;
  onNext: () => void;
  onCopy: () => void;
  notify: (s: string) => void;
}) {
  const config = p.composite!;
  const [mode, setMode] = useState<"edit" | "handout">("edit"),
    [selected, setSelected] = useState(""),
    [history, setHistory] = useState("");
  const part = config.parts.find((v) => v.id === selected) || config.parts[0];
  const resolved = resolvedPlan(c, { ...p, enabled: true });
  const result = compositeResult(resolved);
  useEffect(() => {
    setHistory(part?.entries?.join("\n") ?? "");
  }, [part?.id, part?.entries]);
  const update = (changes: Partial<CompositePlan>) =>
    onChange({ ...p, composite: { ...config, ...changes } });
  const updatePart = (changes: Partial<PayoutPart>) => {
    if (part)
      update({
        parts: config.parts.map((v) =>
          v.id === part.id ? { ...v, ...changes } : v,
        ),
      });
  };
  const recipient =
    config.recipient === "employee"
      ? "employee"
      : config.recipient === "truck"
        ? "truck"
        : "team";
  const print = () => {
    setMode("handout");
    requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
  };
  return (
    <section className="panel composite-editor">
      <div className="panel-heading">
        <div>
          <h2>{p.name || "Multi-part bonus plan"}</h2>
          <p>
            Combine payment tables and other rules in one plan. All dollar
            values are CAD.
          </p>
        </div>
        <button
          className="icon-delete"
          aria-label="Delete multi-part plan"
          onClick={onDelete}
        >
          <Trash2 size={17} />
        </button>
      </div>
      <div className="composite-toolbar">
        <div className="composite-mode">
          <button
            className={mode === "edit" ? "selected" : ""}
            onClick={() => setMode("edit")}
          >
            Edit plan & try results
          </button>
          <button
            className={mode === "handout" ? "selected" : ""}
            onClick={() => setMode("handout")}
          >
            Plan handout
          </button>
        </div>
        <button
          className="button secondary"
          disabled={!!result.errors.length}
          onClick={print}
        >
          <Printer size={16} />
          Print / save PDF
        </button>
      </div>
      {mode === "handout" ? (
        <PlanHandout plan={resolved} included={p.enabled} />
      ) : (
        <div className="composite-body">
          <div className="form-grid">
            <label>
              Plan name
              <input
                value={p.name}
                onChange={(e) => onChange({ ...p, name: e.target.value })}
              />
            </label>
            <label>
              Division or team
              <input
                list="composite-divisions"
                value={p.department}
                onChange={(e) => onChange({ ...p, department: e.target.value })}
              />
            </label>
            <datalist id="composite-divisions">
              {c.departments.map((d) => (
                <option key={d.id} value={d.name} />
              ))}
            </datalist>
            <label>
              Who is the payment for?
              <select
                aria-label="Multi-part payout recipient"
                value={config.recipient}
                onChange={(e) => {
                  const recipient = e.target
                    .value as CompositePlan["recipient"];
                  onChange({
                    ...p,
                    participants: recipient === "team" ? 1 : p.participants,
                    scope: recipient === "team" ? "department" : "individual",
                    composite: { ...config, recipient },
                  });
                }}
              >
                <option value="employee">Each eligible employee</option>
                <option value="truck">Each eligible truck</option>
                <option value="team">One shared team payout</option>
              </select>
            </label>
            {config.recipient !== "team" && (
              <Field
                label={
                  config.recipient === "truck"
                    ? "Number of eligible trucks"
                    : "Number of eligible employees"
                }
                value={p.participants}
                min={1}
                onChange={(participants) =>
                  onChange({ ...p, participants: Math.round(participants) })
                }
              />
            )}
            <label>
              Job or group name
              <input
                value={p.role}
                onChange={(e) => onChange({ ...p, role: e.target.value })}
              />
            </label>
            <label>
              Purpose
              <textarea
                value={config.purpose}
                onChange={(e) => update({ purpose: e.target.value })}
                rows={3}
              />
            </label>
          </div>
          <div className="plan-toggle">
            <label>
              <input
                type="checkbox"
                checked={p.enabled}
                onChange={(e) => onChange({ ...p, enabled: e.target.checked })}
              />
              Include this plan in the company budget results
            </label>
            <button className="button secondary" onClick={onCopy}>
              <Copy size={14} />
              Copy plan
            </button>
          </div>
          <section className="composite-summary">
            <div>
              <span>Annual payment at the entered results</span>
              <strong>
                {result.errors.length
                  ? "Fix rules"
                  : money(result.annualPayout)}
              </strong>
            </div>
            <div>
              <span>Annual payment at all goals*</span>
              <strong>
                {result.errors.length
                  ? "Fix rules"
                  : money(result.annualTarget)}
              </strong>
            </div>
            <div>
              <span>
                {config.parts.some((part) => part.policy?.kind === "pool")
                  ? "Annual ceiling at entered GP*"
                  : "Annual payout ceiling*"}
              </span>
              <strong>
                {result.errors.length
                  ? "Fix rules"
                  : money(result.annualMaximum)}
              </strong>
            </div>
            <p>
              *All recipients combined. Target assumes every part can qualify at
              its goal; the ceiling assumes conditions can pass. Both are
              subject to the whole-plan limit.
            </p>
          </section>
          <div className="simple-section-heading composite-section-heading">
            <div>
              <h3>Payment parts</h3>
              <p>
                Add weekly, monthly, quarterly or annual payments. They add
                together.
              </p>
            </div>
            <button
              className="button secondary"
              onClick={() => {
                const fresh = newPart();
                update({ parts: [...config.parts, fresh] });
                setSelected(fresh.id);
              }}
            >
              <Plus size={15} />
              Add a part
            </button>
          </div>
          <div
            className="division-tabs composite-part-tabs"
            role="group"
            aria-label="Choose a payment part"
          >
            {config.parts.map((v, i) => (
              <button
                key={v.id}
                className={v.id === part?.id ? "selected" : ""}
                onClick={() => setSelected(v.id)}
              >
                Part {i + 1}: {v.name || "New part"}
              </button>
            ))}
          </div>
          {part && (
            <section className="composite-part">
              <div className="simple-section-heading">
                <h3>{part.name}</h3>
                <button
                  className="button secondary danger"
                  onClick={() => {
                    if (
                      confirm(
                        "Remove this payment part? Any other part that depends on it will need to be updated.",
                      )
                    )
                      update({
                        parts: config.parts.filter((v) => v.id !== part.id),
                      });
                  }}
                >
                  <Trash2 size={15} />
                  Remove part
                </button>
              </div>
              <div className="form-grid">
                <label>
                  Part name
                  <input
                    value={part.name}
                    onChange={(e) => updatePart({ name: e.target.value })}
                  />
                </label>
                <label>
                  What is measured?
                  <input
                    value={part.measure}
                    onChange={(e) => updatePart({ measure: e.target.value })}
                  />
                </label>
                <label>
                  Measured in
                  <input
                    placeholder="$ / truck, % of target, miles…"
                    value={part.unit}
                    onChange={(e) => updatePart({ unit: e.target.value })}
                  />
                </label>
                <label>
                  How often is it paid?
                  <select
                    aria-label="Part payment frequency"
                    disabled={
                      part.policy?.kind === "pool" ||
                      part.policy?.kind === "quarterly-weekly"
                    }
                    value={part.frequency}
                    onChange={(e) => {
                      const frequency = e.target
                        .value as PayoutPart["frequency"];
                      updatePart({
                        frequency,
                        periods: defaultCounts[frequency],
                      });
                    }}
                  >
                    {frequencies.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <Field
                  label="Number of payments in this year"
                  value={part.periods}
                  disabled={part.policy?.kind === "quarterly-weekly"}
                  max={
                    part.frequency === "Weekly"
                      ? 53
                      : defaultCounts[part.frequency]
                  }
                  onChange={(periods) =>
                    updatePart({ periods: Math.round(periods) })
                  }
                />
                <label>
                  How is this part worked out?
                  <select
                    aria-label="Part calculation method"
                    value={part.policy ? "policy" : part.method}
                    onChange={(e) =>
                      updatePart({
                        policy: undefined,
                        method: e.target.value as PayoutPart["method"],
                        cap: part.cap ?? 1000,
                      })
                    }
                  >
                    {part.policy && (
                      <option value="policy" disabled>
                        Comparison chart rule
                      </option>
                    )}
                    <option value="tiers">Payment table</option>
                    <option value="rate">Rate per unit / savings</option>
                    <option value="goal">Goal-based payment</option>
                  </select>
                </label>
                <Field
                  label={`Goal (${part.unit})`}
                  value={
                    part.policy?.kind === "pool"
                      ? resolved.composite!.parts.find((v) => v.id === part.id)!
                          .target
                      : part.target
                  }
                  disabled={part.policy?.kind === "pool"}
                  onChange={(target) => updatePart({ target })}
                />
                <Field
                  label={`Try a result (${part.unit})`}
                  value={
                    part.policy?.kind === "pool"
                      ? resolved.composite!.parts.find((v) => v.id === part.id)!
                          .actual
                      : part.actual
                  }
                  disabled={part.policy?.kind === "pool"}
                  onChange={(actual) => updatePart({ actual })}
                />
              </div>
              <p className="composite-input-help">
                Use a {part.frequency.toLowerCase()} result for this part. For
                “% of target,” enter 100 when the goal is met, 105 for 5% above
                it. Enter RWT as revenue per truck per week, not total company
                revenue.
              </p>
              {part.policy ? (
                <PolicyPartEditor
                  company={c}
                  part={part}
                  onPart={updatePart}
                  onCompany={onCompanyChange}
                />
              ) : part.method === "tiers" ? (
                <div className="composite-tiers">
                  <div className="simple-section-heading">
                    <div>
                      <h3>Payment table</h3>
                      <p>
                        {part.direction === "higher"
                          ? "At least the level shown earns that row’s payment. Below the first level pays zero."
                          : "At or below the level shown earns that row’s payment. Above the highest level pays zero."}{" "}
                        The last qualifying row applies; there is no automatic
                        accelerator.
                      </p>
                    </div>
                    <button
                      className="button secondary"
                      onClick={() =>
                        updatePart({
                          tiers: [
                            ...part.tiers,
                            {
                              id: id(),
                              at:
                                Math.max(0, ...part.tiers.map((t) => t.at)) +
                                100,
                              payout:
                                Math.max(
                                  0,
                                  ...part.tiers.map((t) => t.payout),
                                ) + 20,
                            },
                          ],
                        })
                      }
                    >
                      <Plus size={14} />
                      Add a level
                    </button>
                  </div>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>
                            {part.measure} ({part.unit})
                          </th>
                          <th>
                            {part.frequency} payment per{" "}
                            {part.basis === "shared" ? "team" : recipient} ($)
                          </th>
                          <th>Annual example ({part.periods} payments)</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {part.tiers.map((t) => (
                          <tr
                            key={t.id}
                            className={
                              t.at === part.target ? "target-tier" : ""
                            }
                          >
                            <td>
                              <input
                                aria-label={`Level ${t.id}`}
                                type="number"
                                min="0"
                                step="any"
                                value={t.at}
                                onChange={(e) =>
                                  updatePart({
                                    tiers: part.tiers.map((v) =>
                                      v.id === t.id
                                        ? {
                                            ...v,
                                            at: Math.max(0, +e.target.value),
                                          }
                                        : v,
                                    ),
                                  })
                                }
                              />
                              {t.at === part.target && (
                                <span className="target-label">Goal</span>
                              )}
                            </td>
                            <td>
                              <input
                                aria-label={`Payment at ${t.at}`}
                                type="number"
                                min="0"
                                step=".01"
                                value={t.payout}
                                onChange={(e) =>
                                  updatePart({
                                    tiers: part.tiers.map((v) =>
                                      v.id === t.id
                                        ? {
                                            ...v,
                                            payout: Math.max(
                                              0,
                                              +e.target.value,
                                            ),
                                          }
                                        : v,
                                    ),
                                  })
                                }
                              />
                            </td>
                            <td>
                              {money(
                                Math.min(t.payout, part.cap ?? Infinity) *
                                  part.periods,
                              )}
                            </td>
                            <td>
                              <button
                                aria-label={`Remove level ${t.at}`}
                                onClick={() =>
                                  updatePart({
                                    tiers: part.tiers.filter(
                                      (v) => v.id !== t.id,
                                    ),
                                  })
                                }
                              >
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : part.method === "rate" ? (
                <div className="form-grid composite-rule-fields">
                  <Field
                    label={
                      part.direction === "higher"
                        ? "Start paying above this result"
                        : "Pay for savings below this result"
                    }
                    value={part.startAt}
                    onChange={(startAt) => updatePart({ startAt })}
                  />
                  <Field
                    label={
                      part.displayAsPercent
                        ? "Commission rate (%)"
                        : `CAD paid for each ${part.unit} above / below the starting point`
                    }
                    value={part.displayAsPercent ? part.rate * 100 : part.rate}
                    onChange={(rate) =>
                      updatePart({
                        rate: part.displayAsPercent ? rate / 100 : rate,
                      })
                    }
                  />
                  <p>
                    Payment = the qualifying difference × the rate, limited by
                    the payment cap.
                  </p>
                </div>
              ) : (
                <div className="form-grid composite-rule-fields">
                  <Field
                    label="Normal payment at goal ($)"
                    value={part.targetPayout}
                    onChange={(targetPayout) => updatePart({ targetPayout })}
                  />
                  <Field
                    label="Start paying at (% of goal)"
                    value={part.threshold}
                    max={100}
                    onChange={(threshold) => updatePart({ threshold })}
                  />
                  <Field
                    label="Extra reward above goal (×)"
                    value={part.accelerator}
                    onChange={(accelerator) => updatePart({ accelerator })}
                  />
                  <p>
                    Higher-is-better compares result ÷ goal. Lower-is-better
                    compares goal ÷ result. Above goal, the extra reward
                    applies, up to the cap.
                  </p>
                </div>
              )}
              <details className="advanced-settings">
                <summary>More rules for this part</summary>
                <div className="form-grid">
                  <label>
                    A good result is
                    <select
                      value={part.direction}
                      disabled={!!part.policy}
                      onChange={(e) =>
                        updatePart({
                          direction: e.target.value as PayoutPart["direction"],
                        })
                      }
                    >
                      <option value="higher">A higher number</option>
                      <option value="lower">A lower number</option>
                    </select>
                  </label>
                  <label>
                    Who receives this part?
                    <select
                      value={part.basis}
                      onChange={(e) =>
                        updatePart({
                          basis: e.target.value as PayoutPart["basis"],
                        })
                      }
                    >
                      <option value="recipient">Each {recipient}</option>
                      <option value="shared">
                        One shared pool (not multiplied)
                      </option>
                    </select>
                  </label>
                  {part.method === "tiers" && (
                    <label>
                      Between table levels
                      <select
                        value={part.interpolation}
                        onChange={(e) =>
                          updatePart({
                            interpolation: e.target
                              .value as PayoutPart["interpolation"],
                          })
                        }
                      >
                        <option value="step">
                          Use the qualifying row only
                        </option>
                        <option value="linear">
                          Blend between the two levels
                        </option>
                      </select>
                    </label>
                  )}
                  {part.cap !== null && (
                    <Field
                      label="Maximum per payment ($)"
                      value={part.cap ?? 0}
                      onChange={(cap) => updatePart({ cap })}
                    />
                  )}
                  {part.method !== "tiers" && (
                    <label className="required-rule">
                      <input
                        type="checkbox"
                        checked={!!part.allowUncapped && part.cap === null}
                        onChange={(e) =>
                          updatePart({
                            allowUncapped: e.target.checked,
                            cap: e.target.checked ? null : 0,
                          })
                        }
                      />
                      No stated dollar cap (commission / pool-based)
                    </label>
                  )}
                  {part.method === "tiers" && (
                    <label>
                      <input
                        type="checkbox"
                        checked={part.cap === null}
                        onChange={(e) =>
                          updatePart({
                            cap: e.target.checked
                              ? null
                              : Math.max(0, ...part.tiers.map((t) => t.payout)),
                          })
                        }
                      />
                      Use table amounts without a separate payment cap
                    </label>
                  )}
                </div>
                <div className="part-requirements">
                  <h3>Required goals</h3>
                  <p>
                    These checks stop only this payment part. They do not take a
                    share of another payment.
                  </p>
                  {part.gates.map((g) => (
                    <div className="part-gate" key={g.id}>
                      <label>
                        Required goal name
                        <input
                          value={g.name}
                          onChange={(e) =>
                            updatePart({
                              gates: part.gates.map((v) =>
                                v.id === g.id
                                  ? { ...v, name: e.target.value }
                                  : v,
                              ),
                            })
                          }
                        />
                      </label>
                      <Field
                        label="Required number"
                        value={g.target}
                        onChange={(target) =>
                          updatePart({
                            gates: part.gates.map((v) =>
                              v.id === g.id ? { ...v, target } : v,
                            ),
                          })
                        }
                      />
                      <Field
                        label="Result"
                        value={g.actual}
                        onChange={(actual) =>
                          updatePart({
                            gates: part.gates.map((v) =>
                              v.id === g.id ? { ...v, actual } : v,
                            ),
                          })
                        }
                      />
                      <label>
                        Must be
                        <select
                          value={g.comparison}
                          onChange={(e) =>
                            updatePart({
                              gates: part.gates.map((v) =>
                                v.id === g.id
                                  ? {
                                      ...v,
                                      comparison: e.target.value as
                                        "at-least" | "at-most",
                                    }
                                  : v,
                              ),
                            })
                          }
                        >
                          <option value="at-least">
                            At least the required number
                          </option>
                          <option value="at-most">
                            At most the required number
                          </option>
                        </select>
                      </label>
                      <button
                        aria-label={`Remove required goal ${g.name}`}
                        onClick={() =>
                          updatePart({
                            gates: part.gates.filter((v) => v.id !== g.id),
                          })
                        }
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                  <button
                    className="button secondary"
                    onClick={() =>
                      updatePart({
                        gates: [
                          ...part.gates,
                          {
                            id: id(),
                            name: "Required goal",
                            actual: 100,
                            target: 100,
                            comparison: "at-least",
                          },
                        ],
                      })
                    }
                  >
                    <Plus size={14} />
                    Add a required goal
                  </button>
                  <h3>Only pay if another part pays</h3>
                  {config.parts
                    .filter((v) => v.id !== part.id)
                    .map((v) => (
                      <label className="required-rule" key={v.id}>
                        <input
                          type="checkbox"
                          checked={part.requires.includes(v.id)}
                          onChange={(e) =>
                            updatePart({
                              requires: e.target.checked
                                ? [...part.requires, v.id]
                                : part.requires.filter((ref) => ref !== v.id),
                            })
                          }
                        />
                        {v.name}
                      </label>
                    ))}
                  <p>
                    Do not create circular requirements. Missing or circular
                    requirements block the plan until fixed.
                  </p>
                </div>
                <div className="part-history">
                  <label className="required-rule">
                    <input
                      type="checkbox"
                      disabled={part.policy?.kind === "pool"}
                      checked={part.entries !== null}
                      onChange={(e) =>
                        updatePart({
                          entries: e.target.checked
                            ? Array.from(
                                { length: part.periods },
                                () => part.actual,
                              )
                            : null,
                        })
                      }
                    />
                    Use a separate result for every payment period
                  </label>
                  {part.entries !== null && (
                    <>
                      <p>
                        Enter exactly {part.periods} results, one per line.
                        Payments are calculated for each result and then added.
                        Text edits apply only when you click the button below.
                      </p>
                      <textarea
                        aria-label="Individual period results"
                        rows={6}
                        value={history}
                        onChange={(e) => setHistory(e.target.value)}
                      />
                      <button
                        className="button secondary"
                        onClick={() => {
                          const entries = history.trim()
                            ? history
                                .trim()
                                .split(/\r?\n/)
                                .map((s) => Number(s.trim()))
                            : [];
                          if (
                            entries.length !== part.periods ||
                            entries.some((v) => !Number.isFinite(v) || v < 0)
                          ) {
                            notify(
                              `Enter exactly ${part.periods} nonnegative results, one per line.`,
                            );
                            return;
                          }
                          updatePart({ entries });
                          notify("Individual period results applied.");
                        }}
                      >
                        Apply period results
                      </button>
                    </>
                  )}
                </div>
              </details>
            </section>
          )}
          <section className="composite-eligibility">
            <div className="simple-section-heading">
              <div>
                <h3>Who qualifies for any payment?</h3>
                <p>
                  Example checks are ticked below. Confirm them for the actual
                  recipients. Any unticked check stops the whole plan.
                </p>
              </div>
              <button
                className="button secondary"
                onClick={() =>
                  update({
                    eligibility: [
                      ...config.eligibility,
                      {
                        id: id(),
                        label: "New eligibility requirement",
                        passed: false,
                      },
                    ],
                  })
                }
              >
                <Plus size={15} />
                Add a check
              </button>
            </div>
            {config.eligibility.map((g) => (
              <div className="eligibility-row" key={g.id}>
                <input
                  aria-label={`Eligibility: ${g.label}`}
                  type="checkbox"
                  checked={g.passed}
                  onChange={(e) =>
                    update({
                      eligibility: config.eligibility.map((v) =>
                        v.id === g.id ? { ...v, passed: e.target.checked } : v,
                      ),
                    })
                  }
                />
                <input
                  aria-label="Eligibility rule text"
                  value={g.label}
                  onChange={(e) =>
                    update({
                      eligibility: config.eligibility.map((v) =>
                        v.id === g.id ? { ...v, label: e.target.value } : v,
                      ),
                    })
                  }
                />
                <button
                  aria-label={`Remove eligibility ${g.label}`}
                  onClick={() =>
                    update({
                      eligibility: config.eligibility.filter(
                        (v) => v.id !== g.id,
                      ),
                    })
                  }
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            <details className="advanced-settings">
              <summary>Whole-plan annual limit (optional)</summary>
              <label className="required-rule">
                <input
                  type="checkbox"
                  checked={config.annualCap !== null}
                  onChange={(e) =>
                    update({
                      annualCap: e.target.checked ? result.annualMaximum : null,
                    })
                  }
                />
                Limit the combined annual payout across all recipients
              </label>
              {config.annualCap !== null && (
                <Field
                  label="Maximum annual payout for this whole plan ($)"
                  value={config.annualCap}
                  onChange={(annualCap) => update({ annualCap })}
                />
              )}
            </details>
          </section>
          <section className="composite-breakdown">
            <h3>How the parts add together</h3>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Part</th>
                    <th>Frequency</th>
                    <th>Payments / year</th>
                    <th>Annual projection (all recipients)</th>
                    <th>Annual ceiling*</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {config.parts.map((v, i) => {
                    const r = result.parts[i];
                    return (
                      <tr key={v.id}>
                        <td>{v.name}</td>
                        <td>{v.frequency}</td>
                        <td>{v.periods}</td>
                        <td>
                          {result.errors.length ? "Fix rules" : money(r.annual)}
                        </td>
                        <td>{result.errors.length ? "—" : money(r.maximum)}</td>
                        <td>
                          {!p.enabled
                            ? "Excluded"
                            : !result.gatesPassed
                              ? "Not eligible"
                              : !r.conditionsPassed
                                ? "Requirement missed"
                                : v.entries
                                  ? "Individual results"
                                  : "Repeated result"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="plain-note">
              Annual projections repeat the entered result for each payment
              unless individual period results are supplied. They are estimates,
              not a weekly payroll history. Whole-plan caps apply after parts
              add together, so individual rows may sum to more than the final
              capped total.
            </div>
          </section>
          {result.errors.length ? (
            <div className="validation bad" role="alert">
              {result.errors.join(" ")}
            </div>
          ) : (
            <div
              className={"validation " + (result.gatesPassed ? "good" : "bad")}
            >
              <CheckCircle2 size={16} />
              {result.gatesPassed
                ? "Plan rules are ready to test."
                : "An eligibility check is not met. The whole plan pays zero."}
            </div>
          )}
          <div className="plain-note composite-budget-note">
            Company results use a {c.period.toLowerCase()} budget equivalent:{" "}
            {money(result.payout)} for this plan. Annual costs are divided by{" "}
            {result.divisor}, after recipient counts and caps. This is a budget
            allowance, not the timing of weekly payments or annual cash bonuses.
          </div>
        </div>
      )}
      <div className="editor-footer">
        <button
          className="button secondary"
          onClick={() => setMode(mode === "edit" ? "handout" : "edit")}
        >
          {mode === "edit" ? "View plan handout" : "Back to editing"}
        </button>
        <button className="button primary" onClick={onNext}>
          Check company results <ArrowRight size={16} />
        </button>
      </div>
    </section>
  );
}
function PlanHandout({ plan: p, included }: { plan: Plan; included: boolean }) {
  const c = p.composite!,
    r = compositeResult({ ...p, reportingPeriod: "Annual" }),
    count = c.recipient === "team" ? 1 : p.participants,
    recipient =
      c.recipient === "employee"
        ? "employee"
        : c.recipient === "truck"
          ? "truck"
          : "team";
  return (
    <article className="plan-sheet">
      <header className="sheet-header">
        <div>
          {brand.logoPath && (
            <img
              src={brand.logoPath}
              width={1500}
              height={401}
              alt="Q-Line Trucking"
            />
          )}
          <span>DRIVE PERFORMANCE. BUILD PROFITABILITY.</span>
        </div>
        <h1>{p.name}</h1>
        <p>
          {p.department} · {p.role} · All amounts CAD
        </p>
      </header>
      <div className="sheet-columns">
        <aside className="sheet-purpose">
          <h2>Purpose</h2>
          <p>{c.purpose || "Reward the results that matter."}</p>
          <h2>How it works</h2>
          <p>
            The payment parts below add together. This plan covers {count}{" "}
            {recipient}
            {count === 1 ? "" : "s"}.
          </p>
          <h2>Eligibility</h2>
          <ul>
            {c.eligibility.map((v) => (
              <li key={v.id}>
                {v.label} {!v.passed && <strong>(not met)</strong>}
              </li>
            ))}
          </ul>
          <p>
            RWT means revenue per week per truck. Use Q-Line’s approved
            definitions for revenue, profitability, eligibility, and payment
            timing.
          </p>
        </aside>
        <div className="sheet-parts">
          {c.parts.map((part, i) => (
            <section
              className={"sheet-part sheet-part-" + (i % 2)}
              key={part.id}
            >
              <div className="sheet-part-title">
                <span>PART {i + 1}</span>
                <h2>{part.name}</h2>
                <p>{part.measure}</p>
              </div>
              {part.policy ? (
                <PolicyHandout part={part} />
              ) : part.method === "tiers" ? (
                <table>
                  <thead>
                    <tr>
                      <th>
                        {part.measure} ({part.unit})
                      </th>
                      <th>
                        {part.frequency} payout per{" "}
                        {part.basis === "shared" ? "team" : recipient}
                      </th>
                      {part.frequency !== "Annual" && (
                        <th>Annual example ({part.periods} payments)</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        {part.direction === "higher"
                          ? part.tiers.length
                            ? "Below " +
                              (part.unit === "$"
                                ? money(
                                    Math.min(...part.tiers.map((v) => v.at)),
                                  )
                                : Math.min(...part.tiers.map((v) => v.at)) +
                                  " " +
                                  part.unit)
                            : "Add a payment level"
                          : part.tiers.length
                            ? "Above " +
                              (part.unit === "$"
                                ? money(
                                    Math.max(...part.tiers.map((v) => v.at)),
                                  )
                                : Math.max(...part.tiers.map((v) => v.at)) +
                                  " " +
                                  part.unit)
                            : "Add a payment level"}
                      </td>
                      <td>{money(0)}</td>
                      {part.frequency !== "Annual" && <td>{money(0)}</td>}
                    </tr>
                    {[...part.tiers]
                      .sort((a, b) =>
                        part.direction === "higher" ? a.at - b.at : b.at - a.at,
                      )
                      .map((t, index, rows) => (
                        <tr
                          key={t.id}
                          className={t.at === part.target ? "sheet-target" : ""}
                        >
                          <td>
                            {part.unit === "$"
                              ? money(t.at)
                              : t.at + " " + part.unit}
                            {t.at === part.target
                              ? " (Goal)"
                              : index === rows.length - 1 &&
                                  part.direction === "higher"
                                ? "+"
                                : ""}
                          </td>
                          <td>
                            {money(Math.min(t.payout, part.cap ?? Infinity))}
                          </td>
                          {part.frequency !== "Annual" && (
                            <td>
                              {money(
                                Math.min(t.payout, part.cap ?? Infinity) *
                                  part.periods,
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                  </tbody>
                </table>
              ) : (
                <div className="sheet-formula">
                  <strong>
                    {part.method === "rate"
                      ? "Rate-based payment"
                      : "Goal-based payment"}
                  </strong>
                  <p>
                    {part.method === "rate"
                      ? `${part.direction === "higher" ? "Above" : "Below"} ${part.startAt} ${part.unit}: ${part.displayAsPercent ? (part.rate * 100).toLocaleString("en-CA", { maximumFractionDigits: 4 }) + "% of qualifying revenue" : "CAD " + part.rate.toLocaleString("en-CA", { maximumFractionDigits: 6 }) + " per qualifying unit"}.`
                      : `At ${part.target} ${part.unit}: ${money(part.targetPayout)} per payment. Start paying at ${part.threshold}% of goal.`}
                  </p>
                  <p>
                    Payment limit:{" "}
                    {part.cap === null ? "No separate limit" : money(part.cap)}.{" "}
                    {part.periods} payments per year.
                  </p>
                </div>
              )}
              <div className="sheet-part-notes">
                {part.interpolation === "linear" && part.method === "tiers" && (
                  <p>
                    Between listed levels, payments are blended in a straight
                    line.
                  </p>
                )}
                {part.gates.length > 0 && (
                  <p>
                    Required:{" "}
                    {part.gates
                      .map(
                        (g) =>
                          `${g.name} ${g.comparison === "at-least" ? "at least" : "at most"} ${g.target}`,
                      )
                      .join("; ")}
                    .
                  </p>
                )}
                {part.requires.length > 0 && (
                  <p>
                    Also requires a positive payment from:{" "}
                    {part.requires
                      .map(
                        (ref) =>
                          c.parts.find((v) => v.id === ref)?.name ||
                          "Removed part — fix rules",
                      )
                      .join(", ")}
                    .
                  </p>
                )}
                <p>
                  {part.basis === "shared"
                    ? "One shared payment; not multiplied by recipient count."
                    : `Payment shown for one ${recipient}.`}{" "}
                  Annual figures are examples, not guarantees.
                </p>
              </div>
            </section>
          ))}
        </div>
      </div>
      <section className="sheet-total">
        <div>
          <h2>Total annual incentive at all goals</h2>
          <p>
            {count} {recipient}
            {count === 1 ? "" : "s"} · Parts added together · subject to
            eligibility and limits
          </p>
        </div>
        <strong>
          {r.errors.length ? "Fix plan rules" : money(r.annualTarget)}
        </strong>
      </section>
      <div className="sheet-current">
        <span>
          At the results entered:{" "}
          <strong>
            {r.errors.length ? "Incomplete" : money(r.annualPayout)}
          </strong>
        </span>
        <span>
          Annual payout ceiling*:{" "}
          <strong>
            {r.errors.length ? "Incomplete" : money(r.annualMaximum)}
          </strong>
        </span>
      </div>
      {(!included || !r.gatesPassed) && (
        <p className="sheet-warning">
          This plan is currently excluded or an eligibility check is not met.
          This is a what-if projection; excluded plans are not counted in the
          company total.
        </p>
      )}
      {r.errors.length > 0 && (
        <p className="sheet-warning">{r.errors.join(" ")}</p>
      )}
      <footer>
        *The ceiling assumes requirements can pass. Annual examples repeat
        results across all scheduled payments. Per-period values are rounded to
        cents before being added. Whole-plan annual cap:{" "}
        {c.annualCap === null ? "none" : money(c.annualCap)}. This handout
        describes a planning scenario; use the approved written policy for
        actual payroll.
      </footer>
    </article>
  );
}
