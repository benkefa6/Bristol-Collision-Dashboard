import { EXTENT, ROWS, TOTAL_RECORDS, TYPE_NAMES, type RowTuple } from "@/data/rows";

export const DOW = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export const YEARS = [2020, 2021, 2022, 2023, 2024] as const;

const RESIDUAL = new Set([
  "Turning movement – unidentified priority",
  "Other",
]);

export type YearFilter = "all" | (typeof YEARS)[number];
export type SeverityFilter = "all" | "ksi" | "slight";
export type UserFilter = "all" | "vulnerable" | "other";

export type Filters = {
  year: YearFilter;
  severity: SeverityFilter;
  user: UserFilter;
};

export const DEFAULT_FILTERS: Filters = {
  year: "all",
  severity: "all",
  user: "all",
};

export type Point = { x: number; y: number; sev: 1 | 2 | 3; type: number };

export type SeriesPoint = {
  label: string;
  n: number;
  vuln: number;
  ksi: number;
};

export type Brief = {
  n: number;
  casualties: number;
  fatal: number;
  serious: number;
  slight: number;
  ksi: number;
  vuln: number;
  ped: number;
  cyc: number;
  mc: number;
  child: number;
  older: number;
  hours: number[];
  heat: number[][];
  types: { name: string; n: number; residual: boolean }[];
  series: SeriesPoint[];
  seriesKind: "year" | "month";
  peakHour: number;
  peakCell: { dow: number; hour: number; n: number };
  points: Point[];
  contextKsiPct: number | null;
};

function keep(row: RowTuple, f: Filters, ignoreYear: boolean): boolean {
  if (!ignoreYear && f.year !== "all" && row[0] !== f.year) return false;
  const sev = row[4];
  if (f.severity === "ksi" && sev === 3) return false;
  if (f.severity === "slight" && sev !== 3) return false;
  if (f.user === "vulnerable" && row[5] !== 1) return false;
  if (f.user === "other" && row[5] === 1) return false;
  return true;
}

function emptyBrief(kind: "year" | "month"): Brief {
  const series: SeriesPoint[] =
    kind === "year"
      ? YEARS.map((year) => ({ label: String(year), n: 0, vuln: 0, ksi: 0 }))
      : MONTHS.map((label) => ({ label, n: 0, vuln: 0, ksi: 0 }));
  return {
    n: 0,
    casualties: 0,
    fatal: 0,
    serious: 0,
    slight: 0,
    ksi: 0,
    vuln: 0,
    ped: 0,
    cyc: 0,
    mc: 0,
    child: 0,
    older: 0,
    hours: Array(24).fill(0),
    heat: Array.from({ length: 7 }, () => Array(24).fill(0)),
    types: TYPE_NAMES.map((name) => ({ name, n: 0, residual: RESIDUAL.has(name) })),
    series,
    seriesKind: kind,
    peakHour: 0,
    peakCell: { dow: 0, hour: 0, n: 0 },
    points: [],
    contextKsiPct: null,
  };
}

export function buildBrief(f: Filters): Brief {
  const kind = f.year === "all" ? "year" : "month";
  const brief = emptyBrief(kind);
  let contextN = 0;
  let contextKsi = 0;

  for (const row of ROWS) {
    if (keep(row, f, true)) {
      contextN += 1;
      if (row[4] <= 2) contextKsi += 1;
    }
    if (!keep(row, f, false)) continue;
    brief.n += 1;
    brief.casualties += row[12];
    const sev = row[4];
    if (sev === 1) brief.fatal += 1;
    else if (sev === 2) brief.serious += 1;
    else brief.slight += 1;
    if (sev <= 2) brief.ksi += 1;
    if (row[5] === 1) brief.vuln += 1;
    if (row[7] === 1) brief.ped += 1;
    if (row[8] === 1) brief.cyc += 1;
    if (row[9] === 1) brief.mc += 1;
    if (row[10] === 1) brief.child += 1;
    if (row[11] === 1) brief.older += 1;
    const hour = row[3];
    const dow = row[2];
    brief.hours[hour] += 1;
    brief.heat[dow][hour] += 1;
    brief.types[row[6]].n += 1;
    const bucket = kind === "year" ? row[0] - 2020 : row[1] - 1;
    const point = brief.series[bucket];
    point.n += 1;
    if (row[5] === 1) point.vuln += 1;
    if (sev <= 2) point.ksi += 1;
    brief.points.push({ x: row[13], y: row[14], sev: sev as 1 | 2 | 3, type: row[6] });
  }

  let peakHour = 0;
  let peakN = -1;
  for (let h = 0; h < 24; h += 1) {
    if (brief.hours[h] > peakN) {
      peakN = brief.hours[h];
      peakHour = h;
    }
  }
  brief.peakHour = peakHour;

  let cell = { dow: 0, hour: 0, n: 0 };
  for (let d = 0; d < 7; d += 1) {
    for (let h = 0; h < 24; h += 1) {
      if (brief.heat[d][h] > cell.n) cell = { dow: d, hour: h, n: brief.heat[d][h] };
    }
  }
  brief.peakCell = cell;
  brief.types.sort((a, b) => b.n - a.n);
  brief.contextKsiPct = contextN > 0 ? (contextKsi / contextN) * 100 : null;
  return brief;
}

export function isRushHour(hour: number): boolean {
  return (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 18);
}

export function formatInt(n: number): string {
  return n.toLocaleString("en-GB");
}

export function formatPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

export function clock(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

export function share(part: number, whole: number): number {
  return whole === 0 ? 0 : (part / whole) * 100;
}

export function narrative(f: Filters, b: Brief): string {
  if (b.n === 0) {
    return "No records match this combination. Widen a filter to bring the view back.";
  }
  const yearBit = f.year === "all" ? "from 2020 to 2024" : `in ${f.year}`;
  const who =
    f.user === "vulnerable"
      ? "limited to pedestrians, cyclists and motorcyclists"
      : f.user === "other"
        ? "excluding pedestrians, cyclists and motorcyclists"
        : "across all recorded road users";
  const sev =
    f.severity === "ksi"
      ? "and only fatal or serious outcomes"
      : f.severity === "slight"
        ? "and only slight outcomes"
        : "at every recorded severity";
  const ksi = formatPct(share(b.ksi, b.n));
  const vuln = formatPct(share(b.vuln, b.n));
  const top = b.types.find((t) => t.n > 0);
  const named = b.types.find((t) => t.n > 0 && !t.residual);
  let mechanism = "";
  if (top && named && top.residual) {
    mechanism = ` The largest code is “${top.name}” (${formatInt(top.n)}), a residual category. The largest specified mechanism is “${named.name}” (${formatInt(named.n)}).`;
  } else if (named) {
    mechanism = ` The largest specified mechanism is “${named.name}” (${formatInt(named.n)}).`;
  }
  let trend = "";
  if (f.year === "all" && f.severity === "all") {
    const first = b.series.find((s) => s.label === "2020");
    const last = b.series.find((s) => s.label === "2024");
    if (first && last && first.n > 0 && last.n > 0) {
      trend = ` Under the same road-user filter, the killed-or-serious share moved from ${formatPct(share(first.ksi, first.n))} in 2020 to ${formatPct(share(last.ksi, last.n))} in 2024. Treat 2020 cautiously: recorded volume was lower during pandemic restrictions, so this is not a clean baseline.`;
    }
  } else if (f.year !== "all" && f.severity === "all" && b.contextKsiPct !== null) {
    trend = ` Across all years, with the same road-user filter, ${formatPct(b.contextKsiPct)} of records were killed or serious.`;
  }
  return `This view covers ${formatInt(b.n)} injury collisions ${yearBit}, ${who}, ${sev}. ${formatInt(b.ksi)} (${ksi}) were fatal or serious, and ${vuln} involved a vulnerable road user. The busiest hour is ${clock(b.peakHour)}; the busiest day-hour slot is ${DOW[b.peakCell.dow]} at ${clock(b.peakCell.hour)} (${formatInt(b.peakCell.n)}).${mechanism}${trend}`;
}

export type Recommendation = { title: string; body: string };

export function recommendations(b: Brief): Recommendation[] {
  const named = b.types.find((t) => t.n > 0 && !t.residual);
  const lead = named
    ? `In this view the leading specified mechanism is “${named.name}”. Start there, rather than with a generic safety campaign.`
    : "Specified mechanisms are thin in this view. Do not invent a cause from the residual codes.";
  const when =
    b.n === 0
      ? "There is no time pattern to act on until the filters return some records."
      : `The busiest slot is ${DOW[b.peakCell.dow]} at ${clock(b.peakCell.hour)}. Put operational effort on the observed peak, and check whether it sits inside the weekday peak windows rather than assuming it does.`;
  return [
    {
      title: "Ask about the leading mechanism first",
      body: lead,
    },
    {
      title: "Time the response to the peak you can see",
      body: when,
    },
    {
      title: "Do not train a model on this extract alone",
      body: "There is no traffic-volume denominator, so these are counts, not risk. Large residual codes, a depressed 2020, and no speed, weather or road type mean a predictive model would mostly learn the recording system. A decision not to proceed to AI is a defensible outcome.",
    },
  ];
}

export { EXTENT, TOTAL_RECORDS, TYPE_NAMES };
