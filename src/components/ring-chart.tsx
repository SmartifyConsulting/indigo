import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export interface RingSlice {
  label: string;
  value: number;
}

const COLORS = [
  "var(--color-brand)",
  "var(--color-navy)",
  "var(--color-primary)",
  "var(--color-chart-4)",
  "var(--color-warning)",
  "var(--color-positive)",
  "var(--color-chart-5)",
];

/** Donut chart with a centred total and a compact legend. */
export function RingChart({
  data,
  centerLabel,
  centerValue,
  height = 180,
}: {
  data: RingSlice[];
  centerLabel: string;
  centerValue?: string | number;
  height?: number;
}) {
  const total = data.reduce((n, d) => n + d.value, 0);
  const shown = total ? data.filter((d) => d.value > 0) : [{ label: "None", value: 1 }];
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative shrink-0" style={{ width: height, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={shown}
              dataKey="value"
              nameKey="label"
              innerRadius="68%"
              outerRadius="100%"
              paddingAngle={total ? 2 : 0}
              stroke="none"
              isAnimationActive={false}
            >
              {shown.map((d, i) => (
                <Cell
                  key={d.label}
                  fill={total ? COLORS[data.indexOf(d) % COLORS.length] : "var(--color-border)"}
                  opacity={i >= 0 ? 1 : 1}
                />
              ))}
            </Pie>
            {total > 0 && (
              <Tooltip
                contentStyle={{
                  borderRadius: 6,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-card)",
                  color: "var(--color-foreground)",
                  fontSize: 12,
                }}
              />
            )}
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-heading text-2xl font-semibold">{centerValue ?? total}</span>
          <span className="label-caps text-[9px] text-muted-foreground">{centerLabel}</span>
        </div>
      </div>
      <ul className="w-full space-y-1.5 text-xs">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ background: COLORS[i % COLORS.length] }}
            />
            <span className="flex-1 truncate text-muted-foreground">{d.label}</span>
            <span className="font-medium tabular-nums">{d.value}</span>
            <span className="w-9 text-right tabular-nums text-muted-foreground">
              {total ? Math.round((d.value / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
