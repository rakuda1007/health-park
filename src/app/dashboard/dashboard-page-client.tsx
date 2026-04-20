"use client";

import {
  listDailyReflectionEntries,
  listStepsEntries,
  listWeightEntries,
} from "@/lib/db";
import type { DailyReflectionEntry, StepsEntry, WeightEntry } from "@/lib/db/types";
import {
  buildDailyDashboardPoints,
  buildWeeklyDashboardRows,
  weeklyStepsNarrative,
  weeklyWeightNarrative,
} from "@/lib/dashboard-series";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PERIODS = [14, 30] as const;

export function DashboardPageClient() {
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [stepsEntries, setStepsEntries] = useState<StepsEntry[]>([]);
  const [reflections, setReflections] = useState<DailyReflectionEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [periodDays, setPeriodDays] = useState<(typeof PERIODS)[number]>(14);

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

  const dailyPoints = useMemo(
    () =>
      buildDailyDashboardPoints(
        periodDays,
        weightEntries,
        stepsEntries,
        reflections,
      ),
    [periodDays, weightEntries, stepsEntries, reflections],
  );

  const weeklyRows = useMemo(
    () => buildWeeklyDashboardRows(dailyPoints, 8),
    [dailyPoints],
  );

  const hasAnyWeight = dailyPoints.some((p) => p.weightKg != null);
  const hasAnySteps = dailyPoints.some((p) => p.steps != null);
  const hasCombined = hasAnyWeight || hasAnySteps;

  const hasAnyReflectionScore = dailyPoints.some(
    (p) => p.mealScore != null || p.stepsSelfScore != null || p.conditionScore != null,
  );

  /** 棒グラフ用（未記録は 0＋透明セル。ツールチップは元の steps を参照） */
  const combinedChartData = useMemo(
    () =>
      dailyPoints.map((p) => ({
        ...p,
        stepsBar: p.steps != null ? p.steps : 0,
        stepsRecorded: p.steps != null,
      })),
    [dailyPoints],
  );

  /** 体重は記録の範囲を拡大表示（0 起点は省略）。左軸の最小目盛に ～ を付与 */
  const weightAxisConfig = useMemo(() => {
    const vals = dailyPoints
      .map((p) => p.weightKg)
      .filter((v): v is number => v != null);
    if (vals.length === 0) {
      return {
        domain: [0, 100] as [number, number],
        ticks: undefined as number[] | undefined,
      };
    }
    const low = Math.min(...vals);
    const high = Math.max(...vals);
    const span = Math.max(high - low, 0.1);
    const pad = Math.max(span * 0.06, 0.3);
    const min = Math.round(Math.max(0, low - pad) * 100) / 100;
    const max = Math.round((high + pad) * 100) / 100;
    const domain: [number, number] =
      min === max ? [min - 0.5, max + 0.5] : [min, max];
    const [d0, d1] = domain;
    const tickCount = 5;
    const raw = Array.from({ length: tickCount }, (_, i) => {
      const t = d0 + ((d1 - d0) * i) / (tickCount - 1);
      return Math.round(t * 100) / 100;
    });
    const ticks = [...new Set(raw)];
    return { domain, ticks: ticks.length >= 2 ? ticks : raw };
  }, [dailyPoints]);

  const stepsAxisMax = useMemo(() => {
    const vals = dailyPoints
      .map((p) => p.steps)
      .filter((v): v is number => v != null);
    if (vals.length === 0) {
      return 8000;
    }
    const m = Math.max(...vals);
    return Math.max(Math.ceil(m * 1.05), 100);
  }, [dailyPoints]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-semibold text-[color:var(--hp-foreground)]">
        ホーム
      </h1>
      <p className="mt-1 text-sm text-[color:var(--hp-muted)]">
        体重（折れ線）と歩数（棒）を同じ日付軸で重ね、振り返りは日ごとのスコア（〇=2、△=1、✕=0）で表示します。因果関係の証明ではなく、記録の並びを眺めるための参考です。
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs text-[color:var(--hp-muted)]">表示期間:</span>
        {PERIODS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setPeriodDays(d)}
            className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
              periodDays === d
                ? "border-[color:var(--hp-accent)] bg-[color:var(--hp-accent)] text-[color:var(--hp-accent-fg)]"
                : "border-[color:var(--hp-border)] text-[color:var(--hp-muted)] hover:border-[color:var(--hp-accent)]"
            }`}
          >
            直近{d}日
          </button>
        ))}
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <section className="mt-8 space-y-10">
        <div className="rounded-xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] p-4">
          <h2 className="text-sm font-medium text-[color:var(--hp-foreground)]">
            体重と歩数（折れ線＋棒・日ごと）
          </h2>
          <p className="mt-1 text-xs text-[color:var(--hp-muted)]">
            折れ線＝体重（kg・左軸）、棒＝歩数（右軸）。歩数は 0 から。体重は
            変化が見えやすいよう記録範囲を拡大表示しており、左軸の最小目盛に ～
            が付くときは 0 からの区間が省略されています。未記録の日は体重は線が途切れ、歩数は棒を出しません（0
            歩の記録ではありません）。
          </p>
          {!hasCombined ? (
            <p className="mt-2 text-sm text-[color:var(--hp-muted)]">
              この期間に体重・歩数の記録がありません。
            </p>
          ) : (
            <div className="mt-3 h-64 w-full min-h-[16rem] min-w-0">
              <ResponsiveContainer width="100%" height="100%" minHeight={256}>
                <ComposedChart
                  data={combinedChartData}
                  margin={{ top: 8, right: 12, left: 4, bottom: 0 }}
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
                    yAxisId="w"
                    orientation="left"
                    domain={weightAxisConfig.domain}
                    ticks={weightAxisConfig.ticks}
                    tick={(props) => (
                      <WeightAxisTick
                        x={Number(props.x)}
                        y={Number(props.y)}
                        value={props.payload.value}
                        weightFloor={weightAxisConfig.domain[0]}
                        hasWeight={hasAnyWeight}
                      />
                    )}
                    width={52}
                    label={{
                      value: "kg（0〜は省略）",
                      position: "insideLeft",
                      fill: "var(--hp-muted)",
                      fontSize: 10,
                    }}
                  />
                  <YAxis
                    yAxisId="s"
                    orientation="right"
                    domain={[0, stepsAxisMax]}
                    tick={{ fill: "var(--hp-muted)", fontSize: 11 }}
                    width={48}
                    tickFormatter={(v) => `${v}`}
                    label={{
                      value: "歩（0〜）",
                      position: "insideRight",
                      fill: "var(--hp-muted)",
                      fontSize: 10,
                    }}
                  />
                  <Tooltip content={<CombinedTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 12 }}
                    formatter={(value) => {
                      const labels: Record<string, string> = {
                        weightKg: "体重 (kg)",
                        steps: "歩数",
                      };
                      return labels[value] ?? value;
                    }}
                  />
                  <Bar
                    yAxisId="s"
                    dataKey="stepsBar"
                    name="steps"
                    fill="#16a34a"
                    maxBarSize={22}
                    radius={[3, 3, 0, 0]}
                  >
                    {combinedChartData.map((entry, i) => (
                      <Cell
                        key={`steps-bar-${entry.date}-${i}`}
                        fill={
                          entry.stepsRecorded ? "#16a34a" : "transparent"
                        }
                      />
                    ))}
                  </Bar>
                  <Line
                    yAxisId="w"
                    type="monotone"
                    dataKey="weightKg"
                    name="weightKg"
                    stroke="var(--hp-accent)"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    connectNulls={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
          <p className="mt-2 text-xs text-[color:var(--hp-muted)]">
            詳細入力は{" "}
            <Link href="/weight" className="text-[color:var(--hp-accent)] underline">
              体重
            </Link>
            ・
            <Link href="/steps" className="text-[color:var(--hp-accent)] underline">
              歩数
            </Link>
            へ。
          </p>
        </div>

        <div className="rounded-xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] p-4">
          <h2 className="text-sm font-medium text-[color:var(--hp-foreground)]">
            振り返り（日ごとのスコア）
          </h2>
          <p className="mt-1 text-xs text-[color:var(--hp-muted)]">
            食事・歩数・体調それぞれを 〇=2、△=1、✕=0 にした折れ線です。未記録の日は表示されません。
          </p>
          {!hasAnyReflectionScore ? (
            <p className="mt-2 text-sm text-[color:var(--hp-muted)]">
              この期間に振り返りの記録がありません。
            </p>
          ) : (
            <div className="mt-3 h-56 w-full min-h-[14rem] min-w-0">
              <ResponsiveContainer width="100%" height="100%" minHeight={224}>
                <LineChart
                  data={dailyPoints}
                  margin={{ top: 8, right: 8, left: 4, bottom: 0 }}
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
                    domain={[0, 2]}
                    ticks={[0, 1, 2]}
                    tick={{ fill: "var(--hp-muted)", fontSize: 11 }}
                    width={32}
                  />
                  <Tooltip content={<ReflectionTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 11 }}
                    formatter={(value) => {
                      const labels: Record<string, string> = {
                        mealScore: "食事",
                        stepsSelfScore: "歩数(評価)",
                        conditionScore: "体調",
                      };
                      return labels[value] ?? value;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="mealScore"
                    name="mealScore"
                    stroke="var(--hp-accent)"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="stepsSelfScore"
                    name="stepsSelfScore"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="conditionScore"
                    name="conditionScore"
                    stroke="#9333ea"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <p className="mt-2 text-xs text-[color:var(--hp-muted)]">
            合計スコア（1日最大6）は週次表を参照。記録は{" "}
            <Link
              href="/reflection"
              className="text-[color:var(--hp-accent)] underline"
            >
              振り返り
            </Link>
            へ。
          </p>
        </div>

        <div className="rounded-xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] p-4">
          <h2 className="text-sm font-medium text-[color:var(--hp-foreground)]">
            週ごとのサマリー（直近8週）
          </h2>
          <p className="mt-1 text-xs text-[color:var(--hp-muted)]">
            その週に記録があった日だけを平均しています。記録日数が少ない週は値がブレやすいです。体重・歩数の文は自動生成です（診断や目標設定ではありません）。
          </p>
          {weeklyRows.length === 0 ? (
            <p className="mt-2 text-sm text-[color:var(--hp-muted)]">
              データがありません。
            </p>
          ) : (
            <>
              <ul className="mt-3 space-y-3 md:hidden">
                {weeklyRows.map((row, i) => {
                  const prev = i > 0 ? weeklyRows[i - 1]! : null;
                  return (
                    <li
                      key={row.weekStart}
                      className="rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-input)] p-3"
                    >
                      <p className="text-sm font-medium text-[color:var(--hp-foreground)]">
                        {row.label}
                      </p>
                      <dl className="mt-2 space-y-3 text-sm">
                        <div>
                          <dt className="text-xs text-[color:var(--hp-muted)]">
                            体重
                          </dt>
                          <dd className="mt-0.5 tabular-nums text-[color:var(--hp-foreground)]">
                            {row.avgWeightKg != null
                              ? `${row.avgWeightKg} kg`
                              : "—"}
                            <span className="text-xs text-[color:var(--hp-muted)]">
                              {" "}
                              （記録 {row.weightDays} 日）
                            </span>
                          </dd>
                          <p className="mt-1.5 text-xs leading-relaxed text-[color:var(--hp-muted)]">
                            {weeklyWeightNarrative(row, prev)}
                          </p>
                        </div>
                        <div>
                          <dt className="text-xs text-[color:var(--hp-muted)]">
                            歩数
                          </dt>
                          <dd className="mt-0.5 tabular-nums text-[color:var(--hp-foreground)]">
                            {row.avgSteps != null
                              ? `${row.avgSteps.toLocaleString("ja-JP")} 歩`
                              : "—"}
                            <span className="text-xs text-[color:var(--hp-muted)]">
                              {" "}
                              （記録 {row.stepsRecordedDays} 日）
                            </span>
                          </dd>
                          <p className="mt-1.5 text-xs leading-relaxed text-[color:var(--hp-muted)]">
                            {weeklyStepsNarrative(row, prev)}
                          </p>
                        </div>
                        <div>
                          <dt className="text-xs text-[color:var(--hp-muted)]">
                            振り返り（合計の週平均）
                          </dt>
                          <dd className="mt-0.5 tabular-nums text-[color:var(--hp-foreground)]">
                            {row.avgReflectionTotal != null
                              ? `${row.avgReflectionTotal} / 6`
                              : "—"}
                            <span className="text-xs text-[color:var(--hp-muted)]">
                              {" "}
                              （記録 {row.reflectionDays} 日）
                            </span>
                          </dd>
                        </div>
                      </dl>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-3 hidden overflow-x-hidden md:block">
                <table className="w-full min-w-0 table-fixed border-collapse text-left text-xs lg:text-sm">
                  <thead>
                    <tr className="border-b border-[color:var(--hp-border)] bg-[color:var(--hp-input)]">
                      <th className="w-[5.5rem] px-2 py-2 font-medium text-[color:var(--hp-muted)]">
                        週
                      </th>
                      <th className="w-[4.5rem] px-1 py-2 text-right font-medium text-[color:var(--hp-muted)]">
                        体重
                      </th>
                      <th className="w-[2.5rem] px-1 py-2 text-center font-medium text-[color:var(--hp-muted)]">
                        日
                      </th>
                      <th className="w-[5rem] px-1 py-2 text-right font-medium text-[color:var(--hp-muted)]">
                        歩数
                      </th>
                      <th className="w-[2.5rem] px-1 py-2 text-center font-medium text-[color:var(--hp-muted)]">
                        日
                      </th>
                      <th className="w-[4rem] px-1 py-2 text-right font-medium text-[color:var(--hp-muted)]">
                        振返
                      </th>
                      <th className="w-[2.5rem] px-1 py-2 text-center font-medium text-[color:var(--hp-muted)]">
                        日
                      </th>
                      <th className="min-w-0 px-2 py-2 font-medium text-[color:var(--hp-muted)]">
                        自動コメント（体重・歩数）
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-[color:var(--hp-foreground)]">
                    {weeklyRows.map((row, i) => {
                      const prev = i > 0 ? weeklyRows[i - 1]! : null;
                      return (
                        <tr
                          key={row.weekStart}
                          className="border-b border-[color:var(--hp-border)] align-top last:border-b-0"
                        >
                          <td className="whitespace-nowrap px-2 py-2">
                            {row.label}
                          </td>
                          <td className="px-1 py-2 text-right tabular-nums">
                            {row.avgWeightKg != null
                              ? `${row.avgWeightKg} kg`
                              : "—"}
                          </td>
                          <td className="px-1 py-2 text-center tabular-nums">
                            {row.weightDays}
                          </td>
                          <td className="break-all px-1 py-2 text-right tabular-nums">
                            {row.avgSteps != null
                              ? row.avgSteps.toLocaleString("ja-JP")
                              : "—"}
                          </td>
                          <td className="px-1 py-2 text-center tabular-nums">
                            {row.stepsRecordedDays}
                          </td>
                          <td className="px-1 py-2 text-right tabular-nums">
                            {row.avgReflectionTotal != null
                              ? `${row.avgReflectionTotal}/6`
                              : "—"}
                          </td>
                          <td className="px-1 py-2 text-center tabular-nums">
                            {row.reflectionDays}
                          </td>
                          <td className="min-w-0 whitespace-normal break-words px-2 py-2 text-[11px] leading-snug text-[color:var(--hp-muted)] lg:text-xs">
                            <p>{weeklyWeightNarrative(row, prev)}</p>
                            <p className="mt-1.5 border-t border-dashed border-[color:var(--hp-border)] pt-1.5">
                              {weeklyStepsNarrative(row, prev)}
                            </p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <p className="mt-2 text-[11px] text-[color:var(--hp-muted)]">
                  列見出し：体重・歩数・振返は週平均、隣の「日」は記録があった日数です。
                </p>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function WeightAxisTick({
  x,
  y,
  value,
  weightFloor,
  hasWeight,
}: {
  x: number;
  y: number;
  value: number | string;
  weightFloor: number;
  hasWeight: boolean;
}) {
  const num = typeof value === "number" ? value : Number(value);
  const eps = Math.max(1e-6, Math.abs(weightFloor) * 1e-9);
  /** 軸の下限が 0 でないときだけ 0〜 の省略を示す */
  const isMinTick =
    hasWeight &&
    weightFloor > 0.05 &&
    Math.abs(num - weightFloor) < eps;
  const label = isMinTick ? `～${num}` : String(num);
  return (
    <text
      x={x}
      y={y}
      dy={3}
      textAnchor="end"
      fill="var(--hp-muted)"
      fontSize={11}
    >
      {label}
    </text>
  );
}

function CombinedTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: Record<string, unknown>; dataKey?: string }>;
}) {
  if (!active || !payload?.length) {
    return null;
  }
  const row = payload[0]?.payload as {
    date: string;
    weightKg: number | null;
    steps: number | null;
  };
  return (
    <div className="rounded-md border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] px-2 py-1.5 text-xs shadow">
      <div className="tabular-nums text-[color:var(--hp-muted)]">{row.date}</div>
      <div className="mt-1 text-[color:var(--hp-foreground)]">
        体重:{" "}
        {row.weightKg != null ? `${row.weightKg} kg` : "—"}
      </div>
      <div className="text-[color:var(--hp-foreground)]">
        歩数:{" "}
        {row.steps != null
          ? `${row.steps.toLocaleString("ja-JP")} 歩`
          : "—"}
      </div>
    </div>
  );
}

function ReflectionTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: Record<string, unknown> }>;
}) {
  if (!active || !payload?.length) {
    return null;
  }
  const row = payload[0]?.payload as {
    date: string;
    mealScore: number | null;
    stepsSelfScore: number | null;
    conditionScore: number | null;
    reflectionTotal: number | null;
  };
  return (
    <div className="rounded-md border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] px-2 py-1.5 text-xs shadow">
      <div className="tabular-nums text-[color:var(--hp-muted)]">{row.date}</div>
      <div className="mt-1 space-y-0.5 text-[color:var(--hp-foreground)]">
        <div>食事: {scoreOrDash(row.mealScore)}</div>
        <div>歩数(評価): {scoreOrDash(row.stepsSelfScore)}</div>
        <div>体調: {scoreOrDash(row.conditionScore)}</div>
        {row.reflectionTotal != null ? (
          <div className="border-t border-dashed border-[color:var(--hp-border)] pt-1">
            合計: {row.reflectionTotal} / 6
          </div>
        ) : null}
      </div>
    </div>
  );
}

function scoreOrDash(v: number | null): string {
  return v != null ? String(v) : "—";
}
