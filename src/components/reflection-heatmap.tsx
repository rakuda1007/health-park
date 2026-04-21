"use client";

import type { DailyDashboardPoint } from "@/lib/dashboard-series";

const ROWS: { key: keyof Pick<
  DailyDashboardPoint,
  "mealScore" | "stepsSelfScore" | "conditionScore"
>; label: string }[] = [
  { key: "mealScore", label: "食事" },
  { key: "stepsSelfScore", label: "歩数(評価)" },
  { key: "conditionScore", label: "体調" },
];

function cellBg(score: number | null): string {
  if (score === null) {
    return "var(--hp-input)";
  }
  if (score >= 2) {
    return "rgba(22, 163, 74, 0.35)";
  }
  if (score >= 1) {
    return "rgba(234, 179, 8, 0.4)";
  }
  return "rgba(220, 38, 38, 0.28)";
}

function scoreLabel(score: number | null): string {
  if (score === null) {
    return "未記録";
  }
  if (score >= 2) {
    return "〇 (2)";
  }
  if (score >= 1) {
    return "△ (1)";
  }
  return "✕ (0)";
}

type Props = {
  points: DailyDashboardPoint[];
};

export function ReflectionHeatmap({ points }: Props) {
  return (
    <div className="mt-3 w-full min-w-0">
      <div className="overflow-x-auto rounded-lg border border-[color:var(--hp-border)]">
        <table className="w-max min-w-full border-collapse text-[10px] sm:text-xs">
          <thead>
            <tr className="border-b border-[color:var(--hp-border)] bg-[color:var(--hp-input)]">
              <th className="sticky left-0 z-[1] min-w-[3.25rem] border-r border-[color:var(--hp-border)] bg-[color:var(--hp-input)] px-1.5 py-1 text-left font-medium text-[color:var(--hp-muted)]">
                項目
              </th>
              {points.map((p) => (
                <th
                  key={p.date}
                  className="min-w-[1.75rem] px-0.5 py-1 text-center font-normal tabular-nums text-[color:var(--hp-muted)]"
                >
                  {p.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr
                key={row.key}
                className="border-b border-[color:var(--hp-border)] last:border-b-0"
              >
                <th className="sticky left-0 z-[1] border-r border-[color:var(--hp-border)] bg-[color:var(--hp-card)] px-1.5 py-1 text-left font-medium text-[color:var(--hp-foreground)]">
                  {row.label}
                </th>
                {points.map((p) => {
                  const v = p[row.key];
                  const title = `${p.date} ${row.label}: ${scoreLabel(v)}`;
                  return (
                    <td key={`${p.date}-${row.key}`} className="p-0">
                      <div
                        className="mx-px min-h-[1.75rem] min-w-[1.5rem] rounded-sm border border-[color:var(--hp-border)] sm:min-h-[2rem]"
                        style={{ background: cellBg(v) }}
                        title={title}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-[color:var(--hp-muted)]">
        列は日付（直近の表示期間）。色は 〇=2（緑系）・△=1（黄系）・✕=0（赤系）、未記録は無地です。セルにマウスを載せると日付と評価が表示されます。
      </p>
      <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[color:var(--hp-muted)]">
        <li className="flex items-center gap-1">
          <span
            className="inline-block size-2.5 rounded-sm border border-[color:var(--hp-border)]"
            style={{ background: cellBg(2) }}
          />
          〇=2
        </li>
        <li className="flex items-center gap-1">
          <span
            className="inline-block size-2.5 rounded-sm border border-[color:var(--hp-border)]"
            style={{ background: cellBg(1) }}
          />
          △=1
        </li>
        <li className="flex items-center gap-1">
          <span
            className="inline-block size-2.5 rounded-sm border border-[color:var(--hp-border)]"
            style={{ background: cellBg(0) }}
          />
          ✕=0
        </li>
        <li className="flex items-center gap-1">
          <span
            className="inline-block size-2.5 rounded-sm border border-[color:var(--hp-border)]"
            style={{ background: cellBg(null) }}
          />
          未記録
        </li>
      </ul>
    </div>
  );
}
