import {
  companyScorecard,
  divisionScorecard,
  validScorecard,
  type Scorecard,
} from "./business";
import type { Profile } from "./finance";
export type Metric = {
  id: string;
  name: string;
  unit: string;
  direction: "higher" | "lower";
  weight: number;
  target: number;
  actual: number;
  threshold: number;
  cap: number;
  accelerator: number;
  gate: boolean;
  source:
    | "manual"
    | "department-opex"
    | "company-revenue"
    | "company-margin"
    | "division-revenue"
    | "division-margin"
    | "company-other"
    | "division-other";
  sourceId?: string;
};
export type Plan = {
  id: string;
  name: string;
  department: string;
  role: string;
  scope: "individual" | "department";
  participants: number;
  incentive: number;
  cap: number;
  enabled: boolean;
  metrics: Metric[];
  bindingError?: string;
};
export type Department = {
  scorecard?: Scorecard;
  id: string;
  name: string;
  budget: number;
  actual: number;
};
export type Company = Profile & {
  scorecard?: Scorecard;
  id: string;
  period: "Monthly" | "Quarterly" | "Annual";
  overhead: number;
  departments: Department[];
  plans: Plan[];
};
export type Workspace = { version: 2; activeId: string; companies: Company[] };
export const id = () => globalThis.crypto.randomUUID();
export const industries = [
  "Trucking & transportation",
  "Logistics & warehousing",
  "Technology & software",
  "Professional services",
  "Manufacturing",
  "Retail & commerce",
  "Healthcare",
  "Accounting & tax services",
  "Advertising & marketing",
  "Agriculture & agribusiness",
  "Automotive",
  "Banking & financial services",
  "Construction & building trades",
  "Education & training",
  "Energy & utilities",
  "Engineering & architecture",
  "Food & beverage",
  "Hospitality & tourism",
  "Insurance",
  "Legal services",
  "Media & entertainment",
  "Nonprofit & social enterprise",
  "Real estate & property management",
  "Recruitment & staffing",
  "Telecommunications",
  "Wholesale & distribution",
  "Other industry",
];
export const roles: Record<string, string[]> = {
  "Fleet operations": [
    "Company Driver",
    "Owner-Operator Coordinator",
    "Dispatcher",
    "Dispatch Manager",
    "Fleet Manager",
    "Operations Manager",
    "Terminal Manager",
    "Route Planner",
    "Yard Jockey",
    "Driver Trainer",
  ],
  "Safety & compliance": [
    "Safety Director",
    "Safety Manager",
    "DOT Compliance Specialist",
    "Driver Qualification Specialist",
    "Claims Specialist",
  ],
  Maintenance: [
    "Diesel Technician",
    "Maintenance Manager",
    "Shop Foreman",
    "Parts Specialist",
    "Tire Technician",
  ],
  "Sales & customer service": [
    "Sales Representative",
    "Account Manager",
    "Sales Manager",
    "Freight Broker",
    "Customer Service Representative",
    "Pricing Analyst",
  ],
  "Finance & administration": [
    "Billing Specialist",
    "Collections Specialist",
    "Payroll Specialist",
    "Controller",
    "Administrative Assistant",
  ],
  "People & recruiting": [
    "Driver Recruiter",
    "HR Manager",
    "Recruiting Coordinator",
  ],
  Leadership: [
    "General Manager",
    "Director of Operations",
    "Chief Operating Officer",
    "President",
  ],
  Warehouse: [
    "Warehouse Associate",
    "Warehouse Manager",
    "Forklift Operator",
    "Dock Supervisor",
  ],
};
function metric(
  name: string,
  unit: string,
  target: number,
  direction: Metric["direction"],
  weight: number,
  gate = false,
): Metric {
  return {
    id: id(),
    name,
    unit,
    target,
    actual: target,
    direction,
    weight,
    threshold: 80,
    cap: 150,
    accelerator: 1.25,
    gate,
    source: "manual",
  };
}
export function template(
  role: string,
  department: string,
  scope: Plan["scope"] = "individual",
): Plan {
  let metrics: Metric[];
  if (scope === "department")
    metrics = [
      metric("Department operating expense", "$", 100000, "lower", 60),
      metric("Service level", "%", 98, "higher", 40),
    ];
  else if (
    /Driver|Yard Jockey/.test(role) &&
    !/(Recruiter|Qualification|Trainer)/.test(role)
  )
    metrics = [
      metric("On-time delivery", "%", 98, "higher", 50),
      metric("Fuel efficiency", "MPG", 7, "higher", 50),
      metric("Preventable incidents", "incidents", 0, "lower", 0, true),
    ];
  else if (department === "Maintenance")
    metrics = [
      metric("Preventive maintenance compliance", "%", 98, "higher", 50),
      metric("Maintenance cost per mile", "$/mile", 0.18, "lower", 50),
    ];
  else if (department === "Safety & compliance")
    metrics = [
      metric("Audit compliance", "%", 100, "higher", 50),
      metric("Preventable incidents", "incidents", 1, "lower", 50),
    ];
  else if (department === "Sales & customer service")
    metrics = [
      metric("Gross profit", "$", 50000, "higher", 60),
      metric("Customer retention", "%", 95, "higher", 40),
    ];
  else if (department === "People & recruiting")
    metrics = [
      metric("90-day driver retention", "%", 90, "higher", 60),
      metric("Cost per hire", "$", 3000, "lower", 40),
    ];
  else if (department === "Finance & administration")
    metrics = [
      metric("Invoice accuracy", "%", 99, "higher", 50),
      metric("Days sales outstanding", "days", 35, "lower", 50),
    ];
  else if (department === "Warehouse")
    metrics = [
      metric("Order accuracy", "%", 99, "higher", 50),
      metric("Handling cost per shipment", "$", 15, "lower", 50),
    ];
  else
    metrics = [
      metric("On-time service", "%", 98, "higher", 50),
      metric("Operating cost per mile", "$/mile", 1.8, "lower", 50),
    ];
  if (scope === "department") metrics[0].source = "department-opex";
  return {
    id: id(),
    name: scope === "department" ? department + " team bonus" : role + " bonus",
    department,
    role,
    scope,
    participants: scope === "department" ? 1 : 5,
    incentive: scope === "department" ? 10000 : 1000,
    cap: 150,
    enabled: true,
    metrics,
  };
}
export function newCompany(): Company {
  return {
    id: id(),
    company: "New company",
    industry: "Trucking & transportation",
    revenue: 12000000,
    growth: 10,
    margin: 25,
    employees: 60,
    budget: 30000,
    period: "Monthly",
    overhead: 10,
    scorecard: {
      revenueTarget: 1100000,
      revenueActual: 1000000,
      marginTarget: 25,
      marginActual: 24,
      other: [],
    },
    departments: [
      {
        id: id(),
        name: "Fleet operations",
        budget: 650000,
        actual: 630000,
        scorecard: {
          revenueTarget: 900000,
          revenueActual: 850000,
          marginTarget: 25,
          marginActual: 23,
          other: [],
        },
      },
      { id: id(), name: "Maintenance", budget: 90000, actual: 95000 },
      { id: id(), name: "Safety & compliance", budget: 30000, actual: 28000 },
    ],
    plans: [],
  };
}
export function sampleWorkspace(): Workspace {
  const c = newCompany();
  c.company = "Northstar Transport";
  c.plans = [
    template("Company Driver", "Fleet operations"),
    template("Dispatcher", "Fleet operations"),
    template("Maintenance Manager", "Maintenance"),
  ];
  return { version: 2, activeId: c.id, companies: [c] };
}
export function planErrors(p: Plan): string[] {
  const errors: string[] = [];
  if (p.bindingError) errors.push(p.bindingError);
  if (!p.name.trim() || !p.role.trim() || !p.department.trim())
    errors.push("Add a plan name, job title, and division or team.");
  if (!Number.isInteger(p.participants) || p.participants < 1)
    errors.push("Enter at least one person, using a whole number.");
  if (
    !Number.isFinite(p.incentive) ||
    p.incentive < 0 ||
    !Number.isFinite(p.cap) ||
    p.cap < 0
  )
    errors.push("Bonus amounts and payment limits cannot be negative.");
  const weighted = p.metrics.filter((m) => !m.gate);
  if (
    !weighted.length ||
    Math.abs(weighted.reduce((s, m) => s + m.weight, 0) - 100) > 0.001
  )
    errors.push(
      "Bonus shares must add up to 100%. Change the shares or use “Split bonus equally”.",
    );
  for (const m of p.metrics) {
    if (
      !m.name.trim() ||
      ![m.target, m.actual, m.weight, m.threshold, m.cap, m.accelerator].every(
        Number.isFinite,
      ) ||
      (m.gate ? m.target < 0 : m.target <= 0) ||
      m.actual < 0 ||
      m.weight < 0 ||
      m.threshold < 0 ||
      m.threshold > 100 ||
      m.cap < 0 ||
      m.accelerator < 0
    )
      errors.push(
        `${m.name || "Metric"}: use a goal above zero (required rules may use zero), numbers of zero or more, and a starting level from 0 to 100%.`,
      );
  }
  return errors;
}
export function attainment(m: Metric): number {
  return m.direction === "higher"
    ? (m.actual / m.target) * 100
    : m.actual === 0
      ? Infinity
      : (m.target / m.actual) * 100;
}
export function metricFactor(m: Metric): number {
  const a = attainment(m);
  if (a < m.threshold) return 0;
  return Math.min(
    m.cap / 100,
    a <= 100 ? a / 100 : 1 + ((a - 100) / 100) * m.accelerator,
  );
}
export function calculatePlan(p: Plan) {
  const errors = planErrors(p);
  const pool = p.incentive * (p.scope === "individual" ? p.participants : 1);
  const gatesPassed = p.metrics
    .filter((m) => m.gate)
    .every((m) =>
      m.direction === "higher" ? m.actual >= m.target : m.actual <= m.target,
    );
  const maximum =
    Math.round(
      Math.min(
        (pool * p.cap) / 100,
        pool *
          p.metrics
            .filter((m) => !m.gate)
            .reduce((s, m) => s + ((m.weight / 100) * m.cap) / 100, 0),
      ) * 100,
    ) / 100;
  const payout =
    errors.length || !p.enabled || !gatesPassed
      ? 0
      : Math.round(
          Math.min(
            (pool * p.cap) / 100,
            pool *
              p.metrics
                .filter((m) => !m.gate)
                .reduce((s, m) => s + (m.weight / 100) * metricFactor(m), 0),
          ) * 100,
        ) / 100;
  return { errors, pool, maximum, payout, gatesPassed };
}
export function resolvedPlan(c: Company, p: Plan): Plan {
  const errors: string[] = [];
  const metrics = p.metrics.map((m) => {
    if (m.source === "manual") return m;
    const division = c.departments.filter((d) => d.name === p.department);
    if (
      (m.source.startsWith("division-") || m.source === "department-opex") &&
      division.length !== 1
    ) {
      errors.push("Choose a division with saved numbers for this plan.");
      return m;
    }
    if (m.source === "department-opex")
      return { ...m, actual: division[0].actual };
    const card = m.source.startsWith("company-")
      ? companyScorecard(c)
      : divisionScorecard(division[0]);
    if (m.source.endsWith("-revenue"))
      return {
        ...m,
        target: card.revenueTarget,
        actual: card.revenueActual,
        unit: "$",
        direction: "higher" as const,
      };
    if (m.source.endsWith("-margin"))
      return {
        ...m,
        target: card.marginTarget,
        actual: card.marginActual,
        unit: "%",
        direction: "higher" as const,
      };
    const measure = card.other.find((v) => v.id === m.sourceId);
    if (!measure) {
      errors.push(
        "A linked measure was removed. Choose another measure or enter numbers yourself.",
      );
      return m;
    }
    return {
      ...m,
      name: measure.name,
      target: measure.target,
      actual: measure.actual,
      unit: measure.unit,
      direction: measure.direction,
    };
  });
  return {
    ...p,
    metrics,
    bindingError: errors.length ? [...new Set(errors)].join(" ") : undefined,
  };
}
export function companyTotals(c: Company) {
  const results = c.plans
    .filter((p) => p.enabled)
    .map((p) => calculatePlan(resolvedPlan(c, p)));
  const payout = results.reduce((s, r) => s + r.payout, 0);
  const maximum = results.reduce((s, r) => s + r.maximum, 0);
  const budget = c.departments.reduce((s, d) => s + d.budget, 0);
  const actual = c.departments.reduce((s, d) => s + d.actual, 0);
  const loaded = payout * (1 + c.overhead / 100);
  return {
    payout,
    maximum,
    loaded,
    budget,
    actual,
    variance: budget - actual,
    afterIncentives: budget - actual - loaded,
    exposure: loaded - c.budget,
    invalid: results.some((r) => r.errors.length > 0),
    loadedMaximum: maximum * (1 + c.overhead / 100),
  };
}
// Validate untrusted backup and browser data before it reaches financial calculations.
export function parseWorkspace(raw: string): Workspace {
  const w = JSON.parse(raw);
  const number = (v: unknown) =>
    typeof v === "number" && Number.isFinite(v) && v >= 0;
  const text = (v: unknown) => typeof v === "string" && v.length > 0;
  const unique = (items: { id: string }[]) =>
    new Set(items.map((v) => v.id)).size === items.length;
  if (
    w.version !== 2 ||
    !Array.isArray(w.companies) ||
    !w.companies.length ||
    !unique(w.companies)
  )
    throw Error("Invalid workspace backup.");
  for (const c of w.companies) {
    if (
      !text(c.id) ||
      typeof c.company !== "string" ||
      typeof c.industry !== "string" ||
      !["Monthly", "Quarterly", "Annual"].includes(c.period) ||
      !["revenue", "growth", "margin", "employees", "budget", "overhead"].every(
        (k) => number(c[k]),
      ) ||
      c.margin < 1 ||
      c.margin > 100 ||
      !Array.isArray(c.departments) ||
      !Array.isArray(c.plans) ||
      !unique(c.departments) ||
      !unique(c.plans)
    )
      throw Error("Invalid company profile.");
    if (c.scorecard !== undefined && !validScorecard(c.scorecard))
      throw Error("Invalid company measures.");
    for (const d of c.departments)
      if (
        (d.scorecard !== undefined && !validScorecard(d.scorecard)) ||
        !text(d.id) ||
        typeof d.name !== "string" ||
        !number(d.budget) ||
        !number(d.actual)
      )
        throw Error("Invalid department.");
    for (const p of c.plans) {
      if (
        !text(p.id) ||
        !["individual", "department"].includes(p.scope) ||
        typeof p.enabled !== "boolean" ||
        !Array.isArray(p.metrics) ||
        !unique(p.metrics) ||
        !["name", "role", "department"].every(
          (k) => typeof p[k] === "string",
        ) ||
        !["participants", "incentive", "cap"].every((k) => number(p[k]))
      )
        throw Error("Invalid incentive plan.");
      for (const m of p.metrics)
        if (
          !text(m.id) ||
          typeof m.name !== "string" ||
          ![
            "target",
            "actual",
            "weight",
            "threshold",
            "cap",
            "accelerator",
          ].every((k) =>
            number((m as unknown as Record<string, unknown>)[k]),
          ) ||
          typeof m.unit !== "string" ||
          typeof m.gate !== "boolean" ||
          !["higher", "lower"].includes(m.direction) ||
          ![
            "manual",
            "department-opex",
            "company-revenue",
            "company-margin",
            "division-revenue",
            "division-margin",
            "company-other",
            "division-other",
          ].includes(m.source) ||
          (m.sourceId !== undefined && typeof m.sourceId !== "string")
        )
          throw Error("Invalid metric.");
    }
  }
  if (!w.companies.some((c: Company) => c.id === w.activeId))
    throw Error("Invalid active company.");
  return w as Workspace;
}
export function cloneCompany(c: Company): Company {
  return {
    ...c,
    id: id(),
    company: c.company + " (copy)",
    scorecard: c.scorecard ? structuredClone(c.scorecard) : undefined,
    departments: c.departments.map((d) => ({
      ...d,
      id: id(),
      scorecard: d.scorecard ? structuredClone(d.scorecard) : undefined,
    })),
    plans: c.plans.map((p) => ({
      ...p,
      id: id(),
      metrics: p.metrics.map((m) => ({ ...m, id: id() })),
    })),
  };
}
