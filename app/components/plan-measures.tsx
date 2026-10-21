"use client";
import { Plus, Trash2 } from "lucide-react";
import {
  Company,
  Metric,
  Plan,
  calculatePlan,
  id,
  resolvedPlan,
} from "../../lib/workspace";
import { Field, MeasureSource, splitWeights } from "./simple-setup";
export function PlanMeasures({
  company,
  plan,
  onChange,
}: {
  company: Company;
  plan: Plan;
  onChange: (p: Plan) => void;
}) {
  const update = (m: Metric) =>
    onChange({
      ...plan,
      metrics: plan.metrics.map((v) => (v.id === m.id ? m : v)),
    });
  return (
    <>
      <div className="simple-section-heading plan-measures-heading">
        <div>
          <h3>What should this bonus reward?</h3>
          <p>
            Use company goals, division goals, or enter a job’s own measure.
          </p>
        </div>
        <button
          className="button secondary"
          onClick={() =>
            onChange({
              ...plan,
              metrics: splitWeights([
                ...plan.metrics,
                {
                  id: id(),
                  name: "New measure",
                  unit: "%",
                  direction: "higher",
                  weight: 0,
                  target: 100,
                  actual: 100,
                  threshold: 80,
                  cap: 150,
                  accelerator: 1.25,
                  gate: false,
                  source: "manual",
                },
              ]),
            })
          }
        >
          <Plus size={15} />
          Add a measure
        </button>
      </div>
      <div className="share-explainer">
        <span>
          Bonus shares tell us how much each measure matters. They must add up
          to 100%. Adding or removing a measure splits the shares equally.
        </span>
        <button
          onClick={() =>
            onChange({ ...plan, metrics: splitWeights(plan.metrics) })
          }
        >
          Split bonus equally
        </button>
      </div>
      <div className="metric-editor-list">
        {plan.metrics.map((m, index) => {
          const effective = resolvedPlan(company, plan).metrics[index];
          const linked = m.source !== "manual";
          const fullyLinked = linked && m.source !== "department-opex";
          return (
            <section className="metric-editor" key={m.id}>
              <div className="metric-editor-heading">
                <label>
                  Measure name
                  <input
                    value={m.name}
                    onChange={(e) => update({ ...m, name: e.target.value })}
                  />
                </label>
                <button
                  aria-label={`Remove ${m.name}`}
                  onClick={() =>
                    onChange({
                      ...plan,
                      metrics: splitWeights(
                        plan.metrics.filter((v) => v.id !== m.id),
                      ),
                    })
                  }
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <MeasureSource
                company={company}
                department={plan.department}
                metric={m}
                onChange={(value) => {
                  const name = (
                    {
                      "company-revenue": "Company revenue",
                      "company-margin": "Company gross margin",
                      "division-revenue": "Division revenue",
                      "division-margin": "Division gross margin",
                      "department-opex": "Division running costs",
                    } as Record<string, string>
                  )[value.source];
                  const linked = resolvedPlan(company, {
                    ...plan,
                    metrics: [value],
                  }).metrics[0];
                  update({ ...value, name: name || linked.name });
                }}
              />
              {linked && (
                <p className="linked-note">
                  The result is filled in from{" "}
                  {m.source.startsWith("company-")
                    ? "step 1: Company"
                    : "step 2: Divisions"}
                  .
                  {fullyLinked
                    ? " The goal and units come from there too."
                    : ""}
                </p>
              )}
              <div className="metric-fields simple-metric-fields">
                <label>
                  Goal {effective.unit && `(${effective.unit})`}
                  <input
                    aria-label={`${m.name} goal`}
                    type="number"
                    min={m.gate ? 0 : 0.001}
                    step="any"
                    value={effective.target}
                    disabled={fullyLinked}
                    onChange={(e) =>
                      update({
                        ...m,
                        target: Math.max(
                          m.gate ? 0 : 0.001,
                          Number(e.target.value) || 0,
                        ),
                      })
                    }
                  />
                </label>
                <label>
                  Result {effective.unit && `(${effective.unit})`}
                  <input
                    aria-label={`${m.name} result`}
                    type="number"
                    min="0"
                    step="any"
                    value={effective.actual}
                    disabled={linked}
                    onChange={(e) =>
                      update({
                        ...m,
                        actual: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                  />
                </label>
                {!m.gate && (
                  <Field
                    label="Share of bonus (%)"
                    value={m.weight}
                    max={100}
                    onChange={(n) => update({ ...m, weight: n })}
                  />
                )}
                <label>
                  A good result is
                  <select
                    aria-label={`${m.name} better result`}
                    value={effective.direction}
                    disabled={fullyLinked}
                    onChange={(e) =>
                      update({
                        ...m,
                        direction: e.target.value as Metric["direction"],
                      })
                    }
                  >
                    <option value="higher">A higher number</option>
                    <option value="lower">A lower number</option>
                  </select>
                </label>
              </div>
              {m.gate && (
                <div className="safety-note">
                  Required rule: the goal must be met before this plan can pay
                  any bonus. This measure does not take a share of the bonus.
                </div>
              )}
              <details className="advanced-settings">
                <summary>More rules for this measure</summary>
                <div className="metric-fields">
                  <label>
                    Unit
                    <input
                      disabled={fullyLinked}
                      value={effective.unit}
                      onChange={(e) => update({ ...m, unit: e.target.value })}
                    />
                  </label>
                  {!m.gate && (
                    <>
                      <Field
                        label="Start paying at (% of goal)"
                        value={m.threshold}
                        max={100}
                        onChange={(n) => update({ ...m, threshold: n })}
                      />
                      <Field
                        label="Maximum payment (% of normal bonus)"
                        value={m.cap}
                        onChange={(n) => update({ ...m, cap: n })}
                      />
                      <Field
                        label="Extra reward above goal (×)"
                        value={m.accelerator}
                        onChange={(n) => update({ ...m, accelerator: n })}
                      />
                    </>
                  )}
                </div>
                <label className="required-rule">
                  <input
                    type="checkbox"
                    checked={m.gate}
                    onChange={(e) =>
                      onChange({
                        ...plan,
                        metrics: splitWeights(
                          plan.metrics.map((v) =>
                            v.id === m.id
                              ? { ...v, gate: e.target.checked }
                              : v,
                          ),
                        ),
                      })
                    }
                  />
                  Must meet this goal before any bonus is paid
                </label>
                <p>
                  For a zero-incident safety rule, choose “A lower number,” set
                  the goal to 0, and turn on the required rule. For other
                  measures, use a goal above 0.
                </p>
              </details>
            </section>
          );
        })}
      </div>
      <div className="plain-note plan-summary-note">
        <span>
          {calculatePlan(resolvedPlan(company, plan)).gatesPassed
            ? "At each goal, the matching share pays its normal bonus. Better results may pay more, up to the limits you set."
            : "A required rule was missed. This plan will pay no bonus."}
        </span>
      </div>
    </>
  );
}
