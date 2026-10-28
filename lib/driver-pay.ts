export type DriverPackage =
  | "canadian-deck"
  | "international-deck"
  | "us-heavy-haul"
  | "regional-rgn-2021"
  | "bulk-2023";
export const driverPackages = [
  {
    key: "canadian-deck",
    name: "Canadian Company Driver — Deck",
    file: "QL-OP-203 Canadian Company Driver Deck Fleet Pay Package 1.pdf",
    revision: "Revision 03 · 2026-10-14",
    loaded: 0.48,
    empty: 0.48,
  },
  {
    key: "international-deck",
    name: "International Company Driver — Deck",
    file: "QL-OP-204 International Company Driver Deck Fleet Pay Package 1.pdf",
    revision: "Revision 03 · 2026-10-14",
    loaded: 0.53,
    empty: 0.48,
  },
  {
    key: "us-heavy-haul",
    name: "US Company Driver — Heavy Haul",
    file: "QL-OP-205 US Company Driver Heavy Haul Fleet Pay Package 1.pdf",
    revision: "Revision 03 · 2026-10-14",
    loaded: 0.53,
    empty: 0.48,
  },
  {
    key: "regional-rgn-2021",
    name: "Regional RGN Company Driver — Deck",
    file: "Regional RGN Company Deck Rates 1.pdf",
    revision: "Updated 2021-09-03",
    loaded: 0.73,
    empty: 0.48,
  },
  {
    key: "bulk-2023",
    name: "Company Driver — Bulk",
    file: "Company Bulk Rates 1.pdf",
    revision: "Updated 2023-01-16",
    loaded: 0,
    empty: 0,
  },
] as const;
export type RateChoice = { id: string; label: string; rate: number };
const none: RateChoice = {
  id: "none",
  label: "None / legal dimensions",
  rate: 0,
};
export function dimensionChoices(pkg: DriverPackage): RateChoice[] {
  const legacy = pkg === "regional-rgn-2021";
  return [
    none,
    ...[
      ["8′7″–10′ wide", 0.05],
      ["10′1″–13′ wide", 0.1],
      ["13′1″–15′ wide", 0.15],
      ["15′1″–18′ wide", 0.2],
      ["18′1″–20′ wide", 0.25],
      ...(!legacy ? [["20′1″–24′ wide", 0.35]] : []),
    ].map(([label, rate], i) => ({
      id: "w" + i,
      label: label + " (up to 14′6″ high)",
      rate: Number(rate),
    })),
    ...[
      ["14′1″–14′6″ high", 0.05],
      ["14′7″–15′ high", 0.1],
      ["15′1″–16′ high", 0.15],
      ["16′1″+ high", 0.2],
    ].map(([label, rate], i) => ({
      id: "h" + i,
      label: String(label),
      rate: Number(rate),
    })),
    ...[
      "8′7″–10′",
      "10′1″–13′",
      "13′1″–15′",
      "15′1″–18′",
      legacy ? "18′1″+" : "18′1″–20′",
    ].map((label, i) => ({
      id: "c15-" + i,
      label: label + " wide AND 14′7″–15′ high",
      rate: (legacy
        ? [0.1, 0.14, 0.16, 0.19, 0.22]
        : [0.1, 0.14, 0.19, 0.23, 0.28])[i],
    })),
    ...[
      "8′7″–10′",
      "10′1″–13′",
      "13′1″–15′",
      "15′1″–18′",
      legacy ? "18′1″+" : "18′1″–20′",
    ].map((label, i) => ({
      id: "c16-" + i,
      label: label + " wide AND 15′1″+ high",
      rate: (legacy
        ? [0.12, 0.15, 0.17, 0.2, 0.25]
        : [0.15, 0.23, 0.28, 0.33, 0.37])[i],
    })),
    ...(!legacy
      ? [{ id: "c16-5", label: "20′1″+ wide AND 15′1″+ high", rate: 0.45 }]
      : []),
  ];
}
export function lengthChoices(pkg: DriverPackage): RateChoice[] {
  return [
    none,
    { id: "l63", label: "Up to 63′ requiring permits", rate: 0.05 },
    { id: "l75", label: "63′–75′ permits & trombone", rate: 0.1 },
    { id: "l95", label: "75′–95′ permits & trombone", rate: 0.15 },
    ...(pkg === "us-heavy-haul"
      ? [
          { id: "hh95", label: "Heavy Haul: 75′–95′ permitted", rate: 0.15 },
          { id: "hh110", label: "Heavy Haul: 96′–110′ permitted", rate: 0.2 },
          { id: "hh120", label: "Heavy Haul: 111′–120′ permitted", rate: 0.4 },
          { id: "hh130", label: "Heavy Haul: 121′–130′ permitted", rate: 0.65 },
          { id: "hh145", label: "Heavy Haul: 130′–145′ permitted", rate: 0.85 },
        ]
      : []),
  ];
}
export function trailerChoices(pkg: DriverPackage): RateChoice[] {
  if (pkg === "regional-rgn-2021") return [none];
  if (pkg === "us-heavy-haul")
    return [
      none,
      ...[
        [7, 0.27],
        [8, 0.35],
        [9, 0.43],
        [10, 0.58],
        [11, 0.88],
        [12, 1.08],
        [13, 1.13],
      ].map(([axle, rate]) => ({
        id: "rgn" + axle,
        label: axle + "-axle RGN",
        rate,
      })),
    ];
  return [
    none,
    ...[
      [5, 0.12],
      [6, 0.17],
      [7, 0.27],
    ].map(([axle, rate]) => ({
      id: "rgn" + axle,
      label: axle + "-axle RGN",
      rate,
    })),
  ];
}
export type DriverLeg = {
  id: string;
  name: string;
  type: "loaded" | "empty";
  miles: number;
  dimension: string;
  length: string;
  trailer: string;
  coast: boolean;
  superB: boolean;
  steerable: boolean;
};
export type DriverRecord = {
  id: string;
  name: string;
  division: string;
  year: number;
  coverage: string;
  package: DriverPackage;
  count: number;
  included: boolean;
  reviewed: boolean;
  legs: DriverLeg[];
  safetyLevel: number;
  safetyEligible: boolean;
  skillLevel: number;
  skillActive: boolean;
  serviceMonths: number;
  continuousServiceDays: number;
  trailingMiles: number;
  loyaltyCap: number;
  detailedTrailerReviewed: boolean;
  bulkRate: number;
  bulkQuarters: { gross: number; fsc: number; safe: boolean }[];
  fullCalendarYear: boolean;
  annualSafety: boolean;
  bulkHourly: boolean;
  hourlyHours: number;
  hourlyRate: number;
  hourlyApproved: boolean;
  extras: {
    sourceCode?: "orientation";
    id: string;
    name: string;
    quantity: number;
    rate: number;
    kind: "regular" | "incentive";
    approved: boolean;
  }[];
};
const uid = () => globalThis.crypto.randomUUID(),
  round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export function newDriverRecord(
  pkg: DriverPackage,
  year: number,
  division: string,
): DriverRecord {
  const legacy = pkg === "regional-rgn-2021",
    bulk = pkg === "bulk-2023";
  const record: DriverRecord = {
    id: uid(),
    name: "New driver pay estimate",
    division,
    year,
    coverage:
      "Work entered for this year; enter separate estimates for different rate periods",
    package: pkg,
    count: 1,
    included: false,
    reviewed: false,
    legs: [
      {
        id: uid(),
        name: "Loaded miles",
        type: "loaded",
        miles: 0,
        dimension: "none",
        length: "none",
        trailer: "none",
        coast: false,
        superB: false,
        steerable: false,
      },
      {
        id: uid(),
        name: "Empty miles",
        type: "empty",
        miles: 0,
        dimension: "none",
        length: "none",
        trailer: "none",
        coast: false,
        superB: false,
        steerable: false,
      },
    ],
    safetyLevel: 0,
    safetyEligible: false,
    skillLevel: 1,
    skillActive: false,
    serviceMonths: 0,
    continuousServiceDays: 0,
    trailingMiles: 0,
    loyaltyCap: 0.04,
    detailedTrailerReviewed: false,
    bulkRate: 20,
    bulkQuarters: Array.from({ length: 4 }, () => ({
      gross: 0,
      fsc: 0,
      safe: false,
    })),
    fullCalendarYear: false,
    annualSafety: false,
    bulkHourly: false,
    hourlyHours: 0,
    hourlyRate: 0,
    hourlyApproved: false,
    extras: [
      {
        id: uid(),
        name: "Extra picks / drops (first event excluded)",
        quantity: 0,
        rate: legacy ? 75 : 100,
        kind: "regular",
        approved: false,
      },
      {
        id: uid(),
        name: "Approved local project work (hours)",
        quantity: 0,
        rate: legacy ? 22.5 : 30,
        kind: "regular",
        approved: false,
      },
      {
        id: uid(),
        name: "Site fee (approved occurrences)",
        quantity: 0,
        rate: 150,
        kind: "regular",
        approved: false,
      },
      {
        id: uid(),
        name: "Chain-up (approved occurrences)",
        quantity: 0,
        rate: 150,
        kind: "regular",
        approved: false,
      },
      {
        id: uid(),
        sourceCode: "orientation",
        name: "Orientation " + (bulk || legacy ? "days" : "completed once"),
        quantity: 0,
        rate: bulk ? 150 : legacy ? 100 : 525,
        kind: "regular",
        approved: false,
      },
    ],
  };
  if (bulk)
    record.extras = record.extras.filter((e) =>
      e.name.startsWith("Orientation"),
    );
  if (legacy)
    record.extras[0].name =
      "Standard BOL load/unload events (not RGN BOL events)";
  return record;
}
export function loyaltyRate(
  serviceMonths: number,
  trailingMiles: number,
  cap = 0.04,
) {
  const base =
    serviceMonths >= 120
      ? 0.04
      : serviceMonths >= 60
        ? 0.03
        : serviceMonths >= 24
          ? 0.02
          : serviceMonths >= 6
            ? 0.01
            : 0;
  const factor =
    serviceMonths < 24
      ? 1
      : trailingMiles >= 125000
        ? 1.1
        : trailingMiles >= 105000
          ? 1
          : trailingMiles >= 90000
            ? 0.5
            : 0;
  return Math.min(cap, base * factor);
}
export function driverResult(p: DriverRecord) {
  const source = driverPackages.find((v) => v.key === p.package)!;
  const legacy = p.package === "regional-rgn-2021",
    bulk = p.package === "bulk-2023";
  const errors: string[] = [];
  if (!Number.isInteger(p.year) || p.year < 2000 || p.year > 2200)
    errors.push("Choose a valid report year.");
  if (!Number.isInteger(p.safetyLevel) || !Number.isInteger(p.skillLevel))
    errors.push("Safety and skill levels must be whole numbers.");
  if (!p.name.trim() || !p.division.trim())
    errors.push("Enter a name and division.");
  if (!Number.isInteger(p.count) || p.count < 1)
    errors.push("Enter a positive whole number of drivers.");
  if (!p.reviewed)
    errors.push(
      "Confirm the package revision and the rates that apply to the work entered.",
    );
  if (p.safetyLevel > (legacy ? 5 : 4))
    errors.push("Choose a safety level from this package.");
  if (
    p.annualSafety &&
    (!p.fullCalendarYear || p.bulkQuarters.some((q) => !q.safe))
  )
    errors.push(
      "The annual Bulk safety bonus requires a full qualifying year and all four quarterly safety checks.",
    );
  if (bulk && (p.bulkRate < 20 || p.bulkRate > 22))
    errors.push("Bulk revenue pay must be 20–22%.");
  if (p.bulkQuarters.some((q) => q.fsc > q.gross))
    errors.push("Fuel surcharge cannot exceed gross revenue.");
  if (
    bulk &&
    p.bulkHourly &&
    p.hourlyHours > 0 &&
    (!p.hourlyApproved || p.hourlyRate <= 0)
  )
    errors.push("Enter and confirm the approved NH3 hourly rate.");
  if (p.extras.some((e) => e.quantity > 0 && (!e.approved || e.rate <= 0)))
    errors.push(
      "Confirm a positive approved rate for each extra payment being used.",
    );
  if (
    !bulk &&
    !legacy &&
    p.extras.some(
      (e) =>
        (e.sourceCode === "orientation" || e.name.startsWith("Orientation")) &&
        e.quantity > 1,
    )
  )
    errors.push("The current package orientation payment is one-time.");
  if (
    legacy &&
    p.extras.some(
      (e) =>
        (e.sourceCode === "orientation" || e.name.startsWith("Orientation")) &&
        e.quantity > 0,
    ) &&
    p.continuousServiceDays < 31
  )
    errors.push(
      "Regional 2021 orientation pay requires 31 continuous days; confirm service before paying.",
    );
  const safetyRate = p.safetyEligible
    ? legacy
      ? ([0, 0, 0, 0.01, 0.02, 0.03][p.safetyLevel] ?? 0)
      : p.safetyLevel * 0.01
    : 0;
  const skillRate =
    !legacy && p.skillActive ? Math.max(0, p.skillLevel - 1) * 0.01 : 0;
  const loyalty = loyaltyRate(p.serviceMonths, p.trailingMiles, p.loyaltyCap);
  let base = 0,
    premiums = 0,
    miles = 0;
  const lines: { name: string; regular: number; incentive: number }[] = [];
  if (!bulk)
    for (const leg of p.legs) {
      const dimension = dimensionChoices(p.package).find(
          (v) => v.id === leg.dimension,
        ),
        length = lengthChoices(p.package).find((v) => v.id === leg.length),
        trailer = trailerChoices(p.package).find((v) => v.id === leg.trailer);
      if (!dimension || !length || !trailer) {
        errors.push(leg.name + ": choose valid bands from this package.");
        continue;
      }
      if (
        leg.type === "empty" &&
        (leg.dimension !== "none" ||
          leg.length !== "none" ||
          leg.trailer !== "none" ||
          leg.steerable)
      )
        errors.push(
          leg.name +
            ": loaded-only premiums cannot be assigned to empty miles.",
        );
      if (leg.steerable && p.package !== "us-heavy-haul")
        errors.push(
          "Steerable premium is only specified in the Heavy Haul package.",
        );
      if (leg.superB && p.package === "us-heavy-haul")
        errors.push(
          "The Heavy Haul package does not specify a Super-B premium.",
        );
      if (
        p.package === "us-heavy-haul" &&
        leg.trailer === "rgn13" &&
        !p.detailedTrailerReviewed
      )
        errors.push(
          "Confirm the page 6 13-axle rate of $1.13/mile; the package summary states a different maximum.",
        );
      miles += leg.miles;
      const regular =
        leg.miles * (leg.type === "loaded" ? source.loaded : source.empty);
      const loaded = leg.type === "loaded";
      const lengthRate =
        !legacy && p.package !== "us-heavy-haul" && trailer.rate > 0
          ? 0
          : length.rate;
      const premium =
        leg.miles *
        ((loaded ? dimension.rate + lengthRate + trailer.rate : 0) +
          (leg.coast ? 0.1 : 0) +
          (leg.superB ? 0.06 : 0) +
          (loaded && leg.steerable ? 0.5 : 0));
      base += regular;
      premiums += premium;
      lines.push({
        name: leg.name,
        regular: round(regular + premium),
        incentive: round(leg.miles * (safetyRate + skillRate + loyalty)),
      });
    }
  const revenue = p.bulkQuarters.reduce((s, q) => s + q.gross - q.fsc, 0);
  const bulkBase = bulk
    ? p.bulkHourly
      ? p.hourlyHours * p.hourlyRate
      : (revenue * p.bulkRate) / 100
    : 0;
  const quarterBonus = bulk
    ? p.bulkQuarters.reduce(
        (s, q) => s + (q.safe ? (q.gross - q.fsc) * 0.01 : 0),
        0,
      )
    : 0;
  const annualBonus =
    bulk &&
    p.annualSafety &&
    p.fullCalendarYear &&
    p.bulkQuarters.every((q) => q.safe)
      ? revenue * 0.01
      : 0;
  const extraRegular = p.extras
      .filter((e) => e.kind === "regular" && e.approved)
      .reduce((s, e) => s + e.quantity * e.rate, 0),
    extraBonus = p.extras
      .filter((e) => e.kind === "incentive" && e.approved)
      .reduce((s, e) => s + e.quantity * e.rate, 0);
  const regular = round((base + premiums + bulkBase + extraRegular) * p.count),
    incentive = round(
      ((bulk
        ? quarterBonus + annualBonus
        : miles * (safetyRate + skillRate + loyalty)) +
        extraBonus) *
        p.count,
    );
  return {
    errors: [...new Set(errors)],
    source,
    lines,
    miles,
    base: round(base * p.count),
    premiums: round(premiums * p.count),
    safetyRate,
    skillRate,
    loyaltyRate: loyalty,
    regularPay: errors.length ? 0 : regular,
    incentivePay: errors.length ? 0 : incentive,
    totalPay: errors.length ? 0 : round(regular + incentive),
    maximumIncentive: errors.length
      ? 0
      : round(
          (bulk
            ? revenue * 0.02
            : miles *
              ((legacy ? 0.03 : 0.04) + (legacy ? 0 : 0.04) + p.loyaltyCap)) *
            p.count +
            extraBonus * p.count,
        ),
    bulkNetRevenue: revenue,
    quarterBonus: round(quarterBonus * p.count),
    annualBonus: round(annualBonus * p.count),
  };
}
export function validDriver(value: unknown): value is DriverRecord {
  if (!value || typeof value !== "object") return false;
  const p = value as DriverRecord;
  const num = (v: unknown) =>
      typeof v === "number" && Number.isFinite(v) && v >= 0,
    text = (v: unknown) => typeof v === "string",
    bool = (v: unknown) => typeof v === "boolean";
  return (
    [p.id, p.name, p.division, p.coverage].every(text) &&
    driverPackages.some((v) => v.key === p.package) &&
    [
      p.year,
      p.count,
      p.safetyLevel,
      p.skillLevel,
      p.serviceMonths,
      p.continuousServiceDays,
      p.trailingMiles,
      p.loyaltyCap,
      p.bulkRate,
      p.hourlyHours,
      p.hourlyRate,
    ].every(num) &&
    p.skillLevel >= 1 &&
    p.skillLevel <= 5 &&
    p.loyaltyCap <= 0.04 &&
    [
      p.included,
      p.reviewed,
      p.safetyEligible,
      p.skillActive,
      p.detailedTrailerReviewed,
      p.fullCalendarYear,
      p.annualSafety,
      p.bulkHourly,
      p.hourlyApproved,
    ].every(bool) &&
    Array.isArray(p.legs) &&
    p.legs.every(
      (l) =>
        [l.id, l.name, l.dimension, l.length, l.trailer].every(text) &&
        ["loaded", "empty"].includes(l.type) &&
        num(l.miles) &&
        [l.coast, l.superB, l.steerable].every(bool),
    ) &&
    Array.isArray(p.bulkQuarters) &&
    p.bulkQuarters.length === 4 &&
    p.bulkQuarters.every((q) => num(q.gross) && num(q.fsc) && bool(q.safe)) &&
    Array.isArray(p.extras) &&
    p.extras.every(
      (e) =>
        (e.sourceCode === undefined || e.sourceCode === "orientation") &&
        [e.id, e.name].every(text) &&
        num(e.quantity) &&
        num(e.rate) &&
        ["regular", "incentive"].includes(e.kind) &&
        bool(e.approved),
    )
  );
}
