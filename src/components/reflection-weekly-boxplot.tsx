"use client";

import type { ScoreBoxStats, WeeklyDashboardRow } from "@/lib/dashboard-series";

const COLORS = {
  meal: "var(--hp-accent)",
  steps: "#2563eb",
  condition: "#9333ea",
} as const;

type Dim = "meal" | "steps" | "condition";

function pickBox(row: WeeklyDashboardRow, dim: Dim): ScoreBoxStats | null {
  if (dim === "meal") {
    return row.mealBox;
  }
  if (dim === "steps") {
    return row.stepsSelfBox;
  }
  return row.conditionBox;
}

function valToY(v: number, innerTop: number, innerH: number): number {
  return innerTop + (2 - v) * (innerH / 2);
}

type Props = {
  weeks: WeeklyDashboardRow[];
};

/**
 * 週ごとに食事・歩数(評価)・体調のスコア分布（0〜2）を箱ひげ図で表示。
 */
export function ReflectionWeeklyBoxPlot({ weeks }: Props) {
  if (weeks.length === 0) {
    return null;
  }

  const w = 720;
  const h = 220;
  const padL = 36;
  const padR = 12;
  const padT = 16;
  const padB = 52;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const n = weeks.length;
  const colW = innerW / n;
  const boxW = Math.min(14, (colW / 3.5) * 0.85);
  const gap = colW / 3.5;

  const dims: { key: Dim; label: string }[] = [
    { key: "meal", label: "食" },
    { key: "steps", label: "歩" },
    { key: "condition", label: "体" },
  ];

  return (
    <div className="mt-4 w-full min-w-0">
      <p className="text-xs text-[color:var(--hp-muted)]">
        各週について、記録のあった日のスコア（0〜2）から四分位と最小・最大を表示します。記録が1日だけの週は箱が細く見えます。
      </p>
      <div className="mt-2 overflow-x-auto">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="h-[220px] min-w-[min(100%,520px)] w-full max-w-full"
          role="img"
          aria-label="振り返りスコアの週ごと箱ひげ図"
        >
          <rect
            x={0}
            y={0}
            width={w}
            height={h}
            fill="transparent"
          />
          {/* Y 軸ラベル 0,1,2 */}
          {[0, 1, 2].map((tick) => (
            <text
              key={tick}
              x={padL - 6}
              y={valToY(tick, padT, innerH) + 4}
              textAnchor="end"
              fill="var(--hp-muted)"
              fontSize={11}
            >
              {tick}
            </text>
          ))}
          <line
            x1={padL}
            y1={padT}
            x2={padL}
            y2={padT + innerH}
            stroke="var(--hp-border)"
            strokeWidth={1}
          />
          <line
            x1={padL}
            y1={padT + innerH}
            x2={padL + innerW}
            y2={padT + innerH}
            stroke="var(--hp-border)"
            strokeWidth={1}
          />

          {weeks.map((row, wi) => {
            const x0 = padL + wi * colW + colW / 2 - gap;
            return (
              <g key={row.weekStart}>
                {dims.map((d, di) => {
                  const box = pickBox(row, d.key);
                  const cx = x0 + di * gap;
                  const stroke = COLORS[d.key];
                  if (!box || box.n === 0) {
                    return (
                      <text
                        key={`${row.weekStart}-${d.key}`}
                        x={cx}
                        y={padT + innerH / 2}
                        textAnchor="middle"
                        fill="var(--hp-muted)"
                        fontSize={9}
                      >
                        —
                      </text>
                    );
                  }
                  const yMin = valToY(box.min, padT, innerH);
                  const yMax = valToY(box.max, padT, innerH);
                  const yQ1 = valToY(box.q1, padT, innerH);
                  const yQ3 = valToY(box.q3, padT, innerH);
                  const yMed = valToY(box.median, padT, innerH);
                  const top = Math.min(yQ1, yQ3);
                  const bot = Math.max(yQ1, yQ3);
                  const title = `${row.label} ${d.label}: min=${box.min} Q1=${box.q1.toFixed(2)} med=${box.median.toFixed(2)} Q3=${box.q3.toFixed(2)} max=${box.max} (n=${box.n})`;
                  return (
                    <g key={`${row.weekStart}-${d.key}`}>
                      <title>{title}</title>
                      {/* whisker */}
                      <line
                        x1={cx}
                        y1={yMin}
                        x2={cx}
                        y2={yMax}
                        stroke={stroke}
                        strokeWidth={1.5}
                        strokeOpacity={0.85}
                      />
                      <line
                        x1={cx - boxW / 2}
                        y1={yMin}
                        x2={cx + boxW / 2}
                        y2={yMin}
                        stroke={stroke}
                        strokeWidth={1.5}
                        strokeOpacity={0.85}
                      />
                      <line
                        x1={cx - boxW / 2}
                        y1={yMax}
                        x2={cx + boxW / 2}
                        y2={yMax}
                        stroke={stroke}
                        strokeWidth={1.5}
                        strokeOpacity={0.85}
                      />
                      <rect
                        x={cx - boxW / 2}
                        y={top}
                        width={boxW}
                        height={Math.max(bot - top, 2)}
                        fill={stroke}
                        fillOpacity={0.18}
                        stroke={stroke}
                        strokeWidth={1.2}
                      />
                      <line
                        x1={cx - boxW / 2}
                        y1={yMed}
                        x2={cx + boxW / 2}
                        y2={yMed}
                        stroke={stroke}
                        strokeWidth={2}
                      />
                    </g>
                  );
                })}
                <text
                  x={padL + wi * colW + colW / 2}
                  y={h - 18}
                  textAnchor="middle"
                  fill="var(--hp-muted)"
                  fontSize={10}
                >
                  {row.label.length > 8 ? row.label.slice(0, 7) + "…" : row.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[color:var(--hp-muted)]">
        <li className="flex items-center gap-1.5">
          <span
            className="inline-block size-2.5 rounded-sm border"
            style={{ borderColor: COLORS.meal, backgroundColor: "rgba(0,0,0,0.06)" }}
          />
          食事
        </li>
        <li className="flex items-center gap-1.5">
          <span
            className="inline-block size-2.5 rounded-sm border"
            style={{ borderColor: COLORS.steps, backgroundColor: "rgba(0,0,0,0.06)" }}
          />
          歩数(評価)
        </li>
        <li className="flex items-center gap-1.5">
          <span
            className="inline-block size-2.5 rounded-sm border"
            style={{ borderColor: COLORS.condition, backgroundColor: "rgba(0,0,0,0.06)" }}
          />
          体調
        </li>
      </ul>
    </div>
  );
}
