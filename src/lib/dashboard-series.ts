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
  /** 次元別：記録があった日だけを平均 */
  avgMealScore: number | null;
  mealDays: number;
  avgStepsSelfScore: number | null;
  stepsSelfDays: number;
  avgConditionScore: number | null;
  conditionDays: number;
};

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

/**
 * 振り返りの期間平均ヒートマップ用（週・月で共通。左から古い期間）。
 * `periodKey` は週なら月曜始まりの ISO 日付、月ならその月1日の ISO。
 */
export type ReflectionAggHeatmapColumn = {
  periodKey: string;
  label: string;
  avgMealScore: number | null;
  mealDays: number;
  avgStepsSelfScore: number | null;
  stepsSelfDays: number;
  avgConditionScore: number | null;
  conditionDays: number;
};

/** @deprecated `ReflectionAggHeatmapColumn` を使用 */
export type WeeklyReflectionHeatmapColumn = ReflectionAggHeatmapColumn;

export function buildWeeklyReflectionHeatmapColumns(
  dailyPoints: DailyDashboardPoint[],
  maxWeeks = 9,
): ReflectionAggHeatmapColumn[] {
  const rows = aggregateWeekRows(dailyPoints);
  return rows.slice(-maxWeeks).map((r) => ({
    periodKey: r.weekStart,
    label: r.label,
    avgMealScore: r.avgMealScore,
    mealDays: r.mealDays,
    avgStepsSelfScore: r.avgStepsSelfScore,
    stepsSelfDays: r.stepsSelfDays,
    avgConditionScore: r.avgConditionScore,
    conditionDays: r.conditionDays,
  }));
}

export function buildMonthlyReflectionHeatmapColumns(
  dailyPoints: DailyDashboardPoint[],
  maxMonths = 8,
): ReflectionAggHeatmapColumn[] {
  const byMonth = new Map<string, DailyDashboardPoint[]>();
  for (const p of dailyPoints) {
    const mk = monthKeyFromIso(p.date);
    const arr = byMonth.get(mk) ?? [];
    arr.push(p);
    byMonth.set(mk, arr);
  }
  const cols = [...byMonth.entries()]
    .map(([ym, pts]) => {
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
        periodKey: firstDayOfMonthYm(ym),
        label: formatMonthLabelJa(ym),
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
                (stepsSelfVals.reduce((a, b) => a + b, 0) /
                  stepsSelfVals.length) *
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
      };
    })
    .sort((a, b) => a.periodKey.localeCompare(b.periodKey));
  return cols.slice(-maxMonths);
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

/**
 * 週次サマリー用の「ひと踏み込んだ」コメント（目標帯・食事・運動・励まし。診断ではない）。
 * 同じ週では同じ seed により文言が安定するようになっています。
 */
export function weeklyDashboardCoachNarrative(
  row: WeeklyDashboardRow,
  prev: WeeklyDashboardRow | null,
  goal: WeightGoalBand | null,
): string {
  const seed = hashSeed([row.weekStart, "v1"]);
  const sentences: string[] = [];

  const hasWeight = row.avgWeightKg != null;
  const hasSteps = row.avgSteps != null;
  const hasRefl =
    row.avgMealScore != null ||
    row.avgStepsSelfScore != null ||
    row.avgConditionScore != null;

  if (!hasWeight && !hasSteps && !hasRefl) {
    return pickVariant(seed, [
      "記録がまだ少ない週でした。無理のない範囲から続けてみましょう。",
      "データが揃うと振り返りやすくなります。次の一歩を楽しみにしています。",
      "小さな記録の積み重ねが後から効いてきます。焦らずで大丈夫です。",
    ]);
  }

  if (hasWeight && goal) {
    const w = row.avgWeightKg!;
    const { min: gMin, max: gMax } = goal;
    if (w >= gMin && w <= gMax) {
      sentences.push(
        pickVariant(seed + 1, [
          "週平均は目標帯の中に収まっています。このリズムを大事にしましょう。",
          "体重は設定した目標レンジ内です。安定は大きな価値があります。",
          "目標帯とよく噛み合っています。生活のクセが形になってきている感じがします。",
        ]),
      );
    } else if (w > gMax) {
      const gap = Math.round((w - gMax) * 10) / 10;
      sentences.push(
        pickVariant(seed + 2, [
          `週平均は目標の上限より約 ${gap} kg 上です。食事記録を続けつつ、無理のないペースで調整を試せます。`,
          "目標帯より上めの週でした。水分・塩分・夜食のパターンを軽く振り返るとヒントが見つかることがあります。",
          "目標よりやや重めの水準です。責めずに、次の週で小さな一歩を一つだけ意識してみましょう。",
        ]),
      );
    } else {
      const gap = Math.round((gMin - w) * 10) / 10;
      sentences.push(
        pickVariant(seed + 3, [
          `週平均は目標の下限より約 ${gap} kg 下です。体調や測定タイミングも含め、必要なら医療者に相談しつつ観察を。`,
          "目標帯より軽めの週でした。体調が優れないときは無理に合わせなくて大丈夫です。",
          "目標レンジを下回っています。急な変化が気になるときは専門家への相談も検討ください。",
        ]),
      );
    }
  } else if (hasWeight && !goal) {
    sentences.push(
      pickVariant(seed + 4, [
        "体重画面で目標帯を設定すると、達成度が見えやすくなります。",
        "目標帯があると「近い・遠い」が言葉にしやすくなります。設定を検討してみてください。",
      ]),
    );
    if (prev?.avgWeightKg != null && row.avgWeightKg != null) {
      const diff = row.avgWeightKg - prev.avgWeightKg;
      if (diff < -0.2) {
        sentences.push(
          pickVariant(seed + 5, [
            "前週より平均が下がっています。意図した変化なら、その努力を認めてあげてください。",
            "平均が下がる週でした。体調とセットで見ると安心材料になります。",
          ]),
        );
      } else if (diff > 0.2) {
        sentences.push(
          pickVariant(seed + 6, [
            "前週より平均が上がっています。一週間単位のブレはよくあるので、トレンドで見ましょう。",
            "平均が上がった週です。ストレスや睡眠も含め、全体のバランスを一度なでてみてください。",
          ]),
        );
      }
    }
  }

  if (hasSteps) {
    const st = row.avgSteps!;
    if (st >= 8500) {
      sentences.push(
        pickVariant(seed + 10, [
          "歩数はとても活発な週でした。体を動かせているのは心身の土台になります。",
          "平均歩数は十分以上です。この勢い、素直にほめてあげていいレベルです。",
        ]),
      );
    } else if (st >= 6500) {
      sentences.push(
        pickVariant(seed + 11, [
          "歩数はおおむね良好です。維持できていればそれで十分価値があります。",
          "平均は健やかなレンジに近いです。階段や早歩きなど、小さな上乗せも効きます。",
        ]),
      );
    } else if (st >= 4500) {
      sentences.push(
        pickVariant(seed + 12, [
          "歩数はやや控えめな週でした。移動の合間に短い散歩を足すと負担が少なく続きやすいです。",
          "もう一歩だけ活動を足せる余地がありそうです。完璧を目指さず「少しだけ」でOKです。",
        ]),
      );
    } else {
      sentences.push(
        pickVariant(seed + 13, [
          "歩数は低めの週でした。体調や忙しさの影響もあるので、まずは無理のない範囲から再開を。",
          "活動量が抑えめに見えます。天気の良い日に短時間だけでも歩くと気分転換にもなります。",
        ]),
      );
    }
  }

  const extraPool: string[] = [];
  if (
    row.avgMealScore != null &&
    row.mealDays >= 2 &&
    row.avgMealScore < 1.25
  ) {
    extraPool.push(
      pickVariant(seed + 20, [
        "食事の自己評価が厳しめの週でした。栄養の完璧さより「続けやすさ」を優先してみましょう。",
        "食事スコアが低めです。野菜・たんぱく質・主食のバランスを、ひとつだけ意識するのも手です。",
        "食事面は改善の余地がありそうです。記録を続けるほど、自分に合うコツが見えてきます。",
      ]),
    );
  }
  if (
    row.avgStepsSelfScore != null &&
    row.stepsSelfDays >= 2 &&
    row.avgStepsSelfScore < 1.25
  ) {
    extraPool.push(
      pickVariant(seed + 21, [
        "歩数（自己評価）が厳しめです。実際の歩数とあわせて見ると、体感とのズレに気づけることがあります。",
        "運動・歩行への満足度が低めに見えます。目標歩数をわずかに下げて達成感を積むのも有効です。",
      ]),
    );
  }
  if (
    row.avgConditionScore != null &&
    row.conditionDays >= 2 &&
    row.avgConditionScore < 1.25
  ) {
    extraPool.push(
      pickVariant(seed + 22, [
        "体調の振り返りが低めの週でした。休息と睡眠を最優先にして大丈夫です。",
        "体調スコアが厳しめです。無理に活動を増やさず、回復を先に置いてみましょう。",
      ]),
    );
  }

  if (extraPool.length > 0) {
    sentences.push(extraPool[seed % extraPool.length]!);
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
