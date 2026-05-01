"use client";

import { loadDashboardSnapshot } from "@/lib/db";
import type {
  BloodPressureEntry,
  ClinicAppointmentEntry,
  ClinicEntry,
  DailyReflectionEntry,
  StepsEntry,
  WeightEntry,
} from "@/lib/db/types";
import { selectDashboardClinicAppointments } from "@/lib/clinic-appointments-dashboard";
import {
  DASHBOARD_PREFS_CHANGED,
  readDashboardDisplayPreferences,
  type DashboardDisplayPreferences,
} from "@/lib/dashboard-preferences";
import { ReflectionHeatmap } from "@/components/reflection-heatmap";
import { ReflectionWeeklyAvgHeatmap } from "@/components/reflection-weekly-avg-heatmap";
import {
  buildBpChartRows,
  buildCombinedChartRows,
  buildDailyDashboardPoints,
  buildMonthlyReflectionHeatmapColumns,
  buildWeeklyDashboardRows,
  buildWeeklyReflectionHeatmapColumns,
  type CombinedChartGranularity,
  weeklyBloodPressureNarrative,
  weeklyDashboardCoachNarrative,
  weeklyReflectionNarrative,
  weeklyStepsNarrative,
  weeklyWeightNarrative,
  type WeightGoalBand,
} from "@/lib/dashboard-series";
import { appPath } from "@/lib/app-paths";
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
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PERIODS = [7, 14, 30] as const;

/** 週／月平均ヒートマップ用（表示期間スイッチと独立・約6か月） */
const REFLECTION_HEATMAP_DAYS_BACK = 186;

/** `weight-visualization.tsx` と同じキー（体重画面で設定した目標帯） */
const LS_WEIGHT_GOAL_MIN = "health-park-weight-goal-min";
const LS_WEIGHT_GOAL_MAX = "health-park-weight-goal-max";

function floorToStep(value: number, step: number): number {
  return Math.floor(value / step) * step;
}

function ceilToStep(value: number, step: number): number {
  return Math.ceil(value / step) * step;
}

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
  const [bloodPressureEntries, setBloodPressureEntries] = useState<
    BloodPressureEntry[]
  >([]);
  const [reflections, setReflections] = useState<DailyReflectionEntry[]>([]);
  const [clinicAppointments, setClinicAppointments] = useState<
    ClinicAppointmentEntry[]
  >([]);
  const [clinicEntries, setClinicEntries] = useState<ClinicEntry[]>([]);
  const [dashPrefs, setDashPrefs] = useState<DashboardDisplayPreferences>(() =>
    readDashboardDisplayPreferences(),
  );
  const [error, setError] = useState<string | null>(null);
  const [periodDays, setPeriodDays] = useState<(typeof PERIODS)[number]>(7);
  const [chartGranularity, setChartGranularity] =
    useState<CombinedChartGranularity>("day");
  const [reflectionHeatmapMode, setReflectionHeatmapMode] = useState<
    "day" | "week" | "month"
  >("day");
  const [goalMinStr, setGoalMinStr] = useState("");
  const [goalMaxStr, setGoalMaxStr] = useState("");

  const load = useCallback(async () => {
    try {
      setError(null);
      const snap = await loadDashboardSnapshot();
      setWeightEntries(snap.weight);
      setStepsEntries(snap.steps);
      setBloodPressureEntries(snap.bloodPressure);
      setReflections(snap.dailyReflections);
      setClinicAppointments(snap.clinicAppointments);
      setClinicEntries(snap.clinics);
    } catch (e) {
      setError(e instanceof Error ? e.message : "読み込みに失敗しました");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const syncPrefs = () => {
      setDashPrefs(readDashboardDisplayPreferences());
    };
    syncPrefs();
    window.addEventListener(DASHBOARD_PREFS_CHANGED, syncPrefs);
    window.addEventListener("focus", syncPrefs);
    return () => {
      window.removeEventListener(DASHBOARD_PREFS_CHANGED, syncPrefs);
      window.removeEventListener("focus", syncPrefs);
    };
  }, []);

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
        bloodPressureEntries,
      ),
    [periodDays, weightEntries, stepsEntries, reflections, bloodPressureEntries],
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
        bloodPressureEntries,
      ),
    [weightEntries, stepsEntries, reflections, bloodPressureEntries],
  );

  const weeklyReflectionHeatmapColumns = useMemo(
    () => buildWeeklyReflectionHeatmapColumns(reflectionLongDailyPoints, 9),
    [reflectionLongDailyPoints],
  );

  const monthlyReflectionHeatmapColumns = useMemo(
    () => buildMonthlyReflectionHeatmapColumns(reflectionLongDailyPoints, 8),
    [reflectionLongDailyPoints],
  );

  const hasAnyWeight = dailyPoints.some((p) => p.weightKg != null);
  const hasAnySteps = dailyPoints.some((p) => p.steps != null);
  const hasCombined = hasAnyWeight || hasAnySteps;

  const hasAnyDailyReflectionScore = dailyPoints.some(
    (p) =>
      p.mealScore != null ||
      p.stepsSelfScore != null ||
      p.conditionScore != null,
  );

  const hasWeeklyReflectionHeatmapData = weeklyReflectionHeatmapColumns.some(
    (c) =>
      c.avgMealScore != null ||
      c.avgStepsSelfScore != null ||
      c.avgConditionScore != null,
  );

  const hasMonthlyReflectionHeatmapData =
    monthlyReflectionHeatmapColumns.some(
      (c) =>
        c.avgMealScore != null ||
        c.avgStepsSelfScore != null ||
        c.avgConditionScore != null,
    );

  /** 棒グラフ用（未記録は 0＋透明セル。ツールチップは元の steps を参照） */
  const combinedChartData = useMemo(
    () => buildCombinedChartRows(dailyPoints, chartGranularity),
    [dailyPoints, chartGranularity],
  );

  const bpChartData = useMemo(
    () => buildBpChartRows(dailyPoints, chartGranularity),
    [dailyPoints, chartGranularity],
  );

  const hasAnyBpOnChart = bpChartData.some(
    (p) => p.systolic != null && p.diastolic != null,
  );

  const hasAnyPulseOnChart = bpChartData.some((p) => p.pulse != null);

  const bpYDomain = useMemo((): [number, number] => {
    const vals: number[] = [];
    for (const p of bpChartData) {
      if (p.systolic != null) {
        vals.push(p.systolic);
      }
      if (p.diastolic != null) {
        vals.push(p.diastolic);
      }
    }
    if (vals.length === 0) {
      return [60, 140];
    }
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const pad = Math.max(8, Math.round((hi - lo) * 0.12));
    return [Math.max(40, lo - pad), hi + pad];
  }, [bpChartData]);

  /** 脈拍のみ（右軸）。mmHg と単位・スケールが異なるため左軸とは分離する */
  const pulseYDomain = useMemo((): [number, number] => {
    const vals: number[] = [];
    for (const p of bpChartData) {
      if (p.pulse != null) {
        vals.push(p.pulse);
      }
    }
    if (vals.length === 0) {
      return [40, 120];
    }
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const pad = Math.max(5, Math.round((hi - lo) * 0.15));
    return [Math.max(30, lo - pad), Math.min(220, hi + pad)];
  }, [bpChartData]);

  const showCore = dashPrefs.showCoreBundle;
  const showBp = dashPrefs.showBloodPressure;
  const showAppt = dashPrefs.showAppointments;
  const showWeeklySection = showCore || showBp;
  const showPeriodToolbar = showCore || showBp;

  const goalBand = useMemo((): WeightGoalBand | null => {
    const gm = Number.parseFloat(goalMinStr);
    const gx = Number.parseFloat(goalMaxStr);
    if (
      !Number.isNaN(gm) &&
      !Number.isNaN(gx) &&
      gm > 0 &&
      gx > 0 &&
      gm < gx
    ) {
      return { min: gm, max: gx };
    }
    return null;
  }, [goalMinStr, goalMaxStr]);

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

    const vals = combinedChartData
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
    const step = 0.5;
    const min = Math.max(0, floorToStep(low - pad, step));
    const max = ceilToStep(high + pad, step);
    const domain: [number, number] =
      min === max ? [Math.max(0, min - step), max + step] : [min, max];
    const [d0, d1] = domain;
    const ticks: number[] = [];
    for (let t = d0; t <= d1 + step / 2; t += step) {
      ticks.push(Math.round(t * 10) / 10);
    }
    return {
      domain,
      ticks: ticks.length >= 2 ? ticks : [d0, d1],
      hasGoalBand,
      goalMin: hasGoalBand ? gm : 0,
      goalMax: hasGoalBand ? gx : 0,
    };
  }, [combinedChartData, goalMinStr, goalMaxStr]);

  const stepsAxisMax = useMemo(() => {
    const vals = combinedChartData
      .map((p) => p.steps)
      .filter((v): v is number => v != null);
    if (vals.length === 0) {
      return 8000;
    }
    const m = Math.max(...vals);
    return Math.max(Math.ceil(m * 1.05), 100);
  }, [combinedChartData]);

  const hasAnyWeightOnChart = combinedChartData.some((p) => p.weightKg != null);

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
        表示するレポートは{" "}
        <Link
          href={appPath("/settings")}
          className="text-[color:var(--hp-accent)] underline-offset-2 hover:underline"
        >
          設定
        </Link>
        から選べます。体重・歩数・振り返り、血圧、通院予定を組み合わせて表示できます。グラフは日ごと・週平均・月平均に切り替え可能です。因果関係の証明ではなく、記録の並びを眺めるための参考です。
      </p>

      {!showCore && !showBp && !showAppt ? (
        <p className="mt-4 rounded-lg border border-dashed border-[color:var(--hp-border)] bg-[color:var(--hp-input)] px-3 py-2 text-sm text-[color:var(--hp-muted)]">
          ダッシュボードの項目がすべてオフです。{" "}
          <Link
            href={appPath("/settings")}
            className="text-[color:var(--hp-accent)] underline"
          >
            設定
          </Link>
          で表示をオンにしてください。
        </p>
      ) : null}

      {showPeriodToolbar ? (
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
          <span className="ml-1 text-xs text-[color:var(--hp-muted)]">
            グラフの集計:
          </span>
          {(
            [
              { id: "day" as const, label: "日ごと" },
              { id: "week" as const, label: "週ごと" },
              { id: "month" as const, label: "月ごと" },
            ] as const
          ).map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setChartGranularity(id)}
              className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
                chartGranularity === id
                  ? "border-[color:var(--hp-accent)] bg-[color:var(--hp-accent)] text-[color:var(--hp-accent-fg)]"
                  : "border-[color:var(--hp-border)] text-[color:var(--hp-muted)] hover:border-[color:var(--hp-accent)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {error ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      {showAppt ? (
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
            href={appPath("/appointments")}
            className="text-[color:var(--hp-accent)] underline"
          >
            通院予定の登録・一覧
          </Link>
        </p>
      </div>
      ) : null}

      <section className="mt-8 space-y-10">
        {showCore ? (
          <>
        <div className="rounded-xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] p-4">
          <h2 className="text-sm font-medium text-[color:var(--hp-foreground)]">
            体重と歩数（折れ線＋棒）
            <span className="ml-1.5 font-normal text-[color:var(--hp-muted)]">
              {chartGranularity === "day"
                ? "・日ごと"
                : chartGranularity === "week"
                  ? "・週平均"
                  : "・月平均"}
            </span>
          </h2>
          <p className="mt-1 text-xs text-[color:var(--hp-muted)]">
            折れ線＝体重（kg・左軸）、棒＝歩数（右軸）。週・月を選んだときは、その期間内で記録があった日だけを平均した値です（歩数・体重とも）。歩数は
            0 から。体重は変化が見えやすいよう記録範囲を拡大表示しており、左軸の最小目盛に
            ～ が付くときは 0
            からの区間が省略されています。体重画面で設定した目標帯（緑の薄い帯）があるときは同じ範囲に表示します。日ごと表示では未記録の日は体重は線が途切れ、歩数は棒を出しません（0
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
                  margin={{ top: 8, right: 12, left: 12, bottom: 0 }}
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
                        hasWeight={hasAnyWeightOnChart}
                      />
                    )}
                    width={44}
                    label={{
                      value: "kg（0〜は省略）",
                      position: "left",
                      angle: -90,
                      dx: -4,
                      fill: "var(--hp-muted)",
                      fontSize: 10,
                    }}
                  />
                  <YAxis
                    yAxisId="s"
                    orientation="right"
                    domain={[0, stepsAxisMax]}
                    tick={{ fill: "var(--hp-muted)", fontSize: 11 }}
                    width={44}
                    tickFormatter={(v) => `${v}`}
                    label={{
                      value: "歩（0〜）",
                      position: "right",
                      angle: 90,
                      dx: 4,
                      fill: "var(--hp-muted)",
                      fontSize: 10,
                    }}
                  />
                  <Tooltip
                    content={
                      <CombinedTooltip chartGranularity={chartGranularity} />
                    }
                  />
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
            <Link href={appPath("/weight")} className="text-[color:var(--hp-accent)] underline">
              体重
            </Link>
            ・
            <Link href={appPath("/steps")} className="text-[color:var(--hp-accent)] underline">
              歩数
            </Link>
            へ。
          </p>
        </div>

        <div className="rounded-xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] p-4">
          <h2 className="text-sm font-medium text-[color:var(--hp-foreground)]">
            振り返り（ヒートマップ）
          </h2>
          <p className="mt-1 text-xs text-[color:var(--hp-muted)]">
            食事・歩数・体調を 〇=2、△=1、✕=0
            にしたヒートマップです。日ごとは上の「直近7/14/30日」に連動し、週・月は直近約6か月を別途集計します。下の「週ごとのサマリー」には週平均と短い示唆文があります。
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setReflectionHeatmapMode("day")}
              className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
                reflectionHeatmapMode === "day"
                  ? "border-[color:var(--hp-accent)] bg-[color:var(--hp-accent)] text-[color:var(--hp-accent-fg)]"
                  : "border-[color:var(--hp-border)] text-[color:var(--hp-muted)] hover:border-[color:var(--hp-accent)]"
              }`}
            >
              日ごと
            </button>
            <button
              type="button"
              onClick={() => setReflectionHeatmapMode("week")}
              className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
                reflectionHeatmapMode === "week"
                  ? "border-[color:var(--hp-accent)] bg-[color:var(--hp-accent)] text-[color:var(--hp-accent-fg)]"
                  : "border-[color:var(--hp-border)] text-[color:var(--hp-muted)] hover:border-[color:var(--hp-accent)]"
              }`}
            >
              週ごと（週平均）
            </button>
            <button
              type="button"
              onClick={() => setReflectionHeatmapMode("month")}
              className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
                reflectionHeatmapMode === "month"
                  ? "border-[color:var(--hp-accent)] bg-[color:var(--hp-accent)] text-[color:var(--hp-accent-fg)]"
                  : "border-[color:var(--hp-border)] text-[color:var(--hp-muted)] hover:border-[color:var(--hp-accent)]"
              }`}
            >
              月ごと（月平均）
            </button>
          </div>
          {reflectionHeatmapMode === "day" ? (
            !hasAnyDailyReflectionScore ? (
              <p className="mt-2 text-sm text-[color:var(--hp-muted)]">
                選択した表示期間に振り返りの記録がありません。
              </p>
            ) : (
              <>
                <h3 className="mt-3 text-xs font-medium text-[color:var(--hp-foreground)]">
                  日ごと（表示期間に連動）
                </h3>
                <ReflectionHeatmap points={dailyPoints} />
              </>
            )
          ) : reflectionHeatmapMode === "week" ? (
            !hasWeeklyReflectionHeatmapData ? (
              <p className="mt-2 text-sm text-[color:var(--hp-muted)]">
                週平均ヒートマップ用の振り返り記録がありません。
              </p>
            ) : (
              <div className="mt-3">
                <ReflectionWeeklyAvgHeatmap
                  columns={weeklyReflectionHeatmapColumns}
                  heading="週平均（約6か月・表示期間の切り替えと無関係）"
                  footer="直近約186日を週単位に集計し、最長9週を左から古い順に表示します。セルは0〜2の週平均（記録があった日のみで平均）です。"
                  periodAvgWord="週"
                />
              </div>
            )
          ) : !hasMonthlyReflectionHeatmapData ? (
            <p className="mt-2 text-sm text-[color:var(--hp-muted)]">
              月平均ヒートマップ用の振り返り記録がありません。
            </p>
          ) : (
            <div className="mt-3">
              <ReflectionWeeklyAvgHeatmap
                columns={monthlyReflectionHeatmapColumns}
                heading="月平均（約6か月・表示期間の切り替えと無関係）"
                footer="直近約186日を月単位に集計し、最長8か月を左から古い順に表示します。セルは0〜2の月平均（記録があった日のみで平均）です。"
                periodAvgWord="月"
              />
            </div>
          )}
          <p className="mt-2 text-xs text-[color:var(--hp-muted)]">
            合計スコア（1日最大6）は週次表を参照。記録は{" "}
            <Link
              href={appPath("/reflection")}
              className="text-[color:var(--hp-accent)] underline"
            >
              振り返り
            </Link>
            へ。
          </p>
        </div>
          </>
        ) : null}

        {showBp ? (
        <div className="rounded-xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] p-4">
          <h2 className="text-sm font-medium text-[color:var(--hp-foreground)]">
            血圧（折れ線）
            <span className="ml-1.5 font-normal text-[color:var(--hp-muted)]">
              {chartGranularity === "day"
                ? "・日ごと"
                : chartGranularity === "week"
                  ? "・週平均"
                  : "・月平均"}
            </span>
          </h2>
          <p className="mt-1 text-xs text-[color:var(--hp-muted)]">
            収縮期・拡張期は左軸（mmHg）、脈拍は右軸（回/分）。脈拍は記録があるときのみ表示します。週・月は血圧を記録した日のみを平均した値です。医療的な判定ではなく、記録の並びの参考としてください。
          </p>
          {!hasAnyBpOnChart ? (
            <p className="mt-2 text-sm text-[color:var(--hp-muted)]">
              この期間に血圧の記録がありません。
            </p>
          ) : (
            <div className="mt-3 h-64 w-full min-h-[16rem] min-w-0">
              <ResponsiveContainer width="100%" height="100%" minHeight={256}>
                <LineChart
                  data={bpChartData}
                  margin={{
                    top: 8,
                    right: hasAnyPulseOnChart ? 48 : 12,
                    left: 12,
                    bottom: 0,
                  }}
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
                    yAxisId="bp"
                    domain={bpYDomain}
                    tick={{ fill: "var(--hp-muted)", fontSize: 11 }}
                    width={44}
                    label={{
                      value: "mmHg",
                      position: "left",
                      angle: -90,
                      dx: -4,
                      fill: "var(--hp-muted)",
                      fontSize: 10,
                    }}
                  />
                  {hasAnyPulseOnChart ? (
                    <YAxis
                      yAxisId="pulse"
                      orientation="right"
                      domain={pulseYDomain}
                      tick={{ fill: "var(--hp-muted)", fontSize: 11 }}
                      width={44}
                      label={{
                        value: "回/分",
                        position: "right",
                        angle: 90,
                        dx: 4,
                        fill: "var(--hp-muted)",
                        fontSize: 10,
                      }}
                    />
                  ) : null}
                  <Tooltip
                    content={
                      <BpTooltip chartGranularity={chartGranularity} />
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    yAxisId="bp"
                    type="monotone"
                    dataKey="systolic"
                    name="収縮期 (mmHg)"
                    stroke="#dc2626"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    connectNulls={false}
                  />
                  <Line
                    yAxisId="bp"
                    type="monotone"
                    dataKey="diastolic"
                    name="拡張期 (mmHg)"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    connectNulls={false}
                  />
                  {hasAnyPulseOnChart ? (
                    <Line
                      yAxisId="pulse"
                      type="monotone"
                      dataKey="pulse"
                      name="脈拍 (回/分)"
                      stroke="#64748b"
                      strokeWidth={1.5}
                      strokeDasharray="4 3"
                      dot={{ r: 2 }}
                      connectNulls={false}
                    />
                  ) : null}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <p className="mt-2 text-xs text-[color:var(--hp-muted)]">
            記録の追加・修正は{" "}
            <Link
              href={appPath("/blood-pressure")}
              className="text-[color:var(--hp-accent)] underline"
            >
              血圧
            </Link>
            へ。
          </p>
        </div>
        ) : null}

        {showWeeklySection ? (
        <div className="rounded-xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] p-4">
          <h2 className="text-sm font-medium text-[color:var(--hp-foreground)]">
            週ごとのサマリー（直近8週）
          </h2>
          <p className="mt-1 text-xs text-[color:var(--hp-muted)]">
            新しい週が上に来ます。その週に記録があった日だけを平均しています。記録日数が少ない週は値がブレやすいです。
            {showCore
              ? " 体重・歩数・振り返りの事実ベースの文に続き、目標帯や食事・運動の観点からの短いコメントが付きます。"
              : ""}
            {showBp
              ? " 血圧は週平均と前週との差の事実文、および生活面の補足コメントを含みます。"
              : ""}
            （いずれも自動生成・診断や目標設定ではありません。）
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
                        {showCore ? (
                          <>
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
                          </>
                        ) : null}
                        {showBp ? (
                          <div>
                            <dt className="text-xs text-[color:var(--hp-muted)]">
                              血圧（週平均）
                            </dt>
                            <dd className="mt-0.5 tabular-nums text-[color:var(--hp-foreground)]">
                              {row.avgSystolic != null &&
                              row.avgDiastolic != null
                                ? `${row.avgSystolic} / ${row.avgDiastolic} mmHg`
                                : "—"}
                              <span className="text-xs text-[color:var(--hp-muted)]">
                                {" "}
                                （記録 {row.bpRecordedDays} 日）
                              </span>
                            </dd>
                            <p className="mt-1.5 text-xs leading-relaxed text-[color:var(--hp-muted)]">
                              {weeklyBloodPressureNarrative(row, prev)}
                            </p>
                          </div>
                        ) : null}
                      </dl>
                      <p className="mt-3 border-t border-[color:var(--hp-border)] pt-3 text-xs leading-relaxed text-[color:var(--hp-foreground)]">
                        {weeklyDashboardCoachNarrative(row, prev, goalBand, {
                          includeBloodPressure: showBp,
                        })}
                      </p>
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
                      {showCore ? (
                        <>
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
                        </>
                      ) : null}
                      {showBp ? (
                        <>
                          <th className="w-[4.25rem] px-1 py-2 text-right font-medium text-[color:var(--hp-muted)]">
                            血圧
                          </th>
                          <th className="w-[2.5rem] px-1 py-2 text-center font-medium text-[color:var(--hp-muted)]">
                            日
                          </th>
                        </>
                      ) : null}
                      <th className="min-w-0 px-2 py-2 font-medium text-[color:var(--hp-muted)]">
                        自動コメント（事実＋ひとこと）
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
                          {showCore ? (
                            <>
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
                            </>
                          ) : null}
                          {showBp ? (
                            <>
                              <td className="px-1 py-2 text-right tabular-nums">
                                {row.avgSystolic != null &&
                                row.avgDiastolic != null
                                  ? `${row.avgSystolic}/${row.avgDiastolic}`
                                  : "—"}
                              </td>
                              <td className="px-1 py-2 text-center tabular-nums">
                                {row.bpRecordedDays}
                              </td>
                            </>
                          ) : null}
                          <td className="min-w-0 whitespace-normal break-words px-2 py-2 text-[11px] leading-snug text-[color:var(--hp-muted)] lg:text-xs">
                            {showCore ? (
                              <>
                                <p>{weeklyWeightNarrative(row, prev)}</p>
                                <p className="mt-1.5 border-t border-dashed border-[color:var(--hp-border)] pt-1.5">
                                  {weeklyStepsNarrative(row, prev)}
                                </p>
                                <p className="mt-1.5 border-t border-dashed border-[color:var(--hp-border)] pt-1.5">
                                  {weeklyReflectionNarrative(row, prev)}
                                </p>
                              </>
                            ) : null}
                            {showBp ? (
                              <p
                                className={
                                  showCore
                                    ? "mt-1.5 border-t border-dashed border-[color:var(--hp-border)] pt-1.5"
                                    : undefined
                                }
                              >
                                {weeklyBloodPressureNarrative(row, prev)}
                              </p>
                            ) : null}
                            <p className="mt-1.5 border-t border-[color:var(--hp-border)] pt-1.5 text-[color:var(--hp-foreground)]">
                              {weeklyDashboardCoachNarrative(row, prev, goalBand, {
                                includeBloodPressure: showBp,
                              })}
                            </p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <p className="mt-2 text-[11px] text-[color:var(--hp-muted)]">
                  列見出し：
                  {showCore
                    ? "体重・歩数・振返は週平均、隣の「日」は記録があった日数です。"
                    : ""}
                  {showCore && showBp ? " " : ""}
                  {showBp
                    ? "血圧は週平均の収縮期/拡張期、隣の「日」は血圧を記録した日数です。"
                    : ""}
                </p>
              </div>
            </>
          )}
        </div>
        ) : null}
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
  chartGranularity,
}: {
  active?: boolean;
  payload?: Array<{ payload: Record<string, unknown>; dataKey?: string }>;
  chartGranularity: CombinedChartGranularity;
}) {
  if (!active || !payload?.length) {
    return null;
  }
  const row = payload[0]?.payload as {
    date: string;
    label: string;
    weightKg: number | null;
    steps: number | null;
    weightSampleDays: number;
    stepsSampleDays: number;
  };
  const agg = chartGranularity !== "day";
  const wSuffix =
    agg && row.weightKg != null && row.weightSampleDays > 0
      ? `（${row.weightSampleDays}日分の平均）`
      : "";
  const sSuffix =
    agg && row.steps != null && row.stepsSampleDays > 0
      ? `（${row.stepsSampleDays}日分の平均）`
      : "";
  return (
    <div className="rounded-md border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] px-2 py-1.5 text-xs shadow">
      <div className="tabular-nums text-[color:var(--hp-muted)]">
        {row.label}
        {agg ? (
          <span className="text-[color:var(--hp-muted)]"> ({row.date}〜)</span>
        ) : null}
      </div>
      <div className="mt-1 text-[color:var(--hp-foreground)]">
        体重:{" "}
        {row.weightKg != null ? `${row.weightKg} kg${wSuffix}` : "—"}
      </div>
      <div className="text-[color:var(--hp-foreground)]">
        歩数:{" "}
        {row.steps != null
          ? `${row.steps.toLocaleString("ja-JP")} 歩${sSuffix}`
          : "—"}
      </div>
    </div>
  );
}

function BpTooltip({
  active,
  payload,
  chartGranularity,
}: {
  active?: boolean;
  payload?: Array<{ payload: Record<string, unknown>; dataKey?: string }>;
  chartGranularity: CombinedChartGranularity;
}) {
  if (!active || !payload?.length) {
    return null;
  }
  const row = payload[0]?.payload as {
    date: string;
    label: string;
    systolic: number | null;
    diastolic: number | null;
    pulse: number | null;
    bpSampleDays: number;
  };
  const agg = chartGranularity !== "day";
  const bpSuffix =
    agg &&
    row.systolic != null &&
    row.diastolic != null &&
    row.bpSampleDays > 0
      ? `（${row.bpSampleDays}日分の平均）`
      : "";
  const pulseSuffix =
    agg && row.pulse != null && row.bpSampleDays > 0
      ? `（${row.bpSampleDays}日分の平均）`
      : "";
  return (
    <div className="rounded-md border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] px-2 py-1.5 text-xs shadow">
      <div className="tabular-nums text-[color:var(--hp-muted)]">
        {row.label}
        {agg ? (
          <span className="text-[color:var(--hp-muted)]"> ({row.date}〜)</span>
        ) : null}
      </div>
      <div className="mt-1 text-[color:var(--hp-foreground)]">
        収縮期/拡張期:{" "}
        {row.systolic != null && row.diastolic != null
          ? `${row.systolic} / ${row.diastolic} mmHg${bpSuffix}`
          : "—"}
      </div>
      <div className="text-[color:var(--hp-foreground)]">
        脈拍:{" "}
        {row.pulse != null
          ? `${row.pulse} 回/分${pulseSuffix}`
          : "—"}
      </div>
    </div>
  );
}

