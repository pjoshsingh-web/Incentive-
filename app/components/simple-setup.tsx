"use client";
import { formatMoney as money } from "../../lib/currency";
import { useState } from "react";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Plus,
  Trash2,
  Users,
  Target,
  Wallet,
} from "lucide-react";
import {
  Company,
  Department,
  Metric,
  id,
  industries,
} from "../../lib/workspace";
import {
  BusinessMeasure,
  Scorecard,
  companyScorecard,
  divisionScorecard,
  scorecardSummary,
} from "../../lib/business";

export function Field({
  label,
  value,
  onChange,
  min = 0,
  max,
  help,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  help?: string;
}) {
  return (
    <label>
      {label}
      <input
        type="number"
        min={min}
        max={max}
        step="any"
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          onChange(
            Math.min(
              max ?? Infinity,
              Math.max(min, Number.isFinite(n) ? n : min),
            ),
          );
        }}
      />
      {help && <small className="input-help">{help}</small>}
    </label>
  );
}
function OtherMeasures({
  value,
  onChange,
}: {
  value: BusinessMeasure[];
  onChange: (v: BusinessMeasure[]) => void;
}) {
  return (
    <section className="other-measures">
      <div className="simple-section-heading">
        <div>
          <h3>What else matters?</h3>
          <p>
            Optional: track things like customer service, fuel use, or on-time
            deliveries.
          </p>
        </div>
        <button
          className="button secondary"
          onClick={() =>
            onChange([
              ...value,
              {
                id: id(),
                name: "New measure",
                unit: "%",
                direction: "higher",
                target: 100,
                actual: 100,
              },
            ])
          }
        >
          <Plus size={15} />
          Add a measure
        </button>
      </div>
      {!value.length && (
        <p className="optional-note">
          No extra measures yet. You can add these at any time.
        </p>
      )}
      {value.map((m) => (
        <div className="business-measure" key={m.id}>
          <div className="form-grid">
            <label>
              Measure name
              <input
                value={m.name}
                onChange={(e) =>
                  onChange(
                    value.map((v) =>
                      v.id === m.id ? { ...v, name: e.target.value } : v,
                    ),
                  )
                }
              />
            </label>
            <label>
              Unit
              <input
                value={m.unit}
                placeholder="%, $, miles, days…"
                onChange={(e) =>
                  onChange(
                    value.map((v) =>
                      v.id === m.id ? { ...v, unit: e.target.value } : v,
                    ),
                  )
                }
              />
            </label>
            <Field
              label={`${m.name} goal`}
              value={m.target}
              onChange={(n) =>
                onChange(
                  value.map((v) => (v.id === m.id ? { ...v, target: n } : v)),
                )
              }
            />
            <Field
              label={`${m.name} result`}
              value={m.actual}
              onChange={(n) =>
                onChange(
                  value.map((v) => (v.id === m.id ? { ...v, actual: n } : v)),
                )
              }
            />
            <label>
              Which result is better?
              <select
                value={m.direction}
                onChange={(e) =>
                  onChange(
                    value.map((v) =>
                      v.id === m.id
                        ? {
                            ...v,
                            direction: e.target
                              .value as BusinessMeasure["direction"],
                          }
                        : v,
                    ),
                  )
                }
              >
                <option value="higher">A higher number</option>
                <option value="lower">A lower number</option>
              </select>
            </label>
            <button
              className="button secondary danger remove-measure"
              onClick={() => {
                if (
                  confirm(
                    "Remove this measure? Any bonus rules using it will need to be updated.",
                  )
                )
                  onChange(value.filter((v) => v.id !== m.id));
              }}
            >
              <Trash2 size={14} />
              Remove measure
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}
export function ScorecardEditor({
  value,
  onChange,
  title,
}: {
  value: Scorecard;
  onChange: (v: Scorecard) => void;
  title: string;
}) {
  return (
    <>
      <div className="simple-section-heading">
        <div>
          <h3>{title}</h3>
          <p>
            Enter your goal and your result. You can also try made-up results to
            test a bonus.
          </p>
        </div>
      </div>
      <div className="number-pairs">
        <div className="number-pair">
          <h3>Revenue</h3>
          <p>Money earned from customers, before costs.</p>
          <div className="form-grid">
            <Field
              label="Revenue goal ($)"
              value={value.revenueTarget}
              onChange={(n) => onChange({ ...value, revenueTarget: n })}
            />
            <Field
              label="Revenue result ($)"
              value={value.revenueActual}
              onChange={(n) => onChange({ ...value, revenueActual: n })}
            />
          </div>
        </div>
        <div className="number-pair">
          <h3>Gross margin</h3>
          <p>
            The share left after direct costs. A 25% margin means $25 left from
            each $100 in sales.
          </p>
          <div className="form-grid">
            <Field
              label="Margin goal (%)"
              value={value.marginTarget}
              max={100}
              onChange={(n) => onChange({ ...value, marginTarget: n })}
            />
            <Field
              label="Margin result (%)"
              value={value.marginActual}
              max={100}
              onChange={(n) => onChange({ ...value, marginActual: n })}
            />
          </div>
        </div>
      </div>
      <OtherMeasures
        value={value.other}
        onChange={(other) => onChange({ ...value, other })}
      />
      <div className="plain-note">
        <CheckCircle2 size={17} />
        <span>
          These numbers are saved with this profile. To use one to calculate a
          bonus, choose it in step 3.
        </span>
      </div>
    </>
  );
}
export function CompanySettings({
  company: c,
  onChange,
  next,
}: {
  company: Company;
  onChange: (v: Partial<Company>) => void;
  next: () => void;
}) {
  return (
    <section className="panel simple-editor">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">STEP 1 OF 4</span>
          <h2>Set your company goals</h2>
          <p>Start here. You can change any number later.</p>
        </div>
      </div>
      <div className="form-grid">
        <label>
          Company name
          <input
            value={c.company}
            onChange={(e) => onChange({ company: e.target.value })}
          />
        </label>
        <label>
          Industry
          <select
            aria-label="Industry"
            value={c.industry}
            onChange={(e) => onChange({ industry: e.target.value })}
          >
            {[...new Set([...industries, c.industry])].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          How often will you pay bonuses?
          <select
            aria-label="Bonus period"
            value={c.period}
            onChange={(e) => {
              if (
                confirm(
                  "Change the bonus period? Amounts will stay the same. Update your goals, costs, and bonuses to match the new period.",
                )
              ) {
                const departments = c.departments.map((d) => ({
                  ...d,
                  scorecard: divisionScorecard(d),
                }));
                onChange({
                  period: e.target.value as Company["period"],
                  scorecard: companyScorecard(c),
                  departments,
                });
              }
            }}
          >
            <option value="Monthly">Every month</option>
            <option value="Quarterly">Every 3 months</option>
            <option value="Annual">Every year</option>
          </select>
          <small className="input-help">
            All goals, results and bonuses below use this same period.
          </small>
        </label>
        <Field
          label="Total bonus budget ($)"
          value={c.budget}
          onChange={(n) => onChange({ budget: n })}
          help="The most you want to spend on all bonuses and related employer costs."
        />
      </div>
      <div className="simple-editor-body">
        <div className="period-note">
          Numbers for: <strong>{periodName(c.period)}</strong>
        </div>
        <ScorecardEditor
          title="How is the company doing?"
          value={companyScorecard(c)}
          onChange={(scorecard) => onChange({ scorecard })}
        />
        <details className="advanced-settings">
          <summary>More company details (optional)</summary>
          <div className="form-grid">
            <Field
              label="Number of employees"
              value={c.employees}
              onChange={(n) => onChange({ employees: Math.round(n) })}
            />
            <Field
              label="Extra employer costs on bonuses (%)"
              value={c.overhead}
              onChange={(n) => onChange({ overhead: n })}
              help="For example, 10% adds $10 in payroll costs to a $100 bonus."
            />
          </div>
        </details>
      </div>
      <div className="editor-footer">
        <span>Saved automatically in this browser.</span>
        <button className="button primary" onClick={next}>
          Next: add divisions <ArrowRight size={16} />
        </button>
      </div>
    </section>
  );
}
export function DivisionSettings({
  company: c,
  onChange,
  next,
  notify,
}: {
  company: Company;
  onChange: (v: Partial<Company>) => void;
  next: () => void;
  notify: (s: string) => void;
}) {
  const [selected, setSelected] = useState("");
  const d = c.departments.find((d) => d.id === selected) || c.departments[0];
  const update = (changes: Partial<Department>) => {
    if (d)
      onChange({
        departments: c.departments.map((v) =>
          v.id === d.id ? { ...v, ...changes } : v,
        ),
      });
  };
  return (
    <>
      <div className="setup-banner">
        <Building2 size={22} />
        <div>
          <strong>Step 2: break the business into divisions or teams</strong>
          <p>
            A division might be Long Haul, Local Delivery, Maintenance, or
            Sales. Each has its own goals.
          </p>
        </div>
        <button
          onClick={() => {
            const division: Department = {
              id: id(),
              name: "New division",
              budget: 0,
              actual: 0,
              scorecard: {
                revenueTarget: 0,
                revenueActual: 0,
                marginTarget: 0,
                marginActual: 0,
                other: [],
              },
            };
            onChange({ departments: [...c.departments, division] });
            setSelected(division.id);
          }}
        >
          <Plus size={15} />
          Add a division
        </button>
      </div>
      {c.departments.length > 0 && (
        <div
          className="division-tabs"
          role="group"
          aria-label="Choose a division"
        >
          {c.departments.map((v) => (
            <button
              key={v.id}
              className={d?.id === v.id ? "selected" : ""}
              onClick={() => setSelected(v.id)}
            >
              {v.name || "Unnamed division"}
            </button>
          ))}
        </div>
      )}
      {d ? (
        <section className="panel simple-editor" key={d.id}>
          <div className="panel-heading">
            <div>
              <h2>{d.name || "Your division"}</h2>
              <p>
                Use {periodName(c.period).toLowerCase()} for every number here.
              </p>
            </div>
            <button
              className="button secondary danger"
              onClick={() => {
                if (c.plans.some((p) => p.department === d.name)) {
                  notify(
                    "Move or remove this division’s bonus plans before deleting it.",
                  );
                  return;
                }
                if (confirm(`Delete ${d.name}?`))
                  onChange({
                    departments: c.departments.filter((v) => v.id !== d.id),
                  });
              }}
            >
              <Trash2 size={15} />
              Delete division
            </button>
          </div>
          <div className="form-grid">
            <label>
              Division or team name
              <input
                value={d.name}
                onChange={(e) => {
                  const name = e.target.value;
                  if (
                    c.departments.some((v) => v.id !== d.id && v.name === name)
                  ) {
                    notify("Each division needs a different name.");
                    return;
                  }
                  onChange({
                    departments: c.departments.map((v) =>
                      v.id === d.id ? { ...v, name } : v,
                    ),
                    plans: c.plans.map((p) =>
                      p.department === d.name ? { ...p, department: name } : p,
                    ),
                  });
                }}
              />
            </label>
          </div>
          <div className="simple-editor-body">
            <ScorecardEditor
              title="How is this division doing?"
              value={divisionScorecard(d)}
              onChange={(scorecard) => update({ scorecard })}
            />
            <details className="advanced-settings">
              <summary>Track this division’s running costs (optional)</summary>
              <p>
                Costs before bonuses. Leave revenue at zero for support teams
                that do not earn their own revenue.
              </p>
              <div className="form-grid">
                <Field
                  label="Running cost budget ($)"
                  value={d.budget}
                  onChange={(n) => update({ budget: n })}
                />
                <Field
                  label="Running cost result ($)"
                  value={d.actual}
                  onChange={(n) => update({ actual: n })}
                />
              </div>
            </details>
          </div>
          <div className="editor-footer">
            <span>Each division is saved separately.</span>
            <button className="button primary" onClick={next}>
              Next: choose bonuses <ArrowRight size={16} />
            </button>
          </div>
        </section>
      ) : (
        <section className="panel empty">
          <h2>No divisions yet</h2>
          <p>
            Add a division above, or go straight to a company-wide job plan.
          </p>
          <button className="button primary" onClick={next}>
            Next: choose bonuses <ArrowRight size={16} />
          </button>
        </section>
      )}
    </>
  );
}
export function MeasureSource({
  company: c,
  department,
  metric: m,
  onChange,
}: {
  company: Company;
  department: string;
  metric: Metric;
  onChange: (v: Metric) => void;
}) {
  const division = c.departments.find((d) => d.name === department);
  const customCompany = companyScorecard(c).other,
    customDivision = division ? divisionScorecard(division).other : [];
  return (
    <label className="measure-source-label">
      Where do these numbers come from?
      <select
        aria-label={`Numbers for ${m.name}`}
        value={m.source + (m.sourceId ? ":" + m.sourceId : "")}
        onChange={(e) => {
          const [source, sourceId] = e.target.value.split(":");
          onChange({
            ...m,
            source: source as Metric["source"],
            sourceId: sourceId || undefined,
          });
        }}
      >
        <option value="manual">I will enter them here</option>
        <optgroup label="Whole company">
          <option value="company-revenue">Company revenue</option>
          <option value="company-margin">Company gross margin</option>
          {customCompany.map((v) => (
            <option key={v.id} value={"company-other:" + v.id}>
              Company: {v.name}
            </option>
          ))}
        </optgroup>
        <optgroup label={`Division: ${department}`}>
          <option value="division-revenue">Division revenue</option>
          <option value="division-margin">Division gross margin</option>
          <option value="department-opex">Division running costs</option>
          {customDivision.map((v) => (
            <option key={v.id} value={"division-other:" + v.id}>
              Division: {v.name}
            </option>
          ))}
        </optgroup>
        {((m.source === "company-other" &&
          !customCompany.some((v) => v.id === m.sourceId)) ||
          (m.source === "division-other" &&
            !customDivision.some((v) => v.id === m.sourceId))) && (
          <option value={m.source + ":" + m.sourceId}>
            Removed measure — choose another
          </option>
        )}
      </select>
    </label>
  );
}
export function HomeGuide({
  company: c,
  navigate,
}: {
  company: Company;
  navigate: (s: string) => void;
}) {
  return (
    <>
      <div className="welcome-card">
        <div>
          <span className="eyebrow">
            BUILD A BONUS PLAN IN FOUR SIMPLE STEPS
          </span>
          <h2>Better results. Clear rewards.</h2>
          <p>
            Tell us your goals, choose who earns a bonus, and see what it could
            cost.
          </p>
          <button
            className="button primary"
            onClick={() => navigate("Company")}
          >
            Start with company goals <ArrowRight size={16} />
          </button>
        </div>
        <div className="welcome-symbol">
          <Target size={65} />
        </div>
      </div>
      <div className="guided-steps">
        {[
          {
            name: "Company",
            title: "Set company goals",
            text: "Revenue, margin, and anything else that matters.",
            icon: Building2,
          },
          {
            name: "Divisions",
            title: "Add division goals",
            text: "Give each division or team its own numbers.",
            icon: Users,
          },
          {
            name: "Bonus plans",
            title: "Choose the bonuses",
            text: "Pick a job or team and decide what to reward.",
            icon: Target,
          },
          {
            name: "Results",
            title: "Check the cost",
            text: "See the bonus payments and money left over.",
            icon: Wallet,
          },
        ].map((s, i) => (
          <button
            className="guided-step"
            key={s.name}
            onClick={() => navigate(s.name)}
          >
            <span className="step-bubble">{i + 1}</span>
            <s.icon size={24} />
            <h3>{s.title}</h3>
            <p>{s.text}</p>
            <span>
              Open step {i + 1}
              <ArrowRight size={15} />
            </span>
          </button>
        ))}
      </div>
      <section className="panel quick-summary">
        <div className="panel-heading">
          <div>
            <h2>{c.company}</h2>
            <p>
              {periodName(c.period)} · {c.departments.length} divisions ·{" "}
              {c.plans.length} bonus plans
            </p>
          </div>
        </div>
        <div className="scenario-results">
          <div>
            <span>Company revenue goal</span>
            <strong>{money(companyScorecard(c).revenueTarget)}</strong>
          </div>
          <div>
            <span>Company margin goal</span>
            <strong>{companyScorecard(c).marginTarget}%</strong>
          </div>
          <div>
            <span>Bonus budget</span>
            <strong>{money(c.budget)}</strong>
          </div>
          <div>
            <span>Other company measures</span>
            <strong>{companyScorecard(c).other.length}</strong>
          </div>
        </div>
      </section>
    </>
  );
}
export function BusinessResults({
  company: c,
  bonusCost,
  incomplete,
}: {
  company: Company;
  bonusCost: number;
  incomplete: boolean;
}) {
  const card = companyScorecard(c);
  return (
    <section className="panel simple-results">
      <div className="panel-heading">
        <div>
          <h2>Company and division results</h2>
          <p>
            {periodName(c.period)}. These are the same numbers used by any
            linked bonus rules.
          </p>
        </div>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Company / division</th>
              <th>Revenue goal</th>
              <th>Revenue result</th>
              <th>Margin goal</th>
              <th>Margin result</th>
              <th>Gross profit*</th>
            </tr>
          </thead>
          <tbody>
            <tr className="company-result-row">
              <td>{c.company} (whole company)</td>
              <td>{money(card.revenueTarget)}</td>
              <td>{money(card.revenueActual)}</td>
              <td>{card.marginTarget}%</td>
              <td>{card.marginActual}%</td>
              <td>{money(scorecardSummary(card).grossProfit)}</td>
            </tr>
            {c.departments.map((d) => {
              const v = divisionScorecard(d);
              return (
                <tr key={d.id}>
                  <td>{d.name}</td>
                  <td>{money(v.revenueTarget)}</td>
                  <td>{money(v.revenueActual)}</td>
                  <td>{v.marginTarget}%</td>
                  <td>{v.marginActual}%</td>
                  <td>{money(scorecardSummary(v).grossProfit)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="plain-result">
        <span>Company gross profit after bonuses and extra employer costs</span>
        <strong>
          {incomplete
            ? "Fix bonus rules first"
            : money(scorecardSummary(card).grossProfit - bonusCost)}
        </strong>
      </div>
      <div className="rule-note">
        *Gross profit = revenue × gross margin. This is before other running
        costs. Division revenue is shown separately; it is not added to company
        revenue. A support team can have zero revenue. This is not net profit.
      </div>
      {[
        { title: "Company", card },
        ...c.departments.map((d) => ({
          title: d.name,
          card: divisionScorecard(d),
        })),
      ]
        .filter((v) => v.card.other.length)
        .map((v) => (
          <div className="other-result-list" key={v.title}>
            <h3>{v.title}: other measures</h3>
            {v.card.other.map((m) => (
              <div key={m.id}>
                <strong>{m.name}</strong>
                <span>
                  Goal: {m.target} {m.unit}
                </span>
                <span>
                  Result: {m.actual} {m.unit}
                </span>
              </div>
            ))}
          </div>
        ))}
    </section>
  );
}
export function periodName(p: Company["period"]) {
  return p === "Monthly"
    ? "One month"
    : p === "Quarterly"
      ? "Three months"
      : "One year";
}
export function splitWeights(metrics: Metric[]): Metric[] {
  const count = metrics.filter((m) => !m.gate).length;
  let index = 0;
  return metrics.map((m) =>
    m.gate
      ? { ...m, weight: 0 }
      : {
          ...m,
          weight:
            ++index === count
              ? 100 - Math.floor(100 / count) * (count - 1)
              : Math.floor(100 / count),
        },
  );
}
