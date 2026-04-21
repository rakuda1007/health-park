"use client";

import type { WeightEntry } from "@/lib/db/types";
import {
  addMovingAverage7,
  buildCalendarMonth,
  buildDailySeries,
  buildSummary,
  buildWeeklyBars,
  heatmapColor,
} from "@/lib/weight-stats";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const LS_GOAL_MIN = "health-park-weight-goal-min";
const LS_GOAL_MAX = "health-park-weight-goal-max";

type Props = {
  entries: WeightEntry[];
};

function useDarkMode(): boolean {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setDark(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return dark;
}

export function WeightVisualization({ entries }: Props) {
  const dark = useDarkMode();
  const daily = useMemo(() => buildDailySeries(entries), [entries]);
  const chartData = useMemo(() => addMovingAverage7(daily), [daily]);
  const summary = useMemo(() => buildSummary(daily), [daily]);
  const weekly = useMemo(() => buildWeeklyBars(daily, 8), [daily]);
  const dailyMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of daily) {
      m.set(p.date, p.weightKg);
    }
    return m;
  }, [daily]);

  const now = useMemo(() => new Date(), []);
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());

  const [goalMinStr, setGoalMinStr] = useState("");
  const [goalMaxStr, setGoalMaxStr] = useState("");

  useEffect(() => {
    setGoalMinStr(
      typeof window !== "undefined" ? localStorage.getItem(LS_GOAL_MIN) ?? "" : "",
    );
    setGoalMaxStr(
      typeof window !== "undefined" ? localStorage.getItem(LS_GOAL_MAX) ?? "" : "",
    );
  }, []);

  const persistGoal = useCallback((minS: string, maxS: string) => {
    if (typeof window === "undefined") {
      return;
    }
    if (minS.trim()) {
      localStorage.setItem(LS_GOAL_MIN, minS.trim());
    } else {
      localStorage.removeItem(LS_GOAL_MIN);
    }
    if (maxS.trim()) {
      localStorage.setItem(LS_GOAL_MAX, maxS.trim());
    } else {
      localStorage.removeItem(LS_GOAL_MAX);
    }
  }, []);

  const goalMin = Number.parseFloat(goalMinStr);
  const goalMax = Number.parseFloat(goalMaxStr);
  const hasGoalBand =
    !Number.isNaN(goalMin) &&
    !Number.isNaN(goalMax) &&
    goalMin > 0 &&
    goalMax > 0 &&
    goalMin < goalMax;

  /** データと目標帯の両方が見えるよう Y 軸範囲を決める（目標だけが枠外に出ないようにする） */
  const lineChartYDomain = useMemo((): [number, number] | ["auto", "auto"] => {
    const vals: number[] = [];
    for (const row of chartData) {
      vals.push(row.weightKg);
      if (row.ma7 != null) {
        vals.push(row.ma7);
      }
    }
    if (vals.length === 0) {
      return ["auto", "auto"];
    }
    let low = Math.min(...vals);
    let high = Math.max(...vals);
    if (hasGoalBand) {
      low = Math.min(low, goalMin);
      high = Math.max(high, goalMax);
    }
    const span = Math.max(high - low, 0.1);
    const pad = Math.max(span * 0.06, 0.3);
    return [
      Math.round((low - pad) * 10) / 10,
      Math.round((high + pad) * 10) / 10,
    ];
  }, [chartData, hasGoalBand, goalMin, goalMax]);

  const weeklyChartYDomain = useMemo((): [number, number] | ["auto", "auto"] => {
    if (weekly.length === 0) {
      return ["auto", "auto"];
    }
    const vals = weekly.map((w) => w.avgKg);
    let low = Math.min(...vals);
    let high = Math.max(...vals);
    if (hasGoalBand) {
      low = Math.min(low, goalMin);
      high = Math.max(high, goalMax);
    }
    const span = Math.max(high - low, 0.1);
    const pad = Math.max(span * 0.06, 0.3);
    return [
      Math.round((low - pad) * 10) / 10,
      Math.round((high + pad) * 10) / 10,
    ];
  }, [weekly, hasGoalBand, goalMin, goalMax]);

  const calendarCells = useMemo(
    () => buildCalendarMonth(calYear, calMonth, dailyMap),
    [calYear, calMonth, dailyMap],
  );

  const monthWeights = calendarCells
    .filter((c) => c.inMonth && c.weightKg != null)
    .map((c) => c.weightKg!);
  const monthMin =
    monthWeights.length > 0 ? Math.min(...monthWeights) : daily[0]?.weightKg ?? 0;
  const monthMax =
    monthWeights.length > 0 ? Math.max(...monthWeights) : daily[0]?.weightKg ?? 1;

  const axisColor = dark ? "#94a3b8" : "#64748b";
  const gridColor = dark ? "#334155" : "#e2e8f0";

  if (entries.length === 0) {
    return null;
  }

  return (
    <section
      className="mt-10 space-y-8"
      aria-labelledby="weight-viz-heading"
    >
      <h2
        id="weight-viz-heading"
        className="text-sm font-medium text-[color:var(--hp-muted)]"
      >
        推移・可視化（体重のみ）
      </h2>

      {summary.latestKg != null ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] p-3 text-sm">
            <p className="text-[color:var(--hp-muted)]">最新</p>
            <p className="mt-1 text-lg font-medium text-[color:var(--hp-foreground)]">
              {summary.latestKg} kg
            </p>
            <p className="text-xs text-[color:var(--hp-muted)]">
              {summary.latestDate}
            </p>
          </div>
          {summary.deltaFromPrev != null ? (
            <div className="rounded-xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] p-3 text-sm">
              <p className="text-[color:var(--hp-muted)]">前の記録日から</p>
              <p
                className={`mt-1 text-lg font-medium ${
                  summary.deltaFromPrev < 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : summary.deltaFromPrev > 0
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-[color:var(--hp-foreground)]"
                }`}
              >
                {summary.deltaFromPrev > 0 ? "+" : ""}
                {summary.deltaFromPrev} kg
              </p>
              {summary.prevDate ? (
                <p className="text-xs text-[color:var(--hp-muted)]">
                  比較: {summary.prevDate}
                </p>
              ) : null}
            </div>
          ) : null}
          {summary.avgLast7Days != null ? (
            <div className="rounded-xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] p-3 text-sm">
              <p className="text-[color:var(--hp-muted)]">直近7日分の平均</p>
              <p className="mt-1 text-lg font-medium text-[color:var(--hp-foreground)]">
                {summary.avgLast7Days} kg
              </p>
              <p className="text-xs text-[color:var(--hp-muted)]">
                記録がある日のみ
              </p>
            </div>
          ) : null}
          {summary.delta7dAvgs != null ? (
            <div className="rounded-xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] p-3 text-sm">
              <p className="text-[color:var(--hp-muted)]">7日平均の前週比</p>
              <p className="mt-1 text-lg font-medium text-[color:var(--hp-foreground)]">
                {summary.delta7dAvgs > 0 ? "+" : ""}
                {summary.delta7dAvgs} kg
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] p-4">
        <p className="text-xs text-[color:var(--hp-muted)]">
          目標帯（任意・ブラウザにのみ保存）
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-[color:var(--hp-muted)]">下限 kg</span>
            <input
              type="number"
              step="0.1"
              value={goalMinStr}
              onChange={(e) => {
                setGoalMinStr(e.target.value);
              }}
              onBlur={() => persistGoal(goalMinStr, goalMaxStr)}
              className="w-24 rounded border border-[color:var(--hp-border)] bg-[color:var(--hp-input)] px-2 py-1 text-[color:var(--hp-foreground)]"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-[color:var(--hp-muted)]">上限 kg</span>
            <input
              type="number"
              step="0.1"
              value={goalMaxStr}
              onChange={(e) => {
                setGoalMaxStr(e.target.value);
              }}
              onBlur={() => persistGoal(goalMinStr, goalMaxStr)}
              className="w-24 rounded border border-[color:var(--hp-border)] bg-[color:var(--hp-input)] px-2 py-1 text-[color:var(--hp-foreground)]"
            />
          </label>
        </div>
      </div>

      {chartData.length > 0 ? (
        <div className="rounded-xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] p-4">
          <p className="mb-2 text-sm font-medium text-[color:var(--hp-foreground)]">
            日次体重と7点移動平均
          </p>
          <div className="h-72 w-full min-h-[18rem] min-w-0">
            <ResponsiveContainer width="100%" height="100%" minHeight={288}>
              <LineChart
                data={chartData}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: axisColor, fontSize: 11 }}
                  tickFormatter={(v: string) => v.slice(5).replace("-", "/")}
                />
                <YAxis
                  domain={lineChartYDomain}
                  tick={{ fill: axisColor, fontSize: 11 }}
                  width={40}
                  label={{
                    value: "kg",
                    angle: -90,
                    position: "insideLeft",
                    fill: axisColor,
                    fontSize: 11,
                  }}
                />
                <Tooltip
                  contentStyle={{
                    background: dark ? "#0f172a" : "#fff",
                    border: `1px solid ${gridColor}`,
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelFormatter={(l) => String(l)}
                />
                <Legend />
                {hasGoalBand ? (
                  <ReferenceArea
                    y1={goalMin}
                    y2={goalMax}
                    strokeOpacity={0}
                    fill="#22c55e"
                    fillOpacity={0.12}
                  />
                ) : null}
                <Line
                  type="monotone"
                  dataKey="weightKg"
                  name="体重"
                  stroke="#0f766e"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="ma7"
                  name="7点移動平均"
                  stroke="#c4a574"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      {weekly.length > 0 ? (
        <div className="rounded-xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] p-4">
          <p className="mb-2 text-sm font-medium text-[color:var(--hp-foreground)]">
            週次の平均体重（直近8週・月曜始まり）
          </p>
          <div className="h-56 w-full min-h-[14rem] min-w-0">
            <ResponsiveContainer width="100%" height="100%" minHeight={224}>
              <BarChart
                data={weekly}
                margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: axisColor, fontSize: 11 }}
                />
                <YAxis
                  domain={weeklyChartYDomain}
                  tick={{ fill: axisColor, fontSize: 11 }}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    background: dark ? "#0f172a" : "#fff",
                    border: `1px solid ${gridColor}`,
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value) => [
                    `${typeof value === "number" ? value : Number(value)} kg`,
                    "週平均",
                  ]}
                />
                {hasGoalBand ? (
                  <ReferenceArea
                    y1={goalMin}
                    y2={goalMax}
                    strokeOpacity={0}
                    fill="#22c55e"
                    fillOpacity={0.12}
                  />
                ) : null}
                <Bar
                  dataKey="avgKg"
                  name="週平均"
                  fill="#475569"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-[color:var(--hp-border)] bg-[color:var(--hp-card)] p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-[color:var(--hp-foreground)]">
            カレンダー（記録日の色＝その月内の重さの相対）
          </p>
          <div className="flex items-center gap-2 text-sm">
            <button
              type="button"
              className="rounded border border-[color:var(--hp-border)] px-2 py-1 text-[color:var(--hp-muted)]"
              onClick={() => {
                if (calMonth === 0) {
                  setCalYear((y) => y - 1);
                  setCalMonth(11);
                } else {
                  setCalMonth((m) => m - 1);
                }
              }}
            >
              前月
            </button>
            <span className="text-[color:var(--hp-foreground)]">
              {calYear}年 {calMonth + 1}月
            </span>
            <button
              type="button"
              className="rounded border border-[color:var(--hp-border)] px-2 py-1 text-[color:var(--hp-muted)]"
              onClick={() => {
                if (calMonth === 11) {
                  setCalYear((y) => y + 1);
                  setCalMonth(0);
                } else {
                  setCalMonth((m) => m + 1);
                }
              }}
            >
              翌月
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-[color:var(--hp-muted)] sm:text-xs">
          {["月", "火", "水", "木", "金", "土", "日"].map((d) => (
            <div key={d} className="py-1 font-medium">
              {d}
            </div>
          ))}
          {calendarCells.map((c) => (
            <div
              key={c.date}
              title={c.weightKg != null ? `${c.date} ${c.weightKg} kg` : c.date}
              className={`flex min-h-[2.25rem] flex-col justify-center rounded border border-transparent text-[10px] sm:text-xs ${
                c.inMonth ? "" : "opacity-30"
              }`}
              style={{
                backgroundColor: heatmapColor(
                  c.weightKg,
                  monthMin,
                  Math.max(monthMax, monthMin + 0.01),
                  dark,
                ),
              }}
            >
              <span className="font-medium text-[color:var(--hp-foreground)]">
                {c.dayNum}
              </span>
              {c.weightKg != null ? (
                <span className="text-[color:var(--hp-foreground)]">
                  {c.weightKg}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
