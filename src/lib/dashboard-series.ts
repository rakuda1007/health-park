import type {
  DailyReflectionEntry,
  ReflectionRating,
  StepsEntry,
  WeightEntry,
} from "@/lib/db/types";
import { todayIso } from "@/lib/date";
import { isoDateDaysAgo } from "@/lib/reflection-display";
import { aggregateStepsByDate } from "@/lib/steps-stats";
import { buildDailySeries, weekMondayKey } from "@/lib/weight-stats";

/** 〇=2, △=1, ✕=0（同一日の合計は最大6） */
export function ratingToScore(r: ReflectionRating): number {
  switch (r) {
    case "good":
      return 2;
    case "ok":
      return 1;
    case "bad":
      return 0;
    default:
      return 0;
  }
}

export type DailyDashboardPoint = {
  date: string;
  label: string;
  weightKg: number | null;
  steps: number | null;
  mealScore: number | null;
  stepsSelfScore: number | null;
  conditionScore: number | null;
  /** 食事・歩数・体調スコアの合計（0〜6）、振り返り未記録は null */
  reflectionTotal: number | null;
};

function addOneDayIso(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + 1);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function eachIsoDateInclusive(from: string, to: string): string[] {
  const out: string[] = [];
  let cur = from;
  while (cur <= to) {
    out.push(cur);
    cur = addOneDayIso(cur);
  }
  return out;
}

function formatShortDateLabel(iso: string): string {
  const parts = iso.split("-").map(Number);
  const m = parts[1];
  const d = parts[2];
  if (m == null || d == null) {
    return iso;
  }
  return `${m}/${d}`;
}

/**
 * 直近 daysBack 日分（今日を含む）の日ごとデータ。
 * 体重・歩数・振り返りは未記録の日は null（0 ではない）。
 */
export function buildDailyDashboardPoints(
  daysBack: number,
  weightEntries: WeightEntry[],
  stepsEntries: StepsEntry[],
  reflections: DailyReflectionEntry[],
): DailyDashboardPoint[] {
  const since = isoDateDaysAgo(daysBack);
  const end = todayIso();
  const days = eachIsoDateInclusive(since, end);
  const weightMap = new Map(
    buildDailySeries(weightEntries).map((p) => [p.date, p.weightKg]),
  );
  const stepsMap = aggregateStepsByDate(stepsEntries);
  const reflMap = new Map(reflections.map((r) => [r.date, r]));

  return days.map((date) => {
    const w = weightMap.get(date);
    const st = stepsMap.get(date);
    const rf = reflMap.get(date);
    const mealScore = rf ? ratingToScore(rf.mealRating) : null;
    const stepsSelf = rf ? ratingToScore(rf.stepsRating) : null;
    const cond = rf ? ratingToScore(rf.conditionRating) : null;
    const total =
      mealScore != null && stepsSelf != null && cond != null
        ? mealScore + stepsSelf + cond
        : null;
    return {
      date,
      label: formatShortDateLabel(date),
      weightKg: w ?? null,
      steps: st ? st.steps : null,
      mealScore,
      stepsSelfScore: stepsSelf,
      conditionScore: cond,
      reflectionTotal: total,
    };
  });
}

export type WeeklyDashboardRow = {
  weekStart: string;
  label: string;
  avgWeightKg: number | null;
  weightDays: number;
  avgSteps: number | null;
  stepsRecordedDays: number;
  /** 振り返り合計スコア（1日あたり0〜6）の週平均 */
  avgReflectionTotal: number | null;
  reflectionDays: number;
};

export function buildWeeklyDashboardRows(
  dailyPoints: DailyDashboardPoint[],
  maxWeeks = 8,
): WeeklyDashboardRow[] {
  const byWeek = new Map<string, DailyDashboardPoint[]>();
  for (const p of dailyPoints) {
    const wk = weekMondayKey(p.date);
    const arr = byWeek.get(wk) ?? [];
    arr.push(p);
    byWeek.set(wk, arr);
  }
  const rows: WeeklyDashboardRow[] = [...byWeek.entries()]
    .map(([weekStart, pts]) => {
      const wVals = pts.filter((p) => p.weightKg != null).map((p) => p.weightKg!);
      const sVals = pts.filter((p) => p.steps != null).map((p) => p.steps!);
      const rVals = pts
        .filter((p) => p.reflectionTotal != null)
        .map((p) => p.reflectionTotal!);
      return {
        weekStart,
        label: formatWeekLabel(weekStart),
        avgWeightKg:
          wVals.length > 0
            ? Math.round((wVals.reduce((a, b) => a + b, 0) / wVals.length) * 10) /
              10
            : null,
        weightDays: wVals.length,
        avgSteps:
          sVals.length > 0
            ? Math.round(sVals.reduce((a, b) => a + b, 0) / sVals.length)
            : null,
        stepsRecordedDays: sVals.length,
        avgReflectionTotal:
          rVals.length > 0
            ? Math.round((rVals.reduce((a, b) => a + b, 0) / rVals.length) * 10) /
              10
            : null,
        reflectionDays: rVals.length,
      };
    })
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  return rows.slice(-maxWeeks);
}

function formatWeekLabel(weekStartIso: string): string {
  const [y, mo, da] = weekStartIso.split("-").map(Number);
  const dt = new Date(y, mo - 1, da);
  return `${dt.getMonth() + 1}/${dt.getDate()}週`;
}
