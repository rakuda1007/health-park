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

/** 0〜2 のスコア分布用（週ごとの箱ひげ図） */
export type ScoreBoxStats = {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  n: number;
};

function quantileSorted(sorted: number[], p: number): number {
  if (sorted.length === 0) {
    return 0;
  }
  if (sorted.length === 1) {
    return sorted[0]!;
  }
  const pos = (sorted.length - 1) * p;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) {
    return sorted[lo]!;
  }
  return sorted[lo]! * (hi - pos) + sorted[hi]! * (pos - lo);
}

export function computeBoxStats(values: number[]): ScoreBoxStats | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  return {
    min: sorted[0]!,
    max: sorted[n - 1]!,
    q1: quantileSorted(sorted, 0.25),
    median: quantileSorted(sorted, 0.5),
    q3: quantileSorted(sorted, 0.75),
    n,
  };
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
  /** 次元別：記録があった日だけを平均 */
  avgMealScore: number | null;
  mealDays: number;
  avgStepsSelfScore: number | null;
  stepsSelfDays: number;
  avgConditionScore: number | null;
  conditionDays: number;
  mealBox: ScoreBoxStats | null;
  stepsSelfBox: ScoreBoxStats | null;
  conditionBox: ScoreBoxStats | null;
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
      const mealVals = pts
        .filter((p) => p.mealScore != null)
        .map((p) => p.mealScore!);
      const stepsSelfVals = pts
        .filter((p) => p.stepsSelfScore != null)
        .map((p) => p.stepsSelfScore!);
      const condVals = pts
        .filter((p) => p.conditionScore != null)
        .map((p) => p.conditionScore!);
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
        avgMealScore:
          mealVals.length > 0
            ? Math.round(
                (mealVals.reduce((a, b) => a + b, 0) / mealVals.length) * 10,
              ) / 10
            : null,
        mealDays: mealVals.length,
        avgStepsSelfScore:
          stepsSelfVals.length > 0
            ? Math.round(
                (stepsSelfVals.reduce((a, b) => a + b, 0) / stepsSelfVals.length) *
                  10,
              ) / 10
            : null,
        stepsSelfDays: stepsSelfVals.length,
        avgConditionScore:
          condVals.length > 0
            ? Math.round(
                (condVals.reduce((a, b) => a + b, 0) / condVals.length) * 10,
              ) / 10
            : null,
        conditionDays: condVals.length,
        mealBox: computeBoxStats(mealVals),
        stepsSelfBox: computeBoxStats(stepsSelfVals),
        conditionBox: computeBoxStats(condVals),
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

/**
 * 週次サマリー用の自動コメント（医療診断ではなく傾向の参考）。
 * prev は直前の週（より古い週）。先頭週は prev が null。
 */
export function weeklyWeightNarrative(
  row: WeeklyDashboardRow,
  prev: WeeklyDashboardRow | null,
): string {
  if (row.avgWeightKg == null) {
    return "体重の記録がありません。";
  }
  const days = row.weightDays;
  const avg = row.avgWeightKg;
  let text = `週平均は ${avg} kg（${days}日分の記録）。`;
  if (days <= 2) {
    text += " 記録日が少ないため、代表値としては参考程度です。";
  }
  if (prev?.avgWeightKg != null) {
    const diff = Math.round((row.avgWeightKg - prev.avgWeightKg) * 10) / 10;
    if (Math.abs(diff) < 0.15) {
      text += " 前週の平均とほぼ同じ水準です。";
    } else if (diff < 0) {
      text += ` 前週の平均より約 ${Math.abs(diff)} kg 低いです。`;
    } else {
      text += ` 前週の平均より約 ${diff} kg 高いです。`;
    }
  }
  return text;
}

export function weeklyStepsNarrative(
  row: WeeklyDashboardRow,
  prev: WeeklyDashboardRow | null,
): string {
  if (row.avgSteps == null) {
    return "歩数の記録がありません。";
  }
  const days = row.stepsRecordedDays;
  const avg = row.avgSteps;
  let text = `週平均は ${avg.toLocaleString("ja-JP")} 歩（${days}日分の記録）。`;
  if (days <= 2) {
    text += " 記録日が少ないため、代表値としては参考程度です。";
  }
  if (prev?.avgSteps != null && prev.avgSteps > 0) {
    const diff = row.avgSteps - prev.avgSteps;
    const pct = Math.round((diff / prev.avgSteps) * 100);
    if (Math.abs(pct) < 5) {
      text += " 前週の平均とほぼ同じ水準です。";
    } else if (diff > 0) {
      text += ` 前週の平均より約 ${Math.abs(Math.round(diff)).toLocaleString("ja-JP")} 歩多いです。`;
    } else {
      text += ` 前週の平均より約 ${Math.abs(Math.round(diff)).toLocaleString("ja-JP")} 歩少ないです。`;
    }
  }
  return text;
}

function fmtScore(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

/**
 * 振り返りスコア（食事・歩数評価・体調）の週次サマリー用。
 * 医療診断ではなく、記録上の前週比の参考。
 */
export function weeklyReflectionNarrative(
  row: WeeklyDashboardRow,
  prev: WeeklyDashboardRow | null,
): string {
  const hasAny =
    row.avgMealScore != null ||
    row.avgStepsSelfScore != null ||
    row.avgConditionScore != null;
  if (!hasAny) {
    return "振り返りの記録がありません。";
  }
  const parts: string[] = [];
  const dim = (
    label: string,
    avg: number | null,
    days: number,
    prevAvg: number | null,
  ) => {
    if (avg == null) {
      parts.push(`${label}は未記録`);
      return;
    }
    let s = `${label}の週平均は ${fmtScore(avg)}（${days}日分）`;
    if (days <= 2) {
      s += "（記録が少なく参考程度）";
    }
    if (prevAvg != null) {
      const d = Math.round((avg - prevAvg) * 10) / 10;
      if (Math.abs(d) < 0.15) {
        s += "。前週とほぼ同水準";
      } else if (d > 0) {
        s += `。前週より約 ${fmtScore(Math.abs(d))} 高め`;
      } else {
        s += `。前週より約 ${fmtScore(Math.abs(d))} 低め`;
      }
    }
    parts.push(s);
  };
  dim("食事", row.avgMealScore, row.mealDays, prev?.avgMealScore ?? null);
  dim(
    "歩数(評価)",
    row.avgStepsSelfScore,
    row.stepsSelfDays,
    prev?.avgStepsSelfScore ?? null,
  );
  dim(
    "体調",
    row.avgConditionScore,
    row.conditionDays,
    prev?.avgConditionScore ?? null,
  );
  return parts.join("。") + "。";
}
