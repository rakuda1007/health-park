"use client";

import {
  listClinicAppointments,
  listClinicEntries,
  listDailyReflectionEntries,
  listStepsEntries,
  listWeightEntries,
} from "@/lib/db";
import type {
  ClinicAppointmentEntry,
  ClinicEntry,
  DailyReflectionEntry,
  StepsEntry,
  WeightEntry,
} from "@/lib/db/types";
import { selectDashboardClinicAppointments } from "@/lib/clinic-appointments-dashboard";
import { ReflectionHeatmap } from "@/components/reflection-heatmap";
import { ReflectionWeeklyAvgHeatmap } from "@/components/reflection-weekly-avg-heatmap";
import {
  buildDailyDashboardPoints,
  buildWeeklyDashboardRows,
  buildWeeklyReflectionHeatmapColumns,
  weeklyReflectionNarrative,
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
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PERIODS = [7, 14, 30] as const;

/** 週平均ヒートマップ用（約2か月・表示期間スイッチと独立） */
const REFLECTION_HEATMAP_DAYS_BACK = 62;

/** `weight-visualization.tsx` と同じキー（体重画面で設定した目標帯） */
const LS_WEIGHT_GOAL_MIN = "health-park-weight-goal-min";
const LS_WEIGHT_GOAL_MAX = "health-park-weight-goal-max";

function readWeightGoalFromStorage(): { min: string; max: string } {
  if (typeof window === "undefined") {
    return { min: "", max: "" };
  }
  return {
    min: localStorage.getItem(LS_WEIGHT_GOAL_MIN) ?? "",
    max: localStorage.getItem(LS_WEIGHT_GOAL_MAX) ?? "",
  };
}

export function DashboardPageClient() {
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [stepsEntries, setStepsEntries] = useState<StepsEntry[]>([]);
  const [reflections, setReflections] = useState<DailyReflectionEntry[]>([]);
  const [clinicAppointments, setClinicAppointments] = useState<
    ClinicAppointmentEntry[]
  >([]);
  const [clinicEntries, setClinicEntries] = useState<ClinicEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [periodDays, setPeriodDays] = useState<(typeof PERIODS)[number]>(7);
  const [goalMinStr, setGoalMinStr] = useState("");
  const [goalMaxStr, setGoalMaxStr] = useState("");

  const load = useCallback(async () => {
    try {
      setError(null);
      const [w, s, r, ap, cl] = await Promise.all([
        listWeightEntries(),
        listStepsEntries(),
        listDailyReflectionEntries(),
        listClinicAppointments(),
        listClinicEntries(),
      ]);
      setWeightEntries(w);
      setStepsEntries(s);
      setReflections(r);
      setClinicAppointments(ap);
      setClinicEntries(cl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "読み込みに失敗しました");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const sync = () => {
      const g = readWeightGoalFromStorage();
      setGoalMinStr(g.min);
      setGoalMaxStr(g.max);
    };
    sync();
    window.addEventListener("focus", sync);
    const onVis = () => {
      if (document.visibilityState === "visible") {
        sync();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    const onStorage = (e: StorageEvent) => {
      if (e.key === LS_WEIGHT_GOAL_MIN || e.key === LS_WEIGHT_GOAL_MAX) {
        sync();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

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

  const reflectionLongDailyPoints = useMemo(
    () =>
      buildDailyDashboardPoints(
        REFLECTION_HEATMAP_DAYS_BACK,
        weightEntries,
        stepsEntries,
        reflections,
      ),
    [weightEntries, stepsEntries, reflections],
  );

  const weeklyReflectionHeatmapColumns = useMemo(
    () => buildWeeklyReflectionHeatmapColumns(reflectionLongDailyPoints, 9),
    [reflectionLongDailyPoints],
  );

  const hasAnyWeight = dailyPoints.some((p) => p.weightKg != null);
  const hasAnySteps = dailyPoints.some((p) => p.steps != null);
  const hasCombined = hasAnyWeight || hasAnySteps;

  const hasAnyReflectionScore = dailyPoints.some(
    (p) => p.mealScore != null || p.stepsSelfScore != null || p.conditionScore != null,
  );

  const hasAnyWeeklyReflectionHeatmap = weeklyReflectionHeatmapColumns.some(
    (c) =>
      c.avgMealScore != null ||
      c.avgStepsSelfScore != null ||
      c.avgConditionScore != null,
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

  /** 体重は記録の範囲を拡大表示（0 起点は省略）。目標帯があるときは軸に含める。左軸の最小目盛に ～ を付与 */
  const weightAxisConfig = useMemo(() => {
    const gm = Number.parseFloat(goalMinStr);
    const gx = Number.parseFloat(goalMaxStr);
    const hasGoalBand =
      !Number.isNaN(gm) &&
      !Number.isNaN(gx) &&
      gm > 0 &&
      gx > 0 &&
      gm < gx;

    const vals = dailyPoints
      .map((p) => p.weightKg)
      .filter((v): v is number => v != null);

    let low: number;
    let high: number;

    if (vals.length === 0) {
      if (hasGoalBand) {
        low = gm;
        high = gx;
      } else {
        return {
          domain: [0, 100] as [number, number],
          ticks: undefined as number[] | undefined,
          hasGoalBand: false,
          goalMin: 0,
          goalMax: 0,
        };
      }
    } else {
      low = Math.min(...vals);
      high = Math.max(...vals);
      if (hasGoalBand) {
        low = Math.min(low, gm);
        high = Math.max(high, gx);
      }
    }

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
    return {
      domain,
      ticks: ticks.length >= 2 ? ticks : raw,
      hasGoalBand,
      goalMin: hasGoalBand ? gm : 0,
      goalMax: hasGoalBand ? gx : 0,
    };
  }, [dailyPoints, goalMinStr, goalMaxStr]);

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

  const dashboardAppointments = useMemo(
    () => selectDashboardClinicAppointments(clinicAppointments),
    [clinicAppointments],
  );

  const clinicNameById = useMemo(
    () => new Map(clinicEntries.map((c) => [c.id, c.name] as const)),
    [clinicEntries],
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-semibold text-[color:var(--hp-foreground)]">
        ホーム
      </h1>
      <p className="mt-1 text-sm text-[color:var(--hp-muted)]">
        体重（折れ線）と歩数（棒）を同じ日付軸で重ね、振り返りは日ごとのヒートマップ（〇=2、△=1、✕=0）を先に、そのあと週平均のヒートマップ（約2か月）で表示します。因果関係の証明ではなく、記録の並びを眺めるための参考です。
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

      <div className="mt-6 rounded-xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] p-4">
        <h2 className="text-sm font-medium text-[color:var(--hp-foreground)]">
          通院予定（7日以内）
        </h2>
        <p className="mt-1 text-xs text-[color:var(--hp-muted)]">
          今日から1週間以内の予定を表示します。登録・変更は通院予定画面へ。
        </p>
        {dashboardAppointments.length === 0 ? (
          <p className="mt-2 text-sm text-[color:var(--hp-muted)]">
            該当する予定はありません。
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {dashboardAppointments.map((a) => (
              <li
                key={a.id}
                className="rounded-lg border border-[color:var(--hp-border)] bg-[color:var(--hp-input)] px-3 py-2 text-sm"
              >
                <p className="font-medium tabular-nums text-[color:var(--hp-foreground)]">
                  {new Date(a.startsAt).toLocaleString("ja-JP", {
                    month: "numeric",
                    day: "numeric",
                    weekday: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <p className="mt-0.5 text-[color:var(--hp-foreground)]">
                  {clinicNameById.get(a.clinicId) ?? "（削除された通院先）"}
                </p>
                {a.title ? (
                  <p className="mt-0.5 text-xs text-[color:var(--hp-muted)]">
                    {a.title}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs">
          <Link
            href="/appointments"
            className="text-[color:var(--hp-accent)] underline"
          >
            通院予定の登録・一覧
          </Link>
        </p>
      </div>

      <section className="mt-8 space-y-10">
        <div className="rounded-xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] p-4">
          <h2 className="text-sm font-medium text-[color:var(--hp-foreground)]">
            体重と歩数（折れ線＋棒・日ごと）
          </h2>
          <p className="mt-1 text-xs text-[color:var(--hp-muted)]">
            折れ線＝体重（kg・左軸）、棒＝歩数（右軸）。歩数は 0 から。体重は
            変化が見えやすいよう記録範囲を拡大表示しており、左軸の最小目盛に ～
            が付くときは 0 からの区間が省略されています。体重画面で設定した目標帯（緑の薄い帯）があるときは同じ範囲に表示します。未記録の日は体重は線が途切れ、歩数は棒を出しません（0
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
                  {weightAxisConfig.hasGoalBand ? (
                    <ReferenceArea
                      yAxisId="w"
                      y1={weightAxisConfig.goalMin}
                      y2={weightAxisConfig.goalMax}
                      strokeOpacity={0}
                      fill="#22c55e"
                      fillOpacity={0.12}
                    />
                  ) : null}
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
            振り返り（日ごと・週平均のヒートマップ）
          </h2>
          <p className="mt-1 text-xs text-[color:var(--hp-muted)]">
            食事・歩数・体調を 〇=2、△=1、✕=0 にしたヒートマップです。先に日ごと（上の表示期間に連動）、続けて週平均（約2か月分・直近7日・14日・30日の切り替えとは別データ）を表示します。下の「週ごとのサマリー」には週平均と短い示唆文があります。
          </p>
          {!hasAnyWeeklyReflectionHeatmap && !hasAnyReflectionScore ? (
            <p className="mt-2 text-sm text-[color:var(--hp-muted)]">
              振り返りの記録がありません。
            </p>
          ) : (
            <>
              {hasAnyReflectionScore ? (
                <>
                  <h3 className="mt-2 text-xs font-medium text-[color:var(--hp-foreground)]">
                    日ごと（表示期間に連動）
                  </h3>
                  <ReflectionHeatmap points={dailyPoints} />
                </>
              ) : (
                <p className="mt-2 text-sm text-[color:var(--hp-muted)]">
                  選択した表示期間に振り返りの記録がありません。
                </p>
              )}
              {hasAnyWeeklyReflectionHeatmap ? (
                <div
                  className={
                    hasAnyReflectionScore
                      ? "mt-4 border-t border-dashed border-[color:var(--hp-border)] pt-4"
                      : "mt-2"
                  }
                >
                  <ReflectionWeeklyAvgHeatmap
                    columns={weeklyReflectionHeatmapColumns}
                  />
                </div>
              ) : (
                <p
                  className={
                    hasAnyReflectionScore
                      ? "mt-4 border-t border-dashed border-[color:var(--hp-border)] pt-4 text-xs text-[color:var(--hp-muted)]"
                      : "mt-2 text-xs text-[color:var(--hp-muted)]"
                  }
                >
                  週平均ヒートマップ用の振り返り記録がありません。
                </p>
              )}
            </>
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
            新しい週が上に来ます。その週に記録があった日だけを平均しています。記録日数が少ない週は値がブレやすいです。体重・歩数・振り返りの示唆文は自動生成です（診断や目標設定ではありません）。
          </p>
          {weeklyRows.length === 0 ? (
            <p className="mt-2 text-sm text-[color:var(--hp-muted)]">
              データがありません。
            </p>
          ) : (
            <>
              <ul className="mt-3 space-y-3 md:hidden">
                {weeklyRows.map((row, i) => {
                  const prev =
                    i < weeklyRows.length - 1 ? weeklyRows[i + 1]! : null;
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
                          <p className="mt-1.5 text-xs leading-relaxed text-[color:var(--hp-muted)]">
                            {weeklyReflectionNarrative(row, prev)}
                          </p>
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
                        自動コメント（体重・歩数・振り返り）
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-[color:var(--hp-foreground)]">
                    {weeklyRows.map((row, i) => {
                      const prev =
                        i < weeklyRows.length - 1 ? weeklyRows[i + 1]! : null;
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
                            <p className="mt-1.5 border-t border-dashed border-[color:var(--hp-border)] pt-1.5">
                              {weeklyReflectionNarrative(row, prev)}
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

