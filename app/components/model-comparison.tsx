"use client";
import { useState } from "react";
import { Company, Plan, id } from "../../lib/workspace";
import { compareModels, modelSnapshot, IncentiveModel } from "../../lib/models";
import {
  comparisonTemplates,
  ComparisonKey,
  makeComparison,
} from "../../lib/comparison";
import { formatMoney as money } from "../../lib/currency";
import { CompositePlanEditor } from "./composite-plan";
import { AnnualLeadership } from "./annual-leadership";
import { DriverPayEditor } from "./driver-pay";
import { CompanySettings, DivisionSettings } from "./simple-setup";
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function ModelComparison({
  company: c,
  onChange,
  notify,
}: {
  company: Company;
  onChange: (v: Partial<Company>) => void;
  notify: (v: string) => void;
}) {
  const [selected, setSelected] = useState(""),
    [planId, setPlanId] = useState(""),
    [area, setArea] = useState("Bonus plans");
  const models = c.models ?? [],
    m = models.find((v) => v.id === selected) ?? models[0],
    year = c.summaryYear ?? new Date().getFullYear();
  const results = compareModels(models, year),
    base = results[0];
  const save = (next: IncentiveModel) =>
    onChange({ models: models.map((v) => (v.id === next.id ? next : v)) });
  const change = (v: Partial<Company>) => {
    if (m) {
      const { models: _ignored, ...safe } = v;
      save({ ...m, company: { ...m.company, ...safe } });
    }
  };
  const copy = (source: Company, name: string) => {
    const next = { id: id(), name, notes: "", company: modelSnapshot(source) };
    onChange({ models: [...models, next] });
    setSelected(next.id);
  };
  const p =
    m?.company.plans.find((v) => v.id === planId) ?? m?.company.plans[0];
  const updatePlan = (v: Plan) =>
    change({ plans: m.company.plans.map((p) => (p.id === v.id ? v : p)) });
  const addTemplate = (key: ComparisonKey) => {
    const { plan, pool } = makeComparison(key, m.company);
    plan.enabled = true;
    change({
      plans: [...m.company.plans, plan],
      incentivePools:
        pool && !m.company.incentivePools?.some((v) => v.id === pool.id)
          ? [...(m.company.incentivePools ?? []), pool]
          : m.company.incentivePools,
    });
    setPlanId(plan.id);
  };
  const exportReport = () => {
    const lines = [
      [
        "Model",
        "Year",
        "Annual incentives CAD",
        "Employer costs included CAD",
        "Change from current CAD",
        "Notes",
      ],
      ...results.map((v) => [
        v.model.name,
        year,
        v.result.incomplete ? "Incomplete" : v.result.incentive,
        v.result.incomplete ? "Incomplete" : v.result.loaded,
        v.difference ?? "Incomplete",
        v.model.notes,
      ]),
    ];
    const blob = new Blob(
      [
        lines
          .map((row) =>
            row
              .map(
                (v) =>
                  '"' +
                  String(v)
                    .replace(/^[=+@-]/, "'$&")
                    .replaceAll('"', '""') +
                  '"',
              )
              .join(","),
          )
          .join("\r\n"),
      ],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = `incentive-models-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="model-comparison">
      <section className="panel">
        <h2>What could our incentive plans look like?</h2>
        <p>
          1. Save today's plans. 2. Make a copy. 3. Change the copy and compare
          the annual cost. All amounts are CAD.
        </p>
        <p>
          These are saved planning examples. Your live plans and company total
          stay separate. Each copy keeps its own revenue, margin, goals, people
          and truck counts.
        </p>
        <div className="model-actions">
          {!models.length ? (
            <button className="primary" onClick={() => copy(c, "Current plan")}>
              Start with our current plans
            </button>
          ) : (
            <>
              <button
                onClick={() => copy(m.company, `Proposal ${models.length}`)}
              >
                Copy selected model
              </button>
              <button onClick={() => copy(c, "Latest live plans")}>
                Add latest live plans
              </button>
              <button onClick={exportReport}>Download comparison</button>
            </>
          )}
          <Field label="Compare year">
            <input
              type="number"
              min={2000}
              max={2200}
              value={year}
              onChange={(e) => {
                const y = Number(e.target.value);
                if (y >= 2000 && y <= 2200) onChange({ summaryYear: y });
              }}
            />
          </Field>
        </div>
        <p>
          Start with the same business results in each model to see the effect
          of a pay change. Then change results to test a slower or stronger
          year. Forecasts assume the entered results occur; they do not predict
          future performance.
        </p>
      </section>
      {!!models.length && (
        <section className="panel">
          <h2>Annual cost at a glance</h2>
          <p>
            The first model is your comparison starting point. Employer costs
            are added using each model's bonus cost percentage. Regular wages
            and salaries are separate.
          </p>
          <div className="model-table">
            <table>
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Annual bonuses</th>
                  <th>With employer costs</th>
                  <th>Change from current</th>
                  <th>Highest cost allowed by these rules</th>
                </tr>
              </thead>
              <tbody>
                {results.map((v) => (
                  <tr key={v.model.id}>
                    <th>
                      {v.model.name}
                      {v === base ? " · Starting point" : ""}
                    </th>
                    <td>
                      {v.result.incomplete
                        ? "Check missing rules"
                        : money(v.result.incentive)}
                    </td>
                    <td>
                      {v.result.incomplete
                        ? "Incomplete"
                        : money(v.result.loaded)}
                    </td>
                    <td>
                      {v.difference === null
                        ? "Complete the plans first"
                        : v.difference === 0
                          ? "No change"
                          : `${money(Math.abs(v.difference))} ${v.difference > 0 ? "more" : "less"} per year${v.percent === null ? "" : ` (${Math.abs(v.percent).toFixed(1)}%)`}`}
                    </td>
                    <td>
                      {v.result.incomplete
                        ? "Incomplete"
                        : money(v.result.loadedMaximum)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            “No stated cap” means the rules do not limit the payout. The highest
            cost includes employer costs; it is a rule limit, not a forecast.
          </p>
          <p>
            A zero total may mean no plans are included. Check the list below
            before sharing.
          </p>
        </section>
      )}
      {m && (
        <>
          <section className="panel">
            <h2>Edit a model</h2>
            <div className="form-grid">
              <Field label="Choose a saved model">
                <select
                  value={m.id}
                  onChange={(e) => {
                    setSelected(e.target.value);
                    setPlanId("");
                  }}
                >
                  {models.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Model name">
                <input
                  value={m.name}
                  onChange={(e) => save({ ...m, name: e.target.value })}
                />
              </Field>
              <Field label="Extra employer costs on bonuses (%)">
                <input
                  type="number"
                  min={0}
                  value={m.company.overhead}
                  onChange={(e) =>
                    change({ overhead: Math.max(0, Number(e.target.value)) })
                  }
                />
              </Field>
            </div>
            <Field label="Explain this model to the executive team">
              <textarea
                value={m.notes}
                placeholder="Example: Raise Deck KAR to 0.15%. Keep revenue and headcount unchanged."
                onChange={(e) => save({ ...m, notes: e.target.value })}
              />
            </Field>
            <button
              onClick={() => {
                if (
                  window.confirm(
                    `Delete ${m.name}? This removes this saved model only.`,
                  )
                ) {
                  onChange({ models: models.filter((v) => v.id !== m.id) });
                  setSelected("");
                }
              }}
            >
              Delete this model
            </button>
          </section>
          <section className="panel">
            <h2>What makes up this cost?</h2>
            <div className="model-table">
              <table>
                <thead>
                  <tr>
                    <th>Plan</th>
                    <th>Included?</th>
                    <th>Annual incentive</th>
                    <th>What to check</th>
                  </tr>
                </thead>
                <tbody>
                  {results
                    .find((v) => v.model.id === m.id)
                    ?.result.rows.map((row) => (
                      <tr key={row.category + row.id}>
                        <td>
                          {row.name}
                          <small className="model-note">
                            {row.division} · {row.category}
                          </small>
                        </td>
                        <td>{row.included ? "Yes" : "No"}</td>
                        <td>
                          {!row.included
                            ? "Excluded"
                            : row.errors.length
                              ? "Incomplete"
                              : money(row.annual)}
                        </td>
                        <td>
                          {row.included
                            ? row.errors.join(" ")
                            : "Turn on inclusion in the editor to count this plan."}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <p>
              Plans with missing rules must be completed before the full model
              can be priced. Shared pool funding is not counted again on top of
              individual awards.
            </p>
          </section>
          <section className="panel">
            <h2>Choose what to change</h2>
            <div className="model-actions">
              {[
                "Bonus plans",
                "Company results",
                "Division results",
                "Annual leadership",
                "Driver pay",
              ].map((v) => (
                <button
                  key={v}
                  aria-pressed={area === v}
                  onClick={() => setArea(v)}
                >
                  {v}
                </button>
              ))}
            </div>
            {area === "Bonus plans" && (
              <>
                <Field label="Choose a plan">
                  <select
                    value={p?.id ?? ""}
                    onChange={(e) => setPlanId(e.target.value)}
                  >
                    <option value="" disabled>
                      Choose a plan
                    </option>
                    {m.company.plans.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Or add a plan from the comparison chart">
                  <select
                    value=""
                    onChange={(e) =>
                      addTemplate(e.target.value as ComparisonKey)
                    }
                  >
                    <option value="">Choose a template…</option>
                    {comparisonTemplates.map((v) => (
                      <option key={v.key} value={v.key}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <p>
                  For Deck, edit the commission rate, revenue and number of
                  people. For Bulk, edit the RWT goal, payment, truck count and
                  quarterly limit. More settings let you build complex models.
                </p>
              </>
            )}
          </section>
          {area === "Bonus plans" &&
            p &&
            (p.composite ? (
              <CompositePlanEditor
                key={m.id + p.id}
                company={m.company}
                plan={p}
                onChange={updatePlan}
                onCompanyChange={change}
                onDelete={() =>
                  change({
                    plans: m.company.plans.filter((v) => v.id !== p.id),
                  })
                }
                onNext={() =>
                  notify("The annual comparison above updates as you edit.")
                }
                onCopy={() => {
                  const next = structuredClone(p);
                  next.id = id();
                  next.name += " (copy)";
                  change({ plans: [...m.company.plans, next] });
                  setPlanId(next.id);
                }}
                notify={notify}
              />
            ) : (
              <section className="panel">
                <h2>{p.name}</h2>
                <label>
                  <input
                    type="checkbox"
                    checked={p.enabled}
                    onChange={(e) =>
                      updatePlan({ ...p, enabled: e.target.checked })
                    }
                  />{" "}
                  Include in this model
                </label>
                <div className="form-grid">
                  {(["participants", "incentive", "cap"] as const).map((k) => (
                    <Field
                      key={k}
                      label={
                        k === "participants"
                          ? "Number of people"
                          : k === "incentive"
                            ? "Bonus at goal per person / period (CAD)"
                            : "Maximum payout (% of bonus)"
                      }
                    >
                      <input
                        type="number"
                        min={0}
                        value={p[k]}
                        onChange={(e) =>
                          updatePlan({
                            ...p,
                            [k]: Math.max(0, Number(e.target.value)),
                          })
                        }
                      />
                    </Field>
                  ))}
                </div>
                {p.metrics.map((metric) => (
                  <div className="form-grid" key={metric.id}>
                    <strong>{metric.name}</strong>
                    {(["target", "actual", "weight"] as const).map((k) => (
                      <Field
                        key={k}
                        label={
                          k === "actual"
                            ? "Expected result"
                            : k === "target"
                              ? "Goal"
                              : "Weight (%)"
                        }
                      >
                        <input
                          type="number"
                          min={0}
                          value={metric[k]}
                          disabled={
                            metric.source !== "manual" &&
                            metric.source !== undefined &&
                            k !== "weight"
                          }
                          onChange={(e) =>
                            updatePlan({
                              ...p,
                              metrics: p.metrics.map((v) =>
                                v.id === metric.id
                                  ? { ...v, [k]: Number(e.target.value) }
                                  : v,
                              ),
                            })
                          }
                        />
                      </Field>
                    ))}
                  </div>
                ))}
                <p>
                  Company-linked goals use the saved company and division
                  assumptions.
                </p>
              </section>
            ))}
          {area === "Company results" && (
            <CompanySettings
              company={m.company}
              onChange={change}
              next={() => setArea("Division results")}
            />
          )}
          {area === "Division results" && (
            <DivisionSettings
              company={m.company}
              onChange={change}
              next={() => setArea("Bonus plans")}
              notify={notify}
            />
          )}
          {area === "Annual leadership" && (
            <AnnualLeadership
              key={m.id}
              company={m.company}
              onChange={change}
              notify={notify}
            />
          )}
          {area === "Driver pay" && (
            <DriverPayEditor
              key={m.id}
              company={m.company}
              onChange={change}
              notify={notify}
            />
          )}
        </>
      )}
    </div>
  );
}
