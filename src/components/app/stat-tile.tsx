import { cn } from "@/lib/utils";

export function StatTile({
  label,
  value,
  meta,
  tone = "neutral",
  chart,
}: {
  label: string;
  value: string;
  meta?: string;
  tone?: "neutral" | "positive" | "warning";
  chart?: React.ReactNode;
}) {
  return (
    <div className="bg-card flex flex-col gap-1 rounded-lg border p-4">
      <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label}
      </span>
      <span
        className={cn(
          "font-display text-2xl leading-tight font-semibold tabular-nums",
          tone === "positive" && "text-success",
          tone === "warning" && "text-warning",
        )}
      >
        {value}
      </span>
      {meta && (
        <span className="text-muted-foreground text-xs">{meta}</span>
      )}
      {chart && <div className="mt-2">{chart}</div>}
    </div>
  );
}

/**
 * Inline area sparkline. Drawn as an SVG path rather than pulling in a chart
 * library for fourteen points, with the final value emphasised so the eye
 * lands on today.
 */
export function Sparkline({
  points,
  className,
}: {
  points: number[];
  className?: string;
}) {
  if (points.length < 2) return null;

  const width = 100;
  const height = 28;
  const max = Math.max(...points, 1);
  const step = width / (points.length - 1);

  const coords = points.map((value, i) => ({
    x: i * step,
    y: height - (value / max) * (height - 3) - 1.5,
  }));

  const line = coords
    .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(2)},${c.y.toFixed(2)}`)
    .join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  const last = coords[coords.length - 1];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("h-7 w-full overflow-visible", className)}
      preserveAspectRatio="none"
      aria-hidden
    >
      <path d={area} fill="currentColor" className="text-primary/12" />
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        className="text-primary"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={last.x}
        cy={last.y}
        r="2"
        className="fill-primary"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
