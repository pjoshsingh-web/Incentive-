"use client";
import { ArrowRight, Download } from "lucide-react";
import { Company } from "../../lib/workspace";
import { executiveTotal } from "../../lib/executive";
import { formatMoney as money } from "../../lib/currency";
export function CompanyTotalStrip({
  company: c,
  onOpen,
}: {
  company: Company;
  onOpen: () => void;
}) {
  const year = c.summaryYear ?? new Date().getFullYear();
  const r = executiveTotal(c, year);
  return (
    <section
      className="company-total-strip"
      aria-label="Live company incentive total"
    >
      <div>
        <span>COMPANY INCENTIVES · {year} · CAD</span>
        <strong>
          {r.incomplete ? "Check included plans" : money(r.incentive)}
        </strong>
        <small>Regular plans + leadership + driver bonuses</small>
      </div>
      <div>
        <span>With employer costs</span>
        <strong>{r.incomplete ? "Incomplete" : money(r.loaded)}</strong>
        <small>Includes {c.overhead}% on incentives only</small>
      </div>
      <button onClick={onOpen}>
        View company total <ArrowRight size={15} />
      </button>
    </section>
  );
}
export function CompanyTotal({
  company: c,
  onChange,
  onOpen,
}: {
  company: Company;
  onChange: (v: Partial<Company>) => void;
  onOpen: (name: string) => void;
}) {
  const year = c.summaryYear ?? new Date().getFullYear(),
    r = executiveTotal(c, year);
  const years = [
    ...new Set([
      year,
      new Date().getFullYear() - 1,
      new Date().getFullYear(),
      new Date().getFullYear() + 1,
      ...c.plans.map((p) => p.year).filter((v): v is number => v !== undefined),
      ...(c.leadershipPlans ?? []).map((p) => p.year),
      ...(c.driverPay ?? []).map((p) => p.year),
    ]),
  ].sort((a, b) => b - a);
  const include = (id: string, category: string, included: boolean) => {
    if (category === "Regular incentive")
      onChange({
        plans: c.plans.map((p) =>
          p.id === id ? { ...p, enabled: included } : p,
        ),
      });
    else if (category === "Leadership incentive")
      onChange({
        leadershipPlans: c.leadershipPlans?.map((p) =>
          p.id === id ? { ...p, includeInCompanyTotal: included } : p,
        ),
      });
    else
      onChange({
        driverPay: c.driverPay?.map((p) =>
          p.id === id ? { ...p, included } : p,
        ),
      });
  };
  const download = () => {
    const cell = (value: string | number) =>
      '"' +
      String(value)
        .replace(/^[=+\-@\t\r]/, "'$&")
        .replaceAll('"', '""') +
      '"';
    const lines = [
      ["Company", c.company, "Year", year, "Currency", "CAD"],
      [
        "Name",
        "Division",
        "Category",
        "Included this year",
        "Annual incentive",
        "Employer-loaded incentive",
        "Current-input ceiling",
        "Regular driver pay",
        "Leadership salary",
        "Status",
      ],
      ...r.rows.map((row) => [
        row.name,
        row.division,
        row.category,
        row.included ? "Yes" : "No",
        row.annual,
        Math.round(
          (row.annual * (1 + c.overhead / 100) + Number.EPSILON) * 100,
        ) / 100,
        Number.isFinite(row.maximum) ? row.maximum : "No stated cap",
        row.regularPay,
        row.baseSalary,
        row.errors.join(" | ") || "Ready",
      ]),
      ["COMPANY INCENTIVES", r.incentive],
      ["WITH EMPLOYER COSTS", r.loaded],
      ["ANNUAL BUDGET", r.annualBudget],
      [
        "REGULAR DRIVER PAY (EXCLUDED FROM INCENTIVE TOTAL)",
        r.regularDriverPay,
      ],
      ["LEADERSHIP SALARY (EXCLUDED FROM INCENTIVE TOTAL)", r.leadershipSalary],
      ["MODELED CASH COMPENSATION (NOT FULL COMPANY PAYROLL)", r.modeledCash],
    ];
    const url = URL.createObjectURL(
      new Blob([lines.map((line) => line.map(cell).join(",")).join("\r\n")], {
        type: "text/csv;charset=utf-8",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `company-incentives-${year}-CAD.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <>
      <div className="executive-toolbar">
        <label>
          Report year
          <select
            aria-label="Company total report year"
            value={year}
            onChange={(e) => onChange({ summaryYear: +e.target.value })}
          >
            {years.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <button
          className="button secondary"
          disabled={r.incomplete}
          onClick={download}
        >
          <Download size={15} />
          Export executive summary
        </button>
      </div>
      <div className="metric-grid">
        <ReportStat
          label="Company annual incentives"
          value={r.incomplete ? "Incomplete" : money(r.incentive)}
          note={`${r.includedCount} included plans / estimates`}
        />
        <ReportStat
          label="Incentives + employer costs"
          value={r.incomplete ? "Incomplete" : money(r.loaded)}
          note={`${c.overhead}% applied once to incentives`}
        />
        <ReportStat
          label="Annual incentive budget"
          value={money(r.annualBudget)}
          note={`${money(c.budget)} × ${r.periods} company periods`}
        />
        <ReportStat
          label="Budget left after employer costs"
          value={r.incomplete ? "Incomplete" : money(r.budgetRemaining)}
          note="Negative means the forecast exceeds budget"
        />
      </div>
      <div className="plain-note">
        This report is private to this account; export the summary to share it
        with the executive team. It is a forecast from saved inputs, not payroll
        actuals. Regular plans without a year are treated as ongoing and repeat
        the selected company period {r.periods} times. Multi-part plans use
        their exact annual projections; leadership and driver estimates use only{" "}
        {year}. Driver amounts cover only the entered work and are not
        automatically projected to a full year. Recipients, shared pools,
        eligibility and caps are applied before totaling.
      </div>
      {r.incomplete && (
        <div className="cloud-save-alert" role="alert">
          <strong>The full company total is not ready.</strong>
          <ul>
            {r.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
          <p>
            Fix or exclude these plans. Incomplete estimates are not presented
            as a complete company total.
          </p>
        </div>
      )}
      <section className="panel editor">
        <div className="panel-heading">
          <div>
            <h2>Where the incentive cost comes from</h2>
            <p>
              Only checked items for this report year contribute. Draft
              templates start excluded. Copied plans are separate costs if
              included.
            </p>
          </div>
        </div>
        <div className="table-scroll">
          <table className="executive-plan-table">
            <thead>
              <tr>
                <th>Include</th>
                <th>Plan / estimate</th>
                <th>Division</th>
                <th>Type</th>
                <th>Year</th>
                <th>Annual incentive</th>
                <th>With employer costs</th>
                <th>Current-input ceiling*</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {r.rows.map((row) => (
                <tr key={row.category + row.id}>
                  <td>
                    <input
                      aria-label={"Include " + row.name + " in company total"}
                      type="checkbox"
                      checked={row.included}
                      onChange={(e) =>
                        include(row.id, row.category, e.target.checked)
                      }
                    />
                  </td>
                  <td>
                    <button
                      className="executive-open"
                      onClick={() =>
                        onOpen(
                          row.category === "Regular incentive"
                            ? "Bonus plans"
                            : row.category === "Leadership incentive"
                              ? "Annual leadership"
                              : "Driver pay",
                        )
                      }
                    >
                      {row.name}
                    </button>
                  </td>
                  <td>{row.division}</td>
                  <td>{row.category}</td>
                  <td>
                    {row.category === "Regular incentive" ? (
                      <select
                        aria-label={"Report year for " + row.name}
                        value={row.year ?? ""}
                        onChange={(e) =>
                          onChange({
                            plans: c.plans.map((p) =>
                              p.id === row.id
                                ? {
                                    ...p,
                                    year: e.target.value
                                      ? +e.target.value
                                      : undefined,
                                  }
                                : p,
                            ),
                          })
                        }
                      >
                        <option value="">Ongoing</option>
                        {years.map((v) => (
                          <option key={v}>{v}</option>
                        ))}
                      </select>
                    ) : (
                      row.year
                    )}
                  </td>
                  <td>
                    {row.errors.length ? "Needs inputs" : money(row.annual)}
                  </td>
                  <td>
                    {row.errors.length
                      ? "—"
                      : money(row.annual * (1 + c.overhead / 100))}
                  </td>
                  <td>{row.errors.length ? "—" : money(row.maximum)}</td>
                  <td>
                    {!row.included
                      ? "Excluded / other year"
                      : row.errors.length
                        ? "Fix inputs"
                        : "Included"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rule-note">
          *Some commissions have no stated dollar cap; in that case no fixed
          company-wide ceiling can be claimed. Pool-based Tracker limits depend
          on the GP entered. Driver ceilings assume the mileage/revenue entered
          stays fixed. The projected incentive total is still calculated from
          current inputs.
        </div>
      </section>
      <section className="panel editor">
        <div className="panel-heading">
          <div>
            <h2>By division</h2>
            <p>
              Driver base pay, duties and leadership salary remain separate from
              incentives.
            </p>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Division</th>
                <th>Annual incentives</th>
                <th>With employer costs</th>
                <th>Regular driver pay</th>
                <th>Leadership base salary</th>
              </tr>
            </thead>
            <tbody>
              {r.divisions.map((d) => (
                <tr key={d.name}>
                  <td>{d.name}</td>
                  <td>{d.errors ? "Incomplete" : money(d.incentive)}</td>
                  <td>{d.errors ? "Incomplete" : money(d.loaded)}</td>
                  <td>{money(d.regularPay)}</td>
                  <td>{money(d.leadershipSalary)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {r.allocations.length > 0 && (
        <section className="panel editor">
          <div className="panel-heading">
            <div>
              <h2>Shared pool allocation</h2>
              <p>
                A pool’s full value is not added to awards again. This check
                flags awards that exceed the available pool.
              </p>
            </div>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Pool</th>
                  <th>Available (4 quarters)</th>
                  <th>Allocated annual awards</th>
                  <th>Remaining</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {r.allocations.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{money(p.available)}</td>
                    <td>{money(p.awarded)}</td>
                    <td>{money(p.available - p.awarded)}</td>
                    <td>{p.over ? "Over allocated" : "Within pool"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <section className="panel editor">
        <div className="panel-heading">
          <div>
            <h2>Keep pay and incentives separate</h2>
            <p>
              These companion figures help the executive team understand the
              scope.
            </p>
          </div>
        </div>
        <div className="scenario-results">
          <div>
            <span>Regular driver pay</span>
            <strong>{money(r.regularDriverPay)}</strong>
          </div>
          <div>
            <span>Leadership base salaries</span>
            <strong>{money(r.leadershipSalary)}</strong>
          </div>
          <div>
            <span>All modeled cash compensation</span>
            <strong>
              {r.incomplete ? "Incomplete" : money(r.modeledCash)}
            </strong>
          </div>
          <div>
            <span>Incentive ceiling*</span>
            <strong>{r.incomplete ? "Incomplete" : money(r.maximum)}</strong>
          </div>
        </div>
        <div className="rule-note">
          Modeled cash = entered regular driver pay + leadership salary + all
          included incentives. It excludes base wages for other employees,
          benefits, taxes, reimbursements and other payroll costs. It is not
          full company payroll. Driver incentives already included here must not
          be recreated as another bonus plan for the same work.
        </div>
      </section>
    </>
  );
}
function ReportStat({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="metric">
      <div className="metric-label">{label}</div>
      <strong className="metric-value">{value}</strong>
      <div className="metric-detail">{note}</div>
    </div>
  );
}
