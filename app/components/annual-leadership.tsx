"use client";
import { useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Copy,
  Download,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Company, id } from "../../lib/workspace";
import {
  AnnualGoal,
  LeadershipPlan,
  annualResult,
  newAnnualGoal,
  newLeadershipPlan,
  splitAnnualShares,
} from "../../lib/leadership";
import { Field } from "./simple-setup";
const money = (v: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(v);
export function AnnualLeadership({
  company: c,
  onChange,
  notify,
}: {
  company: Company;
  onChange: (v: Partial<Company>) => void;
  notify: (s: string) => void;
}) {
  const [selected, setSelected] = useState(""),
    [estimateName, setEstimateName] = useState("");
  const plans = c.leadershipPlans ?? [];
  const p = plans.find((p) => p.id === selected) || plans[0];
  const result = p ? annualResult(p) : null;
  const update = (value: LeadershipPlan) =>
    onChange({
      leadershipPlans: plans.map((plan) =>
        plan.id === value.id ? value : plan,
      ),
    });
  const changeGoal = (g: AnnualGoal) => {
    if (p) update({ ...p, goals: p.goals.map((v) => (v.id === g.id ? g : v)) });
  };
  const add = () => {
    const fresh = newLeadershipPlan(
      new Date().getFullYear(),
      c.departments[0]?.name || "Company-wide",
    );
    onChange({ leadershipPlans: [...plans, fresh] });
    setSelected(fresh.id);
  };
  const yearPlans = p ? plans.filter((v) => v.year === p.year) : [];
  const yearResults = yearPlans.map((v) => annualResult(v));
  const incomplete = yearResults.some((r) => r.errors.length);
  const yearBonus = yearResults.reduce((s, r) => s + r.bonus, 0);
  const yearMax = yearResults.reduce((s, r) => s + r.maximum, 0);
  const exportEstimate = () => {
    if (!p || !result) return;
    const blob = new Blob(
      [
        JSON.stringify(
          {
            company: c.company,
            annualPlan: p,
            projection: result,
            assumptions:
              "Annual full-year base salary plus projected cash bonus, before personal taxes. Other pay and benefits excluded. Leadership plans are not included in the regular bonus-plan results.",
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `annual-leadership-${p.year}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <>
      <div className="setup-banner annual-intro">
        <span className="setup-icon">
          <BriefcaseBusiness size={23} />
        </span>
        <div>
          <strong>Plan the full year, one leader at a time.</strong>
          <p>
            Set the normal bonus, add annual goals, and see the person’s
            potential salary plus bonus.
          </p>
        </div>
        <button onClick={add}>
          <Plus size={16} />
          Add a person
        </button>
      </div>
      <div className="plain-note">
        <ShieldCheck size={18} />
        <span>
          This is a separate annual calculator. Enter full-year goals, even if
          your other plans are monthly. These bonuses are not added to the
          regular bonus-plan results. Example numbers are starting points, not
          your company’s policy.
        </span>
      </div>
      {!p || !result ? (
        <section className="panel annual-empty">
          <BriefcaseBusiness size={42} />
          <h2>Annual bonuses for directors and senior managers</h2>
          <p>
            Start with an editable example. You can save a separate plan for
            each person, position, and year.
          </p>
          <button className="button primary" onClick={add}>
            Start an annual plan <ArrowRight size={16} />
          </button>
        </section>
      ) : (
        <>
          <div
            className="annual-roster"
            role="group"
            aria-label="Annual leadership plans"
          >
            {plans.map((v) => (
              <button
                key={v.id}
                className={v.id === p.id ? "selected" : ""}
                onClick={() => {
                  setSelected(v.id);
                  setEstimateName("");
                }}
              >
                <strong>{v.name || "Unnamed plan"}</strong>
                <span>
                  {v.role} · {v.year}
                </span>
              </button>
            ))}
          </div>
          <div className="annual-toolbar">
            <span>{c.company} · Annual planning</span>
            <div>
              <button
                className="button secondary"
                onClick={() => {
                  const copy = {
                    ...structuredClone(p),
                    id: id(),
                    name: p.name + " (copy)",
                    adjustment: { ...p.adjustment, recorded: false },
                  };
                  onChange({ leadershipPlans: [...plans, copy] });
                  setSelected(copy.id);
                }}
              >
                <Copy size={15} />
                Copy plan
              </button>
              <button
                className="button secondary"
                disabled={!!result.errors.length}
                onClick={exportEstimate}
              >
                <Download size={15} />
                Export estimate
              </button>
              <button
                className="button secondary danger"
                onClick={() => {
                  if (confirm(`Delete ${p.name} and its saved estimates?`))
                    onChange({
                      leadershipPlans: plans.filter((v) => v.id !== p.id),
                    });
                }}
              >
                <Trash2 size={15} />
                Delete
              </button>
            </div>
          </div>
          <div className="annual-layout">
            <div>
              <section className="panel simple-editor">
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">
                      1. THE PERSON AND NORMAL BONUS
                    </span>
                    <h2>What could they earn this year?</h2>
                    <p>
                      All salary and bonus amounts are in USD, before personal
                      taxes.
                    </p>
                  </div>
                </div>
                <div className="form-grid">
                  <label>
                    Person or plan name
                    <input
                      value={p.name}
                      onChange={(e) => update({ ...p, name: e.target.value })}
                    />
                  </label>
                  <label>
                    Job title
                    <input
                      list="leadership-roles"
                      value={p.role}
                      onChange={(e) => update({ ...p, role: e.target.value })}
                    />
                  </label>
                  <datalist id="leadership-roles">
                    <option value="Director" />
                    <option value="Senior Manager" />
                    <option value="Vice President" />
                    <option value="General Manager" />
                    <option value="Chief Operating Officer" />
                  </datalist>
                  <label>
                    Division or team
                    <input
                      list="leadership-divisions"
                      value={p.division}
                      onChange={(e) =>
                        update({ ...p, division: e.target.value })
                      }
                    />
                  </label>
                  <datalist id="leadership-divisions">
                    <option value="Company-wide" />
                    {c.departments.map((d) => (
                      <option key={d.id} value={d.name} />
                    ))}
                  </datalist>
                  <Field
                    label="Bonus year"
                    value={p.year}
                    min={2000}
                    max={2200}
                    onChange={(year) =>
                      update({ ...p, year: Math.round(year) })
                    }
                  />
                  <Field
                    label="Annual base salary ($)"
                    value={p.salary}
                    onChange={(salary) => update({ ...p, salary })}
                    help="Full-year salary before bonuses. This calculator does not prorate salary."
                  />
                  <Field
                    label="Normal bonus (% of salary)"
                    min={20}
                    max={40}
                    value={p.bonusPercent}
                    onChange={(bonusPercent) => update({ ...p, bonusPercent })}
                    help="Choose 20% to 40%. For example, 30% of a $150,000 salary is a $45,000 normal bonus."
                  />
                </div>
                <div className="annual-target-strip">
                  <span>Normal annual bonus at full eligibility</span>
                  <strong>{money((p.salary * p.bonusPercent) / 100)}</strong>
                </div>
                <details className="advanced-settings annual-settings">
                  <summary>Bonus limits and eligibility (optional)</summary>
                  <div className="form-grid">
                    <Field
                      label="Eligible share of normal bonus (%)"
                      value={p.eligiblePercent}
                      max={100}
                      onChange={(eligiblePercent) =>
                        update({ ...p, eligiblePercent })
                      }
                      help="100% means the full normal bonus. Use a smaller share if the bonus needs to be prorated. Salary stays full-year."
                    />
                    <Field
                      label="Highest bonus (% of normal bonus)"
                      value={p.cap}
                      onChange={(cap) => update({ ...p, cap })}
                      help="200% means the bonus cannot exceed twice the normal eligible bonus."
                    />
                  </div>
                </details>
              </section>
              <section className="panel simple-editor">
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">2. THE ANNUAL GOALS</span>
                    <h2>What earns the bonus?</h2>
                    <p>
                      Use company goals, division goals, and personal goals.
                      Enter full-year goals and expected results.
                    </p>
                  </div>
                </div>
                <div className="share-explainer">
                  <span>
                    Shares tell us how much each goal matters. They must add up
                    to 100%. Adding or removing a goal splits shares equally.
                  </span>
                  <button
                    onClick={() =>
                      update({ ...p, goals: splitAnnualShares(p.goals) })
                    }
                  >
                    Split bonus equally
                  </button>
                </div>
                <div className="metric-editor-list">
                  {p.goals.map((g, index) => (
                    <section className="metric-editor" key={g.id}>
                      <div className="metric-editor-heading">
                        <label>
                          Goal {index + 1}
                          <input
                            aria-label={`Annual goal ${index + 1} name`}
                            value={g.name}
                            onChange={(e) =>
                              changeGoal({ ...g, name: e.target.value })
                            }
                          />
                        </label>
                        <button
                          aria-label={`Remove annual goal ${g.name}`}
                          onClick={() =>
                            update({
                              ...p,
                              goals: splitAnnualShares(
                                p.goals.filter((v) => v.id !== g.id),
                              ),
                            })
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="metric-fields simple-metric-fields">
                        <label>
                          Who owns this goal?
                          <select
                            aria-label={`${g.name} owner`}
                            value={g.level}
                            onChange={(e) =>
                              changeGoal({
                                ...g,
                                level: e.target.value as AnnualGoal["level"],
                              })
                            }
                          >
                            <option value="company">Company</option>
                            <option value="division">Division or team</option>
                            <option value="individual">This person</option>
                          </select>
                        </label>
                        <label>
                          Unit
                          <input
                            aria-label={`${g.name} unit`}
                            value={g.unit}
                            onChange={(e) =>
                              changeGoal({ ...g, unit: e.target.value })
                            }
                          />
                        </label>
                        <Field
                          label={`${g.name} annual goal`}
                          value={g.target}
                          min={g.gate ? 0 : 0.001}
                          onChange={(target) => changeGoal({ ...g, target })}
                        />
                        <Field
                          label={`${g.name} expected result`}
                          value={g.actual}
                          onChange={(actual) => changeGoal({ ...g, actual })}
                        />
                        {!g.gate && (
                          <Field
                            label={`${g.name} bonus share (%)`}
                            value={g.weight}
                            max={100}
                            onChange={(weight) => changeGoal({ ...g, weight })}
                          />
                        )}
                        <label>
                          A good result is
                          <select
                            aria-label={`${g.name} direction`}
                            value={g.direction}
                            onChange={(e) =>
                              changeGoal({
                                ...g,
                                direction: e.target
                                  .value as AnnualGoal["direction"],
                              })
                            }
                          >
                            <option value="higher">A higher number</option>
                            <option value="lower">A lower number</option>
                          </select>
                        </label>
                      </div>
                      {g.gate && (
                        <div className="safety-note">
                          Required rule: if this goal is missed, the entire
                          annual bonus is zero. This goal takes no share of the
                          bonus.
                        </div>
                      )}
                      <details className="advanced-settings">
                        <summary>More rules for this goal</summary>
                        {!g.gate && (
                          <div className="metric-fields">
                            <Field
                              label="Start paying at (% of goal)"
                              value={g.threshold}
                              max={100}
                              onChange={(threshold) =>
                                changeGoal({ ...g, threshold })
                              }
                            />
                            <Field
                              label="Highest payment (% of normal share)"
                              max={100}
                              value={g.cap}
                              onChange={(cap) => changeGoal({ ...g, cap })}
                            />
                          </div>
                        )}
                        <label className="required-rule">
                          <input
                            type="checkbox"
                            checked={g.gate}
                            onChange={(e) =>
                              update({
                                ...p,
                                goals: splitAnnualShares(
                                  p.goals.map((v) =>
                                    v.id === g.id
                                      ? { ...v, gate: e.target.checked }
                                      : v,
                                  ),
                                ),
                              })
                            }
                          />
                          This goal must be met before any bonus is paid
                        </label>
                        <p>
                          For example, require the company to reach a minimum
                          gross margin. A zero-incident required rule may have a
                          goal of 0. Other goals must be above 0.
                        </p>
                      </details>
                    </section>
                  ))}
                </div>
                <div className="annual-add-goal">
                  <button
                    className="button secondary"
                    onClick={() =>
                      update({
                        ...p,
                        goals: splitAnnualShares([...p.goals, newAnnualGoal()]),
                      })
                    }
                  >
                    <Plus size={16} />
                    Add an annual goal
                  </button>
                </div>
                {result.errors.length ? (
                  <div className="validation bad" role="alert">
                    {result.errors.join(" ")}
                  </div>
                ) : (
                  <div className="validation good">
                    <CheckCircle2 size={17} />
                    Bonus shares add up to 100%.
                  </div>
                )}
                <details className="advanced-settings annual-settings">
                  <summary>How each goal affects the bonus</summary>
                  <p>
                    Each goal earns a share of the normal bonus. Below its
                    starting level it pays zero. At the goal it pays the normal
                    share. Better results can pay more, up to the goal’s limit
                    and the overall bonus limit. Higher-is-better compares
                    result ÷ goal; lower-is-better compares goal ÷ result. A
                    required rule can stop the entire bonus. Company, division,
                    and personal goals use the numbers entered here; they are
                    not copied from your monthly plans.
                  </p>
                </details>
              </section>
            </div>
            <aside className="annual-projection">
              <section className="panel annual-pay-card">
                <span className="eyebrow">
                  3. PROJECTED ANNUAL EARNINGS · {p.year}
                </span>
                <h2>{p.name || "Your annual estimate"}</h2>
                <div className="annual-total">
                  <span>Salary + projected bonus</span>
                  <strong>
                    {result.errors.length
                      ? "Check goals"
                      : money(result.totalCash)}
                  </strong>
                </div>
                <div className="pay-line">
                  <span>Full-year base salary</span>
                  <strong>{money(p.salary)}</strong>
                </div>
                <div className="pay-line">
                  <span>Projected bonus</span>
                  <strong>
                    {result.errors.length ? "—" : money(result.bonus)}
                  </strong>
                </div>
                <div className="pay-line">
                  <span>Normal eligible bonus</span>
                  <strong>{money(result.targetBonus)}</strong>
                </div>
                <div className="pay-line">
                  <span>Maximum at current adjustment</span>
                  <strong>
                    {result.errors.length ? "—" : money(result.maximum)}
                  </strong>
                </div>
                <div className="pay-line">
                  <span>Bonus before discretionary adjustment</span>
                  <strong>
                    {result.errors.length
                      ? "—"
                      : money(result.performanceBonus)}
                  </strong>
                </div>
                <div className="pay-line">
                  <span>Recorded CEO/CFO multiplier</span>
                  <strong>{result.appliedMultiplier}×</strong>
                </div>
                {!result.gatesPassed && (
                  <div className="validation bad">
                    A required goal was missed. The bonus is $0; base salary is
                    unchanged.
                  </div>
                )}
                <div className="plain-note">
                  This is a planning estimate, not a promised payment. It
                  excludes benefits, equity, other pay, and personal taxes.
                </div>
              </section>
              <section className="panel annual-scenarios">
                <h3>Compare 20%–40% of base salary</h3>
                <p className="range-help">
                  At the expected results entered. Each option uses the same
                  goals, eligibility, and any recorded CEO/CFO multiplier.
                </p>
                {[20, 30, 40].map((percent) => {
                  const r = annualResult({ ...p, bonusPercent: percent });
                  return (
                    <div className="annual-range-row" key={percent}>
                      <span>
                        {percent}% bonus target
                        <small>
                          Normal eligible bonus: {money(r.targetBonus)}
                        </small>
                      </span>
                      <strong>
                        {r.errors.length ? "Check goals" : money(r.totalCash)}
                        <small>Salary + bonus</small>
                      </strong>
                    </div>
                  );
                })}
                <small>
                  The earned bonus may be below 20% of salary if goals are
                  missed. A recorded CEO/CFO accelerator may increase it.
                </small>
              </section>
              <section className="panel annual-scenarios">
                <h3>At your chosen {p.bonusPercent}% target</h3>
                <div>
                  <span>If every goal is met exactly</span>
                  <strong>
                    {result.errors.length
                      ? "Check goals"
                      : money(p.salary + result.atGoal)}
                  </strong>
                </div>
                <div>
                  <span>Maximum at the current recorded adjustment*</span>
                  <strong>
                    {result.errors.length
                      ? "Check goals"
                      : money(result.maximumCash)}
                  </strong>
                </div>
                <small>
                  *Assumes all required goals pass. There is no automatic extra
                  payment for exceeding a goal. Policy bonus ceiling:{" "}
                  {money(result.policyCeiling)}.
                </small>
              </section>
              <section className="panel annual-estimate-save">
                <h3>Save a what-if estimate</h3>
                <p>
                  Try different expected results, then save a named copy to
                  compare later.
                </p>
                <label>
                  Estimate name
                  <input
                    value={estimateName}
                    placeholder="For example, conservative year"
                    onChange={(e) => setEstimateName(e.target.value)}
                  />
                </label>
                <button
                  className="button primary"
                  disabled={!!result.errors.length}
                  onClick={() => {
                    if (!estimateName.trim()) {
                      notify("Give this estimate a name first.");
                      return;
                    }
                    update({
                      ...p,
                      estimates: [
                        ...p.estimates,
                        {
                          id: id(),
                          name: estimateName.trim(),
                          results: Object.fromEntries(
                            p.goals.map((g) => [g.id, g.actual]),
                          ),
                        },
                      ],
                    });
                    setEstimateName("");
                    notify("Annual estimate saved.");
                  }}
                >
                  <Save size={15} />
                  Save this estimate
                </button>
              </section>
            </aside>
          </div>
          <details className="panel leadership-decision">
            <summary>CEO / CFO: record a discretionary accelerator</summary>
            <p>
              Normal goal payments are capped at 100% of their share. Record an
              existing CEO/CFO decision here to apply an extra multiplier to the
              earned bonus. It stays subject to the overall bonus limit.
            </p>
            <p className="decision-boundary">
              This records a decision for planning. It does not verify the
              approver’s identity or provide a role-based approval workflow.
            </p>
            <div className="form-grid">
              <Field
                label="Approved bonus multiplier (×)"
                value={p.adjustment.multiplier}
                min={1}
                onChange={(multiplier) =>
                  update({
                    ...p,
                    adjustment: {
                      ...p.adjustment,
                      multiplier,
                      recorded: false,
                    },
                  })
                }
                help="1 means no extra accelerator. 1.2 adds 20% to the bonus earned from goals."
              />
              <label>
                Decision made by
                <select
                  aria-label="CEO or CFO decision"
                  value={p.adjustment.role}
                  onChange={(e) =>
                    update({
                      ...p,
                      adjustment: {
                        ...p.adjustment,
                        role: e.target.value as "CEO" | "CFO" | "",
                        recorded: false,
                      },
                    })
                  }
                >
                  <option value="">Choose CEO or CFO</option>
                  <option value="CEO">CEO</option>
                  <option value="CFO">CFO</option>
                </select>
              </label>
              <label>
                Approver name
                <input
                  value={p.adjustment.name}
                  onChange={(e) =>
                    update({
                      ...p,
                      adjustment: {
                        ...p.adjustment,
                        name: e.target.value,
                        recorded: false,
                      },
                    })
                  }
                />
              </label>
              <label>
                Reason for the decision
                <input
                  value={p.adjustment.reason}
                  onChange={(e) =>
                    update({
                      ...p,
                      adjustment: {
                        ...p.adjustment,
                        reason: e.target.value,
                        recorded: false,
                      },
                    })
                  }
                />
              </label>
            </div>
            <div className="editor-footer">
              <span>
                {p.adjustment.recorded
                  ? "Decision recorded. The multiplier is included in projections."
                  : "Not applied. Projections use goal results only until a decision is recorded."}
              </span>
              <div className="profile-actions">
                <button
                  className="button secondary"
                  onClick={() =>
                    update({
                      ...p,
                      adjustment: {
                        multiplier: 1,
                        role: "",
                        name: "",
                        reason: "",
                        recorded: false,
                      },
                    })
                  }
                >
                  Remove accelerator
                </button>
                <button
                  className="button primary"
                  onClick={() => {
                    if (
                      !p.adjustment.role ||
                      !p.adjustment.name.trim() ||
                      !p.adjustment.reason.trim()
                    ) {
                      notify("Enter the CEO/CFO role, name, and reason first.");
                      return;
                    }
                    update({
                      ...p,
                      adjustment: { ...p.adjustment, recorded: true },
                    });
                    notify("CEO/CFO decision recorded for this projection.");
                  }}
                >
                  Record decision
                </button>
              </div>
            </div>
          </details>
          <section className="panel annual-comparison">
            <div className="panel-heading">
              <div>
                <h2>Saved what-if estimates</h2>
                <p>
                  Each uses the saved goal results with the current salary and
                  rules. If you add a goal, older estimates will need its
                  result.
                </p>
              </div>
            </div>
            {p.estimates.length ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Estimate</th>
                      <th>Annual bonus</th>
                      <th>Salary + bonus</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.estimates.map((e) => {
                      const r = annualResult(p, e.results);
                      return (
                        <tr key={e.id}>
                          <td>{e.name}</td>
                          <td>
                            {r.errors.length
                              ? "Needs updated results"
                              : money(r.bonus)}
                          </td>
                          <td>{r.errors.length ? "—" : money(r.totalCash)}</td>
                          <td>
                            <div className="estimate-actions">
                              <button
                                className="button secondary"
                                disabled={!!r.errors.length}
                                onClick={() => {
                                  update({
                                    ...p,
                                    goals: p.goals.map((g) => ({
                                      ...g,
                                      actual: e.results[g.id],
                                    })),
                                  });
                                  notify(
                                    "Saved results loaded into this annual plan.",
                                  );
                                }}
                              >
                                Use these results
                              </button>
                              <button
                                aria-label={`Delete estimate ${e.name}`}
                                onClick={() => {
                                  if (confirm(`Delete estimate ${e.name}?`))
                                    update({
                                      ...p,
                                      estimates: p.estimates.filter(
                                        (v) => v.id !== e.id,
                                      ),
                                    });
                                }}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="annual-no-estimates">
                No saved estimates yet. Save a conservative, expected, or
                strong-year estimate to compare.
              </p>
            )}
          </section>
          <section className="panel annual-year-summary">
            <div className="panel-heading">
              <div>
                <h2>Annual leadership bonus cost · {p.year}</h2>
                <p>
                  {yearPlans.length} saved leadership{" "}
                  {yearPlans.length === 1 ? "plan" : "plans"} for this year.
                  Separate from regular bonus plans.
                </p>
              </div>
            </div>
            <div className="scenario-results">
              <div>
                <span>Projected bonus payments</span>
                <strong>{incomplete ? "Check goals" : money(yearBonus)}</strong>
              </div>
              <div>
                <span>Bonus cost with employer costs</span>
                <strong>
                  {incomplete
                    ? "Check goals"
                    : money(yearBonus * (1 + c.overhead / 100))}
                </strong>
              </div>
              <div>
                <span>Maximum bonus payments</span>
                <strong>{incomplete ? "Check goals" : money(yearMax)}</strong>
              </div>
              <div>
                <span>Maximum with employer costs</span>
                <strong>
                  {incomplete
                    ? "Check goals"
                    : money(yearMax * (1 + c.overhead / 100))}
                </strong>
              </div>
            </div>
            <div className="rule-note">
              Employer costs use the {c.overhead}% rate in the company settings.
              Base salaries are excluded from these bonus costs. Each saved plan
              is counted once; copied plans also count, so remove copies you do
              not want in the total. Plans for other years are not included.
            </div>
          </section>
        </>
      )}
    </>
  );
}
