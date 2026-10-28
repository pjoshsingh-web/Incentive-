"use client";
import { Plus, Trash2, X } from "lucide-react";
import { Company, id } from "../../lib/workspace";
import { PayoutPart } from "../../lib/composite";
import {
  ComparisonKey,
  ProfitPool,
  comparisonTemplates,
  poolFunding,
  PartPolicy,
} from "../../lib/comparison";
import { Field } from "./simple-setup";
import { formatMoney as money } from "../../lib/currency";
export function ComparisonLibrary({
  onChoose,
  onClose,
}: {
  onChoose: (key: ComparisonKey) => void;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop">
      <section
        className="modal comparison-library"
        role="dialog"
        aria-modal="true"
        aria-label="Comparison chart templates"
      >
        <button
          className="modal-close"
          aria-label="Close template library"
          onClick={onClose}
        >
          <X size={20} />
        </button>
        <span className="eyebrow">Q-LINE COMPARISON CHART</span>
        <h2>Choose a plan example</h2>
        <p>
          Templates start excluded from company totals. Review the inputs and
          rules, then include the plans you want to use. The two Logistics pool
          roles need additional confirmed rules.
        </p>
        <div className="comparison-card-grid">
          {comparisonTemplates.map((t) => (
            <button key={t.key} onClick={() => onChoose(t.key)}>
              <span>{t.division}</span>
              <h3>{t.name}</h3>
              <p>{t.description}</p>
              <strong>{t.example}</strong>
              <small>Use this template →</small>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
export function PolicyPartEditor({
  company: c,
  part,
  onPart,
  onCompany,
}: {
  company: Company;
  part: PayoutPart;
  onPart: (changes: Partial<PayoutPart>) => void;
  onCompany: (changes: Partial<Company>) => void;
}) {
  const policy = part.policy!;
  const change = (changes: Record<string, unknown>) =>
    onPart({ policy: { ...policy, ...changes } as PartPolicy });
  if (policy.kind === "kar")
    return (
      <div className="policy-editor">
        <h3>Monthly KAR commission</h3>
        <p>
          Existing revenue earns 1%; personally sourced new business earns 2%
          for the first 12 months. Rates are editable. At or above 80% of target
          the full commission applies.
        </p>
        <div className="form-grid">
          <Field
            label="Existing-business commission (%)"
            value={policy.existingRate}
            onChange={(existingRate) => change({ existingRate })}
          />
          <Field
            label="New-business commission (%)"
            value={policy.newRate}
            onChange={(newRate) => change({ newRate })}
          />
          <Field
            label="Share of revenue from personally sourced new business (%)"
            value={policy.newBusinessPercent}
            max={100}
            onChange={(newBusinessPercent) => change({ newBusinessPercent })}
          />
          <Field
            label="Age of that new business (months)"
            value={policy.businessAgeMonths}
            onChange={(businessAgeMonths) => change({ businessAgeMonths })}
          />
          <Field
            label="New-business rate lasts (months)"
            value={policy.newRateMonths}
            onChange={(newRateMonths) => change({ newRateMonths })}
          />
          <Field
            label="Full commission starts at (% of revenue goal)"
            value={part.threshold}
            max={100}
            onChange={(threshold) => onPart({ threshold })}
          />
          <label>
            Below that level, multiply commission by
            <select
              value={policy.proration}
              onChange={(e) => change({ proration: e.target.value })}
            >
              <option value="attainment">
                Revenue ÷ target (chart’s illustrative curve)
              </option>
              <option value="threshold">
                Revenue attainment ÷ starting percentage
              </option>
            </select>
          </label>
        </div>
        <div className="plain-note">
          The default follows the chart’s examples below 80%: $100,000 existing
          revenue against a $200,000 target earns $1,000 × 50% = $500. Confirm
          the proration rule before including this plan. New revenue reverts to
          the existing-business rate after its first 12 months.
        </div>
      </div>
    );
  if (policy.kind === "quarterly-weekly")
    return (
      <div className="policy-editor">
        <h3>Bulk sales-team quarterly cap</h3>
        <p>
          Pay {money(part.targetPayout)} per qualifying truck-week when RWT
          reaches the goal, then cap each truck’s quarterly payment. This is
          separate from the earlier Bulk productivity + profitability plan.
        </p>
        <div className="form-grid">
          <Field
            label="Payment for a qualifying week ($)"
            value={part.targetPayout}
            onChange={(targetPayout) => onPart({ targetPayout })}
          />
          <Field
            label="Maximum per recipient per quarter ($)"
            value={policy.quarterCap}
            onChange={(quarterCap) => change({ quarterCap })}
          />
          {policy.quarterWeeks.map((v, i) => (
            <Field
              key={i}
              label={`Eligible weeks in quarter ${i + 1}`}
              value={v}
              max={14}
              onChange={(value) => {
                const quarterWeeks = policy.quarterWeeks.map((n, j) =>
                  j === i ? Math.round(value) : n,
                );
                onPart({
                  periods: quarterWeeks.reduce((s, n) => s + n, 0),
                  policy: { ...policy, quarterWeeks },
                });
              }}
            />
          ))}
        </div>
        <p>
          With 13 qualifying weeks each quarter, $1,300 is capped at $1,200,
          giving $4,800 for four quarters. Individual weekly results, if
          supplied, are grouped by these quarter counts before applying caps.
        </p>
      </div>
    );
  const pool = c.incentivePools?.find((v) => v.id === policy.poolId);
  const updatePool = (changes: Partial<ProfitPool>) => {
    if (pool)
      onCompany({
        incentivePools: c.incentivePools?.map((v) =>
          v.id === pool.id
            ? {
                ...v,
                ...changes,
                confirmed:
                  changes.confirmed ?? (changes.bands ? false : pool.confirmed),
              }
            : v,
        ),
      });
  };
  return (
    <div className="policy-editor">
      <h3>Shared Logistics quarterly pool</h3>
      <p>
        Coordinator and Tracker plans use the same pool. Changing its gross
        profit or rate bands updates every linked plan; the full pool is not
        added on top of individual awards.
      </p>
      {pool ? (
        <>
          <div className="form-grid">
            <Field
              label="Quarterly gross-profit result ($)"
              value={pool.quarterlyProfit}
              onChange={(quarterlyProfit) => updatePool({ quarterlyProfit })}
            />
            <Field
              label="Quarterly gross-profit target ($)"
              value={pool.targetProfit}
              onChange={(targetProfit) => updatePool({ targetProfit })}
            />
          </div>
          <div className="plain-note">
            The chart gives a 0.50%–1.25% pool range and a 1.05% example, but
            not the actual bands. The starting row below is an example, not an
            approved band schedule.
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>GP at least ($)</th>
                  <th>Pool rate (%)</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pool.bands.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <input
                        aria-label="Pool gross-profit band"
                        type="number"
                        min="0"
                        value={b.from}
                        onChange={(e) =>
                          updatePool({
                            bands: pool.bands.map((v) =>
                              v.id === b.id
                                ? { ...v, from: Math.max(0, +e.target.value) }
                                : v,
                            ),
                          })
                        }
                      />
                    </td>
                    <td>
                      <input
                        aria-label="Pool rate percent"
                        type="number"
                        min="0"
                        max="100"
                        step=".01"
                        value={b.rate}
                        onChange={(e) =>
                          updatePool({
                            bands: pool.bands.map((v) =>
                              v.id === b.id
                                ? {
                                    ...v,
                                    rate: Math.min(
                                      100,
                                      Math.max(0, +e.target.value),
                                    ),
                                  }
                                : v,
                            ),
                          })
                        }
                      />
                    </td>
                    <td>
                      <button
                        aria-label="Remove pool band"
                        onClick={() =>
                          updatePool({
                            bands: pool.bands.filter((v) => v.id !== b.id),
                          })
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            className="button secondary"
            onClick={() =>
              updatePool({
                bands: [
                  ...pool.bands,
                  {
                    id: id(),
                    from:
                      Math.max(0, ...pool.bands.map((b) => b.from)) + 100000,
                    rate: 1.05,
                  },
                ],
              })
            }
          >
            <Plus size={14} />
            Add a pool band
          </button>
          <p>
            Quarterly pool at the entered result:{" "}
            <strong>{money(poolFunding(pool))}</strong>
          </p>
          <label className="required-rule">
            <input
              type="checkbox"
              checked={pool.confirmed}
              onChange={(e) => updatePool({ confirmed: e.target.checked })}
            />
            I have entered and reviewed the actual pool rate bands
          </label>
        </>
      ) : (
        <div className="validation bad">
          The linked pool is missing. Recreate this template or restore its
          pool.
        </div>
      )}
      {policy.role === "coordinator" ? (
        <>
          <h3>Coordinator’s pool share</h3>
          <div className="form-grid">
            <label>
              Individual performance level
              <select
                value={policy.level}
                onChange={(e) =>
                  change({ level: +e.target.value, confirmed: false })
                }
              >
                {[1, 2, 3].map((n) => (
                  <option key={n} value={n}>
                    Level {n}
                  </option>
                ))}
              </select>
            </label>
            {policy.shares.map((share, i) => (
              <label key={i}>
                Level {i + 1} share of the pool (%)
                <input
                  aria-label={`Level ${i + 1} pool share`}
                  placeholder="Not supplied in chart"
                  type="number"
                  min="0"
                  max="100"
                  step=".01"
                  value={share ?? ""}
                  onChange={(e) =>
                    change({
                      shares: policy.shares.map((n, j) =>
                        j === i
                          ? e.target.value === ""
                            ? null
                            : Math.min(100, Math.max(0, +e.target.value))
                          : n,
                      ),
                      confirmed: false,
                    })
                  }
                />
              </label>
            ))}
          </div>
          <p>
            The chart supplies Level 2 at 14%; Level 1 and Level 3 must be
            entered before using those levels. $1,000,000 GP × 1.05% × 14% =
            $1,470 per quarter.
          </p>
        </>
      ) : (
        <>
          <h3>Tracker’s KPI-based share</h3>
          <Field
            label="Maximum tracker share of the pool (%)"
            value={policy.maxShare}
            max={100}
            onChange={(maxShare) => change({ maxShare, confirmed: false })}
          />
          <p>
            The chart does not supply the KPI targets or weights. These starting
            values are examples. At 100% achievement on both KPIs, the tracker
            receives the full selected pool share, capped at 6% by default.
          </p>
          {policy.kpis.map((k) => (
            <div className="business-measure" key={k.id}>
              <div className="form-grid">
                <label>
                  KPI name
                  <input
                    value={k.name}
                    onChange={(e) =>
                      change({
                        kpis: policy.kpis.map((v) =>
                          v.id === k.id ? { ...v, name: e.target.value } : v,
                        ),
                        confirmed: false,
                      })
                    }
                  />
                </label>
                <Field
                  label="KPI target"
                  value={k.target}
                  min={0.001}
                  onChange={(target) =>
                    change({
                      kpis: policy.kpis.map((v) =>
                        v.id === k.id ? { ...v, target } : v,
                      ),
                      confirmed: false,
                    })
                  }
                />
                <Field
                  label="KPI result"
                  value={k.actual}
                  onChange={(actual) =>
                    change({
                      kpis: policy.kpis.map((v) =>
                        v.id === k.id ? { ...v, actual } : v,
                      ),
                    })
                  }
                />
                <Field
                  label="KPI share (%)"
                  value={k.weight}
                  max={100}
                  onChange={(weight) =>
                    change({
                      kpis: policy.kpis.map((v) =>
                        v.id === k.id ? { ...v, weight } : v,
                      ),
                      confirmed: false,
                    })
                  }
                />
                <label>
                  A good result is
                  <select
                    value={k.direction}
                    onChange={(e) =>
                      change({
                        kpis: policy.kpis.map((v) =>
                          v.id === k.id
                            ? { ...v, direction: e.target.value }
                            : v,
                        ),
                        confirmed: false,
                      })
                    }
                  >
                    <option value="higher">A higher number</option>
                    <option value="lower">A lower number</option>
                  </select>
                </label>
              </div>
            </div>
          ))}
        </>
      )}
      <label className="required-rule">
        <input
          type="checkbox"
          checked={policy.confirmed}
          onChange={(e) => change({ confirmed: e.target.checked })}
        />
        I have reviewed this role’s share, level and KPI rules
      </label>
    </div>
  );
}
export function PolicyHandout({ part }: { part: PayoutPart }) {
  const p = part.policy!;
  return (
    <div className="sheet-formula">
      {p.kind === "kar" ? (
        <>
          <strong>
            {p.existingRate}% existing business / {p.newRate}% eligible new
            business
          </strong>
          <p>
            {p.newBusinessPercent}% of revenue is personally sourced new
            business, age {p.businessAgeMonths} months. The higher rate lasts{" "}
            {p.newRateMonths} months. Full commission starts at {part.threshold}
            % of the revenue target.
          </p>
          <p>
            Below that: commission ×{" "}
            {p.proration === "attainment"
              ? "revenue attainment"
              : "attainment divided by the starting percentage"}
            .
          </p>
        </>
      ) : p.kind === "quarterly-weekly" ? (
        <>
          <strong>{money(part.targetPayout)} per qualifying week</strong>
          <p>
            RWT must reach {money(part.target)}. Maximum {money(p.quarterCap)}{" "}
            per quarter per recipient. Eligible weeks by quarter:{" "}
            {p.quarterWeeks.join(", ")}.
          </p>
          <p>
            Annual maximum for four full qualifying quarters:{" "}
            {money(p.quarterCap * 4)} per recipient.
          </p>
        </>
      ) : (
        <>
          <strong>
            {p.role === "coordinator"
              ? `Level ${p.level}: ${p.shares[p.level - 1] ?? "unconfirmed"}% of the pool`
              : `Up to ${p.maxShare}% of the pool, based on KPI results`}
          </strong>
          <p>
            Quarterly GP: {money(part.actual)}. Pool:{" "}
            {p.pool ? money(poolFunding(p.pool)) : "Missing"}.{" "}
            {p.pool?.confirmed && p.confirmed
              ? "Rules reviewed."
              : "Example rules require confirmation."}
          </p>
          {p.role === "tracker" && (
            <p>
              {p.kpis
                .map(
                  (k) =>
                    `${k.name}: target ${k.target}, result ${k.actual}, weight ${k.weight}%`,
                )
                .join("; ")}
              .
            </p>
          )}
        </>
      )}
    </div>
  );
}
