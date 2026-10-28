"use client";
import { useState } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";
import { Company, id } from "../../lib/workspace";
import {
  DriverPackage,
  DriverRecord,
  driverPackages,
  newDriverRecord,
  driverResult,
  dimensionChoices,
  lengthChoices,
  trailerChoices,
} from "../../lib/driver-pay";
import { formatMoney as money } from "../../lib/currency";
import { Field } from "./simple-setup";
export function DriverPayEditor({
  company: c,
  onChange,
  notify,
}: {
  company: Company;
  onChange: (v: Partial<Company>) => void;
  notify: (s: string) => void;
}) {
  const [source, setSource] = useState<DriverPackage>("canadian-deck"),
    [selected, setSelected] = useState("");
  const records = c.driverPay ?? [],
    p = records.find((v) => v.id === selected) || records[0],
    r = p ? driverResult(p) : null;
  const update = (changes: Partial<DriverRecord>) => {
    if (p)
      onChange({
        driverPay: records.map((v) =>
          v.id === p.id ? { ...v, ...changes } : v,
        ),
      });
  };
  const bulk = p?.package === "bulk-2023",
    legacy = p?.package === "regional-rgn-2021";
  const add = () => {
    const division =
      source === "bulk-2023"
        ? "Bulk"
        : source === "us-heavy-haul"
          ? "Heavy Haul"
          : "Deck";
    const fresh = newDriverRecord(source, new Date().getFullYear(), division);
    onChange({
      driverPay: [...records, fresh],
      departments: c.departments.some((v) => v.name === division)
        ? c.departments
        : [
            ...c.departments,
            { id: id(), name: division, budget: 0, actual: 0 },
          ],
    });
    setSelected(fresh.id);
  };
  return (
    <>
      <div className="setup-banner">
        <div>
          <strong>Company-driver pay estimates</strong>
          <p>
            Use the supplied pay packages. Base pay and work premiums are
            separate from safety, skill and loyalty incentives. All amounts are
            CAD, including the US Heavy Haul package.
          </p>
        </div>
      </div>
      <div className="driver-add-bar">
        <label>
          Choose a pay package
          <select
            aria-label="Driver pay package"
            value={source}
            onChange={(e) => setSource(e.target.value as DriverPackage)}
          >
            {driverPackages.map((v) => (
              <option key={v.key} value={v.key}>
                {v.name} · {v.revision}
              </option>
            ))}
          </select>
        </label>
        <button className="button primary" onClick={add}>
          <Plus size={16} />
          Add driver pay estimate
        </button>
      </div>
      <div className="plain-note">
        Owner-operator contracts can be added later. These five source packages
        are for company drivers. Estimates count only the work entered for their
        report year; mileage is not silently annualized.
      </div>
      {p && r ? (
        <>
          <div
            className="annual-roster"
            role="group"
            aria-label="Driver pay estimates"
          >
            {records.map((v) => (
              <button
                key={v.id}
                className={v.id === p.id ? "selected" : ""}
                onClick={() => setSelected(v.id)}
              >
                <strong>{v.name}</strong>
                <span>
                  {v.year} ·{" "}
                  {v.included ? "Included" : "Excluded from company total"}
                </span>
              </button>
            ))}
          </div>
          <div className="driver-source">
            <strong>
              {r.source.name} · {r.source.revision}
            </strong>
            <p>
              Source: {r.source.file}. Base/safety/skill/loyalty: pages 1, 3–4
              of the 2026 packages. Loaded premiums: pages 5–6. Legacy packages
              keep their own older rates.
            </p>
            <p>
              Loyalty is capped at 4¢ per mile based on your clarification. The
              uploaded table’s 110% factor still applies to lower service rates,
              subject to that cap. Heavy Haul’s 13-axle detailed rate is
              $1.13/mile; selecting it requires acknowledgement of the
              conflicting summary.
            </p>
          </div>
          <section className="panel simple-editor">
            <div className="panel-heading">
              <div>
                <h2>1. Driver and work period</h2>
                <p>
                  Use one person, or a group of drivers with the same mileage
                  and eligibility assumptions.
                </p>
              </div>
              <button
                aria-label="Delete driver pay estimate"
                onClick={() => {
                  if (confirm("Delete " + p.name + "?"))
                    onChange({
                      driverPay: records.filter((v) => v.id !== p.id),
                    });
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
            <div className="form-grid">
              <label>
                Driver or group name
                <input
                  value={p.name}
                  onChange={(e) => update({ name: e.target.value })}
                />
              </label>
              <label>
                Division
                <input
                  value={p.division}
                  onChange={(e) => update({ division: e.target.value })}
                />
              </label>
              <Field
                label="Driver report year"
                value={p.year}
                min={2000}
                max={2200}
                onChange={(year) => update({ year: Math.round(year) })}
              />
              <Field
                label="Number of drivers with these same inputs"
                value={p.count}
                min={1}
                onChange={(count) => update({ count: Math.round(count) })}
              />
              <label>
                Work period covered
                <input
                  value={p.coverage}
                  onChange={(e) => update({ coverage: e.target.value })}
                />
              </label>
            </div>
            <div className="driver-checks">
              <label>
                <input
                  type="checkbox"
                  checked={p.reviewed}
                  onChange={(e) => update({ reviewed: e.target.checked })}
                />
                I have checked the package revision and confirmed these rates
                apply to all work entered. Use separate estimates when rates
                change during the year.
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={p.included}
                  onChange={(e) => update({ included: e.target.checked })}
                />
                Include this estimate in the company total for {p.year}
              </label>
              <button
                className="button secondary"
                onClick={() => {
                  const copy = {
                    ...structuredClone(p),
                    id: id(),
                    name: p.name + " (copy)",
                    included: false,
                  };
                  onChange({ driverPay: [...records, copy] });
                  setSelected(copy.id);
                }}
              >
                <Copy size={15} />
                Copy estimate
              </button>
            </div>
          </section>
          <div className="metric-grid driver-metrics">
            <DriverStat
              label="Regular driver pay"
              amount={r.regularPay}
              invalid={!!r.errors.length}
              note="Base + duties/premiums + approved regular extras"
            />
            <DriverStat
              label="Driver incentives"
              amount={r.incentivePay}
              invalid={!!r.errors.length}
              note="Safety + skill + loyalty / Bulk safety awards"
            />
            <DriverStat
              label="Total cash pay for work entered"
              amount={r.totalPay}
              invalid={!!r.errors.length}
              note={`${p.count} driver(s) · before taxes and deductions`}
            />
          </div>
          {r.errors.length > 0 && (
            <div className="cloud-save-alert" role="alert">
              {r.errors.join(" ")}
            </div>
          )}
          {bulk ? (
            <section className="panel simple-editor">
              <div className="panel-heading">
                <div>
                  <h2>2. Bulk revenue and safety pay</h2>
                  <p>
                    Base pay is 20–22% of gross order revenue excluding fuel
                    surcharge. Safety awards are separate: 1% quarterly, plus 1%
                    for a full qualifying calendar year.
                  </p>
                </div>
              </div>
              <div className="form-grid">
                <Field
                  label="Bulk revenue pay (%)"
                  value={p.bulkRate}
                  min={20}
                  max={22}
                  onChange={(bulkRate) => update({ bulkRate })}
                />
                <label className="required-rule">
                  <input
                    type="checkbox"
                    checked={p.bulkHourly}
                    onChange={(e) => update({ bulkHourly: e.target.checked })}
                  />
                  NH3 hourly base pay instead of revenue percentage
                </label>
                {p.bulkHourly && (
                  <>
                    <Field
                      label="NH3 approved hours"
                      value={p.hourlyHours}
                      onChange={(hourlyHours) => update({ hourlyHours })}
                    />
                    <Field
                      label="NH3 hourly rate ($, not stated in package)"
                      value={p.hourlyRate}
                      onChange={(hourlyRate) => update({ hourlyRate })}
                    />
                    <label>
                      <input
                        type="checkbox"
                        checked={p.hourlyApproved}
                        onChange={(e) =>
                          update({ hourlyApproved: e.target.checked })
                        }
                      />
                      Hourly rate approved
                    </label>
                  </>
                )}
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Quarter</th>
                      <th>Gross order revenue ($)</th>
                      <th>Fuel surcharge ($)</th>
                      <th>All quarterly safety requirements met</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.bulkQuarters.map((q, i) => (
                      <tr key={i}>
                        <td>Q{i + 1}</td>
                        <td>
                          <input
                            aria-label={`Bulk quarter ${i + 1} revenue`}
                            type="number"
                            min="0"
                            value={q.gross}
                            onChange={(e) =>
                              update({
                                bulkQuarters: p.bulkQuarters.map((v, j) =>
                                  j === i
                                    ? {
                                        ...v,
                                        gross: Math.max(0, +e.target.value),
                                      }
                                    : v,
                                ),
                              })
                            }
                          />
                        </td>
                        <td>
                          <input
                            aria-label={`Bulk quarter ${i + 1} fuel surcharge`}
                            type="number"
                            min="0"
                            value={q.fsc}
                            onChange={(e) =>
                              update({
                                bulkQuarters: p.bulkQuarters.map((v, j) =>
                                  j === i
                                    ? {
                                        ...v,
                                        fsc: Math.max(0, +e.target.value),
                                      }
                                    : v,
                                ),
                              })
                            }
                          />
                        </td>
                        <td>
                          <input
                            aria-label={`Bulk quarter ${i + 1} safety eligible`}
                            type="checkbox"
                            checked={q.safe}
                            onChange={(e) =>
                              update({
                                bulkQuarters: p.bulkQuarters.map((v, j) =>
                                  j === i
                                    ? { ...v, safe: e.target.checked }
                                    : v,
                                ),
                              })
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="driver-checks">
                <label>
                  <input
                    type="checkbox"
                    checked={p.fullCalendarYear}
                    onChange={(e) =>
                      update({ fullCalendarYear: e.target.checked })
                    }
                  />
                  A full calendar year is completed
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={p.annualSafety}
                    onChange={(e) => update({ annualSafety: e.target.checked })}
                  />
                  All annual safety, claims, equipment-care and compliance
                  requirements met
                </label>
              </div>
              <div className="rule-note">
                Net revenue excluding FSC: {money(r.bulkNetRevenue)} per driver.
                Quarterly safety: {money(r.quarterBonus)} total. Additional
                year-end safety: {money(r.annualBonus)} total. Unqualified
                quarters do not earn their safety award; the year-end award
                requires all four quarters and the full year to qualify.
              </div>
            </section>
          ) : (
            <>
              <section className="panel simple-editor">
                <div className="panel-heading">
                  <div>
                    <h2>2. Approved mileage and work premiums</h2>
                    <p>
                      Loaded base: {(r.source.loaded * 100).toFixed(0)}¢/mile.
                      Empty base: {(r.source.empty * 100).toFixed(0)}¢/mile.
                      Split miles into non-overlapping segments with the same
                      premiums.
                    </p>
                  </div>
                  <button
                    className="button secondary"
                    onClick={() =>
                      update({
                        legs: [
                          ...p.legs,
                          {
                            id: id(),
                            name: "New mileage segment",
                            type: "loaded",
                            miles: 0,
                            dimension: "none",
                            length: "none",
                            trailer: "none",
                            coast: false,
                            superB: false,
                            steerable: false,
                          },
                        ],
                      })
                    }
                  >
                    <Plus size={15} />
                    Add segment
                  </button>
                </div>
                {p.legs.map((leg) => (
                  <details className="driver-leg" key={leg.id} open>
                    <summary>
                      {leg.name} · {leg.miles.toLocaleString("en-CA")} miles
                    </summary>
                    <div className="form-grid">
                      <label>
                        Segment name
                        <input
                          value={leg.name}
                          onChange={(e) =>
                            update({
                              legs: p.legs.map((v) =>
                                v.id === leg.id
                                  ? { ...v, name: e.target.value }
                                  : v,
                              ),
                            })
                          }
                        />
                      </label>
                      <label>
                        Loaded or empty?
                        <select
                          value={leg.type}
                          onChange={(e) =>
                            update({
                              legs: p.legs.map((v) =>
                                v.id === leg.id
                                  ? {
                                      ...v,
                                      type: e.target.value as
                                        "loaded" | "empty",
                                      ...(e.target.value === "empty"
                                        ? {
                                            dimension: "none",
                                            length: "none",
                                            trailer: "none",
                                            steerable: false,
                                          }
                                        : {}),
                                    }
                                  : v,
                              ),
                            })
                          }
                        >
                          <option value="loaded">Loaded</option>
                          <option value="empty">Empty</option>
                        </select>
                      </label>
                      <Field
                        label={`${leg.name} approved miles`}
                        value={leg.miles}
                        onChange={(miles) =>
                          update({
                            legs: p.legs.map((v) =>
                              v.id === leg.id ? { ...v, miles } : v,
                            ),
                          })
                        }
                      />
                      {leg.type === "loaded" && (
                        <>
                          {[
                            [
                              "dimension",
                              "Width / height rate band",
                              dimensionChoices(p.package),
                            ],
                            [
                              "length",
                              "Length rate band",
                              lengthChoices(p.package),
                            ],
                            [
                              "trailer",
                              "RGN / trailer rate band",
                              trailerChoices(p.package),
                            ],
                          ].map(([key, label, choices]) => (
                            <label key={String(key)}>
                              {String(label)}
                              <select
                                value={
                                  leg[key as "dimension" | "length" | "trailer"]
                                }
                                onChange={(e) =>
                                  update({
                                    legs: p.legs.map((v) =>
                                      v.id === leg.id
                                        ? {
                                            ...v,
                                            [String(key)]: e.target.value,
                                          }
                                        : v,
                                    ),
                                  })
                                }
                              >
                                {(
                                  choices as ReturnType<typeof dimensionChoices>
                                ).map((choice) => (
                                  <option key={choice.id} value={choice.id}>
                                    {choice.label} ·{" "}
                                    {choice.rate.toLocaleString("en-CA", {
                                      style: "currency",
                                      currency: "CAD",
                                      maximumFractionDigits: 2,
                                    })}
                                    /mile
                                  </option>
                                ))}
                              </select>
                            </label>
                          ))}
                        </>
                      )}
                    </div>
                    <div className="driver-checks">
                      <label>
                        <input
                          type="checkbox"
                          checked={leg.coast}
                          onChange={(e) =>
                            update({
                              legs: p.legs.map((v) =>
                                v.id === leg.id
                                  ? { ...v, coast: e.target.checked }
                                  : v,
                              ),
                            })
                          }
                        />
                        All miles in this segment qualify for the 10¢
                        regional/coast premium
                      </label>
                      {p.package !== "us-heavy-haul" && (
                        <label>
                          <input
                            type="checkbox"
                            checked={leg.superB}
                            onChange={(e) =>
                              update({
                                legs: p.legs.map((v) =>
                                  v.id === leg.id
                                    ? { ...v, superB: e.target.checked }
                                    : v,
                                ),
                              })
                            }
                          />
                          Approved Super-B miles (+6¢)
                        </label>
                      )}
                      {p.package === "us-heavy-haul" &&
                        leg.type === "loaded" && (
                          <label>
                            <input
                              type="checkbox"
                              checked={leg.steerable}
                              onChange={(e) =>
                                update({
                                  legs: p.legs.map((v) =>
                                    v.id === leg.id
                                      ? { ...v, steerable: e.target.checked }
                                      : v,
                                  ),
                                })
                              }
                            />
                            Steerable trailer dispatched (+50¢ loaded mile)
                          </label>
                        )}
                      {!legacy &&
                        p.package !== "us-heavy-haul" &&
                        leg.trailer !== "none" && (
                          <p>
                            RGN axle pay replaces length pay on this segment.
                            The length premium is not added again.
                          </p>
                        )}
                      <button
                        className="button secondary danger"
                        onClick={() =>
                          update({
                            legs: p.legs.filter((v) => v.id !== leg.id),
                          })
                        }
                      >
                        Remove segment
                      </button>
                    </div>
                  </details>
                ))}
                {p.package === "us-heavy-haul" && (
                  <div className="driver-checks">
                    <label>
                      <input
                        type="checkbox"
                        checked={p.detailedTrailerReviewed}
                        onChange={(e) =>
                          update({ detailedTrailerReviewed: e.target.checked })
                        }
                      />
                      I have confirmed the detailed page 6 trailer rates,
                      including 13-axle at $1.13/mile rather than the summary’s
                      stated maximum
                    </label>
                  </div>
                )}
                <div className="rule-note">
                  Use approved PC Miler/practical miles for legal loads and
                  approved permitted-route miles for OD/overweight work. Choose
                  one width/height or combined band; combined rates replace
                  separate width-plus-height additions. Do not count the same
                  miles twice.
                </div>
              </section>
              <section className="panel simple-editor">
                <div className="panel-heading">
                  <div>
                    <h2>3. Safety, skill and loyalty bonuses</h2>
                    <p>
                      These apply to loaded and empty miles. Rates use the
                      selected package and entered service/mileage
                      qualifications.
                    </p>
                  </div>
                </div>
                <div className="form-grid">
                  <label>
                    Driver safety level
                    <select
                      aria-label="Driver safety level"
                      value={p.safetyLevel}
                      onChange={(e) => update({ safetyLevel: +e.target.value })}
                    >
                      {Array.from({ length: legacy ? 6 : 5 }, (_, n) => (
                        <option key={n} value={n}>
                          {n === 0 ? "Not assigned" : `Level ${n}`}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="required-rule">
                    <input
                      type="checkbox"
                      checked={p.safetyEligible}
                      onChange={(e) =>
                        update({ safetyEligible: e.target.checked })
                      }
                    />
                    Safety criteria met: tickets, preventable accidents,
                    equipment care, procedures, camera scores and compliance as
                    applicable
                  </label>
                  {!legacy && (
                    <>
                      <label>
                        Actively demonstrated skill level
                        <select
                          value={p.skillLevel}
                          onChange={(e) =>
                            update({ skillLevel: +e.target.value })
                          }
                        >
                          {[
                            "Trainee",
                            "Legal",
                            "Over dimensional",
                            "RGN specialized",
                            "Heavy Haul specialized",
                          ].map((v, n) => (
                            <option key={v} value={n + 1}>
                              {n + 1}: {v}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="required-rule">
                        <input
                          type="checkbox"
                          checked={p.skillActive}
                          onChange={(e) =>
                            update({ skillActive: e.target.checked })
                          }
                        />
                        Skill level is actively demonstrated on qualifying work
                      </label>
                    </>
                  )}
                  <Field
                    label="Completed Q-Line service (months)"
                    value={p.serviceMonths}
                    onChange={(serviceMonths) => update({ serviceMonths })}
                  />
                  <Field
                    label="Verified miles in the last 12 months"
                    value={p.trailingMiles}
                    onChange={(trailingMiles) => update({ trailingMiles })}
                  />
                  {legacy && (
                    <Field
                      label="Continuous service days (orientation eligibility)"
                      value={p.continuousServiceDays}
                      onChange={(continuousServiceDays) =>
                        update({ continuousServiceDays })
                      }
                    />
                  )}
                </div>
                <div className="scenario-results">
                  <div>
                    <span>Safety rate</span>
                    <strong>{(r.safetyRate * 100).toFixed(2)}¢/mile</strong>
                  </div>
                  <div>
                    <span>Skill rate</span>
                    <strong>{(r.skillRate * 100).toFixed(2)}¢/mile</strong>
                  </div>
                  <div>
                    <span>Loyalty rate</span>
                    <strong>{(r.loyaltyRate * 100).toFixed(2)}¢/mile</strong>
                  </div>
                  <div>
                    <span>Approved miles entered</span>
                    <strong>{r.miles.toLocaleString("en-CA")}</strong>
                  </div>
                </div>
                <div className="rule-note">
                  Loyalty starts at 6 months (1¢), 2 years (2¢), 5 years (3¢),
                  and 10 years (4¢). Before 2 years the mileage multiplier does
                  not apply. At 2+ years it is 0% below 90,000 miles, 50% at
                  90,000, 100% at 105,000 and 110% at 125,000, with a final 4¢
                  cap. The legacy Regional safety ranks differ from the 2026
                  levels and have no separate skill bonus.
                </div>
              </section>
            </>
          )}
          <section className="panel simple-editor">
            <div className="panel-heading">
              <div>
                <h2>4. Approved extra pay</h2>
                <p>
                  Regular duties are kept out of incentive totals. Add a
                  separate incentive item only if it is truly a bonus.
                </p>
              </div>
              <button
                className="button secondary"
                onClick={() =>
                  update({
                    extras: [
                      ...p.extras,
                      {
                        id: id(),
                        name: "Approved extra pay",
                        quantity: 0,
                        rate: 0,
                        kind: "regular",
                        approved: false,
                      },
                    ],
                  })
                }
              >
                <Plus size={15} />
                Add item
              </button>
            </div>
            <div className="driver-rate-guide">
              <details>
                <summary>Source rates for extra pay</summary>
                <p>
                  {bulk
                    ? "Bulk 2023 supplies orientation at $150/day. Extra rates from the Deck packages do not automatically apply."
                    : legacy
                      ? "Regional 2021: standard BOL $75, RGN BOL $40 (do not count the same event under both); project work $22.50/hour east or $25/hour west of the AB–SK border; orientation $100/day after 31 continuous days."
                      : "2026 Deck/HH: extra picks/drops $100 (original included in mileage rate), project work $30/hour, site/chain-up $150/approved occurrence; one-time orientation $525."}
                </p>
                <p>
                  {bulk
                    ? "Bulk 2023: orientation $150/day. Other extra rates are not supplied; enter only an approved rate."
                    : "Tarping: lumber $100; general freight up to 15′ $50, 15′1″–27′ $75, 27′1″+ $150. Heavy Haul also lists over-full-truckload $200. Enter separate approved counts with the applicable rate."}
                </p>
                <p>
                  Waiting time has no fixed rate in these sources. Enter an
                  approved rate; the 2021 package normally excludes waiting time
                  before 24 hours unless specifically approved. Do not count the
                  same work as both mileage and local hourly pay unless policy
                  allows it. Reimbursements, vacation pay, statutory deductions,
                  benefits and taxes are outside this estimate.
                </p>
              </details>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Pay item</th>
                    <th>Quantity / hours</th>
                    <th>Rate ($)</th>
                    <th>Class</th>
                    <th>Approved</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {p.extras.map((e) => (
                    <tr key={e.id}>
                      <td>
                        <input
                          aria-label="Driver extra pay name"
                          value={e.name}
                          style={{ width: 210 }}
                          onChange={(event) =>
                            update({
                              extras: p.extras.map((v) =>
                                v.id === e.id
                                  ? { ...v, name: event.target.value }
                                  : v,
                              ),
                            })
                          }
                        />
                      </td>
                      <td>
                        <input
                          aria-label={e.name + " quantity"}
                          type="number"
                          min="0"
                          step="any"
                          value={e.quantity}
                          onChange={(event) =>
                            update({
                              extras: p.extras.map((v) =>
                                v.id === e.id
                                  ? {
                                      ...v,
                                      quantity: Math.max(
                                        0,
                                        +event.target.value,
                                      ),
                                    }
                                  : v,
                              ),
                            })
                          }
                        />
                      </td>
                      <td>
                        <input
                          aria-label={e.name + " rate"}
                          type="number"
                          min="0"
                          step="any"
                          value={e.rate}
                          onChange={(event) =>
                            update({
                              extras: p.extras.map((v) =>
                                v.id === e.id
                                  ? {
                                      ...v,
                                      rate: Math.max(0, +event.target.value),
                                    }
                                  : v,
                              ),
                            })
                          }
                        />
                      </td>
                      <td>
                        <select
                          aria-label={e.name + " classification"}
                          value={e.kind}
                          onChange={(event) =>
                            update({
                              extras: p.extras.map((v) =>
                                v.id === e.id
                                  ? {
                                      ...v,
                                      kind: event.target.value as
                                        "regular" | "incentive",
                                    }
                                  : v,
                              ),
                            })
                          }
                        >
                          <option value="regular">Regular pay</option>
                          <option value="incentive">Incentive</option>
                        </select>
                      </td>
                      <td>
                        <input
                          aria-label={e.name + " approved"}
                          type="checkbox"
                          checked={e.approved}
                          onChange={(event) =>
                            update({
                              extras: p.extras.map((v) =>
                                v.id === e.id
                                  ? { ...v, approved: event.target.checked }
                                  : v,
                              ),
                            })
                          }
                        />
                      </td>
                      <td>
                        <button
                          aria-label={"Remove " + e.name}
                          onClick={() =>
                            update({
                              extras: p.extras.filter((v) => v.id !== e.id),
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
            <div className="rule-note">
              Approvals here record confirmed inputs for planning; they do not
              verify approvers or run payroll. This estimate is{" "}
              {p.included ? "included" : "excluded"} in Company total for{" "}
              {p.year}. Multiple records can cover different work for one
              driver; avoid entering the same work or incentive twice.
            </div>
          </section>
        </>
      ) : (
        <section className="panel empty">
          <h2>No driver pay estimates yet</h2>
          <p>
            Choose one of the five source packages above, then enter the
            approved work and eligibility information.
          </p>
        </section>
      )}
    </>
  );
}
function DriverStat({
  label,
  amount,
  invalid,
  note,
}: {
  label: string;
  amount: number;
  invalid: boolean;
  note: string;
}) {
  return (
    <div className="metric">
      <div className="metric-label">{label}</div>
      <strong className="metric-value">
        {invalid ? "Check inputs" : money(amount)}
      </strong>
      <div className="metric-detail">{note}</div>
    </div>
  );
}
