import { useState, type MouseEvent } from "react";
import { EXTENT, TYPE_NAMES, type Point } from "@/lib/briefing";

type Hit = { sev: string; type: string; x: number; y: number } | null;

const SEV_LABEL = { 1: "Fatal", 2: "Serious", 3: "Slight" } as const;
const VB_W = 1000;
const VB_H = 780;
const PAD_L = 96;
const PAD_R = 24;
const PAD_T = 16;
const PAD_B = 48;

export function SpatialMap({ points }: { points: Point[] }) {
  const [hit, setHit] = useState<Hit>(null);
  const { minX, maxX, minY, maxY } = EXTENT;
  const plotW = VB_W - PAD_L - PAD_R;
  const plotH = VB_H - PAD_T - PAD_B;
  const sx = (x: number) => PAD_L + ((x - minX) / (maxX - minX)) * plotW;
  const sy = (y: number) => PAD_T + (1 - (y - minY) / (maxY - minY)) * plotH;

  function locate(event: MouseEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const mx = ((event.clientX - rect.left) / rect.width) * VB_W;
    const my = ((event.clientY - rect.top) / rect.height) * VB_H;
    let best: Point | null = null;
    let bestD = 18 * 18;
    for (const p of points) {
      const dx = sx(p.x) - mx;
      const dy = sy(p.y) - my;
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    if (!best) {
      setHit(null);
      return;
    }
    setHit({
      sev: SEV_LABEL[best.sev],
      type: TYPE_NAMES[best.type],
      x: best.x,
      y: best.y,
    });
  }

  const grid = [0, 1, 2, 3, 4];

  return (
    <div>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Plot of ${points.length} collision locations on the Ordnance Survey grid. Slight records are small grey dots, serious records are larger clay dots, and fatal records are the largest dark dots. This is a count plot, not a risk map.`}
        onMouseMove={locate}
        onMouseLeave={() => setHit(null)}
      >
        <rect width={VB_W} height={VB_H} fill="var(--color-surface)" />
        {grid.map((i) => {
          const x = PAD_L + (plotW * i) / 4;
          const y = PAD_T + (plotH * i) / 4;
          const easting = Math.round(minX + ((maxX - minX) * i) / 4);
          const northing = Math.round(maxY - ((maxY - minY) * i) / 4);
          return (
            <g key={i}>
              <line x1={x} y1={PAD_T} x2={x} y2={PAD_T + plotH} stroke="var(--color-border)" />
              <line x1={PAD_L} y1={y} x2={PAD_L + plotW} y2={y} stroke="var(--color-border)" />
              <text x={x} y={VB_H - 16} textAnchor="middle" fill="var(--color-muted)" fontSize="14">
                {easting}
              </text>
              <text x={PAD_L - 8} y={y + 5} textAnchor="end" fill="var(--color-muted)" fontSize="14">
                {northing}
              </text>
            </g>
          );
        })}
        {points.map((p, i) =>
          p.sev === 3 ? (
            <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={2.4} fill="var(--color-slight)" opacity={0.45} />
          ) : null,
        )}
        {points.map((p, i) =>
          p.sev === 2 ? (
            <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={3.4} fill="var(--color-serious)" opacity={0.9} />
          ) : null,
        )}
        {points.map((p, i) =>
          p.sev === 1 ? (
            <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={5} fill="var(--color-fatal)" />
          ) : null,
        )}
      </svg>
      <p className="mt-2 min-h-11 text-sm text-muted" aria-live="polite">
        {hit
          ? `${hit.sev} · ${hit.type} · easting ${hit.x.toLocaleString("en-GB")}, northing ${hit.y.toLocaleString("en-GB")}`
          : "Move across the plot to read a nearby record. The frame stays fixed so clusters do not jump when you filter."}
      </p>
    </div>
  );
}
