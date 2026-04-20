"use client";

import { StepsVisualization } from "@/components/steps-visualization";
import {
  listDailyReflectionEntries,
  listStepsEntries,
  listWeightEntries,
} from "@/lib/db";
import type { DailyReflectionEntry, StepsEntry, WeightEntry } from "@/lib/db/types";
import {
  countRatingsByAxis,
  filterReflectionsSince,
  isoDateDaysAgo,
} from "@/lib/reflection-display";
import { buildDailySeries } from "@/lib/weight-stats";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function DashboardPageClient() {
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [stepsEntries, setStepsEntries] = useState<StepsEntry[]>([]);
  const [reflections, setReflections] = useState<DailyReflectionEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [w, s, r] = await Promise.all([
        listWeightEntries(),
        listStepsEntries(),
        listDailyReflectionEntries(),
      ]);
      setWeightEntries(w);
      setStepsEntries(s);
      setReflections(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "読み込みに失敗しました");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const since14 = useMemo(() => isoDateDaysAgo(14), []);
  const since30 = useMemo(() => isoDateDaysAgo(30), []);

  const weightChartData = useMemo(() => {
    const daily = buildDailySeries(weightEntries);
    return daily
      .filter((p) => p.date >= since14)
      .map((p) => ({
        date: p.date,
        label: formatShortDate(p.date),
        weightKg: p.weightKg,
      }));
  }, [weightEntries, since14]);

  const reflection30 = useMemo(
    () => filterReflectionsSince(reflections, since30),
    [reflections, since30],
  );

  const ratingCounts = useMemo(
    () => countRatingsByAxis(reflection30),
    [reflection30],
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-semibold text-[color:var(--hp-foreground)]">
        ダッシュボード
      </h1>
      <p className="mt-1 text-sm text-[color:var(--hp-muted)]">
        体重・歩数の推移と、振り返り（〇△✕）の集計です。医療的な診断ではなく、記録の傾向を眺めるための画面です。
      </p>

      {error ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <section className="mt-8 space-y-8">
        <div className="rounded-xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] p-4">
          <h2 className="text-sm font-medium text-[color:var(--hp-foreground)]">
            体重（直近14日・記録がある日のみ）
          </h2>
          {weightChartData.length === 0 ? (
            <p className="mt-2 text-sm text-[color:var(--hp-muted)]">
              この期間に体重の記録がありません。
            </p>
          ) : (
            <div className="mt-3 h-52 w-full min-h-[13rem] min-w-0">
              <ResponsiveContainer width="100%" height="100%" minHeight={208}>
                <LineChart
                  data={weightChartData}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    stroke="var(--hp-border)"
                    strokeDasharray="3 3"
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "var(--hp-muted)", fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={["auto", "auto"]}
                    tick={{ fill: "var(--hp-muted)", fontSize: 11 }}
                    width={44}
                    tickFormatter={(v) => `${v}`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) {
                        return null;
                      }
                      const p = payload[0]?.payload as {
                        date: string;
                        weightKg: number;
                      };
                      return (
                        <div className="rounded-md border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] px-2 py-1 text-xs shadow">
                          <div className="tabular-nums text-[color:var(--hp-muted)]">
                            {p.date}
                          </div>
                          <div className="font-medium text-[color:var(--hp-foreground)]">
                            {p.weightKg} kg
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="weightKg"
                    stroke="var(--hp-accent)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="体重(kg)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <p className="mt-2 text-xs text-[color:var(--hp-muted)]">
            詳しくは{" "}
            <Link
              href="/weight"
              className="text-[color:var(--hp-accent)] underline"
            >
              体重
            </Link>
            へ。
          </p>
        </div>

        <StepsVisualization entries={stepsEntries} compact />
        <p className="-mt-4 text-xs text-[color:var(--hp-muted)]">
          詳しくは{" "}
          <Link
            href="/steps"
            className="text-[color:var(--hp-accent)] underline"
          >
            歩数
          </Link>
          へ。
        </p>

        <div className="rounded-xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] p-4">
          <h2 className="text-sm font-medium text-[color:var(--hp-foreground)]">
            振り返りの集計（直近30日）
          </h2>
          <p className="mt-1 text-xs text-[color:var(--hp-muted)]">
            各項目の自己評価（〇・△・✕）の件数です。
          </p>
          {reflection30.length === 0 ? (
            <p className="mt-2 text-sm text-[color:var(--hp-muted)]">
              この期間に振り返りの記録がありません。
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full max-w-md border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[color:var(--hp-border)]">
                    <th className="py-2 pr-4 text-xs font-medium text-[color:var(--hp-muted)]">
                      項目
                    </th>
                    <th className="px-2 py-2 text-center text-xs font-medium text-[color:var(--hp-muted)]">
                      〇
                    </th>
                    <th className="px-2 py-2 text-center text-xs font-medium text-[color:var(--hp-muted)]">
                      △
                    </th>
                    <th className="px-2 py-2 text-center text-xs font-medium text-[color:var(--hp-muted)]">
                      ✕
                    </th>
                  </tr>
                </thead>
                <tbody className="text-[color:var(--hp-foreground)]">
                  <RatingCountRow label="食事" counts={ratingCounts.meal} />
                  <RatingCountRow label="歩数" counts={ratingCounts.steps} />
                  <RatingCountRow label="体調" counts={ratingCounts.condition} />
                </tbody>
              </table>
              <p className="mt-2 text-xs text-[color:var(--hp-muted)]">
                記録した日数: {reflection30.length} 日（30日以内）
              </p>
            </div>
          )}
          <p className="mt-3 text-xs text-[color:var(--hp-muted)]">
            一覧・編集は{" "}
            <Link
              href="/reflection"
              className="text-[color:var(--hp-accent)] underline"
            >
              振り返り
            </Link>
            へ。
          </p>
        </div>
      </section>
    </main>
  );
}

function formatShortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) {
    return iso;
  }
  return `${m}/${d}`;
}

function RatingCountRow({
  label,
  counts,
}: {
  label: string;
  counts: { good: number; ok: number; bad: number };
}) {
  return (
    <tr className="border-b border-[color:var(--hp-border)] last:border-b-0">
      <td className="py-2 pr-4 font-medium">{label}</td>
      <td className="px-2 py-2 text-center tabular-nums">{counts.good}</td>
      <td className="px-2 py-2 text-center tabular-nums">{counts.ok}</td>
      <td className="px-2 py-2 text-center tabular-nums">{counts.bad}</td>
    </tr>
  );
}
