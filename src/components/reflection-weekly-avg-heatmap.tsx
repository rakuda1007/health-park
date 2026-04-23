"use client";

import type { ReflectionAggHeatmapColumn } from "@/lib/dashboard-series";

const ROWS: {
  key: keyof Pick<
    ReflectionAggHeatmapColumn,
    "avgMealScore" | "avgStepsSelfScore" | "avgConditionScore"
  >;
  daysKey: keyof Pick<
    ReflectionAggHeatmapColumn,
    "mealDays" | "stepsSelfDays" | "conditionDays"
  >;
  label: string;
}[] = [
  { key: "avgMealScore", daysKey: "mealDays", label: "食事" },
  { key: "avgStepsSelfScore", daysKey: "stepsSelfDays", label: "歩数(評価)" },
  { key: "avgConditionScore", daysKey: "conditionDays", label: "体調" },
];

/** 0〜2 の平均を日次ヒートマップと近い色に（連続値） */
function cellBgAverage(v: number | null): string {
  if (v === null) {
    return "var(--hp-input)";
  }
  const t = Math.max(0, Math.min(2, v)) / 2;
  const r = Math.round(220 + (22 - 220) * t);
  const g = Math.round(38 + (163 - 38) * t);
  const b = Math.round(38 + (74 - 38) * t);
  const a = 0.22 + t * 0.2;
  return `rgba(${r},${g},${b},${a})`;
}

type Props = {
  columns: ReflectionAggHeatmapColumn[];
  /** 見出し（例: 週平均（…）） */
  heading: string;
  /** 表下の説明文 */
  footer: string;
  /** ツールチップ内の「○○平均」（例: 週 / 月） */
  periodAvgWord: string;
};

export function ReflectionWeeklyAvgHeatmap({
  columns,
  heading,
  footer,
  periodAvgWord,
}: Props) {
  if (columns.length === 0) {
    return null;
  }

  return (
    <div className="w-full min-w-0">
      <h3 className="text-xs font-medium text-[color:var(--hp-foreground)]">
        {heading}
      </h3>
      <div className="mt-2 rounded-lg border border-[color:var(--hp-border)]">
        <table className="w-full table-fixed border-collapse text-[9px] sm:text-[10px]">
          <thead>
            <tr className="border-b border-[color:var(--hp-border)] bg-[color:var(--hp-input)]">
              <th className="w-[18%] border-r border-[color:var(--hp-border)] px-0.5 py-1 text-left font-medium text-[color:var(--hp-muted)]">
                項目
              </th>
              {columns.map((c) => (
                <th
                  key={c.periodKey}
                  className="px-0.5 py-1 text-center font-normal leading-tight text-[color:var(--hp-muted)]"
                >
                  {c.label}
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
                <th className="border-r border-[color:var(--hp-border)] bg-[color:var(--hp-card)] px-0.5 py-1 text-left font-medium text-[color:var(--hp-foreground)]">
                  {row.label}
                </th>
                {columns.map((c) => {
                  const v = c[row.key];
                  const days = c[row.daysKey];
                  const title = `${c.periodKey} ${row.label}: ${periodAvgWord}平均 ${
                    v != null ? v.toFixed(1) : "—"
                  }（${days}日分の記録）`;
                  return (
                    <td key={`${c.periodKey}-${row.key}`} className="p-0">
                      <div
                        className="mx-px flex min-h-[1.75rem] min-w-0 items-center justify-center rounded-sm border border-[color:var(--hp-border)] tabular-nums sm:min-h-[2rem]"
                        style={{ background: cellBgAverage(v) }}
                        title={title}
                      >
                        {v != null ? (
                          <span className="text-[8px] text-[color:var(--hp-foreground)] sm:text-[9px]">
                            {v.toFixed(1)}
                          </span>
                        ) : null}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-[color:var(--hp-muted)]">{footer}</p>
    </div>
  );
}
