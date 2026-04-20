"use client";

import type { StepsEntry } from "@/lib/db/types";
import {
  averageRecordedSteps,
  buildStepsBarSeries,
  countRecordedDaysInSeries,
} from "@/lib/steps-stats";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Props = {
  entries: StepsEntry[];
  /** ダッシュボード用：直近14日固定・期間切替なし */
  compact?: boolean;
};

const PERIODS = [7, 14, 30] as const;

export function StepsVisualization({ entries, compact = false }: Props) {
  const [days, setDays] = useState<number>(14);
  const axisColor = "var(--hp-muted)";
  const gridColor = "var(--hp-border)";
  const barFill = "var(--hp-accent)";

  const periodDays = compact ? 14 : days;

  const chartData = useMemo(() => {
    const series = buildStepsBarSeries(entries, periodDays);
    return series.map((p) => ({
      ...p,
      /** Recharts 用：未記録は 0 だが描画しない（Cell で透明） */
      barValue: p.recorded && p.steps != null ? p.steps : 0,
    }));
  }, [entries, periodDays]);

  const avg = useMemo(
    () => averageRecordedSteps(entries, periodDays),
    [entries, periodDays],
  );
  const recordedDays = useMemo(
    () => countRecordedDaysInSeries(entries, periodDays),
    [entries, periodDays],
  );

  return (
    <section
      className={`rounded-xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] p-4 ${compact ? "" : "mt-8"}`}
      aria-labelledby="steps-chart-heading"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="steps-chart-heading"
            className="text-sm font-medium text-[color:var(--hp-foreground)]"
          >
            {compact ? "歩数（直近14日）" : "歩数の推移（棒グラフ）"}
          </h2>
          <p className="mt-1 text-xs text-[color:var(--hp-muted)]">
            未記録の日は棒を表示しません。平均は記録がある日のみの算術平均です。
          </p>
        </div>
        {!compact ? (
          <div className="flex flex-wrap gap-2">
            {PERIODS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
                  days === d
                    ? "border-[color:var(--hp-accent)] bg-[color:var(--hp-accent)] text-[color:var(--hp-accent-fg)]"
                    : "border-[color:var(--hp-border)] text-[color:var(--hp-muted)] hover:border-[color:var(--hp-accent)]"
                }`}
              >
                {d}日
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div
        className={`mt-3 w-full min-w-0 ${compact ? "h-48 min-h-[12rem]" : "h-56 min-h-[14rem]"}`}
      >
        <ResponsiveContainer
          width="100%"
          height="100%"
          minHeight={compact ? 192 : 224}
        >
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tick={{ fill: axisColor, fontSize: 10 }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: axisColor, fontSize: 11 }}
              width={40}
              tickFormatter={(v) => `${v}`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) {
                  return null;
                }
                const p = payload[0]?.payload as {
                  label: string;
                  recorded: boolean;
                  steps: number | null;
                };
                if (!p.recorded) {
                  return (
                    <div className="rounded-md border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] px-2 py-1 text-xs shadow">
                      <div className="font-medium">{p.label}</div>
                      <div className="text-[color:var(--hp-muted)]">未記録</div>
                    </div>
                  );
                }
                return (
                  <div className="rounded-md border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] px-2 py-1 text-xs shadow">
                    <div className="font-medium">{p.label}</div>
                    <div>{(p.steps ?? 0).toLocaleString("ja-JP")} 歩</div>
                  </div>
                );
              }}
            />
            <Bar dataKey="barValue" radius={[4, 4, 0, 0]} maxBarSize={28}>
              {chartData.map((entry, i) => (
                <Cell
                  key={`cell-${entry.date}-${i}`}
                  fill={entry.recorded ? barFill : "transparent"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-[color:var(--hp-muted)]">
        <div>
          <dt className="inline">記録がある日（この期間）</dt>
          <dd className="ml-1 inline font-medium text-[color:var(--hp-foreground)]">
            {recordedDays} 日
          </dd>
        </div>
        <div>
          <dt className="inline">平均（記録日のみ）</dt>
          <dd className="ml-1 inline font-medium text-[color:var(--hp-foreground)]">
            {avg != null ? `${avg.toLocaleString("ja-JP")} 歩` : "—"}
          </dd>
        </div>
      </dl>
    </section>
  );
}
