import { useMemo, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Clock3, MapPinned, ShieldAlert } from "lucide-react";
import { SpatialMap } from "@/components/spatial-map";
import {
  DOW,
  YEARS,
  buildBrief,
  clock,
  formatInt,
  formatPct,
  isRushHour,
  narrative,
  recommendations,
  share,
  type Filters,
  type YearFilter,
} from "@/lib/briefing";
import { TOTAL_RECORDS } from "@/data/rows";

const ICONS = [MapPinned, Clock3, ShieldAlert] as const;

export function Dashboard() {
  const [filters, setFilters] = useState<Filters>({
    year: "all",
    severity: "all",
    user: "all",
  });
  const brief = useMemo(() => buildBrief(filters), [filters]);
  const reading = narrative(filters, brief);
  const actions = recommendations(brief);
  const dirty =
    filters.year !== "all" || filters.severity !== "all" || filters.user !== "all";
  const heatMax = Math.max(1, ...brief.heat.flat());
  const hourData = brief.hours.map((n, hour) => ({
    hour: String(hour),
    n,
    rush: isRushHour(hour),
  }));
  const seriesData = brief.series.map((s) => ({
    label: s.label,
    collisions: s.n,
    vulnerable: s.n === 0 ? 0 : Math.round(share(s.vuln, s.n) * 10) / 10,
  }));
  const typeData = brief.types
    .filter((t) => t.n > 0)
    .map((t) => ({ ...t, short: SHORT_TYPE[t.name] ?? t.name }));

  return (
    <main className="mx-auto min-w-0 max-w-6xl overflow-x-hidden px-4 py-8 sm:px-6 sm:py-10">
      <header className="rounded-xl border border-border bg-surface px-5 py-8 sm:px-8">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase">
          Presentation briefing · Bristol
        </p>
        <h1 className="mt-2 max-w-3xl font-serif text-3xl text-balance text-ink sm:text-4xl">
          Where recorded collisions concentrate, and what not to conclude
        </h1>
        <p className="mt-3 max-w-2xl text-pretty text-muted">
          Interactive view of {formatInt(TOTAL_RECORDS)} injury collisions, 2020
          to 2024. The organisational user is a road-safety team deciding where
          limited effort goes. The same view is written so a mixed judging panel
          can follow the evidence, the chart choices, and the limits. Every
          figure uses the filters together.
        </p>
      </header>

      <section className="mt-4 grid gap-3 sm:grid-cols-3" aria-label="What this briefing is for">
        <article className="rounded-xl border border-border bg-surface px-4 py-4">
          <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">Decision</h2>
          <p className="mt-2 text-sm text-pretty text-ink">
            Which specified collision mechanisms and times of day deserve attention first.
          </p>
        </article>
        <article className="rounded-xl border border-border bg-surface px-4 py-4">
          <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">User of the view</h2>
          <p className="mt-2 text-sm text-pretty text-ink">
            A road-safety officer. The judging panel is the audience for the same evidence.
          </p>
        </article>
        <article className="rounded-xl border border-border bg-surface px-4 py-4">
          <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">What this cannot do</h2>
          <p className="mt-2 text-sm text-pretty text-ink">
            It cannot show risk. There is no traffic volume underneath the counts.
          </p>
        </article>
      </section>

      <section
        className="sticky top-0 z-10 -mx-4 mt-6 border-b border-border bg-bg/95 px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:px-6"
        aria-label="Filters"
      >
        <div className="flex flex-col gap-3">
          <FilterRow label="Year">
            <Pill
              pressed={filters.year === "all"}
              onClick={() => setFilters({ ...filters, year: "all" })}
            >
              All years
            </Pill>
            {YEARS.map((year) => (
              <Pill
                key={year}
                pressed={filters.year === year}
                onClick={() => setFilters({ ...filters, year: year as YearFilter })}
              >
                {year}
              </Pill>
            ))}
          </FilterRow>
          <FilterRow label="Severity">
            <Pill
              pressed={filters.severity === "all"}
              onClick={() => setFilters({ ...filters, severity: "all" })}
            >
              All outcomes
            </Pill>
            <Pill
              pressed={filters.severity === "ksi"}
              onClick={() => setFilters({ ...filters, severity: "ksi" })}
            >
              Fatal or serious
            </Pill>
            <Pill
              pressed={filters.severity === "slight"}
              onClick={() => setFilters({ ...filters, severity: "slight" })}
            >
              Slight
            </Pill>
          </FilterRow>
          <FilterRow label="Who">
            <Pill
              pressed={filters.user === "all"}
              onClick={() => setFilters({ ...filters, user: "all" })}
            >
              Everyone
            </Pill>
            <Pill
              pressed={filters.user === "vulnerable"}
              onClick={() => setFilters({ ...filters, user: "vulnerable" })}
            >
              Vulnerable users
            </Pill>
            <Pill
              pressed={filters.user === "other"}
              onClick={() => setFilters({ ...filters, user: "other" })}
            >
              Other records
            </Pill>
            {dirty ? (
              <button
                type="button"
                className="min-h-11 px-2 text-sm text-primary underline-offset-2 hover:underline"
                onClick={() =>
                  setFilters({ year: "all", severity: "all", user: "all" })
                }
              >
                Reset
              </button>
            ) : null}
          </FilterRow>
        </div>
        <p className="mt-2 text-sm text-muted tabular-nums">
          Showing {formatInt(brief.n)} of {formatInt(TOTAL_RECORDS)} records
        </p>
      </section>

      <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Key figures">
        <Kpi
          label="Collisions"
          value={formatInt(brief.n)}
          note={filters.year === "all" ? "In the current filter" : `Recorded in ${filters.year}`}
        />
        <Kpi
          label="People injured"
          value={formatInt(brief.casualties)}
          note="Casualties, not collisions. One record can injure more than one person."
        />
        <Kpi
          label="Fatal or serious"
          value={formatPct(share(brief.ksi, brief.n))}
          accent
          note={`${formatInt(brief.fatal)} fatal · ${formatInt(brief.serious)} serious`}
        />
        <Kpi
          label="Vulnerable users"
          value={formatPct(share(brief.vuln, brief.n))}
          note={`${formatInt(brief.ped)} pedestrian · ${formatInt(brief.cyc)} cycle · ${formatInt(brief.mc)} motorcycle. A record can count in more than one.`}
        />
      </section>

      <section className="mt-3 rounded-xl border border-primary/25 bg-primary-soft px-5 py-5" aria-live="polite">
        <h2 className="text-sm font-semibold text-primary">Reading for this filter</h2>
        <p className="mt-2 max-w-3xl text-pretty text-ink">{reading}</p>
        {brief.n > 0 ? (
          <p className="mt-2 text-sm text-muted">
            {formatInt(brief.child)} records involve a child and {formatInt(brief.older)} an
            older adult. Those flags are not a full casualty profile.
          </p>
        ) : null}
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card
          title="Severity is a rare-event problem"
          caption="A column chart makes fatal collisions look like a plotting error. A proportion bar keeps the 1% visible without pretending the classes are similar in size."
        >
          <Proportion
            fatal={brief.fatal}
            serious={brief.serious}
            slight={brief.slight}
            n={brief.n}
          />
        </Card>
        <Card
          title="Mechanism, including the messy codes"
          caption="Residual categories stay on the chart. Dropping “Other” would make the data look cleaner than it is."
        >
          <div className="h-96 w-full min-w-0">
            {typeData.length === 0 ? (
              <Empty />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeData} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                  <CartesianGrid stroke="var(--color-border)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "var(--color-muted)", fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="short"
                    width={132}
                    tick={{ fill: "var(--color-ink)", fontSize: 11 }}
                    interval={0}
                  />
                  <Tooltip content={<PlainTip />} />
                  <Bar dataKey="n" name="Collisions" fill="var(--color-primary)" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                    {typeData.map((t) => (
                      <Cell
                        key={t.name}
                        fill={t.residual ? "var(--color-slight)" : "var(--color-primary)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <p className="mt-2 text-xs text-muted">Grey bars are residual codes, not specified mechanisms.</p>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card
          className="lg:col-span-2"
          title="Hour of day"
          caption="Tinted hours are a working definition of peak (07–09 and 16–18). They are not a claim that the observed peak always falls inside them."
        >
          <div className="h-64 w-full min-w-0">
            {brief.n === 0 ? (
              <Empty />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="hour" tick={{ fill: "var(--color-muted)", fontSize: 11 }} interval={1} />
                  <YAxis tick={{ fill: "var(--color-muted)", fontSize: 12 }} width={36} />
                  <Tooltip content={<PlainTip suffix=" collisions" />} />
                  <Bar dataKey="n" name="Collisions" isAnimationActive={false} radius={[3, 3, 0, 0]}>
                    {hourData.map((d) => (
                      <Cell
                        key={d.hour}
                        fill={d.rush ? "var(--color-primary)" : "var(--color-slight)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
        <Card
          className="lg:col-span-3"
          title="Hour by day of week"
          caption="Darker cells are more collisions. Read across a day, or down an hour, rather than hunting a single red square."
        >
          <Heatmap heat={brief.heat} max={heatMax} />
        </Card>
      </div>

      <Card
        className="mt-4"
        title={brief.seriesKind === "year" ? "Volume and vulnerable-user share by year" : `Volume and vulnerable-user share in ${filters.year}`}
        caption="Bars are counts. The line is the share of those counts that involve a vulnerable road user. The two questions are deliberately not drawn on one axis."
      >
        <div className="h-72 w-full min-w-0">
          {brief.n === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={seriesData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "var(--color-muted)", fontSize: 12 }} />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: "var(--color-muted)", fontSize: 12 }}
                  width={40}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 100]}
                  tick={{ fill: "var(--color-muted)", fontSize: 12 }}
                  width={40}
                  unit="%"
                />
                <Tooltip content={<PlainTip />} />
                <Bar
                  yAxisId="left"
                  dataKey="collisions"
                  name="Collisions"
                  fill="var(--color-slight)"
                  radius={[3, 3, 0, 0]}
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="right"
                  dataKey="vulnerable"
                  name="Vulnerable users"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "var(--color-primary)" }}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <Card
        className="mt-4"
        title="Where records sit on the Ordnance Survey grid"
        caption="Each dot is one collision. Slight records are drawn first and smaller so fatal and serious records stay visible. There is no traffic flow underneath, so a dense area is not automatically a high-risk area."
      >
        <ul className="mb-3 flex flex-wrap gap-4 text-sm text-ink">
          <Legend swatch="bg-slight" label="Slight" />
          <Legend swatch="bg-serious" label="Serious" />
          <Legend swatch="bg-fatal" label="Fatal" />
        </ul>
        {brief.n === 0 ? <Empty /> : <SpatialMap points={brief.points} />}
      </Card>

      <section className="mt-6" aria-label="Recommendations">
        <h2 className="font-serif text-2xl text-ink">What a decision-maker can do with this</h2>
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          {actions.map((item, i) => {
            const Icon = ICONS[i] ?? ShieldAlert;
            return (
              <article key={item.title} className="rounded-xl border border-border bg-surface p-5">
                <Icon className="size-5 text-primary" aria-hidden="true" />
                <h3 className="mt-3 font-semibold text-ink">{item.title}</h3>
                <p className="mt-2 text-sm text-pretty text-muted">{item.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <details className="rounded-xl border border-border bg-surface p-5" open>
          <summary className="cursor-pointer font-semibold text-ink">Why these charts</summary>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-pretty text-muted">
            <li>Severity uses a proportion bar because fatal outcomes are about one percent of records.</li>
            <li>Mechanisms keep residual codes visible. Hiding them would overstate what the typology can support.</li>
            <li>Hour and day are separate from a heatmap so a peak can be checked, not just admired.</li>
            <li>Volume and vulnerable-user share use two axes because they answer different questions.</li>
            <li>The map uses a fixed grid extent. Filtering should reveal points, not rescale the city.</li>
          </ul>
        </details>
        <details className="rounded-xl border border-border bg-surface p-5" open>
          <summary className="cursor-pointer font-semibold text-ink">Limits and responsible use</summary>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-pretty text-muted">
            <li>Open local extract, not a national STATS19 publication. Provenance should be stated in the presentation.</li>
            <li>No exposure data. Counts cannot be turned into rates per vehicle or per kilometre cycled.</li>
            <li>Coordinates are precise enough to be quasi-identifying. This view adds no names, vehicles or free text.</li>
            <li>Association is not causation. The rise in the killed-or-serious share is a monitoring signal, not a cause.</li>
            <li>A future model would need road type, speed, weather and a denominator, plus a check that residual codes are not the thing being predicted.</li>
          </ul>
        </details>
      </div>

      <details className="mt-4 rounded-xl border border-border bg-surface p-5">
        <summary className="cursor-pointer font-semibold text-ink">Numbers behind this view</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm text-ink">
            <caption className="sr-only">Counts for the current filter</caption>
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="py-2 pr-4 font-medium">Item</th>
                <th className="py-2 font-medium">Count</th>
              </tr>
            </thead>
            <tbody>
              {typeData.map((t) => (
                <tr key={t.name} className="border-b border-border">
                  <td className="py-2 pr-4">{t.name}</td>
                  <td className="py-2 tabular-nums">{formatInt(t.n)}</td>
                </tr>
              ))}
              <tr>
                <td className="py-2 pr-4">All records in view</td>
                <td className="py-2 tabular-nums">{formatInt(brief.n)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </details>

      <p className="mt-6 text-xs text-pretty text-muted">
        Source: Bristol injury-collision extract supplied for the module, cleaned to{" "}
        {formatInt(TOTAL_RECORDS)} records with a valid timestamp. Positions are Ordnance
        Survey easting and northing. Vulnerable road user means a pedestrian, cyclist or
        motorcyclist was involved. This is a briefing aid, not an official statistics release.
      </p>
    </main>
  );
}

function FilterRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-wrap items-center gap-2">
      <legend className="sr-only">{label}</legend>
      <span className="w-16 text-xs font-semibold tracking-wide text-muted uppercase" aria-hidden="true">
        {label}
      </span>
      {children}
    </fieldset>
  );
}

function Pill({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={
        pressed
          ? "min-h-11 rounded-full border border-primary bg-primary px-3 text-sm text-surface"
          : "min-h-11 rounded-full border border-border bg-surface px-3 text-sm text-ink hover:border-primary"
      }
    >
      {children}
    </button>
  );
}

function Kpi({
  label,
  value,
  note,
  accent = false,
}: {
  label: string;
  value: string;
  note: string;
  accent?: boolean;
}) {
  return (
    <article className="rounded-xl border border-border bg-surface p-4">
      <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">{label}</h2>
      <p className={`mt-2 font-serif text-3xl tabular-nums ${accent ? "text-accent" : "text-ink"}`}>
        {value}
      </p>
      <p className="mt-2 text-xs text-pretty text-muted">{note}</p>
    </article>
  );
}

function Card({
  title,
  caption,
  children,
  className = "",
}: {
  title: string;
  caption: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`min-w-0 rounded-xl border border-border bg-surface p-4 sm:p-5 ${className}`}>
      <h2 className="font-serif text-xl text-balance text-ink">{title}</h2>
      <p className="mt-1 text-sm text-pretty text-muted">{caption}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Proportion({
  fatal,
  serious,
  slight,
  n,
}: {
  fatal: number;
  serious: number;
  slight: number;
  n: number;
}) {
  const parts = [
    { label: "Fatal", count: fatal, swatch: "bg-fatal" },
    { label: "Serious", count: serious, swatch: "bg-serious" },
    { label: "Slight", count: slight, swatch: "bg-slight" },
  ];
  if (n === 0) return <Empty />;
  return (
    <div>
      <div
        className="flex h-8 overflow-hidden rounded-md"
        role="img"
        aria-label={parts.map((p) => `${p.label} ${p.count}`).join(", ")}
      >
        {parts.map((p) =>
          p.count > 0 ? (
            <div key={p.label} className={p.swatch} style={{ width: `${(p.count / n) * 100}%` }} />
          ) : null,
        )}
      </div>
      <ul className="mt-4 space-y-2">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-ink">
              <span className={`inline-block size-3 rounded-sm ${p.swatch}`} aria-hidden="true" />
              {p.label}
            </span>
            <span className="tabular-nums text-muted">
              {formatInt(p.count)} · {formatPct(share(p.count, n))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Heatmap({ heat, max }: { heat: number[][]; max: number }) {
  return (
    <div className="w-full max-w-full overflow-x-auto">
      <table className="w-full border-separate border-spacing-1 text-xs">
        <thead>
          <tr>
            <th className="w-8" />
            {DOW.map((d) => (
              <th key={d} className="font-medium text-muted">
                {d.slice(0, 3)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 24 }, (_, hour) => (
            <tr key={hour}>
              <th className="pr-1 text-right font-medium text-muted tabular-nums">{hour}</th>
              {heat.map((col, dow) => {
                const n = col[hour];
                const pct = Math.round((n / max) * 100);
                return (
                  <td
                    key={dow}
                    title={`${DOW[dow]} ${clock(hour)}: ${n}`}
                    className="h-4 rounded-sm p-0"
                    style={{
                      backgroundColor: `color-mix(in srgb, var(--color-primary) ${pct}%, var(--color-surface))`,
                    }}
                  >
                    <span className="sr-only">
                      {DOW[dow]} {clock(hour)}: {n}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span className={`inline-block size-3 rounded-full ${swatch}`} aria-hidden="true" />
      {label}
    </li>
  );
}

function Empty() {
  return <p className="py-8 text-sm text-muted">Nothing to plot for this filter.</p>;
}

function PlainTip({
  active,
  payload,
  label,
  suffix = "",
}: {
  active?: boolean;
  payload?: {
    name?: string;
    value?: number | string;
    dataKey?: string;
    payload?: { name?: string };
  }[];
  label?: string;
  suffix?: string;
}) {
  if (!active || !payload?.length) return null;
  const full = payload[0]?.payload?.name;
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 text-xs text-ink shadow-sm">
      <p className="max-w-xs font-semibold">{full && full !== label ? full : label}</p>
      {payload.map((item) => (
        <p key={String(item.dataKey)} className="tabular-nums text-muted">
          {item.name}: {item.value}
          {item.dataKey === "vulnerable" ? "%" : suffix}
        </p>
      ))}
    </div>
  );
}

const SHORT_TYPE: Record<string, string> = {
  "Turning movement – unidentified priority": "Turning, priority unclear",
  "Turning Movement from minor road": "Turn from minor road",
  "Turning Movement from major road": "Turn from major road",
  "Public service vehicle passenger (no collision)": "Bus passenger, no collision",
  "Loss of Control": "Loss of control",
  "Nose to Tail": "Nose to tail",
  "Head On": "Head on",
  "Adult pedestrian": "Adult pedestrian",
  "Child pedestrian": "Child pedestrian",
  "Elderly pedestrian": "Elderly pedestrian",
};
