import type {
  BloodPressureEntry,
  DailyReflectionEntry,
  StepsEntry,
  WeightEntry,
} from "@/lib/db/types";
import { todayIso } from "@/lib/date";
import { isoDateDaysAgo } from "@/lib/reflection-display";
import { aggregateStepsByDate } from "@/lib/steps-stats";
import {
  addMovingAverage7,
  buildDailySeries,
  weekMondayKey,
  type ChartPoint,
} from "@/lib/weight-stats";

/** ダッシュボード各グラフの表示期間プリセット（数値は今日を含む直近 n 日）。`all` は記録の最古日〜今日。`custom` は日付範囲指定。 */
export type DashboardChartPeriodOption = 7 | 14 | 30 | "all" | "custom";

/** カスタム表示期間（YYYY-MM-DD、開始・終了とも含む）。 */
export type DashboardCustomDateRange = {
  since: string;
  until: string;
};

/** `buildDailyDashboardPoints` 向け。プリセットに加え、正の整数なら任意の「直近 n 日」、オブジェクトなら任意の日付範囲。 */
export type DashboardDaysBackInput =
  | DashboardChartPeriodOption
  | number
  | DashboardCustomDateRange;

export function isDashboardCustomDateRange(
  value: DashboardDaysBackInput,
): value is DashboardCustomDateRange {
  return (
    typeof value === "object" &&
    value !== null &&
    "since" in value &&
    "until" in value
  );
}

/** カスタム期間の初期値（今日を含む直近 n 日）。 */
export function createDefaultCustomDateRange(
  days = 14,
): DashboardCustomDateRange {
  return { since: isoDateDaysAgo(days), until: todayIso() };
}

/** 開始・終了の順序を整え、終了日は今日を超えないようにする。 */
export function normalizeCustomDateRange(
  range: DashboardCustomDateRange,
): DashboardCustomDateRange {
  const today = todayIso();
  const until = range.until > today ? today : range.until;
  const since = range.since;
  if (since <= until) {
    return { since, until };
  }
  return { since: until, until: since };
}

/** UI の期間選択を `buildDailyDashboardPoints` 用の入力に変換する。 */
export function resolveDashboardDaysBack(
  period: DashboardChartPeriodOption,
  customRange: DashboardCustomDateRange,
): DashboardDaysBackInput {
  if (period === "custom") {
    return normalizeCustomDateRange(customRange);
  }
  return period;
}

function minIsoDate(a: string, b: string): string {
  return a < b ? a : b;
}

/** いずれかの記録に存在する最も古い日付。記録が無いときは null。 */
export function earliestDashboardDataIsoDate(
  weightEntries: WeightEntry[],
  stepsEntries: StepsEntry[],
  reflections: DailyReflectionEntry[],
  bloodPressureEntries: BloodPressureEntry[],
): string | null {
  let min: string | null = null;
  const touch = (iso: string) => {
    min = min ? minIsoDate(min, iso) : iso;
  };
  for (const e of weightEntries) {
    touch(e.date);
  }
  for (const e of stepsEntries) {
    touch(e.date);
  }
  for (const r of reflections) {
    touch(r.date);
  }
  for (const e of bloodPressureEntries) {
    touch(e.date);
  }
  return min;
}

export type DailyDashboardPoint = {
  date: string;
  label: string;
  weightKg: number | null;
  steps: number | null;
  /** 振り返りコメント（未記録は null） */
  reflectionComment: string | null;
  /** 同日複数件は平均。未記録は null */
  systolic: number | null;
  diastolic: number | null;
  pulse: number | null;
};

/** 体重・歩数の複合グラフ用（日次・週次・月次のいずれか） */
export type CombinedChartGranularity = "day" | "week" | "month";

export type CombinedChartRow = {
  date: string;
  label: string;
  weightKg: number | null;
  steps: number | null;
  /** 棒グラフ用（未記録は 0＋透明セル） */
  stepsBar: number;
  stepsRecorded: boolean;
  /** 集計バケット内で体重があった日数（日次は 0 または 1） */
  weightSampleDays: number;
  /** 集計バケット内で歩数があった日数 */
  stepsSampleDays: number;
};

function mean(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function monthKeyFromIso(iso: string): string {
  return iso.slice(0, 7);
}

function firstDayOfMonthYm(ym: string): string {
  return `${ym}-01`;
}

function formatMonthLabelJa(ym: string): string {
  const [y, mo] = ym.split("-").map(Number);
  if (!y || !mo) {
    return ym;
  }
  return `${y}年${mo}月`;
}

/**
 * 日次ポイントから複合チャート用の系列を生成する。
 */
export function buildCombinedChartRows(
  dailyPoints: DailyDashboardPoint[],
  granularity: CombinedChartGranularity,
): CombinedChartRow[] {
  if (granularity === "day") {
    return dailyPoints.map((p) => ({
      date: p.date,
      label: p.label,
      weightKg: p.weightKg,
      steps: p.steps,
      stepsBar: p.steps != null ? p.steps : 0,
      stepsRecorded: p.steps != null,
      weightSampleDays: p.weightKg != null ? 1 : 0,
      stepsSampleDays: p.steps != null ? 1 : 0,
    }));
  }

  if (granularity === "week") {
    const byWeek = new Map<string, DailyDashboardPoint[]>();
    for (const p of dailyPoints) {
      const wk = weekMondayKey(p.date);
      const arr = byWeek.get(wk) ?? [];
      arr.push(p);
      byWeek.set(wk, arr);
    }
    return [...byWeek.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([weekStart, pts]) => {
        const wVals = pts
          .filter((p) => p.weightKg != null)
          .map((p) => p.weightKg!);
        const sVals = pts.filter((p) => p.steps != null).map((p) => p.steps!);
        const wAvg =
          wVals.length > 0
            ? Math.round(mean(wVals) * 10) / 10
            : null;
        const sAvg =
          sVals.length > 0 ? Math.round(mean(sVals)) : null;
        return {
          date: weekStart,
          label: formatWeekLabel(weekStart),
          weightKg: wAvg,
          steps: sAvg,
          stepsBar: sAvg != null ? sAvg : 0,
          stepsRecorded: sVals.length > 0,
          weightSampleDays: wVals.length,
          stepsSampleDays: sVals.length,
        };
      });
  }

  const byMonth = new Map<string, DailyDashboardPoint[]>();
  for (const p of dailyPoints) {
    const mk = monthKeyFromIso(p.date);
    const arr = byMonth.get(mk) ?? [];
    arr.push(p);
    byMonth.set(mk, arr);
  }
  return [...byMonth.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([ym, pts]) => {
      const wVals = pts
        .filter((p) => p.weightKg != null)
        .map((p) => p.weightKg!);
      const sVals = pts.filter((p) => p.steps != null).map((p) => p.steps!);
      const wAvg =
        wVals.length > 0 ? Math.round(mean(wVals) * 10) / 10 : null;
      const sAvg =
        sVals.length > 0 ? Math.round(mean(sVals)) : null;
      const d0 = firstDayOfMonthYm(ym);
      return {
        date: d0,
        label: formatMonthLabelJa(ym),
        weightKg: wAvg,
        steps: sAvg,
        stepsBar: sAvg != null ? sAvg : 0,
        stepsRecorded: sVals.length > 0,
        weightSampleDays: wVals.length,
        stepsSampleDays: sVals.length,
      };
    });
}

/** 血圧グラフ用（収縮期・拡張期・脈拍） */
export type BpChartRow = {
  date: string;
  label: string;
  systolic: number | null;
  diastolic: number | null;
  pulse: number | null;
  /** 集計バケット内で血圧があった日数 */
  bpSampleDays: number;
};

/**
 * 日次ポイントから血圧チャート用の系列を生成する。
 */
export function buildBpChartRows(
  dailyPoints: DailyDashboardPoint[],
  granularity: CombinedChartGranularity,
): BpChartRow[] {
  if (granularity === "day") {
    return dailyPoints.map((p) => ({
      date: p.date,
      label: p.label,
      systolic: p.systolic,
      diastolic: p.diastolic,
      pulse: p.pulse,
      bpSampleDays: p.systolic != null ? 1 : 0,
    }));
  }

  if (granularity === "week") {
    const byWeek = new Map<string, DailyDashboardPoint[]>();
    for (const p of dailyPoints) {
      const wk = weekMondayKey(p.date);
      const arr = byWeek.get(wk) ?? [];
      arr.push(p);
      byWeek.set(wk, arr);
    }
    return [...byWeek.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([weekStart, pts]) => {
        const bpPts = pts.filter((p) => p.systolic != null && p.diastolic != null);
        const sysVals = bpPts.map((p) => p.systolic!);
        const diaVals = bpPts.map((p) => p.diastolic!);
        const pulVals = pts
          .filter((p) => p.pulse != null)
          .map((p) => p.pulse!);
        const sysAvg =
          sysVals.length > 0 ? Math.round(mean(sysVals)) : null;
        const diaAvg =
          diaVals.length > 0 ? Math.round(mean(diaVals)) : null;
        const pulAvg =
          pulVals.length > 0 ? Math.round(mean(pulVals)) : null;
        return {
          date: weekStart,
          label: formatWeekLabel(weekStart),
          systolic: sysAvg,
          diastolic: diaAvg,
          pulse: pulAvg,
          bpSampleDays: bpPts.length,
        };
      });
  }

  const byMonth = new Map<string, DailyDashboardPoint[]>();
  for (const p of dailyPoints) {
    const mk = monthKeyFromIso(p.date);
    const arr = byMonth.get(mk) ?? [];
    arr.push(p);
    byMonth.set(mk, arr);
  }
  return [...byMonth.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([ym, pts]) => {
      const bpPts = pts.filter((p) => p.systolic != null && p.diastolic != null);
      const sysVals = bpPts.map((p) => p.systolic!);
      const diaVals = bpPts.map((p) => p.diastolic!);
      const pulVals = pts
        .filter((p) => p.pulse != null)
        .map((p) => p.pulse!);
      const sysAvg =
        sysVals.length > 0 ? Math.round(mean(sysVals)) : null;
      const diaAvg =
        diaVals.length > 0 ? Math.round(mean(diaVals)) : null;
      const pulAvg =
        pulVals.length > 0 ? Math.round(mean(pulVals)) : null;
      return {
        date: firstDayOfMonthYm(ym),
        label: formatMonthLabelJa(ym),
        systolic: sysAvg,
        diastolic: diaAvg,
        pulse: pulAvg,
        bpSampleDays: bpPts.length,
      };
    });
}

function aggregateBloodPressureByDate(
  entries: BloodPressureEntry[],
): Map<string, { systolic: number; diastolic: number; pulse: number | null }> {
  const byDate = new Map<string, BloodPressureEntry[]>();
  for (const e of entries) {
    const arr = byDate.get(e.date) ?? [];
    arr.push(e);
    byDate.set(e.date, arr);
  }
  const out = new Map<
    string,
    { systolic: number; diastolic: number; pulse: number | null }
  >();
  for (const [date, list] of byDate) {
    const n = list.length;
    const systolic = Math.round(
      list.reduce((a, b) => a + b.systolic, 0) / n,
    );
    const diastolic = Math.round(
      list.reduce((a, b) => a + b.diastolic, 0) / n,
    );
    const pulses = list
      .map((x) => x.pulse)
      .filter((x): x is number => x != null && x > 0);
    const pulse =
      pulses.length > 0
        ? Math.round(pulses.reduce((a, b) => a + b, 0) / pulses.length)
        : null;
    out.set(date, { systolic, diastolic, pulse });
  }
  return out;
}

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

function dashboardDateBounds(
  daysBack: DashboardDaysBackInput,
  weightEntries: WeightEntry[],
  stepsEntries: StepsEntry[],
  reflections: DailyReflectionEntry[],
  bloodPressureEntries: BloodPressureEntry[],
): { since: string; end: string } {
  if (isDashboardCustomDateRange(daysBack)) {
    const { since, until } = normalizeCustomDateRange(daysBack);
    const end = until;
    return { since: since <= end ? since : end, end };
  }
  const end = todayIso();
  if (daysBack === "all") {
    const since =
      earliestDashboardDataIsoDate(
        weightEntries,
        stepsEntries,
        reflections,
        bloodPressureEntries,
      ) ?? end;
    return { since: since <= end ? since : end, end };
  }
  if (daysBack === "custom") {
    return { since: end, end };
  }
  const since = isoDateDaysAgo(daysBack);
  return { since: since <= end ? since : end, end };
}

/**
 * 表示期間に応じた日ごとデータ（今日を含む）。
 * 体重・歩数・振り返り・血圧は未記録の日は null（0 ではない）。
 * `daysBack === "all"` のときは各記録の最古日から今日まで（記録が無いときは今日のみ）。
 * 正の整数のときは「直近 n 日」（既存のヒートマップ用186日など）。
 * `{ since, until }` のときはその範囲（終了日は今日を超えない）。
 */
export function buildDailyDashboardPoints(
  daysBack: DashboardDaysBackInput,
  weightEntries: WeightEntry[],
  stepsEntries: StepsEntry[],
  reflections: DailyReflectionEntry[],
  bloodPressureEntries: BloodPressureEntry[] = [],
): DailyDashboardPoint[] {
  const { since: safeSince, end } = dashboardDateBounds(
    daysBack,
    weightEntries,
    stepsEntries,
    reflections,
    bloodPressureEntries,
  );
  const days = eachIsoDateInclusive(safeSince, end);
  const weightMap = new Map(
    buildDailySeries(weightEntries).map((p) => [p.date, p.weightKg]),
  );
  const stepsMap = aggregateStepsByDate(stepsEntries);
  const reflMap = new Map(reflections.map((r) => [r.date, r]));
  const bpMap = aggregateBloodPressureByDate(bloodPressureEntries);

  return days.map((date) => {
    const w = weightMap.get(date);
    const st = stepsMap.get(date);
    const rf = reflMap.get(date);
    const bp = bpMap.get(date);
    const reflectionComment = (() => {
      if (!rf) {
        return null;
      }
      const text = typeof rf.comment === "string" ? rf.comment.trim() : "";
      return text.length > 0 ? text : null;
    })();
    return {
      date,
      label: formatShortDateLabel(date),
      weightKg: w ?? null,
      steps: st ? st.steps : null,
      reflectionComment,
      systolic: bp?.systolic ?? null,
      diastolic: bp?.diastolic ?? null,
      pulse: bp?.pulse ?? null,
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
  /** 週平均（記録があった日のみ）。脈拍は記録がある日のみ平均 */
  avgSystolic: number | null;
  avgDiastolic: number | null;
  avgPulse: number | null;
  bpRecordedDays: number;
  /** その週に記録された振り返りコメント（日付順） */
  reflectionComments: string[];
};

export type DashboardWeightChartPoint = ChartPoint & { label: string };

/** ダッシュボード体重グラフ用（記録日のみ・7点移動平均付き） */
export function buildDashboardWeightChartPoints(
  dailyPoints: DailyDashboardPoint[],
): DashboardWeightChartPoint[] {
  const labelByDate = new Map(dailyPoints.map((p) => [p.date, p.label]));
  const daily = dailyPoints
    .filter((p) => p.weightKg != null)
    .map((p) => ({
      date: p.date,
      weightKg: p.weightKg!,
      count: 1,
    }));
  return addMovingAverage7(daily).map((p) => ({
    ...p,
    label: labelByDate.get(p.date) ?? p.date,
  }));
}

export type DashboardStepsChartPoint = {
  date: string;
  label: string;
  steps: number | null;
  recorded: boolean;
  /** 棒グラフ用（未記録は 0＋透明セル） */
  barValue: number;
};

/** ダッシュボード歩数グラフ用 */
export function buildDashboardStepsChartPoints(
  dailyPoints: DailyDashboardPoint[],
): DashboardStepsChartPoint[] {
  return dailyPoints.map((p) => ({
    date: p.date,
    label: p.label,
    steps: p.steps,
    recorded: p.steps != null,
    barValue: p.steps ?? 0,
  }));
}

function aggregateWeekRows(
  dailyPoints: DailyDashboardPoint[],
): WeeklyDashboardRow[] {
  const byWeek = new Map<string, DailyDashboardPoint[]>();
  for (const p of dailyPoints) {
    const wk = weekMondayKey(p.date);
    const arr = byWeek.get(wk) ?? [];
    arr.push(p);
    byWeek.set(wk, arr);
  }
  return [...byWeek.entries()]
    .map(([weekStart, pts]) => {
      const wVals = pts.filter((p) => p.weightKg != null).map((p) => p.weightKg!);
      const sVals = pts.filter((p) => p.steps != null).map((p) => p.steps!);
      const bpPts = pts.filter(
        (p) => p.systolic != null && p.diastolic != null,
      );
      const sysVals = bpPts.map((p) => p.systolic!);
      const diaVals = bpPts.map((p) => p.diastolic!);
      const pulVals = pts
        .filter((p) => p.pulse != null)
        .map((p) => p.pulse!);
      const reflectionComments = pts
        .filter((p) => p.reflectionComment != null)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((p) => p.reflectionComment!);
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
        avgSystolic:
          sysVals.length > 0
            ? Math.round(mean(sysVals))
            : null,
        avgDiastolic:
          diaVals.length > 0
            ? Math.round(mean(diaVals))
            : null,
        avgPulse:
          pulVals.length > 0
            ? Math.round(mean(pulVals))
            : null,
        bpRecordedDays: bpPts.length,
        reflectionComments,
      };
    })
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

/**
 * 週ごとのサマリー用。新しい週が先頭になるよう降順。
 */
export function buildWeeklyDashboardRows(
  dailyPoints: DailyDashboardPoint[],
  maxWeeks = 8,
): WeeklyDashboardRow[] {
  const rows = aggregateWeekRows(dailyPoints);
  return rows
    .slice(-maxWeeks)
    .sort((a, b) => b.weekStart.localeCompare(a.weekStart));
}

function formatWeekLabel(weekStartIso: string): string {
  const [y, mo, da] = weekStartIso.split("-").map(Number);
  const dt = new Date(y, mo - 1, da);
  return `${dt.getMonth() + 1}/${dt.getDate()}週`;
}

/**
 * 週次サマリー用の自動コメント（医療診断ではなく傾向の参考）。
 * prev はカレンダー上 1 つ前の週（より古い週）。一覧が新しい週先頭のときは、その行の次要素を prev に渡す。
 */
export function weeklyWeightNarrative(
  row: WeeklyDashboardRow,
  prev: WeeklyDashboardRow | null,
): string {
  if (row.avgWeightKg == null) {
    return "体重の記録がありません。";
  }
  if (prev?.avgWeightKg == null) {
    return "";
  }
  const diff = Math.round((row.avgWeightKg - prev.avgWeightKg) * 10) / 10;
  if (Math.abs(diff) < 0.15) {
    return "前週の平均とほぼ同じ水準です。";
  }
  if (diff < 0) {
    return `前週の平均より約 ${Math.abs(diff)} kg 低いです。`;
  }
  return `前週の平均より約 ${diff} kg 高いです。`;
}

export function weeklyStepsNarrative(
  row: WeeklyDashboardRow,
  prev: WeeklyDashboardRow | null,
): string {
  if (row.avgSteps == null) {
    return "歩数の記録がありません。";
  }
  if (prev?.avgSteps == null || prev.avgSteps <= 0) {
    return "";
  }
  const diff = row.avgSteps - prev.avgSteps;
  const pct = Math.round((diff / prev.avgSteps) * 100);
  if (Math.abs(pct) < 5) {
    return "前週の平均とほぼ同じ水準です。";
  }
  if (diff > 0) {
    return `前週の平均より約 ${Math.abs(Math.round(diff)).toLocaleString("ja-JP")} 歩多いです。`;
  }
  return `前週の平均より約 ${Math.abs(Math.round(diff)).toLocaleString("ja-JP")} 歩少ないです。`;
}

/**
 * 血圧の週次サマリー用（医療診断ではなく記録上の参考）。
 */
export function weeklyBloodPressureNarrative(
  row: WeeklyDashboardRow,
  prev: WeeklyDashboardRow | null,
): string {
  if (row.avgSystolic == null || row.avgDiastolic == null) {
    return "血圧の記録がありません。";
  }
  const parts: string[] = [];
  if (row.avgPulse != null) {
    parts.push(`脈拍の週平均は ${row.avgPulse} 回/分`);
  }
  if (prev?.avgSystolic != null && prev.avgDiastolic != null) {
    const dSys = row.avgSystolic - prev.avgSystolic;
    const dDia = row.avgDiastolic - prev.avgDiastolic;
    if (Math.abs(dSys) < 3 && Math.abs(dDia) < 3) {
      parts.push("前週の平均とほぼ同じ水準です");
    } else {
      parts.push(
        `前週より収縮期 ${dSys > 0 ? "+" : ""}${dSys}、拡張期 ${dDia > 0 ? "+" : ""}${dDia} ほど`,
      );
    }
  }
  return parts.length > 0 ? `${parts.join("。")}。` : "";
}

export type WeightGoalBand = { min: number; max: number };

function hashSeed(parts: string[]): number {
  let h = 0;
  for (const s of parts) {
    for (let i = 0; i < s.length; i++) {
      h = (h * 31 + s.charCodeAt(i)) | 0;
    }
  }
  return Math.abs(h);
}

function pickVariant(seed: number, variants: string[]): string {
  if (variants.length === 0) {
    return "";
  }
  return variants[seed % variants.length]!;
}

type WeightGoalSide = "in" | "above" | "below";

function weightGoalSide(w: number, goal: WeightGoalBand): WeightGoalSide {
  if (w >= goal.min && w <= goal.max) {
    return "in";
  }
  return w > goal.max ? "above" : "below";
}

/** 目標帯の外側にいるとき、帯までの距離（kg）。帯内なら 0。 */
function weightDistanceOutsideBand(w: number, goal: WeightGoalBand): number {
  if (w > goal.max) {
    return Math.round((w - goal.max) * 10) / 10;
  }
  if (w < goal.min) {
    return Math.round((goal.min - w) * 10) / 10;
  }
  return 0;
}

function truncateForQuote(text: string, max = 48): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length <= max) {
    return t;
  }
  return `${t.slice(0, max)}…`;
}

type WeightTrend = "up" | "down" | "flat";

function detectWeightTrend(values: number[]): WeightTrend {
  if (values.length < 3) {
    return "flat";
  }
  const first = values[values.length - 1]!;
  const last = values[0]!;
  const diff = last - first;
  if (Math.abs(diff) < 0.25) {
    return "flat";
  }
  return diff > 0 ? "up" : "down";
}

function weeklyReflectionCoachLine(
  comments: string[],
  seed: number,
): string | null {
  const trimmed = comments.map((c) => c.trim()).filter((c) => c.length > 0);
  if (trimmed.length === 0) {
    return null;
  }
  if (trimmed.length === 1) {
    const q = truncateForQuote(trimmed[0]!);
    return pickVariant(seed, [
      `振り返りでは「${q}」と書かれていました。`,
      `メモに「${q}」との記録があり、体調や気持ちの手がかりになりそうです。`,
      `この週の振り返りには「${q}」と残っています。`,
    ]);
  }
  const sample = trimmed.slice(0, 2).map((c) => truncateForQuote(c, 32));
  return pickVariant(seed, [
    `振り返りが ${trimmed.length} 日ありました。「${sample[0]}」などのメモが残っています。`,
    `この週は ${trimmed.length} 日、振り返りの一言が記録されています（例:「${sample[0]}」）。`,
    `振り返りメモが ${trimmed.length} 件。「${sample[0]}」や「${sample[1] ?? sample[0]}」など、日々の様子がうかがえます。`,
  ]);
}

function weeklyChangeCoachLines(
  row: WeeklyDashboardRow,
  prev: WeeklyDashboardRow | null,
  priorWeeks: WeeklyDashboardRow[],
  seed: number,
): string[] {
  const lines: string[] = [];

  if (row.avgWeightKg != null && prev?.avgWeightKg != null) {
    const diff = Math.round((row.avgWeightKg - prev.avgWeightKg) * 10) / 10;
    if (Math.abs(diff) >= 0.3) {
      lines.push(
        pickVariant(seed, [
          diff < 0
            ? `体重の週平均は前週より約 ${Math.abs(diff)} kg 低下しました。`
            : `体重の週平均は前週より約 ${diff} kg 上昇しました。`,
          diff < 0
            ? `体重は前週より軽くなった週です（約 ${Math.abs(diff)} kg）。`
            : `体重は前週より重くなった週です（約 ${diff} kg）。`,
        ]),
      );
    } else if (Math.abs(diff) >= 0.15) {
      lines.push(
        pickVariant(seed + 1, [
          diff < 0
            ? `体重は前週よりわずかに下がりました（約 ${Math.abs(diff)} kg）。`
            : `体重は前週よりわずかに上がりました（約 ${diff} kg）。`,
          `体重の週平均は前週と比べて小さな変化（${diff > 0 ? "+" : ""}${diff} kg）でした。`,
        ]),
      );
    }
  }

  const weightHistory = [row, ...(prev ? [prev] : []), ...priorWeeks]
    .map((r) => r.avgWeightKg)
    .filter((v): v is number => v != null);
  if (weightHistory.length >= 3 && lines.length === 0) {
    const trend = detectWeightTrend(weightHistory);
    if (trend === "down") {
      lines.push(
        pickVariant(seed + 2, [
          "体重の週平均はここ数週、緩やかに下がる傾向が続いています。",
          "数週にわたり体重の平均がじわじわ下がっています。",
        ]),
      );
    } else if (trend === "up") {
      lines.push(
        pickVariant(seed + 3, [
          "体重の週平均はここ数週、緩やかに上がる傾向が続いています。",
          "数週にわたり体重の平均がじわじわ上がっています。",
        ]),
      );
    }
  }

  if (row.avgSteps != null && prev?.avgSteps != null && prev.avgSteps > 0) {
    const diff = row.avgSteps - prev.avgSteps;
    const pct = Math.round((diff / prev.avgSteps) * 100);
    if (Math.abs(pct) >= 12) {
      lines.push(
        pickVariant(seed + 10, [
          diff > 0
            ? `歩数の週平均は前週より約 ${Math.abs(Math.round(diff)).toLocaleString("ja-JP")} 歩増えました（${pct > 0 ? "+" : ""}${pct}% ほど）。`
            : `歩数の週平均は前週より約 ${Math.abs(Math.round(diff)).toLocaleString("ja-JP")} 歩減りました（${pct}% ほど）。`,
          diff > 0
            ? `歩数は前週より活発な週でした（平均 ${row.avgSteps.toLocaleString("ja-JP")} 歩/日）。`
            : `歩数は前週より控えめな週でした（平均 ${row.avgSteps.toLocaleString("ja-JP")} 歩/日）。`,
        ]),
      );
    } else if (Math.abs(pct) >= 5 && lines.length < 2) {
      lines.push(
        pickVariant(seed + 11, [
          `歩数は前週と大きくは変わらず、平均 ${row.avgSteps.toLocaleString("ja-JP")} 歩/日程度でした。`,
          `歩数の週平均は前週とほぼ同水準（${row.avgSteps.toLocaleString("ja-JP")} 歩/日）でした。`,
        ]),
      );
    }
  } else if (row.avgSteps != null && prev?.avgSteps == null && lines.length < 2) {
    lines.push(
      pickVariant(seed + 12, [
        `歩数の記録が始まった週です（平均 ${row.avgSteps.toLocaleString("ja-JP")} 歩/日）。`,
        `歩数が記録され始めました。週平均は ${row.avgSteps.toLocaleString("ja-JP")} 歩/日です。`,
      ]),
    );
  }

  if (
    row.avgWeightKg != null &&
    row.avgSteps != null &&
    prev?.avgWeightKg != null &&
    prev.avgSteps != null &&
    prev.avgSteps > 0 &&
    lines.length < 2
  ) {
    const wDiff = row.avgWeightKg - prev.avgWeightKg;
    const sPct = Math.round(
      ((row.avgSteps - prev.avgSteps) / prev.avgSteps) * 100,
    );
    if (Math.abs(wDiff) < 0.15 && sPct >= 10) {
      lines.push(
        pickVariant(seed + 20, [
          "体重はほぼ横ばいながら、歩数は増えた週でした。動きと体重のバランスがうかがえます。",
          "体重は大きく動かず、歩数だけ伸びた週です。",
        ]),
      );
    } else if (wDiff <= -0.2 && sPct >= 8) {
      lines.push(
        pickVariant(seed + 21, [
          "歩数を増やしつつ、体重の平均は下がった週でした。",
          "動きが増え、体重の平均はやや下がった組み合わせです。",
        ]),
      );
    }
  }

  if (lines.length === 0) {
    if (row.avgWeightKg != null || row.avgSteps != null) {
      lines.push(
        pickVariant(seed + 99, [
          "大きな変化は少ない週でしたが、記録が続いていることが一番の蓄積です。",
          "数値のブレは小さめでした。トレンドを見るにはあと数週続けるとわかりやすくなります。",
          "静かな週でした。変化が小さいときほど、記録を続ける価値があります。",
        ]),
      );
    }
  }

  return lines.slice(0, 2);
}

function briefGoalContextLine(
  row: WeeklyDashboardRow,
  prev: WeeklyDashboardRow | null,
  goal: WeightGoalBand,
  seed: number,
): string | null {
  const w = row.avgWeightKg;
  if (w == null) {
    return null;
  }
  const side = weightGoalSide(w, goal);
  const { min: gMin, max: gMax } = goal;
  if (side === "in") {
    if (
      prev?.avgWeightKg != null &&
      weightGoalSide(prev.avgWeightKg, goal) !== "in"
    ) {
      return pickVariant(seed, [
        `目標帯（${gMin}〜${gMax} kg）に戻ってきた週でもあります。`,
        `体重は目標レンジ内に入りました（週平均 ${w} kg）。`,
      ]);
    }
    return null;
  }
  const gap = weightDistanceOutsideBand(w, goal);
  const prevW = prev?.avgWeightKg ?? null;
  const prevDist =
    prevW != null ? weightDistanceOutsideBand(prevW, goal) : null;
  if (prevDist != null && gap < prevDist - 0.05) {
    return pickVariant(seed + 1, [
      `目標帯まで約 ${gap} kg。前週より近づいています（参考）。`,
    ]);
  }
  if (prevDist != null && gap > prevDist + 0.05) {
    return pickVariant(seed + 2, [
      `目標帯まで約 ${gap} kg。前週より離れた週でした（参考）。`,
    ]);
  }
  return pickVariant(seed + 3, [
    `目標帯（${gMin}〜${gMax} kg）まで約 ${gap} kg（参考値）。`,
  ]);
}

function bloodPressureCoachLines(
  row: WeeklyDashboardRow,
  prev: WeeklyDashboardRow | null,
  seed: number,
): string[] {
  if (row.avgSystolic == null || row.avgDiastolic == null) {
    return [];
  }
  const lines: string[] = [];
  const sys = row.avgSystolic;
  const dia = row.avgDiastolic;
  if (
    prev?.avgSystolic != null &&
    prev.avgDiastolic != null
  ) {
    const dSys = sys - prev.avgSystolic;
    const dDia = dia - prev.avgDiastolic;
    if (Math.abs(dSys) < 3 && Math.abs(dDia) < 3) {
      lines.push(
        pickVariant(seed, [
          "血圧の週平均は前週に近いです。測定条件をそろえると比較しやすくなります。",
          "前週と同水準に近い週でした。記録を続けている点は素晴らしいです。",
        ]),
      );
    } else if (dSys > 5 || dDia > 3) {
      lines.push(
        pickVariant(seed + 1, [
          "血圧の週平均は前週よりやや高めに見えます。睡眠や体調の影響もあり得ます。気になるときは医師に相談ください。",
          "平均が前週より上がっています。ストレスや食塩の取り方もふり返ってみましょう。",
        ]),
      );
    } else if (dSys < -5 || dDia < -3) {
      lines.push(
        pickVariant(seed + 2, [
          "血圧の週平均は前週よりやや低めに見えます。めまいなどがあるときは無理せず相談を。",
          "平均が前週より下がっています。体調とあわせて観察してみてください。",
        ]),
      );
    }
  }
  if (sys >= 130 || dia >= 85) {
    lines.push(
      pickVariant(seed + 3, [
        "一般的な目安ではやや高めの帯に近い週かもしれません。治療中なら医師の目標値を優先してください。",
        "数値が高めの週です。自己判断せず、かかりつけの指示を大切にしましょう。",
      ]),
    );
  } else if (sys < 100 && dia < 60) {
    lines.push(
      pickVariant(seed + 4, [
        "平均はやや低めの帯に見えます。具合が優れない日が続くときは相談を。",
        "血圧が低めに見える週です。水分と休息も意識してみてください。",
      ]),
    );
  } else if (lines.length === 0) {
    lines.push(
      pickVariant(seed + 5, [
        "血圧の記録が続いています。この習慣は健康管理の強みになります。",
        "週平均はおおむね穏やかな範囲に見えます。ペースを維持していきましょう。",
      ]),
    );
  }
  return lines.length > 0 ? [lines[seed % lines.length]!] : [];
}

/**
 * 週次サマリー用の「ひと踏み込んだ」コメント（目標帯・食事・運動・励まし。診断ではない）。
 * 同じ週では同じ seed により文言が安定するようになっています。
 */
export type WeeklyCoachNarrativeOptions = {
  includeBloodPressure?: boolean;
  /** 前週より古い週（新しい週から順、最大4週程度） */
  priorWeeks?: WeeklyDashboardRow[];
};

export function weeklyDashboardCoachNarrative(
  row: WeeklyDashboardRow,
  prev: WeeklyDashboardRow | null,
  goal: WeightGoalBand | null,
  options?: WeeklyCoachNarrativeOptions,
): string {
  const priorWeeks = options?.priorWeeks ?? [];
  const seed = hashSeed([row.weekStart, "coach-v3"]);
  const sentences: string[] = [];
  const includeBp = options?.includeBloodPressure === true;
  const hasBpData =
    row.avgSystolic != null && row.avgDiastolic != null;

  const hasWeight = row.avgWeightKg != null;
  const hasSteps = row.avgSteps != null;
  const hasAnyCore = hasWeight || hasSteps;

  if (!hasAnyCore && !hasBpData) {
    const reflOnly = weeklyReflectionCoachLine(row.reflectionComments, seed + 50);
    if (reflOnly) {
      return `${reflOnly}${pickVariant(seed + 40, [
        "次の週も、自分に合うペースで十分です。",
        "小さな積み重ねを信じて、続けていきましょう。",
      ])}`;
    }
    return pickVariant(seed, [
      "記録がまだ少ない週でした。無理のない範囲から続けてみましょう。",
      "データが揃うと振り返りやすくなります。次の一歩を楽しみにしています。",
      "小さな記録の積み重ねが後から効いてきます。焦らずで大丈夫です。",
    ]);
  }

  sentences.push(
    ...weeklyChangeCoachLines(row, prev, priorWeeks, seed + 1),
  );

  const reflLine = weeklyReflectionCoachLine(
    row.reflectionComments,
    seed + 50,
  );
  if (reflLine) {
    sentences.push(reflLine);
  }

  if (goal && hasWeight && sentences.length < 3) {
    const goalLine = briefGoalContextLine(row, prev, goal, seed + 70);
    if (goalLine) {
      sentences.push(goalLine);
    }
  } else if (hasWeight && !goal && sentences.length < 2) {
    sentences.push(
      pickVariant(seed + 4, [
        "体重画面で目標帯を設定すると、変化とあわせて見やすくなります。",
        "目標帯があると、数週のトレンドがより具体的に語れます。",
      ]),
    );
  }

  if (!hasAnyCore && hasBpData && includeBp) {
    const bpLines = bloodPressureCoachLines(row, prev, seed + 60);
    const closing = pickVariant(seed + 40, [
      "次の週も、自分に合うペースで十分です。",
      "小さな積み重ねを信じて、続けていきましょう。",
      "完璧より継続。今週もお疲れさまでした。",
      "焦らず、また来週も記録を楽しんでみてください。",
    ]);
    return [...bpLines, closing].join("");
  }

  if (includeBp && hasBpData && sentences.length < 4) {
    const bpLines = bloodPressureCoachLines(row, prev, seed + 60);
    if (bpLines.length > 0) {
      sentences.push(bpLines[0]!);
    }
  }

  if (sentences.length === 0) {
    sentences.push(
      pickVariant(seed + 30, [
        "記録を続けられていること自体が力になります。",
        "データが揃うほど、自分のペースが見えやすくなります。",
      ]),
    );
  }

  const closing = pickVariant(seed + 40, [
    "次の週も、自分に合うペースで十分です。",
    "小さな積み重ねを信じて、続けていきましょう。",
    "完璧より継続。今週もお疲れさまでした。",
    "焦らず、また来週も記録を楽しんでみてください。",
  ]);

  return [...sentences, closing].join("");
}
